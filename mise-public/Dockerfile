FROM node:22-alpine AS build
WORKDIR /app

# Dependencies installed from the lockfile before the app code is copied, so this layer only
# rebuilds when package.json/package-lock.json actually change.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npx ng build --configuration production

FROM nginx:alpine
# `.template` dans /etc/nginx/templates/ : l'image nginx officielle le passe par `envsubst` au
# démarrage du conteneur (substituant ${API_UPSTREAM} ci-dessous) avant de l'écrire dans conf.d —
# aucun rebuild d'image nécessaire pour changer la cible du proxy /api, juste la variable d'env.
# Défaut `api:80` : le service `api` du docker-compose complet, comportement inchangé si rien
# n'est fourni (voir docker-compose.public.yml pour le cas d'un poste public seul).
ENV API_UPSTREAM=api:80
COPY docker/nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist/mise-public/browser /usr/share/nginx/html

EXPOSE 80
