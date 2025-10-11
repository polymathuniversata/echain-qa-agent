#!/usr/bin/env node

/**
 * Performance Benchmarking Script for echain-qa-agent
 *
 * This script measures the actual performance of QA checks to verify
 * documented performance claims and provide accurate benchmarks.
 */

import { execSync, spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class PerformanceBenchmark {
    constructor() {
        this.results = [];
        this.testProject = path.join(__dirname, '..', 'test-project');
        this.outputFile = path.join(__dirname, '..', 'performance-benchmark-results.json');
    }

    async run() {
        console.log('🚀 Starting echain-qa-agent Performance Benchmark\n');

        // Check if test project exists
        if (!fs.existsSync(this.testProject)) {
            console.log('❌ Test project not found. Creating a minimal test project...');
            this.createTestProject();
        }

        // Run benchmarks
        await this.runColdStartBenchmark();
        await this.runWarmCacheBenchmark();
        await this.runIndividualCheckBenchmarks();
        await this.runMemoryUsageBenchmark();

        // Generate report
        this.generateReport();

        console.log('\n✅ Benchmark complete! Results saved to performance-benchmark-results.json');
    }

    createTestProject() {
        const testProjectPath = this.testProject;
        fs.mkdirSync(testProjectPath, { recursive: true });

        // Create package.json
        const packageJson = {
            name: 'test-project',
            version: '1.0.0',
            scripts: {
                test: 'echo "running tests"',
                build: 'echo "building project"',
                qa: 'npx echain-qa run'
            }
        };
        fs.writeFileSync(path.join(testProjectPath, 'package.json'), JSON.stringify(packageJson, null, 2));

        // Install the QA agent locally
        console.log('  Installing echain-qa-agent locally...');
        try {
            execSync('npm install --save-dev ../', {
                cwd: testProjectPath,
                stdio: 'pipe'
            });
        } catch (error) {
            console.log('  ⚠️  Local install failed, will use global npx');
        }

        // Create a simple TypeScript file
        const tsFile = `
interface User {
    id: number;
    name: string;
    email: string;
}

class UserService {
    private users: User[] = [];

    addUser(user: User): void {
        this.users.push(user);
    }

    getUser(id: number): User | undefined {
        return this.users.find(u => u.id === id);
    }

    getAllUsers(): User[] {
        return this.users;
    }
}

export { UserService, User };
`;
        fs.writeFileSync(path.join(testProjectPath, 'src', 'userService.ts'), tsFile);

        // Create tsconfig.json
        const tsconfig = {
            compilerOptions: {
                target: 'ES2020',
                module: 'commonjs',
                strict: true,
                esModuleInterop: true,
                skipLibCheck: true,
                forceConsistentCasingInFileNames: true,
                outDir: './dist'
            },
            include: ['src/**/*'],
            exclude: ['node_modules', 'dist']
        };
        fs.writeFileSync(path.join(testProjectPath, 'tsconfig.json'), JSON.stringify(tsconfig, null, 2));

        console.log('✅ Test project created');
    }

    async runColdStartBenchmark() {
        console.log('📊 Running Cold Start Benchmark (no cache)...');

        const runs = 5;
        const times = [];

        for (let i = 0; i < runs; i++) {
            console.log(`  Run ${i + 1}/${runs}...`);

            // Clear any existing cache
            const cacheDir = path.join(this.testProject, '.qa-cache');
            if (fs.existsSync(cacheDir)) {
                fs.rmSync(cacheDir, { recursive: true, force: true });
            }

            const startTime = process.hrtime.bigint();
            try {
                execSync('npx echain-qa run --dry-run --quiet', {
                    cwd: this.testProject,
                    stdio: 'pipe',
                    timeout: 30000 // 30 second timeout
                });
            } catch (error) {
                console.log(`    ⚠️  Run ${i + 1} failed or timed out`);
                continue;
            }
            const endTime = process.hrtime.bigint();
            const durationMs = Number(endTime - startTime) / 1_000_000; // Convert to milliseconds
            times.push(durationMs);
            console.log(`    ⏱️  ${durationMs.toFixed(2)}ms`);
        }

        const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
        const minTime = Math.min(...times);
        const maxTime = Math.max(...times);

        this.results.push({
            benchmark: 'Cold Start (no cache)',
            description: 'Full QA run with cleared cache',
            runs: times.length,
            averageMs: avgTime,
            minMs: minTime,
            maxMs: maxTime,
            claimedTarget: '< 2000ms',
            meetsClaim: avgTime < 2000
        });

        console.log(`  📈 Average: ${avgTime.toFixed(2)}ms (Claim: <2000ms, Meets: ${avgTime < 2000 ? '✅' : '❌'})`);
    }

    async runWarmCacheBenchmark() {
        console.log('📊 Running Warm Cache Benchmark...');

        const runs = 5;
        const times = [];

        // First run to populate cache
        try {
            execSync('npx echain-qa run --quiet', {
                cwd: this.testProject,
                stdio: 'pipe',
                timeout: 30000
            });
        } catch (error) {
            console.log('  ⚠️  Cache warmup failed');
        }

        // Now measure cached runs
        for (let i = 0; i < runs; i++) {
            console.log(`  Run ${i + 1}/${runs}...`);

            const startTime = process.hrtime.bigint();
            try {
                execSync('npx echain-qa run --quiet', {
                    cwd: this.testProject,
                    stdio: 'pipe',
                    timeout: 30000
                });
            } catch (error) {
                console.log(`    ⚠️  Run ${i + 1} failed or timed out`);
                continue;
            }
            const endTime = process.hrtime.bigint();
            const durationMs = Number(endTime - startTime) / 1_000_000;
            times.push(durationMs);
            console.log(`    ⏱️  ${durationMs.toFixed(2)}ms`);
        }

        const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
        const minTime = Math.min(...times);
        const maxTime = Math.max(...times);

        this.results.push({
            benchmark: 'Warm Cache',
            description: 'QA run with populated cache',
            runs: times.length,
            averageMs: avgTime,
            minMs: minTime,
            maxMs: maxTime,
            claimedTarget: '< 500ms',
            meetsClaim: avgTime < 500
        });

        console.log(`  📈 Average: ${avgTime.toFixed(2)}ms (Claim: <500ms, Meets: ${avgTime < 500 ? '✅' : '❌'})`);
    }

    async runIndividualCheckBenchmarks() {
        console.log('📊 Running Individual Check Benchmarks...');

        const checks = ['lint', 'test', 'security', 'build'];
        const checkResults = [];

        for (const check of checks) {
            console.log(`  Testing '${check}' check...`);

            const runs = 3;
            const times = [];

            for (let i = 0; i < runs; i++) {
                const startTime = process.hrtime.bigint();
                try {
                    execSync(`npx echain-qa ${check} --quiet`, {
                        cwd: this.testProject,
                        stdio: 'pipe',
                        timeout: 20000
                    });
                } catch (error) {
                    console.log(`    ⚠️  ${check} run ${i + 1} failed`);
                    continue;
                }
                const endTime = process.hrtime.bigint();
                const durationMs = Number(endTime - startTime) / 1_000_000;
                times.push(durationMs);
            }

            if (times.length > 0) {
                const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
                checkResults.push({
                    check,
                    averageMs: avgTime,
                    runs: times.length
                });
                console.log(`    📈 ${check}: ${avgTime.toFixed(2)}ms average`);
            }
        }

        this.results.push({
            benchmark: 'Individual Checks',
            description: 'Performance of individual QA checks',
            results: checkResults
        });
    }

    async runMemoryUsageBenchmark() {
        console.log('📊 Running Memory Usage Benchmark...');

        const startMem = process.memoryUsage();
        const startTime = process.hrtime.bigint();

        try {
            execSync('npx echain-qa run --quiet', {
                cwd: this.testProject,
                stdio: 'pipe',
                timeout: 30000
            });
        } catch (error) {
            console.log('  ⚠️  Memory benchmark failed');
            return;
        }

        const endTime = process.hrtime.bigint();
        const endMem = process.memoryUsage();

        const durationMs = Number(endTime - startTime) / 1_000_000;
        const memIncreaseMB = (endMem.heapUsed - startMem.heapUsed) / (1024 * 1024);

        this.results.push({
            benchmark: 'Memory Usage',
            description: 'Memory consumption during QA run',
            durationMs,
            memoryIncreaseMB: memIncreaseMB,
            peakMemoryMB: endMem.heapUsed / (1024 * 1024),
            claimedTarget: '< 200MB',
            meetsClaim: memIncreaseMB < 200
        });

        console.log(`  📈 Memory increase: ${memIncreaseMB.toFixed(2)}MB (Claim: <200MB, Meets: ${memIncreaseMB < 200 ? '✅' : '❌'})`);
    }

    generateReport() {
        const report = {
            timestamp: new Date().toISOString(),
            system: {
                platform: os.platform(),
                arch: os.arch(),
                cpuCount: os.cpus().length,
                totalMemoryGB: os.totalmem() / (1024 * 1024 * 1024),
                nodeVersion: process.version
            },
            results: this.results,
            summary: {
                totalBenchmarks: this.results.length,
                claimsVerified: this.results.filter(r => r.meetsClaim !== undefined).length,
                claimsMet: this.results.filter(r => r.meetsClaim === true).length,
                claimsFailed: this.results.filter(r => r.meetsClaim === false).length
            }
        };

        fs.writeFileSync(this.outputFile, JSON.stringify(report, null, 2));

        console.log('\n📊 Benchmark Summary:');
        console.log(`  Total benchmarks: ${report.summary.totalBenchmarks}`);
        console.log(`  Claims verified: ${report.summary.claimsVerified}`);
        console.log(`  Claims met: ${report.summary.claimsMet}`);
        console.log(`  Claims failed: ${report.summary.claimsFailed}`);

        // Print detailed results
        console.log('\n📈 Detailed Results:');
        this.results.forEach(result => {
            if (result.meetsClaim !== undefined) {
                const status = result.meetsClaim ? '✅' : '❌';
                console.log(`  ${status} ${result.benchmark}: ${result.averageMs?.toFixed(2) || 'N/A'}ms (${result.claimedTarget})`);
            }
        });
    }
}

// Run the benchmark if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    const benchmark = new PerformanceBenchmark();
    benchmark.run().catch(error => {
        console.error('❌ Benchmark failed:', error.message);
        process.exit(1);
    });
}

export default PerformanceBenchmark;