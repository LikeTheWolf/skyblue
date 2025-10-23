FROM node:22-alpine

# Set working directory
WORKDIR /sim

# Copy package files
# Copy exact dependency graph
COPY package.json package-lock.json ./
RUN npm ci

# Copy the rest of the files
COPY . .

# Build the React app
RUN npm run build

# Expose port 4001
EXPOSE 4001

# Serve the app with http-server
CMD ["npx", "http-server", "./build", "-p", "4001", "--ssl", "--cert", "/sim/ssl/cloudflare-origin.pem", "--key", "/sim/ssl/cloudflare-origin.key"]
