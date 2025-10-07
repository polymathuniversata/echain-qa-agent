const { globSync } = require('glob');
const { readFile, writeFile } = require('fs/promises');
const path = require('path');

async function postProcess() {
  const docsDir = 'docs/api';
  const htmlFiles = globSync('**/*.html', { cwd: docsDir });

  console.log('htmlFiles:', htmlFiles);

  for (const htmlFile of htmlFiles) {
    console.log('Processing:', htmlFile);
    try {
      const fullPath = path.join(docsDir, htmlFile);
      let content = await readFile(fullPath, 'utf-8');

      // Fix external links to include rel="noopener"
      content = content.replace(
        /<a href="https?:\/\/[^"]*" target="_blank">/g,
        (match) => match.replace('target="_blank">', 'target="_blank" rel="noopener">')
      );

      // Remove autocapitalize attribute that's not supported in Safari
      content = content.replace(
        /autocapitalize="[^"]*"/g,
        ''
      );

      await writeFile(fullPath, content);
      console.log('Processed:', htmlFile);
    } catch (error) {
      console.error('Failed to process', htmlFile, error.message);
    }
  }

  console.log('Post-processing completed');
}

postProcess();