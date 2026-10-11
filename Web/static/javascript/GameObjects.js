/**
* Objects used to build levels
*
* Terminus, édition Cybersup : même monde et même histoire que le jeu d'origine,
* traduits en français, avec davantage de sorts à apprendre en chemin.
*/

/**
* ROOMS
* Players can cd between rooms
*
* API: Room(roomname, introtext, img){
*/

/* Petit générateur pseudo-aléatoire : les longs textes sont identiques à chaque partie. */
function Hasard(graine){ this.g = graine; }
Hasard.prototype.suivant = function(){
    this.g = (this.g * 48271) % 2147483647;
    return this.g / 2147483647;
};
Hasard.prototype.entier = function(n){ return Math.floor(this.suivant() * n); };
Hasard.prototype.choix = function(liste){ return liste[this.entier(liste.length)]; };
function deuxChiffres(n){ return n < 10 ? "0" + n : "" + n; }

//---------------NIVEAU 1---------------------
//HOME
var Home = new Room("Maison",
    "Tu es chez toi, bien au chaud.",
    "loc_farm.gif");
Home.addItem(new Item("LettreDeBienvenue", "Bienvenue ! Si tu découvres le jeu, voici quelques conseils :\n\n" +
		"Regarde autour de toi avec le sort « ls ».\n" +
		"Va dans un autre lieu avec « cd LIEU ».\n" +
		"Reviens sur tes pas avec « cd .. ».\n" +
		"Examine un objet ou parle à quelqu'un avec « cat OBJET ».\n" +
		"Pour un très long texte, « less OBJET » en montre la première page.\n\n" +
        "Si tu ne sais plus où tu es, tape « pwd ».\n" +
        "Si tu ne sais plus quoi faire, tape « quetes ». Et « help » te rappelle tes sorts.\n\n" +
		"Vas-y, explore. Nous espérons que ce que tu trouveras te plaira.\n" +
        "Ta Convocation de rentrée à Cybersup est arrivée ce matin : elle est posée juste à côté.\n" +
        "Tout ce que tu apprendras ici fonctionne aussi dans un vrai terminal Linux.",
    "item_manuscript.gif"));
var ChaussetteGauche = new Item(".ChaussetteGauche",
    "Ta chaussette gauche, disparue depuis des semaines ! Elle était là depuis le début, \
cachée par un simple point au début de son nom. Sous Linux, c'est tout ce qu'il faut \
pour qu'une chose échappe à « ls ».",
    "none.gif").droits("rw-r--r--", JOUEUR);
Home.addItem(ChaussetteGauche);
Home.addItem(new Item("Convocation",
    "CYBERSUP · école de cybersécurité\n\
8 Terrasse Bellini, Puteaux (La Défense)\n\
\n\
CONVOCATION DE RENTRÉE\n\
\n\
Tu es attendu aujourd'hui pour ta rentrée en première année (B1).\n\
\n\
  1. Passe à l'Accueil du campus retirer ta carte étudiante et signer la feuille d'émargement.\n\
     Le campus est tout près de chez toi : cd Cybersup\n\
  2. Suis ton premier cours, en SalleDeCours.\n\
  3. Une épreuve pratique clôturera la journée. Le lieu et le nom du surveillant \
te seront communiqués en temps voulu.\n\
\n\
Aucun document autorisé pendant l'épreuve, sauf le manuel (man).\n\
\n\
Laurent, Directeur Pédagogique\n\
\n\
PS : d'ici là, rien ne t'interdit d'aller te promener. Il paraît que la forêt est belle en cette saison.",
    "item_manuscript.gif"));

//WESTERN FOREST
var WesternForest = new Room("ForetOuest",
    "Tu t'enfonces profondément dans la forêt. \
Le sentier finit par déboucher sur une clairière où se dresse un bâtiment imposant. Un panneau \
indique : Académie des Sorts, l'école d'élite de la magie.",
    "loc_forest.gif");
WesternForest.addItem(new Item("Panneau",
    "Académie des Sorts : l'école d'élite de la magie.\n\
Aujourd'hui seulement : cours d'initiation gratuits ! Débutants bienvenus !",
    "item_sign.gif"));
WesternForest.addItem(new Item("DosDuPanneau",
    "Si un jour tu veux rentrer directement à la Maison, tape « cd ~ » ou simplement « cd » \
et te voilà chez toi. Revenir ici sera peut-être plus long.\n\n\
Trois raccourcis de voyageur :\n\
  cd -                               te ramène au lieu que tu viens de quitter\n\
  cd ForetOuest/AcademieDesSorts     traverse plusieurs lieux d'un coup : c'est un chemin\n\
  la touche Tab                      termine à ta place un nom dont tu as tapé le début",
    "item_sign.gif"));

//SPELL CASTING ACADEMY
var SpellCastingAcademy = new Room("AcademieDesSorts",
    "Les couloirs bourdonnent du va-et-vient des élèves qui courent d'un cours à l'autre. \
L'intérieur de l'académie est aussi impressionnant que sa façade : avec ses hauts plafonds \
et ses arches gothiques, elle paraît encore plus vaste du dedans.",
    "loc_academy.gif");
var HurryingStudent = new Item("EleveEnRetard",
    "Tu interpelles quelqu'un qui passe en courant. Collision : l'élève s'étale par terre, \
se relève d'un bond, s'excuse et te demande si ça va. Tu es plus solide que tu n'en as l'air : \
rien de cassé.\n\
« Pardon, pardon ! Je cours tellement que je ne regardais pas devant moi... Dis donc, on ne s'est \
jamais croisés. Tu débarques, pas vrai ? » Clin d'œil. « T'inquiète, c'est plein de nouveaux \
aujourd'hui. Va donc essayer un cours d'initiation gratuit ! Je t'aurais bien montré le chemin, \
mais je file en classe : je n'ai pas encore signé la feuille de présence, et ici ça ne pardonne pas. \
Entre dans la salle de Cours, on s'occupera de toi. Et si tu veux apprendre \
à lire comme un vrai mage, passe au Scriptorium. À plus ! »\n\
L'élève disparaît au coin du couloir avant que tu aies pu lui demander son nom. Dommage : \
quelqu'un de sympathique, et à peu près de ton âge.",
    "item_student.gif").personnage();
SpellCastingAcademy.addItem(HurryingStudent);

//PRACTICE ROOM
var PracticeRoom = new Room("SalleEntrainement",
    "La salle est remplie de mannequins sur lesquels les élèves s'exercent à leurs nouveaux sorts.",
    "loc_practiceroom.gif");
PracticeRoom.addItem(new Item("Consignes",
    "Bienvenue dans la salle d'entraînement. Tu y trouveras des mannequins sur lesquels \
essayer tes nouveaux sorts. Vas-y, lance-toi ! Si tu ne connais encore aucun sort, \
retourne suivre quelques Cours.\n\n\
Exercice du jour : range les cinq mannequins dans la Boite. Tu ne peux pas y entrer, \
mais tu peux vérifier ton travail de l'extérieur avec « ls Boite ».",
    "item_manuscript.gif").revele("s_mannequins"));
var Mannequins = [];
for (var numeroMannequin = 1; numeroMannequin <= 5; numeroMannequin++){
    var mannequin = new Item("Mannequin" + numeroMannequin, "C'est un mannequin d'entraînement.", "item_dummy.gif");
    mannequin.addValidCmd("mv");
    Mannequins.push(mannequin);
    PracticeRoom.addItem(mannequin);
}

//BOX
var Box = new Room("Boite", "Cette boîte est bien trop petite pour que tu y entres.", "item_box.gif");
Box.removeCommand("cd");
Box.atteignable = true;
Box.addCmdText("cd", "La boîte est bien trop petite pour toi. (Mais rien n'empêche d'y ranger des choses.)");

//LESSONS
var Lessons = new Room("Cours",
    "Tu entres dans la salle de Cours avec entrain. \
C'est bien plus calme ici : la plupart des leçons ont déjà commencé. \
On te pousse aussitôt dans le cours d'initiation, déjà entamé. \
Te voilà en pleine leçon sur le sort de déplacement.",
    "loc_classroom.gif");
Lessons.addItem(new Item("Professeur",
    "Le professeur est difficile à suivre, mais tu en retiens juste assez pour apprendre trois choses :\n\
\n\
1. Le sort « mv » déplace les choses dans le monde.\n\
2. Il faut indiquer l'objet, puis sa destination : mv OBJET DESTINATION\n\
3. Ce sort ne fonctionne que sur certains objets, par exemple les mannequins de la SalleEntrainement.\n\
\n\
En fin de leçon, il marmonne une astuce pour élèves avancés : l'étoile * remplace n'importe quelle \
suite de lettres. Ainsi « mv Mannequin* Boite » déplace d'un seul geste tout ce dont le nom commence \
par Mannequin.\n\
\n\
Tu n'as pas assez écouté pour retenir quels objets refusent de bouger. \
Tant pis : l'expérimentation, ça a toujours été ton style. Mais prudence !",
    "item_professor.gif").personnage().enseigne("mv"));

//SCRIPTORIUM (nouveau : head, tail, wc)
var Scriptorium = new Room("Scriptorium",
    "Des rangées de pupitres, une odeur d'encre et de vieux parchemin. \
Un copiste lève à peine les yeux de son ouvrage.",
    "loc_library.gif");
Scriptorium.addItem(new Item("Copiste",
    "Le copiste soupire sans lâcher sa plume. « Encore un débutant qui déroule tout un parchemin \
avec less pour n'en lire que la première ligne... Écoute bien, je ne le répéterai pas :\n\
\n\
  cat PARCHEMIN          affiche tout, d'une traite (celui-là, tu le connais déjà)\n\
  head PARCHEMIN         seulement les 10 premières lignes\n\
  tail PARCHEMIN         seulement les 10 dernières\n\
  head -n 3 PARCHEMIN    les 3 premières (pareil avec tail)\n\
  wc -l PARCHEMIN        compte les lignes sans rien afficher\n\
\n\
Tu veux t'exercer ? Le GrandParchemin est là, sur le pupitre. Dis-moi combien de lignes il compte, \
puis lis-moi son début et sa fin. Et sans le dérouler en entier, je te prie : \
il y en a pour la journée. »",
    "item_librarian.gif").personnage().enseigne("head", "tail", "wc").revele("s_parchemin"));
var GrandParchemin = (function(){
    var h = new Hasard(118);
    var regles = [
        "nul ne lancera rm sans avoir d'abord regardé avec ls.",
        "on vérifie où l'on est avec pwd avant de créer quoi que ce soit.",
        "un nom sans espace épargne bien des tracas.",
        "il est interdit de nourrir le poney de la PrairieNord après minuit.",
        "majuscules et minuscules ne sont pas la même lettre, et le terminal ne pardonne pas.",
        "qui ne sait pas, demande au vieil homme (man).",
        "la touche Tab est l'amie du mage paresseux, et tout bon mage est paresseux.",
        "on ne déplace pas ce qui ne nous appartient pas.",
        "un chevron écrase, deux chevrons ajoutent.",
        "les élèves surpris à dormir pendant le cours de mv seront changés en mannequins.",
        "ce qui commence par un point reste caché aux regards pressés.",
        "le point désigne ici, les deux points désignent le lieu d'avant.",
        "avant de copier, on s'assure que la copie ne porte pas le nom de l'original.",
        "nul ne prononcera sudo à la légère.",
        "on ne tue que ses propres processus.",
        "les trolls ne sont pas admis au réfectoire.",
        "un long parchemin se lit par les deux bouts, jamais par le milieu.",
        "l'étoile remplace ce que l'on a la flemme d'écrire.",
        "il n'existe pas de corbeille : ce qui est supprimé l'est pour de bon.",
        "grep trouve en un instant ce que l'œil cherche pendant une heure.",
        "on range ses mannequins après usage.",
        "un tuyau relie deux sorts, jamais deux élèves.",
        "toute chose a un propriétaire, et ls -l le connaît.",
        "le dragon mécanique de l'Artisane ne doit pas être remonté à fond."
    ];
    var lignes = [
        "Ceci est le Grand Parchemin de l'Académie des Sorts, recopié à la main par trois générations de copistes.",
        "Il énonce les cent dix-huit règles que tout apprenti doit connaître."
    ];
    var precedente = null;
    for (var n = 1; n <= 117; n++){
        var regle = h.choix(regles);
        while (regle === precedente) regle = h.choix(regles);
        precedente = regle;
        lignes.push("Règle " + n + " : " + regle);
    }
    lignes.push("Règle 118 et dernière : qui lit cette ligne sans avoir déroulé tout le parchemin a compris à quoi sert tail.");
    return new Item("GrandParchemin", lignes.join("\n"), "item_manuscript.gif");
})();
Scriptorium.addItem(GrandParchemin);
Scriptorium.addItem(new Item("ApprentiCopiste",
    "L'apprenti copiste se tord les mains. « Le maître m'a fait recopier le règlement ce matin, puis encore ce soir. \
Les deux copies devraient être identiques, mais j'ai un doute : quelqu'un a touché à mon pupitre pendant le dîner. \
Quarante lignes à comparer une à une... à moins de connaître diff.\n\
\n\
  diff COPIE1 COPIE2     n'affiche que les lignes qui diffèrent\n\
\n\
Si diff ne répond rien, c'est que les deux textes sont identiques. \
Tu veux bien comparer CopieDuMatin et CopieDuSoir pour moi ? »",
    "item_student.gif").personnage().enseigne("diff").revele("s_diff"));
var CopieDuMatin, CopieDuSoir;
(function(){
    var articles = [
        "le silence est de rigueur au Scriptorium.",
        "on ne court pas dans les couloirs, sauf en cas de retard.",
        "les mannequins de la SalleEntrainement ne sortent pas de l'Académie.",
        "tout sort appris doit être essayé au moins une fois.",
        "les parchemins se rangent par ordre alphabétique.",
        "il est interdit de lancer rm sur le déjeuner d'un camarade.",
        "les baguettes restent au vestiaire pendant les examens.",
        "on salue le professeur, même quand on n'a rien compris.",
        "les fenêtres se ferment avant la nuit, à cause des chauves-souris.",
        "nul ne modifie le règlement sans l'accord du conseil."
    ];
    var matin = [], soir = [];
    for (var n = 1; n <= 40; n++){
        var ligne = "Article " + n + " : " + articles[(n * 7) % articles.length];
        if (n === 17){
            matin.push("Article 17 : les parchemins se rendent avant minuit.");
            soir.push("Article 17 : les parchemins se rendent quand on veut.");
        } else {
            matin.push(ligne);
            soir.push(ligne);
        }
    }
    soir.push("Article 41 : le réfectoire sert du dessert deux fois par jour.");
    CopieDuMatin = new Item("CopieDuMatin", "RÈGLEMENT DE L'ACADÉMIE\n" + matin.join("\n"), "item_manuscript.gif");
    CopieDuSoir = new Item("CopieDuSoir", "RÈGLEMENT DE L'ACADÉMIE\n" + soir.join("\n"), "item_manuscript.gif");
})();
Scriptorium.addItem(CopieDuMatin);
Scriptorium.addItem(CopieDuSoir);

//NORTHERN MEADOW
var NorthernMeadow = new Room("PrairieNord",
    "Une belle prairie verdoyante. Un poney dodu mais majestueux y gambade joyeusement.",
    "loc_meadow.gif");
NorthernMeadow.addItem(new Item("Poney",
    "Tu t'approches du poney et tentes de le monter. \
Il se laisse faire, et tu tournes en rond un moment sur son dos. Puis, lassé de te porter, \
il te désarçonne. Il regarde alors vers l'est, comme pour te suggérer cette direction.",
    "item_fatpony.gif").personnage());

//EASTERN MOUNTAINS
var EasternMountains = new Room("MontagnesEst",
    "Tu suis un sentier de montagne qui finit par te mener à l'entrée d'une grotte. \
Assis juste devant, un vieil homme.",
    "loc_mountains.gif");
var OldMan = new Item("VieilHomme",
    "Tu engages la conversation avec le vieil homme. Il te salue chaleureusement, \
comme si vous étiez de vieux amis. Tu te sens tout de suite à l'aise.\n\
« Bien le bonjour ! Belle matinée pour l'aventure, pas vrai ? Tu m'as l'air jeune et plein \
d'énergie. Si tu as assez de courage, ton destin t'attend au fond de cette grotte. Il prendra \
la forme d'un portail. Franchis-le, et le prochain chapitre de ta vie commencera. »\n\
Le vieil homme lit la stupeur sur ton visage et t'adresse un sourire rassurant. \
« Je ne suis qu'un vieillard fragile, je ne peux pas t'accompagner là-dedans. Mais je peux \
t'offrir quelques sorts simples qui t'aideront en chemin. Lis donc mes vieux manuscrits et \
essaie-les. Et si un sort t'échappe, appelle-moi : man, suivi de son nom. Je t'entendrai, \
où que tu sois. »\n\
Tu remarques, dépassant de sa manche, un stylo rouge. Curieux accessoire pour un ermite.",
	"item_mysteryman.gif").personnage();
EasternMountains.addItem(OldMan);
EasternMountains.addItem(new Item("VieuxManuscrits",
    "Si tu oublies tes sorts, tape « help » : la liste de ceux que tu connais apparaîtra. \
Pour le détail d'un sort, tape « man » suivi de son nom. Par exemple, pour le sort mv : \
man mv\n\
\n\
Quatre secrets de vieux mage :\n\
  1. Certaines choses de ce monde sont cachées : leur nom commence par un point. \
« ls » ne les montre pas, mais « ls -a » (a comme all, tout) les révèle.\n\
  2. La flèche du haut rappelle tes derniers sorts, « history » en affiche la liste complète, \
et « !! » relance le tout dernier tel quel.\n\
  3. « ls -l » (l comme long) donne le détail de chaque chose : ses droits et son propriétaire.\n\
  4. Presque tous les sorts acceptent « --help » : « ls --help » te donne son aide-mémoire sans même me déranger.",
    "item_manuscript.gif").enseigne("history"));
var MotDuVieilHomme = new Item("MotSurLeRocher",
    "Le vieil homme n'est plus là. Sur son rocher, un mot tracé au stylo rouge :\n\
« Parti corriger des copies. Très bon travail. L. »",
    "item_manuscript.gif");

//CAVE
var Cave = new Room("Grotte", "Une grotte tout ce qu'il y a de plus classique : sombre et humide.", "loc_cave.gif");

//DARK CORRIDOR
var DarkCorridor = new Room("CouloirSombre",
    "Tu avances dans le couloir sombre et trouves, tout au bout, une petite salle humide.",
    "loc_corridor.gif");

//STAIRCASE
var Staircase = new Room("Escalier",
    "L'escalier de pierre te mène à un cul-de-sac, et à un panneau qui le confirme.",
    "loc_stair.gif");
Staircase.addItem(new Item("Panneau", "CUL-DE-SAC", "item_sign.gif"));
Staircase.addItem(new Item(".Graffiti",
    "Gravé au couteau, tout en bas de la dernière marche :\n\
« ls -a m'a montré ce graffiti. Si tu lis ceci, tu sais chercher ce qui se cache. \
Garde ce réflexe pour la SalleHumide. »",
    "item_sign.gif"));

//DANK ROOM
var DankRoom = new Room("SalleHumide",
    "Une salle humide qui sent le renfermé. Un rocher bien rond repose sur le côté droit.",
    "loc_darkroom.gif");
var Boulder = new Item("Rocher",
    "Tu sens un léger courant d'air venir de derrière le rocher. \
Et si tu le poussais hors du passage ? Il y a justement un PetitTrou où le faire rouler.",
    "item_boulder.gif");
Boulder.addValidCmd("mv");
Boulder.addCmdText("rm", "Le rocher est bien trop massif pour disparaître ainsi. Il faudrait plutôt le déplacer.");
DankRoom.addItem(Boulder);

//SMALL HOLE
var SmallHole = new Room("PetitTrou",
    "Il n'y a rien de passionnant dans ce petit trou, et c'est plutôt sale.",
    "none.gif");
SmallHole.removeCommand("cd");
SmallHole.atteignable = true;
SmallHole.addCmdText("cd",
    "Il n'y a rien de passionnant dans ce petit trou, et c'est plutôt sale. Tu préfères rester dehors.");

//TUNNEL (caché : son nom commence par un point)
var Tunnel = new Room(".Tunnel",
    "C'est très humide là-dedans. \
Tu perçois un petit mouvement velu du coin de l'œil. \
Sans doute un rat. Un très gros rat. Peut-être une mangouste. \
Au bout du tunnel, tu trouves une chambre de pierre.",
    "loc_tunnel.gif");
Tunnel.addItem(new Item("Rat",
    "En y regardant de plus près, tu établis que la présence velue est bel et bien un rat... \
de la taille d'un petit chien. Il te mord. \
Tu n'apprécies pas du tout.",
    "item_rat.gif").personnage());

//STONE CHAMBER
var StoneChamber = new Room("ChambreDePierre",
    "Toute la salle baigne dans une faible lueur verte. \
Elle émane d'un portail dressé au milieu de la pièce : à l'évidence, celui dont parlait le vieil homme. \
À côté se tient une stèle couverte d'inscriptions.",
    "loc_portalroom.gif");
var Stele = (function(){
    var h = new Hasard(755);
    var signes = ["/|\\", "|>", "<|", "^|^", "|x|", "\\|/", "|-|", "<>", "|:|", "/\\", "\\/", "|=", "=|", "+|+", "|/|"];
    var lignes = [
        "STÈLE DU PORTAIL",
        "",
        "Voyageur, ce portail est scellé. Regarde-le avec « ls -l » : tu verras ses droits.",
        "",
        "Les dix premiers signes d'une ligne de ls -l disent tout :",
        "",
        "    d rwx r-x r-x",
        "",
        "  Le premier signe : d pour un lieu, - pour un objet.",
        "  Puis trois groupes de trois : le propriétaire, son groupe, tous les autres.",
        "  Dans chaque groupe :",
        "    r   le droit de lire (read)",
        "    w   le droit d'écrire (write)",
        "    x   le droit de traverser un lieu, ou d'exécuter un objet (execute)",
        "    -   le droit manque",
        "",
        "Un lieu sans x est une porte close : on la voit, on ne la franchit pas.",
        "",
        "Le sort « chmod » change ces droits. Mais seul le propriétaire d'une chose",
        "peut le lancer sur elle.",
        "",
        "La formule exacte est gravée tout en bas de cette stèle.",
        "Les bâtisseurs avaient le sens de l'humour.",
        ""
    ];
    for (var n = 0; n < 140; n++){
        var runes = [];
        var combien = 8 + h.entier(6);
        for (var k = 0; k < combien; k++) runes.push(h.choix(signes));
        lignes.push("  " + runes.join(" "));
    }
    lignes.push("");
    lignes.push("Ce portail appartient à qui le trouve : il est donc à toi.");
    lignes.push("Pour l'ouvrir :    chmod +x Portail");
    return new Item("Stele", lignes.join("\n"), "item_sign.gif");
})();
Stele.enseigne("chmod");
StoneChamber.addItem(Stele);

//PORTAL (to bring you to the next level
var Portal = new Room("Portail",
    "Tu as été transporté à travers le temps...",
    "item_portal.gif");
Portal.droits("rw-r--r--", JOUEUR);
Portal.deny_text = "(Le portail est scellé : il lui manque un droit. La Stele en dit plus, et ls -l te le montrera.)";
//---------------END LEVEL 1-----------------


//---------------LEVEL 2---------------------
//TOWN SQUARE
var TownSquare = new Room("PlaceDuVillage",
    "Tu es sur une place de village ensoleillée et spacieuse. \
Au centre du rond-point pavé se dresse un piédestal, mais sans statue. \
L'architecture est charmante, mais tout le monde ici a l'air nerveux, va savoir pourquoi.",
    "loc_square.gif");
var Villageois = new Item("Villageois",
    "« Excusez-moi », commences-tu. L'homme se retourne en sursautant. \
« Oh, bonjour ! Bienvenue à Terminus. Il faudra nous pardonner, on est tous un peu \
à cran ces temps-ci, avec ce Sorcier Noir qui répand sa corruption tout le long de la \
côte. Fais attention à toi ! Si tu cherches des nouvelles, la Taverne est l'endroit où tout se dit.\n\
Et méfie-toi des drôles de voyageurs qu'on croise ces jours-ci : des jeunes gens en capuche, un grand Y brodé dans le dos, \
qui prennent des notes sur tout ce qu'on fait. Des espions du sorcier, si tu veux mon avis. »",
    "item_citizen1.gif").personnage();
TownSquare.addItem(Villageois);
var LecteurDeJournal = new Item("LecteurDeJournal",
    "L'homme lève les yeux de son journal en remarquant que tu le fixes. \
« Tu as lu ça ? » s'exclame-t-il en agitant sous ton nez la dernière édition du \
« Dernier Mot ». « Il est écrit que la corruption du sorcier s'étend désormais jusqu'à \
Oston, au sud, et que Nouvelle-Console est totalement irrécupérable ! Quelle époque », \
marmonne-t-il en secouant la tête avant de replonger dans sa lecture.",
    "item_citizen2.gif").personnage();
TownSquare.addItem(LecteurDeJournal);
var DistraughtLady = new Item("DameEploree",
    "La femme sanglote sans pouvoir s'arrêter, le visage dans les mains. \
« Mon bébé, pleure-t-elle, ils ont enlevé mon bébé ! Je suis sûre que ce sorcier \
y est pour quelque chose. »",
    "item_lady.gif").personnage().revele("s_enfant");
TownSquare.addItem(DistraughtLady);
TownSquare.addItem(new Item("AvisALaPopulation",
    "AVIS À LA POPULATION\n\
\n\
JEUDI SOIR, à la Taverne : un chevalier viendra raconter son métier à qui voudra l'entendre. Hydromel offert.\n\
\n\
LE FORGERON cherche un apprenti en alternance : trois jours à la forge, deux jours à l'Académie.\n\
\n\
RAPPEL : malgré la corruption qui ronge la côte, les examens sont maintenus.",
    "item_sign.gif"));

//MARKETPLACE
var Marketplace = new Room("Marche",
    "Des marchands et leurs étals s'alignent le long des rues.",
    "loc_market.gif");
var Vendor = new Item("Marchand",
    "« B'jour toi. » Le marchand te sourit d'un air déplaisant, \
dévoilant une bouche pleine de dents en or. « Alors ? Qu'est-ce que tu cherches ? \
J'ai là cinq parchemins de sorts, à lire sur place. SortRm et SortMkdir te seront vite indispensables. \
Les trois autres, c'est du confort. Mais un mage qui néglige son confort ne fait pas de vieux os. »",
    "item_merchant.gif").personnage();
Vendor.addCmdText("rm",
    "« Ha ! Ce sort-là ne marche pas sur tout, tu sais. J'ai peut-être oublié \
de le préciser avant de te le vendre... »");
Marketplace.addItem(Vendor);
var RmSpell = new Item("SortRm",
    "« Ah oui, le sort rm, songe le Marchand. Dis simplement “rm” suivi du nom d'un objet ou d'une personne, \
et ils disparaîtront de ce plan d'existence... pour toujours. Il n'y a ni corbeille ni retour en arrière. \
Auras-tu le cran de t'en servir, je me le demande. »",
    "item_manuscript.gif").enseigne("rm");
Marketplace.addItem(RmSpell);
var MkdirSpell = new Item("SortMkdir",
    "« Change tes rêves en réalité. Dis simplement “mkdir” suivi d'un nom qui te plaît, et tu créeras un lieu \
qui n'existait pas. Son contraire, “rmdir”, efface un lieu vide. Un peu capricieux, tout ça... » marmonne le Marchand.",
    "item_manuscript.gif").enseigne("mkdir", "rmdir");
Marketplace.addItem(MkdirSpell);
Marketplace.addItem(new Item("SortAlias",
    "« Le sort des paresseux, ricane le Marchand. Tape alias ll='ls -l', et désormais ll fera le travail de ls -l. \
alias, tout seul, te rappelle les tiens ; unalias ll l'oublie. Ne néglige pas les apostrophes : \
elles gardent le sort et ses options en un seul morceau.\n\
Les vrais mages ont des dizaines d'alias. C'est pour ça qu'on ne comprend jamais ce qu'ils tapent. »",
    "item_manuscript.gif").enseigne("alias", "unalias").revele("s_alias"));
Marketplace.addItem(new Item("SortExport",
    "« Une variable, c'est une boîte avec une étiquette. export CRI=Banzai la remplit, echo $CRI la lit, \
env les montre toutes. Pas d'espace autour du signe égal, les boîtes sont susceptibles.\n\
Le système en remplit quelques-unes pour toi : $USER, c'est ton nom ; $HOME, ta Maison ; $PWD, l'endroit où tu te tiens. » \
Le Marchand baisse la voix. « Entre nous : $PWD, combiné au parchemin SortLn, ça fait des raccourcis en or. »",
    "item_manuscript.gif").enseigne("export", "env").revele("s_variables"));
Marketplace.addItem(new Item("SortLn",
    "« Fatigué de retaper des chemins longs comme un jour sans pain ? ln -s CIBLE NOM trace un raccourci, \
ce que les mages appellent un lien symbolique. La recette qui marche à tous les coups : \
rends-toi à l'endroit qui t'intéresse, puis tape\n\
\n\
  ln -s $PWD ~/NomDuRaccourci\n\
\n\
$PWD, c'est le chemin complet du lieu où tu te tiens. Désormais « cd ~/NomDuRaccourci » t'y ramènera de n'importe où. \
Le raccourci n'est qu'une flèche : l'effacer avec rm n'abîme pas ce qu'elle montre. Et ls -l te dit où elle pointe. »",
    "item_manuscript.gif").enseigne("ln").revele("s_lien"));

//LIBRARY
var Library = new Room("Bibliotheque",
    "La bibliothèque est mal éclairée et sent le moisi. \
Mais il y fait bon, et l'épaisse moquette verte la rend plutôt douillette.",
    "loc_library.gif");
Library.addItem(new Item("GrimoireTropCool",
    "Les légendes parlent d'un grand mot de pouvoir qui permet à celui qui le prononce d'accomplir \
n'importe quelle action sur n'importe quel objet. « Sudo », comme l'appelaient les anciens, confère une maîtrise \
totale des éléments. Malheureusement, ou peut-être heureusement, le mot de passe mystique s'est perdu \
dans les sables du temps.",
    "item_radspellbook.gif"));
Library.addItem(new Item("RomanDeGare",
    "Tu ouvres le roman à une page au hasard. \
« Oh, Horatio, ne crains rien mon amour ! Je vais te sauver ! » s'écria Antonia en \
brandissant son épée, avant d'en transpercer adroitement le dragon. Horatio, stupéfait de ne pas avoir péri \
dans les flammes, s'effondra sur le sol en sanglotant et... Tu refermes le \
livre sans conviction et le reposes sur l'étagère.",
    "item_romancenovel.gif"));
var HistoryOfTerminus = (function(){
    var h = new Hasard(1042);
    var moissons = ["abondante", "médiocre", "correcte", "catastrophique", "étonnamment bonne", "dans la moyenne"];
    var decisions = ["de repeindre la fontaine", "d'interdire les duels de sorts après la tombée de la nuit",
        "de ne rien décider avant l'an prochain", "de taxer les parchemins vierges", "d'élargir le PontBrise, sans suite",
        "de rebaptiser la place, puis y renonce", "de recenser les trolls, faute de volontaires le projet est abandonné"];
    var creatures = ["poney dodu", "rat de la taille d'un petit chien", "elfe d'une laideur exceptionnelle",
        "dragon mécanique", "troll de mauvaise humeur", "marchand aux dents en or"];
    var lieux = ["la fontaine", "le marché", "la bibliothèque", "le pont", "la ferme", "le sentier rocailleux", "la taverne"];
    var objets = ["des sorts de seconde main", "des rouages", "du maïs", "des babioles étranges", "des planches",
        "des romans de gare", "de l'hydromel"];
    var gabarits = [
        function(){ return "La moisson est " + h.choix(moissons) + ". Le conseil du village vote " + h.choix(decisions) + "."; },
        function(){ return "Un " + h.choix(creatures) + " est aperçu près de " + h.choix(lieux) + ". Personne ne s'en émeut."; },
        function(){ return "Grande foire sur la place. On y vend " + h.choix(objets) + " pour trois pièces d'or."; },
        function(){ return "Hiver rude. On brûle " + h.choix(objets) + " pour se chauffer."; },
        function(){ return "Querelle entre " + h.choix(lieux) + " et " + h.choix(lieux) + " au sujet d'un " + h.choix(creatures) + "."; },
        function(){ return "Rien à signaler, note le chroniqueur, qui s'en excuse."; }
    ];
    var cles = {
        9: "...les vieilles légendes parlent d'un SorcierNoir qui fragmentera le pays...",
        23: "...seul le faiseur de mondes pourra empêcher le virus du SorcierNoir de...",
        38: "...que le pouvoir de « sudo » pourrait bien être la seule faiblesse du SorcierNoir...",
        52: "...car le SorcierNoir, dit-on, a scellé son vrai nom dans un phylactère que nul ne voit...",
        61: "...et quiconque prononcera à voix haute le vrai nom du SorcierNoir brisera son pouvoir..."
    };
    var lignes = [
        "HISTOIRE DE TERMINUS",
        "des origines à nos jours, par les chroniqueurs du village",
        ""
    ];
    var an = 3;
    for (var n = 0; n < 66; n++){
        if (cles[n]) lignes.push(cles[n]);
        else {
            an += 1 + h.entier(17);
            lignes.push("An " + an + ". " + h.choix(gabarits)());
        }
    }
    lignes.push("");
    lignes.push("(La suite au prochain volume.)");
    return new Item("HistoireDeTerminus", lignes.join("\n"), "item_historybook.gif");
})();
Library.addItem(HistoryOfTerminus);
Library.addItem(new Item("NostalgieDuFoyer",
    "Si le mal du pays te prend, tape « cd ~ » et tu rentreras à la Maison. \
Souviens-toi seulement que revenir ici te demandera plus d'efforts... à moins de connaître « cd - », \
qui te renvoie d'un bond là où tu étais juste avant.",
    "item_historybook.gif"));
var Lever = new Item("LevierDiscret",
   "Tu repères un levier discret derrière les étagères. Par curiosité, tu le tires : \
un panneau coulisse et dévoile une arrière-salle secrète.",
   "item_lever.gif");
Library.addItem(Lever);
var Annales = new Item(".AnnalesDExamen",
    "ANNALES (ne pas laisser traîner)\n\
\n\
Sujet de l'an dernier : « Vaincre le Sorcier Noir. Durée : libre. Documents autorisés : man. »\n\
Moyenne de la promotion : 9,5 sur 20.\n\
Appréciation générale : « Trop de candidats s'acharnent sur le bouclier sans se demander ce qui le relance. \
Trop peu pensent à regarder ce qui est caché. »\n\
\n\
Tu relis deux fois. Que fait un sujet d'examen dans une bibliothèque de village ?",
    "item_manuscript.gif");
Library.addItem(Annales);

//BACK ROOM
var BackRoom = new Room("ArriereSalle",
    "Tu découvres une mystérieuse arrière-salle. Une bibliothécaire s'y trouve, \
seule avec un petit elfe. Tu espères ne pas déranger.",
    "loc_backroom.gif");
BackRoom.addItem(new Item("Grep",
    "L'elfe, d'une laideur exceptionnelle, se tourne vers toi d'un air revêche. \
« Greeeeeep », dit-il d'un ton maussade.",
    "grep.gif").personnage());
BackRoom.addItem(new Item("LivreExercice",
    "Six sorciers sachant sourire\nSèchent leurs chaussettes au soleil.\n\
Un chasseur sachant chasser\nSait chasser sans son chien.\nSix cents saucissons suffisent\nSi six sorciers s'y mettent."));
var Librarian = new Item("Bibliothecaire",
    "« Hm ? Oh, bonjour. Pardonne le désordre, je suis en pleines recherches sur le Sorcier Noir. \
Tu me rendrais un service ? Va relever toutes les mentions de SorcierNoir dans l'HistoireDeTerminus, \
dans la grande salle. Ce livre est interminable, personne ne l'a jamais lu en entier. \
Mon assistant Grep peut t'aider. »\n\
Grep te lance un regard mauvais. « Greeepp. »\n\
« Pour fouiller un livre, tape “grep MOT LIVRE” : seules les lignes contenant ce mot s'afficheront. \
Essaie d'abord avec le LivreExercice que voici : trouve la ligne où il est question d'un chien.\n\
Quelques raffinements : grep -i ignore les majuscules, grep -n numérote les lignes, \
et grep -r MOT LIEU fouille un lieu entier, avec tout ce qu'il contient. »",
    "item_librarian.gif").personnage().enseigne("grep").revele("s_enquete");
BackRoom.addItem(Librarian);

//ROCKY PATH
var RockyPath = new Room("SentierRocailleux",
    "Le sentier envahi de mauvaises herbes s'éloigne vers les champs.",
    "loc_rockypath.gif");
var LargeBoulder = new Item("GrosRocher", "Un rocher énorme te barre la route. Il est bien trop gros pour être déplacé.", "item_boulder.gif");
LargeBoulder.addCmdText("rm", "Le rocher disparaît avec un petit « pop ».");
LargeBoulder.addValidCmd("rm");
RockyPath.addItem(LargeBoulder);

//ARTISAN'S SHOP
var ArtisanShop = new Room("Atelier",
    "Les murs de l'atelier sont couverts d'horloges, \
toutes légèrement décalées. À l'établi, une femme affublée d'énormes lunettes de protection \
manie un chalumeau avec un enthousiasme inquiétant.",
    "loc_artisanshop.gif");
var StrangeTrinket = new Item("BabioleEtrange", "On dirait une sorte de cristal. C'est très beau.", "item_trinket.gif");
StrangeTrinket.addCmdText("rm",
    "Ta mère ne t'a donc jamais appris qu'il est impoli d'effacer les affaires des autres \
de leur plan d'existence ?");
StrangeTrinket.addCmdText("mv",
    "Tu ne peux pas prendre ça, ce n'est pas à toi !");
ArtisanShop.addItem(StrangeTrinket);
var ClockworkDragon = new Item("DragonMecanique",
    "Un dragon de la taille d'un petit chien gambade dans la pièce. \
On jurerait qu'il est vivant, s'il n'y avait cette clé de remontage plantée dans son dos.",
    "item_clockdragon.gif");
ClockworkDragon.addCmdText("rm",
    "Ta mère ne t'a donc jamais appris qu'il est impoli d'effacer les affaires des autres \
de leur plan d'existence ?");
ClockworkDragon.addCmdText("mv",
    "Tu ne peux pas prendre ça, ce n'est pas à toi !");
ArtisanShop.addItem(ClockworkDragon);
var Artisan = new Item("Artisane",
    "L'Artisane relève ses lunettes et te dévisage, surprise. \
« C'est toi, le nouvel assistant ? Tu es en retard !\n\
...\n\
Comment ça, tu n'es pas mon assistant ? \
Ça ne t'empêche pas de te rendre utile. Il me faut des rouages, vite !\n\
...\n\
Tu ne sais même pas fabriquer des choses ? Pff. Quel assistant. Dis simplement \
“touch OBJET”, d'accord ? OBJET, c'est le nom de ce que tu veux créer. \
Allez, fabrique-moi un Rouage ! Avec la majuscule, je suis pointilleuse. Puis reviens me voir. »",
    "item_artisan.gif").personnage().enseigne("touch").revele("s_rouages");
ArtisanShop.addItem(Artisan);
ArtisanShop.addItem(new Item("Horloges",
    "Des dizaines d'horloges, et pas deux qui soient d'accord. Sous la plus grosse, une petite plaque de cuivre :\n\
« La seule qui ait raison est celle de la machine. Demande-lui : date\n\
Et pour n'avoir que l'heure : date +%H:%M »",
    "loc_artisanshop.gif").enseigne("date"));
var RemonterScript = new Item("remonter.sh",
    "#!/bin/bash\n\
# remonter.sh : remonte le DragonMecanique, cran par cran\n\
echo Clic...\n\
echo Clac...\n\
echo Clic...\n\
echo Le DragonMecanique ronronne et crache une petite étincelle.",
    "item_gear.gif").droits("rw-r--r--", JOUEUR);
RemonterScript.protege = true;

/* La quête piège de l'écrasement : cp remplace sans prévenir un objet qui existe déjà. */
var TEXTE_PLAN_DRAGON = "PLAN DU DRAGON MÉCANIQUE, original, exemplaire unique\n\n" +
"       __/^^^\\__\n" +
"   ___/  o   o  \\___      ressort principal : 48 spires\n" +
"  <___   \\___/   ___>     rouages : 5 (copies conformes)\n" +
"      \\_________/         clé de remontage : dans le dos\n\n" +
"Trois ans de travail. Ne pas perdre.";
var PlanDuDragon = new Item("PlanDuDragon", TEXTE_PLAN_DRAGON, "item_manuscript.gif").droits("rw-rw-rw-", "terminus");
var SauvegardePlan = new Item(".PlanDuDragon.bak", TEXTE_PLAN_DRAGON, "item_manuscript.gif").droits("rw-r--r--", "terminus");
var BrouillonDePlan = new Item("BrouillonDePlan", "Brouillon. Un dragon gribouillé, avec trois pattes et une flèche « à refaire ».", "item_manuscript.gif");
var Apprentie = new Item("ApprentieHorlogere",
    "Une apprentie en tablier de cuir lève le nez de son établi. « Tu sais copier des objets ? Moi pas encore. \
La maîtresse m'a demandé de ranger mon brouillon sous le nom PlanDuDragon : cp BrouillonDePlan PlanDuDragon. \
Tu veux bien le faire pour moi ? Elle a ajouté un truc du genre « attention », mais je n'écoutais plus. »",
    "item_student.gif").personnage().revele("s_ecrasement");
[PlanDuDragon, SauvegardePlan, BrouillonDePlan, Apprentie].forEach(function(o){ ArtisanShop.addItem(o); });

//FARM
var Farm = new Room("Ferme",
    "Il y avait une ferme ici, autrefois. Aujourd'hui les champs sont brûlés et brunis.",
    "loc_farm.gif");
var EarOfCorn = new Item("EpiDeMais",
    "Le maïs est triste et tout flétri.",
    "item_corn.gif");
EarOfCorn.addCmdText("rm",
    "Pourquoi détruirais-tu la seule nourriture d'un homme affamé ?");
Farm.addItem(EarOfCorn);
var Farmer = new Item("Fermier",
    "« Ruiné ! Je suis ruiné ! Regarde ces récoltes... il ne reste presque rien ! \
Les sbires du sorcier sont passés la semaine dernière... ils ont tout détruit. Comment \
vais-je nourrir mes trois enfants avec un seul épi de maïs ? Ah, si seulement j'avais un AutreEpiDeMais ! \
Il paraît que l'Artisane du village sait dupliquer les choses... »",
    "item_farmer.gif").personnage().revele("s_mais");
Farm.addItem(Farmer);

//CLEARING
var Clearing = new Room("Clairiere",
    "Une petite clairière herbeuse. Un homme est assis sur une pierre, en larmes. \
Derrière lui, un tas de gravats.",
    "loc_clearing.gif");
var CryingMan = new Item("HommeEnPleurs",
    "« Toi ! Tu pratiques la magie ! Ça se voit, tu as cet air-là. \
Tu viens finir le travail, c'est ça ? Eh bien vas-y, fais donc : il ne me reste plus rien \
à prendre. Plus depuis le passage de tes semblables, il y a quelques jours. »\n\n\
« Ce qui s'est passé ? Tu OSES demander... tu le sais parfaitement. \
Tes amis, les sbires du sorcier, ont détruit ma maison et enlevé ma pauvre \
fille, voilà ce qui s'est passé ! Ma femme est même partie chercher de l'aide au village, et je n'ai \
plus de nouvelles depuis ! »\n\n\
« Hm ? Bon, c'est vrai que tu n'as pas l'air d'un sbire du sorcier. N'empêche, \
je ne fais pas confiance aux mages. Si tu es vraiment qui tu prétends être, prouve tes \
bonnes intentions en me bâtissant une nouvelle Chaumiere ! »",
    "item_man.gif").personnage().revele("s_chaumiere");
Clearing.addItem(CryingMan);
Clearing.removeCommand("cd");
Clearing.addCmdText("cd", "Tu ne peux pas traverser le pont tant que la Planche manquante n'a pas été remplacée.");

//BROKEN BRIDGE
var BrokenBridge = new Room("PontBrise",
    "Un pont de bois grinçant enjambe un gouffre. Mais il lui manque une \
Planche, et le trou est trop large pour sauter.",
    "loc_bridge.gif");

//OMINOUS-LOOKING PATH
var OminousLookingPath = new Room("SentierSinistre",
    "Le sentier mène à une caverne obscure. C'est un chemin pavé tout à fait ordinaire, et pourtant, \
sans que tu saches pourquoi, il t'emplit d'effroi.",
    "loc_path.gif");
var ThornyBrambles = new Item("Ronces",
    "Ce fourré de ronces est hérissé d'épines d'allure redoutable. Impossible \
de le contourner, et hors de question de passer au travers. Pourtant quelque chose \
te dit que tu en as très envie.",
    "item_brambles.gif");
ThornyBrambles.addCmdText("mv",
    "Tu ne peux pas y toucher : elles sont couvertes d'épines. Aïe !");
ThornyBrambles.addCmdText("rm",
    "Tu prononces les mots du sort de suppression et les ronces se mettent à luire \
d'un bleu profond. Après avoir grésillé une minute, elles disparaissent dans un nuage de fumée.");
ThornyBrambles.addValidCmd("rm");
OminousLookingPath.addItem(ThornyBrambles);

//SLIDE
var Slide = new Room("Toboggan", "Le toboggan est long. Tout en bas, tu aperçois les FichiersDuNoyau.");
Slide.removeCommand("cd");
Slide.addCmdText("cd", "Il faut d'abord passer le TrollMoche.");

//KERNEL FILES
var KernelFiles = new Room("FichiersDuNoyau", "Les FichiersDuNoyau renferment le secret de sudo. \
Tu ferais bien de lire les Instructions.");
var Certificate = new Item("Certificat",
    "CERTIFICAT D'ADMINISTRATION\n\n\
Par la présente, le porteur de ce certificat est reconnu digne des pleins pouvoirs \
sur le monde de Terminus. Qu'il s'en serve avec discernement : root peut tout, \
y compris se tromper.\n\n\
Au dos, d'une écriture pressée :\n\
« Si tu lis ceci, je sais que tu arrives. La Citadelle t'est ouverte. Je t'attends. S.N. »",
    "item_manuscript.gif").droits("r--------", "root");
KernelFiles.addItem(Certificate);
var Instructions = new Item("Instructions",
    "Ta mission : l'une des chroniques des ArchivesDuNoyau contient le mot de passe sudo, sur une ligne « motdepasse= ». \
Trouve-la avec grep (grep MOT * ou grep -r : inutile de les ouvrir une par une).\n\n\
Puis écris sudo devant un sort : sudo less OBJET. Tape le mot de passe, et le sort part avec les pouvoirs de root, l'administrateur.\n\n\
Le Certificat (ls -l) n'est lisible que par root. Lis-le avec sudo, et le chemin s'ouvrira.",
    "item_manuscript.gif").enseigne("sudo");
KernelFiles.addItem(Instructions);

var MoreKernelFiles = new Room("ArchivesDuNoyau", "Il y a tellement de chroniques ici !");
/* La chronique qui contient le mot de passe change d'une partie à l'autre. */
var FICHIER_SECRET = aleaChoix("chronique", ["L", "M", "Q", "R", "S", "T", "U", "V", "W"]);
(function(){
    var h = new Hasard(graineDe("chroniques"));
    var utilisateurs = ["troll", "elfe", "artisane", "fermier", "marchand", "poney", "barde", "bibliothecaire", "rat", "invite"];
    var gabarits = [
        function(){ return "sshd[" + (2000 + h.entier(900)) + "]: Échec du mot de passe pour " + h.choix(utilisateurs) + " depuis 10.0." + h.entier(9) + "." + (2 + h.entier(250)); },
        function(){ return "sshd[" + (2000 + h.entier(900)) + "]: Connexion acceptée pour " + h.choix(utilisateurs) + " depuis 10.0." + h.entier(9) + "." + (2 + h.entier(250)); },
        function(){ return "sshd[" + (2000 + h.entier(900)) + "]: Session fermée pour " + h.choix(utilisateurs); },
        function(){ return "cron[" + (300 + h.entier(60)) + "]: (root) CMD (" + h.choix(["arroser les ronces du SentierSinistre", "nourrir les trolls", "sauvegarder la Bibliotheque", "remonter le DragonMecanique", "compter les mannequins", "balayer le Toboggan"]) + ")"; },
        function(){ return "noyau: portail0 : " + h.choix(["lien établi", "lien perdu", "paquets abandonnés : " + h.entier(40), "débit nominal"]); },
        function(){ return "noyau: " + h.choix(["mémoire faible sur la PlaceDuVillage", "température du dragon : normale", "disque /dev/grimoire rempli à " + (40 + h.entier(55)) + " %", "horloge resynchronisée sur l'Atelier"]); },
        function(){ return "sudo: " + h.choix(utilisateurs) + " : commande refusée ; UTILISATEUR=root ; COMMANDE=/bin/rm " + h.choix(["Poney", "Marchand", "LivreDOr", "GrosRocher", "Ronces"]); },
        function(){ return "grep[" + (700 + h.entier(50)) + "]: Greeeep."; },
        function(){ return "taverne[" + (500 + h.entier(50)) + "]: " + h.choix(["une chope servie", "fût percé", "le barde chante faux", "bagarre évitée de justesse"]); }
    ];
    var suffixes = ["L", "M", "Q", "R", "S", "T", "U", "V", "W"];
    for (var f = 0; f < suffixes.length; f++){
        var lignes = [];
        var jour = 1 + f * 3, heure = 0, minute = 0;
        var combien = 150 + h.entier(60);
        var ligneSecrete = suffixes[f] === FICHIER_SECRET ? 40 + h.entier(80) : -1;
        for (var n = 0; n < combien; n++){
            minute += 1 + h.entier(17);
            if (minute > 59){ minute -= 60; heure++; }
            if (heure > 23){ heure = 0; jour++; }
            var horodatage = "jour " + deuxChiffres(jour) + " " + deuxChiffres(heure) + ":" + deuxChiffres(minute) + ":" + deuxChiffres(h.entier(60)) + " terminus ";
            if (n === ligneSecrete){
                lignes.push(horodatage + "sorcier[666]: aide-mémoire : motdepasse=" + MOT_DE_PASSE_SUDO + " (penser à le changer un de ces jours)");
            } else {
                lignes.push(horodatage + h.choix(gabarits)());
            }
        }
        MoreKernelFiles.addItem(new Item("chronique_" + suffixes[f] + ".log", lignes.join("\n")));
    }
})();

//PARADISE (end game screen)
var Paradise = new Room("Paradis", "Tu as véritablement trouvé le Paradis. \
Félicitations.", "loc_theend.gif");
Paradise.addCmdText("ls", "Il n'y a vraiment rien d'intéressant au Paradis. C'est tout l'intérêt.");

//CAVE
var CaveOfDisgruntledTrolls = new Room("CaverneDesTrolls",
    "La caverne est sombre et sent... les pieds ? Ah oui, ce sont sûrement les trolls. \
Près du mur du fond, un enfant terrorisé est enfermé dans une cage.",
    "loc_cave.gif");
var UglyTroll = new Item("TrollMoche",
    "Il a l'air furieux, et il est vraiment moche. Il se tient pile devant le Toboggan.",
    "item_troll1.gif").personnage();
UglyTroll.addCmdText("rm",
    "Le troll a l'air brièvement surpris, puis disparaît avec un bruit de succion fort déplaisant.");
UglyTroll.addValidCmd("rm");
UglyTroll.addValidCmd("mv");
UglyTroll.addCmdText("mv", "Le troll a l'air brièvement surpris, puis s'éloigne. Il est \
plutôt inoffensif, au fond.");
UglyTroll.addValidCmd("cp");
UglyTroll.addCmdText("cp", "Ils se multiplient !");
CaveOfDisgruntledTrolls.addItem(UglyTroll);
var UglierTroll = new Item("TrollPlusMoche", "Il a l'air furieux, et il est vraiment, vraiment moche. \
Mais il veut te dire quelque chose. Entre deux grognements \
confus, tu parviens à comprendre ceci :\n\
On peut lancer des sorts sur des choses qui ne sont pas dans le lieu où l'on se trouve, \
à condition d'indiquer leur chemin. Pour copier un objet d'ici vers le SentierSinistre d'où tu viens : \
cp OBJET ../COPIE. Pour sortir quelque chose d'une cage sans y entrer : mv Cage/CHOSE . \
(le point, tout seul, veut dire « ici »). Cela marche avec presque tous les sorts et presque tous les lieux. \
Sers-t'en avec sagesse. Et souviens-toi... un sort « rm » ne s'annule pas.",
    "item_troll2.gif").personnage();
UglierTroll.addValidCmd("rm");
UglierTroll.addCmdText("rm",
    "Le troll a l'air brièvement surpris, puis disparaît avec un bruit de succion fort déplaisant.");
CaveOfDisgruntledTrolls.addItem(UglierTroll);
var HideousTroll = new Item("TrollAbsolumentHideux",
    "Mieux vaut ne pas regarder celui-là. Oups, trop tard.",
    "item_supertroll.gif").personnage();
HideousTroll.addCmdText("rm",
    "Le troll lâche un rot spectaculaire, et tu jurerais qu'il ricane. \
Tu ne te débarrasseras pas de lui si facilement, pas sans le mot de passe sudo. \
Tu le trouveras dans les FichiersDuNoyau. Mais pour ça, il faut d'abord \
passer le TrollMoche et atteindre le Toboggan.");
HideousTroll.addCmdText("mv",
    "Si tu le sors de la caverne, il terrorisera \
toute la campagne. Et puis il te mangera probablement.");
HideousTroll.addValidCmd("sudo-rm");
HideousTroll.addCmdText("sudo-rm",
    "Le troll ouvre la bouche pour roter, et s'aperçoit qu'il n'existe plus. \
Voilà ce que c'est, les pouvoirs de root : la caverne sent déjà meilleur.");
CaveOfDisgruntledTrolls.addItem(HideousTroll);

//CAGE
var Cage = new Room("Cage",
    "Il y a là-dedans un enfant terrorisé.",
    "item_cage.gif");
var KidnappedChild = new Item("EnfantKidnappe",
    "Tu sais que ce n'est pas gentil, mais tu ne peux pas t'empêcher de penser que \
cet enfant a une drôle de tête.",
    "item_cagedboy.gif").personnage();
Cage.removeCommand("cd");
Cage.atteignable = true;
Cage.addCmdText("cd", "Tu ne peux pas te glisser entre les barreaux. Et puis franchement, \
quelle idée de vouloir entrer dans une cage ?");
KidnappedChild.addValidCmd("mv");
KidnappedChild.addCmdText("mv",
    "L'enfant regarde autour de lui, hébété, tout surpris de se retrouver hors de la cage. \
Tu lui souris et tu prends ta voix la plus douce : « Tu devrais rentrer chez toi, \
mon garçon. Quelqu'un t'y attend. »\n\
« Je suis une fille », réplique sèchement la petite. Puis elle te file sous le nez, sort de la caverne et \
remonte en courant le sentier sinistre, vers chez elle.");
Cage.addItem(KidnappedChild);


//---------------NOUVEAUX LIEUX---------------------
//TAVERNE (nouveau : echo, > et >>, sort, uniq, le tuyau |)
var Taverne = new Room("Taverne",
    "La Taverne du Pingouin Manchot est bruyante et enfumée. Un barde accorde son luth \
près de la cheminée. Derrière le comptoir, le tavernier essuie des chopes en surveillant un gros registre.",
    "loc_taverne.gif");
Taverne.addItem(new Item("Barde",
    "« Approche ! Tu connais echo ? C'est le sort des bardes : il fait résonner tes mots.\n\
\n\
  echo Bonjour Terminus        répète tes mots à voix haute\n\
  echo Bonjour > Message       les écrit dans un objet, qu'il crée... ou qu'il ÉCRASE s'il existe déjà\n\
  echo Encore >> Message       les ajoute à la fin, sans rien effacer\n\
\n\
Un chevron, j'écrase. Deux chevrons, j'ajoute. Répète-le trois fois avant de dormir.\n\
\n\
echo sait aussi lire les variables, ces boîtes à étiquette dont parle le Marchand : \
echo $USER fait résonner ton nom, echo $PWD l'endroit où tu te tiens.\n\
\n\
Tiens, signe donc le LivreDOr de la taverne : ajoute ton nom à la fin. À la FIN, hein. \
Le tavernier tient beaucoup aux signatures des autres. »",
    "item_barde.gif").personnage().enseigne("echo").revele("s_livredor", "s_variables"));
var TEXTE_LIVRE_DOR =
    "LIVRE D'OR de la Taverne du Pingouin Manchot\n\
« Le meilleur hydromel de Terminus. » Elwyn\n\
« J'ai perdu une chaussette ici. Ou chez moi. » Un voyageur\n\
« Greeeep. » Grep\n\
« Le poney de la prairie mord. » Thibault\n\
« Très bon accueil, j'y ai corrigé quarante copies d'une traite. » L.";
var LivreDOr = new Item("LivreDOr", TEXTE_LIVRE_DOR, "item_romancenovel.gif").droits("rw-rw-rw-");
Taverne.addItem(LivreDOr);
/* Le meilleur client change d'une partie à l'autre : les comptes sont redistribués entre les habitués. */
var HABITUES = ["Bertille", "Grognar", "Elwyn", "Thibault", "Mirabelle", "Oswin", "Hildegarde"];
(function(){
    for (var i = HABITUES.length - 1; i > 0; i--){
        var j = Math.floor(alea("habitues:" + i) * (i + 1));
        var tmp = HABITUES[i]; HABITUES[i] = HABITUES[j]; HABITUES[j] = tmp;
    }
})();
var MEILLEUR_CLIENT = HABITUES[0];
var Registre = (function(){
    var h = new Hasard(graineDe("registre"));
    var comptes = { "Grep": 1 };
    var nombres = [14, 11, 9, 7, 6, 4, 3];
    for (var c = 0; c < HABITUES.length; c++) comptes[HABITUES[c]] = nombres[c];
    var boissons = [["hydromel", 3], ["cervoise", 2], ["tisane", 1], ["vin_chaud", 4]];
    var lignes = [];
    for (var nom in comptes){
        for (var k = 0; k < comptes[nom]; k++){
            var boisson = h.choix(boissons);
            lignes.push(nom + ":" + boisson[0] + ":" + boisson[1]);
        }
    }
    for (var i = lignes.length - 1; i > 0; i--){
        var j = h.entier(i + 1);
        var tmp = lignes[i]; lignes[i] = lignes[j]; lignes[j] = tmp;
    }
    return new Item("Registre", lignes.join("\n"), "item_historybook.gif");
})();
Taverne.addItem(Registre);
var Tavernier = new Item("Tavernier",
    "« Qu'est-ce que ce sera ? ... Ah, tu veux te rendre utile. Regarde mon Registre : une ligne par chope \
servie, avec le nom du client, la boisson et le prix, séparés par des deux-points. \
Je veux savoir qui est mon meilleur client, et je n'ai pas que ça à faire de compter.\n\
\n\
Le secret, c'est le tuyau : la barre verticale | envoie ce qu'affiche un sort directement dans le sort suivant. \
On construit la réponse un morceau après l'autre :\n\
\n\
  cut -d: -f1 Registre                             ne garde que la première colonne, les noms\n\
  cut -d: -f1 Registre | sort                      les trie\n\
  cut -d: -f1 Registre | sort | uniq -c            compte chaque nom (uniq fusionne les lignes identiques qui se suivent)\n\
  cut -d: -f1 Registre | sort | uniq -c | sort -n  range les comptes du plus petit au plus grand\n\
  cat Registre | wc -l                             compte toutes les chopes servies\n\
\n\
Quand tu sauras qui c'est, crie-moi son nom : echo NOM. Si tu ne sais pas crier, demande au barde. »",
    "item_tavernier.gif").personnage().enseigne("sort", "uniq", "cut").revele("s_client");
Taverne.addItem(Tavernier);

//CYBERSUP (remplace le MIT du jeu d'origine : ps, kill, whoami, find)
var Cybersup = new Room("Cybersup",
    "Tu arrives en tapis volant à Cybersup, l'école de cybersécurité, au 8 Terrasse Bellini ! Les tours de verre \
de La Défense s'élèvent tout autour. Ici, on n'apprend pas la magie : on apprend comment elle fonctionne vraiment, \
et comment défendre les machines qui font tourner le monde. Aujourd'hui, pourtant, une drôle de rumeur court les couloirs : \
il se passe quelque chose dans la WarRoom.",
    "loc_stata.gif");
Cybersup.addItem(new Item("Accueil",
    "« Bienvenue à Cybersup ! Moi, c'est Hedy, je tiens l'accueil. Tu es de la nouvelle promo de B1 ? Parfait. \
Ta CarteEtudiante est prête, elle est là, sur le comptoir.\n\
\n\
Il faudra aussi signer la FeuilleEmargement : on ajoute son nom à la fin, sans effacer celui des autres. \
Tu ne sais pas encore écrire dans un objet ? Ce n'est pas grave. Un barde de ma connaissance l'enseigne très bien, \
dans une taverne du pays de Terminus. Reviens signer quand tu sauras.\n\
\n\
Pour t'y retrouver, lis le PlanDuCampus. Ton premier cours est en SalleDeCours. \
Et si tu cherches Laurent, le directeur pédagogique... prends un ticket. Tout le monde le cherche depuis ce matin, \
surtout ceux de la WarRoom. »",
    "item_lady.gif").personnage().revele("s_emargement"));
var CarteEtudiante = new Item("CarteEtudiante", "", "item_locker.gif");
Cybersup.addItem(CarteEtudiante);
var TEXTE_EMARGEMENT =
    "FEUILLE D'ÉMARGEMENT · promo B1 · jour de rentrée\n\
Blaise\nCharles\nGeorge\nJohn\nKatherine\nKurt\nSophie";
var FeuilleEmargement = new Item("FeuilleEmargement", TEXTE_EMARGEMENT, "item_manuscript.gif").droits("rw-rw-rw-");
Cybersup.addItem(FeuilleEmargement);
Cybersup.addItem(new Item("PlanDuCampus",
    "PLAN DU CAMPUS DE PUTEAUX\n\
\n\
  SalleDeCours      processus, paquets, chasse au drapeau\n\
  SalleServeurs     disques, sauvegardes, tâches planifiées\n\
  SalleReseau       machines, ping, ssh\n\
  WarRoom           le centre d'opérations : surveillance et gestion de crise\n\
  BDE               le bureau des étudiants et sa boutique\n\
  BureauDeLaurent   direction pédagogique (porte fermée)\n\
\n\
Les deux autres campus de l'école, Lille et Marseille, ne sont pas la porte à côté : \
on les rejoint par le réseau. Demande en SalleReseau.",
    "item_sign.gif"));
var TEXTE_TABLEAU =
    "TABLEAU D'AFFICHAGE\n\
\n\
JEUDI, 18 h : afterwork. Une ancienne élève, aujourd'hui analyste dans un centre d'opérations de sécurité, \
raconte sa première nuit d'astreinte. Pizzas offertes par le BDE.\n\
\n\
JOBDATING : douze entreprises cherchent des alternants. Venez avec un CV, repartez avec un contrat (ou au moins un stylo).\n\
\n\
CTF DE L'ÉCOLE : chasse au drapeau par équipes de trois. Inscriptions au BDE. Échauffement en SalleDeCours.\n\
\n\
RAPPEL : la feuille de présence se signe chaque matin. « J'étais là, mais en esprit » n'est pas une signature.\n\
\n\
EXERCICE DE CRISE : la WarRoom est réservée aux M2 toute la journée. Si les voyants sont rouges, ne paniquez pas. \
Si les M2 paniquent, paniquez.";
var TableauAffichage = new Item("TableauAffichage", TEXTE_TABLEAU, "item_sign.gif");
Cybersup.addItem(TableauAffichage);
Cybersup.addItem(new Item("Pancarte",
    "Sur la porte du BureauDeLaurent, une pancarte :\n\n\
  LAURENT, Directeur Pédagogique\n\
  « Absent : parti faire passer un examen.\n\
    De retour quand quelqu'un l'aura réussi. »\n\n\
La porte est fermée à clé. Un ls -l te dirait qui a le droit d'entrer.",
    "item_sign.gif"));
Cybersup.addItem(new Item("RSSI",
    "« Halte ! Auguste, responsable de la sécurité des systèmes d'information. RSSI, pour les intimes. \
Personne ne va plus loin sans trois vérifications.\n\
\n\
Un : qui es-tu ? Le sort id te le dira : ton numéro d'utilisateur, ton groupe, et tous les groupes auxquels tu appartiens. \
Le numéro 0, c'est root.\n\
\n\
Deux : ton mot de passe. Change-le avec passwd, et choisis-le sérieusement : douze caractères au moins, \
des majuscules, des minuscules, des chiffres. Une phrase entière fait très bien l'affaire. \
Et n'utilise jamais ici un mot de passe qui te sert ailleurs : un mot de passe, c'est comme une brosse à dents, ça ne se partage pas.\n\
\n\
Trois : à qui appartient quoi ? ls -l te le montre, deuxième colonne. Seul root peut donner une chose à quelqu'un d'autre : \
sudo chown NOM CHOSE. Tu n'as pas encore sudo ? Alors ce n'est pas encore ton problème. »",
    "item_professor.gif").personnage().enseigne("id", "passwd", "chown").revele("s_passwd"));

var SalleDeCours = new Room("SalleDeCours",
    "Une salle de cours moderne : des rangées d'écrans, un tableau couvert de numéros, \
et un formateur qui t'attendait manifestement.",
    "loc_classroom.gif");
SalleDeCours.addItem(new Item("Formateur",
    "Le formateur, Dennis d'après son badge, trace au tableau une colonne de numéros. « Tout sort qu'on lance devient un processus : \
un programme en train de tourner. Chacun porte un numéro unique, son PID, et appartient à celui qui l'a lancé.\n\
\n\
  ps             liste les processus en cours\n\
  top            les mêmes, classés du plus gourmand au plus sage\n\
  kill PID       demande poliment au processus de s'arrêter (signal TERM)\n\
  kill -9 PID    l'arrête sans lui demander son avis (signal KILL), à réserver aux têtus\n\
  whoami         te rappelle sous quel nom le système te connaît\n\
\n\
Règle d'or : tu ne peux arrêter que TES processus. Ceux des autres, seul root, l'administrateur, \
peut y toucher.\n\
\n\
Travaux pratiques : un élève a lancé ici un sortilege_infini qui tourne en boucle, et un golem_tetu \
qui n'écoute rien. Je les ai mis à ton nom, cadeau. Débarrasse-m'en. »",
    "item_TA.gif").personnage().enseigne("ps", "top", "kill", "whoami").revele("s_processus"));
SalleDeCours.addItem(new Item("Affiche",
    "AFFICHE DU CLUB LINUX\n\
\n\
Sous Linux, un programme s'installe en une ligne, depuis un dépôt de paquets :\n\
\n\
  apt list                   ce qui est disponible\n\
  sudo apt update            rafraîchir la liste des paquets\n\
  sudo apt install cowsay    installer le paquet cowsay\n\
\n\
Installer modifie le système : il faut donc les pouvoirs de root (sudo).\n\
Premier défi du club : installe cowsay, puis fais dire quelque chose à la vache.",
    "item_sign.gif").enseigne("apt").revele("s_apt"));
var PIDS_COURS = tirerPids("cours", 2, 2000, 8999);
SalleDeCours.addProc(PIDS_COURS[0], "sortilege_infini", JOUEUR, {
    cpu: 97.3,
    killText: "Le sortilege_infini s'arrête net. Le ventilateur de la salle pousse un soupir de soulagement."
});
SalleDeCours.addProc(PIDS_COURS[1], "golem_tetu", JOUEUR, {
    cpu: 61.8,
    sig9: true,
    ignoreText: "Le golem_tetu reçoit ton signal TERM, le regarde, et continue comme si de rien n'était. Il faudra être moins poli : kill -9.",
    killText: "Le golem_tetu n'a pas le temps de protester : le signal KILL ne se discute pas."
});
SalleDeCours.addItem(new Item("EtudianteCurieuse",
    "« Tu cherches quelque chose ? Moi aussi, tout le temps. Margaret, B3. Avec le BDE on organise le CTF de l'école, une chasse au drapeau : \
quelqu'un cache un fichier, les autres le traquent.\n\
\n\
  find LIEU -name NOM       fouille un lieu et tout ce qu'il contient, cachettes comprises\n\
  find . -name \"flag*\"      cherche à partir d'ici tout ce dont le nom commence par flag\n\
  find . -type d            ne montre que les lieux (f pour les objets)\n\
\n\
Les guillemets autour de \"flag*\" comptent : sans eux, c'est le terminal qui interprète l'étoile \
avant que find ne la voie.\n\
\n\
Un drapeau est caché quelque part dans la SalleServeurs. Trouve-le et lis-le : il y a une récompense. »",
    "item_grad.gif").personnage().enseigne("find").revele("s_ctf"));

var SalleServeurs = new Room("SalleServeurs",
    "Il fait froid et ça ronronne. Trois baies de serveurs clignotent dans la pénombre.",
    "loc_cluster.gif");
var Baie1 = new Room("Baie1", "Une baie de serveurs. Les voyants sont tous au vert.", "item_workstation.gif");
var Baie2 = new Room("Baie2", "Une baie de serveurs. Un des disques gratte un peu.", "item_workstation.gif");
var Baie3 = new Room("Baie3", "Une baie de serveurs. Quelqu'un y a laissé traîner ses affaires.", "item_workstation.gif");
Baie1.addItem(new Item("serveur-web.conf",
    "# configuration du serveur web de l'école\nport=443\nracine=/srv/www\njournal=/var/log/web.log\n# pas de drapeau ici, cherche encore"));
Baie1.addItem(new Item("LISEZMOI",
    "Baie 1 : serveurs web. Ne rien débrancher. Surtout pas le câble rouge."));
Baie2.addItem(new Item("inventaire.txt",
    "disque-01  ok\ndisque-02  ok\ndisque-03  gratte un peu\ndisque-04  ok"));
var Sauvegardes = new Room(".sauvegardes", "Un recoin caché de la baie, plein de vieilles sauvegardes.", "item_workstation.gif");
var Flag = new Item("flag.txt",
    "FLAG{qui_cherche_trouve_" + aleaEntier("drapeau", 4096, 65535).toString(16) + "}\n\n\
Bravo ! Tu viens de capturer ton premier drapeau.\n\
Récompense : le sort « tree », qui dessine d'un coup la carte de tout ce qui t'entoure.",
    "item_trinket.gif").enseigne("tree");
Sauvegardes.addItem(Flag);
var ArchiveLundi = new Item("sauvegarde-lundi.tar",
    "(Une archive tar : ses octets ne se lisent pas tels quels. tar -tf la liste, tar -xf l'extrait.)");
ArchiveLundi.archive = [
    { n: "rapport-incident.txt", x: "RAPPORT D'INCIDENT n° 42\n\n\
Symptôme : un processus tué avec kill réapparaissait dans la minute, sous un nouveau PID.\n\
Cause : une ligne dans la crontab de son propriétaire le relançait toutes les minutes.\n\
Remède : lire la crontab du propriétaire (sudo crontab -u NOM -l), la retirer (sudo crontab -u NOM -r), \
et seulement ensuite tuer le processus.\n\
Morale : quand quelque chose renaît tout seul, on ne s'acharne pas dessus. On cherche qui le relance." },
    { n: "planning.txt", x: "lundi     sauvegarde complète\nmardi     sauvegarde des changements\nmercredi  sauvegarde des changements\n\
jeudi     test de restauration (une sauvegarde jamais testée n'est pas une sauvegarde)\nvendredi  sauvegarde complète" },
    { n: "recette-hydromel.txt", x: "Du miel, de l'eau, de la patience. Beaucoup de patience.\n(Fichier rangé ici par erreur. Ou pas.)" }
];
Sauvegardes.addItem(ArchiveLundi);
SalleServeurs.addItem(new Item("Administratrice",
    "« Ah, de l'aide ! Evi, administratrice système. Ma tournée du matin :\n\
\n\
  df -h, du -sh LIEU, du * | sort -n     la place : un disque plein, et tout s'arrête\n\
  tar -tf / -xf / -cf ARCHIVE            lister, extraire, créer une sauvegarde\n\
  crontab -l                             les tâches planifiées (cron)\n\
  sudo crontab -u NOM -l   (ou -r)       celles d'un autre, ou les retirer\n\
\n\
Un exercice ? Dans une baie, une cachette de sauvegardes : extrais sauvegarde-lundi.tar et lis son rapport d'incident. »",
    "item_artisan.gif").personnage().enseigne("df", "du", "tar", "crontab").revele("s_archive"));

var SalleReseau = new Room("SalleReseau",
    "Des câbles de toutes les couleurs courent le long des murs jusqu'à une armoire qui clignote. \
Un administrateur réseau y est à moitié enfoui.",
    "item_workstation.gif");
SalleReseau.addItem(new Item("AdminReseau",
    "Une voix sort de l'armoire. « Vint, administrateur réseau. Ne débranche rien. Le réseau : des machines qui ont un nom et se parlent.\n\
\n\
  hostname        le nom de la machine où tu es (dans ton invite, après l'arobase)\n\
  ping MACHINE    est-elle là ?\n\
  ssh MACHINE     ouvrir un terminal sur elle ; exit pour revenir\n\
\n\
Tu débutes ? Lis le TableauBlanc. La liste des machines est dans hotes.txt. Essaie : ping lille, puis ssh lille. »",
    "item_citizen1.gif").personnage().enseigne("hostname", "ping", "ssh").revele("s_ssh"));
SalleReseau.addItem(new Item("hotes.txt",
    "# Les machines du réseau. Sous Linux, ce fichier s'appelle /etc/hosts.\n\
10.0.0.1     terminus     la Maison et tout le pays de Terminus\n\
10.0.92.1    cybersup     le campus de Puteaux\n\
10.0.59.1    lille        le campus de Lille\n\
10.0.13.1    marseille    le campus de Marseille\n\
" + completerDroite(ADRESSE_ATTAQUANT, 13) + "citadelle    accès restreint"));
/* Les notions de base du réseau, pour qui n'en a jamais entendu parler (reprises et approfondies au chapitre 2). */
var TableauBlanc = new Item("TableauBlanc",
    "LE RÉSEAU EN CINQ IDÉES (de l'écriture penchée de Vint)\n\
\n\
1. L'ADRESSE IP : l'adresse postale d'une machine. 10.0.92.1 pour Cybersup.\n\
2. LE NOM : plus facile à retenir. hotes.txt fait le lien (sur un vrai réseau : le DNS).\n\
3. LE RÉSEAU : même début d'adresse, même rue (10.0.92). Pour sortir, la PASSERELLE.\n\
4. PING : « tu es là ? », par le nom (ping lille) ou par l'adresse.\n\
5. LE PORT : le guichet d'un service. 22 pour ssh, 80 pour le web.\n\
\n\
Exercice : trouve l'adresse de Lille dans hotes.txt, et appelle Lille par son ADRESSE.",
    "item_sign.gif").revele("s_adresse");
SalleReseau.addItem(TableauBlanc);
Baie3.addItem(new Item(".bash_history",
    "ls\ncd Baie2\nls\nls -a\ncd .sauvegardes\ncat flag.txt\nwhoami\nsudo rm -rf /\n# oups",
    "none.gif"));
Baie3.addItem(new Item("PenseBete",
    "Note laissée par un élève :\n« Le fichier .bash_history garde la trace de tout ce qu'on tape dans un terminal. \
Il est caché, mais pas secret : ls -a le montre. Ne JAMAIS y laisser un mot de passe. \
Et ne jamais, jamais taper la dernière commande de celui-ci. »"));

//WAR ROOM (nouveau : l'enquête dans les journaux)
var WarRoom = new Room("WarRoom",
    "La war room de Cybersup : des écrans du sol au plafond, une table en fer à cheval, \
et des voyants qui baignent la salle de leur lumière. Une demi-douzaine d'étudiants de M2 fixent les écrans, \
casque sur les oreilles. Personne ne lève la tête quand tu entres.",
    "loc_warroom.gif");
var CheffeDeQuart = new Item("CheffeDeQuart",
    "« Toi, la recrue ! Grace, cheffe de quart. Un intrus, le Sorcier Noir, a pris le contrôle de Terminus, notre monde d'entraînement : \
regarde l'EcranMural. Il a verrouillé nos comptes, et Laurent est introuvable.\n\
\n\
Ton compte est neuf : il n'est pas sur sa liste. Entre dans Terminus, par la forêt ou la prairie. On te suit d'ici.\n\
\n\
Et pour t'entraîner : quelqu'un essaie des mots de passe à la chaîne. Trouve l'adresse qui échoue le plus dans auth.log, et crie-la : echo ADRESSE.\n\
  grep ECHEC auth.log | cut -d\" \" -f4 | sort | uniq -c | sort -n\n\
La bibliothécaire et le tavernier t'apprendront ces sorts. »",
    "item_grad.gif").personnage().revele("s_soc");
WarRoom.addItem(CheffeDeQuart);
var EcranMural = new Item("EcranMural", "", "loc_warroom.gif");
WarRoom.addItem(EcranMural);
var Voyants = new Item("Voyants", "", "loc_warroom.gif");
WarRoom.addItem(Voyants);
WarRoom.addItem(new Item("MainCourante",
    "MAIN COURANTE DE LA CELLULE DE CRISE\n\
\n\
08:47  Les voyants passent à l'orange. Quelqu'un tente des mots de passe en série sur nos machines.\n\
09:02  Voyants rouges. L'intrus est entré dans Terminus, le simulateur.\n\
09:05  Il signe ses messages « le Sorcier Noir ». Très original.\n\
09:10  Nos comptes sont verrouillés un par un. Laurent injoignable.\n\
09:12  Quelqu'un a vu Laurent ?\n\
09:30  La corruption gagne Oston. Nouvelle-Console ne répond plus.\n\
09:41  Le café est froid. Moral en baisse.\n\
09:55  Idée de Grace : envoyer quelqu'un dont le compte n'est pas encore connu de l'intrus. Une nouvelle recrue.\n\
10:00  En attente d'une nouvelle recrue.",
    "item_manuscript.gif"));
// ADRESSE_ATTAQUANT est tirée dans Partie.js, avec les autres valeurs propres à la partie.
var JournalAuth = (function(){
    var h = new Hasard(graineDe("journal"));
    var legitimes = [["grace", "10.0.92.14"], ["ada", "10.0.92.27"], ["dennis", "10.0.92.31"], ["evi", "10.0.92.8"],
        ["linus", "10.0.59.3"], ["radia", "10.0.13.8"], ["margaret", "10.0.92.40"], ["vint", "10.0.92.5"]];
    var cibles = ["root", "admin", "laurent", "root", "test", "laurent", "invite", "root"];
    var lignes = [];
    var secondes = 7 * 3600 + 58 * 60;
    function heure(){
        return deuxChiffres(Math.floor(secondes / 3600)) + ":" + deuxChiffres(Math.floor(secondes / 60) % 60) + ":" + deuxChiffres(secondes % 60);
    }
    for (var n = 0; n < 240; n++){
        secondes += 3 + h.entier(28);
        if (h.suivant() < 0.55){
            lignes.push(heure() + " ECHEC " + h.choix(cibles) + " " + ADRESSE_ATTAQUANT);
        } else {
            var qui = h.choix(legitimes);
            lignes.push(heure() + " " + (h.suivant() < 0.12 ? "ECHEC" : "SUCCES") + " " + qui[0] + " " + qui[1]);
        }
    }
    secondes += 11;
    lignes.push(heure() + " SUCCES laurent " + ADRESSE_ATTAQUANT);
    return new Item("auth.log", lignes.join("\n"));
})();
WarRoom.addItem(JournalAuth);

//BDE (nouveau : la vie de l'école)
var BDE = new Room("BDE",
    "Le local du BDE, le bureau des étudiants : un canapé qui a connu trois promos, une machine à café héroïque, \
et des cartons de sweats empilés jusqu'au plafond.",
    "loc_market.gif");
var NB_SWEATS = 0;
var Inventaire = (function(){
    var h = new Hasard(graineDe("inventaire"));
    var articles = ["sweat", "sweat", "tshirt", "tshirt", "mug", "casquette", "autocollant", "gourde"];
    var tailles = ["S", "M", "L", "XL"];
    var couleurs = ["noir", "blanc", "orange", "marine"];
    var lignes = [];
    for (var n = 0; n < 96; n++){
        var article = h.choix(articles);
        if (article === "sweat") NB_SWEATS++;
        lignes.push(article + ":" + (article === "sweat" || article === "tshirt" ? h.choix(tailles) : "unique") + ":" + h.choix(couleurs));
    }
    return new Item("Inventaire", lignes.join("\n"), "item_historybook.gif");
})();
BDE.addItem(new Item("PresidenteDuBDE",
    "« Salut ! Ada, présidente du BDE. Le BDE, c'est tout ce qui n'est pas dans le programme : les afterworks du jeudi, \
le CTF de l'école, les soirées, et la boutique. On vient de recevoir les nouveaux sweats, regarde.\n\
\n\
D'ailleurs, tu tombes à pic. Je dois annoncer ce soir combien de sweats il nous reste, et l'Inventaire fait des kilomètres. \
Chaque ligne, c'est un article en stock : son type, sa taille, sa couleur. Combien de lignes parlent d'un sweat ? \
Crie-moi le nombre : echo NOMBRE.\n\
\n\
  grep -c sweat Inventaire          compte les lignes qui contiennent « sweat »\n\
  grep sweat Inventaire | wc -l     la même chose, avec un tuyau\n\
\n\
Tu ne connais pas grep ? La bibliothécaire de Terminus te l'apprendra. Reviens me voir après : il y a un autocollant à la clé. »",
    "item_student.gif").personnage().revele("s_bde"));
BDE.addItem(Inventaire);
BDE.addItem(new Item("Boutique",
    "BOUTIQUE DU BDE\n\
\n\
  Sweat à capuche, grand Y dans le dos ............ le classique\n\
  T-shirt « Ça marche sur ma machine » ............ pour les jours de démonstration\n\
  Mug « chmod 777 n'est pas une solution » ........ pour les lendemains de démonstration\n\
  Autocollants ..................................... offerts aux gens serviables",
    "loc_market.gif"));
BDE.addItem(new Item("AfficheCTF",
    "CTF DE L'ÉCOLE\n\
\n\
Une chasse au drapeau : des épreuves cachées dans des machines, un drapeau à trouver dans chacune, \
un classement, des équipes de trois.\n\
\n\
Trois règles : on n'attaque que les machines du jeu, on ne sabote pas les autres équipes, \
et on note tout ce qu'on trouve.\n\
\n\
Échauffement permanent : un drapeau est caché dans la SalleServeurs. Demande à Margaret, en SalleDeCours.",
    "item_sign.gif"));
var Autocollant = new Item("Autocollant",
    "Un autocollant du BDE : « Il n'y a pas de nuage. Il y a juste l'ordinateur de quelqu'un d'autre. »\n\
Il est à toi : rien ne t'empêche de le rapporter chez toi (mv Autocollant ~).",
    "item_trinket.gif").droits("rw-r--r--", JOUEUR);

//LES AUTRES CAMPUS (nouveau : on n'y va que par ssh)
var CampusLille = new Room("CampusLille",
    "Le campus de Lille. Par la fenêtre, de la brique rouge et un ciel qui hésite. La salle sent la gaufre.",
    "loc_stata.gif");
CampusLille.removeCommand("cd");
CampusLille.addCmdText("cd", "Lille est à plus de deux cents kilomètres : on n'y va pas à pied. \
Par le réseau, en revanche, c'est l'affaire d'une seconde : ssh lille (voir la SalleReseau).");
CampusLille.addItem(new Item("EtudiantDeLille",
    "« Tiens, de la visite de Puteaux ! Linus, B3. Tu es venu par ssh ? Normal : c'est le seul train qui n'a jamais de retard.\n\
\n\
Ici on suit la crise de la WarRoom sur nos écrans. J'ai un tuyau pour toi, c'est le cas de le dire. \
Les intrus adorent laisser des tâches planifiées derrière eux : tu arrêtes leur programme, il revient une minute plus tard. \
Le jour où ça t'arrive, ne t'acharne pas. Demande-toi qui le relance. »",
    "item_boy.gif").personnage().revele("s_campus"));
CampusLille.addItem(new Item("Gaufre",
    "Une gaufre fourrée, encore tiède. Elle ne survivrait pas au voyage par ssh."));
var CampusMarseille = new Room("CampusMarseille",
    "Le campus de Marseille. Du soleil plein les vitres, et quelqu'un a encore laissé la fenêtre ouverte sur le bruit du port.",
    "loc_stata.gif");
CampusMarseille.removeCommand("cd");
CampusMarseille.addCmdText("cd", "Marseille est à l'autre bout du pays : on n'y va pas à pied. \
Par le réseau, en revanche, c'est l'affaire d'une seconde : ssh marseille (voir la SalleReseau).");
CampusMarseille.addItem(new Item("EtudianteDeMarseille",
    "« Oh, de la visite ! Radia, M1. Assieds-toi, tu as bien cinq minutes. Non ? Vous n'avez jamais cinq minutes, à Puteaux.\n\
\n\
Un conseil quand même, pour ton affaire de sorcier. Un secret bien gardé, sur une machine, c'est presque toujours \
un fichier caché (ls -a), que seul son propriétaire a le droit de lire (ls -l), et trop long pour être lu d'une traite. \
Tu vois le tableau ? Alors tu sais déjà avec quels sorts on l'ouvre. »",
    "item_lady.gif").personnage().revele("s_campus"));
CampusMarseille.addItem(new Item("CartePostale",
    "Une carte postale des calanques, punaisée au mur. Au dos : « Le réseau passe mal ici. C'est fait exprès. »"));

var BureauDeLaurent = new Room("BureauDeLaurent",
    "Un bureau encombré : des piles de copies, une cape noire jetée sur le dossier d'une chaise, \
une fausse barbe blanche sur le portemanteau, et un terminal resté allumé.",
    "item_locker.gif");
BureauDeLaurent.droits("rwx------", "laurent");
BureauDeLaurent.deny_text = "(La porte est fermée à clé. ls -l te dira qui a le droit d'entrer.)";
BureauDeLaurent.addItem(new Item("Agenda",
    "AGENDA DE LA SEMAINE\n\
lundi      jouer le vieil homme dans la montagne (penser à la barbe)\n\
mardi      enfiler la cape du Sorcier Noir, relancer les démons\n\
mercredi   nourrir les trolls, arroser les ronces\n\
jeudi      apporter du chocolat à la stagiaire dans la cage\n\
vendredi   corriger les copies\n\
\n\
Note : si quelqu'un lit cet agenda avant la fin de l'examen, c'est qu'il a compris \
que sudo permet de regarder sans entrer. Ne pas le pénaliser. Lui mettre un point de plus.",
    "item_manuscript.gif").droits("rw-------", "laurent"));
var MotDeLaurent = new Item("MotDeLaurent",
    "« Tu as fait tout ce chemin, alors un dernier conseil, le seul qui compte vraiment.\n\
\n\
Dans un vrai terminal, il n'y a pas de vieil homme caché dans la montagne. Mais il y a toujours man. \
Personne ne connaît toutes les commandes par cœur : les bons administrateurs sont ceux qui \
savent chercher, lire un message d'erreur jusqu'au bout, et essayer.\n\
\n\
Ouvre un vrai terminal. Tape ls. Tu es déjà chez toi.\n\
\n\
Laurent »",
    "item_manuscript.gif");
var Credits = new Item("Credits",
    "TERMINUS\n\
Jeu d'origine créé au MIT par Michele Pratusevich et Shawn Conrad, avec leurs contributeurs.\n\
https://github.com/mprat/terminus\n\
\n\
ÉDITION CYBERSUP\n\
Un fork du jeu d'origine : même monde, même histoire, traduits en français, \
avec davantage de sorts et un directeur pédagogique en embuscade.\n\
\n\
Distribué sous licence GNU GPL version 2, comme l'original.",
    "titlescreen_cybersup.gif");

//CITADELLE (nouveau : le combat final)
var Citadelle = new Room("Citadelle",
    "Tu gravis les marches de la Citadelle. Au sommet, une silhouette encapuchonnée te tourne le dos, \
penchée sur un immense terminal dont l'écran baigne la salle d'une lueur verte. Le Sorcier Noir.",
    "loc_citadelle.gif");
var SorcierNoir = new Item("SorcierNoir",
    "La silhouette ne se retourne même pas. « Un apprenti. Ici. Avec le mot de passe sudo, en plus. \
Félicitations, tu sais lire un fichier journal. »\n\
Il pianote sur son terminal, et l'air se trouble autour de lui. « Regarde donc ce qui tourne ici avec ps. \
Trois démons veillent sur moi : un bouclier, une illusion, une corruption. Ce sont MES processus, pas les tiens. \
Tant qu'ils tournent, aucun de tes sorts ne m'atteindra. Et n'espère pas en finir d'un simple kill : \
mon bouclier renaît chaque minute. C'est écrit dans ma crontab. »\n\
(Dans le monde des machines, un démon est un processus qui tourne en arrière-plan. \
Le Sorcier a le sens de la formule.)",
    "item_sorciernoir.gif").personnage();
SorcierNoir.addCmdText("rm", "Ton sort ricoche sur le Sorcier Noir sans même froisser sa cape. « Vraiment ? rm ? Sur MOI ? »");
SorcierNoir.addCmdText("mv", "Le Sorcier Noir ne bouge pas d'un pouce. « On ne déplace pas un sorcier, on le vainc. Ou on essaie. »");
SorcierNoir.addCmdText("cp", "« Un seul de moi te pose déjà bien assez de problèmes, tu ne trouves pas ? »");
Citadelle.addItem(SorcierNoir);
var TEXTE_BOUCLIER_BRISE = "Le bouclier arcanique vole en éclats dans un bruit de verre brisé.";
var PIDS_DEMONS = tirerPids("demons", 3, 100, 999);
Citadelle.addProc(PIDS_DEMONS[0], "demon_bouclier", "sorcier", { cpu: 66.6, killText: TEXTE_BOUCLIER_BRISE });
Citadelle.addProc(PIDS_DEMONS[1], "demon_illusion", "sorcier", {
    cpu: 40.4,
    sig9: true,
    ignoreText: "Le démon d'illusion reçoit ton signal TERM... et l'ignore en ricanant. Certains processus ne comprennent que la manière forte : kill -9.",
    killText: "L'illusion se déchire comme un vieux rideau."
});
Citadelle.addProc(PIDS_DEMONS[2], "demon_corruption", "sorcier", {
    cpu: 88.8,
    killText: "La corruption se résorbe en sifflant, comme une bouilloire qu'on retire du feu."
});
var Phylactere = (function(){
    var h = new Hasard(87);
    var lignes = [
        "# phylactere.conf : configuration de l'âme du Sorcier Noir",
        "# NE PAS LIRE. NE PAS MODIFIER. NE PAS LAISSER TRAÎNER.",
        "",
        "# --- apparence ---",
        "cape=noire", "capuche=relevee", "eclairs=verts", "rire=sardonique", "volume_du_rire=11",
        "barbe=fausse", "nombre_de_capes=3",
        "",
        "# --- personnel ---",
        "trolls_nourris=oui", "ronces_arrosees=oui", "stagiaire=cage", "chocolat_pour_la_stagiaire=oui",
        "nom_de_scene=SorcierNoir", "nombre_de_trolls=3",
        "",
        "# --- sortileges ---"
    ];
    for (var n = 1; n <= 64; n++){
        lignes.push("sortilege_" + deuxChiffres(n) + "=" + h.choix(["actif", "inactif", "actif", "en_panne"]));
    }
    lignes.push("");
    lignes.push("# --- identite (surtout ne pas divulguer) ---");
    lignes.push("vrai_nom=Laurent");
    lignes.push("metier=directeur_pedagogique");
    lignes.push("");
    lignes.push("# --- divers ---");
    for (var m = 65; m <= 99; m++){
        lignes.push("sortilege_" + deuxChiffres(m) + "=" + h.choix(["actif", "inactif", "inactif", "en_panne"]));
    }
    lignes.push("stylo=rouge");
    lignes.push("copies_a_corriger=128");
    lignes.push("anomalie=aucune");
    lignes.push("# fin du fichier");
    return new Item(".Phylactere", lignes.join("\n"), "item_trinket.gif");
})();
Phylactere.droits("---------", "sorcier");
Phylactere.protege = true;
Certificate.protege = true;
Citadelle.addItem(Phylactere);
var VRAI_NOM = "laurent";

var Laurent = new Item("Laurent",
    "« Je te dois des explications. Je m'appelle Laurent, Directeur Pédagogique de Cybersup.\n\
\n\
Le Sorcier Noir, la corruption, les trolls : c'était ton examen. On retient un sort le jour où il nous sort d'un mauvais pas, \
alors je t'en ai offert plusieurs. Le vieil homme du man ? Moi, avec une fausse barbe. L'enfant dans la cage ? Ma stagiaire. \
Et la WarRoom passait son propre exercice de crise en même temps.\n\
\n\
Ces sorts n'ont rien de magique : ls, grep, chmod, sudo marchent tels quels sur les vraies machines, celles des hôpitaux et des banques. \
Les défendre est un métier : c'est celui qu'on enseigne.\n\
\n\
Ton Diplome est là. Le Paradis est ouvert, mon bureau à Cybersup aussi, et je t'offre le sort tree. \
Une seule règle : avec sudo, on relit sa ligne avant d'appuyer sur Entrée. »",
    "item_mysteryman.gif").personnage();
Laurent.addCmdText("rm", "Laurent hausse un sourcil. « On ne supprime pas le directeur pédagogique. D'autres ont essayé, à la veille des partiels. »");
Laurent.addCmdText("mv", "« Je me déplace très bien tout seul, merci. »");
Laurent.addCmdText("cp", "« Deux directeurs pédagogiques ? Tes camarades ne te le pardonneraient pas. »");
var Diplome = new Item("Diplome", "", "item_manuscript.gif");


/**
* LINKS BETWEEN ROOMS
* Fulfill parent/child relationships between rooms
*
* API: link(parentRoom, childRoom)
*/
function link_rooms(parentRoom, childRoom){
    parentRoom.addChild(childRoom);
    childRoom.addParent(parentRoom);
};


// LEVEL 1 LINKS
link_rooms(Home, WesternForest);
link_rooms(WesternForest, SpellCastingAcademy);
link_rooms(SpellCastingAcademy, Lessons);
link_rooms(SpellCastingAcademy, PracticeRoom);
link_rooms(SpellCastingAcademy, Scriptorium);
link_rooms(PracticeRoom, Box);
link_rooms(Home, NorthernMeadow);
link_rooms(NorthernMeadow, EasternMountains);
link_rooms(EasternMountains, Cave);
link_rooms(Cave, DarkCorridor);
link_rooms(Cave, Staircase);
link_rooms(DarkCorridor, DankRoom);
link_rooms(DankRoom, SmallHole);
// link_rooms(DankRoom, Tunnel);  quand le Rocher aura bougé
link_rooms(Tunnel, StoneChamber);
link_rooms(StoneChamber, Portal);

//level 1 -> level 2
link_rooms(Portal, TownSquare);

//LEVEL 2 LINKS
link_rooms(TownSquare, Marketplace);
link_rooms(TownSquare, Library);
link_rooms(TownSquare, Taverne);
link_rooms(TownSquare, ArtisanShop);
link_rooms(TownSquare, RockyPath);
link_rooms(TownSquare, BrokenBridge);
// link_rooms(Library, BackRoom);  quand le levier aura été tiré
// link_rooms(RockyPath, Farm);  quand le GrosRocher aura disparu
link_rooms(BrokenBridge, Clearing);
link_rooms(Clearing, OminousLookingPath);
// link_rooms(OminousLookingPath, CaveOfDisgruntledTrolls);  quand les Ronces auront disparu
link_rooms(CaveOfDisgruntledTrolls, Cage);
link_rooms(CaveOfDisgruntledTrolls, Slide);
link_rooms(Slide, KernelFiles);
link_rooms(KernelFiles, MoreKernelFiles);
// link_rooms(KernelFiles, Citadelle);  quand le Certificat aura été lu
// link_rooms(Citadelle, Paradise);  quand le Sorcier Noir aura été vaincu

//Cybersup (à la place du MIT de la version d'origine)
link_rooms(Home, Cybersup);
link_rooms(Cybersup, SalleDeCours);
link_rooms(Cybersup, SalleServeurs);
link_rooms(Cybersup, SalleReseau);
link_rooms(Cybersup, WarRoom);
link_rooms(Cybersup, BDE);
link_rooms(Cybersup, CampusLille);
link_rooms(Cybersup, CampusMarseille);
link_rooms(Cybersup, BureauDeLaurent);
link_rooms(SalleServeurs, Baie1);
link_rooms(SalleServeurs, Baie2);
link_rooms(SalleServeurs, Baie3);
link_rooms(Baie2, Sauvegardes);

// À partir d'ici, tout ce qui est créé l'est par le joueur.
/* World.fige est posé à la fin de Panne.js, une fois tous les chapitres construits. */


/**
* LE MONDE RÉAGIT
*
* verifierMonde() est appelée après chaque ligne tapée. Elle regarde l'état du
* monde (où est le Rocher ? y a-t-il une Planche sur le pont ?) et déclenche les
* événements de l'histoire, une seule fois chacun, via state.applyState().
* Peu importe COMMENT le joueur y est arrivé : c'est le résultat qui compte.
*/
function verifierMonde(){
    function une(nom, condition){
        if (!state.has(nom) && condition) state.applyState(nom);
    }
    function aTous(lieu, noms){
        for (var i = 0; i < noms.length; i++){
            if (lieu.getItemFromName(noms[i]) === -1) return false;
        }
        return true;
    }
    une("mvBoulder", !DankRoom.hasItem(Boulder));
    une("ouvrirPortail", Shell.bit(Portal, "x", null));
    une("rmLargeBoulder", !RockyPath.hasItem(LargeBoulder));
    une("touchGear", ArtisanShop.getItemFromName("Rouage") !== -1);
    // Un Rouage recréé avec touch après coup est vide : l'Artisane le façonne, comme le premier.
    var rouageModele = ArtisanShop.getItemFromName("Rouage");
    if (state.has("touchGear") && rouageModele !== -1 && rouageModele.getText() === ""){
        rouageModele.setText("C'est un rouage, tout neuf.");
        rouageModele.changePicName("item_gear.gif");
        say("L'Artisane prend ton nouveau Rouage, lui donne trois coups de lime, et te le rend. « Voilà un vrai rouage. Copie celui-là. »");
    }
    // Les rouages et l'épi doivent être de vraies copies (cp), pas des objets vides créés avec touch.
    var cinqRouages = ["rouage1", "rouage2", "rouage3", "rouage4", "rouage5"];
    if (state.has("touchGear") && aTous(ArtisanShop, cinqRouages)){
        var modele = ArtisanShop.getItemFromName("Rouage");
        var vraiesCopies = cinqRouages.every(function(nom){
            var r = ArtisanShop.getItemFromName(nom);
            return r.getText() !== "" && (modele === -1 || r.getText() === modele.getText());
        });
        une("FiveGearsCopied", vraiesCopies);
        if (vraiesCopies) state.flags["rouagesVides"] = false;
        if (!vraiesCopies && !state.has("rouagesVides")){
            state.set("rouagesVides");
            say("L'Artisane soupèse tes rouages. « Ceux-là sont creux ! Je veux des COPIES de mon Rouage : cp Rouage rouage1, et ainsi de suite. Efface les faux avec rm. »");
        }
    } else if (state.has("rouagesVides") && !state.has("FiveGearsCopied")){
        // Le joueur a fait le ménage : l'Artisane pourra redire ce qui ne va pas à la prochaine série.
        state.flags["rouagesVides"] = false;
    }
    var autreEpi = Farm.getItemFromName("AutreEpiDeMais");
    une("CornCopied", autreEpi !== -1 && autreEpi.getText() === EarOfCorn.getText());
    if (autreEpi !== -1 && autreEpi.getText() !== EarOfCorn.getText() && !state.has("epiVide")){
        state.set("epiVide");
        say("Le fermier examine ton AutreEpiDeMais. « Mais... il est vide ! Il me faut une COPIE du vrai : cp EpiDeMais AutreEpiDeMais. Efface celui-ci d'abord (rm). »");
    }
    une("touchPlank", BrokenBridge.getItemFromName("Planche") !== -1);
    une("HouseMade", Clearing.getChildFromName("Chaumiere") !== -1);
    une("rmBrambles", !OminousLookingPath.hasItem(ThornyBrambles));
    une("openSlide", !CaveOfDisgruntledTrolls.hasItem(UglyTroll));
    une("enfantLibre", !Cage.hasItem(KidnappedChild));
    une("trollHideuxParti", !CaveOfDisgruntledTrolls.hasItem(HideousTroll));
    une("mannequinsRanges", (function(){
        for (var i = 0; i < Mannequins.length; i++){ if (!Box.hasItem(Mannequins[i])) return false; }
        return true;
    })());
    une("processusArretes", !SalleDeCours.hasProcNamed("sortilege_infini") && !SalleDeCours.hasProcNamed("golem_tetu"));
    une("demonsMorts", Citadelle.procs.length === 0);
    une("campusVisites", state.visited[CampusLille.id] === true && state.visited[CampusMarseille.id] === true);
    if (state.has("victoire")) Diplome.cmd_text["less"] = state.texteDuDiplome();
    // Les objets de l'école qui se tiennent à jour tout seuls.
    CarteEtudiante.cmd_text["less"] = texteCarteEtudiante();
    EcranMural.cmd_text["less"] = texteEcranMural();
    Voyants.cmd_text["less"] = texteVoyants();
    if (typeof verifierPanne === "function") verifierPanne();
    if (typeof verifierChapitre2 === "function") verifierChapitre2();
}

function texteCarteEtudiante(){
    var pr = state.progression();
    return "CARTE ÉTUDIANTE · CYBERSUP\n\n" +
        "  Nom          : " + (state.nom || "(à compléter : signe la FeuilleEmargement)") + "\n" +
        "  Identifiant  : " + JOUEUR + "\n" +
        "  Promo        : B1, rentrée de cette année\n" +
        "  Campus       : Puteaux\n" +
        "  Niveau       : " + pr.niveau + " sur " + NIVEAUX.length + ", " + pr.titre + "\n" +
        "  Expérience   : " + pr.xp + " XP\n\n" +
        "Cette carte se met à jour toute seule. Ne la plie pas.";
}

function texteEcranMural(){
    function ligne(nom, etat){
        var points = "";
        while (nom.length + points.length < 26) points += ".";
        return "  " + nom + " " + points + " " + etat;
    }
    var fini = state.has("victoire");
    var citadelle = "position inconnue";
    if (state.quests["s_soc"] || state.has("certificatLu")) citadelle = "SOURCE DE L'ATTAQUE (" + ADRESSE_ATTAQUANT + ")";
    if (state.has("demonsMorts")) citadelle = "défenses tombées";
    if (fini) citadelle = "reprise";
    return "ÉCRAN MURAL · supervision de Terminus, le simulateur\n\n" +
        ligne("Maison", "calme") + "\n" +
        ligne("Académie des Sorts", "calme") + "\n" +
        ligne("Portail", state.has("ouvrirPortail") ? "ouvert" : "scellé") + "\n" +
        ligne("Place du village", fini ? "on danse sur la place" : "population inquiète") + "\n" +
        ligne("Ferme", state.has("CornCopied") ? "récolte sauvée" : "récolte détruite") + "\n" +
        ligne("Clairière", state.has("HouseMade") ? "chaumière rebâtie" : "maison détruite") + "\n" +
        ligne("Caverne des Trolls", state.has("enfantLibre") ? "enfant libéré" : "un enfant retenu") + "\n" +
        ligne("Oston", fini ? "restauré" : "CORROMPU") + "\n" +
        ligne("Nouvelle-Console", fini ? "restaurée" : "NE RÉPOND PLUS") + "\n" +
        ligne("Citadelle", citadelle) + "\n\n" +
        (state.has("chapitre1Saute") ? "  Épreuve des B1 : terminée ce matin. Toi, tu es le renfort : ta mission est ailleurs.\n" +
        "  Étapes franchies par les B1 : " + QUETES_PRINCIPALES.length + " sur " + QUETES_PRINCIPALES.length : "") +
        (state.has("chapitre1Saute") ? "" : "  Agent sur le terrain : " + (state.nom || JOUEUR) + "\n" +
        "  Dernière position connue dans Terminus : " + (state.dernierLieu || "aucune, il n'y est pas encore entré") + "\n" +
        "  Étapes franchies : " + QUETES_PRINCIPALES.filter(function(q){ return state.quests[q.id]; }).length + " sur " + QUETES_PRINCIPALES.length);
}

function texteVoyants(){
    if (state.has("victoire")){
        return "Les voyants sont au VERT fixe. Un gong a retenti quand le dernier a basculé, et quelqu'un a applaudi.";
    }
    if (state.has("demonsMorts")){
        return "Les voyants sont passés à l'ORANGE : les défenses de l'intrus sont tombées. Toute la salle retient son souffle.";
    }
    return "Les voyants pulsent en ROUGE : un intrus est actif dans Terminus. \
Ce sont les mêmes voyants qui servent de minuteur pendant les examens. Vert : on a le temps. Orange : il faut conclure. Rouge : posez les stylos.";
}

/* Indices quand le joueur est presque dans le vrai. */
/* Le PlanDuDragon est-il intact, à sa place ? */
function planIntact(){
    var plan = ArtisanShop.getItemFromName("PlanDuDragon");
    return plan !== -1 && plan.getText() === TEXTE_PLAN_DRAGON;
}
function planEcrase(){
    if (state.has("planEcrase") || planIntact()) return;
    state.set("planEcrase");
    say(C.rouge("L'Artisane pousse un cri.") + " « Mon PlanDuDragon ! Tu l'as ÉCRASÉ ! Trois ans de travail remplacés par un gribouillis !\n\
...\n\
Bon. Respire. C'est ma faute, j'aurais dû prévenir : cp ne demande jamais rien. Si la copie porte le nom d'un objet \
qui existe, l'ancien contenu disparaît. Sous Linux, c'est pareil, et il n'y a pas de corbeille pour le récupérer.\n\
Heureusement, je garde toujours une copie cachée. Cherche-la (ls -a) et remets-la en place : cp .PlanDuDragon.bak PlanDuDragon\n\
Ensuite, refais ce que t'a demandé la petite, mais avec cp -i : il demande avant d'écraser. Et cette fois, réponds non. »");
    Apprentie.addCmdText("less", "L'apprentie se cache derrière son établi. « J'ai cru entendre “attention” ! La maîtresse dit qu'il faut remettre \
la sauvegarde (cp .PlanDuDragon.bak PlanDuDragon), puis réessayer avec cp -i, et répondre non quand il demande. »");
}
GameEvents.addListener("write", function(e){
    if (e.room === ArtisanShop && e.item.itemname === "PlanDuDragon") planEcrase();
});
GameEvents.addListener("rm", function(e){
    if (e.room === ArtisanShop && e.item.itemname === "PlanDuDragon") planEcrase();
});
GameEvents.addListener("mv", function(e){
    if ((e.from === ArtisanShop && e.oldName === "PlanDuDragon") || (e.to === ArtisanShop && e.item.itemname === "PlanDuDragon")) planEcrase();
});
GameEvents.addListener("ecrasementEvite", function(e){
    if (e.nom !== "PlanDuDragon" || !planIntact() || ArtisanShop.getItemFromName("PlanDuDragon") !== e.item) return;
    say("L'Artisane hoche la tête. « Voilà. cp -i t'a demandé, tu as vu que PlanDuDragon existait, tu as dit non. " +
        (state.has("planEcrase") ? "Tu viens d'apprendre la leçon la plus chère du terminal, et ça ne t'a coûté qu'une sauvegarde." :
        "Et tu n'as même pas eu besoin de casser quoi que ce soit pour comprendre. Bravo.") +
        " Range le brouillon sous un autre nom, la petite s'en remettra. »");
    Apprentie.addCmdText("less", "L'apprentie range son brouillon dans un tiroir. « Merci ! Et désormais, j'écris cp -i. La maîtresse dit que c'est un alias très populaire. »");
    state.complete("s_ecrasement");
});

GameEvents.addListener("touch", function(e){
    var nom = e.item.itemname;
    if (e.room === BrokenBridge && nom !== "Planche" && nom.toLowerCase() === "planche"){
        say(C.gris("(Le pont réclame une « Planche », avec la majuscule. Sous Linux, « " + nom + " » est un autre nom. Tu peux la renommer : mv " + nom + " Planche)"));
    }
    if (e.room === ArtisanShop && nom !== "Rouage" && nom.toLowerCase() === "rouage"){
        say("L'Artisane fronce les sourcils. « J'ai demandé un Rouage, avec la majuscule. Renomme-moi ça : mv " + nom + " Rouage »");
    }
});
GameEvents.addListener("mkdir", function(e){
    var nom = e.room.room_name;
    if (e.parent === Clearing && nom !== "Chaumiere" && nom.toLowerCase() === "chaumiere"){
        say("L'homme renifle. « C'est une Chaumiere que je veux, avec la majuscule. Efface celle-ci (rmdir " + nom + ") et recommence. »");
    }
});

/* Lectures qui font avancer l'histoire. */
GameEvents.addListener("read", function(e){
    if (e.item === Lever && e.cmd !== "grep" && e.cmd !== "wc" && e.cmd !== "sort"){
        if (!state.has("pullLever")) state.applyState("pullLever");
    }
    if (e.item === ChaussetteGauche && (e.cmd === "less" || e.cmd === "cat")) state.complete("s_chaussette");
    if (e.item === Annales && (e.cmd === "less" || e.cmd === "cat")) state.complete("s_annales");
    if (e.item === GrandParchemin && (e.cmd === "head" || e.cmd === "tail" || e.cmd === "wc")){
        state.set("parchemin_" + e.cmd);
        if (state.has("parchemin_head") && state.has("parchemin_tail") && state.has("parchemin_wc") && !state.has("parcheminMesure")){
            state.applyState("parcheminMesure");
        }
    }
    if (e.item === HistoryOfTerminus && e.cmd === "grep" && (e.text.match(/SorcierNoir/g) || []).length >= 4){
        if (!state.has("enqueteFaite")) state.applyState("enqueteFaite");
    }
    if (e.text.indexOf("motdepasse=") > -1 && !state.has("mdpTrouve")) state.applyState("mdpTrouve");
    if (e.item === Certificate && e.cmd !== "wc" && e.text !== "" && !state.has("certificatLu")) state.applyState("certificatLu");
    if (e.item === Flag && e.text.indexOf("FLAG{") > -1) state.complete("s_ctf");
    if (e.item === Phylactere && e.text.indexOf("vrai_nom=") > -1 && !state.has("nomLu")) state.applyState("nomLu");
});

/* echo : parler à voix haute. */
function memeMot(a, b){
    return a.toLowerCase().replace(/[^a-zà-ÿ]/g, "") === b.toLowerCase();
}
GameEvents.addListener("echo", function(e){
    if (e.room === Taverne && state.seen["s_client"] && !state.quests["s_client"]){
        if (memeMot(e.text, MEILLEUR_CLIENT)){
            state.applyState("clientTrouve");
        } else if (Registre.getText().split("\n").some(function(ligne){ return memeMot(e.text, ligne.split(":")[0]); })){
            say("Le tavernier secoue la tête. « " + e.text.trim() + " ? Non. Recompte. »");
        }
    }
    if (e.room === WarRoom && state.seen["s_soc"] && !state.quests["s_soc"]){
        var dit = e.text.trim();
        if (dit === ADRESSE_ATTAQUANT){
            state.applyState("attaquantIdentifie");
        } else if (/^\d+\.\d+\.\d+\.\d+$/.test(dit)){
            say("Grace vérifie sur son écran. « Non, celle-là n'a que quelques échecs : quelqu'un qui tape mal son mot de passe. \
Cherche celle qui en compte des dizaines. »");
        }
    }
    if (e.room === BDE && state.seen["s_bde"] && !state.quests["s_bde"]){
        var nombre = e.text.trim();
        if (nombre === String(NB_SWEATS)){
            state.applyState("inventaireFait");
        } else if (/^\d+$/.test(nombre)){
            say("Ada fait la moue. « " + nombre + " ? Ça ne colle pas avec les cartons. Recompte : seulement les lignes où il y a écrit sweat. »");
        }
    }
    if (e.room === Citadelle && !state.has("victoire")){
        if (memeMot(e.text, VRAI_NOM)){
            if (!state.has("demonsMorts")){
                say("Ta voix se brise contre le bouclier du Sorcier Noir. Tant que ses démons tournent, rien ne l'atteint.");
            } else if (!state.has("nomLu")){
                say("Le Sorcier Noir ricane. « Un nom deviné n'a aucun pouvoir, apprenti. Il faut l'avoir LU. »");
            } else {
                state.applyState("victoire");
            }
        } else if (e.text.trim() !== ""){
            say("Ta voix résonne sous la voûte. Le Sorcier Noir hausse les épaules : ce n'est pas son nom.");
        }
    }
});

/* Signer : le LivreDOr de la Taverne et la FeuilleEmargement de l'école. */
GameEvents.addListener("write", function(e){
    var registres = [
        { item: LivreDOr, texte: TEXTE_LIVRE_DOR, quete: "s_livredor",
          ecrase: "Le tavernier blêmit. « Mes signatures ! Tu as tout ÉCRASÉ avec ton chevron unique ! » \
Il sort une copie de sous le comptoir en grommelant, recolle les pages et y ajoute ta ligne lui-même. \
« Deux chevrons pour ajouter. DEUX. »",
          ajoute: "Ta signature rejoint celles des autres voyageurs. Le barde applaudit." },
        { item: FeuilleEmargement, texte: TEXTE_EMARGEMENT, quete: "s_emargement",
          ecrase: "Hedy pâlit. « Tu viens d'effacer toute la promo ! Un seul chevron écrase, il en faut deux pour ajouter. » \
Elle ressort une feuille de secours du tiroir (ce n'est manifestement pas la première fois) et y recopie ton nom.",
          ajoute: "Hedy vérifie la feuille. « Parfait, ta présence est officielle. Ton nom est sur ta carte étudiante. »" }
    ];
    for (var i = 0; i < registres.length; i++){
        var r = registres[i];
        if (e.item !== r.item) continue;
        var signature = e.text.split("\n")[0].trim();
        if (!e.append){
            r.item.setText(r.texte + (signature !== "" ? "\n" + e.text : ""));
            say(r.ecrase);
        } else {
            say(r.ajoute);
        }
        if (signature !== ""){
            if (!PROFIL.prenom) state.nom = signature.replace(/^[«"'\s]+|[»"'\s]+$/g, "").substring(0, 30);
            state.complete(r.quete);
        }
    }
});

/* Le bouclier du Sorcier renaît tant que sa crontab le relance. */
GameEvents.addListener("kill", function(e){
    if (e.room !== Citadelle || e.proc.name !== "demon_bouclier") return;
    var relance = (state.cron["sorcier"] || []).some(function(ligne){ return ligne.indexOf("demon_bouclier") > -1; });
    if (!relance) return;
    var pid = e.proc.pid + 1000;
    Citadelle.addProc(pid, "demon_bouclier", "sorcier", { cpu: 66.6, killText: TEXTE_BOUCLIER_BRISE });
    say("À peine brisé, le bouclier se reforme sous un nouveau numéro (PID " + pid + "). Le Sorcier Noir ricane : \
« Je te l'avais dit. Ma crontab le relance chaque minute. Tu peux le tuer jusqu'à demain. »");
});
GameEvents.addListener("crontab", function(e){
    if (e.user === "sorcier" && !state.has("cronRetiree")){
        state.set("cronRetiree");
        say("Le Sorcier Noir sursaute. « Ma crontab ! Qui t'a appris ça ? » Plus rien ne relancera ses démons.");
    }
});

/* Les quêtes de la deuxième vague de sorts. */
GameEvents.addListener("diff", function(e){
    var lesDeux = (e.a === CopieDuMatin && e.b === CopieDuSoir) || (e.a === CopieDuSoir && e.b === CopieDuMatin);
    if (lesDeux && e.different && !state.has("copieDemasquee")){
        state.set("copieDemasquee");
        say("L'apprenti copiste s'étrangle. « “Quand on veut” ? Et un article 41 sur le dessert ? Ce n'est pas mon écriture ! \
Quelqu'un a falsifié la copie du soir. Sans toi, le règlement changeait dès demain. »");
        state.complete("s_diff");
    }
});
GameEvents.addListener("variable", function(e){
    // La quête demande de la faire « résonner » : il faut donc un echo.
    if (/(^|[|;&]\s*)echo(\s|$)/.test(e.line)) state.complete("s_variables");
});
GameEvents.addListener("alias", function(e){
    state.complete("s_alias");
});
GameEvents.addListener("ln", function(e){
    if (e.target instanceof Room) state.complete("s_lien");
});
GameEvents.addListener("script", function(e){
    if (e.item !== RemonterScript || state.has("dragonRemonte")) return;
    if (!e.direct){
        say(C.gris("(Le script a tourné : bash n'a besoin que du droit de le lire. Mais l'Artisane fait la moue : elle voulait du travail soigné, ./remonter.sh, ce qui demande le droit x.)"));
        return;
    }
    state.set("dragonRemonte");
    ClockworkDragon.addCmdText("less", "Le dragon mécanique, remonté à bloc, enchaîne les loopings entre les horloges. \
De temps en temps il crache une étincelle, l'air très content de lui.");
    say("Le DragonMecanique s'ébroue, déploie ses ailes de laiton et décolle. L'Artisane siffle d'admiration : \
« Un script qui a le droit x et qu'on lance par son chemin. Du travail soigné. »");
    state.complete("s_script");
});
GameEvents.addListener("passwd", function(e){
    if (!e.ok) return;
    if (!state.quests["s_passwd"]) say("Le RSSI hoche la tête, presque ému. « Long, varié, et rien qu'à toi. Si seulement tout le monde faisait pareil. »");
    state.complete("s_passwd");
});
GameEvents.addListener("tar", function(e){
    if (e.mode === "x" && e.item === ArchiveLundi) state.complete("s_archive");
});
GameEvents.addListener("ssh", function(e){
    state.complete("s_ssh");
});
GameEvents.addListener("ping", function(e){
    if (e.ok && e.parAdresse && e.host === "lille"){
        if (!state.quests["s_adresse"]) say("Vint sort la tête de l'armoire. « Par son adresse, sans passer par le nom : c'est exactement ce que fait le réseau en coulisses. Le nom, c'est pour les humains. »");
        state.complete("s_adresse");
    }
});
GameEvents.addListener("apt", function(e){
    state.complete("s_apt");
});

/* Arriver quelque part (même en sautant des étapes avec un long chemin). */
GameEvents.addListener("enter", function(e){
    if (e.room !== Home && !joueurDans(Cybersup)) state.dernierLieu = e.room.room_name;
    if (joueurDans(Tunnel)) state.complete("m_tunnel");
    if (joueurDans(TownSquare)) state.complete("m_portail");
    if (e.room === Paradise && !state.has("fin")) state.applyState("fin");
});

GameEvents.addListener("learn", function(e){
    if (e.spell === "mv") state.complete("m_mv");
    if (state.knows("rm") && state.knows("mkdir")) state.complete("m_marche");
});
