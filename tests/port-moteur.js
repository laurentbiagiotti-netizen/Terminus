/**
 * Le moteur des conteneurs du Grand Port (SortsPort*.js, GrandPort.js), commande par commande, sur les vraies machines
 * du port : l'accès au démon et le groupe docker, le démon arrêté, un daemon.json invalide, le cycle de vie d'un
 * conteneur et ses codes de sortie, les ports, logs, exec, inspect, ps (--format, --filter), les images (tags,
 * digests, rmi, prune), les volumes (persistance, copie initiale, anonymes), bind et :ro, les réseaux et leur DNS,
 * none, 127.0.0.1, le build (instructions, erreurs, cache réel, --no-cache, .dockerignore, multi-stage, --target),
 * la santé et les redémarrages, l'OOM, la rotation des journaux, le registre (auth, insecure, push, pull ailleurs,
 * digest), save, tar et jq, l'éclaireur en quarantaine, compose, l'escadre (join, rejet « No such image »,
 * répartition, mise à jour, retour arrière, perte d'un navire, stack, secrets), les outils des annexes (podman,
 * unshare, nsenter, lsns, ip netns, skopeo, buildx, manifest, hadolint, systemd-nspawn, machinectl), ps de l'hôte et
 * ssh-keygen -lf sur known_hosts. Chaque sort lit l'état au moment où on le lance et le change comme le vrai.
 *
 * Lancer : node tests/port-moteur.js
 */
var monde = require("./monde.js");
var ok = 0, ko = 0;
function verifier(c, m){ if (c) ok++; else { ko++; console.log("ÉCHEC : " + m); } }
function contient(t, m, msg){ verifier(String(t).indexOf(m) > -1, (msg || "") + " : « " + m + " » absent de\n" + String(t).substring(0, 1500)); }
function absent(t, m, msg){ verifier(String(t).indexOf(m) === -1, (msg || "") + " : « " + m + " » ne devait pas apparaître dans\n" + String(t).substring(0, 1500)); }
function egal(a, b, m){ verifier(a === b, m + " : attendu " + JSON.stringify(b) + ", obtenu " + JSON.stringify(a)); }

/* Un port neuf : le chapitre ouvert, tous les sorts connus. */
function port(){
	var jeu = monde.nouveauMonde({});
	jeu.taper("chapitre 7", "oui");
	jeu.lire("tousLesSorts().concat(SORTS_PORT, SORTS_ANNEXES_PORT, ['ssh', 'sudo', 'usermod', 'curl', 'tar', 'jq', 'ssh-keygen', 'ip', 'ps', 'tee', 'printf']).forEach(function(s){ state.spells[s] = true; })");
	jeu.lire("state.applyState('ch8Ouvert')");
	return jeu;
}
/* La sortie d'une commande, sans ce que le jeu ajoute (XP, quêtes, radio, badges, lieux). */
function net(s){ return String(s).split("\n").filter(function(l){ return !/^(\+\d+ XP|★|✦|✺|◆|◇|\(Radio|\(Nouveau message|Tu viens de|Un nouveau lieu|Tu es maintenant dans|Tu es de retour|\(exit ferme|Connexion à|Bienvenue sur)/.test(l); }).join("\n").trim(); }
function t(jeu, c, r){ return net(r === undefined ? jeu.jouerSolution(c) : jeu.taper(c, r)); }
function tous(jeu, l){ return l.map(function(c){ return t(jeu, c); }).join("\n"); }
/* Entrer dans le groupe docker d'une machine (et rouvrir la session pour qu'il compte). */
function equipage(jeu, h){ t(jeu, "ssh " + h); t(jeu, "sudo usermod -aG docker " + jeu.lire("JOUEUR")); t(jeu, "exit"); t(jeu, "ssh " + h); }
var REG = "entrepot.port-aube.lan:5000";
/* Le registre de l'entrepôt, avec un compte, et docks qui lui fait confiance (insecure) et s'y connecte. */
function registre(jeu){
	equipage(jeu, "entrepot");
	tous(jeu, ["htpasswd -Bbn douanier Sel-2026 | sudo tee /srv/registre/auth/htpasswd",
		"docker run -d --name registre --restart always -p 5000:5000 -v /srv/registre/donnees:/var/lib/registry -v /srv/registre/auth:/auth -e REGISTRY_AUTH=htpasswd -e REGISTRY_AUTH_HTPASSWD_REALM=entrepot -e REGISTRY_AUTH_HTPASSWD_PATH=/auth/htpasswd registry:2", "exit"]);
}
function confiance(jeu){
	tous(jeu, ["echo '{\"insecure-registries\": [\"" + REG + "\"]}' | sudo tee /etc/docker/daemon.json", "sudo systemctl restart docker", "echo Sel-2026 | docker login " + REG + " -u douanier --password-stdin"]);
}

/* ================================================================== */
/* 1. Le démon : le socket, le groupe, l'arrêt, la configuration        */
/* ================================================================== */
(function(){
	var jeu = port();
	t(jeu, "ssh docks");
	var s = t(jeu, "docker ps");
	contient(s, "permission denied while trying to connect to the Docker daemon socket at unix:///var/run/docker.sock", "hors du groupe docker : refusé");
	contient(t(jeu, "ls -l /var/run/docker.sock"), "srw-rw----", "le socket : un s, au groupe docker");
	contient(t(jeu, "ls -l /var/run/docker.sock"), "docker", "le socket appartient au groupe docker");
	t(jeu, "sudo usermod -aG docker " + jeu.lire("JOUEUR"));
	contient(t(jeu, "docker ps"), "pas dans CETTE session", "le groupe ne compte qu'à la prochaine connexion");
	absent(t(jeu, "id"), "docker", "id : la session n'a pas encore le groupe");
	contient(t(jeu, "sudo docker ps"), "CONTAINER ID", "sudo docker passe");
	tous(jeu, ["exit", "ssh docks"]);
	contient(t(jeu, "id"), "(docker)", "id : la nouvelle session a le groupe");
	contient(t(jeu, "docker ps"), "CONTAINER ID   IMAGE     COMMAND", "docker ps : l'en-tête");
	contient(t(jeu, "docker version"), "API version:       1.45", "docker version");
	contient(t(jeu, "docker info"), "Server Version: 26.1.5+dfsg1", "docker info");
	contient(t(jeu, "docker --version"), "Docker version 26.1.5+dfsg1", "docker --version");
	// Le socket réveille le démon.
	t(jeu, "sudo systemctl stop docker");
	contient(t(jeu, "docker ps"), "CONTAINER ID", "docker.socket relance le démon au premier appel");
	egal(t(jeu, "systemctl is-active docker"), "active", "le démon est revenu");
	t(jeu, "sudo systemctl stop docker.socket docker");
	contient(t(jeu, "docker ps"), "Cannot connect to the Docker daemon at unix:///var/run/docker.sock. Is the docker daemon running?", "démon et socket arrêtés");
	t(jeu, "sudo systemctl start docker");
	// Un daemon.json invalide.
	t(jeu, "echo '{\"log-driver\": \"json-file\",}' | sudo tee /etc/docker/daemon.json");
	contient(t(jeu, "sudo dockerd --validate --config-file /etc/docker/daemon.json"), "invalid character '}' looking for beginning of object key string", "dockerd --validate : la virgule finale");
	contient(t(jeu, "sudo systemctl restart docker"), "Job for docker.service failed", "un daemon.json invalide : le démon ne redémarre pas");
	contient(t(jeu, "docker ps"), "Is the docker daemon running?", "plus de démon");
	contient(t(jeu, "sudo journalctl -u docker | tail -3"), "unable to configure the Docker daemon with file /etc/docker/daemon.json", "le journal dit pourquoi");
	t(jeu, "echo '{\"log-driver\": \"json-file\", \"truc\": 1}' | sudo tee /etc/docker/daemon.json");
	contient(t(jeu, "sudo dockerd --validate --config-file /etc/docker/daemon.json"), "the following directives don't match any configuration option: truc", "dockerd --validate : une clé inconnue");
	t(jeu, "echo '{\"log-driver\": \"json-file\"}' | sudo tee /etc/docker/daemon.json");
	contient(t(jeu, "sudo dockerd --validate --config-file /etc/docker/daemon.json"), "configuration OK", "dockerd --validate : bon");
	t(jeu, "sudo systemctl restart docker");
	contient(t(jeu, "docker ps -a"), "epave", "le démon relancé ; l'épave de l'ancien équipage est là");
	contient(t(jeu, "sudo ctr -n moby containers ls"), "CONTAINER", "ctr : sous docker, containerd");
	// ssh-keygen -lf sur known_hosts : l'empreinte de chaque hôte.
	var kh = t(jeu, "ssh-keygen -lf /etc/ssh/ssh_known_hosts");
	contient(kh, "SHA256:", "ssh-keygen -lf known_hosts : une empreinte par ligne");
	contient(kh, "(ED25519)", "ssh-keygen -lf known_hosts : le type de clé");
})();

/* ================================================================== */
/* 2. Le cycle de vie, les codes de sortie, les ports, logs, exec      */
/* ================================================================== */
(function(){
	var jeu = port();
	equipage(jeu, "docks");
	var hw = t(jeu, "docker run hello-world");
	contient(hw, "Hello from Docker!", "hello-world");
	egal(t(jeu, "docker run alpine:3.20 echo bonjour"), "bonjour", "run au premier plan : la sortie");
	t(jeu, "docker run alpine:3.20 sh -c 'exit 3'");
	egal(t(jeu, "echo $?"), "3", "le code de sortie du conteneur devient celui de docker run");
	contient(t(jeu, "docker run alpine:3.20 nope"), "exec: \"nope\": executable file not found in $PATH", "un programme absent");
	egal(t(jeu, "echo $?"), "127", "et le code 127");
	contient(t(jeu, "docker run --user inconnu alpine:3.20 id"), "unable to find user inconnu: no matching entries in passwd file", "un utilisateur inconnu");
	contient(t(jeu, "docker run --user 1234 alpine:3.20 id"), "uid=1234 gid=0(root)", "--user par numéro");
	contient(t(jeu, "docker run --rm -e MOT=sel alpine:3.20 env"), "MOT=sel", "-e");
	var id = t(jeu, "docker run -d --name w1 -p 8080:80 nginx:1.27-alpine").split("\n").pop();
	verifier(/^[0-9a-f]{64}$/.test(id), "run -d : l'identifiant complet");
	var conflit = t(jeu, "docker run -d --name w2 -p 8080:80 nginx:1.27-alpine");
	contient(conflit, "Bind for 0.0.0.0:8080 failed: port is already allocated", "le même port publié deux fois");
	contient(t(jeu, "docker ps -a --filter name=w2 --format '{{.Status}}'"), "Created", "le conteneur refusé reste créé");
	contient(t(jeu, "docker run -d --name w1 nginx:1.27-alpine"), "The container name \"/w1\" is already in use", "un nom déjà pris");
	contient(t(jeu, "curl -s localhost:8080"), "Welcome to nginx", "le port publié répond sur l'hôte");
	contient(t(jeu, "docker port w1"), "80/tcp -> 0.0.0.0:8080", "docker port");
	contient(t(jeu, "ss -tln"), ":8080", "ss : docker-proxy écoute le port publié");
	contient(t(jeu, "docker logs w1 2>&1"), "\"GET / HTTP/1.1\" 200", "docker logs : la requête dans le journal d'accès");
	contient(t(jeu, "docker logs --tail 1 w1"), "GET /", "docker logs --tail");
	egal(t(jeu, "docker exec w1 cat /etc/hostname"), id.substring(0, 12), "exec : le nom de machine est l'identifiant court");
	contient(t(jeu, "docker exec w1 ps"), "nginx: master process", "exec ps : les processus du conteneur");
	contient(t(jeu, "docker exec w1 nope"), "executable file not found", "exec : un programme absent");
	egal(t(jeu, "docker inspect -f '{{.State.Status}} {{.HostConfig.PortBindings}}' w1").split(" ")[0], "running", "inspect --format");
	contient(t(jeu, "docker inspect w1"), "\"Name\": \"/w1\"", "inspect : le JSON complet");
	egal(t(jeu, "docker inspect -f '{{.HostConfig.NetworkMode}}' w1"), "bridge", "inspect : HostConfig");
	contient(t(jeu, "docker top w1"), "nginx: worker process", "docker top");
	contient(t(jeu, "ps aux"), "nginx: master process nginx -g daemon off;", "ps de l'hôte : les processus du conteneur y sont");
	contient(t(jeu, "ps aux"), "containerd-shim-runc-v2", "ps de l'hôte : le shim du conteneur");
	contient(t(jeu, "docker ps --format '{{.Names}}\\t{{.Ports}}'"), "w1\t0.0.0.0:8080->80/tcp", "ps --format");
	egal(t(jeu, "docker ps -q --filter name=w1"), id.substring(0, 12), "ps -q --filter");
	contient(t(jeu, "docker rm w1"), "container is running: stop the container before removing or force remove", "rm d'un conteneur en marche");
	egal(t(jeu, "docker stop w1"), "w1", "stop");
	contient(t(jeu, "docker ps -a --filter name=w1"), "Exited (0)", "stop : nginx sort proprement (0)");
	t(jeu, "docker start w1");
	contient(t(jeu, "docker ps --filter name=w1"), "Up", "start");
	egal(t(jeu, "docker kill w1"), "w1", "kill");
	contient(t(jeu, "docker ps -a --filter name=w1"), "Exited (137)", "kill : 137");
	egal(t(jeu, "docker rm w1"), "w1", "rm");
	t(jeu, "docker run -d --name w3 -p 127.0.0.1:8081:80 nginx:1.27-alpine");
	contient(t(jeu, "curl -s localhost:8081"), "Welcome to nginx", "127.0.0.1 : joignable depuis l'hôte");
	tous(jeu, ["exit", "ssh navire1"]);
	t(jeu, "curl -s -m 2 docks:8081");
	egal(t(jeu, "echo $?"), "7", "127.0.0.1 : injoignable d'une autre machine");
	tous(jeu, ["exit", "ssh docks"]);
	contient(t(jeu, "docker container prune -f"), "Deleted Containers:", "container prune");
	absent(t(jeu, "docker ps -a"), "epave", "prune : l'épave est partie");
	contient(t(jeu, "docker stats --no-stream"), "MEM USAGE / LIMIT", "stats");
	contient(t(jeu, "docker events --since 3h --until 0s"), "container start", "events");
})();

/* ================================================================== */
/* 3. Les images                                                        */
/* ================================================================== */
(function(){
	var jeu = port();
	equipage(jeu, "docks");
	var im = t(jeu, "docker images");
	contient(im, "<none>        <none>", "des images pendantes de l'ancien équipage");
	contient(t(jeu, "docker pull alpine:3.20"), "Status: Image is up to date for alpine:3.20", "pull d'une image déjà là");
	var dg = t(jeu, "docker images --digests alpine");
	contient(dg, "sha256:", "images --digests");
	var d1 = t(jeu, "docker inspect -f '{{index .RepoDigests 0}}' alpine:3.20");
	contient(d1, "alpine@sha256:", "RepoDigests");
	t(jeu, "docker tag alpine:3.20 mon-alpine:1");
	egal(t(jeu, "docker images -q mon-alpine:1"), t(jeu, "docker images -q alpine:3.20"), "tag : la même image, deux noms");
	contient(t(jeu, "docker rmi alpine:3.20"), "Untagged: alpine:3.20", "rmi d'un tag parmi d'autres : seulement le tag");
	contient(t(jeu, "docker images mon-alpine"), "mon-alpine", "l'autre nom reste");
	contient(t(jeu, "docker image prune -f"), "deleted: sha256:", "image prune : les pendantes");
	egal(t(jeu, "docker images -q -f dangling=true"), "", "plus de pendantes");
	t(jeu, "docker run -d --name occupe mon-alpine:1 sleep 3600");
	contient(t(jeu, "docker rmi mon-alpine:1"), "image is being used by running container", "rmi d'une image en service");
	contient(t(jeu, "docker pull nginx:1.99"), "manifest for nginx:1.99 not found: manifest unknown", "un tag qui n'existe pas");
	contient(t(jeu, "docker pull pas-une-image"), "pull access denied for pas-une-image", "un dépôt qui n'existe pas");
	contient(t(jeu, "docker history alpine:3.20 2>&1 | head -2 ; docker history mon-alpine:1"), "ADD alpine-minirootfs", "history");
	contient(t(jeu, "docker system df"), "Images", "system df");
})();

/* ================================================================== */
/* 4. Volumes, bind, réseaux                                            */
/* ================================================================== */
(function(){
	var jeu = port();
	equipage(jeu, "docks");
	t(jeu, "docker run -d --name v1 -v site:/usr/share/nginx/html nginx:1.27-alpine");
	egal(t(jeu, "docker exec v1 ls /usr/share/nginx/html"), "50x.html\nindex.html", "un volume neuf reçoit le contenu de l'image (copie initiale)");
	t(jeu, "docker exec v1 sh -c 'echo bonjour > /usr/share/nginx/html/mot.txt'");
	t(jeu, "docker rm -f v1");
	egal(t(jeu, "docker run --rm -v site:/d alpine:3.20 cat /d/mot.txt").split("\n").pop(), "bonjour", "le volume survit au conteneur");
	egal(t(jeu, "docker volume inspect site -f '{{.Mountpoint}}'"), "/var/lib/docker/volumes/site/_data", "volume inspect");
	egal(t(jeu, "sudo cat /var/lib/docker/volumes/site/_data/mot.txt"), "bonjour", "les données du volume, sur l'hôte");
	egal(t(jeu, "docker volume rm site"), "site", "volume rm");
	t(jeu, "docker run -d --name pg -e POSTGRES_PASSWORD=x postgres:16-alpine");
	egal(t(jeu, "docker volume ls -q | wc -l"), "1", "le VOLUME de l'image : un volume anonyme");
	t(jeu, "docker rm -fv pg");
	egal(t(jeu, "docker volume ls -q | wc -l"), "0", "rm -v : le volume anonyme part avec lui");
	tous(jeu, ["mkdir -p ~/www", "echo salut > ~/www/index.html"]);
	contient(t(jeu, "docker run --rm -v ~/www:/srv:ro alpine:3.20 touch /srv/x"), "Read-only file system", "bind :ro");
	egal(t(jeu, "docker run --rm -v ~/www:/srv alpine:3.20 cat /srv/index.html"), "salut", "bind : le dossier de l'hôte");
	contient(t(jeu, "docker run --rm --read-only alpine:3.20 touch /x"), "Read-only file system", "--read-only");
	contient(t(jeu, "docker run --rm --tmpfs /tmp --read-only alpine:3.20 touch /tmp/x ; echo fin"), "fin", "--tmpfs : un coin inscriptible");
	t(jeu, "docker network create chenal");
	t(jeu, "docker run -d --name a1 --network chenal nginx:1.27-alpine");
	contient(t(jeu, "docker run --rm --network chenal alpine:3.20 wget -qO- a1"), "Welcome to nginx", "un réseau à soi : le nom du conteneur se résout");
	t(jeu, "docker run -d --name a2 nginx:1.27-alpine");
	contient(t(jeu, "docker run --rm alpine:3.20 ping -c1 a2"), "bad address 'a2'", "le réseau bridge par défaut : pas de DNS");
	var none = t(jeu, "docker run --rm --network none alpine:3.20 ip a");
	contient(none, "1: lo:", "none : seulement lo");
	absent(none, "eth0", "none : pas d'eth0");
	contient(t(jeu, "docker network ls"), "chenal", "network ls");
	contient(t(jeu, "docker network inspect chenal -f '{{range .Containers}}{{.Name}} {{end}}'"), "a1", "network inspect");
	contient(t(jeu, "docker network rm chenal"), "has active endpoints", "un réseau occupé ne se retire pas");
	t(jeu, "docker network connect chenal a2");
	contient(t(jeu, "docker exec a2 wget -qO- a1"), "Welcome to nginx", "network connect : a2 rejoint chenal");
	contient(t(jeu, "docker run --rm --network host alpine:3.20 ip a"), "10.0.80.10", "--network host : les interfaces de l'hôte");
})();

/* ================================================================== */
/* 5. Le build                                                          */
/* ================================================================== */
(function(){
	var jeu = port();
	equipage(jeu, "docks");
	tous(jeu, ["mkdir b", "cd b"]);
	t(jeu, "printf 'FROM alpine:3.20\\nRUNN echo x\\n' > Dockerfile");
	contient(t(jeu, "docker build -t e:1 ."), "unknown instruction: RUNN (did you mean run?)", "une instruction inconnue");
	t(jeu, "printf 'FROM alpine:3.20\\nCOPY absent.txt /\\n' > Dockerfile");
	contient(t(jeu, "docker build -t e:1 ."), "\"/absent.txt\": not found", "COPY d'un fichier absent");
	t(jeu, "printf 'FROM alpine:3.20\\nRUN exit 4\\n' > Dockerfile");
	contient(t(jeu, "docker build -t e:1 ."), "did not complete successfully: exit code: 4", "un RUN qui échoue");
	t(jeu, "printf 'FROM image-inconnue:9\\n' > Dockerfile");
	contient(t(jeu, "docker build -t e:1 ."), "image-inconnue", "une image de base introuvable");
	tous(jeu, ["echo un > a.txt", "echo secret > cle.pem", "echo cle.pem > .dockerignore"]);
	t(jeu, "printf 'FROM alpine:3.20 AS outils\\nRUN echo outil > /outil\\nFROM alpine:3.20\\nARG V=1\\nENV MODE=prod\\nLABEL auteur=moi\\nWORKDIR /app\\nCOPY . .\\nCOPY --from=outils /outil /usr/local/bin/outil\\nRUN ls /app > /liste\\nUSER nobody\\nEXPOSE 8000\\nVOLUME /donnees\\nHEALTHCHECK CMD true\\nENTRYPOINT [\"cat\"]\\nCMD [\"/liste\"]\\n' > Dockerfile");
	var b1 = t(jeu, "docker build --progress=plain -t e:1 .");
	contient(b1, "[stage-1 5/5] RUN ls /app > /liste", "build --progress=plain : les étapes");
	contient(b1, "naming to", "build : l'image nommée");
	egal(b1.split("load metadata for").length, 2, "une seule ligne de métadonnées pour une image de base partagée");
	var liste = t(jeu, "docker run --rm e:1");
	contient(liste, "a.txt", "COPY . . : le contexte");
	absent(liste, "cle.pem", ".dockerignore : le fichier n'entre pas dans l'image");
	egal(t(jeu, "docker run --rm e:1 /usr/local/bin/outil"), "outil", "COPY --from : le fichier de l'autre étape");
	egal(t(jeu, "docker inspect -f '{{.Config.User}} {{.Config.WorkingDir}} {{json .Config.Labels}}' e:1"), "nobody /app {\"auteur\":\"moi\"}", "USER, WORKDIR, LABEL");
	contient(t(jeu, "docker inspect -f '{{json .Config.ExposedPorts}} {{json .Config.Volumes}}' e:1"), "\"8000/tcp\"", "EXPOSE");
	contient(t(jeu, "docker run --rm --entrypoint env e:1"), "MODE=prod", "ENV");
	var b2 = t(jeu, "docker build -t e:2 .");
	egal(b2.split("CACHED").length - 1, 5, "rien n'a changé : tout vient du cache");
	t(jeu, "echo deux >> a.txt");
	var b3 = t(jeu, "docker build -t e:3 .");
	contient(b3, "CACHED [stage-1 2/5] WORKDIR /app", "le cache : les étapes d'avant le changement");
	absent(b3, "CACHED [stage-1 3/5] COPY . .", "le cache : COPY . . refait (un fichier a changé)");
	absent(b3, "CACHED [stage-1 5/5]", "le cache : tout ce qui suit est refait");
	egal(t(jeu, "docker build --no-cache -t e:4 . | grep -c CACHED"), "0", "--no-cache");
	t(jeu, "docker build --target outils -t e:outil .");
	egal(t(jeu, "docker run --rm e:outil cat /outil"), "outil", "--target : l'étape choisie");
	contient(t(jeu, "docker history e:1"), "CMD [\"/liste\"]", "history d'une image construite");
	// L'ordre des instructions et le cache : l'appli d'école.
	tous(jeu, ["cd ~/ecole"]);
	var e1 = t(jeu, "docker build -t ecole:1.0 .");
	contient(e1, "RUN pip install -r requirements.txt", "l'école : le brouillon de l'ancien équipage");
	t(jeu, "echo '# retouche' >> app.py");
	var e2 = t(jeu, "docker build -t ecole:1.1 .");
	absent(e2, "CACHED [4/7] RUN pip install", "COPY . . avant pip : une ligne changée et pip recommence");
	t(jeu, "printf 'FROM python:3.12-slim\\nWORKDIR /app\\nCOPY requirements.txt .\\nRUN pip install --no-cache-dir -r requirements.txt\\nCOPY . .\\nCMD [\"python\", \"app.py\"]\\n' > Dockerfile");
	t(jeu, "docker build -t ecole:1.2 .");
	t(jeu, "echo '# encore' >> app.py");
	contient(t(jeu, "docker build -t ecole:1.3 ."), "CACHED [4/5] RUN pip install --no-cache-dir -r requirements.txt", "requirements d'abord : pip reste en cache");
	var bq = t(jeu, "docker build -q -t ecole:1.4 .");
	verifier(/^sha256:[0-9a-f]{64}$/.test(bq), "build -q : seulement l'identifiant");
	contient(t(jeu, "docker builder prune -f"), "Total:", "builder prune");
})();

/* ================================================================== */
/* 6. Santé, redémarrages, OOM, rotation des journaux                   */
/* ================================================================== */
(function(){
	var jeu = port();
	equipage(jeu, "docks");
	t(jeu, "docker run -d --name s1 --health-cmd 'exit 1' --health-interval 5s --health-retries 2 alpine:3.20 sleep 3600");
	tous(jeu, ["ls", "ls"]);
	contient(t(jeu, "docker ps --format '{{.Names}} {{.Status}}'"), "s1 Up", "s1 tourne");
	contient(t(jeu, "docker ps --format '{{.Status}}' --filter name=s1"), "(unhealthy)", "le bilan de santé échoue : unhealthy");
	egal(t(jeu, "docker inspect -f '{{.State.Health.Status}}' s1"), "unhealthy", "inspect : State.Health.Status");
	t(jeu, "docker run -d --name s2 --health-cmd 'true' --health-interval 5s alpine:3.20 sleep 3600");
	tous(jeu, ["ls"]);
	egal(t(jeu, "docker inspect -f '{{.State.Health.Status}}' s2"), "healthy", "healthy");
	t(jeu, "docker run -d --name r1 --restart on-failure:3 alpine:3.20 sh -c 'exit 2'");
	tous(jeu, ["ls", "ls", "ls"]);
	egal(t(jeu, "docker inspect -f '{{.RestartCount}} {{.State.Status}}' r1"), "3 exited", "on-failure:3 : trois relances, puis il reste à terre");
	t(jeu, "docker run -d --name r2 --restart unless-stopped alpine:3.20 sleep 3600");
	t(jeu, "sudo systemctl restart docker");
	contient(t(jeu, "docker ps --filter name=r2"), "Up", "unless-stopped : relancé avec le démon");
	t(jeu, "docker run -d --name m1 --memory 8m redis:7-alpine");
	tous(jeu, ["ls"]);
	egal(t(jeu, "docker inspect -f '{{.State.OOMKilled}} {{.State.ExitCode}}' m1"), "true 137", "--memory 8m : redis tué par l'OOM (137)");
	contient(t(jeu, "docker run --rm --memory 4m alpine:3.20 true"), "Minimum memory limit allowed is 6MB", "une limite trop petite");
	t(jeu, "docker run -d --name bavard --log-opt max-size=1k --log-opt max-file=2 alpine:3.20 sh -c 'while true; do echo bla; done'");
	tous(jeu, ["ls", "ls"]);
	egal(t(jeu, "docker logs bavard | tail -1"), "bla", "une boucle qui écrit : ses journaux");
	var fichiers = t(jeu, "sudo ls /var/lib/docker/containers/$(docker inspect -f '{{.Id}}' bavard)");
	contient(fichiers, "-json.log.1", "max-size, max-file : la rotation des journaux");
	absent(fichiers, "-json.log.2", "max-file=2 : pas de troisième fichier");
})();

/* ================================================================== */
/* 7. Le registre, save, l'éclaireur                                    */
/* ================================================================== */
(function(){
	var jeu = port();
	equipage(jeu, "docks"); t(jeu, "exit");
	registre(jeu);
	t(jeu, "ssh entrepot");
	contient(t(jeu, "curl -s localhost:5000/v2/_catalog"), "UNAUTHORIZED", "le registre demande un compte");
	egal(t(jeu, "curl -s -u douanier:Sel-2026 localhost:5000/v2/_catalog"), "{\"repositories\":[]}", "le catalogue, avec le compte");
	tous(jeu, ["exit", "ssh docks"]);
	t(jeu, "docker tag alpine:3.20 " + REG + "/alpine:3.20");
	contient(t(jeu, "docker push " + REG + "/alpine:3.20"), "http: server gave HTTP response to HTTPS client", "un registre sans TLS : refusé tant qu'on ne lui fait pas confiance");
	tous(jeu, ["echo '{\"insecure-registries\": [\"" + REG + "\"]}' | sudo tee /etc/docker/daemon.json", "sudo systemctl restart docker"]);
	contient(t(jeu, "docker push " + REG + "/alpine:3.20"), "no basic auth credentials", "sans docker login");
	contient(t(jeu, "echo mauvais | docker login " + REG + " -u douanier --password-stdin"), "401 Unauthorized", "login : un mauvais mot de passe");
	contient(t(jeu, "echo Sel-2026 | docker login " + REG + " -u douanier --password-stdin"), "Login Succeeded", "login");
	contient(t(jeu, "cat ~/.docker/config.json"), "\"" + REG + "\"", "login : les identifiants dans ~/.docker/config.json");
	var p = t(jeu, "docker push " + REG + "/alpine:3.20");
	contient(p, "Pushed", "push");
	var digest = /digest: (sha256:[0-9a-f]{64})/.exec(p);
	verifier(!!digest, "push : le digest");
	contient(t(jeu, "curl -s -u douanier:Sel-2026 " + REG + "/v2/_catalog"), "alpine", "le catalogue du registre");
	contient(t(jeu, "curl -s -u douanier:Sel-2026 " + REG + "/v2/alpine/tags/list"), "3.20", "les tags d'un dépôt");
	tous(jeu, ["exit", "ssh navire1", "sudo usermod -aG docker " + jeu.lire("JOUEUR"), "exit", "ssh navire1"]);
	contient(t(jeu, "docker pull " + REG + "/alpine:3.20"), "no basic auth credentials", "navire1 : sans login");
	t(jeu, "echo Sel-2026 | docker login " + REG + " -u douanier --password-stdin");
	var pl = t(jeu, "docker pull " + REG + "/alpine:3.20");
	contient(pl, "Status: Downloaded newer image for " + REG + "/alpine:3.20", "pull ailleurs");
	if (digest) contient(pl, digest[1], "le même digest des deux côtés");
	if (digest) contient(t(jeu, "docker pull " + REG + "/alpine@" + digest[1]), digest[1], "pull par digest");
	tous(jeu, ["exit", "ssh docks"]);
	t(jeu, "docker save -o al.tar alpine:3.20");
	contient(t(jeu, "tar tf al.tar"), "manifest.json", "save : une archive avec manifest.json");
	t(jeu, "tar xf al.tar manifest.json");
	contient(t(jeu, "jq '.[0].RepoTags' manifest.json"), "\"alpine:3.20\"", "jq sur le manifest de l'archive");
	t(jeu, "docker rmi " + REG + "/alpine:3.20 alpine:3.20");
	contient(t(jeu, "docker load -i al.tar"), "Loaded image: alpine:3.20", "load");
	contient(t(jeu, "docker logout " + REG), "Removing login credentials for " + REG, "logout");
	tous(jeu, ["exit", "ssh douane", "sudo usermod -aG docker " + jeu.lire("JOUEUR"), "exit", "ssh douane"]);
	// L'éclaireur : on le lit, on ne le lance jamais.
	contient(t(jeu, "docker images"), "eclaireur", "l'image de l'éclaireur est en quarantaine sur la douane");
	contient(t(jeu, "docker run --rm eclaireur:prise"), "held in quarantine", "run refusé");
	contient(t(jeu, "docker run --rm --entrypoint cat eclaireur:prise /etc/os-release"), "held in quarantine", "run refusé, même avec un autre programme");
	var cree = t(jeu, "docker create --name piece eclaireur:prise");
	verifier(/^[0-9a-f]{64}$/.test(cree), "create permis");
	contient(t(jeu, "docker start piece"), "held in quarantine", "start refusé");
	t(jeu, "docker cp piece:/usr/local/share/flotte/temoin.txt .");
	contient(t(jeu, "cat temoin.txt"), "Propriété de la flotte noire.", "cp : le fichier-témoin");
	egal(t(jeu, "docker diff piece"), "", "diff : rien n'a bougé (il n'a jamais tourné)");
	var lab = t(jeu, "docker inspect -f '{{json .Config.Labels}}' eclaireur:prise");
	contient(lab, "\"port.constructeur\":\"P.G.\"", "les Labels : le constructeur");
	contient(lab, "\"port.signature\":\"SHA256:", "les Labels : une signature (une empreinte de clé)");
	var script = t(jeu, "docker cp piece:/etc/profile.d/flotte.sh - | tar xO");
	absent(script, "docker.sock", "le script de l'éclaireur ne touche pas au socket");
	absent(script, "curl", "le script de l'éclaireur n'envoie rien");
	contient(t(jeu, "docker pull alpine:3.20"), "network is unreachable", "la douane n'a pas de route vers le continent");
	// L'empreinte de la signature : celle de la clé du bastion dans known_hosts.
	var sig = /SHA256:[A-Za-z0-9+\/]+/.exec(lab);
	tous(jeu, ["exit", "ssh docks"]);
	if (sig) contient(t(jeu, "ssh-keygen -lf /etc/ssh/ssh_known_hosts"), sig[0], "la signature de l'éclaireur est l'empreinte d'une clé connue (celle du bastion, dans le carnet de docks)");
	t(jeu, "exit");
})();

/* ================================================================== */
/* 8. compose                                                           */
/* ================================================================== */
(function(){
	var jeu = port();
	equipage(jeu, "docks");
	tous(jeu, ["cd ecole", "docker build -q -t ecole:1.0 .", "cd ../tempete"]);
	var cfg = t(jeu, "docker compose config");
	contient(cfg, "name: tempete", "config : le nom du projet (le dossier)");
	contient(cfg, "condition: service_started", "config : depends_on court, service_started");
	contient(cfg, "mem_limit: \"8388608\"", "config : mem_limit");
	var up = t(jeu, "docker compose up -d");
	contient(up, "Network tempete_default", "up : le réseau du projet");
	contient(up, "Volume \"tempete_donnees\"", "up : le volume du projet");
	contient(up, "Container tempete-web-1", "up : les conteneurs nommés projet-service-numéro");
	var ps = t(jeu, "docker compose ps");
	contient(ps, "(unhealthy)", "la première faute : pg_isready sur 5433, base unhealthy");
	contient(ps, "Restarting (137)", "la deuxième faute : mem_limit 8m, cache tué en boucle");
	egal(ps.split("\n")[1].split(/\s+/)[0], "tempete-app-1", "compose ps : trié par service");
	tous(jeu, ["sed -i 's/ -p 5433//' compose.yaml", "sed -i 's/8m/256m/' compose.yaml"]);
	t(jeu, "docker compose up -d");
	var ps2 = t(jeu, "docker compose ps");
	contient(ps2, "(healthy)", "base corrigée : healthy");
	absent(ps2, "Restarting", "cache corrigé");
	contient(t(jeu, "curl -s localhost:8088/sante"), "\"base\":\"ok\",\"cache\":\"ok\"", "la pile répond par nginx, l'appli parle à la base et au cache");
	contient(t(jeu, "docker compose exec base psql -U ecole -c 'select count(*) from inscriptions'"), "(1 row)", "compose exec");
	var top = t(jeu, "docker compose top cache");
	contient(top, "redis-server", "compose top SERVICE");
	absent(top, "postgres", "compose top SERVICE : seulement ce service");
	contient(t(jeu, "docker compose logs app"), "tempete-app-1  |", "compose logs : le préfixe du conteneur");
	t(jeu, "sed -i 's/      - app$/      app:\\n        condition: service_healthy/' compose.yaml");
	contient(t(jeu, "docker compose up -d --scale app=2 2>&1"), "tempete-app-2", "--scale");
	var down = t(jeu, "docker compose down -v");
	contient(down, "Volume tempete_donnees", "down -v : les volumes du projet");
	contient(down, "Network tempete_default", "down : le réseau");
	egal(t(jeu, "docker compose ps -a"), "NAME      IMAGE     COMMAND   SERVICE   CREATED   STATUS    PORTS", "plus rien");
	contient(t(jeu, "docker compose ls -a"), "NAME", "compose ls");
	// depends_on service_healthy : on attend la santé, et l'échec arrête la suite.
	tous(jeu, ["mkdir ~/sante", "cd ~/sante"]);
	t(jeu, "printf 'services:\\n  base:\\n    image: postgres:16-alpine\\n    environment:\\n      POSTGRES_PASSWORD: x\\n    healthcheck:\\n      test: [\"CMD-SHELL\", \"pg_isready -p 5433\"]\\n      interval: 5s\\n      retries: 2\\n  app:\\n    image: alpine:3.20\\n    command: sleep 3600\\n    depends_on:\\n      base:\\n        condition: service_healthy\\n' > compose.yaml");
	contient(t(jeu, "docker compose up -d"), "dependency failed to start: container sante-base-1 is unhealthy", "depends_on service_healthy : l'appli ne part pas");
	t(jeu, "docker compose down");
	t(jeu, "printf 'services:\\n  web:\\n    image: nginx:1.27-alpine\\n    ports: [\"${PORT_WEB:-8099}:80\"]\\n' > compose.yaml");
	contient(t(jeu, "docker compose config"), "published: \"8099\"", "interpolation : la valeur par défaut");
	t(jeu, "echo PORT_WEB=8098 > .env");
	contient(t(jeu, "docker compose config"), "published: \"8098\"", "interpolation : le fichier .env");
	t(jeu, "printf 'services:\\n  web:\\n    image: nginx:1.27-alpine\\n   ports: [\"80\"]\\n' > compose.yaml");
	contient(t(jeu, "docker compose config"), "yaml", "un YAML mal indenté");
})();

/* ================================================================== */
/* 9. L'escadre                                                         */
/* ================================================================== */
(function(){
	var jeu = port();
	equipage(jeu, "docks"); t(jeu, "exit");
	registre(jeu);
	t(jeu, "ssh docks");
	confiance(jeu);
	tous(jeu, ["cd ecole", "docker build -q -t " + REG + "/ecole:1.0 .", "docker push " + REG + "/ecole:1.0", "cd"]);
	contient(t(jeu, "docker node ls"), "This node is not a swarm manager", "node ls hors escadre");
	var init = t(jeu, "docker swarm init --advertise-addr 10.0.80.10");
	contient(init, "Swarm initialized: current node", "swarm init");
	var tok = /--token (\S+)/.exec(init)[1];
	egal(t(jeu, "docker swarm join-token -q worker"), tok, "join-token -q");
	contient(t(jeu, "docker swarm init"), "This node is already part of a swarm", "init deux fois");
	t(jeu, "exit");
	["navire1", "navire2", "navire3"].forEach(function(n){
		equipage(jeu, n);
		if (n === "navire1") contient(t(jeu, "docker swarm join --token SWMTKN-1-faux docks:2377"), "A valid join token is necessary", "un mauvais jeton");
		contient(t(jeu, "docker swarm join --token " + tok + " docks:2377"), "This node joined a swarm as a worker.", n + " rejoint l'escadre");
		if (n === "navire1") contient(t(jeu, "docker node ls"), "Worker nodes can't be used to view or modify cluster state", "un navire ne gouverne pas");
		t(jeu, "exit");
	});
	t(jeu, "ssh docks");
	var nl = t(jeu, "docker node ls");
	contient(nl, "Leader", "node ls : le gestionnaire");
	egal(nl.split("\n").filter(function(l){ return /Ready\s+Active/.test(l); }).length, 4, "node ls : quatre nœuds prêts");
	// Sans --with-registry-auth : les navires ne peuvent pas tirer l'image privée.
	t(jeu, "docker service create --name app0 --replicas 3 " + REG + "/ecole:1.0");
	contient(t(jeu, "docker service ps app0"), "No such image: " + REG.substring(0, 12), "les navires sans identifiants : No such image");
	t(jeu, "docker service rm app0");
	var cr = t(jeu, "docker service create --name app --replicas 3 --with-registry-auth -p 8000:8000 -e DB_PASSWORD=pw " + REG + "/ecole:1.0");
	contient(cr, "verify: Service app converged", "avec --with-registry-auth : la convergence");
	var ps = t(jeu, "docker service ps app");
	var noeuds = {}; ps.split("\n").slice(1).forEach(function(l){ var c = l.split(/\s+/); if (c[5] === "Running") noeuds[c[3]] = true; });
	egal(Object.keys(noeuds).length, 3, "trois répliques sur trois nœuds différents");
	contient(t(jeu, "docker service ls"), "3/3", "service ls");
	contient(t(jeu, "curl -s navire3:8000/sante"), "\"version\":\"1.0\"", "le maillage de routage : le port répond sur chaque navire");
	contient(t(jeu, "docker service scale app=5"), "app scaled to 5", "scale");
	contient(t(jeu, "docker service ls"), "5/5", "cinq répliques");
	// Secrets et réseau overlay.
	contient(t(jeu, "printf 'pw\\n' | docker secret create db_pw -"), "", "secret create");
	contient(t(jeu, "docker secret ls"), "db_pw", "secret ls");
	t(jeu, "docker network create -d overlay flotte");
	contient(t(jeu, "docker service create --name base --network flotte --secret db_pw -e POSTGRES_PASSWORD_FILE=/run/secrets/db_pw -e POSTGRES_USER=ecole -e POSTGRES_DB=ecole --constraint node.hostname==navire1 postgres:16-alpine"), "converged", "un service contraint à navire1");
	contient(t(jeu, "docker service ps base"), "navire1", "la contrainte de placement");
	contient(t(jeu, "docker secret rm db_pw"), "is in use by the following service: base", "un secret en service ne se retire pas");
	t(jeu, "docker service update --network-add flotte app");
	contient(t(jeu, "curl -s navire2:8000/sante"), "\"base\":\"ok\"", "l'overlay : le nom du service se résout depuis les tâches");
	// Mise à jour progressive, échec, retour arrière.
	contient(t(jeu, "docker service update --image " + REG + "/ecole:9.9 --update-parallelism 2 --update-failure-action rollback app"), "rolled back", "une image absente : retour arrière automatique");
	contient(t(jeu, "docker service inspect --pretty app"), "rollback_completed", "inspect --pretty : l'état de la mise à jour");
	t(jeu, "cd ecole");
	tous(jeu, ["sed -i 's/VERSION=1.0/VERSION=1.1/' app.env", "printf 'FROM " + REG + "/ecole:1.0\\nENV VERSION=1.1\\n' > Dockerfile.v11", "docker build -q -f Dockerfile.v11 -t " + REG + "/ecole:1.1 .", "docker push " + REG + "/ecole:1.1", "cd"]);
	var maj = t(jeu, "docker service update --image " + REG + "/ecole:1.1 --update-parallelism 2 --with-registry-auth app");
	contient(maj, "verify: Service app converged", "mise à jour réussie");
	contient(t(jeu, "docker service ps app --filter desired-state=running"), REG + "/ecole:1.1", "les tâches tournent la nouvelle image");
	contient(t(jeu, "curl -s navire1:8000/version"), "1.1", "la nouvelle version répond");
	contient(t(jeu, "docker service rollback app"), "rollback: manually requested rollback", "rollback");
	absent(t(jeu, "docker service ps app --filter desired-state=running"), "ecole:1.1", "après rollback : l'ancienne image");
	// Un navire sombre : ses tâches sont replacées.
	jeu.lire("perdreNoeudPort('navire2')");
	contient(t(jeu, "docker node ls"), "navire2    Down", "le navire perdu : Down");
	absent(t(jeu, "docker service ps app --filter desired-state=running"), "navire2", "plus de tâche voulue sur navire2");
	contient(t(jeu, "docker service ls"), "5/5", "les répliques replacées ailleurs");
	jeu.lire("releverNoeudPort('navire2')");
	t(jeu, "docker node update --availability drain navire3");
	absent(t(jeu, "docker service ps app --filter desired-state=running"), "navire3", "drain : navire3 vidé");
	// La mise à jour de l'automate (le monde) : détachée, un lot par tic.
	var d2 = jeu.lire("poserImagePiegeePort()");
	verifier(/^sha256:[0-9a-f]{64}$/.test(String(d2)), "poserImagePiegeePort : ecole:1.1 piégée dans le registre");
	jeu.lire("mettreAJourServicePort('app', '" + REG + "/ecole:1.1', { detache: true, parallelisme: 1 })");
	contient(t(jeu, "docker service ls"), "update in progress", "la mise à jour avance détachée");
	t(jeu, "docker service rollback app");
	absent(t(jeu, "docker service ls"), "update in progress", "le retour arrière l'arrête");
	// Une pile.
	tous(jeu, ["mkdir pile", "cd pile", "printf 'pw\\n' > mdp.txt"]);
	t(jeu, "printf 'services:\\n  web:\\n    image: nginx:1.27-alpine\\n    ports:\\n      - \"8088:80\"\\n    deploy:\\n      replicas: 2\\n      placement:\\n        constraints: [node.role == worker]\\n    networks: [mer]\\n  base:\\n    image: postgres:16-alpine\\n    environment:\\n      POSTGRES_PASSWORD_FILE: /run/secrets/db\\n    secrets: [db]\\n    networks: [mer]\\n    restart: always\\nnetworks:\\n  mer:\\n    driver: overlay\\nsecrets:\\n  db:\\n    file: ./mdp.txt\\n' > pile.yaml");
	var dep = t(jeu, "docker stack deploy -c pile.yaml escadre");
	contient(dep, "Ignoring unsupported options: restart", "stack deploy : restart ignoré");
	contient(dep, "Creating secret escadre_db", "stack deploy : le secret");
	contient(dep, "Creating service escadre_web", "stack deploy : les services");
	contient(t(jeu, "docker stack ls"), "escadre   2", "stack ls");
	absent(t(jeu, "docker stack ps escadre --filter desired-state=running"), "escadre_web.1    nginx:1.27-alpine    docks", "la contrainte node.role == worker");
	contient(t(jeu, "docker stack services escadre"), "escadre_web", "stack services");
	contient(t(jeu, "docker stack rm escadre"), "Removing network escadre_mer", "stack rm");
	t(jeu, "exit");
	t(jeu, "ssh navire1");
	contient(t(jeu, "docker swarm leave"), "Node left the swarm.", "un navire quitte l'escadre");
	t(jeu, "exit");
})();

/* ================================================================== */
/* 10. Les outils des annexes                                           */
/* ================================================================== */
(function(){
	var jeu = port();
	equipage(jeu, "docks");
	t(jeu, "docker run -d --name web nginx:1.27-alpine");
	var pid = jeu.lire("conteneurPort('docks','web').etat.pid");
	var ln = t(jeu, "sudo lsns -t net");
	contient(ln, "4026531992 net", "lsns : l'espace réseau de l'hôte");
	contient(ln, "nginx: master process", "lsns : celui du conteneur");
	contient(t(jeu, "nsenter -t " + pid + " -n ip a"), "Permission denied", "nsenter sans root");
	contient(t(jeu, "sudo nsenter -t " + pid + " -n ip a"), "eth0", "nsenter -n : le réseau du conteneur");
	egal(t(jeu, "sudo nsenter -t " + pid + " -u hostname"), jeu.lire("conteneurPort('docks','web').id.substring(0, 12)"), "nsenter -u : son nom");
	contient(t(jeu, "sudo nsenter -t " + pid + " -m cat /etc/os-release"), "Alpine Linux", "nsenter -m : ses fichiers");
	contient(t(jeu, "unshare --pid --fork bash"), "Operation not permitted", "unshare sans root");
	t(jeu, "sudo unshare --pid --fork --mount-proc bash");
	var psu = t(jeu, "ps");
	contient(psu, "      1 pts/0    00:00:00 bash", "unshare --pid : bash est le PID 1");
	egal(psu.split("\n").length, 3, "unshare --pid : ps ne voit que bash et lui-même");
	t(jeu, "exit");
	verifier(t(jeu, "ps aux").split("\n").length > 10, "après exit : de nouveau tous les processus");
	tous(jeu, ["sudo unshare --uts bash", "sudo hostname essai"]);
	egal(t(jeu, "hostname"), "essai", "unshare --uts : un nom à part");
	t(jeu, "exit");
	egal(t(jeu, "hostname"), "docks", "l'hôte garde le sien");
	contient(t(jeu, "unshare --user --map-root-user id"), "uid=0(root)", "unshare --user --map-root-user");
	tous(jeu, ["sudo ip netns add essai"]);
	egal(t(jeu, "ip netns list"), "essai", "ip netns list");
	contient(t(jeu, "sudo ip netns exec essai ip a"), "state DOWN", "un espace réseau neuf : lo éteinte");
	contient(t(jeu, "sudo ip netns exec essai ping -c1 127.0.0.1"), "Network is unreachable", "lo éteinte : même 127.0.0.1 ne répond pas");
	t(jeu, "sudo ip netns exec essai ip link set lo up");
	contient(t(jeu, "sudo ip netns exec essai ping -c1 127.0.0.1"), "1 received", "lo allumée");
	t(jeu, "sudo ip netns delete essai");
	egal(t(jeu, "ip netns list"), "", "ip netns delete");
	var sk = t(jeu, "skopeo inspect docker://continent.lan/library/alpine:3.20");
	contient(sk, "\"Digest\": \"" + t(jeu, "docker inspect -f '{{index .RepoDigests 0}}' alpine:3.20").split("@")[1] + "\"", "skopeo inspect : le même digest que docker, sans rien tirer");
	contient(t(jeu, "skopeo list-tags docker://continent.lan/library/nginx"), "1.27-alpine", "skopeo list-tags");
	t(jeu, "printf 'FROM debian:12\\nRUN apt-get update\\nRUN apt-get install -y curl\\nCMD python app.py\\n' > Dockerfile.essai");
	var hl = t(jeu, "hadolint Dockerfile.essai");
	["DL3008", "DL3009", "DL3015", "DL3059", "DL3025"].forEach(function(r){ contient(hl, r, "hadolint " + r); });
	egal(t(jeu, "echo $?"), "1", "hadolint : code 1 s'il y a des remarques");
	t(jeu, "printf 'FROM debian:12\\nRUN apt-get update && apt-get install -y --no-install-recommends curl=7.88.1-10 && rm -rf /var/lib/apt/lists/*\\nCMD [\"python\", \"app.py\"]\\n' > Dockerfile.propre");
	egal(t(jeu, "hadolint Dockerfile.propre"), "", "hadolint propre");
	egal(t(jeu, "echo $?"), "0", "hadolint propre : code 0");
	contient(t(jeu, "docker buildx ls"), "default*", "buildx ls");
	tous(jeu, ["cd ecole"]);
	contient(t(jeu, "docker buildx build --platform linux/amd64,linux/arm64 -t ecole:multi ."), "Multi-platform build is not supported for the docker driver", "buildx : le pilote docker ne sait pas");
	t(jeu, "docker buildx create --name continents --use");
	contient(t(jeu, "docker buildx ls"), "continents*", "buildx create --use");
	contient(t(jeu, "docker buildx build --platform linux/amd64,linux/arm64 -t ecole:multi ."), "No output specified with docker-container driver", "buildx sans --push : l'avertissement");
	tous(jeu, ["cd", "exit"]);
	// podman sur la chaloupe.
	t(jeu, "ssh chaloupe");
	contient(t(jeu, "docker ps"), "command not found", "pas de docker sur la chaloupe");
	contient(t(jeu, "podman run -d --name phare -p 80:80 nginx:1.27-alpine"), "rootlessport cannot expose privileged port 80", "podman sans root : pas de port sous 1024");
	var pr = t(jeu, "podman run -d --name phare -p 8080:80 nginx:1.27-alpine");
	contient(pr, "Trying to pull continent.lan/library/nginx:1.27-alpine...", "podman pull : le nom complet");
	contient(t(jeu, "podman ps"), "continent.lan/library/nginx:1.27-alpine", "podman ps");
	contient(t(jeu, "podman images"), "continent.lan/library/nginx", "podman images");
	var psa = t(jeu, "ps aux | grep 'nginx: master'");
	egal(psa.split(/\s+/)[0], jeu.lire("JOUEUR"), "sans root : le root du conteneur est le joueur sur l'hôte");
	contient(t(jeu, "ps aux | grep 'nginx: worker'"), "100100", "les autres utilisateurs du conteneur : 100000 et suivants");
	contient(t(jeu, "curl -s localhost:8080"), "Welcome to nginx", "podman : le port publié répond");
	contient(t(jeu, "podman info"), "rootless: true", "podman info");
	contient(t(jeu, "podman unshare cat /proc/self/uid_map"), "100000      65536", "podman unshare : la correspondance");
	egal(t(jeu, "podman stop phare"), "phare", "podman stop");
	egal(t(jeu, "podman rm phare"), "phare", "podman rm");
	contient(t(jeu, "podman logs nope"), "Error: No such container: nope", "podman : les erreurs à sa manière");
	t(jeu, "exit");
	// systemd-nspawn et machinectl sur la cabine.
	t(jeu, "ssh cabine");
	contient(t(jeu, "machinectl list-images"), "cabine-ancienne directory", "machinectl list-images");
	egal(t(jeu, "systemd-nspawn -D /var/lib/machines/cabine-ancienne"), "Need to be root.", "nspawn sans root");
	contient(t(jeu, "sudo systemd-nspawn -D /var/lib/machines/cabine-ancienne"), "Spawning container cabine-ancienne", "nspawn");
	egal(t(jeu, "hostname"), "cabine-ancienne", "dans la cabine : son nom");
	contient(t(jeu, "cat /etc/os-release"), "bookworm", "dans la cabine : ses fichiers");
	contient(t(jeu, "exit"), "Container cabine-ancienne exited successfully.", "nspawn : la sortie");
	egal(t(jeu, "machinectl list"), "No machines.", "machinectl list : rien");
	contient(t(jeu, "machinectl start cabine-ancienne"), "Interactive authentication required", "machinectl start sans root");
	t(jeu, "sudo machinectl start cabine-ancienne");
	contient(t(jeu, "machinectl list"), "cabine-ancienne container systemd-nspawn", "machinectl list");
	contient(t(jeu, "sudo machinectl shell cabine-ancienne"), "Connected to machine cabine-ancienne", "machinectl shell");
	contient(t(jeu, "ps aux"), "/sbin/init", "la machine démarrée : son init");
	t(jeu, "exit");
	t(jeu, "sudo machinectl poweroff cabine-ancienne");
	egal(t(jeu, "machinectl list"), "No machines.", "poweroff");
	t(jeu, "exit");
})();

/* ================================================================== */
/* 11. skopeo copy, buildx --push, manifest inspect (registre)          */
/* ================================================================== */
(function(){
	var jeu = port();
	equipage(jeu, "docks"); t(jeu, "exit");
	registre(jeu);
	t(jeu, "ssh docks");
	contient(t(jeu, "skopeo copy docker://continent.lan/library/busybox:1.36 docker://" + REG + "/busybox:1.36"), "http: server gave HTTP response to HTTPS client", "skopeo copy : TLS par défaut");
	contient(t(jeu, "skopeo copy --dest-tls-verify=false docker://continent.lan/library/busybox:1.36 docker://" + REG + "/busybox:1.36"), "authentication required", "skopeo copy : sans compte");
	contient(t(jeu, "skopeo copy --dest-tls-verify=false --dest-creds douanier:Sel-2026 docker://continent.lan/library/busybox:1.36 docker://" + REG + "/busybox:1.36"), "Writing manifest to image destination", "skopeo copy d'un registre à l'autre");
	contient(t(jeu, "skopeo list-tags --tls-verify=false --creds douanier:Sel-2026 docker://" + REG + "/busybox"), "1.36", "skopeo list-tags sur l'entrepôt");
	confiance(jeu);
	tous(jeu, ["cd ecole", "docker buildx create --name continents --use"]);
	contient(t(jeu, "docker buildx build --platform linux/amd64,linux/arm64 -t " + REG + "/ecole:multi --push ."), "pushing manifest for", "buildx --push : une liste de manifestes");
	contient(t(jeu, "docker manifest inspect " + REG + "/ecole:multi"), "http: server gave HTTP response to HTTPS client", "manifest inspect sans --insecure");
	var mi = t(jeu, "docker manifest inspect --insecure " + REG + "/ecole:multi");
	contient(mi, "\"architecture\": \"amd64\"", "manifest inspect : amd64");
	contient(mi, "\"architecture\": \"arm64\"", "manifest inspect : arm64");
	tous(jeu, ["cd", "exit", "ssh navire1", "sudo usermod -aG docker " + jeu.lire("JOUEUR"), "exit", "ssh navire1", "echo Sel-2026 | docker login " + REG + " -u douanier --password-stdin"]);
	contient(t(jeu, "docker pull " + REG + "/ecole:multi"), "Status: Downloaded newer image", "un navire tire la variante de sa plateforme");
	t(jeu, "exit");
})();

console.log(ok + " vérifications, " + ko + " échec" + (ko > 1 ? "s" : ""));
if (ko) process.exitCode = 1;
