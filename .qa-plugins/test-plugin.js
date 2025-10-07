module.exports = {
  name: 'test-plugin',
  version: '1.0.0',
  description: 'A simple test plugin for QA agent',

  async run(qaAgent) {
    qaAgent.log('INFO', 'Test plugin executed successfully');
    return {
      errors: 0,
      warnings: 0,
      duration: 0.1,
      timestamp: new Date()
    };
  }
};