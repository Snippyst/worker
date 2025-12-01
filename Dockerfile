FROM node:22-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:22-alpine

RUN apk add --no-cache curl tar xz

RUN apk add --no-cache --repository=https://dl-cdn.alpinelinux.org/alpine/edge/community \
    font-roboto font-roboto-mono \
    font-noto font-noto-extra \
    font-noto-cjk font-noto-emoji

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY --from=builder /app/dist ./dist

RUN node -e "require('./dist/cli-installer.js').installAllVersions()"

CMD ["node", "dist/index.js"]
