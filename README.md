# Plaaning

Un espace personnel pour suivre ses projets et organiser sa semaine : un accueil
pour repérer les priorités, une page par projet et un planning commun.

**Ouvrir `index.html` suffit.** L'application reste autonome, sans installation,
sans serveur et sans dépendance réseau, sur ordinateur comme sur téléphone.

## Projets et planning

- **Accueil** : projets actifs, échéances et actions à planifier.
- **Projets** : création par « + », nom, titre, tranche 1, tranche 2 ou les deux, code projet,
  labels et échéance. Chaque projet possède ses phases et ses actions.
- **Page projet** : Préparation / En cours / Finalisation par défaut ; objets libres,
  statuts À faire / En cours / Terminé et dates limites. Chaque ligne affiche une
  zone « Référence ou commentaire… », utilisable immédiatement et enregistrée
  en quittant le champ. Elle partage le contenu de la note de l'action. Des champs
  texte personnalisables par projet permettent de saisir références, numéros de
  dossier et informations directement dans les lignes des actions.
- **Planning** : une action peut avoir plusieurs créneaux. Les liens conservent
  leur identité quand le projet ou l'action est renommé.
- **Personnaliser** : codes et labels réutilisables. Les phases se personnalisent
  depuis la page projet.

Une **phase** classe l'action dans le projet ; le **statut** indique son avancement.
Une **échéance** est une date limite ; un **créneau** est une séance de travail.
Cocher une action la marque terminée dans toutes les vues.

## Un projet sur les deux tranches

Choisir **Tranches 1 et 2** à la création ou dans **Modifier**. La même fiche réunit
les onglets **Vue globale**, **Tranche 1** et **Tranche 2**. La vue globale
compare les avancements ; chaque tranche a sa phase actuelle et sa deadline.
Les documents, contacts, codes et informations générales restent communs.

Chaque nouvelle action d’un projet à deux tranches appartient à **T1** ou **T2**. Les actions portant le même
intitulé dans deux tranches sont indépendantes : cocher celle de T1 ne termine
pas celle de T2. Préparation, en cours et finalisation se suivent dans chaque tranche.
Les anciennes actions communes restent dans la vue globale, sous **Actions à
affecter à une tranche**, sans phases communes. Leurs données et séances sont
conservées ; pour changer la tranche d’une action déjà planifiée, retirer d’abord
ses créneaux puis la replanifier dans sa tranche.
**Copier les tâches vers l’autre tranche** crée de nouvelles actions, à faire et
sans dates, avec des identifiants distincts. Les créneaux ne sont pas copiés.

Dans le planning, choisir T1 ou T2 avant les actions d’un projet à deux tranches. Les séances et les
échéances affichent **T1**, **T2** ou **Commun** ; le filtre de tranche permet de
concentrer la vue. Les réunions et autres activités sans projet restent visibles.

Les tâches des anciens projets T1/T2 gardent leur tranche, leurs identifiants,
notes, échéances et coches. Passer de T1 à T1 + T2 conserve les tâches dans T1.
Retirer une tranche contenant des données est refusé pour éviter une perte.

## Priorités et suivi

**À terminer avant** désigne la deadline : déplacer un créneau dans le planning
ne déplace pas cette date. Chaque action possède un niveau d'importance et une
urgence calculée automatiquement, avec les seuils initiaux suivants :

| Importance | À surveiller | Urgente | Critique |
| --- | --- | --- | --- |
| 1 · Impératif | 10 jours avant | 5 jours avant | 2 jours avant |
| 2 · Important | 1 jour après | 3 jours après | 7 jours après |
| 3 · Souple | 7 jours après | 21 jours après | Jamais automatiquement |

Ces seuils sont réglables dans **Personnaliser** et utilisent les jours
calendaires. Une urgence manuelle peut renforcer l'urgence automatique ; elle ne
masque pas une alerte plus élevée calculée à partir de la deadline. Sans deadline,
seule l'urgence manuelle intervient. Les actions terminées ne produisent plus
d'alerte. Dans chaque phase, les actions sont classées par urgence, puis importance
et deadline ; les actions terminées sont regroupées à part.

- **Dépendances** : une action peut dépendre d'autres actions du même projet.
  Ses prérequis doivent être terminés pour la démarrer ou la terminer.
- **Attentes** : préciser un motif de blocage et une date de relance.
- **Jalons** : définir les étapes clés du projet, leur date et leur réalisation.
- **Prêt à démarrer** : une checklist libre indique les préparatifs encore manquants.
- **Documents** : enregistrer des liens OneDrive/web ou des chemins de fichiers
  présents sur le PC. Les liens web s'ouvrent dans un nouvel onglet ; les chemins
  locaux se copient pour être utilisés dans l'explorateur de fichiers.
- **Contacts** : conserver les interlocuteurs du projet et attribuer un responsable
  ainsi qu'un validateur aux actions.
- **Historique et décisions** : noter les décisions et retrouver les changements
  de deadline, de statut et de priorité.
- **Revue hebdomadaire** : examiner les retards, attentes, actions à planifier et
  prochaines échéances depuis un même écran.

Les documents sont référencés, sans être téléversés dans l'application. L'envoi
automatique d'un récapitulatif par mail est reporté.

Le planning démarre avec des journées vides, sans blocs automatiques de préparation
ou de passif. **+ Séance chantier** permet de choisir le projet, sa phase et les
actions restantes à réaliser pendant un créneau. Une action cochée devient terminée
partout et reste visible dans les séances où elle figurait ; elle n'est plus proposée
pour une nouvelle séance. Les références et commentaires sont partagés avec le projet.

Les deadlines des projets, actions et jalons sont signalées par un point rouge
directement dans le rail, même sans séance planifiée. Le survol, le focus clavier
ou le clic affiche les intitulés et permet d’ouvrir leur fiche. Un repère
« Week-end » près du vendredi donne accès aux échéances du samedi et du dimanche,
avec leurs dates exactes ; les séances restent organisées du lundi au vendredi.
Les réunions récurrentes et les vues Colonnes / Chronologie sont conservées.
Les anciens blocs vierges générés automatiquement sont retirés ; les blocs qui
contiennent des informations saisies sont conservés.

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
dans `src/projects-ui.js` et `src/projects.css`. Les sections complémentaires sont
dans `src/project-details.js` et `src/project-details.css`. Le sélecteur de séances
et les échéances sont dans `src/planning-sessions-ui.js`, `src/planning-deadlines.js`
et leurs feuilles de style. Ces sources sont
réintégrées avec :

```sh
python3 tools/build.py
```

Le moteur historique, les migrations et le planning restent dans `index.html`.
Les priorités et les nouveaux suivis sont dans `src/project-engine.js`. Le build
ne requiert aucune dépendance Python externe. Ne pas modifier manuellement les
blocs `PROJECT UI` et `PROJECT ENGINE` du fichier distribué : le build les remplace.

Les tests de parcours utilisent Node.js, Playwright et Chromium :

```sh
node tests/projects.spec.cjs
node tests/priorities.spec.cjs
node tests/tranches.spec.cjs
```

`CHROMIUM_PATH` peut désigner un navigateur déjà installé. Les tests démarrent leur
propre serveur local et utilisent des données fictives dans un navigateur isolé.

Le [journal de bord](JOURNAL.md) décrit les décisions, changements et vérifications.
