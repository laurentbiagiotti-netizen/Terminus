/**
 * Port.js : la vie du Grand Port (chapitre 8 pour le joueur, numéro interne 9).
 *
 * Chapitre8.js pose le monde, l'horloge, les rangs, la bataille et les 44 étapes. Ici, le port prend vie :
 *  - les quatorze maîtres du port, un par quai, ont un texte VIVANT : ils entrent en scène, expliquent leur quai par
 *    une image (avec le vrai mot du métier à côté), donnent la syntaxe, confient la mission, réagissent aux erreurs
 *    fréquentes, puis racontent une histoire du métier ; ils enseignent leurs MANŒUVRES (les sous-commandes de docker),
 *    mais seulement à qui porte les galons de leur quai ;
 *  - les défis (quêtes secondaires s_n8_*) : six par maître, révélés par lui, et cinq défis d'honneur de Laurent ;
 *  - les badges du chapitre (un par quai tenu, un par galon, le port, la flotte, le piège, le rapport, l'aube) ;
 *  - les commandes du jeu port (le plan du Grand Port) et galons (alias rang), le bestiaire, les noms imagés des sorts.
 */

World.fige = false;

/* ------------------------------------------------------------------ */
/* Les défis du Grand Port (quêtes secondaires, six par maître)         */
/* ------------------------------------------------------------------ */

function oPort(args){ return args.filter(function(a){ return /^-[A-Za-z0-9]+$/.test(a); }).join("").replace(/-/g, ""); }
function sousPort8(a){ return sousDockerCh8(a || []); }
function argsTextePort(a){ return (a || []).join(" "); }
function aFormatPort(a, motif){ var f = valeurOptionCh8(a, ["-f", "--format"]); return f !== null && (!motif || motif.test(f)); }
function imageDeEvenementPort(e){ try { return etatPort(e.hote).images[e.imageId || e.image] || null; } catch (x){ return null; } }
function texteDockerfilePort(h, r){ return r && r.dossier ? texteHote(h, cheminNormal(r.dossier + "/" + (r.dockerfile || "Dockerfile"))) || "" : ""; }

/* appel(nom, args, sortie, io, h) : le sort lancé au port, et sa sortie, le prouvent. monde() : l'état des machines le prouve.
   evenement + quand(e) : un événement du moteur du port (GameEvents « port »). */
var DEFIS_PORT = [
	// Le Quai des Premiers Pas (Kylian)
	{ id: "s_n8_version_format", m: "premiers", titre: "Premiers Pas : la version du démon, et rien d'autre (docker version --format '{{.Server.Version}}')",
	  appel: function(n, a, s){ return n === "docker" && a[0] === "version" && aFormatPort(a, /Server\.Version/) && /^\d+\.\d+/.test(s.trim()); } },
	{ id: "s_n8_socket_ls", m: "premiers", titre: "Premiers Pas : la porte du démon, une socket à root et au groupe docker (ls -l /var/run/docker.sock)",
	  appel: function(n, a, s){ return n === "ls" && /docker\.sock/.test(argsTextePort(a)) && /^s/m.test(s); } },
	{ id: "s_n8_info_conteneurs", m: "premiers", titre: "Premiers Pas : combien de caisses sur ce quai (docker info --format '{{.Containers}}')",
	  appel: function(n, a, s){ return n === "docker" && a[0] === "info" && aFormatPort(a, /Containers/) && /^\d+$/.test(s.trim()); } },
	{ id: "s_n8_ctr", m: "premiers", titre: "Premiers Pas : sous la grue, la cale du dessous (sudo ctr -n moby containers ls)",
	  appel: function(n, a, s, io){ return n === "ctr" && io.sudo && /moby/.test(argsTextePort(a)) && /CONTAINER/.test(s); } },
	{ id: "s_n8_os_release", m: "premiers", titre: "Premiers Pas : la carte d'identité d'une caisse jetable (docker run --rm ... cat /etc/os-release)",
	  appel: function(n, a, s){ return n === "docker" && sousPort8(a) === "run" && a.indexOf("--rm") > -1 && /PRETTY_NAME=/.test(s); } },
	{ id: "s_n8_ps_q", m: "premiers", titre: "Premiers Pas : seulement les identifiants (docker ps -q)",
	  appel: function(n, a, s){ return n === "docker" && sousPort8(a) === "ps" && /q/.test(oPort(a)) && /^[0-9a-f]{12}$/m.test(s); } },
	// La Capitainerie (Julien)
	{ id: "s_n8_logs_tail", m: "capitainerie", titre: "Capitainerie : les dernières lignes du journal de bord (docker logs --tail)",
	  evenement: "port", quand: function(e){ return e.cmd === "logs" && e.queue !== null && e.queue !== undefined; } },
	{ id: "s_n8_restart", m: "capitainerie", titre: "Capitainerie : relancer une caisse d'un seul geste (docker restart)",
	  evenement: "port", quand: function(e){ return e.cmd === "restart" && e.ok; } },
	{ id: "s_n8_port_vigie", m: "capitainerie", titre: "Capitainerie : quelles portes la vigie ouvre sur le quai (docker port vigie)",
	  evenement: "port", quand: function(e){ return e.cmd === "port" && e.conteneur === "vigie" && (e.ports || []).length > 0; } },
	{ id: "s_n8_rename", m: "capitainerie", titre: "Capitainerie : rebaptiser une caisse (docker rename)",
	  evenement: "port", quand: function(e){ return e.cmd === "rename"; } },
	{ id: "s_n8_wait", m: "capitainerie", titre: "Capitainerie : attendre qu'une caisse finisse son quart, et lire son code (docker wait)",
	  evenement: "port", quand: function(e){ return e.cmd === "wait" && e.code !== undefined; } },
	{ id: "s_n8_ip_format", m: "capitainerie", titre: "Capitainerie : l'adresse d'une caisse sur le pont par défaut (inspect --format '{{.NetworkSettings.IPAddress}}')",
	  appel: function(n, a, s){ return n === "docker" && sousPort8(a) === "inspect" && aFormatPort(a, /IPAddress/) && /^172\.\d+\.\d+\.\d+$/m.test(s.trim()); } },
	// L'Entrepôt des plans (Grégoire)
	{ id: "s_n8_pull_digest", m: "plans", titre: "Entrepôt des plans : tirer un plan par son empreinte (docker pull NOM@sha256:...)",
	  appel: function(n, a, s){ return n === "docker" && sousPort8(a) === "pull" && /@sha256:[0-9a-f]{64}/.test(argsTextePort(a)) && /Digest: sha256|Status:/.test(s); } },
	{ id: "s_n8_dangling", m: "plans", titre: "Entrepôt des plans : seulement les plans sans nom (docker images --filter dangling=true)",
	  appel: function(n, a, s){ return n === "docker" && sousPort8(a) === "images" && /dangling=true/.test(argsTextePort(a)) && /REPOSITORY|^[0-9a-f]{12}$/m.test(s); } },
	{ id: "s_n8_history_notrunc", m: "plans", titre: "Entrepôt des plans : chaque cale en entier, sans coupure (docker history --no-trunc)",
	  evenement: "port", quand: function(e){ return e.cmd === "history" && e.noTrunc; } },
	{ id: "s_n8_os_arch", m: "plans", titre: "Entrepôt des plans : pour quelle mer ce plan est dessiné (image inspect --format '{{.Os}}/{{.Architecture}}')",
	  appel: function(n, a, s){ return n === "docker" && /inspect/.test(argsTextePort(a)) && aFormatPort(a, /Architecture/) && /^linux\/(amd64|arm64)$/m.test(s.trim()); } },
	{ id: "s_n8_df_v", m: "plans", titre: "Entrepôt des plans : la place prise, plan par plan (docker system df -v)",
	  appel: function(n, a, s){ return n === "docker" && a[0] === "system" && a[1] === "df" && (a.indexOf("-v") > -1 || a.indexOf("--verbose") > -1) && /Images space usage/.test(s); } },
	{ id: "s_n8_rmi_court", m: "plans", titre: "Entrepôt des plans : retirer un plan par son identifiant court (docker rmi 1a2b3c4d)",
	  appel: function(n, a, s){ return n === "docker" && sousPort8(a) === "rmi" && a.some(function(x){ return /^[0-9a-f]{4,12}$/.test(x); }) && /Deleted|Untagged/.test(s); } },
	// Les Soutes (Chahla)
	{ id: "s_n8_mountpoint", m: "soutes", titre: "Soutes : où dort la soute, sur le quai (volume inspect --format '{{.Mountpoint}}')",
	  appel: function(n, a, s){ return n === "docker" && a[0] === "volume" && a[1] === "inspect" && aFormatPort(a, /Mountpoint/) && /^\/var\/lib\/docker\/volumes\/\S+\/_data$/m.test(s.trim()); } },
	{ id: "s_n8_mount_volume", m: "soutes", titre: "Soutes : la forme longue d'un montage (--mount type=volume,source=...,target=...)",
	  appel: function(n, a, s, io){ return n === "docker" && (sousPort8(a) === "run" || sousPort8(a) === "create") && a.indexOf("--mount") > -1 && /type=volume/.test(argsTextePort(a)) && !io.code; } },
	{ id: "s_n8_volume_prune", m: "soutes", titre: "Soutes : balayer les soutes abandonnées (docker volume prune)",
	  evenement: "port", quand: function(e){ return e.cmd === "prune" && e.quoi === "volumes"; } },
	{ id: "s_n8_volume_anonyme", m: "soutes", titre: "Soutes : repérer une soute sans nom, laissée par un VOLUME d'image (docker volume ls)",
	  appel: function(n, a, s){ return n === "docker" && a[0] === "volume" && (a[1] === "ls" || a[1] === "list") && /^local\s+[0-9a-f]{64}\s*$/m.test(s); } },
	{ id: "s_n8_ls_mountpoint", m: "soutes", titre: "Soutes : descendre dans la soute, par l'écoutille de root (sudo ls /var/lib/docker/volumes/.../_data)",
	  appel: function(n, a, s, io){ return n === "ls" && io.sudo && /\/var\/lib\/docker\/volumes\/[^\/]+\/_data/.test(argsTextePort(a)) && s.trim() !== ""; } },
	{ id: "s_n8_restauration", m: "soutes", titre: "Soutes : rouvrir la caisse de sauvegarde dans une soute neuve (tar -xzf dans un conteneur)",
	  appel: function(n, a, s, io){ return n === "docker" && sousPort8(a) === "run" && a.indexOf("tar") > -1 && a.some(function(x){ return /^-?[a-z]*x[a-z]*$/.test(x) && /x/.test(x); }) && a.some(function(x){ return /^[a-z][a-z0-9_.-]*:\//.test(x) && !/^cales:/.test(x); }) && !io.code; } },
	// Les Chenaux (Adonis)
	{ id: "s_n8_connect", m: "chenaux", titre: "Chenaux : faire entrer une caisse dans un chenal, à chaud (docker network connect)",
	  evenement: "port", quand: function(e){ return e.cmd === "reseau" && e.action === "connect"; } },
	{ id: "s_n8_disconnect", m: "chenaux", titre: "Chenaux : la faire sortir du chenal (docker network disconnect)",
	  evenement: "port", quand: function(e){ return e.cmd === "reseau" && e.action === "disconnect"; } },
	{ id: "s_n8_alias", m: "chenaux", titre: "Chenaux : un surnom sur le chenal, et qui répond (--network-alias)",
	  appel: function(n, a, s){ var al = sCh8().aliasPort || []; return n === "docker" && (sousPort8(a) === "exec" || sousPort8(a) === "run") && al.some(function(x){ return a.indexOf(x) > -1; }) && /bytes from|Welcome to nginx|Address/.test(s); } },
	{ id: "s_n8_bridge_noms", m: "chenaux", titre: "Chenaux : sur le pont par défaut, les noms ne passent pas (ping refusé : bad address)",
	  appel: function(n, a, s){ return n === "docker" && sousPort8(a) === "run" && !valeurOptionCh8(a, ["--network", "--net"]) && /ping|wget|nslookup/.test(argsTextePort(a)) && /bad address|can't resolve/.test(s); } },
	{ id: "s_n8_network_prune", m: "chenaux", titre: "Chenaux : combler les chenaux abandonnés (docker network prune)",
	  evenement: "port", quand: function(e){ return e.cmd === "prune" && e.quoi === "reseaux"; } },
	{ id: "s_n8_network_format", m: "chenaux", titre: "Chenaux : qui navigue dans ce chenal (network inspect --format ... .Containers)",
	  appel: function(n, a, s){ return n === "docker" && a[0] === "network" && a[1] === "inspect" && aFormatPort(a, /Containers/) && s.trim() !== ""; } },
	// Le Chantier naval (Eden)
	{ id: "s_n8_entrypoint_cmd", m: "chantier", titre: "Chantier naval : ENTRYPOINT et CMD, et les arguments par défaut remplacés au lancement",
	  evenement: "port", quand: function(e){ if (e.cmd !== "run") return false; var im = imageDeEvenementPort(e); return !!im && im.origine === "build" && !!(im.config.Entrypoint && im.config.Entrypoint.length) && !!(im.config.Cmd && im.config.Cmd.length) && (e.argv || []).length > 0; } },
	{ id: "s_n8_workdir_pwd", m: "chantier", titre: "Chantier naval : WORKDIR, vu de l'intérieur (docker exec ... pwd)",
	  appel: function(n, a, s, io, h){ if (n !== "docker" || sousPort8(a) !== "exec" || a.indexOf("pwd") === -1) return false; var c = conteneurPort(h, a.filter(function(x){ return x.charAt(0) !== "-"; })[1]); return !!c && !!c.config.WorkingDir && c.config.WorkingDir !== "/" && s.trim() === c.config.WorkingDir; } },
	{ id: "s_n8_expose_P", m: "chantier", titre: "Chantier naval : EXPOSE, et -P qui publie tout seul (docker run -P)",
	  appel: function(n, a, s, io){ return n === "docker" && sousPort8(a) === "run" && (a.indexOf("-P") > -1 || a.indexOf("--publish-all") > -1) && !io.code; } },
	{ id: "s_n8_build_f", m: "chantier", titre: "Chantier naval : construire depuis un autre plan (docker build -f)",
	  evenement: "port", quand: function(e){ return e.cmd === "build" && e.ok && e.record && e.record.dockerfile && e.record.dockerfile !== "Dockerfile"; } },
	{ id: "s_n8_instruction_inconnue", m: "chantier", titre: "Chantier naval : lire l'erreur d'une instruction inconnue (unknown instruction)",
	  appel: function(n, a, s){ return n === "docker" && /build/.test(argsTextePort(a)) && /unknown instruction/i.test(s); } },
	{ id: "s_n8_arg_sans_defaut", m: "chantier", titre: "Chantier naval : un ARG sans valeur par défaut, donné par --build-arg",
	  evenement: "port", quand: function(e){ if (e.cmd !== "build" || !e.ok || !e.record) return false; var t = texteDockerfilePort(e.hote, e.record); return Object.keys(e.record.buildArgs || {}).some(function(k){ return new RegExp("^ARG\\s+" + k + "\\s*$", "m").test(t); }); } },
	// Les Cales (Megane)
	{ id: "s_n8_no_cache", m: "cales", titre: "Cales : tout reconstruire, sans le cache (docker build --no-cache)",
	  evenement: "port", quand: function(e){ return e.cmd === "build" && e.ok && e.record && e.record.sansCache; } },
	{ id: "s_n8_couche_0b", m: "cales", titre: "Cales : une cale qui ne pèse rien, dans un plan à toi (docker history : 0B)",
	  evenement: "port", quand: function(e){ if (e.cmd !== "history") return false; var im = etatPort(e.hote).images[e.image]; return !!im && im.origine === "build" && (e.lignes || []).some(function(l){ return !l.taille; }); } },
	{ id: "s_n8_apt_deux_run", m: "cales", titre: "Cales : peser la cale des listes d'apt laissée par un RUN à part (docker history)",
	  evenement: "port", quand: function(e){ if (e.cmd !== "history") return false; var im = etatPort(e.hote).images[e.image]; return !!im && (im.couches || []).some(function(id){ var cc = couchePort(e.hote, id); return cc && Object.keys(cc.fichiers || {}).some(function(p){ return /^\/var\/lib\/apt\/lists\/[^\/]+_/.test(p); }); }); } },
	{ id: "s_n8_slim_complete", m: "cales", titre: "Cales : la coque complète contre la coque fine (docker images python : 3.12 et 3.12-slim)",
	  appel: function(n, a, s){ return n === "docker" && sousPort8(a) === "images" && /3\.12-slim/.test(s) && /\s3\.12\s/.test(s); } },
	{ id: "s_n8_builder_prune", m: "cales", titre: "Cales : vider le cache du chantier (docker builder prune)",
	  evenement: "port", quand: function(e){ return e.cmd === "builderPrune"; } },
	{ id: "s_n8_progress_plain", m: "cales", titre: "Cales : le chantier raconté en entier (docker build --progress=plain)",
	  appel: function(n, a, s, io){ return n === "docker" && /build/.test(argsTextePort(a)) && /--progress[= ]plain/.test(argsTextePort(a)) && !io.code; } },
	// Le Chantier des maîtres (Jahmal)
	{ id: "s_n8_copy_from", m: "maitres", titre: "Chantier des maîtres : emporter une pièce d'une étape nommée (COPY --from=NOM)",
	  evenement: "port", quand: function(e){ return e.cmd === "build" && e.ok && e.record && (e.record.etapes || []).some(function(x){ return /COPY --from=[A-Za-z]/.test(x.texte || ""); }); } },
	{ id: "s_n8_target", m: "maitres", titre: "Chantier des maîtres : s'arrêter à une étape (docker build --target)",
	  evenement: "port", quand: function(e){ return e.cmd === "build" && e.ok && e.record && !!e.record.cible; } },
	{ id: "s_n8_unhealthy", m: "maitres", titre: "Chantier des maîtres : un navire qui se dit malade (unhealthy observé)",
	  evenement: "port", quand: function(e){ return e.cmd === "sante" && e.statut === "unhealthy"; } },
	{ id: "s_n8_label_format", m: "maitres", titre: "Chantier des maîtres : lire l'étiquette d'un plan (inspect --format avec .Config.Labels)",
	  appel: function(n, a, s){ return n === "docker" && /inspect/.test(argsTextePort(a)) && aFormatPort(a, /Labels/) && /\S/.test(s) && !/^map\[\]$|^null$/.test(s.trim()); } },
	{ id: "s_n8_scratch", m: "maitres", titre: "Chantier des maîtres : partir de rien (FROM scratch)",
	  evenement: "port", quand: function(e){ return e.cmd === "build" && e.ok && e.record && /^FROM\s+scratch\b/im.test(texteDockerfilePort(e.hote, e.record)); } },
	{ id: "s_n8_sans_shell", m: "maitres", titre: "Chantier des maîtres : un navire sans shell, qu'on ne peut pas aborder (exec refusé)",
	  appel: function(n, a, s){ return n === "docker" && sousPort8(a) === "exec" && /executable file not found/.test(s) && /\b(sh|bash)\b/.test(argsTextePort(a)); } },
	// Le Registre du port (Déborah)
	{ id: "s_n8_htpasswd_bbn", m: "registre", titre: "Registre du port : une ligne de mot de passe, au bcrypt (htpasswd -Bbn)",
	  appel: function(n, a, s){ return n === "htpasswd" && /B/.test(oPort(a)) && /n/.test(oPort(a)) && /:\$2y\$/.test(s); } },
	{ id: "s_n8_catalogue", m: "registre", titre: "Registre du port : le catalogue de l'entrepôt, avec les clés (curl -u ... /v2/_catalog)",
	  evenement: "port", quand: function(e){ return e.cmd === "http" && e.hote === "entrepot" && e.code === 200 && /^\/v2\/_catalog/.test(e.chemin || ""); } },
	{ id: "s_n8_tags_list", m: "registre", titre: "Registre du port : les versions d'un plan rangé (/v2/NOM/tags/list)",
	  evenement: "port", quand: function(e){ return e.cmd === "http" && e.hote === "entrepot" && e.code === 200 && /^\/v2\/.+\/tags\/list/.test(e.chemin || ""); } },
	{ id: "s_n8_tag_version", m: "registre", titre: "Registre du port : pousser une vraie version, jamais latest",
	  evenement: "port", quand: function(e){ return e.cmd === "push" && e.ok && e.tag && e.tag !== "latest" && /^\d/.test(e.tag); } },
	{ id: "s_n8_push_refuse", m: "registre", titre: "Registre du port : sans clé, l'entrepôt ferme sa porte (no basic auth credentials)",
	  appel: function(n, a, s){ return n === "docker" && /push|pull/.test(sousPort8(a)) && /no basic auth credentials/.test(s); } },
	{ id: "s_n8_config_json", m: "registre", titre: "Registre du port : où docker range ta clé, et qu'elle n'est pas chiffrée (~/.docker/config.json)",
	  appel: function(n, a, s){ return (n === "cat" || n === "jq" || n === "less") && /config\.json/.test(argsTextePort(a)) && /auths/.test(s) && /"auth"/.test(s); } },
	// La Feuille de route (Elias)
	{ id: "s_n8_config_services", m: "feuille", titre: "Feuille de route : la liste des navires du convoi (docker compose config --services)",
	  evenement: "port", quand: function(e){ return e.cmd === "composeConfig" && e.option === "services"; } },
	{ id: "s_n8_compose_ps_format", m: "feuille", titre: "Feuille de route : l'état du convoi, à ta façon (docker compose ps --format)",
	  evenement: "port", quand: function(e){ return e.cmd === "composePs" && !!e.format; } },
	{ id: "s_n8_compose_exec", m: "feuille", titre: "Feuille de route : aborder un navire du convoi par son nom de service (docker compose exec)",
	  evenement: "port", quand: function(e){ return e.cmd === "composeExec"; } },
	{ id: "s_n8_down_v_essai", m: "feuille", titre: "Feuille de route : un convoi d'essai coulé avec ses soutes (docker compose down -v, ailleurs que sur l'école)",
	  evenement: "port", quand: function(e){ return e.cmd === "composeDown" && e.volumes && e.projet !== "ecole"; } },
	{ id: "s_n8_compose_top", m: "feuille", titre: "Feuille de route : les processus d'un navire du convoi (docker compose top)",
	  evenement: "port", quand: function(e){ return e.cmd === "composeTop"; } },
	{ id: "s_n8_env_interpole", m: "feuille", titre: "Feuille de route : une valeur prise dans le fichier .env (${VARIABLE} dans compose.yaml)",
	  evenement: "port", quand: function(e){ if (e.cmd !== "composeConfig") return false; var p = (etatPort(e.hote).projets || {})[e.projet]; var d = e.dossier || (p ? p.dossier : null); if (!d){ var x = projetsComposePort(e.hote)[e.projet]; d = x ? x.dossier : null; } return !!d && texteHote(e.hote, d + "/.env") !== null && /\$\{/.test(texteHote(e.hote, d + "/compose.yaml") || ""); } },
	// La Vigie (Remi)
	{ id: "s_n8_stats_format", m: "vigie", titre: "Vigie : les vivres de chaque caisse, en une ligne (docker stats --no-stream --format)",
	  evenement: "port", quand: function(e){ return e.cmd === "stats" && !e.flux && !!e.format; } },
	{ id: "s_n8_events_type", m: "vigie", titre: "Vigie : seulement les événements des caisses (docker events --filter type=container)",
	  evenement: "port", quand: function(e){ return e.cmd === "events" && (e.filtres || []).some(function(f){ return /^type=container$/.test(f); }); } },
	{ id: "s_n8_update_memoire", m: "vigie", titre: "Vigie : rationner une caisse sans l'arrêter (docker update --memory)",
	  evenement: "port", quand: function(e){ return e.cmd === "update" && e.memoire > 0 && e.enMarche; } },
	{ id: "s_n8_on_failure", m: "vigie", titre: "Vigie : une caisse qui retombe, relancée trois fois au plus (--restart on-failure:3)",
	  monde: function(){ return estHoteDockerPort("docks") && conteneursPort("docks").some(function(c){ return c.hote.restart.nom === "on-failure" && c.hote.restart.max === 3 && c.etat.redemarrages >= 1; }); } },
	{ id: "s_n8_dockerd_validate", m: "vigie", titre: "Vigie : vérifier la feuille du démon avant de le relancer (dockerd --validate)",
	  appel: function(n, a, s){ return n === "dockerd" && a.indexOf("--validate") > -1 && /configuration OK/.test(s); } },
	{ id: "s_n8_journalctl_docker", m: "vigie", titre: "Vigie : le journal du démon lui-même (journalctl -u docker)",
	  appel: function(n, a, s){ return n === "journalctl" && /\bdocker\b/.test(argsTextePort(a)) && /dockerd/.test(s); } },
	// L'Armurerie (Ian)
	{ id: "s_n8_chown_refuse", m: "armurerie", titre: "Armurerie : sans capacités, même root ne peut plus changer un propriétaire (--cap-drop ALL, chown refusé)",
	  appel: function(n, a, s){ return n === "docker" && /run|exec/.test(sousPort8(a)) && /--cap-drop[= ]ALL/i.test(argsTextePort(a)) && /chown/.test(argsTextePort(a)) && /Operation not permitted/.test(s); } },
	{ id: "s_n8_secopt_format", m: "armurerie", titre: "Armurerie : lire les verrous d'une caisse (inspect --format '{{.HostConfig.SecurityOpt}}')",
	  appel: function(n, a, s){ return n === "docker" && sousPort8(a) === "inspect" && aFormatPort(a, /SecurityOpt/) && /no-new-privileges/.test(s); } },
	{ id: "s_n8_userns", m: "armurerie", titre: "Armurerie : sur navire3, le root des caisses n'est plus root du navire (userns-remap, docker info)",
	  appel: function(n, a, s, io, h){ return n === "docker" && a[0] === "info" && h === "navire3" && /userns/.test(s); } },
	{ id: "s_n8_secret_lu", m: "armurerie", titre: "Armurerie : un secret, lu là où il est monté (/run/secrets)",
	  appel: function(n, a, s){ return n === "docker" && /exec|compose/.test(a[0] || "") && /\/run\/secrets\//.test(argsTextePort(a)) && /\S/.test(s) && !/No such file/.test(s); } },
	{ id: "s_n8_pids_limit", m: "armurerie", titre: "Armurerie : un plafond de processus contre les tempêtes de fork (--pids-limit)",
	  appel: function(n, a, s, io){ return n === "docker" && (sousPort8(a) === "run" || sousPort8(a) === "create" || sousPort8(a) === "update") && /--pids-limit/.test(argsTextePort(a)) && !io.code; } },
	{ id: "s_n8_pas_privileged", m: "armurerie", titre: "Armurerie : vérifier qu'une caisse n'a pas les pleins pouvoirs (inspect --format '{{.HostConfig.Privileged}}' : false)",
	  appel: function(n, a, s){ return n === "docker" && sousPort8(a) === "inspect" && aFormatPort(a, /Privileged/) && /^false$/m.test(s.trim()); } },
	// La Douane (Soufiane)
	{ id: "s_n8_jq_layers", m: "douane", titre: "Douane : la liste des couches de l'archive (jq '.[0].Layers' manifest.json)",
	  appel: function(n, a, s, io, h){ return n === "jq" && h === "douane" && /Layers/.test(argsTextePort(a)) && /sha256|\.tar/.test(s); } },
	{ id: "s_n8_entrypoint_format", m: "douane", titre: "Douane : ce que l'éclaireur lancerait, sans le lancer (inspect --format '{{.Config.Entrypoint}}')",
	  appel: function(n, a, s, io, h){ return n === "docker" && h === "douane" && /inspect/.test(argsTextePort(a)) && aFormatPort(a, /Entrypoint/) && /flotte\.sh/.test(s); } },
	{ id: "s_n8_rm_autopsie", m: "douane", titre: "Douane : la caisse d'autopsie retirée, jamais démarrée (docker rm)",
	  evenement: "port", quand: function(e){ if (e.cmd !== "rm" || e.hote !== "douane") return false; var ecl = imagePort("douane", "eclaireur:prise"); return !!ecl && e.image === ecl.id; } },
	{ id: "s_n8_digests_douane", m: "douane", titre: "Douane : les empreintes des plans en quarantaine (docker image ls --digests, sur douane)",
	  evenement: "port", quand: function(e){ return e.cmd === "images" && e.hote === "douane" && e.digests; } },
	{ id: "s_n8_load_douane", m: "douane", titre: "Douane : l'archive de l'éclaireur rechargée, et toujours pas lancée (docker load -i)",
	  evenement: "port", quand: function(e){ return e.cmd === "load" && e.hote === "douane"; } },
	{ id: "s_n8_temoin_texte", m: "douane", titre: "Douane : lire le fichier-témoin sorti de la caisse (cat temoin.txt)",
	  appel: function(n, a, s, io, h){ return (n === "cat" || n === "less") && h === "douane" && /Propriété de la flotte noire/.test(s); } },
	// L'Escadre (Arnaud)
	{ id: "s_n8_join_token", m: "escadre", titre: "Escadre : le jeton des navires, redemandé (docker swarm join-token worker)",
	  evenement: "port", quand: function(e){ return e.cmd === "joinToken" && e.role === "worker"; } },
	{ id: "s_n8_label_add", m: "escadre", titre: "Escadre : une étiquette sur un navire (docker node update --label-add)",
	  evenement: "port", quand: function(e){ return e.cmd === "nodeUpdate" && Object.keys(e.labels || {}).length > 0; } },
	{ id: "s_n8_service_logs", m: "escadre", titre: "Escadre : le journal d'un service, de tous les navires à la fois (docker service logs)",
	  evenement: "port", quand: function(e){ return e.cmd === "serviceLogs"; } },
	{ id: "s_n8_inspect_pretty", m: "escadre", titre: "Escadre : un service, lisible par un humain (docker service inspect --pretty)",
	  evenement: "port", quand: function(e){ return e.cmd === "serviceInspect" && e.pretty; } },
	{ id: "s_n8_stack_services", m: "escadre", titre: "Escadre : les services d'une pile (docker stack services)",
	  evenement: "port", quand: function(e){ return e.cmd === "stackServices"; } },
	{ id: "s_n8_secret_ls", m: "escadre", titre: "Escadre : les secrets de l'escadre, sans leur contenu (docker secret ls)",
	  evenement: "port", quand: function(e){ return e.cmd === "secretLs"; } },
	// Les défis d'honneur (Laurent)
	{ id: "s_n8_sans_indice", m: "honneur", titre: "Honneur : remettre le rapport sans avoir acheté un seul indice" },
	{ id: "s_n8_matelot_j1", m: "honneur", titre: "Honneur : Matelot avant ta première nuit (avant J1 22:00)" },
	{ id: "s_n8_capitaine_j2", m: "honneur", titre: "Honneur : Capitaine avant la fin du deuxième jour (avant J2 22:00)" },
	{ id: "s_n8_avant_aube", m: "honneur", titre: "Honneur : l'escadre en mer avant l'aube du quatrième jour" },
	{ id: "s_n8_signature", m: "honneur", titre: "Après la victoire : consigner dans le rapport l'empreinte du constructeur, et la machine qui la porte",
	  monde: function(){ var t = sansAccentCh8(rapportCh8() || ""); return state.has("victoireCh8") && t.indexOf(sansAccentCh8(signatureBastionPort())) > -1 && /bastion/.test(t); } }
];
DEFIS_PORT.forEach(function(d){ QUETES_SECONDAIRES_CH8.push({ id: d.id, titre: d.titre }); });
function defisQuaiPort(cle){ return DEFIS_PORT.filter(function(d){ return d.m === cle; }); }
function idsDefisQuaiPort(cle){ return defisQuaiPort(cle).map(function(d){ return d.id; }); }
function listeDefisQuaiPort(cle){
	return defisQuaiPort(cle).map(function(d){ return "  " + (aFait(d.id) ? C.vert("[x]") : "[ ]") + " " + d.titre.replace(/^[^:]+ : /, ""); }).join("\n");
}
function portActifPort(){ return grandPortOuvert() && !!(state.quests && state.quests["n8_quai"]); }
function reussirDefiPort(id){
	if (!portActifPort() || state.quests[id]) return;
	state.complete(id);
}

/* Les sorts lancés au port (et leur sortie), une fois qu'ils ont réussi. */
var APPELER_AVANT_DEFIS_PORT = Shell.appeler;
function essayerDefisPort(nom, args, s, io){
	var h = portActifPort() ? portIci() : null;
	if (!h) return;
	try {
		DEFIS_PORT.forEach(function(d){ if (d.appel && !state.quests[d.id] && d.appel(nom, args || [], s, io || {}, h)) reussirDefiPort(d.id); });
	} catch (e){ /* un défi ne doit jamais casser un sort */ }
}
Shell.appeler = function(nom, args, io){
	var sortie;
	try { sortie = APPELER_AVANT_DEFIS_PORT.apply(this, arguments); }
	catch (err){
		/* Certains défis se prouvent par le refus lui-même (une instruction inconnue, un exec sans shell, un push sans clé). */
		if (err instanceof ShellError){
			var io2 = {}; for (var k in (io || {})) if (io.hasOwnProperty(k)) io2[k] = io[k];
			io2.code = err.code || 1;
			essayerDefisPort(nom, args, sansAnsi(String(err.message || "")), io2);
		}
		throw err;
	}
	essayerDefisPort(nom, args, typeof sortie === "string" ? sansAnsi(sortie) : "", io);
	return sortie;
};
(function(){
	var types = {};
	DEFIS_PORT.forEach(function(d){ if (d.evenement) (types[d.evenement] = types[d.evenement] || []).push(d); });
	Object.keys(types).forEach(function(type){
		GameEvents.addListener(type, function(e){
			if (!portActifPort()) return;
			types[type].forEach(function(d){ try { if (!state.quests[d.id] && d.quand(e)) reussirDefiPort(d.id); } catch (x){} });
		});
	});
})();
/* Les surnoms donnés sur un chenal (pour le défi d'Adonis). */
GameEvents.addListener("port", function(e){
	if (!portActifPort()) return;
	try {
		var c = sCh8();
		var al = [];
		if (e.cmd === "run" || e.cmd === "create") al = listePort((e.options || {})["network-alias"]).concat(listePort((e.options || {}).alias));
		if (e.cmd === "reseau" && e.action === "connect") al = e.alias || [];
		if (al.length){ c.aliasPort = c.aliasPort || []; al.forEach(function(x){ if (c.aliasPort.indexOf(x) === -1) c.aliasPort.push(x); }); }
	} catch (x){}
});

/* ------------------------------------------------------------------ */
/* Les quatorze maîtres du port, vivants                               */
/* ------------------------------------------------------------------ */

function rangRequisPort(q){ return Math.max(0, q.acte - 1); }
function texteMaitrePort(g){
	var q = quaiCh8(g.q);
	var defis = "\n\n" + C.gras("Les défis " + (/^[AEIOUHaeiouhÉ]/.test(g.nom) ? "d'" : "de ") + g.nom) + C.gris(" (des quêtes secondaires, sur " + q.machine + ")") + "\n" + listeDefisQuaiPort(g.q);
	if (rangCh8() < rangRequisPort(q)) return g.entree() + "\n\n" + C.jaune(g.nom + " pose la main sur ta manche et compte tes galons. « Ce quai s'ouvre aux " + ["Mousses", "Matelots", "Quartiers-maîtres", "Seconds", "Capitaines", "Amiraux"][rangRequisPort(q)] + ". Tu es " + nomRangCh8() + ". " +
		"Reviens avec tes galons : galons te dira ce qu'il te manque. »");
	var faites = q.etapes.filter(aFait).length;
	if (faites === q.etapes.length) return g.fin() + defis;
	var erreur = null;
	try { erreur = g.erreur ? g.erreur() : null; } catch (x){ erreur = null; }
	var etapes = "\n\n" + C.gras("Ton quai") + "\n" + q.etapes.map(function(id){ var x = QUETES_CH8.filter(function(y){ return y.id === id; })[0]; return "  " + (aFait(id) ? C.vert("[x]") : "[ ]") + " " + x.titre.replace(/^[^:]+ : /, ""); }).join("\n");
	var corps = faites ? g.suite() + "\n\n" + g.syntaxe() : g.entree() + "\n\n" + g.image() + "\n\n" + g.syntaxe() + "\n\n" + g.mission();
	return corps + etapes + (erreur ? "\n\n" + C.jaune(erreur) : "") + "\n\n" + C.gris(g.metier) + defis;
}
function manoeuvresDePort(nom){ return Object.keys(MANOEUVRES_PORT).filter(function(k){ return MANOEUVRES_PORT[k] === nom; }); }

var MAITRES_PORT = {
	premiers: { nom: "Kylian", q: "premiers",
		metier: "Le métier : un conteneur n'est pas une machine virtuelle. C'est un processus de l'hôte, cloisonné par le noyau (les espaces de noms) et rationné (les cgroups). Et le groupe docker vaut root : on n'y met que ceux qui administrent.",
		entree: function(){ return "Un garçon en marinière, bonnet à pompon sur la tête, est assis sur le seuil d'un conteneur aux portes grandes ouvertes. Il saute sur ses pieds. « Kylian ! C'est moi qui accueille les mousses. Tu n'as jamais touché une caisse vivante ? Parfait. Tout le monde commence ici. »"; },
		image: function(){ return "« Regarde ce conteneur. Dedans, une seule chose : un programme, et juste ce qu'il lui faut pour vivre. Il croit être seul au monde : ses processus, son réseau, son nom, ses fichiers. " +
			"C'est le noyau du quai qui lui fait croire ça : des cloisons (les espaces de noms) et des rations (les cgroups). Une machine virtuelle, c'est un navire entier avec son propre noyau ; un conteneur, c'est une caisse posée sur NOTRE navire, qui partage notre noyau. Plus léger, plus rapide.\n\n" +
			"Sur le quai, un démon fait tout : dockerd. La commande docker, c'est ta voix ; elle lui parle par une porte, le socket /var/run/docker.sock. Cette porte appartient à root et au groupe docker. " +
			"Et écoute bien : qui est dans le groupe docker peut tout faire sur la machine, comme root. On ne le donne pas à la légère. »"; },
		syntaxe: function(){ return "« Sur docks :\n\n" +
			"  systemctl status docker            le démon tourne-t-il ?\n" +
			"  ls -l /var/run/docker.sock         la porte : srw-rw---- root docker\n" +
			"  sudo usermod -aG docker TOI        entrer dans l'équipage (puis exit, et ssh docks : le groupe se lit à la connexion)\n" +
			"  docker version ; docker info       la voix et le démon se présentent\n" +
			"  docker run hello-world             la première caisse : elle naît, parle, et s'arrête\n" +
			"  docker run -it --rm alpine:3.20 sh   un shell jetable : -i garde l'entrée, -t donne un terminal, --rm efface à la sortie\n" +
			"  docker ps ; docker ps -a           les caisses qui tournent ; toutes, même arrêtées\n\n" +
			"Tes manœuvres : docker run, ps, version, info, images, pull, rm. Et ctr, pour regarder sous la grue. »"; },
		mission: function(){ return "« Ta mission : entre dans l'équipage du démon, proprement, et prouve-le sans sudo (docker info). Puis ta première caisse, hello-world, et un shell jetable dans une alpine. Regarde ce qui reste sur le quai avec docker ps -a. »"; },
		suite: function(){ return "Kylian te tape sur l'épaule. « Tu parles au démon, maintenant. Continue : hello-world, puis un shell jetable, et docker ps -a pour voir les caisses arrêtées. »"; },
		erreur: function(){
			if (!aFait("n8_demon") && groupesMachine("docks").some(function(g){ return g.nom === "docker" && g.membres.indexOf(JOUEUR) > -1; }) && groupesSessionPort("docks").indexOf("docker") === -1) return "Kylian rit. « Tu es dans /etc/group, mais pas dans TA session : un groupe se lit à la connexion. exit, puis ssh docks. »";
			return null;
		},
		fin: function(){ return "Kylian referme les portes du conteneur d'un coup d'épaule. « Tu sais ce qu'est une caisse vivante.\n\n" +
			"Une équipe a ajouté tous ses stagiaires au groupe docker, « pour qu'ils puissent tester ». Un soir, un stagiaire a lancé docker run -v /:/hote, et il a lu tous les fichiers du serveur, mots de passe compris. " +
			"Personne ne l'avait piraté : le groupe docker, c'est root. »"; }
	},
	capitainerie: { nom: "Julien", q: "capitainerie",
		metier: "Le métier : on nomme ses conteneurs, on publie ses ports au plus juste, on lit leurs journaux avant de toucher. Et on ne laisse pas d'épaves : un conteneur arrêté garde son disque.",
		entree: function(){ return "Derrière la grande baie vitrée, un homme en veste de capitaine de port allume une lanterne de signaux. « Julien. D'ici, je vois chaque caisse du port, de sa naissance à sa fin. Viens voir le tableau. »"; },
		image: function(){ return "« Une caisse a une vie : créée, démarrée, arrêtée, redémarrée, supprimée. Une caisse qui tient en fond, c'est -d (détachée) ; on la baptise avec --name, sinon le port lui invente un nom. " +
			"Pour qu'on puisse la joindre depuis le quai, on perce une porte : -p 8080:80, le port 8080 du quai mène au port 80 de la caisse.\n\n" +
			"Ensuite, on la surveille : logs (son journal de bord), inspect (sa fiche complète, en JSON), top (ses processus). Et quand il faut absolument entrer, exec : on monte à bord d'une caisse qui tourne. " +
			"Enfin, on fait le ménage : une caisse arrêtée prend encore de la place. »"; },
		syntaxe: function(){ return "« Sur docks :\n\n" +
			"  docker run -d --name vigie -p 8080:80 nginx:1.27-alpine     en fond, baptisée, une porte percée\n" +
			"  curl localhost:8080 ;  docker logs vigie (-f pour suivre, --tail 5)\n" +
			"  docker stop vigie ;  docker start vigie ;  docker restart vigie\n" +
			"  docker exec vigie ls /usr/share/nginx/html ;  docker exec -it vigie sh\n" +
			"  docker inspect vigie ;  docker inspect -f '{{.State.Status}}' vigie      un seul champ (un gabarit Go)\n" +
			"  docker top vigie ;  docker port vigie\n" +
			"  docker run --rm -e QUAI=8 alpine:3.20 printenv QUAI          une variable à bord\n" +
			"  docker container prune        toutes les caisses arrêtées, d'un coup ;  docker rm NOM : une seule\n\n" +
			"Tes manœuvres : start, stop, restart, logs, exec, inspect, top, port, container, rename, wait, kill. »"; },
		mission: function(){ return "« Ta mission : la vigie du port, un nginx en fond publié sur 8080. Vérifie qu'elle répond, lis son journal, arrête-la et relance-la. Monte à bord, lis sa fiche avec un gabarit, regarde ses processus. " +
			"Puis une variable passée à une caisse et relue de l'intérieur. Et que plus aucune épave ne traîne sur docks, celle de l'ancien équipage comprise. »"; },
		suite: function(){ return "Julien coche une ligne du journal de bord. « Bien. Continue : la vigie, l'abordage, et le ménage. »"; },
		erreur: function(){
			var v = conteneurPort("docks", "vigie");
			if (!aFait("n8_cycle") && v && !enMarchePort(v)) return "Julien montre un voyant éteint. « La vigie est arrêtée : docker ps -a, puis docker start vigie. »";
			if (!aFait("n8_menage") && conteneurPort("docks", "epave")) return "« L'épave de l'ancien équipage est toujours là : docker ps -a. »";
			return null;
		},
		fin: function(){ return "Julien sonne trois coups de cloche. « Plus une épave sur nos quais.\n\n" +
			"Un serveur de production est tombé un dimanche : disque plein. Des milliers de conteneurs arrêtés, lancés par un script sans --rm, chacun avec son petit disque. " +
			"Personne ne regardait docker ps -a. »"; }
	},
	plans: { nom: "Grégoire", q: "plans",
		metier: "Le métier : un tag n'est qu'une étiquette qui peut changer de plan ; un digest est le sceau du contenu. latest n'est pas une version : on épingle.",
		entree: function(){ return "Entre les casiers de plans, un homme âgé déroule un plan sous la lampe et appose un cachet de cire. « Grégoire, gardien des plans. Ici, rien ne vit : tout est scellé. Et c'est très bien comme ça. »"; },
		image: function(){ return "« Un conteneur naît d'une image : un plan scellé, en lecture seule. Le plan est fait de cales empilées (les couches), chacune posée par une instruction. " +
			"Un plan a un nom, le dépôt (nginx), et une étiquette, le tag (1.27-alpine). Mais un même plan peut porter plusieurs étiquettes, et une étiquette peut passer d'un plan à un autre demain.\n\n" +
			"Le seul vrai nom d'un plan, c'est son empreinte : le digest, sha256:..., calculé sur son contenu. Change une virgule, l'empreinte change. " +
			"Et les plans qui ont perdu toutes leurs étiquettes, ce sont les <none>, les plans pendants : ils prennent de la place, et plus personne ne les nomme. »"; },
		syntaxe: function(){ return "« Sur docks :\n\n" +
			"  docker images ;  docker images --digests      les plans, et leurs empreintes\n" +
			"  docker pull alpine:3.20 ;  docker pull alpine@sha256:...       par étiquette, ou par empreinte\n" +
			"  docker tag alpine:3.20 alpine:quai-8          une étiquette de plus, sur le même plan (même IMAGE ID)\n" +
			"  docker rmi alpine:quai-8                      retirer une étiquette (Untagged) ; la dernière retire le plan\n" +
			"  docker image inspect alpine:3.20 ;  docker history nginx:1.27-alpine      le plan, et ses cales\n" +
			"  docker system df                              la place prise ;  docker image prune : les <none>\n\n" +
			"Tes manœuvres : tag, rmi, image, history, system. »"; },
		mission: function(){ return "« Ta mission : donne une deuxième étiquette à un plan, vois-le deux fois dans docker images, retire l'étiquette, et lis les empreintes. Puis les cales d'un plan, la place prise sur le quai, et balaie les plans sans nom de l'ancien équipage. »"; },
		suite: function(){ return "Grégoire range un plan dans son casier. « Bien. Les cales, la place, et les plans sans nom, maintenant. »"; },
		erreur: function(){ return null; },
		fin: function(){ return "Grégoire scelle le dernier casier. « Tu sais lire un plan.\n\n" +
			"Une entreprise déployait nginx:latest chaque nuit. Un matin, latest a changé de version majeure : la configuration n'était plus comprise, et tous les sites sont tombés au réveil. " +
			"Le plan avait changé sous la même étiquette. Depuis, ils épinglent. »"; }
	},
	soutes: { nom: "Chahla", q: "soutes",
		metier: "Le métier : ce qui doit survivre au conteneur va dans un volume. Un dossier de l'hôte se monte en lecture seule s'il n'a qu'à être lu. Et une soute qui ne se sauvegarde pas sera perdue.",
		entree: function(){ return "Une jeune femme au foulard noué sur la tête roule un tonneau dans la pénombre des soutes. « Chahla. Ici, on garde ce qui doit survivre aux voyages. Les caisses passent ; les soutes restent. »"; },
		image: function(){ return "« Une caisse a une couche à elle, au-dessus de son plan : tout ce qu'elle écrit va là. Supprime la caisse, et cette couche part avec. Une base de données dans une caisse sans soute, c'est une base qui oublie tout.\n\n" +
			"Une soute, c'est un volume : un espace nommé, géré par le démon, qui vit hors de toute caisse (/var/lib/docker/volumes/NOM/_data). On le monte dans une caisse, une autre caisse peut le monter après. " +
			"Et on peut aussi prêter un dossier du quai à une caisse : un montage (bind). Avec :ro, la caisse lit, mais n'écrit pas. »"; },
		syntaxe: function(){ return "« Sur docks :\n\n" +
			"  docker volume create cales ;  docker volume ls ;  docker volume inspect cales ;  docker volume rm cales\n" +
			"  docker run --rm -v cales:/cales alpine:3.20 sh -c 'echo ... > /cales/manifeste.txt'      une caisse écrit, puis disparaît\n" +
			"  docker run --rm -v cales:/cales alpine:3.20 cat /cales/manifeste.txt                      une autre relit\n" +
			"  --mount type=volume,source=cales,target=/cales              la forme longue\n" +
			"  -v ~/vitrine:/usr/share/nginx/html:ro                         un dossier du quai, en lecture seule\n" +
			"  docker run --rm -v cales:/cales -v ~/sauvegardes:/sauve alpine:3.20 tar czf /sauve/cales.tgz -C /cales .\n" +
			"                                                                  une soute mise en caisse, sur le quai\n\n" +
			"Ta manœuvre : volume. »"; },
		mission: function(){ return "« Ta mission : une soute nommée cales. Qu'une caisse y écrive un manifeste, puis disparaisse, et qu'une autre le relise. Ensuite, prête un dossier du quai à un nginx, en lecture seule, et prouve qu'il ne peut pas y écrire. " +
			"Enfin, sauvegarde la soute dans une archive sur le quai, et liste-la. »"; },
		suite: function(){ return "Chahla cale le tonneau contre une membrure. « La soute tient. Continue : le dossier prêté en lecture seule, puis la sauvegarde. »"; },
		erreur: function(){ return null; },
		fin: function(){ return "Chahla referme l'écoutille. « Les soutes gardent leur mémoire.\n\n" +
			"Une équipe a mis à jour sa base en supprimant le vieux conteneur et en relançant le nouveau. La base était dans la couche du conteneur, pas dans un volume. " +
			"Six mois d'inscriptions, partis avec le conteneur. Un volume, c'était une ligne. »"; }
	},
	chenaux: { nom: "Adonis", q: "chenaux",
		metier: "Le métier : un réseau défini par l'utilisateur donne les noms et sépare les piles. On ne publie que ce qui doit sortir, et sur 127.0.0.1 ce qui ne regarde que la machine.",
		entree: function(){ return "Un grand gars en ciré jaune, une gaffe à la main, pousse une barque d'un quai à l'autre. « Adonis, passeur des chenaux. Une caisse seule ne sert à rien : il faut qu'elle trouve les autres. Et que les autres ne la trouvent pas toutes. »"; },
		image: function(){ return "« Chaque caisse naît sur un chenal. Par défaut, le grand pont commun (bridge) : on s'y voit par adresse, mais pas par nom. " +
			"Crée ton propre chenal (un réseau défini par l'utilisateur) et le démon y tient un registre des noms : chaque caisse y trouve les autres par leur nom.\n\n" +
			"Une caisse peut aussi n'avoir AUCUN chenal (--network none) : seulement sa propre boucle, lo. Et une porte percée sur le quai peut ne regarder que le quai lui-même : -p 127.0.0.1:8084:80. " +
			"Alors, depuis une autre machine, personne n'entre. »"; },
		syntaxe: function(){ return "« Sur docks :\n\n" +
			"  docker network ls ;  docker network create chenal ;  docker network inspect chenal\n" +
			"  docker run -d --name phare-nord --network chenal nginx:1.27-alpine\n" +
			"  docker exec AUTRE wget -qO- phare-nord          un nom, trouvé sur le chenal\n" +
			"  docker network connect chenal NOM ;  docker network disconnect chenal NOM ;  --network-alias SURNOM\n" +
			"  docker run --rm --network none alpine:3.20 ip a  une caisse sans chenal\n" +
			"  docker run -d --name guichet -p 127.0.0.1:8084:80 nginx:1.27-alpine    une porte qui ne regarde que le quai\n\n" +
			"Ta manœuvre : network. »"; },
		mission: function(){ return "« Ta mission : un chenal à toi, deux caisses dessus, et que l'une joigne l'autre par son nom. Lis le chenal avec inspect. Puis une caisse sans chenal, et un guichet publié sur 127.0.0.1 : il répond sur docks, et se tait depuis entrepot. »"; },
		suite: function(){ return "Adonis amarre sa barque. « Le chenal porte les noms. Maintenant, apprends à fermer : sans chenal, et un guichet qui ne regarde que le quai. »"; },
		erreur: function(){ return null; },
		fin: function(){ return "Adonis plante sa gaffe dans le quai. « Tu sais ouvrir, et tu sais fermer.\n\n" +
			"Une base de données de test avait été publiée avec -p 5432:5432, « juste pour une heure ». Le démon docker ouvre ses portes avant même le pare-feu de la machine. " +
			"Trois jours plus tard, la base avait été copiée par un inconnu. 127.0.0.1:5432, et elle restait chez elle. »"; }
	},
	chantier: { nom: "Eden", q: "chantier",
		metier: "Le métier : un Dockerfile se relit comme du code. La forme exec de CMD fait du programme le PID 1. Et ce qui entre dans le contexte peut finir dans l'image : .dockerignore d'abord.",
		entree: function(){ return "Sur l'échafaudage, une femme en casque et gilet orange relève sa visière de soudeuse. Elle descend, un plan sous le bras et un marteau à la ceinture. « Eden, maîtresse du chantier. Jusqu'ici, tu as pris les plans des autres. Ici, tu dessines les tiens. »"; },
		image: function(){ return "« Un plan s'écrit dans un Dockerfile, instruction par instruction. FROM : la coque de départ (une image de base). WORKDIR : le dossier de travail. COPY : on monte à bord des fichiers du contexte. " +
			"RUN : on exécute pendant la construction. ENV : une variable pour toujours ; ARG : une variable seulement pour le chantier. EXPOSE : la porte que le navire écoutera. CMD : ce qu'il lancera.\n\n" +
			"CMD a deux formes. La forme shell, CMD python app.py, glisse un /bin/sh entre ton programme et le monde. La forme exec, CMD [\"python\", \"app.py\"], fait de ton programme le premier processus : il entend les signaux, il s'arrête proprement.\n\n" +
			"docker build -t nom:tag . envoie tout le dossier au démon : le contexte. Tout, même .git et les secrets, sauf ce que .dockerignore écarte. »"; },
		syntaxe: function(){ return "« Sur docks, dans ~/ecole :\n\n" +
			"  FROM python:3.12-slim\n  WORKDIR /app\n  COPY requirements.txt .\n  RUN pip install --no-cache-dir -r requirements.txt\n  COPY . .\n  EXPOSE 8000\n  CMD [\"python\", \"app.py\"]\n\n" +
			"  docker build -t ecole:1.0 .          le point final, c'est le contexte\n" +
			"  .dockerignore :  .git  secrets  data\n" +
			"  ARG VERSION=1.0 ;  ENV VERSION=$VERSION ;  docker build --build-arg VERSION=1.0 -t ecole:1.0 .\n" +
			"  docker run -d --name ecole-essai -p 8000:8000 ecole:1.0 ;  curl localhost:8000/\n\n" +
			"Tes manœuvres : build, builder. »"; },
		mission: function(){ return "« Ta mission : le brouillon de l'ancien équipage, ~/ecole/Dockerfile, marche mal. Réécris-le, CMD en forme exec, construis ecole:1.0, et lance une caisse qui répond sur 8000. " +
			"Puis allège le contexte (le dossier pèse plus de cinquante mégaoctets, et des secrets y dorment), et donne au plan un argument de construction, VERSION, qui reste dans l'image. »"; },
		suite: function(){ return "Eden tapote le plan. « Il flotte. Maintenant, allège le contexte, et passe-lui un argument. »"; },
		erreur: function(){
			var im = imageEcoleCh8();
			if (!aFait("n8_dockerfile") && im && !formeExecCh8(im.config.Cmd) && !formeExecCh8(im.config.Entrypoint)) return "Eden fronce les sourcils. « Ton CMD est en forme shell : /bin/sh -c s'interpose. Un tableau JSON : CMD [\"python\", \"app.py\"]. »";
			return null;
		},
		fin: function(){ return "Eden coupe le ruban, et la coque glisse vers l'eau. « Ton premier plan.\n\n" +
			"Une équipe a publié son image sur un registre ouvert. Dedans : le dossier .git complet, et un fichier .env avec les clés de production. Personne n'avait écrit de .dockerignore. " +
			"Des inconnus ont trouvé les clés en une heure. »"; }
	},
	cales: { nom: "Megane", q: "cales",
		metier: "Le métier : chaque instruction pose une couche, et le cache réutilise tout ce qui n'a pas changé AVANT. Ce qui change souvent se copie en dernier ; ce qu'on supprime se supprime dans la même couche.",
		entree: function(){ return "Une jeune femme porte une pile de plateaux de bois, posés l'un sur l'autre comme les ponts d'un navire. « Megane. Les cales, c'est mon affaire. Un navire bien chargé part en une minute ; mal chargé, il faut tout décharger à chaque fois. »"; },
		image: function(){ return "« Chaque instruction du plan pose une cale par-dessus la précédente. Quand tu reconstruis, le chantier compare : cette instruction, sur cette cale-là, avec ces fichiers-là, je l'ai déjà faite ? Alors CACHED, on la reprend telle quelle.\n\n" +
			"Mais si une cale change, toutes celles du dessus sont refaites. COPY . . avant pip install : une ligne de code changée, et pip réinstalle tout. COPY requirements.txt, puis pip, puis COPY . . : pip reste en cache.\n\n" +
			"Et une cale ne s'efface jamais. RUN apt-get update dans une cale, rm -rf /var/lib/apt/lists dans une autre : les listes pèsent toujours, cachées sous la seconde. On nettoie dans la MÊME cale, avec &&. »"; },
		syntaxe: function(){ return "« Sur docks :\n\n" +
			"  RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*\n" +
			"  COPY requirements.txt .   puis   RUN pip install --no-cache-dir -r requirements.txt   puis   COPY . .\n" +
			"  docker build -t ecole:1.0 .     regarde les CACHED\n" +
			"  docker history ecole:1.0        le poids de chaque cale\n" +
			"  docker build --no-cache ;  docker build --progress=plain ;  docker builder prune\n" +
			"  python:3.12 contre python:3.12-slim : la coque complète, la coque fine\n\n" +
			"Tes manœuvres : celles d'Eden te suffisent (build, history). »"; },
		mission: function(){ return "« Ta mission : range les cales du plan de l'école pour qu'une ligne de code changée laisse pip en cache, et prouve-le. Et je veux curl à bord, sans que les listes d'apt ne restent dans aucune cale. »"; },
		suite: function(){ return "Megane pose un plateau. « Une cale bien rangée. Il reste l'autre. »"; },
		erreur: function(){ return null; },
		fin: function(){ return "Megane empile le dernier plateau, parfaitement d'aplomb. « Des cales propres, un chantier rapide.\n\n" +
			"Une équipe attendait vingt minutes à chaque construction. La raison : COPY . . en deuxième ligne. Trois lignes déplacées, et la construction est tombée à quarante secondes. »"; }
	},
	maitres: { nom: "Jahmal", q: "maitres",
		metier: "Le métier : on construit en plusieurs étapes pour qu'aucun outil de chantier ne parte en mer. Une image sans compilateur ni shell est plus petite, et donne moins de prise. Et un service doit dire s'il va bien.",
		entree: function(){ return "Un homme au masque de soudeur relevé sur le front tient dans sa main un petit navire fin, poli comme un galet. « Jahmal. Ça, c'est le phare de l'école, compilé. Deux mégaoctets. Et pourtant il a fallu tout un atelier pour le forger. »"; },
		image: function(){ return "« Le plan du phare, aujourd'hui : une coque Debian, gcc, make, les sources, et le binaire. Trois cents mégaoctets en mer, compilateur compris. Pour lancer un seul programme.\n\n" +
			"La construction en plusieurs étapes : une première étape, l'atelier (FROM debian:12 AS build), où l'on forge. Puis une dernière étape, le navire (FROM scratch, rien du tout), où l'on n'emporte que le binaire : COPY --from=build. " +
			"L'atelier reste à quai.\n\n" +
			"Et un navire doit savoir dire s'il va bien : HEALTHCHECK. Une commande lancée dans la caisse, régulièrement ; 0, healthy ; sinon, unhealthy. Et des étiquettes, LABEL, pour dire qui l'a construit et ce qu'il est. »"; },
		syntaxe: function(){ return "« Sur docks :\n\n" +
			"  FROM debian:12 AS build\n  RUN apt-get update && apt-get install -y gcc make libc6-dev\n  WORKDIR /src\n  COPY . .\n  RUN make\n\n" +
			"  FROM scratch\n  COPY --from=build /src/phare /phare\n  CMD [\"/phare\"]\n\n" +
			"  docker build -t phare:1.0 . ;  docker build --target build -t phare:atelier .\n" +
			"  HEALTHCHECK --interval=10s CMD curl -fs localhost:8000/ || exit 1\n" +
			"  LABEL org.opencontainers.image.title=ecole\n" +
			"  docker inspect -f '{{.State.Health.Status}}' NOM\n\n" +
			"Tes manœuvres : celles d'Eden. »"; },
		mission: function(){ return "« Ta mission : le phare (~/phare), en deux étapes, sous trente mégaoctets, sans gcc à bord, et une caisse qui répond. Puis apprends au plan de l'école à dire s'il va bien (HEALTHCHECK) et donne-lui une étiquette (LABEL) : je veux une caisse healthy. »"; },
		suite: function(){ return "Jahmal fait tourner le petit navire au bout de ses doigts. « Un de forgé. L'autre, maintenant. »"; },
		erreur: function(){ return null; },
		fin: function(){ return "Jahmal pose le phare sur l'établi, et une lumière douce en sort. « Léger, et qui dit s'il va bien.\n\n" +
			"Un service tournait, « Up 3 days », d'après docker ps. En vrai, il ne répondait plus depuis la veille : bloqué, sans planter. Personne ne le savait. " +
			"Avec un HEALTHCHECK, il aurait été unhealthy dans la minute, et relancé. »"; }
	},
	registre: { nom: "Déborah", q: "registre",
		metier: "Le métier : un registre privé se protège par un mot de passe et, en vrai, par TLS. On pousse des versions, jamais latest. Et ce qu'on déploie se désigne par son digest.",
		entree: function(){ return "Derrière le grillage de l'entrepôt, une femme aux longues tresses fait tinter un trousseau de clés et ouvre un gros registre relié de cuir. « Déborah. Les plans de l'école, c'est ici qu'ils dorment. Nulle part ailleurs. »"; },
		image: function(){ return "« Un registre, c'est un entrepôt de plans. Le registre du continent garde les plans de base ; le nôtre, sur la machine entrepot, gardera ceux de l'école. Il tourne lui-même dans une caisse : registry:2, sur le port 5000, " +
			"ses plans rangés dans /var/lib/registry (une soute, sinon il oublie tout).\n\n" +
			"Un entrepôt sans serrure, c'est un entrepôt ouvert à tous : un fichier htpasswd (htpasswd -B, du bcrypt) et REGISTRY_AUTH=htpasswd. " +
			"Ensuite, chaque navire qui veut y entrer s'annonce : docker login. Le nôtre parle sans TLS : il faut le déclarer sûr dans /etc/docker/daemon.json (insecure-registries). " +
			"Un plan prend le nom de l'entrepôt dans son étiquette (docker tag), puis il part (docker push), et il arrive ailleurs (docker pull), avec la même empreinte. »"; },
		syntaxe: function(){ return "« Sur entrepot :\n\n" +
			"  htpasswd -Bbn douanier MOTDEPASSE | sudo tee /srv/registre/auth/htpasswd\n" +
			"  docker run -d --name registre --restart always -p 5000:5000 -v registre-donnees:/var/lib/registry \\\n" +
			"    -v /srv/registre/auth:/auth:ro -e REGISTRY_AUTH=htpasswd -e REGISTRY_AUTH_HTPASSWD_REALM=entrepot \\\n" +
			"    -e REGISTRY_AUTH_HTPASSWD_PATH=/auth/htpasswd registry:2\n" +
			"  curl -s -o /dev/null -w '%{http_code}' localhost:5000/v2/          401 : la serrure tient\n\n" +
			"Sur docks :\n" +
			"  /etc/docker/daemon.json : {\"insecure-registries\": [\"entrepot.port-aube.lan:5000\"]}, puis sudo systemctl restart docker\n" +
			"  echo MOTDEPASSE | docker login entrepot.port-aube.lan:5000 -u douanier --password-stdin\n" +
			"  docker tag ecole:1.0 entrepot.port-aube.lan:5000/ecole:1.0 ;  docker push entrepot.port-aube.lan:5000/ecole:1.0\n" +
			"  docker run ... entrepot.port-aube.lan:5000/ecole@sha256:...          par l'empreinte ;  docker logout\n\n" +
			"Tes manœuvres : login, logout, push. Et htpasswd. »"; },
		mission: function(){ return "« Ta mission : l'entrepôt de l'école, gardé par une serrure, ses plans dans une soute ; que la porte réponde 401 à qui n'a pas de clé. Puis pousse le plan de l'école depuis docks, " +
			"tire-le sur navire1, et lance-le là-bas par son empreinte. Et rends tes clés quelque part (logout). »"; },
		suite: function(){ return "Déborah inscrit une ligne dans son registre. « L'entrepôt tient. Maintenant, le plan de l'école : poussé, tiré, lancé par son empreinte. »"; },
		erreur: function(){
			if (!aFait("n8_push") && (texteHote("docks", "/etc/docker/daemon.json") || "").indexOf("entrepot") > -1 && (configDemonPort("docks")["insecure-registries"] || []).indexOf(REGISTRE_ENTREPOT_PORT) === -1) return "Déborah secoue ses clés. « daemon.json est écrit, mais le démon ne l'a pas relu : sudo systemctl restart docker. »";
			return null;
		},
		fin: function(){ return "Déborah referme son registre et te tend une clé. « L'école a son entrepôt.\n\n" +
			"Une entreprise avait laissé son registre privé sans mot de passe, sur Internet. Tous ses plans, code compris, téléchargés en une nuit. " +
			"Et quelqu'un en a poussé un nouveau, sous le même nom. »"; }
	},
	feuille: { nom: "Elias", q: "feuille",
		metier: "Le métier : une pile se décrit dans un fichier qu'on relit (compose config) avant de la lancer. depends_on sans condition n'attend que le démarrage : une base qui démarre n'est pas une base prête.",
		entree: function(){ return "Un homme en tricorne trace une route sur la table à cartes, au compas. « Elias, maître des convois. Un navire seul, tu sais. Quatre qui partent ensemble, dans le bon ordre, sur un seul ordre écrit : ça, c'est la Feuille de route. »"; },
		image: function(){ return "« L'école, ce n'est pas une caisse : c'est un convoi. Un frontal (web, nginx), l'appli (app), une base (base, postgres), un cache (cache, redis). " +
			"Les lancer un par un, avec leurs chenaux, leurs soutes, leurs secrets, c'est vingt commandes. Un fichier compose.yaml les décrit tous ; docker compose up -d les lance.\n\n" +
			"Le projet prend le nom du dossier ; chaque caisse s'appelle projet-service-numéro ; un chenal projet_default les relie, et chaque service y est trouvé par son nom. " +
			"Et l'ordre : depends_on. La forme courte n'attend que le démarrage ; condition: service_healthy attend le bilan de santé de la base. »"; },
		syntaxe: function(){ return "« Sur docks, dans ~/ecole/compose.yaml :\n\n" +
			"  services:\n    web:     image, ports, volumes (web/default.conf en :ro), depends_on\n" +
			"    app:     build: . et image: ecole:1.0, env_file, environment, secrets, depends_on: base: condition: service_healthy\n" +
			"    base:    image postgres:16-alpine, environment (POSTGRES_PASSWORD_FILE), volumes: donnees:/var/lib/postgresql/data, healthcheck\n" +
			"    cache:   image redis:7-alpine\n  volumes:\n    donnees:\n  secrets:\n    db_password:\n      file: ./secrets/db_password.txt\n\n" +
			"  docker compose config ;  docker compose up -d ;  docker compose ps ;  docker compose logs -f app\n" +
			"  docker compose exec base psql -U ecole ;  docker compose up -d --scale app=2\n" +
			"  docker compose down (les soutes restent) ;  docker compose down -v (les soutes coulent)\n\n" +
			"Ta manœuvre : compose. »"; },
		mission: function(){ return "« Ta mission : écris la feuille de route de l'école, relis-la, lance le convoi, et que /sante, par le frontal sur docks:80, dise base ok et cache ok. " +
			"Puis l'ordre : la base vérifiée par un bilan, l'appli qui l'attend, ses réglages dans un env_file, deux répliques d'app, ses journaux lus. Et une inscription qui survit à un down puis un up. »"; },
		suite: function(){ return "Elias pique la carte au compas. « Le convoi navigue. Maintenant, l'ordre, et la mémoire. »"; },
		erreur: function(){ return null; },
		fin: function(){ return "Elias roule la carte. « Un convoi, un ordre écrit.\n\n" +
			"Une appli démarrait toujours avant sa base, plantait, et redémarrait trois fois chaque matin. Tout le monde accusait la base. Il manquait une ligne : condition: service_healthy. »"; }
	},
	vigie: { nom: "Remi", q: "vigie",
		metier: "Le métier : une politique de redémarrage, une limite de mémoire et des journaux qui tournent, pour chaque service. Et system prune se lance en sachant ce qu'il retire.",
		entree: function(){ return "Tout en haut du grand mât, un homme en bonnet de laine, longue-vue à l'œil, ne la baisse même pas pour te parler. « Remi, de quart. D'ici, je vois qui tombe, qui se relève, et qui mange les vivres des autres. »"; },
		image: function(){ return "« Une caisse qui tombe en mer, il faut qu'elle remonte seule : la politique de redémarrage. no, always, unless-stopped (sauf si TU l'as arrêtée), on-failure:3 (trois essais). Elle joue aussi quand le démon redémarre.\n\n" +
			"Les vivres : sans limite, une seule caisse peut affamer tout le navire. --memory 256m (mem_limit) : au-delà, le noyau la tue (OOM, code 137). docker stats montre qui mange quoi.\n\n" +
			"Les journaux : chaque caisse écrit dans un fichier json, qui grossit sans fin. max-size et max-file le font tourner. " +
			"Et quand le pont déborde, docker system prune balaie caisses arrêtées, chenaux vides, plans sans nom. Jamais les soutes, sauf si tu lui dis --volumes. »"; },
		syntaxe: function(){ return "« Sur docks :\n\n" +
			"  restart: unless-stopped ;  mem_limit: 256m ;  logging: driver: json-file, options: max-size: \"10m\"     (compose)\n" +
			"  --restart unless-stopped ;  --memory 256m ;  --log-opt max-size=10m           (docker run)\n" +
			"  docker stats --no-stream ;  docker events --since 1h --filter type=container\n" +
			"  docker update --memory 512m NOM          à chaud\n" +
			"  sudo systemctl restart docker ;  sudo journalctl -u docker ;  sudo dockerd --validate --config-file /etc/docker/daemon.json\n" +
			"  docker system prune -f                   (sans --volumes : les soutes restent)\n\n" +
			"Tes manœuvres : stats, events, update. Et dockerd. »"; },
		mission: function(){ return "« Ta mission : que les quatre navires du convoi de l'école se relèvent seuls, que l'appli ait sa ration de mémoire sans en mourir, et que tout revienne après un redémarrage du démon ; regarde les vivres avec stats. " +
			"Puis des journaux qui tournent sur web et app, les événements filtrés, et un grand ménage qui ne touche pas à la soute de la base. »"; },
		suite: function(){ return "Remi tourne la longue-vue d'un quart. « Ils se relèvent. Maintenant, les journaux, et le ménage. »"; },
		erreur: function(){ return null; },
		fin: function(){ return "Remi baisse enfin sa longue-vue. « Le convoi se garde seul.\n\n" +
			"Un serveur est tombé un lundi : disque plein. Un seul conteneur bavard avait écrit quarante gigaoctets de journaux, sans rotation. " +
			"max-size=10m, et il aurait gardé trente mégaoctets. »"; }
	},
	armurerie: { nom: "Ian", q: "armurerie",
		metier: "Le métier : non root, lecture seule, sans capacités, sans élévation ; les secrets en fichiers, jamais en variables ; et le socket du démon ne se monte jamais dans un conteneur.",
		entree: function(){ return "Un homme en casque, un bouclier au cadenas posé contre la jambe, serre un dernier boulon sur une caisse blindée. « Ian, armurier. Une caisse qui navigue en temps de guerre, ça se blinde. Plaque par plaque. »"; },
		image: function(){ return "« Par défaut, ton appli tourne en root dans sa caisse, sur un pont où elle peut écrire partout, avec une poignée de capacités du noyau (changer des propriétaires, ouvrir des ports bas...). " +
			"Si quelqu'un la prend, il a tout ça.\n\n" +
			"Les plaques : user (un utilisateur ordinaire), read_only (le pont en lecture seule) avec un tmpfs là où l'appli doit écrire (/tmp), cap_drop: ALL (plus aucune capacité), security_opt: no-new-privileges (plus d'élévation). " +
			"Et jamais --privileged.\n\n" +
			"Les mots de passe : en variable d'environnement, ils se lisent dans docker inspect. En secret, c'est un fichier monté dans /run/secrets ; l'appli lit DB_PASSWORD_FILE. " +
			"Enfin, la pire des fautes : monter /var/run/docker.sock dans une caisse. Qui tient le socket tient le démon, donc la machine. »"; },
		syntaxe: function(){ return "« Dans compose.yaml, pour app :\n\n" +
			"    user: \"1000\"\n    read_only: true\n    tmpfs:\n      - /tmp\n    cap_drop:\n      - ALL\n    security_opt:\n      - no-new-privileges:true\n" +
			"    environment:\n      DB_PASSWORD_FILE: /run/secrets/db_password\n    secrets:\n      - db_password\n\n" +
			"  docker compose exec app touch /app/x          refusé : Read-only file system\n" +
			"  docker inspect -f '{{.HostConfig.CapDrop}} {{.HostConfig.SecurityOpt}}' NOM\n" +
			"  docker ps --format '{{.Names}} {{.Mounts}}'      qui monte quoi ?\n\n" +
			"Pas de manœuvre nouvelle : des options. »"; },
		mission: function(){ return "« Ta mission : blinde l'appli de l'école (non root, lecture seule avec un /tmp, sans capacités, sans élévation) et qu'elle reste healthy ; prouve qu'elle ne peut plus écrire. " +
			"Puis plus un seul mot de passe en variable pour base et app, et trouve sur docks la caisse de l'ancien équipage qui tient le socket du démon : désarme-la. »"; },
		suite: function(){ return "Ian serre un boulon de plus. « Une plaque posée. Il reste l'autre. »"; },
		erreur: function(){
			if (!aFait("n8_secrets") && socketMonteCh8()) return "Ian pointe docks du menton. « Une caisse monte encore /var/run/docker.sock. docker ps --format '{{.Names}} {{.Mounts}}', ou docker inspect. »";
			return null;
		},
		fin: function(){ return "Ian accroche le bouclier au cadenas sur la caisse. « Blindée.\n\n" +
			"Un outil de supervision tournait dans un conteneur, avec le socket de docker monté « pour lister les conteneurs ». Une faille dans l'outil, et l'attaquant a lancé un conteneur privilégié, monté le disque de l'hôte, et pris la machine. " +
			"Le socket, c'était la clé du coffre. »"; }
	},
	douane: { nom: "Soufiane", q: "douane",
		metier: "Le métier : une image d'origine inconnue ne se lance pas. On l'inspecte, hors réseau, couche par couche, et on note tout. On ne la pousse jamais dans son registre.",
		entree: function(){ return "Un douanier en képi, une loupe à la main et une planchette sous le bras, fait le tour du conteneur noir sans jamais le toucher. « Soufiane, douane du port. Hier, on a pris ça à un éclaireur de la flotte noire. Personne ne l'ouvre. Personne ne le LANCE. On le lit. »"; },
		image: function(){ return "« La machine douane est une quarantaine : aucune route vers le large, aucune vers l'entrepôt. L'image de l'éclaireur y est chargée, eclaireur:prise. On va savoir ce qu'elle contient sans jamais la démarrer.\n\n" +
			"D'abord sa fiche (image inspect) : l'utilisateur, les variables, ce qu'elle lancerait (ENTRYPOINT), ses étiquettes (Labels). Puis son histoire, sans coupure (history --no-trunc) : qui a posé chaque cale, et quoi. " +
			"Ensuite, l'autopsie : docker save la sort en archive, tar l'ouvre, jq lit son manifeste, et chaque couche est une archive qu'on liste. " +
			"Et docker create fabrique une caisse SANS la démarrer : docker cp en sort un fichier, docker diff dit ce qui a bougé (rien : elle n'a jamais tourné). sha256sum prend l'empreinte de ce qu'on a sorti. »"; },
		syntaxe: function(){ return "« Sur douane :\n\n" +
			"  docker image inspect eclaireur:prise ;  docker image inspect --format '{{json .Config.Labels}}' eclaireur:prise\n" +
			"  docker history --no-trunc eclaireur:prise\n" +
			"  docker save -o eclaireur.tar eclaireur:prise ;  mkdir autopsie ;  tar xf eclaireur.tar -C autopsie\n" +
			"  jq . autopsie/manifest.json ;  jq '.[0].Layers' autopsie/manifest.json ;  tar -tf autopsie/blobs/sha256/EMPREINTE\n" +
			"  docker create --name autopsie eclaireur:prise ;  docker cp autopsie:/CHEMIN . ;  docker diff autopsie\n" +
			"  sha256sum FICHIER\n" +
			"  ~/douane/indices.txt : tout ce que tu as vu (le fichier ajouté, ce qu'elle lancerait, qui l'a signée)\n\n" +
			"Tes manœuvres : save, load, create, cp, diff. Et jamais run. »"; },
		mission: function(){ return "« Ta mission : lis la fiche et l'histoire de l'éclaireur, et consigne dans ~/douane/indices.txt le fichier qu'une couche ajoute, ce que l'image lancerait (son ENTRYPOINT), et les initiales de son étiquette. " +
			"Puis l'autopsie : l'archive, son manifeste, une couche listée, une caisse créée mais jamais démarrée, le fichier-témoin sorti, son empreinte, et un diff vide. »"; },
		suite: function(){ return "Soufiane note quelque chose sur sa planchette. « Les indices sont écrits. L'autopsie, maintenant. Sans jamais démarrer. »"; },
		erreur: function(){ return null; },
		fin: function(){ return "Soufiane pose un sceau de la douane sur le conteneur noir. « Lu, de bout en bout, sans le lancer.\n\n" +
			"Sur un registre public, des images au nom presque juste (un caractère de différence) ont été tirées des millions de fois. " +
			"Dedans, des couches ajoutées que personne n'avait lues. Lire avant de lancer, toujours. »"; }
	},
	escadre: { nom: "Arnaud", q: "escadre",
		metier: "Le métier : une escadre (swarm) répartit des répliques sur plusieurs machines, remplace celles qui tombent, met à jour navire par navire et sait revenir en arrière. En vrai, on met trois gestionnaires.",
		entree: function(){ return "Sur le pont du navire amiral, un homme en bicorne, épaulettes dorées, fait claquer une drisse de pavillons. « Arnaud, de l'escadre. Jusqu'ici, tu commandais des caisses sur UN quai. Maintenant, tu vas commander une flotte. »"; },
		image: function(){ return "« docks prend le commandement (docker swarm init) : il devient le gestionnaire, et donne un jeton. Chaque navire le présente (docker swarm join) : navire1, navire2, navire3 deviennent des workers. Ensemble, une escadre.\n\n" +
			"On ne lance plus des caisses, on déclare des services : « je veux trois répliques de l'appli ». Le gestionnaire les répartit sur les navires, et si un navire sombre, il les replace ailleurs. " +
			"Une mise à jour avance navire par navire (--update-parallelism, --update-delay) ; si elle tourne mal, docker service rollback ramène l'ancienne.\n\n" +
			"Et une pile entière se déploie d'un fichier (docker stack deploy), avec ses secrets d'escadre (docker secret create). Les navires tirent leurs plans de l'entrepôt : --with-registry-auth leur passe la clé. »"; },
		syntaxe: function(){ return "« Sur docks, puis sur chaque navire :\n\n" +
			"  docker swarm init --advertise-addr 10.0.80.10 ;  docker swarm join-token worker\n" +
			"  docker swarm join --token SWMTKN-1-... docks:2377          (sur navire1, navire2, navire3)\n" +
			"  docker node ls ;  docker node update --availability drain NAVIRE ;  docker node update --label-add zone=nord NAVIRE\n" +
			"  docker service create --name app --replicas 3 --with-registry-auth -p 8000:8000 entrepot.port-aube.lan:5000/ecole:1.0\n" +
			"  docker service ls ;  docker service ps app ;  docker service scale app=4 ;  docker service logs app\n" +
			"  docker service update --image ... --update-parallelism 1 --update-delay 10s app ;  docker service rollback app\n" +
			"  printf 'MOTDEPASSE\\n' | docker secret create db_password -\n" +
			"  docker stack deploy -c pile.yaml --with-registry-auth ecole ;  docker stack services ecole\n\n" +
			"Tes manœuvres : swarm, node, service, stack, secret. »"; },
		mission: function(){ return "« Ta mission : rassemble l'escadre (docks et trois navires). Un service de l'école sur trois répliques au moins, sur plusieurs navires, et agrandis-le. Une mise à jour, un navire à la fois, avec une pause, puis le retour arrière. " +
			"Enfin, la flotte de l'école en pile, nommée ecole : web, app sur trois répliques, base amarrée à un navire, cache, le mot de passe en secret d'escadre. Quand elle sera en mer, la flotte noire viendra. »"; },
		suite: function(){ return "Arnaud hisse un pavillon de plus. « L'escadre se forme. Continue. »"; },
		erreur: function(){ return null; },
		fin: function(){ return "Arnaud ôte son bicorne. « L'escadre est à toi, Amiral.\n\n" +
			"Un site de billetterie tournait sur une seule machine. Le soir d'une grande vente, elle est tombée, et avec elle toutes les ventes. " +
			"Trois répliques sur trois machines, et la panne d'une seule n'aurait été qu'une ligne dans un journal. »"; }
	}
};

/* Les maîtres sur leurs quais, avec leurs sorts et leurs défis. */
Object.keys(MAITRES_PORT).forEach(function(cle){
	var g = MAITRES_PORT[cle], q = quaiCh8(cle);
	g.item = new Item(sansAccentCh8(g.nom).replace(/^./, function(x){ return x.toUpperCase(); }), "", "item_" + sansAccentCh8(g.nom) + ".gif").personnage();
	if ((SORTS_DES_QUAIS_CH8[cle] || []).length) g.item.enseigne.apply(g.item, SORTS_DES_QUAIS_CH8[cle]);
	g.item.revele.apply(g.item, idsDefisQuaiPort(cle));
	texteVivant(g.item, function(){ return texteMaitrePort(g); });
	q.lieu.addItem(g.item);
});
LaurentGrandPortCh8.revele("s_n8_sans_indice", "s_n8_matelot_j1", "s_n8_capitaine_j2", "s_n8_avant_aube");
HorlogeGrandPortCh8.revele("s_n8_matelot_j1", "s_n8_capitaine_j2", "s_n8_avant_aube");

/* Lire un maître qui t'accepte : il t'enseigne ses manœuvres (les sous-commandes de docker). */
GameEvents.addListener("read", function(e){
	if (!state.has("ch8Ouvert")) return;
	Object.keys(MAITRES_PORT).forEach(function(cle){
		var g = MAITRES_PORT[cle];
		if (e.item !== g.item) return;
		if (rangCh8() < rangRequisPort(quaiCh8(cle))) return;
		var appris = apprendreManoeuvresPort(g.nom);
		if (appris.length && !state.has("rejeuEnCours")) say(C.cyan("⚓ Manœuvres apprises auprès de " + g.nom + " : ") + appris.map(function(m){ return "docker " + m; }).join(", ") + C.gris("  (galons pour toutes tes manœuvres)"));
	});
});

/* ------------------------------------------------------------------ */
/* Le bestiaire du Grand Port                                          */
/* ------------------------------------------------------------------ */

var BestiaireGrandPortCh8 = new Item("Bestiaire",
	"LE BESTIAIRE DU GRAND PORT : l'image du port, puis le vrai mot du métier.\n\n" +
	"Le Mousse, l'Amiral            les rangs : de zéro à héros (galons)\n" +
	"La caisse vivante              un conteneur : un processus de l'hôte, cloisonné (espaces de noms) et rationné (cgroups)\n" +
	"Le navire entier               une machine virtuelle : son propre noyau, bien plus lourde\n" +
	"Le démon du port               dockerd, et sa porte : le socket /var/run/docker.sock\n" +
	"L'équipage du démon            le groupe docker (qui en est vaut root)\n" +
	"La cale du dessous             containerd, sous docker (ctr)\n" +
	"Le plan scellé                 une image, en lecture seule\n" +
	"Les cales d'un plan            les couches (docker history)\n" +
	"L'étiquette d'un plan          le tag (latest n'est pas une version)\n" +
	"Le sceau du contenu            le digest, sha256:... (ce qu'on déploie)\n" +
	"Les plans sans nom             les images pendantes, <none> (image prune)\n" +
	"Les manœuvres                  les sous-commandes de docker (run, ps, logs, exec, inspect...)\n" +
	"La soute                       un volume nommé, qui survit au conteneur\n" +
	"Le dossier prêté               un montage (bind), :ro en lecture seule\n" +
	"Le chenal                      un réseau ; un réseau défini par l'utilisateur donne les noms\n" +
	"La porte percée                un port publié (-p), 127.0.0.1 devant pour ne regarder que la machine\n" +
	"Le plan dessiné                le Dockerfile (FROM, RUN, COPY, WORKDIR, ENV, ARG, EXPOSE, CMD, ENTRYPOINT)\n" +
	"Le chantier et ses matériaux   docker build et son contexte (.dockerignore)\n" +
	"Les cales en cache             le cache de construction (CACHED)\n" +
	"L'atelier qui reste à quai     la construction en plusieurs étapes (multi-stage, COPY --from)\n" +
	"La vigie de bord               le bilan de santé (HEALTHCHECK : healthy, unhealthy)\n" +
	"L'entrepôt des plans           un registre privé (registry:2, login, push, pull)\n" +
	"La feuille de route            compose.yaml, docker compose (services, volumes, réseaux, secrets)\n" +
	"L'ordre du convoi              depends_on et condition: service_healthy\n" +
	"Se relever seul                les politiques de redémarrage (unless-stopped, on-failure)\n" +
	"Les vivres                     les limites (--memory, --cpus) et l'OOM (code 137)\n" +
	"Les plaques d'armure           user, read_only, cap_drop, no-new-privileges\n" +
	"Le pli scellé                  un secret, monté dans /run/secrets\n" +
	"La quarantaine                 l'inspection d'une image d'origine inconnue, sans jamais la lancer\n" +
	"L'éclaireur                    une image prise à l'ennemi (inerte : un fichier-témoin, une phrase, des Labels)\n" +
	"Le cheval de bois              une image « officielle » dont le digest a changé (on épingle par digest)\n" +
	"L'escadre                      un swarm : un gestionnaire, des workers\n" +
	"Les navires de l'escadre       les nœuds (docker node)\n" +
	"Les répliques                  un service répliqué (docker service)\n" +
	"La flotte d'un seul ordre      une stack (docker stack deploy)\n" +
	"Le navire qui sombre           un nœud perdu, drainé (drain)\n" +
	"La mise à jour piégée          une mise à jour refusée, puis annulée (rollback)\n" +
	"La puissance de la flotte      un tableau de santé de l'infrastructure (ici, la commande du jeu port)\n" +
	"Le rapport de bataille         le rapport d'incident : ce qui a tenu, ce qui a cédé, ce qui a été fait, ce qui reste",
	"item_historybook.gif");
GrandPortCh8.addItem(BestiaireGrandPortCh8);

/* ------------------------------------------------------------------ */
/* Les noms imagés des sorts du chapitre                               */
/* ------------------------------------------------------------------ */

var SORTS_RPG_CH8 = {
	"docker":   { nom: "la Grue du Port",               image: "Tu soulèves, poses, lances et ranges les caisses vivantes du port." },
	"htpasswd": { nom: "le Mot de passe de l'Entrepôt", image: "Tu forges la serrure de l'entrepôt des plans." },
	"dockerd":  { nom: "la Salle des Machines",         image: "Tu vérifies la feuille du démon avant qu'il ne reparte." },
	"ctr":      { nom: "la Cale du Dessous",            image: "Tu regardes sous la grue, là où containerd tient les caisses." }
};
var NOM_RPG_AVANT_PORT = nomRpg;
nomRpg = function(sort, chapitre){
	if (chapitre === 9 && SORTS_RPG_CH8[sort]) return SORTS_RPG_CH8[sort].nom;
	return NOM_RPG_AVANT_PORT(sort, chapitre);
};

/* ------------------------------------------------------------------ */
/* Les badges du chapitre                                              */
/* ------------------------------------------------------------------ */

var TROPHEES_CH8 = {
	quai_premiers:     ["le Quai des Premiers Pas", "systemctl status docker, le socket et le groupe docker (qui vaut root), une nouvelle session ; docker run hello-world, run -it --rm, ps -a."],
	quai_capitainerie: ["la Capitainerie", "run -d --name -p, logs, stop et start, exec, inspect -f, top, -e, container prune : le cycle de vie d'un conteneur."],
	quai_plans:        ["l'Entrepôt des plans", "images, tag, rmi d'un tag, --digests, history, system df, image prune : un tag bouge, un digest scelle."],
	quai_soutes:       ["les Soutes", "volume create, un volume qui survit au conteneur, un bind en :ro, une sauvegarde de volume par tar dans un conteneur."],
	quai_chenaux:      ["les Chenaux", "network create, les noms sur un réseau défini par l'utilisateur, network inspect, --network none, un port publié sur 127.0.0.1."],
	quai_chantier:     ["le Chantier naval", "Un Dockerfile écrit à la main, CMD en forme exec, docker build, .dockerignore, ARG et --build-arg."],
	quai_cales:        ["les Cales", "L'ordre des instructions et le cache (CACHED), apt-get et rm -rf des listes dans le même RUN."],
	quai_maitres:      ["le Chantier des maîtres", "La construction en plusieurs étapes (AS, COPY --from, FROM scratch), HEALTHCHECK, LABEL."],
	quai_registre:     ["le Registre du port", "registry:2, htpasswd -B, un volume pour /var/lib/registry, insecure-registries, login, tag, push, pull, run par digest."],
	quai_feuille:      ["la Feuille de route", "compose.yaml (services, volumes, secrets, env_file), config, up -d, depends_on avec condition: service_healthy, --scale, down puis up."],
	quai_vigie:        ["la Vigie", "restart: unless-stopped, mem_limit, le démon relancé, stats, la rotation des journaux (max-size), events filtrés, system prune."],
	quai_armurerie:    ["l'Armurerie", "user non root, read_only et tmpfs, cap_drop: ALL, no-new-privileges ; les secrets en fichiers ; jamais le socket du démon."],
	quai_douane:       ["la Douane", "image inspect, history --no-trunc, save, tar, jq, create, cp, diff, sha256sum : lire une image sans la lancer."],
	quai_escadre:      ["l'Escadre", "swarm init et join, node ls, service create, scale, update (parallelism, delay), rollback, secret create, stack deploy."],
	galon_mousse:      ["les Galons de Mousse", "On commence tous ici : on mesure avant de construire."],
	galon_matelot:     ["les Galons de Matelot", "Épreuve I : un conteneur qui ne démarre pas se lit (code de sortie, journaux, port pris, CMD faux) avant de se réparer."],
	galon_quartier_maitre: ["les Galons de Quartier-maître", "Épreuve II : une appli et sa base se trouvent sur un réseau défini par l'utilisateur, et la base garde sa mémoire dans un volume."],
	galon_second:      ["les Galons de Second", "Épreuve III : une image légère (base slim, .dockerignore) et un cache efficace (les dépendances avant le code)."],
	galon_capitaine:   ["les Galons de Capitaine", "Épreuve IV : un bilan de santé juste, une mémoire suffisante, et l'ordre de démarrage sur la santé."],
	galon_amiral:      ["les Galons d'Amiral", "Épreuve V : un tag a changé de contenu ; on compare les digests, on refuse, on épingle l'ancien."],
	n8_port:           ["le Plan du Port", "On mesure l'état d'une infrastructure avant de la construire : la puissance de départ est le point zéro."],
	n8_flotte:         ["la Flotte Tenue", "Pendant l'attaque, on lit l'état, on répare ce qui a coulé, une chose à la fois."],
	n8_piege:          ["le Piège Refusé", "Une mise à jour d'origine non vérifiée se refuse sur son digest, et s'annule par un retour arrière."],
	n8_rapport:        ["le Rapport de Bataille", "Un rapport d'incident : les quais, la flotte, l'escadre, le piège et son empreinte, ce qui reste."],
	s_n8_avant_aube:   ["Avant l'Aube", "L'escadre en mer avant l'aube du quatrième jour : on construit avant l'attaque, pas pendant."]
};
var COMPETENCES_CH8 = {
	quai_premiers: "Premier conteneur", quai_capitainerie: "Cycle de vie", quai_plans: "Images et digests", quai_soutes: "Volumes et montages",
	quai_chenaux: "Réseaux de conteneurs", quai_chantier: "Dockerfile", quai_cales: "Couches et cache", quai_maitres: "Construction en étapes",
	quai_registre: "Registre privé", quai_feuille: "Compose", quai_vigie: "Exploitation des conteneurs", quai_armurerie: "Durcissement des conteneurs",
	quai_douane: "Inspection d'image", quai_escadre: "Orchestration (swarm)",
	galon_mousse: "Rang de Mousse", galon_matelot: "Rang de Matelot", galon_quartier_maitre: "Rang de Quartier-maître", galon_second: "Rang de Second",
	galon_capitaine: "Rang de Capitaine", galon_amiral: "Rang d'Amiral",
	n8_port: "Flotte mesurée", n8_flotte: "Attaque tenue", n8_piege: "Mise à jour piégée refusée", n8_rapport: "Rapport de bataille",
	s_n8_avant_aube: "Escadre avant l'aube", platine_ch8: "Amiral du Grand Port"
};
/* Les sigles et les métaux, exactement ceux des médailles livrées (outils/dessiner_badges.py). */
var SIGLES_CH8 = {
	quai_premiers: ["RUN", "bronze"], quai_capitainerie: ["LOGS", "bronze"], quai_plans: ["TAG", "bronze"], quai_soutes: ["VOL", "argent"],
	quai_chenaux: ["NET", "argent"], quai_chantier: ["FROM", "argent"], quai_cales: ["HIT", "argent"], quai_maitres: ["SLIM", "or"],
	quai_registre: ["PUSH", "argent"], quai_feuille: ["YAML", "argent"], quai_vigie: ["STAT", "argent"], quai_armurerie: ["CAP", "or"],
	quai_douane: ["SHA", "or"], quai_escadre: ["NODE", "or"],
	galon_mousse: ["0", "bronze"], galon_matelot: ["1", "bronze"], galon_quartier_maitre: ["2", "argent"], galon_second: ["3", "argent"],
	galon_capitaine: ["4", "or"], galon_amiral: ["5", "platine"],
	n8_port: ["PORT", "bronze"], n8_flotte: ["FLOT", "or"], n8_piege: ["DGST", "or"], n8_rapport: ["DOC", "or"], s_n8_avant_aube: ["J4", "or"],
	platine_ch8: ["CNTR", "platine"]
};
Object.keys(COMPETENCES_CH8).forEach(function(id){ COMPETENCES[id] = COMPETENCES_CH8[id]; });
Object.keys(SIGLES_CH8).forEach(function(id){ if (SIGLES_CH8[id][1] !== "bronze") RANGS_DES_BADGES[id] = SIGLES_CH8[id][1]; });
function badgeCh8Gagne(id){ return /^(quai_|galon_)/.test(id) ? state.has(id) : !!(state.quests && state.quests[id]); }

var PLATINES_AVANT_PORT = verifierPlatines;
verifierPlatines = function(){
	PLATINES_AVANT_PORT();
	if (state.has("ch8Ouvert") && !state.has("platine_ch8") && Object.keys(TROPHEES_CH8).every(badgeCh8Gagne)){
		state.set("platine_ch8");
		if (!state.has("rejeuEnCours")) say(C.jaune("✦ Badge gagné : " + COMPETENCES.platine_ch8) + C.gris(" · platine · badges"));
	}
};

/* ------------------------------------------------------------------ */
/* port : le plan du Grand Port ; galons : ton rang                     */
/* ------------------------------------------------------------------ */

function barreFlotteCh8(){
	var reste = Math.max(0, AUBE_CH8 - minutesCh8()), total = AUBE_CH8 - 360, n = 30;
	var k = Math.round(n * (1 - Math.min(1, reste / total)));
	function fois(t, m){ var r = ""; for (var i = 0; i < m; i++) r += t; return r; }
	return C.gris("  le port ⚓ ") + C.vert(fois("~", Math.max(0, n - k))) + C.rouge(fois("◀", k > 0 ? 1 : 0) + fois("≈", Math.max(0, k - 1))) + C.gris(" le phare noir");
}
function textePortCh8(){
	var c = sCh8(), p = puissanceCh8();
	var lignes = [C.gras("LE PLAN DU GRAND PORT"), C.jaune("commande du jeu, pas Linux (man port)"), C.gris("rouge : quai à tenir · vert : quai tenu · l'état est lu sur les machines du port"), ""];
	lignes.push("  " + C.gras(heureCh8()) + C.gris(" · ") + C.gras(nomRangCh8()) + C.gris(" · ") + (c.bataille ? C.rouge("la flotte noire attaque") : C.jaune(texteAvantFlotteCh8())));
	if (!c.bataille) lignes.push(barreFlotteCh8());
	lignes.push("  La puissance de ta flotte : " + C.gras(p + " / 100") + C.gris(" (départ : " + (c.scoreDepart !== null && c.scoreDepart !== undefined ? c.scoreDepart : p) + ", objectif : au moins 90 après la bataille)"), "");
	ACTES_CH8.forEach(function(a){
		lignes.push(C.gras("  Acte " + ["", "I", "II", "III", "IV", "V", "VI"][a.n] + " · " + a.titre) + C.gris(rangCh8() >= a.n - 1 ? "" : "  (fermé : il faut être " + RANGS_CH8[a.n - 1].nom + ")"));
		QUAIS_CH8.filter(function(q){ return q.acte === a.n; }).forEach(function(q){
			var ok = etapesQuaiFaitesCh8(q), faites = q.etapes.filter(aFait).length, defis = idsDefisQuaiPort(q.cle).filter(aFait).length;
			var cede = c.assaut && (c.assaut.quais || []).indexOf(q.cle) > -1;
			lignes.push("    " + (ok ? C.vert : C.rouge)("●") + " " + C.gras(completerDroite(q.nom, 20)) + completerDroite(q.maitre, 9) + C.gris(" (" + q.machine + ")") +
				C.gris("  " + faites + " sur " + q.etapes.length + " étapes · " + defis + " sur 6 défis") + (cede ? C.rouge(" · a cédé à l'aube") : "") + (current_room === q.lieu ? C.jaune("  ◀ toi") : ""));
		});
		if (a.epreuve){
			var etat = aFait(a.epreuve) ? C.vert("réussie") : (epreuveOuverteCh8(a.n) ? C.rouge("EN COURS") : C.gris("fermée (finis l'acte)"));
			lignes.push("    " + C.jaune("⚔") + " Épreuve de rang : " + a.nomEpreuve + C.gris(" → ") + RANGS_CH8[a.n].nom + C.gris(" · ") + etat);
		} else {
			lignes.push("    " + C.jaune("⚔") + " " + a.nomEpreuve + C.gris(" · ") + (c.bataille ? C.rouge("EN COURS") : C.gris("à l'aube du J4, ou dès que l'escadre est en mer")));
		}
	});
	if (c.bataille){
		lignes.push("", C.gras("  La bataille"));
		lignes.push("    " + (aFait("n8_flotte") ? C.vert("●") : C.rouge("●")) + " le port tenu" + (c.assaut ? C.gris(" (l'assaut de l'aube a frappé ; le registre de l'entrepôt " + (assautRepareCh8() ? "est relancé)" : "a coulé)")) : ""));
		lignes.push("    " + (aFait("n8_naufrage") ? C.vert("●") : (c.naufrage ? C.rouge("●") : C.gris("○"))) + " le naufrage de navire2" + (c.naufrage && !aFait("n8_naufrage") ? C.rouge(" : docker node ls, puis drain") : ""));
		lignes.push("    " + (aFait("n8_piege") ? C.vert("●") : (c.piegeLance ? C.rouge("●") : C.gris("○"))) + " la mise à jour piégée" + (c.piegeLance && !aFait("n8_piege") ? C.rouge(" : regarde son empreinte, puis rollback") : ""));
	}
	var inc = incidentsOuvertsCh8();
	if (inc.length) lignes.push("", C.rouge("  Incidents ouverts (-3 chacun) : ") + inc.join(" ; "));
	var manque = mesuresManquantesCh8();
	if (manque.length) lignes.push("", C.gras("  Ce qui manque à ta flotte") + C.gris(" (" + manque.length + ")"), manque.slice(0, 6).map(function(m){ return "    " + C.gris("+" + m.poids) + " " + m.texte; }).join("\n") + (manque.length > 6 ? "\n" + C.gris("    ... et " + (manque.length - 6) + " autres") : ""));
	if (typeof lumieresAnnexes === "function"){ var la = lumieresAnnexes(9); if (la.length) lignes.push("", C.gras("  Les lumières des habitants"), la.map(function(x){ return "    " + C.jaune("✺") + " " + x; }).join("\n")); }
	lignes.push("", "  Quais tenus : " + C.gras(quaisTenusCh8().length + " sur 14"));
	var j1 = aFait("s_n8_matelot_j1") ? C.vert("réussi") : (rangCh8() >= 1 || c.minutes >= 1320 ? C.rouge("manqué") : C.jaune("en cours"));
	var j2 = aFait("s_n8_capitaine_j2") ? C.vert("réussi") : (rangCh8() >= 4 || c.minutes >= 2760 ? C.rouge("manqué") : C.jaune("en cours"));
	var j4 = aFait("s_n8_avant_aube") ? C.vert("réussi") : (c.bataille ? C.rouge("manqué") : C.jaune("en cours"));
	var hi = aFait("s_n8_sans_indice") ? C.vert("réussi") : (state.malus9 ? C.rouge("manqué (indice acheté)") : C.jaune("en cours"));
	lignes.push("", C.gras("  Défis d'honneur (Laurent)"), "    Matelot avant la nuit du J1 : " + j1, "    Capitaine avant la fin du J2 : " + j2, "    L'escadre en mer avant l'aube : " + j4, "    Sans acheter d'indice : " + hi);
	var t = Object.keys(TROPHEES_CH8).filter(badgeCh8Gagne);
	lignes.push("", C.gras("  BADGES : " + t.length + " sur " + Object.keys(TROPHEES_CH8).length) + C.gris("  (badges port : les leçons)"));
	return lignes.join("\n");
}
Shell.sorts.port = function(args, io){
	if (!state.has("ch8Ouvert")) return "Le plan du Grand Port se déroule avec le chapitre 8, après Port-Aube. " + C.gris("(À Port-Aube, c'est chantier.)");
	if (!state.quests["n8_quai"]) return "Le plan du Grand Port est affiché dans la capitainerie : entre d'abord dans le Grand Port (cd GrandPort, depuis le quai de Port-Aube).";
	var c = sCh8(), p = puissanceCh8();
	if (c.scoreDepart === null || c.scoreDepart === undefined) c.scoreDepart = p;
	c.scoreDernier = p;
	if (c.bataille) noterVuCh8("portBataille");
	if (state.quests["n8_piege"]) c.scoreFinalCandidat = p;
	GameEvents.fire({ type: "portJeu", puissance: p });
	var texte = textePortCh8();
	if (io.tty && typeof montrerCarte === "function" && montrerCarte(texte)) return texte + "\n" + C.gris("(Le plan remplace aussi l'image jusqu'à ton prochain déplacement.)");
	return texte;
};
function texteGalonsCh8(){
	var r = rangCh8(), c = sCh8();
	var l = [C.gras("TES GALONS"), C.jaune("commande du jeu, pas Linux (man galons)"), ""];
	l.push("  Rang : " + C.gras(RANGS_CH8[r].nom) + C.gris("  (" + ["aucun galon", "un galon de bronze", "deux galons d'argent", "trois galons d'argent", "quatre galons d'or", "trois étoiles"][r] + ")"));
	l.push("", C.gras("  Les rangs"));
	RANGS_CH8.forEach(function(x, i){ l.push("    " + (i <= r && (i > 0 || state.has("galon_mousse")) ? C.vert("✦") : C.gris("·")) + " " + completerDroite(x.nom, 17) + (c.rangA && c.rangA[i] !== undefined ? C.gris("gagné à J" + (Math.floor(c.rangA[i] / 1440) + 1) + " " + deuxChiffres(Math.floor(c.rangA[i] % 1440 / 60)) + ":" + deuxChiffres(c.rangA[i] % 60)) : "")); });
	if (r < 5){
		var a = acteCh8(r + 1);
		var reste = a.etapes.filter(function(id){ return !aFait(id); });
		l.push("", C.gras("  Pour devenir " + RANGS_CH8[r + 1].nom));
		if (!aFait("n8_port")) l.push("    Écouter Laurent, lire l'Ordre, et déployer le plan du port (port).");
		reste.forEach(function(id){ var q = QUETES_CH8.filter(function(x){ return x.id === id; })[0]; l.push("    [ ] " + q.titre); });
		l.push("    " + (epreuveOuverteCh8(r + 1) ? C.rouge("⚔ L'épreuve de rang est ouverte : ") : C.gris("⚔ Puis l'épreuve de rang : ")) + a.nomEpreuve);
	} else l.push("", C.gras("  Tu portes les trois étoiles.") + (state.quests["n8_rapport"] ? " Le Grand Port est à toi." : " Il reste à rassembler l'escadre, et à tenir la bataille."));
	var m = Object.keys(sCh8().manoeuvres || {}).filter(function(k){ return sCh8().manoeuvres[k]; });
	l.push("", C.gras("  Tes manœuvres") + C.gris(" (les sous-commandes de docker que les maîtres t'ont apprises)"), "    " + (m.length ? m.join(", ") : C.gris("aucune : Kylian enseigne les premières, au Quai des Premiers Pas")));
	return l.join("\n");
}
Shell.sorts.galons = function(args, io){
	if (!state.has("ch8Ouvert")) return "Les galons se gagnent au Grand Port, au chapitre 8.";
	return texteGalonsCh8();
};
Shell.sorts.rang = Shell.sorts.galons;
["port", "galons", "rang"].forEach(function(s){ if (SORTS_DU_JEU.indexOf(s) === -1) SORTS_DU_JEU.push(s); });
if (typeof COMMANDES_DU_JEU !== "undefined"){
	COMMANDES_DU_JEU.splice(COMMANDES_DU_JEU.length - 4, 0, ["port", "le plan du Grand Port : les quais, l'heure, la flotte, la puissance (chapitre 8)"]);
	COMMANDES_DU_JEU.splice(COMMANDES_DU_JEU.length - 4, 0, ["galons", "ton rang au Grand Port, et ce qu'il faut pour le suivant (alias : rang)"]);
}
if (typeof MANUEL_DU_JEU !== "undefined"){
	MANUEL_DU_JEU.port = "port n'est PAS une commande Linux : c'est une commande du jeu, comme quetes ou badges.\n" +
		"Au Grand Port (chapitre 8), il déroule le plan du port : l'heure (J1 06:00 à l'aube du J4), ton rang, la flotte noire qui\n" +
		"approche, la puissance de ta flotte (de 0 à 100, calculée sur l'état RÉEL des machines du port), les quatorze quais (en\n" +
		"rouge ceux à tenir, en vert ceux tenus), les épreuves de rang, la bataille, et ce qui manque encore.\n\n  port          le plan du Grand Port\n\n" +
		"(À ne pas confondre avec docker port, qui liste les ports publiés d'un conteneur.)";
	MANUEL_DU_JEU.galons = "galons n'est PAS une commande Linux : c'est une commande du jeu.\nAu Grand Port, elle montre ton rang (Mousse, Matelot, Quartier-maître, Second, Capitaine, Amiral), quand tu l'as gagné,\n" +
		"ce qu'il te manque pour le suivant (les étapes de l'acte, puis l'épreuve de rang) et tes manœuvres (les sous-commandes de\ndocker que les maîtres t'ont apprises).\n\n  galons        ton rang\n  rang          la même chose";
	MANUEL_DU_JEU.rang = MANUEL_DU_JEU.galons;
}

/* ------------------------------------------------------------------ */
/* Le monde réagit : défis, honneur, badges, radio                     */
/* ------------------------------------------------------------------ */

function verifierPort(){
	if (!portActifPort()) return;
	var c = sCh8();
	DEFIS_PORT.forEach(function(d){ var ok = false; if (d.monde && !state.quests[d.id]){ try { ok = d.monde(); } catch (e){ ok = false; } if (ok) reussirDefiPort(d.id); } });
	if (c.rangA && c.rangA[1] !== undefined && c.rangA[1] < 1320) reussirDefiPort("s_n8_matelot_j1");
	if (c.rangA && c.rangA[4] !== undefined && c.rangA[4] < 1440 + 1320) reussirDefiPort("s_n8_capitaine_j2");
	if (c.bataille && c.bataille.avantAube) reussirDefiPort("s_n8_avant_aube");
	if (aFait("n8_rapport") && !state.malus9) reussirDefiPort("s_n8_sans_indice");
	QUAIS_CH8.forEach(function(q){ if (etapesQuaiFaitesCh8(q) && !state.has("quai_" + q.cle)) state.set("quai_" + q.cle); });
	c.trophees = c.trophees || {};
	Object.keys(TROPHEES_CH8).forEach(function(id){
		if (!badgeCh8Gagne(id) || c.trophees[id]) return;
		c.trophees[id] = true;
		if (!state.has("rejeuEnCours")) say(C.jaune("✦ Badge gagné : " + COMPETENCES[id]) + C.gris(" · badges"));
	});
	verifierPlatines();
	var suivante = QUETES_CH8.filter(function(q){ return !state.quests[q.id]; })[0];
	var cle = suivante ? suivante.id : "fin";
	if (c.dernierConseil !== cle){
		c.dernierConseil = cle;
		if (!state.has("rejeuEnCours") && cle !== "n8_port") say(C.gris("(Nouveau message de Grace : cat " + Shell.cheminAffiche(GrandPortCh8) + "/Radio.)"));
	}
}
var VERIFIER_CH8_AVANT_PORT = verifierChapitre8;
verifierChapitre8 = function(){
	VERIFIER_CH8_AVANT_PORT();
	verifierPort();
};

World.fige = true;
