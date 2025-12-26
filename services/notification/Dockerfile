# Use Node.js LTS image
FROM node:18

# Create app directory
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy the source code
COPY . .

# No port to expose (consumer), but keep EXPOSE optional
EXPOSE 5004

# Start the app
CMD ["node", "index.js"]
