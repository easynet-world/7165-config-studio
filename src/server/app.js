/**
 * Express application setup
 */

const express = require('express');
const path = require('path');
const cors = require('cors');
const { createStaticMiddleware } = require('./middleware/static');
const { createSystemsRoutes } = require('./features/systems/routes');
const { createSettingsRoutes } = require('./features/settings/routes');
const { ENV_FILE_PATH, SYSTEMS_REGISTRY_PATH, PUBLIC_DIR, PROJECT_ROOT } = require('./config/paths');

/**
 * Create and configure Express application
 * @returns {express.Application} - Configured Express app
 */
function createApp() {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json());

  // Static files with no-cache headers
  app.use(createStaticMiddleware(PUBLIC_DIR));

  // API Routes
  app.use('/api/systems', createSystemsRoutes(SYSTEMS_REGISTRY_PATH, PROJECT_ROOT));
  app.use('/api/settings', createSettingsRoutes(ENV_FILE_PATH, SYSTEMS_REGISTRY_PATH, PROJECT_ROOT));

  // Serve the settings page
  app.get('/', (req, res) => {
    // Set headers to prevent caching of the HTML page
    res.set({
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });
    res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
  });

  return app;
}

module.exports = { createApp };

