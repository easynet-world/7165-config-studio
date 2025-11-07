# Configuration Format Handlers

This directory contains format handlers for different configuration file types. Currently, only properties-based formats (`.env`, `.properties`) are supported, but the architecture is designed to easily support additional formats in the future.

## Current Format Handlers

### Properties Handler (`properties.js`)
- **Supported extensions**: `.env`, `.properties`
- **Format**: Key-value pairs with comments
- **Features**: Section organization, validation rules, comments

## Adding New Format Handlers

To add support for a new configuration format (e.g., YAML, XML, JSON):

### 1. Create a Format Handler

Create a new file in this directory (e.g., `yaml.js`):

```javascript
/**
 * YAML format handler
 */
const yaml = require('js-yaml'); // or your YAML parser

const yamlHandler = {
  name: 'YAML',
  extensions: ['.yaml', '.yml'],
  
  parse(content) {
    // Parse YAML content and return { sections, sectionOrder }
    // Convert YAML structure to the standard format
    const data = yaml.load(content);
    // Transform to sections format
    return { sections: {...}, sectionOrder: [...] };
  },
  
  format(data) {
    // Convert { sections, sectionOrder } back to YAML format
    // Transform sections back to YAML structure
    return yaml.dump(transformedData);
  },
  
  validate(content) {
    try {
      yaml.load(content);
      return true;
    } catch (error) {
      return false;
    }
  }
};

module.exports = yamlHandler;
```

### 2. Register the Handler

Add the handler to `index.js`:

```javascript
const yamlHandler = require('./yaml');

const FORMAT_REGISTRY = {
  '.env': propertiesHandler,
  '.properties': propertiesHandler,
  '.yaml': yamlHandler,  // Add here
  '.yml': yamlHandler,   // Add here
};
```

### 3. Format Handler Interface

Each format handler must implement:

- **`name`** (string): Display name of the format
- **`extensions`** (array): Supported file extensions
- **`parse(content)`** (function): Parse file content and return `{ sections, sectionOrder }`
- **`format(data)`** (function): Convert `{ sections, sectionOrder }` back to file content
- **`validate(content)`** (function, optional): Validate file content format

### 4. Data Structure

All format handlers must work with the standard data structure:

```javascript
{
  sections: {
    'Section Name': [
      {
        key: 'KEY_NAME',
        value: 'value',
        comment: 'Description',
        rules: { required: true, type: 'number' }
      }
    ]
  },
  sectionOrder: ['Section Name', 'Another Section']
}
```

## Future Format Support

Planned formats for future implementation:
- **YAML** (`.yaml`, `.yml`) - Common in modern applications
- **XML** (`.xml`) - Legacy and enterprise systems
- **JSON** (`.json`) - Common configuration format
- **TOML** (`.toml`) - Growing in popularity
- **INI** (`.ini`) - Windows-style configuration

## Notes

- Format handlers are automatically detected based on file extension
- Validation happens at registration time and when loading files
- All paths are normalized to absolute paths
- Format-specific parsing/formatting is isolated in handler modules

