#!/usr/bin/env node

const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const cors = require('cors');

const app = express();

// Get port from command-line argument, environment variable, or default to 8880
// Priority: command-line arg > DOTENV_UI_PORT > DOTENV_UI_SETTINGS > PORT > 8880
const getPort = () => {
  // Check command-line arguments (e.g., node server.js --port 8080)
  const portArgIndex = process.argv.indexOf('--port');
  if (portArgIndex !== -1 && process.argv[portArgIndex + 1]) {
    const port = parseInt(process.argv[portArgIndex + 1], 10);
    if (!isNaN(port) && port > 0 && port <= 65535) {
      return port;
    }
  }
  
  // Check for DOTENV_UI_PORT environment variable (preferred for port)
  if (process.env.DOTENV_UI_PORT) {
    const port = parseInt(process.env.DOTENV_UI_PORT, 10);
    if (!isNaN(port) && port > 0 && port <= 65535) {
      return port;
    }
  }
  
  // Check for DOTENV_UI_SETTINGS (can be a JSON object or just port number)
  if (process.env.DOTENV_UI_SETTINGS) {
    try {
      // Try parsing as JSON first
      const settings = JSON.parse(process.env.DOTENV_UI_SETTINGS);
      if (settings.port) {
        const port = parseInt(settings.port, 10);
        if (!isNaN(port) && port > 0 && port <= 65535) {
          return port;
        }
      }
    } catch (e) {
      // If not JSON, try parsing as a port number directly
      const port = parseInt(process.env.DOTENV_UI_SETTINGS, 10);
      if (!isNaN(port) && port > 0 && port <= 65535) {
        return port;
      }
    }
  }
  
  // Fall back to PORT environment variable
  if (process.env.PORT) {
    const port = parseInt(process.env.PORT, 10);
    if (!isNaN(port) && port > 0 && port <= 65535) {
      return port;
    }
  }
  
  // Default port
  return 8880;
};

const PORT = getPort();
const ENV_FILE_PATH = path.join(__dirname, '.env');

app.use(cors());
app.use(express.json());

// Serve static files with no-cache headers
app.use(express.static('public', {
  setHeaders: (res, path) => {
    if (path.endsWith('.html') || path.endsWith('.js') || path.endsWith('.css')) {
      res.set({
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      });
    }
  }
}));

// Clean section name by removing common words like "Settings", "Config", etc.
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

// Parse .env file and organize by sections (tabs) - split by empty lines
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

    lines.forEach((line, lineIndex) => {
      const trimmed = line.trim();
      
      // Check for section header comment (e.g., # Server Settings or # 🖥️ Server Settings)
      // Use the full comment text (including emojis) as the section name
      if (trimmed.startsWith('#') && lineIndex === 0) {
        // Extract the full comment text after the # (preserving emojis and all characters)
        const rawSectionName = trimmed.replace(/^#\s*/, '').trim();
        // Clean the section name by removing common words like "Settings", "Config", etc.
        sectionName = cleanSectionName(rawSectionName);
        sectionComment = rawSectionName; // Keep original for saving back
        // Only use this as section name if it's not empty
        if (sectionName) {
          return;
        }
      }

      // Check for key-value pairs
      const keyValueMatch = trimmed.match(/^([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/);
      if (keyValueMatch) {
        const key = keyValueMatch[1];
        const value = keyValueMatch[2].replace(/^["']|["']$/g, ''); // Remove quotes
        
        // Extract comment if present on previous line
        let comment = currentComment;
        if (lineIndex > 0 && lines[lineIndex - 1].trim().startsWith('#')) {
          const prevLine = lines[lineIndex - 1].trim();
          // Only use as comment if it's not a section header
          if (!prevLine.match(/#\s*([A-Z][a-zA-Z\s]+)\s*Settings?/i)) {
            comment = prevLine.replace(/^#\s*/, '');
          }
        }

        // Only use comments from .env file (no default comments)
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
        // Store comment for next key-value pair (if not a section header)
        if (lineIndex > 0 || !trimmed.match(/#\s*([A-Z][a-zA-Z\s]+)\s*Settings?/i)) {
          currentComment = trimmed.replace(/^#\s*/, '');
        }
      }
    });

    // Determine section name if not set from comment
    if (!sectionName && items.length > 0) {
      // Try to infer from first key's prefix
      const firstKey = items[0].key;
      const prefix = firstKey.split('_')[0];
      const prefixMap = {
        'SERVER': 'Server',
        'CHAT': 'Server',
        'STORAGE': 'Storage',
        'TOKEN': 'Tokens',
        'TOKENS': 'Tokens',
        'SUMMARIZER': 'Summarizer',
        'WORKFLOW': 'Workflow',
        'DATABASE': 'Database',
        'API': 'API',
        'N8N': 'Server'
      };
      sectionName = prefixMap[prefix] || 'General';
    } else if (!sectionName) {
      sectionName = 'General';
    }

    // If section already exists (same name), merge items
    if (sections[sectionName]) {
      sections[sectionName] = sections[sectionName].concat(items);
    } else {
      sections[sectionName] = items;
      // Track order of sections as they appear
      sectionOrder.push(sectionName);
    }
  });

  return { sections, sectionOrder };
}

// Parse validation rules from comment
// Format: # Description (required, min:1, max:100, type:number, pattern:^[a-z]+$)
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

// Extract clean comment text (without rules)
function extractCommentText(comment) {
  if (!comment) return '';
  // Remove rules in parentheses
  return comment.replace(/\s*\([^)]+\)\s*$/, '').trim();
}

// Note: Default comments have been removed to ensure all fields are dynamically generated from .env file
// Only comments explicitly written in the .env file will be used

// Convert sections back to .env file format (separated by empty lines)
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

// GET /api/settings - Get all settings organized by sections
// Always reads fresh from .env file (no caching)
app.get('/api/settings', async (req, res) => {
  try {
    // Set headers to prevent caching
    res.set({
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });
    
    // Always read fresh from file system
    const content = await fs.readFile(ENV_FILE_PATH, 'utf-8');
    const { sections, sectionOrder } = parseEnvFile(content);
    // Return sections with order information
    res.json({ sections, sectionOrder });
  } catch (error) {
    if (error.code === 'ENOENT') {
      // .env file doesn't exist, return empty structure
      res.set({
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      });
      res.json({ sections: {}, sectionOrder: [] });
    } else {
      console.error('Error reading .env file:', error);
      res.status(500).json({ error: 'Failed to read settings' });
    }
  }
});

// POST /api/settings - Save settings
app.post('/api/settings', async (req, res) => {
  try {
    const data = req.body;
    const content = formatEnvFile(data);
    
    // Create backup before writing
    try {
      const existingContent = await fs.readFile(ENV_FILE_PATH, 'utf-8');
      await fs.writeFile(`${ENV_FILE_PATH}.backup`, existingContent);
    } catch (e) {
      // Backup failed, but continue
    }
    
    await fs.writeFile(ENV_FILE_PATH, content, 'utf-8');
    res.json({ success: true, message: 'Settings saved successfully' });
  } catch (error) {
    console.error('Error saving .env file:', error);
    res.status(500).json({ error: 'Failed to save settings' });
  }
});

// Serve the settings page
app.get('/', (req, res) => {
  // Set headers to prevent caching of the HTML page
  res.set({
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  });
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`DotEnv Studio running on http://localhost:${PORT}`);
  console.log(`Make sure you have a .env file in the project root`);
});

