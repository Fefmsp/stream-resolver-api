const { join } = require('path');

/**
 * @type {import("puppeteer").Configuration}
 */
module.exports = {
  // Force Puppeteer à stocker le navigateur dans le dossier du projet
  cacheDirectory: join(__dirname, '.cache', 'puppeteer'),
};
