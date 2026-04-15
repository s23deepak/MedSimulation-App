/**
 * App Configuration
 *
 * Loads environment variables and provides typed configuration access.
 */

import Constants from 'expo-constants';
import { getConfig } from 'expo-config';

const expoConfig = Constants.expoConfig?.extra || {};

// Get environment variables (loaded via babel-plugin-module-resolver)
const env = {
  LLM_MODE: process.env.LLM_MODE as 'local' | 'cloud' | 'mlc' | 'mock' || 'mock',
  LOCAL_BACKEND_URL: process.env.LOCAL_BACKEND_URL || 'http://localhost:8000',
  CLOUD_API_URL: process.env.CLOUD_API_URL || '',
  CLOUD_API_KEY: process.env.CLOUD_API_KEY || '',
  MLC_MODEL_ID: process.env.MLC_MODEL_ID || 'google/gemma-2b-it-q4f16_1-MLC',
  MLC_MODEL_URL: process.env.MLC_MODEL_URL || '',
  API_BASE_URL: process.env.API_BASE_URL || '',
  FEATURE_PUBMED_IMPORT: process.env.FEATURE_PUBMED_IMPORT,
  FEATURE_WILEY_IMPORT: process.env.FEATURE_WILEY_IMPORT,
  FEATURE_CLOUD_SYNC: process.env.FEATURE_CLOUD_SYNC,
};

export const llmConfig = {
  mode: env.LLM_MODE,
  localBaseUrl: env.LOCAL_BACKEND_URL,
  cloudApiUrl: env.CLOUD_API_URL,
  cloudApiKey: env.CLOUD_API_KEY,
  mlcModelId: env.MLC_MODEL_ID,
  mlcModelUrl: env.MLC_MODEL_URL,
};

export const apiConfig = {
  baseUrl: env.API_BASE_URL || expoConfig.API_BASE_URL || '',
  pubmedImport: env.FEATURE_PUBMED_IMPORT !== 'false',
  wileyImport: env.FEATURE_WILEY_IMPORT !== 'false',
  cloudSync: env.FEATURE_CLOUD_SYNC === 'true',
};

export const isDev = __DEV__;

/**
 * Get LLM config for initializing the service
 */
export function getLLMConfig() {
  return {
    mode: llmConfig.mode,
    localBaseUrl: llmConfig.localBaseUrl,
    cloudApiUrl: llmConfig.cloudApiUrl,
    cloudApiKey: llmConfig.cloudApiKey,
    mlcModelId: llmConfig.mlcModelId,
    mlcModelUrl: llmConfig.mlcModelUrl,
  };
}
