FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY prisma ./prisma/
RUN npx prisma generate

COPY . .

FROM node:20-alpine

WORKDIR /app

# Install dependencies needed by node / tools if any
RUN apk add --no-cache openssl

COPY package*.json ./
RUN npm ci --only=production

COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app ./

RUN mkdir -p /app/uploads /app/certificates

EXPOSE 5000

CMD ["sh", "-c", "npx prisma db push && node prisma/seed.js && node server.js"]
