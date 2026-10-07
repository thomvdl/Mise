# TODO

Tâches d'installation/outillage en cours — distinct du backlog fonctionnel de l'app, voir
`CONTEXT.md` (section "Ce qui n'existe pas encore") pour ça.

## En cours

- **Terminer la config du tunnel Cloudflare pour `mise-vidal.be`** — étapes A et B de
  `DEPLOY.md` (§4, "Tunnel nommé") faites (domaine ajouté à Cloudflare, nameservers basculés
  chez OVH). Reste : attendre la fin de la propagation DNS, puis étape C (router
  `dashboard.mise-vidal.be` vers le tunnel `mise-dashboard` déjà créé) et étape D (coller le
  token dans `.env`, `docker compose up -d cloudflared-dashboard`).
- **Tester l'imprimante Zebra en profondeur** — avec le nouveau bouton "Paramètres de base"
  (`mise-app`, remplace l'ancien "Recalibrer") et le bouton "Étiquette de mesure" redescendu sur
  sa propre ligne. Vérifier l'impression réelle des étiquettes 57×32mm.
- **Rebuild `mise-app` pour Windows** — les changements du 2026-10-07/08 (bouton "Paramètres de
  base", masquage des consoles subprocess, préférence Chromium pour le mode kiosque) n'ont été
  rebuildés que côté macOS jusqu'ici. `packaging\build_windows.bat` sur une machine Windows avec
  `requirements-windows.txt` installé.
- **Publier une release GitHub `1.2`** avec les deux builds à jour (`Mise.app` déjà rebuildé en
  local le 2026-10-08, + le build Windows ci-dessus) — la release actuelle (`1.1`) est périmée
  par rapport à ces changements, et les boutons de téléchargement de la landing page pointent
  sur la dernière release en date.

## Un jour, peut-être

- **Petite app Angular "Create/Connect Cloudflare Tunnel"** pour automatiser la procédure
  documentée dans `DEPLOY.md` §4 (créer la zone Cloudflare, créer le tunnel nommé, configurer la
  route `dashboard.<domaine>`) via l'API Cloudflare plutôt qu'à la main dans le dashboard web.
  Pas prioritaire pour une installation ponctuelle — à ressortir si plusieurs installations
  clientes s'enchaînent, vu que la partie Cloudflare (zone + tunnel + route) est scriptable mais
  pas le changement de nameservers côté registrar (spécifique à chaque registrar — OVH, Gandi,
  etc.), et que la propagation DNS elle-même ne s'automatise pas.
