#!/usr/bin/env node

/**
 * Config Studio Server Entry Point
 */

// Environment variables will be loaded after ensuring .env.config-studio exists

const path = require('path');
const fs = require('fs');
const http = require('http');
const { getPort } = require('./config/port');
const { createApp } = require('./app');
const { PROJECT_ROOT, SYSTEMS_REGISTRY_PATH, SYSTEM_SETTINGS_PATH, ENV_FILE_PATH, PACKAGE_ROOT } = require('./config/paths');
const { migrateRegistryIfNeeded } = require('./features/systems/migration');
const { registerStartupSystem, getStartupConfig, registerConfigStudio, registerExampleSystems, autoRegisterLocalEnv } = require('./features/systems/startup');
const { FileWatcher } = require('./features/file-watcher');
const { WebSocketServer } = require('./features/websocket');

let fileWatcher = null;
let wsServer = null;

/**
 * Ensure .env.config-studio file exists in the current directory
 * Creates it by cloning from package root template if it doesn't exist
 */
function ensureConfigFile() {
  if (!fs.existsSync(ENV_FILE_PATH)) {
    // Try to use template from package root
    const templatePath = path.join(PACKAGE_ROOT, '.env.config-studio');
    let defaultContent;
    
    if (fs.existsSync(templatePath)) {
      // Clone from existing template file
      defaultContent = fs.readFileSync(templatePath, 'utf8');
    } else {
      // Fallback to minimal default if template doesn't exist
      defaultContent = `# Config Studio Configuration
# This file contains settings for Config Studio itself
# All settings are optional - modify as needed

# Theme Configuration
# Available themes: light, cyberpunk, vscode-dark, vscode-light, chatgpt, dracula, nord, monokai, custom
CONFIG_STUDIO_THEME=cyberpunk

# Server Configuration
# Port number for Config Studio web interface (type:number, min:1, max:65535)
CONFIG_STUDIO_PORT=8880

# Data Directory Configuration
# Directory where Config Studio stores its registry and settings
# Can be relative (to current directory) or absolute path
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
    
    fs.writeFileSync(ENV_FILE_PATH, defaultContent, 'utf8');
    console.log(`Created .env.config-studio in ${PROJECT_ROOT}`);
  }
}

async function startServer() {
  // Ensure .env.config-studio exists before loading environment variables
  ensureConfigFile();
  
  // Reload environment variables after creating the file
  require('dotenv').config({ path: '.env.config-studio' });
  
  // Migrate registry from old location if needed
  const oldRegistryPath = path.join(PROJECT_ROOT, '.systems-registry.json');
  await migrateRegistryIfNeeded(oldRegistryPath, SYSTEMS_REGISTRY_PATH);

  // Register Config Studio itself (.env.config-studio file) as "System Settings" if not already registered
  await registerConfigStudio(SYSTEM_SETTINGS_PATH, PROJECT_ROOT, ENV_FILE_PATH);

        // Register config file from startup configuration if provided
        const startupConfig = getStartupConfig();
        if (startupConfig) {
          await registerStartupSystem(
            SYSTEMS_REGISTRY_PATH,
            PROJECT_ROOT,
            startupConfig.configPath,
            startupConfig.systemName
          );
        }

        // Register example systems from examples directory
        await registerExampleSystems(SYSTEMS_REGISTRY_PATH, PROJECT_ROOT);

        // Auto-register local .env file if no systems are registered
        await autoRegisterLocalEnv(SYSTEMS_REGISTRY_PATH, PROJECT_ROOT);

  const PORT = getPort();
  const app = createApp();
  
  // Create HTTP server (needed for WebSocket)
  const server = http.createServer(app);

  // Setup WebSocket server
  wsServer = new WebSocketServer(server);

  // Setup file watcher with WebSocket notification callback
  fileWatcher = new FileWatcher(
    SYSTEMS_REGISTRY_PATH,
    SYSTEM_SETTINGS_PATH,
    PROJECT_ROOT,
    (message) => {
      // Notify all WebSocket clients about file changes
      wsServer.broadcast(message);
    }
  );

  // Start watching files
  await fileWatcher.start();

  server.listen(PORT, () => {
    console.log(`Config Studio running on http://localhost:${PORT}`);
    console.log(`WebSocket server ready for real-time updates`);
    console.log(`File monitoring active - changes will be notified automatically`);
    console.log(`Config Studio configuration: .env.config-studio`);
    if (startupConfig) {
      console.log(`Startup config registered: ${startupConfig.configPath}`);
    }
  });

  // Graceful shutdown
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

function shutdown() {
  console.log('\nShutting down gracefully...');
  
  if (fileWatcher) {
    fileWatcher.stop();
  }
  
  if (wsServer) {
    wsServer.close();
  }
  
  process.exit(0);
}

startServer().catch(error => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
