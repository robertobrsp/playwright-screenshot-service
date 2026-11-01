FROM mcr.microsoft.com/playwright:v1.46.0-jammy

WORKDIR /app

COPY package.json /app/package.json
RUN npm install

COPY server.js /app/server.js
COPY virais /app/virais
COPY public /app/public

ENV NODE_ENV=production
EXPOSE 3000

CMD ["npm", "start"]
