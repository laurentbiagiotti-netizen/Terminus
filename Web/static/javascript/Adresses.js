/**
 * Adresses.js : le plan des adresses, au bâtiment B (chapitre 2, la panne).
 *
 * Une adresse IP se lit comme une adresse postale : la rue (le réseau), puis le numéro de la
 * maison (la machine). Le masque dit où s'arrête le nom de la rue. Nour, la cartographe,
 * l'explique en images (PlanDesAdresses, Quartiers), puis pose cinq colles : on répond avec echo.
 *
 * Chargé après Annexe.js : il ajoute cinq quêtes secondaires au chapitre de la panne.
 */

/* Les couleurs du plan : la rue en vert, la maison en jaune. */
function rue(t){ return C.vert(t); }
function num(t){ return C.jaune(t); }

var PlanDesAdresses = new Item("PlanDesAdresses",
	C.gras("LE PLAN DES ADRESSES (Nour, au tableau blanc)") + "\n\n" +
	"Dans notre monde, une adresse postale s'écrit en quatre nombres : c'est l'adresse IP.\n" +
	"D'abord la RUE, puis le NUMÉRO de la maison.\n\n" +
	"        " + rue("10.0.93") + " . " + num("20") + "\n" +
	"        " + rue("└─rue─┘") + "   " + num("└┘ maison") + "\n\n" +
	"Le MASQUE dit où s'arrête le nom de la rue. Il s'écrit de deux façons :\n" +
	"  " + rue("/24") + "              les 24 premiers bits (sur 32) nomment la rue\n" +
	"  " + rue("255.255.255") + "." + num("0") + "    pareil en quatre nombres : 255 = rue, 0 = maison\n\n" +
	"La rue " + rue("10.0.93") + ", vue d'en haut :\n\n" +
	"   " + C.gris("[panneau]") + "  " + num("[.1] [.2] ... [.20] ... [.253]") + "  " + C.gris("[Poste]") + "  " + C.gris("[crieur]") + "\n" +
	"     " + rue(".0") + "             " + num("les maisons : .1 à .253") + "         " + rue(".254") + "    " + rue(".255") + "\n\n" +
	"  " + rue(".0") + "    le panneau de la rue : l'adresse DU RÉSEAU. Personne n'y habite.\n" +
	"  " + rue(".255") + "  le crieur public : l'adresse de DIFFUSION. Ce qu'on lui dit, toute la rue l'entend.\n" +
	"  " + rue(".254") + "  ici, le Bureau de Poste : la PASSERELLE, la seule porte vers les autres rues.\n" +
	"  De .1 à .254 : les machines (le Bureau de Poste en est une). 256 - 2 = 254 adresses utilisables.\n\n" +
	"Deux règles, et tout le réseau s'explique :\n" +
	"  " + C.gras("Même rue") + "   on frappe directement à la porte du voisin (ip neigh connaît son adresse MAC).\n" +
	"  " + C.gras("Autre rue") + "  on confie la lettre au Bureau de Poste, qui sait où aller (ip r : default via).\n\n" +
	"La suite, quand une rue est trop grande : cat Quartiers.",
	"item_plan_rue.gif");

var Quartiers = new Item("Quartiers",
	C.gras("LES QUARTIERS : COUPER UNE RUE EN MORCEAUX") + "\n\n" +
	"Une rue /24, c'est 256 adresses. Trop pour une petite cafétéria : on la coupe en quartiers.\n" +
	"Chaque bit qu'on ajoute au nom de la rue coupe les maisons en deux.\n\n" +
	"  rue    binaire   le masque         adresses  maisons\n" +
	"  /24    " + rue("") + num("00000000") + "  255.255.255.0          256      254\n" +
	"  /25    " + rue("1") + num("0000000") + "  255.255.255.128        128      126\n" +
	"  /26    " + rue("11") + num("000000") + "  255.255.255.192         64       62\n" +
	"  /27    " + rue("111") + num("00000") + "  255.255.255.224         32       30\n" +
	"  /30    " + rue("111111") + num("00") + "  255.255.255.252          4        2\n" +
	"\n(les trois premiers nombres sont toujours 255 : la rue entière, 11111111 en binaire)\n" +
	"Les 1, en vert : la rue. Les 0, en jaune : les numéros de maison.\n" +
	"Le compte : 2 puissance (32 - le préfixe) adresses, moins 2 (le panneau et le crieur).\n" +
	"  /26 : 32 - 26 = 6 bits de maison, 2 x 2 x 2 x 2 x 2 x 2 = 64 adresses, donc 62 maisons.\n" +
	"  Le masque en quatre nombres : le dernier garde 2 bits de rue, 128 + 64 = 192.\n\n" +
	"La rue 10.0.94.0/24, coupée en quatre quartiers de /26 :\n\n" +
	"   " + C.etiquette(" .0 à .63 ") + "     " + C.etiquette(" .64 à .127 ") + "\n" +
	"   " + C.gris("l'Annexe") + "\n" +
	"   " + C.etiquette(" .128 à .191 ") + "  " + C.etiquette(" .192 à .255 ") + "\n\n" +
	"Pour trouver le quartier d'une adresse : le multiple de 64 juste en dessous.\n" +
	"  10.0.94." + num("37") + "  est dans le quartier " + rue("10.0.94.0") + "   (0 <= 37 < 64)\n" +
	"  10.0.94." + num("150") + " est dans le quartier " + rue("10.0.94.128") + " (128 <= 150 < 192)\n\n" +
	"À l'Annexe, le sort ipcalc fera ces calculs pour toi. Mais un bon facteur les fait d'abord de tête.",
	"item_quartiers.gif");

/* Les cinq colles de Nour : l'identifiant de la quête, la question, la bonne réponse, et l'aide en cas d'erreur. */
var COLLES_DE_NOUR = [
	{ id: "s_r_rue", question: "La rue de 10.0.93.20/24 ? (l'adresse du réseau)", reponse: "10.0.93.0",
	  forme: /^10\.0\.93\.\d+$/, aide: "« Une rue se nomme par son tout premier numéro, le panneau. Regarde le PlanDesAdresses. »" },
	{ id: "s_r_crieur", question: "Le crieur de cette rue ? (l'adresse de diffusion)", reponse: "10.0.93.255",
	  forme: /^10\.0\.93\.\d+$/, aide: "« Le crieur habite tout au bout de la rue, au dernier numéro possible. »" },
	{ id: "s_r_maisons", question: "Combien de maisons dans un /26 ? (les adresses utilisables)", reponse: "62",
	  forme: /^\d+$/, aide: "« Un /26 laisse 32 - 26 = 6 bits aux maisons : 64 adresses. Enlève le panneau et le crieur. »" },
	{ id: "s_r_masque", question: "Le masque d'un /26, en quatre nombres ?", reponse: "255.255.255.192",
	  forme: /^255\.\d+\.\d+\.\d+$/, aide: "« Les trois premiers nombres sont pleins : 255. Le dernier garde 2 bits de rue : 128 + 64. »" },
	{ id: "s_r_quartier", question: "Le quartier de 10.0.94.70/26 ? (l'adresse de son réseau)", reponse: "10.0.94.64",
	  forme: /^10\.0\.94\.\d+$/, aide: "« Les quartiers d'un /26 commencent à .0, .64, .128 et .192. 70 tombe dans lequel ? »" }
];

function texteDeNour(){
	var faites = COLLES_DE_NOUR.filter(function(c){ return state.quests[c.id]; }).length;
	if (faites === COLLES_DE_NOUR.length){
		return "Nour range ses feutres. « Cinq sur cinq. Tu lis une adresse comme une carte, maintenant : la rue, la maison, le Bureau de Poste.\n" +
			"Garde le PlanDesAdresses en tête. À l'Annexe, on coupe vraiment une rue en quartiers, et un stagiaire s'est trompé de quartier. »";
	}
	var lignes = COLLES_DE_NOUR.map(function(c, i){
		return "  " + (state.quests[c.id] ? C.vert("[x]") : "[ ]") + " " + (i + 1) + ". " + c.question;
	});
	return "« Nour, B3 réseau. Pendant que Radia répare, moi je dessine le plan. Une adresse IP, c'est une adresse postale.\n" +
		"Lis le PlanDesAdresses, puis les Quartiers. Avec ça, tu lis n'importe quelle adresse.\n\n" +
		"Ensuite, mes cinq colles. Réponds-moi à voix haute, ici : echo TA_REPONSE\n\n" +
		lignes.join("\n") + "\n\n" +
		"Une erreur ne coûte rien : je te dirai où regarder. »";
}

var Cartographe = new Item("Cartographe", "", "item_cartographe.gif").personnage()
	.revele("s_r_rue", "s_r_crieur", "s_r_maisons", "s_r_masque", "s_r_quartier");
/* Le texte de Nour suit tes réponses : on le recalcule à chaque lecture. */
Object.defineProperty(Cartographe.cmd_text, "less", { get: texteDeNour, set: function(){}, enumerable: true, configurable: true });
BatimentB.addItem(Cartographe);
BatimentB.addItem(PlanDesAdresses);
BatimentB.addItem(Quartiers);

QUETES_SECONDAIRES_PANNE.push(
	{ id: "s_r_rue", titre: "Nommer la rue (le réseau) de 10.0.93.20/24" },
	{ id: "s_r_crieur", titre: "Trouver le crieur (la diffusion) de la rue 10.0.93.0/24" },
	{ id: "s_r_maisons", titre: "Compter les maisons d'un /26" },
	{ id: "s_r_masque", titre: "Écrire le masque d'un /26 en quatre nombres" },
	{ id: "s_r_quartier", titre: "Trouver le quartier de 10.0.94.70/26" }
);

/* echo, dans le bâtiment B : Nour corrige. */
GameEvents.addListener("echo", function(e){
	if (e.room !== BatimentB || !state.has("panneOuverte")) return;
	var dit = String(e.text || "").trim();
	if (!dit) return;
	var ouvertes = COLLES_DE_NOUR.filter(function(c){ return state.seen[c.id] && !state.quests[c.id]; });
	if (!ouvertes.length) return;
	var juste = ouvertes.filter(function(c){ return dit === c.reponse; })[0];
	if (juste){
		say("Nour coche sa feuille. « " + dit + ". Exact. »");
		quetePanne(juste.id);
		if (COLLES_DE_NOUR.every(function(c){ return state.quests[c.id]; })) say(C.gris("(Nour a quelque chose à te dire : cat Cartographe.)"));
		return;
	}
	var visee = ouvertes.filter(function(c){ return c.forme.test(dit); })[0];
	if (visee) say("Nour secoue la tête. " + visee.aide);
});

/* Radia y renvoie, au moment de poser l'adresse du poste. */
TALKIE.r_ip += " Lire une adresse, sa rue et son numéro : Nour, la Cartographe du BatimentB, te l'explique en dessins.";

/* Le monde est complet : les objets créés après ce point (en cours de partie) n'ont plus d'identifiant fixe. */
World.fige = true;
