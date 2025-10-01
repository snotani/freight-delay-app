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
  const workflowStartTime = Date.now();
  
  log.info('🚀 Starting freight delay monitoring workflow', {
    routeId: route.routeId,
    customerId: customer.customerId,
    origin: route.origin,
    destination: route.destination,
    baselineTime: route.baselineTimeMinutes,
    delayThreshold: config.delayThresholdMinutes,
    workflowStartTime: new Date().toISOString()
  });

  const result: FreightDelayMonitorResult = {
    delayDetected: false,
    delayMinutes: 0,
    notificationSent: false,
    completedAt: new Date()
  };

  try {
    // Step 1: Monitor traffic conditions
    const step1StartTime = Date.now();
    log.info('📍 Step 1: Retrieving current traffic data', { 
      routeId: route.routeId,
      stepNumber: 1,
      stepName: 'TrafficMonitoring'
    });
    
    const trafficData = await getTrafficData(route);
    const step1Duration = Date.now() - step1StartTime;
    
    log.info('✅ Step 1: Traffic data retrieved successfully', {
      routeId: route.routeId,
      stepNumber: 1,
      stepDuration: step1Duration,
      currentTravelTime: trafficData.currentTravelTimeMinutes,
      trafficConditions: trafficData.trafficConditions,
      retrievedAt: trafficData.retrievedAt,
      success: true
    });

    // Step 2: Calculate delay and check threshold
    const step2StartTime = Date.now();
    log.info('🔢 Step 2: Calculating delay and checking threshold', {
      routeId: route.routeId,
      stepNumber: 2,
      stepName: 'DelayAnalysis',
      currentTime: trafficData.currentTravelTimeMinutes,
      baselineTime: route.baselineTimeMinutes
    });

    const delayMinutes = await calculateDelay(trafficData, route.baselineTimeMinutes);
    result.delayMinutes = delayMinutes;
    const step2Duration = Date.now() - step2StartTime;

    // Check if delay exceeds threshold (simple logic, no need for activity)
    const exceedsDelayThreshold = delayMinutes > config.delayThresholdMinutes;
    result.delayDetected = exceedsDelayThreshold;
    const excessMinutes = exceedsDelayThreshold ? delayMinutes - config.delayThresholdMinutes : 0;
    const delayPercentage = config.delayThresholdMinutes > 0 ? Math.round((delayMinutes / config.delayThresholdMinutes) * 100) : 0;

    log.info('✅ Step 2: Delay analysis completed', {
      routeId: route.routeId,
      stepNumber: 2,
      stepDuration: step2Duration,
      delayMinutes,
      threshold: config.delayThresholdMinutes,
      exceedsThreshold: exceedsDelayThreshold,
      excessMinutes,
      delayPercentage,
      success: true
    });

    if (!exceedsDelayThreshold) {
      const workflowDuration = Date.now() - workflowStartTime;
      log.info('🎯 Workflow completed: Delay within acceptable limits', {
        routeId: route.routeId,
        customerId: customer.customerId,
        delayMinutes,
        threshold: config.delayThresholdMinutes,
        notificationRequired: false,
        workflowDuration,
        completedAt: new Date().toISOString(),
        success: true
      });
      
      result.completedAt = new Date();
      return result;
    }

    log.info('⚠️ Delay exceeds threshold - proceeding with notification', {
      routeId: route.routeId,
      customerId: customer.customerId,
      delayMinutes,
      threshold: config.delayThresholdMinutes,
      excessMinutes,
      notificationRequired: true
    });

    // Step 3: Generate personalized delay message
    const step3StartTime = Date.now();
    log.info('💬 Step 3: Generating personalized delay message', {
      routeId: route.routeId,
      customerId: customer.customerId,
      stepNumber: 3,
      stepName: 'MessageGeneration'
    });

    const delayNotification: DelayNotification = {
      customerId: customer.customerId,
      customerEmail: customer.customerEmail,
      route,
      delayMinutes,
      message: '' // Will be populated by AI generation
    };

    let generatedMessage: string;
    let messageSource: string;
    try {
      generatedMessage = await generateDelayMessage(delayNotification);
      messageSource = 'ai';
      const step3Duration = Date.now() - step3StartTime;
      
      log.info('✅ Step 3: AI message generated successfully', {
        routeId: route.routeId,
        customerId: customer.customerId,
        stepNumber: 3,
        stepDuration: step3Duration,
        messageLength: generatedMessage.length,
        messageSource,
        success: true
      });
    } catch (error) {
      const step3Duration = Date.now() - step3StartTime;
      messageSource = 'fallback';
      
      log.warn('⚠️ Step 3: AI message generation failed, using fallback', {
        routeId: route.routeId,
        customerId: customer.customerId,
        stepNumber: 3,
        stepDuration: step3Duration,
        error: error instanceof Error ? error.message : 'Unknown error',
        messageSource,
        fallbackUsed: true
      });
      
      // Use fallback message from configuration
      generatedMessage = config.fallbackMessage
        .replace('{delayMinutes}', delayMinutes.toString())
        .replace('{origin}', route.origin)
        .replace('{destination}', route.destination);
        
      log.info('✅ Step 3: Fallback message generated', {
        routeId: route.routeId,
        customerId: customer.customerId,
        stepNumber: 3,
        stepDuration: step3Duration,
        messageLength: generatedMessage.length,
        messageSource,
        success: true
      });
    }

    // Update notification with generated message
    delayNotification.message = generatedMessage;

    // Step 4: Send email notification
    const step4StartTime = Date.now();
    log.info('📧 Step 4: Sending email notification', {
      routeId: route.routeId,
      customerId: customer.customerId,
      customerEmail: customer.customerEmail,
      stepNumber: 4,
      stepName: 'EmailNotification',
      messageLength: generatedMessage.length,
      messageSource
    });

    const notificationSuccess = await sendEmailNotification(delayNotification);
    result.notificationSent = notificationSuccess;
    const step4Duration = Date.now() - step4StartTime;

    if (notificationSuccess) {
      log.info('✅ Step 4: Email notification sent successfully', {
        routeId: route.routeId,
        customerId: customer.customerId,
        customerEmail: customer.customerEmail,
        stepNumber: 4,
        stepDuration: step4Duration,
        delayMinutes,
        messageSource,
        success: true
      });
    } else {
      log.error('❌ Step 4: Failed to send email notification', {
        routeId: route.routeId,
        customerId: customer.customerId,
        customerEmail: customer.customerEmail,
        stepNumber: 4,
        stepDuration: step4Duration,
        success: false
      });
      
      result.errorMessage = 'Failed to send email notification after all retry attempts';
    }

  } catch (error) {
    const workflowDuration = Date.now() - workflowStartTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown workflow error';
    
    log.error('💥 Workflow execution failed', {
      routeId: route.routeId,
      customerId: customer.customerId,
      error: errorMessage,
      errorType: error instanceof Error ? error.constructor.name : 'Unknown',
      workflowDuration,
      failedAt: new Date().toISOString(),
      success: false
    });

    result.errorMessage = errorMessage;
    result.completedAt = new Date();
    
    // Re-throw as ApplicationFailure for proper Temporal error handling
    throw ApplicationFailure.create({
      message: `Freight delay monitoring workflow failed: ${errorMessage}`,
      type: 'WorkflowExecutionError',
      nonRetryable: false,
      details: [{ 
        routeId: route.routeId, 
        customerId: customer.customerId,
        workflowDuration,
        failedAt: result.completedAt.toISOString()
      }]
    });
  }

  result.completedAt = new Date();
  const workflowDuration = Date.now() - workflowStartTime;
  
  log.info('🎉 Freight delay monitoring workflow completed successfully', {
    routeId: route.routeId,
    customerId: customer.customerId,
    delayDetected: result.delayDetected,
    delayMinutes: result.delayMinutes,
    notificationSent: result.notificationSent,
    workflowDuration,
    completedAt: result.completedAt.toISOString(),
    success: true,
    summary: {
      stepsCompleted: result.notificationSent ? 4 : 2,
      totalSteps: 4,
      notificationRequired: result.delayDetected,
      notificationDelivered: result.notificationSent
    }
  });

  return result;
}