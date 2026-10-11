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

Au premier lancement, le jeu affiche `terminus login:` : on tape son prénom (il devient l'identifiant sur le système : `whoami`, l'invite, les propriétaires des fichiers, le diplôme), puis le jeu crée l'utilisateur comme la commande `adduser` sous Linux : mot de passe invisible pendant la frappe, saisi deux fois, puis le nom complet (celui du diplôme) et l'adresse e-mail. Ce compte permet de retrouver sa partie : `logout` (ou Ctrl+D) ferme la session et l'écran revient à la connexion pour le joueur suivant ; on revient avec son identifiant et son mot de passe. Plusieurs étudiants peuvent ainsi se succéder sur le même ordinateur. Le mot de passe n'est gardé que sous forme d'empreinte SHA-256 salée, dans le navigateur ; il sépare les parties des camarades, ce n'est pas une sécurité forte. `recommencer` repart de zéro en gardant le compte. Le jeu propose ensuite trois enveloppes : l'épreuve de première année (chapitre 1, pour découvrir le terminal), le ticket d'incident (chapitre 2 directement, la panne du réseau) ou l'ordre de mission (chapitre 3 directement, la mission cyber). Les deux dernières sont pour qui connaît déjà les bases : on arrive en renfort après l'épreuve des B1.

## Ce que cette édition ajoute

**Bien plus de sorts** : 52 au chapitre 1 (au lieu de 14 dans le jeu d'origine), 136 en tout avec les chapitres 2 et 3 :

| Notion | Sorts | Où on l'apprend |
| --- | --- | --- |
| Se déplacer, regarder, lire | `ls` `cd` `pwd` `cat` `less` `man` `help` `clear` `exit` | dès le départ |
| Options, aide, fichiers cachés | `ls -a` `ls -l` `--help` `history` `!!` | les manuscrits du vieil homme |
| Déplacer, renommer, jokers | `mv` `*` | l'Académie des Sorts |
| Lire et comparer des textes | `head` `tail` `wc` `diff` | le Scriptorium (nouveau) |
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
| Le modèle OSI | les sept étages (Physique, Liaison, Réseau, Transport, Session, Présentation, Application), la règle « on dépanne de bas en haut » | l'affiche ModeleOSI du bâtiment B (chapitre 2) |
| Le lien et l'adresse | `ip link` `ip addr` `ethtool` `dhclient` `nmcli` | le poste du bâtiment B (chapitre 2) |
| La route | `ip route` `ip neigh` `ping -c` `traceroute` `mtr` | le poste, le routeur (chapitre 2) |
| Les noms | `/etc/resolv.conf` `/etc/hosts` `dig` `host` `nslookup` `resolvectl` | le poste (chapitre 2) |
| La configuration permanente | `netplan get/set/apply` (YAML), `reboot` | le poste (chapitre 2) |
| Les services | `systemctl` (status, enable --now, --failed) `journalctl -u` `ss -tulnp` | le routeur, l'intranet (chapitre 2) |
| Le web et l'heure | `curl` `wget` `openssl s_client` `openssl x509` `timedatectl` | l'intranet, le poste (chapitre 2) |
| Ports, filtrage, écoute | `nc -zv` `telnet` `iptables` `tcpdump -A` | le routeur (chapitre 2) |
| Éditer un fichier | `nano` (Ctrl+O, Ctrl+X, Ctrl+K) | le poste (chapitre 2) |
| Les sorts des anciens | `ifconfig` `route` `arp` `netstat` | le GrimoireDesAnciens du poste (chapitre 2) |
| Les sorts de terrain | `arping` `tracepath` `getent` `uptime` `iperf3` `nft` | la SacocheDeRadia (chapitre 2) |
| Empreintes et encodage | `sha256sum` `sha256sum -c` `base64` `base64 -d` | la Crypte (chapitre 3) |
| Bit SUID | `ls -l`, `find -perm -4000`, `chmod u-s`, `chmod 4755` | le Caveau (chapitre 3) |
| Sortie d'erreur | `2>` `2>>` `2>&1` `/dev/null` | le Caveau (chapitre 3) |
| Ports en écoute | `ss -tlnp` (avec sudo, pour voir les processus de root) | la Racine (chapitre 3) |
| Clés SSH | `ssh-keygen`, clé publique et clé privée, `authorized_keys`, `ssh-copy-id` | la SalleServeurs (chapitre 3) |
| Journaux et sessions | `zcat` `gzip` `gunzip` `last` `who` | la Citadelle, le labo (chapitre 3) |
| Cartographie du réseau | `nmap` `uname` `which` `dmesg` | le réseau de l'école (chapitre 3) |
| Processus | `pgrep` `pkill` `lsof` | le labo (chapitre 3) |
| Fichiers suspects | `file` `xxd` `strings` `stat` `lsattr` `chattr` | le serveur web, la Racine (chapitre 3) |
| Filtres de texte | `sed` `awk` `tr` `rev` `tee` | la messagerie, la badgeuse (chapitre 3) |
| Comptes et droits | `userdel` `usermod` `gpasswd` `groups` `visudo` | la Citadelle, le labo (chapitre 3) |
| Pare-feu | `ufw route deny` (le trafic qui traverse) et `ufw deny` (le pare-feu lui-même) | le pare-feu (chapitre 3) |
| Preuves et chiffrement | `scp` `md5sum` `sha1sum` `gpg` | la sauvegarde (chapitre 3) |
| Traces de connexion | `lastb` `lastlog` `w` `chage` `fail2ban-client` | le CarnetDeTraque de la Citadelle (chapitre 3) |
| Outils d'analyse | `clamscan` `rkhunter` `debsums` `exiftool` `getfacl` `setfacl` | la TrousseDEvi (chapitre 3) |
| L'éditeur des serveurs | `vim` : modes, `x` `i` `A` `dw` `dd` `u` `p` `r` `cw` `/` `:%s` `G` `:wq` `:q!`, cinq leçons inspirées de vimtutor | le labo (chapitre 3) |

**Un terminal plus proche d'un vrai** : invite `apprenti@terminus:~/Chemin$` qui change de machine avec `ssh`, chemins relatifs et depuis `~`, `cd -`, complétion avec Tab, historique avec les flèches, guillemets et apostrophes, variables, enchaînements `;` et `&&`, messages d'erreur à la manière de Linux, indices quand une majuscule manque.

**Des pièges pédagogiques assumés** : écraser un fichier avec `>` au lieu de `>>`, `sudo cd` qui n'existe pas, `kill` refusé sur le processus d'un autre, `chmod` refusé quand on n'est pas propriétaire, un script sans le droit `x`, un lien symbolique avec une cible relative, un processus qui renaît tant que `cron` le relance, `less` qui ne suffit plus sur un fichier de 200 lignes.

**Une fin** : le jeu d'origine s'arrêtait au mot de passe sudo. Ici, il ouvre la Citadelle du Sorcier Noir, dont le combat final réutilise tout ce qui a été appris. Le Sorcier Noir se révèle être Laurent, directeur pédagogique de Cybersup : Terminus était l'épreuve pratique, et la crise de la war room était l'examen des M2.

**L'école dans le jeu** : le campus de Puteaux (accueil, feuille d'émargement, carte étudiante, tableau d'affichage, BDE et sa boutique, war room avec ses voyants et son écran mural qui suit la progression du joueur), les campus de Lille et de Marseille accessibles uniquement par `ssh`, une enquête d'analyste dans les journaux de connexion, le CTF de l'école. Après la victoire, les habitants de Terminus tombent le masque : ce sont d'anciens élèves et des intervenants. Hormis Laurent, tous les personnages sont inventés.

**De l'expérience et une note** : chaque sort appris, chaque sort utilisé pour la première fois, chaque lieu découvert et chaque quête rapportent des XP (3860 au total au chapitre 1). Dix niveaux calqués sur le cursus (Candidat, Admis, B1, B2, B3, M1, M2, Alternant confirmé, Diplômé, Root), une barre de progression toujours visible, et une note sur 20 avec mention sur le diplôme final. La commande `xp` détaille d'où viennent les points et ce qu'il reste à gagner.

**Un bulletin** (`bulletin`) : les 52 sorts regroupés en six blocs de compétences, BC 01 à BC 06, chacun noté sur 20 et marqué « acquis » quand tous ses sorts ont été appris puis utilisés. Le relevé figure sur le diplôme.

**Un journal de quêtes** (`quetes`) avec 13 étapes principales et 29 quêtes secondaires au chapitre 1, 14 étapes et 32 quêtes secondaires au chapitre 2, 22 étapes et 45 quêtes secondaires (dont 14 autour de vim) au chapitre 3.

**Un deuxième chapitre, la panne** : après la victoire, le P.S. de Laurent annonce que le réseau de l'école est tombé pendant l'épreuve. Radia, M1 réseau, attend la recrue au bâtiment B. On s'assoit devant le poste de l'accueil (une vraie machine, avec son `/etc`) et on répare couche par couche, de bas en haut : la carte réseau éteinte, l'adresse posée à la main faute de DHCP, la passerelle, le DNS mal recopié, puis le serveur DHCP du routeur, la configuration permanente dans netplan (et un `reboot` pour le prouver), l'intranet dont apache2 a pris le port 80 à nginx, l'horloge du poste restée en 2001 qui fait refuser le certificat https, une règle iptables qui avale les mails, la route vers Lille disparue, et un telnet oublié dont `tcpdump -A` montre le mot de passe en clair. Chaque commande suit l'état réel du réseau : une carte éteinte, une route absente ou une règle de pare-feu changent ce que répondent `ping`, `dig`, `curl` ou `nc` (« refused » et « timed out » ne disent pas la même chose). Le chapitre compte 35 sorts, 20 lieux et 14 étapes. Le modèle OSI en est la clé : Radia commence par l'affiche des sept étages (cat ModeleOSI), chaque étape dit à quel étage elle se joue, les sept voyants au-dessus de l'image et le schema montrent les étages du Poste en vert ou en rouge, et une quête secondaire fait réciter les sept étages dans ~/osi.txt, avec sa propre note sur 20 et son propre certificat. Le chapitre se joue comme un jeu de rôle : le réseau est un royaume où les paquets sont des messagers, le routeur la Tour du Carrefour, le DNS l'Oracle des Noms, le pare-feu une herse. Chaque sort porte un nom imagé (`traceroute`, le Fil d'Ariane ; `tcpdump`, l'Oreille du Mur) et, au premier lancement, dit ce qu'il fait en une image et fait souvent sortir un lieu de la brume sur la carte (`schema`). Chaque réparation rapporte un badge de compétence, avec sa médaille en pixels et son rang (bronze, argent, or ; platine pour un chapitre complet), qui s'affiche quand on le gagne et dans la vitrine du panneau de droite (Modèle OSI, Adressage IP, Résolution DNS... douze en tout) ; la commande du jeu `badges` relit la leçon de chacun (`badges reseau`, `badges cyber`, ou `badges dns` pour une compétence), pour que le terminal reste court. En plus des sorts de la panne, le GrimoireDesAnciens du poste enseigne les sorts d'avant ip (`ifconfig`, `route`, `arp`, `netstat`) et la SacocheDeRadia ses sorts de terrain (`arping`, `tracepath`, `getent`, `uptime`, `iperf3`, `nft`), chacun avec sa quête secondaire. Le vrai mot du métier reste toujours écrit à côté de l'image, et le Lexique de Radia donne les deux.

**Un troisième chapitre, la Crypte** : quand le réseau est réparé, Radia transmet un message de Grace et une trappe s'ouvre sous la Citadelle. Quelqu'un est vraiment entré pendant l'examen : un programme trafiqué, un message caché en base64, une porte dérobée SUID, un faux processus noyau qui écoute sur un port, une clé SSH de trop dans les clés autorisées de root. L'enquête remonte ensuite le réseau de l'école par `ssh`, de machine en machine, chacune avec sa vraie arborescence Linux (`/etc`, `/var/log`, `/tmp`, `/home`) : le labo de TP par où l'intrus est entré, le serveur web et sa page piégée, la messagerie et son mail piégé, le DNS falsifié, le pare-feu à réactiver, la sauvegarde où mettre les preuves à l'abri, et même l'imprimante et la badgeuse. On démasque l'intrus dans le coffre de l'école, puis on rédige le rapport d'incident dans `vim`. Le chapitre compte 49 sorts, 48 lieux et 22 étapes, avec sa propre note sur 20 et son propre certificat. Il se joue comme une chasse au Corbeau : chaque sort porte un nom imagé (`nmap`, la Lanterne des Ports ; `lsof`, le Filet) et dit ce qu'il fait en une image au premier lancement, les machines de l'école sortent de la brume dès qu'un sort les nomme, et `traque` montre le tableau de chasse (en rouge ce que le Corbeau souille encore, en vert ce qui est purifié). Chaque étape de la chasse (sauf le rapport) rapporte un badge de compétence (Bit SUID, Clés SSH, Chaîne de traçabilité...), dont `badges` relit la leçon. Le Bestiaire de la Crypte donne le vrai mot de chaque image. Le carnet de traque de Grace enseigne `lastb`, `lastlog`, `w`, `chage` et `fail2ban-client`, la trousse d'Evi `clamscan`, `rkhunter`, `debsums`, `exiftool`, `getfacl` et `setfacl`, chacun avec sa quête secondaire.

**Des parties toutes différentes** : une graine tirée au premier lancement fixe le mot de passe sudo, l'adresse de l'attaquant, le meilleur client de la taverne, le nombre de sweats du BDE et les numéros de processus. Recopier la solution du voisin ne marche pas.

**Des indices payants** (`indice`) : deux paliers par étape, de plus en plus précis, qui coûtent 30 puis 60 XP sur la note (pas sur le niveau).

**Une allure de vrai terminal** : un écran de démarrage (le serveur démarre, l'écran s'allume, l'illustration se reconstruit en pixels, puis `terminus login:`), trois enveloppes à choisir au début, le mode vieil écran activé par défaut (`crt off` pour un affichage net), l'image de chaque lieu dès l'arrivée, une carte des lieux visités (`carte`, et aussi après `tree`), des illustrations pour chaque machine du réseau, le talkie-walkie de Radia au chapitre 2, et au chapitre 3 un bandeau radio du SOC et une barre d'état en alerte jusqu'au rapport d'incident.

**Des succès** (`succes`), **un chrono façon speedrun** (`chrono`, temps de passage à chaque étape), **des sons 8 bits** (`son`, coupés par défaut) et **une barre de touches** sur téléphone (Tab, ↑, `|`, `~`, `/`, `>`, `*`...).

## Pour les formateurs

Le déroulé complet, avec la solution de chaque étape et le barème, se trouve dans [docs/solution.md](docs/solution.md).

Repères pour la notation : finir la quête principale au plus court donne 10 sur 20 ; la solution complète donne 20 sur 20. Le diplôme final (`cat Diplome` dans la Citadelle) et les certificats des chapitres 2 et 3 (`cat CertificatReseau` et `cat CertificatCyber` dans la Maison) affichent le prénom du joueur, son score, sa note, sa mention, son temps de jeu, les indices payants utilisés, et un **code de vérification**. Ce code résume la partie et porte une somme de contrôle : une page de classement le décode, repère un code retouché et classe la promo, chapitre par chapitre.

**Séances séparées** : pour une séance consacrée au réseau Linux, les étudiants choisissent le ticket d'incident au démarrage (ou tapent `chapitre 2` avant d'avoir franchi la première étape) et arrivent directement au bâtiment B. Pour une séance de trois heures consacrée à la sécurité, ils choisissent l'ordre de mission (ou tapent `chapitre 3`). Dans l'histoire, ils reçoivent un ordre de mission : les B1 ont battu le Sorcier Noir le matin même, un intrus bien réel est entré pendant la correction, et Grace les attend à la WarRoom pour le briefing avant de les envoyer à la Citadelle par `ssh`. Le chapitre 1 n'est pas noté pour eux.

**Des aides pour les débutants** : un sort inconnu dit où il s'apprend, `cd..` et `ls-l` sont repérés (il manque une espace), les accents aussi (`ForêtOuest`), et l'apostrophe de `echo Le Sorcier s'appelle Laurent` est expliquée. `indice` signale aussi ce qui coince sans qu'on le voie : des rouages creux, un alias qui masque un sort, une clé SSH grillée ou effacée, et les sorts qui manquent pour suivre l'indice.

**Le vrai comportement de `cp` et `mv`** : ils écrasent sans prévenir, comme sous Linux, et une quête piège à l'Atelier le fait découvrir avant d'apprendre `cp -i`.

## Développement

Le code est du JavaScript sans dépendance ni étape de construction.

| Fichier | Rôle |
| --- | --- |
| `Web/static/javascript/GameObjects.js` | le monde : lieux, objets, personnages, textes, réactions |
| `Web/static/javascript/Shell.js` | l'interpréteur et les sorts de base |
| `Web/static/javascript/SortsAvances.js` | variables, alias, liens, scripts, archives, réseau, système, paquets |
| `Web/static/javascript/Manuel.js` | les pages de `man` et l'ordre des sorts |
| `Web/static/javascript/Chapitre2.js` | la Crypte (chapitre 3) : SHA-256, base64, `nano`, `ss`, `ssh-keygen`, la Crypte et le coffre, le saut de chapitre |
| `Web/static/javascript/CommandesCyber.js` | les commandes du réseau et de l'analyse (sed, awk, nmap, systemctl, gpg...) et l'éditeur `vim` côté shell |
| `Web/static/javascript/Reseau.js` | les machines du réseau de l'école, les quêtes et les leçons de vim de la Crypte |
| `Web/static/javascript/Panne.js` | la panne (chapitre 2) : le bâtiment B, le poste, le routeur, l'intranet, l'état du réseau et qui joint qui, les quêtes, Radia |
| `Web/static/javascript/CommandesPanne.js` | les sorts de la panne (ip, dhclient, netplan, dig, systemctl, iptables, tcpdump, curl, openssl...), qui suivent l'état du réseau |
| `Web/static/javascript/RpgPanne.js` | l'habillage jeu de rôle de la panne : le nom imagé de chaque sort, la carte qui sort de la brume, les badges et la commande badges |
| `Web/static/javascript/SortsCrypte.js` | les sorts de chasse du chapitre 3 (lastb, lastlog, w, chage, fail2ban-client, clamscan, rkhunter, debsums, exiftool, getfacl, setfacl) |
| `Web/static/javascript/RpgCrypte.js` | l'habillage jeu de rôle du chapitre 3 : noms imagés, machines dans la brume, tableau de chasse (traque), badges |
| `Web/static/javascript/Partie.js` | le prénom, la graine de la partie et le code de vérification du diplôme |
| `Web/static/javascript/GameState.js` | événements de l'histoire, quêtes, expérience et barème, indices, succès, chrono, sauvegarde |
| `Web/static/javascript/Terminal.js` | l'affichage et la saisie |
| `Web/static/javascript/Room.js`, `Item.js` | les lieux (répertoires) et les objets (fichiers) |
| `outils/dessiner_lieux.py`, `outils/dessiner_panne.py`, `outils/dessiner_badges.py` | génèrent les illustrations ajoutées et les médailles des badges |
| `tests/parcours.js` | joue une partie complète et vérifie chaque étape (plus de 600 vérifications, les trois chapitres compris) |
| `tests/solution.js` | rejoue les commandes de `docs/solution.md` et vérifie qu'elles mènent à 20 sur 20 aux trois chapitres |
| `tests/regressions.js` | rejoue chaque bug trouvé lors de l'audit, pour qu'il ne revienne pas |
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
