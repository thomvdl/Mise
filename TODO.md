# TODO

Tâches d'installation/outillage en cours — distinct du backlog fonctionnel de l'app, voir
`CONTEXT.md` (section "Ce qui n'existe pas encore") pour ça.

## En cours

- **Tester le ticket thermique ESC/POS sur un vrai Epson** (support ajouté le 2026-10-22, jamais
  essayé sur du matériel réel) : appliquer la migration `add_type_to_printers_table` sur
  l'installation en cours, vérifier la détection USB macOS (vendor ID Epson `0x04B8` — à confirmer
  sur le modèle réellement acheté, ex. TM-m30II), l'accent français via la table de caractères
  Windows-1252 (`EscposFicheTechniqueBuilder`), le nombre de caractères par ligne pour la largeur
  de rouleau choisie (58 ou 80mm), et la coupe papier (`GS V 0`, pas testée sur ce modèle). Si le
  ticket est branché en réseau plutôt qu'en USB (mode "Réseau" ajouté le 2026-10-23, voir
  `print_backend_network.py`) : vérifier le port réel utilisé par le modèle (9100 par défaut ici,
  à confirmer) et que le relais fonctionne de bout en bout.

## Un jour, peut-être

- **Petite app Angular "Create/Connect Cloudflare Tunnel"** pour automatiser la procédure
  documentée dans `DEPLOY.md` §4 (créer la zone Cloudflare, créer le tunnel nommé, configurer la
  route `dashboard.<domaine>`) via l'API Cloudflare plutôt qu'à la main dans le dashboard web.
  Pas prioritaire pour une installation ponctuelle — à ressortir si plusieurs installations
  clientes s'enchaînent, vu que la partie Cloudflare (zone + tunnel + route) est scriptable mais
  pas le changement de nameservers côté registrar (spécifique à chaque registrar — OVH, Gandi,
  etc.), et que la propagation DNS elle-même ne s'automatise pas.
