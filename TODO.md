# TODO

Tâches d'installation/outillage en cours — distinct du backlog fonctionnel de l'app, voir
`CONTEXT.md` (section "Ce qui n'existe pas encore") pour ça.

## En cours


## Un jour, peut-être

- **Petite app Angular "Create/Connect Cloudflare Tunnel"** pour automatiser la procédure
  documentée dans `DEPLOY.md` §4 (créer la zone Cloudflare, créer le tunnel nommé, configurer la
  route `dashboard.<domaine>`) via l'API Cloudflare plutôt qu'à la main dans le dashboard web.
  Pas prioritaire pour une installation ponctuelle — à ressortir si plusieurs installations
  clientes s'enchaînent, vu que la partie Cloudflare (zone + tunnel + route) est scriptable mais
  pas le changement de nameservers côté registrar (spécifique à chaque registrar — OVH, Gandi,
  etc.), et que la propagation DNS elle-même ne s'automatise pas.
