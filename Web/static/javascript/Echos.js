/**
 * Echos.js : les Sept Échos du Ponton (chapitre 10 pour le joueur, numéro interne 11).
 *
 * Une grande quête facultative, hors note, pour ceux qui arrivent au Lac sans les chapitres d'avant (ou qui les ont
 * oubliés) : sur le Ponton des Échos, sept reflets montent de l'eau, un par chapitre, et rejouent chacun ce qu'il a
 * appris, sans le réseau. Chaque écho est une quête annexe en quatre étapes, sur la machine lac (dans ~/echos),
 * validée sur l'état réel de la machine :
 *   a10_echo_terminus  le chapitre 1 (les bases)          ls, cd, mkdir -p, mv, find, cp, grep, wc, chmod +x
 *   a10_echo_panne     le chapitre 2 (les services)       systemctl status, journalctl -u, une configuration, restart, enable
 *   a10_echo_crypte    le chapitre 3 (l'enquête)          file, sha256sum -c, zcat, grep, setfacl
 *   a10_echo_academie  le chapitre 4 (les données)        jq, awk, sed -i, comm
 *   a10_echo_bastion   le chapitre 5 (les droits)         chmod 600, umask, logger -t, journalctl -t
 *   a10_echo_lumen     le chapitre 6 (l'exploitation)     du -sh, sort -h, free, df, ps, renice, kill
 *   a10_echo_portaube  le chapitre 7 (les sauvegardes)    tar czf, sha256sum, tar xzf -C, diff -r, crontab
 * Sur le ponton et dans ~/echos, l'horloge du lac s'arrête : les échos ne coûtent rien à la Grande Marée.
 * Les sept faits : le badge « Gardien des Sept Échos ». Les échos ne comptent pas pour « Ami du Lac Profond ».
 */

World.fige = false;

var ECHOS_LAC_CH10 = "~/echos";
function etatEchosCh10(){ var c = sCh10(); if (!c.echos || typeof c.echos !== "object") c.echos = { vus: {} }; if (!c.echos.vus) c.echos.vus = {}; return c.echos; }
function vuEchoCh10(cle){ return !!etatEchosCh10().vus[cle]; }
function noterEchoCh10(cle){ etatEchosCh10().vus[cle] = true; }
function texteEchoCh10(rel){ return texteLacCh10(ECHOS_LAC_CH10 + "/" + rel); }
function noeudEchoCh10(rel){ return noeudLacCh10(ECHOS_LAC_CH10 + "/" + rel); }
function objetsEchoCh10(rel){ var d = noeudEchoCh10(rel); return d && d.items ? d.items : []; }
function nomsEchoCh10(rel){ return objetsEchoCh10(rel).map(function(it){ return it.itemname; }); }
function premiereLigneEchoCh10(rel){ var t = texteEchoCh10(rel); return t === null ? null : String(t).split("\n").map(function(l){ return l.trim(); }).filter(Boolean)[0] || ""; }
function contientMotEchoCh10(rel, mot){ var t = texteEchoCh10(rel); return t !== null && new RegExp("(^|[^A-Za-z0-9_.-])" + mot.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "([^A-Za-z0-9_-]|$)").test(t); }
function nombreEchoCh10(rel){ var t = premiereLigneEchoCh10(rel); if (t === null) return null; var m = /(-?\d+(?:\.\d+)?)/.exec(t); return m ? +m[1] : null; }

/* ------------------------------------------------------------------ */
/* Les données des échos, tirées pour chaque partie                    */
/* ------------------------------------------------------------------ */

var INTRUS_ECHOS_CH10 = ["morvane", "corvin", "nyx", "sombrel", "malachie", "ombrail"];
var QUARTIERS_ECHOS_CH10 = ["forges", "thermes", "marche", "archives", "jardins"];
var RELIQUES_ECHOS_CH10 = ["amulette.txt", "calice.txt", "sceau.txt", "couronne.txt"];
function donneesEchosCh10(){
	var e = etatEchosCh10();
	if (e.donnees) return e.donnees;
	var erreurs = [aleaEntier("echo:err:lundi", 2, 5), aleaEntier("echo:err:mardi", 1, 4), aleaEntier("echo:err:mercredi", 3, 6)];
	var ecoles = ["runes", "feu", "glace", "runes", "ombres", "runes", "feu", "glace", "runes", "ombres", "feu", "runes"];
	var nRunes = aleaEntier("echo:runes", 3, 6), sorts = [], puissance = 0;
	var nomsSorts = ["Lueur", "Brasier", "Givre", "Sceau", "Voile", "Rune-Mere", "Etincelle", "Banquise", "Glyphe", "Penombre", "Fournaise", "Cartouche", "Echo", "Tempete"];
	for (var i = 0; i < 12; i++){
		var ecole = i < nRunes ? "runes" : ["feu", "glace", "ombres"][i % 3];
		var p = aleaEntier("echo:puissance:" + i, 3, 19);
		puissance += p;
		sorts.push({ nom: nomsSorts[i], ecole: ecole, niveau: 1 + i % 4, puissance: p });
	}
	sorts = sorts.map(function(s, k){ return sorts[(k * 5) % sorts.length]; });
	var hier = ["adele", "bastien", "chloe", "dimitri", "elina", "farid", "gaspard", "hana", "ines", "jules"];
	var nouveaux = ["kenzo", "lisa", "malo", "nora", "oscar", "pia"].slice(0, aleaEntier("echo:nouveaux", 2, 5));
	var partis = [hier[aleaEntier("echo:parti", 0, 9)]];
	var auj = hier.filter(function(n){ return partis.indexOf(n) === -1; }).concat(nouveaux).sort();
	var corbeaux = aleaEntier("echo:corbeau", 3, 6);
	return (e.donnees = {
		erreurs: erreurs, totalErreurs: erreurs[0] + erreurs[1] + erreurs[2],
		mot: ["brume", "lanterne", "galet", "roseau"][aleaEntier("echo:mot", 0, 3)],
		intrus: INTRUS_ECHOS_CH10[aleaEntier("echo:intrus", 0, INTRUS_ECHOS_CH10.length - 1)],
		alteree: RELIQUES_ECHOS_CH10[aleaEntier("echo:alteree", 0, RELIQUES_ECHOS_CH10.length - 1)],
		sorts: sorts, nRunes: sorts.filter(function(s){ return s.ecole === "runes"; }).length, puissance: puissance,
		hier: hier, auj: auj, nouveaux: nouveaux.slice().sort(), corbeaux: corbeaux,
		lourd: QUARTIERS_ECHOS_CH10[aleaEntier("echo:lourd", 0, QUARTIERS_ECHOS_CH10.length - 1)]
	});
}
function journalEchoCh10(jour, nErreurs){
	var l = [], k = 0;
	for (var h = 6; h < 18; h++){
		var erreur = k < nErreurs && (h * 7 + jour.length) % 3 === 0;
		if (erreur) k++;
		l.push(deuxChiffres(h) + ":00 " + (erreur ? "ERREUR le passeur n'a pas trouvé la barque" : "INFO la barque traverse, tout va bien"));
	}
	while (k < nErreurs){ l.push("18:" + deuxChiffres(10 * k) + " ERREUR la brume a caché le ponton"); k++; }
	return l.join("\n") + "\n";
}
function texteReliqueEchoCh10(nom){ return "Relique de la Crypte : " + nom.replace(/\.txt$/, "") + ".\nGardée sous le troisième pilier, scellée à la cire noire.\n"; }
function prophetieEchoCh10(n){
	var l = ["Quand la Nuée couvrira les huit écoles,"];
	for (var i = 0; i < n; i++) l.push(["le Corbeau volera sur l'Académie,", "et le Corbeau parlera aux portes,", "mais le Corbeau ne passera pas les runes,", "car le Corbeau craint la lumière des élèves,", "et le Corbeau rentrera dans la nuit,", "le Corbeau, le Corbeau, toujours lui."][i]);
	l.push("Ainsi parlait le vieux grimoire.");
	return l.join("\n") + "\n";
}

/* ------------------------------------------------------------------ */
/* Ce que les échos posent sur lac                                      */
/* ------------------------------------------------------------------ */

function semerEchoTerminusCh10(){
	var D = donneesEchosCh10();
	supprimerLacCh10("~/echos/terminus");
	fichierLacCh10("echos/terminus/grenier/journal-lundi.log", journalEchoCh10("lundi", D.erreurs[0]));
	fichierLacCh10("echos/terminus/grenier/journal-mardi.log", journalEchoCh10("mardi", D.erreurs[1]));
	fichierLacCh10("echos/terminus/grenier/journal-mercredi.log", journalEchoCh10("mercredi", D.erreurs[2]));
	fichierLacCh10("echos/terminus/grenier/captures-nord.csv", "id,espece,poids_kg\n1,brochet,4.2\n2,sandre,2.8\n");
	fichierLacCh10("echos/terminus/grenier/captures-sud.csv", "id,espece,poids_kg\n1,carpe,6.1\n2,anguille,1.9\n");
	fichierLacCh10("echos/terminus/grenier/LISEZMOI", "Le grenier du passeur. Range-le : les journaux d'un côté, les données de l'autre.\n");
	fichierLacCh10("echos/terminus/grenier/malles/vieille/fond/carte-du-passeur.txt", "Carte du passeur.\nPour traverser le lac de nuit, dis le mot : " + D.mot + ".\n");
	fichierLacCh10("echos/terminus/grenier/malles/neuve/inventaire.txt", "Deux rames, une lanterne, une corde.\n");
	fichierLacCh10("echos/terminus/passeur.sh", "#!/bin/bash\necho \"Le passeur te fait traverser. Mot de passage : " + D.mot + "\" > ~/echos/terminus/passage.txt\necho \"Traversée faite.\"\n", { mode: "rw-r--r--" });
}
function semerEchoPanneCh10(){
	fichierSysLacCh10("/etc/phare/phare.conf", "# Le phare de la rive. COULEUR : blanc, vert ou rouge.\nCOULEUR=rouge-sang\nPORTEE=12\n");
	fichierSysLacCh10("/etc/systemd/system/phare.service", "[Unit]\nDescription=Le phare de la rive\n\n[Service]\nType=simple\nExecStart=/usr/local/bin/phare --conf /etc/phare/phare.conf\nRestart=on-failure\n\n[Install]\nWantedBy=multi-user.target\n");
	var b = fichierSysLacCh10("/usr/local/bin/phare", "ELF phare\n", { mode: "rwxr-xr-x" });
	if (b) b.binaire = { sortie: "" };
	try { declarerUnite(LAC_CH10, "phare.service", { actif: false, enabled: false, description: "Le phare de la rive" }); } catch (e){}
	try {
		var info = uniteInfo(LAC_CH10, "phare.service");
		changerEtatUnite(LAC_CH10, info, { actif: false, auto: false });
		marquerEchec(LAC_CH10, info);
		sousEtat("echecs", LAC_CH10)["phare.service"] = true;
	} catch (e){}
	try { journalMachine(LAC_CH10, { unite: "phare", unit: "phare.service", message: "phare : COULEUR inconnue (rouge-sang) : blanc, vert ou rouge. Le phare s'éteint." }); } catch (e){}
}
function semerEchoCrypteCh10(){
	var D = donneesEchosCh10();
	supprimerLacCh10("~/echos/crypte");
	var lignes = [];
	RELIQUES_ECHOS_CH10.forEach(function(n){
		var t = texteReliqueEchoCh10(n);
		lignes.push(sha256(t) + "  reliques/" + n);
		fichierLacCh10("echos/crypte/reliques/" + n, n === D.alteree ? t.replace("cire noire", "cire rouge") : t);
	});
	fichierGzipLacCh10("echos/crypte/reliques/grimoire.txt", "Grimoire de la Crypte (compressé, malgré son nom).\n");
	fichierLacCh10("echos/crypte/SHA256SUMS", lignes.join("\n") + "\n");
	var journal = ["22:01 ronde du gardien : tout est calme", "22:40 ronde du gardien : tout est calme", "23:15 porte de la Crypte forcée par " + D.intrus, "23:16 alarme coupée", "23:50 ronde du gardien : une porte ouverte"].join("\n") + "\n";
	fichierGzipLacCh10("echos/crypte/journal.gz", journal);
	fichierLacCh10("echos/crypte/secret.txt", "Le passage secret de la Crypte s'ouvre en tirant le troisième chandelier.\n", { mode: "rw-------" });
}
function semerEchoAcademieCh10(){
	var D = donneesEchosCh10();
	supprimerLacCh10("~/echos/academie");
	fichierLacCh10("echos/academie/grimoire.json", "[\n" + D.sorts.map(function(s){ return "  { \"nom\": \"" + s.nom + "\", \"ecole\": \"" + s.ecole + "\", \"niveau\": " + s.niveau + " }"; }).join(",\n") + "\n]\n");
	fichierLacCh10("echos/academie/sorts.csv", "nom,ecole,puissance\n" + D.sorts.map(function(s){ return s.nom + "," + s.ecole + "," + s.puissance; }).join("\n") + "\n");
	fichierLacCh10("echos/academie/prophetie.txt", prophetieEchoCh10(D.corbeaux));
	fichierLacCh10("echos/academie/eleves-hier.txt", D.hier.slice().sort().join("\n") + "\n");
	fichierLacCh10("echos/academie/eleves-auj.txt", D.auj.join("\n") + "\n");
}
function semerEchoBastionCh10(){
	supprimerLacCh10("~/echos/bastion");
	fichierLacCh10("echos/bastion/coffre.txt", "Les clés des douze murs du Bastion.\n", { mode: "rw-r--r--" });
	fichierLacCh10("echos/bastion/LISEZMOI", "Le coffre est ouvert à tous. La consigne n'existe pas encore. La sentinelle n'a encore rien dit.\n");
}
function semerEchoLumenCh10(){
	var D = donneesEchosCh10();
	supprimerLacCh10("~/echos/lumen");
	QUARTIERS_ECHOS_CH10.forEach(function(q, k){
		var it = fichierLacCh10("echos/lumen/quartiers/" + q + "/releves.bin", "", {});
		if (it) it.taille = q === D.lourd ? 3900 * 1048576 : (180 + 140 * k) * 1048576;
	});
	semerProcessusEchosCh10(true);
}
function semerProcessusEchosCh10(force){
	var e = etatEchosCh10();
	try {
		var vivant = function(pid){ var p = pid ? procParPid(LAC_CH10, pid) : null; return p && p.etat !== "Z" ? p : null; };
		if (force || !vivant(e.pidDevoreur)){
			var p = lancerProcessusMachine(LAC_CH10, { comm: "devoreur", cmd: "/usr/local/bin/devoreur --quartiers /home/" + JOUEUR + "/echos/lumen/quartiers", user: JOUEUR, cpu: 97, rss: 52000, etat: "R", ni: 0 });
			e.pidDevoreur = p.pid;
		}
		if (force){
			var s = lancerProcessusMachine(LAC_CH10, { comm: "spectre", cmd: "/usr/local/bin/spectre --hante lumen", user: JOUEUR, cpu: 4, rss: 9000, etat: "S", ni: 0 });
			e.pidSpectre = s.pid;
		}
	} catch (x){}
}
function semerEchoPortAubeCh10(){
	supprimerLacCh10("~/echos/portaube");
	fichierLacCh10("echos/portaube/registre/maisons.txt", "Les dix maisons de Port-Aube : la Vigie, le Relais, la Poste, la Bibliothèque, l'Annuaire, la Halle, le Greffe, la Forge, le Sceau, la Réserve.\n");
	fichierLacCh10("echos/portaube/registre/baux.txt", "Chaque maison est louée à l'école, pour cent ans.\n");
	fichierLacCh10("echos/portaube/registre/cles.txt", "Une clé par maison. La onzième clé ouvre la Réserve, où dorment les sauvegardes.\n");
	fichierLacCh10("echos/portaube/registre/LISEZMOI", "Ce registre n'existe qu'en un exemplaire. Pour l'instant.\n");
}
var SEMIS_ECHOS_CH10 = [semerEchoTerminusCh10, semerEchoPanneCh10, semerEchoCrypteCh10, semerEchoAcademieCh10, semerEchoBastionCh10, semerEchoLumenCh10, semerEchoPortAubeCh10];
function semerEchosCh10(){
	var e = etatEchosCh10();
	donneesEchosCh10();
	SEMIS_ECHOS_CH10.forEach(function(f){ try { f(); } catch (x){ if (typeof console !== "undefined" && console.error) console.error(x); } });
	fichierLacCh10("echos/LISEZMOI", "Les Sept Échos : un dossier par chapitre (terminus, crypte, academie, bastion, lumen, portaube ; le phare de la panne est un service de lac).\nIci, l'horloge du lac s'arrête. Un dossier abîmé : regenerer echos (depuis la rive).\n");
	e.semes = true;
}
var SEMER_LAC_AVANT_ECHOS = semerLac;
semerLac = function(){
	var r = SEMER_LAC_AVANT_ECHOS.apply(this, arguments);
	try {
		var c = sCh10();
		if (c.seme && !etatEchosCh10().semes) moteurSeul(semerEchosCh10);
		// Le dévoreur travaille : tué avant d'être ralenti, il est relancé (Lumen le dit).
		if (c.seme && etatEchosCh10().semes && !(etatAnnexe("a10_echo_lumen").etapes || [])[2] && !state.quests["a10_echo_lumen"]){
			var p = etatEchosCh10().pidDevoreur ? procParPid(LAC_CH10, etatEchosCh10().pidDevoreur) : null;
			if (!p || p.etat === "Z"){ etatEchosCh10().devoreurTue = true; moteurSeul(function(){ semerProcessusEchosCh10(false); }); }
		}
	} catch (x){}
	return r;
};
if (typeof REGENERATIONS_CH10 !== "undefined") REGENERATIONS_CH10.push({ nom: "echos", etapes: [], semer: function(){ semerEchosCh10(); } });

/* Le phare refuse de s'allumer tant que sa couleur n'existe pas. */
function couleurPhareCh10(){ var m = /^\s*COULEUR\s*=\s*"?([^"\s#]*)"?\s*$/m.exec(texteHote(LAC_CH10, "/etc/phare/phare.conf") || ""); return m ? m[1] : null; }
function phareRegleCh10(){ return ["blanc", "vert", "rouge"].indexOf(couleurPhareCh10()) > -1; }
controleAvantDemarrage(function(h, unite){
	if (h !== LAC_CH10 || unite !== "phare.service") return null;
	if (phareRegleCh10()) return null;
	try { journalMachine(h, { unite: "phare", unit: "phare.service", message: "phare : COULEUR inconnue (" + (couleurPhareCh10() || "absente") + ") : blanc, vert ou rouge. Le phare s'éteint." }); } catch (e){}
	return "phare";
});

/* ------------------------------------------------------------------ */
/* L'horloge s'arrête sur le ponton et dans ~/echos                     */
/* ------------------------------------------------------------------ */

function echosSansHorlogeCh10(){
	try {
		if (typeof PontonDesEchosCh10 !== "undefined" && current_room === PontonDesEchosCh10) return true;
		if (surLacCh10()){ var p = cheminDuLieuMachine(current_room); return p === homeLacCh10() + "/echos" || p.indexOf(homeLacCh10() + "/echos/") === 0; }
	} catch (e){}
	return false;
}
var COMPTER_COMMANDE_AVANT_ECHOS = compterCommandeCh10;
compterCommandeCh10 = function(){
	if (echosSansHorlogeCh10()) return;
	return COMPTER_COMMANDE_AVANT_ECHOS.apply(this, arguments);
};

/* ------------------------------------------------------------------ */
/* Ce que le joueur lance sur lac pour les échos                        */
/* ------------------------------------------------------------------ */

var APPELER_AVANT_ECHOS_CH10 = Shell.appeler, PROFONDEUR_ECHOS_CH10 = 0;
Shell.appeler = function(nom, args, io){
	var haut = PROFONDEUR_ECHOS_CH10 === 0, sortie;
	PROFONDEUR_ECHOS_CH10++;
	try { sortie = APPELER_AVANT_ECHOS_CH10.apply(this, arguments); }
	finally { PROFONDEUR_ECHOS_CH10--; }
	try {
		// Seulement ce que le joueur tape (pas ce qu'une commande lance pour elle-même, comme ssh qui affiche df).
		if (haut && ouverteCh10() && surLacCh10()){
			var s = typeof sortie === "string" ? sansAnsi(sortie) : "", a = args || [], tout = a.join(" "), echec = !!(io && io.code);
			if (nom === "systemctl" && a.indexOf("status") > -1 && /(^|\s)phare(\.service)?(\s|$)/.test(tout)) noterEchoCh10("phareStatus");
			if (nom === "journalctl" && /(^|\s)(-[a-zA-Z]*u\s*|--unit[=\s]+)phare/.test(tout)) noterEchoCh10("phareJournal");
			if (nom === "logger" && /(^|\s)(-t|--tag)(\s|=)/.test(tout) && !echec) noterEchoCh10("logger");
			if (nom === "journalctl" && /(^|\s)(-t|--identifier)(\s|=)/.test(tout) && vuEchoCh10("logger") && /\S/.test(s)) noterEchoCh10("journalTag");
			if (nom === "free" && !echec && /Mem:/.test(s)) noterEchoCh10("free");
			if (nom === "df" && !echec && /Filesystem|Sys\. de fichiers/.test(s)) noterEchoCh10("df");
			if (nom === "sha256sum" && /(^|\s)(-c|--check)(\s|$)/.test(tout) && /reliques\/\S+: (FAILED|ÉCHEC)/.test(s)) noterEchoCh10("reliquesVerifiees");
			if (nom === "sha256sum" && /(^|\s)(-c|--check)(\s|$)/.test(tout) && /registre\.tar\.gz: OK/.test(s) && !echec) noterEchoCh10("archiveVerifiee");
			if (nom === "diff" && /(^|\s)-[a-z]*r/.test(tout) && /registre/.test(tout) && !echec && s.trim() === "") noterEchoCh10("diffRestauration");
		}
	} catch (e){ /* un écho ne doit jamais casser un sort */ }
	return sortie;
};

/* ------------------------------------------------------------------ */
/* Ce qui valide chaque étape (l'état réel de lac)                      */
/* ------------------------------------------------------------------ */

function grenierRangeCh10(){
	var j = nomsEchoCh10("terminus/rangement/journaux"), d = nomsEchoCh10("terminus/rangement/donnees"), g = nomsEchoCh10("terminus/grenier");
	return ["journal-lundi.log", "journal-mardi.log", "journal-mercredi.log"].every(function(n){ return j.indexOf(n) > -1; }) &&
		["captures-nord.csv", "captures-sud.csv"].every(function(n){ return d.indexOf(n) > -1; }) &&
		!g.some(function(n){ return /\.(log|csv)$/.test(n); });
}
function carteCopieeCh10(){ var t = texteEchoCh10("terminus/carte.txt"); return t !== null && t.indexOf("dis le mot : " + donneesEchosCh10().mot) > -1; }
function erreursCompteesCh10(){ return nombreEchoCh10("terminus/erreurs.txt") === donneesEchosCh10().totalErreurs; }
function passeurLanceCh10(){
	var s = noeudEchoCh10("terminus/passeur.sh");
	return !!s && /^..x/.test(String(s.mode || "")) && texteEchoCh10("terminus/passage.txt") !== null;
}
function phareAllumeCh10(){ try { var u = etatUnite(LAC_CH10, "phare.service"); return u.actif && u.enabled; } catch (e){ return false; } }
/* Un nom de relique, avec ou sans .txt. */
function nommeRelique(rel, nom){ return contientMotEchoCh10(rel, nom) || contientMotEchoCh10(rel, nom.replace(/\.txt$/, "")); }
function imposteurCh10(){ return nommeRelique("crypte/imposteur.txt", "grimoire.txt") && !RELIQUES_ECHOS_CH10.some(function(n){ return nommeRelique("crypte/imposteur.txt", n); }); }
function altereeCh10(){ var D = donneesEchosCh10(); return nommeRelique("crypte/alteree.txt", D.alteree) && !RELIQUES_ECHOS_CH10.some(function(n){ return n !== D.alteree && nommeRelique("crypte/alteree.txt", n); }) && !nommeRelique("crypte/alteree.txt", "grimoire.txt"); }
function intrusTrouveCh10(){ return contientMotEchoCh10("crypte/intrus.txt", donneesEchosCh10().intrus); }
function secretConfieCh10(){
	var n = noeudEchoCh10("crypte/secret.txt");
	if (!n) return false;
	var acl = (n.acl || []).filter(function(x){ return x.type === "user" && x.nom === "wissam"; })[0];
	return !!acl && /^r/.test(acl.perms || "") && !/r/.test(String(n.mode || "").substring(6));
}
function runesCompteesCh10(){ return nombreEchoCh10("academie/runes.txt") === donneesEchosCh10().nRunes; }
function puissanceTotaleCh10(){ return nombreEchoCh10("academie/total.txt") === donneesEchosCh10().puissance; }
function prophetieCorrigeeCh10(){
	var t = texteEchoCh10("academie/prophetie.txt");
	var attendu = (prophetieEchoCh10(donneesEchosCh10().corbeaux).match(/Corbeau/g) || []).length;
	return t !== null && t.indexOf("Corbeau") === -1 && (t.match(/Phénix/g) || []).length === attendu;
}
function nouveauxElevesCh10(){
	var t = texteEchoCh10("academie/nouveaux.txt");
	if (t === null) return false;
	var l = String(t).split("\n").map(function(x){ return x.trim(); }).filter(Boolean);
	return l.slice().sort().join(",") === donneesEchosCh10().nouveaux.join(",");
}
function modeEchoCh10(rel){ var n = noeudEchoCh10(rel); return n ? String(n.mode || "") : null; }
function lumenLourdCh10(){ return contientMotEchoCh10("lumen/lourd.txt", donneesEchosCh10().lourd) && QUARTIERS_ECHOS_CH10.filter(function(q){ return contientMotEchoCh10("lumen/lourd.txt", q); }).length === 1; }
function devoreurRalentiCh10(){ var e = etatEchosCh10(), p = e.pidDevoreur ? procParPid(LAC_CH10, e.pidDevoreur) : null; return !!p && p.etat !== "Z" && (+p.ni || 0) >= 10; }
function spectreChasseCh10(){ var e = etatEchosCh10(), p = e.pidSpectre ? procParPid(LAC_CH10, e.pidSpectre) : null; return !!e.pidSpectre && (!p || p.etat === "Z"); }
function archiveRegistreCh10(){
	var n = noeudEchoCh10("portaube/registre.tar.gz");
	if (!n) return false;
	var entrees = (n.comp && n.comp.archive) || n.archive || [];
	var noms = entrees.map(function(e){ return String(e.n || e.nom || ""); });
	return ["maisons.txt", "baux.txt", "cles.txt"].every(function(f){ return noms.some(function(x){ return /(^|\/)registre\//.test(x) && x.split("/").pop() === f; }); });
}
function empreinteArchiveCh10(){
	var ok = objetsEchoCh10("portaube").some(function(it){ return /\.sha256$|SHA256SUMS/i.test(it.itemname) && /^[0-9a-f]{64}\s+\*?registre\.tar\.gz\s*$/m.test(it.getText()); });
	return ok && vuEchoCh10("archiveVerifiee");
}
function registresRestauresCh10(){
	var r = [], racine = noeudEchoCh10("portaube/restauration");
	(function chercher(d, chemin, prof){
		if (!d || !d.children || prof > 8) return;
		d.children.forEach(function(x){ var c = chemin + "/" + x.room_name; if (x.room_name === "registre") r.push(c); chercher(x, c, prof + 1); });
	})(racine, "portaube/restauration", 0);
	return r;
}
function restaurationCh10(){
	return registresRestauresCh10().some(function(dossier){
		return ["maisons.txt", "baux.txt", "cles.txt", "LISEZMOI"].every(function(f){ var a = texteEchoCh10("portaube/registre/" + f), b = texteEchoCh10(dossier + "/" + f); return a !== null && a === b; });
	}) && vuEchoCh10("diffRestauration");
}
function cronRegistreCh10(){
	return lignesCronJoueurCh10().some(function(l){
		var c = String(l).trim().split(/\s+/);
		if (/^@(daily|midnight|hourly|weekly|monthly|yearly|annually|reboot)$/.test(c[0])) return /\btar\b/.test(l) && /registre/.test(l);
		if (c.length < 6) return false;
		var valide = function(champ, min, max){ for (var v = min; v <= max; v++) if (champCronCh10(champ, v, min, max)) return true; return false; };
		var ok = valide(c[0], 0, 59) && valide(c[1], 0, 23) && valide(c[2], 1, 31) && valide(c[3], 1, 12) && valide(c[4], 0, 7);
		return ok && /\btar\b/.test(l) && /registre/.test(l);
	});
}

/* ------------------------------------------------------------------ */
/* Le Ponton des Échos et ses sept reflets                              */
/* ------------------------------------------------------------------ */

var PontonDesEchosCh10 = salleCh10("PontonDesEchos",
	"Le Ponton des Échos. À l'écart des quais, un ponton de bois noirci s'avance loin sur l'eau, plus loin que les lanternes. Ici, le lac ne rend pas les fichiers : il rend les souvenirs. " +
	"Penche-toi, et sept reflets montent de l'eau noire, un pour chaque chapitre de ton voyage, sans le réseau. Chacun te rejoue ce qu'il t'a appris, puis te met à l'épreuve sur lac, dans ~/echos. " +
	"Facultatif, hors note : ici, et sur lac tant que tu travailles dans ~/echos, l'horloge du lac s'arrête. La Grande Marée attend. Lis la Stele.",
	"loc_ponton_echos.gif");
PontonDesEchosCh10.horsBareme = true;
link_rooms(LacCh10, PontonDesEchosCh10);

var ECHOS_CH10 = [];
function echoCh10(def){
	var it = new Item(def.nom, "", def.image).personnage();
	texteVivant(it, function(){
		if (state.quests[def.id]) return def.fin;
		var t = def.recit + "\n\n" + C.gris("Les sorts du souvenir :\n" + def.lecon) + "\n\n" + def.mission;
		if (def.etat){ var x = null; try { x = def.etat(); } catch (e){ x = null; } if (x) t += "\n\n" + x; }
		return t;
	});
	PontonDesEchosCh10.addItem(it);
	def.item = it;
	ECHOS_CH10.push(def);
	declarerAnnexe({ id: def.id, chapitre: 11, rappel: true, titre: def.titre, habitant: "l'Écho " + def.de, lieu: "au Ponton des Échos", item: function(){ return it; }, ouverte: ouverteCh10,
		indice: "au Ponton des Échos, un reflet attend qu'on se penche sur l'eau (cat " + def.nom + ").",
		resume: def.resume, etapes: def.etapes, souvenir: def.souvenir, merci: def.merci });
	return it;
}

echoCh10({ id: "a10_echo_terminus", nom: "Terminus", de: "du Terminus", image: "loc_farm.gif", titre: "L'Écho du Terminus : les premiers pas",
	recit: "L'eau frémit, et dans le reflet apparaît une petite maison au bord d'un champ : la tienne, celle du tout premier jour. Une voix qui ressemble à la tienne, en plus jeune :\n\n" +
		"« Souviens-toi. Avant les machines, avant les marées, il y avait Terminus : un monde de lieux et d'objets, et le Sorcier Noir au bout du chemin. " +
		"Tu y as appris à marcher (cd), à regarder (ls), à lire (cat), à créer, déplacer, chercher. Tout le reste est bâti là-dessus. Sur lac, c'est exactement pareil : des dossiers, des fichiers, et toi. »",
	lecon: "  ls -la                          tout voir, même les fichiers cachés (.nom)\n" +
		"  cd DOSSIER ; cd .. ; cd ~        entrer, remonter d'un cran, rentrer chez soi\n" +
		"  pwd                              où suis-je ?\n" +
		"  cat F ; head -n 5 F ; tail F     lire, le début, la fin\n" +
		"  mkdir -p a/b/c                   créer des dossiers, parents compris\n" +
		"  cp F G ; mv F DOSSIER/ ; rm F    copier ; déplacer (ou renommer) ; supprimer, sans corbeille\n" +
		"  mv *.log DOSSIER/                *.log : tous les noms qui finissent par .log (* : n'importe quels caractères)\n" +
		"  find . -name 'carte*'            chercher un fichier par son nom, dans tous les sous-dossiers\n" +
		"  grep MOT F ; grep -c MOT F       les lignes qui contiennent MOT ; leur nombre\n" +
		"  wc -l F                          compter les lignes\n" +
		"  A > F ; A >> F ; A | B           écrire dans F ; ajouter à la fin ; passer la sortie de A à B\n" +
		"  chmod +x s.sh ; ./s.sh           rendre un script exécutable, puis le lancer",
	mission: "« Ta mission (ssh lac, puis cd ~/echos/terminus) : le grenier du passeur est en désordre. " +
		"Range-le : les journaux (.log) dans rangement/journaux, les données (.csv) dans rangement/donnees. Trouve la carte cachée au fond d'une malle et copie-la en carte.txt. " +
		"Compte toutes les lignes ERREUR des trois journaux et écris ce nombre dans erreurs.txt. Enfin, le passeur refuse de partir : rends passeur.sh exécutable, et lance-le. »",
	resume: "Les bases : mkdir -p, mv avec *, find, cp, grep et wc, chmod +x, lancer un script.",
	etapes: [
		{ titre: "Le grenier rangé (mkdir -p, mv *.log, mv *.csv)", fait: grenierRangeCh10 },
		{ titre: "La carte retrouvée et copiée en carte.txt (find, cp)", fait: carteCopieeCh10 },
		{ titre: "Les lignes ERREUR comptées dans erreurs.txt (grep, wc -l)", fait: erreursCompteesCh10 },
		{ titre: "Le passeur exécutable, et lancé (chmod +x, ./passeur.sh)", fait: passeurLanceCh10 }
	],
	souvenir: { nom: "Eclat-du-Terminus", texte: "Un galet plat, poli par l'eau. Gravé dessus, d'une écriture d'enfant : « ls, cd, cat. Le reste vient après. »" },
	merci: "Le reflet de la petite maison sourit. « Tu n'as rien oublié. Tout ce que tu feras en bas, c'est ça, en plus grand. »",
	fin: "Dans l'eau, la petite maison au bord du champ. « Les premiers pas sont faits. Ils le sont pour toujours. »" });

echoCh10({ id: "a10_echo_panne", nom: "Panne", de: "de la Panne", image: "loc_batimentb.gif", titre: "L'Écho de la Panne : le phare éteint",
	recit: "Le reflet montre le bâtiment B de l'école, toutes lumières éteintes, puis rallumées une à une. Une voix fatiguée, celle d'une nuit blanche :\n\n" +
		"« Souviens-toi. Le réseau de l'école était tombé, et tu l'as relevé couche par couche, du câble au pare-feu. Le réseau, on le laisse ici. " +
		"Mais cette nuit-là t'a appris autre chose, qui sert partout : un service, ça se surveille, ça se lit, ça se relance. Sur lac, le phare de la rive est éteint. »",
	lecon: "  systemctl status NOM               l'état d'un service : active, inactive, failed (en échec), et ses dernières lignes\n" +
		"  sudo journalctl -u NOM -n 20       les vingt dernières lignes de son journal : la cause est presque toujours là\n" +
		"  sudo journalctl -u NOM --since today   ce qu'il a dit depuis ce matin (sudo : le journal d'un service système)\n" +
		"  sudo nano FICHIER                  corriger une configuration (Ctrl+O enregistre, Ctrl+X sort)\n" +
		"  sudo sed -i 's/^CLE=.*/CLE=val/' F  la même correction, en une ligne\n" +
		"  sudo systemctl restart NOM         le relancer : il relit sa configuration\n" +
		"  sudo systemctl enable NOM          qu'il démarre aussi à chaque démarrage de la machine\n" +
		"  systemctl is-active NOM ; systemctl is-enabled NOM    la réponse en un mot",
	mission: "« Ta mission (ssh lac, puis cd ~/echos : l'horloge y reste arrêtée) : le phare de la rive (le service phare) est éteint. Regarde son état, lis la cause dans son journal, corrige sa configuration (/etc/phare/phare.conf), " +
		"rallume-le, et fais qu'il se rallume tout seul à chaque démarrage. »",
	etat: function(){ return vuEchoCh10("phareJournal") && !phareRegleCh10() ? C.gris("(Le journal a parlé : COULEUR ne connaît que blanc, vert ou rouge.)") : null; },
	resume: "Les services : systemctl status, journalctl -u, corriger une configuration, restart, enable.",
	etapes: [
		{ titre: "Le phare examiné (systemctl status phare)", fait: function(){ return vuEchoCh10("phareStatus"); } },
		{ titre: "La cause lue dans son journal (journalctl -u phare)", fait: function(){ return vuEchoCh10("phareJournal"); } },
		{ titre: "La configuration corrigée (/etc/phare/phare.conf, avec sudo)", fait: phareRegleCh10 },
		{ titre: "Le phare rallumé, et pour chaque démarrage (restart, enable)", fait: phareAllumeCh10 }
	],
	souvenir: { nom: "Eclat-de-la-Panne", texte: "Un fusible grillé, gardé comme une médaille. Au dos, au feutre : « status, journal, correction, restart. Dans cet ordre. »" },
	merci: "Au loin, sur la rive, le phare s'allume. Le reflet du bâtiment B s'éclaire. « Toujours le journal d'abord. Il dit presque toujours pourquoi. »",
	fin: "Le reflet du bâtiment B brille, toutes fenêtres allumées. « Un service qui tombe, tu sais le relever. »" });

echoCh10({ id: "a10_echo_crypte", nom: "Crypte", de: "de la Crypte", image: "loc_crypte.gif", titre: "L'Écho de la Crypte : les reliques",
	recit: "Le reflet s'assombrit : des voûtes, des tombeaux, une odeur de cire. La Crypte. Un murmure :\n\n" +
		"« Souviens-toi. Dans la Crypte, rien n'était ce qu'il prétendait être. Des fichiers déguisés, des journaux effacés, et le Corbeau caché dans les droits. " +
		"Tu as appris à ne croire ni un nom de fichier, ni un fichier sans son empreinte. Mes reliques sont sur lac. Quelqu'un y est passé. »",
	lecon: "  file F                       ce qu'est vraiment un fichier (son contenu, pas son extension)\n" +
		"  sha256sum F                  son empreinte : un seul octet change, et tout change\n" +
		"  sha256sum -c SHA256SUMS      revérifier une liste d'empreintes : OK ou FAILED (en français : Réussi ou Échec ; ici, ÉCHEC)\n" +
		"  zcat F.gz | grep MOT         lire un fichier compressé, sans écrire de fichier décompressé\n" +
		"  gzip F ; gunzip F.gz         compresser ; décompresser\n" +
		"  tr 'a-z' 'A-Z' < F           changer des caractères (ici, tout en majuscules)\n" +
		"  getfacl F                    les droits en plus de ceux que montre ls -l (les ACL)\n" +
		"  setfacl -m u:NOM:r F         donner la lecture à une personne de plus, et à elle seule",
	mission: "« Ta mission (ssh lac, puis cd ~/echos/crypte) : un des fichiers de reliques/ n'est pas du texte malgré son nom : écris son nom (par exemple calice.txt) dans imposteur.txt. " +
		"Une relique a été altérée : sha256sum -c SHA256SUMS la trahira, écris son nom dans alteree.txt. Le journal.gz dit qui a forcé la porte : son nom dans intrus.txt. " +
		"Enfin, secret.txt est à toi seul : confie-le à Wissam en lecture (setfacl), sans l'ouvrir à personne d'autre. »",
	resume: "L'enquête : file, sha256sum -c, zcat et grep, setfacl et getfacl.",
	etapes: [
		{ titre: "Le faux parchemin démasqué (file), nommé dans imposteur.txt", fait: imposteurCh10 },
		{ titre: "La relique altérée trahie (sha256sum -c), nommée dans alteree.txt", fait: function(){ return vuEchoCh10("reliquesVerifiees") && altereeCh10(); } },
		{ titre: "L'intrus lu dans le journal compressé (zcat, grep), nommé dans intrus.txt", fait: intrusTrouveCh10 },
		{ titre: "Le secret confié à Wissam seul (setfacl -m u:wissam:r)", fait: secretConfieCh10 }
	],
	souvenir: { nom: "Eclat-de-la-Crypte", texte: "Un sceau de cire noire, fendu en deux. Une étiquette : « Le nom ment. L'empreinte, jamais. »" },
	merci: "Le murmure de la Crypte s'apaise. « Tu sais encore douter. C'est la première arme. »",
	fin: "Dans le reflet, la Crypte est silencieuse, toutes ses reliques à leur place. « Rien ne passe sans que tu le voies. »" });

echoCh10({ id: "a10_echo_academie", nom: "Academie", de: "de l'Académie", image: "loc_academie.gif", titre: "L'Écho de l'Académie : le grimoire",
	recit: "Le reflet s'illumine de vitraux : huit tours, huit écoles, et une nuée noire au-dessus. L'Académie. Une voix de maître, lente :\n\n" +
		"« Souviens-toi. Cette nuit-là, la Nuée couvrait les huit écoles, et le Corbeau rôdait. Tu as appris à faire parler les données : un JSON, une colonne de chiffres, " +
		"deux listes qu'on compare, un mot qu'on remplace partout. En bas, au Lac, tu en auras besoin à chaque poste. »",
	lecon: "  jq '.[0]' F.json ; jq '.[].nom' F.json       lire un tableau JSON ; un champ de chaque élément\n" +
		"  jq '[.[] | select(.ecole == \"runes\")] | length' F.json    filtrer, puis compter\n" +
		"  awk -F, 'NR > 1 { s += $3 } END { print s }' F.csv   additionner la 3e colonne, sans l'en-tête\n" +
		"  sed -i 's/ancien/nouveau/g' F                remplacer partout, dans le fichier même (g : toutes les fois)\n" +
		"  comm -13 A B                                 les lignes de B absentes de A (A et B triés)\n" +
		"  sort F ; sort -u F ; uniq -c                 trier ; trier sans doublons ; compter les doublons\n" +
		"  cut -d, -f2 F                                la 2e colonne d'un CSV\n" +
		"  ls *.txt | xargs wc -l                       une liste devient les arguments d'une commande",
	mission: "« Ta mission (ssh lac, puis cd ~/echos/academie) : combien de sorts de l'école des runes dans grimoire.json ? Le nombre dans runes.txt. " +
		"La puissance totale des sorts de sorts.csv (3e colonne) dans total.txt. La prophétie se trompe d'oiseau : remplace chaque Corbeau par Phénix, dans prophetie.txt même. " +
		"Enfin, les nouveaux élèves d'aujourd'hui (dans eleves-auj.txt, pas dans eleves-hier.txt) dans nouveaux.txt, un par ligne. »",
	resume: "Les données : jq, awk, sed -i, comm.",
	etapes: [
		{ titre: "Les sorts des runes comptés dans runes.txt (jq)", fait: runesCompteesCh10 },
		{ titre: "La puissance totale dans total.txt (awk)", fait: puissanceTotaleCh10 },
		{ titre: "La prophétie corrigée sur place (sed -i)", fait: prophetieCorrigeeCh10 },
		{ titre: "Les nouveaux élèves dans nouveaux.txt (comm -13)", fait: nouveauxElevesCh10 }
	],
	souvenir: { nom: "Eclat-de-l-Academie", texte: "Une plume de phénix, rousse et chaude au toucher. Sur le tuyau, minuscule : « jq, awk, sed, comm. Les quatre langues de la donnée. »" },
	merci: "Les vitraux du reflet s'allument un à un. « Le grimoire t'obéit encore. Va : les données du Lac parleront la même langue. »",
	fin: "Dans l'eau, les huit tours de l'Académie, sans nuée. « Tu sais faire parler les données. »" });

echoCh10({ id: "a10_echo_bastion", nom: "Bastion", de: "du Bastion", image: "loc_bastion.gif", titre: "L'Écho du Bastion : le coffre et la sentinelle",
	recit: "Le reflet se dresse en murailles : douze murs, une tour, une aube froide. Le Bastion. Une voix sèche, de capitaine :\n\n" +
		"« Souviens-toi. Douze murs à dresser sur un serveur neuf avant l'inspection de l'aube. Un serveur sûr, ce n'est pas de la magie : ce sont des droits justes, " +
		"des fichiers qui naissent fermés, et des traces dans le journal. Sur lac, mon coffre est ouvert à tous, et ma sentinelle n'a rien dit. »",
	lecon: "  ls -l F                      les droits : rwx pour le propriétaire, puis le groupe, puis les autres\n" +
		"  chmod 600 F                  lecture et écriture pour toi seul (6 = 4 + 2 : r + w ; 0 : rien)\n" +
		"  chmod 640 F ; chmod u+x F    en chiffres ou en lettres, au choix\n" +
		"  umask 027                    ce que les fichiers NEUFS n'auront pas : rien pour les autres, pas d'écriture pour le groupe\n" +
		"  sudo chown NOM F             changer le propriétaire\n" +
		"  logger -t ETIQUETTE \"msg\"    écrire une ligne dans le journal du système\n" +
		"  journalctl -t ETIQUETTE      relire ce qu'une étiquette y a écrit",
	mission: "« Ta mission (ssh lac, puis cd ~/echos/bastion) : coffre.txt est lisible par tous : qu'il ne le soit plus que par toi (chmod 600). " +
		"Puis crée consigne.txt après un umask 027 : il doit naître en rw-r-----, sans chmod. Enfin, que la sentinelle crie dans le journal (logger -t sentinelle \"...\"), et relis son cri (journalctl -t sentinelle). »",
	resume: "Les droits et les traces : chmod 600, umask, logger -t, journalctl -t.",
	etapes: [
		{ titre: "Le coffre pour toi seul (chmod 600)", fait: function(){ return modeEchoCh10("bastion/coffre.txt") === "rw-------"; } },
		{ titre: "La consigne née fermée (umask 027, puis consigne.txt en rw-r-----)", fait: function(){ return modeEchoCh10("bastion/consigne.txt") === "rw-r-----"; } },
		{ titre: "Le cri de la sentinelle dans le journal (logger -t)", fait: function(){ return vuEchoCh10("logger"); } },
		{ titre: "Le cri relu (journalctl -t)", fait: function(){ return vuEchoCh10("journalTag"); } }
	],
	souvenir: { nom: "Eclat-du-Bastion", texte: "Une petite clé de fer, très lourde pour sa taille. Gravé sur l'anneau : « 600. Rien de plus que nécessaire. »" },
	merci: "Les murailles du reflet se referment, pierre après pierre. « Fermé par défaut, ouvert par choix. Et tout laisse une trace. »",
	fin: "Le Bastion se tient dans l'eau, ses douze murs debout. « Tes fichiers naissent fermés. Bien. »" });

echoCh10({ id: "a10_echo_lumen", nom: "Lumen", de: "de Lumen", image: "loc_lumen.gif", titre: "L'Écho de Lumen : les quartiers",
	recit: "Le reflet scintille : une cité de lumières, seize quartiers, dont certains s'éteignent. Lumen. Une voix pressée, celle d'une ingénieure de nuit :\n\n" +
		"« Souviens-toi. Seize quartiers à rallumer avant la Longue Nuit : des disques pleins, de la mémoire qui fuit, des processus qui dévorent tout. " +
		"Exploiter une machine, c'est d'abord mesurer, puis agir sans casser ce qui travaille. Sur lac, un dévoreur mange le processeur, et un spectre traîne. »",
	lecon: "  df -h                         la place sur les disques\n" +
		"  du -sh * | sort -h            ce qui pèse le plus ici (le plus lourd en dernier)\n" +
		"  free -h                       la mémoire (regarde la colonne available)\n" +
		"  ps aux --sort=-%cpu | head    les processus qui mangent le plus de processeur\n" +
		"  pgrep NOM ; pidof NOM         le numéro (PID) d'un processus\n" +
		"  renice -n 10 -p PID           le ralentir : plus le nombre est grand, plus il laisse passer les autres\n" +
		"  kill PID ; pkill NOM          l'arrêter poliment (SIGTERM)\n" +
		"  kill -9 PID                   en dernier recours seulement",
	mission: "« Ta mission (ssh lac, puis cd ~/echos/lumen) : quel quartier de quartiers/ pèse le plus ? Son nom dans lourd.txt. Relève la mémoire (free -h) et les disques (df -h). " +
		"Le dévoreur (devoreur) mange tout le processeur, mais il travaille : ralentis-le (renice 10 ou plus), ne le tue pas. Le spectre (spectre), lui, ne sert à rien : chasse-le (kill). »",
	etat: function(){ return etatEchosCh10().devoreurTue && !devoreurRalentiCh10() ? C.gris("(Le dévoreur a été arrêté : il travaillait, alors l'écho l'a relancé. Ralentis-le, avec renice.)") : null; },
	resume: "L'exploitation : du -sh et sort -h, free, df, ps, renice, kill.",
	etapes: [
		{ titre: "Le quartier le plus lourd dans lourd.txt (du -sh, sort -h)", fait: lumenLourdCh10 },
		{ titre: "La mémoire et les disques relevés (free -h, df -h)", fait: function(){ return vuEchoCh10("free") && vuEchoCh10("df"); } },
		{ titre: "Le dévoreur ralenti, pas tué (ps, renice)", fait: devoreurRalentiCh10 },
		{ titre: "Le spectre chassé (pgrep, kill)", fait: spectreChasseCh10 }
	],
	souvenir: { nom: "Eclat-de-Lumen", texte: "Une ampoule minuscule qui s'allume toute seule quand on la serre dans la main. Sur le culot : « Mesure d'abord. »" },
	merci: "Dans le reflet, les seize quartiers de Lumen se rallument. « Rien de cassé, tout mesuré. C'est ça, l'exploitation. »",
	fin: "Lumen brille dans l'eau, ses seize quartiers allumés. « Tu sais lire une machine. »" });

echoCh10({ id: "a10_echo_portaube", nom: "PortAube", de: "de Port-Aube", image: "loc_port_aube.gif", titre: "L'Écho de Port-Aube : la Réserve",
	recit: "Le reflet s'ouvre sur un port à l'aube : dix maisons, une marée qui monte. Port-Aube. Une voix de vieux marin :\n\n" +
		"« Souviens-toi. Dix maisons à bâtir avant la marée. Le réseau, on le laisse ici. Mais la dernière maison était la Réserve, celle des sauvegardes, " +
		"et c'est elle que je veux te rappeler : une sauvegarde qu'on n'a jamais restaurée n'est pas une sauvegarde. Mon registre, sur lac, n'existe qu'en un exemplaire. »",
	lecon: "  tar czf A.tar.gz DOSSIER                 archiver et compresser (c : créer, z : gzip, f : le fichier)\n" +
		"  tar tzf A.tar.gz                         lister le contenu, sans rien extraire\n" +
		"  tar xzf A.tar.gz -C DEST                 extraire dans DEST (qui doit exister)\n" +
		"  sha256sum A.tar.gz > A.tar.gz.sha256     l'empreinte de l'archive\n" +
		"  sha256sum -c A.tar.gz.sha256             la vérifier plus tard : OK\n" +
		"  diff -r A B                              comparer deux dossiers : rien d'affiché, ils sont identiques\n" +
		"  crontab -l ; crontab FICHIER             voir sa crontab ; l'installer depuis un fichier\n" +
		"  30 2 * * * COMMANDE                      minute heure jour mois jour_de_semaine : chaque nuit à 2 h 30",
	mission: "« Ta mission (ssh lac, puis cd ~/echos/portaube, et tout depuis là) : archive le registre en registre.tar.gz (tar czf registre.tar.gz registre). Prends son empreinte dans registre.tar.gz.sha256, et vérifie-la (sha256sum -c). " +
		"Restaure l'archive dans restauration/, et prouve avec diff -r que rien n'a changé. Enfin, que la sauvegarde se fasse seule, chaque nuit : une ligne de crontab qui lance tar sur le registre. »",
	resume: "Les sauvegardes : tar czf, sha256sum, tar xzf -C, diff -r, crontab.",
	etapes: [
		{ titre: "Le registre archivé (tar czf registre.tar.gz registre)", fait: archiveRegistreCh10 },
		{ titre: "L'empreinte de l'archive, vérifiée (sha256sum, sha256sum -c)", fait: empreinteArchiveCh10 },
		{ titre: "La restauration prouvée (tar xzf -C restauration, diff -r)", fait: restaurationCh10 },
		{ titre: "La sauvegarde de chaque nuit (une ligne de crontab avec tar)", fait: cronRegistreCh10 }
	],
	souvenir: { nom: "Eclat-de-Port-Aube", texte: "Un petit coffre de marin, vide, avec une étiquette : « Celui-ci, je l'ai rouvert. Il marche. »" },
	merci: "Le vieux marin du reflet hoche la tête. « Archivée, vérifiée, restaurée, planifiée. La Réserve tient. »",
	fin: "Port-Aube dort dans l'eau, la Réserve bien fermée. « Tes sauvegardes, tu les as rouvertes. »" });

/* La Stele : où l'on en est, écho par écho. */
var SteleEchosCh10 = objetCh10(PontonDesEchosCh10, "Stele", "", "item_sign.gif");
texteVivant(SteleEchosCh10, function(){
	var l = [C.gras("LES SEPT ÉCHOS") + C.gris("  (facultatif, hors note ; ici, l'horloge du lac s'arrête)"), "",
		"Sept reflets, un par chapitre, sans le réseau. Penche-toi sur l'un d'eux (cat NOM), écoute, puis fais sa mission sur lac (ssh lac, puis cd ~/echos).",
		"Sur lac, l'horloge reste arrêtée tant que tu travailles dans ~/echos (même pour le phare : lance ses commandes depuis ~/echos).", ""];
	ECHOS_CH10.forEach(function(e){
		var fait = !!state.quests[e.id], s = etatAnnexe(e.id), n = e.etapes.filter(function(x, k){ return !!s.etapes[k]; }).length;
		l.push("  " + (fait ? C.vert("[x]") : "[ ]") + " " + (e.nom + "            ").substring(0, 10) + " " + e.titre.replace(/^L'Écho [^:]*: /, "") + C.gris(" (" + n + " sur 4)"));
	});
	l.push("", C.gris("Les sept échos : le badge « Gardien des Sept Échos ». Un dossier abîmé : regenerer echos. Le détail : quetes annexes."));
	return l.join("\n");
});

/* Les échos à part des autres annexes : ni dans le compte du chapitre, ni pour « Ami du Lac Profond ». */
var ANNEXES_DU_CHAPITRE_AVANT_ECHOS = annexesDuChapitre;
annexesDuChapitre = function(chapitre){ return ANNEXES_DU_CHAPITRE_AVANT_ECHOS.apply(this, arguments).filter(function(a){ return !a.rappel; }); };
function echosFaitsCh10(){ return ECHOS_CH10.filter(function(e){ return !!state.quests[e.id]; }).length; }
function texteEchosCourtCh10(){
	var proposes = ECHOS_CH10.filter(function(e){ return annexeProposee(annexeParId(e.id)) || state.quests[e.id]; });
	if (!proposes.length) return null;
	var l = [C.gras("  Les Sept Échos") + " (" + echosFaitsCh10() + " sur 7)" + C.gris("  le rappel des chapitres 1 à 7, facultatif et hors note : cat Stele, au Ponton des Échos")];
	proposes.forEach(function(e){ var s = etatAnnexe(e.id), n = e.etapes.filter(function(x, k){ return !!s.etapes[k]; }).length; l.push("    " + (state.quests[e.id] ? C.vert("[x]") : "[ ]") + " " + e.titre + C.gris(" (" + n + " sur 4)")); });
	return l.join("\n");
}
var JOURNAL_AVANT_ECHOS = GameState.prototype.journal;
GameState.prototype.journal = function(detail){
	var t = JOURNAL_AVANT_ECHOS.apply(this, arguments);
	if (!ouverteCh10()) return t;
	if (detail === "annexes" || detail === "annexe"){
		var lignes = ["", C.gras("Les Sept Échos") + C.gris("  (le rappel des chapitres 1 à 7, au Ponton des Échos ; " + echosFaitsCh10() + " sur 7)")];
		ECHOS_CH10.forEach(function(e){
			var a = annexeParId(e.id), s = etatAnnexe(e.id);
			if (!annexeProposee(a) && !state.quests[e.id]){ lignes.push("  " + C.gris("[ ] " + e.titre + " : cat " + e.nom + ", au Ponton des Échos.")); return; }
			lignes.push("  " + (state.quests[e.id] ? C.vert("[x] ") : "[ ] ") + C.gras(e.titre));
			var enCours = false;
			e.etapes.forEach(function(x, k){
				if (s.etapes[k]) lignes.push("      " + C.vert("✓") + " " + x.titre);
				else if (!enCours){ enCours = true; lignes.push("      " + C.jaune("→ " + x.titre)); }
				else lignes.push("      " + C.gris("· " + x.titre));
			});
		});
		return t + "\n" + lignes.join("\n");
	}
	if (detail) return t;
	var b = texteEchosCourtCh10();
	if (!b) return t;
	var tout = String(t).split("\n"), fin = [];
	while (tout.length && /^(\x1b\[[0-9;]*m)*(Niveau |Sorts appris)/.test(tout[tout.length - 1])) fin.unshift(tout.pop());
	if (tout.length && tout[tout.length - 1] === "") tout.pop();
	return tout.concat(["", b, ""], fin).join("\n");
};

/* Les sept faits : le badge. */
var VERIFIER_ANNEXES_AVANT_ECHOS = verifierAnnexes;
verifierAnnexes = function(){
	var r = VERIFIER_ANNEXES_AVANT_ECHOS.apply(this, arguments);
	try {
		if (state && state.quests && !state.has("echos_ch10") && echosFaitsCh10() === ECHOS_CH10.length){
			state.set("echos_ch10");
			if (!state.has("rejeuEnCours")) say(C.jaune("✦ Badge gagné : Gardien des Sept Échos") + C.gris(" · les sept reflets se taisent ensemble, et sur l'eau ne reste que le tien. Wissam, de loin, lève sa lanterne : « Maintenant, tu as tout ce qu'il faut. Descends. »"));
		}
	} catch (e){}
	return r;
};
/* Hors note : ce qu'on fait dans ~/echos ne gagne pas les défis notés du chapitre (on les refera au bon poste). */
var REUSSIR_DEFI_AVANT_ECHOS = reussirDefiCh10;
reussirDefiCh10 = function(id){ if (echosSansHorlogeCh10()) return; return REUSSIR_DEFI_AVANT_ECHOS.apply(this, arguments); };
/* Le umask réglé pendant une session ssh s'arrête avec elle, comme dans un vrai shell. */
var EXIT_AVANT_ECHOS = Shell.sorts.exit;
Shell.sorts.exit = function(args, io){
	try { if (typeof UMASK_SESSION !== "undefined" && Shell.pile_ssh && Shell.pile_ssh.length && UMASK_SESSION.hote === Shell.hote()) UMASK_SESSION.masque = null; } catch (e){}
	return EXIT_AVANT_ECHOS.apply(this, arguments);
};
if (typeof COMPETENCES !== "undefined") COMPETENCES.echos_ch10 = "Gardien des Sept Échos";
if (typeof RANGS_DES_BADGES !== "undefined") RANGS_DES_BADGES.echos_ch10 = "or";

World.fige = true;
