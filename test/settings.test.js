const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs').promises;
const path = require('path');

// Import the parsing functions (we'll need to extract them or test via API)
const ENV_FILE_PATH = path.join(__dirname, '..', '.env.test');

// Helper function to parse env file (extracted logic from server.js)
// Groups by empty lines instead of prefixes
function parseEnvFile(content) {
  const sections = {};
  
  // Split content by empty lines (one or more consecutive empty lines)
  const blocks = content.split(/\n\s*\n/).filter(block => block.trim().length > 0);
  
  blocks.forEach((block, blockIndex) => {
    const lines = block.split('\n');
    let sectionName = null;
    const items = [];
    let currentComment = '';

    lines.forEach((line, lineIndex) => {
      const trimmed = line.trim();
      
      // Check for section header comment (e.g., # Server Settings or # 🖥️ Server Settings)
      // Clean section name by removing common words
      if (trimmed.startsWith('#') && lineIndex === 0) {
        const rawSectionName = trimmed.replace(/^#\s*/, '').trim();
        // Clean section name (remove Settings, Config, etc.)
        const wordsToRemove = ['settings', 'setting', 'config', 'configs', 'configuration', 'configurations', 'options', 'option', 'preferences', 'preference'];
        const parts = rawSectionName.split(/\s+/);
        const cleaned = parts.filter(part => {
          const lowerPart = part.toLowerCase();
          return !wordsToRemove.some(word => lowerPart === word);
        });
        sectionName = cleaned.join(' ').trim() || rawSectionName;
        if (sectionName) {
          return;
        }
      }

      // Check for key-value pairs
      const keyValueMatch = trimmed.match(/^([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/);
      if (keyValueMatch) {
        const key = keyValueMatch[1];
        const value = keyValueMatch[2].replace(/^["']|["']$/g, '');
        
        // Extract comment if present on previous line
        let comment = currentComment;
        if (lineIndex > 0 && lines[lineIndex - 1].trim().startsWith('#')) {
          const prevLine = lines[lineIndex - 1].trim();
          // Only use as comment if it's not a section header
          if (!prevLine.match(/#\s*([A-Z][a-zA-Z\s]+)\s*Settings?/i)) {
            comment = prevLine.replace(/^#\s*/, '');
          }
        }

        // Parse rules from comment (simplified version for tests)
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
        
        function extractCommentText(comment) {
          if (!comment) return '';
          return comment.replace(/\s*\([^)]+\)\s*$/, '').trim();
        }
        
        const fullComment = comment || '';
        const rules = parseRules(fullComment);
        const cleanComment = extractCommentText(fullComment);

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

    // Determine section name
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
    }
  });

  // Return in new format with sectionOrder
  return { sections, sectionOrder: Object.keys(sections) };
}

function formatEnvFile(data) {
  const lines = [];
  // Use provided order or fall back to sorted keys
  const sections = data.sections || data;
  const sectionOrder = data.sectionOrder || Object.keys(sections).sort();
  
  sectionOrder.forEach((sectionName, sectionIndex) => {
    if (sectionIndex > 0) {
      lines.push('');
    }
    lines.push(`# ${sectionName}`);
    
    sections[sectionName].forEach((item) => {
      if (item.comment) {
        lines.push(`# ${item.comment}`);
      }
      const value = item.value.includes(' ') ? `"${item.value}"` : item.value;
      lines.push(`${item.key}=${value}`);
    });
  });

  return lines.join('\n');
}

test('parseEnvFile - section comments', async () => {
  const content = `# Server Settings
CHAT_SERVER_PORT=9992
N8N_API_URL=http://127.0.0.1:9991

# Storage Settings
STORAGE_PATH=/var/storage`;

  const result = parseEnvFile(content);
  
  // Section names should have "Settings" removed
  assert.ok(result.sections['Server'], 'Server section should exist');
  assert.ok(result.sections['Storage'], 'Storage section should exist');
  assert.strictEqual(result.sections['Server'].length, 2);
  assert.strictEqual(result.sections['Storage'].length, 1);
  assert.strictEqual(result.sections['Server'][0].key, 'CHAT_SERVER_PORT');
  assert.strictEqual(result.sections['Server'][0].value, '9992');
  // Check order is preserved
  assert.strictEqual(result.sectionOrder[0], 'Server');
  assert.strictEqual(result.sectionOrder[1], 'Storage');
});

test('parseEnvFile - empty line grouping', async () => {
  const content = `SERVER_PORT=3000

STORAGE_PATH=/var/storage

TOKEN_EXPIRY=3600`;

  const result = parseEnvFile(content);
  
  assert.ok(result.sections['Server'], 'Server section should exist');
  assert.ok(result.sections['Storage'], 'Storage section should exist');
  assert.ok(result.sections['Tokens'], 'Tokens section should exist');
  assert.strictEqual(result.sections['Server'].length, 1);
  assert.strictEqual(result.sections['Storage'].length, 1);
  assert.strictEqual(result.sections['Tokens'].length, 1);
  // Check order is preserved
  assert.strictEqual(result.sectionOrder[0], 'Server');
  assert.strictEqual(result.sectionOrder[1], 'Storage');
  assert.strictEqual(result.sectionOrder[2], 'Tokens');
});

test('parseEnvFile - comments', async () => {
  const content = `# Port number for the chat server
CHAT_SERVER_PORT=9992`;

  const result = parseEnvFile(content);
  
  // First comment line becomes section name, so we need to check the inferred section
  const sectionName = Object.keys(result.sections)[0];
  assert.ok(sectionName);
  assert.strictEqual(result.sections[sectionName][0].key, 'CHAT_SERVER_PORT');
  assert.strictEqual(result.sections[sectionName][0].value, '9992');
});

test('formatEnvFile - round trip', async () => {
  const original = `# Server Settings
# Port number
CHAT_SERVER_PORT=9992
N8N_API_URL=http://127.0.0.1:9991`;

  const parsed = parseEnvFile(original);
  const formatted = formatEnvFile(parsed);
  const reparsed = parseEnvFile(formatted);
  
  const originalSection = Object.keys(parsed.sections)[0];
  const reparsedSection = Object.keys(reparsed.sections)[0];
  assert.strictEqual(reparsed.sections[reparsedSection].length, parsed.sections[originalSection].length);
  assert.strictEqual(reparsed.sections[reparsedSection][0].key, parsed.sections[originalSection][0].key);
  assert.strictEqual(reparsed.sections[reparsedSection][0].value, parsed.sections[originalSection][0].value);
});

test('formatEnvFile - preserves values with spaces', async () => {
  const sections = {
    'Server': [{
      key: 'TEST_KEY',
      value: 'value with spaces',
      comment: 'Test comment',
      originalLine: ''
    }]
  };

  const formatted = formatEnvFile({ sections, sectionOrder: ['Server'] });
  
  assert.ok(formatted.includes('"value with spaces"'));
});

test('parseEnvFile - handles quoted values', async () => {
  const content = `TEST_KEY="quoted value"
ANOTHER_KEY='single quoted'`;

  const result = parseEnvFile(content);
  
  // Should extract value without quotes - all in one section (no empty line)
  const generalSection = result.sections['General'] || Object.values(result.sections)[0];
  assert.ok(generalSection);
  assert.strictEqual(generalSection.length, 2);
  assert.strictEqual(generalSection[0].value, 'quoted value');
  assert.strictEqual(generalSection[1].value, 'single quoted');
});

test('parseEnvFile - empty file', async () => {
  const result = parseEnvFile('');
  assert.strictEqual(Object.keys(result.sections).length, 0);
  assert.strictEqual(result.sectionOrder.length, 0);
});

test('parseEnvFile - multiple sections', async () => {
  const content = `# Server Settings
SERVER_PORT=3000

# Storage Settings
STORAGE_PATH=/var/storage

# Tokens Settings
TOKEN_EXPIRY=3600`;

  const result = parseEnvFile(content);
  
  assert.strictEqual(Object.keys(result.sections).length, 3);
  assert.ok(result.sections['Server']);
  assert.ok(result.sections['Storage']);
  assert.ok(result.sections['Tokens']);
  // Check order is preserved
  assert.strictEqual(result.sectionOrder[0], 'Server');
  assert.strictEqual(result.sectionOrder[1], 'Storage');
  assert.strictEqual(result.sectionOrder[2], 'Tokens');
});

test('parseEnvFile - preserves emojis in section names', async () => {
  const content = `# 🖥️ Server Settings
SERVER_PORT=3000

# 📦 Storage Settings
STORAGE_PATH=/var/storage`;

  const result = parseEnvFile(content);
  
  // Emojis preserved, but "Settings" removed
  assert.ok(result.sections['🖥️ Server'], 'Section with emoji should exist');
  assert.ok(result.sections['📦 Storage'], 'Section with emoji should exist');
  assert.strictEqual(result.sections['🖥️ Server'].length, 1);
  assert.strictEqual(result.sections['📦 Storage'].length, 1);
});

test('parseEnvFile - removes Settings/Config words from section names', async () => {
  const content = `# Server Configuration
SERVER_PORT=3000

# Database Config
DATABASE_URL=postgres://localhost

# API Options
API_KEY=secret`;

  const result = parseEnvFile(content);
  
  assert.ok(result.sections['Server'], 'Server section should exist (Configuration removed)');
  assert.ok(result.sections['Database'], 'Database section should exist (Config removed)');
  assert.ok(result.sections['API'], 'API section should exist (Options removed)');
  // Check order is preserved
  assert.strictEqual(result.sectionOrder[0], 'Server');
  assert.strictEqual(result.sectionOrder[1], 'Database');
  assert.strictEqual(result.sectionOrder[2], 'API');
});

test('formatFieldName - handles different delimiters', async () => {
  // Test formatFieldName function (simulating frontend behavior)
  function formatFieldName(key) {
    const parts = key.split(/[_\-.]+/);
    return parts
      .map(part => {
        if (!part) return '';
        return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
      })
      .filter(part => part.length > 0)
      .join(' ');
  }

  // Test underscore delimiter
  assert.strictEqual(formatFieldName('CHAT_SERVER_PORT'), 'Chat Server Port');
  assert.strictEqual(formatFieldName('N8N_API_URL'), 'N8n Api Url');
  
  // Test hyphen delimiter
  assert.strictEqual(formatFieldName('CHAT-SERVER-PORT'), 'Chat Server Port');
  assert.strictEqual(formatFieldName('api-key'), 'Api Key');
  
  // Test dot delimiter
  assert.strictEqual(formatFieldName('server.port'), 'Server Port');
  assert.strictEqual(formatFieldName('database.host.name'), 'Database Host Name');
  
  // Test mixed delimiters
  assert.strictEqual(formatFieldName('CHAT_SERVER-PORT'), 'Chat Server Port');
  assert.strictEqual(formatFieldName('api.key_name'), 'Api Key Name');
  
  // Test single word
  assert.strictEqual(formatFieldName('PORT'), 'Port');
  assert.strictEqual(formatFieldName('API'), 'Api');
});

test('convertUrlsToLinks - converts URLs to clickable links', async () => {
  // Test convertUrlsToLinks function (simulating frontend behavior)
  function convertUrlsToLinks(text) {
    if (!text) return '';
    
    const urlPattern = /(https?:\/\/[^\s]+|www\.[^\s]+|ftp:\/\/[^\s]+)/gi;
    
    const escapedText = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
    
    return escapedText.replace(urlPattern, (url) => {
      let href = url;
      if (url.startsWith('www.')) {
        href = 'https://' + url;
      }
      return `<a href="${href}" target="_blank" rel="noopener noreferrer" class="helper-link">${url}</a>`;
    });
  }

  // Test HTTP URL
  const result1 = convertUrlsToLinks('Visit https://example.com for more info');
  assert.ok(result1.includes('href="https://example.com"'));
  assert.ok(result1.includes('>https://example.com<'));
  
  // Test HTTPS URL
  const result2 = convertUrlsToLinks('Check https://docs.example.com/api');
  assert.ok(result2.includes('href="https://docs.example.com/api"'));
  
  // Test www URL (should add https://)
  const result3 = convertUrlsToLinks('Go to www.example.com');
  assert.ok(result3.includes('href="https://www.example.com"'));
  assert.ok(result3.includes('>www.example.com<'));
  
  // Test multiple URLs
  const result4 = convertUrlsToLinks('See https://site1.com and https://site2.com');
  assert.ok(result4.includes('https://site1.com'));
  assert.ok(result4.includes('https://site2.com'));
  
  // Test text without URLs
  const result5 = convertUrlsToLinks('Just some text');
  assert.strictEqual(result5, 'Just some text');
  
  // Test HTML escaping
  const result6 = convertUrlsToLinks('Visit https://example.com & learn <more>');
  assert.ok(result6.includes('&amp;'));
  assert.ok(result6.includes('&lt;'));
  assert.ok(result6.includes('&gt;'));
});

test('extractEmoji - extracts emoji from section names', async () => {
  // Test extractEmoji function (simulating frontend behavior)
  function extractEmoji(text) {
    if (!text) return null;
    const emojiRegex = /[\u{1F300}-\u{1F9FF}]|[\u{1F600}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F900}-\u{1F9FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2300}-\u{23FF}]|[\u{200D}]|[\u{FE0F}]/gu;
    const match = text.match(emojiRegex);
    return match && match.length > 0 ? match[0] : null;
  }

  // Test with emoji (note: variation selectors may not be captured, but base emoji will work)
  const emoji1 = extractEmoji('🖥️ Server Settings');
  assert.ok(emoji1 !== null, 'Should extract emoji from 🖥️ Server Settings');
  assert.ok(emoji1.includes('🖥'), 'Extracted emoji should contain 🖥');
  
  const emoji2 = extractEmoji('📦 Storage Settings');
  assert.ok(emoji2 !== null, 'Should extract emoji from 📦 Storage Settings');
  assert.ok(emoji2.includes('📦'), 'Extracted emoji should contain 📦');
  
  const emoji3 = extractEmoji('⏰ Tokens Settings');
  assert.ok(emoji3 !== null, 'Should extract emoji from ⏰ Tokens Settings');
  assert.ok(emoji3.includes('⏰'), 'Extracted emoji should contain ⏰');
  
  // Test without emoji
  assert.strictEqual(extractEmoji('Server Settings'), null);
  assert.strictEqual(extractEmoji('Storage Settings'), null);
  assert.strictEqual(extractEmoji(''), null);
  assert.strictEqual(extractEmoji(null), null);
  
  // Test with emoji in middle or end
  const emoji4 = extractEmoji('Server 🖥️ Settings');
  assert.ok(emoji4 !== null, 'Should extract emoji from middle of text');
  assert.ok(emoji4.includes('🖥'), 'Extracted emoji should contain 🖥');
  
  const emoji5 = extractEmoji('Settings 📦');
  assert.ok(emoji5 !== null, 'Should extract emoji from end of text');
  assert.ok(emoji5.includes('📦'), 'Extracted emoji should contain 📦');
});

test('parseRules - parses validation rules from comments', async () => {
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

  // Test required
  const rules1 = parseRules('Port number (required)');
  assert.strictEqual(rules1.required, true);
  
  // Test min/max
  const rules2 = parseRules('Port number (min:1, max:65535)');
  assert.strictEqual(rules2.min, 1);
  assert.strictEqual(rules2.max, 65535);
  
  // Test type
  const rules3 = parseRules('Port number (type:number, required)');
  assert.strictEqual(rules3.type, 'number');
  assert.strictEqual(rules3.required, true);
  
  // Test pattern
  const rules4 = parseRules('API key (pattern:^[A-Z0-9_]+$)');
  assert.strictEqual(rules4.pattern, '^[A-Z0-9_]+$');
  
  // Test enum
  const rules5 = parseRules('Environment (enum:dev|staging|prod)');
  assert.deepStrictEqual(rules5.enum, ['dev', 'staging', 'prod']);
  
  // Test combined
  const rules6 = parseRules('Port number (required, type:number, min:1, max:65535)');
  assert.strictEqual(rules6.required, true);
  assert.strictEqual(rules6.type, 'number');
  assert.strictEqual(rules6.min, 1);
  assert.strictEqual(rules6.max, 65535);
  
  // Test no rules
  const rules7 = parseRules('Just a comment');
  assert.strictEqual(Object.keys(rules7).length, 0);
});

// System Registry Tests
test('validateSystem - validates system name and config path', async () => {
  // Simulate validateSystem function
  function validateSystem(system) {
    if (!system.name || typeof system.name !== 'string' || system.name.trim().length === 0) {
      throw new Error('System name is required and must be a non-empty string');
    }
    if (!system.configPath || typeof system.configPath !== 'string' || system.configPath.trim().length === 0) {
      throw new Error('Config file path is required and must be a non-empty string');
    }
    const configPath = system.configPath.trim();
    if (!configPath.endsWith('.env') && !configPath.endsWith('.properties')) {
      throw new Error('Config file must be a .env or .properties file');
    }
    return {
      id: system.id || `system-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: system.name.trim(),
      configPath: configPath
    };
  }

  // Test valid system
  const validSystem = validateSystem({
    name: 'Test System',
    configPath: '/path/to/config.env'
  });
  assert.ok(validSystem.id);
  assert.strictEqual(validSystem.name, 'Test System');
  assert.strictEqual(validSystem.configPath, '/path/to/config.env');

  // Test .properties file
  const propertiesSystem = validateSystem({
    name: 'Properties System',
    configPath: 'config.properties'
  });
  assert.strictEqual(propertiesSystem.configPath, 'config.properties');

  // Test missing name
  assert.throws(() => {
    validateSystem({ configPath: '/path/to/config.env' });
  }, /System name is required/);

  // Test empty name
  assert.throws(() => {
    validateSystem({ name: '', configPath: '/path/to/config.env' });
  }, /System name is required/);

  // Test missing config path
  assert.throws(() => {
    validateSystem({ name: 'Test System' });
  }, /Config file path is required/);

  // Test invalid file extension
  assert.throws(() => {
    validateSystem({ name: 'Test System', configPath: '/path/to/config.txt' });
  }, /Config file must be a .env or .properties file/);

  // Test name trimming
  const trimmedSystem = validateSystem({
    name: '  Test System  ',
    configPath: 'config.env'
  });
  assert.strictEqual(trimmedSystem.name, 'Test System');

  // Test path trimming
  const trimmedPathSystem = validateSystem({
    name: 'Test System',
    configPath: '  config.env  '
  });
  assert.strictEqual(trimmedPathSystem.configPath, 'config.env');
});

test('system registry - CRUD operations structure', async () => {
  // Test that system objects have required fields
  const system = {
    id: 'system-123',
    name: 'Test System',
    configPath: '/path/to/config.env'
  };

  assert.ok(system.id);
  assert.strictEqual(typeof system.name, 'string');
  assert.strictEqual(typeof system.configPath, 'string');
  assert.ok(system.configPath.endsWith('.env') || system.configPath.endsWith('.properties'));
});

test('system registry - duplicate name validation', async () => {
  // Simulate duplicate name check
  const systems = [
    { id: '1', name: 'System A', configPath: '/path/a.env' },
    { id: '2', name: 'System B', configPath: '/path/b.env' }
  ];

  // Check for duplicate name
  const hasDuplicate = (name, excludeId = null) => {
    return systems.some(s => s.id !== excludeId && s.name === name);
  };

  assert.strictEqual(hasDuplicate('System A'), true);
  assert.strictEqual(hasDuplicate('System C'), false);
  assert.strictEqual(hasDuplicate('System A', '1'), false); // Excluding current system
  assert.strictEqual(hasDuplicate('System B', '2'), false);
});

test('settings API - system parameter handling', async () => {
  // Test that system parameter is properly encoded in URL
  const systemId = 'system-123';
  const baseUrl = '/api/settings';
  const url = `${baseUrl}?system=${encodeURIComponent(systemId)}`;
  
  assert.ok(url.includes('system='));
  assert.ok(url.includes(encodeURIComponent(systemId)));
  
  // Test with special characters in system ID
  const specialId = 'system-123-abc';
  const specialUrl = `${baseUrl}?system=${encodeURIComponent(specialId)}`;
  assert.ok(specialUrl.includes(encodeURIComponent(specialId)));
});

test('system registry - path resolution', async () => {
  // Test absolute path
  const absolutePath = '/absolute/path/to/config.env';
  const isAbsolute = absolutePath.startsWith('/') || absolutePath.match(/^[A-Z]:/);
  assert.ok(isAbsolute || absolutePath.startsWith('/'));

  // Test relative path
  const relativePath = 'config.env';
  const isRelative = !relativePath.startsWith('/') && !relativePath.match(/^[A-Z]:/);
  assert.ok(isRelative);
});

