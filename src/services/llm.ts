/**
 * On-Device LLM Service
 *
 * Supports four modes:
 * 1. Local FastAPI Backend - Connect to MedSimulation server on same network
 * 2. Cloud API - Modal/Together AI for pay-per-use inference
 * 3. MLC WebLLM - True on-device via WebView (requires model download)
 * 4. Mock/Rule-Based - Fallback for development without backend
 */

import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';

export type LLMMode = 'local' | 'cloud' | 'mlc' | 'mock';

export interface LLMConfig {
  mode: LLMMode;
  // Local backend
  localBaseUrl?: string;
  // Cloud API
  cloudApiUrl?: string;
  cloudApiKey?: string;
  // MLC WebLLM (on-device)
  mlcModelId?: string;
  mlcModelUrl?: string;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface PatientContext {
  presentation: string;
  physicalExam: Record<string, string>;
  investigations: Record<string, string>;
}

// MLC WebView bridge (lazy loaded)
let MLCWebViewInstance: any = null;

class LLMServiceClass {
  private isInitialized = false;
  private config: LLMConfig | null = null;
  private isLoading = false;
  private loadProgress = 0;
  private mlcReady = false;

  /**
   * Initialize the LLM service with configuration
   */
  async initialize(config: LLMConfig): Promise<void> {
    if (this.isInitialized) return;
    if (this.isLoading) return;

    this.isLoading = true;
    this.config = config;

    try {
      // Validate configuration based on mode
      if (config.mode === 'local' && !config.localBaseUrl) {
        throw new Error('localBaseUrl is required for local mode');
      }
      if (config.mode === 'cloud' && !config.cloudApiUrl) {
        throw new Error('cloudApiUrl is required for cloud mode');
      }

      // Simulate initialization progress
      for (let i = 0; i <= 100; i += 10) {
        this.loadProgress = i;
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      this.isInitialized = true;
      console.log(`LLM Service initialized in ${config.mode} mode`);
    } catch (error) {
      console.error('Failed to initialize LLM:', error);
      throw error;
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Generate response for patient simulation
   * Routes to appropriate backend based on mode
   */
  async generatePatientResponse(
    question: string,
    patientContext: PatientContext,
    conversationHistory: ChatMessage[],
    sessionId?: string
  ): Promise<string> {
    if (!this.isInitialized) {
      throw new Error('LLM not initialized. Call initialize() first.');
    }

    switch (this.config?.mode) {
      case 'local':
        return this.callLocalBackend(question, patientContext, conversationHistory, sessionId);
      case 'cloud':
        return this.callCloudApi(question, patientContext, conversationHistory);
      case 'mlc':
        return this.callMLCWebLLM(question, patientContext, conversationHistory);
      case 'mock':
      default:
        return this.generateMockResponse(question, patientContext, conversationHistory);
    }
  }

  /**
   * Call local FastAPI backend (MedSimulation server)
   * Uses the simulation engine's ask_history endpoint (same as web PWA)
   */
  async callLocalBackendDirect(
    question: string,
    sessionId: string | null
  ): Promise<string> {
    try {
      const baseUrl = this.config!.localBaseUrl!;

      const response = await fetch(`${baseUrl}/api/simulation/history`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId || 'mobile-session',
          question: question,
        }),
      });

      if (!response.ok) {
        throw new Error(`Local backend error: ${response.status}`);
      }

      const data = await response.json();
      return data.response;
    } catch (error) {
      console.error('Local backend call failed:', error);
      throw error;
    }
  }

  /**
   * Call MLC WebLLM for on-device inference
   * Uses WebView-based MLC Chat component
   */
  private async callMLCWebLLM(
    question: string,
    patientContext: PatientContext,
    conversationHistory: ChatMessage[]
  ): Promise<string> {
    if (!this.mlcReady) {
      throw new Error('MLC WebLLM not ready - model still loading');
    }

    const systemPrompt = `You are a standardized patient in a clinical simulation.
Role: ${patientContext.presentation}

Instructions:
- Respond as the patient would, based on your condition
- Only reveal information that would be discovered through the asked question
- Be realistic and emotionally appropriate
- Keep responses concise (2-3 sentences max)
- Never reveal your diagnosis directly`;

    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory,
      { role: 'user', content: question },
    ];

    // Format as prompt for MLC
    const prompt = messages
      .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
      .join('\n\n');

    try {
      // Use WebView bridge to communicate with MLC
      const response = await this.sendMLCMessage(prompt);
      return response;
    } catch (error) {
      console.error('MLC WebLLM failed:', error);
      // Fallback to mock
      return this.generateMockResponse(question, patientContext, conversationHistory);
    }
  }

  /**
   * Send message to MLC WebView and get response
   */
  private async sendMLCMessage(prompt: string): Promise<string> {
    return new Promise((resolve, reject) => {
      // This would be called from the MLCChatView component
      // For now, we'll use a placeholder that will be replaced by actual WebView bridge
      if (MLCWebViewInstance) {
        MLCWebViewInstance.generateResponse(prompt)
          .then(resolve)
          .catch(reject);
      } else {
        reject(new Error('MLC WebView not initialized'));
      }
    });
  }

  /**
   * Set the MLC WebView instance for communication
   */
  setMLCWebViewInstance(instance: any) {
    MLCWebViewInstance = instance;
  }

  /**
   * Mark MLC as ready after model loads
   */
  setMLCReady(ready: boolean) {
    this.mlcReady = ready;
  }

  /**
   * Call cloud API (Modal/Together AI)
   */
  private async callCloudApi(
    question: string,
    patientContext: PatientContext,
    conversationHistory: ChatMessage[]
  ): Promise<string> {
    try {
      const systemPrompt = `You are a standardized patient in a clinical simulation.
Role: ${patientContext.presentation}

Instructions:
- Respond as the patient would, based on your condition
- Only reveal information that would be discovered through the asked question
- Be realistic and emotionally appropriate
- Keep responses concise (2-3 sentences max)
- Never reveal your diagnosis directly`;

      const messages: ChatMessage[] = [
        { role: 'system', content: systemPrompt },
        ...conversationHistory,
        { role: 'user', content: question },
      ];

      const response = await fetch(this.config!.cloudApiUrl!, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.config!.cloudApiKey && {
            'Authorization': `Bearer ${this.config!.cloudApiKey}`,
          }),
        },
        body: JSON.stringify({
          model: 'MedGemma-4B',
          messages,
          temperature: 0.7,
          max_tokens: 150,
        }),
      });

      if (!response.ok) {
        throw new Error(`Cloud API error: ${response.status}`);
      }

      const data = await response.json();
      return data.choices?.[0]?.message?.content || data.response || '';
    } catch (error) {
      console.error('Cloud API call failed:', error);
      // Fallback to mock on network errors
      return this.generateMockResponse(question, patientContext, conversationHistory);
    }
  }

  /**
   * Mock response generator for development
   */
  private generateMockResponse(
    question: string,
    patientContext: PatientContext,
    conversationHistory: ChatMessage[]
  ): string {
    const content = question.toLowerCase();

    // Pattern-based responses for development
    if (content.includes('pain') || content.includes('hurt') || content.includes('pressure')) {
      return "Yes, it's a crushing pressure in my chest. It goes down my left arm. It's really bad.";
    }
    if (content.includes('when') || content.includes('start') || content.includes('begin')) {
      return 'It started about 2 hours ago. I was just watching TV when it came on suddenly.';
    }
    if (content.includes('medicine') || content.includes('drug') || content.includes('allerg') || content.includes('take')) {
      return "I take lisinopril for high blood pressure. No drug allergies that I know of.";
    }
    if (content.includes('smoke') || content.includes('alcohol') || content.includes('tobacco') || content.includes('drink')) {
      return "I smoke about a pack a day for 30 years. I drink maybe 2-3 beers on weekends.";
    }
    if (content.includes('family') || content.includes('history')) {
      return "My father had a heart attack in his 50s. My mother has diabetes.";
    }
    if (content.includes('name') || content.includes('age')) {
      return "I'm 58 years old. You can call me John.";
    }
    if (content.includes('what') || content.includes('happen') || content.includes('wrong')) {
      return "My chest hurts real bad. I can barely catch my breath.";
    }

    return "I'm not sure about that. Can you ask me something else?";
  }

  /**
   * Get loading progress (0-100)
   */
  getLoadProgress(): number {
    return this.loadProgress;
  }

  /**
   * Check if service is ready
   */
  isReady(): boolean {
    return this.isInitialized && !this.isLoading;
  }

  /**
   * Get current mode
   */
  getMode(): LLMMode | null {
    return this.config?.mode || null;
  }

  /**
   * Reset the service
   */
  async reset(): Promise<void> {
    this.isInitialized = false;
    this.config = null;
    this.loadProgress = 0;
  }

  /**
   * Switch mode dynamically
   */
  async switchMode(newMode: LLMMode, newConfig?: Partial<LLMConfig>): Promise<void> {
    await this.reset();
    await this.initialize({
      ...this.config,
      ...newConfig,
      mode: newMode,
    });
  }
}

export const LLMService = new LLMServiceClass();
export default LLMService;
