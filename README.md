# Freight Delay Monitor

A TypeScript application built on Temporal workflows that automatically monitors delivery routes for traffic delays and notifies customers when significant delays occur. The system integrates Google Maps traffic data, OpenAI message generation, and SendGrid email notifications in a fault-tolerant workflow architecture.

## 🚀 Features

- **Automated Traffic Monitoring**: Real-time traffic data from Google Maps Distance Matrix API
- **Intelligent Delay Detection**: Configurable thresholds for delay notifications
- **AI-Powered Messages**: Personalized delay notifications using OpenAI GPT-4o-mini
- **Reliable Email Delivery**: Professional email notifications via SendGrid
- **Fault-Tolerant Workflows**: Built on Temporal for reliability and observability
- **Comprehensive Logging**: Detailed logging for monitoring and debugging
- **Type-Safe Implementation**: Full TypeScript support with comprehensive type definitions

## 📁 Project Structure

```
src/
├── activities/              # Temporal activities for API integrations
│   ├── traffic-monitoring-activity.ts    # Google Maps traffic data retrieval
│   ├── delay-analysis-activity.ts        # Delay calculation and threshold checking
│   ├── message-generation-activity.ts    # AI-powered message generation
│   └── notification-activity.ts          # SendGrid email notifications
├── config/                  # Configuration management
│   ├── config-manager.ts               # Environment configuration
│   ├── environment.ts                  # Environment variable definitions
│   └── temporal-config.ts              # Temporal client configuration
├── types/                   # TypeScript type definitions
│   ├── delivery-route.ts               # Route data structures
│   ├── traffic-data.ts                 # Traffic information types
│   ├── delay-notification.ts           # Notification data structures
│   ├── workflow-config.ts              # Workflow configuration types
│   └── activity-interfaces.ts          # Activity interface definitions
├── utilities/               # Utility functions
│   ├── logging.ts                      # Structured logging utilities
│   ├── validation.ts                   # Input validation functions
│   └── config-loader.ts                # Configuration loading utilities
├── workflows/               # Temporal workflow definitions
│   └── freight-delay-monitor-workflow.ts  # Main workflow orchestration
├── examples/                # Example applications and usage
│   └── workflow-execution-example.ts   # Comprehensive workflow examples
├── cli/                     # Command-line interface
│   └── config-cli.ts                   # CLI configuration utilities
├── client.ts                # Temporal client and utilities
├── worker.ts                # Temporal worker implementation
├── cli-example.ts           # CLI example application
└── index.ts                 # Main application entry point
```

## 🛠️ Setup Instructions

### Prerequisites

- **Node.js** (v18 or higher)
- **npm** or **yarn**
- **Temporal Server** (local or cloud)
- **API Keys** (Google Maps, OpenAI, SendGrid)

### 1. Install Dependencies

```bash
# Clone the repository
git clone <repository-url>
cd freight-delay-monitor

# Install dependencies
npm install
```

### 2. Configure Environment Variables

```bash
# Copy the example environment file
cp .env.example .env

# Edit .env with your API keys and configuration
nano .env
```

Required environment variables:

```bash
# Google Maps API Configuration
GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here

# OpenAI API Configuration  
OPENAI_API_KEY=your_openai_api_key_here

# SendGrid Email Configuration
SENDGRID_API_KEY=your_sendgrid_api_key_here
FROM_EMAIL=noreply@yourcompany.com
FROM_NAME="Your Company Delivery Team"

# Temporal Configuration
TEMPORAL_SERVER_URL=localhost:7233
TEMPORAL_NAMESPACE=default

# Application Configuration
DELAY_THRESHOLD_MINUTES=30
LOG_LEVEL=info
```

### 3. API Key Setup

#### Google Maps API Key
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the **Distance Matrix API**
4. Create credentials (API Key)
5. Restrict the key to Distance Matrix API for security

#### OpenAI API Key
1. Visit [OpenAI Platform](https://platform.openai.com/)
2. Create an account or sign in
3. Navigate to API Keys section
4. Create a new API key
5. Ensure you have credits/billing set up

#### SendGrid API Key
1. Sign up at [SendGrid](https://sendgrid.com/)
2. Go to Settings > API Keys
3. Create a new API key with Mail Send permissions
4. Verify your sender email address

### 4. Start Temporal Server

```bash
# Using Temporal CLI (recommended for development)
temporal server start-dev

# Or using Docker
docker run --rm -p 7233:7233 temporalio/auto-setup:latest
```

### 5. Build and Test

```bash
# Build the project
npm run build

# Run tests to verify setup
npm test

# Run linting
npm run lint
```

## 🚀 Usage Examples

### Quick Start - CLI Example

```bash
# Start the Temporal worker (in one terminal)
npm run worker

# Run a simple workflow execution (in another terminal)
npm run client execute SF-SJ-001

# List available sample routes
npm run client list-routes

# Execute all sample routes
npm run client execute-all --threshold 15

# Monitor a specific workflow
npm run client monitor freight-delay-SF-SJ-001-1234567890
```

### Programmatic Usage

#### Simple Workflow Execution

```typescript
import { executeWorkflow } from './src/client';
import { DeliveryRoute } from './src/types/delivery-route';
import { WorkflowConfig } from './src/types/workflow-config';

// Define your route
const route: DeliveryRoute = {
  routeId: 'ROUTE-001',
  origin: '1600 Amphitheatre Parkway, Mountain View, CA',
  destination: '1 Hacker Way, Menlo Park, CA',
  baselineTimeMinutes: 45
};

// Customer information
const customer = {
  customerId: 'CUST-12345',
  customerEmail: 'customer@example.com'
};

// Workflow configuration
const config: WorkflowConfig = {
  delayThresholdMinutes: 30,
  retryAttempts: 3,
  fallbackMessage: 'Your delivery is experiencing a delay of {delayMinutes} minutes.'
};

// Execute the workflow
const result = await executeWorkflow(route, customer, config);

console.log('Workflow Result:', {
  delayDetected: result.delayDetected,
  delayMinutes: result.delayMinutes,
  notificationSent: result.notificationSent,
  completedAt: result.completedAt
});
```

#### Advanced Client Usage

```typescript
import { FreightDelayMonitorClient } from './src/client';

// Create client
const client = await FreightDelayMonitorClient.create();

// Start workflow
const handle = await client.startWorkflow(route, customer, config, {
  workflowId: 'my-custom-workflow-id',
  workflowExecutionTimeoutMs: 600000 // 10 minutes
});

// Monitor workflow status
const status = await client.getWorkflowStatus(handle.workflowId);
console.log('Workflow Status:', status.status);

// Wait for result
const result = await client.waitForResult(handle.workflowId);

// Close client
await client.close();
```

### Running Examples

The project includes comprehensive examples demonstrating various usage patterns:

```bash
# Run all workflow examples
npm run examples

# Or run specific examples programmatically
npx ts-node src/examples/workflow-execution-example.ts
```

## 🔧 Development Scripts

```bash
# Development
npm run dev              # Run in development mode with hot reload
npm run build            # Build TypeScript to JavaScript
npm run build:watch      # Build in watch mode

# Testing
npm test                 # Run all tests
npm run test:watch       # Run tests in watch mode
npm run test:coverage    # Run tests with coverage report

# Code Quality
npm run lint             # Run ESLint
npm run lint:fix         # Fix ESLint issues automatically
npm run type-check       # Run TypeScript type checking

# Temporal
npm run worker           # Start Temporal worker
npm run client           # Run CLI client

# Examples
npm run examples         # Run example applications
```

## 📊 Monitoring and Logging

The application provides comprehensive logging for monitoring and debugging:

### Log Levels
- **ERROR**: Critical errors and failures
- **WARN**: Warnings and fallback usage
- **INFO**: General information and workflow progress
- **DEBUG**: Detailed debugging information

### Key Metrics Logged
- **API Response Times**: Google Maps, OpenAI, SendGrid
- **Workflow Duration**: Complete workflow execution time
- **Delay Analysis**: Calculated delays and threshold comparisons
- **Notification Status**: Email delivery success/failure
- **Error Tracking**: Detailed error information with context

### Example Log Output

```json
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "level": "INFO",
  "component": "FreightDelayWorkflow",
  "message": "Workflow completed successfully",
  "data": {
    "routeId": "ROUTE-001",
    "customerId": "CUST-12345",
    "delayDetected": true,
    "delayMinutes": 45,
    "notificationSent": true,
    "workflowDuration": 15000,
    "completedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

## 🔒 Security Best Practices

- **API Key Management**: Store API keys in environment variables, never in code
- **Input Validation**: All inputs are validated before processing
- **Error Handling**: Sensitive information is not exposed in error messages
- **Rate Limiting**: Built-in retry policies respect API rate limits
- **Audit Logging**: All operations are logged for security auditing

## 🚨 Troubleshooting

### Common Issues

#### 1. Temporal Connection Failed
```bash
Error: Failed to connect to Temporal server: Connection refused
```
**Solution**: Ensure Temporal server is running on `localhost:7233`

#### 2. Google Maps API Error
```bash
Error: Google Maps API error: REQUEST_DENIED
```
**Solution**: Check API key validity and ensure Distance Matrix API is enabled

#### 3. OpenAI API Quota Exceeded
```bash
Error: OpenAI API quota exceeded
```
**Solution**: Check your OpenAI billing and usage limits

#### 4. SendGrid Authentication Failed
```bash
Error: SendGrid API authentication failed
```
**Solution**: Verify SendGrid API key and sender email verification

### Debug Mode

Enable debug logging for detailed troubleshooting:

```bash
# Set log level to debug
export LOG_LEVEL=debug

# Run with debug output
npm run worker
```

## 🧪 Testing

The project includes comprehensive test suites:

```bash
# Run all tests
npm test

# Run specific test suites
npm test -- --grep "TrafficMonitoring"
npm test -- --grep "DelayAnalysis"
npm test -- --grep "MessageGeneration"
npm test -- --grep "Notification"

# Run integration tests
npm run test:integration

# Generate coverage report
npm run test:coverage
```

### Test Structure
- **Unit Tests**: Individual component testing with mocked dependencies
- **Integration Tests**: End-to-end API integration testing
- **Workflow Tests**: Temporal workflow testing with deterministic execution
- **Error Scenario Tests**: Comprehensive error handling validation

## 📈 Performance Considerations

- **API Rate Limits**: Built-in retry policies respect provider rate limits
- **Concurrent Workflows**: Supports multiple simultaneous route monitoring
- **Resource Usage**: Optimized for minimal memory and CPU usage
- **Scalability**: Horizontal scaling through Temporal worker pools

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:

1. Check the [troubleshooting section](#-troubleshooting)
2. Review the [examples](#-usage-examples)
3. Open an issue on GitHub
4. Check Temporal documentation for workflow-related questions

## 🔄 Changelog

### Version 1.0.0
- Initial release with complete workflow implementation
- Google Maps traffic monitoring
- OpenAI message generation
- SendGrid email notifications
- Comprehensive logging and error handling
- CLI and programmatic interfaces
- Full test coverage