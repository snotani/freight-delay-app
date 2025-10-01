import axios, { AxiosResponse } from 'axios';
import { DeliveryRoute, validateDeliveryRoute } from '../types/delivery-route';
import { TrafficData, GoogleMapsResponse } from '../types/traffic-data';
import { createLogger, createTimer, Logger } from '../utilities/logging';

/**
 * Google Maps traffic monitoring activity implementation
 * Retrieves current traffic data using Google Maps Distance Matrix API
 */
export class TrafficMonitoringActivityImpl {
  private readonly apiKey: string;
  private readonly baseUrl = 'https://maps.googleapis.com/maps/api/distancematrix/json';
  private readonly logger: Logger;

  constructor(apiKey: string) {
    if (!apiKey || typeof apiKey !== 'string' || apiKey.trim().length === 0) {
      throw new Error('Google Maps API key is required and must be a non-empty string');
    }
    this.apiKey = apiKey.trim();
    this.logger = createLogger('TrafficMonitoring');
  }

  /**
   * Retrieves current traffic data for a given delivery route
   * @param route - The delivery route to monitor
   * @returns Promise resolving to current traffic data
   * @throws Error if traffic data cannot be retrieved
   */
  async getTrafficData(route: DeliveryRoute): Promise<TrafficData> {
    const timer = createTimer(this.logger, 'getTrafficData');
    
    try {
      // Validate input route data
      validateDeliveryRoute(route);
      
      this.logger.info('Starting traffic data retrieval', {
        routeId: route.routeId,
        origin: route.origin,
        destination: route.destination,
        baselineTime: route.baselineTimeMinutes
      });

      // Prepare API request parameters
      const params = {
        origins: route.origin,
        destinations: route.destination,
        departure_time: 'now',
        traffic_model: 'best_guess',
        units: 'metric',
        key: this.apiKey
      };

      this.logger.debug('Making Google Maps API request', {
        url: this.baseUrl,
        params: { ...params, key: '[REDACTED]' }
      });

      // Make API request with timeout
      const apiTimer = createTimer(this.logger, 'GoogleMapsAPI');
      const response: AxiosResponse<GoogleMapsResponse> = await axios.get(this.baseUrl, {
        params,
        timeout: 10000, // 10 second timeout
        headers: {
          'User-Agent': 'FreightDelayMonitor/1.0'
        }
      });

      const apiDuration = apiTimer.complete(true, {
        statusCode: response.status,
        responseSize: JSON.stringify(response.data).length
      });

      this.logger.apiCall('GoogleMaps', apiDuration, true, response.status, {
        routeId: route.routeId,
        responseSize: JSON.stringify(response.data).length
      });

      // Validate API response
      if (!response.data || response.data.status !== 'OK') {
        throw new Error(`Google Maps API error: ${response.data?.status || 'Unknown error'}`);
      }

      // Extract traffic data from response
      const trafficData = this.parseGoogleMapsResponse(response.data, route.baselineTimeMinutes);
      
      this.logger.info('Traffic data retrieved and parsed successfully', {
        routeId: route.routeId,
        currentTravelTime: trafficData.currentTravelTimeMinutes,
        delayMinutes: trafficData.delayMinutes,
        trafficConditions: trafficData.trafficConditions,
        retrievedAt: trafficData.retrievedAt
      });

      timer.complete(true, {
        routeId: route.routeId,
        delayMinutes: trafficData.delayMinutes,
        trafficConditions: trafficData.trafficConditions
      });

      return trafficData;

    } catch (error) {
      const duration = timer.complete(false);
      
      this.logger.error('Failed to retrieve traffic data', error as Error, {
        routeId: route.routeId,
        duration,
        errorType: error instanceof Error ? error.constructor.name : 'Unknown'
      });
      
      if (axios.isAxiosError(error)) {
        const statusCode = error.response?.status;
        this.logger.apiCall('GoogleMaps', duration, false, statusCode, {
          routeId: route.routeId,
          errorCode: error.code,
          errorMessage: error.message
        });

        if (error.code === 'ECONNABORTED') {
          throw new Error('Traffic data request timed out - network timeout');
        } else if (statusCode === 401) {
          throw new Error('Google Maps API authentication failed - invalid API key');
        } else if (statusCode === 403) {
          throw new Error('Google Maps API access forbidden - check API key permissions');
        } else if (statusCode && statusCode >= 500) {
          throw new Error('Google Maps API server error - service temporarily unavailable');
        } else if (statusCode === 400) {
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
    this.logger.debug('Parsing Google Maps API response', {
      responseStatus: response.status,
      rowCount: response.rows?.length || 0
    });

    if (!response.rows || response.rows.length === 0) {
      this.logger.error('No route data found in Google Maps response');
      throw new Error('No route data found in Google Maps response');
    }

    const element = response.rows[0]?.elements?.[0];
    if (!element) {
      this.logger.error('No route element found in Google Maps response');
      throw new Error('No route element found in Google Maps response');
    }

    if (element.status !== 'OK') {
      this.logger.error('Route calculation failed', undefined, {
        elementStatus: element.status
      });
      throw new Error(`Route calculation failed: ${element.status}`);
    }

    // Extract duration in traffic (current travel time)
    const durationInTraffic = element.duration_in_traffic;
    if (!durationInTraffic) {
      this.logger.error('No traffic duration data available from Google Maps');
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

    this.logger.debug('Traffic data parsing completed', {
      durationInTrafficSeconds: durationInTraffic.value,
      currentTravelTimeMinutes,
      baselineMinutes,
      delayMinutes,
      trafficConditions
    });

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