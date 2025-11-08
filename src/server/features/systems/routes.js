/**
 * System registry API routes
 */

const express = require('express');
const { loadSystemsRegistry, saveSystemsRegistry, loadSystemSettings } = require('./registry');
const { validateSystem } = require('./validator');

function createSystemsRoutes(registryPath, systemSettingsPath, projectRoot) {
  const router = express.Router();

  // GET /api/systems - Get all registered systems (including System Settings)
  router.get('/', async (req, res) => {
    try {
      const systems = await loadSystemsRegistry(registryPath, projectRoot);
      const systemSettings = await loadSystemSettings(systemSettingsPath, projectRoot);
      
      // Combine systems with System Settings (System Settings first)
      const allSystems = systemSettings ? [systemSettings, ...systems] : systems;
      res.json(allSystems);
    } catch (error) {
      console.error('Error loading systems:', error);
      res.status(500).json({ error: 'Failed to load systems' });
    }
  });

  // POST /api/systems - Create a new system
  router.post('/', async (req, res) => {
    try {
      const systems = await loadSystemsRegistry(registryPath, projectRoot);
      const validatedSystem = await validateSystem(req.body, projectRoot, true);
      
      // Check for duplicate name
      if (systems.some(s => s.name === validatedSystem.name)) {
        return res.status(400).json({ error: 'System with this name already exists' });
      }
      
      // Check for duplicate config path (normalized)
      const normalizedNewPath = require('path').normalize(validatedSystem.configPath);
      if (systems.some(s => {
        const normalizedExistingPath = require('path').normalize(s.configPath);
        return normalizedExistingPath === normalizedNewPath;
      })) {
        return res.status(400).json({ error: 'System with this configuration file already exists' });
      }
      
      systems.push(validatedSystem);
      await saveSystemsRegistry(registryPath, systems);
      res.status(201).json(validatedSystem);
    } catch (error) {
      console.error('Error creating system:', error);
      res.status(400).json({ error: error.message || 'Failed to create system' });
    }
  });

  // PUT /api/systems/:name - Update a system
  router.put('/:name', async (req, res) => {
    try {
      const systems = await loadSystemsRegistry(registryPath, projectRoot);
      const systemName = decodeURIComponent(req.params.name);
      const systemIndex = systems.findIndex(s => s.name === systemName);
      
      if (systemIndex === -1) {
        return res.status(404).json({ error: 'System not found' });
      }
      
      const oldSystem = systems[systemIndex];
      const validatedSystem = await validateSystem(
        { ...oldSystem, ...req.body },
        projectRoot,
        true
      );
      
      // Check for duplicate name (excluding current system)
      if (systems.some(s => s.name !== systemName && s.name === validatedSystem.name)) {
        return res.status(400).json({ error: 'System with this name already exists' });
      }
      
      // Check for duplicate config path (excluding current system, normalized)
      const normalizedNewPath = require('path').normalize(validatedSystem.configPath);
      if (systems.some(s => {
        if (s.name === systemName) return false; // Exclude current system
        const normalizedExistingPath = require('path').normalize(s.configPath);
        return normalizedExistingPath === normalizedNewPath;
      })) {
        return res.status(400).json({ error: 'System with this configuration file already exists' });
      }
      
      systems[systemIndex] = validatedSystem;
      await saveSystemsRegistry(registryPath, systems);
      res.json(validatedSystem);
    } catch (error) {
      console.error('Error updating system:', error);
      res.status(400).json({ error: error.message || 'Failed to update system' });
    }
  });

  // DELETE /api/systems/:name - Delete a system
  router.delete('/:name', async (req, res) => {
    try {
      const systems = await loadSystemsRegistry(registryPath, projectRoot);
      const systemName = decodeURIComponent(req.params.name);
      const systemIndex = systems.findIndex(s => s.name === systemName);
      
      if (systemIndex === -1) {
        return res.status(404).json({ error: 'System not found' });
      }
      
      systems.splice(systemIndex, 1);
      await saveSystemsRegistry(registryPath, systems);
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting system:', error);
      res.status(500).json({ error: 'Failed to delete system' });
    }
  });

  return router;
}

module.exports = { createSystemsRoutes };

