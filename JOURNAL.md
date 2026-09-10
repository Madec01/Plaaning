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

---

## 002 — Quatre propositions d'agencement
*10 septembre 2026*

### Ajouté
`docs/agencements.html` — une page autonome qui présente **quatre mises en page**
de la même semaine, en maquettes vivantes (pas des images). Un interrupteur en haut
bascule entre **semaine calme** et **semaine chargée** : les quatre maquettes changent
en même temps, ce qui permet de voir laquelle tient encore debout quand ça se remplit.

### Les quatre agencements
| | Nom | Idée |
|---|---|---|
| **A** | La grille | Calendrier vertical ; un jour se fend en couloirs quand on active une brique. |
| **B** | Le jour en colonnes | Semaine en bandeau réduit + jour choisi ouvert en grand, une colonne par brique, sous-tâches cochables. |
| **C** | Le damier de charge | 5 lignes × 2 tranches + jauge de charge par jour. Compact, sans heure précise. |
| **D** | Le rail | Une bande continue lundi→vendredi ; un chantier de 4 jours est **une barre**, pas 4 cases. |

### Recommandation retenue pour discussion
**B comme surface de travail, surmontée du rail de D.** Le rail sert à se repérer
(quels chantiers courent, où on en est dans la semaine), les colonnes en dessous servent
à exécuter. On clique un jour dans le rail, il s'ouvre en dessous.

Raison : le problème n'est pas de savoir quoi faire, c'est de ne pas se disperser.
A et C montrent les cinq jours en permanence — cinq occasions de penser à autre chose.
B n'en montre **qu'un seul net à la fois**. Le rail rattrape la seule chose que B
ne sait pas montrer : la continuité d'un chantier sur plusieurs jours.

### Système visuel posé
- **Couleurs par brique**, déclinées en thème clair et sombre : chantier ocre,
  prépa bleu, clôture vert, réception magenta, visite olive, prépa réunion cyan,
  réunion gris ardoise.
- **Le passif est délibérément terne** — gris mauve, sans relief. C'est la seule brique
  qu'on veut voir disparaître : elle ne doit pas être agréable à regarder.
- **Typographie** : Barlow Condensed (titres et étiquettes, esprit signalétique de
  chantier), IBM Plex Sans (texte), IBM Plex Mono (heures et références — OT, FNC, PA).
- **Le temps se lit en hauteur** : un bloc de 4 h fait deux fois la hauteur d'un bloc de 2 h.

### Corrections faites en cours de route
- Le décompte de colonnes oubliait la journée type : la grille débordait sur une
  deuxième ligne. Corrigé — une journée calme fait bien **2 colonnes** (prépa + passif).
- Défilement horizontal parasite sur téléphone : la largeur minimale du rail traversait
  son conteneur défilable. Bridé.
- La recommandation était montrée sur deux colonnes côte à côte alors qu'elle décrit
  un écran empilé. Remontée en un seul bloc, comme dans la réalité.

### Données d'exemple
`Bel-Air`, `Sainte-Croix`, `Verneuil`, `OT 21 447` sont **inventés**. Aucune donnée
réelle dans le dépôt, conformément à l'entrée 001.

### En attente de décision
1. Les listes de sous-tâches Chantier et Clôture sont-elles complètes ?
2. Une brique dure-t-elle une demi-journée, ou des heures précises ?
   *(Proposition : demi-journées par défaut, heures précises seulement pour le subi.)*
3. Les réunions : saisies à la main, ou lues depuis un agenda ?
   *(Proposition : à la main, pour préserver « un fichier, aucune dépendance ».)*
4. Une semaine à la fois, ou un historique ?
   *(Proposition : un historique discret, sinon impossible de montrer que le passif recule.)*

---

## 003 — L'outil, version 1
*10 septembre 2026*

### Décisions prises (réponses aux questions de l'entrée 002)
1. **Les listes de sous-tâches ne sont pas figées** — « trop complexe de tout trouver
   maintenant ». Conséquence de conception : les listes **se complètent en travaillant**.
   Chaque brique démarre avec ce qu'on connaît déjà ; on ajoute une ligne dans une colonne
   et on clique l'étoile ★ pour la garder au modèle. Elle réapparaîtra la prochaine fois.
   Un panneau « Modèles de sous-tâches » en bas de page permet de les relire et de les élaguer.
2. **Une brique peut avoir des heures précises.** Chaque colonne a un début et une fin
   réglables à 5 minutes près. Les valeurs par défaut restent des demi-journées
   (prépa 8h–12h, passif 13h–17h) mais rien n'est verrouillé.
3. **Les réunions se saisissent à la main.** Aucun agenda branché, aucune dépendance.
4. **Un petit historique.** Les semaines sont conservées ; le bandeau du haut montre les
   heures de passif des **six dernières semaines** et l'écart avec la semaine précédente.
5. **Agencement retenu : B + le rail de D**, conforme à la recommandation de l'entrée 002.

### Ajouté
`index.html` — l'application, en un seul fichier, sans dépendance ni serveur.

- **Le rail** en haut : la semaine entière, lundi→vendredi, le temps de gauche à droite.
  Un chantier présent plusieurs jours de suite se fusionne en **une seule barre**
  (« Chantier · Bel-Air — 4 jours »). Chaque en-tête de jour affiche ses heures engagées,
  en orange au-delà de 9 h. On clique un jour, ou directement un bloc, pour l'ouvrir.
- **Le jour ouvert** en dessous : une colonne par brique. La rangée
  « Activer une colonne » ajoute chantier, clôture, réception, visite, prépa réunion
  ou réunion. **Le bouton Réception porte un repère « jeudi » quand on est jeudi** ; les
  autres jours, il fonctionne quand même mais rappelle que les réceptions se calent le jeudi.
- **La journée type est là par défaut** : toute journée neuve arrive avec Prépa 8h–12h
  et Passif 13h–17h. On peut retirer l'une ou l'autre ; une rangée « Remettre la journée
  type » permet de la ramener.
- **Prépa dossiers n'a pas de sous-catégorie**, seulement le nom du dossier — comme demandé.
- **Bilan** : heures de passif de la semaine, écart avec la précédente (▼ en vert quand
  ça recule), courbe des six dernières semaines, et total engagé.
- Thème clair / sombre, et tout est utilisable au doigt.

### Stockage
`localStorage`, clé `plaaning.v1`. **Rien ne part sur le réseau.** Le dépôt reste vide de
données réelles, conformément à l'entrée 001.

### Publié
- Application utilisable immédiatement : <https://claude.ai/code/artifact/4cd9348b-9b83-4c7a-8f36-136788358d08>
- Maquettes de l'entrée 002 : <https://claude.ai/code/artifact/889d4a26-aab9-494f-abf0-0e8761efc805>

### Corrections faites en cours de route
- Les champs d'heure étaient trop étroits : dans un navigateur réglé en anglais, le
  « AM/PM » se faisait couper. Largeur rendue souple, vérifié en français et en anglais.
- Un bloc d'une heure dans le rail affichait un libellé tronqué qui ressemblait à un bug.
  En dessous de trois heures, le bloc n'affiche plus que sa couleur ; le détail est dans
  l'infobulle.

### En attente de décision
- **Publier en GitHub Pages** pour avoir une URL permanente : à activer dans
  *Settings → Pages → Source : branche `main`, dossier `/ (root)`*.
- Le nom du dépôt garde sa coquille (`Plaaning`).
- À l'usage : faut-il pouvoir **reporter au lendemain** une sous-tâche non faite,
  et **recopier une semaine** sur la suivante ?
