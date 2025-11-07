/**
 * WebSocket server for real-time notifications
 */

const WebSocket = require('ws');

class WebSocketServer {
  constructor(server) {
    this.wss = new WebSocket.Server({ server });
    this.clients = new Set();
    this.setupConnectionHandlers();
  }

  /**
   * Setup WebSocket connection handlers
   */
  setupConnectionHandlers() {
    this.wss.on('connection', (ws, req) => {
      this.clients.add(ws);
      console.log(`WebSocket client connected. Total clients: ${this.clients.size}`);

      // Send welcome message
      ws.send(JSON.stringify({
        type: 'connected',
        message: 'Connected to Config Studio WebSocket server'
      }));

      // Handle client disconnect
      ws.on('close', () => {
        this.clients.delete(ws);
        console.log(`WebSocket client disconnected. Total clients: ${this.clients.size}`);
      });

      // Handle errors
      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        this.clients.delete(ws);
      });

      // Handle pong (for keepalive)
      ws.on('pong', () => {
        ws.isAlive = true;
      });
    });

    // Setup keepalive ping
    this.keepalive = setInterval(() => {
      this.wss.clients.forEach((ws) => {
        if (ws.isAlive === false) {
          return ws.terminate();
        }
        ws.isAlive = false;
        ws.ping();
      });
    }, 30000); // Ping every 30 seconds
  }

  /**
   * Broadcast message to all connected clients
   * @param {Object} message - Message object to broadcast
   */
  broadcast(message) {
    const data = JSON.stringify(message);
    let sentCount = 0;
    
    this.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        try {
          client.send(data);
          sentCount++;
        } catch (error) {
          console.error('Error sending WebSocket message:', error);
        }
      }
    });

    if (sentCount > 0) {
      console.log(`Broadcasted message to ${sentCount} client(s):`, message.type);
    }
  }

  /**
   * Close WebSocket server
   */
  close() {
    if (this.keepalive) {
      clearInterval(this.keepalive);
    }
    
    this.clients.forEach((client) => {
      client.close();
    });
    
    this.wss.close();
    console.log('WebSocket server closed.');
  }
}

module.exports = { WebSocketServer };

