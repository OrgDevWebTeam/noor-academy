# Build from the repository root:
#   docker build -f apps/api/Dockerfile -t noor-api .
# syntax=docker/dockerfile:1

FROM node:22-slim AS build
ENV HUSKY=0
RUN npm install -g pnpm@9.15.0
WORKDIR /repo
COPY . .
RUN pnpm install --frozen-lockfile
# Builds the API and the shared packages it depends on.
RUN pnpm --filter "@noor/api..." build
# Standalone folder with production dependencies only.
RUN pnpm --filter @noor/api deploy --prod /out

FROM node:22-slim AS runtime
ENV NODE_ENV=production HOST=0.0.0.0 PORT=4000
WORKDIR /app
COPY --from=build --chown=node:node /out ./
# Never run as root.
USER node
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||4000)+'/v1/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "dist/server.js"]
