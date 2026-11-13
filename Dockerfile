# The landing range as a small static site: Node serves range/ and src/ (no build step, no dependencies).
# Pinned to the 2026-11-11 Node.js security release. Do not float this tag.
FROM node:22.23.5-alpine
WORKDIR /app
COPY package.json server.mjs ./
COPY src ./src
COPY range ./range
ENV HOST=0.0.0.0 PORT=8080 SAVE_FLIGHTS=off NODE_ENV=production
EXPOSE 8080
USER node
CMD ["node", "server.mjs"]
