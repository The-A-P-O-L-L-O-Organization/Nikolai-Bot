FROM node:24-alpine

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Install dependencies first for better caching
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile --prod || pnpm install --prod

# Copy source code
COPY . .

# Create backups directory
RUN mkdir -p /app/backups

# Run as non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /app
USER nodejs

CMD ["node", "src/index.js"]
