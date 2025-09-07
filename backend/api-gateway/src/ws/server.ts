// File: src/websocket/server.ts (Fixed Definite Assignment Issue)
import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { logger } from '../utils/logger';
import { ChatWebSocketHandler } from './chat_handler';

export class WebSocketServer {
  private io: SocketIOServer;
  private chatHandler: ChatWebSocketHandler;
  private connectionCount = 0;
  private startTime = Date.now();

  constructor(httpServer: HTTPServer) {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: this.getAllowedOrigins(),
        methods: ['GET', 'POST'],
        credentials: true,
        allowedHeaders: ['authorization', 'content-type']
      },
      pingTimeout: 60000,        // 60 seconds
      pingInterval: 25000,       // 25 seconds
      connectTimeout: 45000,     // 45 seconds
      transports: ['websocket', 'polling'],
      allowEIO3: true,          // Compatibility with older clients
      maxHttpBufferSize: 1e6,   // 1MB max message size
      httpCompression: true,
      perMessageDeflate: true
    });

    this.chatHandler = new ChatWebSocketHandler(this.io);
    
    this.setupGlobalHandlers();
    this.setupHealthMonitoring();
    
    logger.info('WebSocket server initialized', {
      allowedOrigins: this.getAllowedOrigins(),
      transports: ['websocket', 'polling'],
      pingInterval: 25000,
      pingTimeout: 60000,
      chatHandlerInitialized: true
    });
  }

  private getAllowedOrigins(): string[] {
    const origins = process.env.ALLOWED_ORIGINS?.split(',') || [
      'http://localhost:3000',
      'http://localhost:3001', 
      'http://127.0.0.1:3000',
      'http://127.0.0.1:3001',
      "http://127.0.0.1:5500"
    ];
    
    if (process.env.NODE_ENV === 'production') {
      const prodOrigins = process.env.PRODUCTION_ORIGINS?.split(',') || [];
      origins.push(...prodOrigins);
    }
    
    return origins;
  }

  private setupGlobalHandlers(): void {
    this.io.on('connection', (socket) => {
      this.connectionCount++;
      
      logger.info('WebSocket client connected', {
        socketId: socket.id,
        transport: socket.conn.transport.name,
        userAgent: socket.handshake.headers['user-agent'],
        ip: socket.handshake.address,
        totalConnections: this.connectionCount,
        engineConnections: this.io.engine.clientsCount
      });

      socket.conn.on('upgrade', () => {
        logger.debug('WebSocket transport upgraded', {
          socketId: socket.id,
          newTransport: socket.conn.transport.name
        });
      });

      socket.on('ping', (data) => {
        logger.debug('Received ping', { socketId: socket.id });
        socket.emit('pong', data);
      });
    });

    this.io.on('disconnect', (socket) => {
      this.connectionCount--;
      
      logger.info('WebSocket client disconnected', {
        socketId: socket.id,
        totalConnections: this.connectionCount,
        engineConnections: this.io.engine.clientsCount
      });
    });

    this.io.on('connect_error', (error) => {
      logger.error('WebSocket connection error', { error: error.message });
    });
  }

  private setupHealthMonitoring(): void {
    setInterval(() => {
      const uptime = Date.now() - this.startTime;
      const engineStats = this.io.engine;
      const chatMetrics = this.chatHandler.getMetrics();
      
      logger.info('WebSocket server health report', {
        uptime: uptime,
        connections: {
          total: this.connectionCount,
          engine: engineStats.clientsCount
        },
        chat: chatMetrics,
        memory: {
          used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
          total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024)
        }
      });
    }, 5 * 60 * 1000); // Every 5 minutes

    // Connection limit monitoring
    this.io.on('connection', () => {
      if (this.connectionCount > (parseInt(process.env.MAX_CONNECTIONS || '1000'))) {
        logger.warn('High connection count detected', {
          current: this.connectionCount,
          limit: process.env.MAX_CONNECTIONS || '1000'
        });
      }
    });
  }

  public getIO(): SocketIOServer {
    return this.io;
  }

  public getChatHandler(): ChatWebSocketHandler {
    return this.chatHandler;
  }

  public getConnectionCount(): number {
    return this.connectionCount;
  }

  public getServerStats() {
    return {
      uptime: Date.now() - this.startTime,
      connections: {
        total: this.connectionCount,
        engine: this.io.engine.clientsCount
      },
      chat: this.chatHandler.getMetrics(),
      transports: ['websocket', 'polling']
    };
  }

  public async broadcastToAll(event: string, data: any): Promise<void> {
    this.io.emit(event, data);
    logger.info('Broadcast sent to all connections', {
      event,
      connectionCount: this.connectionCount
    });
  }

  public async close(): Promise<void> {
    return new Promise((resolve) => {
      logger.info('Shutting down WebSocket server...');
      
      this.io.emit('server_shutdown', {
        message: 'Server is shutting down',
        timestamp: new Date().toISOString()
      });

      setTimeout(() => {
        this.io.close((err) => {
          if (err) {
            logger.error('Error during WebSocket server shutdown', { error: err });
          } else {
            logger.info('WebSocket server closed successfully');
          }
          resolve();
        });
      }, 2000); 
    });
  }
}