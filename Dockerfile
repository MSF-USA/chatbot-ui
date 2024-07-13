# ---- Base Node ----
FROM node:22-alpine AS base
WORKDIR /app
COPY package*.json ./

ENV PANDOC_VERSION "3.2.1"

# Install dependencies for Pandoc
RUN apk add --no-cache curl

# Download and install Pandoc
RUN curl -L https://github.com/jgm/pandoc/releases/download/${PANDOC_VERSION}/pandoc-${PANDOC_VERSION}-linux-amd64.tar.gz | tar xz && \
    mv pandoc-${PANDOC_VERSION}/bin/pandoc /usr/local/bin && \
    rm -rf pandoc-${PANDOC_VERSION}

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
FROM node:22-alpine AS production
WORKDIR /app

# pdftotext package
RUN apk add --no-cache poppler poppler-dev poppler-utils

# Install Pandoc
COPY --from=base /usr/local/bin/pandoc /usr/local/bin/pandoc

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
