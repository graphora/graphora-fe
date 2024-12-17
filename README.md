# graphit-fe

## Tech Stack

- **Frontend:**
  - React with TypeScript
  - Tailwind CSS for styling
  - ShadCN UI components
  - Wouter for routing
  - React Query for data fetching
  - Sentry for error monitoring

- **Backend:**
  - Express.js
  - Firebase Authentication
  - Neo4j graph database
  - TypeScript

## Prerequisites

Before you begin, ensure you have the following installed:
- Node.js (v20.x or later)
- npm (v10.x or later)
- Neo4j Database

## Getting Started

1. Clone the repository:
```bash
git clone <repository-url>
cd graphit-fe
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
Create a `.env` file in the root directory with the following variables:
```env
VITE_AUTH0_DOMAIN=
VITE_AUTH0_CLIENT_ID=
VITE_SENTRY_DSN=
VITE_NEO4J_URI=
VITE_NEO4J_USER=
VITE_NEO4J_PASSWORD=
VITE_APP_NAME=Graphit
VITE_APP_VERSION=0.1.0
VITE_PROD=
```

## Development

To start the development server:

```bash
npm run dev
```

This will:
- Start the Express backend server
- Launch the Vite development server for the frontend
- Enable hot module replacement (HMR)
- Watch for TypeScript errors

The application will be available at `http://localhost:5001`

### Project Structure

```
├── client/                # Frontend React application
│   ├── src/
│   │   ├── components/   # Reusable UI components
│   │   ├── hooks/        # Custom React hooks
│   │   ├── lib/          # Utility functions and configurations
│   │   └── pages/        # Application pages
├── server/               # Backend Express application
│   ├── routes.ts         # API routes
│   └── index.ts         # Server configuration
└── db/                  # Database configurations and schema
```

## Building for Production

To build the application for production:

```bash
npm run build
```

This will:
1. Build the React frontend with Vite
2. Compile the TypeScript backend
3. Generate production-ready assets

## Running in Production

To start the production server:

```bash
npm start
```

The application will be served at `http://localhost:5001`

## Debugging

### Frontend Debugging

1. Browser Developer Tools:
   - Use React Developer Tools for component inspection
   - Check the Console for errors and warnings
   - Network tab for API request monitoring

2. Sentry Integration:
   - Monitor real-time errors in the Sentry dashboard
   - Track user sessions and performance metrics

### Backend Debugging

1. Server Logs:
   - Check the console output for Express server logs
   - API endpoint access logs are automatically generated

2. Database Debugging:
   - Use Neo4j Browser interface for query testing
   - Monitor database connections in server logs

## Deployment

### VM Deployment Steps

1. Set up the VM:
   ```bash
   # Update system packages
   sudo apt update && sudo apt upgrade -y
   
   # Install Node.js and npm
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt install -y nodejs
   ```

2. Clone and Setup:
   ```bash
   git clone <repository-url>
   cd security-monitoring-app
   npm install
   ```

3. Build the Application:
   ```bash
   npm run build
   ```

4. Configure Environment:
   - Set up environment variables
   - Configure firewall rules
   - Set up SSL certificates if needed

5. Run the Application:
   ```bash
   # Using PM2 for process management
   npm install -g pm2
   pm2 start npm --name "security-app" -- start
   ```

### Security Best Practices

1. Always use HTTPS in production
2. Implement rate limiting for API endpoints
3. Keep dependencies updated
4. Regular security audits
5. Proper error handling and logging
6. Input validation and sanitization

## Contributing

1. Fork the repository
2. Create a feature branch
3. Follow the coding standards:
   - Use TypeScript strict mode
   - Follow ESLint configuration
   - Write tests for new features
4. Submit a pull request

## Troubleshooting

Common issues and solutions:

1. **Database Connection Issues:**
   - Verify Neo4j credentials
   - Check database connection string
   - Ensure Neo4j service is running

2. **Build Errors:**
   - Clear npm cache: `npm cache clean --force`
   - Remove node_modules: `rm -rf node_modules`
   - Reinstall dependencies: `npm install`

3. **Authentication Issues:**
   - Verify Firebase configuration
   - Check browser console for auth errors
   - Validate token expiration handling

## Support

For support, please open an issue in the repository or contact the maintenance team.
