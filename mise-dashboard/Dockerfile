FROM node:22-alpine AS build
WORKDIR /app

# Dependencies installed from the lockfile before the app code is copied, so this layer only
# rebuilds when package.json/package-lock.json actually change.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npx ng build --configuration production

FROM nginx:alpine
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/mise-dashboard/browser /usr/share/nginx/html

EXPOSE 80
