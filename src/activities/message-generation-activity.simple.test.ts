import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMessageGenerationActivity } from './message-generation-activity';
import { DelayNotification } from '../types/delay-notification';
import { DeliveryRoute } from '../types/delivery-route';

// Mock OpenAI module
vi.mock('openai', () => ({
  default: vi.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: vi.fn().mockResolvedValue({
          choices: [{
            message: {
              content: 'Test AI generated message'
            }
          }],
          usage: { prompt_tokens: 50, completion_tokens: 20, total_tokens: 70 }
        })
      }
    }
  }))
}));

describe('MessageGenerationActivity - Basic Tests', () => {
  let sampleNotification: DelayNotification;

  beforeEach(() => {
    // Mock console methods
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const sampleRoute: DeliveryRoute = {
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
      message: ''
    };
  });

  it('should create activity instance', () => {
    const activity = createMessageGenerationActivity('test-key');
    expect(activity).toBeDefined();
  });

  it('should generate fallback message when no API key provided', async () => {
    const activity = createMessageGenerationActivity();
    
    const result = await activity.generateDelayMessage(sampleNotification);

    expect(result).toContain('Dear Valued Customer');
    expect(result).toContain('45 minutes');
  });

  it('should handle AI message generation', async () => {
    const activity = createMessageGenerationActivity('test-key');
    
    const result = await activity.generateDelayMessage(sampleNotification);

    expect(result).toBeDefined();
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });
});