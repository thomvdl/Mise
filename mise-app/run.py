"""Point d'entrée pour PyInstaller — `app/main.py` utilise des imports relatifs (`from . import
autostart`), qui échouent si on le lance directement comme script. Ce wrapper importe le package
normalement, ce qui marche aussi bien en dev (`python3 run.py`) qu'une fois empaqueté."""

from app.main import main

if __name__ == "__main__":
    main()
