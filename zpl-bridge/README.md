# Pont ZPL (imprimante Zebra en USB sur Windows)

`mise-api` parle à l'imprimante en ouvrant un socket TCP brut sur le port **9100** (protocole
JetDirect, voir `mise-api/app/Http/Controllers/PrintedLabelController.php`) — pensé à l'origine
pour une Zebra en réseau. Si l'imprimante est branchée en **USB** sur le mini PC plutôt qu'en
réseau, il faut un petit pont qui écoute sur ce même port 9100 et relaie les octets reçus vers
l'imprimante USB. `zpl_bridge.py`, dans ce dossier, fait exactement ça.

## Pourquoi pas un conteneur Docker ?

C'était la première idée (un conteneur avec le périphérique USB passé en `devices:`), mais
**Docker Desktop sur Windows ne donne pas aux conteneurs un accès direct aux périphériques USB du
hôte** — contrairement à Docker sur Linux, où ça aurait fonctionné nativement. Le pont tourne donc
en **natif sur Windows**, en dehors de Docker, et `mise-api` (dans ses conteneurs) le joint via
`host.docker.internal` — l'adresse spéciale que Docker Desktop résout automatiquement vers la
machine hôte.

## Installation

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

## Démarrage automatique

Pour que le pont tourne en permanence, y compris après un redémarrage et sans session utilisateur
ouverte, créez une tâche planifiée Windows :

1. Planificateur de tâches → Créer une tâche.
2. Déclencheur : **Au démarrage de l'ordinateur**.
3. Action : démarrer un programme —
   - Programme : `pythonw.exe` (le chemin exact dépend de l'installation Python ; `pythonw` plutôt
     que `python` pour ne pas garder une fenêtre de console ouverte)
   - Arguments : `zpl_bridge.py "Nom exact de l'imprimante"`
   - Démarrer dans : le dossier `zpl-bridge` de ce projet.
4. Dans l'onglet Général : cochez **"Exécuter que l'utilisateur soit connecté ou non"**.

## Dépannage

- **Rien ne s'imprime** : vérifiez que le pont tourne (`netstat -ano | findstr :9100` doit montrer
  un port en écoute), et que `printer_ip` dans Paramètres vaut bien `host.docker.internal`.
- **L'étiquette sort mal formatée** (texte brut au lieu du design attendu) : le pilote installé
  réinterprète probablement les données malgré le datatype RAW — repassez sur "Generic / Text
  Only".
- **Erreur d'accès à l'imprimante** dans la console du pont : le nom passé en argument ne
  correspond pas exactement au nom affiché dans Windows → Imprimantes (sensible à la casse et aux
  espaces) — copiez-le tel quel.
