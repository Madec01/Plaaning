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
- Les relations projets/actions/planning reposent sur des identifiants stables,
  jamais uniquement sur les libellés modifiables.

## Sources et vérification

- L'interface projets est dans `src/projects-ui.js` et `src/projects.css`.
  Exécuter `python3 tools/build.py` après modification pour mettre à jour les
  blocs générés de `index.html`.
- Le moteur et le planning se trouvent dans `index.html`, hors blocs `PROJECT UI`.
- Pour une modification de données ou de parcours, vérifier les scénarios
  concernés avec `node tests/projects.spec.cjs` (Playwright + Chromium).
- Pour une modification visuelle, vérifier sur ordinateur et téléphone, dans
  les thèmes clair et sombre.
