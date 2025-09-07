import { Router, Request, Response, NextFunction } from 'express';
import { createSessionSchema, sendMessageSchema, updateSessionSchema } from "../utils/helper";
import { chatServiceMethods } from '../grpc/client';
import { authMiddleware } from '../middleware/auth';
import { ApiError } from '../utils/ApiError';
import { logger } from '../utils/logger';
import { aiService } from "../service/aiService";
import * as Types from '../types/grpc';
import { rateLimit, ipKeyGenerator } from 'express-rate-limit';
import requestIp from 'request-ip';


const router = Router();

router.use(authMiddleware);
router.use(requestIp.mw());


const messageRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  keyGenerator: (req: Request) => {
    const clientIp = (req as any).clientIp || req.ip || '';
    return req.user?.id || ipKeyGenerator(clientIp);
  },
  message: { 
    success: false, 
    error: 'Too many messages. Please wait before sending another message.' 
  }
});

router.use('/sessions/:sessionId/messages', messageRateLimit);


router.post('/sessions', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { error, value } = createSessionSchema.validate(req.body);
    if (error) {
      throw new ApiError(400, error.details[0].message);
    }

    const response: Types.CreateSessionResponse = await chatServiceMethods.createSession({
      userId: req.user!.id,
      title: value.title,
      settings: {
        aiPersona: value.settings.ai_persona,
        temperature: value.settings.temperature,
        maxTokens: value.settings.max_tokens,
        enableRag: value.settings.enable_rag,
        documentSources: value.settings.document_sources,
        systemPrompt: value.settings.system_prompt
      }
    });

    if (!response.success || !response.session) {
      throw new ApiError(400, response.error || 'Failed to create session');
    }

    logger.info('Session created successfully', {
      sessionId: response.session.id,
      userId: req.user!.id,
      ip: req.ip,
    });

    res.status(201).json({
      success: true,
      data: {
        session: {
          id: response.session.id,
          title: response.session.title,
          status: response.session.status,
          settings: response.session.settings,
          created_at: response.session.createdAt,
          last_activity: response.session.lastActivity
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

router.get('/sessions', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const offset = parseInt(req.query.offset as string) || 0;

    const response: Types.GetUserSessionsResponse = await chatServiceMethods.getUserSessions({
      userId: req.user!.id,
      limit,
      offset
    });

    if (!response.success) {
      throw new ApiError(400, response.error || 'Failed to get sessions');
    }

    res.json({
      success: true,
      data: {
        sessions: response.sessions.map(session => ({
          id: session.id,
          title: session.title,
          status: session.status,
          created_at: session.createdAt,
          updated_at: session.updatedAt,
          last_activity: session.lastActivity
        })),
        total_count: response.totalCount,
        has_more: response.hasMore
      }
    });
  } catch (error) {
    next(error);
  }
});

router.get('/sessions/:sessionId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const response: Types.GetSessionResponse = await chatServiceMethods.getSession({
      sessionId: req.params.sessionId,
      userId: req.user!.id
    });

    if (!response.success || !response.session) {
      throw new ApiError(404, response.error || 'Session not found');
    }

    res.json({
      success: true,
      data: {
        session: {
          id: response.session.id,
          title: response.session.title,
          status: response.session.status,
          settings: response.session.settings,
          created_at: response.session.createdAt,
          updated_at: response.session.updatedAt,
          last_activity: response.session.lastActivity
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

router.put('/sessions/:sessionId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { error, value } = updateSessionSchema.validate(req.body);
    if (error) {
      throw new ApiError(400, error.details[0].message);
    }

    const updateRequest: Types.UpdateSessionRequest = {
      sessionId: req.params.sessionId,
      userId: req.user!.id
    };

    if (value.title) updateRequest.title = value.title;
    if (value.status) updateRequest.status = value.status;
    if (value.settings) {
      updateRequest.settings = {
        aiPersona: value.settings.ai_persona,
        temperature: value.settings.temperature,
        maxTokens: value.settings.max_tokens,
        enableRag: value.settings.enable_rag,
        documentSources: value.settings.document_sources,
        systemPrompt: value.settings.system_prompt
      };
    }

    const response: Types.UpdateSessionResponse = await chatServiceMethods.updateSession(updateRequest);

    if (!response.success || !response.session) {
      throw new ApiError(400, response.error || 'Failed to update session');
    }

    res.json({
      success: true,
      message: 'Session updated successfully',
      data: {
        session: {
          id: response.session.id,
          title: response.session.title,
          status: response.session.status,
          settings: response.session.settings,
          updated_at: response.session.updatedAt
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

router.delete('/sessions/:sessionId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await chatServiceMethods.deleteSession({
      sessionId: req.params.sessionId,
      userId: req.user!.id
    });

    logger.info('Session deleted successfully', {
      sessionId: req.params.sessionId,
      userId: req.user!.id
    });

    res.json({
      success: true,
      message: 'Session deleted successfully'
    });
  } catch (error) {
    next(error);
  }
});

router.post('/sessions/:sessionId/messages', async (req: Request, res: Response, next: NextFunction) => {
  const requestId = require('crypto').randomUUID();
  const startTime = Date.now();

  try {
    logger.info('Message request started', {
      requestId,
      sessionId: req.params.sessionId,
      userId: req.user!.id,
      timestamp: new Date().toISOString()
    });

    const { error, value } = sendMessageSchema.validate(req.body);
    if (error) {
      throw new ApiError(400, error.details[0].message);
    }

    const sessionId = req.params.sessionId;
    const userId = req.user!.id;

    const sessionResponse: Types.GetSessionResponse = await chatServiceMethods.getSession({
      sessionId,
      userId
    });

    if (!sessionResponse.success || !sessionResponse.session) {
      throw new ApiError(404, 'Session not found or access denied');
    }

    const userMessageResponse: Types.SendMessageResponse = await chatServiceMethods.sendMessage({
      sessionId,
      userId,
      content: value.content,
      type: value.type || 'user',
      metadata: {
        sourceCitations: {},
        relevanceScore: 0,
        tags: [],
        modelUsed: '',
        tokenCount: 0,
        responseTimeMs: 0,
        processingSteps: []
      },
      parentMessageId: value.parent_message_id || ''
    });

    if (!userMessageResponse.success || !userMessageResponse.message) {
      throw new ApiError(400, userMessageResponse.error || 'Failed to send message');
    }

    let assistantMessage = null;

    if (value.type === 'user' || !value.type) {
      try {
        const historyResponse: Types.GetChatHistoryResponse = await chatServiceMethods.getChatHistory({
          sessionId,
          userId,
          limit: 10,
          offset: 0
        });

        if (historyResponse.success && sessionResponse.session.settings) {
          logger.info('Generating AI response', {
            requestId,
            sessionId,
            userId,
            historyCount: historyResponse.messages?.length || 0
          });

          let accumulatedResponse = '';
          let finalMetadata: any = null;

          await new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(() => {
              reject(new Error('AI response timeout'));
            }, 45000); // 45 second 

            aiService.generateStreamResponse(
              sessionId,
              userId,
              value.content,
              historyResponse.messages || [],
              sessionResponse.session!.settings!,
              
              //  chunks being added...
              (chunk: string) => {
                accumulatedResponse += chunk;
              },
              
              (metadata: any) => {
                clearTimeout(timeout);
                finalMetadata = metadata;
                resolve();
              },
              
              (error: Error) => {
                clearTimeout(timeout);
                reject(error);
              }
            );
          });

          const aiMessageResponse: Types.SendMessageResponse = await chatServiceMethods.sendMessage({
            sessionId,
            userId,
            content: accumulatedResponse,
            type: 'assistant',
            metadata: finalMetadata?.metadata || {
              sourceCitations: {},
              modelUsed: 'assistant',
              tokenCount: accumulatedResponse.split(' ').length,
              responseTimeMs: Date.now() - startTime,
              relevanceScore: 0.8,
              tags: ['complete_response'],
              processingSteps: ['ai_generation']
            },
            parentMessageId: userMessageResponse.message.id
          });

          if (aiMessageResponse.success && aiMessageResponse.message) {
            assistantMessage = {
              id: aiMessageResponse.message.id,
              content: aiMessageResponse.message.content,
              type: aiMessageResponse.message.type,
              metadata: aiMessageResponse.message.metadata,
              created_at: aiMessageResponse.message.createdAt,
              parent_message_id: aiMessageResponse.message.parentMessageId
            };
          }
        }
      } catch (aiError) {
        logger.error('AI response generation failed', {
          requestId,
          error: aiError,
          sessionId,
          userId
        });

        const fallbackResponse: Types.SendMessageResponse = await chatServiceMethods.sendMessage({
          sessionId,
          userId,
          content: 'I apologize, but I\'m experiencing technical difficulties. Please try again in a moment.',
          type: 'assistant',
          metadata: {
            sourceCitations: {},
            modelUsed: 'fallback',
            tokenCount: 15,
            responseTimeMs: Date.now() - startTime,
            relevanceScore: 0,
            tags: ['fallback', 'error'],
            processingSteps: ['fallback_generation']
          },
          parentMessageId: userMessageResponse.message.id
        });

        if (fallbackResponse.success && fallbackResponse.message) {
          assistantMessage = {
            id: fallbackResponse.message.id,
            content: fallbackResponse.message.content,
            type: fallbackResponse.message.type,
            metadata: fallbackResponse.message.metadata,
            created_at: fallbackResponse.message.createdAt,
            parent_message_id: fallbackResponse.message.parentMessageId
          };
        }
      }
    }

    const totalTime = Date.now() - startTime;
    
    logger.info('Message request completed', {
      requestId,
      sessionId,
      userId,
      totalTime,
      hasAIResponse: !!assistantMessage
    });

    res.status(201).json({
      success: true,
      data: {
        user_message: {
          id: userMessageResponse.message.id,
          content: userMessageResponse.message.content,
          type: userMessageResponse.message.type,
          created_at: userMessageResponse.message.createdAt
        },
        assistant_message: assistantMessage
      },
      metadata: {
        request_id: requestId,
        processing_time_ms: totalTime
      }
    });

  } catch (error) {
    const totalTime = Date.now() - startTime;
    logger.error('Message request failed', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error',
      sessionId: req.params.sessionId,
      userId: req.user!.id,
      totalTime
    });
    next(error);
  }
});

router.post('/sessions/:sessionId/messages/stream', async (req: Request, res: Response, next: NextFunction) => {
  const requestId = require('crypto').randomUUID();
  const startTime = Date.now();

  try {
    const { error, value } = sendMessageSchema.validate(req.body);
    if (error) {
      throw new ApiError(400, error.details[0].message);
    }

    const sessionId = req.params.sessionId;
    const userId = req.user!.id;

    res.writeHead(200, {
      'Content-Type': 'text/plain; charset=utf-8',
      'Transfer-Encoding': 'chunked',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Request-ID': requestId
    });

    res.write(`REQUEST_ID: ${requestId}\n`);
    res.write(`STREAM_START: ${new Date().toISOString()}\n\n`);

    const sessionResponse = await chatServiceMethods.getSession({
      sessionId,
      userId
    });

    if (!sessionResponse.success || !sessionResponse.session) {
      res.write('ERROR: Session not found or access denied\n');
      res.end();
      return;
    }

    const userMessageResponse = await chatServiceMethods.sendMessage({
      sessionId,
      userId,
      content: value.content,
      type: value.type || 'user',
      metadata: {
        sourceCitations: {},
        relevanceScore: 0,
        tags: [],
        modelUsed: '',
        tokenCount: 0,
        responseTimeMs: 0,
        processingSteps: []
      },
      parentMessageId: value.parent_message_id || ''
    });

    if (!userMessageResponse.success || !userMessageResponse.message) {
      res.write(`ERROR: Failed to store user message\n`);
      res.end();
      return;
    }

    res.write(`USER_MESSAGE: ${userMessageResponse.message.id}\n\n`);

    if (value.type === 'user' || !value.type) {
      const historyResponse = await chatServiceMethods.getChatHistory({
        sessionId,
        userId,
        limit: 10,
        offset: 0
      });

      if (historyResponse.success && sessionResponse.session.settings) {
        res.write('AI_START: Generating response...\n');

        let accumulatedResponse = '';
        let chunkCount = 0;

        try {
          await new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(() => {
              reject(new Error('AI timeout'));
            }, 45000);

            aiService.generateStreamResponse(
              sessionId,
              userId,
              value.content,
              historyResponse.messages || [],
              sessionResponse.session!.settings!,
              
              (chunk: string) => {
                chunkCount++;
                accumulatedResponse += chunk;
                res.write(`CHUNK_${chunkCount}: ${chunk}`);
              },
              
              async (metadata: any) => {
                clearTimeout(timeout);
                
                const aiMessageResponse = await chatServiceMethods.sendMessage({
                  sessionId,
                  userId,
                  content: accumulatedResponse,
                  type: 'assistant',
                  metadata: metadata?.metadata || {
                    sourceCitations: {},
                    modelUsed: 'streaming',
                    tokenCount: accumulatedResponse.split(' ').length,
                    responseTimeMs: Date.now() - startTime,
                    relevanceScore: 0.8,
                    tags: ['streamed'],
                    processingSteps: ['streaming_generation']
                  },
                  parentMessageId: userMessageResponse.message!.id
                });

                res.write(`\n\nAI_COMPLETE: ${aiMessageResponse.success ? 'Response saved' : 'Save failed'}\n`);
                resolve();
              },
              
              (error: Error) => {
                clearTimeout(timeout);
                res.write(`\n\nAI_ERROR: ${error.message}\n`);
                reject(error);
              }
            );
          });

        } catch (streamError) {
          res.write(`STREAM_ERROR: ${streamError}\n`);
        }
      }
    }

    const totalTime = Date.now() - startTime;
    res.write(`\nSTREAM_END: ${totalTime}ms\n`);
    res.end();

  } catch (error) {
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
    }
    res.write(`FATAL_ERROR: ${error instanceof Error ? error.message : 'Unknown error'}\n`);
    res.end();
  }
});

router.post('/sessions/:sessionId/messages/websocket', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sessionId = req.params.sessionId;
    const userId = req.user!.id;

    const sessionResponse = await chatServiceMethods.getSession({
      sessionId,
      userId
    });

    if (!sessionResponse.success || !sessionResponse.session) {
      throw new ApiError(404, 'Session not found or access denied');
    }

    res.json({
      success: true,
      message: 'WebSocket endpoint ready for real-time messaging',
      data: {
        websocket_url: process.env.WEBSOCKET_URL || 'ws://localhost:8000',
        session_id: sessionId,
        connection_guide: {
          step1: 'Connect with Socket.IO client',
          step2: 'Authenticate with JWT token',
          step3: `Join session: socket.emit('join_session', { session_id: '${sessionId}' })`,
          step4: 'Send messages and receive real-time AI responses'
        },
        supported_events: {
          client_to_server: [
            'join_session',
            'leave_session',
            'send_message',
            'typing_start',
            'typing_stop'
          ],
          server_to_client: [
            'session_joined',
            'message_received',
            'ai_typing_start',
            'ai_response_chunk',
            'ai_response_complete',
            'ai_typing_stop',
            'user_typing_start',
            'user_typing_stop',
            'error'
          ]
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

router.get('/sessions/:sessionId/messages', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const offset = parseInt(req.query.offset as string) || 0;

    const response: Types.GetChatHistoryResponse = await chatServiceMethods.getChatHistory({
      sessionId: req.params.sessionId,
      userId: req.user!.id,
      limit,
      offset
    });

    if (!response.success) {
      throw new ApiError(400, response.error || 'Failed to get chat history');
    }

    res.json({
      success: true,
      data: {
        messages: response.messages.map(message => ({
          id: message.id,
          content: message.content,
          type: message.type,
          metadata: message.metadata,
          created_at: message.createdAt,
          parent_message_id: message.parentMessageId,
          order_index: message.orderIndex
        })),
        total_count: response.totalCount,
        has_more: response.hasMore,
        pagination: {
          limit,
          offset,
          next_offset: response.hasMore ? offset + limit : null
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

router.get('/sessions/:sessionId/search', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = req.query.q as string;
    if (!query || query.trim().length === 0) {
      throw new ApiError(400, 'Search query is required');
    }

    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const offset = parseInt(req.query.offset as string) || 0;

    const response: Types.SearchMessagesResponse = await chatServiceMethods.searchMessages({
      sessionId: req.params.sessionId,
      userId: req.user!.id,
      query: query.trim(),
      limit,
      offset
    });

    if (!response.success) {
      throw new ApiError(400, response.error || 'Failed to search messages');
    }

    res.json({
      success: true,
      data: {
        messages: response.messages.map(message => ({
          id: message.id,
          content: message.content,
          type: message.type,
          created_at: message.createdAt,
          order_index: message.orderIndex
        })),
        total_count: response.totalCount,
        has_more: response.hasMore,
        query: query.trim(),
        pagination: {
          limit,
          offset,
          next_offset: response.hasMore ? offset + limit : null
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

router.delete('/messages/:messageId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await chatServiceMethods.deleteMessage({
      messageId: req.params.messageId,
      userId: req.user!.id
    });

    logger.info('Message deleted successfully', {
      messageId: req.params.messageId,
      userId: req.user!.id
    });

    res.json({
      success: true,
      message: 'Message deleted successfully'
    });
  } catch (error) {
    next(error);
  }
});

router.post('/sessions/:sessionId/typing', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { is_typing = false } = req.body;

    await chatServiceMethods.updateTypingStatus({
      sessionId: req.params.sessionId,
      userId: req.user!.id,
      isTyping: Boolean(is_typing)
    });

    res.json({
      success: true,
      message: 'Typing status updated'
    });
  } catch (error) {
    next(error);
  }
});

router.get('/sessions/:sessionId/typing', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const response: Types.GetTypingUsersResponse = await chatServiceMethods.getTypingUsers({
      sessionId: req.params.sessionId
    });

    if (!response.success) {
      throw new ApiError(400, response.error || 'Failed to get typing users');
    }

    res.json({
      success: true,
      data: {
        typing_users: response.userIds
      }
    });
  } catch (error) {
    next(error);
  }
});

export default router;










































// / // src/routes/chat.ts

// import { Router, Request, Response, NextFunction } from 'express';
// import { createSessionSchema, sendMessageSchema, updateSessionSchema } from "../utils/helper"
// import { chatServiceMethods } from '../grpc/client';
// import { authMiddleware } from '../middleware/auth';
// import { ApiError } from '../utils/ApiError';
// import { logger } from '../utils/logger';
// import { aiService } from "../service/aiService"
// import * as Types from '../types/grpc';
// const router = Router();


// // Apply authentication middleware to all routes
// router.use(authMiddleware);







// // Create new chat session
// router.post('/sessions', async (req: Request, res: Response, next: NextFunction) => {
//   console.log("user>>>>>>", req.user)
//   try {
//     const { error, value } = createSessionSchema.validate(req.body);
//     if (error) {
//       throw new ApiError(400, error.details[0].message);
//     }

//     const response: Types.CreateSessionResponse = await chatServiceMethods.createSession({
//       userId: req.user!.id,
//       title: value.title,
//       settings: {
//         aiPersona: value.settings.ai_persona,
//         temperature: value.settings.temperature,
//         maxTokens: value.settings.max_tokens,
//         enableRag: value.settings.enable_rag,
//         documentSources: value.settings.document_sources,
//         systemPrompt: value.settings.system_prompt
//       }
//     });

//     if (!response.success || !response.session) {
//       throw new ApiError(400, response.error || 'Failed to create session');
//     }

//     logger.info('Session created successfully', {
//       sessionId: response.session.id,
//       userId: req.user!.id,
//       ip: req.ip,
//     });

//     res.status(201).json({
//       success: true,
//       data: {
//         session: {
//           id: response.session.id,
//           title: response.session.title,
//           status: response.session.status,
//           settings: response.session.settings,
//           created_at: response.session.createdAt,
//           last_activity: response.session.lastActivity
//         }
//       }
//     });
//   } catch (error) {
//     next(error);
//   }
// });

// // Get user's chat sessions
// router.get('/sessions', async (req: Request, res: Response, next: NextFunction) => {
//   try {
//     const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
//     const offset = parseInt(req.query.offset as string) || 0;

//     const response: Types.GetUserSessionsResponse = await chatServiceMethods.getUserSessions({
//       userId: req.user!.id,
//       limit,
//       offset
//     });

//     if (!response.success) {
//       throw new ApiError(400, response.error || 'Failed to get sessions');
//     }

//     res.json({
//       success: true,
//       data: {
//         sessions: response.sessions.map(session => ({
//           id: session.id,
//           title: session.title,
//           status: session.status,
//           created_at: session.createdAt,
//           updated_at: session.updatedAt,
//           last_activity: session.lastActivity
//         })),
//         total_count: response.totalCount,
//         has_more: response.hasMore
//       }
//     });
//   } catch (error) {
//     next(error);
//   }
// });

// // Get specific session
// router.get('/sessions/:sessionId', async (req: Request, res: Response, next: NextFunction) => {
//   try {
//     const response: Types.GetSessionResponse = await chatServiceMethods.getSession({
//       sessionId: req.params.sessionId,
//       userId: req.user!.id
//     });

//     if (!response.success || !response.session) {
//       throw new ApiError(404, response.error || 'Session not found');
//     }

//     res.json({
//       success: true,
//       data: {
//         session: {
//           id: response.session.id,
//           title: response.session.title,
//           status: response.session.status,
//           settings: response.session.settings,
//           created_at: response.session.createdAt,
//           updated_at: response.session.updatedAt,
//           last_activity: response.session.lastActivity
//         }
//       }
//     });
//   } catch (error) {
//     next(error);
//   }
// });

// // Update session
// router.put('/sessions/:sessionId', async (req: Request, res: Response, next: NextFunction) => {
//   try {
//     const { error, value } = updateSessionSchema.validate(req.body);
//     if (error) {
//       throw new ApiError(400, error.details[0].message);
//     }

//     const updateRequest: Types.UpdateSessionRequest = {
//       sessionId: req.params.sessionId,
//       userId: req.user!.id
//     };

//     if (value.title) updateRequest.title = value.title;
//     if (value.status) updateRequest.status = value.status;
//     if (value.settings) {
//       updateRequest.settings = {
//         aiPersona: value.settings.ai_persona,
//         temperature: value.settings.temperature,
//         maxTokens: value.settings.max_tokens,
//         enableRag: value.settings.enable_rag,
//         documentSources: value.settings.document_sources,
//         systemPrompt: value.settings.system_prompt
//       };
//     }

//     const response: Types.UpdateSessionResponse = await chatServiceMethods.updateSession(updateRequest);

//     if (!response.success || !response.session) {
//       throw new ApiError(400, response.error || 'Failed to update session');
//     }

//     res.json({
//       success: true,
//       message: 'Session updated successfully',
//       data: {
//         session: {
//           id: response.session.id,
//           title: response.session.title,
//           status: response.session.status,
//           settings: response.session.settings,
//           updated_at: response.session.updatedAt
//         }
//       }
//     });
//   } catch (error) {
//     next(error);
//   }
// });

// // Delete session
// router.delete('/sessions/:sessionId', async (req: Request, res: Response, next: NextFunction) => {
//   try {
//     await chatServiceMethods.deleteSession({
//       sessionId: req.params.sessionId,
//       userId: req.user!.id
//     });

//     logger.info('Session deleted successfully', {
//       sessionId: req.params.sessionId,
//       userId: req.user!.id
//     });

//     res.json({
//       success: true,
//       message: 'Session deleted successfully'
//     });
//   } catch (error) {
//     next(error);
//   }
// });







// router.post('/sessions/:sessionId/messages/stream', async (req: Request, res: Response, next: NextFunction) => {
//   const startTime = Date.now();
//   console.log('=== STREAMING ENDPOINT STARTED ===');
//   console.log('Timestamp:', new Date().toISOString());
//   console.log('Session ID:', req.params.sessionId);
//   console.log('User ID:', req.user?.id);
//   console.log('Request Body:', JSON.stringify(req.body, null, 2));

//   try {
//     // Step 1: Validation
//     console.log('STEP 1: Validating request...');
//     const { error, value } = sendMessageSchema.validate(req.body);
//     if (error) {
//       console.error('Validation Error:', error.details[0].message);
//       throw new ApiError(400, error.details[0].message);
//     }
//     console.log('✓ Validation passed');

//     const sessionId = req.params.sessionId;
//     const userId = req.user!.id;

//     // Step 2: Set streaming headers
//     console.log('STEP 2: Setting streaming headers...');
//     res.writeHead(200, {
//       'Content-Type': 'text/plain; charset=utf-8',
//       'Transfer-Encoding': 'chunked',
//       'Cache-Control': 'no-cache',
//       'Connection': 'keep-alive'
//     });
//     console.log('✓ Headers set');
    
//     res.write(`STREAM_START: ${new Date().toISOString()}\n`);
//     res.write(`SESSION_ID: ${sessionId}\n`);
//     res.write(`USER_ID: ${userId}\n`);
//     res.write(`MESSAGE_TYPE: ${value.type}\n`);
//     res.write(`MESSAGE_CONTENT: ${value.content}\n\n`);

//     // Step 3: Store user message
//     console.log('STEP 3: Storing user message...');
//     res.write('STEP3_START: Storing user message in Chat Service...\n');
    
//     let userMessageResponse: Types.SendMessageResponse;
//     try {
//       userMessageResponse = await chatServiceMethods.sendMessage({
//         sessionId,
//         userId,
//         content: value.content,
//         type: value.type,
//         metadata: {
//           sourceCitations: {},
//           relevanceScore: 0,
//           tags: [],
//           modelUsed: '',
//           tokenCount: 0,
//           responseTimeMs: 0,
//           processingSteps: []
//         },
//         parentMessageId: value.parent_message_id || ''
//       });
//       console.log('✓ User message stored:', userMessageResponse.success);
//       res.write(`STEP3_SUCCESS: User message stored with ID: ${userMessageResponse.message?.id}\n`);
//     } catch (chatError) {
//       console.error('Chat Service Error:', chatError);
//       res.write(`STEP3_ERROR: Failed to store user message: ${chatError}\n`);
//       throw chatError;
//     }

//     if (!userMessageResponse.success || !userMessageResponse.message) {
//       const errorMsg = userMessageResponse.error || 'Failed to send message';
//       console.error('User message storage failed:', errorMsg);
//       res.write(`STEP3_FAILED: ${errorMsg}\n`);
//       throw new ApiError(400, errorMsg);
//     }

//     // Send user message confirmation
//     res.write(`\nUSER_MESSAGE_STORED: ${JSON.stringify({
//       id: userMessageResponse.message.id,
//       content: userMessageResponse.message.content,
//       type: userMessageResponse.message.type,
//       created_at: userMessageResponse.message.createdAt
//     })}\n\n`);

//     // Only generate AI response for user messages
//     if (value.type !== 'user') {
//       console.log('Message type is not "user", skipping AI generation');
//       res.write('SKIP_AI: Message type is not "user"\n');
//       res.write('STREAM_END: User message stored successfully\n');
//       res.end();
//       return;
//     }

//     // Step 4: Get conversation history
//     console.log('STEP 4: Getting conversation history...');
//     res.write('STEP4_START: Fetching conversation history...\n');
    
//     let historyResponse: Types.GetChatHistoryResponse;
//     try {
//       historyResponse = await chatServiceMethods.getChatHistory({
//         sessionId,
//         userId,
//         limit: 10,
//         offset: 0
//       });
//       console.log('✓ History retrieved:', historyResponse.success, 'Messages:', historyResponse.messages?.length || 0);
//       res.write(`STEP4_SUCCESS: Retrieved ${historyResponse.messages?.length || 0} messages\n`);
//     } catch (historyError) {
//       console.error('History retrieval error:', historyError);
//       res.write(`STEP4_ERROR: ${historyError}\n`);
//       throw historyError;
//     }

//     if (!historyResponse.success) {
//       console.error('Failed to get chat history:', historyResponse.error);
//       res.write(`STEP4_FAILED: ${historyResponse.error}\n`);
//       res.end();
//       return;
//     }

//     // Step 5: Get session settings
//     console.log('STEP 5: Getting session settings...');
//     res.write('STEP5_START: Fetching session settings...\n');
    
//     let sessionResponse: Types.GetSessionResponse;
//     try {
//       sessionResponse = await chatServiceMethods.getSession({
//         sessionId,
//         userId
//       });
//       console.log('✓ Session retrieved:', sessionResponse.success);
//       console.log('Session settings:', JSON.stringify(sessionResponse.session?.settings, null, 2));
//       res.write(`STEP5_SUCCESS: Session settings retrieved\n`);
//       res.write(`SESSION_SETTINGS: ${JSON.stringify(sessionResponse.session?.settings)}\n`);
//     } catch (sessionError) {
//       console.error('Session retrieval error:', sessionError);
//       res.write(`STEP5_ERROR: ${sessionError}\n`);
//       throw sessionError;
//     }

//     if (!sessionResponse.success || !sessionResponse.session || !sessionResponse.session.settings) {
//       const errorMsg = 'Failed to get session settings';
//       console.error(errorMsg);
//       res.write(`STEP5_FAILED: ${errorMsg}\n`);
//       res.end();
//       return;
//     }

//     // Step 6: Test AI Service connection
//     console.log('STEP 6: Testing AI Service connection...');
//     res.write('STEP6_START: Testing AI Service connection...\n');
    
//     try {
//       // Test if aiService exists and is properly imported
//       if (!aiService) {
//         throw new Error('aiService is not imported or undefined');
//       }
//       console.log('✓ aiService object exists');
//       res.write('STEP6_SUCCESS: aiService object exists\n');

//       if (typeof aiService.generateStreamResponse !== 'function') {
//         throw new Error('generateStreamResponse method not found on aiService');
//       }
//       console.log('✓ generateStreamResponse method exists');
//       res.write('STEP6_SUCCESS: generateStreamResponse method exists\n');

//     } catch (serviceTestError) {
//       console.error('AI Service test error:', serviceTestError);
//       res.write(`STEP6_ERROR: ${serviceTestError}\n`);
//       res.end();
//       return;
//     }

//     // Step 7: Prepare AI Service call
//     console.log('STEP 7: Preparing AI Service call...');
//     res.write('\nSTEP7_START: Preparing AI Service call...\n');
    
//     const aiCallParams = {
//       sessionId,
//       userId,
//       content: value.content,
//       historyCount: historyResponse.messages.length,
//       settings: sessionResponse.session.settings
//     };
//     console.log('AI Service call parameters:', JSON.stringify(aiCallParams, null, 2));
//     res.write(`AI_PARAMS: ${JSON.stringify(aiCallParams)}\n\n`);

//     // Step 8: Start AI streaming
//     console.log('STEP 8: Starting AI streaming...');
//     res.write('STEP8_START: Starting AI response generation...\n');
//     res.write('AI_STREAMING: Beginning real-time response...\n\n');

//     let accumulatedResponse = '';
//     let chunkCount = 0;
//     let assistantMessageId = '';

//     try {
//       await new Promise<void>((resolve, reject) => {
//         console.log('Calling aiService.generateStreamResponse...');
        
//         const timeoutId = setTimeout(() => {
//           console.error('AI Service timeout after 30 seconds');
//           reject(new Error('AI Service timeout'));
//         }, 30000); // 30 second timeout

//         aiService.generateStreamResponse(
//           sessionId,
//           userId,
//           value.content,
//           historyResponse.messages,
//           sessionResponse.session!.settings,
          
//           // onChunk callback
//           (chunk: string) => {
//             chunkCount++;
//             const chunkLength = chunk.length;
//             accumulatedResponse += chunk;
            
//             console.log(`Received chunk ${chunkCount}: ${chunkLength} chars`);
//             console.log(`Chunk content: "${chunk.substring(0, 100)}${chunk.length > 100 ? '...' : ''}"`);
//             console.log(`Total accumulated: ${accumulatedResponse.length} chars`);
            
//             res.write(`CHUNK_${chunkCount}: ${chunk}`);
            
//             // Flush the response to ensure immediate delivery
//             if (res.flush) {
//               res.flush();
//             }
//           },
          
//           // onComplete callback
//           async (metadata: any) => {
//             clearTimeout(timeoutId);
//             console.log('AI streaming completed');
//             console.log('Final response length:', accumulatedResponse.length);
//             console.log('Total chunks received:', chunkCount);
//             console.log('Metadata:', JSON.stringify(metadata, null, 2));
            
//             res.write(`\n\nAI_COMPLETE: Response generation finished\n`);
//             res.write(`TOTAL_CHUNKS: ${chunkCount}\n`);
//             res.write(`TOTAL_LENGTH: ${accumulatedResponse.length}\n`);
//             res.write('SAVING: Storing AI response in database...\n');

//             try {
//               // Step 9: Store AI response
//               console.log('STEP 9: Storing AI response...');
//               const aiMessageResponse: Types.SendMessageResponse = await chatServiceMethods.sendMessage({
//                 sessionId,
//                 userId,
//                 content: accumulatedResponse,
//                 type: 'assistant',
//                 metadata: metadata.metadata || {
//                   sourceCitations: {},
//                   modelUsed: 'streaming',
//                   tokenCount: accumulatedResponse.split(' ').length,
//                   responseTimeMs: Date.now() - startTime,
//                   relevanceScore: 0.8,
//                   tags: ['streamed'],
//                   processingSteps: ['streaming_generation']
//                 },
//                 parentMessageId: userMessageResponse.message!.id
//               });

//               if (aiMessageResponse.success && aiMessageResponse.message) {
//                 assistantMessageId = aiMessageResponse.message.id;
//                 console.log('✓ AI response stored with ID:', assistantMessageId);
                
//                 res.write(`SAVE_SUCCESS: AI response stored with ID: ${assistantMessageId}\n`);
//                 res.write(`\nASSISTANT_MESSAGE: ${JSON.stringify({
//                   id: aiMessageResponse.message.id,
//                   content: aiMessageResponse.message.content,
//                   type: aiMessageResponse.message.type,
//                   metadata: aiMessageResponse.message.metadata,
//                   created_at: aiMessageResponse.message.createdAt,
//                   parent_message_id: aiMessageResponse.message.parentMessageId
//                 })}\n`);
//               } else {
//                 console.error('Failed to store AI response:', aiMessageResponse.error);
//                 res.write(`SAVE_FAILED: ${aiMessageResponse.error}\n`);
//               }

//               resolve();
//             } catch (saveError) {
//               console.error('Error saving AI response:', saveError);
//               res.write(`SAVE_ERROR: ${saveError}\n`);
//               reject(saveError);
//             }
//           },
          
//           // onError callback
//           (error: Error) => {
//             clearTimeout(timeoutId);
//             console.error('AI streaming error:', error);
//             res.write(`\n\nAI_STREAM_ERROR: ${error.message}\n`);
//             reject(error);
//           }
//         );
//       });

//       console.log('AI streaming process completed successfully');
      
//     } catch (aiStreamingError) {
//       console.error('AI streaming failed:', aiStreamingError);
//       res.write(`\nAI_STREAMING_FAILED: ${aiStreamingError}\n`);
      
//       // Generate fallback response
//       console.log('Generating fallback response...');
//       res.write('FALLBACK: Generating fallback response...\n');
      
//       try {
//         const fallbackResponse: Types.SendMessageResponse = await chatServiceMethods.sendMessage({
//           sessionId,
//           userId,
//           content: 'I apologize, but I\'m experiencing technical difficulties. Please try again in a moment.',
//           type: 'assistant',
//           metadata: {
//             sourceCitations: {},
//             modelUsed: 'fallback',
//             tokenCount: 15,
//             responseTimeMs: Date.now() - startTime,
//             relevanceScore: 0,
//             tags: ['fallback', 'error'],
//             processingSteps: ['fallback_generation']
//           },
//           parentMessageId: userMessageResponse.message.id
//         });

//         if (fallbackResponse.success && fallbackResponse.message) {
//           assistantMessageId = fallbackResponse.message.id;
//           console.log('✓ Fallback response stored');
//           res.write(`FALLBACK_SUCCESS: Fallback response stored\n`);
//           res.write(`\nFALLBACK_MESSAGE: ${JSON.stringify({
//             id: fallbackResponse.message.id,
//             content: fallbackResponse.message.content,
//             type: fallbackResponse.message.type,
//             created_at: fallbackResponse.message.createdAt
//           })}\n`);
//         }
//       } catch (fallbackError) {
//         console.error('Fallback response also failed:', fallbackError);
//         res.write(`FALLBACK_ERROR: ${fallbackError}\n`);
//       }
//     }

//     // Final completion
//     const totalTime = Date.now() - startTime;
//     console.log(`=== STREAMING COMPLETED in ${totalTime}ms ===`);
    
//     res.write(`\n\nSTREAM_STATS:\n`);
//     res.write(`- Total time: ${totalTime}ms\n`);
//     res.write(`- Chunks received: ${chunkCount}\n`);
//     res.write(`- Response length: ${accumulatedResponse.length}\n`);
//     res.write(`- Assistant message ID: ${assistantMessageId}\n`);
//     res.write(`\nSTREAM_END: Complete at ${new Date().toISOString()}\n`);
//     res.end();

//     logger.info('Streaming message completed', {
//       messageId: userMessageResponse.message.id,
//       assistantMessageId,
//       sessionId,
//       userId,
//       totalTime,
//       chunkCount,
//       responseLength: accumulatedResponse.length
//     });

//   } catch (error) {
//     const errorTime = Date.now() - startTime;
//     console.error(`=== STREAMING FAILED after ${errorTime}ms ===`);
//     console.error('Error details:', error);
    
//     if (!res.headersSent) {
//       res.writeHead(500, {
//         'Content-Type': 'text/plain; charset=utf-8'
//       });
//     }
    
//     res.write(`\nFATAL_ERROR: ${error instanceof Error ? error.message : 'Unknown error'}\n`);
//     res.write(`ERROR_TIME: ${errorTime}ms\n`);
//     res.write(`ERROR_STACK: ${error instanceof Error ? error.stack : 'No stack trace'}\n`);
//     res.end();
//   }
// });




// router.post('/sessions/:sessionId/messages/websocket', async (req: Request, res: Response, next: NextFunction) => {
//   try {
//     const sessionId = req.params.sessionId;
//     const userId = req.user!.id;

//     // Verify session access
//     const sessionResponse = await chatServiceMethods.getSession({
//       sessionId,
//       userId
//     });

//     if (!sessionResponse.success || !sessionResponse.session) {
//       throw new ApiError(404, 'Session not found or access denied');
//     }

//     res.json({
//       success: true,
//       message: 'WebSocket endpoint ready for real-time messaging',
//       data: {
//         websocket_url: `ws://localhost:3000/socket.io/`,
//         session_id: sessionId,
//         connection_instructions: {
//           1: 'Connect to WebSocket with authentication token',
//           2: `Emit "join_session" with { session_id: "${sessionId}" }`,
//           3: 'Send messages with "send_message" event',
//           4: 'Listen for real-time AI streaming via "ai_response_chunk" events'
//         },
//         events: {
//           outgoing: [
//             'join_session',
//             'leave_session', 
//             'send_message',
//             'typing_start',
//             'typing_stop'
//           ],
//           incoming: [
//             'session_joined',
//             'message_received',
//             'ai_typing_start',
//             'ai_response_chunk',
//             'ai_response_complete',
//             'ai_typing_stop',
//             'user_typing_start',
//             'user_typing_stop',
//             'error'
//           ]
//         },
//         sample_usage: {
//           connect: `
// const socket = io('ws://localhost:3000', {
//   auth: { token: 'your-jwt-token' }
// });`,
//           join: `socket.emit('join_session', { session_id: '${sessionId}' });`,
//           send: `socket.emit('send_message', {
//   session_id: '${sessionId}',
//   content: 'Hello AI',
//   type: 'user'
// });`,
//           listen: `socket.on('ai_response_chunk', (data) => {
//   console.log('AI chunk:', data.content);
// });`
//         }
//       }
//     });
//   } catch (error) {
//     next(error);
//   }
// });








// // Get chat history
// router.get('/sessions/:sessionId/messages', async (req: Request, res: Response, next: NextFunction) => {
//   try {
//     const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
//     const offset = parseInt(req.query.offset as string) || 0;

//     const response: Types.GetChatHistoryResponse = await chatServiceMethods.getChatHistory({
//       sessionId: req.params.sessionId,
//       userId: req.user!.id,
//       limit,
//       offset
//     });

//     if (!response.success) {
//       throw new ApiError(400, response.error || 'Failed to get chat history');
//     }

//     res.json({
//       success: true,
//       data: {
//         messages: response.messages.map(message => ({
//           id: message.id,
//           content: message.content,
//           type: message.type,
//           metadata: message.metadata,
//           created_at: message.createdAt,
//           parent_message_id: message.parentMessageId,
//           order_index: message.orderIndex
//         })),
//         total_count: response.totalCount,
//         has_more: response.hasMore
//       }
//     });
//   } catch (error) {
//     next(error);
//   }
// });

// // Search messages in session
// router.get('/sessions/:sessionId/search', async (req: Request, res: Response, next: NextFunction) => {
//   try {
//     const query = req.query.q as string;
//     if (!query || query.trim().length === 0) {
//       throw new ApiError(400, 'Search query is required');
//     }

//     const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
//     const offset = parseInt(req.query.offset as string) || 0;

//     const response: Types.SearchMessagesResponse = await chatServiceMethods.searchMessages({
//       sessionId: req.params.sessionId,
//       userId: req.user!.id,
//       query: query.trim(),
//       limit,
//       offset
//     });

//     if (!response.success) {
//       throw new ApiError(400, response.error || 'Failed to search messages');
//     }

//     res.json({
//       success: true,
//       data: {
//         messages: response.messages.map(message => ({
//           id: message.id,
//           content: message.content,
//           type: message.type,
//           created_at: message.createdAt,
//           order_index: message.orderIndex
//         })),
//         total_count: response.totalCount,
//         has_more: response.hasMore,
//         query: query.trim()
//       }
//     });
//   } catch (error) {
//     next(error);
//   }
// });

// // Delete specific message
// router.delete('/messages/:messageId', async (req: Request, res: Response, next: NextFunction) => {
//   try {
//     await chatServiceMethods.deleteMessage({
//       messageId: req.params.messageId,
//       userId: req.user!.id
//     });

//     logger.info('Message deleted successfully', {
//       messageId: req.params.messageId,
//       userId: req.user!.id
//     });

//     res.json({
//       success: true,
//       message: 'Message deleted successfully'
//     });
//   } catch (error) {
//     next(error);
//   }
// });

// // Update typing status
// router.post('/sessions/:sessionId/typing', async (req: Request, res: Response, next: NextFunction) => {
//   try {
//     const { is_typing = false } = req.body;

//     await chatServiceMethods.updateTypingStatus({
//       sessionId: req.params.sessionId,
//       userId: req.user!.id,
//       isTyping: Boolean(is_typing)
//     });

//     res.json({
//       success: true,
//       message: 'Typing status updated'
//     });
//   } catch (error) {
//     next(error);
//   }
// });

// // Get typing users
// router.get('/sessions/:sessionId/typing', async (req: Request, res: Response, next: NextFunction) => {
//   try {
//     const response: Types.GetTypingUsersResponse = await chatServiceMethods.getTypingUsers({
//       sessionId: req.params.sessionId
//     });

//     if (!response.success) {
//       throw new ApiError(400, response.error || 'Failed to get typing users');
//     }

//     res.json({
//       success: true,
//       data: {
//         typing_users: response.userIds
//       }
//     });
//   } catch (error) {
//     next(error);
//   }
// });

// export default router;