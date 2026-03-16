# Build stage
FROM node:20-slim AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy all files from the backend directory
# This ensures all folders (src, sql, etc) are included
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM node:20-slim

WORKDIR /app

# Copy built files, package info, and sql migrations
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/sql ./sql

# Install production dependencies only
RUN npm install --omit=dev

# Set environment
ENV NODE_ENV=production

# Expose port (Railway will provide the $PORT env var)
EXPOSE 5000

# Start command
CMD ["node", "dist/index.js"]
