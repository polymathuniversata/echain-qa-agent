import { RiskAssessmentEngine, DEFAULT_RISK_CONFIG } from '../../src/security/RiskAssessmentEngine.js';
import { RiskFactor, SecurityRiskLevel } from '../../src/security/FileSecurityAnalyzer.js';

describe('RiskAssessmentEngine', () => {
  let engine: RiskAssessmentEngine;

  beforeEach(() => {
    engine = new RiskAssessmentEngine();
  });

  describe('assessRisk', () => {
    it('should return low risk for empty factors', () => {
      const result = engine.assessRisk([]);

      expect(result.overallScore).toBe(0);
      expect(result.riskLevel).toBe(SecurityRiskLevel.LOW);
      expect(result.riskFactors).toEqual([]);
      expect(result.confidence).toBe(100);
      expect(result.recommendations).toContain('✅ LOW RISK: File appears safe for normal processing.');
    });

    it('should assess single risk factor correctly', () => {
      const factors: RiskFactor[] = [{
        name: 'Executable File',
        score: 50,
        description: 'File has executable permissions',
        evidence: ['Permissions: 755'],
        isBlocking: false
      }];

      const result = engine.assessRisk(factors);

      expect(result.overallScore).toBe(20); // 50 * 0.4 weight
      expect(result.riskLevel).toBe(SecurityRiskLevel.LOW); // 20 < 25 threshold
      expect(result.riskFactors).toEqual(factors);
      expect(result.confidence).toBeGreaterThan(60);
    });

    it('should assess multiple risk factors with weighted scoring', () => {
      const factors: RiskFactor[] = [
        {
          name: 'Executable File',
          score: 50,
          description: 'File has executable permissions',
          evidence: ['Permissions: 755'],
          isBlocking: false
        },
        {
          name: 'Suspicious Extension',
          score: 70,
          description: 'File extension commonly associated with malware',
          evidence: ['Extension: .exe'],
          isBlocking: false
        }
      ];

      const result = engine.assessRisk(factors);

      expect(result.overallScore).toBe(62); // (50 * 0.4) + (70 * 0.6)
      expect(result.riskLevel).toBe(SecurityRiskLevel.MEDIUM); // 62 >= 50 and < 75
      expect(result.riskFactors).toEqual(factors);
    });

    it('should determine critical risk level for high scores', () => {
      const factors: RiskFactor[] = [{
        name: 'Known Malware Signature',
        score: 100,
        description: 'File matches known malware signature',
        evidence: ['SHA-256: abc123...'],
        isBlocking: true
      }];

      const result = engine.assessRisk(factors);

      expect(result.riskLevel).toBe(SecurityRiskLevel.CRITICAL);
      expect(result.recommendations).toContain('🚨 CRITICAL RISK: Do not process this file. Consult security team immediately.');
    });

    it('should generate factor-specific recommendations', () => {
      const factors: RiskFactor[] = [
        {
          name: 'Executable File',
          score: 50,
          description: 'File has executable permissions',
          evidence: ['Permissions: 755'],
          isBlocking: false
        },
        {
          name: 'Large File Size',
          score: 30,
          description: 'File is unusually large',
          evidence: ['Size: 150MB'],
          isBlocking: false
        }
      ];

      const result = engine.assessRisk(factors);

      expect(result.recommendations).toContain('Remove executable permissions if not required for functionality.');
      expect(result.recommendations).toContain('Verify file source and content before processing large files.');
    });

    it('should calculate confidence based on evidence', () => {
      const factorsWithEvidence: RiskFactor[] = [{
        name: 'Suspicious Extension',
        score: 70,
        description: 'Suspicious extension',
        evidence: ['Extension: .exe', 'File size: 1MB', 'Location: /downloads/'],
        isBlocking: false
      }];

      const factorsWithoutEvidence: RiskFactor[] = [{
        name: 'Suspicious Extension',
        score: 70,
        description: 'Suspicious extension',
        evidence: [],
        isBlocking: false
      }];

      const resultWithEvidence = engine.assessRisk(factorsWithEvidence);
      const resultWithoutEvidence = engine.assessRisk(factorsWithoutEvidence);

      expect(resultWithEvidence.confidence).toBeGreaterThan(resultWithoutEvidence.confidence);
    });
  });

  describe('configuration', () => {
    it('should use default configuration', () => {
      const config = engine.getConfig();
      expect(config).toEqual(DEFAULT_RISK_CONFIG);
    });

    it('should update configuration', () => {
      const newConfig = {
        thresholds: {
          low: 20,
          medium: 40,
          high: 60,
          critical: 80
        }
      };

      engine.updateConfig(newConfig);
      const updatedConfig = engine.getConfig();

      expect(updatedConfig.thresholds.low).toBe(20);
      expect(updatedConfig.weights).toEqual(DEFAULT_RISK_CONFIG.weights); // Unchanged
    });

    it('should assess risk differently with custom configuration', () => {
      const customConfig = {
        ...DEFAULT_RISK_CONFIG,
        thresholds: {
          low: 10,
          medium: 20,
          high: 30,
          critical: 40
        }
      };

      const customEngine = new RiskAssessmentEngine(customConfig);

      const factors: RiskFactor[] = [{
        name: 'Executable File',
        score: 50,
        description: 'File has executable permissions',
        evidence: ['Permissions: 755'],
        isBlocking: false
      }];

      const result = customEngine.assessRisk(factors);

      // With lower thresholds, score of 20 now falls in MEDIUM range (20-30)
      expect(result.riskLevel).toBe(SecurityRiskLevel.MEDIUM);
    });
  });

  describe('weight calculations', () => {
    it('should apply different weights to different factor types', () => {
      const factors: RiskFactor[] = [
        {
          name: 'Large File Size', // weight: 0.2
          score: 100,
          description: 'Very large file',
          evidence: ['Size: 1GB'],
          isBlocking: false
        },
        {
          name: 'Known Malware Signature', // weight: 1.0
          score: 100,
          description: 'Known malware',
          evidence: ['Signature match'],
          isBlocking: true
        }
      ];

      const result = engine.assessRisk(factors);

      // Known malware signature should have much higher impact due to weight
      expect(result.overallScore).toBeGreaterThan(50);
      expect(result.riskLevel).toBe(SecurityRiskLevel.CRITICAL);
    });

    it('should handle unknown factor types with default weight', () => {
      const factors: RiskFactor[] = [{
        name: 'Unknown Factor Type',
        score: 75,
        description: 'Some unknown risk',
        evidence: ['Unknown evidence'],
        isBlocking: false
      }];

      const result = engine.assessRisk(factors);

      expect(result.overallScore).toBeGreaterThan(0);
      expect(result.overallScore).toBeLessThan(50); // Should be moderate due to default weight
    });
  });

  describe('edge cases', () => {
    it('should handle factors with zero scores', () => {
      const factors: RiskFactor[] = [{
        name: 'Low Risk Factor',
        score: 0,
        description: 'No risk detected',
        evidence: [],
        isBlocking: false
      }];

      const result = engine.assessRisk(factors);

      expect(result.overallScore).toBe(0);
      expect(result.riskLevel).toBe(SecurityRiskLevel.LOW);
    });

    it('should handle factors with maximum scores', () => {
      const factors: RiskFactor[] = [{
        name: 'Known Malware Signature',
        score: 100,
        description: 'Maximum risk',
        evidence: ['Critical evidence'],
        isBlocking: true
      }];

      const result = engine.assessRisk(factors);

      expect(result.overallScore).toBeGreaterThan(0);
      expect(result.riskLevel).toBe(SecurityRiskLevel.CRITICAL);
    });

    it('should cap overall score at 100', () => {
      const factors: RiskFactor[] = [
        { name: 'Factor 1', score: 100, description: 'High risk', evidence: [], isBlocking: false },
        { name: 'Factor 2', score: 100, description: 'High risk', evidence: [], isBlocking: false },
        { name: 'Factor 3', score: 100, description: 'High risk', evidence: [], isBlocking: false }
      ];

      const result = engine.assessRisk(factors);

      expect(result.overallScore).toBeLessThanOrEqual(100);
    });
  });
});