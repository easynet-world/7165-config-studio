/**
 * .env file parsing utilities
 */

/**
 * Clean section name by removing common words like "Settings", "Config", etc.
 * @param {string} name - Section name to clean
 * @returns {string} - Cleaned section name
 */
function cleanSectionName(name) {
  if (!name) return name;
  
  // Words to remove (case-insensitive)
  const wordsToRemove = [
    'settings', 'setting',
    'config', 'configs', 'configuration', 'configurations',
    'options', 'option',
    'preferences', 'preference'
  ];
  
  // Split by spaces and filter out the words to remove
  const parts = name.split(/\s+/);
  const cleaned = parts.filter(part => {
    const lowerPart = part.toLowerCase();
    return !wordsToRemove.some(word => lowerPart === word);
  });
  
  // Join back and trim, preserving emojis and other characters
  return cleaned.join(' ').trim() || name; // Fallback to original if all words removed
}

/**
 * Parse validation rules from comment
 * Format: # Description (required, min:1, max:100, type:number, pattern:^[a-z]+$)
 * @param {string} comment - Comment string containing rules
 * @returns {Object} - Parsed rules object
 */
function parseRules(comment) {
  if (!comment) return {};
  
  const rules = {};
  const rulePattern = /\(([^)]+)\)/;
  const match = comment.match(rulePattern);
  
  if (match) {
    const ruleString = match[1];
    const parts = ruleString.split(',').map(s => s.trim());
    
    parts.forEach(part => {
      if (part === 'required') {
        rules.required = true;
      } else if (part.startsWith('min:')) {
        rules.min = parseFloat(part.split(':')[1]);
      } else if (part.startsWith('max:')) {
        rules.max = parseFloat(part.split(':')[1]);
      } else if (part.startsWith('type:')) {
        rules.type = part.split(':')[1].trim();
      } else if (part.startsWith('pattern:')) {
        rules.pattern = part.split(':')[1].trim();
      } else if (part.startsWith('enum:')) {
        rules.enum = part.split(':')[1].split('|').map(s => s.trim());
      }
    });
  }
  
  return rules;
}

/**
 * Extract clean comment text (without rules)
 * @param {string} comment - Comment string
 * @returns {string} - Clean comment text without rules
 */
function extractCommentText(comment) {
  if (!comment) return '';
  // Remove rules in parentheses
  return comment.replace(/\s*\([^)]+\)\s*$/, '').trim();
}

/**
 * Parse .env file and organize by sections (tabs) - split by empty lines
 * @param {string} content - .env file content
 * @returns {Object} - Object with sections and sectionOrder
 */
function parseEnvFile(content) {
  const sections = {};
  const sectionOrder = []; // Preserve order of sections as they appear in .env
  
  // Split content by empty lines (one or more consecutive empty lines)
  const blocks = content.split(/\n\s*\n/).filter(block => block.trim().length > 0);
  
  blocks.forEach((block, blockIndex) => {
    const lines = block.split('\n');
    let sectionName = null;
    let sectionComment = null;
    const items = [];
    let currentComment = '';

    // Check if first line is a comment (section header)
    // If not, skip this entire block (don't create a section)
    const firstLine = lines[0] ? lines[0].trim() : '';
    if (!firstLine.startsWith('#')) {
      // No section header comment - skip this block entirely
      return;
    }

    lines.forEach((line, lineIndex) => {
      const trimmed = line.trim();
      
      // First line of section is always the section name (tab name)
      if (lineIndex === 0 && trimmed.startsWith('#')) {
        // Extract the full comment text after the # (preserving emojis and all characters)
        const rawSectionName = trimmed.replace(/^#\s*/, '').trim();
        // Clean the section name by removing common words like "Settings", "Config", etc.
        sectionName = cleanSectionName(rawSectionName);
        sectionComment = rawSectionName; // Keep original for saving back
        // Only use this as section name if it's not empty
        if (sectionName) {
          return; // Skip processing this line, it's the section header
        }
      }

      // Check for key-value pairs
      // Support both .env format (UPPERCASE_WITH_UNDERSCORES) and .properties format (lowercase.with.dots)
      // Pattern: key=value or key = value
      // Key can be: uppercase with underscores, lowercase with dots, or mixed
      const keyValueMatch = trimmed.match(/^([a-zA-Z0-9_.-]+)\s*=\s*(.*)$/);
      if (keyValueMatch) {
        const key = keyValueMatch[1];
        const value = keyValueMatch[2].replace(/^["']|["']$/g, ''); // Remove quotes
        
        // Extract comment from previous line (starting from second line, comments are field comments)
        let comment = currentComment;
        if (lineIndex > 0 && lines[lineIndex - 1].trim().startsWith('#')) {
          const prevLine = lines[lineIndex - 1].trim();
          // If previous line is a comment and it's not the first line (section header), it's a field comment
          if (lineIndex > 1 || (lineIndex === 1 && !prevLine.match(/^#\s*[A-Z]/))) {
            comment = prevLine.replace(/^#\s*/, '');
          }
        }

        // Parse rules from comment if present
        const rules = parseRules(comment || '');
        const cleanComment = extractCommentText(comment || '');

        items.push({
          key,
          value,
          comment: cleanComment,
          rules: rules,
          originalLine: line
        });
        
        currentComment = '';
      } else if (trimmed.startsWith('#') && trimmed.length > 1) {
        // Store comment for next key-value pair
        // Comments starting from second line are field comments
        if (lineIndex > 0) {
          currentComment = trimmed.replace(/^#\s*/, '');
        }
      }
    });

    // Only create section if we have a section name from the first line comment
    // If no section name was set from the first line, skip this block entirely
    if (!sectionName) {
      return; // No section header comment - don't create a section
    }

    // Only add section if it has items (filter out empty sections)
    if (items.length > 0) {
      // If section already exists (same name), merge items
      if (sections[sectionName]) {
        sections[sectionName] = sections[sectionName].concat(items);
      } else {
        sections[sectionName] = items;
        // Track order of sections as they appear
        sectionOrder.push(sectionName);
      }
    }
  });

  // Filter out any empty sections from sectionOrder
  const filteredSectionOrder = sectionOrder.filter(sectionName => 
    sections[sectionName] && sections[sectionName].length > 0
  );

  return { sections, sectionOrder: filteredSectionOrder };
}

module.exports = {
  parseEnvFile,
  cleanSectionName,
  parseRules,
  extractCommentText
};

