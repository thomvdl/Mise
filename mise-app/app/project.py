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
from pathlib import Path
from typing import Callable
from urllib.parse import urlparse

REPO_URL = "https://github.com/thomvdl/Mise.git"
LogFn = Callable[[str], None]
# Build Docker compris : peut être long au premier lancement (images à télécharger/construire).
_TIMEOUT_SECONDS = 1800
# Le repo est privé — sans ça, un git qui n'a pas d'identifiants en cache reste bloqué à vie sur
# un prompt de terminal qu'il ne recevra jamais dans un thread de fond (voir authenticate_git).
_NO_PROMPT_ENV = {**os.environ, "GIT_TERMINAL_PROMPT": "0"}


class CommandError(RuntimeError):
    pass


def _run(args: list[str], cwd: Path | None = None, log: LogFn | None = None) -> str:
    if log:
        log("$ " + " ".join(args))
    try:
        result = subprocess.run(
            args, cwd=cwd, capture_output=True, text=True, timeout=_TIMEOUT_SECONDS, env=_NO_PROMPT_ENV
        )
    except FileNotFoundError as exc:
        raise CommandError(
            f"Commande introuvable : « {args[0]} » — pas installé, ou pas dans le PATH ?"
        ) from exc
    except subprocess.TimeoutExpired as exc:
        raise CommandError(f"« {args[0]} » n'a pas répondu après {_TIMEOUT_SECONDS}s") from exc
    if result.returncode != 0:
        detail = (result.stderr or result.stdout or "échec sans message").strip()
        raise CommandError(detail[-2000:])
    return result.stdout


def can_access_remote(log: LogFn | None = None) -> bool:
    try:
        _run(["git", "ls-remote", REPO_URL], log=log)
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
        )
    except subprocess.CalledProcessError as exc:
        raise CommandError(
            f"Impossible d'enregistrer le jeton GitHub : {(exc.stderr or '').strip()}"
        ) from exc
    log("Jeton GitHub enregistré dans le gestionnaire d'identifiants du système.")


def is_git_available() -> bool:
    try:
        _run(["git", "--version"])
        return True
    except CommandError:
        return False


def is_docker_available() -> bool:
    try:
        _run(["docker", "info"])
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


def backup_db(repo_path: Path, log: LogFn) -> Path:
    """Reproduit `backup/backup.sh::backup_once` à la main (voir DEPLOY.md §7) : dump + gzip
    dans le conteneur `db-backup`, puis copie locale (le volume Docker ne survit pas à une panne
    disque, voir ce même paragraphe)."""
    stamp = datetime.datetime.now().strftime("%Y-%m-%d_%H%M")
    remote_name = f"mise-backup-{stamp}.sql.gz"
    dump_script = (
        f'FILE="/backup/mise-backup-{stamp}.sql"; '
        'mysqldump --no-tablespaces -h "$MYSQL_HOST" -uroot -p"$MYSQL_ROOT_PASSWORD" '
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
    log("Démarrage de la pile Docker (peut prendre plusieurs minutes au premier lancement)...")
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
