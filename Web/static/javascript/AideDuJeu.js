/**
 * AideDuJeu.js : la page d'aide de chaque commande du JEU (celles qui n'existent pas sous Linux).
 *
 *   help COMMANDE, COMMANDE --help et man COMMANDE affichent la même page : toutes les sous-commandes
 *   et options qui marchent vraiment, avec des exemples. Chaque page est écrite d'après le code de la commande.
 *   help SORT (un sort Linux déjà appris) montre sa page de manuel, comme SORT --help.
 *
 * Chargé après tous les chapitres (HabitantsPort.js) et Navigation.js, avant Intro.js : les pages
 * remplacent les résumés courts posés par chaque chapitre. Guide.js (chargé plus tard, dans le
 * navigateur seulement) ne réécrit plus ces pages.
 */

var PAGES_DU_JEU = {
	help:
		"help n'est PAS seulement une commande Linux : dans le jeu, c'est ton aide-mémoire (aide et sorts sont ses autres noms).\n\n" +
		"  help              tes sorts du chapitre en cours, puis les commandes du jeu\n" +
		"  help N            tes sorts du chapitre N (help 1 à help 8)\n" +
		"  help tout         tous tes sorts, tous chapitres confondus (help all marche aussi)\n" +
		"  help COMMANDE     le détail d'une commande du jeu : help badges, help quetes, help aller...\n" +
		"  help SORT         la page d'un sort que tu connais déjà, comme SORT --help ou man SORT\n\n" +
		"Pendant l'épreuve finale, help liste tous tes sorts en colonnes et les commandes de l'épreuve.\n\n" +
		"Exemples : help 3, help tout, help indice, help ls",
	quetes:
		"quetes n'est PAS une commande Linux : c'est une commande du jeu, ton journal de quêtes.\n\n" +
		"  quetes            le journal : pour chaque chapitre ouvert, ses étapes (cochées ou non), l'étape en cours\n" +
		"                    avec son indice gratuit, les quêtes secondaires que tu as découvertes et la note du chapitre\n" +
		"  quetes 1          déplie le chapitre 1 (une fois le chapitre 1 derrière toi, il tient sur une seule ligne)\n" +
		"  quetes annexes    le détail des quêtes annexes des habitants, étape par étape (hors note ; quetes annexe aussi)\n\n" +
		"Les quêtes secondaires pas encore découvertes restent cachées : on les trouve en parlant aux habitants et en fouillant.\n" +
		"Pendant l'épreuve finale, quetes montre le bilan de l'épreuve.\n\n" +
		"Exemples : quetes, quetes 1, quetes annexes",
	indice:
		"indice n'est PAS une commande Linux : c'est une commande du jeu, un coup de pouce quand tu es bloqué.\n\n" +
		"  indice            rappelle l'étape en cours et son indice gratuit, signale gratuitement ce qui peut te bloquer\n" +
		"                    sans que tu le voies (un sort qui te manque, par exemple), puis propose un indice payant :\n" +
		"                    le premier, plus précis, coûte 30 XP sur la note du chapitre ; le second donne la solution (60 XP).\n" +
		"                    Réponds oui pour l'acheter, n'importe quoi d'autre pour refuser. Un indice payé se relit gratuitement.\n\n" +
		"L'étape en cours est celle du chapitre où tu es (chapitres pour la liste, aller N pour changer de chapitre).\n\n" +
		"Pendant l'épreuve finale :\n" +
		"  indice            un indice sur la première épreuve pas encore réussie (-0,25 point, 5 indices au plus)\n" +
		"  indice 7          sur l'épreuve VII (indice VII marche aussi)\n\n" +
		"Exemples : indice, puis oui pour acheter l'indice suivant",
	xp:
		"xp n'est PAS une commande Linux : c'est une commande du jeu (score est son autre nom).\n\n" +
		"  xp                ton expérience : ton niveau, d'où viennent tes XP (quêtes, sorts appris, premières utilisations,\n" +
		"                    lieux découverts), les indices payés, ta note sur 20, puis un tableau par chapitre ouvert\n" +
		"  score             la même chose\n\n" +
		"Chaque chapitre a sa propre note sur 20. En renfort, le chapitre 1 n'est ni joué ni noté : xp ne montre que tes chapitres.\n" +
		"Pendant l'épreuve finale, xp montre le bilan de l'épreuve.\n\n" +
		"Barème : 100 XP par étape (300 pour la dernière d'un chapitre), 50 par quête secondaire, 10 par sort appris,\n" +
		"5 la première fois qu'on s'en sert, 5 par lieu découvert. Les indices payants se retirent de la note.",
	bulletin:
		"bulletin n'est PAS une commande Linux : c'est une commande du jeu, ton relevé de compétences du chapitre 1.\n\n" +
		"  bulletin          une note sur 20 pour chacun des six blocs de compétences (BC 01 se repérer et se documenter,\n" +
		"                    BC 02 manipuler lieux et objets... BC 06 système et réseau), la moyenne générale,\n" +
		"                    et les sorts que tu connais mais n'as jamais lancés\n\n" +
		"Un bloc est acquis quand chacun de ses sorts a été appris puis lancé au moins une fois.",
	succes:
		"succes n'est PAS une commande Linux : c'est une commande du jeu.\n\n" +
		"  succes            tous les succès, débloqués (◆) ou encore à gagner (◇), avec ce qu'il faut faire pour chacun\n\n" +
		"Quelques-uns : Premiers pas (10 sorts), Plombier (4 sorts dans un tuyau), Éclair (le Sorcier Noir en moins d'une heure).",
	chrono:
		"chrono n'est PAS une commande Linux : c'est une commande du jeu.\n\n" +
		"  chrono            ton temps de jeu, puis, chapitre par chapitre, l'heure à laquelle tu as franchi chaque étape\n" +
		"                    et le temps passé depuis la précédente, façon speedrun\n\n" +
		"Les pauses de plus de deux minutes ne comptent pas.",
	son:
		"son n'est PAS une commande Linux : c'est un réglage du jeu.\n\n" +
		"  son               allume ou coupe les petits bips (sorts, quêtes, succès)\n" +
		"  son on            les allume (son oui marche aussi)\n" +
		"  son off           les coupe (son non marche aussi)\n\n" +
		"Avec le son, une ambiance discrète accompagne chaque chapitre : ambiance off la coupe en gardant les bips.",
	crt:
		"crt n'est PAS une commande Linux : c'est un réglage du jeu, le mode « vieil écran ».\n\n" +
		"  crt               allume ou coupe le vieil écran (lignes de balayage, halo vert)\n" +
		"  crt on            l'allume (crt oui marche aussi)\n" +
		"  crt off           l'affichage net (crt non marche aussi)",
	carte:
		"carte n'est PAS une commande Linux : c'est une commande du jeu.\n\n" +
		"  carte             la carte des lieux que tu as visités, en arbre (comme tree), avec « tu es ici » ;\n" +
		"                    un lieu voisin pas encore visité apparaît en « ? ». Le réseau de l'école s'y ajoute une fois\n" +
		"                    découvert. Dans le navigateur, la carte remplace l'image jusqu'à ton prochain déplacement.",
	schema: MANUEL_DU_JEU.schema + "\n\n  schema            le schéma du réseau (pendant la panne, chapitre 2 ; avant, il le dit simplement)",
	traque: MANUEL_DU_JEU.traque + "\n\n  traque            le tableau de chasse (à partir de la mission cyber, chapitre 3)",
	badges:
		"badges n'est PAS une commande Linux : c'est une commande du jeu, comme quetes ou xp.\n" +
		"Chaque étape franchie rapporte un badge de compétence (Adressage IP, Résolution DNS, Bit SUID...). badges les liste,\n" +
		"avec la leçon de chacun : c'est ton aide-mémoire, à relire avant une évaluation. Seuls les chapitres ouverts ont des badges.\n\n" +
		"  badges            tous tes badges : ceux gagnés avec leur leçon, ceux à gagner en gris\n" +
		"  badges N          ceux du chapitre N (badges 2 à badges 8 ; le chapitre 1 n'en donne pas, son bilan c'est bulletin)\n" +
		"  badges reseau     ceux du réseau (la panne, couche par couche ; badges panne aussi)\n" +
		"  badges cyber      ceux de la cybersécurité (la chasse au Corbeau ; badges chasse, badges securite)\n" +
		"  badges arcanes    ceux de Linux avancé (l'Académie des Arcanes ; badges academie, badges avance, badges linux)\n" +
		"  badges bastion    ceux du durcissement Linux (le Bastion ; badges durcissement, badges hardening)\n" +
		"  badges lumen      ceux de l'exploitation Linux (Lumen ; badges exploitation, badges machines)\n" +
		"  badges port-aube  ceux des services réseau Linux (Port-Aube ; badges portaube, badges ile, badges services)\n" +
		"  badges port       ceux des conteneurs (le Grand Port ; badges grand-port, badges conteneurs, badges docker)\n" +
		"  badges chronique  ceux de Git (la Chronothèque ; badges git, badges chronotheque)\n" +
		"  badges MOT        un badge précis, par un mot du nom de sa compétence : relit sa leçon\n\n" +
		"Exemples : badges 2, badges dns, badges sudo, badges port",
	grimoire: MANUEL_DU_JEU.grimoire + "\n\nHors du chapitre 4 (avant l'ouverture de l'Académie), il dit simplement quand il s'ouvrira.",
	rempart: MANUEL_DU_JEU.rempart + "\n\nAvant l'ouverture du Bastion, il dit simplement quand il s'ouvrira.",
	lanterne: MANUEL_DU_JEU.lanterne + "\n\nAllumer le Phare relève la lumière de la cité : certaines étapes du chapitre le demandent.",
	chantier: MANUEL_DU_JEU.chantier + "\n\nDérouler le plan relève la note de la cité : certaines étapes du chapitre le demandent.",
	port: MANUEL_DU_JEU.port + "\n\nLe plan est affiché dans la capitainerie : il faut d'abord être entré dans le Grand Port.\n" +
		"Déployer le plan relève la puissance de la flotte : une étape du chapitre le demande.",
	galons: MANUEL_DU_JEU.galons + "\n\nAvant l'ouverture du Grand Port (chapitre 8), il dit simplement où se gagnent les galons.",
	sablier: MANUEL_DU_JEU.sablier + "\n\nAvant l'ouverture de la Chronothèque (chapitre 9), il dit simplement quand elle s'ouvrira.\n" +
		"Retourner le sablier relève l'intégrité de la Chronique : la première étape du chapitre le demande.",
	sceaux: MANUEL_DU_JEU.sceaux + "\n\nAvant l'ouverture de la Chronothèque (chapitre 9), il dit simplement où se gagnent les sceaux.",
	regenerer: MANUEL_DU_JEU.regenerer + "\n\nAvant l'ouverture de la Chronothèque (chapitre 9), il dit simplement où il sert.",
	examen:
		"examen n'est PAS une commande Linux : c'est une commande du jeu, l'entrée de l'épreuve finale.\n\n" +
		"Hors épreuve :\n" +
		"  examen            demande le code d'accès donné par ton formateur, compte tes badges (20 % de la note finale),\n" +
		"                    puis, si tu réponds oui, ouvre l'épreuve dans une partie à part : ta partie reste intacte\n" +
		"Pendant l'épreuve :\n" +
		"  examen            le bilan : épreuves réussies, temps, badges, note provisoire ; à la fin, ton diplôme et son code\n" +
		"  examen quitter    revenir à ta partie normale (oui pour confirmer ; l'épreuve reste en l'état, examen et le code y ramènent)\n\n" +
		"Pendant l'épreuve, chapitre, chapitres, aller et recommencer sont refusés : il n'y a que la Forteresse.",
	kamikaze:
		"kamikaze n'est PAS une commande Linux : pendant l'épreuve finale, il rend ta copie.\n" +
		"Ta note est celle de ce que tu as accompli, et ton diplôme porte son code.\n\n" +
		"  kamikaze          rendre ta copie maintenant (oui pour confirmer)\n\n" +
		"Hors de l'épreuve, il ne fait rien ; une fois la copie rendue, examen remontre le diplôme.",
	sceller:
		"sceller n'est PAS une commande Linux : à la fin de l'épreuve finale, le formateur la tape sur le poste de l'étudiant,\n" +
		"avec son mot de passe. Le code du diplôme porte alors un sceau que personne ne peut fabriquer sans ce mot de passe.\n\n" +
		"  sceller           montre ce qui va être scellé (note, épreuves, temps, alertes), puis demande le mot de passe\n" +
		"                    du formateur ; Entrée seule : ne pas sceller\n\n" +
		"Il ne sert qu'après la fin de l'épreuve (Forteresse reprise, ou kamikaze).",
	verifier:
		"verifier n'est PAS une commande Linux : il lit un code de diplôme ou de certificat et dit s'il est authentique.\n\n" +
		"  verifier CODE     le document (diplôme, certificat de tel chapitre, épreuve finale), le nom, la note, le temps,\n" +
		"                    les commandes, les indices et la date ; un code retouché est signalé\n\n" +
		"Un code d'épreuve finale scellé demande en plus le mot de passe du formateur pour contrôler le sceau.\n\n" +
		"Exemple : cat ~/Diplome, puis verifier suivi du code de vérification imprimé dessus",
	recommencer:
		"recommencer n'est PAS une commande Linux : c'est une commande du jeu.\n\n" +
		"  recommencer       efface toute ta progression et repart de zéro (oui pour confirmer) ; ton compte et ton mot de passe\n" +
		"                    sont gardés. Utile pour choisir un départ direct (chapitre 2 à chapitre 9) sur une partie neuve.\n\n" +
		"Pour ouvrir un autre chapitre sans rien perdre, préfère aller N (le renfort). Refusé pendant l'épreuve finale.",
	/* La même page que man logout (Shell.js). */
	logout: PAGE_LOGOUT,
	quiz:
		"quiz n'est PAS une commande Linux : c'est une commande du jeu.\n" +
		"À la fin de chaque chapitre, cinq questions tirées au hasard dans ses leçons. Ton meilleur score est gardé.\n\n" +
		"  quiz              le quiz du chapitre en cours, s'il est terminé\n" +
		"  quiz N            le quiz du chapitre N, une fois ce chapitre terminé (quiz 1 à quiz 9)\n\n" +
		"Pendant le quiz : 1 à 4 pour répondre, Échap pour sortir. Avant la fin du chapitre, quiz dit simplement qu'il n'est pas ouvert.\n\n" +
		"Exemple : quiz 2",
	ambiance:
		"ambiance n'est PAS une commande Linux : un fond sonore discret par chapitre (le village, la salle des serveurs, le donjon, le port).\n\n" +
		"  ambiance          l'allume ou la coupe\n" +
		"  ambiance on       l'allume, et allume le son s'il était coupé (ambiance oui marche aussi)\n" +
		"  ambiance off      la coupe ; les bips restent (ambiance non marche aussi ; son off coupe tout)",
	texte:
		"texte n'est PAS une commande Linux : elle règle la taille du texte du jeu (de 85 % à 150 %).\n\n" +
		"  texte             la taille actuelle\n" +
		"  texte +           plus grand (texte plus, texte grand)\n" +
		"  texte -           plus petit (texte moins, texte petit)\n" +
		"  texte normal      la taille d'origine (texte 0)",
	contraste:
		"contraste n'est PAS une commande Linux : elle passe le jeu en contraste fort (texte blanc, couleurs vives, sans effet de vieil écran).\n\n" +
		"  contraste         l'allume ou le coupe\n" +
		"  contraste on      l'allume, et coupe le vieil écran (contraste oui marche aussi)\n" +
		"  contraste off     revient au contraste normal (contraste non marche aussi ; crt on remet le vieil écran)",
	cinematique:
		"cinematique n'est PAS une commande Linux : c'est une commande du jeu, comme quetes ou badges.\n" +
		"Chaque chapitre s'ouvre une seule fois sur sa cinématique ; cette commande la rejoue.\n\n" +
		"  cinematique       celle du chapitre en cours\n" +
		"  cinematique N     celle du chapitre N : 1 (Terminus), 2 (la panne), 3 (la Crypte), 4 (l'Académie), 5 (le Bastion),\n" +
		"                    6 (Lumen), 7 (Port-Aube), 8 (le Grand Port), 9 (la Chronothèque)\n\n" +
		"Entrée passe au plan suivant, Échap passe tout. Si ton système demande moins d'animations, elles sont coupées.",
	chapitre:
		"chapitre n'est PAS une commande Linux : c'est une commande du jeu.\n\n" +
		"  chapitre          la liste des neuf chapitres, comme chapitres : leur état, ta note, comment t'y rendre\n" +
		"  chapitre N        au tout début d'une partie neuve : partir directement au chapitre N (oui pour confirmer).\n" +
		"                    chapitre 2 : le renfort réseau (la panne) ; chapitre 3 : la mission cyber (la Crypte) ;\n" +
		"                    chapitre 4 à chapitre 9 : l'Académie, le Bastion, Lumen, Port-Aube, le Grand Port, la Chronothèque.\n" +
		"                    Les chapitres d'avant ne sont alors pas notés pour toi.\n" +
		"                    En cours de partie : dit où est le chapitre N s'il est ouvert, sinon quand il s'ouvrira.\n\n" +
		"Pour te rendre à un chapitre, ou en ouvrir un autre en cours de partie sans rien perdre : aller N.\n" +
		"Refusé pendant l'épreuve finale.\n\n" +
		"Exemples : chapitre, chapitre 3 (sur une partie neuve)",
	chapitres:
		"chapitres n'est PAS une commande Linux : c'est une commande du jeu.\n\n" +
		"  chapitres         les neuf chapitres : leur état (en cours, ouvert, terminé, fermé, non joué), ta note sur 20\n" +
		"                    s'il y en a une, le chapitre où tu es (◀), et comment t'y rendre (aller N)\n\n" +
		"Même chose que chapitre sans numéro. Refusé pendant l'épreuve finale.",
	aller:
		"aller n'est PAS une commande Linux : c'est une commande du jeu, pour changer de chapitre en cours de partie.\n\n" +
		"  aller N           un chapitre ouvert : t'emmène à son lieu d'entrée (les connexions ssh en cours sont fermées),\n" +
		"                    en fait le chapitre en cours (la barre d'état, quetes, indice et help le suivent) et affiche son étape\n" +
		"  aller N           un chapitre 4 à 8 pas encore ouvert : propose de l'ouvrir en renfort (oui pour confirmer).\n" +
		"                    Rien n'est perdu : tes autres chapitres gardent leur progression et leur note, et les chapitres\n" +
		"                    sautés restent « non joués ». Les sorts des chapitres d'avant te sont prêtés : si tu les apprends\n" +
		"                    ensuite pour de vrai dans leur chapitre, ils rapportent leurs XP comme d'habitude.\n\n" +
		"Seul le chapitre où tu es fait avancer son horloge (la bombe, l'aube, la Longue Nuit, la marée, la flotte) :\n" +
		"les autres t'attendent. Le chapitre en cours suit aussi tes pas : entrer dans l'Académie, le Bastion, Lumen,\n" +
		"Port-Aube, le Grand Port ou la Chronothèque, ou y franchir une étape, en fait le chapitre en cours.\n\n" +
		"Refusé : pendant l'épreuve finale ; un chapitre 1, 2 ou 3 fermé (ils s'ouvrent dans l'ordre de l'histoire) ;\n" +
		"un chapitre 4 à 9 tant que l'épreuve de première année n'est pas finie (bats d'abord le Sorcier Noir).\n" +
		"Au tout début d'une partie neuve, aller N fait comme chapitre N : un départ direct.\n\n" +
		"Exemples : aller 2, aller 5, chapitres"
};
PAGES_DU_JEU.score = PAGES_DU_JEU.xp;
PAGES_DU_JEU.rang = PAGES_DU_JEU.galons;
/* aide et sorts : les autres noms de help (aide est aussi l'outil AIDE du Bastion, avec une option). */
var CORPS_DE_HELP = PAGES_DU_JEU.help.substring(PAGES_DU_JEU.help.indexOf("\n\n") + 2);
PAGES_DU_JEU.aide = "aide n'est PAS une commande Linux : c'est l'autre nom de help dans le jeu (aide 3, aide tout, aide badges...).\n\n" + CORPS_DE_HELP +
	(MANUEL_DU_JEU.aide ? "\n\n" + MANUEL_DU_JEU.aide.replace(/^aide est l'autre nom de help dans le jeu\.\n\n/, "") : "");
PAGES_DU_JEU.sorts = "sorts n'est PAS une commande Linux : c'est l'autre nom de help dans le jeu (sorts 3, sorts tout, sorts badges...).\n\n" + CORPS_DE_HELP;

/* Les pages remplacent les résumés courts : man COMMANDE les montre aussi. */
Object.keys(PAGES_DU_JEU).forEach(function(nom){ if (nom !== "help") MANUEL_DU_JEU[nom] = PAGES_DU_JEU[nom]; });
/* help est aussi un sort : sa page de manuel dit tout ce qu'il sait faire. */
if (typeof MANUEL !== "undefined" && MANUEL.help) MANUEL.help.page = PAGES_DU_JEU.help.replace(/^help n'est PAS seulement une commande Linux : dans le jeu, c'est ton aide-mémoire \(aide et sorts sont ses autres noms\)\.\n\n/,
	"Tape « help » pour revoir la liste des sorts que tu connais (aide et sorts sont ses autres noms).\n\n");

/* La page d'une commande du jeu, telle que la montrent help COMMANDE, COMMANDE --help et man COMMANDE. */
function pageCommandeDuJeu(nom){
	if (!nom || !PAGES_DU_JEU.hasOwnProperty(nom) || SORTS_DU_JEU.indexOf(nom) === -1 && nom !== "help") return null;
	return C.jaune("Commande du jeu") + "\n\n" + PAGES_DU_JEU[nom];
}

/* help COMMANDE et help SORT : la page ; le reste (help, help N, help tout, l'épreuve finale) ne change pas. */
function pageDemandeeAHelp(args){
	if (args.length !== 1) return null;
	var nom = String(args[0]);
	if (nom === "help" || nom === "aide" || nom === "sorts") return pageCommandeDuJeu(nom);
	var page = pageCommandeDuJeu(nom);
	if (page) return page;
	var sort = nom === "vi" ? "vim" : nom;
	if (typeof MANUEL !== "undefined" && MANUEL[sort] && state.knows(sort)){
		GameEvents.fire({ type: "aide", spell: sort });
		return C.gras(sort) + " : " + MANUEL[sort].titre + "\n\n" + MANUEL[sort].page;
	}
	return null;
}
var HELP_AVANT_PAGES = Shell.sorts.help, AIDE_AVANT_PAGES = Shell.sorts.aide, SORTS_AVANT_PAGES = Shell.sorts.sorts;
Shell.sorts.help = function(args, io){ return pageDemandeeAHelp(args) || HELP_AVANT_PAGES.apply(this, arguments); };
Shell.sorts.sorts = function(args, io){ return pageDemandeeAHelp(args) || SORTS_AVANT_PAGES.apply(this, arguments); };
/* aide avec une option (--check, --init...) reste l'outil AIDE du Bastion. */
Shell.sorts.aide = function(args, io){ return pageDemandeeAHelp(args) || AIDE_AVANT_PAGES.apply(this, arguments); };
