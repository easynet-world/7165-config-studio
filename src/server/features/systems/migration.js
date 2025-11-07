/**
 * System registry migration utilities
 */

const fs = require('fs').promises;
const path = require('path');

/**
 * Migrate systems registry from old location to new data folder
 * @param {string} oldPath - Path to old registry file
 * @param {string} newPath - Path to new registry file
 * @returns {Promise<boolean>} - True if migration occurred, false otherwise
 */
async function migrateRegistryIfNeeded(oldPath, newPath) {
  try {
    // Check if old file exists
    try {
      await fs.access(oldPath);
    } catch (error) {
      if (error.code === 'ENOENT') {
        // Old file doesn't exist, no migration needed
        return false;
      }
      throw error;
    }

    // Check if new file already exists
    try {
      await fs.access(newPath);
      // New file exists, don't migrate (user may have already migrated)
      console.log(`Registry already exists at ${newPath}, skipping migration`);
      return false;
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
    }

    // Migrate old file to new location
    const content = await fs.readFile(oldPath, 'utf-8');
    const data = JSON.parse(content);
    
    // Ensure new directory exists
    const newDir = path.dirname(newPath);
    await fs.mkdir(newDir, { recursive: true });
    
    // Write to new location
    await fs.writeFile(newPath, JSON.stringify(data, null, 2), 'utf-8');
    
    // Remove old file
    await fs.unlink(oldPath);
    
    console.log(`Migrated systems registry from ${oldPath} to ${newPath}`);
    return true;
  } catch (error) {
    console.error('Error during registry migration:', error);
    // Don't throw - allow app to continue even if migration fails
    return false;
  }
}

module.exports = { migrateRegistryIfNeeded };

