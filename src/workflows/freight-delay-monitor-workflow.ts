import { 
  proxyActivities, 
  log, 
  ApplicationFailure,
  RetryPolicy,
  ActivityOptions
} from '@temporalio/workflow';
import type { 
  TrafficMonitoringActivity,
  DelayAnalysisActivity, 
  MessageGenerationActivity,
  NotificationActivity
} from '../types/activity-interfaces';
import type { DeliveryRoute } from '../types/delivery-route';
import type { DelayNotification } from '../types/delay-notification';
import type { WorkflowConfig } from '../types/workflow-config';

/**
 * Workflow input parameters for freight delay monitoring
 */
export interface FreightDelayMonitorInput {
  /** The delivery route to monitor */
  route: DeliveryRoute;
  /** Customer information for notifications */
  customer: {
    customerId: string;
    customerEmail: string;
  };
  /** Workflow configuration parameters */
  config: WorkflowConfig;
}

/**
 * Workflow result indicating the outcome of delay monitoring
 */
export interface FreightDelayMonitorResult {
  /** Whether a delay was detected */
  delayDetected: boolean;
  /** Amount of delay in minutes (0 if no delay) */
  delayMinutes: number;
  /** Whether a notification was sent */
  notificationSent: boolean;
  /** Any error messages encountered */
  errorMessage?: string;
  /** Timestamp when workflow completed */
  completedAt: Date;
}

/**
 * Retry policy for traffic monitoring activities
 * More aggressive retries for external API calls
 */
const trafficMonitoringRetryPolicy: RetryPolicy = {
  initialInterval: '2s',
  backoffCoefficient: 2.0,
  maximumInterval: '30s',
  maximumAttempts: 5,
  nonRetryableErrorTypes: ['AuthenticationError', 'InvalidRouteError']
};

/**
 * Retry policy for delay analysis activities
 * Quick retries for computational tasks
 */
const delayAnalysisRetryPolicy: RetryPolicy = {
  initialInterval: '1s',
  backoffCoefficient: 1.5,
  maximumInterval: '10s',
  maximumAttempts: 3,
  nonRetryableErrorTypes: ['ValidationError', 'InvalidDataError']
};

/**
 * Retry policy for AI message generation activities
 * Moderate retries for AI API calls
 */
const messageGenerationRetryPolicy: RetryPolicy = {
  initialInterval: '3s',
  backoffCoefficient: 2.0,
  maximumInterval: '60s',
  maximumAttempts: 4,
  nonRetryableErrorTypes: ['AuthenticationError', 'QuotaExceededError']
};

/**
 * Retry policy for notification activities
 * Persistent retries for critical notifications
 */
const notificationRetryPolicy: RetryPolicy = {
  initialInterval: '5s',
  backoffCoefficient: 2.0,
  maximumInterval: '120s',
  maximumAttempts: 6,
  nonRetryableErrorTypes: ['AuthenticationError', 'InvalidEmailError']
};

/**
 * Activity options with timeouts and retry policies
 */
const activityOptions: Record<string, ActivityOptions> = {
  trafficMonitoring: {
    startToCloseTimeout: '60s',
    retry: trafficMonitoringRetryPolicy,
  },
  delayAnalysis: {
    startToCloseTimeout: '30s',
    retry: delayAnalysisRetryPolicy,
  },
  messageGeneration: {
    startToCloseTimeout: '90s',
    retry: messageGenerationRetryPolicy,
  },
  notification: {
    startToCloseTimeout: '120s',
    retry: notificationRetryPolicy,
  },
};

// Create activity proxies with configured retry policies and timeouts
const {
  getTrafficData,
} = proxyActivities<TrafficMonitoringActivity>(activityOptions.trafficMonitoring);

const {
  calculateDelay,
} = proxyActivities<DelayAnalysisActivity>(activityOptions.delayAnalysis);

const {
  generateDelayMessage,
} = proxyActivities<MessageGenerationActivity>(activityOptions.messageGeneration);

const {
  sendEmailNotification,
} = proxyActivities<NotificationActivity>(activityOptions.notification);

/**
 * Main freight delay monitoring workflow
 * 
 * This workflow orchestrates the complete delay monitoring process:
 * 1. Monitors traffic conditions on delivery routes
 * 2. Calculates delays compared to baseline travel times
 * 3. Generates personalized delay messages using AI
 * 4. Sends email notifications to customers when delays exceed thresholds
 * 
 * @param input - Workflow input containing route, customer, and configuration data
 * @returns Promise resolving to workflow result with delay and notification status
 */
export async function freightDelayMonitorWorkflow(
  input: FreightDelayMonitorInput
): Promise<FreightDelayMonitorResult> {
  const { route, customer, config } = input;
  
  log.info('Starting freight delay monitoring workflow', {
    routeId: route.routeId,
    customerId: customer.customerId,
    origin: route.origin,
    destination: route.destination,
    baselineTime: route.baselineTimeMinutes,
    delayThreshold: config.delayThresholdMinutes
  });

  const result: FreightDelayMonitorResult = {
    delayDetected: false,
    delayMinutes: 0,
    notificationSent: false,
    completedAt: new Date()
  };

  try {
    // Step 1: Monitor traffic conditions
    log.info('Step 1: Retrieving current traffic data', { routeId: route.routeId });
    
    const trafficData = await getTrafficData(route);
    
    log.info('Traffic data retrieved successfully', {
      routeId: route.routeId,
      currentTravelTime: trafficData.currentTravelTimeMinutes,
      trafficConditions: trafficData.trafficConditions,
      retrievedAt: trafficData.retrievedAt
    });

    // Step 2: Calculate delay and check threshold
    log.info('Step 2: Calculating delay and checking threshold', {
      routeId: route.routeId,
      currentTime: trafficData.currentTravelTimeMinutes,
      baselineTime: route.baselineTimeMinutes
    });

    const delayMinutes = await calculateDelay(trafficData, route.baselineTimeMinutes);
    result.delayMinutes = delayMinutes;

    log.info('Delay calculation completed', {
      routeId: route.routeId,
      delayMinutes,
      threshold: config.delayThresholdMinutes
    });

    // Check if delay exceeds threshold (simple logic, no need for activity)
    const exceedsDelayThreshold = delayMinutes > config.delayThresholdMinutes;
    result.delayDetected = exceedsDelayThreshold;

    if (!exceedsDelayThreshold) {
      log.info('Delay does not exceed threshold - no notification needed', {
        routeId: route.routeId,
        delayMinutes,
        threshold: config.delayThresholdMinutes
      });
      
      result.completedAt = new Date();
      return result;
    }

    log.info('Delay exceeds threshold - proceeding with notification', {
      routeId: route.routeId,
      delayMinutes,
      threshold: config.delayThresholdMinutes
    });

    // Step 3: Generate personalized delay message
    log.info('Step 3: Generating personalized delay message', {
      routeId: route.routeId,
      customerId: customer.customerId
    });

    const delayNotification: DelayNotification = {
      customerId: customer.customerId,
      customerEmail: customer.customerEmail,
      route,
      delayMinutes,
      message: '' // Will be populated by AI generation
    };

    let generatedMessage: string;
    try {
      generatedMessage = await generateDelayMessage(delayNotification);
      log.info('AI message generated successfully', {
        routeId: route.routeId,
        customerId: customer.customerId,
        messageLength: generatedMessage.length
      });
    } catch (error) {
      log.warn('AI message generation failed, using fallback message', {
        routeId: route.routeId,
        customerId: customer.customerId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      // Use fallback message from configuration
      generatedMessage = config.fallbackMessage
        .replace('{delayMinutes}', delayMinutes.toString())
        .replace('{origin}', route.origin)
        .replace('{destination}', route.destination);
    }

    // Update notification with generated message
    delayNotification.message = generatedMessage;

    // Step 4: Send email notification
    log.info('Step 4: Sending email notification', {
      routeId: route.routeId,
      customerId: customer.customerId,
      customerEmail: customer.customerEmail
    });

    const notificationSuccess = await sendEmailNotification(delayNotification);
    result.notificationSent = notificationSuccess;

    if (notificationSuccess) {
      log.info('Email notification sent successfully', {
        routeId: route.routeId,
        customerId: customer.customerId,
        customerEmail: customer.customerEmail,
        delayMinutes
      });
    } else {
      log.error('Failed to send email notification', {
        routeId: route.routeId,
        customerId: customer.customerId,
        customerEmail: customer.customerEmail
      });
      
      result.errorMessage = 'Failed to send email notification after all retry attempts';
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown workflow error';
    
    log.error('Workflow execution failed', {
      routeId: route.routeId,
      customerId: customer.customerId,
      error: errorMessage,
      errorType: error instanceof Error ? error.constructor.name : 'Unknown'
    });

    result.errorMessage = errorMessage;
    
    // Re-throw as ApplicationFailure for proper Temporal error handling
    throw ApplicationFailure.create({
      message: `Freight delay monitoring workflow failed: ${errorMessage}`,
      type: 'WorkflowExecutionError',
      nonRetryable: false,
      details: [{ routeId: route.routeId, customerId: customer.customerId }]
    });
  }

  result.completedAt = new Date();
  
  log.info('Freight delay monitoring workflow completed', {
    routeId: route.routeId,
    customerId: customer.customerId,
    delayDetected: result.delayDetected,
    delayMinutes: result.delayMinutes,
    notificationSent: result.notificationSent,
    completedAt: result.completedAt
  });

  return result;
}