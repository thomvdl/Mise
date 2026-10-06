# Mise App (pont ZPL + installation/mise à jour du projet)

`mise-api` parle à l'imprimante en ouvrant un socket TCP brut sur le port **9100** (protocole
JetDirect, voir `mise-api/app/Http/Controllers/PrintedLabelController.php`) — pensé à l'origine
pour une Zebra en réseau. Si l'imprimante est branchée en **USB** sur le mini PC plutôt qu'en
réseau, il faut un petit pont qui écoute sur ce même port 9100 et relaie les octets reçus vers
l'imprimante USB.

La solution dépend de l'OS du mini PC :

| | **Linux** | **Windows** | **macOS** |
|---|---|---|---|
| Où tourne le pont | Dans un conteneur Docker (`socat`) | Nativement sur la machine, hors Docker | Nativement sur la machine, hors Docker |
| Pourquoi | Docker sur Linux peut passer le périphérique USB directement à un conteneur | Docker Desktop sur Windows ne donne pas aux conteneurs un accès direct aux périphériques USB du hôte | Même limitation que Windows — Docker Desktop sur macOS non plus |
| Adresse à renseigner dans Paramètres → Impression d'étiquettes | `zpl-bridge` (nom du service Docker) | `host.docker.internal` (adresse spéciale résolue par Docker Desktop vers la machine hôte) | `host.docker.internal` (idem, Docker Desktop le résout aussi sur macOS) |
| Fichiers | `docker-compose.linux-usb-printer.yml` (racine du projet) | `app/` empaqueté en `.exe` (voir ci-dessous) | `app/` empaqueté en `.app` (voir ci-dessous) |

## Windows et macOS : l'appli de barre système (`app/`)

Sur Windows et macOS, le pont tourne désormais sous la forme d'une petite appli native avec icône
de barre système (barre des tâches / barre de menus), empaquetée via PyInstaller en `.exe`/`.app`
autonome — pas besoin d'installer Python ni de dépendance sur la machine cible. Elle fait tout ce
que faisaient les anciens scripts (`zpl_bridge.py` / `zpl_bridge_macos.py`, conservés dans ce
dossier pour un usage manuel/dépannage en ligne de commande), plus :

- une fenêtre de statut (clic sur l'icône → **Ouvrir**) qui montre si l'imprimante est détectée,
  le journal des dernières impressions/erreurs, et un bouton pour imprimer une étiquette de test ;
- sur Windows, le choix de l'imprimante installée directement depuis cette fenêtre (persisté dans
  un fichier de config — plus besoin de passer le nom en argument de script) ;
- une case "Lancer au démarrage" qui gère l'auto-démarrage elle-même (agent `launchd` côté macOS,
  raccourci dans le dossier Démarrage côté Windows) — plus besoin de suivre les étapes manuelles
  des sections "Démarrage automatique" ci-dessous, qui restent documentées seulement pour les
  anciens scripts/le dépannage ;
- une section **"Projet Mise"** dans cette même fenêtre qui gère aussi le cycle de vie du projet
  entier (pas juste le pont ZPL), pour que le mini PC n'ait qu'une seule app à lancer :
  - **Installer** (visible si le dossier choisi n'est pas encore un clone du projet) : clone le
    repo, crée `.env` à partir de `.env.example` avec des secrets générés automatiquement (sauf
    nom/mot de passe admin, demandés dans une boîte de dialogue), puis `docker compose up -d
    --build`. Si le dépôt GitHub est privé, un jeton d'accès personnel est demandé une seule fois
    et enregistré dans le gestionnaire d'identifiants du système (jamais dans la config de l'app
    ni dans l'URL du remote) ;
  - **Mettre à jour** (visible une fois installé) : sauvegarde la base (reproduit la procédure de
    la section 7 ci-dessous), puis `git pull` + `docker compose up -d --build` — jamais automatique
    ni silencieux, uniquement sur ce clic, précisément pour garder la main en cas d'échec d'une
    migration (voir DEPLOY.md §8) ;
  - **Sauvegarder** : lance un dump manuel à la demande (même procédure que la sauvegarde
    automatique quotidienne, voir section 7 ci-dessous), utile avant une manipulation risquée sans
    attendre le prochain passage planifié ;
  - **Restaurer…** : choisit un fichier `.sql.gz` via une boîte de dialogue classique (par défaut
    dans le dossier du projet, où vivent les sauvegardes), demande confirmation (ça écrase la base
    actuelle), puis prend automatiquement une sauvegarde de sécurité de l'état courant avant de
    restaurer — pour qu'une restauration par erreur reste rattrapable ;
  - au démarrage de l'app, si le projet est déjà installé, elle lance aussi `docker compose up -d`
    (sans rebuild, juste pour s'assurer que tout tourne) — en plus du pont ZPL lui-même.
  - Les deux opérations tournent en tâche de fond et journalisent leur progression dans "Activité
    récente" (peuvent prendre plusieurs minutes, surtout la toute première installation).

### Déployer un nouveau mini PC avec l'app (clone + installation + mises à jour)

C'est le chemin pensé pour le mini PC de production : une seule app à copier, qui gère ensuite
tout le cycle de vie du projet (plus besoin de suivre `DEPLOY.md` à la main pas à pas).

**Prérequis à installer soi-même avant, une seule fois** (l'app ne les installe jamais
silencieusement — trop risqué sans contrôle) :
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) ;
- [Git](https://git-scm.com/downloads) (Git for Windows sur Windows).

L'app détecte leur absence et affiche un message clair plutôt que d'échouer silencieusement.

**Étapes :**

1. Récupérez `Mise.exe`/`Mise.app` (voir "Construire l'appli" ci-dessous pour le construire
   vous-même, ou copiez un exécutable déjà construit par ailleurs — clé USB, partage réseau...) et
   lancez-le. Une icône apparaît dans la barre système.
2. Cliquez sur l'icône → **Ouvrir**, puis dans la section **"Projet Mise"** :
   - **Dossier…** pour choisir où installer le projet (par défaut `~/Mise`) ;
   - **Installer** : clone le dépôt, crée `.env` avec des mots de passe générés automatiquement
     (seuls le nom et le mot de passe du compte admin sont demandés, dans deux boîtes de
     dialogue), puis lance `docker compose up -d --build`. Peut prendre plusieurs minutes la
     première fois (téléchargement/construction des images) — la progression s'affiche dans
     "Activité récente".
   - Si le dépôt GitHub est privé, un jeton d'accès personnel GitHub est demandé une seule fois
     (voir la note plus bas) et enregistré dans le gestionnaire d'identifiants du système — jamais
     dans la config de l'app.
3. Une fois terminé : le dashboard tourne sur `http://localhost:8081` (voir `DEPLOY.md` pour
   l'accès réseau local/tunnel Cloudflare), et le pont ZPL est actif en parallèle dans la même
   app si l'imprimante est branchée en USB (voir ci-dessous pour la configurer côté dashboard).
4. À chaque démarrage de l'app par la suite, elle relance `docker compose up -d` (sans rebuild)
   pour s'assurer que tout tourne — pas besoin de retaper de commande Docker au quotidien.
5. Pour une mise à jour future : bouton **Mettre à jour** dans la même section — sauvegarde la
   base automatiquement (même procédure que `DEPLOY.md` §7), puis `git pull` + rebuild. Ce n'est
   **jamais automatique ni silencieux** : uniquement sur ce clic, pour garder la main en cas
   d'échec d'une migration sans personne sur place pour intervenir (voir `DEPLOY.md` §8).

Toutes ces opérations tournent en tâche de fond ; la fenêtre de statut peut être fermée et
rouverte pendant qu'une installation/mise à jour est en cours, le journal "Activité récente"
reprend où elle en est.

### Construire l'appli

Sur chaque OS cible, dans un venv avec les dépendances installées :

```bash
# macOS (nécessite `brew install libusb` au préalable — voir section macOS ci-dessous)
pip install -r requirements-macos.txt
./packaging/build_macos.sh
# -> dist/macos/Mise.app
```

```powershell
# Windows
pip install -r requirements-windows.txt
packaging\build_windows.bat
# -> dist\windows\Mise.exe
```

Le `.app`/`.exe` obtenu est autonome (Python et toutes les dépendances, y compris `libusb` côté
macOS, sont embarqués) — copiez-le simplement sur le mini PC cible et lancez-le. Pas besoin d'y
installer Python, Homebrew ou pip.

### Dépannage de l'appli empaquetée

- **L'icône n'apparaît pas** : l'app a peut-être échoué au lancement — relancez-la depuis un
  Terminal/une invite de commandes (`./dist/macos/Mise.app/Contents/MacOS/Mise`
  ou l'équivalent `.exe`) pour voir une éventuelle erreur affichée.
- **macOS refuse de lancer l'app** (non signée) : clic droit → Ouvrir, puis confirmer dans la
  boîte de dialogue Gatekeeper (une seule fois).
- Pour le reste (imprimante introuvable, étiquette mal formatée…), voir les sections de
  dépannage par OS ci-dessous — les causes sont les mêmes, seule l'interface pour les constater
  change (fenêtre de statut au lieu des logs de script/`netstat`/`lsof`).

## Linux

Un simple conteneur `socat` suffit — pas de script à écrire, pas de service natif à installer.

1. Branchez l'imprimante, puis vérifiez le périphérique détecté :

   ```bash
   ls -la /dev/usb/
   ```

   C'est généralement `/dev/usb/lp0` pour la première imprimante USB détectée (module noyau
   `usblp`, chargé automatiquement sur la plupart des distributions). Si rien n'apparaît,
   vérifiez `lsusb` (l'imprimante est-elle détectée au niveau USB ?) et qu'aucun service CUPS
   local n'a déjà capté le périphérique en exclusivité.

2. Si le chemin diffère de `/dev/usb/lp0`, ajustez-le dans
   `docker-compose.linux-usb-printer.yml` (racine du projet, section `devices:`).

3. Démarrez la stack avec ce fichier en plus du compose principal :

   ```bash
   docker compose -f docker-compose.yml -f docker-compose.linux-usb-printer.yml up -d --build
   ```

4. Dans le dashboard, Paramètres → Impression d'étiquettes, réglez l'adresse de l'imprimante sur
   `zpl-bridge` (le nom du service — joignable directement par les autres conteneurs sur le
   réseau compose, même principe que `db` pour MySQL). Imprimez une étiquette de test depuis la
   page Étiquettes.

**Dépannage** : `docker compose logs zpl-bridge` doit montrer `socat` en écoute, sans erreur de
permission sur le périphérique. Une erreur de permission signifie généralement que le conteneur
n'a pas pu ouvrir `/dev/usb/lp0` — vérifiez que le chemin dans `devices:` correspond exactement à
celui vu par `ls -la /dev/usb/` sur l'hôte.

## Windows

Docker Desktop sur Windows ne peut pas passer le périphérique USB à un conteneur — le pont tourne
donc en natif, hors Docker, via `zpl_bridge.py` (ce dossier) : un script Python qui écoute sur le
port 9100 et relaie les octets reçus vers l'imprimante installée, via l'API d'impression RAW de
Windows (contourne toute réinterprétation par le pilote).

### Installation

1. Installez l'imprimante dans Windows (Paramètres → Imprimantes). Pour que l'impression RAW
   passe sans y toucher, le pilote **"Generic / Text Only"** est recommandé plutôt que le pilote
   ZDesigner propre à la Zebra (certains pilotes ZDesigner réinterprètent les données même en
   RAW) — mais testez d'abord avec le pilote que vous avez déjà, ça fonctionne aussi dans la
   plupart des cas.

2. Installez Python 3 (depuis python.org) puis pywin32 :

   ```powershell
   pip install pywin32
   ```

3. Testez en lançant le pont manuellement (remplacez par le nom exact de l'imprimante, visible
   dans Windows → Imprimantes) :

   ```powershell
   python zpl_bridge.py "Nom exact de l'imprimante"
   ```

4. Dans le dashboard MISE, Paramètres → Impression d'étiquettes, réglez l'adresse de
   l'imprimante sur :

   ```
   host.docker.internal
   ```

   Imprimez une étiquette de test depuis la page Étiquettes — elle doit sortir sur l'imprimante
   USB.

### Démarrage automatique

Deux façons de faire, selon si le mini PC reste connecté sur une session Windows en permanence
ou doit pouvoir démarrer le pont même sans personne connecté.

#### Option A — dossier Démarrage (simple, demande qu'une session soit ouverte)

1. Ouvrez `start-zpl-bridge.bat` (ce dossier) dans un éditeur de texte (clic droit → Modifier) et
   remplacez `Nom exact de l'imprimante` par le nom réel, visible dans Windows → Imprimantes.
   Enregistrez.
2. Testez-le d'abord en double-cliquant dessus — il doit se lancer sans erreur (pas de fenêtre
   qui s'ouvre, c'est normal avec `pythonw`).
3. Pour qu'il se lance tout seul à chaque ouverture de session : touche **Windows + R**, tapez
   `shell:startup`, Entrée — ça ouvre le dossier Démarrage. Faites un clic droit sur
   `start-zpl-bridge.bat` → **Créer un raccourci**, puis glissez ce raccourci dans le dossier
   Démarrage qui vient de s'ouvrir.
4. Redémarrez le PC (ou déconnectez/reconnectez la session) pour vérifier que le pont démarre
   bien tout seul — testez une impression depuis la page Étiquettes.

#### Option B — tâche planifiée (survit sans session ouverte)

Pour que le pont tourne même si personne n'est connecté sur Windows (redémarrage automatique
après coupure de courant, par exemple) :

1. Planificateur de tâches → Créer une tâche.
2. Déclencheur : **Au démarrage de l'ordinateur**.
3. Action : démarrer un programme —
   - Programme : `pythonw.exe` (le chemin exact dépend de l'installation Python ; `pythonw` plutôt
     que `python` pour ne pas garder une fenêtre de console ouverte)
   - Arguments : `zpl_bridge.py "Nom exact de l'imprimante"`
   - Démarrer dans : le dossier `mise-app` de ce projet.
4. Dans l'onglet Général : cochez **"Exécuter que l'utilisateur soit connecté ou non"**.

### Dépannage

- **Rien ne s'imprime** : vérifiez que le pont tourne (`netstat -ano | findstr :9100` doit montrer
  un port en écoute), et que `printer_ip` dans Paramètres vaut bien `host.docker.internal`.
- **L'étiquette sort mal formatée** (texte brut au lieu du design attendu) : le pilote installé
  réinterprète probablement les données malgré le datatype RAW — repassez sur "Generic / Text
  Only".
- **Erreur d'accès à l'imprimante** dans la console du pont : le nom passé en argument ne
  correspond pas exactement au nom affiché dans Windows → Imprimantes (sensible à la casse et aux
  espaces) — copiez-le tel quel.

## macOS

Comme sur Windows, le pont tourne en natif hors Docker — mais la méthode diffère : macOS a retiré
le support des files d'attente CUPS "brutes" (`lpadmin -m raw` échoue avec "les files d'attente
brutes ne sont plus prises en charge sur macOS"), donc pas d'impression RAW possible via le
spouleur système comme sur Windows. `zpl_bridge_macos.py` (ce dossier) parle directement au
périphérique USB via la librairie `pyusb`, en contournant CUPS entièrement.

### Installation

1. Installez Homebrew si ce n'est pas déjà fait (<https://brew.sh>), puis `libusb` :

   ```bash
   brew install libusb
   ```

2. Installez `pyusb` (Python 3 est déjà installé sur macOS) :

   ```bash
   pip3 install pyusb
   ```

3. Branchez l'imprimante en USB, puis lancez le pont :

   ```bash
   cd mise-app
   python3 zpl_bridge_macos.py
   ```

   Il doit afficher `Pont ZPL (macOS/USB direct) en écoute sur le port 9100` et rester ouvert
   (c'est normal, c'est un serveur — laissez le terminal ouvert, ou passez à l'option de démarrage
   automatique ci-dessous). Le script détecte l'imprimante Zebra automatiquement sur l'USB (pas
   besoin de passer son nom en argument, contrairement à Windows).

4. Dans le dashboard MISE, Paramètres → Impression d'étiquettes, réglez l'adresse de l'imprimante
   sur `host.docker.internal`. Imprimez une étiquette de test depuis la page Étiquettes — elle
   doit sortir sur l'imprimante USB.

### Démarrage automatique (survit sans session ouverte)

Pour que le pont tourne en tâche de fond et redémarre tout seul (y compris après un redémarrage de
la machine), utilisez `launchd` plutôt qu'un simple lancement manuel :

1. Repérez le chemin absolu de `python3` (`which python3`) et de ce dossier `mise-app`.
2. Créez `~/Library/LaunchAgents/com.mise.zpl-bridge.plist` avec ce contenu, en remplaçant les
   deux chemins par les vôtres :

   ```xml
   <?xml version="1.0" encoding="UTF-8"?>
   <!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
   <plist version="1.0">
   <dict>
     <key>Label</key><string>com.mise.zpl-bridge</string>
     <key>ProgramArguments</key>
     <array>
       <string>/usr/bin/python3</string>
       <string>/chemin/absolu/vers/mise-app/zpl_bridge_macos.py</string>
     </array>
     <key>RunAtLoad</key><true/>
     <key>KeepAlive</key><true/>
   </dict>
   </plist>
   ```

3. Chargez-le :

   ```bash
   launchctl load ~/Library/LaunchAgents/com.mise.zpl-bridge.plist
   ```

   Le pont démarre immédiatement, et à chaque ouverture de session désormais. `KeepAlive` le
   relance automatiquement s'il plante.

### Dépannage

- **Rien ne s'imprime** : vérifiez que le pont tourne (`lsof -i :9100` doit montrer un port en
  écoute), et que `printer_ip` dans Paramètres vaut bien `host.docker.internal`.
- **`Access denied (insufficient permissions)`** dans la console du pont : une autre
  instance/script a encore l'interface USB ouverte (le pont la relâche après chaque impression via
  `usb.util.dispose_resources`, mais un script de test lancé en parallèle peut la bloquer) — fermez
  tout autre script qui parle à l'imprimante et relancez le pont.
- **Aucune imprimante Zebra trouvée sur l'USB** : vérifiez que l'imprimante est bien branchée et
  allumée (`system_profiler SPUSBDataType | grep -i zebra` doit la lister).
