#!/usr/bin/env node

/**
 * Config Studio Server Entry Point
 */

// Load environment variables from .env file
require('dotenv').config();

const path = require('path');
const http = require('http');
const { getPort } = require('./config/port');
const { createApp } = require('./app');
const { PROJECT_ROOT, SYSTEMS_REGISTRY_PATH, ENV_FILE_PATH } = require('./config/paths');
const { migrateRegistryIfNeeded } = require('./features/systems/migration');
const { registerStartupSystem, getStartupConfig, registerConfigStudio, registerExampleSystems } = require('./features/systems/startup');
const { FileWatcher } = require('./features/file-watcher');
const { WebSocketServer } = require('./features/websocket');

let fileWatcher = null;
let wsServer = null;

async function startServer() {
  // Migrate registry from old location if needed
  const oldRegistryPath = path.join(PROJECT_ROOT, '.systems-registry.json');
  await migrateRegistryIfNeeded(oldRegistryPath, SYSTEMS_REGISTRY_PATH);

  // Register Config Studio itself (default .env file) as "System Settings" if not already registered
  await registerConfigStudio(SYSTEMS_REGISTRY_PATH, PROJECT_ROOT, ENV_FILE_PATH);

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
    console.log(`Make sure you have a .env file in the project root`);
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
