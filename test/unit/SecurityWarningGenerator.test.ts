import { SecurityWarningGenerator, WarningPriority, DEFAULT_WARNING_CONFIG } from '../../src/security/SecurityWarningGenerator.js';
import { RiskAssessment, RiskFactor, SecurityRiskLevel } from '../../src/security/FileSecurityAnalyzer.js';

describe('SecurityWarningGenerator', () => {
  let generator: SecurityWarningGenerator;

  beforeEach(() => {
    generator = new SecurityWarningGenerator();
  });

  describe('generateWarnings', () => {
    it('should generate low risk warning for safe assessment', () => {
      const assessment: RiskAssessment = {
        overallScore: 10,
        riskLevel: SecurityRiskLevel.LOW,
        riskFactors: [],
        confidence: 95,
        recommendations: ['✅ LOW RISK: File appears safe for normal processing.']
      };

      const warnings = generator.generateWarnings(assessment);

      expect(warnings).toHaveLength(1);
      expect(warnings[0].id).toBe('low_risk');
      expect(warnings[0].priority).toBe(WarningPriority.LOW);
      expect(warnings[0].title).toBe('Low Security Risk');
      expect(warnings[0].isBlocking).toBe(false);
    });

    it('should generate factor-specific warnings', () => {
      const factors: RiskFactor[] = [{
        name: 'Executable File',
        score: 50,
        description: 'File has executable permissions',
        evidence: ['Permissions: 755'],
        isBlocking: false
      }];

      const assessment: RiskAssessment = {
        overallScore: 20,
        riskLevel: SecurityRiskLevel.LOW,
        riskFactors: factors,
        confidence: 80,
        recommendations: ['Remove executable permissions if not required for functionality.']
      };

      const warnings = generator.generateWarnings(assessment);

      expect(warnings).toHaveLength(2); // Risk level + factor warning
      expect(warnings.some(w => w.id === 'low_risk')).toBe(true);
      expect(warnings.some(w => w.id === 'executable_file')).toBe(true);

      const executableWarning = warnings.find(w => w.id === 'executable_file');
      expect(executableWarning?.priority).toBe(WarningPriority.MEDIUM);
      expect(executableWarning?.title).toBe('Executable File Detected');
    });

    it('should generate critical warning for high-risk assessment', () => {
      const factors: RiskFactor[] = [{
        name: 'Known Malware Signature',
        score: 100,
        description: 'File matches known malware signature',
        evidence: ['SHA-256: abc123...'],
        isBlocking: true
      }];

      const assessment: RiskAssessment = {
        overallScore: 100,
        riskLevel: SecurityRiskLevel.CRITICAL,
        riskFactors: factors,
        confidence: 100,
        recommendations: ['🚨 CRITICAL RISK: Do not process this file. Consult security team immediately.']
      };

      const warnings = generator.generateWarnings(assessment);

      expect(warnings).toHaveLength(2);
      const criticalWarning = warnings.find(w => w.id === 'critical_risk');
      expect(criticalWarning?.priority).toBe(WarningPriority.CRITICAL);
      expect(criticalWarning?.isBlocking).toBe(true);

      const malwareWarning = warnings.find(w => w.id === 'known_malware_signature');
      expect(malwareWarning?.priority).toBe(WarningPriority.CRITICAL);
      expect(malwareWarning?.isBlocking).toBe(true);
    });

    it('should include detailed context when configured', () => {
      const assessment: RiskAssessment = {
        overallScore: 75,
        riskLevel: SecurityRiskLevel.HIGH,
        riskFactors: [],
        confidence: 85,
        recommendations: ['⚠️ HIGH RISK: Manual review required before processing.']
      };

      const warnings = generator.generateWarnings(assessment);

      const riskWarning = warnings.find(w => w.id === 'high_risk');
      expect(riskWarning?.context).toEqual([
        'Overall Risk Score: 75/100',
        'Confidence: 85%',
        'Risk Factors: 0'
      ]);
    });

    it('should limit recommendations when configured', () => {
      const customConfig = {
        ...DEFAULT_WARNING_CONFIG,
        maxRecommendations: 2
      };

      const customGenerator = new SecurityWarningGenerator(customConfig);

      const assessment: RiskAssessment = {
        overallScore: 100,
        riskLevel: SecurityRiskLevel.CRITICAL,
        riskFactors: [],
        confidence: 100,
        recommendations: []
      };

      const warnings = customGenerator.generateWarnings(assessment);
      const criticalWarning = warnings.find(w => w.id === 'critical_risk');

      expect(criticalWarning?.recommendations).toHaveLength(2);
    });
  });

  describe('warning grouping', () => {
    it('should group similar warnings when enabled', () => {
      const factors: RiskFactor[] = [
        {
          name: 'Executable File',
          score: 50,
          description: 'File 1 has executable permissions',
          evidence: ['Permissions: 755'],
          isBlocking: false
        },
        {
          name: 'Executable File',
          score: 60,
          description: 'File 2 has executable permissions',
          evidence: ['Permissions: 777'],
          isBlocking: false
        }
      ];

      const assessment: RiskAssessment = {
        overallScore: 40,
        riskLevel: SecurityRiskLevel.MEDIUM,
        riskFactors: factors,
        confidence: 75,
        recommendations: []
      };

      const warnings = generator.generateWarnings(assessment);

      // Should group the two executable file warnings into one
      const executableWarnings = warnings.filter(w => w.id === 'executable_file');
      expect(executableWarnings).toHaveLength(1);
    });

    it('should not group warnings when disabled', () => {
      const customConfig = {
        ...DEFAULT_WARNING_CONFIG,
        groupSimilarWarnings: false
      };

      const customGenerator = new SecurityWarningGenerator(customConfig);

      const factors: RiskFactor[] = [
        {
          name: 'Executable File',
          score: 50,
          description: 'File 1 has executable permissions',
          evidence: ['Permissions: 755'],
          isBlocking: false
        },
        {
          name: 'Suspicious Extension',
          score: 70,
          description: 'File has suspicious extension',
          evidence: ['Extension: .exe'],
          isBlocking: false
        }
      ];

      const assessment: RiskAssessment = {
        overallScore: 60,
        riskLevel: SecurityRiskLevel.MEDIUM,
        riskFactors: factors,
        confidence: 80,
        recommendations: []
      };

      const warnings = customGenerator.generateWarnings(assessment);

      expect(warnings).toHaveLength(3); // Risk level + 2 factor warnings
    });
  });

  describe('configuration', () => {
    it('should use default configuration', () => {
      const config = generator.getConfig();
      expect(config).toEqual(DEFAULT_WARNING_CONFIG);
    });

    it('should update configuration', () => {
      const newConfig = {
        includeDetailedContext: false,
        maxRecommendations: 3
      };

      generator.updateConfig(newConfig);
      const updatedConfig = generator.getConfig();

      expect(updatedConfig.includeDetailedContext).toBe(false);
      expect(updatedConfig.maxRecommendations).toBe(3);
      expect(updatedConfig.groupSimilarWarnings).toBe(true); // Unchanged
    });

    it('should generate different warnings with custom config', () => {
      const customConfig = {
        ...DEFAULT_WARNING_CONFIG,
        includeDetailedContext: false
      };

      const customGenerator = new SecurityWarningGenerator(customConfig);

      const assessment: RiskAssessment = {
        overallScore: 10,
        riskLevel: SecurityRiskLevel.LOW,
        riskFactors: [],
        confidence: 95,
        recommendations: []
      };

      const warnings = customGenerator.generateWarnings(assessment);
      const riskWarning = warnings.find(w => w.id === 'low_risk');

      expect(riskWarning?.context).toBeUndefined();
    });
  });

  describe('custom messages', () => {
    it('should add and use custom warning message', () => {
      const customMessage = {
        id: 'high_risk', // Override the default high_risk message
        priority: WarningPriority.HIGH,
        title: 'Custom Security Risk',
        description: 'A custom security warning',
        recommendations: ['Take custom action'],
        isBlocking: false
      };

      generator.addCustomMessage(customMessage);

      const assessment: RiskAssessment = {
        overallScore: 80,
        riskLevel: SecurityRiskLevel.HIGH,
        riskFactors: [],
        confidence: 90,
        recommendations: []
      };

      const warnings = generator.generateWarnings(assessment);
      const customWarning = warnings.find(w => w.id === 'high_risk');

      expect(customWarning).toBeDefined();
      expect(customWarning?.title).toBe('Custom Security Risk');
      expect(customWarning?.recommendations).toEqual(['Take custom action']);
    });

    it('should remove custom warning message', () => {
      generator.addCustomMessage({
        id: 'temp_message',
        priority: WarningPriority.LOW,
        title: 'Temporary Message',
        description: 'Temp description',
        recommendations: ['Temp action'],
        isBlocking: false
      });

      expect(generator.getConfig().localization.messages['temp_message']).toBeDefined();

      generator.removeCustomMessage('temp_message');

      expect(generator.getConfig().localization.messages['temp_message']).toBeUndefined();
    });
  });

  describe('factor message mapping', () => {
    it('should map all known factor types to messages', () => {
      const testCases = [
        { factorName: 'Executable File', expectedId: 'executable_file' },
        { factorName: 'Suspicious Extension', expectedId: 'suspicious_extension' },
        { factorName: 'Large File Size', expectedId: 'large_file_size' },
        { factorName: 'Unexpected Binary File', expectedId: 'unexpected_binary' },
        { factorName: 'High Entropy', expectedId: 'high_entropy' },
        { factorName: 'Known Malware Signature', expectedId: 'known_malware_signature' },
        { factorName: 'Unknown Factor', expectedId: 'low_risk' } // Default fallback
      ];

      for (const { factorName, expectedId } of testCases) {
        const factors: RiskFactor[] = [{
          name: factorName,
          score: 50,
          description: 'Test factor',
          evidence: ['Test evidence'],
          isBlocking: false
        }];

        const assessment: RiskAssessment = {
          overallScore: 25,
          riskLevel: SecurityRiskLevel.LOW,
          riskFactors: factors,
          confidence: 70,
          recommendations: []
        };

        const warnings = generator.generateWarnings(assessment);
        const factorWarning = warnings.find(w => w.id === expectedId);

        expect(factorWarning).toBeDefined();
      }
    });
  });

  describe('edge cases', () => {
    it('should handle empty assessment', () => {
      const assessment: RiskAssessment = {
        overallScore: 0,
        riskLevel: SecurityRiskLevel.LOW,
        riskFactors: [],
        confidence: 100,
        recommendations: []
      };

      const warnings = generator.generateWarnings(assessment);

      expect(warnings).toHaveLength(1);
      expect(warnings[0].id).toBe('low_risk');
    });

    it('should handle assessment with unknown risk level', () => {
      const assessment: RiskAssessment = {
        overallScore: 0,
        riskLevel: 'unknown' as SecurityRiskLevel,
        riskFactors: [],
        confidence: 100,
        recommendations: []
      };

      const warnings = generator.generateWarnings(assessment);

      expect(warnings).toHaveLength(1);
      expect(warnings[0].id).toBe('low_risk'); // Should default to low risk
    });

    it('should handle factors with no matching messages', () => {
      const factors: RiskFactor[] = [{
        name: 'Completely Unknown Factor',
        score: 30,
        description: 'Unknown factor',
        evidence: [],
        isBlocking: false
      }];

      const assessment: RiskAssessment = {
        overallScore: 60, // Change to MEDIUM to avoid grouping with low_risk factor
        riskLevel: SecurityRiskLevel.MEDIUM,
        riskFactors: factors,
        confidence: 60,
        recommendations: []
      };

      const warnings = generator.generateWarnings(assessment);

      expect(warnings).toHaveLength(2); // Risk level (medium_risk) + fallback warning (low_risk)
      expect(warnings.some(w => w.id === 'medium_risk')).toBe(true);
      expect(warnings.some(w => w.id === 'low_risk')).toBe(true);
    });
  });
});