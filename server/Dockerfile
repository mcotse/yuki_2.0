FROM node:20-slim

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY tsconfig.json ./
COPY src ./src

# Install dev dependencies for build, then build, then remove dev deps
RUN npm install typescript tsx --save-dev && \
    npm run build && \
    npm prune --production

# Copy wallet files (will be mounted or included at runtime)
# COPY wallet ./wallet

EXPOSE 3000

ENV NODE_ENV=production

CMD ["node", "dist/index.js"]
