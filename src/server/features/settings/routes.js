/**
 * Settings API routes
 */

const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const { getFormatHandler, isFormatSupported, getSupportedExtensionsString } = require('./formats');
const { loadSystemsRegistry, loadSystemSettings } = require('../systems/registry');

function createSettingsRoutes(envFilePath, registryPath, systemSettingsPath, projectRoot) {
  const router = express.Router();

  // GET /api/settings - Get all settings organized by sections
  // Supports ?system=<systemName> query parameter
  // Also supports ?system=<systemName>&file=<absolutePath> for direct file access
  // Always reads fresh from config file (no caching)
  router.get('/', async (req, res) => {
    try {
      // Set headers to prevent caching
      res.set({
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      });
      
      // System parameter is required
      if (!req.query.system) {
        return res.status(400).json({ error: 'System parameter is required. Please select a system.' });
      }
      
      let configFilePath = null;
      
      // If file parameter is provided, use it directly (for single config page)
      if (req.query.file) {
        configFilePath = decodeURIComponent(req.query.file);
        // Validate that it's an absolute path
        if (!path.isAbsolute(configFilePath)) {
          return res.status(400).json({ error: 'File path must be absolute' });
        }
      } else {
        // Otherwise, look up system from registry
        // Check System Settings first (stored separately)
        const systemSettings = await loadSystemSettings(systemSettingsPath, projectRoot);
        let system = null;
        
        if (systemSettings && systemSettings.name === req.query.system) {
          system = systemSettings;
        } else {
          // Check regular systems
          const systems = await loadSystemsRegistry(registryPath, projectRoot);
          system = systems.find(s => s.name === req.query.system);
        }
        
        if (!system) {
          return res.status(404).json({ error: 'System not found' });
        }
        
        configFilePath = system.configPath;
      }
      
      // Check if format is supported (determine on the fly)
      if (!isFormatSupported(configFilePath)) {
        // For unsupported formats, return raw file content
        try {
          const content = await fs.readFile(configFilePath, 'utf-8');
          return res.json({ 
            raw: true, 
            content: content,
            formatSupported: false
          });
        } catch (error) {
          if (error.code === 'ENOENT') {
            return res.json({ raw: true, content: '', formatSupported: false });
          }
          throw error;
        }
      }
      
      // Get format handler for this file
      const formatHandler = getFormatHandler(configFilePath);
      if (!formatHandler) {
        // Fallback to raw content
        const content = await fs.readFile(configFilePath, 'utf-8');
        return res.json({ 
          raw: true, 
          content: content,
          formatSupported: false
        });
      }
      
      // Always read fresh from file system
      const content = await fs.readFile(configFilePath, 'utf-8');
      const { sections, sectionOrder } = formatHandler.parse(content);
      // Return sections with order information
      res.json({ sections, sectionOrder, formatSupported: true });
    } catch (error) {
      if (error.code === 'ENOENT') {
        // Config file doesn't exist, return empty structure
        res.set({
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        });
        res.json({ sections: {}, sectionOrder: [] });
      } else {
        console.error('Error reading config file:', error);
        res.status(500).json({ error: 'Failed to read settings' });
      }
    }
  });

  // POST /api/settings - Save settings
  // Supports ?system=<systemId> query parameter
  // Also supports ?system=<systemName>&file=<absolutePath> for direct file access
  router.post('/', async (req, res) => {
    try {
      // System parameter is required
      if (!req.query.system) {
        return res.status(400).json({ error: 'System parameter is required. Please select a system.' });
      }
      
      let configFilePath = null;
      
      // If file parameter is provided, use it directly (for single config page)
      if (req.query.file) {
        configFilePath = decodeURIComponent(req.query.file);
        // Validate that it's an absolute path
        if (!path.isAbsolute(configFilePath)) {
          return res.status(400).json({ error: 'File path must be absolute' });
        }
      } else {
        // Otherwise, look up system from registry
        // Check System Settings first (stored separately)
        const systemSettings = await loadSystemSettings(systemSettingsPath, projectRoot);
        let system = null;
        
        if (systemSettings && systemSettings.name === req.query.system) {
          system = systemSettings;
        } else {
          // Check regular systems
          const systems = await loadSystemsRegistry(registryPath, projectRoot);
          system = systems.find(s => s.name === req.query.system);
        }
        
        if (!system) {
          return res.status(404).json({ error: 'System not found' });
        }
        
        configFilePath = system.configPath;
      }
      
      const data = req.body;
      
      // Handle raw file editing for unsupported formats
      if (data.raw !== undefined && data.content !== undefined) {
        // This is a raw file edit
        // Create backup before writing
        try {
          const existingContent = await fs.readFile(configFilePath, 'utf-8');
          await fs.writeFile(`${configFilePath}.backup`, existingContent);
        } catch (e) {
          // Backup failed, but continue
        }
        
        await fs.writeFile(configFilePath, data.content, 'utf-8');
        return res.json({ success: true, message: 'Configuration file saved successfully' });
      }
      
      // Check if format is supported for structured editing (determine on the fly)
      if (!isFormatSupported(configFilePath)) {
        return res.status(400).json({ 
          error: `Unsupported configuration file format. Please use raw editing mode. Currently only properties-based formats are supported (${getSupportedExtensionsString()})` 
        });
      }
      
      // Get format handler for this file
      const formatHandler = getFormatHandler(configFilePath);
      if (!formatHandler) {
        return res.status(400).json({ error: 'Unsupported configuration file format' });
      }
      
      // Format data using the appropriate handler
      const content = formatHandler.format(data);
      
      // Create backup before writing
      try {
        const existingContent = await fs.readFile(configFilePath, 'utf-8');
        await fs.writeFile(`${configFilePath}.backup`, existingContent);
      } catch (e) {
        // Backup failed, but continue
      }
      
      await fs.writeFile(configFilePath, content, 'utf-8');
      res.json({ success: true, message: 'Settings saved successfully' });
    } catch (error) {
      console.error('Error saving config file:', error);
      res.status(500).json({ error: 'Failed to save settings' });
    }
  });

  return router;
}

module.exports = { createSettingsRoutes };

