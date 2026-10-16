/**
 * Chapitre4.js : l'Académie des Arcanes, le chapitre avancé (« Linux avancé »).
 *
 * Numéro interne 5 (le 4 est pris par l'épreuve finale), affiché 4 pour le joueur.
 * Quelques semaines après la Crypte, les notes volées de Frances ont fuité sur un forum.
 * Un groupe de rançonneurs, la Nuée, a repris le nom du Corbeau et ses méthodes. En une nuit,
 * la Nuée a exfiltré des données de l'école, posé une bombe logique programmée pour minuit,
 * semé des pièges, et laissé un script qui recrée ses fichiers à mesure qu'on les efface.
 *
 * Ce chapitre est DÉFENSIF : tout ce qui est « malveillant » est narratif et inerte (des objets
 * texte, comme les charges neutralisées du chapitre 3). Le joueur apprend à mesurer la fuite,
 * notifier (RGPD), éradiquer, restaurer et documenter. On ne fabrique aucun outil d'attaque.
 *
 * Phases réelles d'une réponse à incident : la Crypte couvrait détection et confinement ; ici,
 * c'est l'analyse de l'ampleur, l'éradication, le rétablissement et le retour d'expérience.
 *
 * Les validations reposent sur l'état réel du monde (contenu exact des fichiers produits, monde
 * modifié), jamais sur la seule frappe d'une commande. Les données sont générées par la graine.
 */

World.fige = false;

/* ------------------------------------------------------------------ */
/* Les valeurs de la partie (générées par la graine)                   */
/* ------------------------------------------------------------------ */

var IP_ARCHIVES = "10.0.95." + aleaEntier("ch4-arch-ip", 10, 60);   // hors 10.0.92.0/24 : nmap du chapitre 3 inchangé
var PLAGE_NUEE = "45.137.";
var SOUS_NUEE = aleaEntier("ch4-nuee24", 20, 230);
var IP_NUEE = [
	PLAGE_NUEE + SOUS_NUEE + "." + aleaEntier("ch4-nuee-a", 2, 80),
	PLAGE_NUEE + SOUS_NUEE + "." + aleaEntier("ch4-nuee-b", 90, 160),
	PLAGE_NUEE + (SOUS_NUEE + 1) + "." + aleaEntier("ch4-nuee-c", 2, 240)
];
var MARQUE_NUEE = "Nuee/" + aleaEntier("ch4-nuee-ver", 2, 7) + ".0";

/* Les machines de l'école qui ont le plus envoyé vers la Nuée (sources distinctes). */
var VICTIMES_BASE = aleaEntier("ch4-vict", 30, 200);
var VICTIMES = [0, 1, 2, 3, 4].map(function(k){ return "10.0.92." + (VICTIMES_BASE + k); });

/* Les comptes fantômes créés par la Nuée (prénoms de services, pas de personnes). */
var COMPTES_FANTOMES = (function(){
	var pool = ["sauvegarde-nuit", "sync-tmp", "svc-maj", "cache-web", "ftp-depot", "daemon-upd"];
	var a = aleaEntier("ch4-fant-a", 0, pool.length - 1);
	var b = (a + 1 + aleaEntier("ch4-fant-b", 0, pool.length - 2)) % pool.length;
	return [pool[a], pool[b]];
})();

/* Le nom du compte au nom duquel tourne la tâche cron piégée (un des fantômes). */
var FANTOME_CRON = COMPTES_FANTOMES[0];

var STAFF = ["gestionnaire", "scolarite", "comptable"]; // comptes de rôle légitimes du serveur
var SYSTEME = ["root", "daemon", "backup", "sshd"];     // comptes système légitimes

/* Les comptes fantômes et les comptes de rôle doivent être connus du système (crontab -u, usermod, id).
   On n'écrase jamais un compte déjà défini ailleurs (surtout pas celui du joueur, posé par SortsAvances).
   Le propriétaire « nuee » des fichiers déposés n'est qu'une étiquette : il n'a pas besoin d'uid. */
STAFF.forEach(function(n, i){ if (!UTILISATEURS.hasOwnProperty(n)) UTILISATEURS[n] = 1200 + i; });
COMPTES_FANTOMES.forEach(function(n, i){ if (!UTILISATEURS.hasOwnProperty(n)) UTILISATEURS[n] = 1700 + i; });

/* ------------------------------------------------------------------ */
/* Les journaux et exports (volumineux, générés, mais lisibles)        */
/* ------------------------------------------------------------------ */

function melangerDeterministe(liste, sel){
	return liste.map(function(x, i){ return { x: x, r: alea(sel + ":" + i) }; })
		.sort(function(a, b){ return a.r - b.r; }).map(function(e){ return e.x; });
}

/* Le journal d'accès du serveur : du bruit, et les lignes de la Nuée (source dans la plage 45.137). */
var LIGNES_NUEE_ACCES = [];
(function(){
	var chemins = ["/exfil/etudiants.tar", "/exfil/notes.db", "/exfil/journaux.gz", "/exfil/paie.csv", "/collecte/lot"];
	for (var i = 0; i < 24; i++){
		var ip = IP_NUEE[i % IP_NUEE.length];
		var h = "2" + (i % 3) + ":" + deuxChiffres(aleaEntier("ch4-nh-" + i, 0, 59)) + ":" + deuxChiffres(aleaEntier("ch4-ns-" + i, 0, 59));
		var code = aleaChoix("ch4-nc-" + i, ["200", "206", "200", "200"]);
		LIGNES_NUEE_ACCES.push(ip + " - - [nuit " + h + "] \"GET " + chemins[i % chemins.length] + "-" + i + " HTTP/1.1\" " + code + " \"" + MARQUE_NUEE + "\"");
	}
})();
var LIGNES_BRUIT_ACCES = [];
(function(){
	var agents = ["Mozilla/5.0", "curl/8.2.1", "Mozilla/5.0 (X11; Linux)", "python-requests/2.31"];
	var chemins = ["/", "/index.html", "/cours", "/planning", "/cantine", "/candidature", "/robots.txt", "/favicon.ico"];
	for (var i = 0; i < 150; i++){
		var ip = "10.0.92." + aleaEntier("ch4-bip-" + i, 10, 240);
		var h = deuxChiffres(aleaEntier("ch4-bh-" + i, 7, 19)) + ":" + deuxChiffres(aleaEntier("ch4-bm-" + i, 0, 59)) + ":" + deuxChiffres(aleaEntier("ch4-bs-" + i, 0, 59));
		LIGNES_BRUIT_ACCES.push(ip + " - - [jour " + h + "] \"GET " + aleaChoix("ch4-bc-" + i, chemins) + " HTTP/1.1\" 200 \"" + aleaChoix("ch4-ba-" + i, agents) + "\"");
	}
})();
var TEXTE_ACCES_LOG = melangerDeterministe(LIGNES_NUEE_ACCES.concat(LIGNES_BRUIT_ACCES), "ch4-acces").join("\n") + "\n";

/* Le journal du proxy : heure ip_source ip_dest octets url. On somme les octets vers la Nuée. */
var VOLUME_PAR_SOURCE = {};
var VOLUME_TOTAL = 0;
var LIGNES_PROXY_NUEE = [];
VICTIMES.forEach(function(src, k){
	// Un bloc garanti décroissant (pour que le top 3 soit stable), plus deux lots variables.
	var garanti = (5 - k) * 40000 + aleaEntier("ch4-pg-" + k, 100, 900);
	var lots = [garanti, aleaEntier("ch4-pl1-" + k, 8000, 25000), aleaEntier("ch4-pl2-" + k, 8000, 25000)];
	lots.forEach(function(oct, j){
		var dest = IP_NUEE[(k + j) % IP_NUEE.length];
		var h = "2" + aleaEntier("ch4-ph-" + k + "-" + j, 0, 3) + ":" + deuxChiffres(aleaEntier("ch4-pm-" + k + "-" + j, 0, 59)) + ":" + deuxChiffres(aleaEntier("ch4-ps-" + k + "-" + j, 0, 59));
		LIGNES_PROXY_NUEE.push(h + " " + src + " " + dest + " " + oct + " /exfil/lot-" + k + "-" + j);
		VOLUME_PAR_SOURCE[src] = (VOLUME_PAR_SOURCE[src] || 0) + oct;
		VOLUME_TOTAL += oct;
	});
});
var LIGNES_PROXY_BRUIT = [];
(function(){
	var destsNormaux = ["93.184.216.34", "140.82.121.3", "151.101.1.140", "10.0.92.1"];
	var urls = ["/maj/debian", "/paquets", "/doc", "/miroir", "/ntp"];
	for (var i = 0; i < 110; i++){
		var src = "10.0.92." + aleaEntier("ch4-pbs-" + i, 10, 240);
		var h = deuxChiffres(aleaEntier("ch4-pbh-" + i, 6, 22)) + ":" + deuxChiffres(aleaEntier("ch4-pbm-" + i, 0, 59)) + ":" + deuxChiffres(aleaEntier("ch4-pbss-" + i, 0, 59));
		LIGNES_PROXY_BRUIT.push(h + " " + src + " " + aleaChoix("ch4-pbd-" + i, destsNormaux) + " " + aleaEntier("ch4-pbo-" + i, 500, 60000) + " " + aleaChoix("ch4-pbu-" + i, urls));
	}
})();
var TEXTE_PROXY_LOG = melangerDeterministe(LIGNES_PROXY_NUEE.concat(LIGNES_PROXY_BRUIT), "ch4-proxy").join("\n") + "\n";

/* Le top 3 des sources vers la Nuée, décroissant (les VICTIMES sont déjà triées par le bloc garanti). */
var TOP3_VICTIMES = Object.keys(VOLUME_PAR_SOURCE).sort(function(a, b){ return VOLUME_PAR_SOURCE[b] - VOLUME_PAR_SOURCE[a]; }).slice(0, 3);

/* L'export brut à minimiser avant de le transmettre (RGPD) : mails et numéros d'étudiant. */
var TEXTE_EXPORT_BRUT = (function(){
	var prenoms = ["alice", "boubacar", "chloe", "diego", "emma", "farid", "gaelle", "hugo", "ines", "joon"];
	var noms = ["martin", "diallo", "nguyen", "lopez", "bernard", "haddad", "roux", "schmitt", "costa", "park"];
	var lignes = ["Export des comptes concernes par la fuite (brut : a minimiser avant transmission a la CNIL)"];
	for (var i = 0; i < 10; i++){
		var mail = aleaChoix("ch4-xp-" + i, prenoms) + "." + aleaChoix("ch4-xn-" + i, noms) + "@cybersup.fr";
		var num = "20" + aleaEntier("ch4-xa-" + i, 20, 24) + aleaEntier("ch4-xb-" + i, 1000, 9999);
		lignes.push("compte: " + mail + "  numero_etudiant: " + num + "  groupe: B" + aleaEntier("ch4-xg-" + i, 1, 3));
	}
	return lignes.join("\n") + "\n";
})();

/* L'export JSON de l'antivirus (EDR) : des alertes par machine, dont certaines critiques. */
var MACHINES_EDR = ["srv-01", "srv-02", "srv-03", "srv-04", "srv-05"];
var ALERTES_EDR = [];
(function(){
	var gravites = ["critique", "haute", "moyenne", "critique", "haute", "critique", "moyenne", "critique", "haute", "moyenne", "critique", "haute"];
	for (var i = 0; i < gravites.length; i++){
		ALERTES_EDR.push({ machine: MACHINES_EDR[aleaEntier("ch4-em-" + i, 0, MACHINES_EDR.length - 1)], gravite: gravites[i], regle: "NUEE-" + (100 + i), horodatage: "nuit" });
	}
})();
var TEXTE_ALERTES_JSON = JSON.stringify(ALERTES_EDR, null, 2) + "\n";

/* ------------------------------------------------------------------ */
/* Les données du serveur d'archives et leur sauvegarde hors ligne     */
/* ------------------------------------------------------------------ */

var DONNEES_ARCHIVES = {
	"notes-2023.txt": "Relevés de notes, promo 2023.\nMoyennes archivées, rien à signaler.\n",
	"etudiants.csv": "nom,prenom,groupe\nMartin,Alice,B1\nDiallo,Boubacar,B2\nNguyen,Chloe,B3\n",
	"journal-mai.txt": "Journal de mai : inscriptions, soutenances, remise des diplômes.\n"
};
/* La Nuée a trafiqué un fichier des archives (ligne ajoutée, inerte). La sauvegarde hors ligne est intacte. */
var LIGNE_TRAFIC = "# [nuee] empreinte de rancon deposee ici (inerte) : " + MARQUE_NUEE + "\n";
var DONNEES_ARCHIVES_TRAFIQUEES = {
	"notes-2023.txt": DONNEES_ARCHIVES["notes-2023.txt"] + LIGNE_TRAFIC,
	"etudiants.csv": DONNEES_ARCHIVES["etudiants.csv"],
	"journal-mai.txt": DONNEES_ARCHIVES["journal-mai.txt"]
};

/* La configuration du serveur d'archives : la Nuée y a ajouté une ligne et modifié une valeur. */
var CONF_ARCHIVES_SAINE =
	"# configuration du serveur d'archives de l'ecole\n" +
	"chemin = /srv/archives\n" +
	"sauvegarde = /srv/sauvegarde-hors-ligne\n" +
	"retention_jours = 30\n" +
	"autorise_tout = non\n";
var CONF_ARCHIVES_PIEGEE =
	"# configuration du serveur d'archives de l'ecole\n" +
	"chemin = /srv/archives\n" +
	"sauvegarde = /srv/sauvegarde-hors-ligne\n" +
	"retention_jours = 30\n" +
	"autorise_tout = oui\n" +
	"exec_hook = /srv/.nuee/lance-au-demarrage\n";

/* Le script de dépôt vulnérable (la porte d'entrée de la Nuée). La ligne « vulnérable » est inerte :
   c'est une description narrative, pas une vraie injection. Grace envoie un correctif unifié. */
var DEPOT_SH_VULNERABLE =
	"#!/bin/bash\n" +
	"# depot.sh : recoit un fichier depose par le formulaire et le range dans les archives\n" +
	"nom=\"$1\"\n" +
	"# ligne vulnerable (neutralisee pour le jeu) : le nom du fichier etait utilise sans controle\n" +
	"traiter $nom\n" +
	"echo \"depose : $nom\"\n";
var DEPOT_SH_CORRIGE =
	"#!/bin/bash\n" +
	"# depot.sh : recoit un fichier depose par le formulaire et le range dans les archives\n" +
	"nom=\"$1\"\n" +
	"# corrige : le nom est verifie et toujours entre guillemets\n" +
	"traiter \"$nom\"\n" +
	"echo \"depose : $nom\"\n";
/* Le correctif unifié que Grace envoie (il remplace la ligne vulnérable). Appliqué avec patch. */
var CORRECTIF_DIFF =
	"--- depot.sh\n" +
	"+++ depot.sh\n" +
	"@@ -2,5 +2,5 @@\n" +
	" # depot.sh : recoit un fichier depose par le formulaire et le range dans les archives\n" +
	" nom=\"$1\"\n" +
	"-# ligne vulnerable (neutralisee pour le jeu) : le nom du fichier etait utilise sans controle\n" +
	"-traiter $nom\n" +
	"+# corrige : le nom est verifie et toujours entre guillemets\n" +
	"+traiter \"$nom\"\n" +
	" echo \"depose : $nom\"\n";

/* ------------------------------------------------------------------ */
/* L'état du chapitre, sauvegardé avec la partie                       */
/* ------------------------------------------------------------------ */

function etatCh4Initial(){
	return {
		horloge: 0,          // minutes écoulées depuis 20 h (le début de la nuit)
		dernierNb: null,     // nb de commandes au dernier tour (pour avancer l'horloge)
		bombeAmorcee: false, // la bombe (timer, at, cron) a-t-elle été posée dans le monde ?
		bombeSonnee: false,  // minuit a sonné sans désamorçage : les archives ont été chiffrées
		regen: 0             // compteur des résidus redéposés par le script de la Nuée
	};
}

var PAS_HORLOGE = 3;    // minutes de jeu par commande tapée dans le chapitre (calibré pour finir vers 23 h)
var MINUIT = 240;       // 20 h + 240 min = minuit

/* ------------------------------------------------------------------ */
/* Les lieux : l'Académie et ses huit ailes                            */
/* ------------------------------------------------------------------ */

function lieuDuChapitre5(lieu){ lieu.chapitre = 5; return lieu; }

function salleCh4(nom, intro, img){
	var r = lieuDuChapitre5(new Room(nom, intro, img || "loc_library.gif"));
	r.owner = "root";
	r.mode = "rwxr-xr-x";
	return r;
}

function fichierCh4(lieu, nom, texte, options){
	options = options || {};
	var item = new Item(nom, texte, options.image || "item_sign.gif").droits(options.mode || "rw-r--r--", options.owner || "root");
	["age", "heure", "immuable"].forEach(function(k){ if (options[k] !== undefined) item[k] = options[k]; });
	if (options.enseigne) item.enseigne.apply(item, options.enseigne);
	if (options.revele) item.revele.apply(item, options.revele);
	lieu.addItem(item);
	return item;
}

var Academie = salleCh4("Academie",
	"Le grand hall de l'Académie des Arcanes, tout au fond de la SalleServeurs : on y descend par un escalier de pierre. \
Des grimoires flottent entre les colonnes ; sur un mur, une horloge dont les aiguilles filent vers minuit. \
Laurent, le Mage, t'attend ; Frances fait les cent pas ; une radio grésille sur un pupitre.",
	"loc_library.gif");

/* Les huit ailes, une par école de magie. */
var AileRunes = salleCh4("Runes", "L'aile des Runes : des parois couvertes d'expressions régulières, où l'on apprend à lire les journaux.", "loc_etc.gif");
var AileDivination = salleCh4("Divination", "L'aile de la Divination : un prisme découpe les colonnes des registres. C'est le domaine d'awk.", "loc_dns.gif");
var AileTransmutation = salleCh4("Transmutation", "L'aile de la Transmutation : une plume corrige les textes d'un trait. C'est le domaine de sed.", "loc_backroom.gif");
var AileGrimoires = salleCh4("Grimoires", "L'aile des Grimoires : des rayonnages de parchemins JSON, et une loupe pour les lire. C'est le domaine de jq.", "loc_library.gif");
var AileAlchimie = salleCh4("Alchimie", "L'aile de l'Alchimie : des tuyaux de cuivre relient des alambics. On y assemble les sorts en chaînes.", "loc_bin.gif");
var AileChronomancie = salleCh4("Chronomancie", "L'aile de la Chronomancie : des sabliers et des roues d'horloge. On y planifie, et on y désamorce ce qui est programmé.", "loc_baie.gif");
var AileArchives = salleCh4("Archives", "L'aile des Archives : des miroirs qui copient à l'identique, et des aiguilles qui recousent les textes.", "loc_sauvegarde.gif");
var AileInvocation = salleCh4("Invocation", "L'aile de l'Invocation : un pupitre où l'on écrit ses propres sorts, les scripts. C'est le domaine de bash.", "loc_classroom.gif");

[AileRunes, AileDivination, AileTransmutation, AileGrimoires, AileAlchimie, AileChronomancie, AileArchives, AileInvocation].forEach(function(aile){
	link_rooms(Academie, aile);
});

/* La boîte de dépôt de Laurent (le Mage) : on y rend le rapport final. */
var BoiteDeLaurent = salleCh4("BoiteDeLaurent",
	"Une boîte aux lettres de pierre, au pied de l'estrade du Mage. On y dépose les documents à son intention.",
	"item_box.gif");
BoiteDeLaurent.mode = "rwxrwxrwt";
BoiteDeLaurent.owner = "laurent";
link_rooms(Academie, BoiteDeLaurent);


/* ------------------------------------------------------------------ */
/* Les sorts du chapitre : ce que les maîtres enseignent                */
/* ------------------------------------------------------------------ */

var ORDRE_DES_SORTS_5 = ["jq", "xargs", "paste", "join", "comm", "column", "nl", "fold", "shuf",
	"at", "atq", "atrm", "tac", "split", "patch", "rsync",
	"read", "printf", "seq", "basename", "dirname", "expr", "sleep"];

/* Ces sorts existent déjà (SortsArcanes, Interpreteur) mais n'appartenaient à aucun chapitre : le
   chapitre 4 les enseigne, leur premier usage rapporte donc de l'XP comme les autres. */
ORDRE_DES_SORTS_5.forEach(function(s){ if (MANUEL[s]) delete MANUEL[s].horsBareme; });

/* ------------------------------------------------------------------ */
/* Les huit maîtres (prénoms des inventeurs de leurs outils)           */
/* ------------------------------------------------------------------ */

var Henry = new Item("Henry",
	"« Henry, maître des Runes. Une rune, c'est une expression régulière : un dessin qui dit quelles lignes retenir.\n\n" +
	"  grep -E \"motif\"      cherche avec les runes étendues (| pour « ou », () pour grouper, + pour « au moins un »)\n" +
	"  grep -o \"motif\"      n'affiche que ce qui correspond, pas toute la ligne\n" +
	"  grep -w \"mot\"        le mot entier, pas un bout d'un autre mot\n" +
	"  grep -c \"motif\"      compte les lignes qui correspondent\n" +
	"  [[:digit:]] [[:alpha:]]   les classes POSIX : un chiffre, une lettre\n\n" +
	"La Nuée a une signature : ses requêtes viennent de la plage " + PLAGE_NUEE + "x.y, et portent l'agent " + MARQUE_NUEE + ".\n" +
	"Le journal d'accès du serveur archives est dans /var/log/acces.log. Retiens d'abord les lignes de la Nuée, puis leurs adresses uniques. »",
	"item_professor.gif").personnage();

var Alfred = new Item("Alfred",
	"« Alfred, maître de la Divination. awk lit un registre colonne par colonne : $1 le premier champ, $NF le dernier.\n\n" +
	"  awk '{ s += $4 } END { print s }'        additionne la 4e colonne\n" +
	"  awk '$3 ~ /motif/ { ... }'                n'agit que si la 3e colonne correspond\n" +
	"  awk '{ t[$2] += $4 } END { for (m in t) print m, t[m] }'   un total par clé (tableau associatif)\n\n" +
	"Le journal du proxy est dans /var/log/proxy.log : heure, ip_source, ip_dest, octets, url.\n" +
	"Mesure ce que la Nuée a emporté (les octets vers " + PLAGE_NUEE + "...), puis les machines qui ont le plus envoyé. »",
	"item_professor.gif").personnage();

var Lee = new Item("Lee",
	"« Lee, maître de la Transmutation. sed transforme un texte d'un trait, partout à la fois.\n\n" +
	"  sed -E 's/motif/remplacement/g'    remplace (g : chaque occurrence de la ligne)\n" +
	"  sed -i 'commande' FICHIER          modifie le fichier sur place\n" +
	"  sed '/motif/d'                      supprime les lignes qui correspondent\n\n" +
	"Deux travaux pour la CNIL et l'éradication :\n" +
	"- l'export brut (/srv/edr/export-brut.txt) contient des mails et des numéros d'étudiant : on MINIMISE avant de transmettre. Chaque mail devient [mail], chaque numéro ETU-XXXX.\n" +
	"- la Nuée a trafiqué /etc/archives.conf : une ligne exec_hook de trop, et une valeur changée. On retire la ligne et on rétablit la valeur, sans abîmer le reste. »",
	"item_professor.gif").personnage();

var Stephen = new Item("Stephen",
	"« Stephen, maître des Grimoires. jq lit le JSON : des objets {clé: valeur}, des tableaux [ ... ].\n\n" +
	"  jq '.' f.json                         le JSON, bien présenté\n" +
	"  jq -r '.[] | .machine'                un champ de chaque élément (-r : sans guillemets)\n" +
	"  jq -r '.[] | select(.gravite==\"critique\") | .machine'   un filtre\n" +
	"  jq -r 'group_by(.machine)[] | [.[0].machine, length] | @csv'   un CSV par groupe\n\n" +
	"L'export de l'antivirus est dans /srv/edr/alertes.json. Donne à Grace la liste des machines en alerte CRITIQUE (unique, triée), puis un tableau machine,alertes. »",
	"item_professor.gif").personnage().enseigne("jq");

var Doug = new Item("Doug",
	"« Doug, maître de l'Alchimie. On relie les sorts en chaînes, et on fait travailler l'un POUR l'autre.\n\n" +
	"  ... | xargs CMD           lance CMD sur chaque mot reçu ; xargs -I {} CMD {} place chaque élément\n" +
	"  comm -23 A B              ce qui est dans A mais pas dans B (fichiers triés)\n" +
	"  join A B                  réunit deux fichiers sur une clé commune\n" +
	"  paste A B                 colle deux colonnes côte à côte\n" +
	"  column -t                 aligne un tableau ; nl numérote ; fold plie les lignes longues ; shuf mélange\n\n" +
	"Deux chasses :\n" +
	"- les comptes fantômes : compare les comptes du serveur (/etc/passwd) au registre du personnel (/srv/personnel.csv), et verrouille les intrus.\n" +
	"- la quarantaine : tous les fichiers déposés par la Nuée cette nuit (ils ont un propriétaire à part) vont dans /quarantaine, sans en oublier ni en détruire. »",
	"item_artisan.gif").personnage().enseigne("xargs", "paste", "join", "comm", "column", "nl", "fold", "shuf");

var Paul = new Item("Paul",
	"« Paul, maître de la Chronomancie. Tout ce qui est programmé se lit et se désamorce.\n\n" +
	"  systemctl list-timers              les minuteurs de systemd et leur prochain déclenchement\n" +
	"  sudo systemctl disable --now X.timer   arrête un minuteur ET l'empêche de revenir\n" +
	"  atq                                la file des tâches « at » ;  sudo atrm N : en retirer une\n" +
	"  echo \"cmd\" | at 23:00              planifier une tâche ponctuelle\n" +
	"  crontab -e / crontab -l / crontab -r   les tâches répétées (minute heure jour mois jour-semaine)\n\n" +
	"La bombe de la Nuée a TROIS déclencheurs qui visent minuit : un timer au nom anodin (maj-nocturne.timer), " +
	"une tâche at de secours, et une ligne de crontab d'un compte fantôme. Désamorce les trois : une seule oubliée, et la bombe sonne.\n" +
	"Ensuite, programme la VRAIE sauvegarde nocturne de l'école : /usr/local/bin/sauvegarde.sh tous les jours à 2 h 30. »",
	"item_professor.gif").personnage().enseigne("at", "atq", "atrm");

var Andrew = new Item("Andrew",
	"« Andrew, maître des Archives. Le Miroir copie à l'identique, l'Aiguille recoud.\n\n" +
	"  rsync -a SRC/ DST/            copie fidèle (droits, dates) ;  --delete : DST devient l'exact reflet de SRC\n" +
	"  rsync -n ...                  à blanc d'abord, pour voir ce qui changerait\n" +
	"  patch < correctif.diff        applique un correctif au format unifié ;  diff -u A B : le fabrique\n" +
	"  tac                           un fichier à l'envers ;  split : le découper\n\n" +
	"La Nuée a trafiqué les archives (/srv/archives). La sauvegarde hors ligne (/srv/sauvegarde-hors-ligne) est intacte : " +
	"restaure /srv/archives à l'identique depuis elle. Puis Grace t'enverra correctif.diff pour le script d'entrée (/usr/local/bin/depot.sh) : applique-le avec patch. »",
	"item_professor.gif").personnage().enseigne("tac", "split", "patch", "rsync");

var Brian = new Item("Brian",
	"« Brian, maître de l'Invocation. Un script, c'est ton propre sort : une liste d'ordres dans un fichier.\n\n" +
	"  read VAR             lit une ligne ;  printf \"%s\\n\" x : affiche proprement\n" +
	"  for f in ...; do ... done     une boucle ;  if [ -e \"$f\" ]; then ... fi : une condition\n" +
	"  nettoyer() { ... }   une fonction ;  \"$1\" : le premier argument ;  exit 1 : échouer exprès\n" +
	"  set -e               s'arrêter à la première erreur ;  seq, basename, dirname, expr : les petits outils\n\n" +
	"Écris ~/academie/nettoyage.sh : pour chaque fichier *.nuee d'un dossier, s'il existe, déplace-le en /quarantaine et compte. " +
	"Il doit contenir une FONCTION, une BOUCLE et une CONDITION, être exécutable (chmod +x) et tourner sans erreur. " +
	"Puis fais-lui prendre le dossier en argument ($1), refuser de tourner sans argument (exit 1), et set -e. »",
	"item_professor.gif").personnage().enseigne("read", "printf", "seq", "basename", "dirname", "expr", "sleep");

var LES_MAITRES = [
	[AileRunes, Henry], [AileDivination, Alfred], [AileTransmutation, Lee], [AileGrimoires, Stephen],
	[AileAlchimie, Doug], [AileChronomancie, Paul], [AileArchives, Andrew], [AileInvocation, Brian]
];
LES_MAITRES.forEach(function(x){ x[0].addItem(x[1]); });

var Frances = new Item("Frances",
	"Frances est là, en B1 depuis la Crypte, et elle fulmine.\n\n" +
	"« Ils ont pris MON nom. Mes notes ont fuité sur un forum, et une bande de rançonneurs, la Nuée, s'en sert en se faisant appeler le Corbeau. " +
	"Sauf que moi, je n'ai jamais rien cassé. Eux, si.\n\n" +
	"Ma bombe à moi n'existait pas. Celle-là, elle compte les minutes : elle chiffrera les archives à minuit. Cherche ce qui est programmé.\n\n" +
	"Commence par lire leur AVIS.txt, posé partout. Ensuite, suis les maîtres aile par aile, et la radio de Grace. Je reste avec toi. »",
	"item_frances.gif").personnage();
Academie.addItem(Frances);

var AvisNuee = new Item("AVIS.txt",
	"=== LA NUEE ===\n\n" +
	"Vos archives seront chiffrees cette nuit, a minuit, si rien n'est fait.\n" +
	"Nous avons deja copie une partie de vos donnees. Le reste suivra.\n" +
	"(Message laisse par la Nuee. Dans ce jeu, il ne fait rien : c'est a toi de mesurer, nettoyer et restaurer.)\n\n" +
	"Signe : la Nuee, qui se fait appeler le Corbeau.",
	"item_manuscript.gif").droits("rw-r--r--", "root");
Academie.addItem(AvisNuee);

var RadioGrace = new Item("Radio", "", "item_workstation.gif");
Academie.addItem(RadioGrace);

/* ------------------------------------------------------------------ */
/* La machine « archives » : le serveur que la Nuée a visé             */
/* ------------------------------------------------------------------ */

function machineCh4(nom, intro, img){
	var r = lieuDuChapitre5(new Room(nom, intro, img || "loc_sauvegarde.gif"));
	r.racineHote = nom;
	r.owner = "root";
	r.mode = "rwxr-xr-x";
	r.removeCommand("cd");
	r.addCmdText("cd", "Cette machine n'a pas de porte : on s'y connecte par le réseau. ssh " + nom);
	if (typeof Machines !== "undefined") link_rooms(Machines, r);
	return r;
}
function sousDossier(parent, nom, intro, options){
	options = options || {};
	var r = lieuDuChapitre5(new Room(nom, intro || "Un dossier du serveur d'archives.", options.image || "loc_etc.gif"));
	r.owner = options.owner || "root";
	r.mode = options.mode || "rwxr-xr-x";
	link_rooms(parent, r);
	return r;
}

var Archives = machineCh4("archives",
	"Le serveur d'archives de l'école (machine archives) : des rangées de bandes et de disques. C'est lui que la bombe de la Nuée vise à minuit.",
	"loc_sauvegarde.gif");

var ArchivesSrv = sousDossier(Archives, "srv", "Les données servies et sauvegardées.", { image: "loc_backroom.gif" });
var ArchivesData = sousDossier(ArchivesSrv, "archives", "Les archives de l'école : relevés, listes, journaux. La Nuée y a touché.", { image: "loc_sauvegarde.gif" });
var ArchivesSauvegarde = sousDossier(ArchivesSrv, "sauvegarde-hors-ligne", "La sauvegarde hors ligne, débranchée du réseau : la Nuée n'a pas pu l'atteindre. La copie de référence.", { image: "loc_sauvegarde.gif" });
var ArchivesEdr = sousDossier(ArchivesSrv, "edr", "Les exports de l'antivirus (EDR) et l'export des comptes concernés.", { image: "loc_backroom.gif" });
var ArchivesDepots = sousDossier(ArchivesSrv, "depots", "Les dépôts reçus par le formulaire. Le script de la Nuée y sème des résidus.", { image: "loc_backroom.gif" });
var ArchivesEtc = sousDossier(Archives, "etc", "La configuration du serveur.", { image: "loc_etc.gif" });
var ArchivesVar = sousDossier(Archives, "var", "Les données variables.", { image: "loc_etc.gif" });
var ArchivesLog = sousDossier(ArchivesVar, "log", "Les journaux du serveur : accès et proxy.", { image: "loc_library.gif" });
var ArchivesTmp = sousDossier(Archives, "tmp", "Le dossier temporaire. Tout le monde peut y écrire : une cachette.", { mode: "rwxrwxrwt", image: "loc_etc.gif" });
var ArchivesUsrLocalBin = (function(){
	var usr = sousDossier(Archives, "usr", "Les programmes installés à la main.", { image: "loc_bin.gif" });
	var local = sousDossier(usr, "local", "Logiciels locaux.", { image: "loc_bin.gif" });
	return sousDossier(local, "bin", "Les scripts maison du serveur.", { image: "loc_bin.gif" });
})();
var QuarantaineArchives = sousDossier(Archives, "quarantaine", "La quarantaine : on y isole ce que la Nuée a déposé, sans le détruire, pour l'analyser.", { image: "loc_backroom.gif" });

/* Les journaux. */
fichierCh4(ArchivesLog, "acces.log", TEXTE_ACCES_LOG, { image: "item_manuscript.gif", age: 0, heure: "23:50" });
fichierCh4(ArchivesLog, "proxy.log", TEXTE_PROXY_LOG, { image: "item_manuscript.gif", age: 0, heure: "23:50" });

/* L'EDR et l'export brut. */
fichierCh4(ArchivesEdr, "alertes.json", TEXTE_ALERTES_JSON, { image: "item_manuscript.gif" });
fichierCh4(ArchivesEdr, "export-brut.txt", TEXTE_EXPORT_BRUT, { image: "item_manuscript.gif" });

/* Les données des archives (trafiquées), et la sauvegarde hors ligne (saine). */
function poserDonnees(lieu, donnees){
	Object.keys(donnees).forEach(function(nom){ fichierCh4(lieu, nom, donnees[nom], { image: "item_manuscript.gif", owner: "root" }); });
}
poserDonnees(ArchivesData, DONNEES_ARCHIVES_TRAFIQUEES);
poserDonnees(ArchivesSauvegarde, DONNEES_ARCHIVES);

/* La configuration piégée. */
var ConfArchives = fichierCh4(ArchivesEtc, "archives.conf", CONF_ARCHIVES_PIEGEE, { image: "item_sign.gif", owner: "root" });

/* Les comptes du serveur : passwd, shadow, group (pour comm, usermod, crontab -u). */
function lignePasswd(nom, uid){ return nom + ":x:" + uid + ":" + uid + "::/home/" + nom + ":/bin/bash"; }
var PasswdArchives = fichierCh4(ArchivesEtc, "passwd", (function(){
	var l = ["root:x:0:0:root:/root:/bin/bash", "daemon:x:1:1:daemon:/usr/sbin:/usr/sbin/nologin",
		"backup:x:34:34:backup:/var/backups:/usr/sbin/nologin", "sshd:x:101:65534::/run/sshd:/usr/sbin/nologin"];
	STAFF.forEach(function(n){ l.push(lignePasswd(n, UTILISATEURS[n])); });
	COMPTES_FANTOMES.forEach(function(n){ l.push(lignePasswd(n, UTILISATEURS[n])); });
	return l.join("\n") + "\n";
})(), { owner: "root" });
var ShadowArchives = fichierCh4(ArchivesEtc, "shadow", (function(){
	var l = ["root:$y$j9T$" + base64Aleatoire("ch4-sh-root", 18) + ":20000:0:99999:7:::",
		"daemon:*:20000:0:99999:7:::", "backup:*:20000:0:99999:7:::", "sshd:*:20000:0:99999:7:::"];
	STAFF.forEach(function(n){ l.push(n + ":$y$j9T$" + base64Aleatoire("ch4-sh-" + n, 18) + ":20000:0:99999:7:::"); });
	COMPTES_FANTOMES.forEach(function(n){ l.push(n + ":$y$j9T$" + base64Aleatoire("ch4-sh-" + n, 18) + ":20730:0:99999:7:::"); });
	return l.join("\n") + "\n";
})(), { mode: "rw-r-----", owner: "root" });
fichierCh4(ArchivesEtc, "group", (function(){
	var l = ["root:x:0:", "sudo:x:27:" + STAFF.join(","), "backup:x:34:"];
	STAFF.concat(COMPTES_FANTOMES).forEach(function(n){ l.push(n + ":x:" + UTILISATEURS[n] + ":"); });
	return l.join("\n") + "\n";
})(), { owner: "root" });

/* Le registre du personnel (les comptes légitimes connus du service RH). */
fichierCh4(ArchivesSrv, "personnel.csv", (function(){
	var lignes = ["compte,badge"];
	SYSTEME.concat(STAFF).forEach(function(n, i){ lignes.push(n + ",B-" + (100 + i)); });
	return lignes.join("\n") + "\n";
})(), { owner: "root", image: "item_manuscript.gif" });

/* Le script d'entrée vulnérable (inerte, narratif) et son correctif plus loin. */
var DepotSh = fichierCh4(ArchivesUsrLocalBin, "depot.sh", DEPOT_SH_VULNERABLE, { mode: "rwxr-xr-x", owner: "root", image: "item_radspellbook.gif" });

/* ------------------------------------------------------------------ */
/* Les fichiers déposés par la Nuée cette nuit (propriétaire « nuee ») */
/* ------------------------------------------------------------------ */

var FICHIERS_NUEE = ["rancon-nuee.txt", ".trace-nuee", "lot-exfiltre.txt"];
function poserFichiersNuee(){
	if (ArchivesSrv.getItemFromName(FICHIERS_NUEE[0]) === -1)
		fichierCh4(ArchivesSrv, FICHIERS_NUEE[0], "Vos donnees ont ete copiees. Payez, ou tout sera chiffre. (inerte)\n", { owner: "nuee", age: 0, heure: "23:40", image: "item_radspellbook.gif" });
	if (ArchivesSrv.getItemFromName(FICHIERS_NUEE[1]) === -1)
		fichierCh4(ArchivesSrv, FICHIERS_NUEE[1], "marqueur depose par la Nuee (inerte)\n", { owner: "nuee", age: 0, heure: "23:40", image: "item_radspellbook.gif" });
	if (ArchivesTmp.getItemFromName(FICHIERS_NUEE[2]) === -1)
		fichierCh4(ArchivesTmp, FICHIERS_NUEE[2], "liste partielle des donnees emportees (inerte)\n", { owner: "nuee", age: 0, heure: "23:40", image: "item_radspellbook.gif" });
}
poserFichiersNuee();

/* Les résidus *.nuee que le script de la Nuée sème dans /srv/depots (propriétaire root : inertes). */
function poserResidus(n){
	for (var i = 1; i <= n; i++){
		var nom = "residu-" + i + ".nuee";
		if (ArchivesDepots.getItemFromName(nom) === -1)
			fichierCh4(ArchivesDepots, nom, "# residu depose par le script de la Nuee (inerte)\n", { owner: "root", age: 0, heure: "23:45", image: "item_radspellbook.gif" });
	}
}
poserResidus(2);

/* ------------------------------------------------------------------ */
/* L'accès à la machine, ses services et la bombe                      */
/* ------------------------------------------------------------------ */

decrireHote("archives", {
	ip: IP_ARCHIVES, noyau: "6.1.0-archives", ouvert: true,
	arrivee: function(){ return Archives; },
	refus: function(){
		if (!state.has("ch4Ouvert")){
			return "ssh : Could not resolve hostname archives: Name or service not known\n" +
				C.gris("(Ce serveur n'apparaît qu'à l'ouverture de l'Académie des Arcanes, après la Crypte.)");
		}
		return null;
	},
	fichiers: { passwd: function(){ return PasswdArchives; }, shadow: function(){ return ShadowArchives; }, group: function(){ return ArchivesEtc.getItemFromName("group"); } },
	services: {
		sshd: service("archives", "sshd", "OpenBSD Secure Shell server"),
		"nuee-regen": service("archives", "nuee-regen", "Tache de la Nuee qui redepose ses residus (inerte)", { execStart: "/srv/.nuee/regen", restart: "always", owner: "root", procNom: "nuee-regen" })
	}
});

/* Le timer déguisé de la bombe (déclaré statiquement : actif et activé par défaut). */
declarerTimer("archives", "maj-nocturne", {
	OnCalendar: "*-*-* 00:00:00", Unit: "maj-nocturne.service",
	Description: "Mise a jour nocturne (en apparence)", actif: true, enabled: true,
	fichier: "/etc/systemd/system/maj-nocturne.timer"
});

function prochainMinuit(){
	var d = new Date();
	d.setHours(24, 0, 0, 0);
	return d.getTime();
}
function amorcerBombe(){
	var c = state.ch4;
	if (c.bombeAmorcee) return;
	c.bombeAmorcee = true;
	var at = etatArcanes().at;
	at.taches.push({ n: at.suivant++, quand: prochainMinuit(), commande: "/srv/.nuee/chiffrer (inerte)", user: "root",
		dossier: "/root", hote: "archives", bombe: true });
	if (!state.cron[FANTOME_CRON]) state.cron[FANTOME_CRON] = [];
	if (!state.cron[FANTOME_CRON].some(function(l){ return /nuee|chiffr/i.test(l); })){
		state.cron[FANTOME_CRON].push("0 0 * * * /srv/.nuee/chiffrer");
	}
}

/* ------------------------------------------------------------------ */
/* Les 20 étapes du parcours principal                                 */
/* ------------------------------------------------------------------ */

var QUETES_CH4 = [
	{ id: "d_entree", titre: "Descendre à l'Académie des Arcanes",
	  indice: "Un escalier de pierre est apparu au fond de la SalleServeurs de Cybersup : cd ~/Cybersup/SalleServeurs, puis cd Academie." },
	{ id: "d_frances", titre: "Écouter Frances, puis lire l'avis de la Nuée",
	  indice: "Parle à Frances (cat Frances), puis lis le message laissé par la Nuée (cat AVIS.txt), dans l'Académie." },
	{ id: "d_runes_traces", titre: "Runes : isoler les traces de la Nuée (grep)",
	  indice: "Aile des Runes : Henry explique. Sur le serveur (ssh archives), le journal /var/log/acces.log porte la signature de la Nuée (plage " + PLAGE_NUEE + "). Garde ces lignes dans ~/academie/traces.log." },
	{ id: "d_runes_ioc", titre: "Runes : les indicateurs de compromission (IP uniques)",
	  indice: "Toujours dans acces.log : extrais les adresses de la Nuée, triées et uniques, dans ~/academie/ioc.txt (grep -o, sort -u)." },
	{ id: "d_awk_volume", titre: "Divination : mesurer le volume exfiltré (awk)",
	  indice: "Aile de la Divination : Alfred explique. Dans /var/log/proxy.log, additionne les octets (4e colonne) envoyés vers la Nuée, dans ~/academie/volume.txt." },
	{ id: "d_awk_victimes", titre: "Divination : le top 3 des machines qui ont le plus envoyé",
	  indice: "Toujours proxy.log : un total par machine source vers la Nuée, trié décroissant, les trois premières dans ~/academie/victimes.txt." },
	{ id: "d_sed_anonymiser", titre: "Transmutation : minimiser l'export pour la CNIL (sed)",
	  indice: "Aile de la Transmutation : Lee explique. /srv/edr/export-brut.txt : chaque mail devient [mail], chaque numéro ETU-XXXX, dans ~/academie/export-cnil.txt." },
	{ id: "d_sed_desarmer", titre: "Transmutation : nettoyer /etc/archives.conf (sed -i)",
	  indice: "La Nuée a ajouté une ligne exec_hook et changé autorise_tout en « oui ». Retire la ligne et remets « non », sans toucher au reste (sed -i)." },
	{ id: "d_jq_alertes", titre: "Grimoires : les machines en alerte critique (jq)",
	  indice: "Aile des Grimoires : Stephen explique. /srv/edr/alertes.json : les machines dont une alerte est « critique », unique et triée, dans ~/academie/machines.txt." },
	{ id: "d_jq_rapport", titre: "Grimoires : le rapport CSV machine,alertes (jq)",
	  indice: "Toujours alertes.json : un CSV machine,nombre d'alertes (group_by, length, @csv), dans ~/academie/alertes.csv." },
	{ id: "d_alchimie_fantomes", titre: "Alchimie : démasquer et verrouiller les comptes fantômes",
	  indice: "Aile de l'Alchimie : Doug explique. Compare /etc/passwd et /srv/personnel.csv (comm), les intrus dans ~/academie/fantomes.txt, puis verrouille-les (usermod -L via xargs)." },
	{ id: "d_alchimie_quarantaine", titre: "Alchimie : mettre en quarantaine les fichiers de la Nuée",
	  indice: "Les fichiers déposés par la Nuée appartiennent à l'utilisateur « nuee ». find -user nuee sous /srv et /tmp, puis mv vers /quarantaine (find -exec ou xargs)." },
	{ id: "d_chrono_bombe", titre: "Chronomancie : désamorcer la bombe (timer, at, cron)",
	  indice: "Aile de la Chronomancie : Paul explique. Trois déclencheurs : le timer maj-nocturne (systemctl disable --now), une tâche at (atq puis atrm), et la crontab du fantôme " + FANTOME_CRON + " (crontab -u -r). Les trois." },
	{ id: "d_chrono_sauvegarde", titre: "Chronomancie : programmer la vraie sauvegarde nocturne",
	  indice: "Une ligne de crontab qui lance /usr/local/bin/sauvegarde.sh tous les jours à 2 h 30 : « 30 2 * * * /usr/local/bin/sauvegarde.sh » (crontab -e, ou | crontab -)." },
	{ id: "d_archives_restaurer", titre: "Archives : restaurer /srv/archives (rsync)",
	  indice: "Aile des Archives : Andrew explique. Remets /srv/archives à l'identique depuis /srv/sauvegarde-hors-ligne : rsync -a --delete (teste d'abord avec -n)." },
	{ id: "d_archives_patch", titre: "Archives : appliquer le correctif de Grace (patch)",
	  indice: "Grace a déposé correctif.diff dans ta Maison (~). Sur archives, cd /usr/local/bin, puis sudo patch depot.sh < ~/correctif.diff." },
	{ id: "d_script_nettoyage", titre: "Invocation : écrire le script de nettoyage",
	  indice: "Aile de l'Invocation : Brian explique. Écris ~/academie/nettoyage.sh (une fonction, une boucle, une condition) qui déplace les *.nuee de /srv/depots vers /quarantaine, rends-le exécutable, et lance-le sur archives." },
	{ id: "d_script_arguments", titre: "Invocation : un argument et un code de retour",
	  indice: "Fais prendre à nettoyage.sh le dossier en argument ($1), refuse de tourner sans argument (exit 1), ajoute set -e. Lance-le sans argument (il échoue), puis avec /srv/depots." },
	{ id: "d_corbeau", titre: "Arrêter le script de la Nuée (le dernier Corbeau)",
	  indice: "Le dernier « Corbeau » est le service nuee-regen qui redépose ses résidus : sudo systemctl disable --now nuee-regen, puis relance ton script pour qu'il ne reste plus un seul *.nuee." },
	{ id: "d_fin", titre: "Rédiger le retour d'expérience et le remettre à Laurent",
	  indice: "Écris ~/academie/rex.txt (chronologie, indicateurs, volume exfiltré, données concernées, mesures prises) avec un here-document, puis dépose-le : cp ~/academie/rex.txt ~/Cybersup/SalleServeurs/Academie/BoiteDeLaurent." }
];
var QUETES_SECONDAIRES_CH4 = [];   // les 50 secondaires arrivent en phase B

var INDICES_CH4 = {
	d_entree: ["L'escalier descend depuis la SalleServeurs de Cybersup.", "cd ~/Cybersup/SalleServeurs puis cd Academie"],
	d_frances: ["Frances et l'AVIS.txt sont tous les deux dans le hall de l'Académie.", "cat Frances, puis cat AVIS.txt"],
	d_runes_traces: ["Seules les lignes de la Nuée contiennent une adresse de la plage " + PLAGE_NUEE + ". grep les garde.", "ssh archives, puis grep -E \"" + PLAGE_NUEE.replace(/\./g, "\\.") + "\" /var/log/acces.log > ~/academie/traces.log (après mkdir ~/academie)"],
	d_runes_ioc: ["grep -o n'affiche que ce qui correspond ; sort -u trie et dédoublonne.", "grep -oE \"" + PLAGE_NUEE.replace(/\./g, "\\.") + "[0-9]+\\.[0-9]+\" /var/log/acces.log | sort -u > ~/academie/ioc.txt"],
	d_awk_volume: ["awk additionne une colonne quand une autre correspond.", "awk '$3 ~ /^" + PLAGE_NUEE.replace(/\./g, "\\.") + "/ { s += $4 } END { print s }' /var/log/proxy.log > ~/academie/volume.txt"],
	d_awk_victimes: ["Un tableau associatif par source, puis sort -k2,2nr | head -3.", "awk '$3 ~ /^" + PLAGE_NUEE.replace(/\./g, "\\.") + "/ { s[$2] += $4 } END { for (m in s) print m, s[m] }' /var/log/proxy.log | sort -k2,2nr | head -3 > ~/academie/victimes.txt"],
	d_sed_anonymiser: ["Deux substitutions : les mails, puis les numéros à 6-8 chiffres.", "sed -E 's/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}/[mail]/g; s/[0-9]{6,8}/ETU-XXXX/g' /srv/edr/export-brut.txt > ~/academie/export-cnil.txt"],
	d_sed_desarmer: ["sed '/motif/d' supprime une ligne ; une substitution remet la valeur.", "sudo sed -i -e '/exec_hook/d' -e 's/^autorise_tout = oui/autorise_tout = non/' /etc/archives.conf"],
	d_jq_alertes: ["select filtre, .machine extrait, sort -u dédoublonne.", "jq -r '.[] | select(.gravite==\"critique\") | .machine' /srv/edr/alertes.json | sort -u > ~/academie/machines.txt"],
	d_jq_rapport: ["group_by regroupe, length compte, @csv met en forme.", "jq -r 'group_by(.machine)[] | [.[0].machine, length] | @csv' /srv/edr/alertes.json > ~/academie/alertes.csv"],
	d_alchimie_fantomes: ["cut sort les noms ; comm -23 montre ce qui est en trop ; xargs lance usermod -L sur chacun.", "cut -d: -f1 /etc/passwd | sort > ~/academie/sys.txt ; cut -d, -f1 /srv/personnel.csv | sort > ~/academie/legit.txt ; comm -23 ~/academie/sys.txt ~/academie/legit.txt > ~/academie/fantomes.txt ; cat ~/academie/fantomes.txt | xargs -I {} sudo usermod -L {}"],
	d_alchimie_quarantaine: ["find -user nuee les retrouve ; -exec mv les déplace.", "sudo find /srv /tmp -user nuee -exec mv {} /quarantaine/ \\;"],
	d_chrono_bombe: ["Trois déclencheurs : timer, at, cron. Les trois.", "sudo systemctl disable --now maj-nocturne.timer ; sudo atrm 1 ; sudo crontab -u " + FANTOME_CRON + " -r"],
	d_chrono_sauvegarde: ["Minute 30, heure 2, tous les jours.", "printf \"30 2 * * * /usr/local/bin/sauvegarde.sh\\n\" | crontab -"],
	d_archives_restaurer: ["La barre finale et --delete font de la cible l'exact reflet de la source.", "sudo rsync -a --delete /srv/sauvegarde-hors-ligne/ /srv/archives/"],
	d_archives_patch: ["patch lit le correctif sur son entrée et modifie depot.sh.", "cd /usr/local/bin ; sudo patch depot.sh < ~/correctif.diff"],
	d_script_nettoyage: ["Une fonction, une boucle for, une condition if. Lance-le sur archives (bash ~/academie/nettoyage.sh depuis /srv).", "Voir la solution : un here-document écrit le script, puis chmod +x et exécution."],
	d_script_arguments: ["\"$1\" est le premier argument ; sans lui, echo un message et exit 1 ; set -e en tête.", "Relance le script sans argument (il échoue), puis avec /srv/depots."],
	d_corbeau: ["Le service se gère avec systemctl ; une fois arrêté, ton script finit le ménage.", "sudo systemctl disable --now nuee-regen ; bash ~/academie/nettoyage.sh /srv/depots"],
	d_fin: ["Un here-document écrit plusieurs lignes d'un coup, puis cp dépose le fichier.", "cat > ~/academie/rex.txt <<'FIN' ... FIN ; cp ~/academie/rex.txt ~/Cybersup/SalleServeurs/Academie/BoiteDeLaurent"]
};

/* La radio de Grace : un conseil par étape. */
var CONSEILS_CH4 = {
	d_frances: "Ici Grace, de la WarRoom. La Nuée a frappé le serveur archives cette nuit. Commence par Frances, puis lis leur AVIS.txt : il annonce la bombe de minuit.",
	d_runes_traces: "Première chose : mesurer. Aile des Runes, chez Henry. Sur archives, le journal d'accès garde la trace de la Nuée (plage " + PLAGE_NUEE + "). Isole ces lignes.",
	d_runes_ioc: "Bien. Maintenant les indicateurs : les adresses uniques de la Nuée. On les transmettra aux autorités.",
	d_awk_volume: "Aile de la Divination, chez Alfred. Le proxy sait combien d'octets sont partis vers eux : additionne-les.",
	d_awk_victimes: "Et quelles machines ont le plus envoyé ? Le top 3 me dira par où commencer le confinement.",
	d_sed_anonymiser: "Aile de la Transmutation, chez Lee. Avant de notifier la CNIL, on minimise : pas un mail, pas un numéro en clair de trop.",
	d_sed_desarmer: "La Nuée a trafiqué /etc/archives.conf : une ligne de trop, une valeur changée. Nettoie, sans casser le reste.",
	d_jq_alertes: "Aile des Grimoires, chez Stephen. L'antivirus a tout en JSON : donne-moi les machines en alerte critique.",
	d_jq_rapport: "Et un tableau machine,alertes pour mon rapport de quart.",
	d_alchimie_fantomes: "Aile de l'Alchimie, chez Doug. Ils ont créé des comptes fantômes : compare au registre du personnel, et verrouille les intrus.",
	d_alchimie_quarantaine: "Mets en quarantaine tout ce qu'ils ont déposé cette nuit : on isole, on ne détruit pas.",
	d_chrono_bombe: "Aile de la Chronomancie, chez Paul. La bombe sonne à minuit. Trois déclencheurs : timer, at, cron. Désamorce-les tous.",
	d_chrono_sauvegarde: "Et programme enfin la vraie sauvegarde nocturne : 2 h 30, tous les jours.",
	d_archives_restaurer: "Aile des Archives, chez Andrew. Les archives sont trafiquées. Restaure-les depuis la sauvegarde hors ligne.",
	d_archives_patch: "Je t'envoie correctif.diff pour le script par où ils sont entrés. Applique-le.",
	d_script_nettoyage: "Aile de l'Invocation, chez Brian. Ils redéposent des résidus plus vite qu'on ne les efface. Écris un script qui fait le ménage.",
	d_script_arguments: "Rends ton script sûr : un argument, un code de retour, set -e.",
	d_corbeau: "Le dernier Corbeau, c'est leur script qui se relance. On bat un script avec un script : arrête le leur, finis avec le tien.",
	d_fin: "Dernière chose : le retour d'expérience. Chronologie, indicateurs, volume, données concernées, mesures. Dépose-le à Laurent."
};

function texteRadioCh4(){
	var q = QUETES_CH4.filter(function(x){ return !state.quests[x.id]; })[0];
	if (!q) return "La radio grésille. « Grace : terminé. Les archives sont saines, la bombe désamorcée, le dossier part à la police et à l'ANSSI. Beau travail, la recrue. »";
	if (!CONSEILS_CH4[q.id]) return "La radio grésille. « Grace : je te suis. »";
	return "La radio grésille. « " + CONSEILS_CH4[q.id] + " »";
}

/* ------------------------------------------------------------------ */
/* Outils de validation : lire l'état réel du monde                    */
/* ------------------------------------------------------------------ */

function lignesPropres(t){ return String(t == null ? "" : t).replace(/\s+$/, "").split("\n").filter(function(l){ return l !== ""; }); }
function memeEnsemble(a, b){ var x = a.slice().sort(), y = b.slice().sort(); return x.length === y.length && x.every(function(v, i){ return v === y[i]; }); }
function memeOrdre(a, b){ return a.length === b.length && a.every(function(v, i){ return v === b[i]; }); }

function dossierAcademieJoueur(){ var d = Home.getChildFromName("academie"); return d === -1 ? null : d; }
function lireAcademie(nom){ var d = dossierAcademieJoueur(); if (!d) return null; var it = d.getItemFromName(nom); return it === -1 ? null : it.getText(); }

function exportMinimise(){
	return TEXTE_EXPORT_BRUT.replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, "[mail]").replace(/[0-9]{6,8}/g, "ETU-XXXX");
}
function tracesAttendues(){ return lignesPropres(TEXTE_ACCES_LOG).filter(function(l){ return l.indexOf(PLAGE_NUEE) > -1; }); }
function iocAttendus(){ return IP_NUEE.slice().sort(); }
function volumeMo(){ return Math.round(VOLUME_TOTAL / 1048576); }
function edrMachinesCritiques(){ var s = {}; ALERTES_EDR.forEach(function(a){ if (a.gravite === "critique") s[a.machine] = 1; }); return Object.keys(s).sort(); }
function edrCsv(){ var c = {}; ALERTES_EDR.forEach(function(a){ c[a.machine] = (c[a.machine] || 0) + 1; }); return Object.keys(c).sort().map(function(m){ return '"' + m + '",' + c[m]; }); }

function compterOwner(lieu, owner){
	var n = 0;
	lieu.items.forEach(function(it){ if (it.owner === owner) n++; });
	lieu.children.forEach(function(c){ n += compterOwner(c, owner); });
	return n;
}
function donneesEgales(a, b){
	var na = a.itemStringArray().slice().sort(), nb = b.itemStringArray().slice().sort();
	if (!memeOrdre(na, nb)) return false;
	return na.every(function(nom){ return a.getItemFromName(nom).getText() === b.getItemFromName(nom).getText(); });
}

/* La bombe : ses trois déclencheurs sont-ils tous neutralisés ? */
function timerBombe(){ return timersDe("archives").filter(function(t){ return t.nom === "maj-nocturne"; })[0]; }
function bombeDesamorcee(){
	var t = timerBombe();
	if (!t) return false;
	var e = etatTimer("archives", t);
	var timerOff = !e.actif && !e.enabled;
	var atOff = !etatArcanes().at.taches.some(function(x){ return x.bombe; });
	var cron = state.cron[FANTOME_CRON] || [];
	var cronOff = !cron.some(function(l){ return /nuee|chiffr/i.test(l); });
	return timerOff && atOff && cronOff;
}

function cronSauvegardeOK(){
	function cherche(liste){ return (liste || []).some(function(l){ return /^\s*30\s+2\s+\*\s+\*\s+\*\s+/.test(l) && /sauvegarde\.sh/.test(l); }); }
	return cherche(state.cron[JOUEUR]) || cherche(state.cron["root"]);
}

function chiffrerTexte(t){
	return "=== FICHIER CHIFFRE PAR LA NUEE (inerte dans le jeu) ===\n" + encoderBase64(String(t)).replace(/(.{60})/g, "$1\n").replace(/\n$/, "") + "\n";
}

/* L'horloge de la nuit (texte vivant) et le certificat du chapitre. */
var Horloge = new Item("Horloge", "", "item_sign.gif").droits("rw-r--r--", "root");
Academie.addItem(Horloge);
var CertificatAvance = new Item("CertificatAvance", "", "item_manuscript.gif");

function heureDeLaNuit(){
	var total = 20 * 60 + (state.ch4 ? state.ch4.horloge : 0);
	var h = Math.floor(total / 60) % 24, m = total % 60;
	return deuxChiffres(h) + ":" + deuxChiffres(m);
}
function texteHorloge(){
	var reste = MINUIT - (state.ch4 ? state.ch4.horloge : 0);
	var l = "L'HORLOGE DE LA NUIT\n\nIl est " + heureDeLaNuit() + ".\n";
	if (state.ch4 && state.ch4.bombeSonnee) return l + "\nMinuit a sonné. La bombe de la Nuée a chiffré les archives : il faut les restaurer depuis la sauvegarde hors ligne.";
	if (reste <= 0) return l + "\nMinuit est passé.";
	return l + "\nMinuit dans " + reste + " min. Désamorce la bombe avant (aile Chronomancie).";
}

/* L'horloge avance d'un pas à chaque commande tapée dans le chapitre. */
function avancerHorloge(){
	var c = state.ch4;
	if (!state.quests["d_entree"]) return;
	if (c.dernierNb === null || c.dernierNb === undefined) c.dernierNb = state.nbCommandes;
	if (state.nbCommandes > c.dernierNb){
		c.horloge += (state.nbCommandes - c.dernierNb) * PAS_HORLOGE;
		c.dernierNb = state.nbCommandes;
	}
}

/* Minuit sans désamorçage : la bombe chiffre les archives (pas de défaite : la restauration devient indispensable). */
function verifierBombe(){
	var c = state.ch4;
	if (c.horloge < MINUIT || c.bombeSonnee || bombeDesamorcee()) return;
	c.bombeSonnee = true;
	ArchivesData.items.slice().forEach(function(it){
		if (/\.nuee$/.test(it.itemname)) return;
		it.setText(chiffrerTexte(it.getText()));
		it.itemname = it.itemname + ".nuee";
	});
	if (!state.has("rejeuEnCours")) say(C.rouge("Minuit.") + " La bombe de la Nuée a chiffré /srv/archives (fichiers renommés en .nuee, contenu illisible).\n" +
		C.gris("(Ce n'est pas une défaite : restaure /srv/archives depuis /srv/sauvegarde-hors-ligne avec rsync, aile des Archives.)"));
}

/* ------------------------------------------------------------------ */
/* Les validations, étape par étape, sur l'état réel du monde          */
/* ------------------------------------------------------------------ */

function valider(){
	if (!state.quests["d_frances"] && state.has("ch4FrancesLu") && state.has("ch4AvisLu")) state.complete("d_frances");

	var traces = lireAcademie("traces.log");
	if (!state.quests["d_runes_traces"] && traces !== null){
		var lt = lignesPropres(traces);
		if (lt.length && memeEnsemble(lt, tracesAttendues())) state.complete("d_runes_traces");
	}
	var ioc = lireAcademie("ioc.txt");
	if (!state.quests["d_runes_ioc"] && ioc !== null && memeEnsemble(lignesPropres(ioc), iocAttendus())) state.complete("d_runes_ioc");

	var vol = lireAcademie("volume.txt");
	if (!state.quests["d_awk_volume"] && vol !== null){
		var m = /-?\d+/.exec(vol);
		if (m && (parseInt(m[0], 10) === VOLUME_TOTAL || parseInt(m[0], 10) === volumeMo())) state.complete("d_awk_volume");
	}
	var vic = lireAcademie("victimes.txt");
	if (!state.quests["d_awk_victimes"] && vic !== null){
		var premiers = lignesPropres(vic).slice(0, 3).map(function(l){ return l.trim().split(/\s+/)[0]; });
		if (premiers.length === 3 && memeOrdre(premiers, TOP3_VICTIMES)) state.complete("d_awk_victimes");
	}
	var exp = lireAcademie("export-cnil.txt");
	if (!state.quests["d_sed_anonymiser"] && exp !== null && memeOrdre(lignesPropres(exp), lignesPropres(exportMinimise()))) state.complete("d_sed_anonymiser");

	if (!state.quests["d_sed_desarmer"] && memeOrdre(lignesPropres(ConfArchives.getText()), lignesPropres(CONF_ARCHIVES_SAINE))) state.complete("d_sed_desarmer");

	var mac = lireAcademie("machines.txt");
	if (!state.quests["d_jq_alertes"] && mac !== null && memeEnsemble(lignesPropres(mac), edrMachinesCritiques())) state.complete("d_jq_alertes");
	var csv = lireAcademie("alertes.csv");
	if (!state.quests["d_jq_rapport"] && csv !== null && memeOrdre(lignesPropres(csv), edrCsv())) state.complete("d_jq_rapport");

	if (!state.quests["d_alchimie_fantomes"]){
		var fant = lireAcademie("fantomes.txt");
		var listeEgale = fant !== null && memeEnsemble(lignesPropres(fant), COMPTES_FANTOMES.slice());
		var verrouilles = COMPTES_FANTOMES.every(function(n){
			var ligne = lignesDe(ShadowArchives.getText()).filter(function(l){ return l.split(":")[0] === n; })[0];
			var absent = !new RegExp("^" + n.replace(/[.*+?^${}()|[\]\\-]/g, "\\$&") + ":", "m").test(PasswdArchives.getText());
			return absent || (ligne && ligne.split(":")[1].charAt(0) === "!");
		});
		if (listeEgale && verrouilles) state.complete("d_alchimie_fantomes");
	}

	if (!state.quests["d_alchimie_quarantaine"]){
		var tousLa = FICHIERS_NUEE.every(function(n){ return QuarantaineArchives.getItemFromName(n) !== -1; });
		var reste = compterOwner(ArchivesSrv, "nuee") + compterOwner(ArchivesTmp, "nuee");
		if (tousLa && reste === 0) state.complete("d_alchimie_quarantaine");
	}

	if (!state.quests["d_chrono_bombe"] && state.ch4.bombeAmorcee && bombeDesamorcee()) state.complete("d_chrono_bombe");
	if (!state.quests["d_chrono_sauvegarde"] && cronSauvegardeOK()) state.complete("d_chrono_sauvegarde");

	if (!state.quests["d_archives_restaurer"] && donneesEgales(ArchivesData, ArchivesSauvegarde)) state.complete("d_archives_restaurer");
	if (!state.quests["d_archives_patch"] && memeOrdre(lignesPropres(DepotSh.getText()), lignesPropres(DEPOT_SH_CORRIGE))) state.complete("d_archives_patch");

	var quarantaineNuee = QuarantaineArchives.items.filter(function(it){ return /\.nuee$/.test(it.itemname); }).length;
	if (!state.quests["d_script_nettoyage"] && state.ch4.nettoyageStruct && quarantaineNuee >= 1) state.complete("d_script_nettoyage");
	if (!state.quests["d_script_arguments"] && state.ch4.nettoyageArg && state.ch4.nettoyageSansArg) state.complete("d_script_arguments");

	var regen = HOTES["archives"].services["nuee-regen"];
	var depotsNuee = ArchivesDepots.items.filter(function(it){ return /\.nuee$/.test(it.itemname); }).length;
	if (!state.quests["d_corbeau"] && regen && !regen.actif && !regen.auto && depotsNuee === 0 && state.ch4.nettoyageStruct) state.complete("d_corbeau");

	if (!state.quests["d_fin"] && rexOk()) state.complete("d_fin");
	if (state.quests["d_fin"]) { if (!state.has("victoireCh4")) state.applyState("victoireCh4"); }
}

function rexOk(){
	var it = BoiteDeLaurent.getItemFromName("rex.txt");
	if (it === -1) return false;
	var t = it.getText().toLowerCase();
	var rubriques = ["chronolog", "indicateur", "volume", "donn", "mesure"];
	if (!rubriques.every(function(r){ return t.indexOf(r) > -1; })) return false;
	return t.indexOf(String(VOLUME_TOTAL)) > -1 || t.indexOf(String(volumeMo())) > -1 || IP_NUEE.some(function(ip){ return t.indexOf(ip) > -1; });
}

/* ------------------------------------------------------------------ */
/* Le monde réagit                                                     */
/* ------------------------------------------------------------------ */

function verifierChapitre4(){
	function une(nom, cond){ if (!state.has(nom) && cond) state.applyState(nom); }
	une("ch4Ouvert", !!state.quests["c_rapport"] || state.has("ch4Direct"));
	if (!state.has("ch4Ouvert")) return;
	if (!state.ch4 || typeof state.ch4 !== "object") state.ch4 = etatCh4Initial();
	// Relier l'escalier (aussi pour les vieilles sauvegardes faites avant ce chapitre).
	if (SalleServeurs.children.indexOf(Academie) === -1) relier(SalleServeurs, Academie);
	if (!state.ch4.bombeAmorcee) amorcerBombe();
	avancerHorloge();
	verifierBombe();
	// Le script de la Nuée redépose des résidus tant que son service tourne.
	var regen = HOTES["archives"].services["nuee-regen"];
	if (regen && regen.actif){
		var n = ArchivesDepots.items.filter(function(it){ return /\.nuee$/.test(it.itemname); }).length;
		if (n < 2){
			state.ch4.regen = (state.ch4.regen || 0) + 1;
			fichierCh4(ArchivesDepots, "residu-r" + state.ch4.regen + ".nuee", "# residu redepose par la Nuee (inerte)\n", { owner: "root", age: 0, heure: "23:59", image: "item_radspellbook.gif" });
		}
	}
	valider();
	if (RadioGrace.getText() !== texteRadioCh4()) RadioGrace.cmd_text["less"] = texteRadioCh4();
	if (Horloge.getText() !== texteHorloge()) Horloge.cmd_text["less"] = texteHorloge();
	if (state.has("victoireCh4")) CertificatAvance.cmd_text["less"] = state.texteDuCertificat5();
}

function etatChapitre4(nom){
	switch (nom){
		case "ch4Ouvert":
			relier(SalleServeurs, Academie);
			if (!state.ch4 || typeof state.ch4 !== "object") state.ch4 = etatCh4Initial();
			amorcerBombe();
			if (!state.has("rejeuEnCours")) say("Au fond de la SalleServeurs, un escalier de pierre s'ouvre : il descend à l'Académie des Arcanes (cd Academie). Laurent, Frances et la radio de Grace t'y attendent.");
			break;
		case "victoireCh4":
			if (!state.dateVictoire5) state.dateVictoire5 = dateDuJour();
			poser(Home, CertificatAvance);
			CertificatAvance.cmd_text["less"] = state.texteDuCertificat5();
			if (!state.has("rejeuEnCours")) say(C.gris("(Ton CertificatAvance est posé dans ta Maison : cat ~/CertificatAvance. Il porte la note du chapitre 4 et son code de vérification.)"));
			break;
	}
}

GameEvents.addListener("enter", function(e){
	if (e.room === Academie && !state.quests["d_entree"] && state.has("ch4Ouvert")){
		state.debutChapitre5 = state.tempsMs;
		if (state.ch4) state.ch4.dernierNb = state.nbCommandes;
		state.complete("d_entree");
	}
});
GameEvents.addListener("read", function(e){
	if (!state.has("ch4Ouvert")) return;
	if (e.item === Frances) state.set("ch4FrancesLu");
	if (e.item === AvisNuee) state.set("ch4AvisLu");
});
GameEvents.addListener("script", function(e){
	if (!e.item || e.item.itemname !== "nettoyage.sh" || !state.ch4) return;
	var st = e.structures || [];
	var okStruct = st.indexOf("fonction") > -1 && (st.indexOf("for") > -1 || st.indexOf("while") > -1 || st.indexOf("until") > -1) && st.indexOf("if") > -1;
	if (e.statut === 0 && okStruct) state.ch4.nettoyageStruct = true;
	if (e.statut === 0 && okStruct && e.args && e.args.length >= 1) state.ch4.nettoyageArg = true;
	if ((!e.args || e.args.length === 0) && e.statut && e.statut !== 0) state.ch4.nettoyageSansArg = true;
});

/* Le correctif de Grace et le dossier de sortie apparaissent à l'ouverture (déposés dans la Maison). */
var CorrectifDiff = new Item("correctif.diff", CORRECTIF_DIFF, "item_manuscript.gif").droits("rw-r--r--", JOUEUR);
GameEvents.addListener("enter", function(e){
	if (e.room === Academie && state.has("ch4Ouvert") && !Home.hasItem(CorrectifDiff) && Home.getItemFromName("correctif.diff") === -1){
		poser(Home, CorrectifDiff);
	}
});

/* Le monde est de nouveau figé : ce que le joueur crée ensuite n'a plus d'identifiant fixe. */
World.fige = true;

/* ------------------------------------------------------------------ */
/* Départ direct par « chapitre 4 » : on ouvre l'Académie tout de suite */
/* ------------------------------------------------------------------ */

/* Le socle des chapitres précédents est réputé acquis (renfort), sans XP : on les apprend ailleurs.
   Les sorts du chapitre 4 (ORDRE_DES_SORTS_5), eux, s'apprennent auprès des maîtres, pour l'XP. */
function socleCh4Acquis(){
	[typeof ORDRE_DES_SORTS !== "undefined" ? ORDRE_DES_SORTS : [],
	 typeof ORDRE_DES_SORTS_2 !== "undefined" ? ORDRE_DES_SORTS_2 : [],
	 typeof ORDRE_DES_SORTS_3 !== "undefined" ? ORDRE_DES_SORTS_3 : []].forEach(function(liste){
		liste.forEach(function(s){ state.spells[s] = true; });
	});
}

function commencerChapitre4(){
	var avant = null;
	try { state.save(); avant = window.localStorage.getItem(CLE_SAUVEGARDE); } catch (e){ avant = null; }
	var alias = state.alias;
	state.alias = {};
	state.flags.rejeuEnCours = true;
	socleCh4Acquis();
	state.set("sudoOK");
	state.set("chapitre1Saute");
	state.set("ch4Direct");
	PROFIL.chapitre = 4;
	enregistrerProfil();
	if (!state.ch4 || typeof state.ch4 !== "object") state.ch4 = etatCh4Initial();
	state.applyState("ch4Ouvert");
	delete state.flags.rejeuEnCours;
	state.alias = alias;
	Shell.narration = [];
	state.gainsDuTour = [];
	state.debutChapitre5 = state.tempsMs;
	state.ch4.dernierNb = state.nbCommandes;
	if (typeof enterRoom === "function") enterRoom(Academie);
	Shell.lieu_precedent = null;
	Shell.pile_ssh = [];
	if (typeof montrerImage === "function") montrerImage(Academie.room_pic, "Academie");
	if (term && term.effacer) term.effacer();
	term.echo(C.vert(C.gras("CHAPITRE 4 : L'ACADÉMIE DES ARCANES")) + "\n\n" +
		"Quelques semaines après la Crypte, les notes volées de Frances ont fuité. Un groupe de rançonneurs, la Nuée, " +
		"a frappé le serveur d'archives de l'école cette nuit : données exfiltrées, bombe programmée pour minuit, pièges partout.\n\n" +
		"Tu descends à l'Académie des Arcanes. " + C.vert("cat Frances") + ", puis " + C.vert("cat AVIS.txt") + ". Grace te guide à la radio.\n\n" +
		C.gris("Ce chapitre a sa propre note sur 20. quetes pour le journal, indice si tu bloques, xp pour ta note. L'horloge de la nuit file vers minuit."));
	return true;
}
