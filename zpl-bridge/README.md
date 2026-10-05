# Pont ZPL (imprimante Zebra en USB)

`mise-api` parle à l'imprimante en ouvrant un socket TCP brut sur le port **9100** (protocole
JetDirect, voir `mise-api/app/Http/Controllers/PrintedLabelController.php`) — pensé à l'origine
pour une Zebra en réseau. Si l'imprimante est branchée en **USB** sur le mini PC plutôt qu'en
réseau, il faut un petit pont qui écoute sur ce même port 9100 et relaie les octets reçus vers
l'imprimante USB.

La solution dépend de l'OS du mini PC :

| | **Linux** | **Windows** |
|---|---|---|
| Où tourne le pont | Dans un conteneur Docker (`socat`) | Nativement sur la machine, hors Docker |
| Pourquoi | Docker sur Linux peut passer le périphérique USB directement à un conteneur | Docker Desktop sur Windows ne donne pas aux conteneurs un accès direct aux périphériques USB du hôte |
| Adresse à renseigner dans Paramètres → Impression d'étiquettes | `zpl-bridge` (nom du service Docker) | `host.docker.internal` (adresse spéciale résolue par Docker Desktop vers la machine hôte) |
| Fichiers | `docker-compose.linux-usb-printer.yml` (racine du projet) | `zpl_bridge.py` (ce dossier) |

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
   - Démarrer dans : le dossier `zpl-bridge` de ce projet.
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
