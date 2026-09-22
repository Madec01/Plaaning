# Consignes du projet Plaaning

## Collaboration

- L'utilisateur a choisi une combinaison de pages projet structurées et d'un
  accueil de pilotage. Conserver une interface française, lisible et ergonomique.
- Utiliser des sous-agents pour les tâches indépendantes lorsque cela aide à
  avancer en parallèle. Choisir des modèles adaptés ; Astra est réservé à
  l'agent principal, Sol/Terra conviennent aux sous-agents.
- Consigner chaque modification dans `JOURNAL.md`, sans réécrire les entrées
  antérieures : expliquer ce qui change, pourquoi et ce qui a été vérifié.
- Terminer chaque session par un récapitulatif point par point : travail réalisé,
  vérifications, limites éventuelles et emplacement de la version livrée.

## Application

- Conserver l'utilisation hors ligne et l'ouverture directe de `index.html`.
- Les données personnelles restent locales ; ne pas ajouter de données réelles
  aux exemples, tests, captures versionnées ou au dépôt.
- Préserver les sauvegardes et migrer les données existantes sans perte silencieuse.
- Une phase, un statut, une échéance et un créneau sont des notions distinctes.
- L'urgence effective est le maximum de l'urgence automatique et manuelle.
  Calculer les seuils en jours calendaires, sans modifier la deadline lorsque
  l'on déplace un créneau. Une action terminée ne génère plus d'alerte.
- Les champs texte des tâches sont définis par projet et liés à des identifiants
  stables ; renommer leur titre ne doit pas perdre les valeurs saisies.
- Les journées nouvelles sont vides. Une séance garde ses identifiants de tâches
  sélectionnées ; terminer une tâche ne la retire pas des séances existantes.
- Un projet peut couvrir les deux tranches. Une tâche appartient à Commun, T1
  ou T2 ; les copies ont des identifiants distincts et ne partagent pas leurs coches.
  Une séance sélectionne des tâches d’une seule tranche. Les deadlines de tranche
  sont distinctes des créneaux et de l’échéance générale du projet.
- Les relations projets/actions/planning reposent sur des identifiants stables,
  jamais uniquement sur les libellés modifiables.

## Sources et vérification

- L'interface projets est dans `src/projects-ui.js` et `src/projects.css`.
  Les sections jalons, préparatifs, documents, contacts et historique sont dans
  `src/project-details.js` et `src/project-details.css`.
  Les séances et échéances du planning sont dans `src/planning-sessions-ui.js`,
  `src/planning-deadlines.js` et leurs feuilles de style.
  Exécuter `python3 tools/build.py` après modification pour mettre à jour les
  blocs générés de `index.html`.
- Le moteur historique et le planning se trouvent dans `index.html`, hors blocs
  générés. Les priorités et les suivis complémentaires sont édités dans
  `src/project-engine.js`, intégré par le build dans le bloc `PROJECT ENGINE`.
- Pour une modification de données ou de parcours, vérifier les scénarios
  concernés avec `node tests/projects.spec.cjs` (Playwright + Chromium).
  Les priorités et les nouveaux suivis sont couverts par
  `node tests/priorities.spec.cjs`, ainsi que les séances et échéances du planning.
- Les migrations, la copie et les parcours T1/T2 sont couverts par
  `node tests/tranches.spec.cjs`.
- Pour une modification visuelle, vérifier sur ordinateur et téléphone, dans
  les thèmes clair et sombre.
