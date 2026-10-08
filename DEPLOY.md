# MISE — Procédure de mise en production

Hébergement **local + tunnel Cloudflare** : l'application tourne sur une seule machine restée
sur le réseau local (mini PC en cuisine, ou n'importe quel poste avec Docker), et l'accès depuis
l'extérieur de ce réseau passe par un tunnel Cloudflare plutôt que par un VPS, un nom de domaine
ou un certificat HTTPS à gérer soi-même.

**HTTPS reste un prérequis** pour deux fonctionnalités clés : l'impression d'étiquettes (Brother
QL, WebUSB) et le mode hors-ligne de `mise-public` (PWA, service worker) ne fonctionnent qu'en
contexte sécurisé (HTTPS ou `localhost`). Sur le réseau local, c'est `localhost`/l'IP locale qui
couvre ce besoin pour un usage sur place ; à distance, c'est Cloudflare qui termine le HTTPS côté
tunnel — dans les deux cas, aucun certificat à obtenir ou renouveler soi-même.

## 1. Prérequis

- Une machine avec Docker et le plugin Docker Compose installés, restée sur le réseau local
  (mini PC en cuisine branché en Ethernet de préférence, ou tout autre poste).
- Aucun nom de domaine, aucun port à ouvrir sur le routeur, aucun compte Cloudflare nécessaire
  pour commencer — le tunnel "quick tunnel" utilisé ici n'en demande pas (voir §4).

## 2. Premier déploiement

```bash
git clone https://github.com/thomvdl/Mise.git mise
cd mise
cp .env.example .env
```

Éditez `.env` : mots de passe forts et distincts pour `DB_PASSWORD`/`DB_ROOT_PASSWORD`, et
`ADMIN_NAME`/`ADMIN_PASSWORD` pour le premier compte administrateur (créé automatiquement au
premier démarrage, jamais recréé après coup — changez son mot de passe depuis le dashboard une
fois connecté).

Générez une vraie clé applicative (ne réutilisez jamais celle fournie par défaut) :

```bash
docker compose run --rm api php artisan key:generate --show
```

Collez le résultat dans `APP_KEY=` du `.env`, puis démarrez tout :

```bash
docker compose up -d --build
```

Les migrations et le seed du référentiel (catégories, stations, allergènes...) tournent
automatiquement à chaque démarrage du conteneur `api` (sans danger, idempotent).

| Service | URL locale |
|---|---|
| API | http://localhost:8000 |
| Dashboard (back-office) | http://localhost:8081 |
| Public (brigade) | http://localhost:8082 |
| Adminer | http://localhost:8083 |

## 3. Accès local (réseau de l'hôtel)

N'importe quel appareil sur le même réseau atteint directement `http://<IP-locale-du-PC>:8081`
(dashboard) ou `:8082` (public) — pas de domaine ni de certificat nécessaire pour un usage sur
place. Chaque app propose un bouton **"Connecter un appareil"** sur son écran d'accueil, qui
affiche un QR code de l'adresse à utiliser (pratique pour un téléphone/tablette en cuisine).
`mise-app` (section "QR codes de connexion" de la fenêtre de statut) propose la même chose en
version imprimée sur étiquette Zebra, détection de l'IP locale automatique.

## 4. Accès depuis l'extérieur du réseau (tunnel Cloudflare — dashboard uniquement)

Un seul conteneur, `cloudflared-dashboard` (voir `docker-compose.yml`), ouvre un tunnel
Cloudflare "quick tunnel" vers `dashboard:80` — aucun compte, aucun domaine, aucune configuration
DNS nécessaire. Il démarre avec le reste :

```bash
docker compose up -d
```

L'app publique (`mise-public`) reste volontairement purement locale, sans tunnel — accessible
uniquement sur le réseau de l'hôtel.

Récupérez l'URL publique générée (change à chaque redémarrage du conteneur — c'est la limite du
mode "quick tunnel") :

```bash
docker compose logs cloudflared-dashboard | grep trycloudflare.com
```

Ça ressemble à `https://mots-aleatoires.trycloudflare.com`. Collez-la dans le champ du bouton
"Connecter un appareil" du dashboard pour que son QR code pointe vers cette adresse plutôt que
vers l'adresse locale — pratique pour que quelqu'un hors du réseau scanne et se connecte
directement.

**Important — cette URL est publique sur internet.** Le "quick tunnel" ne protège l'accès par
rien d'autre que le login de l'application elle-même. Pour un usage ponctuel/de test, ça suffit.
Pour laisser ça tourner durablement, ajoutez une couche d'authentification devant via [Cloudflare
Access](https://developers.cloudflare.com/cloudflare-one/policies/access/) (gratuit jusqu'à 50
utilisateurs) — ou passez à un tunnel nommé ci-dessous pour une URL fixe.

### Tunnel nommé (URL fixe, pour une installation durable)

Le "quick tunnel" change d'adresse à chaque redémarrage du conteneur — pas pratique à mettre en
favori ou à communiquer. Un tunnel nommé donne une URL stable (ex. `dashboard.mondomaine.be`) qui
ne bouge plus. Nécessite un compte Cloudflare (gratuit) et un nom de domaine (le vôtre, chez
n'importe quel registrar — OVH dans les captures ci-dessous — pas besoin de l'acheter chez
Cloudflare). Procédure vérifiée pas à pas sur l'interface Cloudflare/OVH d'octobre 2026 — les
libellés de menu changent parfois d'une année à l'autre, mais l'enchaînement reste le même.

**A. Ajouter le domaine à Cloudflare**

1. [dash.cloudflare.com](https://dash.cloudflare.com/) → se connecter.
2. Menu de gauche → **Domains** → **Add a domain** → saisir le domaine (ex. `mise-vidal.be`) →
   plan **Free**.
   - Si un message "TLD is not supported... cannot be registered" apparaît : c'est l'écran de
     *transfert d'enregistrement* du domaine, pas celui qu'il faut. On garde le domaine chez son
     registrar actuel (OVH) — on ne fait ici que déléguer le DNS à Cloudflare, jamais le
     transférer. Revenir à **Domains → Add a domain** et vérifier qu'aucune option de transfert
     n'a été cochée.
3. Cloudflare affiche 2 serveurs de noms à renseigner chez le registrar (ex.
   `davina.ns.cloudflare.com` / `morgan.ns.cloudflare.com` — ces noms sont propres à chaque
   domaine, à copier depuis l'écran, pas à réutiliser tels quels). Le domaine reste sur la page
   **Overview** du domaine avec le statut "Waiting for your registrar to propagate your new
   nameservers" tant que l'étape B n'est pas faite.

**B. Basculer les serveurs DNS chez le registrar (exemple OVH)**

1. [manager.ovhcloud.com](https://manager.ovhcloud.com) → se connecter.
2. Menu de gauche → **Noms de domaine** → cliquer sur le domaine concerné.
3. Onglet **Serveurs DNS** → bouton **Modifier les DNS**.
4. Choisir **Utiliser mes propres DNS**.
5. Dans le champ "Serveur DNS", saisir le premier nameserver Cloudflare (ex.
   `davina.ns.cloudflare.com`) → **Ajouter**. Répéter pour le second (ex.
   `morgan.ns.cloudflare.com`). Laisser le champ "IP associée" vide (pas nécessaire pour des
   nameservers hors du domaine lui-même).
6. **Appliquer la configuration** → vérifier les 2 valeurs dans la pop-up de confirmation →
   **Appliquer la configuration**.
7. Statut "En cours d'activation" côté OVH, puis propagation généralement en 1-2h (jusqu'à 24h).
   Cloudflare envoie un e-mail une fois le domaine actif.

**C. Créer le tunnel et le router vers le dashboard**

À faire une fois le domaine actif côté Cloudflare (étape B terminée) :

1. Dashboard Cloudflare → menu de gauche → **Zero Trust** (s'affiche sous le nom **Cloudflare
   One** une fois dedans).
2. Menu de gauche → **Networks → Tunnels & Mesh** → **Create a tunnel**.
3. Type de tunnel : **Cloudflared** → **Select Cloudflared**.
4. Nommer le tunnel (ex. `mise-dashboard`) → **Save tunnel**.
5. Écran "Install and run a connector" : un menu déroulant OS propose une commande d'installation
   contenant `cloudflared tunnel run --token <long token>`. Ce token est le même quel que soit
   l'OS choisi dans le menu — copier uniquement la valeur après `--token` (bouton de copie à côté
   de la commande "OR run the tunnel manually in your current terminal session only"). **Ce
   token donne un accès complet au tunnel : à traiter comme un mot de passe**, ne pas le coller
   en clair dans un chat ou un ticket.
6. **Next** → onglet **Published applications** (sélectionné par défaut) → section Hostname :
   - **Subdomain** : `dashboard`
   - **Domain** : sélectionner le domaine (n'apparaît dans la liste que si l'étape B a fini de
     propager — "No valid options" sinon, revenir plus tard)
   - **Service → Type** : `HTTP`
   - **Service → URL** : `dashboard:80` (le nom du service Docker, pas une IP — le conteneur
     `cloudflared-dashboard` est sur le même réseau Compose que `dashboard`)
7. **Complete setup**.

**D. Brancher le token sur le projet**

1. Dans `.env` du mini PC (copié depuis `.env.example`) :
   ```
   CLOUDFLARE_TUNNEL_ARGS=run --token <le token copié à l'étape C.5>
   CLOUDFLARE_DASHBOARD_URL=https://dashboard.<votredomaine>
   ```
   La deuxième ligne n'est pas utilisée par le tunnel lui-même — elle permet à `mise-app` (bouton
   "QR codes de connexion" → "Dashboard (tunnel)") d'imprimer une étiquette QR vers cette adresse
   plutôt que l'IP locale.
2. Relancer le conteneur pour prendre en compte le changement :
   ```bash
   docker compose up -d cloudflared-dashboard
   ```

Le dashboard est alors joignable en permanence sur `dashboard.<votredomaine>`, sans jamais changer
au redémarrage. Les logs (`docker compose logs cloudflared-dashboard`) ne donnent plus d'URL
`trycloudflare.com` à récupérer — c'est normal, elle est maintenant fixée côté Cloudflare.

## 5. Imprimante d'étiquettes (ZPL)

`mise-api` parle en ZPL brut sur le port 9100 (JetDirect) — ça marche nativement pour une Zebra
en réseau (Ethernet/Wi-Fi) : réglez juste son IP dans le dashboard, Paramètres → Impression
d'étiquettes.

**Si l'imprimante est branchée en USB sur le mini PC** (pas en réseau), voir
[mise-app/README.md](./mise-app/README.md) pour la procédure complète — ça diffère selon
l'OS du mini PC :
- **Linux** : un conteneur `socat` suffit (`docker-compose.linux-usb-printer.yml`), Docker y
  accède directement au périphérique USB. Adresse à renseigner : `zpl-bridge`.
- **Windows** : Docker Desktop n'a pas d'accès direct aux périphériques USB du hôte, donc un
  petit pont (`mise-app/zpl_bridge.py`) tourne nativement hors Docker. Adresse à renseigner :
  `host.docker.internal`.

## 6. Alimentation

Un mini PC en cuisine est plus exposé aux coupures de courant qu'un serveur en datacenter
(disjoncteur, coupure générale...). Un onduleur (UPS), même modeste, réduit fortement le risque
de corruption de données lors d'une coupure brutale.

## 7. Sauvegardes

Automatiques : le conteneur `db-backup` (maison, voir `backup/`) fait un `mysqldump` quotidien
(3h du matin, plus une sauvegarde immédiate à chaque démarrage), compressé, avec rotation sur les
14 dernières sauvegardes — rien à installer, rien à planifier soi-même. Les dumps vivent dans le
volume Docker `mise_db_backups`.

Lister les sauvegardes disponibles :

```bash
docker compose exec db-backup ls -la /backup
```

**Pensez à copier ces dumps régulièrement ailleurs** (le volume vit sur la même machine que ce
qu'il sauvegarde — aucune protection en cas de panne disque, de vol, ou de dégât des eaux en
cuisine) :

```bash
docker compose cp db-backup:/backup/latest.sql.gz ./mise-backup-$(date +%Y-%m-%d).sql.gz
```

Restauration à partir d'un dump :

```bash
gunzip -c mise-backup-2026-XX-XX.sql.gz | \
  docker compose exec -T db mysql -uroot -p"$DB_ROOT_PASSWORD" mise
```

## 8. Mettre à jour (redéploiement)

```bash
cd mise
git pull
docker compose up -d --build
```

Les migrations et le seed tournent automatiquement au redémarrage du conteneur `api`. **Faites
une sauvegarde manuelle avant toute mise à jour qui touche à la base** (nouvelle migration) :

```bash
docker compose cp db-backup:/backup/latest.sql.gz ./avant-maj-$(date +%Y-%m-%d).sql.gz
```

### Revenir en arrière (rollback)

```bash
git log --oneline
git checkout <commit-precedent>
docker compose up -d --build
```

Si la mise à jour incluait une migration ayant modifié des données, il faut aussi restaurer le
dump SQL fait juste avant — revenir sur le code seul ne défait pas une migration déjà appliquée.

## 9. Logs et supervision

```bash
docker compose logs -f              # tous les services
docker compose logs -f api          # un seul service
docker compose ps                   # état/santé de chaque service
docker stats                        # conso CPU/mémoire en direct
```

Les logs applicatifs sont bornés (10 Mo × 5 fichiers par service) pour ne pas remplir le disque
au fil des mois.
