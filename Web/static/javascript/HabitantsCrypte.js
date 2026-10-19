/**
 * HabitantsCrypte.js : les quêtes annexes du chapitre 3 (la Crypte, numéro interne 2).
 *
 * Six habitants de la Crypte, trois près de l'Archiviste, trois dans le Caveau. Leurs histoires se jouent dans les
 * Catacombes, sous la Crypte, et au beffroi. Les notions, absentes de tous les chapitres (étapes, défis, autres annexes) :
 *   a3_magie      l'Enlumineur   hexdump -C, -n : les nombres magiques (un PNG, un PDF, une archive gzip déguisés en .txt)
 *   a3_passages   le Fossoyeur   readlink, readlink -f, realpath ; le lien dur (ln sans -s, ls -i, ls -li)
 *   a3_veille     le Sonneur     tail -f, tail -F (la rotation d'un journal), grep --line-buffered
 *   a3_sablier    le Sacristain  timeout, ses codes de retour (124, 137), -s KILL et -k
 *   a3_trousseau  le Passeur     ssh-agent (eval), ssh-add, ssh-add -l, ssh-add -D
 *   a3_mots       le Serrurier   pwgen, pwgen -s, openssl rand -base64, openssl passwd -6 (le sel) et -salt
 * Le sablier remplace « l'arbre des ombres » prévu au départ : pstree et ps --forest sont déjà enseignés au chapitre 6.
 * Toutes faites : le badge « Ami de la Crypte ».
 */

World.fige = false;

function axOuverteCh3(){
	return !!(typeof state !== "undefined" && state && state.has && state.has("crypteOuverte") && !(typeof examenEnCours === "function" && examenEnCours()));
}

/* ------------------------------------------------------------------ */
/* Les Catacombes, sous la Crypte                                      */
/* ------------------------------------------------------------------ */

function axLieuCh3(parent, nom, intro, image, mode){
	var l = new Room(nom, intro, image || "loc_darkroom.gif");
	l.chapitre = 2;
	l.horsBareme = true;
	l.owner = "root";
	l.mode = mode || "rwxrwxrwx";
	link_rooms(parent, l);
	return l;
}
var AxCatacombes = axLieuCh3(Crypte, "Catacombes", "Les Catacombes, sous la Crypte : des galeries basses, des niches, une odeur de vieux papier. Les habitants de la Crypte y gardent leurs secrets.", "loc_stair.gif");
var AxGaleries = axLieuCh3(AxCatacombes, "Galeries", "Des galeries qui tournent sur elles-mêmes. Certains passages ne sont que des panneaux qui renvoient ailleurs.", "loc_darkroom.gif");
var AxOssuaire = axLieuCh3(AxCatacombes, "Ossuaire", "L'Ossuaire : des étagères de registres, et un reliquaire au fond.", "loc_library.gif");
var AxClocher = axLieuCh3(AxCatacombes, "Clocher", "Le pied du clocher : le Sonneur y tient le journal de ses rondes.", "loc_stair.gif");

/* ------------------------------------------------------------------ */
/* 1. Le parchemin déguisé (l'Enlumineur)                              */
/* ------------------------------------------------------------------ */

function axOctetsParchemin(entete, corps){ return entete.concat(axOctetsTexte(corps)); }
var AxEnluminure = axFichier(AxCatacombes, "enluminure.txt", "\u0089PNG\r\n\u001a\n\u0000\u0000\u0000\rIHDR\u0000\u0000\u0002\u0080\u0000\u0000\u0001à\b\u0006\u0000\u0000\u0000 (une enluminure : un corbeau doré sur fond d'azur)",
	{ image: "item_manuscript.gif", owner: JOUEUR, octets: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x02, 0x80, 0x00, 0x00, 0x01, 0xe0,
		0x08, 0x06, 0x00, 0x00, 0x00, 0x35, 0xd1, 0xdc, 0xe4, 0x00, 0x00, 0x00, 0x04, 0x73, 0x42, 0x49, 0x54, 0x08, 0x08, 0x08, 0x08, 0x7c, 0x08, 0x64, 0x88] });
AxEnluminure.format = "png";
var AxRegistrePdf = axFichier(AxCatacombes, "copie-du-registre.txt", "%PDF-1.7\n%âãÏÓ\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n(la copie du registre des sépultures, mise en page)",
	{ image: "item_manuscript.gif", owner: JOUEUR, octets: axOctetsParchemin([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37, 0x0a, 0x25, 0xe2, 0xe3, 0xcf, 0xd3, 0x0a], "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n") });
var AxSceauGz = axFichier(AxCatacombes, "sceau.txt", "\u001f\u008b\b\u0000\u0000\u0000\u0000\u0000\u0000\u0003 (une archive compressée : les empreintes des sceaux)",
	{ image: "item_manuscript.gif", owner: JOUEUR, octets: [0x1f, 0x8b, 0x08, 0x08, 0x5a, 0x1c, 0x2f, 0x67, 0x00, 0x03, 0x73, 0x63, 0x65, 0x61, 0x75, 0x78, 0x2e, 0x74, 0x78, 0x74, 0x00, 0x4b, 0xcc, 0x4b, 0x4f,
		0x2d, 0xe2, 0x02, 0x00, 0x91, 0x1a, 0x3a, 0x2e, 0x06, 0x00, 0x00, 0x00] });
function axExtension(item, ext){ return !!item && new RegExp("\\." + ext + "$").test(item.itemname); }
function axParcheminRenomme(item, ext){ return axExtension(item, ext) && axVu("a3_magie", "hex-" + ext); }
var AxEnlumineur = axHabitant(Crypte, "Enlumineur", function(){
	if (aFait("a3_magie")) return "L'Enlumineur range ses parchemins, chacun sous son vrai nom. « Une extension, ça se change d'un mv. Les premiers octets, eux, ne mentent pas. »";
	return "Un vieil homme aux doigts tachés d'or penche une loupe sur un parchemin.\n\n" +
		"« Je suis l'Enlumineur de la Crypte. Le Corbeau est passé par les Catacombes et a rebaptisé mes trois parchemins en .txt : " +
		"enluminure.txt, copie-du-registre.txt et sceau.txt. cat n'en sort que du charabia. Je les veux sous leur vrai nom.\n\n" +
		"On dit que les premiers octets d'un fichier disent ce qu'il est vraiment, quoi qu'en dise son nom : un nombre magique. " +
		"Regarde-les, octet par octet, pour chacun des trois, puis rends à chacun son extension : .png pour une image PNG, .pdf pour un document PDF, .gz pour une archive gzip. " +
		"Je veux que tu les VOIES, ces octets : ne te contente pas de demander à file. »\n\n" +
		C.gris("Les outils, dans Catacombes : hexdump -C FICHIER (ou hexdump -C -n 16 FICHIER) ; mv ANCIEN NOUVEAU. man hexdump donne les nombres magiques.");
}, ["hexdump"]);
declarerAnnexe({ id: "a3_magie", chapitre: 2, titre: "Le parchemin déguisé", habitant: "l'Enlumineur", lieu: "dans la Crypte", item: function(){ return AxEnlumineur; }, ouverte: axOuverteCh3,
	indice: "dans la Crypte, quelqu'un penche une loupe sur un parchemin.",
	resume: "Reconnaître un fichier à ses premiers octets, son nombre magique (hexdump -C), et lui rendre sa vraie extension.",
	etapes: [
		{ titre: "Voir les premiers octets de enluminure.txt (hexdump -C)", fait: function(){ return axVu("a3_magie", "hex-png"); } },
		{ titre: "Lui rendre son vrai nom : une image PNG (.png)", fait: function(){ return axParcheminRenomme(AxEnluminure, "png"); } },
		{ titre: "Les deux autres : un document PDF (.pdf) et une archive gzip (.gz), octets vus", fait: function(){ return axParcheminRenomme(AxRegistrePdf, "pdf") && axParcheminRenomme(AxSceauGz, "gz"); } }
	],
	souvenir: { nom: "Feuille-d-or", texte: "Une feuille d'or, si fine qu'elle tremble quand on respire. Gravé dessus, en tout petit : 89 50 4E 47." },
	lumiere: "la lampe de l'Enlumineur",
	merci: "L'Enlumineur ouvre l'enluminure : un corbeau doré, sur fond d'azur. « Il est revenu à lui. Merci. »"
});
GameEvents.addListener("axHexdump", function(e){
	if (!e.item || e.debut) return;
	var m = axMagique(e.item.octets || []);
	if (!m) return;
	if (e.item === AxEnluminure) axNoter("a3_magie", "hex-png");
	if (e.item === AxRegistrePdf) axNoter("a3_magie", "hex-pdf");
	if (e.item === AxSceauGz) axNoter("a3_magie", "hex-gz");
});

/* ------------------------------------------------------------------ */
/* 2. Les passages secrets (le Fossoyeur)                              */
/* ------------------------------------------------------------------ */

var AxReliquaire = axFichier(AxOssuaire, "reliquaire.txt", "LE RELIQUAIRE DES CATACOMBES\n\nUne mèche de cheveux, une clé rouillée, et une liste : les noms de tous ceux qui ont gardé la Crypte.", { image: "item_manuscript.gif" });
/* Le registre des morts : un seul fichier, deux noms (un lien dur, posé dans deux lieux). */
var AxRegistreMorts = new Item("registre-des-morts", "REGISTRE DES MORTS DE LA CRYPTE\n\n  an 1  Gilles, gardien de la porte\n  an 7  Mathilde, sonneuse\n  an 12 Anselme, fossoyeur", "item_manuscript.gif").droits("rw-r--r--", "root");
AxGaleries.addItem(AxRegistreMorts);
AxOssuaire.addItem(AxRegistreMorts);
var AxTestament = axFichier(AxOssuaire, "testament.txt", "TESTAMENT DU FOSSOYEUR\n\nJe laisse ma pelle à qui saura qu'un fichier n'est pas son nom.", { image: "item_manuscript.gif", owner: JOUEUR });
/* Les passages : trois liens en chaîne, posés quand le Fossoyeur confie sa quête (la Crypte a alors sa place dans le monde). */
function axPoserPassages(){
	var base = AxCatacombes.path();
	function lien(lieu, nom, cible){
		if (lieu.getNode(nom) !== null) return;
		var it = new Item(nom, "", "item_sign.gif");
		it.lien = cible;
		it.owner = "root";
		it.mode = "rwxrwxrwx";
		lieu.addItem(it);
	}
	lien(AxOssuaire, "porte-basse", base + "/Ossuaire/reliquaire.txt");
	lien(AxGaleries, "escalier", base + "/Ossuaire/porte-basse");
	lien(AxCatacombes, "passage-nord", base + "/Galeries/escalier");
}
var AxFossoyeur = axHabitant(Caveau, "Fossoyeur", function(){
	if (aFait("a3_passages")) return "Le Fossoyeur s'appuie sur sa pelle. « Un nom, ce n'est qu'une étiquette sur une boîte. Tu l'as compris : le testament ne craint plus rien. »";
	return "Un homme voûté, une pelle sur l'épaule, montre l'entrée des Catacombes (cd ../Catacombes, depuis le Caveau).\n\n" +
		"« Le Fossoyeur, pour vous servir. Dans les Catacombes, les passages trompent : un panneau en montre un autre, qui en montre un autre. " +
		"Le passage-nord, par exemple : où mène-t-il, tout au bout ? Dis-le-moi sans le parcourir pas à pas. " +
		"Et quel est le vrai chemin de Galeries/../Galeries/escalier, sans ses détours ?\n\n" +
		"Autre chose. Le registre-des-morts est rangé à la fois dans les Galeries et dans l'Ossuaire. Deux copies ? Non : un seul registre, sous deux noms. " +
		"Prouve-le-moi par son numéro d'inode.\n\n" +
		"Enfin, mon testament (Ossuaire/testament.txt). Je veux qu'il survive même si quelqu'un efface son nom : donne-lui un second nom, un lien dur, " +
		"dans les Galeries, puis efface l'ancien nom, dans l'Ossuaire. Il doit rester lisible depuis les Galeries. »\n\n" +
		C.gris("Les outils : readlink LIEN, readlink -f LIEN ; realpath CHEMIN ; ls -i, ls -li ; ln FICHIER DOSSIER (sans -s) ; rm.");
}, ["readlink", "realpath"]);
declarerAnnexe({ id: "a3_passages", chapitre: 2, titre: "Les passages secrets", habitant: "le Fossoyeur", lieu: "dans le Caveau", item: function(){ return AxFossoyeur; }, ouverte: axOuverteCh3,
	indice: "dans le Caveau, un homme voûté porte une pelle.",
	resume: "Suivre une chaîne de liens (readlink -f, realpath), reconnaître un lien dur (ls -i), en fabriquer un (ln sans -s).",
	etapes: [
		{ titre: "Dire où mène le passage-nord, tout au bout (readlink -f)", fait: function(){ return axVu("a3_passages", "readlink"); } },
		{ titre: "Le vrai chemin de Galeries/../Galeries/escalier (realpath)", fait: function(){ return axVu("a3_passages", "realpath"); } },
		{ titre: "Prouver que les deux registres n'en font qu'un (ls -i)", fait: function(){ return axVu("a3_passages", "inode"); } },
		{ titre: "Un lien dur du testament dans les Galeries, puis effacer l'ancien nom (ln, rm)", fait: function(){ return AxGaleries.items.indexOf(AxTestament) > -1 && AxOssuaire.items.indexOf(AxTestament) === -1; } }
	],
	souvenir: { nom: "Pelle-miniature", texte: "Une pelle miniature, en étain. Le Fossoyeur l'a gravée : « un fichier n'est pas son nom »." },
	lumiere: "la lanterne du Fossoyeur, à l'entrée des Catacombes",
	merci: "Le Fossoyeur lit le testament, dans les Galeries. « Ancien nom effacé, et pourtant le voilà. Un inode ne meurt qu'avec son dernier nom. »"
});
GameEvents.addListener("axReadlink", function(e){
	if (!axOuverteCh3()) return;
	if (e.cmd === "readlink" && e.f && /passage-nord$/.test(e.cible) && /\/Ossuaire\/reliquaire\.txt$/.test(e.sortie)) axNoter("a3_passages", "readlink");
	if (e.cmd === "realpath" && /\.\./.test(e.cible) && /escalier$/.test(e.cible) && /\/Ossuaire\/reliquaire\.txt$/.test(e.sortie)) axNoter("a3_passages", "realpath");
});
GameEvents.addListener("axLsI", function(e){
	if (!axOuverteCh3() || !AxRegistreMorts.inode) return;
	var re = new RegExp("\\b" + AxRegistreMorts.inode + " .*registre-des-morts");
	if (re.test(e.sortie) && e.long && / 2 /.test(e.sortie.split("\n").filter(function(l){ return re.test(l); })[0] || "")) axNoter("a3_passages", "inode");
	else if (re.test(e.sortie)){ var s = axEtat("a3_passages"); s.vus["inode-" + e.lieu.room_name] = true; if (s.vus["inode-Galeries"] && s.vus["inode-Ossuaire"]) axNoter("a3_passages", "inode"); }
});

/* ------------------------------------------------------------------ */
/* 3. La veille du gardien (le Sonneur)                                */
/* ------------------------------------------------------------------ */

var AxRonde = axFichier(AxClocher, "ronde.log", "22:00 ronde : la Crypte, rien à signaler\n22:30 ronde : le Caveau, rien à signaler\n23:00 ronde : les Galeries, rien à signaler", { image: "item_manuscript.gif" });
AxRonde.axVivant = "ronde";
function axVeille(){ var s = axEtat("a3_veille"); if (!s.ronde) s.ronde = { n: 0, rotations: 0 }; return s.ronde; }
function axHeureRonde(n){ var m = 23 * 60 + 30 + n * 15; return deuxChiffres(Math.floor(m / 60) % 24) + ":" + deuxChiffres(m % 60); }
AX_JOURNAUX_VIVANTS["ronde"] = function(item, suivi, lieu){
	var v = axVeille(), lignes = [];
	if (!axOuverteCh3()) return { lignes: [] };
	var premiere = !axVu("a3_veille", "suivi");
	if (premiere){
		["le Clocher, rien à signaler", "l'Ossuaire, rien à signaler", "les Catacombes, une chauve-souris"].forEach(function(t){ lignes.push(axHeureRonde(v.n++) + " ronde : " + t); });
		item.setText(item.getText().replace(/\n$/, "") + "\n" + lignes.join("\n"));
		axNoter("a3_veille", "suivi");
		return { lignes: lignes };
	}
	// Le Sonneur fait tourner son journal à chaque ronde : l'ancien devient ronde.log.1, un nouveau commence.
	var ancien = lieu.getItemFromName("ronde.log.1");
	if (ancien !== -1) lieu.removeItem(ancien);
	item.itemname = "ronde.log.1";
	v.rotations++;
	var nouvelles = [axHeureRonde(v.n++) + " ronde : le Clocher, le journal tourne", axHeureRonde(v.n++) + " ALERTE : la grille du Caveau s'est ouverte toute seule", axHeureRonde(v.n++) + " ronde : le Caveau, une silhouette s'enfuit"];
	var neuf = new Item("ronde.log", nouvelles.join("\n"), "item_manuscript.gif").droits("rw-r--r--", "root");
	neuf.axVivant = "ronde";
	lieu.addItem(neuf);
	if (suivi === "F") axNoter("a3_veille", "rotationF");
	return { lignes: suivi === "F" ? nouvelles : [], rotation: true };
};
if (typeof PROPRIETES_SAUVEGARDEES !== "undefined" && PROPRIETES_SAUVEGARDEES.indexOf("axVivant") === -1) PROPRIETES_SAUVEGARDEES.push("axVivant");
function axAlertesNotees(){
	var t = axTexteMaison("alertes.txt");
	if (!t) return false;
	var l = lignesDe(t).filter(function(x){ return x.trim() !== ""; });
	return l.length > 0 && l.every(function(x){ return x.indexOf("ALERTE") > -1; });
}
var AxSonneur = axHabitant(Caveau, "Sonneur", function(){
	if (aFait("a3_veille")) return "Le Sonneur tire doucement sa corde. « Le journal tourne, et ma veille ne perd plus le fil. Les alertes tombent toutes seules dans ton fichier. »";
	return "Un homme aux bras noueux, une corde de cloche à la main, bâille à s'en décrocher la mâchoire.\n\n" +
		"« Je suis le Sonneur. Toute la nuit, je note mes rondes dans le journal du Clocher (Catacombes/Clocher/ronde.log). " +
		"Il faudrait quelqu'un pour le regarder grandir, en direct, ligne après ligne, pendant que je dors.\n\n" +
		"Mais attention : à chaque ronde, je fais tourner mon journal. L'ancien devient ronde.log.1 et un ronde.log tout neuf commence. " +
		"Celui qui suit le vieux fichier ne voit plus rien venir ; il faut suivre le NOM du journal, pas le fichier. " +
		"Et je ne veux que les alertes : qu'elles tombent toutes seules dans ~/alertes.txt, dans ta Maison, au fil de l'eau, et rien d'autre. »\n\n" +
		C.gris("Les outils : tail -f ronde.log ; tail -F ronde.log (le nom, rotation comprise) ; tail -F ronde.log | grep --line-buffered ALERTE > ~/alertes.txt. ls -l, pour voir la rotation.");
}, []);
declarerAnnexe({ id: "a3_veille", chapitre: 2, titre: "La veille du gardien", habitant: "le Sonneur", lieu: "dans le Caveau", item: function(){ return AxSonneur; }, ouverte: axOuverteCh3,
	indice: "dans le Caveau, quelqu'un bâille, une corde de cloche à la main.",
	resume: "Suivre un journal qui grandit (tail -f), qui tourne (tail -F), et n'en garder que les alertes (grep --line-buffered).",
	etapes: [
		{ titre: "Regarder le journal des rondes grandir (tail -f)", fait: function(){ return axVu("a3_veille", "suivi"); } },
		{ titre: "Ne pas perdre le fil quand le journal tourne (tail -F)", fait: function(){ return axVu("a3_veille", "rotationF"); } },
		{ titre: "Les seules alertes, au fil de l'eau, dans ~/alertes.txt (grep --line-buffered)", fait: function(){ return axAlertesNotees(); } }
	],
	souvenir: { nom: "Battant-de-cloche", texte: "Un petit battant de cloche, en bronze. Le Sonneur dit qu'il sonne tout seul quand une grille s'ouvre." },
	lumiere: "le fanal du clocher",
	merci: "Le Sonneur sonne trois coups légers. « Dormir en sachant qu'on veille sur toi : voilà ce qu'un bon tail -F apporte. »"
});

/* ------------------------------------------------------------------ */
/* 4. Le sablier des ombres (le Sacristain)                            */
/* ------------------------------------------------------------------ */

var AxOmbreErrante = axFichier(AxCatacombes, "ombre-errante", "#!/bin/bash\n# Une ombre qui erre dans les Catacombes, sans jamais s'arrêter.\nwhile true; do echo \"l'ombre erre...\"; sleep 1; done",
	{ image: "item_manuscript.gif", mode: "rwxr-xr-x" });
AxOmbreErrante.axSansFin = { tetu: false, lignes: ["l'ombre erre...", "l'ombre erre dans les Galeries...", "l'ombre erre près de l'Ossuaire...", "l'ombre erre au pied du Clocher..."] };
var AxOmbreTetue = axFichier(AxCatacombes, "ombre-tetue", "#!/bin/bash\n# Une ombre têtue : elle ignore qu'on lui demande poliment de partir.\ntrap '' TERM\nwhile true; do echo \"l'ombre ne veut pas partir\"; sleep 1; done",
	{ image: "item_manuscript.gif", mode: "rwxr-xr-x" });
AxOmbreTetue.axSansFin = { tetu: true, lignes: ["l'ombre ne veut pas partir", "l'ombre se cramponne", "l'ombre fait la sourde oreille", "l'ombre ricane"] };
function axCodesNotes(){
	var t = axTexteMaison("sablier.txt") || "";
	return /(^|[^0-9])124([^0-9]|$)/.test(t) && /(^|[^0-9])137([^0-9]|$)/.test(t);
}
var AxSacristain = axHabitant(Caveau, "Sacristain", function(){
	if (aFait("a3_sablier")) return "Le Sacristain retourne son sablier. « 124 : le temps est écoulé. 137 : on a dû frapper fort. Les ombres ne s'éternisent plus. »";
	return "Un homme maigre en soutane noire retourne sans cesse un sablier vide.\n\n" +
		"« Je suis le Sacristain. Deux ombres hantent les Catacombes : deux programmes qui ne s'arrêtent jamais d'eux-mêmes (Catacombes/ombre-errante et Catacombes/ombre-tetue). " +
		"Lance-les, et tu devras les interrompre toi-même. Je veux qu'on leur donne une durée, comme à une bougie : au bout de quelques secondes, qu'on les arrête.\n\n" +
		"L'ombre errante obéit au premier signal qu'on lui envoie. L'ombre têtue, elle, ignore SIGTERM, le « s'il te plaît, arrête-toi » des signaux : " +
		"il faudra prévoir plus fort. Et chaque fois, regarde le code de retour, juste après : il dit comment ça s'est fini. " +
		"Note les deux codes dans ~/sablier.txt. »\n\n" +
		C.gris("Les outils : timeout 5 ./ombre-errante ; echo $? ; timeout -s KILL 5 ./ombre-tetue (ou timeout -k 2 5 ...) ; echo ... >> ~/sablier.txt.");
}, ["timeout"]);
declarerAnnexe({ id: "a3_sablier", chapitre: 2, titre: "Le sablier des ombres", habitant: "le Sacristain", lieu: "dans le Caveau", item: function(){ return AxSacristain; }, ouverte: axOuverteCh3,
	indice: "dans le Caveau, quelqu'un retourne un sablier vide.",
	resume: "Donner une durée maximale à un programme (timeout), lire son code de retour, et venir à bout d'un programme qui ignore SIGTERM.",
	etapes: [
		{ titre: "Arrêter l'ombre errante au bout de quelques secondes (timeout)", fait: function(){ return axVu("a3_sablier", "errante"); } },
		{ titre: "Venir à bout de l'ombre têtue, qui ignore SIGTERM (timeout -s KILL, ou -k)", fait: function(){ return axVu("a3_sablier", "tetue"); } },
		{ titre: "Noter les deux codes de retour dans ~/sablier.txt (echo $?)", fait: function(){ return axCodesNotes(); } }
	],
	souvenir: { nom: "Sablier-de-poche", texte: "Un sablier de poche, cinq secondes de sable fin. « timeout 5 », a gravé le Sacristain sur le pied." },
	lumiere: "le cierge du Sacristain",
	merci: "Le Sacristain pose son sablier, enfin plein. « Qu'une ombre ait une fin, c'est tout ce que je demandais. »"
});
GameEvents.addListener("axTimeout", function(e){
	if (!axOuverteCh3() || !e.cible) return;
	if (e.cible === AxOmbreErrante && e.code === 124) axNoter("a3_sablier", "errante");
	if (e.cible === AxOmbreTetue && e.code === 137) axNoter("a3_sablier", "tetue");
});

/* ------------------------------------------------------------------ */
/* 5. Le trousseau qui se souvient (le Passeur)                        */
/* ------------------------------------------------------------------ */

var AX_PHRASE_PASSEUR = "trois cloches sous la lune";
var AX_CLE_PASSEUR = axDeclarerCle({ nom: "passeur", phrase: AX_PHRASE_PASSEUR, commentaire: "passeur@beffroi" });
var AxBeffroi = axMachine("beffroi", "10.0.98.12", "Le beffroi de la Citadelle : la machine qui sonne les heures, tout là-haut. On n'y monte qu'avec la clé du Passeur.", "loc_stair.gif",
	{ axComptes: { passeur: { cle: "passeur" } } });
axFichier(AxBeffroi, "LISEZMOI", "LE BEFFROI\n\nIci sonnent les heures de la Citadelle. Compte : passeur, clé : celle du Passeur, protégée par sa phrase.", { image: "item_sign.gif" });
var AxPasseur = axHabitant(Crypte, "Passeur", function(){
	if (aFait("a3_trousseau")) return "Le Passeur fait sauter sa clé dans sa main. « Une phrase tapée une seule fois, et le trousseau vidé en partant. On fera de toi un passeur. »";
	return "Un homme en cape de pluie, une lanterne à la main, attend près de l'escalier.\n\n" +
		"« Je suis le Passeur. Je monte au beffroi (la machine beffroi, compte passeur) dix fois par nuit, pour sonner les heures. " +
		"Ma clé est protégée par une phrase de passe, comme toute clé qui se respecte, et ssh me la redemande à chaque montée. Dix fois par nuit !\n\n" +
		"Je t'ai posé une copie de ma clé dans ta Maison (~/cle-du-passeur). La phrase : « " + AX_PHRASE_PASSEUR + " ». " +
		"Il existe un agent qui garde une clé déverrouillée le temps d'une session : lance-le, fais-le connaître à ton shell, confie-lui la clé une fois, " +
		"vérifie qu'il l'a, puis monte deux fois au beffroi sans retaper la phrase. Et en partant, vide le trousseau : on ne laisse pas de clé ouverte derrière soi. »\n\n" +
		C.gris("Les outils : chmod 600 ~/cle-du-passeur ; eval \"$(ssh-agent -s)\" ; ssh-add ~/cle-du-passeur ; ssh-add -l ; ssh passeur@beffroi ; exit ; ssh-add -D.");
}, ["ssh-agent", "ssh-add"]);
declarerAnnexe({ id: "a3_trousseau", chapitre: 2, titre: "Le trousseau qui se souvient", habitant: "le Passeur", lieu: "dans la Crypte", item: function(){ return AxPasseur; }, ouverte: axOuverteCh3,
	indice: "dans la Crypte, un homme en cape de pluie attend près de l'escalier.",
	resume: "Une clé protégée par une phrase de passe, tapée une seule fois : ssh-agent, ssh-add, ssh-add -l, puis ssh-add -D en partant.",
	etapes: [
		{ titre: "Lancer l'agent et le faire connaître à ton shell (eval \"$(ssh-agent -s)\")", fait: function(){ return axAgent() !== null; } },
		{ titre: "Lui confier la clé du Passeur, et le vérifier (ssh-add, ssh-add -l)", fait: function(){ return axVu("a3_trousseau", "liste"); } },
		{ titre: "Monter deux fois au beffroi sans retaper la phrase (ssh passeur@beffroi)", fait: function(){ return (axEtat("a3_trousseau").montees || 0) >= 2; } },
		{ titre: "Vider le trousseau en partant (ssh-add -D)", fait: function(){ return axVu("a3_trousseau", "vide"); } }
	],
	souvenir: { nom: "Anneau-de-cles", texte: "Un anneau de clés vide. Le Passeur dit qu'un bon trousseau se vide toujours en fin de nuit." },
	lumiere: "la lanterne du Passeur, en haut du beffroi",
	merci: "Le Passeur sonne la cloche du beffroi, une fois, très loin. « Tu as monté deux fois, et je n'ai rien eu à retaper. Merci. »"
});
GameEvents.addListener("read", function(e){
	// La clé est (re)posée tant que le joueur n'en a plus de copie intacte (effacée, écrasée, ou un objet à lui portait déjà ce nom).
	if (e.item === AxPasseur && axOuverteCh3() && annexeProposee(annexeParId("a3_trousseau")) && !state.quests["a3_trousseau"] && !axClePresente(AX_CLE_PASSEUR.privee)){
		var reposee = axVu("a3_trousseau", "clePosee");
		axNoter("a3_trousseau", "clePosee");
		poser(Home, new Item("cle-du-passeur", AX_CLE_PASSEUR.privee, "item_locker.gif").droits("rw-r--r--", JOUEUR));
		if (reposee) say(C.gris("(Tu n'avais plus la clé du Passeur : il en glisse une copie neuve dans ta Maison, ~/cle-du-passeur.)"));
	}
	if (e.item === AxFossoyeur && axOuverteCh3() && annexeProposee(annexeParId("a3_passages"))) axPoserPassages();
	// En mission cyber (la panne sautée), openssl ne s'apprend nulle part : le Serrurier le prête.
	if (e.item === AxSerrurier && axOuverteCh3() && annexeProposee(annexeParId("a3_mots"))) axPreterSort("openssl");
});
GameEvents.addListener("axAgent", function(e){
	if (!axOuverteCh3()) return;
	if (e.action === "liste" && e.cles.indexOf("passeur") > -1) axNoter("a3_trousseau", "liste");
	if (e.action === "vide" && (axEtat("a3_trousseau").montees || 0) >= 2 && e.avant > 0) axNoter("a3_trousseau", "vide");
});
GameEvents.addListener("axSsh", function(e){
	if (e.hote === "beffroi" && e.agent && e.session && axVu("a3_trousseau", "liste")){ var s = axEtat("a3_trousseau"); s.montees = (s.montees || 0) + 1; }
});

/* ------------------------------------------------------------------ */
/* 6. Les mots de passe solides (le Serrurier)                         */
/* ------------------------------------------------------------------ */

var AX_SEL_GRILLE = "Gr1ll3Cav";
var AX_CANDIDATS_GRILLE = ["porte-de-chene", "herse-de-fer", "grille-rouillee"];
var AX_MOT_GRILLE = AX_CANDIDATS_GRILLE[aleaEntier("a3-mot-grille", 0, 2)];
var AX_EMPREINTE_GRILLE = null;
function axEmpreinteGrille(){ if (!AX_EMPREINTE_GRILLE) AX_EMPREINTE_GRILLE = axCrypt(AX_MOT_GRILLE, AX_SEL_GRILLE, 6); return AX_EMPREINTE_GRILLE; }
var AxSerrurier = axHabitant(Crypte, "Serrurier", function(){
	if (aFait("a3_mots")) return "Le Serrurier polit une clé neuve. « Des mots longs et vraiment tirés au hasard, une empreinte salée, et on vérifie sans jamais rien déchiffrer. Le métier rentre. »";
	return "Un homme trapu, une lime à la main, essaie des clés une à une sur une grille.\n\n" +
		"« Le Serrurier. On change toutes les serrures de la Crypte après le passage du Corbeau, et les mots de passe avec. " +
		"Fabrique-m'en d'abord quelques-uns faciles à retenir, puis des vrais, longs (16 caractères au moins) et tirés complètement au hasard, imprononçables. " +
		"Et des octets au hasard, aussi, écrits en base64, pour les clés des machines.\n\n" +
		"Ensuite, une leçon. Calcule deux fois l'empreinte d'un même mot de passe, comme celles de /etc/shadow : tu verras qu'elles diffèrent. " +
		"Pourquoi ? Regarde ce qu'il y a entre les deux premiers $.\n\n" +
		"Enfin, la grille du Caveau. Son empreinte est :\n  " + axEmpreinteGrille() + "\n" +
		"Le mot est l'un de ces trois : " + AX_CANDIDATS_GRILLE.join(", ") + ". On ne déchiffre jamais une empreinte : on recalcule celle d'un candidat, avec le MÊME sel, et on compare. " +
		"Écris le bon mot dans ~/serrure.txt. »\n\n" +
		C.gris("Les outils : pwgen 12 5 ; pwgen -s 16 3 ; openssl rand -base64 24 ; openssl passwd -6 MOT (deux fois) ; openssl passwd -6 -salt SEL MOT.");
}, ["pwgen"]);
declarerAnnexe({ id: "a3_mots", chapitre: 2, titre: "Les mots de passe solides", habitant: "le Serrurier", lieu: "dans la Crypte", item: function(){ return AxSerrurier; }, ouverte: axOuverteCh3,
	indice: "dans la Crypte, quelqu'un essaie des clés sur une grille.",
	resume: "Fabriquer des mots de passe (pwgen, pwgen -s, openssl rand), comprendre le sel (openssl passwd -6) et vérifier un mot contre une empreinte.",
	etapes: [
		{ titre: "Des mots prononçables, puis des vrais : 16 caractères au hasard (pwgen, pwgen -s)", fait: function(){ return axVu("a3_mots", "pwgen") && axVu("a3_mots", "pwgenS"); } },
		{ titre: "Des octets au hasard, en base64 (openssl rand -base64)", fait: function(){ return axVu("a3_mots", "rand"); } },
		{ titre: "Un même mot, deux empreintes différentes : le sel (openssl passwd -6, deux fois)", fait: function(){ return axVu("a3_mots", "sel"); } },
		{ titre: "Retrouver le mot de la grille d'après son empreinte (-salt), dans ~/serrure.txt", fait: function(){
			var t = axSansAccent(axTexteMaison("serrure.txt") || "");
			return axVu("a3_mots", "verifie") && t.indexOf(AX_MOT_GRILLE) > -1 && AX_CANDIDATS_GRILLE.filter(function(c){ return c !== AX_MOT_GRILLE && t.indexOf(c) > -1; }).length === 0;
		} }
	],
	souvenir: { nom: "Lime-du-serrurier", texte: "Une petite lime d'acier. Sur le manche, le Serrurier a gravé un sel : " + AX_SEL_GRILLE + "." },
	lumiere: "la forge du Serrurier",
	merci: "Le Serrurier essaie le mot sur la grille, qui s'ouvre sans un grincement. « Retrouvé sans rien déchiffrer : c'est tout l'art. »"
});
GameEvents.addListener("axPwgen", function(e){
	if (!axOuverteCh3()) return;
	if (!e.s) axNoter("a3_mots", "pwgen");
	if (e.s && e.longueur >= 16) axNoter("a3_mots", "pwgenS");
});
GameEvents.addListener("axOpenssl", function(e){
	if (!axOuverteCh3()) return;
	if (e.sous === "rand" && e.b64 && e.n >= 12) axNoter("a3_mots", "rand");
	if (e.sous === "passwd" && e.algo === 6){
		var s = axEtat("a3_mots");
		s.sels = s.sels || {};
		if (!e.selDonne){
			var vus = s.sels[e.mot] || [];
			if (vus.length && vus.indexOf(e.sel) === -1) axNoter("a3_mots", "sel");
			if (vus.indexOf(e.sel) === -1) vus.push(e.sel);
			s.sels[e.mot] = vus.slice(-4);
		}
		if (e.selDonne && e.sel === AX_SEL_GRILLE && e.sortie === axEmpreinteGrille()) axNoter("a3_mots", "verifie");
	}
});

/* Le badge « Ami de la Crypte ». */
declarerAmiAnnexes(2, { badge: "ami_ch3", nom: "Ami de la Crypte", phrase: "les six habitants de la Crypte te comptent parmi les leurs" });
if (typeof COMPETENCES !== "undefined") COMPETENCES.ami_ch3 = "Ami de la Crypte";
if (typeof RANGS_DES_BADGES !== "undefined") RANGS_DES_BADGES.ami_ch3 = "or";
axLumieresDansPlan("traque", 2);

World.fige = true;
