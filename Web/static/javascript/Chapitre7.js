/**
 * Chapitre7.js : Port-Aube, la cité à bâtir. Le chapitre des services réseau Linux.
 *
 * Numéro interne 8 (le 4 est l'épreuve finale, le 5 le chapitre 4, le 6 le chapitre 5, le 7 le chapitre 6), affiché 7.
 * Lumen rallumée, Laurent convoque la recrue à l'Embarcadère, au petit jour. L'école a fondé un campus sur une île au
 * large : Port-Aube. Les maisons sont debout, mais vides. Ce soir, à la marée haute de 19 h, le premier navire accoste
 * avec cinq cents étudiants ; et une tempête monte à l'horizon. La recrue devient l'Architecte.
 *
 * Ce fichier pose le monde (l'Embarcadère, le quai de Port-Aube et ses dix maisons, la boîte de Laurent), l'horloge
 * (7 h, trois minutes par commande), les 27 étapes et leur validation sur l'ÉTAT RÉEL des machines de l'île (PortAube.js,
 * SortsIle*.js), les trois actes (l'aube, la Tempête, la Marée), le Premier Pas, le plan de la cité (chantier, dans
 * Ile.js), l'épilogue, le certificat, et ce qui arrive après la fête. Ile.js fait vivre les maîtres et leurs défis ;
 * HabitantsIle.js, les quêtes annexes.
 *
 * Tout est construction et défense : on bâtit, on configure, on vérifie, on sauvegarde.
 */

World.fige = false;

/* ------------------------------------------------------------------ */
/* Les lieux : l'Embarcadère, le quai de Port-Aube et ses dix maisons   */
/* ------------------------------------------------------------------ */

function salleCh7(nom, intro, img){
	var r = lieuDuChapitre8(new Room(nom, intro, img));
	r.owner = "root";
	r.mode = "rwxr-xr-x";
	return r;
}
function objetCh7(lieu, nom, texte, image, options){
	options = options || {};
	var it = new Item(nom, texte, image || "item_sign.gif").droits(options.mode || "rw-r--r--", options.owner || "root");
	lieu.addItem(it);
	return it;
}

var Embarcadere = salleCh7("Embarcadere",
	"L'Embarcadère de l'école, au bout de la jetée. Le ciel pâlit à peine. Un traversier attend, moteur au ralenti, son fanal encore allumé ; " +
	"au large, sur la ligne grise de la mer, une île sort de la brume. Sur la passerelle, une pancarte : PORT-AUBE.",
	"loc_embarcadere.gif");
var HallPortAube = salleCh7("PortAube",
	"Le quai de Port-Aube, à l'aube. Les pavés sont neufs, les lanternes éteintes, et toutes les maisons de la cité regardent la mer avec des fenêtres sans lumière. " +
	"Dix maisons entourent le port : la Maison des Noms, le Phare-Relais, la Poste, le Bureau des Lettres, les Greniers, la Halle, le Grand Registre, les Portes de la cité, la Forge des Sceaux et l'Arche. " +
	"Laurent t'attend au bout du quai ; la radio de Grace grésille ; l'horloge de la capitainerie marque l'heure de la marée.",
	"loc_port_aube.gif");
link_rooms(Embarcadere, HallPortAube);

/* Les dix maisons : la clé, le nom du lieu, le maître, le titre, la machine, les deux étapes, l'intro. */
var MAISONS_CH7 = [
	{ cle: "noms", nom: "MaisonDesNoms", maitre: "Badis", titre: "la Maison des Noms", machine: "noms", etapes: ["p7_zone", "p7_serie"],
	  intro: "La Maison des Noms : une haute bibliothèque où chaque rayon porte une étiquette vide. Une cité dont les maisons ne savent pas se nommer n'est qu'un tas de pierres (le DNS primaire, machine noms)." },
	{ cle: "phare", nom: "PhareRelais", maitre: "Maeva", titre: "le Phare-Relais", machine: "phare", etapes: ["p7_secondaire", "p7_inverse"],
	  intro: "Le Phare-Relais, au bout de la jetée : la copie des noms, pour le jour où la Maison des Noms se taira, et le chemin inverse, de l'adresse vers le nom (le DNS secondaire, machine phare)." },
	{ cle: "poste", nom: "Poste", maitre: "Younes", titre: "la Poste", machine: "poste", etapes: ["p7_postfix", "p7_courrier"],
	  intro: "La Poste : des sacs de lettres empilés contre le guichet, tous tamponnés « en attente ». Depuis l'aube, rien ne part et rien n'arrive (Postfix, machine poste)." },
	{ cle: "lettres", nom: "BureauDesLettres", maitre: "Syrine", titre: "le Bureau des Lettres", machine: "poste", etapes: ["p7_imap", "p7_usurpation"],
	  intro: "Le Bureau des Lettres : des casiers à n'en plus finir, un par habitant, et des sceaux de cire pour prouver d'où vient chaque lettre (Dovecot, SPF, DKIM, DMARC, machine poste)." },
	{ cle: "greniers", nom: "Greniers", maitre: "Noam", titre: "les Greniers", machine: "greniers", etapes: ["p7_exports", "p7_squash"],
	  intro: "Les Greniers : de grandes charpentes, un dossier par habitant sur chaque étagère. Les portes sont closes : personne, sur l'île, ne peut encore y monter (NFS, machine greniers)." },
	{ cle: "halle", nom: "Halle", maitre: "Zélia", titre: "la Halle d'échange", machine: "halle", etapes: ["p7_partage", "p7_promo_acces"],
	  intro: "La Halle d'échange : une nef de bois et de verre, des étals vides. Ici, chacun déposera et prendra, mais seulement ceux de la promo (Samba, machine halle)." },
	{ cle: "registre", nom: "GrandRegistre", maitre: "Kamal", titre: "le Grand Registre", machine: "registre", etapes: ["p7_annuaire", "p7_groupes"],
	  intro: "Le Grand Registre : un livre immense, ouvert sur un lutrin. Une seule ligne y est écrite, le nom de la cité. Son sceau s'est perdu pendant la traversée (LDAP, machine registre)." },
	{ cle: "portes", nom: "PortesDeLaCite", maitre: "Lamia", titre: "les Portes de la cité", machine: "quai", etapes: ["p7_sssd", "p7_autofs"],
	  intro: "Les Portes de la cité, sous l'auvent du débarcadère : c'est par là qu'entrera chaque étudiant, et chaque porte doit le reconnaître et lui ouvrir sa maison (sssd, autofs, machine quai)." },
	{ cle: "forge", nom: "ForgeDesSceaux", maitre: "Miguel", titre: "la Forge des Sceaux", machine: "forge", etapes: ["p7_autorite", "p7_sceaux"],
	  intro: "La Forge des Sceaux : une enclume, un feu qui ne s'éteint jamais, et des sceaux de métal pour chaque maison. Un sceau ne vaut que par la main qui l'a forgé (l'autorité de certification, machine forge)." },
	{ cle: "arche", nom: "Arche", maitre: "Amina", titre: "l'Arche", machine: "arche", etapes: ["p7_depot", "p7_restauration"],
	  intro: "L'Arche, sur la colline, loin des vagues : ici dormira la copie de tout ce que la cité ne veut pas perdre, à l'abri de la tempête (les sauvegardes, borg, machine arche)." }
];
MAISONS_CH7.forEach(function(m){
	m.lieu = salleCh7(m.nom, m.intro, "loc_maison_" + m.cle + ".gif");
	link_rooms(HallPortAube, m.lieu);
});
function maisonCh7(cle){ return MAISONS_CH7.filter(function(m){ return m.cle === cle; })[0]; }
function maisonDeLieu(lieu){ return MAISONS_CH7.filter(function(m){ return m.lieu === lieu; })[0] || null; }

/* La boîte de Laurent : on y dépose le rapport de mise en service. */
var BoiteDePortAube = salleCh7("BoiteDeLaurent", "Une boîte aux lettres de fer peint, vissée au mur de la capitainerie. On y dépose le rapport de mise en service, à l'intention de Laurent.", "item_box.gif");
BoiteDePortAube.mode = "rwxrwxrwt";
BoiteDePortAube.owner = "laurent";
BoiteDePortAube.horsBareme = true;
link_rooms(HallPortAube, BoiteDePortAube);

/* ------------------------------------------------------------------ */
/* Les sorts du chapitre                                               */
/* ------------------------------------------------------------------ */

var ORDRE_DES_SORTS_8 = (function(){
	var autres = [].concat(typeof ORDRE_DES_SORTS !== "undefined" ? ORDRE_DES_SORTS : [], typeof ORDRE_DES_SORTS_2 !== "undefined" ? ORDRE_DES_SORTS_2 : [],
		typeof ORDRE_DES_SORTS_3 !== "undefined" ? ORDRE_DES_SORTS_3 : [], typeof ORDRE_DES_SORTS_5 !== "undefined" ? ORDRE_DES_SORTS_5 : [],
		typeof ORDRE_DES_SORTS_6 !== "undefined" ? ORDRE_DES_SORTS_6 : [], typeof ORDRE_DES_SORTS_7 !== "undefined" ? ORDRE_DES_SORTS_7 : [], SORTS_ANNEXES_ILE);
	return SORTS_ILE.filter(function(s, i){ return SORTS_ILE.indexOf(s) === i && autres.indexOf(s) === -1 && MANUEL[s]; });
})();
ORDRE_DES_SORTS_8.forEach(function(s){ if (MANUEL[s]) delete MANUEL[s].horsBareme; });

/* Qui enseigne quoi (les maîtres sont posés dans Ile.js) : chaque sort a un maître, et un seul. */
var SORTS_DES_MAISONS = {
	noms: ["named-checkconf", "rndc"],
	phare: ["nsupdate", "tsig-keygen"],
	poste: ["postconf", "postfix", "mailq", "postqueue", "postsuper", "postcat", "mail", "sendmail"],
	lettres: ["doveconf", "doveadm", "opendkim-genkey"],
	greniers: ["exportfs", "showmount"],
	halle: ["testparm", "smbpasswd", "pdbedit"],
	registre: ["ldapsearch", "ldapadd", "ldapmodify", "ldapdelete", "ldapwhoami", "ldappasswd", "slappasswd", "slapcat"],
	portes: ["sss_cache"],
	forge: ["update-ca-certificates"],
	arche: ["borg"]
};

/* ------------------------------------------------------------------ */
/* L'horloge de la journée : 7 h, trois minutes par commande, la marée à 19 h */
/* ------------------------------------------------------------------ */

function heureCh7(){
	var total = 7 * 60 + sCh7().horloge;
	return deuxChiffres(Math.floor(total / 60) % 24) + ":" + deuxChiffres(total % 60);
}
function minutesAvantMaree(){ return MAREE_CH7 - sCh7().horloge; }
function texteAvantMaree(){
	var m = Math.max(0, minutesAvantMaree());
	return Math.floor(m / 60) + " h " + deuxChiffres(m % 60);
}
function baseJourCh7(){ var d = new Date(); d.setHours(7, 0, 0, 0); return d.getTime(); }
function avancerHorlogeCh7(){
	var c = sCh7();
	if (!state.quests["p7_quai"]) return;
	if (c.dernierNb === null || c.dernierNb === undefined) c.dernierNb = state.nbCommandes;
	if (state.nbCommandes > c.dernierNb){
		c.horloge += (state.nbCommandes - c.dernierNb) * PAS_HORLOGE_CH7;
		c.dernierNb = state.nbCommandes;
	}
	var heure = Math.floor((7 * 60 + c.horloge) / 60);
	if (c.heureAnnoncee === undefined || c.heureAnnoncee === null) c.heureAnnoncee = heure;
	if (heure > c.heureAnnoncee){
		c.heureAnnoncee = heure;
		if (!state.has("rejeuEnCours") && !c.maree && heure < 19) say(C.gris("(Radio : « Grace : il est " + heure + " h. " +
			(heure === 13 ? "La tempête sera sur nous dans une heure. »)" : (heure === 18 ? "Le navire est en vue : la marée dans une heure. »)" : (c.tempete ? "Le vent tient. La marée à 19 h. »)" : "La tempête à 14 h, la marée à 19 h. »)")))));
	}
}

/* ------------------------------------------------------------------ */
/* L'ouverture du chapitre                                             */
/* ------------------------------------------------------------------ */

function relierPortAube(){ if (Cybersup.children.indexOf(Embarcadere) === -1) relier(Cybersup, Embarcadere); }
/* Ce qui se pose une seule fois, à l'ouverture : les unités des machines, la nuit des bâtisseurs dans les journaux. */
function seminerCh7(){
	var c = sCh7();
	if (c.seme) return;
	c.seme = true;
	declarerUnitesIle();
	HOTES_ILE.forEach(function(h){ if (estMaMachineIle(h)) synchroniserUnites(h); });
	var p = etatPostfixIle("poste");
	if (!p.file || !p.file.length) p.file = fileInitialePosteIle();
	var t = maintenantCh7();
	var j = function(h, min, e){ e.t = t - min * 60000; journalMachine(h, e); };
	j("poste", 125, { unite: "postfix/smtp", pid: 2215, unit: "postfix.service", prio: 4, message: p.file[0].id + ": to=<" + JOUEUR + "@" + DOMAINE_ILE + ">, relay=none, delay=0.4, delays=0.01/0/0.4/0, dsn=4.4.1, status=deferred (connect to relais.ancien-campus.lan[10.0.92.25]:587: Connection timed out)" });
	j("poste", 124, { unite: "postfix/postfix-script", pid: 1100, unit: "postfix.service", prio: 4, message: "warning: /etc/postfix/main.cf, line 52: overriding earlier entry: mydestination=$myhostname, port-aube.lan, localhost.localdomain, localhost" });
	j("registre", 300, { unite: "slapd", pid: 640, unit: "slapd.service", message: "slapd starting" });
	j("noms", 200, { unite: "named", pid: 702, unit: "named.service", prio: 4, message: "no zone declared for port-aube.lan: the island has no names yet" });
	j("arche", 90, { unite: "sshd", pid: 488, unit: "ssh.service", message: "Server listening on 0.0.0.0 port 22." });
}

/* ------------------------------------------------------------------ */
/* Les étapes                                                          */
/* ------------------------------------------------------------------ */

var QUETES_CH7 = [
	{ id: "p7_quai", titre: "Traverser jusqu'à Port-Aube",
	  indice: "À l'Embarcadère de l'école, le traversier attend : cd ~/Cybersup/Embarcadere, puis cd PortAube." },
	{ id: "p7_chantier", titre: "Écouter Laurent, lire l'ordre de mission, consulter le plan de la cité",
	  indice: "Sur le quai : cat Laurent, cat Mission, puis chantier (une commande du jeu) : le plan des dix maisons et la note de départ." },
	{ id: "p7_zone", titre: "Maison des Noms : la zone port-aube.lan, propre et chargée",
	  indice: "Maison des Noms (Badis). Sur noms : sudo named-checkzone port-aube.lan /etc/bind/zones/db.port-aube.lan dit les deux fautes ; déclare la zone dans named.conf.local (type primary, allow-transfer vers le phare), sudo named-checkconf -z, sudo rndc reload, dig @noms." },
	{ id: "p7_serie", titre: "Maison des Noms : deux noms de plus, la série augmentée",
	  indice: "Ajoute imprimerie (10.0.70.31) et bibliotheque (10.0.70.73) à la zone, augmente le numéro de série, rndc reload, puis dig @noms port-aube.lan SOA pour voir la nouvelle série." },
	{ id: "p7_secondaire", titre: "Phare-Relais : la copie des noms, transférée au phare seulement",
	  indice: "Phare-Relais (Maeva). Sur phare : une zone type secondary (primaries { 10.0.70.53; }), rndc reload ; sur noms, allow-transfer { 10.0.70.54; }. Puis un dig AXFR refusé depuis une autre machine." },
	{ id: "p7_inverse", titre: "Phare-Relais : la zone inverse, et un ajout à chaud (nsupdate)",
	  indice: "La zone 70.0.10.in-addr.arpa (des PTR) sur noms, avec allow-update { key cle-phare; } (la clé de tsig-keygen, incluse dans named.conf.local), sa copie sur phare, dig -x 10.0.70.25 ; puis sudo nsupdate -k pour y ajouter un PTR à chaud, sans toucher au fichier." },
	{ id: "p7_postfix", titre: "La Poste : un main.cf juste, vérifié et rechargé",
	  indice: "La Poste (Younes). Sur poste : postconf -n et sudo postfix check montrent les fautes (un doublon, une coquille, un relais injoignable, un relais ouvert à tous). sudo postconf -e, puis sudo postfix reload." },
	{ id: "p7_courrier", titre: "La Poste : la file vidée, une lettre qui part et qui arrive",
	  indice: "mailq (les lettres coincées, et pourquoi) ; une fois main.cf juste et rechargé, sudo postqueue -f ; puis echo ... | mail -s ... badis, et le journal (sudo tail /var/log/mail.log : status=sent)." },
	{ id: "p7_imap", titre: "Bureau des Lettres : Dovecot lit les boîtes que Postfix remplit",
	  indice: "Bureau des Lettres (Syrine). doveadm user, doveadm mailbox list : Dovecot cherche une mbox, Postfix écrit des Maildir dans /var/mail/NOM/. mail_location = maildir:/var/mail/%u dans 10-mail.conf, puis sudo systemctl reload dovecot." },
	{ id: "p7_usurpation", titre: "Bureau des Lettres : SPF, DKIM et DMARC publiés dans la zone",
	  indice: "sudo opendkim-genkey -s aube -d port-aube.lan sur poste ; dans la zone (sur noms) : un TXT \"v=spf1 mx -all\" sur @, le TXT de aube._domainkey, un TXT \"v=DMARC1; p=quarantine\" sur _dmarc ; série, rndc reload ; dig TXT pour les trois." },
	{ id: "p7_exports", titre: "Greniers : /srv/homes publié à l'île, en root_squash",
	  indice: "Greniers (Noam). /etc/exports : /srv/homes 10.0.70.0/24(rw,sync,root_squash,no_subtree_check), sudo exportfs -ra, sudo exportfs -v ; depuis le quai, showmount -e greniers." },
	{ id: "p7_squash", titre: "Greniers : root sur un client n'est pas root au grenier",
	  indice: "Sur le quai : sudo mkdir -p /mnt/greniers, sudo mount -t nfs greniers:/srv/homes /mnt/greniers, puis sudo touch /mnt/greniers/badis/essai : refusé. root_squash fait de root un nobody." },
	{ id: "p7_partage", titre: "Halle : le partage de la promo, propre et vérifié",
	  indice: "Halle (Zélia). Sur halle : /srv/promo (groupe promo, droits du groupe), une section [promo] dans smb.conf (path, valid users = @promo, read only = no), testparm -s." },
	{ id: "p7_promo_acces", titre: "Halle : un membre de la promo dépose une affiche",
	  indice: "sudo smbpasswd -a zelia (sur halle), sudo pdbedit -L, smbclient -L //halle -N, puis smbclient //halle/promo -U zelia -c 'put ...' : Zélia y dépose son affiche." },
	{ id: "p7_annuaire", titre: "Grand Registre : le sceau reforgé, les dix bâtisseurs inscrits",
	  indice: "Grand Registre (Kamal). slappasswd, puis sudo ldapmodify -Y EXTERNAL -H ldapi:/// (replace: olcRootPW) ; ldapadd -x -D cn=admin,dc=port-aube,dc=lan -W : ou=people, ou=groups, puis /root/batisseurs.ldif (deux fautes) ; ldapsearch -x." },
	{ id: "p7_groupes", titre: "Grand Registre : les bâtisseurs et la promo, et leurs membres",
	  indice: "Deux posixGroup sous ou=groups : batisseurs (gidNumber 10000, les dix en memberUid), promo (gidNumber 10100, avec Zélia) ; un membre ajouté avec ldapmodify (add: memberUid)." },
	{ id: "p7_sssd", titre: "Portes de la cité : le quai reconnaît les comptes du Registre",
	  indice: "Portes (Lamia). Sur le quai : /etc/sssd/sssd.conf (domains, id_provider = ldap, ldap_uri, ldap_search_base), chmod 600, sssd démarré ; sss dans /etc/nsswitch.conf (passwd, group) ; getent passwd badis, id badis." },
	{ id: "p7_autofs", titre: "Portes de la cité : chaque maison s'ouvre à l'arrivée (autofs)",
	  indice: "/etc/auto.master.d/home.autofs (/home /etc/auto.home) et /etc/auto.home (* -fstype=nfs,rw greniers:/srv/homes/&), sudo systemctl reload autofs, puis ls /home/badis : monté depuis les Greniers." },
	{ id: "p7_autorite", titre: "Forge des Sceaux : l'autorité de la cité, et sa clé qui ne sort pas",
	  indice: "Forge (Miguel). Sur forge : sudo openssl genrsa -out /srv/forge/forge.key 4096 ; sudo openssl req -x509 -new -key /srv/forge/forge.key -days 3650 -subj \"/CN=Forge des Sceaux de Port-Aube\" -out /srv/forge/forge.crt. La clé reste dans /srv/forge, en 600." },
	{ id: "p7_sceaux", titre: "Forge des Sceaux : le sceau de la Poste, et le quai qui lui fait confiance",
	  indice: "Sur poste, une clé et une demande (openssl req -new, subjectAltName) ; scp vers forge:/srv/demandes ; la Forge signe (x509 -req -CA -CAkey) ; Dovecot sert le sceau (10-ssl.conf, reload). Sur le quai : la racine dans /usr/local/share/ca-certificates, update-ca-certificates, puis openssl s_client -starttls imap." },
	{ id: "p7_depot", titre: "L'Arche : un dépôt chiffré, une clé qui ne sait faire qu'une chose",
	  indice: "Arche (Amina). Sur greniers : sudo ssh-keygen -f /root/.ssh/arche ; sur arche, la clé dans ~borg/.ssh/authorized_keys avec command=\"borg serve --restrict-to-path /srv/borg/greniers\",restrict ; sudo borg init -e repokey ; la phrase dans /root/.borg-phrase (600) ; sudo systemctl start sauvegarde-borg." },
	{ id: "p7_restauration", titre: "L'Arche : la sauvegarde de chaque nuit, et une restauration vérifiée",
	  indice: "Un timer sauvegarde-borg.timer (OnCalendar, Persistent), enable --now ; sudo borg check ; sudo borg extract dans un dossier vide, puis diff -r avec l'original." },
	{ id: "p7_tempete", titre: "La Tempête : tenir, et réparer ce qu'elle a frappé",
	  indice: "À 14 h (ou dès que six maisons sont bâties), la Tempête frappe chaque maison déjà bâtie. chantier dit quoi ; Grace aussi, à la radio. Répare chaque incident." },
	{ id: "p7_maree", titre: "La Marée : le navire accoste",
	  indice: "À 19 h (ou plus tôt, si les dix maisons sont bâties et la Tempête passée), le navire accoste. chantier dit ce que la marée a apporté : répare-le." },
	{ id: "p7_premier_pas", titre: "Le Premier Pas : le premier étudiant se connecte depuis le quai",
	  indice: "Crée son compte dans le Registre (membre de la promo), son dossier aux Greniers, son compte Samba, une lettre de bienvenue ; une sauvegarde fraîche ; puis ssh PRENOM@quai : chaque maison lui ouvre sa porte." },
	{ id: "p7_chantier_final", titre: "La cité au-dessus de 90",
	  indice: "Après la Marée, chantier doit dépasser 90 : il dit ce qui manque encore." },
	{ id: "p7_rapport", titre: "Rédiger le rapport de mise en service et le remettre à Laurent",
	  indice: "~/port-aube/rapport.txt (dans ta Maison) : les maisons, la tempête, la marée, le premier pas (le prénom du premier étudiant), ce qui reste. Puis une copie dans la BoiteDeLaurent du quai." }
];
var QUETES_SECONDAIRES_CH7 = [];   // les défis des maîtres et de Laurent : Ile.js

var INDICES_CH7 = {
	p7_quai: ["L'Embarcadère est au bout du campus.", "cd ~/Cybersup/Embarcadere ; cd PortAube"],
	p7_chantier: ["Laurent et l'ordre de mission sont sur le quai ; chantier est une commande du jeu.", "cat Laurent ; cat Mission ; chantier"],
	p7_zone: ["La zone a deux fautes (une adresse impossible, un nom à la fois CNAME et A) et n'est déclarée nulle part.", "ssh noms ; sudo named-checkzone port-aube.lan /etc/bind/zones/db.port-aube.lan ; sudo sed -i 's/10.0.70.380/10.0.70.38/; /^imap.*IN.A/d' /etc/bind/zones/db.port-aube.lan ; printf 'zone \"port-aube.lan\" {\\n\\ttype primary;\\n\\tfile \"/etc/bind/zones/db.port-aube.lan\";\\n\\tallow-transfer { 10.0.70.54; };\\n\\talso-notify { 10.0.70.54; };\\n};\\n' | sudo tee -a /etc/bind/named.conf.local ; sudo named-checkconf -z ; sudo rndc reload ; dig @noms poste.port-aube.lan"],
	p7_serie: ["Deux lignes A, et la série : 2026101701 devient 2026101702.", "printf 'imprimerie\\tIN\\tA\\t10.0.70.31\\nbibliotheque\\tIN\\tA\\t10.0.70.73\\n' | sudo tee -a /etc/bind/zones/db.port-aube.lan ; sudo sed -i 's/2026101701/2026101702/' /etc/bind/zones/db.port-aube.lan ; sudo named-checkzone port-aube.lan /etc/bind/zones/db.port-aube.lan ; sudo rndc reload ; dig @noms port-aube.lan SOA +short"],
	p7_secondaire: ["Le secondaire ne garde rien à la main : il copie (type secondary, primaries).", "ssh phare ; printf 'zone \"port-aube.lan\" {\\n\\ttype secondary;\\n\\tprimaries { 10.0.70.53; };\\n\\tfile \"/var/cache/bind/db.port-aube.lan\";\\n};\\n' | sudo tee -a /etc/bind/named.conf.local ; sudo rndc reload ; dig @phare port-aube.lan SOA +short ; exit ; ssh quai ; dig port-aube.lan AXFR @noms"],
	p7_inverse: ["La zone inverse s'écrit à l'envers : 70.0.10.in-addr.arpa, des PTR. Pour nsupdate, la clé doit être connue de named (include) et autorisée dans la zone (allow-update).", "Sur noms : tsig-keygen cle-phare | sudo tee /etc/bind/cle-phare.key ; un fichier db.10.0.70 (SOA, NS, PTR) ; dans named.conf.local, include de la clé et la zone 70.0.10.in-addr.arpa (allow-update { key cle-phare; }) ; rndc reload ; sur phare, sa copie secondaire ; dig -x 10.0.70.25 ; printf 'server 10.0.70.53\\nzone 70.0.10.in-addr.arpa\\nupdate add 60.70.0.10.in-addr.arpa. 3600 IN PTR capitainerie.port-aube.lan.\\nsend\\n' | sudo nsupdate -k /etc/bind/cle-phare.key"],
	p7_postfix: ["Quatre fautes : mydestination écrit deux fois (le dernier gagne, sans le domaine), mydomian, relayhost vers un relais mort, mynetworks ouvert à tous.", "ssh poste ; postconf -n ; sudo postfix check ; sudo sed -i '/^mydomian/d' /etc/postfix/main.cf ; sudo postconf -e 'myhostname = poste.port-aube.lan' 'mydomain = port-aube.lan' 'mydestination = $myhostname, $mydomain, localhost' 'relayhost =' 'mynetworks = 127.0.0.0/8 10.0.70.0/24' ; sudo postfix check ; sudo postfix reload"],
	p7_courrier: ["Les lettres attendent un relais mort : une fois main.cf juste, la file repart.", "mailq ; sudo postqueue -f ; mailq ; echo 'La Poste est ouverte' | mail -s 'Ouverture' badis ; sudo tail -3 /var/log/mail.log"],
	p7_imap: ["Postfix range un Maildir dans /var/mail/NOM/ (la barre finale de mail_spool_directory) ; Dovecot doit regarder au même endroit.", "doveadm user " + "TOI ; doveadm mailbox list ; sudo sed -i 's|^mail_location = .*|mail_location = maildir:/var/mail/%u|' /etc/dovecot/conf.d/10-mail.conf ; sudo systemctl reload dovecot ; doveadm mailbox status messages INBOX"],
	p7_usurpation: ["Trois TXT dans la zone : @ (SPF), aube._domainkey (DKIM, la ligne que opendkim-genkey a écrite), _dmarc (DMARC).", "sudo opendkim-genkey -s aube -d port-aube.lan -D /etc/opendkim/keys ; sudo cat /etc/opendkim/keys/aube.txt ; puis sur noms, dans la zone : @ IN TXT \"v=spf1 mx -all\", la ligne aube._domainkey, _dmarc IN TXT \"v=DMARC1; p=quarantine\" ; la série ; sudo rndc reload ; dig TXT port-aube.lan +short"],
	p7_exports: ["Une ligne dans /etc/exports, sans espace entre le réseau et la parenthèse.", "ssh greniers ; echo '/srv/homes 10.0.70.0/24(rw,sync,root_squash,no_subtree_check)' | sudo tee -a /etc/exports ; sudo exportfs -ra ; sudo exportfs -v ; exit ; ssh quai ; showmount -e greniers"],
	p7_squash: ["Monter, puis essayer d'écrire en root dans le dossier d'un bâtisseur.", "ssh quai ; sudo mkdir -p /mnt/greniers ; sudo mount -t nfs greniers:/srv/homes /mnt/greniers ; sudo touch /mnt/greniers/badis/essai ; sudo umount /mnt/greniers"],
	p7_partage: ["Le groupe promo vient du Registre : la Halle le voit par sssd.", "ssh halle ; sudo mkdir -p /srv/promo ; sudo chgrp promo /srv/promo ; sudo chmod 2770 /srv/promo ; printf '[promo]\\n   comment = Le partage de la promo\\n   path = /srv/promo\\n   valid users = @promo\\n   read only = no\\n' | sudo tee -a /etc/samba/smb.conf ; testparm -s"],
	p7_promo_acces: ["Samba garde ses propres mots de passe : smbpasswd -a, pour un compte qui existe déjà (ici, par le Registre).", "sudo smbpasswd -a zelia ; sudo pdbedit -L ; exit ; ssh quai ; smbclient -L //halle -N ; echo 'Bienvenue a la promo' > /tmp/affiche.txt ; smbclient //halle/promo -U zelia -c 'put /tmp/affiche.txt affiche.txt; ls'"],
	p7_annuaire: ["D'abord le sceau (olcRootPW, par ldapi en root), puis les branches, puis les dix (le LDIF a deux fautes : un uidNumber oublié, un nombre en lettres).", "ssh registre ; slappasswd ; sudo ldapmodify -Y EXTERNAL -H ldapi:/// (replace: olcRootPW) ; ldapadd -x -D cn=admin,dc=port-aube,dc=lan -W -f base.ldif ; sudo cp /root/batisseurs.ldif ~/ ; corrige-le ; ldapadd -c -x -D cn=admin,dc=port-aube,dc=lan -W -f ~/batisseurs.ldif ; ldapsearch -x -LLL '(objectClass=posixAccount)' uid"],
	p7_groupes: ["posixGroup : cn, gidNumber, et un memberUid par membre.", "ldapadd -x -D cn=admin,dc=port-aube,dc=lan -W -f groupes.ldif ; puis un ldapmodify (add: memberUid) pour ajouter un membre"],
	p7_sssd: ["sssd refuse un sssd.conf lisible par d'autres que root : 600.", "ssh quai ; printf '[sssd]\\nservices = nss, pam\\ndomains = port-aube\\n\\n[domain/port-aube]\\nid_provider = ldap\\nauth_provider = ldap\\nldap_uri = ldap://registre.port-aube.lan\\nldap_search_base = dc=port-aube,dc=lan\\n' | sudo tee /etc/sssd/sssd.conf ; sudo chmod 600 /etc/sssd/sssd.conf ; sudo systemctl start sssd ; sudo sed -i 's/^passwd:.*/passwd:         files sss/; s/^group:.*/group:          files sss/' /etc/nsswitch.conf ; getent passwd badis ; id badis"],
	p7_autofs: ["& reprend la clé (le nom du dossier demandé) ; * accepte toutes les clés.", "echo '/home /etc/auto.home' | sudo tee /etc/auto.master.d/home.autofs ; echo '* -fstype=nfs,rw greniers:/srv/homes/&' | sudo tee /etc/auto.home ; sudo systemctl reload autofs ; ls -ld /home/badis ; mount -t nfs4"],
	p7_autorite: ["genrsa pour la clé, req -x509 pour le certificat racine (CA:TRUE).", "ssh forge ; sudo openssl genrsa -out /srv/forge/forge.key 4096 ; sudo openssl req -x509 -new -key /srv/forge/forge.key -days 3650 -subj '/CN=Forge des Sceaux de Port-Aube' -out /srv/forge/forge.crt ; sudo openssl x509 -in /srv/forge/forge.crt -noout -text | grep CA"],
	p7_sceaux: ["La demande voyage, la clé non. Le quai fait confiance à la racine, pas au sceau de la Poste.", "Sur poste : openssl genrsa, openssl req -new -addext 'subjectAltName=DNS:poste.port-aube.lan', scp vers forge:/srv/demandes ; sur forge : sudo openssl x509 -req -CA ... -CAkey ... -CAcreateserial -copy_extensions copy ; retour sur poste, 10-ssl.conf, reload ; sur le quai : update-ca-certificates, openssl s_client -connect poste.port-aube.lan:143 -starttls imap"],
	p7_depot: ["La clé de sauvegarde n'ouvre qu'une porte : command= et restrict, en tête de sa ligne.", "ssh greniers ; sudo ssh-keygen -t ed25519 -f /root/.ssh/arche -N '' ; sudo scp /root/.ssh/arche.pub arche:/tmp/greniers.pub ; ssh arche ; echo \"command=\\\"borg serve --restrict-to-path /srv/borg/greniers\\\",restrict $(cat /tmp/greniers.pub)\" | sudo tee /home/borg/.ssh/authorized_keys ; puis sur greniers : sudo borg init -e repokey --rsh 'ssh -i /root/.ssh/arche' borg@arche:/srv/borg/greniers ; la phrase dans /root/.borg-phrase ; sudo chmod 600 /root/.borg-phrase ; sudo systemctl start sauvegarde-borg"],
	p7_restauration: ["Le service existe déjà : il lui manque son timer. Une restauration se compare à l'original.", "printf '[Unit]\\nDescription=La sauvegarde de chaque nuit\\n\\n[Timer]\\nOnCalendar=*-*-* 02:30\\nPersistent=true\\n\\n[Install]\\nWantedBy=timers.target\\n' | sudo tee /etc/systemd/system/sauvegarde-borg.timer ; sudo systemctl daemon-reload ; sudo systemctl enable --now sauvegarde-borg.timer ; sudo borg check ... ; mkdir /tmp/retour ; cd /tmp/retour ; sudo borg extract ...::ARCHIVE srv/homes/badis ; sudo diff -r /srv/homes/badis /tmp/retour/srv/homes/badis"],
	p7_tempete: ["chantier liste chaque incident de la Tempête, maison par maison.", "chantier ; puis répare chaque incident sur sa machine"],
	p7_maree: ["Le capitaine a ajouté son navire à la zone, à la main, sans toucher à la série : le Phare ne le connaît pas.", "ssh noms ; augmente la série de db.port-aube.lan ; sudo rndc reload ; dig @phare navire.port-aube.lan"],
	p7_premier_pas: ["Six portes : le Registre, les Greniers, la Poste, la Halle, la Forge, l'Arche.", "ldapadd (le compte, dans promo), sur greniers mkdir et chown NUMERO /srv/homes/PRENOM, une lettre (mail -s Bienvenue PRENOM), smbpasswd -a PRENOM, une sauvegarde (systemctl start sauvegarde-borg), puis ssh PRENOM@quai"],
	p7_chantier_final: ["chantier, n'importe où, dit ce qui manque encore.", "chantier"],
	p7_rapport: ["Un here-document écrit le rapport d'un coup ; cp le dépose.", "mkdir -p ~/port-aube ; cat > ~/port-aube/rapport.txt <<'FIN' ... FIN ; cp ~/port-aube/rapport.txt CHEMIN_DU_QUAI/BoiteDeLaurent"]
};

/* La radio de Grace : un conseil par étape. */
var CONSEILS_CH7 = {
	p7_chantier: "Ici la WarRoom. Bienvenue à Port-Aube, Architecte. Le navire accoste à 19 h, la tempête à 14 h. Écoute Laurent, lis l'ordre de mission, et regarde le plan : chantier.",
	p7_zone: "Les noms d'abord : sans eux, aucune maison ne trouve les autres. Badis t'attend à la Maison des Noms.",
	p7_serie: "Chaque fois que tu touches la zone, la série monte d'un cran. Sinon, personne d'autre ne le saura.",
	p7_secondaire: "Maeva, au Phare-Relais : une copie des noms, et seulement pour le phare.",
	p7_inverse: "Et le chemin inverse, de l'adresse vers le nom. Puis un nom ajouté à chaud, signé d'une clé.",
	p7_postfix: "La Poste, chez Younes : des sacs de lettres coincés depuis l'aube. Lis main.cf avant de toucher.",
	p7_courrier: "Une fois main.cf juste, fais partir la file. Et vérifie qu'une lettre arrive pour de bon.",
	p7_imap: "Le Bureau des Lettres, chez Syrine : la Poste remplit des boîtes que personne ne sait lire.",
	p7_usurpation: "Trois sceaux contre les faussaires : SPF, DKIM, DMARC. Ils s'écrivent dans la zone, ils se lisent avec dig.",
	p7_exports: "Les Greniers, chez Noam : ouvre-les à l'île, et à l'île seulement.",
	p7_squash: "Prouve-le : root, sur le quai, ne doit pas être root au grenier.",
	p7_partage: "La Halle, chez Zélia : un partage pour la promo, rien que pour elle.",
	p7_promo_acces: "Qu'un membre de la promo y dépose quelque chose, pour de vrai.",
	p7_annuaire: "Le Grand Registre, chez Kamal : son sceau s'est perdu en mer. Reforge-le, puis inscris les dix.",
	p7_groupes: "Les bâtisseurs, la promo : des groupes, et leurs membres.",
	p7_sssd: "Les Portes, chez Lamia : le quai doit reconnaître tout le monde, sans un seul compte local.",
	p7_autofs: "Et que chaque maison s'ouvre toute seule à l'arrivée de son habitant.",
	p7_autorite: "La Forge, chez Miguel : une autorité, et une clé qui ne quitte jamais la Forge.",
	p7_sceaux: "Un sceau pour la Poste, signé par la Forge, et un quai qui sait le reconnaître.",
	p7_depot: "L'Arche, chez Amina : un dépôt chiffré, et une clé qui ne sait faire qu'une seule chose.",
	p7_restauration: "Une sauvegarde chaque nuit, et la preuve qu'on sait la relire.",
	p7_tempete: "La Tempête est sur nous. Regarde le plan, et répare ce qu'elle frappe, maison par maison.",
	p7_maree: "Le navire accoste ! Regarde ce que la marée a apporté.",
	p7_premier_pas: "Le premier étudiant descend la passerelle. Ouvre-lui chaque porte : le Registre, les Greniers, la Poste, la Halle, la Forge, l'Arche.",
	p7_chantier_final: "La cité doit dépasser 90.",
	p7_rapport: "Dernière chose : le rapport de mise en service pour Laurent. Les maisons, la tempête, la marée, le premier pas, ce qui reste."
};
var METIER_CH7 = {
	p7_chantier: "On mesure l'état d'une infrastructure avant de la construire : sans point de départ, on ne prouve rien.",
	p7_zone: "On vérifie toujours une zone (named-checkzone) et une configuration (named-checkconf) avant de recharger : une faute, et tout un domaine disparaît.",
	p7_serie: "La série d'une zone, c'est la façon dont les secondaires savent qu'il y a du neuf. Une modification sans série, c'est une modification que personne ne voit.",
	p7_secondaire: "Un transfert de zone ouvert à tous, c'est la carte complète du réseau offerte à qui la demande : allow-transfer se restreint aux secondaires.",
	p7_postfix: "Un relais ouvert à tous (mynetworks trop large) devient en une nuit une machine à spam, et l'adresse de l'école finit sur toutes les listes noires.",
	p7_courrier: "Une file de courrier se lit avant de se vider : chaque lettre dit pourquoi elle attend.",
	p7_imap: "Postfix livre, Dovecot lit : les deux doivent parler du même endroit et du même format (Maildir ou mbox).",
	p7_usurpation: "SPF dit qui a le droit d'envoyer, DKIM signe chaque lettre, DMARC dit quoi faire des faux : ensemble, ils protègent le nom de l'école contre l'usurpation.",
	p7_exports: "Un export NFS s'ouvre au plus petit réseau possible, et jamais en no_root_squash pour des dossiers personnels.",
	p7_partage: "Un partage Samba se donne à un groupe, pas à tout le monde : valid users, et pas d'invité.",
	p7_annuaire: "Un annuaire est la source de vérité des comptes : son mot de passe d'administration se garde haché, jamais en clair dans un fichier.",
	p7_sssd: "Un seul annuaire pour toutes les machines : on crée un compte une fois, il existe partout.",
	p7_autorite: "La clé d'une autorité de certification ne quitte jamais sa machine. Le certificat, lui, se distribue partout.",
	p7_sceaux: "Un certificat ne vaut que si le client fait confiance à celui qui l'a signé : on vérifie la chaîne, pas seulement le cadenas.",
	p7_depot: "Une sauvegarde à distance se fait avec une clé qui ne sait faire que ça : command= et restrict.",
	p7_restauration: "Une sauvegarde se juge à la restauration, pas à la copie.",
	p7_tempete: "Pendant un incident, on lit avant d'agir, on répare une chose à la fois, et on note l'heure de chaque geste.",
	p7_premier_pas: "Le vrai test d'une infrastructure, c'est le premier utilisateur : tout doit marcher ensemble, de bout en bout.",
	p7_rapport: "Un rapport de mise en service dit ce qui a été bâti, ce qui a cassé, ce qui a été fait, et ce qui reste à faire."
};

/* ------------------------------------------------------------------ */
/* L'état réel des machines, maison par maison                         */
/* ------------------------------------------------------------------ */

function vuCh7(cle){ return !!(sCh7().vus || {})[cle]; }
function noterVuCh7(cle){ var c = sCh7(); c.vus = c.vus || {}; if (!c.vus[cle]) c.vus[cle] = c.horloge + 1; }
var SERIE_INITIALE_CH7 = 2026101701;
/* Ce qu'un serveur de noms répond (vu du quai). */
function reponsesCh7(hs, nom, type){
	if (!estHoteIle(hs) || !bindTourne(hs)) return [];
	try { return questionIle(hs, nom, type || "A", IP_ILE.quai).reponses.filter(function(x){ return x.type === (type || "A"); }); } catch (e){ return []; }
}
function valeursDnsCh7(hs, nom, type){ return reponsesCh7(hs, nom, type).map(function(x){ return x.type === "TXT" ? x.donnees.join("") : (x.type === "MX" ? x.donnees.cible : String(x.donnees)); }); }
function zoneCh7(h, nom){ var z = etatBindIle(h).zones[nom || DOMAINE_ILE]; return z && z.chargee ? z : null; }
function zonePrimaireOkCh7(){
	var z = zoneCh7("noms");
	if (!z || z.type !== "primary" || !bindTourne("noms")) return false;
	var bons = MAISONS_MACHINES.every(function(m){ return valeursDnsCh7("noms", m + "." + DOMAINE_ILE).indexOf(IP_ILE[m]) > -1; });
	var mx = valeursDnsCh7("noms", DOMAINE_ILE, "MX").indexOf("poste." + DOMAINE_ILE + ".") > -1;
	var imap = valeursDnsCh7("noms", "imap." + DOMAINE_ILE).indexOf(IP_ILE.poste) > -1;
	return bons && mx && imap;
}
function serieCh7(h){ var z = zoneCh7(h); return z ? z.serie : null; }
function inverseCh7(h){ var z = zoneCh7(h, "70.0.10.in-addr.arpa"); return z; }
function transfertRestreintCh7(){
	var z = zoneCh7("noms");
	return !!z && listeAccepteIle(z.allowTransfer || [], IP_ILE.phare, null) && !listeAccepteIle(z.allowTransfer || [], IP_ILE.quai, null) && !listeAccepteIle(z.allowTransfer || [], IP_ILE.rive, null);
}
/* Un nom ajouté à chaud (nsupdate) dans la zone inverse, et toujours servi par la Maison des Noms. */
function ajoutDynamiqueCh7(){
	return (sCh7().ajoutsDyn || []).some(function(a){ return a.zone === "70.0.10.in-addr.arpa" && reponsesCh7("noms", a.nom, a.type).length > 0; });
}
/* La Poste : la configuration chargée. */
function paramsPosteCh7(){ var p = etatPostfixIle("poste"); return p.charge || null; }
function valeurPosteCh7(k){ var p = paramsPosteCh7(); return p ? developperPostfixIle("poste", p, valeurPostfixIle("poste", p, k)).trim() : null; }
function postfixOkCh7(){
	var p = paramsPosteCh7();
	if (!p || !postfixTourne("poste")) return false;
	var dest = listePostfixIle(valeurPosteCh7("mydestination")).map(function(x){ return x.toLowerCase(); });
	var reseaux = listePostfixIle(valeurPosteCh7("mynetworks"));
	var cf = lireMainCfIle("poste");
	return valeurPosteCh7("myhostname") === "poste." + DOMAINE_ILE && valeurPosteCh7("mydomain") === DOMAINE_ILE && dest.indexOf(DOMAINE_ILE) > -1 &&
		reseaux.indexOf("0.0.0.0/0") === -1 && valeurPosteCh7("relayhost") === "" && !cf.avertissements.length && JSON.stringify(cf.params) === JSON.stringify(p);
}
function fileInitialeVideeCh7(){ var ids = fileInitialePosteIle().map(function(m){ return m.id; }); return !etatPostfixIle("poste").file.some(function(m){ return ids.indexOf(m.id) > -1; }); }
function messagesJoueurCh7(){
	var c = comptePourIle("poste", JOUEUR);
	if (!c) return [];
	var b = boitesIle("poste", c, { sudo: true });
	return b.erreur ? [] : (b.boites.INBOX || []);
}
function imapOkCh7(){
	if (!dovecotTourne("poste")) return false;
	var r = reglagesDovecotIle("poste");
	if (!/^maildir:\/var\/mail\/%[un]\/?($|:)/.test(r.mail_location || "")) return false;
	return messagesJoueurCh7().length >= 4;
}
function dkimPublieCh7(){
	return Object.keys(etatIle("poste").dkim || {}).some(function(k){
		var sel = k.split(".")[0];
		return valeursDnsCh7("noms", sel + "._domainkey." + DOMAINE_ILE, "TXT").some(function(t){ var m = /p=([A-Za-z0-9+\/=]+)/.exec(t.replace(/\s/g, "")); return /v=DKIM1/.test(t) && m && cleDkimFabriqueeIle("poste", m[1]); });
	});
}
function spfCh7(){ return valeursDnsCh7("noms", DOMAINE_ILE, "TXT").some(function(t){ return /^v=spf1\b/.test(t) && /(\bmx\b|ip4:10\.0\.70\.25)/.test(t) && /[-~]all\s*$/.test(t); }); }
function dmarcCh7(){ return valeursDnsCh7("noms", "_dmarc." + DOMAINE_ILE, "TXT").some(function(t){ return /^v=DMARC1\b/.test(t) && /\bp=(quarantine|reject)\b/.test(t); }); }
/* Les Greniers : l'export actif de /srv/homes. */
function exportHomesCh7(){
	if (!nfsTourne("greniers")) return null;
	var e = etatNfsIle("greniers").actifs.filter(function(x){ return x.chemin === "/srv/homes" && clientCorrespondIle(x.client, "quai"); })[0];
	return e && !clientCorrespondIle(e.client, "rive") ? e : null;
}
function exportsOkCh7(){ var e = exportHomesCh7(); return !!e && e.options.rw && e.options.root_squash && e.options.sync; }
/* La Halle. */
function partagePromoCh7(){ return partageSambaIle("halle", "promo"); }
function partageOkCh7(){
	var p = partagePromoCh7();
	if (!p || !serviceActifIle("halle", "smbd") || p.lecture || p.invite) return false;
	if (!p.valides.some(function(v){ return /^[@+]promo$/.test(v); })) return false;
	var d = dossierHote("halle", p.path);
	return !!d && groupeNoeud("halle", d) === "promo" && d.mode.charAt(4) === "w";
}
/* Le Registre. */
function rootPwConnuCh7(){ var c = ldapIle().config; return !!c.rootPW && (hachagesIle()[c.rootPW] !== undefined || !/^\{/.test(c.rootPW)); }
function entreeUidCh7(uid){ return entreeLdapIle("uid=" + uid + ",ou=people," + SUFFIXE_ILE); }
function batisseursInscritsCh7(){
	return !!entreeLdapIle("ou=people," + SUFFIXE_ILE) && !!entreeLdapIle("ou=groups," + SUFFIXE_ILE) && BATISSEURS_ILE.every(function(b){
		var e = entreeUidCh7(b[0]);
		return e && valeursIle(e, "objectClass").some(function(x){ return x.toLowerCase() === "posixaccount"; }) && +valeursIle(e, "uidNumber")[0] === b[1] && +valeursIle(e, "gidNumber")[0] === GID_BATISSEURS && valeursIle(e, "homeDirectory")[0] === "/home/" + b[0];
	});
}
function groupeLdapCh7(cn){ return entreeLdapIle("cn=" + cn + ",ou=groups," + SUFFIXE_ILE); }
function groupesOkCh7(){
	var b = groupeLdapCh7("batisseurs"), p = groupeLdapCh7("promo");
	if (!b || !p) return false;
	var mb = valeursIle(b, "memberUid");
	return +valeursIle(b, "gidNumber")[0] === GID_BATISSEURS && BATISSEURS_ILE.every(function(x){ return mb.indexOf(x[0]) > -1; }) &&
		+valeursIle(p, "gidNumber")[0] === GID_PROMO && valeursIle(p, "memberUid").indexOf("zelia") > -1;
}
/* Les Portes. */
function sssdQuaiOkCh7(){
	var it = fichierHote("quai", "/etc/sssd/sssd.conf");
	return !!it && it.owner === "root" && it.mode === "rw-------" && sssdActifIle("quai") && nssUtiliseIle("quai", "passwd") && nssUtiliseIle("quai", "group") && !!utilisateurSssIle("quai", "badis");
}
function autofsOkCh7(){
	if (!autofsTourne("quai")) return false;
	// La carte doit donner à chacun SA maison : on l'éprouve sur deux habitants.
	return (etatAutofsIle("quai").charge || []).some(function(x){
		return x.point === "/home" && ["badis", "kamal"].every(function(nom){ var e = entreeCarteIle("quai", x.carte, nom); return e && new RegExp("^greniers(\\.port-aube\\.lan)?:/srv/homes/" + nom + "$").test(e.emplacement); });
	}) && vuCh7("autofsMonte");
}
/* La Forge : l'autorité de la cité (un certificat CA autosigné et sa clé, dans /srv/forge). */
function autoriteForgeCh7(){
	var d = dossierHote("forge", "/srv/forge");
	if (!d) return null;
	var cles = d.items.map(function(it){ return { it: it, c: lireCle(it.getText()) }; }).filter(function(x){ return x.c && !x.c.inconnu; });
	var r = null;
	d.items.forEach(function(it){
		if (r) return;
		var c = lireCertificat(it.getText());
		if (!c || c.inconnu || !c.ca || c.emetteur !== c.sujet || signataireIle(c) !== c.cle) return;
		var k = cles.filter(function(x){ return x.c.id === c.cle; })[0];
		if (k) r = { cert: c, cle: k.it, fichierCert: it, idCle: c.cle };
	});
	return r;
}
function cleForgeSortieCh7(id){
	var sortie = false;
	var garde = dossierHote("forge", "/srv/forge");
	HOTES_ILE.forEach(function(h){
		if (sortie || !estMaMachineIle(h)) return;
		(function visiter(l){
			if (sortie || !l || l === garde) return;
			l.items.forEach(function(it){ var t = it.getText ? it.getText() : ""; if (typeof t === "string" && t.indexOf("PRIVATE KEY") > -1){ var c = lireCle(t); if (c && c.id === id) sortie = true; } });
			l.children.forEach(function(c){ if (c.parents[0] === l) visiter(c); });
		})(racineIle(h));
	});
	return sortie;
}
function autoriteOkCh7(){
	var a = autoriteForgeCh7(), d = dossierHote("forge", "/srv/forge");
	return !!a && a.cle.mode === "rw-------" && a.cle.owner === "root" && !!d && d.mode === "rwx------" && !cleForgeSortieCh7(a.idCle);
}
function sceauPosteOkCh7(){
	var a = autoriteForgeCh7(), t = tlsDovecotIle("poste");
	if (!a || t.erreur || !dovecotTourne("poste")) return false;
	var c = t.cert;
	return c.emetteur === a.cert.sujet && signataireIle(c) === a.idCle && nomCouvert(c, "poste." + DOMAINE_ILE) && confianceIle("quai").some(function(x){ return x.serie === a.cert.serie; });
}
/* L'Arche. */
var DEPOT_ARCHE_CH7 = "arche:/srv/borg/greniers";
function depotArcheCh7(){ return etatBorgIle().depots[DEPOT_ARCHE_CH7] || null; }
function ligneArcheCh7(){
	return (lireIle("arche", "/home/borg/.ssh/authorized_keys") || "").split("\n").filter(function(l){ var o = optionsAuthorizedIle(l); return blocCleIle(l) && o.restrict && /^(\/usr\/bin\/)?borg serve\b/.test(o.commande || "") && /--restrict-to-(path|repository)[ =]\/srv\/borg\/greniers\b/.test(o.commande || ""); })[0] || null;
}
function depotOkCh7(){
	var d = depotArcheCh7(), ph = fichierHote("greniers", "/root/.borg-phrase");
	if (!d || d.chiffrement === "none" || !ligneArcheCh7() || !ph || ph.mode !== "rw-------" || ph.owner !== "root") return false;
	if (ph.getText().replace(/\n$/, "").trim() !== d.phrase) return false;
	return d.archives.some(function(a){ return a.entrees.some(function(e){ return /^srv\/homes\//.test(e.c); }); });
}
function timerBorgOkCh7(){
	var e = etatUnite("greniers", "sauvegarde-borg.timer");
	var t = lireIle("greniers", "/etc/systemd/system/sauvegarde-borg.timer") || "";
	return e.enabled && e.actif && /OnCalendar\s*=/.test(t);
}
function derniereArchiveCh7(){ var d = depotArcheCh7(); if (!d || !d.archives.length) return null; return d.archives.slice().sort(function(a, b){ return b.date - a.date; })[0]; }

/* Chaque étape : l'état réel des machines (etat, qui compte dans le chantier) et ce que le joueur a constaté (vus). */
var ETATS_CH7 = {
	p7_zone: function(){ return zonePrimaireOkCh7(); },
	p7_serie: function(){ return zonePrimaireOkCh7() && valeursDnsCh7("noms", "imprimerie." + DOMAINE_ILE).indexOf(IP_ILE.imprimerie) > -1 && valeursDnsCh7("noms", "bibliotheque." + DOMAINE_ILE).indexOf(IP_ILE.bibliotheque) > -1 && (serieCh7("noms") || 0) > SERIE_INITIALE_CH7; },
	p7_secondaire: function(){ var zs = zoneCh7("phare"); return bindTourne("phare") && !!zs && zs.type === "secondary" && zs.serie === serieCh7("noms") && transfertRestreintCh7(); },
	p7_inverse: function(){ var p = inverseCh7("noms"), s = inverseCh7("phare"); return !!p && p.type === "primary" && !!s && s.type === "secondary" && s.serie === p.serie && valeursDnsCh7("noms", "25.70.0.10.in-addr.arpa", "PTR").indexOf("poste." + DOMAINE_ILE + ".") > -1 && ajoutDynamiqueCh7(); },
	p7_postfix: function(){ return postfixOkCh7(); },
	p7_courrier: function(){ return postfixOkCh7() && fileInitialeVideeCh7() && vuCh7("lettreArrivee") && valeursDnsCh7("noms", DOMAINE_ILE, "MX").indexOf("poste." + DOMAINE_ILE + ".") > -1; },
	p7_imap: function(){ return imapOkCh7(); },
	p7_usurpation: function(){ return spfCh7() && dmarcCh7() && dkimPublieCh7(); },
	p7_exports: function(){ return exportsOkCh7(); },
	p7_squash: function(){ return exportsOkCh7() && vuCh7("squash") && vuCh7("montageNfs"); },
	p7_partage: function(){ return partageOkCh7(); },
	p7_promo_acces: function(){ return partageOkCh7() && vuCh7("smbPutPromo"); },
	p7_annuaire: function(){ return slapdTourne() && rootPwConnuCh7() && batisseursInscritsCh7(); },
	p7_groupes: function(){ return slapdTourne() && groupesOkCh7(); },
	p7_sssd: function(){ return sssdQuaiOkCh7(); },
	p7_autofs: function(){ return autofsOkCh7(); },
	p7_autorite: function(){ return autoriteOkCh7(); },
	p7_sceaux: function(){ return sceauPosteOkCh7(); },
	p7_depot: function(){ return depotOkCh7(); },
	p7_restauration: function(){ return depotOkCh7() && timerBorgOkCh7(); }
};
var VALIDATIONS_CH7 = {
	p7_zone: function(){ return ETATS_CH7.p7_zone() && vuCh7("checkzone") && vuCh7("digNoms"); },
	p7_serie: function(){ return ETATS_CH7.p7_serie() && vuCh7("digSoa"); },
	p7_secondaire: function(){ return ETATS_CH7.p7_secondaire() && vuCh7("axfrRefuse"); },
	p7_inverse: function(){ return ETATS_CH7.p7_inverse() && vuCh7("digX"); },
	p7_postfix: function(){ return ETATS_CH7.p7_postfix() && vuCh7("postconfN") && vuCh7("postfixCheck"); },
	p7_courrier: function(){ return ETATS_CH7.p7_courrier() && vuCh7("mailqVue"); },
	p7_imap: function(){ return ETATS_CH7.p7_imap() && vuCh7("doveadmUser") && vuCh7("doveadmListe"); },
	p7_usurpation: function(){ return ETATS_CH7.p7_usurpation() && vuCh7("digSpf") && vuCh7("digDkim") && vuCh7("digDmarc"); },
	p7_exports: function(){ return ETATS_CH7.p7_exports() && vuCh7("exportfsV") && vuCh7("showmount"); },
	p7_squash: function(){ return ETATS_CH7.p7_squash(); },
	p7_partage: function(){ return ETATS_CH7.p7_partage() && vuCh7("testparm"); },
	p7_promo_acces: function(){ return ETATS_CH7.p7_promo_acces() && vuCh7("pdbeditL") && vuCh7("smbListe"); },
	p7_annuaire: function(){ return ETATS_CH7.p7_annuaire() && vuCh7("ldapsearchX"); },
	p7_groupes: function(){ return ETATS_CH7.p7_groupes() && vuCh7("ldapmodifyMembre"); },
	p7_sssd: function(){ return ETATS_CH7.p7_sssd() && vuCh7("getentQuai") && vuCh7("idQuai"); },
	p7_autofs: function(){ return ETATS_CH7.p7_autofs(); },
	p7_autorite: function(){ return ETATS_CH7.p7_autorite(); },
	p7_sceaux: function(){ return ETATS_CH7.p7_sceaux() && vuCh7("sclientOk"); },
	p7_depot: function(){ return ETATS_CH7.p7_depot(); },
	p7_restauration: function(){ return ETATS_CH7.p7_restauration() && vuCh7("borgCheck") && vuCh7("restaurationComparee"); }
};
function maisonBatieCh7(cle){ var m = maisonCh7(cle); return !!m && m.etapes.every(function(id){ return !!state.quests[id]; }); }
function maisonsBatiesCh7(){ return MAISONS_CH7.filter(function(m){ return maisonBatieCh7(m.cle); }); }

/* ------------------------------------------------------------------ */
/* Ce que le joueur constate : les sorts lancés sur l'île, et leur sortie */
/* ------------------------------------------------------------------ */

function optionsCh7(args){ return args.filter(function(a){ return /^-[A-Za-z0-9]+$/.test(a); }).join("").replace(/-/g, ""); }
function noterCh7(h, nom, args, sortie, io, erreur){
	var o = optionsCh7(args), t = sortie + (erreur ? "\n" + erreur : "");
	// Les constats ne dépendent pas de l'ordre : qui répare d'abord et regarde ensuite n'est pas bloqué.
	if (nom === "dig"){
		if (!erreur && /ANSWER SECTION|^\S+\.\s+\d+\s+IN\s+/m.test(sortie) && /@noms|10\.0\.70\.53/.test(args.join(" ") + sortie) || (!erreur && args.indexOf("+short") > -1 && sortie.trim() && args.some(function(a){ return /^@(noms|10\.0\.70\.53)/.test(a); }))) noterVuCh7("digNoms");
		if (!erreur && args.some(function(a){ return /^soa$/i.test(a); })){ var m = /\b(20\d{8})\b/.exec(sortie); if (m && +m[1] > SERIE_INITIALE_CH7) noterVuCh7("digSoa"); }
		if (args.some(function(a){ return /^axfr$/i.test(a); }) && /Transfer failed|XFR size|refused/i.test(t) && /failed/i.test(t)) noterVuCh7("axfrRefuse");
		if (args.indexOf("-x") > -1 && /PTR/.test(sortie) && /port-aube\.lan\./.test(sortie)) noterVuCh7("digX");
		if (args.some(function(a){ return /^txt$/i.test(a); })){
			if (/v=spf1/.test(sortie)) noterVuCh7("digSpf");
			if (/v=DKIM1/.test(sortie)) noterVuCh7("digDkim");
			if (/v=DMARC1/.test(sortie)) noterVuCh7("digDmarc");
		}
	}
	if ((nom === "named-checkzone" || (nom === "named-checkconf" && o.indexOf("z") > -1)) && !erreur && /OK|loaded serial/.test(sortie) && /port-aube/.test(args.join(" ") + sortie)) noterVuCh7("checkzone");
	if (nom === "named-checkconf" && o.indexOf("z") > -1 && !erreur && /zone port-aube\.lan\/IN: loaded serial/.test(sortie)) noterVuCh7("checkzone");
	if (nom === "postconf" && o.indexOf("n") > -1) noterVuCh7("postconfN");
	if (nom === "postfix" && args.indexOf("check") > -1 && io.sudo && !erreur && sortie.trim() === "") noterVuCh7("postfixCheck");
	if ((nom === "mailq" || (nom === "postqueue" && o.indexOf("p") > -1)) && /Connection timed out|deferred|\(.*\)/.test(sortie)) noterVuCh7("mailqVue");
	if (nom === "doveadm" && !erreur && args[0] === "user" && /uid/.test(sortie)) noterVuCh7("doveadmUser");
	if (nom === "doveadm" && !erreur && args[0] === "mailbox" && (args[1] === "list" || args[1] === "status") && sortie.trim()) noterVuCh7("doveadmListe");
	if (nom === "exportfs" && o.indexOf("v") > -1 && /\/srv\/homes/.test(sortie)) noterVuCh7("exportfsV");
	if (nom === "showmount" && /\/srv\/homes/.test(sortie) && h !== "greniers") noterVuCh7("showmount");
	if (h && io.sudo && /Permission non accordée|Permission denied|Operation not permitted/.test(t) && montagesNfsIle(h).some(function(m){ return args.some(function(a){ var p = a.charAt(0) === "/" ? cheminNormal(a) : cheminNormal((cheminDuLieuMachine(current_room) || "/") + "/" + a); return p === m.cible || p.indexOf(m.cible + "/") === 0; }); })) noterVuCh7("squash");
	if (nom === "testparm" && /\[promo\]/.test(sortie)) noterVuCh7("testparm");
	if (nom === "pdbedit" && o.indexOf("L") > -1 && sortie.trim()) noterVuCh7("pdbeditL");
	if (nom === "smbclient" && /Sharename/.test(sortie) && /promo/.test(sortie)) noterVuCh7("smbListe");
	if (nom === "ldapsearch" && !erreur && /uid: /.test(sortie) && /badis/.test(sortie)) noterVuCh7("ldapsearchX");
	if (nom === "getent" && args[0] === "passwd" && h === "quai" && /:\/home\//.test(sortie) && BATISSEURS_ILE.some(function(b){ return sortie.indexOf(b[0] + ":") === 0; })) noterVuCh7("getentQuai");
	if (nom === "id" && h === "quai" && /uid=100\d\d/.test(sortie)) noterVuCh7("idQuai");
	// La comparaison ne vaut que contre ce que borg a vraiment restauré (un dossier copié à la main ne prouve rien).
	if (nom === "diff" && h === "greniers" && !erreur && sortie.trim() === "" && !io.code && args.some(function(a){ return /^\/srv\/homes\//.test(a); })){
		var ici = cheminDuLieuMachine(current_room) || "/";
		var restaures = (sCh7().extraits || []).filter(function(x){ return x.hote === "greniers"; });
		if (args.some(function(a){ var p = cheminNormal(a.charAt(0) === "/" ? a : ici + "/" + a); return restaures.some(function(x){ return p.indexOf(cheminNormal(x.ou + "/srv/homes/")) === 0; }); })) noterVuCh7("restaurationComparee");
	}
	if (nom === "chantier" && sCh7().tempete) noterVuCh7("chantierTempete");
}
var APPELER_AVANT_CH7 = Shell.appeler;
Shell.appeler = function(nom, args, io){
	var h = ileOuverte() ? ileIci() : null, sortie, erreur = null;
	try { sortie = APPELER_AVANT_CH7.apply(this, arguments); }
	catch (e){ erreur = e; }
	try {
		if (h || ileOuverte()) noterCh7(h, nom, args || [], typeof sortie === "string" ? sansAnsi(sortie) : "", io || {}, erreur ? sansAnsi(String(erreur.message || erreur)) : null);
	} catch (x){ /* une lecture ne doit jamais casser un sort */ }
	if (erreur) throw erreur;
	return sortie;
};
/* Les événements des machines : ce que la sortie seule ne dit pas. */
GameEvents.addListener("ile", function(e){
	if (!ileOuverte()) return;
	if (e.cmd === "livraison" && e.statut === "sent" && e.de && e.de.indexOf(JOUEUR + "@") === 0) noterVuCh7("lettreArrivee");
	if (e.cmd === "montageNfs" && e.serveur === "greniers" && e.ok !== false) noterVuCh7("montageNfs");
	if (e.cmd === "chown-squash") noterVuCh7("squash");
	if (e.cmd === "smbPut" && e.partage && e.partage.toLowerCase() === "promo"){
		var p = groupeLdapCh7("promo");
		if (p && valeursIle(p, "memberUid").indexOf(e.compte) > -1) noterVuCh7("smbPutPromo");
	}
	if (e.cmd === "ldapModify" && /^uid=|^cn=/.test(e.dn || "") && (e.attrs || []).some(function(a){ return /^memberuid$/i.test(a); })) noterVuCh7("ldapmodifyMembre");
	if (e.cmd === "autofs" && e.ok && e.hote === "quai") noterVuCh7("autofsMonte");
	if (e.cmd === "s_client" && e.hote === "quai" && e.serveur === "poste" && e.ok && e.verification === 0) noterVuCh7("sclientOk");
	if (e.cmd === "borg" && e.ordre === "extract" && e.ok && !e.essai && e.extraits > 0){
		noterVuCh7("borgExtract");
		var cx = sCh7(); cx.extraits = cx.extraits || []; cx.extraits.push({ hote: e.hote, ou: e.ou });
	}
	if (e.cmd === "borg" && e.ordre === "check" && e.ok) noterVuCh7("borgCheck");
	if (e.cmd === "smbclient" && e.ok && e.liste && partagePromoCh7()) noterVuCh7("smbListe");
	if (e.cmd === "nsupdate" && e.hote === "noms" && e.zone){
		var c = sCh7(); c.ajoutsDyn = c.ajoutsDyn || [];
		(e.ops || []).forEach(function(o){ if (o.action === "add" && o.nom && o.type) c.ajoutsDyn.push({ zone: e.zone.replace(/\.$/, ""), nom: o.nom, type: o.type }); });
	}
});

/* La Poste fait d'elle-même ce que fait qmgr : elle retente la file de temps en temps (toutes les cinq minutes). */
function reessaisPosteCh7(){
	if (!postfixTourne("poste")) return;
	var p = etatPostfixIle("poste"), t = maintenantMachine("poste");
	if (!p.file.length) return;
	if (p.dernierEssai && t - p.dernierEssai < 5 * 60000) return;
	p.dernierEssai = t;
	viderFilePostfixIle("poste");
}

/* ------------------------------------------------------------------ */
/* Acte II : la Tempête                                                 */
/* ------------------------------------------------------------------ */

function remplacerFichierCh7(h, chemin, f){ var it = fichierHote(h, chemin); if (!it) return false; var t = it.getText(), n = f(t); if (n !== t) moteurSeul(function(){ it.setText(n); }); return true; }
function augmenterSerieTexteCh7(t){ return t.replace(/(\bSOA\b[^(]*\(\s*)(\d{1,10})/, function(x, a, s){ return a + (+s + 1); }); }
var INCIDENTS_TEMPETE_CH7 = {
	noms: { phrase: "la foudre a frappé la zone : le MX a perdu son point final (dig MX port-aube.lan)",
		poser: function(){
			var z = zoneCh7("noms"); if (!z || !z.fichier) return;
			remplacerFichierCh7("noms", z.fichier, function(t){ return augmenterSerieTexteCh7(t.replace(/(\bIN\s+MX\s+\d+\s+)\S+/g, "$1poste.port-aube.lan")); });
			chargerBindIle("noms", "reload");
		},
		reparee: function(){ return valeursDnsCh7("noms", DOMAINE_ILE, "MX").indexOf("poste." + DOMAINE_ILE + ".") > -1 && valeursDnsCh7("noms", DOMAINE_ILE, "MX").length === 1; } },
	phare: { phrase: "le vent a coupé le fil du phare : il garde une vieille série de la zone (dig @phare port-aube.lan SOA)",
		poser: function(){
			var z = zoneCh7("noms"); if (!z || !z.fichier) return;
			remplacerFichierCh7("noms", z.fichier, function(t){ return augmenterSerieTexteCh7(t.replace(/\n?$/, "\ncapitainerie\tIN\tA\t10.0.70.60\n")); });
			NOTIFY_COUPE_CH7 = true;
			try { chargerBindIle("noms", "reload"); } finally { NOTIFY_COUPE_CH7 = false; }
		},
		reparee: function(){ var s = serieCh7("phare"); return s !== null && s === serieCh7("noms"); } },
	poste: { phrase: "une rafale a rouvert la Poste à tous les vents : mynetworks = 0.0.0.0/0 (postconf mynetworks)",
		poser: function(){
			remplacerFichierCh7("poste", "/etc/postfix/main.cf", function(t){ return /^mynetworks\s*=.*$/m.test(t) ? t.replace(/^mynetworks\s*=.*$/m, "mynetworks = 0.0.0.0/0") : t.replace(/\n?$/, "\nmynetworks = 0.0.0.0/0\n"); });
			if (postfixTourne("poste")) chargerPostfixIle("poste");
		},
		reparee: function(){ return listePostfixIle(valeurPosteCh7("mynetworks") || "").indexOf("0.0.0.0/0") === -1; } },
	lettres: { phrase: "l'eau est entrée au Bureau des Lettres : ta boîte appartient à root (doveadm mailbox list)",
		poser: function(){ var d = dossierHote("poste", "/var/mail/" + JOUEUR); if (d){ d.owner = "root"; ["new", "cur", "tmp"].forEach(function(s){ var x = d.getChildFromName(s); if (x !== -1) x.owner = "root"; }); } },
		reparee: function(){ var d = dossierHote("poste", "/var/mail/" + JOUEUR); return !!d && d.owner === JOUEUR && ["new", "cur"].every(function(s){ var x = d.getChildFromName(s); return x === -1 || x.owner === JOUEUR; }); } },
	greniers: { phrase: "une restauration de secours a remis no_root_squash sur /srv/homes (exportfs -v)",
		poser: function(){
			remplacerFichierCh7("greniers", "/etc/exports", function(t){ return t.replace(/^(\/srv\/homes\s+.*)$/m, function(l){ return l.replace(/\broot_squash\b/, "no_root_squash").replace(/no_no_root_squash/, "no_root_squash"); }); });
			if (nfsTourne("greniers")) chargerExportsIle("greniers");
		},
		reparee: function(){ var e = exportHomesCh7(); return !!e && e.options.root_squash; } },
	halle: { phrase: "une bourrasque a ouvert la Halle aux invités : guest ok = yes sur [promo] (testparm -s)",
		poser: function(){ remplacerFichierCh7("halle", "/etc/samba/smb.conf", function(t){ return t.replace(/^(\s*\[promo\][^\n]*\n)/m, "$1   guest ok = yes\n"); }); },
		reparee: function(){ var p = partagePromoCh7(); return !!p && !p.invite; } },
	registre: { phrase: "une page du Registre s'est envolée : Zélia n'est plus dans la promo (ldapsearch cn=promo)",
		poser: function(){ var p = groupeLdapCh7("promo"); if (p){ var k = Object.keys(p.attrs).filter(function(x){ return x.toLowerCase() === "memberuid"; })[0]; if (k) p.attrs[k] = p.attrs[k].filter(function(v){ return v !== "zelia"; }); } },
		reparee: function(){ var p = groupeLdapCh7("promo"); return !!p && valeursIle(p, "memberUid").indexOf("zelia") > -1; } },
	portes: { phrase: "le cache des Portes a gardé une vieille page : getent passwd badis donne une ancienne maison (sss_cache)",
		poser: function(){ var S = etatSssdIle("quai"); S.cache.badis = { v: { nom: "badis", uid: 10001, gid: 10000, gecos: "Badis", home: "/home/ancien-campus/badis", shell: "/bin/bash", sss: true, dn: "uid=badis,ou=people," + SUFFIXE_ILE }, a: maintenantMachine("quai") }; },
		reparee: function(){ var u = utilisateurSssIle("quai", "badis"); return !!u && u.home === "/home/badis"; } },
	forge: { phrase: "la tempête a renversé l'étal de la Forge : Dovecot sert de nouveau un sceau de pacotille (openssl s_client)",
		poser: function(){
			remplacerFichierCh7("poste", "/etc/dovecot/conf.d/10-ssl.conf", function(t){ return t.replace(/^ssl_cert\s*=.*$/m, "ssl_cert = </etc/dovecot/private/dovecot.pem").replace(/^ssl_key\s*=.*$/m, "ssl_key = </etc/dovecot/private/dovecot.key"); });
			if (dovecotTourne("poste")) chargerDovecotIle("poste");
		},
		reparee: function(){ return sceauPosteOkCh7(); } },
	arche: { phrase: "la foudre a coupé une sauvegarde en plein vol : un verrou est resté sur le dépôt de l'Arche (borg list)",
		poser: function(){ poserVerrouBorgIle("arche", "/srv/borg/greniers"); },
		reparee: function(){ var d = depotArcheCh7(), c = sCh7(); return !!d && !d.verrou && d.archives.some(function(a){ return a.date >= (c.tempeteDebut || 0); }); } }
};
var NOTIFY_COUPE_CH7 = false;
var NOTIFIER_AVANT_CH7 = notifierIle;
notifierIle = function(h, nom){ if (NOTIFY_COUPE_CH7) return; return NOTIFIER_AVANT_CH7.apply(this, arguments); };
function incidentsRestantsCh7(){
	var c = sCh7(), l = [];
	Object.keys(c.incidentsTempete || {}).forEach(function(cle){ if (c.incidentsTempete[cle] && INCIDENTS_TEMPETE_CH7[cle] && !INCIDENTS_TEMPETE_CH7[cle].reparee()) l.push(cle); });
	if (c.maree && !SURPRISE_MAREE_CH7.reparee()) l.push("maree");
	return l;
}
function leverTempeteCh7(enAvance){
	var c = sCh7();
	if (c.tempete) return;
	c.tempete = true;
	c.tempeteDebut = maintenantCh7();
	c.tempeteEnAvance = !!enAvance;
	c.incidentsTempete = {};
	var frappees = [];
	MAISONS_CH7.forEach(function(m){
		if (!maisonBatieCh7(m.cle)) return;
		frappees.push(m);
		c.incidentsTempete[m.cle] = true;
		try { INCIDENTS_TEMPETE_CH7[m.cle].poser(); } catch (e){}
		journalMachine(m.machine, { unite: "tempete", prio: 2, message: "la Tempête frappe " + m.titre + " : " + INCIDENTS_TEMPETE_CH7[m.cle].phrase });
	});
	if (!state.has("rejeuEnCours")){
		say(C.rouge(enAvance ? "La Tempête arrive en avance." : "14 h. La Tempête frappe Port-Aube.") + " Le ciel se déchire, la mer monte à l'assaut de la jetée, et les éclairs cherchent les toits neufs. " +
			(frappees.length ? "Elle frappe chaque maison déjà debout : " + frappees.map(function(m){ return m.titre + " (" + INCIDENTS_TEMPETE_CH7[m.cle].phrase + ")"; }).join(" ; ") + "." :
				"Aucune maison n'est encore debout : la tempête hurle sur des murs vides, et passe.") + "\n" +
			C.gris("(Radio : « Grace : tiens bon, Architecte. Lis avant d'agir, répare une chose à la fois. chantier te dit tout. »)"));
	}
}

/* ------------------------------------------------------------------ */
/* Acte III : la Marée                                                  */
/* ------------------------------------------------------------------ */

var CONSEQUENCES_MAREE_CH7 = {
	noms: "les étudiants cherchent leurs maisons sur des panneaux sans noms",
	phare: "le phare reste muet, et le navire entre au port à l'aveugle",
	poste: "les lettres des familles s'entassent sur le quai, sans facteur",
	lettres: "personne ne sait où lire son courrier, et un faux message court déjà",
	greniers: "les sacs restent sur le pont : les Greniers sont fermés",
	halle: "la promo se cherche un endroit où se retrouver",
	registre: "le Registre ne connaît personne : on note les noms sur des bouts de papier",
	portes: "les Portes ne reconnaissent pas les arrivants",
	forge: "chaque maison montre un sceau que personne ne peut vérifier",
	arche: "rien de ce qui arrive ce soir n'est encore à l'abri"
};
var SURPRISE_MAREE_CH7 = { phrase: "le capitaine a inscrit son navire dans la zone, à la main, sans changer la série : le Phare ne le connaît pas (dig @phare navire.port-aube.lan)",
	poser: function(){
		var z = zoneCh7("noms");
		var chemin = z && z.fichier ? z.fichier : "/etc/bind/zones/db.port-aube.lan";
		remplacerFichierCh7("noms", chemin, function(t){ return t.replace(/\n?$/, "\n; Ajouté par le capitaine, à la marée\nnavire\t\tIN\tA\t10.0.70.200\n"); });
		if (bindTourne("noms")){ NOTIFY_COUPE_CH7 = true; try { chargerBindIle("noms", "reload"); } finally { NOTIFY_COUPE_CH7 = false; } }
	},
	reparee: function(){ return valeursDnsCh7("phare", "navire." + DOMAINE_ILE).indexOf("10.0.70.200") > -1; } };
function arriverMareeCh7(enAvance){
	var c = sCh7();
	if (c.maree) return;
	c.maree = true;
	c.mareeDebut = maintenantCh7();
	c.mareeEnAvance = !!enAvance;
	var inachevees = MAISONS_CH7.filter(function(m){ return !maisonBatieCh7(m.cle); });
	c.inacheveesMaree = inachevees.map(function(m){ return m.cle; });
	SURPRISE_MAREE_CH7.poser();
	journalMachine("noms", { unite: "capitainerie", prio: 4, message: "la marée : " + SURPRISE_MAREE_CH7.phrase });
	if (!state.has("rejeuEnCours")){
		say(C.jaune(enAvance ? "La marée monte plus tôt que prévu : le navire est là." : "19 h. La marée est haute.") + " Le navire glisse dans la passe, toutes voiles serrées, et ses cinq cents passagers se pressent au bastingage pour voir la cité. " +
			(inachevees.length ? "Mais tout n'est pas prêt : " + inachevees.map(function(m){ return m.titre + " (" + CONSEQUENCES_MAREE_CH7[m.cle] + ")"; }).join(" ; ") + "." : "Les dix maisons sont debout, lanternes allumées : la cité attend ses habitants.") +
			" Et sur la capitainerie, " + SURPRISE_MAREE_CH7.phrase + ".\n" +
			C.gris("(Radio : « Grace : la passerelle descend. Le premier étudiant va poser le pied sur l'île : que chaque porte s'ouvre devant lui. »)"));
	}
}

/* ------------------------------------------------------------------ */
/* Le Premier Pas : le premier étudiant se connecte depuis le quai      */
/* ------------------------------------------------------------------ */

function prenomEtudiantValideCh7(nom){ return /^[a-z][a-z0-9-]{1,30}$/.test(nom) && !BATISSEURS_ILE.some(function(b){ return b[0] === nom; }) && nom !== "passager" && nom !== JOUEUR; }
/* Les six portes, vérifiées sur l'état réel des machines. */
function portesPremierPasCh7(nom){
	var l = [];
	var u = utilisateurSssIle("quai", nom);
	var e = entreeUidCh7(nom), promo = groupeLdapCh7("promo");
	var membre = !!u && ((+u.gid === GID_PROMO) || (!!promo && valeursIle(promo, "memberUid").indexOf(nom) > -1));
	l.push({ ok: !!u && !!e && membre, porte: "le Grand Registre", texte: u ? "le Registre connaît " + nom + " (uid " + u.uid + ")" + (membre ? ", de la promo" : ", mais pas dans la promo") : "le Registre ne connaît pas " + nom,
		conseil: "un compte posixAccount sous ou=people, gidNumber 10100 (la promo), userPassword ; et memberUid: " + nom + " dans cn=promo" });
	var home = u ? u.home : "/home/" + nom, monte = false;
	if (u){ try { declencherAutofsIle("quai", home); } catch (x){} monte = montagesNfsIle("quai").some(function(m){ return m.cible === home && m.serveur === "greniers"; }); }
	var dossier = u ? dossierHote("greniers", "/srv/homes/" + nom) : null;
	var aLui = !!dossier && (dossier.owner === String(u.uid) || dossier.owner === nom);
	l.push({ ok: monte && aLui, porte: "les Greniers", texte: monte ? "sa maison " + home + " s'ouvre depuis les Greniers" + (aLui ? ", et elle est à lui" : ", mais elle appartient à quelqu'un d'autre") : "sa maison " + home + " ne s'ouvre pas",
		conseil: "sur greniers : sudo mkdir /srv/homes/" + nom + " ; sudo chown UIDNUMBER:" + GID_PROMO + " /srv/homes/" + nom });
	var cp = comptePourIle("poste", nom), lettres = 0;
	if (cp){ var b = boitesIle("poste", cp, { sudo: true }); if (!b.erreur) lettres = (b.boites.INBOX || []).length; }
	l.push({ ok: lettres > 0, porte: "la Poste", texte: lettres ? "une lettre l'attend dans sa boîte (" + lettres + ")" : "sa boîte est vide" + (cp ? "" : " : la Poste ne le connaît pas"),
		conseil: "sur poste : echo 'Bienvenue à Port-Aube' | mail -s 'Bienvenue' " + nom });
	var smb = etatSambaIle("halle").comptes[nom], p = partagePromoCh7(), uh = comptePourIle("halle", nom);
	var gh = uh ? groupesCompteIle("halle", uh) : [];
	var halleOk = !!smb && smb.actif && !!p && !p.invite && gh.indexOf("promo") > -1 && dansListeSambaIle(p.valides.length ? p.valides : ["@promo"], uh, gh);
	l.push({ ok: halleOk, porte: "la Halle", texte: halleOk ? "le partage de la promo lui est ouvert" : "la Halle ne lui ouvre pas le partage de la promo",
		conseil: "sur halle : sudo smbpasswd -a " + nom + " (et " + nom + " dans la promo)" });
	var t = tlsDovecotIle("poste"), sceau = false;
	if (!t.erreur){ var v = verifierChaineIle("quai", t.cert, confianceIle("quai"), "poste." + DOMAINE_ILE); sceau = v.code === 0; }
	l.push({ ok: sceau, porte: "la Forge", texte: sceau ? "le sceau de la Poste est reconnu (signé par la Forge)" : "le sceau de la Poste n'est pas reconnu depuis le quai",
		conseil: "Dovecot doit servir le certificat signé par la Forge, et le quai faire confiance à la Forge" });
	var a = derniereArchiveCh7(), garde = !!a && a.entrees.some(function(x){ return x.c === "srv/homes/" + nom; });
	l.push({ ok: garde, porte: "l'Arche", texte: garde ? "sa maison est déjà dans la dernière sauvegarde de l'Arche" : "sa maison n'est pas dans la dernière sauvegarde de l'Arche",
		conseil: "sur greniers : sudo systemctl start sauvegarde-borg (une sauvegarde fraîche, après la création de sa maison)" });
	return l;
}
var SSH_AVANT_CH7 = Shell.sorts.ssh;
Shell.sorts.ssh = function(args, io){
	var cible = args.filter(function(a){ return a.charAt(0) !== "-"; })[0];
	var m = cible ? /^([a-z][a-z0-9-]*)@([A-Za-z0-9.-]+)$/.exec(cible) : null;
	var h = m ? resoudreHoteIle(m[2]) : null;
	if (!ileOuverte() || !m || h !== "quai" || utilisateurLocalIle("quai", m[1]) || MOTS_DE_PASSE_ILE["quai:" + m[1]] !== undefined) return SSH_AVANT_CH7.apply(this, arguments);
	var nom = m[1];
	if (!io.tty || !term || !term.demander) throw new ShellError("ssh : la connexion d'un compte de l'annuaire se fait à l'écran (son mot de passe est demandé).", 255);
	if (!serviceActifIle("quai", "ssh")) throw new ShellError("ssh: connect to host " + m[2] + " port 22: Connection refused", 255);
	term.demander(nom + "@" + m[2] + "'s password: ", true, function(phrase){
		var a = authentifierSssIle("quai", nom, phrase);
		if (!a.ok){
			journalIle("quai", "sshd", "ssh", a.raison === "inconnu" ? "Invalid user " + nom + " from " + (ipIle(Shell.hote()) || "10.0.70.1") + " port 50412" : "Failed password for " + nom + " from " + (ipIle(Shell.hote()) || "10.0.70.1") + " port 50412 ssh2", 5);
			term.echo("Permission denied, please try again.\n" + C.gris(a.raison === "inconnu" ? "(Le quai ne connaît pas ce compte : il le cherche dans /etc/passwd, puis dans le Registre par sssd. getent passwd " + nom + ", sur le quai.)" :
				(a.raison === "hors-ligne" ? "(sssd ne joint pas le Registre : sans lui, on ne vérifie pas un mot de passe.)" : "(Ce n'est pas son mot de passe dans le Registre.)")));
			io.code = 255;
			Shell.fin();
			return;
		}
		journalIle("quai", "sshd", "ssh", "Accepted password for " + nom + " from " + (ipIle(Shell.hote()) || "10.0.70.1") + " port 50412 ssh2");
		var c = sCh7(), portes = portesPremierPasCh7(nom), tout = portes.every(function(x){ return x.ok; });
		var lignes = ["Linux quai 6.1.0-26-amd64 #1 SMP PREEMPT_DYNAMIC Debian 6.1.112-1 x86_64", "", C.gras("Port-Aube · le quai. Bienvenue, " + nom + "."), ""];
		portes.forEach(function(x){ lignes.push("  " + (x.ok ? C.vert("✓") : C.rouge("✗")) + " " + completerDroite(x.porte, 20) + x.texte + (x.ok ? "" : "\n      " + C.gris("→ " + x.conseil))); });
		evenementIle("quai", "premierPas", { compte: nom, ok: tout, portes: portes.map(function(x){ return x.ok; }) });
		if (tout && !c.maree){
			lignes.push("", C.gris("(Tout est prêt, mais le navire n'est pas encore à quai : " + nom + " n'a pas encore débarqué. Reviens quand la marée sera là.)"));
		} else if (tout){
			c.premierPas = nom;
			c.premierPasA = c.horloge;
			lignes.push("", C.jaune("« " + nom + " se tient au bout de la passerelle, son sac sur l'épaule, et lève les yeux vers la cité. Ses doigts tremblent un peu sur le clavier du quai. Sa maison s'ouvre, une lettre l'attend, la promo l'accueille, et le sceau brille, vrai. »"),
				C.gris("(Connection to quai closed.)"));
		} else lignes.push("", C.gris("(Il manque des portes. " + nom + " attend sur le quai, son sac à la main. Connection to quai closed.)"));
		term.echo(lignes.join("\n"));
		Shell.fin();
	});
	return "";
};

/* ------------------------------------------------------------------ */
/* Le plan de la cité : la note du chantier, de 0 à 100                 */
/* ------------------------------------------------------------------ */

function scoreChantierCh7(){
	var ids = Object.keys(ETATS_CH7), ok = ids.filter(function(id){ try { return ETATS_CH7[id](); } catch (e){ return false; } }).length;
	var s = 10 + 90 * ok / ids.length - 3 * incidentsRestantsCh7().length;
	return Math.max(0, Math.min(100, Math.round(s)));
}

/* ------------------------------------------------------------------ */
/* L'avancée du chapitre                                               */
/* ------------------------------------------------------------------ */

function validerCh7(){
	var c = sCh7();
	if (!state.quests["p7_chantier"] && state.has("ch7LaurentLu") && state.has("ch7MissionLue") && c.scoreDepart !== null && c.scoreDepart !== undefined) state.complete("p7_chantier");
	Object.keys(VALIDATIONS_CH7).forEach(function(id){
		if (state.quests[id]) return;
		var ok = false;
		try { ok = VALIDATIONS_CH7[id](); } catch (e){ ok = false; }
		if (ok) state.complete(id);
	});
	// Chaque maison bâtie : une phrase, une fois.
	MAISONS_CH7.forEach(function(m){
		if (!maisonBatieCh7(m.cle) || c.baties[m.cle] !== undefined) return;
		c.baties[m.cle] = c.horloge;
		if (!state.has("rejeuEnCours")) say(C.jaune("✺ Maison bâtie : " + m.titre) + C.gris(" : sa lanterne s'allume sur le quai, et " + m.maitre + " lève le poing vers la mer."));
	});
	var nb = maisonsBatiesCh7().length;
	if (c.toutesBaties === undefined && nb === MAISONS_CH7.length) c.toutesBaties = c.horloge;
	// La Tempête : à 14 h, ou dès que six maisons sont bâties.
	if (!c.tempete && state.quests["p7_chantier"] && (c.horloge >= TEMPETE_CH7 || nb >= 6)) leverTempeteCh7(c.horloge < TEMPETE_CH7);
	if (!state.quests["p7_tempete"] && c.tempete && Object.keys(c.incidentsTempete || {}).every(function(k){ return INCIDENTS_TEMPETE_CH7[k].reparee(); }) && vuCh7("chantierTempete")) state.complete("p7_tempete");
	// La Marée : à 19 h, ou plus tôt quand les dix maisons sont bâties et la Tempête passée.
	if (!c.maree && c.tempete && (c.horloge >= MAREE_CH7 || (nb === MAISONS_CH7.length && state.quests["p7_tempete"]))) arriverMareeCh7(c.horloge < MAREE_CH7);
	if (!state.quests["p7_maree"] && c.maree && SURPRISE_MAREE_CH7.reparee()) state.complete("p7_maree");
	if (!state.quests["p7_premier_pas"] && c.maree && c.premierPas) state.complete("p7_premier_pas");
	if (!state.quests["p7_chantier_final"] && c.maree && incidentsRestantsCh7().length === 0 && c.scoreFinalCandidat !== null && c.scoreFinalCandidat !== undefined && c.scoreFinalCandidat >= 90 && scoreChantierCh7() >= 90){
		c.scoreFinal = c.scoreFinalCandidat;
		state.complete("p7_chantier_final");
	}
	// Le rapport : contresigné seulement quand la cité a passé la Marée, que le premier étudiant est entré, et que le chantier dépasse 90.
	if (!state.quests["p7_rapport"] && rapportOkCh7()){
		var reste = [];
		if (!state.quests["p7_tempete"]) reste.push(c.tempete ? "les incidents de la Tempête ne sont pas tous réparés" : "la Tempête n'est pas encore passée");
		if (!state.quests["p7_maree"]) reste.push(c.maree ? "ce que la marée a apporté n'est pas réparé" : "le navire n'est pas encore à quai");
		if (!state.quests["p7_premier_pas"]) reste.push("le premier étudiant n'est pas encore entré dans la cité");
		if (!state.quests["p7_chantier_final"]) reste.push("le chantier n'a pas encore dépassé 90 après la Marée");
		var manque = rapportManqueCh7();
		if (!reste.length && !manque.length) state.complete("p7_rapport");
		else if (!reste.length){
			if (c.rapportAttente !== manque.join(",")){ c.rapportAttente = manque.join(","); say("Laurent lit ton rapport et fronce les sourcils. « Il manque " + manque.join(", et ") + ". Un rapport se vérifie : écris les vraies valeurs. »"); }
		} else if (c.rapportAttente !== reste.join(",")){
			c.rapportAttente = reste.join(",");
			say("Laurent prend ton rapport, le lit, et le pose sur la pierre de la capitainerie. « Bien écrit. Mais je ne contresigne pas une mise en service inachevée : " + reste.join(", et ") + ". Finis, et je signe. »");
		}
	}
	if (state.quests["p7_rapport"] && !state.has("victoireCh7")) state.applyState("victoireCh7");
}
function rapportCh7(){ var it = BoiteDePortAube.getItemFromName("rapport.txt"); return it === -1 ? null : it.getText(); }
function sansAccentCh7(t){ return String(t || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, ""); }
function rapportOkCh7(){
	var t = rapportCh7();
	if (t === null) return false;
	var b = sansAccentCh7(t);
	return ["maison", "tempete", "maree", "premier", "reste"].every(function(r){ return b.indexOf(r) > -1; });
}
function rapportManqueCh7(){
	var t = sansAccentCh7(rapportCh7() || ""), c = sCh7(), l = [];
	if (c.premierPas && t.indexOf(sansAccentCh7(c.premierPas)) === -1) l.push("le prénom du premier étudiant (" + c.premierPas + ")");
	if (c.scoreFinal !== null && c.scoreFinal !== undefined && !contientNombre(rapportCh7() || "", c.scoreFinal, 0.5)) l.push("la note du chantier après la Marée (" + c.scoreFinal + ")");
	return l;
}

/* ------------------------------------------------------------------ */
/* Après la fête : ce que personne n'a écrit                           */
/* ------------------------------------------------------------------ */

var PLUME_GRISE_CH7 = "Belle cité, Architecte. Nous aussi, nous avons un navire.\n\n                                        ~ une plume grise";
/* L'enregistrement que personne n'a écrit : servi par les deux serveurs de noms, absent de tout fichier. */
function semerNuitCh7(){
	var c = sCh7();
	["noms", "phare"].forEach(function(h){
		var z = zoneCh7(h);
		if (!z) return;
		var rr = { nom: "phare-noir." + DOMAINE_ILE + ".", type: "A", ttl: 300, donnees: IP_PHARE_NOIR };
		if (!z.enregistrements.some(function(x){ return memeRrIle(x, rr); })) z.enregistrements.push(rr);
	});
	if (!entreeUidCh7("passager") && entreeLdapIle("ou=people," + SUFFIXE_ILE)){
		ldapIle().entrees.push({ dn: "uid=passager,ou=people," + SUFFIXE_ILE, attrs: { objectClass: ["inetOrgPerson", "posixAccount"], uid: ["passager"], cn: ["passager"], sn: ["passager"],
			uidNumber: ["10666"], gidNumber: [String(GID_PROMO)], homeDirectory: ["/home/passager"], loginShell: ["/usr/sbin/nologin"], description: ["arrivé avant la cité"] },
			cree: (c.base || DATE_OUVERTURE_CH7) - (3 * 60 + 48) * 60000, par: ROOTDN_ILE });
	}
	if (!c.plumeDeposee){
		var compte = comptePourIle("poste", JOUEUR);
		var reglages = reglagesDovecotIle("poste"), e = compte ? emplacementBoitesIle("poste", compte, reglages) : null;
		if (e && e.type === "maildir"){
			var msg = { id: "PLUME", de: "plume@phare-noir." + DOMAINE_ILE, a: [JOUEUR + "@" + DOMAINE_ILE], sujet: "Belle cité", corps: PLUME_GRISE_CH7, arrivee: maintenantMachine("poste"), uid: 65534 };
			var texte = "Return-Path: <plume@phare-noir." + DOMAINE_ILE + ">\nFrom: plume@phare-noir." + DOMAINE_ILE + "\nTo: " + JOUEUR + "@" + DOMAINE_ILE + "\nSubject: Belle cité\nMessage-Id: <plume@phare-noir>\n\n" + PLUME_GRISE_CH7;
			rangerMaildirIle("poste", e.chemin, msg, texte, compte.nom);
			c.plumeDeposee = true;
		}
	}
}

/* Le monde réagit, à chaque tour. */
function verifierChapitre7(){
	function une(nom, cond){ if (!state.has(nom) && cond) state.applyState(nom); }
	une("ch7Ouvert", !!state.quests["m6_rapport"] || state.has("ch7Direct"));
	if (!state.has("ch7Ouvert")) return;
	if (!state.ch7 || typeof state.ch7 !== "object") state.ch7 = etatCh7Initial();
	var c = state.ch7;
	if (!c.base) c.base = baseJourCh7();
	relierPortAube();
	declarerUnitesIle();      // l'état de départ des unités (une partie rechargée en a besoin aussi)
	seminerCh7();
	avancerHorlogeCh7();
	reessaisPosteCh7();
	validerCh7();
	if (state.has("victoireCh7")) semerNuitCh7();
}

function etatChapitre7(nom){
	switch (nom){
		case "ch7Ouvert":
			if (!state.ch7 || typeof state.ch7 !== "object") state.ch7 = etatCh7Initial();
			if (!state.ch7.base) state.ch7.base = baseJourCh7();
			relierPortAube();
			if (!state.has("rejeuEnCours") && !state.has("ch7Direct")) say("Sur le campus, au bout de la jetée, un traversier allume son fanal : l'Embarcadère (cd ~/Cybersup/Embarcadere). " +
				C.gris("(Radio : « Grace : demain, à l'aube, Laurent t'attend de l'autre côté de la mer. Une île entière à bâtir. »)"));
			break;
		case "victoireCh7":
			if (!state.dateVictoire8) state.dateVictoire8 = dateDuJour();
			poser(Home, CertificatPortAube);
			semerNuitCh7();
			if (!state.has("rejeuEnCours")){
				say(C.jaune("La cité s'allume.") + " D'abord le quai, lanterne après lanterne ; puis la Maison des Noms, la Poste et ses casiers, les charpentes des Greniers, la grande nef de la Halle ; " +
					"le feu de la Forge rougit les vitres, l'Arche brille sur sa colline, et tout au bout de la jetée, le Phare-Relais lance son premier faisceau sur la mer. " +
					"Cinq cents étudiants lèvent les yeux, et les dix maîtres bâtisseurs se tournent vers toi." + (typeof texteAmiFinaleCh7 === "function" ? texteAmiFinaleCh7() : ""));
				say("Laurent lit ton rapport jusqu'à la dernière ligne, puis le contresigne. « Il y a des gens qui réparent les cités. Toi, tu viens d'en bâtir une. Port-Aube a un Architecte. »");
				say(C.gris("(Ton CertificatPortAube est posé dans ta Maison : cat ~/CertificatPortAube. Il porte la note du chapitre 7 et son code de vérification.)"));
				say(C.gras("La nuit tombe sur Port-Aube.") + " On danse sur le quai, les lanternes se balancent, la promo chante sur les marches de la Halle. Tard, très tard, ta boîte aux lettres s'allume : une lettre de plus. " +
					"Personne ne l'a postée : la file de la Poste est vide, et ses journaux ne la connaissent pas. Dans la zone de l'île, un nom que tu n'as jamais écrit répond. " +
					"Dans le Registre, un compte de plus que prévu, inscrit à 03:12 la nuit dernière, avant que la cité n'existe.\n" +
					C.gris("(doveadm fetch, mailq, dig phare-noir.port-aube.lan, ldapsearch -x '(uid=passager)' : tout se constate, rien n'est à réparer.)"));
				say(C.gris("(Radio : « Grace : ... Ça, ce n'est pas nous. »)") + "\n\n" + C.gras("À suivre."));
				if (typeof QUETES_CH8 !== "undefined") say("Au petit matin, un message de Laurent t'attend sur la capitainerie. « Viens au bout du quai. Il y a une grille que personne n'a encore ouverte : le Grand Port. Et regarde vers le phare noir. »");
			}
			break;
	}
}

/* Le joueur choisit son identifiant APRÈS la construction du monde : on remplace l'identifiant provisoire partout sur l'île. */
function renommerJoueurIle(ancien, nouveau){
	if (!ancien || !nouveau || ancien === nouveau) return;
	var motif = new RegExp("(^|[^A-Za-z0-9_.-])" + ancien.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "(?=[^A-Za-z0-9_.-]|$)", "gm");
	HOTES_ILE.forEach(function(h){
		var racine = racineIle(h);
		if (!racine) return;
		var vus = [];
		(function visiter(lieu){
			if (!lieu || vus.indexOf(lieu) > -1) return;
			vus.push(lieu);
			if (lieu.room_name === ancien) lieu.room_name = nouveau;
			if (lieu.owner === ancien) lieu.owner = nouveau;
			(lieu.items || []).forEach(function(it){
				if (it.owner === ancien) it.owner = nouveau;
				var t = it.getText ? it.getText() : null;
				if (typeof t === "string" && motif.test(t)){ motif.lastIndex = 0; it.cmd_text["less"] = t.replace(motif, "$1" + nouveau); }
				motif.lastIndex = 0;
			});
			(lieu.children || []).forEach(visiter);
		})(racine);
	});
	try { var p = etatPostfixIle("poste"); (p.file || []).forEach(function(m){ m.a = m.a.map(function(x){ return x.replace(motif, "$1" + nouveau); }); motif.lastIndex = 0; }); } catch (e){}
}
if (typeof adopterPrenom === "function"){
	var ADOPTER_PRENOM_AVANT_CH7 = adopterPrenom;
	adopterPrenom = function(){
		var ancien = JOUEUR;
		var r = ADOPTER_PRENOM_AVANT_CH7.apply(this, arguments);
		try { renommerJoueurIle(ancien, JOUEUR); } catch (e){}
		return r;
	};
}

/* Les événements du chapitre. */
GameEvents.addListener("enter", function(e){
	if (e.room === HallPortAube && !state.quests["p7_quai"] && state.has("ch7Ouvert")){
		state.debutChapitre8 = state.tempsMs;
		if (state.ch7){ state.ch7.dernierNb = state.nbCommandes; if (!state.ch7.base) state.ch7.base = baseJourCh7(); }
		state.complete("p7_quai");
	}
});
GameEvents.addListener("read", function(e){
	if (!state.has("ch7Ouvert")) return;
	if (e.item === LaurentPortAube) state.set("ch7LaurentLu");
	if (e.item === MissionPortAube) state.set("ch7MissionLue");
});

/* ------------------------------------------------------------------ */
/* Le quai : Laurent, la mission, la radio, l'horloge de la capitainerie */
/* ------------------------------------------------------------------ */

var TraversierEmbarcadere = objetCh7(Embarcadere, "Traversier",
	"Un traversier de bois sombre, coque bleue, moteur au ralenti. Sur la passerelle, une main a écrit à la craie :\n\n" +
	"« Pour l'Architecte. Port-Aube, à l'aube. Laurent. »\n\n" +
	C.gris("(Monter à bord et traverser : cd PortAube.)"), "item_billet_traversee.gif");
var LaurentPortAube = new Item("Laurent", "", "item_mysteryman.gif").personnage();
HallPortAube.addItem(LaurentPortAube);
var MissionPortAube = objetCh7(HallPortAube, "Mission",
	"ORDRE DE MISSION · PORT-AUBE\n\n" +
	"L'école a fondé un campus sur une île : Port-Aube. Les maisons sont debout, câblées, installées : mais vides.\n" +
	"Ce soir, à la marée haute de 19 h, le premier navire accoste avec cinq cents étudiants. À 14 h, une tempête.\n\n" +
	"1. Regarder le plan de la cité (chantier, une commande du jeu) : la note de départ.\n" +
	"2. Bâtir les dix maisons : chaque maître bâtisseur explique son service ; à toi de le monter sur sa machine (ssh).\n" +
	"3. Tenir la Tempête : réparer ce qu'elle frappe.\n" +
	"4. Accueillir le navire, et le premier étudiant : qu'il entre dans la cité, de bout en bout.\n" +
	"5. Le chantier au-dessus de 90.\n" +
	"6. Le rapport de mise en service, ~/port-aube/rapport.txt (les maisons, la tempête, la marée, le premier pas, ce qui reste),\n" +
	"   déposé dans la BoiteDeLaurent du quai.\n\n" +
	"Règle d'or : on vérifie avant de charger, on ouvre au plus juste, et on garde une copie de tout.",
	"item_manuscript.gif");
var RadioPortAube = new Item("Radio", "", "item_workstation.gif");
HallPortAube.addItem(RadioPortAube);
var HorlogePortAube = new Item("Horloge", "", "item_sign.gif").droits("rw-r--r--", "root");
HallPortAube.addItem(HorlogePortAube);
var CertificatPortAube = new Item("CertificatPortAube", "", "item_manuscript.gif");

function texteHorlogeCh7(){
	var c = sCh7(), l = "L'HORLOGE DE LA CAPITAINERIE\n\nIl est " + heureCh7() + ".\n";
	if (c.maree) return l + "\nLa marée est haute" + (c.mareeEnAvance ? " (en avance : les dix maisons étaient bâties)" : "") + ". Le navire est à quai.";
	return l + "\n" + (c.tempete ? "La Tempête souffle depuis " + (c.tempeteEnAvance ? "que six maisons sont debout" : "14 h") + "." : "La Tempête à 14 h (ou dès que six maisons seront debout) : dans " + Math.max(0, TEMPETE_CH7 - c.horloge) + " min.") +
		"\nLa marée haute (19 h) dans " + texteAvantMaree() + " : le navire accostera, prêt ou pas.\n" +
		(c.horloge < TEMPETE_CH7 ? "Défi d'honneur de Laurent : les dix maisons bâties avant la Tempête de 14 h (encore " + (TEMPETE_CH7 - c.horloge) + " min)." : "14 h est passée.");
}
function texteRadioCh7(){
	var q = QUETES_CH7.filter(function(x){ return !state.quests[x.id]; })[0];
	if (!q) return "La radio grésille. « Grace : rapport contresigné, la cité brille jusqu'au continent. Beau travail, Architecte. »" + (state.has("victoireCh7") ? " Un silence. « ... Et cette plume grise. Ça, ce n'est pas nous. »" : "");
	var c = sCh7();
	var heure = "Il est " + heureCh7() + (c.maree ? ", le navire est à quai. " : (c.tempete ? ", la Tempête souffle, la marée à 19 h. " : ", la tempête à 14 h, la marée à 19 h. "));
	return "La radio grésille. « Grace : " + heure + (CONSEILS_CH7[q.id] || "Je te suis.") + (METIER_CH7[q.id] ? " " + METIER_CH7[q.id] : "") + " »";
}
function texteLaurentCh7(){
	if (state.quests["p7_rapport"]) return "Laurent tient ton rapport, contresigné à l'encre bleue.\n\n« Dix maisons, une tempête, une marée, et un premier étudiant qui entre chez lui sans savoir tout ce qu'il a fallu pour ça. " +
		"C'est ça, une infrastructure réussie : on ne la voit pas. Ton CertificatPortAube t'attend dans ta Maison. Et les défis des maîtres restent ouverts. »";
	return "Laurent est debout au bout du quai, le col relevé contre le vent du large.\n\n" +
		"« Lumen brille. Alors voici la suite. L'école a fondé un campus sur cette île : Port-Aube. Les bâtisseurs ont monté les maisons : des serveurs neufs, installés, câblés. Mais vides. " +
		"Pas de noms, pas de poste, pas de greniers, pas de registre, pas de sceaux, pas d'arche.\n\n" +
		"Ce soir, à la marée haute de 19 h, le premier navire accoste avec cinq cents étudiants. Et regarde l'horizon : une tempête monte, elle sera sur nous vers 14 h.\n\n" +
		"Dix maisons, dix maîtres bâtisseurs. Chacun t'explique la sienne ; à toi de la bâtir, sur sa machine (ssh). Commence par le plan de la cité : chantier. C'est ta note de départ.\n\n" +
		"À partir d'aujourd'hui, tu n'es plus la recrue. Tu es l'Architecte. Deux défis d'honneur : les dix maisons debout avant la tempête, et finir sans acheter un seul indice. " +
		"Et quand le navire sera là, le premier étudiant descendra la passerelle. Son prénom, c'est toi qui le choisiras ; moi, je l'appellerais Aron. »";
}
texteVivant(HorlogePortAube, texteHorlogeCh7);
texteVivant(RadioPortAube, texteRadioCh7);
texteVivant(LaurentPortAube, texteLaurentCh7);
texteVivant(CertificatPortAube, function(){ return state.has("victoireCh7") ? state.texteDuCertificat8() : ""; });

/* ------------------------------------------------------------------ */
/* Le certificat du chapitre                                           */
/* ------------------------------------------------------------------ */

GameState.prototype.texteDuCertificat8 = function(){
	var minutes = Math.round((this.tempsMs - (this.debutChapitre8 || 0)) / 60000);
	var totalSec = QUETES_SECONDAIRES_CH7.length;
	var secFaites = QUETES_SECONDAIRES_CH7.filter(function(q){ return this.quests[q.id]; }, this).length;
	var annexes = typeof annexesDuChapitre === "function" ? annexesDuChapitre(8) : [];
	var c = this.ch7 || {};
	return "" +
		"==================================\n" +
		"     CYBERSUP · CERTIFICAT DE PORT-AUBE (SERVICES RÉSEAU LINUX)\n" +
		"==================================\n" +
		"\n" +
		"  Décerné à : " + (this.nom || JOUEUR) + ", Architecte de Port-Aube\n" +
		"\n" +
		"  pour avoir, en une journée, bâti les services d'une cité :\n" +
		"  DNS primaire et secondaire, zone inverse et mise à jour signée,\n" +
		"  courrier (Postfix, Dovecot, SPF, DKIM, DMARC), partages NFS et\n" +
		"  Samba, annuaire LDAP, comptes centralisés (sssd, autofs),\n" +
		"  autorité de certification interne et TLS, sauvegardes chiffrées\n" +
		"  restaurées ; puis tenu la Tempête, accueilli la Marée et le\n" +
		"  premier étudiant, et rédigé le rapport, en terminal.\n" +
		"\n" +
		"  SCORE DU CHAPITRE 7  : " + this.xpNet(8) + " XP sur " + this.xpMax8() + "\n" +
		"  NOTE                 : " + this.noteTexte(8) + "\n" +
		"  Mention              : " + this.mention(8) + "\n" +
		"  Chantier de la cité  : " + (c.scoreDepart !== undefined && c.scoreDepart !== null ? c.scoreDepart : "?") + " au départ, " + (c.scoreFinal !== undefined && c.scoreFinal !== null ? c.scoreFinal : "?") + " après la Marée\n" +
		"  Premier étudiant     : " + (c.premierPas || "?") + "\n" +
		"  Sorts des services   : " + ORDRE_DES_SORTS_8.filter(function(x){ return this.usages[x]; }, this).length + " sur " + ORDRE_DES_SORTS_8.length + "\n" +
		"  Quêtes secondaires   : " + secFaites + " sur " + totalSec + "\n" +
		"  Quêtes annexes       : " + annexes.filter(function(a){ return this.quests[a.id]; }, this).length + " sur " + annexes.length + "\n" +
		"  Temps du chapitre    : " + (minutes < 60 ? minutes + " min" : Math.floor(minutes / 60) + " h " + deuxChiffres(minutes % 60)) + "\n" +
		"  Indices payants      : " + (this.malus8 ? this.nbIndices(8) + " (-" + this.malus8 + " XP sur la note)" : "aucun") + "\n" +
		"\n" +
		"  Signé : Laurent, Directeur Pédagogique de Cybersup\n" +
		"          et Grace, cheffe de quart de la WarRoom\n" +
		"==================================\n" +
		"  Code de vérification (indicatif), à remettre au formateur :\n" +
		"  " + this.codeDuCertificat8() + "\n" +
		"==================================";
};
GameState.prototype.codeDuCertificat8 = function(){
	var f = this.compteursFiges(8, this.xpNet(8), this.nbCommandes, Math.round((this.tempsMs - (this.debutChapitre8 || 0)) / 60000));
	return fabriquerCode({
		prenom: String(this.nom || JOUEUR).replace(/\|/g, "/"),
		score: this.xpNet(8), max: this.xpMax8(), note: this.note(8),
		commandes: f.commandes, minutes: f.minutes,
		indices: this.nbIndices(8), chapitre: 8,
		date: this.dateVictoire8 || dateDuJour(), graine: PROFIL.graine
	});
};

/* Le monde est de nouveau figé : ce que le joueur crée ensuite n'a plus d'identifiant fixe. */
World.fige = true;

/* ------------------------------------------------------------------ */
/* Départ direct par « chapitre 7 » ou le Billet de traversée           */
/* ------------------------------------------------------------------ */

/* Le socle des chapitres précédents est réputé acquis (renfort), sans XP. Les sorts du chapitre 7, eux, s'apprennent auprès des maîtres. */
function socleCh7Acquis(){
	[typeof ORDRE_DES_SORTS !== "undefined" ? ORDRE_DES_SORTS : [], typeof ORDRE_DES_SORTS_2 !== "undefined" ? ORDRE_DES_SORTS_2 : [],
	 typeof ORDRE_DES_SORTS_3 !== "undefined" ? ORDRE_DES_SORTS_3 : [], typeof ORDRE_DES_SORTS_5 !== "undefined" ? ORDRE_DES_SORTS_5 : [],
	 typeof ORDRE_DES_SORTS_6 !== "undefined" ? ORDRE_DES_SORTS_6 : [], typeof ORDRE_DES_SORTS_7 !== "undefined" ? ORDRE_DES_SORTS_7 : []].forEach(function(liste){
		liste.forEach(function(s){ state.spells[s] = true; });
	});
}

function commencerChapitre7(){
	var alias = state.alias;
	state.alias = {};
	state.flags.rejeuEnCours = true;
	socleCh7Acquis();
	if (!state.quests.m_marche) state.complete("m_marche");
	state.set("sudoOK");
	state.set("chapitre1Saute");
	state.set("ch7Direct");
	PROFIL.chapitre = 7;
	enregistrerProfil();
	if (!state.ch7 || typeof state.ch7 !== "object") state.ch7 = etatCh7Initial();
	state.applyState("ch7Ouvert");
	delete state.flags.rejeuEnCours;
	state.alias = alias;
	Shell.narration = [];
	state.gainsDuTour = [];
	if (typeof enterRoom === "function") enterRoom(HallPortAube);
	Shell.lieu_precedent = null;
	Shell.pile_ssh = [];
	state.debutChapitre8 = state.tempsMs;
	state.ch7.dernierNb = state.nbCommandes;
	if (typeof montrerImage === "function") montrerImage(HallPortAube.room_pic, "Port-Aube");
	if (term && term.effacer) term.effacer();
	term.echo(C.vert(C.gras("CHAPITRE 7 : PORT-AUBE, LA CITÉ À BÂTIR")) + "\n\n" +
		"Au large du continent, l'école a fondé un campus sur une île. Les maisons sont debout, mais vides : pas de noms, pas de poste, pas de greniers, pas de registre, pas de sceaux, pas d'arche. " +
		"Il est 7 h. À 14 h, une tempête. À 19 h, la marée haute : le premier navire accoste avec cinq cents étudiants.\n\n" +
		"Tu es sur le quai de Port-Aube. " + C.vert("cat Laurent") + ", puis " + C.vert("cat Mission") + ". Grace te guide à la radio ; dix maîtres bâtisseurs t'attendent dans leurs maisons.\n\n" +
		C.gris("Ce chapitre a sa propre note sur 20. quetes pour le journal, indice si tu bloques, xp pour ta note, chantier pour le plan de la cité. L'horloge file vers la marée."));
	return true;
}
