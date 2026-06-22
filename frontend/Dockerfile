# Stage 1: Build the React application
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json ./
RUN npm install

COPY vite.config.js ./
COPY index.html ./
COPY src/ ./src/

RUN npm run build

# Stage 2: Serve with nginx
FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
