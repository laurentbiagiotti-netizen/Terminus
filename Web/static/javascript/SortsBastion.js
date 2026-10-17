/**
 * SortsBastion.js : les sorts du durcissement (chapitre 5, « le Bastion »), première moitié.
 *
 * Des commandes génériques, fidèles à Debian 12 et Ubuntu, qui lisent l'état RÉEL de la machine où l'on se trouve
 * (les fichiers de configuration posés dans le monde) au moment où on les lance. Aucune réponse n'est écrite pour
 * une quête : un chapitre pose des fichiers, déclare ses paquets, ses ports et ses connexions, et écoute les événements.
 *
 *  - comptes : faillock, pwck, grpck, su, useradd ; userdel -r, usermod -s / -e / -c (en plus de -L, -U, -aG),
 *    passwd -l / -u / -d / -e / -S / -x / -n / -w, chage -l / -M / -m / -W / -I / -E / -d, lastlog -u / -b / -t, last,
 *    umask (-S), id d'un compte créé en cours de partie, TMOUT en lecture seule (readonly dans /etc/profile.d).
 *  - sudo : sudo -l, -ll, -l COMMANDE, -l -U NOM (lit /etc/sudoers et ses @includedir), visudo, visudo -c, visudo -f.
 *  - planification : /etc/cron.allow, /etc/cron.deny, /etc/at.allow, /etc/at.deny pour crontab, at, atq, atrm.
 *  - SSH : sshd -t, sshd -T, sshd -V ; systemctl reload|restart ssh refuse une configuration invalide ;
 *    ssh-keygen -t (ed25519, rsa, ecdsa), -b, -C, -N, -f, -q, -l.
 *  - services : ss et netstat (toutes les combinaisons courantes de -t -u -l -n -p -a -o -4 -6), systemctl (status,
 *    start, stop, restart, reload, enable, disable, --now, mask, unmask, is-active, is-enabled, is-failed, cat, edit,
 *    edit --full, daemon-reload, list-units, list-unit-files, list-sockets, --type, --state, --all),
 *    systemd-analyze security [UNITÉ].
 *  - paquets : apt et apt-get (install, --reinstall, remove, purge, update, upgrade, full-upgrade, list --upgradable,
 *    list --installed, show), dpkg -l / -L / -S / -s / -V, debsums (-s, -c, -a, -e, PAQUET), etckeeper (commit, vcs log,
 *    vcs status, vcs diff, unclean).
 *
 * Chargé après Academie.js. Ces sorts n'entrent dans aucune liste ORDRE_DES_SORTS : tant qu'aucun chapitre ne les
 * enseigne, leur premier usage ne rapporte pas d'XP (indicateur horsBareme, comme SortsArcanes.js).
 * Les sorties imitent le vrai outil (en anglais, ou en français pour apt et dpkg, la langue du système) ; à l'écran,
 * une explication grise en français les suit (astuce). Chaque sort pose io.code comme le vrai programme.
 *
 * --- Les événements (GameEvents) pour les quêtes ---
 *   faillock       { action: "list" | "reset", user, hote, echecs, bloque }
 *   pwck, grpck    { hote, erreurs: [messages], lectureSeule }
 *   su             { cible, ok, raison: "sudo" | "motdepasse" | "vide" | "pam_wheel" | "verrouille" | "inexistant" | "faillock", hote }
 *   useradd        { qui, uid, hote }      userdel { qui, host, home }      (userdel garde aussi l'ancien événement)
 *   usermod        { qui, shell, expire, commentaire, host }   (et les anciens : { qui, verrou } et { qui, groupe })
 *   passwdCompte   { action: "l" | "u" | "d" | "e" | "S" | "x" | "n" | "w", qui, hote }
 *   chage          { host, qui, lecture } ou { host, qui, champs: { max, min, warn, inactive, expire, last } }
 *   umask          { masque, symbolique }
 *   tmout          { refuse: true }        (une tentative de changer TMOUT en lecture seule)
 *   sudoListe      { hote, qui, autorise, regles: [{ runas, tags, commandes, fichier }] }
 *   visudo         { action: "c" | "edit", fichier, ok, erreurs }
 *   planifRefusee  { programme: "crontab" | "at" | "atq" | "atrm", qui, hote }
 *   sshd           { action: "test" | "T", ok, erreurs, avertissements, hote }
 *   sshReload      { action, ok, erreurs, hote }        (systemctl reload/restart/start de ssh)
 *   keygen         { passphrase, typeCle, bits, chemin }    (le même type que ssh-keygen avant ; la clé par défaut : { passphrase })
 *   ss, netstat    { host, sortie, options, generique: true }
 *   systemctl      { action, host, service, now }        (le même type que les chapitres précédents)
 *   mask           { unite, hote, now }      unmask { unite, hote }      daemonReload { hote }
 *   systemctlEdit  { unite, hote, chemin, texte }
 *   systemdSecurity { unite, exposition, predicat, hote, liste: [{ unite, exposition, predicat }] }
 *   apt            { action: "install" | "reinstall" | "remove" | "purge" | "update" | "upgrade" | "list", paquets, hote }
 *                  (l'ancien apt envoie toujours { pkg } pour cowsay et tree)
 *   dpkgVerify     { hote, paquet, modifies: [chemins], manquants: [chemins] }
 *   dpkg           { action: "l" | "L" | "S" | "s", hote, motif }
 *   debsums        { hote, changes, modifies, manquants, generique: true }
 *   etckeeper      { action: "commit" | "log" | "status" | "diff", message, fichiers, hote }
 *
 * --- Ce que le monde (un chapitre) peut appeler ---
 *   maintenantBastion()                    l'heure du jeu en millisecondes (Date.now() ; un chapitre peut la remplacer
 *                                          par son horloge : maintenantBastion = function(){ return ... })
 *   noeudHote(hote, "/etc/ssh"), fichierHote(hote, chemin), texteHote(hote, chemin),
 *   ecrireFichierHote(hote, chemin, texte, { mode, owner, lien }), supprimerFichierHote(hote, chemin)
 *   declarerMotDePasse(hote, compte, motDePasse)     le mot de passe que su accepte (rien n'est sauvegardé : c'est le monde)
 *   ajouterEchecConnexion(hote, compte, source, quand, type)   un échec pour faillock (type « RHOST », « TTY » ou « SVC »)
 *   faillockActif(hote), configFaillock(hote), echecsFaillock(hote, compte), compteBloqueFaillock(hote, compte)
 *   declarerConnexions(hote, [{ qui, tty, depuis, quand, fin }])   pour last et lastlog (quand, fin : Date, ms ou « 2026-10-16 22:14 »)
 *   comptesHote(hote) : { passwd: [...], shadow: [...], group: [...] }
 *   reglesSudo(hote, compte) : { autorise, defauts, regles }     verifierSudoers(hote, chemin) : { ok, erreurs }
 *   configSshFichiers(hote) : la configuration telle que sshd -T la lit sur le disque (clés en minuscules)
 *   configSshEffective(hote) : celle que le démon applique (au dernier start, reload ou restart réussi)
 *   verifierSshd(hote) : { ok, erreurs, avertissements, fatale }
 *   declarerEcoute(hote, unite, [{ proto: "tcp" | "udp", adresse: "0.0.0.0" | "::" | "*" | "127.0.0.1", port, programme, utilisateur }])
 *   ecoutesHote(hote) : les sockets ouverts (ce que ss et netstat montrent)
 *   declarerUnite(hote, nom, { actif, enabled, description })   l'état de départ d'une unité sans service() dans decrireHote
 *   uniteInfo(hote, nom), etatUnite(hote, nom) : { existe, actif, enabled, masque, echec }
 *   expositionUnite(hote, nom) : { exposition, predicat, controles }    (la note de systemd-analyze security)
 *   controleAvantDemarrage(function(hote, unite, action){ return null ou "message d'erreur"; })
 *                                          un autre fichier (apache, par exemple) peut refuser un start/restart/reload
 *   declarerPaquet(hote, nom, { version, disponible, architecture, description, fichiers: { chemin: texte d'origine },
 *                  conffiles: [chemins], services: [unités], taille, depot, installe, poser })
 *   paquetsHote(hote), etatPaquet(hote, nom), fichiersModifiesPaquet(hote, nom) : { modifies, manquants }
 *   etckeeperHistorique(hote) : les commits de /etc
 *   etatBastion() : state.arcanes.bastion, sauvegardé avec la partie.
 */

/* ================================================================== */
/* L'état sauvegardé, l'heure                                          */
/* ================================================================== */

/* Ce que le Bastion garde dans la sauvegarde : il loge dans state.arcanes (déjà sauvegardé), sous la clé bastion. */
function etatBastion(){
	var a = etatArcanes();
	if (!a.bastion || typeof a.bastion !== "object") a.bastion = {};
	var b = a.bastion;
	["faillock", "sshApplique", "sshEchec", "unites", "echecs", "masques", "retires", "systemdCharge", "paquets", "etckeeper", "instantanes"].forEach(function(k){
		if (!b[k] || typeof b[k] !== "object") b[k] = {};
	});
	return b;
}
function sousEtat(cle, hote){
	var b = etatBastion();
	if (!b[cle][hote] || typeof b[cle][hote] !== "object") b[cle][hote] = {};
	return b[cle][hote];
}

/* L'heure du jeu. Un chapitre qui a son horloge (la nuit du Bastion) peut remplacer cette fonction. */
var maintenantBastion = function(){ return Date.now(); };

/* Une date lue dans une déclaration : Date, millisecondes, ou texte « 2026-10-16 22:14[:05] ». */
function dateBastion(x){
	if (x === undefined || x === null) return null;
	if (x instanceof Date) return x.getTime();
	if (typeof x === "number") return x;
	var m = /^(\d{4})-(\d\d)-(\d\d)(?:[ T](\d\d):(\d\d)(?::(\d\d))?)?$/.exec(String(x).trim());
	if (!m || +m[2] < 1 || +m[2] > 12 || +m[3] < 1 || +m[3] > 31 || +(m[4] || 0) > 23 || +(m[5] || 0) > 59 || +(m[6] || 0) > 59) return null;
	// Une date seule (« 2026-12-31 ») : minuit UTC, comme les jours de /etc/shadow.
	var d = m[4] === undefined ? new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])) : new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +(m[6] || 0));
	if ((m[4] === undefined ? d.getUTCDate() : d.getDate()) !== +m[3]) return null;
	return d.getTime();
}

/* « Fri Oct 16 22:14:03 +0200 2026 » et autres formats de dates des outils. */
function decalageTexte(d){
	var dec = -d.getTimezoneOffset(), signe = dec < 0 ? "-" : "+";
	dec = Math.abs(dec);
	return signe + deuxChiffres(Math.floor(dec / 60)) + deuxChiffres(dec % 60);
}
function heureComplete(d){ return deuxChiffres(d.getHours()) + ":" + deuxChiffres(d.getMinutes()) + ":" + deuxChiffres(d.getSeconds()); }
function jourEspace(d){ var j = d.getDate(); return j < 10 ? " " + j : String(j); }
function dateIso(d){ return d.getFullYear() + "-" + deuxChiffres(d.getMonth() + 1) + "-" + deuxChiffres(d.getDate()); }
function dateLongue(d){ return JOURS_EN[d.getDay()] + " " + MOIS_EN[d.getMonth()] + " " + jourEspace(d) + " " + heureComplete(d) + " " + decalageTexte(d) + " " + d.getFullYear(); }
function dateGit(d){ return JOURS_EN[d.getDay()] + " " + MOIS_EN[d.getMonth()] + " " + d.getDate() + " " + heureComplete(d) + " " + d.getFullYear() + " " + decalageTexte(d); }
/* Jours écoulés depuis le 1er janvier 1970 (le format de /etc/shadow). */
function joursDepuis1970(ms){ return Math.floor(ms / 86400000); }
function dateDesJoursShadow(jours){
	var d = new Date(Date.UTC(1970, 0, 1) + (+jours) * 86400000);
	return MOIS_EN[d.getUTCMonth()] + " " + deuxChiffres(d.getUTCDate()) + ", " + d.getUTCFullYear();
}

/* ================================================================== */
/* Le système de fichiers d'une machine                                */
/* ================================================================== */

/* La racine « / » d'une machine du réseau (un lieu qui porte racineHote), ou null (ta Maison n'en a pas). */
function racineHote(hote){
	var h = typeof HOTES !== "undefined" ? HOTES[hote] : null;
	if (!h || typeof h.arrivee !== "function") return null;
	var a = null;
	try { a = h.arrivee(); } catch (e){ return null; }
	if (!a) return null;
	var r = racineDe(a);
	return r && r.racineHote ? r : null;
}

function morceauxChemin(chemin){
	var sortie = [];
	String(chemin).split("/").forEach(function(m){
		if (m === "" || m === ".") return;
		if (m === "..") sortie.pop(); else sortie.push(m);
	});
	return sortie;
}
function cheminNormal(chemin){ return "/" + morceauxChemin(chemin).join("/"); }
function dossierDe(chemin){ var m = morceauxChemin(chemin); m.pop(); return "/" + m.join("/"); }
function nomDe(chemin){ var m = morceauxChemin(chemin); return m.length ? m[m.length - 1] : "/"; }

/* Ce qui se trouve à un chemin absolu d'une machine : un lieu (Room), un objet (Item), ou null. Sans contrôle de droits. */
function noeudHote(hote, chemin){
	var lieu = racineHote(hote);
	if (!lieu) return null;
	var m = morceauxChemin(chemin);
	for (var i = 0; i < m.length; i++){
		var enfant = lieu.getChildFromName(m[i]);
		if (enfant !== -1 && enfant){ lieu = enfant; continue; }
		if (i === m.length - 1){
			var item = lieu.getItemFromName(m[i]);
			return item === -1 ? null : item;
		}
		return null;
	}
	return lieu;
}
function fichierHote(hote, chemin){
	var n = noeudHote(hote, chemin);
	return n instanceof Item ? n : null;
}
function dossierHote(hote, chemin){
	var n = noeudHote(hote, chemin);
	return n instanceof Room ? n : null;
}
/* Le texte d'un fichier, ou null s'il n'existe pas (un lien vers /dev/null se lit vide). */
function texteHote(hote, chemin){
	var f = fichierHote(hote, chemin);
	if (!f) return null;
	if (f.lien){
		if (f.lien === "/dev/null") return "";
		var cible = /^\//.test(f.lien) ? fichierHote(hote, f.lien) : fichierHote(hote, dossierDe(chemin) + "/" + f.lien);
		return cible && !cible.lien ? cible.getText() : null;
	}
	return f.getText();
}

/* Le mode d'un fichier en octal (« rw-r----- » donne « 0640 »). */
function modeOctal(mode){
	var m = String(mode || "---------"), n = [0, 0, 0];
	for (var i = 0; i < 9; i++){
		var c = m.charAt(i);
		if (c !== "-" && c !== "S" && c !== "T") n[Math.floor(i / 3)] += [4, 2, 1][i % 3];
	}
	return "0" + n.join("");
}

/* Crée les dossiers qui manquent (root, rwxr-xr-x) et renvoie le dernier, ou null si la machine n'a pas de racine. */
function creerDossiersHote(hote, chemin){
	var lieu = racineHote(hote);
	if (!lieu) return null;
	morceauxChemin(chemin).forEach(function(m){
		if (!lieu) return;
		var enfant = lieu.getChildFromName(m);
		if (enfant !== -1 && enfant){ lieu = enfant; return; }
		if (lieu.getItemFromName(m) !== -1){ lieu = null; return; }
		var neuf = new Room(m, "Un dossier du système.", "loc_etc.gif");
		neuf.owner = "root";
		neuf.mode = "rwxr-xr-x";
		if (lieu.chapitre) neuf.chapitre = lieu.chapitre;
		link_rooms(lieu, neuf);
		lieu = neuf;
	});
	return lieu;
}

/* Écrit (ou crée) un fichier d'une machine. options : mode, owner, lien (un lien symbolique), evenement (faux : aucun). */
function ecrireFichierHote(hote, chemin, texte, options){
	options = options || {};
	var dossier = creerDossiersHote(hote, dossierDe(chemin));
	if (!dossier) return null;
	var nom = nomDe(chemin), item = dossier.getItemFromName(nom), cree = false, ancien = "";
	if (item === -1){
		item = new Item(nom, texte === undefined ? "" : texte, options.image || "item_sign.gif");
		item.owner = options.owner || "root";
		item.mode = options.mode || "rw-r--r--";
		if (options.lien) item.lien = options.lien;
		dossier.addItem(item);
		cree = true;
	} else {
		ancien = item.getText();
		if (options.lien !== undefined) item.lien = options.lien || undefined;
		if (texte !== undefined) item.setText(texte);
		if (options.mode) item.mode = options.mode;
		if (options.owner) item.owner = options.owner;
	}
	if (options.evenement !== false){
		GameEvents.fire({ type: "write", item: item, room: dossier, append: false, text: item.getText(), created: cree, previous: ancien, hote: hote, chemin: cheminNormal(chemin) });
	}
	return item;
}
function supprimerFichierHote(hote, chemin){
	var dossier = dossierHote(hote, dossierDe(chemin));
	if (!dossier) return false;
	var item = dossier.getItemFromName(nomDe(chemin));
	if (item === -1) return false;
	dossier.removeItem(item);
	GameEvents.fire({ type: "rm", item: item, room: dossier, sudo: true, hote: hote, chemin: cheminNormal(chemin) });
	return true;
}
function supprimerDossierHote(hote, chemin){
	var lieu = dossierHote(hote, chemin);
	if (!lieu || !lieu.parents[0]) return false;
	var parent = lieu.parents[0];
	parent.children = parent.children.filter(function(c){ return c !== lieu; });
	if (joueurDans(lieu)) enterRoom(parent);
	return true;
}

/* Les fichiers d'un dossier (pas ses sous-dossiers), triés par nom comme le ferait un glob. */
function fichiersDuDossier(hote, chemin){
	var d = dossierHote(hote, chemin);
	if (!d) return [];
	return d.items.slice().sort(function(a, b){ return a.itemname < b.itemname ? -1 : (a.itemname > b.itemname ? 1 : 0); })
		.map(function(i){ return { nom: i.itemname, chemin: cheminNormal(chemin + "/" + i.itemname), item: i }; });
}

/*
 * Une « vue » du disque : la machine telle qu'elle est (vueLive), ou une photo prise à un instant (vueInstantane),
 * pour ce qu'un démon a chargé (sshd au dernier reload, systemd au dernier daemon-reload).
 *   lire(chemin) : { t: texte } ou { l: cible du lien } ou null ;  lister(dossier) : les noms de fichiers, triés.
 */
function vueLive(hote){
	return {
		lire: function(chemin){
			var f = fichierHote(hote, chemin);
			if (!f) return null;
			return f.lien ? { l: f.lien } : { t: f.getText() };
		},
		lister: function(dossier){ return fichiersDuDossier(hote, dossier).map(function(f){ return f.nom; }); },
		dossiers: function(dossier){
			var d = dossierHote(hote, dossier);
			return d ? d.children.map(function(c){ return c.room_name; }).sort() : [];
		}
	};
}
function vueInstantane(photo){
	return {
		lire: function(chemin){ return photo.hasOwnProperty(chemin) ? photo[chemin] : null; },
		lister: function(dossier){
			var prefixe = dossier.replace(/\/$/, "") + "/";
			return Object.keys(photo).filter(function(c){ return c.indexOf(prefixe) === 0 && c.substring(prefixe.length).indexOf("/") === -1; })
				.map(function(c){ return c.substring(prefixe.length); }).sort();
		},
		dossiers: function(dossier){
			var prefixe = dossier.replace(/\/$/, "") + "/", vus = {};
			Object.keys(photo).forEach(function(c){
				if (c.indexOf(prefixe) !== 0) return;
				var reste = c.substring(prefixe.length);
				if (reste.indexOf("/") > -1) vus[reste.split("/")[0]] = true;
			});
			return Object.keys(vus).sort();
		}
	};
}
/* Photographie tout ce qui est sous des dossiers d'une machine : { chemin: { t } ou { l } }. */
function photographierDossiers(hote, dossiers){
	var photo = {};
	dossiers.forEach(function(chemin){
		var d = dossierHote(hote, chemin);
		if (!d) return;
		(function parcourir(lieu, base, profondeur){
			if (profondeur > 6) return;
			lieu.items.forEach(function(i){ photo[base + "/" + i.itemname] = i.lien ? { l: i.lien } : { t: i.getText() }; });
			lieu.children.forEach(function(c){ if (c.parents[0] === lieu) parcourir(c, base + "/" + c.room_name, profondeur + 1); });
		})(d, cheminNormal(chemin).replace(/\/$/, ""), 0);
	});
	return photo;
}

/* ================================================================== */
/* Ce que les démons ont chargé : une photo prise avant la première     */
/* modification (sshd, systemd, et /etc pour etckeeper)                */
/* ================================================================== */

/*
 * sshd et systemd lisent leur configuration au démarrage, puis seulement quand on le leur demande (reload,
 * daemon-reload). Pour savoir ce qu'ils appliquent, on photographie la configuration juste avant que le joueur y
 * touche pour la première fois : c'est ce qui tournait. Un reload réussi la remplace (etatBastion().sshApplique...).
 */
var CATEGORIES_BASTION = {
	ssh: { dossiers: ["/etc/ssh"], concerne: function(hote){ return !!fichierHote(hote, "/etc/ssh/sshd_config"); } },
	systemd: { dossiers: ["/etc/systemd/system", "/lib/systemd/system", "/usr/lib/systemd/system"],
		concerne: function(hote){ return !!(dossierHote(hote, "/etc/systemd/system") || dossierHote(hote, "/lib/systemd/system") || dossierHote(hote, "/usr/lib/systemd/system")); } },
	etc: { dossiers: ["/etc"], concerne: function(hote){ return etckeeperInstalle(hote); } }
};
var BASTION_CHARGEMENT = false;

/* Le chemin d'un lieu dans sa machine : { hote, chemin }, ou null hors des machines. */
function situerLieu(lieu){
	var morceaux = [], l = lieu, garde = 0;
	while (l && garde++ < 60){
		if (l.racineHote) return { hote: l.racineHote, chemin: "/" + morceaux.join("/") };
		morceaux.unshift(l.room_name);
		l = l.parents[0];
	}
	return null;
}
function sousDossierDe(chemin, dossiers){
	return dossiers.some(function(d){ return chemin === d || chemin.indexOf(d + "/") === 0; });
}
function photographierSiBesoin(categorie, hote){
	var b = etatBastion();
	if (!b.instantanes[categorie]) b.instantanes[categorie] = {};
	if (b.instantanes[categorie][hote]) return;
	b.instantanes[categorie][hote] = photographierDossiers(hote, CATEGORIES_BASTION[categorie].dossiers);
}
/* Avant qu'un fichier ou un dossier de configuration change : on photographie ce qui tournait, une seule fois. */
function avantModificationBastion(item, lieu){
	if (BASTION_CHARGEMENT || !World.fige || typeof state === "undefined" || !state || typeof HOTES === "undefined") return;
	var place = lieu ? situerLieu(lieu) : null;
	if (lieu && !place) return;
	Object.keys(CATEGORIES_BASTION).forEach(function(cat){
		var c = CATEGORIES_BASTION[cat], b = etatBastion();
		if (place){
			if (b.instantanes[cat] && b.instantanes[cat][place.hote]) return;
			if (sousDossierDe(place.chemin, c.dossiers) && c.concerne(place.hote)) photographierSiBesoin(cat, place.hote);
			return;
		}
		Object.keys(HOTES).forEach(function(hote){
			if (b.instantanes[cat] && b.instantanes[cat][hote]) return;
			if (!c.concerne(hote)) return;
			var trouve = c.dossiers.some(function(d){
				var dossier = dossierHote(hote, d);
				if (!dossier) return false;
				var dedans = false;
				(function chercher(l, n){
					if (dedans || n > 6) return;
					if (l.items.indexOf(item) > -1){ dedans = true; return; }
					l.children.forEach(function(e){ if (e.parents[0] === l) chercher(e, n + 1); });
				})(dossier, 0);
				return dedans;
			});
			if (trouve) photographierSiBesoin(cat, hote);
		});
	});
}
var SET_TEXT_AVANT_BASTION = Item.prototype.setText;
Item.prototype.setText = function(texte){
	// Un objet né pendant la partie est arrivé par addItem : la photo a déjà été prise à ce moment-là.
	if (this.id) avantModificationBastion(this, null);
	return SET_TEXT_AVANT_BASTION.apply(this, arguments);
};
var ADD_ITEM_AVANT_BASTION = Room.prototype.addItem;
Room.prototype.addItem = function(item){
	if (item && this.items.indexOf(item) === -1) avantModificationBastion(null, this);
	return ADD_ITEM_AVANT_BASTION.apply(this, arguments);
};
var REMOVE_ITEM_AVANT_BASTION = Room.prototype.removeItem;
Room.prototype.removeItem = function(item){
	avantModificationBastion(null, this);
	return REMOVE_ITEM_AVANT_BASTION.apply(this, arguments);
};
/* Pendant le chargement d'une sauvegarde, le monde se remet en place : ce ne sont pas des modifications. */
var CHARGER_AVANT_BASTION = GameState.prototype.load;
GameState.prototype.load = function(){
	BASTION_CHARGEMENT = true;
	try { return CHARGER_AVANT_BASTION.apply(this, arguments); }
	finally { BASTION_CHARGEMENT = false; }
};
/* La vue chargée par un démon : sa dernière photo, sinon celle d'avant la première modification, sinon le disque. */
function vueChargee(categorie, hote, photoDuDemon){
	if (photoDuDemon) return vueInstantane(photoDuDemon);
	var b = etatBastion();
	if (b.instantanes[categorie] && b.instantanes[categorie][hote]) return vueInstantane(b.instantanes[categorie][hote]);
	return vueLive(hote);
}

/* ================================================================== */
/* Les comptes : /etc/passwd, /etc/shadow, /etc/group                  */
/* ================================================================== */

/* Le fichier de comptes d'une machine : celui que decrireHote déclare (fichiers.passwd...), sinon /etc/NOM. */
function fichierCompte(hote, nom){
	var h = typeof HOTES !== "undefined" ? HOTES[hote] : null;
	if (h && h.fichiers && typeof h.fichiers[nom] === "function"){
		var f = h.fichiers[nom]();
		if (f && f !== -1) return f;
	}
	return fichierHote(hote, "/etc/" + nom);
}
var FICHIER_SYSTEME_AVANT_BASTION = fichierSysteme;
fichierSysteme = function(nom){
	var f = FICHIER_SYSTEME_AVANT_BASTION(nom);
	if (f) return f;
	var h = infoHote();
	if (h.fichiers && h.fichiers[nom]) return null;
	return fichierHote(Shell.hote(), "/etc/" + nom);
};

function lignesCompte(hote, nom){
	var f = fichierCompte(hote, nom);
	return f ? lignesDe(f.getText()) : null;
}
/* Les comptes d'une machine, lus dans ses fichiers (des tableaux d'objets ; null si le fichier manque). */
function comptesHote(hote){
	var passwd = lignesCompte(hote, "passwd"), shadow = lignesCompte(hote, "shadow"), group = lignesCompte(hote, "group");
	return {
		passwd: passwd ? passwd.filter(function(l){ return l.trim() !== "" && l.charAt(0) !== "#"; }).map(function(l){
			var c = l.split(":");
			return { nom: c[0], mdp: c[1], uid: c[2], gid: c[3], gecos: c[4], home: c[5], shell: c[6], champs: c, ligne: l };
		}) : null,
		shadow: shadow ? shadow.filter(function(l){ return l.trim() !== ""; }).map(function(l){
			var c = l.split(":");
			return { nom: c[0], mdp: c[1], dernier: c[2], min: c[3], max: c[4], avertir: c[5], inactif: c[6], expire: c[7], champs: c, ligne: l };
		}) : null,
		group: group ? group.filter(function(l){ return l.trim() !== ""; }).map(function(l){
			var c = l.split(":");
			return { nom: c[0], gid: c[2], membres: (c[3] || "").split(",").filter(Boolean), champs: c, ligne: l };
		}) : null
	};
}
function compteDe(hote, nom){
	var c = comptesHote(hote);
	return c.passwd ? c.passwd.filter(function(p){ return p.nom === nom; })[0] || null : null;
}
function shadowDe(hote, nom){
	var c = comptesHote(hote);
	return c.shadow ? c.shadow.filter(function(p){ return p.nom === nom; })[0] || null : null;
}
/* Les groupes d'un compte (le principal et les secondaires). Pour le joueur, sudo s'il a les pleins pouvoirs. */
function groupesDe(hote, nom){
	var c = comptesHote(hote), liste = [];
	var compte = c.passwd ? c.passwd.filter(function(p){ return p.nom === nom; })[0] : null;
	if (c.group){
		c.group.forEach(function(g){
			if ((compte && g.gid === compte.gid) || g.membres.indexOf(nom) > -1) liste.push(g.nom);
		});
	} else if (nom === JOUEUR && state.has("sudoOK")) liste.push("sudo");
	if (!c.group && nom === JOUEUR) liste.unshift(JOUEUR);
	// Une machine des chapitres précédents ne décrit pas le compte du joueur : ses pleins pouvoirs viennent du jeu.
	if (nom === JOUEUR && !compte && state.has("sudoOK") && liste.indexOf("sudo") === -1) liste.push("sudo");
	return liste;
}
/* Remplace une ligne d'un fichier de comptes (le premier champ vaut nom) ; f(champs) renvoie les nouveaux champs ou null. */
function modifierLigneCompte(hote, fichier, nom, f){
	var item = fichierCompte(hote, fichier);
	if (!item) return false;
	var trouve = false;
	var texte = lignesDe(item.getText()).map(function(l){
		var c = l.split(":");
		if (c[0] !== nom) return l;
		trouve = true;
		var n = f(c.slice());
		return n === null ? l : n.join(":");
	}).join("\n") + "\n";
	if (trouve) item.setText(texte);
	return trouve;
}
function ajouterLigneCompte(hote, fichier, ligne){
	var item = fichierCompte(hote, fichier);
	if (!item) return false;
	var t = item.getText();
	item.setText(t.replace(/\n*$/, "") + (t.trim() === "" ? "" : "\n") + ligne + "\n");
	return true;
}

/* /etc/login.defs : PASS_MAX_DAYS, UMASK, UID_MIN... (les valeurs par défaut de Debian quand le fichier se tait). */
var LOGIN_DEFS_DEBIAN = { PASS_MAX_DAYS: "99999", PASS_MIN_DAYS: "0", PASS_WARN_AGE: "7", UID_MIN: "1000", UID_MAX: "60000",
	SYS_UID_MIN: "100", SYS_UID_MAX: "999", GID_MIN: "1000", GID_MAX: "60000", UMASK: "022", USERGROUPS_ENAB: "yes", ENCRYPT_METHOD: "YESCRYPT" };
function loginDefs(hote){
	var valeurs = {}, k;
	for (k in LOGIN_DEFS_DEBIAN) valeurs[k] = LOGIN_DEFS_DEBIAN[k];
	var t = texteHote(hote, "/etc/login.defs");
	if (t !== null){
		lignesDe(t).forEach(function(l){
			var m = /^\s*([A-Z_][A-Z0-9_]*)\s+(\S+)/.exec(l);
			if (m) valeurs[m[1]] = m[2];
		});
	}
	return valeurs;
}

/* Les mots de passe que su accepte : une déclaration du monde (rien n'est sauvegardé). */
var MOTS_DE_PASSE_BASTION = {};
function declarerMotDePasse(hote, compte, motDePasse){
	MOTS_DE_PASSE_BASTION[hote + ":" + compte] = motDePasse;
}

/* ================================================================== */
/* faillock : les échecs de connexion comptés par PAM                  */
/* ================================================================== */

/* Les lignes actives (non commentées) d'un fichier PAM. */
function lignesPam(hote, service){
	var t = texteHote(hote, "/etc/pam.d/" + service);
	if (t === null) return [];
	return lignesDe(t).map(function(l){ return l.replace(/#.*$/, "").trim(); }).filter(function(l){ return l !== ""; });
}
/* pam_faillock est-il dans la pile d'authentification (common-auth, ou celle de sshd, su, login) ? */
function faillockActif(hote){
	return ["common-auth", "sshd", "su", "login", "system-auth"].some(function(s){
		return lignesPam(hote, s).some(function(l){ return /^auth\s/.test(l) && /pam_faillock\.so/.test(l); });
	});
}
/* /etc/security/faillock.conf, puis les arguments de pam_faillock dans common-auth (ils l'emportent). */
function configFaillock(hote){
	var conf = { dir: "/var/run/faillock", deny: 3, fail_interval: 900, unlock_time: 600, even_deny_root: false, root_unlock_time: null, audit: false, silent: false, local_users_only: false };
	function poser(cle, valeur){
		cle = cle.toLowerCase();
		if (["deny", "fail_interval", "unlock_time", "root_unlock_time"].indexOf(cle) > -1){
			if (cle === "unlock_time" && valeur === "never") conf[cle] = 0;
			else if (/^\d+$/.test(valeur)) conf[cle] = parseInt(valeur, 10);
		} else if (cle === "dir") conf.dir = valeur;
		else if (["even_deny_root", "audit", "silent", "local_users_only", "nodelay"].indexOf(cle) > -1) conf[cle] = true;
	}
	var t = texteHote(hote, "/etc/security/faillock.conf");
	if (t !== null){
		lignesDe(t).forEach(function(l){
			l = l.replace(/#.*$/, "").trim();
			if (l === "") return;
			var m = /^([A-Za-z_]+)\s*(?:=\s*(\S+))?$/.exec(l);
			if (m) poser(m[1], m[2] === undefined ? "" : m[2]);
		});
	}
	lignesPam(hote, "common-auth").forEach(function(l){
		if (!/pam_faillock\.so/.test(l)) return;
		l.split(/\s+/).slice(3).forEach(function(arg){
			var m = /^([a-z_]+)(?:=(\S+))?$/.exec(arg);
			if (m && m[1] !== "preauth" && m[1] !== "authfail" && m[1] !== "authsucc") poser(m[1], m[2] === undefined ? "" : m[2]);
		});
	});
	if (conf.root_unlock_time === null) conf.root_unlock_time = conf.unlock_time;
	return conf;
}
/* Ajoute un échec (une connexion ratée) au registre de faillock d'un compte. */
function ajouterEchecConnexion(hote, compte, source, quand, type){
	var f = sousEtat("faillock", hote);
	f[compte] = f[compte] || [];
	f[compte].push({ t: dateBastion(quand) || maintenantBastion(), type: type || (/^\d+\.\d+\.\d+\.\d+$/.test(source || "") ? "RHOST" : "TTY"), source: source || "" });
	if (f[compte].length > 50) f[compte] = f[compte].slice(-50);
	return f[compte].length;
}
function echecsFaillock(hote, compte){
	var conf = configFaillock(hote), maintenant = maintenantBastion();
	return (sousEtat("faillock", hote)[compte] || []).map(function(e){
		return { t: e.t, type: e.type, source: e.source, valide: maintenant - e.t <= conf.fail_interval * 1000 };
	});
}
/* Le compte est-il verrouillé par faillock (deny échecs valides, unlock_time pas encore écoulé) ? */
function compteBloqueFaillock(hote, compte){
	if (!faillockActif(hote)) return false;
	var conf = configFaillock(hote);
	if (compte === "root" && !conf.even_deny_root) return false;
	var valides = echecsFaillock(hote, compte).filter(function(e){ return e.valide; });
	if (conf.deny <= 0 || valides.length < conf.deny) return false;
	var deblocage = compte === "root" ? conf.root_unlock_time : conf.unlock_time;
	if (deblocage === 0) return true;
	return maintenantBastion() - valides[valides.length - 1].t < deblocage * 1000;
}

function dateFaillock(ms){ var d = new Date(ms); return dateIso(d) + " " + heureComplete(d); }

Shell.sorts.faillock = function(args, io){
	var qui = null, reset = false, h = Shell.hote();
	for (var i = 0; i < args.length; i++){
		var a = args[i];
		if (a === "--user"){ qui = args[++i]; if (qui === undefined) throw new ShellError("faillock: Option --user requires an argument"); continue; }
		if (/^--user=/.test(a)){ qui = a.substring(7); continue; }
		if (a === "--reset"){ reset = true; continue; }
		if (a === "--dir"){ i++; continue; }
		if (a === "--legacy-output") continue;
		throw new ShellError("Usage: faillock [--dir /path/to/tally-directory] [--user username] [--reset] [--legacy-output]" +
			astuce(io, "faillock --user NOM montre les échecs d'un compte ; sudo faillock --user NOM --reset les efface (et déverrouille)"), 1);
	}
	var registre = sousEtat("faillock", h);
	if (!io.sudo && qui !== JOUEUR){
		throw new ShellError("faillock: Error opening " + (qui ? configFaillock(h).dir + "/" + qui : configFaillock(h).dir) + ": Permission denied" +
			astuce(io, "Le registre des échecs (" + configFaillock(h).dir + ") est réservé à root : sudo faillock" + (qui ? " --user " + qui : "")), 1);
	}
	if (reset){
		if (qui) delete registre[qui];
		else Object.keys(registre).forEach(function(k){ delete registre[k]; });
		GameEvents.fire({ type: "faillock", action: "reset", user: qui, hote: h, echecs: 0, bloque: false });
		return io.tty ? C.gris("(Compteur d'échecs remis à zéro" + (qui ? " pour " + qui : " pour tous les comptes") + " : le compte peut se reconnecter.)") : "";
	}
	var comptes = qui ? [qui] : Object.keys(registre).sort();
	var lignes = [];
	comptes.forEach(function(c){
		lignes.push(c + ":");
		lignes.push(completerDroite("When", 19) + " " + completerDroite("Type", 5) + " " + completerDroite("Source", 48) + " Valid");
		echecsFaillock(h, c).forEach(function(e){
			lignes.push(completerDroite(dateFaillock(e.t), 19) + " " + completerDroite(e.type, 5) + " " + completerDroite(e.source, 52) + " " + (e.valide ? "V" : "I"));
		});
	});
	if (io.tty && qui){
		var conf = configFaillock(h), valides = echecsFaillock(h, qui).filter(function(e){ return e.valide; }).length;
		lignes.push(C.gris(!faillockActif(h) ? "(Attention : pam_faillock n'est pas dans /etc/pam.d/common-auth : rien n'est compté, personne n'est verrouillé.)" :
			"(" + valides + " échec" + (valides > 1 ? "s" : "") + " valide" + (valides > 1 ? "s" : "") + " (V : dans les " + conf.fail_interval + " s de fail_interval) sur deny=" + conf.deny +
			(compteBloqueFaillock(h, qui) ? " : le compte " + qui + " est VERROUILLÉ" + (conf.unlock_time ? " pour " + conf.unlock_time + " s" : " jusqu'à un faillock --reset") + "." : " : le compte n'est pas verrouillé.") + ")"));
	}
	if (io.tty && !qui && !comptes.length) lignes.push(C.gris("(Aucun échec de connexion enregistré sur " + h + (faillockActif(h) ? "." : " : pam_faillock n'est d'ailleurs pas dans /etc/pam.d/common-auth.") + ")"));
	GameEvents.fire({ type: "faillock", action: "list", user: qui, hote: h, echecs: qui ? echecsFaillock(h, qui).length : comptes.length, bloque: qui ? compteBloqueFaillock(h, qui) : false });
	return lignes.join("\n");
};

/* ================================================================== */
/* pwck et grpck : la cohérence des fichiers de comptes                */
/* ================================================================== */

var SHELLS_CONNUS = ["/bin/bash", "/usr/bin/bash", "/bin/sh", "/usr/bin/sh", "/bin/dash", "/usr/bin/dash", "/bin/rbash", "/usr/bin/rbash",
	"/usr/sbin/nologin", "/sbin/nologin", "/bin/false", "/usr/bin/false", "/bin/sync", "/usr/bin/zsh", "/bin/zsh", "/usr/bin/git-shell"];
function nomCompteValide(nom){ return /^[a-z_][a-z0-9_.-]*\$?$/i.test(nom) && nom.length <= 32 && !/^\d+$/.test(nom); }
/* Un chemin manque-t-il ? On ne le dit que si son dossier parent existe sur la machine (sinon, le monde ne l'a pas décrit). */
function cheminManquant(hote, chemin){
	if (!chemin || chemin === "/nonexistent") return false;
	if (noeudHote(hote, chemin)) return false;
	return !!dossierHote(hote, dossierDe(chemin));
}
function analyserPasswd(hote, lectureSeule){
	var messages = [], c = comptesHote(hote), vus = {}, groupes = {};
	var non = lectureSeule ? "No" : "No";
	(c.group || []).forEach(function(g){ groupes[g.gid] = true; });
	lignesDe(fichierCompte(hote, "passwd").getText()).forEach(function(l){
		if (l.trim() === "") return;
		var ch = l.split(":");
		if (ch.length !== 7){ messages.push("invalid password file entry", "delete line '" + l + "'? " + non); return; }
		if (vus[ch[0]]){ messages.push("duplicate password entry", "delete line '" + l + "'? " + non); return; }
		vus[ch[0]] = true;
		if (!nomCompteValide(ch[0])) messages.push("invalid user name '" + ch[0] + "'");
		if (!/^\d+$/.test(ch[2])) messages.push("invalid user ID '" + ch[2] + "'");
		else if (c.group && !groupes[ch[3]]) messages.push("user '" + ch[0] + "': no group " + ch[3]);
		if (cheminManquant(hote, ch[5])) messages.push("user '" + ch[0] + "': directory '" + ch[5] + "' does not exist");
		if (ch[6] !== "" && SHELLS_CONNUS.indexOf(ch[6]) === -1 && !noeudHote(hote, ch[6])) messages.push("user '" + ch[0] + "': program '" + ch[6] + "' does not exist");
		if (c.shadow && !c.shadow.some(function(s){ return s.nom === ch[0]; })){
			messages.push("no matching password file entry in /etc/shadow", "add user '" + ch[0] + "' in /etc/shadow? " + non);
		}
	});
	if (c.shadow){
		var vusS = {}, aujourdhui = joursDepuis1970(maintenantBastion());
		lignesDe(fichierCompte(hote, "shadow").getText()).forEach(function(l){
			if (l.trim() === "") return;
			var ch = l.split(":");
			if (ch.length !== 9){ messages.push("invalid shadow password file entry", "delete line '" + l + "'? " + non); return; }
			if (vusS[ch[0]]){ messages.push("duplicate shadow password entry", "delete line '" + l + "'? " + non); return; }
			vusS[ch[0]] = true;
			if (!vus[ch[0]]){ messages.push("no matching password file entry in /etc/passwd", "delete line '" + l + "'? " + non); return; }
			if (/^\d+$/.test(ch[2]) && +ch[2] > aujourdhui) messages.push("user '" + ch[0] + "': last password change in the future");
		});
	}
	return messages;
}
function analyserGroup(hote, lectureSeule){
	var messages = [], c = comptesHote(hote), vus = {}, comptes = {};
	(c.passwd || []).forEach(function(p){ comptes[p.nom] = true; });
	var gshadow = fichierCompte(hote, "gshadow");
	var gs = gshadow ? lignesDe(gshadow.getText()).map(function(l){ return l.split(":")[0]; }) : null;
	lignesDe(fichierCompte(hote, "group").getText()).forEach(function(l){
		if (l.trim() === "") return;
		var ch = l.split(":");
		if (ch.length !== 4){ messages.push("invalid group file entry", "delete line '" + l + "'? No"); return; }
		if (vus[ch[0]]){ messages.push("duplicate group entry", "delete line '" + l + "'? No"); return; }
		vus[ch[0]] = true;
		if (!nomCompteValide(ch[0])) messages.push("invalid group name '" + ch[0] + "'");
		if (!/^\d+$/.test(ch[2])) messages.push("invalid group ID '" + ch[2] + "'");
		if (c.passwd) ch[3].split(",").filter(Boolean).forEach(function(m){ if (!comptes[m]) messages.push("group " + ch[0] + ": no user " + m); });
		if (gs && gs.indexOf(ch[0]) === -1) messages.push("no matching group file entry in /etc/gshadow", "add group '" + ch[0] + "' in /etc/gshadow? No");
	});
	if (gs) gs.forEach(function(n, k){ if (n && !vus[n]) messages.push("no matching group file entry in /etc/group", "delete line '" + lignesDe(gshadow.getText())[k] + "'? No"); });
	return messages;
}
function sortVerification(cmd, fichiers, analyser){
	return function(args, io){
		var lecture = false, quiet = false, h = Shell.hote();
		args.forEach(function(a){
			if (a === "-r" || a === "--read-only") lecture = true;
			else if (a === "-q" || a === "--quiet") quiet = true;
			else if (a === "-s" || a === "--sort") throw new ShellError(cmd + ": -s and -r are incompatible" + astuce(io, "Ici, " + cmd + " se contente de lire : " + cmd + " -r"), 2);
			else if (/^-[rq]+$/.test(a)){ if (a.indexOf("r") > -1) lecture = true; if (a.indexOf("q") > -1) quiet = true; }
			else if (a.charAt(0) === "-") throw new ShellError(cmd + ": invalid option -- '" + a.charAt(1) + "'\nUsage: " + cmd + " [options] [" + fichiers.join(" [") + "]]", 2);
		});
		var principal = fichierCompte(h, fichiers[0]);
		if (!principal) throw new ShellError(cmd + ": cannot open /etc/" + fichiers[0], 3);
		if (!lecture && !io.sudo) throw new ShellError(cmd + ": cannot lock /etc/" + fichiers[0] + "; try again later." + astuce(io, "Sans -r, " + cmd + " voudrait corriger : il lui faut root. " + cmd + " -r se contente de lire."), 4);
		var secret = fichierCompte(h, fichiers[1]);
		if (secret && !io.sudo && !Shell.bit(secret, "r", io)) throw new ShellError(cmd + ": cannot open /etc/" + fichiers[1] + astuce(io, "/etc/" + fichiers[1] + " est réservé à root : sudo " + cmd + " -r"), 3);
		var messages = analyser(h, lecture);
		if (quiet) messages = messages.filter(function(m){ return !/does not exist$/.test(m); });
		GameEvents.fire({ type: cmd, hote: h, erreurs: messages.slice(), lectureSeule: lecture });
		if (messages.length) io.code = 2;
		var sortie = messages.concat([cmd + ": no changes"]);
		if (io.tty){
			sortie.push(C.gris(messages.length ? "(" + cmd + " a trouvé des incohérences" + (lecture ? " et n'a rien changé (-r)" : " ; ici il ne corrige rien lui-même") + ". Chaque ligne se corrige à la main : userdel, usermod, groupdel, ou la ligne en trop retirée avec vipw.)" :
				"(Rien à signaler : chaque ligne est bien formée et chaque compte a son double. " + (cmd === "pwck" ? "pwck ne cherche ni les mots de passe vides ni les UID 0 en double : awk -F: '$2 == \"\"' /etc/shadow et awk -F: '$3 == 0' /etc/passwd le font." : "") + ")"));
		}
		return sortie.join("\n");
	};
}
Shell.sorts.pwck = sortVerification("pwck", ["passwd", "shadow"], analyserPasswd);
Shell.sorts.grpck = sortVerification("grpck", ["group", "gshadow"], analyserGroup);

/* ================================================================== */
/* su : devenir un autre (pam_wheel le réserve à un groupe)            */
/* ================================================================== */

/* pam_wheel dans /etc/pam.d/su : { actif, groupe } (sans group=, c'est wheel, ou root s'il n'existe pas). */
function pamWheel(hote){
	var ligne = lignesPam(hote, "su").filter(function(l){ return /^auth\s/.test(l) && /pam_wheel\.so/.test(l); })[0];
	if (!ligne) return { actif: false, groupe: null };
	var m = /\bgroup=(\S+)/.exec(ligne), groupe = m ? m[1] : null;
	if (!groupe){
		var c = comptesHote(hote);
		groupe = c.group && c.group.some(function(g){ return g.nom === "wheel"; }) ? "wheel" : "root";
	}
	return { actif: true, groupe: groupe, deny: /\bdeny\b/.test(ligne), ligne: ligne };
}

Shell.sorts.su = function(args, io){
	var cible = null, login = false, commande = null, h = Shell.hote();
	for (var i = 0; i < args.length; i++){
		var a = args[i];
		if (a === "-" || a === "-l" || a === "--login"){ login = true; continue; }
		if (a === "-c" || a === "--command"){ commande = args[++i]; if (commande === undefined) throw new ShellError("su: option requires an argument -- 'c'"); continue; }
		if (a === "-s" || a === "--shell"){ i++; continue; }
		if (a === "-p" || a === "-m"){ continue; }
		if (a.charAt(0) === "-") throw new ShellError("su: invalid option -- '" + a.replace(/^-+/, "").charAt(0) + "'\nTry 'su --help' for more information.");
		if (cible === null) cible = a;
	}
	cible = cible || "root";
	var c = comptesHote(h);
	if (c.passwd && !c.passwd.some(function(p){ return p.nom === cible; })){
		GameEvents.fire({ type: "su", cible: cible, ok: false, raison: "inexistant", hote: h });
		throw new ShellError("su: user " + cible + " does not exist or the user entry does not contain all the required fields");
	}
	if (io.sudo){
		GameEvents.fire({ type: "su", cible: cible, ok: true, raison: "sudo", hote: h });
		return io.tty ? C.gris("(Déjà root avec sudo : su ne demande rien. Dans ce monde, le terminal ne change pas d'identité : continue avec sudo devant tes sorts.)") : "";
	}
	if (!io.tty || !term.demander) throw new ShellError("su: must be run from a terminal");
	var ombre = c.shadow ? c.shadow.filter(function(s){ return s.nom === cible; })[0] : null;
	var roue = pamWheel(h);
	var interdit = roue.actif && (roue.deny ? groupesDe(h, JOUEUR).indexOf(roue.groupe) > -1 : groupesDe(h, JOUEUR).indexOf(roue.groupe) === -1);
	function conclure(ok, raison, message){
		GameEvents.fire({ type: "su", cible: cible, ok: ok, raison: raison, hote: h, commande: commande, login: login });
		term.echo(message);
		Shell.fin();
	}
	// Un mot de passe vide (et nullok dans common-auth, comme sur Debian) : su ne demande rien. Une porte grande ouverte.
	if (ombre && ombre.mdp === "" && !interdit){
		conclure(true, "vide", C.jaune("(su n'a rien demandé : le compte " + cible + " n'a PAS de mot de passe dans /etc/shadow. N'importe qui peut devenir " + cible + ". sudo passwd -l " + cible + " le verrouille.)"));
		return "";
	}
	term.demander("Password: ", true, function(reponse){
		if (interdit){
			conclure(false, "pam_wheel", "su: Permission denied" + (io.tty ? "\n" + C.gris("(pam_wheel, dans /etc/pam.d/su, réserve su au groupe " + roue.groupe + " : " + JOUEUR + " n'en est pas. Le mot de passe n'a même pas compté.)") : ""));
			return;
		}
		if (compteBloqueFaillock(h, cible)){
			conclure(false, "faillock", "su: Authentication failure" + "\n" + C.gris("(Le compte " + cible + " est verrouillé par faillock : trop d'échecs récents. sudo faillock --user " + cible + ")"));
			return;
		}
		var attendu = MOTS_DE_PASSE_BASTION[h + ":" + cible];
		var verrouille = !ombre || /^[!*]/.test(ombre.mdp || "");
		if (verrouille || attendu === undefined || reponse !== attendu){
			if (faillockActif(h)) ajouterEchecConnexion(h, cible, "pts/0", maintenantBastion(), "TTY");
			conclure(false, verrouille ? "verrouille" : "motdepasse", "su: Authentication failure" +
				"\n" + C.gris(verrouille ? "(Le compte " + cible + " n'a pas de mot de passe utilisable (! ou * dans /etc/shadow) : on ne devient pas " + cible + " avec su. C'est voulu : sudo est fait pour ça.)" :
					"(Mauvais mot de passe. Chaque échec est noté" + (faillockActif(h) ? " par faillock" : "") + ".)"));
			return;
		}
		conclure(true, "motdepasse", C.gris("(Te voilà " + cible + " dans un sous-shell. Dans ce monde, le terminal ne change pas d'identité : pour agir en root, continue avec sudo. exit referme la session de su sur un vrai système.)"));
	});
	return "";
};

/* ================================================================== */
/* useradd, userdel -r, usermod -s / -e / -c, passwd -l / -u / -S...   */
/* ================================================================== */

Shell.sorts.useradd = function(args, io){
	var o = { m: false, s: null, G: [], g: null, u: null, d: null, c: "", r: false, e: null, o: false, N: false, U: false }, nom = null;
	var valeur = function(i, opt){ if (args[i] === undefined) throw new ShellError("useradd: option requires an argument -- '" + opt + "'\nUsage: useradd [options] LOGIN", 2); return args[i]; };
	for (var i = 0; i < args.length; i++){
		var a = args[i];
		if (a === "-m" || a === "--create-home") o.m = true;
		else if (a === "-M" || a === "--no-create-home") o.m = false;
		else if (a === "-r" || a === "--system") o.r = true;
		else if (a === "-o" || a === "--non-unique") o.o = true;
		else if (a === "-N" || a === "--no-user-group") o.N = true;
		else if (a === "-U" || a === "--user-group") o.U = true;
		else if (a === "-s" || a === "--shell") o.s = valeur(++i, "s");
		else if (a === "-G" || a === "--groups") o.G = valeur(++i, "G").split(",").filter(Boolean);
		else if (a === "-g" || a === "--gid") o.g = valeur(++i, "g");
		else if (a === "-u" || a === "--uid") o.u = valeur(++i, "u");
		else if (a === "-d" || a === "--home-dir") o.d = valeur(++i, "d");
		else if (a === "-c" || a === "--comment") o.c = valeur(++i, "c");
		else if (a === "-e" || a === "--expiredate") o.e = valeur(++i, "e");
		else if (/^-[mrMoNU]+$/.test(a)){ a.substring(1).split("").forEach(function(l){ if (l === "m") o.m = true; if (l === "M") o.m = false; if (l === "r") o.r = true; if (l === "o") o.o = true; if (l === "N") o.N = true; if (l === "U") o.U = true; }); }
		else if (a.charAt(0) === "-") throw new ShellError("useradd: invalid option -- '" + a.replace(/^-+/, "").charAt(0) + "'\nUsage: useradd [options] LOGIN", 2);
		else if (nom === null) nom = a;
		else throw new ShellError("Usage: useradd [options] LOGIN\n       useradd -D\n       useradd -D [options]", 2);
	}
	if (nom === null) throw new ShellError("Usage: useradd [options] LOGIN\n       useradd -D\n       useradd -D [options]" + astuce(io, "Exemple : sudo useradd -m -s /bin/bash -G sudo ada"), 2);
	if (!io.sudo) throw new ShellError("useradd: Permission denied.\nuseradd: cannot lock /etc/passwd; try again later." + astuce(io, "Créer un compte est réservé à root : sudo useradd ..."), 1);
	var h = Shell.hote(), c = comptesHote(h);
	if (!c.passwd) throw new ShellError("useradd: cannot open /etc/passwd", 10);
	if (!nomCompteValide(nom)) throw new ShellError("useradd: invalid user name '" + nom + "': use --badname to ignore", 3);
	if (c.passwd.some(function(p){ return p.nom === nom; })) throw new ShellError("useradd: user '" + nom + "' already exists", 9);
	var groupesConnus = {};
	(c.group || []).forEach(function(g){ groupesConnus[g.nom] = g; groupesConnus["#" + g.gid] = g; });
	for (var k = 0; k < o.G.length; k++) if (!groupesConnus[o.G[k]]) throw new ShellError("useradd: group '" + o.G[k] + "' does not exist", 6);
	var defs = loginDefs(h);
	var parUser = !o.N && defs.USERGROUPS_ENAB !== "no" && o.g === null;
	if (parUser && groupesConnus[nom]) throw new ShellError("useradd: group " + nom + " exists - if you want to add this user to that group, use -g.", 9);
	var uids = c.passwd.map(function(p){ return +p.uid; });
	var uid;
	if (o.u !== null){
		if (!/^\d+$/.test(o.u)) throw new ShellError("useradd: invalid user ID '" + o.u + "'", 3);
		uid = +o.u;
		if (!o.o && uids.indexOf(uid) > -1) throw new ShellError("useradd: UID " + uid + " is not unique", 4);
	} else if (o.r){
		uid = +defs.SYS_UID_MAX;
		while (uids.indexOf(uid) > -1 && uid > +defs.SYS_UID_MIN) uid--;
	} else {
		var dans = uids.filter(function(x){ return x >= +defs.UID_MIN && x <= +defs.UID_MAX; });
		uid = dans.length ? Math.max.apply(null, dans) + 1 : +defs.UID_MIN;
	}
	var gids = (c.group || []).map(function(g){ return +g.gid; });
	var gid;
	if (o.g !== null){
		var gr = groupesConnus[o.g] || groupesConnus["#" + o.g];
		if (!gr) throw new ShellError("useradd: group '" + o.g + "' does not exist", 6);
		gid = gr.gid;
	} else if (parUser){
		gid = gids.indexOf(uid) === -1 ? uid : Math.max.apply(null, gids.concat([+defs.GID_MIN - 1])) + 1;
	} else gid = "100";
	var defautUseradd = texteHote(h, "/etc/default/useradd") || "";
	var shellDefaut = (/^\s*SHELL=(\S+)/m.exec(defautUseradd) || [null, "/bin/sh"])[1];
	var home = o.d || "/home/" + nom;
	var expire = "";
	if (o.e !== null && o.e !== "" && o.e !== "-1"){
		var de = dateBastion(o.e);
		if (de === null) throw new ShellError("useradd: invalid date '" + o.e + "'", 3);
		expire = String(joursDepuis1970(de));
	}
	ajouterLigneCompte(h, "passwd", [nom, "x", uid, gid, o.c, home, o.s === null ? shellDefaut : o.s].join(":"));
	if (c.shadow) ajouterLigneCompte(h, "shadow", [nom, "!", joursDepuis1970(maintenantBastion()), defs.PASS_MIN_DAYS, defs.PASS_MAX_DAYS, defs.PASS_WARN_AGE, "", expire, ""].join(":"));
	if (c.group){
		if (parUser){
			ajouterLigneCompte(h, "group", nom + ":x:" + gid + ":");
			if (fichierCompte(h, "gshadow")) ajouterLigneCompte(h, "gshadow", nom + ":!::");
		}
		o.G.forEach(function(g){
			modifierLigneCompte(h, "group", g, function(ch){
				var membres = (ch[3] || "").split(",").filter(Boolean);
				if (membres.indexOf(nom) === -1) membres.push(nom);
				ch[3] = membres.join(",");
				return ch;
			});
		});
	}
	if (o.m){
		var dossier = creerDossiersHote(h, home);
		if (dossier){ dossier.owner = nom; dossier.mode = defs.HOME_MODE === "0700" ? "rwx------" : "rwxr-xr-x"; }
	}
	GameEvents.fire({ type: "useradd", qui: nom, uid: uid, hote: h, groupes: o.G.slice() });
	return io.tty ? C.gris("(Compte " + nom + " créé : UID " + uid + ", shell " + (o.s === null ? shellDefaut : o.s) + (o.m ? ", dossier " + home : ", sans dossier personnel (-m le crée)") +
		". Son mot de passe est verrouillé (!) tant qu'on ne lui en donne pas un : sudo passwd " + nom + ".)") : "";
};

var USERDEL_AVANT_BASTION = Shell.sorts.userdel;
Shell.sorts.userdel = function(args, io){
	var supprimerHome = args.some(function(a){ return a === "-r" || a === "--remove" || /^-[a-z]*r[a-z]*$/.test(a); });
	var nom = args.filter(function(a){ return a.charAt(0) !== "-"; })[0];
	var h = Shell.hote();
	var compte = nom ? compteDe(h, nom) : null;
	var sortie = USERDEL_AVANT_BASTION.apply(this, arguments);
	if (!compte) return sortie;
	var gshadow = fichierCompte(h, "gshadow");
	if (gshadow) gshadow.setText(lignesDe(gshadow.getText()).filter(function(l){ return l.split(":")[0] !== nom; }).map(function(l){
		var ch = l.split(":");
		if (ch.length >= 4) ch[3] = ch[3].split(",").filter(function(m){ return m !== nom; }).join(",");
		return ch.join(":");
	}).join("\n") + "\n");
	var messages = [];
	if (supprimerHome){
		if (!noeudHote(h, "/var/mail/" + nom)) messages.push("userdel: " + nom + " mail spool (/var/mail/" + nom + ") not found");
		else supprimerFichierHote(h, "/var/mail/" + nom);
		if (compte.home && compte.home !== "/" && dossierHote(h, compte.home)) supprimerDossierHote(h, compte.home);
	}
	GameEvents.fire({ type: "userdel", qui: nom, host: h, home: supprimerHome, bastion: true });
	messages.forEach(function(m){ io.err(m); });
	return sortie;
};

var USERMOD_AVANT_BASTION = Shell.sorts.usermod;
Shell.sorts.usermod = function(args, io){
	var shell = null, expire = null, commentaire = null, reste = [];
	for (var i = 0; i < args.length; i++){
		var a = args[i];
		if (a === "-s" || a === "--shell"){ shell = args[++i]; if (shell === undefined) throw new ShellError("usermod: option requires an argument -- 's'", 2); continue; }
		if (/^--shell=/.test(a)){ shell = a.substring(8); continue; }
		if (a === "-e" || a === "--expiredate"){ expire = args[++i]; if (expire === undefined) throw new ShellError("usermod: option requires an argument -- 'e'", 2); continue; }
		if (a === "-c" || a === "--comment"){ commentaire = args[++i]; if (commentaire === undefined) throw new ShellError("usermod: option requires an argument -- 'c'", 2); continue; }
		reste.push(a);
	}
	var nom = reste.filter(function(a, k){ return a.charAt(0) !== "-" && !/^-[a-zA-Z]*G$/.test(reste[k - 1] || ""); }).pop();
	var h = Shell.hote();
	// -U sur un compte dont le mot de passe n'est qu'un « ! » : le vrai usermod refuse de créer un compte sans mot de passe.
	if (reste.indexOf("-U") > -1 && nom && io.sudo){
		var om = shadowDe(h, nom);
		if (om && /^!+$/.test(om.mdp)) throw new ShellError("usermod: unlocking the user's password would result in a passwordless account.\nYou should set a password with usermod -p to unlock this user's password." +
			astuce(io, "Ce compte n'a jamais eu de mot de passe : le déverrouiller l'ouvrirait à tous. Donne-lui d'abord un mot de passe (sudo passwd " + nom + ")."), 1);
	}
	if (shell === null && expire === null && commentaire === null) return USERMOD_AVANT_BASTION.apply(this, arguments);
	if (!nom) throw new ShellError("Usage: usermod [options] LOGIN" + astuce(io, "Exemples : sudo usermod -s /usr/sbin/nologin www-data, sudo usermod -e 2026-12-31 stagiaire"), 2);
	if (!io.sudo) throw new ShellError("usermod: Permission denied.\nusermod: cannot lock /etc/passwd; try again later." + astuce(io, "Réservé à root : sudo usermod ..."), 1);
	var compte = compteDe(h, nom);
	if (!compte) throw new ShellError("usermod: user '" + nom + "' does not exist", 6);
	if (shell !== null && shell !== "" && shell.charAt(0) !== "/" && shell.charAt(0) !== "*") throw new ShellError("usermod: invalid shell '" + shell + "'" + astuce(io, "Un shell s'écrit avec son chemin complet : /usr/sbin/nologin, /bin/bash"), 3);
	var jours = null;
	if (expire !== null){
		if (expire === "" || expire === "-1") jours = "";
		else if (/^\d+$/.test(expire)) jours = expire;
		else {
			var de = dateBastion(expire);
			if (de === null) throw new ShellError("usermod: invalid date '" + expire + "'", 3);
			jours = String(joursDepuis1970(de));
		}
	}
	var change = false;
	if (shell !== null || commentaire !== null){
		modifierLigneCompte(h, "passwd", nom, function(ch){
			while (ch.length < 7) ch.push("");
			if (shell !== null && ch[6] !== shell){ ch[6] = shell; change = true; }
			if (commentaire !== null && ch[4] !== commentaire){ ch[4] = commentaire; change = true; }
			return ch;
		});
	}
	if (jours !== null){
		modifierLigneCompte(h, "shadow", nom, function(ch){
			while (ch.length < 9) ch.push("");
			if (ch[7] !== jours){ ch[7] = jours; change = true; }
			return ch;
		});
	}
	GameEvents.fire({ type: "usermod", qui: nom, shell: shell, expire: jours, commentaire: commentaire, host: h });
	var autres = reste.filter(function(a){ return a !== nom; });
	var suite = autres.length ? USERMOD_AVANT_BASTION.call(this, reste, io) : "";
	if (!change && !autres.length) return "usermod: no changes";
	if (suite) return suite;
	if (!io.tty) return "";
	return C.gris("(" + nom + (shell !== null ? " : shell " + shell + (/nologin|false/.test(shell) ? ", plus personne ne peut ouvrir de session avec ce compte" : "") : "") +
		(jours !== null ? (jours === "" ? " : le compte n'expire plus" : " : le compte expire le " + dateDesJoursShadow(jours)) : "") + ".)");
};

/* passwd -l / -u / -d / -e / -S / -x / -n / -w : verrouiller, déverrouiller, vider, faire expirer, l'état. */
var PASSWD_AVANT_BASTION = Shell.sorts.passwd;
Shell.sorts.passwd = function(args, io){
	var action = null, valeur = null, nom = null;
	for (var i = 0; i < args.length; i++){
		var a = args[i];
		if (/^-[ludeS]$/.test(a) || /^--(lock|unlock|delete|expire|status)$/.test(a)){ action = { "--lock": "l", "--unlock": "u", "--delete": "d", "--expire": "e", "--status": "S" }[a] || a.charAt(1); continue; }
		if (/^-[xnw]$/.test(a)){ action = a.charAt(1); valeur = args[++i]; if (valeur === undefined || !/^-?\d+$/.test(valeur)) throw new ShellError("passwd: invalid numeric argument '" + (valeur || "") + "'"); continue; }
		if (a === "-a" || a === "--all") continue;
		if (a.charAt(0) !== "-") nom = a;
	}
	if (action === null) return PASSWD_AVANT_BASTION.apply(this, arguments);
	var h = Shell.hote();
	nom = nom || (io.sudo ? "root" : JOUEUR);
	if (!io.sudo && (action !== "S" || nom !== JOUEUR)) throw new ShellError("passwd: Permission denied." + astuce(io, "Réservé à root : sudo passwd -" + action + " " + nom), 1);
	var ombre = shadowDe(h, nom);
	if (!ombre){
		if (!compteDe(h, nom)) throw new ShellError("passwd: user '" + nom + "' does not exist", 1);
		throw new ShellError("passwd: cannot open /etc/shadow", 1);
	}
	GameEvents.fire({ type: "passwdCompte", action: action, qui: nom, hote: h });
	if (action === "S"){
		var etat = /^!/.test(ombre.mdp) ? "L" : (ombre.mdp === "" ? "NP" : (ombre.mdp === "*" ? "L" : "P"));
		var dernier = ombre.dernier === "" ? "never" : (ombre.dernier === "0" ? "01/01/1970" : (function(){ var d = new Date(Date.UTC(1970, 0, 1) + (+ombre.dernier) * 86400000); return deuxChiffres(d.getUTCMonth() + 1) + "/" + deuxChiffres(d.getUTCDate()) + "/" + d.getUTCFullYear(); })());
		return [nom, etat, dernier, ombre.min || "0", ombre.max || "99999", ombre.avertir || "7", ombre.inactif === "" || ombre.inactif === undefined ? "-1" : ombre.inactif].join(" ") +
			(io.tty ? "\n" + C.gris("(" + { L: "L : mot de passe verrouillé", NP: "NP : AUCUN mot de passe, le compte s'ouvre sans rien taper", P: "P : un mot de passe utilisable" }[etat] + ".)") : "");
	}
	modifierLigneCompte(h, "shadow", nom, function(ch){
		while (ch.length < 9) ch.push("");
		if (action === "l") ch[1] = ch[1].charAt(0) === "!" ? ch[1] : "!" + ch[1];
		if (action === "u"){
			if (/^!+$/.test(ch[1])) throw new ShellError("passwd: unlocking the password would result in a passwordless account.\nYou should set a password with usermod -p to unlock the password of this account.", 3);
			ch[1] = ch[1].replace(/^!/, "");
		}
		if (action === "d") ch[1] = "";
		if (action === "e") ch[2] = "0";
		if (action === "x") ch[4] = valeur;
		if (action === "n") ch[3] = valeur;
		if (action === "w") ch[5] = valeur;
		return ch;
	});
	var texte = /[xnwe]/.test(action) ? "passwd: password expiry information changed." : "passwd: password changed.";
	if (io.tty){
		texte += "\n" + C.gris({ l: "(Mot de passe de " + nom + " verrouillé : un « ! » devant son empreinte dans /etc/shadow. Une clé SSH ouvre encore la porte : pour fermer le compte, usermod -s /usr/sbin/nologin ou chage -E 0.)",
			u: "(Mot de passe de " + nom + " déverrouillé.)", d: "(Attention : " + nom + " n'a plus AUCUN mot de passe. passwd -l le referme.)",
			e: "(" + nom + " devra changer son mot de passe à la prochaine connexion.)", x: "(Le mot de passe de " + nom + " expirera " + valeur + " jours après son dernier changement.)",
			n: "(" + nom + " devra attendre " + valeur + " jours entre deux changements.)", w: "(" + nom + " sera prévenu " + valeur + " jours avant l'expiration.)" }[action]);
	}
	return texte;
};

/* chage : l'âge des mots de passe. Sur la Citadelle (chapitre 3), la version d'origine garde ses répliques. */
var CHAGE_AVANT_BASTION = Shell.sorts.chage;
Shell.sorts.chage = function(args, io){
	var h = Shell.hote();
	if (h === "citadelle") return CHAGE_AVANT_BASTION.apply(this, arguments);
	var liste = false, champs = {}, nom = null;
	var noms = { "-M": "max", "--maxdays": "max", "-m": "min", "--mindays": "min", "-W": "warn", "--warndays": "warn", "-I": "inactive", "--inactive": "inactive", "-E": "expire", "--expiredate": "expire", "-d": "last", "--lastday": "last" };
	for (var i = 0; i < args.length; i++){
		var a = args[i];
		if (a === "-l" || a === "--list"){ liste = true; continue; }
		if (noms[a]){
			var v = args[++i];
			if (v === undefined) throw new ShellError("chage: option requires an argument -- '" + a.replace(/^-+/, "").charAt(0) + "'", 2);
			champs[noms[a]] = v;
			continue;
		}
		if (a.charAt(0) === "-") throw new ShellError("chage: invalid option -- '" + a.replace(/^-+/, "").charAt(0) + "'\nUsage: chage [options] LOGIN", 2);
		nom = a;
	}
	if (!nom) throw new ShellError("Usage: chage [options] LOGIN\n\nOptions:\n  -d, --lastday LAST_DAY\n  -E, --expiredate EXPIRE_DATE\n  -I, --inactive INACTIVE\n  -l, --list\n  -m, --mindays MIN_DAYS\n  -M, --maxdays MAX_DAYS\n  -W, --warndays WARN_DAYS" +
		astuce(io, "Exemples : chage -l NOM (lire), sudo chage -M 90 NOM (90 jours au plus), sudo chage -E 2026-12-31 NOM"), 2);
	var ombre = shadowDe(h, nom);
	if (!compteDe(h, nom) && !ombre) throw new ShellError("chage: user '" + nom + "' does not exist in /etc/passwd", 1);
	if (!ombre) throw new ShellError("chage: cannot open /etc/shadow", 1);
	var modifier = Object.keys(champs).length > 0;
	if (!io.sudo && (modifier || nom !== JOUEUR)) throw new ShellError("chage: Permission denied." + astuce(io, "Lire ou changer le compte d'un autre demande sudo : sudo chage " + args.join(" ")), 1);
	if (modifier){
		var rang = { last: 2, min: 3, max: 4, warn: 5, inactive: 6, expire: 7 }, nouveaux = {};
		Object.keys(champs).forEach(function(k){
			var v = champs[k];
			if (k === "expire" || k === "last"){
				if (v === "-1") nouveaux[k] = "";
				else if (/^\d+$/.test(v)) nouveaux[k] = v;
				else { var d = dateBastion(v); if (d === null) throw new ShellError("chage: invalid date '" + v + "'", 2); nouveaux[k] = String(joursDepuis1970(d)); }
			} else {
				if (!/^-?\d+$/.test(v)) throw new ShellError("chage: invalid " + { min: "minimum", max: "maximum", warn: "warning", inactive: "inactive" }[k] + " number of days '" + v + "'" + (k === "inactive" ? "" : ""), 2);
				nouveaux[k] = v === "-1" ? "" : v;
			}
		});
		modifierLigneCompte(h, "shadow", nom, function(ch){
			while (ch.length < 9) ch.push("");
			Object.keys(nouveaux).forEach(function(k){ ch[rang[k]] = nouveaux[k]; });
			return ch;
		});
		GameEvents.fire({ type: "chage", host: h, qui: nom, champs: nouveaux });
		return "";
	}
	GameEvents.fire({ type: "chage", host: h, qui: nom, lecture: true });
	var dernier = ombre.dernier, max = ombre.max, inactif = ombre.inactif;
	var texteDernier = dernier === "" || dernier === undefined ? "never" : (dernier === "0" ? "password must be changed" : dateDesJoursShadow(dernier));
	var expirePas = max === "" || max === undefined || max === "99999" || max === "-1";
	var texteExpire = dernier === "0" ? "password must be changed" : (expirePas || dernier === "" ? "never" : dateDesJoursShadow(+dernier + (+max)));
	var texteInactif = dernier === "0" ? "password must be changed" : (expirePas || inactif === "" || inactif === undefined || dernier === "" ? "never" : dateDesJoursShadow(+dernier + (+max) + (+inactif)));
	return ["Last password change\t\t\t\t\t: " + texteDernier,
		"Password expires\t\t\t\t\t: " + texteExpire,
		"Password inactive\t\t\t\t\t: " + texteInactif,
		"Account expires\t\t\t\t\t\t: " + (ombre.expire === "" || ombre.expire === undefined ? "never" : dateDesJoursShadow(ombre.expire)),
		"Minimum number of days between password change\t\t: " + (ombre.min === "" || ombre.min === undefined ? "-1" : ombre.min),
		"Maximum number of days between password change\t\t: " + (max === "" || max === undefined ? "-1" : max),
		"Number of days of warning before password expires\t: " + (ombre.avertir === "" || ombre.avertir === undefined ? "-1" : ombre.avertir)].join("\n");
};

/* ================================================================== */
/* last et lastlog : les connexions déclarées par le monde              */
/* ================================================================== */

var CONNEXIONS_BASTION = {};
function declarerConnexions(hote, liste){
	CONNEXIONS_BASTION[hote] = (liste || []).map(function(c){
		return { qui: c.qui, tty: c.tty || "pts/0", depuis: c.depuis || "", quand: dateBastion(c.quand), fin: c.fin === undefined ? null : (c.fin === "still" ? "still" : dateBastion(c.fin)) };
	}).filter(function(c){ return c.qui && c.quand !== null; });
}

var LASTLOG_AVANT_BASTION = Shell.sorts.lastlog;
Shell.sorts.lastlog = function(args, io){
	var h = Shell.hote();
	if (!CONNEXIONS_BASTION[h]) return LASTLOG_AVANT_BASTION.apply(this, arguments);
	var qui = null, avant = null, apres = null;
	for (var i = 0; i < args.length; i++){
		var a = args[i];
		if (a === "-u" || a === "--user"){ qui = args[++i]; continue; }
		if (a === "-b" || a === "--before"){ avant = parseInt(args[++i], 10); if (isNaN(avant)) throw new ShellError("lastlog: invalid numeric argument '" + args[i] + "'"); continue; }
		if (a === "-t" || a === "--time"){ apres = parseInt(args[++i], 10); if (isNaN(apres)) throw new ShellError("lastlog: invalid numeric argument '" + args[i] + "'"); continue; }
		throw new ShellError("Usage: lastlog [options]\n\nOptions:\n  -b, --before DAYS\n  -t, --time DAYS\n  -u, --user LOGIN", 1);
	}
	var c = comptesHote(h), comptes = c.passwd ? c.passwd.map(function(p){ return p.nom; }) : [];
	if (qui){
		if (comptes.indexOf(qui) === -1) throw new ShellError("lastlog: Unknown user or range: " + qui);
		comptes = [qui];
	}
	var dernieres = {};
	CONNEXIONS_BASTION[h].forEach(function(x){ if (!dernieres[x.qui] || dernieres[x.qui].quand < x.quand) dernieres[x.qui] = x; });
	var maintenant = maintenantBastion();
	var lignes = [completerDroite("Username", 16) + " " + completerDroite("Port", 8) + " " + completerDroite("From", 16) + " Latest"];
	var dormants = [];
	comptes.forEach(function(n){
		var x = dernieres[n], age = x ? (maintenant - x.quand) / 86400000 : Infinity;
		if (avant !== null && age < avant) return;
		if (apres !== null && !(age <= apres)) return;
		if (x) lignes.push(completerDroite(n, 16) + " " + completerDroite(x.tty, 8) + " " + completerDroite(x.depuis, 16) + " " + dateLongue(new Date(x.quand)));
		else lignes.push(completerDroite(n, 16) + " " + completerDroite("", 8) + " " + completerDroite("", 16) + " **Never logged in**");
		var p = c.passwd ? c.passwd.filter(function(y){ return y.nom === n; })[0] : null;
		if (p && !/nologin|false$/.test(p.shell || "") && (!x || age > 90)) dormants.push(n);
	});
	GameEvents.fire({ type: "lastlog", host: h, dormants: dormants.slice() });
	if (io.tty && dormants.length) lignes.push(C.gris("(Comptes avec un vrai shell, sans connexion depuis plus de 90 jours ou jamais : " + dormants.join(", ") + ". Des comptes dormants : à verrouiller ou à supprimer.)"));
	return lignes.join("\n");
};

var LAST_AVANT_BASTION = Shell.sorts.last;
Shell.sorts.last = function(args, io){
	var h = Shell.hote();
	if (!CONNEXIONS_BASTION[h]) return LAST_AVANT_BASTION.apply(this, arguments);
	var n = null, qui = null;
	for (var i = 0; i < args.length; i++){
		if (args[i] === "-n") n = parseInt(args[++i], 10);
		else if (/^-\d+$/.test(args[i])) n = parseInt(args[i].substring(1), 10);
		else if (args[i] === "-a" || args[i] === "-i" || args[i] === "-F" || args[i] === "-w") continue;
		else if (args[i].charAt(0) === "-") throw new ShellError("last: invalid option -- '" + args[i].charAt(1) + "'\nTry 'last --help' for more information.");
		else qui = args[i];
	}
	var liste = CONNEXIONS_BASTION[h].filter(function(x){ return !qui || x.qui === qui || x.tty === qui; }).sort(function(a, b){ return b.quand - a.quand; });
	if (n) liste = liste.slice(0, n);
	var lignes = liste.map(function(x){
		var d = new Date(x.quand), debut = JOURS_EN[d.getDay()] + " " + MOIS_EN[d.getMonth()] + " " + jourEspace(d) + " " + deuxChiffres(d.getHours()) + ":" + deuxChiffres(d.getMinutes());
		var fin;
		if (x.fin === null || x.fin === "still") fin = "  still logged in";
		else {
			var f = new Date(x.fin), duree = Math.max(0, Math.round((x.fin - x.quand) / 60000));
			fin = " - " + deuxChiffres(f.getHours()) + ":" + deuxChiffres(f.getMinutes()) + "  (" + deuxChiffres(Math.floor(duree / 60)) + ":" + deuxChiffres(duree % 60) + ")";
		}
		return completerDroite(x.qui, 8) + " " + completerDroite(x.tty, 12) + " " + completerDroite(x.depuis, 16) + " " + debut + fin;
	});
	var premier = CONNEXIONS_BASTION[h].reduce(function(m, x){ return Math.min(m, x.quand); }, maintenantBastion());
	var debutWtmp = new Date(premier - 3600000);
	GameEvents.fire({ type: "last", host: h, qui: qui });
	return lignes.concat(["", "wtmp begins " + JOURS_EN[debutWtmp.getDay()] + " " + MOIS_EN[debutWtmp.getMonth()] + " " + jourEspace(debutWtmp) + " " + heureComplete(debutWtmp) + " " + debutWtmp.getFullYear()]).join("\n");
};

/* id d'un compte créé ou décrit sur la machine (et inconnu de UTILISATEURS). */
var ID_AVANT_BASTION = Shell.sorts.id;
Shell.sorts.id = function(args, io){
	var noms = args.filter(function(a){ return a.charAt(0) !== "-"; }), h = Shell.hote();
	if (noms.length && noms[0] !== JOUEUR && noms[0] !== "root" && !UTILISATEURS.hasOwnProperty(noms[0])){
		var compte = compteDe(h, noms[0]);
		if (!compte) throw new ShellError("id: '" + noms[0] + "': no such user");
		var options = args.filter(function(a){ return a.charAt(0) === "-"; }).join("").replace(/-/g, "");
		var c = comptesHote(h);
		var principal = (c.group || []).filter(function(g){ return g.gid === compte.gid; })[0];
		if (/u/.test(options)) return /n/.test(options) ? compte.nom : compte.uid;
		if (/g/.test(options)) return /n/.test(options) ? (principal ? principal.nom : compte.gid) : compte.gid;
		var groupes = [compte.gid + "(" + (principal ? principal.nom : compte.gid) + ")"];
		(c.group || []).forEach(function(g){ if (g.membres.indexOf(compte.nom) > -1 && g.gid !== compte.gid) groupes.push(g.gid + "(" + g.nom + ")"); });
		return "uid=" + compte.uid + "(" + compte.nom + ") gid=" + compte.gid + "(" + (principal ? principal.nom : compte.gid) + ") groupes=" + groupes.join(",");
	}
	return ID_AVANT_BASTION.apply(this, arguments);
};

/* ================================================================== */
/* umask et TMOUT                                                      */
/* ================================================================== */

/* Le masque de la session : celui qu'on a réglé sur cette machine, sinon UMASK de /etc/login.defs (022 par défaut). */
var UMASK_SESSION = { hote: null, masque: null };
function umaskCourant(){
	var h = Shell.hote();
	if (UMASK_SESSION.hote === h && UMASK_SESSION.masque !== null) return UMASK_SESSION.masque;
	var m = loginDefs(h).UMASK;
	return /^[0-7]{1,4}$/.test(m) ? parseInt(m, 8) : 18;
}
function umaskOctal(n){ return ("000" + n.toString(8)).slice(-4); }
function umaskSymbolique(n){
	var r = [];
	["u", "g", "o"].forEach(function(qui, k){
		var bits = (~n >> (6 - 3 * k)) & 7;
		r.push(qui + "=" + (bits & 4 ? "r" : "") + (bits & 2 ? "w" : "") + (bits & 1 ? "x" : ""));
	});
	return r.join(",");
}
Shell.sorts.umask = function(args, io){
	if (io.sudo) throw new ShellError("sudo: umask: command not found" + astuce(io, "umask est une commande intégrée au shell : elle règle TA session, sudo ne peut pas la lancer."), 1);
	var symbolique = false, p = false, valeur = null;
	args.forEach(function(a){
		if (a === "-S") symbolique = true;
		else if (a === "-p") p = true;
		else if (/^-/.test(a) && a !== "-") throw new ShellError("bash: umask: " + a + ": invalid option\numask: usage: umask [-p] [-S] [mode]", 2);
		else valeur = a;
	});
	if (valeur === null){
		var m = umaskCourant();
		if (symbolique) return umaskSymbolique(m);
		return (p ? "umask " : "") + umaskOctal(m);
	}
	var nouveau;
	if (/^\d+$/.test(valeur)){
		nouveau = /^[0-7]+$/.test(valeur) ? parseInt(valeur, 8) : 512;
		if (nouveau > 511) throw new ShellError("bash: umask: " + valeur + ": octal number out of range", 1);
	} else {
		var perm = 511 & ~umaskCourant();
		valeur.split(",").forEach(function(clause){
			var mm = /^([ugoa]*)([=+-])([rwx]*)$/.exec(clause);
			if (!mm) throw new ShellError("bash: umask: `" + clause.replace(/^[ugoa]*/, "").charAt(0) + "': invalid symbolic mode operator", 1);
			var qui = mm[1] === "" || mm[1].indexOf("a") > -1 ? "ugo" : mm[1];
			var bits = (mm[3].indexOf("r") > -1 ? 4 : 0) | (mm[3].indexOf("w") > -1 ? 2 : 0) | (mm[3].indexOf("x") > -1 ? 1 : 0);
			qui.split("").forEach(function(q){
				var dec = { u: 6, g: 3, o: 0 }[q];
				if (mm[2] === "=") perm = (perm & ~(7 << dec)) | (bits << dec);
				if (mm[2] === "+") perm |= bits << dec;
				if (mm[2] === "-") perm &= ~(bits << dec);
			});
		});
		nouveau = 511 & ~perm;
	}
	UMASK_SESSION.hote = Shell.hote();
	UMASK_SESSION.masque = nouveau;
	GameEvents.fire({ type: "umask", masque: umaskOctal(nouveau), symbolique: umaskSymbolique(nouveau) });
	if (!io.tty) return "";
	var fichier = 438 & ~nouveau, dossier = 511 & ~nouveau;
	return C.gris("(Désormais, dans cette session : fichiers neufs en " + droitsTexte(fichier) + " (" + umaskOctal(fichier).substring(1) + "), dossiers en " + droitsTexte(dossier) + " (" + umaskOctal(dossier).substring(1) +
		"). Pour tous les comptes et pour de bon : UMASK dans /etc/login.defs.)");
};
function droitsTexte(n){
	var t = "";
	for (var k = 8; k >= 0; k--) t += (n >> k) & 1 ? "rwx".charAt((8 - k) % 3) : "-";
	return t;
}
/* Ce que l'on crée prend les droits que permet le masque (s'il n'est pas celui de départ, 022). */
var ADD_ITEM_UMASK = Room.prototype.addItem;
Room.prototype.addItem = function(item){
	if (World.fige && item && !item.id && this.items.indexOf(item) === -1 && item.mode === "rw-r--r--" && item.age === 0 && !BASTION_CHARGEMENT && !item.lien){
		var m = umaskCourant();
		if (m !== 18) item.mode = droitsTexte(438 & ~m);
	}
	return ADD_ITEM_UMASK.apply(this, arguments);
};

/* TMOUT déclaré « readonly » dans /etc/profile.d/*.sh (ou /etc/profile, /etc/bash.bashrc) : on ne peut ni le changer ni l'effacer. */
function tmoutHote(hote){
	var textes = [texteHote(hote, "/etc/profile"), texteHote(hote, "/etc/bash.bashrc")];
	fichiersDuDossier(hote, "/etc/profile.d").forEach(function(f){ if (/\.sh$/.test(f.nom)) textes.push(f.item.getText()); });
	var valeur = null, lecture = false;
	textes.forEach(function(t){
		if (t === null || t === undefined) return;
		lignesDe(t).forEach(function(l){
			l = l.replace(/#.*$/, "");
			var m = /(?:^|[\s;])(?:readonly\s+|export\s+|declare\s+-[a-zA-Z]*\s+)*TMOUT=(\d+)/.exec(l);
			if (m) valeur = m[1];
			if (/(?:^|[\s;])readonly\s+(?:[A-Za-z_]+=?\S*\s+)*TMOUT\b/.test(l) || /declare\s+-[a-zA-Z]*r[a-zA-Z]*\s+TMOUT/.test(l)) lecture = true;
		});
	});
	return { valeur: valeur, lectureSeule: lecture && valeur !== null };
}
var DEFINIR_VARIABLE_AVANT_BASTION = Shell.definirVariable;
Shell.definirVariable = function(affectation, cmd){
	var nom = affectation.substring(0, affectation.indexOf("="));
	if (nom === "TMOUT" && tmoutHote(Shell.hote()).lectureSeule){
		GameEvents.fire({ type: "tmout", refuse: true });
		throw new ShellError("bash: TMOUT: readonly variable", 1);
	}
	return DEFINIR_VARIABLE_AVANT_BASTION.apply(this, arguments);
};
/* TMOUT est une variable d'environnement de la session : on la pose dans l'environnement quand la machine la fixe. */
var TMOUT_POSE = null;
function synchroniserTmout(){
	if (typeof state === "undefined" || !state || !state.env) return;
	var t = tmoutHote(Shell.hote());
	if (t.valeur !== null){
		if (!state.env.hasOwnProperty("TMOUT") || TMOUT_POSE !== null){ state.env.TMOUT = t.valeur; TMOUT_POSE = t.valeur; }
	} else if (TMOUT_POSE !== null){
		if (state.env.TMOUT === TMOUT_POSE) delete state.env.TMOUT;
		TMOUT_POSE = null;
	}
}
var EXECUTER_AVANT_BASTION = Shell.executer;
Shell.executer = function(ligne){
	synchroniserTmout();
	return EXECUTER_AVANT_BASTION.apply(this, arguments);
};
var VARIABLE_AVANT_BASTION = Shell.variable;
Shell.variable = function(nom){
	if (nom === "TMOUT" && !state.env.hasOwnProperty("TMOUT")){
		var t = tmoutHote(Shell.hote());
		if (t.valeur !== null) return t.valeur;
	}
	return VARIABLE_AVANT_BASTION.apply(this, arguments);
};
var SUPPRIMER_AVANT_BASTION = Interpreteur.supprimer;
Interpreteur.supprimer = function(nom){
	if (nom === "TMOUT" && tmoutHote(Shell.hote()).lectureSeule){
		GameEvents.fire({ type: "tmout", refuse: true });
		throw new ShellError("bash: unset: TMOUT: cannot unset: readonly variable", 1);
	}
	return SUPPRIMER_AVANT_BASTION.apply(this, arguments);
};

/* ================================================================== */
/* sudoers : le lecteur (celui de visudo -c et de sudo -l)             */
/* ================================================================== */

var DEFAULTS_SUDO_CONNUS = ["env_reset", "mail_badpass", "secure_path", "use_pty", "timestamp_timeout", "passwd_tries", "passwd_timeout", "logfile", "log_input", "log_output",
	"requiretty", "lecture", "lecture_file", "insults", "badpass_message", "editor", "env_keep", "env_delete", "env_check", "umask", "umask_override", "rootpw", "targetpw", "runaspw",
	"iolog_dir", "iolog_file", "syslog", "syslog_goodpri", "syslog_badpri", "always_set_home", "set_home", "visiblepw", "mailto", "mailsub", "mail_always", "mail_no_user", "mail_no_host",
	"mail_no_perms", "mailerpath", "authenticate", "noexec", "pwfeedback", "timestamp_type", "timestampdir", "log_allowed", "log_denied", "fqdn", "ignore_dot", "listpw", "verifypw",
	"exempt_group", "sudoers_locale", "use_netgroups", "env_editor", "secure_path", "closefrom", "log_year", "log_host", "loglinelen", "logfile", "passprompt", "runas_default",
	"shell_noargs", "stay_setuid", "preserve_groups", "match_group_by_gid", "ignore_unknown_defaults", "log_subcmds", "intercept", "admin_flag", "lecture_status_dir", "rlimit_core",
	"syslog_maxlen", "requiretty", "use_loginclass", "setenv", "secure_path", "always_query_group_plugin", "case_insensitive_user", "case_insensitive_group", "log_format", "pam_session"];
var TAGS_SUDO = ["NOPASSWD", "PASSWD", "NOEXEC", "EXEC", "SETENV", "NOSETENV", "LOG_INPUT", "NOLOG_INPUT", "LOG_OUTPUT", "NOLOG_OUTPUT", "MAIL", "NOMAIL", "FOLLOW", "NOFOLLOW", "INTERCEPT", "NOINTERCEPT"];

/* Une erreur de syntaxe, au format de sudo 1.9 : « fichier:ligne:colonne: syntax error », la ligne, et ^~~ dessous. */
function ErreurSudoers(fichier, ligne, colonne, texteLigne, longueur, message){
	this.fichier = fichier; this.ligne = ligne; this.colonne = colonne; this.texteLigne = texteLigne; this.longueur = longueur || 1;
	this.message = message || "syntax error";
}
ErreurSudoers.prototype.texte = function(){
	var souligne = "";
	for (var i = 1; i < this.colonne; i++) souligne += " ";
	souligne += "^";
	for (var k = 1; k < this.longueur; k++) souligne += "~";
	return this.fichier + ":" + this.ligne + ":" + this.colonne + ": " + this.message + "\n" + this.texteLigne + "\n" + souligne;
};

/*
 * Lit le texte d'un fichier sudoers. Renvoie { erreurs: [ErreurSudoers], defauts: [{ portee, liste }], alias: { User, Runas, Host, Cmnd },
 * specs: [{ users, hosts, cmnds: [{ runas, tags, commande }], ligne }], includes: [{ chemin, dossier }] }.
 */
function lireSudoers(texte, fichier){
	var r = { erreurs: [], defauts: [], alias: { User: {}, Runas: {}, Host: {}, Cmnd: {} }, specs: [], includes: [] };
	var brutes = String(texte).split("\n");
	for (var n = 0; n < brutes.length; n++){
		var debut = n, ligne = brutes[n];
		while (/\\$/.test(ligne) && n + 1 < brutes.length){ n++; ligne = ligne.replace(/\\$/, " ") + brutes[n]; }
		try {
			lireLigneSudoers(ligne, debut + 1, fichier, r);
		} catch (e){
			if (!(e instanceof ErreurSudoers)) throw e;
			r.erreurs.push(e);
		}
	}
	return r;
}
function lireLigneSudoers(ligneBrute, numero, fichier, r){
	var t = ligneBrute;
	var inc = /^\s*[@#](include(?:dir)?)\s+(\S+)\s*$/.exec(t);
	if (inc){ r.includes.push({ chemin: inc[2], dossier: inc[1] === "includedir", ligne: numero }); return; }
	if (/^\s*@include/.test(t)) throw new ErreurSudoers(fichier, numero, t.indexOf("@") + 1, ligneBrute, t.trim().length);
	// Un commentaire : « # » en début de mot (sauf #123, un UID, en tête de ligne).
	var sans = "", dansGuillemets = false;
	for (var i = 0; i < t.length; i++){
		var c = t.charAt(i);
		if (c === "\\" && i + 1 < t.length){ sans += c + t.charAt(i + 1); i++; continue; }
		if (c === "\"") dansGuillemets = !dansGuillemets;
		if (c === "#" && !dansGuillemets && !(/^\s*$/.test(sans) && /^#\d/.test(t.substring(i)))) break;
		sans += c;
	}
	if (sans.trim() === "") return;
	var pos = { i: 0 }, s = sans;
	function blanc(){ while (pos.i < s.length && /\s/.test(s.charAt(pos.i))) pos.i++; }
	function erreur(longueur){
		blanc();
		var mot = /^[^\s,:=()]+/.exec(s.substring(pos.i));
		throw new ErreurSudoers(fichier, numero, pos.i + 1, ligneBrute, longueur || (mot ? mot[0].length : 1));
	}
	function mot(regle){
		blanc();
		var m = regle.exec(s.substring(pos.i));
		if (!m) return null;
		pos.i += m[0].length;
		return m[0];
	}
	function attendre(car){
		blanc();
		if (s.charAt(pos.i) !== car) erreur();
		pos.i++;
	}
	var NOM = /^!*\s*(?:%:?[A-Za-z0-9_.\-$]+|#\d+|\+[A-Za-z0-9_.\-]+|[A-Za-z0-9_.\-$]+|"[^"]*")/;
	function liste(){
		var elements = [];
		do {
			var e = mot(NOM);
			if (e === null) erreur();
			elements.push(e.replace(/\s+/g, "").replace(/^"|"$/g, ""));
			blanc();
		} while (s.charAt(pos.i) === "," && ++pos.i);
		return elements;
	}
	// Defaults, Defaults:user, Defaults@host, Defaults!cmnd, Defaults>runas
	var def = /^\s*Defaults([:@!>]\S+)?(?=\s|$)/.exec(s);
	if (def){
		pos.i = def[0].length;
		var options = [];
		do {
			blanc();
			var o = mot(/^!*[a-z_][a-z0-9_]*(?:\s*[+\-]?=\s*(?:"(?:[^"\\]|\\.)*"|(?:[^,\s\\]|\\.)+))?/);
			if (o === null) erreur();
			var nomOption = o.replace(/^!+/, "").replace(/\s*[+\-]?=[\s\S]*$/, "");
			if (DEFAULTS_SUDO_CONNUS.indexOf(nomOption) === -1){
				throw new ErreurSudoers(fichier, numero, pos.i - o.length + 1, ligneBrute, nomOption.length, "unknown defaults entry \"" + nomOption + "\"");
			}
			options.push(o.replace(/\s*([+\-]?=)\s*/, "$1"));
			blanc();
		} while (s.charAt(pos.i) === "," && ++pos.i);
		blanc();
		if (pos.i < s.length) erreur();
		r.defauts.push({ portee: def[1] || "", liste: options, ligne: numero });
		return;
	}
	var al = /^\s*(User_Alias|Runas_Alias|Host_Alias|Cmnd_Alias|Cmd_Alias)(?=\s)/.exec(s);
	if (al){
		pos.i = al[0].length;
		var type = al[1].replace("_Alias", "").replace("Cmd", "Cmnd");
		do {
			var nomAlias = mot(/^[A-Z][A-Z0-9_]*/);
			if (nomAlias === null) erreur();
			attendre("=");
			r.alias[type][nomAlias] = type === "Cmnd" ? listeCommandes().map(function(x){ return x.commande; }) : liste();
			blanc();
		} while (s.charAt(pos.i) === ":" && ++pos.i);
		blanc();
		if (pos.i < s.length) erreur();
		return;
	}
	function commande(){
		blanc();
		var debutC = pos.i, texteC = "";
		var neg = /^!+/.exec(s.substring(pos.i));
		if (neg){ texteC += neg[0]; pos.i += neg[0].length; blanc(); }
		var premier = /^(ALL|sudoedit|list|[A-Z][A-Z0-9_]*|\/\S*)/.exec(s.substring(pos.i));
		if (!premier) erreur();
		if (/^\//.test(premier[1]) || premier[1] === "sudoedit"){
			// Un chemin, puis ses arguments jusqu'à la prochaine virgule non protégée.
			while (pos.i < s.length && s.charAt(pos.i) !== ","){
				if (s.charAt(pos.i) === "\\" && pos.i + 1 < s.length){ texteC += s.charAt(pos.i + 1); pos.i += 2; continue; }
				if (s.charAt(pos.i) === ":" && /^\s*[A-Za-z0-9_.%#+\-]+(\s*,\s*[A-Za-z0-9_.%#+\-]+)*\s*=/.test(s.substring(pos.i + 1)) && /\s$/.test(texteC)) break;
				texteC += s.charAt(pos.i);
				pos.i++;
			}
		} else {
			texteC += premier[1];
			pos.i += premier[1].length;
		}
		if (texteC.replace(/^!+/, "").trim() === "") { pos.i = debutC; erreur(); }
		return texteC.trim();
	}
	function listeCommandes(){
		var sortie = [], runas = null, tags = {};
		do {
			blanc();
			if (s.charAt(pos.i) === "("){
				pos.i++;
				blanc();
				var users = [], groupes = [];
				if (s.charAt(pos.i) !== ":" && s.charAt(pos.i) !== ")") users = liste();
				blanc();
				if (s.charAt(pos.i) === ":"){ pos.i++; blanc(); if (s.charAt(pos.i) !== ")") groupes = liste(); }
				blanc();
				if (s.charAt(pos.i) !== ")") erreur();
				pos.i++;
				runas = { users: users, groupes: groupes };
				tags = {};
			}
			// Les étiquettes : NOPASSWD: PASSWD: ... et les options ROLE= TYPE= CWD= ...
			var vu = true;
			while (vu){
				vu = false;
				blanc();
				var tag = /^([A-Z_]+):/.exec(s.substring(pos.i));
				if (tag && TAGS_SUDO.indexOf(tag[1]) > -1){ tags[tag[1]] = true; pos.i += tag[0].length; vu = true; continue; }
				var opt = /^(ROLE|TYPE|CWD|CHROOT|TIMEOUT|NOTBEFORE|NOTAFTER|APPARMOR_PROFILE)=\S+/.exec(s.substring(pos.i));
				if (opt){ pos.i += opt[0].length; vu = true; }
			}
			var cmd = commande();
			sortie.push({ runas: runas, tags: JSON.parse(JSON.stringify(tags)), commande: cmd });
			blanc();
		} while (s.charAt(pos.i) === "," && ++pos.i);
		return sortie;
	}
	// Une règle : utilisateurs hôtes = (runas) TAGS: commandes [: hôtes = ...]
	var users = liste();
	var groupesHotes = [];
	do {
		var hosts = liste();
		attendre("=");
		var cmnds = listeCommandes();
		groupesHotes.push({ hosts: hosts, cmnds: cmnds });
		blanc();
	} while (s.charAt(pos.i) === ":" && ++pos.i);
	blanc();
	if (pos.i < s.length) erreur();
	groupesHotes.forEach(function(g){ r.specs.push({ users: users, hosts: g.hosts, cmnds: g.cmnds, ligne: numero, fichier: fichier }); });
}

/* Les fichiers sudoers d'une machine, dans l'ordre où sudo les lit : /etc/sudoers puis ses @includedir. */
function fichiersSudoers(hote, depart){
	var liste = [], vus = {};
	function ajouter(chemin, profondeur){
		if (vus[chemin] || profondeur > 8) return;
		var item = chemin === "/etc/sudoers" ? fichierCompte(hote, "sudoers") : fichierHote(hote, chemin);
		if (!item) return;
		vus[chemin] = true;
		var lu = lireSudoers(item.getText(), chemin);
		liste.push({ chemin: chemin, item: item, lu: lu });
		lu.includes.forEach(function(inc){
			var cible = inc.chemin.charAt(0) === "/" ? inc.chemin : dossierDe(chemin) + "/" + inc.chemin;
			cible = cible.replace(/%h/g, hote);
			if (inc.dossier){
				// Comme sudo : on saute les noms qui finissent par ~ ou contiennent un point.
				fichiersDuDossier(hote, cible).forEach(function(f){ if (!/~$/.test(f.nom) && f.nom.indexOf(".") === -1) ajouter(f.chemin, profondeur + 1); });
			} else ajouter(cheminNormal(cible), profondeur + 1);
		});
	}
	ajouter(depart || "/etc/sudoers", 0);
	return liste;
}
/* Vérifie la syntaxe (et, pour les fichiers d'un dossier inclus, les droits 0440 root) : { ok, erreurs, fichiers }. */
function verifierSudoers(hote, chemin){
	var fichiers = chemin ? (function(){ var item = fichierHote(hote, chemin) || (chemin === "/etc/sudoers" ? fichierCompte(hote, "sudoers") : null); return item ? [{ chemin: chemin, item: item, lu: lireSudoers(item.getText(), chemin) }] : []; })() : fichiersSudoers(hote);
	var erreurs = [];
	fichiers.forEach(function(f){ f.lu.erreurs.forEach(function(e){ erreurs.push(e.texte()); }); });
	return { ok: erreurs.length === 0, erreurs: erreurs, fichiers: fichiers };
}

/* Un compte est-il désigné par une liste d'utilisateurs de sudoers (nom, %groupe, ALL, alias, !négation) ? */
function correspondUtilisateur(liste, qui, groupes, alias, profondeur){
	var resultat = null;
	(profondeur || 0) < 5 && liste.forEach(function(e){
		var neg = /^!/.test(e), nom = e.replace(/^!+/, ""), ok = false;
		if (nom === "ALL") ok = true;
		else if (/^%:?/.test(nom)) ok = groupes.indexOf(nom.replace(/^%:?/, "")) > -1;
		else if (/^#\d+$/.test(nom)) ok = String(UTILISATEURS[qui]) === nom.substring(1);
		else if (alias && alias[nom]) ok = correspondUtilisateur(alias[nom], qui, groupes, alias, (profondeur || 0) + 1) === true;
		else ok = nom === qui;
		if (ok) resultat = !neg;
	});
	return resultat;
}

/* Les règles sudo d'un compte sur une machine : { autorise, defauts, regles: [{ runas, tags, commandes, fichier }], avertissements }. */
function reglesSudo(hote, qui){
	var fichiers = fichiersSudoers(hote), avertissements = [];
	if (!fichiers.length){
		var aSudo = qui === JOUEUR ? state.has("sudoOK") || state.knows("sudo") : qui === "root";
		return { autorise: aSudo, defauts: ["env_reset", "mail_badpass", "secure_path=/usr/local/sbin\\:/usr/local/bin\\:/usr/sbin\\:/usr/bin\\:/sbin\\:/bin", "use_pty"],
			regles: aSudo ? [{ runas: "(ALL : ALL)", tags: "", commandes: ["ALL"], fichier: "/etc/sudoers" }] : [], avertissements: [], sansFichier: true };
	}
	var groupes = groupesDe(hote, qui);
	var alias = { User: {}, Host: {}, Runas: {}, Cmnd: {} };
	var gardes = fichiers.filter(function(f){
		if (f.chemin === "/etc/sudoers") return true;
		if (f.item.mode && f.item.mode.charAt(7) === "w"){ avertissements.push("sudo: " + f.chemin + " is world writable"); return false; }
		if (f.item.owner && f.item.owner !== "root"){ avertissements.push("sudo: " + f.chemin + " is owned by uid " + (UTILISATEURS[f.item.owner] === undefined ? 1000 : UTILISATEURS[f.item.owner]) + ", should be 0"); return false; }
		return true;
	});
	gardes.forEach(function(f){ ["User", "Host", "Runas", "Cmnd"].forEach(function(t){ for (var k in f.lu.alias[t]) alias[t][k] = f.lu.alias[t][k]; }); });
	var defauts = [];
	gardes.forEach(function(f){
		f.lu.defauts.forEach(function(d){
			if (d.portee === "" || (d.portee.charAt(0) === ":" && correspondUtilisateur(d.portee.substring(1).split(","), qui, groupes, alias.User) === true)) defauts = defauts.concat(d.liste);
		});
	});
	var regles = [];
	gardes.forEach(function(f){
		f.lu.specs.forEach(function(sp){
			if (correspondUtilisateur(sp.users, qui, groupes, alias.User) !== true) return;
			if (correspondUtilisateur(sp.hosts, hote, [], alias.Host) !== true) return;
			sp.cmnds.forEach(function(c){
				var runas = c.runas ? "(" + (c.runas.users.length ? c.runas.users.join(", ") : (c.runas.groupes.length ? qui : "root")) + (c.runas.groupes.length ? " : " + c.runas.groupes.join(", ") : "") + ")" : "(root)";
				var tags = Object.keys(c.tags).map(function(t){ return t + ": "; }).join("");
				var cmds = alias.Cmnd[c.commande.replace(/^!+/, "")] ? alias.Cmnd[c.commande.replace(/^!+/, "")].map(function(x){ return (/^!/.test(c.commande) ? "!" : "") + x; }) : [c.commande];
				var derniere = regles[regles.length - 1];
				if (derniere && derniere.runas === runas && derniere.tags === tags && derniere.fichier === f.chemin && derniere.ligne === sp.ligne) derniere.commandes = derniere.commandes.concat(cmds);
				else regles.push({ runas: runas, tags: tags, commandes: cmds, fichier: f.chemin, ligne: sp.ligne });
			});
		});
	});
	return { autorise: regles.length > 0, defauts: defauts, regles: regles, avertissements: avertissements };
}

/* sudo -l, -ll, -l COMMANDE, -l -U COMPTE, -k, -v. (sudo SORT, lui, est géré par le tuyau dans Shell.js.) */
Shell.sorts.sudo = function(args, io){
	var liste = 0, autre = null, cmd = [], h = Shell.hote();
	for (var i = 0; i < args.length; i++){
		var a = args[i];
		if (cmd.length){ cmd.push(a); continue; }
		if (a === "-l" || a === "--list"){ liste++; continue; }
		if (a === "-ll"){ liste += 2; continue; }
		if (a === "-U" || a === "--other-user"){ autre = args[++i]; if (autre === undefined) throw new ShellError("sudo: option requires an argument -- 'U'"); continue; }
		if (a === "-k" || a === "-K" || a === "-v" || a === "--validate" || a === "--reset-timestamp") continue;
		if (a.charAt(0) === "-") throw new ShellError("sudo: invalid option -- '" + a.replace(/^-+/, "").charAt(0) + "'\nusage: sudo -h | -K | -k | -V\nusage: sudo -v [-ABkNnS] [-g group] [-h host] [-p prompt] [-u user]\nusage: sudo -l [-ABkNnS] [-g group] [-h host] [-p prompt] [-U user] [-u user] [command [arg ...]]", 1);
		cmd.push(a);
	}
	if (!liste) return "";
	var qui = autre || JOUEUR;
	if (autre && UTILISATEURS[autre] === undefined && !compteDe(h, autre)) throw new ShellError("sudo: unknown user " + autre, 1);
	var r = reglesSudo(h, qui);
	r.avertissements.forEach(function(m){ io.err(m); });
	GameEvents.fire({ type: "sudoListe", hote: h, qui: qui, autorise: r.autorise, regles: r.regles.map(function(x){ return { runas: x.runas, tags: x.tags, commandes: x.commandes.slice(), fichier: x.fichier }; }) });
	if (cmd.length){
		var nom = cmd[0], chemin = nom.charAt(0) === "/" ? nom : "/usr/bin/" + nom;
		var permis = r.regles.some(function(x){
			return x.commandes.some(function(c){ return c === "ALL" || c === chemin || c.split(/\s+/)[0] === chemin || c.split(/\s+/)[0].split("/").pop() === nom.split("/").pop() && (c.split(/\s+/).length === 1 || c === chemin + " " + cmd.slice(1).join(" ")); });
		});
		if (!permis){ io.code = 1; return ""; }
		return chemin + (cmd.length > 1 ? " " + cmd.slice(1).join(" ") : "");
	}
	if (!r.autorise){
		io.code = 1;
		return "User " + qui + " is not allowed to run sudo on " + h + "." + astuce(io, "Aucune règle de /etc/sudoers (ni de /etc/sudoers.d) ne donne de droits à " + qui + " ici.");
	}
	// Comme sudo : les valeurs sans guillemets, les deux-points de secure_path protégés par une barre oblique inverse.
	var defauts = r.defauts.map(function(d){
		var m = /^([^=]+?)(\+?=|-=)"?(.*?)"?$/.exec(d);
		if (!m) return d;
		return m[1] + m[2] + (m[1] === "secure_path" ? m[3].replace(/\\?:/g, "\\:") : m[3]);
	});
	var lignes = ["Matching Defaults entries for " + qui + " on " + h + ":", "    " + defauts.join(", "), "", "User " + qui + " may run the following commands on " + h + ":"];
	if (liste >= 2){
		r.regles.forEach(function(x){
			var m = /^\((.*?)(?: : (.*))?\)$/.exec(x.runas);
			lignes.push("", "Sudoers entry: " + x.fichier, "    RunAsUsers: " + m[1]);
			if (m[2]) lignes.push("    RunAsGroups: " + m[2]);
			if (x.tags) lignes.push("    Options: " + x.tags.replace(/: $/, "").split(": ").map(function(t){ return t === "NOPASSWD" ? "!authenticate" : (t === "PASSWD" ? "authenticate" : t.toLowerCase()); }).join(", "));
			lignes.push("    Commands:");
			x.commandes.forEach(function(c){ lignes.push("\t" + c); });
		});
	} else {
		r.regles.forEach(function(x){ lignes.push("    " + x.runas + " " + x.tags + x.commandes.join(", ")); });
	}
	if (io.tty){
		var risques = r.regles.filter(function(x){ return /NOPASSWD/.test(x.tags) && x.commandes.indexOf("ALL") > -1; });
		lignes.push(C.gris(risques.length ? "(NOPASSWD: ALL : root sans même retaper son mot de passe. Une session volée suffit pour tout prendre. Ces règles viennent de " + risques.map(function(x){ return x.fichier; }).join(", ") + ".)" :
			"(Chaque ligne : (en tant que qui) les commandes permises. ALL veut dire tout.)"));
	}
	return lignes.join("\n");
};

/* Les options de sudo devant une commande (sudo -u root CMD, sudo -E CMD...) : Shell.js appelle cette fonction. */
Shell.optionsSudo = function(args, io){
	var i = 0;
	while (i < args.length && /^-/.test(args[i])){
		var a = args[i];
		if (a === "--"){ i++; break; }
		if (/^-(l|ll|k|K|v|U)$/.test(a) || /^--(list|validate|other-user|reset-timestamp)$/.test(a)) return { nom: "sudo", args: args.slice() };
		if (a === "-u" || a === "--user"){
			var qui = args[i + 1];
			if (qui === undefined) throw new ShellError("sudo: option requires an argument -- 'u'");
			if (qui !== "root" && qui !== "#0" && args[i + 2] !== undefined){
				throw new ShellError("sudo : ici, sudo ne lance les commandes qu'en root." + astuce(io, "Dans ce monde, le terminal ne change pas d'identité : sudo -u " + qui + " n'est pas pris en charge. sudo -l -U " + qui + " montre ses droits."));
			}
			i += 2;
			continue;
		}
		if (a === "-i" || a === "-s" || a === "--login" || a === "--shell"){
			if (i + 1 >= args.length) throw new ShellError("sudo : un shell root interactif n'existe pas dans ce monde." + astuce(io, "Mets sudo devant chaque sort qui demande les pleins pouvoirs : c'est aussi la bonne pratique (chaque commande est journalisée)."));
			i++;
			continue;
		}
		if (/^-[EHnSbP]+$/.test(a) || a === "--preserve-env" || /^--preserve-env=/.test(a)){ i++; continue; }
		throw new ShellError("sudo: invalid option -- '" + a.replace(/^-+/, "").charAt(0) + "'\nusage: sudo -h | -K | -k | -V\nusage: sudo -l [-ABkNnS] [-U user] [-u user] [command [arg ...]]");
	}
	if (i >= args.length) throw new ShellError("usage: sudo -h | -K | -k | -V\nusage: sudo -v [-ABkNnS] [-g group] [-h host] [-p prompt] [-u user]\nusage: sudo -l [-ABkNnS] [-g group] [-h host] [-p prompt] [-U user] [-u user] [command [arg ...]]");
	return { nom: args[i], args: args.slice(i + 1) };
};

/* ================================================================== */
/* visudo, visudo -c, visudo -f                                        */
/* ================================================================== */

Shell.sorts.visudo = function(args, io){
	var verifier = false, fichier = null, quiet = false, h = Shell.hote();
	for (var i = 0; i < args.length; i++){
		var a = args[i];
		if (a === "-c" || a === "--check"){ verifier = true; continue; }
		if (a === "-q" || a === "--quiet"){ quiet = true; continue; }
		if (a === "-s" || a === "--strict" || a === "-x"){ continue; }
		if (a === "-f" || a === "--file"){ fichier = args[++i]; if (fichier === undefined) throw new ShellError("visudo: option requires an argument -- 'f'"); continue; }
		if (/^-[cqs]+$/.test(a)){ if (a.indexOf("c") > -1) verifier = true; if (a.indexOf("q") > -1) quiet = true; continue; }
		if (a.charAt(0) !== "-" && fichier === null){ fichier = a; continue; }
		throw new ShellError("visudo: invalid option -- '" + a.replace(/^-+/, "").charAt(0) + "'\nusage: visudo [-chqsV] [[-f] sudoers ]", 1);
	}
	var chemin = fichier === null ? "/etc/sudoers" : (fichier.charAt(0) === "/" ? cheminNormal(fichier) : null);
	var item = null, lieu = null, nom = null;
	if (chemin === "/etc/sudoers") item = fichierCompte(h, "sudoers");
	else if (chemin !== null){ item = fichierHote(h, chemin); lieu = dossierHote(h, dossierDe(chemin)); nom = nomDe(chemin); }
	else {
		var r = Shell.chercher(fichier, io, "visudo");
		if (r.node instanceof Room) throw new ShellError("visudo: " + fichier + ": Is a directory");
		item = r.node; lieu = r.dir; nom = r.name;
		chemin = Shell.cheminAffiche(r.dir).replace(/\/$/, "") + "/" + r.name;
	}
	if (!io.sudo){
		throw new ShellError("visudo: " + (chemin || fichier) + ": Permission denied" + astuce(io, "sudoers n'est lisible que par root : sudo visudo" + (verifier ? " -c" : "")), 1);
	}
	if (verifier){
		var fichiers;
		if (fichier !== null){
			if (!item) throw new ShellError("visudo: unable to open " + chemin + ": No such file or directory", 1);
			fichiers = [{ chemin: chemin, item: item, lu: lireSudoers(item.getText(), chemin) }];
		} else {
			fichiers = fichiersSudoers(h);
			if (!fichiers.length) throw new ShellError("visudo: unable to open /etc/sudoers: No such file or directory", 1);
		}
		var sortie = [], erreurs = [];
		fichiers.forEach(function(f){ f.lu.erreurs.forEach(function(e){ erreurs.push(e.texte()); }); });
		if (erreurs.length){
			io.code = 1;
			GameEvents.fire({ type: "visudo", action: "c", fichier: chemin, ok: false, erreurs: erreurs.slice() });
			if (!quiet) erreurs.forEach(function(e){ io.err(e); });
			return io.tty ? C.gris("(Une faute de syntaxe : sudo refuserait de lire ce fichier, et plus personne ne pourrait l'utiliser. Corrige-la avec sudo visudo" + (fichier ? " -f " + chemin : "") + ".)") : "";
		}
		var droitsOk = true;
		fichiers.forEach(function(f){
			var mode = modeOctal(f.item.mode), proprio = f.item.owner || "root";
			// Sur la sortie d'erreur, à la place du « parsed OK » de ce fichier : après les autres, à l'écran.
			var signaler = io.errFin || io.err;
			if (proprio !== "root"){ droitsOk = false; signaler("visudo: " + f.chemin + ": bad owner (uid, gid) should be (0, 0)"); return; }
			if (mode !== "0440"){ droitsOk = false; signaler("visudo: " + f.chemin + ": bad permissions, should be mode 0440"); return; }
			if (!quiet) sortie.push(f.chemin + ": parsed OK");
		});
		if (!droitsOk) io.code = 1;
		GameEvents.fire({ type: "visudo", action: "c", fichier: chemin, ok: droitsOk, erreurs: [] });
		if (io.tty && !droitsOk) sortie.push(C.gris("(La syntaxe est bonne, mais un fichier de sudoers doit appartenir à root et être en 0440 (r--r-----) : sudo chmod 0440 FICHIER.)"));
		return sortie.join("\n");
	}
	if (!io.tty) throw new ShellError("visudo : il faut un écran, pas de tuyau.");
	if (!term.editer) throw new ShellError("visudo : l'éditeur n'est pas disponible ici.");
	if (!item && fichier === null) throw new ShellError("visudo : pas de fichier sudoers sur cette machine");
	if (item && item.lien) throw new ShellError("visudo: " + chemin + " is not a regular file");
	var sudoers = item, titre = (chemin || "/etc/sudoers") + ".tmp";
	term.editer({ titre: titre, texte: sudoers ? sudoers.getText() : "", mode: state.knows("vim") ? "vim" : "nano" }, function(nouveau){
		if (nouveau === null) return;
		var lu = lireSudoers(nouveau, chemin || "/etc/sudoers");
		if (lu.erreurs.length){
			GameEvents.fire({ type: "visudo", action: "edit", fichier: chemin, ok: false, erreurs: lu.erreurs.map(function(e){ return e.texte(); }) });
			term.echo(C.rouge(lu.erreurs[0].texte()) + "\n" +
				"visudo : rien n'a été enregistré. " + C.gris("(Une erreur dans sudoers peut priver tout le monde de sudo : visudo vérifie avant d'écrire. Le vrai visudo demande alors « What now? » : e pour reprendre, x pour abandonner.)"));
			return;
		}
		var ancien = sudoers ? sudoers.getText() : "", cree = false;
		if (!sudoers){
			if (!lieu){
				lieu = creerDossiersHote(h, dossierDe(chemin));
				if (!lieu){ term.echo("visudo: unable to open " + chemin + ": No such file or directory"); return; }
			}
			sudoers = new Item(nom, nouveau, "item_sign.gif");
			sudoers.owner = "root";
			sudoers.mode = "r--r-----";
			lieu.addItem(sudoers);
			sudoers.mode = "r--r-----";
			cree = true;
		} else sudoers.setText(nouveau);
		GameEvents.fire({ type: "write", item: sudoers, room: lieu, append: false, text: nouveau, created: cree, previous: ancien, visudo: true });
		GameEvents.fire({ type: "visudo", action: "edit", fichier: chemin, ok: true, erreurs: [] });
		Shell.fin();
	});
	return "";
};

/* ================================================================== */
/* cron.allow, cron.deny, at.allow, at.deny                            */
/* ================================================================== */

function listeUtilisateursFichier(hote, chemin){
	var t = texteHote(hote, chemin);
	if (t === null) return null;
	return lignesDe(t).map(function(l){ return l.replace(/#.*$/, "").trim(); }).filter(Boolean);
}
/*
 * Peut-on utiliser crontab (ou at) ? root, toujours. Sinon : si X.allow existe, il faut y être ; sinon, si X.deny
 * existe, il ne faut pas y être. Sans aucun des deux fichiers, la machine laisse faire (ce monde : comme cron sous Debian).
 */
function planifAutorisee(hote, programme, qui){
	if (qui === "root") return true;
	var allow = listeUtilisateursFichier(hote, "/etc/" + programme + ".allow");
	if (allow !== null) return allow.indexOf(qui) > -1;
	var deny = listeUtilisateursFichier(hote, "/etc/" + programme + ".deny");
	if (deny !== null) return deny.indexOf(qui) === -1;
	return true;
}
var CRONTAB_AVANT_BASTION = Shell.sorts.crontab;
Shell.sorts.crontab = function(args, io){
	var h = Shell.hote(), qui = io.sudo ? "root" : JOUEUR;
	if (!planifAutorisee(h, "cron", qui)){
		GameEvents.fire({ type: "planifRefusee", programme: "crontab", qui: qui, hote: h });
		throw new ShellError("You (" + qui + ") are not allowed to use this program (crontab)\nSee crontab(1) for more information" +
			astuce(io, listeUtilisateursFichier(h, "/etc/cron.allow") !== null ? "/etc/cron.allow existe et " + qui + " n'y est pas : seuls les comptes qu'il nomme ont droit à cron." : "/etc/cron.deny nomme " + qui + " : cron lui est interdit."), 1);
	}
	return CRONTAB_AVANT_BASTION.apply(this, arguments);
};
["at", "atq", "atrm"].forEach(function(prog){
	var avant = Shell.sorts[prog];
	Shell.sorts[prog] = function(args, io){
		var h = Shell.hote(), qui = io.sudo ? "root" : JOUEUR;
		if (!planifAutorisee(h, "at", qui)){
			GameEvents.fire({ type: "planifRefusee", programme: prog, qui: qui, hote: h });
			throw new ShellError("You do not have permission to use " + prog + "." +
				astuce(io, listeUtilisateursFichier(h, "/etc/at.allow") !== null ? "/etc/at.allow existe et " + qui + " n'y est pas." : "/etc/at.deny nomme " + qui + "."), 1);
		}
		return avant.apply(this, arguments);
	};
});

/* ================================================================== */
/* sshd : lire /etc/ssh/sshd_config comme OpenSSH 9.2 (Debian 12)     */
/* ================================================================== */

var CIPHERS_SSH = ["3des-cbc", "aes128-cbc", "aes192-cbc", "aes256-cbc", "aes128-ctr", "aes192-ctr", "aes256-ctr", "aes128-gcm@openssh.com", "aes256-gcm@openssh.com", "chacha20-poly1305@openssh.com"];
var MACS_SSH = ["hmac-sha1", "hmac-sha1-96", "hmac-sha2-256", "hmac-sha2-512", "hmac-md5", "hmac-md5-96", "umac-64@openssh.com", "umac-128@openssh.com",
	"hmac-sha1-etm@openssh.com", "hmac-sha1-96-etm@openssh.com", "hmac-sha2-256-etm@openssh.com", "hmac-sha2-512-etm@openssh.com", "hmac-md5-etm@openssh.com", "hmac-md5-96-etm@openssh.com",
	"umac-64-etm@openssh.com", "umac-128-etm@openssh.com"];
var KEX_SSH = ["diffie-hellman-group1-sha1", "diffie-hellman-group14-sha1", "diffie-hellman-group14-sha256", "diffie-hellman-group16-sha512", "diffie-hellman-group18-sha512",
	"diffie-hellman-group-exchange-sha1", "diffie-hellman-group-exchange-sha256", "ecdh-sha2-nistp256", "ecdh-sha2-nistp384", "ecdh-sha2-nistp521",
	"curve25519-sha256", "curve25519-sha256@libssh.org", "sntrup761x25519-sha512@openssh.com"];
var CLES_SSH = ["ssh-ed25519", "ssh-ed25519-cert-v01@openssh.com", "sk-ssh-ed25519@openssh.com", "sk-ssh-ed25519-cert-v01@openssh.com", "ecdsa-sha2-nistp256", "ecdsa-sha2-nistp384", "ecdsa-sha2-nistp521",
	"ecdsa-sha2-nistp256-cert-v01@openssh.com", "ecdsa-sha2-nistp384-cert-v01@openssh.com", "ecdsa-sha2-nistp521-cert-v01@openssh.com", "sk-ecdsa-sha2-nistp256@openssh.com",
	"sk-ecdsa-sha2-nistp256-cert-v01@openssh.com", "rsa-sha2-512", "rsa-sha2-256", "rsa-sha2-512-cert-v01@openssh.com", "rsa-sha2-256-cert-v01@openssh.com", "ssh-rsa", "ssh-rsa-cert-v01@openssh.com", "ssh-dss"];
var DEFAUT_CIPHERS = "chacha20-poly1305@openssh.com,aes128-ctr,aes192-ctr,aes256-ctr,aes128-gcm@openssh.com,aes256-gcm@openssh.com";
var DEFAUT_MACS = "umac-64-etm@openssh.com,umac-128-etm@openssh.com,hmac-sha2-256-etm@openssh.com,hmac-sha2-512-etm@openssh.com,hmac-sha1-etm@openssh.com,umac-64@openssh.com,umac-128@openssh.com,hmac-sha2-256,hmac-sha2-512,hmac-sha1";
var DEFAUT_KEX = "sntrup761x25519-sha512@openssh.com,curve25519-sha256,curve25519-sha256@libssh.org,ecdh-sha2-nistp256,ecdh-sha2-nistp384,ecdh-sha2-nistp521,diffie-hellman-group-exchange-sha256,diffie-hellman-group16-sha512,diffie-hellman-group18-sha512,diffie-hellman-group14-sha256";
var DEFAUT_CLES = "ssh-ed25519-cert-v01@openssh.com,ecdsa-sha2-nistp256-cert-v01@openssh.com,ecdsa-sha2-nistp384-cert-v01@openssh.com,ecdsa-sha2-nistp521-cert-v01@openssh.com,sk-ssh-ed25519-cert-v01@openssh.com,sk-ecdsa-sha2-nistp256-cert-v01@openssh.com,rsa-sha2-512-cert-v01@openssh.com,rsa-sha2-256-cert-v01@openssh.com,ssh-ed25519,ecdsa-sha2-nistp256,ecdsa-sha2-nistp384,ecdsa-sha2-nistp521,sk-ssh-ed25519@openssh.com,sk-ecdsa-sha2-nistp256@openssh.com,rsa-sha2-512,rsa-sha2-256";

/*
 * Les mots-clés de sshd_config : leur type, et leur nom dans sshd -T. Types : drapeau (yes/no), etats (une liste de
 * valeurs permises), entier, duree, port, texte (un mot), mots (tout le reste de la ligne), liste (s'accumule),
 * algos (Ciphers, MACs...), include, match, obsolete, ignore.
 */
var MOTS_SSHD = (function(){
	var t = {};
	function d(noms, type, extra){ noms.split(" ").forEach(function(n){ t[n.toLowerCase()] = { nom: n.toLowerCase(), type: type, extra: extra }; }); }
	d("PasswordAuthentication PubkeyAuthentication PermitEmptyPasswords X11Forwarding UsePAM StrictModes PrintMotd PrintLastLog TCPKeepAlive IgnoreRhosts IgnoreUserKnownHosts " +
		"HostbasedAuthentication HostbasedUsesNameFromPacketOnly KbdInteractiveAuthentication ChallengeResponseAuthentication GSSAPIAuthentication GSSAPICleanupCredentials GSSAPIStrictAcceptorCheck " +
		"KerberosAuthentication KerberosOrLocalPasswd KerberosTicketCleanup KerberosGetAFSToken PermitTTY X11UseLocalhost UseDNS AllowAgentForwarding DisableForwarding ExposeAuthInfo " +
		"StreamLocalBindUnlink PermitUserRC GSSAPIKeyExchange GSSAPIStoreCredentialsOnRekey DebianBanner", "drapeau");
	d("PermitRootLogin", "etats", ["yes", "no", "prohibit-password", "without-password", "forced-commands-only"]);
	d("AllowTcpForwarding", "etats", ["yes", "no", "all", "local", "remote"]);
	d("AllowStreamLocalForwarding", "etats", ["yes", "no", "all", "local", "remote"]);
	d("Compression", "etats", ["yes", "delayed", "no"]);
	d("GatewayPorts", "etats", ["yes", "no", "clientspecified"]);
	d("AddressFamily", "etats", ["any", "inet", "inet6"]);
	d("PermitTunnel", "etats", ["yes", "no", "point-to-point", "ethernet"]);
	d("FingerprintHash", "etats", ["md5", "sha256"]);
	d("LogLevel", "loglevel");
	d("SyslogFacility", "facility");
	d("MaxAuthTries MaxSessions ClientAliveCountMax X11DisplayOffset RequiredRSASize", "entier");
	d("LoginGraceTime ClientAliveInterval", "duree");
	d("Port", "port");
	d("ListenAddress HostKey HostCertificate", "liste");
	d("AllowUsers DenyUsers AllowGroups DenyGroups AcceptEnv SetEnv AuthenticationMethods", "listeLigne");
	d("Banner PidFile ChrootDirectory ForceCommand VersionAddendum AuthorizedKeysCommand AuthorizedKeysCommandUser AuthorizedPrincipalsFile AuthorizedPrincipalsCommand " +
		"AuthorizedPrincipalsCommandUser TrustedUserCAKeys RevokedKeys HostKeyAgent ModuliFile XAuthLocation SecurityKeyProvider RDomain StreamLocalBindMask PermitUserEnvironment " +
		"MaxStartups PerSourceMaxStartups PerSourceNetBlockSize RekeyLimit IPQoS PermitOpen PermitListen PubkeyAuthOptions ChannelTimeout UnusedConnectionTimeout LogVerbose", "mots");
	d("AuthorizedKeysFile", "mots");
	d("Subsystem", "subsystem");
	d("Ciphers", "algos", { liste: CIPHERS_SSH, defaut: DEFAUT_CIPHERS, erreur: "Bad SSH2 cipher spec" });
	d("MACs", "algos", { liste: MACS_SSH, defaut: DEFAUT_MACS, erreur: "Bad SSH2 mac spec" });
	d("KexAlgorithms", "algos", { liste: KEX_SSH, defaut: DEFAUT_KEX, erreur: "Bad SSH2 KexAlgorithms" });
	d("HostKeyAlgorithms PubkeyAcceptedAlgorithms PubkeyAcceptedKeyTypes HostbasedAcceptedAlgorithms HostbasedAcceptedKeyTypes CASignatureAlgorithms", "algos", { liste: CLES_SSH, defaut: DEFAUT_CLES, erreur: "Bad key types" });
	d("Include", "include");
	d("Match", "match");
	d("Protocol UsePrivilegeSeparation RSAAuthentication RhostsRSAAuthentication UseLogin KeyRegenerationInterval ServerKeyBits RhostsAuthentication PrintMotd2 ShowPatchLevel", "obsolete");
	return t;
})();
/* Les noms affichés par sshd -T pour les mots-clés dont l'alias diffère. */
var ALIAS_SSHD = { pubkeyacceptedkeytypes: "pubkeyacceptedalgorithms", hostbasedacceptedkeytypes: "hostbasedacceptedalgorithms", challengeresponseauthentication: "kbdinteractiveauthentication" };

/* Une liste d'algorithmes avec ses préfixes (+ ajouter, - retirer, ^ en tête) : la liste obtenue, ou null si un nom est inconnu. */
function listeAlgos(valeur, connus, defaut){
	var mode = /^[+\-^]/.test(valeur) ? valeur.charAt(0) : "", noms = (mode ? valeur.substring(1) : valeur).split(",");
	for (var i = 0; i < noms.length; i++){
		if (noms[i] === "") return null;
		if (mode === "-" && /[*?]/.test(noms[i])) continue;
		if (connus.indexOf(noms[i]) === -1) return null;
	}
	var base = defaut.split(",");
	if (mode === "+") return base.concat(noms.filter(function(n){ return base.indexOf(n) === -1; })).join(",");
	if (mode === "-") return base.filter(function(n){ return !noms.some(function(m){ return motifVersRegExp(m).test(n); }); }).join(",");
	if (mode === "^") return noms.concat(base.filter(function(n){ return noms.indexOf(n) === -1; })).join(",");
	return noms.join(",");
}

/*
 * Lit la configuration de sshd dans une vue du disque (vueLive ou vueInstantane). Comme sshd : la PREMIÈRE valeur
 * l'emporte (sauf les listes, qui s'additionnent), Include est lu à sa place, Match ouvre un bloc conditionnel.
 * Renvoie { options: { motcle: valeur }, erreurs: [], avertissements: [], fatale, mauvaises, fichiers }.
 */
function lireConfigSshd(vue, principal){
	var r = { options: {}, listes: {}, erreurs: [], avertissements: [], fatale: false, mauvaises: 0, fichiers: [] };
	principal = principal || "/etc/ssh/sshd_config";
	function fatal(m){ if (!r.fatale){ r.erreurs.push(m); r.fatale = true; } }
	function lireFichier(chemin, profondeur, dansMatch){
		if (profondeur > 8 || r.fatale) return dansMatch;
		var x = vue.lire(chemin);
		if (!x || x.l !== undefined){
			if (profondeur === 0) fatal(chemin + ": No such file or directory");
			return dansMatch;
		}
		r.fichiers.push(chemin);
		var lignes = String(x.t).split("\n");
		for (var n = 0; n < lignes.length && !r.fatale; n++){
			var brute = lignes[n].replace(/\r$/, "");
			var propre = brute.replace(/^\s+/, "");
			if (propre === "" || propre.charAt(0) === "#") continue;
			var morceaux = [], m, re = /"([^"]*)"|(\S+)/g;
			while ((m = re.exec(propre)) !== null){
				if (m[2] && m[2].charAt(0) === "#") break;
				morceaux.push(m[1] !== undefined ? m[1] : m[2]);
			}
			if (!morceaux.length) continue;
			var motcle = morceaux[0], args = morceaux.slice(1), eq = /^([^=]+)=(.*)$/.exec(motcle);
			if (eq){ motcle = eq[1]; if (eq[2] !== "") args.unshift(eq[2]); }
			var def = MOTS_SSHD[motcle.toLowerCase()], ou = chemin + " line " + (n + 1) + ": ";
			if (!def){ r.erreurs.push(chemin + ": line " + (n + 1) + ": Bad configuration option: " + motcle); r.mauvaises++; continue; }
			if (def.type === "obsolete"){ r.avertissements.push(ou + "Deprecated option " + motcle); continue; }
			if (def.type === "include"){
				if (!args.length){ fatal(ou + "Include missing filename argument"); continue; }
				args.forEach(function(motif){
					var complet = motif.charAt(0) === "/" ? motif : "/etc/ssh/" + motif;
					var re2 = motifVersRegExp(nomDe(complet));
					vue.lister(dossierDe(complet)).filter(function(f){ return re2.test(f); }).forEach(function(f){
						dansMatch = lireFichier(cheminNormal(dossierDe(complet) + "/" + f), profondeur + 1, dansMatch);
					});
				});
				continue;
			}
			if (def.type === "match"){
				if (!args.length){ fatal(ou + "Match missing argument"); continue; }
				dansMatch = !(args.length === 1 && args[0].toLowerCase() === "all");
				r.match = true;
				continue;
			}
			var valeur = args[0];
			if (valeur === undefined && def.type !== "listeLigne"){ fatal(ou + (def.type === "drapeau" || def.type === "etats" ? "missing argument." : motcle + " missing argument.")); continue; }
			var nom = ALIAS_SSHD[def.nom] || def.nom, normal = valeur;
			if (def.type === "drapeau" || def.type === "etats"){
				var permis = def.type === "drapeau" ? ["yes", "no"] : def.extra;
				if (permis.indexOf(String(valeur).toLowerCase()) === -1){ fatal(ou + "unsupported option \"" + valeur + "\"."); continue; }
				normal = valeur.toLowerCase();
				if (nom === "permitrootlogin" && normal === "prohibit-password") normal = "without-password";
			} else if (def.type === "entier"){
				if (!/^\d+$/.test(valeur)){ fatal(ou + motcle + " integer value invalid."); continue; }
				normal = String(parseInt(valeur, 10));
			} else if (def.type === "duree"){
				var tm = /^(\d+)([smhdwSMHDW]?)$/.exec(valeur);
				if (!tm){ fatal(ou + "invalid time value."); continue; }
				normal = String(parseInt(tm[1], 10) * ({ "": 1, s: 1, m: 60, h: 3600, d: 86400, w: 604800 }[tm[2].toLowerCase()]));
			} else if (def.type === "port"){
				if (!/^\d+$/.test(valeur) || +valeur < 1 || +valeur > 65535){ fatal(ou + "Badly formatted port number."); continue; }
			} else if (def.type === "loglevel"){
				if (["QUIET", "FATAL", "ERROR", "INFO", "VERBOSE", "DEBUG", "DEBUG1", "DEBUG2", "DEBUG3"].indexOf(valeur.toUpperCase()) === -1){ fatal(ou + "unsupported log level '" + valeur + "'"); continue; }
				normal = valeur.toUpperCase() === "DEBUG" ? "DEBUG1" : valeur.toUpperCase();
			} else if (def.type === "facility"){
				if (["DAEMON", "USER", "AUTH", "AUTHPRIV", "LOCAL0", "LOCAL1", "LOCAL2", "LOCAL3", "LOCAL4", "LOCAL5", "LOCAL6", "LOCAL7"].indexOf(valeur.toUpperCase()) === -1){ fatal(ou + "unsupported log facility '" + valeur + "'"); continue; }
				normal = valeur.toUpperCase();
			} else if (def.type === "algos"){
				var obtenu = listeAlgos(valeur, def.extra.liste, def.extra.defaut);
				if (obtenu === null){ fatal(ou + def.extra.erreur + " '" + valeur + "'."); continue; }
				normal = obtenu;
			} else if (def.type === "mots" || def.type === "subsystem"){
				normal = args.join(" ");
			}
			if (dansMatch) continue;
			if (def.type === "liste" || def.type === "listeLigne"){
				r.listes[nom] = (r.listes[nom] || []).concat(def.type === "liste" ? [valeur] : args);
				continue;
			}
			if (def.type === "subsystem"){
				r.listes.subsystem = r.listes.subsystem || [];
				if (!r.listes.subsystem.some(function(s){ return s.split(" ")[0] === args[0]; })) r.listes.subsystem.push(normal);
				continue;
			}
			if (!r.options.hasOwnProperty(nom)) r.options[nom] = normal;
		}
		return dansMatch;
	}
	lireFichier(principal, 0, false);
	if (!r.fatale && r.mauvaises) r.erreurs.push(principal + ": terminating, " + r.mauvaises + " bad configuration options");
	r.ok = !r.fatale && r.mauvaises === 0;
	return r;
}

/* La configuration effective, comme sshd -T : chaque option, sa valeur ou celle d'OpenSSH 9.2 par défaut. */
var DEFAUTS_SSHD = [
	["port", "22"], ["addressfamily", "any"], ["listenaddress", null], ["usepam", "no"], ["logingracetime", "120"], ["x11displayoffset", "10"], ["maxauthtries", "6"],
	["maxsessions", "10"], ["clientaliveinterval", "0"], ["clientalivecountmax", "3"], ["requiredrsasize", "1024"], ["streamlocalbindmask", "0177"],
	["permitrootlogin", "without-password"], ["ignorerhosts", "yes"], ["ignoreuserknownhosts", "no"], ["hostbasedauthentication", "no"], ["hostbasedusesnamefrompacketonly", "no"],
	["pubkeyauthentication", "yes"], ["kerberosauthentication", "no"], ["kerberosorlocalpasswd", "yes"], ["kerberosticketcleanup", "yes"], ["gssapiauthentication", "no"],
	["gssapicleanupcredentials", "yes"], ["gssapikeyexchange", "no"], ["gssapistrictacceptorcheck", "yes"], ["gssapistorecredentialsonrekey", "no"],
	["passwordauthentication", "yes"], ["kbdinteractiveauthentication", "yes"], ["printmotd", "yes"], ["printlastlog", "yes"], ["x11forwarding", "no"], ["x11uselocalhost", "yes"],
	["permittty", "yes"], ["permituserrc", "yes"], ["strictmodes", "yes"], ["tcpkeepalive", "yes"], ["permitemptypasswords", "no"], ["compression", "yes"], ["gatewayports", "no"],
	["usedns", "no"], ["allowtcpforwarding", "yes"], ["allowagentforwarding", "yes"], ["disableforwarding", "no"], ["allowstreamlocalforwarding", "yes"],
	["streamlocalbindunlink", "no"], ["fingerprinthash", "SHA256"], ["exposeauthinfo", "no"], ["pidfile", "/run/sshd.pid"], ["modulifile", "/etc/ssh/moduli"],
	["xauthlocation", "/usr/bin/xauth"], ["ciphers", DEFAUT_CIPHERS], ["macs", DEFAUT_MACS], ["banner", "none"], ["forcecommand", "none"], ["chrootdirectory", "none"],
	["trustedusercakeys", "none"], ["revokedkeys", "none"], ["securitykeyprovider", "internal"], ["authorizedprincipalsfile", "none"], ["versionaddendum", "none"],
	["authorizedkeyscommand", "none"], ["authorizedkeyscommanduser", "none"], ["authorizedprincipalscommand", "none"], ["authorizedprincipalscommanduser", "none"],
	["hostkeyagent", "none"], ["kexalgorithms", DEFAUT_KEX], ["casignaturealgorithms", "ssh-ed25519,ecdsa-sha2-nistp256,ecdsa-sha2-nistp384,ecdsa-sha2-nistp521,sk-ssh-ed25519@openssh.com,sk-ecdsa-sha2-nistp256@openssh.com,rsa-sha2-512,rsa-sha2-256"],
	["hostbasedacceptedalgorithms", DEFAUT_CLES], ["hostkeyalgorithms", DEFAUT_CLES], ["pubkeyacceptedalgorithms", DEFAUT_CLES], ["loglevel", "INFO"], ["syslogfacility", "AUTH"],
	["authorizedkeysfile", ".ssh/authorized_keys .ssh/authorized_keys2"], ["hostkey", null], ["allowusers", null], ["denyusers", null], ["allowgroups", null], ["denygroups", null],
	["acceptenv", null], ["setenv", null], ["authenticationmethods", "any"], ["subsystem", null], ["maxstartups", "10:30:100"], ["persourcemaxstartups", "none"],
	["persourcenetblocksize", "32:128"], ["permittunnel", "no"], ["ipqos", "lowdelay throughput"], ["rekeylimit", "0 0"], ["permitopen", "any"], ["permitlisten", "any"],
	["permituserenvironment", "no"], ["pubkeyauthoptions", "none"]];

function configEffectiveDepuis(lu){
	var o = {};
	DEFAUTS_SSHD.forEach(function(d){
		var cle = d[0];
		if (lu.listes[cle]) o[cle] = lu.listes[cle].slice();
		else if (lu.options.hasOwnProperty(cle)) o[cle] = lu.options[cle];
		else if (d[1] !== null) o[cle] = d[1];
	});
	var port = o.port || "22";
	if (!o.listenaddress){
		o.listenaddress = o.addressfamily === "inet" ? ["0.0.0.0:" + port] : (o.addressfamily === "inet6" ? ["[::]:" + port] : ["0.0.0.0:" + port, "[::]:" + port]);
	} else {
		o.listenaddress = o.listenaddress.map(function(a){ return /:\d+$/.test(a) && !/^\[?[0-9a-f:]+\]?$/i.test(a) ? a : (a.indexOf(":") > -1 && a.charAt(0) !== "[" ? "[" + a + "]" : a) + ":" + port; });
	}
	if (!o.hostkey) o.hostkey = ["/etc/ssh/ssh_host_rsa_key", "/etc/ssh/ssh_host_ecdsa_key", "/etc/ssh/ssh_host_ed25519_key"];
	return o;
}
/* La configuration sur le disque (celle que sshd -T affiche). */
function configSshFichiers(hote){ return configEffectiveDepuis(lireConfigSshd(vueLive(hote))); }
/* Celle que le démon sshd applique : au dernier démarrage, reload ou restart réussi. */
function configSshEffective(hote){
	var applique = etatBastion().sshApplique[hote];
	var lu = lireConfigSshd(vueChargee("ssh", hote, applique || null));
	return configEffectiveDepuis(lu.ok ? lu : lireConfigSshd(vueLive(hote)));
}
/* Le verdict de sshd -t sur le disque : { ok, erreurs, avertissements, fatale }. */
function verifierSshd(hote){
	var lu = lireConfigSshd(vueLive(hote));
	return { ok: lu.ok, erreurs: lu.erreurs.slice(), avertissements: lu.avertissements.slice(), fatale: lu.fatale, fichiers: lu.fichiers.slice() };
}
/* Après un start, reload ou restart réussi : sshd applique ce qui est sur le disque. */
function appliquerConfigSsh(hote){
	etatBastion().sshApplique[hote] = photographierDossiers(hote, ["/etc/ssh"]);
	delete etatBastion().sshEchec[hote];
}

Shell.sorts.sshd = function(args, io){
	var test = false, etendu = false, fichier = null, h = Shell.hote();
	for (var i = 0; i < args.length; i++){
		var a = args[i];
		if (a === "-t") test = true;
		else if (a === "-T") etendu = true;
		else if (a === "-f"){ fichier = args[++i]; if (fichier === undefined) throw new ShellError("sshd: option requires an argument -- f", 1); }
		else if (a === "-C"){ i++; }
		else if (a === "-V"){ io.err("OpenSSH_9.2p1 Debian-2+deb12u3, OpenSSL 3.0.15 3 Sep 2024"); io.code = 0; return ""; }
		else if (/^-[tT]+$/.test(a)){ if (a.indexOf("t") > -1) test = true; if (a.indexOf("T") > -1) etendu = true; }
		else if (/^-[DdeiqG46]+$/.test(a)) continue;
		else throw new ShellError("sshd: illegal option -- " + a.replace(/^-+/, "").charAt(0) + "\nOpenSSH_9.2p1 Debian-2+deb12u3, OpenSSL 3.0.15 3 Sep 2024\nusage: sshd [-46DdeGiqTtV] [-C connection_spec] [-c host_cert_file]\n            [-E log_file] [-f config_file] [-g login_grace_time]\n            [-h host_key_file] [-o option] [-p port] [-u len]", 1);
	}
	if (!test && !etendu) throw new ShellError("sshd : sshd tourne déjà, c'est le service ssh." + astuce(io, "On ne lance pas le démon à la main : systemctl status ssh. Pour vérifier sa configuration : sudo sshd -t ; pour la voir en entier : sudo sshd -T."), 1);
	if (!io.sudo) throw new ShellError("sshd: no hostkeys available -- exiting." + astuce(io, "sshd doit lire les clés de la machine (/etc/ssh/ssh_host_*_key), réservées à root : sudo sshd -" + (etendu ? "T" : "t")), 1);
	var chemin = fichier ? (fichier.charAt(0) === "/" ? cheminNormal(fichier) : "/etc/ssh/" + fichier) : "/etc/ssh/sshd_config";
	if (!fichierHote(h, chemin) && !fichier){
		throw new ShellError("sshd : pas de serveur SSH configuré sur cette machine (" + h + ")." + astuce(io, "sshd -t vérifie /etc/ssh/sshd_config, qui n'existe pas ici."), 1);
	}
	var lu = lireConfigSshd(vueLive(h), chemin);
	GameEvents.fire({ type: "sshd", action: etendu ? "T" : "test", ok: lu.ok, erreurs: lu.erreurs.slice(), avertissements: lu.avertissements.slice(), hote: h });
	lu.avertissements.forEach(function(m){ io.err(m); });
	if (!lu.ok){
		lu.erreurs.forEach(function(m){ io.err(m); });
		io.code = 255;
		return io.tty ? C.gris("(sshd refuse cette configuration : un systemctl reload ssh échouerait, et un restart arrêterait le service. Corrige la ligne indiquée, puis relance sudo sshd -t.)") : "";
	}
	if (etendu){
		var o = configEffectiveDepuis(lu), lignes = [];
		DEFAUTS_SSHD.forEach(function(d){
			var v = o[d[0]];
			if (v === undefined) return;
			if (Array.isArray(v)){
				if (["allowusers", "denyusers", "allowgroups", "denygroups", "acceptenv", "setenv"].indexOf(d[0]) > -1) lignes.push(d[0] + " " + v.join(" "));
				else v.forEach(function(x){ lignes.push(d[0] + " " + x); });
			} else lignes.push(d[0] + " " + v);
		});
		return lignes.join("\n");
	}
	return io.tty ? C.gris("(Aucune réponse : la configuration est valide. C'est le moment de sudo systemctl reload ssh.)") : "";
};

/* ================================================================== */
/* ssh-keygen -t TYPE -b BITS -C COMMENTAIRE -N PHRASE -f FICHIER, -l  */
/* ================================================================== */

var SSH_KEYGEN_AVANT_BASTION = Shell.sorts["ssh-keygen"];
Shell.sorts["ssh-keygen"] = function(args, io){
	var type = null, bits = null, commentaire = null, phrase = null, fichier = null, empreinte = false, quiet = false;
	for (var i = 0; i < args.length; i++){
		var a = args[i];
		var v = function(lettre){ var x = args[++i]; if (x === undefined) throw new ShellError("option requires an argument -- " + lettre + "\nusage: ssh-keygen [-q] [-a rounds] [-b bits] [-C comment] [-f output_keyfile] [-m format]\n                  [-N new_passphrase] [-O option]\n                  [-t dsa | ecdsa | ecdsa-sk | ed25519 | ed25519-sk | rsa]", 1); return x; };
		if (a === "-t") type = v("t");
		else if (a === "-b") bits = v("b");
		else if (a === "-C") commentaire = v("C");
		else if (a === "-N") phrase = v("N");
		else if (a === "-f") fichier = v("f");
		else if (a === "-a") v("a");
		else if (a === "-l") empreinte = true;
		else if (a === "-q") quiet = true;
		else if (a === "-o") continue;
		else throw new ShellError("unknown option -- " + a.replace(/^-+/, "").charAt(0) + "\nusage: ssh-keygen [-q] [-a rounds] [-b bits] [-C comment] [-f output_keyfile] [-m format]\n                  [-N new_passphrase] [-O option]\n                  [-t dsa | ecdsa | ecdsa-sk | ed25519 | ed25519-sk | rsa]", 1);
	}
	if (empreinte){
		if (!fichier) throw new ShellError("ssh-keygen : -l a besoin d'une clé : ssh-keygen -l -f ~/.ssh/id_ed25519.pub", 1);
		var trouve = Shell.objetLisible(fichier, io, "ssh-keygen");
		var texte = trouve.item.getText().trim(), m = /^(ssh-ed25519|ssh-rsa|ecdsa-sha2-nistp\d+|ssh-dss)\s+(\S+)(?:\s+(.*))?$/.exec(texte);
		if (!m) throw new ShellError(fichier + " is not a public key file.", 255);
		var hex = sha256(m[2]), octets = "";
		for (var o = 0; o < 64; o += 2) octets += String.fromCharCode(parseInt(hex.substring(o, o + 2), 16));
		var taille = { "ssh-ed25519": 256, "ssh-rsa": /^AAAAB3NzaC1yc2EAAAADAQABAAACAQ/.test(m[2]) ? 4096 : 3072, "ssh-dss": 1024 }[m[1]] || 256;
		return taille + " SHA256:" + btoa(octets).replace(/=+$/, "") + " " + (m[3] || "no comment") + " (" + { "ssh-ed25519": "ED25519", "ssh-rsa": "RSA", "ssh-dss": "DSA" }[m[1]] + (/^ecdsa/.test(m[1]) ? "ECDSA" : "") + ")";
	}
	var types = { ed25519: "ED25519", rsa: "RSA", ecdsa: "ECDSA", dsa: "DSA" };
	if (type !== null && !types[type]) throw new ShellError("unknown key type " + type, 1);
	if (bits !== null && !/^\d+$/.test(bits)) throw new ShellError("Bits has bad value " + bits + " (invalid)", 1);
	if (type === "rsa" && bits !== null && +bits < 1024) throw new ShellError("Invalid RSA key length: minimum is 1024 bits", 1);
	if (type === "dsa") throw new ShellError("unknown key type dsa" + astuce(io, "DSA est retiré d'OpenSSH : trop faible. Prends ed25519."), 1);
	// La clé par défaut, comme avant (ed25519 dans ~/.ssh) : la fabrique d'origine, avec ses questions.
	if ((type === null || type === "ed25519") && fichier === null && phrase === null && commentaire === null && !quiet){
		return SSH_KEYGEN_AVANT_BASTION.apply(this, [[], io]);
	}
	if (!io.tty && phrase === null) throw new ShellError("ssh-keygen : la fabrication d'une clé se fait à l'écran, sans tuyau (ou avec -N \"phrase\").");
	type = type || "ed25519";
	var nbBits = type === "ed25519" ? 256 : (bits ? +bits : (type === "rsa" ? 3072 : 256));
	var cheminCle = fichier || "~/.ssh/id_" + type;
	if (cheminCle.indexOf("~/.ssh/") === 0 && Home.getChildFromName(".ssh") === -1){
		var dossierSsh = new Room(".ssh", "Le dossier de tes clés SSH. Rien que les tiennes.", "item_locker.gif");
		dossierSsh.owner = JOUEUR;
		dossierSsh.mode = "rwx------";
		libererNom(Home, ".ssh");
		link_rooms(Home, dossierSsh);
	}
	var r = Shell.chercher(cheminCle, io, "ssh-keygen");
	var lieu = r.dir, nom = r.name;
	if (r.node instanceof Room) throw new ShellError(cheminCle + " is a directory", 1);
	Shell.verifierEcriture(lieu, io, "ssh-keygen", nom);
	var fabriquer = function(phraseChoisie){
		state.clesGenerees = (state.clesGenerees || 0) + 1;
		var sel = "cle-" + type + "-" + state.clesGenerees;
		var prefixe = { ed25519: "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAI", rsa: "ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAAB" + (nbBits >= 4096 ? "AQ" : "gQ"), ecdsa: "ecdsa-sha2-nistp256 AAAAE2VjZHNhLXNoYTItbmlzdHAyNTYAAAAIbmlzdHAyNTYAAABBB" }[type];
		var longueur = { ed25519: 43, rsa: Math.round(nbBits / 6), ecdsa: 86 }[type];
		var publique = prefixe + base64Aleatoire(sel, longueur) + " " + (commentaire === null ? JOUEUR + "@" + Shell.hote() : commentaire);
		var lignesPrivee = ["-----BEGIN OPENSSH PRIVATE KEY-----"];
		for (var k = 0; k < (type === "rsa" ? Math.round(nbBits / 128) : 5); k++) lignesPrivee.push(base64Aleatoire(sel + "-p-" + k, 70));
		lignesPrivee.push("-----END OPENSSH PRIVATE KEY-----");
		[nom, nom + ".pub"].forEach(function(n){ var ancien = lieu.getItemFromName(n); if (ancien !== -1) lieu.removeItem(ancien); });
		lieu.addItem(new Item(nom, lignesPrivee.join("\n"), "item_locker.gif").droits("rw-------", io.sudo ? "root" : JOUEUR));
		lieu.addItem(new Item(nom + ".pub", publique, "item_locker.gif").droits("rw-r--r--", io.sudo ? "root" : JOUEUR));
		if (lieu === Home.getChildFromName(".ssh") && nom === "id_ed25519") state.clePublique = publique;
		var hex = sha256(publique), octets = "";
		for (var o2 = 0; o2 < 64; o2 += 2) octets += String.fromCharCode(parseInt(hex.substring(o2, o2 + 2), 16));
		GameEvents.fire({ type: "keygen", passphrase: !!phraseChoisie, typeCle: type, bits: nbBits, chemin: cheminCle });
		state.premierUsage("ssh-keygen");
		if (quiet) return "";
		return "Generating public/private " + type + " key pair.\nYour identification has been saved in " + cheminCle + "\nYour public key has been saved in " + cheminCle + ".pub\n" +
			"The key fingerprint is:\nSHA256:" + btoa(octets).replace(/=+$/, "") + " " + (commentaire === null ? JOUEUR + "@" + Shell.hote() : commentaire) + "\n" +
			"The key's randomart image is:\n" + dessinAleatoire("art-" + state.clesGenerees).replace(/^\+--\[ED25519 256\]--\+/, (function(){ var titre = "[" + types[type] + " " + nbBits + "]", g = Math.floor((17 - titre.length) / 2); return "+" + new Array(g + 1).join("-") + titre + new Array(17 - titre.length - g + 1).join("-") + "+"; })()) +
			(io.tty ? "\n" + C.gris(type === "rsa" && nbBits < 3072 ? "(RSA de moins de 3072 bits : trop court aujourd'hui. ed25519 est plus court, plus rapide et plus sûr.)" :
				"(" + (phraseChoisie ? "Clé protégée par une phrase de passe." : "Sans phrase de passe : quiconque copie ta clé privée peut s'en servir.") + ")") : "");
	};
	if (phrase !== null) return fabriquer(phrase);
	term.echo("Generating public/private " + type + " key pair.");
	term.demander("Enter passphrase (empty for no passphrase): ", true, function(p1){
		term.demander("Enter same passphrase again: ", true, function(p2){
			if (p1 !== p2){ term.echo("Passphrases do not match.  Try again."); Shell.fin(); return; }
			term.echo(fabriquer(p1).replace(/^Generating[^\n]*\n/, ""));
			Shell.fin();
		});
	});
	return "";
};

/* ================================================================== */
/* Les ports en écoute : ss et netstat sur les machines déclarées      */
/* ================================================================== */

var ECOUTES_BASTION = {};
/* Les ports qu'ouvre une unité quand elle tourne : [{ proto, adresse, port, programme, utilisateur }]. */
function declarerEcoute(hote, unite, liste){
	ECOUTES_BASTION[hote] = ECOUTES_BASTION[hote] || {};
	ECOUTES_BASTION[hote][unite] = (liste || []).map(function(e){
		return { proto: e.proto || "tcp", adresse: e.adresse === undefined ? "0.0.0.0" : e.adresse, port: +e.port, programme: e.programme || null, utilisateur: e.utilisateur || "root" };
	});
}
var NOMS_PORTS_BASTION = { "21": "ftp", "22": "ssh", "23": "telnet", "25": "smtp", "53": "domain", "67": "bootps", "68": "bootpc", "80": "http", "110": "pop3", "111": "sunrpc",
	"123": "ntp", "143": "imap", "323": "323", "443": "https", "514": "shell", "631": "ipp", "993": "imaps", "995": "pop3s", "3306": "mysql", "5353": "mdns", "5432": "postgresql", "8080": "http-alt" };
/* Les sockets ouverts d'une machine déclarée : ceux des unités qui tournent, et ta session ssh. */
function ecoutesHote(hote){
	var liste = [];
	var decl = ECOUTES_BASTION[hote] || {};
	Object.keys(decl).forEach(function(unite){
		var e = etatUnite(hote, unite);
		if (!e.existe || !e.actif) return;
		var socket = /\.socket$/.test(unite);
		var info = uniteInfo(hote, unite);
		var pid = socket ? 1 : (info.service && info.service.pid ? info.service.pid : 300 + Math.floor(alea("pid-" + hote + "-" + unite) * 600));
		decl[unite].forEach(function(x){
			var prog = socket ? "systemd" : (x.programme || (info.service ? info.service.procNom : unite.replace(/\.service$/, "")));
			liste.push({ proto: x.proto, etat: x.proto === "udp" ? "UNCONN" : "LISTEN", adresse: x.adresse, port: x.port, pairAdresse: x.adresse === "0.0.0.0" || /^\d/.test(x.adresse) ? "0.0.0.0" : (x.adresse === "*" ? "*" : "::"),
				pairPort: "*", programme: prog, pid: pid, utilisateur: socket ? "root" : x.utilisateur, unite: unite });
		});
	});
	if (Shell.pile_ssh.length && Shell.hote() === hote && liste.some(function(s){ return s.port === 22 && s.etat === "LISTEN"; })){
		var depuis = (HOTES[Shell.hote()] || {}).ip || "10.0.0.2", ici = ((HOTES[hote] || {}).ip) || "10.0.0.2";
		var pidSession = 2000 + Math.floor(alea("session-ssh-" + hote) * 900);
		var origine = racineDe(Shell.pile_ssh[Shell.pile_ssh.length - 1]);
		if (origine && HOTES[origine.racineHote]) depuis = HOTES[origine.racineHote].ip || depuis;
		else if (HOTES.cybersup) depuis = HOTES.cybersup.ip || depuis;
		liste.push({ proto: "tcp", etat: "ESTAB", adresse: ici, port: 22, pairAdresse: depuis, pairPort: 51744, programme: "sshd", pid: pidSession, utilisateur: "root", unite: "ssh" });
	}
	liste.sort(function(a, b){ return a.proto === b.proto ? a.port - b.port : (a.proto === "tcp" ? -1 : 1); });
	return liste;
}
function lireOptionsSocket(args, cmd, permises){
	var o = {};
	args.forEach(function(a){
		if (/^--/.test(a)){
			var long = { "--tcp": "t", "--udp": "u", "--listening": "l", "--numeric": "n", "--processes": "p", "--program": "p", "--all": "a", "--timers": "o", "--extend": "e", "--no-header": "H", "--ipv4": "4", "--ipv6": "6" }[a];
			if (!long) throw new ShellError(cmd + ": unrecognized option '" + a + "'", cmd === "ss" ? 1 : 2);
			o[long] = true;
			return;
		}
		if (a.charAt(0) !== "-") throw new ShellError(cmd === "ss" ? "ss: bad filter « " + a + " »" : "netstat: invalid argument « " + a + " »", 1);
		for (var k = 1; k < a.length; k++){
			var l = a.charAt(k);
			if (permises.indexOf(l) === -1) throw new ShellError(cmd + ": invalid option -- '" + l + "'" + (cmd === "netstat" ? "\nusage: netstat [-vWeenNcCF] [<Af>] -r         netstat {-V|--version|-h|--help}\n       netstat [-vWnNcaeol] [<Socket> ...]" : "\nUsage: ss [ OPTIONS ]"), cmd === "ss" ? 1 : 2);
			o[l] = true;
		}
	});
	return o;
}
function filtrerSockets(liste, o){
	if (!o.t && !o.u){ o.t = true; o.u = true; o.tous = true; }
	return liste.filter(function(s){
		if (s.proto === "tcp" && !o.t) return false;
		if (s.proto === "udp" && !o.u) return false;
		var v6 = s.adresse === "::" || s.adresse === "*" || s.adresse.indexOf(":") > -1;
		if (o["4"] && !o["6"] && v6 && s.adresse !== "*") return false;
		if (o["6"] && !o["4"] && !v6) return false;
		if (o.a) return true;
		return o.l ? s.etat !== "ESTAB" : s.etat === "ESTAB";
	});
}
function nomPort(port, numerique){ return numerique ? String(port) : (NOMS_PORTS_BASTION[String(port)] || String(port)); }

var SS_AVANT_BASTION = Shell.sorts.ss;
Shell.sorts.ss = function(args, io){
	var h = Shell.hote();
	if (!ECOUTES_BASTION[h]) return SS_AVANT_BASTION.apply(this, arguments);
	var o = lireOptionsSocket(args, "ss", "tulnpa46Heo");
	var liste = filtrerSockets(ecoutesHote(h), o);
	var netid = (o.t && o.u) || o.tous;
	var affichageAdresse = function(a){ return a === "::" ? "[::]" : (a.indexOf(":") > -1 && a !== "*" ? "[" + a + "]" : a); };
	var lignes = liste.map(function(s){
		return { netid: s.proto, etat: s.etat, recv: "0", send: s.etat === "LISTEN" ? (s.port === 22 ? "128" : "511") : (s.proto === "udp" ? "0" : "0"),
			la: affichageAdresse(s.adresse), lp: nomPort(s.port, o.n), pa: affichageAdresse(s.pairAdresse), pp: s.pairPort === "*" ? "*" : nomPort(s.pairPort, true),
			proc: o.p && (io.sudo || s.utilisateur === JOUEUR) ? "users:((\"" + s.programme + "\",pid=" + s.pid + ",fd=" + (s.proto === "udp" ? 5 : 3) + "))" : "" };
	});
	var la = Math.max("Local Address".length, Math.max.apply(null, lignes.map(function(l){ return l.la.length; }).concat([0])));
	var lp = Math.max("Port".length + 1, Math.max.apply(null, lignes.map(function(l){ return l.lp.length; }).concat([0])));
	var pa = Math.max("Peer Address".length, Math.max.apply(null, lignes.map(function(l){ return l.pa.length; }).concat([0])));
	var pp = Math.max("Port".length, Math.max.apply(null, lignes.map(function(l){ return l.pp.length; }).concat([0])));
	function ligne(netidT, etat, recv, send, a, p, b, q, proc){
		return (netid ? completerDroite(netidT, 5) + " " : "") + completerDroite(etat, 6) + " " + completerDroite(recv, 6) + " " + completerDroite(send, 6) + " " +
			completerGauche(a, la) + ":" + completerDroite(p, lp) + " " + completerGauche(b, pa) + ":" + completerDroite(q, pp) + (proc !== null ? (proc === "" ? "" : proc) : "");
	}
	var sortie = o.H ? [] : [ligne("Netid", "State", "Recv-Q", "Send-Q", "Local Address", "Port", "Peer Address", "Port", "Process")];
	lignes.forEach(function(l){ sortie.push(ligne(l.netid, l.etat, l.recv, l.send, l.la, l.lp, l.pa, l.pp, l.proc)); });
	sortie = sortie.map(function(x){ return x.replace(/\s+$/, ""); });
	var caches = o.p && !io.sudo && liste.some(function(s){ return s.utilisateur !== JOUEUR; });
	GameEvents.fire({ type: "ss", host: h, listen: !!o.l, process: !!(o.p && io.sudo), sortie: sortie.join("\n"), options: Object.keys(o).filter(function(k){ return o[k] && k.length === 1; }).join(""), generique: true,
		ports: liste.filter(function(s){ return s.etat !== "ESTAB"; }).map(function(s){ return s.proto + "/" + s.port; }) });
	if (caches && io.tty) sortie.push(C.gris("(La colonne Process reste vide pour les processus des autres comptes : sudo ss -" + Object.keys(o).filter(function(k){ return o[k] && k.length === 1; }).join("") + " les montre.)"));
	return sortie.join("\n");
};

var NETSTAT_AVANT_BASTION = Shell.sorts.netstat;
Shell.sorts.netstat = function(args, io){
	var h = Shell.hote();
	if (!ECOUTES_BASTION[h] || args.some(function(a){ return /^-[a-zA-Z]*[ri]/.test(a) && !/^--/.test(a); })) return NETSTAT_AVANT_BASTION.apply(this, arguments);
	var o = lireOptionsSocket(args, "netstat", "tulnpaoeW46");
	var liste = filtrerSockets(ecoutesHote(h), o);
	var titre = o.a ? "Active Internet connections (servers and established)" : (o.l ? "Active Internet connections (only servers)" : "Active Internet connections (w/o servers)");
	var lignes = [titre, "Proto Recv-Q Send-Q " + completerDroite("Local Address", 23) + " " + completerDroite("Foreign Address", 23) + " " + completerDroite("State", 11) +
		(o.p ? " " + completerDroite("PID/Program name", 19) : "") + (o.o ? " Timer" : "")];
	var caches = false;
	function adresse(a, port, v6){
		if (v6) return (a === "*" || a === "::" ? "::" : a) + ":" + port;
		return (a === "*" ? "0.0.0.0" : a) + ":" + port;
	}
	liste.forEach(function(s){
		var v6 = s.adresse === "::" || s.adresse === "*" || s.adresse.indexOf(":") > -1;
		var proto = s.proto + (v6 ? "6" : "");
		var local = adresse(s.adresse === "127.0.0.1" && !o.n ? "localhost" : s.adresse, nomPort(s.port, o.n), v6);
		var dist = s.etat === "ESTAB" ? s.pairAdresse + ":" + nomPort(s.pairPort, true) : (v6 ? ":::*" : "0.0.0.0:*");
		var etat = s.etat === "LISTEN" ? "LISTEN" : (s.etat === "ESTAB" ? "ESTABLISHED" : "");
		var proc = "";
		if (o.p){ if (io.sudo || s.utilisateur === JOUEUR) proc = s.pid + "/" + s.programme; else { proc = "-"; caches = true; } }
		lignes.push(completerDroite(proto, 5) + " " + completerGauche("0", 6) + " " + completerGauche("0", 6) + " " + completerDroite(local, 23) + " " + completerDroite(dist, 23) + " " + completerDroite(etat, 11) +
			(o.p ? " " + completerDroite(proc, 19) : "") + (o.o ? " " + (s.etat === "ESTAB" ? "keepalive (7189.43/0/0)" : "off (0.00/0/0)") : ""));
	});
	lignes = lignes.map(function(x){ return x.replace(/\s+$/, ""); });
	if (caches) io.err("(Not all processes could be identified, non-owned process info\n will not be shown, you would have to be root to see it all.)");
	GameEvents.fire({ type: "netstat", host: h, sortie: lignes.join("\n"), options: Object.keys(o).filter(function(k){ return o[k] && k.length === 1; }).join(""), generique: true,
		ports: liste.filter(function(s){ return s.etat !== "ESTAB"; }).map(function(s){ return s.proto + "/" + s.port; }) });
	return lignes.join("\n");
};

/* ================================================================== */
/* systemd : les unités, lues sur le disque de la machine              */
/* ================================================================== */

var DOSSIERS_UNITES = ["/etc/systemd/system", "/run/systemd/system", "/lib/systemd/system", "/usr/lib/systemd/system"];
var CIBLES_STANDARD = { "ctrl-alt-del.target": "Reboot", "multi-user.target": "Multi-User System", "graphical.target": "Graphical Interface", "reboot.target": "Reboot",
	"rescue.target": "Rescue Mode", "emergency.target": "Emergency Mode", "poweroff.target": "System Power Off", "sockets.target": "Sockets", "timers.target": "Timer Units",
	"network-online.target": "Network is Online" };
var UNITES_DECLAREES = {};
/* L'état de départ d'une unité qui n'a pas de service() dans decrireHote : { actif, enabled, description }. */
function declarerUnite(hote, nom, def){
	UNITES_DECLAREES[hote] = UNITES_DECLAREES[hote] || {};
	UNITES_DECLAREES[hote][nomUniteComplet(nom)] = def || {};
}
/* Une vérification qu'un autre fichier ajoute avant start, restart, reload (apachectl configtest, par exemple). */
var CONTROLES_AVANT_DEMARRAGE = [];
function controleAvantDemarrage(f){ CONTROLES_AVANT_DEMARRAGE.push(f); }

function nomUniteComplet(nom){
	nom = String(nom || "");
	return /\.(service|socket|target|timer|mount|path|slice|scope|device|swap|automount)$/.test(nom) ? nom : nom + ".service";
}
/* La clé de l'unité dans HOTES[hote].services (sshd pour ssh.service, telnet.socket...), ou null. */
function cleService(hote, unite){
	var s = (HOTES[hote] && HOTES[hote].services) || {};
	var base = unite.replace(/\.service$/, "");
	if (s.hasOwnProperty(unite)) return unite;
	if (/\.service$/.test(unite) && s.hasOwnProperty(base)) return base;
	if (base === "ssh" && s.hasOwnProperty("sshd")) return "sshd";
	if (base === "sshd" && s.hasOwnProperty("ssh")) return "ssh";
	return null;
}
/* Une machine dont systemd est décrit sur le disque (/etc/systemd/system, /lib/systemd/system...) ou marquée bastion. */
function hoteGere(hote){
	if (!racineHote(hote)) return false;
	if (HOTES[hote] && HOTES[hote].bastion) return true;
	return DOSSIERS_UNITES.some(function(d){ return !!dossierHote(hote, d); });
}
/* Le texte des fichiers d'une unité dans une vue : le fichier principal et ses drop-ins (NOM.d/*.conf), dans l'ordre. */
function fichiersUnite(vue, unite){
	var principal = null;
	for (var i = 0; i < DOSSIERS_UNITES.length && !principal; i++){
		var x = vue.lire(DOSSIERS_UNITES[i] + "/" + unite);
		if (x) principal = { chemin: DOSSIERS_UNITES[i] + "/" + unite, texte: x.t, lien: x.l };
	}
	// Un lien vers un autre fichier d'unité (un alias) : on le suit.
	if (principal && principal.lien && principal.lien !== "/dev/null"){
		var cible = vue.lire(principal.lien.charAt(0) === "/" ? principal.lien : dossierDe(principal.chemin) + "/" + principal.lien);
		if (cible && cible.t !== undefined) principal = { chemin: principal.lien, texte: cible.t };
	}
	var dropins = {};
	DOSSIERS_UNITES.slice().reverse().forEach(function(d){
		vue.lister(d + "/" + unite + ".d").forEach(function(f){
			if (!/\.conf$/.test(f)) return;
			var x = vue.lire(d + "/" + unite + ".d/" + f);
			if (x && x.t !== undefined) dropins[f] = { chemin: d + "/" + unite + ".d/" + f, texte: x.t, nom: f };
		});
	});
	return { principal: principal, dropins: Object.keys(dropins).sort().map(function(k){ return dropins[k]; }) };
}
/* Les directives d'une unité (le fichier puis les drop-ins) : { Section: { Cle: [valeurs dans l'ordre] } }. */
function directivesUnite(f){
	var d = {};
	var textes = (f.principal && f.principal.texte !== undefined ? [f.principal.texte] : []).concat(f.dropins.map(function(x){ return x.texte; }));
	textes.forEach(function(t){
		var section = null;
		lignesDe(t || "").forEach(function(l){
			l = l.trim();
			if (l === "" || /^[#;]/.test(l)) return;
			var s = /^\[([^\]]+)\]$/.exec(l);
			if (s){ section = s[1]; d[section] = d[section] || {}; return; }
			var kv = /^([A-Za-z0-9_]+)\s*=\s*(.*)$/.exec(l);
			if (!kv || !section) return;
			d[section][kv[1]] = d[section][kv[1]] || [];
			if (kv[2] === "") d[section][kv[1]] = [""];
			else d[section][kv[1]].push(kv[2]);
		});
	});
	return d;
}
function derniere(d, section, cle){
	var v = d[section] && d[section][cle];
	return v && v.length ? v[v.length - 1] : null;
}
function texteCombine(f){
	return (f.principal ? (f.principal.lien ? "->" + f.principal.lien : f.principal.texte) : "") + f.dropins.map(function(x){ return "\n#" + x.chemin + "\n" + x.texte; }).join("");
}

/* Tout ce qu'on sait d'une unité sur une machine. */
function uniteInfo(hote, nom){
	var unite = nomUniteComplet(nom);
	var cle = cleService(hote, unite);
	if (cle && !/\./.test(cle)){
		unite = cle + ".service";
		// Debian appelle l'unité ssh.service (sshd.service en est l'alias) : on suit le fichier posé sur le disque.
		if (/^sshd?$/.test(cle) && racineHote(hote)){
			if (fichiersUnite(vueLive(hote), "ssh.service").principal) unite = "ssh.service";
			else if (fichiersUnite(vueLive(hote), "sshd.service").principal) unite = "sshd.service";
		}
	}
	var service = cle ? HOTES[hote].services[cle] : null;
	var b = etatBastion();
	var retire = !!(b.retires[hote] && (b.retires[hote][unite] || (cle && b.retires[hote][cle])));
	var vue = vueLive(hote);
	var f = racineHote(hote) ? fichiersUnite(vue, unite) : { principal: null, dropins: [] };
	if (!f.principal && /^sshd?\.service$/.test(unite)){
		var autre = unite === "ssh.service" ? "sshd.service" : "ssh.service";
		var f2 = racineHote(hote) ? fichiersUnite(vue, autre) : { principal: null, dropins: [] };
		if (f2.principal) f = f2;
	}
	var masqueFichier = !!(f.principal && f.principal.lien === "/dev/null");
	var masque = masqueFichier || !!(b.masques[hote] && b.masques[hote][unite]);
	var decl = (UNITES_DECLAREES[hote] || {})[unite] || null;
	var standard = CIBLES_STANDARD.hasOwnProperty(unite);
	var existe = !retire && (!!service || (!!f.principal && !masqueFichier) || standard || !!decl);
	if (retire && f.principal && !masqueFichier) existe = true;
	var directives = directivesUnite(masqueFichier ? { principal: null, dropins: [] } : f);
	var avecInstall = !!(directives.Install && (directives.Install.WantedBy || directives.Install.RequiredBy || directives.Install.Alias || directives.Install.Also));
	var etat = (b.unites[hote] || {})[unite] || null;
	var actif, auto;
	if (service && !retire){ actif = !!service.actif; auto = !!service.auto; }
	else {
		actif = etat && etat.actif !== undefined ? etat.actif : (decl && decl.actif !== undefined ? !!decl.actif : (unite === "multi-user.target" || unite === "sockets.target" || unite === "timers.target"));
		auto = etat && etat.auto !== undefined ? etat.auto : (decl && decl.enabled !== undefined ? !!decl.enabled : avecInstall);
	}
	if (retire && !service) actif = false;
	var echec = !!(b.echecs[hote] && b.echecs[hote][unite]);
	var etatFichier = masque ? "masked" : (!existe ? null : ((f.principal || service) && !avecInstall && f.principal ? "static" : (standard && !f.principal ? "static" : (auto ? "enabled" : "disabled"))));
	var description = derniere(directives, "Unit", "Description") || (service ? service.description : null) || (decl && decl.description) || CIBLES_STANDARD[unite] || unite;
	return { unite: unite, cle: cle, service: retire ? null : service, fichiers: f, directives: directives, masque: masque, existe: existe, actif: actif && !masque || (actif && masque),
		auto: auto, etatFichier: etatFichier, echec: echec, description: description, retire: retire, standard: standard,
		type: unite.split(".").pop(), chemin: f.principal && !masqueFichier ? f.principal.chemin : (service ? "/lib/systemd/system/" + unite : null) };
}
function etatUnite(hote, nom){
	var i = uniteInfo(hote, nom);
	return { existe: i.existe, actif: i.existe && i.actif, enabled: i.etatFichier === "enabled", masque: i.masque, echec: i.echec, etatFichier: i.etatFichier };
}
function changerEtatUnite(hote, info, changement){
	if (info.service){
		if (changement.auto !== undefined) info.service.auto = changement.auto;
		if (changement.actif === true) demarrerService(hote, info.cle);
		if (changement.actif === false) arreterService(hote, info.cle);
	} else {
		var u = sousEtat("unites", hote);
		u[info.unite] = u[info.unite] || {};
		for (var k in changement) u[info.unite][k] = changement[k];
	}
	if (changement.actif !== undefined){
		var e = sousEtat("echecs", hote);
		delete e[info.unite];
	}
}
function marquerEchec(hote, info){
	if (info.service) arreterService(hote, info.cle);
	else { var u = sousEtat("unites", hote); u[info.unite] = u[info.unite] || {}; u[info.unite].actif = false; }
	sousEtat("echecs", hote)[info.unite] = true;
}
/* Toutes les unités connues d'une machine : celles du disque, de decrireHote, déclarées, et les cibles standard. */
function unitesHote(hote){
	var vus = {};
	if (racineHote(hote)){
		DOSSIERS_UNITES.forEach(function(d){
			fichiersDuDossier(hote, d).forEach(function(f){ if (/\.(service|socket|target|timer|path)$/.test(f.nom) && !/@\./.test(f.nom)) vus[f.nom] = true; });
		});
	}
	Object.keys((HOTES[hote] && HOTES[hote].services) || {}).forEach(function(k){ vus[/^sshd?$/.test(k) ? uniteInfo(hote, k).unite : nomUniteComplet(k)] = true; });
	Object.keys(UNITES_DECLAREES[hote] || {}).forEach(function(k){ vus[k] = true; });
	Object.keys(CIBLES_STANDARD).forEach(function(k){ vus[k] = true; });
	if (vus["ssh.service"] && vus["sshd.service"]) delete vus["sshd.service"];
	return Object.keys(vus).sort();
}
/* La vue de systemd : ce qu'il a chargé au dernier daemon-reload (ou ce qui tournait avant la première modification). */
function vueSystemd(hote){ return vueChargee("systemd", hote, etatBastion().systemdCharge[hote] || null); }
function rechargerSystemd(hote){ etatBastion().systemdCharge[hote] = photographierDossiers(hote, DOSSIERS_UNITES); }
function changeSurDisque(hote, unite){
	if (!racineHote(hote)) return false;
	return texteCombine(fichiersUnite(vueLive(hote), unite)) !== texteCombine(fichiersUnite(vueSystemd(hote), unite));
}

/* ================================================================== */
/* systemd-analyze security : la note d'exposition d'un service        */
/* ================================================================== */

/* Les directives lues par systemd (au dernier daemon-reload) pour le calcul de la note. */
function directivesChargees(hote, unite){ return directivesUnite(fichiersUnite(vueSystemd(hote), unite)); }
function oui(v){ return v !== null && /^(1|yes|true|on)$/i.test(v); }
/* Les capacités qu'un service garde, d'après CapabilityBoundingSet= (null : toutes). */
function capacitesGardees(d){
	var lignes = (d.Service && d.Service.CapabilityBoundingSet) || [];
	var garde = null;
	lignes.forEach(function(v){
		if (v === ""){ garde = null; return; }
		var inverse = v.charAt(0) === "~";
		var caps = v.replace(/^~/, "").split(/\s+/).filter(Boolean);
		if (inverse){
			if (garde === null) garde = { tout: true, sauf: [] };
			if (garde.tout) garde.sauf = garde.sauf.concat(caps);
			else garde.liste = garde.liste.filter(function(c){ return caps.indexOf(c) === -1; });
		} else {
			if (garde === null || garde.tout) garde = { tout: false, liste: [] };
			garde.liste = garde.liste.concat(caps);
		}
	});
	return garde;
}
function capaciteRetiree(d, caps){
	var g = capacitesGardees(d);
	if (g === null) return false;
	return caps.every(function(c){ return g.tout ? g.sauf.indexOf(c) > -1 : g.liste.indexOf(c) === -1; });
}
function familleRetiree(d, famille){
	var v = (d.Service && d.Service.RestrictAddressFamilies) || [];
	var liste = null, inverse = false;
	v.forEach(function(x){
		if (x === ""){ liste = null; return; }
		inverse = x.charAt(0) === "~";
		liste = x.replace(/^~/, "").split(/\s+/);
	});
	if (liste === null) return false;
	if (liste.length === 1 && liste[0] === "none") return true;
	return inverse ? liste.indexOf(famille) > -1 : liste.indexOf(famille) === -1;
}
var CONTROLES_SECURITE = [
	{ nom: "PrivateNetwork=", poids: 2500, ok: "Service has no access to the host's network", ko: "Service has access to the host's network", f: function(d){ return oui(derniere(d, "Service", "PrivateNetwork")) ? 0 : 1; } },
	{ nom: "User=/DynamicUser=", poids: 2000, ok: "Service runs under a static non-root user identity", ko: "Service runs as root user",
		f: function(d){ var u = derniere(d, "Service", "User"); return oui(derniere(d, "Service", "DynamicUser")) || (u !== null && u !== "" && u !== "root" && u !== "0") ? 0 : 1; } },
	{ nom: "CapabilityBoundingSet=~CAP_SYS_ADMIN", poids: 1500, ok: "Service has no administrator privileges", ko: "Service has administrator privileges", f: function(d){ return capaciteRetiree(d, ["CAP_SYS_ADMIN"]) ? 0 : 1; } },
	{ nom: "CapabilityBoundingSet=~CAP_SET(UID|GID|PCAP)", poids: 1500, ok: "Service cannot change UID/GID identities/capabilities", ko: "Service may change UID/GID identities/capabilities",
		f: function(d){ return capaciteRetiree(d, ["CAP_SETUID", "CAP_SETGID", "CAP_SETPCAP"]) ? 0 : 1; } },
	{ nom: "CapabilityBoundingSet=~CAP_SYS_PTRACE", poids: 1500, ok: "Service has no ptrace() debugging abilities", ko: "Service has ptrace() debugging abilities", f: function(d){ return capaciteRetiree(d, ["CAP_SYS_PTRACE"]) ? 0 : 1; } },
	{ nom: "CapabilityBoundingSet=~CAP_SYS_MODULE", poids: 1500, ok: "Service cannot load kernel modules", ko: "Service may load kernel modules", f: function(d){ return capaciteRetiree(d, ["CAP_SYS_MODULE"]) ? 0 : 1; } },
	{ nom: "CapabilityBoundingSet=~CAP_NET_ADMIN", poids: 1000, ok: "Service has no network configuration privileges", ko: "Service has network configuration privileges", f: function(d){ return capaciteRetiree(d, ["CAP_NET_ADMIN"]) ? 0 : 1; } },
	{ nom: "CapabilityBoundingSet=~CAP_SYS_RAWIO", poids: 1000, ok: "Service has no raw I/O access", ko: "Service has raw I/O access", f: function(d){ return capaciteRetiree(d, ["CAP_SYS_RAWIO"]) ? 0 : 1; } },
	{ nom: "CapabilityBoundingSet=~CAP_(DAC_*|FOWNER|IPC_OWNER)", poids: 1000, ok: "Service cannot override UNIX file/IPC permission checks", ko: "Service may override UNIX file/IPC permission checks",
		f: function(d){ return capaciteRetiree(d, ["CAP_DAC_OVERRIDE", "CAP_DAC_READ_SEARCH", "CAP_FOWNER", "CAP_IPC_OWNER"]) ? 0 : 1; } },
	{ nom: "NoNewPrivileges=", poids: 1000, ok: "Service processes cannot acquire new privileges", ko: "Service processes may acquire new privileges", f: function(d){ return oui(derniere(d, "Service", "NoNewPrivileges")) ? 0 : 1; } },
	{ nom: "ProtectSystem=", poids: 2000, ok: "Service has strict read-only access to the OS file hierarchy", ko: "Service has full access to the OS file hierarchy",
		f: function(d){ var v = (derniere(d, "Service", "ProtectSystem") || "no").toLowerCase(); return v === "strict" ? 0 : (v === "full" ? 0.25 : (oui(v) ? 0.5 : 1)); },
		texte: function(d){ var v = (derniere(d, "Service", "ProtectSystem") || "no").toLowerCase(); return v === "full" ? "Service has very limited write access to the OS file hierarchy" : (oui(v) ? "Service has limited write access to the OS file hierarchy" : null); } },
	{ nom: "ProtectHome=", poids: 1000, ok: "Service has no access to home directories", ko: "Service has full access to home directories",
		f: function(d){ var v = (derniere(d, "Service", "ProtectHome") || "no").toLowerCase(); return v === "read-only" ? 0.5 : (oui(v) || v === "tmpfs" ? 0 : 1); },
		texte: function(d){ return (derniere(d, "Service", "ProtectHome") || "").toLowerCase() === "read-only" ? "Service has read-only access to home directories" : null; } },
	{ nom: "PrivateTmp=", poids: 1000, ok: "Service has no access to other software's temporary files", ko: "Service has access to other software's temporary files", f: function(d){ return oui(derniere(d, "Service", "PrivateTmp")) ? 0 : 1; } },
	{ nom: "PrivateDevices=", poids: 1000, ok: "Service has no access to hardware devices", ko: "Service potentially has access to hardware devices", f: function(d){ return oui(derniere(d, "Service", "PrivateDevices")) ? 0 : 1; } },
	{ nom: "ProtectKernelTunables=", poids: 1000, ok: "Service cannot alter kernel tunables (/proc/sys, …)", ko: "Service may alter kernel tunables", f: function(d){ return oui(derniere(d, "Service", "ProtectKernelTunables")) ? 0 : 1; } },
	{ nom: "ProtectKernelModules=", poids: 1000, ok: "Service cannot load or read kernel modules", ko: "Service may load or read kernel modules", f: function(d){ return oui(derniere(d, "Service", "ProtectKernelModules")) ? 0 : 1; } },
	{ nom: "ProtectKernelLogs=", poids: 1000, ok: "Service cannot read from or write to the kernel log ring buffer", ko: "Service may read from or write to the kernel log ring buffer", f: function(d){ return oui(derniere(d, "Service", "ProtectKernelLogs")) ? 0 : 1; } },
	{ nom: "ProtectControlGroups=", poids: 1000, ok: "Service cannot modify the control group file system", ko: "Service may modify the control group file system", f: function(d){ return oui(derniere(d, "Service", "ProtectControlGroups")) ? 0 : 1; } },
	{ nom: "ProtectClock=", poids: 1000, ok: "Service cannot write to the hardware clock or system clock", ko: "Service may write to the hardware clock or system clock", f: function(d){ return oui(derniere(d, "Service", "ProtectClock")) ? 0 : 1; } },
	{ nom: "ProtectHostname=", poids: 500, ok: "Service cannot change system host/domainname", ko: "Service may change system host/domainname", f: function(d){ return oui(derniere(d, "Service", "ProtectHostname")) ? 0 : 1; } },
	{ nom: "ProtectProc=", poids: 1000, ok: "Service has restricted access to process tree (/proc hidepid=)", ko: "Service has full access to process tree (/proc hidepid=)",
		f: function(d){ return /^(invisible|noaccess|ptraceable)$/.test(derniere(d, "Service", "ProtectProc") || "") ? 0 : 1; } },
	{ nom: "PrivateUsers=", poids: 1000, ok: "Service does not have access to other users", ko: "Service has access to other users", f: function(d){ return oui(derniere(d, "Service", "PrivateUsers")) ? 0 : 1; } },
	{ nom: "RestrictSUIDSGID=", poids: 1000, ok: "SUID/SGID file creation by service is restricted", ko: "Service may create SUID/SGID files", f: function(d){ return oui(derniere(d, "Service", "RestrictSUIDSGID")) ? 0 : 1; } },
	{ nom: "RestrictNamespaces=", poids: 1000, ok: "Service cannot create namespaces", ko: "Service may create namespaces", f: function(d){ var v = derniere(d, "Service", "RestrictNamespaces"); return v !== null && (oui(v) || v === "") ? 0 : 1; } },
	{ nom: "RestrictRealtime=", poids: 500, ok: "Service realtime scheduling access is restricted", ko: "Service may acquire realtime scheduling", f: function(d){ return oui(derniere(d, "Service", "RestrictRealtime")) ? 0 : 1; } },
	{ nom: "LockPersonality=", poids: 100, ok: "Service cannot change ABI personality", ko: "Service may change ABI personality", f: function(d){ return oui(derniere(d, "Service", "LockPersonality")) ? 0 : 1; } },
	{ nom: "MemoryDenyWriteExecute=", poids: 100, ok: "Service cannot create writable executable memory mappings", ko: "Service may create writable executable memory mappings", f: function(d){ return oui(derniere(d, "Service", "MemoryDenyWriteExecute")) ? 0 : 1; } },
	{ nom: "RestrictAddressFamilies=~AF_PACKET", poids: 1000, ok: "Service cannot allocate packet sockets", ko: "Service may allocate packet sockets", f: function(d){ return familleRetiree(d, "AF_PACKET") ? 0 : 1; } },
	{ nom: "RestrictAddressFamilies=~AF_(INET|INET6)", poids: 300, ok: "Service cannot allocate Internet sockets", ko: "Service may allocate Internet sockets", f: function(d){ return familleRetiree(d, "AF_INET") && familleRetiree(d, "AF_INET6") ? 0 : 1; } },
	{ nom: "SystemCallFilter=~@privileged", poids: 700, ok: "System call allow list defined for service, and @privileged is not included", ko: "Service does not filter system calls",
		f: function(d){ var v = (d.Service && d.Service.SystemCallFilter) || []; if (!v.length || v[v.length - 1] === "") return 1; var t = v.join(" "); return /^~/.test(v[0]) ? (/@privileged/.test(t) ? 0 : 1) : (/@privileged/.test(t) ? 1 : 0); } },
	{ nom: "SystemCallArchitectures=", poids: 1000, ok: "Service may execute system calls only with native ABI", ko: "Service may execute system calls with all ABIs", f: function(d){ return derniere(d, "Service", "SystemCallArchitectures") === "native" ? 0 : 1; } },
	{ nom: "UMask=", poids: 100, ok: "Files created by service are accessible only by service's own user by default", ko: "Files created by service are world-readable by default",
		f: function(d){ var v = derniere(d, "Service", "UMask"); if (v === null) return 1; var n = parseInt(v, 8); return (n & 7) === 7 && (n & 56) === 56 ? 0 : ((n & 7) === 7 ? 0.5 : 1); },
		texte: function(d){ var v = derniere(d, "Service", "UMask"); return v !== null && (parseInt(v, 8) & 7) === 7 && (parseInt(v, 8) & 56) !== 56 ? "Files created by service are group-readable by default" : null; } },
	{ nom: "IPAddressDeny=", poids: 1000, ok: "Service defines IP address allow list", ko: "Service does not define an IP address allow list", f: function(d){ return /any/.test(derniere(d, "Service", "IPAddressDeny") || "") ? 0 : 1; } },
	{ nom: "RootDirectory=/RootImage=", poids: 200, ok: "Service has its own root directory/image", ko: "Service runs within the host's root directory", f: function(d){ return derniere(d, "Service", "RootDirectory") || derniere(d, "Service", "RootImage") ? 0 : 1; } },
	{ nom: "DeviceAllow=", poids: 1000, ok: "Service has a minimal device ACL", ko: "Service has no device ACL", f: function(d){ return oui(derniere(d, "Service", "PrivateDevices")) || derniere(d, "Service", "DeviceAllow") !== null || derniere(d, "Service", "DevicePolicy") === "closed" ? 0 : 1; } },
	{ nom: "KeyringMode=", poids: 200, ok: "Service doesn't share key material with other services", ko: "Service shares key material with other service", f: function(d){ return derniere(d, "Service", "KeyringMode") === "shared" ? 1 : 0; } },
	{ nom: "Delegate=", poids: 100, ok: "Service does not maintain its own delegated control group subtree", ko: "Service maintains its own delegated control group subtree", f: function(d){ return oui(derniere(d, "Service", "Delegate")) ? 1 : 0; } },
	{ nom: "NotifyAccess=", poids: 500, ok: "Service child processes cannot alter service state", ko: "Service child processes may alter service state", f: function(d){ return derniere(d, "Service", "NotifyAccess") === "all" ? 1 : 0; } },
	{ nom: "AmbientCapabilities=", poids: 500, ok: "Service process does not receive ambient capabilities", ko: "Service process receives ambient capabilities", f: function(d){ var v = derniere(d, "Service", "AmbientCapabilities"); return v ? 1 : 0; } },
	{ nom: "SupplementaryGroups=", poids: 200, ok: "Service has no supplementary groups", ko: "Service runs with supplementary groups", f: function(d){ return derniere(d, "Service", "SupplementaryGroups") ? 1 : 0; } }
];
var PREDICATS_SYSTEMD = [[100, "DANGEROUS", "💀"], [90, "UNSAFE", "😨"], [75, "EXPOSED", "🙁"], [50, "MEDIUM", "😐"], [10, "OK", "🙂"], [1, "SAFE", "😀"], [0, "PERFECT", "😀"]];
/* La note d'une unité : { exposition (0 à 10, un chiffre après la virgule), predicat, emoji, controles: [{ nom, mauvais, part, description }] }. */
function expositionUnite(hote, nom){
	var unite = uniteInfo(hote, nom).unite;
	var d = directivesChargees(hote, unite);
	var total = 0, mauvais = 0, controles = [];
	CONTROLES_SECURITE.forEach(function(c){
		var x = c.f(d);
		total += c.poids;
		mauvais += c.poids * x;
		controles.push({ nom: c.nom, mauvais: x, poids: c.poids, description: (c.texte && c.texte(d)) || (x > 0 ? c.ko : c.ok) });
	});
	var dixiemes = Math.round(100 * mauvais / total);
	var p = PREDICATS_SYSTEMD.filter(function(x){ return dixiemes >= x[0]; })[0];
	controles.forEach(function(c){ c.part = Math.round(100 * c.poids * c.mauvais / total) / 10; });
	return { exposition: dixiemes / 10, texte: (dixiemes / 10).toFixed(1), predicat: p[1], emoji: p[2], controles: controles };
}

Shell.sorts["systemd-analyze"] = function(args, io){
	var mots = args.filter(function(a){ return a.charAt(0) !== "-"; }), h = Shell.hote();
	var action = mots[0];
	if (!action || action === "time"){
		return "Startup finished in 2.012s (kernel) + 4.731s (userspace) = 6.743s\nmulti-user.target reached after 4.698s in userspace";
	}
	if (action === "verify"){
		var cibles = mots.slice(1);
		if (!cibles.length) throw new ShellError("systemd-analyze verify : quelle unité ? Exemple : systemd-analyze verify /etc/systemd/system/apache2.service.d/override.conf", 1);
		var erreurs = [];
		cibles.forEach(function(c){
			var u = nomUniteComplet(nomDe(c).replace(/\.d$/, ""));
			var info = uniteInfo(h, u);
			if (!info.existe) erreurs.push("Unit " + u + " not found.");
			var connues = {};
			CONTROLES_SECURITE.forEach(function(x){ x.nom.replace(/=.*$/, "").split("/").forEach(function(n){ connues[n] = true; }); });
			["Type", "ExecStart", "ExecStartPre", "ExecStartPost", "ExecReload", "ExecStop", "Restart", "RestartSec", "Environment", "EnvironmentFile", "PIDFile", "KillMode", "TimeoutStartSec",
				"TimeoutStopSec", "RemainAfterExit", "WorkingDirectory", "Group", "LimitNOFILE", "ReadWritePaths", "ReadOnlyPaths", "InaccessiblePaths", "StateDirectory", "LogsDirectory",
				"RuntimeDirectory", "CacheDirectory", "ConfigurationDirectory", "StandardOutput", "StandardError", "SyslogIdentifier", "Nice", "OOMScoreAdjust", "DevicePolicy",
				"IPAddressAllow", "SystemCallErrorNumber", "Sockets", "ExecStartPre", "TasksMax", "MemoryMax", "CPUQuota", "PrivateIPC", "ProtectHostname", "RemoveIPC", "Slice"].forEach(function(n){ connues[n] = true; });
			Object.keys(info.directives.Service || {}).forEach(function(k){ if (!connues[k]) erreurs.push((info.fichiers.dropins.length ? info.fichiers.dropins[info.fichiers.dropins.length - 1].chemin : info.chemin) + ":" + 1 + ": Unknown key name '" + k + "' in section 'Service', ignoring."); });
		});
		erreurs.forEach(function(e){ io.err(e); });
		if (erreurs.some(function(e){ return /not found/.test(e); })) io.code = 1;
		return "";
	}
	if (action !== "security") throw new ShellError("Unknown command verb '" + action + "'." + astuce(io, "Ici : systemd-analyze security (la note de chaque service), systemd-analyze security NOM, systemd-analyze verify UNITÉ"), 1);
	var demandees = mots.slice(1);
	if (!demandees.length){
		var unites = unitesHote(h).filter(function(u){ return /\.service$/.test(u) && uniteInfo(h, u).existe && !uniteInfo(h, u).masque; });
		var liste = unites.map(function(u){ var e = expositionUnite(h, u); return { unite: u, exposition: e.exposition, predicat: e.predicat, texte: e.texte, emoji: e.emoji }; });
		var largeur = Math.max(36, Math.max.apply(null, liste.map(function(x){ return x.unite.length + 1; }).concat([0])));
		var lignes = [completerDroite("UNIT", largeur) + " EXPOSURE PREDICATE HAPPY"];
		liste.forEach(function(x){
			var predicat = completerDroite(x.predicat, 9);
			if (io.tty) predicat = (x.exposition >= 7.5 ? (x.exposition >= 9 ? C.rouge(predicat) : C.jaune(predicat)) : (x.exposition < 5 ? C.vert(predicat) : predicat));
			lignes.push(completerDroite(x.unite, largeur) + " " + completerGauche(x.texte, 8) + " " + predicat + " " + x.emoji);
		});
		GameEvents.fire({ type: "systemdSecurity", unite: null, exposition: null, predicat: null, hote: h, liste: liste.map(function(x){ return { unite: x.unite, exposition: x.exposition, predicat: x.predicat }; }) });
		if (io.tty) lignes.push(C.gris("(0 : parfaitement isolé ; 10 : le service peut tout faire sur la machine. systemd-analyze security NOM détaille chaque protection.)"));
		return lignes.join("\n");
	}
	var sorties = [];
	for (var k = 0; k < demandees.length; k++){
		var info = uniteInfo(h, demandees[k]);
		if (!info.existe){
			io.code = 1;
			throw new ShellError("Failed to get unit file state for " + info.unite + ": No such file or directory\nFailed to analyze security of " + info.unite + ": Unit " + info.unite + " not found.", 1);
		}
		var e = expositionUnite(h, info.unite);
		var tri = e.controles.slice().sort(function(a, b){ return b.poids * b.mauvais - a.poids * a.mauvais || b.poids - a.poids || (a.nom < b.nom ? -1 : 1); });
		var bloc = ["  " + completerDroite("NAME", 52) + " " + completerDroite("DESCRIPTION", 80) + " EXPOSURE"];
		tri.forEach(function(c){
			var marque = c.mauvais > 0 ? (io.tty ? C.rouge("✗") : "✗") : (io.tty ? C.vert("✓") : "✓");
			bloc.push(marque + " " + completerDroite(c.nom, 52) + " " + completerDroite(c.description, 80) + (c.mauvais > 0 ? " " + completerGauche(c.part.toFixed(1), 8) : "").replace(/\s+$/, ""));
		});
		bloc.push("", "→ Overall exposure level for " + info.unite + ": " + e.texte + " " + e.predicat + " " + e.emoji);
		if (io.tty && changeSurDisque(h, info.unite)) bloc.push(C.jaune("(Les fichiers de " + info.unite + " ont changé sur le disque, mais systemd ne les a pas relus : sudo systemctl daemon-reload, puis relance la note.)"));
		else if (io.tty) bloc.push(C.gris("(Chaque ✗ est une porte que le service garde ouverte. Une protection s'ajoute dans un drop-in : sudo systemctl edit " + info.unite.replace(/\.service$/, "") + ", sous [Service].)"));
		GameEvents.fire({ type: "systemdSecurity", unite: info.unite, exposition: e.exposition, predicat: e.predicat, hote: h, liste: [{ unite: info.unite, exposition: e.exposition, predicat: e.predicat }] });
		sorties.push(bloc.join("\n"));
	}
	return sorties.join("\n\n");
};

/* ================================================================== */
/* systemctl : mask, edit, cat, daemon-reload, les états, et ssh       */
/* ================================================================== */

function puceUnite(info, tty){
	if (info.echec) return tty ? C.rouge("×") : "×";
	if (info.actif && !info.masque) return tty ? C.vert("●") : "●";
	return "○";
}
function sousEtatTexte(info){
	if (info.echec) return "failed";
	if (!info.actif) return "dead";
	return { socket: "listening", target: "active", timer: "waiting", path: "waiting" }[info.type] || (info.directives.Service && derniere(info.directives, "Service", "Type") === "oneshot" ? "exited" : "running");
}
function statutUnite(h, info, io){
	if (!info.existe && !info.masque){ io.code = 4; throw new ShellError("Unit " + info.unite + " could not be found.", 4); }
	var lignes = [];
	if (info.masque){
		lignes.push("○ " + info.unite);
		lignes.push("     Loaded: masked (Reason: Unit " + info.unite + " is masked.)");
		lignes.push("     Active: " + (info.actif ? "active (" + sousEtatTexte(info) + ")" : "inactive (dead)"));
		io.code = info.actif ? 0 : 3;
		return lignes.join("\n");
	}
	lignes.push(puceUnite(info, io.tty) + " " + info.unite + " - " + info.description);
	lignes.push("     Loaded: loaded (" + (info.chemin || "/lib/systemd/system/" + info.unite) + "; " + (info.etatFichier || "static") + "; preset: enabled)");
	if (info.fichiers.dropins.length){
		var parDossier = {};
		info.fichiers.dropins.forEach(function(x){ var d = dossierDe(x.chemin); (parDossier[d] = parDossier[d] || []).push(x.nom); });
		Object.keys(parDossier).forEach(function(d, k){
			lignes.push((k === 0 ? "    Drop-In: " : "             ") + d);
			lignes.push("             └─" + parDossier[d].join(", "));
		});
	}
	var actif = info.echec ? (io.tty ? C.rouge("failed") : "failed") + " (Result: exit-code)" :
		(info.actif ? (io.tty ? C.vert("active (" + sousEtatTexte(info) + ")") : "active (" + sousEtatTexte(info) + ")") : "inactive (dead)");
	lignes.push("     Active: " + actif);
	var e = ECOUTES_BASTION[h] && ECOUTES_BASTION[h][info.unite];
	if (info.type === "socket" && e) e.forEach(function(x, k){ lignes.push((k === 0 ? "     Listen: " : "             ") + (x.adresse === "0.0.0.0" ? "0.0.0.0" : "[::]") + ":" + x.port + " (" + (x.proto === "udp" ? "Datagram" : "Stream") + ")"); });
	var doc = derniere(info.directives, "Unit", "Documentation");
	if (doc) lignes.push("       Docs: " + doc);
	if (info.actif && info.service && info.service.pid) lignes.push("   Main PID: " + info.service.pid + " (" + info.service.procNom + ")");
	var exec = derniere(info.directives, "Service", "ExecStart");
	if (info.actif && exec && info.service && info.service.pid){
		lignes.push("     CGroup: /system.slice/" + info.unite, "             └─" + info.service.pid + " " + exec.replace(/^[-@+!]+/, ""));
	}
	var echecSsh = etatBastion().sshEchec[h];
	if (/^sshd?\.service$/.test(info.unite) && echecSsh){
		lignes.push("");
		echecSsh.erreurs.forEach(function(m){ lignes.push(h + " sshd[" + (info.service && info.service.pid || 600) + "]: " + m); });
		lignes.push(h + " systemd[1]: " + info.unite + ": Control process exited, code=exited, status=255/EXCEPTION");
		lignes.push(h + " systemd[1]: " + (echecSsh.action === "reload" ? "Reload failed for " + info.unite + " - " + info.description + "." : info.unite + ": Failed with result 'exit-code'."));
	}
	if (changeSurDisque(h, info.unite)) lignes.push("", (io.tty ? C.jaune("Warning:") : "Warning:") + " The unit file, source configuration file or drop-ins of " + info.unite + " changed on disk. Run 'systemctl daemon-reload' to reload units.");
	io.code = info.actif ? 0 : 3;
	return lignes.join("\n");
}
function exigerRootSystemctl(io, action, unite){
	if (!io.sudo) throw new ShellError("Failed to " + action + " " + unite + ": Access denied" + astuce(io, "Gérer les services est réservé à root : sudo systemctl " + action + " " + unite.replace(/\.service$/, "")), 1);
}
function texteInstallation(info){
	var d = info.directives.Install || {}, cibles = (d.WantedBy || []).concat(d.RequiredBy || []);
	if (!cibles.length) cibles = [info.type === "socket" ? "sockets.target" : (info.type === "timer" ? "timers.target" : "multi-user.target")];
	return cibles.join(" ").split(/\s+/).filter(Boolean);
}
var MESSAGE_SANS_INSTALL = "The unit files have no installation config (WantedBy=, RequiredBy=, Also=,\nAlias= settings in the [Install] section, and DefaultInstance= for template\nunits). This means they are not meant to be enabled or disabled using systemctl.\n \nPossible reasons for having this kind of units are:\n• A unit may be statically enabled by being symlinked from another unit's\n  .wants/ or .requires/ directory.\n• A unit's purpose may be to act as a helper for some other unit which has\n  a requirement dependency on it.\n• A unit may be started when needed via activation (socket, path, timer,\n  D-Bus, udev, scripted systemctl call, ...).\n• In case of template units, the unit is meant to be enabled with some\n  instance name specified.";

/* Démarre (ou relance) une unité, en passant par les contrôles : sshd -t pour ssh, ceux des autres fichiers. */
function demarrerUnite(h, info, action, io){
	if (info.masque) throw new ShellError("Failed to " + action + " " + info.unite + ": Unit " + info.unite + " is masked." + astuce(io, "Une unité masquée ne démarre plus, ni à la main ni par dépendance. sudo systemctl unmask " + info.unite + " la libère."), 1);
	var ssh = /^sshd?\.service$/.test(info.unite) && !!fichierHote(h, "/etc/ssh/sshd_config");
	var refus = null, erreursSsh = null;
	if (ssh){
		var v = verifierSshd(h);
		if (!v.ok){ refus = "ssh"; erreursSsh = v.erreurs; }
	}
	if (!refus){
		for (var k = 0; k < CONTROLES_AVANT_DEMARRAGE.length && !refus; k++){
			var r = CONTROLES_AVANT_DEMARRAGE[k](h, info.unite, action);
			if (r) refus = r;
		}
	}
	var job = (action === "reload" ? "Job for " + info.unite + " failed because the control process exited with error code." : "Job for " + info.unite + " failed because the control process exited with error code.") +
		"\nSee \"systemctl status " + info.unite + "\" and \"journalctl -xeu " + info.unite + "\" for details.";
	if (refus){
		if (ssh){
			etatBastion().sshEchec[h] = { action: action, erreurs: erreursSsh.slice() };
			GameEvents.fire({ type: "sshReload", action: action, ok: false, erreurs: erreursSsh.slice(), hote: h });
		}
		if (action === "reload"){
			throw new ShellError(job + astuce(io, ssh ? "sshd -t a refusé la nouvelle configuration : sshd garde l'ancienne et continue de tourner. Corrige, vérifie avec sudo sshd -t, puis recharge." : "Le service refuse sa nouvelle configuration et garde l'ancienne."), 1);
		}
		marquerEchec(h, info);
		throw new ShellError(job + astuce(io, ssh ? "sshd -t a refusé la configuration : le service est maintenant ARRÊTÉ (failed). Ta session reste ouverte, mais plus personne ne peut se connecter. Corrige, sudo sshd -t, puis sudo systemctl start ssh." :
			"Le service n'a pas pu démarrer : il est arrêté (failed)."), 1);
	}
	if (action === "reload" && !info.actif){
		throw new ShellError("Job for " + info.unite + " invalid." + astuce(io, "On ne recharge qu'un service qui tourne : sudo systemctl start " + info.unite.replace(/\.service$/, "")), 1);
	}
	if (ssh){
		appliquerConfigSsh(h);
		GameEvents.fire({ type: "sshReload", action: action, ok: true, erreurs: [], hote: h });
	}
	if (action === "reload") return;
	if (action === "restart" && info.service) arreterService(h, info.cle);
	changerEtatUnite(h, info, { actif: true });
}

var SYSTEMCTL_AVANT_BASTION = Shell.sorts.systemctl;
Shell.sorts.systemctl = function(args, io){
	var mots = args.filter(function(a){ return a.charAt(0) !== "-"; });
	var options = args.filter(function(a){ return a.charAt(0) === "-"; });
	var action = mots[0] || "list-units", h = Shell.hote();
	// Les timers restent l'affaire de SortsArcanes.js.
	if (action === "list-timers" || mots.slice(1).some(function(m){ return /\.timer$/.test(m); })) return SYSTEMCTL_AVANT_BASTION.apply(this, arguments);
	var gere = hoteGere(h);
	var maintenant = options.indexOf("--now") > -1;
	var opt = function(nom){ var o = options.filter(function(x){ return x.indexOf(nom + "=") === 0; })[0]; return o ? o.substring(nom.length + 1).split(",") : null; };
	var toutes = options.indexOf("--all") > -1 || options.indexOf("-a") > -1;

	if (action === "daemon-reload"){
		if (!io.sudo) throw new ShellError("Failed to reload daemon: Access denied" + astuce(io, "sudo systemctl daemon-reload"), 1);
		if (racineHote(h)) rechargerSystemd(h);
		GameEvents.fire({ type: "daemonReload", hote: h });
		GameEvents.fire({ type: "systemctl", action: "daemon-reload", host: h });
		return "";
	}
	if (action === "mask" || action === "unmask"){
		if (mots.length < 2) throw new ShellError("Too few arguments.", 1);
		var sorties = [];
		mots.slice(1).forEach(function(n){
			var unite = nomUniteComplet(n), info = uniteInfo(h, unite);
			unite = info.unite;
			if (!io.sudo) throw new ShellError("Failed to " + action + " unit: Access denied" + astuce(io, "sudo systemctl " + action + " " + unite), 1);
			var chemin = "/etc/systemd/system/" + unite;
			if (action === "mask"){
				var existant = fichierHote(h, chemin);
				if (existant && !existant.lien) throw new ShellError("Failed to mask unit: File " + chemin + " already exists." + astuce(io, "Une vraie unité est posée dans /etc/systemd/system : systemctl ne l'écrase pas. Déplace-la d'abord."), 1);
				if (!info.masque){
					if (racineHote(h)) ecrireFichierHote(h, chemin, "", { lien: "/dev/null", mode: "rwxrwxrwx" });
					else { var m = sousEtat("masques", h); m[unite] = true; }
					sorties.push("Created symlink " + chemin + " → /dev/null.");
				}
				if (maintenant && info.actif) changerEtatUnite(h, info, { actif: false });
				GameEvents.fire({ type: "mask", unite: unite, hote: h, now: maintenant });
			} else {
				var lien = fichierHote(h, chemin);
				if (lien && lien.lien === "/dev/null"){ supprimerFichierHote(h, chemin); sorties.push("Removed \"" + chemin + "\"."); }
				var masques = etatBastion().masques[h];
				if (masques && masques[unite]){ delete masques[unite]; if (!lien) sorties.push("Removed \"" + chemin + "\"."); }
				GameEvents.fire({ type: "unmask", unite: unite, hote: h });
			}
			GameEvents.fire({ type: "systemctl", action: action, host: h, service: unite.replace(/\.service$/, ""), now: maintenant });
		});
		if (racineHote(h)) rechargerSystemdSiDejaCharge(h);
		if (io.tty && action === "mask") sorties.push(C.gris("(Masquée : un lien vers /dev/null remplace l'unité. Elle ne peut plus démarrer, ni à la main ni par dépendance." + (maintenant ? "" : " Elle tourne encore si elle tournait : --now l'arrête aussi.") + ")"));
		return sorties.join("\n");
	}
	if (action === "cat"){
		if (mots.length < 2) throw new ShellError("Too few arguments.", 1);
		var blocs = [];
		mots.slice(1).forEach(function(n){
			var info = uniteInfo(h, n);
			if (info.masque){ io.err("Unit " + info.unite + " is masked."); io.code = 1; return; }
			if (!info.existe){ io.err("No files found for " + info.unite + "."); io.code = 1; return; }
			var f = info.fichiers;
			var texte = f.principal ? "# " + f.principal.chemin + "\n" + String(f.principal.texte).replace(/\n$/, "") :
				"# /lib/systemd/system/" + info.unite + "\n[Unit]\nDescription=" + info.description + "\n\n[Service]\nExecStart=" + (info.service && info.service.execStart ? info.service.execStart : "/usr/sbin/" + info.unite.replace(/\.service$/, "")) + "\n\n[Install]\nWantedBy=multi-user.target";
			f.dropins.forEach(function(x){ texte += "\n\n# " + x.chemin + "\n" + String(x.texte).replace(/\n$/, ""); });
			blocs.push(texte);
		});
		return blocs.join("\n\n");
	}
	if (action === "edit") return systemctlEdit(h, mots, options, io);
	if (action === "list-sockets"){
		var lignesS = [], unitesS = Object.keys(ECOUTES_BASTION[h] || {}).filter(function(u){ return /\.socket$/.test(u); });
		unitesS.forEach(function(u){
			var info = uniteInfo(h, u);
			if (!info.existe || (!info.actif && !toutes)) return;
			ECOUTES_BASTION[h][u].forEach(function(x){ lignesS.push([(x.adresse === "0.0.0.0" ? "0.0.0.0" : "[::]") + ":" + x.port, u, u.replace(/\.socket$/, "@.service")]); });
		});
		var l1 = Math.max(6, Math.max.apply(null, lignesS.map(function(x){ return x[0].length; }).concat([0]))), l2 = Math.max(4, Math.max.apply(null, lignesS.map(function(x){ return x[1].length; }).concat([0])));
		return [completerDroite("LISTEN", l1) + " " + completerDroite("UNIT", l2) + " ACTIVATES"].concat(lignesS.map(function(x){ return completerDroite(x[0], l1) + " " + completerDroite(x[1], l2) + " " + x[2]; }),
			["", lignesS.length + " sockets listed.", "Pass --all to see loaded but inactive sockets, too."]).join("\n");
	}
	if (!gere){
		// Une machine des chapitres précédents : on ne change rien, sauf ce que le masque interdit.
		if (["start", "restart", "enable", "reload"].indexOf(action) > -1 && mots[1]){
			var masques2 = etatBastion().masques[h] || {}, u2 = nomUniteComplet(mots[1]);
			if (masques2[u2]){
				if (!io.sudo) exigerRootSystemctl(io, action, u2);
				if (action === "enable") throw new ShellError("Failed to enable unit: Unit file /etc/systemd/system/" + u2 + " is masked.", 1);
				throw new ShellError("Failed to " + action + " " + u2 + ": Unit " + u2 + " is masked.", 1);
			}
		}
		if (action === "is-enabled" && mots[1] && (etatBastion().masques[h] || {})[nomUniteComplet(mots[1])]){ io.code = 1; return "masked"; }
		return SYSTEMCTL_AVANT_BASTION.apply(this, arguments);
	}
	return systemctlGere(h, action, mots, options, io, toutes, maintenant, opt);
};
/* Un mask ou un unmask recharge systemd tout seul : si un daemon-reload avait déjà eu lieu, on le refait. */
function rechargerSystemdSiDejaCharge(h){ if (etatBastion().systemdCharge[h]) rechargerSystemd(h); }

function systemctlGere(h, action, mots, options, io, toutes, maintenant, opt){
	var unitesDemandees = mots.slice(1);
	if (action === "list-units" || action === "list-unit-files"){
		var types = opt("--type") || opt("-t"), etats = opt("--state");
		var echecsSeuls = options.indexOf("--failed") > -1;
		var motif = unitesDemandees[0] ? motifVersRegExp(unitesDemandees[0]) : null;
		var liste = unitesHote(h).map(function(u){ return uniteInfo(h, u); }).filter(function(i){
			if (!i.existe && !i.masque) return false;
			if (types && types.indexOf(i.type) === -1) return false;
			if (motif && !motif.test(i.unite)) return false;
			return true;
		});
		if (action === "list-unit-files"){
			liste = liste.filter(function(i){ return !i.standard || i.masque; });
			if (etats) liste = liste.filter(function(i){ return etats.indexOf(i.etatFichier) > -1; });
			var l = Math.max(9, Math.max.apply(null, liste.map(function(i){ return i.unite.length; }).concat([0])));
			var lignesF = [completerDroite("UNIT FILE", l) + " " + completerDroite("STATE", 15) + " PRESET"];
			liste.forEach(function(i){ lignesF.push(completerDroite(i.unite, l) + " " + completerDroite(i.etatFichier, 15) + " " + (i.etatFichier === "static" || i.etatFichier === "masked" ? "-" : "enabled")); });
			lignesF.push("", liste.length + " unit files listed.");
			GameEvents.fire({ type: "systemctl", action: action, host: h, etats: etats });
			return lignesF.join("\n");
		}
		liste = liste.filter(function(i){
			if (echecsSeuls) return i.echec;
			if (etats) return etats.some(function(e){ return e === sousEtatTexte(i) || e === (i.echec ? "failed" : (i.actif ? "active" : "inactive")) || (e === "masked" && i.masque); });
			return toutes || i.actif || i.echec;
		});
		var l2 = Math.max(4, Math.max.apply(null, liste.map(function(i){ return i.unite.length; }).concat([0])));
		var lignes = ["  " + completerDroite("UNIT", l2) + " LOAD   ACTIVE   SUB       DESCRIPTION"];
		liste.forEach(function(i){
			var actif = i.echec ? "failed" : (i.actif ? "active" : "inactive");
			lignes.push((i.echec ? (io.tty ? C.rouge("●") : "●") + " " : "  ") + completerDroite(i.unite, l2) + " " + completerDroite(i.masque ? "masked" : "loaded", 6) + " " + completerDroite(actif, 8) + " " + completerDroite(sousEtatTexte(i), 9) + " " + i.description);
		});
		lignes.push("", "LOAD   = Reflects whether the unit definition was properly loaded.", "ACTIVE = The high-level unit activation state, i.e. generalization of SUB.",
			"SUB    = The low-level unit activation state, values depend on unit type.", liste.length + " loaded units listed." + (toutes ? "" : " Pass --all to see loaded but inactive units, too."),
			"To show all installed unit files use 'systemctl list-unit-files'.");
		GameEvents.fire({ type: "systemctl", action: action, host: h, n: liste.length });
		return lignes.join("\n");
	}
	if (!unitesDemandees.length){
		if (action === "status") return systemctlGere(h, "list-units", ["list-units"], options, io, toutes, maintenant, opt);
		throw new ShellError("Too few arguments.", 1);
	}
	if (action === "is-active" || action === "is-enabled" || action === "is-failed"){
		var reponses = [], code = 0;
		unitesDemandees.forEach(function(n){
			var i = uniteInfo(h, n);
			if (action === "is-active"){ var t = !i.existe && !i.masque ? "inactive" : (i.echec ? "failed" : (i.actif ? "active" : "inactive")); if (t !== "active") code = 3; reponses.push(t); }
			if (action === "is-failed"){ reponses.push(i.echec ? "failed" : (i.actif ? "active" : "inactive")); if (!i.echec) code = 1; }
			if (action === "is-enabled"){
				if (!i.existe && !i.masque){ io.err("Failed to get unit file state for " + i.unite + ": No such file or directory"); code = 1; return; }
				reponses.push(i.etatFichier);
				if (i.etatFichier !== "enabled" && i.etatFichier !== "static") code = 1;
			}
		});
		io.code = code;
		return reponses.join("\n");
	}
	if (action === "status"){
		var blocs = [];
		unitesDemandees.forEach(function(n){
			var i = uniteInfo(h, n);
			GameEvents.fire({ type: "systemctl", action: "status", host: h, service: i.unite.replace(/\.service$/, "") });
			blocs.push(statutUnite(h, i, io));
		});
		return blocs.join("\n\n");
	}
	var actions = ["start", "stop", "restart", "reload", "reload-or-restart", "try-restart", "try-reload-or-restart", "enable", "disable", "kill", "reenable"];
	if (actions.indexOf(action) === -1) throw new ShellError("Unknown command verb '" + action + "'." + astuce(io, "Ici : status, start, stop, restart, reload, enable, disable (--now), mask, unmask, is-active, is-enabled, cat, edit, daemon-reload, list-units, list-unit-files, list-sockets"), 1);
	var sortie = [];
	unitesDemandees.forEach(function(n){
		var i = uniteInfo(h, n);
		exigerRootSystemctl(io, action, i.unite);
		if (!i.existe && !i.masque){
			if (action === "enable" || action === "disable") throw new ShellError("Failed to " + action + " unit: Unit file " + i.unite + " does not exist.", 1);
			throw new ShellError("Failed to " + action + " " + i.unite + ": Unit " + i.unite + " not found.", 5);
		}
		if (/^sshd?\.service$/.test(i.unite) && (action === "stop" || (action === "disable" && maintenant)) && Shell.pile_ssh.length && racineDe(current_room) && racineDe(current_room).racineHote === h){
			io.err(C.gris("(Tu viens d'arrêter sshd sur la machine où tu es connecté : ta session reste ouverte, mais plus personne d'autre ne peut entrer. sudo systemctl start ssh le relance.)"));
		}
		if (action === "start"){ if (!i.actif || i.echec) demarrerUnite(h, i, "start", io); }
		else if (action === "restart" || action === "reload-or-restart" || action === "try-restart" || action === "try-reload-or-restart"){
			if (action.indexOf("try") === 0 && !i.actif) return;
			demarrerUnite(h, i, action === "reload-or-restart" || action === "try-reload-or-restart" ? (i.actif ? "reload" : "start") : "restart", io);
		}
		else if (action === "reload") demarrerUnite(h, i, "reload", io);
		else if (action === "stop" || action === "kill") changerEtatUnite(h, i, { actif: false });
		else if (action === "enable" || action === "reenable"){
			if (i.masque) throw new ShellError("Failed to enable unit: Unit file /etc/systemd/system/" + i.unite + " is masked.", 1);
			if (i.etatFichier === "static" && i.fichiers.principal){ sortie.push(MESSAGE_SANS_INSTALL); return; }
			if (!i.auto) texteInstallation(i).forEach(function(c){ sortie.push("Created symlink /etc/systemd/system/" + c + ".wants/" + i.unite + " → " + (i.chemin || "/lib/systemd/system/" + i.unite) + "."); });
			changerEtatUnite(h, i, { auto: true });
			if (maintenant && !i.actif) demarrerUnite(h, uniteInfo(h, i.unite), "start", io);
		}
		else if (action === "disable"){
			if (i.etatFichier === "static" && i.fichiers.principal && !i.service){ sortie.push(MESSAGE_SANS_INSTALL); return; }
			if (i.auto) texteInstallation(i).forEach(function(c){ sortie.push("Removed \"/etc/systemd/system/" + c + ".wants/" + i.unite + "\"."); });
			changerEtatUnite(h, i, { auto: false });
			if (maintenant && i.actif) changerEtatUnite(h, i, { actif: false });
		}
		GameEvents.fire({ type: "systemctl", action: action, host: h, service: i.cle && i.cle.indexOf(".") === -1 ? i.cle : i.unite.replace(/\.service$/, ""), now: maintenant, unite: i.unite });
		if (io.tty && action === "stop" && i.auto) sortie.push(C.gris("(Arrêté, mais toujours activé : il redémarrera au prochain démarrage. disable --now fait les deux.)"));
		if (io.tty && action === "start" && !i.auto && i.etatFichier !== "static") sortie.push(C.gris("(Démarré, mais pas activé : au prochain démarrage, il restera arrêté. enable --now fait les deux.)"));
	});
	return sortie.join("\n");
}

/* systemctl edit NOM : un drop-in /etc/systemd/system/NOM.service.d/override.conf, dans l'éditeur du jeu. */
function systemctlEdit(h, mots, options, io){
	if (mots.length < 2) throw new ShellError("Too few arguments.", 1);
	var complet = options.indexOf("--full") > -1;
	var info = uniteInfo(h, mots[1]);
	if (!io.sudo) throw new ShellError("Failed to create directories for \"/etc/systemd/system/" + info.unite + ".d/override.conf\": Permission denied" + astuce(io, "sudo systemctl edit " + info.unite.replace(/\.service$/, "")), 1);
	if (!info.existe || info.masque){
		if (info.masque) throw new ShellError("Unit " + info.unite + " is masked.", 1);
		throw new ShellError("No files found for " + info.unite + ".\nRun 'systemctl edit --force " + info.unite + "' to create a new unit.", 1);
	}
	if (!racineHote(h)) throw new ShellError("systemctl edit : cette machine n'a pas de /etc/systemd/system dans ce monde.", 1);
	if (!io.tty) throw new ShellError("systemctl edit : il faut un écran pour l'éditeur, pas de tuyau.", 1);
	if (!term.editer) throw new ShellError("systemctl edit : l'éditeur n'est pas disponible ici.", 1);
	var chemin = complet ? "/etc/systemd/system/" + info.unite : "/etc/systemd/system/" + info.unite + ".d/override.conf";
	var actuel = texteHote(h, chemin);
	var base = info.fichiers.principal && info.fichiers.principal.texte !== undefined ? String(info.fichiers.principal.texte) : "[Unit]\nDescription=" + info.description + "\n\n[Service]\nExecStart=" + (info.service && info.service.execStart || "/usr/sbin/" + info.unite.replace(/\.service$/, ""));
	var DEBUT = "### Anything between here and the comment below will become the new contents of the file";
	var FIN = "### Lines below this comment will be discarded";
	var modele = complet ? (actuel !== null ? actuel : base) :
		"### Editing " + chemin + "\n" + DEBUT + "\n\n" + (actuel !== null ? actuel.replace(/\n$/, "") + "\n" : "") + "\n" + FIN + "\n\n### " + (info.chemin || "/lib/systemd/system/" + info.unite) + "\n" +
		lignesDe(base).map(function(l){ return l === "" ? "#" : "# " + l; }).join("\n") + "\n";
	var editeur = state.knows("vim") && (state.env.EDITOR === "vim" || state.env.VISUAL === "vim" || state.env.SYSTEMD_EDITOR === "vim") ? "vim" : "nano";
	var titre = complet ? dossierDe(chemin) + "/." + nomDe(chemin) + "a1b2c3d4e5f6a7b8" : dossierDe(chemin) + "/.#override.conf" + "a1b2c3d4e5f6a7b8";
	var enregistre = null;
	term.editer({ titre: titre, texte: modele, mode: editeur, quitter: function(){
		if (enregistre === null){ term.echo(C.gris("(Rien d'enregistré : " + chemin + " n'a pas changé.)")); Shell.fin(); return; }
		var contenu;
		if (complet) contenu = enregistre;
		else {
			var lignes = lignesDe(enregistre), dedans = false, garde = [];
			lignes.forEach(function(l){
				if (l === DEBUT || l.indexOf("### Anything between here") === 0){ dedans = true; return; }
				if (l === FIN || l.indexOf("### Lines below this comment") === 0 || l.indexOf("### Edits below this comment") === 0){ dedans = false; return; }
				if (dedans) garde.push(l);
			});
			contenu = garde.join("\n").replace(/^\s+|\s+$/g, "");
			contenu = contenu === "" ? "" : contenu + "\n";
		}
		if (contenu.trim() === ""){
			term.echo("Editing \"" + chemin + "\" canceled: temporary file is empty.");
			Shell.fin();
			return;
		}
		ecrireFichierHote(h, chemin, contenu, { mode: "rw-r--r--" });
		rechargerSystemd(h);
		GameEvents.fire({ type: "systemctlEdit", unite: info.unite, hote: h, chemin: chemin, texte: contenu });
		GameEvents.fire({ type: "daemonReload", hote: h, parEdit: true });
		term.echo(C.gris("(Enregistré dans " + chemin + ", et systemd l'a relu (daemon-reload). Le service, lui, tourne encore avec l'ancienne configuration : sudo systemctl restart " + info.unite.replace(/\.service$/, "") + ".)"));
		Shell.fin();
	} }, function(nouveau){ if (nouveau !== null) enregistre = nouveau; });
	return "";
}

/* ================================================================== */
/* Les paquets : un registre par machine, que le monde remplit         */
/* ================================================================== */

var PAQUETS_DECLARES = {};
/*
 * Déclare un paquet Debian sur une machine. def : version (« 1:9.2p1-2+deb12u3 »), disponible (une version plus
 * récente dans le dépôt, sinon la même), architecture (amd64), description, section, priorite, taille (en ko),
 * fichiers : { chemin: texte d'origine } (posés sur la machine s'ils manquent, sauf poser: false),
 * conffiles : les fichiers de configuration (par défaut : ceux sous /etc), services : les unités du paquet,
 * depot (« stable », « stable-security »), installe (faux : présent dans le dépôt mais pas installé).
 */
function declarerPaquet(hote, nom, def){
	def = def || {};
	PAQUETS_DECLARES[hote] = PAQUETS_DECLARES[hote] || {};
	var fichiers = def.fichiers || {};
	var p = {
		nom: nom, version: def.version || "1.0-1", disponible: def.disponible || def.version || "1.0-1", architecture: def.architecture || "amd64",
		description: def.description || nom, section: def.section || "admin", priorite: def.priorite || "optional", taille: def.taille || 100,
		fichiers: {}, conffiles: def.conffiles || Object.keys(fichiers).filter(function(c){ return c.indexOf("/etc/") === 0; }),
		services: def.services || [], depot: def.depot || (def.disponible && def.disponible !== def.version ? "stable-security" : "stable"),
		installe: def.installe !== false, depends: def.depends || null, mainteneur: def.mainteneur || "Debian Developers <debian-devel@lists.debian.org>"
	};
	Object.keys(fichiers).forEach(function(c){ p.fichiers[cheminNormal(c)] = String(fichiers[c]); });
	p.conffiles = p.conffiles.map(cheminNormal);
	PAQUETS_DECLARES[hote][nom] = p;
	if (p.installe && def.poser !== false && racineHote(hote)){
		Object.keys(p.fichiers).forEach(function(c){
			if (!noeudHote(hote, c)) ecrireFichierHote(hote, c, p.fichiers[c], { evenement: false, mode: /\/s?bin\//.test(c) ? "rwxr-xr-x" : "rw-r--r--" });
		});
	}
	return p;
}
function paquetsHote(hote){ return PAQUETS_DECLARES[hote] || {}; }
/* L'état d'un paquet : { etat: "ii" (installé) | "rc" (retiré, configuration gardée) | "un" (absent), version }. */
function etatPaquet(hote, nom){
	var p = paquetsHote(hote)[nom];
	if (!p) return null;
	var e = sousEtat("paquets", hote)[nom];
	return { etat: e && e.etat ? e.etat : (p.installe ? "ii" : "un"), version: e && e.version ? e.version : (p.installe ? p.version : null) };
}
function changerPaquet(hote, nom, etat, version){ sousEtat("paquets", hote)[nom] = { etat: etat, version: version }; }
function etckeeperInstalle(hote){ var e = etatPaquet(hote, "etckeeper"); return !!(e && e.etat === "ii"); }
/* Les fichiers d'un paquet qui ne sont plus ceux d'origine : { modifies: [chemins], manquants: [chemins] }. */
function fichiersModifiesPaquet(hote, nom){
	var p = paquetsHote(hote)[nom], r = { modifies: [], manquants: [] };
	if (!p) return r;
	Object.keys(p.fichiers).sort().forEach(function(c){
		var f = fichierHote(hote, c);
		if (!f) r.manquants.push(c);
		else if (f.lien || md5(f.getText()) !== md5(p.fichiers[c])) r.modifies.push(c);
	});
	return r;
}
/* Retire un paquet : ses services s'arrêtent et disparaissent, ses fichiers aussi (et sa configuration avec purge). */
function retirerPaquet(hote, nom, purge){
	var p = paquetsHote(hote)[nom], e = etatPaquet(hote, nom);
	p.services.forEach(function(u){
		var info = uniteInfo(hote, u);
		if (info.existe && info.actif) changerEtatUnite(hote, info, { actif: false });
		var r = sousEtat("retires", hote);
		r[nomUniteComplet(u)] = true;
		if (info.cle) r[info.cle] = true;
	});
	Object.keys(p.fichiers).forEach(function(c){
		if (!purge && p.conffiles.indexOf(c) > -1) return;
		supprimerFichierHote(hote, c);
	});
	changerPaquet(hote, nom, purge ? "un" : "rc", purge ? null : e.version);
}
/* Installe (ou réinstalle) un paquet : ses fichiers d'origine reviennent, sauf la configuration modifiée par l'admin. */
function poserPaquet(hote, nom, version){
	var p = paquetsHote(hote)[nom];
	Object.keys(p.fichiers).forEach(function(c){
		var f = fichierHote(hote, c);
		if (p.conffiles.indexOf(c) > -1 && f) return;
		if (!f || f.getText() !== p.fichiers[c] || f.lien) ecrireFichierHote(hote, c, p.fichiers[c], { mode: /\/s?bin\//.test(c) ? "rwxr-xr-x" : "rw-r--r--", lien: f && f.lien ? "" : undefined });
	});
	var r = sousEtat("retires", hote);
	p.services.forEach(function(u){
		delete r[nomUniteComplet(u)];
		var info = uniteInfo(hote, u);
		if (info.cle) delete r[info.cle];
	});
	changerPaquet(hote, nom, "ii", version || p.version);
}
function plusRecente(a, b){ return a !== b && [a, b].sort(comparerVersionsDebian)[1] === a; }
/* Comparer deux versions Debian (époque:amont-révision), à peu près comme dpkg --compare-versions. */
function comparerVersionsDebian(a, b){
	function decouper(v){ var m = /^(?:(\d+):)?(.*?)(?:-([^-]*))?$/.exec(v); return [parseInt(m[1] || "0", 10), m[2], m[3] || ""]; }
	function morceaux(x, y){
		var re = /(\d+)|(\D+)/g, ma = x.match(re) || [], mb = y.match(re) || [];
		for (var i = 0; i < Math.max(ma.length, mb.length); i++){
			var p = ma[i] || "", q = mb[i] || "";
			if (/^\d/.test(p) || /^\d/.test(q)){ var d = (parseInt(p || "0", 10) - parseInt(q || "0", 10)); if (d) return d; }
			else {
				var ordre = function(s, k){ var c = s.charAt(k); return c === "~" ? -1 : (c === "" ? 0 : (/[A-Za-z]/.test(c) ? c.charCodeAt(0) : c.charCodeAt(0) + 256)); };
				for (var k = 0; k < Math.max(p.length, q.length); k++){ var e = ordre(p, k) - ordre(q, k); if (e) return e; }
			}
		}
		return 0;
	}
	var x = decouper(a), y = decouper(b);
	return (x[0] - y[0]) || morceaux(x[1], y[1]) || morceaux(x[2], y[2]);
}
function aMettreAJour(hote){
	var liste = [];
	Object.keys(paquetsHote(hote)).sort().forEach(function(n){
		var p = paquetsHote(hote)[n], e = etatPaquet(hote, n);
		if (e.etat === "ii" && plusRecente(p.disponible, e.version)) liste.push(n);
	});
	return liste;
}
function tailleKo(ko){ return String(ko).replace(/\B(?=(\d{3})+(?!\d))/g, " ") + " ko"; }

/* apt et apt-get sur une machine qui a des paquets déclarés ; sinon, l'ancien apt (cowsay, tree...). */
function aptBastion(cmd){
	return function(args, io){
		var h = Shell.hote(), declares = paquetsHote(h);
		var action = args.filter(function(a){ return a.charAt(0) !== "-"; })[0];
		var noms = args.filter(function(a){ return a.charAt(0) !== "-"; }).slice(1);
		var reinstall = args.indexOf("--reinstall") > -1;
		var avertir = cmd === "apt" && !io.tty ? function(){ io.err("\nAVERTISSEMENT : apt n'a pas d'interface en ligne de commande stable. Utilisez-la avec prudence dans les scripts.\n"); } : function(){};
		var gere = Object.keys(declares).length > 0;
		var concernes = noms.some(function(n){ return declares.hasOwnProperty(n); });
		var actionsGerees = ["update", "upgrade", "full-upgrade", "dist-upgrade", "list", "show", "remove", "purge", "autoremove"];
		if (!gere || (action === "install" && !concernes && noms.length && noms.every(function(n){ return n === "-y" || Shell.paquets.hasOwnProperty(n); }))) {
			if (cmd === "apt-get" && ["install", "update", "upgrade", "remove"].indexOf(action) === -1 && action !== undefined) throw new ShellError("E: L'opération " + action + " n'est pas valable", 100);
			return APT_AVANT_BASTION.apply(this, [args, io]);
		}
		if (action === undefined) throw new ShellError(cmd === "apt" ? "apt 2.6.1 (amd64)\nUsage: apt [options] commande" + astuce(io, "apt list --upgradable, sudo apt update, sudo apt upgrade, sudo apt install PAQUET, sudo apt purge PAQUET") : "E: Aucune opération indiquée", cmd === "apt" ? 1 : 100);
		if (action !== "install" && actionsGerees.indexOf(action) === -1) throw new ShellError("E: Opération " + action + " non valable", 100);
		if (cmd === "apt-get" && (action === "list" || action === "show")) throw new ShellError("E: L'opération " + action + " n'est pas valable", 100);
		var tete = ["Lecture des listes de paquets... Fait", "Construction de l'arbre des dépendances... Fait", "Lecture des informations d'état... Fait"];
		var restants = function(){ return aMettreAJour(h).length; };
		if (action === "list"){
			avertir();
			var lignes = ["En train de lister... Fait"];
			var upgradable = args.indexOf("--upgradable") > -1, installed = args.indexOf("--installed") > -1;
			var motif = noms[0] ? motifVersRegExp(noms[0]) : null;
			Object.keys(declares).sort().forEach(function(n){
				var p = declares[n], e = etatPaquet(h, n), maj = e.etat === "ii" && plusRecente(p.disponible, e.version);
				if (motif && !motif.test(n)) return;
				if (upgradable && !maj) return;
				if (installed && e.etat !== "ii") return;
				if (upgradable) lignes.push(n + "/" + p.depot + " " + p.disponible + " " + p.architecture + " [pouvant être mis à jour depuis : " + e.version + "]");
				else lignes.push(n + "/" + p.depot + (e.etat === "ii" ? ",now " : " ") + (maj || e.etat !== "ii" ? p.disponible : e.version) + " " + p.architecture +
					(e.etat === "ii" ? (maj ? " [installé, pouvant être mis à jour vers : " + p.disponible + "]" : " [installé]") : (e.etat === "rc" ? " [configuration résiduelle]" : "")));
			});
			GameEvents.fire({ type: "apt", action: "list", paquets: [], hote: h, upgradable: upgradable });
			if (upgradable && io.tty && lignes.length > 1) lignes.push(C.gris("(Chaque ligne : un paquet dont une version plus récente attend, souvent un correctif de sécurité. sudo apt upgrade les installe.)"));
			return lignes.join("\n");
		}
		if (action === "show"){
			avertir();
			if (!noms.length) throw new ShellError("E: Aucun paquet n'a été trouvé", 100);
			return noms.map(function(n){
				var p = declares[n];
				if (!p) throw new ShellError("N: Impossible de trouver le paquet " + n + "\nE: Aucun paquet n'a été trouvé", 100);
				return ["Package: " + n, "Version: " + p.disponible, "Priority: " + p.priorite, "Section: " + p.section, "Maintainer: " + p.mainteneur, "Installed-Size: " + tailleKo(p.taille),
					"APT-Manual-Installed: " + (etatPaquet(h, n).etat === "ii" ? "yes" : "no"), "APT-Sources: http://deb.debian.org/debian bookworm/main " + p.architecture + " Packages", "Description: " + p.description].join("\n");
			}).join("\n\n");
		}
		if (!io.sudo){
			throw new ShellError("E: Impossible d'ouvrir le fichier verrou /var/lib/dpkg/lock-frontend - open (13: Permission non accordée)\n" +
				"E: Impossible d'obtenir le verrou de dpkg (/var/lib/dpkg/lock-frontend). Avez-vous les droits du superutilisateur ?" + astuce(io, "Toucher aux paquets modifie le système : sudo " + cmd + " " + args.join(" ")), 100);
		}
		avertir();
		if (action === "update"){
			var n = restants();
			GameEvents.fire({ type: "apt", action: "update", paquets: [], hote: h });
			return ["Atteint :1 http://deb.debian.org/debian bookworm InRelease", "Atteint :2 http://deb.debian.org/debian bookworm-updates InRelease",
				"Réception de :3 http://security.debian.org/debian-security bookworm-security InRelease [48,0 kB]", "48,0 ko réceptionnés en 0s (412 ko/s)"].concat(tete,
				[n ? n + " paquet" + (n > 1 ? "s peuvent" : " peut") + " être mis à jour. Exécutez « apt list --upgradable » pour les voir." : "Tous les paquets sont à jour."]).join("\n");
		}
		if (action === "upgrade" || action === "full-upgrade" || action === "dist-upgrade"){
			var liste = aMettreAJour(h).filter(function(x){ return !noms.length || noms.indexOf(x) > -1; });
			var sortie = tete.concat(["Calcul de la mise à jour... Fait"]);
			if (liste.length){
				sortie.push("Les paquets suivants seront mis à jour :", "  " + liste.join(" "));
				sortie.push(liste.length + " mis à jour, 0 nouvellement installés, 0 à enlever et 0 non mis à jour.");
				sortie.push("Il est nécessaire de prendre " + tailleKo(liste.reduce(function(s, x){ return s + Math.round(declares[x].taille / 3); }, 0)) + " dans les archives.");
				liste.forEach(function(x, k){ sortie.push("Réception de :" + (k + 1) + " http://security.debian.org/debian-security bookworm-security/main " + declares[x].architecture + " " + x + " " + declares[x].architecture + " " + declares[x].disponible); });
				sortie.push("(Lecture de la base de données... 41208 fichiers et répertoires déjà installés.)");
				liste.forEach(function(x){
					var avant = etatPaquet(h, x).version;
					sortie.push("Préparation du dépaquetage de .../" + x + "_" + declares[x].disponible.replace(/^\d+:/, "") + "_" + declares[x].architecture + ".deb ...",
						"Dépaquetage de " + x + " (" + declares[x].disponible + ") sur (" + avant + ") ...");
				});
				liste.forEach(function(x){ poserPaquet(h, x, declares[x].disponible); sortie.push("Paramétrage de " + x + " (" + declares[x].disponible + ") ..."); });
			} else sortie.push("0 mis à jour, 0 nouvellement installés, 0 à enlever et 0 non mis à jour.");
			GameEvents.fire({ type: "apt", action: "upgrade", paquets: liste.slice(), hote: h });
			return sortie.join("\n");
		}
		if (action === "autoremove"){
			return tete.concat(["0 mis à jour, 0 nouvellement installés, 0 à enlever et " + restants() + " non mis à jour."]).join("\n");
		}
		if (!noms.length) throw new ShellError(tete.join("\n") + "\nE: Aucun paquet indiqué" + astuce(io, "sudo " + cmd + " " + action + " PAQUET"), 100);
		var inconnus = noms.filter(function(x){ return !declares[x] && !(action === "install" && Shell.paquets[x]); });
		if (inconnus.length) throw new ShellError(tete.join("\n") + "\nE: Impossible de trouver le paquet " + inconnus[0], 100);
		var sortieP = tete.slice();
		if (action === "remove" || action === "purge"){
			var purge = action === "purge";
			var cibles = noms.filter(function(x){ var e = etatPaquet(h, x); return e.etat === "ii" || (purge && e.etat === "rc"); });
			noms.forEach(function(x){ if (cibles.indexOf(x) === -1) sortieP.push("Le paquet « " + x + " » n'est pas installé, et ne peut donc être supprimé"); });
			if (cibles.length){
				sortieP.push("Les paquets suivants seront ENLEVÉS :", "  " + cibles.map(function(x){ return x + (purge ? "*" : ""); }).join(" "));
			}
			sortieP.push("0 mis à jour, 0 nouvellement installés, " + cibles.length + " à enlever et " + restants() + " non mis à jour.");
			if (cibles.length){
				sortieP.push("Après cette opération, " + tailleKo(cibles.reduce(function(s, x){ return s + (etatPaquet(h, x).etat === "ii" ? declares[x].taille : 0); }, 0)) + " d'espace disque seront libérés.");
				sortieP.push("(Lecture de la base de données... 41208 fichiers et répertoires déjà installés.)");
				cibles.forEach(function(x){
					var e = etatPaquet(h, x);
					if (e.etat === "ii") sortieP.push("Suppression de " + x + " (" + e.version + ") ...");
					if (purge) sortieP.push("Purge des fichiers de configuration de " + x + " (" + e.version + ") ...");
					retirerPaquet(h, x, purge);
				});
				sortieP.push("Traitement des actions différées (« triggers ») pour man-db (2.11.2-2) ...");
			}
			GameEvents.fire({ type: "apt", action: action, paquets: cibles.slice(), hote: h });
			if (io.tty && cibles.length) sortieP.push(C.gris(purge ? "(Purgé : le programme, ses services et sa configuration ont disparu. Rien de ce qui n'est pas installé ne peut être attaqué.)" :
				"(Retiré, mais sa configuration reste sur le disque (rc dans dpkg -l) : purge l'efface aussi.)"));
			return sortieP.join("\n");
		}
		// install, install --reinstall
		var aInstaller = [], aReinstaller = [], aJour = [], deja = [];
		noms.forEach(function(x){
			if (!declares[x]){ deja.push(x); return; }
			var e = etatPaquet(h, x), p = declares[x];
			if (e.etat !== "ii") aInstaller.push(x);
			else if (plusRecente(p.disponible, e.version)) aJour.push(x);
			else if (reinstall) aReinstaller.push(x);
			else sortieP.push(x + " est déjà la version la plus récente (" + e.version + ").");
		});
		deja.forEach(function(x){ sortieP.push(x + " est déjà la version la plus récente."); state.paquets[x] = true; if (Shell.paquets[x] && Shell.paquets[x].sort) state.learn(Shell.paquets[x].sort); });
		if (aInstaller.length) sortieP.push("Les NOUVEAUX paquets suivants seront installés :", "  " + aInstaller.join(" "));
		if (aJour.length) sortieP.push("Les paquets suivants seront mis à jour :", "  " + aJour.join(" "));
		var total = aInstaller.concat(aJour, aReinstaller);
		sortieP.push(aJour.length + " mis à jour, " + aInstaller.length + " nouvellement installés, " + (aReinstaller.length ? aReinstaller.length + " réinstallés, " : "") + "0 à enlever et " + Math.max(0, restants() - aJour.length) + " non mis à jour.");
		if (total.length){
			sortieP.push("Il est nécessaire de prendre " + tailleKo(total.reduce(function(s, x){ return s + Math.round(declares[x].taille / 3); }, 0)) + " dans les archives.");
			total.forEach(function(x, k){ sortieP.push("Réception de :" + (k + 1) + " http://deb.debian.org/debian bookworm/main " + declares[x].architecture + " " + x + " " + declares[x].architecture + " " + declares[x].disponible); });
			sortieP.push("(Lecture de la base de données... 41208 fichiers et répertoires déjà installés.)");
			total.forEach(function(x){
				var p = declares[x], e = etatPaquet(h, x), v = p.disponible;
				sortieP.push("Préparation du dépaquetage de .../" + x + "_" + v.replace(/^\d+:/, "") + "_" + p.architecture + ".deb ...");
				sortieP.push(e.etat === "ii" ? "Dépaquetage de " + x + " (" + v + ") sur (" + e.version + ") ..." : "Dépaquetage de " + x + " (" + v + ") ...");
			});
			total.forEach(function(x){
				var p = declares[x], neuf = etatPaquet(h, x).etat !== "ii";
				poserPaquet(h, x, p.disponible);
				sortieP.push("Paramétrage de " + x + " (" + p.disponible + ") ...");
				if (neuf) p.services.forEach(function(u){
					var info = uniteInfo(h, u);
					if (info.existe){
						changerEtatUnite(h, info, { auto: true });
						if (!info.masque) changerEtatUnite(h, uniteInfo(h, u), { actif: true });
					}
				});
			});
		}
		GameEvents.fire({ type: "apt", action: reinstall ? "reinstall" : "install", paquets: total.slice(), hote: h });
		if (io.tty && aReinstaller.length) sortieP.push(C.gris("(Les fichiers d'origine du paquet sont revenus. La configuration (/etc) que tu as modifiée, elle, est gardée : dpkg ne l'écrase jamais sans le demander.)"));
		return sortieP.join("\n");
	};
}
var APT_AVANT_BASTION = Shell.sorts.apt;
Shell.sorts.apt = aptBastion("apt");
Shell.sorts["apt-get"] = aptBastion("apt-get");

/* dpkg -l [MOTIF], -L PAQUET, -S MOTIF, -s PAQUET, -V [PAQUET] */
Shell.sorts.dpkg = function(args, io){
	var h = Shell.hote(), declares = paquetsHote(h);
	var action = null, reste = [];
	args.forEach(function(a){
		if (/^-[lLSsV]$/.test(a)) action = a.charAt(1);
		else if (a === "--list") action = "l";
		else if (a === "--listfiles") action = "L";
		else if (a === "--search") action = "S";
		else if (a === "--status") action = "s";
		else if (a === "--verify") action = "V";
		else if (a.charAt(0) === "-") throw new ShellError("dpkg: erreur: option inconnue " + a + "\n\nUtilisez « dpkg --help » pour obtenir de l'aide à propos de l'installation et la désinstallation des paquets [*] ;", 2);
		else reste.push(a);
	});
	if (action === null) throw new ShellError("dpkg: erreur: une option d'action est nécessaire\n\nUtilisez « dpkg --help » pour obtenir de l'aide à propos de l'installation et la désinstallation des paquets [*] ;" +
		astuce(io, "dpkg -l (la liste), dpkg -L PAQUET (ses fichiers), dpkg -S FICHIER (à quel paquet il appartient), sudo dpkg -V (ce qui a changé)"), 2);
	var noms = Object.keys(declares).sort();
	if (action === "l"){
		var motifs = reste.length ? reste.map(function(m){ return motifVersRegExp(m); }) : null;
		var liste = noms.filter(function(n){ var e = etatPaquet(h, n); return motifs ? motifs.some(function(m){ return m.test(n); }) : e.etat !== "un"; });
		if (!liste.length){
			io.code = 1;
			if (reste.length) throw new ShellError("dpkg-query: aucun paquet ne correspond à " + reste.join(" "), 1);
		}
		var ln = Math.max(14, Math.max.apply(null, liste.map(function(n){ return n.length; }).concat([0])));
		var lv = Math.max(15, Math.max.apply(null, liste.map(function(n){ var e = etatPaquet(h, n); return (e.version || "<aucune>").length; }).concat([0])));
		var lignes = ["Souhait=inconnU/Installé/suppRimé/Purgé/H=à garder", "| État=Non/Installé/fichier-Config/dépaqUeté/échec-conFig/H=semi-installé/W=attend-traitement-déclenchements",
			"|/ Err?=(aucune)/besoin Réinstallation (État,Err: majuscule=mauvais)",
			"||/ " + completerDroite("Nom", ln) + " " + completerDroite("Version", lv) + " " + completerDroite("Architecture", 12) + " Description",
			"+++-" + new Array(ln + 1).join("=") + "-" + new Array(lv + 1).join("=") + "-" + new Array(13).join("=") + "-" + new Array(41).join("=")];
		liste.forEach(function(n){
			var p = declares[n], e = etatPaquet(h, n);
			lignes.push(completerDroite(e.etat === "un" ? "un" : e.etat, 2) + "  " + completerDroite(n, ln) + " " + completerDroite(e.version || "<aucune>", lv) + " " + completerDroite(e.etat === "un" ? "<aucune>" : p.architecture, 12) + " " + (e.etat === "un" ? "(aucune description n'est disponible)" : p.description));
		});
		GameEvents.fire({ type: "dpkg", action: "l", hote: h, motif: reste.join(" ") });
		return lignes.join("\n");
	}
	if (action === "L" || action === "s"){
		if (!reste.length) throw new ShellError("dpkg-query: erreur: --" + (action === "L" ? "listfiles" : "status") + " a besoin d'un nom de paquet valable mais rien n'a été indiqué", 2);
		return reste.map(function(n){
			var p = declares[n], e = p ? etatPaquet(h, n) : null;
			if (!p || e.etat === "un"){ io.code = 1; throw new ShellError("dpkg-query: le paquet « " + n + " » n'est pas installé", 1); }
			GameEvents.fire({ type: "dpkg", action: action, hote: h, motif: n });
			if (action === "L"){
				var dossiers = {};
				Object.keys(p.fichiers).forEach(function(c){ var m = morceauxChemin(c); for (var k = 1; k < m.length; k++) dossiers["/" + m.slice(0, k).join("/")] = true; });
				return ["/."].concat(Object.keys(dossiers).sort(), Object.keys(p.fichiers).sort().filter(function(c){ return e.etat === "ii" || p.conffiles.indexOf(c) > -1; })).join("\n");
			}
			return ["Package: " + n, "Status: " + (e.etat === "ii" ? "install ok installed" : "deinstall ok config-files"), "Priority: " + p.priorite, "Section: " + p.section,
				"Installed-Size: " + p.taille, "Maintainer: " + p.mainteneur, "Architecture: " + p.architecture, "Version: " + e.version,
				"Conffiles:"].concat(p.conffiles.map(function(c){ return " " + c + " " + md5(p.fichiers[c] || ""); }), ["Description: " + p.description]).join("\n");
		}).join("\n\n");
	}
	if (action === "S"){
		if (!reste.length) throw new ShellError("dpkg-query: erreur: --search a besoin d'au moins un motif de nom de fichier", 2);
		var trouves = [];
		reste.forEach(function(motif){
			var re = /[*?\[]/.test(motif) ? motifVersRegExp(motif.charAt(0) === "/" ? motif : "*" + motif + "*") : null;
			var avant = trouves.length;
			noms.forEach(function(n){
				var e = etatPaquet(h, n);
				if (e.etat === "un") return;
				Object.keys(declares[n].fichiers).sort().forEach(function(c){
					if (e.etat === "rc" && declares[n].conffiles.indexOf(c) === -1) return;
					if (re ? re.test(c) : (motif.charAt(0) === "/" ? c === cheminNormal(motif) : c.indexOf(motif) > -1)) trouves.push(n + ": " + c);
				});
			});
			if (trouves.length === avant){ io.err("dpkg-query: aucun chemin ne correspond au motif " + motif); io.code = 1; }
		});
		GameEvents.fire({ type: "dpkg", action: "S", hote: h, motif: reste.join(" ") });
		return trouves.join("\n");
	}
	// -V : « ??5?????? c /etc/ssh/sshd_config », comme dpkg --verify : seule l'empreinte MD5 est vérifiée (5).
	var aVerifier = reste.length ? reste : noms.filter(function(n){ return etatPaquet(h, n).etat === "ii"; });
	var lignesV = [];
	aVerifier.forEach(function(n){
		var p = declares[n];
		if (!p || etatPaquet(h, n).etat !== "ii"){ io.code = 1; io.err("dpkg: le paquet « " + n + " » n'est pas installé"); return; }
		var r = fichiersModifiesPaquet(h, n);
		Object.keys(p.fichiers).sort().forEach(function(c){
			var conf = p.conffiles.indexOf(c) > -1 ? "c" : " ";
			if (r.manquants.indexOf(c) > -1) lignesV.push("missing  " + " " + conf + " " + c);
			else if (r.modifies.indexOf(c) > -1) lignesV.push("??5??????" + " " + conf + " " + c);
		});
		GameEvents.fire({ type: "dpkgVerify", hote: h, paquet: n, modifies: r.modifies.slice(), manquants: r.manquants.slice() });
	});
	if (lignesV.length) io.code = 1;
	if (io.tty && lignesV.length) lignesV.push(C.gris("(5 : l'empreinte MD5 ne correspond plus à celle du paquet. c : un fichier de configuration (le modifier est normal). Un programme sans c qui a changé, c'est suspect : sudo apt install --reinstall PAQUET.)"));
	return lignesV.join("\n");
};

/* debsums : sur une machine aux paquets déclarés ; sinon, la version de la Citadelle (chapitre 3). */
var DEBSUMS_AVANT_BASTION = Shell.sorts.debsums;
Shell.sorts.debsums = function(args, io){
	var h = Shell.hote(), declares = paquetsHote(h);
	if (!Object.keys(declares).length) return DEBSUMS_AVANT_BASTION.apply(this, arguments);
	var silencieux = false, changes = false, tous = false, configSeule = false, noms = [];
	args.forEach(function(a){
		if (a === "-s" || a === "--silent") silencieux = true;
		else if (a === "-c" || a === "--changed") changes = true;
		else if (a === "-a" || a === "--all") tous = true;
		else if (a === "-e" || a === "--config") configSeule = true;
		else if (/^-[scae]+$/.test(a)){ silencieux = silencieux || a.indexOf("s") > -1; changes = changes || a.indexOf("c") > -1; tous = tous || a.indexOf("a") > -1; configSeule = configSeule || a.indexOf("e") > -1; }
		else if (a.charAt(0) === "-") throw new ShellError("Unknown option: " + a.replace(/^-+/, "") + "\nUsage: debsums [OPTIONS] [PACKAGE|DEB] ...", 1);
		else noms.push(a);
	});
	var liste = noms.length ? noms : Object.keys(declares).sort().filter(function(n){ return etatPaquet(h, n).etat === "ii"; });
	var lignes = [], erreurs = [], modifies = [], manquants = [];
	liste.forEach(function(n){
		var p = declares[n];
		if (!p || etatPaquet(h, n).etat !== "ii"){ erreurs.push("debsums: package " + n + " is not installed"); io.code = 1; return; }
		var r = fichiersModifiesPaquet(h, n);
		Object.keys(p.fichiers).sort().forEach(function(c){
			var conf = p.conffiles.indexOf(c) > -1;
			if (configSeule ? !conf : (conf && !tous)) return;
			var etat = r.manquants.indexOf(c) > -1 ? "missing" : (r.modifies.indexOf(c) > -1 ? "FAILED" : "OK");
			if (etat === "missing") manquants.push(c);
			if (etat === "FAILED") modifies.push(c);
			if (silencieux){
				if (etat === "FAILED") erreurs.push("debsums: changed file " + c + " (from " + n + " package)");
				if (etat === "missing") erreurs.push("debsums: missing file " + c + " (from " + n + " package)");
			} else if (changes){ if (etat !== "OK") lignes.push(c); }
			else lignes.push(completerDroite(c, 77) + " " + (io.tty ? (etat === "OK" ? etat : C.rouge(etat)) : etat));
		});
	});
	erreurs.forEach(function(e){ io.err(e); });
	if (modifies.length || manquants.length) io.code = 2;
	GameEvents.fire({ type: "debsums", hote: h, changes: changes, modifies: modifies.slice(), manquants: manquants.slice(), generique: true });
	if (io.tty && (modifies.length || manquants.length) && (silencieux || changes)) lignes.push(C.gris("(Un fichier qui n'a plus l'empreinte de son paquet : modifié depuis l'installation. Si c'est un programme, on le remet d'origine : sudo apt install --reinstall PAQUET (dpkg -S FICHIER donne le paquet).)"));
	return lignes.join("\n");
};

/* ================================================================== */
/* etckeeper : /etc sous contrôle de version                           */
/* ================================================================== */

function etckeeperDepot(hote){
	var b = etatBastion();
	if (!b.etckeeper[hote] || !Array.isArray(b.etckeeper[hote].commits)){
		var base = (b.instantanes.etc && b.instantanes.etc[hote]) || photographierDossiers(hote, ["/etc"]);
		var depart = new Date(maintenantBastion() - 3 * 86400000);
		b.etckeeper[hote] = { base: base, commits: [{ id: sha1("initial-" + hote), date: depart.getTime(), message: "Initial commit", auteur: "root", modifies: {}, supprimes: [] }] };
	}
	return b.etckeeper[hote];
}
/* /etc tel que le dernier commit l'a gardé : { chemin: { t } }. */
function etckeeperTete(hote){
	var d = etckeeperDepot(hote), photo = JSON.parse(JSON.stringify(d.base));
	d.commits.forEach(function(c){
		for (var k in c.modifies) photo[k] = c.modifies[k];
		c.supprimes.forEach(function(s){ delete photo[s]; });
	});
	return photo;
}
function etckeeperDifferences(hote){
	var tete = etckeeperTete(hote), ici = photographierDossiers(hote, ["/etc"]), r = { modifies: [], ajoutes: [], supprimes: [] };
	Object.keys(ici).forEach(function(c){
		if (!tete.hasOwnProperty(c)) r.ajoutes.push(c);
		else if (JSON.stringify(tete[c]) !== JSON.stringify(ici[c])) r.modifies.push(c);
	});
	Object.keys(tete).forEach(function(c){ if (!ici.hasOwnProperty(c)) r.supprimes.push(c); });
	["modifies", "ajoutes", "supprimes"].forEach(function(k){ r[k].sort(); });
	r.tete = tete; r.ici = ici;
	return r;
}
function etckeeperHistorique(hote){ return etckeeperDepot(hote).commits.slice().reverse(); }
function relatifEtc(c){ return c.replace(/^\/etc\//, ""); }
function texteDe(x){ return x ? (x.l !== undefined ? x.l : x.t) : ""; }

Shell.sorts.etckeeper = function(args, io){
	var h = Shell.hote();
	if (!etckeeperInstalle(h)) throw new ShellError("bash: etckeeper: command not found" + astuce(io, "etckeeper n'est pas installé sur " + h + " (dpkg -l etckeeper)."), 127);
	var action = args[0];
	if (!action) throw new ShellError("usage: etckeeper command [-d directory]\n\ncommands:\n  init  commit  vcs  update-ignore  unclean  pre-commit  pre-install  post-install  uninit", 1);
	if (!io.sudo) throw new ShellError("etckeeper: must be run as root" + astuce(io, "/etc appartient à root : sudo etckeeper " + args.join(" ")), 1);
	var d = etckeeperDepot(h);
	if (action === "unclean"){
		var u = etckeeperDifferences(h);
		io.code = u.modifies.length + u.ajoutes.length + u.supprimes.length ? 0 : 1;
		return "";
	}
	if (action === "commit"){
		var message = args.slice(1).filter(function(a){ return a !== "-m"; }).join(" ").trim();
		if (message === "") throw new ShellError("etckeeper commit : il faut un message, entre guillemets." + astuce(io, "sudo etckeeper commit \"ce que tu as changé et pourquoi\""), 1);
		var diff = etckeeperDifferences(h);
		var n = diff.modifies.length + diff.ajoutes.length + diff.supprimes.length;
		if (!n) return io.tty ? C.gris("(Rien à enregistrer : /etc n'a pas changé depuis le dernier commit.)") : "";
		var plus = 0, moins = 0;
		diff.modifies.concat(diff.ajoutes).forEach(function(c){
			var a = lignesDe(texteDe(diff.tete[c])), b = lignesDe(texteDe(diff.ici[c]));
			differencesGnu(a, b).forEach(function(bl){ plus += bl.ajoutes.length; moins += bl.retires.length; });
		});
		diff.supprimes.forEach(function(c){ moins += lignesDe(texteDe(diff.tete[c])).length; });
		var modifies = {};
		diff.modifies.concat(diff.ajoutes).forEach(function(c){ modifies[c] = diff.ici[c]; });
		var parent = d.commits[d.commits.length - 1].id;
		var commit = { id: sha1(parent + message + maintenantBastion() + n), date: maintenantBastion(), message: message, auteur: JOUEUR, modifies: modifies, supprimes: diff.supprimes.slice(),
			fichiers: diff.modifies.concat(diff.ajoutes, diff.supprimes).map(relatifEtc) };
		d.commits.push(commit);
		if (d.commits.length > 40){
			var vieux = d.commits.splice(1, 1)[0];
			for (var k in vieux.modifies) d.base[k] = vieux.modifies[k];
			vieux.supprimes.forEach(function(s){ delete d.base[s]; });
		}
		GameEvents.fire({ type: "etckeeper", action: "commit", message: message, fichiers: commit.fichiers.slice(), hote: h });
		return "[master " + commit.id.substring(0, 7) + "] " + message + "\n " + n + " file" + (n > 1 ? "s" : "") + " changed" +
			(plus ? ", " + plus + " insertion" + (plus > 1 ? "s" : "") + "(+)" : "") + (moins ? ", " + moins + " deletion" + (moins > 1 ? "s" : "") + "(-)" : "") +
			diff.ajoutes.map(function(c){ return "\n create mode 100644 " + relatifEtc(c); }).join("") + diff.supprimes.map(function(c){ return "\n delete mode 100644 " + relatifEtc(c); }).join("");
	}
	if (action === "vcs"){
		var sous = args[1];
		if (sous === "log"){
			var court = args.indexOf("--oneline") > -1, n2 = null;
			args.forEach(function(a, k){ if (a === "-n") n2 = parseInt(args[k + 1], 10); if (/^-\d+$/.test(a)) n2 = parseInt(a.substring(1), 10); });
			var liste = etckeeperHistorique(h);
			if (n2) liste = liste.slice(0, n2);
			GameEvents.fire({ type: "etckeeper", action: "log", hote: h, fichiers: [], message: null });
			if (court) return liste.map(function(c){ return c.id.substring(0, 7) + " " + c.message; }).join("\n");
			return liste.map(function(c){
				return "commit " + c.id + "\nAuthor: " + c.auteur + " <" + c.auteur + "@" + h + ">\nDate:   " + dateGit(new Date(c.date)) + "\n\n    " + c.message;
			}).join("\n\n");
		}
		if (sous === "status"){
			var s = etckeeperDifferences(h);
			GameEvents.fire({ type: "etckeeper", action: "status", hote: h, fichiers: s.modifies.concat(s.ajoutes, s.supprimes).map(relatifEtc), message: null });
			if (!s.modifies.length && !s.ajoutes.length && !s.supprimes.length) return "On branch master\nnothing to commit, working tree clean";
			var l = ["On branch master"];
			if (s.modifies.length || s.supprimes.length){
				l.push("Changes not staged for commit:", "  (use \"git add/rm <file>...\" to update what will be committed)", "  (use \"git restore <file>...\" to discard changes in working directory)");
				s.modifies.forEach(function(c){ l.push("\tmodified:   " + relatifEtc(c)); });
				s.supprimes.forEach(function(c){ l.push("\tdeleted:    " + relatifEtc(c)); });
				l.push("");
			}
			if (s.ajoutes.length){
				l.push("Untracked files:", "  (use \"git add <file>...\" to include in what will be committed)");
				s.ajoutes.forEach(function(c){ l.push("\t" + relatifEtc(c)); });
				l.push("");
			}
			l.push("no changes added to commit (use \"git add\" and/or \"git commit -a\")");
			return l.join("\n");
		}
		if (sous === "diff"){
			var df = etckeeperDifferences(h), sortie = [];
			df.modifies.concat(df.supprimes).forEach(function(c){
				var a = lignesDe(texteDe(df.tete[c])), b = df.ici[c] ? lignesDe(texteDe(df.ici[c])) : [];
				var r = relatifEtc(c);
				sortie.push("diff --git a/" + r + " b/" + r);
				if (!df.ici[c]) sortie.push("deleted file mode 100644");
				sortie.push("index " + md5(texteDe(df.tete[c])).substring(0, 7) + ".." + (df.ici[c] ? md5(texteDe(df.ici[c])).substring(0, 7) : "0000000") + (df.ici[c] ? " 100644" : ""));
				sortie.push("--- a/" + r, df.ici[c] ? "+++ b/" + r : "+++ /dev/null");
				morceauxUnifies(a, b, differencesGnu(a, b), 3).forEach(function(m){
					sortie.push(m.entete);
					m.lignes.forEach(function(x){
						var texte = x.signe === "+" ? b[x.b] : a[x.a];
						var ligne = x.signe + texte;
						sortie.push(io.tty ? (x.signe === "+" ? C.vert(ligne) : (x.signe === "-" ? C.rouge(ligne) : ligne)) : ligne);
					});
				});
			});
			GameEvents.fire({ type: "etckeeper", action: "diff", hote: h, fichiers: df.modifies.concat(df.supprimes).map(relatifEtc), message: null });
			return sortie.join("\n");
		}
		throw new ShellError("etckeeper vcs : ici, log, status et diff." + astuce(io, "sudo etckeeper vcs log, sudo etckeeper vcs status, sudo etckeeper vcs diff"), 1);
	}
	if (action === "init") return "";
	throw new ShellError("etckeeper: unknown command " + action, 1);
};

/* ================================================================== */
/* Le manuel                                                           */
/* ================================================================== */

MANUEL["faillock"] = page("voir et remettre à zéro les échecs de connexion", "FAIL LOCK (verrou après échecs)",
	"pam_faillock compte les mots de passe ratés de chaque compte. Après « deny » échecs en « fail_interval »\n" +
	"secondes, le compte est verrouillé pendant « unlock_time » secondes (réglages : /etc/security/faillock.conf).\n" +
	"Il ne compte rien s'il n'est pas dans la pile PAM (/etc/pam.d/common-auth : lignes pam_faillock.so preauth et authfail).\n\n" +
	"  sudo faillock                       les échecs de tous les comptes\n" +
	"  sudo faillock --user ada            ceux d'un compte : date, type (RHOST : à distance, TTY : sur place), source,\n" +
	"                                      V (encore valide) ou I (trop ancien pour compter)\n" +
	"  sudo faillock --user ada --reset    tout effacer : le compte est déverrouillé\n\n" +
	"Dans /etc/security/faillock.conf :  deny = 5   fail_interval = 900   unlock_time = 600");
MANUEL["pwck"] = page("vérifier la cohérence de /etc/passwd et /etc/shadow", "PassWord ChecK",
	"  sudo pwck -r      lit /etc/passwd et /etc/shadow, signale chaque incohérence, ne change rien (-r : read-only)\n" +
	"  sudo pwck -qr     sans les avertissements (dossier personnel absent...)\n\n" +
	"Ce qu'il signale : une ligne mal formée, un nom en double, un groupe principal qui n'existe pas,\n" +
	"un dossier personnel ou un shell absents, un compte présent dans passwd mais pas dans shadow (et l'inverse).\n" +
	"Ce qu'il ne cherche PAS : les mots de passe vides et les UID 0 en double. Pour ceux-là :\n" +
	"  sudo awk -F: '$2 == \"\"' /etc/shadow      awk -F: '$3 == 0' /etc/passwd\n\n" +
	"Code de retour : 0 si tout va bien, 2 s'il a trouvé quelque chose.");
MANUEL["grpck"] = page("vérifier la cohérence de /etc/group", "GRouP ChecK",
	"  sudo grpck -r     lit /etc/group (et /etc/gshadow), signale les lignes fausses, les doublons, et les membres\n" +
	"                    qui n'existent plus (« group sudo: no user ghost »), sans rien changer.\n\n" +
	"Un compte supprimé à la main peut rester membre d'un groupe : grpck le voit.");
MANUEL["su"] = page("devenir un autre utilisateur (root, le plus souvent)", "Substitute User",
	"  su -              devenir root (avec le mot de passe de root)\n" +
	"  su - ada          devenir ada (avec SON mot de passe)\n" +
	"  su -c 'cmd' ada   lancer une seule commande en tant que ada\n\n" +
	"su demande le mot de passe du compte CIBLE ; sudo demande le TIEN, et journalise chaque commande.\n" +
	"Sur un serveur durci, root n'a pas de mot de passe utilisable, et su est réservé à un groupe :\n" +
	"dans /etc/pam.d/su, la ligne « auth required pam_wheel.so group=sudo » (sans le # devant).\n" +
	"Les autres reçoivent « su: Permission denied », même avec le bon mot de passe.\n" +
	"Un compte sans mot de passe dans /etc/shadow (le champ vide) s'ouvre avec su sans rien taper : à verrouiller.");
MANUEL["useradd"] = page("créer un compte", "USER ADD",
	"  sudo useradd -m -s /bin/bash ada          un compte avec son dossier /home/ada (-m) et le shell bash\n" +
	"  sudo useradd -m -G sudo ada               ... et membre du groupe sudo (-G : groupes en plus)\n" +
	"  sudo useradd -r -s /usr/sbin/nologin svc  un compte de service (-r : UID système, sans connexion possible)\n" +
	"  sudo useradd -e 2026-12-31 stagiaire      un compte qui expire à une date\n\n" +
	"Le compte naît verrouillé (« ! » dans /etc/shadow) : sudo passwd ada lui donne un mot de passe.\n" +
	"Il reçoit PASS_MAX_DAYS, PASS_MIN_DAYS et PASS_WARN_AGE de /etc/login.defs.");
MANUEL["umask"] = page("régler les droits par défaut des fichiers créés", "User file-creation MASK",
	"Le masque retire des droits à tout ce que tu crées : un fichier part de rw-rw-rw- (666), un dossier de rwxrwxrwx (777).\n\n" +
	"  umask             le masque actuel (0022 : on retire w au groupe et aux autres : fichiers en 644)\n" +
	"  umask -S          le même, en lettres : u=rwx,g=rx,o=rx\n" +
	"  umask 027         fichiers en 640, dossiers en 750 : rien pour les autres\n" +
	"  umask 077         fichiers en 600 : rien que pour toi\n" +
	"  umask u=rwx,g=rx,o=   la même chose que 027, en lettres\n\n" +
	"umask règle la session en cours seulement. Pour tous les comptes : UMASK 027 dans /etc/login.defs.");
MANUEL["sshd"] = page("le serveur SSH : vérifier sa configuration", "Secure SHell Daemon",
	"sshd tourne en service (systemctl status ssh). On ne le lance pas à la main, mais on l'interroge :\n\n" +
	"  sudo sshd -t      vérifie /etc/ssh/sshd_config et les fichiers qu'il inclut (sshd_config.d/*.conf) :\n" +
	"                    rien ne s'affiche si tout va bien ; sinon, le fichier, la ligne, et la faute\n" +
	"  sudo sshd -T      toute la configuration effective, option par option (en minuscules),\n" +
	"                    valeurs par défaut comprises :  sudo sshd -T | grep -i permitrootlogin\n" +
	"  sshd -V           la version d'OpenSSH\n\n" +
	"TOUJOURS sshd -t avant systemctl reload ssh : une configuration cassée est refusée au reload (l'ancienne reste),\n" +
	"mais un restart avec une configuration cassée arrête le service.\n" +
	"Pour un même réglage, sshd garde la PREMIÈRE valeur lue : un fichier de sshd_config.d (inclus en tête)\n" +
	"l'emporte sur la suite de sshd_config.\n\n" +
	"Les réglages d'un serveur durci : PermitRootLogin no, PasswordAuthentication no, PermitEmptyPasswords no,\n" +
	"MaxAuthTries 3, AllowUsers ada, X11Forwarding no, et des algorithmes modernes :\n" +
	"  Ciphers chacha20-poly1305@openssh.com,aes256-gcm@openssh.com\n" +
	"  MACs hmac-sha2-512-etm@openssh.com,hmac-sha2-256-etm@openssh.com\n" +
	"  KexAlgorithms curve25519-sha256,sntrup761x25519-sha512@openssh.com");
MANUEL["systemd-analyze"] = page("la note de sécurité des services", "SYSTEMD ANALYZE",
	"  systemd-analyze security            chaque service, sa note d'exposition de 0 (isolé) à 10 (il peut tout faire),\n" +
	"                                      et son verdict : SAFE, OK, MEDIUM, EXPOSED, UNSAFE\n" +
	"  systemd-analyze security apache2    le détail : chaque protection, ✓ en place ou ✗ absente, et ce qu'elle coûte\n" +
	"  systemd-analyze verify UNITÉ        signale les directives inconnues d'une unité\n\n" +
	"Les protections s'ajoutent dans un drop-in (sudo systemctl edit NOM), sous [Service] :\n" +
	"  NoNewPrivileges=yes       PrivateTmp=yes           ProtectSystem=full (ou strict)\n" +
	"  ProtectHome=yes           PrivateDevices=yes       ProtectKernelTunables=yes\n" +
	"  ProtectKernelModules=yes  ProtectControlGroups=yes RestrictSUIDSGID=yes\n" +
	"  CapabilityBoundingSet=CAP_NET_BIND_SERVICE   (ne garder que les pouvoirs utiles)\n" +
	"La note change quand systemd relit l'unité (daemon-reload, fait tout seul par systemctl edit) ;\n" +
	"le service, lui, ne s'enferme qu'à son prochain redémarrage (sudo systemctl restart NOM).");
MANUEL["apt-get"] = page("gérer les paquets (l'ancien apt)", "Advanced Package Tool",
	"apt-get fait la même chose qu'apt, avec une sortie stable pour les scripts :\n" +
	"  sudo apt-get update, sudo apt-get upgrade, sudo apt-get install PAQUET, sudo apt-get purge PAQUET\n" +
	"Pour lire (list, show), c'est apt. Voir man apt.");
MANUEL["dpkg"] = page("le gestionnaire de paquets de Debian (le niveau du dessous)", "Debian PacKaGe",
	"  dpkg -l                    tous les paquets : ii (installé), rc (retiré, sa configuration reste)\n" +
	"  dpkg -l 'open*'            ceux dont le nom commence par open\n" +
	"  dpkg -L openssh-server     les fichiers installés par un paquet\n" +
	"  dpkg -S /usr/sbin/sshd     à quel paquet appartient un fichier (dpkg -S sshd : tout chemin qui contient sshd)\n" +
	"  dpkg -s sudo               l'état détaillé d'un paquet, avec ses fichiers de configuration\n" +
	"  sudo dpkg -V               les fichiers qui ne sont plus ceux d'origine, au format :\n" +
	"                             ??5?????? c /etc/ssh/sshd_config\n" +
	"                             5 : l'empreinte MD5 a changé ; c : un fichier de configuration ; « missing » : effacé\n\n" +
	"Modifier un fichier de configuration (c) est normal. Un programme (/usr/bin, /usr/sbin) qui a changé ne l'est pas :\n" +
	"on le remet d'origine avec sudo apt install --reinstall PAQUET.");
MANUEL["etckeeper"] = page("garder l'historique de /etc", "ETC KEEPER",
	"etckeeper range /etc sous contrôle de version (git) : chaque changement de configuration est daté, signé, et réversible.\n\n" +
	"  sudo etckeeper commit \"SSH : plus de connexion root\"   enregistrer l'état de /etc, avec un message\n" +
	"  sudo etckeeper vcs status                           ce qui a changé depuis le dernier commit\n" +
	"  sudo etckeeper vcs diff                             les lignes changées\n" +
	"  sudo etckeeper vcs log                              l'historique (--oneline : une ligne par commit)\n\n" +
	"Le jour où quelqu'un (ou quelque chose) touche à /etc dans ton dos, vcs status le montre.");
MANUEL["sudo"].page += "\n\nVoir ses propres droits :\n" +
	"  sudo -l                    ce que tu peux lancer avec sudo, d'après /etc/sudoers et /etc/sudoers.d/\n" +
	"  sudo -ll                   la même chose, en détail (de quel fichier vient chaque droit)\n" +
	"  sudo -l -U ada             les droits d'un autre compte\n" +
	"  sudo -l systemctl          est-ce que CETTE commande m'est permise ?\n" +
	"« NOPASSWD: ALL » donne root sans retaper de mot de passe : c'est la ligne qu'un intrus espère trouver.";
MANUEL["visudo"].page += "\n\nAller plus loin :\n" +
	"  sudo visudo -c                         vérifie /etc/sudoers et tout /etc/sudoers.d : « parsed OK » pour chacun\n" +
	"  sudo visudo -f /etc/sudoers.d/admins   modifier (ou créer) un fichier de sudoers.d, avec la même vérification\n" +
	"  sudo visudo -c -f /etc/sudoers.d/admins   ne vérifier que lui\n\n" +
	"Un fichier de /etc/sudoers.d doit appartenir à root et être en 0440 (r--r-----) ; visudo -c le signale sinon.\n" +
	"sudo ignore les fichiers de sudoers.d dont le nom contient un point ou finit par ~.";
MANUEL["usermod"].page += "\n\nAussi :\n" +
	"  sudo usermod -s /usr/sbin/nologin svc    plus de connexion possible pour ce compte (un compte de service)\n" +
	"  sudo usermod -e 2026-12-31 stagiaire     le compte expire à cette date (-e \"\" : jamais)\n" +
	"  sudo usermod -c \"Ada Lovelace\" ada      le nom complet (le commentaire de /etc/passwd)";
MANUEL["userdel"].page += "\n  sudo userdel -r NOM    supprime aussi son dossier personnel (et sa boîte aux lettres)";
MANUEL["chage"].page += "\n\nLes règles d'âge, compte par compte :\n" +
	"  sudo chage -M 90 ada        90 jours au plus entre deux changements de mot de passe\n" +
	"  sudo chage -m 1 ada         1 jour au moins (pour qu'on ne revienne pas tout de suite à l'ancien)\n" +
	"  sudo chage -W 14 ada        prévenir 14 jours avant\n" +
	"  sudo chage -E 2026-12-31 ada    le compte expire à cette date\n" +
	"  sudo chage -d 0 ada         forcer le changement à la prochaine connexion\n" +
	"Pour les comptes à venir : PASS_MAX_DAYS, PASS_MIN_DAYS, PASS_WARN_AGE dans /etc/login.defs.";
MANUEL["passwd"].page += "\n\nAdministrer les mots de passe des autres (avec sudo) :\n" +
	"  sudo passwd -l ada      verrouiller (un ! devant l'empreinte)    sudo passwd -u ada   déverrouiller\n" +
	"  sudo passwd -S ada      l'état : L (verrouillé), NP (AUCUN mot de passe), P (un mot de passe)\n" +
	"  sudo passwd -e ada      obliger ada à le changer à sa prochaine connexion\n" +
	"  sudo passwd -x 90 ada   90 jours au plus (comme chage -M)";
MANUEL["lastlog"].page += "\n  lastlog -b 90          les comptes sans connexion depuis plus de 90 jours (ou jamais) : les dormants\n  lastlog -t 7           ceux qui se sont connectés cette semaine";
MANUEL["crontab"].page += "\n\nQui a le droit d'utiliser cron :\n" +
	"  /etc/cron.allow    s'il existe, SEULS les comptes qu'il nomme (un par ligne) peuvent avoir une crontab\n" +
	"  /etc/cron.deny     sinon, les comptes qu'il nomme n'en ont pas le droit\n" +
	"root a toujours le droit. Les autres reçoivent : You (ada) are not allowed to use this program (crontab)";
MANUEL["at"].page += "\n\nQui a le droit d'utiliser at : /etc/at.allow (seuls ceux-là) ou /etc/at.deny (tous sauf ceux-là).\n" +
	"Refusé : « You do not have permission to use at. »";
MANUEL["systemctl"].page += "\n\nDurcir les services :\n" +
	"  sudo systemctl disable --now NOM        arrêter et ne plus démarrer (telnet.socket, rpcbind, avahi-daemon...)\n" +
	"  sudo systemctl mask ctrl-alt-del.target   l'empêcher de démarrer, même par dépendance (un lien vers /dev/null)\n" +
	"  sudo systemctl unmask NOM               lever le masque\n" +
	"  systemctl is-enabled NOM, is-active NOM   enabled / disabled / masked ; active / inactive / failed\n" +
	"  systemctl list-unit-files --state=enabled   tout ce qui démarre avec la machine\n" +
	"  systemctl list-units --type=service     les services chargés (--all : aussi les arrêtés)\n" +
	"  systemctl list-sockets                  les sockets qui attendent une connexion\n" +
	"  systemctl cat NOM                       l'unité et ses drop-ins, tels que systemd les lit\n" +
	"  sudo systemctl edit NOM                 un drop-in (override.conf) : on ne touche jamais au fichier du paquet\n" +
	"  sudo systemctl daemon-reload            relire les unités après une modification à la main\n" +
	"  sudo systemctl reload ssh               recharger sans couper : refusé si sshd -t trouve une faute";
MANUEL["ss"].page += "\n\nToutes les combinaisons : ss -tulpn (TCP et UDP, en écoute, avec le programme, en chiffres), ss -tan (tout TCP),\n" +
	"ss -4 / -6 (une seule famille d'adresses), ss -H (sans l'en-tête). Sans sudo, la colonne Process reste vide pour\n" +
	"les programmes des autres comptes.";
MANUEL["netstat"].page += "\n\nnetstat -loptn : en écoute (-l), le programme (-p), le minuteur (-o), TCP (-t), en chiffres (-n).\n" +
	"netstat -tulpn, l'équivalent de ss -tulpn. Sans sudo, « - » à la place des programmes des autres.";
MANUEL["apt"].page += "\n\nL'entretien d'un serveur :\n" +
	"  apt list --upgradable           les paquets qui ont une mise à jour (souvent de sécurité)\n" +
	"  sudo apt upgrade                tout mettre à jour\n" +
	"  sudo apt purge telnetd          retirer un paquet ET sa configuration (remove garde la configuration)\n" +
	"  sudo apt install --reinstall X  remettre les fichiers d'origine d'un paquet (un programme modifié)\n" +
	"  apt show X                      la fiche d'un paquet";
MANUEL["debsums"].page += "\n\n  debsums -s             rien si tout va bien ; sinon, chaque fichier changé (sur la sortie d'erreur)\n" +
	"  debsums PAQUET         les fichiers d'un seul paquet\n  debsums -a             les fichiers de configuration aussi (-e : seulement eux)";
MANUEL["ssh-keygen"].page += "\n\nChoisir sa clé :\n" +
	"  ssh-keygen -t ed25519 -C \"ada@poste\"     la clé moderne, courte et sûre (recommandée)\n" +
	"  ssh-keygen -t rsa -b 4096                une clé RSA (3072 bits au moins aujourd'hui)\n" +
	"  ssh-keygen -t ed25519 -f ~/.ssh/bastion -N \"\"   un autre nom de fichier, sans phrase de passe (-N)\n" +
	"  ssh-keygen -l -f ~/.ssh/id_ed25519.pub   l'empreinte d'une clé (à comparer avec celle annoncée)";

/* ================================================================== */
/* Enregistrement des sorts                                            */
/* ================================================================== */

var SORTS_BASTION = ["faillock", "pwck", "grpck", "su", "useradd", "umask", "sshd", "systemd-analyze", "apt-get", "dpkg", "etckeeper"];
SORTS_BASTION.forEach(function(s){ if (MANUEL[s]) MANUEL[s].horsBareme = true; });
COMMANDES_REELLES = COMMANDES_REELLES.filter(function(c){ return SORTS_BASTION.indexOf(c) === -1; });

/* Tant qu'aucun chapitre ne les enseigne, leur premier usage ne rapporte pas d'XP (comme les sorts arcanes). */
var PREMIER_USAGE_AVANT_BASTION = GameState.prototype.premierUsage;
GameState.prototype.premierUsage = function(sort){
	if (SORTS_BASTION.indexOf(sort) > -1 && tousLesSorts().indexOf(sort) === -1){
		this.usages[sort] = true;
		return;
	}
	return PREMIER_USAGE_AVANT_BASTION.apply(this, arguments);
};

/* apt-get, pour qui ne le connaît pas encore : la même réponse qu'avant (« le sort s'appelle apt »). */
var APPELER_AVANT_BASTION = Shell.appeler;
Shell.appeler = function(nom, args, io){
	if (nom === "apt-get" && !state.knows("apt-get")) throw new ShellError(Shell.sortInconnu(nom), 127);
	return APPELER_AVANT_BASTION.apply(this, arguments);
};

/* FIN DES SORTS DU BASTION */
