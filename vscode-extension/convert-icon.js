const sharp = require('sharp');
const path = require('path');

const inputPath = 'e:/Polymath Universata/Projects/Echain/EchainLogo.jpg';
const outputPath = path.join(__dirname, 'icon.png');

sharp(inputPath)
  .resize(128, 128, {
    fit: 'contain',
    background: { r: 255, g: 255, b: 255, alpha: 0 }
  })
  .png()
  .toFile(outputPath)
  .then(() => {
    console.log('Icon converted successfully to:', outputPath);
  })
  .catch(err => {
    console.error('Error converting icon:', err);
  });
