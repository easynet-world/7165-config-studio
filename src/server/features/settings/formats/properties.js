/**
 * Properties-based format handler (.env, .properties)
 * This is the current implementation for properties-based configuration files
 */

const { parseEnvFile, cleanSectionName, parseRules, extractCommentText } = require('../parser');
const { formatEnvFile } = require('../formatter');

/**
 * Properties format handler
 * Implements the format handler interface for .env and .properties files
 */
const propertiesHandler = {
  /**
   * Format name for display
   */
  name: 'Properties',
  
  /**
   * Supported file extensions
   */
  extensions: ['.env', '.properties'],
  
  /**
   * Parse configuration file content
   * @param {string} content - File content as string
   * @returns {Object} - Parsed configuration with sections and sectionOrder
   */
  parse(content) {
    return parseEnvFile(content);
  },
  
  /**
   * Format configuration data back to file content
   * @param {Object} data - Configuration data with sections and sectionOrder
   * @returns {string} - Formatted file content
   */
  format(data) {
    return formatEnvFile(data);
  },
  
  /**
   * Validate file content (optional, can be used for format-specific validation)
   * @param {string} content - File content to validate
   * @returns {boolean} - True if content is valid
   */
  validate(content) {
    // Basic validation - check if it's a valid properties file
    // Can be enhanced with more specific validation
    try {
      parseEnvFile(content);
      return true;
    } catch (error) {
      return false;
    }
  }
};

module.exports = propertiesHandler;

