/**
 * .env file formatting utilities
 */

/**
 * Convert sections back to .env file format (separated by empty lines)
 * @param {Object} data - Object with sections and sectionOrder
 * @returns {string} - Formatted .env file content
 */
function formatEnvFile(data) {
  const lines = [];
  
  // Use provided order or fall back to sorted keys
  const sections = data.sections || data;
  const sectionOrder = data.sectionOrder || Object.keys(sections).sort();
  
  sectionOrder.forEach((sectionName, sectionIndex) => {
    if (sectionIndex > 0) {
      lines.push(''); // Empty line between sections
    }
    
    // Add section header - use the cleaned section name (without Settings/Config words)
    // We don't add "Settings" suffix anymore to keep it clean
    lines.push(`# ${sectionName}`);
    
    sections[sectionName].forEach((item) => {
      // Add comment if present, including rules
      if (item.comment || (item.rules && Object.keys(item.rules).length > 0)) {
        let commentLine = item.comment || '';
        
        // Reconstruct rules string if rules exist
        if (item.rules && Object.keys(item.rules).length > 0) {
          const ruleParts = [];
          if (item.rules.required) ruleParts.push('required');
          if (item.rules.min !== undefined) ruleParts.push(`min:${item.rules.min}`);
          if (item.rules.max !== undefined) ruleParts.push(`max:${item.rules.max}`);
          if (item.rules.type) ruleParts.push(`type:${item.rules.type}`);
          if (item.rules.pattern) ruleParts.push(`pattern:${item.rules.pattern}`);
          if (item.rules.enum) ruleParts.push(`enum:${item.rules.enum.join('|')}`);
          
          if (ruleParts.length > 0) {
            commentLine = commentLine ? `${commentLine} (${ruleParts.join(', ')})` : `(${ruleParts.join(', ')})`;
          }
        }
        
        lines.push(`# ${commentLine}`);
      }
      
      // Add key-value pair
      const value = item.value.includes(' ') ? `"${item.value}"` : item.value;
      lines.push(`${item.key}=${value}`);
    });
  });

  return lines.join('\n');
}

module.exports = { formatEnvFile };

