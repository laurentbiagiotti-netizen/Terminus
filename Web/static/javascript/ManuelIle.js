/**
 * ManuelIle.js : les pages de manuel des sorts des services réseau (chapitre 7, Port-Aube), en français.
 * Chaque page dit à quoi sert le sort, ses options courantes, un exemple, et le piège classique.
 * SORTS_ILE range les sorts du chapitre ; SORTS_ANNEXES_ILE, ceux des quêtes annexes (hors barème).
 */

/* ---------------- DNS (BIND) ---------------- */
MANUEL["named-checkconf"] = page("vérifier la configuration de BIND avant de la charger", "NAMED CHECK CONFiguration",
	"named-checkconf lit /etc/bind/named.conf (et tout ce qu'il inclut) comme le ferait named, et dit la première faute.\n" +
	"Sans un mot : la syntaxe est bonne.\n\n" +
	"  sudo named-checkconf              la syntaxe de named.conf et de ses include\n" +
	"  sudo named-checkconf -z           et en plus, charge chaque zone déclarée (comme named-checkzone, zone par zone)\n\n" +
	"Les fautes classiques : un point-virgule oublié après une accolade (missing ';' before '}'), une accolade de trop,\n" +
	"un fichier de zone introuvable. On vérifie toujours avant rndc reload : un named qui refuse sa configuration au\n" +
	"redémarrage, c'est tout un domaine qui disparaît.");
MANUEL["rndc"] = page("piloter named sans l'arrêter", "Remote Name Daemon Control",
	"rndc parle à named par son canal de contrôle (la clé /etc/bind/rndc.key, lisible par root).\n\n" +
	"  sudo rndc reload                  relit la configuration et les zones modifiées\n" +
	"  sudo rndc reload port-aube.lan    une seule zone\n" +
	"  sudo rndc reconfig                seulement named.conf (les zones ajoutées ou retirées)\n" +
	"  sudo rndc status                  l'état du serveur (zones chargées, version)\n" +
	"  sudo rndc zonestatus ZONE         le détail d'une zone (série, primaire ou secondaire)\n" +
	"  sudo rndc retransfer ZONE         sur un secondaire : reprendre toute la zone au primaire, tout de suite\n" +
	"  sudo rndc notify ZONE             sur le primaire : prévenir les secondaires qu'il y a du neuf\n" +
	"  sudo rndc freeze ZONE ; rndc thaw ZONE     geler une zone dynamique pour l'éditer à la main, puis la dégeler\n\n" +
	"Le piège : changer une zone sans augmenter son numéro de série. Le primaire la recharge, mais les secondaires\n" +
	"comparent les séries et ne bougent pas (« serial unchanged »).");
MANUEL["nsupdate"] = page("modifier une zone à chaud (mise à jour dynamique)", "Name Server UPDATE",
	"nsupdate envoie au serveur primaire une demande de changement, signée par une clé TSIG que la zone autorise\n" +
	"(allow-update { key NOM; };). Le serveur l'applique, augmente la série, note tout dans un journal (.jnl) et prévient\n" +
	"ses secondaires.\n\n" +
	"  sudo nsupdate -k /etc/bind/cle-phare.key\n" +
	"  > server 10.0.70.53\n" +
	"  > zone port-aube.lan\n" +
	"  > update add bal.port-aube.lan. 3600 IN A 10.0.70.60\n" +
	"  > send\n" +
	"  > quit\n\n" +
	"  update delete NOM A               retirer un enregistrement ;  show : voir la demande avant send\n\n" +
	"Le piège : une zone dynamique ne s'édite plus à la main tant qu'elle tourne (le journal .jnl la contredirait) :\n" +
	"rndc freeze, éditer, augmenter la série, rndc thaw.");
MANUEL["tsig-keygen"] = page("fabriquer une clé TSIG pour BIND", "Transaction SIGnature KEY GENerator",
	"  tsig-keygen cle-phare                       affiche un bloc key \"cle-phare\" { algorithm hmac-sha256; secret \"...\"; };\n" +
	"  tsig-keygen cle-phare | sudo tee /etc/bind/cle-phare.key\n\n" +
	"Le même bloc va dans named.conf (include) et sert à nsupdate -k. Le secret se garde comme un mot de passe : chmod 640, root:bind.");

/* ---------------- Courrier (Postfix, Dovecot, DKIM) ---------------- */
MANUEL["postconf"] = page("lire et régler la configuration de Postfix", "POSTfix CONFiguration",
	"  postconf -n                        seulement ce qui diffère des valeurs par défaut (la vraie configuration)\n" +
	"  postconf mydestination relayhost   la valeur de quelques paramètres\n" +
	"  postconf -d myhostname             la valeur par défaut\n" +
	"  sudo postconf -e 'relayhost ='     changer un paramètre dans main.cf (sans éditeur)\n\n" +
	"Les paramètres du métier : myhostname (le nom complet du serveur), mydomain, myorigin, mydestination (les domaines\n" +
	"livrés ICI), mynetworks (qui peut envoyer par ce serveur : jamais 0.0.0.0/0, ce serait un relais ouvert à tous),\n" +
	"relayhost (vide : livrer directement), home_mailbox ou mail_spool_directory (une barre finale : Maildir).\n\n" +
	"postconf prévient de ce qui cloche : « overriding earlier entry » (un paramètre écrit deux fois : le dernier gagne),\n" +
	"« unused parameter » (une faute de frappe dans un nom).");
MANUEL["postfix"] = page("piloter le serveur de courrier Postfix", "POSTFIX",
	"  sudo postfix check      vérifier la configuration et les droits (sans un mot : tout va bien)\n" +
	"  sudo postfix reload     relire main.cf sans couper le courrier\n" +
	"  postfix status          tourne-t-il ?\n" +
	"  sudo postfix flush      retenter tout de suite la livraison de toute la file\n\n" +
	"Une modification de main.cf ne compte qu'après reload. Les journaux : journalctl -u postfix, /var/log/mail.log.");
MANUEL["mailq"] = page("voir la file d'attente du courrier", "MAIL Queue",
	"  mailq                    les messages en attente : identifiant, taille, date, expéditeur, destinataires,\n" +
	"                           et entre parenthèses POURQUOI ils attendent (relais injoignable, nom inconnu...)\n\n" +
	"« Mail queue is empty » : tout est parti. Le même que postqueue -p.");
MANUEL["postqueue"] = page("agir sur la file d'attente de Postfix", "POSTfix QUEUE",
	"  postqueue -p              la file (comme mailq)\n" +
	"  sudo postqueue -f         retenter maintenant la livraison de tout ce qui attend (flush)\n" +
	"  sudo postqueue -i ID      retenter un seul message\n\n" +
	"On corrige d'abord la cause (le relais, la destination), on recharge, PUIS on vide la file : sinon les messages\n" +
	"retombent dans la même erreur.");
MANUEL["postsuper"] = page("supprimer ou retenir des messages de la file", "POSTfix SUPERintendent",
	"  sudo postsuper -d ID       supprimer un message de la file ;  -d ALL : toute la file (prudence)\n" +
	"  sudo postsuper -h ID       le mettre de côté (hold) ;  -H ID : le relâcher\n" +
	"  sudo postsuper -r ID       le remettre en file (requeue)\n\n" +
	"On ne supprime pas un courrier légitime : on répare et on le laisse partir.");
MANUEL["postcat"] = page("lire un message de la file", "POSTfix CAT",
	"  sudo postcat -q ID         l'enveloppe et le contenu d'un message en attente\n\n" +
	"Pour comprendre qui écrit à qui avant de décider (le laisser, le retenir, le supprimer).");
MANUEL["mail"] = page("envoyer un message en ligne de commande", "MAIL",
	"  echo 'Bonjour' | mail -s 'Le sujet' badis                envoyer à badis@ le domaine local\n" +
	"  mail -s 'Le sujet' younes@port-aube.lan < message.txt     le corps depuis un fichier\n\n" +
	"mail confie le message à Postfix (sendmail) : il passe par la file, comme tout le reste. mailq et le journal disent\n" +
	"s'il est parti. mail sans argument lit une boîte au format mbox (pas un Maildir : celui-là, Dovecot le lit).");
MANUEL["sendmail"] = page("déposer un message dans Postfix", "SENDMAIL",
	"  printf 'Subject: Essai\\n\\nBonjour\\n' | sendmail syrine@port-aube.lan\n" +
	"  sendmail -t < message.txt       les destinataires sont lus dans les en-têtes (To:, Cc:)\n" +
	"  sendmail -bp                    la file (comme mailq)\n\n" +
	"Le programme que tous les autres appellent pour envoyer du courrier, depuis cinquante ans.");
MANUEL["doveconf"] = page("lire la configuration de Dovecot", "DOVEcot CONFiguration",
	"  sudo doveconf -n                 ce qui diffère des valeurs par défaut, après tous les !include\n" +
	"  sudo doveconf mail_location      un seul réglage\n\n" +
	"mail_location dit où sont les boîtes : maildir:/var/mail/%u (un dossier par compte, un fichier par message),\n" +
	"ou mbox:~/mail:INBOX=/var/mail/%u (un seul gros fichier). Il doit dire la même chose que Postfix, sinon Dovecot\n" +
	"cherche le courrier là où Postfix ne le met pas. doveconf dit aussi la première faute de syntaxe.");
MANUEL["doveadm"] = page("administrer Dovecot et lire les boîtes", "DOVEcot ADMinistration",
	"  doveadm user NOM                           le compte vu par Dovecot (uid, home)\n" +
	"  doveadm mailbox list -u NOM                ses dossiers\n" +
	"  doveadm mailbox status -u NOM messages INBOX      combien de messages\n" +
	"  doveadm fetch -u NOM 'hdr.subject hdr.from' all   les sujets et les expéditeurs\n" +
	"  doveadm search -u NOM subject MOT          chercher\n" +
	"  sudo doveadm reload                        relire la configuration\n\n" +
	"Lire la boîte d'un autre compte demande sudo. Une erreur « Permission denied » sur un dossier Maildir : son\n" +
	"propriétaire doit être le compte lui-même.");
MANUEL["opendkim-genkey"] = page("fabriquer une clé DKIM pour signer le courrier", "OpenDKIM GENerate KEY",
	"  sudo opendkim-genkey -s aube -d port-aube.lan -D /etc/opendkim/keys\n\n" +
	"Deux fichiers : aube.private (la clé privée, qui signe chaque message sortant ; elle ne quitte jamais le serveur)\n" +
	"et aube.txt, l'enregistrement à publier dans la zone : aube._domainkey IN TXT \"v=DKIM1; k=rsa; p=...\".\n" +
	"Les destinataires y lisent la clé publique et vérifient la signature : un faux message au nom du domaine ne\n" +
	"porte pas de signature valide. SPF (qui a le droit d'envoyer pour le domaine) et DMARC (que faire des messages\n" +
	"qui échouent) complètent la défense contre l'usurpation : dig TXT pour les relire.");

/* ---------------- Annuaire (LDAP) et comptes centralisés ---------------- */
MANUEL["ldapsearch"] = page("chercher dans un annuaire LDAP", "LDAP SEARCH",
	"  ldapsearch -x -H ldap://registre.port-aube.lan -b dc=port-aube,dc=lan          tout l'annuaire, sans authentification\n" +
	"  ldapsearch -x -LLL -b dc=port-aube,dc=lan '(uid=badis)' uidNumber homeDirectory\n" +
	"  ldapsearch -x -LLL '(&(objectClass=posixGroup)(cn=promo))' memberUid\n" +
	"  sudo ldapsearch -Y EXTERNAL -H ldapi:/// -b cn=config        la configuration de slapd (root, sur le serveur)\n" +
	"  ldapsearch -x -ZZ ...                                         en exigeant TLS (StartTLS)\n\n" +
	"-x : une connexion simple (sans -x, ldapsearch tente SASL et échoue). -b : la base de la recherche. -LLL : sans\n" +
	"les commentaires. Le filtre : (attr=valeur), (attr=*), (&(...)(...)), (|(...)(...)), (!(...)). Puis les attributs voulus.\n" +
	"Anonyme, on ne voit jamais userPassword : c'est voulu. /etc/ldap/ldap.conf peut donner URI et BASE par défaut.");
MANUEL["ldapadd"] = page("ajouter des entrées à un annuaire LDAP", "LDAP ADD",
	"  ldapadd -x -D cn=admin,dc=port-aube,dc=lan -W -f base.ldif\n\n" +
	"-D : qui se connecte (ici l'administrateur, le rootdn) ; -W : demander son mot de passe ; -f : le fichier LDIF.\n" +
	"Un LDIF : des blocs séparés par une ligne vide, chacun commence par dn:, puis objectClass: et les attributs.\n" +
	"ldapadd s'arrête à la première erreur (les entrées d'avant sont déjà ajoutées) ; -c continue malgré les erreurs.\n" +
	"Les erreurs à lire : Already exists (68), No such object (32 : le parent n'existe pas encore), Object class\n" +
	"violation (65 : un attribut obligatoire manque), Invalid syntax (21 : un nombre écrit en lettres).");
MANUEL["ldapmodify"] = page("modifier des entrées d'un annuaire LDAP", "LDAP MODIFY",
	"  ldapmodify -x -D cn=admin,dc=port-aube,dc=lan -W -f changement.ldif\n\n" +
	"  dn: cn=promo,ou=groups,dc=port-aube,dc=lan\n" +
	"  changetype: modify\n" +
	"  add: memberUid\n" +
	"  memberUid: aron\n\n" +
	"add, replace ou delete, un attribut par bloc (séparés par une ligne -). La configuration de slapd elle-même se\n" +
	"modifie ainsi, en root, sur le serveur : sudo ldapmodify -Y EXTERNAL -H ldapi:/// (dn: olcDatabase={1}mdb,cn=config,\n" +
	"replace: olcRootPW).");
MANUEL["ldapdelete"] = page("retirer une entrée d'un annuaire LDAP", "LDAP DELETE",
	"  ldapdelete -x -D cn=admin,dc=port-aube,dc=lan -W uid=ancien,ou=people,dc=port-aube,dc=lan\n\n" +
	"Une entrée qui a des enfants ne se retire pas (Operation not allowed on non-leaf) : les enfants d'abord.");
MANUEL["ldapwhoami"] = page("qui suis-je pour l'annuaire ?", "LDAP WHO AM I",
	"  ldapwhoami -x                                        anonymous\n" +
	"  ldapwhoami -x -D uid=badis,ou=people,dc=port-aube,dc=lan -W      vérifier un mot de passe");
MANUEL["ldappasswd"] = page("changer le mot de passe d'une entrée LDAP", "LDAP PASSWorD",
	"  ldappasswd -x -D cn=admin,dc=port-aube,dc=lan -W -S uid=aron,ou=people,dc=port-aube,dc=lan\n\n" +
	"-S demande le nouveau mot de passe (deux fois) ; le serveur le range haché dans userPassword. Sans -S ni -s, il en\n" +
	"invente un et l'affiche.");
MANUEL["slappasswd"] = page("hacher un mot de passe pour slapd", "SLAPd PASSWorD",
	"  slappasswd                  demande le mot de passe deux fois, affiche {SSHA}... (un hachage salé)\n\n" +
	"Ce hachage va dans olcRootPW (le mot de passe de l'administrateur de l'annuaire) ou dans userPassword. On ne met\n" +
	"jamais un mot de passe en clair dans un LDIF : -s MOT existe, mais le mot finit dans l'historique du shell.");
MANUEL["slapcat"] = page("exporter tout l'annuaire en LDIF", "SLAPd CAT",
	"  sudo slapcat                    toute la base, avec les attributs techniques (createTimestamp, creatorsName...)\n" +
	"  sudo slapcat -b cn=config       la configuration\n\n" +
	"Lit la base directement sur le disque : c'est la sauvegarde classique d'un annuaire (slapcat > registre.ldif).");
MANUEL["sss_cache"] = page("vider le cache de sssd", "SSSd CACHE",
	"  sudo sss_cache -E          tout invalider (comptes, groupes) : la prochaine question ira à l'annuaire\n" +
	"  sudo sss_cache -u NOM      un seul compte ;  -G : les groupes\n\n" +
	"sssd garde les réponses de l'annuaire un moment (entry_cache_timeout), et les sert même si l'annuaire est muet :\n" +
	"c'est une force (les connexions tiennent pendant une panne) et un piège (un changement fait dans l'annuaire n'est\n" +
	"pas vu tout de suite). getent passwd NOM et id NOM disent ce que la machine voit vraiment.");

/* ---------------- Partage des fichiers (NFS, Samba) ---------------- */
MANUEL["exportfs"] = page("publier les dossiers d'un serveur NFS", "EXPORT File Systems",
	"/etc/exports, une ligne par dossier :\n" +
	"  /srv/homes  10.0.70.0/24(rw,sync,root_squash,no_subtree_check)\n\n" +
	"  sudo exportfs -ra          relire /etc/exports et l'appliquer (ce que voient les clients)\n" +
	"  sudo exportfs -v           ce qui est publié, avec toutes les options effectives\n" +
	"  sudo exportfs -u CLIENT:/chemin       retirer une publication\n\n" +
	"root_squash (le défaut) : root sur un client devient nobody sur le serveur. no_root_squash donne au root de chaque\n" +
	"client les pleins pouvoirs sur le partage : on ne l'écrit jamais pour des dossiers personnels.\n" +
	"Le piège classique : une espace entre le client et la parenthèse. « 10.0.70.0/24 (rw) » publie en lecture seule\n" +
	"pour l'île, et en écriture pour le monde entier.");
MANUEL["showmount"] = page("voir ce qu'un serveur NFS publie", "SHOW MOUNT",
	"  showmount -e greniers       la liste des dossiers exportés, et à qui\n\n" +
	"Depuis un client : on vérifie avant de monter. « Program not registered » : le serveur NFS ne tourne pas.");
MANUEL["testparm"] = page("vérifier la configuration de Samba", "TEST PARaMeters",
	"  testparm -s                  lit /etc/samba/smb.conf et affiche les partages tels que Samba les comprend\n\n" +
	"Les paramètres inconnus (une faute de frappe) sont signalés puis ignorés : Samba ne dit rien d'autre, le partage\n" +
	"marche mal en silence. On relit toujours testparm après avoir touché smb.conf.\n" +
	"Un partage : [promo], path, valid users = @promo (le groupe), read only = no, guest ok = no (le défaut).");
MANUEL["smbpasswd"] = page("gérer les comptes de Samba", "SMB PASSWorD",
	"  sudo smbpasswd -a NOM      créer le compte Samba d'un utilisateur Unix existant (le mot de passe est demandé)\n" +
	"  sudo smbpasswd -x NOM      le retirer ;  -d / -e : le désactiver, le réactiver\n\n" +
	"Samba garde ses propres mots de passe : le compte Unix (local ou venu de l'annuaire par sssd) doit exister, sinon\n" +
	"« Failed to add entry ».");
MANUEL["pdbedit"] = page("lister les comptes de Samba", "Passdb DataBase EDITor",
	"  sudo pdbedit -L            les comptes : nom, uid, nom complet\n" +
	"  sudo pdbedit -L -v         le détail");

/* ---------------- Sceaux (TLS) et Arche (borg) ---------------- */
MANUEL["update-ca-certificates"] = page("ajouter une autorité au magasin de confiance", "UPDATE CA CERTIFICATES",
	"  sudo cp forge.crt /usr/local/share/ca-certificates/forge-port-aube.crt\n" +
	"  sudo update-ca-certificates\n\n" +
	"Le certificat de l'autorité (jamais sa clé !) rejoint /etc/ssl/certs/ca-certificates.crt : tous les programmes de\n" +
	"la machine (openssl, curl, ldapsearch, sssd) font désormais confiance à ce qu'elle signe. L'extension doit être .crt.");
MANUEL["borg"] = page("des sauvegardes dédupliquées, chiffrées, à distance", "BORG Backup",
	"  sudo borg init -e repokey --rsh 'ssh -i /root/.ssh/arche' borg@arche:/srv/borg/greniers      créer le dépôt chiffré\n" +
	"  sudo borg create --stats DEPOT::{hostname}-{now} /srv/homes      une archive (un instantané)\n" +
	"  sudo borg list DEPOT                  les archives ;  borg list DEPOT::ARCHIVE : leur contenu\n" +
	"  sudo borg check DEPOT                 vérifier le dépôt et les archives\n" +
	"  sudo borg prune --keep-daily 7 --keep-weekly 4 DEPOT     ne garder que 7 jours et 4 semaines\n" +
	"  sudo borg extract DEPOT::ARCHIVE srv/homes/badis         restaurer (dans le dossier courant)\n" +
	"  borg break-lock DEPOT                 retirer un verrou laissé par une sauvegarde coupée\n\n" +
	"La phrase de passe se garde à part (BORG_PASSPHRASE pour un script, dans un fichier lisible par root seul).\n" +
	"Côté serveur, la clé ssh du client est enfermée dans une seule commande :\n" +
	"  command=\"borg serve --restrict-to-path /srv/borg/greniers\",restrict ssh-ed25519 AAAA... root@greniers\n" +
	"Une sauvegarde se juge à la restauration : borg extract, puis diff.");

/* ---------------- Les quêtes annexes ---------------- */
MANUEL["lpadmin"] = page("ajouter et régler une imprimante (CUPS)", "Line Printer ADMINistration",
	"  lpadmin -p gazette -E -v ipp://presse.port-aube.lan/ipp/print -m everywhere     une imprimante réseau, activée (-E)\n" +
	"  lpadmin -d gazette           l'imprimante par défaut\n" +
	"  lpadmin -x vieille           la retirer\n\n" +
	"Réservé au groupe lpadmin. Sans -E, la file est créée en pause et refuse les travaux (cupsenable, cupsaccept).");
MANUEL["lpstat"] = page("l'état des imprimantes et des travaux", "Line Printer STATus",
	"  lpstat -p -d       les imprimantes (en pause ? active ?) et celle par défaut\n" +
	"  lpstat -o          les travaux en attente ;  lpstat -t : tout ;  lpstat -W completed -o : ceux qui sont faits");
MANUEL["lp"] = page("imprimer un fichier", "Line Printer",
	"  lp -d gazette fichier.txt     l'envoyer à l'imprimante gazette ;  -n 3 : trois copies\n" +
	"Le numéro du travail s'affiche (request id is gazette-2) : cancel s'en sert.");
MANUEL["cancel"] = page("annuler un travail d'impression", "CANCEL",
	"  cancel 1             le travail 1 ;  cancel gazette-1 : pareil\n" +
	"  cancel -a gazette    tous les travaux de la file\n" +
	"Le travail d'un autre ne s'annule qu'avec les droits d'administration de l'impression (lpadmin).");
MANUEL["cupsenable"] = page("remettre une imprimante en marche", "CUPS ENABLE",
	"  cupsenable gazette       la file reprend (ce qui attendait part à l'impression)\n" +
	"  cupsdisable gazette      la mettre en pause ;  cupsaccept / cupsreject : accepter ou refuser les nouveaux travaux");
MANUEL["cupsdisable"] = page("mettre une imprimante en pause", "CUPS DISABLE", "  cupsdisable -r 'raison' gazette      pause, avec une raison que lpstat -p affichera");
MANUEL["cupsaccept"] = page("qu'une file accepte de nouveau les travaux", "CUPS ACCEPT", "  cupsaccept gazette       (cupsreject : les refuser, sans arrêter l'impression de ceux déjà là)");
MANUEL["cupsreject"] = page("qu'une file refuse les nouveaux travaux", "CUPS REJECT", "  cupsreject gazette       les travaux déjà en file continuent ; lp est refusé");
MANUEL["sievec"] = page("compiler (et vérifier) un filtre Sieve", "SIEVE Compiler",
	"Un filtre Sieve trie le courrier à la livraison :\n" +
	"  require [\"fileinto\", \"vacation\"];\n" +
	"  if header :contains \"subject\" \"horaire\" { fileinto \"Horaires\"; }\n" +
	"  vacation :days 1 :subject \"En mer\" \"Je réponds demain.\";\n\n" +
	"  sievec repondeur.sieve       compile, ou dit la ligne fautive (une extension oubliée dans require...)\n\n" +
	"Le filtre actif est ~/.dovecot.sieve (un lien vers ~/sieve/NOM.sieve) ; doveadm sieve list et activate le gèrent.\n" +
	"Il ne s'applique que si le courrier est livré par Dovecot (dovecot-lda, mail_plugins = sieve).");
MANUEL["avahi-browse"] = page("voir ce qui s'annonce sur le réseau local (.local)", "AVAHI BROWSE",
	"  avahi-browse -a -t          tous les services annoncés, puis s'arrêter (-t)\n" +
	"  avahi-browse -art           avec leur adresse et leur port (-r : résoudre)\n" +
	"  avahi-browse -t _ipp._tcp   un seul type de service (ici, les imprimantes)");
MANUEL["avahi-resolve"] = page("traduire un nom .local, sans DNS", "AVAHI RESOLVE",
	"  avahi-resolve -n halle.local       l'adresse d'une machine qui s'annonce elle-même\n" +
	"  avahi-resolve -a 10.0.70.45        et le nom d'une adresse");
MANUEL["avahi-publish"] = page("annoncer un service sur le réseau local", "AVAHI PUBLISH",
	"  avahi-publish -s 'La fete du port' _http._tcp 8080       le temps que le programme tourne\n\n" +
	"Pour une annonce permanente : un fichier /etc/avahi/services/NOM.service (XML : service-group, name, service,\n" +
	"type, port), que avahi-daemon lit tout seul.");
MANUEL["wg"] = page("les clés et l'état d'un tunnel WireGuard", "WireGuard",
	"  umask 077 ; wg genkey | tee privatekey | wg pubkey > publickey      une paire de clés\n" +
	"  sudo wg show              l'interface, ses pairs, et la dernière poignée de main (latest handshake)\n\n" +
	"Chaque bout garde sa clé privée et donne sa clé publique à l'autre. Pas de handshake : une clé publique\n" +
	"mal recopiée, un mauvais Endpoint, ou l'autre bout qui n'est pas monté.");
MANUEL["wg-quick"] = page("monter et démonter un tunnel WireGuard", "WireGuard QUICK",
	"/etc/wireguard/wg0.conf (chmod 600) :\n" +
	"  [Interface]\n  PrivateKey = ...\n  Address = 10.99.0.1/24\n  ListenPort = 51820\n\n" +
	"  [Peer]\n  PublicKey = (la clé publique de l'autre bout)\n  Endpoint = rive:51820\n  AllowedIPs = 10.99.0.2/32\n\n" +
	"  sudo wg-quick up wg0       monter le tunnel ;  down : le démonter\n" +
	"  sudo systemctl enable --now wg-quick@wg0        qu'il revienne à chaque démarrage");
MANUEL["sftp"] = page("transférer des fichiers par SSH", "Secure File Transfer Protocol",
	"  sftp depot@halle           se connecter ; puis ls, cd, pwd, put FICHIER, get FICHIER, mkdir, bye\n\n" +
	"Côté serveur, un compte peut être enfermé dans sftp et dans un seul dossier (sshd_config) :\n" +
	"  Match Group devoirs\n      ChrootDirectory /srv/devoirs\n      ForceCommand internal-sftp\n\n" +
	"Le dossier de ChrootDirectory (et chacun de ses parents) doit appartenir à root et n'être inscriptible par\n" +
	"personne d'autre, sinon sshd ferme la connexion. On dépose dans un sous-dossier qui, lui, appartient au compte.");

/* Ce que les pages connues gagnent au chapitre 7. */
(function(){
	function ajout(nom, texte){ if (MANUEL[nom]) MANUEL[nom].page += "\n\n" + texte; }
	ajout("dig", "Sur un serveur de noms (chapitre 7) :\n  dig @noms port-aube.lan SOA          la série de la zone, demandée à un serveur précis\n  dig -x 10.0.70.25                     la résolution inverse (PTR)\n" +
		"  dig port-aube.lan AXFR @noms          toute la zone (un transfert) : seul le secondaire y a droit\n  dig TXT port-aube.lan +short           SPF ; dig TXT _dmarc.port-aube.lan ; dig TXT aube._domainkey.port-aube.lan (DKIM)");
	ajout("named-checkzone", "  sudo named-checkzone port-aube.lan /etc/bind/zones/db.port-aube.lan      avant chaque rndc reload. Les fautes classiques :\n" +
		"  une adresse impossible (10.0.70.380), un nom à la fois CNAME et autre chose, un nom sans point final dans MX ou NS\n  (il prend le domaine en suffixe : poste.port-aube.lan.port-aube.lan).");
	ajout("openssl", "Une autorité de certification interne (chapitre 7) :\n" +
		"  openssl genrsa -out forge.key 4096                                     la clé de l'autorité (elle ne quitte jamais la Forge)\n" +
		"  openssl req -x509 -new -key forge.key -days 3650 -subj '/CN=Forge' -out forge.crt       son certificat racine\n" +
		"  openssl req -new -key poste.key -subj '/CN=poste.port-aube.lan' -addext 'subjectAltName=DNS:poste.port-aube.lan' -out poste.csr\n" +
		"  openssl x509 -req -in poste.csr -CA forge.crt -CAkey forge.key -CAcreateserial -days 365 -copy_extensions copy -out poste.crt\n" +
		"  openssl verify -CAfile forge.crt poste.crt          la chaîne tient-elle ?\n" +
		"  openssl s_client -connect poste.port-aube.lan:143 -starttls imap      le certificat que sert un service, et Verify return code");
	ajout("smbclient", "Sur la Halle (chapitre 7) :\n  smbclient -L //halle -N                          les partages\n  smbclient //halle/promo -U zelia -c 'ls; put plan.txt'     se connecter avec un compte Samba, lancer des commandes");
	ajout("getent", "  getent passwd badis        un compte, d'où qu'il vienne : /etc/passwd, ou l'annuaire par sssd (passwd: files sss)");
	ajout("id", "  id badis       les numéros et les groupes d'un compte, tels que la machine les voit (annuaire compris)");
	ajout("mount", "  sudo mount -t nfs greniers:/srv/homes /mnt/greniers       monter un partage NFS ;  mount -t nfs4 : les lister");
	ajout("rsync", "Avec un démon rsync (rsyncd.conf, chapitre 7) :\n  rsync rsync://bibliotheque/                           les modules publiés\n  rsync -av rsync://bibliotheque/archives/ /tmp/miroir/   copier un module");
	ajout("systemctl", "  sudo systemctl reload named / postfix / dovecot / ssh       relire une configuration sans couper le service");
	ajout("ssh-keygen", "  sudo ssh-keygen -t ed25519 -f /root/.ssh/arche -N ''      une clé dédiée à une seule tâche (une sauvegarde), sans phrase, lisible par root seul");
})();

/* Les sorts du chapitre 7, et ceux des annexes de Port-Aube (hors barème). */
var SORTS_ILE = ["named-checkconf", "rndc", "nsupdate", "tsig-keygen", "postconf", "postfix", "mailq", "postqueue", "postsuper", "postcat", "mail", "sendmail",
	"doveconf", "doveadm", "opendkim-genkey", "exportfs", "showmount", "testparm", "smbpasswd", "pdbedit", "ldapsearch", "ldapadd", "ldapmodify", "ldapdelete",
	"ldapwhoami", "ldappasswd", "slappasswd", "slapcat", "sss_cache", "update-ca-certificates", "borg"];
var SORTS_ANNEXES_ILE = ["lpadmin", "lpstat", "lp", "cancel", "cupsenable", "cupsdisable", "cupsaccept", "cupsreject", "sievec", "avahi-browse", "avahi-resolve", "avahi-publish", "wg", "wg-quick", "sftp"];
SORTS_ILE.concat(SORTS_ANNEXES_ILE).forEach(function(s){ if (MANUEL[s]) MANUEL[s].horsBareme = true; });
if (typeof COMMANDES_REELLES !== "undefined") COMMANDES_REELLES = COMMANDES_REELLES.filter(function(c){ return SORTS_ILE.indexOf(c) === -1 && SORTS_ANNEXES_ILE.indexOf(c) === -1; });
var PREMIER_USAGE_AVANT_ILE = GameState.prototype.premierUsage;
GameState.prototype.premierUsage = function(sort){
	if ((SORTS_ILE.indexOf(sort) > -1 || SORTS_ANNEXES_ILE.indexOf(sort) > -1) && tousLesSorts().indexOf(sort) === -1){ this.usages[sort] = true; return; }
	return PREMIER_USAGE_AVANT_ILE.apply(this, arguments);
};
