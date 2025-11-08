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
 * Excludes System Settings (which is stored separately)
 * @param {string} registryPath - Path to the registry file
 * @param {string} projectRoot - Project root directory for resolving relative paths
 * @returns {Promise<Array>} - Array of system objects with absolute paths (excluding System Settings)
 */
async function loadSystemsRegistry(registryPath, projectRoot) {
  try {
    const content = await fs.readFile(registryPath, 'utf-8');
    const systems = JSON.parse(content);
    // Filter out System Settings (it's stored separately)
    const filteredSystems = systems.filter(s => s.name !== 'System Settings');
    // Normalize all paths to absolute
    return normalizeSystemPaths(filteredSystems, projectRoot);
  } catch (error) {
    if (error.code === 'ENOENT') {
      // File doesn't exist, return empty registry
      return [];
    }
    throw error;
  }
}

/**
 * Load System Settings from separate file
 * @param {string} systemSettingsPath - Path to the system settings file
 * @param {string} projectRoot - Project root directory for resolving relative paths
 * @returns {Promise<Object|null>} - System Settings object with absolute path, or null if not found
 */
async function loadSystemSettings(systemSettingsPath, projectRoot) {
  try {
    const content = await fs.readFile(systemSettingsPath, 'utf-8');
    const systemSettings = JSON.parse(content);
    // Normalize path to absolute
    const normalized = normalizeSystemPaths([systemSettings], projectRoot);
    return normalized[0] || null;
  } catch (error) {
    if (error.code === 'ENOENT') {
      // File doesn't exist, return null
      return null;
    }
    throw error;
  }
}

/**
 * Save System Settings to separate file
 * @param {string} systemSettingsPath - Path to the system settings file
 * @param {Object} systemSettings - System Settings object to save
 * @returns {Promise<void>}
 */
async function saveSystemSettings(systemSettingsPath, systemSettings) {
  // Ensure directory exists before writing
  await ensureDirectoryExists(systemSettingsPath);
  await fs.writeFile(systemSettingsPath, JSON.stringify(systemSettings, null, 2), 'utf-8');
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
  saveSystemsRegistry,
  loadSystemSettings,
  saveSystemSettings
};

