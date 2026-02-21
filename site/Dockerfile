FROM node:20-alpine

WORKDIR /app

ARG PORTAL_BACKEND_ORIGIN=http://bot:3100
ENV PORTAL_BACKEND_ORIGIN=${PORTAL_BACKEND_ORIGIN}

COPY package*.json ./
RUN npm ci --include=dev

COPY . .
RUN npm run build

ENV NODE_ENV=production
EXPOSE 3200

CMD ["npm", "run", "start"]
