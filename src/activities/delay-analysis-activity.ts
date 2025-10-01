import { TrafficData, validateTrafficData } from '../types/traffic-data';
import { DelayAnalysisActivity } from '../types/activity-interfaces';

/**
 * Delay analysis activity implementation
 * Calculates delays and determines if they exceed configured thresholds
 */
export class DelayAnalysisActivityImpl implements DelayAnalysisActivity {
  
  /**
   * Calculates the delay in minutes based on traffic data and baseline
   * @param trafficData - Current traffic conditions
   * @param baseline - Expected baseline travel time in minutes
   * @returns Promise resolving to delay in minutes
   */
  async calculateDelay(trafficData: TrafficData, baseline: number): Promise<number> {
    const startTime = Date.now();
    
    try {
      // Validate input parameters
      validateTrafficData(trafficData);
      
      if (typeof baseline !== 'number' || baseline <= 0) {
        throw new Error('Baseline travel time must be a positive number');
      }

      console.log(`[DelayAnalysis] Starting delay calculation`);
      console.log(`[DelayAnalysis] Current travel time: ${trafficData.currentTravelTimeMinutes} minutes`);
      console.log(`[DelayAnalysis] Baseline travel time: ${baseline} minutes`);

      // Calculate delay by comparing current travel time against baseline
      const calculatedDelay = Math.max(0, trafficData.currentTravelTimeMinutes - baseline);
      
      const processingTime = Date.now() - startTime;
      console.log(`[DelayAnalysis] Delay calculation completed in ${processingTime}ms`);
      console.log(`[DelayAnalysis] Calculated delay: ${calculatedDelay} minutes`);
      
      // Verify calculation matches traffic data delay (should be consistent)
      if (Math.abs(calculatedDelay - trafficData.delayMinutes) > 1) {
        console.warn(`[DelayAnalysis] Delay mismatch detected - calculated: ${calculatedDelay}, traffic data: ${trafficData.delayMinutes}`);
      }

      // Log delay severity classification
      this.logDelaySeverity(calculatedDelay);

      return calculatedDelay;

    } catch (error) {
      const processingTime = Date.now() - startTime;
      console.error(`[DelayAnalysis] Error calculating delay after ${processingTime}ms:`, error);
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
    try {
      // Validate input parameters
      if (typeof delay !== 'number' || delay < 0 || isNaN(delay)) {
        throw new Error('Delay must be a non-negative number');
      }
      
      if (typeof threshold !== 'number' || threshold <= 0 || isNaN(threshold)) {
        throw new Error('Threshold must be a positive number');
      }

      console.log(`[DelayAnalysis] Checking threshold compliance`);
      console.log(`[DelayAnalysis] Delay: ${delay} minutes, Threshold: ${threshold} minutes`);

      const exceedsThreshold = delay > threshold;
      
      if (exceedsThreshold) {
        console.log(`[DelayAnalysis] ⚠️  Delay EXCEEDS threshold by ${delay - threshold} minutes - notification required`);
      } else {
        console.log(`[DelayAnalysis] ✅ Delay is within acceptable limits - no notification needed`);
      }

      // Log threshold comparison details
      const thresholdPercentage = threshold > 0 ? Math.round((delay / threshold) * 100) : 0;
      console.log(`[DelayAnalysis] Delay is ${thresholdPercentage}% of threshold`);

      return exceedsThreshold;

    } catch (error) {
      console.error(`[DelayAnalysis] Error checking threshold:`, error);
      throw error;
    }
  }

  /**
   * Logs delay severity classification for monitoring purposes
   * @param delayMinutes - The calculated delay in minutes
   */
  private logDelaySeverity(delayMinutes: number): void {
    let severity: string;
    let impact: string;

    if (delayMinutes === 0) {
      severity = 'NONE';
      impact = 'On-time delivery expected';
    } else if (delayMinutes <= 10) {
      severity = 'MINIMAL';
      impact = 'Minor delay, minimal customer impact';
    } else if (delayMinutes < 20) {
      severity = 'LOW';
      impact = 'Low delay, customer awareness recommended';
    } else if (delayMinutes <= 30) {
      severity = 'MODERATE';
      impact = 'Moderate delay, customer notification likely needed';
    } else if (delayMinutes <= 60) {
      severity = 'HIGH';
      impact = 'Significant delay, customer notification required';
    } else {
      severity = 'CRITICAL';
      impact = 'Critical delay, immediate customer notification and escalation needed';
    }

    console.log(`[DelayAnalysis] Delay severity: ${severity} (${delayMinutes} minutes)`);
    console.log(`[DelayAnalysis] Impact assessment: ${impact}`);
  }
}

/**
 * Factory function to create delay analysis activity instance
 * @returns DelayAnalysisActivityImpl instance
 */
export function createDelayAnalysisActivity(): DelayAnalysisActivityImpl {
  return new DelayAnalysisActivityImpl();
}