"""Dessine les habitants des quêtes annexes des chapitres 2 à 5, dans le style des personnages du jeu
(dessiner_panne.py, dessiner_machines.py) : gros pixels, tête carrée, yeux carrés, sol en tirets, trois couleurs.

Chaque habitant porte l'objet de son métier : le classeur de la Gestionnaire, le talkie de l'Appariteur...
Sortie : Web/static/img/item_<habitant>.gif.   python3 outils/dessiner_habitants.py [item_x.gif ...]
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from dessiner_lieux import N, V, B  # noqa: E402
from dessiner_academie import robe_mage, bras, jambes, pieds_robe  # noqa: E402
from dessiner_panne import perso, sol_tirets  # noqa: E402
from dessiner_bastion import tete, cle  # noqa: E402
from dessiner_machines import for_lignes  # noqa: E402


def gilet(r, c=V, fond=B):
    r(35, 33, 52, 54, fond); r(35, 33, 39, 54, c); r(48, 33, 52, 54, c)


# --- chapitre 2 : le campus ---

def gestionnaire_dessin(r):
    # la gestionnaire du parc : gilet fluo à bandes, un classeur sous le bras, un stylo
    tete(r, 12, V)
    r(35, 33, 52, 54, V); r(35, 40, 52, 41, B); r(35, 47, 52, 48, B)
    bras(r, True, True, 36)
    r(16, 38, 30, 56, B); r(17, 39, 29, 55, N); r(18, 40, 19, 54, V); for_lignes(r, 21, 42, 28, 54, B)
    r(58, 40, 59, 50, V); r(58, 50, 59, 51, B)
    jambes(r); sol_tirets(r, 68)


def appariteur_dessin(r):
    # l'appariteur : blouse grise, un talkie-walkie à antenne
    tete(r, 12, B)
    robe_mage(r, 33, 64, B, 35, 52); r(42, 33, 45, 54, N); r(43, 36, 44, 37, V); r(43, 42, 44, 43, V)
    bras(r, True, True, 36)
    r(57, 38, 63, 52, V); r(58, 40, 62, 44, N); r(59, 46, 61, 50, N); r(61, 28, 62, 38, V)
    pieds_robe(r); sol_tirets(r, 68)


def documentaliste_dessin(r):
    # la documentaliste : lunettes relevées, un carnet hérissé de post-it
    tete(r, 12, V); r(37, 10, 51, 11, N); r(38, 9, 43, 9, B); r(45, 9, 50, 9, B)
    robe_mage(r, 33, 64, V, 35, 52)
    bras(r, True, True, 36)
    r(16, 40, 30, 56, B); r(17, 41, 29, 55, N); for_lignes(r, 19, 43, 27, 54, B)
    for k in range(4): r(30, 41 + k * 4, 33, 42 + k * 4, V if k % 2 else B)
    pieds_robe(r); sol_tirets(r, 68)


def coursier_dessin(r):
    # le coursier : un casque de vélo à la main, un cuissard, un colis sur le dos
    tete(r, 12, B)
    r(35, 33, 52, 54, V); r(38, 36, 49, 52, N); r(40, 38, 47, 50, B); r(43, 38, 44, 50, N)
    bras(r, True, True, 36)
    r(56, 46, 68, 52, B); r(57, 47, 67, 49, V); r(58, 50, 60, 52, N); r(64, 50, 66, 52, N)
    jambes(r, B); sol_tirets(r, 68)


def bibliothecaire_dessin(r):
    # la bibliothécaire : un chignon, un tampon dateur, une pile de livres
    r(41, 4, 46, 10, B); tete(r, 12, B, lunettes=True)
    robe_mage(r, 33, 64, V, 35, 52)
    bras(r, True, True, 36)
    for k in range(4): r(15, 54 - k * 4, 29 - (k % 2) * 3, 57 - k * 4, B if k % 2 else V)
    r(58, 40, 61, 48, B); r(56, 48, 63, 51, V)
    pieds_robe(r); sol_tirets(r, 68)


def tutrice_dessin(r):
    # la tutrice : queue de cheval, un cahier ouvert, un crayon
    tete(r, 12, V); r(51, 12, 54, 14, V); r(53, 14, 55, 26, V)
    r(35, 33, 52, 54, B); r(38, 35, 49, 54, V)
    bras(r, True, True, 36)
    r(14, 42, 30, 54, B); r(22, 42, 22, 54, N); for_lignes(r, 16, 44, 20, 53, N); for_lignes(r, 24, 44, 28, 53, N)
    r(58, 34, 59, 46, V); r(58, 46, 59, 47, B)
    jambes(r); sol_tirets(r, 68)


# --- chapitre 3 : la Crypte ---

def enlumineur_dessin(r):
    # l'enlumineur : une tonsure, une plume, une page enluminée
    tete(r, 12, B); r(36, 12, 38, 18, V); r(49, 12, 51, 18, V)
    robe_mage(r, 33, 64, V, 35, 52); r(37, 44, 50, 45, N)
    bras(r, True, True, 36)
    r(14, 38, 30, 58, B); r(16, 40, 28, 56, N); r(18, 42, 26, 50, V); r(20, 44, 24, 48, B)
    r(60, 26, 61, 46, B); r(61, 26, 64, 34, V)
    pieds_robe(r); sol_tirets(r, 68)


def fossoyeur_dessin(r):
    # le fossoyeur : un chapeau mou, une pelle
    r(33, 9, 54, 11, V); r(37, 4, 50, 9, V); tete(r, 12, V)
    robe_mage(r, 33, 64, B, 35, 52); r(37, 50, 50, 51, V)
    bras(r, True, True, 36)
    r(62, 8, 63, 54, B); r(59, 54, 66, 64, V); r(60, 56, 65, 62, N); r(60, 6, 65, 8, B)
    pieds_robe(r); sol_tirets(r, 68)


def sonneur_dessin(r):
    # le sonneur : une corde de cloche, une petite cloche à la main
    tete(r, 12, B)
    robe_mage(r, 33, 64, V, 35, 52)
    bras(r, True, True, 36)
    r(20, 0, 21, 44, B); r(18, 44, 23, 47, V)
    r(58, 42, 66, 44, V); r(57, 44, 67, 52, V); r(59, 46, 65, 50, N); r(61, 52, 63, 54, B)
    pieds_robe(r); sol_tirets(r, 68)


def sacristain_dessin(r):
    # le sacristain : un sablier, un cierge
    tete(r, 12, V, barbe=True)
    robe_mage(r, 33, 64, B, 35, 52); r(42, 33, 45, 64, N)
    bras(r, True, True, 36)
    r(15, 40, 29, 42, V); r(15, 56, 29, 58, V); r(17, 42, 27, 48, B); r(21, 48, 23, 50, B); r(17, 50, 27, 56, B); r(19, 52, 25, 55, V)
    r(59, 34, 62, 50, B); r(60, 30, 61, 33, V)
    pieds_robe(r); sol_tirets(r, 68)


def passeur_dessin(r):
    # le passeur : une cape de pluie à capuche, une lanterne, une clé
    r(33, 8, 54, 34, V); r(31, 12, 56, 30, V); tete(r, 13, V)
    robe_mage(r, 33, 64, V, 34, 53)
    bras(r, True, True, 36)
    r(14, 36, 26, 38, B); r(15, 38, 25, 52, B); r(17, 40, 23, 50, N); r(19, 42, 21, 48, V); r(19, 32, 21, 36, B)
    cle(r, 58, 44, B)
    pieds_robe(r); sol_tirets(r, 68)


def serrurier_dessin(r):
    # le serrurier : trapu, un tablier, une lime et un cadenas
    tete(r, 12, B)
    r(33, 33, 54, 54, B); r(36, 35, 51, 56, V)
    bras(r, True, True, 36)
    r(60, 30, 61, 50, B); for_lignes(r, 59, 31, 62, 48, N)
    r(16, 44, 28, 56, B); r(18, 46, 26, 54, N); r(20, 38, 24, 44, B); r(21, 39, 23, 44, N); r(21, 48, 23, 51, V)
    jambes(r); sol_tirets(r, 68)


# --- chapitre 4 : l'Académie ---

def copiste_dessin(r):
    # le copiste : manches tachées d'encre, un encrier, un grimoire
    tete(r, 12, B, lunettes=True)
    robe_mage(r, 33, 64, V, 35, 52)
    bras(r, True, True, 36); r(30, 45, 33, 48, N); r(54, 45, 57, 48, N)
    r(14, 40, 30, 56, B); r(16, 42, 28, 54, V); r(21, 42, 22, 54, N)
    r(58, 50, 64, 56, B); r(59, 51, 63, 55, N); r(63, 40, 64, 50, V)
    pieds_robe(r); sol_tirets(r, 68)


def secretaire_dessin(r):
    # la secrétaire : un tampon dans chaque main, des formulaires
    r(38, 7, 49, 11, V); tete(r, 12, V)
    r(35, 33, 52, 54, B); r(40, 33, 47, 40, V)
    bras(r, True, True, 36)
    for x in (24, 60): r(x, 44, x + 5, 47, V); r(x + 2, 40, x + 3, 44, B)
    r(14, 50, 28, 60, B); for_lignes(r, 16, 52, 26, 59, N)
    jambes(r); sol_tirets(r, 68)


def tresorier_dessin(r):
    # le trésorier : rond, lunettes au bout du nez, une balance
    tete(r, 12, B, lunettes=True)
    r(32, 33, 55, 54, V); r(36, 37, 51, 52, B)
    bras(r, True, True, 36)
    r(62, 32, 63, 54, B); r(54, 34, 71, 35, B); r(52, 36, 58, 40, V); r(67, 36, 73, 40, V)
    for k in range(4): r(16 + k * 3, 54 - k * 3, 26 + k * 3, 56 - k * 3, B)
    jambes(r); sol_tirets(r, 68)


def apprentie_dessin(r):
    # l'apprentie : un chapeau pointu trop grand, une baguette à étoile
    for k in range(10): r(43 - k, 1 + k, 44 + k, 1 + k, V)
    r(30, 11, 57, 12, V); tete(r, 13, V)
    robe_mage(r, 34, 64, B, 34, 53)
    bras(r, True, True, 37)
    r(59, 26, 60, 46, B); r(57, 22, 62, 26, V); r(59, 20, 60, 28, V)
    pieds_robe(r); sol_tirets(r, 68)


def messagere_dessin(r):
    # la messagère : un pigeon sur l'épaule, un tube de message
    tete(r, 12, V)
    robe_mage(r, 33, 64, V, 35, 52); r(37, 40, 50, 41, B)
    bras(r, True, True, 36)
    r(53, 24, 61, 31, B); r(59, 22, 63, 26, B); r(61, 23, 62, 24, N); r(63, 24, 65, 25, V); r(52, 28, 54, 31, V)
    r(16, 44, 30, 49, B); r(18, 45, 28, 48, N); r(14, 43, 16, 50, V); r(30, 43, 32, 50, V)
    pieds_robe(r); sol_tirets(r, 68)


def surveillante_dessin(r):
    # la surveillante : un trousseau à la ceinture, un registre épais
    r(37, 8, 50, 12, B); tete(r, 12, B)
    robe_mage(r, 33, 64, V, 35, 52); r(35, 46, 52, 47, B)
    bras(r, True, True, 36)
    cle(r, 46, 48, B); cle(r, 50, 50, N)
    r(14, 38, 30, 58, B); r(15, 39, 29, 57, N); r(17, 41, 27, 55, V); r(17, 47, 27, 48, N)
    pieds_robe(r); sol_tirets(r, 68)


# --- chapitre 5 : le Bastion ---

def colporteur_dessin(r):
    # le colporteur : poussiéreux, une besace de lettres en bandoulière
    r(34, 9, 53, 11, B); r(38, 5, 49, 9, B); tete(r, 12, B, barbe=True)
    r(35, 33, 52, 54, V)
    for k in range(7): r(36 + k * 2, 34 + k * 3, 38 + k * 2, 36 + k * 3, B)
    bras(r, True, True, 36)
    r(50, 50, 66, 62, B); r(52, 52, 64, 60, N); r(54, 53, 62, 56, V)
    jambes(r); sol_tirets(r, 68)


def sergent_dessin(r):
    # le sergent : un casque à nasal, un clairon
    r(36, 7, 51, 13, V); r(43, 13, 44, 20, V); tete(r, 13, V)
    r(35, 34, 52, 54, B); r(35, 34, 52, 36, V); r(42, 37, 45, 54, V)
    bras(r, True, True, 37)
    r(57, 40, 66, 41, V); r(66, 36, 70, 45, V); r(67, 38, 69, 43, N)
    jambes(r); sol_tirets(r, 68)


def sentinelle_dessin(r):
    # la sentinelle : une cotte de mailles, une lance, les yeux cernés
    tete(r, 12, B); r(38, 21, 43, 21, V); r(45, 21, 50, 21, V)
    r(35, 33, 52, 54, V)
    for y in range(35, 54, 3):
        for x in range(37 + (y % 2), 51, 3): r(x, y, x, y, N)
    bras(r, True, True, 36)
    r(62, 2, 63, 66, B); r(60, 0, 65, 6, V)
    jambes(r); sol_tirets(r, 68)


def greffier_dessin(r):
    # le greffier : une plume derrière l'oreille, un long registre déroulé
    tete(r, 12, V, lunettes=True); r(51, 6, 52, 18, B)
    robe_mage(r, 33, 64, B, 35, 52); r(42, 33, 45, 64, V)
    bras(r, True, True, 36)
    r(14, 36, 29, 39, V); r(16, 39, 27, 64, B); for_lignes(r, 18, 41, 25, 62, N); r(14, 62, 29, 65, V)
    pieds_robe(r); sol_tirets(r, 68)


def cantiniere_dessin(r):
    # la cantinière : un tablier taché, une louche, une petite marmite
    r(37, 8, 50, 12, B); tete(r, 12, B)
    r(33, 33, 54, 56, V); r(36, 36, 51, 58, B); r(40, 44, 41, 45, V); r(46, 50, 48, 51, V)
    bras(r, True, True, 36)
    r(60, 28, 61, 46, B); r(57, 46, 64, 50, B)
    r(14, 48, 30, 60, B); r(16, 50, 28, 58, N); r(12, 50, 14, 52, B); r(30, 50, 32, 52, B)
    jambes(r); sol_tirets(r, 68)


def heraut_dessin(r):
    # le héraut : un tabard frappé d'un sceau, une trompette à bannière
    r(36, 8, 51, 12, V); tete(r, 12, V)
    r(35, 33, 52, 56, B); r(38, 35, 49, 56, V); r(41, 40, 46, 47, B); r(42, 41, 45, 46, N); r(43, 42, 44, 45, V)
    bras(r, True, True, 36)
    r(57, 38, 70, 39, V); r(70, 34, 74, 43, V); r(60, 40, 67, 48, B); r(61, 41, 66, 47, N); r(63, 43, 64, 45, V)
    jambes(r); sol_tirets(r, 68)


PORTRAITS = {
    "item_gestionnaire.gif": gestionnaire_dessin, "item_appariteur.gif": appariteur_dessin,
    "item_documentaliste.gif": documentaliste_dessin, "item_coursier.gif": coursier_dessin,
    "item_bibliothecaire.gif": bibliothecaire_dessin, "item_tutrice.gif": tutrice_dessin,
    "item_enlumineur.gif": enlumineur_dessin, "item_fossoyeur.gif": fossoyeur_dessin,
    "item_sonneur.gif": sonneur_dessin, "item_sacristain.gif": sacristain_dessin,
    "item_passeur.gif": passeur_dessin, "item_serrurier.gif": serrurier_dessin,
    "item_copiste.gif": copiste_dessin, "item_secretaire.gif": secretaire_dessin,
    "item_tresorier.gif": tresorier_dessin, "item_apprentie.gif": apprentie_dessin,
    "item_messagere.gif": messagere_dessin, "item_surveillante.gif": surveillante_dessin,
    "item_colporteur.gif": colporteur_dessin, "item_sergent.gif": sergent_dessin,
    "item_sentinelle.gif": sentinelle_dessin, "item_greffier.gif": greffier_dessin,
    "item_cantiniere.gif": cantiniere_dessin, "item_heraut.gif": heraut_dessin,
}

if __name__ == "__main__":
    noms = sys.argv[1:] or list(PORTRAITS)
    n = 0
    for nom in noms:
        if nom in PORTRAITS:
            perso(nom, PORTRAITS[nom]); n += 1
    print(n, "portraits")
