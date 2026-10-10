/**
 * Manuel.js : les pages de manuel, soufflees par le vieil homme (man).
 *
 * resume : la ligne affichee par help
 * titre  : le moyen mnemotechnique
 * page   : le detail affiche par man SORT
 *
 * Tous ces sorts existent tels quels sous Linux, avec les memes options.
 */

/* Ordre d'affichage dans help. */
var ORDRE_DES_SORTS = [
	"ls", "cd", "pwd", "cat", "less", "help", "man", "clear", "exit",
	"mv", "head", "tail", "wc", "diff", "history",
	"chmod", "rm", "mkdir", "rmdir", "touch", "cp", "bash", "date",
	"grep", "echo", "export", "env", "alias", "unalias", "ln",
	"sort", "uniq", "cut",
	"ps", "kill", "top", "whoami", "id", "passwd", "chown",
	"find", "tree", "df", "du", "tar", "crontab",
	"hostname", "ping", "ssh", "apt", "cowsay", "sudo"
];

/* Sorts connus des le depart. */
var SORTS_DE_DEPART = ["ls", "cd", "pwd", "cat", "less", "help", "man", "clear", "exit"];

var MANUEL = {
"ls": {
	resume: "regarder ce qu'il y a autour de soi",
	titre: "LiSter (regarder autour de soi)",
	page:
"Utilise « ls » pour voir ce que contient un lieu : celui où tu te trouves,\n" +
"ou un autre que tu désignes, même si tu ne peux pas y entrer.\n\n" +
"  ls              ce qu'il y a ici\n" +
"  ls LIEU         ce qu'il y a dans LIEU\n" +
"  ls -a           tout montrer, y compris ce qui est caché (les noms commençant par un point)\n" +
"  ls -l           le détail : droits, propriétaire, taille\n" +
"  ls -la          les deux à la fois\n\n" +
"Lire une ligne de ls -l :\n" +
"  drwxr-xr-x  terminus   3  Grotte/\n" +
"  │└┬┘└┬┘└┬┘\n" +
"  │ │  │  └ droits de tous les autres\n" +
"  │ │  └ droits du groupe\n" +
"  │ └ droits du propriétaire (r lire, w écrire, x traverser ou exécuter)\n" +
"  └ d pour un lieu, - pour un objet"
},
"cd": {
	resume: "se déplacer vers un autre lieu",
	titre: "Changer de Destination (change directory)",
	page:
"Utilise « cd » pour te déplacer dans le monde.\n\n" +
"  cd LIEU         entrer dans LIEU\n" +
"  cd ..           revenir au lieu précédent, celui qui contient celui-ci\n" +
"  cd ~   ou  cd   rentrer directement à la Maison\n" +
"  cd -            retourner là où tu étais juste avant\n" +
"  cd A/B/C        traverser plusieurs lieux d'un coup\n" +
"  cd ~/A/B        le même voyage, en partant de la Maison\n\n" +
"Un chemin, c'est une suite de lieux séparés par des barres obliques."
},
"pwd": {
	resume: "savoir où l'on est",
	titre: "où suis-je ? (print working directory)",
	page:
"Utilise « pwd » pour te rappeler où tu te trouves. Il affiche le chemin\n" +
"complet depuis ta Maison, notée ~ .\n\n" +
"  pwd"
},
"less": {
	resume: "regarder un objet, parler à quelqu'un",
	titre: "regarder, examiner, parler",
	page:
"Utilise « less » pour examiner un objet ou adresser la parole à quelqu'un.\n\n" +
"  less OBJET\n\n" +
"Sous Linux, less affiche un texte page par page. Ici, quand un texte est\n" +
"trop long, il n'en montre que la première page : pour le reste, il faudra\n" +
"apprendre head, tail et grep."
},
"help": {
	resume: "revoir la liste de ses sorts",
	titre: "à l'aide !",
	page: "Tape « help » pour revoir la liste des sorts que tu connais."
},
"man": {
	resume: "demander au vieil homme le détail d'un sort",
	titre: "le manuel",
	page: "Tape « man SORT » si tu as oublié comment un sort fonctionne."
},
"clear": {
	resume: "effacer l'écran",
	titre: "faire place nette",
	page:
"Utilise « clear » pour effacer ce qui est affiché. Rien n'est perdu : seul\n" +
"l'écran est nettoyé. Le raccourci Ctrl+L fait la même chose.\n\n" +
"  clear"
},
"exit": {
	resume: "quitter le terminal",
	titre: "sortir",
	page: "Sous Linux, « exit » ferme le terminal. Dans une connexion ssh, exit (ou logout, ou Ctrl+D)\n" +
"ferme la connexion et te ramène sur la machine d'où tu venais.\n\n" +
"Pour laisser la place au joueur suivant sur un ordinateur partagé : logout, depuis ta machine de départ.\n" +
"Ta partie est mise de côté ; tu la retrouves en redonnant ton prénom au démarrage."
},
"mv": {
	resume: "déplacer ou renommer un objet",
	titre: "MoVe (déplacer)",
	page:
"Utilise « mv » pour déplacer un objet vers un autre lieu, ou pour le renommer.\n\n" +
"  mv OBJET LIEU            déplace OBJET dans LIEU\n" +
"  mv OBJET NOUVEAUNOM      renomme OBJET\n" +
"  mv A B C LIEU            déplace plusieurs objets d'un coup\n" +
"  mv Mannequin* Boite      l'étoile remplace n'importe quelle suite de lettres\n" +
"  mv Cage/Objet .          le point désigne « ici »\n" +
"  mv -i OBJET NOM          demande avant d'écraser un NOM qui existe déjà\n\n" +
"Comme cp, mv écrase sans prévenir un objet qui porte déjà le nouveau nom.\n" +
"Tous les objets ne se laissent pas déplacer : seulement ceux qui t'appartiennent,\n" +
"et quelques autres."
},
"cat": {
	resume: "afficher un texte en entier",
	titre: "conCATener (afficher d'une traite)",
	page:
"Utilise « cat » pour afficher le contenu d'un ou plusieurs objets, en entier\n" +
"et d'un seul bloc.\n\n" +
"  cat OBJET\n" +
"  cat A B          affiche A puis B, bout à bout\n" +
"  cat -n OBJET     numérote les lignes"
},
"head": {
	resume: "lire le début d'un texte",
	titre: "la tête (le début)",
	page:
"Utilise « head » pour ne lire que le début d'un texte.\n\n" +
"  head OBJET          les 10 premières lignes\n" +
"  head -n 3 OBJET     les 3 premières"
},
"tail": {
	resume: "lire la fin d'un texte",
	titre: "la queue (la fin)",
	page:
"Utilise « tail » pour ne lire que la fin d'un texte. Les administrateurs s'en\n" +
"servent sans arrêt : dans un journal, les dernières nouvelles sont en bas.\n\n" +
"  tail OBJET          les 10 dernières lignes\n" +
"  tail -n 1 OBJET     seulement la dernière"
},
"wc": {
	resume: "compter les lignes, les mots, les caractères",
	titre: "Word Count (compter)",
	page:
"Utilise « wc » pour compter sans rien afficher.\n\n" +
"  wc OBJET         lignes, mots et caractères\n" +
"  wc -l OBJET      seulement les lignes\n" +
"  wc -w OBJET      seulement les mots\n" +
"  ls | wc -l       compte ce que le sort précédent lui envoie par le tuyau"
},
"history": {
	resume: "revoir les sorts déjà lancés",
	titre: "l'historique",
	page:
"Utilise « history » pour afficher la liste des sorts que tu as lancés.\n" +
"La flèche du haut les rappelle un par un.\n\n" +
"  history\n" +
"  history | grep mv     retrouve tous tes sorts de déplacement\n" +
"  !!                    relance le dernier sort tel quel"
},
"chmod": {
	resume: "changer les droits d'un lieu ou d'un objet",
	titre: "CHange MODe (changer les droits)",
	page:
"Utilise « chmod » pour changer qui a le droit de faire quoi.\n\n" +
"  chmod +x LIEU        donne à tous le droit de traverser LIEU\n" +
"  chmod -w OBJET       retire à tous le droit d'écrire dans OBJET\n" +
"  chmod u+rw OBJET     u : le propriétaire, g : son groupe, o : les autres, a : tous\n" +
"  chmod 755 LIEU       la notation en chiffres : r vaut 4, w vaut 2, x vaut 1\n" +
"                       7 = rwx, 5 = r-x, donc 755 = rwxr-xr-x\n\n" +
"Seul le propriétaire d'une chose (ou root) peut en changer les droits.\n" +
"Vérifie avant et après avec ls -l."
},
"rm": {
	resume: "faire disparaître un objet, pour toujours",
	titre: "ReMove (supprimer)",
	page:
"Utilise « rm » pour faire disparaître un objet. Il n'y a pas de corbeille :\n" +
"ce qui est supprimé l'est pour toujours.\n\n" +
"  rm OBJET\n" +
"  rm A B C         plusieurs d'un coup\n" +
"  rm rouage*       tout ce qui commence par rouage\n" +
"  rm -r LIEU       un lieu et tout ce qu'il contient (réfléchis à deux fois)"
},
"mkdir": {
	resume: "créer un nouveau lieu",
	titre: "MaKe DIRectory (créer un lieu)",
	page:
"Utilise « mkdir » pour faire apparaître un lieu qui n'existait pas.\n\n" +
"  mkdir LIEU"
},
"rmdir": {
	resume: "supprimer un lieu vide",
	titre: "ReMove DIRectory (supprimer un lieu)",
	page:
"Utilise « rmdir » pour supprimer un lieu, à condition qu'il soit vide et\n" +
"qu'il t'appartienne.\n\n" +
"  rmdir LIEU"
},
"touch": {
	resume: "créer un objet vide",
	titre: "toucher (le toucher de l'artisan)",
	page:
"Utilise « touch » pour créer un nouvel objet, vide.\n\n" +
"  touch OBJET\n" +
"  touch A B C      plusieurs d'un coup\n\n" +
"Si l'objet existe déjà, touch ne l'abîme pas : il met seulement sa date à jour.\n" +
"Attention aux majuscules : Planche et planche sont deux objets différents."
},
"cp": {
	resume: "copier un objet",
	titre: "CoPy (copier)",
	page:
"Utilise « cp » pour dupliquer un objet.\n\n" +
"  cp OBJET COPIE       crée COPIE, identique à OBJET\n" +
"  cp OBJET LIEU        dépose une copie dans LIEU\n" +
"  cp OBJET ../COPIE    la copie peut atterrir ailleurs\n" +
"  cp -i OBJET COPIE    demande avant d'écraser une COPIE qui existe déjà\n" +
"  cp -n OBJET COPIE    n'écrase jamais\n\n" +
"Attention : si COPIE existe déjà, cp la remplace sans prévenir, et son ancien\n" +
"contenu est perdu pour de bon. Il n'y a pas de corbeille dans un terminal."
},
"grep": {
	resume: "chercher un mot dans un texte",
	titre: "ton serviteur Grep (chercher)",
	page:
"Utilise « grep » pour ne garder que les lignes d'un texte qui contiennent un mot.\n\n" +
"  grep MOT OBJET        les lignes de OBJET contenant MOT\n" +
"  grep MOT *            cherche dans tous les objets d'ici\n" +
"  grep -r MOT LIEU      fouille un lieu entier, et tout ce qu'il contient\n" +
"  grep -i MOT OBJET     sans tenir compte des majuscules\n" +
"  grep -n MOT OBJET     indique les numéros de ligne\n" +
"  grep -v MOT OBJET     l'inverse : les lignes qui ne contiennent PAS le mot\n" +
"  grep -c MOT OBJET     compte les lignes trouvées\n" +
"  ps | grep demon       filtre ce qu'un autre sort lui envoie"
},
"echo": {
	resume: "dire quelque chose à voix haute, ou l'écrire",
	titre: "l'écho (répéter)",
	page:
"Utilise « echo » pour faire résonner des mots.\n\n" +
"  echo Bonjour               répète tes mots à voix haute\n" +
"  echo Bonjour > OBJET       les écrit dans OBJET, en ÉCRASANT son contenu\n" +
"  echo Encore >> OBJET       les ajoute à la fin de OBJET\n" +
"  echo \"deux  espaces\"       les guillemets gardent le texte tel quel\n\n" +
"Un chevron écrase, deux chevrons ajoutent. Les chevrons fonctionnent\n" +
"derrière n'importe quel sort : ls > Inventaire."
},
"sort": {
	resume: "trier des lignes",
	titre: "trier",
	page:
"Utilise « sort » pour trier les lignes d'un texte.\n\n" +
"  sort OBJET       ordre alphabétique\n" +
"  sort -r OBJET    ordre inverse\n" +
"  sort -n OBJET    ordre numérique (2 avant 10)\n" +
"  sort -u OBJET    trie et retire les doublons"
},
"uniq": {
	resume: "retirer les lignes en double",
	titre: "unique",
	page:
"Utilise « uniq » pour fusionner les lignes identiques qui se suivent.\n" +
"Il faut donc trier d'abord, d'où le tuyau :\n\n" +
"  sort OBJET | uniq         chaque ligne une seule fois\n" +
"  sort OBJET | uniq -c      avec le nombre d'apparitions devant\n" +
"  sort OBJET | uniq -c | sort -n     du plus rare au plus fréquent\n\n" +
"Le tuyau | envoie ce qu'affiche un sort dans le sort suivant.\n" +
"C'est l'idée la plus puissante de tout le grimoire : de petits sorts\n" +
"simples, mis bout à bout."
},
"ps": {
	resume: "lister les processus qui tournent",
	titre: "Process Status (les processus)",
	page:
"Utilise « ps » pour voir les processus : les programmes en train de tourner.\n" +
"Chacun porte un numéro unique, son PID, et appartient à un utilisateur.\n\n" +
"  ps\n" +
"  ps | grep NOM      n'afficher que ceux qui t'intéressent\n\n" +
"Un processus qui tourne en arrière-plan sans qu'on le voie s'appelle un démon."
},
"kill": {
	resume: "arrêter un processus",
	titre: "arrêter un processus",
	page:
"Utilise « kill » pour envoyer un signal à un processus, désigné par son PID.\n\n" +
"  kill PID          signal TERM : « termine proprement, s'il te plaît »\n" +
"  kill -9 PID       signal KILL : arrêt immédiat, sans discussion\n\n" +
"On n'arrête que ses propres processus. Pour ceux des autres, il faut les\n" +
"pouvoirs de root : sudo kill PID."
},
"whoami": {
	resume: "savoir sous quel nom le système te connaît",
	titre: "qui suis-je ?",
	page:
"Utilise « whoami » pour afficher ton nom d'utilisateur.\n\n" +
"  whoami\n" +
"  sudo whoami       essaie, pour voir qui lance vraiment les sorts sous sudo"
},
"find": {
	resume: "fouiller un lieu et tout ce qu'il contient",
	titre: "trouver",
	page:
"Utilise « find » pour parcourir un lieu, et tous les lieux qu'il contient,\n" +
"à la recherche de quelque chose. Les cachettes ne lui échappent pas.\n\n" +
"  find .                      tout ce qu'il y a à partir d'ici\n" +
"  find LIEU -name NOM         ce qui porte exactement ce nom\n" +
"  find . -name \"flag*\"        ce dont le nom commence par flag\n" +
"  find . -type d              seulement les lieux (f : seulement les objets)\n\n" +
"Mets des guillemets autour d'un nom avec une étoile, pour que ce soit find\n" +
"qui l'interprète et non le terminal."
},
"tree": {
	resume: "dessiner la carte des lieux",
	titre: "l'arbre",
	page:
"Utilise « tree » pour dessiner d'un coup tout ce qui se trouve sous un lieu.\n\n" +
"  tree             à partir d'ici\n" +
"  tree LIEU        à partir de LIEU\n" +
"  tree -d          seulement les lieux\n" +
"  tree -a          avec ce qui est caché\n" +
"  tree -L 2        sans descendre à plus de 2 niveaux"
},
"sudo": {
	resume: "lancer un sort avec les pleins pouvoirs",
	titre: "SuperUser DO (les pleins pouvoirs)",
	page:
"Écris « sudo » devant un sort pour le lancer en tant que root,\n" +
"l'administrateur, à qui rien n'est interdit.\n\n" +
"  sudo SORT ARGUMENTS\n" +
"  sudo less Certificat\n" +
"  sudo kill 66\n\n" +
"Le mot de passe est demandé la première fois. Un grand pouvoir implique de\n" +
"relire sa ligne avant d'appuyer sur Entrée.\n\n" +
"Astuce : « sudo !! » relance le sort précédent avec les pleins pouvoirs."
},
"diff": {
	resume: "comparer deux textes ligne à ligne",
	titre: "DIFFérences",
	page:
"Utilise « diff » pour savoir en quoi deux textes diffèrent.\n\n" +
"  diff OBJET1 OBJET2\n" +
"  diff -q OBJET1 OBJET2     dit seulement s'ils diffèrent\n\n" +
"Lire la réponse :\n" +
"  17c17      la ligne 17 a changé (c : changed)\n" +
"  < ...      ce qu'elle disait dans le premier objet\n" +
"  > ...      ce qu'elle dit dans le second\n" +
"  5a6        une ligne ajoutée (a : added) ; 8d7 : une ligne supprimée (d : deleted)\n\n" +
"Si diff ne répond rien, les deux textes sont identiques."
},
"bash": {
	resume: "lancer un script, une liste de sorts écrite dans un objet",
	titre: "le terminal lui-même (Bourne Again SHell)",
	page:
"Un script est un objet dont chaque ligne est un sort. On le lance de deux façons :\n\n" +
"  bash SCRIPT        bash lit l'objet et lance ses lignes, une à une\n" +
"  ./SCRIPT           lance l'objet directement, s'il a le droit x (chmod +x SCRIPT)\n\n" +
"Le ./ veut dire « l'objet qui est ici ». Dans un script, une ligne qui\n" +
"commence par # est un commentaire : bash l'ignore. La toute première ligne,\n" +
"#!/bin/bash, indique quel programme doit lire la suite.\n\n" +
"Pour écrire ton propre script :\n" +
"  echo \"echo Bonjour\" > salut.sh\n" +
"  echo \"ls -l\" >> salut.sh\n" +
"  chmod +x salut.sh\n" +
"  ./salut.sh"
},
"date": {
	resume: "connaître la date et l'heure",
	titre: "la date",
	page:
"Utilise « date » pour afficher la date et l'heure de la machine.\n\n" +
"  date\n" +
"  date +%H:%M        seulement l'heure et les minutes\n" +
"  date +%F           la date au format année-mois-jour"
},
"export": {
	resume: "ranger une valeur dans une variable",
	titre: "exporter une variable",
	page:
"Une variable est une boîte avec une étiquette. On la remplit, puis on la\n" +
"relit en écrivant son nom précédé d'un dollar.\n\n" +
"  export CRI=Banzai       range « Banzai » dans la variable CRI\n" +
"  echo $CRI               affiche Banzai\n" +
"  echo \"Mon cri : $CRI\"   entre guillemets doubles, la variable est lue\n" +
"  echo 'Mon cri : $CRI'   entre apostrophes, rien n'est interprété\n\n" +
"Pas d'espace autour du signe égal. Le système tient lui-même à jour\n" +
"quelques variables : $USER (toi), $HOME (ta Maison), $PWD (où tu es)."
},
"env": {
	resume: "voir toutes les variables",
	titre: "l'ENVironnement",
	page:
"Utilise « env » pour afficher toutes les variables d'environnement,\n" +
"celles du système comme les tiennes.\n\n" +
"  env\n" +
"  env | grep USER"
},
"alias": {
	resume: "donner un petit nom à un sort",
	titre: "un surnom",
	page:
"Utilise « alias » pour abréger un sort que tu tapes souvent.\n\n" +
"  alias ll='ls -l'      désormais, ll lance ls -l\n" +
"  alias                 liste tes alias\n" +
"  unalias ll            l'oublie\n\n" +
"Les apostrophes gardent le sort et ses options en un seul morceau. Sous\n" +
"Linux, on range ses alias dans le fichier caché ~/.bashrc pour les\n" +
"retrouver à chaque ouverture du terminal."
},
"unalias": {
	resume: "oublier un alias",
	titre: "retirer un surnom",
	page: "Utilise « unalias NOM » pour supprimer un alias créé avec alias."
},
"ln": {
	resume: "créer un raccourci vers un lieu ou un objet",
	titre: "LiNk (lien symbolique)",
	page:
"Utilise « ln -s » pour créer un raccourci, qu'on appelle un lien symbolique.\n\n" +
"  ln -s CIBLE NOM\n" +
"  ln -s ~/PrairieNord/MontagnesEst ~/Montagnes\n\n" +
"Ensuite, « cd ~/Montagnes » t'emmène directement là-bas. ls -l montre les\n" +
"liens avec un l en premier signe et une flèche vers leur cible.\n" +
"Supprimer un lien (rm) n'abîme pas la cible. Si la cible disparaît, le lien\n" +
"reste là, brisé."
},
"cut": {
	resume: "ne garder que certaines colonnes d'un texte",
	titre: "découper",
	page:
"Utilise « cut » pour extraire une colonne dans des lignes dont les champs\n" +
"sont séparés par un même signe.\n\n" +
"  cut -d: -f1 OBJET         le 1er champ, les champs étant séparés par « : »\n" +
"  cut -d: -f1,3 OBJET       le 1er et le 3e\n" +
"  cut -d, -f2- OBJET        du 2e jusqu'au dernier, séparés par des virgules\n" +
"  cut -c1-10 OBJET          les 10 premiers caractères de chaque ligne\n\n" +
"Il brille dans un tuyau : cut -d: -f1 Registre | sort | uniq -c"
},
"top": {
	resume: "voir les processus les plus gourmands",
	titre: "le haut du classement",
	page:
"Utilise « top » pour voir quels processus consomment le plus, les plus\n" +
"gourmands en haut. Sous Linux il se rafraîchit en continu et se quitte\n" +
"avec la touche q.\n\n" +
"  top"
},
"id": {
	resume: "voir son numéro d'utilisateur et ses groupes",
	titre: "IDentité",
	page:
"Utilise « id » pour savoir comment le système te voit : ton numéro\n" +
"d'utilisateur (uid), ton groupe principal (gid) et tous tes groupes.\n\n" +
"  id\n" +
"  id NOM         la même chose pour quelqu'un d'autre\n\n" +
"L'utilisateur numéro 0, c'est root. Appartenir au groupe sudo donne le\n" +
"droit d'emprunter ses pouvoirs."
},
"passwd": {
	resume: "changer son mot de passe",
	titre: "PASSWorD",
	page:
"Utilise « passwd » pour changer ton mot de passe. Rien ne s'affiche\n" +
"pendant la frappe : c'est normal, et c'est voulu.\n\n" +
"  passwd\n\n" +
"Un bon mot de passe est long (12 caractères au moins), mélange majuscules,\n" +
"minuscules et chiffres, et ne sert qu'à un seul endroit. Une phrase entière\n" +
"fait très bien l'affaire."
},
"chown": {
	resume: "changer le propriétaire d'un lieu ou d'un objet",
	titre: "CHange OWNer (changer de propriétaire)",
	page:
"Utilise « chown » pour donner un lieu ou un objet à un autre utilisateur.\n" +
"Seul root en a le droit.\n\n" +
"  sudo chown NOM CIBLE\n\n" +
"ls -l montre le propriétaire dans la deuxième colonne. chmod règle ce que\n" +
"chacun a le droit de faire, chown règle à qui la chose appartient."
},
"df": {
	resume: "voir la place restante sur les disques",
	titre: "Disk Free (place libre)",
	page:
"Utilise « df » pour voir le remplissage de chaque disque de la machine.\n\n" +
"  df\n" +
"  df -h       en unités lisibles (K, M, G) plutôt qu'en blocs\n\n" +
"Un disque plein à 100 % est une des pannes les plus fréquentes qui soient."
},
"du": {
	resume: "mesurer le poids d'un lieu ou d'un objet",
	titre: "Disk Usage (place occupée)",
	page:
"Utilise « du » pour savoir ce qui prend de la place.\n\n" +
"  du LIEU           le poids de chaque sous-lieu, puis le total\n" +
"  du -s LIEU        seulement le total\n" +
"  du -a LIEU        en détaillant aussi chaque objet\n" +
"  du -h LIEU        en unités lisibles\n" +
"  du * | sort -n    classe tout ce qu'il y a ici, le plus lourd en dernier\n\n" +
"Dans ce monde, le poids d'un objet est son nombre de caractères."
},
"tar": {
	resume: "ranger des objets dans une archive, ou les en sortir",
	titre: "Tape ARchive (archive)",
	page:
"Utilise « tar » pour regrouper plusieurs objets en un seul, ou pour ouvrir\n" +
"une archive.\n\n" +
"  tar -tf ARCHIVE              liste son contenu (t : table)\n" +
"  tar -xf ARCHIVE              extrait tout, ici (x : extract)\n" +
"  tar -cf ARCHIVE OBJETS...    crée une archive (c : create)\n" +
"  tar -xvf ARCHIVE             v : détaille ce qu'il fait\n\n" +
"Le f veut dire « file » : le nom de l'archive le suit toujours.\n" +
"Les archives servent aux sauvegardes et aux transferts."
},
"crontab": {
	resume: "voir ou retirer les tâches planifiées",
	titre: "la table de cron",
	page:
"Sous Linux, le démon cron relance des commandes à heures fixes. Chaque\n" +
"utilisateur a sa liste de tâches, sa crontab.\n\n" +
"  crontab -l                    affiche ta crontab\n" +
"  crontab -r                    la retire entièrement\n" +
"  sudo crontab -u NOM -l        affiche celle d'un autre\n" +
"  sudo crontab -u NOM -r        retire celle d'un autre\n\n" +
"Lire une ligne :\n" +
"  30 7 * * 1   commande\n" +
"  minute, heure, jour du mois, mois, jour de la semaine. Ici : tous les\n" +
"  lundis à 7 h 30. Une étoile veut dire « à chaque fois ».\n\n" +
"Un processus qui renaît sitôt tué ? Cherche qui le relance."
},
"hostname": {
	resume: "connaître le nom de la machine",
	titre: "le nom d'hôte",
	page:
"Utilise « hostname » pour afficher le nom de la machine sur laquelle tu\n" +
"te trouves. C'est aussi ce qu'indique ton invite, juste après l'arobase :\n" +
"apprenti@terminus\n\n" +
"  hostname"
},
"ping": {
	resume: "vérifier qu'une machine répond",
	titre: "le sonar",
	page:
"Utilise « ping » pour envoyer de petits paquets à une machine et écouter\n" +
"si elle répond, et en combien de temps.\n\n" +
"  ping MACHINE\n" +
"  ping -c 2 MACHINE      seulement 2 paquets\n\n" +
"100 % de paquets perdus : la machine est éteinte, injoignable, ou protégée\n" +
"par un pare-feu."
},
"ssh": {
	resume: "ouvrir un terminal sur une autre machine",
	titre: "Secure SHell (terminal à distance)",
	page:
"Utilise « ssh » pour te connecter à une autre machine, comme si tu étais\n" +
"assis devant. Tout ce qui passe par ssh est chiffré.\n\n" +
"  ssh MACHINE\n" +
"  ssh NOM@MACHINE     en se présentant sous un autre nom\n" +
"  exit                referme la connexion et te ramène d'où tu viens\n\n" +
"Il faut y avoir un compte : ici, les machines où tu es déjà allé."
},
"apt": {
	resume: "installer de nouveaux programmes",
	titre: "le gestionnaire de paquets",
	page:
"Sous Linux, les programmes s'installent depuis des dépôts, sous forme de\n" +
"paquets. apt est le gestionnaire de paquets de Debian et d'Ubuntu.\n\n" +
"  apt list                    voir les paquets disponibles\n" +
"  sudo apt update             mettre à jour la liste des paquets\n" +
"  sudo apt install PAQUET     installer un paquet\n\n" +
"Installer modifie le système : il faut donc sudo."
},
"cowsay": {
	resume: "faire parler une vache",
	titre: "la vache qui dit",
	page:
"Indispensable à tout administrateur sérieux.\n\n" +
"  cowsay Bonjour\n" +
"  echo $USER | cowsay\n" +
"  ls | cowsay"
}
};
