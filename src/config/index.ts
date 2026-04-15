/**
 * App Configuration
 *
 * Reads config from app.json (runtime) with .env fallback (build time)
 */

import Constants from 'expo-constants';

const expoExtra = Constants.expoConfig?.extra || {};

// Runtime config from app.json (can be changed without rebuild)
const runtime = {
  LLM_MODE: expoExtra.LLM_MODE as 'local' | 'cloud' | 'mlc' | 'mock',
  LOCAL_BACKEND_URL: expoExtra.LOCAL_BACKEND_URL,
  CLOUD_API_URL: expoExtra.CLOUD_API_URL,
  MLC_MODEL_ID: expoExtra.MLC_MODEL_ID,
};

// Build-time config from .env (requires rebuild to change)
const buildTime = {
  LLM_MODE: process.env.LLM_MODE as 'local' | 'cloud' | 'mlc' | 'mock',
  LOCAL_BACKEND_URL: process.env.LOCAL_BACKEND_URL,
  CLOUD_API_URL: process.env.CLOUD_API_URL,
  CLOUD_API_KEY: process.env.CLOUD_API_KEY,
  MLC_MODEL_ID: process.env.MLC_MODEL_ID,
  MLC_MODEL_URL: process.env.MLC_MODEL_URL,
};

// Runtime takes precedence for easy development changes
export const llmConfig = {
  mode: runtime.LLM_MODE || buildTime.LLM_MODE || 'mock',
  localBaseUrl: runtime.LOCAL_BACKEND_URL || buildTime.LOCAL_BACKEND_URL || 'http://localhost:8000',
  cloudApiUrl: runtime.CLOUD_API_URL || buildTime.CLOUD_API_URL || '',
  cloudApiKey: buildTime.CLOUD_API_KEY || '',
  mlcModelId: runtime.MLC_MODEL_ID || buildTime.MLC_MODEL_ID || 'google/gemma-2b-it-q4f16_1-MLC',
  mlcModelUrl: buildTime.MLC_MODEL_URL || '',
};

export const isDev = __DEV__;

/**
 * Get LLM config for initializing the service
 */
export function getLLMConfig() {
  return llmConfig;
}
