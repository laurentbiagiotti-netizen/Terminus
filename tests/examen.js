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
verifier(normal.lire("codeExamenValide('CODE-RETIRE')"), "le code CODE-RETIRE ouvre l'épreuve");
verifier(normal.lire("codeExamenValide(' rouxblanc-7351 ')"), "le code se tape sans souci de casse");
verifier(!normal.lire("codeExamenValide('CODE-RETIRE-2')"), "un mauvais code n'ouvre rien");
contient(normal.taper("examen", "FAUX"), "pas le bon code", "examen refuse un faux code");
contient(normal.taper("kamikaze"), "n'a de sens que pendant", "kamikaze hors épreuve");
verifier(!normal.lire("examenEnCours()"), "hors examen, la partie normale est intacte");

/* --- 2. Toute l'épreuve --- */
var jeu = examen();
var mdp = jeu.lire("MOT_DE_PASSE_SUDO");
var ip = jeu.lire("IP_ASSAILLANT_EXAMEN");
var mot = jeu.lire("MOT_DE_MYRIAM");
var pid = jeu.lire("PID_OREILLE");
contient(jeu.taper("pwd"), "/home/", "pwd dans les quartiers");
contient(jeu.taper("indice 4", "non"), "0,5 point", "un indice se paie, et se confirme");
verifier(jeu.lire("nbIndicesExamen()") === 0, "non : pas d'indice pris");
contient(jeu.taper("ssh web"), "coupée", "ssh bloqué");
contient(jeu.taper("cd /"), "", "");
contient(jeu.taper("ls"), "quarantaine", "la racine de la Forteresse");
jeu.taper("cd ~");
contient(jeu.taper("ls -a"), ".ordre-de-mission", "l'ordre caché se voit avec ls -a");
contient(jeu.taper("cat Aidan"), "pieds nus, poilus", "Aidan est là, pieds poilus");
contient(jeu.taper("cat /tmp/David"), "Taverne aux Arches d'Or", "David garde /tmp");
contient(jeu.taper("cat ~/.ordre-de-mission | head -n 1"), "MAGE ROUXBLANC", "l'ordre est scellé par le Mage Rouxblanc");
verifier(jeu.lire("state.examen.reussies.ordre"), "lire l'ordre, même par un tuyau, accomplit l'épreuve I");
contient(jeu.taper("cat .ordre-de-mission"), "Aidan, l'elfe aux pieds", "l'ordre présente Aidan");
contient(jeu.taper("grep Failed /var/log/auth.log | cut -d' ' -f9 | sort | uniq -c | sort -rn"), ip, "l'assaillant se compte");
contient(jeu.taper("echo " + ip + " > ~/rapport/assaillant.txt"), "Épreuve II", "épreuve II");
contient(jeu.taper("chmod +x ~/arsenal/rempart.sh"), "Épreuve III", "épreuve III");
var erreursAvant = jeu.lire("state.examen.erreurs");
jeu.taper("ls");
verifier(jeu.lire("state.examen.erreurs") === erreursAvant, "une ligne réussie ne compte pas");
jeu.taper("cat /nexiste/pas");
verifier(jeu.lire("state.examen.erreurs") === erreursAvant + 1, "une ligne ratée compte une fausse manœuvre");
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
contient(jeu.taper("sudo kill " + pid, mdp), "esquive", "TERM esquivé");
contient(jeu.taper("sudo kill -9 " + pid, mdp), "Épreuve XII", "épreuve XII");
jeu.editer("function(t){ return t.split('\\n').filter(function(l){ return l.indexOf('myriam@tour-noire') === -1; }).join('\\n'); }");
contient(jeu.taper("sudo nano /root/.ssh/authorized_keys", mdp), "Épreuve XIII", "épreuve XIII");
/* Le Sceau du Héraut : Laurana */
contient(jeu.taper("cat /var/www/Laurana"), "LAURANA LA FLAMBOYANTE", "Laurana est en pierre");
contient(jeu.taper("cat /var/www/html/index.html"), "Permission", "la proclamation de Myriam est à elle seule");
jeu.taper("cd ~");
contient(jeu.taper("tar -tzf /srv/sauvegardes/proclamations.tar.gz"), "index.html", "la sauvegarde se liste");
jeu.taper("tar -xzf /srv/sauvegardes/proclamations.tar.gz");
contient(jeu.taper("sudo cp index.html /var/www/html/index.html", mdp), "Épreuve XIV", "épreuve XIV");
jeu.taper("ls"); jeu.taper("pwd");
var revient = jeu.taper("ls");
verifier(jeu.lire("!state.examen.reussies.proclamation"), "le sortilège recouvre la proclamation");
contient(jeu.taper("ls /etc/cron.d"), "sortilege", "le sortilège se trouve");
contient(jeu.taper("sudo rm /etc/cron.d/sortilege", mdp), "Épreuve XV", "épreuve XV");
jeu.taper("sudo cp index.html /var/www/html/index.html", mdp);
verifier(jeu.lire("state.examen.reussies.proclamation"), "la proclamation tient, maintenant");
contient(jeu.taper("sudo chown root /var/www/html/index.html", mdp), "", "");
contient(jeu.taper("sudo chmod 644 /var/www/html/index.html", mdp), "Épreuve XVII", "épreuve XVII");
jeu.editer("function(t){ return t.split('\\n').filter(function(l){ return l.indexOf('myriam:') !== 0; }).join('\\n'); }");
contient(jeu.taper("sudo nano /etc/passwd", mdp), "Épreuve XVI", "épreuve XVI");
jeu.editer("function(t){ return t.split('\\n').filter(function(l){ return l.indexOf('proclamations') === -1; }).join('\\n'); }");
var fin = jeu.taper("sudo nano /etc/hosts", mdp);
contient(fin, "Épreuve XVIII", "épreuve XVIII");
contient(fin, "Laurana la Flamboyante secoue", "Laurana se réveille");
contient(fin, "LA FORTERESSE EST REPRISE", "la victoire");
contient(fin, "NOTE FINALE         : 20 / 20", "la note");
contient(fin, "Bonus de temps      : +2", "le bonus de temps");
contient(fin, "La sorcière, l'acrobate, l'ogre et l'elfe", "la fin réunit toute la troupe");
contient(jeu.taper("cat /tmp/David"), "plus personne à qui crier", "David boude quand son guichet est fermé");
verifier(jeu.lire("examenFini()"), "l'épreuve est finie");
var code = fin.split("Code de vérification, à remettre au formateur :")[1].split("\n")[1].trim();
var lu = jeu.lire("lireCodeExamen(" + JSON.stringify(code) + ")");
verifier(lu && lu.valide && lu.note === 20 && lu.fin === "V" && lu.erreurs >= 1 && lu.reussies.every(function(x){ return x; }), "le code se relit : " + JSON.stringify(lu));
var rapport = jeu.taper("verifier " + code);
contient(rapport, "Code authentique", "verifier");
contient(rapport, "cassée une fois en route", "verifier montre l'épreuve cassée par le sortilège");
contient(normal.taper("verifier " + code), "Restaurer la proclamation", "verifier marche aussi hors de l'épreuve");
contient(jeu.taper("verifier " + code.replace(/.$/, function(c){ return c === "A" ? "B" : "A"; })), "", "");
contient(jeu.taper("kamikaze"), "terminée", "kamikaze après la fin");
contient(jeu.taper("examen"), "DIPLÔME", "examen réimprime le diplôme");

/* --- 3. La sauvegarde de l'examen garde l'avancée --- */
verifier(!!jeu.stockage["terminus-cybersup-examen"], "l'épreuve a sa propre sauvegarde");
var repris = monde.nouveauMonde(jeu.stockage);
verifier(repris.lire("examenFini() && pointsExamen() === POINTS_MAX_EXAMEN && noteExamen() === 20"), "l'épreuve se retrouve après rechargement");

/* --- 4. Kamikaze en cours de route --- */
var k = examen(777);
k.taper("cat ~/.ordre-de-mission");
k.taper("chmod +x ~/arsenal/rempart.sh");
contient(k.taper("indice", "oui"), "Indice, épreuve II", "un indice payé");
contient(k.taper("indice 2"), "déjà payé", "un indice déjà payé se relit gratuitement");
contient(k.taper("kamikaze", "non"), "continue", "kamikaze se confirme");
verifier(!k.lire("examenFini()"), "non : on continue");
var sortie = k.taper("kamikaze", "oui");
contient(sortie, "KAMIKAZE", "le sacrifice");
contient(sortie, "NOTE FINALE         : 1 / 20", "la note de ce qui est fait : 1,5 moins un indice");
contient(sortie, "Ajourné", "la mention");
var codeK = sortie.split("Code de vérification, à remettre au formateur :")[1].split("\n")[1].trim();
var luK = k.lire("lireCodeExamen(" + JSON.stringify(codeK) + ")");
verifier(luK && luK.valide && luK.note === 1 && luK.base === 1.5 && luK.malusIndices === 0.5 && luK.fin === "K" && luK.indices[1], "le code kamikaze : " + JSON.stringify(luK));
contient(k.taper("verifier " + codeK), "kamikaze", "verifier lit la fin kamikaze");
contient(k.taper("chmod +x ~/rapport"), "", "");
verifier(k.lire("pointsExamen()") === 2, "plus rien ne compte après la copie rendue");
var faux = codeK.replace(/^(.)/, function(c){ return c === "R" ? "S" : "R"; });
contient(k.taper("verifier " + faux), "", "");

console.log("Épreuve finale : " + ok + " vérifications réussies, " + ko + " échecs.");
process.exit(ko ? 1 : 0);
