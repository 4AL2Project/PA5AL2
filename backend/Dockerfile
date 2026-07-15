FROM node:20-alpine

# OpenSSL est requis par le moteur Prisma.
RUN apk add --no-cache openssl

WORKDIR /app

# On copie uniquement package.json (pas le package-lock.json, périmé car le repo
# est géré par pnpm) : npm résout alors proprement depuis package.json, ce qui
# installe le CLI prisma + @prisma/client. Copier le lockfile npm casse l'install.
COPY package.json ./
RUN npm install

COPY . .

RUN npx prisma generate
RUN npm run build

RUN chmod +x ./docker-entrypoint.sh

EXPOSE 3005

ENTRYPOINT ["./docker-entrypoint.sh"]
