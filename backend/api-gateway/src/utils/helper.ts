
import Joi from 'joi';


export const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  username: Joi.string().min(3).max(30).required(),
  first_name: Joi.string().max(100).allow(''),
  last_name: Joi.string().max(100).allow(''),
});

export const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
  remember_me: Joi.boolean().default(false),
});

export const updateUserSchema = Joi.object({
  first_name: Joi.string().max(100).allow(''),
  last_name: Joi.string().max(100).allow(''),
  username: Joi.string().min(3).max(30),
  avatar_url: Joi.string().uri().allow(''),
});

// ---------------- SESSION - MESSAGE ~ CHAT SERVICE

// Validation schemas
export const createSessionSchema = Joi.object({
  title: Joi.string().min(1).max(200).required(),
  settings: Joi.object({
    ai_persona: Joi.string().default('assistant'),
    temperature: Joi.number().min(0).max(2).default(0.7),
    max_tokens: Joi.number().min(1).max(4000).default(1000),
    enable_rag: Joi.boolean().default(true),
    document_sources: Joi.array().items(Joi.string()).default([]),
    system_prompt: Joi.string().default('')
  }).default({})
});

export const sendMessageSchema = Joi.object({
  content: Joi.string().min(1).max(10000).required(),
  type: Joi.string().valid('user', 'assistant', 'system').default('user'),
  parent_message_id: Joi.string().uuid().optional()
});

export const updateSessionSchema = Joi.object({
  title: Joi.string().min(1).max(200).optional(),
  status: Joi.string().valid('active', 'paused', 'archived').optional(),
  settings: Joi.object({
    ai_persona: Joi.string().optional(),
    temperature: Joi.number().min(0).max(2).optional(),
    max_tokens: Joi.number().min(1).max(4000).optional(),
    enable_rag: Joi.boolean().optional(),
    document_sources: Joi.array().items(Joi.string()).optional(),
    system_prompt: Joi.string().optional()
  }).optional()
});

