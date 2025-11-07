/**
 * Port configuration utility
 * Priority: command-line arg > DOTENV_UI_PORT > DOTENV_UI_SETTINGS > PORT > 8880
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
  
  // Check for DOTENV_UI_PORT environment variable (preferred for port)
  if (process.env.DOTENV_UI_PORT) {
    const port = parseInt(process.env.DOTENV_UI_PORT, 10);
    if (!isNaN(port) && port > 0 && port <= 65535) {
      return port;
    }
  }
  
  // Check for DOTENV_UI_SETTINGS (can be a JSON object or just port number)
  if (process.env.DOTENV_UI_SETTINGS) {
    try {
      // Try parsing as JSON first
      const settings = JSON.parse(process.env.DOTENV_UI_SETTINGS);
      if (settings.port) {
        const port = parseInt(settings.port, 10);
        if (!isNaN(port) && port > 0 && port <= 65535) {
          return port;
        }
      }
    } catch (e) {
      // If not JSON, try parsing as a port number directly
      const port = parseInt(process.env.DOTENV_UI_SETTINGS, 10);
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

