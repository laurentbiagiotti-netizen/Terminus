/**
 * L'épreuve finale : on l'ouvre, on la résout de bout en bout, et on vérifie la note et le code.
 * Lancer : node tests/examen.js   (-v pour tout voir)
 */
var monde = require("./monde.js");
var ok = 0, ko = 0;
function verifier(c, m){ if (c) ok++; else { ko++; console.log("ÉCHEC : " + m); } }
function contient(t, m, msg){ verifier(String(t).indexOf(m) > -1, (msg || "") + " : « " + m + " » absent de\n" + t); }

function examen(graine){
	var stockage = { "terminus-cybersup-profil": JSON.stringify({ graine: graine || 4242, prenom: "Ada", chapitre: 1, modeExamen: true }) };
	var jeu = monde.nouveauMonde(stockage);
	jeu.lire("state.nom = 'Ada'; demarrerExamen(); Shell.narration = [];");
	jeu.stockage = stockage;
	return jeu;
}

/* --- 1. Le code d'accès --- */
var normal = monde.nouveauMonde();
verifier(normal.lire("codeExamenValide('CORBEAU-7351')"), "le code CORBEAU-7351 ouvre l'épreuve");
verifier(normal.lire("codeExamenValide(' corbeau-7351 ')"), "le code se tape sans souci de casse");
verifier(!normal.lire("codeExamenValide('CORBEAU-7352')"), "un mauvais code n'ouvre rien");
contient(normal.taper("examen", "FAUX"), "pas le bon code", "examen refuse un faux code");
contient(normal.taper("kamikaze"), "n'a de sens que pendant", "kamikaze hors épreuve");
verifier(!normal.lire("examenEnCours()"), "hors examen, la partie normale est intacte");

/* --- 2. Toute l'épreuve --- */
var jeu = examen();
var mdp = jeu.lire("MOT_DE_PASSE_SUDO");
var ip = jeu.lire("IP_ASSAILLANT_EXAMEN");
var mot = jeu.lire("MOT_DU_CORBEAU");
var pid = jeu.lire("PID_OREILLE");
contient(jeu.taper("pwd"), "/home/", "pwd dans les quartiers");
contient(jeu.taper("indice"), "Pas d'indice", "pas d'indice pendant l'épreuve");
contient(jeu.taper("ssh web"), "coupée", "ssh bloqué");
contient(jeu.taper("cd /"), "", "");
contient(jeu.taper("ls"), "quarantaine", "la racine de la Forteresse");
jeu.taper("cd ~");
contient(jeu.taper("ls -a"), ".ordre-de-mission", "l'ordre caché se voit avec ls -a");
contient(jeu.taper("cat .ordre-de-mission"), "Épreuve I accomplie", "épreuve I");
contient(jeu.taper("grep Failed /var/log/auth.log | cut -d' ' -f9 | sort | uniq -c | sort -rn"), ip, "l'assaillant se compte");
contient(jeu.taper("echo " + ip + " > ~/rapport/assaillant.txt"), "Épreuve II", "épreuve II");
contient(jeu.taper("chmod +x ~/arsenal/rempart.sh"), "Épreuve III", "épreuve III");
var trouve = jeu.taper("find /srv -name fragment-du-sceau");
contient(trouve, "fragment-du-sceau", "find trouve le fragment");
contient(jeu.taper("mv " + trouve.trim().split("\n")[0] + " ~/rapport"), "Épreuve IV", "épreuve IV");
contient(jeu.taper("cat /etc/hosts"), "10.0.92.53", "le registre local des noms");
jeu.editer("function(t){ return t.replace('10.0.66.53', '10.0.92.53'); }");
contient(jeu.taper("sudo nano /etc/resolv.conf", mdp), "Épreuve V", "épreuve V");
contient(jeu.taper("sudo systemctl start isc-dhcp-server", mdp), "failed", "la Mairie refuse d'ouvrir");
contient(jeu.taper("sudo journalctl -u isc-dhcp-server", mdp), "not on net", "le journal dit pourquoi");
jeu.editer("function(t){ return t.replace('10.0.97.100 10.0.97.150', '10.0.97.20 10.0.97.50'); }");
jeu.taper("sudo nano /etc/dhcp/dhcpd.conf", mdp);
contient(jeu.taper("sudo systemctl restart isc-dhcp-server", mdp), "Épreuve VI", "épreuve VI");
contient(jeu.taper("sudo ss -tlnp", mdp), ":23", "telnet écoute");
contient(jeu.taper("sudo systemctl stop telnet", mdp), "", "");
verifier(!jeu.lire("state.examen.reussies.telnet"), "telnet arrêté mais encore activé : pas encore");
contient(jeu.taper("sudo systemctl disable telnet", mdp), "Épreuve VII", "épreuve VII");
contient(jeu.taper("sudo systemctl enable --now nginx", mdp), "Épreuve VIII", "épreuve VIII");
jeu.taper("cd /opt/gardiens");
contient(jeu.taper("sha256sum -c SHA256SUMS"), "vigile: ÉCHEC", "le gardien trafiqué se démasque");
contient(jeu.taper("sudo mv vigile /quarantaine/", mdp), "Épreuve IX", "épreuve IX");
var charge = jeu.taper("grep charge /quarantaine/vigile").split("charge=")[1].trim();
contient(jeu.taper("echo " + charge + " | base64 -d"), mot, "le message se déchiffre");
contient(jeu.taper("echo " + mot + " > ~/rapport/signature.txt"), "Épreuve X", "épreuve X");
contient(jeu.taper("sudo find / -perm -4000", mdp), ".passe-muraille", "find -perm -4000");
contient(jeu.taper("sudo rm /usr/local/lib/.passe-muraille", mdp), "Épreuve XI", "épreuve XI");
contient(jeu.taper("sudo ss -tlnp", mdp), "31337", "l'oreille écoute");
contient(jeu.taper("sudo kill " + pid, mdp), "ignore", "TERM ignoré");
contient(jeu.taper("sudo kill -9 " + pid, mdp), "Épreuve XII", "épreuve XII");
jeu.editer("function(t){ return t.split('\\n').filter(function(l){ return l.indexOf('corbeau@nid') === -1; }).join('\\n'); }");
var fin = jeu.taper("sudo nano /root/.ssh/authorized_keys", mdp);
contient(fin, "Épreuve XIII", "épreuve XIII");
contient(fin, "LA FORTERESSE EST REPRISE", "la victoire");
contient(fin, "20 / 20", "la note");
verifier(jeu.lire("examenFini()"), "l'épreuve est finie");
var code = fin.split("Code de vérification, à remettre au formateur :")[1].split("\n")[1].trim();
var lu = jeu.lire("lireCode(" + JSON.stringify(code) + ")");
verifier(lu && lu.valide && lu.note === 20 && lu.chapitre === 4 && lu.indices === 0, "le code se relit : " + JSON.stringify(lu));
contient(jeu.taper("verifier " + code), "Code authentique", "verifier");
contient(jeu.taper("verifier " + code.replace(/.$/, function(c){ return c === "A" ? "B" : "A"; })), "", "");
contient(jeu.taper("kamikaze"), "terminée", "kamikaze après la fin");
contient(jeu.taper("examen"), "DIPLÔME", "examen réimprime le diplôme");

/* --- 3. La sauvegarde de l'examen garde l'avancée --- */
verifier(!!jeu.stockage["terminus-cybersup-examen"], "l'épreuve a sa propre sauvegarde");
var repris = monde.nouveauMonde(jeu.stockage);
verifier(repris.lire("examenFini() && pointsExamen() === 20"), "l'épreuve se retrouve après rechargement");

/* --- 4. Kamikaze en cours de route --- */
var k = examen(777);
k.taper("cat ~/.ordre-de-mission");
k.taper("chmod +x ~/arsenal/rempart.sh");
contient(k.taper("kamikaze", "non"), "continue", "kamikaze se confirme");
verifier(!k.lire("examenFini()"), "non : on continue");
var sortie = k.taper("kamikaze", "oui");
contient(sortie, "KAMIKAZE", "le sacrifice");
contient(sortie, "2 / 20", "la note de ce qui est fait");
contient(sortie, "Ajourné", "la mention");
var codeK = sortie.split("Code de vérification, à remettre au formateur :")[1].split("\n")[1].trim();
var luK = k.lire("lireCode(" + JSON.stringify(codeK) + ")");
verifier(luK && luK.valide && luK.note === 2 && luK.indices === 1, "le code kamikaze : " + JSON.stringify(luK));
contient(k.taper("verifier " + codeK), "kamikaze", "verifier lit la fin kamikaze");
contient(k.taper("chmod +x ~/rapport"), "", "");
verifier(k.lire("pointsExamen()") === 2, "plus rien ne compte après la copie rendue");

console.log("Épreuve finale : " + ok + " vérifications réussies, " + ko + " échecs.");
process.exit(ko ? 1 : 0);
