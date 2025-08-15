import { WebSocketServer } from 'ws';
import { Server } from 'http';
import { logger } from './utils/logger';

export function setupWebSocket(server: Server): WebSocketServer {
  const wss = new WebSocketServer({ 
    server,
    path: '/ws'
  });

  wss.on('connection', (ws, req) => {
    logger.info('WebSocket connection established', { 
      clientIP: req.socket.remoteAddress 
    });

    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString());
        logger.info('WebSocket message received', { message });
        
        ws.send(JSON.stringify({
          type: 'echo',
          data: message,
          timestamp: new Date().toISOString()
        }));
      } catch (error) {
        logger.error('WebSocket message error:', error);
      }
    });

    ws.on('close', () => {
      logger.info('WebSocket connection closed');
    });

    ws.on('error', (error) => {
      logger.error('WebSocket error:', error);
    });
  });

  return wss;
}