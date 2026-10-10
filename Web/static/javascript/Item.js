/**
 * Registre du monde : chaque lieu et chaque objet cree au chargement recoit un
 * identifiant stable, ce qui permet de sauvegarder puis de restaurer la partie.
 * Ce que le joueur fabrique ensuite (touch, mkdir, cp...) n'a pas d'identifiant
 * et est sauvegarde tel quel.
 */
var World = { rooms: {}, items: {}, compteurs: {}, fige: false };

function identifiantMonde(prefixe, nom){
	var cle = prefixe + ":" + nom;
	World.compteurs[cle] = (World.compteurs[cle] || 0) + 1;
	return World.compteurs[cle] === 1 ? cle : cle + "#" + World.compteurs[cle];
}

/* JOUEUR, l'identifiant du joueur sur le systeme, est defini dans Partie.js. */

function Item(name, text, picname){
	this.itemname = name;
	this.picturename = (typeof picname === 'undefined') ? "./static/img/none.gif" : "./static/img/" + picname;
	this.cmd_text = (typeof text === 'undefined') ? {"less": "Un objet tout à fait ordinaire."} : {"less": text};
	// Sorts autorises sur cet objet en plus de la lecture : "mv", "rm", "cp", "sudo-rm".
	this.valid_cmds = ["less"];
	// Permissions facon Linux : proprietaire + droits rwx (utilisateur, groupe, autres).
	this.owner = "terminus";
	this.mode = "rw-r--r--";
	this.person = false;     // un personnage : on lui parle, on ne le range pas dans un carton
	this.teaches = [];       // sorts appris en lisant cet objet
	this.reveals = [];       // quetes secondaires decouvertes en lisant cet objet
	this.modifie = false;    // le texte a-t-il change depuis le debut de la partie ?
	this.id = World.fige ? null : identifiantMonde("i", name);
	if (this.id) World.items[this.id] = this;
};

Item.prototype.addCmdText = function(cmd, text) {
	this.cmd_text[cmd] = text;
};

Item.prototype.addValidCmd = function(cmd){
	if (this.valid_cmds.indexOf(cmd) === -1) this.valid_cmds[this.valid_cmds.length] = cmd;
	return this;
};

Item.prototype.allows = function(cmd){
	return this.valid_cmds.indexOf(cmd) > -1;
};

Item.prototype.toString = function(){
	return this.itemname;
};

Item.prototype.changePicName = function(newpicname){
	this.picturename = "./static/img/" + newpicname;
};

Item.prototype.getText = function(){
	return this.cmd_text["less"];
};

Item.prototype.setText = function(text){
	this.cmd_text["less"] = text;
	this.modifie = true;
};

Item.prototype.isHidden = function(){
	return this.itemname.charAt(0) === ".";
};

/* Petits raccourcis d'ecriture pour GameObjects.js */
Item.prototype.personnage = function(){ this.person = true; return this; };
Item.prototype.enseigne = function(){
	for (var i = 0; i < arguments.length; i++) this.teaches.push(arguments[i]);
	return this;
};
Item.prototype.revele = function(){
	for (var i = 0; i < arguments.length; i++) this.reveals.push(arguments[i]);
	return this;
};
Item.prototype.droits = function(mode, owner){
	this.mode = mode;
	if (owner) this.owner = owner;
	return this;
};
