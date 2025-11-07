/**
 * File watcher service
 * Monitors configuration files for changes and notifies clients via WebSocket
 */

const chokidar = require('chokidar');
const { loadSystemsRegistry } = require('../systems/registry');

class FileWatcher {
  constructor(registryPath, projectRoot, notifyCallback) {
    this.registryPath = registryPath;
    this.projectRoot = projectRoot;
    this.notifyCallback = notifyCallback; // Callback to notify WebSocket clients
    this.watchers = new Map(); // Map of file path -> watcher instance
    this.isWatching = false;
  }

  /**
   * Start watching all registered system config files
   */
  async start() {
    if (this.isWatching) {
      return;
    }

    try {
      // Load all registered systems
      const systems = await loadSystemsRegistry(this.registryPath, this.projectRoot);
      
      // Watch each system's config file
      for (const system of systems) {
        this.watchFile(system.configPath, system.id);
      }

      // Also watch the registry file itself for new systems
      this.watchRegistry();

      this.isWatching = true;
      console.log(`File watcher started. Monitoring ${systems.length} configuration file(s).`);
    } catch (error) {
      console.error('Error starting file watcher:', error);
    }
  }

  /**
   * Watch a specific config file
   * @param {string} filePath - Absolute path to the config file
   * @param {string} systemId - System ID associated with this file
   */
  watchFile(filePath, systemId) {
    // Skip if already watching this file
    if (this.watchers.has(filePath)) {
      return;
    }

    try {
      const watcher = chokidar.watch(filePath, {
        persistent: true,
        ignoreInitial: true, // Don't trigger on initial scan
        awaitWriteFinish: {
          stabilityThreshold: 300, // Wait 300ms after last change
          pollInterval: 100
        }
      });

      watcher.on('change', (path) => {
        console.log(`Config file changed: ${path} (System: ${systemId})`);
        // Notify all clients about the change
        if (this.notifyCallback) {
          this.notifyCallback({
            type: 'file-changed',
            systemId: systemId,
            filePath: path
          });
        }
      });

      watcher.on('error', (error) => {
        console.error(`Error watching file ${filePath}:`, error);
      });

      this.watchers.set(filePath, watcher);
    } catch (error) {
      console.error(`Error setting up watcher for ${filePath}:`, error);
    }
  }

  /**
   * Watch the registry file for new systems
   */
  watchRegistry() {
    const registryWatcher = chokidar.watch(this.registryPath, {
      persistent: true,
      ignoreInitial: true,
      awaitWriteFinish: {
        stabilityThreshold: 300,
        pollInterval: 100
      }
    });

    registryWatcher.on('change', async () => {
      console.log('Systems registry changed. Updating file watchers...');
      
      try {
        // Reload systems
        const systems = await loadSystemsRegistry(this.registryPath, this.projectRoot);
        
        // Get current watched files
        const currentWatched = new Set(this.watchers.keys());
        
        // Watch new files
        for (const system of systems) {
          if (!currentWatched.has(system.configPath)) {
            this.watchFile(system.configPath, system.id);
          }
        }
        
        // Stop watching files that are no longer in registry
        for (const [filePath, watcher] of this.watchers.entries()) {
          const stillExists = systems.some(s => s.configPath === filePath);
          if (!stillExists && filePath !== this.registryPath) {
            watcher.close();
            this.watchers.delete(filePath);
          }
        }
        
        // Notify clients that registry changed
        if (this.notifyCallback) {
          this.notifyCallback({
            type: 'registry-changed'
          });
        }
      } catch (error) {
        console.error('Error updating file watchers:', error);
      }
    });

    registryWatcher.on('error', (error) => {
      console.error(`Error watching registry file ${this.registryPath}:`, error);
    });

    this.watchers.set(this.registryPath, registryWatcher);
  }

  /**
   * Stop all file watchers
   */
  stop() {
    for (const [filePath, watcher] of this.watchers.entries()) {
      watcher.close();
    }
    this.watchers.clear();
    this.isWatching = false;
    console.log('File watcher stopped.');
  }

  /**
   * Refresh watchers (reload systems and update watchers)
   */
  async refresh() {
    this.stop();
    await this.start();
  }
}

module.exports = { FileWatcher };

