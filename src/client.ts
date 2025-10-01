import { Client, Connection, WorkflowHandle } from '@temporalio/client';
import { 
  FreightDelayMonitorInput, 
  FreightDelayMonitorResult,
  freightDelayMonitorWorkflow 
} from './workflows/freight-delay-monitor-workflow';
import { DeliveryRoute, validateDeliveryRoute } from './types/delivery-route';
import { WorkflowConfig, validateWorkflowConfig } from './types/workflow-config';
import { createLogger, logWorkflowCompletion, Logger } from './utilities/logging';

/**
 * Customer information for delay notifications
 */
export interface CustomerInfo {
  customerId: string;
  customerEmail: string;
}

/**
 * Options for workflow execution
 */
export interface WorkflowExecutionOptions {
  /** Unique workflow ID (auto-generated if not provided) */
  workflowId?: string;
  /** Task queue name (defaults to 'freight-delay-monitor') */
  taskQueue?: string;
  /** Workflow execution timeout in milliseconds or duration string */
  workflowExecutionTimeoutMs?: number;
  /** Workflow run timeout in milliseconds or duration string */
  workflowRunTimeoutMs?: number;
}

/**
 * Workflow execution status information
 */
export interface WorkflowStatus {
  /** Workflow ID */
  workflowId: string;
  /** Current execution status */
  status: 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED' | 'TERMINATED' | 'TIMED_OUT';
  /** Start time of the workflow */
  startTime: Date;
  /** End time of the workflow (if completed) */
  endTime?: Date;
  /** Workflow result (if completed successfully) */
  result?: FreightDelayMonitorResult;
  /** Error message (if failed) */
  error?: string;
}

/**
 * Freight delay monitor client for managing workflow executions
 */
export class FreightDelayMonitorClient {
  private client: Client;
  private defaultTaskQueue: string;
  private logger: Logger;

  /**
   * Creates a new FreightDelayMonitorClient instance
   * @param client - Temporal client instance
   * @param defaultTaskQueue - Default task queue name
   */
  constructor(client: Client, defaultTaskQueue: string = 'freight-delay-monitor') {
    this.client = client;
    this.defaultTaskQueue = defaultTaskQueue;
    this.logger = createLogger('FreightDelayClient');
  }

  /**
   * Creates a new client instance with connection to Temporal server
   * @param serverUrl - Temporal server URL (defaults to localhost:7233)
   * @param namespace - Temporal namespace (defaults to 'default')
   * @returns Promise resolving to FreightDelayMonitorClient instance
   */
  static async create(
    serverUrl: string = 'localhost:7233',
    namespace: string = 'default'
  ): Promise<FreightDelayMonitorClient> {
    const logger = createLogger('FreightDelayClient');
    
    try {
      logger.info('Connecting to Temporal server', {
        serverUrl,
        namespace
      });
      
      const connection = await Connection.connect({
        address: serverUrl,
      });

      const client = new Client({
        connection,
        namespace,
      });

      logger.info('Successfully connected to Temporal server', {
        serverUrl,
        namespace
      });
      
      return new FreightDelayMonitorClient(client);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown connection error';
      logger.error('Failed to connect to Temporal server', error as Error, {
        serverUrl,
        namespace
      });
      throw new Error(`Failed to connect to Temporal server: ${errorMessage}`);
    }
  }

  /**
   * Validates workflow input parameters
   * @param route - Delivery route information
   * @param customer - Customer information
   * @param config - Workflow configuration
   * @throws Error if validation fails
   */
  private validateInput(route: DeliveryRoute, customer: CustomerInfo, config: WorkflowConfig): void {
    // Validate route
    validateDeliveryRoute(route);

    // Validate customer info
    if (!customer || typeof customer !== 'object') {
      throw new Error('Customer information must be an object');
    }

    if (!customer.customerId || typeof customer.customerId !== 'string' || customer.customerId.trim().length === 0) {
      throw new Error('Customer ID must be a non-empty string');
    }

    if (!customer.customerEmail || typeof customer.customerEmail !== 'string') {
      throw new Error('Customer email must be a string');
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(customer.customerEmail)) {
      throw new Error('Customer email must be a valid email address');
    }

    // Validate workflow config
    validateWorkflowConfig(config);
  }

  /**
   * Starts a new freight delay monitoring workflow
   * @param route - Delivery route to monitor
   * @param customer - Customer information for notifications
   * @param config - Workflow configuration
   * @param options - Workflow execution options
   * @returns Promise resolving to workflow handle
   */
  async startWorkflow(
    route: DeliveryRoute,
    customer: CustomerInfo,
    config: WorkflowConfig,
    options: WorkflowExecutionOptions = {}
  ): Promise<WorkflowHandle> {
    try {
      // Validate input parameters
      this.validateInput(route, customer, config);

      // Generate workflow ID if not provided
      const workflowId = options.workflowId || `freight-delay-${route.routeId}-${Date.now()}`;
      const taskQueue = options.taskQueue || this.defaultTaskQueue;

      this.logger.info('Starting freight delay monitoring workflow', {
        workflowId,
        routeId: route.routeId,
        customerId: customer.customerId,
        taskQueue,
        delayThreshold: config.delayThresholdMinutes
      });

      // Prepare workflow input
      const input: FreightDelayMonitorInput = {
        route,
        customer,
        config
      };

      // Start the workflow
      const handle = await this.client.workflow.start(freightDelayMonitorWorkflow, {
        args: [input],
        taskQueue,
        workflowId,
        workflowExecutionTimeout: options.workflowExecutionTimeoutMs || 600000, // 10 minutes default
        workflowRunTimeout: options.workflowRunTimeoutMs || 300000, // 5 minutes default
      });

      this.logger.info('Workflow started successfully', {
        workflowId: handle.workflowId,
        runId: handle.firstExecutionRunId,
        routeId: route.routeId,
        customerId: customer.customerId
      });

      return handle;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error starting workflow';
      this.logger.error('Failed to start workflow', error as Error, {
        routeId: route.routeId,
        customerId: customer.customerId
      });
      throw new Error(`Failed to start workflow: ${errorMessage}`);
    }
  }

  /**
   * Gets a handle to an existing workflow
   * @param workflowId - ID of the workflow to get
   * @param runId - Optional run ID for specific execution
   * @returns Workflow handle
   */
  getWorkflowHandle(workflowId: string, runId?: string): WorkflowHandle {
    if (!workflowId || typeof workflowId !== 'string' || workflowId.trim().length === 0) {
      throw new Error('Workflow ID must be a non-empty string');
    }

    return this.client.workflow.getHandle(workflowId, runId);
  }

  /**
   * Waits for a workflow to complete and returns the result
   * @param workflowId - ID of the workflow to wait for
   * @param runId - Optional run ID for specific execution
   * @returns Promise resolving to workflow result
   */
  async waitForResult(workflowId: string, runId?: string): Promise<FreightDelayMonitorResult> {
    const startTime = Date.now();
    
    try {
      this.logger.info('Waiting for workflow result', { workflowId, runId });
      
      const handle = this.getWorkflowHandle(workflowId, runId);
      const result = await handle.result() as FreightDelayMonitorResult;
      const duration = Date.now() - startTime;
      
      // Log workflow completion with comprehensive details
      logWorkflowCompletion(
        workflowId,
        true,
        duration,
        result,
        undefined,
        {
          runId,
          delayDetected: result.delayDetected,
          delayMinutes: result.delayMinutes,
          notificationSent: result.notificationSent
        }
      );

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error waiting for result';
      
      // Log workflow failure
      logWorkflowCompletion(
        workflowId,
        false,
        duration,
        undefined,
        error as Error,
        { runId }
      );
      
      throw new Error(`Error waiting for workflow result: ${errorMessage}`);
    }
  }

  /**
   * Gets the current status of a workflow
   * @param workflowId - ID of the workflow to check
   * @param runId - Optional run ID for specific execution
   * @returns Promise resolving to workflow status
   */
  async getWorkflowStatus(workflowId: string, runId?: string): Promise<WorkflowStatus> {
    try {
      const handle = this.getWorkflowHandle(workflowId, runId);
      const description = await handle.describe();

      const status: WorkflowStatus = {
        workflowId: description.workflowId,
        status: description.status.name as WorkflowStatus['status'],
        startTime: description.startTime,
        endTime: description.closeTime || undefined,
      };

      // If workflow is completed, try to get the result
      if (description.status.name === 'COMPLETED') {
        try {
          status.result = await handle.result() as FreightDelayMonitorResult;
        } catch (error) {
          console.warn('Could not retrieve workflow result:', error);
        }
      }

      // If workflow failed, get the error
      if (description.status.name === 'FAILED') {
        status.error = 'Workflow failed with unknown error';
      }

      return status;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error getting status';
      this.logger.error('Error getting workflow status', error as Error, { workflowId, runId });
      throw new Error(`Error getting workflow status: ${errorMessage}`);
    }
  }

  /**
   * Cancels a running workflow
   * @param workflowId - ID of the workflow to cancel
   * @param runId - Optional run ID for specific execution
   * @param reason - Optional reason for cancellation
   * @returns Promise that resolves when cancellation is requested
   */
  async cancelWorkflow(workflowId: string, runId?: string, reason?: string): Promise<void> {
    try {
      this.logger.info('Cancelling workflow', { workflowId, runId, reason });
      
      const handle = this.getWorkflowHandle(workflowId, runId);
      await handle.cancel();
      
      this.logger.info('Workflow cancellation requested', { workflowId, reason });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error cancelling workflow';
      this.logger.error('Error cancelling workflow', error as Error, { workflowId, runId, reason });
      throw new Error(`Error cancelling workflow: ${errorMessage}`);
    }
  }

  /**
   * Terminates a workflow (forceful stop)
   * @param workflowId - ID of the workflow to terminate
   * @param runId - Optional run ID for specific execution
   * @param reason - Optional reason for termination
   * @returns Promise that resolves when termination is requested
   */
  async terminateWorkflow(workflowId: string, runId?: string, reason?: string): Promise<void> {
    try {
      this.logger.info('Terminating workflow', { workflowId, runId, reason });
      
      const handle = this.getWorkflowHandle(workflowId, runId);
      await handle.terminate(reason);
      
      this.logger.info('Workflow termination requested', { workflowId, reason });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error terminating workflow';
      this.logger.error('Error terminating workflow', error as Error, { workflowId, runId, reason });
      throw new Error(`Error terminating workflow: ${errorMessage}`);
    }
  }

  /**
   * Closes the client connection
   */
  async close(): Promise<void> {
    try {
      await this.client.connection.close();
      this.logger.info('Client connection closed');
    } catch (error) {
      this.logger.error('Error closing client connection', error as Error);
    }
  }
}

/**
 * Utility function to execute a complete workflow and wait for result
 * @param route - Delivery route to monitor
 * @param customer - Customer information for notifications
 * @param config - Workflow configuration
 * @param options - Workflow execution options
 * @param serverUrl - Temporal server URL
 * @param namespace - Temporal namespace
 * @returns Promise resolving to workflow result
 */
export async function executeWorkflow(
  route: DeliveryRoute,
  customer: CustomerInfo,
  config: WorkflowConfig,
  options: WorkflowExecutionOptions = {},
  serverUrl: string = 'localhost:7233',
  namespace: string = 'default'
): Promise<FreightDelayMonitorResult> {
  let client: FreightDelayMonitorClient | null = null;
  
  try {
    // Create client
    client = await FreightDelayMonitorClient.create(serverUrl, namespace);
    
    // Start workflow
    const handle = await client.startWorkflow(route, customer, config, options);
    
    // Wait for result
    const result = await client.waitForResult(handle.workflowId);
    
    return result;
  } finally {
    // Always close the client
    if (client) {
      await client.close();
    }
  }
}

/**
 * Utility function to monitor workflow status with polling
 * @param workflowId - ID of the workflow to monitor
 * @param pollIntervalMs - Polling interval in milliseconds (default: 5000)
 * @param timeoutMs - Timeout in milliseconds (default: 300000 = 5 minutes)
 * @param serverUrl - Temporal server URL
 * @param namespace - Temporal namespace
 * @returns Promise resolving to final workflow status
 */
export async function monitorWorkflow(
  workflowId: string,
  pollIntervalMs: number = 5000,
  timeoutMs: number = 300000,
  serverUrl: string = 'localhost:7233',
  namespace: string = 'default'
): Promise<WorkflowStatus> {
  let client: FreightDelayMonitorClient | null = null;
  
  try {
    client = await FreightDelayMonitorClient.create(serverUrl, namespace);
    
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeoutMs) {
      const status = await client.getWorkflowStatus(workflowId);
      
      const logger = createLogger('WorkflowMonitor');
      logger.info('Workflow status update', {
        workflowId: status.workflowId,
        status: status.status,
        startTime: status.startTime,
        endTime: status.endTime,
        isTerminal: ['COMPLETED', 'FAILED', 'CANCELLED', 'TERMINATED', 'TIMED_OUT'].includes(status.status)
      });
      
      // Return if workflow is in a terminal state
      if (['COMPLETED', 'FAILED', 'CANCELLED', 'TERMINATED', 'TIMED_OUT'].includes(status.status)) {
        return status;
      }
      
      // Wait before next poll
      await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
    }
    
    throw new Error(`Workflow monitoring timed out after ${timeoutMs}ms`);
  } finally {
    if (client) {
      await client.close();
    }
  }
}