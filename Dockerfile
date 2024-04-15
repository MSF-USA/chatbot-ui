# TODO: Figure out eaxct way to integrate Prisma into the dockerfile. Minimum seems like we need to run migrations and generate the client.
# ---- Base Node ----
FROM node:20-alpine AS base
WORKDIR /app
COPY package*.json ./

# ---- Dependencies ----
FROM base AS dependencies
RUN npm ci

# ---- Build ----
FROM dependencies AS build
COPY . .

ARG BUILD
ENV NEXT_PUBLIC_BUILD=$BUILD
ARG ENV
ENV NEXT_PUBLIC_ENV=$ENV

RUN npm run build

# ---- Production ----
FROM node:20-alpine AS production
WORKDIR /app
COPY --from=dependencies /app/node_modules ./node_modules
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/package*.json ./
COPY --from=build /app/next.config.js ./next.config.js
COPY --from=build /app/next-i18next.config.js ./next-i18next.config.js

# Expose the port the app will run on
EXPOSE 3000

# Start the application
CMD ["npm", "start"]
