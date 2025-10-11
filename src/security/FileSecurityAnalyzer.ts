import * as fs from 'fs/promises';
import { Stats } from 'fs';
import * as crypto from 'crypto';
import * as path from 'path';

/**
 * Security risk levels for file analysis
 */
export enum SecurityRiskLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

/**
 * File security analysis result
 */
export interface FileSecurityResult {
  /** File path that was analyzed */
  filePath: string;
  /** File size in bytes */
  fileSize: number;
  /** MIME type of the file */
  mimeType?: string;
  /** SHA-256 hash of the file */
  sha256Hash: string;
  /** MD5 hash of the file */
  md5Hash: string;
  /** Overall risk assessment */
  riskAssessment: RiskAssessment;
  /** Analysis timestamp */
  analyzedAt: Date;
  /** Analysis duration in milliseconds */
  analysisDuration: number;
  /** Additional metadata */
  metadata: FileMetadata;
}

/**
 * File metadata extracted during analysis
 */
export interface FileMetadata {
  /** File extension */
  extension?: string;
  /** Whether file is executable */
  isExecutable: boolean;
  /** File permissions (Unix-style) */
  permissions?: string;
  /** Last modified timestamp */
  lastModified?: Date;
  /** File encoding detected */
  encoding?: string;
  /** Whether file contains binary data */
  isBinary: boolean;
}

/**
 * Risk assessment result
 */
export interface RiskAssessment {
  /** Overall risk score (0-100) */
  overallScore: number;
  /** Risk level category */
  riskLevel: SecurityRiskLevel;
  /** Individual risk factors */
  riskFactors: RiskFactor[];
  /** Confidence in the assessment (0-100) */
  confidence: number;
  /** Recommended actions */
  recommendations: string[];
}

/**
 * Individual risk factor
 */
export interface RiskFactor {
  /** Factor name */
  name: string;
  /** Risk score for this factor (0-100) */
  score: number;
  /** Factor description */
  description: string;
  /** Evidence supporting this factor */
  evidence: string[];
  /** Whether this factor blocks file access */
  isBlocking: boolean;
}

/**
 * File security analyzer interface
 */
export interface FileSecurityAnalyzer {
  /**
   * Analyze a file for security risks
   * @param filePath - Absolute path to the file to analyze
   * @returns Promise resolving to security analysis result
   */
  analyzeFile(filePath: string): Promise<FileSecurityResult>;
}

/**
 * Basic implementation of FileSecurityAnalyzer
 */
export class BasicFileSecurityAnalyzer implements FileSecurityAnalyzer {
  async analyzeFile(filePath: string): Promise<FileSecurityResult> {
    const startTime = Date.now();

    try {
      // Get file stats
      const stats = await fs.stat(filePath);
      const fileSize = stats.size;

      // Read file content for hashing
      const content = await fs.readFile(filePath);

      // Calculate hashes
      const sha256Hash = crypto.createHash('sha256').update(content).digest('hex');
      const md5Hash = crypto.createHash('md5').update(content).digest('hex');

      // Extract metadata
      const metadata = await this.extractMetadata(filePath, stats, content);

      // Perform basic risk assessment
      const riskAssessment = await this.performBasicRiskAssessment(filePath, fileSize, metadata);

      const analysisDuration = Date.now() - startTime;

      return {
        filePath,
        fileSize,
        sha256Hash,
        md5Hash,
        riskAssessment,
        analyzedAt: new Date(),
        analysisDuration,
        metadata
      };
    } catch (error) {
      throw new Error(`Failed to analyze file ${filePath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async extractMetadata(filePath: string, stats: Stats, content: Buffer): Promise<FileMetadata> {
    const extension = path.extname(filePath).toLowerCase() || undefined;

    // Check if file is executable (basic check)
    const isExecutable = !!(stats.mode & parseInt('111', 8));

    // Detect if file is binary
    const isBinary = this.isBinaryContent(content);

    // Try to detect encoding (basic)
    const encoding = this.detectEncoding(content);

    return {
      extension,
      isExecutable,
      permissions: (stats.mode & parseInt('777', 8)).toString(8),
      lastModified: stats.mtime,
      encoding,
      isBinary
    };
  }

  private isBinaryContent(content: Buffer): boolean {
    // Check first 512 bytes for null bytes or non-printable characters
    const sample = content.slice(0, Math.min(512, content.length));
    let binaryChars = 0;

    for (const byte of sample) {
      if (byte === 0 || (byte < 32 && byte !== 9 && byte !== 10 && byte !== 13)) {
        binaryChars++;
      }
    }

    // If more than 30% binary characters, consider it binary
    return (binaryChars / sample.length) > 0.3;
  }

  private detectEncoding(content: Buffer): string | undefined {
    // Basic encoding detection
    try {
      // Try UTF-8
      content.toString('utf8');
      return 'utf8';
    } catch {
      try {
        // Try UTF-16
        content.toString('utf16le');
        return 'utf16le';
      } catch {
        return 'binary';
      }
    }
  }

  private async performBasicRiskAssessment(
    filePath: string,
    fileSize: number,
    metadata: FileMetadata
  ): Promise<RiskAssessment> {
    const riskFactors: RiskFactor[] = [];

    // Factor 1: File size risk
    if (fileSize > 100 * 1024 * 1024) { // 100MB
      riskFactors.push({
        name: 'Large File Size',
        score: 30,
        description: 'File is unusually large, which may indicate packed malware',
        evidence: [`File size: ${(fileSize / (1024 * 1024)).toFixed(2)} MB`],
        isBlocking: false
      });
    }

    // Factor 2: Executable file risk
    if (metadata.isExecutable) {
      riskFactors.push({
        name: 'Executable File',
        score: 50,
        description: 'File has executable permissions, increasing security risk',
        evidence: ['File is executable', `Permissions: ${metadata.permissions}`],
        isBlocking: false
      });
    }

    // Factor 3: Suspicious extensions
    const suspiciousExtensions = ['.exe', '.bat', '.cmd', '.scr', '.pif', '.com'];
    if (metadata.extension && suspiciousExtensions.includes(metadata.extension)) {
      riskFactors.push({
        name: 'Suspicious Extension',
        score: 70,
        description: 'File extension commonly associated with malware',
        evidence: [`Extension: ${metadata.extension}`],
        isBlocking: false
      });
    }

    // Factor 4: Binary file in unexpected location
    if (metadata.isBinary && !this.isExpectedBinaryLocation(filePath)) {
      riskFactors.push({
        name: 'Unexpected Binary File',
        score: 40,
        description: 'Binary file found in location not typically containing binaries',
        evidence: [`Path: ${filePath}`, 'Binary content detected'],
        isBlocking: false
      });
    }

    // Calculate overall score
    const overallScore = Math.min(100, riskFactors.reduce((sum, factor) => sum + factor.score, 0));

    // Determine risk level
    let riskLevel: SecurityRiskLevel;
    if (overallScore >= 80) {
      riskLevel = SecurityRiskLevel.CRITICAL;
    } else if (overallScore >= 60) {
      riskLevel = SecurityRiskLevel.HIGH;
    } else if (overallScore >= 40) {
      riskLevel = SecurityRiskLevel.MEDIUM;
    } else {
      riskLevel = SecurityRiskLevel.LOW;
    }

    // Generate recommendations
    const recommendations = this.generateRecommendations(riskFactors, riskLevel);

    return {
      overallScore,
      riskLevel,
      riskFactors,
      confidence: 75, // Basic analysis has moderate confidence
      recommendations
    };
  }

  private isExpectedBinaryLocation(filePath: string): boolean {
    const expectedBinaryDirs = ['node_modules', '.git', 'build', 'dist', 'bin', 'lib'];

    // Handle absolute paths by checking if they contain expected binary directories
    // regardless of the full path structure
    const normalizedPath = filePath.replace(/\\/g, '/'); // Normalize Windows paths

    return expectedBinaryDirs.some(dir => {
      // Check if the path contains the directory anywhere
      return normalizedPath.includes(`/${dir}/`) || normalizedPath.includes(`${dir}/`) || normalizedPath.startsWith(`${dir}/`);
    });
  }

  private generateRecommendations(riskFactors: RiskFactor[], riskLevel: SecurityRiskLevel): string[] {
    const recommendations: string[] = [];

    if (riskLevel === SecurityRiskLevel.CRITICAL) {
      recommendations.push('⚠️  CRITICAL RISK: Do not process this file. Consult security team immediately.');
    } else if (riskLevel === SecurityRiskLevel.HIGH) {
      recommendations.push('⚠️  HIGH RISK: Review file content manually before processing.');
    }

    if (riskFactors.some(f => f.name === 'Executable File')) {
      recommendations.push('Consider removing executable permissions if not required.');
    }

    if (riskFactors.some(f => f.name === 'Large File Size')) {
      recommendations.push('Verify file content and source before processing large files.');
    }

    if (recommendations.length === 0) {
      recommendations.push('✅ File appears safe for processing.');
    }

    return recommendations;
  }
}