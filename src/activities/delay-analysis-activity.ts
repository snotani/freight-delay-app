import { TrafficData, validateTrafficData } from '../types/traffic-data';
import { DelayAnalysisActivity } from '../types/activity-interfaces';
import { createLogger, createTimer, Logger } from '../utilities/logging';

/**
 * Delay analysis activity implementation
 * Calculates delays and determines if they exceed configured thresholds
 */
export class DelayAnalysisActivityImpl implements DelayAnalysisActivity {
  private readonly logger: Logger;

  constructor() {
    this.logger = createLogger('DelayAnalysis');
  }
  
  /**
   * Calculates the delay in minutes based on traffic data and baseline
   * @param trafficData - Current traffic conditions
   * @param baseline - Expected baseline travel time in minutes
   * @returns Promise resolving to delay in minutes
   */
  async calculateDelay(trafficData: TrafficData, baseline: number): Promise<number> {
    const timer = createTimer(this.logger, 'calculateDelay');
    
    try {
      // Validate input parameters
      validateTrafficData(trafficData);
      
      if (typeof baseline !== 'number' || baseline <= 0) {
        throw new Error('Baseline travel time must be a positive number');
      }

      this.logger.info('Starting delay calculation', {
        currentTravelTime: trafficData.currentTravelTimeMinutes,
        baselineTime: baseline,
        trafficConditions: trafficData.trafficConditions
      });

      // Calculate delay by comparing current travel time against baseline
      const calculatedDelay = Math.max(0, trafficData.currentTravelTimeMinutes - baseline);
      
      // Verify calculation matches traffic data delay (should be consistent)
      if (Math.abs(calculatedDelay - trafficData.delayMinutes) > 1) {
        this.logger.warn('Delay calculation mismatch detected', {
          calculatedDelay,
          trafficDataDelay: trafficData.delayMinutes,
          difference: Math.abs(calculatedDelay - trafficData.delayMinutes)
        });
      }

      // Log delay analysis results
      this.logger.delayAnalysis(calculatedDelay, 0, false, {
        currentTravelTime: trafficData.currentTravelTimeMinutes,
        baselineTime: baseline,
        trafficConditions: trafficData.trafficConditions
      });

      timer.complete(true, {
        calculatedDelay,
        currentTravelTime: trafficData.currentTravelTimeMinutes,
        baselineTime: baseline
      });

      return calculatedDelay;

    } catch (error) {
      timer.complete(false);
      this.logger.error('Failed to calculate delay', error as Error, {
        currentTravelTime: trafficData?.currentTravelTimeMinutes,
        baselineTime: baseline
      });
      throw error;
    }
  }

  /**
   * Determines if a delay exceeds the configured threshold
   * @param delay - Calculated delay in minutes
   * @param threshold - Threshold in minutes for triggering notifications
   * @returns true if delay exceeds threshold, false otherwise
   */
  exceedsThreshold(delay: number, threshold: number): boolean {
    const timer = createTimer(this.logger, 'exceedsThreshold');
    
    try {
      // Validate input parameters
      if (typeof delay !== 'number' || delay < 0 || isNaN(delay)) {
        throw new Error('Delay must be a non-negative number');
      }
      
      if (typeof threshold !== 'number' || threshold <= 0 || isNaN(threshold)) {
        throw new Error('Threshold must be a positive number');
      }

      const exceedsThreshold = delay > threshold;
      const thresholdPercentage = threshold > 0 ? Math.round((delay / threshold) * 100) : 0;
      const excessMinutes = exceedsThreshold ? delay - threshold : 0;

      // Use the specialized delay analysis logging
      this.logger.delayAnalysis(delay, threshold, exceedsThreshold, {
        excessMinutes,
        thresholdPercentage
      });

      timer.complete(true, {
        delay,
        threshold,
        exceedsThreshold,
        thresholdPercentage,
        excessMinutes
      });

      return exceedsThreshold;

    } catch (error) {
      timer.complete(false);
      this.logger.error('Failed to check threshold', error as Error, {
        delay,
        threshold
      });
      throw error;
    }
  }


}

/**
 * Factory function to create delay analysis activity instance
 * @returns DelayAnalysisActivityImpl instance
 */
export function createDelayAnalysisActivity(): DelayAnalysisActivityImpl {
  return new DelayAnalysisActivityImpl();
}