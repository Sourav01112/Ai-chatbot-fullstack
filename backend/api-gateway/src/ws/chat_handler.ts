import { Server as SocketIOServer, Socket } from 'socket.io';
import { logger } from '../utils/logger';
import { chatServiceMethods, userServiceMethods } from '../grpc/client';
import { aiService } from '../service/aiService';
import * as Types from '../types/grpc';

export interface AuthenticatedSocket extends Socket {
  user?: {
    id: string;
    email: string;
    username: string;
  };
  sessionData?: {
    connectedAt: Date;
    lastActivity: Date;
    messageCount: number;
  };
}

export class ChatWebSocketHandler {
  private io: SocketIOServer;
  private activeConnections: Map<string, Set<string>> = new Map(); // sessionId -> socketIds
  private userConnections: Map<string, Set<string>> = new Map(); // userId -> socketIds
  private connectionMetrics = {
    totalConnections: 0,
    activeConnections: 0,
    messagesProcessed: 0,
    aiResponsesGenerated: 0,
    errors: 0
  };

  constructor(io: SocketIOServer) {
    this.io = io;
    this.setupEventHandlers();
    this.startMetricsReporting();
  }

  private setupEventHandlers(): void {
    this.io.use(this.authenticateSocket.bind(this));
    this.io.on('connection', this.handleConnection.bind(this));
  }

  private async authenticateSocket(socket: AuthenticatedSocket, next: any): Promise<void> {
    const startTime = Date.now();
    
    try {
      const token = socket.handshake.auth?.token || 
                    socket.handshake.headers?.authorization?.replace('Bearer ', '');


      console.log({token})              
      
      if (!token) {
        logger.warn('WebSocket authentication failed - no token', {
          socketId: socket.id,
          ip: socket.handshake.address
        });
        return next(new Error('Authentication token required'));
      }

      try {
        const userResponse = await userServiceMethods.verifyToken({ accessToken: token });

        console.log({userResponse})
        
        if (userResponse.error || !userResponse.valid) {
          logger.warn('WebSocket authentication failed - invalid token', {
            socketId: socket.id,
            ip: socket.handshake.address
          });
          return next(new Error('Invalid authentication token'));
        }
        
        socket.user = {
          id: userResponse.user!.id,
          email: userResponse.user!.email,
          username: userResponse.user!.username
        };

        socket.sessionData = {
          connectedAt: new Date(),
          lastActivity: new Date(),
          messageCount: 0
        };

        logger.info('WebSocket client authenticated successfully', {
          userId: socket.user.id,
          username: socket.user.username,
          socketId: socket.id,
          authTime: Date.now() - startTime
        });

        next();
      } catch (authError) {
        logger.error('WebSocket authentication error', {
          error: authError,
          socketId: socket.id,
          authTime: Date.now() - startTime
        });
        return next(new Error('Authentication service unavailable'));
      }

    } catch (error) {
      logger.error('WebSocket authentication failed', {
        error: error,
        socketId: socket.id,
        authTime: Date.now() - startTime
      });
      next(new Error('Authentication failed'));
    }
  }

  private handleConnection(socket: AuthenticatedSocket): void {
    const userId = socket.user!.id;
    const socketId = socket.id;
    
    this.connectionMetrics.totalConnections++;
    this.connectionMetrics.activeConnections++;

    if (!this.userConnections.has(userId)) {
      this.userConnections.set(userId, new Set());
    }
    this.userConnections.get(userId)!.add(socketId);

    logger.info('WebSocket client connected', {
      userId,
      socketId,
      totalConnections: this.connectionMetrics.activeConnections,
      userAgent: socket.handshake.headers['user-agent']
    });

    socket.join(`user-${userId}`);

    socket.emit('connected', {
      user_id: userId,
      socket_id: socketId,
      server_time: new Date().toISOString(),
      connection_id: require('crypto').randomUUID()
    });

    socket.on('join_session', (data) => this.withErrorHandling(socket, 'join_session', () => 
      this.handleJoinSession(socket, data)
    ));
    
    socket.on('leave_session', (data) => this.withErrorHandling(socket, 'leave_session', () => 
      this.handleLeaveSession(socket, data)
    ));
    
    socket.on('send_message', (data) => this.withErrorHandling(socket, 'send_message', () => 
      this.handleSendMessage(socket, data)
    ));
    
    socket.on('typing_start', (data) => this.withErrorHandling(socket, 'typing_start', () => 
      this.handleTypingStart(socket, data)
    ));
    
    socket.on('typing_stop', (data) => this.withErrorHandling(socket, 'typing_stop', () => 
      this.handleTypingStop(socket, data)
    ));
    
    socket.on('ping', () => {
      socket.sessionData!.lastActivity = new Date();
      socket.emit('pong', { timestamp: new Date().toISOString() });
    });
    
    socket.on('disconnect', (reason) => this.handleDisconnect(socket, reason));
    
    this.setupConnectionMonitoring(socket);
  }

  private withErrorHandling(socket: AuthenticatedSocket, eventName: string, handler: () => Promise<void>): void {
    handler().catch((error) => {
      this.connectionMetrics.errors++;
      
      logger.error(`WebSocket ${eventName} handler error`, {
        error: error,
        userId: socket.user?.id,
        socketId: socket.id,
        eventName
      });

      socket.emit('error', {
        type: `${eventName}_error`,
        message: 'An error occurred while processing your request',
        timestamp: new Date().toISOString(),
        event: eventName
      });
    });
  }

  private setupConnectionMonitoring(socket: AuthenticatedSocket): void {
    const timeoutDuration = 30 * 60 * 1000; // 30 minutes
    
    const checkActivity = () => {
      const lastActivity = socket.sessionData?.lastActivity;
      if (lastActivity && Date.now() - lastActivity.getTime() > timeoutDuration) {
        logger.info('Disconnecting idle WebSocket connection', {
          userId: socket.user?.id,
          socketId: socket.id,
          idleTime: Date.now() - lastActivity.getTime()
        });
        socket.disconnect(true);
      }
    };

    const activityInterval = setInterval(checkActivity, 5 * 60 * 1000); // Check every 5 minutes

    socket.on('disconnect', () => {
      clearInterval(activityInterval);
    });
  }

  private async handleJoinSession(socket: AuthenticatedSocket, data: { session_id: string }): Promise<void> {

  console.log("Raw data received:", data);
  console.log("Data type:", typeof data);
  console.log("Data keys:", Object.keys(data || {}));
  console.log("JSON stringify:", JSON.stringify(data));


    const { session_id } = data;

      console.log("calledddd")


    const userId = socket.user!.id;
    const socketId = socket.id;


  console.log({session_id, userId, socketId})


    if (!session_id || typeof session_id !== 'string') {
      socket.emit('error', { 
        type: 'invalid_session_id',
        message: 'Valid session_id is required' 
      });
      return;
    }

    try {
      logger.info('User attempting to join session via WebSocket', { 
        userId, 
        sessionId: session_id,
        socketId 
      });

      const sessionResponse = await chatServiceMethods.getSession({
        sessionId: session_id,
        userId
      });

      console.log({sessionResponse})

      if (!sessionResponse.success || !sessionResponse.session) {
        logger.warn('WebSocket session access denied', { 
          userId, 
          sessionId: session_id,
          error: sessionResponse.error 
        });
        
        socket.emit('error', { 
          type: 'session_access_denied',
          message: 'Session not found or access denied',
          session_id 
        });
        return;
      }

      if (!this.activeConnections.has(session_id)) {
        this.activeConnections.set(session_id, new Set());
      }
      this.activeConnections.get(session_id)!.add(socketId);

      socket.join(`session-${session_id}`);
      
      socket.sessionData!.lastActivity = new Date();

      socket.emit('session_joined', {
        session_id,
        session: {
          id: sessionResponse.session.id,
          title: sessionResponse.session.title,
          status: sessionResponse.session.status,
          settings: sessionResponse.session.settings,
          created_at: sessionResponse.session.createdAt,
          last_activity: sessionResponse.session.lastActivity
        },
        joined_at: new Date().toISOString()
      });

      socket.to(`session-${session_id}`).emit('user_joined_session', {
        user_id: userId,
        session_id,
        timestamp: new Date().toISOString()
      });

      logger.info('User joined session successfully via WebSocket', {
        userId,
        sessionId: session_id,
        socketId,
        activeSessionConnections: this.activeConnections.get(session_id)!.size
      });

    } catch (error) {
      logger.error('Failed to join session via WebSocket', {
        error,
        userId,
        sessionId: session_id,
        socketId
      });
      
      socket.emit('error', { 
        type: 'join_session_error',
        message: 'Failed to join session',
        session_id 
      });
    }
  }

  private async handleLeaveSession(socket: AuthenticatedSocket, data: { session_id: string }): Promise<void> {
    const { session_id } = data;
    const userId = socket.user!.id;
    const socketId = socket.id;

    if (!session_id) {
      socket.emit('error', { 
        type: 'invalid_session_id',
        message: 'session_id is required' 
      });
      return;
    }

    try {
      if (this.activeConnections.has(session_id)) {
        this.activeConnections.get(session_id)!.delete(socketId);
        if (this.activeConnections.get(session_id)!.size === 0) {
          this.activeConnections.delete(session_id);
        }
      }

      socket.leave(`session-${session_id}`);
      
      socket.to(`session-${session_id}`).emit('user_left_session', {
        user_id: userId,
        session_id,
        timestamp: new Date().toISOString()
      });

      socket.emit('session_left', { 
        session_id,
        left_at: new Date().toISOString()
      });
      
      logger.info('User left session via WebSocket', {
        userId,
        sessionId: session_id,
        socketId,
        remainingConnections: this.activeConnections.get(session_id)?.size || 0
      });

    } catch (error) {
      logger.error('Error leaving session', {
        error,
        userId,
        sessionId: session_id,
        socketId
      });
    }
  }

  private async handleSendMessage(socket: AuthenticatedSocket, data: { 
    session_id: string; 
    content: string; 
    type?: string;
    parent_message_id?: string;
  }): Promise<void> {
    const startTime = Date.now();
    const messageId = require('crypto').randomUUID();
        
        try {
    let parsedData = data;
      if (typeof data === 'string') {
        try {
          parsedData = JSON.parse(data);
        } catch (e) {
          console.error('Failed to parse JSON:', e);
          return;
        }
      }


      const { session_id, content, type = 'user', parent_message_id = '' } = parsedData;
      const userId = socket.user!.id;
      const socketId = socket.id;

      if (!session_id || !content || content.trim().length === 0) {
        socket.emit('message_error', {
          session_id,
          type: 'invalid_input',
          error: 'session_id and content are required',
          message_id: messageId
        });
        return;
      }

      if (content.length > 10000) {
        socket.emit('message_error', {
          session_id,
          type: 'content_too_long',
          error: 'Message content exceeds maximum length',
          message_id: messageId
        });
        return;
      }

      socket.sessionData!.lastActivity = new Date();
      socket.sessionData!.messageCount++;
      this.connectionMetrics.messagesProcessed++;

      logger.info('Processing WebSocket message', {
        messageId,
        sessionId: session_id,
        userId,
        socketId,
        messageLength: content.length,
        type,
        messageCount: socket.sessionData!.messageCount
      });

      socket.to(`session-${session_id}`).emit('user_typing_stop', { 
        user_id: userId,
        session_id,
        timestamp: new Date().toISOString()
      });

      const sessionResponse = await chatServiceMethods.getSession({
        sessionId: session_id,
        userId
      });

      if (!sessionResponse.success || !sessionResponse.session) {
        socket.emit('message_error', {
          session_id,
          type: 'session_access_denied',
          error: 'Session not found or access denied',
          message_id: messageId
        });
        return;
      }

      const userMessageResponse: Types.SendMessageResponse = await chatServiceMethods.sendMessage({
        sessionId: session_id,
        userId,
        content: content.trim(),
        type,
        metadata: {
          sourceCitations: {},
          relevanceScore: 0,
          tags: ['websocket'],
          modelUsed: '',
          tokenCount: 0,
          responseTimeMs: 0,
          processingSteps: ['websocket_message']
        },
        parentMessageId: parent_message_id
      });

      if (!userMessageResponse.success || !userMessageResponse.message) {
        socket.emit('message_error', {
          session_id,
          type: 'storage_failed',
          error: 'Failed to store message',
          message_id: messageId
        });
        return;
      }

      this.io.to(`session-${session_id}`).emit('message_received', {
        message: {
          id: userMessageResponse.message.id,
          session_id: session_id,
          user_id: userId,
          content: userMessageResponse.message.content,
          type: userMessageResponse.message.type,
          created_at: userMessageResponse.message.createdAt,
          metadata: userMessageResponse.message.metadata,
          parent_message_id: userMessageResponse.message.parentMessageId
        },
        broadcast_time: new Date().toISOString(),
        message_id: messageId
      });

      if (type === 'user') {
        await this.generateAndStreamAIResponse(
          socket, 
          session_id, 
          userId, 
          content.trim(), 
          userMessageResponse.message.id,
          sessionResponse.session,
          messageId
        );
      }

    } catch (error) {
      this.connectionMetrics.errors++;
      
      logger.error('Failed to process WebSocket message', {
        error,
        messageId,
        userId: socket.user?.id,
        sessionId: data.session_id,
        socketId: socket.id
      });

      socket.emit('message_error', {
        session_id: data.session_id,
        type: 'processing_failed',
        error: 'Failed to process message',
        message_id: messageId
      });
    }
  }

  private async generateAndStreamAIResponse(
    socket: AuthenticatedSocket, 
    sessionId: string, 
    userId: string, 
    userMessage: string,
    parentMessageId: string,
    session: any,
    originalMessageId: string
  ): Promise<void> {
    const startTime = Date.now();
    const aiRequestId = require('crypto').randomUUID();
    let accumulatedResponse = '';
    let chunkCount = 0;
    let assistantMessageId = '';

    try {
      this.connectionMetrics.aiResponsesGenerated++;

      logger.info('Starting AI response generation via WebSocket', {
        aiRequestId,
        sessionId,
        userId,
        originalMessageId,
        userMessage: userMessage.substring(0, 100) + (userMessage.length > 100 ? '...' : '')
      });

      this.io.to(`session-${sessionId}`).emit('ai_typing_start', {
        session_id: sessionId,
        ai_request_id: aiRequestId,
        timestamp: new Date().toISOString()
      });

      const historyResponse = await chatServiceMethods.getChatHistory({
        sessionId,
        userId,
        limit: 10,
        offset: 0
      });

      if (!historyResponse.success) {
        throw new Error(`Failed to get conversation history: ${historyResponse.error}`);
      }

      await new Promise<void>((resolve, reject) => {
        const timeoutDuration = 60000; // 60 seconds
        const timeoutId = setTimeout(() => {
          logger.error('AI Service timeout via WebSocket', { 
            aiRequestId,
            sessionId, 
            userId,
            timeoutDuration 
          });
          reject(new Error('AI Service timeout'));
        }, timeoutDuration);

        aiService.generateStreamResponse(
          sessionId,
          userId,
          userMessage,
          historyResponse.messages || [],
          session.settings || {},
          
          (chunk: string) => {
            chunkCount++;
            accumulatedResponse += chunk;
            
            logger.debug('Streaming AI chunk via WebSocket', {
              aiRequestId,
              sessionId,
              chunkNumber: chunkCount,
              chunkLength: chunk.length,
              totalLength: accumulatedResponse.length
            });

            this.io.to(`session-${sessionId}`).emit('ai_response_chunk', {
              session_id: sessionId,
              ai_request_id: aiRequestId,
              chunk_number: chunkCount,
              content: chunk,
              total_length: accumulatedResponse.length,
              timestamp: new Date().toISOString(),
              is_final: false
            });
          },
          
          async (metadata: any) => {
            clearTimeout(timeoutId);
            
            try {
              const totalTime = Date.now() - startTime;
              
              logger.info('AI streaming completed via WebSocket', {
                aiRequestId,
                sessionId,
                userId,
                totalChunks: chunkCount,
                responseLength: accumulatedResponse.length,
                totalTime
              });

              this.io.to(`session-${sessionId}`).emit('ai_typing_stop', {
                session_id: sessionId,
                ai_request_id: aiRequestId,
                timestamp: new Date().toISOString()
              });

              const aiMessageResponse: Types.SendMessageResponse = await chatServiceMethods.sendMessage({
                sessionId,
                userId,
                content: accumulatedResponse,
                type: 'assistant',
                metadata: metadata?.metadata || {
                  sourceCitations: {},
                  modelUsed: 'websocket_streaming',
                  tokenCount: accumulatedResponse.split(' ').length,
                  responseTimeMs: totalTime,
                  relevanceScore: 0.8,
                  tags: ['streamed', 'websocket', 'ai_generated'],
                  processingSteps: ['websocket_ai_streaming']
                },
                parentMessageId: parentMessageId
              });

              if (aiMessageResponse.success && aiMessageResponse.message) {
                assistantMessageId = aiMessageResponse.message.id;
                
                this.io.to(`session-${sessionId}`).emit('ai_response_complete', {
                  message: {
                    id: aiMessageResponse.message.id,
                    session_id: sessionId,
                    user_id: userId,
                    content: aiMessageResponse.message.content,
                    type: aiMessageResponse.message.type,
                    created_at: aiMessageResponse.message.createdAt,
                    metadata: aiMessageResponse.message.metadata,
                    parent_message_id: aiMessageResponse.message.parentMessageId
                  },
                  ai_request_id: aiRequestId,
                  streaming_stats: {
                    total_chunks: chunkCount,
                    response_length: accumulatedResponse.length,
                    response_time_ms: totalTime,
                    chunks_per_second: Math.round(chunkCount / (totalTime / 1000)),
                    words_per_minute: Math.round((accumulatedResponse.split(' ').length / totalTime) * 60000)
                  },
                  timestamp: new Date().toISOString()
                });

                logger.info('AI response saved and broadcasted via WebSocket', {
                  aiRequestId,
                  sessionId,
                  assistantMessageId,
                  totalTime,
                  originalMessageId
                });
              } else {
                throw new Error(`Failed to save AI response: ${aiMessageResponse.error}`);
              }

              resolve();
            } catch (saveError) {
              logger.error('Error saving AI response via WebSocket', {
                error: saveError,
                aiRequestId,
                sessionId,
                userId
              });
              
              this.io.to(`session-${sessionId}`).emit('ai_response_error', {
                session_id: sessionId,
                ai_request_id: aiRequestId,
                type: 'save_failed',
                error: 'Failed to save AI response',
                partial_response: accumulatedResponse,
                timestamp: new Date().toISOString()
              });
              
              reject(saveError);
            }
          },
          
          (error: Error) => {
            clearTimeout(timeoutId);
            logger.error('AI streaming error via WebSocket', {
              error,
              aiRequestId,
              sessionId,
              userId
            });
            
            this.io.to(`session-${sessionId}`).emit('ai_typing_stop', {
              session_id: sessionId,
              ai_request_id: aiRequestId,
              timestamp: new Date().toISOString()
            });
            
            this.io.to(`session-${sessionId}`).emit('ai_response_error', {
              session_id: sessionId,
              ai_request_id: aiRequestId,
              type: 'streaming_failed',
              error: error.message,
              partial_response: accumulatedResponse,
              timestamp: new Date().toISOString()
            });
            
            reject(error);
          }
        );
      });

    } catch (error) {
      this.connectionMetrics.errors++;
      
      logger.error('Failed to generate AI response via WebSocket', {
        error,
        aiRequestId,
        sessionId,
        userId
      });
      
      this.io.to(`session-${sessionId}`).emit('ai_typing_stop', {
        session_id: sessionId,
        ai_request_id: aiRequestId,
        timestamp: new Date().toISOString()
      });

      try {
        const fallbackResponse: Types.SendMessageResponse = await chatServiceMethods.sendMessage({
          sessionId,
          userId,
          content: 'I apologize, but I\'m experiencing technical difficulties. Please try again in a moment.',
          type: 'assistant',
          metadata: {
            sourceCitations: {},
            modelUsed: 'fallback_websocket',
            tokenCount: 15,
            responseTimeMs: Date.now() - startTime,
            relevanceScore: 0,
            tags: ['fallback', 'error', 'websocket'],
            processingSteps: ['fallback_generation']
          },
          parentMessageId: parentMessageId
        });

        if (fallbackResponse.success && fallbackResponse.message) {
          this.io.to(`session-${sessionId}`).emit('ai_response_complete', {
            message: {
              id: fallbackResponse.message.id,
              session_id: sessionId,
              user_id: userId,
              content: fallbackResponse.message.content,
              type: fallbackResponse.message.type,
              created_at: fallbackResponse.message.createdAt,
              metadata: fallbackResponse.message.metadata,
              parent_message_id: fallbackResponse.message.parentMessageId
            },
            ai_request_id: aiRequestId,
            is_fallback: true,
            timestamp: new Date().toISOString()
          });

          logger.info('Fallback response sent via WebSocket', {
            aiRequestId,
            sessionId,
            fallbackMessageId: fallbackResponse.message.id
          });
        }
      } catch (fallbackError) {
        logger.error('Fallback response also failed via WebSocket', {
          error: fallbackError,
          aiRequestId,
          sessionId,
          userId
        });
        
        this.io.to(`session-${sessionId}`).emit('ai_response_error', {
          session_id: sessionId,
          ai_request_id: aiRequestId,
          type: 'complete_failure',
          error: 'Both AI response and fallback failed',
          timestamp: new Date().toISOString()
        });
      }
    }
  }

  private async handleTypingStart(socket: AuthenticatedSocket, data: { session_id: string }): Promise<void> {
    const { session_id } = data;
    const userId = socket.user!.id;
    
    if (!session_id) {
      socket.emit('error', { 
        type: 'invalid_session_id',
        message: 'session_id is required' 
      });
      return;
    }

    try {
      socket.sessionData!.lastActivity = new Date();

      socket.to(`session-${session_id}`).emit('user_typing_start', {
        user_id: userId,
        session_id,
        timestamp: new Date().toISOString()
      });

      await chatServiceMethods.updateTypingStatus({
        sessionId: session_id,
        userId: userId,
        isTyping: true
      });

      logger.debug('User started typing', {
        userId,
        sessionId: session_id,
        socketId: socket.id
      });

    } catch (error) {
      logger.error('Failed to handle typing start', {
        error,
        userId,
        sessionId: session_id,
        socketId: socket.id
      });
    }
  }

  private async handleTypingStop(socket: AuthenticatedSocket, data: { session_id: string }): Promise<void> {
    const { session_id } = data;
    const userId = socket.user!.id;
    
    if (!session_id) {
      socket.emit('error', { 
        type: 'invalid_session_id',
        message: 'session_id is required' 
      });
      return;
    }

    try {
      socket.sessionData!.lastActivity = new Date();

      socket.to(`session-${session_id}`).emit('user_typing_stop', {
        user_id: userId,
        session_id,
        timestamp: new Date().toISOString()
      });

      await chatServiceMethods.updateTypingStatus({
        sessionId: session_id,
        userId: userId,
        isTyping: false
      });

      logger.debug('User stopped typing', {
        userId,
        sessionId: session_id,
        socketId: socket.id
      });

    } catch (error) {
      logger.error('Failed to handle typing stop', {
        error,
        userId,
        sessionId: session_id,
        socketId: socket.id
      });
    }
  }

  private handleDisconnect(socket: AuthenticatedSocket, reason: string): void {
    const userId = socket.user?.id;
    const socketId = socket.id;
    
    this.connectionMetrics.activeConnections--;

    if (userId && this.userConnections.has(userId)) {
      this.userConnections.get(userId)!.delete(socketId);
      if (this.userConnections.get(userId)!.size === 0) {
        this.userConnections.delete(userId);
      }
    }

    for (const [sessionId, socketIds] of this.activeConnections.entries()) {
      if (socketIds.has(socketId)) {
        socketIds.delete(socketId);
        if (socketIds.size === 0) {
          this.activeConnections.delete(sessionId);
        }
        
        socket.to(`session-${sessionId}`).emit('user_disconnected', {
          user_id: userId,
          session_id: sessionId,
          timestamp: new Date().toISOString()
        });
      }
    }

    const sessionStats = socket.sessionData;
    const sessionDuration = sessionStats ? Date.now() - sessionStats.connectedAt.getTime() : 0;

    logger.info('WebSocket client disconnected', {
      userId,
      socketId,
      reason,
      sessionDuration,
      messageCount: sessionStats?.messageCount || 0,
      activeConnections: this.connectionMetrics.activeConnections
    });
  }

  private startMetricsReporting(): void {
    setInterval(() => {
      logger.info('WebSocket connection metrics', {
        ...this.connectionMetrics,
        activeSessionConnections: this.activeConnections.size,
        activeUserConnections: this.userConnections.size,
        timestamp: new Date().toISOString()
      });
    }, 5 * 60 * 1000); // Report every 5 minutes
  }

  public getMetrics() {
    return {
      ...this.connectionMetrics,
      activeSessionConnections: this.activeConnections.size,
      activeUserConnections: this.userConnections.size,
      sessionDetails: Array.from(this.activeConnections.entries()).map(([sessionId, sockets]) => ({
        sessionId,
        connectionCount: sockets.size
      }))
    };
  }

  public getUserConnections(userId: string): number {
    return this.userConnections.get(userId)?.size || 0;
  }

  public getSessionConnections(sessionId: string): number {
    return this.activeConnections.get(sessionId)?.size || 0;
  }
}


