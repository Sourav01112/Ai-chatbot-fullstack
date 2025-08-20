import { createServer } from 'http';
import dotenv from 'dotenv';
import { createApp } from './app';
import { setupWebSocket } from './websocket';
import { config } from './config/environment';
import { logger } from './utils/logger';
import { connectRedis } from './utils/redis';
import { initializeGrpcClients } from './grpc/client';

dotenv.config();

class APIGateway {
  private server: any;
  private wss: any;

  public async start(): Promise<void> {
    try {
      logger.info('Initializing external connections...');
      await connectRedis();

      await initializeGrpcClients()

      const app = createApp();

      this.server = createServer(app);

      this.wss = setupWebSocket(this.server);

  
      console.log(config.PORT, config.HOST,)
      this.server.listen(config.PORT, config.HOST, () => {
        logger.info(`API Gateway started successfully!`, {
          host: config.HOST,
          port: config.PORT,
          environment: config.NODE_ENV,
          pid: process.pid,
        });

        console.log(` API Gateway is Running! `);
      });

      process.on('SIGTERM', () => this.shutdown());
      process.on('SIGINT', () => this.shutdown());

    } catch (error) {
      logger.error('Failed to start API Gateway:', error);
      process.exit(1);
    }
  }

  private async shutdown(): Promise<void> {
    logger.info('Shutting down API Gateway...');

    if (this.wss) {
      this.wss.close();
      logger.info('WebSocket server closed');
    }

    if (this.server) {
      this.server.close(() => {
        logger.info('HTTP server closed');
        logger.info('API Gateway shutdown complete');
        process.exit(0);
      });
    }
  }
}

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

const gateway = new APIGateway();
gateway.start().catch((error) => {
  console.log('Failed to start application:', error);
  process.exit(1);
});