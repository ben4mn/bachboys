FROM node:20-alpine

WORKDIR /app

# Install dependencies first (cached layer)
COPY package*.json ./
RUN npm install

# Copy source
COPY . .

# Expose port
EXPOSE 3001

# Default command (overridden in docker-compose for dev)
CMD ["npm", "run", "dev"]
