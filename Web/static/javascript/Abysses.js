/**
 * Abysses.js : la vie du Lac Profond (chapitre 10 pour le joueur, numéro interne 11).
 *
 * Chapitre10.js pose le monde, l'horloge, les rangs, la Grande Marée et les étapes. Ici, le lac prend vie :
 *  - les quinze gardiens des postes ont un texte VIVANT : ils entrent en scène, expliquent leur poste par une image (avec le
 *    vrai mot du métier à côté), donnent la syntaxe, confient la mission, réagissent aux erreurs fréquentes, puis racontent
 *    une histoire du métier ;
 *  - les défis (quêtes secondaires s_n10_*) : quatre par gardien, révélés par lui, et cinq défis d'honneur de Wissam ;
 *  - les badges du chapitre (un par poste tenu, un par insigne de rang, la jauge, la Marée, le Néant, le rapport, l'aube) ;
 *  - les commandes du jeu jauge (le plan du lac), insignes (ton rang) et regenerer (un dossier neuf).
 */

World.fige = false;

/* ------------------------------------------------------------------ */
/* Les défis du lac (quêtes secondaires, quatre par gardien)            */
/* ------------------------------------------------------------------ */

function argsTexteCh10(a){ return (a || []).join(" "); }
function aCh10(a, motif){ return (a || []).some(function(x){ return motif.test(String(x)); }); }
function sousDockerCh10(a){ a = a || []; var i = 0; while (i < a.length && /^-/.test(a[i])) i += /^(-H|--host|-c|--context)$/.test(a[i]) ? 2 : 1; return a.slice(i); }

var DEFIS_CH10 = [
	// La Grève des Fichiers (Lamia)
	{ id: "s_n10_file_mime", m: "greve", titre: "Grève : le type et l'encre d'un fichier, d'un mot (file -i)",
	  appel: function(n, a, s){ return n === "file" && aCh10(a, /^-[a-z]*i$|^--mime/) && /charset=/.test(s); } },
	{ id: "s_n10_wc_c", m: "greve", titre: "Grève : peser un fichier en octets et en mots (wc -c, wc -w)",
	  appel: function(n, a, s){ return n === "wc" && aCh10(a, /^-[a-z]*[cw]/) && /^\s*\d+/.test(s); } },
	{ id: "s_n10_csvlook_l", m: "greve", titre: "Grève : un tableau aux lignes numérotées (csvlook -l)",
	  appel: function(n, a, s){ return n === "csvlook" && aCh10(a, /^-l$|^--linenumbers$/) && /\|/.test(s); } },
	{ id: "s_n10_stat_taille", m: "greve", titre: "Grève : le poids exact d'un fichier, sans fioriture (stat -c %s)",
	  appel: function(n, a, s){ return n === "stat" && aCh10(a, /%s/) && /^\d+$/.test(s.trim()); } },
	// Le Banc de Tri (Younes)
	{ id: "s_n10_sort_k", m: "banc", titre: "Banc : trier sur une seule colonne, en nombre et à rebours (sort -t, -k6,6nr)",
	  appel: function(n, a, s){ return n === "sort" && aCh10(a, /^-t/) && aCh10(a, /^-k\d+(,\d+)?[a-z]*n|^-k/) && aCh10(a, /n/) && s.trim().length > 0; } },
	{ id: "s_n10_csvcut_n", m: "banc", titre: "Banc : les colonnes, leurs noms et leurs numéros (csvcut -n)",
	  appel: function(n, a, s){ return n === "csvcut" && aCh10(a, /^-n$|^--names$/) && /^\s*1:/m.test(s); } },
	{ id: "s_n10_grep_c", m: "banc", titre: "Banc : compter les lignes qui répondent, sans les afficher (grep -c)",
	  appel: function(n, a, s){ return n === "grep" && aCh10(a, /^-[a-zA-Z]*c$|^--count$/) && /^\d+$/.test(s.trim()); } },
	{ id: "s_n10_awk_printf", m: "banc", titre: "Banc : des chiffres arrondis au centième (awk et printf \"%.2f\")",
	  appel: function(n, a, s){ return n === "awk" && /printf/.test(argsTexteCh10(a)) && /%\.2f/.test(argsTexteCh10(a)) && /\d\.\d\d/.test(s); } },
	// Le Comptoir des Mesures (Syrine)
	{ id: "s_n10_datamash_count", m: "comptoir", titre: "Comptoir : compter les prises de chaque groupe (datamash -g ... count)",
	  appel: function(n, a, s){ return n === "datamash" && aCh10(a, /^count$/) && aCh10(a, /^-g$|^--group/) && s.trim().length > 0; } },
	{ id: "s_n10_csvstat_freq", m: "comptoir", titre: "Comptoir : les valeurs les plus fréquentes d'une colonne (csvstat --freq)",
	  appel: function(n, a, s){ return n === "csvstat" && aCh10(a, /^--freq$/) && s.trim().length > 0; } },
	{ id: "s_n10_awk_moyenne", m: "comptoir", titre: "Comptoir : une moyenne à la main, somme divisée par nombre (awk ... END { print s / n })",
	  appel: function(n, a, s){ return n === "awk" && /END/.test(argsTexteCh10(a)) && /\/\s*(n|NR|c|nb)\b/.test(argsTexteCh10(a)) && /\d/.test(s); } },
	{ id: "s_n10_numfmt", m: "comptoir", titre: "Comptoir : un nombre lisible par un humain (numfmt --to=iec)",
	  appel: function(n, a, s){ return n === "numfmt" && aCh10(a, /^--to=(iec|si)/) && /[KMGT]/.test(s); } },
	// Le Gué des Encres (Noam)
	{ id: "s_n10_iconv_translit", m: "gue", titre: "Gué : retomber sur ses pattes quand une lettre n'existe pas (iconv -t ASCII//TRANSLIT)",
	  appel: function(n, a, s){ return n === "iconv" && /TRANSLIT/i.test(argsTexteCh10(a)) && s.trim().length > 0; } },
	{ id: "s_n10_unix2dos", m: "gue", titre: "Gué : le chemin inverse, pour un collègue sous Windows (unix2dos -n)",
	  appel: function(n, a){ return n === "unix2dos" && aCh10(a, /^-n$|^--newfile$/); } },
	{ id: "s_n10_od_hexa", m: "gue", titre: "Gué : les octets en hexadécimal, sans les adresses (od -An -t x1)",
	  appel: function(n, a, s){ return n === "od" && aCh10(a, /^-An$|^-A$/) && aCh10(a, /^x1$|^-tx1$/) && /\b[0-9a-f]{2}\b/.test(s); } },
	{ id: "s_n10_file_crlf", m: "gue", titre: "Gué : file qui trahit des fins de ligne Windows (with CRLF line terminators)",
	  appel: function(n, a, s){ return n === "file" && /CRLF/.test(s); } },
	// Le Moulin des Doublons (Maeva)
	{ id: "s_n10_uniq_D", m: "moulin", titre: "Moulin : voir chaque copie d'un doublon, pas seulement une (uniq -D)",
	  appel: function(n, a, s){ return n === "uniq" && aCh10(a, /^-[a-z]*D$|^--all-repeated/) && s.trim().length > 0; } },
	{ id: "s_n10_join", m: "moulin", titre: "Moulin : enrichir les captures avec la région de leur comptoir (join -t,)",
	  appel: function(n, a, s){ return n === "join" && /-t/.test(argsTexteCh10(a)) && /(Nord|Sud|Ouest)/.test(s); } },
	{ id: "s_n10_comm_12", m: "moulin", titre: "Moulin : ce qui est dans les deux jours à la fois (comm -12)",
	  appel: function(n, a, s){ return n === "comm" && aCh10(a, /^-12$|^-21$/) && s.trim().length > 0; } },
	{ id: "s_n10_sha_jumeaux", m: "moulin", titre: "Moulin : deux fichiers jumeaux, une seule empreinte (sha256sum sur deux fichiers identiques)",
	  appel: function(n, a, s){ if (n !== "sha256sum") return false; var h = (s.match(/^[0-9a-f]{64}/mg) || []); return h.length >= 2 && h.some(function(x, i){ return h.indexOf(x) !== i; }); } },
	// La Vanne des Formats (Kamal)
	{ id: "s_n10_mlr_pprint", m: "vanne", titre: "Vanne : un CSV en tableau aligné (mlr --icsv --opprint, ou --c2p)",
	  appel: function(n, a, s){ return n === "mlr" && aCh10(a, /^--opprint$|^--c2p$/) && s.trim().length > 0; } },
	{ id: "s_n10_mlr_filter", m: "vanne", titre: "Vanne : filtrer avec mlr, sur le nom des colonnes (mlr ... filter '$poids_kg > 30')",
	  appel: function(n, a, s){ return n === "mlr" && aCh10(a, /^filter$/) && s.trim().length > 0; } },
	{ id: "s_n10_jq_group", m: "vanne", titre: "Vanne : regrouper le JSON par espèce (jq group_by)",
	  appel: function(n, a, s){ return n === "jq" && /group_by/.test(argsTexteCh10(a)) && s.trim().length > 0; } },
	{ id: "s_n10_csvjson", m: "vanne", titre: "Vanne : un CSV en JSON d'un seul mot (csvjson)",
	  appel: function(n, a, s){ return n === "csvjson" && /^\s*[\[{]/.test(s); } },
	// L'Écluse des Scripts (Zélia)
	{ id: "s_n10_bash_n", m: "ecluse", titre: "Écluse : vérifier la syntaxe d'un script sans le lancer (bash -n)",
	  appel: function(n, a){ return n === "bash" && aCh10(a, /^-n$/); } },
	{ id: "s_n10_bash_x", m: "ecluse", titre: "Écluse : voir chaque ligne d'un script au passage (bash -x)",
	  appel: function(n, a){ return n === "bash" && aCh10(a, /^-x$/); } },
	{ id: "s_n10_parametre_requis", m: "ecluse", titre: "Écluse : un paramètre obligatoire, avec son message (\"${1:?Utilisation : ...}\" dans ecluse.sh)",
	  monde: function(){ return /\$\{1:\?[^}]+\}/.test(texteLacCh10("~/ecluses/ecluse.sh") || ""); } },
	{ id: "s_n10_mktemp_d", m: "ecluse", titre: "Écluse : un dossier temporaire au nom unique (mktemp -d)",
	  appel: function(n, a, s){ return n === "mktemp" && aCh10(a, /^-d$|^--directory$/) && /^\/tmp\//.test(s.trim()); } },
	// Le Bief des Parallèles (Miguel)
	{ id: "s_n10_split_n", m: "bief", titre: "Bief : quatre morceaux égaux, sans couper une ligne (split -n l/4)",
	  appel: function(n, a){ return n === "split" && aCh10(a, /^-n$|^-nl\/\d+$|^--number/) && /l\/\d/.test(argsTexteCh10(a)); } },
	{ id: "s_n10_pv", m: "bief", titre: "Bief : voir le flux avancer, avec sa barre (pv dans un tuyau)",
	  appel: function(n){ return n === "pv"; } },
	{ id: "s_n10_zstdcat", m: "bief", titre: "Bief : lire un morceau compressé sans le décompresser (zstdcat)",
	  appel: function(n, a, s){ return n === "zstdcat" && s.trim().length > 0; } },
	{ id: "s_n10_parallel_dry", m: "bief", titre: "Bief : demander à parallel ce qu'il ferait, sans rien faire (parallel --dry-run)",
	  appel: function(n, a, s){ return n === "parallel" && aCh10(a, /^--dry-run$|^--dryrun$/) && s.trim().length > 0; } },
	// La Tour de Garde (Badis)
	{ id: "s_n10_crontab_l", m: "tour", titre: "Tour : relire sa crontab, verrou compris (crontab -l)",
	  appel: function(n, a, s){ return n === "crontab" && aCh10(a, /^-l$/) && /flock/.test(s); } },
	{ id: "s_n10_journalctl_since", m: "tour", titre: "Tour : le journal depuis une heure précise (journalctl --since)",
	  appel: function(n, a, s){ return n === "journalctl" && aCh10(a, /^--since|^-S$/) && s.trim().length > 0; } },
	{ id: "s_n10_logrotate_f", m: "tour", titre: "Tour : forcer une rotation, avec son propre fichier d'état (logrotate -s ETAT -f CONF)",
	  appel: function(n, a){ return n === "logrotate" && aCh10(a, /^-f$|^--force$/) && aCh10(a, /^-s$|^--state/); } },
	{ id: "s_n10_date_f", m: "tour", titre: "Tour : la date du jour au format des noms de fichiers (date +%F)",
	  appel: function(n, a, s){ return n === "date" && aCh10(a, /%F|%Y-%m-%d/) && /\d{4}-\d\d-\d\d/.test(s); } },
	// La Fosse du Disque (Arnaud)
	{ id: "s_n10_ncdu", m: "fosse", titre: "Fosse : descendre dans la fosse en regardant les tailles (ncdu)",
	  appel: function(n){ return n === "ncdu"; } },
	{ id: "s_n10_du_profondeur", m: "fosse", titre: "Fosse : un seul niveau de dossiers, en lisible (du -h --max-depth=1)",
	  appel: function(n, a, s){ return n === "du" && aCh10(a, /^--max-depth|^-d$|^-d\d/) && s.trim().length > 0; } },
	{ id: "s_n10_find_size", m: "fosse", titre: "Fosse : les fichiers de plus d'un gigaoctet (find -size +1G)",
	  appel: function(n, a, s){ return n === "find" && aCh10(a, /^-size$/) && s.trim().length > 0; } },
	{ id: "s_n10_truncate", m: "fosse", titre: "Fosse : vider un fichier sans l'effacer (truncate -s 0)",
	  appel: function(n, a){ return n === "truncate" && aCh10(a, /^-s$|^-s0$|^--size/); } },
	// La Chambre des Pressions (Julien)
	{ id: "s_n10_taskset_p", m: "chambre", titre: "Chambre : sur quels cœurs tourne un processus (taskset -cp PID)",
	  appel: function(n, a, s){ return n === "taskset" && /affinity/.test(s); } },
	{ id: "s_n10_ionice_p", m: "chambre", titre: "Chambre : la classe d'entrées-sorties d'un processus (ionice -p PID)",
	  appel: function(n, a, s){ return n === "ionice" && aCh10(a, /^-p$/) && /idle|best-effort|realtime|none/.test(s); } },
	{ id: "s_n10_nice_19", m: "chambre", titre: "Chambre : lancer une commande la plus gentille possible (nice -n 19)",
	  appel: function(n, a){ return n === "nice" && aCh10(a, /^-n$|^-19$|^-n19$/) && /19/.test(argsTexteCh10(a)); } },
	{ id: "s_n10_uptime", m: "chambre", titre: "Chambre : la charge sur 1, 5 et 15 minutes (uptime)",
	  appel: function(n, a, s){ return n === "uptime" && /load average/.test(s); } },
	// Le Coffre des Secrets (Megane)
	{ id: "s_n10_pseudonyme", m: "coffre", titre: "Coffre : un pseudonyme qui ne se défait pas (echo -n ADRESSE | sha256sum)",
	  appel: function(n, a, s){ return n === "sha256sum" && !a.filter(function(x){ return x.charAt(0) !== "-"; }).length && /^[0-9a-f]{64}\s+-$/m.test(s); } },
	{ id: "s_n10_getfacl", m: "coffre", titre: "Coffre : relire le droit donné aux analystes (getfacl)",
	  appel: function(n, a, s){ return n === "getfacl" && /group:analystes:r/.test(s); } },
	{ id: "s_n10_umask", m: "coffre", titre: "Coffre : lire le masque des droits par défaut (umask)",
	  appel: function(n, a, s){ return n === "umask" && /^\d{3,4}$|u=/.test(s.trim()); } },
	{ id: "s_n10_shred_z", m: "coffre", titre: "Coffre : écraser trois fois, puis de zéros, avant d'effacer (shred -z -u)",
	  appel: function(n, a){ return n === "shred" && aCh10(a, /^-[a-z]*z/) && aCh10(a, /^-[a-z]*u/); } },
	// Le Chantier des Images (Elias)
	{ id: "s_n10_hadolint", m: "chantier", titre: "Chantier : faire relire un Dockerfile (hadolint Dockerfile)",
	  appel: function(n){ return n === "hadolint"; } },
	{ id: "s_n10_history", m: "chantier", titre: "Chantier : les couches d'une image, une par instruction (docker history)",
	  appel: function(n, a, s){ var x = sousDockerCh10(a); return n === "docker" && (x[0] === "history" || (x[0] === "image" && x[1] === "history")) && /CREATED BY|CREATED/.test(s); } },
	{ id: "s_n10_images_format", m: "chantier", titre: "Chantier : la liste des images, à ta façon (docker image ls --format)",
	  appel: function(n, a, s){ var x = sousDockerCh10(a); return n === "docker" && (x[0] === "images" || (x[0] === "image" && /^(ls|list)$/.test(x[1]))) && /--format/.test(argsTexteCh10(a)) && s.trim().length > 0; } },
	{ id: "s_n10_build_no_cache", m: "chantier", titre: "Chantier : reconstruire sans le cache, pour être sûr (docker build --no-cache)",
	  appel: function(n, a){ var x = sousDockerCh10(a); return n === "docker" && (x[0] === "build" || (x[0] === "image" && x[1] === "build") || (x[0] === "buildx" && x[1] === "build")) && aCh10(a, /^--no-cache$/); } },
	// La Citerne (Remi)
	{ id: "s_n10_volume_inspect", m: "citerne", titre: "Citerne : où dort vraiment un volume (docker volume inspect)",
	  appel: function(n, a, s){ var x = sousDockerCh10(a); return n === "docker" && x[0] === "volume" && x[1] === "inspect" && /Mountpoint/.test(s); } },
	{ id: "s_n10_psql_dt", m: "citerne", titre: "Citerne : les tables de la base (psql -c '\\dt')",
	  appel: function(n, a, s){ return n === "docker" && /\\dt/.test(argsTexteCh10(a)) && /captures/.test(s); } },
	{ id: "s_n10_pg_isready", m: "citerne", titre: "Citerne : demander à la base si elle accepte les connexions (pg_isready)",
	  appel: function(n, a, s){ return n === "docker" && /pg_isready/.test(argsTexteCh10(a)) && /accepting connections/.test(s); } },
	{ id: "s_n10_cron_dump", m: "citerne", titre: "Citerne : une sauvegarde chaque nuit, planifiée (une ligne de crontab avec pg_dump)",
	  monde: function(){ return cronSauvegardeCh10(); } },
	// Le Grand Bassin (Eden)
	{ id: "s_n10_compose_config", m: "bassin", titre: "Bassin : la pile telle que compose la comprend (docker compose config)",
	  appel: function(n, a, s){ var x = sousDockerCh10(a); return n === "docker" && x[0] === "compose" && x.indexOf("config") > -1 && /services:/.test(s); } },
	{ id: "s_n10_compose_logs", m: "bassin", titre: "Bassin : le journal d'un seul service (docker compose logs SERVICE)",
	  appel: function(n, a, s){ var x = sousDockerCh10(a); var i = x.indexOf("logs"); return n === "docker" && x[0] === "compose" && i > -1 && x.slice(i + 1).some(function(y){ return y.charAt(0) !== "-"; }) && s.trim().length > 0; } },
	{ id: "s_n10_yq", m: "bassin", titre: "Bassin : lire un compose.yaml comme une donnée (yq '.services | keys')",
	  appel: function(n, a, s){ return n === "yq" && /services/.test(argsTexteCh10(a)) && s.trim().length > 0; } },
	{ id: "s_n10_compose_down", m: "bassin", titre: "Bassin : arrêter la pile sans perdre ses volumes (docker compose down, sans -v)",
	  appel: function(n, a){ var x = sousDockerCh10(a); return n === "docker" && x[0] === "compose" && x.indexOf("down") > -1 && !aCh10(a, /^-v$|^--volumes$/); } },
	// Les défis d'honneur de Wissam
	{ id: "s_n10_sans_indice", m: "honneur", titre: "Honneur : repousser la Marée sans acheter un seul indice" },
	{ id: "s_n10_pecheur_j1", m: "honneur", titre: "Honneur : Pêcheur de données avant la première nuit (avant J1 22:00)" },
	{ id: "s_n10_sondeur_j2", m: "honneur", titre: "Honneur : Sondeur des Abysses avant la fin du deuxième jour (avant J2 22:00)" },
	{ id: "s_n10_avant_maree", m: "honneur", titre: "Honneur : la Marée repoussée avant l'aube du quatrième jour" },
	{ id: "s_n10_rien_jete", m: "honneur", titre: "Honneur : finir sans avoir effacé un seul vieux journal du lac (compressés, tous)",
	  monde: function(){ return state.has("victoireCh10") && vieuxJournauxGardesCh10(); } }
];
DEFIS_CH10.forEach(function(d){ QUETES_SECONDAIRES_CH10.push({ id: d.id, titre: d.titre }); });
function defisPosteCh10(cle){ return DEFIS_CH10.filter(function(d){ return d.m === cle; }); }
function idsDefisPosteCh10(cle){ return defisPosteCh10(cle).map(function(d){ return d.id; }); }
function listeDefisPosteCh10(cle){ return defisPosteCh10(cle).map(function(d){ return "  " + (aFait(d.id) ? C.vert("[x]") : "[ ]") + " " + d.titre.replace(/^[^:]+ : /, ""); }).join("\n"); }
function reussirDefiCh10(id){
	if (!lacActif() || state.quests[id]) return;
	state.complete(id);
}
var APPELER_AVANT_DEFIS_CH10 = Shell.appeler;
function essayerDefisCh10(nom, args, s, io){
	if (!lacActif()) return;
	if (/^(fatal|error|usage|erreur):/im.test(sansAnsi(String(s || "")))) return;
	try { DEFIS_CH10.forEach(function(d){ if (d.appel && !state.quests[d.id] && d.appel(nom, args || [], s, io || {})) reussirDefiCh10(d.id); }); } catch (e){}
}
Shell.appeler = function(nom, args, io){
	var sortie;
	try { sortie = APPELER_AVANT_DEFIS_CH10.apply(this, arguments); }
	catch (err){ throw err; }
	if (!(io && io.code)) essayerDefisCh10(nom, args, typeof sortie === "string" ? sansAnsi(sortie) : "", io);
	return sortie;
};
(function(){
	var types = {};
	DEFIS_CH10.forEach(function(d){ if (d.evenement) (types[d.evenement] = types[d.evenement] || []).push(d); });
	Object.keys(types).forEach(function(type){
		GameEvents.addListener(type, function(e){
			if (!lacActif()) return;
			types[type].forEach(function(d){ try { if (!state.quests[d.id] && d.quand(e)) reussirDefiCh10(d.id); } catch (x){} });
		});
	});
})();

/* ------------------------------------------------------------------ */
/* Les quinze gardiens du lac, vivants                                  */
/* ------------------------------------------------------------------ */

var NOMS_RANGS_PLURIEL_CH10 = ["Riverains", "Pêcheurs de données", "Plongeurs", "Éclusiers", "Sondeurs des Abysses", "Maîtres du Lac"];
function rangRequisCh10(p){ return Math.max(0, p.acte - 1); }
function texteMaitreCh10(g){
	var p = posteCh10Par(g.p);
	var defis = "\n\n" + C.gras("Les défis " + (/^[AEIOUHaeiouhÉÉ]/.test(g.nom) ? "d'" : "de ") + g.nom) + C.gris(" (des quêtes secondaires)") + "\n" + listeDefisPosteCh10(g.p);
	var rappel = rappelWissamCh10(), mot = rappel ? "\n\n" + C.jaune(g.nom + " lève les yeux de son ouvrage. « " + rappel + " »") : "";
	g.item.teaches = rangCh10() < rangRequisCh10(p) ? [] : sortsDuMaitreCh10(g);
	if (rangCh10() < rangRequisCh10(p)) return g.entree() + "\n\n" + C.jaune(g.nom + " regarde la goutte de verre à ta veste. « Ce poste s'ouvre aux " + NOMS_RANGS_PLURIEL_CH10[rangRequisCh10(p)] + ". Tu es " + nomRangCh10() + ". " +
		"Reviens avec ton insigne : insignes te dira ce qu'il te manque. »") + mot;
	var faites = p.etapes.filter(aFait).length;
	if (faites === p.etapes.length) return g.fin() + defis;
	var erreur = null;
	try { erreur = g.erreur ? g.erreur() : null; } catch (x){ erreur = null; }
	var etapes = "\n\n" + C.gras("Ton poste") + "\n" + p.etapes.map(function(id){ var x = QUETES_CH10.filter(function(y){ return y.id === id; })[0]; return "  " + (aFait(id) ? C.vert("[x]") : "[ ]") + " " + x.titre.replace(/^[^:]+ : /, ""); }).join("\n");
	var corps = faites ? g.suite() + "\n\n" + g.syntaxe() : g.entree() + "\n\n" + g.image() + "\n\n" + g.syntaxe() + "\n\n" + g.mission();
	return corps + etapes + (erreur ? "\n\n" + C.jaune(erreur) : "") + mot + "\n\n" + C.gris(g.metier) + defis;
}
function sortsTexteCh10(cle){ var l = (SORTS_DES_POSTES_CH10[cle] || []).filter(function(x){ return typeof MANUEL !== "undefined" && !!MANUEL[x]; }); return l.length ? "Je t'enseigne " + l.join(", ") + "." : ""; }

var MAITRES_CH10 = {
	greve: { nom: "Lamia", p: "greve",
		metier: "Le métier : un data engineer ne lance jamais un script sur un fichier qu'il n'a pas regardé. Taille, encodage, séparateur, premières lignes : trente secondes qui évitent des heures de débogage.",
		entree: function(){ return "Une femme marche pieds nus sur les galets, ramassant des fichiers échoués qu'elle retourne un à un dans la lumière. « Lamia. Je tiens la Grève. Tout ce que le lac rejette arrive ici, et rien ne repart sans que je l'aie regardé. »"; },
		image: function(){ return "« Un fichier de données, c'est une prise sur la grève. Avant de la peser, on la regarde. Quatre regards, toujours dans le même ordre : sa nature (file : du texte ? quelle encre ?), " +
			"sa tête (head : les colonnes, le séparateur), sa taille (wc -l : combien de lignes), et ses colonnes alignées (column -t, ou csvlook, qui en fait un vrai tableau).\n\n" +
			"Et quand l'écran ment, on descend aux octets : od -c montre chaque caractère, même ceux qu'on ne voit pas. Une tabulation y devient \\t, une fin de ligne \\n. »"; },
		syntaxe: function(){ return "« Les sorts de ma grève (sur lac, dans ~/rive) :\n\n" +
			"  file captures.csv                         sa nature, son encodage\n" +
			"  head captures.csv ; head -n 3 FICHIER     les premières lignes\n" +
			"  wc -l captures.csv                        le nombre de lignes (en-tête compris)\n" +
			"  column -s, -t < captures.csv | head       les colonnes alignées\n" +
			"  csvlook captures.csv | head               un vrai tableau, avec ses bords\n" +
			"  od -c FICHIER | head                      chaque octet, les invisibles compris\n" +
			"  tr '\\t' ',' < A > B                       changer un caractère en un autre\n\n" +
			sortsTexteCh10("greve") + " »"; },
		mission: function(){ return "« Ta mission : sur lac, regarde ~/rive/captures.csv de mes quatre regards. Puis ~/rive/mystere.txt : il a l'air d'un CSV, mais ce n'en est pas un. Trouve ce qui le sépare, et fais-en mystere.csv, avec des virgules. »"; },
		suite: function(){ return "Lamia retourne un galet. « Tu regardes. Bien. Maintenant, mystere.txt : od -c, et dis-moi ce qui sépare ses colonnes. »"; },
		erreur: function(){
			var t = texteLacCh10("~/rive/mystere.csv");
			if (t !== null && /\t/.test(t)) return "Lamia secoue la tête. « mystere.csv a encore des tabulations. tr '\\t' ',' les change toutes. »";
			if (t !== null && !mystereOkCh10()) return "Lamia compare les deux fichiers. « Il manque des lignes, ou il en a en trop. tr ne fait que changer des caractères : tr '\\t' ',' < mystere.txt > mystere.csv, rien d'autre. »";
			return null;
		},
		fin: function(){ return "Lamia te tend un galet poli, percé d'un trou. « Tu regardes avant de toucher.\n\n" +
			"Une équipe a passé trois jours sur un rapport de ventes faux de quarante pour cent. Le fichier venait d'un tableur réglé en français : le séparateur était un point-virgule, et les décimales des virgules. " +
			"Leur script coupait aux virgules. Un head, et ils l'auraient vu en dix secondes. »"; } },
	banc: { nom: "Younes", p: "banc",
		metier: "Le métier : cut | sort | uniq -c | sort -rn est le tableau de fréquences le plus rapide du monde. On le tape avant d'ouvrir le moindre notebook.",
		entree: function(){ return "Un homme trie des prises sur un étal de pierre, à une vitesse folle, sans jamais regarder ses mains. « Younes. Le Banc de Tri. Ici, on ne devine pas : on compte. »"; },
		image: function(){ return "« Regarde mes étals. Pour savoir quel comptoir pêche le plus, je ne lis pas les lignes une à une : je garde une seule colonne (cut), je range les prises identiques côte à côte (sort), " +
			"je compte les piles (uniq -c), et je mets les plus hautes en premier (sort -rn). Quatre gestes, un tuyau.\n\n" +
			"Et pour filtrer, awk : il coupe chaque ligne aux virgules, $4 est la quatrième colonne, $6 la sixième. Une condition, et seules les bonnes lignes passent. Attention à l'en-tête : il n'est pas une prise. »"; },
		syntaxe: function(){ return "« Les sorts de mon banc :\n\n" +
			"  cut -d, -f4 captures.csv                    une seule colonne (la quatrième)\n" +
			"  tail -n +2 FICHIER                          tout sauf l'en-tête\n" +
			"  sort | uniq -c | sort -rn | head -3         compter, puis le podium\n" +
			"  awk -F, '$6 > 30' captures.csv              les lignes dont la 6e colonne dépasse 30\n" +
			"  awk -F, '$4 == \"Port-Aube\" && $6 > 30'      deux conditions à la fois\n" +
			"  sort -t, -k6,6nr captures.csv | head        trier sur une colonne, en nombre, à rebours\n\n" +
			sortsTexteCh10("banc") + " »"; },
		mission: function(){ var A = attendusCh10(); return "« Ta mission : dans ~/rive/REPONSES.md, réponds aux questions 1 et 2. Quel comptoir a le plus de captures ? Et combien de lots de plus de 30 kg à " + A.comptoirQ2 + " ? Compte, ne devine pas. »"; },
		suite: function(){ return "Younes ne lève pas les yeux. « Une réponse juste. L'autre, maintenant : awk, et une condition sur le comptoir et sur le poids. »"; },
		erreur: function(){
			var r = reponsesLacCh10("~/rive/REPONSES.md");
			if (r["1"] && !reponseRiveOkCh10(1)) return "Younes pose le doigt sur ta réponse 1. « Ce n'est pas le premier de la pile. As-tu bien retiré l'en-tête (tail -n +2), et trié avant uniq -c ? »";
			if (r["2"] && !reponseRiveOkCh10(2)) return "Younes fronce les sourcils. « Ta réponse 2 est fausse. Strictement plus de 30, et le bon comptoir : awk -F, '$4 == \"...\" && $6 > 30' captures.csv | wc -l. »";
			return null;
		},
		fin: function(){ return "Younes te lance une étiquette de bois gravée. « Tu sais compter.\n\n" +
			"Un jour, un tableau de bord a annoncé que la meilleure agence d'une banque était « agence ». C'était l'en-tête du fichier, compté comme une ligne, et trié en premier. " +
			"Un tail -n +2 aurait suffi. Ça arrive aux meilleurs, une fois. »"; } },
	comptoir: { nom: "Syrine", p: "comptoir",
		metier: "Le métier : la moyenne ment dès qu'une valeur est extrême ; la médiane, non. Un bon analyste regarde les deux, et se méfie quand elles s'écartent.",
		entree: function(){ return "Une femme règle une balance de cuivre au milligramme près, une loupe vissée à l'œil. « Syrine. Le Comptoir des Mesures. Un chiffre faux ici, et toute l'école se trompe. »"; },
		image: function(){ return "« Peser, c'est additionner. awk garde une somme qui grossit ligne après ligne, et l'affiche à la fin, dans son bloc END. Avec un tableau, il garde une somme par groupe : kg[$5] += $6.\n\n" +
			"Mais une moyenne se laisse tromper : un seul lot de quarante kilos, et toute l'espèce paraît plus lourde. La médiane, c'est la valeur du milieu, quand tout est rangé : elle ne bouge pas pour un seul monstre. " +
			"csvstat la calcule d'un mot, colonne par colonne ; datamash la calcule groupe par groupe (il veut des lignes triées par groupe : -s). »"; },
		syntaxe: function(){ return "« Les sorts de mon comptoir :\n\n" +
			"  awk -F, '$5 == \"brochet\" { s += $6 } END { print s }' captures.csv      une somme\n" +
			"  awk -F, 'NR > 1 { kg[$5] += $6 } END { for (e in kg) print e, kg[e] }'   une somme par espèce\n" +
			"  csvstat -c prix_kg captures.csv                                       tout sur une colonne\n" +
			"  csvgrep -c espece -m anguille captures.csv | csvstat -c prix_kg --median\n" +
			"  datamash -t, -H -s -g espece median prix_kg mean poids_kg < captures.csv\n\n" +
			sortsTexteCh10("comptoir") + " »"; },
		mission: function(){ var A = attendusCh10(); return "« Ta mission : les questions 3, 4 et 5 de ~/rive/REPONSES.md. Le poids total de " + A.especeQ3 + " (au kilo près), le prix médian au kilo de " + A.especeQ4 + ", et l'espèce au poids moyen par lot le plus élevé. »"; },
		suite: function(){ return "Syrine note un chiffre dans son registre. « Juste. Maintenant, la médiane et les moyennes : csvstat, ou datamash. »"; },
		erreur: function(){
			var r = reponsesLacCh10("~/rive/REPONSES.md");
			if (r["4"] && !reponseRiveOkCh10(4)) return "Syrine tapote ta réponse 4. « Ce n'est pas la médiane. As-tu gardé seulement les lignes de cette espèce ? La médiane de toutes les espèces ne dit rien. »";
			if (r["3"] && !reponseRiveOkCh10(3)) return "Syrine secoue la tête. « La question 3 : la somme de la 6e colonne, seulement pour cette espèce. Attention à l'orthographe exacte, accents compris. »";
			return null;
		},
		fin: function(){ return "Syrine dévisse sa loupe et te la tend. « Tu pèses juste.\n\n" +
			"Dans une entreprise, on a annoncé une hausse des salaires « moyens » de dix pour cent. La médiane, elle, n'avait pas bougé : trois dirigeants avaient doublé leur paie. " +
			"Le chiffre était vrai, et il mentait. »"; } },
	gue: { nom: "Noam", p: "gue",
		metier: "Le métier : l'encodage se corrige une seule fois, à l'entrée du pipeline. Tout ce qui sort du lac est en UTF-8, sans BOM, avec des fins de ligne Unix.",
		entree: function(){ return "Un homme se tient au milieu du gué, de l'eau jusqu'aux genoux, et regarde trois rivières d'encre se mêler autour de lui. « Noam. Le Gué des Encres. Chaque rivière apporte sa manière d'écrire. Mon travail : qu'elles parlent toutes la même. »"; },
		image: function(){ return "« Une lettre, sur le disque, ce sont des octets. Mais pas les mêmes selon l'encre : « é » s'écrit avec un seul octet en latin1 (ISO-8859-1), et avec deux en UTF-8. " +
			"Lu dans la mauvaise encre, il devient un losange, ou deux lettres bizarres. iconv traduit d'une encre à l'autre : -f d'où l'on part, -t où l'on va.\n\n" +
			"Et il y a deux pièges invisibles. Les fins de ligne Windows : \\r\\n au lieu de \\n (CRLF) ; dos2unix les retire. Et le BOM : trois octets, 357 273 277 dans od -c, qu'un tableur glisse en tête du fichier. " +
			"Invisibles à l'écran, ils collent à la première colonne : ton en-tête ne s'appelle plus « id », mais « \\ufeffid ». »"; },
		syntaxe: function(){ return "« Les sorts de mon gué (dans ~/courants) :\n\n" +
			"  file -i FICHIER                                l'encre (charset)\n" +
			"  iconv -f ISO-8859-1 -t UTF-8 A > B             traduire\n" +
			"  od -c FICHIER | head -2                        voir \\r, \\n et le BOM\n" +
			"  dos2unix -n A B                                retirer les CRLF (dans un nouveau fichier)\n" +
			"  sed -i '1s/^\\xEF\\xBB\\xBF//' FICHIER           retirer le BOM de la première ligne\n" +
			"  { head -n 1 A; tail -n +2 A; tail -n +2 B; } > C    deux fichiers, un seul en-tête\n\n" +
			sortsTexteCh10("gue") + " »"; },
		mission: function(){ return "« Ta mission : arrivee-nord.csv est en latin1, fais-en nord.csv, en UTF-8. arrivee-sud.csv a des CRLF et un BOM : fais-en sud.csv, propre. Puis une seule arrivée, arrivees.csv : l'en-tête une fois, les lignes du nord et du sud. »"; },
		suite: function(){ return "Noam sort de l'eau. « Le nord parle notre encre. Le sud, maintenant : od -c, et regarde les trois premiers octets. »"; },
		erreur: function(){
			var n = noeudLacCh10("~/courants/nord.csv");
			if (n && n.encodage) return "Noam goûte l'eau de nord.csv. « Encore du latin1. Une copie ne traduit rien : iconv -f ISO-8859-1 -t UTF-8. »";
			var t = texteLacCh10("~/courants/arrivees.csv");
			if (t !== null && /\r/.test(t)) return "Noam montre la fin d'une ligne. « Des \\r traînent encore dans arrivees.csv. dos2unix, ou tr -d '\\r'. »";
			if (t !== null && t.indexOf("﻿") > -1) return "Noam pointe le début du fichier. « Le BOM est toujours là, collé à l'en-tête. od -c te le montre ; sed le retire. »";
			return null;
		},
		fin: function(){ return "Noam te donne une fiole d'encre claire. « Tes fichiers parlent tous la même langue.\n\n" +
			"Une mutuelle a envoyé dix mille courriers à « Fran?ois », « H?l?ne » et « J?r?me ». Un export en latin1, relu comme de l'UTF-8, puis réenregistré. " +
			"Personne n'avait regardé file -i. Le courrier d'excuse a coûté plus cher que le premier. »"; } },
	moulin: { nom: "Maeva", p: "moulin",
		metier: "Le métier : un pipeline doit être idempotent. Rejouer le même fichier deux fois ne doit jamais doubler les chiffres : on dédoublonne, et on ne traite que ce qui est nouveau.",
		entree: function(){ return "Une femme surveille une grande roue à aubes, la main sur un levier. À chaque tour, la roue sépare deux prises identiques et en rejette une. « Maeva. Le Moulin des Doublons. Le lac renvoie souvent la même prise deux fois. Ici, on ne la compte qu'une. »"; },
		image: function(){ return "« Un doublon, c'est un reflet : une ligne identique à une autre, au caractère près. sort -u les fond en une seule. uniq -d montre seulement ceux qui avaient un reflet (après un sort). " +
			"Mais attention : sort range aussi l'en-tête au milieu des prises ! On le met de côté avec head -n 1, et on trie le reste.\n\n" +
			"Et pour savoir ce qui est arrivé depuis hier, comm compare deux fichiers triés en trois colonnes : seulement dans le premier, seulement dans le second, dans les deux. comm -13 garde la deuxième : le nouveau. »"; },
		syntaxe: function(){ return "« Les sorts de mon moulin :\n\n" +
			"  tail -n +2 brutes.csv | sort | uniq -d | wc -l       combien de prises ont un reflet\n" +
			"  { head -n 1 A; tail -n +2 A | sort -u; } > B          dédoublonner, l'en-tête en tête\n" +
			"  tail -n +2 hier.csv | sort > hier.tri                 comm veut des fichiers triés\n" +
			"  comm -13 hier.tri auj.tri                             ce qui n'est que dans le second\n" +
			"  join -t, -1 4 -2 1 A B                                réunir deux fichiers sur une colonne\n\n" +
			sortsTexteCh10("moulin") + " »"; },
		mission: function(){ return "« Ta mission, dans ~/courants : brutes.csv, sans reflets, dans uniques.csv (l'en-tête en tête). Puis nouvelles.csv : seulement les captures d'aujourd'hui qui n'étaient pas là hier, avec l'en-tête. »"; },
		suite: function(){ return "Maeva relâche son levier. « Plus de reflets. Maintenant, hier et aujourd'hui : comm, sur des fichiers triés. »"; },
		erreur: function(){
			var t = texteLacCh10("~/courants/uniques.csv");
			if (t !== null && lignesTexteCh10(t)[0] !== ENTETE_CAPTURES_CH10) return "Maeva arrête la roue. « Ton en-tête n'est plus en tête : sort l'a rangé avec le reste. Mets-le de côté avec head -n 1. »";
			var n = texteLacCh10("~/courants/nouvelles.csv");
			if (n !== null && !nouvellesOkCh10()) return "Maeva compte tes nouvelles. « Ce n'est pas le compte. comm veut les deux fichiers triés de la même façon, sans leur en-tête ; et -13 garde ce qui n'est que dans le second. »";
			return null;
		},
		fin: function(){ return "Maeva te laisse tourner la roue une fois. « Chaque prise, une fois.\n\n" +
			"Une plateforme a facturé deux fois quarante mille clients, un soir : le fichier de paiements avait été rejoué après une panne, et personne n'avait dédoublonné. " +
			"Depuis, leur ingestion refuse tout identifiant déjà vu. »"; } },
	vanne: { nom: "Kamal", p: "vanne",
		metier: "Le métier : on ne jette jamais une ligne malformée. Elle part en quarantaine, avec sa raison, pour que le fournisseur corrige à la source.",
		entree: function(){ return "Un homme fait jouer une grande vanne de fer, et l'eau passe à travers une grille si fine que rien de travers ne la traverse. « Kamal. La Vanne des Formats. Ce qui est bien formé passe. Le reste, je le garde à côté. Jamais à la poubelle. »"; },
		image: function(){ return "« Une ligne bien formée a juste ce qu'il faut de champs (awk le dit : NF), un poids qui est un nombre, une date au bon format. Une maille déchirée, c'est une virgule de trop, " +
			"un champ manquant, « douze » au lieu de 12, une date à la française. Ma grille, c'est une condition awk ; ce qui ne passe pas va dans rejets.csv, et rien ne se perd.\n\n" +
			"Et le reste de l'école parle JSON. mlr traduit un CSV en JSON (--icsv --ojson) ; jq interroge le JSON : select garde ce qui répond, length compte. »"; },
		syntaxe: function(){ return "« Les sorts de ma vanne :\n\n" +
			"  awk -F, 'NR > 1 && NF != 8' vanne.csv                       les lignes au mauvais nombre de champs\n" +
			"  awk -F, '$6 !~ /^[0-9]+(\\.[0-9]+)?$/'                       un poids qui n'est pas un nombre\n" +
			"  awk -F, '$2 ~ /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/'                une date AAAA-MM-JJ\n" +
			"  mlr --icsv --ojson cat valides.csv > captures.json\n" +
			"  jq '[.[] | select(.espece == \"sandre\")] | length' captures.json\n" +
			"  mlr --icsv --opprint head -n 5 valides.csv                  un tableau lisible\n\n" +
			sortsTexteCh10("vanne") + " »"; },
		mission: function(){ return "« Ta mission, dans ~/courants : vanne.csv en deux fichiers. valides.csv (l'en-tête, puis les lignes à 8 champs, au poids nombre, à la date AAAA-MM-JJ), et rejets.csv (tout le reste). Puis captures.json, depuis valides.csv, et la question 6 de REPONSES.md. »"; },
		suite: function(){ return "Kamal referme la grille. « La vanne tient. Maintenant, le JSON : mlr, puis jq. »"; },
		erreur: function(){
			var v = texteLacCh10("~/courants/valides.csv"), r = texteLacCh10("~/courants/rejets.csv");
			if (v !== null && r !== null && !vanneOkCh10()){
				var A = arrivagesCh10(), lv = lignesTexteCh10(v).length - 1, lr = lignesTexteCh10(r).filter(function(x){ return x !== ENTETE_CAPTURES_CH10; }).length;
				if (lv + lr !== A.vanne.length) return "Kamal compte. « valides plus rejets : " + (lv + lr) + " lignes. vanne.csv en a " + A.vanne.length + " (sans l'en-tête). Il en manque, ou il y en a deux fois. »";
				return "Kamal montre une ligne. « Une maille déchirée est passée, ou une bonne a été rejetée. 8 champs, un poids nombre, une date AAAA-MM-JJ : les trois à la fois. »";
			}
			return null;
		},
		fin: function(){ return "Kamal te passe une petite grille de fer, à porter au cou. « Rien de travers ne passe. Rien ne se perd.\n\n" +
			"Un hôpital a perdu six mois de mesures : son script supprimait les lignes « invalides ». Un appareil avait changé de format de date. " +
			"Toutes ses mesures étaient devenues « invalides », et silencieusement effacées. Une quarantaine les aurait gardées. »"; } },
	ecluse: { nom: "Zélia", p: "ecluse",
		metier: "Le métier : set -euo pipefail en tête de chaque script de production, des guillemets autour de chaque variable, et des fichiers temporaires faits par mktemp. Le minimum.",
		entree: function(){ return "Une femme ferme une porte d'écluse d'un seul coup d'épaule, et l'eau s'arrête net. « Zélia. L'Écluse des Scripts. Un script de données, c'est une écluse : s'il casse, il doit se fermer. Jamais laisser passer l'eau en disant que tout va bien. »"; },
		image: function(){ return "« Par défaut, bash continue après une erreur : la commande d'après tourne sur un fichier vide, et le script finit en disant « OK ». C'est le pire des menteurs. " +
			"set -e ferme l'écluse à la première erreur. set -u la ferme si une variable n'existe pas. set -o pipefail la ferme si une commande au milieu d'un tuyau échoue (sinon, seule la dernière compte). Ensemble : set -euo pipefail.\n\n" +
			"Et deux pièges : un nom de fichier avec un espace se coupe en deux si on oublie les guillemets (\"$1\", pas $1). Et un fichier temporaire au nom fixe, c'est deux écluses qui écrivent au même endroit : mktemp donne un nom unique, et trap ... EXIT le range quand le script se termine, réussi ou pas. »"; },
		syntaxe: function(){ return "« Les sorts de mon écluse (dans ~/ecluses) :\n\n" +
			"  #!/bin/bash\n  set -euo pipefail                  en tête, toujours\n" +
			"  fichier=\"${1:?Utilisation : ./ecluse.sh FICHIER}\"\n" +
			"  tmp=$(mktemp)                      un fichier temporaire au nom unique\n" +
			"  trap 'rm -f \"$tmp\"' EXIT          le ranger à la sortie, quoi qu'il arrive\n" +
			"  tail -n +2 \"$fichier\"               des guillemets autour de chaque variable\n" +
			"  ./ecluse.sh donnees/absente.csv ; echo $?      un échec doit dire un code non nul\n" +
			"  bash -n ecluse.sh ; bash -x ecluse.sh ...      relire sans lancer ; voir chaque ligne\n\n" +
			sortsTexteCh10("ecluse") + " »"; },
		mission: function(){ return "« Ta mission : ~/ecluses/ecluse.sh ment. Lance-le sur donnees/absente.csv, puis sur \"donnees/arrivee du soir.csv\" (avec ses espaces), et regarde ce qu'il dit. Puis rends-le sûr : set -euo pipefail, des guillemets, mktemp et un trap. Il doit échouer sur l'absent, et réussir sur l'arrivée du soir. »"; },
		suite: function(){ return "Zélia pose la main sur la porte. « Elle se ferme quand ça casse. Maintenant, le fichier temporaire : mktemp, et un trap pour le ranger. »"; },
		erreur: function(){
			var t = texteLacCh10("~/ecluses/ecluse.sh") || "";
			if (/set -euo/.test(t) && !vuCh10("ecluseEchoue")) return "Zélia croise les bras. « Ton écluse a ses sûretés. Prouve-le : ./ecluse.sh donnees/absente.csv doit échouer (echo $? : pas 0). »";
			if (ecluseSureCh10(t) && vuCh10("ecluseEchoue") && !vuCh10("ecluseOk")) return "Zélia écoute l'eau. « Elle se ferme sur l'absent, c'est bien. Mais l'arrivée du soir doit passer : des guillemets autour de $1 et de $fichier, et lance-la entre guillemets. »";
			return null;
		},
		fin: function(){ return "Zélia te confie une petite clé de laiton. « Ton écluse ne ment plus.\n\n" +
			"Une équipe a publié pendant un mois un tableau de bord vide, chaque matin, en vert. Le téléchargement de la nuit échouait, le script continuait, et un fichier vide passait dans la suite. " +
			"Trois mots en tête du script, set -euo pipefail, et le premier échec aurait sonné l'alarme. »"; } },
	bief: { nom: "Miguel", p: "bief",
		metier: "Le métier : découper un gros fichier, c'est pouvoir le traiter en parallèle, reprendre au morceau qui a échoué, et l'envoyer en plusieurs fois.",
		entree: function(){ return "Un homme saute d'un canal à l'autre, six canaux parallèles, en poussant chaque fois une barque. « Miguel. Le Bief des Parallèles. Un seul canal, c'est lent. Six, c'est six fois plus d'eau. »"; },
		image: function(){ return "« Un gros fichier, c'est un canal engorgé. split le coupe en morceaux de N lignes (-l), et --additional-suffix leur donne leur extension. " +
			"L'en-tête, on le retire avant (tail -n +2), sinon il ne serait que dans le premier morceau.\n\n" +
			"Ensuite, les barques partent ensemble : xargs -P 4 lance quatre commandes à la fois, et -n 1 donne un fichier à chacune. parallel fait la même chose, avec ses ::: . " +
			"zstd compresse vite et bien ; --rm retire l'original une fois le morceau compressé. Et pv, glissé dans un tuyau, montre le flux qui avance. »"; },
		syntaxe: function(){ return "« Les sorts de mon bief (dans ~/bief) :\n\n" +
			"  tail -n +2 sondes.csv | split -l 500 - morceaux/sondes_ --additional-suffix=.csv\n" +
			"  wc -l morceaux/*                                 chaque morceau, et le total\n" +
			"  ls morceaux/*.csv | xargs -P 4 -n 1 zstd -q --rm\n" +
			"  parallel zstd -q --rm ::: morceaux/*.csv         la même chose, avec parallel\n" +
			"  zstdcat morceaux/sondes_aa.csv.zst | head        lire sans décompresser\n" +
			"  pv sondes.csv | wc -l                            voir le flux avancer\n\n" +
			sortsTexteCh10("bief") + " »"; },
		mission: function(){ return "« Ta mission : ~/bief/sondes.csv, en morceaux de 500 lignes au plus, dans ~/bief/morceaux/, sans l'en-tête et sans perdre une ligne. Puis compresse tous les morceaux en parallèle, avec zstd, et qu'il ne reste que les .zst. »"; },
		suite: function(){ return "Miguel amarre une barque. « Tes morceaux sont prêts. Maintenant, tous à la fois : xargs -P, ou parallel. »"; },
		erreur: function(){
			var m = morceauxCh10();
			if (m && m.some(function(x){ return /^sonde,horodatage/m.test(x.texte); })) return "Miguel lève un morceau. « L'en-tête est dans un de tes morceaux. Retire-le avant de couper : tail -n +2. »";
			if (m && m.length && !decouperOkCh10()) return "Miguel compte les lignes. « Il en manque, ou un morceau dépasse 500. split -l 500 sur tail -n +2 sondes.csv, et rien d'autre dans le dossier. regenerer bief si tu veux repartir de zéro. »";
			return null;
		},
		fin: function(){ return "Miguel te prête une rame. « Six canaux à la fois.\n\n" +
			"Un laboratoire attendait chaque nuit huit heures la compression de ses relevés, sur une machine à trente-deux cœurs. Un seul travaillait. " +
			"Avec xargs -P 32, la compression a pris vingt minutes. Personne n'avait regardé top pendant qu'elle tournait. »"; } },
	tour: { nom: "Badis", p: "tour",
		metier: "Le métier : chaque tâche planifiée tourne sous flock, écrit son journal, et ce journal tourne avec logrotate. Sans ça, le cron devient une source de pannes.",
		entree: function(){ return "Un homme veille en haut d'une tour, sous une grosse cloche, une horloge dans le dos. Il ne dort pas : il note. « Badis. La Tour de Garde. Ce qui doit tourner la nuit tourne sans toi. Mais une seule fois, et en laissant une trace. »"; },
		image: function(){ return "« cron, c'est mon horloge : une ligne par tâche, minute heure jour mois jour_de_semaine, puis la commande. 30 2 * * * : chaque nuit à 2 h 30. " +
			"Mais si la nuit d'avant n'a pas fini, cron relance quand même : deux tâches écrivent le même fichier. flock -n prend un verrou, et abandonne s'il est déjà pris.\n\n" +
			"Une tâche de nuit doit laisser une trace : >> nuit.log 2>&1 garde sa sortie et ses erreurs. logger écrit dans le journal du système, sous une étiquette, et journalctl -t la relit. " +
			"Et un journal qu'on ne fait jamais tourner finit par remplir le disque : logrotate le compresse, et n'en garde que les derniers. »"; },
		syntaxe: function(){ return "« Les sorts de ma tour :\n\n" +
			"  crontab -e         30 2 * * * flock -n /tmp/nuit.lock ~/ecluses/nuit.sh >> ~/ecluses/nuit.log 2>&1\n" +
			"  crontab -l         relire\n" +
			"  flock -n /tmp/nuit.lock ~/ecluses/nuit.sh      l'essayer à la main\n" +
			"  logger -t ecluse \"message\"                     écrire dans le journal du système\n" +
			"  journalctl -t ecluse                           relire les messages de cette étiquette\n" +
			"  logrotate -d ~/ecluses/logrotate.conf          essayer une rotation, sans rien toucher\n\n" +
			"Un logrotate.conf :\n  /home/" + JOUEUR + "/ecluses/nuit.log {\n      daily\n      rotate 7\n      compress\n      missingok\n      notifempty\n  }\n\n" +
			sortsTexteCh10("tour") + " »"; },
		mission: function(){ return "« Ta mission : planifie ~/ecluses/nuit.sh chaque nuit à 2 h 30, sous flock -n, sa sortie dans ~/ecluses/nuit.log. Essaie-la une fois à la main, avec flock. Puis une trace dans le journal (logger, journalctl), et une rotation pour nuit.log. Cette nuit, ma tour lancera ta ligne. Pour de vrai. »"; },
		suite: function(){ return "Badis fait sonner sa cloche, une fois. « Ta nuit est planifiée. Maintenant, la trace : logger, journalctl, et un logrotate.conf. »"; },
		erreur: function(){
			var l = lignesCronJoueurCh10().filter(function(x){ return /nuit\.sh/.test(x); });
			if (l.length && !l.some(ligneCronNuitCh10)) return "Badis relit ta crontab. « Presque. 30 2 * * *, puis flock -n et un verrou, puis le script, puis >> ~/ecluses/nuit.log 2>&1, à la fin. »";
			return null;
		},
		fin: function(){ return "Badis te laisse sonner la cloche. « Ce qui tourne sans toi tourne bien.\n\n" +
			"Un serveur de sauvegarde est tombé un lundi : quarante copies du même script tournaient en même temps. Chaque nuit, la sauvegarde mettait un peu plus d'une heure, et cron la relançait toutes les heures. " +
			"Elles s'empilaient depuis des semaines. Un flock -n, et la deuxième ne serait jamais partie. »"; } },
	fosse: { nom: "Arnaud", p: "fosse",
		metier: "Le métier : sur un serveur de données, on ne supprime pas un journal pour faire de la place : on le compresse et on l'archive. Il servira à un audit.",
		entree: function(){ return "Un homme descend à la corde dans un puits sans fond, une lampe au front, et remonte avec une caisse sous chaque bras. « Arnaud. La Fosse du Disque. Quand elle déborde, tout le lac s'arrête. »"; },
		image: function(){ return "« df dit ce que chaque disque a de pris et de libre. du dit ce que chaque dossier pèse ; sort -h range ses tailles humaines (K, M, G). find -mtime +30 trouve ce qui n'a pas bougé depuis plus de trente jours.\n\n" +
			"Les vieux journaux, on les compresse (zstd : un journal en perd neuf dixièmes), on ne les jette pas. Et parfois, df dit plus que du : un fichier a été effacé, mais un processus le tient encore ouvert. " +
			"Sa place reste prise, invisible pour du. lsof +L1 montre ces fantômes. Le processus relâché (relancé), la place revient. »"; },
		syntaxe: function(){ return "« Les sorts de ma fosse :\n\n" +
			"  df -h /srv/lac                                          le disque du lac\n" +
			"  sudo du -sh /srv/lac/* | sort -h                        ce qui pèse le plus, en dernier\n" +
			"  sudo find /srv/lac/journaux -name '*.log' -mtime +30    les vieux journaux\n" +
			"  sudo find ... -mtime +30 -exec zstd -q --rm {} \;       les compresser, sans rien effacer\n" +
			"  sudo lsof +L1                                           les fichiers effacés, encore ouverts\n" +
			"  sudo systemctl restart SERVICE                          relâcher ce qu'il tient\n\n" +
			sortsTexteCh10("fosse") + " »"; },
		mission: function(){ return "« Ta mission : le disque du lac (/srv/lac) déborde. Mesure (df, du, sort -h), trouve les journaux de plus de trente jours (find -mtime), compresse-les tous, sans en effacer un seul. Puis cherche pourquoi df dit encore plus que du. »"; },
		suite: function(){ return "Arnaud remonte d'un étage. « La fosse respire. Mais df et du ne disent toujours pas la même chose. lsof +L1. »"; },
		erreur: function(){
			var d = dossierHote(LAC_CH10, "/srv/lac/journaux");
			var c = sCh10();
			if (d && d.items.filter(function(it){ return /^ingestion-\d{4}-\d\d-\d\d\.log/.test(it.itemname); }).length < 29) return "Arnaud blêmit. « Il manque des journaux dans /srv/lac/journaux. Un journal effacé ne se retrouve pas. On compresse, on ne supprime pas. »";
			return null;
		},
		fin: function(){ return "Arnaud te passe sa corde. « La fosse ne déborde plus.\n\n" +
			"Un administrateur a effacé à minuit un journal de quarante gigaoctets pour sauver un disque plein. Le disque est resté plein : le service écrivait toujours dans le fichier effacé. " +
			"Il a relancé la base de données en catastrophe, et perdu une heure de commandes. Un truncate, ou un lsof +L1 d'abord, et rien ne serait arrivé. »"; } },
	chambre: { nom: "Julien", p: "chambre",
		metier: "Le métier : renice et ionice ne tuent rien. Ils rendent la machine aux services pendant qu'un traitement lourd finit, moins vite, mais sans gêner personne.",
		entree: function(){ return "Un homme passe d'un manomètre à l'autre, dévissant une vanne ici, en resserrant une là. Les aiguilles redescendent du rouge à mesure qu'il passe. « Julien. La Chambre des Pressions. Un job lourd ne doit jamais étouffer les autres. »"; },
		image: function(){ return "« Le processeur, c'est la pression de l'eau. nice règle la politesse d'un processus : de -20 (il passe devant) à 19 (il passe après tout le monde). renice change celle d'un processus qui tourne déjà. " +
			"Le disque, c'est le débit : ionice -c3 (idle) ne lit le disque que quand personne d'autre ne s'en sert. taskset tient un processus sur certains cœurs.\n\n" +
			"Un job qui doit finir ne se tue pas : on le fait passer après. Et le prochain, on le lance déjà borné : timeout l'arrête s'il dure trop. »"; },
		syntaxe: function(){ return "« Les sorts de ma chambre :\n\n" +
			"  top ; ps -eo pid,ni,%cpu,comm --sort=-%cpu | head     qui pèse sur la machine\n" +
			"  renice -n 15 -p PID                                   le faire passer après\n" +
			"  ionice -c3 -p PID ; ionice -p PID                     le disque, seulement quand il est libre\n" +
			"  taskset -cp PID ; taskset -cp 1 PID                   ses cœurs ; un seul cœur\n" +
			"  timeout 30m nice -n 10 ionice -c3 taskset -c 1 ./agreger.sh    un job lancé déjà borné\n\n" +
			sortsTexteCh10("chambre") + " »"; },
		mission: function(){ return "« Ta mission : sur lac, un agrégateur écrase la machine. Trouve-le (top, ps). Il doit finir son mois : ne le tue pas. Fais-le passer après les autres, pour le processeur et pour le disque. Puis lance ~/profondeurs/agreger.sh déjà borné : timeout, nice, ionice. »"; },
		suite: function(){ return "Julien tapote un manomètre. « L'aiguille redescend. Maintenant, le prochain job : lance-le déjà borné. »"; },
		erreur: function(){
			var c = sCh10();
			if ((c.agregateurRelance || 0) > 0 && !aFait("n10_pression")) return "Julien soupire. « L'agrégateur a été tué, et l'analyste l'a relancé (nouveau PID). Il doit finir : renice et ionice, pas kill. »";
			var p = procAgregateurCh10();
			if (p && (p.ni || 0) >= 10 && !pressionOkCh10()) return "Julien montre la jauge du disque. « Le processeur, c'est fait. Le disque, non : ionice -c3 -p " + p.pid + ". »";
			return null;
		},
		fin: function(){ return "Julien te confie un petit manomètre de poche. « La machine respire.\n\n" +
			"Le site d'une boutique en ligne tombait tous les soirs à 20 h. À 20 h, chaque soir, un export comptable partait, et prenait tout le disque. " +
			"Deux mots devant la commande, nice et ionice, et le site n'est plus jamais tombé. L'export, lui, finissait dix minutes plus tard. »"; } },
	coffre: { nom: "Megane", p: "coffre",
		metier: "Le métier : le RGPD impose la minimisation. Un export ne contient que les données utiles à son usage, et le brut reste sous clé, au propriétaire.",
		entree: function(){ return "Une femme en scaphandre tient la porte d'un coffre-fort posé au fond de l'eau. Rien n'entre ni ne sort sans qu'elle le regarde. « Megane. Le Coffre des Secrets. Les adresses et les téléphones des pêcheurs ne quittent jamais ce coffre. »"; },
		image: function(){ return "« Une donnée personnelle, c'est ce qui permet de retrouver quelqu'un : une adresse, un téléphone. Un export public ne doit en contenir aucune. On retire la colonne (cut), " +
			"ou on la masque (sed -E), ou on la remplace par un pseudonyme qui ne se défait pas (une empreinte, sha256sum).\n\n" +
			"Et le brut reste sous clé : chmod 640 (le propriétaire lit et écrit, le groupe lit, les autres rien). Une ACL donne un droit à un groupe de plus (setfacl -m g:analystes:r). " +
			"Une copie oubliée dans /tmp, on l'écrase avant de l'effacer (shred -u). Et umask 027 fait que les prochains fichiers naissent déjà fermés aux autres. »"; },
		syntaxe: function(){ return "« Les sorts de mon coffre (dans ~/profondeurs) :\n\n" +
			"  head -3 export-brut.csv                              voir ce qu'il contient\n" +
			"  cut -d, -f1-5 export-brut.csv > export-public.csv    garder les colonnes utiles\n" +
			"  sed -E 's/[^,]+@[^,]+/***/' A > B                    ou masquer une adresse\n" +
			"  grep -cE '@|06 ' export-public.csv                   vérifier : 0\n" +
			"  chmod 640 export-brut.csv\n" +
			"  setfacl -m g:analystes:r export-public.csv ; getfacl export-public.csv\n" +
			"  shred -u /tmp/export-brut-copie.csv\n" +
			"  echo 'umask 027' >> ~/.bashrc\n\n" +
			sortsTexteCh10("coffre") + " »"; },
		mission: function(){ return "« Ta mission : fais de ~/profondeurs/export-brut.csv un export-public.csv sans adresse ni téléphone, ligne pour ligne. Puis le brut sous clé (640), le public lisible par les analystes (une ACL), la copie de /tmp détruite, et umask 027 dans ton ~/.bashrc. »"; },
		suite: function(){ return "Megane referme à moitié la porte du coffre. « L'export est propre. Maintenant, les clés : chmod, setfacl, shred, umask. »"; },
		erreur: function(){
			var t = texteLacCh10("~/profondeurs/export-public.csv");
			if (t !== null && PII_CH10.test(t)) return "Megane pose un doigt sur une ligne. « Il reste une adresse ou un téléphone dans export-public.csv. grep -E '@|06 ' te les montre. »";
			return null;
		},
		fin: function(){ return "Megane te remet une petite clé, au bout d'une chaîne. « Le coffre est fermé.\n\n" +
			"Une collectivité a publié en données ouvertes un fichier de subventions. Une colonne « contact », oubliée au milieu, contenait le téléphone personnel de huit cents bénévoles. " +
			"Le fichier a été copié des dizaines de fois avant d'être retiré. Une donnée publiée ne se rattrape jamais tout à fait. »"; } },
	chantier: { nom: "Elias", p: "chantier",
		metier: "Le métier : une image reproductible épingle sa base et ses dépendances, ne contient que ce qu'il faut, et ne tourne pas en root. Elle donnera le même résultat dans un an.",
		entree: function(){ return "Un homme calfate la coque d'un navire en cale sèche, un navire qui est aussi une caisse de métal. « Elias. Le Chantier des Images. Ici, on scelle les navires de données. Un navire scellé navigue pareil partout. »"; },
		image: function(){ return "« Une image Docker, c'est un navire scellé : ton code, ses bibliothèques, et l'endroit où il tourne, figés ensemble. Mais un navire mal scellé change sous tes pieds : " +
			"FROM python:latest, c'est une autre base chaque mois ; « epuisette » sans version, c'est une autre bibliothèque chaque semaine. On épingle : python:3.12-slim, epuisette==1.4.2.\n\n" +
			"On copie requirements.txt avant le code (le cache garde l'installation tant que les dépendances ne changent pas). Un .dockerignore laisse à quai ce qui n'a rien à faire à bord (les essais, le .env). " +
			"Et le navire ne tourne pas en root : USER. Au lancement, les données arrivent en lecture seule (:ro) : l'ETL ne peut pas abîmer sa source. »"; },
		syntaxe: function(){ return "« Les sorts de mon chantier (dans ~/arsenal/etl) :\n\n" +
			"  FROM python:3.12-slim\n  WORKDIR /app\n  COPY requirements.txt .\n  RUN pip install --no-cache-dir -r requirements.txt\n  COPY etl.py .\n  USER 10001\n  CMD [\"python\", \"etl.py\"]\n\n" +
			"  printf 'essais/\\n.env\\n' > .dockerignore\n" +
			"  docker build -t etl:1.0 .\n" +
			"  docker run --rm --user \"$(id -u):$(id -g)\" --memory 256m -v ~/arsenal/donnees:/data:ro -v ~/arsenal/sortie:/sortie etl:1.0\n\n" +
			sortsTexteCh10("chantier") + " »"; },
		mission: function(){ return "« Ta mission : le Dockerfile de l'ancien analyste tourne... sur sa machine. Rends l'image reproductible (base et dépendance épinglées, .dockerignore, pas root, CMD en forme exec), et construis etl:1.0. Puis lance-la : les données en lecture seule, la mémoire bornée, les agrégats dans ~/arsenal/sortie. »"; },
		suite: function(){ return "Elias tape sur la coque, qui sonne juste. « Ton navire est scellé. Fais-le naviguer : les données en :ro, la sortie à toi. »"; },
		erreur: function(){
			var df = texteLacCh10("~/arsenal/etl/Dockerfile") || "";
			if (/FROM\s+python:latest/i.test(df) && buildsEtlCh10().length) return "Elias secoue la tête. « Encore FROM python:latest. Une base qui change chaque mois ne reproduit rien. python:3.12-slim. »";
			var img = imageEtlCh10();
			if (img && /^(root|0)?$/.test(String((img.config || {}).User || ""))) return "Elias montre le mât. « Ton navire tourne en root. USER 10001, avant le CMD. »";
			if (texteLacCh10("~/arsenal/sortie/agregats.csv") === null && (sCh10().etl || []).length === 0 && img) return "Elias écoute. « Si l'ETL échoue avec Permission denied sur /sortie : il tourne en 10001, et ton dossier est à toi. --user \"$(id -u):$(id -g)\". »";
			return null;
		},
		fin: function(){ return "Elias te remet un maillet de calfat. « Ton navire est scellé, et il navigue.\n\n" +
			"Un modèle de prévision a donné des résultats différents d'un mois sur l'autre, sans qu'on change une ligne. L'image partait de FROM python:latest : " +
			"une nouvelle version de la bibliothèque de calcul était entrée toute seule, avec un arrondi différent. Six semaines pour trouver. Une ligne épinglée l'aurait évité. »"; } },
	citerne: { nom: "Remi", p: "citerne",
		metier: "Le métier : les données d'une base vivent dans un volume, et se sauvegardent chaque nuit. Une sauvegarde se teste en la restaurant, régulièrement.",
		entree: function(){ return "Un homme vérifie l'étanchéité d'une grande citerne de pierre, l'oreille collée à la paroi. « Remi. La Citerne. La base de l'école dort ici. Si elle fuit, tout le lac l'oublie. »"; },
		image: function(){ return "« Un conteneur postgres, c'est la pompe ; ses données, c'est l'eau de la citerne. On met l'eau dans un volume nommé : la pompe passe, l'eau reste. " +
			"Le mot de passe arrive par un --env-file, jamais en clair dans la commande.\n\n" +
			"Pour la remplir, awk fabrique les INSERT ligne par ligne, et docker exec -i les verse dans psql. Et une citerne sans sauvegarde n'existe pas : pg_dump écrit la base en SQL, gzip la compresse. " +
			"Mais une sauvegarde qu'on n'a jamais restaurée n'est qu'un espoir : on la recharge dans une base d'essai, et on compte. »"; },
		syntaxe: function(){ return "« Les sorts de ma citerne :\n\n" +
			"  docker volume create citerne\n" +
			"  docker run -d --name citerne --env-file ~/arsenal/bassin/db.env -v citerne:/var/lib/postgresql/data postgres:16-alpine\n" +
			"  docker exec -i citerne psql -U lac -d lac < ~/arsenal/citerne/schema.sql\n" +
			"  tail -n +2 captures.csv | awk -F, '{ ... printf \"INSERT INTO captures VALUES (...);\\n\" }' | docker exec -i citerne psql -U lac -d lac\n" +
			"  docker exec citerne psql -U lac -d lac -c 'SELECT count(*) FROM captures'\n" +
			"  docker exec citerne pg_dump -U lac lac | gzip > ~/arsenal/sauvegardes/lac.sql.gz\n" +
			"  docker exec citerne createdb -U lac essai\n" +
			"  gunzip -c ~/arsenal/sauvegardes/lac.sql.gz | docker exec -i citerne psql -U lac -d essai\n\n" +
			sortsTexteCh10("citerne") + " »"; },
		mission: function(){ return "« Ta mission : une citerne (postgres:16-alpine) dont les données vivent dans un volume nommé, et dedans, la table captures (schema.sql) avec toutes les captures de ~/arsenal/donnees/captures.csv. Puis une sauvegarde dans ~/arsenal/sauvegardes, et la preuve qu'elle se restaure : une base essai, rechargée, qui a le même compte. »"; },
		suite: function(){ return "Remi écoute la paroi. « La citerne est pleine. Maintenant, sa copie : pg_dump, puis une restauration d'essai. »"; },
		erreur: function(){
			var n = donneesCh10().captures.length;
			var pgs = postgresEnMarcheCh10();
			var x = pgs.map(function(c){ return capturesDansBaseCh10(c, "lac"); }).filter(function(k){ return k >= 0; })[0];
			if (x !== undefined && x !== n) return "Remi compte. « La table captures a " + x + " lignes. Il en faut " + n + " : toutes les captures, sans l'en-tête. »";
			return null;
		},
		fin: function(){ return "Remi te confie une petite fiole d'eau de la citerne. « Elle ne fuit pas, et elle a sa copie.\n\n" +
			"Une jeune entreprise sauvegardait sa base chaque nuit depuis deux ans. Le jour de la panne, aucune sauvegarde ne se restaurait : le script écrivait un fichier vide depuis le premier jour. " +
			"Personne n'avait jamais essayé de la recharger. L'entreprise a fermé trois mois plus tard. »"; } },
	bassin: { nom: "Eden", p: "bassin",
		metier: "Le métier : condition: service_healthy, des volumes nommés, des ports publiés sur 127.0.0.1 et les secrets dans des fichiers. Une pile qui démarre seule, dans l'ordre, et ne s'ouvre qu'à qui de droit.",
		entree: function(){ return "Une femme ouvre et ferme les conduites entre trois cuves, dans un ordre précis, sans jamais se tromper. « Eden. Le Grand Bassin. Trois cuves, une pile. Si je les ouvre dans le désordre, tout déborde. »"; },
		image: function(){ return "« docker compose décrit toute la pile dans un seul fichier : la base, l'ETL, le carnet. Mais depends_on seul ne fait qu'attendre que la base DÉMARRE. " +
			"Une base qui démarre ne répond pas encore : l'ETL se cogne à une porte fermée. Avec un healthcheck (pg_isready) et condition: service_healthy, l'ETL attend que la base RÉPONDE.\n\n" +
			"Le carnet, lui, est une fenêtre sur nos données : publié sur 0.0.0.0, tout le réseau l'ouvre. Sur 127.0.0.1:8888, seule la machine. Et son jeton arrive par un env_file, jamais en clair dans compose.yaml. »"; },
		syntaxe: function(){ return "« Les sorts de mon bassin (dans ~/arsenal/bassin) :\n\n" +
			"  services:\n    db:\n      image: postgres:16-alpine\n      env_file: db.env\n      volumes:\n        - bassin-donnees:/var/lib/postgresql/data\n" +
			"      healthcheck:\n        test: [\"CMD-SHELL\", \"pg_isready -U lac -d lac\"]\n        interval: 5s\n        retries: 10\n" +
			"    etl:\n      image: etl:1.0\n      env_file: db.env\n      environment:\n        DB_HOST: db\n      volumes:\n        - ./donnees:/data:ro\n        - ./sortie:/sortie\n" +
			"      depends_on:\n        db:\n          condition: service_healthy\n" +
			"    carnet:\n      image: carnet:1.0\n      env_file: carnet.env\n      ports:\n        - \"127.0.0.1:8888:8888\"\n      volumes:\n        - ./sortie:/sortie:ro\n" +
			"  volumes:\n    bassin-donnees:\n\n" +
			"  docker build -t carnet:1.0 ~/arsenal/carnet ; docker compose up -d ; docker compose ps ; docker compose logs etl\n" +
			"  curl \"http://127.0.0.1:8888/?token=$(cut -d= -f2 carnet.env)\"\n\n" +
			sortsTexteCh10("bassin") + " »"; },
		mission: function(){ return "« Ta mission : complète ~/arsenal/bassin/compose.yaml. La base dans un volume, avec son healthcheck ; l'ETL qui ne part qu'après elle, en bonne santé, et finit ses agrégats dans ./sortie ; le carnet (construis d'abord carnet:1.0), sur 127.0.0.1 seulement, avec son jeton. Puis ouvre-le avec curl. »"; },
		suite: function(){ return "Eden ouvre une dernière conduite. « La pile tient. Maintenant, la fenêtre : le carnet, sur 127.0.0.1, avec son jeton. »"; },
		erreur: function(){
			var etl = conteneursComposePort(LAC_CH10, "bassin", "etl")[0];
			if (etl && etl.etat.statut === "exited" && etl.etat.code) return "Eden lit le journal de l'ETL. « Il est tombé (code " + etl.etat.code + "). docker compose logs etl : la base répondait-elle déjà ? condition: service_healthy. »";
			var c = serviceEnMarcheCh10("bassin", "carnet");
			if (c && portsPubliesPort(LAC_CH10, c).some(function(x){ return x.ip !== "127.0.0.1"; })) return "Eden ferme une vanne d'un coup sec. « Ton carnet est ouvert à tout le réseau. \"127.0.0.1:8888:8888\". »";
			return null;
		},
		fin: function(){ return "Eden te laisse ouvrir les conduites, dans l'ordre. « Ta pile démarre seule, et ne s'ouvre qu'à toi.\n\n" +
			"Des milliers de carnets de data science se sont retrouvés en ligne, sans jeton, publiés sur 0.0.0.0 depuis des serveurs de calcul. " +
			"Des robots les ont trouvés en quelques heures, et s'en sont servis pour miner de la monnaie, avec les données des chercheurs à côté. »"; } }
};

function sortsDuMaitreCh10(g){ return (SORTS_DES_POSTES_CH10[g.p] || []).filter(function(x){ return typeof MANUEL !== "undefined" && !!MANUEL[x]; }); }
GameEvents.addListener("read", function(e){
	try { Object.keys(MAITRES_CH10).forEach(function(k){ var g = MAITRES_CH10[k]; if (g.item && e.item === g.item && !g.item.teaches.length) g.item.teaches = sortsDuMaitreCh10(g); }); } catch (x){}
});
Object.keys(MAITRES_CH10).forEach(function(cle){
	var g = MAITRES_CH10[cle], p = posteCh10Par(cle);
	g.item = new Item(sansAccentCh10(g.nom).replace(/^./, function(x){ return x.toUpperCase(); }), "", "item_" + sansAccentCh10(g.nom) + ".gif").personnage();
	var sorts = sortsDuMaitreCh10(g);
	if (sorts.length) g.item.enseigne.apply(g.item, sorts);
	g.item.revele.apply(g.item, idsDefisPosteCh10(cle));
	texteVivant(g.item, function(){ return texteMaitreCh10(g); });
	p.lieu.addItem(g.item);
});
WissamLacCh10.revele("s_n10_sans_indice", "s_n10_pecheur_j1", "s_n10_sondeur_j2", "s_n10_avant_maree", "s_n10_rien_jete");
JaugeLacCh10.revele("s_n10_pecheur_j1", "s_n10_sondeur_j2", "s_n10_avant_maree");

/* ------------------------------------------------------------------ */
/* Les badges du chapitre                                              */
/* ------------------------------------------------------------------ */

var TROPHEES_CH10 = {
	poste_greve:    ["la Grève des Fichiers", "file, head, wc -l, column -t, csvlook, od -c : on regarde une donnée avant d'y toucher."],
	poste_banc:     ["le Banc de Tri", "cut | sort | uniq -c | sort -rn ; awk -F, et ses conditions : on compte, on ne devine pas."],
	poste_comptoir: ["le Comptoir des Mesures", "Les sommes par groupe avec awk ; la médiane et les moyennes avec csvstat et datamash."],
	poste_gue:      ["le Gué des Encres", "file -i, iconv, dos2unix, le BOM vu par od -c : tout ce qui sort du lac est en UTF-8, sans BOM, en fins de ligne Unix."],
	poste_moulin:   ["le Moulin des Doublons", "sort -u sans perdre l'en-tête, uniq -d, comm -13 sur des fichiers triés : chaque prise une fois, et seulement le nouveau."],
	poste_vanne:    ["la Vanne des Formats", "awk NF et des expressions régulières : valides d'un côté, rejets de l'autre, rien ne se perd ; mlr et jq pour le JSON."],
	poste_ecluse:   ["l'Écluse des Scripts", "set -euo pipefail, des guillemets autour des variables, mktemp et trap EXIT : un script qui échoue bruyamment."],
	poste_bief:     ["le Bief des Parallèles", "split -l sans l'en-tête, xargs -P et parallel, zstd --rm : un gros fichier, traité en morceaux, en même temps."],
	poste_tour:     ["la Tour de Garde", "crontab et flock -n, la sortie dans un journal, logger et journalctl -t, logrotate : la nuit tourne seule, une fois."],
	poste_fosse:    ["la Fosse du Disque", "df, du | sort -h, find -mtime, zstd au lieu de rm, lsof +L1 : la place retrouvée sans rien perdre."],
	poste_chambre:  ["la Chambre des Pressions", "renice, ionice -c3, taskset, timeout : un job lourd ralenti, jamais tué, et le suivant lancé déjà borné."],
	poste_coffre:   ["le Coffre des Secrets", "cut ou sed -E pour retirer les données personnelles, chmod 640, une ACL, shred -u, umask 027."],
	poste_chantier: ["le Chantier des Images", "Une image épinglée, sans root, avec un .dockerignore ; les données montées en lecture seule."],
	poste_citerne:  ["la Citerne", "postgres dans un volume nommé, des INSERT fabriqués par awk, pg_dump, et une restauration d'essai."],
	poste_bassin:   ["le Grand Bassin", "docker compose, un healthcheck et condition: service_healthy, un carnet sur 127.0.0.1 avec son jeton."],
	insigne_riverain: ["l'Insigne de Riverain", "On commence tous au bord : on mesure avant de plonger."],
	insigne_pecheur:  ["l'Insigne de Pêcheur de données", "Épreuve I : un fichier au format français (point-virgule, virgule décimale), lu avant d'être compté."],
	insigne_plongeur: ["l'Insigne de Plongeur", "Épreuve II : un arrivage qui avait tout de travers, rendu propre, et ses rejets gardés."],
	insigne_eclusier: ["l'Insigne d'Éclusier", "Épreuve III : un pipeline qui mentait (sans pipefail), un relevé illisible en quarantaine, une seule tâche de cron sous flock."],
	insigne_sondeur:  ["l'Insigne de Sondeur des Abysses", "Épreuve IV : un disque plein d'un journal DEBUG ouvert ; truncate, le bon niveau de journal, et une rotation."],
	insigne_maitre:   ["l'Insigne de Maître du Lac", "Épreuve V : une pile Compose à quatre fautes, réparée par ses journaux."],
	n10_jauge:   ["la Jauge du Lac", "On mesure l'état d'un système avant d'y toucher : la Clarté de départ est le point zéro."],
	n10_maree:   ["la Grande Marée", "Un incident commence par un état des lieux : la jauge, le disque, les entrées, les conteneurs."],
	n10_neant:   ["le Néant repoussé", "Une base engloutie, restaurée depuis une sauvegarde qu'on avait déjà testée."],
	n10_rapport: ["le Rapport de la Marée", "Un rapport d'incident : les huit bras, ce qui a été fait, ce qui reste, la clarté finale, le compte restauré."],
	s_n10_avant_maree: ["Avant la Marée", "Le lac défendu avant l'aube du quatrième jour : on se prépare avant l'attaque, pas pendant."]
};
var COMPETENCES_CH10 = {
	poste_greve: "Lire une donnée", poste_banc: "Compter et filtrer", poste_comptoir: "Statistiques en ligne de commande", poste_gue: "Encodages et fins de ligne",
	poste_moulin: "Doublons et différences", poste_vanne: "Validation et JSON", poste_ecluse: "Scripts sûrs", poste_bief: "Traitement en parallèle",
	poste_tour: "Planification et journaux", poste_fosse: "Disque et fichiers fantômes", poste_chambre: "Priorités et ressources", poste_coffre: "Données personnelles et droits",
	poste_chantier: "Images reproductibles", poste_citerne: "Base de données et sauvegarde", poste_bassin: "Piles Compose",
	insigne_riverain: "Rang de Riverain", insigne_pecheur: "Rang de Pêcheur de données", insigne_plongeur: "Rang de Plongeur", insigne_eclusier: "Rang d'Éclusier",
	insigne_sondeur: "Rang de Sondeur des Abysses", insigne_maitre: "Rang de Maître du Lac",
	n10_jauge: "Lac mesuré", n10_maree: "Marée affrontée", n10_neant: "Base restaurée", n10_rapport: "Rapport de la Marée",
	s_n10_avant_maree: "Lac avant la Marée", platine_ch10: "Maître du Lac Profond"
};
var SIGLES_CH10 = {
	poste_greve: ["HEAD", "bronze"], poste_banc: ["SORT", "bronze"], poste_comptoir: ["AWK", "bronze"], poste_gue: ["UTF8", "argent"],
	poste_moulin: ["UNIQ", "argent"], poste_vanne: ["JSON", "argent"], poste_ecluse: ["TRAP", "argent"], poste_bief: ["XARG", "argent"],
	poste_tour: ["CRON", "argent"], poste_fosse: ["DF", "argent"], poste_chambre: ["NICE", "or"], poste_coffre: ["RGPD", "or"],
	poste_chantier: ["DOCK", "or"], poste_citerne: ["PG", "or"], poste_bassin: ["YAML", "or"],
	insigne_riverain: ["0", "bronze"], insigne_pecheur: ["1", "bronze"], insigne_plongeur: ["2", "argent"], insigne_eclusier: ["3", "argent"],
	insigne_sondeur: ["4", "or"], insigne_maitre: ["5", "platine"],
	n10_jauge: ["LAC", "bronze"], n10_maree: ["8", "or"], n10_neant: ["BAK", "or"], n10_rapport: ["DOC", "or"], s_n10_avant_maree: ["J4", "or"],
	platine_ch10: ["DATA", "platine"]
};
Object.keys(COMPETENCES_CH10).forEach(function(id){ COMPETENCES[id] = COMPETENCES_CH10[id]; });
Object.keys(SIGLES_CH10).forEach(function(id){ if (SIGLES_CH10[id][1] !== "bronze") RANGS_DES_BADGES[id] = SIGLES_CH10[id][1]; });
function badgeCh10Gagne(id){ return /^(poste_|insigne_)/.test(id) ? state.has(id) : !!(state.quests && state.quests[id]); }

var PLATINES_AVANT_CH10 = verifierPlatines;
verifierPlatines = function(){
	PLATINES_AVANT_CH10();
	if (state.has("ch10Ouvert") && !state.has("platine_ch10") && Object.keys(TROPHEES_CH10).every(badgeCh10Gagne)){
		state.set("platine_ch10");
		if (!state.has("rejeuEnCours")) say(C.jaune("✦ Badge gagné : " + COMPETENCES.platine_ch10) + C.gris(" · platine · badges"));
	}
};

/* ------------------------------------------------------------------ */
/* jauge : le plan du lac ; insignes : ton rang ; regenerer             */
/* ------------------------------------------------------------------ */

function barreJaugeCh10(){
	var reste = Math.max(0, AUBE_CH10 - minutesCh10()), total = AUBE_CH10 - 360, n = 30;
	var k = Math.round(n * (1 - Math.min(1, reste / total)));
	function fois(t, m){ var r = ""; for (var i = 0; i < m; i++) r += t; return r; }
	return C.gris("  la marée ≋ ") + C.cyan(fois("~", Math.max(0, n - k))) + C.rouge(fois("≈", k)) + C.gris(" l'aube du J4");
}
function texteJaugePlanCh10(){
	var c = sCh10(), p = clarteCh10();
	var lignes = [C.gras("LA JAUGE DU LAC : LE PLAN DE LA RIVE"), C.jaune("commande du jeu, pas Linux (man jauge)"), C.gris("rouge : poste à tenir · vert : poste tenu · l'état est lu sur la machine lac"), ""];
	lignes.push("  " + C.gras(heureCh10()) + C.gris(" · ") + C.gras(nomRangCh10()) + C.gris(" · ") + (c.maree ? C.rouge("la Grande Marée est là") : C.jaune(texteAvantMareeCh10())));
	if (!c.maree) lignes.push(barreJaugeCh10());
	lignes.push("  La Clarté du Lac : " + C.gras(p + " / 100") + C.gris(" (départ : " + (c.scoreDepart !== null && c.scoreDepart !== undefined ? c.scoreDepart : p) + ", objectif : au moins 90 après la Marée)"), "");
	var rappel = rappelWissamCh10();
	if (rappel) lignes.push(C.jaune("  " + rappel), "");
	ACTES_CH10.forEach(function(a){
		lignes.push(C.gras("  Acte " + ["", "I", "II", "III", "IV", "V", "VI"][a.n] + " · " + a.titre) + C.gris(rangCh10() >= a.n - 1 ? "" : "  (fermé : il faut être " + RANGS_CH10[a.n - 1].nom + ")"));
		POSTES_CH10.filter(function(s){ return s.acte === a.n; }).forEach(function(s){
			var ok = etapesPosteFaitesCh10(s), faites = s.etapes.filter(aFait).length, defis = idsDefisPosteCh10(s.cle).filter(aFait).length;
			var cede = c.assaut && (c.assaut.postes || []).indexOf(s.cle) > -1 && !ok;
			lignes.push("    " + (ok ? C.vert : C.rouge)("●") + " " + C.gras(completerDroite(s.nom, 21)) + completerDroite(s.maitre, 8) +
				C.gris("  " + faites + " sur " + s.etapes.length + " étapes · " + defis + " sur " + idsDefisPosteCh10(s.cle).length + " défis") + (cede ? C.rouge(" · sous l'eau") : "") + (current_room === s.lieu ? C.jaune("  ◀ toi") : ""));
		});
		if (a.epreuve){
			var etat = aFait(a.epreuve) ? C.vert("réussie") : (epreuveOuverteCh10(a.n) ? C.rouge("EN COURS") : C.gris("fermée (finis l'acte)"));
			lignes.push("    " + C.jaune("⚔") + " Épreuve de rang : " + a.nomEpreuve + C.gris(" → ") + RANGS_CH10[a.n].nom + C.gris(" · ") + etat);
		} else lignes.push("    " + C.jaune("⚔") + " " + a.nomEpreuve + C.gris(" · ") + (c.maree ? C.rouge("EN COURS") : C.gris("dès que tu es Maître du Lac (ou à l'aube du J4)")));
	});
	if (c.maree){
		lignes.push("", C.gras("  Les huit bras de Pipelinus"));
		BRAS_CH10.forEach(function(b){
			var x = c.bras[b.cle];
			var etat = !x ? C.gris("○ encore sous l'eau") : (x.resolu ? C.vert("● tranché") : (x.etendu ? C.rouge("● s'étend !") : C.rouge("● attaque")));
			lignes.push("    " + etat + " " + b.nom + (x && !x.resolu ? C.gris(" : " + QUETES_CH10.filter(function(q){ return q.id === b.etape; })[0].indice.split(" ; ")[0]) : ""));
		});
	}
	var inc = incidentsOuvertsCh10();
	if (inc.length) lignes.push("", C.rouge("  Incidents ouverts (-3 chacun) : ") + inc.join(" ; "));
	var manque = mesuresManquantesCh10();
	if (manque.length) lignes.push("", C.gras("  Ce qui manque au lac") + C.gris(" (" + manque.length + ")"), manque.slice(0, 6).map(function(m){ return "    " + C.gris("+" + m.poids) + " " + m.texte; }).join("\n") + (manque.length > 6 ? "\n" + C.gris("    ... et " + (manque.length - 6) + " autres") : ""));
	if (typeof lumieresAnnexes === "function"){ var la = lumieresAnnexes(11); if (la.length) lignes.push("", C.gras("  Les lumières des habitants"), la.map(function(x){ return "    " + C.jaune("✺") + " " + x; }).join("\n")); }
	lignes.push("", "  Postes tenus : " + C.gras(postesTenusCh10().length + " sur 15"));
	var j1 = aFait("s_n10_pecheur_j1") ? C.vert("réussi") : (rangCh10() >= 1 || c.minutes >= 1320 ? C.rouge("manqué") : C.jaune("en cours"));
	var j2 = aFait("s_n10_sondeur_j2") ? C.vert("réussi") : (rangCh10() >= 4 || c.minutes >= 2760 ? C.rouge("manqué") : C.jaune("en cours"));
	var j4 = aFait("s_n10_avant_maree") ? C.vert("réussi") : (c.maree && !c.maree.avantAube ? C.rouge("manqué") : C.jaune("en cours"));
	var hi = aFait("s_n10_sans_indice") ? C.vert("réussi") : (state.malus11 ? C.rouge("manqué (indice acheté)") : C.jaune("en cours"));
	lignes.push("", C.gras("  Défis d'honneur (Wissam)"), "    Pêcheur de données avant la nuit du J1 : " + j1, "    Sondeur des Abysses avant la fin du J2 : " + j2, "    La Marée repoussée avant l'aube : " + j4, "    Sans acheter d'indice : " + hi);
	var t = Object.keys(TROPHEES_CH10).filter(badgeCh10Gagne);
	lignes.push("", C.gras("  BADGES : " + t.length + " sur " + Object.keys(TROPHEES_CH10).length) + C.gris("  (badges lac : les leçons)"));
	lignes.push(C.gris("  Un dossier cassé sur lac ? regenerer NOM (rive, courants, ecluses, bief, profondeurs, arsenal)"));
	return lignes.join("\n");
}
Shell.sorts.jauge = function(args, io){
	if (!state.has("ch10Ouvert")) return "La jauge du lac se plonge au chapitre 10, après la Chronothèque.";
	if (!state.quests["n10_entree"]) return "La jauge est sur la rive du lac : descends-y d'abord (cd ~/Cybersup/Lac).";
	var c = sCh10(), p = clarteCh10();
	if (c.scoreDepart === null || c.scoreDepart === undefined) c.scoreDepart = p;
	c.scoreDernier = p;
	var texte = texteJaugePlanCh10();
	if (io.tty && typeof montrerCarte === "function" && montrerCarte(texte)) return texte + "\n" + C.gris("(Le plan remplace aussi l'image jusqu'à ton prochain déplacement.)");
	return texte;
};
function texteInsignesCh10(){
	var r = rangCh10(), c = sCh10();
	var l = [C.gras("TES INSIGNES DE RANG"), C.jaune("commande du jeu, pas Linux (man insignes)"), ""];
	l.push("  Rang : " + C.gras(RANGS_CH10[r].nom) + C.gris("  (" + ["une goutte de verre", "un filet de cuivre", "un casque de cuivre", "une clé de vanne", "une sonde lestée", "le trident de bronze"][r] + ")"));
	l.push("", C.gras("  Les rangs"));
	RANGS_CH10.forEach(function(x, i){ l.push("    " + (i <= r && (i > 0 || state.has("insigne_riverain")) ? C.vert("✦") : C.gris("·")) + " " + completerDroite(x.nom, 21) + (c.rangA && c.rangA[i] !== undefined ? C.gris("gagné à J" + (Math.floor(c.rangA[i] / 1440) + 1) + " " + deuxChiffres(Math.floor(c.rangA[i] % 1440 / 60)) + ":" + deuxChiffres(c.rangA[i] % 60)) : "")); });
	if (r < 5){
		var a = acteCh10(r + 1);
		var reste = a.etapes.filter(function(id){ return !aFait(id); });
		l.push("", C.gras("  Pour devenir " + RANGS_CH10[r + 1].nom));
		if (!aFait("n10_jauge")) l.push("    " + (rappelWissamCh10() ? C.jaune(rappelWissamCh10()) : "Écouter Wissam, lire l'Ordre, et plonger la jauge (jauge)."));
		reste.forEach(function(id){ var q = QUETES_CH10.filter(function(x){ return x.id === id; })[0]; l.push("    [ ] " + q.titre); });
		l.push("    " + (epreuveOuverteCh10(r + 1) ? C.rouge("⚔ L'épreuve de rang est ouverte : ") : C.gris("⚔ Puis l'épreuve de rang : ")) + a.nomEpreuve);
	} else l.push("", C.gras("  Tu portes le trident de bronze.") + (state.quests["n10_rapport"] ? " Le lac est clair." : " Il reste à trancher les huit bras pendant la Grande Marée."));
	return l.join("\n");
}
Shell.sorts.insignes = function(args, io){
	if (!state.has("ch10Ouvert")) return "Les insignes de rang se gagnent au Lac Profond, au chapitre 10.";
	return texteInsignesCh10();
};
/* regenerer : au lac, les dossiers d'exercice sur lac ; ailleurs, la Chronothèque. */
var REGENERER_AVANT_CH10 = Shell.sorts.regenerer;
Shell.sorts.regenerer = function(args, io){
	var auLac = lacActif() && (!args.length ? (surLacCh10() || !(typeof chronothequeActive === "function" && chronothequeActive())) : REGENERATIONS_CH10.some(function(x){ return x.nom === args[0]; }));
	if (!auLac) return REGENERER_AVANT_CH10.apply(this, arguments);
	var noms = REGENERATIONS_CH10.filter(function(x){ return !x.epreuve || epreuveOuverteCh10(x.epreuve); }).map(function(x){ return x.nom; });
	if (!args.length) return "regenerer NOM : repose un dossier d'exercice neuf sur lac (tes changements dedans sont perdus, tes étapes déjà faites restent faites).\n  " + noms.join(", ") + "\n" +
		C.gris("(/srv/lac, lui, ne se régénère pas : c'est le vrai lac.)");
	var x = REGENERATIONS_CH10.filter(function(y){ return y.nom === args[0]; })[0];
	if (!x) return "regenerer : je ne connais pas « " + args[0] + " ». Les dossiers : " + noms.join(", ");
	if (x.epreuve && !epreuveOuverteCh10(x.epreuve)) return "regenerer : l'épreuve qui pose « " + x.nom + " » n'est pas encore ouverte.";
	regenererCh10(x);
	return "~/" + x.nom + " sur lac : un dossier neuf, tel que le gardien l'avait préparé." + C.gris(" (ssh lac ; ls ~/" + x.nom + ")");
};
["jauge", "insignes"].forEach(function(s){ if (SORTS_DU_JEU.indexOf(s) === -1) SORTS_DU_JEU.push(s); });
if (typeof COMMANDES_DU_JEU !== "undefined"){
	COMMANDES_DU_JEU.splice(COMMANDES_DU_JEU.length - 4, 0, ["jauge", "le plan du Lac Profond : les postes, l'heure, la Grande Marée, la Clarté du Lac (chapitre 10)"]);
	COMMANDES_DU_JEU.splice(COMMANDES_DU_JEU.length - 4, 0, ["insignes", "ton rang au Lac Profond, et ce qu'il faut pour le suivant"]);
}
if (typeof MANUEL_DU_JEU !== "undefined"){
	MANUEL_DU_JEU.jauge = "jauge n'est PAS une commande Linux : c'est une commande du jeu, comme quetes ou badges.\n" +
		"Au Lac Profond (chapitre 10), elle montre le plan : l'heure (J1 06:00 à l'aube du J4), ton rang, la Grande Marée qui approche,\n" +
		"la Clarté du Lac (de 0 à 100, calculée sur l'état RÉEL de la machine lac), les quinze postes (en rouge ceux à tenir, en vert\n" +
		"ceux tenus), les épreuves de rang, les huit bras de Pipelinus, et ce qui manque encore.\n\n  jauge         le plan du lac";
	MANUEL_DU_JEU.insignes = "insignes n'est PAS une commande Linux : c'est une commande du jeu.\nAu Lac Profond, elle montre ton rang (Riverain, Pêcheur de données, Plongeur, Éclusier, Sondeur des Abysses, Maître du Lac),\n" +
		"quand tu l'as gagné, et ce qu'il te manque pour le suivant (les étapes de l'acte, puis l'épreuve de rang).\n\n  insignes      ton rang";
	MANUEL_DU_JEU.regenerer = (MANUEL_DU_JEU.regenerer || "") + "\n\nAu Lac Profond (chapitre 10), regenerer repose un dossier d'exercice neuf sur la machine lac :\n" +
		"  regenerer rive, courants, ecluses, bief, profondeurs, arsenal (et les dossiers d'épreuve ouverts).";
}

/* ------------------------------------------------------------------ */
/* Le monde réagit : défis, honneur, badges, radio                      */
/* ------------------------------------------------------------------ */

function verifierAbysses(){
	if (!lacActif()) return;
	var c = sCh10();
	DEFIS_CH10.forEach(function(d){ var ok = false; if (d.monde && !state.quests[d.id]){ try { ok = d.monde(); } catch (e){ ok = false; } if (ok) reussirDefiCh10(d.id); } });
	if (c.rangA && c.rangA[1] !== undefined && c.rangA[1] < 1320) reussirDefiCh10("s_n10_pecheur_j1");
	if (c.rangA && c.rangA[4] !== undefined && c.rangA[4] < 1440 + 1320) reussirDefiCh10("s_n10_sondeur_j2");
	if (aFait("n10_rapport") && c.maree && c.maree.avantAube && c.minutes < AUBE_CH10) reussirDefiCh10("s_n10_avant_maree");
	if (aFait("n10_rapport") && !state.malus11) reussirDefiCh10("s_n10_sans_indice");
	POSTES_CH10.forEach(function(p){ if (etapesPosteFaitesCh10(p) && !state.has("poste_" + p.cle)) state.set("poste_" + p.cle); });
	c.trophees = c.trophees || {};
	Object.keys(TROPHEES_CH10).forEach(function(id){
		if (!badgeCh10Gagne(id) || c.trophees[id]) return;
		c.trophees[id] = true;
		if (!state.has("rejeuEnCours")) say(C.jaune("✦ Badge gagné : " + COMPETENCES[id]) + C.gris(" · badges"));
	});
	verifierPlatines();
	var suivante = QUETES_CH10.filter(function(q){ return !state.quests[q.id]; })[0];
	var cle = suivante ? suivante.id : "fin";
	if (c.dernierConseil !== cle){
		c.dernierConseil = cle;
		if (!state.has("rejeuEnCours") && cle !== "n10_jauge") say(C.gris("(Nouveau message de Grace : cat " + Shell.cheminAffiche(LacCh10) + "/Radio.)"));
	}
}
var VERIFIER_CH10_AVANT_ABYSSES = verifierChapitre10;
verifierChapitre10 = function(){
	VERIFIER_CH10_AVANT_ABYSSES();
	verifierAbysses();
};

/* ------------------------------------------------------------------ */
/* Les noms imagés des sorts                                           */
/* ------------------------------------------------------------------ */

var SORTS_RPG_CH10 = {
	csvlook: { nom: "le Regard de la Grève", image: "Tu vois un CSV comme un tableau." },
	csvstat: { nom: "la Balance du Comptoir", image: "Tu pèses chaque colonne : moyenne, médiane, fréquences." },
	datamash: { nom: "l'Abaque", image: "Tu calcules groupe par groupe." },
	mlr: { nom: "le Traducteur des Formats", image: "Tu passes du CSV au JSON et retour." },
	iconv: { nom: "la Fiole d'Encre", image: "Tu traduis d'une encre à l'autre." },
	flock: { nom: "la Clé de l'Écluse", image: "Une seule écluse ouverte à la fois." },
	parallel: { nom: "les Six Canaux", image: "Tu lances plusieurs barques à la fois." },
	ionice: { nom: "la Vanne du Débit", image: "Tu fais passer un job après les autres, sur le disque." },
	shred: { nom: "le Broyeur du Coffre", image: "Tu écrases avant d'effacer." }
};
var NOM_RPG_AVANT_CH10 = nomRpg;
nomRpg = function(sort, chapitre){
	if (chapitre === 11 && SORTS_RPG_CH10[sort]) return SORTS_RPG_CH10[sort].nom;
	return NOM_RPG_AVANT_CH10(sort, chapitre);
};

World.fige = true;
