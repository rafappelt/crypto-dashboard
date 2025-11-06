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
COPY packages/frontend-core ./packages/frontend-core

# Copy frontend app
COPY apps/frontend-react ./apps/frontend-react

# Install dependencies
# Use --no-frozen-lockfile in builder to allow lockfile updates if needed
RUN pnpm install --no-frozen-lockfile

# Build all packages
RUN pnpm build --filter=@crypto-dashboard/shared...
RUN pnpm build --filter=@crypto-dashboard/frontend-core...

# Build args for Vite environment variables
ARG VITE_WEBSOCKET_URL=http://localhost:3000
ENV VITE_WEBSOCKET_URL=$VITE_WEBSOCKET_URL

# Build frontend
RUN pnpm build --filter=@crypto-dashboard/frontend-react

# Stage 2: Production image with nginx
FROM nginx:alpine AS production

# Copy built files from builder
COPY --from=builder /app/apps/frontend-react/dist /usr/share/nginx/html

# Copy nginx configuration
COPY apps/frontend-react/nginx.conf /etc/nginx/conf.d/default.conf

# Expose port
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]

