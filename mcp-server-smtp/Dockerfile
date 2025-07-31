FROM node:18-alpine

WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install TypeScript globally
RUN npm install -g typescript

# Install dependencies
RUN npm install --ignore-scripts

# Copy the rest of the application
COPY . .

# Create config directory if it doesn't exist
RUN mkdir -p /app/config

# Create default config file if it doesn't exist
RUN if [ ! -f /app/config/default.json ]; then \
    echo '{"port":3007,"logLevel":"info","smtp":{"configs":[]}}' > /app/config/default.json; \
    fi

# Create logs directory
RUN mkdir -p /app/logs

# Expose the port
EXPOSE 3007

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3007
ENV LOG_LEVEL=info

# Compile TypeScript to JavaScript
RUN tsc --project tsconfig.json

# Run the application
CMD ["node", "build/index.js"]