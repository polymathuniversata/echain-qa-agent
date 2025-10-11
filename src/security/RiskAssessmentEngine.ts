import { RiskAssessment, RiskFactor, SecurityRiskLevel } from './FileSecurityAnalyzer.js';

/**
 * Configuration for risk assessment
 */
export interface RiskAssessmentConfig {
  /** Weight factors for different risk types */
  weights: {
    fileSize: number;
    executable: number;
    suspiciousExtension: number;
    unexpectedBinary: number;
    entropy: number;
    knownSignatures: number;
  };
  /** Thresholds for risk levels */
  thresholds: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
  /** Whether to enable machine learning-based assessment */
  enableML: boolean;
}

/**
 * Default risk assessment configuration
 */
export const DEFAULT_RISK_CONFIG: RiskAssessmentConfig = {
  weights: {
    fileSize: 0.2,
    executable: 0.4,
    suspiciousExtension: 0.6,
    unexpectedBinary: 0.3,
    entropy: 0.5,
    knownSignatures: 1.0
  },
  thresholds: {
    low: 25,
    medium: 50,
    high: 75,
    critical: 90
  },
  enableML: false
};

/**
 * Risk assessment engine for evaluating security risks
 */
export class RiskAssessmentEngine {
  private config: RiskAssessmentConfig;

  constructor(config: RiskAssessmentConfig = DEFAULT_RISK_CONFIG) {
    this.config = config;
  }

  /**
   * Assess overall risk based on multiple factors
   */
  assessRisk(factors: RiskFactor[]): RiskAssessment {
    const overallScore = this.calculateOverallScore(factors);
    const riskLevel = this.determineRiskLevel(overallScore);
    const confidence = this.calculateConfidence(factors);
    const recommendations = this.generateRecommendations(factors, riskLevel);

    return {
      overallScore,
      riskLevel,
      riskFactors: factors,
      confidence,
      recommendations
    };
  }

  /**
   * Calculate overall risk score from individual factors
   */
  private calculateOverallScore(factors: RiskFactor[]): number {
    if (factors.length === 0) {
      return 0;
    }

    // Weighted sum of all factor scores
    const weightedSum = factors.reduce((sum, factor) => {
      const weight = this.getWeightForFactor(factor.name);
      return sum + (factor.score * weight);
    }, 0);

    // Cap at 100 and return the weighted score
    return Math.min(100, weightedSum);
  }

  /**
   * Get weight for a specific risk factor
   */
  private getWeightForFactor(factorName: string): number {
    const weightMap: Record<string, number> = {
      'Large File Size': this.config.weights.fileSize,
      'Executable File': this.config.weights.executable,
      'Suspicious Extension': this.config.weights.suspiciousExtension,
      'Unexpected Binary File': this.config.weights.unexpectedBinary,
      'High Entropy': this.config.weights.entropy,
      'Known Malware Signature': this.config.weights.knownSignatures
    };

    return weightMap[factorName] || 0.1; // Default weight for unknown factors
  }

  /**
   * Determine risk level based on score
   */
  private determineRiskLevel(score: number): SecurityRiskLevel {
    if (score >= this.config.thresholds.critical) {
      return SecurityRiskLevel.CRITICAL;
    } else if (score >= this.config.thresholds.high) {
      return SecurityRiskLevel.HIGH;
    } else if (score >= this.config.thresholds.medium) {
      return SecurityRiskLevel.MEDIUM;
    } else {
      return SecurityRiskLevel.LOW;
    }
  }

  /**
   * Calculate confidence in the assessment
   */
  private calculateConfidence(factors: RiskFactor[]): number {
    if (factors.length === 0) {
      return 100; // High confidence for no risks
    }

    // Base confidence on number of factors and their evidence strength
    const factorCount = factors.length;
    const evidenceStrength = factors.reduce((sum, factor) => {
      return sum + (factor.evidence.length > 0 ? 1 : 0);
    }, 0) / factorCount;

    // More factors with evidence = higher confidence
    const confidence = Math.min(95, 60 + (factorCount * 10) + (evidenceStrength * 20));

    return Math.round(confidence);
  }

  /**
   * Generate recommendations based on risk factors and level
   */
  private generateRecommendations(factors: RiskFactor[], riskLevel: SecurityRiskLevel): string[] {
    const recommendations: string[] = [];

    // Level-based recommendations
    switch (riskLevel) {
      case SecurityRiskLevel.CRITICAL:
        recommendations.push('🚨 CRITICAL RISK: Do not process this file. Consult security team immediately.');
        break;
      case SecurityRiskLevel.HIGH:
        recommendations.push('⚠️ HIGH RISK: Manual review required before processing.');
        break;
      case SecurityRiskLevel.MEDIUM:
        recommendations.push('⚡ MEDIUM RISK: Proceed with caution and monitor closely.');
        break;
      case SecurityRiskLevel.LOW:
        recommendations.push('✅ LOW RISK: File appears safe for normal processing.');
        break;
    }

    // Factor-specific recommendations
    if (factors.some(f => f.name === 'Executable File')) {
      recommendations.push('Remove executable permissions if not required for functionality.');
    }

    if (factors.some(f => f.name === 'Large File Size')) {
      recommendations.push('Verify file source and content before processing large files.');
    }

    if (factors.some(f => f.name === 'Suspicious Extension')) {
      recommendations.push('Verify file type matches expected content and use case.');
    }

    if (factors.some(f => f.name === 'Unexpected Binary File')) {
      recommendations.push('Confirm binary file is expected in this location and context.');
    }

    if (factors.some(f => f.name === 'High Entropy')) {
      recommendations.push('High entropy may indicate packed/encrypted content - verify legitimacy.');
    }

    if (factors.some(f => f.name === 'Known Malware Signature')) {
      recommendations.push('File matches known malware signature - quarantine immediately.');
    }

    return recommendations;
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<RiskAssessmentConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): RiskAssessmentConfig {
    return { ...this.config };
  }
}