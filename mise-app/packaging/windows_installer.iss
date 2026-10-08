; Installateur Windows de Mise (Inno Setup 6) — compilé par build_windows.bat après PyInstaller,
; à partir du dossier dist\windows\Mise\ (Mise.exe + _internal\). Donne un seul fichier à
; distribuer (Mise-Setup.exe) au lieu d'un zip dont il ne faut surtout pas séparer Mise.exe de
; _internal\.
;
; Installation par utilisateur, sans droits admin, dans %LOCALAPPDATA%\Mise — le même dossier que
; l'installation manuelle à partir du zip : le raccourci "Lancer au démarrage" éventuellement déjà
; créé par l'app continue donc de pointer au bon endroit après une mise à jour.

; Garder aligné avec windows_version_info.txt et CFBundleShortVersionString de macos.spec.
#define AppVersion "1.2.0"

[Setup]
; Ne jamais changer cet AppId : c'est lui qui fait qu'une nouvelle version remplace l'ancienne au
; lieu de s'installer à côté.
AppId={{00A9A6AF-EA38-42EA-957C-81E5A4792264}
AppName=Mise
AppVersion={#AppVersion}
AppPublisher=thomvdl
AppPublisherURL=https://github.com/thomvdl/Mise
DefaultDirName={localappdata}\Mise
DisableDirPage=yes
DefaultGroupName=Mise
DisableProgramGroupPage=yes
PrivilegesRequired=lowest
OutputDir=..\dist\windows
OutputBaseFilename=Mise-Setup
SetupIconFile=assets\icon.ico
UninstallDisplayIcon={app}\Mise.exe
Compression=lzma2
SolidCompression=yes
WizardStyle=modern
; Ferme l'app si elle tourne (mise à jour/désinstallation), sinon Mise.exe est verrouillé.
CloseApplications=yes
RestartApplications=no

[Languages]
Name: "french"; MessagesFile: "compiler:Languages\French.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"

[InstallDelete]
; Repart d'un _internal\ propre : des fichiers d'une ancienne version (dépendance retirée…)
; resteraient sinon à côté des nouveaux.
Type: filesandordirs; Name: "{app}\_internal"

[Files]
Source: "..\dist\windows\Mise\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{autoprograms}\Mise"; Filename: "{app}\Mise.exe"
Name: "{autodesktop}\Mise"; Filename: "{app}\Mise.exe"; Tasks: desktopicon

[Run]
Filename: "{app}\Mise.exe"; Description: "{cm:LaunchProgram,Mise}"; Flags: nowait postinstall skipifsilent

[UninstallRun]
Filename: "{sys}\taskkill.exe"; Parameters: "/F /IM Mise.exe"; Flags: runhidden; RunOnceId: "StopMise"

[UninstallDelete]
; Raccourci créé par l'app elle-même (case "Lancer au démarrage", voir app/autostart.py) — pas
; par l'installateur, donc pas retiré automatiquement sinon.
Type: files; Name: "{userstartup}\MiseApp.lnk"
