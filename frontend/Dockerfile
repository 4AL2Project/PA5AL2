FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Les variables NEXT_PUBLIC_* sont injectées dans le bundle au build.
ARG NEXT_PUBLIC_API_URL=http://localhost:3005
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

RUN npm run build

EXPOSE 3000

CMD ["npm", "run", "start"]
