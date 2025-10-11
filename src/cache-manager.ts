import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';
import fse from 'fs-extra';

/**
 * Individual cache entry with expiration and hash validation
 */
export interface QACacheEntry {
  /** Hash of the project state when results were cached */
  hash: string;
  /** Cached QA results */
  results: any;
  /** When the results were cached */
  timestamp: Date;
  /** When the cache entry expires */
  expiresAt: Date;
}

/**
 * Cache structure for different types of QA results
 */
export interface QACache {
  /** Cached linting results */
  linting?: QACacheEntry;
  /** Cached testing results */
  testing?: QACacheEntry;
  /** Cached security results */
  security?: QACacheEntry;
  /** Cached build results */
  build?: QACacheEntry;
}

/**
 * CacheManager handles caching of QA results to improve performance by avoiding
 * redundant checks when project state hasn't changed.
 */
export class CacheManager {
  private projectRoot: string;
  private cachePath: string;
  private cache: QACache;

  /**
   * Creates a new CacheManager instance
   * @param projectRoot Root directory of the project
   */
  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
    this.cachePath = path.join(this.projectRoot, '.qa-cache.json');
    this.cache = {};
  }

  /**
   * Loads cache from disk and cleans expired entries
   */
  async loadCache(): Promise<void> {
    try {
      if (await fse.pathExists(this.cachePath)) {
        const cacheContent = await fs.readFile(this.cachePath, 'utf-8');
        this.cache = JSON.parse(cacheContent);

        // Clean expired entries
        const now = new Date();
        Object.keys(this.cache).forEach(key => {
          const entry = this.cache[key as keyof QACache];
          if (entry && entry.expiresAt < now) {
            delete this.cache[key as keyof QACache];
          }
        });
      }
    } catch {
      // Cache loading failed, start with empty cache
      this.cache = {};
    }
  }

  /**
   * Saves current cache to disk
   */
  async saveCache(): Promise<void> {
    try {
      await fse.writeFile(this.cachePath, JSON.stringify(this.cache, null, 2));
    } catch {
      // Silently fail if cache saving fails
    }
  }

  /**
   * Generates MD5 hash of a file's contents
   * @param filePath Path to the file to hash
   * @returns MD5 hash of the file content
   */
  async generateFileHash(filePath: string): Promise<string> {
    try {
      const content = await fse.readFile(filePath, 'utf-8');
      return crypto.createHash('md5').update(content).digest('hex');
    } catch {
      return '';
    }
  }

  /**
   * Generates a combined hash of key project configuration files
   * @returns MD5 hash representing the current project state
   */
  async generateProjectHash(): Promise<string> {
    const files = [
      'package.json',
      'tsconfig.json',
      'hardhat.config.js',
      'hardhat.config.ts',
      '.qa-config.json',
    ];

    let combinedHash = '';
    for (const file of files) {
      const filePath = path.join(this.projectRoot, file);
      if (await fse.pathExists(filePath)) {
        combinedHash += await this.generateFileHash(filePath);
      }
    }

    return crypto.createHash('md5').update(combinedHash).digest('hex');
  }

  /**
   * Retrieves cached results for a specific check type if still valid
   * @param checkType Type of QA check (linting, testing, security, build)
   * @returns Cached results or null if not available or expired
   */
  async getCachedResult(checkType: keyof QACache): Promise<any | null> {
    const entry = this.cache[checkType];
    if (!entry) {return null;}

    const currentHash = await this.generateProjectHash();
    if (entry.hash !== currentHash) {return null;}

    if (entry.expiresAt < new Date()) {return null;}

    return entry.results;
  }

  /**
   * Stores QA results in cache with expiration
   * @param checkType Type of QA check that was performed
   * @param results Results to cache
   */
  async setCachedResult(checkType: keyof QACache, results: any): Promise<void> {
    const hash = await this.generateProjectHash();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    this.cache[checkType] = {
      hash,
      results,
      timestamp: new Date(),
      expiresAt,
    };

    await this.saveCache();
  }

  /**
   * Clears all cached results
   */
  clearCache(): void {
    this.cache = {};
  }

  /**
   * Gets statistics about the current cache state
   * @returns Object containing number of entries and cache size in bytes
   */
  getCacheStats(): { entries: number; size: number } {
    const entries = Object.keys(this.cache).length;
    const size = JSON.stringify(this.cache).length;
    return { entries, size };
  }
}
