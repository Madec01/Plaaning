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

---

## 004 — Les fiches se lient, et rien ne se perd
*10 septembre 2026*

C'est la modification la plus structurante depuis le début : l'état ne vit plus dans
la case d'un jour, il vit dans une **fiche attachée à un dossier**.

### Le problème posé
> « Je prépare le dossier PNPE3270, ensuite je fais le chantier PNPE3270, ensuite je
> clôture le dossier PNPE3270. […] Une prépa se fait sur plusieurs semaines : quand
> le lundi 01/10 j'ai préparé un truc et que je reprends le 15/10, il faut que la
> nouvelle fiche réaffiche ce qui était coché et les commentaires. »

En v1, les sous-tâches appartenaient à la colonne. Deux colonnes du même dossier à
deux dates étaient donc deux listes sans rapport. C'était faux.

### Ce qui change
Une colonne dans un jour n'est plus qu'une **séance** : un créneau de travail. Ce qui
est coché, commenté et planifié appartient à une **fiche**, identifiée par
`brique + nom du dossier`.

- **Le nom du dossier fait le lien.** Tu tapes `PNPE3270` dans une colonne Chantier :
  s'il existe déjà une fiche Chantier de ce dossier, elle **revient telle quelle**, et
  l'outil te le dit — *« Fiche PNPE3270 · Chantier en cours retrouvée — 3 lignes déjà
  cochées, 1 commentaire. »*
- **Les noms déjà utilisés sont proposés** à la saisie, pour qu'une faute de frappe ne
  casse pas le lien.
- Prépa, Chantier, Clôture et Réception d'un même dossier restent **des fiches
  distinctes** — elles ne partagent pas leurs cases à cocher. C'est volontaire : ce sont
  trois moments différents du même dossier, pas la même liste.
- Une colonne sans nom (Passif, Réunion, une Visite ponctuelle) garde une fiche à elle,
  locale à ce jour-là. Rien ne change pour elles.

### Ajouté
- **Des dates sur les dossiers.** Toute fiche nommée (chantier, prépa, clôture,
  réception) a un `du … au …`, avec un repère calculé : *dans 5 j*, *J4 sur 12*,
  *terminé*.
- **Des commentaires partout.** Une note par fiche — elle suit le dossier d'une séance
  à l'autre — et une note par sous-tâche. Les notes existantes restent visibles sans
  qu'on ait à cliquer.
- **Une heure et une durée par sous-tâche**, facultatives. Quand elles sont posées,
  la sous-tâche **apparaît dans le rail** comme un bloc plein, distinct des séances.
  Un bloc trop court pour porter son nom l'affiche à côté de lui.
- **« Resté en plan »**, la réponse à *comment on gère ce qui n'a pas été fait*.
  Au-dessus du jour, la liste des fiches dont **toutes les séances sont passées** et
  qui gardent des lignes non cochées, avec un bouton **Reporter** qui ouvre la fiche
  sur le jour choisi — sans rien perdre de ce qui était déjà fait.

### Décision annulée
L'entrée 001 disait : *« Prépa dossier restera un bloc où je n'aurai pas de
sous-catégorie. »* **Ce n'est plus vrai.** Prépa dossiers a désormais son modèle :
**Prise en compte, Régimes, PDS, ADR, FEP, Logistique.** Le nom du dossier reste, et
devient en plus la clé de liaison.

### Migration
Les données v1 sont converties automatiquement au premier chargement : chaque colonne
nommée devient une fiche, les cases cochées sont conservées. Le stockage est réécrit
au format v2 dans la foulée. Les clés de semaine passent de `2026-S37` à la date du
lundi (`2026-09-07`), ce qui permet de dater les séances passées — nécessaire au
calcul de ce qui est resté en plan.

### Corrections faites en cours de route
- **« Resté en plan » était inutilisable** : il remontait chaque colonne Prépa créée
  par défaut et jamais touchée, soit dix lignes de bruit. Une journée type n'est pas
  un engagement — seules comptent désormais les fiches **nommées**, ou celles où
  quelque chose a été coché, commenté ou planifié.
- **L'édition redessinait trop.** Passer du champ « du » au champ « au » détruisait le
  champ visé et faisait perdre le focus. Les heures de séance, les dates et la
  planification ne redessinent plus que ce qu'elles changent.
- Le bouton *Reporter* lisait une brique que le rendu n'écrivait pas : il ne
  fonctionnait pas.
- La ligne de dates se cassait en deux avec le « au » orphelin en fin de ligne.

### En attente de décision
- Faut-il **recopier une semaine** sur la suivante ?
- Une fiche terminée doit-elle **disparaître** des propositions de noms, ou rester
  consultable ?
- Le rail doit-il montrer la **période du chantier** (les dates) en plus des séances ?

---

## 005 — Les dates portent le chantier toutes seules
*10 septembre 2026*

### Décisions prises
1. **Pas de recopie d'une semaine sur l'autre.** *« Un chantier, je connais les dates
   de fin, donc si ça dure un mois ça se reportera automatiquement. »* La période
   remplace la recopie : on saisit les dates une fois, et le chantier se montre de
   lui-même sur toutes les semaines qu'il traverse.
2. **Les dossiers terminés restent proposés**, mais en dernier et étiquetés
   *« terminé le JJ/MM »*.
3. **Le rail doit montrer qu'un chantier court toute la semaine, et lequel.**
   Ce qui **annule la recommandation de l'entrée 004**, où j'avais conseillé de ne pas
   afficher les périodes dans le rail au motif que ça le rendrait illisible. C'était
   à côté : la période est justement le repère qui manquait.

### Ajouté
- **Un bandeau de périodes** en haut du rail, séparé des séances par un trait. Chaque
  dossier daté y trace une pastille sur les jours qu'il couvre, avec son repère
  (*J9 sur 38*). Les flèches **◀** et **▶** disent qu'il a commencé avant lundi ou
  qu'il continue après vendredi. C'est là qu'on lit d'un coup d'œil ce qui court cette
  semaine, et lequel.
- **« En cours ce jour-là »** : dans la rangée d'activation, les dossiers dont la
  période couvre le jour ouvert sont proposés en un clic, déjà nommés.
- **Une période encore en cours ne compte plus comme « resté en plan ».** Un chantier
  qui court jusqu'au 9 octobre n'est pas en retard le 10 septembre.

### Corrigé
- **Les dates n'étaient pas accessibles sur un chantier.** Elles existaient depuis
  l'entrée 004 mais ne s'affichaient qu'une fois le dossier nommé — donc invisibles au
  moment où on active la colonne. Elles sont désormais toujours là sur Chantier,
  Clôture et Réception. *(Prépa dossiers garde la condition : cette colonne est créée
  par défaut tous les jours, une ligne de dates vide partout serait du bruit.)*
  Quand une date est posée sans nom de dossier, une astuce explique que le rail ne
  peut pas encore montrer la période.
- **Les périodes étaient mal placées dans le rail.** Elles passaient par le calcul de
  position des séances, qui recalcule les bornes à partir d'heures — les périodes,
  elles, sont bornées en jours. Leurs bornes étaient donc écrasées par `NaN`, et la
  barre s'affichait sur une seule colonne au lieu de sa vraie étendue.
- **Changer une date ne rafraîchissait pas le rail** : la période n'apparaissait
  qu'après avoir changé de semaine.

### En attente de décision
- Faut-il que le chantier **crée aussi la colonne** automatiquement sur chaque jour de
  sa période, plutôt que de la proposer en un clic ? *(Choix actuel : proposer. Créer
  d'office bloquerait des heures tous les jours d'un chantier d'un mois et gonflerait
  le total engagé, alors qu'on n'est pas dessus tous les jours.)*

---

## 006 — Reprendre une prépa vingt jours après
*10 septembre 2026*

### La question posée
> « Et pour les liens entre colonnes, si je continue ma prépa 20 jours après pour un
> dossier, je retrouve la même colonne ? »

### La réponse, vérifiée
Oui. Scénario joué de bout en bout : prépa `PNPE3270` le lundi 7 septembre — deux
lignes cochées (Prise en compte, Régimes), un commentaire sur la ligne ADR, une note
de fiche. Saut de trois semaines, lundi 28 septembre. On tape `PNPE3270` dans la
colonne Prépa, et tout revient : les cases cochées, le commentaire de ligne, la note
de fiche. L'outil l'annonce — *« Fiche PNPE3270 · Prépa dossiers retrouvée —
3 lignes déjà cochées, 1 commentaire. »*

**Trois chemins** mènent à la même fiche :
1. **Taper le nom du dossier** dans la colonne. Les noms connus sont proposés.
2. **« En cours ce jour-là »** — si la fiche a des dates qui couvrent ce jour, elle est
   proposée en un clic, déjà nommée.
3. **« Resté en plan »** — si toutes ses séances sont passées et qu'il reste des lignes
   à faire, elle remonte d'elle-même avec un bouton *Reporter*.

### Corrigé — un trou trouvé en écrivant le test
Cocher une ligne **avant** de nommer la colonne, puis taper le nom d'un dossier
existant, faisait perdre la coche : la fiche retrouvée écrasait ce qu'on venait de
faire. C'est pourtant le geste naturel — on ouvre sa journée, on coche, on nomme
ensuite. Reprendre une fiche existante **fusionne** désormais ce qui vient d'être fait :
coches, commentaires de ligne et heures posées sont repris, et une ligne absente de la
fiche y est ajoutée. La note de fiche n'est reprise que si la fiche n'en avait pas,
pour ne rien écraser.

### Limite assumée
Prépa, Chantier, Clôture et Réception d'un même dossier restent **quatre fiches
distinctes** : cocher « Régimes » en prépa ne coche rien dans le chantier. Le lien
entre elles est le nom, pas l'avancement.

---

## 007 — Une période sans nom reste une période
*10 septembre 2026*

### Le défaut signalé
> « Quand je mets les dates du chantier, ça ne l'affiche pas dans le rail. »

### Ce qui se passait
Reproduit en jouant les cinq cas de figure. Un seul échouait, et c'était le plus
courant : **des dates saisies sans avoir nommé le dossier**. Le bandeau de périodes ne
regardait que les fiches nommées — une fiche sans nom n'a pas de clé parlante, donc
elle était ignorée. On activait un chantier, on posait ses dates, et il ne se passait
rien.

Erreur de conception de ma part : **une période existe dès qu'il y a des dates.** Le
nom sert à savoir *lequel*, son absence ne doit pas la rendre invisible.

### Corrigé
- La barre s'affiche maintenant même sans nom de dossier — étiquetée simplement
  « Chantier ». Nommer le dossier ajoute son identité, ce n'est plus une condition
  d'existence. *(La brique d'une fiche non nommée est retrouvée à partir des colonnes
  qui la portent.)*
- L'astuce affichée sous les dates disait « nomme le dossier pour le voir courir dans
  le rail » — c'est devenu faux. Elle est remplacée par la seule information qui
  manquait vraiment : **« période hors de la semaine affichée »**, quand les dates ne
  touchent pas la semaine qu'on regarde. C'était l'autre façon de ne rien voir sans
  comprendre pourquoi.

### Les cinq cas, tous vérifiés
| Cas | Résultat |
|---|---|
| Dates sans nom | `Chantier — J3 sur 4` |
| Nom puis dates | `Chantier · PNPE3270 — J3 sur 4` |
| Dates puis nom | `Chantier · PNPE3270 — J3 sur 4` |
| Nom + seulement la date de fin | `Chantier · PNPE9999 — fin dans 1 j` |
| Période sur une semaine future | rien cette semaine (+ l'astuce), la barre deux semaines plus tard |

---

## 008 — Le lien porte sur le dossier, jamais sur l'avancement
*10 septembre 2026*

Décision confirmée, et désormais close.

> « Oui c'est ça, pas de lien avec l'avancement. »

Prépa, Chantier, Clôture et Réception d'un même dossier sont **quatre fiches
indépendantes**. Le nom du dossier les rassemble — il les retrouve, les propose à la
saisie, trace leur période dans le rail — mais **chacune garde son propre avancement**.

Cocher « Régimes » dans la prépa de `PNPE3270` ne coche rien dans le chantier
`PNPE3270`. C'est voulu : ce sont trois moments distincts du même dossier, pas une
liste unique. « Envoi PVRC » n'a rien à faire dans une prépa, et « Régimes » n'a rien
à faire dans une clôture.

**Ce que le nom partage** : l'identité du dossier, sa présence dans les noms proposés,
sa période et ses dates *(propres à chaque fiche)*, et le fait de retrouver une séance
passée.
**Ce que le nom ne partage pas** : les cases cochées, les commentaires, les heures
posées sur les sous-tâches.

Aucune modification du code : c'est le comportement en place depuis l'entrée 004.
Cette entrée ne fait que fermer la question restée ouverte.

---

## 009 — Le planning prend toute la page
*11 septembre 2026*

### Le défaut signalé
> « Le planning devrait prendre toute la page, tu as laissé de grosses marges à droite
> et à gauche. »

Exact. Le conteneur était plafonné à **1240 px** et centré : sur un écran de 1920 px,
ça abandonnait 340 px de chaque côté. Un plafond de lecture a du sens pour un texte
suivi ; il n'en a aucun pour un planning, où chaque pixel de largeur est du temps
affiché en plus.

### Corrigé
- Le plafond saute. La page occupe toute la largeur, avec une gouttière qui respire
  sans coller au bord : `clamp(12px, 1.2vw, 26px)` — 12 px sur téléphone, 26 px sur
  grand écran.
- **Le rail y gagne le plus** : les noms de dossiers ne sont plus tronqués.
  `Chantier · PNPE3270` et `Prépa · PNPE3418` s'affichent en entier au lieu de finir
  en points de suspension.
- Seul le texte suivi garde une largeur de lecture (le pied de page, l'explication des
  modèles), parce qu'une ligne de 1900 px ne se lit pas.
- Au-delà de 1500 px, la largeur minimale d'une colonne passe de 212 à 260 px, pour
  éviter que l'espace gagné ne serve qu'à multiplier des colonnes étroites.

Vérifié sans débordement horizontal à 1920, 1280 et 390 px.

### Corrigé aussi — trouvé sur la capture
« Resté en plan » proposait de **reporter une fiche déjà ouverte sur le jour affiché** :
on regardait jeudi, et il conseillait de reporter sur jeudi une fiche qui s'y trouvait
déjà. Le clic était sans effet — un message disait « déjà ouverte » — mais c'était du
bruit dans un bandeau qui doit rester court pour être lu. Une fiche présente sur le
jour affiché n'y figure plus.

---

## 010 — La régie et l'établi
*11 septembre 2026*

### Les demandes
> « J'aimerais que le rail et le détail en dessous soient plus facilement
> différenciables. Regarde comment rendre un planning ergonomique avec les jeux de
> couleur. »
> « De même, je voudrais une séparation visuelle entre le matin et l'après-midi. »

### Le diagnostic
Les deux zones reposaient sur **le même plan** — ni le rail ni le jour n'avaient de
fond propre — et partageaient **la même signature de carte** : fond clair teinté,
bordure, bord gauche coloré. Deux zones au même niveau, dessinées pareil : l'œil
n'avait aucune raison de les séparer.

### Le principe retenu : la régie et l'établi
Trois canaux changent en même temps, pour que la séparation survive à un écran mal
calibré ou à un coup d'œil de biais.

1. **La valeur.** Le rail devient une **régie sombre** (`#1B2130` en thème clair,
   `#080B12` en sombre), encastrée, avec une ombre projetée vers le bas. Le détail du
   jour devient un **établi clair** (`#EDF1F7` / `#151A23`). Règle invariante dans les
   deux thèmes : *le rail est la surface la plus sombre de l'écran, les cartes la plus
   claire.* Le bandeau de bilan rejoint la régie : tout ce qui parle de la semaine est
   dans le même plan.
2. **La couleur change de rôle, pas de teinte.** Dans le rail, un bloc peut faire 40 px
   de large : il n'y a pas la place d'écrire, donc **la couleur est l'étiquette**. Dans
   une carte, l'en-tête dit « Chantier en cours » en toutes lettres — la couleur y est
   redondante. Les cartes sont donc **neutralisées** : fond et en-tête gris, la couleur
   réduite à un **filet de 3 px en tête** et une **pastille** avant le titre.
   Les teintes ne changent jamais d'une zone à l'autre — seul leur traitement change.
3. **La forme dit le statut.** Dans le rail : la **journée type se dessine** (contour
   pointillé, c'est le fond de carte, pas un engagement), une **séance se remplit**
   (aplat plein), une **sous-tâche à heure fixe** est une gélule, une **période** est une
   pastille en contour. Quatre poids visuels, lisibles sans lire.

### Une rampe de couleurs pour fond sombre
Les tons purs (`#C2650A`, `#75892A`…) sont en luminance moyenne : lavés sur fond clair,
ils se séparent enfin sur fond sombre. Une **rampe « rail »** a été ajoutée, mêmes
teintes remontées en luminosité, avec une encre de bloc à `#11151E` :
chantier `#E08A1E`, prépa `#6E8FE0`, clôture `#26936D`, réception `#E06BB4`,
visite `#A8C13C`, prépa réunion `#35AFC9`, réunion `#737E94`, passif `#565169`
(seul à garder une encre claire — il reste éteint, c'est la brique qu'on veut voir
disparaître). **Un seul jeu pour les deux thèmes**, puisque le rail est sombre partout.

Clôture a été descendue de `#2FA97F` à `#26936D` pour creuser l'écart de luminance avec
Chantier : en deutéranopie — 8 % des hommes — ocre, olive et vert se rapprochent
dangereusement, et l'écart de valeur est ce qui les sépare encore.

### Le lien entre les deux zones
Le jour sélectionné dans le rail prend **la couleur exacte de l'établi**, et une
**encoche descend** du rail vers lui. La colonne choisie perce littéralement la régie.

### Matin / après-midi
La journée se lit maintenant en **deux temps**, séparés par un trait et un intertitre
portant la plage horaire et les heures engagées de la demi-journée. Bascule à **12h30**.
Une colonne est classée par son heure de début ; celle qui franchit midi (un chantier
8h–16h) porte la mention **« franchit midi »**.

### Contraste
`--ink-3` passe de `#737C8F` à `#6A7285` : l'ancien était à 4,19:1 sur blanc, sous le
seuil AA pour du petit corps.

### Corrigé — un bug introduit par la refonte elle-même
La greffe des tons de rail sur les huit briques a été faite par expression régulière,
et **le point-virgule manquait** : `--bp:var(--chantier-pure) --br:var(--chantier-rail)`.
Les deux déclarations étaient invalides. Résultat : les blocs du rail sans aplat
(texte sombre sur fond sombre, illisibles) **et** les filets colorés absents des cartes.
Repéré à l'œil sur la capture, confirmé en inspectant les styles calculés plutôt qu'en
devinant. Huit règles corrigées.

### Note sur la méthode
L'analyse d'ergonomie couleur a été confiée à un agent. Sa recommandation principale —
régie sombre + neutralisation de l'établi, les deux étant indissociables — a été suivie.
Deux points ont été écartés volontairement : les cases cochées gardent la couleur de
leur brique (elle aide à savoir dans quelle colonne on descend), et les lignes faites
restent barrées.

---

## 011 — Le rail était trop sombre
*11 septembre 2026*

### Le défaut signalé
> « Y a du mieux, mais le bandeau rail est trop sombre et illisible maintenant. »

Capture à l'appui, sur une **semaine vide**. C'est là que le défaut saute : une semaine
vide n'est faite que de journée type, et j'avais dessiné la journée type en **contour
pointillé ténu** sur un aplat **quasi noir** (`#1B2130`). Résultat : un grand pavé sombre
rempli de traits à peine visibles. Le parti pris « régie sombre » ne payait que sur une
semaine chargée — c'est-à-dire précisément pas la situation de départ.

Mauvais arbitrage de ma part : j'ai suivi la recommandation de l'agent jusqu'au bout
sans la confronter au cas le plus fréquent.

### Corrigé
- **Le plan du rail remonte** de `#1B2130` à `#333C50` (ardoise moyenne) en thème clair,
  et de `#080B12` à `#2A3245` en sombre. La séparation d'avec l'établi reste franche —
  c'est un écart de valeur énorme dans les deux cas — mais le plan cesse d'être un trou.
- **La journée type devient lisible** : un fond à `rgba(255,255,255,.07)`, un **libellé
  en encre claire** (et non plus dans le ton de la brique), et le pointillé de brique
  conservé en bordure. Elle reste manifestement « non engagée » par sa forme, sans être
  illisible.
- **Le passif remonte** de `#565169` à `#8F88A6`. L'ancien ton était si sombre qu'il
  disparaissait sur le plan du rail. Il reste le plus terne des huit — c'est voulu —
  mais terne n'est pas invisible.
- Les neutres de la zone semaine remontent d'un cran, et les numéros de semaine de la
  courbe passent de 8,5 à 9,5 px.

### Corrigé aussi — trouvé sur la capture de vérification
- **L'onglet du jour sélectionné avait une encre illisible.** Il prend le fond clair de
  l'établi (c'est le lien entre les deux zones), mais gardait les neutres clairs du rail :
  texte pâle sur fond pâle. Trois jetons dédiés (`--tab-ink`, `--tab-ink-2`,
  `--tab-accent`) lui donnent l'encre de la zone où il atterrit, dans les deux thèmes.
- Les numéros de semaine de la courbe du passif étaient **coupés** par le bord du bandeau.

### Vérification
Contraste mesuré, et non jugé à l'œil, sur les **douze éléments de texte** du rail dans
les deux thèmes : tous au-dessus de 4,5:1 (le plus bas à 4,75 pour les durées de journée
type en 9,5 px).

Le premier script de mesure mentait : il ne **compositait pas les fonds semi-transparents**
et lisait `rgba(255,255,255,.07)` comme du blanc pur, annonçant 1,07:1 là où le vrai
rapport est 8,29:1. Corrigé avant de conclure quoi que ce soit.

---

## 012 — Des tuiles, et le planning qui se recale tout seul
*11 septembre 2026*

### Le défaut signalé
> « Je n'aime pas trop le blanc, c'est trop criard avec les fonds sombres. Je voudrais
> que les tuiles des jours dans le rail aient une couleur un peu différente du fond
> sombre, là c'est moche. »

Deux problèmes distincts, tous deux fondés :
1. L'onglet du jour sélectionné était un **aplat quasi blanc** posé sur le rail sombre.
   Je l'avais choisi pour qu'il prenne exactement la couleur de l'établi — c'était le
   dispositif de lien entre les deux zones. Mais un blanc franc sur de l'ardoise, c'est
   un phare : ça criait plus que ça ne reliait.
2. Les quatre autres jours n'avaient **aucun fond du tout** — juste un trait de
   séparation. Ils ne se lisaient pas comme des objets cliquables, ils flottaient.

### Corrigé
- **Les cinq jours sont devenus des tuiles** : un fond légèrement plus clair que le
  plan du rail, une bordure, des coins supérieurs arrondis, un écart de 5 px entre
  elles. Elles se lisent enfin comme des onglets.
- **Plus aucun blanc dans le rail.** L'onglet actif passe à une **ardoise bleutée**
  (`#4C5F88` en clair, `#41547C` en sombre), nettement plus claire que ses voisines et
  teintée d'accent, avec un filet d'accent en tête. Le lien avec l'établi ne repose plus
  sur une égalité de couleur mais sur la **position et l'encoche**, qui prend elle aussi
  cette ardoise bleutée au lieu du blanc.

Contraste revérifié sur les douze éléments de texte du rail : tous au-dessus de 4,5:1
dans les deux thèmes.

### Le planning s'ouvre sur aujourd'hui
> « Je veux aussi que ça se mette automatiquement au jour actuel quand j'ouvre l'appli. »

L'application s'ouvrait **déjà** sur le jour courant — mais deux cas la mettaient en
défaut, et ce sont sans doute ceux-là qui ont été vécus :

1. **Un onglet laissé ouvert.** La semaine et le jour sont calculés au chargement.
   Un onglet ouvert la veille restait sur la veille : rouvrir l'onglet ne recharge rien.
   Désormais, au retour sur la page, **si la date a changé depuis le chargement**, le
   planning se recale sur aujourd'hui et le dit. La condition est importante : sans
   elle, revenir sur l'onglet arracherait la semaine qu'on est en train de consulter
   volontairement.
2. **Le week-end.** Samedi et dimanche affichaient le vendredi écoulé. Ils ouvrent
   maintenant sur le **lundi suivant** — pour un planning de travail, c'est le prochain
   jour utile qui compte, pas le dernier.

Ajouté aussi : une **pastille sur la tuile du jour**, pour repérer aujourd'hui même en
consultant une autre semaine. Et le bouton « Cette semaine » passe par le même calcul.

Vérifié en simulant l'horloge : mercredi, samedi, dimanche, et le passage de minuit sur
un onglet resté ouvert — y compris le cas où l'on consulte une autre semaine le même
jour, qui ne doit surtout pas bouger.

---

## 013 — La tranche du jour
*11 septembre 2026*

### La demande
> « Je veux que la partie du rail concernée par le jour change de couleur aussi. »

Juste : l'onglet seul marquait le jour choisi **au-dessus** du rail, mais la tranche
verticale correspondante — là où se trouvent réellement ses blocs — restait indistincte
des quatre autres jours.

### Ajouté
Une **bande verticale** sur la largeur du jour ouvert, courant du haut du corps du rail
jusqu'en bas : un lavis bleuté (`rgba(147,175,240,.17)`) délimité par un trait de chaque
côté dans l'ardoise de l'onglet, avec les coins inférieurs arrondis pour rejoindre
l'encoche.

Le jour choisi se lit désormais **d'un bout à l'autre** : onglet → bande → encoche →
détail en dessous. Un seul geste de l'œil.

Le lavis est volontairement discret : c'est un fond, pas un objet. Après la remarque sur
le blanc criard de l'entrée 012, la règle est posée — dans le rail, ce qui signale ne
doit jamais crier plus fort que ce qui informe.

### Détail technique
La bande est positionnée en absolu sur le corps du rail, à
`left: 5px + (100% − 10px) × jour / 5` et de largeur `(100% − 10px) / 5`, pour tomber
exactement sur les dix colonnes du jour dans la grille de cinquante. Elle passe **sous**
les blocs (`z-index:0`, les couloirs à `1`) pour ne rien assombrir.

Vérifié sur lundi, mercredi et vendredi : la bande se pose à 0 %, 40 % et 80 % de la
largeur, sur 20 % à chaque fois.
