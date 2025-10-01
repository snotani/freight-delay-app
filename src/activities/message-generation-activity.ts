import OpenAI from 'openai';
import { DelayNotification, validateDelayNotification } from '../types/delay-notification';
import { MessageGenerationActivity } from '../types/activity-interfaces';

/**
 * Message generation activity implementation using OpenAI API
 * Generates personalized delay notification messages with AI assistance
 */
export class MessageGenerationActivityImpl implements MessageGenerationActivity {
  private openai: OpenAI;
  private fallbackMessage: string;

  constructor(apiKey?: string) {
    // Initialize OpenAI client with API key from environment or parameter
    const openaiApiKey = apiKey || process.env.OPENAI_API_KEY;
    
    if (!openaiApiKey) {
      console.warn('[MessageGeneration] No OpenAI API key provided - fallback mode only');
      this.openai = null as any; // Will use fallback for all requests
    } else {
      try {
        this.openai = new OpenAI({
          apiKey: openaiApiKey,
        });
      } catch (error) {
        console.warn('[MessageGeneration] Failed to initialize OpenAI client - fallback mode only');
        this.openai = null as any;
      }
    }

    // Default fallback message template
    this.fallbackMessage = `Dear Valued Customer,

We wanted to inform you about a delay with your delivery. Due to current traffic conditions, your delivery is experiencing an estimated delay of {delayMinutes} minutes.

We sincerely apologize for any inconvenience this may cause and appreciate your patience. Our team is working to ensure your delivery arrives as soon as possible.

If you have any questions or concerns, please don't hesitate to contact our customer service team.

Thank you for your understanding.

Best regards,
The Delivery Team`;
  }

  /**
   * Generates a personalized delay notification message using AI
   * @param notification - Delay notification data including customer and route info
   * @returns Promise resolving to generated message string
   */
  async generateDelayMessage(notification: DelayNotification): Promise<string> {
    const startTime = Date.now();
    
    try {
      // Validate input notification data
      validateDelayNotification(notification);

      console.log(`[MessageGeneration] Starting message generation for customer ${notification.customerId}`);
      console.log(`[MessageGeneration] Route: ${notification.route.origin} → ${notification.route.destination}`);
      console.log(`[MessageGeneration] Delay: ${notification.delayMinutes} minutes`);

      // If no OpenAI client available, use fallback immediately
      if (!this.openai) {
        console.log('[MessageGeneration] No OpenAI client available, using fallback message');
        return this.generateFallbackMessage(notification);
      }

      try {
        // Generate AI message using OpenAI API
        const aiMessage = await this.generateAIMessage(notification);
        
        const processingTime = Date.now() - startTime;
        console.log(`[MessageGeneration] AI message generated successfully in ${processingTime}ms`);
        console.log(`[MessageGeneration] Message length: ${aiMessage.length} characters`);
        
        return aiMessage;

      } catch (aiError) {
        console.warn('[MessageGeneration] AI message generation failed, using fallback:', aiError);
        return this.generateFallbackMessage(notification);
      }

    } catch (error) {
      const processingTime = Date.now() - startTime;
      console.error(`[MessageGeneration] Error generating message after ${processingTime}ms:`, error);
      
      // Even on validation errors, try to provide a basic fallback
      try {
        return this.generateFallbackMessage(notification);
      } catch (fallbackError) {
        console.error('[MessageGeneration] Fallback message generation also failed:', fallbackError);
        throw error; // Re-throw original error
      }
    }
  }

  /**
   * Generates AI-powered personalized message using OpenAI API
   * @param notification - Delay notification data
   * @returns Promise resolving to AI-generated message
   */
  private async generateAIMessage(notification: DelayNotification): Promise<string> {
    const prompt = this.buildPrompt(notification);
    
    console.log('[MessageGeneration] Calling OpenAI API with gpt-4o-mini model');
    
    const response = await this.openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful customer service representative writing delivery delay notifications. Write friendly, professional, and empathetic messages that inform customers about delays while maintaining a positive tone.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 300,
      temperature: 0.7,
    });

    // Log API usage for monitoring
    if (response.usage) {
      console.log(`[MessageGeneration] OpenAI API usage - Prompt: ${response.usage.prompt_tokens}, Completion: ${response.usage.completion_tokens}, Total: ${response.usage.total_tokens} tokens`);
    }

    const generatedMessage = response.choices[0]?.message?.content?.trim();
    
    if (!generatedMessage) {
      throw new Error('OpenAI API returned empty message content');
    }

    // Validate message quality
    this.validateGeneratedMessage(generatedMessage, notification);
    
    return generatedMessage;
  }

  /**
   * Builds the prompt for OpenAI API based on notification data
   * @param notification - Delay notification data
   * @returns Formatted prompt string
   */
  private buildPrompt(notification: DelayNotification): string {
    const { route, delayMinutes, customerId } = notification;
    
    return `Please write a friendly and professional email notification for a delivery delay with the following details:

Customer ID: ${customerId}
Route: From ${route.origin} to ${route.destination}
Delay: ${delayMinutes} minutes
Route ID: ${route.routeId}

Requirements:
- Keep the tone friendly, empathetic, and professional
- Acknowledge the inconvenience and apologize sincerely
- Provide the specific delay time
- Reassure the customer that we're working to resolve the issue
- Thank them for their patience and understanding
- Keep the message concise but warm (aim for 100-200 words)
- Do not include placeholder text like [Customer Name] - write it generically
- End with a professional closing

Please write the complete email message:`;
  }

  /**
   * Generates fallback message when AI generation fails
   * @param notification - Delay notification data
   * @returns Formatted fallback message
   */
  private generateFallbackMessage(notification: DelayNotification): string {
    console.log('[MessageGeneration] Generating fallback message');
    
    const { route, delayMinutes } = notification;
    
    // Replace placeholders in fallback template
    let message = this.fallbackMessage
      .replace('{delayMinutes}', delayMinutes.toString())
      .replace('{origin}', route.origin)
      .replace('{destination}', route.destination);

    // Add route-specific context if available
    if (route.routeId) {
      message += `\n\nRoute Reference: ${route.routeId}`;
    }

    console.log(`[MessageGeneration] Fallback message generated (${message.length} characters)`);
    
    return message;
  }

  /**
   * Validates the quality and content of generated messages
   * @param message - Generated message to validate
   * @param notification - Original notification data for context
   */
  private validateGeneratedMessage(message: string, notification: DelayNotification): void {
    // Check minimum length
    if (message.length < 50) {
      throw new Error('Generated message is too short');
    }

    // Check maximum length
    if (message.length > 1000) {
      console.warn('[MessageGeneration] Generated message is quite long, consider reviewing');
    }

    // Check if delay time is mentioned
    const delayMentioned = message.includes(notification.delayMinutes.toString()) || 
                          message.toLowerCase().includes('delay');
    
    if (!delayMentioned) {
      console.warn('[MessageGeneration] Generated message may not clearly mention the delay');
    }

    // Check for professional tone indicators
    const professionalIndicators = ['apologize', 'sorry', 'inconvenience', 'patience', 'understanding'];
    const hasProfessionalTone = professionalIndicators.some(indicator => 
      message.toLowerCase().includes(indicator)
    );

    if (!hasProfessionalTone) {
      console.warn('[MessageGeneration] Generated message may lack professional apologetic tone');
    }

    console.log('[MessageGeneration] Message validation completed successfully');
  }

  /**
   * Updates the fallback message template
   * @param newFallbackMessage - New fallback message template
   */
  setFallbackMessage(newFallbackMessage: string): void {
    if (!newFallbackMessage || newFallbackMessage.trim().length === 0) {
      throw new Error('Fallback message cannot be empty');
    }
    
    this.fallbackMessage = newFallbackMessage;
    console.log('[MessageGeneration] Fallback message template updated');
  }
}

/**
 * Factory function to create message generation activity instance
 * @param apiKey - Optional OpenAI API key (uses environment variable if not provided)
 * @returns MessageGenerationActivityImpl instance
 */
export function createMessageGenerationActivity(apiKey?: string): MessageGenerationActivityImpl {
  return new MessageGenerationActivityImpl(apiKey);
}