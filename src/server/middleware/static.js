/**
 * Static file serving middleware with no-cache headers
 */

const express = require('express');
const path = require('path');

/**
 * Create static file middleware with no-cache headers
 * @param {string} publicDir - Path to public directory
 * @returns {Function} - Express middleware
 */
function createStaticMiddleware(publicDir) {
  return express.static(publicDir, {
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('.html') || filePath.endsWith('.js') || filePath.endsWith('.css')) {
        res.set({
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        });
      }
    }
  });
}

module.exports = { createStaticMiddleware };

