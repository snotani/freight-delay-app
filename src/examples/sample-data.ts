/**
 * Sample data for testing and demonstration purposes
 * 
 * This file contains example delivery routes, customer information,
 * and workflow configurations that can be used for testing the
 * freight delay monitoring system.
 */

import { DeliveryRoute } from '../types/delivery-route';
import { WorkflowConfig } from '../types/workflow-config';

/**
 * Sample delivery routes covering various geographic areas and distances
 */
export const sampleRoutes: DeliveryRoute[] = [
  {
    routeId: 'SF-SJ-001',
    origin: '1600 Amphitheatre Parkway, Mountain View, CA',
    destination: '1 Hacker Way, Menlo Park, CA',
    baselineTimeMinutes: 45
  },
  {
    routeId: 'OAK-BRK-002',
    origin: 'Oakland, CA',
    destination: 'Berkeley, CA',
    baselineTimeMinutes: 25
  },
  {
    routeId: 'PA-RC-003',
    origin: 'Palo Alto, CA',
    destination: 'Redwood City, CA',
    baselineTimeMinutes: 20
  },
  {
    routeId: 'SF-OAK-004',
    origin: 'San Francisco, CA',
    destination: 'Oakland, CA',
    baselineTimeMinutes: 35
  },
  {
    routeId: 'SJ-SC-005',
    origin: 'San Jose, CA',
    destination: 'Santa Clara, CA',
    baselineTimeMinutes: 15
  },
  {
    routeId: 'LA-LB-006',
    origin: 'Los Angeles, CA',
    destination: 'Long Beach, CA',
    baselineTimeMinutes: 40
  },
  {
    routeId: 'SD-CV-007',
    origin: 'San Diego, CA',
    destination: 'Chula Vista, CA',
    baselineTimeMinutes: 30
  },
  {
    routeId: 'NYC-BRK-008',
    origin: 'Manhattan, New York, NY',
    destination: 'Brooklyn, New York, NY',
    baselineTimeMinutes: 50
  },
  {
    routeId: 'CHI-EVN-009',
    origin: 'Chicago, IL',
    destination: 'Evanston, IL',
    baselineTimeMinutes: 45
  },
  {
    routeId: 'SEA-BEL-010',
    origin: 'Seattle, WA',
    destination: 'Bellevue, WA',
    baselineTimeMinutes: 35
  }
];

/**
 * Sample customer information for testing notifications
 */
export const sampleCustomers = [
  {
    customerId: 'CUST-001',
    customerEmail: 'john.doe@example.com',
    customerName: 'John Doe',
    company: 'Tech Solutions Inc.'
  },
  {
    customerId: 'CUST-002',
    customerEmail: 'jane.smith@example.com',
    customerName: 'Jane Smith',
    company: 'Global Logistics LLC'
  },
  {
    customerId: 'CUST-003',
    customerEmail: 'bob.wilson@example.com',
    customerName: 'Bob Wilson',
    company: 'Manufacturing Corp'
  },
  {
    customerId: 'CUST-004',
    customerEmail: 'alice.johnson@example.com',
    customerName: 'Alice Johnson',
    company: 'Retail Enterprises'
  },
  {
    customerId: 'CUST-005',
    customerEmail: 'charlie.brown@example.com',
    customerName: 'Charlie Brown',
    company: 'Distribution Partners'
  },
  {
    customerId: 'CUST-006',
    customerEmail: 'diana.prince@example.com',
    customerName: 'Diana Prince',
    company: 'Supply Chain Solutions'
  },
  {
    customerId: 'CUST-007',
    customerEmail: 'edward.norton@example.com',
    customerName: 'Edward Norton',
    company: 'Freight Forwarders Inc.'
  },
  {
    customerId: 'CUST-008',
    customerEmail: 'fiona.green@example.com',
    customerName: 'Fiona Green',
    company: 'Express Delivery Co.'
  },
  {
    customerId: 'CUST-009',
    customerEmail: 'george.miller@example.com',
    customerName: 'George Miller',
    company: 'Warehouse Operations Ltd.'
  },
  {
    customerId: 'CUST-010',
    customerEmail: 'helen.clark@example.com',
    customerName: 'Helen Clark',
    company: 'Transportation Services'
  }
];

/**
 * Sample workflow configurations for different scenarios
 */
export const sampleConfigs: Record<string, WorkflowConfig> = {
  /**
   * Standard configuration with 30-minute delay threshold
   */
  standard: {
    delayThresholdMinutes: 30,
    retryAttempts: 3,
    fallbackMessage: 'We apologize, but your delivery to {destination} from {origin} is experiencing a delay of approximately {delayMinutes} minutes due to traffic conditions. We will keep you updated on any changes.'
  },

  /**
   * Sensitive configuration with lower delay threshold for priority deliveries
   */
  priority: {
    delayThresholdMinutes: 15,
    retryAttempts: 5,
    fallbackMessage: 'PRIORITY DELIVERY ALERT: Your time-sensitive delivery is experiencing a {delayMinutes}-minute delay due to traffic conditions. Our team is actively monitoring the situation and will provide updates as needed.'
  },

  /**
   * Relaxed configuration with higher delay threshold for standard deliveries
   */
  relaxed: {
    delayThresholdMinutes: 60,
    retryAttempts: 2,
    fallbackMessage: 'Your delivery is running approximately {delayMinutes} minutes behind schedule due to traffic conditions. We appreciate your patience and will notify you of any significant changes.'
  },

  /**
   * Express configuration for same-day deliveries
   */
  express: {
    delayThresholdMinutes: 10,
    retryAttempts: 4,
    fallbackMessage: 'EXPRESS DELIVERY UPDATE: Your same-day delivery is experiencing a {delayMinutes}-minute delay. We are working to minimize any further delays and ensure prompt delivery.'
  },

  /**
   * Bulk configuration for non-urgent deliveries
   */
  bulk: {
    delayThresholdMinutes: 90,
    retryAttempts: 2,
    fallbackMessage: 'Your scheduled delivery is experiencing a delay of {delayMinutes} minutes. This is within normal parameters for bulk deliveries, and we will keep you informed of any significant changes.'
  }
};

/**
 * Utility function to get a random route from the sample data
 * @returns Random DeliveryRoute from sampleRoutes
 */
export function getRandomRoute(): DeliveryRoute {
  const randomIndex = Math.floor(Math.random() * sampleRoutes.length);
  return sampleRoutes[randomIndex];
}

/**
 * Utility function to get a random customer from the sample data
 * @returns Random customer object from sampleCustomers
 */
export function getRandomCustomer() {
  const randomIndex = Math.floor(Math.random() * sampleCustomers.length);
  return sampleCustomers[randomIndex];
}

/**
 * Utility function to get a route by ID
 * @param routeId - The route ID to find
 * @returns DeliveryRoute if found, undefined otherwise
 */
export function getRouteById(routeId: string): DeliveryRoute | undefined {
  return sampleRoutes.find(route => route.routeId === routeId);
}

/**
 * Utility function to get a customer by ID
 * @param customerId - The customer ID to find
 * @returns Customer object if found, undefined otherwise
 */
export function getCustomerById(customerId: string) {
  return sampleCustomers.find(customer => customer.customerId === customerId);
}

/**
 * Utility function to get routes by geographic area
 * @param area - Geographic area identifier (e.g., 'CA', 'NY', 'WA')
 * @returns Array of routes in the specified area
 */
export function getRoutesByArea(area: string): DeliveryRoute[] {
  return sampleRoutes.filter(route => 
    route.origin.includes(area) || route.destination.includes(area)
  );
}

/**
 * Utility function to get routes by baseline time range
 * @param minMinutes - Minimum baseline time in minutes
 * @param maxMinutes - Maximum baseline time in minutes
 * @returns Array of routes within the specified time range
 */
export function getRoutesByTimeRange(minMinutes: number, maxMinutes: number): DeliveryRoute[] {
  return sampleRoutes.filter(route => 
    route.baselineTimeMinutes >= minMinutes && route.baselineTimeMinutes <= maxMinutes
  );
}

/**
 * Utility function to create a test scenario with route, customer, and config
 * @param routeId - Optional specific route ID
 * @param customerId - Optional specific customer ID
 * @param configType - Optional configuration type
 * @returns Complete test scenario object
 */
export function createTestScenario(
  routeId?: string,
  customerId?: string,
  configType: keyof typeof sampleConfigs = 'standard'
) {
  const route = routeId ? getRouteById(routeId) : getRandomRoute();
  const customer = customerId ? getCustomerById(customerId) : getRandomCustomer();
  const config = sampleConfigs[configType];

  if (!route) {
    throw new Error(`Route not found: ${routeId}`);
  }

  if (!customer) {
    throw new Error(`Customer not found: ${customerId}`);
  }

  return {
    route,
    customer: {
      customerId: customer.customerId,
      customerEmail: customer.customerEmail
    },
    config,
    metadata: {
      customerName: customer.customerName,
      company: customer.company,
      configType,
      scenarioId: `${route.routeId}-${customer.customerId}-${configType}-${Date.now()}`
    }
  };
}

/**
 * Pre-defined test scenarios for common use cases
 */
export const testScenarios = {
  /**
   * Short route with standard configuration
   */
  shortRouteStandard: createTestScenario('SJ-SC-005', 'CUST-001', 'standard'),

  /**
   * Long route with priority configuration
   */
  longRoutePriority: createTestScenario('NYC-BRK-008', 'CUST-002', 'priority'),

  /**
   * Medium route with relaxed configuration
   */
  mediumRouteRelaxed: createTestScenario('SF-OAK-004', 'CUST-003', 'relaxed'),

  /**
   * Express delivery scenario
   */
  expressDelivery: createTestScenario('PA-RC-003', 'CUST-004', 'express'),

  /**
   * Bulk delivery scenario
   */
  bulkDelivery: createTestScenario('LA-LB-006', 'CUST-005', 'bulk')
};

/**
 * Export all sample data for easy access
 */
export default {
  routes: sampleRoutes,
  customers: sampleCustomers,
  configs: sampleConfigs,
  scenarios: testScenarios,
  utils: {
    getRandomRoute,
    getRandomCustomer,
    getRouteById,
    getCustomerById,
    getRoutesByArea,
    getRoutesByTimeRange,
    createTestScenario
  }
};