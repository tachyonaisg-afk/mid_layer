# Use lightweight Node image
FROM node:20-alpine

# Create app directory
WORKDIR /usr/src/app

# Copy package files first (better caching)
COPY package*.json ./

# Install only production dependencies
RUN npm install --omit=dev

# Copy rest of the app
COPY . .

# Your app runs on port 3008
EXPOSE 3008

# Start the server
CMD ["node", "server.js"]