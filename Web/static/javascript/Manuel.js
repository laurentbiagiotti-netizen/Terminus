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
	"ls", "cd", "pwd", "less", "help", "man", "clear", "exit",
	"mv", "cat", "head", "tail", "wc", "history",
	"chmod", "rm", "mkdir", "rmdir", "touch", "cp",
	"grep", "echo", "sort", "uniq",
	"ps", "kill", "whoami", "find", "tree", "sudo"
];

/* Sorts connus des le depart. */
var SORTS_DE_DEPART = ["ls", "cd", "pwd", "less", "help", "man", "clear", "exit"];

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
	page: "Sous Linux, « exit » ferme le terminal. Ici, on ne quitte pas Terminus si facilement."
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
"  mv Cage/Objet .          le point désigne « ici »\n\n" +
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
"  history | grep mv     retrouve tous tes sorts de déplacement"
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
"  cp OBJET ../COPIE    la copie peut atterrir ailleurs"
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
"relire sa ligne avant d'appuyer sur Entrée."
}
};
