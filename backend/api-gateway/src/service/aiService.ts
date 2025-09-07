
import { aiServiceClient, GenerateAIRequest, ConversationMessage, AISettings } from '../grpc/ai_client';
import { logger } from '../utils/logger';
import * as Types from '../types/grpc';

export class AIService {
  private convertChatMessagesToAIFormat(messages: any[]): ConversationMessage[] {
    return messages.map(msg => ({
      id: msg.id,
      content: msg.content,
      type: msg.type,
      metadata: {
        source_citations: msg.metadata.sourceCitations || {},
        relevance_score: msg.metadata.relevanceScore || 0,
        tags: msg.metadata.tags || [],
        model_used: msg.metadata.modelUsed || '',
        token_count: msg.metadata.tokenCount || 0,
        response_time_ms: msg.metadata.responseTimeMs || 0,
        processing_steps: msg.metadata.processingSteps || []
      },
      created_at: new Date(msg.createdAt).toISOString()
    }));
  }

  private convertSessionSettingsToAI(sessionSettings: any): AISettings {
    return {
      ai_persona: sessionSettings.aiPersona || 'assistant',
      temperature: sessionSettings.temperature || 0.7,
      max_tokens: sessionSettings.maxTokens || 2048,
      enable_rag: sessionSettings.enableRag || true,
      document_sources: sessionSettings.documentSources || [],
      system_prompt: sessionSettings.systemPrompt || ''
    };
  }

  async generateResponse(
    sessionId: string,
    userId: string,
    userMessage: string,
    conversationHistory: any[],
    sessionSettings: any
  ): Promise<{
    response: string;
    metadata: {
      sourceCitations: { [key: string]: string };
      modelUsed: string;
      tokenCount: number;
      responseTimeMs: number;
      relevanceScore: number;
      tags: string[];
      processingSteps: string[];
    }
  }> {
    try {
      const request: GenerateAIRequest = {
        session_id: sessionId,
        user_id: userId,
        user_message: userMessage,
        conversation_history: this.convertChatMessagesToAIFormat(conversationHistory),
        settings: this.convertSessionSettingsToAI(sessionSettings)
      };

      logger.info('Calling AI Service for response generation', {
        sessionId,
        userId,
        messageLength: userMessage.length,
        historyLength: conversationHistory.length
      });

      const response = await aiServiceClient.generateResponse(request);

      if (!response.success) {
        throw new Error(response.error || 'AI Service returned unsuccessful response');
      }

      return {
        response: response.response || '',
        metadata: {
          sourceCitations: response.metadata?.source_citations || {},
          modelUsed: response.metadata?.model_used || 'unknown',
          tokenCount: response.metadata?.token_count || 0,
          responseTimeMs: response.metadata?.response_time_ms || 0,
          relevanceScore: response.metadata?.relevance_score || 0,
          tags: response.metadata?.tags || [],
          processingSteps: response.metadata?.processing_steps || []
        }
      };
    } catch (error) {
      logger.error('Error generating AI response:', error);
      throw error;
    }
  }

  async generateStreamResponse(
    sessionId: string,
    userId: string,
    userMessage: string,
    conversationHistory: any[],
    sessionSettings: any,
    onChunk: (chunk: string) => void,
    onComplete: (metadata: any) => void,
    onError: (error: Error) => void
  ): Promise<void> {
    try {
      const request: GenerateAIRequest = {
        session_id: sessionId,
        user_id: userId,
        user_message: userMessage,
        conversation_history: this.convertChatMessagesToAIFormat(conversationHistory),
        settings: this.convertSessionSettingsToAI(sessionSettings)
      };

      const stream = aiServiceClient.generateStreamResponse(request);
      let accumulatedResponse = '';

      stream.on('data', (chunk: any) => {
        if (chunk.success) {
          if (chunk.response && chunk.response.length > 0) {
            accumulatedResponse += chunk.response;
            onChunk(chunk.response);
          }
          
          if (chunk.is_final && chunk.metadata) {
            onComplete({
              fullResponse: accumulatedResponse,
              metadata: {
                sourceCitations: chunk.metadata.source_citations || {},
                modelUsed: chunk.metadata.model_used || 'unknown',
                tokenCount: chunk.metadata.token_count || 0,
                responseTimeMs: chunk.metadata.response_time_ms || 0,
                relevanceScore: chunk.metadata.relevance_score || 0,
                tags: chunk.metadata.tags || [],
                processingSteps: chunk.metadata.processing_steps || []
              }
            });
          }
        } else {
          onError(new Error(chunk.error || 'AI Service streaming error'));
        }
      });

      stream.on('error', (error: Error) => {
        logger.error('AI Service stream error:', error);
        onError(error);
      });

      stream.on('end', () => {
        logger.info('AI Service stream ended', { sessionId, userId });
      });

    } catch (error) {
      logger.error('Error in streaming AI response:', error);
      onError(error as Error);
    }
  }
}

export const aiService = new AIService();

