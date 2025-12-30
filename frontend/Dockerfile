FROM node:20-alpine

WORKDIR /app

# Install dependencies first (cached layer)
COPY package*.json ./
RUN npm install

# Copy source
COPY . .

# Expose Vite dev server port
EXPOSE 5173

# Default command (overridden in docker-compose for dev)
CMD ["npm", "run", "dev", "--", "--host"]
