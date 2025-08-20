import * as grpc from '@grpc/grpc-js';
import { UserServiceClient } from '../generated/user_service';
import { config } from '../config/environment';
import { logger } from '../utils/logger';
import * as Types from '../types/grpc';

export let userServiceClient: UserServiceClient;

const getClientCredentials = () => {
  if (config.NODE_ENV === 'production') {
    return grpc.credentials.createSsl();
  } else {
    return grpc.credentials.createInsecure();
  }
};

const getChannelOptions = () => {
  return {
    'grpc.keepalive_time_ms': 30000,
    'grpc.keepalive_timeout_ms': 5000,
    'grpc.keepalive_permit_without_calls': 1,
    'grpc.http2.max_pings_without_data': 0,
    'grpc.http2.min_time_between_pings_ms': 10000,
    'grpc.http2.min_ping_interval_without_data_ms': 300000,
  } as any;
};

function initializeUserService(): Promise<void> {
  return new Promise((resolve) => {
    try {
      userServiceClient = new UserServiceClient(
        config.USER_SERVICE_URL,
        getClientCredentials(),
        getChannelOptions()
      );

      const deadline = new Date();
      deadline.setSeconds(deadline.getSeconds() + 5);

      userServiceClient.waitForReady(deadline, (error) => {
        if (error) {
          logger.warn('User Service not ready, will retry later:', error.message);
          resolve();
        } else {
          logger.info('User Service gRPC client connected -- ');
          resolve();
        }
      });
    } catch (error) {
      logger.error('Failed to initialize User Service client:', error);
      resolve();
    }
  });
}

export async function initializeGrpcClients(): Promise<void> {
  logger.info('Initializing gRPC clients...');
  await initializeUserService();
  logger.info('gRPC client initialization complete');
}

export function closeGrpcClients(): void {
  logger.info('Closing gRPC clients...');
  if (userServiceClient) {
    userServiceClient.close();
    logger.info('User Service client closed');
  }
}

export async function checkGrpcHealth(): Promise<{ userService: boolean }> {
  const health = { userService: false };

  if (userServiceClient) {
    try {
      const deadline = new Date();
      deadline.setSeconds(deadline.getSeconds() + 2);

      await new Promise<void>((resolve, reject) => {
        userServiceClient.waitForReady(deadline, (error) => {
          if (error) {
            reject(error);
          } else {
            health.userService = true;
            resolve();
          }
        });
      });
    } catch (error: any) {
      // Service not healthy
      console.log('User Service is not healthy:', error.message);
    }
  }

  return health;
}

// ---- gRPC method wrappings ----
export const userServiceMethods = {
  async verifyToken(request: Types.VerifyTokenRequest): Promise<Types.VerifyTokenResponse> {
    return new Promise((resolve, reject) => {
      userServiceClient.verifyToken(request as any, (error: any, response: any) => {
        if (error) {
          reject(error);
        } else {
          resolve(response as Types.VerifyTokenResponse);
        }
      });
    });
  },

  async register(request: Types.RegisterRequest): Promise<Types.RegisterResponse> {
    return new Promise((resolve, reject) => {
      userServiceClient.register(request as any, (error: any, response: any) => {
        if (error) {
          reject(error);
        } else {
          resolve(response as Types.RegisterResponse);
        }
      });
    });
  },

  async login(request: Types.LoginRequest): Promise<Types.LoginResponse> {
    return new Promise((resolve, reject) => {
      userServiceClient.login(request as any, (error: any, response: any) => {
        if (error) {
          reject(error);
        } else {
          resolve(response as Types.LoginResponse);
        }
      });
    });
  },

  async getUser(request: Types.GetUserRequest): Promise<Types.GetUserResponse> {
    return new Promise((resolve, reject) => {
      userServiceClient.getUser(request as any, (error: any, response: any) => {
        if (error) {
          reject(error);
        } else {
          resolve(response as Types.GetUserResponse);
        }
      });
    });
  },

  async updateUser(request: Types.UpdateUserRequest): Promise<Types.UpdateUserResponse> {
    return new Promise((resolve, reject) => {
      userServiceClient.updateUser(request as any, (error: any, response: any) => {
        if (error) {
          reject(error);
        } else {
          resolve(response as Types.UpdateUserResponse);
        }
      });
    });
  },

  async getPreferences(request: Types.GetPreferencesRequest): Promise<Types.GetPreferencesResponse> {
    return new Promise((resolve, reject) => {
      userServiceClient.getPreferences(request as any, (error: any, response: any) => {
        if (error) {
          reject(error);
        } else {
          resolve(response as Types.GetPreferencesResponse);
        }
      });
    });
  },

  async updatePreferences(request: Types.UpdatePreferencesRequest): Promise<Types.UpdatePreferencesResponse> {
    return new Promise((resolve, reject) => {
      userServiceClient.updatePreferences(request as any, (error: any, response: any) => {
        if (error) {
          reject(error);
        } else {
          resolve(response as Types.UpdatePreferencesResponse);
        }
      });
    });
  },

  async refreshToken(request: Types.RefreshTokenRequest): Promise<Types.RefreshTokenResponse> {
    return new Promise((resolve, reject) => {
      userServiceClient.refreshToken(request as any, (error: any, response: any) => {
        if (error) {
          reject(error);
        } else {
          resolve(response as Types.RefreshTokenResponse);
        }
      });
    });
  },

  async logout(request: Types.LogoutRequest): Promise<void> {
    return new Promise((resolve, reject) => {
      userServiceClient.logout(request as any, (error: any) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });
  },

  async deleteUser(request: Types.DeleteUserRequest): Promise<void> {
    return new Promise((resolve, reject) => {
      userServiceClient.deleteUser(request as any, (error: any) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });
  }
};