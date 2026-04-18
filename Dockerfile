# Build Stage
FROM node:20-alpine AS base

# Install pnpm globally
RUN npm install -g pnpm

WORKDIR /usr/src/app

# Copy lockfile and package.json
COPY package.json pnpm-lock.yaml tsconfig.json ecosystem.config.json tsconfig-paths-bootstrap.js ./

# Install all deps (including devDeps for compilation)
RUN pnpm install --frozen-lockfile --ignore-scripts

COPY ./src ./src
RUN pnpm run compile

# Production Stage
FROM node:20-alpine AS production

# Re-install pnpm in the final stage
RUN npm install -g pnpm

WORKDIR /usr/src/app
ENV NODE_ENV=production

# Copy only production files
COPY package.json pnpm-lock.yaml tsconfig.json ecosystem.config.json tsconfig-paths-bootstrap.js ./

# Install only production dependencies
RUN pnpm install --prod --frozen-lockfile --ignore-scripts

# Copy built artifacts from base
COPY --from=base /usr/src/app/dist ./dist

EXPOSE 8080
CMD ["node", "-r", "./tsconfig-paths-bootstrap.js", "dist/index.js"]