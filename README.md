# Plaaning

Un planning hebdomadaire visuel, pour tenir son cadre plutôt que pour lister des tâches.

Une seule page HTML, sans dépendance et sans serveur : elle s'ouvre dans un navigateur,
sur ordinateur comme sur téléphone.

## Principe

La semaine part d'une **journée type** — prépa de dossiers le matin, passif l'après-midi —
et on vient y **activer des colonnes** quand la journée se remplit : un chantier en cours,
une clôture de dossier, une réception de travaux le jeudi. Le fond de carte recule
d'autant. Ce qui n'est pas planifié reste du passif, et ça se voit.

## Données

Tout est stocké **dans le navigateur** (`localStorage`). Aucun nom de chantier ni de
dossier ne part sur GitHub, et le dépôt ne contient jamais de données réelles.

## Documentation

Le [journal de bord](JOURNAL.md) retrace chaque décision, modification et ajout,
dans l'ordre, avec sa raison.

## Utilisation et sauvegardes

Ouvrir `index.html` dans un navigateur récent. Aucune installation, serveur ou
connexion Internet n'est nécessaire. Les thèmes clair/sombre et les vues Colonnes /
Chronologie sont mémorisés.

Le bouton **Sauvegarde** permet d'exporter un fichier JSON contenant les semaines,
fiches, notes, modèles et réunions récurrentes. **Restaurer un fichier** vérifie ce
fichier puis demande confirmation avant de remplacer les données du navigateur.
Exporter le planning actuel avant une restauration permet de le conserver.

Pour changer de navigateur, d'appareil ou d'emplacement du fichier HTML, exporter
puis restaurer la sauvegarde : le stockage local n'est pas une synchronisation.
Les anciennes données restent compatibles lorsque la page est remplacée au même
emplacement dans le même navigateur.
