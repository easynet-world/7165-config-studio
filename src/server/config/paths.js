/**
 * File path configuration
 */

const path = require('path');
const fs = require('fs');

// __dirname is src/server/config, so go up 3 levels to reach project root
const PROJECT_ROOT = path.join(__dirname, '../../..');

// Data directory - configurable via DOTENV_UI_DATA_DIR environment variable
// Defaults to 'data' folder in project root
const DATA_DIR = process.env.DOTENV_UI_DATA_DIR 
  ? (path.isAbsolute(process.env.DOTENV_UI_DATA_DIR) 
      ? process.env.DOTENV_UI_DATA_DIR 
      : path.join(PROJECT_ROOT, process.env.DOTENV_UI_DATA_DIR))
  : path.join(PROJECT_ROOT, 'data');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const ENV_FILE_PATH = path.join(PROJECT_ROOT, '.env');
const SYSTEMS_REGISTRY_PATH = path.join(DATA_DIR, 'systems-registry.json');
const PUBLIC_DIR = path.join(PROJECT_ROOT, 'public');

module.exports = {
  PROJECT_ROOT,
  DATA_DIR,
  ENV_FILE_PATH,
  SYSTEMS_REGISTRY_PATH,
  PUBLIC_DIR
};

