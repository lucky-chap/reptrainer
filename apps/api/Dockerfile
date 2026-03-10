FROM node:20-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

# Build stage
FROM base AS build
COPY . /app
WORKDIR /app
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile
RUN pnpm run build --filter @reptrainer/api...

# Runner stage
FROM base AS runner
WORKDIR /app
COPY --from=build /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml /app/
COPY --from=build /app/packages /app/packages
COPY --from=build /app/apps/api /app/apps/api

# Re-install prod dependencies only to keep image small
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --prod --frozen-lockfile

ENV NODE_ENV=production
WORKDIR /app/apps/api
EXPOSE 4000
CMD [ "pnpm", "start" ]
