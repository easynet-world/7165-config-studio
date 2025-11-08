/**
 * Startup system registration
 * Allows registering a config file on server startup
 */

const path = require('path');
const fs = require('fs');
const fsPromises = require('fs').promises;
const { loadSystemsRegistry, saveSystemsRegistry } = require('./registry');
const { validateSystem } = require('./validator');
const { isFormatSupported, getSupportedExtensionsString } = require('../settings/formats');

/**
 * Register a system from startup configuration
 * @param {string} registryPath - Path to registry file
 * @param {string} projectRoot - Project root directory
 * @param {string} configPath - Config file path (from env var or command line)
 * @param {string} systemName - System name (optional, defaults to basename of config file)
 * @returns {Promise<boolean>} - True if system was registered, false if already exists
 */
async function registerStartupSystem(registryPath, projectRoot, configPath, systemName = null) {
  if (!configPath) {
    return false;
  }

  try {
    // Generate system name from config file if not provided
    if (!systemName) {
      const basename = path.basename(configPath, path.extname(configPath));
      systemName = basename.charAt(0).toUpperCase() + basename.slice(1).replace(/[-_]/g, ' ');
    }

    // Load existing systems
    const systems = await loadSystemsRegistry(registryPath, projectRoot);
    
    // Normalize config path to absolute
    const absoluteConfigPath = path.isAbsolute(configPath) 
      ? path.normalize(configPath) 
      : path.normalize(path.join(projectRoot, configPath));

    // Check if system with this path already exists (normalized comparison)
    const normalizedNewPath = path.normalize(absoluteConfigPath);
    const existingSystem = systems.find(s => {
      const normalizedExisting = path.normalize(s.configPath);
      return normalizedExisting === normalizedNewPath;
    });
    if (existingSystem) {
      console.log(`System already registered: ${existingSystem.name} (${absoluteConfigPath})`);
      return false;
    }
    
    // Check for duplicate name
    if (systems.some(s => s.name === systemName)) {
      console.log(`System with name "${systemName}" already exists, skipping registration`);
      return false;
    }

    // Validate and create system
    const validatedSystem = await validateSystem(
      { name: systemName, configPath: absoluteConfigPath },
      projectRoot,
      true
    );

    // Add to registry
    systems.push(validatedSystem);
    await saveSystemsRegistry(registryPath, systems);
    
    console.log(`Registered system on startup: ${validatedSystem.name} (${validatedSystem.configPath})`);
    return true;
  } catch (error) {
    console.error('Error registering startup system:', error);
    return false;
  }
}

/**
 * Get startup config from environment variable or command line
 * @returns {Object|null} - Object with configPath and systemName, or null
 */
function getStartupConfig() {
  // Check environment variable first
  // Backward compatibility: also supports DOTENV_UI_* variables
  const envConfigPath = process.env.CONFIG_STUDIO_CONFIG_PATH || process.env.DOTENV_UI_CONFIG_PATH;
  const envSystemName = process.env.CONFIG_STUDIO_SYSTEM_NAME || process.env.DOTENV_UI_SYSTEM_NAME;

  if (envConfigPath) {
    return {
      configPath: envConfigPath,
      systemName: envSystemName || null
    };
  }

  // Check command line arguments
  const configArgIndex = process.argv.indexOf('--config');
  if (configArgIndex !== -1 && process.argv[configArgIndex + 1]) {
    const configPath = process.argv[configArgIndex + 1];
    const nameArgIndex = process.argv.indexOf('--name');
    const systemName = (nameArgIndex !== -1 && process.argv[nameArgIndex + 1]) 
      ? process.argv[nameArgIndex + 1] 
      : null;
    
    return {
      configPath,
      systemName
    };
  }

  return null;
}

/**
 * Register Config Studio itself (.env.config-studio file) as "System Settings" if not already registered
 * System Settings is stored separately from other systems
 * @param {string} systemSettingsPath - Path to system settings file
 * @param {string} projectRoot - Project root directory
 * @param {string} defaultEnvPath - Path to .env.config-studio file
 * @returns {Promise<boolean>} - True if system was registered, false if already exists
 */
async function registerConfigStudio(systemSettingsPath, projectRoot, defaultEnvPath) {
  try {
    const { loadSystemSettings, saveSystemSettings } = require('./registry');
    
    // Load existing System Settings
    const existingSystemSettings = await loadSystemSettings(systemSettingsPath, projectRoot);
    
    // Normalize default env path to absolute
    const absoluteEnvPath = path.isAbsolute(defaultEnvPath) 
      ? path.normalize(defaultEnvPath) 
      : path.normalize(path.join(projectRoot, defaultEnvPath));

    // Check if System Settings already exists and points to the same file
    if (existingSystemSettings) {
      const normalizedExisting = path.normalize(existingSystemSettings.configPath);
      const normalizedEnvPath = path.normalize(absoluteEnvPath);
      if (normalizedExisting === normalizedEnvPath) {
        // Already registered with correct path
        return false;
      }
      // Path changed, update it
      existingSystemSettings.configPath = absoluteEnvPath;
      await saveSystemSettings(systemSettingsPath, existingSystemSettings);
      console.log(`Updated System Settings path: ${absoluteEnvPath}`);
      return true;
    }

    // Check if .env.config-studio file exists, if not, create one by cloning from template
    if (!fs.existsSync(absoluteEnvPath)) {
      console.log(`System Settings: .env.config-studio file not found at ${absoluteEnvPath}`);
      console.log(`Creating .env.config-studio file...`);
      
      // Try to clone from package root template
      const { PACKAGE_ROOT } = require('../config/paths');
      const templatePath = path.join(PACKAGE_ROOT, '.env.config-studio');
      let defaultContent;
      
      if (fs.existsSync(templatePath)) {
        // Clone from existing template file
        defaultContent = fs.readFileSync(templatePath, 'utf8');
        console.log(`Cloned .env.config-studio from package template`);
      } else {
        // Fallback to minimal default if template doesn't exist
        defaultContent = `# Config Studio Configuration
# This file contains settings for Config Studio itself
# All settings are optional - modify as needed

# Theme Configuration
# Available themes: light, cyberpunk, vscode-dark, vscode-light, chatgpt, dracula, nord, monokai, custom
# Default: cyberpunk
DEFAULT_THEME=cyberpunk

# Server Configuration
# Port number for Config Studio web interface (type:number, min:1, max:65535)
# Default: 8880
CONFIG_STUDIO_PORT=8880

# Data Directory Configuration
# Directory where Config Studio stores its registry and settings
# Can be relative (to current directory) or absolute path
# Default: ./data
CONFIG_STUDIO_DATA_DIR=data

# Startup Configuration
# Automatically register a config file when Config Studio starts
# Leave empty if not needed
CONFIG_STUDIO_CONFIG_PATH=

# Startup System Name
# Custom name for the startup config (used with CONFIG_STUDIO_CONFIG_PATH)
# Leave empty if not needed
CONFIG_STUDIO_SYSTEM_NAME=
`;
      }
      
      fs.writeFileSync(absoluteEnvPath, defaultContent, 'utf8');
      console.log(`Created .env.config-studio with default configuration`);
    }

    // Register as "System Settings"
    const validatedSystem = await validateSystem(
      { name: 'System Settings', configPath: absoluteEnvPath },
      projectRoot,
      true
    );

    await saveSystemSettings(systemSettingsPath, validatedSystem);
    
    console.log(`Registered System Settings: ${validatedSystem.configPath}`);
    return true;
  } catch (error) {
    console.error('Error registering System Settings:', error);
    return false;
  }
}

/**
 * Register example systems from the examples directory
 * @param {string} registryPath - Path to systems registry file
 * @param {string} projectRoot - Project root directory
 */
async function registerExampleSystems(registryPath, projectRoot) {
  const fs = require('fs').promises;
  const path = require('path');
  const examplesDir = path.join(projectRoot, 'examples');
  
  try {
    // Check if examples directory exists
    try {
      await fsPromises.access(examplesDir);
    } catch (error) {
      // Examples directory doesn't exist, skip
      return;
    }
    
    // Load existing systems
    const systems = await loadSystemsRegistry(registryPath, projectRoot);
    
    // Find all config files in examples subdirectories
    const entries = await fsPromises.readdir(examplesDir, { withFileTypes: true });
    const exampleConfigs = [];
    
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const subDir = path.join(examplesDir, entry.name);
        const files = await fsPromises.readdir(subDir);
        
        // Look for common config file names
        const configFiles = files.filter(file => {
          const ext = path.extname(file).toLowerCase();
          const basename = path.basename(file).toLowerCase();
          return basename === '.env' || 
                 basename.endsWith('.env') ||
                 ext === '.properties' ||
                 ext === '.yaml' ||
                 ext === '.yml' ||
                 ext === '.json' ||
                 ext === '.xml' ||
                 ext === '.toml';
        });
        
        for (const configFile of configFiles) {
          const configPath = path.join(subDir, configFile);
          // Format system name from directory name (e.g., "database-service" -> "Database Service")
          const systemName = entry.name
            .split('-')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
          
          exampleConfigs.push({
            name: systemName,
            configPath: configPath
          });
        }
      }
    }
    
    // Clean up invalid systems (files that don't exist or are from different project)
    // Also remove duplicates by name and config path
    const validSystems = [];
    const seenNames = new Set();
    const seenPaths = new Set();
    
    for (const system of systems) {
      try {
        // Check if file exists
        await fsPromises.access(system.configPath);
        // Check if path is within current project (for relative paths)
        const systemPath = path.relative(projectRoot, system.configPath);
        if (systemPath.startsWith('..')) {
          console.log(`Removing invalid system (outside project): ${system.name} (${system.configPath})`);
          continue;
        }
        
        // Normalize path for comparison
        const normalizedPath = path.normalize(system.configPath);
        
        // Check for duplicate name
        if (seenNames.has(system.name)) {
          console.log(`Removing duplicate system (same name): ${system.name} (${system.configPath})`);
          continue;
        }
        
        // Check for duplicate config path
        if (seenPaths.has(normalizedPath)) {
          console.log(`Removing duplicate system (same config file): ${system.name} (${system.configPath})`);
          continue;
        }
        
        // System is valid and unique
        validSystems.push(system);
        seenNames.add(system.name);
        seenPaths.add(normalizedPath);
      } catch (error) {
        // File doesn't exist, remove from registry
        console.log(`Removing invalid system (file not found): ${system.name} (${system.configPath})`);
      }
    }
    systems = validSystems;
    
    // Register each example system if it doesn't already exist
    for (const example of exampleConfigs) {
      const absolutePath = path.isAbsolute(example.configPath) 
        ? path.normalize(example.configPath) 
        : path.normalize(path.join(projectRoot, example.configPath));
      
      // Check if system with this name or path already exists
      const normalizedNewPath = path.normalize(absolutePath);
      const existsByName = systems.some(s => s.name === example.name);
      const existsByPath = systems.some(s => {
        const normalizedExisting = path.normalize(s.configPath);
        return normalizedExisting === normalizedNewPath;
      });
      
      if (existsByName) {
        console.log(`Skipping example system (duplicate name): ${example.name} (${absolutePath})`);
      } else if (existsByPath) {
        console.log(`Skipping example system (duplicate config file): ${example.name} (${absolutePath})`);
      } else {
        try {
          // Check if file exists before registering
          await fsPromises.access(absolutePath);
          
          const validatedSystem = await validateSystem(
            { name: example.name, configPath: absolutePath },
            projectRoot,
            false // Don't require file existence check since we just checked it
          );
          
          systems.push(validatedSystem);
          console.log(`Registered example system: ${example.name} (${absolutePath})`);
        } catch (error) {
          // File doesn't exist or validation failed, skip
          console.warn(`Skipping example system ${example.name}: ${error.message}`);
        }
      }
    }
    
    // Save updated registry (always save to persist cleanup and new registrations)
    await saveSystemsRegistry(registryPath, systems);
  } catch (error) {
    console.warn('Error registering example systems:', error.message);
    // Don't throw - examples are optional
  }
}

module.exports = {
  registerStartupSystem,
  getStartupConfig,
  registerConfigStudio,
  registerExampleSystems
};

