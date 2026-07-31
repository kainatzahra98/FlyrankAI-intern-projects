# syntax=docker/dockerfile:1
FROM node:20-alpine

# Set working directory inside container
WORKDIR /app

# Copy dependency files first (layer caching)
COPY package*.json ./

# Install production dependencies only
RUN npm install --omit=dev

# Copy source code
COPY . .

EXPOSE 4000

CMD ["node", "src/server.js"]
