FROM node:22-alpine AS dependencies
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/admin/package.json apps/admin/package.json
COPY apps/mobile/package.json apps/mobile/package.json
COPY packages/contracts/package.json packages/contracts/package.json
RUN npm ci --workspace @gushi/admin --include-workspace-root

FROM dependencies AS builder
COPY apps/admin apps/admin
COPY packages/contracts packages/contracts
RUN npm --workspace @gushi/admin run build

FROM node:22-alpine AS runner
ENV NODE_ENV=production
WORKDIR /app
COPY --from=builder /app/package.json /app/package-lock.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/admin ./apps/admin
COPY --from=builder /app/packages/contracts ./packages/contracts
EXPOSE 3000
CMD ["npm", "--workspace", "@gushi/admin", "run", "start"]
