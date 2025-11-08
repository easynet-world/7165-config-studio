/**
 * File watcher service
 * Monitors configuration files for changes and notifies clients via WebSocket
 */

const chokidar = require('chokidar');
const { loadSystemsRegistry, loadSystemSettings } = require('../systems/registry');

class FileWatcher {
  constructor(registryPath, systemSettingsPath, projectRoot, notifyCallback) {
    this.registryPath = registryPath;
    this.systemSettingsPath = systemSettingsPath;
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
      // Load System Settings separately
      const systemSettings = await loadSystemSettings(this.systemSettingsPath, this.projectRoot);
      if (systemSettings) {
        this.watchFile(systemSettings.configPath, systemSettings.name);
      }
      
      // Load all registered systems (excluding System Settings)
      const systems = await loadSystemsRegistry(this.registryPath, this.projectRoot);
      
      // Watch each system's config file
      for (const system of systems) {
        this.watchFile(system.configPath, system.name);
      }

      // Also watch the registry files for changes
      this.watchRegistry();

      this.isWatching = true;
      const totalFiles = (systemSettings ? 1 : 0) + systems.length;
      console.log(`File watcher started. Monitoring ${totalFiles} configuration file(s).`);
    } catch (error) {
      console.error('Error starting file watcher:', error);
    }
  }

  /**
   * Watch a specific config file
   * @param {string} filePath - Absolute path to the config file
   * @param {string} systemName - System name associated with this file
   */
  watchFile(filePath, systemName) {
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
        console.log(`Config file changed: ${path} (System: ${systemName})`);
        // Notify all clients about the change
        if (this.notifyCallback) {
          this.notifyCallback({
            type: 'file-changed',
            systemName: systemName,
            systemId: systemName, // Backward compatibility
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
        // Reload System Settings
        const systemSettings = await loadSystemSettings(this.systemSettingsPath, this.projectRoot);
        
        // Reload systems (excluding System Settings)
        const systems = await loadSystemsRegistry(this.registryPath, this.projectRoot);
        
        // Get current watched files
        const currentWatched = new Set(this.watchers.keys());
        
        // Watch System Settings if it exists
        if (systemSettings && !currentWatched.has(systemSettings.configPath)) {
          this.watchFile(systemSettings.configPath, systemSettings.name);
        }
        
        // Watch new files
        for (const system of systems) {
          if (!currentWatched.has(system.configPath)) {
            this.watchFile(system.configPath, system.name);
          }
        }
        
        // Stop watching files that are no longer in registry
        const allSystems = systemSettings ? [systemSettings, ...systems] : systems;
        for (const [filePath, watcher] of this.watchers.entries()) {
          const stillExists = allSystems.some(s => s.configPath === filePath);
          if (!stillExists && filePath !== this.registryPath && filePath !== this.systemSettingsPath) {
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
    
    // Also watch System Settings file for changes
    const systemSettingsWatcher = chokidar.watch(this.systemSettingsPath, {
      persistent: true,
      ignoreInitial: true,
      awaitWriteFinish: {
        stabilityThreshold: 300,
        pollInterval: 100
      }
    });

    systemSettingsWatcher.on('change', async () => {
      console.log('System Settings file changed. Updating file watchers...');
      
      try {
        const systemSettings = await loadSystemSettings(this.systemSettingsPath, this.projectRoot);
        const currentWatched = new Set(this.watchers.keys());
        
        if (systemSettings && !currentWatched.has(systemSettings.configPath)) {
          this.watchFile(systemSettings.configPath, systemSettings.name);
        }
        
        // Notify clients that registry changed
        if (this.notifyCallback) {
          this.notifyCallback({
            type: 'registry-changed'
          });
        }
      } catch (error) {
        console.error('Error updating System Settings watcher:', error);
      }
    });

    this.watchers.set(this.systemSettingsPath, systemSettingsWatcher);

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

