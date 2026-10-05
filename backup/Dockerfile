# Image mysql:8.4 réutilisée uniquement pour son client mysqldump (même version que le serveur
# db, évite les soucis de compatibilité entre un mysqldump trop récent/ancien et le serveur) —
# son propre serveur MySQL n'est jamais démarré ici, voir ENTRYPOINT ci-dessous.
FROM mysql:8.4

COPY backup.sh /backup.sh
RUN chmod +x /backup.sh

ENTRYPOINT ["/backup.sh"]
