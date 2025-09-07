import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import path from 'path';
import { logger } from '../utils/logger';

const AI_PROTO_PATH = path.join(__dirname, '../../proto/ai_service.proto');

const aiPackageDefinition = protoLoader.loadSync(AI_PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true
});

const aiProto = grpc.loadPackageDefinition(aiPackageDefinition) as any;

class AIServiceClient {
  private client: any;

  constructor() {
    const aiServiceUrl = process.env.AI_SERVICE_URL || 'localhost:50053';
    this.client = new aiProto.ai.AIService(
      aiServiceUrl,
      grpc.credentials.createInsecure()
    );
    
    logger.info(`AI Service client connected to grpc${aiServiceUrl}`);
  }

  async generateResponse(request: GenerateAIRequest): Promise<GenerateAIResponse> {
    return new Promise((resolve, reject) => {
      this.client.GenerateResponse(request, (error: any, response: any) => {
        if (error) {
          logger.error('AI Service GenerateResponse error:', error);
          reject(error);
        } else {
          resolve(response);
        }
      });
    });
  }

  generateStreamResponse(request: GenerateAIRequest): grpc.ClientReadableStream<any> {
    return this.client.GenerateStreamResponse(request);
  }

  async processDocument(request: ProcessDocumentRequest): Promise<ProcessDocumentResponse> {
    return new Promise((resolve, reject) => {
      this.client.ProcessDocument(request, (error: any, response: any) => {
        if (error) {
          logger.error('AI Service ProcessDocument error:', error);
          reject(error);
        } else {
          resolve(response);
        }
      });
    });
  }

  async searchDocuments(request: SearchDocumentsRequest): Promise<SearchDocumentsResponse> {
    return new Promise((resolve, reject) => {
      this.client.SearchDocuments(request, (error: any, response: any) => {
        if (error) {
          logger.error('AI Service SearchDocuments error:', error);
          reject(error);
        } else {
          resolve(response);
        }
      });
    });
  }
}

export interface MessageMetadata {
  source_citations?: { [key: string]: string };
  relevance_score?: number;
  tags?: string[];
  model_used?: string;
  token_count?: number;
  response_time_ms?: number;
  processing_steps?: string[];
}

export interface ConversationMessage {
  id: string;
  content: string;
  type: string; // 'user', 'assistant', 'system'
  metadata: MessageMetadata;
  created_at: string; 
}

export interface AISettings {
  ai_persona?: string;
  temperature?: number;
  max_tokens?: number;
  enable_rag?: boolean;
  document_sources?: string[];
  system_prompt?: string;
}

export interface GenerateAIRequest {
  session_id: string;
  user_id: string;
  user_message: string;
  conversation_history?: ConversationMessage[];
  settings?: AISettings;
}

export interface ResponseMetadata {
  source_citations: { [key: string]: string };
  model_used: string;
  token_count: number;
  response_time_ms: number;
  relevance_score: number;
  tags: string[];
  processing_steps: string[];
}

export interface GenerateAIResponse {
  success: boolean;
  error?: string;
  response?: string;
  metadata?: ResponseMetadata;
  is_final: boolean;
}

export interface ProcessDocumentRequest {
  document_content: string;
  document_type: string;
  document_source: string;
  metadata: { [key: string]: string };
}

export interface ProcessDocumentResponse {
  success: boolean;
  error?: string;
  document_id?: string;
  chunks_created: number;
}

export interface SearchDocumentsRequest {
  query: string;
  limit: number;
  similarity_threshold: number;
}

export interface DocumentChunk {
  id: string;
  content: string;
  source: string;
  relevance_score: number;
  metadata: { [key: string]: string };
}

export interface SearchDocumentsResponse {
  success: boolean;
  error?: string;
  documents: DocumentChunk[];
}

export const aiServiceClient = new AIServiceClient();
