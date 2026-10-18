/**
 * Le chapitre 7 (Port-Aube, la cité à bâtir, numéro 8 dans le code) : le départ direct et l'ouverture après Lumen,
 * l'horloge, le plan de la cité (chantier), les fausses validations refusées (chaque étape repose sur l'état réel des
 * machines de l'île, pas sur la frappe d'une commande), la Tempête et ses incidents, la Marée et le navire, le Premier
 * Pas de bout en bout, le rapport, ce que personne n'a écrit (le cliffhanger), l'identifiant du joueur sur l'île, la
 * sauvegarde en cours de chapitre, les quêtes annexes (et leur règle), les images, puis la solution documentée jouée de
 * bout en bout, à 20 sur 20.
 *
 * Lancer : node tests/chapitre7.js
 */
var fs = require("fs");
var path = require("path");
var monde = require("./monde.js");
var ok = 0, ko = 0;
function verifier(c, m){ if (c) ok++; else { ko++; console.log("ÉCHEC : " + m); } }
function vrai(jeu, expr, m){ verifier(jeu.lire(expr) === true, m + "  [" + expr + "]"); }
function faux(jeu, expr, m){ verifier(jeu.lire(expr) === false, m + "  [" + expr + "]"); }
function egal(a, b, m){ verifier(a === b, m + " : attendu " + JSON.stringify(b) + ", obtenu " + JSON.stringify(a)); }
function q(jeu, id){ return jeu.lire("!!state.quests[" + JSON.stringify(id) + "]"); }
function fait(jeu, id, m){ verifier(q(jeu, id) === true, (m || id) + " : devrait être accompli"); }
function pasFait(jeu, id, m){ verifier(q(jeu, id) === false, (m || id) + " : ne devrait PAS être accompli"); }
function contient(texte, mot, m){ verifier(String(texte).indexOf(mot) > -1, m + " : « " + mot + " » absent de : " + String(texte).substring(0, 400)); }
function absent(texte, mot, m){ verifier(String(texte).indexOf(mot) === -1, m + " : « " + mot + " » ne devrait pas apparaître"); }

var RACINE = path.join(__dirname, "..");
var JS = path.join(RACINE, "Web", "static", "javascript");
var IMG = path.join(RACINE, "Web", "static", "img");
var DOC = fs.readFileSync(path.join(RACINE, "docs", "solution.md"), "utf8");

/* Une partie neuve, partie directement à Port-Aube (la septième enveloppe ou « chapitre 7 »). */
function neuf(stockage){
	var jeu = monde.nouveauMonde(stockage || {});
	jeu.taper("chapitre 7", "oui");
	return jeu;
}
function t(jeu, c){ return jeu.jouerSolution(c); }
function jouer(jeu, liste){ return liste.map(function(c){ return t(jeu, c); }).join("\n"); }
/* Prêt à bâtir : Laurent et la mission lus, le plan consulté, les sorts du chapitre connus. */
function pret(jeu){
	jeu.lire("ORDRE_DES_SORTS_8.forEach(function(s){ state.spells[s] = true; })");
	jouer(jeu, ["cat Laurent", "cat Mission", "chantier"]);
	return jeu;
}
function surIle(){ return pret(neuf()); }
function score(jeu){ return jeu.lire("scoreChantierCh7()"); }
function etat(jeu, id){ return jeu.lire("(function(){ try { return ETATS_CH7[" + JSON.stringify(id) + "](); } catch (e){ return 'erreur ' + e.message; } })()"); }

/* Les commandes de la solution documentée (chapitre 7), partie par partie. */
function partie(n){
	var debut = DOC.indexOf("### " + n + ". ");
	if (debut < 0) return [];
	var reste = DOC.substring(debut + 4), fin = reste.search(/\n##+ /);
	var texte = reste.substring(0, fin < 0 ? reste.length : fin), commandes = [], dans = false;
	texte.split("\n").forEach(function(l){
		if (l.indexOf("```") === 0){ dans = !dans; return; }
		if (dans && l.trim() !== "") commandes.push(l);
	});
	return commandes;
}

/* Les maisons, bâties d'un coup (les commandes de la solution, sans les maîtres ni les déplacements). */
var Z = "/etc/bind/zones/db.port-aube.lan";
var MAISONS = {
	noms: ["ssh noms", "sudo named-checkzone port-aube.lan " + Z, "sudo sed -i 's/10.0.70.380/10.0.70.38/; /^imap\\t\\tIN\\tA/d' " + Z,
		"printf 'zone \"port-aube.lan\" {\\n\\ttype primary;\\n\\tfile \"" + Z + "\";\\n\\tallow-transfer { 10.0.70.54; };\\n\\talso-notify { 10.0.70.54; };\\n};\\n' | sudo tee -a /etc/bind/named.conf.local",
		"sudo named-checkconf -z && sudo rndc reload", "dig @noms poste.port-aube.lan +short",
		"printf 'imprimerie\\tIN\\tA\\t10.0.70.31\\nbibliotheque\\tIN\\tA\\t10.0.70.73\\n' | sudo tee -a " + Z + "; sudo sed -i 's/2026101701/2026101702/' " + Z,
		"sudo named-checkzone port-aube.lan " + Z + " && sudo rndc reload", "dig @noms port-aube.lan SOA +short", "exit"],
	phare: ["ssh phare", "printf 'zone \"port-aube.lan\" {\\n\\ttype secondary;\\n\\tprimaries { 10.0.70.53; };\\n\\tfile \"/var/cache/bind/db.port-aube.lan\";\\n};\\n' | sudo tee -a /etc/bind/named.conf.local; sudo rndc reload",
		"exit", "ssh noms", "dig @noms port-aube.lan AXFR", "tsig-keygen cle-phare | sudo tee /etc/bind/cle-phare.key",
		"printf '$TTL\\t3600\\n@\\tIN\\tSOA\\tnoms.port-aube.lan. hostmaster.port-aube.lan. (\\n\\t2026101701 3600 900 604800 300 )\\n@\\tIN\\tNS\\tnoms.port-aube.lan.\\n@\\tIN\\tNS\\tphare.port-aube.lan.\\n53\\tIN\\tPTR\\tnoms.port-aube.lan.\\n54\\tIN\\tPTR\\tphare.port-aube.lan.\\n25\\tIN\\tPTR\\tposte.port-aube.lan.\\n' | sudo tee /var/lib/bind/db.10.0.70",
		"printf 'include \"/etc/bind/cle-phare.key\";\\nzone \"70.0.10.in-addr.arpa\" {\\n\\ttype primary;\\n\\tfile \"/var/lib/bind/db.10.0.70\";\\n\\tallow-update { key cle-phare; };\\n\\tallow-transfer { 10.0.70.54; };\\n\\talso-notify { 10.0.70.54; };\\n};\\n' | sudo tee -a /etc/bind/named.conf.local",
		"sudo named-checkconf -z && sudo rndc reload", "exit", "ssh phare",
		"printf 'zone \"70.0.10.in-addr.arpa\" {\\n\\ttype secondary;\\n\\tprimaries { 10.0.70.53; };\\n\\tfile \"/var/cache/bind/db.10.0.70\";\\n};\\n' | sudo tee -a /etc/bind/named.conf.local; sudo rndc reload",
		"exit", "ssh noms", "printf 'server 10.0.70.53\\nzone 70.0.10.in-addr.arpa\\nupdate add 60.70.0.10.in-addr.arpa. 3600 IN PTR capitainerie.port-aube.lan.\\nsend\\n' | sudo nsupdate -k /etc/bind/cle-phare.key",
		"dig -x 10.0.70.25 @phare", "exit"],
	poste: ["ssh poste", "mailq; postconf -n", "sudo sed -i '/^mydomian/d; $d' /etc/postfix/main.cf",
		"sudo postconf -e 'myhostname = poste.port-aube.lan' 'mydomain = port-aube.lan' 'mydestination = $myhostname, $mydomain, localhost' 'relayhost =' 'mynetworks = 127.0.0.0/8 10.0.70.0/24'",
		"sudo postfix check && sudo postfix reload", "sudo postqueue -f; mailq", "echo 'La Poste est ouverte.' | mail -s 'Premier courrier' $(whoami)", "exit"],
	lettres: ["ssh poste", "doveadm user $(whoami)", "sudo sed -i 's|^mail_location = .*|mail_location = maildir:/var/mail/%u|' /etc/dovecot/conf.d/10-mail.conf; sudo systemctl reload dovecot",
		"doveadm mailbox status messages INBOX", "sudo opendkim-genkey -s aube -d port-aube.lan -D /etc/opendkim/keys; sudo cat /etc/opendkim/keys/aube.txt > /tmp/aube.txt; scp /tmp/aube.txt noms:/tmp/",
		"exit", "ssh noms", "printf '@\\tIN\\tTXT\\t\"v=spf1 mx -all\"\\n_dmarc\\tIN\\tTXT\\t\"v=DMARC1; p=quarantine\"\\n' | sudo tee -a " + Z + "; cat /tmp/aube.txt | sudo tee -a " + Z,
		"sudo sed -i 's/2026101702/2026101703/' " + Z + "; sudo rndc reload",
		"dig @noms port-aube.lan TXT +short; dig @noms aube._domainkey.port-aube.lan TXT +short; dig @noms _dmarc.port-aube.lan TXT +short", "exit"],
	registre: ["ssh registre", "cd; printf 'dn: olcDatabase={1}mdb,cn=config\\nchangetype: modify\\nreplace: olcRootPW\\nolcRootPW: %s\\n' \"$(slappasswd -s Sceau-de-Port-Aube)\" > rootpw.ldif; sudo ldapmodify -Y EXTERNAL -H ldapi:/// -f rootpw.ldif",
		"printf 'dn: ou=people,dc=port-aube,dc=lan\\nobjectClass: organizationalUnit\\nou: people\\n\\ndn: ou=groups,dc=port-aube,dc=lan\\nobjectClass: organizationalUnit\\nou: groups\\n\\ndn: cn=batisseurs,ou=groups,dc=port-aube,dc=lan\\nobjectClass: posixGroup\\ncn: batisseurs\\ngidNumber: 10000\\n\\ndn: cn=promo,ou=groups,dc=port-aube,dc=lan\\nobjectClass: posixGroup\\ncn: promo\\ngidNumber: 10100\\n' > branches.ldif; sudo cp /root/batisseurs.ldif .; sudo chown $(whoami) batisseurs.ldif; ldapadd -x -D cn=admin,dc=port-aube,dc=lan -W -f branches.ldif",
		"sed -i 's/^gidNumber: dix-mille/gidNumber: 10000/; s/^uid: noam$/uid: noam\\nuidNumber: 10005/' batisseurs.ldif; ldapadd -c -x -D cn=admin,dc=port-aube,dc=lan -W -f batisseurs.ldif",
		"printf 'dn: cn=batisseurs,ou=groups,dc=port-aube,dc=lan\\nchangetype: modify\\nadd: memberUid\\nmemberUid: badis\\nmemberUid: maeva\\nmemberUid: younes\\nmemberUid: syrine\\nmemberUid: noam\\nmemberUid: zelia\\nmemberUid: kamal\\nmemberUid: lamia\\nmemberUid: miguel\\nmemberUid: amina\\n\\ndn: cn=promo,ou=groups,dc=port-aube,dc=lan\\nchangetype: modify\\nadd: memberUid\\nmemberUid: zelia\\n' > membres.ldif; ldapmodify -x -D cn=admin,dc=port-aube,dc=lan -W -f membres.ldif",
		"ldapsearch -x -LLL '(uid=badis)'", "exit"],
	greniers: ["ssh greniers", "echo '/srv/homes 10.0.70.0/24(rw,sync,no_subtree_check,root_squash)' | sudo tee -a /etc/exports; sudo exportfs -ra; sudo exportfs -v", "exit",
		"ssh quai", "showmount -e greniers; sudo mount -t nfs greniers:/srv/homes /mnt; ls -ln /mnt", "sudo touch /mnt/essai-de-root; sudo umount /mnt", "exit"],
	portes: ["ssh quai", "printf '[sssd]\\nservices = nss, pam\\ndomains = port-aube\\n\\n[domain/port-aube]\\nid_provider = ldap\\nauth_provider = ldap\\nldap_uri = ldap://registre.port-aube.lan\\nldap_search_base = dc=port-aube,dc=lan\\n' | sudo tee /etc/sssd/sssd.conf; sudo chmod 600 /etc/sssd/sssd.conf",
		"sudo sed -i 's/^\\(passwd\\|group\\|shadow\\):\\( *\\)files/&  sss/' /etc/nsswitch.conf; sudo systemctl enable --now sssd", "getent passwd badis; id badis",
		"echo '/home /etc/auto.home' | sudo tee /etc/auto.master.d/home.autofs; echo '* greniers:/srv/homes/&' | sudo tee /etc/auto.home; sudo systemctl reload autofs", "ls -ld /home/badis", "exit"],
	halle: ["ssh halle", "sudo sed -i 's/^;\\(\\[promo\\]\\)/\\1/; s/^;\\(   \\)/\\1/' /etc/samba/smb.conf; sudo mkdir /srv/promo; sudo chown root:promo /srv/promo; sudo chmod 2770 /srv/promo; testparm -s",
		"sudo systemctl reload smbd; sudo smbpasswd -a zelia", "sudo pdbedit -L; smbclient -L halle -U zelia", "cd; echo 'Le plan' > plan.txt; smbclient //halle/promo -U zelia -c 'put plan.txt; ls'", "exit"],
	forge: ["ssh forge", "sudo openssl genrsa -out /srv/forge/forge.key 4096; sudo openssl req -x509 -new -key /srv/forge/forge.key -days 3650 -subj '/CN=Forge des Sceaux de Port-Aube' -out /srv/forge/forge.crt; sudo cp /srv/forge/forge.crt /srv/demandes/", "exit",
		"ssh poste", "sudo openssl genrsa -out /etc/dovecot/private/poste.key 2048; sudo openssl req -new -key /etc/dovecot/private/poste.key -subj '/CN=poste.port-aube.lan' -addext 'subjectAltName=DNS:poste.port-aube.lan,DNS:imap.port-aube.lan' -out /tmp/poste.csr; scp /tmp/poste.csr forge:/srv/demandes/", "exit",
		"ssh forge", "sudo openssl x509 -req -in /srv/demandes/poste.csr -CA /srv/forge/forge.crt -CAkey /srv/forge/forge.key -CAcreateserial -days 825 -copy_extensions copy -out /srv/demandes/poste.crt", "exit",
		"ssh poste", "scp forge:/srv/demandes/poste.crt /tmp/; sudo cp /tmp/poste.crt /etc/dovecot/private/poste.pem",
		"sudo sed -i 's|^ssl_cert = .*|ssl_cert = </etc/dovecot/private/poste.pem|; s|^ssl_key = .*|ssl_key = </etc/dovecot/private/poste.key|' /etc/dovecot/conf.d/10-ssl.conf; sudo systemctl reload dovecot", "exit",
		"ssh quai", "scp forge:/srv/demandes/forge.crt /tmp/; sudo cp /tmp/forge.crt /usr/local/share/ca-certificates/; sudo update-ca-certificates", "openssl s_client -connect poste.port-aube.lan:993 -verify_return_error", "exit"],
	arche: ["ssh greniers", "sudo ssh-keygen -t ed25519 -f /root/.ssh/arche -N ''; sudo cp /root/.ssh/arche.pub /tmp/; scp /tmp/arche.pub arche:/tmp/", "exit",
		"ssh arche", "sed 's|^|command=\"borg serve --restrict-to-path /srv/borg/greniers\",restrict |' /tmp/arche.pub | sudo tee /home/borg/.ssh/authorized_keys", "exit",
		"ssh greniers", "sudo borg init -e repokey --rsh 'ssh -i /root/.ssh/arche' borg@arche:/srv/borg/greniers",
		"echo 'La-cite-ne-perd-rien' | sudo tee /root/.borg-phrase; sudo chmod 600 /root/.borg-phrase; sudo systemctl start sauvegarde-borg",
		"printf '[Unit]\\nDescription=La sauvegarde de chaque nuit\\n\\n[Timer]\\nOnCalendar=*-*-* 02:30\\nPersistent=true\\n\\n[Install]\\nWantedBy=timers.target\\n' | sudo tee /etc/systemd/system/sauvegarde-borg.timer; sudo systemctl daemon-reload; sudo systemctl enable --now sauvegarde-borg.timer",
		"sudo borg check --rsh 'ssh -i /root/.ssh/arche' borg@arche:/srv/borg/greniers",
		"sudo mkdir /tmp/retour; cd /tmp/retour; sudo borg extract --rsh 'ssh -i /root/.ssh/arche' borg@arche:/srv/borg/greniers::<archive> srv/homes/badis",
		"sudo diff -r /srv/homes/badis /tmp/retour/srv/homes/badis", "exit"]
};
function batir(jeu, cle){ jouer(jeu, MAISONS[cle]); }

/* ================================================================== */
/* 1. Les fichiers, l'ordre de chargement, les règles d'écriture, les images */
/* ================================================================== */
var FICHIERS = ["SortsIle.js", "SortsIlePoste.js", "SortsIleRegistre.js", "SortsIleBis.js", "SortsIleTer.js", "SortsIleAnnexes.js", "PortAube.js", "ManuelIle.js", "Chapitre7.js", "Ile.js", "HabitantsIle.js"];
(function(){
	var index = fs.readFileSync(path.join(RACINE, "Web", "index.html"), "utf8");
	var positions = ["HabitantsBastion.js"].concat(FICHIERS).concat(["Intro.js"]).map(function(f){ return index.indexOf("/" + f + "?"); });
	verifier(positions.every(function(p, i){ return p > -1 && (i === 0 || p > positions[i - 1]); }), "index.html : les fichiers de Port-Aube, dans l'ordre, après HabitantsBastion.js et avant Intro.js");
	var mondeJs = fs.readFileSync(path.join(__dirname, "monde.js"), "utf8");
	verifier(mondeJs.indexOf(FICHIERS.map(function(f){ return JSON.stringify(f); }).join(", ")) > -1, "tests/monde.js charge les fichiers de Port-Aube, dans le même ordre");
	FICHIERS.forEach(function(f){
		var src = fs.readFileSync(path.join(JS, f), "utf8");
		verifier(src.indexOf("—") === -1, f + " : pas de tiret cadratin");
		verifier(src.indexOf("CyberSup") === -1, f + " : Cybersup bien écrit");
		var chaines = (src.match(/"(?:[^"\\\n]|\\.)*"/g) || []).concat(src.match(/\/\*[\s\S]*?\*\//g) || []);
		var esperluettes = chaines.filter(function(x){ return x.indexOf(" & ") > -1 && !/2>&1|&&|>&|« & »|&\s*$|\s&"$/.test(x); });
		verifier(esperluettes.length === 0, f + " : pas d'esperluette en prose : " + esperluettes.slice(0, 3).join(" | "));
		verifier(!/\beval\s*\(|new Function\s*\(/.test(src), f + " : ni eval ni Function");
	});
	// Les prénoms : la liste fermée du chapitre, sans nom de famille.
	var prenoms = ["Badis", "Maeva", "Younes", "Syrine", "Noam", "Zélia", "Kamal", "Lamia", "Miguel", "Amina", "Ilyès", "Clara", "Mehdi", "Sara", "Rayan", "Fama"];
	var src7 = fs.readFileSync(path.join(JS, "Ile.js"), "utf8") + fs.readFileSync(path.join(JS, "HabitantsIle.js"), "utf8") + fs.readFileSync(path.join(JS, "Chapitre7.js"), "utf8");
	prenoms.forEach(function(p){ verifier(src7.indexOf(p) > -1, "le prénom " + p + " est dans le chapitre"); });
	var images = ["loc_embarcadere.gif", "loc_port_aube.gif", "loc_port_aube_fete.gif", "loc_baie_ile.gif", "loc_poste_quai.gif", "item_billet_traversee.gif",
		"cine7_mer_aube.gif", "cine7_quai_laurent.gif", "cine7_maisons_vides.gif", "cine7_phare_orage.gif", "cine7_maree.gif"];
	["noms", "phare", "poste", "lettres", "greniers", "halle", "registre", "portes", "forge", "arche"].forEach(function(c){ images.push("loc_maison_" + c + ".gif"); images.push("badge_maison_" + c + ".gif"); });
	["badis", "maeva", "younes", "syrine", "noam", "zelia", "kamal", "lamia", "miguel", "amina", "ilyes", "clara", "mehdi", "sara", "rayan", "fama"].forEach(function(m){ images.push("item_" + m + ".gif"); });
	["p7_chantier", "p7_tempete", "p7_maree", "p7_premier_pas", "p7_rapport", "s_p7_avant_tempete", "platine_ch7", "ami_ch7"].forEach(function(b){ images.push("badge_" + b + ".gif"); });
	images.forEach(function(im){ verifier(fs.existsSync(path.join(IMG, im)), "image " + im + " présente"); });
	egal(images.length, 55, "55 images du chapitre");
	var jeu = monde.nouveauMonde({});
	var noms = jeu.lire("[Embarcadere, HallPortAube, BoiteDePortAube].concat(MAISONS_CH7.map(function(m){ return m.lieu; })).concat(HOTES_ILE.map(function(h){ return racineIle(h); })).map(function(r){ return r.room_pic; }).concat([TraversierEmbarcadere, LaurentPortAube, MissionPortAube, RadioPortAube, HorlogePortAube, CertificatPortAube, BestiairePortAube].concat(Object.keys(MAITRES_ILE).map(function(k){ return MAITRES_ILE[k].item; })).map(function(i){ return i.picturename; })).join('|')").split("|");
	noms.forEach(function(n){ verifier(fs.existsSync(path.join(IMG, n.replace(/^.*\//, ""))), "image du monde présente : " + n); });
	// Le décor n'apparaît pas avant l'ouverture.
	faux(jeu, "state.has('ch7Ouvert')", "partie neuve : Port-Aube est fermée");
	var jl = monde.nouveauMonde({});
	jl.taper("chapitre 6", "oui");
	var s = jl.taper("ssh noms");
	verifier(/Could not resolve/.test(s) && /chapitre 7/.test(s), "ssh noms avant l'ouverture (à Lumen) : refusé");
	contient(jl.taper("chantier"), "chapitre 7", "chantier avant l'ouverture : il dit où il sert");
	contient(jeu.taper("chapitre"), "7. ", "chapitre : la ligne 7");
	contient(jeu.taper("chapitre 8"), "1, 2, 3, 4, 5, 6 et 7", "chapitre 8 : il n'existe pas");
})();

/* ================================================================== */
/* 2. Le départ direct, puis l'ouverture après Lumen                    */
/* ================================================================== */
(function(){
	var jeu = neuf();
	vrai(jeu, "state.has('ch7Ouvert')", "départ direct : Port-Aube s'ouvre");
	vrai(jeu, "state.has('ch7Direct')", "départ direct : drapeau ch7Direct");
	vrai(jeu, "state.has('chapitre1Saute')", "départ direct : les chapitres précédents ne sont pas notés");
	egal(jeu.lire("current_room.room_name"), "PortAube", "départ direct : on arrive sur le quai");
	egal(jeu.lire("state.chapitreEnCours()"), 8, "chapitreEnCours vaut 8");
	egal(jeu.lire("numeroAffiche(8)"), 7, "le numéro affiché est 7");
	fait(jeu, "p7_quai", "p7_quai (l'arrivée sur le quai)");
	egal(jeu.lire("state.queteEnCours().id"), "p7_chantier", "l'étape en cours est p7_chantier");
	egal(jeu.lire("Shell.cheminAffiche(HallPortAube)"), "~/Cybersup/Embarcadere/PortAube", "le quai est au bout de l'Embarcadère");
	verifier(/^07:0\d$/.test(jeu.lire("heureCh7()")), "il est 7 h à l'arrivée (" + jeu.lire("heureCh7()") + ")");
	var avant = jeu.lire("tousLesSorts().filter(function(s){ return [1, 2, 3, 5, 6, 7].indexOf(chapitreDuSort(s)) > -1; })");
	verifier(avant.length > 190, "socle des chapitres 1 à 6 : " + avant.length + " sorts");
	avant.forEach(function(s){ vrai(jeu, "state.knows(" + JSON.stringify(s) + ")", "socle acquis au départ direct : " + s); });
	jeu.lire("ORDRE_DES_SORTS_8").forEach(function(s){
		faux(jeu, "state.knows(" + JSON.stringify(s) + ")", s + " s'apprend auprès d'un maître bâtisseur");
		egal(jeu.lire("chapitreDuSort(" + JSON.stringify(s) + ")"), 8, "chapitreDuSort(" + s + ")");
	});
	egal(jeu.lire("ORDRE_DES_SORTS_8.length"), 31, "31 sorts au chapitre 7");
	egal(jeu.lire("QUETES_CH7.length"), 27, "27 étapes");
	egal(jeu.lire("QUETES_SECONDAIRES_CH7.length"), 53, "53 défis (50 des maisons, 3 d'honneur)");
	egal(jeu.lire("MAISONS_CH7.length"), 10, "dix maisons");
	egal(jeu.lire("MAISONS_CH7.map(function(m){ return m.etapes.length; }).join('')"), "2222222222", "deux étapes par maison");
	egal(jeu.lire("QUETES_CH7.filter(function(q){ return !/^p7_/.test(q.id); }).length"), 0, "les étapes s'appellent p7_*");
	egal(jeu.lire("QUETES_SECONDAIRES_CH7.filter(function(q){ return !/^s_p7_/.test(q.id); }).length"), 0, "les défis s'appellent s_p7_*");
	egal(jeu.lire("chapitreDeQuete('s_p7_dig_soa')"), 8, "chapitreDeQuete d'un défi");
	egal(jeu.lire("chapitreDeQuete('a7_pont')"), 8, "chapitreDeQuete d'une annexe");
	egal(jeu.lire("state.xpMax8()"), 6120, "xpMax8");
	egal(jeu.lire("QUETES_CH7[QUETES_CH7.length - 1].id"), "p7_rapport", "la dernière étape est le rapport");
	contient(jeu.taper("chapitre 7"), "déjà ouvert", "chapitre 7 déjà ouvert : message clair");
	contient(jeu.taper("help 7"), "Tes sorts du chapitre 7", "help 7");
	contient(jeu.taper("xp"), "CHAPITRE 7", "xp : le tableau du chapitre 7");
	contient(jeu.taper("quetes"), "Laurent", "quetes : l'étape de Laurent");
	contient(jeu.taper("cat Radio"), "Grace", "la radio de Grace à Port-Aube");
	contient(jeu.taper("cat Horloge"), "07:", "l'horloge de la capitainerie");
	contient(jeu.taper("cat Laurent"), "Aron", "Laurent propose le prénom du premier étudiant");
	// La barre d'état : le chapitre, l'heure et la marée.
	var barre = jeu.lire("typeof texteBarreEtat === 'function' ? texteBarreEtat() : (typeof barreEtat === 'function' ? barreEtat() : '')");
	if (barre) contient(barre, "marée dans", "la barre d'état dit la marée");
	// Le départ direct depuis une partie engagée est refusé.
	var jeu2 = monde.nouveauMonde({});
	jeu2.taper("cd"); jeu2.taper("ls");
	jeu2.lire("state.complete('m_marche')");
	var r = jeu2.taper("chapitre 7", "oui");
	verifier(/déjà commencé/.test(r) && jeu2.lire("state.has('ch7Ouvert')") === false, "une partie engagée ne part pas directement à Port-Aube");
	// L'ouverture normale : après le rapport de Lumen (m6_rapport).
	var jeu3 = monde.nouveauMonde({});
	jeu3.taper("chapitre 6", "oui");
	faux(jeu3, "state.has('ch7Ouvert')", "Lumen en cours : Port-Aube reste fermée");
	jeu3.lire("state.complete('m6_rapport'); verifierMonde()");
	vrai(jeu3, "state.has('ch7Ouvert')", "après m6_rapport : Port-Aube s'ouvre");
	faux(jeu3, "state.has('ch7Direct')", "après m6_rapport : pas un départ direct");
	contient(jeu3.taper("cd ~/Cybersup/Embarcadere"), "Embarcadere", "cd ~/Cybersup/Embarcadere après Lumen");
	contient(jeu3.taper("cat Traversier"), "Laurent", "le traversier porte le mot de Laurent");
	contient(jeu3.taper("cd PortAube"), "PortAube", "cd PortAube : la traversée");
	fait(jeu3, "p7_quai", "p7_quai après Lumen");
	egal(jeu3.lire("state.chapitreEnCours()"), 8, "après l'arrivée, chapitreEnCours vaut 8");
	verifier(/^07:0\d$/.test(jeu3.lire("heureCh7()")), "après Lumen aussi, il est 7 h à l'arrivée (" + jeu3.lire("heureCh7()") + ")");
	// La septième enveloppe : le billet de traversée.
	var enveloppes = fs.readFileSync(path.join(JS, "Game.js"), "utf8");
	verifier(enveloppes.indexOf("Le Billet de traversée") > -1 && enveloppes.indexOf("item_billet_traversee.gif") > -1, "Game.js : la septième enveloppe, le Billet de traversée");
})();

/* ================================================================== */
/* 3. Le plan de la cité, Laurent, la mission, l'horloge, les maîtres  */
/* ================================================================== */
(function(){
	var jeu = neuf();
	pasFait(jeu, "p7_chantier", "rien lu : pas de p7_chantier");
	var l = jeu.taper("chantier");
	contient(l, "LE PLAN DE PORT-AUBE", "chantier : le titre");
	contient(l, "pas Linux", "chantier : une commande du jeu, dit-elle");
	jeu.lire("MAISONS_CH7").forEach(function(m){ contient(l, m.nom, "chantier : la maison " + m.nom); });
	contient(l, "10 / 100", "chantier : la note de départ (10)");
	pasFait(jeu, "p7_chantier", "chantier sans Laurent ni mission : pas de p7_chantier");
	jeu.taper("cat Laurent");
	pasFait(jeu, "p7_chantier", "Laurent sans la mission : pas encore");
	jeu.taper("cat Mission");
	fait(jeu, "p7_chantier", "Laurent, la mission, et le plan déjà consulté");
	egal(jeu.lire("state.ch7.scoreDepart"), 10, "note de départ retenue : 10");
	jeu.taper("cd Poste");
	contient(jeu.taper("chantier"), "◀ toi", "chantier montre où l'on est");
	// L'horloge : trois minutes par ligne tapée, même si elle enchaîne plusieurs commandes.
	var h0 = jeu.lire("state.ch7.horloge");
	jeu.taper("ls"); jeu.taper("ls"); jeu.taper("ls");
	egal(jeu.lire("state.ch7.horloge") - h0, 9, "trois commandes : neuf minutes");
	h0 = jeu.lire("state.ch7.horloge");
	jeu.taper("ls; ls; ls");
	egal(jeu.lire("state.ch7.horloge") - h0, 3, "une ligne de trois commandes : trois minutes");
	contient(jeu.taper("man chantier"), "chantier", "man chantier existe");
	// Un maître vivant : il apprend ses sorts et révèle ses défis.
	var g = jeu.taper("cat Younes");
	contient(g, "Younes", "Younes se présente");
	contient(g, "postconf -n", "Younes donne la syntaxe");
	vrai(jeu, "state.knows('postconf') && state.knows('mailq')", "Younes apprend postconf et mailq");
	verifier((g.match(/\[ \]/g) || []).length === 5, "Younes montre cinq défis à faire");
	contient(g, "overriding", "Younes réagit à l'erreur fréquente (le doublon de main.cf)");
	// Le manuel en français.
	contient(jeu.taper("man postconf"), "postconf -n", "man postconf");
	contient(jeu.taper("man borg"), "borg", "man borg");
	contient(jeu.taper("cat ../Bestiaire"), "DNS", "le bestiaire traduit les images en vrais mots");
	// Un sort encore inconnu : il dit qui l'enseigne.
	contient(jeu.taper("ssh registre"), "registre", "ssh registre");
	contient(jeu.taper("slapcat"), "Kamal", "un sort inconnu dit quel maître l'enseigne");
})();

/* ================================================================== */
/* 4. Les fausses validations : l'état réel des machines, pas la frappe */
/* ================================================================== */
/* La Maison des Noms : une zone écrite dans un echo, ou jamais chargée, ne compte pas ; la série doit monter. */
(function(){
	var jeu = surIle();
	jouer(jeu, ["ssh noms", "echo 'zone \"port-aube.lan\" { type primary; file \"" + Z + "\"; };'", "dig @noms poste.port-aube.lan +short"]);
	pasFait(jeu, "p7_zone", "une zone dans un echo : rien n'est servi");
	jouer(jeu, ["printf 'zone \"port-aube.lan\" {\\n\\ttype primary;\\n\\tfile \"" + Z + "\";\\n};\\n' | sudo tee -a /etc/bind/named.conf.local", "sudo rndc reload", "dig @noms poste.port-aube.lan +short"]);
	pasFait(jeu, "p7_zone", "le brouillon chargé avec ses deux fautes : named refuse la zone");
	contient(jeu.taper("sudo journalctl -u named | grep dotted"), "bad dotted quad", "le journal de named dit la faute");
	jouer(jeu, ["sudo sed -i 's/10.0.70.380/10.0.70.38/; /^imap\\t\\tIN\\tA/d' " + Z]);
	pasFait(jeu, "p7_zone", "fichier corrigé mais pas rechargé : named sert toujours l'ancien état");
	jouer(jeu, ["sudo rndc reload", "dig @noms poste.port-aube.lan +short"]);
	pasFait(jeu, "p7_zone", "zone servie, mais jamais vérifiée (named-checkzone) : pas encore");
	t(jeu, "sudo named-checkzone port-aube.lan " + Z);
	fait(jeu, "p7_zone", "vérifiée, chargée, interrogée : la zone");
	jouer(jeu, ["printf 'imprimerie\\tIN\\tA\\t10.0.70.31\\nbibliotheque\\tIN\\tA\\t10.0.70.73\\n' | sudo tee -a " + Z, "sudo rndc reload", "dig @noms port-aube.lan SOA +short"]);
	pasFait(jeu, "p7_serie", "deux noms ajoutés sans monter la série : refusé");
	egal(jeu.lire("valeursDnsCh7('noms', 'imprimerie.port-aube.lan').length"), 1, "sans série, noms sert quand même le nouveau nom (le secondaire, lui, ne le verra jamais)");
	jouer(jeu, ["sudo sed -i 's/2026101701/2026101702/' " + Z, "sudo rndc reload", "dig @noms port-aube.lan SOA +short"]);
	fait(jeu, "p7_serie", "la série montée : la Maison des Noms est bâtie");
	vrai(jeu, "maisonBatieCh7('noms')", "maison des Noms bâtie");
	// Le phare : un transfert ouvert à tous est refusé.
	jouer(jeu, ["exit", "ssh phare", "printf 'zone \"port-aube.lan\" {\\n\\ttype secondary;\\n\\tprimaries { 10.0.70.53; };\\n\\tfile \"/var/cache/bind/db.port-aube.lan\";\\n};\\n' | sudo tee -a /etc/bind/named.conf.local; sudo rndc reload", "dig @phare port-aube.lan SOA +short", "exit"]);
	vrai(jeu, "zoneCh7('phare') !== null", "sans allow-transfer, le phare copie quand même (BIND transfère à tous par défaut)");
	pasFait(jeu, "p7_secondaire", "transfert ouvert à tous : refusé");
	t(jeu, "dig @noms port-aube.lan AXFR");
	pasFait(jeu, "p7_secondaire", "un AXFR qui réussit pour n'importe qui ne prouve rien");
	jouer(jeu, ["ssh noms", "sudo sed -i 's|\\tfile \"" + Z.replace(/\//g, "\\/") + "\";|&\\n\\tallow-transfer { 10.0.70.54; };|' /etc/bind/named.conf.local", "sudo rndc reload", "dig @noms port-aube.lan AXFR", "exit"]);
	fait(jeu, "p7_secondaire", "transfert réservé au phare, et refusé sous nos yeux");
	// La zone inverse : un PTR écrit à la main dans le fichier n'est pas un ajout à chaud.
	jouer(jeu, ["ssh noms", "tsig-keygen cle-phare | sudo tee /etc/bind/cle-phare.key",
		"printf '$TTL\\t3600\\n@\\tIN\\tSOA\\tnoms.port-aube.lan. hostmaster.port-aube.lan. (\\n\\t1 3600 900 604800 300 )\\n@\\tIN\\tNS\\tnoms.port-aube.lan.\\n25\\tIN\\tPTR\\tposte.port-aube.lan.\\n60\\tIN\\tPTR\\tcapitainerie.port-aube.lan.\\n' | sudo tee /var/lib/bind/db.10.0.70",
		"printf 'zone \"70.0.10.in-addr.arpa\" {\\n\\ttype primary;\\n\\tfile \"/var/lib/bind/db.10.0.70\";\\n\\tallow-transfer { 10.0.70.54; };\\n\\talso-notify { 10.0.70.54; };\\n};\\n' | sudo tee -a /etc/bind/named.conf.local", "sudo rndc reload", "exit",
		"ssh phare", "printf 'zone \"70.0.10.in-addr.arpa\" {\\n\\ttype secondary;\\n\\tprimaries { 10.0.70.53; };\\n\\tfile \"/var/cache/bind/db.10.0.70\";\\n};\\n' | sudo tee -a /etc/bind/named.conf.local; sudo rndc reload", "dig -x 10.0.70.25 @phare", "exit"]);
	pasFait(jeu, "p7_inverse", "le PTR de la capitainerie écrit dans le fichier : pas un ajout signé à chaud");
	var refus = jouer(jeu, ["ssh noms", "printf 'server 10.0.70.53\\nzone 70.0.10.in-addr.arpa\\nupdate add 61.70.0.10.in-addr.arpa. 3600 IN PTR vigie.port-aube.lan.\\nsend\\n' | sudo nsupdate -k /etc/bind/cle-phare.key"]);
	contient(refus, "tsig verify failure", "nsupdate avec une clé que named ne connaît pas : refusé");
	pasFait(jeu, "p7_inverse", "nsupdate refusé : pas d'ajout");
	jouer(jeu, ["sudo sed -i '1i include \"/etc/bind/cle-phare.key\";' /etc/bind/named.conf.local", "sudo sed -i 's|\\tfile \"/var/lib/bind/db.10.0.70\";|&\\n\\tallow-update { key cle-phare; };|' /etc/bind/named.conf.local", "sudo named-checkconf && sudo rndc reload",
		"printf 'server 10.0.70.53\\nzone 70.0.10.in-addr.arpa\\nupdate add 61.70.0.10.in-addr.arpa. 3600 IN PTR vigie.port-aube.lan.\\nsend\\n' | sudo nsupdate -k /etc/bind/cle-phare.key", "dig -x 10.0.70.61 @noms +short", "exit"]);
	fait(jeu, "p7_inverse", "la clé connue, la zone ouverte aux ajouts signés : l'ajout à chaud");
	vrai(jeu, "maisonBatieCh7('phare')", "le Phare-Relais est bâti");
	// Une zone dynamique : on la gèle avant d'y toucher à la main, puis on la dégèle.
	contient(jouer(jeu, ["ssh noms", "sudo rndc freeze 70.0.10.in-addr.arpa", "sudo rndc thaw 70.0.10.in-addr.arpa", "dig -x 10.0.70.61 @noms +short", "exit"]), "vigie.port-aube.lan.", "rndc freeze puis thaw : l'ajout à chaud tient");
})();
/* La Poste : le relais ouvert à tous, ou un main.cf qui râle encore, ne passent pas ; une lettre qui part, oui. */
(function(){
	var jeu = surIle();
	batir(jeu, "noms");
	jouer(jeu, ["ssh poste", "mailq", "postconf -n", "sudo postconf -e 'myhostname = poste.port-aube.lan' 'relayhost ='", "sudo postfix check && sudo postfix reload"]);
	pasFait(jeu, "p7_postfix", "relais ouvert au monde (mynetworks = 0.0.0.0/0) et doublons : refusé");
	jouer(jeu, ["sudo postconf -e 'mynetworks = 127.0.0.0/8 10.0.70.0/24'", "sudo postfix check && sudo postfix reload"]);
	pasFait(jeu, "p7_postfix", "main.cf qui râle encore (overriding, unused) : refusé");
	jouer(jeu, ["sudo sed -i '/^mydomian/d; $d' /etc/postfix/main.cf", "sudo postconf -e 'mydomain = port-aube.lan' 'mydestination = $myhostname, $mydomain, localhost'"]);
	pasFait(jeu, "p7_postfix", "main.cf juste, mais pas rechargé : Postfix tourne avec l'ancien");
	t(jeu, "sudo postfix reload");
	pasFait(jeu, "p7_postfix", "rechargé, mais jamais vérifié depuis la correction (postfix check) : pas encore");
	t(jeu, "sudo postfix check");
	fait(jeu, "p7_postfix", "vérifié, rechargé : le main.cf juste");
	t(jeu, "echo 'Faux' > /tmp/status=sent");
	pasFait(jeu, "p7_courrier", "la file n'est pas vidée, aucune lettre n'est partie : refusé");
	jouer(jeu, ["sudo postqueue -f", "mailq"]);
	pasFait(jeu, "p7_courrier", "la file vidée, mais aucune lettre envoyée par soi : pas encore");
	t(jeu, "echo 'Bonjour' | mail -s 'Essai' $(whoami)");
	fait(jeu, "p7_courrier", "une lettre qui arrive pour de bon");
	// Le Bureau des Lettres : Dovecot réglé mais pas rechargé ; un faux DKIM.
	jouer(jeu, ["doveadm user $(whoami)", "sudo sed -i 's|^mail_location = .*|mail_location = maildir:/var/mail/%u|' /etc/dovecot/conf.d/10-mail.conf", "doveadm mailbox status messages INBOX"]);
	pasFait(jeu, "p7_imap", "mail_location écrit, Dovecot pas rechargé : refusé");
	jouer(jeu, ["sudo systemctl reload dovecot", "doveadm mailbox status messages INBOX"]);
	fait(jeu, "p7_imap", "Dovecot lit les boîtes de Postfix");
	jouer(jeu, ["exit", "ssh noms", "printf '@\\tIN\\tTXT\\t\"v=spf1 mx -all\"\\n_dmarc\\tIN\\tTXT\\t\"v=DMARC1; p=quarantine\"\\naube._domainkey\\tIN\\tTXT\\t\"v=DKIM1; k=rsa; p=MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAinventee\"\\n' | sudo tee -a " + Z,
		"sudo sed -i 's/2026101702/2026101703/' " + Z, "sudo rndc reload", "dig @noms port-aube.lan TXT +short; dig @noms aube._domainkey.port-aube.lan TXT +short; dig @noms _dmarc.port-aube.lan TXT +short"]);
	pasFait(jeu, "p7_usurpation", "une clé DKIM inventée (pas celle de la Poste) : refusée");
	jouer(jeu, ["exit", "ssh poste", "sudo opendkim-genkey -s aube -d port-aube.lan -D /etc/opendkim/keys; sudo cat /etc/opendkim/keys/aube.txt > /tmp/aube.txt; scp /tmp/aube.txt noms:/tmp/", "exit", "ssh noms",
		"sudo sed -i '/^aube._domainkey/d' " + Z + "; cat /tmp/aube.txt | sudo tee -a " + Z, "sudo sed -i 's/2026101703/2026101704/' " + Z, "sudo rndc reload", "dig @noms aube._domainkey.port-aube.lan TXT +short", "exit"]);
	fait(jeu, "p7_usurpation", "la vraie clé publique de la Poste publiée");
})();
/* Les Greniers : no_root_squash, ou un export ouvert à tous (la rive comprise), refusés. */
(function(){
	var jeu = surIle();
	jouer(jeu, ["ssh greniers", "echo '/srv/homes *(rw,sync,no_subtree_check,no_root_squash)' | sudo tee -a /etc/exports", "sudo exportfs -ra", "sudo exportfs -v", "exit", "ssh quai", "showmount -e greniers"]);
	pasFait(jeu, "p7_exports", "export à tout le monde, en no_root_squash : refusé");
	jouer(jeu, ["exit", "ssh greniers", "sudo sed -i 's|^/srv/homes .*|/srv/homes 10.0.70.0/24(rw,sync,no_subtree_check,no_root_squash)|' /etc/exports", "sudo exportfs -ra", "sudo exportfs -v", "exit"]);
	pasFait(jeu, "p7_exports", "à l'île seulement, mais no_root_squash : refusé");
	jouer(jeu, ["ssh greniers", "sudo sed -i 's/no_root_squash/root_squash/' /etc/exports", "exit"]);
	pasFait(jeu, "p7_exports", "/etc/exports corrigé, mais pas relu (exportfs -ra) : refusé");
	jouer(jeu, ["ssh greniers", "sudo exportfs -ra", "exit"]);
	fait(jeu, "p7_exports", "relu : l'export juste");
	jouer(jeu, ["ssh quai", "sudo mount -t nfs greniers:/srv/homes /mnt", "ls /mnt"]);
	pasFait(jeu, "p7_squash", "monté, mais root n'a pas encore essayé d'écrire : pas encore");
	var s = t(jeu, "sudo touch /mnt/essai-de-root");
	contient(s, "root_squash", "root du quai refusé : le message dit le squash");
	fait(jeu, "p7_squash", "root du quai devient nobody aux Greniers");
	t(jeu, "sudo chown 10001 /mnt/badis");
	vrai(jeu, "dossierHote('greniers', '/srv/homes/badis').owner === '10001'", "chown à travers le squash : rien ne change aux Greniers");
})();
/* La Halle : un partage ouvert aux invités, ou un dossier sans le groupe, refusés. */
(function(){
	var jeu = surIle();
	batir(jeu, "registre");
	jouer(jeu, ["ssh halle", "sudo sed -i 's/^;\\(\\[promo\\]\\)/\\1/; s/^;\\(   \\)/\\1/' /etc/samba/smb.conf", "sudo sed -i 's/^\\(   path = \\/srv\\/promo\\)$/\\1\\n   guest ok = yes/' /etc/samba/smb.conf", "sudo mkdir /srv/promo", "testparm -s"]);
	pasFait(jeu, "p7_partage", "invités admis, dossier de root seul : refusé");
	jouer(jeu, ["sudo sed -i '/guest ok = yes/d' /etc/samba/smb.conf", "testparm -s"]);
	pasFait(jeu, "p7_partage", "le dossier n'est pas au groupe promo : refusé");
	jouer(jeu, ["sudo chown root:promo /srv/promo; sudo chmod 2770 /srv/promo", "testparm -s"]);
	fait(jeu, "p7_partage", "le partage juste, vérifié");
	jouer(jeu, ["sudo smbpasswd -a zelia", "sudo pdbedit -L; smbclient -L halle -U zelia"]);
	t(jeu, "smbclient //halle/promo -N -c ls");
	pasFait(jeu, "p7_promo_acces", "un invité refusé ne dépose rien");
	t(jeu, "cd; echo 'Le plan' > plan.txt; smbclient //halle/promo -U zelia -c 'put plan.txt; ls'");
	fait(jeu, "p7_promo_acces", "Zélia, de la promo, dépose son plan");
})();
/* Le Grand Registre : le LDIF fautif, un groupe sans ses membres, refusés ; l'ancien sceau ne se devine pas. */
(function(){
	var jeu = surIle();
	jouer(jeu, ["ssh registre", "ldapsearch -x -LLL -b dc=port-aube,dc=lan"]);
	var s = t(jeu, "cd; printf 'dn: ou=people,dc=port-aube,dc=lan\\nobjectClass: organizationalUnit\\nou: people\\n' > p.ldif; ldapadd -x -D cn=admin,dc=port-aube,dc=lan -W -f p.ldif");
	contient(s, "Invalid credentials", "sans le sceau reforgé : ldapadd refusé");
	t(jeu, MAISONS.registre[1]);
	vrai(jeu, "rootPwConnuCh7()", "le sceau reforgé est un hachage connu");
	jouer(jeu, ["printf 'dn: ou=people,dc=port-aube,dc=lan\\nobjectClass: organizationalUnit\\nou: people\\n\\ndn: ou=groups,dc=port-aube,dc=lan\\nobjectClass: organizationalUnit\\nou: groups\\n' > b.ldif; ldapadd -x -D cn=admin,dc=port-aube,dc=lan -W -f b.ldif",
		"sudo cp /root/batisseurs.ldif .; sudo chown $(whoami) batisseurs.ldif"]);
	var r = t(jeu, "ldapadd -c -x -D cn=admin,dc=port-aube,dc=lan -W -f batisseurs.ldif");
	contient(r, "Object class violation", "ldapadd dit la première faute (Noam sans uidNumber)");
	contient(r, "invalid per syntax", "ldapadd dit la seconde faute (un numéro en lettres)");
	pasFait(jeu, "p7_annuaire", "huit bâtisseurs sur dix : refusé");
	t(jeu, "exit");
	contient(jeu.taper("cat GrandRegistre/Kamal"), "Noam", "Kamal réagit à l'erreur fréquente");
	jouer(jeu, ["ssh registre", "cd; sed -i 's/^gidNumber: dix-mille/gidNumber: 10000/; s/^uid: noam$/uid: noam\\nuidNumber: 10005/' batisseurs.ldif; ldapadd -c -x -D cn=admin,dc=port-aube,dc=lan -W -f batisseurs.ldif", "ldapsearch -x -LLL '(uid=badis)'"]);
	fait(jeu, "p7_annuaire", "les dix inscrits");
	jouer(jeu, ["printf 'dn: cn=batisseurs,ou=groups,dc=port-aube,dc=lan\\nobjectClass: posixGroup\\ncn: batisseurs\\ngidNumber: 10000\\n\\ndn: cn=promo,ou=groups,dc=port-aube,dc=lan\\nobjectClass: posixGroup\\ncn: promo\\ngidNumber: 10100\\nmemberUid: zelia\\n' > g.ldif; ldapadd -x -D cn=admin,dc=port-aube,dc=lan -W -f g.ldif"]);
	pasFait(jeu, "p7_groupes", "batisseurs sans ses dix membres : refusé");
	t(jeu, "printf 'dn: cn=batisseurs,ou=groups,dc=port-aube,dc=lan\\nchangetype: modify\\nadd: memberUid\\nmemberUid: badis\\nmemberUid: maeva\\nmemberUid: younes\\nmemberUid: syrine\\nmemberUid: noam\\nmemberUid: zelia\\nmemberUid: kamal\\nmemberUid: lamia\\nmemberUid: miguel\\nmemberUid: amina\\n' > m.ldif; ldapmodify -x -D cn=admin,dc=port-aube,dc=lan -W -f m.ldif");
	fait(jeu, "p7_groupes", "les deux groupes, et des membres ajoutés par ldapmodify");
})();
/* Les Portes : un sssd.conf lisible par tous, sssd refuse de démarrer ; nsswitch sans sss, personne n'est reconnu. */
(function(){
	var jeu = surIle();
	batir(jeu, "registre"); batir(jeu, "greniers");
	var s = jouer(jeu, ["ssh quai", "printf '[sssd]\\nservices = nss, pam\\ndomains = port-aube\\n\\n[domain/port-aube]\\nid_provider = ldap\\nauth_provider = ldap\\nldap_uri = ldap://registre.port-aube.lan\\nldap_search_base = dc=port-aube,dc=lan\\n' | sudo tee /etc/sssd/sssd.conf", "sudo systemctl start sssd"]);
	contient(s, "failed", "sssd.conf lisible par tous : sssd refuse de démarrer");
	faux(jeu, "sssdActifIle('quai')", "sssd arrêté");
	jouer(jeu, ["sudo chmod 600 /etc/sssd/sssd.conf", "sudo systemctl start sssd", "getent passwd badis", "id badis"]);
	pasFait(jeu, "p7_sssd", "sssd tourne, mais nsswitch ne le consulte pas : refusé");
	egal(jeu.taper("getent passwd badis").trim(), "", "sans sss dans nsswitch, getent ne trouve personne");
	jouer(jeu, ["sudo sed -i 's/^\\(passwd\\|group\\|shadow\\):\\( *\\)files/&  sss/' /etc/nsswitch.conf", "getent passwd badis; id badis"]);
	fait(jeu, "p7_sssd", "le quai reconnaît les comptes du Registre");
	jouer(jeu, ["echo '/home /etc/auto.home' | sudo tee /etc/auto.master.d/home.autofs; echo '* greniers:/srv/homes/badis' | sudo tee /etc/auto.home", "sudo systemctl reload autofs", "ls -ld /home/kamal"]);
	pasFait(jeu, "p7_autofs", "une carte qui monte la maison de Badis pour tout le monde : refusée");
	jouer(jeu, ["echo '* greniers:/srv/homes/&' | sudo tee /etc/auto.home", "ls -ld /home/badis"]);
	fait(jeu, "p7_autofs", "chaque maison s'ouvre à l'arrivée");
	contient(jeu.taper("ls -ld /home/badis"), "badis", "ls -l sur le quai : des noms, pas des numéros");
})();
/* La Forge : la clé de l'autorité copiée hors de la Forge, ou un sceau autosigné, refusés. */
(function(){
	var jeu = surIle();
	batir(jeu, "noms"); batir(jeu, "poste"); batir(jeu, "lettres");
	jouer(jeu, ["ssh forge", "sudo openssl genrsa -out /tmp/forge.key 4096; sudo openssl req -x509 -new -key /tmp/forge.key -days 3650 -subj '/CN=Forge des Sceaux de Port-Aube' -out /srv/forge/forge.crt"]);
	pasFait(jeu, "p7_autorite", "la clé de l'autorité hors du dossier fermé : refusé");
	t(jeu, "sudo cp /tmp/forge.key /srv/forge/forge.key; sudo chmod 644 /srv/forge/forge.key");
	pasFait(jeu, "p7_autorite", "une copie de la clé restée dans /tmp, et une clé lisible par tous : refusé");
	t(jeu, "sudo rm /tmp/forge.key");
	pasFait(jeu, "p7_autorite", "une clé lisible par tous : refusé");
	t(jeu, "sudo chmod 600 /srv/forge/forge.key; sudo cp /srv/forge/forge.crt /srv/demandes/");
	fait(jeu, "p7_autorite", "la clé gardée, le certificat d'autorité");
	jouer(jeu, ["exit", "ssh poste", "sudo openssl req -x509 -newkey rsa:2048 -nodes -keyout /etc/dovecot/private/poste.key -subj '/CN=poste.port-aube.lan' -out /etc/dovecot/private/poste.pem",
		"sudo sed -i 's|^ssl_cert = .*|ssl_cert = </etc/dovecot/private/poste.pem|; s|^ssl_key = .*|ssl_key = </etc/dovecot/private/poste.key|' /etc/dovecot/conf.d/10-ssl.conf; sudo systemctl reload dovecot", "exit"]);
	var s = jouer(jeu, ["ssh quai", "openssl s_client -connect poste.port-aube.lan:993", "exit"]);
	contient(s, "self-signed", "un sceau autosigné : le quai le dit");
	pasFait(jeu, "p7_sceaux", "un sceau autosigné : refusé");
	jouer(jeu, MAISONS.forge.slice(3, 13));
	jouer(jeu, ["ssh quai", "openssl s_client -connect poste.port-aube.lan:993", "exit"]);
	pasFait(jeu, "p7_sceaux", "signé par la Forge, mais le quai ne fait pas encore confiance à la Forge : refusé");
	jouer(jeu, MAISONS.forge.slice(13));
	fait(jeu, "p7_sceaux", "le sceau de la Poste, reconnu depuis le quai");
})();
/* L'Arche : une clé sans restriction, une phrase lisible, une « restauration » copiée à la main, refusées. */
(function(){
	var jeu = surIle();
	batir(jeu, "greniers");
	jouer(jeu, ["ssh greniers", "sudo ssh-keygen -t ed25519 -f /root/.ssh/arche -N ''; sudo cp /root/.ssh/arche.pub /tmp/; scp /tmp/arche.pub arche:/tmp/", "exit",
		"ssh arche", "cat /tmp/arche.pub | sudo tee /home/borg/.ssh/authorized_keys", "exit",
		"ssh greniers", "sudo borg init -e repokey --rsh 'ssh -i /root/.ssh/arche' borg@arche:/srv/borg/greniers",
		"echo 'La-cite-ne-perd-rien' | sudo tee /root/.borg-phrase; sudo systemctl start sauvegarde-borg"]);
	vrai(jeu, "!!derniereArchiveCh7()", "la sauvegarde a bien tourné");
	pasFait(jeu, "p7_depot", "une clé qui peut tout faire sur l'Arche, une phrase lisible : refusé");
	t(jeu, "sudo chmod 600 /root/.borg-phrase");
	pasFait(jeu, "p7_depot", "la phrase gardée, mais la clé n'est pas enfermée : refusé");
	jouer(jeu, ["exit", "ssh arche", "sed 's|^|command=\"borg serve --restrict-to-path /srv/borg/greniers\",restrict |' /tmp/arche.pub | sudo tee /home/borg/.ssh/authorized_keys", "exit", "ssh greniers"]);
	fait(jeu, "p7_depot", "la clé enfermée, la phrase gardée, une archive des Greniers");
	// Avec la clé enfermée, un autre dépôt est refusé.
	var autre = t(jeu, "sudo borg init -e repokey --rsh 'ssh -i /root/.ssh/arche' borg@arche:/srv/borg/autre");
	verifier(/restrict|not allowed|refus/i.test(autre), "la clé enfermée ne peut pas créer un autre dépôt");
	jouer(jeu, ["printf '[Timer]\\nOnCalendar=*-*-* 02:30\\n\\n[Install]\\nWantedBy=timers.target\\n' | sudo tee /etc/systemd/system/sauvegarde-borg.timer; sudo systemctl daemon-reload; sudo systemctl enable --now sauvegarde-borg.timer",
		"sudo borg check --rsh 'ssh -i /root/.ssh/arche' borg@arche:/srv/borg/greniers",
		"sudo mkdir -p /tmp/faux/srv/homes; sudo cp -r /srv/homes/badis /tmp/faux/srv/homes/", "sudo diff -r /srv/homes/badis /tmp/faux/srv/homes/badis"]);
	pasFait(jeu, "p7_restauration", "une « restauration » copiée à la main : refusée");
	jouer(jeu, ["sudo mkdir /tmp/retour; cd /tmp/retour; sudo borg extract --rsh 'ssh -i /root/.ssh/arche' borg@arche:/srv/borg/greniers::<archive> srv/homes/badis", "sudo diff -r /srv/homes/badis /tmp/retour/srv/homes/badis"]);
	fait(jeu, "p7_restauration", "restaurée par borg, comparée : identique");
})();
/* Un ordre libre : réparer d'abord et regarder ensuite ne bloque rien. */
(function(){
	var jeu = surIle();
	jouer(jeu, ["ssh noms", "printf 'zone \"port-aube.lan\" {\\n\\ttype primary;\\n\\tfile \"" + Z + "\";\\n};\\n' | sudo tee -a /etc/bind/named.conf.local", "sudo sed -i 's/10.0.70.380/10.0.70.38/; /^imap\\t\\tIN\\tA/d' " + Z, "sudo rndc reload",
		"dig @noms poste.port-aube.lan +short", "sudo named-checkzone port-aube.lan " + Z]);
	fait(jeu, "p7_zone", "réparer puis vérifier (checkzone après dig) : accepté");
})();

/* ================================================================== */
/* 5. La Tempête : les incidents sur les maisons bâties, et leur réparation */
/* ================================================================== */
(function(){
	var jeu = surIle();
	batir(jeu, "noms"); batir(jeu, "poste");
	vrai(jeu, "maisonBatieCh7('noms') && maisonBatieCh7('poste')", "deux maisons bâties");
	faux(jeu, "!!state.ch7.tempete", "pas encore la Tempête");
	jeu.lire("state.ch7.horloge = TEMPETE_CH7 - 2");
	var s = t(jeu, "uptime");
	contient(s, "14 h", "14 h : la Tempête est annoncée");
	vrai(jeu, "!!state.ch7.tempete", "14 h : la Tempête tombe");
	faux(jeu, "!!state.ch7.tempeteEnAvance", "à l'heure, pas en avance");
	egal(jeu.lire("Object.keys(state.ch7.incidentsTempete).sort().join(' ')"), "noms poste", "deux incidents, sur les deux maisons bâties");
	t(jeu, "ssh noms");
	contient(jeu.taper("dig @noms port-aube.lan MX +short"), "port-aube.lan.port-aube.lan.", "le MX sans point final : le domaine est collé deux fois");
	t(jeu, "exit");
	t(jeu, "ssh poste");
	contient(jeu.taper("postconf mynetworks"), "0.0.0.0/0", "la Poste rouverte à tous");
	t(jeu, "exit");
	var avant = score(jeu);
	contient(jeu.taper("chantier"), "la Tempête :", "chantier dit chaque incident");
	contient(jeu.taper("cat Poste/Younes"), "La Tempête", "le maître dit l'incident de sa maison");
	pasFait(jeu, "p7_tempete", "incidents non réparés : pas de p7_tempete");
	jouer(jeu, ["ssh noms", "sudo sed -i 's/\\(MX\\t10 poste.port-aube.lan\\)$/\\1./' " + Z + "; sudo sed -i 's/2026101703/2026101704/' " + Z, "sudo rndc reload", "exit"]);
	pasFait(jeu, "p7_tempete", "un seul incident réparé : pas encore");
	jouer(jeu, ["ssh poste", "sudo postconf -e 'mynetworks = 127.0.0.0/8 10.0.70.0/24'; sudo postfix reload", "exit"]);
	verifier(score(jeu) > avant, "réparer fait monter la note (" + avant + " puis " + score(jeu) + ")");
	t(jeu, "chantier");
	fait(jeu, "p7_tempete", "les incidents réparés, et le plan regardé pendant la Tempête");
	// Le journal des machines garde la trace de la Tempête.
	t(jeu, "ssh noms");
	contient(jeu.taper("sudo journalctl -n 30"), "Tempête", "le journal de noms dit la Tempête");
	t(jeu, "exit");
})();
/* La Tempête en avance : six maisons debout la font tomber aussitôt, et frappe aussi le Registre, les Greniers. */
(function(){
	var jeu = surIle();
	["noms", "phare", "poste", "lettres", "registre"].forEach(function(m){ batir(jeu, m); });
	faux(jeu, "!!state.ch7.tempete", "cinq maisons : pas encore la Tempête");
	batir(jeu, "greniers");
	vrai(jeu, "!!state.ch7.tempete && !!state.ch7.tempeteEnAvance", "six maisons : la Tempête en avance");
	egal(jeu.lire("Object.keys(state.ch7.incidentsTempete).length"), 6, "six incidents");
	faux(jeu, "INCIDENTS_TEMPETE_CH7.registre.reparee()", "Zélia sortie de la promo");
	faux(jeu, "INCIDENTS_TEMPETE_CH7.greniers.reparee()", "no_root_squash remis");
	faux(jeu, "INCIDENTS_TEMPETE_CH7.lettres.reparee()", "la boîte du joueur à root");
	faux(jeu, "INCIDENTS_TEMPETE_CH7.phare.reparee()", "le phare en retard d'une série");
	t(jeu, "ssh phare");
	contient(jeu.taper("dig @phare port-aube.lan SOA +short"), "2026101704", "le phare garde une vieille série");
	t(jeu, "exit");
})();

/* ================================================================== */
/* 6. La Marée, le navire, le Premier Pas                               */
/* ================================================================== */
(function(){
	var jeu = surIle();
	batir(jeu, "noms"); batir(jeu, "phare");
	jeu.lire("state.ch7.horloge = MAREE_CH7 - 2");
	var s = t(jeu, "uptime");
	vrai(jeu, "!!state.ch7.tempete && !!state.ch7.maree", "19 h : la Tempête est passée, la marée est là");
	contient(s, "19 h", "19 h : la marée est annoncée");
	contient(s, "Greniers", "la marée dit ce qui manque (les Greniers sont fermés)");
	egal(jeu.lire("state.ch7.inacheveesMaree.length"), 8, "huit maisons inachevées à la marée");
	faux(jeu, "SURPRISE_MAREE_CH7.reparee()", "le navire inscrit à la main : le phare ne le connaît pas");
	t(jeu, "ssh noms");
	contient(jeu.taper("dig @noms navire.port-aube.lan +short"), "10.0.70.200", "noms connaît le navire");
	egal(jeu.taper("dig @phare navire.port-aube.lan +short").trim(), "", "le phare, non");
	jouer(jeu, ["sudo sed -i 's/^\\(\\s*\\)\\(20261017[0-9][0-9]\\)/\\1 2026101799/' " + Z, "sudo rndc reload"]);
	contient(jeu.taper("dig @phare navire.port-aube.lan +short"), "10.0.70.200", "la série montée : le phare apprend le navire");
	t(jeu, "exit");
	t(jeu, "chantier");
	fait(jeu, "p7_maree", "ce que la marée a apporté est réparé");
	verifier(score(jeu) < 90, "huit maisons inachevées : la note reste basse (" + score(jeu) + ")");
	pasFait(jeu, "p7_chantier_final", "chantier sous 90 après la marée : pas de p7_chantier_final");
})();
/* Le Premier Pas : les six portes, une à une. */
(function(){
	var jeu = surIle();
	["noms", "phare", "poste", "lettres", "registre", "greniers"].forEach(function(m){ batir(jeu, m); });
	vrai(jeu, "!!state.ch7.tempete", "six maisons : la Tempête");
	jouer(jeu, ["ssh registre", "cd; printf 'dn: cn=promo,ou=groups,dc=port-aube,dc=lan\\nchangetype: modify\\nadd: memberUid\\nmemberUid: zelia\\n' > z.ldif; ldapmodify -x -D cn=admin,dc=port-aube,dc=lan -W -f z.ldif", "exit"]);
	["portes", "halle", "forge", "arche"].forEach(function(m){ batir(jeu, m); });
	jouer(jeu, ["ssh noms", "sudo sed -i 's/\\(MX\\t10 poste.port-aube.lan\\)$/\\1./; s/2026101705/2026101706/' " + Z + "; sudo rndc reload", "exit",
		"ssh poste", "sudo postconf -e 'mynetworks = 127.0.0.0/8 10.0.70.0/24'; sudo postfix reload", "sudo chown -R $(whoami) /var/mail/$(whoami)", "exit",
		"ssh greniers", "sudo sed -i 's/no_root_squash/root_squash/' /etc/exports; sudo exportfs -ra", "exit"]);
	egal(jeu.lire("incidentsRestantsCh7().join(' ')"), "", "tous les incidents réparés");
	t(jeu, "chantier");
	fait(jeu, "p7_tempete", "la Tempête tenue");
	jouer(jeu, ["ssh noms", "sudo sed -i 's/2026101706/2026101707/' " + Z + "; sudo rndc reload", "exit"]);
	fait(jeu, "p7_maree", "le navire inscrit au phare");
	vrai(jeu, "!!state.ch7.maree && !!state.ch7.mareeEnAvance", "dix maisons et la Tempête tenue : la marée en avance");
	// Aron n'existe pas encore : le quai ne le connaît pas.
	var s = t(jeu, "ssh aron@quai");
	contient(s, "Permission denied", "Aron inconnu : refusé");
	contient(s, "getent passwd aron", "le refus dit où chercher");
	// Le compte seul : une porte sur six.
	jouer(jeu, ["ssh registre", "cd; printf 'dn: uid=aron,ou=people,dc=port-aube,dc=lan\\nobjectClass: inetOrgPerson\\nobjectClass: posixAccount\\nuid: aron\\ncn: Aron\\nsn: Aron\\nuidNumber: 10011\\ngidNumber: 10100\\nhomeDirectory: /home/aron\\nloginShell: /bin/bash\\nuserPassword: %s\\n\\ndn: cn=promo,ou=groups,dc=port-aube,dc=lan\\nchangetype: modify\\nadd: memberUid\\nmemberUid: aron\\n' \"$(slappasswd -s Premier-pas-sur-l-ile)\" > aron.ldif; ldapmodify -a -x -D cn=admin,dc=port-aube,dc=lan -W -f aron.ldif", "exit"]);
	s = t(jeu, "ssh aron@quai");
	contient(s, "Bienvenue, aron", "Aron entre sur le quai");
	contient(s, "✓ le Grand Registre", "porte du Registre : ouverte");
	contient(s, "✗ les Greniers", "porte des Greniers : fermée");
	contient(s, "✗ la Poste", "porte de la Poste : fermée");
	contient(s, "✗ la Halle", "porte de la Halle : fermée");
	contient(s, "✗ l'Arche", "porte de l'Arche : fermée");
	contient(s, "Il manque des portes", "Aron attend sur le quai");
	pasFait(jeu, "p7_premier_pas", "une porte sur six : pas de Premier Pas");
	// Une maison au mauvais propriétaire ne compte pas.
	jouer(jeu, ["ssh greniers", "sudo mkdir /srv/homes/aron", "exit"]);
	contient(t(jeu, "ssh aron@quai"), "elle appartient à quelqu'un d'autre", "une maison qui n'est pas à lui");
	jouer(jeu, ["ssh greniers", "sudo chown 10011:10100 /srv/homes/aron", "exit",
		"ssh poste", "echo 'Bienvenue' | mail -s 'Bienvenue' aron", "exit",
		"ssh halle", "sudo smbpasswd -a aron", "exit"]);
	s = t(jeu, "ssh aron@quai");
	contient(s, "✗ l'Arche", "la sauvegarde ne le contient pas encore");
	jouer(jeu, ["ssh greniers", "sudo systemctl start sauvegarde-borg", "exit"]);
	s = t(jeu, "ssh aron@quai");
	contient(s, "le sceau brille", "les six portes s'ouvrent");
	fait(jeu, "p7_premier_pas", "le Premier Pas");
	egal(jeu.lire("state.ch7.premierPas"), "aron", "le premier étudiant s'appelle aron");
	// Un mauvais mot de passe est refusé.
	var faux1 = jeu.taper("ssh aron@quai", "mauvais");
	contient(faux1, "Permission denied", "un mauvais mot de passe : refusé");
	// Le chantier au-dessus de 90 après la Marée.
	t(jeu, "chantier");
	fait(jeu, "p7_chantier_final", "le chantier au-dessus de 90 après la Marée");
	// Le rapport : trop tôt, sans le prénom, sans la note.
	jouer(jeu, ["mkdir -p ~/port-aube", "echo 'Les maisons, la tempete, la maree, le premier pas, ce qui reste.' > ~/port-aube/rapport.txt"]);
	var r = t(jeu, "cp ~/port-aube/rapport.txt ~/Cybersup/Embarcadere/PortAube/BoiteDeLaurent");
	contient(r, "Il manque", "rapport sans le prénom ni la note : Laurent les demande");
	contient(r, "aron", "Laurent demande le prénom du premier étudiant");
	pasFait(jeu, "p7_rapport", "rapport incomplet : refusé");
	jouer(jeu, ["echo 'Le premier pas : aron. Chantier : " + jeu.lire("state.ch7.scoreFinal") + " sur 100.' >> ~/port-aube/rapport.txt"]);
	t(jeu, "cp ~/port-aube/rapport.txt ~/Cybersup/Embarcadere/PortAube/BoiteDeLaurent");
	fait(jeu, "p7_rapport", "le rapport juste : contresigné");
	vrai(jeu, "state.has('victoireCh7')", "la victoire");
	// Ce que personne n'a écrit : le cliffhanger se constate.
	t(jeu, "ssh noms");
	contient(jeu.taper("dig @noms phare-noir.port-aube.lan +short"), "203.0.113.66", "dig : un nom que personne n'a écrit");
	egal(jeu.taper("grep -c phare-noir " + Z).trim(), "0", "... et qui n'est dans aucun fichier");
	contient(jeu.taper("dig @phare phare-noir.port-aube.lan +short"), "203.0.113.66", "le phare le sert aussi");
	t(jeu, "exit");
	t(jeu, "ssh registre");
	var ls = jeu.taper("ldapsearch -x -LLL '(uid=passager)'");
	contient(ls, "uid=passager", "ldapsearch : un passager de plus");
	contient(jeu.taper("sudo slapcat | grep -A16 'uid=passager' | grep createTimestamp"), "011200Z", "inscrit à 03:12, avant la cité");
	t(jeu, "exit");
	t(jeu, "ssh poste");
	var mq = jeu.taper("mailq");
	contient(mq, "empty", "mailq : la file est vide");
	contient(jeu.taper("doveadm fetch 'hdr.from hdr.subject' all"), "phare-noir", "et pourtant une lettre de plus, d'une plume grise");
	absent(jeu.taper("sudo grep -c PLUME /var/log/mail.log"), "1", "le journal de la Poste ne la connaît pas");
	t(jeu, "exit");
	contient(jeu.taper("cat Radio"), "ce n'est pas nous", "la radio de Grace : ce n'est pas nous");
})();

/* ================================================================== */
/* 7. L'identifiant du joueur sur l'île, la sauvegarde en cours de route */
/* ================================================================== */
(function(){
	var jeu = monde.nouveauMonde({});
	jeu.lire("adopterPrenom('Ada')");
	jeu.taper("chapitre 7", "oui");
	jeu.lire("ORDRE_DES_SORTS_8.forEach(function(s){ state.spells[s] = true; })");
	jeu.taper("ssh poste");
	verifier(jeu.taper("grep -c '^ada:' /etc/passwd").trim() === "1", "poste : le compte du joueur porte son identifiant (ada)");
	verifier(jeu.taper("grep -c apprenti /etc/passwd /etc/group /etc/aliases").indexOf(":1") === -1, "poste : plus aucune trace de l'identifiant provisoire");
	contient(jeu.taper("mailq"), "ada@port-aube.lan", "la file de la Poste attend ada");
	jeu.taper("cd");
	egal(jeu.taper("pwd").trim(), "/home/ada", "cd sur poste : /home/ada");
	contient(jeu.taper("whoami"), "ada", "whoami sur poste");
	jeu.taper("exit");
	jeu.taper("ssh greniers");
	contient(jeu.taper("ls -ld /home/ada"), "ada", "greniers : /home/ada");
})();
(function(){
	var st = {};
	var jeu = neuf(st);
	pret(jeu);
	batir(jeu, "noms");
	batir(jeu, "registre");
	var heure = jeu.lire("state.ch7.horloge");
	jeu.lire("state.save()");
	var jeu2 = monde.nouveauMonde(st);
	vrai(jeu2, "state.has('ch7Ouvert')", "rechargement : Port-Aube toujours ouverte");
	fait(jeu2, "p7_zone", "rechargement : la Maison des Noms garde ses étapes");
	fait(jeu2, "p7_annuaire", "rechargement : le Registre aussi");
	egal(jeu2.lire("state.ch7.horloge"), heure, "rechargement : l'horloge reprend où elle était");
	jeu2.taper("ssh noms");
	contient(jeu2.taper("dig @noms bibliotheque.port-aube.lan +short"), "10.0.70.73", "rechargement : noms sert toujours la zone");
	jeu2.taper("exit");
	jeu2.taper("ssh registre");
	contient(jeu2.taper("ldapsearch -x -LLL '(uid=noam)' uidNumber"), "10005", "rechargement : le Registre garde ses entrées");
	vrai(jeu2, "maisonBatieCh7('noms') && maisonBatieCh7('registre')", "rechargement : les maisons restent bâties");
})();

/* ================================================================== */
/* 8. Les quêtes annexes : mécanisme, ordre, hors note, nouveautés      */
/* ================================================================== */
(function(){
	var jeu = surIle();
	contient(jeu.taper("quetes annexes"), "QUÊTES ANNEXES", "quetes annexes : le tableau");
	egal(jeu.lire("QUETES_ANNEXES.filter(function(a){ return a.chapitre === 8; }).length"), 6, "six quêtes annexes à Port-Aube");
	t(jeu, "cat Ilyes");
	vrai(jeu, "state.annexes.a7_imprimerie.proposee === true", "lire Ilyès ouvre son annexe");
	var xp8 = jeu.lire("state.xp8");
	t(jeu, "ssh imprimerie");
	// Les étapes se font dans l'ordre : cancel avant lpstat -t ne compte pas.
	t(jeu, "cancel 1");
	egal(jeu.lire("JSON.stringify((state.annexes.a7_imprimerie || {}).etapes || [])").indexOf("true"), -1, "cancel avant lpstat -t : aucune étape cochée");
	jouer(jeu, ["lpstat -t", "lpadmin -p gazette -v ipp://presse.port-aube.lan/ipp/print -m everywhere; lpadmin -d gazette", "lp -d gazette /srv/gazette/gazette-du-port.txt"]);
	pasFait(jeu, "a7_imprimerie", "une file en pause : la gazette ne sort pas");
	jouer(jeu, ["cupsenable gazette; cupsaccept gazette; lp -d gazette /srv/gazette/gazette-du-port.txt"]);
	fait(jeu, "a7_imprimerie", "Ilyès : la gazette imprimée");
	egal(jeu.lire("state.xp8"), xp8, "une annexe ne change pas l'XP du chapitre");
	verifier(jeu.lire("state.xpAnnexes") > 0, "une annexe donne un bonus à part");
	t(jeu, "exit");
	vrai(jeu, "Home.getChildFromName('Souvenirs') !== -1", "un souvenir dans ~/Souvenirs");
	// Le pont sous la mer : une clé privée lisible par tous ne compte pas.
	jouer(jeu, ["cat PhareRelais/Sara", "ssh phare", "wg genkey | sudo tee /etc/wireguard/privatekey | wg pubkey | sudo tee /etc/wireguard/publickey; sudo chmod 644 /etc/wireguard/privatekey"]);
	faux(jeu, "clesPhareCh7()", "une clé privée lisible par tous : refusée");
	t(jeu, "sudo chmod 600 /etc/wireguard/privatekey");
	vrai(jeu, "clesPhareCh7()", "la clé privée en 600 : acceptée");
	t(jeu, "exit");
	// Le miroir : un module qui publie toute la bibliothèque (brouillons compris) est refusé.
	jouer(jeu, ["cat GrandRegistre/Rayan", "ssh bibliotheque", "printf '[archives]\\n\\tpath = /srv/bibliotheque\\n\\tread only = yes\\n\\thosts allow = 10.0.70.0/24\\n' | sudo tee /etc/rsyncd.conf"]);
	faux(jeu, "moduleArchivesCh7()", "un module qui expose les brouillons : refusé");
	jouer(jeu, ["printf '[archives]\\n\\tpath = /srv/bibliotheque/archives\\n\\tread only = no\\n\\thosts allow = 10.0.70.0/24\\n' | sudo tee /etc/rsyncd.conf"]);
	faux(jeu, "moduleArchivesCh7()", "un module où l'on peut écrire : refusé");
	jouer(jeu, ["printf '[archives]\\n\\tpath = /srv/bibliotheque/archives\\n\\tread only = yes\\n\\thosts allow = *\\n' | sudo tee /etc/rsyncd.conf"]);
	faux(jeu, "moduleArchivesCh7()", "un module ouvert au continent : refusé");
	t(jeu, "exit");
	// Le dépôt des devoirs : une prison qui appartient à depot est refusée par sshd.
	jouer(jeu, ["cat PortesDeLaCite/Fama", "ssh halle", "sudo groupadd devoirs; sudo usermod -aG devoirs depot; sudo mkdir -p /srv/devoirs/rendus; sudo chown -R depot /srv/devoirs"]);
	faux(jeu, "chrootDevoirsCh7()", "une prison qui appartient à depot : refusée");
	t(jeu, "exit");
	// La règle des annexes : aucune notion déjà enseignée aux chapitres 1 à 7.
	var deja = jeu.lire("tousLesSorts().filter(function(s){ return !SORTS_DES_ANNEXES[s]; })");
	Object.keys(jeu.lire("SORTS_DES_ANNEXES")).forEach(function(s){ verifier(deja.indexOf(s) === -1, "annexe : " + s + " n'est enseigné dans aucun chapitre"); });
	egal(jeu.lire("Object.keys(SORTS_DES_ANNEXES).filter(function(s){ return ORDRE_DES_SORTS_8.indexOf(s) > -1; }).length"), 0, "les sorts des annexes ne sont pas dans le barème du chapitre");
	["lpadmin", "lpstat", "lp", "cancel", "cupsenable", "sievec", "avahi-browse", "avahi-resolve", "avahi-publish", "wg", "wg-quick", "sftp"].forEach(function(s){
		vrai(jeu, "!!SORTS_DES_ANNEXES[" + JSON.stringify(s) + "] && !!MANUEL[" + JSON.stringify(s) + "] && !!MANUEL[" + JSON.stringify(s) + "].horsBareme", "annexe : " + s + " est un sort d'annexe, avec sa page, hors barème");
	});
})();

/* ================================================================== */
/* 9. La partie complète : la solution documentée, à 20 sur 20           */
/* ================================================================== */
(function(){
	var debut = DOC.indexOf("## Chapitre 7 : Port-Aube"), fin = DOC.indexOf("## L'épreuve finale");
	verifier(debut > -1 && fin > debut, "docs/solution.md : la section du chapitre 7 avant l'épreuve finale");
	var section = DOC.substring(debut, fin);
	for (var n = 62; n <= 73; n++) verifier(new RegExp("^### " + n + "\\. ", "m").test(section), "docs/solution.md : la partie " + n);
	verifier(section.indexOf("—") === -1, "docs/solution.md (chapitre 7) : pas de tiret cadratin");
	verifier(section.indexOf(" & ") === -1, "docs/solution.md (chapitre 7) : pas d'esperluette");
	var commandes = [];
	for (var p = 62; p <= 73; p++) commandes = commandes.concat(partie(p));
	verifier(commandes.length > 150, "la solution du chapitre 7 compte " + commandes.length + " commandes");
	verifier(commandes.every(function(c){ return !/^\$ |^# /.test(c); }), "solution rejouable : ni $ ni # en tête de ligne");
	var jeu = neuf();
	var bati = null, sorties = [];
	commandes.forEach(function(c){
		sorties.push(t(jeu, c));
		if (bati === null && jeu.lire("maisonsBatiesCh7().length") === 10) bati = jeu.lire("state.ch7.horloge");
	});
	verifier(bati !== null && bati < 420, "partie complète : les dix maisons bâties avant 14 h (" + bati + " min après 7 h)");
	egal(jeu.lire("QUETES_CH7.filter(function(q){ return !state.quests[q.id]; }).map(function(q){ return q.id; }).join(' ')"), "", "partie complète : toutes les étapes");
	egal(jeu.lire("QUETES_SECONDAIRES_CH7.filter(function(q){ return !state.quests[q.id]; }).map(function(q){ return q.id; }).join(' ')"), "", "partie complète : tous les défis");
	egal(jeu.lire("state.xp8"), 6120, "partie complète : 6120 XP");
	egal(jeu.lire("state.noteTexte(8)"), "20 / 20", "partie complète : 20 sur 20");
	egal(jeu.lire("state.malus8"), 0, "partie complète : aucun indice acheté");
	vrai(jeu, "state.has('platine_ch7')", "partie complète : le platine");
	vrai(jeu, "state.has('victoireCh7')", "partie complète : la victoire");
	fait(jeu, "s_p7_avant_tempete", "partie complète : les dix maisons avant 14 h");
	vrai(jeu, "!!state.ch7.tempeteEnAvance", "partie complète : la Tempête tombe en avance (six maisons debout)");
	vrai(jeu, "!!state.ch7.mareeEnAvance", "partie complète : la marée monte en avance (tout bâti, la Tempête tenue)");
	egal(jeu.lire("state.ch7.scoreDepart"), 10, "partie complète : note de départ 10");
	egal(jeu.lire("state.ch7.scoreFinal"), 100, "partie complète : note finale 100");
	egal(jeu.lire("state.ch7.premierPas"), "aron", "partie complète : Aron est le premier étudiant");
	verifier(sorties.some(function(s){ return /Maison bâtie/.test(s); }), "partie complète : les maisons bâties sont annoncées");
	verifier(sorties.some(function(s){ return /Tempête arrive en avance/.test(s); }), "partie complète : la Tempête en avance est annoncée");
	verifier(sorties.some(function(s){ return /Port-Aube a un Architecte/.test(s); }), "partie complète : Laurent contresigne");
	verifier(sorties.some(function(s){ return /À suivre/.test(s); }), "partie complète : « À suivre. »");
	jeu.lire("QUETES_ANNEXES").filter(function(a){ return a.chapitre === 8; }).forEach(function(a){ fait(jeu, a.id, "partie complète : annexe " + a.id); });
	vrai(jeu, "state.has('ami_ch7')", "partie complète : Ami de Port-Aube");
	egal(jeu.lire("state.xp8"), 6120, "les annexes ne changent pas l'XP du chapitre");
	verifier(jeu.lire("state.xpAnnexes") >= 300, "les annexes donnent leur bonus (" + jeu.lire("state.xpAnnexes") + ")");
	egal(jeu.lire("Home.getChildFromName('Souvenirs').items.length"), 6, "six souvenirs");
	var pl = jeu.taper("chantier");
	contient(pl, "100 / 100", "chantier : la cité au complet");
	contient(pl, "aron est entré", "chantier : le Premier Pas");
	contient(jeu.taper("xp"), "20 / 20", "xp : 20 sur 20");
	contient(jeu.taper("badges port-aube"), "Ami de Port-Aube", "badges port-aube : Ami de Port-Aube");
	var cert = jeu.taper("cat ~/CertificatPortAube");
	contient(cert, "20", "le certificat porte la note");
	contient(cert, "CHAPITRE 7", "le certificat nomme le chapitre 7");
	contient(cert, "aron", "le certificat nomme le premier étudiant");
	var code = jeu.lire("state.codeDuCertificat8()");
	verifier(typeof code === "string" && code.length > 8, "le certificat a un code de vérification");
	contient(jeu.taper("verifier " + code), "Port-Aube", "verifier CODE : le certificat de Port-Aube");
	Object.keys(jeu.lire("MAITRES_ILE")).forEach(function(k){
		var m = jeu.lire("MAITRES_ILE[" + JSON.stringify(k) + "].nom"), lieu = jeu.lire("Shell.cheminAffiche(maisonCh7(" + JSON.stringify(k) + ").lieu)");
		var tx = jeu.taper("cat " + lieu + "/" + m);
		egal((tx.match(/\[x\]/g) || []).length, 5, m + " coche ses cinq défis à la fin");
	});
	egal(jeu.lire("state.queteEnCours()"), null, "départ direct terminé : queteEnCours vaut null");
})();

/* Le quiz, la scène et la cinématique du chapitre (Guide.js, navigateur). */
(function(){
	var guide = fs.readFileSync(path.join(JS, "Guide.js"), "utf8");
	var bloc = guide.substring(guide.indexOf("var QUIZ = {"), guide.indexOf("var banque"));
	var i = bloc.search(/\n\t8: \[/);
	verifier(i > -1, "Guide.js : le quiz du chapitre 7 (QUIZ[8])");
	egal((bloc.substring(i + 3).split(/\n\t\d: \[/)[0].match(/\n\t\t\["/g) || []).length, 10, "dix questions au quiz du chapitre 7");
	verifier(/"7"\s*:\s*8/.test(guide), "Guide.js : quiz 7 mène au chapitre interne 8");
	verifier(guide.indexOf("p7_quai") > -1 && guide.indexOf("cine7_phare_orage.gif") > -1, "Guide.js : la scène et la cinématique de Port-Aube");
	var cine = guide.substring(guide.indexOf("var CINEMATIQUES"), guide.indexOf("function lancerCinematique"));
	var i7 = cine.search(/\n\t7: \{/);
	verifier(i7 > -1, "Guide.js : la cinématique du chapitre 7 (CINEMATIQUES[7])");
	verifier((cine.substring(i7).match(/cine7_\w+\.gif/g) || []).length >= 4, "la cinématique du chapitre 7 a au moins quatre plans illustrés");
})();

console.log((ok + ko) + " vérifications, " + ko + " échec" + (ko > 1 ? "s" : ""));
process.exit(ko ? 1 : 0);
