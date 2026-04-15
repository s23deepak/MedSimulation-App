/**
 * On-Device LLM Service
 *
 * Options for on-device inference:
 *
 * 1. MLC Chat (Recommended) - Use via web runtime
 *    - Add <script src="https://cdn.jsdelivr.net/npm/@mlc-ai/web-llm"></script> to WebView
 *    - Load models from HuggingFace
 *
 * 2. TensorFlow.js + React Native
 *    - Use @tensorflow/tfjs-react-native
 *    - Convert models to TensorFlow Lite format
 *
 * 3. Cloud Fallback (Current Implementation)
 *    - Use Modal/Together AI when offline not available
 *
 * For now, this service provides a mock implementation for development.
 * Replace with actual MLC integration when ready.
 */

export interface LLMConfig {
  modelId: string;
  modelUrl?: string;
  useCloudFallback?: boolean;
  cloudUrl?: string;
  cloudApiKey?: string;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

class LLMServiceClass {
  private isInitialized = false;
  private config: LLMConfig | null = null;
  private isLoading = false;
  private loadProgress = 0;

  /**
   * Initialize the LLM service
   * For MLC: Downloads and loads model
   * For cloud: Validates credentials
   */
  async initialize(config: LLMConfig): Promise<void> {
    if (this.isInitialized) return;
    if (this.isLoading) return;

    this.isLoading = true;
    this.config = config;

    try {
      // Simulate model loading progress
      for (let i = 0; i <= 100; i += 10) {
        this.loadProgress = i;
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      this.isInitialized = true;
      console.log('LLM Service initialized with config:', config.modelId);
    } catch (error) {
      console.error('Failed to initialize LLM:', error);
      throw error;
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Generate a response for a chat message
   *
   * In production, this would:
   * - Use MLC WebLLM for on-device inference
   * - Fall back to cloud API if configured
   */
  async chat(messages: ChatMessage[], temperature: number = 0.7): Promise<string> {
    if (!this.isInitialized) {
      throw new Error('LLM not initialized. Call initialize() first.');
    }

    // TODO: Implement actual MLC/TFLite inference
    // For now, return a mock response
    console.log('Chat messages:', messages);

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));

    return this.generateMockResponse(messages);
  }

  /**
   * Generate response for patient simulation
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
- Never reveal your diagnosis directly`;

    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory,
      { role: 'user', content: question },
    ];

    return this.chat(messages, 0.7);
  }

  /**
   * Mock response generator for development
   * Replace with actual LLM inference in production
   */
  private generateMockResponse(messages: ChatMessage[]): string {
    const lastMessage = messages[messages.length - 1];
    const content = lastMessage?.content.toLowerCase() || '';

    // Pattern-based responses for development
    if (content.includes('pain') || content.includes('hurt')) {
      return "Yes, it's a crushing pressure in my chest. It goes down my left arm. It's really bad.";
    }
    if (content.includes('when') || content.includes('start')) {
      return 'It started about 2 hours ago. I was just watching TV when it came on suddenly.';
    }
    if (content.includes('medicine') || content.includes('drug') || content.includes('allerg')) {
      return "I take lisinopril for high blood pressure. No drug allergies that I know of.";
    }
    if (content.includes('smoke') || content.includes('alcohol') || content.includes('tobacco')) {
      return "I smoke about a pack a day for 30 years. I drink maybe 2-3 beers on weekends.";
    }
    if (content.includes('family') || content.includes('history')) {
      return "My father had a heart attack in his 50s. My mother has diabetes.";
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
   * Reset the service
   */
  async reset(): Promise<void> {
    this.isInitialized = false;
    this.config = null;
    this.loadProgress = 0;
  }
}

export const LLMService = new LLMServiceClass();
export default LLMService;
