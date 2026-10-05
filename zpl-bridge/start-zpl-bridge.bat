@echo off
REM Lanceur du pont ZPL. Modifiez PRINTER_NAME ci-dessous (nom exact de l'imprimante, visible
REM dans Windows -> Imprimantes) une seule fois, puis :
REM   - double-cliquez ce fichier pour lancer le pont manuellement, ou
REM   - placez-en un raccourci dans le dossier Demarrage de Windows pour qu'il se lance tout seul
REM     a chaque ouverture de session (touche Windows + R, tapez shell:startup, Entree, deposez le
REM     raccourci dans le dossier qui s'ouvre).
REM
REM pythonw (et non python) : pas de fenetre de console qui reste ouverte.

set PRINTER_NAME=Nom exact de l'imprimante

pythonw "%~dp0zpl_bridge.py" "%PRINTER_NAME%"
