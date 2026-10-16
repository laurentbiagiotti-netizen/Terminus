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
	verifier(jeu.lire("state.note(5)") >= 15, "note du chapitre 4 élevée pour un parcours complet : " + jeu.lire("state.noteTexte(5)"));
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

console.log((ok + ko) + " vérifications, " + ko + " échec" + (ko > 1 ? "s" : ""));
process.exit(ko ? 1 : 0);
