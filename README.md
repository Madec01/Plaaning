# Plaaning

Un espace personnel pour suivre ses projets et organiser sa semaine : un accueil
pour repérer les priorités, une page par projet et un planning commun.

**Ouvrir `index.html` suffit.** L'application reste autonome, sans installation,
sans serveur et sans dépendance réseau, sur ordinateur comme sur téléphone.

## Projets et planning

- **Accueil** : projets actifs, échéances et actions à planifier.
- **Projets** : création par « + », nom, titre, tranche 1 ou 2, code projet,
  labels et échéance. Chaque projet possède ses phases et ses actions.
- **Page projet** : Préparation / En cours / Finalisation par défaut ; objets libres,
  statuts À faire / En cours / Terminé, commentaires et dates limites.
- **Planning** : une action peut avoir plusieurs créneaux. Les liens conservent
  leur identité quand le projet ou l'action est renommé.
- **Personnaliser** : codes et labels réutilisables. Les phases se personnalisent
  depuis la page projet.

Une **phase** classe l'action dans le projet ; le **statut** indique son avancement.
Une **échéance** est une date limite ; un **créneau** est une séance de travail.
Cocher une action la marque terminée dans toutes les vues.

Le planning conserve la journée type (préparation le matin, passif l'après-midi),
les séances, les réunions récurrentes et les vues Colonnes / Chronologie. Le cadre
hebdomadaire couvre le lundi au vendredi.

## Données et sauvegardes

Tout est stocké **dans le navigateur** (`localStorage`, clé `plaaning.v1`).
Aucun nom de projet ou de dossier ne part sur GitHub. Le dépôt ne contient aucune
donnée professionnelle réelle.

**Sauvegarde → Exporter** produit un fichier JSON contenant les projets, les
semaines, les fiches, les notes, les modèles et les réunions récurrentes.
**Restaurer** vérifie le fichier et demande confirmation avant remplacement.
Les anciennes sauvegardes v2 sont prises en charge et migrées vers le format v3.

Pour changer de navigateur, d'appareil ou d'emplacement du fichier HTML, exporter
puis restaurer : le stockage local n'est pas une synchronisation. Remplacer la page
au même emplacement dans le même navigateur conserve les données.

## Développement

`index.html` est le fichier autonome à distribuer. L'interface projets est éditée
dans `src/projects-ui.js` et `src/projects.css`, puis réintégrée avec :

```sh
python3 tools/build.py
```

Le moteur, les migrations et le planning restent dans `index.html`. Le build ne
requiert aucune dépendance Python externe. Ne pas modifier manuellement les blocs
marqués `PROJECT UI` dans le fichier distribué : le build les remplace.

Les tests de parcours utilisent Node.js, Playwright et Chromium :

```sh
node tests/projects.spec.cjs
```

`CHROMIUM_PATH` peut désigner un navigateur déjà installé. Les tests démarrent leur
propre serveur local et utilisent des données fictives dans un navigateur isolé.

Le [journal de bord](JOURNAL.md) décrit les décisions, changements et vérifications.
