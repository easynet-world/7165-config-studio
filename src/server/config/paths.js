/**
 * File path configuration
 */

const path = require('path');
const fs = require('fs');

// Use current working directory as project root (where user runs the command)
// This ensures it works correctly when installed via npm/npx
const PROJECT_ROOT = process.cwd();

// Package root - where the package is installed (for accessing package files like public/)
// __dirname is src/server/config, so go up 3 levels to reach package root
const PACKAGE_ROOT = path.join(__dirname, '../../..');

// Data directory - configurable via CONFIG_STUDIO_DATA_DIR environment variable
// Defaults to 'data' folder in project root
// Backward compatibility: also supports DOTENV_UI_DATA_DIR
const dataDirEnv = process.env.CONFIG_STUDIO_DATA_DIR || process.env.DOTENV_UI_DATA_DIR;
const DATA_DIR = dataDirEnv
  ? (path.isAbsolute(dataDirEnv) 
      ? dataDirEnv 
      : path.join(PROJECT_ROOT, dataDirEnv))
  : path.join(PROJECT_ROOT, 'data');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const ENV_FILE_PATH = path.join(PROJECT_ROOT, '.env.config-studio');
const SYSTEMS_REGISTRY_PATH = path.join(DATA_DIR, 'systems-registry.json');
const SYSTEM_SETTINGS_PATH = path.join(DATA_DIR, 'system-settings.json');
// Public directory is in the package, not in the project root
const PUBLIC_DIR = path.join(PACKAGE_ROOT, 'public');

module.exports = {
  PROJECT_ROOT,
  PACKAGE_ROOT,
  DATA_DIR,
  ENV_FILE_PATH,
  SYSTEMS_REGISTRY_PATH,
  SYSTEM_SETTINGS_PATH,
  PUBLIC_DIR
};

