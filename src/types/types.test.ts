import { describe, it, expect } from 'vitest';
import {
  DeliveryRoute,
  validateDeliveryRoute,
  TrafficData,
  validateTrafficData,
  DelayNotification,
  validateDelayNotification,
  WorkflowConfig,
  validateWorkflowConfig,
  validateEnvironmentConfig,
  EnvironmentConfig
} from './index';

describe('Type Definitions and Validation', () => {
  describe('DeliveryRoute', () => {
    it('should validate a correct delivery route', () => {
      const route: DeliveryRoute = {
        routeId: 'route-123',
        origin: '123 Main St, City, State',
        destination: '456 Oak Ave, City, State',
        baselineTimeMinutes: 45
      };

      expect(() => validateDeliveryRoute(route)).not.toThrow();
    });

    it('should reject invalid delivery route data', () => {
      expect(() => validateDeliveryRoute(null)).toThrow('Route must be an object');
      expect(() => validateDeliveryRoute({ routeId: '' })).toThrow('Route ID must be a non-empty string');
      expect(() => validateDeliveryRoute({ routeId: 'test', origin: '' })).toThrow('Origin must be a non-empty string');
      expect(() => validateDeliveryRoute({ 
        routeId: 'test', 
        origin: 'test', 
        destination: 'test',
        baselineTimeMinutes: -1 
      })).toThrow('Baseline time must be a positive number');
    });
  });

  describe('TrafficData', () => {
    it('should validate correct traffic data', () => {
      const trafficData: TrafficData = {
        currentTravelTimeMinutes: 60,
        delayMinutes: 15,
        trafficConditions: 'Heavy traffic',
        retrievedAt: new Date()
      };

      expect(() => validateTrafficData(trafficData)).not.toThrow();
    });

    it('should reject invalid traffic data', () => {
      expect(() => validateTrafficData(null)).toThrow('Traffic data must be an object');
      expect(() => validateTrafficData({ currentTravelTimeMinutes: -1 })).toThrow('Current travel time must be a non-negative number');
      expect(() => validateTrafficData({ 
        currentTravelTimeMinutes: 60,
        delayMinutes: 'invalid'
      })).toThrow('Delay minutes must be a number');
    });
  });

  describe('DelayNotification', () => {
    it('should validate correct delay notification', () => {
      const notification: DelayNotification = {
        customerId: 'customer-123',
        customerEmail: 'customer@example.com',
        route: {
          routeId: 'route-123',
          origin: 'Origin',
          destination: 'Destination',
          baselineTimeMinutes: 45
        },
        delayMinutes: 20,
        message: 'Your delivery is delayed by 20 minutes.'
      };

      expect(() => validateDelayNotification(notification)).not.toThrow();
    });

    it('should reject invalid email addresses', () => {
      const notification = {
        customerId: 'customer-123',
        customerEmail: 'invalid-email',
        route: {},
        delayMinutes: 20,
        message: 'Test message'
      };

      expect(() => validateDelayNotification(notification)).toThrow('Customer email must be a valid email address');
    });
  });

  describe('WorkflowConfig', () => {
    it('should validate correct workflow config', () => {
      const config: WorkflowConfig = {
        delayThresholdMinutes: 30,
        retryAttempts: 3,
        fallbackMessage: 'Your delivery may be delayed due to traffic conditions.'
      };

      expect(() => validateWorkflowConfig(config)).not.toThrow();
    });

    it('should reject invalid config values', () => {
      expect(() => validateWorkflowConfig({ delayThresholdMinutes: -1 })).toThrow('Delay threshold must be a positive number');
      expect(() => validateWorkflowConfig({ 
        delayThresholdMinutes: 30,
        retryAttempts: 1.5 
      })).toThrow('Retry attempts must be a non-negative integer');
    });
  });

  describe('EnvironmentConfig', () => {
    it('should validate correct environment config', () => {
      const config: EnvironmentConfig = {
        googleMapsApiKey: 'test-google-key',
        openaiApiKey: 'test-openai-key',
        sendgridApiKey: 'test-sendgrid-key',
        senderEmail: 'sender@example.com'
      };

      expect(() => validateEnvironmentConfig(config)).not.toThrow();
    });

    it('should reject invalid sender email', () => {
      const config = {
        googleMapsApiKey: 'test-key',
        openaiApiKey: 'test-key',
        sendgridApiKey: 'test-key',
        senderEmail: 'invalid-email'
      };

      expect(() => validateEnvironmentConfig(config)).toThrow('Sender email must be a valid email address');
    });
  });
});