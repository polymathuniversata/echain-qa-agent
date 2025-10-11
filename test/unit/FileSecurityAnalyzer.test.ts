import { jest } from '@jest/globals';
import * as fs from 'fs/promises';
import { Stats } from 'fs';
import { BasicFileSecurityAnalyzer, SecurityRiskLevel } from '../../src/security/FileSecurityAnalyzer.js';

// Mock fs/promises
jest.mock('fs/promises', () => ({
  stat: jest.fn(),
  readFile: jest.fn(),
}));

// Mock crypto
jest.mock('crypto', () => ({
  createHash: jest.fn(() => ({
    update: jest.fn(() => ({
      digest: jest.fn(() => 'mocked_hash'),
    })),
  })),
}));

describe('BasicFileSecurityAnalyzer', () => {
  let analyzer: BasicFileSecurityAnalyzer;
  const mockStats = {
    size: 1024,
    mode: 0o644,
    mtime: new Date('2025-01-01'),
  } as Stats;

  const mockContent = Buffer.from('test file content');

  beforeEach(() => {
    analyzer = new BasicFileSecurityAnalyzer();
    jest.clearAllMocks();

    // Setup default mocks
    (fs.stat as jest.MockedFunction<typeof fs.stat>).mockResolvedValue(mockStats);
    (fs.readFile as jest.MockedFunction<typeof fs.readFile>).mockResolvedValue(mockContent);
  });

  describe('analyzeFile', () => {
    it('should analyze a file successfully', async () => {
      const filePath = '/test/file.txt';
      const result = await analyzer.analyzeFile(filePath);

      expect(result).toBeDefined();
      expect(result.filePath).toBe(filePath);
      expect(result.fileSize).toBe(1024);
      expect(result.sha256Hash).toBe('mocked_hash');
      expect(result.md5Hash).toBe('mocked_hash');
      expect(result.riskAssessment).toBeDefined();
      expect(result.metadata).toBeDefined();
      expect(result.analyzedAt).toBeInstanceOf(Date);
      expect(result.analysisDuration).toBeGreaterThanOrEqual(0);
    });

    it('should extract correct metadata for a text file', async () => {
      const filePath = '/test/document.txt';
      const result = await analyzer.analyzeFile(filePath);

      expect(result.metadata.extension).toBe('.txt');
      expect(result.metadata.isExecutable).toBe(false);
      expect(result.metadata.permissions).toBe('644');
      expect(result.metadata.lastModified).toEqual(new Date('2025-01-01'));
      expect(result.metadata.isBinary).toBe(false);
    });

    it('should detect executable files', async () => {
      const executableStats = { ...mockStats, mode: 0o755 };
      (fs.stat as jest.MockedFunction<typeof fs.stat>).mockResolvedValue(executableStats);

      const filePath = '/test/script.sh';
      const result = await analyzer.analyzeFile(filePath);

      expect(result.metadata.isExecutable).toBe(true);
    });

    it('should detect binary files', async () => {
      const binaryContent = Buffer.from([0x00, 0x01, 0x02, 0x03, 0x00, 0x00, 0x00, 0x00]);
      (fs.readFile as jest.MockedFunction<typeof fs.readFile>).mockResolvedValue(binaryContent);

      const filePath = '/test/binary.dat';
      const result = await analyzer.analyzeFile(filePath);

      expect(result.metadata.isBinary).toBe(true);
    });

    it('should handle suspicious file extensions', async () => {
      const filePath = '/test/malware.exe';
      const result = await analyzer.analyzeFile(filePath);

      expect(result.metadata.extension).toBe('.exe');
      expect(result.riskAssessment.riskFactors.some((f: any) => f.name === 'Suspicious Extension')).toBe(true);
    });

    it('should assess risk for large files', async () => {
      const largeStats = { ...mockStats, size: 150 * 1024 * 1024 }; // 150MB
      (fs.stat as jest.MockedFunction<typeof fs.stat>).mockResolvedValue(largeStats);

      const filePath = '/test/large-file.zip';
      const result = await analyzer.analyzeFile(filePath);

      expect(result.riskAssessment.riskFactors.some((f: any) => f.name === 'Large File Size')).toBe(true);
    });

    it('should calculate correct risk levels', async () => {
      // Test LOW risk
      const filePath = '/test/safe.txt';
      const result = await analyzer.analyzeFile(filePath);

      expect(result.riskAssessment.riskLevel).toBe(SecurityRiskLevel.LOW);
      expect(result.riskAssessment.overallScore).toBeLessThan(40);
    });

    it('should generate appropriate recommendations', async () => {
      const filePath = '/test/safe.txt';
      const result = await analyzer.analyzeFile(filePath);

      expect(result.riskAssessment.recommendations).toContain('✅ File appears safe for processing.');
    });

    it('should handle file read errors', async () => {
      (fs.readFile as jest.MockedFunction<typeof fs.readFile>).mockRejectedValue(new Error('File not found'));

      const filePath = '/test/nonexistent.txt';
      await expect(analyzer.analyzeFile(filePath)).rejects.toThrow('Failed to analyze file');
    });

    it('should handle stat errors', async () => {
      (fs.stat as jest.MockedFunction<typeof fs.stat>).mockRejectedValue(new Error('Permission denied'));

      const filePath = '/test/forbidden.txt';
      await expect(analyzer.analyzeFile(filePath)).rejects.toThrow('Failed to analyze file');
    });

    it('should detect unexpected binary files', async () => {
      const binaryContent = Buffer.from([0x00, 0x01, 0x02, 0x03, 0x00, 0x00, 0x00, 0x00]);
      (fs.readFile as jest.MockedFunction<typeof fs.readFile>).mockResolvedValue(binaryContent);

      const filePath = 'unexpected-binary.txt'; // Use relative path instead of absolute
      const result = await analyzer.analyzeFile(filePath);

      expect(result.riskAssessment.riskFactors.some((f: any) => f.name === 'Unexpected Binary File')).toBe(true);
    });

    it('should handle files without extensions', async () => {
      const filePath = '/test/README';
      const result = await analyzer.analyzeFile(filePath);

      expect(result.metadata.extension).toBeUndefined();
    });
  });
});