/**
 * Port configuration utility
 * Priority: command-line arg > CONFIG_STUDIO_PORT > CONFIG_STUDIO_SETTINGS > PORT > 8880
 * Backward compatibility: also supports DOTENV_UI_PORT and DOTENV_UI_SETTINGS
 */

function getPort() {
  // Check command-line arguments (e.g., node server.js --port 8080)
  const portArgIndex = process.argv.indexOf('--port');
  if (portArgIndex !== -1 && process.argv[portArgIndex + 1]) {
    const port = parseInt(process.argv[portArgIndex + 1], 10);
    if (!isNaN(port) && port > 0 && port <= 65535) {
      return port;
    }
  }
  
  // Check for CONFIG_STUDIO_PORT environment variable (preferred for port)
  // Backward compatibility: also check DOTENV_UI_PORT
  const portEnv = process.env.CONFIG_STUDIO_PORT || process.env.DOTENV_UI_PORT;
  if (portEnv) {
    const port = parseInt(portEnv, 10);
    if (!isNaN(port) && port > 0 && port <= 65535) {
      return port;
    }
  }
  
  // Check for CONFIG_STUDIO_SETTINGS (can be a JSON object or just port number)
  // Backward compatibility: also check DOTENV_UI_SETTINGS
  const settingsEnv = process.env.CONFIG_STUDIO_SETTINGS || process.env.DOTENV_UI_SETTINGS;
  if (settingsEnv) {
    try {
      // Try parsing as JSON first
      const settings = JSON.parse(settingsEnv);
      if (settings.port) {
        const port = parseInt(settings.port, 10);
        if (!isNaN(port) && port > 0 && port <= 65535) {
          return port;
        }
      }
    } catch (e) {
      // If not JSON, try parsing as a port number directly
      const port = parseInt(settingsEnv, 10);
      if (!isNaN(port) && port > 0 && port <= 65535) {
        return port;
      }
    }
  }
  
  // Fall back to PORT environment variable
  if (process.env.PORT) {
    const port = parseInt(process.env.PORT, 10);
    if (!isNaN(port) && port > 0 && port <= 65535) {
      return port;
    }
  }
  
  // Default port
  return 8880;
}

module.exports = { getPort };

