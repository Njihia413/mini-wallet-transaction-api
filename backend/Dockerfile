# Simple Dockerfile for Backend
FROM node:20-slim

# Create and define the application directory
WORKDIR /usr/src/app

# Copy EVERYTHING from the current context
COPY . .

# Debugging: List files to see if we are in the right place
RUN ls -la

# Install dependencies and build
RUN npm install
RUN npm run build

# Prepare for production
ENV NODE_ENV=production
EXPOSE 5000

# Use the direct path to the built file
CMD ["node", "dist/index.js"]
