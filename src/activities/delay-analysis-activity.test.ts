import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DelayAnalysisActivityImpl, createDelayAnalysisActivity } from './delay-analysis-activity';
import { TrafficData } from '../types/traffic-data';

describe('DelayAnalysisActivity', () => {
  let delayAnalysis: DelayAnalysisActivityImpl;
  let consoleSpy: any;

  beforeEach(() => {
    delayAnalysis = createDelayAnalysisActivity();
    // Spy on console methods to verify logging
    consoleSpy = {
      log: vi.spyOn(console, 'log').mockImplementation(() => {}),
      warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
      error: vi.spyOn(console, 'error').mockImplementation(() => {})
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('calculateDelay', () => {
    it('should calculate delay correctly when current time exceeds baseline', async () => {
      const trafficData: TrafficData = {
        currentTravelTimeMinutes: 45,
        delayMinutes: 15,
        trafficConditions: 'Moderate traffic delays',
        retrievedAt: new Date()
      };
      const baseline = 30;

      const result = await delayAnalysis.calculateDelay(trafficData, baseline);

      expect(result).toBe(15);
      expect(consoleSpy.log).toHaveBeenCalledWith('[DelayAnalysis] Starting delay calculation');
      expect(consoleSpy.log).toHaveBeenCalledWith('[DelayAnalysis] Current travel time: 45 minutes');
      expect(consoleSpy.log).toHaveBeenCalledWith('[DelayAnalysis] Baseline travel time: 30 minutes');
      expect(consoleSpy.log).toHaveBeenCalledWith('[DelayAnalysis] Calculated delay: 15 minutes');
    });

    it('should return zero delay when current time is less than baseline', async () => {
      const trafficData: TrafficData = {
        currentTravelTimeMinutes: 25,
        delayMinutes: 0,
        trafficConditions: 'Normal traffic conditions',
        retrievedAt: new Date()
      };
      const baseline = 30;

      const result = await delayAnalysis.calculateDelay(trafficData, baseline);

      expect(result).toBe(0);
      expect(consoleSpy.log).toHaveBeenCalledWith('[DelayAnalysis] Calculated delay: 0 minutes');
    });

    it('should return zero delay when current time equals baseline', async () => {
      const trafficData: TrafficData = {
        currentTravelTimeMinutes: 30,
        delayMinutes: 0,
        trafficConditions: 'Normal traffic conditions',
        retrievedAt: new Date()
      };
      const baseline = 30;

      const result = await delayAnalysis.calculateDelay(trafficData, baseline);

      expect(result).toBe(0);
    });

    it('should log delay severity classifications correctly', async () => {
      const testCases = [
        { delay: 0, severity: 'NONE' },
        { delay: 5, severity: 'MINIMAL' },
        { delay: 15, severity: 'LOW' },
        { delay: 25, severity: 'MODERATE' },
        { delay: 45, severity: 'HIGH' },
        { delay: 90, severity: 'CRITICAL' }
      ];

      for (const testCase of testCases) {
        const trafficData: TrafficData = {
          currentTravelTimeMinutes: 30 + testCase.delay,
          delayMinutes: testCase.delay,
          trafficConditions: 'Test conditions',
          retrievedAt: new Date()
        };

        await delayAnalysis.calculateDelay(trafficData, 30);
        
        expect(consoleSpy.log).toHaveBeenCalledWith(
          expect.stringContaining(`Delay severity: ${testCase.severity}`)
        );
      }
    });

    it('should warn when calculated delay differs from traffic data delay', async () => {
      const trafficData: TrafficData = {
        currentTravelTimeMinutes: 45,
        delayMinutes: 10, // Inconsistent with calculated delay (should be 15)
        trafficConditions: 'Moderate traffic delays',
        retrievedAt: new Date()
      };
      const baseline = 30;

      await delayAnalysis.calculateDelay(trafficData, baseline);

      expect(consoleSpy.warn).toHaveBeenCalledWith(
        expect.stringContaining('Delay mismatch detected')
      );
    });

    it('should throw error for invalid traffic data', async () => {
      const invalidTrafficData = {
        currentTravelTimeMinutes: -5, // Invalid negative value
        delayMinutes: 0,
        trafficConditions: 'Test',
        retrievedAt: new Date()
      };

      await expect(delayAnalysis.calculateDelay(invalidTrafficData as TrafficData, 30))
        .rejects.toThrow('Current travel time must be a non-negative number');
    });

    it('should throw error for invalid baseline', async () => {
      const trafficData: TrafficData = {
        currentTravelTimeMinutes: 30,
        delayMinutes: 0,
        trafficConditions: 'Normal traffic conditions',
        retrievedAt: new Date()
      };

      await expect(delayAnalysis.calculateDelay(trafficData, 0))
        .rejects.toThrow('Baseline travel time must be a positive number');

      await expect(delayAnalysis.calculateDelay(trafficData, -10))
        .rejects.toThrow('Baseline travel time must be a positive number');
    });

    it('should log processing time', async () => {
      const trafficData: TrafficData = {
        currentTravelTimeMinutes: 35,
        delayMinutes: 5,
        trafficConditions: 'Light traffic delays',
        retrievedAt: new Date()
      };

      await delayAnalysis.calculateDelay(trafficData, 30);

      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringMatching(/Delay calculation completed in \d+ms/)
      );
    });
  });

  describe('exceedsThreshold', () => {
    it('should return true when delay exceeds threshold', () => {
      const result = delayAnalysis.exceedsThreshold(35, 30);

      expect(result).toBe(true);
      expect(consoleSpy.log).toHaveBeenCalledWith('[DelayAnalysis] Checking threshold compliance');
      expect(consoleSpy.log).toHaveBeenCalledWith('[DelayAnalysis] Delay: 35 minutes, Threshold: 30 minutes');
      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining('Delay EXCEEDS threshold by 5 minutes')
      );
    });

    it('should return false when delay equals threshold', () => {
      const result = delayAnalysis.exceedsThreshold(30, 30);

      expect(result).toBe(false);
      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining('Delay is within acceptable limits')
      );
    });

    it('should return false when delay is less than threshold', () => {
      const result = delayAnalysis.exceedsThreshold(25, 30);

      expect(result).toBe(false);
      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining('Delay is within acceptable limits')
      );
    });

    it('should return false when delay is zero', () => {
      const result = delayAnalysis.exceedsThreshold(0, 30);

      expect(result).toBe(false);
    });

    it('should log threshold percentage correctly', () => {
      delayAnalysis.exceedsThreshold(45, 30);
      expect(consoleSpy.log).toHaveBeenCalledWith('[DelayAnalysis] Delay is 150% of threshold');

      delayAnalysis.exceedsThreshold(15, 30);
      expect(consoleSpy.log).toHaveBeenCalledWith('[DelayAnalysis] Delay is 50% of threshold');

      delayAnalysis.exceedsThreshold(30, 30);
      expect(consoleSpy.log).toHaveBeenCalledWith('[DelayAnalysis] Delay is 100% of threshold');
    });

    it('should throw error for negative delay', () => {
      expect(() => delayAnalysis.exceedsThreshold(-5, 30))
        .toThrow('Delay must be a non-negative number');
    });

    it('should throw error for invalid threshold', () => {
      expect(() => delayAnalysis.exceedsThreshold(25, 0))
        .toThrow('Threshold must be a positive number');

      expect(() => delayAnalysis.exceedsThreshold(25, -10))
        .toThrow('Threshold must be a positive number');
    });

    it('should handle edge case with very large delays', () => {
      const result = delayAnalysis.exceedsThreshold(1000, 30);

      expect(result).toBe(true);
      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining('Delay EXCEEDS threshold by 970 minutes')
      );
    });

    it('should log error and rethrow when validation fails', () => {
      expect(() => delayAnalysis.exceedsThreshold(NaN, 30))
        .toThrow();

      expect(consoleSpy.error).toHaveBeenCalledWith(
        '[DelayAnalysis] Error checking threshold:',
        expect.any(Error)
      );
    });
  });

  describe('createDelayAnalysisActivity', () => {
    it('should create a new instance of DelayAnalysisActivityImpl', () => {
      const instance = createDelayAnalysisActivity();
      expect(instance).toBeInstanceOf(DelayAnalysisActivityImpl);
    });

    it('should create independent instances', () => {
      const instance1 = createDelayAnalysisActivity();
      const instance2 = createDelayAnalysisActivity();
      expect(instance1).not.toBe(instance2);
    });
  });

  describe('integration scenarios', () => {
    it('should handle complete delay analysis workflow', async () => {
      const trafficData: TrafficData = {
        currentTravelTimeMinutes: 50,
        delayMinutes: 20,
        trafficConditions: 'Moderate traffic delays',
        retrievedAt: new Date()
      };
      const baseline = 30;
      const threshold = 15;

      // Calculate delay
      const delay = await delayAnalysis.calculateDelay(trafficData, baseline);
      expect(delay).toBe(20);

      // Check threshold
      const exceedsThreshold = delayAnalysis.exceedsThreshold(delay, threshold);
      expect(exceedsThreshold).toBe(true);

      // Verify comprehensive logging occurred
      expect(consoleSpy.log).toHaveBeenCalledWith('[DelayAnalysis] Starting delay calculation');
      expect(consoleSpy.log).toHaveBeenCalledWith('[DelayAnalysis] Checking threshold compliance');
      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining('Delay severity: MODERATE')
      );
    });

    it('should handle no-delay scenario correctly', async () => {
      const trafficData: TrafficData = {
        currentTravelTimeMinutes: 25,
        delayMinutes: 0,
        trafficConditions: 'Normal traffic conditions',
        retrievedAt: new Date()
      };
      const baseline = 30;
      const threshold = 15;

      const delay = await delayAnalysis.calculateDelay(trafficData, baseline);
      expect(delay).toBe(0);

      const exceedsThreshold = delayAnalysis.exceedsThreshold(delay, threshold);
      expect(exceedsThreshold).toBe(false);

      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining('Delay severity: NONE')
      );
    });
  });
});