FROM node:20-alpine AS base

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json* ./
RUN npm ci

# Copy source
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build
RUN npm run build

# Production
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

COPY --from=base /app/package.json ./
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/.next ./.next
COPY --from=base /app/dist ./dist
COPY --from=base /app/public ./public
COPY --from=base /app/prisma ./prisma
COPY --from=base /app/next.config.js ./

RUN mkdir -p uploads

EXPOSE 3000 4000

CMD ["sh", "-c", "npx prisma migrate deploy && npm run start"]
