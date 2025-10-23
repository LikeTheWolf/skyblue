FROM node:20-alpine

# Set working directory
WORKDIR /sim

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the files
COPY . .

# Build the React app
RUN npm run build

# Expose port 4001
EXPOSE 4001

# Serve the app with http-server
CMD ["npx", "http-server", "./build", "-p", "4001", "--ssl", "--cert", "/sim/ssl/cloudflare-origin.pem", "--key", "/sim/ssl/cloudflare-origin.key"]
