# The landing range as a small static site: Node serves range/ and src/ (no build step, no dependencies).
FROM node:22-alpine
WORKDIR /app
COPY package.json server.mjs ./
COPY src ./src
COPY range ./range
ENV HOST=0.0.0.0 PORT=8080 SAVE_FLIGHTS=off NODE_ENV=production
EXPOSE 8080
USER node
CMD ["node", "server.mjs"]
