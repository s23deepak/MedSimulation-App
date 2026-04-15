/**
 * On-Device LLM Service using MLC Chat
 * Runs Gemma 2B or similar models locally on device
 * No internet required for inference
 */

import { MLCChat } from '@mlc-ai/mlc-chat';

export interface LLMConfig {
  modelId: string;
  modelUrl?: string;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

class LLMServiceClass {
  private chatInstance: MLCChat | null = null;
  private isModelLoaded = false;
  private isLoading = false;
  private loadProgress = 0;

  /**
   * Initialize the MLC Chat engine
   */
  async initialize(config: LLMConfig): Promise<void> {
    if (this.isModelLoaded) return;
    if (this.isLoading) return;

    this.isLoading = true;

    try {
      this.chatInstance = new MLCChat();

      await this.chatInstance.reload(
        config.modelId,
        config.modelUrl,
        (progress: number) => {
          this.loadProgress = progress;
          console.log(`Model loading: ${progress}%`);
        }
      );

      this.isModelLoaded = true;
      console.log('MLC Chat model loaded successfully');
    } catch (error) {
      console.error('Failed to load MLC Chat model:', error);
      throw error;
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Generate a response for a chat message
   */
  async chat(messages: ChatMessage[], temperature: number = 0.7): Promise<string> {
    if (!this.chatInstance || !this.isModelLoaded) {
      throw new Error('Model not loaded. Call initialize() first.');
    }

    try {
      // Convert messages to MLC format
      const formattedMessages = messages.map(m => ({
        role: m.role,
        content: m.content,
      }));

      const response = await this.chatInstance.chatCompletion(
        formattedMessages,
        {
          temperature,
          max_gen_len: 512,
        }
      );

      return response;
    } catch (error) {
      console.error('LLM chat error:', error);
      throw error;
    }
  }

  /**
   * Generate response for patient simulation
   * Special handling for standardized patient responses
   */
  async generatePatientResponse(
    question: string,
    patientContext: {
      presentation: string;
      physicalExam: Record<string, string>;
      investigations: Record<string, string>;
    },
    conversationHistory: ChatMessage[]
  ): Promise<string> {
    const systemPrompt = `You are a standardized patient in a clinical simulation.
Role: ${patientContext.presentation}

Instructions:
- Respond as the patient would, based on your condition
- Only reveal information that would be discovered through the asked question
- Be realistic and emotionally appropriate
- Keep responses concise (2-3 sentences max)
- If asked about something you haven't been evaluated for, respond appropriately
- Never reveal your diagnosis directly

Physical exam findings (only reveal if specifically examined):
${JSON.stringify(patientContext.physicalExam, null, 2)}

Investigation results (only reveal if ordered):
${JSON.stringify(patientContext.investigations, null, 2)}`;

    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory,
      { role: 'user', content: question },
    ];

    return this.chat(messages, 0.7);
  }

  /**
   * Get loading progress (0-100)
   */
  getLoadProgress(): number {
    return this.loadProgress;
  }

  /**
   * Check if model is loaded and ready
   */
  isReady(): boolean {
    return this.isModelLoaded && !this.isLoading;
  }

  /**
   * Unload model to free memory
   */
  async unload(): Promise<void> {
    if (this.chatInstance) {
      await this.chatInstance.unload();
      this.chatInstance = null;
      this.isModelLoaded = false;
      this.loadProgress = 0;
    }
  }
}

export const LLMService = new LLMServiceClass();
export default LLMService;
