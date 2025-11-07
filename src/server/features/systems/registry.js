/**
 * System registry management
 */

const fs = require('fs').promises;
const path = require('path');

/**
 * Ensure directory exists for the given file path
 * @param {string} filePath - Path to the file
 * @returns {Promise<void>}
 */
async function ensureDirectoryExists(filePath) {
  const dir = path.dirname(filePath);
  try {
    await fs.access(dir);
  } catch (error) {
    if (error.code === 'ENOENT') {
      await fs.mkdir(dir, { recursive: true });
    } else {
      throw error;
    }
  }
}

/**
 * Normalize all system paths to absolute paths
 * @param {Array} systems - Array of system objects
 * @param {string} projectRoot - Project root directory for resolving relative paths
 * @returns {Array} - Array of systems with normalized absolute paths
 */
function normalizeSystemPaths(systems, projectRoot) {
  return systems.map(system => {
    if (system.configPath && !path.isAbsolute(system.configPath)) {
      // Convert relative paths to absolute
      system.configPath = path.normalize(path.join(projectRoot, system.configPath));
    } else if (system.configPath) {
      // Normalize absolute paths
      system.configPath = path.normalize(system.configPath);
    }
    return system;
  });
}

/**
 * Load systems registry from file and normalize paths
 * @param {string} registryPath - Path to the registry file
 * @param {string} projectRoot - Project root directory for resolving relative paths
 * @returns {Promise<Array>} - Array of system objects with absolute paths
 */
async function loadSystemsRegistry(registryPath, projectRoot) {
  try {
    const content = await fs.readFile(registryPath, 'utf-8');
    const systems = JSON.parse(content);
    // Normalize all paths to absolute
    return normalizeSystemPaths(systems, projectRoot);
  } catch (error) {
    if (error.code === 'ENOENT') {
      // File doesn't exist, return empty registry
      return [];
    }
    throw error;
  }
}

/**
 * Save systems registry to file
 * @param {string} registryPath - Path to the registry file
 * @param {Array} systems - Array of system objects to save
 * @returns {Promise<void>}
 */
async function saveSystemsRegistry(registryPath, systems) {
  // Ensure directory exists before writing
  await ensureDirectoryExists(registryPath);
  await fs.writeFile(registryPath, JSON.stringify(systems, null, 2), 'utf-8');
}

module.exports = {
  loadSystemsRegistry,
  saveSystemsRegistry
};

