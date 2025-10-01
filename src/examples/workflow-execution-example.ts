/**
 * Example demonstrating complete freight delay monitoring workflow execution
 * 
 * This example shows how to:
 * 1. Set up workflow configuration
 * 2. Create client and start workflow
 * 3. Monitor workflow status
 * 4. Handle results and errors
 */

import { FreightDelayMonitorClient, executeWorkflow, monitorWorkflow } from '../client';
import { DeliveryRoute } from '../types/delivery-route';
import { WorkflowConfig } from '../types/workflow-config';

/**
 * Example route data for testing
 */
const exampleRoute: DeliveryRoute = {
  routeId: 'ROUTE-001',
  origin: '1600 Amphitheatre Parkway, Mountain View, CA',
  destination: '1 Hacker Way, Menlo Park, CA',
  baselineTimeMinutes: 45
};

/**
 * Example customer information
 */
const exampleCustomer = {
  customerId: 'CUST-12345',
  customerEmail: 'customer@example.com'
};

/**
 * Example workflow configuration
 */
const exampleConfig: WorkflowConfig = {
  delayThresholdMinutes: 30,
  retryAttempts: 3,
  fallbackMessage: 'We apologize, but your delivery to {destination} from {origin} is experiencing a delay of approximately {delayMinutes} minutes due to traffic conditions. We will keep you updated on any changes.'
};

/**
 * Example 1: Simple workflow execution using utility function
 */
async function simpleWorkflowExecution() {
  console.log('\n=== Example 1: Simple Workflow Execution ===');
  
  try {
    console.log('Starting workflow execution...');
    
    const result = await executeWorkflow(
      exampleRoute,
      exampleCustomer,
      exampleConfig,
      {
        workflowId: `example-simple-${Date.now()}`,
        taskQueue: 'freight-delay-monitor'
      }
    );
    
    console.log('Workflow completed successfully!');
    console.log('Result:', {
      delayDetected: result.delayDetected,
      delayMinutes: result.delayMinutes,
      notificationSent: result.notificationSent,
      completedAt: result.completedAt,
      errorMessage: result.errorMessage
    });
    
  } catch (error) {
    console.error('Workflow execution failed:', error);
  }
}

/**
 * Example 2: Advanced workflow management with client
 */
async function advancedWorkflowManagement() {
  console.log('\n=== Example 2: Advanced Workflow Management ===');
  
  let client: FreightDelayMonitorClient | null = null;
  
  try {
    // Create client
    console.log('Creating Temporal client...');
    client = await FreightDelayMonitorClient.create();
    
    // Start workflow
    console.log('Starting workflow...');
    const handle = await client.startWorkflow(
      exampleRoute,
      exampleCustomer,
      exampleConfig,
      {
        workflowId: `example-advanced-${Date.now()}`,
        workflowExecutionTimeoutMs: 600000, // 10 minutes
        workflowRunTimeoutMs: 300000 // 5 minutes
      }
    );
    
    console.log(`Workflow started with ID: ${handle.workflowId}`);
    
    // Monitor workflow status
    console.log('Monitoring workflow status...');
    let isRunning = true;
    
    while (isRunning) {
      const status = await client.getWorkflowStatus(handle.workflowId);
      
      console.log(`Status: ${status.status} (Started: ${status.startTime.toISOString()})`);
      
      if (['COMPLETED', 'FAILED', 'CANCELLED', 'TERMINATED', 'TIMED_OUT'].includes(status.status)) {
        isRunning = false;
        
        if (status.status === 'COMPLETED' && status.result) {
          console.log('Workflow completed successfully!');
          console.log('Final result:', status.result);
        } else if (status.status === 'FAILED') {
          console.error('Workflow failed:', status.error);
        } else {
          console.log(`Workflow ended with status: ${status.status}`);
        }
      } else {
        // Wait 2 seconds before checking again
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
  } catch (error) {
    console.error('Advanced workflow management failed:', error);
  } finally {
    if (client) {
      await client.close();
    }
  }
}

/**
 * Example 3: Workflow monitoring with utility function
 */
async function workflowMonitoringExample() {
  console.log('\n=== Example 3: Workflow Monitoring ===');
  
  let client: FreightDelayMonitorClient | null = null;
  
  try {
    // Start a workflow first
    client = await FreightDelayMonitorClient.create();
    
    const handle = await client.startWorkflow(
      exampleRoute,
      exampleCustomer,
      exampleConfig,
      {
        workflowId: `example-monitoring-${Date.now()}`
      }
    );
    
    console.log(`Started workflow ${handle.workflowId} for monitoring`);
    
    // Close the client and use monitoring utility
    await client.close();
    client = null;
    
    // Monitor using utility function
    const finalStatus = await monitorWorkflow(
      handle.workflowId,
      3000, // Poll every 3 seconds
      180000 // Timeout after 3 minutes
    );
    
    console.log('Final workflow status:', finalStatus);
    
  } catch (error) {
    console.error('Workflow monitoring failed:', error);
  } finally {
    if (client) {
      await client.close();
    }
  }
}

/**
 * Example 4: Error handling and workflow cancellation
 */
async function errorHandlingExample() {
  console.log('\n=== Example 4: Error Handling and Cancellation ===');
  
  let client: FreightDelayMonitorClient | null = null;
  
  try {
    client = await FreightDelayMonitorClient.create();
    
    // Start workflow with invalid data to demonstrate error handling
    console.log('Testing input validation...');
    
    try {
      await client.startWorkflow(
        { ...exampleRoute, routeId: '' }, // Invalid route ID
        exampleCustomer,
        exampleConfig
      );
    } catch (error) {
      console.log('✓ Input validation caught invalid route ID:', (error as Error).message);
    }
    
    try {
      await client.startWorkflow(
        exampleRoute,
        { ...exampleCustomer, customerEmail: 'invalid-email' }, // Invalid email
        exampleConfig
      );
    } catch (error) {
      console.log('✓ Input validation caught invalid email:', (error as Error).message);
    }
    
    // Start a valid workflow and then cancel it
    console.log('Starting workflow for cancellation test...');
    const handle = await client.startWorkflow(
      exampleRoute,
      exampleCustomer,
      exampleConfig,
      {
        workflowId: `example-cancel-${Date.now()}`
      }
    );
    
    console.log(`Started workflow ${handle.workflowId}`);
    
    // Wait a moment then cancel
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('Cancelling workflow...');
    await client.cancelWorkflow(handle.workflowId, undefined, 'Example cancellation');
    
    // Check final status
    const status = await client.getWorkflowStatus(handle.workflowId);
    console.log(`Workflow status after cancellation: ${status.status}`);
    
  } catch (error) {
    console.error('Error handling example failed:', error);
  } finally {
    if (client) {
      await client.close();
    }
  }
}

/**
 * Example 5: Multiple concurrent workflows
 */
async function concurrentWorkflowsExample() {
  console.log('\n=== Example 5: Concurrent Workflows ===');
  
  let client: FreightDelayMonitorClient | null = null;
  
  try {
    client = await FreightDelayMonitorClient.create();
    
    // Create multiple routes
    const routes: DeliveryRoute[] = [
      {
        routeId: 'ROUTE-A',
        origin: 'San Francisco, CA',
        destination: 'San Jose, CA',
        baselineTimeMinutes: 60
      },
      {
        routeId: 'ROUTE-B',
        origin: 'Oakland, CA',
        destination: 'Berkeley, CA',
        baselineTimeMinutes: 25
      },
      {
        routeId: 'ROUTE-C',
        origin: 'Palo Alto, CA',
        destination: 'Redwood City, CA',
        baselineTimeMinutes: 20
      }
    ];
    
    // Start multiple workflows concurrently
    console.log('Starting multiple workflows concurrently...');
    
    const workflowPromises = routes.map(async (route, index) => {
      const customer = {
        customerId: `CUST-${index + 1}`,
        customerEmail: `customer${index + 1}@example.com`
      };
      
      const handle = await client!.startWorkflow(
        route,
        customer,
        exampleConfig,
        {
          workflowId: `concurrent-${route.routeId}-${Date.now()}`
        }
      );
      
      console.log(`Started workflow ${handle.workflowId} for route ${route.routeId}`);
      return handle;
    });
    
    const handles = await Promise.all(workflowPromises);
    
    // Wait for all workflows to complete
    console.log('Waiting for all workflows to complete...');
    
    const results = await Promise.allSettled(
      handles.map(handle => client!.waitForResult(handle.workflowId))
    );
    
    // Display results
    results.forEach((result, index) => {
      const route = routes[index];
      
      if (result.status === 'fulfilled') {
        console.log(`✓ Route ${route.routeId} completed:`, {
          delayDetected: result.value.delayDetected,
          delayMinutes: result.value.delayMinutes,
          notificationSent: result.value.notificationSent
        });
      } else {
        console.error(`✗ Route ${route.routeId} failed:`, result.reason);
      }
    });
    
  } catch (error) {
    console.error('Concurrent workflows example failed:', error);
  } finally {
    if (client) {
      await client.close();
    }
  }
}

/**
 * Main function to run all examples
 */
async function runExamples() {
  console.log('🚛 Freight Delay Monitor - Workflow Execution Examples');
  console.log('=====================================================');
  
  try {
    await simpleWorkflowExecution();
    await advancedWorkflowManagement();
    await workflowMonitoringExample();
    await errorHandlingExample();
    await concurrentWorkflowsExample();
    
    console.log('\n✅ All examples completed successfully!');
  } catch (error) {
    console.error('\n❌ Examples failed:', error);
    process.exit(1);
  }
}

// Run examples if this file is executed directly
if (require.main === module) {
  runExamples().catch(console.error);
}

export {
  simpleWorkflowExecution,
  advancedWorkflowManagement,
  workflowMonitoringExample,
  errorHandlingExample,
  concurrentWorkflowsExample,
  runExamples
};