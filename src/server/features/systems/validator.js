/**
 * System validation utilities
 */

const path = require('path');
const fs = require('fs').promises;

/**
 * Normalize path to absolute path
 * @param {string} configPath - Config file path (relative or absolute)
 * @param {string} projectRoot - Project root directory for resolving relative paths
 * @returns {string} - Absolute path
 */
function normalizeToAbsolutePath(configPath, projectRoot) {
  const trimmedPath = configPath.trim();
  if (path.isAbsolute(trimmedPath)) {
    return path.normalize(trimmedPath);
  }
  return path.normalize(path.join(projectRoot, trimmedPath));
}

/**
 * Validate system data
 * @param {Object} system - System object to validate
 * @param {string} projectRoot - Project root directory for resolving relative paths
 * @param {boolean} checkFileExists - Whether to check if file exists (default: true)
 * @returns {Object} - Validated system object with name and configPath (always absolute)
 * @throws {Error} - If validation fails
 */
async function validateSystem(system, projectRoot, checkFileExists = true) {
  if (!system.name || typeof system.name !== 'string' || system.name.trim().length === 0) {
    throw new Error('System name is required and must be a non-empty string');
  }
  if (!system.configPath || typeof system.configPath !== 'string' || system.configPath.trim().length === 0) {
    throw new Error('Config file path is required and must be a non-empty string');
  }
  
  // Always normalize to absolute path
  const configPath = system.configPath.trim();
  const absolutePath = normalizeToAbsolutePath(configPath, projectRoot);
  
  // Check if file exists
  if (checkFileExists) {
    try {
      await fs.access(absolutePath);
    } catch (error) {
      if (error.code === 'ENOENT') {
        throw new Error(`Configuration file does not exist: ${absolutePath}`);
      }
      throw new Error(`Cannot access configuration file: ${error.message}`);
    }
  }
  
  return {
    name: system.name.trim(),
    configPath: absolutePath
  };
}

module.exports = { validateSystem };

