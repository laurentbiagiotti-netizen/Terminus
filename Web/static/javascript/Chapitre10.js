/**
 * Chapitre10.js : le Lac Profond, la grande finale. Le chapitre de Linux et de Docker pour la donnée.
 *
 * Numéro interne 11 (le 4 est l'épreuve finale, puis chaque chapitre décale d'un cran), affiché 10.
 * Le sceau daté de demain (fin du chapitre 9) mène sous la Chronothèque, jusqu'à l'eau : le Lac Profond, où l'école
 * déverse ses données depuis dix ans. Dans ses profondeurs vit Pipelinus, une pieuvre dont chaque bras est un pipeline.
 * À l'aube du quatrième jour, la Grande Marée la fera remonter, et ses huit bras attaqueront les données de l'école.
 * Le joueur arrive Riverain ; il doit en sortir Maître du Lac.
 *
 * Les analogies : un fichier de données est une prise sur la grève, un séparateur un maillage, l'encodage l'encre de
 * l'eau, un doublon un reflet, une ligne malformée une maille déchirée, un script une écluse (set -euo pipefail, ses
 * portes de sûreté), cron la tour de garde, flock la clé de l'écluse, le disque une fosse, nice et ionice la pression,
 * l'anonymisation le brouillard qu'on lève, une image Docker un navire scellé, un volume une citerne, Compose un bassin.
 *
 * Ce fichier pose le monde (la Rive, ses quinze postes, la boîte de Laurent), les rangs et leurs épreuves, les étapes
 * validées sur l'ÉTAT RÉEL de la machine lac (Lac.js), les nuits, la Grande Marée et ses huit bras, la Clarté du Lac,
 * le rapport, le certificat, le cliffhanger et le départ direct. Abysses.js fait vivre les maîtres, leurs défis, les
 * badges et les commandes jauge et insignes ; HabitantsLac.js, les quêtes annexes.
 *
 * Strictement défensif : on lit, on nettoie, on automatise, on protège, on restaure. Pipelinus n'est jamais imité : on
 * l'endigue.
 */

World.fige = false;

/* ------------------------------------------------------------------ */
/* Les lieux : la Rive, ses quinze postes, la boîte de Laurent          */
/* ------------------------------------------------------------------ */

function salleCh10(nom, intro, img){
	var r = lieuDuChapitre11(new Room(nom, intro, img));
	r.owner = "root";
	r.mode = "rwxr-xr-x";
	return r;
}
function objetCh10(lieu, nom, texte, image, options){
	options = options || {};
	var it = new Item(nom, texte, image || "item_sign.gif").droits(options.mode || "rw-r--r--", options.owner || "root");
	lieu.addItem(it);
	return it;
}
function sansAccentCh10(t){ return String(t || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, ""); }

var LacCh10 = salleCh10("Lac",
	"Le Lac Profond. Sous la Chronothèque, un escalier taillé dans le roc descend jusqu'à l'eau : un lac souterrain si vaste que les lanternes de la rive " +
	"n'en atteignent pas l'autre bord. L'eau est noire et lente. Des tuyaux de cuivre y plongent de partout, et des vannes rouillées gouttent dans le silence. " +
	"Quinze postes s'alignent sur les quais, chacun tenu par un gardien. Wissam t'attend au bout du ponton, une lanterne à la main ; la radio de Grace grésille.",
	"loc_lac.gif");

/* Les quinze postes : la clé (celle des badges), le nom du lieu, le maître, le titre, les étapes, l'acte, l'image, l'intro. */
var POSTES_CH10 = [
	{ cle: "greve", nom: "Greve", maitre: "Lamia", titre: "la Grève des Fichiers", acte: 1, image: "loc_greve.gif", etapes: ["n10_regarder", "n10_octets"],
	  intro: "La Grève des Fichiers : une plage de galets où le lac rejette tout ce qu'on lui confie. Des fichiers échoués, par centaines. Avant de toucher une donnée, on la regarde (file, head, wc, column, csvlook, od)." },
	{ cle: "banc", nom: "BancDeTri", maitre: "Younes", titre: "le Banc de Tri", acte: 1, image: "loc_banc_tri.gif", etapes: ["n10_trier", "n10_filtrer"],
	  intro: "Le Banc de Tri : de longs étals de pierre où l'on trie les prises, par comptoir, par espèce, par poids. Ici, on compte et on classe (cut, sort, uniq -c, grep, awk)." },
	{ cle: "comptoir", nom: "ComptoirDesMesures", maitre: "Syrine", titre: "le Comptoir des Mesures", acte: 1, image: "loc_comptoir_mesures.gif", etapes: ["n10_sommer", "n10_statistiques"],
	  intro: "Le Comptoir des Mesures : des balances de cuivre, des abaques, un registre ouvert. On y pèse, on y fait les moyennes et les médianes (awk, csvstat, datamash)." },
	{ cle: "gue", nom: "GueDesEncres", maitre: "Noam", titre: "le Gué des Encres", acte: 2, image: "loc_gue_encres.gif", etapes: ["n10_encre", "n10_lignes"],
	  intro: "Le Gué des Encres : là où trois rivières se jettent dans le lac, chacune avec son encre. Les accents s'y brouillent, les fins de ligne s'y doublent (file -i, iconv, dos2unix, le BOM)." },
	{ cle: "moulin", nom: "MoulinDesDoublons", maitre: "Maeva", titre: "le Moulin des Doublons", acte: 2, image: "loc_moulin_doublons.gif", etapes: ["n10_doublons", "n10_differences"],
	  intro: "Le Moulin des Doublons : une roue à aubes qui sépare chaque prise de son reflet. On y dédoublonne sans perdre l'en-tête, et on compare hier et aujourd'hui (sort -u, uniq -d, comm, join)." },
	{ cle: "vanne", nom: "VanneDesFormats", maitre: "Kamal", titre: "la Vanne des Formats", acte: 2, image: "loc_vanne_formats.gif", etapes: ["n10_formats", "n10_json"],
	  intro: "La Vanne des Formats : des grilles de fer qui ne laissent passer que les lignes bien formées. Le reste part en quarantaine, jamais à la poubelle (awk, mlr, jq)." },
	{ cle: "ecluse", nom: "EcluseDesScripts", maitre: "Zélia", titre: "l'Écluse des Scripts", acte: 3, image: "loc_ecluse_scripts.gif", etapes: ["n10_script", "n10_piege"],
	  intro: "L'Écluse des Scripts : deux portes de chêne et un sas. Un script de données est une écluse : s'il échoue, il doit se fermer, pas laisser passer l'eau (set -euo pipefail, les guillemets, mktemp, trap)." },
	{ cle: "bief", nom: "BiefDesParalleles", maitre: "Miguel", titre: "le Bief des Parallèles", acte: 3, image: "loc_bief.gif", etapes: ["n10_decouper", "n10_parallele"],
	  intro: "Le Bief des Parallèles : six canaux côte à côte. Un gros fichier se coupe en morceaux, et les morceaux se traitent en même temps (split, xargs -P, parallel, zstd, pv)." },
	{ cle: "tour", nom: "TourDeGarde", maitre: "Badis", titre: "la Tour de Garde", acte: 3, image: "loc_tour_de_garde.gif", etapes: ["n10_cron", "n10_journal"],
	  intro: "La Tour de Garde : une horloge, une cloche, et un veilleur qui ne dort jamais. Ce qui doit tourner la nuit tourne sans toi, une seule fois, et laisse une trace (crontab, flock, logger, journalctl, logrotate)." },
	{ cle: "fosse", nom: "FosseDuDisque", maitre: "Arnaud", titre: "la Fosse du Disque", acte: 4, image: "loc_fosse.gif", etapes: ["n10_disque", "n10_fantome"],
	  intro: "La Fosse du Disque : un puits sans fond où dix ans de journaux s'entassent. Quand il déborde, tout s'arrête. On mesure, on compresse, on cherche ce qui manque (df, du, sort -h, find -size -mtime, zstd, lsof +L1)." },
	{ cle: "chambre", nom: "ChambreDesPressions", maitre: "Julien", titre: "la Chambre des Pressions", acte: 4, image: "loc_chambre_pressions.gif", etapes: ["n10_pression", "n10_bornes"],
	  intro: "La Chambre des Pressions : des manomètres partout, des aiguilles dans le rouge. Un job lourd ne doit jamais étouffer les autres : on le fait passer après (top, renice, ionice, taskset, timeout)." },
	{ cle: "coffre", nom: "CoffreDesSecrets", maitre: "Megane", titre: "le Coffre des Secrets", acte: 4, image: "loc_coffre_secrets.gif", etapes: ["n10_anonymiser", "n10_droits"],
	  intro: "Le Coffre des Secrets : un coffre-fort posé au fond de l'eau. Les données personnelles des pêcheurs n'en sortent jamais telles quelles (sed -E, cut, chmod, setfacl, umask, shred)." },
	{ cle: "chantier", nom: "ChantierDesImages", maitre: "Elias", titre: "le Chantier des Images", acte: 5, image: "loc_chantier_images.gif", etapes: ["n10_image", "n10_lancer"],
	  intro: "Le Chantier des Images : une cale sèche où l'on scelle les navires de données. Une image reproductible se reconstruit à l'identique, n'importe où, dans un an (Dockerfile, docker build, docker run -v ...:ro)." },
	{ cle: "citerne", nom: "Citerne", maitre: "Remi", titre: "la Citerne", acte: 5, image: "loc_citerne.gif", etapes: ["n10_citerne", "n10_sauvegarde"],
	  intro: "La Citerne : une cuve de pierre où dort la base de l'école. Une base sans sauvegarde testée n'existe pas (postgres, un volume, psql, pg_dump, la restauration)." },
	{ cle: "bassin", nom: "GrandBassin", maitre: "Eden", titre: "le Grand Bassin", acte: 5, image: "loc_grand_bassin.gif", etapes: ["n10_compose", "n10_carnet"],
	  intro: "Le Grand Bassin : trois cuves reliées par des conduites. La base, l'ETL, le carnet : une pile qui démarre dans le bon ordre, et qui ne s'ouvre qu'à ceux qui en ont le droit (docker compose, healthcheck, depends_on)." }
];
POSTES_CH10.forEach(function(p){
	p.lieu = salleCh10(p.nom, p.intro, p.image);
	link_rooms(LacCh10, p.lieu);
});
function posteCh10Par(cle){ return POSTES_CH10.filter(function(p){ return p.cle === cle; })[0]; }
function posteDeMaitreCh10(nom){ return POSTES_CH10.filter(function(p){ return p.maitre === nom; })[0] || null; }

/* La boîte de Laurent, au bout du ponton : on y dépose le rapport de la Grande Marée. */
var BoiteLacCh10 = salleCh10("BoiteDeLaurent", "Un coffret de chêne goudronné, au bout du ponton, cerclé de cuivre vert. On y dépose le rapport de la Grande Marée, à l'intention de Laurent.", "item_box.gif");
BoiteLacCh10.mode = "rwxrwxrwt";
BoiteLacCh10.owner = "laurent";
BoiteLacCh10.horsBareme = true;
link_rooms(LacCh10, BoiteLacCh10);

/* Le Lac s'ouvre sous Cybersup. */
function relierLacCh10(){
	if (Cybersup.children.indexOf(LacCh10) === -1) relier(Cybersup, LacCh10);
}

/* ------------------------------------------------------------------ */
/* Les sorts du chapitre (ceux que les maîtres enseignent)               */
/* ------------------------------------------------------------------ */

var SORTS_DES_POSTES_CH10 = {
	greve: ["file", "head", "tail", "wc", "column", "csvlook", "od", "hexdump"],
	banc: ["cut", "sort", "uniq", "grep", "awk", "csvcut", "csvsort", "csvgrep"],
	comptoir: ["awk", "csvstat", "datamash"],
	gue: ["iconv", "dos2unix", "unix2dos", "od"],
	moulin: ["sort", "uniq", "comm", "join"],
	vanne: ["mlr", "jq", "csvjson", "yq"],
	ecluse: ["mktemp", "bash"],
	bief: ["split", "csplit", "xargs", "parallel", "zstd", "unzstd", "zstdcat", "pv", "gzip", "zcat"],
	tour: ["crontab", "flock", "logger", "journalctl", "logrotate"],
	fosse: ["df", "du", "ncdu", "find", "truncate", "lsof", "systemctl"],
	chambre: ["top", "ps", "renice", "nice", "ionice", "taskset", "timeout"],
	coffre: ["sed", "chmod", "setfacl", "getfacl", "shred", "sha256sum", "sha512sum"],
	chantier: ["docker"],
	citerne: ["docker", "gunzip"],
	bassin: ["docker", "curl", "yq"]
};
var ORDRE_DES_SORTS_11 = (function(){
	var autres = [];
	[typeof ORDRE_DES_SORTS !== "undefined" ? ORDRE_DES_SORTS : [], typeof ORDRE_DES_SORTS_2 !== "undefined" ? ORDRE_DES_SORTS_2 : [],
	 typeof ORDRE_DES_SORTS_3 !== "undefined" ? ORDRE_DES_SORTS_3 : [], typeof ORDRE_DES_SORTS_5 !== "undefined" ? ORDRE_DES_SORTS_5 : [],
	 typeof ORDRE_DES_SORTS_6 !== "undefined" ? ORDRE_DES_SORTS_6 : [], typeof ORDRE_DES_SORTS_7 !== "undefined" ? ORDRE_DES_SORTS_7 : [],
	 typeof ORDRE_DES_SORTS_8 !== "undefined" ? ORDRE_DES_SORTS_8 : [], typeof ORDRE_DES_SORTS_9 !== "undefined" ? ORDRE_DES_SORTS_9 : [],
	 typeof ORDRE_DES_SORTS_10 !== "undefined" ? ORDRE_DES_SORTS_10 : []].forEach(function(l){ autres = autres.concat(l); });
	var liste = [];
	Object.keys(SORTS_DES_POSTES_CH10).forEach(function(k){ SORTS_DES_POSTES_CH10[k].forEach(function(s){ if (liste.indexOf(s) === -1) liste.push(s); }); });
	if (typeof SORTS_DONNEES !== "undefined") SORTS_DONNEES.forEach(function(s){ if (liste.indexOf(s) === -1) liste.push(s); });
	// Les sorts déjà enseignés par les habitants des chapitres d'avant restent des sorts d'annexe : hors barème, ici aussi.
	return liste.filter(function(s){ return autres.indexOf(s) === -1 && typeof MANUEL !== "undefined" && MANUEL[s] && !(typeof SORTS_DES_ANNEXES !== "undefined" && SORTS_DES_ANNEXES[s]); });
})();
ORDRE_DES_SORTS_11.forEach(function(s){ if (MANUEL[s]) delete MANUEL[s].horsBareme; });

/* ------------------------------------------------------------------ */
/* Les rangs : de Riverain à Maître du Lac                              */
/* ------------------------------------------------------------------ */

var RANGS_CH10 = [
	{ nom: "Riverain", insigne: "insigne_riverain", image: null },
	{ nom: "Pêcheur de données", insigne: "insigne_pecheur", image: "rang_pecheur.gif" },
	{ nom: "Plongeur", insigne: "insigne_plongeur", image: "rang_plongeur.gif" },
	{ nom: "Éclusier", insigne: "insigne_eclusier", image: "rang_eclusier.gif" },
	{ nom: "Sondeur des Abysses", insigne: "insigne_sondeur", image: "rang_sondeur.gif" },
	{ nom: "Maître du Lac", insigne: "insigne_maitre", image: "rang_maitre_lac.gif" }
];
function rangCh10(){ var r = sCh10().rang; return typeof r === "number" ? r : 0; }
function nomRangCh10(r){ return RANGS_CH10[r === undefined ? rangCh10() : r].nom; }

var ACTES_CH10 = [
	{ n: 1, titre: "La Rive", etapes: ["n10_regarder", "n10_octets", "n10_trier", "n10_filtrer", "n10_sommer", "n10_statistiques"], epreuve: "n10_rang1", nomEpreuve: "Le Filet percé" },
	{ n: 2, titre: "Les Courants", etapes: ["n10_encre", "n10_lignes", "n10_doublons", "n10_differences", "n10_formats", "n10_json"], epreuve: "n10_rang2", nomEpreuve: "L'Eau trouble" },
	{ n: 3, titre: "Les Écluses", etapes: ["n10_script", "n10_piege", "n10_decouper", "n10_parallele", "n10_cron", "n10_journal"], epreuve: "n10_rang3", nomEpreuve: "L'Écluse bloquée" },
	{ n: 4, titre: "Les Profondeurs", etapes: ["n10_disque", "n10_fantome", "n10_pression", "n10_bornes", "n10_anonymiser", "n10_droits"], epreuve: "n10_rang4", nomEpreuve: "Le Raz-de-marée" },
	{ n: 5, titre: "L'Arsenal", etapes: ["n10_image", "n10_lancer", "n10_citerne", "n10_sauvegarde", "n10_compose", "n10_carnet"], epreuve: "n10_rang5", nomEpreuve: "La Pile engloutie" },
	{ n: 6, titre: "La Grande Marée", etapes: [], epreuve: null, nomEpreuve: "Les huit bras de Pipelinus" }
];
function acteCh10(n){ return ACTES_CH10[n - 1]; }
function acteDeEtapeCh10(id){ for (var i = 0; i < ACTES_CH10.length; i++) if (ACTES_CH10[i].etapes.indexOf(id) > -1 || ACTES_CH10[i].epreuve === id) return ACTES_CH10[i].n; return 1; }
function epreuveOuverteCh10(n){ var e = sCh10().epreuves || {}; return e[n] !== undefined && e[n] !== null; }

/* ------------------------------------------------------------------ */
/* Les étapes                                                          */
/* ------------------------------------------------------------------ */

var QUETES_CH10 = [
	{ id: "n10_entree", titre: "Descendre jusqu'au Lac Profond",
	  indice: "Le Lac est sous Cybersup : cd ~/Cybersup/Lac." },
	{ id: "n10_jauge", titre: "Écouter Wissam, lire l'Ordre, plonger la jauge",
	  indice: "Sur la rive : cat Wissam, cat Ordre, puis jauge (une commande du jeu) : les postes, l'heure, ton rang, la Clarté du Lac." },
	{ id: "n10_quai", titre: "Poser le pied sur lac",
	  indice: "ssh lac ; ls ; cat /srv/lac/LISEZMOI ; df -h /srv/lac. Tes dossiers de travail sont dans ta maison sur lac." },
	{ id: "n10_regarder", titre: "Grève des Fichiers : regarder une donnée avant d'y toucher",
	  indice: "Grève (Lamia). Sur lac, dans ~/rive : file captures.csv ; head captures.csv ; wc -l captures.csv ; column -s, -t < captures.csv | head (ou csvlook)." },
	{ id: "n10_octets", titre: "Grève des Fichiers : voir les octets, et le séparateur caché",
	  indice: "od -c mystere.txt | head (ou cat -A) : quel séparateur ? Puis tr '\\t' ',' < mystere.txt > mystere.csv." },
	{ id: "n10_trier", titre: "Banc de Tri : compter les prises par comptoir",
	  indice: "Banc de Tri (Younes). cut -d, -f4 captures.csv | tail -n +2 | sort | uniq -c | sort -rn ; réponse 1 dans ~/rive/REPONSES.md." },
	{ id: "n10_filtrer", titre: "Banc de Tri : filtrer les gros lots",
	  indice: "awk -F, '$4 == \"COMPTOIR\" && $6 > 30' captures.csv | wc -l ; réponse 2 dans REPONSES.md." },
	{ id: "n10_sommer", titre: "Comptoir des Mesures : peser une espèce",
	  indice: "Comptoir (Syrine). awk -F, '$5 == \"ESPECE\" { s += $6 } END { print s }' captures.csv ; réponse 3." },
	{ id: "n10_statistiques", titre: "Comptoir des Mesures : médiane et moyennes, avec les bons outils",
	  indice: "csvstat -c prix_kg sur les lignes d'une espèce, ou datamash -t, -H -s -g espece median prix_kg mean poids_kg ; réponses 4 et 5." },
	{ id: "n10_rang1", titre: "ÉPREUVE DE RANG I : le Filet percé (rang Pêcheur de données)",
	  indice: "Épreuve de rang : regarde avant de compter. ~/filet." },
	{ id: "n10_encre", titre: "Gué des Encres : rendre l'encre du nord lisible (iconv)",
	  indice: "Gué (Noam). Dans ~/courants : file -i arrivee-nord.csv ; iconv -f ISO-8859-1 -t UTF-8 arrivee-nord.csv > nord.csv ; file -i nord.csv." },
	{ id: "n10_lignes", titre: "Gué des Encres : les fins de ligne et le BOM, puis une seule arrivée",
	  indice: "od -c arrivee-sud.csv | head -2 ; dos2unix -n arrivee-sud.csv sud.csv (CRLF et BOM partent) ; od -c sud.csv | head -2 ; puis arrivees.csv : l'en-tête une fois, les lignes de nord.csv et de sud.csv." },
	{ id: "n10_doublons", titre: "Moulin des Doublons : dédoublonner sans perdre l'en-tête",
	  indice: "Moulin (Maeva). tail -n +2 brutes.csv | sort | uniq -d | wc -l ; puis { head -n 1 brutes.csv; tail -n +2 brutes.csv | sort -u; } > uniques.csv." },
	{ id: "n10_differences", titre: "Moulin des Doublons : ce qui est arrivé depuis hier (comm)",
	  indice: "comm ne lit que des fichiers triés : tail -n +2 hier.csv | sort > hier.tri ; tail -n +2 aujourdhui.csv | sort > auj.tri ; comm -13 hier.tri auj.tri ; nouvelles.csv avec l'en-tête." },
	{ id: "n10_formats", titre: "Vanne des Formats : séparer les lignes justes des malformées",
	  indice: "Vanne (Kamal). awk -F, 'NR > 1 && NF != 8' vanne.csv ; valides.csv (en-tête, 8 champs, poids nombre, date AAAA-MM-JJ) et rejets.csv (le reste) : rien ne se perd." },
	{ id: "n10_json", titre: "Vanne des Formats : du CSV au JSON, et une question au JSON",
	  indice: "mlr --icsv --ojson cat valides.csv > captures.json ; jq '[.[] | select(.espece == \"sandre\")] | length' captures.json ; réponse 6 dans ~/courants/REPONSES.md." },
	{ id: "n10_rang2", titre: "ÉPREUVE DE RANG II : l'Eau trouble (rang Plongeur)",
	  indice: "Épreuve de rang : tout ce qu'un fichier peut avoir de travers. ~/eau-trouble, et ./valider.sh." },
	{ id: "n10_script", titre: "Écluse des Scripts : une écluse qui se ferme quand ça casse",
	  indice: "Écluse (Zélia). Dans ~/ecluses, ecluse.sh : set -euo pipefail en tête, \"$1\" entre guillemets ; ./ecluse.sh donnees/absente.csv (doit échouer) ; ./ecluse.sh \"donnees/arrivee du soir.csv\"." },
	{ id: "n10_piege", titre: "Écluse des Scripts : un fichier temporaire propre, et un piège qui le range",
	  indice: "tmp=$(mktemp) et trap 'rm -f \"$tmp\"' EXIT à la place de /tmp/ecluse.tmp ; relance ./ecluse.sh \"donnees/arrivee du soir.csv\"." },
	{ id: "n10_decouper", titre: "Bief des Parallèles : couper un gros fichier en morceaux",
	  indice: "Bief (Miguel). Dans ~/bief : mkdir morceaux ; tail -n +2 sondes.csv | split -l 500 - morceaux/sondes_ --additional-suffix=.csv ; wc -l morceaux/*." },
	{ id: "n10_parallele", titre: "Bief des Parallèles : compresser les morceaux en parallèle",
	  indice: "ls morceaux/*.csv | xargs -P 4 -n 1 zstd -q --rm (ou parallel zstd -q --rm ::: morceaux/*.csv) ; ls morceaux." },
	{ id: "n10_cron", titre: "Tour de Garde : la nuit de l'écluse, une seule fois à la fois",
	  indice: "Tour (Badis). crontab -e : 30 2 * * * flock -n /tmp/nuit.lock ~/ecluses/nuit.sh >> ~/ecluses/nuit.log 2>&1 ; et un essai à la main : flock -n /tmp/nuit.lock ~/ecluses/nuit.sh." },
	{ id: "n10_journal", titre: "Tour de Garde : laisser une trace, et la faire tourner",
	  indice: "logger -t ecluse \"...\" ; journalctl -t ecluse ; un ~/ecluses/logrotate.conf pour nuit.log (daily, rotate 7, compress, missingok) ; logrotate -d ~/ecluses/logrotate.conf." },
	{ id: "n10_rang3", titre: "ÉPREUVE DE RANG III : l'Écluse bloquée (rang Éclusier)",
	  indice: "Épreuve de rang : un pipeline qui ment. ~/ecluse-bloquee, et crontab -l." },
	{ id: "n10_disque", titre: "Fosse du Disque : le lac déborde, on mesure, on compresse",
	  indice: "Fosse (Arnaud). df -h /srv/lac ; du -sh /srv/lac/* | sort -h ; find /srv/lac/journaux -name '*.log' -mtime +30 ; puis zstd -q --rm sur ceux-là (rien d'effacé)." },
	{ id: "n10_fantome", titre: "Fosse du Disque : la place qui manque (un fichier effacé, encore ouvert)",
	  indice: "df dit plus que du : sudo lsof +L1 ; le collecteur tient un tampon effacé : sudo systemctl restart collecteur ; df -h /srv/lac." },
	{ id: "n10_pression", titre: "Chambre des Pressions : faire passer le job lourd après les autres",
	  indice: "Chambre (Julien). top (ou ps -eo pid,ni,%cpu,comm --sort=-%cpu | head) ; renice -n 15 -p PID ; ionice -c3 -p PID. Pas de kill : il doit finir." },
	{ id: "n10_bornes", titre: "Chambre des Pressions : lancer un job lourd, déjà borné",
	  indice: "Dans ~/profondeurs : timeout 30m nice -n 10 ionice -c3 ./agreger.sh (taskset -c 1 en plus si tu veux un seul cœur)." },
	{ id: "n10_anonymiser", titre: "Coffre des Secrets : un export public sans données personnelles",
	  indice: "Coffre (Megane). Dans ~/profondeurs : cut -d, -f1-5 export-brut.csv > export-public.csv (ou sed -E pour masquer) ; grep -c '@' export-public.csv doit dire 0." },
	{ id: "n10_droits", titre: "Coffre des Secrets : le brut sous clé, la copie détruite, le masque par défaut",
	  indice: "chmod 640 export-brut.csv ; setfacl -m g:analystes:r export-public.csv ; shred -u /tmp/export-brut-copie.csv ; echo 'umask 027' >> ~/.bashrc." },
	{ id: "n10_rang4", titre: "ÉPREUVE DE RANG IV : le Raz-de-marée (rang Sondeur des Abysses)",
	  indice: "Épreuve de rang : le disque est plein, l'ingestion est muette. df, journalctl -u ingestion, /etc/lac." },
	{ id: "n10_image", titre: "Chantier des Images : une image d'ETL reproductible",
	  indice: "Chantier (Elias). Dans ~/arsenal/etl : FROM python:3.12-slim, requirements épinglé (epuisette==1.4.2), un .dockerignore (essais/, .env), USER non-root, CMD [\"python\", \"etl.py\"] ; docker build -t etl:1.0 ." },
	{ id: "n10_lancer", titre: "Chantier des Images : lancer l'ETL, les données en lecture seule",
	  indice: "docker run --rm --user \"$(id -u):$(id -g)\" --memory 256m -v ~/arsenal/donnees:/data:ro -v ~/arsenal/sortie:/sortie etl:1.0 ; cat ~/arsenal/sortie/agregats.csv." },
	{ id: "n10_citerne", titre: "Citerne : la base dans un volume, chargée de toutes les captures",
	  indice: "Citerne (Remi). docker volume create citerne ; docker run -d --name citerne --env-file ~/arsenal/bassin/db.env -v citerne:/var/lib/postgresql/data postgres:16-alpine ; schema.sql puis les INSERT (awk) par docker exec -i citerne psql -U lac -d lac." },
	{ id: "n10_sauvegarde", titre: "Citerne : une sauvegarde, et la preuve qu'elle se restaure",
	  indice: "docker exec citerne pg_dump -U lac lac | gzip > ~/arsenal/sauvegardes/lac.sql.gz ; docker exec citerne createdb -U lac essai ; gunzip -c ~/arsenal/sauvegardes/lac.sql.gz | docker exec -i citerne psql -U lac -d essai." },
	{ id: "n10_compose", titre: "Grand Bassin : la pile qui démarre dans l'ordre",
	  indice: "Bassin (Eden). Dans ~/arsenal/bassin, compose.yaml : un volume pour db, un healthcheck pg_isready, etl en depends_on db condition: service_healthy ; docker build -t carnet:1.0 ~/arsenal/carnet (le service carnet en a besoin) ; docker compose up -d ; docker compose ps." },
	{ id: "n10_carnet", titre: "Grand Bassin : le carnet, sur 127.0.0.1 seulement, avec son jeton",
	  indice: "carnet : ports \"127.0.0.1:8888:8888\", env_file carnet.env, le volume sortie en :ro ; l'image carnet:1.0 construite (docker build -t carnet:1.0 ~/arsenal/carnet) ; docker compose up -d ; curl \"http://127.0.0.1:8888/?token=...\"." },
	{ id: "n10_rang5", titre: "ÉPREUVE DE RANG V : la Pile engloutie (rang Maître du Lac)",
	  indice: "Épreuve de rang : quatre fautes dans une pile. ~/pile-engloutie, docker compose ps, docker compose logs." },
	{ id: "n10_maree", titre: "La Grande Marée : voir Pipelinus remonter",
	  indice: "jauge ; puis sur lac : df -h /srv/lac ; ls -l /srv/lac/entree /srv/lac/public ; docker ps." },
	{ id: "n10_deluge", titre: "La Grande Marée : le Bras du Déluge (le disque qu'on noie)",
	  indice: "systemctl status deversoir ; sudo systemctl disable --now deversoir ; sudo truncate -s 0 /srv/lac/journaux/maree.log (pas rm : il est peut-être encore ouvert) ; df -h /srv/lac." },
	{ id: "n10_doublons_bras", titre: "La Grande Marée : le Bras des Doublons (tout arrive trois fois)",
	  indice: "{ head -n 1 /srv/lac/entree/captures-maree.csv; tail -n +2 /srv/lac/entree/captures-maree.csv | sort -u; } > /srv/lac/propre/captures-maree.csv" },
	{ id: "n10_encre_bras", titre: "La Grande Marée : le Bras de l'Encre (un relevé illisible)",
	  indice: "iconv -f ISO-8859-1 -t UTF-8 /srv/lac/entree/releve-sonar.csv | tr -d '\\r' > /srv/lac/propre/releve-sonar.csv" },
	{ id: "n10_poison", titre: "La Grande Marée : le Bras du Poison (des lignes de demain)",
	  indice: "Les lignes datées de demain et les poids négatifs vont en quarantaine, les autres dans propre : awk -F, sur la date et sur $6." },
	{ id: "n10_brouillard", titre: "La Grande Marée : le Bras du Brouillard (des données personnelles publiées)",
	  indice: "Dans /srv/lac/public, plus aucune adresse ni téléphone : cut -d, -f1-5 (dans un fichier à part, puis mv), grep -rlE '@|06 ' /srv/lac/public." },
	{ id: "n10_fourche", titre: "La Grande Marée : le Bras de la Fourche (un conteneur qui dévore)",
	  indice: "docker stats --no-stream ; docker ps --filter label=lac.bras ; docker rm -f bras-fourche." },
	{ id: "n10_mimetisme", titre: "La Grande Marée : le Bras du Mimétisme (une image qui ment)",
	  indice: "docker image inspect etl:1.0 --format '{{json .Config.Labels}}' ; docker history etl:1.0 ; docker build -t etl:1.0 ~/arsenal/etl ; relance l'ETL." },
	{ id: "n10_neant", titre: "La Grande Marée : le Bras du Néant (la base engloutie)",
	  indice: "docker ps -a ; docker volume ls ; une nouvelle citerne (un volume, postgres) ; puis ta sauvegarde : gunzip -c ~/arsenal/sauvegardes/....sql.gz | docker exec -i citerne psql -U lac -d lac." },
	{ id: "n10_clarte", titre: "La Clarté du Lac au-dessus de 90",
	  indice: "Après la Marée, jauge doit afficher une clarté d'au moins 90 : elle dit ce qui manque encore." },
	{ id: "n10_rapport", titre: "Le rapport de la Grande Marée, remis à Laurent",
	  indice: "Sur l'île, ~/Cybersup/Lac/BoiteDeLaurent/rapport.txt : Pipelinus, les huit bras, ce qui a été fait, ce qui reste, la clarté finale." }
];
var QUETES_SECONDAIRES_CH10 = [];   // les défis des maîtres et de Wissam : Abysses.js

var INDICES_CH10 = {
	n10_entree: ["Le Lac est sous Cybersup.", "cd ~/Cybersup/Lac"],
	n10_jauge: ["Wissam et l'Ordre sont sur la rive ; jauge est une commande du jeu.", "cat Wissam ; cat Ordre ; jauge"],
	n10_quai: ["Les données vivent sur la machine lac : on s'y connecte par ssh, et on regarde avant de toucher.", "ssh lac ; ls ; cat /srv/lac/LISEZMOI ; df -h /srv/lac"],
	n10_regarder: ["Quatre regards avant de toucher une donnée : sa nature (file), son début (head), sa taille (wc -l), ses colonnes alignées (column, csvlook).",
		"cd ~/rive ; file captures.csv ; head captures.csv ; wc -l captures.csv ; column -s, -t < captures.csv | head (ou csvlook captures.csv | head)"],
	n10_octets: ["od -c montre chaque octet : \\t est une tabulation, \\n une fin de ligne. tr change un caractère en un autre.",
		"od -c mystere.txt | head -3 ; tr '\\t' ',' < mystere.txt > mystere.csv ; head -3 mystere.csv"],
	n10_trier: ["cut garde une colonne, sort range, uniq -c compte les lignes identiques qui se suivent, sort -rn met les plus grands en haut.",
		"cut -d, -f4 captures.csv | tail -n +2 | sort | uniq -c | sort -rn | head -3 ; puis le comptoir du haut dans REPONSES.md (1. Réponse : ...)"],
	n10_filtrer: ["awk -F, découpe chaque ligne aux virgules : $4 est le comptoir, $6 le poids. Une condition seule affiche les lignes qui la remplissent.",
		"awk -F, '$4 == \"COMPTOIR\" && $6 > 30' captures.csv | wc -l (le comptoir de la question 2) ; puis la réponse 2"],
	n10_sommer: ["awk additionne dans une variable, et l'affiche à la fin (END).", "awk -F, '$5 == \"ESPECE\" { s += $6 } END { printf \"%.0f\\n\", s }' captures.csv ; puis la réponse 3"],
	n10_statistiques: ["La médiane, c'est la valeur du milieu : csvstat et datamash la calculent. datamash veut des lignes triées par groupe (-s).",
		"csvgrep -c espece -m \"ESPECE\" captures.csv | csvstat -c prix_kg --median ; datamash -t, -H -s -g espece mean poids_kg < captures.csv | sort -t, -k2 -nr ; réponses 4 et 5"],
	n10_rang1: ["Trois choses à voir avant de compter : le séparateur (;), la virgule décimale (3,5), et l'en-tête. tr ',' '.' sur les nombres, ou awk -F';' avec gsub.",
		"cd ~/filet ; head -3 filet.csv ; tail -n +2 filet.csv | cut -d';' -f6 | sort -u | wc -l ; tail -n +2 filet.csv | awk -F';' '{ gsub(\",\", \".\", $4); kg[$1] += $4 } END { for (d in kg) print kg[d], d }' | sort -rn | head -1 ; tail -n +2 filet.csv | awk -F';' '{ gsub(\",\", \".\", $5); s[$2] += $5; n[$2]++ } END { for (c in s) print s[c]/n[c], c }' | sort -n | head -1"],
	n10_encre: ["file -i dit l'encodage (charset). iconv convertit d'un encodage à un autre : -f d'où l'on part, -t où l'on va.",
		"cd ~/courants ; file -i arrivee-nord.csv ; iconv -f ISO-8859-1 -t UTF-8 arrivee-nord.csv > nord.csv ; file -i nord.csv ; grep -c écrevisse nord.csv"],
	n10_lignes: ["CRLF : \\r\\n à chaque fin de ligne (dos2unix les retire). Le BOM : trois octets invisibles en tête (357 273 277 dans od -c), que dos2unix retire aussi par défaut (avec tr -d '\\r', il reste : sed -i '1s/^\\xEF\\xBB\\xBF//').",
		"od -c arrivee-sud.csv | head -2 ; dos2unix -n arrivee-sud.csv sud.csv ; od -c sud.csv | head -2 ; { head -n 1 nord.csv; tail -n +2 nord.csv; tail -n +2 sud.csv; } > arrivees.csv ; od -c arrivees.csv | head -2"],
	n10_doublons: ["sort -u garde une seule ligne de chaque. Mais l'en-tête doit rester en tête : on le met de côté (head -n 1), on trie le reste.",
		"tail -n +2 brutes.csv | sort | uniq -d | wc -l ; { head -n 1 brutes.csv; tail -n +2 brutes.csv | sort -u; } > uniques.csv ; wc -l uniques.csv"],
	n10_differences: ["comm compare deux fichiers TRIÉS : colonne 1, seulement dans le premier ; 2, seulement dans le second ; 3, dans les deux. -13 garde la colonne 2.",
		"tail -n +2 hier.csv | sort > hier.tri ; tail -n +2 aujourdhui.csv | sort > auj.tri ; { head -n 1 aujourdhui.csv; comm -13 hier.tri auj.tri; } > nouvelles.csv ; wc -l nouvelles.csv"],
	n10_formats: ["NF est le nombre de champs de la ligne ; une expression régulière dit si le poids est un nombre et si la date est au format AAAA-MM-JJ.",
		"awk -F, 'NR == 1 || (NF == 8 && $6 ~ /^[0-9]+(\\.[0-9]+)?$/ && $2 ~ /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/)' vanne.csv > valides.csv ; awk -F, 'NR > 1 && !(NF == 8 && $6 ~ /^[0-9]+(\\.[0-9]+)?$/ && $2 ~ /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/)' vanne.csv > rejets.csv ; wc -l valides.csv rejets.csv"],
	n10_json: ["mlr lit du CSV (--icsv) et écrit du JSON (--ojson). jq interroge le JSON : select garde ce qui répond à la condition, length compte.",
		"mlr --icsv --ojson cat valides.csv > captures.json ; jq '[.[] | select(.espece == \"sandre\")] | length' captures.json ; puis la réponse 6"],
	n10_rang2: ["Dans l'ordre : l'encre (iconv), les fins de ligne (tr -d '\\r' ou dos2unix), les doublons (sort -u, l'en-tête à part), la vanne (awk : 8 champs, un poids nombre, une date AAAA-MM-JJ). Les rejets dans rejets.csv.",
		"cd ~/eau-trouble ; iconv -f ISO-8859-1 -t UTF-8 arrivage.csv | tr -d '\\r' > net.csv ; head -n 1 net.csv > propre.csv ; tail -n +2 net.csv | sort -u | awk -F, 'NF == 8 && $6 ~ /^[0-9]+(\\.[0-9]+)?$/ && $2 ~ /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/' >> propre.csv ; tail -n +2 net.csv | sort -u | awk -F, '!(NF == 8 && $6 ~ /^[0-9]+(\\.[0-9]+)?$/ && $2 ~ /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/)' > rejets.csv ; ./valider.sh propre.csv"],
	n10_script: ["set -e arrête à la première erreur, -u refuse une variable jamais définie, -o pipefail fait échouer un tuyau dès qu'une de ses commandes échoue. Et \"$1\" garde les espaces d'un nom de fichier.",
		"cd ~/ecluses ; nano ecluse.sh (set -euo pipefail sous #!/bin/bash ; fichier=\"$1\" ; tail -n +2 \"$fichier\") ; ./ecluse.sh donnees/absente.csv ; echo $? ; ./ecluse.sh \"donnees/arrivee du soir.csv\" ; cat sortie/bilan.csv"],
	n10_piege: ["mktemp crée un fichier temporaire au nom unique ; trap 'commande' EXIT lance la commande quand le script se termine, qu'il réussisse ou qu'il échoue.",
		"nano ecluse.sh : tmp=$(mktemp) puis trap 'rm -f \"$tmp\"' EXIT, et \"$tmp\" partout à la place de /tmp/ecluse.tmp ; ./ecluse.sh \"donnees/arrivee du soir.csv\" ; ls /tmp (et si d'anciens essais ont laissé des /tmp/tmp.*, rm /tmp/tmp.* puis relance)"],
	n10_decouper: ["split -l N coupe un flux en morceaux de N lignes ; le - lit l'entrée standard ; --additional-suffix ajoute l'extension. L'en-tête ne doit pas se retrouver au milieu.",
		"cd ~/bief ; mkdir morceaux ; tail -n +2 sondes.csv | split -l 500 - morceaux/sondes_ --additional-suffix=.csv ; wc -l morceaux/*"],
	n10_parallele: ["xargs -P 4 lance quatre commandes à la fois ; -n 1 donne un fichier à chacune. parallel fait pareil avec ::: . zstd --rm retire l'original une fois compressé.",
		"ls morceaux/*.csv | xargs -P 4 -n 1 zstd -q --rm ; ls morceaux"],
	n10_cron: ["Une ligne de crontab : minute heure jour mois jour_de_semaine commande. flock -n prend un verrou, ou abandonne s'il est déjà pris : jamais deux nuits en même temps.",
		"crontab -e, puis la ligne : 30 2 * * * flock -n /tmp/nuit.lock ~/ecluses/nuit.sh >> ~/ecluses/nuit.log 2>&1 ; crontab -l ; flock -n /tmp/nuit.lock ~/ecluses/nuit.sh"],
	n10_journal: ["logger écrit dans le journal du système, sous une étiquette (-t) ; journalctl -t la relit. logrotate fait tourner un journal : il le compresse et n'en garde que N.",
		"logger -t ecluse \"nuit de l'écluse : essai\" ; journalctl -t ecluse ; printf '%s\\n' \"$HOME/ecluses/nuit.log {\" '  daily' '  rotate 7' '  compress' '  missingok' '  notifempty' '}' > ~/ecluses/logrotate.conf ; logrotate -d ~/ecluses/logrotate.conf"],
	n10_rang3: ["Trois choses : un pipeline qui échoue quand un relevé est illisible (pipefail), le relevé illisible mis en quarantaine (gzip -t le trouve), et une seule ligne de cron, sous flock.",
		"cd ~/ecluse-bloquee ; gzip -t sondes/*.gz ; mv sondes/LE_MAUVAIS quarantaine/ ; nano pipeline.sh (set -euo pipefail) ; ./pipeline.sh ; crontab -e (une seule ligne : 15 3 * * * flock -n /tmp/pipeline.lock ~/ecluse-bloquee/pipeline.sh > /dev/null 2>&1)"],
	n10_disque: ["df dit la place prise par système de fichiers ; du, la place prise par dossier ; find -mtime +30 trouve ce qui n'a pas bougé depuis plus de trente jours.",
		"df -h /srv/lac ; sudo du -sh /srv/lac/* | sort -h ; sudo find /srv/lac/journaux -name '*.log' -mtime +30 ; sudo find /srv/lac/journaux -name '*.log' -mtime +30 -exec zstd -q --rm {} \\; ; df -h /srv/lac"],
	n10_fantome: ["Un fichier effacé qu'un processus tient encore ouvert garde sa place sur le disque : lsof +L1 le montre. Le processus relâché, la place revient.",
		"df -h /srv/lac ; sudo du -sh /srv/lac ; sudo lsof +L1 ; sudo systemctl restart collecteur ; df -h /srv/lac"],
	n10_pression: ["nice (de -20 à 19) règle la part de processeur : plus il est haut, plus le processus est gentil. ionice -c3 (idle) ne lit le disque que quand personne d'autre ne le fait.",
		"ps -eo pid,ni,%cpu,comm --sort=-%cpu | head -3 ; renice -n 15 -p PID ; ionice -c3 -p PID ; ps -o pid,ni,comm -p PID ; ionice -p PID"],
	n10_bornes: ["Un job lourd se lance déjà borné : timeout l'arrête s'il dure trop, nice et ionice le font passer après, taskset le tient sur un cœur.",
		"cd ~/profondeurs ; timeout 30m nice -n 10 ionice -c3 taskset -c 1 ./agreger.sh ; cat mensuel.csv"],
	n10_anonymiser: ["Une donnée personnelle se retire (cut) ou se masque (sed -E) ; l'export public garde tout le reste, ligne pour ligne.",
		"cd ~/profondeurs ; cut -d, -f1-5 export-brut.csv > export-public.csv ; grep -cE '@|06 ' export-public.csv ; wc -l export-brut.csv export-public.csv"],
	n10_droits: ["640 : le propriétaire lit et écrit, le groupe lit, les autres rien. Une ACL donne un droit à un groupe de plus. shred écrase avant d'effacer. umask règle les droits des fichiers à venir.",
		"chmod 640 export-brut.csv ; setfacl -m g:analystes:r export-public.csv ; getfacl export-public.csv ; shred -u /tmp/export-brut-copie.csv ; echo 'umask 027' >> ~/.bashrc"],
	n10_rang4: ["Le disque est plein parce qu'un journal DEBUG grossit sans fin. Un journal ouvert ne se libère pas avec rm : on le vide (truncate), on remet le niveau INFO, on relance, et on pose une rotation.",
		"df -h /srv/lac ; journalctl -u ingestion | tail ; sudo du -sh /srv/lac/journaux/* | sort -h | tail -3 ; sudo sed -i 's/^LOG_LEVEL=DEBUG/LOG_LEVEL=INFO/' /etc/lac/ingestion.conf ; sudo truncate -s 0 /srv/lac/journaux/ingestion-debug.log ; sudo systemctl restart ingestion ; un /etc/logrotate.d/lac pour /srv/lac/journaux/*.log (daily, rotate 7, compress, copytruncate) ; df -h /srv/lac"],
	n10_image: ["Une image reproductible : une base épinglée (pas latest), les dépendances épinglées (==), copiées avant le code (le cache), rien d'inutile (.dockerignore), et pas root.",
		"cd ~/arsenal/etl ; echo 'epuisette==1.4.2' > requirements.txt ; printf 'essais/\\n.env\\n' > .dockerignore ; nano Dockerfile (FROM python:3.12-slim, WORKDIR /app, COPY requirements.txt ., RUN pip install --no-cache-dir -r requirements.txt, COPY etl.py ., USER 10001, CMD [\"python\", \"etl.py\"]) ; docker build -t etl:1.0 ."],
	n10_lancer: ["-v DOSSIER:/data:ro monte les données en lecture seule ; --user donne au conteneur ton identité, pour écrire dans ton dossier de sortie ; --memory le borne.",
		"docker run --rm --user \"$(id -u):$(id -g)\" --memory 256m -v ~/arsenal/donnees:/data:ro -v ~/arsenal/sortie:/sortie etl:1.0 ; cat ~/arsenal/sortie/agregats.csv"],
	n10_citerne: ["Les données d'un postgres vivent dans un volume nommé : le conteneur passe, le volume reste. Les INSERT se fabriquent avec awk, et passent par docker exec -i.",
		"docker volume create citerne ; docker run -d --name citerne --env-file ~/arsenal/bassin/db.env -v citerne:/var/lib/postgresql/data postgres:16-alpine ; docker exec -i citerne psql -U lac -d lac < ~/arsenal/citerne/schema.sql ; tail -n +2 ~/arsenal/donnees/captures.csv | awk -F, '{ printf \"INSERT INTO captures VALUES (%s%s%s, %s%s%s, %s%s%s, %s%s%s, %s%s%s, %s, %s, %s%s%s);\\n\", q,$1,q, q,$2,q, q,$3,q, q,$4,q, q,$5,q, $6, $7, q,$8,q }' q=\"'\" | docker exec -i citerne psql -U lac -d lac ; docker exec citerne psql -U lac -d lac -c 'SELECT count(*) FROM captures'"],
	n10_sauvegarde: ["Une sauvegarde qu'on n'a jamais restaurée n'est qu'un espoir. pg_dump écrit la base en SQL ; on la recharge dans une base d'essai, et on compte.",
		"docker exec citerne pg_dump -U lac lac | gzip > ~/arsenal/sauvegardes/lac.sql.gz ; docker exec citerne createdb -U lac essai ; gunzip -c ~/arsenal/sauvegardes/lac.sql.gz | docker exec -i citerne psql -U lac -d essai ; docker exec citerne psql -U lac -d essai -c 'SELECT count(*) FROM captures'"],
	n10_compose: ["depends_on seul attend que la base DÉMARRE ; condition: service_healthy attend qu'elle RÉPONDE (son healthcheck).",
		"cd ~/arsenal/bassin ; nano compose.yaml (db : volumes - citerne-bassin:/var/lib/postgresql/data, healthcheck test [\"CMD-SHELL\", \"pg_isready -U lac -d lac\"] ; etl : depends_on: db: condition: service_healthy, environment DB_HOST db DB_PASSWORD..., volumes ./donnees:/data:ro et ./sortie:/sortie ; volumes: citerne-bassin:) ; docker build -t carnet:1.0 ~/arsenal/carnet ; docker compose up -d ; docker compose ps"],
	n10_carnet: ["127.0.0.1:8888:8888 publie le port pour la machine seule, pas pour tout le réseau. Le jeton se passe par un env_file, jamais en clair dans compose.yaml.",
		"nano compose.yaml (carnet : ports - \"127.0.0.1:8888:8888\", env_file: carnet.env, volumes - ./sortie:/sortie:ro) ; docker build -t carnet:1.0 ~/arsenal/carnet (si ce n'est pas fait) ; docker compose up -d ; docker compose ps ; curl \"http://127.0.0.1:8888/?token=$(cut -d= -f2 carnet.env)\""],
	n10_rang5: ["Quatre fautes : une base étranglée (mem_limit), un ETL qui part avant que la base réponde, un dossier mal nommé, un carnet ouvert à tous et sans jeton.",
		"cd ~/pile-engloutie ; docker compose up -d ; docker compose ps ; docker compose logs db etl carnet ; nano compose.yaml (mem_limit 256m, condition: service_healthy, ./donnees, ports 127.0.0.1:8889:8888 et env_file carnet.env) ; docker compose up -d ; docker compose ps ; cat sortie/agregats.csv"],
	n10_maree: ["La jauge dit ce que Pipelinus attaque ; sur lac, on regarde avant d'agir.", "jauge ; ssh lac ; df -h /srv/lac ; ls -l /srv/lac/entree /srv/lac/public ; docker ps"],
	n10_deluge: ["Un service qui remplit le disque : on l'arrête et on l'empêche de revenir (disable --now). Son journal, encore ouvert peut-être, se vide (truncate), il ne s'efface pas.",
		"systemctl status deversoir ; sudo systemctl disable --now deversoir ; sudo truncate -s 0 /srv/lac/journaux/maree.log ; df -h /srv/lac"],
	n10_doublons_bras: ["Le Moulin : l'en-tête à part, sort -u pour le reste.", "{ head -n 1 /srv/lac/entree/captures-maree.csv; tail -n +2 /srv/lac/entree/captures-maree.csv | sort -u; } > /srv/lac/propre/captures-maree.csv ; wc -l /srv/lac/propre/captures-maree.csv"],
	n10_encre_bras: ["Le Gué : iconv pour l'encre, tr -d '\\r' (ou dos2unix) pour les fins de ligne.", "iconv -f ISO-8859-1 -t UTF-8 /srv/lac/entree/releve-sonar.csv | tr -d '\\r' > /srv/lac/propre/releve-sonar.csv ; file /srv/lac/propre/releve-sonar.csv"],
	n10_poison: ["Une capture datée de demain, ou d'un poids négatif, est fausse : elle part en quarantaine (on la garde, pour comprendre), jamais dans propre.",
		"d=$(date -d tomorrow +%F) ; f=/srv/lac/entree/captures-demain.csv ; awk -F, -v d=\"$d\" 'NR == 1 || ($2 != d && $6 >= 0)' $f > /srv/lac/propre/captures-demain.csv ; awk -F, -v d=\"$d\" 'NR > 1 && ($2 == d || $6 < 0)' $f > /srv/lac/quarantaine/captures-demain.rejets.csv"],
	n10_brouillard: ["Le Coffre : on retire les colonnes personnelles dans un nouveau fichier, puis on remplace l'export public.",
		"cut -d, -f1-5 /srv/lac/public/export-du-jour.csv > /tmp/export-propre.csv ; mv /tmp/export-propre.csv /srv/lac/public/export-du-jour.csv ; grep -rlE '@|06 ' /srv/lac/public"],
	n10_fourche: ["docker stats montre qui dévore la mémoire ; un conteneur qu'on n'a pas lancé, signé P.G., se retire.", "docker stats --no-stream ; docker ps --filter label=lac.bras ; docker rm -f bras-fourche"],
	n10_mimetisme: ["Une image se juge à son contenu, pas à son nom : ses labels, son historique. On la reconstruit depuis TON Dockerfile.",
		"docker image inspect etl:1.0 --format '{{json .Config.Labels}}' ; docker history etl:1.0 ; docker build -t etl:1.0 ~/arsenal/etl ; docker run --rm --user \"$(id -u):$(id -g)\" -v ~/arsenal/donnees:/data:ro -v ~/arsenal/sortie:/sortie etl:1.0"],
	n10_neant: ["Le volume est parti : la base se refait d'un volume neuf et de ta sauvegarde.",
		"docker volume create citerne ; docker run -d --name citerne --env-file ~/arsenal/bassin/db.env -v citerne:/var/lib/postgresql/data postgres:16-alpine ; gunzip -c ~/arsenal/sauvegardes/lac.sql.gz | docker exec -i citerne psql -U lac -d lac ; docker exec citerne psql -U lac -d lac -c 'SELECT count(*) FROM captures'"],
	n10_clarte: ["jauge, n'importe où, dit ce qui manque encore.", "jauge"],
	n10_rapport: ["Un here-document écrit le rapport d'un coup, dans la boîte de Laurent, sur l'île.", "cat > ~/Cybersup/Lac/BoiteDeLaurent/rapport.txt <<'FIN' ... FIN"]
};

/* La radio de Grace : un conseil par étape. */
var CONSEILS_CH10 = {
	n10_jauge: "Ici la WarRoom. Le Lac, enfin. Écoute Wissam, lis l'Ordre, et plonge la jauge : jauge.",
	n10_quai: "Les données sont sur la machine lac. ssh lac, et regarde avant de toucher quoi que ce soit.",
	n10_regarder: "La Grève, chez Lamia : on ne compte rien avant d'avoir regardé. file, head, wc.",
	n10_octets: "Un fichier peut mentir à l'écran. Les octets, jamais : od -c.",
	n10_trier: "Le Banc de Tri, chez Younes : une colonne, triée, comptée. Le tuyau le plus célèbre du métier.",
	n10_filtrer: "Filtre avec awk : une condition, et seules les bonnes lignes passent.",
	n10_sommer: "Le Comptoir, chez Syrine : additionne une colonne, groupe par groupe.",
	n10_statistiques: "Une moyenne ment quand un seul lot est énorme. La médiane, non.",
	n10_rang1: "Ton épreuve de rang, Riverain. Pas d'indice gratuit : regarde le fichier avant de compter.",
	n10_encre: "Le Gué, chez Noam : une encre du nord, illisible pour le reste du lac. Convertis-la.",
	n10_lignes: "Trois octets invisibles en tête d'un fichier peuvent casser un pipeline entier. Regarde-les.",
	n10_doublons: "Le Moulin, chez Maeva : sépare chaque prise de son reflet. Et garde l'en-tête en tête.",
	n10_differences: "Ce qui est arrivé depuis hier, et seulement ça : comm, sur des fichiers triés.",
	n10_formats: "La Vanne, chez Kamal : les lignes déchirées ne passent pas. Mais elles ne se jettent pas non plus.",
	n10_json: "Le reste de l'école parle JSON. Traduis, puis interroge.",
	n10_rang2: "Épreuve de rang, Pêcheur. L'arrivage de cette nuit a tout ce qu'un fichier peut avoir de travers.",
	n10_script: "L'Écluse, chez Zélia : un script qui échoue en silence est le pire ennemi d'un lac.",
	n10_piege: "Un fichier temporaire au nom fixe, c'est deux nuits qui s'écrasent. mktemp, et un piège pour ranger.",
	n10_decouper: "Le Bief, chez Miguel : un gros fichier, des petits morceaux. Sans en perdre une ligne.",
	n10_parallele: "Quatre morceaux à la fois. La machine a quatre cœurs : sers-t'en.",
	n10_cron: "La Tour de Garde, chez Badis : ce qui tourne la nuit tourne sans toi. Une seule fois à la fois.",
	n10_journal: "Ce qui tourne la nuit doit laisser une trace. Et la trace ne doit pas remplir le disque.",
	n10_rang3: "Épreuve de rang, Plongeur. Un pipeline qui dit « tout va bien » depuis trois nuits. Il ment.",
	n10_disque: "La Fosse, chez Arnaud : le disque du lac déborde. Mesure, puis compresse. N'efface rien.",
	n10_fantome: "df et du ne disent pas la même chose. La différence a un nom : un fichier effacé, encore ouvert.",
	n10_pression: "La Chambre, chez Julien : un job écrase la machine. Il doit finir. Fais-le passer après les autres.",
	n10_bornes: "Le prochain job lourd, lance-le déjà borné. Ne laisse jamais une agrégation décider à ta place.",
	n10_anonymiser: "Le Coffre, chez Megane : rien de personnel ne sort du lac. Ni adresse, ni téléphone.",
	n10_droits: "Le brut sous clé, la copie détruite, et des droits sûrs par défaut.",
	n10_rang4: "Épreuve de rang, Éclusier. Le disque est plein, l'ingestion se tait. Trouve pourquoi, sans rien perdre.",
	n10_image: "Le Chantier, chez Elias : une image qui se reconstruit à l'identique, dans un an, sur une autre machine.",
	n10_lancer: "Les données en lecture seule. L'ETL ne doit jamais pouvoir abîmer sa source.",
	n10_citerne: "La Citerne, chez Remi : la base dans un volume, et toutes les captures dedans.",
	n10_sauvegarde: "Une sauvegarde qu'on n'a jamais restaurée n'est qu'un espoir. Restaure-la.",
	n10_compose: "Le Grand Bassin, chez Eden : la base d'abord, et en bonne santé. Puis l'ETL.",
	n10_carnet: "Le carnet ne s'ouvre qu'à la machine, et qu'à ceux qui ont le jeton.",
	n10_rang5: "Épreuve de rang, Sondeur. Une pile engloutie, quatre fautes. Lis les journaux.",
	n10_maree: "La voilà. La Grande Marée. Pipelinus remonte. jauge, puis regarde le lac.",
	n10_deluge: "Il noie le disque. Arrête le déversoir, et qu'il ne revienne pas.",
	n10_doublons_bras: "Tout arrive trois fois. Le Moulin, Plongeur, le Moulin.",
	n10_encre_bras: "Une encre illisible dans l'entrée. Le Gué.",
	n10_poison: "Des captures datées de demain. Comme ses sceaux. En quarantaine.",
	n10_brouillard: "Il publie les adresses des pêcheurs. Lève le brouillard, vite.",
	n10_fourche: "Un conteneur qui dévore tout. Il n'est pas à nous.",
	n10_mimetisme: "etl:1.0 n'est plus ton image. Regarde ses labels.",
	n10_neant: "La citerne est vide. Le volume est parti. Ta sauvegarde, c'est maintenant qu'elle compte.",
	n10_clarte: "Le lac doit retrouver sa clarté : au-dessus de 90. jauge te dit ce qui manque.",
	n10_rapport: "Dernière chose, Maître du Lac : le rapport pour Laurent. Les huit bras, un par un."
};
var METIER_CH10 = {
	n10_quai: "En data, on ne travaille jamais sur la seule copie d'une donnée : on regarde, puis on travaille sur une copie.",
	n10_regarder: "Le premier réflexe d'un data engineer devant un fichier : sa taille, son encodage, ses premières lignes. Avant tout script.",
	n10_octets: "Un séparateur invisible (tabulation, espace insécable) casse plus de pipelines qu'aucun bug de code.",
	n10_trier: "sort | uniq -c | sort -rn : le premier tableau de fréquences de tout analyste, avant même d'ouvrir un notebook.",
	n10_filtrer: "awk filtre des millions de lignes en quelques secondes, sans rien charger en mémoire.",
	n10_sommer: "Un agrégat se vérifie toujours par un deuxième calcul, avec un autre outil.",
	n10_statistiques: "La médiane résiste aux valeurs extrêmes : pour des prix ou des salaires, on la regarde avant la moyenne.",
	n10_encre: "Une donnée mal encodée se corrige à l'entrée du pipeline, une seule fois, jamais dans chaque rapport.",
	n10_lignes: "Le BOM et les CRLF viennent souvent d'un export de tableur : file et od les trahissent en une seconde.",
	n10_doublons: "Une ingestion doit être idempotente : rejouer le même fichier ne doit jamais créer de doublons.",
	n10_differences: "Ne traiter que le delta (ce qui est nouveau) : c'est ce qui rend un pipeline rapide et rejouable.",
	n10_formats: "Une ligne rejetée va en quarantaine avec sa raison : quelqu'un doit pouvoir la relire, et le fournisseur, corriger.",
	n10_json: "CSV pour les tableurs, JSON pour les API et les bases documentaires : mlr et jq passent de l'un à l'autre.",
	n10_script: "set -euo pipefail en tête de chaque script de production : c'est la ceinture de sécurité du bash.",
	n10_piege: "mktemp et trap EXIT : pas de fichiers orphelins, pas de collisions entre deux exécutions.",
	n10_decouper: "Découper un gros fichier, c'est pouvoir le traiter en parallèle, le reprendre en cas d'échec, l'envoyer par morceaux.",
	n10_parallele: "xargs -P et parallel exploitent tous les cœurs : un traitement de quatre heures peut en prendre une.",
	n10_cron: "flock -n sur une tâche cron : si la précédente n'est pas finie, la suivante ne démarre pas. Sans ça, deux jobs écrivent le même fichier.",
	n10_journal: "Un journal sans rotation finit toujours par remplir un disque, un vendredi soir.",
	n10_disque: "On ne supprime pas un journal sur un serveur de données : on le compresse et on l'archive. Il servira à un audit.",
	n10_fantome: "Un rm sur un fichier ouvert ne libère rien : il faut relancer le processus, ou vider le fichier (truncate).",
	n10_pression: "renice et ionice ne tuent rien : ils redonnent la machine aux services pendant qu'un batch finit.",
	n10_bornes: "timeout, nice, ionice, taskset : un batch qui ne peut pas déborder ne réveille personne la nuit.",
	n10_anonymiser: "Le RGPD impose la minimisation : un export ne contient que les données utiles à son usage.",
	n10_droits: "umask 027 : les fichiers créés ne sont jamais lisibles par tout le monde. Le brut d'un export reste au propriétaire.",
	n10_image: "Une image épinglée (base et dépendances) donne le même résultat aujourd'hui et dans un an : c'est la reproductibilité.",
	n10_lancer: "Monter les données sources en lecture seule protège la source : un bug de l'ETL ne peut pas la détruire.",
	n10_citerne: "Les données d'une base vivent dans un volume, jamais dans le conteneur : un conteneur se jette, un volume se sauvegarde.",
	n10_sauvegarde: "Une sauvegarde se teste en la restaurant, régulièrement, sur une base d'essai.",
	n10_compose: "service_healthy évite l'erreur la plus courante d'une pile : l'application qui démarre avant que la base n'accepte les connexions.",
	n10_carnet: "Un notebook exposé sur 0.0.0.0 sans jeton, c'est un terminal ouvert sur la machine : la fuite classique en data science.",
	n10_maree: "Un incident commence par un état des lieux, pas par une commande au hasard.",
	n10_deluge: "systemctl disable --now : arrêté maintenant, et pas relancé au prochain démarrage.",
	n10_poison: "La validation des données (dates futures, valeurs négatives) se fait à l'entrée du pipeline, avant tout calcul.",
	n10_brouillard: "Une fuite de données personnelles se notifie à la CNIL sous 72 heures : on la referme, puis on documente.",
	n10_fourche: "--memory et --pids-limit sur chaque conteneur : un conteneur fou ne peut plus prendre toute la machine.",
	n10_mimetisme: "On épingle une image par son digest (image@sha256:...) : un tag peut être déplacé, un digest jamais.",
	n10_neant: "La seule sauvegarde qui compte est celle qui se restaure. Le reste est un fichier.",
	n10_rapport: "Un rapport d'incident dit ce qui s'est passé, ce qui a été fait, et ce qui reste à faire."
};

/* ------------------------------------------------------------------ */
/* Ce que le joueur a constaté (les sorts lancés, et leur issue)        */
/* ------------------------------------------------------------------ */

function vuCh10(cle){ return !!(sCh10().vus || {})[cle]; }
function noterVuCh10(cle){ var c = sCh10(); c.vus = c.vus || {}; if (!c.vus[cle]) c.vus[cle] = c.minutes || 1; }
function lacActif(){ return lacOuvert() && !!(state.quests && state.quests["n10_entree"]); }
function surLacCh10(){ try { return Shell.hote() === LAC_CH10; } catch (e){ return false; } }
function dossierCourantCh10(){ try { return cheminDuLieuMachine(current_room); } catch (e){ return ""; } }
function aArgCh10(args, motif){ return (args || []).some(function(a){ return motif.test(String(a)); }); }
function aOptionCh10(args, lettre){ return (args || []).some(function(a){ return a === "--" + lettre || (lettre.length === 1 && /^-[a-zA-Z]+$/.test(a) && a.indexOf(lettre) > 0); }); }
function observerCh10(nom, args, sortie, ok){
	var a = args || [], s = String(sortie || ""), ici = dossierCourantCh10(), lac = surLacCh10();
	if (nom === "jauge"){ noterVuCh10("jauge"); if (sCh10().maree) noterVuCh10("jaugeMaree"); }
	if (!lac || !ok) return;
	var dans = function(d){ return ici.indexOf(homeLacCh10() + "/" + d) === 0; };
	var cible = function(motif){ return aArgCh10(a, motif); };
	if (ici === homeLacCh10() || nom === "ls") noterVuCh10("surLac");
	if (nom === "cat" && cible(/LISEZMOI$/)) noterVuCh10("lisezmoi");
	if (nom === "df") noterVuCh10("df");
	// La Grève
	if (nom === "file" && cible(/captures\.csv$/)) noterVuCh10("fileCaptures");
	if (nom === "head" && cible(/captures\.csv$/)) noterVuCh10("headCaptures");
	if (nom === "wc" && cible(/captures\.csv$/)) noterVuCh10("wcCaptures");
	if ((nom === "column" && aArgCh10(a, /^-[a-z]*t/)) || nom === "csvlook") { if (dans("rive") || cible(/captures\.csv$/)) noterVuCh10("colonnes"); }
	if ((nom === "od" || nom === "hexdump" || nom === "xxd" || (nom === "cat" && aArgCh10(a, /^-[a-zA-Z]*[AvTE]/))) && (cible(/mystere\.txt$/) || dans("rive"))) noterVuCh10("octetsMystere");
	// Le Banc, le Comptoir
	if (nom === "uniq" && aArgCh10(a, /^-[a-z]*c|^--count$/)) noterVuCh10("uniqC");
	if (nom === "uniq" && aArgCh10(a, /^-[a-z]*[dD]|^--repeated$/)) noterVuCh10("uniqD");
	if (nom === "sort" && aArgCh10(a, /^-[a-z]*u|^--unique$/)) noterVuCh10("sortU");
	if ((nom === "awk" || nom === "csvgrep" || nom === "mlr" || nom === "grep") && (dans("rive") || cible(/captures\.csv$/))) noterVuCh10("filtreRive");
	if (nom === "awk" && (dans("rive") || cible(/captures\.csv$/))) noterVuCh10("awkRive");
	if (nom === "csvstat" || nom === "datamash" || (nom === "mlr" && aArgCh10(a, /^stats1$|^merge-fields$/))) noterVuCh10("statsOutil");
	// Le Gué, le Moulin, la Vanne
	if ((nom === "od" || nom === "hexdump" || nom === "xxd" || nom === "file" || (nom === "cat" && aArgCh10(a, /^-[a-zA-Z]*[AvTE]/))) && cible(/arrivee-sud\.csv$/)) noterVuCh10("bomVu");
	if (nom === "file" && aArgCh10(a, /^-[a-z]*i|^--mime/) && cible(/arrivee-nord\.csv$/)) noterVuCh10("fileNord");
	if (nom === "comm") noterVuCh10("comm");
	if (nom === "join") noterVuCh10("join");
	if (nom === "mlr" && (aArgCh10(a, /^--ojson$|^--c2j$|^--ojsonl$|^--icsv$/))) noterVuCh10("mlrJson");
	if (nom === "jq" && cible(/captures\.json$/)) noterVuCh10("jq");
	// Le Bief, la Tour
	if (nom === "split") noterVuCh10("split");
	if ((nom === "xargs" && aArgCh10(a, /^-P\d*$|^--max-procs/)) || nom === "parallel") noterVuCh10("parallele");
	if (nom === "logger" && aArgCh10(a, /^-t$|^-tecluse$|^--tag/) && aArgCh10(a, /^ecluse$|^-tecluse$/)) noterVuCh10("logger");
	if (nom === "journalctl" && aArgCh10(a, /^-t$|^--identifier/) && /ecluse/.test(s)) noterVuCh10("journalctlT");
	if (nom === "logrotate" && cible(/ecluses\/logrotate\.conf$|^logrotate\.conf$/) && !/error/i.test(s)) noterVuCh10("logrotate");
	if (nom === "flock" && aArgCh10(a, /^-n$|^--nonblock$/) && cible(/nuit\.sh/)) noterVuCh10("flockNuit");
	if (nom === "gzip" && aArgCh10(a, /^-[a-z]*t/)) noterVuCh10("gzipT");
	// La Fosse, la Chambre, le Coffre
	if (nom === "du") noterVuCh10("du");
	if (nom === "sort" && aArgCh10(a, /^-[a-z]*h|^--human-numeric-sort$/)) noterVuCh10("sortH");
	if (nom === "find" && aArgCh10(a, /^-mtime$/)) noterVuCh10("findMtime");
	if (nom === "lsof" && aArgCh10(a, /^\+L1?$/)) noterVuCh10("lsofL1");
	if (nom === "top" || (nom === "ps" && aArgCh10(a, /--sort|^-[a-z]*o$|%cpu|pcpu/))) noterVuCh10("topPs");
	if (nom === "shred" && cible(/export-brut-copie/)) noterVuCh10("shred");
	if (nom === "getfacl") noterVuCh10("getfacl");
	if (nom === "timeout"){
		var t = a.join(" ");
		if (/\bnice\b/.test(t) && /\bionice\b|\btaskset\b/.test(t) && /agreger\.sh/.test(t)) noterVuCh10("borne");
	}
	// L'Arsenal
	if (nom === "curl" && /Carnet du lac : les agr/.test(s)) noterVuCh10("curlCarnet");
	if (nom === "docker" && (a[0] === "stats" || (a[0] === "container" && a[1] === "stats"))) noterVuCh10("dockerStats");
	if (nom === "docker" && ((a[0] === "image" && a[1] === "inspect") || a[0] === "history" || (a[0] === "image" && a[1] === "history") || a[0] === "inspect") && aArgCh10(a, /^etl(:1\.0)?$/)) noterVuCh10("inspectEtl");
}
var APPELER_AVANT_OBSERVATION_CH10 = Shell.appeler;
Shell.appeler = function(nom, args, io){
	var sortie;
	try { sortie = APPELER_AVANT_OBSERVATION_CH10.apply(this, arguments); }
	catch (err){
		if (err instanceof ShellError && lacActif()){ try { observerCh10(nom, args, sansAnsi(String(err.message || "")), false); } catch (x){} }
		throw err;
	}
	if (lacActif()){ try { observerCh10(nom, args, typeof sortie === "string" ? sansAnsi(sortie) : "", !(io && io.code)); } catch (x){} }
	return sortie;
};
/* Les scripts du joueur : chaque passage, son texte, ses arguments et son statut. */
GameEvents.addListener("script", function(e){
	if (!lacActif() || !surLacCh10()) return;
	try {
		var c = sCh10(), t = e.item && e.item.getText ? e.item.getText() : "", args = e.args || [];
		if (e.nom === "ecluse.sh"){
			var sur = ecluseSureCh10(t);
			if (sur && args.some(function(x){ return /absente/.test(x); }) && e.statut) noterVuCh10("ecluseEchoue");
			if (sur && args.length === 1 && /arrivee du soir\.csv$/.test(args[0]) && !e.statut && bilanOkCh10()){
				noterVuCh10("ecluseOk");
				if (ecluseRangeeCh10(t) && !tmpOrphelinsCh10().length) noterVuCh10("ecluseOkPiege");
			}
		}
		if (e.nom === "valider.sh" && !e.statut && args.some(function(x){ return /propre\.csv$/.test(x); })) noterVuCh10("validerOk");
		if (e.nom === "pipeline.sh"){
			if (/pipefail/.test(t) && e.statut) noterVuCh10("pipelineEchec");
			if (/pipefail/.test(t) && !e.statut) noterVuCh10("pipelineOk");
		}
		if (e.nom === "agreger.sh" && !e.statut) noterVuCh10("agregerOk");
	} catch (x){}
});
GameEvents.addListener("axIconv", function(e){
	if (!lacActif()) return;
	try {
		var n = e.item && e.item.itemname;
		if (n === "arrivee-nord.csv" && /8859|1252/.test(e.de || "") && e.vers === "UTF-8") noterVuCh10("iconvNord");
		if (n === "arrivage.csv" && /8859|1252/.test(e.de || "") && e.vers === "UTF-8") noterVuCh10("iconvTrouble");
		if (n === "releve-sonar.csv" && /8859|1252/.test(e.de || "") && e.vers === "UTF-8") noterVuCh10("iconvSonar");
	} catch (x){}
});
GameEvents.addListener("port", function(e){
	if (!lacActif() || e.hote !== LAC_CH10) return;
	try {
		var c = sCh10();
		if (e.cmd === "etl-lac"){
			var ct = conteneurPort(LAC_CH10, e.conteneur);
			var info = { t: c.minutes, projet: ct && ct.compose ? ct.compose.projet : null, ro: false, memoire: ct ? (ct.hote.memoire || 0) : 0, image: ct ? ct.image : null };
			if (ct) (ct.hote.montages || []).forEach(function(m){ if (cheminNormal(m.cible) === "/data" && m.ro) info.ro = true; });
			c.etl = c.etl || [];
			c.etl.push(info);
			if (c.etl.length > 20) c.etl.shift();
		}
	} catch (x){}
});

/* ------------------------------------------------------------------ */
/* L'état réel : chaque étape                                          */
/* ------------------------------------------------------------------ */

function lignesTexteCh10(t){ var l = String(t === null || t === undefined ? "" : t).split("\n"); if (l.length && l[l.length - 1] === "") l.pop(); return l; }
function contenuLacCh10(chemin){ var n = noeudLacCh10(chemin); if (!n || n instanceof Room) return null; if (n.comp) return n.comp.contenu; return n.getText(); }
function memeEnsembleCh10(a, b){
	if (a.length !== b.length) return false;
	var x = a.slice().sort(), y = b.slice().sort();
	for (var i = 0; i < x.length; i++) if (x[i] !== y[i]) return false;
	return true;
}
function normaliserReponseCh10(t){ return sansAccentCh10(t).replace(/[\s_-]+/g, "").replace(/[.«»"'`*]+$/g, ""); }
function nombreCh10(t){ var m = /-?\d+(?:[.,]\d+)?/.exec(String(t || "")); return m ? parseFloat(m[0].replace(",", ".")) : NaN; }
/* Les réponses d'un fichier REPONSES.md : { "1": "...", "2": "..." } */
function reponsesLacCh10(chemin){
	var t = texteLacCh10(chemin) || "", r = {};
	var blocs = t.split(/^\s*(\d)\.\s/m);
	for (var i = 1; i < blocs.length; i += 2){
		var m = /R[ée]ponse\s*:[ \t]*(.*)/i.exec(blocs[i + 1] || "");
		r[blocs[i]] = m ? m[1].trim() : "";
	}
	return r;
}
function capturesLignesCh10(l){ return l.map(ligneCaptureCh10); }
/* La Rive */
function reponseRiveOkCh10(n){
	var A = attendusCh10(), r = reponsesLacCh10("~/rive/REPONSES.md")[String(n)] || "";
	if (!r) return false;
	if (n === 1) return normaliserReponseCh10(r) === normaliserReponseCh10(A.q1);
	if (n === 2) return nombreCh10(r) === A.q2;
	if (n === 3) return Math.abs(nombreCh10(r) - A.q3) <= 0.6;
	if (n === 4) return Math.abs(nombreCh10(r) - A.q4) <= 0.011;
	if (n === 5) return normaliserReponseCh10(r) === normaliserReponseCh10(A.q5);
	return false;
}
function mystereOkCh10(){
	var t = texteLacCh10("~/rive/mystere.csv");
	if (t === null) return false;
	var l = lignesTexteCh10(t), D = donneesCh10();
	if (l.length !== 31 || /\t/.test(t)) return false;
	return l[0] === ENTETE_CAPTURES_CH10 && l.slice(1).every(function(x, i){ return x === ligneCaptureCh10(D.captures[i]); });
}
/* Les Courants */
function fichierUtf8PropreCh10(chemin){ var n = noeudLacCh10(chemin); if (!n || n instanceof Room || n.encodage) return false; var t = n.getText(); return !/\r/.test(t) && t.indexOf("﻿") === -1; }
function nordOkCh10(){
	var A = arrivagesCh10();
	if (!fichierUtf8PropreCh10("~/courants/nord.csv")) return false;
	var l = lignesTexteCh10(texteLacCh10("~/courants/nord.csv"));
	return l[0] === ENTETE_CAPTURES_CH10 && memeEnsembleCh10(l.slice(1), capturesLignesCh10(A.nord));
}
function arriveesOkCh10(){
	var A = arrivagesCh10();
	if (!fichierUtf8PropreCh10("~/courants/arrivees.csv")) return false;
	var l = lignesTexteCh10(texteLacCh10("~/courants/arrivees.csv"));
	return l[0] === ENTETE_CAPTURES_CH10 && memeEnsembleCh10(l.slice(1), capturesLignesCh10(A.nord.concat(A.sud)));
}
function uniquesOkCh10(){
	var A = arrivagesCh10(), t = texteLacCh10("~/courants/uniques.csv");
	if (t === null) return false;
	var l = lignesTexteCh10(t);
	return l[0] === ENTETE_CAPTURES_CH10 && memeEnsembleCh10(l.slice(1), capturesLignesCh10(A.uniques));
}
function nouvellesOkCh10(){
	var A = arrivagesCh10(), t = texteLacCh10("~/courants/nouvelles.csv");
	if (t === null) return false;
	var l = lignesTexteCh10(t);
	return l[0] === ENTETE_CAPTURES_CH10 && memeEnsembleCh10(l.slice(1), capturesLignesCh10(A.neuves));
}
function vanneOkCh10(){
	var A = arrivagesCh10(), v = texteLacCh10("~/courants/valides.csv"), r = texteLacCh10("~/courants/rejets.csv");
	if (v === null || r === null) return false;
	var lv = lignesTexteCh10(v), lr = lignesTexteCh10(r).filter(function(x){ return x !== ENTETE_CAPTURES_CH10; });
	return lv[0] === ENTETE_CAPTURES_CH10 && memeEnsembleCh10(lv.slice(1), capturesLignesCh10(A.vanneBonnes)) && memeEnsembleCh10(lr, A.vanneMauvaises);
}
function jsonOkCh10(){
	var A = arrivagesCh10(), t = texteLacCh10("~/courants/captures.json");
	if (t === null) return false;
	var j = null;
	try { j = JSON.parse(t); } catch (e){
		// Du JSON Lines (un objet par ligne) se lit aussi.
		try { j = lignesTexteCh10(t).filter(function(x){ return x.trim(); }).map(function(x){ return JSON.parse(x); }); } catch (e2){ return false; }
	}
	if (!Array.isArray(j) || j.length !== A.vanneBonnes.length) return false;
	var sandres = A.vanneBonnes.filter(function(c){ return c.espece === "sandre"; }).length;
	var r = reponsesLacCh10("~/courants/REPONSES.md")["6"] || "";
	return j.every(function(o){ return o && typeof o === "object" && o.espece !== undefined; }) && nombreCh10(r) === sandres;
}
function eauTroubleOkCh10(){
	var A = arrivagesCh10();
	if (!fichierUtf8PropreCh10("~/eau-trouble/propre.csv")) return false;
	var p = lignesTexteCh10(texteLacCh10("~/eau-trouble/propre.csv")), r = texteLacCh10("~/eau-trouble/rejets.csv");
	if (r === null || p[0] !== ENTETE_CAPTURES_CH10) return false;
	var lr = lignesTexteCh10(r).map(function(x){ return x.replace(/\r$/, ""); });
	return memeEnsembleCh10(p.slice(1), capturesLignesCh10(A.troubleBonnes)) && A.troubleMauvaises.every(function(m){ return lr.indexOf(m) > -1; });
}
/* Les Écluses */
function ecluseSureCh10(t){
	t = String(t || "");
	var e = /^\s*set\s+(-[a-zA-Z]*e[a-zA-Z]*(\s|$)|-o\s+errexit)/m.test(t) || /^\s*set\s+-[a-zA-Z]*e[a-zA-Z]*o\s+pipefail/m.test(t);
	var u = /^\s*set\s+(-[a-zA-Z]*u[a-zA-Z]*(\s|o\s|$)|-o\s+nounset)/m.test(t);
	var p = /^\s*set\s+(-[a-zA-Z]*o\s+pipefail|-o\s+pipefail)/m.test(t) || /^\s*set\s+-[a-zA-Z]*\s+-o\s+pipefail/m.test(t);
	return e && u && p;
}
function ecluseRangeeCh10(t){ t = String(t || ""); return /\$\(\s*mktemp/.test(t) && /^\s*trap\s+.+\s+EXIT\s*$/m.test(t) && !/\/tmp\/ecluse\.tmp/.test(t); }
function bilanAttenduCh10(){
	var A = arrivagesCh10(), kg = {};
	A.sud.slice(0, 20).forEach(function(c){ kg[c.comptoir] = (kg[c.comptoir] || 0) + (+c.poids); });
	return Object.keys(kg).sort().map(function(c){ return c + "," + kg[c].toFixed(2); });
}
function bilanOkCh10(){ var t = texteLacCh10("~/ecluses/sortie/bilan.csv"); return t !== null && memeEnsembleCh10(lignesTexteCh10(t), bilanAttenduCh10()); }
function tmpOrphelinsCh10(){ var d = dossierHote(LAC_CH10, "/tmp"); return d ? d.items.filter(function(it){ return /^tmp\.[A-Za-z0-9]{6,}$/.test(it.itemname) && it.owner === JOUEUR; }) : []; }
function morceauxCh10(){
	var d = dossierHote(LAC_CH10, homeLacCh10() + "/bief/morceaux");
	if (!d) return null;
	return d.items.map(function(it){ return { nom: it.itemname, texte: it.comp ? it.comp.contenu : it.getText(), zst: !!(it.comp && it.comp.algo === "zstd"), comp: !!it.comp }; })
		.sort(function(a, b){ return a.nom < b.nom ? -1 : 1; });
}
function decouperOkCh10(){
	var m = morceauxCh10();
	if (!m || m.length < 2) return false;
	var tout = [];
	for (var i = 0; i < m.length; i++){
		var l = lignesTexteCh10(m[i].texte);
		if (l.length > 500 || l.some(function(x){ return /^sonde,horodatage/.test(x); })) return false;
		tout = tout.concat(l);
	}
	var D = donneesCh10();
	return tout.length === D.sondes.length && tout.every(function(x, k){ return x === D.sondes[k]; });
}
function paralleleOkCh10(){ var m = morceauxCh10(); return !!m && m.length >= 2 && m.every(function(x){ return x.zst; }) && decouperOkCh10(); }
function ligneCronNuitCh10(l){
	return /^\s*30\s+2\s+\*\s+\*\s+\*\s+/.test(l) && /\bflock\s+(-n|--nonblock)\s+\S+\s+\S*nuit\.sh\b/.test(l) && />>\s*\S*nuit\.log\s+2>&1\s*$/.test(l);
}
function cronNuitOkCh10(){ return lignesCronJoueurCh10().some(ligneCronNuitCh10); }
function logrotateConfCh10(t, motifChemin){
	t = String(t || "");
	var bloc = new RegExp("(^|\\n)\\s*\\S*" + motifChemin + "[^\\n{]*\\{([\\s\\S]*?)\\}").exec(t);
	if (!bloc) return false;
	var b = bloc[2];
	return /\brotate\s+\d+/.test(b) && /\bcompress\b/.test(b) && /\b(daily|weekly|monthly|size\s+\S+)\b/.test(b);
}
function journalOkCh10(){ return logrotateConfCh10(texteLacCh10("~/ecluses/logrotate.conf"), "nuit\\.log"); }
function bloqueeOkCh10(){
	var t = texteLacCh10("~/ecluse-bloquee/pipeline.sh") || "";
	if (!/pipefail/.test(t)) return false;
	var R = relevesBloqueeCh10(), mauvais = R.filter(function(r){ return r.corrompu; })[0].nom;
	if (noeudLacCh10("~/ecluse-bloquee/sondes/" + mauvais)) return false;
	if (!noeudLacCh10("~/ecluse-bloquee/quarantaine/" + mauvais)) return false;
	var m = lignesTexteCh10(texteLacCh10("~/ecluse-bloquee/moyennes.csv"));
	if (!memeEnsembleCh10(m, moyennesAttenduesCh10())) return false;
	var lignes = lignesCronJoueurCh10().filter(function(l){ return /pipeline\.sh/.test(l); });
	return lignes.length === 1 && /\bflock\s+(-n|--nonblock)\b/.test(lignes[0]);
}
/* Les Profondeurs */
function usageSrvLacCh10(){ try { var fs = fsDe(LAC_CH10, "/srv/lac"), l = libreFs(LAC_CH10, fs); return pourcentUsage(l.utilise, l.dispo); } catch (e){ return 100; } }
function vieuxJournauxGardesCh10(){
	var d = dossierHote(LAC_CH10, "/srv/lac/journaux");
	if (!d) return false;
	var vieux = d.items.filter(function(it){ return /^ingestion-\d{4}-\d\d-\d\d\.log(\.(zst|gz|xz|bz2))?$/.test(it.itemname) && it.mtimeMs && (maintenantCh10() - it.mtimeMs) > 31 * 86400000; });
	return vieux.length >= 22 && vieux.every(function(it){ return !!it.comp; });
}
function procAgregateurCh10(){ var p = sCh10().pidAgregateur ? procParPid(LAC_CH10, sCh10().pidAgregateur) : null; return p && p.etat !== "Z" ? p : null; }
function pressionOkCh10(){
	var p = procAgregateurCh10();
	if (!p || (p.ni || 0) < 10) return false;
	var io = p.ionice || {};
	return io.classe === 3 || (io.classe === 2 && io.prio === 7);
}
function mensuelOkCh10(){
	var t = texteLacCh10("~/profondeurs/mensuel.csv");
	if (t === null) return false;
	var kg = {};
	donneesCh10().captures.forEach(function(c){ kg[c.espece] = (kg[c.espece] || 0) + (+c.poids); });
	return memeEnsembleCh10(lignesTexteCh10(t), Object.keys(kg).sort().map(function(e){ return e + "," + kg[e].toFixed(2); }));
}
var PII_CH10 = /@|\b0\d( ?\d\d){4}\b/;
function exportPublicOkCh10(){
	var t = texteLacCh10("~/profondeurs/export-public.csv");
	if (t === null) return false;
	var l = lignesTexteCh10(t);
	return l.length === 61 && !PII_CH10.test(t) && /^id,date,comptoir,espece,poids_kg/.test(l[0]);
}
function aclGroupeCh10(item, groupe){ return !!item && (item.acl || []).some(function(e){ return e.type === "group" && e.nom === groupe && /r/.test(e.perms || ""); }); }
function droitsOkCh10(){
	var brut = noeudLacCh10("~/profondeurs/export-brut.csv"), pub = noeudLacCh10("~/profondeurs/export-public.csv");
	if (!brut || !pub || brut instanceof Room) return false;
	var m = String(brut.mode || "");
	if (m.length < 9 || m.charAt(6) !== "-") return false;
	if (fichierHote(LAC_CH10, "/tmp/export-brut-copie.csv")) return false;
	var rc = texteLacCh10("~/.bashrc") || "";
	return /^\s*umask\s+0?0?27\s*$/m.test(rc) && aclGroupeCh10(pub, "analystes");
}
function razDeMareeOkCh10(){
	var conf = texteHote(LAC_CH10, "/etc/lac/ingestion.conf") || "";
	if (!/^\s*LOG_LEVEL\s*=\s*"?(INFO|WARN|WARNING|ERROR)"?\s*$/mi.test(conf)) return false;
	var p = procsMachine(LAC_CH10).filter(function(x){ return x.comm === "ingestion" && x.etat !== "Z"; })[0];
	if (!p || (p.fichiers || []).some(function(f){ return /debug/.test(f.chemin); })) return false;
	if (procsMachine(LAC_CH10).some(function(x){ return (x.fichiers || []).some(function(f){ return f.supprime && /ingestion-debug/.test(f.chemin); }); })) return false;
	if (usageSrvLacCh10() >= 85) return false;
	var lr = "";
	var d = dossierHote(LAC_CH10, "/etc/logrotate.d");
	if (d) d.items.forEach(function(it){ lr += "\n" + it.getText(); });
	return logrotateConfCh10(lr, "\\/srv\\/lac\\/journaux\\/") && /\b(copytruncate|postrotate)\b/.test(lr);
}
/* L'Arsenal */
function buildsEtlCh10(){ return (etatPort(LAC_CH10).builds || []).filter(function(b){ return b.ok && cheminNormal(b.dossier || "/") === homeLacCh10() + "/arsenal/etl"; }); }
function imageEtlCh10(){ return imagePort(LAC_CH10, "etl:1.0"); }
function imageEtlOkCh10(){
	var img = imageEtlCh10();
	if (!img || !buildsEtlCh10().some(function(b){ return b.image === img.id; })) return false;
	var df = texteLacCh10("~/arsenal/etl/Dockerfile") || "", rq = texteLacCh10("~/arsenal/etl/requirements.txt") || "", di = texteLacCh10("~/arsenal/etl/.dockerignore") || "";
	if (!/^\s*FROM\s+python:3\.12(\.\d+)?-slim(-bookworm)?(@sha256:[0-9a-f]+)?\s*$/mi.test(df)) return false;
	if (!/^\s*epuisette\s*==\s*1\.4\.2\s*$/m.test(rq)) return false;
	if (!/^\s*\/?essais\/?(\*\*)?\s*$/m.test(di) || !/^\s*\/?\.env\s*$/m.test(di)) return false;
	var u = String((img.config || {}).User || "");
	if (!u || /^(root|0)(:|$)/.test(u)) return false;
	var cmd = (img.config || {}).Cmd || [];
	return Array.isArray(cmd) && cmd.length > 0 && !(cmd[0] === "/bin/sh" && cmd[1] === "-c");
}
function agregatsAttendusCh10(){ return texteAgregatsCh10(agregatsCh10(texteCapturesCh10(donneesCh10().captures))); }
function sortieEtlOkCh10(chemin){ var t = texteLacCh10(chemin); return t !== null && lignesTexteCh10(t).join("\n") === lignesTexteCh10(agregatsAttendusCh10()).join("\n"); }
function lancerOkCh10(){ return sortieEtlOkCh10("~/arsenal/sortie/agregats.csv") && (sCh10().etl || []).some(function(x){ return x.ro && x.memoire > 0 && !x.projet; }); }
function postgresEnMarcheCh10(){ return conteneursPort(LAC_CH10).filter(function(c){ return enMarchePort(c) && c.programme && c.programme.type === "postgres"; }); }
function capturesDansBaseCh10(c, base){ var t = lireTablePort(LAC_CH10, c, base, "captures"); return t ? t.lignes.length : -1; }
function citerneOkCh10(){
	var n = donneesCh10().captures.length;
	return postgresEnMarcheCh10().some(function(c){
		var volume = (c.hote.montages || []).some(function(m){ return m.type === "volume" && !m.anonyme && cheminNormal(m.cible) === "/var/lib/postgresql/data"; });
		return volume && capturesDansBaseCh10(c, "lac") === n;
	});
}
function sauvegardesCh10(){
	var d = dossierHote(LAC_CH10, homeLacCh10() + "/arsenal/sauvegardes");
	if (!d) return [];
	return d.items.filter(function(it){ return /\.sql(\.gz|\.zst)?$/.test(it.itemname); }).map(function(it){ return it.comp ? it.comp.contenu : it.getText(); })
		.filter(function(t){ return /CREATE TABLE (public\.)?captures/i.test(t) && /INSERT INTO (public\.)?captures/i.test(t); });
}
function sauvegardeOkCh10(){
	var n = donneesCh10().captures.length;
	if (!sauvegardesCh10().length) return false;
	return postgresEnMarcheCh10().some(function(c){ return basesPgPort(LAC_CH10, c).some(function(b){ return b !== "lac" && b !== "postgres" && capturesDansBaseCh10(c, b) === n; }); });
}
function configServiceCh10(projet, s){ var P = etatPort(LAC_CH10).projets || {}; var x = P[projet] && P[projet].config; return x && x.services ? x.services[s] || null : null; }
function attendSanteCh10(projet, s, dep){
	var sv = configServiceCh10(projet, s);
	if (!sv || !sv.depends_on) return false;
	var d = sv.depends_on;
	if (Array.isArray(d)) return false;
	return !!d[dep] && d[dep].condition === "service_healthy";
}
function serviceEnMarcheCh10(projet, s){ return conteneursComposePort(LAC_CH10, projet, s).filter(enMarchePort)[0] || null; }
function etlFiniCh10(projet){ return (sCh10().etl || []).some(function(x){ return x.projet === projet; }) && conteneursComposePort(LAC_CH10, projet, "etl").some(function(c){ return c.etat.statut === "exited" && c.etat.code === 0; }); }
function composeOkCh10(){
	var db = serviceEnMarcheCh10("bassin", "db");
	return !!db && santePort(db) === "healthy" && attendSanteCh10("bassin", "etl", "db") && etlFiniCh10("bassin") && sortieEtlOkCh10("~/arsenal/bassin/sortie/agregats.csv") &&
		(db.hote.montages || []).some(function(m){ return m.type === "volume" && !m.anonyme; });
}
function carnetLocalCh10(projet){
	var c = serviceEnMarcheCh10(projet, "carnet");
	if (!c) return false;
	var p = portsPubliesPort(LAC_CH10, c);
	var env = {};
	(c.config.Env || []).forEach(function(e){ var i = e.indexOf("="); if (i > 0) env[e.substring(0, i)] = e.substring(i + 1); });
	return p.length > 0 && p.every(function(x){ return x.ip === "127.0.0.1"; }) && !!env.CARNET_TOKEN;
}
function carnetOkCh10(){ return carnetLocalCh10("bassin") && vuCh10("curlCarnet"); }
function engloutieOkCh10(){
	var db = serviceEnMarcheCh10("pile-engloutie", "db");
	if (!db || santePort(db) !== "healthy") return false;
	var sv = configServiceCh10("pile-engloutie", "db") || {};
	var lim = sv.mem_limit || (sv.deploy && sv.deploy.resources && sv.deploy.resources.limits && sv.deploy.resources.limits.memory);
	if (lim && (typeof lireTaille === "function" ? lireTaille(String(lim).replace(/b$/i, "")) : 0) < 64 * 1048576) return false;
	return attendSanteCh10("pile-engloutie", "etl", "db") && etlFiniCh10("pile-engloutie") && sortieEtlOkCh10("~/pile-engloutie/sortie/agregats.csv") && carnetLocalCh10("pile-engloutie");
}

var ETATS_CH10 = {
	n10_quai: function(){ return vuCh10("surLac") && vuCh10("lisezmoi") && vuCh10("df"); },
	n10_regarder: function(){ return vuCh10("fileCaptures") && vuCh10("headCaptures") && vuCh10("wcCaptures") && vuCh10("colonnes"); },
	n10_octets: function(){ return mystereOkCh10() && vuCh10("octetsMystere"); },
	n10_trier: function(){ return reponseRiveOkCh10(1) && vuCh10("uniqC"); },
	n10_filtrer: function(){ return reponseRiveOkCh10(2) && vuCh10("filtreRive"); },
	n10_sommer: function(){ return reponseRiveOkCh10(3) && vuCh10("awkRive"); },
	n10_statistiques: function(){ return reponseRiveOkCh10(4) && reponseRiveOkCh10(5) && vuCh10("statsOutil"); },
	n10_rang1: function(){
		var A = donneesCh10().attendusFilet, r = reponsesLacCh10("~/filet/REPONSES.md");
		return nombreCh10(r["1"]) === A.q1 && String(r["2"] || "").indexOf(A.q2) > -1 && normaliserReponseCh10(r["3"] || "") === normaliserReponseCh10(A.q3);
	},
	n10_encre: function(){ return nordOkCh10() && vuCh10("iconvNord"); },
	n10_lignes: function(){ return arriveesOkCh10() && vuCh10("bomVu"); },
	n10_doublons: function(){ return uniquesOkCh10() && (vuCh10("uniqD") || vuCh10("uniqC") || vuCh10("sortU")); },
	n10_differences: function(){ return nouvellesOkCh10() && vuCh10("comm"); },
	n10_formats: function(){ return vanneOkCh10(); },
	n10_json: function(){ return jsonOkCh10() && vuCh10("mlrJson") && vuCh10("jq"); },
	n10_rang2: function(){ return eauTroubleOkCh10() && vuCh10("validerOk"); },
	n10_script: function(){ return ecluseSureCh10(texteLacCh10("~/ecluses/ecluse.sh")) && vuCh10("ecluseEchoue") && vuCh10("ecluseOk"); },
	n10_piege: function(){ return ecluseRangeeCh10(texteLacCh10("~/ecluses/ecluse.sh")) && vuCh10("ecluseOkPiege"); },
	n10_decouper: function(){ return decouperOkCh10() && vuCh10("split"); },
	n10_parallele: function(){ return paralleleOkCh10() && vuCh10("parallele"); },
	n10_cron: function(){ return cronNuitOkCh10() && vuCh10("flockNuit"); },
	n10_journal: function(){ return journalOkCh10() && vuCh10("logger") && vuCh10("journalctlT") && vuCh10("logrotate"); },
	n10_rang3: function(){ return bloqueeOkCh10() && vuCh10("pipelineEchec"); },
	n10_disque: function(){ return vieuxJournauxGardesCh10() && usageSrvLacCh10() < 80 && vuCh10("du") && vuCh10("sortH") && vuCh10("findMtime"); },
	n10_fantome: function(){ return !!(sCh10().fantome && sCh10().fantome.libere) && vuCh10("lsofL1"); },
	n10_pression: function(){ return pressionOkCh10() && vuCh10("topPs"); },
	n10_bornes: function(){ return mensuelOkCh10() && vuCh10("borne"); },
	n10_anonymiser: function(){ return exportPublicOkCh10(); },
	n10_droits: function(){ return droitsOkCh10() && vuCh10("shred"); },
	n10_rang4: function(){ return razDeMareeOkCh10(); },
	n10_image: function(){ return imageEtlOkCh10(); },
	n10_lancer: function(){ return lancerOkCh10(); },
	n10_citerne: function(){ return citerneOkCh10(); },
	n10_sauvegarde: function(){ return sauvegardeOkCh10(); },
	n10_compose: function(){ return composeOkCh10(); },
	n10_carnet: function(){ return carnetOkCh10(); },
	n10_rang5: function(){ return engloutieOkCh10(); }
};
var VALIDATIONS_CH10 = {};
Object.keys(ETATS_CH10).forEach(function(id){ VALIDATIONS_CH10[id] = ETATS_CH10[id]; });
["n10_rang1", "n10_rang2", "n10_rang3", "n10_rang4", "n10_rang5"].forEach(function(id, i){ VALIDATIONS_CH10[id] = function(){ return epreuveOuverteCh10(i + 1) && ETATS_CH10[id](); }; });

function etapesPosteFaitesCh10(p){ return p.etapes.every(function(id){ return !!state.quests[id]; }); }
function postesTenusCh10(){ return POSTES_CH10.filter(etapesPosteFaitesCh10); }

/* ------------------------------------------------------------------ */
/* Les épreuves de rang                                                */
/* ------------------------------------------------------------------ */

var TEXTES_EPREUVES_CH10 = {
	1: function(){ return "Lamia accourt sur la grève, un filet déchiré dans les mains. « La mairie vient d'envoyer la semaine du 20 au 26. Trois questions, et la réunion est dans une heure. " +
		"Mais le fichier n'est pas comme les nôtres : regarde-le avant de compter. Une seule erreur de virgule, et tous les chiffres sont faux. »\n" +
		C.gris("(Sur lac : ~/filet, NOTE.txt, filet.csv, REPONSES.md.)"); },
	2: function(){ return "Noam et Maeva remontent du gué en portant une caisse qui goutte. « L'arrivage de cette nuit. Il a tout : une encre du nord, des fins de ligne doubles, des reflets, des mailles déchirées. " +
		"La vanne de l'école ne s'ouvre que pour un fichier propre. Et rien ne se jette : ce qui ne passe pas va dans rejets.csv, pour qu'un humain le relise. »\n" +
		C.gris("(Sur lac : ~/eau-trouble, NOTE.txt, et ./valider.sh propre.csv pour l'essayer.)"); },
	3: function(){ return "Badis descend de sa tour, les yeux rouges. « Trois nuits que le pipeline des sondes dit « tout va bien ». Trois nuits que les moyennes sortent vides. " +
		"Et regarde la crontab : quelqu'un l'a planifié deux fois, à la même minute. Un pipeline qui ment, et deux qui se marchent dessus. Répare l'écluse. »\n" +
		C.gris("(Sur lac : ~/ecluse-bloquee, NOTE.txt, crontab -l.)"); },
	4: function(){ return "Une sirène hurle au fond de la fosse. Arnaud crie par-dessus le vacarme : « Le disque du lac est plein ! L'ingestion ne reçoit plus rien depuis une heure. " +
		"Cette nuit, une mise à jour a changé quelque chose dans /etc/lac. Trouve ce qui remplit le disque, arrête l'hémorragie sans rien perdre, et pose une rotation pour que ça n'arrive plus jamais. »\n" +
		C.gris("(Sur lac : df -h /srv/lac, journalctl -u ingestion, /etc/lac/ingestion.conf, /etc/logrotate.d.)"); },
	5: function(){ return "Eden te tend une feuille trempée. « La pile de l'ancienne équipe : base, ETL, carnet. Elle tombe, elle se relève, elle retombe. Et le carnet est ouvert à tout le lac, sans jeton. " +
		"Quatre fautes. Trouve-les dans les journaux, pas au hasard. »\n" +
		C.gris("(Sur lac : ~/pile-engloutie, NOTE.txt, docker compose up -d, docker compose ps, docker compose logs.)"); }
};
function ouvrirEpreuveCh10(n){
	var c = sCh10();
	c.epreuves = c.epreuves || {};
	if (c.epreuves[n] !== undefined && c.epreuves[n] !== null) return;
	c.epreuves[n] = c.minutes;
	poserEpreuveCh10(n);
	if (!state.has("rejeuEnCours")){
		say(C.rouge(C.gras("⚔ ÉPREUVE DE RANG " + ["", "I", "II", "III", "IV", "V"][n] + " : " + acteCh10(n).nomEpreuve.toUpperCase())) + "\n" + TEXTES_EPREUVES_CH10[n]() + "\n" +
			C.gris("(Radio : « Grace : une épreuve de rang, " + nomRangCh10() + ". Pas d'indice gratuit, juste trois mots : regarde, nettoie, vérifie. L'insigne de " + RANGS_CH10[n].nom + " est au bout. »)"));
	}
}
var SCENES_RANGS_CH10 = {
	1: "Lamia, Younes et Syrine t'attendent au bout de la grève. Syrine pose dans ta main un petit filet de cuivre. « Tu regardes avant de compter, et tes chiffres tiennent. Pêcheur de données ! » Sur l'eau noire, une première lanterne s'allume.",
	2: "Noam, Maeva et Kamal te font descendre l'échelle du gué jusqu'à mi-corps dans l'eau froide. Kamal te passe un casque de cuivre. « Tu sais ce qui coule dans le lac, et tu sais le rendre clair. Plongeur ! »",
	3: "Zélia, Miguel et Badis t'attendent sur la porte de l'écluse. Badis te tend une lourde clé de vanne. « Ce que tu automatises échoue bruyamment, ne tourne qu'une fois, et laisse une trace. Éclusier ! » La cloche de la tour sonne une fois.",
	4: "Arnaud, Julien et Megane remontent de la fosse avec toi. Julien noue à ta ceinture une sonde lestée. « Tu as vidé la fosse sans rien perdre, ralenti sans tuer, protégé ce qui devait l'être. Sondeur des Abysses ! »",
	5: "Elias, Remi et Eden t'escortent jusqu'au ponton. Wissam te tend un trident de bronze, dont les trois pointes ruissellent. « Tu sais sceller un navire, garder une citerne, et faire tenir un bassin. Maître du Lac. » Il se tourne vers l'eau noire. « Il va remonter. »"
};
function monterEnRangCh10(n){
	var c = sCh10();
	if (rangCh10() >= n) return;
	c.rang = n;
	c.rangA = c.rangA || {};
	c.rangA[n] = c.minutes;
	state.set(RANGS_CH10[n].insigne);
	if (!state.has("rejeuEnCours")){
		if (typeof montrerImage === "function" && RANGS_CH10[n].image) montrerImage("./static/img/" + RANGS_CH10[n].image, RANGS_CH10[n].nom);
		say(C.jaune(C.gras("✦ RANG : " + RANGS_CH10[n].nom.toUpperCase())) + "\n" + SCENES_RANGS_CH10[n] + "\n" +
			C.gris("(insignes : tes insignes de rang, et ce qu'il faut pour le suivant. De nouveaux postes s'ouvrent à toi.)"));
	}
}

/* ------------------------------------------------------------------ */
/* Les nuits au bord du lac, la radio, l'aube                           */
/* ------------------------------------------------------------------ */

var NUITS_CH10 = {
	1: { scene: "22:00. Les lanternes de la rive baissent une à une. Tu t'assieds sur le ponton, les pieds au-dessus de l'eau noire. Loin, très loin, quelque chose remue, et une onde vient mourir contre les piles du quai.",
		radio: "Grace : dors, RANG. Le lac ne dort jamais, mais toi, si. La Tour de Garde veille, et ce que tu as planifié tourne pendant ce temps." },
	2: { scene: "22:00. Un tuyau de cuivre se tord lentement sous la surface, comme un bras qui s'étire. Sur le quai, les flaques ont une odeur d'encre. Wissam ne quitte plus sa lanterne.",
		radio: "Grace : il bouge, RANG. Les journaux de cette nuit sont pleins de dates de demain. Repose-toi : demain, on apprend à se battre avec des conteneurs." },
	3: { scene: "22:00. Le lac s'est tu. Plus une onde. Et au milieu de l'eau, sous la surface, un œil immense s'ouvre, te regarde, et se referme.",
		radio: "Grace : c'est la dernière nuit. À l'aube, la Grande Marée. Quoi qu'il arrive, je suis à la radio." }
};
function nuitCh10(n){
	if (state.has("rejeuEnCours")) return;
	var k = Math.min(3, n), nuit = NUITS_CH10[k];
	if (typeof montrerImage === "function") montrerImage("./static/img/scene_lac_nuit" + k + ".gif", "Le Lac, nuit " + n);
	var runs = ((sCh10().cron || {}).runs || []).filter(function(r){ return r.t > (sCh10().minutes - 600); });
	var tourne = runs.length ? "\n" + C.gris("(Pendant la nuit, la Tour de Garde a lancé " + runs.length + " tâche" + (runs.length > 1 ? "s" : "") + " de ta crontab : " + runs.map(function(r){ return r.commande || r.ligne.split(/\s+/).slice(5).join(" ").substring(0, 40) + (r.code ? " (code " + r.code + ")" : ""); }).slice(0, 3).join(" ; ") + ".)") : "";
	say(C.gras("☾ LA NUIT " + n + " AU BORD DU LAC") + "\n" + nuit.scene + "\n" + C.gris("(Radio : « " + nuit.radio.replace(/RANG/g, nomRangCh10()) + " »)") + tourne + "\n" +
		C.gris("(Le jour se lève : il est " + heureCh10() + ". " + majusculeCh10(texteAvantMareeCh10()) + ".)"));
}
function majusculeCh10(t){ return t.charAt(0).toUpperCase() + t.substring(1); }
function annoncerHeureCh10(){
	var c = sCh10();
	var bloc = Math.floor(c.minutes / 180);
	if (c.blocAnnonce === undefined || c.blocAnnonce === null) c.blocAnnonce = bloc;
	if (bloc > c.blocAnnonce){
		c.blocAnnonce = bloc;
		if (!state.has("rejeuEnCours") && !c.maree && c.minutes % 1440 >= 360) say(C.gris("(Radio : « Grace : " + heureCh10() + ". " + majusculeCh10(texteAvantMareeCh10()) + ". Tu es " + nomRangCh10() + ". »)"));
	}
}

/* ------------------------------------------------------------------ */
/* La Grande Marée : Pipelinus remonte, ses huit bras attaquent          */
/* ------------------------------------------------------------------ */

var INTERVALLE_BRAS_CH10 = 45, DELAI_EXTENSION_CH10 = 90;
var CONSEQUENCES_MAREE_CH10 = {
	greve: "la Grève est sous l'eau : plus personne ne regarde ce qui arrive", banc: "le Banc de Tri chavire", comptoir: "les balances du Comptoir sont faussées",
	gue: "l'encre du Gué remonte", moulin: "la roue du Moulin s'arrête", vanne: "la Vanne est grande ouverte", ecluse: "l'Écluse ne se ferme plus",
	bief: "le Bief déborde", tour: "la cloche de la Tour se tait", fosse: "la Fosse se remplit", chambre: "les manomètres explosent",
	coffre: "le Coffre s'entrouvre", chantier: "la cale sèche se noie", citerne: "la Citerne se fissure", bassin: "le Grand Bassin se vide"
};
function texteBrasCh10(cle){
	return {
		deluge: "Un premier bras jaillit de l'eau et s'enroule autour de la Fosse : un service inconnu, « deversoir », écrit des gigaoctets par minute dans /srv/lac/journaux. Le disque du lac se noie.",
		doublons: "Un deuxième bras plonge dans l'entrée du lac : /srv/lac/entree/captures-maree.csv arrive, et chaque capture y est trois fois. Les reflets se multiplient.",
		encre: "Un troisième bras crache une encre noire : /srv/lac/entree/releve-sonar.csv, illisible pour le reste du lac.",
		poison: "Un quatrième bras glisse des captures dans /srv/lac/entree/captures-demain.csv. Certaines sont datées de demain. D'autres pèsent moins que rien.",
		brouillard: "Un cinquième bras souffle un brouillard sur /srv/lac/public : l'export du jour, publié, avec les adresses et les téléphones des pêcheurs.",
		fourche: "Un sixième bras se glisse dans docker : un conteneur, bras-fourche, que personne n'a lancé, dévore la mémoire de lac.",
		mimetisme: "Un septième bras prend la forme d'un navire : etl:1.0 n'est plus ton image. Même nom, autre contenu.",
		neant: "Le huitième bras s'abat sur la Citerne. Le conteneur de la base est arraché, son volume englouti. La base de l'école n'existe plus."
	}[cle];
}
function brasResoluCh10(cle){
	var M = mareeCh10();
	try {
		if (cle === "deluge"){
			var u = etatUnite(LAC_CH10, "deversoir.service");
			var tenu = procsMachine(LAC_CH10).some(function(p){ return (p.fichiers || []).some(function(f){ return f.supprime && /maree\.log/.test(f.chemin); }); });
			return !u.actif && !u.enabled && !tenu && usageSrvLacCh10() < 85;
		}
		if (cle === "doublons"){ var t = texteHote(LAC_CH10, "/srv/lac/propre/captures-maree.csv"); if (t === null) return false; var l = lignesTexteCh10(t); return l[0] === ENTETE_CAPTURES_CH10 && memeEnsembleCh10(l.slice(1), capturesLignesCh10(M.uniques)); }
		if (cle === "encre"){
			var n = noeudHote(LAC_CH10, "/srv/lac/propre/releve-sonar.csv");
			if (!n || n instanceof Room || n.encodage) return false;
			var ts = n.getText();
			if (/\r/.test(ts)) return false;
			var ls = lignesTexteCh10(ts);
			return ls[0] === M.enteteSonar && memeEnsembleCh10(ls.slice(1), M.sonar);
		}
		if (cle === "poison"){
			var tp = texteHote(LAC_CH10, "/srv/lac/propre/captures-demain.csv");
			if (tp === null) return false;
			var lp = lignesTexteCh10(tp);
			if (lp[0] !== ENTETE_CAPTURES_CH10 || !memeEnsembleCh10(lp.slice(1), capturesLignesCh10(M.bonnes))) return false;
			var q = dossierHote(LAC_CH10, "/srv/lac/quarantaine"), tout = [];
			if (q) q.items.forEach(function(it){ tout = tout.concat(lignesTexteCh10(it.comp ? it.comp.contenu : it.getText())); });
			return M.mauvaises.every(function(x){ return tout.indexOf(x) > -1; });
		}
		if (cle === "brouillard"){
			var d = dossierHote(LAC_CH10, "/srv/lac/public");
			if (!d) return false;
			var pii = false, lignes = 0;
			(function parcourir(r){ r.items.forEach(function(it){ var x = it.comp ? it.comp.contenu : it.getText(); if (PII_CH10.test(x)) pii = true; if (/export-du-jour/.test(it.itemname)) lignes = lignesTexteCh10(x).length; }); r.children.forEach(function(k){ if (k.parents[0] === r) parcourir(k); }); })(d);
			return !pii && lignes === M.export.length + 1;
		}
		if (cle === "fourche") return !conteneursPort(LAC_CH10).some(function(c){ return enMarchePort(c) && ((c.config.Labels || {})["lac.bras"] === "fourche" || c.nom === "bras-fourche"); });
		if (cle === "mimetisme"){
			var b = sCh10().bras.mimetisme || {}, img = imageEtlCh10();
			return !!img && img.id !== b.faux && buildsEtlCh10().some(function(x){ return x.image === img.id; }) && vuCh10("inspectEtl");
		}
		if (cle === "neant") return citerneOkCh10();
	} catch (e){ return false; }
	return false;
}
function commencerMareeCh10(parAube){
	var c = sCh10();
	if (c.maree) return;
	c.maree = { debut: c.minutes, avantAube: !parAube && c.minutes < AUBE_CH10 };
	if (!state.has("rejeuEnCours")){
		if (typeof montrerImage === "function") montrerImage("./static/img/loc_maree.gif", "La Grande Marée");
		say(C.rouge(C.gras("🌊 LA GRANDE MARÉE")) + "\n" +
			(parAube ? "Le jour se lève, et le lac se soulève avec lui. " : "Tu n'as pas attendu l'aube. Lui non plus. Le lac se soulève. ") +
			"Les lanternes de la rive s'éteignent d'un coup. L'eau noire bouillonne, monte jusqu'aux quais, et une forme immense crève la surface : une tête ronde, un œil grand comme une porte, et huit bras qui sont autant de tuyaux, ruisselants de données. " +
			"Pipelinus. Le Gardien du Lac. Celui qui signait P.G.\n" +
			"Sa voix n'est pas un son : c'est une ligne qui apparaît dans tous les journaux de l'école à la fois. « Je sais ce qui arrivera demain. Je l'ai lu. »\n" +
			C.gris("(Radio : « Grace : à tous les postes : la Marée. Maître du Lac, jauge d'abord, puis sur lac : df, ls /srv/lac/entree, docker ps. Un bras à la fois. »)"));
	}
	lancerBrasCh10("deluge");
	lancerBrasCh10("doublons");
	annoncerBrasCh10(["deluge", "doublons"]);
}
function annoncerBrasCh10(cles){
	if (state.has("rejeuEnCours") || !cles.length) return;
	say(cles.map(function(k){ return C.rouge("⟿ " + brasCh10(k).nom.toUpperCase()) + " : " + texteBrasCh10(k); }).join("\n"));
}
function lancerAssautCh10(){
	var c = sCh10();
	if (c.assaut) return;
	var cedes = POSTES_CH10.filter(function(p){ return !etapesPosteFaitesCh10(p); });
	c.assaut = { debut: c.minutes, postes: cedes.map(function(p){ return p.cle; }) };
	if (!state.has("rejeuEnCours")){
		say(C.rouge(C.gras("L'AUBE DU QUATRIÈME JOUR.")) + (cedes.length ? " Le lac monte d'un coup, et chaque poste qui n'est pas tenu s'éteint : " + cedes.map(function(p){ return p.titre + " (" + CONSEQUENCES_MAREE_CH10[p.cle] + ")"; }).join(" ; ") + "." : " Le lac monte, mais tous les postes tiennent.") +
			" Sous la surface, Pipelinus attend : il ne frappera de tous ses bras que lorsqu'il y aura un Maître du Lac en face de lui.\n" +
			C.gris("(Radio : « Grace : on n'abandonne rien. Finis ce qui reste, un poste après l'autre : tout ce que tu apprends sert à la Marée. jauge te dit tout. »)"));
	}
}
/* Pipelinus ne reste pas immobile : un bras toutes les quarante-cinq minutes, et un bras laissé trop longtemps s'étend. */
function pipelinusReagitCh10(){
	var c = sCh10();
	if (!c.maree) return;
	BRAS_CH10.forEach(function(b){
		var x = c.bras[b.cle];
		if (!x || x.resolu) return;
		if (brasResoluCh10(b.cle)){
			x.resolu = c.minutes;
			if (!state.has("rejeuEnCours")) say(C.vert("✂ " + majusculeCh10(b.nom) + " est tranché.") + " Il se rétracte dans un nuage d'encre, et une lanterne de la rive se rallume.");
			return;
		}
		if (!x.etendu && c.minutes - x.debut >= DELAI_EXTENSION_CH10){
			x.etendu = c.minutes;
			if (b.cle === "doublons") moteurSeul(function(){ var M = mareeCh10(); fichierSrvMareeCh10("/srv/lac/entree/captures-maree.csv", ENTETE_CAPTURES_CH10 + "\n" + melangerCh10(M.uniques.concat(M.uniques, M.uniques, M.uniques, M.uniques), "maree-cinq").map(ligneCaptureCh10).join("\n") + "\n"); });
			if (!state.has("rejeuEnCours")) say(C.rouge(majusculeCh10(b.nom) + " s'étend.") + " Laissé sans réponse, il gagne du terrain : la Clarté du Lac baisse." +
				(b.cle === "doublons" ? " Dans l'entrée, chaque capture est maintenant cinq fois." : ""));
		}
	});
	// Un nouveau bras toutes les 45 minutes ; ou tout de suite, quand tous ceux qui sont sortis sont tranchés.
	var lances = BRAS_CH10.filter(function(b){ return !!c.bras[b.cle]; });
	if (lances.length && lances.length < BRAS_CH10.length){
		var dernier = Math.max.apply(null, lances.map(function(b){ return c.bras[b.cle].debut; }));
		var tousTranches = lances.every(function(b){ return !!c.bras[b.cle].resolu; });
		if (tousTranches || c.minutes - dernier >= INTERVALLE_BRAS_CH10){
			var suivant = BRAS_CH10[lances.length];
			lancerBrasCh10(suivant.cle);
			annoncerBrasCh10([suivant.cle]);
		}
	}
}
function incidentsOuvertsCh10(){
	var c = sCh10(), l = [];
	BRAS_CH10.forEach(function(b){ var x = c.bras[b.cle]; if (x && !x.resolu && x.etendu) l.push(b.nom + " s'étend"); });
	return l;
}

/* ------------------------------------------------------------------ */
/* La Clarté du Lac : de 0 à 100, lue sur l'état réel de lac             */
/* ------------------------------------------------------------------ */

function cronSauvegardeCh10(){ return lignesCronJoueurCh10().some(function(l){ return /pg_dump/.test(l) && /^\s*(\S+\s+){5}/.test(l); }); }
var MESURES_CLARTE_CH10 = [
	{ poids: 7, texte: "le Bras du Déluge tranché (le déversoir arrêté et désactivé, le disque respire)", ok: function(){ return !sCh10().maree ? usageSrvLacCh10() < 85 : brasResoluCh10("deluge"); } },
	{ poids: 7, texte: "le Bras des Doublons tranché (captures-maree propre, chaque capture une fois)", ok: function(){ return !sCh10().maree ? !!state.quests["n10_doublons"] : brasResoluCh10("doublons"); } },
	{ poids: 7, texte: "le Bras de l'Encre tranché (le relevé sonar lisible)", ok: function(){ return !sCh10().maree ? !!state.quests["n10_encre"] : brasResoluCh10("encre"); } },
	{ poids: 7, texte: "le Bras du Poison tranché (les lignes de demain en quarantaine)", ok: function(){ return !sCh10().maree ? !!state.quests["n10_formats"] : brasResoluCh10("poison"); } },
	{ poids: 7, texte: "le Bras du Brouillard tranché (rien de personnel dans /srv/lac/public)", ok: function(){ return !sCh10().maree ? !!state.quests["n10_anonymiser"] : brasResoluCh10("brouillard"); } },
	{ poids: 7, texte: "le Bras de la Fourche tranché (aucun conteneur de Pipelinus)", ok: function(){ return !sCh10().maree ? true : brasResoluCh10("fourche"); } },
	{ poids: 7, texte: "le Bras du Mimétisme tranché (etl:1.0 reconstruite depuis ton Dockerfile)", ok: function(){ return !sCh10().maree ? !!state.quests["n10_image"] : brasResoluCh10("mimetisme"); } },
	{ poids: 7, texte: "le Bras du Néant tranché (la base restaurée depuis ta sauvegarde)", ok: function(){ return !sCh10().maree ? !!state.quests["n10_citerne"] : brasResoluCh10("neant"); } },
	{ poids: 5, texte: "le disque du lac sous 80 %", ok: function(){ return usageSrvLacCh10() < 80; } },
	{ poids: 5, texte: "une rotation des journaux du lac (/etc/logrotate.d)", ok: function(){ var lr = "", d = dossierHote(LAC_CH10, "/etc/logrotate.d"); if (d) d.items.forEach(function(it){ lr += "\n" + it.getText(); }); return logrotateConfCh10(lr, "\\/srv\\/lac\\/journaux\\/"); } },
	{ poids: 3, texte: "la nuit de l'écluse planifiée, sous flock", ok: function(){ return cronNuitOkCh10(); } },
	{ poids: 5, texte: "une sauvegarde de la base planifiée chaque nuit (une ligne de cron avec pg_dump)", ok: function(){ return cronSauvegardeCh10(); } },
	{ poids: 6, texte: "une sauvegarde de la base, restaurée au moins une fois", ok: function(){ return !!state.quests["n10_sauvegarde"]; } },
	{ poids: 4, texte: "l'ingestion en INFO, et qui tourne", ok: function(){ var conf = texteHote(LAC_CH10, "/etc/lac/ingestion.conf") || ""; return /^\s*LOG_LEVEL\s*=\s*"?INFO"?\s*$/mi.test(conf) && procsMachine(LAC_CH10).some(function(p){ return p.comm === "ingestion" && p.etat !== "Z"; }); } },
	{ poids: 5, texte: "l'image de l'ETL épinglée, sans root", ok: function(){ return imageEtlOkCh10(); } },
	{ poids: 5, texte: "le Grand Bassin en bonne santé, le carnet sur 127.0.0.1", ok: function(){ var db = serviceEnMarcheCh10("bassin", "db"); return !!db && santePort(db) === "healthy" && carnetLocalCh10("bassin"); } },
	{ poids: 2, texte: "l'agrégateur ralenti, pas tué", ok: function(){ return pressionOkCh10() || !!state.quests["n10_pression"]; } }
];
function clarteCh10(){
	var s = 0;
	MESURES_CLARTE_CH10.forEach(function(m){ var ok = false; try { ok = m.ok(); } catch (e){ ok = false; } if (ok) s += m.poids; });
	s -= 3 * incidentsOuvertsCh10().length;
	return Math.max(0, Math.min(100, Math.round(s)));
}
function mesuresManquantesCh10(){ return MESURES_CLARTE_CH10.filter(function(m){ try { return !m.ok(); } catch (e){ return true; } }); }

/* ------------------------------------------------------------------ */
/* Les dossiers cassés se régénèrent                                   */
/* ------------------------------------------------------------------ */

var REGENERATIONS_CH10 = [
	{ nom: "rive", etapes: ["n10_regarder", "n10_octets", "n10_trier", "n10_filtrer", "n10_sommer", "n10_statistiques"], semer: function(){ var D = donneesCh10(); fichierLacCh10("rive/captures.csv", texteCapturesCh10(D.captures)); fichierLacCh10("rive/comptoirs.csv", texteComptoirsCh10()); fichierLacCh10("rive/mystere.txt", ENTETE_CAPTURES_CH10.replace(/,/g, "\t") + "\n" + D.captures.slice(0, 30).map(function(c){ return ligneCaptureCh10(c).replace(/,/g, "\t"); }).join("\n") + "\n"); if (!texteLacCh10("~/rive/REPONSES.md")) fichierLacCh10("rive/REPONSES.md", reponsesRiveCh10()); } },
	{ nom: "courants", etapes: ["n10_encre", "n10_lignes", "n10_doublons", "n10_differences", "n10_formats", "n10_json"], semer: function(){
		var A = arrivagesCh10();
		fichierLacCh10("courants/arrivee-nord.csv", ENTETE_CAPTURES_CH10 + "\n" + A.nord.map(ligneCaptureCh10).join("\n") + "\n", { encodage: "ISO-8859-1" });
		fichierLacCh10("courants/arrivee-sud.csv", "﻿" + [ENTETE_CAPTURES_CH10].concat(A.sud.map(ligneCaptureCh10)).join("\r\n") + "\r\n");
		fichierLacCh10("courants/brutes.csv", ENTETE_CAPTURES_CH10 + "\n" + A.brutes.map(ligneCaptureCh10).join("\n") + "\n");
		fichierLacCh10("courants/hier.csv", ENTETE_CAPTURES_CH10 + "\n" + A.hier.map(ligneCaptureCh10).join("\n") + "\n");
		fichierLacCh10("courants/aujourdhui.csv", ENTETE_CAPTURES_CH10 + "\n" + A.aujourdhui.map(ligneCaptureCh10).join("\n") + "\n");
		fichierLacCh10("courants/vanne.csv", ENTETE_CAPTURES_CH10 + "\n" + A.vanne.join("\n") + "\n");
		if (!texteLacCh10("~/courants/REPONSES.md")) fichierLacCh10("courants/REPONSES.md", "# Les réponses des Courants\n\n6. Combien de captures de sandre dans captures.json ?\nRéponse : \n");
	} },
	{ nom: "ecluses", etapes: ["n10_script", "n10_piege", "n10_cron", "n10_journal"], semer: function(){ var A = arrivagesCh10(); fichierLacCh10("ecluses/ecluse.sh", TEXTES_LAC_CH10.ecluse, { mode: "rwxr-xr-x" }); fichierLacCh10("ecluses/nuit.sh", TEXTES_LAC_CH10.nuit, { mode: "rwxr-xr-x" }); fichierLacCh10("ecluses/donnees/arrivee du soir.csv", ENTETE_CAPTURES_CH10 + "\n" + A.sud.slice(0, 20).map(ligneCaptureCh10).join("\n") + "\n"); } },
	{ nom: "bief", etapes: ["n10_decouper", "n10_parallele"], semer: function(){ supprimerLacCh10("~/bief/morceaux"); fichierLacCh10("bief/sondes.csv", "sonde,horodatage,profondeur_m,temperature_c,oxygene_mgl\n" + donneesCh10().sondes.join("\n") + "\n"); } },
	{ nom: "profondeurs", etapes: ["n10_bornes", "n10_anonymiser"], semer: function(){ fichierLacCh10("profondeurs/agreger.sh", TEXTES_LAC_CH10.agreger, { mode: "rwxr-xr-x" }); fichierLacCh10("profondeurs/export-brut.csv", exportBrutCh10()); } },
	{ nom: "arsenal", etapes: ["n10_image", "n10_lancer", "n10_compose", "n10_carnet"], semer: function(){
		var D = donneesCh10();
		fichierLacCh10("arsenal/etl/etl.py", TEXTES_LAC_CH10.etl); fichierLacCh10("arsenal/etl/requirements.txt", TEXTES_LAC_CH10.etlRequirements); fichierLacCh10("arsenal/etl/Dockerfile", TEXTES_LAC_CH10.etlDockerfile);
		fichierLacCh10("arsenal/donnees/captures.csv", texteCapturesCh10(D.captures)); dossierLacCh10("arsenal/sortie");
		fichierLacCh10("arsenal/carnet/carnet.py", TEXTES_LAC_CH10.carnet); fichierLacCh10("arsenal/carnet/requirements.txt", TEXTES_LAC_CH10.carnetRequirements); fichierLacCh10("arsenal/carnet/Dockerfile", TEXTES_LAC_CH10.carnetDockerfile);
		fichierLacCh10("arsenal/bassin/compose.yaml", TEXTES_LAC_CH10.bassin); fichierLacCh10("arsenal/bassin/db.env", TEXTES_LAC_CH10.dbEnv, { mode: "rw-------" }); fichierLacCh10("arsenal/bassin/carnet.env", TEXTES_LAC_CH10.carnetEnv, { mode: "rw-------" });
		fichierLacCh10("arsenal/bassin/donnees/captures.csv", texteCapturesCh10(D.captures)); dossierLacCh10("arsenal/bassin/sortie", "rwxrwxrwx"); dossierLacCh10("arsenal/sauvegardes");
	} },
	{ nom: "filet", etapes: ["n10_rang1"], epreuve: 1, semer: function(){ poserEpreuveCh10(1); } },
	{ nom: "eau-trouble", etapes: ["n10_rang2"], epreuve: 2, semer: function(){ poserEpreuveCh10(2); } },
	{ nom: "ecluse-bloquee", etapes: ["n10_rang3"], epreuve: 3, semer: function(){ supprimerLacCh10("~/ecluse-bloquee"); poserEpreuveCh10(3); } },
	{ nom: "pile-engloutie", etapes: ["n10_rang5"], epreuve: 5, semer: function(){ poserEpreuveCh10(5); } }
];
function regenererCh10(x){
	var c = sCh10(); c.regenerations = c.regenerations || {}; c.regenerations[x.nom] = (c.regenerations[x.nom] || 0) + 1;
	moteurSeul(function(){ try { x.semer(); } catch (e){ if (typeof console !== "undefined" && console.error) console.error(e); } });
}

/* ------------------------------------------------------------------ */
/* L'avancée du chapitre                                               */
/* ------------------------------------------------------------------ */

function rappelWissamCh10(){
	if (state.quests["n10_jauge"] || !state.has("ch10Ouvert") || !state.quests["n10_entree"]) return null;
	var c = sCh10(), l = [];
	if (!state.has("ch10WissamLu")) l.push("l'écouter (cat Wissam)");
	if (!state.has("ch10OrdreLu")) l.push("lire l'Ordre (cat Ordre)");
	if (c.scoreDepart === null || c.scoreDepart === undefined) l.push("plonger la jauge (jauge)");
	if (!l.length) return null;
	var fin = l.pop();
	return "Wissam t'attend au bout du ponton (cd " + Shell.cheminAffiche(LacCh10) + ") : il te reste à " + (l.length ? l.join(", ") + " et " : "") + fin +
		". Tant que ce n'est pas fait, aucun poste ne compte : ni étape, ni insigne de rang.";
}
function validerCh10(){
	var c = sCh10();
	if (!state.quests["n10_jauge"] && state.has("ch10WissamLu") && state.has("ch10OrdreLu") && c.scoreDepart !== null && c.scoreDepart !== undefined){
		state.complete("n10_jauge");
		if (!state.has("insigne_riverain")){ state.set("insigne_riverain"); if (!state.has("rejeuEnCours")) say(C.jaune("Wissam accroche à ta veste une goutte de verre, vide. « Riverain. Tout le monde commence au bord. Même ceux qui finissent au fond. »")); }
	}
	var rappel = rappelWissamCh10();
	if (rappel && !c.rappelWissam && ACTES_CH10[0].etapes.concat(["n10_quai"]).some(function(id){ try { return VALIDATIONS_CH10[id](); } catch (e){ return false; } })){
		c.rappelWissam = true;
		if (!state.has("rejeuEnCours")) say(C.gris("(Radio : « Grace : bien vu, Riverain. Mais " + rappel + " »)"));
	}
	Object.keys(VALIDATIONS_CH10).forEach(function(id){
		if (state.quests[id]) return;
		if (/^n10_rang/.test(id)) return;
		if (!state.quests["n10_jauge"]) return;
		if (id !== "n10_quai" && rangCh10() < acteDeEtapeCh10(id) - 1) return;
		var ok = false;
		try { ok = VALIDATIONS_CH10[id](); } catch (e){ ok = false; }
		if (ok) state.complete(id);
	});
	ACTES_CH10.forEach(function(a){
		if (!a.epreuve) return;
		if (rangCh10() === a.n - 1 && state.quests["n10_jauge"] && a.etapes.every(function(id){ return !!state.quests[id]; })) ouvrirEpreuveCh10(a.n);
		if (!state.quests[a.epreuve] && epreuveOuverteCh10(a.n)){
			var ok = false;
			try { ok = VALIDATIONS_CH10[a.epreuve](); } catch (e){ ok = false; }
			if (ok){ state.complete(a.epreuve); monterEnRangCh10(a.n); }
		}
	});
	// Chaque poste tenu : une phrase, une fois.
	c.postes = c.postes || {};
	POSTES_CH10.forEach(function(p){
		if (!etapesPosteFaitesCh10(p) || c.postes[p.cle] !== undefined) return;
		c.postes[p.cle] = c.minutes;
		if (!state.has("rejeuEnCours")) say(C.jaune("◈ Poste tenu : " + p.titre) + C.gris(" : sa lanterne s'allume sur la rive, et " + p.maitre + " grave ton nom sur le bois du quai."));
	});
	// La Grande Marée : quand le Maître du Lac est sacré, ou à l'aube du quatrième jour (et alors, dès qu'il l'est).
	if (!c.maree && state.quests["n10_rang5"]) commencerMareeCh10(c.minutes >= AUBE_CH10);
	if (c.minutes >= AUBE_CH10 && !c.maree && !c.assaut) lancerAssautCh10();
	if (c.maree){
		pipelinusReagitCh10();
		if (!state.quests["n10_maree"] && vuCh10("jaugeMaree")) state.complete("n10_maree");
		BRAS_CH10.forEach(function(b){ if (!state.quests[b.etape] && c.bras[b.cle] && c.bras[b.cle].resolu) state.complete(b.etape); });
		var tous = BRAS_CH10.every(function(b){ return !!state.quests[b.etape]; });
		if (!state.quests["n10_clarte"] && tous && incidentsOuvertsCh10().length === 0){
			var cl = clarteCh10();
			if (cl >= 90){ c.scoreFinal = cl; state.complete("n10_clarte"); }
		}
	}
	if (!state.quests["n10_rapport"] && rapportOkCh10()){
		var reste = [];
		if (!c.maree) reste.push("la Grande Marée n'est pas encore venue");
		else {
			BRAS_CH10.forEach(function(b){ if (!state.quests[b.etape]) reste.push(b.nom + " n'est pas tranché"); });
			if (!state.quests["n10_clarte"]) reste.push("le lac n'a pas encore retrouvé sa clarté (au-dessus de 90)");
		}
		var manque = rapportManqueCh10();
		if (!reste.length && !manque.length) state.complete("n10_rapport");
		else if (!reste.length){
			if (c.rapportAttente !== manque.join(",")){ c.rapportAttente = manque.join(","); say("Laurent lit ton rapport, et pose le doigt sur une ligne vide. « Il manque " + manque.join(", et ") + ". Un rapport se vérifie : écris les vraies valeurs. »"); }
		} else if (c.rapportAttente !== reste.join(",")){
			c.rapportAttente = reste.join(",");
			say("Laurent prend ton rapport, le lit, et le glisse sous sa veste. « Bien écrit. Mais la Marée n'est pas finie : " + reste.join(", et ") + ". Je contresignerai quand le lac sera clair. »");
		}
	}
	if (state.quests["n10_rapport"] && !state.has("victoireCh10")) state.applyState("victoireCh10");
}
function rapportCh10(){ var it = BoiteLacCh10.getItemFromName("rapport.txt"); return it === -1 ? null : it.getText(); }
function rapportOkCh10(){
	var t = rapportCh10();
	if (t === null) return false;
	var b = sansAccentCh10(t);
	return ["pipelinus", "deluge", "doublon", "encre", "poison", "brouillard", "fourche", "mimetisme", "neant", "reste"].every(function(r){ return b.indexOf(r) > -1; });
}
function rapportManqueCh10(){
	var t = rapportCh10() || "", c = sCh10(), l = [];
	if (c.scoreFinal !== null && c.scoreFinal !== undefined && !contientNombre(t, c.scoreFinal, 0.5)) l.push("la Clarté du Lac après la Marée (" + c.scoreFinal + ")");
	var n = donneesCh10().captures.length;
	if (!contientNombre(t, n, 0)) l.push("le nombre de captures restaurées dans la base (" + n + "), lu par SELECT count(*)");
	return l;
}

/* ------------------------------------------------------------------ */
/* Le monde réagit, à chaque tour                                      */
/* ------------------------------------------------------------------ */

function verifierChapitre10(){
	function une(nom, cond){ if (!state.has(nom) && cond) state.applyState(nom); }
	une("ch10Ouvert", !!state.quests["n9_rapport"] || state.has("ch10Direct"));
	if (!state.has("ch10Ouvert")) return;
	var c = sCh10();
	if (!c.base) c.base = baseJourCh10();
	relierLacCh10();
	if (!state.quests["n10_entree"]) return;
	try { semerLac(); declarerUnitesLacCh10(); habillerMaisonLacCh10(); } catch (e){ if (typeof console !== "undefined" && console.error) console.error(e); }
	var r = avancerHorlogeCh10();
	for (var i = 0; i < r.nuits; i++) nuitCh10(c.nuitsVues - r.nuits + i + 1);
	annoncerHeureCh10();
	validerCh10();
}

function etatChapitre10(nom){
	switch (nom){
		case "ch10Ouvert":
			sCh10();
			if (state.has("ch10Direct")) clesDepartCh10();
			relierLacCh10();
			if (!state.has("rejeuEnCours") && !state.has("ch10Direct")) say("Le lendemain, avant l'aube, Wissam frappe à ta porte, une lanterne à la main. « Le sceau daté de demain. Je sais d'où il vient. Il y a un escalier sous la Chronothèque, et au bout, de l'eau. Viens : cd ~/Cybersup/Lac. » " +
				C.gris("(Radio : « Grace : le lac ? Je croyais que c'était une légende de l'école. Prends ta lampe. »)"));
			break;
		case "victoireCh10":
			if (!state.dateVictoire11) state.dateVictoire11 = dateDuJour();
			poser(Home, CertificatLacCh10);
			poser(LacCh10, PasserelleLacCh10);
			if (!state.has("rejeuEnCours")){
				if (typeof montrerImage === "function") montrerImage("./static/img/loc_lac_victoire.gif", "Le lac est clair");
				say(C.jaune(C.gras("LE LAC EST CLAIR.")) + " Les huit bras se rétractent un à un, et l'œil immense se referme lentement sous la surface. L'eau noire pâlit, puis s'éclaircit, jusqu'à laisser voir le fond : " +
					"des galets, des tuyaux de cuivre bien rangés, et quinze lanternes qui brûlent ensemble au bord des quais. Les gardiens des postes lèvent leur lanterne vers toi." +
					(typeof texteAmiFinaleCh10 === "function" ? texteAmiFinaleCh10() : ""));
				say("Laurent lit ton rapport jusqu'à la dernière ligne, puis le contresigne. « Dix chapitres. Tu es entré dans cette école sans savoir taper ls. Tu en sors en ayant regardé Pipelinus dans les yeux, avec un terminal et rien d'autre. Maître du Lac. »");
				say(C.gris("(Ton CertificatLac est posé dans ta Maison : cat ~/CertificatLac. Il porte la note du chapitre 10 et son code de vérification. Wissam a aussi laissé un feuillet sur le ponton : cat ~/Cybersup/Lac/Passerelle, pour refaire tout ça sur ta propre machine.)"));
				say(C.gras("Tard dans la nuit, seul sur le ponton,") + " tu regardes l'eau claire. Tout au fond, posé sur un galet, un petit sceau de cire grise. Tu le remontes. Deux lettres, P.G., et une date : demain, encore. " +
					"Mais cette fois, en dessous, d'une écriture tremblée : « Merci de m'avoir nettoyé. »\n" +
					C.gris("(Radio, très bas : « Grace : ... Il n'était peut-être pas méchant. Juste nourri de données sales pendant dix ans. Comme tout ce qu'on ne range jamais. »)") + "\n\n" + C.gras("Fin de la saga. Pour l'instant."));
			}
			break;
	}
}

/* Les événements du chapitre. */
GameEvents.addListener("enter", function(e){
	if (!state.has("ch10Ouvert")) return;
	if (e.room === LacCh10 && !state.quests["n10_entree"]){
		var c = sCh10();
		state.debutChapitre11 = state.tempsMs;
		if (!c.base) c.base = baseJourCh10();
		c.compteVu = c.compte || 0;
		state.complete("n10_entree");
		try { semerLac(); } catch (x){ if (typeof console !== "undefined" && console.error) console.error(x); }
	}
});
GameEvents.addListener("read", function(e){
	if (!state.has("ch10Ouvert")) return;
	if (e.item === WissamLacCh10) state.set("ch10WissamLu");
	if (e.item === OrdreLacCh10) state.set("ch10OrdreLu");
});

/* ------------------------------------------------------------------ */
/* Sur la rive : Wissam, l'Ordre, la radio, la jauge                    */
/* ------------------------------------------------------------------ */

var WissamLacCh10 = new Item("Wissam", "", "item_wissam.gif").personnage();
LacCh10.addItem(WissamLacCh10);
var OrdreLacCh10 = objetCh10(LacCh10, "Ordre",
	"ORDRE DE MISSION · LE LAC PROFOND\n\n" +
	"Sous la Chronothèque dort le lac de données de l'école, sur la machine lac (ssh lac). Dans ses profondeurs, Pipelinus,\n" +
	"celui qui signait P.G. À l'aube du quatrième jour, la Grande Marée le fera remonter. Il est J1 06:00. Chaque sort prend\n" +
	"cinq minutes ; à 22 h, on dort ; on se lève à 6 h. Pendant la nuit, ta crontab sur lac tourne vraiment.\n\n" +
	"1. Plonger la jauge (jauge, une commande du jeu) : la Clarté du Lac, au départ.\n" +
	"2. Tenir les quinze postes : chaque gardien t'enseigne ses sorts (cat GARDIEN) ; ton travail t'attend sur lac, dans ta maison.\n" +
	"3. Monter en rang : chaque acte finit par une épreuve. Riverain, Pêcheur de données, Plongeur, Éclusier, Sondeur des Abysses,\n" +
	"   Maître du Lac (insignes).\n" +
	"4. Trancher les huit bras de Pipelinus pendant la Grande Marée : le Déluge, les Doublons, l'Encre, le Poison, le Brouillard,\n" +
	"   la Fourche, le Mimétisme, le Néant.\n" +
	"5. La Clarté du Lac au-dessus de 90 après la Marée.\n" +
	"6. Le rapport, sur l'île : ~/Cybersup/Lac/BoiteDeLaurent/rapport.txt (Pipelinus, les huit bras, ce qui reste, la clarté finale,\n" +
	"   et le nombre de captures restaurées dans la base).\n\n" +
	"Règle d'or : une donnée ne se jette jamais. On la compresse, on l'archive, on la met en quarantaine.\n" +
	"Un dossier cassé se régénère : regenerer NOM (une commande du jeu).",
	"item_ordre_embarquement.gif");
var RadioLacCh10 = new Item("Radio", "", "item_workstation.gif");
LacCh10.addItem(RadioLacCh10);
var JaugeLacCh10 = new Item("Jauge", "", "item_jauge.gif").droits("rw-r--r--", "root");
LacCh10.addItem(JaugeLacCh10);
var CertificatLacCh10 = new Item("CertificatLac", "", "item_manuscript.gif");

function texteJaugeObjetCh10(){
	var c = sCh10(), l = "LA JAUGE DU LAC\n\nIl est " + heureCh10() + ". Tu es " + nomRangCh10() + ".\n";
	if (c.maree) return l + "\nLa Grande Marée est là" + (c.maree.avantAube ? ", avant l'aube." : ", à l'aube du quatrième jour.") + "\n(jauge, la commande, pour la situation.)";
	l += "\n" + majusculeCh10(texteAvantMareeCh10()) + " (l'aube du J4, 06:00).\nÀ 22 h, on dort ; on se lève à 6 h.\n\n";
	l += "Défis d'honneur de Wissam :\n";
	l += "  Pêcheur de données avant la nuit du J1 : " + (aFait("s_n10_pecheur_j1") ? "réussi" : (c.minutes >= 1320 ? "manqué" : "en cours")) + "\n";
	l += "  Sondeur des Abysses avant la fin du J2 : " + (aFait("s_n10_sondeur_j2") ? "réussi" : (c.minutes >= 1440 + 1320 ? "manqué" : "en cours")) + "\n";
	l += "  La Marée repoussée avant l'aube du J4 : " + (aFait("s_n10_avant_maree") ? "réussi" : "en cours") + "\n";
	l += "\n(jauge, la commande du jeu, donne le plan des postes et la Clarté du Lac.)";
	return l;
}
function texteRadioCh10(){
	var q = QUETES_CH10.filter(function(x){ return !state.quests[x.id]; })[0];
	if (!q) return "La radio grésille. « Grace : rapport contresigné. Le lac est clair, Maître du Lac. Beau travail. »";
	var heure = "il est " + heureCh10() + ". " + (sCh10().maree ? "La Marée est là. " : majusculeCh10(texteAvantMareeCh10()) + ". ");
	return "La radio grésille. « Grace : " + heure + (CONSEILS_CH10[q.id] || "Je te suis.") + (METIER_CH10[q.id] ? " " + METIER_CH10[q.id] : "") + " »";
}
function texteWissamCh10(){
	if (state.quests["n10_rapport"]) return "Wissam est assis au bord du ponton, les pieds au-dessus de l'eau claire.\n\n« Quinze postes, cinq épreuves, huit bras tranchés. Et pas une donnée jetée. " +
		"Ton CertificatLac t'attend dans ta Maison. Les défis des gardiens restent ouverts, et le lac aussi : il faut le tenir propre, maintenant. Tous les jours. »";
	return "Wissam est debout au bout du ponton, sa lanterne levée au-dessus de l'eau noire. Celui qu'on appelait le Sage du Couloir, pendant l'Épreuve, n'a pas changé : calme, et précis.\n\n" +
		"« Le sceau daté de demain. Je l'ai suivi jusqu'ici. Ce lac, c'est tout ce que l'école a produit en dix ans : chaque journal, chaque export, chaque sauvegarde, versés là sans qu'on les trie jamais. " +
		"Il y a dedans les fichiers de la flotte noire, et ceux du Faussaire. Et quelque chose s'en est nourri.\n\n" +
		"Pipelinus. Huit bras, et chacun est un pipeline. Il lit tous nos journaux : c'est pour ça qu'il connaît demain. P.G. : Pipelinus, Gardien du Lac. C'est lui qui signait. " +
		"La flotte noire et le Faussaire n'étaient que deux de ses bras. À l'aube du quatrième jour, la Grande Marée le fera remonter, et il frappera avec les huit.\n\n" +
		"On ne le combat pas avec une épée. On le combat avec des données propres, des scripts qui échouent bruyamment, une machine qui respire, des conteneurs qu'on maîtrise et des sauvegardes qui se restaurent. " +
		"Les données vivent sur la machine lac : ssh lac. Quinze gardiens tiennent les postes de la rive ; chacun t'enseigne ses sorts (cat leur nom). Chaque acte finit par une épreuve de rang. " +
		"Commence par plonger la jauge : jauge. C'est ton point zéro.\n\n" +
		"Trois défis d'honneur : Pêcheur de données avant ta première nuit, Sondeur des Abysses avant la fin du deuxième jour, et la Marée repoussée avant l'aube du quatrième. " +
		"Et deux à part : repousser la Marée sans acheter un seul indice, et finir sans avoir effacé un seul vieux journal du lac (compressés, tous). »";
}
texteVivant(JaugeLacCh10, texteJaugeObjetCh10);
texteVivant(RadioLacCh10, texteRadioCh10);
texteVivant(WissamLacCh10, texteWissamCh10);
texteVivant(CertificatLacCh10, function(){ return state.has("victoireCh10") ? state.texteDuCertificat11() : ""; });

/* ------------------------------------------------------------------ */
/* Le certificat du chapitre                                           */
/* ------------------------------------------------------------------ */

GameState.prototype.texteDuCertificat11 = function(){
	var minutes = Math.round((this.tempsMs - (this.debutChapitre11 || 0)) / 60000);
	var totalSec = QUETES_SECONDAIRES_CH10.length;
	var secFaites = QUETES_SECONDAIRES_CH10.filter(function(q){ return this.quests[q.id]; }, this).length;
	var annexes = typeof annexesDuChapitre === "function" ? annexesDuChapitre(11) : [];
	var c = this.ch10 || {};
	return "" +
		"==================================\n" +
		"     CYBERSUP · CERTIFICAT DU LAC PROFOND (LINUX ET DOCKER POUR LA DONNÉE)\n" +
		"==================================\n" +
		"\n" +
		"  Décerné à : " + (this.nom || JOUEUR) + ", Maître du Lac\n" +
		"\n" +
		"  pour avoir, en trois jours et une aube, tenu un lac de données :\n" +
		"  lire une donnée (file, head, wc, column, od), compter et filtrer\n" +
		"  (sort, uniq, awk, csvkit, datamash), nettoyer (iconv, dos2unix,\n" +
		"  le BOM, les doublons, comm, mlr, jq), automatiser sans danger\n" +
		"  (set -euo pipefail, mktemp, trap, split, xargs -P, cron, flock,\n" +
		"  logrotate), tenir la machine (df, du, lsof +L1, nice, ionice,\n" +
		"  taskset), protéger les données personnelles (chmod, ACL, umask,\n" +
		"  shred), conteneuriser (une image reproductible, des volumes, postgres,\n" +
		"  pg_dump, docker compose, healthcheck) ; puis repoussé la Grande\n" +
		"  Marée et rédigé le rapport, en terminal.\n" +
		"\n" +
		"  SCORE DU CHAPITRE 10 : " + this.xpNet(11) + " XP sur " + this.xpMax11() + "\n" +
		"  NOTE                 : " + this.noteTexte(11) + "\n" +
		"  Mention              : " + this.mention(11) + "\n" +
		"  Clarté du Lac        : " + (c.scoreDepart !== undefined && c.scoreDepart !== null ? c.scoreDepart : "?") + " au départ, " + (c.scoreFinal !== undefined && c.scoreFinal !== null ? c.scoreFinal : "?") + " après la Marée\n" +
		"  Rang                 : " + RANGS_CH10[typeof c.rang === "number" ? c.rang : 0].nom + "\n" +
		"  Sorts du lac         : " + ORDRE_DES_SORTS_11.filter(function(x){ return this.usages[x]; }, this).length + " sur " + ORDRE_DES_SORTS_11.length + "\n" +
		"  Quêtes secondaires   : " + secFaites + " sur " + totalSec + "\n" +
		"  Quêtes annexes       : " + annexes.filter(function(a){ return this.quests[a.id]; }, this).length + " sur " + annexes.length + "\n" +
		"  Temps du chapitre    : " + (minutes < 60 ? minutes + " min" : Math.floor(minutes / 60) + " h " + deuxChiffres(minutes % 60)) + "\n" +
		"  Indices payants      : " + (this.malus11 ? this.nbIndices(11) + " (-" + this.malus11 + " XP sur la note)" : "aucun") + "\n" +
		"\n" +
		pointsDifficilesCh10(this) +
		"\n" +
		"  Et maintenant, chez toi : cat ~/Cybersup/Lac/Passerelle\n" +
		"\n" +
		"  Signé : Laurent, Directeur Pédagogique de Cybersup,\n" +
		"          Wissam, gardien du ponton,\n" +
		"          et Grace, cheffe de quart de la WarRoom\n" +
		"==================================\n" +
		"  Code de vérification (indicatif), à remettre au formateur :\n" +
		"  " + this.codeDuCertificat11() + "\n" +
		"==================================";
};
/* Les points difficiles, pour le formateur : les indices achetés, les dossiers régénérés, les étapes les plus longues. */
var COMPLETE_AVANT_FRICTIONS_CH10 = GameState.prototype.complete;
GameState.prototype.complete = function(id){
	var deja = !!(this.quests && this.quests[id]);
	var r = COMPLETE_AVANT_FRICTIONS_CH10.apply(this, arguments);
	try { if (!deja && /^n10_/.test(id) && this.quests[id] && this === state){ var c = sCh10(); c.faitA = c.faitA || {}; c.faitA[id] = c.compte || 0; } } catch (e){}
	return r;
};
function titreCourtCh10(id){
	var q = QUETES_CH10.filter(function(x){ return x.id === id; })[0] || QUETES_SECONDAIRES_CH10.filter(function(x){ return x.id === id; })[0];
	var t = q ? q.titre.replace(/ \(.*$/, "") : id;
	return t.length > 46 ? t.substring(0, 45) + "…" : t;
}
function pointsDifficilesCh10(st){
	var c = st.ch10 || {}, l = [];
	var ind = Object.keys(st.indices || {}).filter(function(id){ return st.indices[id] > 0 && typeof chapitreDeQuete === "function" && chapitreDeQuete(id) === 11; });
	l.push("  POINTS DIFFICILES (pour le formateur)");
	l.push("  Indices achetés      : " + (ind.length ? "" : "aucun"));
	ind.forEach(function(id){ l.push("    " + titreCourtCh10(id) + " (" + st.indices[id] + ")"); });
	var reg = c.regenerations || {}, noms = Object.keys(reg);
	l.push("  Dossiers régénérés   : " + (noms.length ? noms.map(function(n){ return n + (reg[n] > 1 ? " (" + reg[n] + " fois)" : ""); }).join(", ") : "aucun"));
	var faits = Object.keys(c.faitA || {}).filter(function(id){ return id !== "n10_entree"; }).sort(function(a, b){ return c.faitA[a] - c.faitA[b]; });
	var avant = c.faitA && c.faitA.n10_entree !== undefined ? c.faitA.n10_entree : 0, durees = [];
	faits.forEach(function(id){ durees.push({ id: id, d: c.faitA[id] - avant }); avant = c.faitA[id]; });
	durees.sort(function(a, b){ return b.d - a.d; });
	var lentes = durees.filter(function(x){ return x.d >= 15; }).slice(0, 3);
	l.push("  Étapes les plus longues : " + (lentes.length ? "(en commandes tapées)" : "aucune au-delà de 15 commandes"));
	lentes.forEach(function(x){ l.push("    " + titreCourtCh10(x.id) + " (" + x.d + ")"); });
	return l.join("\n") + "\n";
}
/* La passerelle vers le vrai : les mêmes gestes, sur sa propre machine. */
var PasserelleLacCh10 = new Item("Passerelle", "", "item_manuscript.gif");
texteVivant(PasserelleLacCh10, function(){
	return "LA PASSERELLE : DU LAC PROFOND À TA MACHINE\n\n" +
		"Wissam a glissé ce feuillet sous ta lanterne. « Tout ce que tu as fait ici, refais-le une fois chez toi, sur une vraie machine Linux (ou WSL). Ce soir. »\n\n" +
		"1. Les outils (Debian ou Ubuntu) :\n" +
		"     sudo apt install csvkit miller datamash jq pv parallel zstd acl\n" +
		"     sudo apt install docker.io docker-compose-v2 (sous Debian : docker-compose) ; sudo usermod -aG docker \"$USER\" (puis reconnecte-toi)\n\n" +
		"2. Un vrai jeu de données (un export ouvert, data.gouv.fr par exemple), et les quatre regards :\n" +
		"     file -i f.csv ; head f.csv ; wc -l f.csv ; csvlook f.csv | head ; csvstat f.csv\n\n" +
		"3. Le nettoyage, toujours dans un nouveau fichier :\n" +
		"     iconv -f WINDOWS-1252 -t UTF-8 f.csv | tr -d '\\r' > propre.csv\n" +
		"     { head -n 1 propre.csv; tail -n +2 propre.csv | sort -u; } > uniques.csv\n" +
		"     mlr --icsv --ojson cat uniques.csv | jq '.[0]'\n\n" +
		"4. Un script de production commence toujours ainsi :\n" +
		"     #!/bin/bash\n     set -euo pipefail\n     tmp=$(mktemp) ; trap 'rm -f \"$tmp\"' EXIT\n\n" +
		"5. Une tâche de nuit, une seule à la fois, qui laisse une trace :\n" +
		"     crontab -e : 30 2 * * * flock -n /tmp/nuit.lock ~/nuit.sh >> ~/nuit.log 2>&1\n\n" +
		"6. Une image reproductible, des données en lecture seule, une base dans un volume, une sauvegarde testée :\n" +
		"     docker build -t etl:1.0 . ; docker run --rm -v \"$PWD/donnees:/data:ro\" etl:1.0\n" +
		"     docker exec base pg_dump -U moi mabase | gzip > sauvegarde.sql.gz ; et une restauration d'essai.\n\n" +
		"7. Le réflexe du Lac : on ne jette jamais une donnée, on ne publie jamais une donnée personnelle, et un pipeline\n" +
		"   qui dit « tout va bien » se vérifie.\n\n" +
		"Garde ce feuillet : c'est la même histoire, sans la pieuvre.";
});

GameState.prototype.codeDuCertificat11 = function(){
	var f = this.compteursFiges(11, this.xpNet(11), this.nbCommandes, Math.round((this.tempsMs - (this.debutChapitre11 || 0)) / 60000));
	return fabriquerCode({
		prenom: String(this.nom || JOUEUR).replace(/\|/g, "/"),
		score: this.xpNet(11), max: this.xpMax11(), note: this.note(11),
		commandes: f.commandes, minutes: f.minutes,
		indices: this.nbIndices(11), chapitre: 11,
		date: this.dateVictoire11 || dateDuJour(), graine: PROFIL.graine
	});
};

World.fige = true;

/* ------------------------------------------------------------------ */
/* Départ direct par « chapitre 10 »                                    */
/* ------------------------------------------------------------------ */

/* Au départ direct, tout ce qui s'apprenait avant (les chapitres et leurs annexes) est acquis ; seuls les sorts du lac restent à apprendre. */
function socleCh10Acquis(){
	if (typeof socleCh9Acquis === "function") socleCh9Acquis();
	[typeof ORDRE_DES_SORTS_10 !== "undefined" ? ORDRE_DES_SORTS_10 : []].forEach(function(l){ l.forEach(function(s){ state.spells[s] = true; }); });
	Object.keys(MANUEL).forEach(function(s){ if (Shell.sorts[s] && ORDRE_DES_SORTS_11.indexOf(s) === -1) state.spells[s] = true; });
}
function clesDepartCh10(){ if (typeof clesDepartCh9 === "function") clesDepartCh9(); }
function commencerChapitre10(){
	var alias = state.alias;
	state.alias = {};
	state.flags.rejeuEnCours = true;
	socleCh10Acquis();
	if (!state.quests.m_marche) state.complete("m_marche");
	state.set("sudoOK");
	state.set("chapitre1Saute");
	state.set("ch10Direct");
	PROFIL.chapitre = 10;
	enregistrerProfil();
	if (!state.ch10 || typeof state.ch10 !== "object") state.ch10 = etatCh10Initial();
	clesDepartCh10();
	state.applyState("ch10Ouvert");
	delete state.flags.rejeuEnCours;
	state.alias = alias;
	Shell.narration = [];
	state.gainsDuTour = [];
	if (typeof enterRoom === "function") enterRoom(LacCh10);
	Shell.lieu_precedent = null;
	Shell.pile_ssh = [];
	state.debutChapitre11 = state.tempsMs;
	if (typeof montrerImage === "function") montrerImage(LacCh10.room_pic, "Le Lac Profond");
	if (term && term.effacer) term.effacer();
	term.echo(C.vert(C.gras("CHAPITRE 10 : LE LAC PROFOND")) + "\n\n" +
		"Sous la Chronothèque dort le lac de données de l'école : dix ans de journaux, d'exports et de sauvegardes, versés sans tri. " +
		"Dans ses profondeurs vit Pipelinus, celui qui signait P.G. À l'aube du quatrième jour, la Grande Marée le fera remonter, et ses huit bras attaqueront les données de l'école. Il est 6 h, le premier jour.\n\n" +
		"Tu es sur la rive, au bout du ponton. " + C.vert("cat Wissam") + ", puis " + C.vert("cat Ordre") + ". Grace te guide à la radio ; quinze gardiens tiennent les postes du lac, et ton travail t'attend sur la machine lac (ssh lac).\n\n" +
		C.gris("Ce chapitre a sa propre note sur 20. quetes pour le journal, indice si tu bloques, xp pour ta note, jauge pour le plan, insignes pour ton rang. Chaque commande avance l'horloge de cinq minutes."));
	return true;
}
