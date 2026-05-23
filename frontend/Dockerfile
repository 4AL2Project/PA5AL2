FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Les variables NEXT_PUBLIC_* sont injectées dans le bundle au build.
ARG NEXT_PUBLIC_API_URL=http://localhost:3005
ARG NEXT_PUBLIC_PHARMACY_ID=3c865b32-ba84-483d-8256-2b1d7d5e542e
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_PHARMACY_ID=$NEXT_PUBLIC_PHARMACY_ID

RUN npm run build

EXPOSE 3000

CMD ["npm", "run", "start"]
