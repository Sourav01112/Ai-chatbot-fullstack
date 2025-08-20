
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

export const  updateUserSchema = Joi.object({
  first_name: Joi.string().max(100).allow(''),
  last_name: Joi.string().max(100).allow(''),
  username: Joi.string().min(3).max(30),
  avatar_url: Joi.string().uri().allow(''),
});