import { createServer } from 'http';
import dotenv from 'dotenv';
import { createApp } from './app';
import { WebSocketServer } from './ws/server'; 
import { config } from './config/environment';
import { logger } from './utils/logger';
import { connectRedis } from './utils/redis';
import { initializeGrpcClients } from './grpc/client';

dotenv.config();

class APIGateway {
  private httpServer: any;
  private wsServer: WebSocketServer | null = null;
  private isShuttingDown: boolean = false; 

  public async start(): Promise<void> {
    try {
      await connectRedis();
      await initializeGrpcClients();

      const app = createApp();
      this.httpServer = createServer(app);

      try {
        this.wsServer = new WebSocketServer(this.httpServer);
        logger.info('WebSocket server initialized successfully');
      } catch (wsError) {
        logger.error('Failed to initialize WebSocket server:', wsError);
        throw wsError;
      }

      app.get('/health/websocket', (req, res) => {
        if (this.wsServer) {
          const stats = this.wsServer.getServerStats();
          res.json({
            status: 'healthy',
            websocket: {
              ...stats,
              endpoint: `ws://${config.HOST}:${config.PORT}`,
              transports: ['websocket', 'polling']
            },
            timestamp: new Date().toISOString()
          });
        } else {
          res.status(503).json({
            status: 'error',
            message: 'WebSocket server not initialized',
            timestamp: new Date().toISOString()
          });
        }
      });

      console.log(`Starting server on ${config.HOST}:${config.PORT}`);
      
      this.httpServer.listen(config.PORT, config.HOST, () => {
        logger.info('API Gateway started successfully!', {
          host: config.HOST,
          port: config.PORT,
          environment: config.NODE_ENV,
          pid: process.pid,
          websocket: 'enabled',
          endpoints: {
            http: `http://${config.HOST}:${config.PORT}`,
            websocket: `ws://${config.HOST}:${config.PORT}`,
            health: `http://${config.HOST}:${config.PORT}/health`,
            websocket_health: `http://${config.HOST}:${config.PORT}/health/websocket`
          }
        });

        console.log('API Gateway is Running!');
        console.log(`WebSocket endpoint: ws://${config.HOST}:${config.PORT}`);
      });

      process.once('SIGTERM', () => this.shutdown('SIGTERM'));
      process.once('SIGINT', () => this.shutdown('SIGINT'));

    } catch (error) {
      logger.error('Failed to start API Gateway:', error);
      process.exit(1);
    }
  }

  private async shutdown(signal: string): Promise<void> {
    if (this.isShuttingDown) {
      logger.warn('Shutdown already in progress, ignoring signal');
      return;
    }
    
    this.isShuttingDown = true;
    logger.info(`${signal} received, shutting down API Gateway gracefully...`);

    try {
      if (this.wsServer) {
        logger.info('Closing WebSocket server...');
        await this.wsServer.close();
        logger.info('✓ WebSocket server closed');
        this.wsServer = null;
      }

      if (this.httpServer && this.httpServer.listening) {
        logger.info('Closing HTTP server...');
        
        await new Promise<void>((resolve, reject) => {
          this.httpServer.close((err: any) => {
            if (err) {
              logger.error('Error closing HTTP server:', err);
              reject(err);
            } else {
              logger.info('✓ HTTP server closed');
              resolve();
            }
          });
        });
      }

      logger.info('API Gateway shutdown complete');
      process.exit(0);

    } catch (error) {
      logger.error('Error during shutdown:', error);
      process.exit(1);
    }
  }

  public getWebSocketServer(): WebSocketServer | null {
    return this.wsServer;
  }

  public getStats() {
    return {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      websocket: this.wsServer?.getServerStats() || 'not initialized'
    };
  }
}

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', {
    error: error.message,
    stack: error.stack
  });
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection:', {
    reason: reason,
    promise: promise
  });
  process.exit(1);
});

const gateway = new APIGateway();
gateway.start().catch((error) => {
  logger.error('Failed to start application:', error);
  process.exit(1);
});

export { APIGateway };










// import { createServer } from 'http';
// import dotenv from 'dotenv';
// import { createApp } from './app';
// import { WebSocketServer } from './ws/server'; 
// import { config } from './config/environment';
// import { logger } from './utils/logger';
// import { connectRedis } from './utils/redis';
// import { initializeGrpcClients } from './grpc/client';

// dotenv.config();

// class APIGateway {
//   private httpServer: any;
//   private wsServer: WebSocketServer | null = null;

//   public async start(): Promise<void> {
//     try {
      
//       await connectRedis();
//       await initializeGrpcClients();

//       const app = createApp();

//       this.httpServer = createServer(app);

//       try {
//         this.wsServer = new WebSocketServer(this.httpServer);
//         logger.info('WebSocket server initialized successfully');
//       } catch (wsError) {
//         logger.error('Failed to initialize WebSocket server:', wsError);
//         throw wsError;
//       }

//       app.get('/health/websocket', (req, res) => {
//         if (this.wsServer) {
//           const stats = this.wsServer.getServerStats();
//           res.json({
//             status: 'healthy',
//             websocket: {
//               ...stats,
//               endpoint: `ws://${config.HOST}:${config.PORT}`,
//               transports: ['websocket', 'polling']
//             },
//             timestamp: new Date().toISOString()
//           });
//         } else {
//           res.status(503).json({
//             status: 'error',
//             message: 'WebSocket server not initialized',
//             timestamp: new Date().toISOString()
//           });
//         }
//       });

//       console.log(`Starting server on ${config.HOST}:${config.PORT}`);
      
//       this.httpServer.listen(config.PORT, config.HOST, () => {
//         logger.info('API Gateway started successfully!', {
//           host: config.HOST,
//           port: config.PORT,
//           environment: config.NODE_ENV,
//           pid: process.pid,
//           websocket: 'enabled',
//           endpoints: {
//             http: `http://${config.HOST}:${config.PORT}`,
//             websocket: `ws://${config.HOST}:${config.PORT}`,
//             health: `http://${config.HOST}:${config.PORT}/health`,
//             websocket_health: `http://${config.HOST}:${config.PORT}/health/websocket`
//           }
//         });

//         console.log('📡 API Gateway is Running!');
//         console.log(`🔌 WebSocket endpoint: ws://${config.HOST}:${config.PORT}`);
//       });

//       process.on('SIGTERM', () => this.shutdown('SIGTERM'));
//       process.on('SIGINT', () => this.shutdown('SIGINT'));

//     } catch (error) {
//       logger.error('Failed to start API Gateway:', error);
//       process.exit(1);
//     }
//   }

//   private async shutdown(signal: string): Promise<void> {
//     logger.info(`${signal} received, shutting down API Gateway gracefully...`);

//     try {
//       if (this.wsServer) {
//         logger.info('Closing WebSocket server...');
//         await this.wsServer.close();
//         logger.info('✓ WebSocket server closed');
//       }

//       if (this.httpServer) {
//         logger.info('Closing HTTP server...');
//         this.httpServer.close((err: any) => {
//           if (err) {
//             logger.error('Error closing HTTP server:', err);
//             process.exit(1);
//           } else {
//             logger.info('✓ HTTP server closed');
//             logger.info('API Gateway shutdown complete');
//             process.exit(0);
//           }
//         });

//         setTimeout(() => {
//           logger.error('Force shutdown after 30 seconds timeout');
//           process.exit(1);
//         }, 30000);
//       }
//     } catch (error) {
//       logger.error('Error during shutdown:', error);
//       process.exit(1);
//     }
//   }

//   public getWebSocketServer(): WebSocketServer | null {
//     return this.wsServer;
//   }

//   public getStats() {
//     return {
//       uptime: process.uptime(),
//       memory: process.memoryUsage(),
//       websocket: this.wsServer?.getServerStats() || 'not initialized'
//     };
//   }
// }

// process.on('uncaughtException', (error) => {
//   logger.error('Uncaught Exception:', {
//     error: error.message,
//     stack: error.stack
//   });
//   process.exit(1);
// });

// process.on('unhandledRejection', (reason, promise) => {
//   logger.error('Unhandled Rejection:', {
//     reason: reason,
//     promise: promise
//   });
//   process.exit(1);
// });

// const gateway = new APIGateway();
// gateway.start().catch((error) => {
//   logger.error('Failed to start application:', error);
//   process.exit(1);
// });





// export { APIGateway };
// // AIChatOps