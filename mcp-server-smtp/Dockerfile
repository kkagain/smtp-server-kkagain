# Multi-stage build for smaller production image
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies including dev dependencies for build
RUN npm ci --only=production=false

# Copy source code
COPY src/ ./src/
COPY config/ ./config/

# Build the application
RUN npm run build

# Production stage
FROM node:20-alpine AS production

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create app user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

WORKDIR /app

# Copy package files and install only production dependencies
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy built application
COPY --from=builder /app/build ./build
COPY --from=builder /app/config ./config

# Create directories with proper permissions
RUN mkdir -p /app/logs && \
    mkdir -p /app/config && \
    chown -R nextjs:nodejs /app

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 3007

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3007
ENV LOG_LEVEL=info

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "const http = require('http'); const options = { host: 'localhost', port: process.env.PORT || 3007, path: '/api/health', timeout: 2000 }; const req = http.request(options, (res) => { res.statusCode === 200 ? process.exit(0) : process.exit(1); }); req.on('error', () => process.exit(1)); req.end();"

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "build/index.js"]