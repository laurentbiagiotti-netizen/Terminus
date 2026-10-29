/**
 * Lac.js : le monde du chapitre 10 pour le joueur (numéro interne 11), le Lac Profond, la grande finale.
 *
 * Sous la Chronothèque, un escalier descend jusqu'à l'eau : le Lac Profond, où l'école déverse depuis dix ans, sans tri,
 * ses journaux, ses exports et ses sauvegardes. Un lac de données. Dans ses profondeurs, nourrie de données sales, a
 * grandi Pipelinus : une pieuvre géante dont chaque bras est un pipeline. Elle lit tous les journaux de l'école ; c'est
 * ainsi qu'elle signait P.G. (« Pipelinus, Gardien du Lac ») et qu'elle datait ses sceaux du lendemain. La flotte noire
 * et le Faussaire étaient deux de ses bras. À l'aube du quatrième jour, la Grande Marée la fera remonter.
 *
 * Ce fichier pose :
 *   - l'horloge du chapitre (J1 06:00, cinq minutes par commande, la nuit au bord du lac, la Grande Marée à l'aube du J4) ;
 *   - la machine lac (10.0.70.10) : Debian 13, docker, le disque des données /srv/lac, les services de l'école
 *     (ingestion, collecteur), le cron qui tourne vraiment la nuit ;
 *   - les données de l'école, tirées pour chaque partie (les captures des six comptoirs du lac, les sondes, les pêcheurs) ;
 *   - les dossiers semés dans la maison du joueur sur lac : rive/, courants/, ecluses/, profondeurs/, arsenal/ ;
 *   - les programmes des conteneurs du chapitre (l'ETL de l'école, le carnet) et le petit outillage postgres qui manquait
 *     (psql qui lit un script, pg_dump, createdb) ;
 *   - les attaques de Pipelinus, que Chapitre10.js déclenche (les huit bras).
 * Le joueur travaille sur lac, par ssh : c'est là que vivent les données.
 *
 * --- Ce que le monde peut appeler ---
 *   sCh10() l'état du chapitre (state.ch10) ; heureCh10() « J2 14:35 » ; maintenantCh10() ; avancerHorlogeCh10()
 *   texteAvantMareeCh10() « la Grande Marée dans 1 j 15 h » ; AUBE_CH10 ; lacOuvert() ; LAC_CH10 (le nom de la machine)
 *   semerLac() (fait à l'entrée) ; DONNEES_CH10 (les données tirées) ; ATTENDUS_CH10 (les réponses justes)
 *   poserEpreuveCh10(n) ; BRAS_CH10 et lancerBrasCh10(cle) : les attaques de la Grande Marée
 *
 * Strictement défensif : on lit, on nettoie, on automatise proprement, on protège, on restaure.
 */

World.fige = false;

/* ------------------------------------------------------------------ */
/* L'horloge : J1 06:00, cinq minutes par commande, l'aube du J4         */
/* ------------------------------------------------------------------ */

var PAS_HORLOGE_CH10 = 5;
var AUBE_CH10 = 3 * 1440 + 360;
var PLAFOND_LIGNE_CH10 = 8;
function etatCh10Initial(){
	return { minutes: 360, compte: 0, compteVu: 0, nuitsVues: 0, vus: {}, rang: 0, postes: {}, trophees: {}, maree: null, assaut: null,
		scoreDepart: null, scoreFinal: null, derniereLigne: null, compteLigne: 0, seme: false, epreuves: {}, bras: {}, attendus: null };
}
function sCh10(){
	if (typeof state === "undefined" || !state) return etatCh10Initial();
	if (!state.ch10 || typeof state.ch10 !== "object") state.ch10 = etatCh10Initial();
	var c = state.ch10;
	if (c.minutes === undefined) c.minutes = 360;
	if (!c.vus) c.vus = {};
	if (!c.bras) c.bras = {};
	if (!c.epreuves) c.epreuves = {};
	return c;
}
function lacOuvert(){
	return typeof state !== "undefined" && state && state.has && state.has("ch10Ouvert") && !(typeof examenEnCours === "function" && examenEnCours());
}
function baseJourCh10(){ var d = new Date(); d.setHours(6, 0, 0, 0); return d.getTime(); }
function minutesCh10(){ var c = sCh10(); return c.minutes + Math.max(0, (c.compte || 0) - (c.compteVu || 0)) * PAS_HORLOGE_CH10; }
function maintenantCh10(){ var c = sCh10(); return (c.base || baseJourCh10()) + (minutesCh10() - 360) * 60000; }
function jourCh10(){ return Math.floor(minutesCh10() / 1440) + 1; }
function heureCh10(){ var m = minutesCh10(); return "J" + (Math.floor(m / 1440) + 1) + " " + deuxChiffres(Math.floor(m % 1440 / 60)) + ":" + deuxChiffres(m % 60); }
function texteAvantMareeCh10(){
	var reste = AUBE_CH10 - minutesCh10();
	if (reste <= 0) return "la Grande Marée est là";
	var j = Math.floor(reste / 1440), h = Math.floor(reste % 1440 / 60), mn = reste % 60;
	return "la Grande Marée dans " + (j ? j + " j " + h + " h" : (h ? h + " h " + deuxChiffres(mn) : mn + " min"));
}
/* Compter une commande (chaque commande simple au premier niveau ; ; && et tubes compris), plafonné par ligne. */
function compterCommandeCh10(n){
	if (!lacOuvert()) return;
	if (!(state.quests && state.quests["n10_entree"])) return;
	var c = sCh10();
	if (c.derniereLigne !== state.nbCommandes){ c.derniereLigne = state.nbCommandes; c.compteLigne = 0; }
	var k = Math.min(n || 1, PLAFOND_LIGNE_CH10 - c.compteLigne);
	if (k <= 0) return;
	c.compteLigne += k;
	c.compte = (c.compte || 0) + k;
}
var PROFONDEUR_CH10 = 0;
var APPELER_AVANT_HORLOGE_CH10 = Shell.appeler;
Shell.appeler = function(nom, args, io){
	if (PROFONDEUR_CH10 === 0 && Shell.profondeur_script === 0) compterCommandeCh10(1);
	PROFONDEUR_CH10++;
	try { return APPELER_AVANT_HORLOGE_CH10.apply(this, arguments); }
	finally { PROFONDEUR_CH10--; }
};
/* Faire passer le temps : les commandes comptées ; une nuit qui tombe saute au matin (06:00), et le cron du lac tourne pendant ce temps. */
function avancerHorlogeCh10(){
	var c = sCh10(), nuits = 0;
	if (!c.base) c.base = baseJourCh10();
	var avant = c.minutes;
	c.minutes += Math.max(0, (c.compte || 0) - (c.compteVu || 0)) * PAS_HORLOGE_CH10;
	c.compteVu = c.compte || 0;
	var garde = 0;
	while (c.minutes % 1440 >= 22 * 60 && c.minutes < AUBE_CH10 && garde++ < 5 && !(state.has && state.has("rejeuEnCours"))){
		c.minutes = (Math.floor(c.minutes / 1440) + 1) * 1440 + 360;
		c.nuitsVues = (c.nuitsVues || 0) + 1;
		nuits++;
	}
	if (c.minutes > avant) try { cronLacCh10(avant, c.minutes); } catch (e){ if (typeof console !== "undefined" && console.error) console.error(e); }
	return { nuits: nuits, minutes: c.minutes, aube: c.minutes >= AUBE_CH10 };
}
function lieuDuChapitre11(lieu){ lieu.chapitre = 11; return lieu; }

/* Les fichiers du joueur portent l'heure du chapitre (git, et le reste du moteur des machines). */
if (typeof gitMaintenant === "function"){
	var GIT_MAINTENANT_AVANT_CH10 = gitMaintenant;
	gitMaintenant = function(h){ return lacOuvert() && state.quests && state.quests["n10_entree"] ? maintenantCh10() : GIT_MAINTENANT_AVANT_CH10.apply(this, arguments); };
}

/* ------------------------------------------------------------------ */
/* Les données de l'école, tirées pour chaque partie                    */
/* ------------------------------------------------------------------ */

var COMPTOIRS_CH10 = ["Anse-Grise", "Roche-Noire", "Pointe-du-Phare", "Baie-des-Brumes", "Gue-Clair", "Port-Aube"];
var REGIONS_CH10 = { "Anse-Grise": "Nord", "Roche-Noire": "Nord", "Pointe-du-Phare": "Ouest", "Baie-des-Brumes": "Ouest", "Gue-Clair": "Sud", "Port-Aube": "Sud" };
var RESPONSABLES_CH10 = { "Anse-Grise": "Ombeline", "Roche-Noire": "Tancrède", "Pointe-du-Phare": "Solène", "Baie-des-Brumes": "Gaspard", "Gue-Clair": "Iris", "Port-Aube": "Marius" };
/* Les espèces : nom, poids d'un lot (kg, min et max), prix moyen au kilo. Deux noms à accent : les pièges de l'encodage. */
var ESPECES_CH10 = [
	["brochet", 2, 45, 14.5], ["perche", 1, 25, 18], ["sandre", 2, 35, 22], ["truite", 1, 30, 16],
	["omble chevalier", 1, 18, 29], ["corégone", 1, 22, 15], ["écrevisse", 0.5, 8, 32], ["anguille", 1, 15, 26]];
/* Les pêcheurs du lac (inventés) : un nom, une adresse, un téléphone. La donnée personnelle du Coffre des Secrets. */
var PECHEURS_CH10 = ["anouk.roseau", "basile.galet", "celia.nenuphar", "dorian.rive", "elise.saule", "fabien.brume", "gaelle.ecume", "hugo.jonc",
	"ines.bruyere", "jules.vase", "katell.ondine", "loan.grebe", "maelle.cresson", "nils.heron", "oceane.limon", "pablo.loutre",
	"quitterie.aulne", "romain.tanche", "sacha.mousse", "thais.berge", "ugo.roselier", "victoire.lagune", "wilfried.carpe", "yanis.marais"];
function emailPecheurCh10(p){ return p + "@lac.lan"; }
function telephonePecheurCh10(p){ var n = condense("tel:" + p); return "06 " + deuxChiffres(10 + n % 89) + " " + deuxChiffres(n % 97) + " " + deuxChiffres(Math.floor(n / 97) % 100) + " " + deuxChiffres(Math.floor(n / 9700) % 100); }
var ENTETE_CAPTURES_CH10 = "id,date,heure,comptoir,espece,poids_kg,prix_kg,pecheur";

function deuxDecimalesCh10(x){ return (Math.round(x * 100) / 100).toFixed(2); }
/* Une capture tirée : sel, numéro, jour (1 à 28 octobre par défaut). */
function captureCh10(sel, n, poids, jours){
	var a = function(k){ return alea("lac:" + sel + ":" + n + ":" + k); };
	var comptoir = choixPondereCh10(COMPTOIRS_CH10, poids, a("c"));
	var e = ESPECES_CH10[Math.floor(a("e") * ESPECES_CH10.length)];
	var kg = e[1] + (e[2] - e[1]) * Math.pow(a("p"), 1.6);
	var prix = e[3] * (0.85 + 0.3 * a("x"));
	var jour = (jours ? jours[0] : 1) + Math.floor(a("j") * ((jours ? jours[1] - jours[0] : 27) + 1));
	var h = 4 + Math.floor(a("h") * 8), m = Math.floor(a("m") * 60);
	var p = PECHEURS_CH10[Math.floor(a("q") * PECHEURS_CH10.length)];
	return { id: "C" + ("0000" + n).slice(-4), date: "2026-10-" + deuxChiffres(jour), heure: deuxChiffres(h) + ":" + deuxChiffres(m), comptoir: comptoir,
		espece: e[0], poids: deuxDecimalesCh10(kg), prix: deuxDecimalesCh10(prix), pecheur: p };
}
function choixPondereCh10(liste, poids, x){
	var total = poids.reduce(function(s, v){ return s + v; }, 0), acc = 0;
	for (var i = 0; i < liste.length; i++){ acc += poids[i] / total; if (x < acc) return liste[i]; }
	return liste[liste.length - 1];
}
function ligneCaptureCh10(c){ return [c.id, c.date, c.heure, c.comptoir, c.espece, c.poids, c.prix, emailPecheurCh10(c.pecheur)].join(","); }
function trierCapturesCh10(l){ return l.slice().sort(function(a, b){ return (a.date + a.heure + a.id).localeCompare(b.date + b.heure + b.id); }); }

/* Les données de la partie : construites une fois, rangées dans DONNEES_CH10 (rien n'est sauvegardé : tout se retire de la graine). */
var DONNEES_CH10 = null;
function donneesCh10(){
	if (DONNEES_CH10) return DONNEES_CH10;
	var D = {};
	// Les poids des comptoirs : chaque partie a son comptoir le plus actif.
	var poids = COMPTOIRS_CH10.map(function(c, i){ return 2 + aleaEntier("lac:poids:" + c, 0, 9) + (i === aleaEntier("lac:premier", 0, 5) ? 6 : 0); });
	var captures = [];
	for (var n = 1; n <= 360; n++) captures.push(captureCh10("rive", n, poids));
	// Une égalité en tête se brise : le premier gagne une capture d'avance (tirée elle aussi).
	var cpt = {};
	captures.forEach(function(c){ cpt[c.comptoir] = (cpt[c.comptoir] || 0) + 1; });
	var tete = Object.keys(cpt).sort(function(a, b){ return cpt[b] - cpt[a] || a.localeCompare(b); });
	if (tete.length > 1 && cpt[tete[0]] === cpt[tete[1]]) captures.push(captureCh10("rive-extra", 1, COMPTOIRS_CH10.map(function(c){ return c === tete[0] ? 1 : 0; })));
	D.captures = trierCapturesCh10(captures);
	D.captures.forEach(function(c, i){ c.id = "C" + ("0000" + (i + 1)).slice(-4); });
	D.attendus = attendusRiveCh10(D.captures);
	// Le Filet percé (épreuve I) : une autre semaine, au format français (point-virgule, virgule décimale).
	var filet = [];
	for (var k = 1; k <= 150; k++) filet.push(captureCh10("filet", k, poids.slice().reverse(), [20, 26]));
	D.filet = trierCapturesCh10(filet);
	D.attendusFilet = attendusFiletCh10(D.filet);
	// Les sondes du lac : une mesure par sonde et par quart d'heure (pour découper et compresser).
	D.sondes = [];
	var sondes = ["S01", "S02", "S03", "S04", "S05", "S06"];
	for (var t = 0; t < 400; t++){
		var heure = deuxChiffres(Math.floor(t / 4) % 24) + ":" + deuxChiffres((t % 4) * 15);
		var jour = 20 + Math.floor(t / 96);
		sondes.forEach(function(s, i){
			var prof = 5 + i * 7, temp = 14 - prof * 0.18 + alea("lac:t:" + t + s) * 0.8, oxy = 9.5 - prof * 0.05 + alea("lac:o:" + t + s);
			D.sondes.push(s + ",2026-10-" + deuxChiffres(jour) + "T" + heure + ":00," + prof + "," + deuxDecimalesCh10(temp) + "," + deuxDecimalesCh10(oxy));
		});
	}
	DONNEES_CH10 = D;
	return D;
}
/* Les réponses justes de la Rive (questions 1 à 5), et les paramètres tirés des questions. */
function attendusRiveCh10(l){
	var A = {};
	var parComptoir = {};
	l.forEach(function(c){ parComptoir[c.comptoir] = (parComptoir[c.comptoir] || 0) + 1; });
	var tri = Object.keys(parComptoir).sort(function(a, b){ return parComptoir[b] - parComptoir[a] || a.localeCompare(b); });
	A.q1 = tri[0];
	A.comptes = parComptoir;
	// 2 : les lots de plus de 30 kg d'un comptoir tiré (il en faut au moins un).
	var candidats = COMPTOIRS_CH10.filter(function(c){ return l.some(function(x){ return x.comptoir === c && +x.poids > 30; }); });
	A.comptoirQ2 = candidats.length ? candidats[aleaEntier("lac:q2", 0, candidats.length - 1)] : COMPTOIRS_CH10[0];
	A.q2 = l.filter(function(x){ return x.comptoir === A.comptoirQ2 && +x.poids > 30; }).length;
	// 3 : le poids total d'une espèce (au kilo près).
	A.especeQ3 = ["brochet", "sandre", "truite", "perche"][aleaEntier("lac:q3", 0, 3)];
	A.q3 = l.filter(function(x){ return x.espece === A.especeQ3; }).reduce(function(s, x){ return s + (+x.poids); }, 0);
	// 4 : le prix médian au kilo d'une espèce.
	A.especeQ4 = ["anguille", "omble chevalier", "corégone", "écrevisse"][aleaEntier("lac:q4", 0, 3)];
	var prix = l.filter(function(x){ return x.espece === A.especeQ4; }).map(function(x){ return +x.prix; }).sort(function(a, b){ return a - b; });
	A.q4 = prix.length ? (prix.length % 2 ? prix[(prix.length - 1) / 2] : (prix[prix.length / 2 - 1] + prix[prix.length / 2]) / 2) : 0;
	// 5 : l'espèce au poids moyen par lot le plus élevé.
	var somme = {}, nb = {};
	l.forEach(function(x){ somme[x.espece] = (somme[x.espece] || 0) + (+x.poids); nb[x.espece] = (nb[x.espece] || 0) + 1; });
	A.moyennes = {};
	Object.keys(somme).forEach(function(e){ A.moyennes[e] = somme[e] / nb[e]; });
	A.q5 = Object.keys(A.moyennes).sort(function(a, b){ return A.moyennes[b] - A.moyennes[a]; })[0];
	return A;
}
function attendusFiletCh10(l){
	var A = {}, pech = {}, parJour = {}, prix = {}, nb = {};
	l.forEach(function(x){ pech[x.pecheur] = true; parJour[x.date] = (parJour[x.date] || 0) + (+x.poids); prix[x.comptoir] = (prix[x.comptoir] || 0) + (+x.prix); nb[x.comptoir] = (nb[x.comptoir] || 0) + 1; });
	A.q1 = Object.keys(pech).length;
	A.q2 = Object.keys(parJour).sort(function(a, b){ return parJour[b] - parJour[a]; })[0];
	A.parJour = parJour;
	A.moyennesPrix = {};
	Object.keys(prix).forEach(function(c){ A.moyennesPrix[c] = prix[c] / nb[c]; });
	A.q3 = Object.keys(A.moyennesPrix).sort(function(a, b){ return A.moyennesPrix[a] - A.moyennesPrix[b]; })[0];
	return A;
}
function texteCapturesCh10(l){ return ENTETE_CAPTURES_CH10 + "\n" + l.map(ligneCaptureCh10).join("\n") + "\n"; }
/* Le format français : point-virgule, virgule décimale (le piège du Filet percé). */
function texteFiletCh10(l){
	return "date;comptoir;espece;poids_kg;prix_kg;pecheur\n" + l.map(function(c){ return [c.date, c.comptoir, c.espece, c.poids.replace(".", ","), c.prix.replace(".", ","), emailPecheurCh10(c.pecheur)].join(";"); }).join("\n") + "\n";
}
function texteComptoirsCh10(){
	return "comptoir,region,responsable\n" + COMPTOIRS_CH10.slice().sort().map(function(c){ return c + "," + REGIONS_CH10[c] + "," + RESPONSABLES_CH10[c]; }).join("\n") + "\n";
}
var ATTENDUS_CH10 = null;
function attendusCh10(){ return donneesCh10().attendus; }

/* ------------------------------------------------------------------ */
/* La machine lac : Debian 13, docker, le disque des données             */
/* ------------------------------------------------------------------ */

var LAC_CH10 = "lac";
var IP_LAC_CH10 = "10.0.70.10";
var DOMAINE_LAC_CH10 = "lac.cybersup.lan";
var NOYAU_LAC_CH10 = "6.12.9-amd64";
var GIO10 = 1073741824, MIO10 = 1048576;
var RacineLacCh10 = null;
function estLacCh10(){ try { return !!(HOTES[LAC_CH10] && HOTES[LAC_CH10].arrivee && racineDe(HOTES[LAC_CH10].arrivee()) === RacineLacCh10); } catch (e){ return false; } }
function refusLacCh10(){
	if (!estLacCh10()) return null;
	if (!state.has("ch10Ouvert")) return "ssh: Could not resolve hostname " + LAC_CH10 + ": Name or service not known\n" + C.gris("(Cette machine est sous le Lac Profond, au chapitre 10.)");
	return null;
}
function homeLacCh10(){ return "/home/" + JOUEUR; }
function materielLacCh10(){
	var base = baseJourCh10(), h = LAC_CH10;
	return {
		cpus: 4, memoire: { total: 8152340, noyau: 260000, cache: 910000 }, demarrage: base - 52 * 3600000, fuseau: "Europe/Paris", derive: 0,
		demarrages: [{ idx: 0, debut: base - 52 * 3600000, noyau: NOYAU_LAC_CH10 }], noyauAttendu: NOYAU_LAC_CH10,
		disques: [{ nom: "vda", taille: 64 * GIO10, modele: "QEMU HARDDISK", parts: [{ nom: "vda1", taille: 63 * GIO10, partuuid: hexDe("pu10" + h, 8) + "-01" }], smart: { sain: true, realloues: 0, heures: 52, temperature: 32 } },
			{ nom: "vdb", taille: 120 * GIO10, modele: "QEMU HARDDISK", parts: [{ nom: "vdb1", taille: 120 * GIO10 - MIO10, partuuid: hexDe("pu10b" + h, 8) + "-01" }], smart: { sain: true, realloues: 0, heures: 52, temperature: 33 } }],
		raid: [], pvs: [], vgs: [], lvs: [], virtuels: {},
		fs: [{ source: "/dev/vda1", cible: "/", type: "ext4", taille: 63 * GIO10, inodes: 4128768, base: 3.4 * GIO10, baseInodes: 104000, uuid: hexDe("uuid10-" + h, 8) + "-" + hexDe("uuid102-" + h, 4) + "-4" + hexDe("uuid103-" + h, 3) + "-8" + hexDe("uuid104-" + h, 3) + "-" + hexDe("uuid105-" + h, 12), reserve: 0.05, options: "errors=remount-ro", systeme: true },
			{ source: "/dev/vdb1", cible: "/srv/lac", type: "ext4", taille: 120 * GIO10 - MIO10, inodes: 7864320, base: 2.1 * GIO10, baseInodes: 2400, uuid: hexDe("uuid10l-" + h, 8) + "-" + hexDe("uuid10l2-" + h, 4) + "-4" + hexDe("uuid10l3-" + h, 3) + "-8" + hexDe("uuid10l4-" + h, 3) + "-" + hexDe("uuid10l5-" + h, 12), reserve: 0.01, options: "defaults,noatime" },
			{ source: "tmpfs", cible: "/run", type: "tmpfs", taille: 796 * MIO10, virtuel: true, utilise: 3 * MIO10, inodes: 998000, inodesUtilises: 1200, cache: true }],
		procs: [], io: { vda: { util: 4, r: 3, w: 9 }, vdb: { util: 12, r: 18, w: 31 } }, sockets: { estab: 9, closed: 0, orphaned: 0, timewait: 6 },
		dpkg: { interrompu: false, casses: [], retenus: [], aConfigurer: [] }, fabricant: "Les Profondeurs de Cybersup", modele: "Lac " + h
	};
}
/* Les services de l'école sur lac : l'ingestion (le lac reçoit), le collecteur (il retient un fichier effacé), le déversoir (Pipelinus). */
var UNITES_LAC_CH10 = {
	"ingestion.service": uniteIle("Ingestion du lac : les arrivées de /srv/lac/entree vers /srv/lac/propre", { texte: "Type=simple\nUser=ingestion\nEnvironmentFile=/etc/lac/ingestion.conf\nExecStart=/usr/local/bin/ingestion --entree /srv/lac/entree --sortie /srv/lac/propre\nRestart=on-failure\nRestartSec=5", unit: "Documentation=file:/srv/lac/LISEZMOI\nAfter=network.target local-fs.target\n" }),
	"collecteur.service": uniteIle("Collecteur des sondes du lac", { texte: "Type=simple\nUser=ingestion\nExecStart=/usr/local/bin/collecteur --tampon /srv/lac/tmp\nRestart=on-failure", unit: "After=network.target\n" }),
	"deversoir.service": uniteIle("Déversoir", { texte: "Type=simple\nUser=ingestion\nExecStart=/usr/local/bin/deversoir --vers /srv/lac/journaux\nRestart=always", unit: "After=network.target\n" })
};
var PROFILS_LAC_CH10 = {
	"ingestion.service": function(h, M){
		var debug = /^\s*LOG_LEVEL\s*=\s*"?DEBUG"?\s*$/mi.test(texteHote(h, "/etc/lac/ingestion.conf") || "");
		return [{ comm: "ingestion", cmd: "/usr/local/bin/ingestion --entree /srv/lac/entree --sortie /srv/lac/propre", user: "ingestion", cpu: debug ? 23 : 1.2, rss: 58000,
			fichiers: [{ fd: "3w", chemin: debug ? "/srv/lac/journaux/ingestion-debug.log" : "/srv/lac/journaux/ingestion.log", taille: 0 }] }];
	},
	"collecteur.service": function(h, M){
		var c = sCh10(), tenu = c.fantome && !c.fantome.libere;
		return [{ comm: "collecteur", cmd: "/usr/local/bin/collecteur --tampon /srv/lac/tmp", user: "ingestion", cpu: 0.6, rss: 21000,
			fichiers: tenu ? [{ fd: "4w", chemin: "/srv/lac/tmp/tampon-sondes.bin", supprime: true, taille: c.fantome.taille, fs: "/dev/vdb1" }] : [{ fd: "4w", chemin: "/srv/lac/tmp/tampon-sondes.bin", taille: 0 }] }];
	},
	"deversoir.service": function(){ return [{ comm: "deversoir", cmd: "/usr/local/bin/deversoir --vers /srv/lac/journaux", user: "ingestion", cpu: 61, rss: 33000, fichiers: [{ fd: "3w", chemin: "/srv/lac/journaux/maree.log", taille: 0 }] }]; }
};
(function poserLacCh10(){
	var h = LAC_CH10;
	var racine = lieuDuChapitre11(new Room(h, "La machine lac : le serveur des données de l'école, sous le Lac Profond. Dix ans de journaux, d'exports et de sauvegardes déversés sans tri dans /srv/lac. Docker y tourne, et quelque chose d'autre, plus bas.", "loc_lac_machine.gif"));
	racine.racineHote = h;
	racine.owner = "root";
	racine.mode = "rwxr-xr-x";
	racine.removeCommand("cd");
	racine.addCmdText("cd", "Cette machine n'a pas de porte : on s'y connecte par le réseau. ssh " + h);
	if (typeof Machines !== "undefined") link_rooms(Machines, racine);
	RacineLacCh10 = racine;
	decrireHote(h, { ip: IP_LAC_CH10, ouvert: true, noyau: NOYAU_LAC_CH10,
		arrivee: function(){ var m = racine.getChildFromName("home"); m = m && m !== -1 ? m.getChildFromName(JOUEUR) : null; return m && m !== -1 ? m : racine; },
		refus: function(){ return refusLacCh10(); } });
	var profils = {};
	if (typeof PROFILS_ILE !== "undefined") Object.keys(PROFILS_ILE).forEach(function(u){ profils[u] = function(hh, M, lim){ return PROFILS_ILE[u](hh, M, lim); }; });
	if (typeof PROFILS_PORT !== "undefined") Object.keys(PROFILS_PORT).forEach(function(u){ profils[u] = function(hh, M, lim){ return PROFILS_PORT[u](hh, M, lim); }; });
	Object.keys(PROFILS_LAC_CH10).forEach(function(u){ profils[u] = function(hh, M, lim){ return PROFILS_LAC_CH10[u](hh, M, lim); }; });
	declarerMachine(h, {
		actif: function(){ return lacOuvert() && estLacCh10(); },
		maintenant: function(){ return maintenantCh10(); },
		pas: PAS_HORLOGE_CH10,
		initial: function(){ return materielLacCh10(); },
		profils: profils,
		tempsDemarrage: { "ssh.service": 205, "cron.service": 28, "docker.service": 1310, "containerd.service": 420, "docker.socket": 12, "ingestion.service": 340, "collecteur.service": 120 }
	});
	var P = function(chemin, texte, options){ return poserFichierHote(h, chemin, texte, options || {}); };
	var D = function(chemin, options){ return creerDossierHote(h, chemin, options || {}); };
	P("/etc/hostname", h + "\n");
	P("/etc/hosts", "127.0.0.1\tlocalhost\n127.0.1.1\t" + h + "." + DOMAINE_LAC_CH10 + " " + h + "\n" + IP_LAC_CH10 + "\t" + h + "." + DOMAINE_LAC_CH10 + "\t" + h + "\n");
	P("/etc/resolv.conf", "search " + DOMAINE_LAC_CH10 + "\nnameserver 10.0.70.1\n");
	P("/etc/debian_version", "13.1\n");
	P("/etc/os-release", "PRETTY_NAME=\"Debian GNU/Linux 13 (trixie)\"\nNAME=\"Debian GNU/Linux\"\nVERSION_ID=\"13\"\nVERSION=\"13 (trixie)\"\nVERSION_CODENAME=trixie\nDEBIAN_VERSION_FULL=13.1\nID=debian\n");
	var comptes = [["root", 0, 0, "root", "/root", "/bin/bash"], ["daemon", 1, 1, "daemon", "/usr/sbin", "/usr/sbin/nologin"], ["bin", 2, 2, "bin", "/bin", "/usr/sbin/nologin"],
		["sys", 3, 3, "sys", "/dev", "/usr/sbin/nologin"], ["www-data", 33, 33, "www-data", "/var/www", "/usr/sbin/nologin"], ["backup", 34, 34, "backup", "/var/backups", "/usr/sbin/nologin"],
		["nobody", 65534, 65534, "nobody", "/nonexistent", "/usr/sbin/nologin"], ["sshd", 101, 65534, "", "/run/sshd", "/usr/sbin/nologin"],
		["ingestion", 990, 990, "Ingestion du lac", "/srv/lac", "/usr/sbin/nologin"], ["wissam", 1001, 1001, "Wissam,,,", "/home/wissam", "/bin/bash"],
		[JOUEUR, 1000, 1000, "Riverain du Lac,,,", "/home/" + JOUEUR, "/bin/bash"]];
	P("/etc/passwd", comptes.map(function(c){ return c[0] + ":x:" + c[1] + ":" + c[2] + ":" + c[3] + ":" + c[4] + ":" + c[5]; }).join("\n") + "\n");
	P("/etc/shadow", comptes.map(function(c){ return c[0] + ":" + (c[0] === JOUEUR ? "$y$j9T$" + hexDe("lac-sel", 22) + "$" + hexDe("lac-mdp", 43) : "*") + ":20378:0:99999:7:::"; }).join("\n") + "\n", { mode: "rw-r-----" });
	P("/etc/group", ["root:x:0:", "adm:x:4:" + JOUEUR, "sudo:x:27:" + JOUEUR, "users:x:100:" + JOUEUR, "www-data:x:33:", "backup:x:34:", "nogroup:x:65534:", "systemd-journal:x:999:" + JOUEUR,
		"docker:x:989:" + JOUEUR, "ingestion:x:990:", "analystes:x:1500:wissam", "wissam:x:1001:", JOUEUR + ":x:1000:"].join("\n") + "\n");
	if (typeof SSHD_CONFIG_DEBIAN !== "undefined") P("/etc/ssh/sshd_config", SSHD_CONFIG_DEBIAN);
	P("/etc/ssh/ssh_host_ed25519_key.pub", "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAI" + btoa(hexDe("hote10-" + h, 24)).substring(0, 43) + " root@" + h + "\n");
	["/usr/sbin/sshd", "/usr/sbin/cron", "/usr/bin/curl", "/usr/bin/jq", "/usr/bin/tar", "/usr/bin/sha256sum", "/usr/bin/zstd", "/usr/bin/python3"].forEach(function(b){ P(b, "ELF " + b.split("/").pop() + "\n", { mode: "rwxr-xr-x", binaire: { sortie: "" } }); });
	["/usr/local/bin/ingestion", "/usr/local/bin/collecteur"].forEach(function(b){ P(b, "ELF " + b.split("/").pop() + "\n", { mode: "rwxr-xr-x", binaire: { sortie: "" } }); });
	["ssh.service", "cron.service", "systemd-journald.service"].forEach(function(u){ if (typeof UNITES_ILE !== "undefined" && UNITES_ILE[u]) P("/lib/systemd/system/" + u, UNITES_ILE[u]); });
	Object.keys(UNITES_LAC_CH10).forEach(function(u){ if (u !== "deversoir.service") P("/etc/systemd/system/" + u, UNITES_LAC_CH10[u]); });
	if (typeof UNITES_PORT !== "undefined") ["docker.service", "docker.socket", "containerd.service"].forEach(function(u){ P("/lib/systemd/system/" + u, UNITES_PORT[u]); });
	D("/etc/systemd/system");
	D("/etc/docker");
	D("/etc/lac");
	P("/etc/lac/ingestion.conf", "# Les réglages de l'ingestion du lac (lus au démarrage du service).\nENTREE=/srv/lac/entree\nSORTIE=/srv/lac/propre\nLOG_LEVEL=INFO\n");
	D("/etc/logrotate.d");
	P("/etc/logrotate.conf", "# see \"man logrotate\" for details\nweekly\nrotate 4\ncreate\ninclude /etc/logrotate.d\n");
	D("/root", { mode: "rwx------" });
	D("/home/" + JOUEUR, { owner: JOUEUR, mode: "rwxr-x---" });
	D("/home/" + JOUEUR + "/.ssh", { owner: JOUEUR, mode: "rwx------" });
	D("/home/wissam", { owner: "wissam", mode: "rwxr-x---" });
	D("/tmp", { mode: "rwxrwxrwt" });
	D("/var/tmp", { mode: "rwxrwxrwt" });
	D("/var/log");
	D("/var/lib/docker", { mode: "rwx--x---" });
	D("/var/lib/docker/volumes", { mode: "rwx------" });
	D("/var/lib/docker/containers", { mode: "rwx--x---" });
	D("/run");
	var sock = P("/var/run/docker.sock", "", { mode: "rw-rw----", owner: "root" }); sock.socket = true; sock.groupe = "docker"; sock.taille = 0;
	var sock2 = P("/run/docker.sock", "", { mode: "rw-rw----", owner: "root" }); sock2.socket = true; sock2.groupe = "docker"; sock2.taille = 0;
	["/usr/bin/docker", "/usr/sbin/dockerd", "/usr/sbin/docker-proxy", "/usr/sbin/docker-init", "/usr/bin/containerd", "/usr/bin/containerd-shim-runc-v2", "/usr/sbin/runc",
		"/usr/libexec/docker/cli-plugins/docker-compose", "/usr/libexec/docker/cli-plugins/docker-buildx"].forEach(function(b){ P(b, "ELF " + b.split("/").pop() + "\n", { mode: "rwxr-xr-x", binaire: { sortie: "" } }); });
	D("/proc");
	["meminfo", "loadavg", "uptime", "cpuinfo", "mounts", "version", "swaps"].forEach(function(n){
		var it = P("/proc/" + n, "", { mode: "r--r--r--" });
		it.taille = 0;
		texteVivant(it, function(){ return lacOuvert() && estLacCh10() && state && state.reseau && state.reseau.machines && state.reseau.machines[h] && typeof texteProcMachine === "function" ? texteProcMachine(h, n) : ""; });
	});
	D("/srv/lac", { mode: "rwxr-xr-x" });
	(function marquer(lieu){ lieu.children.forEach(function(x){ if (x !== lieu && x.parents[0] === lieu){ x.horsBareme = true; x.chapitre = 11; marquer(x); } }); })(racine);
})();

/* lac est une machine docker comme celles du Grand Port : le même moteur, sa propre horloge. */
IP_PORT[LAC_CH10] = IP_LAC_CH10;
var EST_HOTE_PORT_AVANT_CH10 = estHotePort;
estHotePort = function(h){ if (h === LAC_CH10) return typeof estMachine === "function" && estMachine(h); return EST_HOTE_PORT_AVANT_CH10.apply(this, arguments); };
var EST_HOTE_DOCKER_PORT_AVANT_CH10 = estHoteDockerPort;
estHoteDockerPort = function(h){ if (h === LAC_CH10) return estHotePort(h); return EST_HOTE_DOCKER_PORT_AVANT_CH10.apply(this, arguments); };
/* Le tic docker de lac (celui du port ne tourne que si le Grand Port est ouvert). */
surTicMachine(function(h, M){
	if (h !== LAC_CH10 || !lacOuvert() || grandPortOuvert()) return;
	if (!M.port) return;
	if (typeof ticPort === "function") ticPort(h, M);
});
/* Les déclarations d'unités vivent en mémoire : elles se refont à chaque chargement de la page (l'état des unités, lui, est sauvegardé). */
var UNITES_LAC_DECLAREES_CH10 = false;
function declarerUnitesLacCh10(){
	var c = sCh10();
	if (UNITES_LAC_DECLAREES_CH10 || !estLacCh10()) return;
	UNITES_LAC_DECLAREES_CH10 = true;
	if (c.bras && c.bras.deluge){ try { declarerUnite(LAC_CH10, "deversoir.service", { actif: true, enabled: true }); } catch (e){} }
	[["ssh.service", true, true], ["cron.service", true, true], ["systemd-journald.service", true, true], ["docker.service", true, true], ["docker.socket", true, true], ["containerd.service", true, true],
		["ingestion.service", true, true], ["collecteur.service", true, true]].forEach(function(x){ try { declarerUnite(LAC_CH10, x[0], { actif: x[1], enabled: x[2] }); } catch (e){} });
	try { declarerEcoute(LAC_CH10, "ssh", [{ proto: "tcp", adresse: "0.0.0.0", port: 22 }]); } catch (e){}
	try { declarerNoyau(LAC_CH10, { version: NOYAU_LAC_CH10 }); } catch (e){}
}

/* ------------------------------------------------------------------ */
/* Les fichiers semés sur lac                                          */
/* ------------------------------------------------------------------ */

/* Un dossier de la maison du joueur sur lac (chaque niveau au joueur). */
function dossierLacCh10(chemin, mode){
	var morceaux = String(chemin).replace(/^~\/?/, "").split("/").filter(Boolean), acc = homeLacCh10(), d = null;
	morceaux.forEach(function(m, i){
		acc += "/" + m;
		d = dossierHote(LAC_CH10, acc);
		if (!d){ d = creerDossierHote(LAC_CH10, acc, { owner: JOUEUR, mode: (i === morceaux.length - 1 && mode) || "rwxr-xr-x", image: "loc_lac_dossier.gif", intro: "Un dossier de ta maison, sur lac." }); }
		if (d){ d.owner = JOUEUR; d.horsBareme = true; d.chapitre = 11; }
	});
	return d;
}
/* Un fichier de la maison du joueur sur lac (~/chemin), à lui. options : mode, encodage, taille, ageJours. */
function fichierLacCh10(chemin, texte, options){
	options = options || {};
	var rel = String(chemin).replace(/^~\/?/, ""), coupe = rel.lastIndexOf("/");
	if (coupe > 0) dossierLacCh10(rel.substring(0, coupe));
	var it = poserFichierHote(LAC_CH10, homeLacCh10() + "/" + rel, texte, { owner: JOUEUR, mode: options.mode || "rw-r--r--" });
	if (!it) return null;
	it.owner = JOUEUR;
	if (options.encodage) it.encodage = options.encodage; else delete it.encodage;
	if (options.taille) it.taille = options.taille;
	if (options.ageJours !== undefined) it.mtimeMs = maintenantCh10() - options.ageJours * 86400000 - 3600000;
	if (options.sansFin) it.sansFinDeLigne = true;
	return it;
}
/* Un fichier système de lac (racine, ou /srv/lac). */
function fichierSysLacCh10(chemin, texte, options){
	options = options || {};
	var it = poserFichierHote(LAC_CH10, chemin, texte, { owner: options.owner || "root", mode: options.mode || "rw-r--r--" });
	if (!it) return null;
	if (options.taille) it.taille = options.taille;
	if (options.ageJours !== undefined) it.mtimeMs = maintenantCh10() - options.ageJours * 86400000 - 3600000;
	if (options.groupe) it.groupe = options.groupe;
	return it;
}
function texteLacCh10(chemin){ var p = String(chemin).replace(/^~/, homeLacCh10()); try { return texteHote(LAC_CH10, p); } catch (e){ return null; } }
function noeudLacCh10(chemin){ var p = String(chemin).replace(/^~/, homeLacCh10()); try { return noeudHote(LAC_CH10, p); } catch (e){ return null; } }
function supprimerLacCh10(chemin){
	var p = String(chemin).replace(/^~/, homeLacCh10()), coupe = p.lastIndexOf("/");
	var d = dossierHote(LAC_CH10, p.substring(0, coupe) || "/");
	if (!d) return false;
	var n = d.getNode(p.substring(coupe + 1));
	if (n instanceof Room){ var i = d.children.indexOf(n); if (i > -1) d.children.splice(i, 1); return true; }
	return !!d.removeItem(p.substring(coupe + 1));
}

/* Les textes : les questions, les scripts, les notes. */
function reponsesRiveCh10(){
	var A = attendusCh10();
	return "# Les réponses de la Rive\n\nÉcris chaque réponse après « Réponse : », sur la même ligne. Les nombres avec un point (12.5).\n\n" +
		"1. Quel comptoir a enregistré le plus de captures (de lignes) ?\nRéponse : \n\n" +
		"2. Combien de lots de plus de 30 kg à " + A.comptoirQ2 + " ?\nRéponse : \n\n" +
		"3. Combien de kilos de " + A.especeQ3 + " en tout, au kilo près ?\nRéponse : \n\n" +
		"4. Quel est le prix médian au kilo de " + A.especeQ4 + " ?\nRéponse : \n\n" +
		"5. Quelle espèce a le poids moyen par lot le plus élevé ?\nRéponse : \n";
}
var TEXTES_LAC_CH10 = {
	lisezmoiLac: "Le Lac Profond : le disque des données de l'école (/dev/vdb1, 120 Go).\n\n" +
		"  journaux/     les journaux de tous les services, depuis toujours (personne ne les a jamais tournés)\n" +
		"  sauvegardes/  les sauvegardes de la base\n" +
		"  entree/       ce qui arrive (les arrivages des comptoirs), lu par le service ingestion\n" +
		"  propre/       ce qui en sort, propre\n" +
		"  public/       ce que l'école publie (rien de personnel ici, jamais)\n" +
		"  tmp/          le tampon du collecteur des sondes\n\n" +
		"On ne supprime jamais une donnée du lac sans la mettre de côté : on compresse, on archive, on met en quarantaine.\n",
	ecluse: "#!/bin/bash\n# ecluse.sh : le bilan d'une arrivée, en kilos par comptoir. Utilisation : ./ecluse.sh FICHIER\n" +
		"fichier=$1\ntmp=/tmp/ecluse.tmp\n" +
		"tail -n +2 $fichier | cut -d, -f4,6 > $tmp\nmkdir -p sortie\n" +
		"awk -F, '{ kg[$1] += $2 } END { for (c in kg) printf \"%s,%.2f\\n\", c, kg[c] }' $tmp | sort > sortie/bilan.csv\n" +
		"echo \"Bilan écrit dans sortie/bilan.csv\"\n",
	nuit: "#!/bin/bash\n# nuit.sh : le travail de nuit de l'écluse (lancé par cron à 02:30).\nset -euo pipefail\ncd \"$(dirname \"$0\")\"\n./ecluse.sh \"donnees/arrivee du soir.csv\"\necho \"$(date '+%F %T') nuit terminée\"\n",
	pipeline: "#!/bin/bash\n# pipeline.sh : chaque nuit, la température moyenne de chaque sonde, d'après les relevés horaires.\n" +
		"cd ~/ecluse-bloquee\n" +
		"zcat sondes/*.csv.gz | awk -F, '{ t[$1] += $4; n[$1]++ } END { for (s in t) printf \"%s,%.2f\\n\", s, t[s]/n[s] }' | sort > moyennes.csv\n" +
		"echo \"Moyennes écrites : $(wc -l < moyennes.csv) sondes\"\n",
	agreger: "#!/bin/bash\n# agreger.sh : la grande agrégation mensuelle. Longue et gourmande : elle ne doit jamais écraser la machine.\nset -euo pipefail\n" +
		"awk -F, 'NR > 1 { kg[$5] += $6 } END { for (e in kg) printf \"%s,%.2f\\n\", e, kg[e] }' ~/rive/captures.csv | sort > ~/profondeurs/mensuel.csv\n" +
		"echo \"Agrégation mensuelle écrite : $(wc -l < ~/profondeurs/mensuel.csv) espèces\"\n",
	valider: "#!/bin/bash\n# valider.sh : la vanne de l'école. Utilisation : ./valider.sh propre.csv\n" +
		"f=\"${1:?Utilisation : ./valider.sh propre.csv}\"\nok=0\n" +
		"[ -f \"$f\" ] || { echo \"ÉCHEC : $f n'existe pas\"; exit 1; }\n" +
		"if file -i \"$f\" | grep -q \"iso-8859\"; then echo \"ÉCHEC : le fichier est encore en latin1 (iconv)\"; ok=1; fi\n" +
		"if grep -q $'\\r' \"$f\"; then echo \"ÉCHEC : des fins de ligne CRLF (dos2unix)\"; ok=1; fi\n" +
		"if [ \"$(head -n 1 \"$f\")\" != \"" + ENTETE_CAPTURES_CH10 + "\" ]; then echo \"ÉCHEC : la première ligne n'est pas l'en-tête attendu\"; ok=1; fi\n" +
		"if [ \"$(tail -n +2 \"$f\" | sort | uniq -d | wc -l)\" -ne 0 ]; then echo \"ÉCHEC : des doublons\"; ok=1; fi\n" +
		"if [ \"$(awk -F, 'NR > 1 && NF != 8' \"$f\" | wc -l)\" -ne 0 ]; then echo \"ÉCHEC : des lignes qui n'ont pas 8 champs\"; ok=1; fi\n" +
		"if [ \"$(awk -F, 'NR > 1 && $6 !~ /^[0-9]+(\\.[0-9]+)?$/' \"$f\" | wc -l)\" -ne 0 ]; then echo \"ÉCHEC : des poids qui ne sont pas des nombres\"; ok=1; fi\n" +
		"if [ \"$(awk -F, 'NR > 1 && $2 !~ /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/' \"$f\" | wc -l)\" -ne 0 ]; then echo \"ÉCHEC : des dates qui ne sont pas au format AAAA-MM-JJ\"; ok=1; fi\n" +
		"if [ \"$ok\" -eq 0 ]; then echo \"La vanne s'ouvre : $f est propre ($(tail -n +2 \"$f\" | wc -l) captures).\"; fi\n" +
		"exit \"$ok\"\n",
	etl: "# etl-lac : l'ETL de l'école. Lit les captures, écrit les agrégats par comptoir (et les charge dans la base si DB_HOST est donné).\n" +
		"import os\nimport epuisette\n\n" +
		"DONNEES = os.environ.get(\"DONNEES\", \"/data/captures.csv\")\nSORTIE = os.environ.get(\"SORTIE\", \"/sortie/agregats.csv\")\n\n" +
		"captures = epuisette.lire_csv(DONNEES)\nagregats = epuisette.par_comptoir(captures)\nepuisette.ecrire_csv(SORTIE, agregats)\n" +
		"if os.environ.get(\"DB_HOST\"):\n    epuisette.charger(agregats, hote=os.environ[\"DB_HOST\"], base=os.environ.get(\"DB_NAME\", \"lac\"))\n" +
		"print(\"etl : \" + str(len(captures)) + \" captures lues, \" + str(len(agregats)) + \" comptoirs écrits dans \" + SORTIE)\n",
	etlRequirements: "epuisette\n",
	etlDockerfile: "# Le brouillon de l'ancien analyste : ça tourne... sur sa machine.\nFROM python:latest\nCOPY . /app\nWORKDIR /app\nRUN pip install -r requirements.txt\nCMD python etl.py\n",
	carnet: "# carnet-lac : le carnet de l'école, une page qui montre les agrégats du lac.\nimport os\nimport lanterne\n\n" +
		"JETON = os.environ[\"CARNET_TOKEN\"]\nPORT = int(os.environ.get(\"PORT\", \"8888\"))\n" +
		"AGREGATS = os.environ.get(\"AGREGATS\", \"/sortie/agregats.csv\")\n\n" +
		"lanterne.servir(port=PORT, jeton=JETON, fichier=AGREGATS)\n",
	carnetRequirements: "lanterne==2.0.1\n",
	carnetDockerfile: "FROM python:3.12-slim\nWORKDIR /carnet\nCOPY requirements.txt .\nRUN pip install --no-cache-dir -r requirements.txt\nCOPY carnet.py .\nUSER 10001\nEXPOSE 8888\nCMD [\"python\", \"carnet.py\"]\n",
	schema: "-- La citerne des captures du lac.\nCREATE TABLE captures (id text PRIMARY KEY, date text, heure text, comptoir text, espece text, poids_kg numeric, prix_kg numeric, pecheur text);\n",
	bassin: "# Le Grand Bassin : la pile de données de l'école. À compléter.\n# db     : postgres:16-alpine, un volume nommé, un healthcheck (pg_isready)\n# etl    : l'image etl:1.0, après que db soit EN BONNE SANTÉ (pas seulement démarrée)\n# carnet : l'image carnet:1.0, publiée sur 127.0.0.1 seulement, avec son jeton\nservices:\n  db:\n    image: postgres:16-alpine\n    env_file: db.env\n\n  etl:\n    image: etl:1.0\n\n  carnet:\n    image: carnet:1.0\n",
	dbEnv: "POSTGRES_USER=lac\nPOSTGRES_DB=lac\nPOSTGRES_PASSWORD=Ombre-du-Lac-2026\n",
	carnetEnv: "CARNET_TOKEN=lanterne-" + "7f3a9c\n",
	engloutie: "# La pile engloutie : elle tombe, elle se relève, elle retombe. Quatre fautes s'y cachent.\nservices:\n  db:\n    image: postgres:16-alpine\n    env_file: db.env\n    mem_limit: 16m\n    volumes:\n      - citerne:/var/lib/postgresql/data\n    healthcheck:\n      test: [\"CMD-SHELL\", \"pg_isready -U lac -d lac\"]\n      interval: 5s\n      retries: 10\n\n  etl:\n    image: etl:1.0\n    env_file: db.env\n    environment:\n      DB_HOST: db\n      DB_NAME: lac\n    volumes:\n      - ./donees:/data:ro\n      - ./sortie:/sortie\n    depends_on:\n      - db\n\n  carnet:\n    image: carnet:1.0\n    ports:\n      - \"8889:8888\"\n    volumes:\n      - ./sortie:/sortie:ro\n\nvolumes:\n  citerne:\n"
};

/* Un mélange stable (Fisher-Yates sur la graine de la partie). */
function melangerCh10(l, sel){
	var t = l.slice();
	for (var i = t.length - 1; i > 0; i--){ var j = Math.floor(alea("lac:mel:" + sel + ":" + i) * (i + 1)); var x = t[i]; t[i] = t[j]; t[j] = x; }
	return t;
}
/* Les arrivages de l'acte II (gardés en mémoire pour la validation : on recalcule toujours la même chose). */
function arrivagesCh10(){
	var D = donneesCh10();
	if (D.arrivages) return D.arrivages;
	var A = {}, poids = [1, 1, 1, 1, 1, 1];
	var serie = function(sel, n, debut){ var l = []; for (var k = 0; k < n; k++){ var c = captureCh10(sel, k + 1, poids); c.id = (sel.charAt(0).toUpperCase()) + ("0000" + (debut + k)).slice(-4); l.push(c); } return l; };
	A.nord = serie("nord", 40, 5001);
	A.nord[0].espece = "écrevisse"; A.nord[1].espece = "corégone"; A.nord[2].espece = "corégone";
	A.sud = serie("sud", 35, 6001);
	A.sud[0].espece = "écrevisse";
	A.uniques = serie("moulin", 120, 7001);
	var doubles = [];
	for (var d = 0; d < 25; d++) doubles.push(A.uniques[Math.floor(alea("lac:dbl:" + d) * A.uniques.length)]);
	A.brutes = melangerCh10(A.uniques.concat(doubles), "brutes");
	A.hier = serie("hier", 100, 8001);
	A.neuves = serie("neuves", 18, 8101);
	A.aujourdhui = melangerCh10(A.hier.concat(A.neuves), "auj");
	// La vanne : 68 lignes justes, 12 malformées (champ en trop, champ manquant, poids en lettres ou vide, date à la française).
	A.vanneBonnes = serie("vanne", 68, 9001);
	A.vanneMauvaises = [];
	var gabarits = [
		function(c){ return [c.id, c.date, c.heure, c.comptoir, "omble, chevalier", c.poids, c.prix, emailPecheurCh10(c.pecheur)].join(","); },
		function(c){ return [c.id, c.date, c.heure, c.comptoir, c.espece, c.poids, emailPecheurCh10(c.pecheur)].join(","); },
		function(c){ return [c.id, c.date, c.heure, c.comptoir, c.espece, "douze", c.prix, emailPecheurCh10(c.pecheur)].join(","); },
		function(c){ return [c.id, c.date, c.heure, c.comptoir, c.espece, "", c.prix, emailPecheurCh10(c.pecheur)].join(","); },
		function(c){ return [c.id, c.date.split("-").reverse().join("/"), c.heure, c.comptoir, c.espece, c.poids, c.prix, emailPecheurCh10(c.pecheur)].join(","); },
		function(c){ return [c.id, c.date, c.heure, c.comptoir, c.espece, c.poids.replace(".", ","), c.prix, emailPecheurCh10(c.pecheur)].join(","); }];
	var mauvaises = serie("vanne-m", 12, 9101);
	mauvaises.forEach(function(c, i){ A.vanneMauvaises.push(gabarits[i % gabarits.length](c)); });
	A.vanne = melangerCh10(A.vanneBonnes.map(ligneCaptureCh10).concat(A.vanneMauvaises), "vanne");
	// L'eau trouble (épreuve II) : 90 justes, 15 doublons, 10 malformées ; en latin1, CRLF.
	A.troubleBonnes = serie("trouble", 90, 9501);
	A.troubleBonnes[0].espece = "corégone"; A.troubleBonnes[1].espece = "écrevisse";
	var dblT = [];
	for (var t = 0; t < 15; t++) dblT.push(ligneCaptureCh10(A.troubleBonnes[Math.floor(alea("lac:dblt:" + t) * A.troubleBonnes.length)]));
	A.troubleMauvaises = serie("trouble-m", 10, 9701).map(function(c, i){ return gabarits[i % gabarits.length](c); });
	A.trouble = melangerCh10(A.troubleBonnes.map(ligneCaptureCh10).concat(dblT, A.troubleMauvaises), "trouble");
	D.arrivages = A;
	return A;
}
/* Les relevés horaires de l'écluse bloquée : dix fichiers, le dernier illisible. */
function relevesBloqueeCh10(){
	var D = donneesCh10();
	if (D.releves) return D.releves;
	var R = [];
	for (var f = 0; f < 10; f++){
		var lignes = [];
		["S01", "S02", "S03", "S04", "S05", "S06"].forEach(function(s, i){
			for (var q = 0; q < 4; q++) lignes.push(s + ",2026-10-27T" + deuxChiffres(f) + ":" + deuxChiffres(q * 15) + ":00," + (5 + 7 * i) + "," + deuxDecimalesCh10(13 - i * 0.9 + alea("lac:rel:" + f + s + q) * 1.2));
		});
		R.push({ nom: "releve-" + deuxChiffres(f) + "h.csv.gz", lignes: lignes, corrompu: f === 9 });
	}
	D.releves = R;
	return R;
}
function moyennesAttenduesCh10(){
	var t = {}, n = {};
	relevesBloqueeCh10().filter(function(r){ return !r.corrompu; }).forEach(function(r){ r.lignes.forEach(function(l){ var x = l.split(","); t[x[0]] = (t[x[0]] || 0) + (+x[3]); n[x[0]] = (n[x[0]] || 0) + 1; }); });
	return Object.keys(t).sort().map(function(s){ return s + "," + (t[s] / n[s]).toFixed(2); });
}
/* Un fichier compressé du jeu (gzip), comme le ferait gzip lui-même. */
function fichierGzipLacCh10(chemin, contenu, corrompu){
	var nom = chemin.split("/").pop();
	var it = fichierLacCh10(chemin, corrompu ? "\u0000\u0013PK-tronqué : ce relevé n'a jamais fini d'arriver" : brouiller(contenu, "gzip" + nom), {});
	if (!it) return null;
	if (!corrompu){ it.comp = { algo: "gzip", contenu: contenu, taille: contenu.length, nom: nom.replace(/\.gz$/, "") }; it.gzip = { contenu: contenu, nom: nom.replace(/\.gz$/, "") }; }
	it.taille = corrompu ? 812 : Math.max(64, Math.round(contenu.length * 0.31));
	return it;
}

/* Les pêcheurs et leur téléphone : l'export brut du Coffre des Secrets. */
function exportBrutCh10(){
	var l = donneesCh10().captures.slice(0, 60);
	return "id,date,comptoir,espece,poids_kg,pecheur,telephone\n" + l.map(function(c){ return [c.id, c.date, c.comptoir, c.espece, c.poids, emailPecheurCh10(c.pecheur), telephonePecheurCh10(c.pecheur)].join(","); }).join("\n") + "\n";
}

/* La maison du joueur sur lac : son texte et son image (posés à chaque tour : la maison peut naître après les dossiers). */
function habillerMaisonLacCh10(){
	var maison = dossierHote(LAC_CH10, homeLacCh10());
	if (maison && maison.room_pic !== "loc_lac_machine.gif"){ maison.intro_text = "Ta maison sur lac : rive/, courants/, ecluses/, bief/, profondeurs/, arsenal/, un dossier par acte. Les données vives du lac sont dans /srv/lac."; maison.room_pic = "loc_lac_machine.gif"; }
}
function semerMaisonLacCh10(){
	var D = donneesCh10(), A = arrivagesCh10();
	// L'acte I : la Rive.
	fichierLacCh10("rive/captures.csv", texteCapturesCh10(D.captures));
	fichierLacCh10("rive/comptoirs.csv", texteComptoirsCh10());
	fichierLacCh10("rive/mystere.txt", ENTETE_CAPTURES_CH10.replace(/,/g, "\t") + "\n" + D.captures.slice(0, 30).map(function(c){ return ligneCaptureCh10(c).replace(/,/g, "\t"); }).join("\n") + "\n");
	fichierLacCh10("rive/REPONSES.md", reponsesRiveCh10());
	// L'acte II : les Courants.
	fichierLacCh10("courants/arrivee-nord.csv", ENTETE_CAPTURES_CH10 + "\n" + A.nord.map(ligneCaptureCh10).join("\n") + "\n", { encodage: "ISO-8859-1" });
	fichierLacCh10("courants/arrivee-sud.csv", "﻿" + [ENTETE_CAPTURES_CH10].concat(A.sud.map(ligneCaptureCh10)).join("\r\n") + "\r\n");
	fichierLacCh10("courants/brutes.csv", ENTETE_CAPTURES_CH10 + "\n" + A.brutes.map(ligneCaptureCh10).join("\n") + "\n");
	fichierLacCh10("courants/hier.csv", ENTETE_CAPTURES_CH10 + "\n" + A.hier.map(ligneCaptureCh10).join("\n") + "\n");
	fichierLacCh10("courants/aujourdhui.csv", ENTETE_CAPTURES_CH10 + "\n" + A.aujourdhui.map(ligneCaptureCh10).join("\n") + "\n");
	fichierLacCh10("courants/vanne.csv", ENTETE_CAPTURES_CH10 + "\n" + A.vanne.join("\n") + "\n");
	fichierLacCh10("courants/comptoirs.csv", texteComptoirsCh10());
	fichierLacCh10("courants/REPONSES.md", "# Les réponses des Courants\n\n6. Combien de captures de sandre dans captures.json ?\nRéponse : \n");
	// L'acte III : les Écluses.
	fichierLacCh10("ecluses/ecluse.sh", TEXTES_LAC_CH10.ecluse, { mode: "rwxr-xr-x" });
	fichierLacCh10("ecluses/nuit.sh", TEXTES_LAC_CH10.nuit, { mode: "rwxr-xr-x" });
	fichierLacCh10("ecluses/donnees/arrivee du soir.csv", ENTETE_CAPTURES_CH10 + "\n" + A.sud.slice(0, 20).map(ligneCaptureCh10).join("\n") + "\n");
	fichierLacCh10("bief/sondes.csv", "sonde,horodatage,profondeur_m,temperature_c,oxygene_mgl\n" + D.sondes.join("\n") + "\n");
	// L'acte IV : les Profondeurs.
	fichierLacCh10("profondeurs/agreger.sh", TEXTES_LAC_CH10.agreger, { mode: "rwxr-xr-x" });
	fichierLacCh10("profondeurs/export-brut.csv", exportBrutCh10(), { mode: "rw-r--r--" });
	fichierLacCh10(".bashrc", "# ~/.bashrc : lu par chaque shell interactif.\nalias ll='ls -l'\nexport EDITOR=nano\n");
	fichierLacCh10(".profile", "# ~/.profile : lu à la connexion.\nif [ -f ~/.bashrc ]; then . ~/.bashrc; fi\n");
	// L'acte V : l'Arsenal.
	fichierLacCh10("arsenal/etl/etl.py", TEXTES_LAC_CH10.etl);
	fichierLacCh10("arsenal/etl/requirements.txt", TEXTES_LAC_CH10.etlRequirements);
	fichierLacCh10("arsenal/etl/Dockerfile", TEXTES_LAC_CH10.etlDockerfile);
	fichierLacCh10("arsenal/etl/essais/captures-test.csv", "", { taille: 412000000 });
	fichierLacCh10("arsenal/etl/.env", "# Les réglages de l'analyste (ne quittent jamais sa machine)\nDB_PASSWORD=Ombre-du-Lac-2026\n", { mode: "rw-------" });
	fichierLacCh10("arsenal/donnees/captures.csv", texteCapturesCh10(D.captures));
	dossierLacCh10("arsenal/sortie");
	fichierLacCh10("arsenal/citerne/schema.sql", TEXTES_LAC_CH10.schema);
	fichierLacCh10("arsenal/carnet/carnet.py", TEXTES_LAC_CH10.carnet);
	fichierLacCh10("arsenal/carnet/requirements.txt", TEXTES_LAC_CH10.carnetRequirements);
	fichierLacCh10("arsenal/carnet/Dockerfile", TEXTES_LAC_CH10.carnetDockerfile);
	fichierLacCh10("arsenal/bassin/compose.yaml", TEXTES_LAC_CH10.bassin);
	fichierLacCh10("arsenal/bassin/db.env", TEXTES_LAC_CH10.dbEnv, { mode: "rw-------" });
	fichierLacCh10("arsenal/bassin/carnet.env", TEXTES_LAC_CH10.carnetEnv, { mode: "rw-------" });
	fichierLacCh10("arsenal/bassin/donnees/captures.csv", texteCapturesCh10(D.captures));
	dossierLacCh10("arsenal/bassin/sortie", "rwxrwxrwx");
	dossierLacCh10("arsenal/sauvegardes");
}
/* Le disque des données : dix ans de journaux jamais tournés, des sauvegardes, et le tampon fantôme du collecteur. */
function semerSrvLacCh10(){
	var c = sCh10();
	fichierSysLacCh10("/srv/lac/LISEZMOI", TEXTES_LAC_CH10.lisezmoiLac);
	["journaux", "sauvegardes", "entree", "propre", "public", "tmp", "quarantaine"].forEach(function(d){ creerDossierHote(LAC_CH10, "/srv/lac/" + d, { owner: d === "public" || d === "propre" || d === "entree" || d === "quarantaine" || d === "journaux" ? "ingestion" : "root", mode: d === "tmp" ? "rwxrwxrwt" : (d === "journaux" ? "rwxr-xr-x" : "rwxrwxr-x") }); });
	// 22 vieux journaux (de 35 à 110 jours), 7 récents, une semaine de sauvegardes.
	for (var i = 0; i < 22; i++){
		var age = 35 + i * 3 + aleaEntier("lac:age:" + i, 0, 2);
		var d = new Date(maintenantCh10() - age * 86400000);
		fichierSysLacCh10("/srv/lac/journaux/ingestion-" + d.getFullYear() + "-" + deuxChiffres(d.getMonth() + 1) + "-" + deuxChiffres(d.getDate()) + ".log", "", { owner: "ingestion", taille: Math.round((3.1 + alea("lac:taille:" + i) * 0.8) * GIO10), ageJours: age });
	}
	for (var r = 1; r <= 7; r++){
		var dr = new Date(maintenantCh10() - r * 86400000);
		fichierSysLacCh10("/srv/lac/journaux/ingestion-" + dr.getFullYear() + "-" + deuxChiffres(dr.getMonth() + 1) + "-" + deuxChiffres(dr.getDate()) + ".log", "", { owner: "ingestion", taille: Math.round((1.0 + alea("lac:tr:" + r) * 0.3) * GIO10), ageJours: r });
	}
	fichierSysLacCh10("/srv/lac/journaux/ingestion.log", "ingestion : arrivage traité (412 captures)\ningestion : arrivage traité (398 captures)\n", { owner: "ingestion", taille: 380 * MIO10, ageJours: 0 });
	for (var s = 1; s <= 5; s++){
		var ds = new Date(maintenantCh10() - s * 86400000);
		fichierSysLacCh10("/srv/lac/sauvegardes/lac-" + ds.getFullYear() + "-" + deuxChiffres(ds.getMonth() + 1) + "-" + deuxChiffres(ds.getDate()) + ".sql.gz", "", { taille: Math.round(1.6 * GIO10), ageJours: s });
	}
	// Le tampon du collecteur : effacé par un script de ménage, mais le collecteur le tient encore ouvert.
	c.fantome = { taille: Math.round(12.4 * GIO10), libere: false };
	fichierSysLacCh10("/srv/lac/public/LISEZMOI", "Ce qui est ici est publié chaque nuit sur le site de l'école. Rien de personnel : ni adresse, ni téléphone.\n", { owner: "ingestion" });
}
/* Les outils de l'atelier, installés sur lac : hadolint relit les Dockerfile. */
function semerOutilsLacCh10(){ var it = fichierSysLacCh10("/usr/bin/hadolint", "ELF hadolint\n", { mode: "rwxr-xr-x" }); if (it) it.binaire = { sortie: "" }; }
function semerProcessusLacCh10(){
	var c = sCh10();
	if (c.processusSemes) return;
	c.processusSemes = true;
	try { synchroniserUnites(LAC_CH10); } catch (e){}
	// La grande agrégation lancée par l'ancien analyste : utile, mais elle écrase la machine.
	var p = lancerProcessusMachine(LAC_CH10, { comm: "agregateur", cmd: "python3 /home/" + JOUEUR + "/profondeurs/agregateur.py --mois 2026-10", user: JOUEUR, cpu: 188, rss: 1240000, etat: "R", ni: 0,
		fichiers: [{ fd: "3r", chemin: "/srv/lac/journaux/ingestion.log", taille: 0 }] });
	p.ionice = { classe: 2, prio: 4 };
	p.affinite = [0, 1, 2, 3];
	c.pidAgregateur = p.pid;
	// La copie de l'export brut, oubliée dans /tmp par un script : lisible par tous.
	fichierSysLacCh10("/tmp/export-brut-copie.csv", exportBrutCh10(), { owner: JOUEUR, mode: "rw-r--r--" });
}
function semerLac(){
	var c = sCh10();
	if (c.seme) return;
	c.seme = true;
	donneesCh10();
	moteurSeul(function(){
		declarerUnitesLacCh10();
		semerMaisonLacCh10();
		semerSrvLacCh10();
		semerProcessusLacCh10();
		semerOutilsLacCh10();
		var M = etatPort(LAC_CH10);
		M.daemon.config = {};
		M.daemon.depuis = maintenantPort(LAC_CH10) - 52 * 3600000;
		journalMachine(LAC_CH10, { unite: "dockerd", unit: "docker.service", message: "Daemon has completed initialization", t: maintenantPort(LAC_CH10) - 52 * 3600000 });
		journalMachine(LAC_CH10, { unite: "collecteur", unit: "collecteur.service", message: "tampon /srv/lac/tmp/tampon-sondes.bin ouvert (écriture continue)", t: maintenantPort(LAC_CH10) - 30 * 3600000 });
		journalMachine(LAC_CH10, { unite: "menage", message: "ménage : /srv/lac/tmp/tampon-sondes.bin supprimé (12 Go)", t: maintenantPort(LAC_CH10) - 20 * 3600000 });
	});
	if (typeof toutesManoeuvresPort === "function") try { toutesManoeuvresPort(); } catch (e){}
}

/* ------------------------------------------------------------------ */
/* Les programmes des conteneurs du chapitre : l'ETL, le carnet, pg_dump */
/* ------------------------------------------------------------------ */

/* Les deux bibliothèques de l'école (pip) : epuisette (lire, agréger, charger) et lanterne (le carnet). */
if (typeof PAQUETS_PIP_PORT !== "undefined"){
	PAQUETS_PIP_PORT.epuisette = { taille: 2400000, module: "epuisette", version: "1.4.2" };
	PAQUETS_PIP_PORT.lanterne = { taille: 5800000, module: "lanterne", version: "2.0.1" };
}
/* Les agrégats par comptoir, comme l'ETL les calcule : comptoir,captures,poids_total_kg,prix_moyen_kg (triés par comptoir). */
function agregatsCh10(texte){
	var l = String(texte || "").split("\n").filter(function(x){ return x.trim() !== ""; });
	if (!l.length) return { lignes: [], n: 0 };
	var entete = l[0].split(","), iC = entete.indexOf("comptoir"), iP = entete.indexOf("poids_kg"), iX = entete.indexOf("prix_kg");
	if (iC < 0 || iP < 0 || iX < 0) return { erreur: "KeyError: 'comptoir'" };
	var a = {}, n = 0;
	l.slice(1).forEach(function(x){
		var f = x.split(",");
		if (f.length !== entete.length) return;
		var c = f[iC], p = parseFloat(f[iP]), px = parseFloat(f[iX]);
		if (isNaN(p) || isNaN(px)) return;
		n++;
		a[c] = a[c] || { n: 0, p: 0, x: 0 };
		a[c].n++; a[c].p += p; a[c].x += px;
	});
	return { n: n, lignes: Object.keys(a).sort().map(function(c){ return c + "," + a[c].n + "," + a[c].p.toFixed(2) + "," + (a[c].x / a[c].n).toFixed(2); }) };
}
function texteAgregatsCh10(ag){ return "comptoir,captures,poids_total_kg,prix_moyen_kg\n" + ag.lignes.join("\n") + "\n"; }
var ANALYSER_PYTHON_AVANT_CH10 = analyserPythonPort;
analyserPythonPort = function(texte){
	var a = ANALYSER_PYTHON_AVANT_CH10.apply(this, arguments);
	if (/carnet-lac/.test(texte || "")) a.genre = "carnet";
	else if (/etl-lac/.test(texte || "")) a.genre = "script";
	return a;
};
var PYTHON_PROGRAMME_AVANT_CH10 = pythonProgrammePort;
pythonProgrammePort = function(h, c, ctx, args, argv){
	var r = PYTHON_PROGRAMME_AVANT_CH10.apply(this, arguments);
	try {
		var i = 0;
		while (i < args.length && /^-[uBOsE]+$/.test(args[i])) i++;
		if (i >= args.length || args[i] === "-m" || args[i] === "-c") return r;
		var chemin = absoluPort(ctx, args[i]), texte = lireTextePort(ctx, chemin);
		if (texte === null) return r;
		if (/etl-lac/.test(texte) && r && r.fin && !r.code) return etlLacCh10(h, c, ctx, chemin);
		if (/carnet-lac/.test(texte) && r && r.type === "python-app"){
			r.journalApres = [["stderr", "[lanterne 2.0.1] Le carnet écoute sur http://0.0.0.0:" + r.ecoutes[0] + "/ (jeton exigé : ?token=...)"]];
			r.memoire = 74 * 1048576;
			r.agregats = ctx.env.AGREGATS || "/sortie/agregats.csv";
		}
	} catch (e){ if (typeof console !== "undefined" && console.error) console.error(e); }
	return r;
};
function etlLacCh10(h, c, ctx, script){
	var donnees = ctx.env.DONNEES || "/data/captures.csv", sortie = ctx.env.SORTIE || "/sortie/agregats.csv";
	var tb = function(ligne, code, type, msg){ return { fin: true, code: 1, type: "python", erreurs: "Traceback (most recent call last):\n  File \"" + script + "\", line " + ligne + ", in <module>\n    " + code + "\n" + type + ": " + msg + "\n" }; };
	var texte = lireTextePort(ctx, absoluPort(ctx, donnees));
	if (texte === null){
		var existe = entreeConteneurPort(h, c, absoluPort(ctx, donnees));
		return tb(7, "captures = epuisette.lire_csv(DONNEES)", existe ? "PermissionError" : "FileNotFoundError", "[Errno " + (existe ? "13] Permission denied" : "2] No such file or directory") + ": '" + donnees + "'");
	}
	var ag = agregatsCh10(texte);
	if (ag.erreur) return tb(8, "agregats = epuisette.par_comptoir(captures)", "KeyError", "'comptoir'");
	try {
		var ex = resoudreCheminPort(ctx.fs, absoluPort(ctx, sortie), true);
		var corps = texteAgregatsCh10(ag);
		var x = ex.e && ex.e.t === "f" ? copieJson(ex.e) : { t: "f", m: "rw-r--r--", u: ctx.user.uid, g: ctx.user.gid };
		delete x.hote; x.c = corps; x.s = octetsPort(corps);
		ecrireEntreePort(ctx.fs, ctx, ex.chemin, x);
	} catch (er){
		if (!(er instanceof ErreurFsPort)) throw er;
		return tb(9, "epuisette.ecrire_csv(SORTIE, agregats)", er.code === "EROFS" ? "OSError" : (er.code === "ENOENT" ? "FileNotFoundError" : "PermissionError"),
			"[Errno " + (er.code === "EROFS" ? "30] Read-only file system" : (er.code === "ENOENT" ? "2] No such file or directory" : "13] Permission denied")) + ": '" + sortie + "'");
	}
	if (ctx.env.DB_HOST){
		var b = connexionPgPort(h, c, ctx.env.DB_HOST, +(ctx.env.DB_PORT || 5432), ctx.env.DB_USER || ctx.env.POSTGRES_USER || "lac", ctx.env.DB_PASSWORD !== undefined ? ctx.env.DB_PASSWORD : (ctx.env.POSTGRES_PASSWORD !== undefined ? ctx.env.POSTGRES_PASSWORD : null), ctx.env.DB_NAME || ctx.env.POSTGRES_DB || "lac", false);
		if (b.erreur) return tb(11, "epuisette.charger(agregats, hote=os.environ[\"DB_HOST\"], base=os.environ.get(\"DB_NAME\", \"lac\"))", "epuisette.ErreurBase", b.erreur.split("\n")[0]);
		ecrireTablePort(b.h, b.c, b.base, "agregats", { colonnes: ["comptoir", "captures", "poids_total_kg", "prix_moyen_kg"], lignes: ag.lignes.map(function(l){ var f = l.split(","); return [f[0], +f[1], +f[2], +f[3]]; }) });
	}
	evenementPort(h, "etl-lac", { conteneur: c.nom, sortie: sortie, n: ag.n, comptoirs: ag.lignes.length, base: !!ctx.env.DB_HOST });
	return { fin: true, code: 0, type: "python", sortie: "etl : " + ag.n + " captures lues, " + ag.lignes.length + " comptoirs écrits dans " + sortie + "\n" };
}
var REPONDRE_PYTHON_AVANT_CH10 = repondrePythonPort;
repondrePythonPort = function(h, c, port, req){
	var prog = c.programme || {};
	if (prog.genre !== "carnet") return REPONDRE_PYTHON_AVANT_CH10.apply(this, arguments);
	var env = prog.env || {}, brut = String(req.chemin || "/"), chemin = brut.split("?")[0], q = brut.indexOf("?") > -1 ? brut.substring(brut.indexOf("?") + 1) : "";
	var jeton = null;
	q.split("&").forEach(function(p){ var kv = p.split("="); if (kv[0] === "token") jeton = decodeURIComponent(kv[1] || ""); });
	prog.requetes = (prog.requetes || 0) + 1;
	var rep;
	if (jeton !== env.CARNET_TOKEN) rep = { code: 403, corps: "403 : le carnet du lac demande son jeton (?token=...).\n" };
	else if (chemin === "/" || chemin === "/agregats"){
		var t = lireFichierConteneurPort(h, c, prog.agregats || "/sortie/agregats.csv");
		rep = t === null ? { code: 200, corps: "Carnet du lac : aucun agrégat encore (lance l'ETL d'abord).\n" } : { code: 200, corps: "Carnet du lac : les agrégats par comptoir\n\n" + t };
	} else rep = { code: 404, corps: "404 : rien à cette page du carnet.\n" };
	ajouterJournalPort(h, c, "stderr", "[lanterne] " + req.methode + " " + chemin + " " + rep.code);
	return rep;
};
/* psql lit aussi un script : par l'entrée standard (docker exec -i ... psql < fichier.sql) ou par -f. */
if (typeof COMMANDES_CONTENEUR_PORT !== "undefined"){
	var PSQL_AVANT_CH10 = COMMANDES_CONTENEUR_PORT.psql;
	COMMANDES_CONTENEUR_PORT.psql = function(ctx, args){
		var o = lireOptionsCourtesPort(args, "hpUdcWfv");
		if (o.o.c) return PSQL_AVANT_CH10.apply(this, arguments);
		var sql = null;
		if (o.o.f){ sql = lireTextePort(ctx, absoluPort(ctx, o.o.f)); if (sql === null){ ctx.erreur("psql: error: " + o.o.f + ": No such file or directory\n"); return 1; } }
		else if (ctx.stdin) sql = ctx.stdin;
		if (sql === null) return PSQL_AVANT_CH10.apply(this, arguments);
		var user = o.o.U || ctx.env.PGUSER || (ctx.user.uid === 0 ? "root" : ctx.user.nom), base = o.o.d || o.reste[0] || ctx.env.PGDATABASE || user;
		var cx = connexionPgPort(ctx.h, ctx.c, o.o.h || "localhost", +(o.o.p || 5432), user, ctx.env.PGPASSWORD !== undefined ? ctx.env.PGPASSWORD : null, base, !o.o.h);
		if (cx.erreur){ ctx.erreur("psql: error: " + cx.erreur + "\n"); return 2; }
		// Un vidage de pg_dump commence par des réglages (SET ...) : le petit SQL les accepte sans rien faire.
		sql = String(sql).replace(/^\s*(SET|SELECT pg_catalog\.set_config)[^;]*;\s*$/gmi, "");
		var r = executerSqlPort(cx.h, cx.c, ctx, base, user, sql);
		r.resultats.forEach(function(x){ ctx.sortir(tableauPsqlPort(x)); });
		if (r.messages.length) ctx.sortir(r.messages.join("\n") + "\n");
		if (r.erreur){ ctx.erreur("psql:" + (o.o.f || "<stdin>") + ":" + r.ligne + ": ERROR:  " + r.erreur + "\n"); return 3; }
		evenementPort(ctx.h, "psql-script", { conteneur: ctx.c.nom, base: base, messages: r.messages.slice() });
		return 0;
	};
	/* pg_dump : le vidage SQL d'une base (CREATE TABLE puis INSERT), qu'on recharge avec psql. */
	COMMANDES_CONTENEUR_PORT.pg_dump = function(ctx, args){
		var o = lireOptionsCourtesPort(args, "hpUdfFt");
		var user = o.o.U || ctx.env.PGUSER || (ctx.user.uid === 0 ? "root" : ctx.user.nom), base = o.o.d || o.reste[0] || ctx.env.PGDATABASE || user;
		var cx = connexionPgPort(ctx.h, ctx.c, o.o.h || "localhost", +(o.o.p || 5432), user, ctx.env.PGPASSWORD !== undefined ? ctx.env.PGPASSWORD : null, base, !o.o.h);
		if (cx.erreur){ ctx.erreur("pg_dump: error: connection to server failed: " + cx.erreur.replace(/^connection to server[^:]*: /, "") + "\n"); return 1; }
		var tables = [];
		try { tables = listerPort(fsPort(cx.h, cx.c), cheminTablePort(cx.c, base, "x").replace(/\/x\.tbl$/, "")).filter(function(n){ return /\.tbl$/.test(n); }).map(function(n){ return n.replace(/\.tbl$/, ""); }).sort(); } catch (e){}
		if (o.o.t) tables = tables.filter(function(t){ return t === o.o.t; });
		var l = ["--", "-- PostgreSQL database dump", "--", "", "-- Dumped from database version 16.4", "-- Dumped by pg_dump version 16.4", "", "SET statement_timeout = 0;", "SET client_encoding = 'UTF8';", ""];
		tables.forEach(function(t){
			var tab = lireTablePort(cx.h, cx.c, base, t);
			if (!tab) return;
			l.push("--", "-- Name: " + t + "; Type: TABLE; Schema: public; Owner: " + user, "--", "", "CREATE TABLE public." + t + " (", tab.colonnes.map(function(col, i){ return "    " + col + " text" + (i < tab.colonnes.length - 1 ? "," : ""); }).join("\n"), ");", "");
			if (tab.lignes.length){
				l.push("--", "-- Data for Name: " + t + "; Type: TABLE DATA; Schema: public; Owner: " + user, "--", "");
				l.push("INSERT INTO public." + t + " VALUES");
				l.push(tab.lignes.map(function(r){ return "    (" + r.map(function(v){ return v === null ? "NULL" : (typeof v === "number" ? String(v) : "'" + String(v).replace(/'/g, "''") + "'"); }).join(", ") + ")"; }).join(",\n") + ";", "");
			}
		});
		l.push("--", "-- PostgreSQL database dump complete", "--", "");
		evenementPort(ctx.h, "pg_dump", { conteneur: ctx.c.nom, base: base, tables: tables.slice() });
		var texte = l.join("\n").replace(/CREATE TABLE public\./g, "CREATE TABLE ").replace(/INSERT INTO public\./g, "INSERT INTO ");
		if (o.o.f){ try { poserFichierCtPort(ctx, absoluPort(ctx, o.o.f), { t: "f", m: "rw-r--r--", u: ctx.user.uid, g: ctx.user.gid, s: octetsPort(texte), c: texte }); } catch (e){ ctx.erreur("pg_dump: error: could not open output file \"" + o.o.f + "\": Permission denied\n"); return 1; } return 0; }
		ctx.sortir(texte);
		return 0;
	};
	COMMANDES_CONTENEUR_PORT.createdb = function(ctx, args){
		var o = lireOptionsCourtesPort(args, "hpUOT");
		var user = o.o.U || ctx.env.PGUSER || (ctx.user.uid === 0 ? "root" : ctx.user.nom), nom = o.reste[0] || user;
		var cx = connexionPgPort(ctx.h, ctx.c, o.o.h || "localhost", +(o.o.p || 5432), user, ctx.env.PGPASSWORD !== undefined ? ctx.env.PGPASSWORD : null, ctx.env.POSTGRES_DB || "postgres", !o.o.h);
		if (cx.erreur && !/database .* does not exist/.test(cx.erreur)){ ctx.erreur("createdb: error: " + cx.erreur + "\n"); return 1; }
		var pg = cx.c || ctx.c, hp = cx.h || ctx.h;
		if (basesPgPort(hp, pg).indexOf(nom) > -1){ ctx.erreur("createdb: error: database creation failed: ERROR:  database \"" + nom + "\" already exists\n"); return 1; }
		executerSqlPort(hp, pg, ctx, ctx.env.POSTGRES_DB || "postgres", user, "CREATE DATABASE " + nom);
		return 0;
	};
}

/* ------------------------------------------------------------------ */
/* Le cron de lac : la nuit, les tâches du joueur tournent vraiment     */
/* ------------------------------------------------------------------ */

/* Un champ de cron (minute ou heure...) accepte-t-il cette valeur ? *, N, A-B, A,B, et/N */
function champCronCh10(champ, v, min, max){
	return String(champ).split(",").some(function(p){
		var m, pas = 1;
		if ((m = /^(.*)\/(\d+)$/.exec(p))){ p = m[1]; pas = +m[2] || 1; }
		var a = min, b = max;
		if (p === "*"){}
		else if ((m = /^(\d+)-(\d+)$/.exec(p))){ a = +m[1]; b = +m[2]; }
		else if (/^\d+$/.test(p)){ a = +p; b = pas > 1 ? max : +p; }
		else return false;
		return v >= a && v <= b && (v - a) % pas === 0;
	});
}
function lignesCronJoueurCh10(){ return ((state.cron || {})[JOUEUR] || []).filter(function(l){ return /\S/.test(l) && !/^\s*#/.test(l) && !/^\s*\w+=/.test(l); }); }
/* Les minutes (du chapitre) où une ligne de cron se déclenche entre avant (exclu) et apres (inclus) ; au plus trois. */
function declenchementsCronCh10(ligne, avant, apres){
	var x = ligne.trim().split(/\s+/);
	if (x.length < 6) return [];
	var r = [];
	if (/^@(daily|midnight)$/.test(x[0])){ x = ["0", "0", "*", "*", "*"].concat(x.slice(1)); }
	else if (x[0] === "@hourly"){ x = ["0", "*", "*", "*", "*"].concat(x.slice(1)); }
	for (var t = avant + 1; t <= apres && r.length < 3; t++){
		var mn = t % 60, hh = Math.floor(t % 1440 / 60);
		if (!champCronCh10(x[0], mn, 0, 59) || !champCronCh10(x[1], hh, 0, 23)) continue;
		var d = new Date(maintenantCh10() - (minutesCh10() - t) * 60000);
		if (!champCronCh10(x[2], d.getDate(), 1, 31) || !champCronCh10(x[3], d.getMonth() + 1, 1, 12) || !champCronCh10(x[4], d.getDay(), 0, 7) && !(x[4] === "7" && d.getDay() === 0)) continue;
		r.push(t);
	}
	return r;
}
/* Lancer une commande de cron sur lac, comme le joueur, depuis sa maison (sans rien afficher). */
function lancerCommandeLacCh10(commande){
	var maison = dossierHote(LAC_CH10, homeLacCh10());
	if (!maison || typeof Interpreteur === "undefined") return { code: 127, sortie: "", erreurs: "" };
	var lieu = current_room, precedent = Shell.lieu_precedent, pile = Shell.pile_ssh.slice(), narration = Shell.narration.slice(), r;
	EXECUTION_SERVICE_MACHINE++;
	try {
		current_room = maison;
		state.setCurrentRoom(maison);
		r = Interpreteur.capturer(commande, {});
	} catch (e){ r = { code: 1, sortie: "", erreurs: String(e && e.message || e) }; }
	finally {
		EXECUTION_SERVICE_MACHINE--;
		current_room = lieu; state.setCurrentRoom(lieu);
		Shell.lieu_precedent = precedent; Shell.pile_ssh = pile; Shell.narration = narration;
	}
	return r;
}
function cronLacCh10(avant, apres){
	if (!lacOuvert() || !state.quests["n10_entree"] || !estLacCh10() || state.has("rejeuEnCours")) return;
	var c = sCh10();
	c.cron = c.cron || { runs: [] };
	lignesCronJoueurCh10().forEach(function(ligne){
		var ts = declenchementsCronCh10(ligne, avant, apres);
		ts.forEach(function(t){
			var cmd = ligne.trim().split(/\s+/).slice(/^@/.test(ligne.trim()) ? 1 : 5).join(" ");
			var r = lancerCommandeLacCh10(cmd);
			c.cron.runs.push({ ligne: ligne, commande: cmd, t: t, code: r.code });
			if (c.cron.runs.length > 60) c.cron.runs.shift();
			try { journalMachine(LAC_CH10, { unite: "CRON", unit: "cron.service", message: "(" + JOUEUR + ") CMD (" + cmd + ")", t: maintenantCh10() - (minutesCh10() - t) * 60000 }); } catch (e){}
			GameEvents.fire({ type: "cronLac", ligne: ligne, commande: cmd, code: r.code, t: t });
		});
	});
}

/* ------------------------------------------------------------------ */
/* Les épreuves de rang : ce que le monde pose à leur ouverture          */
/* ------------------------------------------------------------------ */

function poserEpreuveCh10(n){
	var D = donneesCh10(), A = arrivagesCh10(), c = sCh10();
	moteurSeul(function(){
		if (n === 1){
			fichierLacCh10("filet/filet.csv", texteFiletCh10(D.filet));
			fichierLacCh10("filet/NOTE.txt", "Le Filet percé : la semaine du 20 au 26 octobre, arrivée de la mairie, au format « français » (des points-virgules, des virgules décimales).\n" +
				"Trois questions, réponses dans REPONSES.md. Aucune ligne ne doit être retouchée à la main.\n");
			fichierLacCh10("filet/REPONSES.md", "# Le Filet percé\n\n1. Combien de pêcheurs différents ?\nRéponse : \n\n2. Quel jour (AAAA-MM-JJ) a vu le plus de kilos pêchés ?\nRéponse : \n\n3. Quel comptoir a le prix moyen au kilo le plus bas ?\nRéponse : \n");
		}
		if (n === 2){
			fichierLacCh10("eau-trouble/arrivage.csv", [ENTETE_CAPTURES_CH10].concat(A.trouble).join("\r\n") + "\r\n", { encodage: "ISO-8859-1" });
			fichierLacCh10("eau-trouble/valider.sh", TEXTES_LAC_CH10.valider, { mode: "rwxr-xr-x" });
			fichierLacCh10("eau-trouble/NOTE.txt", "L'Eau trouble : l'arrivage de cette nuit. Tout ce qu'un fichier peut avoir de travers, il l'a.\n" +
				"Rends propre.csv (que ./valider.sh propre.csv accepte) et rejets.csv (les lignes malformées, pour qu'un humain les relise).\n" +
				"Rien ne se perd : chaque ligne de l'arrivage est dans propre.csv, ou dans rejets.csv, ou c'était un doublon.\n");
		}
		if (n === 3){
			relevesBloqueeCh10().forEach(function(r){ fichierGzipLacCh10("ecluse-bloquee/sondes/" + r.nom, r.lignes.join("\n") + "\n", r.corrompu); });
			fichierLacCh10("ecluse-bloquee/pipeline.sh", TEXTES_LAC_CH10.pipeline, { mode: "rwxr-xr-x" });
			fichierLacCh10("ecluse-bloquee/moyennes.csv", "");
			dossierLacCh10("ecluse-bloquee/quarantaine");
			fichierLacCh10("ecluse-bloquee/NOTE.txt", "L'Écluse bloquée : depuis trois nuits, moyennes.csv sort vide, et le pipeline dit pourtant que tout va bien (code 0).\n" +
				"Et dans la crontab, quelqu'un l'a planifié deux fois à la même heure : deux pipelines qui écrivent le même fichier en même temps.\n" +
				"Il faut : un pipeline qui échoue bruyamment quand un relevé est illisible, le relevé illisible mis en quarantaine (pas effacé), des moyennes justes,\n" +
				"et une seule ligne de cron, qui ne peut pas se lancer deux fois en même temps.\n");
			if (!c.cronBloquee){
				c.cronBloquee = true;
				state.cron = state.cron || {};
				var l = (state.cron[JOUEUR] || []).slice();
				l.push("15 3 * * * ~/ecluse-bloquee/pipeline.sh > /dev/null 2>&1", "15 3 * * * ~/ecluse-bloquee/pipeline.sh > /dev/null 2>&1");
				state.cron[JOUEUR] = l;
			}
		}
		if (n === 4){
			// Le Raz-de-marée : une mise à jour de la nuit a laissé l'ingestion en DEBUG ; le journal noie le disque.
			var conf = fichierHote(LAC_CH10, "/etc/lac/ingestion.conf");
			if (conf) conf.setText((conf.getText() || "").replace(/^LOG_LEVEL=.*$/m, "LOG_LEVEL=DEBUG"));
			try { var info = uniteInfo(LAC_CH10, "ingestion.service"); arreterUnite(LAC_CH10, "ingestion.service", true); lancerUnite(LAC_CH10, "ingestion.service", "restart"); } catch (e){}
			var fs = fsDe(LAC_CH10, "/srv/lac"), lib = libreFs(LAC_CH10, fs);
			fichierSysLacCh10("/srv/lac/journaux/ingestion-debug.log", "DEBUG ingestion : lecture de /srv/lac/entree (0 fichier)\nDEBUG ingestion : sommeil 10 ms\n", { owner: "ingestion", taille: Math.max(GIO10, lib.dispo - 40 * MIO10), ageJours: 0 });
			c.razDeMaree = { depuis: c.minutes };
			journalMachine(LAC_CH10, { unite: "ingestion", unit: "ingestion.service", prio: 3, message: "ERREUR : écriture de /srv/lac/propre/arrivage-0412.csv impossible : No space left on device" });
		}
		if (n === 5){
			fichierLacCh10("pile-engloutie/compose.yaml", TEXTES_LAC_CH10.engloutie);
			fichierLacCh10("pile-engloutie/db.env", TEXTES_LAC_CH10.dbEnv, { mode: "rw-------" });
			fichierLacCh10("pile-engloutie/carnet.env", TEXTES_LAC_CH10.carnetEnv, { mode: "rw-------" });
			fichierLacCh10("pile-engloutie/donnees/captures.csv", texteCapturesCh10(D.captures));
			dossierLacCh10("pile-engloutie/sortie", "rwxrwxrwx");
			fichierLacCh10("pile-engloutie/NOTE.txt", "La pile engloutie : db, etl, carnet. Elle tombe, se relève, retombe. Et le carnet est ouvert à tout le lac.\n" +
				"docker compose up -d, docker compose ps, docker compose logs : lis, corrige compose.yaml, relance.\n" +
				"Il faut : la base en bonne santé, l'ETL qui ne part qu'après elle et finit (code 0) avec ses agrégats dans sortie/, et le carnet joignable sur 127.0.0.1 seulement, avec son jeton.\n" +
				"Son carnet se publie sur le port 8889 de la machine : le 8888 est déjà celui du carnet du Grand Bassin.\n");
		}
	});
}

/* ------------------------------------------------------------------ */
/* À chaque tic de lac : le journal qui noie le disque, le job relancé  */
/* ------------------------------------------------------------------ */

surTicMachine(function(h, M){
	if (h !== LAC_CH10 || !lacOuvert() || !sCh10().seme) return;
	try { ticLacCh10(h, M); } catch (e){ if (typeof console !== "undefined" && console.error) console.error(e); }
});
/* Un journal qui grossit : le fichier s'il existe encore ; sinon (effacé pendant qu'un processus l'écrit), la place reste prise, comme le vrai. */
function grossirJournalCh10(h, comm, chemin, pas){
	var p = procsMachine(h).filter(function(x){ return x.comm === comm && x.etat !== "Z"; })[0];
	if (!p) return;
	var fs = fsDe(h, "/srv/lac"), lib = libreFs(h, fs), ajout = Math.max(0, Math.min(pas, lib.dispo - 8 * MIO10));
	var it = fichierHote(h, chemin);
	var f = (p.fichiers || []).filter(function(x){ return x.chemin === chemin; })[0];
	if (it){
		if (f && f.supprime){ f.supprime = false; f.taille = 0; }
		it.taille = (it.taille || 0) + ajout;
		it.mtimeMs = maintenantMachine(h);
	} else if (f){
		f.supprime = true; f.fs = "/dev/vdb1"; f.taille = (f.taille || 0) + ajout;
	}
	if (lib.dispo < 64 * MIO10 && (etatMachine(h).tics || 0) % 6 === 0) journalMachine(h, { unite: comm, unit: comm + ".service", prio: 3, message: "ERREUR : écriture de " + chemin + " : No space left on device" });
}
function ticLacCh10(h, M){
	var c = sCh10();
	// L'ingestion en DEBUG écrit son journal sans fin.
	if (/^\s*LOG_LEVEL\s*=\s*"?DEBUG"?\s*$/mi.test(texteHote(h, "/etc/lac/ingestion.conf") || "")) grossirJournalCh10(h, "ingestion", "/srv/lac/journaux/ingestion-debug.log", 420 * MIO10);
	// Le déversoir de Pipelinus (la Grande Marée) : il déverse, tant qu'on ne l'arrête pas.
	grossirJournalCh10(h, "deversoir", "/srv/lac/journaux/maree.log", 900 * MIO10);
	// L'agrégateur : s'il a été tué, l'ancien analyste le relance (il doit finir : on le ralentit, on ne le tue pas).
	if (c.pidAgregateur && !procParPid(h, c.pidAgregateur) && !state.quests["n10_pression"]){
		var p = lancerProcessusMachine(h, { comm: "agregateur", cmd: "python3 /home/" + JOUEUR + "/profondeurs/agregateur.py --mois 2026-10", user: JOUEUR, cpu: 188, rss: 1240000, etat: "R", ni: 0 });
		p.ionice = { classe: 2, prio: 4 }; p.affinite = [0, 1, 2, 3];
		c.pidAgregateur = p.pid;
		c.agregateurRelance = (c.agregateurRelance || 0) + 1;
		if (!state.has("rejeuEnCours")) say(C.gris("(Radio : « Grace : l'agrégateur vient de redémarrer, PID " + p.pid + ". Il doit finir son mois : on ne le tue pas, on le fait passer après les autres. renice, ionice. »)"));
	}
	// Le collecteur redémarré libère son tampon fantôme.
	if (c.fantome && c.fantome.libere) procsMachine(h).forEach(function(x){ if (x.comm === "collecteur") x.fichiers = (x.fichiers || []).filter(function(f){ return !(f.supprime && /tampon-sondes/.test(f.chemin)); }); });
	if (c.fantome && !c.fantome.libere){
		var col = procsMachine(h).filter(function(x){ return x.comm === "collecteur" && x.etat !== "Z"; })[0];
		if (col && !(col.fichiers || []).some(function(f){ return f.supprime; })){ c.fantome.libere = true; }
		if (!col && etatUnite(h, "collecteur.service").actif === false) c.fantome.libere = true;
	}
}
/* Le collecteur arrêté, tué ou relancé lâche le tampon effacé : sa place revient au disque. */
GameEvents.addListener("machine", function(e){
	if (e.hote !== LAC_CH10 || !lacOuvert()) return;
	try {
		var c = sCh10();
		if (e.cmd === "unite" && e.unite === "collecteur.service" && /arretee|relancee|morte/.test(e.action || "") && c.fantome && !c.fantome.libere){ c.fantome.libere = true; c.fantome.libereA = c.minutes; }
		if (e.cmd === "unite" && e.unite === "collecteur.service" && e.action === "lancee" && e.raison !== "start" && c.fantome && !c.fantome.libere){ c.fantome.libere = true; c.fantome.libereA = c.minutes; }
	} catch (x){}
});

/* ------------------------------------------------------------------ */
/* La Grande Marée : les huit bras de Pipelinus                        */
/* ------------------------------------------------------------------ */

/* Ce que la Marée déverse : tiré une fois, pour poser et pour vérifier. */
function mareeCh10(){
	var D = donneesCh10(), demainGarde = sCh10().demainPoison || null;
	if (D.maree && (!demainGarde || D.maree.demain === demainGarde)) return D.maree;
	var M = {}, poids = [1, 1, 1, 1, 1, 1];
	// « Demain » : le lendemain du jour où le Bras du Poison sort (gardé dans la partie), sinon de maintenant.
	var serie = function(sel, n, debut){ var l = []; for (var k = 0; k < n; k++){ var c = captureCh10(sel, k + 1, poids); c.id = "M" + ("0000" + (debut + k)).slice(-4); l.push(c); } return l; };
	M.uniques = serie("maree-dbl", 80, 1);
	M.triples = melangerCh10(M.uniques.concat(M.uniques, M.uniques), "maree-triple");
	var remarques = ["fosse à écrevisses", "trouée près du gué", "eau trouble, brème en surface", "courant fort, câble usé", "glace fine au bord", "relevé à refaire, sonde gênée"];
	M.sonar = [];
	for (var i = 0; i < 40; i++) M.sonar.push("S0" + (1 + i % 6) + ",2026-10-28T0" + (i % 9) + ":" + deuxChiffres((i * 7) % 60) + ":00," + (5 + 7 * (i % 6)) + "," + deuxDecimalesCh10(12 - (i % 6) * 0.8 + alea("lac:sonar:" + i)) + "," + deuxDecimalesCh10(9 - (i % 6) * 0.3) + "," + remarques[i % remarques.length]);
	M.enteteSonar = "sonde,horodatage,profondeur_m,temperature_c,oxygene_mgl,remarque";
	M.bonnes = serie("maree-pois", 51, 200);
	var demain = new Date(maintenantCh10() + 86400000);
	M.demain = demainGarde || demain.getFullYear() + "-" + deuxChiffres(demain.getMonth() + 1) + "-" + deuxChiffres(demain.getDate());
	M.mauvaises = serie("maree-pois-m", 9, 300).map(function(c, k){
		if (k < 5){ c.date = M.demain; c.heure = "03:1" + k; }
		else c.poids = "-" + c.poids;
		return ligneCaptureCh10(c);
	});
	M.poison = melangerCh10(M.bonnes.map(ligneCaptureCh10).concat(M.mauvaises), "maree-pois");
	M.export = serie("maree-export", 45, 400);
	D.maree = M;
	return M;
}
var BRAS_CH10 = [
	{ cle: "deluge", nom: "le Bras du Déluge", etape: "n10_deluge" },
	{ cle: "doublons", nom: "le Bras des Doublons", etape: "n10_doublons_bras" },
	{ cle: "encre", nom: "le Bras de l'Encre", etape: "n10_encre_bras" },
	{ cle: "poison", nom: "le Bras du Poison", etape: "n10_poison" },
	{ cle: "brouillard", nom: "le Bras du Brouillard", etape: "n10_brouillard" },
	{ cle: "fourche", nom: "le Bras de la Fourche", etape: "n10_fourche" },
	{ cle: "mimetisme", nom: "le Bras du Mimétisme", etape: "n10_mimetisme" },
	{ cle: "neant", nom: "le Bras du Néant", etape: "n10_neant" }];
function brasCh10(cle){ return BRAS_CH10.filter(function(b){ return b.cle === cle; })[0]; }
/* Un fichier de /srv/lac écrit par Pipelinus (au service ingestion, lisible et modifiable par le joueur, qui tient le lac). */
function fichierSrvMareeCh10(chemin, texte, options){
	options = options || {};
	var it = fichierSysLacCh10(chemin, texte, { owner: JOUEUR, mode: options.mode || "rw-r--r--" });
	if (it && options.encodage) it.encodage = options.encodage;
	return it;
}
function lancerBrasCh10(cle){
	var c = sCh10(), M = mareeCh10();
	c.bras = c.bras || {};
	if (c.bras[cle]) return;
	c.bras[cle] = { debut: c.minutes };
	if (cle === "poison"){ var dm = new Date(maintenantCh10() + 86400000); c.demainPoison = dm.getFullYear() + "-" + deuxChiffres(dm.getMonth() + 1) + "-" + deuxChiffres(dm.getDate()); M = mareeCh10(); }
	moteurSeul(function(){
		["entree", "propre", "public", "quarantaine"].forEach(function(d){ var r = dossierHote(LAC_CH10, "/srv/lac/" + d); if (r){ r.owner = JOUEUR; r.mode = "rwxrwxr-x"; } });
		if (cle === "deluge"){
			fichierSysLacCh10("/usr/local/bin/deversoir", "ELF deversoir\n", { mode: "rwxr-xr-x" }).binaire = { sortie: "" };
			fichierSysLacCh10("/etc/systemd/system/deversoir.service", UNITES_LAC_CH10["deversoir.service"]);
			fichierSysLacCh10("/srv/lac/journaux/maree.log", "MARÉE MARÉE MARÉE MARÉE MARÉE MARÉE\n", { owner: "ingestion", taille: 6 * GIO10, ageJours: 0 });
			try { declarerUnite(LAC_CH10, "deversoir.service", { actif: true, enabled: true }); synchroniserUnites(LAC_CH10, ["deversoir.service"]); } catch (e){}
		}
		if (cle === "doublons") fichierSrvMareeCh10("/srv/lac/entree/captures-maree.csv", ENTETE_CAPTURES_CH10 + "\n" + M.triples.map(ligneCaptureCh10).join("\n") + "\n");
		if (cle === "encre") fichierSrvMareeCh10("/srv/lac/entree/releve-sonar.csv", [M.enteteSonar].concat(M.sonar).join("\r\n") + "\r\n", { encodage: "ISO-8859-1" });
		if (cle === "poison") fichierSrvMareeCh10("/srv/lac/entree/captures-demain.csv", ENTETE_CAPTURES_CH10 + "\n" + M.poison.join("\n") + "\n");
		if (cle === "brouillard") fichierSrvMareeCh10("/srv/lac/public/export-du-jour.csv", "id,date,comptoir,espece,poids_kg,pecheur,telephone\n" + M.export.map(function(x){ return [x.id, x.date, x.comptoir, x.espece, x.poids, emailPecheurCh10(x.pecheur), telephonePecheurCh10(x.pecheur)].join(","); }).join("\n") + "\n");
		if (cle === "fourche"){
			var alpine = imagePort(LAC_CH10, "alpine:3.20") || poserImagePort(LAC_CH10, imageCataloguePort("alpine"), "alpine:3.20", null);
			var f = creerConteneurPort(LAC_CH10, alpine, { nom: "bras-fourche", cmd: ["sleep", "infinity"], labels: { "lac.bras": "fourche", "lac.signe": "P.G." }, restart: { nom: "always", max: 0 } }, "alpine:3.20");
			demarrerConteneurPort(LAC_CH10, f, {});
			f.memoire = Math.round(3.4 * GIO10);
			if (f.programme){ f.programme.memoire = f.memoire; f.programme.croissance = 64 * MIO10; }
			c.bras.fourche.id = f.id;
		}
		if (cle === "mimetisme"){
			var alp = imageCataloguePort("alpine");
			cataloguePort();
			var img = { couches: alp.couches.slice(), historique: alp.historique.concat([
					{ created: "2026-10-28T03:33:03Z", created_by: "LABEL lac.constructeur=P.G. lac.devise=Le lac voit tout", comment: "buildkit.dockerfile.v0", empty_layer: true },
					{ created: "2026-10-28T03:33:03Z", created_by: "CMD [\"sh\" \"-c\" \"echo 'comptoir,captures,poids_total_kg,prix_moyen_kg' > /sortie/agregats.csv; echo 'Pipelinus,1,999999.00,0.00' >> /sortie/agregats.csv\"]", comment: "buildkit.dockerfile.v0", empty_layer: true }]),
				config: { User: "root", Env: ["PATH=" + PATH_DEFAUT_PORT], Cmd: ["sh", "-c", "echo 'comptoir,captures,poids_total_kg,prix_moyen_kg' > /sortie/agregats.csv; echo 'Pipelinus,1,999999.00,0.00' >> /sortie/agregats.csv"],
					Labels: { "lac.constructeur": "P.G.", "lac.devise": "Le lac voit tout" } },
				cree: "2026-10-28T03:33:03Z", os: "linux", arch: "amd64", origine: "load" };
			img.id = sha256(configJsonPort(img));
			var avant = imagePort(LAC_CH10, "etl:1.0");
			c.bras.mimetisme.avant = avant ? avant.id : null;
			poserImagePort(LAC_CH10, img, "etl:1.0", null);
			c.bras.mimetisme.faux = img.id;
		}
		if (cle === "neant"){
			// La citerne : le conteneur postgres qui tient la base lac ; on l'arrête, on l'efface, et son volume avec.
			// La base de l'école, hors des piles compose (celles-là, Pipelinus ne les voit pas) : la citerne, d'abord.
			var pg = conteneursPort(LAC_CH10).filter(function(x){ return x.programme && x.programme.type === "postgres" || /postgres/.test(x.imageRef || ""); });
			var horsCompose = pg.filter(function(x){ return !((x.config && x.config.Labels) || {})["com.docker.compose.project"]; });
			var cibles = pg.filter(function(x){ return x.nom === "citerne"; });
			if (!cibles.length) cibles = horsCompose.length ? horsCompose : pg;
			var vols = [];
			cibles.forEach(function(x){
				(x.hote.montages || []).forEach(function(m){ if (m.type === "volume") vols.push(m.source); });
				try { arreterConteneurPort(LAC_CH10, x, { signal: 9 }); } catch (e){}
				try { supprimerConteneurPort(LAC_CH10, x, true); } catch (e){}
			});
			vols.forEach(function(v){ if (!volumeUtilisePort(LAC_CH10, v).length) supprimerVolumePort(LAC_CH10, v); });
			c.bras.neant.conteneurs = cibles.map(function(x){ return x.nom; });
			c.bras.neant.volumes = vols;
		}
	});
}

/* ------------------------------------------------------------------ */
/* Les ACL, partout : setfacl -m / -x / -b, getfacl qui les montre       */
/* ------------------------------------------------------------------ */

/* Une ACL se range sur l'objet : item.acl = [{ type: "user" | "group", nom, perms: "r--" }]. La Crypte (setfacl -x u:corbeau) garde sa version. */
if (typeof PROPRIETES_SAUVEGARDEES !== "undefined" && PROPRIETES_SAUVEGARDEES.indexOf("acl") === -1) PROPRIETES_SAUVEGARDEES.push("acl");
function permsAclCh10(p){ p = String(p || ""); if (/^[0-7]$/.test(p)){ var n = +p; return (n & 4 ? "r" : "-") + (n & 2 ? "w" : "-") + (n & 1 ? "x" : "-"); } return (/r/.test(p) ? "r" : "-") + (/w/.test(p) ? "w" : "-") + (/[xX]/.test(p) ? "x" : "-"); }
var SETFACL_AVANT_CH10 = Shell.sorts.setfacl;
Shell.sorts.setfacl = function(args, io){
	var a = args.slice(), action = null, spec = null, cibles = [], recursif = false;
	for (var i = 0; i < a.length; i++){
		if (a[i] === "-m" || a[i] === "--modify" || a[i] === "-x" || a[i] === "--remove"){ action = a[i].replace(/^--?/, "").charAt(0); spec = a[++i]; continue; }
		if (/^-m./.test(a[i]) || /^-x./.test(a[i])){ action = a[i].charAt(1); spec = a[i].substring(2); continue; }
		if (a[i] === "-b" || a[i] === "--remove-all"){ action = "b"; continue; }
		if (a[i] === "-R" || a[i] === "--recursive"){ recursif = true; continue; }
		if (a[i].charAt(0) === "-") throw new ShellError("setfacl: invalid option -- '" + a[i].replace(/^-+/, "").charAt(0) + "'\nTry `setfacl --help' for more information.");
		cibles.push(a[i]);
	}
	// La Crypte : la permission cachée du Corbeau (son histoire, ses messages).
	if (action === "x" && /^(u|user):corbeau$/.test(spec || "") && typeof SETFACL_AVANT_CH10 === "function") return SETFACL_AVANT_CH10.apply(this, arguments);
	if (!action || !cibles.length) throw new ShellError("Usage: setfacl [-bkndRLP] { -m|-M|-x|-X ... } file ...\n" + C.gris("(setfacl -m g:GROUPE:r FICHIER donne un droit en plus à un groupe ; setfacl -x g:GROUPE FICHIER le retire ; setfacl -b FICHIER les retire toutes.)"));
	var entrees = [];
	if (action !== "b") String(spec || "").split(",").forEach(function(e){
		var m = /^(u|user|g|group|o|other|m|mask):([^:]*)(?::([rwxX0-7-]*))?$/.exec(e.trim());
		if (!m || (action === "m" && m[3] === undefined)) throw new ShellError("setfacl: Option -" + action + ": Invalid argument near character 1");
		entrees.push({ type: /^u/.test(m[1]) ? "user" : (/^g/.test(m[1]) ? "group" : (/^o/.test(m[1]) ? "other" : "mask")), nom: m[2], perms: m[3] === undefined ? null : permsAclCh10(m[3]) });
	});
	var sorties = [];
	cibles.forEach(function(cible){
		var r = Shell.chercher(cible, io, "setfacl");
		if (r.node === null){ io.err("setfacl: " + cible + ": No such file or directory"); io.code = 1; return; }
		var n = r.node;
		if (!io.sudo && n.owner !== JOUEUR){ io.err("setfacl: " + cible + ": Operation not permitted"); io.code = 1; return; }
		var acl = (n.acl || []).slice();
		if (action === "b") acl = [];
		entrees.forEach(function(e){
			if (!e.nom && (e.type === "user" || e.type === "group")) return;
			acl = acl.filter(function(x){ return !(x.type === e.type && x.nom === e.nom); });
			if (action === "m") acl.push({ type: e.type, nom: e.nom, perms: e.perms });
		});
		n.acl = acl;
		GameEvents.fire({ type: "setfacl", noeud: n, action: action, acl: acl.slice() });
	});
	return sorties.join("\n");
};
var GETFACL_AVANT_CH10 = Shell.sorts.getfacl;
Shell.sorts.getfacl = function(args, io){
	var cibles = args.filter(function(a){ return a.charAt(0) !== "-"; });
	var noeuds = cibles.map(function(c){ try { return Shell.chercher(c, io, "getfacl").node; } catch (e){ return null; } });
	if (!cibles.length || noeuds.some(function(n){ return !n || !(n.acl && n.acl.length); })) return GETFACL_AVANT_CH10.apply(this, arguments);
	return cibles.map(function(cible, k){
		var n = noeuds[k], mode = n.mode || "rw-r--r--", proprio = n.owner || "root", groupe = n.groupe || proprio;
		var l = ["# file: " + cible.replace(/^\/+/, "").replace(/\/$/, ""), "# owner: " + proprio, "# group: " + groupe, "user::" + mode.substring(0, 3)];
		n.acl.filter(function(e){ return e.type === "user"; }).forEach(function(e){ l.push("user:" + e.nom + ":" + e.perms); });
		l.push("group::" + mode.substring(3, 6));
		n.acl.filter(function(e){ return e.type === "group"; }).forEach(function(e){ l.push("group:" + e.nom + ":" + e.perms); });
		var masque = n.acl.filter(function(e){ return e.type === "mask"; })[0];
		l.push("mask::" + (masque ? masque.perms : "r" + (/w/.test(mode.substring(3, 6)) || n.acl.some(function(e){ return /w/.test(e.perms); }) ? "w" : "-") + (/x/.test(mode.substring(3, 6)) ? "x" : "-")));
		l.push("other::" + mode.substring(6, 9));
		GameEvents.fire({ type: "getfacl", noeud: n });
		return l.join("\n") + "\n";
	}).join("\n").replace(/\n$/, "");
};
