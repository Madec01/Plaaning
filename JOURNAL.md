# Journal de bord — Plaaning

Document de référence du projet. **Chaque modification et chaque ajout y est transcrit**,
dans l'ordre chronologique, avec la raison de la décision. On ne revient jamais sur une
entrée passée : si une décision change, on ajoute une nouvelle entrée qui l'annule.

---

## 001 — Cadrage du besoin
*10 septembre 2026*

### Le problème à résoudre
Je me disperse vite. L'outil ne sert pas à *lister* ce que j'ai à faire — ça, les mails
et les tableurs le font déjà — il sert à **me tenir dans un cadre visuel** : voir d'un
coup d'œil à quoi ressemble ma semaine, et où je dérive.

Conséquence directe sur la conception : l'outil doit être **visuel avant d'être textuel**.
Une case qu'on lit à 2 mètres vaut mieux qu'une ligne qu'on doit ouvrir.

### La journée type (le fond de carte)
C'est la base, ce qui reste quand rien d'autre n'est planifié :

| Moment | Bloc par défaut | Durée |
|---|---|---|
| Matin | **Prépa dossiers** | ~4 h |
| Après-midi | **Passif** | ~4 h |

Si une journée est vide, elle n'est pas vide : elle affiche Prépa le matin et Passif
l'après-midi. Le fond de carte se fait **grignoter** quand on ajoute des briques.

### Les 4 briques journalières
Elles peuvent être seules, à deux, ou toutes ensemble dans une même journée.

1. **Chantier en cours** — sous-tâches : surveillance, CR+1N, retours mail,
   FNC à traiter, PA à traiter, *(liste à compléter)*
2. **Prépa dossiers** — pas de sous-catégorie. Seul champ : **le nom du dossier**.
3. **Passif** — fourre-tout : vieux mails à traiter, vieilles choses à clôturer,
   à faire signer, à remplir. *Voué à décroître avec la nouvelle organisation.*
4. **Clôture de dossier** — sous-tâches : envoi PVRC, PVRF, clôture de l'OT,
   réalisation de la FEP, clôture des FNC et PA, *(liste à compléter)*

### Les modules ponctuels
Moins fréquents, pas tous les jours, mais ils doivent trouver leur place :

- **Réception de travaux** — quand les travaux sont finis, pour lancer le paiement.
  Contrainte : **quand il y en a une, c'est le jeudi**, ~1 h. Il n'y en a pas toutes
  les semaines.
- **Préparation de réunions**
- **Visites terrain**
- **Réunions classiques** — subies, elles s'imposent à l'agenda.

### La mécanique centrale : activer une colonne
Demande formulée telle quelle :

> « Si j'ai un chantier je veux pouvoir **activer une colonne** dans le jour dédiée
> au chantier, pour m'organiser, car j'ai de la surveillance par exemple. »

C'est le cœur du fonctionnement : **un jour n'est pas une colonne unique, c'est un jour
qui peut se subdiviser en couloirs** quand on y active une brique. Le fond de carte
recule d'autant.

### Décisions prises
- **Dépôt** : `Madec01/Plaaning`, public, vide au départ.
  *(Le nom comporte une coquille — « Plaaning » au lieu de « Planning ». Assumé pour
  l'instant, voir entrée suivante si renommage.)*
- **Public mais sans données** : le dépôt est public pour permettre un accès mobile via
  GitHub Pages. En contrepartie, **aucune donnée réelle n'est stockée dans le dépôt** :
  noms de chantiers et de dossiers restent dans le navigateur du téléphone.
- **Sans dépendance ni serveur** : une page HTML autonome, ouvrable hors ligne.

### En attente de décision
- Le choix de l'agencement (plusieurs propositions à comparer visuellement).
- Le complément des listes de sous-tâches marquées *(liste à compléter)*.
