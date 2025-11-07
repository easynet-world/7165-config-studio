/**
 * System registry API routes
 */

const express = require('express');
const { loadSystemsRegistry, saveSystemsRegistry } = require('./registry');
const { validateSystem } = require('./validator');

function createSystemsRoutes(registryPath, projectRoot) {
  const router = express.Router();

  // GET /api/systems - Get all registered systems
  router.get('/', async (req, res) => {
    try {
      const systems = await loadSystemsRegistry(registryPath, projectRoot);
      res.json(systems);
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
      
      systems.push(validatedSystem);
      await saveSystemsRegistry(registryPath, systems);
      res.status(201).json(validatedSystem);
    } catch (error) {
      console.error('Error creating system:', error);
      res.status(400).json({ error: error.message || 'Failed to create system' });
    }
  });

  // PUT /api/systems/:id - Update a system
  router.put('/:id', async (req, res) => {
    try {
      const systems = await loadSystemsRegistry(registryPath, projectRoot);
      const systemId = req.params.id;
      const systemIndex = systems.findIndex(s => s.id === systemId);
      
      if (systemIndex === -1) {
        return res.status(404).json({ error: 'System not found' });
      }
      
      const validatedSystem = await validateSystem(
        { ...systems[systemIndex], ...req.body, id: systemId },
        projectRoot,
        true
      );
      
      // Check for duplicate name (excluding current system)
      if (systems.some(s => s.id !== systemId && s.name === validatedSystem.name)) {
        return res.status(400).json({ error: 'System with this name already exists' });
      }
      
      systems[systemIndex] = validatedSystem;
      await saveSystemsRegistry(registryPath, systems);
      res.json(validatedSystem);
    } catch (error) {
      console.error('Error updating system:', error);
      res.status(400).json({ error: error.message || 'Failed to update system' });
    }
  });

  // DELETE /api/systems/:id - Delete a system
  router.delete('/:id', async (req, res) => {
    try {
      const systems = await loadSystemsRegistry(registryPath, projectRoot);
      const systemId = req.params.id;
      const systemIndex = systems.findIndex(s => s.id === systemId);
      
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

