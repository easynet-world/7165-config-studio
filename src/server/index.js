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
const { PROJECT_ROOT, SYSTEMS_REGISTRY_PATH, SYSTEM_SETTINGS_PATH, ENV_FILE_PATH } = require('./config/paths');
const { migrateRegistryIfNeeded } = require('./features/systems/migration');
const { registerStartupSystem, getStartupConfig, registerConfigStudio, registerExampleSystems } = require('./features/systems/startup');
const { FileWatcher } = require('./features/file-watcher');
const { WebSocketServer } = require('./features/websocket');

let fileWatcher = null;
let wsServer = null;

/**
 * Ensure .env.config-studio file exists in the current directory
 * Creates it with default configuration if it doesn't exist
 */
function ensureConfigFile() {
  if (!fs.existsSync(ENV_FILE_PATH)) {
    const defaultContent = `# Config Studio Configuration
# This file contains settings for Config Studio itself

# Theme Configuration
# Available themes: light, cyberpunk, vscode-dark, vscode-light, chatgpt, dracula, nord, monokai, custom
DEFAULT_THEME=cyberpunk
`;
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
