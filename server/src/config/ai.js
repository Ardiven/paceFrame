import dotenv from 'dotenv';
dotenv.config();

export const AI_CONFIG = {
  provider: process.env.AI_PROVIDER || 'gemini',
  model: process.env.AI_MODEL || 'gemini-3.8-flash',
  apiKey: process.env.GEMINI_API_KEY || '',
  timeoutMs: 25000,
  maxRetries: 1,
};
