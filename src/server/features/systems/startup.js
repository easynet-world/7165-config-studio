/**
 * Startup system registration
 * Allows registering a config file on server startup
 */

const path = require('path');
const fs = require('fs').promises;
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

    // Check if system with this path already exists
    const existingSystem = systems.find(s => s.configPath === absoluteConfigPath);
    if (existingSystem) {
      console.log(`System already registered: ${existingSystem.name} (${absoluteConfigPath})`);
      return false;
    }

    // Validate and create system
    const validatedSystem = validateSystem(
      { name: systemName, configPath: absoluteConfigPath },
      projectRoot
    );

    // Check for duplicate name
    if (systems.some(s => s.name === validatedSystem.name)) {
      // Append number if name exists
      let counter = 1;
      let newName = `${validatedSystem.name} ${counter}`;
      while (systems.some(s => s.name === newName)) {
        counter++;
        newName = `${validatedSystem.name} ${counter}`;
      }
      validatedSystem.name = newName;
    }

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
 * Register Config Studio itself (default .env file) as "System Settings" if not already registered
 * @param {string} registryPath - Path to registry file
 * @param {string} projectRoot - Project root directory
 * @param {string} defaultEnvPath - Path to default .env file
 * @returns {Promise<boolean>} - True if system was registered, false if already exists
 */
async function registerConfigStudio(registryPath, projectRoot, defaultEnvPath) {
  try {
    // Load existing systems
    const systems = await loadSystemsRegistry(registryPath, projectRoot);
    
    // Normalize default env path to absolute
    const absoluteEnvPath = path.isAbsolute(defaultEnvPath) 
      ? path.normalize(defaultEnvPath) 
      : path.normalize(path.join(projectRoot, defaultEnvPath));

    // Check if System Settings or a system with this path already exists
    // Also check for old "Config Studio" name for migration
    const existingSystem = systems.find(s => 
      s.name === 'System Settings' || s.name === 'Config Studio' || s.configPath === absoluteEnvPath
    );
    
    if (existingSystem) {
      // If exists but name is different, update it to "System Settings"
      if (existingSystem.name !== 'System Settings' && existingSystem.configPath === absoluteEnvPath) {
        existingSystem.name = 'System Settings';
        await saveSystemsRegistry(registryPath, systems);
        console.log(`Updated system name to "System Settings" (${absoluteEnvPath})`);
        return true;
      }
      return false;
    }

    // Register as "System Settings"
    const validatedSystem = await validateSystem(
      { name: 'System Settings', configPath: absoluteEnvPath },
      projectRoot,
      true
    );

    systems.push(validatedSystem);
    await saveSystemsRegistry(registryPath, systems);
    
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
      await fs.access(examplesDir);
    } catch (error) {
      // Examples directory doesn't exist, skip
      return;
    }
    
    // Load existing systems
    const systems = await loadSystemsRegistry(registryPath, projectRoot);
    
    // Find all config files in examples subdirectories
    const entries = await fs.readdir(examplesDir, { withFileTypes: true });
    const exampleConfigs = [];
    
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const subDir = path.join(examplesDir, entry.name);
        const files = await fs.readdir(subDir);
        
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
    
    // Register each example system if it doesn't already exist
    for (const example of exampleConfigs) {
      const absolutePath = path.isAbsolute(example.configPath) 
        ? path.normalize(example.configPath) 
        : path.normalize(path.join(projectRoot, example.configPath));
      
      // Check if system with this path already exists
      const exists = systems.some(s => s.configPath === absolutePath);
      
      if (!exists) {
        try {
          // Check if file exists before registering
          await fs.access(absolutePath);
          
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
    
    // Save updated registry
    if (exampleConfigs.length > 0) {
      await saveSystemsRegistry(registryPath, systems);
    }
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

