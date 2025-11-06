# Stage 1: Build dependencies and compile
FROM node:18-alpine AS builder

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@8.15.0

# Copy workspace configuration files
COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml turbo.json ./
COPY tsconfig.json ./

# Copy shared packages
COPY packages/shared ./packages/shared
COPY packages/backend-core ./packages/backend-core

# Copy backend app
COPY apps/backend-nest ./apps/backend-nest

# Install dependencies
# Use --no-frozen-lockfile in builder to allow lockfile updates if needed
RUN pnpm install --no-frozen-lockfile

# Build all packages
RUN pnpm build --filter=@crypto-dashboard/shared...
RUN pnpm build --filter=@crypto-dashboard/backend-core...
RUN pnpm build --filter=@crypto-dashboard/backend-nest...

# Stage 2: Production image
FROM node:18-alpine AS production

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@8.15.0

# Copy package files
COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml ./

# Copy built packages
COPY --from=builder /app/packages/shared/package.json ./packages/shared/
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/backend-core/package.json ./packages/backend-core/
COPY --from=builder /app/packages/backend-core/dist ./packages/backend-core/dist

# Copy built backend app
COPY --from=builder /app/apps/backend-nest/package.json ./apps/backend-nest/
COPY --from=builder /app/apps/backend-nest/dist ./apps/backend-nest/dist

# Install production dependencies only
RUN pnpm install --prod --frozen-lockfile

# Expose port
EXPOSE 3000

# Set working directory to backend app
WORKDIR /app/apps/backend-nest

# Start the application
CMD ["node", "dist/main.js"]

