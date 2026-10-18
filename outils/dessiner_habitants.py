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
from decor_arcanes import robe_plis, manches, ceinture, perso_fini  # noqa: E402
from dessiner_panne import yeux  # noqa: E402
import math  # noqa: E402


def gilet(r, c=V, fond=B):
    r(35, 33, 52, 54, fond); r(35, 33, 39, 54, c); r(48, 33, 52, 54, c)


def robe_eclairee(r, haut=33, bas=64, x0=35, x1=52, plis=True):
    """La lumière vient de la gauche : un liseré blanc sur le bord gauche d'une robe de mage (robe_mage),
    deux plis noirs dans le bas, un ourlet."""
    for k, y in enumerate(range(haut, bas + 1)):
        e = k // 6
        r(x0 - e, y, x0 - e, y, B)
    if plis:
        r(40, bas - 12, 40, bas, N); r(47, bas - 10, 47, bas, N)
    r(x0 - (bas - haut) // 6, bas, x1 + (bas - haut) // 6, bas, N)


def buste_eclaire(r, x0=35, x1=52, y0=33, y1=54):
    """Le liseré blanc à gauche d'un buste, et l'ombre d'un pli à droite."""
    r(x0, y0, x0, y1, B); r(x1, y0 + 4, x1, y1, N)


def chaussures(r, c=B):
    """Des chaussures à semelle sous des jambes (jambes de dessiner_academie)."""
    r(36, 66, 42, 66, c); r(45, 66, 51, 66, c)


# --- chapitre 2 : le campus ---

def gestionnaire_dessin(r):
    # la gestionnaire du parc : chignon, gilet fluo à bandes réfléchissantes, badge, un classeur sous le bras, un stylo
    r(40, 7, 47, 11, V); r(42, 5, 45, 7, V)
    tete(r, 12, V)
    r(35, 33, 52, 54, V); r(35, 40, 52, 41, B); r(35, 47, 52, 48, B); buste_eclaire(r)
    r(42, 33, 45, 54, N); r(43, 34, 44, 54, B)
    r(47, 35, 50, 38, B); r(48, 36, 49, 37, N)                      # le badge
    bras(r, True, True, 36)
    r(16, 38, 30, 56, B); r(17, 39, 29, 55, N); r(18, 40, 19, 54, V); for_lignes(r, 21, 42, 28, 54, B)
    r(17, 44, 18, 45, B); r(17, 50, 18, 51, B)                       # les anneaux du classeur
    r(58, 40, 59, 50, V); r(58, 50, 59, 51, B); r(58, 39, 59, 39, B)
    jambes(r); chaussures(r); sol_tirets(r, 68)


def appariteur_dessin(r):
    # l'appariteur : cheveux ras, blouse grise boutonnée à poche de poitrine, un talkie-walkie à antenne, un trousseau
    tete(r, 12, B); r(37, 12, 50, 12, N)
    robe_mage(r, 33, 64, B, 35, 52); r(42, 33, 45, 54, N); r(43, 36, 44, 37, V); r(43, 42, 44, 43, V); r(43, 48, 44, 49, V)
    r(37, 36, 41, 39, N); r(38, 37, 40, 37, B)                       # la poche et son stylo
    r(48, 46, 50, 48, V)
    r(40, 54, 40, 64, N); r(47, 52, 47, 64, N)
    bras(r, True, True, 36)
    r(57, 38, 63, 52, V); r(58, 40, 62, 44, N); r(59, 46, 61, 50, N); r(61, 28, 62, 38, V); r(61, 27, 62, 27, B)
    r(57, 38, 57, 52, B); r(59, 41, 59, 41, V)
    pieds_robe(r); sol_tirets(r, 68)


def documentaliste_dessin(r):
    # la documentaliste : lunettes relevées sur la tête, un collier, un carnet hérissé de post-it
    tete(r, 12, V); r(37, 10, 51, 11, N); r(38, 9, 43, 9, B); r(45, 9, 50, 9, B)
    r(36, 13, 37, 24, V); r(50, 13, 51, 24, V)                       # les cheveux mi-longs
    robe_mage(r, 33, 64, V, 35, 52); robe_eclairee(r)
    r(39, 33, 48, 34, N); r(40, 35, 47, 35, B); r(43, 36, 44, 37, B)  # le col et le collier
    bras(r, True, True, 36)
    r(16, 40, 30, 56, B); r(17, 41, 29, 55, N); for_lignes(r, 19, 43, 27, 54, B)
    for k in range(4): r(30, 41 + k * 4, 33, 42 + k * 4, V if k % 2 else B)
    r(16, 40, 16, 56, V)
    pieds_robe(r); sol_tirets(r, 68)


def coursier_dessin(r):
    # le coursier : casquette retournée, le gros sac de livraison sur le ventre, un casque de vélo à la main, un cuissard
    tete(r, 12, B); r(35, 10, 52, 13, V); r(33, 12, 37, 13, V)
    r(35, 33, 52, 54, V); buste_eclaire(r)
    r(38, 36, 49, 52, N); r(40, 38, 47, 50, B); r(43, 38, 44, 50, N); r(40, 44, 47, 44, N)
    r(36, 33, 37, 40, N); r(50, 33, 51, 40, N)                       # les bretelles du sac
    bras(r, True, True, 36)
    r(56, 46, 68, 52, B); r(57, 47, 67, 49, V); r(58, 50, 60, 52, N); r(64, 50, 66, 52, N); r(60, 45, 64, 46, B)
    jambes(r, B); r(38, 55, 41, 58, V); r(46, 55, 49, 58, V); chaussures(r, V); sol_tirets(r, 68)


def bibliothecaire_dessin(r):
    # la bibliothécaire : un chignon et sa pique, des lunettes, un châle, un tampon dateur, une pile de livres
    r(41, 4, 46, 10, B); r(47, 3, 49, 6, V); tete(r, 12, B, lunettes=True)
    robe_mage(r, 33, 64, V, 35, 52); robe_eclairee(r)
    r(35, 33, 52, 38, B); r(37, 38, 50, 39, B); r(40, 40, 47, 40, B); r(43, 41, 44, 42, B)   # le châle
    bras(r, True, True, 36)
    for k in range(4):
        r(15, 54 - k * 4, 29 - (k % 2) * 3, 57 - k * 4, B if k % 2 else V)
        r(15, 57 - k * 4, 29 - (k % 2) * 3, 57 - k * 4, N)
    r(58, 40, 61, 48, B); r(56, 48, 63, 51, V); r(56, 51, 63, 51, N); r(59, 38, 60, 39, V)
    pieds_robe(r); sol_tirets(r, 68)


def tutrice_dessin(r):
    # la tutrice : queue de cheval et son élastique, une écharpe, un cahier ouvert, un crayon
    tete(r, 12, V); r(51, 12, 54, 14, V); r(53, 14, 55, 26, V); r(53, 15, 55, 15, B)
    r(35, 33, 52, 54, B); r(38, 35, 49, 54, V); r(38, 35, 38, 54, B)
    r(37, 32, 50, 34, V); r(46, 34, 48, 42, V)                       # l'écharpe
    bras(r, True, True, 36)
    r(14, 42, 30, 54, B); r(22, 42, 22, 54, N); for_lignes(r, 16, 44, 20, 53, N); for_lignes(r, 24, 44, 28, 53, N)
    r(14, 54, 30, 55, V)
    r(58, 34, 59, 46, V); r(58, 46, 59, 47, B); r(58, 33, 59, 33, B)
    jambes(r); chaussures(r); sol_tirets(r, 68)


# --- chapitre 3 : la Crypte ---

def enlumineur_dessin(r):
    # l'enlumineur : une tonsure, une bure à capuchon et cordelière, une plume, une page enluminée
    tete(r, 12, B); r(36, 12, 38, 18, V); r(49, 12, 51, 18, V); r(40, 12, 47, 12, V)
    robe_mage(r, 33, 64, V, 35, 52); robe_eclairee(r); r(37, 44, 50, 45, N)
    r(36, 31, 51, 34, V); r(36, 31, 51, 31, B)                       # le capuchon rabattu
    r(48, 45, 49, 56, B); r(47, 56, 50, 57, B)                       # la cordelière
    bras(r, True, True, 36)
    r(14, 38, 30, 58, B); r(16, 40, 28, 56, N); r(18, 42, 26, 50, V); r(20, 44, 24, 48, B); r(21, 45, 23, 47, V)
    for k in range(2): r(18, 52 + k * 2, 26, 52 + k * 2, B)
    r(60, 26, 61, 46, B); r(61, 26, 64, 34, V); r(62, 27, 63, 32, B)
    pieds_robe(r); sol_tirets(r, 68)


def fossoyeur_dessin(r):
    # le fossoyeur : un chapeau mou, un tablier de cuir, une pelle
    r(33, 9, 54, 11, V); r(37, 4, 50, 9, V); r(37, 8, 50, 8, N); tete(r, 12, V)
    robe_mage(r, 33, 64, B, 35, 52); r(37, 50, 50, 51, V)
    r(38, 38, 49, 60, V); r(38, 38, 49, 38, N); r(39, 33, 40, 38, V); r(47, 33, 48, 38, V)   # le tablier
    r(40, 56, 40, 60, N); r(47, 54, 47, 60, N)
    bras(r, True, True, 36)
    r(62, 8, 63, 54, B); r(59, 54, 66, 64, V); r(60, 56, 65, 62, N); r(60, 6, 65, 8, B); r(62, 30, 63, 30, N)
    r(59, 64, 66, 64, B)
    pieds_robe(r); sol_tirets(r, 68)


def sonneur_dessin(r):
    # le sonneur : bonnet de laine, la corde de la grande cloche qui descend du ciel, une petite cloche à la main
    r(37, 8, 50, 12, V); r(42, 6, 45, 8, B); tete(r, 12, B)
    robe_mage(r, 33, 64, V, 35, 52); robe_eclairee(r)
    r(35, 46, 52, 47, N)
    bras(r, True, True, 36)
    r(20, 0, 21, 44, B); r(20, 6, 21, 6, N); r(20, 14, 21, 14, N); r(20, 22, 21, 22, N); r(18, 44, 23, 47, V); r(18, 47, 23, 47, B)
    r(58, 42, 66, 44, V); r(57, 44, 67, 52, V); r(59, 46, 65, 50, N); r(61, 52, 63, 54, B); r(57, 44, 57, 52, B)
    r(69, 44, 70, 44, B); r(70, 48, 71, 48, B); r(69, 52, 70, 52, B)    # la cloche qui tinte
    pieds_robe(r); sol_tirets(r, 68)


def sacristain_dessin(r):
    # le sacristain : une barbe, une chasuble à galon, un sablier, un cierge allumé
    tete(r, 12, V, barbe=True)
    robe_mage(r, 33, 64, B, 35, 52); r(42, 33, 45, 64, N); r(43, 33, 44, 64, V)
    r(35, 40, 52, 40, N)
    bras(r, True, True, 36)
    r(15, 40, 29, 42, V); r(15, 56, 29, 58, V); r(17, 42, 27, 48, B); r(21, 48, 23, 50, B); r(17, 50, 27, 56, B); r(19, 52, 25, 55, V)
    r(20, 44, 24, 46, V); r(22, 47, 22, 51, V)
    r(59, 34, 62, 50, B); r(62, 34, 62, 50, V); r(60, 30, 61, 33, V); r(60, 28, 61, 29, B)
    pieds_robe(r); sol_tirets(r, 68)


def passeur_dessin(r):
    # le passeur : une cape de pluie à capuche, une lanterne allumée, une clé
    r(33, 8, 54, 34, V); r(31, 12, 56, 30, V); r(31, 12, 31, 30, B); r(33, 8, 36, 8, B); tete(r, 13, V)
    r(53, 14, 54, 30, N)
    robe_mage(r, 33, 64, V, 34, 53); robe_eclairee(r, x0=34)
    r(43, 33, 44, 64, N)
    bras(r, True, True, 36)
    r(14, 36, 26, 38, B); r(15, 38, 25, 52, B); r(17, 40, 23, 50, N); r(19, 42, 21, 48, V); r(19, 32, 21, 36, B)
    r(20, 44, 20, 46, B); r(14, 52, 26, 53, B)
    cle(r, 58, 44, B)
    pieds_robe(r); sol_tirets(r, 68)


def serrurier_dessin(r):
    # le serrurier : trapu, des lunettes de protection sur le front, un tablier à poche, une lime et un cadenas
    tete(r, 12, B); r(37, 13, 50, 15, V); r(39, 13, 42, 15, N); r(45, 13, 48, 15, N)
    r(33, 33, 54, 54, B); r(36, 35, 51, 56, V); r(36, 35, 36, 56, B); r(33, 33, 33, 54, B)
    r(40, 44, 47, 49, N); r(41, 45, 46, 45, V)
    bras(r, True, True, 36)
    r(60, 30, 61, 50, B); for_lignes(r, 59, 31, 62, 48, N); r(59, 50, 62, 54, V)
    r(16, 44, 28, 56, B); r(18, 46, 26, 54, N); r(20, 38, 24, 44, B); r(21, 39, 23, 44, N); r(21, 48, 23, 51, V)
    r(16, 44, 16, 56, V)
    jambes(r); chaussures(r); sol_tirets(r, 68)


# --- chapitre 4 : l'Académie ---

def copiste_dessin(r):
    # le copiste : lunettes, robe verte aux manches tachées d'encre, un grimoire ouvert, un encrier et sa plume
    tete(r, 12, B, lunettes=True); r(37, 10, 50, 12, V)
    robe_plis(r, 33, 64, V, 35, 52)
    manches(r, V, 34, True, True, B, 10)
    r(29, 42, 31, 43, N); r(56, 40, 57, 42, N)                               # les taches d'encre
    r(12, 40, 31, 55, B); r(13, 41, 21, 54, N); r(23, 41, 30, 54, N); r(22, 40, 22, 55, V)   # le grimoire
    for y in range(43, 53, 3): r(14, y, 20, y, B); r(24, y, 29 - (y % 2), y, V)
    r(12, 55, 31, 56, V)
    r(59, 50, 66, 57, B); r(60, 52, 65, 56, N); r(60, 51, 65, 51, V)          # l'encrier
    r(64, 36, 65, 50, B); r(65, 34, 67, 40, V)                                # la plume
    r(37, 65, 42, 66, B); r(45, 65, 50, 66, B); sol_tirets(r, 68)


def secretaire_dessin(r):
    # la secrétaire : chignon, chemisier à col vert, un tampon dans chaque main, une pile de formulaires
    r(39, 5, 48, 10, V); tete(r, 12, V)
    r(35, 33, 52, 54, B); r(40, 33, 47, 38, V); r(43, 38, 44, 54, N)
    for y in (42, 47, 52): r(42, y, 42, y, V)
    bras(r, True, True, 36)
    for x in (23, 59):                                                       # les deux tampons
        r(x + 2, 40, x + 3, 44, B); r(x + 1, 38, x + 4, 40, V); r(x, 45, x + 5, 48, V); r(x, 48, x + 5, 49, B)
    for k in range(4):                                                       # la pile de formulaires
        r(12 + k % 2, 60 - k * 3, 28 + k % 2, 62 - k * 3, B); r(14 + k % 2, 61 - k * 3, 24, 61 - k * 3, N)
    r(16, 48, 24, 49, V)
    jambes(r); sol_tirets(r, 68)


def tresorier_dessin(r):
    # le trésorier : rond, lunettes au bout du nez, gilet à boutons ; une balance à plateaux, une pile de pièces
    tete(r, 12, B, lunettes=True); r(37, 10, 50, 12, V)
    r(32, 33, 55, 55, V); r(36, 35, 51, 53, B); r(43, 35, 44, 53, N)
    for y in (39, 44, 49): r(41, y, 41, y, V); r(46, y, 46, y, V)
    r(37, 46, 41, 46, V); r(40, 46, 40, 49, V)                                # la chaîne de montre
    bras(r, True, True, 36)
    r(63, 30, 64, 56, B); r(60, 56, 67, 58, B); r(62, 28, 65, 30, V)          # la balance
    r(54, 32, 73, 33, B)
    r(54, 34, 54, 38, B); r(73, 34, 73, 36, B)
    r(50, 39, 58, 41, V); r(51, 41, 57, 42, B); r(69, 37, 77, 39, V); r(70, 39, 76, 40, B)
    for k in range(5):                                                       # la pile de pièces
        r(15 + (k % 2), 60 - k * 3, 27 + (k % 2), 62 - k * 3, B if k % 2 else V)
        r(15 + (k % 2), 62 - k * 3, 27 + (k % 2), 62 - k * 3, N)
    jambes(r); sol_tirets(r, 68)


def apprentie_dessin(r):
    # l'apprentie : un chapeau pointu bien trop grand qui lui tombe sur les yeux, une robe blanche,
    # une baguette à étoile qui crépite
    for k in range(13): r(43 - k * 2 // 3, 0 + k, 44 + k * 2 // 3, 0 + k, V)
    r(47, 2, 49, 4, V); r(49, 4, 50, 5, V)
    r(28, 13, 59, 15, V); r(30, 15, 57, 15, B)
    r(37, 16, 50, 31, B); yeux(r, 38, 45, 18); r(37, 16, 50, 17, V)
    r(43, 24, 44, 25, N); r(42, 28, 45, 28, N)
    robe_plis(r, 34, 64, B, 34, 53, N)
    r(34, 34, 53, 36, V)
    manches(r, B, 35, True, True, B, 10)
    r(60, 22, 61, 46, B)                                                     # la baguette et son étoile
    r(60, 16, 61, 21, V); r(57, 18, 64, 19, V); r(58, 17, 63, 20, V); r(60, 17, 61, 20, B)
    for (x, y) in ((55, 13), (66, 14), (66, 23), (55, 24)): r(x, y, x, y, B)
    r(37, 65, 42, 66, B); r(45, 65, 50, 66, B); sol_tirets(r, 68)


def messagere_dessin(r):
    # la messagère : un bandeau, une cape de voyage, un pigeon voyageur perché sur l'épaule, un tube à message
    tete(r, 12, V); r(37, 14, 50, 15, B)
    robe_plis(r, 33, 64, V, 35, 52)
    r(35, 40, 52, 41, B); r(41, 39, 46, 42, N); r(42, 40, 45, 41, V)
    manches(r, V, 34, True, True, B, 10)
    r(53, 24, 62, 31, B); r(52, 26, 53, 30, B); r(60, 21, 64, 25, B)          # le pigeon
    r(62, 22, 62, 22, N); r(64, 23, 66, 24, V); r(54, 27, 59, 29, V); r(55, 32, 55, 33, V); r(58, 32, 58, 33, V)
    r(12, 43, 30, 49, B); r(14, 44, 28, 48, N); r(15, 45, 27, 47, B)          # le tube à message et ses bouchons
    r(10, 42, 12, 50, V); r(30, 42, 32, 50, V); r(20, 45, 22, 47, V)
    r(37, 65, 42, 66, B); r(45, 65, 50, 66, B); sol_tirets(r, 68)


def surveillante_dessin(r):
    # la surveillante : cheveux tirés, robe sévère à ceinture, un trousseau de clés, un registre épais à fermoir
    r(37, 8, 50, 12, B); r(41, 5, 46, 8, B); tete(r, 12, B); r(37, 11, 50, 11, N); r(40, 8, 47, 8, N)
    robe_plis(r, 33, 64, V, 35, 52)
    r(35, 46, 52, 47, B)
    manches(r, V, 34, True, True, B, 10)
    cle(r, 43, 48, B); cle(r, 48, 49, V)
    r(12, 37, 31, 59, B); r(13, 38, 30, 58, V); r(14, 39, 29, 57, N)           # le registre et son fermoir
    r(15, 40, 28, 56, V); r(15, 47, 28, 49, N); r(28, 46, 32, 50, B); r(29, 47, 30, 49, N)
    r(16, 41, 17, 55, B)
    r(37, 65, 42, 66, B); r(45, 65, 50, 66, B); sol_tirets(r, 68)


# --- chapitre 5 : le Bastion ---

def colporteur_dessin(r):
    # le colporteur : chapeau cabossé, barbe, poussiéreux, une besace de lettres en bandoulière, un bâton de marche
    r(33, 9, 54, 11, B); r(37, 4, 50, 9, B); r(37, 7, 50, 8, V); tete(r, 12, B, barbe=True)
    r(35, 37, 52, 56, V); r(36, 24, 51, 36, B); r(40, 25, 47, 25, N)
    for k in range(9): r(36 + k * 2, 36 + k * 3, 38 + k * 2, 37 + k * 3, B)   # la bandoulière
    bras(r, True, True, 37)
    r(48, 52, 66, 64, B); r(49, 53, 65, 63, N); r(49, 53, 65, 55, B)          # la besace et ses lettres
    r(52, 48, 58, 53, B); r(53, 49, 57, 52, N); r(54, 50, 56, 50, V)
    r(59, 49, 64, 53, V); r(60, 50, 63, 50, N)
    r(26, 20, 27, 67, V); r(25, 18, 28, 20, B)                                # le bâton
    jambes(r); sol_tirets(r, 68)


def sergent_dessin(r):
    # le sergent : casque à nasal, galons sur la manche, tunique ceinturée ; un clairon levé
    r(36, 6, 51, 13, V); r(37, 6, 50, 7, B); r(43, 13, 44, 20, V); r(35, 12, 52, 13, B); tete(r, 13, V)
    r(35, 34, 52, 54, B); r(35, 34, 52, 36, V); r(42, 37, 45, 54, V)
    ceinture(r, 46, 35, 52, N, V)
    bras(r, True, True, 37)
    r(30, 40, 31, 41, V); r(30, 43, 31, 44, V)                                # les galons
    r(56, 40, 66, 41, V); r(57, 42, 59, 43, V); r(61, 42, 63, 43, V)          # le clairon et son pavillon
    for k in range(7): r(65 + k, 40 - k, 65 + k, 41 + k, V)
    r(72, 33, 72, 48, B)
    r(56, 39, 57, 42, B)
    jambes(r); sol_tirets(r, 68)


def sentinelle_dessin(r):
    # la sentinelle : un camail, une cotte de mailles, une longue lance, les yeux cernés d'avoir veillé
    r(35, 9, 52, 32, V); r(37, 12, 50, 30, N); tete(r, 12, B)
    r(38, 21, 43, 21, V); r(45, 21, 50, 21, V)
    r(35, 33, 52, 54, V)
    for y in range(35, 54, 2):
        for x in range(36 + (y // 2) % 2, 52, 2): r(x, y, x, y, N)
    ceinture(r, 47, 35, 52, B, V)
    bras(r, True, True, 36)
    r(62, 4, 63, 66, B); r(63, 4, 63, 66, V)                                  # la lance et son fanion
    r(61, 0, 64, 4, B); r(62, 0, 63, 0, V)
    r(64, 6, 71, 9, V); r(64, 10, 68, 11, V)
    jambes(r); sol_tirets(r, 68)


def greffier_dessin(r):
    # le greffier : lunettes, une plume derrière l'oreille, robe noire à rabat ; un long registre déroulé
    tete(r, 12, V, lunettes=True); r(51, 5, 52, 18, B); r(52, 4, 54, 9, V)
    robe_plis(r, 33, 64, N, 35, 52, V)
    for k, y in enumerate(range(33, 65)):
        e = k // 6
        r(35 - e, y, 35 - e, y, B); r(52 + e, y, 52 + e, y, B)
    r(41, 33, 46, 40, B); r(43, 40, 44, 40, B)                                # le rabat
    manches(r, N, 34, True, True, B, 10)
    r(31, 34, 31, 43, B); r(56, 34, 56, 43, B)
    r(12, 34, 29, 37, V); r(14, 37, 27, 63, B); r(12, 63, 29, 66, V)           # le registre déroulé
    for y in range(40, 61, 3): r(16, y, 25 - (y % 2) * 2, y, N)
    r(16, 49, 22, 49, V)
    r(37, 65, 42, 66, B); r(45, 65, 50, 66, B); sol_tirets(r, 68)


def cantiniere_dessin(r):
    # la cantinière : un foulard, un grand tablier taché, une louche levée, une marmite fumante
    r(36, 8, 51, 12, V); r(51, 10, 54, 14, V); tete(r, 12, B)
    r(33, 33, 54, 56, V); r(36, 35, 51, 59, B); r(36, 35, 51, 36, N)
    r(40, 44, 41, 45, V); r(46, 50, 48, 51, V); r(43, 54, 44, 55, V)
    bras(r, True, True, 36)
    r(60, 26, 61, 46, B); r(57, 22, 64, 26, B); r(58, 23, 63, 25, V)          # la louche
    r(12, 48, 32, 61, B); r(13, 52, 31, 60, N); r(13, 49, 31, 51, V)           # la marmite
    r(10, 50, 12, 53, B); r(32, 50, 34, 53, B); r(14, 61, 30, 62, V)
    for (x, y) in ((16, 44), (21, 40), (26, 44), (18, 36)): r(x, y, x + 1, y, B)
    jambes(r); sol_tirets(r, 68)


def heraut_dessin(r):
    # le héraut : un chapeau à plume, un tabard frappé d'un sceau ; une trompette ornée d'une bannière
    r(36, 7, 51, 12, V); r(48, 2, 50, 7, B); r(49, 1, 52, 3, B); tete(r, 12, V)
    r(35, 33, 52, 56, B); r(38, 35, 49, 56, V); r(38, 55, 49, 56, B)
    r(41, 40, 46, 47, B); r(42, 41, 45, 46, N); r(43, 42, 44, 45, V)
    bras(r, True, True, 36)
    r(56, 38, 70, 39, V); r(70, 33, 75, 44, V); r(72, 35, 75, 42, N); r(73, 37, 75, 40, B)   # la trompette
    r(59, 40, 68, 50, B); r(60, 41, 67, 49, N); r(62, 43, 65, 47, V)          # sa bannière
    for x in (59, 63, 67): r(x, 51, x + 1, 52, B)
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

# Les habitants des chapitres 4 et 5, redessinés avec la finition du chapitre 8 (decor_arcanes.perso_fini).
FINIS = {"item_copiste.gif", "item_secretaire.gif", "item_tresorier.gif", "item_apprentie.gif", "item_messagere.gif",
         "item_surveillante.gif", "item_colporteur.gif", "item_sergent.gif", "item_sentinelle.gif", "item_greffier.gif",
         "item_cantiniere.gif", "item_heraut.gif"}

if __name__ == "__main__":
    noms = sys.argv[1:] or list(PORTRAITS)
    n = 0
    for nom in noms:
        if nom in PORTRAITS:
            (perso_fini if nom in FINIS else perso)(nom, PORTRAITS[nom]); n += 1
    print(n, "portraits")
