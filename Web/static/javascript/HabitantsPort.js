/**
 * HabitantsPort.js : les quêtes annexes du Grand Port (chapitre 8 pour le joueur, numéro interne 9).
 *
 * Six habitants du port confient chacun une petite histoire, en quatre étapes, sur les machines de la baie. Chaque
 * annexe apporte des notions qu'aucun chapitre n'enseigne ailleurs (ni dans ses étapes, ni dans ses défis) :
 *   a8_podman      Anissa (le Grand Port, la chaloupe)     des conteneurs sans démon et sans root : podman run, ps, images
 *   a8_cloisons    Edson (le Quai des Premiers Pas, docks) les cloisons à la main : unshare, lsns, nsenter, ip netns
 *   a8_douanier    Mina (le Registre du port)              lire et copier une image de registre à registre : skopeo
 *   a8_continents  Ronan (le Grand Port, docks)            une image pour deux continents : docker buildx, docker manifest
 *   a8_relecteur   Idrissa (le Chantier naval, docks)      relire un Dockerfile : hadolint
 *   a8_cabine      Neil (la Capitainerie, la cabine)       des conteneurs d'avant les conteneurs : systemd-nspawn, machinectl
 * Le mécanisme (proposition, étapes, récompenses, badge « Ami du Grand Port ») est dans QuetesAnnexes.js.
 */

World.fige = false;

function ouverteCh8(){ return state && state.has && state.has("ch8Ouvert") && portActifPort(); }
function habitantCh8(lieu, nom, image, texte, sorts){
	var it = new Item(nom, "", image).personnage();
	if (sorts && sorts.length){ it.enseigne.apply(it, sorts); declarerSortsAnnexes(sorts); }
	texteVivant(it, texte);
	lieu.addItem(it);
	return it;
}
/* Ce que le joueur a fait pour les annexes : les sorts lancés au port et leurs événements. */
function vuAnnexeCh8(cle){ return !!(sCh8().annexesVus || {})[cle]; }
function noterAnnexeCh8(cle){ var c = sCh8(); c.annexesVus = c.annexesVus || {}; c.annexesVus[cle] = true; }

var APPELER_AVANT_HABITANTS_PORT = Shell.appeler;
Shell.appeler = function(nom, args, io){
	var sortie = APPELER_AVANT_HABITANTS_PORT.apply(this, arguments);
	try {
		var h = ouverteCh8() ? portIci() : null;
		if (h){
			var s = typeof sortie === "string" ? sansAnsi(sortie) : "";
			if (nom === "ps" && h === "chaloupe" && s.split("\n").some(function(l){ return l.indexOf(JOUEUR + " ") === 0 && /nginx|sleep|httpd|redis/.test(l); })) noterAnnexeCh8("psRootless");
		}
	} catch (e){ /* une annexe ne doit jamais casser un sort */ }
	return sortie;
};
GameEvents.addListener("port", function(e){
	if (!ouverteCh8()) return;
	try {
		if (e.cmd === "podman" && e.sous === "run" && !e.sudo) noterAnnexeCh8("podmanRun");
		if (e.cmd === "podmanPs" && (e.conteneurs || []).some(function(c){ return c.rootless && c.statut === "running"; })) noterAnnexeCh8("podmanPs");
		if (e.cmd === "podman" && e.sous === "images") noterAnnexeCh8("podmanImages");
		if (e.cmd === "unsharePs") noterAnnexeCh8("unsharePs");
		if (e.cmd === "lsns" && e.sudo && e.n > 2) noterAnnexeCh8("lsns");
		if (e.cmd === "nsenter" && e.conteneur && (e.types || []).indexOf("net") > -1) noterAnnexeCh8("nsenterNet");
		if (e.cmd === "netns" && e.action === "add") noterAnnexeCh8("netnsAdd");
		if (e.cmd === "netns" && e.action === "exec" && vuAnnexeCh8("netnsAdd")) noterAnnexeCh8("netnsExec");
		if (e.cmd === "skopeo" && e.action === "inspect" && e.ok && /continent\.lan/.test(e.ref || "")) noterAnnexeCh8("skopeoInspect");
		if (e.cmd === "skopeo" && e.action === "list-tags" && (e.tags || []).length && /continent\.lan/.test(e.ref || "")) noterAnnexeCh8("skopeoTags");
		if (e.cmd === "skopeo" && e.action === "copy" && e.digest && /entrepot/.test(e.destination || "") && /continent\.lan/.test(e.source || "")) noterAnnexeCh8("skopeoCopy");
		if (e.cmd === "skopeo" && /inspect|list-tags/.test(e.action) && /entrepot/.test(e.ref || "") && (e.ok || (e.tags || []).length) && vuAnnexeCh8("skopeoCopy")) noterAnnexeCh8("skopeoRelu");
		if (e.cmd === "buildx" && e.action === "ls") noterAnnexeCh8("buildxLs");
		if (e.cmd === "buildx" && e.action === "create" && e.use) noterAnnexeCh8("buildxCreate");
		if (e.cmd === "buildxPush" && (e.plateformes || []).length >= 2) noterAnnexeCh8("buildxPush");
		if (e.cmd === "manifest" && e.ok && (e.plateformes || []).length >= 2) noterAnnexeCh8("manifest");
		if (e.cmd === "hadolint" && (e.fichiers || []).some(function(f){ return /relecture/.test(f); })){
			var codes = e.codes || [];
			if (["DL3008", "DL3009", "DL3025"].every(function(x){ return codes.indexOf(x) > -1; })) noterAnnexeCh8("hadolintLu");
			if (!codes.length && vuAnnexeCh8("hadolintLu")) noterAnnexeCh8("hadolintPropre");
		}
		if (e.cmd === "nspawnCmd" && /cabine-ancienne/.test(e.dossier || "")) noterAnnexeCh8("nspawn");
		if ((e.cmd === "nspawn" && e.action === "start") || (e.cmd === "machinectl" && e.action === "start" && e.sudo)) noterAnnexeCh8("machineStart");
		if (e.cmd === "machinectl" && e.action === "list" && vuAnnexeCh8("machineStart")) noterAnnexeCh8("machineList");
		if (e.cmd === "machinectl" && e.action === "shell" && e.sudo) noterAnnexeCh8("machineShell");
	} catch (x){}
});

/* ------------------------------------------------------------------ */
/* 1. Le navire sans capitaine (Anissa, la chaloupe)                    */
/* ------------------------------------------------------------------ */

var AnissaPort = habitantCh8(GrandPortCh8, "Anissa", "item_anissa.gif", function(){
	if (aFait("a8_podman")) return "Anissa range sa rame dans la chaloupe. « Pas de démon, pas de root, et ça navigue quand même. La chaloupe est à toi quand tu veux. »";
	return "Une jeune femme, une rame sur l'épaule, t'attend au bout du ponton, près d'une petite chaloupe.\n\n" +
		"« Anissa ! Sur ma chaloupe, il n'y a pas de démon docker. Pas de grue, pas de salle des machines. Et pourtant, elle lance des caisses : podman. " +
		"Il parle comme docker (run, ps, images...), mais chaque caisse est l'enfant de la commande, sans démon au milieu. Et surtout, il navigue SANS root : " +
		"le root de la caisse, c'est toi sur la chaloupe, et rien de plus. Si quelqu'un s'en échappe, il n'a que tes droits.\n\n" +
		"Viens voir : lance une caisse sans sudo (une alpine qui dort suffit ; et retiens que, sans root, pas de port sous 1024), regarde-la tourner, vois les plans qu'il a tirés, et regarde dans ps à qui appartient vraiment son processus. »\n\n" +
		C.gris("Les outils (sur chaloupe, sans sudo) : podman run -d --name canot alpine:3.20 sleep 3600 ; podman ps ; podman images ; ps aux | grep sleep ; podman info.");
}, ["podman"]);
declarerAnnexe({ id: "a8_podman", chapitre: 9, titre: "Le navire sans capitaine", habitant: "Anissa", lieu: "au Grand Port", item: function(){ return AnissaPort; }, ouverte: ouverteCh8,
	indice: "au bout du ponton du Grand Port, quelqu'un porte une rame.",
	resume: "Des conteneurs sans démon et sans root : podman run, podman ps, podman images, et le root du conteneur qui n'est que toi.",
	etapes: [
		{ titre: "Un conteneur lancé sans sudo, sur la chaloupe (podman run)", fait: function(){ return vuAnnexeCh8("podmanRun") && conteneursPodmanPort().some(function(c){ return rootlessPort(c) && enMarchePort(c); }); } },
		{ titre: "Le voir tourner, sans démon (podman ps)", fait: function(){ return vuAnnexeCh8("podmanPs"); } },
		{ titre: "Les plans tirés, sous leur nom complet (podman images)", fait: function(){ return vuAnnexeCh8("podmanImages"); } },
		{ titre: "Le root de la caisse, c'est toi sur la chaloupe (ps aux)", fait: function(){ return vuAnnexeCh8("psRootless"); } }
	],
	souvenir: { nom: "Rame-de-la-chaloupe", texte: "Une petite rame de bois peint, gravée : « Sans capitaine, mais pas sans cap. » Anissa dit que la chaloupe n'a jamais eu besoin de démon pour avancer." },
	lumiere: "le fanal de la chaloupe, au bout du ponton",
	merci: "Anissa pousse la chaloupe à l'eau. « Tu vois ? Pas de capitaine, et elle flotte. Le jour où un démon tombe, souviens-toi d'elle. »"
});

/* ------------------------------------------------------------------ */
/* 2. Les cloisons du navire (Edson, docks)                            */
/* ------------------------------------------------------------------ */

var EdsonPort = habitantCh8(quaiCh8("premiers").lieu, "Edson", "item_edson.gif", function(){
	if (aFait("a8_cloisons")) return "Edson range son niveau à bulle. « Des cloisons, rien que des cloisons. Un conteneur, c'est un processus bien cloisonné. Maintenant, tu le sais avec tes mains. »";
	return "Un charpentier de marine, un niveau à bulle à la main, frappe une cloison du plat de la main : elle sonne creux.\n\n" +
		"« Edson, charpentier. Kylian te dira qu'une caisse vivante est un processus cloisonné par le noyau. Moi, je vais te les faire poser, ces cloisons, à la main, sans docker. " +
		"unshare lance un programme dans des cloisons neuves : ses propres PID (il se croit le numéro 1), son propre nom, son propre réseau. lsns liste toutes les cloisons du navire. " +
		"Et nsenter fait l'inverse : il entre dans les cloisons d'un processus qui existe déjà, une caisse par exemple, avec les outils du quai. " +
		"Enfin, ip netns : des réseaux cloisonnés, nommés, qu'on fabrique à la main. »\n\n" +
		C.gris("Les outils (sur docks, avec sudo) : sudo unshare --pid --fork --mount-proc bash, puis ps (seul au monde), exit ; sudo lsns ; docker inspect -f '{{.State.Pid}}' vigie, puis sudo nsenter -t PID -n ip a ; " +
			"sudo ip netns add essai ; ip netns list ; sudo ip netns exec essai ip a.");
}, ["unshare", "nsenter", "lsns"]);
declarerAnnexe({ id: "a8_cloisons", chapitre: 9, titre: "Les cloisons du navire", habitant: "Edson", lieu: "au Quai des Premiers Pas", item: function(){ return EdsonPort; }, ouverte: ouverteCh8,
	indice: "au Quai des Premiers Pas, un charpentier frappe une cloison qui sonne creux.",
	resume: "Les espaces de noms à la main : unshare (PID, nom), lsns, nsenter dans un conteneur, ip netns.",
	etapes: [
		{ titre: "Des PID à soi : ps n'y voit que bash et lui-même (unshare --pid --fork --mount-proc)", fait: function(){ return vuAnnexeCh8("unsharePs"); } },
		{ titre: "Toutes les cloisons du navire (sudo lsns)", fait: function(){ return vuAnnexeCh8("lsns"); } },
		{ titre: "Entrer dans le réseau d'une caisse avec les outils du quai (nsenter -t PID -n)", fait: function(){ return vuAnnexeCh8("nsenterNet"); } },
		{ titre: "Un réseau cloisonné, nommé, fabriqué à la main (ip netns add, exec)", fait: function(){ return vuAnnexeCh8("netnsExec"); } }
	],
	souvenir: { nom: "Niveau-du-charpentier", texte: "Un niveau à bulle de laiton, un peu cabossé. Sur la règle, gravé à la pointe : « pid, net, uts, mnt, ipc, user. Six cloisons, un seul noyau. »" },
	lumiere: "la lampe de l'atelier du charpentier",
	merci: "Edson frappe la cloison une dernière fois. « Plus jamais un conteneur ne sera magique pour toi. Ce sont des cloisons, et tu sais les poser. »"
});

/* ------------------------------------------------------------------ */
/* 3. Le douanier du large (Mina, le Registre du port)                  */
/* ------------------------------------------------------------------ */

var MinaPort = habitantCh8(quaiCh8("registre").lieu, "Mina", "item_mina.gif", function(){
	if (aFait("a8_douanier")) return "Mina referme son carnet. « Lu au large, copié à quai, sans jamais rien tirer sur un démon. Le métier de douanier du large, en somme. »";
	return "Une femme en cape sombre, des jumelles autour du cou, note quelque chose dans un carnet en regardant vers le large.\n\n" +
		"« Mina, douanière du large. Soufiane lit les caisses une fois qu'elles sont au port. Moi, je les lis AVANT : sur le registre du continent, sans rien tirer, sans démon. " +
		"skopeo inspect donne l'empreinte, les étiquettes, les couches d'un plan distant. skopeo list-tags, toutes ses versions. " +
		"Et skopeo copy le recopie directement de registre à registre, du continent à notre entrepôt, sans passer par un quai. »\n\n" +
		C.gris("Les outils (sur docks) : skopeo inspect docker://continent.lan/library/alpine:3.20 ; skopeo list-tags docker://continent.lan/library/nginx ; " +
			"skopeo copy --dest-tls-verify=false --dest-creds douanier:MOTDEPASSE docker://continent.lan/library/busybox:1.36 docker://entrepot.port-aube.lan:5000/busybox:1.36 ; " +
			"skopeo list-tags --tls-verify=false --creds douanier:MOTDEPASSE docker://entrepot.port-aube.lan:5000/busybox.");
}, ["skopeo"]);
declarerAnnexe({ id: "a8_douanier", chapitre: 9, titre: "Le douanier du large", habitant: "Mina", lieu: "au Registre du port", item: function(){ return MinaPort; }, ouverte: ouverteCh8,
	indice: "au Registre du port, quelqu'un regarde le large aux jumelles.",
	resume: "Lire une image distante sans la tirer, et la copier de registre à registre : skopeo inspect, list-tags, copy.",
	etapes: [
		{ titre: "Lire un plan du continent sans le tirer (skopeo inspect docker://...)", fait: function(){ return vuAnnexeCh8("skopeoInspect"); } },
		{ titre: "Toutes les versions d'un plan distant (skopeo list-tags)", fait: function(){ return vuAnnexeCh8("skopeoTags"); } },
		{ titre: "Le recopier du continent à l'entrepôt, de registre à registre (skopeo copy)", fait: function(){ return vuAnnexeCh8("skopeoCopy"); } },
		{ titre: "Le relire dans l'entrepôt (skopeo inspect ou list-tags sur entrepot)", fait: function(){ return vuAnnexeCh8("skopeoRelu"); } }
	],
	souvenir: { nom: "Carnet-du-large", texte: "Un carnet de douanière, couverture de toile cirée. Une page porte une empreinte sha256 recopiée à la main, et en dessous : « Vu au large. Conforme. »" },
	lumiere: "la longue-vue de la douanière, braquée sur le large",
	merci: "Mina te tend ses jumelles un instant. « Regarde : tu sais maintenant ce que porte un navire avant même qu'il n'entre au port. »"
});

/* ------------------------------------------------------------------ */
/* 4. Les deux continents (Ronan, docks)                               */
/* ------------------------------------------------------------------ */

var RonanPort = habitantCh8(GrandPortCh8, "Ronan", "item_ronan.gif", function(){
	if (aFait("a8_continents")) return "Ronan replie sa carte des deux continents. « Un seul nom, deux plans, et chaque navire prend le sien. La flotte de l'école peut naviguer sur toutes les mers. »";
	return "Un voyageur, sac au dos, déplie sur une caisse une carte où l'on voit deux continents de part et d'autre de la mer.\n\n" +
		"« Ronan. Je reviens de l'autre continent : là-bas, les navires n'ont pas le même moteur qu'ici. Nos plans sont dessinés pour amd64 ; les leurs tournent sur arm64. " +
		"Un plan pour un seul continent ne vaut rien sur l'autre. docker buildx sait dessiner un même plan pour les deux à la fois, et les ranger sous un seul nom : une liste de plans (un index). " +
		"Chaque navire qui le tire prend la variante de son moteur. Mais le chantier par défaut ne sait pas faire : il faut un chantier à part, et pousser le résultat à l'entrepôt. " +
		"docker manifest inspect le prouve. »\n\n" +
		C.gris("Les outils (sur docks, dans ~/ecole) : docker buildx ls ; docker buildx create --name continents --use ; " +
			"docker buildx build --platform linux/amd64,linux/arm64 -t entrepot.port-aube.lan:5000/ecole:multi --push . ; docker manifest inspect --insecure entrepot.port-aube.lan:5000/ecole:multi.");
});
declarerAnnexe({ id: "a8_continents", chapitre: 9, titre: "Les deux continents", habitant: "Ronan", lieu: "au Grand Port", item: function(){ return RonanPort; }, ouverte: ouverteCh8,
	indice: "au Grand Port, un voyageur déplie la carte de deux continents.",
	resume: "Une image pour plusieurs plateformes : docker buildx ls, create --use, build --platform ... --push, et docker manifest inspect.",
	etapes: [
		{ titre: "Les chantiers de construction (docker buildx ls)", fait: function(){ return vuAnnexeCh8("buildxLs"); } },
		{ titre: "Un chantier à part, qui sait dessiner pour deux continents (docker buildx create --use)", fait: function(){ return vuAnnexeCh8("buildxCreate"); } },
		{ titre: "Le plan de l'école pour amd64 et arm64, poussé à l'entrepôt (buildx build --platform --push)", fait: function(){ return vuAnnexeCh8("buildxPush"); } },
		{ titre: "Deux plateformes sous un seul nom (docker manifest inspect)", fait: function(){ return vuAnnexeCh8("manifest"); } }
	],
	souvenir: { nom: "Carte-des-deux-continents", texte: "Une carte usée où deux continents se font face. Sur l'un, Ronan a écrit « amd64 », sur l'autre « arm64 », et au milieu de la mer : « un seul nom »." },
	lumiere: "le feu de camp du voyageur, sur les docks",
	merci: "Ronan glisse la carte dans ta poche. « Garde-la. Un jour, l'école aura des navires sur l'autre continent. Ils trouveront leur plan. »"
});
GameEvents.addListener("read", function(e){
	if (e.item === RonanPort && ouverteCh8()){
		var appris = apprendreManoeuvresPort("Ronan");
		if (appris.length && !state.has("rejeuEnCours")) say(C.cyan("⚓ Manœuvres apprises auprès de Ronan : ") + appris.map(function(m){ return "docker " + m; }).join(", "));
	}
});

/* ------------------------------------------------------------------ */
/* 5. Le relecteur de plans (Idrissa, le Chantier naval)               */
/* ------------------------------------------------------------------ */

var DOCKERFILE_RELECTURE_PORT = "# Le plan de la balise du chenal, écrit à la hâte : relis-le avant de le construire.\nFROM debian:12\nRUN apt-get update && apt-get install -y --no-install-recommends curl\nCMD curl -s http://phare.port-aube.lan:8080/\n";
(function(){
	try {
		var it = poserFichierHote("docks", "/home/" + JOUEUR + "/relecture/Dockerfile", DOCKERFILE_RELECTURE_PORT, {});
		var d = dossierHote("docks", "/home/" + JOUEUR + "/relecture");
		if (d){ d.owner = JOUEUR; d.horsBareme = true; }   /* le dossier d'une annexe : hors barème du chapitre */
		if (it) it.owner = JOUEUR;
	} catch (e){}
})();
function relectureCh8(){ return texteHote("docks", "/home/" + JOUEUR + "/relecture/Dockerfile") || ""; }
function codesRelectureCh8(){ try { return resultatHadolintPort(relectureCh8(), []).map(function(x){ return x.code; }); } catch (e){ return ["?"]; } }
var IdrissaPort = habitantCh8(quaiCh8("chantier").lieu, "Idrissa", "item_idrissa.gif", function(){
	if (aFait("a8_relecteur")) return "Idrissa coche la dernière case de son plan. « Un plan relu, c'est un plan qui ne coule pas. Reviens quand tu veux me faire relire les tiens. »";
	return "Un homme penché sur un plan, un crayon derrière l'oreille, coche une liste case par case.\n\n" +
		"« Idrissa, relecteur de plans. Avant qu'un plan ne parte au chantier, je le relis, ligne par ligne, contre une liste de règles : hadolint. " +
		"Chaque remarque a un numéro : DL3008, une version de paquet non épinglée ; DL3009, les listes d'apt laissées dans la cale ; DL3025, un CMD en forme shell... " +
		"L'ancien équipage a laissé le plan de la balise du chenal, ~/relecture/Dockerfile sur docks. Relis-le, corrige ses trois fautes, et qu'hadolint n'ait plus rien à dire. »\n\n" +
		C.gris("Les outils (sur docks) : hadolint ~/relecture/Dockerfile ; un paquet épinglé s'écrit curl=7.88.1-10 ; rm -rf /var/lib/apt/lists/* dans le même RUN ; CMD [\"curl\", \"-s\", \"http://...\"] ; puis hadolint de nouveau.");
}, ["hadolint"]);
declarerAnnexe({ id: "a8_relecteur", chapitre: 9, titre: "Le relecteur de plans", habitant: "Idrissa", lieu: "au Chantier naval", item: function(){ return IdrissaPort; }, ouverte: ouverteCh8,
	indice: "au Chantier naval, quelqu'un relit un plan, crayon derrière l'oreille.",
	resume: "Relire un Dockerfile avec hadolint : DL3008, DL3009, DL3025 corrigés, et un hadolint propre.",
	etapes: [
		{ titre: "Lire les remarques d'hadolint sur le plan de la balise (DL3008, DL3009, DL3025)", fait: function(){ return vuAnnexeCh8("hadolintLu"); } },
		{ titre: "Le paquet épinglé, et les listes d'apt nettoyées dans le même RUN", fait: function(){ var c = codesRelectureCh8(); return c.indexOf("DL3008") === -1 && c.indexOf("DL3009") === -1 && /apt-get/.test(relectureCh8()); } },
		{ titre: "Le CMD en forme exec", fait: function(){ return codesRelectureCh8().indexOf("DL3025") === -1 && /^CMD\s*\[/m.test(relectureCh8()); } },
		{ titre: "Un hadolint qui n'a plus rien à dire", fait: function(){ return vuAnnexeCh8("hadolintPropre") && codesRelectureCh8().length === 0; } }
	],
	souvenir: { nom: "Plan-relu", texte: "Un plan de balise annoté au crayon, trois corrections entourées, et en bas, d'une écriture soignée : « Relu par Idrissa. Bon pour le chantier. »" },
	lumiere: "la lampe de bureau du relecteur",
	merci: "Idrissa tamponne le plan. « Trois fautes de moins en mer. C'est toujours trois tempêtes de moins. »"
});

/* ------------------------------------------------------------------ */
/* 6. La cabine d'avant les conteneurs (Neil, la cabine)                */
/* ------------------------------------------------------------------ */

var NeilPort = habitantCh8(quaiCh8("capitainerie").lieu, "Neil", "item_neil.gif", function(){
	if (aFait("a8_cabine")) return "Neil souffle sa lanterne. « La vieille cabine a navigué une dernière fois. Merci, Amiral. Les conteneurs sont jeunes ; les cloisons, elles, sont vieilles comme la mer. »";
	return "Un vieux marin, une lanterne dans une main et une grosse clé dans l'autre, est assis près de la fenêtre de la capitainerie.\n\n" +
		"« Neil. J'ai navigué avant les conteneurs, petit. Avant, on enfermait déjà un système entier dans un dossier : chroot, puis systemd-nspawn. " +
		"Sur la machine cabine, j'ai gardé ma vieille cabine : une Debian entière, posée dans /var/lib/machines/cabine-ancienne. " +
		"systemd-nspawn y ouvre un shell, comme si c'était un autre ordinateur ; machinectl la démarre en fond, avec son propre init, la liste, et t'y fait monter. Les mêmes cloisons que vos conteneurs, sans image ni registre. »\n\n" +
		C.gris("Les outils (sur cabine, avec sudo) : sudo systemd-nspawn -D /var/lib/machines/cabine-ancienne (puis hostname, cat /etc/os-release, exit) ; " +
			"sudo machinectl start cabine-ancienne ; machinectl list ; sudo machinectl shell cabine-ancienne (puis exit) ; sudo machinectl poweroff cabine-ancienne.");
}, ["systemd-nspawn", "machinectl"]);
declarerAnnexe({ id: "a8_cabine", chapitre: 9, titre: "La cabine d'avant les conteneurs", habitant: "Neil", lieu: "à la Capitainerie", item: function(){ return NeilPort; }, ouverte: ouverteCh8,
	indice: "à la Capitainerie, un vieux marin tient une lanterne et une grosse clé.",
	resume: "Un système entier dans un dossier : systemd-nspawn -D, machinectl start, list et shell.",
	etapes: [
		{ titre: "Monter à bord de la vieille cabine (systemd-nspawn -D)", fait: function(){ return vuAnnexeCh8("nspawn"); } },
		{ titre: "La démarrer en fond, avec son init (machinectl start)", fait: function(){ return vuAnnexeCh8("machineStart"); } },
		{ titre: "La voir dans la liste des machines (machinectl list)", fait: function(){ return vuAnnexeCh8("machineList"); } },
		{ titre: "Y ouvrir un shell (machinectl shell)", fait: function(){ return vuAnnexeCh8("machineShell"); } }
	],
	souvenir: { nom: "Cle-de-cabine", texte: "Une grosse clé de fer, noircie par le sel, au bout d'un cordon. Neil dit qu'elle ouvre une cabine qui croyait être seule au monde." },
	lumiere: "la lanterne du vieux marin, à la fenêtre de la capitainerie",
	merci: "Neil te pose la clé dans la main. « Avant vous, il y avait nous. Et avant nous, la mer. Garde-la. »"
});

/* Le badge « Ami du Grand Port », et une phrase de plus dans la scène finale. */
declarerAmiAnnexes(9, { badge: "ami_ch8", nom: "Ami du Grand Port", phrase: "les six habitants du Grand Port te comptent parmi les leurs" });
if (typeof COMPETENCES !== "undefined") COMPETENCES.ami_ch8 = "Ami du Grand Port";
if (typeof RANGS_DES_BADGES !== "undefined") RANGS_DES_BADGES.ami_ch8 = "or";
function texteAmiFinaleCh8(){
	return annexesToutesFaites(9) ? " Sur la jetée, Anissa, Edson, Mina, Ronan, Idrissa et Neil lèvent chacun une lanterne : celles-là sont pour toi." : "";
}

World.fige = true;
