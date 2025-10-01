import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MessageGenerationActivityImpl, createMessageGenerationActivity } from './message-generation-activity';
import { DelayNotification } from '../types/delay-notification';
import { DeliveryRoute } from '../types/delivery-route';

// Mock OpenAI module
const mockCreate = vi.fn();
const mockOpenAIConstructor = vi.fn().mockImplementation(() => ({
  chat: {
    completions: {
      create: mockCreate
    }
  }
}));

vi.mock('openai', () => ({
  default: mockOpenAIConstructor
}));

describe('MessageGenerationActivity', () => {
  let sampleNotification: DelayNotification;
  let sampleRoute: DeliveryRoute;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
    mockCreate.mockClear();
    mockOpenAIConstructor.mockClear();
    
    // Mock console methods to avoid test output noise
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});

    // Create sample test data
    sampleRoute = {
      routeId: 'ROUTE-123',
      origin: 'New York, NY',
      destination: 'Boston, MA',
      baselineTimeMinutes: 240
    };

    sampleNotification = {
      customerId: 'CUST-456',
      customerEmail: 'customer@example.com',
      route: sampleRoute,
      delayMinutes: 45,
      message: '' // Will be populated by the activity
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('generateDelayMessage', () => {
    it('should generate AI message successfully with valid input', async () => {
      const activity = createMessageGenerationActivity('test-api-key');
      
      // Mock successful OpenAI API response
      const mockResponse = {
        choices: [{
          message: {
            content: 'Dear Valued Customer, we apologize for the 45 minute delay on your delivery from New York, NY to Boston, MA. Thank you for your patience.'
          }
        }],
        usage: {
          prompt_tokens: 150,
          completion_tokens: 80,
          total_tokens: 230
        }
      };

      mockCreate.mockResolvedValue(mockResponse);

      const result = await activity.generateDelayMessage(sampleNotification);

      expect(result).toBe(mockResponse.choices[0].message.content);
      expect(mockCreate).toHaveBeenCalledWith({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: expect.stringContaining('customer service representative')
          },
          {
            role: 'user',
            content: expect.stringContaining('New York, NY')
          }
        ],
        max_tokens: 300,
        temperature: 0.7
      });
    });

    it('should use fallback message when OpenAI API fails', async () => {
      const activity = createMessageGenerationActivity('test-api-key');
      
      // Mock OpenAI API failure
      mockCreate.mockRejectedValue(new Error('API Error'));

      const result = await activity.generateDelayMessage(sampleNotification);

      expect(result).toContain('Dear Valued Customer');
      expect(result).toContain('45 minutes');
      expect(result).toContain('ROUTE-123');
      expect(mockCreate).toHaveBeenCalled();
    });

    it('should use fallback message when no API key is provided', async () => {
      // Create activity without API key
      const activityNoKey = createMessageGenerationActivity();
      
      const result = await activityNoKey.generateDelayMessage(sampleNotification);

      expect(result).toContain('Dear Valued Customer');
      expect(result).toContain('45 minutes');
      expect(result).toContain('ROUTE-123');
      // Should not call OpenAI API when no key provided
      expect(mockCreate).not.toHaveBeenCalled();
    });

    it('should handle empty OpenAI response gracefully', async () => {
      const activity = createMessageGenerationActivity('test-api-key');
      
      // Mock empty response
      const mockResponse = {
        choices: [{
          message: {
            content: ''
          }
        }],
        usage: {
          prompt_tokens: 50,
          completion_tokens: 0,
          total_tokens: 50
        }
      };

      mockCreate.mockResolvedValue(mockResponse);

      const result = await activity.generateDelayMessage(sampleNotification);

      // Should fall back to default message
      expect(result).toContain('Dear Valued Customer');
      expect(result).toContain('45 minutes');
    });

    it('should validate input notification data', async () => {
      const activity = createMessageGenerationActivity('test-api-key');
      
      const invalidNotification = {
        customerId: '',
        customerEmail: 'invalid-email',
        route: sampleRoute,
        delayMinutes: -5,
        message: ''
      };

      await expect(activity.generateDelayMessage(invalidNotification as any))
        .rejects.toThrow();
    });

    it('should handle different delay amounts correctly', async () => {
      const activity = createMessageGenerationActivity('test-api-key');
      
      const testCases = [
        { delayMinutes: 0, description: 'zero delay' },
        { delayMinutes: 15, description: 'small delay' },
        { delayMinutes: 120, description: 'large delay' }
      ];

      for (const testCase of testCases) {
        const notification = { ...sampleNotification, delayMinutes: testCase.delayMinutes };
        
        // Mock successful response
        mockCreate.mockResolvedValue({
          choices: [{
            message: {
              content: `Test message for ${testCase.delayMinutes} minute delay`
            }
          }],
          usage: { prompt_tokens: 50, completion_tokens: 20, total_tokens: 70 }
        });

        const result = await activity.generateDelayMessage(notification);
        expect(result).toContain(testCase.delayMinutes.toString());
      }
    });

    it('should include route information in the prompt', async () => {
      const activity = createMessageGenerationActivity('test-api-key');
      
      mockCreate.mockResolvedValue({
        choices: [{
          message: {
            content: 'Generated message'
          }
        }],
        usage: { prompt_tokens: 50, completion_tokens: 20, total_tokens: 70 }
      });

      await activity.generateDelayMessage(sampleNotification);

      expect(mockCreate).toHaveBeenCalled();
      const callArgs = mockCreate.mock.calls[0][0];
      const userMessage = callArgs.messages[1].content;
      
      expect(userMessage).toContain('New York, NY');
      expect(userMessage).toContain('Boston, MA');
      expect(userMessage).toContain('ROUTE-123');
      expect(userMessage).toContain('45 minutes');
    });
  });

  describe('fallback message functionality', () => {
    it('should generate fallback message with correct placeholders', async () => {
      // Create activity without API key to force fallback
      const activityNoKey = createMessageGenerationActivity();
      
      const result = await activityNoKey.generateDelayMessage(sampleNotification);

      expect(result).toContain('Dear Valued Customer');
      expect(result).toContain('45 minutes');
      expect(result).toContain('Route Reference: ROUTE-123');
      expect(result).toContain('sincerely apologize');
      expect(result).toContain('Best regards');
    });

    it('should handle missing route ID in fallback', async () => {
      const notificationNoRouteId = {
        ...sampleNotification,
        route: {
          ...sampleRoute,
          routeId: ''
        }
      };

      const activityNoKey = createMessageGenerationActivity();
      const result = await activityNoKey.generateDelayMessage(notificationNoRouteId);

      expect(result).toContain('Dear Valued Customer');
      expect(result).toContain('45 minutes');
      expect(result).not.toContain('Route Reference:');
    });

    it('should allow updating fallback message template', () => {
      const activity = createMessageGenerationActivity('test-api-key');
      const newFallback = 'Custom fallback message with {delayMinutes} minutes delay';
      
      activity.setFallbackMessage(newFallback);
      
      // This should not throw
      expect(() => activity.setFallbackMessage(newFallback)).not.toThrow();
    });

    it('should reject empty fallback message', () => {
      const activity = createMessageGenerationActivity('test-api-key');
      
      expect(() => activity.setFallbackMessage('')).toThrow('Fallback message cannot be empty');
      expect(() => activity.setFallbackMessage('   ')).toThrow('Fallback message cannot be empty');
    });
  });

  describe('factory function', () => {
    it('should create activity instance with API key', () => {
      const activity = createMessageGenerationActivity('test-key');
      expect(activity).toBeInstanceOf(MessageGenerationActivityImpl);
    });

    it('should create activity instance without API key', () => {
      const activity = createMessageGenerationActivity();
      expect(activity).toBeInstanceOf(MessageGenerationActivityImpl);
    });
  });
});