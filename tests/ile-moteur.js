/**
 * Le moteur des services de l'île (SortsIle*.js), commande par commande, sur les vraies machines de Port-Aube :
 * BIND (named-checkzone, named-checkconf, rndc, dig, AXFR, NOTIFY, nsupdate et TSIG, freeze et thaw), Postfix
 * (postconf, postfix check et reload, la file, postcat, postsuper, sendmail, mail.log), Dovecot (doveconf, doveadm),
 * DKIM, NFS (exportfs, showmount, mount, root_squash, umount), autofs, Samba (testparm, smbpasswd, pdbedit, smbclient),
 * LDAP (slappasswd, cn=config par ldapi, ldapadd et ses erreurs, ldapsearch et ses filtres, ldapwhoami, ldappasswd,
 * ldapdelete, slapcat, StartTLS), sssd (fichier en 600, nsswitch, getent, id, le cache), l'autorité interne (openssl
 * genrsa, req, x509 -req, verify, s_client, update-ca-certificates), borg (init, create par le service, list, info,
 * check, prune, extract, une clé enfermée par command= et restrict), et les services des annexes (CUPS, Sieve, avahi,
 * WireGuard, le démon rsync, sftp enfermé). Chaque sort lit l'état au moment où on le lance et le change comme le vrai.
 *
 * Lancer : node tests/ile-moteur.js
 */
var monde = require("./monde.js");
var ok = 0, ko = 0;
function verifier(c, m){ if (c) ok++; else { ko++; console.log("ÉCHEC : " + m); } }
function contient(t, m, msg){ verifier(String(t).indexOf(m) > -1, (msg || "") + " : « " + m + " » absent de\n" + String(t).substring(0, 1200)); }
function absent(t, m, msg){ verifier(String(t).indexOf(m) === -1, (msg || "") + " : « " + m + " » ne devait pas apparaître dans\n" + String(t).substring(0, 1200)); }
function egal(a, b, m){ verifier(a === b, m + " : attendu " + JSON.stringify(b) + ", obtenu " + JSON.stringify(a)); }

/* Une île neuve, tous les sorts du chapitre connus, la partie lancée. */
function ile(){
	var jeu = monde.nouveauMonde({});
	jeu.taper("chapitre 7", "oui");
	jeu.lire("ORDRE_DES_SORTS_8.concat(Object.keys(SORTS_DES_ANNEXES)).forEach(function(s){ state.spells[s] = true; })");
	jeu.taper("cat Laurent"); jeu.taper("cat Mission"); jeu.taper("chantier");
	return jeu;
}
/* La sortie d'une commande, sans ce que le jeu ajoute (XP, quêtes, radio, badges). */
function net(s){ return String(s).split("\n").filter(function(l){ return !/^(\+\d+ XP|★|✦|✺|◆|◇|\(Radio|\(Nouveau message|Tu viens de|Un nouveau lieu)/.test(l); }).join("\n").trim(); }
function t(jeu, c, r){ return net(r === undefined ? jeu.jouerSolution(c) : jeu.taper(c, r)); }
function tous(jeu, l){ return l.map(function(c){ return t(jeu, c); }).join("\n"); }
var Z = "/etc/bind/zones/db.port-aube.lan";
var ZONE = "printf 'zone \"port-aube.lan\" {\\n\\ttype primary;\\n\\tfile \"" + Z + "\";\\n\\tallow-transfer { 10.0.70.54; };\\n\\talso-notify { 10.0.70.54; };\\n};\\n' | sudo tee -a /etc/bind/named.conf.local";

/* ================================================================== */
/* 1. BIND                                                             */
/* ================================================================== */
(function(){
	var jeu = ile();
	t(jeu, "ssh noms");
	var s = t(jeu, "sudo named-checkzone port-aube.lan " + Z);
	contient(s, "bad dotted quad", "named-checkzone : l'adresse impossible");
	contient(s, "CNAME and other data", "named-checkzone : un alias qui a aussi une adresse");
	contient(s, "not loaded due to errors", "named-checkzone : la zone refusée");
	contient(t(jeu, "named-checkzone port-aube.lan /etc/bind/inexistant"), "file not found", "named-checkzone : un fichier absent");
	contient(t(jeu, "dig @noms poste.port-aube.lan"), "REFUSED", "une zone non déclarée : noms ne fait pas autorité (REFUSED)");
	tous(jeu, ["sudo sed -i 's/10.0.70.380/10.0.70.38/; /^imap\\t\\tIN\\tA/d' " + Z, ZONE]);
	contient(t(jeu, "sudo named-checkzone port-aube.lan " + Z), "OK", "named-checkzone : la zone corrigée");
	egal(t(jeu, "sudo named-checkconf").trim().split("\n")[0].indexOf("error"), -1, "named-checkconf : rien à redire");
	contient(t(jeu, "sudo named-checkconf -z"), "zone port-aube.lan/IN: loaded serial 2026101701", "named-checkconf -z : charge les zones");
	egal(t(jeu, "dig @noms poste.port-aube.lan +short").trim(), "", "avant rndc reload : named ne sert pas encore la zone");
	contient(t(jeu, "sudo rndc reload"), "server reload successful", "rndc reload");
	egal(t(jeu, "dig @noms poste.port-aube.lan +short").trim(), "10.0.70.25", "dig +short : une adresse");
	var d = t(jeu, "dig @noms imap.port-aube.lan");
	contient(d, "CNAME", "dig : l'alias imap");
	contient(d, "10.0.70.25", "dig : l'alias suivi jusqu'à l'adresse");
	contient(d, "flags: qr aa", "dig : une réponse qui fait autorité (aa)");
	contient(t(jeu, "dig @noms port-aube.lan MX +short"), "10 poste.port-aube.lan.", "dig MX");
	contient(t(jeu, "dig @noms nulle-part.port-aube.lan"), "NXDOMAIN", "dig : un nom inconnu, NXDOMAIN");
	contient(t(jeu, "dig @noms port-aube.lan NS +short"), "phare.port-aube.lan.", "dig NS");
	contient(t(jeu, "sudo rndc status"), "server is up and running", "rndc status");
	contient(t(jeu, "dig @noms port-aube.lan AXFR"), "Transfer failed", "AXFR depuis noms : refusé (allow-transfer)");
	// Une erreur de syntaxe dans named.conf.local : named-checkconf la dit, et rndc reload échoue.
	t(jeu, "echo 'zone \"x.lan\" { type primary }' | sudo tee -a /etc/bind/named.conf.local");
	contient(t(jeu, "sudo named-checkconf"), "missing ';'", "named-checkconf : une faute de syntaxe");
	contient(t(jeu, "sudo rndc reload"), "failed", "rndc reload sur une configuration fausse : échec");
	t(jeu, "sudo sed -i '$d' /etc/bind/named.conf.local");
	contient(t(jeu, "sudo rndc reload"), "successful", "la faute retirée : rndc reload repart");
	// Le secondaire : copie, série, NOTIFY.
	tous(jeu, ["exit", "ssh phare", "printf 'zone \"port-aube.lan\" {\\n\\ttype secondary;\\n\\tprimaries { 10.0.70.53; };\\n\\tfile \"/var/cache/bind/db.port-aube.lan\";\\n};\\n' | sudo tee -a /etc/bind/named.conf.local", "sudo rndc reload"]);
	contient(t(jeu, "dig @phare port-aube.lan SOA +short"), "2026101701", "le secondaire : la même série");
	contient(t(jeu, "sudo rndc zonestatus port-aube.lan"), "type: secondary", "rndc zonestatus sur le phare");
	contient(t(jeu, "dig @noms port-aube.lan AXFR"), "IN\tSOA", "AXFR depuis le phare : permis");
	contient(t(jeu, "ls /var/cache/bind"), "db.port-aube.lan", "le secondaire écrit sa copie sur son disque");
	tous(jeu, ["exit", "ssh noms", "echo 'vigie IN A 10.0.70.61' | sudo tee -a " + Z, "sudo rndc reload"]);
	egal(t(jeu, "dig @phare vigie.port-aube.lan +short").trim(), "", "un ajout sans monter la série : le phare ne le voit jamais");
	tous(jeu, ["sudo sed -i 's/2026101701/2026101702/' " + Z, "sudo rndc reload"]);
	egal(t(jeu, "dig @phare vigie.port-aube.lan +short").trim(), "10.0.70.61", "la série montée : NOTIFY, et le phare se met à jour");
	contient(t(jeu, "sudo journalctl -u named | tail -20"), "sending notifies", "le journal de named dit le NOTIFY");
	// nsupdate et TSIG.
	contient(t(jeu, "tsig-keygen cle-test"), "hmac-sha256", "tsig-keygen : une clé hmac-sha256");
	tous(jeu, ["tsig-keygen cle-phare | sudo tee /etc/bind/cle-phare.key",
		"printf '$TTL\\t3600\\n@\\tIN\\tSOA\\tnoms.port-aube.lan. hostmaster.port-aube.lan. (\\n\\t1 3600 900 604800 300 )\\n@\\tIN\\tNS\\tnoms.port-aube.lan.\\n25\\tIN\\tPTR\\tposte.port-aube.lan.\\n' | sudo tee /var/lib/bind/db.10.0.70",
		"printf 'include \"/etc/bind/cle-phare.key\";\\nzone \"70.0.10.in-addr.arpa\" {\\n\\ttype primary;\\n\\tfile \"/var/lib/bind/db.10.0.70\";\\n\\tallow-update { key cle-phare; };\\n};\\n' | sudo tee -a /etc/bind/named.conf.local", "sudo rndc reload"]);
	contient(t(jeu, "dig -x 10.0.70.25 @noms +short"), "poste.port-aube.lan.", "dig -x : une zone inverse");
	t(jeu, "sudo chmod 640 /etc/bind/cle-phare.key");
	contient(t(jeu, "printf 'server 10.0.70.53\\nzone 70.0.10.in-addr.arpa\\nupdate add 60.70.0.10.in-addr.arpa. 3600 IN PTR capitainerie.port-aube.lan.\\nsend\\n' | nsupdate -k /etc/bind/cle-phare.key"), "could not read key", "nsupdate sans droit de lire la clé : refusé");
	t(jeu, "printf 'server 10.0.70.53\\nzone 70.0.10.in-addr.arpa\\nupdate add 60.70.0.10.in-addr.arpa. 3600 IN PTR capitainerie.port-aube.lan.\\nsend\\n' | sudo nsupdate -k /etc/bind/cle-phare.key");
	contient(t(jeu, "dig -x 10.0.70.60 @noms +short"), "capitainerie.port-aube.lan.", "nsupdate add : le PTR servi à chaud");
	contient(t(jeu, "dig @noms 70.0.10.in-addr.arpa SOA +short"), " 2 ", "nsupdate fait monter la série de la zone");
	contient(t(jeu, "printf 'server 10.0.70.53\\nzone port-aube.lan\\nupdate add x.port-aube.lan. 60 IN A 10.0.70.99\\nsend\\n' | sudo nsupdate -k /etc/bind/cle-phare.key"), "REFUSED", "nsupdate sur une zone sans allow-update : REFUSED");
	t(jeu, "printf 'server 10.0.70.53\\nzone 70.0.10.in-addr.arpa\\nupdate delete 60.70.0.10.in-addr.arpa. PTR\\nsend\\n' | sudo nsupdate -k /etc/bind/cle-phare.key");
	egal(t(jeu, "dig -x 10.0.70.60 @noms +short").trim(), "", "nsupdate delete : le PTR retiré");
	contient(t(jeu, "sudo rndc freeze 70.0.10.in-addr.arpa"), "", "rndc freeze");
	contient(t(jeu, "printf 'server 10.0.70.53\\nzone 70.0.10.in-addr.arpa\\nupdate add 62.70.0.10.in-addr.arpa. 3600 IN PTR gel.port-aube.lan.\\nsend\\n' | sudo nsupdate -k /etc/bind/cle-phare.key"), "REFUSED", "une zone gelée refuse les ajouts");
	contient(t(jeu, "sudo rndc thaw 70.0.10.in-addr.arpa"), "thaw", "rndc thaw");
	contient(t(jeu, "sudo rndc freeze port-aube.lan"), "not dynamic", "rndc freeze d'une zone qui n'est pas dynamique");
	contient(t(jeu, "systemctl status named"), "active (running)", "systemctl status named");
	t(jeu, "sudo systemctl stop named");
	contient(t(jeu, "dig @noms poste.port-aube.lan +short"), "connection refused", "named arrêté : personne sur le port 53");
	t(jeu, "sudo systemctl start named");
	egal(t(jeu, "dig @noms poste.port-aube.lan +short").trim(), "10.0.70.25", "named relancé : il relit sa configuration");
	t(jeu, "exit");
})();

/* ================================================================== */
/* 2. Postfix et Dovecot                                               */
/* ================================================================== */
(function(){
	var jeu = ile();
	t(jeu, "ssh poste");
	var q = t(jeu, "mailq");
	contient(q, "Connection timed out", "mailq : la raison de l'attente");
	contient(q, "4 Requests", "mailq : quatre lettres en attente");
	contient(t(jeu, "sudo postqueue -p"), "Kbytes", "postqueue -p : la même file");
	var n = t(jeu, "postconf -n");
	contient(n, "overriding earlier entry", "postconf -n : le doublon");
	contient(n, "unused parameter: mydomian", "postconf -n : la coquille");
	contient(t(jeu, "postconf -h relayhost"), "\n[relais.ancien-campus.lan]:587", "postconf -h : la valeur seule (après les avertissements)");
	contient(t(jeu, "postconf -d mydestination"), "$myhostname, localhost.$mydomain, localhost", "postconf -d : la valeur par défaut");
	contient(t(jeu, "postconf -e 'relayhost ='"), "Permission denied", "postconf -e sans sudo : refusé");
	var id = t(jeu, "mailq | awk 'NR==2 {print $1}'").trim();
	verifier(/^[0-9A-F]{10}$/.test(id), "un numéro de lettre dans la file (" + id + ")");
	contient(t(jeu, "sudo postcat -q " + id), "MESSAGE CONTENTS", "postcat -q : la lettre en attente");
	contient(t(jeu, "postcat -q " + id), "Permission denied", "postcat sans sudo : refusé");
	t(jeu, "sudo postsuper -h " + id);
	contient(t(jeu, "mailq"), id + "!", "postsuper -h : la lettre retenue (!)");
	t(jeu, "sudo postsuper -H " + id);
	absent(t(jeu, "mailq"), id + "!", "postsuper -H : relâchée");
	tous(jeu, ["sudo sed -i '/^mydomian/d; $d' /etc/postfix/main.cf",
		"sudo postconf -e 'myhostname = poste.port-aube.lan' 'mydomain = port-aube.lan' 'mydestination = $myhostname, $mydomain, localhost' 'relayhost =' 'mynetworks = 127.0.0.0/8 10.0.70.0/24'"]);
	egal(t(jeu, "sudo postfix check").trim(), "", "postfix check : sans un mot");
	contient(t(jeu, "mailq"), "4 Requests", "main.cf changé mais pas rechargé : la file attend toujours");
	contient(t(jeu, "sudo postfix reload"), "refreshing", "postfix reload");
	t(jeu, "sudo postqueue -f");
	contient(t(jeu, "mailq"), "Mail queue is empty", "postqueue -f : la file part");
	contient(t(jeu, "sudo tail -20 /var/log/mail.log"), "status=sent (delivered to maildir)", "mail.log : livré dans un Maildir");
	contient(t(jeu, "ls /var/mail"), "", "les boîtes dans /var/mail");
	t(jeu, "echo 'Essai' | mail -s 'Essai' badis@port-aube.lan");
	contient(t(jeu, "sudo tail -3 /var/log/mail.log"), "to=<badis@port-aube.lan>", "mail : une lettre pour badis");
	t(jeu, "printf 'To: maeva@port-aube.lan\\nSubject: Par sendmail\\n\\nTexte\\n' | sendmail -t");
	contient(t(jeu, "sudo tail -3 /var/log/mail.log"), "to=<maeva@port-aube.lan>", "sendmail -t : les en-têtes disent le destinataire");
	t(jeu, "echo 'Loin' | mail -s 'Loin' quelqu-un@ailleurs.example");
	contient(t(jeu, "mailq"), "ailleurs.example", "une lettre pour un domaine injoignable reste en file");
	t(jeu, "sudo postsuper -d ALL");
	contient(t(jeu, "mailq"), "empty", "postsuper -d ALL : la file vidée");
	// Dovecot.
	contient(t(jeu, "doveconf mail_location"), "mbox:~/mail:INBOX=/var/mail/%u", "doveconf : la valeur d'un réglage");
	contient(t(jeu, "sudo doveconf -n"), "auth_mechanisms = plain", "doveconf -n : la configuration réelle, après les !include");
	contient(t(jeu, "doveadm user $(whoami)"), "home", "doveadm user");
	contient(t(jeu, "doveadm mailbox list"), "", "doveadm mailbox list (avant)");
	t(jeu, "sudo sed -i 's|^mail_location = .*|mail_location = maildir:/var/mail/%u|' /etc/dovecot/conf.d/10-mail.conf");
	contient(t(jeu, "doveconf mail_location"), "maildir:/var/mail/%u", "doveconf relit le fichier");
	t(jeu, "sudo systemctl reload dovecot");
	contient(t(jeu, "doveadm mailbox status messages INBOX"), "messages=4", "doveadm mailbox status : les quatre lettres du matin");
	contient(t(jeu, "doveadm fetch 'hdr.subject' all"), "Le registre", "doveadm fetch : les sujets");
	verifier(/[0-9a-f]{32} \d/.test(t(jeu, "doveadm search mailbox INBOX subject phare")), "doveadm search : une lettre trouvée");
	// DKIM.
	t(jeu, "sudo opendkim-genkey -s aube -d port-aube.lan -D /etc/opendkim/keys");
	contient(t(jeu, "sudo ls -l /etc/opendkim/keys"), "aube.private", "opendkim-genkey : la clé privée");
	contient(t(jeu, "sudo cat /etc/opendkim/keys/aube.txt"), "v=DKIM1", "opendkim-genkey : la ligne publique pour la zone");
	contient(t(jeu, "sudo ls -l /etc/opendkim/keys/aube.private"), "-rw-------", "la clé privée DKIM : lisible par son seul propriétaire");
	t(jeu, "exit");
})();

/* ================================================================== */
/* 3. NFS et autofs                                                    */
/* ================================================================== */
(function(){
	var jeu = ile();
	t(jeu, "ssh greniers");
	egal(t(jeu, "sudo exportfs -v").trim(), "", "exportfs -v : rien n'est publié au départ");
	t(jeu, "echo '/srv/homes 10.0.70.0/24(rw,sync,no_subtree_check)' | sudo tee -a /etc/exports");
	egal(t(jeu, "sudo exportfs -v").trim(), "", "écrit, mais pas relu : rien n'est publié");
	t(jeu, "sudo exportfs -ra");
	var v = t(jeu, "sudo exportfs -v");
	contient(v, "root_squash", "exportfs -v : root_squash est la valeur par défaut");
	contient(v, "10.0.70.0/24", "exportfs -v : le réseau");
	contient(t(jeu, "sudo exportfs -s"), "/srv/homes", "exportfs -s");
	t(jeu, "echo '/srv/homes (rw)' | sudo tee -a /etc/exports");
	contient(t(jeu, "sudo exportfs -ra"), "No host name given", "exportfs : une ligne sans client, l'avertissement");
	t(jeu, "sudo sed -i '$d' /etc/exports");
	t(jeu, "exit");
	t(jeu, "ssh quai");
	contient(t(jeu, "showmount -e greniers"), "/srv/homes 10.0.70.0/24", "showmount -e depuis le quai");
	contient(t(jeu, "mount -t nfs greniers:/srv/homes /mnt"), "root", "mount sans sudo : refusé");
	t(jeu, "sudo mount -t nfs greniers:/srv/homes /mnt");
	contient(t(jeu, "mount -t nfs4"), "greniers:/srv/homes on /mnt type nfs4", "mount -t nfs4 : le montage listé");
	contient(t(jeu, "ls -ln /mnt"), "10001", "ls -ln : des numéros (le quai ne connaît pas encore les noms)");
	contient(t(jeu, "sudo touch /mnt/x"), "root_squash", "root_squash : root devient nobody");
	contient(t(jeu, "cat /mnt/badis/LISEZMOI"), "Permission", "un dossier 750 d'un autre : refusé aussi par NFS");
	t(jeu, "sudo umount /mnt");
	absent(t(jeu, "ls /mnt"), "badis", "umount : /mnt vide à nouveau");
	t(jeu, "exit");
	// Un client hors du réseau : la rive n'y a pas accès.
	t(jeu, "ssh rive");
	contient(t(jeu, "sudo mount -t nfs greniers:/srv/homes /mnt"), "helper program", "la rive n'a même pas le client NFS");
	t(jeu, "exit");
	// Les Greniers écrivent, le quai voit ; le quai (en tant que joueur) écrit dans un dossier ouvert, les Greniers voient.
	tous(jeu, ["ssh greniers", "sudo mkdir /srv/homes/partage", "sudo chmod 777 /srv/homes/partage", "exit", "ssh quai", "sudo mount -t nfs greniers:/srv/homes /mnt", "echo 'du quai' > /mnt/partage/note.txt", "exit", "ssh greniers"]);
	contient(t(jeu, "cat /srv/homes/partage/note.txt"), "du quai", "une écriture du quai arrive aux Greniers");
	tous(jeu, ["sudo sed -i 's/(rw,sync,no_subtree_check)/(ro,sync,no_subtree_check)/' /etc/exports", "sudo exportfs -ra", "exit", "ssh quai"]);
	contient(t(jeu, "echo 'encore' > /mnt/partage/note2.txt"), "Read-only file system", "exporté en lecture seule : le quai ne peut plus écrire");
	t(jeu, "sudo umount /mnt");
	// autofs.
	tous(jeu, ["echo '/home /etc/auto.home' | sudo tee /etc/auto.master.d/home.autofs", "echo '* greniers:/srv/homes/&' | sudo tee /etc/auto.home"]);
	egal(t(jeu, "ls /home").indexOf("badis"), -1, "autofs pas rechargé : /home ne connaît pas encore la carte");
	t(jeu, "sudo systemctl reload autofs");
	contient(t(jeu, "ls -ld /home/badis"), "/home/badis", "autofs : entrer dans /home/badis le monte");
	contient(t(jeu, "mount -t nfs4"), "greniers:/srv/homes/badis on /home/badis", "le montage automatique est listé");
	contient(t(jeu, "ls -d /home/inconnu"), "No such file", "une clé que les Greniers n'ont pas : rien à monter");
	contient(t(jeu, "sudo journalctl -u autofs | tail -5"), "inconnu", "le journal d'autofs dit la clé introuvable");
	t(jeu, "exit");
})();

/* ================================================================== */
/* 4. LDAP, sssd                                                       */
/* ================================================================== */
(function(){
	var jeu = ile();
	t(jeu, "ssh registre");
	contient(t(jeu, "ldapsearch -LLL -b dc=port-aube,dc=lan"), "SASL", "ldapsearch sans -x : il tente SASL");
	contient(t(jeu, "ldapsearch -x -LLL -b dc=port-aube,dc=lan"), "dn: dc=port-aube,dc=lan", "ldapsearch -x : la racine seule");
	egal(t(jeu, "ldapwhoami -x").trim(), "anonymous", "ldapwhoami -x : anonyme");
	contient(t(jeu, "ldapsearch -Y EXTERNAL -H ldapi:/// -b cn=config olcRootDN"), "Insufficient access", "cn=config sans sudo : refusé");
	contient(t(jeu, "sudo ldapsearch -Y EXTERNAL -H ldapi:/// -b cn=config '(olcRootPW=*)' olcRootPW"), "olcRootPW: {SSHA}", "cn=config : le vieux sceau, haché");
	var h = t(jeu, "slappasswd -s essai").trim();
	verifier(/^\{SSHA\}[A-Za-z0-9+\/=]{32}$/.test(h), "slappasswd -s : un hachage SSHA (" + h + ")");
	verifier(t(jeu, "slappasswd -s essai").trim() !== h, "slappasswd : un sel neuf à chaque fois");
	contient(t(jeu, "cd; printf 'dn: ou=people,dc=port-aube,dc=lan\\nobjectClass: organizationalUnit\\nou: people\\n' > p.ldif; ldapadd -x -D cn=admin,dc=port-aube,dc=lan -W -f p.ldif", "nimporte"), "Invalid credentials", "ldapadd avec un mauvais sceau : refusé");
	t(jeu, "cd; printf 'dn: olcDatabase={1}mdb,cn=config\\nchangetype: modify\\nreplace: olcRootPW\\nolcRootPW: %s\\n' \"$(slappasswd -s Sceau-de-Port-Aube)\" > r.ldif; sudo ldapmodify -Y EXTERNAL -H ldapi:/// -f r.ldif");
	contient(t(jeu, "ldapadd -x -D cn=admin,dc=port-aube,dc=lan -W -f p.ldif", "Sceau-de-Port-Aube"), "adding new entry \"ou=people", "le sceau reforgé : ldapadd passe");
	contient(t(jeu, "ldapadd -x -D cn=admin,dc=port-aube,dc=lan -W -f p.ldif", "Sceau-de-Port-Aube"), "Already exists (68)", "une entrée en double : Already exists");
	contient(t(jeu, "printf 'dn: uid=x,ou=nulle,dc=port-aube,dc=lan\\nobjectClass: account\\nuid: x\\n' > n.ldif; ldapadd -x -D cn=admin,dc=port-aube,dc=lan -W -f n.ldif", "Sceau-de-Port-Aube"), "No such object (32)", "une branche qui n'existe pas : No such object");
	contient(t(jeu, "printf 'dn: uid=y,ou=people,dc=port-aube,dc=lan\\nobjectClass: posixAccount\\nuid: y\\n' > y.ldif; ldapadd -x -D cn=admin,dc=port-aube,dc=lan -W -f y.ldif", "Sceau-de-Port-Aube"), "Object class violation", "une classe sans ses attributs obligatoires : refusée");
	t(jeu, "printf 'dn: uid=ilyes,ou=people,dc=port-aube,dc=lan\\nobjectClass: inetOrgPerson\\nobjectClass: posixAccount\\nuid: ilyes\\ncn: Ilyes\\nsn: Ilyes\\nuidNumber: 10050\\ngidNumber: 10100\\nhomeDirectory: /home/ilyes\\n' > i.ldif; ldapadd -x -D cn=admin,dc=port-aube,dc=lan -W -f i.ldif", "Sceau-de-Port-Aube");
	contient(t(jeu, "ldapsearch -x -LLL '(uid=ilyes)' uidNumber"), "uidNumber: 10050", "ldapsearch : un attribut choisi");
	contient(t(jeu, "ldapsearch -x -LLL '(&(objectClass=posixAccount)(uidNumber>=10000))' uid"), "uid: ilyes", "un filtre à deux conditions");
	egal(t(jeu, "ldapsearch -x -LLL '(&(objectClass=posixAccount)(uidNumber>=20000))' uid").trim(), "", "un filtre qui ne trouve rien");
	contient(t(jeu, "ldapsearch -x -LLL '(|(uid=ilyes)(uid=personne))' dn"), "uid=ilyes", "un filtre OU");
	contient(t(jeu, "ldapsearch -x -LLL '(uid=ily*)' dn"), "uid=ilyes", "un filtre avec joker");
	t(jeu, "ldappasswd -x -D cn=admin,dc=port-aube,dc=lan -W -S uid=ilyes,ou=people,dc=port-aube,dc=lan", ["Gazette-1", "Gazette-1", "Sceau-de-Port-Aube"]);
	contient(t(jeu, "ldapwhoami -x -D uid=ilyes,ou=people,dc=port-aube,dc=lan -W", "Gazette-1"), "dn:uid=ilyes", "ldappasswd -S : Ilyès se connecte avec son mot de passe");
	contient(t(jeu, "ldapsearch -x -LLL '(uid=ilyes)' userPassword"), "", "userPassword n'est pas lisible par un anonyme");
	absent(t(jeu, "ldapsearch -x -LLL '(uid=ilyes)' userPassword"), "SSHA", "un anonyme ne voit pas le mot de passe haché");
	t(jeu, "ldapdelete -x -D cn=admin,dc=port-aube,dc=lan -W uid=ilyes,ou=people,dc=port-aube,dc=lan", "Sceau-de-Port-Aube");
	egal(t(jeu, "ldapsearch -x -LLL '(uid=ilyes)'").trim(), "", "ldapdelete : l'entrée retirée");
	contient(t(jeu, "slapcat"), "Permission denied", "slapcat sans sudo : la base est à openldap");
	contient(t(jeu, "sudo slapcat"), "createTimestamp", "sudo slapcat : toute la base, avec ses horodatages");
	contient(t(jeu, "ldapsearch -x -ZZ -H ldap://registre.port-aube.lan -b dc=port-aube,dc=lan"), "unsupported extended operation", "StartTLS sans certificat sur slapd : refusé");
	t(jeu, "exit");
	// sssd sur le quai.
	t(jeu, "ssh quai");
	egal(t(jeu, "getent passwd badis").trim(), "", "le quai ne connaît personne au départ");
	t(jeu, "printf '[sssd]\\nservices = nss, pam\\ndomains = port-aube\\n\\n[domain/port-aube]\\nid_provider = ldap\\nauth_provider = ldap\\nldap_uri = ldap://registre.port-aube.lan\\nldap_search_base = dc=port-aube,dc=lan\\n' | sudo tee /etc/sssd/sssd.conf");
	contient(t(jeu, "sudo systemctl start sssd"), "failed", "sssd.conf lisible par d'autres : sssd refuse de démarrer");
	contient(t(jeu, "sudo journalctl -u sssd | tail -3"), "permission", "le journal de sssd dit pourquoi");
	tous(jeu, ["sudo chmod 600 /etc/sssd/sssd.conf", "sudo systemctl start sssd", "sudo sed -i 's/^\\(passwd\\|group\\):\\( *\\)files/&  sss/' /etc/nsswitch.conf"]);
	egal(t(jeu, "getent passwd badis").trim(), "", "Badis n'est pas encore dans le Registre");
	tous(jeu, ["exit", "ssh registre", "cd; printf 'dn: uid=badis,ou=people,dc=port-aube,dc=lan\\nobjectClass: inetOrgPerson\\nobjectClass: posixAccount\\nuid: badis\\ncn: Badis\\nsn: Badis\\nuidNumber: 10001\\ngidNumber: 10000\\nhomeDirectory: /home/badis\\nloginShell: /bin/bash\\n' > b.ldif; ldapadd -x -D cn=admin,dc=port-aube,dc=lan -W -f b.ldif", "exit", "ssh quai"]);
	t(jeu, "sudo sss_cache -E");
	contient(t(jeu, "getent passwd badis"), "badis:*:10001:10000:Badis:/home/badis:/bin/bash", "sss_cache -E : le Registre relu");
	contient(t(jeu, "id badis"), "uid=10001(badis)", "id badis");
	contient(t(jeu, "getent passwd 10001"), "badis", "getent par numéro");
	t(jeu, "sudo systemctl stop sssd");
	egal(t(jeu, "getent passwd badis").trim(), "", "sssd arrêté : plus personne");
	t(jeu, "exit");
})();

/* ================================================================== */
/* 5. Samba                                                            */
/* ================================================================== */
(function(){
	var jeu = ile();
	t(jeu, "ssh halle");
	contient(t(jeu, "testparm -s"), "[global]", "testparm -s : la configuration effective");
	absent(t(jeu, "testparm -s"), "[promo]", "le partage de la promo est encore en commentaire");
	t(jeu, "echo 'brouillon = oui' | sudo tee -a /etc/samba/smb.conf");
	contient(t(jeu, "testparm -s"), "Unknown parameter encountered: \"brouillon\"", "testparm : un paramètre inconnu");
	t(jeu, "sudo sed -i '$d' /etc/samba/smb.conf");
	contient(t(jeu, "smbclient -L halle -N"), "Sharename", "smbclient -L -N : la liste, anonyme");
	contient(t(jeu, "sudo smbpasswd -a fantome", ["x", "x"]), "Failed to add entry", "smbpasswd -a pour un compte Unix inexistant : refusé");
	t(jeu, "sudo smbpasswd -a depot", ["Depot-7", "Depot-7"]);
	contient(t(jeu, "sudo pdbedit -L"), "depot:1002", "pdbedit -L : le compte Samba");
	contient(t(jeu, "sudo pdbedit -L -v"), "Unix username:        depot", "pdbedit -L -v : le détail");
	contient(t(jeu, "smbclient -L halle -U depot", "mauvais"), "NT_STATUS_LOGON_FAILURE", "un mauvais mot de passe Samba");
	t(jeu, "sudo smbpasswd -d depot");
	contient(t(jeu, "smbclient -L halle -U depot", "Depot-7"), "NT_STATUS_ACCOUNT_DISABLED", "smbpasswd -d : le compte désactivé");
	t(jeu, "sudo smbpasswd -e depot");
	contient(t(jeu, "smbclient -L halle -U depot", "Depot-7"), "IPC$", "smbpasswd -e : réactivé");
	tous(jeu, ["sudo mkdir /srv/commun", "sudo chmod 777 /srv/commun", "printf '[commun]\\n   path = /srv/commun\\n   read only = no\\n   guest ok = yes\\n' | sudo tee -a /etc/samba/smb.conf", "sudo systemctl reload smbd", "cd; echo 'bonjour' > b.txt"]);
	contient(t(jeu, "smbclient //halle/commun -N -c 'put b.txt; ls'"), "b.txt", "un partage ouvert aux invités : un dépôt anonyme");
	contient(t(jeu, "ls -l /srv/commun"), "nobody", "un dépôt d'invité appartient à nobody");
	t(jeu, "sudo sed -i 's/guest ok = yes/guest ok = no/' /etc/samba/smb.conf");
	t(jeu, "sudo systemctl reload smbd");
	contient(t(jeu, "smbclient //halle/commun -N -c ls"), "ACCESS_DENIED", "guest ok = no, rechargé : l'invité est refusé");
	contient(t(jeu, "smbclient //halle/commun -U depot -c 'get b.txt /tmp/b2.txt'", "Depot-7"), "getting file", "smbclient get");
	contient(t(jeu, "cat /tmp/b2.txt"), "bonjour", "le fichier repris");
	t(jeu, "exit");
})();

/* ================================================================== */
/* 6. L'autorité interne et TLS                                        */
/* ================================================================== */
(function(){
	var jeu = ile();
	t(jeu, "ssh forge");
	contient(t(jeu, "openssl genrsa -out /srv/forge/x.key 2048"), "Permission", "écrire dans /srv/forge sans sudo : refusé (dossier 700 de root)");
	t(jeu, "sudo openssl genrsa -out /srv/forge/ca.key 4096");
	contient(t(jeu, "sudo ls -l /srv/forge/ca.key"), "-rw-------", "genrsa : une clé en 600");
	contient(t(jeu, "sudo openssl rsa -in /srv/forge/ca.key -check -noout"), "RSA key ok", "openssl rsa -check");
	contient(t(jeu, "sudo openssl req -x509 -new -key /srv/forge/ca.key -days 3650 -out /srv/forge/ca.crt"), "certificate request", "req -x509 sans -subj : il demande le sujet");
	t(jeu, "sudo openssl req -x509 -new -key /srv/forge/ca.key -days 3650 -subj '/CN=Autorite de test' -out /srv/forge/ca.crt");
	var x = t(jeu, "sudo openssl x509 -in /srv/forge/ca.crt -noout -text");
	contient(x, "CA:TRUE", "x509 -text : une autorité");
	contient(x, "Public-Key: (4096 bit)", "x509 -text : la taille de la clé de l'autorité");
	contient(t(jeu, "sudo openssl x509 -in /srv/forge/ca.crt -noout -subject -issuer"), "issuer=CN = Autorite de test", "autosigné : sujet et émetteur identiques");
	t(jeu, "sudo openssl genrsa -out /tmp/srv.key 2048; sudo openssl req -new -key /tmp/srv.key -subj '/CN=srv.port-aube.lan' -addext 'subjectAltName=DNS:srv.port-aube.lan' -out /tmp/srv.csr");
	contient(t(jeu, "openssl req -in /tmp/srv.csr -noout -subject"), "srv.port-aube.lan", "req -noout -subject : la demande");
	t(jeu, "sudo openssl x509 -req -in /tmp/srv.csr -CA /srv/forge/ca.crt -CAkey /srv/forge/ca.key -CAcreateserial -days 90 -copy_extensions copy -out /tmp/srv.crt");
	contient(t(jeu, "openssl x509 -in /tmp/srv.crt -noout -text"), "DNS:srv.port-aube.lan", "-copy_extensions : le nom alternatif gardé");
	contient(t(jeu, "sudo openssl verify -CAfile /srv/forge/ca.crt /tmp/srv.crt"), "/tmp/srv.crt: OK", "openssl verify -CAfile : la chaîne");
	contient(t(jeu, "openssl verify /tmp/srv.crt"), "unable to get local issuer certificate", "openssl verify sans l'autorité : inconnue");
	t(jeu, "sudo openssl genrsa -out /tmp/autre.key 2048");
	contient(t(jeu, "sudo openssl x509 -req -in /tmp/srv.csr -CA /srv/forge/ca.crt -CAkey /tmp/autre.key -out /tmp/x.crt"), "key values mismatch", "signer avec une clé qui n'est pas celle de l'autorité : refusé");
	var m1 = t(jeu, "sudo openssl x509 -noout -modulus -in /srv/forge/ca.crt"), m2 = t(jeu, "sudo openssl rsa -noout -modulus -in /srv/forge/ca.key"), m3 = t(jeu, "sudo openssl rsa -noout -modulus -in /tmp/autre.key");
	verifier(m1.trim() === m2.trim() && m1.trim() !== m3.trim(), "-modulus : la clé de l'autorité va avec son certificat, pas une autre");
	t(jeu, "exit");
	t(jeu, "ssh quai");
	contient(t(jeu, "openssl s_client -connect poste.port-aube.lan:993"), "self-signed certificate", "s_client : le sceau de pacotille de Dovecot");
	contient(t(jeu, "openssl s_client -connect poste.port-aube.lan:143 -starttls imap"), "Verify return code", "s_client -starttls imap");
	contient(t(jeu, "openssl s_client -connect poste.port-aube.lan:143"), "", "s_client sur 143 sans starttls");
	contient(t(jeu, "openssl s_client -connect noms.port-aube.lan:993"), "Connection refused", "s_client vers une machine sans IMAP : refusé");
	contient(t(jeu, "update-ca-certificates"), "Permission", "update-ca-certificates sans sudo : refusé");
	contient(t(jeu, "sudo update-ca-certificates"), "0 added, 0 removed", "update-ca-certificates sans rien de neuf");
	t(jeu, "exit");
})();

/* ================================================================== */
/* 7. borg et l'Arche                                                  */
/* ================================================================== */
(function(){
	var jeu = ile();
	t(jeu, "ssh greniers");
	contient(t(jeu, "sudo borg list borg@arche:/srv/borg/greniers"), "Permission denied (publickey)", "borg sans clé autorisée sur l'Arche : refusé");
	tous(jeu, ["sudo ssh-keygen -t ed25519 -f /root/.ssh/arche -N ''", "sudo cp /root/.ssh/arche.pub /tmp/", "scp /tmp/arche.pub arche:/tmp/", "exit", "ssh arche",
		"sed 's|^|command=\"borg serve --restrict-to-path /srv/borg/greniers\",restrict |' /tmp/arche.pub | sudo tee /home/borg/.ssh/authorized_keys", "exit", "ssh greniers"]);
	contient(t(jeu, "sudo borg init --rsh 'ssh -i /root/.ssh/arche' borg@arche:/srv/borg/greniers"), "-e/--encryption", "borg init sans -e : il faut choisir");
	t(jeu, "sudo borg init -e repokey --rsh 'ssh -i /root/.ssh/arche' borg@arche:/srv/borg/greniers", ["Une-phrase", "Une-phrase", "N"]);
	contient(t(jeu, "sudo borg init -e repokey --rsh 'ssh -i /root/.ssh/arche' borg@arche:/srv/borg/greniers", ["Une-phrase", "Une-phrase", "N"]), "already exists", "borg init deux fois : le dépôt existe");
	contient(t(jeu, "sudo borg init -e repokey --rsh 'ssh -i /root/.ssh/arche' borg@arche:/srv/borg/ailleurs", ["x", "x", "N"]), "", "un autre chemin avec la clé enfermée");
	verifier(jeu.lire("!etatBorgIle().depots['arche:/srv/borg/ailleurs']"), "la clé enfermée (--restrict-to-path) ne crée pas de dépôt ailleurs");
	contient(t(jeu, "sudo borg list --rsh 'ssh -i /root/.ssh/arche' borg@arche:/srv/borg/greniers", "fausse"), "is incorrect", "borg list avec une mauvaise phrase : refusé");
	t(jeu, "export BORG_PASSPHRASE=Une-phrase");
	t(jeu, "sudo borg create --rsh 'ssh -i /root/.ssh/arche' borg@arche:/srv/borg/greniers::essai-1 /srv/homes", "Une-phrase");
	contient(t(jeu, "sudo borg list --rsh 'ssh -i /root/.ssh/arche' borg@arche:/srv/borg/greniers", "Une-phrase"), "essai-1", "borg create puis list : l'archive");
	contient(t(jeu, "sudo borg list --rsh 'ssh -i /root/.ssh/arche' borg@arche:/srv/borg/greniers::essai-1", "Une-phrase"), "srv/homes/badis/LISEZMOI", "borg list ARCHIVE : le contenu");
	contient(t(jeu, "sudo borg info --rsh 'ssh -i /root/.ssh/arche' borg@arche:/srv/borg/greniers", "Une-phrase"), "Encrypted: Yes (repokey)", "borg info : chiffré");
	contient(t(jeu, "sudo borg check -v --rsh 'ssh -i /root/.ssh/arche' borg@arche:/srv/borg/greniers", "Une-phrase"), "no problems found", "borg check -v");
	t(jeu, "sudo borg create --rsh 'ssh -i /root/.ssh/arche' borg@arche:/srv/borg/greniers::essai-2 /srv/homes", "Une-phrase");
	contient(t(jeu, "sudo borg prune --list --dry-run --keep-last 1 --rsh 'ssh -i /root/.ssh/arche' borg@arche:/srv/borg/greniers", "Une-phrase"), "Pruning archive", "borg prune --dry-run : ce qui partirait");
	contient(t(jeu, "sudo borg list --rsh 'ssh -i /root/.ssh/arche' borg@arche:/srv/borg/greniers", "Une-phrase"), "essai-1", "--dry-run : rien n'est parti");
	tous(jeu, ["sudo rm /srv/homes/badis/LISEZMOI", "sudo mkdir /tmp/r", "cd /tmp/r"]);
	t(jeu, "sudo borg extract --rsh 'ssh -i /root/.ssh/arche' borg@arche:/srv/borg/greniers::essai-1 srv/homes/badis", "Une-phrase");
	contient(t(jeu, "sudo cat /tmp/r/srv/homes/badis/LISEZMOI"), "Badis", "borg extract : le fichier perdu revient");
	contient(t(jeu, "sudo ls -ln /tmp/r/srv/homes"), "10001", "borg extract en root : les propriétaires d'origine");
	// Le service oneshot : il lit la phrase dans /root/.borg-phrase.
	contient(t(jeu, "sudo systemctl start sauvegarde-borg"), "Job for sauvegarde-borg.service failed", "le service sans phrase : il échoue, systemctl le dit");
	contient(t(jeu, "sudo journalctl -u sauvegarde-borg | grep phrase"), "borg-phrase", "le journal du service dit la phrase manquante");
	tous(jeu, ["echo 'Une-phrase' | sudo tee /root/.borg-phrase", "sudo chmod 600 /root/.borg-phrase", "sudo systemctl start sauvegarde-borg"]);
	verifier(/^greniers-/.test(jeu.lire("derniereArchiveCh7().nom")), "le service a fait une archive ({hostname}-{now})");
	egal(jeu.lire("etatBorgIle().depots['arche:/srv/borg/greniers'].archives.length"), 1, "puis borg prune --keep-daily 7 : une archive par jour, les essais du jour partent");
	contient(t(jeu, "systemctl status sauvegarde-borg"), "inactive (dead)", "un service oneshot, fini : inactif");
	t(jeu, "printf '[Timer]\\nOnCalendar=*-*-* 02:30\\nPersistent=true\\n\\n[Install]\\nWantedBy=timers.target\\n' | sudo tee /etc/systemd/system/sauvegarde-borg.timer; sudo systemctl daemon-reload; sudo systemctl enable --now sauvegarde-borg.timer");
	contient(t(jeu, "systemctl list-timers"), "sauvegarde-borg.timer", "systemctl list-timers : la prochaine sauvegarde");
	t(jeu, "exit");
	// Sur l'Arche : le dépôt appartient à borg, chiffré.
	t(jeu, "ssh arche");
	contient(t(jeu, "sudo ls -l /srv/borg"), "borg", "le dépôt appartient au compte borg");
	t(jeu, "exit");
})();

/* ================================================================== */
/* 8. Les services des annexes                                         */
/* ================================================================== */
(function(){
	var jeu = ile();
	t(jeu, "ssh imprimerie");
	contient(t(jeu, "lpstat -t"), "brouillon-1", "lpstat -t : le travail fou");
	contient(t(jeu, "lpstat -p"), "disabled", "lpstat -p : la file en pause");
	t(jeu, "cancel 1");
	absent(t(jeu, "lpstat -o"), "brouillon-1", "cancel : le travail annulé");
	t(jeu, "lpadmin -p gazette -v ipp://presse.port-aube.lan/ipp/print -m everywhere");
	contient(t(jeu, "lpstat -v"), "device for gazette: ipp://presse.port-aube.lan/ipp/print", "lpadmin -p -v : l'imprimante réseau");
	contient(t(jeu, "lp -d gazette /srv/gazette/gazette-du-port.txt"), "not accepting", "une imprimante qui n'accepte pas encore");
	tous(jeu, ["cupsenable gazette", "cupsaccept gazette", "lpadmin -d gazette"]);
	contient(t(jeu, "lpstat -d"), "system default destination: gazette", "lpadmin -d : par défaut");
	contient(t(jeu, "lp /srv/gazette/gazette-du-port.txt"), "request id is gazette-", "lp sans -d : la destination par défaut");
	contient(t(jeu, "lpstat -W completed -o"), "gazette-", "lpstat -W completed : imprimé");
	t(jeu, "exit");
	// Sieve.
	t(jeu, "ssh poste");
	t(jeu, "printf 'require [\"fileinto\"];\\nif header :contains \"subject\" \"horaire\" {\\n  fileinto \"Horaires\"\\n}\\n' | sudo tee /home/capitaine/sieve/faux.sieve");
	contient(t(jeu, "sudo sievec /home/capitaine/sieve/faux.sieve"), "error", "sievec : un point-virgule manquant");
	t(jeu, "printf 'require [\"fileinto\"];\\nif header :contains \"subject\" \"horaire\" {\\n  fileinto \"Horaires\";\\n}\\n' | sudo tee /home/capitaine/sieve/tri.sieve");
	egal(t(jeu, "sudo sievec /home/capitaine/sieve/tri.sieve").trim(), "", "sievec : un filtre juste, sans un mot");
	t(jeu, "sudo doveadm sieve activate -u capitaine tri");
	contient(t(jeu, "sudo doveadm sieve list -u capitaine"), "tri ACTIVE", "doveadm sieve list : le filtre actif");
	t(jeu, "exit");
	// avahi.
	t(jeu, "ssh quai");
	contient(t(jeu, "avahi-browse -a -t"), "Presse de la gazette", "avahi-browse -a -t : ce qui s'annonce");
	contient(t(jeu, "avahi-resolve -n halle.local"), "10.0.70.45", "avahi-resolve -n");
	contient(t(jeu, "avahi-resolve -n inconnu.local"), "Failed to resolve", "avahi-resolve : un nom absent");
	t(jeu, "exit");
	// WireGuard : une clé publique dérivée de la privée.
	t(jeu, "ssh phare");
	var cle = t(jeu, "wg genkey").trim().split("\n").pop();
	verifier(/^[A-Za-z0-9+\/]{43}=$/.test(cle), "wg genkey : une clé de 44 caractères");
	var pub1 = t(jeu, "echo '" + cle + "' | wg pubkey").trim(), pub2 = t(jeu, "echo '" + cle + "' | wg pubkey").trim();
	verifier(pub1 === pub2 && pub1 !== cle, "wg pubkey : toujours la même clé publique pour la même privée");
	contient(t(jeu, "sudo wg-quick up wg0"), "does not exist", "wg-quick up sans wg0.conf");
	contient(t(jeu, "wg show"), "", "wg show sans interface");
	t(jeu, "exit");
	// Le démon rsync.
	t(jeu, "ssh bibliotheque");
	contient(t(jeu, "sudo systemctl start rsync"), "", "rsync sans /etc/rsyncd.conf");
	contient(t(jeu, "systemctl status rsync"), "rsync.service", "le service, sans sa configuration");
	t(jeu, "printf '[archives]\\n\\tpath = /srv/bibliotheque/archives\\n\\tread only = yes\\n\\thosts allow = 10.0.70.0/24\\n' | sudo tee /etc/rsyncd.conf; sudo systemctl start rsync");
	t(jeu, "exit");
	t(jeu, "ssh quai");
	contient(t(jeu, "rsync rsync://bibliotheque/"), "archives", "rsync rsync://bibliotheque/ : les modules");
	contient(t(jeu, "rsync -av rsync://bibliotheque/archives/ /tmp/m/"), "journal-de-bord.txt", "rsync -av depuis un module");
	contient(t(jeu, "cd; echo x > x.txt; rsync x.txt rsync://bibliotheque/archives/"), "read only", "un module en lecture seule : refusé");
	contient(t(jeu, "rsync rsync://bibliotheque/brouillons/"), "Unknown module", "un module qui n'existe pas");
	t(jeu, "exit");
	t(jeu, "ssh rive");
	contient(t(jeu, "rsync rsync://bibliotheque/archives/"), "access denied", "hosts allow : la rive refusée");
	t(jeu, "exit");
	// sftp enfermé.
	t(jeu, "ssh quai");
	var s = t(jeu, "sftp depot@halle", ["Rendus du soir 7", "pwd", "bye"]);
	contient(s, "Remote working directory: /home/depot", "sftp sans prison : depot voit toute la Halle");
	contient(t(jeu, "sftp depot@halle", ["mauvais"]), "Permission denied", "sftp : un mauvais mot de passe");
	t(jeu, "exit");
	tous(jeu, ["ssh halle", "sudo groupadd devoirs; sudo usermod -aG devoirs depot; sudo mkdir -p /srv/devoirs/rendus; sudo chown depot /srv/devoirs",
		"printf '\\nMatch Group devoirs\\n\\tChrootDirectory /srv/devoirs\\n\\tForceCommand internal-sftp\\n' | sudo tee -a /etc/ssh/sshd_config", "sudo systemctl reload ssh", "exit", "ssh quai"]);
	contient(t(jeu, "sftp depot@halle", ["Rendus du soir 7"]), "Connection closed", "une prison qui appartient à depot : sshd coupe la connexion");
	t(jeu, "exit");
	t(jeu, "ssh halle");
	contient(t(jeu, "sudo journalctl -u ssh | tail -3"), "bad ownership or modes for chroot directory", "le journal de sshd dit pourquoi");
	t(jeu, "exit");
})();

console.log((ok + ko) + " vérifications, " + ko + " échec" + (ko > 1 ? "s" : ""));
process.exit(ko ? 1 : 0);
