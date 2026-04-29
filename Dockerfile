FROM node:22-alpine

WORKDIR /app

COPY . .

RUN npm install --omit=dev

ENV PORT=3000
ENV DB_FILE=/data/db.json

RUN mkdir -p /data

EXPOSE 3000

CMD ["node", "server.js"]
