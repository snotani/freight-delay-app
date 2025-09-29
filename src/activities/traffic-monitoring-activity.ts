import axios, { AxiosResponse } from 'axios';
import { DeliveryRoute, validateDeliveryRoute } from '../types/delivery-route';
import { TrafficData, GoogleMapsResponse } from '../types/traffic-data';

/**
 * Google Maps traffic monitoring activity implementation
 * Retrieves current traffic data using Google Maps Distance Matrix API
 */
export class TrafficMonitoringActivityImpl {
  private readonly apiKey: string;
  private readonly baseUrl = 'https://maps.googleapis.com/maps/api/distancematrix/json';

  constructor(apiKey: string) {
    if (!apiKey || typeof apiKey !== 'string' || apiKey.trim().length === 0) {
      throw new Error('Google Maps API key is required and must be a non-empty string');
    }
    this.apiKey = apiKey.trim();
  }

  /**
   * Retrieves current traffic data for a given delivery route
   * @param route - The delivery route to monitor
   * @returns Promise resolving to current traffic data
   * @throws Error if traffic data cannot be retrieved
   */
  async getTrafficData(route: DeliveryRoute): Promise<TrafficData> {
    const startTime = Date.now();
    
    try {
      // Validate input route data
      validateDeliveryRoute(route);
      
      console.log(`[TrafficMonitoring] Starting traffic data retrieval for route ${route.routeId}`);
      console.log(`[TrafficMonitoring] Origin: ${route.origin}, Destination: ${route.destination}`);

      // Prepare API request parameters
      const params = {
        origins: route.origin,
        destinations: route.destination,
        departure_time: 'now',
        traffic_model: 'best_guess',
        units: 'metric',
        key: this.apiKey
      };

      // Make API request with timeout
      const response: AxiosResponse<GoogleMapsResponse> = await axios.get(this.baseUrl, {
        params,
        timeout: 10000, // 10 second timeout
        headers: {
          'User-Agent': 'FreightDelayMonitor/1.0'
        }
      });

      const responseTime = Date.now() - startTime;
      console.log(`[TrafficMonitoring] API response received in ${responseTime}ms`);

      // Validate API response
      if (!response.data || response.data.status !== 'OK') {
        throw new Error(`Google Maps API error: ${response.data?.status || 'Unknown error'}`);
      }

      // Extract traffic data from response
      const trafficData = this.parseGoogleMapsResponse(response.data, route.baselineTimeMinutes);
      
      console.log(`[TrafficMonitoring] Traffic data parsed successfully`);
      console.log(`[TrafficMonitoring] Current travel time: ${trafficData.currentTravelTimeMinutes} minutes`);
      console.log(`[TrafficMonitoring] Calculated delay: ${trafficData.delayMinutes} minutes`);
      console.log(`[TrafficMonitoring] Traffic conditions: ${trafficData.trafficConditions}`);

      return trafficData;

    } catch (error) {
      const responseTime = Date.now() - startTime;
      console.error(`[TrafficMonitoring] Error retrieving traffic data after ${responseTime}ms:`, error);
      
      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNABORTED') {
          throw new Error('Traffic data request timed out - network timeout');
        } else if (error.response?.status === 401) {
          throw new Error('Google Maps API authentication failed - invalid API key');
        } else if (error.response?.status === 403) {
          throw new Error('Google Maps API access forbidden - check API key permissions');
        } else if (error.response?.status >= 500) {
          throw new Error('Google Maps API server error - service temporarily unavailable');
        } else if (error.response?.status === 400) {
          throw new Error('Invalid route parameters - check origin and destination addresses');
        }
      }
      
      // Re-throw the error for Temporal to handle retries
      throw error;
    }
  }

  /**
   * Parses Google Maps API response and extracts traffic data
   * @param response - Raw Google Maps API response
   * @param baselineMinutes - Baseline travel time for delay calculation
   * @returns Parsed traffic data
   */
  private parseGoogleMapsResponse(response: GoogleMapsResponse, baselineMinutes: number): TrafficData {
    if (!response.rows || response.rows.length === 0) {
      throw new Error('No route data found in Google Maps response');
    }

    const element = response.rows[0]?.elements?.[0];
    if (!element) {
      throw new Error('No route element found in Google Maps response');
    }

    if (element.status !== 'OK') {
      throw new Error(`Route calculation failed: ${element.status}`);
    }

    // Extract duration in traffic (current travel time)
    const durationInTraffic = element.duration_in_traffic;
    if (!durationInTraffic) {
      throw new Error('No traffic duration data available from Google Maps');
    }

    // Convert seconds to minutes
    const currentTravelTimeMinutes = Math.ceil(durationInTraffic.value / 60);
    
    // Calculate delay compared to baseline
    const delayMinutes = Math.max(0, currentTravelTimeMinutes - baselineMinutes);
    
    // Determine traffic conditions based on delay
    let trafficConditions: string;
    if (delayMinutes === 0) {
      trafficConditions = 'Normal traffic conditions';
    } else if (delayMinutes <= 15) {
      trafficConditions = 'Light traffic delays';
    } else if (delayMinutes <= 30) {
      trafficConditions = 'Moderate traffic delays';
    } else {
      trafficConditions = 'Heavy traffic delays';
    }

    return {
      currentTravelTimeMinutes,
      delayMinutes,
      trafficConditions,
      retrievedAt: new Date()
    };
  }
}

/**
 * Factory function to create traffic monitoring activity instance
 * @param apiKey - Google Maps API key
 * @returns TrafficMonitoringActivityImpl instance
 */
export function createTrafficMonitoringActivity(apiKey: string): TrafficMonitoringActivityImpl {
  return new TrafficMonitoringActivityImpl(apiKey);
}