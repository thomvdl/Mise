# MISE — Procédure de mise en production

Deux variantes selon où vous hébergez le projet. Dans les deux cas, **HTTPS est un prérequis,
pas une option** : l'impression d'étiquettes (Brother QL, WebUSB) et le mode hors-ligne de
`mise-public` (PWA, service worker) ne fonctionnent qu'en contexte sécurisé (HTTPS ou
`localhost`) — en HTTP simple, ces deux fonctionnalités clés seraient silencieusement cassées.

| | **Variante A — VPS** | **Variante B — Serveur local** |
|---|---|---|
| Où | VPS chez un hébergeur (OVH, Hostinger, Scaleway...) | Mini PC en cuisine, sur le wifi de l'hôtel |
| Accessible depuis | N'importe où sur internet | Uniquement le réseau de l'hôtel |
| Validation du certificat HTTPS | HTTP-01 (le serveur doit être joignable sur le port 80) | DNS-01 (le serveur n'a besoin d'être joignable par personne) |
| Fichiers | `docker-compose.prod.yml`, `Caddyfile`, `.env.prod.example` | `docker-compose.local.yml`, `Caddyfile.local-ovh`/`-hostinger`, `caddy/`, `.env.local.example` |
| Identifiants supplémentaires | Aucun | Jeton API chez votre registrar de domaine (OVH ou Hostinger) |

Si vous hésitez encore, partez sur la variante A (VPS) : moins de pièces mobiles, accessible de
partout (utile si un jour vous consultez une fiche depuis chez vous), pas de matériel à
maintenir en cuisine.

---

## Variante A — VPS avec domaine public

### 1. Prérequis

- Un VPS (2 Go de RAM minimum, 4 Go conseillés) avec Docker et le plugin Docker Compose installés.
- Un nom de domaine que vous contrôlez.
- **Trois sous-domaines** pointés vers l'IP du VPS (enregistrements DNS de type A) :
  - `app.votredomaine.fr` → mise-public (l'app de la brigade au quotidien)
  - `admin.votredomaine.fr` → mise-dashboard (réservé au chef/admin)
  - `api.votredomaine.fr` → mise-api

  L'API a besoin de son propre sous-domaine public (pas seulement joignable en interne) : les
  URLs des photos uploadées (fiches techniques, ingrédients) sont générées par Laravel à partir
  d'`APP_URL` et doivent donc être résolvables directement par le navigateur, sinon les images
  du site seraient cassées.

  Les noms exacts n'ont pas d'importance tant qu'ils pointent bien vers le VPS et que vous les
  reportez dans `.env`.

- Ports **80** et **443** ouverts sur le VPS (Let's Encrypt en a besoin pour valider le domaine
  par HTTP-01). Le port 22 (SSH) doit rester ouvert ; aucun autre port n'a besoin de l'être —
  voir §6.

### 2. Premier déploiement

```bash
git clone https://github.com/thomvdl/Mise.git mise
cd mise
cp .env.prod.example .env
```

Éditez `.env` et remplissez **toutes** les valeurs marquées `CHANGEZ_MOI` : les 3 domaines,
`ACME_EMAIL`, des mots de passe forts et distincts pour `DB_PASSWORD`/`DB_ROOT_PASSWORD`/
`ADMIN_PASSWORD` (`openssl rand -base64 24` fait l'affaire), et `APP_URL` (doit correspondre
exactement à `https://` + `MISE_API_DOMAIN`).

Générez ensuite une vraie clé applicative (ne réutilisez jamais celle de dev) :

```bash
docker compose -f docker-compose.prod.yml run --rm api php artisan key:generate --show
```

Collez le résultat dans `APP_KEY=` du `.env`, puis démarrez tout :

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

Caddy va demander ses certificats à Let's Encrypt (quelques secondes à quelques minutes),
l'API va migrer/seeder la base automatiquement. Suivez les logs pendant le démarrage :

```bash
docker compose -f docker-compose.prod.yml logs -f caddy
```

Vous devez voir Caddy obtenir un certificat pour chacun des 3 domaines sans erreur.

### 3. Firewall

```bash
sudo ufw allow 22
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable
```

Passez ensuite directement à la §**Vérifications communes** en bas de ce document.

---

## Variante B — Serveur local (mini PC en cuisine)

Let's Encrypt ne peut valider un domaine par HTTP-01 (comme en variante A) que si le port 80 est
joignable depuis internet — impossible pour un mini PC qui reste sur le réseau de l'hôtel. Cette
variante utilise donc une validation **DNS-01** à la place : Caddy prouve la possession du
domaine via une entrée DNS chez votre registrar, sans jamais avoir besoin d'être joignable de
l'extérieur. Vous gardez un vrai certificat reconnu par les navigateurs (pas d'avertissement de
sécurité, aucune manip sur les tablettes de la cuisine), le domaine pointant simplement vers
l'IP locale du mini PC.

**Limite inhérente à cette variante** : l'app n'est accessible que depuis le réseau de l'hôtel.
Un membre de la brigade qui consulterait une fiche depuis son réseau mobile personnel, hors de
l'hôtel, n'y arriverait pas — c'est le comportement attendu, pas un bug.

### 1. Prérequis

- Un mini PC avec Docker et le plugin Docker Compose installés, branché en Ethernet de
  préférence (plus fiable qu'en wifi pour un serveur).
- **Une IP fixe réservée** pour ce mini PC depuis l'interface d'administration du routeur de
  l'hôtel (réservation DHCP par adresse MAC) — sans ça, l'IP peut changer à un redémarrage et
  casser les enregistrements DNS ci-dessous.
- Un vrai nom de domaine (même hébergé ailleurs, quelques euros par an suffisent) chez **OVH**
  ou **Hostinger** — ce sont les deux seuls registrars pour lesquels ce projet fournit une
  configuration prête à l'emploi (modules Caddy `caddy-dns/ovh` et
  `sbrunk/caddy-dns-hostinger`). Un autre registrar fonctionnerait aussi mais demanderait de
  compiler Caddy avec un autre module DNS (voir `caddy/Dockerfile`).
- **Trois sous-domaines**, comme en variante A, mais pointés vers l'**IP locale** du mini PC
  (ex. `192.168.1.50`) plutôt qu'une IP publique :
  - `app.votredomaine.fr`, `admin.votredomaine.fr`, `api.votredomaine.fr`

  N'importe quel appareil sur le wifi de l'hôtel résout normalement ces domaines via DNS public,
  obtient l'IP locale en retour, et se connecte directement sur le réseau — aucune configuration
  DNS locale supplémentaire n'est nécessaire.

- **Identifiants API chez votre registrar**, selon lequel vous utilisez :
  - **OVH** : créez un jeton sur https://api.ovh.com/createToken/ avec les droits
    GET/PUT/POST/DELETE sur `/domain/zone/*`.
  - **Hostinger** : créez un jeton depuis https://hpanel.hostinger.com/profile/api

- Ports 80/443 utilisés uniquement en interne au réseau de l'hôtel — **ne portez-forwardez rien**
  sur le routeur (ça annulerait tout l'intérêt de ne pas exposer le mini PC).

### 2. Premier déploiement

```bash
git clone https://github.com/thomvdl/Mise.git mise
cd mise
cp .env.local.example .env
```

Choisissez le fichier correspondant à votre registrar et copiez-le en `Caddyfile.local` :

```bash
cp Caddyfile.local-ovh Caddyfile.local        # ou Caddyfile.local-hostinger
```

Éditez `.env` : les 3 domaines, `ACME_EMAIL`, le bloc d'identifiants OVH **ou** Hostinger
(laissez l'autre bloc vide), des mots de passe forts pour `DB_PASSWORD`/`DB_ROOT_PASSWORD`/
`ADMIN_PASSWORD`, et `APP_URL` (`https://` + `MISE_API_DOMAIN`).

Générez une vraie clé applicative :

```bash
docker compose -f docker-compose.local.yml run --rm api php artisan key:generate --show
```

Collez le résultat dans `APP_KEY=`, puis démarrez tout (la première construction de Caddy avec
les modules DNS prend quelques minutes de plus qu'en variante A, le temps de compiler) :

```bash
docker compose -f docker-compose.local.yml up -d --build
```

Suivez les logs pendant le démarrage :

```bash
docker compose -f docker-compose.local.yml logs -f caddy
```

Vous devez voir Caddy créer une entrée DNS TXT temporaire chez votre registrar, obtenir le
certificat, puis la retirer, pour chacun des 3 domaines.

**En cas d'erreur d'authentification OVH/Hostinger** : vérifiez que le jeton n'a pas expiré et
qu'il a bien les droits sur la zone DNS du domaine utilisé. Pour Hostinger spécifiquement, une
erreur liée au TTL est un bug connu du module déjà contourné dans `Caddyfile.local-hostinger`
(`dns_ttl 300s`) — si l'erreur persiste malgré tout, consultez les issues du dépôt
`sbrunk/caddy-dns-hostinger`.

### 3. Alimentation

Un mini PC en cuisine est plus exposé aux coupures de courant qu'un VPS en datacenter
(disjoncteur, coupure générale...). Un onduleur (UPS), même modeste, réduit fortement le risque
de corruption de données lors d'une coupure brutale.

Passez ensuite à la §**Vérifications communes** ci-dessous, en remplaçant partout
`docker-compose.prod.yml` par `docker-compose.local.yml` dans les commandes.

---

## Vérifications communes (après le premier démarrage, les deux variantes)

1. Ouvrez `https://admin.votredomaine.fr` (mise-dashboard) — connectez-vous avec `ADMIN_NAME`/
   `ADMIN_PASSWORD` définis dans `.env`, puis **changez immédiatement le mot de passe** depuis
   la gestion des utilisateurs (ce compte bootstrap ne sera plus jamais recréé automatiquement).
2. Ouvrez `https://app.votredomaine.fr` (mise-public), connectez-vous, vérifiez qu'une fiche
   technique avec photo s'affiche correctement (confirme qu'`APP_URL`/`MISE_API_DOMAIN` sont
   bien configurés).
3. Vérifiez que le cadenas HTTPS est bien présent sur les 3 domaines (certificat valide).
4. Si vous avez une imprimante Brother QL, testez l'impression d'une étiquette depuis
   `mise-public` (page `/etiquettes`) — c'est justement ce que le HTTPS débloque.
5. Rechargez `mise-public` une seconde fois et coupez le réseau du téléphone/tablette : l'app
   doit rester utilisable (service worker actif) — confirme que la PWA fonctionne.

## Sauvegardes

`scripts/backup-db.sh` détecte tout seul la variante en service, dump la base, la compresse, et
supprime les sauvegardes de plus de 30 jours. Installez-le en tâche cron quotidienne :

```bash
crontab -e
```

```
0 3 * * * /chemin/vers/mise/scripts/backup-db.sh >> /chemin/vers/mise/backups/backup.log 2>&1
```

Les dumps atterrissent dans `mise/backups/` (ignoré par git). **Pensez à les copier
régulièrement ailleurs** (rsync vers votre machine, stockage objet type S3/Backblaze...) — une
sauvegarde qui vit sur la même machine que ce qu'elle sauvegarde ne protège de rien en cas de
panne disque, de vol, ou (variante B) de dégât des eaux en cuisine. C'est encore plus vrai en
variante B : pas de VPS avec ses propres garanties derrière.

Restauration à partir d'un dump (adapter le nom du fichier compose à votre variante) :

```bash
gunzip -c backups/mise-backup-2026-XX-XX_XXXX.sql.gz | \
  docker compose -f docker-compose.prod.yml exec -T db mysql -uroot -p"$DB_ROOT_PASSWORD" mise
```

## Mettre à jour (redéploiement)

```bash
cd mise
git pull
docker compose -f docker-compose.prod.yml up -d --build   # ou docker-compose.local.yml
```

Les migrations et le seed du référentiel tournent automatiquement à chaque démarrage du
conteneur `api` (sans danger, idempotent). **Faites une sauvegarde manuelle avant toute mise à
jour qui touche à la base** (nouvelle migration) :

```bash
./scripts/backup-db.sh
```

### Revenir en arrière (rollback)

```bash
git log --oneline
git checkout <commit-precedent>
docker compose -f docker-compose.prod.yml up -d --build   # ou docker-compose.local.yml
```

Si la mise à jour incluait une migration ayant modifié des données, il faut aussi restaurer le
dump SQL fait juste avant — revenir sur le code seul ne défait pas une migration déjà appliquée.

## Dépanner la base ponctuellement (Adminer)

Aucun des deux composes de prod ne démarre Adminer par défaut (surface d'attaque inutile exposée
en permanence). Pour l'utiliser ponctuellement :

- **Variante A (VPS)** : démarrez-le via le compose de dev (qui le publie sur le port 8083) et
  accédez-y par tunnel SSH plutôt que de l'exposer :
  ```bash
  ssh -L 8083:localhost:8083 utilisateur@votre-vps    # depuis votre machine locale
  docker compose up -d adminer                          # sur le VPS
  ```
  Ouvrez ensuite `http://localhost:8083` en local, puis `docker compose stop adminer` après usage.
- **Variante B (local)** : le mini PC n'étant déjà accessible que depuis le réseau de l'hôtel,
  vous pouvez y démarrer Adminer directement (`docker compose up -d adminer`, port 8083) sans
  tunnel — coupez-le tout de même après usage.

## Logs et supervision

```bash
docker compose -f docker-compose.prod.yml logs -f          # tous les services
docker compose -f docker-compose.prod.yml logs -f api      # un seul service
docker compose -f docker-compose.prod.yml ps               # état/santé de chaque service
docker stats                                                 # conso CPU/mémoire en direct
```

(Remplacer `docker-compose.prod.yml` par `docker-compose.local.yml` en variante B.)

Les logs sont bornés (10 Mo × 5 fichiers par service) pour ne pas remplir le disque au fil des
mois.
