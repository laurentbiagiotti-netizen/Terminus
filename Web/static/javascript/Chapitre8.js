/**
 * Chapitre8.js : le Grand Port, la Flotte noire. Le chapitre des conteneurs, de zéro à héros.
 *
 * Numéro interne 9 (le 4 est l'épreuve finale, puis chaque chapitre décale d'un cran), affiché 8.
 * Au matin qui suit la fête de Port-Aube, la lettre de la plume grise se confirme : derrière le phare noir, une flotte
 * se rassemble, et ses navires ne portent pas de marchandises mais des conteneurs. Laurent ouvre le Grand Port de l'île
 * et en confie la maîtrise à la recrue : la flotte noire paraîtra à l'aube du quatrième jour. Pour l'arrêter, il ne
 * faut pas des canons, mais une flotte à soi, et la science de lire celle de l'ennemi sans se faire couler.
 *
 * Ce fichier pose le monde (le Grand Port, ses quatorze quais, la boîte de Laurent), les rangs (Mousse, Matelot,
 * Quartier-maître, Second, Capitaine, Amiral) et leurs épreuves, les nuits au bivouac, l'assaut de l'aube, la bataille,
 * les 44 étapes validées sur l'ÉTAT RÉEL des machines du port (le moteur : SortsPort*.js, GrandPort.js), le rapport, le
 * certificat, le cliffhanger, le départ direct. Port.js fait vivre les maîtres, leurs défis, les badges, les commandes
 * du jeu port et galons ; HabitantsPort.js, les quêtes annexes.
 *
 * Strictement défensif : on construit, on déploie, on durcit, on inspecte. L'image de l'éclaireur est inerte (un
 * fichier-témoin, une phrase affichée, des Labels) ; elle se lit en quarantaine, elle ne se lance jamais.
 */

World.fige = false;

/* ------------------------------------------------------------------ */
/* Les lieux : le Grand Port, ses quatorze quais, la boîte de Laurent   */
/* ------------------------------------------------------------------ */

function salleCh8(nom, intro, img){
	var r = lieuDuChapitre9(new Room(nom, intro, img));
	r.owner = "root";
	r.mode = "rwxr-xr-x";
	return r;
}
function objetCh8(lieu, nom, texte, image, options){
	options = options || {};
	var it = new Item(nom, texte, image || "item_sign.gif").droits(options.mode || "rw-r--r--", options.owner || "root");
	lieu.addItem(it);
	return it;
}

var GrandPortCh8 = salleCh8("GrandPort",
	"Le Grand Port de Port-Aube, au lever du jour. Deux grues à portique dressent leurs bras noirs contre un soleil rayé de brume ; " +
	"un porte-conteneurs dort à quai, une charge suspendue au-dessus du vide, et les piles de conteneurs colorés montent comme des falaises. " +
	"Quatorze quais rayonnent autour de la capitainerie, chacun gardé par un maître du port. " +
	"Au large, derrière le phare noir, une ligne sombre grossit sur la mer. Laurent t'attend au pied de la grande grue ; la radio de Grace grésille.",
	"loc_grand_port.gif");

/* Les quatorze quais : la clé (celle des badges), le nom du lieu, le maître, le titre, la machine, les étapes, l'acte, l'image, l'intro. */
var QUAIS_CH8 = [
	{ cle: "premiers", nom: "QuaiDesPremiersPas", maitre: "Kylian", titre: "le Quai des Premiers Pas", machine: "docks", acte: 1, image: "loc_quai_premiers_pas.gif", etapes: ["n8_demon", "n8_premier"],
	  intro: "Le Quai des Premiers Pas : un conteneur seul, portes ouvertes, une lampe accrochée au crochet d'une grue. Des empreintes de pas mènent à l'intérieur. Ici, on apprend ce qu'est une caisse vivante (le démon docker, le premier conteneur)." },
	{ cle: "capitainerie", nom: "Capitainerie", maitre: "Julien", titre: "la Capitainerie", machine: "docks", acte: 1, image: "loc_capitainerie.gif", etapes: ["n8_cycle", "n8_dedans", "n8_menage"],
	  intro: "La Capitainerie : une baie vitrée sur tout le port, un tableau de voyants qui clignotent, le journal de bord ouvert près de la cloche. D'ici, on suit chaque caisse de sa naissance à sa fin (le cycle de vie d'un conteneur)." },
	{ cle: "plans", nom: "EntrepotDesPlans", maitre: "Grégoire", titre: "l'Entrepôt des plans", machine: "docks", acte: 1, image: "loc_entrepot_plans.gif", etapes: ["n8_images", "n8_couches"],
	  intro: "L'Entrepôt des plans : des casiers de plans scellés jusqu'au plafond, et sous la lampe, un plan de conteneur déplié, couche par couche (les images, les tags, les digests)." },
	{ cle: "soutes", nom: "Soutes", maitre: "Chahla", titre: "les Soutes", machine: "docks", acte: 2, image: "loc_soutes.gif", etapes: ["n8_volume", "n8_montage", "n8_sauvegarde"],
	  intro: "Les Soutes : une enfilade de membrures dans la pénombre, une échelle sous l'écoutille, des tonneaux arrimés. Ce qui dort ici survit à tous les voyages (les volumes et les montages)." },
	{ cle: "chenaux", nom: "Chenaux", maitre: "Adonis", titre: "les Chenaux", machine: "docks", acte: 2, image: "loc_chenaux.gif", etapes: ["n8_reseau", "n8_isole"],
	  intro: "Les Chenaux, vus de la passerelle : des quais reliés par des passages d'eau, des bouées, des barques, une écluse. Chaque chenal décide qui peut rejoindre qui (les réseaux des conteneurs)." },
	{ cle: "chantier", nom: "ChantierNaval", maitre: "Eden", titre: "le Chantier naval", machine: "docks", acte: 3, image: "loc_chantier_naval.gif", etapes: ["n8_dockerfile", "n8_contexte"],
	  intro: "Le Chantier naval : une coque sur ses tins, l'avant déjà bordé, l'arrière encore en squelette, et la gerbe bleue d'une soudure sur l'échafaudage. Ici, on dessine ses propres plans (le Dockerfile, docker build)." },
	{ cle: "cales", nom: "Cales", maitre: "Megane", titre: "les Cales", machine: "docks", acte: 3, image: "loc_cales.gif", etapes: ["n8_cache", "n8_couches_propres"],
	  intro: "Les Cales : un navire en coupe, cinq ponts empilés et numérotés, le plus neuf en haut, peint de vert. Chaque instruction pose une cale, et l'ordre des cales fait la vitesse du chantier (les couches et le cache)." },
	{ cle: "maitres", nom: "ChantierDesMaitres", maitre: "Jahmal", titre: "le Chantier des maîtres", machine: "docks", acte: 3, image: "loc_chantier_maitres.gif", etapes: ["n8_etages", "n8_sante"],
	  intro: "Le Chantier des maîtres : à gauche un atelier encombré où l'on forge, à droite un petit navire fin qui part seul vers la mer, sans les outils. Ici, on construit en plusieurs étapes (multi-stage), et l'on apprend à un navire à dire s'il va bien (HEALTHCHECK)." },
	{ cle: "registre", nom: "RegistreDuPort", maitre: "Déborah", titre: "le Registre du port", machine: "entrepot", acte: 3, image: "loc_registre_port.gif", etapes: ["n8_registre", "n8_push"],
	  intro: "Le Registre du port : un entrepôt grillagé marqué « :5000 », des rayonnages de plans scellés, un cadenas, une guérite. C'est ici que l'école range ses plans, et nulle part ailleurs (le registre privé, machine entrepot)." },
	{ cle: "feuille", nom: "FeuilleDeRoute", maitre: "Elias", titre: "la Feuille de route", machine: "docks", acte: 4, image: "loc_feuille_route.gif", etapes: ["n8_compose", "n8_ordre"],
	  intro: "La Feuille de route : une table à cartes, un compas, et le tracé d'un convoi de quatre navires qui partent ensemble, dans le bon ordre (docker compose)." },
	{ cle: "vigie", nom: "Vigie", maitre: "Remi", titre: "la Vigie", machine: "docks", acte: 4, image: "loc_vigie_port.gif", etapes: ["n8_redemarrage", "n8_journaux"],
	  intro: "La Vigie : un nid de pie au sommet du grand mât, une longue-vue, et tout en bas le port minuscule. D'ici, on voit qui tombe, qui se relève, qui mange trop de vivres (l'exploitation : redémarrages, limites, journaux)." },
	{ cle: "armurerie", nom: "Armurerie", maitre: "Ian", titre: "l'Armurerie", machine: "docks", acte: 5, image: "loc_armurerie.gif", etapes: ["n8_armure", "n8_secrets"],
	  intro: "L'Armurerie : des boucliers cadenassés aux murs, des chaînes, et sur l'établi un conteneur qu'on blinde plaque par plaque (le durcissement : utilisateur, lecture seule, capacités, secrets)." },
	{ cle: "douane", nom: "Douane", maitre: "Soufiane", titre: "la Douane", machine: "douane", acte: 5, image: "loc_douane.gif", etapes: ["n8_quarantaine", "n8_autopsie"],
	  intro: "La Douane : sous l'auvent, un conteneur noir pris à un éclaireur de la flotte, scellé d'un sceau étranger, entouré d'un cordon. Un pavillon à damier, une lampe d'inspection, une loupe, une liste d'indices. Ici, on lit l'ennemi sans jamais le lancer (la quarantaine, machine douane)." },
	{ cle: "escadre", nom: "Escadre", maitre: "Arnaud", titre: "l'Escadre", machine: "docks", acte: 6, image: "loc_escadre.gif", etapes: ["n8_swarm", "n8_service", "n8_maj", "n8_stack"],
	  intro: "L'Escadre : cinq navires en formation, reliés par des signaux, une drisse de pavillons qui claque au vent. Ici, plusieurs machines deviennent une seule flotte (swarm, services, stacks)." }
];
QUAIS_CH8.forEach(function(q){
	q.lieu = salleCh8(q.nom, q.intro, q.image);
	link_rooms(GrandPortCh8, q.lieu);
});
function quaiCh8(cle){ return QUAIS_CH8.filter(function(q){ return q.cle === cle; })[0]; }
function quaiDeMaitreCh8(nom){ return QUAIS_CH8.filter(function(q){ return q.maitre === nom; })[0] || null; }

/* La boîte de Laurent : on y dépose le rapport de bataille. */
var BoiteGrandPortCh8 = salleCh8("BoiteDeLaurent", "Une boîte de fer peint, rivée au pied de la grande grue. On y dépose le rapport de bataille, à l'intention de Laurent.", "item_box.gif");
BoiteGrandPortCh8.mode = "rwxrwxrwt";
BoiteGrandPortCh8.owner = "laurent";
BoiteGrandPortCh8.horsBareme = true;
link_rooms(GrandPortCh8, BoiteGrandPortCh8);

/* Le Grand Port s'ouvre depuis le quai de Port-Aube ; au départ direct, depuis l'Embarcadère. */
function relierGrandPortCh8(){
	var parent = (state.has("ch7Ouvert") && !state.has("ch7ApresCh8")) || !state.has("ch8Direct") ? HallPortAube : Embarcadere;
	if (parent === Embarcadere && Cybersup.children.indexOf(Embarcadere) === -1) relier(Cybersup, Embarcadere);
	if (parent === HallPortAube && Cybersup.children.indexOf(Embarcadere) === -1) relier(Cybersup, Embarcadere);
	if (parent.children.indexOf(GrandPortCh8) === -1) relier(parent, GrandPortCh8);
}

/* ------------------------------------------------------------------ */
/* Les sorts du chapitre                                               */
/* ------------------------------------------------------------------ */

var ORDRE_DES_SORTS_9 = (function(){
	var autres = [].concat(typeof ORDRE_DES_SORTS !== "undefined" ? ORDRE_DES_SORTS : [], typeof ORDRE_DES_SORTS_2 !== "undefined" ? ORDRE_DES_SORTS_2 : [],
		typeof ORDRE_DES_SORTS_3 !== "undefined" ? ORDRE_DES_SORTS_3 : [], typeof ORDRE_DES_SORTS_5 !== "undefined" ? ORDRE_DES_SORTS_5 : [],
		typeof ORDRE_DES_SORTS_6 !== "undefined" ? ORDRE_DES_SORTS_6 : [], typeof ORDRE_DES_SORTS_7 !== "undefined" ? ORDRE_DES_SORTS_7 : [],
		typeof ORDRE_DES_SORTS_8 !== "undefined" ? ORDRE_DES_SORTS_8 : [], SORTS_ANNEXES_PORT);
	return SORTS_PORT.filter(function(s, i){ return SORTS_PORT.indexOf(s) === i && autres.indexOf(s) === -1 && MANUEL[s]; });
})();
ORDRE_DES_SORTS_9.forEach(function(s){ if (MANUEL[s]) delete MANUEL[s].horsBareme; });

/* Qui enseigne quel sort (les maîtres sont posés dans Port.js). */
var SORTS_DES_QUAIS_CH8 = { premiers: ["docker", "ctr"], registre: ["htpasswd"], vigie: ["dockerd"] };

/* ------------------------------------------------------------------ */
/* Les rangs : de Mousse à Amiral                                       */
/* ------------------------------------------------------------------ */

var RANGS_CH8 = [
	{ nom: "Mousse", galon: "galon_mousse", image: null },
	{ nom: "Matelot", galon: "galon_matelot", image: "rang_matelot.gif" },
	{ nom: "Quartier-maître", galon: "galon_quartier_maitre", image: "rang_quartier_maitre.gif" },
	{ nom: "Second", galon: "galon_second", image: "rang_second.gif" },
	{ nom: "Capitaine", galon: "galon_capitaine", image: "rang_capitaine.gif" },
	{ nom: "Amiral", galon: "galon_amiral", image: "rang_amiral.gif" }
];
function rangCh8(){ var r = sCh8().rang; return typeof r === "number" ? r : 0; }
function nomRangCh8(r){ return RANGS_CH8[r === undefined ? rangCh8() : r].nom; }

/* Les six actes : les étapes de chaque acte ouvrent son épreuve de rang ; l'épreuve donne le rang suivant. */
var ACTES_CH8 = [
	{ n: 1, titre: "Le Mousse", etapes: ["n8_demon", "n8_premier", "n8_cycle", "n8_dedans", "n8_menage", "n8_images", "n8_couches"], epreuve: "n8_rang1", nomEpreuve: "La caisse qui ne démarre pas" },
	{ n: 2, titre: "Le Matelot", etapes: ["n8_volume", "n8_montage", "n8_sauvegarde", "n8_reseau", "n8_isole"], epreuve: "n8_rang2", nomEpreuve: "Le convoi muet" },
	{ n: 3, titre: "Le Quartier-maître", etapes: ["n8_dockerfile", "n8_contexte", "n8_cache", "n8_couches_propres", "n8_etages", "n8_sante", "n8_registre", "n8_push"], epreuve: "n8_rang3", nomEpreuve: "Le plan trop lourd" },
	{ n: 4, titre: "Le Second", etapes: ["n8_compose", "n8_ordre", "n8_redemarrage", "n8_journaux"], epreuve: "n8_rang4", nomEpreuve: "La tempête dans le convoi" },
	{ n: 5, titre: "Le Capitaine", etapes: ["n8_armure", "n8_secrets", "n8_quarantaine", "n8_autopsie"], epreuve: "n8_rang5", nomEpreuve: "Le cheval de bois" },
	{ n: 6, titre: "L'Amiral", etapes: ["n8_swarm", "n8_service", "n8_maj", "n8_stack"], epreuve: null, nomEpreuve: "La bataille de l'aube" }
];
function acteCh8(n){ return ACTES_CH8[n - 1]; }
function acteDeEtapeCh8(id){ for (var i = 0; i < ACTES_CH8.length; i++) if (ACTES_CH8[i].etapes.indexOf(id) > -1 || ACTES_CH8[i].epreuve === id) return ACTES_CH8[i].n; return 1; }
function epreuveOuverteCh8(n){ var e = sCh8().epreuves || {}; return e[n] !== undefined && e[n] !== null; }

/* ------------------------------------------------------------------ */
/* Les étapes                                                          */
/* ------------------------------------------------------------------ */

var QUETES_CH8 = [
	{ id: "n8_quai", titre: "Entrer dans le Grand Port",
	  indice: "Le Grand Port est au bout du quai de Port-Aube : cd ~/Cybersup/Embarcadere/PortAube, puis cd GrandPort (au départ direct : cd ~/Cybersup/Embarcadere/GrandPort)." },
	{ id: "n8_port", titre: "Écouter Laurent, lire l'Ordre de mission, déployer le plan du port",
	  indice: "Au pied de la grande grue : cat Laurent, cat Ordre, puis port (une commande du jeu) : le plan des quais, l'heure, ton rang, et la puissance de ta flotte." },
	{ id: "n8_demon", titre: "Quai des Premiers Pas : le démon docker, et l'équipage qui a le droit de lui parler",
	  indice: "Quai des Premiers Pas (Kylian). Sur docks : systemctl status docker, puis docker ps (refusé) ; sudo usermod -aG docker TOI, exit, ssh docks, et docker info sans sudo." },
	{ id: "n8_premier", titre: "Quai des Premiers Pas : la première caisse, et un shell jetable",
	  indice: "docker run hello-world ; docker run -it --rm alpine:3.20 sh (puis exit) ; docker ps -a pour voir les caisses arrêtées." },
	{ id: "n8_cycle", titre: "Capitainerie : la vigie du port, en fond, publiée sur 8080",
	  indice: "Capitainerie (Julien). docker run -d --name vigie -p 8080:80 nginx:1.27-alpine ; curl localhost:8080 ; docker logs vigie ; docker stop vigie puis docker start vigie." },
	{ id: "n8_dedans", titre: "Capitainerie : entrer dans la caisse, et la lire de l'extérieur",
	  indice: "docker exec vigie (une commande, ou -it sh) ; docker inspect -f '{{.State.Status}}' vigie ; docker top vigie." },
	{ id: "n8_menage", titre: "Capitainerie : une variable passée à la caisse, et le quai nettoyé",
	  indice: "docker run --rm -e QUAI=8 alpine:3.20 printenv QUAI ; puis plus aucune caisse arrêtée sur docks : docker container prune (l'épave comprise)." },
	{ id: "n8_images", titre: "Entrepôt des plans : un plan, deux noms, et son empreinte",
	  indice: "Entrepôt des plans (Grégoire). docker tag alpine:3.20 alpine:quai-8 ; docker images (le même IMAGE ID deux fois) ; docker rmi alpine:quai-8 (le tag seulement) ; docker images --digests." },
	{ id: "n8_couches", titre: "Entrepôt des plans : les couches d'un plan, la place prise, les plans sans nom balayés",
	  indice: "docker history nginx:1.27-alpine ; docker system df ; docker image prune (les <none> de l'ancien équipage)." },
	{ id: "n8_rang1", titre: "ÉPREUVE DE RANG I : la caisse qui ne démarre pas (rang Matelot)",
	  indice: "Épreuve de rang : lis, mesure, répare. La caisse cargaison doit répondre « Caisse ouverte » sur docks:8081." },
	{ id: "n8_volume", titre: "Soutes : une soute nommée, qui survit à la caisse",
	  indice: "Soutes (Chahla). docker volume create cales ; un conteneur y écrit manifeste.txt (-v cales:/cales) puis disparaît (--rm) ; un autre conteneur le relit." },
	{ id: "n8_montage", titre: "Soutes : un dossier du quai monté dans la caisse, et la lecture seule",
	  indice: "Un dossier de docks monté (-v ~/vitrine:/usr/share/nginx/html:ro) et servi par nginx ; une écriture refusée sur le montage :ro (Read-only file system)." },
	{ id: "n8_sauvegarde", titre: "Soutes : la soute mise en caisse (une sauvegarde de volume)",
	  indice: "docker run --rm -v cales:/cales -v ~/sauvegardes:/sauve alpine:3.20 tar czf /sauve/cales.tgz -C /cales . ; puis tar -tzf ~/sauvegardes/cales.tgz sur docks." },
	{ id: "n8_reseau", titre: "Chenaux : un chenal à soi, où les caisses se trouvent par leur nom",
	  indice: "Chenaux (Adonis). docker network create chenal ; deux conteneurs --network chenal ; l'un joint l'autre par son nom (docker exec ... wget -qO- NOM) ; docker network inspect chenal." },
	{ id: "n8_isole", titre: "Chenaux : une caisse sans chenal, et un port qui ne regarde que le quai",
	  indice: "docker run --rm --network none alpine:3.20 ip a ; un nginx publié sur -p 127.0.0.1:8084:80 ; curl localhost:8084 sur docks, puis le même depuis entrepot : refusé." },
	{ id: "n8_rang2", titre: "ÉPREUVE DE RANG II : le convoi muet (rang Quartier-maître)",
	  indice: "Épreuve de rang : lis, mesure, répare. convoi-app doit répondre « 12 cargaisons » sur docks:8082, et la base doit garder sa mémoire." },
	{ id: "n8_dockerfile", titre: "Chantier naval : le plan de l'école, dessiné par toi (ecole:1.0)",
	  indice: "Chantier naval (Eden). Réécris ~/ecole/Dockerfile (FROM, WORKDIR, COPY, RUN, EXPOSE, CMD en forme exec) ; docker build -t ecole:1.0 . ; un conteneur publié sur 8000 qui répond." },
	{ id: "n8_contexte", titre: "Chantier naval : un contexte léger (.dockerignore) et un argument de construction",
	  indice: "Un .dockerignore (.git, secrets, data) : le contexte tombe sous 10 Mo ; ARG VERSION et ENV VERSION=$VERSION, puis docker build --build-arg VERSION=1.0." },
	{ id: "n8_cache", titre: "Cales : une ligne de code changée, et pip reste en cache",
	  indice: "Cales (Megane). COPY requirements.txt, RUN pip install, puis COPY . . : change app.py, reconstruis, et regarde CACHED sur pip." },
	{ id: "n8_couches_propres", titre: "Cales : curl à bord, sans laisser les listes d'apt dans une cale",
	  indice: "RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/* : une seule couche, propre." },
	{ id: "n8_etages", titre: "Chantier des maîtres : le phare construit en deux étapes, sous 30 Mo",
	  indice: "Chantier des maîtres (Jahmal). ~/phare : FROM debian:12 AS build ... RUN make, puis FROM scratch et COPY --from=build ; docker build -t phare:1.0 . ; un conteneur qui répond." },
	{ id: "n8_sante", titre: "Chantier des maîtres : un navire qui dit s'il va bien (HEALTHCHECK, LABEL)",
	  indice: "Dans le Dockerfile de l'école : HEALTHCHECK CMD curl -fs localhost:8000/ || exit 1, et un LABEL ; un conteneur healthy ; docker inspect -f '{{.State.Health.Status}}'." },
	{ id: "n8_registre", titre: "Registre du port : l'entrepôt des plans de l'école, gardé",
	  indice: "Registre du port (Déborah), sur entrepot. htpasswd -Bbn ... > /srv/registre/auth/htpasswd ; docker run -d registry:2 sur 5000, un volume sur /var/lib/registry, REGISTRY_AUTH=htpasswd ; curl /v2/ : 401." },
	{ id: "n8_push", titre: "Registre du port : le plan de l'école poussé, puis tiré ailleurs, par son empreinte",
	  indice: "Sur docks : insecure-registries dans /etc/docker/daemon.json, restart ; docker login ; docker tag puis docker push entrepot.port-aube.lan:5000/ecole:1.0. Sur navire1 : login, pull, puis run par @sha256:... ; un logout." },
	{ id: "n8_rang3", titre: "ÉPREUVE DE RANG III : le plan trop lourd (rang Second)",
	  indice: "Épreuve de rang : lis, mesure, répare. ~/carto : une image carto sous 250 Mo, et un carto.py changé qui ne réinstalle pas les dépendances." },
	{ id: "n8_compose", titre: "Feuille de route : la pile de l'école en convoi (web, app, base, cache)",
	  indice: "Feuille de route (Elias). ~/ecole/compose.yaml : quatre services, un volume nommé pour la base, les secrets en fichier ; docker compose config ; docker compose up -d ; curl localhost/sante." },
	{ id: "n8_ordre", titre: "Feuille de route : l'ordre du convoi, deux répliques, et la mémoire qui tient",
	  indice: "healthcheck sur base, depends_on base: condition: service_healthy, env_file ; docker compose up -d --scale app=2 ; docker compose logs ; une inscription, puis down et up : elle est toujours là." },
	{ id: "n8_redemarrage", titre: "Vigie : un convoi qui se relève seul, et des vivres limités",
	  indice: "Vigie (Remi). restart: unless-stopped sur les quatre ; mem_limit sur app ; sudo systemctl restart docker : tout revient ; docker stats --no-stream." },
	{ id: "n8_journaux", titre: "Vigie : des journaux qui tournent, et le grand ménage sans rien perdre",
	  indice: "logging json-file avec max-size sur web et app ; docker events --since 1h --filter type=container ; docker system prune sans toucher au volume de la base." },
	{ id: "n8_rang4", titre: "ÉPREUVE DE RANG IV : la tempête dans le convoi (rang Capitaine)",
	  indice: "Épreuve de rang : lis, mesure, répare. ~/tempete : docker compose up -d, puis trois fautes dans compose.yaml." },
	{ id: "n8_armure", titre: "Armurerie : l'appli de l'école, blindée",
	  indice: "Armurerie (Ian). Pour app : user non root, read_only: true avec tmpfs /tmp, cap_drop: [ALL], security_opt: [no-new-privileges:true] ; healthy ; une écriture refusée dedans." },
	{ id: "n8_secrets", titre: "Armurerie : aucun mot de passe à l'air, et le sonar désarmé",
	  indice: "Les mots de passe en fichiers (*_FILE, /run/secrets) pour base et app ; plus aucun conteneur ne monte /var/run/docker.sock (le sonar de l'ancien équipage)." },
	{ id: "n8_quarantaine", titre: "Douane : lire l'image de l'éclaireur sans la lancer",
	  indice: "Douane (Soufiane), sur douane. docker image inspect eclaireur:prise ; docker history --no-trunc eclaireur:prise ; puis ~/douane/indices.txt : le fichier-témoin, l'ENTRYPOINT, les initiales du Label." },
	{ id: "n8_autopsie", titre: "Douane : l'autopsie, couche par couche, sans jamais démarrer",
	  indice: "docker save -o eclaireur.tar eclaireur:prise ; tar xf ; jq sur manifest.json ; tar -tf d'une couche ; docker create, docker cp du fichier-témoin, docker diff ; sha256sum." },
	{ id: "n8_rang5", titre: "ÉPREUVE DE RANG V : le cheval de bois (rang Amiral)",
	  indice: "Épreuve de rang : lis, mesure, répare. Pendant la nuit, nginx:1.27-alpine a changé d'empreinte sur le registre du continent." },
	{ id: "n8_swarm", titre: "Escadre : docks prend le commandement, trois navires rejoignent",
	  indice: "Escadre (Arnaud). docker swarm init sur docks ; docker swarm join --token ... sur navire1, navire2, navire3 ; docker node ls." },
	{ id: "n8_service", titre: "Escadre : un service réparti sur la flotte",
	  indice: "docker service create --name app --replicas 3 --with-registry-auth -p 8000:8000 entrepot.port-aube.lan:5000/ecole:1.0 ; docker service scale ; docker service ps." },
	{ id: "n8_maj", titre: "Escadre : une mise à jour progressive, puis le retour arrière",
	  indice: "docker service update --image ... --update-parallelism 1 --update-delay 10s ; puis docker service rollback." },
	{ id: "n8_stack", titre: "Escadre : la flotte de l'école déployée (stack ecole)",
	  indice: "docker secret create db_password - ; un fichier de pile (web, app à 3 répliques, base contrainte à un navire, cache, le secret external) ; docker stack deploy -c ... --with-registry-auth ecole." },
	{ id: "n8_flotte", titre: "La bataille : tenir le port pendant que la flotte noire attaque",
	  indice: "La flotte noire est là : port, pour voir chaque quai. Si l'assaut de l'aube a frappé, répare ce qu'il a coulé." },
	{ id: "n8_naufrage", titre: "La bataille : un navire sombre, l'escadre se referme",
	  indice: "navire2 ne répond plus : docker node ls (Down) ; docker node update --availability drain navire2 ; toutes les répliques en marche ailleurs." },
	{ id: "n8_piege", titre: "La bataille : la mise à jour piégée, refusée",
	  indice: "Un automate pousse ecole_app vers ecole:1.1. Regarde son empreinte (docker service inspect, docker service ps --no-trunc), puis docker service rollback ecole_app." },
	{ id: "n8_puissance", titre: "La flotte au-dessus de 90",
	  indice: "Après la bataille, port doit afficher une puissance d'au moins 90 : il dit ce qui manque encore." },
	{ id: "n8_rapport", titre: "Le rapport de bataille, remis à Laurent",
	  indice: "~/grand-port/rapport.txt (dans ta Maison) : les quais, la flotte, l'escadre, le piège (avec son empreinte), ce qui reste, et la puissance finale ; puis une copie dans la BoiteDeLaurent du Grand Port." }
];
var QUETES_SECONDAIRES_CH8 = [];   // les défis des maîtres et de Laurent : Port.js

var INDICES_CH8 = {
	n8_quai: ["Le Grand Port est au bout du quai de Port-Aube.", "cd ~/Cybersup/Embarcadere/PortAube ; cd GrandPort"],
	n8_port: ["Laurent et l'Ordre sont au pied de la grande grue ; port est une commande du jeu.", "cat Laurent ; cat Ordre ; port"],
	n8_demon: ["Le socket du démon appartient à root et au groupe docker. Un groupe se lit à la connexion : il faut une nouvelle session.", "ssh docks ; systemctl status docker ; sudo usermod -aG docker $(whoami) ; exit ; ssh docks ; docker info"],
	n8_premier: ["-it donne un terminal, --rm efface la caisse à la sortie.", "docker run hello-world ; docker run -it --rm alpine:3.20 sh (dedans : cat /etc/os-release, puis exit) ; docker ps -a"],
	n8_cycle: ["-d en fond, --name pour la nommer, -p PORT_HOTE:PORT_CONTENEUR pour la publier.", "docker run -d --name vigie -p 8080:80 nginx:1.27-alpine ; curl -s localhost:8080 ; docker logs vigie ; docker stop vigie ; docker start vigie"],
	n8_dedans: ["exec entre dans une caisse qui tourne ; inspect la lit ; top montre ses processus.", "docker exec vigie ls /usr/share/nginx/html ; docker inspect -f '{{.State.Status}}' vigie ; docker top vigie"],
	n8_menage: ["-e passe une variable ; printenv la relit de l'intérieur. prune balaie toutes les caisses arrêtées.", "docker run --rm -e QUAI=8 alpine:3.20 printenv QUAI ; docker container prune -f ; docker ps -a"],
	n8_images: ["Un tag n'est qu'un nom de plus sur le même plan ; rmi d'un tag parmi d'autres ne retire que le nom.", "docker tag alpine:3.20 alpine:quai-8 ; docker images ; docker rmi alpine:quai-8 ; docker images --digests"],
	n8_couches: ["Les <none> sont des plans sans nom, laissés par l'ancien équipage.", "docker history nginx:1.27-alpine ; docker system df ; docker image prune -f"],
	n8_rang1: ["Trois fautes se cachent : un port déjà pris par un squatteur, un programme mal nommé dans le CMD, une variable que le code exige.", "docker ps -a ; docker inspect -f '{{.State.ExitCode}} {{.State.Error}}' cargaison ; docker logs cargaison ; docker rm -f squatteur ; corrige pyhton dans ~/caisse/Dockerfile, docker build -t cargaison:1.1 . ; docker rm cargaison ; docker run -d --name cargaison -p 8081:8081 -e QUAI=8 cargaison:1.1 ; curl localhost:8081"],
	n8_volume: ["Un volume nommé vit hors de toute caisse : il survit à leur suppression.", "docker volume create cales ; docker run --rm -v cales:/cales alpine:3.20 sh -c 'echo 12 caisses > /cales/manifeste.txt' ; docker run --rm -v cales:/cales alpine:3.20 cat /cales/manifeste.txt"],
	n8_montage: ["Un chemin de l'hôte dans -v, c'est un montage (bind) ; :ro le met en lecture seule.", "mkdir ~/vitrine ; echo bonjour > ~/vitrine/index.html ; docker run -d --name vitrine -p 8083:80 -v ~/vitrine:/usr/share/nginx/html:ro nginx:1.27-alpine ; curl localhost:8083 ; docker exec vitrine touch /usr/share/nginx/html/x"],
	n8_sauvegarde: ["Une caisse jetable monte la soute ET un dossier du quai, et tar fait le reste.", "mkdir -p ~/sauvegardes ; docker run --rm -v cales:/cales -v ~/sauvegardes:/sauve alpine:3.20 tar czf /sauve/cales.tgz -C /cales . ; tar -tzf ~/sauvegardes/cales.tgz"],
	n8_reseau: ["Sur le pont par défaut, pas de noms ; sur un réseau à soi, le DNS de docker les donne.", "docker network create chenal ; docker run -d --name phare-nord --network chenal nginx:1.27-alpine ; docker run -d --name phare-sud --network chenal alpine:3.20 sleep infinity ; docker exec phare-sud wget -qO- phare-nord ; docker network inspect chenal"],
	n8_isole: ["127.0.0.1: devant le port publié, et seul docks peut l'atteindre.", "docker run --rm --network none alpine:3.20 ip a ; docker run -d --name guichet -p 127.0.0.1:8084:80 nginx:1.27-alpine ; curl -s localhost:8084 ; exit ; ssh entrepot ; curl -s -m 2 docks:8084"],
	n8_rang2: ["L'appli cherche sa base sur localhost (c'est elle-même), les deux sont sur le pont par défaut (pas de noms), et la base n'a ni volume ni registre initialisé.", "docker network create convoi ; docker rm -f convoi-app convoi-base ; docker run -d --name convoi-base --network convoi -v convoi-donnees:/var/lib/postgresql/data -v ~/convoi/init.sql:/docker-entrypoint-initdb.d/init.sql:ro -e POSTGRES_USER=convoi -e POSTGRES_PASSWORD=Convoi-du-Matin -e POSTGRES_DB=convoi postgres:16-alpine ; docker run -d --name convoi-app --network convoi -p 8082:8000 -e DB_HOST=convoi-base -e DB_USER=convoi -e DB_PASSWORD=Convoi-du-Matin -e DB_NAME=convoi convoi-app:1.0 ; curl localhost:8082"],
	n8_dockerfile: ["La forme exec, c'est un tableau JSON : CMD [\"python\", \"app.py\"].", "Dans ~/ecole : FROM python:3.12-slim, WORKDIR /app, COPY requirements.txt ., RUN pip install --no-cache-dir -r requirements.txt, COPY . ., EXPOSE 8000, CMD [\"python\", \"app.py\"] ; docker build -t ecole:1.0 . ; docker run -d --name ecole-essai -p 8000:8000 ecole:1.0 ; curl -s localhost:8000/"],
	n8_contexte: ["Tout le dossier part au démon (le contexte) : .dockerignore en retire ce qui ne doit pas monter à bord.", "printf '.git\\nsecrets\\ndata\\n' > .dockerignore ; dans le Dockerfile : ARG VERSION=1.0 puis ENV VERSION=$VERSION ; docker build --build-arg VERSION=1.0 -t ecole:1.0 ."],
	n8_cache: ["Une cale changée invalide toutes les cales au-dessus. Ce qui bouge souvent se copie en dernier.", "COPY requirements.txt . puis RUN pip install puis COPY . . ; echo '# retouche' >> app.py ; docker build -t ecole:1.0 . : pip est CACHED"],
	n8_couches_propres: ["Une couche ne s'efface jamais : ce qu'on supprime dans un RUN suivant pèse toujours.", "RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*"],
	n8_etages: ["La première étape forge, la dernière part en mer : COPY --from emporte seulement le binaire.", "Dans ~/phare : FROM debian:12 AS build, RUN apt-get update && apt-get install -y gcc make libc6-dev, WORKDIR /src, COPY . ., RUN make, puis FROM scratch, COPY --from=build /src/phare /phare, CMD [\"/phare\"] ; docker build -t phare:1.0 . ; docker run -d --name phare -p 8085:8080 phare:1.0 ; curl localhost:8085"],
	n8_sante: ["HEALTHCHECK lance une commande dans la caisse, régulièrement : 0, elle va bien.", "HEALTHCHECK --interval=10s CMD curl -fs localhost:8000/ || exit 1 et LABEL org.opencontainers.image.title=ecole dans le Dockerfile ; docker build -t ecole:1.0 . ; un conteneur ; docker inspect -f '{{.State.Health.Status}}' NOM"],
	n8_registre: ["registry:2 lit REGISTRY_AUTH=htpasswd, REGISTRY_AUTH_HTPASSWD_REALM et REGISTRY_AUTH_HTPASSWD_PATH ; ses plans vivent dans /var/lib/registry.", "ssh entrepot ; htpasswd -Bbn douanier MOTDEPASSE | sudo tee /srv/registre/auth/htpasswd ; docker run -d --name registre --restart always -p 5000:5000 -v registre-donnees:/var/lib/registry -v /srv/registre/auth:/auth:ro -e REGISTRY_AUTH=htpasswd -e REGISTRY_AUTH_HTPASSWD_REALM=entrepot -e REGISTRY_AUTH_HTPASSWD_PATH=/auth/htpasswd registry:2 ; curl -s -o /dev/null -w '%{http_code}' localhost:5000/v2/"],
	n8_push: ["Sans TLS, le démon refuse le registre tant qu'il ne figure pas dans insecure-registries. Un tag porte le nom du registre.", "Sur docks : la clé insecure-registries dans /etc/docker/daemon.json, sudo systemctl restart docker, docker login entrepot.port-aube.lan:5000, docker tag ecole:1.0 entrepot.port-aube.lan:5000/ecole:1.0, docker push ; sur navire1 : groupe docker, login, docker pull, docker run -d par @sha256:..., docker logout"],
	n8_rang3: ["Trois poids morts : l'image python complète, les 182 Mo de relevés copiés dans le contexte, et COPY . . avant pip.", "Dans ~/carto : printf 'donnees\\n' > .dockerignore ; FROM python:3.12-slim, COPY requirements.txt ., RUN pip install --no-cache-dir -r requirements.txt, COPY carto.py . ; docker build -t carto:1.1 . ; echo '# maree' >> carto.py ; docker build -t carto:1.2 ."],
	n8_compose: ["Le nom du projet, c'est le nom du dossier ; les services se trouvent par leur nom sur le réseau du projet.", "Dans ~/ecole, un compose.yaml (web nginx:1.27-alpine sur 80 avec web/default.conf, app avec build et image ecole:1.0, base postgres:16-alpine sur un volume, cache redis:7-alpine, secrets) ; docker compose config ; docker compose up -d ; curl -s localhost/sante"],
	n8_ordre: ["depends_on court attend seulement le démarrage ; condition: service_healthy attend le bilan de santé.", "healthcheck pg_isready sur base ; depends_on base condition service_healthy ; env_file config/app.env ; docker compose up -d --scale app=2 ; docker compose logs app ; curl -X POST -d prenom=aron localhost/inscriptions ; docker compose down ; docker compose up -d ; curl localhost/inscriptions"],
	n8_redemarrage: ["Une politique de redémarrage fait revenir la caisse après une chute ET après un redémarrage du démon.", "restart: unless-stopped sur les quatre services, mem_limit: 256m sur app ; docker compose up -d ; sudo systemctl restart docker ; docker compose ps ; docker stats --no-stream"],
	n8_journaux: ["max-size fait tourner le journal d'une caisse ; system prune retire ce qui ne sert plus, mais jamais un volume sans --volumes.", "logging: driver json-file, options max-size: \"10m\" sur web et app ; docker compose up -d ; docker events --since 1h --until 0s --filter type=container ; docker system prune -f"],
	n8_rang4: ["Trois fautes : pg_isready sur le mauvais port, un cache affamé (mem_limit 8m), et l'appli qui n'attend plus la santé de la base.", "Dans ~/tempete : sed -i 's/ -p 5433//' compose.yaml ; sed -i 's/mem_limit: 8m/mem_limit: 256m/' compose.yaml ; app : depends_on base condition service_healthy ; docker compose up -d ; docker compose ps"],
	n8_armure: ["Chaque plaque d'armure est une option : user, read_only (et un tmpfs où l'appli écrit), cap_drop, security_opt.", "Dans compose.yaml, pour app : user: \"1000\", read_only: true, tmpfs: [/tmp], cap_drop: [ALL], security_opt: [no-new-privileges:true] ; docker compose up -d ; docker compose exec app touch /app/x"],
	n8_secrets: ["Un mot de passe en variable se lit dans docker inspect ; un secret est un fichier monté dans /run/secrets. Le socket du démon dans une caisse, c'est root sur le port.", "POSTGRES_PASSWORD_FILE et DB_PASSWORD_FILE vers /run/secrets/db_password, secrets: db_password: file: ./secrets/db_password.txt ; docker compose up -d ; docker rm -f sonar"],
	n8_quarantaine: ["On lit une image sans la lancer : inspect, history. La Douane n'a aucune route vers l'extérieur.", "ssh douane ; docker image inspect eclaireur:prise ; docker history --no-trunc eclaireur:prise ; puis dans ~/douane/indices.txt : /usr/local/share/flotte/temoin.txt, l'ENTRYPOINT (/etc/profile.d/flotte.sh), P.G."],
	n8_autopsie: ["docker save sort l'image en archive ; create fabrique une caisse sans la démarrer ; cp en sort un fichier ; diff dit ce qui a bougé (rien : elle n'a jamais tourné).", "docker save -o eclaireur.tar eclaireur:prise ; tar xf eclaireur.tar ; jq '.[0].Layers' manifest.json ; tar -tf blobs/sha256/EMPREINTE ; docker create --name autopsie eclaireur:prise ; docker cp autopsie:/usr/local/share/flotte/temoin.txt . ; docker diff autopsie ; sha256sum temoin.txt"],
	n8_rang5: ["Le tag nginx:1.27-alpine ne promet rien : seule l'empreinte (le digest) est un sceau. Compare l'ancienne et la nouvelle, puis épingle l'ancienne.", "docker images --digests nginx ; dans ~/ecole/compose.yaml : image: nginx:1.27-alpine@sha256:ANCIENNE ; docker compose up -d ; docker rmi nginx:1.27-alpine (la piégée) ; docker compose ps"],
	n8_swarm: ["init donne le jeton ; chaque navire le présente au gestionnaire (port 2377).", "docker swarm init --advertise-addr 10.0.80.10 ; sur chaque navire : groupe docker, puis docker swarm join --token JETON docks:2377 ; docker node ls"],
	n8_service: ["--with-registry-auth donne aux navires les identifiants du registre.", "docker service create --name app --replicas 3 --with-registry-auth -p 8000:8000 entrepot.port-aube.lan:5000/ecole:1.0 ; docker service scale app=4 ; docker service ps app"],
	n8_maj: ["parallelism 1 : un navire à la fois ; delay : une pause entre deux.", "docker service update --image entrepot.port-aube.lan:5000/ecole:1.0 --env-add VERSION=1.0.1 --update-parallelism 1 --update-delay 10s app ; docker service rollback app"],
	n8_stack: ["Une pile, c'est un fichier compose déployé sur l'escadre : deploy.replicas, deploy.placement.constraints, secrets external.", "printf 'MOTDEPASSE\\n' | docker secret create db_password - ; un pile.yaml ; docker stack deploy -c pile.yaml --with-registry-auth ecole ; docker stack services ecole"],
	n8_flotte: ["port dit, quai par quai, ce que la flotte a frappé.", "port ; si le registre de l'entrepôt a coulé : ssh entrepot ; docker start registre"],
	n8_naufrage: ["Un navire Down garde ses tâches fantômes : on le draine pour que l'ordonnanceur l'oublie.", "docker node ls ; docker node update --availability drain navire2 ; docker service ls"],
	n8_piege: ["Le tag 1.1 n'est pas le tien : son empreinte n'est pas celle de l'école.", "docker service inspect --pretty ecole_app ; docker service ps --no-trunc ecole_app ; docker service rollback ecole_app"],
	n8_puissance: ["port, n'importe où, dit ce qui manque encore.", "port"],
	n8_rapport: ["Un here-document écrit le rapport d'un coup ; cp le dépose.", "mkdir -p ~/grand-port ; cat > ~/grand-port/rapport.txt <<'FIN' ... FIN ; cp ~/grand-port/rapport.txt CHEMIN_DU_GRAND_PORT/BoiteDeLaurent"]
};

/* La radio de Grace : un conseil par étape. */
var CONSEILS_CH8 = {
	n8_port: "Ici la WarRoom, Mousse. Bienvenue au Grand Port. Écoute Laurent, lis l'Ordre, et déploie le plan : port.",
	n8_demon: "Le Quai des Premiers Pas, chez Kylian : avant de manier une caisse, il faut le droit de parler au démon.",
	n8_premier: "Ta première caisse. Elle naît, elle parle, elle meurt : regarde bien.",
	n8_cycle: "La Capitainerie, chez Julien : une caisse qui tient en fond, et qu'on suit comme un navire.",
	n8_dedans: "Entre dans la caisse sans la casser, et lis-la de l'extérieur.",
	n8_menage: "Une variable à bord, et le quai propre : pas d'épave sur nos quais.",
	n8_images: "L'Entrepôt des plans, chez Grégoire : un plan, des noms, une empreinte.",
	n8_couches: "Un plan, ce sont des couches. Regarde-les, pèse-les, balaie les plans sans nom.",
	n8_rang1: "Ton épreuve de rang, Mousse. Pas d'indice gratuit : lis, mesure, répare. La caisse du quai doit s'ouvrir.",
	n8_volume: "Les Soutes, chez Chahla : ce qui doit survivre aux caisses vit dans une soute.",
	n8_montage: "Un dossier du quai, prêté à la caisse. En lecture seule, s'il ne doit rien écrire.",
	n8_sauvegarde: "Une soute qui ne se sauvegarde pas, c'est une soute qu'on perdra.",
	n8_reseau: "Les Chenaux, chez Adonis : un chenal à nous, où les caisses se trouvent par leur nom.",
	n8_isole: "Fermer, c'est aussi un savoir : une caisse sans réseau, un port qui ne regarde que le quai.",
	n8_rang2: "Épreuve de rang, Matelot. Le convoi ne se parle plus, et sa base oublie tout.",
	n8_dockerfile: "Le Chantier naval, chez Eden : à toi de dessiner le plan de l'école.",
	n8_contexte: "Tout le dossier part au chantier : allège-le, et donne au plan un argument.",
	n8_cache: "Les Cales, chez Megane : une ligne de code changée ne doit pas tout reconstruire.",
	n8_couches_propres: "Ce qu'une cale a posé, une autre ne l'enlève jamais vraiment. Nettoie dans la même.",
	n8_etages: "Le Chantier des maîtres, chez Jahmal : forger d'un côté, partir léger de l'autre.",
	n8_sante: "Un navire qui sait dire s'il va bien, c'est un navire qu'on peut surveiller.",
	n8_registre: "Le Registre du port, chez Déborah, sur entrepot : un entrepôt à nous, gardé.",
	n8_push: "Pousse le plan de l'école à l'entrepôt, et tire-le ailleurs, par son empreinte.",
	n8_rang3: "Épreuve de rang, Quartier-maître. La carte des courants pèse plus d'un gigaoctet.",
	n8_compose: "La Feuille de route, chez Elias : la pile de l'école en convoi, d'un seul fichier.",
	n8_ordre: "Un convoi part dans l'ordre : la base d'abord, et seulement quand elle va bien.",
	n8_redemarrage: "La Vigie, chez Remi : un convoi qui tombe doit se relever seul.",
	n8_journaux: "Des journaux qui tournent, et un ménage qui ne jette rien d'utile.",
	n8_rang4: "Épreuve de rang, Second. La pile de la tempête tombe en boucle : trois fautes.",
	n8_armure: "L'Armurerie, chez Ian : blinde l'appli, plaque par plaque.",
	n8_secrets: "Aucun mot de passe à l'air. Et ce sonar qui tient le socket du démon : désarme-le.",
	n8_quarantaine: "La Douane, chez Soufiane : l'image de l'éclaireur. On la lit. On ne la lance JAMAIS.",
	n8_autopsie: "L'autopsie : couche par couche, sans jamais la démarrer.",
	n8_rang5: "Épreuve de rang, Capitaine. Un plan « officiel » a changé d'empreinte pendant la nuit.",
	n8_swarm: "L'Escadre, chez Arnaud : docks prend le commandement, les navires rejoignent.",
	n8_service: "Un service sur toute la flotte : s'il en tombe un, les autres tiennent.",
	n8_maj: "Une mise à jour, navire par navire, et le chemin du retour.",
	n8_stack: "La flotte de l'école, d'un seul fichier : déploie-la sur l'escadre.",
	n8_flotte: "Ils sont là, Amiral. Regarde le port, et tiens chaque quai.",
	n8_naufrage: "navire2 ne répond plus ! Referme l'escadre.",
	n8_piege: "Une mise à jour arrive, signée de nulle part. Regarde son empreinte avant tout.",
	n8_puissance: "La flotte doit tenir au-dessus de 90. port te dit ce qui manque.",
	n8_rapport: "Dernière chose, Amiral : le rapport de bataille pour Laurent. Les quais, la flotte, l'escadre, le piège, ce qui reste."
};
var METIER_CH8 = {
	n8_port: "On mesure avant de construire : la puissance de départ est ton point zéro.",
	n8_demon: "Le groupe docker vaut root : on n'y met que ceux qui administrent la machine.",
	n8_premier: "Un conteneur n'est pas une machine virtuelle : c'est un processus de l'hôte, cloisonné par le noyau.",
	n8_cycle: "On nomme ses conteneurs et on publie ses ports au plus juste : un port publié est une porte ouverte.",
	n8_dedans: "docker exec est pour l'urgence : la configuration se change dans l'image, pas à la main dans un conteneur.",
	n8_images: "latest n'est pas une version : en production, on épingle un tag précis, et mieux, un digest.",
	n8_couches: "Le disque d'un serveur docker se remplit en silence : system df d'abord, prune ensuite, avec prudence.",
	n8_volume: "Une donnée hors volume meurt avec son conteneur : bases, fichiers téléversés, tout ce qui compte va dans un volume.",
	n8_montage: "Un montage en écriture, c'est le conteneur qui écrit sur l'hôte : :ro dès qu'il n'a qu'à lire.",
	n8_reseau: "Un réseau défini par l'utilisateur donne les noms et isole les piles entre elles.",
	n8_isole: "Publier sur 127.0.0.1 garde un service pour la machine seule, derrière un frontal.",
	n8_dockerfile: "La forme exec de CMD fait du programme le PID 1 : il reçoit les signaux, il s'arrête proprement.",
	n8_contexte: "Ce qui entre dans le contexte peut finir dans l'image : secrets, .git, données. .dockerignore d'abord.",
	n8_cache: "Ordonner un Dockerfile du plus stable au plus changeant, c'est des minutes gagnées à chaque construction.",
	n8_etages: "Une image de production sans compilateur ni shell, c'est moins de place et moins de prise pour un attaquant.",
	n8_registre: "Un registre privé se garde par un mot de passe et, en vrai, par TLS : un registre ouvert distribue vos images à tous.",
	n8_push: "Un digest désigne un contenu, un tag seulement un nom : ce qu'on déploie se désigne par digest.",
	n8_compose: "Un fichier compose décrit une pile entière : on le relit (config) avant de la lancer.",
	n8_ordre: "depends_on sans condition n'attend que le démarrage : une base qui démarre n'est pas une base prête.",
	n8_redemarrage: "Sans limite de mémoire, un seul conteneur peut affamer toute la machine.",
	n8_journaux: "Un journal sans rotation finit par remplir le disque, et tout tombe.",
	n8_armure: "Non root, lecture seule, sans capacités, sans élévation : chaque plaque réduit ce qu'une faille permet.",
	n8_secrets: "Monter /var/run/docker.sock dans un conteneur, c'est lui donner la machine entière.",
	n8_quarantaine: "Une image d'origine inconnue ne se lance pas : elle s'inspecte, hors réseau, et on note tout.",
	n8_autopsie: "Une image n'est qu'une archive de couches : on peut tout en lire sans jamais rien exécuter.",
	n8_swarm: "Un gestionnaire seul est un point de faiblesse : en vrai, on en met trois.",
	n8_maj: "Une mise à jour progressive se prépare avec son retour arrière : on sait revenir avant de partir.",
	n8_stack: "Une pile déployée par fichier se relit, se versionne et se redéploie à l'identique.",
	n8_flotte: "Pendant un incident, on lit l'état avant d'agir, et on répare une chose à la fois.",
	n8_piege: "Une mise à jour d'origine non vérifiée se refuse, même quand le nom a l'air juste.",
	n8_rapport: "Un rapport d'incident dit ce qui a tenu, ce qui a cédé, ce qui a été fait, et ce qui reste."
};

/* ------------------------------------------------------------------ */
/* L'état réel du port                                                 */
/* ------------------------------------------------------------------ */

function vuCh8(cle){ return !!(sCh8().vus || {})[cle]; }
function noterVuCh8(cle){ var c = sCh8(); c.vus = c.vus || {}; if (!c.vus[cle]) c.vus[cle] = c.minutes || 1; }
var DOCKS_CH8 = "docks";
function homeCh8(){ return "/home/" + JOUEUR; }
function enMarcheCh8(h, nom){ var c = estHoteDockerPort(h) ? conteneurPort(h, nom) : null; return c && !c.ambigu && enMarchePort(c) ? c : null; }
function enMarcheTousCh8(h){ return estHoteDockerPort(h) ? conteneursPort(h).filter(enMarchePort) : []; }
function envCh8(c){ var o = {}; (c.config.Env || []).forEach(function(e){ var i = e.indexOf("="); if (i > 0) o[e.substring(0, i)] = e.substring(i + 1); }); return o; }
function montageCh8(c, cible){ return (c.hote.montages || []).filter(function(m){ return cheminNormal(m.cible) === cheminNormal(cible); })[0] || null; }
function publieCh8(h, c, port){ return portsPubliesPort(h, c).some(function(p){ return +p.hp === +port; }); }
function reseauUtilisateurCh8(nom){ return !!nom && ["default", "bridge", "host", "none"].indexOf(nom) === -1; }
function reseauxUtilisateurCh8(c){ return Object.keys(c.reseaux || {}).filter(reseauUtilisateurCh8); }
function memeReseauCh8(a, b){ var ra = reseauxUtilisateurCh8(a), rb = reseauxUtilisateurCh8(b); return ra.some(function(r){ return rb.indexOf(r) > -1; }); }
/* Les images construites depuis un dossier de la maison sur docks (les build réussis). */
function buildsCh8(dossier){ return (etatPort(DOCKS_CH8).builds || []).filter(function(b){ return b.ok && cheminNormal(b.dossier || "/") === cheminNormal(homeCh8() + "/" + dossier); }); }
function imagesConstruitesCh8(dossier){ var ids = {}; buildsCh8(dossier).forEach(function(b){ if (b.image) ids[b.image] = true; }); return ids; }
function imageEcoleCh8(){ return imagePort(DOCKS_CH8, "ecole:1.0"); }
function formeExecCh8(l){ return !!l && l.length > 0 && !(l[0] === "/bin/sh" && l[1] === "-c"); }
/* Le programme de l'appli de l'école tourne dans ce conteneur. */
function estAppEcoleCh8(c){ return !!c && !!c.programme && c.programme.genre === "ecole"; }
function contientFichierCh8(h, img, chemin){ try { return !!coucheContientPort(h, img, chemin); } catch (e){ return false; } }
/* Un fichier de l'hôte (Item) qui contient une archive dont une entrée porte ce nom. */
function archivesSousCh8(h, base, nom){
	var d = dossierHote(h, base), trouves = [];
	if (!d) return trouves;
	(function visiter(l, profondeur){
		if (profondeur > 6) return;
		(l.items || []).forEach(function(it){
			var a = it.archive || (it.comp && it.comp.archive) || null;
			if (a && JSON.stringify(a).indexOf(nom) > -1) trouves.push(it);
		});
		(l.children || []).forEach(function(x){ if (x !== l && x.parents[0] === l) visiter(x, profondeur + 1); });
	})(d, 0);
	return trouves;
}
function nombreLignesTableCh8(h, base, nomBase, table){
	try { var t = lireTablePort(h, base, nomBase, table); return t ? t.lignes.length : null; } catch (e){ return null; }
}
/* La pile compose de l'école (le projet ecole, sur docks). */
function serviceEcoleCh8(s, projet){ return conteneursComposePort(DOCKS_CH8, projet || "ecole", s).filter(enMarchePort); }
function configProjetCh8(projet){ var P = etatPort(DOCKS_CH8).projets || {}; return P[projet] ? P[projet].config : null; }
function svcConfigCh8(projet, s){ var c = configProjetCh8(projet); return c && c.services ? c.services[s] || null : null; }
function inscriptionsCh8(){
	var b = serviceEcoleCh8("base")[0];
	return b ? nombreLignesTableCh8(DOCKS_CH8, b, "ecole", "inscriptions") : null;
}
function sansMotDePasseCh8(c){
	var env = envCh8(c);
	return !Object.keys(env).some(function(k){ return /PASSWORD$|PASSWD$|SECRET$/.test(k) && env[k] !== ""; });
}
function socketMonteCh8(){ return conteneursPort(DOCKS_CH8).some(function(c){ return (c.hote.montages || []).some(function(m){ return /^\/(var\/)?run\/docker\.sock$/.test(cheminNormal(m.source || "/")) || /^\/(var\/)?run\/docker\.sock$/.test(cheminNormal(m.cible || "/")); }); }); }
/* L'appli de l'école, blindée. */
function armureOkCh8(c){
	if (!estAppEcoleCh8(c) || !enMarchePort(c) || santePort(c) !== "healthy") return false;
	var u = utilisateurConteneurPort(DOCKS_CH8, c);
	if (!u || u.erreur || !u.uid) return false;
	var caps = capsPort(c);
	var drop = (c.hote.capDrop || []).map(function(x){ return String(x).toUpperCase(); });
	return c.hote.readOnly && Object.keys(c.hote.tmpfs || {}).some(function(t){ return cheminNormal(t) === "/tmp"; }) && drop.indexOf("ALL") > -1 &&
		caps.every(function(x){ return x === "NET_BIND_SERVICE"; }) && sansNouveauxPrivilegesPort(c) && !c.hote.privileged;
}
function appsBlindeesCh8(){ return enMarcheTousCh8(DOCKS_CH8).filter(armureOkCh8); }
/* Le registre de l'entrepôt. */
function registreEntrepotCh8(){
	return enMarcheTousCh8("entrepot").filter(function(c){ return c.programme && (c.programme.type === "registry" || /registry/.test(c.imageRef || "")); })[0] || null;
}
function registreOkCh8(){
	var r = registreEntrepotCh8();
	if (!r || !publieCh8("entrepot", r, 5000)) return false;
	var m = montageCh8(r, "/var/lib/registry");
	if (!m || (m.type === "volume" && m.anonyme)) return false;
	var env = envCh8(r);
	if (env.REGISTRY_AUTH !== "htpasswd" || !env.REGISTRY_AUTH_HTPASSWD_PATH) return false;
	var t = lireFichierConteneurPort("entrepot", r, env.REGISTRY_AUTH_HTPASSWD_PATH) || "";
	return /^[^:\s]+:\$2[aby]\$/m.test(t);
}
/* Le cheval de bois (épreuve V) et le nginx d'origine. */
function nginxOrigineCh8(){ var im = imageCataloguePort("nginx"); return im; }
function chevalCh8(){ return piegesContinentPort().filter(function(p){ return p.cle === "cheval"; })[0] || null; }
/* L'escadre. */
function stackCh8(nom){ return servicesSwarmPort().filter(function(sv){ return sv.spec && sv.spec.stack === nom; }); }
function serviceStackCh8(s){ return serviceSwarmPort("ecole_" + s); }
function tachesEnMarcheCh8(sv){ return tachesSwarmPort(sv).filter(function(t){ return t.etat === "running" && t.etatVoulu === "running"; }); }
function stackConvergeeCh8(){
	var svs = ["web", "app", "base", "cache"].map(serviceStackCh8);
	if (svs.some(function(x){ return !x; })) return false;
	return svs.every(function(x){ try { return convergePort(x); } catch (e){ return false; } });
}
function workersPretsCh8(){ return noeudsSwarmPort().filter(function(n){ return n.role === "worker" && noeudPretPort(n); }); }

/* Chaque étape : l'état réel (ETATS, qui compte dans la puissance) et ce que le joueur a constaté (vus). */
var ETATS_CH8 = {
	n8_demon: function(){ return groupesSessionPort(DOCKS_CH8).indexOf("docker") > -1 && groupesMachine(DOCKS_CH8).some(function(g){ return g.nom === "docker" && g.membres.indexOf(JOUEUR) > -1; }); },
	n8_premier: function(){ return vuCh8("hello") && vuCh8("sessionIt"); },
	n8_cycle: function(){ var v = enMarcheCh8(DOCKS_CH8, "vigie"); return !!v && v.programme && v.programme.type === "nginx" && portsPubliesPort(DOCKS_CH8, v).some(function(p){ return +p.hp === 8080 && +p.cp === 80; }); },
	n8_dedans: function(){ return !!enMarcheCh8(DOCKS_CH8, "vigie") || vuCh8("execVigie"); },
	n8_menage: function(){ return !conteneurPort(DOCKS_CH8, "epave") && !conteneursPort(DOCKS_CH8).some(function(c){ return !enMarchePort(c) && ["squatteur", "cargaison", "convoi-app", "convoi-base"].indexOf(c.nom) === -1; }); },
	n8_images: function(){ return vuCh8("deuxTags") && vuCh8("untag") && vuCh8("digest"); },
	n8_couches: function(){ return !imagesPort(DOCKS_CH8).some(function(im){ return im.pendante && !imageUtiliseePort(DOCKS_CH8, im) && im.ajoute < (sCh8().debutPort || 0); }); },
	n8_rang1: function(){
		var c = enMarcheCh8(DOCKS_CH8, "cargaison");
		if (!c || !publieCh8(DOCKS_CH8, c, 8081) || !c.programme || c.programme.genre !== "cargaison") return false;
		return vuCh8("curlCaisse");
	},
	n8_volume: function(){ return !!volumePort(DOCKS_CH8, "cales") && !!fichierHote(DOCKS_CH8, "/var/lib/docker/volumes/cales/_data/manifeste.txt"); },
	n8_montage: function(){ return conteneursPort(DOCKS_CH8).some(function(c){ return (c.hote.montages || []).some(function(m){ return m.type === "bind" && cheminNormal(m.source).indexOf(homeCh8() + "/") === 0; }); }) || vuCh8("bindLu"); },
	n8_sauvegarde: function(){ return archivesSousCh8(DOCKS_CH8, homeCh8(), "manifeste.txt").length > 0 && vuCh8("tarConteneur"); },
	n8_reseau: function(){ var r = reseauPort(DOCKS_CH8, "chenal"); return !!r && enMarcheTousCh8(DOCKS_CH8).filter(function(c){ return c.reseaux && c.reseaux.chenal; }).length >= 2; },
	n8_isole: function(){ return enMarcheTousCh8(DOCKS_CH8).some(function(c){ var p = portsPubliesPort(DOCKS_CH8, c); return p.length > 0 && p.every(function(x){ return x.ip === "127.0.0.1"; }); }); },
	n8_rang2: function(){
		var a = enMarcheCh8(DOCKS_CH8, "convoi-app"), b = enMarcheCh8(DOCKS_CH8, "convoi-base");
		if (!a || !b || !memeReseauCh8(a, b) || !publieCh8(DOCKS_CH8, a, 8082)) return false;
		var r = resoudreDepuisConteneurPort(DOCKS_CH8, a, envCh8(a).DB_HOST || "localhost");
		if (!r || r.conteneur !== b) return false;
		var m = montageCh8(b, envCh8(b).PGDATA || "/var/lib/postgresql/data");
		if (!m || m.type !== "volume" || m.anonyme) return false;
		return nombreLignesTableCh8(DOCKS_CH8, b, envCh8(b).POSTGRES_DB || "convoi", "cargaisons") === 12;
	},
	n8_dockerfile: function(){
		var im = imageEcoleCh8();
		if (!im || !imagesConstruitesCh8("ecole")[im.id]) return false;
		if (!formeExecCh8(im.config.Cmd) && !formeExecCh8(im.config.Entrypoint)) return false;
		var ids = imagesConstruitesCh8("ecole");
		return enMarcheTousCh8(DOCKS_CH8).some(function(c){ return ids[c.image] && portsPubliesPort(DOCKS_CH8, c).length && (sCh8().curlEcole || {})[c.id]; }) || vuCh8("curlEcole");
	},
	n8_contexte: function(){
		var b = buildsCh8("ecole");
		var leger = b.some(function(x){ var im = etatPort(DOCKS_CH8).images[x.image]; return x.contexteOctets < 10e6 && (x.dockerignore || []).length && im && !contientFichierCh8(DOCKS_CH8, im, "/app/secrets/db_password.txt") && !contientFichierCh8(DOCKS_CH8, im, "/app/.git/HEAD"); });
		var arg = b.some(function(x){ var im = etatPort(DOCKS_CH8).images[x.image]; if (!im) return false; var env = (im.config.Env || []); return Object.keys(x.buildArgs || {}).some(function(k){ return env.indexOf(k + "=" + x.buildArgs[k]) > -1; }); });
		return leger && arg;
	},
	n8_cache: function(){
		return buildsCh8("ecole").some(function(b){
			var i = -1;
			(b.etapes || []).forEach(function(e, k){ if (i === -1 && /pip3? install/.test(e.texte || "") && e.cache) i = k; });
			return i > -1 && (b.etapes || []).slice(i + 1).some(function(e){ return /^COPY/.test(e.texte || "") && !e.cache; });
		});
	},
	n8_couches_propres: function(){
		var im = imageEcoleCh8();
		if (!im || !contientFichierCh8(DOCKS_CH8, im, "/usr/bin/curl")) return false;
		var base = imageCataloguePort("python", "3.12-slim");
		var propres = (im.couches || []).filter(function(id){ return (base.couches || []).indexOf(id) === -1; });
		return !propres.some(function(id){ var cc = couchePort(DOCKS_CH8, id); return cc && Object.keys(cc.fichiers || {}).some(function(p){ return /^\/var\/lib\/apt\/lists\/[^\/]+/.test(p) && !/\/(lock|partial)$/.test(p); }); });
	},
	n8_etages: function(){
		var ids = {}, ok = false;
		buildsCh8("phare").forEach(function(b){ if ((b.stages || []).length >= 2) ids[b.image] = true; });
		imagesPort(DOCKS_CH8).forEach(function(im){
			if (!ids[im.id] || tailleImagePort(DOCKS_CH8, im) >= 30e6 || contientFichierCh8(DOCKS_CH8, im, "/usr/bin/gcc")) return;
			if (enMarcheTousCh8(DOCKS_CH8).some(function(c){ return c.image === im.id && (sCh8().curlPhare || {})[c.id]; })) ok = true;
		});
		return ok;
	},
	n8_sante: function(){
		return enMarcheTousCh8(DOCKS_CH8).some(function(c){
			var im = imageDuConteneurPort(DOCKS_CH8, c);
			return estAppEcoleCh8(c) && santePort(c) === "healthy" && im && im.config && im.config.Healthcheck && Object.keys(im.config.Labels || {}).length > 0;
		});
	},
	n8_registre: function(){ return registreOkCh8(); },
	n8_push: function(){
		var reg = configDemonPort(DOCKS_CH8)["insecure-registries"] || [];
		return reg.indexOf(REGISTRE_ENTREPOT_PORT) > -1 && vuCh8("login") && vuCh8("pushEcole") && vuCh8("pullNavire") && vuCh8("runDigest") && vuCh8("logout");
	},
	n8_rang3: function(){
		var ok = imagesPort(DOCKS_CH8).some(function(im){ return (im.tags || []).some(function(t){ return /^carto:/.test(t); }) && tailleImagePort(DOCKS_CH8, im) < 250e6; });
		var cache = buildsCh8("carto").some(function(b){
			var i = -1;
			(b.etapes || []).forEach(function(e, k){ if (i === -1 && /pip3? install/.test(e.texte || "") && e.cache) i = k; });
			var im = etatPort(DOCKS_CH8).images[b.image];
			return i > -1 && (b.etapes || []).slice(i + 1).some(function(e){ return /^COPY/.test(e.texte || "") && !e.cache; }) && im && tailleImagePort(DOCKS_CH8, im) < 250e6;
		});
		return ok && cache;
	},
	n8_compose: function(){
		var web = serviceEcoleCh8("web"), app = serviceEcoleCh8("app"), base = serviceEcoleCh8("base"), cache = serviceEcoleCh8("cache");
		if (!web.length || !app.length || !base.length || !cache.length) return false;
		var m = montageCh8(base[0], envCh8(base[0]).PGDATA || "/var/lib/postgresql/data");
		if (!m || m.type !== "volume" || m.anonyme) return false;
		var rc = resoudreDepuisConteneurPort(DOCKS_CH8, app[0], envCh8(app[0]).CACHE_HOST || "cache");
		return !!rc && !!rc.conteneur && rc.conteneur.compose && rc.conteneur.compose.service === "cache" && vuCh8("santeViaWeb");
	},
	n8_ordre: function(){
		var app = svcConfigCh8("ecole", "app"), base = serviceEcoleCh8("base")[0];
		if (!app || !base || !base.config.Healthcheck || (base.config.Healthcheck.Test || [])[0] === "NONE") return false;
		var d = dependancesComposePort(app);
		return !!d.base && d.base.condition === "service_healthy" && !!app.env_file && vuCh8("composeScale") && vuCh8("composeLogs") && vuCh8("downUp");
	},
	n8_redemarrage: function(){
		var tous = ["web", "app", "base", "cache"].map(function(s){ return serviceEcoleCh8(s)[0]; });
		if (tous.some(function(c){ return !c || ["unless-stopped", "always"].indexOf(c.hote.restart.nom) === -1; })) return false;
		var app = tous[1];
		return app.hote.memoire > 0 && !app.etat.oom && vuCh8("demonRelance") && vuCh8("stats");
	},
	n8_journaux: function(){
		var ok = ["web", "app"].every(function(s){ var c = serviceEcoleCh8(s)[0]; return c && c.hote.log && c.hote.log.type === "json-file" && c.hote.log.opts && c.hote.log.opts["max-size"]; });
		return ok && vuCh8("eventsFiltre") && vuCh8("systemPrune") && !!volumePort(DOCKS_CH8, "ecole_donnees");
	},
	n8_rang4: function(){
		var c = {};
		["web", "app", "base", "cache"].forEach(function(s){ c[s] = serviceEcoleCh8(s, "tempete")[0]; });
		if (!c.web || !c.app || !c.base || !c.cache) return false;
		if (santePort(c.base) !== "healthy") return false;
		if (c.app.config.Healthcheck && (c.app.config.Healthcheck.Test || [])[0] !== "NONE" && santePort(c.app) !== "healthy") return false;
		if (c.cache.etat.oom || c.cache.etat.statut !== "running") return false;
		var app = svcConfigCh8("tempete", "app");
		var d = app ? dependancesComposePort(app) : {};
		return !!d.base && d.base.condition === "service_healthy";
	},
	n8_armure: function(){ return appsBlindeesCh8().length > 0 && vuCh8("ecritureRefusee"); },
	n8_secrets: function(){
		var app = serviceEcoleCh8("app"), base = serviceEcoleCh8("base");
		if (!app.length || !base.length) return false;
		var ok = app.concat(base).every(function(c){
			var env = envCh8(c);
			return sansMotDePasseCh8(c) && Object.keys(env).some(function(k){ return /_FILE$/.test(k) && /^\/run\/secrets\//.test(env[k]); }) && (c.secrets || []).length > 0;
		});
		return ok && !socketMonteCh8();
	},
	n8_quarantaine: function(){
		var t = texteHote("douane", homeCh8() + "/douane/indices.txt") || "";
		return vuCh8("inspectEclaireur") && vuCh8("historyNoTrunc") && t.indexOf("/usr/local/share/flotte/temoin.txt") > -1 && /flotte\.sh/.test(t) && /P\.G\./.test(t);
	},
	n8_autopsie: function(){
		var ecl = imagePort("douane", "eclaireur:prise");
		var cree = estHoteDockerPort("douane") && conteneursPort("douane").some(function(c){ return ecl && c.image === ecl.id && !c.etat.debut; });
		return vuCh8("jqManifest") && vuCh8("tarCouche") && (cree || vuCh8("creeEclaireur")) && vuCh8("cpTemoin") && vuCh8("sha256Temoin") && vuCh8("diffVide") && !sCh8().eclaireurPousse;
	},
	n8_rang5: function(){
		var p = chevalCh8();
		if (!p) return false;
		var web = serviceEcoleCh8("web")[0], orig = nginxOrigineCh8();
		if (!web || web.image !== orig.id) return false;
		var piege = etatPort(DOCKS_CH8).images[p.image.id];
		if (piege || conteneursPort(DOCKS_CH8).some(function(c){ return c.image === p.image.id; })) return false;
		var t = texteHote(DOCKS_CH8, homeCh8() + "/ecole/compose.yaml") || "";
		return t.indexOf(orig.digestDepot) > -1 && vuCh8("digestsCompares");
	},
	n8_swarm: function(){ return !!swarmPort() && estGestionnairePort(DOCKS_CH8) && workersPretsCh8().length >= 3 && vuCh8("nodeLs"); },
	n8_service: function(){
		return servicesSwarmPort().some(function(sv){
			var t = tachesEnMarcheCh8(sv), noeuds = {};
			t.forEach(function(x){ noeuds[x.noeud] = true; });
			return t.length >= 3 && Object.keys(noeuds).length >= 2 && String(sv.spec.image).indexOf(REGISTRE_ENTREPOT_PORT + "/") === 0;
		}) && vuCh8("serviceScale") && vuCh8("servicePs");
	},
	n8_maj: function(){ return vuCh8("majFinie") && vuCh8("rollbackFini"); },
	n8_stack: function(){
		var app = serviceStackCh8("app"), base = serviceStackCh8("base");
		if (!app || !base || !stackConvergeeCh8() || (app.spec.repliques || 0) < 3 || !(base.spec.contraintes || []).length) return false;
		if (!(swarmPort().secrets && Object.keys(swarmPort().secrets).length)) return false;
		if (String(app.spec.image).indexOf("@sha256:") === -1) return false;
		return ["web", "app", "base", "cache"].every(function(s){ var sv = serviceStackCh8(s); return !(sv.spec.env || []).some(function(e){ return /^[A-Z_]*(PASSWORD|PASSWD|SECRET)=/.test(e) && !/=$/.test(e); }); });
	}
};
var VALIDATIONS_CH8 = {
	n8_demon: function(){ return ETATS_CH8.n8_demon() && vuCh8("systemctlDocker") && vuCh8("dockerInfo"); },
	n8_premier: function(){ return ETATS_CH8.n8_premier() && vuCh8("psA"); },
	n8_cycle: function(){ return ETATS_CH8.n8_cycle() && vuCh8("curlVigie") && vuCh8("stopStart") && vuCh8("logsVigie"); },
	n8_dedans: function(){ return ETATS_CH8.n8_dedans() && vuCh8("execVigie") && vuCh8("inspectFormat") && vuCh8("top"); },
	n8_menage: function(){ return ETATS_CH8.n8_menage() && vuCh8("envRelue") && vuCh8("prune"); },
	n8_images: function(){ return ETATS_CH8.n8_images(); },
	n8_couches: function(){ return ETATS_CH8.n8_couches() && vuCh8("history") && vuCh8("systemDf") && vuCh8("prunePendantes"); },
	n8_rang1: function(){ return epreuveOuverteCh8(1) && ETATS_CH8.n8_rang1() && vuCh8("exitCode") && vuCh8("logsCargaison"); },
	n8_volume: function(){ return ETATS_CH8.n8_volume() && vuCh8("relectureVolume") && ecrivainVolumeDisparuCh8(); },
	n8_montage: function(){ return ETATS_CH8.n8_montage() && vuCh8("bindLu") && vuCh8("roRefus"); },
	n8_sauvegarde: function(){ return ETATS_CH8.n8_sauvegarde() && vuCh8("tarListe"); },
	n8_reseau: function(){ return ETATS_CH8.n8_reseau() && vuCh8("dnsChenal") && vuCh8("networkInspect"); },
	n8_isole: function(){ return ETATS_CH8.n8_isole() && vuCh8("ipNone") && vuCh8("curlLocal") && vuCh8("refusDistant"); },
	n8_rang2: function(){ return epreuveOuverteCh8(2) && ETATS_CH8.n8_rang2() && vuCh8("convoi12"); },
	n8_dockerfile: function(){ return ETATS_CH8.n8_dockerfile(); },
	n8_contexte: function(){ return ETATS_CH8.n8_contexte(); },
	n8_cache: function(){ return ETATS_CH8.n8_cache(); },
	n8_couches_propres: function(){ return ETATS_CH8.n8_couches_propres(); },
	n8_etages: function(){ return ETATS_CH8.n8_etages(); },
	n8_sante: function(){ return ETATS_CH8.n8_sante() && vuCh8("santeFormat"); },
	n8_registre: function(){ return ETATS_CH8.n8_registre() && vuCh8("curl401"); },
	n8_push: function(){ return ETATS_CH8.n8_push(); },
	n8_rang3: function(){ return epreuveOuverteCh8(3) && ETATS_CH8.n8_rang3(); },
	n8_compose: function(){ return ETATS_CH8.n8_compose() && vuCh8("composeConfig"); },
	n8_ordre: function(){ return ETATS_CH8.n8_ordre(); },
	n8_redemarrage: function(){ return ETATS_CH8.n8_redemarrage(); },
	n8_journaux: function(){ return ETATS_CH8.n8_journaux(); },
	n8_rang4: function(){ return epreuveOuverteCh8(4) && ETATS_CH8.n8_rang4(); },
	n8_armure: function(){ return ETATS_CH8.n8_armure(); },
	n8_secrets: function(){ return ETATS_CH8.n8_secrets(); },
	n8_quarantaine: function(){ return ETATS_CH8.n8_quarantaine(); },
	n8_autopsie: function(){ return ETATS_CH8.n8_autopsie(); },
	n8_rang5: function(){ return epreuveOuverteCh8(5) && ETATS_CH8.n8_rang5(); },
	n8_swarm: function(){ return ETATS_CH8.n8_swarm(); },
	n8_service: function(){ return ETATS_CH8.n8_service(); },
	n8_maj: function(){ return ETATS_CH8.n8_maj(); },
	n8_stack: function(){ return ETATS_CH8.n8_stack(); }
};
/* Le conteneur qui a écrit dans la soute n'existe plus (il a disparu, la donnée est restée). */
function ecrivainVolumeDisparuCh8(){
	var ids = sCh8().ecrivainsCales || [];
	return ids.some(function(id){ return !etatPort(DOCKS_CH8).conteneurs[id]; });
}
function etapesQuaiFaitesCh8(q){ return q.etapes.every(function(id){ return !!state.quests[id]; }); }
function quaisTenusCh8(){ return QUAIS_CH8.filter(etapesQuaiFaitesCh8); }

/* ------------------------------------------------------------------ */
/* Ce que le joueur constate : les sorts lancés au port, et leur sortie */
/* ------------------------------------------------------------------ */

function optionsCh8(args){ return args.filter(function(a){ return /^-[A-Za-z0-9]+$/.test(a); }).join("").replace(/-/g, ""); }
/* La sous-commande de docker (« container ls » compte comme ps). */
function sousDockerCh8(args){
	var a = args.filter(function(x, i){ return !(x.charAt(0) === "-" && i === 0); });
	var s = a[0], s2 = a[1];
	if (s === "container"){ return { ls: "ps", list: "ps", inspect: "inspect", run: "run", exec: "exec", prune: "prune" }[s2] || s2; }
	if (s === "image"){ return { ls: "images", list: "images", inspect: "inspect", history: "history", prune: "image-prune", rm: "rmi" }[s2] || s2; }
	return s;
}
function valeurOptionCh8(args, noms){
	for (var i = 0; i < args.length; i++){
		for (var k = 0; k < noms.length; k++){
			var n = noms[k];
			if (args[i] === n && args[i + 1] !== undefined) return args[i + 1];
			if (n.indexOf("--") === 0 && args[i].indexOf(n + "=") === 0) return args[i].substring(n.length + 1);
		}
	}
	return null;
}
function valeursOptionCh8(args, noms){
	var l = [];
	for (var i = 0; i < args.length; i++){
		noms.forEach(function(n){
			if (args[i] === n && args[i + 1] !== undefined) l.push(args[i + 1]);
			else if (n.indexOf("--") === 0 && args[i].indexOf(n + "=") === 0) l.push(args[i].substring(n.length + 1));
		});
	}
	return l;
}
function noterCh8(h, nom, args, sortie, io, erreur){
	var t = sortie + (erreur ? "\n" + erreur : "");
	var c = sCh8();
	if (nom === "systemctl" && args.indexOf("status") > -1 && /docker/.test(args.join(" ")) && /active \(running\)/.test(sortie) && estHoteDockerPort(h)) noterVuCh8("systemctlDocker");
	if (nom === "tar" && h === DOCKS_CH8 && /t/.test(optionsCh8(args)) && /manifeste\.txt/.test(sortie)) noterVuCh8("tarListe");
	if (nom === "tar" && h === "douane" && /t/.test(optionsCh8(args)) && /usr\/local\/share\/flotte\/temoin\.txt|etc\/profile\.d\/flotte\.sh/.test(sortie) && !args.some(function(a){ return /^eclaireur\.tar$|\/eclaireur\.tar$/.test(a); })) noterVuCh8("tarCouche");
	if (nom === "jq" && h === "douane" && args.some(function(a){ return /manifest\.json$/.test(a); }) && /sha256|blobs|Layers|RepoTags/.test(sortie)) noterVuCh8("jqManifest");
	if (nom === "sha256sum" && h === "douane" && sortie.indexOf(empreinteTemoinPort()) > -1) noterVuCh8("sha256Temoin");
	if (nom === "curl" && h && h !== DOCKS_CH8 && (erreur || io.code)){
		var url = args.filter(function(a){ return a.charAt(0) !== "-" && /:\d+/.test(a); })[0] || "";
		var m = /^(?:https?:\/\/)?([^\/:]+):(\d+)/.exec(url);
		if (m && resoudreHotePort(m[1], h) === DOCKS_CH8){
			var port = +m[2];
			if (enMarcheTousCh8(DOCKS_CH8).some(function(x){ return portsPubliesPort(DOCKS_CH8, x).some(function(p){ return +p.hp === port && p.ip === "127.0.0.1"; }); })) noterVuCh8("refusDistant");
		}
	}
	if (c.digestPiege && /\S/.test(t) && t.indexOf(c.digestPiege.replace(/^sha256:/, "").substring(0, 12)) > -1 && estHotePort(h)) noterVuCh8("digestPiege");
	if (nom !== "docker" || !h) return;
	var s = sousDockerCh8(args), o = optionsCh8(args);
	if (s === "info" && !io.sudo && /Server Version/.test(sortie)) noterVuCh8("dockerInfo");
	if (s === "ps" && (/a/.test(o) || args.indexOf("--all") > -1) && /Exited|Created/.test(sortie)){ noterVuCh8("psA"); if (/cargaison/.test(sortie) && epreuveOuverteCh8(1)) noterVuCh8("exitCode"); }
	if (s === "run" && /Hello from Docker!/.test(sortie)) noterVuCh8("hello");
	if (s === "inspect" && (args.indexOf("-f") > -1 || args.some(function(a){ return /^--format/.test(a); })) && sortie.trim() && !erreur) noterVuCh8("inspectFormat");
	if (s === "inspect" && /Health/.test(args.join(" ")) && /^(healthy|unhealthy|starting)$/m.test(sortie)) noterVuCh8("santeFormat");
	if (s === "inspect" && epreuveOuverteCh8(1) && args.indexOf("cargaison") > -1 && sortie.trim()) noterVuCh8("exitCode");
	if ((s === "run" || s === "exec") && !erreur){
		var env = valeursOptionCh8(args, ["-e", "--env"]);
		env.forEach(function(e){ var i = e.indexOf("="); if (i > 0 && e.substring(i + 1) && new RegExp("(^|\\n|=)" + e.substring(i + 1).replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "(\\n|$)").test(sortie) && /printenv|\benv\b|echo/.test(args.join(" "))) noterVuCh8("envRelue"); });
		if (s === "exec"){
			var cible = args.filter(function(a){ return a.charAt(0) !== "-"; })[1];
			var cc = cible ? conteneurPort(h, cible) : null;
			if (cc && /printenv|\benv\b/.test(args.join(" ")) && (cc.config.Env || []).some(function(e){ var img = imageDuConteneurPort(h, cc); return (!img || (img.config.Env || []).indexOf(e) === -1) && sortie.indexOf(e.split("=").slice(1).join("=")) > -1 && e.split("=").slice(1).join("="); })) noterVuCh8("envRelue");
		}
	}
	if ((s === "run" || s === "exec") && /Read-only file system/.test(t)){
		var ro = args.some(function(a){ return /:ro$/.test(a); });
		if (s === "exec"){ var cx = conteneurPort(h, args.filter(function(a){ return a.charAt(0) !== "-"; })[1]); if (cx && (cx.hote.montages || []).some(function(m){ return m.ro && m.type === "bind"; })) ro = true; }
		if (ro) noterVuCh8("roRefus");
	}
	if (s === "run" && !erreur && sortie.trim() && args.some(function(a){ return /^(~|\/home\/|\.\/|\/srv\/)[^:]*:/.test(a); }) && !/Read-only/.test(sortie)) noterVuCh8("bindLu");
	if (s === "run" && !erreur && args.some(function(a){ return /^cales:/.test(a); }) && /manifeste/.test(args.join(" ")) && /\bcat\b/.test(args.join(" ")) && sortie.trim()) noterVuCh8("relectureVolume");
	if ((s === "run" || s === "exec") && !erreur && !io.code && args.indexOf("tar") > -1 && args.some(function(a){ return /^-?[a-z]*c[a-z]*f?$/.test(a) && /c/.test(a) && a !== "cat"; })) noterVuCh8("tarConteneur");
	if ((s === "run" || s === "exec") && !erreur && /bytes from|Welcome to nginx|1 packets received|Name:\s+\S+\s+Address/.test(sortie)){
		var reseauOk = false;
		if (s === "run"){ var n = valeurOptionCh8(args, ["--network", "--net"]); reseauOk = reseauUtilisateurCh8(n); }
		else { var ce = conteneurPort(h, args.filter(function(a){ return a.charAt(0) !== "-"; })[1]); reseauOk = !!ce && reseauxUtilisateurCh8(ce).length > 0; }
		if (reseauOk) noterVuCh8("dnsChenal");
	}
	if (args[0] === "network" && args[1] === "inspect" && /Containers/.test(sortie) && !erreur) noterVuCh8("networkInspect");
	if (s === "run" && valeurOptionCh8(args, ["--network", "--net"]) === "none" && /\blo:/.test(sortie) && !/eth0/.test(sortie)) noterVuCh8("ipNone");
	if (h === DOCKS_CH8 && chevalCh8() && epreuveOuverteCh8(5)){
		if (t.indexOf(chevalCh8().image.digestDepot.substring(7, 19)) > -1) noterVuCh8("digestCheval");
		if (t.indexOf(nginxOrigineCh8().digestDepot.substring(7, 19)) > -1) noterVuCh8("digestAncien");
		if (vuCh8("digestCheval") && vuCh8("digestAncien")) noterVuCh8("digestsCompares");
	}
}
var APPELER_AVANT_CH8 = Shell.appeler;
Shell.appeler = function(nom, args, io){
	var h = grandPortOuvert() ? portIci() : null, sortie, erreur = null;
	try { sortie = APPELER_AVANT_CH8.apply(this, arguments); }
	catch (e){ erreur = e; }
	try {
		if (h) noterCh8(h, nom, args || [], typeof sortie === "string" ? sansAnsi(sortie) : "", io || {}, erreur ? sansAnsi(String(erreur.message || erreur)) : null);
	} catch (x){ /* une lecture ne doit jamais casser un sort */ }
	if (erreur) throw erreur;
	return sortie;
};
/* Les événements du moteur : ce que la sortie seule ne dit pas. */
GameEvents.addListener("port", function(e){
	if (!grandPortOuvert() || !state.quests["n8_quai"]) return;
	var c = sCh8(), h = e.hote;
	try {
		if (e.cmd === "session" && e.action === "fermee" && e.principale) noterVuCh8("sessionIt");
		if (e.cmd === "http" && h === DOCKS_CH8 && !e.depuisConteneur && e.code === 200){
			if (e.conteneur === "vigie") noterVuCh8("curlVigie");
			if (e.conteneur === "cargaison") noterVuCh8("curlCaisse");
			var cx = conteneurPort(h, e.id);
			if (cx && (cx.hote.montages || []).some(function(m){ return m.type === "bind"; })) noterVuCh8("bindLu");
			if (cx && portsPubliesPort(h, cx).length && portsPubliesPort(h, cx).every(function(p){ return p.ip === "127.0.0.1"; })) noterVuCh8("curlLocal");
			if (cx && estAppEcoleCh8(cx)){ c.curlEcole = c.curlEcole || {}; c.curlEcole[cx.id] = true; noterVuCh8("curlEcole"); }
			if (cx && cx.programme && cx.programme.type === "phare"){ c.curlPhare = c.curlPhare || {}; c.curlPhare[cx.id] = true; }
			if (cx && cx.nom === "convoi-app" && epreuveOuverteCh8(2)) noterVuCh8("convoi12");
		}
		if (e.cmd === "http" && h === DOCKS_CH8 && e.depuisConteneur && e.code === 200 && String(e.chemin).indexOf("/sante") === 0){
			var app = conteneurPort(h, e.id), web = conteneurPort(h, e.depuisConteneur);
			if (app && web && app.compose && app.compose.projet === "ecole" && web.compose && web.compose.service === "web") noterVuCh8("santeViaWeb");
		}
		if (e.cmd === "http" && h === "entrepot" && e.code === 401 && /^\/v2\/?$/.test(String(e.chemin).split("?")[0])) noterVuCh8("curl401");
		if (e.cmd === "stop" && e.conteneur === "vigie" && e.etaitEnMarche !== false) c.vigieArretee = true;
		if (e.cmd === "start" && e.conteneur === "vigie" && e.ok && c.vigieArretee) noterVuCh8("stopStart");
		if (e.cmd === "restart" && e.conteneur === "vigie" && e.ok){ noterVuCh8("stopStart"); }
		if (e.cmd === "logs" && e.conteneur === "vigie") noterVuCh8("logsVigie");
		if (e.cmd === "logs" && e.conteneur === "cargaison" && epreuveOuverteCh8(1)) noterVuCh8("logsCargaison");
		if (e.cmd === "exec" && e.conteneur === "vigie" && (e.code === 0 || e.interactif)) noterVuCh8("execVigie");
		if (e.cmd === "exec" && /Read-only file system/.test((e.erreurs || "") + (e.sortie || ""))){
			var cr = conteneurPort(h, e.id);
			if (cr && estAppEcoleCh8(cr) && cr.hote.readOnly) noterVuCh8("ecritureRefusee");
			if (cr && (cr.hote.montages || []).some(function(m){ return m.ro; })) noterVuCh8("roRefus");
		}
		if (e.cmd === "exec" && e.conteneur && e.code === 0 && /\S/.test(e.sortie || "")){
			var cb = conteneurPort(h, e.id);
			if (cb && (cb.hote.montages || []).some(function(m){ return m.type === "bind"; }) && /\bcat\b|\bls\b/.test((e.argv || []).join(" "))) noterVuCh8("bindLu");
		}
		if (e.cmd === "top") noterVuCh8("top");
		if (e.cmd === "prune" && e.quoi === "conteneurs") noterVuCh8("prune");
		if (e.cmd === "prune" && e.quoi === "images" && (e.supprimes || []).length) noterVuCh8("prunePendantes");
		if (e.cmd === "rm" && h === DOCKS_CH8 && e.conteneur === "epave") noterVuCh8("prune");
		if (e.cmd === "images" && h === DOCKS_CH8){
			var parId = {};
			(e.lignes || []).forEach(function(l){ if (l.tag && !/<none>/.test(l.tag)) (parId[l.id] = parId[l.id] || []).push(l.tag); });
			if (Object.keys(parId).some(function(k){ return parId[k].length >= 2; })) noterVuCh8("deuxTags");
			if (e.digests) noterVuCh8("digest");
		}
		if (e.cmd === "inspect" && e.objet && /RepoDigests/.test(JSON.stringify(e.objet).substring(0, 20000)) && /@sha256:/.test(JSON.stringify(e.objet.RepoDigests || ""))) noterVuCh8("digest");
		if (e.cmd === "rmi" && e.untag && !e.supprime) noterVuCh8("untag");
		if (e.cmd === "history"){ noterVuCh8("history"); var ecl = imagePort("douane", "eclaireur:prise"); if (h === "douane" && e.noTrunc && ecl && e.image === ecl.id) noterVuCh8("historyNoTrunc"); }
		if (e.cmd === "systemDf") noterVuCh8("systemDf");
		if ((e.cmd === "run" || e.cmd === "create") && h === DOCKS_CH8){
			var cv = conteneurPort(h, e.id);
			if (cv && (cv.hote.montages || []).some(function(m){ return m.type === "volume" && m.source === "cales"; })){ c.ecrivainsCales = c.ecrivainsCales || []; if (c.ecrivainsCales.indexOf(e.id) === -1) c.ecrivainsCales.push(e.id); }
		}
		if ((e.cmd === "run" || e.cmd === "create") && h === "navire1" && /@sha256:/.test(e.image || "")) noterVuCh8("runDigest");
		if (e.cmd === "run" && /@sha256:/.test(e.image || "") && h === "navire1") noterVuCh8("runDigest");
		if (e.cmd === "create" && h === "douane"){ var ce = imagePort("douane", "eclaireur:prise"); if (ce && e.imageId === ce.id) noterVuCh8("creeEclaireur"); }
		if (e.cmd === "login" && e.ok && e.registre === REGISTRE_ENTREPOT_PORT) noterVuCh8("login");
		if (e.cmd === "logout") noterVuCh8("logout");
		if (e.cmd === "push" && e.ok && e.registre === REGISTRE_ENTREPOT_PORT && /^ecole$/.test(e.depot || "")) noterVuCh8("pushEcole");
		if (e.cmd === "pushEclaireur") c.eclaireurPousse = true;
		if (e.cmd === "pull" && h === "navire1" && e.registre === REGISTRE_ENTREPOT_PORT && /ecole/.test(e.ref || "")) noterVuCh8("pullNavire");
		if (e.cmd === "inspect" && h === "douane" && /eclaireur/.test(e.ref || "")) noterVuCh8("inspectEclaireur");
		if (e.cmd === "inspect" && h === "douane" && e.objet && e.objet.Config && e.objet.Config.Labels && e.objet.Config.Labels["port.constructeur"]) noterVuCh8("inspectEclaireur");
		if (e.cmd === "cp" && h === "douane" && e.sens === "sortie" && /temoin\.txt/.test(e.chemin || "")) noterVuCh8("cpTemoin");
		if (e.cmd === "diff" && h === "douane" && !e.demarre && !(e.lignes || []).length){ var ed = imagePort("douane", "eclaireur:prise"); if (ed && e.image === ed.id) noterVuCh8("diffVide"); }
		if (e.cmd === "composeConfig" && e.projet === "ecole") noterVuCh8("composeConfig");
		if (e.cmd === "composeScale" && e.projet === "ecole" && e.service === "app" && e.voulu >= 2) noterVuCh8("composeScale");
		if (e.cmd === "composeLogs" && e.projet === "ecole") noterVuCh8("composeLogs");
		if (e.cmd === "composeDown" && e.projet === "ecole" && !e.volumes && (c.inscriptionsVues || 0) >= 1){ c.inscriptionsAvantDown = c.inscriptionsVues; c.downFait = true; }
		if (e.cmd === "composeUp" && e.projet === "ecole" && e.ok && c.downFait) c.upApresDown = true;
		if (e.cmd === "demon" && e.action === "demarre" && h === DOCKS_CH8 && serviceEcoleCh8("app").length + conteneursComposePort(DOCKS_CH8, "ecole").length > 0) c.demonRelanceEnAttente = true;
		if (e.cmd === "stats") noterVuCh8("stats");
		if (e.cmd === "events" && (e.depuis || (e.filtres || []).length)) noterVuCh8("eventsFiltre");
		if (e.cmd === "prune" && e.quoi === "systeme" && h === DOCKS_CH8) noterVuCh8("systemPrune");
		if (e.cmd === "nodeLs"){ noterVuCh8("nodeLs"); if (c.naufrage && (e.noeuds || []).some(function(n){ return n.hote === "navire2" && n.etat === "Down"; })) noterVuCh8("nodeLsDown"); }
		if (e.cmd === "serviceScale") noterVuCh8("serviceScale");
		if (e.cmd === "servicePs") noterVuCh8("servicePs");
		if (e.cmd === "serviceUpdate"){ var sv = serviceSwarmPort(e.service); if (sv && +e.parallelisme === 1 && +e.delai > 0) c.majEnCours = sv.nom; }
		if (e.cmd === "serviceMaj" && e.etat === "completed" && c.majEnCours === e.service){ var s2 = serviceSwarmPort(e.service); if (s2 && s2.spec.miseAJour.parallelisme === 1 && s2.spec.miseAJour.delai > 0) noterVuCh8("majFinie"); }
		if ((e.cmd === "serviceMaj" && e.etat === "rollback_completed") || e.cmd === "serviceRollback"){ if (vuCh8("majFinie")) noterVuCh8("rollbackFini"); }
	} catch (x){ /* un constat ne doit jamais casser un sort */ }
});

/* ------------------------------------------------------------------ */
/* Les épreuves de rang : ce que le monde pose quand elles s'ouvrent    */
/* ------------------------------------------------------------------ */

function poserConvoiCh8(){
	var h = DOCKS_CH8;
	if (conteneurPort(h, "convoi-app") || conteneurPort(h, "convoi-base")) return;
	moteurSeul(function(){
		var pgCat = imageCataloguePort("postgres");
		var pg = imagePort(h, "postgres:16-alpine") || poserImagePort(h, pgCat, "postgres:16-alpine", "postgres@" + pgCat.digestDepot);
		var b = creerConteneurPort(h, pg, { nom: "convoi-base", env: ["POSTGRES_USER=convoi", "POSTGRES_PASSWORD=Convoi-du-Matin", "POSTGRES_DB=convoi"] }, "postgres:16-alpine");
		demarrerConteneurPort(h, b, {});
		var img = imagePort(h, "convoi-app:1.0");
		if (img){
			var a = creerConteneurPort(h, img, { nom: "convoi-app", env: ["DB_HOST=localhost", "DB_USER=convoi", "DB_PASSWORD=Convoi-du-Matin", "DB_NAME=convoi"], ports: [{ ip: "", hp: 8082, cp: 8000, proto: "tcp" }] }, "convoi-app:1.0");
			demarrerConteneurPort(h, a, {});
		}
	});
}
function poserCartoCh8(){
	var h = DOCKS_CH8;
	if (imagePort(h, "carto:lourd")) return;
	moteurSeul(function(){ try { construireSilencieuxPort(h, PROJETS_PORT.cartoDockerfile, homeCh8() + "/carto", "carto:lourd"); } catch (e){} });
}
/* L'épreuve V : pendant la nuit, la vigie automatique de l'ancien équipage a tiré la « dernière » nginx:1.27-alpine. */
function poserChevalCh8(){
	var p = activerChevalDeBoisPort();
	moteurSeul(function(){
		poserImagePort(DOCKS_CH8, copieJson(p.image), "nginx:1.27-alpine", "nginx@" + p.image.digestDepot);
		evenementDockerPort(DOCKS_CH8, "image", "pull", p.image.id, { name: "nginx:1.27-alpine" });
	});
	journalMachine(DOCKS_CH8, { unite: "vigie-auto", prio: 5, message: "docker pull nginx:1.27-alpine : Status: Downloaded newer image for nginx:1.27-alpine (" + p.image.digestDepot.substring(0, 19) + "...)" });
}
/* Les plans de l'ancien équipage (cargaison:1.0 pour l'épreuve I, convoi-app:1.0 pour l'épreuve II) et la prise de la Douane
 * (eclaireur:prise) ne se retirent d'aucun registre : un docker image prune -a, un system prune -a ou un rmi les efface pour de
 * bon, et l'étape ne se ferait plus jamais. Tant qu'elle n'est pas réussie, le port en redépose une copie (une partie déjà en
 * cours aussi, au rechargement), et la caisse de l'épreuve ouverte avec, si elle n'existe plus. */
var PLANS_ANCIENS_CH8 = [
	{ h: "docks", tag: "cargaison:1.0", fin: "n8_rang1",
	  poser: function(){ return construireSilencieuxPort("docks", PROJETS_PORT.caisseDockerfile, homeCh8() + "/caisse", "cargaison:1.0"); },
	  caisse: function(img){
		if (!epreuveOuverteCh8(1) || conteneurPort("docks", "cargaison")) return;
		var c = creerConteneurPort("docks", img, { nom: "cargaison", ports: [{ ip: "", hp: 8081, cp: 8081, proto: "tcp" }] }, "cargaison:1.0");
		demarrerConteneurPort("docks", c, {});
	  },
	  radio: "le plan cargaison:1.0 avait été balayé de docks. L'ancien équipage en gardait une copie : la revoilà. Un plan qu'on ne sait pas reconstruire, on ne le balaie pas (image prune -a emporte tout plan qu'aucune caisse n'utilise)." },
	{ h: "docks", tag: "convoi-app:1.0", fin: "n8_rang2",
	  poser: function(){ return construireSilencieuxPort("docks", PROJETS_PORT.convoiDockerfile, homeCh8() + "/convoi", "convoi-app:1.0"); },
	  caisse: function(img){
		if (!epreuveOuverteCh8(2) || conteneurPort("docks", "convoi-app")) return;
		var a = creerConteneurPort("docks", img, { nom: "convoi-app", env: ["DB_HOST=localhost", "DB_USER=convoi", "DB_PASSWORD=Convoi-du-Matin", "DB_NAME=convoi"], ports: [{ ip: "", hp: 8082, cp: 8000, proto: "tcp" }] }, "convoi-app:1.0");
		demarrerConteneurPort("docks", a, {});
	  },
	  radio: "le plan convoi-app:1.0 avait été balayé de docks. L'ancien équipage en gardait une copie : la revoilà. Un plan qu'on ne sait pas reconstruire, on ne le balaie pas (image prune -a emporte tout plan qu'aucune caisse n'utilise)." },
	{ h: "douane", tag: "eclaireur:prise", fin: "n8_autopsie",
	  poser: function(){ var p = poserImagePort("douane", imageEclaireurPort(), "eclaireur:prise", null); p.ajoute = maintenantPort("douane") - 5 * 3600000; return p; },
	  radio: "l'image de l'éclaireur avait disparu de la Douane. C'est une pièce à conviction : on la lit, on ne la détruit pas. Soufiane en a remis une copie en quarantaine sur douane." }
];
function reposerPlansAnciensCh8(){
	PLANS_ANCIENS_CH8.forEach(function(x){
		if (state.quests[x.fin] || !estHoteDockerPort(x.h) || imagePort(x.h, x.tag)) return;
		var img = null;
		moteurSeul(function(){ try { img = x.poser(); if (img && x.caisse) x.caisse(img); } catch (e){} });
		if (img && !state.has("rejeuEnCours")) say(C.gris("(Radio : « Grace : " + x.radio + " »)"));
	});
}
var TEXTES_EPREUVES_CH8 = {
	1: function(){ return "Au bout du Quai des Premiers Pas, une caisse refuse de s'ouvrir : cargaison, la caisse du quai 8. Elle devait répondre « Caisse ouverte » sur docks:8081. " +
		"Elle ne démarre pas, et personne ne sait pourquoi. " + C.gris("(Notes de l'ancien équipage : ~/caisse sur docks.)"); },
	2: function(){ return "Sur docks, le convoi du matin s'est mis en route : convoi-app et sa base, convoi-base. L'appli devrait dire « 12 cargaisons » sur docks:8082. " +
		"Elle crie dans le vide : elle ne trouve pas sa base, et la base n'a rien en mémoire. " + C.gris("(~/convoi sur docks : le code, le registre init.sql, la note.)"); },
	3: function(){ return "La carte des courants doit partir ce soir vers l'escadre. Mais son plan, carto:lourd, pèse plus d'un gigaoctet, et chaque ligne de code changée reconstruit tout, dépendances comprises. " +
		"Fais-la tomber sous 250 Mo, et qu'une retouche de carto.py ne réinstalle plus rien. " + C.gris("(~/carto sur docks : docker images carto.)"); },
	4: function(){ return "Le vent forcit. Dans ~/tempete, sur docks, la pile de l'école a été montée à la hâte par l'ancien équipage : lance-la (docker compose up -d) et regarde-la tomber. " +
		"Trois fautes la font tomber en boucle. Les quatre services doivent tenir debout, la base et l'appli en bonne santé, et l'appli doit attendre la santé de sa base."; },
	5: function(){ return "Pendant la nuit, la vigie automatique de l'ancien équipage a tiré la « dernière » nginx:1.27-alpine du registre du continent. Le tag est le même. L'empreinte, non. " +
		"Le web de l'école tourne encore sur l'ancienne. Un seul docker compose up, et il passerait sur la nouvelle. Repère-la, refuse-la, épingle l'ancienne par son empreinte dans ~/ecole/compose.yaml, et retire l'intruse."; }
};
function ouvrirEpreuveCh8(n){
	var c = sCh8();
	c.epreuves = c.epreuves || {};
	if (c.epreuves[n] !== undefined && c.epreuves[n] !== null) return;
	c.epreuves[n] = c.minutes;
	try {
		if (n === 1) poserEpreuveCaissePort();
		if (n === 2) poserConvoiCh8();
		if (n === 3) poserCartoCh8();
		if (n === 5) poserChevalCh8();
	} catch (e){ if (typeof console !== "undefined" && console.error) console.error(e); }
	if (!state.has("rejeuEnCours")){
		say(C.rouge(C.gras("⚔ ÉPREUVE DE RANG " + ["", "I", "II", "III", "IV", "V"][n] + " : " + acteCh8(n).nomEpreuve.toUpperCase())) + "\n" + TEXTES_EPREUVES_CH8[n]() + "\n" +
			C.gris("(Radio : « Grace : une épreuve de rang, " + nomRangCh8() + ". Pas d'indice gratuit, juste trois mots : lis, mesure, répare. Les galons " + (/^[AEIOUÉ]/.test(RANGS_CH8[n].nom) ? "d'" : "de ") + RANGS_CH8[n].nom + " sont au bout. »)"));
	}
}
/* La montée en grade : le galon, une scène, l'image du rang. */
var SCENES_RANGS_CH8 = {
	1: "Kylian, Julien et Grégoire t'attendent au pied de la grande grue. Kylian décroche ton galon de Mousse et coud à la place le premier galon de bronze. « La caisse s'est ouverte. Tu sais faire vivre et mourir un conteneur. Matelot ! » Sur tout le port, les dockers frappent trois fois sur la coque des conteneurs.",
	2: "Chahla et Adonis montent sur le pont. Chahla pose deux galons d'argent sur ton épaule. « Les soutes gardent leur mémoire, les chenaux portent les noms. Le convoi parle. Quartier-maître ! » Au loin, le phare noir clignote une fois, comme s'il avait vu.",
	3: "Eden, Megane, Jahmal et Déborah forment une haie sous les grues. Déborah te tend les trois galons du Second. « Tu dessines tes propres plans, légers, rangés dans notre entrepôt. Second ! » Une grue lève sa charge vers le ciel, en salut.",
	4: "Elias et Remi t'attendent au sommet de la Vigie, dans le vent. Remi coud le quatrième galon d'or. « Un convoi qui tombe et se relève seul, c'est toi qui l'as écrit. Capitaine ! » En bas, tout le port lève la tête.",
	5: "Ian et Soufiane escortent Arnaud jusqu'à toi. Arnaud dépose sur ton épaule la patte d'épaule aux trois étoiles. « Tu as lu l'ennemi sans te faire couler, et refusé son cheval de bois. Amiral. » Il se tourne vers la mer. « L'escadre est à toi. Il te reste à la rassembler. »"
};
function monterEnGradeCh8(n){
	var c = sCh8();
	if (rangCh8() >= n) return;
	c.rang = n;
	c.rangA = c.rangA || {};
	c.rangA[n] = c.minutes;
	state.set(RANGS_CH8[n].galon);
	if (!state.has("rejeuEnCours")){
		if (typeof montrerImage === "function" && RANGS_CH8[n].image) montrerImage("./static/img/" + RANGS_CH8[n].image, RANGS_CH8[n].nom);
		say(C.jaune(C.gras("✦ RANG : " + RANGS_CH8[n].nom.toUpperCase())) + "\n" + SCENES_RANGS_CH8[n] + "\n" +
			C.gris("(galons : tes galons, et ce qu'il faut pour le rang suivant. De nouveaux quais s'ouvrent à toi.)"));
	}
}

/* ------------------------------------------------------------------ */
/* Les nuits au bivouac, la radio, l'aube                              */
/* ------------------------------------------------------------------ */

var NUITS_CH8 = {
	1: { scene: "22:00. Le port s'éteint quai par quai. Tu t'assieds près du feu, au pied d'une pile de conteneurs, et la radio grésille dans le noir. " +
		"Au large, le phare noir tourne lentement sous un croissant de lune.",
		radio: "Grace : dors, RANG. Demain, le port aura besoin de toi. La flotte a avancé d'une encablure." },
	2: { scene: "22:00. La lune se voile. Le feu du bivouac crépite, et les galons sur ta manche accrochent sa lumière. Les maîtres du port parlent bas autour des braises : on dit que des voiles noires ont été vues au sud.",
		radio: "Grace : encore une nuit, RANG. Ils sont plus près. Repose-toi : demain, on construit une flotte." },
	3: { scene: "22:00. L'orage roule sur la baie. Dans la lueur des éclairs, on voit enfin la ligne noire de la flotte, d'un bout à l'autre de l'horizon. Personne ne dort vraiment. Tu regardes tes galons, puis la mer.",
		radio: "Grace : c'est la dernière nuit. À l'aube, ils seront là. Quoi qu'il arrive, je suis à la radio." }
};
function nuitCh8(n){
	if (state.has("rejeuEnCours")) return;
	var k = Math.min(3, n), nuit = NUITS_CH8[k];
	if (typeof montrerImage === "function") montrerImage("./static/img/scene_bivouac_nuit" + k + ".gif", "Le bivouac, nuit " + n);
	say(C.gras("☾ LA NUIT " + n + " AU BIVOUAC") + "\n" + nuit.scene + "\n" + C.gris("(Radio : « " + nuit.radio.replace(/RANG/g, nomRangCh8()) + " »)") + "\n" +
		C.gris("(Le jour se lève : il est " + heureCh8() + ". " + (flotteMajusculeCh8()) + ".)"));
}
function flotteMajusculeCh8(){ var t = texteAvantFlotteCh8(); return t.charAt(0).toUpperCase() + t.substring(1); }
function annoncerHeureCh8(){
	var c = sCh8();
	var bloc = Math.floor(c.minutes / 180);
	if (c.blocAnnonce === undefined || c.blocAnnonce === null) c.blocAnnonce = bloc;
	if (bloc > c.blocAnnonce){
		c.blocAnnonce = bloc;
		if (!state.has("rejeuEnCours") && !c.bataille && c.minutes % 1440 >= 360) say(C.gris("(Radio : « Grace : " + heureCh8() + ". " + texteAvantFlotteCh8().replace(/^la/, "La") + ". Tu es " + nomRangCh8() + ". »)"));
	}
}

/* L'assaut de l'aube : si la bataille n'a pas commencé, la flotte frappe chaque quai qui n'est pas tenu. */
var CONSEQUENCES_ASSAUT_CH8 = {
	premiers: "le Quai des Premiers Pas est sans équipage : personne n'a le droit de parler au démon",
	capitainerie: "la Capitainerie est aveugle : ses voyants clignotent dans le vide",
	plans: "l'Entrepôt des plans brûle de plans sans nom",
	soutes: "une soute éventrée : les données s'en vont avec la marée",
	chenaux: "les chenaux se croisent : n'importe qui rejoint n'importe qui",
	chantier: "le Chantier naval n'a rien lancé : l'école n'a pas de plan à elle",
	cales: "les cales sont trop lourdes : chaque départ prend des heures",
	maitres: "les navires partent avec leurs outils, et personne ne sait s'ils vont bien",
	registre: "le Registre du port est ouvert à tous les vents",
	feuille: "le convoi part en désordre",
	vigie: "la Vigie dort : ce qui tombe ne se relève pas",
	armurerie: "l'Armurerie est vide : les navires n'ont pas de bouclier",
	douane: "la Douane a laissé passer sans rien lire",
	escadre: "l'escadre n'est pas rassemblée : chaque navire est seul"
};
function lancerAssautCh8(){
	var c = sCh8();
	if (c.assaut) return;
	var cedes = QUAIS_CH8.filter(function(q){ return !etapesQuaiFaitesCh8(q); });
	c.assaut = { debut: c.minutes, quais: cedes.map(function(q){ return q.cle; }), registre: null };
	// L'incident de l'assaut : le registre de l'entrepôt coule (arrêté).
	var r = registreEntrepotCh8();
	if (r){ moteurSeul(function(){ arreterConteneurPort("entrepot", r, {}); r.etat.arreteMain = true; }); c.assaut.registre = r.id; }
	else c.assaut.registre = "absent";
	if (!state.has("rejeuEnCours")){
		say(C.rouge(C.gras("L'AUBE DU QUATRIÈME JOUR. LA FLOTTE NOIRE ATTAQUE.")) + " Les galions sortent de la brume, voiles noires gonflées, et leurs chaloupes se jettent sur les quais. " +
			(cedes.length ? "Chaque quai qui n'est pas tenu cède : " + cedes.map(function(q){ return q.titre + " (" + CONSEQUENCES_ASSAUT_CH8[q.cle] + ")"; }).join(" ; ") + "." : "Mais chaque quai est tenu : les chaloupes se brisent contre le port.") +
			" Et dans la mêlée, un boulet frappe l'entrepôt : le registre de l'école a coulé.\n" +
			C.gris("(Radio : « Grace : on n'abandonne rien. Relance le registre de l'entrepôt, finis ce qui reste, et tiens. port te dit tout. »)"));
	}
}
function assautRepareCh8(){
	var c = sCh8();
	if (!c.assaut) return true;
	return !!registreEntrepotCh8();
}

/* ------------------------------------------------------------------ */
/* La bataille de l'aube                                               */
/* ------------------------------------------------------------------ */

function commencerBatailleCh8(parAube){
	var c = sCh8();
	if (c.bataille) return;
	c.bataille = { debut: c.minutes, avantAube: !parAube && c.minutes < AUBE_CH8 };
	if (!state.has("rejeuEnCours")){
		if (typeof montrerImage === "function") montrerImage("./static/img/loc_bataille_aube.gif", "La bataille de l'aube");
		say(C.rouge(C.gras("⚓ LA BATAILLE DE L'AUBE")) + "\n" +
			(parAube ? "Le soleil se lève, rouge, et la flotte noire avec lui. " : "Tu n'as pas attendu l'aube. Ton escadre est rassemblée, et c'est toi qui sors à la rencontre de la flotte noire. ") +
			"Quatre galions noirs fendent la bande du jour, et derrière eux, des voiles à perte de vue. La pluie fouette les ponts, un éclair déchire le ciel au-dessus du phare noir. " +
			"Sur la jetée, les quatorze maîtres du port ont pris leur poste. Grace n'a jamais parlé aussi calmement.\n" +
			C.gris("(Radio : « Grace : à toutes les grues, à tous les navires : l'Amiral a la main. port pour la situation. On tient le port. »)"));
	}
}
/* Un navire sombre : navire2 est frappé, l'escadre doit se refermer. */
function naufrageCh8(){
	var c = sCh8();
	if (c.naufrage) return;
	var s = swarmPort();
	if (!s || !s.noeuds.navire2) return;
	c.naufrage = c.minutes;
	perdreNoeudPort("navire2");
	if (!state.has("rejeuEnCours")) say(C.rouge("Un boulet frappe navire2 sous la ligne de flottaison. ") + "Ses feux s'éteignent, sa radio se tait : il ne répond plus au gestionnaire. " +
		"L'escadre replace ses tâches sur les autres navires, mais le navire fantôme encombre encore la formation.\n" +
		C.gris("(Radio : « Grace : navire2 est perdu ! docker node ls. Referme la formation : draine-le, et que toutes les répliques tiennent ailleurs. »)"));
}
/* La mise à jour piégée : un automate de l'ancien équipage pousse ecole:1.1, dont l'empreinte n'est pas la nôtre. */
function piegeCh8(){
	var c = sCh8();
	if (c.piegeLance) return;
	var sv = serviceStackCh8("app");
	if (!sv) return;
	c.piegeLance = c.minutes;
	c.imageApprouvee = sv.spec.image;
	try { c.digestPiege = poserImagePiegeePort(); } catch (e){ c.digestPiege = null; }
	mettreAJourServicePort("ecole_app", REGISTRE_ENTREPOT_PORT + "/ecole:1.1" + (c.digestPiege ? "@" + c.digestPiege : ""), { detache: true, parallelisme: 1, automate: true });
	if (!state.has("rejeuEnCours")) say(C.rouge("Une mise à jour arrive sur ecole_app. ") + "Personne ne l'a lancée : un automate oublié de l'ancien équipage vient de pousser ecole:1.1 sur toute l'escadre, navire par navire. " +
		"Le plan vient bien de l'entrepôt de l'école. Mais son empreinte n'est pas celle que tu as approuvée.\n" +
		C.gris("(Radio : « Grace : regarde son empreinte AVANT tout. docker service inspect, docker service ps --no-trunc. Si ce n'est pas la nôtre : retour arrière. »)"));
}
function piegeRepousseCh8(){
	var c = sCh8(), sv = serviceStackCh8("app");
	if (!sv || !c.piegeLance) return false;
	if (sv.maj && /updating|paused/.test(sv.maj.etat) && sv.maj.etat !== "rollback_completed") return false;
	if (c.imageApprouvee && sv.spec.image !== c.imageApprouvee) return false;
	var piege = (c.digestPiege || "zzz").replace(/^sha256:/, "");
	return !tachesEnMarcheCh8(sv).some(function(t){ return /:1\.1(@|$)/.test(t.image || "") || String(t.image || "").indexOf(piege) > -1 || String(t.digest || "").indexOf(piege) > -1; }) && tachesEnMarcheCh8(sv).length > 0;
}
function naufrageTenuCh8(){
	var c = sCh8();
	if (!c.naufrage) return false;
	var n = noeudPort("navire2");
	var sorti = !n || n.dispo === "drain";
	if (n && noeudPretPort(n)) return false;
	if (!stackConvergeeCh8()) return false;
	var surNavire2 = stackCh8("ecole").some(function(sv){ return tachesEnMarcheCh8(sv).some(function(t){ return t.noeud === "navire2"; }); });
	return sorti && !surNavire2;
}

/* ------------------------------------------------------------------ */
/* La puissance de la flotte : de 0 à 100, lue sur l'état réel          */
/* ------------------------------------------------------------------ */

var MESURES_PUISSANCE_CH8 = [
	{ poids: 5, texte: "l'éclaireur en quarantaine, jamais lancé ni poussé", ok: function(){ return !sCh8().eclaireurPousse && !!imagePort("douane", "eclaireur:prise"); } },
	{ poids: 4, texte: "l'équipage autorisé à parler au démon (le groupe docker)", ok: function(){ return ETATS_CH8.n8_demon(); } },
	{ poids: 6, texte: "le registre de l'entrepôt, gardé et sur un volume", ok: function(){ return registreOkCh8(); } },
	{ poids: 8, texte: "la pile de l'école en convoi (web, app, base, cache)", ok: function(){ return ["web", "app", "base", "cache"].every(function(s){ return serviceEcoleCh8(s).length > 0; }); } },
	{ poids: 5, texte: "la base de l'école sur un volume nommé", ok: function(){ var b = serviceEcoleCh8("base")[0]; var m = b ? montageCh8(b, "/var/lib/postgresql/data") : null; return !!m && m.type === "volume" && !m.anonyme; } },
	{ poids: 5, texte: "les bilans de santé (base et app en bonne santé)", ok: function(){ var b = serviceEcoleCh8("base")[0], a = serviceEcoleCh8("app")[0]; return !!b && !!a && santePort(b) === "healthy" && santePort(a) === "healthy"; } },
	{ poids: 4, texte: "les politiques de redémarrage du convoi", ok: function(){ return ["web", "app", "base", "cache"].every(function(s){ var c = serviceEcoleCh8(s)[0]; return c && ["unless-stopped", "always"].indexOf(c.hote.restart.nom) > -1; }); } },
	{ poids: 3, texte: "une limite de mémoire pour l'appli", ok: function(){ var a = serviceEcoleCh8("app")[0]; return !!a && a.hote.memoire > 0 && !a.etat.oom; } },
	{ poids: 3, texte: "des journaux qui tournent (max-size)", ok: function(){ return ["web", "app"].every(function(s){ var c = serviceEcoleCh8(s)[0]; return c && c.hote.log && c.hote.log.opts && c.hote.log.opts["max-size"]; }); } },
	{ poids: 8, texte: "l'armure de l'appli (non root, lecture seule, sans capacités)", ok: function(){ return serviceEcoleCh8("app").some(armureOkCh8); } },
	{ poids: 6, texte: "les secrets en fichiers, aucun mot de passe en variable", ok: function(){ var l = serviceEcoleCh8("app").concat(serviceEcoleCh8("base")); return l.length > 0 && l.every(sansMotDePasseCh8); } },
	{ poids: 5, texte: "le socket du démon jamais monté dans une caisse", ok: function(){ return !socketMonteCh8(); } },
	{ poids: 6, texte: "le web de l'école épinglé par son empreinte, l'image piégée retirée", ok: function(){ return !!state.quests["n8_rang5"] && ETATS_CH8.n8_rang5(); } },
	{ poids: 6, texte: "l'escadre : docks gestionnaire, trois navires", ok: function(){ return !!swarmPort() && estGestionnairePort(DOCKS_CH8) && noeudsSwarmPort().filter(function(n){ return n.role === "worker"; }).length >= 3; } },
	{ poids: 10, texte: "la flotte de l'école déployée et convergée (stack ecole)", ok: function(){ return stackConvergeeCh8() && (sCh8().naufrage ? naufrageTenuCh8() : true); } },
	{ poids: 5, texte: "les secrets de l'escadre, et la base amarrée à un navire", ok: function(){ var b = serviceStackCh8("base"); return !!b && (b.spec.contraintes || []).length > 0 && !!swarmPort() && Object.keys(swarmPort().secrets || {}).length > 0; } },
	{ poids: 6, texte: "l'appli de l'escadre sur une empreinte approuvée", ok: function(){ var sv = serviceStackCh8("app"); return !!sv && String(sv.spec.image).indexOf("@sha256:") > -1 && (!sCh8().piegeLance || piegeRepousseCh8()); } },
	{ poids: 5, texte: "la flotte de l'école sur au moins trois répliques", ok: function(){ var sv = serviceStackCh8("app"); return !!sv && tachesEnMarcheCh8(sv).length >= 3; } }
];
function incidentsOuvertsCh8(){
	var c = sCh8(), l = [];
	if (c.assaut && !assautRepareCh8()) l.push("le registre de l'entrepôt a coulé pendant l'assaut");
	if (c.naufrage && !naufrageTenuCh8()) l.push("navire2 a sombré, l'escadre n'est pas refermée");
	if (c.piegeLance && !piegeRepousseCh8()) l.push("la mise à jour piégée avance sur ecole_app");
	return l;
}
function puissanceCh8(){
	var s = 0;
	MESURES_PUISSANCE_CH8.forEach(function(m){ var ok = false; try { ok = m.ok(); } catch (e){ ok = false; } if (ok) s += m.poids; });
	s -= 3 * incidentsOuvertsCh8().length;
	return Math.max(0, Math.min(100, Math.round(s)));
}
function mesuresManquantesCh8(){ return MESURES_PUISSANCE_CH8.filter(function(m){ try { return !m.ok(); } catch (e){ return true; } }); }

/* ------------------------------------------------------------------ */
/* L'avancée du chapitre                                               */
/* ------------------------------------------------------------------ */

function validerCh8(){
	var c = sCh8();
	try { reposerPlansAnciensCh8(); } catch (e){}
	if (!state.quests["n8_port"] && state.has("ch8LaurentLu") && state.has("ch8OrdreLu") && c.scoreDepart !== null && c.scoreDepart !== undefined){
		state.complete("n8_port");
		if (!state.has("galon_mousse")){ state.set("galon_mousse"); if (!state.has("rejeuEnCours")) say(C.jaune("Laurent épingle sur ta manche une patte d'épaule nue, une ancre et pas un galon. « Mousse. Tout le monde commence ici. Même les amiraux. »")); }
	}
	// La mémoire de l'école : les inscriptions vues, et leur retour après un down puis un up (sans -v).
	var nInscr = inscriptionsCh8();
	if (nInscr !== null){
		c.inscriptionsVues = Math.max(c.inscriptionsVues || 0, nInscr);
		if (c.upApresDown && nInscr >= (c.inscriptionsAvantDown || 1)) noterVuCh8("downUp");
	}
	if (c.demonRelanceEnAttente && ["web", "app", "base", "cache"].every(function(s){ return serviceEcoleCh8(s).length > 0; })){ c.demonRelanceEnAttente = false; noterVuCh8("demonRelance"); }
	Object.keys(VALIDATIONS_CH8).forEach(function(id){
		if (state.quests[id]) return;
		if (/^n8_rang/.test(id)) return;
		// Les quais d'un acte s'ouvrent avec les galons : on valide une étape quand on porte le rang de son acte.
		if (rangCh8() < acteDeEtapeCh8(id) - 1 || !state.quests["n8_port"]) return;
		var ok = false;
		try { ok = VALIDATIONS_CH8[id](); } catch (e){ ok = false; }
		if (ok) state.complete(id);
	});
	// Les épreuves de rang : chaque acte terminé ouvre la sienne ; réussie, elle donne le rang suivant.
	ACTES_CH8.forEach(function(a){
		if (!a.epreuve) return;
		if (rangCh8() === a.n - 1 && state.quests["n8_port"] && a.etapes.every(function(id){ return !!state.quests[id]; })) ouvrirEpreuveCh8(a.n);
		if (!state.quests[a.epreuve] && epreuveOuverteCh8(a.n)){
			var ok = false;
			try { ok = VALIDATIONS_CH8[a.epreuve](); } catch (e){ ok = false; }
			if (ok){ state.complete(a.epreuve); monterEnGradeCh8(a.n); }
		}
	});
	// Chaque quai tenu : une phrase, une fois.
	c.quais = c.quais || {};
	QUAIS_CH8.forEach(function(q){
		if (!etapesQuaiFaitesCh8(q) || c.quais[q.cle] !== undefined) return;
		c.quais[q.cle] = c.minutes;
		if (!state.has("rejeuEnCours")) say(C.jaune("⚓ Quai tenu : " + q.titre) + C.gris(" : son fanal passe au vert sur le plan du port, et " + q.maitre + " hisse le pavillon de l'école."));
	});
	// La bataille : quand l'escadre de l'école est déployée, ou à l'aube du quatrième jour.
	if (!c.bataille && state.quests["n8_stack"]) commencerBatailleCh8(false);
	if (c.minutes >= AUBE_CH8 && !c.bataille){ lancerAssautCh8(); commencerBatailleCh8(true); }
	if (c.bataille && state.quests["n8_stack"]) naufrageCh8();
	if (!state.quests["n8_flotte"] && c.bataille && vuCh8("portBataille") && assautRepareCh8()) state.complete("n8_flotte");
	if (!state.quests["n8_naufrage"] && c.naufrage && naufrageTenuCh8() && vuCh8("nodeLsDown")) state.complete("n8_naufrage");
	if (state.quests["n8_naufrage"]) piegeCh8();
	if (!state.quests["n8_piege"] && c.piegeLance && piegeRepousseCh8() && vuCh8("digestPiege")) state.complete("n8_piege");
	if (!state.quests["n8_puissance"] && state.quests["n8_piege"] && incidentsOuvertsCh8().length === 0 && c.scoreFinalCandidat !== null && c.scoreFinalCandidat !== undefined && c.scoreFinalCandidat >= 90 && puissanceCh8() >= 90){
		c.scoreFinal = c.scoreFinalCandidat;
		state.complete("n8_puissance");
	}
	// Le rapport : contresigné quand la bataille est gagnée et la flotte au-dessus de 90.
	if (!state.quests["n8_rapport"] && rapportOkCh8()){
		var reste = [];
		if (!c.bataille) reste.push("la flotte noire n'a pas encore paru");
		else {
			if (!state.quests["n8_flotte"]) reste.push("le port n'est pas tenu (port, et ce que l'assaut a coulé)");
			if (!state.quests["n8_naufrage"]) reste.push("l'escadre n'est pas refermée après le naufrage");
			if (!state.quests["n8_piege"]) reste.push("la mise à jour piégée n'est pas repoussée");
			if (!state.quests["n8_puissance"]) reste.push("la flotte n'a pas encore tenu au-dessus de 90 après la bataille");
		}
		var manque = rapportManqueCh8();
		if (!reste.length && !manque.length) state.complete("n8_rapport");
		else if (!reste.length){
			if (c.rapportAttente !== manque.join(",")){ c.rapportAttente = manque.join(","); say("Laurent lit ton rapport, et pose le doigt sur une ligne vide. « Il manque " + manque.join(", et ") + ". Un rapport de bataille se vérifie : écris les vraies valeurs. »"); }
		} else if (c.rapportAttente !== reste.join(",")){
			c.rapportAttente = reste.join(",");
			say("Laurent prend ton rapport, le lit, et le glisse sous sa veste. « Bien écrit. Mais la bataille n'est pas finie : " + reste.join(", et ") + ". Je contresignerai quand le port sera tenu. »");
		}
	}
	if (state.quests["n8_rapport"] && !state.has("victoireCh8")) state.applyState("victoireCh8");
}
function rapportCh8(){ var it = BoiteGrandPortCh8.getItemFromName("rapport.txt"); return it === -1 ? null : it.getText(); }
function sansAccentCh8(t){ return String(t || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, ""); }
function rapportOkCh8(){
	var t = rapportCh8();
	if (t === null) return false;
	var b = sansAccentCh8(t);
	return ["quai", "flotte", "escadre", "piege", "reste"].every(function(r){ return b.indexOf(r) > -1; });
}
function rapportManqueCh8(){
	var t = rapportCh8() || "", c = sCh8(), l = [];
	if (c.scoreFinal !== null && c.scoreFinal !== undefined && !contientNombre(t, c.scoreFinal, 0.5)) l.push("la puissance de la flotte après la bataille (" + c.scoreFinal + ")");
	if (c.digestPiege && t.indexOf(c.digestPiege.replace(/^sha256:/, "").substring(0, 12)) === -1) l.push("l'empreinte de l'image piégée (au moins ses douze premiers caractères)");
	return l;
}

/* ------------------------------------------------------------------ */
/* Le monde réagit, à chaque tour                                      */
/* ------------------------------------------------------------------ */

function verifierChapitre8(){
	function une(nom, cond){ if (!state.has(nom) && cond) state.applyState(nom); }
	une("ch8Ouvert", !!state.quests["p7_rapport"] || state.has("ch8Direct"));
	if (!state.has("ch8Ouvert")) return;
	var c = sCh8();
	if (!c.base) c.base = baseJourCh8();
	relierGrandPortCh8();
	if (!state.quests["n8_quai"]) return;
	var r = avancerHorlogeCh8();
	for (var i = 0; i < r.nuits; i++) nuitCh8(c.nuitsVues - r.nuits + i + 1);
	annoncerHeureCh8();
	validerCh8();
}

function etatChapitre8(nom){
	switch (nom){
		case "ch8Ouvert":
			sCh8();
			relierGrandPortCh8();
			if (!state.has("rejeuEnCours") && !state.has("ch8Direct")) say("Au bout du quai de Port-Aube, une grille s'ouvre sur le Grand Port de l'île (cd ~/Cybersup/Embarcadere/PortAube/GrandPort). " +
				C.gris("(Radio : « Grace : Laurent t'attend au pied de la grande grue. Une flotte noire, au large. Je n'aime pas ça. »)"));
			break;
		case "victoireCh8":
			if (!state.dateVictoire9) state.dateVictoire9 = dateDuJour();
			poser(Home, CertificatGrandPortCh8);
			if (!state.has("rejeuEnCours")){
				if (typeof montrerImage === "function") montrerImage("./static/img/loc_grand_port_victoire.gif", "Le Grand Port illumine la baie");
				say(C.jaune(C.gras("LA FLOTTE NOIRE VIRE DE BORD.")) + " Un à un, les galions noirs abattent leurs voiles et tournent le dos au port. Sur la jetée, quelqu'un lance le premier cri, et tout le port le reprend. " +
					"Les grues s'illuminent, les navires de l'école hissent le grand pavois, des fusées vertes éclatent au-dessus de la baie, et les quatorze maîtres du port lèvent leur casquette vers toi." +
					(typeof texteAmiFinaleCh8 === "function" ? texteAmiFinaleCh8() : ""));
				say("Laurent lit ton rapport jusqu'à la dernière ligne, puis le contresigne. « Il y a trois jours, tu ne savais pas ce qu'était un conteneur. Aujourd'hui, une flotte entière obéit à tes plans. Amiral. Le Grand Port est à toi. »");
				say(C.gris("(Ton CertificatGrandPort est posé dans ta Maison : cat ~/CertificatGrandPort. Il porte la note du chapitre 8 et son code de vérification.)"));
				say(C.gras("La nuit tombe sur la baie illuminée.") + " Tard, seul sur la Douane, tu relis une dernière fois les Labels de l'image de l'éclaireur. Une ligne t'arrête : port.constructeur, des initiales, P.G. " +
					"Et port.signature : une empreinte de clé SSH. Tu l'as déjà vue. Sur docks, le carnet des clés de l'école la porte, à la ligne d'une machine de chez nous : le Bastion. " +
					"Cette image n'a pas été construite au large. Elle a été construite chez nous.\n" +
					C.gris("(docker image inspect --format '{{json .Config.Labels}}' eclaireur:prise, sur douane ; ssh-keygen -lf /etc/ssh/ssh_known_hosts, sur docks : tout se constate, rien n'est à réparer.)"));
				say(C.gris("(Radio, très bas : « Grace : ... Quelqu'un, à Cybersup, construit leurs navires. »)") + "\n\n" + C.gras("À suivre."));
			}
			break;
	}
}

/* Le joueur choisit son identifiant APRÈS la construction du monde : on remplace l'identifiant provisoire partout au port. */
function renommerJoueurPort(ancien, nouveau){
	if (!ancien || !nouveau || ancien === nouveau) return;
	var motif = new RegExp("(^|[^A-Za-z0-9_.-])" + ancien.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "(?=[^A-Za-z0-9_.-]|$)", "gm");
	Object.keys(RACINES_PORT).forEach(function(h){
		var racine = RACINES_PORT[h];
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
}
if (typeof adopterPrenom === "function"){
	var ADOPTER_PRENOM_AVANT_CH8 = adopterPrenom;
	adopterPrenom = function(){
		var ancien = JOUEUR;
		var r = ADOPTER_PRENOM_AVANT_CH8.apply(this, arguments);
		try { renommerJoueurPort(ancien, JOUEUR); } catch (e){}
		return r;
	};
}

/* Les événements du chapitre. */
GameEvents.addListener("enter", function(e){
	if (e.room === GrandPortCh8 && !state.quests["n8_quai"] && state.has("ch8Ouvert")){
		var c = sCh8();
		state.debutChapitre9 = state.tempsMs;
		if (!c.base) c.base = baseJourCh8();
		c.compteVu = c.compte || 0;
		c.debutPort = maintenantPort(DOCKS_CH8);
		try { semerPort(); } catch (x){}
		state.complete("n8_quai");
		// Le sonar de l'ancien équipage : un conteneur qui garde le socket du démon (désarmé à l'Armurerie).
		try { poserSonarPort(); } catch (x){}
	}
});
GameEvents.addListener("read", function(e){
	if (!state.has("ch8Ouvert")) return;
	if (e.item === LaurentGrandPortCh8) state.set("ch8LaurentLu");
	if (e.item === OrdreGrandPortCh8) state.set("ch8OrdreLu");
});

/* ------------------------------------------------------------------ */
/* Le pied de la grande grue : Laurent, l'Ordre, la radio, l'horloge    */
/* ------------------------------------------------------------------ */

var LaurentGrandPortCh8 = new Item("Laurent", "", "item_mysteryman.gif").personnage();
GrandPortCh8.addItem(LaurentGrandPortCh8);
var OrdreGrandPortCh8 = objetCh8(GrandPortCh8, "Ordre",
	"ORDRE DE MISSION · LE GRAND PORT\n\n" +
	"Une flotte noire se rassemble derrière le phare noir. Ses navires portent des conteneurs. Elle paraîtra à l'aube du quatrième jour.\n" +
	"Il est J1 06:00. Chaque manœuvre au port prend cinq minutes ; à 22 h, on dort au bivouac ; on se lève à 6 h.\n\n" +
	"1. Déployer le plan du port (port, une commande du jeu) : la puissance de la flotte, au départ.\n" +
	"2. Tenir les quatorze quais : chaque maître du port t'enseigne ses manœuvres (cat MAITRE) ; à toi de les mener sur ses machines (ssh).\n" +
	"3. Monter en grade : chaque acte finit par une épreuve de rang. Mousse, Matelot, Quartier-maître, Second, Capitaine, Amiral (galons).\n" +
	"4. Rassembler l'escadre de l'école, puis tenir la bataille de l'aube : un navire peut sombrer, un piège peut venir de chez nous.\n" +
	"5. La puissance de la flotte au-dessus de 90 après la bataille.\n" +
	"6. Le rapport de bataille, ~/grand-port/rapport.txt (dans ta Maison) : les quais, la flotte, l'escadre, le piège (son empreinte), ce qui reste,\n" +
	"   la puissance finale ; déposé dans la BoiteDeLaurent du Grand Port.\n\n" +
	"Règle d'or : une image d'origine inconnue ne se lance pas, elle s'inspecte. Ce qu'on déploie se désigne par son empreinte.",
	"item_ordre_embarquement.gif");
var RadioGrandPortCh8 = new Item("Radio", "", "item_workstation.gif");
GrandPortCh8.addItem(RadioGrandPortCh8);
var HorlogeGrandPortCh8 = new Item("Horloge", "", "item_sign.gif").droits("rw-r--r--", "root");
GrandPortCh8.addItem(HorlogeGrandPortCh8);
var CarteGrandPortCh8 = objetCh8(GrandPortCh8, "Carte",
	"LA CARTE DU GRAND PORT\n\n" +
	"Quatorze quais autour de la capitainerie, sept machines dans la baie :\n" +
	"  docks      10.0.80.10   le poste du port, celui des maîtres (et le gestionnaire de l'escadre, plus tard)\n" +
	"  entrepot   10.0.80.20   le registre de l'école\n" +
	"  navire1    10.0.80.31   \\\n  navire2    10.0.80.32    les navires de l'escadre\n  navire3    10.0.80.33   /\n" +
	"  douane     10.0.80.40   la quarantaine (aucune route vers le large)\n" +
	"  chaloupe et cabine      deux vieilles embarcations, au fond de la baie\n\n" +
	"Le plan vivant (les quais, l'heure, ton rang, la flotte ennemie, la puissance de ta flotte) : port, une commande du jeu.",
	"item_sign.gif");
var CertificatGrandPortCh8 = new Item("CertificatGrandPort", "", "item_manuscript.gif");

function texteHorlogeCh8(){
	var c = sCh8(), l = "L'HORLOGE DE LA CAPITAINERIE\n\nIl est " + heureCh8() + ". Tu es " + nomRangCh8() + ".\n";
	if (c.bataille) return l + "\nLa flotte noire est là" + (c.bataille.avantAube ? " : tu es sorti à sa rencontre avant l'aube." : ", à l'aube du quatrième jour.");
	l += "\n" + texteAvantFlotteCh8().replace(/^la/, "La") + " (l'aube du J4, 06:00).\nÀ 22 h, le bivouac ; on se lève à 6 h.\n\n";
	l += "Défis d'honneur de Laurent :\n";
	l += "  Matelot avant la nuit du J1 : " + (aFait("s_n8_matelot_j1") ? "réussi" : (c.minutes >= 1320 ? "manqué" : "en cours")) + "\n";
	l += "  Capitaine avant la fin du J2 : " + (aFait("s_n8_capitaine_j2") ? "réussi" : (c.minutes >= 1440 + 1320 ? "manqué" : "en cours")) + "\n";
	l += "  La bataille avant l'aube du J4 : " + (aFait("s_n8_avant_aube") ? "réussi" : "en cours");
	return l;
}
function texteRadioCh8(){
	var q = QUETES_CH8.filter(function(x){ return !state.quests[x.id]; })[0];
	if (!q) return "La radio grésille. « Grace : rapport contresigné. Toute la baie est illuminée, Amiral. Beau travail. »" + (state.has("victoireCh8") ? " Un long silence. « ... Ces initiales. Cette empreinte. Quelqu'un, à Cybersup, construit leurs navires. »" : "");
	var heure = "il est " + heureCh8() + ". " + (sCh8().bataille ? "La flotte est là. " : texteAvantFlotteCh8().replace(/^la/, "La") + ". ");
	return "La radio grésille. « Grace : " + heure + (CONSEILS_CH8[q.id] || "Je te suis.") + (METIER_CH8[q.id] ? " " + METIER_CH8[q.id] : "") + " »";
}
function texteLaurentCh8(){
	if (state.quests["n8_rapport"]) return "Laurent tient ton rapport, contresigné à l'encre bleue.\n\n« Quatorze quais, cinq épreuves, une escadre, une bataille. Et un piège refusé parce que tu as lu son empreinte au lieu de croire son nom. " +
		"Ton CertificatGrandPort t'attend dans ta Maison. Les défis des maîtres restent ouverts. »" + (state.has("victoireCh8") ? "\n\nIl baisse la voix. « Et ces initiales, P.G.... Garde-les pour toi. Pour l'instant. »" : "");
	return "Laurent est debout au pied de la grande grue, le col relevé, les yeux sur la mer.\n\n" +
		"« Tu as lu la lettre de la plume grise. Regarde : derrière le phare noir, là. Une flotte se rassemble. Ses navires ne portent pas de marchandises : ils portent des conteneurs. " +
		"Elle paraîtra à l'aube du quatrième jour. Il est 6 h, le premier jour.\n\n" +
		"On ne l'arrêtera pas avec des canons. On l'arrêtera avec une flotte à nous : les services de l'école, embarqués dans des conteneurs propres, légers, durcis, rassemblés en escadre. " +
		"Et avec la science de lire leurs navires sans se faire couler.\n\n" +
		"Ce port a quatorze quais, et quatorze maîtres. Chacun t'enseigne ses manœuvres (cat leur nom) ; à toi de les mener, sur leurs machines (ssh). " +
		"Chaque acte se termine par une épreuve de rang : tu entres Mousse, tu sortiras Amiral, ou tu ne sortiras pas. Commence par déployer le plan du port : port. C'est ton point zéro.\n\n" +
		"Trois défis d'honneur : Matelot avant ta première nuit, Capitaine avant la fin du deuxième jour, et ton escadre en mer avant l'aube du quatrième. " +
		"Et un quatrième, à part : finir sans acheter un seul indice. »";
}
texteVivant(HorlogeGrandPortCh8, texteHorlogeCh8);
texteVivant(RadioGrandPortCh8, texteRadioCh8);
texteVivant(LaurentGrandPortCh8, texteLaurentCh8);
texteVivant(CertificatGrandPortCh8, function(){ return state.has("victoireCh8") ? state.texteDuCertificat9() : ""; });

/* ------------------------------------------------------------------ */
/* Le certificat du chapitre                                           */
/* ------------------------------------------------------------------ */

GameState.prototype.texteDuCertificat9 = function(){
	var minutes = Math.round((this.tempsMs - (this.debutChapitre9 || 0)) / 60000);
	var totalSec = QUETES_SECONDAIRES_CH8.length;
	var secFaites = QUETES_SECONDAIRES_CH8.filter(function(q){ return this.quests[q.id]; }, this).length;
	var annexes = typeof annexesDuChapitre === "function" ? annexesDuChapitre(9) : [];
	var c = this.ch8 || {};
	return "" +
		"==================================\n" +
		"     CYBERSUP · CERTIFICAT DU GRAND PORT (LES CONTENEURS)\n" +
		"==================================\n" +
		"\n" +
		"  Décerné à : " + (this.nom || JOUEUR) + ", Amiral du Grand Port\n" +
		"\n" +
		"  pour avoir, en trois jours et une aube, appris les conteneurs\n" +
		"  de zéro à héros : le démon et ses droits, le cycle de vie,\n" +
		"  les images et leurs couches, les volumes et les réseaux,\n" +
		"  le Dockerfile, le cache et la construction en étapes, un\n" +
		"  registre privé, compose, l'exploitation, le durcissement,\n" +
		"  l'inspection d'une image suspecte en quarantaine, l'escadre\n" +
		"  (swarm, services, stacks) ; puis tenu la bataille de l'aube\n" +
		"  et rédigé le rapport, en terminal.\n" +
		"\n" +
		"  SCORE DU CHAPITRE 8  : " + this.xpNet(9) + " XP sur " + this.xpMax9() + "\n" +
		"  NOTE                 : " + this.noteTexte(9) + "\n" +
		"  Mention              : " + this.mention(9) + "\n" +
		"  Puissance de la flotte : " + (c.scoreDepart !== undefined && c.scoreDepart !== null ? c.scoreDepart : "?") + " au départ, " + (c.scoreFinal !== undefined && c.scoreFinal !== null ? c.scoreFinal : "?") + " après la bataille\n" +
		"  Rang                 : " + RANGS_CH8[typeof c.rang === "number" ? c.rang : 0].nom + "\n" +
		"  Sorts des conteneurs : " + ORDRE_DES_SORTS_9.filter(function(x){ return this.usages[x]; }, this).length + " sur " + ORDRE_DES_SORTS_9.length + "\n" +
		"  Quêtes secondaires   : " + secFaites + " sur " + totalSec + "\n" +
		"  Quêtes annexes       : " + annexes.filter(function(a){ return this.quests[a.id]; }, this).length + " sur " + annexes.length + "\n" +
		"  Temps du chapitre    : " + (minutes < 60 ? minutes + " min" : Math.floor(minutes / 60) + " h " + deuxChiffres(minutes % 60)) + "\n" +
		"  Indices payants      : " + (this.malus9 ? this.nbIndices(9) + " (-" + this.malus9 + " XP sur la note)" : "aucun") + "\n" +
		"\n" +
		"  Signé : Laurent, Directeur Pédagogique de Cybersup\n" +
		"          et Grace, cheffe de quart de la WarRoom\n" +
		"==================================\n" +
		"  Code de vérification (indicatif), à remettre au formateur :\n" +
		"  " + this.codeDuCertificat9() + "\n" +
		"==================================";
};
GameState.prototype.codeDuCertificat9 = function(){
	var f = this.compteursFiges(9, this.xpNet(9), this.nbCommandes, Math.round((this.tempsMs - (this.debutChapitre9 || 0)) / 60000));
	return fabriquerCode({
		prenom: String(this.nom || JOUEUR).replace(/\|/g, "/"),
		score: this.xpNet(9), max: this.xpMax9(), note: this.note(9),
		commandes: f.commandes, minutes: f.minutes,
		indices: this.nbIndices(9), chapitre: 9,
		date: this.dateVictoire9 || dateDuJour(), graine: PROFIL.graine
	});
};

/* Le monde est de nouveau figé : ce que le joueur crée ensuite n'a plus d'identifiant fixe. */
World.fige = true;

/* ------------------------------------------------------------------ */
/* Départ direct par « chapitre 8 » ou l'Ordre d'embarquement           */
/* ------------------------------------------------------------------ */

/* Le socle des chapitres précédents est réputé acquis (renfort), sans XP. Les sorts du chapitre 8, eux, s'apprennent auprès des maîtres. */
function socleCh8Acquis(){
	[typeof ORDRE_DES_SORTS !== "undefined" ? ORDRE_DES_SORTS : [], typeof ORDRE_DES_SORTS_2 !== "undefined" ? ORDRE_DES_SORTS_2 : [],
	 typeof ORDRE_DES_SORTS_3 !== "undefined" ? ORDRE_DES_SORTS_3 : [], typeof ORDRE_DES_SORTS_5 !== "undefined" ? ORDRE_DES_SORTS_5 : [],
	 typeof ORDRE_DES_SORTS_6 !== "undefined" ? ORDRE_DES_SORTS_6 : [], typeof ORDRE_DES_SORTS_7 !== "undefined" ? ORDRE_DES_SORTS_7 : [],
	 typeof ORDRE_DES_SORTS_8 !== "undefined" ? ORDRE_DES_SORTS_8 : []].forEach(function(liste){
		liste.forEach(function(s){ state.spells[s] = true; });
	});
}

function commencerChapitre8(){
	var alias = state.alias;
	state.alias = {};
	state.flags.rejeuEnCours = true;
	socleCh8Acquis();
	if (!state.quests.m_marche) state.complete("m_marche");
	state.set("sudoOK");
	state.set("chapitre1Saute");
	state.set("ch8Direct");
	PROFIL.chapitre = 8;
	enregistrerProfil();
	if (!state.ch8 || typeof state.ch8 !== "object") state.ch8 = etatCh8Initial();
	state.applyState("ch8Ouvert");
	delete state.flags.rejeuEnCours;
	state.alias = alias;
	Shell.narration = [];
	state.gainsDuTour = [];
	if (typeof enterRoom === "function") enterRoom(GrandPortCh8);
	Shell.lieu_precedent = null;
	Shell.pile_ssh = [];
	state.debutChapitre9 = state.tempsMs;
	if (typeof montrerImage === "function") montrerImage(GrandPortCh8.room_pic, "Le Grand Port");
	if (term && term.effacer) term.effacer();
	term.echo(C.vert(C.gras("CHAPITRE 8 : LA FLOTTE NOIRE")) + "\n\n" +
		"Au large de Port-Aube, derrière le phare noir, une flotte se rassemble. Ses navires ne portent pas de marchandises : ils portent des conteneurs. " +
		"Elle paraîtra à l'aube du quatrième jour. Il est 6 h, le premier jour, et Laurent t'ouvre le Grand Port de l'île.\n\n" +
		"Tu es au pied de la grande grue. " + C.vert("cat Laurent") + ", puis " + C.vert("cat Ordre") + ". Grace te guide à la radio ; quatorze maîtres du port t'attendent sur leurs quais.\n\n" +
		C.gris("Ce chapitre a sa propre note sur 20. quetes pour le journal, indice si tu bloques, xp pour ta note, port pour le plan, galons pour ton rang. Chaque commande avance l'horloge de cinq minutes."));
	return true;
}
