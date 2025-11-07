/**
 * Configuration format registry and handler system
 * Supports extensible format handlers for different configuration file types
 */

const path = require('path');
const propertiesHandler = require('./properties');

/**
 * Format registry - maps file extensions to format handlers
 * Add new formats here in the future (yaml, xml, json, etc.)
 */
const FORMAT_REGISTRY = {
  '.env': propertiesHandler,
  '.properties': propertiesHandler
  // Future formats can be added here:
  // '.yaml': yamlHandler,
  // '.yml': yamlHandler,
  // '.xml': xmlHandler,
  // '.json': jsonHandler,
};

/**
 * Get format handler for a given file path
 * @param {string} filePath - Path to the configuration file
 * @returns {Object|null} - Format handler object or null if format not supported
 */
function getFormatHandler(filePath) {
  const basename = path.basename(filePath).toLowerCase();
  const ext = path.extname(filePath).toLowerCase();
  
  // Special case: .env files don't have an extension, the filename itself is .env
  if (basename === '.env' || basename.endsWith('.env')) {
    return FORMAT_REGISTRY['.env'] || null;
  }
  
  // For other files, check by extension
  return FORMAT_REGISTRY[ext] || null;
}

/**
 * Check if a file format is supported
 * @param {string} filePath - Path to the configuration file
 * @returns {boolean} - True if format is supported
 */
function isFormatSupported(filePath) {
  return getFormatHandler(filePath) !== null;
}

/**
 * Get list of supported file extensions
 * @returns {Array<string>} - Array of supported file extensions (e.g., ['.env', '.properties'])
 */
function getSupportedExtensions() {
  return Object.keys(FORMAT_REGISTRY);
}

/**
 * Get list of supported file extensions as a string for display
 * @returns {string} - Comma-separated list of extensions (e.g., ".env, .properties")
 */
function getSupportedExtensionsString() {
  return getSupportedExtensions().join(', ');
}

module.exports = {
  getFormatHandler,
  isFormatSupported,
  getSupportedExtensions,
  getSupportedExtensionsString,
  FORMAT_REGISTRY
};

