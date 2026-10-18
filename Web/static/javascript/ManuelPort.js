/**
 * ManuelPort.js : les pages de manuel des sorts des conteneurs (chapitre 8, le Grand Port), en français.
 * Chaque page dit à quoi sert le sort, ses options courantes, un exemple, et le piège classique.
 * SORTS_PORT range les sorts du chapitre ; SORTS_ANNEXES_PORT, ceux des quêtes annexes (hors barème).
 * ip netns, docker buildx et docker manifest sont des notions d'annexe sans sort propre : leurs lignes sont dans
 * les pages ip et docker.
 */

MANUEL["docker"] = page("construire, lancer et surveiller des conteneurs", "DOCKER (le docker du port)",
	"Un conteneur est un processus ordinaire de l'hôte, enfermé par le noyau : ses espaces de noms (il ne voit que ses\n" +
	"processus, son réseau, son nom de machine, ses fichiers) et ses cgroups (il ne prend que la mémoire et le\n" +
	"processeur qu'on lui donne). Une image est une pile de couches en lecture seule ; le conteneur pose au-dessus une\n" +
	"couche à lui, qui disparaît avec lui. Le démon dockerd fait tout ; la commande docker lui parle par le socket\n" +
	"/var/run/docker.sock (root et le groupe docker : être dans ce groupe, c'est être root sur la machine).\n\n" +
	"Les images\n" +
	"  docker pull alpine:3.20                 tirer une image du registre (sans tag : latest)\n" +
	"  docker images                           les images locales ; docker image prune les pendantes (<none>)\n" +
	"  docker history IMAGE                    ses couches, instruction par instruction\n" +
	"  docker tag ecole:1.0 entrepot.port-aube.lan:5000/ecole:1.0      un autre nom pour la même image\n" +
	"  docker push NOM ; docker login REGISTRE ; docker rmi IMAGE\n" +
	"  docker build -t ecole:1.0 .             construire depuis le Dockerfile du dossier (le contexte : .)\n" +
	"  docker save -o ecole.tar ecole:1.0 ; docker load -i ecole.tar\n\n" +
	"Les conteneurs\n" +
	"  docker run -d --name app -p 8080:80 nginx:1.27-alpine     en fond, nommé, le port 80 publié sur 8080\n" +
	"  docker run -it --rm alpine:3.20 sh      un shell jetable (--rm : effacé à la sortie)\n" +
	"  docker ps ; docker ps -a                ceux qui tournent ; tous\n" +
	"  docker logs -f app ; docker exec -it app sh ; docker inspect -f '{{.State.Status}}' app\n" +
	"  docker stop app ; docker start app ; docker rm app ; docker top app ; docker stats --no-stream\n" +
	"  docker cp app:/etc/nginx/nginx.conf . ; docker diff app      sortir un fichier ; ce qui a changé\n\n" +
	"Les options de run qui comptent\n" +
	"  -e CLE=valeur, --env-file f      l'environnement ;  -v volume:/chemin, -v ./dossier:/chemin:ro      les données\n" +
	"  --network reseau                  un réseau à soi (les conteneurs s'y trouvent par leur nom)\n" +
	"  --restart unless-stopped          relancé s'il tombe ;  --memory 256m, --cpus 0.5     les limites\n" +
	"  --user 1000, --read-only, --cap-drop ALL, --security-opt no-new-privileges     durcir\n" +
	"  --health-cmd 'curl -f localhost/sante'      un bilan de santé (healthy, unhealthy)\n\n" +
	"Volumes et réseaux\n" +
	"  docker volume create/ls/inspect/rm/prune ; docker network create/ls/inspect/connect/rm\n\n" +
	"Plusieurs conteneurs ensemble\n" +
	"  docker compose up -d / ps / logs / down (-v efface aussi les volumes)      la pile décrite dans compose.yaml\n" +
	"  docker swarm init ; docker node ls ; docker service create/ls/ps/update/rollback/scale ; docker stack deploy -c f nom ;\n" +
	"  docker secret create      l'escadre : plusieurs machines, des répliques, des mises à jour progressives\n\n" +
	"Ailleurs\n" +
	"  docker buildx ls / create --use / build --platform linux/amd64,linux/arm64 --push      une image pour plusieurs plateformes\n" +
	"  docker manifest inspect --insecure REGISTRE/IMAGE:TAG       les plateformes d'une image\n\n" +
	"Les pièges : un port publié sans 127.0.0.1: écoute sur toutes les interfaces ; une donnée hors volume meurt avec\n" +
	"son conteneur ; le tag latest bouge ; une image d'origine inconnue ne se lance pas, elle s'inspecte.");
MANUEL["htpasswd"] = page("fabriquer un fichier de mots de passe pour un serveur web ou un registre", "HyperText PASSWorD",
	"  htpasswd -Bbn douanier MOTDEPASSE              affiche la ligne douanier:$2y$05$... (bcrypt)\n" +
	"  htpasswd -Bbn douanier MOTDEPASSE > auth/htpasswd     la ranger dans un fichier\n" +
	"  htpasswd -B auth/htpasswd capitaine            ajouter un compte (le mot de passe est demandé)\n\n" +
	"-B choisit bcrypt : le registre n'accepte que lui. -c crée (et ÉCRASE) le fichier. Le piège : -c sur un fichier\n" +
	"existant efface les comptes déjà là.");
MANUEL["dockerd"] = page("le démon des conteneurs (et la vérification de sa configuration)", "DOCKER Daemon",
	"dockerd tourne comme un service : on le pilote avec systemctl (start, stop, restart, status) et on le lit avec\n" +
	"journalctl -u docker. Sa configuration est /etc/docker/daemon.json, en JSON strict (pas de virgule finale).\n\n" +
	"  sudo dockerd --validate --config-file /etc/docker/daemon.json      vérifier avant de redémarrer\n" +
	"  sudo systemctl restart docker                                       relire la configuration\n\n" +
	"Les clés courantes : insecure-registries (un registre sans TLS), log-opts (max-size, max-file : la rotation des\n" +
	"journaux), live-restore (les conteneurs survivent au redémarrage du démon), userns-remap, no-new-privileges.\n" +
	"Le piège : un daemon.json invalide, et le démon ne redémarre plus ; tous les conteneurs restent à terre.");
MANUEL["ctr"] = page("regarder sous docker : containerd", "ConTaineRd client",
	"docker confie ses conteneurs à containerd, dans l'espace de noms moby.\n\n" +
	"  sudo ctr namespaces ls                 les espaces de noms\n" +
	"  sudo ctr -n moby containers ls         les conteneurs de docker, vus d'en dessous\n" +
	"  sudo ctr -n moby tasks ls              leurs processus (PID sur l'hôte)\n\n" +
	"On regarde, on ne touche pas : ce qu'on change ici, docker ne le sait pas.");

/* ---------------- Les annexes ---------------- */
MANUEL["podman"] = page("des conteneurs sans démon et sans root", "POD MANager",
	"podman parle comme docker (run, ps, images, logs, exec, rm...) mais sans démon : chaque conteneur est un enfant\n" +
	"de la commande (et de conmon). Lancé par un utilisateur ordinaire, il est « rootless » : root dans le conteneur,\n" +
	"c'est toi sur l'hôte (ps aux le montre), et les autres utilisateurs du conteneur deviennent 100000 et suivants\n" +
	"(/etc/subuid). Une fuite hors du conteneur ne donne que tes droits.\n\n" +
	"  podman run -d --name phare -p 8080:80 nginx:1.27-alpine\n" +
	"  podman ps ; podman images ; podman info | grep rootless\n" +
	"  podman unshare cat /proc/self/uid_map      la correspondance des identifiants\n\n" +
	"Les noms courts se résolvent par /etc/containers/registries.conf. Le piège : sans root, pas de port sous 1024.");
MANUEL["unshare"] = page("lancer un programme dans de nouveaux espaces de noms", "UNSHARE",
	"Ce que fait un conteneur, à la main : chaque option sépare une chose du reste du système.\n\n" +
	"  sudo unshare --pid --fork --mount-proc bash      ses propres PID : ps n'y voit que bash (PID 1) et lui-même\n" +
	"  sudo unshare --uts bash ; hostname essai         un nom de machine à part (l'hôte garde le sien)\n" +
	"  sudo unshare --net bash ; ip a                   un réseau vide : seulement lo, éteinte\n" +
	"  unshare --user --map-root-user bash ; id         root dans l'espace, toi au-dehors (sans sudo)\n\n" +
	"exit referme. Les pièges : --pid sans --fork (le shell ne peut plus rien lancer), --pid sans --mount-proc (ps lit\n" +
	"le /proc de l'hôte et voit encore tout).");
MANUEL["nsenter"] = page("entrer dans les espaces de noms d'un processus", "Namespace ENTER",
	"  docker inspect -f '{{.State.Pid}}' app                le PID du conteneur, sur l'hôte\n" +
	"  sudo nsenter -t PID -n ip a                           le réseau du conteneur, avec l'outil ip de l'hôte\n" +
	"  sudo nsenter -t PID -u hostname                       son nom de machine\n" +
	"  sudo nsenter -t PID -m -u -i -n -p sh                 tout son monde (comme docker exec)\n\n" +
	"Utile quand l'image n'a aucun outil (ni ip, ni ps) : on garde ceux de l'hôte et on emprunte les espaces du conteneur.");
MANUEL["lsns"] = page("lister les espaces de noms", "LiSt NameSpaces",
	"  lsns                   ceux de tes processus ;  sudo lsns : tous (l'hôte, puis chaque conteneur)\n" +
	"  sudo lsns -t net       seulement les réseaux ;  sudo lsns -p PID : ceux d'un processus\n\n" +
	"Chaque ligne : le numéro de l'espace, son type (mnt, uts, ipc, pid, net, user, cgroup, time), combien de\n" +
	"processus y vivent, le premier, son utilisateur. Un conteneur a les siens ; --network host partage le net de l'hôte.\n\n" +
	"Les espaces réseau nommés, eux, se gèrent avec ip netns :\n" +
	"  sudo ip netns add essai ; ip netns list ; sudo ip netns exec essai ip a ; sudo ip netns delete essai");
MANUEL["skopeo"] = page("lire et copier des images de registre à registre, sans démon", "SKOPEO (« regarder », en grec)",
	"  skopeo inspect docker://continent.lan/library/alpine:3.20        le digest, les tags, les couches, sans rien tirer\n" +
	"  skopeo list-tags docker://continent.lan/library/nginx            les tags d'un dépôt\n" +
	"  skopeo copy docker://continent.lan/library/alpine:3.20 \\\n" +
	"      docker://entrepot.port-aube.lan:5000/alpine:3.20 --dest-tls-verify=false --dest-creds douanier:MOTDEPASSE\n\n" +
	"Les adresses commencent par leur transport : docker:// (un registre), docker-daemon: (les images de dockerd).\n" +
	"Le piège : un registre sans TLS demande --tls-verify=false (ou --src-, --dest-).");
MANUEL["hadolint"] = page("relire un Dockerfile", "HAskell DOckerfile LINTer",
	"  hadolint Dockerfile                 une ligne par remarque : la ligne, la règle, sa gravité, le conseil\n" +
	"  hadolint --ignore DL3059 Dockerfile ;  hadolint -f json Dockerfile\n\n" +
	"Les règles les plus courantes :\n" +
	"  DL3008  épingler les versions dans apt-get install (paquet=version)\n" +
	"  DL3009  effacer /var/lib/apt/lists après l'installation (dans le même RUN)\n" +
	"  DL3015  apt-get install --no-install-recommends\n" +
	"  DL3025  CMD et ENTRYPOINT en forme JSON : CMD [\"python\", \"app.py\"]\n" +
	"  DL3059  plusieurs RUN de suite : les regrouper\n" +
	"  DL3006, DL3007  une image de base sans tag, ou latest\n\n" +
	"Code de retour 1 dès qu'il y a une remarque : un hadolint propre ne dit rien.");
MANUEL["systemd-nspawn"] = page("lancer un système entier posé dans un dossier", "SYSTEMD Namespace SPAWN",
	"  sudo systemd-nspawn -D /var/lib/machines/cabine-ancienne           un shell root dans l'arborescence\n" +
	"  sudo systemd-nspawn -D /var/lib/machines/cabine-ancienne cat /etc/os-release      une seule commande\n" +
	"  sudo systemd-nspawn -b -D DOSSIER                                  démarrer son init (un système complet)\n\n" +
	"Les mêmes cloisons du noyau que les conteneurs, mais pour un système entier, sans image ni registre.\n" +
	"exit (ou Ctrl-] trois fois) referme.");
MANUEL["machinectl"] = page("piloter les machines de systemd-nspawn", "MACHINE ConTroL",
	"  machinectl list-images                    les arborescences de /var/lib/machines\n" +
	"  sudo machinectl start cabine-ancienne      la démarrer en fond (son init tourne)\n" +
	"  machinectl list                            les machines en marche\n" +
	"  sudo machinectl shell cabine-ancienne      un shell dedans ; exit pour revenir\n" +
	"  machinectl status NOM ;  sudo machinectl poweroff NOM");

/* La page de ip connaît les espaces réseau nommés. */
if (MANUEL["ip"] && MANUEL["ip"].page.indexOf("netns") === -1) MANUEL["ip"].page += "\n\nLes espaces de noms réseau (sur les machines du Grand Port) :\n" +
	"  sudo ip netns add essai ; ip netns list ; sudo ip netns exec essai ip a ; sudo ip netns delete essai";

/* Les sorts du chapitre 8, et ceux des annexes du Grand Port (hors barème). */
var SORTS_PORT = ["docker", "htpasswd", "dockerd", "ctr"];
var SORTS_ANNEXES_PORT = ["podman", "unshare", "nsenter", "lsns", "skopeo", "hadolint", "systemd-nspawn", "machinectl"];
SORTS_PORT.concat(SORTS_ANNEXES_PORT).forEach(function(s){ if (MANUEL[s]) MANUEL[s].horsBareme = true; });
if (typeof COMMANDES_REELLES !== "undefined") COMMANDES_REELLES = COMMANDES_REELLES.filter(function(c){ return SORTS_PORT.indexOf(c) === -1 && SORTS_ANNEXES_PORT.indexOf(c) === -1; });
if (typeof declarerSortsAnnexes === "function") declarerSortsAnnexes(SORTS_ANNEXES_PORT);
var PREMIER_USAGE_AVANT_PORT = GameState.prototype.premierUsage;
GameState.prototype.premierUsage = function(sort){
	if ((SORTS_PORT.indexOf(sort) > -1 || SORTS_ANNEXES_PORT.indexOf(sort) > -1) && tousLesSorts().indexOf(sort) === -1){ this.usages[sort] = true; return; }
	return PREMIER_USAGE_AVANT_PORT.apply(this, arguments);
};
