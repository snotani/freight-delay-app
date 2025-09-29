/**
 * Represents current traffic conditions and timing data for a route
 */
export interface TrafficData {
  /** Current estimated travel time in minutes */
  currentTravelTimeMinutes: number;
  /** Calculated delay in minutes compared to baseline */
  delayMinutes: number;
  /** Description of current traffic conditions */
  trafficConditions: string;
  /** Timestamp when the traffic data was retrieved */
  retrievedAt: Date;
}

/**
 * Google Maps Distance Matrix API response structure
 */
export interface GoogleMapsResponse {
  destination_addresses: string[];
  origin_addresses: string[];
  rows: Array<{
    elements: Array<{
      distance?: {
        text: string;
        value: number;
      };
      duration?: {
        text: string;
        value: number;
      };
      duration_in_traffic?: {
        text: string;
        value: number;
      };
      status: string;
    }>;
  }>;
  status: string;
}

/**
 * Input validation function for TrafficData
 * @param data - The traffic data to validate
 * @returns true if valid, throws error if invalid
 */
export function validateTrafficData(data: any): data is TrafficData {
  if (!data || typeof data !== 'object') {
    throw new Error('Traffic data must be an object');
  }
  
  if (typeof data.currentTravelTimeMinutes !== 'number' || data.currentTravelTimeMinutes < 0) {
    throw new Error('Current travel time must be a non-negative number');
  }
  
  if (typeof data.delayMinutes !== 'number') {
    throw new Error('Delay minutes must be a number');
  }
  
  if (!data.trafficConditions || typeof data.trafficConditions !== 'string') {
    throw new Error('Traffic conditions must be a non-empty string');
  }
  
  if (!(data.retrievedAt instanceof Date) && !Date.parse(data.retrievedAt)) {
    throw new Error('Retrieved at must be a valid date');
  }
  
  return true;
}