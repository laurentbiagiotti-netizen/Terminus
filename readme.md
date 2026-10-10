# Terminus, édition Cybersup

Un jeu d'aventure textuel pour apprendre le terminal Linux : on explore un monde avec `ls` et `cd`, on parle aux habitants avec `less`, et chaque nouveau sort appris est une vraie commande.

Cette édition est un fork de [Terminus](https://github.com/mprat/terminus), créé au MIT par Michele Pratusevich et Shawn Conrad. Elle garde le même monde et la même histoire, les traduit en français, et y ajoute beaucoup de notions Linux.

## Jouer

Ouvrir `Web/index.html` dans un navigateur suffit : il n'y a rien à installer ni à compiler.

Pour le servir sur un réseau local (une salle de cours, par exemple) :

```
cd Web
python3 -m http.server 8000
```

Le jeu est alors disponible sur `http://localhost:8000`.

La partie est sauvegardée automatiquement dans le navigateur. La commande `recommencer` repart de zéro.

## Ce que cette édition ajoute

**38 sorts de plus** (52 au lieu de 14) :

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
| Chercher des fichiers | `find` `tree` | Cybersup |
| Disques et sauvegardes | `df` `du` `tar` | Cybersup |
| Tâches planifiées | `crontab` | Cybersup |
| Réseau | `hostname` `ping` `ssh` `exit` | Cybersup |
| Paquets | `apt` (et `cowsay`) | Cybersup |
| Administration | `sudo` avec un vrai mot de passe, `date` | les Fichiers du Noyau, l'Atelier |

**Un terminal plus proche d'un vrai** : invite `apprenti@terminus:~/Chemin$` qui change de machine avec `ssh`, chemins relatifs et depuis `~`, `cd -`, complétion avec Tab, historique avec les flèches, guillemets et apostrophes, variables, enchaînements `;` et `&&`, messages d'erreur à la manière de Linux, indices quand une majuscule manque.

**Des pièges pédagogiques assumés** : écraser un fichier avec `>` au lieu de `>>`, `sudo cd` qui n'existe pas, `kill` refusé sur le processus d'un autre, `chmod` refusé quand on n'est pas propriétaire, un script sans le droit `x`, un lien symbolique avec une cible relative, un processus qui renaît tant que `cron` le relance, `less` qui ne suffit plus sur un fichier de 200 lignes.

**Une fin** : le jeu d'origine s'arrêtait au mot de passe sudo. Ici, il ouvre la Citadelle du Sorcier Noir, dont le combat final réutilise tout ce qui a été appris. Le Sorcier Noir se révèle être Laurent, directeur pédagogique de Cybersup : toute l'aventure était un examen.

**De l'expérience et une note** : chaque sort appris, chaque sort utilisé pour la première fois, chaque lieu découvert et chaque quête rapportent des XP (3500 au total). Dix niveaux, de « Touriste du terminal » à « Root », une barre de progression toujours visible, et une note sur 20 avec mention sur le diplôme final. La commande `xp` détaille d'où viennent les points et ce qu'il reste à gagner.

**Un journal de quêtes** (`quetes`) avec 13 étapes principales et 22 quêtes secondaires.

## Pour les formateurs

Le déroulé complet, avec la solution de chaque étape et le barème, se trouve dans [docs/solution.md](docs/solution.md).

Repères pour la notation : finir la quête principale sans rien faire d'autre donne environ 10 sur 20 ; la solution complète donne 20 sur 20. Le diplôme final (`cat Diplome` dans la Citadelle) affiche le nom du joueur, son score, sa note, sa mention et son temps de jeu : une capture d'écran suffit pour relever les résultats d'un groupe. Le nom est celui que le joueur a écrit dans le LivreDOr de la Taverne.

## Développement

Le code est du JavaScript sans dépendance ni étape de construction.

| Fichier | Rôle |
| --- | --- |
| `Web/static/javascript/GameObjects.js` | le monde : lieux, objets, personnages, textes, réactions |
| `Web/static/javascript/Shell.js` | l'interpréteur et les sorts de base |
| `Web/static/javascript/SortsAvances.js` | variables, alias, liens, scripts, archives, réseau, système, paquets |
| `Web/static/javascript/Manuel.js` | les pages de `man` et l'ordre des sorts |
| `Web/static/javascript/GameState.js` | événements de l'histoire, quêtes, expérience et barème, sauvegarde |
| `Web/static/javascript/Terminal.js` | l'affichage et la saisie |
| `Web/static/javascript/Room.js`, `Item.js` | les lieux (répertoires) et les objets (fichiers) |
| `tools/dessiner_images.py` | génère les illustrations ajoutées |
| `tests/parcours.js` | joue une partie complète et vérifie chaque étape (plus de 300 vérifications) |
| `tests/solution.js` | rejoue les commandes de `docs/solution.md` et vérifie qu'elles mènent à 20 sur 20 |
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
