# Terminus, édition Cybersup

Un jeu d'aventure textuel pour apprendre le terminal Linux : on explore un monde avec `ls` et `cd`, on parle aux habitants avec `less`, et chaque nouveau sort appris est une vraie commande.

Cette édition est un fork de [Terminus](https://github.com/mprat/terminus), créé au MIT par Michele Pratusevich et Shawn Conrad. Elle garde le même monde et la même histoire, les traduit en français, y ajoute beaucoup de notions Linux et les relie à la vie d'une école de cybersécurité.

## L'histoire

C'est le jour de la rentrée. Tu es en première année à Cybersup, ta Convocation annonce une épreuve pratique « dont le lieu et le surveillant seront communiqués en temps voulu », et l'école est sens dessus dessous : un intrus qui se fait appeler le Sorcier Noir a pris le contrôle de Terminus, le monde d'entraînement de l'école. Les M2 de la war room ont tous leur compte verrouillé. Le tien est trop neuf pour être sur sa liste. Et Laurent, le directeur pédagogique, est introuvable.

À toi d'entrer dans Terminus, d'y apprendre les sorts du terminal auprès de ses habitants, et de remonter jusqu'à la Citadelle.

## Jouer

Ouvrir `Web/index.html` dans un navigateur suffit : il n'y a rien à installer ni à compiler.

Pour le servir sur un réseau local (une salle de cours, par exemple) :

```
cd Web
python3 -m http.server 8000
```

Le jeu est alors disponible sur `http://localhost:8000`.

Au premier lancement, le jeu demande ton prénom : il devient ton identifiant sur le système (`whoami`, l'invite, les propriétaires des fichiers, le diplôme). La partie est sauvegardée automatiquement dans le navigateur. La commande `recommencer` repart de zéro, avec une nouvelle partie.

## Ce que cette édition ajoute

**43 sorts de plus** (57 au lieu de 14) :

| Notion | Sorts | Où on l'apprend |
| --- | --- | --- |
| Se déplacer, regarder | `ls` `cd` `pwd` `less` `man` `help` `clear` `exit` | dès le départ |
| Options, aide, fichiers cachés | `ls -a` `ls -l` `--help` `history` `!!` | les manuscrits du vieil homme |
| Déplacer, renommer, jokers | `mv` `*` | l'Académie des Sorts |
| Lire et comparer des textes | `cat` `head` `tail` `wc` `diff` | le Scriptorium (nouveau) |
| Permissions | `chmod` et la lecture de `rwxr-xr-x` | la stèle du Portail |
| Créer et supprimer | `rm` `mkdir` `rmdir` `touch` `cp` | le Marché, l'Atelier |
| Personnaliser son terminal | `alias` `unalias` `export` `env` `$USER` `$PWD` | le Marché |
| Liens symboliques | `ln -s` | le Marché |
| Scripts | `bash`, `./script`, le droit `x`, `#!/bin/bash` | l'Atelier |
| Chercher dans un texte | `grep` avec `-i` `-n` `-r` `-c` `-v` | la Bibliothèque |
| Redirections | `echo` `>` `>>` | la Taverne (nouveau) |
| Tuyaux | `\|` `cut` `sort` `uniq` | la Taverne (nouveau) |
| Utilisateurs et mots de passe | `whoami` `id` `passwd` `chown` | Cybersup (remplace le MIT) |
| Processus | `ps` `top` `kill` `kill -9` | Cybersup |
| Enquête dans des journaux | `grep`, `cut`, `sort`, `uniq` combinés | la war room de Cybersup |
| Chercher des fichiers | `find` `tree` | Cybersup |
| Disques et sauvegardes | `df` `du` `tar` | Cybersup |
| Tâches planifiées | `crontab` | Cybersup |
| Réseau | `hostname` `ping` `ssh` `exit` | Cybersup |
| Paquets | `apt` (et `cowsay`) | Cybersup |
| Administration | `sudo` avec un vrai mot de passe, `date` | les Fichiers du Noyau, l'Atelier |
| Empreintes et encodage | `sha256sum` `sha256sum -c` `base64` `base64 -d` | la Crypte (chapitre 2) |
| Bit SUID | `ls -l`, `find -perm -4000`, `chmod u-s`, `chmod 4755` | le Caveau (chapitre 2) |
| Sortie d'erreur | `2>` `2>>` `2>&1` `/dev/null` | le Caveau (chapitre 2) |
| Ports en écoute | `ss -tlnp` | la Racine (chapitre 2) |
| Éditer un fichier | `nano` (Ctrl+O, Ctrl+X, Ctrl+K) | la Racine (chapitre 2) |
| Clés SSH | `ssh-keygen`, clé publique et clé privée, `authorized_keys` | la SalleServeurs (chapitre 2) |

**Un terminal plus proche d'un vrai** : invite `apprenti@terminus:~/Chemin$` qui change de machine avec `ssh`, chemins relatifs et depuis `~`, `cd -`, complétion avec Tab, historique avec les flèches, guillemets et apostrophes, variables, enchaînements `;` et `&&`, messages d'erreur à la manière de Linux, indices quand une majuscule manque.

**Des pièges pédagogiques assumés** : écraser un fichier avec `>` au lieu de `>>`, `sudo cd` qui n'existe pas, `kill` refusé sur le processus d'un autre, `chmod` refusé quand on n'est pas propriétaire, un script sans le droit `x`, un lien symbolique avec une cible relative, un processus qui renaît tant que `cron` le relance, `less` qui ne suffit plus sur un fichier de 200 lignes.

**Une fin** : le jeu d'origine s'arrêtait au mot de passe sudo. Ici, il ouvre la Citadelle du Sorcier Noir, dont le combat final réutilise tout ce qui a été appris. Le Sorcier Noir se révèle être Laurent, directeur pédagogique de Cybersup : Terminus était l'épreuve pratique, et la crise de la war room était l'examen des M2.

**L'école dans le jeu** : le campus de Puteaux (accueil, feuille d'émargement, carte étudiante, tableau d'affichage, BDE et sa boutique, war room avec ses voyants et son écran mural qui suit la progression du joueur), les campus de Lille et de Marseille accessibles uniquement par `ssh`, une enquête d'analyste dans les journaux de connexion, le CTF de l'école. Après la victoire, les habitants de Terminus tombent le masque : ce sont d'anciens élèves et des intervenants. Hormis Laurent, tous les personnages sont inventés.

**De l'expérience et une note** : chaque sort appris, chaque sort utilisé pour la première fois, chaque lieu découvert et chaque quête rapportent des XP (3770 au total). Dix niveaux calqués sur le cursus (Candidat, Admis, B1, B2, B3, M1, M2, Alternant confirmé, Diplômé, Root), une barre de progression toujours visible, et une note sur 20 avec mention sur le diplôme final. La commande `xp` détaille d'où viennent les points et ce qu'il reste à gagner.

**Un bulletin** (`bulletin`) : les 52 sorts regroupés en six blocs de compétences, BC 01 à BC 06, chacun noté sur 20 et marqué « acquis » quand tous ses sorts ont été appris puis utilisés. Le relevé figure sur le diplôme.

**Un journal de quêtes** (`quetes`) avec 13 étapes principales et 27 quêtes secondaires au chapitre 1, 9 étapes et 5 quêtes secondaires au chapitre 2.

**Un deuxième chapitre, la Crypte** : après la victoire, une trappe s'ouvre sous la Citadelle. Quelqu'un est vraiment entré pendant l'examen : un programme trafiqué, un message caché en base64, une porte dérobée SUID, un faux processus noyau qui écoute sur un port, une clé SSH de trop dans les clés autorisées de root. Le chapitre se termine dans le coffre de l'école, où l'intrus attend. Il a sa propre note sur 20 et son propre certificat.

**Des parties toutes différentes** : une graine tirée au premier lancement fixe le mot de passe sudo, l'adresse de l'attaquant, le meilleur client de la taverne, le nombre de sweats du BDE et les numéros de processus. Recopier la solution du voisin ne marche pas.

**Des indices payants** (`indice`) : deux paliers par étape, de plus en plus précis, qui coûtent 30 puis 60 XP sur la note (pas sur le niveau).

**Des succès** (`succes`), **un chrono façon speedrun** (`chrono`, temps de passage à chaque étape), **des sons 8 bits** (`son`, coupés par défaut) et **une barre de touches** sur téléphone (Tab, ↑, `|`, `~`, `/`, `>`, `*`...).

## Pour les formateurs

Le déroulé complet, avec la solution de chaque étape et le barème, se trouve dans [docs/solution.md](docs/solution.md).

Repères pour la notation : finir la quête principale au plus court donne 10 sur 20 ; la solution complète donne 20 sur 20. Le diplôme final (`cat Diplome` dans la Citadelle) et le certificat du chapitre 2 (`cat CertificatCyber` dans le coffre) affichent le prénom du joueur, son score, sa note, sa mention, son temps de jeu, les indices payants utilisés, et un **code de vérification**. Ce code résume la partie et porte une somme de contrôle : une page de classement le décode, repère un code retouché et classe la promo, chapitre par chapitre.

**Séances séparées** : pour une séance de trois heures consacrée à la sécurité, les étudiants tapent `chapitre 2` dès le début. Le chapitre 1 est rejoué en silence, marqué comme non joué (pas de note pour lui), et ils commencent directement dans la Citadelle.

## Développement

Le code est du JavaScript sans dépendance ni étape de construction.

| Fichier | Rôle |
| --- | --- |
| `Web/static/javascript/GameObjects.js` | le monde : lieux, objets, personnages, textes, réactions |
| `Web/static/javascript/Shell.js` | l'interpréteur et les sorts de base |
| `Web/static/javascript/SortsAvances.js` | variables, alias, liens, scripts, archives, réseau, système, paquets |
| `Web/static/javascript/Manuel.js` | les pages de `man` et l'ordre des sorts |
| `Web/static/javascript/Chapitre2.js` | le chapitre 2 : SHA-256, base64, `nano`, `ss`, `ssh-keygen`, la Crypte et le coffre, le saut de chapitre |
| `Web/static/javascript/Partie.js` | le prénom, la graine de la partie et le code de vérification du diplôme |
| `Web/static/javascript/GameState.js` | événements de l'histoire, quêtes, expérience et barème, indices, succès, chrono, sauvegarde |
| `Web/static/javascript/Terminal.js` | l'affichage et la saisie |
| `Web/static/javascript/Room.js`, `Item.js` | les lieux (répertoires) et les objets (fichiers) |
| `tools/dessiner_images.py` | génère les illustrations ajoutées |
| `tests/parcours.js` | joue une partie complète et vérifie chaque étape (près de 500 vérifications, chapitre 2 compris) |
| `tests/solution.js` | rejoue les commandes de `docs/solution.md` et vérifie qu'elles mènent à 20 sur 20 aux deux chapitres |
| `tests/robustesse.js` | envoie 20 000 lignes aléatoires à l'interpréteur et vérifie qu'aucune ne le fait planter |

Lancer les tests après toute modification :

```
node tests/parcours.js
node tests/solution.js
node tests/robustesse.js
```

`node tests/parcours.js -v` affiche toute la partie, telle que le joueur la verrait.

Pour ajouter un sort : l'écrire dans `Shell.sorts`, lui donner une page dans `Manuel.js` et une place dans `ORDRE_DES_SORTS`, puis le faire enseigner par un objet avec `.enseigne("nom")` dans `GameObjects.js`. Le barème d'XP se recalcule tout seul.

Le dossier `Java` contient la toute première version du jeu d'origine, laissée telle quelle.

## Licence et crédits

GNU GPL version 2, comme le jeu d'origine (voir `LICENSE.md`).

Jeu d'origine : Michele Pratusevich, Shawn Conrad et leurs contributeurs, MIT. Illustrations d'origine conservées.
Édition Cybersup : Laurent Biagiotti.
