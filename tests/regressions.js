/**
 * Tests de non-régression : chaque bug trouvé à l'audit, rejoué tel quel.
 *    node tests/regressions.js
 */
var fs = require("fs");
var path = require("path");
var nouveauMonde = require("./monde.js").nouveauMonde;

var echecs = 0, verifications = 0;
function verifier(condition, message){
	verifications++;
	if (!condition){ echecs++; console.log("ÉCHEC : " + message); }
}
function contient(texte, morceau, message){
	verifier(texte.indexOf(morceau) > -1, (message || "") + " : « " + morceau + " » attendu, reçu :\n" + texte + "\n");
}

var solution = [];
var dansBloc = false;
fs.readFileSync(path.join(__dirname, "..", "docs", "solution.md"), "utf8").split("\n").forEach(function(ligne){
	if (ligne.indexOf("```") === 0){ dansBloc = !dansBloc; return; }
	if (dansBloc && ligne.trim() !== "") solution.push(ligne);
});
/* Joue la solution jusqu'à la ligne qui contient « repere » (incluse). */
function jouerJusqua(jeu, repere){
	for (var i = 0; i < solution.length; i++){
		jeu.jouerSolution(solution[i]);
		if (solution[i] === repere) return;
	}
	throw new Error("repère introuvable dans la solution : " + repere);
}

// --- Les dialogues qui changent survivent au rechargement ---
var st = {};
var s;
var jeu = nouveauMonde(st, 11);
jouerJusqua(jeu, "touch Rouage");
var avant = jeu.taper("less Artisane");
contient(avant, "cp OBJET COPIE", "l'Artisane demande des copies");
var recharge = nouveauMonde(st);
contient(recharge.taper("less Artisane"), "cp OBJET COPIE", "après rechargement, l'Artisane demande toujours des copies");

// --- Rouage recréé vide : la quête reste possible ---
var j2 = nouveauMonde({}, 12);
jouerJusqua(j2, "touch Rouage");
j2.taper("less Artisane");
j2.taper("rm Rouage");
contient(j2.taper("touch Rouage"), "trois coups de lime", "l'Artisane façonne le nouveau Rouage");
verifier(j2.lire("ArtisanShop.getItemFromName('Rouage').getText()") !== "", "le nouveau Rouage n'est pas vide");
["rouage1", "rouage2", "rouage3", "rouage4", "rouage5"].forEach(function(n){ j2.taper("cp Rouage " + n); });
verifier(j2.lire("state.quests.s_rouages") === true, "les rouages sont acceptés");
// Une série de copies creuses, effacée puis refaite : l'Artisane redit ce qui ne va pas, puis accepte.
var j3 = nouveauMonde({}, 13);
jouerJusqua(j3, "touch Rouage");
j3.taper("less Artisane");
j3.lire("ArtisanShop.getItemFromName('Rouage').cmd_text.less = ''");
["rouage1", "rouage2", "rouage3", "rouage4", "rouage5"].forEach(function(n){ j3.taper("touch " + n); });
verifier(j3.lire("state.has('rouagesVides')"), "l'Artisane refuse des rouages creux");
j3.taper("rm rouage*");
verifier(!j3.lire("state.has('rouagesVides')"), "le ménage fait, elle pourra redire ce qui ne va pas");
["rouage1", "rouage2", "rouage3", "rouage4", "rouage5"].forEach(function(n){ j3.taper("cp Rouage " + n); });
verifier(j3.lire("state.quests.s_rouages") === true, "le Rouage vide a été façonné, les copies sont acceptées");

// --- chapitre 2 qui échoue : la partie est remise comme avant ---
var st4 = {};
var j4 = nouveauMonde(st4, 14);
jouerJusqua(j4, "cd Portail/PlaceDuVillage");
j4.taper("less Marche/SortAlias");
j4.taper("alias cd='ls'");
// Un passage qui ne peut pas aboutir (le chemin rejoué est remplacé par un chemin qui ne mène nulle part).
j4.lire("CHEMIN_CHAPITRE_1 = ['cd ~/ForetOuest', 'ls']");
var xpAvant = j4.lire("state.xp");
contient(j4.taper("chapitre 2", "oui"), "quand tu auras battu le Sorcier Noir", "la mission cyber ne se choisit plus en cours de chapitre 1");
// Même forcé, un passage qui échoue remet la partie comme avant.
j4.lire("commencerChapitre2()");
var j4bis = nouveauMonde(st4);
verifier(!j4bis.lire("state.has('chapitre1Saute')"), "le chapitre 1 n'est pas marqué sauté après un échec");
verifier(j4bis.lire("state.xp") === xpAvant, "l'XP est celle d'avant le passage raté");
verifier(j4bis.lire("state.quests.m_boss") !== true, "aucune quête n'est cochée par le passage raté");
verifier(j4bis.lire("state.alias.cd") === "ls", "les alias du joueur sont conservés");
// Avec des alias gênants sur une partie neuve, le passage réussit quand même.
var j5 = nouveauMonde({}, 15);
j5.lire("state.alias.echo = 'ls'; state.alias.cd = 'pwd'");
contient(j5.taper("chapitre 2", "oui"), "CHAPITRE 2", "les alias ne détournent pas le passage au chapitre 2");
verifier(j5.lire("state.alias.echo") === "ls", "les alias sont rendus après le passage");

// --- Les lieux du chapitre 2 n'apparaissent qu'à l'ouverture de la Crypte, même avec une ancienne sauvegarde ---
var j6 = nouveauMonde({}, 16);
verifier(j6.taper("ls ~/Cybersup/SalleServeurs").indexOf("BoiteDeDepot") === -1, "pas de BoiteDeDepot au chapitre 1");
var st7 = {};
var j7 = nouveauMonde(st7, 17);
j7.taper("chapitre 2", "oui");
j7.taper("ssh citadelle");
j7.lire("SalleServeurs.children = SalleServeurs.children.filter(function(l){ return l !== BoiteDeDepot && l !== Coffre; }); state.save()");
var j7bis = nouveauMonde(st7);
var ls7 = j7bis.taper("ls ~/Cybersup/SalleServeurs");
contient(ls7, "BoiteDeDepot", "une ancienne sauvegarde retrouve la BoiteDeDepot");
contient(ls7, "Coffre", "une ancienne sauvegarde retrouve le Coffre");

// --- Chapitre 2 joué jusqu'au Caveau ---
function jusquAuCaveau(graine){
	var j = nouveauMonde({}, graine);
	j.taper("chapitre 2", "oui");
	j.taper("ssh citadelle");
	["cd Crypte", "less Archiviste", "cd bin", "sha256sum -c SHA256SUMS", "grep charge= gardien | cut -d= -f2 | base64 -d", "cd ../Caveau", "less Inscription"]
		.forEach(function(c){ j.taper(c); });
	return j;
}

// --- Verrous du chapitre 2 : la porte n'apparaît qu'après l'intégrité et le message ---
var jv = nouveauMonde({}, 25);
jv.taper("chapitre 2", "oui");
jv.taper("ssh citadelle");
jv.taper("cd Crypte"); jv.taper("less Archiviste"); jv.taper("cd Caveau");
verifier(jv.taper("ls -a").indexOf(".porte") === -1, "pas de porte avant d'avoir décodé le message");
jv.taper("cd ../bin");
jv.taper("grep charge= gardien | cut -d= -f2 | base64 -d");
verifier(!jv.lire("Caveau.hasItem(PorteDerobee)"), "décoder sans vérifier les empreintes ne suffit pas");
contient(jv.taper("sha256sum -c SHA256SUMS"), "gardien: ÉCHEC", "vérification des empreintes");
verifier(jv.lire("Caveau.hasItem(PorteDerobee)"), "la porte apparaît une fois les deux étapes faites");
var jr = nouveauMonde({}, 26);
jr.taper("chapitre 2", "oui");
jr.taper("ssh citadelle");
jr.taper("cd Crypte");
contient(jr.taper("quetes"), "détail : quetes 1", "le journal replie le chapitre 1 pendant la Crypte");
contient(jr.taper("quetes 1"), "Apprendre un premier sort", "quetes 1 déplie le chapitre 1");
contient(jr.taper("xp"), "à côté de lieux connus", "xp signale les lieux voisins pas encore visités");

// --- Retirer le SUID avant de franchir la porte ne bloque plus la Racine ---
var j8 = jusquAuCaveau(18);
var s8 = j8.taper("sudo chmod u-s .porte");
contient(s8, "escalier de service", "l'archiviste ouvre l'escalier de service");
verifier(j8.lire("state.quests.c_suid") === true, "la porte est considérée comme trouvée");
contient(j8.taper("cd Racine"), "Entrer dans la Racine", "la Racine reste accessible");
var j9 = jusquAuCaveau(19);
j9.taper("sudo chmod 755 .porte");
contient(j9.taper("cd Racine"), "Racine", "chmod 755 avant le find ne bloque pas non plus");
var j10 = jusquAuCaveau(20);
contient(j10.taper("./.porte"), "Prouve que tu sais", "la porte exige d'avoir été trouvée avec find");
j10.taper("find . -perm -4000 2>/dev/null");
var s10 = j10.taper("./.porte");
verifier((s10.match(/escalier/g) || []).length === 1, "l'escalier n'est annoncé qu'une fois");

// --- Refaire sa clé après l'installation ---
var st11 = {};
var j11 = nouveauMonde(st11, 21);
j11.taper("chapitre 2", "oui");
j11.taper("ssh citadelle");
j11.lire("state.applyState('ecouteCoupee'); state.set('ecouteCoupee'); AuthorizedKeys.cmd_text.less = CLE_LAURENT + '\\n'; verifierMonde();");
j11.taper("cd ~/Cybersup/SalleServeurs");
j11.taper("less ConsignesDuCoffre");
j11.taper("ssh-keygen", ["", ""]);
j11.taper("cp ~/.ssh/id_ed25519.pub BoiteDeDepot");
verifier(j11.lire("state.has('cleInstallee')"), "première clé installée");
verifier(j11.lire("BoiteDeDepot.items.length") === 0, "Evi vide la boîte après installation");
j11.taper("ssh-keygen", ["y", "", ""]);
contient(j11.taper("ssh coffre"), "plus celle que tu as déposée", "une clé refaite n'ouvre pas le coffre tant qu'elle n'est pas déposée");
contient(j11.taper("cp ~/.ssh/id_ed25519.pub BoiteDeDepot"), "Je remplace l'ancienne", "Evi remplace la clé");
contient(j11.taper("ssh coffre"), "Bienvenue sur coffre", "la nouvelle clé ouvre le coffre");
j11.taper("exit");
j11.taper("rm ~/.ssh/id_ed25519");
contient(j11.taper("ssh coffre"), "Permission denied", "sans clé privée, plus d'accès");
j11.taper("ssh-keygen", ["", ""]);
j11.taper("cp ~/.ssh/id_ed25519.pub BoiteDeDepot");
contient(j11.taper("ssh coffre"), "Bienvenue sur coffre", "une clé refaite après suppression ouvre le coffre");
j11.taper("exit");
var j11bis = nouveauMonde(st11);
contient(j11bis.taper("ssh coffre"), "Bienvenue sur coffre", "la clé remplacée tient après rechargement");
// Clé privée déposée puis publique grillée, puis nouvelle paire : la boîte ne bloque plus le dépôt.
var j12 = nouveauMonde({}, 22);
j12.taper("chapitre 2", "oui");
j12.taper("ssh citadelle");
j12.lire("state.set('ecouteCoupee'); AuthorizedKeys.cmd_text.less = CLE_LAURENT + '\\n'; verifierMonde();");
j12.taper("cd ~/Cybersup/SalleServeurs");
j12.taper("less ConsignesDuCoffre");
j12.taper("ssh-keygen", ["", ""]);
contient(j12.taper("cp ~/.ssh/id_ed25519 BoiteDeDepot"), "PRIVÉE", "clé privée détruite");
contient(j12.taper("cp ~/.ssh/id_ed25519.pub BoiteDeDepot"), "grillée", "clé publique grillée refusée");
j12.taper("ssh-keygen", ["y", "", ""]);
contient(j12.taper("cp ~/.ssh/id_ed25519.pub BoiteDeDepot"), "Obtenir un accès au coffre", "la nouvelle paire est acceptée sans avoir à vider la boîte");

// --- Fautes de débutant et sorts inconnus ---
var jf = nouveauMonde({}, 27);
contient(jf.taper("cd.."), "Il manque une espace", "cd..");
contient(jf.taper("ls-l"), "ls -l", "ls-l");
contient(jf.taper("cd ForêtOuest"), "sans accents", "accents");
jf.lire("state.spells.echo = true");
contient(jf.taper("echo Le Sorcier s'appelle Laurent"), "guillemets doubles", "l'apostrophe est expliquée");
contient(jf.taper("head Convocation"), "Scriptorium", "un sort inconnu dit où l'apprendre");
contient(jf.taper("cp a b"), "Artisane", "cp s'apprend auprès de l'Artisane");
contient(jf.taper("sha256sum x"), "chapitre 2", "les sorts du chapitre 2 renvoient au chapitre 2");
// Indices qui regardent la partie
jf.lire("state.spells.alias = true; state.alias.ls = 'pwd'");
contient(jf.taper("indice", "non"), "unalias ls", "indice repère un alias qui masque un sort");
var jd = nouveauMonde({}, 28);
jd.lire("['m_mv','m_rocher','m_tunnel','m_portail','m_marche','m_pont','m_ronces','m_trolls','m_mdp','m_certificat'].forEach(function(q){ state.quests[q] = true; })");
s = jd.taper("indice", "oui");
contient(s, "Il te manque le sort ps", "le palier payant signale un sort inconnu");
contient(s, "Formateur", "et dit qui l'enseigne");

// --- Comportements Linux exacts : fins de ligne, redirections, SUID ---
var jl = nouveauMonde({}, 29);
jl.lire("tousLesSorts().forEach(function(x){ state.spells[x] = true; })");
contient(jl.taper("echo Bonjour | sha256sum"), "8dc2a6966f1be1644ec6b1f7223f47e53de5ad05e1c976736d948e7977a13dd3", "sha256sum de echo Bonjour, comme sous Linux");
contient(jl.taper("echo -n Bonjour | sha256sum"), "9172e8eec99f144f72eca9a568759580edadb2cfd154857f07e657569493bc44", "echo -n n'ajoute pas de retour à la ligne");
jl.taper("echo Bonjour > f");
verifier(jl.taper("sha256sum f").split(" ")[0] === jl.taper("cat f | sha256sum").split(" ")[0], "sha256sum f et cat f | sha256sum concordent");
contient(jl.taper("base64 f"), "Qm9uam91cgo=", "base64 d'un objet");
contient(jl.taper("cat f | base64"), "Qm9uam91cgo=", "base64 par un tuyau");
contient(jl.taper("echo -n Bonjour | base64"), "Qm9uam91cg==", "base64 de echo -n");
jl.taper("echo -n Bonjour > g");
contient(jl.taper("base64 g"), "Qm9uam91cg==", "echo -n > objet garde l'absence de retour à la ligne");
jl.taper("echo salut 1> h");
verifier(jl.taper("cat h").indexOf("salut") === 0 && jl.taper("cat h").indexOf("1") === -1, "1> redirige la sortie normale");
s = jl.taper("ls Nexiste 2>&1 > k");
contient(s, "aucun lieu", "2>&1 > k : les erreurs restent à l'écran (ordre de bash)");
verifier(jl.taper("cat k").indexOf("aucun lieu") === -1, "2>&1 > k : k est vide");
jl.taper("ls Nexiste > k2 2>&1");
contient(jl.taper("cat k2"), "aucun lieu", "> k2 2>&1 : tout va dans k2");
jl.taper("echo x &> l");
contient(jl.taper("cat l"), "x", "&> redirige les deux sorties");
verifier(jl.taper("echo vers erreurs >&2 2>/dev/null").indexOf("vers erreurs") > -1, ">&2 puis 2>/dev/null : l'ordre compte");
verifier(jl.lire("current_room.getNode('&2')") === null, ">&2 ne crée pas d'objet nommé &2");
var jb = nouveauMonde({}, 30);
jb.taper("chapitre 2", "oui");
jb.taper("ssh citadelle");
["cd Crypte", "less Archiviste", "cd bin", "sha256sum -c SHA256SUMS", "grep charge= gardien | cut -d= -f2 | base64 -d"].forEach(function(c){ jb.taper(c); });
contient(jb.taper("cat passwd"), "ELF", "passwd est un binaire, pas un script");
contient(jb.taper("bash passwd"), "binaire", "bash ne lance pas un binaire");
jb.taper("cd ../Caveau");
jb.taper("find . -perm -4000 2>/dev/null");
contient(jb.taper("./.porte"), "La porte pivote", "la porte dérobée est un binaire SUID qui s'exécute");
jb.taper("cd Racine");
jb.taper("less ../../Radio");
var vrai = jb.lire("Racine.procs.filter(function(p){ return p.noyau; })[0].pid");
contient(jb.taper("sudo kill -9 " + vrai), "thread du noyau", "un vrai kworker ignore les signaux");
verifier(jb.lire("Racine.procs.length") === 7, "le vrai kworker est toujours là");
contient(jb.taper("ps"), "[kworker/", "ps affiche les threads du noyau entre crochets");

// --- La mission cyber raconte l'histoire du renfort ---
var j13 = nouveauMonde({}, 23);
contient(j13.taper("chapitre"), "mission cyber", "chapitre propose la mission cyber en début de partie");
var s13 = j13.taper("chapitre 2", "oui");
contient(s13, "MISSION CYBER", "le récit de la mission cyber");
contient(s13, "renfort", "le joueur arrive en renfort");
verifier(j13.lire("current_room") === j13.lire("WarRoom"), "le renfort commence dans la WarRoom");
contient(j13.taper("less CheffeDeQuart"), "ssh citadelle", "Grace fait le briefing et envoie à la Citadelle");
contient(j13.taper("cat ~/OrdreDeMission"), "ORDRE DE MISSION", "l'ordre de mission est dans la Maison");
contient(j13.taper("ssh citadelle"), "Bienvenue sur citadelle", "le renfort monte à la Citadelle par ssh");
contient(j13.taper("less Laurent"), "le renfort", "Laurent accueille le renfort");
verifier(j13.taper("less Laurent").indexOf("tout cela, c'était ton examen") === -1, "Laurent ne dit pas au renfort qu'il l'a battu");
contient(j13.taper("cat ~/Cybersup/TableauAffichage"), "Félicitations à la promo", "le tableau félicite la promo, pas le renfort");
contient(j13.taper("chapitre 1"), "renfort", "le chapitre 1 est raconté comme passé par d'autres");
var st14 = {};
var j14 = nouveauMonde(st14, 24);
j14.taper("chapitre 2", "oui");
j14.taper("ssh citadelle");
contient(nouveauMonde(st14).taper("less Laurent"), "le renfort", "le texte du renfort survit au rechargement");

console.log(verifications + " vérifications, " + echecs + " échec" + (echecs > 1 ? "s" : ""));
process.exit(echecs ? 1 : 0);
