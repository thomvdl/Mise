"""Cycle de vie du projet Mise lui-même (cloner, démarrer/mettre à jour la pile Docker) — ce que
fait l'app en plus du pont ZPL proprement dit, pour que le mini PC n'ait qu'une seule icône à
lancer plutôt que de suivre les étapes manuelles de DEPLOY.md à chaque fois.

Toutes les opérations ici peuvent prendre plusieurs minutes (build Docker, clone) — elles sont
pensées pour tourner dans un thread à part (voir status_window.py), donc `log` ne doit jamais être
une méthode Tkinter : seul `events.EventLog.add` (thread-safe, pas de widget) est fait pour ça.
"""

import datetime
import os
import re
import secrets
import subprocess
import sys
from pathlib import Path
from typing import Callable
from urllib.parse import urlparse

REPO_URL = "https://github.com/thomvdl/Mise.git"
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


def is_repo_cloned(repo_path: Path) -> bool:
    return (repo_path / ".git").is_dir() and (repo_path / "docker-compose.yml").is_file()


def current_commit(repo_path: Path) -> str:
    try:
        return _run(["git", "rev-parse", "--short", "HEAD"], cwd=repo_path).strip()
    except CommandError:
        return "?"


def clone(repo_path: Path, log: LogFn) -> None:
    repo_path.parent.mkdir(parents=True, exist_ok=True)
    _run(["git", "clone", REPO_URL, str(repo_path)], log=log)


def _generate_secret(length: int = 16) -> str:
    return secrets.token_urlsafe(length)


def _set_env_var(content: str, key: str, value: str) -> str:
    pattern = re.compile(rf"^{re.escape(key)}=.*$", re.MULTILINE)
    replacement = f"{key}={value}"
    if pattern.search(content):
        return pattern.sub(replacement, content)
    return content.rstrip("\n") + f"\n{replacement}\n"


def bootstrap_env(repo_path: Path, admin_name: str, admin_password: str, log: LogFn) -> None:
    """Crée `.env` à partir de `.env.example` avec des secrets générés — voir DEPLOY.md §2, dont
    ceci reproduit les étapes manuelles (sauf la clé applicative, générée en dernier car elle a
    besoin que l'image `api` existe déjà)."""
    env_path = repo_path / ".env"
    if env_path.exists():
        log(".env existe déjà, pas touché")
        return

    content = (repo_path / ".env.example").read_text(encoding="utf-8")
    content = _set_env_var(content, "DB_PASSWORD", _generate_secret())
    content = _set_env_var(content, "DB_ROOT_PASSWORD", _generate_secret())
    content = _set_env_var(content, "ADMIN_NAME", admin_name)
    content = _set_env_var(content, "ADMIN_PASSWORD", admin_password)
    env_path.write_text(content, encoding="utf-8")
    log(".env créé à partir de .env.example")

    log("Génération de la clé applicative (APP_KEY)...")
    app_key = _run(
        ["docker", "compose", "run", "--rm", "api", "php", "artisan", "key:generate", "--show"],
        cwd=repo_path,
        log=log,
    ).strip()
    content = env_path.read_text(encoding="utf-8")
    env_path.write_text(_set_env_var(content, "APP_KEY", app_key), encoding="utf-8")
    log("APP_KEY généré")


def docker_up(repo_path: Path, log: LogFn, build: bool = False) -> None:
    args = ["docker", "compose", "up", "-d"]
    if build:
        args.append("--build")
    _run(args, cwd=repo_path, log=log)


def server_status(repo_path: Path) -> str:
    """"running" (tous les services tournent), "stopped" (aucun), "partial" (certains), ou
    "unknown" (Docker indisponible, ou pas encore de conteneurs créés) — basé sur
    `docker compose ps`, pas sur `docker_up`/`stop_server` qui ne font qu'agir."""
    try:
        running = _run(
            ["docker", "compose", "ps", "--services", "--filter", "status=running"],
            cwd=repo_path,
            timeout=_QUICK_TIMEOUT_SECONDS,
        )
        all_services = _run(
            ["docker", "compose", "config", "--services"],
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


def start_server(repo_path: Path, log: LogFn) -> None:
    docker_up(repo_path, log)


def stop_server(repo_path: Path, log: LogFn) -> None:
    # `stop` (pas `down`) : garde les conteneurs/volumes en place pour un redémarrage rapide via
    # start_server, plutôt que de tout détruire et reconstruire.
    _run(["docker", "compose", "stop"], cwd=repo_path, log=log)


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
    log("Récupération du dernier code (git pull)...")
    pull(repo_path, log)
    log("Reconstruction et redémarrage des conteneurs...")
    docker_up(repo_path, log, build=True)
    log("Mise à jour terminée.")
