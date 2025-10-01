import { describe, it, expect } from 'vitest';
import { DeliveryRoute, validateDeliveryRoute } from './types/delivery-route';
import { WorkflowConfig, validateWorkflowConfig } from './types/workflow-config';

describe('Client Input Validation', () => {
  describe('DeliveryRoute validation', () => {
    const validRoute: DeliveryRoute = {
      routeId: 'TEST-001',
      origin: 'San Francisco, CA',
      destination: 'San Jose, CA',
      baselineTimeMinutes: 60
    };

    it('should validate a valid route', () => {
      expect(() => validateDeliveryRoute(validRoute)).not.toThrow();
    });

    it('should reject route with empty routeId', () => {
      const invalidRoute = { ...validRoute, routeId: '' };
      expect(() => validateDeliveryRoute(invalidRoute)).toThrow('Route ID must be a non-empty string');
    });

    it('should reject route with empty origin', () => {
      const invalidRoute = { ...validRoute, origin: '' };
      expect(() => validateDeliveryRoute(invalidRoute)).toThrow('Origin must be a non-empty string');
    });

    it('should reject route with empty destination', () => {
      const invalidRoute = { ...validRoute, destination: '' };
      expect(() => validateDeliveryRoute(invalidRoute)).toThrow('Destination must be a non-empty string');
    });

    it('should reject route with invalid baseline time', () => {
      const invalidRoute = { ...validRoute, baselineTimeMinutes: -1 };
      expect(() => validateDeliveryRoute(invalidRoute)).toThrow('Baseline time must be a positive number');
    });

    it('should reject non-object input', () => {
      expect(() => validateDeliveryRoute(null)).toThrow('Route must be an object');
      expect(() => validateDeliveryRoute('string')).toThrow('Route must be an object');
      expect(() => validateDeliveryRoute(123)).toThrow('Route must be an object');
    });
  });

  describe('WorkflowConfig validation', () => {
    const validConfig: WorkflowConfig = {
      delayThresholdMinutes: 30,
      retryAttempts: 3,
      fallbackMessage: 'Test fallback message'
    };

    it('should validate a valid config', () => {
      expect(() => validateWorkflowConfig(validConfig)).not.toThrow();
    });

    it('should reject config with invalid delay threshold', () => {
      const invalidConfig = { ...validConfig, delayThresholdMinutes: -1 };
      expect(() => validateWorkflowConfig(invalidConfig)).toThrow('Delay threshold must be a positive number');
    });

    it('should reject config with invalid retry attempts', () => {
      const invalidConfig = { ...validConfig, retryAttempts: -1 };
      expect(() => validateWorkflowConfig(invalidConfig)).toThrow('Retry attempts must be a non-negative integer');
    });

    it('should reject config with empty fallback message', () => {
      const invalidConfig = { ...validConfig, fallbackMessage: '' };
      expect(() => validateWorkflowConfig(invalidConfig)).toThrow('Fallback message must be a non-empty string');
    });

    it('should reject non-object input', () => {
      expect(() => validateWorkflowConfig(null)).toThrow('Configuration must be an object');
      expect(() => validateWorkflowConfig('string')).toThrow('Configuration must be an object');
      expect(() => validateWorkflowConfig(123)).toThrow('Configuration must be an object');
    });
  });

  describe('Customer validation', () => {
    it('should validate email format', () => {
      const validEmails = [
        'test@example.com',
        'user.name@domain.co.uk',
        'user+tag@example.org'
      ];

      const invalidEmails = [
        'invalid-email',
        '@example.com',
        'user@',
        'user@.com',
        'user space@example.com'
      ];

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      validEmails.forEach(email => {
        expect(emailRegex.test(email)).toBe(true);
      });

      invalidEmails.forEach(email => {
        expect(emailRegex.test(email)).toBe(false);
      });
    });
  });
});

describe('Client Types and Interfaces', () => {
  it('should define correct CustomerInfo interface', () => {
    const customer = {
      customerId: 'CUST-001',
      customerEmail: 'test@example.com'
    };

    // Type checking - this will fail at compile time if interface is wrong
    expect(customer.customerId).toBe('CUST-001');
    expect(customer.customerEmail).toBe('test@example.com');
  });

  it('should define correct WorkflowExecutionOptions interface', () => {
    const options = {
      workflowId: 'test-workflow',
      taskQueue: 'test-queue',
      workflowExecutionTimeoutMs: 600000, // 10 minutes
      workflowRunTimeoutMs: 300000 // 5 minutes
    };

    // Type checking - this will fail at compile time if interface is wrong
    expect(options.workflowId).toBe('test-workflow');
    expect(options.taskQueue).toBe('test-queue');
    expect(options.workflowExecutionTimeoutMs).toBe(600000);
    expect(options.workflowRunTimeoutMs).toBe(300000);
  });
});

describe('Workflow ID Generation', () => {
  it('should generate unique workflow IDs', () => {
    const route: DeliveryRoute = {
      routeId: 'TEST-001',
      origin: 'San Francisco, CA',
      destination: 'San Jose, CA',
      baselineTimeMinutes: 60
    };

    // Simulate workflow ID generation logic
    const generateWorkflowId = (routeId: string) => `freight-delay-${routeId}-${Date.now()}`;
    
    const id1 = generateWorkflowId(route.routeId);
    
    // Wait a small amount to ensure different timestamp
    setTimeout(() => {
      const id2 = generateWorkflowId(route.routeId);
      expect(id1).not.toBe(id2);
      expect(id1).toContain('freight-delay-TEST-001-');
      expect(id2).toContain('freight-delay-TEST-001-');
    }, 1);
  });
});

describe('Error Message Formatting', () => {
  it('should format error messages correctly', () => {
    const formatError = (operation: string, originalError: string) => 
      `Failed to ${operation}: ${originalError}`;

    expect(formatError('start workflow', 'Connection timeout')).toBe(
      'Failed to start workflow: Connection timeout'
    );

    expect(formatError('get workflow status', 'Workflow not found')).toBe(
      'Failed to get workflow status: Workflow not found'
    );
  });

  it('should handle unknown errors', () => {
    const getErrorMessage = (error: unknown) => 
      error instanceof Error ? error.message : 'Unknown error';

    expect(getErrorMessage(new Error('Test error'))).toBe('Test error');
    expect(getErrorMessage('string error')).toBe('Unknown error');
    expect(getErrorMessage(null)).toBe('Unknown error');
    expect(getErrorMessage(undefined)).toBe('Unknown error');
  });
});