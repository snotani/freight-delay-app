import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import axios from 'axios';
import { TrafficMonitoringActivityImpl, createTrafficMonitoringActivity } from './traffic-monitoring-activity';
import { DeliveryRoute } from '../types/delivery-route';
import { GoogleMapsResponse } from '../types/traffic-data';

// Mock axios
vi.mock('axios');

// Create typed mock functions
const mockGet = vi.fn();
const mockIsAxiosError = vi.fn();

// Override axios methods with our mocks
(axios.get as any) = mockGet;
(axios.isAxiosError as any) = mockIsAxiosError;

const mockedAxios = {
  get: mockGet,
  isAxiosError: mockIsAxiosError
};

describe('TrafficMonitoringActivity', () => {
  const validApiKey = 'test-api-key';
  const validRoute: DeliveryRoute = {
    routeId: 'route-123',
    origin: '123 Main St, City, State',
    destination: '456 Oak Ave, City, State',
    baselineTimeMinutes: 30
  };

  let activity: TrafficMonitoringActivityImpl;

  beforeEach(() => {
    activity = new TrafficMonitoringActivityImpl(validApiKey);
    vi.clearAllMocks();
    
    // Mock console methods to avoid test output noise
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Constructor', () => {
    it('should create instance with valid API key', () => {
      expect(() => new TrafficMonitoringActivityImpl(validApiKey)).not.toThrow();
    });

    it('should throw error with empty API key', () => {
      expect(() => new TrafficMonitoringActivityImpl('')).toThrow('Google Maps API key is required');
    });

    it('should throw error with null API key', () => {
      expect(() => new TrafficMonitoringActivityImpl(null as unknown as string)).toThrow('Google Maps API key is required');
    });

    it('should throw error with whitespace-only API key', () => {
      expect(() => new TrafficMonitoringActivityImpl('   ')).toThrow('Google Maps API key is required');
    });
  });

  describe('getTrafficData', () => {
    const mockSuccessResponse: GoogleMapsResponse = {
      destination_addresses: ['456 Oak Ave, City, State'],
      origin_addresses: ['123 Main St, City, State'],
      rows: [{
        elements: [{
          distance: { text: '10.5 km', value: 10500 },
          duration: { text: '25 mins', value: 1500 },
          duration_in_traffic: { text: '35 mins', value: 2100 },
          status: 'OK'
        }]
      }],
      status: 'OK'
    };

    it('should successfully retrieve and parse traffic data', async () => {
      mockedAxios.get.mockResolvedValue({ data: mockSuccessResponse });

      const result = await activity.getTrafficData(validRoute);

      expect(result).toEqual({
        currentTravelTimeMinutes: 35, // 2100 seconds / 60 = 35 minutes
        delayMinutes: 5, // 35 - 30 baseline = 5 minutes delay
        trafficConditions: 'Light traffic delays',
        retrievedAt: expect.any(Date)
      });

      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://maps.googleapis.com/maps/api/distancematrix/json',
        {
          params: {
            origins: validRoute.origin,
            destinations: validRoute.destination,
            departure_time: 'now',
            traffic_model: 'best_guess',
            units: 'metric',
            key: validApiKey
          },
          timeout: 10000,
          headers: {
            'User-Agent': 'FreightDelayMonitor/1.0'
          }
        }
      );
    });

    it('should handle no delay scenario', async () => {
      const noDelayResponse = {
        ...mockSuccessResponse,
        rows: [{
          elements: [{
            ...mockSuccessResponse.rows[0].elements[0],
            duration_in_traffic: { text: '30 mins', value: 1800 } // Exactly baseline time
          }]
        }]
      };

      mockedAxios.get.mockResolvedValue({ data: noDelayResponse });

      const result = await activity.getTrafficData(validRoute);

      expect(result.delayMinutes).toBe(0);
      expect(result.trafficConditions).toBe('Normal traffic conditions');
    });

    it('should handle moderate delay scenario', async () => {
      const moderateDelayResponse = {
        ...mockSuccessResponse,
        rows: [{
          elements: [{
            ...mockSuccessResponse.rows[0].elements[0],
            duration_in_traffic: { text: '50 mins', value: 3000 } // 20 minutes delay
          }]
        }]
      };

      mockedAxios.get.mockResolvedValue({ data: moderateDelayResponse });

      const result = await activity.getTrafficData(validRoute);

      expect(result.delayMinutes).toBe(20);
      expect(result.trafficConditions).toBe('Moderate traffic delays');
    });

    it('should handle heavy delay scenario', async () => {
      const heavyDelayResponse = {
        ...mockSuccessResponse,
        rows: [{
          elements: [{
            ...mockSuccessResponse.rows[0].elements[0],
            duration_in_traffic: { text: '75 mins', value: 4500 } // 45 minutes delay
          }]
        }]
      };

      mockedAxios.get.mockResolvedValue({ data: heavyDelayResponse });

      const result = await activity.getTrafficData(validRoute);

      expect(result.delayMinutes).toBe(45);
      expect(result.trafficConditions).toBe('Heavy traffic delays');
    });

    it('should throw error for invalid route data', async () => {
      const invalidRoute = { ...validRoute, origin: '' };

      await expect(activity.getTrafficData(invalidRoute)).rejects.toThrow('Origin must be a non-empty string');
    });

    it('should handle API authentication error (401)', async () => {
      mockedAxios.get.mockRejectedValue({
        isAxiosError: true,
        response: { status: 401 }
      });
      mockedAxios.isAxiosError.mockReturnValue(true);

      await expect(activity.getTrafficData(validRoute)).rejects.toThrow('Google Maps API authentication failed');
    });

    it('should handle API permission error (403)', async () => {
      mockedAxios.get.mockRejectedValue({
        isAxiosError: true,
        response: { status: 403 }
      });
      mockedAxios.isAxiosError.mockReturnValue(true);

      await expect(activity.getTrafficData(validRoute)).rejects.toThrow('Google Maps API access forbidden');
    });

    it('should handle API server error (500)', async () => {
      mockedAxios.get.mockRejectedValue({
        isAxiosError: true,
        response: { status: 500 }
      });
      mockedAxios.isAxiosError.mockReturnValue(true);

      await expect(activity.getTrafficData(validRoute)).rejects.toThrow('Google Maps API server error');
    });

    it('should handle bad request error (400)', async () => {
      mockedAxios.get.mockRejectedValue({
        isAxiosError: true,
        response: { status: 400 }
      });
      mockedAxios.isAxiosError.mockReturnValue(true);

      await expect(activity.getTrafficData(validRoute)).rejects.toThrow('Invalid route parameters');
    });

    it('should handle network timeout', async () => {
      mockedAxios.get.mockRejectedValue({
        isAxiosError: true,
        code: 'ECONNABORTED'
      });
      mockedAxios.isAxiosError.mockReturnValue(true);

      await expect(activity.getTrafficData(validRoute)).rejects.toThrow('Traffic data request timed out');
    });

    it('should handle API response with error status', async () => {
      const errorResponse = {
        ...mockSuccessResponse,
        status: 'REQUEST_DENIED'
      };

      mockedAxios.get.mockResolvedValue({ data: errorResponse });

      await expect(activity.getTrafficData(validRoute)).rejects.toThrow('Google Maps API error: REQUEST_DENIED');
    });

    it('should handle missing rows in response', async () => {
      const emptyRowsResponse = {
        ...mockSuccessResponse,
        rows: []
      };

      mockedAxios.get.mockResolvedValue({ data: emptyRowsResponse });

      await expect(activity.getTrafficData(validRoute)).rejects.toThrow('No route data found');
    });

    it('should handle missing elements in response', async () => {
      const emptyElementsResponse = {
        ...mockSuccessResponse,
        rows: [{ elements: [] }]
      };

      mockedAxios.get.mockResolvedValue({ data: emptyElementsResponse });

      await expect(activity.getTrafficData(validRoute)).rejects.toThrow('No route element found');
    });

    it('should handle element with error status', async () => {
      const elementErrorResponse = {
        ...mockSuccessResponse,
        rows: [{
          elements: [{
            status: 'NOT_FOUND'
          }]
        }]
      };

      mockedAxios.get.mockResolvedValue({ data: elementErrorResponse });

      await expect(activity.getTrafficData(validRoute)).rejects.toThrow('Route calculation failed: NOT_FOUND');
    });

    it('should handle missing duration_in_traffic data', async () => {
      const noDurationResponse = {
        ...mockSuccessResponse,
        rows: [{
          elements: [{
            distance: { text: '10.5 km', value: 10500 },
            duration: { text: '25 mins', value: 1500 },
            status: 'OK'
            // Missing duration_in_traffic
          }]
        }]
      };

      mockedAxios.get.mockResolvedValue({ data: noDurationResponse });

      await expect(activity.getTrafficData(validRoute)).rejects.toThrow('No traffic duration data available');
    });

    it('should log API call details and response times', async () => {
      const consoleSpy = vi.spyOn(console, 'log');
      mockedAxios.get.mockResolvedValue({ data: mockSuccessResponse });

      await activity.getTrafficData(validRoute);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[TrafficMonitoring] Starting traffic data retrieval for route route-123')
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[TrafficMonitoring] API response received in')
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[TrafficMonitoring] Current travel time: 35 minutes')
      );
    });

    it('should log errors with response time', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error');
      mockedAxios.get.mockRejectedValue(new Error('Network error'));
      mockedAxios.isAxiosError.mockReturnValue(false);

      await expect(activity.getTrafficData(validRoute)).rejects.toThrow('Network error');

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('[TrafficMonitoring] Error retrieving traffic data after'),
        expect.any(Error)
      );
    });
  });

  describe('createTrafficMonitoringActivity factory', () => {
    it('should create activity instance', () => {
      const activity = createTrafficMonitoringActivity(validApiKey);
      expect(activity).toBeInstanceOf(TrafficMonitoringActivityImpl);
    });

    it('should throw error with invalid API key', () => {
      expect(() => createTrafficMonitoringActivity('')).toThrow('Google Maps API key is required');
    });
  });
});