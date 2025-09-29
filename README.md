# Freight Delay Monitor

A TypeScript application built on Temporal workflows that monitors delivery routes for traffic delays and notifies customers when significant delays occur.

## Project Structure

```
src/
├── activities/          # Temporal activities for API integrations
├── config/             # Configuration management
├── types/              # TypeScript type definitions
├── utilities/          # Utility functions
├── workflows/          # Temporal workflow definitions
├── index.ts           # Main application entry point
└── worker.ts          # Temporal worker implementation
```

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your API keys
   ```

3. **Build the project:**
   ```bash
   npm run build
   ```

4. **Run tests:**
   ```bash
   npm test
   ```

## Development Scripts

- `npm run build` - Build TypeScript to JavaScript
- `npm run build:watch` - Build in watch mode
- `npm run dev` - Run in development mode
- `npm run worker` - Start Temporal worker
- `npm run test` - Run tests
- `npm run test:watch` - Run tests in watch mode
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint issues

## API Keys Required

- **Google Maps API Key**: For traffic data retrieval
- **OpenAI API Key**: For AI-generated delay messages
- **SendGrid API Key**: For email notifications

## Dependencies

- **Temporal TypeScript SDK**: Workflow orchestration
- **Axios**: HTTP client for API requests
- **TypeScript**: Type-safe JavaScript
- **Vitest**: Testing framework
- **ESLint**: Code linting

## Next Steps

This project structure is ready for implementing the freight delay monitoring system. The next tasks will involve:

1. Defining core interfaces and types
2. Implementing Google Maps traffic monitoring
3. Creating delay analysis logic
4. Adding AI message generation
5. Setting up email notifications
6. Creating the main Temporal workflow