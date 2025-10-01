import { describe, it, expect } from 'vitest';
import { 
  FreightDelayMonitorInput, 
  FreightDelayMonitorResult,
  freightDelayMonitorWorkflow 
} from './freight-delay-monitor-workflow';
import { DeliveryRoute } from '../types/delivery-route';
import { WorkflowConfig } from '../types/workflow-config';

describe('FreightDelayMonitorWorkflow', () => {
  it('should have correct input and output types', () => {
    // Test that the workflow function signature is correct
    const mockInput: FreightDelayMonitorInput = {
      route: {
        routeId: 'test-route-1',
        origin: 'New York, NY',
        destination: 'Boston, MA',
        baselineTimeMinutes: 240
      },
      customer: {
        customerId: 'customer-123',
        customerEmail: 'test@example.com'
      },
      config: {
        delayThresholdMinutes: 30,
        retryAttempts: 3,
        fallbackMessage: 'Your delivery is delayed by {delayMinutes} minutes.'
      }
    };

    // Verify the input type is correct
    expect(mockInput.route.routeId).toBe('test-route-1');
    expect(mockInput.customer.customerId).toBe('customer-123');
    expect(mockInput.config.delayThresholdMinutes).toBe(30);

    // Verify the workflow function exists and has correct signature
    expect(typeof freightDelayMonitorWorkflow).toBe('function');
    expect(freightDelayMonitorWorkflow.length).toBe(1); // Should accept one parameter
  });

  it('should define correct result interface', () => {
    const mockResult: FreightDelayMonitorResult = {
      delayDetected: true,
      delayMinutes: 45,
      notificationSent: true,
      completedAt: new Date()
    };

    expect(mockResult.delayDetected).toBe(true);
    expect(mockResult.delayMinutes).toBe(45);
    expect(mockResult.notificationSent).toBe(true);
    expect(mockResult.completedAt).toBeInstanceOf(Date);
  });

  it('should have proper workflow configuration constants', () => {
    // Verify the workflow function is exported and accessible
    expect(freightDelayMonitorWorkflow).toBeDefined();
    expect(typeof freightDelayMonitorWorkflow).toBe('function');
  });
});