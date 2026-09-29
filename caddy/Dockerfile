# Image Caddy avec les modules DNS OVH et Hostinger compilés — nécessaires pour valider le
# certificat HTTPS par DNS-01 plutôt que par HTTP-01, seule méthode possible quand le serveur
# n'est pas joignable depuis internet (variante "serveur local", voir DEPLOY.md). L'image
# officielle caddy:2-alpine ne les inclut pas par défaut, il faut les compiler avec xcaddy.
#
# Sources :
#   https://github.com/caddy-dns/ovh
#   https://github.com/sbrunk/caddy-dns-hostinger
FROM caddy:2-builder-alpine AS builder

RUN xcaddy build \
    --with github.com/caddy-dns/ovh \
    --with github.com/sbrunk/caddy-dns-hostinger

FROM caddy:2-alpine
COPY --from=builder /usr/bin/caddy /usr/bin/caddy
