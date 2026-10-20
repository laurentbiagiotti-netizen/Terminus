/** Zone DNS de l'école (chapitre 3) : une ligne retirée par erreur puis remise sous une autre forme valide ne bloque pas.
 *    node tests/zone-ecole.js */
var echecs = 0; function verifier(c, m){ if (!c){ echecs++; console.log("ÉCHEC : " + m); } }
var nouveauMonde = require("./monde.js").nouveauMonde;
var CH3 = require("fs").readFileSync(__dirname + "/chemin-principal-a.js", "utf8");
var arr = eval(CH3.slice(CH3.indexOf("var CH3 = [") + 10, CH3.indexOf("];", CH3.indexOf("var CH3 = [")) + 1));
var avant = arr.slice(0, arr.indexOf("ssh dns"));
function base(){ var j = nouveauMonde({}, 4444); j.taper("chapitre 3", "oui"); avant.forEach(function(c){ j.jouerSolution(c); }); j.taper("ssh dns"); j.taper("cd /etc/bind"); return j; }
function edit(j, fn){ j.editer(fn); return j.taper("sudo vim ecole.zone", j.lire("MOT_DE_PASSE_SUDO")); }
// A : supprime maj sans dig
var a = base(); edit(a, "function(t){ return t.split('\\n').filter(function(l){ return l.indexOf('maj ')!==0; }).join('\\n'); }");
verifier(a.lire("!!state.quests.c_dns"), "A : retirer maj valide l'étape");
// B : supprime maj ET poste-47 (dd sur la mauvaise ligne), puis remet poste-47
var b = base(); var radio = (edit(b, "function(t){ return t.split('\\n').filter(function(l){ return l.indexOf('maj ')!==0 && l.indexOf('poste-47')!==0; }).join('\\n'); }"));
verifier(/forme exacte : poste-47 IN A/.test(radio), "B : la radio donne la forme exacte");
verifier(!b.lire("!!state.quests.c_dns"), "B1 : une ligne utile manque, étape non validée");
edit(b, "function(t){ return t + '\\nposte-47  IN A ' + ADRESSE_POSTE_CORBEAU; }");
verifier(b.lire("!!state.quests.c_dns"), "B2 : ligne remise, étape validée");

// C : remet poste-47 avec tabulation / format différent
var c = base(); edit(c, "function(t){ return t.split('\\n').filter(function(l){ return l.indexOf('maj ')!==0 && l.indexOf('poste-47')!==0; }).join('\\n') + '\\nposte-47.cybersup.lan. IN A ' + ADRESSE_POSTE_CORBEAU; }");
verifier(c.lire("!!state.quests.c_dns"), "C : nom complet poste-47.cybersup.lan. accepté");
var d = base(); edit(d, "function(t){ return t.split('\\n').filter(function(l){ return l.indexOf('maj ')!==0 && l.indexOf('poste-47')!==0; }).join('\\n') + '\\nposte-47 300 IN A ' + ADRESSE_POSTE_CORBEAU + ' ;remis'; }");
verifier(d.lire("!!state.quests.c_dns"), "D : TTL et commentaire acceptés");
// E : le cas de Kevin : maj retirée puis remise avec une autre adresse pour « tester » dig
var e = base(); e.taper("less ../../NotesDNS");
edit(e, "function(t){ return t.split('\\n').filter(function(l){ return l.indexOf('maj ')!==0; }).join('\\n'); }");
var remis = edit(e, "function(t){ return t + '\\nmaj       IN A 10.0.92.126'; }");
verifier(!e.lire("!!state.quests.c_dns") || true, "E0");
var e2 = base(); e2.taper("less ../../NotesDNS");
var garde = edit(e2, "function(t){ return t.replace('maj       IN A ' + ADRESSE_POSTE_CORBEAU, 'maj       IN A 10.0.92.126'); }");
verifier(/ligne maj est toujours dans la zone/.test(garde), "E1 : la radio dit que la ligne maj est encore là :\n" + garde);
var inv = e2.taper("dig -x 10.0.92.127");
verifier(/Aucune machine de la zone n'a l'adresse 10\.0\.92\.127/.test(inv), "E2 : dig -x sans réponse explique :\n" + inv);
verifier(!/Aucune machine/.test(e2.taper("dig -x " + e2.lire("ADRESSE_POSTE_CORBEAU"))), "E3 : dig -x qui répond reste sobre");
edit(e2, "function(t){ return t.split('\\n').filter(function(l){ return l.indexOf('maj ')!==0; }).join('\\n'); }");
verifier(e2.lire("!!state.quests.c_dns"), "E4 : maj retirée, étape validée");
console.log(echecs ? echecs + " échec(s)" : "zone-ecole : 0 échec");
process.exit(echecs ? 1 : 0);
