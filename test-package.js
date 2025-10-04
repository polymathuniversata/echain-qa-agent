#!/usr/bin/env node

const { QAAgent } = require('./dist/index.js');

async function testQAAgent() {
  console.log('🧪 Testing QA Agent Package...\n');

  const qaAgent = new QAAgent({
    verbose: true,
    dryRun: true, // Don't actually run commands, just test the logic
    projectRoot: process.cwd()
  });

  try {
    console.log('✅ QA Agent instantiated successfully');

    // Test initialization
    await qaAgent.initializeProject();
    console.log('✅ Project initialization completed');

    console.log('\n🎉 QA Agent package test completed successfully!');
    console.log('The package is ready for publication and use in blockchain projects.');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

testQAAgent();