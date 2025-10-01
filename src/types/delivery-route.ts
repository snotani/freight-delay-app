/**
 * Represents a delivery route with origin, destination, and baseline timing information
 */
export interface DeliveryRoute {
  /** Unique identifier for the route */
  routeId: string;
  /** Starting location (address or coordinates) */
  origin: string;
  /** Destination location (address or coordinates) */
  destination: string;
  /** Expected travel time under normal conditions in minutes */
  baselineTimeMinutes: number;
}

/**
 * Input validation function for DeliveryRoute data
 * @param route - The route data to validate
 * @returns true if valid, throws error if invalid
 */
export function validateDeliveryRoute(route: unknown): route is DeliveryRoute {
  if (!route || typeof route !== 'object') {
    throw new Error('Route must be an object');
  }
  
  const routeObj = route as Record<string, unknown>;
  
  if (!routeObj.routeId || typeof routeObj.routeId !== 'string' || routeObj.routeId.trim().length === 0) {
    throw new Error('Route ID must be a non-empty string');
  }
  
  if (!routeObj.origin || typeof routeObj.origin !== 'string' || routeObj.origin.trim().length === 0) {
    throw new Error('Origin must be a non-empty string');
  }
  
  if (!routeObj.destination || typeof routeObj.destination !== 'string' || routeObj.destination.trim().length === 0) {
    throw new Error('Destination must be a non-empty string');
  }
  
  if (typeof routeObj.baselineTimeMinutes !== 'number' || routeObj.baselineTimeMinutes <= 0) {
    throw new Error('Baseline time must be a positive number');
  }
  
  return true;
}