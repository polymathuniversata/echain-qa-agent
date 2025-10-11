import { RiskAssessment, SecurityRiskLevel } from './FileSecurityAnalyzer.js';

/**
 * Warning priority levels
 */
export enum WarningPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

/**
 * Warning message format
 */
export interface WarningMessage {
  /** Unique warning identifier */
  id: string;
  /** Warning priority */
  priority: WarningPriority;
  /** Human-readable title */
  title: string;
  /** Detailed description */
  description: string;
  /** Actionable recommendations */
  recommendations: string[];
  /** Additional context or evidence */
  context?: string[];
  /** Whether this warning should block the operation */
  isBlocking: boolean;
}

/**
 * Localized warning messages configuration
 */
export interface WarningLocalization {
  /** Language code (e.g., 'en', 'es', 'fr') */
  language: string;
  /** Warning messages for this language */
  messages: Record<string, WarningMessage>;
}

/**
 * Configuration for security warning generator
 */
export interface WarningGeneratorConfig {
  /** Whether to include detailed context in warnings */
  includeDetailedContext: boolean;
  /** Maximum number of recommendations per warning */
  maxRecommendations: number;
  /** Whether to group similar warnings */
  groupSimilarWarnings: boolean;
  /** Localization settings */
  localization: WarningLocalization;
}

/**
 * Default warning generator configuration
 */
export const DEFAULT_WARNING_CONFIG: WarningGeneratorConfig = {
  includeDetailedContext: true,
  maxRecommendations: 5,
  groupSimilarWarnings: true,
  localization: {
    language: 'en',
    messages: {
      // File system warnings
      'executable_file': {
        id: 'executable_file',
        priority: WarningPriority.MEDIUM,
        title: 'Executable File Detected',
        description: 'The file has executable permissions, which may pose a security risk.',
        recommendations: [
          'Remove executable permissions if not required for functionality',
          'Verify the file source and intended use',
          'Consider scanning with antivirus software'
        ],
        isBlocking: false
      },
      'suspicious_extension': {
        id: 'suspicious_extension',
        priority: WarningPriority.HIGH,
        title: 'Suspicious File Extension',
        description: 'The file extension is commonly associated with potentially harmful content.',
        recommendations: [
          'Verify the file type matches its intended content',
          'Check file headers to confirm actual format',
          'Avoid opening files from untrusted sources'
        ],
        isBlocking: false
      },
      'large_file_size': {
        id: 'large_file_size',
        priority: WarningPriority.MEDIUM,
        title: 'Unusually Large File',
        description: 'The file size exceeds typical thresholds and may contain unwanted data.',
        recommendations: [
          'Verify the file source and legitimacy',
          'Check if the size is expected for this file type',
          'Consider breaking large files into smaller chunks if appropriate'
        ],
        isBlocking: false
      },
      'unexpected_binary': {
        id: 'unexpected_binary',
        priority: WarningPriority.HIGH,
        title: 'Unexpected Binary Content',
        description: 'Binary content detected in a location where it is not typically expected.',
        recommendations: [
          'Confirm binary files are expected in this context',
          'Verify file permissions and access controls',
          'Check for unauthorized file placement'
        ],
        isBlocking: false
      },
      'high_entropy': {
        id: 'high_entropy',
        priority: WarningPriority.MEDIUM,
        title: 'High Content Entropy',
        description: 'The file content shows high entropy, which may indicate compression or encryption.',
        recommendations: [
          'Verify if compression/encryption is expected',
          'Check file integrity and source authenticity',
          'Consider additional security scanning'
        ],
        isBlocking: false
      },
      'known_malware_signature': {
        id: 'known_malware_signature',
        priority: WarningPriority.CRITICAL,
        title: 'Malware Signature Detected',
        description: 'The file matches a known malware signature and should not be processed.',
        recommendations: [
          'Do not process or open this file',
          'Quarantine the file immediately',
          'Report to security team',
          'Run full system antivirus scan'
        ],
        isBlocking: true
      },
      // Risk level warnings
      'low_risk': {
        id: 'low_risk',
        priority: WarningPriority.LOW,
        title: 'Low Security Risk',
        description: 'File analysis indicates low security risk.',
        recommendations: [
          'File appears safe for normal processing',
          'Continue with standard security practices'
        ],
        isBlocking: false
      },
      'medium_risk': {
        id: 'medium_risk',
        priority: WarningPriority.MEDIUM,
        title: 'Medium Security Risk',
        description: 'File analysis indicates moderate security concerns.',
        recommendations: [
          'Proceed with caution',
          'Consider additional verification steps',
          'Monitor file behavior during processing'
        ],
        isBlocking: false
      },
      'high_risk': {
        id: 'high_risk',
        priority: WarningPriority.HIGH,
        title: 'High Security Risk',
        description: 'File analysis indicates significant security risks.',
        recommendations: [
          'Manual review required before processing',
          'Consider alternative approaches',
          'Document security concerns for audit trail'
        ],
        isBlocking: false
      },
      'critical_risk': {
        id: 'critical_risk',
        priority: WarningPriority.CRITICAL,
        title: 'Critical Security Risk',
        description: 'File analysis indicates critical security threats.',
        recommendations: [
          'Do not process this file',
          'Isolate and quarantine immediately',
          'Escalate to security incident response team',
          'Preserve evidence for forensic analysis'
        ],
        isBlocking: true
      }
    }
  }
};

/**
 * Security warning generator for creating user-friendly security warnings
 */
export class SecurityWarningGenerator {
  private config: WarningGeneratorConfig;

  constructor(config: WarningGeneratorConfig = DEFAULT_WARNING_CONFIG) {
    this.config = config;
  }

  /**
   * Generate warnings based on risk assessment
   */
  generateWarnings(assessment: RiskAssessment): WarningMessage[] {
    const warnings: WarningMessage[] = [];

    // Add risk level warning
    const riskWarning = this.generateRiskLevelWarning(assessment);
    if (riskWarning) {
      warnings.push(riskWarning);
    }

    // Add factor-specific warnings
    const factorWarnings = this.generateFactorWarnings(assessment);
    warnings.push(...factorWarnings);

    // Group similar warnings if configured
    if (this.config.groupSimilarWarnings) {
      return this.groupWarnings(warnings);
    }

    return warnings;
  }

  /**
   * Generate warning for overall risk level
   */
  private generateRiskLevelWarning(assessment: RiskAssessment): WarningMessage | null {
    const messageId = this.getRiskLevelMessageId(assessment.riskLevel);
    const baseMessage = this.config.localization.messages[messageId];

    if (!baseMessage) {
      return null;
    }

    return {
      ...baseMessage,
      recommendations: this.limitRecommendations(baseMessage.recommendations),
      context: this.config.includeDetailedContext ? [
        `Overall Risk Score: ${assessment.overallScore}/100`,
        `Confidence: ${assessment.confidence}%`,
        `Risk Factors: ${assessment.riskFactors.length}`
      ] : undefined
    };
  }

  /**
   * Generate warnings for individual risk factors
   */
  private generateFactorWarnings(assessment: RiskAssessment): WarningMessage[] {
    const warnings: WarningMessage[] = [];

    for (const factor of assessment.riskFactors) {
      const messageId = this.getFactorMessageId(factor.name);
      const baseMessage = this.config.localization.messages[messageId];

      if (baseMessage) {
        const warning: WarningMessage = {
          ...baseMessage,
          recommendations: this.limitRecommendations(baseMessage.recommendations),
          context: this.config.includeDetailedContext ? [
            `Risk Score: ${factor.score}/100`,
            `Description: ${factor.description}`,
            ...factor.evidence.map(evidence => `Evidence: ${evidence}`)
          ] : undefined
        };
        warnings.push(warning);
      }
    }

    return warnings;
  }

  /**
   * Group similar warnings to reduce noise
   */
  private groupWarnings(warnings: WarningMessage[]): WarningMessage[] {
    const grouped = new Map<string, WarningMessage>();

    for (const warning of warnings) {
      const key = `${warning.priority}-${warning.title}`;

      if (grouped.has(key)) {
        // Merge recommendations and context
        const existing = grouped.get(key)!;
        const combinedRecommendations = [
          ...new Set([...existing.recommendations, ...warning.recommendations])
        ].slice(0, this.config.maxRecommendations);

        const combinedContext = existing.context && warning.context
          ? [...existing.context, ...warning.context]
          : existing.context || warning.context;

        grouped.set(key, {
          ...existing,
          recommendations: combinedRecommendations,
          context: combinedContext,
          isBlocking: existing.isBlocking || warning.isBlocking
        });
      } else {
        grouped.set(key, warning);
      }
    }

    return Array.from(grouped.values());
  }

  /**
   * Get message ID for risk level
   */
  private getRiskLevelMessageId(riskLevel: SecurityRiskLevel): string {
    switch (riskLevel) {
      case SecurityRiskLevel.LOW:
        return 'low_risk';
      case SecurityRiskLevel.MEDIUM:
        return 'medium_risk';
      case SecurityRiskLevel.HIGH:
        return 'high_risk';
      case SecurityRiskLevel.CRITICAL:
        return 'critical_risk';
      default:
        return 'low_risk';
    }
  }

  /**
   * Get message ID for risk factor
   */
  private getFactorMessageId(factorName: string): string {
    const mapping: Record<string, string> = {
      'Executable File': 'executable_file',
      'Suspicious Extension': 'suspicious_extension',
      'Large File Size': 'large_file_size',
      'Unexpected Binary File': 'unexpected_binary',
      'High Entropy': 'high_entropy',
      'Known Malware Signature': 'known_malware_signature'
    };

    return mapping[factorName] || 'low_risk';
  }

  /**
   * Limit number of recommendations per warning
   */
  private limitRecommendations(recommendations: string[]): string[] {
    return recommendations.slice(0, this.config.maxRecommendations);
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<WarningGeneratorConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): WarningGeneratorConfig {
    return { ...this.config };
  }

  /**
   * Add custom warning message
   */
  addCustomMessage(message: WarningMessage): void {
    this.config.localization.messages[message.id] = message;
  }

  /**
   * Remove custom warning message
   */
  removeCustomMessage(messageId: string): void {
    delete this.config.localization.messages[messageId];
  }
}