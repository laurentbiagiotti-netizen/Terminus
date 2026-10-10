/**
 * Un lieu du monde, c'est-a-dire un repertoire.
 * Les sorts eux-memes (ls, cd, mv...) vivent dans Shell.js.
 */
function Room(roomname, introtext, roompic){
	this.parents = [];
	this.children = new Array();
	this.items = new Array();
	// Verrous d'histoire : un lieu sans "cd" dans cette liste ne se laisse pas
	// traverser, et affiche cmd_text["cd"] a la place (la Boite, la Cage...).
	this.commands = ["cd", "ls"];
	this.room_name = (typeof roomname === 'undefined') ? "LieuQuelconque": roomname;
	this.room_pic = (typeof roompic === 'undefined') ? "./static/img/none.gif": "./static/img/" + roompic;
	this.intro_text = (typeof introtext === 'undefined') ? "Un lieu tout simple.": introtext;
	this.cmd_text = {};
	// Permissions facon Linux. Le "t" final (sticky bit) dit : tout le monde peut
	// creer ici, mais on ne supprime et ne deplace que ce qui nous appartient.
	this.owner = "terminus";
	this.mode = "rwxrwxrwt";
	// Un lieu ferme mais "atteignable" laisse agir sur son contenu depuis l'exterieur :
	// on ne rentre pas dans la Cage, mais mv Cage/Enfant . fonctionne.
	this.atteignable = false;
	this.deny_text = null;   // petit indice affiche quand les permissions refusent l'entree
	this.procs = [];         // processus qui tournent dans ce lieu (voir ps et kill)
	//for event handling
	this.ev = new EventTarget();
	this.id = World.fige ? null : identifiantMonde("r", this.room_name);
	if (this.id) World.rooms[this.id] = this;
};

Room.prototype.toString = function(){
	return this.room_name;
};

Room.prototype.changeIntroText = function(new_text){
	this.intro_text = new_text;
};

Room.prototype.addItem = function(newitem) {
	if (typeof newitem != 'undefined' && this.items.indexOf(newitem) === -1){
		this.items[this.items.length] = newitem;
	}
	return newitem;
};

Room.prototype.removeItem = function(itemnametoremove){
	var index = (typeof itemnametoremove === "string") ?
		this.itemStringArray().indexOf(itemnametoremove) : this.items.indexOf(itemnametoremove);
	if (index != -1){
		return this.items.splice(index, 1)[0];
	}
	return null;
};

Room.prototype.hasItem = function(item){
	return this.items.indexOf(item) > -1;
};

Room.prototype.itemStringArray = function(){
	var itemstrarray = [];
	for (var i = 0; i < this.items.length; i++){
		itemstrarray[itemstrarray.length] = this.items[i].toString();
	}
	return itemstrarray;
};

Room.prototype.childStringArray = function(){
	var childstrarray = [];
	for (var i = 0; i < this.children.length; i++){
		childstrarray[childstrarray.length] = this.children[i].toString();
	}
	return childstrarray;
};
Room.prototype.childrenStringArray = Room.prototype.childStringArray;

Room.prototype.getItemFromName = function(itemname){
	var itemindex = this.itemStringArray().indexOf(itemname);
	if (itemindex > -1)
		return this.items[itemindex];
	return -1;
};

Room.prototype.getChildFromName = function(childname){
	var childindex = this.childStringArray().indexOf(childname);
	if (childindex > -1)
		return this.children[childindex];
	return -1;
};

/* Renvoie le lieu ou l'objet portant ce nom ici, ou null. */
Room.prototype.getNode = function(name){
	var child = this.getChildFromName(name);
	if (child !== -1) return child;
	var item = this.getItemFromName(name);
	if (item !== -1) return item;
	return null;
};

/* Meme recherche sans tenir compte des majuscules : sert aux messages d'aide. */
Room.prototype.getNodeIgnoringCase = function(name){
	var cible = name.toLowerCase();
	for (var i = 0; i < this.children.length; i++){
		if (this.children[i].room_name.toLowerCase() === cible) return this.children[i];
	}
	for (var j = 0; j < this.items.length; j++){
		if (this.items[j].itemname.toLowerCase() === cible) return this.items[j];
	}
	return null;
};

Room.prototype.addChild = function(newchild){
	if (typeof newchild != 'undefined' && this.children.indexOf(newchild) === -1){
		this.children[this.children.length] = newchild;
	}
};

Room.prototype.removeChild = function(child){
	var index = this.children.indexOf(child);
	if (index != -1){
		this.children.splice(index, 1);
	}
};

Room.prototype.addParent = function(parent){
	this.parents[0] = parent;
};

Room.prototype.addCommand = function(cmd){
	if (this.commands.indexOf(cmd) === -1) this.commands[this.commands.length] = cmd;
};

Room.prototype.removeCommand = function(cmd){
	var index = this.commands.indexOf(cmd);
	if (index != -1){
		this.commands.splice(index, 1);
	}
};

Room.prototype.addCmdText = function(cmd, text) {
	this.cmd_text[cmd] = text;
};

Room.prototype.removeCmdText = function(cmd){
	delete this.cmd_text[cmd];
};

Room.prototype.isHidden = function(){
	return this.room_name.charAt(0) === ".";
};

/* Chemin complet depuis la Maison, note ~ comme dans un vrai terminal. */
Room.prototype.path = function(){
	var morceaux = [];
	var lieu = this;
	var garde = 0;
	while (lieu && lieu.parents.length > 0 && garde++ < 100){
		morceaux.unshift(lieu.room_name);
		lieu = lieu.parents[0];
	}
	return morceaux.length ? "~/" + morceaux.join("/") : "~";
};

Room.prototype.addProc = function(pid, name, owner, options){
	var proc = { pid: pid, name: name, owner: owner };
	options = options || {};
	for (var cle in options){
		if (options.hasOwnProperty(cle)) proc[cle] = options[cle];
	}
	this.procs.push(proc);
	return proc;
};

Room.prototype.getProc = function(pid){
	for (var i = 0; i < this.procs.length; i++){
		if (this.procs[i].pid === pid) return this.procs[i];
	}
	return null;
};

Room.prototype.hasProcNamed = function(name){
	for (var i = 0; i < this.procs.length; i++){
		if (this.procs[i].name === name) return true;
	}
	return false;
};

Room.prototype.droits = function(mode, owner){
	this.mode = mode;
	if (owner) this.owner = owner;
	return this;
};

/* Affiche une image dans le panneau de droite. */
function montrerImage(src, legende){
	if (typeof document === "undefined") return;
	var scene = document.getElementById("scene");
	if (scene) scene.setAttribute("src", src);
	var texte = document.getElementById("legende");
	if (texte) texte.textContent = legende || "";
}
