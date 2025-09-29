import { DeliveryRoute } from './delivery-route';
import { TrafficData } from './traffic-data';
import { DelayNotification } from './delay-notification';

/**
 * Interface for traffic monitoring activity that retrieves current traffic data
 */
export interface TrafficMonitoringActivity {
  /**
   * Retrieves current traffic data for a given delivery route
   * @param route - The delivery route to monitor
   * @returns Promise resolving to current traffic data
   * @throws Error if traffic data cannot be retrieved
   */
  getTrafficData(route: DeliveryRoute): Promise<TrafficData>;
}

/**
 * Interface for delay analysis activity that calculates and evaluates delays
 */
export interface DelayAnalysisActivity {
  /**
   * Calculates the delay in minutes based on traffic data and baseline
   * @param trafficData - Current traffic conditions
   * @param baseline - Expected baseline travel time in minutes
   * @returns Promise resolving to delay in minutes
   */
  calculateDelay(trafficData: TrafficData, baseline: number): Promise<number>;

  /**
   * Determines if a delay exceeds the configured threshold
   * @param delay - Calculated delay in minutes
   * @param threshold - Threshold in minutes for triggering notifications
   * @returns true if delay exceeds threshold, false otherwise
   */
  exceedsThreshold(delay: number, threshold: number): boolean;
}

/**
 * Interface for AI message generation activity using OpenAI
 */
export interface MessageGenerationActivity {
  /**
   * Generates a personalized delay notification message using AI
   * @param notification - Delay notification data including customer and route info
   * @returns Promise resolving to generated message string
   * @throws Error if message generation fails (should use fallback)
   */
  generateDelayMessage(notification: DelayNotification): Promise<string>;
}

/**
 * Interface for notification delivery activity using SendGrid
 */
export interface NotificationActivity {
  /**
   * Sends email notification to customer about delivery delay
   * @param notification - Complete notification data including message
   * @returns Promise resolving to true if sent successfully, false otherwise
   * @throws Error if notification cannot be sent after retries
   */
  sendEmailNotification(notification: DelayNotification): Promise<boolean>;
}

/**
 * Combined interface representing all activity implementations
 * Used for dependency injection and testing
 */
export interface ActivityImplementations {
  trafficMonitoring: TrafficMonitoringActivity;
  delayAnalysis: DelayAnalysisActivity;
  messageGeneration: MessageGenerationActivity;
  notification: NotificationActivity;
}