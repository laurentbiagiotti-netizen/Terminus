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

**16 sorts de plus** (30 au lieu de 14) :

| Notion | Sorts | Où on l'apprend |
| --- | --- | --- |
| Se déplacer, regarder | `ls` `cd` `pwd` `less` `man` `help` `clear` | dès le départ |
| Options et fichiers cachés | `ls -a` `ls -l` `history` | les manuscrits du vieil homme |
| Déplacer, renommer, jokers | `mv` `*` | l'Académie des Sorts |
| Lire un long texte | `cat` `head` `tail` `wc` | le Scriptorium (nouveau) |
| Permissions | `chmod` et la lecture de `rwxr-xr-x` | la stèle du Portail |
| Créer et supprimer | `rm` `mkdir` `rmdir` `touch` `cp` | le Marché, l'Atelier |
| Chercher dans un texte | `grep` avec `-i` `-n` `-r` `-c` `-v` | la Bibliothèque |
| Redirections | `echo` `>` `>>` | la Taverne (nouveau) |
| Tuyaux | `\|` `sort` `uniq` | la Taverne (nouveau) |
| Processus | `ps` `kill` `kill -9` `whoami` | Cybersup (remplace le MIT) |
| Chercher des fichiers | `find` `tree` | Cybersup |
| Administration | `sudo` avec un vrai mot de passe | les Fichiers du Noyau |

**Un terminal plus proche d'un vrai** : invite `apprenti@terminus:~/Chemin$`, chemins relatifs et depuis `~`, `cd -`, complétion avec Tab, historique avec les flèches, guillemets, enchaînements `;` et `&&`, messages d'erreur à la manière de Linux, indices quand une majuscule manque.

**Des pièges pédagogiques assumés** : écraser un fichier avec `>` au lieu de `>>`, `sudo cd` qui n'existe pas, `kill` refusé sur le processus d'un autre, `chmod` refusé quand on n'est pas propriétaire, `less` qui ne suffit plus sur un fichier de 200 lignes.

**Une fin** : le jeu d'origine s'arrêtait au mot de passe sudo. Ici, il ouvre la Citadelle du Sorcier Noir, dont le combat final réutilise tout ce qui a été appris. Le Sorcier Noir se révèle être Laurent, directeur pédagogique de Cybersup : toute l'aventure était un examen.

**Un journal de quêtes** (`quetes`) avec 13 étapes principales et 13 quêtes secondaires, et un diplôme final dont la mention dépend des quêtes accomplies.

## Pour les formateurs

Le déroulé complet, avec la solution de chaque étape, se trouve dans [docs/solution.md](docs/solution.md). Compter 1 h 30 à 2 h pour un débutant complet.

## Développement

Le code est du JavaScript sans dépendance ni étape de construction.

| Fichier | Rôle |
| --- | --- |
| `Web/static/javascript/GameObjects.js` | le monde : lieux, objets, personnages, textes, réactions |
| `Web/static/javascript/Shell.js` | l'interpréteur et tous les sorts |
| `Web/static/javascript/Manuel.js` | les pages de `man` et l'ordre des sorts |
| `Web/static/javascript/GameState.js` | événements de l'histoire, quêtes, sauvegarde |
| `Web/static/javascript/Terminal.js` | l'affichage et la saisie |
| `Web/static/javascript/Room.js`, `Item.js` | les lieux (répertoires) et les objets (fichiers) |
| `tools/dessiner_images.py` | génère les illustrations ajoutées |
| `tests/parcours.js` | joue une partie complète et vérifie chaque étape |

Lancer le test après toute modification :

```
node tests/parcours.js
```

Ajouter `-v` affiche toute la partie, telle que le joueur la verrait.

Le dossier `Java` contient la toute première version du jeu d'origine, laissée telle quelle.

## Licence et crédits

GNU GPL version 2, comme le jeu d'origine (voir `LICENSE.md`).

Jeu d'origine : Michele Pratusevich, Shawn Conrad et leurs contributeurs, MIT. Illustrations d'origine conservées.
Édition Cybersup : Laurent Biagiotti.
