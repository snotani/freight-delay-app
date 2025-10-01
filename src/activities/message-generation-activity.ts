import OpenAI from 'openai';
import { DelayNotification, validateDelayNotification } from '../types/delay-notification';
import { MessageGenerationActivity } from '../types/activity-interfaces';
import { createLogger, createTimer, Logger } from '../utilities/logging';

/**
 * Message generation activity implementation using OpenAI API
 * Generates personalized delay notification messages with AI assistance
 */
export class MessageGenerationActivityImpl implements MessageGenerationActivity {
  private openai: OpenAI;
  private fallbackMessage: string;
  private readonly logger: Logger;

  constructor(apiKey?: string) {
    this.logger = createLogger('MessageGeneration');
    
    // Initialize OpenAI client with API key from environment or parameter
    const openaiApiKey = apiKey || process.env.OPENAI_API_KEY;
    
    if (!openaiApiKey) {
      this.logger.warn('No OpenAI API key provided - fallback mode only');
      this.openai = null as any; // Will use fallback for all requests
    } else {
      try {
        this.openai = new OpenAI({
          apiKey: openaiApiKey,
        });
        this.logger.info('OpenAI client initialized successfully');
      } catch (error) {
        this.logger.warn('Failed to initialize OpenAI client - fallback mode only', {
          error: error instanceof Error ? error.message : 'Unknown error'
        });
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
    const timer = createTimer(this.logger, 'generateDelayMessage');
    
    try {
      // Validate input notification data
      validateDelayNotification(notification);

      this.logger.info('Starting message generation', {
        customerId: notification.customerId,
        routeId: notification.route.routeId,
        origin: notification.route.origin,
        destination: notification.route.destination,
        delayMinutes: notification.delayMinutes
      });

      // If no OpenAI client available, use fallback immediately
      if (!this.openai) {
        this.logger.info('No OpenAI client available, using fallback message');
        const fallbackMessage = this.generateFallbackMessage(notification);
        
        timer.complete(true, {
          customerId: notification.customerId,
          messageSource: 'fallback',
          messageLength: fallbackMessage.length
        });
        
        return fallbackMessage;
      }

      try {
        // Generate AI message using OpenAI API
        const aiMessage = await this.generateAIMessage(notification);
        
        timer.complete(true, {
          customerId: notification.customerId,
          messageSource: 'ai',
          messageLength: aiMessage.length
        });
        
        return aiMessage;

      } catch (aiError) {
        this.logger.warn('AI message generation failed, using fallback', {
          customerId: notification.customerId,
          error: aiError instanceof Error ? aiError.message : 'Unknown error'
        });
        
        const fallbackMessage = this.generateFallbackMessage(notification);
        
        timer.complete(true, {
          customerId: notification.customerId,
          messageSource: 'fallback_after_ai_failure',
          messageLength: fallbackMessage.length
        });
        
        return fallbackMessage;
      }

    } catch (error) {
      timer.complete(false);
      this.logger.error('Failed to generate message', error as Error, {
        customerId: notification?.customerId,
        routeId: notification?.route?.routeId
      });
      
      // Even on validation errors, try to provide a basic fallback
      try {
        return this.generateFallbackMessage(notification);
      } catch (fallbackError) {
        this.logger.error('Fallback message generation also failed', fallbackError as Error);
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
    
    this.logger.debug('Calling OpenAI API', {
      model: 'gpt-4o-mini',
      customerId: notification.customerId,
      promptLength: prompt.length
    });
    
    const apiTimer = createTimer(this.logger, 'OpenAI API');
    
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

    const apiDuration = apiTimer.complete(true);

    // Log API usage for monitoring
    if (response.usage) {
      this.logger.info('OpenAI API call completed', {
        customerId: notification.customerId,
        promptTokens: response.usage.prompt_tokens,
        completionTokens: response.usage.completion_tokens,
        totalTokens: response.usage.total_tokens,
        duration: apiDuration
      });

      this.logger.apiCall('OpenAI', apiDuration, true, 200, {
        customerId: notification.customerId,
        model: 'gpt-4o-mini',
        totalTokens: response.usage.total_tokens
      });
    }

    const generatedMessage = response.choices[0]?.message?.content?.trim();
    
    if (!generatedMessage) {
      throw new Error('OpenAI API returned empty message content');
    }

    // Validate message quality
    this.validateGeneratedMessage(generatedMessage, notification);
    
    this.logger.info('AI message generated and validated', {
      customerId: notification.customerId,
      messageLength: generatedMessage.length,
      duration: apiDuration
    });
    
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
    this.logger.debug('Generating fallback message', {
      customerId: notification.customerId,
      delayMinutes: notification.delayMinutes
    });
    
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

    this.logger.info('Fallback message generated', {
      customerId: notification.customerId,
      messageLength: message.length,
      routeId: route.routeId
    });
    
    return message;
  }

  /**
   * Validates the quality and content of generated messages
   * @param message - Generated message to validate
   * @param notification - Original notification data for context
   */
  private validateGeneratedMessage(message: string, notification: DelayNotification): void {
    const validationResults = {
      lengthValid: true,
      delayMentioned: false,
      professionalTone: false,
      warnings: [] as string[]
    };

    // Check minimum length
    if (message.length < 50) {
      validationResults.lengthValid = false;
      throw new Error('Generated message is too short');
    }

    // Check maximum length
    if (message.length > 1000) {
      validationResults.warnings.push('Message is quite long');
      this.logger.warn('Generated message is quite long, consider reviewing', {
        customerId: notification.customerId,
        messageLength: message.length
      });
    }

    // Check if delay time is mentioned
    const delayMentioned = message.includes(notification.delayMinutes.toString()) || 
                          message.toLowerCase().includes('delay');
    validationResults.delayMentioned = delayMentioned;
    
    if (!delayMentioned) {
      validationResults.warnings.push('Delay not clearly mentioned');
      this.logger.warn('Generated message may not clearly mention the delay', {
        customerId: notification.customerId,
        delayMinutes: notification.delayMinutes
      });
    }

    // Check for professional tone indicators
    const professionalIndicators = ['apologize', 'sorry', 'inconvenience', 'patience', 'understanding'];
    const hasProfessionalTone = professionalIndicators.some(indicator => 
      message.toLowerCase().includes(indicator)
    );
    validationResults.professionalTone = hasProfessionalTone;

    if (!hasProfessionalTone) {
      validationResults.warnings.push('May lack professional apologetic tone');
      this.logger.warn('Generated message may lack professional apologetic tone', {
        customerId: notification.customerId
      });
    }

    this.logger.debug('Message validation completed', {
      customerId: notification.customerId,
      messageLength: message.length,
      validationResults
    });
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
    this.logger.info('Fallback message template updated', {
      messageLength: newFallbackMessage.length
    });
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