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

## 4. Accès depuis l'extérieur du réseau (tunnel Cloudflare)

Deux conteneurs `cloudflared-dashboard` et `cloudflared-public` (voir `docker-compose.yml`)
ouvrent chacun un tunnel Cloudflare "quick tunnel" vers `dashboard:80` et `public:80` — aucun
compte, aucun domaine, aucune configuration DNS nécessaire. Ils démarrent avec le reste :

```bash
docker compose up -d
```

Récupérez l'URL publique générée (change à chaque redémarrage du conteneur — c'est la limite du
mode "quick tunnel") :

```bash
docker compose logs cloudflared-dashboard | grep trycloudflare.com
docker compose logs cloudflared-public    | grep trycloudflare.com
```

Chacune ressemble à `https://mots-aleatoires.trycloudflare.com`. Collez-la dans le champ du
bouton "Connecter un appareil" de l'app correspondante pour que son QR code pointe vers cette
adresse plutôt que vers l'adresse locale — pratique pour que quelqu'un hors du réseau scanne et
se connecte directement.

**Important — ces URLs sont publiques sur internet.** Le "quick tunnel" ne protège l'accès par
rien d'autre que le login de l'application elle-même. Pour un usage ponctuel/de test, ça suffit.
Pour laisser ça tourner durablement, ajoutez une couche d'authentification devant via [Cloudflare
Access](https://developers.cloudflare.com/cloudflare-one/policies/access/) (gratuit jusqu'à 50
utilisateurs) — ou passez à un tunnel nommé avec un domaine Cloudflare pour une URL fixe plutôt
qu'aléatoire à chaque redémarrage.

## 5. Imprimante d'étiquettes (ZPL)

`mise-api` parle en ZPL brut sur le port 9100 (JetDirect) — ça marche nativement pour une Zebra
en réseau (Ethernet/Wi-Fi) : réglez juste son IP dans le dashboard, Paramètres → Impression
d'étiquettes.

**Si l'imprimante est branchée en USB sur le mini PC** (pas en réseau), voir
[zpl-bridge/README.md](./zpl-bridge/README.md) — sur Windows, Docker Desktop n'a pas d'accès
direct aux périphériques USB du hôte, donc un petit pont tourne nativement hors Docker et relaie
le port 9100 vers l'imprimante. Côté dashboard, l'adresse à renseigner devient alors
`host.docker.internal` au lieu d'une IP.

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
