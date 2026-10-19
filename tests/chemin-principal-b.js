/**
 * Audit des blocages (lot b) : les chapitres 4 (l'Académie, numéro 5 dans le code), 5 (le Bastion, 6) et 6 (Lumen, 7),
 * joués par le CHEMIN PRINCIPAL SEUL, comme un étudiant pressé : aucun défi, aucune quête annexe, aucune étape facultative.
 * On y entre de toutes les façons : à la suite du chapitre précédent (l'histoire depuis le chapitre 1), par un départ
 * direct (chapitre 4, 5 ou 6 sur une partie neuve) et en renfort (aller N après le chapitre 1). Chaque chapitre doit
 * finir toutes ses étapes, ouvrir le suivant, et laisser appris les sorts du chapitre.
 *
 * Puis les blocages trouvés et corrigés, chacun vérifié (ces vérifications échouent sans la correction) :
 *   - Bastion : la nuit n'avance qu'avec les commandes ; le joueur qui a tout fermé attendait l'aube sans le savoir ;
 *   - Lumen : toutes les sessions jetées (habitants connectés compris) fermaient l'étape des Archives pour toujours ;
 *   - Académie : un compte fantôme supprimé avant la comparaison (comm) rendait la liste des fantômes impossible ;
 *   - Lumen : l'indice payant de l'entrée donnait un chemin faux après un départ direct au Bastion.
 *
 * Lancer : node --max-old-space-size=3000 tests/chemin-principal-b.js        (-v pour tout voir)
 */
var fs = require("fs");
var path = require("path");
var monde = require("./monde.js");
var ok = 0, ko = 0;
function verifier(c, m){ if (c) ok++; else { ko++; console.log("ÉCHEC : " + m); } }
function contient(texte, mot, m){ verifier(String(texte).indexOf(mot) > -1, m + " : « " + mot + " » absent de : " + String(texte).substring(0, 300)); }
function q(jeu, id){ return jeu.lire("!!state.quests[" + JSON.stringify(id) + "]"); }
function fait(jeu, id, m){ verifier(q(jeu, id) === true, (m || id) + " : devrait être accompli"); }
function pasFait(jeu, id, m){ verifier(q(jeu, id) === false, (m || id) + " : ne devrait PAS être accompli"); }

/* Les blocs de code de docs/solution.md, partie par partie (### N.). */
var SOLUTION = (function(){
	var res = {}, cur = null, bloc = false;
	fs.readFileSync(path.join(__dirname, "..", "docs", "solution.md"), "utf8").split("\n").forEach(function(l){
		var m = /^### (\d+)\. /.exec(l);
		if (m){ cur = +m[1]; res[cur] = []; return; }
		if (/^##+ /.test(l)){ cur = null; return; }
		if (l.indexOf("```") === 0){ bloc = !bloc; return; }
		if (bloc && cur !== null && l.trim() !== "") res[cur].push(l);
	});
	return res;
})();
function parties(a, b, sauf){ var r = []; for (var i = a; i <= b; i++) if (!sauf || sauf.indexOf(i) === -1) r = r.concat(SOLUTION[i] || []); return r; }

/* Le chapitre 4, sans les défis des maîtres (ni registres, ni Réserve, ni Parchemins) : les maîtres, puis les étapes
   sur archives. La sauvegarde nocturne s'écrit avec echo : printf ne s'apprend que chez Brian, la dernière aile. */
var NETTOYAGE = "cat > ~/academie/nettoyage.sh <<'FIN'\n#!/bin/bash\nset -e\ndossier=\"$1\"\nif [ -z \"$dossier\" ]; then\necho \"usage: nettoyage.sh DOSSIER\" >&2\nexit 1\nfi\n" +
	"compter() {\necho \"$1 fichier(s) en quarantaine\"\n}\nn=0\nfor f in $(find \"$dossier\" -name \"*.nuee\"); do\nif [ -e \"$f\" ]; then\nsudo mv \"$f\" /quarantaine/\nn=$((n + 1))\nfi\ndone\ncompter \"$n\"\nFIN";
var REX = "cat > ~/academie/rex.txt <<'FIN'\nRETOUR D'EXPERIENCE - INCIDENT NUEE\nChronologie : intrusion dans la nuit, exfiltration puis bombe programmee pour minuit.\n" +
	"Indicateurs de compromission : <ip-nuee> (les autres dans ioc.txt).\nVolume exfiltre : <volume> octets (mesure au proxy).\n" +
	"Donnees concernees : comptes etudiants (mails et numeros), minimises pour la CNIL.\nMesures prises : traces isolees, comptes fantomes verrouilles, fichiers en quarantaine, bombe desamorcee, archives restaurees, correctif applique, script de la Nuee arrete.\nFIN";
var CH4 = [
	"cd ~/Cybersup/SalleServeurs", "cd Academie", "mkdir ~/academie", "cat Laurent", "cat Frances", "cat AVIS.txt",
	"cd Chronomancie", "cat Paul", "ssh archives", "systemctl list-timers", "sudo atq", "sudo crontab -u <fantome-cron> -l",
	"sudo systemctl disable --now maj-nocturne.timer", "sudo atrm 1", "sudo crontab -u <fantome-cron> -r",
	"echo \"30 2 * * * /usr/local/bin/sauvegarde.sh\" | crontab -", "exit",
	"cd ../Runes", "cat Henry", "ssh archives",
	'grep -E "45\\.137\\." /var/log/acces.log > ~/academie/traces.log',
	'grep -oE "45\\.137\\.[0-9]+\\.[0-9]+" /var/log/acces.log | sort -u > ~/academie/ioc.txt', "exit",
	"cd ../Divination", "cat Alfred", "ssh archives",
	"awk '$3 ~ /^45\\.137\\./ { s += $4 } END { print s }' /var/log/proxy.log > ~/academie/volume.txt",
	"awk '$3 ~ /^45\\.137\\./ { s[$2] += $4 } END { for (m in s) print m, s[m] }' /var/log/proxy.log | sort -k2,2nr | head -3 > ~/academie/victimes.txt", "exit",
	"cd ../Transmutation", "cat Lee", "ssh archives",
	"sed -E 's/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}/[mail]/g; s/[0-9]{6,8}/ETU-XXXX/g' /srv/edr/export-brut.txt > ~/academie/export-cnil.txt",
	"sudo sed -i -e '/exec_hook/d' -e 's/^autorise_tout = oui/autorise_tout = non/' /etc/archives.conf", "exit",
	"cd ../Grimoires", "cat Stephen", "ssh archives",
	"jq -r '.[] | select(.gravite==\"critique\") | .machine' /srv/edr/alertes.json | sort -u > ~/academie/machines.txt",
	"jq -r 'group_by(.machine)[] | [.[0].machine, length] | @csv' /srv/edr/alertes.json > ~/academie/alertes.csv", "exit",
	"cd ../Alchimie", "cat Doug", "ssh archives",
	"cut -d: -f1 /etc/passwd | sort > ~/academie/sys.txt", "cut -d, -f1 /srv/personnel.csv | sort > ~/academie/legit.txt",
	"comm -23 ~/academie/sys.txt ~/academie/legit.txt > ~/academie/fantomes.txt", "cat ~/academie/fantomes.txt | xargs -I {} sudo usermod -L {}",
	"sudo find /srv /tmp -user nuee -exec mv {} /quarantaine/ \\;", "exit",
	"cd ../Archives", "cat Andrew", "ssh archives", "sudo rsync -a --delete /srv/sauvegarde-hors-ligne/ /srv/archives/",
	"cd /usr/local/bin", "sudo patch depot.sh < ~/correctif.diff", "exit",
	"cd ~/Cybersup/SalleServeurs/Academie/Invocation", "cat Brian", NETTOYAGE, "chmod +x ~/academie/nettoyage.sh", "ssh archives",
	"sudo bash ~/academie/nettoyage.sh /srv/depots", "sudo bash ~/academie/nettoyage.sh", "sudo bash ~/academie/nettoyage.sh /srv/depots",
	"sudo systemctl disable --now nuee-regen", "sudo bash ~/academie/nettoyage.sh /srv/depots", REX,
	"exit", "cp ~/academie/rex.txt ~/Cybersup/SalleServeurs/Academie/BoiteDeLaurent"
];
/* Le chapitre 5 : les douze tours (parties 33 à 45), l'attente de l'aube, l'aube relue, le rapport (47, 48). Pas la partie 46 (les défis). */
var CH5_TOURS = parties(33, 45), CH5_FIN = parties(47, 48);
/* Le chapitre 6 : parties 49 à 59 (pas la 60, les défis, ni la 61, les annexes). Depuis le hall du Bastion : cd Lumen. */
var CH6 = parties(49, 59);

function jouer(jeu, liste){ liste.forEach(function(c){ jeu.jouerSolution(c); }); }
function manque(jeu, liste){ return jeu.lire(liste + ".filter(function(x){ return !state.quests[x.id]; }).map(function(x){ return x.id; }).join(' ')"); }
function sortsManquants(jeu, liste){ return jeu.lire(liste + ".filter(function(s){ return !state.knows(s); }).join(' ')"); }
/* Jusqu'à l'aube, sans rien faire d'autre que regarder l'horloge : la nuit avance d'une commande à l'autre. */
function attendreAube(jeu){ var n = 0; while (!jeu.lire("sCh5().assaut") && n++ < 200) jeu.taper("cat Horloge"); return n; }

function chapitre4(jeu, nom){
	jouer(jeu, CH4);
	verifier(manque(jeu, "QUETES_CH4") === "", nom + " : étapes du chapitre 4 manquantes : " + manque(jeu, "QUETES_CH4"));
	verifier(sortsManquants(jeu, "ORDRE_DES_SORTS_5") === "", nom + " : sorts du chapitre 4 pas appris : " + sortsManquants(jeu, "ORDRE_DES_SORTS_5"));
	verifier(jeu.lire("state.has('ch5Ouvert')"), nom + " : le Bastion s'ouvre à la fin de l'Académie");
}
function chapitre5(jeu, nom){
	jouer(jeu, CH5_TOURS);
	var n = attendreAube(jeu);
	verifier(n > 0 && n < 200, nom + " : l'aube arrive en tapant des commandes (" + n + ")");
	jouer(jeu, CH5_FIN);
	verifier(manque(jeu, "QUETES_CH5") === "", nom + " : étapes du chapitre 5 manquantes : " + manque(jeu, "QUETES_CH5"));
	verifier(sortsManquants(jeu, "ORDRE_DES_SORTS_6") === "", nom + " : sorts du chapitre 5 pas appris : " + sortsManquants(jeu, "ORDRE_DES_SORTS_6"));
	verifier(jeu.lire("state.has('ch6Ouvert')"), nom + " : Lumen s'ouvre à la fin du Bastion");
}
function chapitre6(jeu, nom, depuisLeBastion){
	jouer(jeu, (depuisLeBastion ? ["cd Lumen"] : []).concat(CH6.slice(depuisLeBastion ? 1 : 0)));
	verifier(manque(jeu, "QUETES_CH6") === "", nom + " : étapes du chapitre 6 manquantes : " + manque(jeu, "QUETES_CH6"));
	verifier(sortsManquants(jeu, "ORDRE_DES_SORTS_7") === "", nom + " : sorts du chapitre 6 pas appris : " + sortsManquants(jeu, "ORDRE_DES_SORTS_7"));
	verifier(jeu.lire("state.has('ch7Ouvert')"), nom + " : Port-Aube s'ouvre à la fin de Lumen");
}

/* ================================================================== */
/* 1. Le chemin principal, de toutes les entrées                        */
/* ================================================================== */

/* Départ direct au chapitre 4, puis la suite : 5 et 6. */
(function(){
	var jeu = monde.nouveauMonde({});
	jeu.taper("chapitre 4", "oui");
	chapitre4(jeu, "départ direct 4");
	chapitre5(jeu, "départ direct 4");
	chapitre6(jeu, "départ direct 4", true);
})();
/* Départ direct au chapitre 5 (le hall est alors au fond de la SalleServeurs), puis Lumen. */
(function(){
	var jeu = monde.nouveauMonde({});
	jeu.taper("chapitre 5", "oui");
	chapitre5(jeu, "départ direct 5");
	chapitre6(jeu, "départ direct 5", true);
})();
/* Départ direct au chapitre 6. */
(function(){
	var jeu = monde.nouveauMonde({});
	jeu.taper("chapitre 6", "oui");
	chapitre6(jeu, "départ direct 6", false);
})();
/* L'histoire : les chapitres 1 à 3 tels que la solution les joue, puis l'Académie, le Bastion et Lumen par le chemin principal. */
(function(){
	var jeu = monde.nouveauMonde({});
	jouer(jeu, parties(1, 22));
	verifier(jeu.lire("state.has('ch4Ouvert')"), "histoire : l'Académie s'ouvre après la Crypte");
	chapitre4(jeu, "histoire");
	chapitre5(jeu, "histoire");
	chapitre6(jeu, "histoire", true);
})();
/* En renfort : le chapitre 1 fini, aller 4, aller 5 ou aller 6 (les chapitres 2 et 3 sautés). */
[4, 5, 6].forEach(function(n){
	var jeu = monde.nouveauMonde({});
	jouer(jeu, parties(1, 6));
	verifier(jeu.lire("state.has('victoire')"), "renfort " + n + " : le Sorcier Noir est battu");
	jeu.taper("aller " + n, "oui");
	verifier(jeu.lire("state.has('ch" + n + "Ouvert')"), "renfort " + n + " : aller " + n + " ouvre le chapitre");
	if (n === 4) chapitre4(jeu, "renfort 4");
	if (n <= 5) chapitre5(jeu, "renfort " + n);
	chapitre6(jeu, "renfort " + n, n < 6);
});

/* ================================================================== */
/* 2. Bastion : la nuit n'avance qu'avec les commandes                  */
/* ================================================================== */
/* Les douze tours fermées vers 3 h 20, il reste près de trois heures de nuit. Rien ne disait au joueur que l'horloge
   n'avance qu'avec ses commandes : Frances et Grace lui disaient d'« attendre l'aube », et il attendait devant l'écran. */
(function(){
	var st = {};
	var jeu = monde.nouveauMonde(st);
	jeu.taper("chapitre 5", "oui");
	jouer(jeu, CH5_TOURS);
	verifier(!jeu.lire("sCh5().assaut"), "Bastion : les douze tours fermées avant l'aube");
	var attente = jeu.lire("Math.ceil(minutesAvantAube() / PAS_HORLOGE_CH5)");
	jeu.taper("cd ~/Cybersup/SalleServeurs/Bastion");
	contient(jeu.taper("cat Horloge"), "n'avance qu'avec tes commandes", "Bastion : l'Horloge dit que la nuit avance avec les commandes");
	contient(jeu.taper("cat Frances"), "commandes environ avant l'aube", "Bastion : Frances dit combien de commandes avant l'aube");
	var radio = jeu.taper("cat Radio");
	contient(radio, "n'avance qu'avec tes commandes", "Bastion : la radio de Grace aussi");
	verifier(radio.indexOf("Relis la Tour de Guet") === -1, "Bastion : avant l'aube, la radio ne demande pas déjà de relire les traces");
	contient(jeu.taper("indice", "non"), "n'avance qu'avec tes commandes", "Bastion : l'indice gratuit de l'aube le dit aussi");
	verifier(attente > 20, "Bastion : il reste bien du temps à passer (" + attente + " commandes)");
	// Une partie en cours, rechargée : les mêmes textes la guident.
	jeu.lire("state.save()");
	var jeu2 = monde.nouveauMonde(st);
	jeu2.taper("cd ~/Cybersup/SalleServeurs/Bastion");
	contient(jeu2.taper("cat Frances"), "commandes environ avant l'aube", "Bastion rechargé : Frances guide l'attente");
	verifier(attendreAube(jeu2) < 200, "Bastion rechargé : l'aube arrive");
	contient(jeu2.taper("cat Horloge"), "L'aube est passée", "Bastion : après l'aube, l'Horloge le dit");
})();

/* ================================================================== */
/* 3. Lumen : les sessions des habitants jetées avec les vieilles       */
/* ================================================================== */
/* Un find sans -mmin (ou un rm de tout le dossier) jette aussi les sessions des habitants connectés. Kathleen dit que
   « les nouvelles visites vont les recréer », mais rien ne les recréait : l'étape des Archives (m6_inodes) restait
   fermée pour toujours, et avec elle le quartier, le défi de midi et la note. */
function surLumenArchives(st){
	var jeu = monde.nouveauMonde(st || {});
	jeu.taper("chapitre 6", "oui");
	jouer(jeu, ["cat Laurent", "cat Mission", "lanterne", "cd Archives", "cat Kathleen", "cd ..", "ssh lumen", "df -i"]);
	return jeu;
}
(function(){
	var jeu = surLumenArchives();
	jeu.jouerSolution("sudo find /var/lib/lumen/sessions -type f -delete");
	pasFait(jeu, "m6_inodes", "Lumen : toutes les sessions jetées, habitants compris : refusé sur le moment");
	verifier(jeu.lire("sessionsRecentesCh6()") < 20, "Lumen : les sessions récentes ont disparu");
	var sortie = "";
	for (var i = 0; i < 4; i++) sortie += jeu.taper("uptime");
	contient(sortie, "se reconnectent", "Lumen : les habitants se reconnectent quelques commandes plus tard");
	verifier(jeu.lire("sessionsRecentesCh6()") >= 20, "Lumen : vingt sessions récentes de nouveau");
	jeu.taper("df -i");
	fait(jeu, "m6_inodes", "Lumen : l'étape des Archives n'est plus fermée pour toujours");
})();
/* Le même blocage dans une partie déjà en cours (sauvegardée avant la correction) : rechargée, elle se débloque. */
(function(){
	var st = {};
	var jeu = surLumenArchives(st);
	jeu.jouerSolution("sudo find /var/lib/lumen/sessions -type f -delete");
	jeu.lire("state.save()");
	var jeu2 = monde.nouveauMonde(st);
	pasFait(jeu2, "m6_inodes", "Lumen rechargé : pas encore");
	jeu2.taper("ssh lumen");
	for (var i = 0; i < 4; i++) jeu2.taper("uptime");
	jeu2.taper("df -i");
	fait(jeu2, "m6_inodes", "Lumen rechargé : les habitants reviennent, l'étape se termine");
})();
/* Le bon geste ne déclenche rien : les sessions récentes restent, aucune reconnexion inventée. */
(function(){
	var jeu = surLumenArchives();
	jeu.jouerSolution("sudo find /var/lib/lumen/sessions -type f -mmin +60 -delete");
	fait(jeu, "m6_inodes", "Lumen : -mmin +60, validé tout de suite");
	var sortie = "";
	for (var i = 0; i < 4; i++) sortie += jeu.taper("uptime");
	verifier(sortie.indexOf("se reconnectent") === -1, "Lumen : pas de reconnexion quand rien n'a été jeté");
})();

/* ================================================================== */
/* 4. Académie : un compte fantôme supprimé avant la comparaison         */
/* ================================================================== */
/* Le fantôme de la crontab (celui de la bombe) supprimé d'emblée avec userdel : il n'est plus dans /etc/passwd, comm
   ne le voit plus, fantomes.txt ne pouvait plus jamais être « complet ». userdel est pourtant accepté pour verrouiller. */
(function(){
	var jeu = monde.nouveauMonde({});
	jeu.taper("chapitre 4", "oui");
	jouer(jeu, ["cd ~/Cybersup/SalleServeurs/Academie", "mkdir ~/academie", "cat Frances", "cat AVIS.txt", "cd Alchimie", "cat Doug", "cd ../Chronomancie", "cat Paul", "ssh archives",
		"sudo crontab -u <fantome-cron> -r", "sudo userdel <fantome-cron>",
		"cut -d: -f1 /etc/passwd | sort > ~/academie/sys.txt", "cut -d, -f1 /srv/personnel.csv | sort > ~/academie/legit.txt",
		"comm -23 ~/academie/sys.txt ~/academie/legit.txt > ~/academie/fantomes.txt"]);
	var f = jeu.lire("FANTOME_CRON");
	verifier(jeu.lire("lireAcademie('fantomes.txt')").indexOf(f) === -1, "Académie : le fantôme supprimé n'apparaît plus dans la comparaison");
	pasFait(jeu, "d_alchimie_fantomes", "Académie : les autres fantômes ne sont pas encore verrouillés");
	jeu.jouerSolution("cat ~/academie/fantomes.txt | xargs -I {} sudo usermod -L {}");
	fait(jeu, "d_alchimie_fantomes", "Académie : fantôme supprimé plus les autres verrouillés : l'étape passe");
	// Un compte légitime glissé dans la liste reste refusé.
	var jeu2 = monde.nouveauMonde({});
	jeu2.taper("chapitre 4", "oui");
	jouer(jeu2, ["cd ~/Cybersup/SalleServeurs/Academie", "mkdir ~/academie", "cd Alchimie", "cat Doug", "ssh archives",
		"cut -d: -f1 /etc/passwd | sort > ~/academie/sys.txt", "cut -d, -f1 /srv/personnel.csv | sort > ~/academie/legit.txt",
		"comm -23 ~/academie/sys.txt ~/academie/legit.txt > ~/academie/fantomes.txt", "echo gestionnaire >> ~/academie/fantomes.txt",
		"cat ~/academie/fantomes.txt | xargs -I {} sudo usermod -L {}"]);
	pasFait(jeu2, "d_alchimie_fantomes", "Académie : un compte légitime dans la liste reste refusé");
})();

/* ================================================================== */
/* 5. Lumen : l'indice payant de l'entrée, après un départ direct au Bastion */
/* ================================================================== */
(function(){
	var jeu = monde.nouveauMonde({});
	jeu.taper("chapitre 5", "oui");
	verifier(jeu.lire("Shell.cheminAffiche(HallBastion)").indexOf("Academie") === -1, "départ direct 5 : le hall du Bastion n'est pas sous l'Académie");
	contient(jeu.lire("INDICES_CH6.m6_entree.join(' ')"), "~/Cybersup/SalleServeurs/Bastion", "l'indice de l'entrée de Lumen donne aussi le chemin du départ direct au Bastion");
})();

console.log(ok + " vérifications réussies, " + ko + " échec(s).");
if (ko) process.exit(1);
