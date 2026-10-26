"""Cycle de vie du projet Mise lui-même (cloner, démarrer/mettre à jour la pile Docker) — ce que
fait l'app en plus du pont ZPL proprement dit, pour que le mini PC n'ait qu'une seule icône à
lancer plutôt que de suivre les étapes manuelles de DEPLOY.md à chaque fois.

Toutes les opérations ici peuvent prendre plusieurs minutes (build Docker, clone) — elles sont
pensées pour tourner dans un thread à part (voir status_window.py), donc `log` ne doit jamais être
une méthode Tkinter : seul `events.EventLog.add` (thread-safe, pas de widget) est fait pour ça.
"""

import datetime
import json
import os
import re
import secrets
import subprocess
import sys
import urllib.error
import urllib.request
from pathlib import Path
from typing import Callable, Optional
from urllib.parse import urlparse

# Les deux modes gèrent le MÊME clone (le repo est un monorepo qui contient toujours les deux
# docker-compose.yml) — seule la commande `docker compose` effectivement lancée change. "server" :
# pile complète (db/api/dashboard/public/...), ce poste héberge tout. "public" : juste mise-public,
# qui parle à l'API d'un serveur "server" déjà déployé ailleurs (voir docker-compose.public.yml et
# .env.public.example à la racine du repo).
_PUBLIC_COMPOSE_FILE = "docker-compose.public.yml"
_PUBLIC_ENV_FILE = ".env.public"

REPO_URL = "https://github.com/thomvdl/Mise.git"
# "thomvdl/Mise" dérivé de REPO_URL plutôt que redupliqué en dur — sert à l'appel à l'API GitHub
# ci-dessous (releases), pas au clone/pull lui-même (qui continue d'utiliser REPO_URL tel quel).
_REPO_SLUG = urlparse(REPO_URL).path.strip("/").removesuffix(".git")
_GITHUB_API_LATEST_RELEASE = f"https://api.github.com/repos/{_REPO_SLUG}/releases/latest"
LogFn = Callable[[str], None]
# Build Docker compris : peut être long au premier lancement (images à télécharger/construire).
_TIMEOUT_SECONDS = 1800

# Une app macOS lancée en GUI (double-clic/Finder/`open`, pas depuis un terminal) hérite d'un
# PATH minimal (/usr/bin:/bin:/usr/sbin:/sbin) — PAS du PATH enrichi par .zshrc/.bash_profile.
# Docker Desktop et Git s'installent typiquement hors de ce PATH minimal, donc sans ça l'app
# affiche "Docker n'est pas installé" même quand Docker Desktop tourne parfaitement (vu en
# conditions réelles : l'app elle-même le trouvait en dev via un shell, mais pas une fois
# empaquetée et lancée normalement).
_MACOS_EXTRA_PATH_DIRS = [
    "/usr/local/bin",  # Docker Desktop (CLI symlinks), Git installé manuellement
    "/opt/homebrew/bin",  # Homebrew sur Apple Silicon
    "/Applications/Docker.app/Contents/Resources/bin",  # Docker Desktop fournit aussi sa CLI ici
]


def _build_env() -> dict:
    # Le repo est public mais push/clone privé a quand même besoin d'identifiants — sans
    # GIT_TERMINAL_PROMPT=0, un git qui n'a pas d'identifiants en cache reste bloqué à vie sur un
    # prompt de terminal qu'il ne recevra jamais dans un thread de fond (voir authenticate_git).
    env = {**os.environ, "GIT_TERMINAL_PROMPT": "0"}
    if sys.platform == "darwin":
        extra = os.pathsep.join(d for d in _MACOS_EXTRA_PATH_DIRS if Path(d).is_dir())
        if extra:
            env["PATH"] = f"{extra}{os.pathsep}{env.get('PATH', '')}"
    return env


_RUN_ENV = _build_env()

# L'app empaquetée n'a pas de console (console=False dans windows.spec) : sans ce flag, Windows
# ouvre une fenêtre de console pour chaque `git`/`docker` lancé — soit une fenêtre toutes les
# quelques secondes tant que la fenêtre de statut se rafraîchit.
_CREATION_FLAGS = subprocess.CREATE_NO_WINDOW if sys.platform == "win32" else 0


class CommandError(RuntimeError):
    pass


# Pour les vérifications rapides (git/docker dispo, accès au remote) — si l'une d'elles bloque
# pour une raison inattendue (ex. une invite Keychain macOS ouverte mais pas au premier plan),
# l'app ne doit pas paraître figée jusqu'à 30 minutes : une erreur visible rapidement vaut mieux
# qu'un blocage silencieux.
_QUICK_TIMEOUT_SECONDS = 15


def _run(
    args: list[str],
    cwd: Path | None = None,
    log: LogFn | None = None,
    timeout: int = _TIMEOUT_SECONDS,
) -> str:
    if log:
        log("$ " + " ".join(args))
    try:
        result = subprocess.run(
            args,
            cwd=cwd,
            capture_output=True,
            text=True,
            timeout=timeout,
            env=_RUN_ENV,
            creationflags=_CREATION_FLAGS,
        )
    except FileNotFoundError as exc:
        raise CommandError(
            f"Commande introuvable : « {args[0]} » — pas installé, ou pas dans le PATH ?"
        ) from exc
    except subprocess.TimeoutExpired as exc:
        raise CommandError(f"« {args[0]} » n'a pas répondu après {timeout}s") from exc
    if result.returncode != 0:
        detail = (result.stderr or result.stdout or "échec sans message").strip()
        raise CommandError(detail[-2000:])
    return result.stdout


def can_access_remote(log: LogFn | None = None) -> bool:
    try:
        # Désactive explicitement le credential helper (Keychain/Git Credential Manager) pour ce
        # test anonyme : un dépôt public n'en a pas besoin, et ça évite qu'un helper tente malgré
        # tout une invite système (hors de GIT_TERMINAL_PROMPT, qui ne couvre que les prompts de
        # terminal) qui pourrait rester invisible et bloquer l'appel.
        _run(
            ["git", "-c", "credential.helper=", "ls-remote", REPO_URL],
            log=log,
            timeout=_QUICK_TIMEOUT_SECONDS,
        )
        return True
    except CommandError:
        return False


def authenticate_git(token: str, log: LogFn) -> None:
    """Enregistre un jeton d'accès personnel GitHub dans le gestionnaire d'identifiants du
    système (Keychain/osxkeychain sur macOS, Git Credential Manager sur Windows) via
    `git credential approve` — jamais écrit dans notre propre config ni dans l'URL du remote, et
    réutilisé automatiquement par tout `git clone`/`git pull` HTTPS suivant vers ce même hôte."""
    host = urlparse(REPO_URL).netloc
    credential_input = f"protocol=https\nhost={host}\nusername=x-access-token\npassword={token}\n\n"
    try:
        subprocess.run(
            ["git", "credential", "approve"],
            input=credential_input,
            text=True,
            check=True,
            capture_output=True,
            timeout=30,
            env=_RUN_ENV,
            creationflags=_CREATION_FLAGS,
        )
    except subprocess.CalledProcessError as exc:
        raise CommandError(
            f"Impossible d'enregistrer le jeton GitHub : {(exc.stderr or '').strip()}"
        ) from exc
    log("Jeton GitHub enregistré dans le gestionnaire d'identifiants du système.")


def is_git_available() -> bool:
    try:
        _run(["git", "--version"], timeout=_QUICK_TIMEOUT_SECONDS)
        return True
    except CommandError:
        return False


def is_docker_available() -> bool:
    try:
        _run(["docker", "info"], timeout=_QUICK_TIMEOUT_SECONDS)
        return True
    except CommandError:
        return False


def _compose_prefix(mode: str) -> list[str]:
    """Options `docker compose` communes à toute commande de gestion du projet — vides en mode
    serveur complet (docker-compose.yml, trouvé tout seul par `docker compose`), ou pointées sur
    le compose minimal du poste public sinon."""
    if mode == "public":
        return ["-f", _PUBLIC_COMPOSE_FILE, "--env-file", _PUBLIC_ENV_FILE]
    return []


def env_file_name(mode: str) -> str:
    return _PUBLIC_ENV_FILE if mode == "public" else ".env"


def has_env(repo_path: Path, mode: str) -> bool:
    """Le fichier de config propre à ce mode existe-t-il ? Sans lui, toute commande `docker
    compose` du mode échoue (ex. « couldn't find env file: .env.public ») — cas d'un dossier
    installé dans un mode puis sélectionné alors que mise-app était réglé sur l'autre."""
    return (repo_path / env_file_name(mode)).is_file()


def is_repo_cloned(repo_path: Path) -> bool:
    # Indépendant du mode : le monorepo contient toujours les deux docker-compose.yml, que ce
    # poste doive au final en lancer un seul des deux (voir _compose_prefix) ou l'autre.
    return (repo_path / ".git").is_dir() and (repo_path / "docker-compose.yml").is_file()


def current_commit(repo_path: Path) -> str:
    try:
        return _run(["git", "rev-parse", "--short", "HEAD"], cwd=repo_path).strip()
    except CommandError:
        return "?"


def current_version(repo_path: Path) -> str:
    """Nom de la release si HEAD est exactement dessus (ex. "1.2.0"), sinon le hash court — un
    clone qui n'a jamais encore suivi de release (vieille installation, ou mise à jour qui a
    échoué avant le checkout) doit quand même afficher quelque chose d'exploitable."""
    try:
        return _run(
            ["git", "describe", "--tags", "--exact-match"],
            cwd=repo_path,
            timeout=_QUICK_TIMEOUT_SECONDS,
        ).strip()
    except CommandError:
        return current_commit(repo_path)


def latest_release_tag(log: LogFn | None = None) -> Optional[str]:
    """Nom du tag de la dernière release GitHub publiée (ex. "1.2.0"), ou None si l'appel échoue
    (API injoignable, aucune release publiée...) — l'appelant doit alors se rabattre sur la
    branche par défaut plutôt que d'échouer : l'absence de release ne doit jamais bloquer
    l'installation ou la mise à jour, qui marchaient très bien avant que ça existe."""
    request = urllib.request.Request(
        _GITHUB_API_LATEST_RELEASE,
        headers={"Accept": "application/vnd.github+json", "User-Agent": "Mise-App"},
    )
    try:
        with urllib.request.urlopen(request, timeout=_QUICK_TIMEOUT_SECONDS) as response:
            data = json.loads(response.read())
    except (urllib.error.URLError, TimeoutError, json.JSONDecodeError, OSError) as exc:
        if log:
            log(f"Impossible de récupérer la dernière release GitHub : {exc}")
        return None

    tag = data.get("tag_name")
    return tag or None


def checkout_release(repo_path: Path, tag: str, log: LogFn) -> None:
    """Bascule le clone local sur le tag d'une release — `fetch --tags` d'abord, le clone initial
    ne récupère pas forcément les tags créés après (ou le dépôt a été cloné avant que ce tag
    n'existe). `advice.detachedHead=false` tait juste l'avertissement informatif de Git ; on est
    volontairement en detached HEAD, pas une erreur à expliquer dans le journal de l'app."""
    _run(["git", "fetch", "--tags"], cwd=repo_path, log=log)
    _run(
        ["git", "-c", "advice.detachedHead=false", "checkout", f"tags/{tag}"],
        cwd=repo_path,
        log=log,
    )


def clone(repo_path: Path, log: LogFn) -> None:
    repo_path.parent.mkdir(parents=True, exist_ok=True)
    _run(["git", "clone", REPO_URL, str(repo_path)], log=log)


def _generate_secret(length: int = 16) -> str:
    return secrets.token_urlsafe(length)


def set_env_var(content: str, key: str, value: str) -> str:
    pattern = re.compile(rf"^{re.escape(key)}=.*$", re.MULTILINE)
    replacement = f"{key}={value}"
    if pattern.search(content):
        return pattern.sub(replacement, content)
    return content.rstrip("\n") + f"\n{replacement}\n"


def _read_env_file_var(env_path: Path, key: str) -> Optional[str]:
    if not env_path.exists():
        return None
    match = re.search(
        rf"^{re.escape(key)}=(.*)$", env_path.read_text(encoding="utf-8"), re.MULTILINE
    )
    if not match:
        return None
    return match.group(1).strip() or None


def read_env_var(repo_path: Path, key: str) -> Optional[str]:
    """Lit une variable depuis le `.env` du projet installé (celui créé par bootstrap_env, pas la
    config de mise-app) — ex. CLOUDFLARE_DASHBOARD_URL, posée à la main après avoir suivi
    DEPLOY.md §4 « Tunnel nommé ». Retourne None si le fichier ou la clé n'existe pas, ou si elle
    est vide."""
    return _read_env_file_var(repo_path / ".env", key)


def read_public_env_var(repo_path: Path, key: str) -> Optional[str]:
    """Équivalent de read_env_var ci-dessus pour `.env.public` (poste public seul)."""
    return _read_env_file_var(repo_path / _PUBLIC_ENV_FILE, key)


def set_public_env_var(repo_path: Path, key: str, value: str, log: LogFn) -> None:
    """Modifie une variable de `.env.public` après coup (ex. l'adresse de l'API centrale a
    changé) — contrairement à bootstrap_env_public, qui ne crée le fichier qu'une fois et ne le
    touche plus jamais ensuite. N'applique rien tant que le conteneur `public` n'est pas relancé
    (voir _save_api_upstream côté status_window.py, qui enchaîne sur un docker_up)."""
    env_path = repo_path / _PUBLIC_ENV_FILE
    content = (
        env_path.read_text(encoding="utf-8")
        if env_path.exists()
        else (repo_path / ".env.public.example").read_text(encoding="utf-8")
    )
    env_path.write_text(set_env_var(content, key, value), encoding="utf-8")
    log(f"{_PUBLIC_ENV_FILE} mis à jour ({key}).")


def bootstrap_env(repo_path: Path, admin_name: str, admin_password: str, log: LogFn) -> None:
    """Crée `.env` à partir de `.env.example` avec des secrets générés — voir DEPLOY.md §2, dont
    ceci reproduit les étapes manuelles (sauf la clé applicative, générée en dernier car elle a
    besoin que l'image `api` existe déjà)."""
    env_path = repo_path / ".env"
    if env_path.exists():
        log(".env existe déjà, pas touché")
        return

    content = (repo_path / ".env.example").read_text(encoding="utf-8")
    content = set_env_var(content, "DB_PASSWORD", _generate_secret())
    content = set_env_var(content, "DB_ROOT_PASSWORD", _generate_secret())
    content = set_env_var(content, "ADMIN_NAME", admin_name)
    content = set_env_var(content, "ADMIN_PASSWORD", admin_password)
    env_path.write_text(content, encoding="utf-8")
    log(".env créé à partir de .env.example")

    log("Génération de la clé applicative (APP_KEY)...")
    app_key = _run(
        ["docker", "compose", "run", "--rm", "api", "php", "artisan", "key:generate", "--show"],
        cwd=repo_path,
        log=log,
    ).strip()
    content = env_path.read_text(encoding="utf-8")
    env_path.write_text(set_env_var(content, "APP_KEY", app_key), encoding="utf-8")
    log("APP_KEY généré")


def bootstrap_env_public(repo_path: Path, api_upstream: str, log: LogFn) -> None:
    """Équivalent de bootstrap_env ci-dessus pour un poste public seul — juste l'adresse de l'API
    centrale à joindre (voir docker-compose.public.yml), pas d'admin ni de clé applicative à
    générer : ce poste n'a pas sa propre base, il parle à celle du serveur déjà installé."""
    env_path = repo_path / _PUBLIC_ENV_FILE
    if env_path.exists():
        log(f"{_PUBLIC_ENV_FILE} existe déjà, pas touché")
        return

    content = (repo_path / ".env.public.example").read_text(encoding="utf-8")
    content = set_env_var(content, "API_UPSTREAM", api_upstream)
    env_path.write_text(content, encoding="utf-8")
    log(f"{_PUBLIC_ENV_FILE} créé")


def docker_up(repo_path: Path, log: LogFn, build: bool = False, mode: str = "server") -> None:
    args = ["docker", "compose", *_compose_prefix(mode), "up", "-d"]
    if build:
        args.append("--build")
    _run(args, cwd=repo_path, log=log)


def server_status(repo_path: Path, mode: str = "server") -> str:
    """"running" (tous les services tournent), "stopped" (aucun), "partial" (certains), ou
    "unknown" (Docker indisponible, ou pas encore de conteneurs créés) — basé sur
    `docker compose ps`, pas sur `docker_up`/`stop_server` qui ne font qu'agir."""
    try:
        running = _run(
            ["docker", "compose", *_compose_prefix(mode), "ps", "--services", "--filter", "status=running"],
            cwd=repo_path,
            timeout=_QUICK_TIMEOUT_SECONDS,
        )
        all_services = _run(
            ["docker", "compose", *_compose_prefix(mode), "config", "--services"],
            cwd=repo_path,
            timeout=_QUICK_TIMEOUT_SECONDS,
        )
    except CommandError:
        return "unknown"

    running_set = {s for s in running.splitlines() if s.strip()}
    all_set = {s for s in all_services.splitlines() if s.strip()}
    if not all_set:
        return "unknown"
    if not running_set:
        return "stopped"
    if running_set >= all_set:
        return "running"
    return "partial"


def start_server(repo_path: Path, log: LogFn, mode: str = "server") -> None:
    docker_up(repo_path, log, mode=mode)


def stop_server(repo_path: Path, log: LogFn, mode: str = "server") -> None:
    # `stop` (pas `down`) : garde les conteneurs/volumes en place pour un redémarrage rapide via
    # start_server, plutôt que de tout détruire et reconstruire.
    _run(["docker", "compose", *_compose_prefix(mode), "stop"], cwd=repo_path, log=log)


def backup_db(repo_path: Path, log: LogFn) -> Path:
    """Reproduit `backup/backup.sh::backup_once` à la main (voir DEPLOY.md §7) : dump + gzip
    dans le conteneur `db-backup`, puis copie locale (le volume Docker ne survit pas à une panne
    disque, voir ce même paragraphe)."""
    # Résolution à la seconde (pas juste la minute) : deux sauvegardes cliquées rapprochées dans
    # la même minute se marchaient sur le même nom de fichier, et `gzip` refuse d'écraser un
    # fichier existant — ce qui faisait échouer tout le dump avec un message trompeur (le warning
    # mysqldump ci-dessous, bénin, se retrouvait au premier plan alors que le vrai souci était
    # ce conflit de nom).
    stamp = datetime.datetime.now().strftime("%Y-%m-%d_%H%M%S")
    remote_name = f"mise-backup-{stamp}.sql.gz"
    dump_script = (
        f'FILE="/backup/mise-backup-{stamp}.sql"; '
        # Mot de passe via MYSQL_PWD plutôt que `-p"$VAR"` : évite le warning "Using a password
        # on the command line interface can be insecure" (visible via `ps` par d'autres
        # utilisateurs du même hôte) — cosmétique mais autant l'éviter proprement.
        'MYSQL_PWD="$MYSQL_ROOT_PASSWORD" mysqldump --no-tablespaces -h "$MYSQL_HOST" -uroot '
        '"$MYSQL_DATABASE" > "$FILE" && gzip "$FILE"'
    )
    _run(
        ["docker", "compose", "exec", "-T", "db-backup", "sh", "-c", dump_script],
        cwd=repo_path,
        log=log,
    )
    local_path = repo_path / remote_name
    _run(
        ["docker", "compose", "cp", f"db-backup:/backup/{remote_name}", str(local_path)],
        cwd=repo_path,
        log=log,
    )
    log(f"Sauvegarde copiée : {local_path}")
    return local_path


def list_backups(repo_path: Path) -> list[Path]:
    return sorted(repo_path.glob("mise-backup-*.sql.gz"), reverse=True)


def restore_db(repo_path: Path, backup_file: Path, log: LogFn) -> None:
    """Reproduit la restauration manuelle de DEPLOY.md §7 (`gunzip -c ... | docker compose exec
    -T db mysql ...`), mais lit les identifiants depuis les variables d'environnement déjà
    définies dans le conteneur `db` (mêmes noms que pour `backup_db` côté `db-backup`) plutôt que
    de dépendre de `.env` sourcé dans le shell de l'appelant."""
    log(f"Lecture de {backup_file}...")
    try:
        import gzip

        sql_bytes = gzip.open(backup_file, "rb").read()
    except OSError as exc:
        raise CommandError(f"Impossible de lire la sauvegarde : {exc}") from exc

    log(f"Restauration de {backup_file.name} (écrase la base actuelle)...")
    script = 'MYSQL_PWD="$MYSQL_ROOT_PASSWORD" mysql -uroot "$MYSQL_DATABASE"'
    args = ["docker", "compose", "exec", "-T", "db", "sh", "-c", script]
    log("$ " + " ".join(args) + f" < {backup_file.name}")
    try:
        result = subprocess.run(
            args,
            cwd=repo_path,
            input=sql_bytes,
            capture_output=True,
            timeout=_TIMEOUT_SECONDS,
            env=_RUN_ENV,
            creationflags=_CREATION_FLAGS,
        )
    except FileNotFoundError as exc:
        raise CommandError("Commande introuvable : « docker » — pas installé, ou pas dans le PATH ?") from exc
    except subprocess.TimeoutExpired as exc:
        raise CommandError(f"La restauration n'a pas répondu après {_TIMEOUT_SECONDS}s") from exc
    if result.returncode != 0:
        detail = (result.stderr or result.stdout or b"echec sans message").decode(errors="replace").strip()
        raise CommandError(detail[-2000:])
    log("Restauration terminée.")


def restore(repo_path: Path, backup_file: Path, log: LogFn) -> None:
    # Toujours une sauvegarde de sécurité juste avant d'écraser la base — même logique que
    # update() : une restauration qui tourne mal (mauvais fichier choisi...) ne doit pas être
    # irréversible.
    log("Sauvegarde de sécurité avant restauration...")
    backup_db(repo_path, log)
    restore_db(repo_path, backup_file, log)


def pull(repo_path: Path, log: LogFn) -> None:
    _run(["git", "pull"], cwd=repo_path, log=log)


def install(
    repo_path: Path,
    admin_name: str,
    admin_password: str,
    log: LogFn,
    github_token: str | None = None,
) -> None:
    if github_token:
        authenticate_git(github_token, log)
    log(f"Clonage de {REPO_URL}...")
    clone(repo_path, log)

    tag = latest_release_tag(log)
    if tag:
        log(f"Passage sur la dernière release ({tag})...")
        checkout_release(repo_path, tag, log)
    else:
        log("Impossible de déterminer la dernière release — on reste sur la branche principale.")

    bootstrap_env(repo_path, admin_name, admin_password, log)
    log(
        "Démarrage de la pile Docker (peut prendre plusieurs minutes au premier lancement) — "
        "les migrations et le seed du référentiel (catégories, stations, allergènes, types "
        "d'étiquette...) tournent automatiquement au démarrage du conteneur api..."
    )
    docker_up(repo_path, log, build=True)
    log("Installation terminée.")


def update(repo_path: Path, log: LogFn) -> None:
    log("Sauvegarde de la base avant mise à jour...")
    backup_db(repo_path, log)

    tag = latest_release_tag(log)
    if tag:
        log(f"Passage sur la dernière release ({tag})...")
        checkout_release(repo_path, tag, log)
    else:
        log("Impossible de déterminer la dernière release — récupération du dernier code (git pull)...")
        pull(repo_path, log)

    log("Reconstruction et redémarrage des conteneurs...")
    docker_up(repo_path, log, build=True)
    log("Mise à jour terminée.")


def install_public(
    repo_path: Path,
    api_upstream: str,
    log: LogFn,
    github_token: str | None = None,
) -> None:
    """Équivalent de install() ci-dessus pour un poste public seul."""
    if github_token:
        authenticate_git(github_token, log)
    log(f"Clonage de {REPO_URL}...")
    clone(repo_path, log)

    tag = latest_release_tag(log)
    if tag:
        log(f"Passage sur la dernière release ({tag})...")
        checkout_release(repo_path, tag, log)
    else:
        log("Impossible de déterminer la dernière release — on reste sur la branche principale.")

    bootstrap_env_public(repo_path, api_upstream, log)
    log("Démarrage du poste public (peut prendre quelques minutes au premier lancement)...")
    docker_up(repo_path, log, build=True, mode="public")
    log("Installation terminée.")


def switch_mode(
    repo_path: Path,
    from_mode: str,
    to_mode: str,
    log: LogFn,
    api_upstream: Optional[str] = None,
    admin_name: Optional[str] = None,
    admin_password: Optional[str] = None,
    on_switched: Optional[Callable[[], None]] = None,
) -> None:
    """Bascule un dossier déjà cloné d'un mode à l'autre, sans nouveau clone : le dépôt contient
    toujours les deux docker-compose (voir is_repo_cloned). Arrête la pile de l'ancien mode
    (`stop`, pas `down` : en quittant le serveur complet, la base reste intacte dans son volume
    Docker et revient telle quelle si on repasse en serveur), crée le fichier de config du nouveau
    mode s'il manque (les identifiants/l'adresse ne servent que dans ce cas), puis démarre le
    nouveau mode. `on_switched` est appelé juste avant ce démarrage, pour que mise-app enregistre
    le nouveau mode même si le démarrage échoue ensuite (« Démarrer le serveur » réessaiera alors
    le bon mode)."""
    if has_env(repo_path, from_mode):
        log("Arrêt des conteneurs du mode actuel...")
        stop_server(repo_path, log, mode=from_mode)
    else:
        log(f"Pas de {env_file_name(from_mode)} : rien à arrêter pour le mode actuel.")

    if to_mode == "public":
        bootstrap_env_public(repo_path, api_upstream or "", log)
    else:
        bootstrap_env(repo_path, admin_name or "", admin_password or "", log)

    if on_switched:
        on_switched()

    log("Démarrage du nouveau mode (peut prendre plusieurs minutes la première fois)...")
    docker_up(repo_path, log, build=True, mode=to_mode)
    log("Changement de mode terminé.")


def update_public(repo_path: Path, log: LogFn) -> None:
    """Équivalent de update() ci-dessus pour un poste public seul — pas de base locale ici, donc
    rien à sauvegarder avant de mettre à jour (contrairement au mode serveur complet)."""
    tag = latest_release_tag(log)
    if tag:
        log(f"Passage sur la dernière release ({tag})...")
        checkout_release(repo_path, tag, log)
    else:
        log("Impossible de déterminer la dernière release — récupération du dernier code (git pull)...")
        pull(repo_path, log)

    log("Reconstruction et redémarrage du conteneur...")
    docker_up(repo_path, log, build=True, mode="public")
    log("Mise à jour terminée.")
