/**
 * Le chapitre 4 (l'Académie des Arcanes, numéro 5 dans le code) : on le joue du début à la fin,
 * étape par étape, en vérifiant que chaque validation repose sur l'état réel du monde (et pas sur
 * la seule frappe d'une commande), que les variantes légitimes passent, que les raccourcis sont
 * refusés, puis l'horloge de la nuit, minuit sans désamorçage, la sauvegarde et le départ direct.
 *
 * Lancer : node tests/chapitre4.js        (-v pour tout voir)
 */
var monde = require("./monde.js");
var bavard = process.argv.indexOf("-v") > -1;
var ok = 0, ko = 0;
function verifier(c, m){ if (c) ok++; else { ko++; console.log("ÉCHEC : " + m); } }
function vrai(jeu, expr, m){ verifier(jeu.lire(expr) === true, m + "  [" + expr + "]"); }
function faux(jeu, expr, m){ verifier(jeu.lire(expr) === false, m + "  [" + expr + "]"); }
function q(jeu, id){ return jeu.lire("!!state.quests[" + JSON.stringify(id) + "]"); }
function fait(jeu, id, m){ verifier(q(jeu, id) === true, (m || id) + " : l'étape devrait être accomplie"); }
function pasFait(jeu, id, m){ verifier(q(jeu, id) === false, (m || id) + " : l'étape ne devrait PAS être accomplie"); }

/* Une partie qui vient d'ouvrir l'Académie par le départ direct (les chapitres 1 à 3 en renfort). */
function neuf(stockage){
	var jeu = monde.nouveauMonde(stockage || {});
	jeu.taper("chapitre 4", "oui");
	return jeu;
}
/* Apprendre tous les sorts auprès des maîtres, puis se poser sur le serveur avec ~/academie. */
var VISITE = ["cat Frances", "cat AVIS.txt",
	"cd Runes", "cat Henry", "cd ../Divination", "cat Alfred", "cd ../Transmutation", "cat Lee",
	"cd ../Grimoires", "cat Stephen", "cd ../Alchimie", "cat Doug", "cd ../Chronomancie", "cat Paul",
	"cd ../Archives", "cat Andrew", "cd ../Invocation", "cat Brian", "cd ..", "ssh archives", "mkdir ~/academie"];
function surArchives(jeu){ VISITE.forEach(function(c){ jeu.jouerSolution(c); }); }
function jouer(jeu, liste){ liste.forEach(function(c){ jeu.jouerSolution(c); }); }

/* ================================================================== */
/* 1. Ouverture, entrée, Frances et l'avis de la Nuée                  */
/* ================================================================== */
(function(){
	var jeu = neuf();
	vrai(jeu, "state.has('ch4Ouvert')", "chapitre 4 : l'Académie s'ouvre au départ direct");
	verifier(jeu.lire("current_room.room_name") === "Academie", "chapitre 4 : on arrive dans l'Académie");
	verifier(jeu.lire("state.chapitreEnCours()") === 5, "chapitre 4 : chapitreEnCours vaut 5");
	fait(jeu, "d_entree", "d_entree (entrée dans l'Académie)");
	vrai(jeu, "state.knows('grep') && state.knows('sudo')", "le socle des chapitres précédents est acquis (renfort)");
	faux(jeu, "state.knows('jq')", "jq n'est pas encore appris : il s'apprend auprès de Stephen");
	// Frances seule ne suffit pas : il faut aussi l'avis de la Nuée.
	jeu.jouerSolution("cat Frances");
	pasFait(jeu, "d_frances", "d_frances après Frances seule");
	jeu.jouerSolution("cat AVIS.txt");
	fait(jeu, "d_frances", "d_frances après Frances ET l'avis");
	// Apprendre un sort auprès d'un maître.
	jeu.jouerSolution("cd Grimoires");
	jeu.jouerSolution("cat Stephen");
	vrai(jeu, "state.knows('jq')", "jq s'apprend auprès de Stephen (aile des Grimoires)");
})();

/* ================================================================== */
/* 2. Runes : traces et indicateurs                                    */
/* ================================================================== */
(function(){
	var jeu = neuf();
	surArchives(jeu);
	// Un raccourci faux : garder les lignes de l'école, pas celles de la Nuée.
	jeu.taper("grep 10.0.92 /var/log/acces.log > ~/academie/traces.log");
	pasFait(jeu, "d_runes_traces", "traces fausses (lignes de l'école) refusées");
	// La bonne signature.
	jeu.taper('grep -E "45\\.137\\." /var/log/acces.log > ~/academie/traces.log');
	fait(jeu, "d_runes_traces", "traces correctes (plage de la Nuée)");
	// Variante légitime : grep simple sur la même signature, même ensemble de lignes.
	var jeu2 = neuf(); surArchives(jeu2);
	jeu2.taper('grep "45.137" /var/log/acces.log > ~/academie/traces.log');
	fait(jeu2, "d_runes_traces", "variante grep simple acceptée");
	// IOC : adresses uniques triées.
	jeu.taper('grep -oE "45\\.137\\.[0-9]+\\.[0-9]+" /var/log/acces.log | sort -u > ~/academie/ioc.txt');
	fait(jeu, "d_runes_ioc", "ioc corrects (adresses uniques)");
	// Un ioc.txt incomplet (une seule adresse) est refusé.
	var jeu3 = neuf(); surArchives(jeu3);
	jeu3.taper("echo 45.137.0.1 > ~/academie/ioc.txt");
	pasFait(jeu3, "d_runes_ioc", "ioc inventés refusés");
})();

/* ================================================================== */
/* 3. Divination : volume et victimes                                  */
/* ================================================================== */
(function(){
	var jeu = neuf(); surArchives(jeu);
	var vol = jeu.lire("VOLUME_TOTAL"), mo = jeu.lire("volumeMo()");
	jeu.taper("echo 123 > ~/academie/volume.txt");
	pasFait(jeu, "d_awk_volume", "un volume faux est refusé");
	jeu.taper("awk '$3 ~ /^45\\.137\\./ { s += $4 } END { print s }' /var/log/proxy.log > ~/academie/volume.txt");
	fait(jeu, "d_awk_volume", "volume exact (octets) accepté");
	verifier(jeu.lire("lignesPropres(lireAcademie('volume.txt'))[0]") === String(vol), "le volume vaut bien VOLUME_TOTAL");
	// Variante : le volume en Mo arrondi.
	var jeu2 = neuf(); surArchives(jeu2);
	jeu2.taper("echo " + mo + " > ~/academie/volume.txt");
	fait(jeu2, "d_awk_volume", "volume en Mo arrondi accepté");
	// Victimes : top 3 décroissant.
	jeu.taper("awk '$3 ~ /^45\\.137\\./ { s[$2] += $4 } END { for (m in s) print m, s[m] }' /var/log/proxy.log | sort -k2,2nr | head -3 > ~/academie/victimes.txt");
	fait(jeu, "d_awk_victimes", "top 3 des machines correct");
	// Mauvais ordre refusé.
	var jeu3 = neuf(); surArchives(jeu3);
	var top = jeu3.lire("TOP3_VICTIMES.slice().reverse().join('\\n')");
	jeu3.taper("printf '" + top + "\\n' > ~/academie/victimes.txt");
	pasFait(jeu3, "d_awk_victimes", "un top 3 dans le mauvais ordre est refusé");
})();

/* ================================================================== */
/* 4. Transmutation : minimisation CNIL et nettoyage de la conf        */
/* ================================================================== */
(function(){
	var jeu = neuf(); surArchives(jeu);
	jeu.taper("cp /srv/edr/export-brut.txt ~/academie/export-cnil.txt");
	pasFait(jeu, "d_sed_anonymiser", "un export non minimisé (copie brute) est refusé");
	jeu.taper("sed -E 's/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}/[mail]/g; s/[0-9]{6,8}/ETU-XXXX/g' /srv/edr/export-brut.txt > ~/academie/export-cnil.txt");
	fait(jeu, "d_sed_anonymiser", "export minimisé accepté");
	vrai(jeu, "lireAcademie('export-cnil.txt').indexOf('@') === -1", "plus aucune adresse mail dans l'export minimisé");
	// Conf piégée : retirer la ligne exec_hook ET remettre autorise_tout = non.
	vrai(jeu, "ConfArchives.getText().indexOf('exec_hook') > -1", "au départ, la conf porte la ligne exec_hook de la Nuée");
	jeu.taper("sudo sed -i '/exec_hook/d' /etc/archives.conf");
	pasFait(jeu, "d_sed_desarmer", "retirer la ligne sans remettre la valeur ne suffit pas");
	jeu.taper("sudo sed -i 's/^autorise_tout = oui/autorise_tout = non/' /etc/archives.conf");
	fait(jeu, "d_sed_desarmer", "ligne retirée ET valeur rétablie");
})();

/* ================================================================== */
/* 5. Grimoires : jq                                                   */
/* ================================================================== */
(function(){
	var jeu = neuf(); surArchives(jeu);
	jeu.taper("jq -r '.[] | .machine' /srv/edr/alertes.json | sort -u > ~/academie/machines.txt");
	pasFait(jeu, "d_jq_alertes", "toutes les machines (pas seulement les critiques) : refusé");
	jeu.taper("jq -r '.[] | select(.gravite==\"critique\") | .machine' /srv/edr/alertes.json | sort -u > ~/academie/machines.txt");
	fait(jeu, "d_jq_alertes", "machines critiques, uniques et triées");
	jeu.taper("jq -r 'group_by(.machine)[] | [.[0].machine, length] | @csv' /srv/edr/alertes.json > ~/academie/alertes.csv");
	fait(jeu, "d_jq_rapport", "rapport CSV machine,alertes");
})();

/* ================================================================== */
/* 6. Alchimie : comptes fantômes et quarantaine                       */
/* ================================================================== */
(function(){
	var jeu = neuf(); surArchives(jeu);
	jeu.taper("cut -d: -f1 /etc/passwd | sort > ~/academie/sys.txt");
	jeu.taper("cut -d, -f1 /srv/personnel.csv | sort > ~/academie/legit.txt");
	jeu.taper("comm -23 ~/academie/sys.txt ~/academie/legit.txt > ~/academie/fantomes.txt");
	// La liste est bonne, mais les comptes ne sont pas encore verrouillés.
	pasFait(jeu, "d_alchimie_fantomes", "liste trouvée mais comptes pas encore verrouillés");
	var fant = jeu.lire("lignesPropres(lireAcademie('fantomes.txt')).slice().sort().join(',')");
	verifier(fant === jeu.lire("COMPTES_FANTOMES.slice().sort().join(',')"), "fantomes.txt liste exactement les comptes fantômes : " + fant);
	jeu.taper("cat ~/academie/fantomes.txt | xargs -I {} sudo usermod -L {}");
	fait(jeu, "d_alchimie_fantomes", "comptes fantômes verrouillés");
	// Quarantaine : tout ce qui appartient à « nuee ».
	pasFait(jeu, "d_alchimie_quarantaine", "rien n'est encore en quarantaine");
	jeu.taper("sudo find /srv /tmp -user nuee -exec mv {} /quarantaine/ \\;", jeu.lire("MOT_DE_PASSE_SUDO"));
	fait(jeu, "d_alchimie_quarantaine", "fichiers de la Nuée en quarantaine, aucun oublié");
	vrai(jeu, "(compterOwner(ArchivesSrv,'nuee') + compterOwner(ArchivesTmp,'nuee')) === 0", "plus aucun fichier appartenant à nuee sous /srv ou /tmp");
})();

/* ================================================================== */
/* 7. Chronomancie : la bombe (trois déclencheurs) et la sauvegarde    */
/* ================================================================== */
(function(){
	var jeu = neuf(); surArchives(jeu);
	var fant = jeu.lire("FANTOME_CRON");
	vrai(jeu, "state.ch4.bombeAmorcee", "la bombe est posée à l'ouverture (timer, at, cron)");
	jeu.taper("sudo systemctl disable --now maj-nocturne.timer", jeu.lire("MOT_DE_PASSE_SUDO"));
	pasFait(jeu, "d_chrono_bombe", "le timer seul désamorcé ne suffit pas");
	jeu.taper("sudo atrm 1", jeu.lire("MOT_DE_PASSE_SUDO"));
	pasFait(jeu, "d_chrono_bombe", "timer + at, mais la crontab du fantôme reste");
	jeu.taper("sudo crontab -u " + fant + " -r", jeu.lire("MOT_DE_PASSE_SUDO"));
	fait(jeu, "d_chrono_bombe", "les trois déclencheurs désamorcés");
	vrai(jeu, "bombeDesamorcee()", "bombeDesamorcee() confirme les trois");
	// La vraie sauvegarde nocturne.
	jeu.taper("printf '0 2 * * * /usr/local/bin/sauvegarde.sh\\n' | crontab -");
	pasFait(jeu, "d_chrono_sauvegarde", "une sauvegarde à 2 h 00 (pas 2 h 30) est refusée");
	jeu.taper("printf '30 2 * * * /usr/local/bin/sauvegarde.sh\\n' | crontab -");
	fait(jeu, "d_chrono_sauvegarde", "sauvegarde quotidienne à 2 h 30");
})();

/* ================================================================== */
/* 8. Archives : restauration (rsync) et correctif (patch)             */
/* ================================================================== */
(function(){
	var jeu = neuf(); surArchives(jeu);
	vrai(jeu, "ArchivesData.getItemFromName('notes-2023.txt').getText().indexOf('[nuee]') > -1", "au départ, une archive est trafiquée par la Nuée");
	pasFait(jeu, "d_archives_restaurer", "les archives sont encore trafiquées");
	jeu.taper("sudo rsync -a --delete /srv/sauvegarde-hors-ligne/ /srv/archives/", jeu.lire("MOT_DE_PASSE_SUDO"));
	fait(jeu, "d_archives_restaurer", "archives restaurées à l'identique depuis la sauvegarde hors ligne");
	vrai(jeu, "donneesEgales(ArchivesData, ArchivesSauvegarde)", "le contenu est identique à la sauvegarde");
	// Variante légitime : réparer à la main (sed) donne le même état.
	var jeu2 = neuf(); surArchives(jeu2);
	jeu2.taper("sudo sed -i '/\\[nuee\\]/d' /srv/archives/notes-2023.txt", jeu2.lire("MOT_DE_PASSE_SUDO"));
	fait(jeu2, "d_archives_restaurer", "variante : retirer la ligne trafiquée à la main est accepté");
	// Correctif.
	jeu.jouerSolution("cd /usr/local/bin");
	pasFait(jeu, "d_archives_patch", "le script d'entrée n'est pas encore corrigé");
	jeu.jouerSolution("sudo patch depot.sh < ~/correctif.diff");
	fait(jeu, "d_archives_patch", "correctif appliqué (patch)");
	vrai(jeu, "DepotSh.getText().indexOf('traiter \"$nom\"') > -1", "la ligne vulnérable a été corrigée");
})();

/* ================================================================== */
/* 9. Invocation : le script, ses arguments, et le dernier Corbeau     */
/* ================================================================== */
var SCRIPT_BON = [
	"cat > ~/academie/nettoyage.sh <<'FIN'",
	"#!/bin/bash",
	"set -e",
	'dossier="$1"',
	'if [ -z "$dossier" ]; then',
	'echo "usage" >&2',
	"exit 1",
	"fi",
	"compter() {",
	'echo "$1 fichiers"',
	"}",
	"n=0",
	'for f in $(find "$dossier" -name "*.nuee"); do',
	'if [ -e "$f" ]; then',
	'sudo mv "$f" /quarantaine/',
	"n=$((n + 1))",
	"fi",
	"done",
	'compter "$n"',
	"FIN",
	"chmod +x ~/academie/nettoyage.sh"
];
(function(){
	var jeu = neuf(); surArchives(jeu);
	// Un script sans fonction : les structures manquent, l'étape ne passe pas même s'il déplace des fichiers.
	jouer(jeu, [
		"cat > ~/academie/nettoyage.sh <<'FIN'",
		"#!/bin/bash",
		'for f in $(find /srv/depots -name "*.nuee"); do',
		'sudo mv "$f" /quarantaine/',
		"done",
		"FIN",
		"chmod +x ~/academie/nettoyage.sh",
		"sudo bash ~/academie/nettoyage.sh"
	]);
	pasFait(jeu, "d_script_nettoyage", "un script sans fonction ne compte pas (structures manquantes)");
	// Le bon script.
	jouer(jeu, SCRIPT_BON);
	jeu.jouerSolution("sudo bash ~/academie/nettoyage.sh /srv/depots");
	fait(jeu, "d_script_nettoyage", "script complet (fonction, boucle, condition) qui a vraiment déplacé des résidus");
	// Arguments et code de retour.
	pasFait(jeu, "d_script_arguments", "pas encore prouvé qu'il refuse de tourner sans argument");
	jeu.jouerSolution("sudo bash ~/academie/nettoyage.sh");
	jeu.jouerSolution("sudo bash ~/academie/nettoyage.sh /srv/depots");
	fait(jeu, "d_script_arguments", "sans argument il échoue, avec argument il nettoie");
	// Le dernier Corbeau : le service redépose tant qu'il tourne.
	pasFait(jeu, "d_corbeau", "le service nuee-regen tourne encore");
	jeu.taper("sudo systemctl disable --now nuee-regen", jeu.lire("MOT_DE_PASSE_SUDO"));
	jeu.jouerSolution("sudo bash ~/academie/nettoyage.sh /srv/depots");
	fait(jeu, "d_corbeau", "service arrêté et plus aucun résidu : le dernier Corbeau est battu");
	vrai(jeu, "ArchivesDepots.items.filter(function(it){ return /\\.nuee$/.test(it.itemname); }).length === 0", "plus aucun *.nuee dans /srv/depots");
})();

/* ================================================================== */
/* 10. Le retour d'expérience                                          */
/* ================================================================== */
(function(){
	var jeu = neuf(); surArchives(jeu);
	var ip = jeu.lire("IP_NUEE[0]"), vol = jeu.lire("VOLUME_TOTAL");
	// Un rapport incomplet (sans la rubrique « mesures ») est refusé.
	jouer(jeu, [
		"cat > ~/academie/rex.txt <<'FIN'",
		"Chronologie : la nuit.",
		"Indicateurs : " + ip,
		"Volume : " + vol,
		"Donnees : comptes etudiants.",
		"FIN",
		"cp ~/academie/rex.txt ~/Cybersup/SalleServeurs/Academie/BoiteDeLaurent"
	]);
	pasFait(jeu, "d_fin", "un REX sans la rubrique « mesures » est refusé");
	jouer(jeu, [
		"cat > ~/academie/rex.txt <<'FIN'",
		"Chronologie : intrusion, exfiltration, bombe pour minuit.",
		"Indicateurs de compromission : " + ip,
		"Volume exfiltre : " + vol + " octets.",
		"Donnees concernees : comptes etudiants minimises.",
		"Mesures prises : quarantaine, bombe desamorcee, archives restaurees.",
		"FIN",
		"cp ~/academie/rex.txt ~/Cybersup/SalleServeurs/Academie/BoiteDeLaurent"
	]);
	fait(jeu, "d_fin", "REX complet déposé chez Laurent : victoire du chapitre");
	vrai(jeu, "state.has('victoireCh4')", "la victoire du chapitre 4 est enregistrée");
	vrai(jeu, "Home.getItemFromName('CertificatAvance') !== -1", "le CertificatAvance est posé dans la Maison");
	vrai(jeu, "state.texteDuCertificat5().indexOf('CERTIFICAT AVANCÉ') > -1", "le certificat porte le bon intitulé");
	vrai(jeu, "typeof state.codeDuCertificat5() === 'string' && state.codeDuCertificat5().length > 10", "le code du certificat se fabrique");
})();

/* ================================================================== */
/* 11. L'horloge de la nuit et minuit sans désamorçage                 */
/* ================================================================== */
(function(){
	var jeu = neuf();
	var h0 = jeu.lire("state.ch4.horloge");
	jeu.taper("ls");
	jeu.taper("ls");
	var h2 = jeu.lire("state.ch4.horloge");
	verifier(h2 === h0 + 2 * jeu.lire("PAS_HORLOGE"), "l'horloge avance d'un pas par commande : " + h0 + " -> " + h2);
	verifier(/^\d\d:\d\d$/.test(jeu.lire("heureDeLaNuit()")), "l'heure de la nuit s'affiche en HH:MM");
	contient(jeu, "cat ~/Cybersup/SalleServeurs/Academie/Horloge", "minuit", "l'Horloge annonce minuit");

	// Minuit sans désamorçage : la bombe chiffre les archives (ce n'est pas une défaite).
	var jeu2 = neuf(); surArchives(jeu2);
	jeu2.lire("state.ch4.horloge = " + (jeu2.lire("MINUIT") - 1) + ";");
	jeu2.taper("ls");  // franchit minuit
	vrai(jeu2, "state.ch4.bombeSonnee", "minuit sans désamorçage : la bombe a sonné");
	vrai(jeu2, "ArchivesData.items.every(function(it){ return /\\.nuee$/.test(it.itemname); })", "les archives sont chiffrées (fichiers .nuee)");
	// La restauration reste possible et répare tout.
	jeu2.taper("sudo rsync -a --delete /srv/sauvegarde-hors-ligne/ /srv/archives/", jeu2.lire("MOT_DE_PASSE_SUDO"));
	fait(jeu2, "d_archives_restaurer", "après minuit, rsync restaure quand même les archives");
	vrai(jeu2, "donneesEgales(ArchivesData, ArchivesSauvegarde)", "les archives sont de nouveau saines après restauration");
})();

function contient(jeu, cmd, mot, m){ verifier(String(jeu.taper(cmd)).toLowerCase().indexOf(mot) > -1, m + " : « " + mot + " » absent"); }

/* ================================================================== */
/* 12. Sauvegarde et rechargement                                      */
/* ================================================================== */
(function(){
	var stock = {};
	var jeu = neuf(stock);
	surArchives(jeu);
	jeu.taper('grep -E "45\\.137\\." /var/log/acces.log > ~/academie/traces.log');
	fait(jeu, "d_runes_traces", "avant rechargement : traces faites");
	var horloge = jeu.lire("state.ch4.horloge");
	jeu.lire("state.save()");
	var repris = monde.nouveauMonde(stock);
	vrai(repris, "state.has('ch4Ouvert')", "rechargement : le chapitre 4 est toujours ouvert");
	fait(repris, "d_runes_traces", "rechargement : l'étape faite est conservée");
	verifier(repris.lire("state.ch4.horloge") === horloge, "rechargement : l'horloge de la nuit est conservée (" + horloge + ")");
	verifier(repris.lire("Home.getChildFromName('academie') !== -1"), "rechargement : le dossier ~/academie est conservé");
	verifier(repris.lire("SalleServeurs.getChildFromName('Academie') !== -1"), "rechargement : l'escalier vers l'Académie est toujours là");
	verifier(repris.lire("current_room.room_name"), "rechargement : on reprend quelque part de valide");
})();

/* ================================================================== */
/* 13. Le départ direct par « chapitre 4 »                             */
/* ================================================================== */
(function(){
	var jeu = neuf();
	vrai(jeu, "state.has('ch4Direct')", "départ direct : le drapeau ch4Direct est posé");
	vrai(jeu, "state.has('chapitre1Saute')", "départ direct : les chapitres précédents ne sont pas notés");
	// Rejouer « chapitre 4 » quand il est déjà ouvert : message, pas de dégât.
	contient(jeu, "chapitre 4", "déjà ouvert", "chapitre 4 déjà ouvert : message clair");
	// « chapitre 5 » n'existe pas.
	contient(jeu, "chapitre 5", "1, 2, 3 et 4", "il n'y a pas de chapitre 5");
	// La liste des chapitres mentionne l'Académie.
	contient(jeu, "chapitre", "académie", "la liste des chapitres mentionne l'Académie");
	// Depuis une partie déjà engagée (une étape du chapitre 1 franchie), on ne part plus directement.
	var jeu2 = monde.nouveauMonde({});
	jeu2.lire("state.quests.m_mv = true;");
	contient(jeu2, "chapitre 4", "déjà commencé", "chapitre 4 refusé si la partie est déjà engagée");
	faux(jeu2, "state.has('ch4Direct')", "aucun départ direct après avoir commencé le chapitre 1");
})();

/* ================================================================== */
/* 14. Le parcours complet d'une traite (toutes les étapes)            */
/* ================================================================== */
var CH4 = require("fs").existsSync("/dev/null") ? [
	"cat Frances", "cat AVIS.txt",
	"cd Runes", "cat Henry", "cd ../Divination", "cat Alfred", "cd ../Transmutation", "cat Lee",
	"cd ../Grimoires", "cat Stephen", "cd ../Alchimie", "cat Doug", "cd ../Chronomancie", "cat Paul",
	"cd ../Archives", "cat Andrew", "cd ../Invocation", "cat Brian", "cd ..",
	"ssh archives", "mkdir ~/academie",
	'grep -E "45\\.137\\." /var/log/acces.log > ~/academie/traces.log',
	'grep -oE "45\\.137\\.[0-9]+\\.[0-9]+" /var/log/acces.log | sort -u > ~/academie/ioc.txt',
	"awk '$3 ~ /^45\\.137\\./ { s += $4 } END { print s }' /var/log/proxy.log > ~/academie/volume.txt",
	"awk '$3 ~ /^45\\.137\\./ { s[$2] += $4 } END { for (m in s) print m, s[m] }' /var/log/proxy.log | sort -k2,2nr | head -3 > ~/academie/victimes.txt",
	"sed -E 's/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}/[mail]/g; s/[0-9]{6,8}/ETU-XXXX/g' /srv/edr/export-brut.txt > ~/academie/export-cnil.txt",
	"sudo sed -i -e '/exec_hook/d' -e 's/^autorise_tout = oui/autorise_tout = non/' /etc/archives.conf",
	"jq -r '.[] | select(.gravite==\"critique\") | .machine' /srv/edr/alertes.json | sort -u > ~/academie/machines.txt",
	"jq -r 'group_by(.machine)[] | [.[0].machine, length] | @csv' /srv/edr/alertes.json > ~/academie/alertes.csv",
	"cut -d: -f1 /etc/passwd | sort > ~/academie/sys.txt",
	"cut -d, -f1 /srv/personnel.csv | sort > ~/academie/legit.txt",
	"comm -23 ~/academie/sys.txt ~/academie/legit.txt > ~/academie/fantomes.txt",
	"cat ~/academie/fantomes.txt | xargs -I {} sudo usermod -L {}",
	"sudo find /srv /tmp -user nuee -exec mv {} /quarantaine/ \\;",
	"sudo systemctl disable --now maj-nocturne.timer",
	"sudo atrm 1",
	"sudo crontab -u <fantome-cron> -r",
	'printf "30 2 * * * /usr/local/bin/sauvegarde.sh\\n" | crontab -',
	"sudo rsync -a --delete /srv/sauvegarde-hors-ligne/ /srv/archives/",
	"cd /usr/local/bin",
	"sudo patch depot.sh < ~/correctif.diff"
].concat(SCRIPT_BON).concat([
	"sudo bash ~/academie/nettoyage.sh /srv/depots",
	"sudo bash ~/academie/nettoyage.sh",
	"sudo bash ~/academie/nettoyage.sh /srv/depots",
	"sudo systemctl disable --now nuee-regen",
	"sudo bash ~/academie/nettoyage.sh /srv/depots",
	"cat > ~/academie/rex.txt <<'FIN'",
	"Chronologie : la nuit, exfiltration puis bombe pour minuit.",
	"Indicateurs de compromission : <ip-nuee>.",
	"Volume exfiltre : <volume> octets.",
	"Donnees concernees : comptes etudiants minimises.",
	"Mesures prises : quarantaine, desamorcage, restauration, correctif, script arrete.",
	"FIN",
	"cp ~/academie/rex.txt ~/Cybersup/SalleServeurs/Academie/BoiteDeLaurent"
]) : [];
(function(){
	var jeu = neuf();
	jouer(jeu, CH4);
	jeu.lire("QUETES_CH4").forEach(function(qq){ fait(jeu, qq.id, "parcours complet : " + qq.id); });
	verifier(jeu.lire("state.ch4.horloge") < jeu.lire("MINUIT"), "le parcours principal finit avant minuit (horloge " + jeu.lire("state.ch4.horloge") + " < " + jeu.lire("MINUIT") + ")");
	var heure = jeu.lire("heureDeLaNuit()");
	verifier(heure >= "22:00" && heure <= "23:59", "le parcours principal finit vers 23 h (" + heure + ")");
	// Les étapes seules, sans les défis ni la visite complète : la moyenne, pas plus (les 20 sur 20 sont dans tests/solution.js).
	verifier(jeu.lire("state.note(5)") >= 10 && jeu.lire("state.note(5)") < 20, "parcours principal seul : note moyenne (" + jeu.lire("state.noteTexte(5)") + ")");
	vrai(jeu, "state.has('victoireCh4')", "parcours complet : victoire du chapitre");
	vrai(jeu, "Object.keys(TROPHEES_CH4).every(function(id){ return state.ch4.trophees[id]; })", "parcours complet : les 18 badges sont annoncés");
	vrai(jeu, "state.has('platine_ch4')", "parcours complet : le badge platine du chapitre");
	vrai(jeu, "!!state.quests.s_d_sans_indice", "parcours complet sans indice : le défi « sans indice » est réussi");
})();

/* ================================================================== */
/* 15. Les listes, les sorts, le guidage et le barème                  */
/* ================================================================== */
(function(){
	var jeu = neuf();
	verifier(jeu.lire("QUETES_CH4.length") === 20, "20 étapes principales au chapitre 4");
	verifier(jeu.lire("QUETES_CH4.every(function(x){ return /^d_/.test(x.id); })") === true, "chaque étape a un identifiant d_*");
	jeu.lire("QUETES_CH4").forEach(function(x){
		verifier(jeu.lire("!!INDICES_CH4[" + JSON.stringify(x.id) + "] && INDICES_CH4[" + JSON.stringify(x.id) + "].length === 2"), "indices à deux paliers pour " + x.id);
		verifier(typeof x.titre === "string" && x.titre.length > 3, "titre pour " + x.id);
		verifier(typeof x.indice === "string" && x.indice.length > 5, "indice gratuit pour " + x.id);
	});
	verifier(jeu.lire("ORDRE_DES_SORTS_5.length") === 23, "23 sorts au chapitre 4");
	jeu.lire("ORDRE_DES_SORTS_5").forEach(function(s){
		verifier(jeu.lire("!!MANUEL[" + JSON.stringify(s) + "] && !MANUEL[" + JSON.stringify(s) + "].horsBareme"), s + " : page de manuel, compté au barème");
		verifier(jeu.lire("chapitreDuSort(" + JSON.stringify(s) + ") === 5"), s + " appartient au chapitre 5");
	});
	// Chaque maître enseigne bien ses sorts.
	[["Stephen", ["jq"]], ["Doug", ["xargs", "comm", "join", "paste", "column", "nl", "fold", "shuf"]],
	 ["Paul", ["at", "atq", "atrm"]], ["Andrew", ["rsync", "patch", "tac", "split"]],
	 ["Brian", ["read", "printf", "seq", "basename", "dirname", "expr", "sleep"]]].forEach(function(m){
		m[1].forEach(function(s){ verifier(jeu.lire(m[0] + ".teaches.indexOf(" + JSON.stringify(s) + ") > -1"), m[0] + " enseigne " + s); });
	});
	// Pas de tiret cadratin dans le fichier du chapitre.
	var src = require("fs").readFileSync(require("path").join(__dirname, "..", "Web", "static", "javascript", "Chapitre4.js"), "utf8");
	verifier(src.indexOf("—") === -1, "pas de tiret cadratin dans Chapitre4.js");
	verifier(/Cybersup/.test(src) && src.indexOf("CyberSup") === -1, "on écrit « Cybersup »");
	// La radio de Grace suit l'étape en cours.
	var r0 = jeu.taper("cat ~/Cybersup/SalleServeurs/Academie/Radio");
	verifier(r0.toLowerCase().indexOf("frances") > -1, "au début, la radio renvoie à Frances");
	jeu.jouerSolution("cat Frances"); jeu.jouerSolution("cat AVIS.txt");
	var r1 = jeu.taper("cat ~/Cybersup/SalleServeurs/Academie/Radio");
	verifier(r0 !== r1, "la radio change d'un message à l'autre");
	// L'horloge et le journal.
	verifier(jeu.taper("cat ~/Cybersup/SalleServeurs/Academie/Horloge").indexOf("HORLOGE") > -1, "l'Horloge s'affiche");
	verifier(jeu.taper("quetes").indexOf("Académie") > -1, "le journal de quêtes montre le chapitre 4");
	verifier(jeu.taper("xp").indexOf("ACADÉMIE") > -1 || jeu.taper("xp").indexOf("CHAPITRE 4") > -1, "le tableau d'XP montre le chapitre 4");
	verifier(jeu.taper("help 4").length > 0, "help 4 répond");
	// Le barème : xp5 part de l'apprentissage, et ne dépasse jamais le maximum.
	verifier(jeu.lire("state.xpMax5()") > 0, "le barème du chapitre 4 est défini");
	verifier(jeu.lire("state.xp5 <= state.xpMax5()"), "xp5 ne dépasse pas xpMax5");
	verifier(jeu.lire("state.note(5) >= 0 && state.note(5) <= 20"), "la note du chapitre 4 est entre 0 et 20");
})();

/* ================================================================== */
/* 16. Les maîtres vivants : entrée, métaphore, syntaxe, mission       */
/* ================================================================== */
var A = "~/Cybersup/SalleServeurs/Academie/";
var MAITRES = [["Runes", "Henry", "tamis", "registre-des-sorts.log"], ["Divination", "Alfred", "colonnes", "potions.txt"],
	["Transmutation", "Lee", "ligne par ligne", "recettes.txt"], ["Grimoires", "Stephen", "arbre", "bibliotheque.json"],
	["Alchimie", "Doug", "chaînes", "Reserve"], ["Chronomancie", "Paul", "sablier", "horaires-des-sabliers.txt"],
	["Archives", "Andrew", "Miroir", "Parchemins"], ["Invocation", "Brian", "sort que TU écris", "salut.sh"]];
function lireMaitre(jeu, aile, nom){ return String(jeu.taper("cat " + A + aile + "/" + nom)).replace(/\x1b\[[0-9;]*m/g, ""); }
(function(){
	var jeu = neuf();
	MAITRES.forEach(function(m){
		var t = lireMaitre(jeu, m[0], m[1]);
		verifier(t.indexOf(m[2]) > -1, m[1] + " : une métaphore qui explique son école (« " + m[2] + " »)");
		verifier(t.indexOf(m[3]) > -1, m[1] + " : la syntaxe s'enseigne sur les données de son aile (" + m[3] + ")");
		verifier(t.indexOf("Le métier") > -1, m[1] + " : une phrase ancre l'étape dans le vrai métier");
		verifier(t.indexOf("Les défis de " + m[1]) > -1, m[1] + " : il annonce ses six défis");
		verifier(jeu.lire(m[1] + ".reveals.length") === 6, m[1] + " révèle ses six défis");
		verifier(jeu.lire(m[1] + ".picturename.indexOf('item_professor.gif') === -1"), m[1] + " a son propre portrait");
	});
	// Aucun maître ne donne la commande exacte d'une étape (elle reste au palier payant et dans docs/solution.md).
	var tous = MAITRES.map(function(m){ return lireMaitre(jeu, m[0], m[1]); }).join("\n");
	["select(.gravite", "group_by(.machine)", "/var/log/acces.log >", "/var/log/proxy.log |", "-u " + jeu.lire("FANTOME_CRON"),
	 "30 2 * * *", "maj-nocturne.timer", "patch depot.sh", "--delete /srv", "exec_hook/d", "comm -23 ~/academie", "-user nuee"].forEach(function(bout){
		verifier(tous.indexOf(bout) === -1, "aucun maître ne donne la solution exacte (« " + bout + " » absent)");
	});
	// Les données d'entraînement sont lisibles, à root, et ne sont pas celles de la mission.
	vrai(jeu, "AileRunes.getItemFromName('registre-des-sorts.log') !== -1 && AileRunes.getItemFromName('registre-des-sorts.log').owner === 'root'", "le registre des sorts est posé dans l'aile des Runes");
	vrai(jeu, "Reserve.chapitre === 5 && Parchemins.chapitre === 5", "la Réserve et les Parchemins sont des lieux du chapitre");
	vrai(jeu, "TEXTE_ACCES_LOG.indexOf('eleve=') === -1", "le registre d'entraînement n'a rien de commun avec le journal de la mission");
})();

/* ================================================================== */
/* 17. Les maîtres réagissent : avant, entre, erreur, après            */
/* ================================================================== */
(function(){
	var jeu = neuf();
	surArchives(jeu);
	var avant = lireMaitre(jeu, "Runes", "Henry");
	jeu.taper("grep 10.0.92 /var/log/acces.log > ~/academie/traces.log");
	verifier(lireMaitre(jeu, "Runes", "Henry").indexOf("trous") > -1, "Henry réagit à un traces.log plein de lignes d'élèves");
	jeu.taper('grep -E "45\\.137\\." /var/log/acces.log > ~/academie/traces.log');
	var entre = lireMaitre(jeu, "Runes", "Henry");
	verifier(entre !== avant && entre.indexOf("visages") > -1, "Henry passe à la suite une fois les traces faites");
	jeu.taper("grep -oE '45\\.137\\.[0-9]+\\.[0-9]+' /var/log/acces.log > ~/academie/ioc.txt");
	verifier(lireMaitre(jeu, "Runes", "Henry").indexOf("sort -u") > -1, "Henry réagit aux doublons (sort -u)");
	jeu.taper("grep -oE '45\\.137\\.[0-9]+\\.[0-9]+' /var/log/acces.log | sort -u > ~/academie/ioc.txt");
	var fin = lireMaitre(jeu, "Runes", "Henry");
	verifier(fin.indexOf("astreinte") > -1, "Henry félicite avec une anecdote du métier");
	verifier(fin.indexOf("Assieds-toi") === -1, "une fois fini, Henry ne refait pas son entrée");
	// Alfred : le total de tout le trafic, au lieu de la Nuée seule.
	jeu.taper("awk '{ s += $4 } END { print s }' /var/log/proxy.log > ~/academie/volume.txt");
	verifier(lireMaitre(jeu, "Divination", "Alfred").indexOf("TOUT le trafic") > -1, "Alfred réagit à un volume qui pèse tout le trafic");
	// Stephen : des machines en double.
	jeu.taper("jq -r '.[] | select(.gravite==\"critique\") | .machine' /srv/edr/alertes.json > ~/academie/machines.txt");
	verifier(lireMaitre(jeu, "Grimoires", "Stephen").indexOf("sort -u") > -1 || jeu.lire("edrMachinesCritiques().length === ALERTES_EDR.filter(function(a){ return a.gravite === 'critique'; }).length"), "Stephen réagit aux machines en double");
	// Doug : la bonne liste, mais pas de verrou.
	jeu.taper("cut -d: -f1 /etc/passwd | sort > ~/academie/sys.txt");
	jeu.taper("cut -d, -f1 /srv/personnel.csv | sort > ~/academie/legit.txt");
	jeu.taper("comm -23 ~/academie/sys.txt ~/academie/legit.txt > ~/academie/fantomes.txt");
	verifier(lireMaitre(jeu, "Alchimie", "Doug").indexOf("verrouille") > -1, "Doug rappelle de verrouiller les fantômes listés");
	// Paul : un seul déclencheur désamorcé sur trois.
	jeu.taper("sudo systemctl disable --now maj-nocturne.timer");
	var p = lireMaitre(jeu, "Chronomancie", "Paul");
	verifier(p.indexOf("Bien commencé") > -1 && p.indexOf("sablier de secours") > -1, "Paul dit ce qui reste armé de la bombe");
	// Lee : la ligne retirée, le réglage resté ouvert.
	jeu.taper("sed -E 's/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}/[mail]/g; s/[0-9]{6,8}/ETU-XXXX/g' /srv/edr/export-brut.txt > ~/academie/export-cnil.txt");
	jeu.taper("sudo sed -i '/exec_hook/d' /etc/archives.conf");
	verifier(lireMaitre(jeu, "Transmutation", "Lee").indexOf("resté ouvert") > -1, "Lee voit que le réglage est resté ouvert");
	// Brian : un script sans fonction.
	jeu.taper("echo 'for f in a; do if true; then echo $f; fi; done' > ~/academie/nettoyage.sh");
	verifier(lireMaitre(jeu, "Invocation", "Brian").indexOf("une fonction") > -1, "Brian dit ce qui manque au script");
	// Andrew : une restauration sans --delete après minuit laisserait des fichiers en trop.
	var jeu2 = neuf(); surArchives(jeu2);
	jeu2.lire("state.ch4.horloge = MINUIT; verifierMonde();");
	jeu2.taper("sudo rsync -a /srv/sauvegarde-hors-ligne/ /srv/archives/");
	verifier(lireMaitre(jeu2, "Archives", "Andrew").indexOf("rien effacé") > -1, "Andrew remarque une restauration sans --delete");
})();

/* ================================================================== */
/* 18. Frances, Laurent, la radio et l'horloge, vivants                */
/* ================================================================== */
(function(){
	var jeu = neuf();
	var f0 = jeu.taper("cat " + A + "Frances");
	verifier(f0.indexOf("pour m'amuser") > -1, "Frances culpabilise : ses notes servent à la Nuée");
	jeu.taper("cat " + A + "AVIS.txt");
	var f1 = jeu.taper("cat " + A + "Frances");
	verifier(f1 !== f0 && f1.indexOf("Henry") > -1, "Frances change après l'avis, et renvoie vers Henry");
	surArchives(jeu);
	jeu.taper('grep -E "45\\.137\\." /var/log/acces.log > ~/academie/traces.log');
	verifier(jeu.taper("cat " + A + "Frances").indexOf("cahier") > -1, "Frances reconnaît ses méthodes volées");
	jeu.lire("state.ch4.horloge = MINUIT - 50");
	verifier(jeu.taper("cat " + A + "Frances").indexOf("moins d'une heure") > -1, "Frances s'inquiète quand minuit approche");
	var r = jeu.taper("cat " + A + "Radio");
	verifier(r.indexOf("Minuit dans") > -1, "la radio de Grace presse quand minuit approche");
	jeu.lire("state.ch4.horloge = MINUIT - 20");
	verifier(jeu.taper("cat " + A + "Radio").indexOf("URGENT") > -1, "à moins de 30 minutes, la radio passe en urgence");
	jeu.lire("state.ch4.horloge = 30");
	verifier(jeu.taper("cat " + A + "Radio").indexOf("URGENT") === -1, "loin de minuit, pas d'urgence");
	jeu.taper("sudo systemctl disable --now maj-nocturne.timer"); jeu.taper("sudo atrm 1");
	jeu.jouerSolution("sudo crontab -u <fantome-cron> -r");
	fait(jeu, "d_chrono_bombe", "la bombe désamorcée");
	jeu.lire("state.ch4.horloge = MINUIT - 10");
	verifier(jeu.taper("cat " + A + "Radio").indexOf("URGENT") === -1, "bombe désamorcée : plus d'urgence à la radio");
	verifier(jeu.taper("cat " + A + "Frances").indexOf("trois exemplaires") > -1, "Frances grandit : elle voit son schéma défait");
	vrai(jeu, "!!state.quests.s_d_avant_minuit === false || state.ch4.heureDesamorcage < 180", "le défi « avant 23 h » suit l'heure du désamorçage");
	verifier(jeu.taper("cat " + A + "Horloge").indexOf("HORLOGE") > -1, "l'Horloge est vivante");
	verifier(jeu.taper("cat " + A + "Laurent").indexOf("23 h") > -1, "Laurent annonce les deux défis de la nuit");
	vrai(jeu, "LaurentArcanes.reveals.indexOf('s_d_sans_indice') > -1 && Horloge.reveals.indexOf('s_d_avant_minuit') > -1", "Laurent et l'Horloge révèlent les défis de la nuit");
	// Une phrase du métier dans la radio, pour les étapes qui ne sont pas portées par un maître.
	["d_frances", "d_runes_traces", "d_awk_victimes", "d_sed_desarmer", "d_jq_rapport", "d_chrono_sauvegarde", "d_archives_patch", "d_script_arguments", "d_corbeau", "d_fin"].forEach(function(id){
		vrai(jeu, "!!METIER_RADIO[" + JSON.stringify(id) + "]", "la radio ancre " + id + " dans le métier");
	});
	vrai(jeu, "METIER_RADIO.d_chrono_sauvegarde.indexOf('3-2-1') > -1", "la règle 3-2-1 est citée");
	vrai(jeu, "MAITRES_VIVANTS.transmutation.metier.indexOf('72 heures') > -1", "les 72 heures de la CNIL sont citées");
	vrai(jeu, "MAITRES_VIVANTS.chronomancie.metier.indexOf('crontab oubliée') > -1", "la crontab oubliée est citée");
	vrai(jeu, "MAITRES_VIVANTS.runes.metier.indexOf('IOC') > -1", "les IOC partagés sont cités");
	// Sans état de chapitre (avant l'ouverture), les textes vivants ne plantent pas.
	var vierge = monde.nouveauMonde({});
	verifier(typeof vierge.lire("Frances.getText()") === "string" && typeof vierge.lire("Henry.getText()") === "string", "les textes vivants tiennent avant l'ouverture du chapitre");
})();

/* ================================================================== */
/* 19. Les 50 défis : la bonne commande passe, la mauvaise non         */
/* ================================================================== */
(function(){
	var jeu = neuf();
	verifier(jeu.lire("QUETES_SECONDAIRES_CH4.length") === 50, "50 défis au chapitre 4");
	verifier(jeu.lire("QUETES_SECONDAIRES_CH4.every(function(q){ return /^s_d_/.test(q.id); })"), "chaque défi a un identifiant s_d_*");
	verifier(jeu.lire("ECOLES.every(function(e){ return idsDefis(e.cle).length === 6; })"), "six défis par école");
	verifier(jeu.lire("chapitreDeQuete('s_d_grep_w') === 5"), "les défis comptent au chapitre 4");
	function essai(aile, mauvais, bon, id){
		jeu.taper("cd " + A + aile);
		if (mauvais) { jeu.jouerSolution(mauvais); pasFait(jeu, id, id + " : « " + mauvais + " » ne suffit pas"); }
		var xp = jeu.lire("state.xp5");
		jeu.jouerSolution(bon);
		fait(jeu, id, id + " : « " + bon + " »");
		if (mauvais) verifier(jeu.lire("state.xp5") - xp >= 50, id + " : un défi rapporte 50 XP au chapitre 4");
	}
	["cat " + A + "Grimoires/Stephen", "cat " + A + "Alchimie/Doug", "cat " + A + "Chronomancie/Paul", "cat " + A + "Archives/Andrew", "cat " + A + "Invocation/Brian"].forEach(function(c){ jeu.taper(c); });
	essai("Runes", "grep feu registre-des-sorts.log", "grep -w feu registre-des-sorts.log", "s_d_grep_w");
	essai("Runes", "grep eleve registre-des-sorts.log", "grep -o 'eleve=[a-z]*' registre-des-sorts.log", "s_d_grep_o");
	essai("Runes", "grep explosion registre-des-sorts.log", "grep -A 1 -B 1 explosion registre-des-sorts.log", "s_d_grep_C");
	essai("Runes", "grep -v eleve registre-des-sorts.log", "grep -v '^#' registre-des-sorts.log", "s_d_grep_v");
	essai("Runes", "grep -E '^[0-9]+$' codes-de-salle.txt", "grep '^[[:digit:]]*$' codes-de-salle.txt", "s_d_grep_classe");
	essai("Runes", "grep -c reussi registre-des-sorts.log", "grep -c 'resultat=rate' registre-des-sorts.log", "s_d_grep_c");
	essai("Divination", "awk '{ s += $4 } END { print s }' potions.txt", "awk 'BEGIN { print \"Stock\" } { s += $4 } END { print \"total\", s }' potions.txt", "s_d_awk_beginend");
	essai("Divination", "awk '{ s += $4 } END { print s / NR }' potions.txt", "awk '{ s += $3; n++ } END { printf \"%.2f\\n\", s / n }' potions.txt", "s_d_awk_moyenne");
	essai("Divination", "awk '{ print $1, $4 }' potions.txt", "awk '{ printf \"%s : %d\\n\", $1, $4 }' potions.txt", "s_d_awk_printf");
	essai("Divination", "awk '{ print $2 }' eleves.csv", "awk -F, 'NR > 1 { print $2 }' eleves.csv", "s_d_awk_F");
	essai("Divination", "awk '{ print $1 }' propheties.txt", "awk '{ print $NF }' propheties.txt", "s_d_awk_NF");
	essai("Divination", "awk '{ print $1 }' potions.txt", "awk '{ print toupper($1) }' potions.txt", "s_d_awk_fonction");
	essai("Transmutation", "sed 's#/#-#g' recettes.txt", "sed -E 's#([0-9]+)/([0-9]+)/([0-9]+)#\\3-\\2-\\1#g' recettes.txt", "s_d_sed_dates");
	essai("Transmutation", "sed 's/ //' recettes.txt", "sed -E 's/[[:space:]]+$//' recettes.txt", "s_d_sed_nettoyer");
	essai("Transmutation", "sed '3,5p' recettes.txt", "sed -n '3,5p' recettes.txt", "s_d_sed_n");
	essai("Transmutation", "sed 's/a/A/g' recettes.txt", "sed 'y/abc/ABC/' recettes.txt", "s_d_sed_y");
	essai("Transmutation", "sed '1i Titre' recettes.txt", "sed -e '1i Titre' -e '$a Signature' recettes.txt", "s_d_sed_ai");
	jeu.taper("mkdir -p ~/academie");
	essai("Transmutation", "cp recettes.txt ~/academie/r.txt", "sed -i.bak 's/sauge/romarin/' ~/academie/r.txt", "s_d_sed_bak");
	essai("Grimoires", "jq '.' bibliotheque.json", "jq -r '.bibliotheque' bibliotheque.json", "s_d_jq_point");
	essai("Grimoires", "jq 'length' bibliotheque.json", "jq '.ouvrages | length' bibliotheque.json", "s_d_jq_length");
	essai("Grimoires", "jq 'keys' bibliotheque.json", "jq '.ouvrages[2] | keys' bibliotheque.json", "s_d_jq_keys");
	essai("Grimoires", "jq '.ouvrages[]' bibliotheque.json", "jq --compact-output '.ouvrages[]' bibliotheque.json", "s_d_jq_c");
	essai("Grimoires", "jq '.ouvrages[]' bibliotheque.json", "jq '.ouvrages[] | {titre, pages}' bibliotheque.json", "s_d_jq_objet");
	essai("Grimoires", "jq -r '.ouvrages[].titre' bibliotheque.json", "jq -r '.ouvrages | sort_by(.pages) | reverse | .[].titre' bibliotheque.json", "s_d_jq_tri");
	essai("Alchimie", "find Reserve -size +1c", "find Reserve -size +2k", "s_d_find_size");
	essai("Alchimie", "find Reserve -name 'fiole*'", "find Reserve -type f -empty", "s_d_find_empty");
	essai("Alchimie", "paste ingredients.txt", "paste -d: ingredients.txt quantites.txt", "s_d_paste");
	essai("Alchimie", "join notes.txt notes.txt", "join maisons.txt notes.txt", "s_d_join");
	essai("Alchimie", "column tableau-brut.txt", "column -t tableau-brut.txt", "s_d_column");
	essai("Alchimie", "sort -k2 stocks.txt", "sort -k2nr stocks.txt", "s_d_sort_k");
	essai("Chronomancie", "echo 45:04", "echo 4h45", "s_d_cron_quiz");
	essai("Chronomancie", "date", "date -d '3 days'", "s_d_date_d");
	// Le cycle d'un sablier : poser, voir, briser (dans cet ordre, et un vrai sablier du joueur).
	jeu.taper("atrm 1");
	pasFait(jeu, "s_d_at_cycle", "briser le sablier de la Nuée sans droits ne fait pas le cycle");
	jeu.taper("echo 'echo test' | at now + 1 hour");
	pasFait(jeu, "s_d_at_cycle", "poser un sablier ne suffit pas");
	jeu.taper("atq");
	jeu.taper("atrm $(atq | cut -f1)");
	fait(jeu, "s_d_at_cycle", "poser, voir, briser un sablier");
	vrai(jeu, "etatArcanes().at.taches.some(function(t){ return t.bombe; })", "le cycle du joueur n'a pas touché au sablier de la Nuée");
	// Les défis du serveur.
	surArchives(jeu);
	jeu.taper("systemctl status sshd");
	pasFait(jeu, "s_d_timer_status", "le statut d'un autre service ne compte pas");
	jeu.taper("systemctl status maj-nocturne.timer");
	fait(jeu, "s_d_timer_status", "systemctl status sur le timer de la Nuée");
	jeu.taper("systemctl list-timers --all");
	pasFait(jeu, "s_d_timer_all", "list-timers --all avant le désamorçage : le timer n'est pas encore arrêté");
	jeu.taper("sudo systemctl disable --now maj-nocturne.timer");
	jeu.taper("systemctl list-timers");
	pasFait(jeu, "s_d_timer_all", "sans --all, le timer arrêté n'apparaît pas");
	jeu.taper("systemctl list-timers --all");
	fait(jeu, "s_d_timer_all", "list-timers --all montre le timer désarmé");
	jeu.taper("crontab -l");
	pasFait(jeu, "s_d_crontab_autre", "sa propre crontab ne compte pas");
	jeu.taper("sudo crontab -u gestionnaire -l");
	fait(jeu, "s_d_crontab_autre", "la crontab d'un autre compte, lue avec sudo");
	// Les Archives.
	jeu.taper("exit");
	jeu.taper("cd " + A + "Archives");
	jeu.taper("rsync -a Parchemins/ ~/academie/tout/");
	pasFait(jeu, "s_d_rsync_n", "une vraie copie n'est pas une répétition à blanc");
	pasFait(jeu, "s_d_rsync_exclude", "une copie avec les brouillons ne compte pas");
	jeu.taper("rsync --dry-run -a Parchemins/ ~/academie/x/");
	fait(jeu, "s_d_rsync_n", "rsync --dry-run");
	jeu.taper("rsync -a --exclude='*.tmp' Parchemins/ ~/academie/propre/");
	fait(jeu, "s_d_rsync_exclude", "rsync --exclude=... sans les brouillons");
	jeu.taper("tar -czf ~/academie/c.tgz Parchemins/chant-1.txt Parchemins/chant-2.txt Parchemins/chant-3.txt");
	pasFait(jeu, "s_d_tar", "créer l'archive ne suffit pas : il faut en lister le contenu");
	jeu.taper("tar -tzf ~/academie/c.tgz");
	fait(jeu, "s_d_tar", "tar -tzf liste l'archive .tgz");
	jeu.taper("diff formule.txt formule-v2.txt");
	pasFait(jeu, "s_d_diff_u", "un diff sans -u n'est pas un patron unifié");
	jeu.taper("diff -u formule.txt formule-v2.txt");
	fait(jeu, "s_d_diff_u", "diff -u");
	jeu.taper("patch --dry-run formule-v2.txt amelioration.diff");
	pasFait(jeu, "s_d_patch_dry", "un essai qui échoue (correctif déjà appliqué) ne compte pas");
	jeu.taper("patch --dry-run formule.txt amelioration.diff");
	fait(jeu, "s_d_patch_dry", "patch --dry-run réussi");
	jeu.taper("cp formule.txt ~/academie/"); jeu.taper("cp amelioration.diff ~/academie/");
	jeu.taper("cd ~/academie");
	jeu.taper("patch -R formule.txt amelioration.diff");
	pasFait(jeu, "s_d_patch_R", "découdre ce qui n'a pas été cousu ne compte pas");
	jeu.taper("patch formule.txt amelioration.diff");
	jeu.taper("patch -R formule.txt amelioration.diff");
	fait(jeu, "s_d_patch_R", "coudre puis découdre une copie");
	vrai(jeu, "AileArchives.getItemFromName('formule.txt').getText() === FORMULE", "la formule de l'aile n'a pas bougé");
	// L'Invocation : fonctions, aiguillages, boucles, calculs.
	jeu.taper("un() { echo $1; }"); jeu.taper("un a");
	pasFait(jeu, "s_d_fonction_2args", "une fonction appelée avec un seul argument");
	jeu.taper("un a b");
	fait(jeu, "s_d_fonction_2args", "une fonction appelée avec deux arguments");
	jeu.taper("case x in y) echo y ;; esac");
	fait(jeu, "s_d_case", "un case qui tourne");
	jeu.taper("printf 'a\\nb\\n' > l.txt");
	jeu.taper("while read -r x; do echo \"[$x]\"; done < l.txt");
	fait(jeu, "s_d_while_read", "while read");
	jeu.taper("echo $(whoami)");
	fait(jeu, "s_d_subst", "une substitution $(...)");
	jeu.taper("echo $((6 * 7))");
	fait(jeu, "s_d_arith", "un calcul $((...))");
	jeu.taper("cat > h.txt <<FIN\nune\nFIN");
	fait(jeu, "s_d_heredoc", "un here-document");
	// Une ligne qui échoue ne valide rien.
	var jeu2 = neuf();
	jeu2.taper("case $(introuvable) in *) false ;; esac");
	pasFait(jeu2, "s_d_case", "un case qui échoue ne compte pas");
	pasFait(jeu2, "s_d_subst", "une substitution qui échoue ne compte pas");
	// La colle de Paul : une mauvaise heure donne une aide, pas la quête.
	var jeu3 = neuf();
	jeu3.taper("cd " + A + "Chronomancie"); jeu3.taper("cat Paul");
	verifier(jeu3.taper("echo 45:04").indexOf("minute, PUIS heure") > -1, "Paul corrige une mauvaise réponse");
	pasFait(jeu3, "s_d_cron_quiz", "une mauvaise heure ne valide pas la colle");
	jeu3.taper("cd .."); jeu3.taper("echo 04:45");
	pasFait(jeu3, "s_d_cron_quiz", "la colle se répond dans l'aile de Paul, pas ailleurs");
	// Hors de l'Académie (avant son ouverture), les défis ne se gagnent pas.
	var jeu4 = monde.nouveauMonde({});
	jeu4.lire("state.spells.grep = true;");
	jeu4.lire("Home.addItem(new Item('r.log', REGISTRE_DES_SORTS.join('\\n') + '\\n'));");
	jeu4.taper("grep -w feu r.log");
	verifier(jeu4.lire("!!state.quests.s_d_grep_w") === false, "aucun défi avant l'ouverture du chapitre");
})();

/* ================================================================== */
/* 20. Les badges, le grimoire, le bestiaire, les noms imagés          */
/* ================================================================== */
(function(){
	var fs = require("fs"), path = require("path");
	var jeu = neuf();
	var ids = jeu.lire("Object.keys(TROPHEES_CH4)");
	verifier(ids.length === 18, "18 badges d'étape au chapitre 4 (étapes 2 à 19)");
	var etapes = jeu.lire("QUETES_CH4.map(function(q){ return q.id; })");
	verifier(JSON.stringify(ids) === JSON.stringify(etapes.slice(1, 19)), "un badge par étape, de la 2e à la 19e");
	ids.concat(["platine_ch4"]).forEach(function(id){
		verifier(jeu.lire("!!COMPETENCES[" + JSON.stringify(id) + "]"), id + " : nom de compétence");
		verifier(fs.existsSync(path.join(__dirname, "..", "Web", "static", "img", "badge_" + id + ".gif")), id + " : médaille dessinée");
	});
	ids.forEach(function(id){ verifier(jeu.lire("TROPHEES_CH4[" + JSON.stringify(id) + "][1].length > 30"), id + " : une leçon"); });
	verifier(jeu.lire("rangDuBadge('platine_ch4')") === "platine", "le badge du chapitre complet est platine");
	verifier(jeu.lire("BADGES_DU_PARCOURS.length") === 42, "les badges du parcours de l'épreuve restent à 42");
	verifier(jeu.lire("BADGES_DU_PARCOURS.every(function(id){ return !/^d_|platine_ch4/.test(id); })"), "les badges du chapitre 4 ne changent pas la note de l'épreuve");
	var b = jeu.taper("badges arcanes");
	verifier(b.indexOf("ACADÉMIE DES ARCANES") > -1 && b.indexOf("Minimisation RGPD") > -1, "badges arcanes liste les compétences du chapitre");
	jeu.taper("cat " + A + "AVIS.txt"); jeu.taper("cat " + A + "Frances");
	verifier(jeu.taper("badges arcanes").indexOf("Note de rançon") > -1, "le premier badge apparaît avec sa leçon");
	// Le grimoire.
	var g = jeu.taper("grimoire");
	["Runes", "Divination", "Transmutation", "Grimoires", "Alchimie", "Chronomancie", "Archives", "Invocation", "Bombe", "minuit"].forEach(function(mot){
		verifier(g.indexOf(mot) > -1, "grimoire : « " + mot + " »");
	});
	verifier(jeu.lire("texteGrimoire()").indexOf("\x1b[31m●") > -1, "grimoire : les écoles que la Nuée tient encore sont en rouge");
	surArchives(jeu);
	jeu.taper('grep -E "45\\.137\\." /var/log/acces.log > ~/academie/traces.log');
	jeu.taper('grep -oE "45\\.137\\.[0-9]+\\.[0-9]+" /var/log/acces.log | sort -u > ~/academie/ioc.txt');
	verifier(jeu.lire("texteGrimoire()").indexOf("\x1b[32m●") > -1, "grimoire : l'école des Runes passe au vert");
	var avant = monde.nouveauMonde({});
	verifier(avant.taper("grimoire").indexOf("chapitre 4") > -1, "grimoire avant l'ouverture : un message clair");
	verifier(jeu.lire("SORTS_DU_JEU.indexOf('grimoire') > -1"), "grimoire est une commande du jeu");
	verifier(jeu.taper("man grimoire").indexOf("PAS une commande Linux") > -1, "man grimoire explique que c'est une commande du jeu");
	// Le bestiaire.
	var best = jeu.taper("cat " + A + "Bestiaire");
	verifier(best.indexOf("IOC") > -1 && best.indexOf("bombe logique") > -1 && best.indexOf("inertes") > -1, "le bestiaire traduit les images en vrais mots");
	// Les noms imagés.
	verifier(jeu.lire("Object.keys(SORTS_RPG_CH4).length") === 23, "un nom imagé pour chacun des 23 sorts");
	verifier(jeu.lire("ORDRE_DES_SORTS_5.every(function(s){ return nomRpg(s, 5) === SORTS_RPG_CH4[s].nom; })"), "nomRpg donne le nom imagé au chapitre 4");
	var neufJeu = neuf();
	verifier(neufJeu.taper("cat " + A + "Grimoires/Stephen").indexOf("la Loupe des Grimoires") > -1, "le nom imagé s'affiche à l'apprentissage");
})();

/* ================================================================== */
/* 21. Images, quiz et propreté des textes                             */
/* ================================================================== */
(function(){
	var fs = require("fs"), path = require("path");
	var img = path.join(__dirname, "..", "Web", "static", "img");
	var jeu = neuf();
	var pics = jeu.lire("[Henry, Alfred, Lee, Stephen, Doug, Paul, Andrew, Brian].map(function(m){ return m.picturename; })");
	verifier(new Set(pics).size === 8, "huit portraits différents pour les huit maîtres");
	pics.forEach(function(p){ verifier(fs.existsSync(path.join(img, p.replace("./static/img/", ""))), "portrait présent : " + p); });
	var decors = jeu.lire("[Academie, AileRunes, AileDivination, AileTransmutation, AileGrimoires, AileAlchimie, AileChronomancie, AileArchives, AileInvocation].map(function(l){ return l.room_pic; })");
	verifier(new Set(decors).size === 9, "le hall et les huit ailes ont chacun leur décor");
	decors.forEach(function(p){ verifier(fs.existsSync(path.join(img, p.replace("./static/img/", ""))), "décor présent : " + p); });
	verifier(fs.existsSync(path.join(__dirname, "..", "outils", "dessiner_academie.py")), "outils/dessiner_academie.py existe");
	// Le quiz du chapitre (Guide.js n'est pas chargé par les tests : on lit sa banque de questions).
	var guide = fs.readFileSync(path.join(__dirname, "..", "Web", "static", "javascript", "Guide.js"), "utf8");
	var debut = guide.indexOf("var QUIZ = {"), fin = guide.indexOf("\n};", debut);
	var QUIZ = new Function(guide.substring(debut, fin + 3) + "\nreturn QUIZ;")();
	verifier(QUIZ[5] && QUIZ[5].length >= 8, "le quiz du chapitre 4 a au moins 8 questions");
	(QUIZ[5] || []).forEach(function(qq, i){
		verifier(qq[1].length === 4 && qq[2] >= 0 && qq[2] < 4 && qq[3].length > 10, "quiz 4, question " + (i + 1) + " : quatre choix, une bonne réponse, une explication");
	});
	// Aucun tiret cadratin ni esperluette dans les textes vivants du chapitre, à différents moments de la nuit.
	var src = fs.readFileSync(path.join(__dirname, "..", "Web", "static", "javascript", "Academie.js"), "utf8");
	verifier(src.indexOf("—") === -1 && src.indexOf("CyberSup") === -1, "Academie.js : pas de tiret cadratin, « Cybersup » bien écrit");
	function textes(j){
		return j.lire("[].concat.apply([], lieuxVisitables(5).map(function(l){ return l.items.map(function(it){ return it.getText(); }); })).join('\\n')");
	}
	var t0 = textes(jeu);
	jeu.lire("state.ch4.horloge = MINUIT - 15");
	var t1 = textes(jeu);
	[t0, t1].forEach(function(t, k){
		verifier(t.indexOf("—") === -1, "textes du chapitre (moment " + k + ") : pas de tiret cadratin");
		verifier(!/&/.test(t.replace(/\x1b\[[0-9;]*m/g, "")), "textes du chapitre (moment " + k + ") : pas d'esperluette");
	});
	verifier(src.indexOf("Nuée") > -1 && /inerte/.test(src), "Academie.js rappelle que la Nuée est inerte");
})();

/* ================================================================== */
/* 22. Les défis et les textes vivants survivent au rechargement       */
/* ================================================================== */
(function(){
	var stock = {};
	var jeu = neuf(stock);
	jeu.taper("cd " + A + "Runes"); jeu.taper("cat Henry");
	jeu.taper("grep -w feu registre-des-sorts.log");
	jeu.taper("cat " + A + "AVIS.txt"); jeu.taper("cat " + A + "Frances");
	fait(jeu, "s_d_grep_w", "avant rechargement : un défi réussi");
	jeu.lire("state.save()");
	var repris = monde.nouveauMonde(stock);
	fait(repris, "s_d_grep_w", "rechargement : le défi est conservé");
	verifier(repris.lire("!!state.seen.s_d_grep_o"), "rechargement : les défis découverts restent découverts");
	verifier(repris.lire("!!state.ch4.trophees.d_frances"), "rechargement : le badge annoncé n'est pas annoncé deux fois");
	verifier(repris.taper("cat " + A + "Runes/Henry").indexOf("[x]") > -1, "rechargement : Henry coche toujours le défi réussi (texte vivant)");
	verifier(repris.taper("cat " + A + "Frances").indexOf("Henry") > -1, "rechargement : Frances reprend où elle en était");
	verifier(repris.taper("quetes").indexOf("mot entier") > -1, "rechargement : le journal montre le défi");
})();

console.log((ok + ko) + " vérifications, " + ko + " échec" + (ko > 1 ? "s" : ""));
process.exit(ko ? 1 : 0);
