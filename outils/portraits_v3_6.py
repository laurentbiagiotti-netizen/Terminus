"""Portraits v3, lot 6 : les gardiens de Lumen (chapitre 6) et quelques habitants de Port-Aube (chapitre 7).

Même méthode que l'essai v3 (voir portrait_v3.py) : une toile de 176 x 170 cases de 2 px, des pièces peintes de
l'arrière vers l'avant, trois couleurs. Chaque fonction <nom>_v3 reprend le personnage, le rôle et l'objet de métier
de l'ancien dessin (<nom>_dessin dans dessiner_machines.py ou dessiner_ile.py), mis en scène plus finement.

Usage : python3 outils/portraits_v3_6.py [item_x.gif ...]   (sans argument : tous les portraits du lot)
"""
import math
import random
import sys

import numpy as np

from dessiner_lieux import finir, N, V, B
from portrait_v3 import Toile, texte


# ---------------------------------------------------------------- petites aides communes
def poing(t, x0, y0, x1, y1, doigts=3, vertical=False):
    """Un poing blanc liseré, avec ses traits de doigts."""
    m = t.ell(x0, y0, x1, y1)
    t.piece(m, B, ombre=0)
    if vertical:
        pas = (x1 - x0) // (doigts + 1)
        for k in range(1, doigts + 1):
            x = x0 + k * pas
            t.peindre(t.trait([(x, y0 + 2), (x, y0 + (y1 - y0) // 2)]), N)
    else:
        pas = (y1 - y0) // (doigts + 1)
        for k in range(1, doigts + 1):
            y = y0 + k * pas
            t.peindre(t.trait([(x0 + 2, y), (x0 + (x1 - x0) // 2, y)]), N)
    return m


def nez(t, pts, narine=None):
    """Un nez blanc liseré, ombre en damier vert dessous et à droite, une narine."""
    m = t.poly(pts)
    t.piece(m, B, ombre=0)
    t.damier(t.bord(m, 0, 1, 1) | t.bord(m, 1, 0, 1), V)
    if narine:
        t.point(narine[0], narine[1], N)
    return m


def joues(t, *pos):
    for (x0, y0, x1, y1) in pos:
        t.damier(t.ell(x0, y0, x1, y1), V)


# ---------------------------------------------------------------- l'Imprimeur (Lumen, la Gazette)
def imprimeur_v3():
    # penché en avant sous le poids d'un énorme rouleau de papier compressé, la visière de travers, la langue au coin
    # des lèvres ; la manivelle de la presse à la main
    t = Toile()
    # la bande de papier imprimé qui se déroule du rouleau et traîne au sol
    bande = t.fuseau([(24, 66), (10, 92), (30, 116), (12, 140), (34, 158)], 12, 12)
    t.piece(bande, B, ombre=2)
    lignes = bande & ~t.bord(bande, -1, 0, 3) & ~t.bord(bande, 1, 0, 3)
    t.peindre(lignes & ((t.yy % 4) == 0) & ((t.xx % 6) != 0), V)
    t.peindre(t.courbe([(20, 76), (12, 92), (24, 108)]) & bande, N)
    # le rouleau, couché en travers du dos
    rouleau = t.poly([(24, 36), (98, 22), (106, 54), (32, 70)])
    t.piece(rouleau, B, ombre=3)
    for pts in ([(30, 44), (100, 31)], [(32, 62), (104, 48)]):
        t.peindre(t.trait(pts) & rouleau, V)
    etiquette = t.poly([(52, 30), (78, 25), (84, 58), (58, 63)])
    t.piece(etiquette, V, ombre=0)
    texte(t, 59, 37, "xz", B, 2)
    t.peindre(t.trait([(57, 52), (80, 48)]) & (((t.xx) % 2) == 0), B)
    t.peindre(t.courbe([(98, 23), (104, 36), (106, 54)]), N)
    bout = t.ell(14, 34, 38, 72)
    t.piece(bout, B, ombre=0)
    for (a, b, c, d) in ((17, 38, 35, 68), (20, 43, 32, 63), (23, 48, 29, 58)):
        m = t.ell(a, b, c, d)
        t.peindre(m & ~t.ell(a + 1, b + 1, c - 1, d - 1), V if a == 20 else N)
    t.peindre(t.ell(24, 50, 28, 56), N)
    # la jambe arrière, tendue, qui pousse
    jambe2 = t.fuseau([(90, 110), (80, 132), (70, 150)], 14, 10)
    t.piece(jambe2, V, ombre=2)
    t.peindre(t.courbe([(84, 120), (80, 134), (74, 146)]), N)
    soulier2 = t.poly([(56, 150), (76, 146), (80, 156), (54, 158)])
    t.piece(soulier2, V, ombre=0)
    t.damier(soulier2 & ~t.bord(soulier2, -1, -1, 1), N)
    t.peindre(t.rect(54, 157, 80, 158), B)
    # la jambe avant, genou plié
    jambe1 = t.fuseau([(100, 110), (120, 124), (124, 150)], 15, 11)
    t.piece(jambe1, V, ombre=2)
    t.peindre(t.courbe([(108, 116), (118, 124), (120, 132)]), N)
    soulier1 = t.poly([(116, 148), (132, 146), (144, 152), (144, 158), (114, 158)])
    t.piece(soulier1, V, ombre=0)
    t.damier(soulier1 & ~t.bord(soulier1, -1, -1, 1), N)
    t.peindre(t.rect(114, 157, 144, 158), B)
    # le bras arrière, levé, qui retient le rouleau
    bras2 = t.fuseau([(104, 76), (94, 66), (96, 54)], 11, 8)
    t.piece(bras2, V, ombre=2)
    poing(t, 90, 44, 104, 58, vertical=True)
    # le torse penché, la chemise
    torse = t.poly([(82, 114), (86, 90), (96, 72), (112, 62), (126, 70), (124, 94), (116, 116)])
    t.piece(torse, V, ombre=3)
    t.peindre(t.courbe([(90, 96), (98, 84), (108, 76)], 1), N)
    # le tablier blanc, taché d'encre, noué dans le dos
    tablier = t.poly([(106, 74), (122, 72), (126, 96), (124, 128), (100, 132), (102, 104)])
    t.piece(tablier, B, ombre=2)
    t.peindre(t.trait([(108, 74), (116, 64)], 2), B)
    t.piece(t.rect(84, 100, 104, 103), N, bord=N, lumiere=False)
    t.peindre(t.rect(85, 101, 103, 101), V)
    t.piece(t.ell(80, 96, 88, 104), V, ombre=0)
    t.piece(t.fuseau([(84, 103), (80, 112), (82, 118)], 3, 2), V, ombre=0, lumiere=False)
    poche = t.poly([(106, 108), (120, 106), (120, 118), (106, 120)])
    t.peindre(poche & ~t.poly([(107, 109), (119, 107), (119, 117), (107, 119)]), N)
    for (x, y) in [(112, 86), (118, 96), (110, 124)]:
        t.peindre(t.ell(x, y, x + 3, y + 3), V)
    t.point(116, 90, V); t.point(108, 98, V)
    # le bras avant qui tient la manivelle
    bras1 = t.fuseau([(118, 78), (130, 94), (140, 102)], 11, 8)
    t.piece(bras1, V, ombre=2)
    t.piece(t.poly([(124, 84), (130, 80), (136, 90), (130, 94)]), B, ombre=0)
    t.peindre(t.trait([(126, 86), (132, 84)]), V)
    # la manivelle : poignée, bras et moyeu denté
    t.piece(t.trait([(148, 90), (148, 118)], 4), B, ombre=0)
    t.piece(t.trait([(148, 118), (162, 126)], 4), B, ombre=0)
    roue = t.ell(154, 116, 174, 136)
    for k in range(8):
        a = k * math.pi / 4
        cx, cy = 164 + 11 * math.cos(a), 126 + 11 * math.sin(a)
        roue |= t.rect(int(cx) - 1, int(cy) - 1, int(cx) + 1, int(cy) + 1)
    t.piece(roue, V, ombre=2)
    t.piece(t.ell(160, 122, 168, 130), B, ombre=0)
    t.peindre(t.ell(163, 125, 165, 127), N)
    t.piece(t.ell(144, 86, 152, 92), V, ombre=0)
    poing(t, 136, 96, 152, 110)
    # la tête, tendue vers l'avant
    tete = t.ell(110, 34, 152, 84)
    t.piece(tete, B, ombre=0)
    t.damier(tete & t.bord(tete, 1, 0, 2) & t.rect(0, 52, 176, 76), V)
    for pts in ([(114, 42), (106, 46), (102, 54)], [(114, 48), (106, 56), (104, 64)]):
        t.piece(t.fuseau(pts, 5, 1), V, ombre=0, lumiere=False)
    oreille = t.ell(106, 54, 116, 68)
    t.piece(oreille, B, ombre=0)
    t.peindre(t.courbe([(112, 57), (109, 61), (112, 65)]), N)
    # la casquette, visière de travers
    cas = t.ell(108, 18, 150, 46) & t.rect(0, 0, 176, 40)
    t.piece(cas, V, ombre=2)
    t.peindre(t.courbe([(114, 26), (128, 18), (144, 26)]), N)
    t.piece(t.ell(126, 14, 132, 20), B, ombre=0)
    t.peindre(t.rect(109, 37, 149, 39) & cas, B)
    visiere = t.poly([(136, 36), (158, 24), (164, 30), (146, 42)])
    t.piece(visiere, V, ombre=0)
    t.damier(visiere & ~t.bord(visiere, -1, -1, 1), N)
    # le visage : un sourcil levé d'effort, les yeux vers le haut, la langue au coin des lèvres
    t.peindre(t.courbe([(118, 47), (123, 44), (129, 46)], 2), N)
    t.peindre(t.courbe([(134, 47), (139, 46), (145, 48)], 2), N)
    t.oeil(118, 50, l=12, h=9, regard=(2, -1))
    t.oeil(134, 51, l=11, h=9, regard=(2, -1))
    nez(t, [(144, 58), (156, 68), (152, 72), (143, 71)], narine=(147, 70))
    t.pixels(119, 71, """
:..................
.::::::::::::::::..
.:oooooooooooooo:..
.:o:o:o:o:o:o:o:#:.
.:oooooooooooooo:##:
..::::::::::::::.##:
.................::.
""")
    t.peindre(t.trait([(116, 54), (114, 52)]) | t.trait([(116, 57), (113, 57)]), N)
    joues(t, (114, 64, 120, 68))
    # les gouttes de sueur et les traits d'effort au-dessus du rouleau
    t.pixels(100, 22, """
..:..
.:o:.
:ooo:
:oo#:
.:::.
""")
    for pts in ([(38, 20), (44, 14)], [(52, 16), (54, 8)], [(66, 14), (70, 6)]):
        t.peindre(t.trait(pts, 2), B)
    t.sol(160, cx=96)
    return t.image()


# ---------------------------------------------------------------- John (Lumen, le Labyrinthe)
def john_v3():
    # le guide du Labyrinthe : en marche, capuche pointue d'où dépasse un long nez ; il tient la pelote dont le fil se
    # déroule derrière lui en zigzag sur le sol, et trace une flèche à la craie, l'air malin
    t = Toile()
    # la robe de bure, blanche, qui flotte en arrière
    robe = t.poly([(82, 74), (110, 74), (120, 96), (126, 128), (128, 154), (100, 156), (72, 154), (44, 150),
                   (26, 142), (46, 132), (62, 112), (74, 90)])
    t.piece(robe, B, ombre=4)
    for pts in ([(86, 106), (74, 130), (60, 148)], [(98, 108), (96, 132), (92, 154)], [(108, 108), (114, 132), (116, 154)],
                [(80, 108), (60, 128), (40, 142)]):
        t.peindre(t.courbe(pts), N)
    ourlet = robe & ((t.yy >= 146) | (t.bord(robe, 0, 1, 6) & (t.xx < 50)))
    t.peindre(ourlet, V)
    t.peindre(robe & (t.yy == 146), N)
    for x in range(20, 130, 6):
        t.peindre(t.trait([(x, 154), (x + 3, 150), (x + 6, 154)]) & ourlet, B)
    # une pièce cousue sur la robe, à grands points
    piece_ = t.poly([(104, 120), (118, 118), (119, 132), (105, 134)])
    t.piece(piece_, V, ombre=0, lumiere=False)
    t.damier(piece_ & ~t.bord(piece_, -1, -1, 2) & ~t.bord(piece_, 1, 1, 2), N)
    for (x, y) in [(103, 123), (103, 129), (120, 121), (120, 127), (108, 135), (114, 134), (108, 118), (114, 117)]:
        t.point(x, y, N)
    # le fil qui serpente au sol derrière lui
    fil = t.trait([(132, 120), (126, 140), (112, 154), (94, 150), (78, 158), (60, 150), (42, 158), (24, 151),
                   (8, 156)], 2)
    t.piece(fil, B, ombre=0)
    # les sandales
    for pts in ([(108, 152), (128, 150), (136, 158), (106, 158)], [(54, 148), (70, 150), (68, 156), (52, 154)]):
        s = t.poly(pts)
        t.piece(s, B, ombre=0)
        t.damier(t.bord(s, 0, 1, 1), V)
    t.peindre(t.trait([(114, 152), (114, 157)], 2) | t.trait([(122, 151), (122, 157)], 2), V)
    t.peindre(t.trait([(106, 158), (136, 158)]), N)
    # la cordelière verte, nouée, et ses glands
    t.piece(t.trait([(76, 104), (118, 102)], 4), V, ombre=0)
    t.piece(t.ell(88, 99, 98, 108), V, ombre=0)
    for pts in ([(92, 106), (88, 122), (90, 134)], [(96, 106), (98, 120), (102, 130)]):
        t.piece(t.fuseau(pts, 3, 2), V, ombre=0, lumiere=False)
    t.piece(t.ell(87, 132, 93, 140), V, ombre=0)
    t.piece(t.ell(99, 128, 105, 136), V, ombre=0)
    # la main du fond qui tient la pelote, le fil qui en part
    t.piece(t.fuseau([(108, 86), (116, 104), (122, 110)], 10, 8), V, ombre=2)
    pelote = t.ell(120, 100, 146, 126)
    t.piece(pelote, B, ombre=2)
    for pts in ([(122, 106), (134, 112), (144, 106)], [(122, 114), (134, 120), (145, 114)], [(126, 102), (130, 114), (128, 124)],
                [(136, 101), (140, 112), (138, 125)]):
        t.peindre(t.courbe(pts) & pelote, V)
    t.peindre(t.courbe([(124, 120), (132, 104), (142, 102)]) & pelote, N)
    poing(t, 114, 104, 126, 116, vertical=True)
    # la pèlerine à capuche, verte
    peler = t.poly([(76, 70), (114, 70), (124, 86), (116, 96), (100, 100), (84, 98), (70, 90)])
    t.piece(peler, V, ombre=3)
    t.peindre(t.courbe([(84, 78), (80, 88), (82, 96)]) | t.courbe([(104, 80), (108, 90), (106, 98)]), N)
    t.peindre(t.bord(peler, 0, 1, 2) & (((t.xx + t.yy) % 2) == 0) & (t.yy > 90), B)
    # le bras levé qui trace la flèche à la craie
    manche = t.poly([(104, 78), (122, 80), (134, 70), (144, 60), (150, 66), (140, 80), (126, 92), (108, 92)])
    t.piece(manche, V, ombre=2)
    t.peindre(t.courbe([(116, 84), (126, 80), (136, 72)]), N)
    t.piece(t.poly([(140, 58), (148, 52), (154, 62), (146, 68)]), B, ombre=0)
    poing(t, 144, 46, 158, 60, vertical=True)
    craie = t.poly([(152, 44), (158, 36), (162, 40), (156, 48)])
    t.piece(craie, B, ombre=0)
    # la flèche de craie, tracée dans l'air, poudreuse
    fl = t.trait([(110, 20), (164, 20)], 4) | t.poly([(156, 12), (172, 20), (156, 28)])
    t.peindre(fl & ~(((t.xx * 3 + t.yy * 5) % 7) == 0), B)
    for (x, y) in [(104, 18), (100, 23), (166, 30), (160, 36), (106, 26)]:
        t.point(x, y, B)
    # la capuche et sa pointe qui retombe en arrière
    pointe = t.fuseau([(92, 36), (78, 18), (60, 10), (46, 16)], 26, 3)
    t.piece(pointe, V, ombre=3)
    t.peindre(t.courbe([(84, 30), (70, 18), (56, 14)]), N)
    t.piece(t.ell(40, 12, 50, 22), B, ombre=0)
    capuche = t.ell(72, 22, 126, 86)
    t.piece(capuche, V, ombre=3)
    t.peindre(t.courbe([(78, 40), (76, 56), (80, 72)]), N)
    # le visage dans l'ouverture de la capuche
    visage = t.ell(86, 33, 124, 81)
    t.piece(visage, B, ombre=0)
    t.peindre(t.bord(visage, -1, 0, 1) | t.bord(visage, 0, -1, 1), N)
    t.damier(visage & t.bord(visage, 1, 0, 2) & t.rect(0, 50, 176, 74), V)
    meche = t.poly([(90, 38), (118, 36), (114, 41), (108, 39), (102, 43), (96, 40), (90, 44)]) & visage
    t.piece(meche, V, ombre=0, lumiere=False)
    # un sourcil haut, l'autre en accent : l'air malin
    t.peindre(t.courbe([(91, 46), (96, 43), (102, 45)], 2), N)
    t.peindre(t.courbe([(106, 45), (111, 42), (117, 41)], 2), N)
    t.oeil(91, 49, l=11, h=9, regard=(2, 0), paupiere=3)
    t.oeil(106, 48, l=10, h=9, regard=(2, 0), paupiere=3)
    t.peindre(t.trait([(89, 57), (91, 59)]), N)
    nez(t, [(110, 57), (134, 68), (131, 72), (110, 71)], narine=(116, 70))
    t.pixels(93, 72, """
..........:.
:........::.
.::::::::#:.
...:::::::..
""")
    t.piece(t.fuseau([(102, 79), (104, 85), (102, 90)], 5, 1), V, ombre=0, lumiere=False)
    joues(t, (92, 62, 99, 67))
    t.sol(160, cx=84)
    return t.image()


# ---------------------------------------------------------------- Kamal (Port-Aube, le Grand Registre)
def kamal_v3():
    # le greffier du Registre : calotte, longue robe à étole ; il porte à bout de bras un livre immense, si lourd qu'il
    # se penche en arrière pour faire contrepoids ; une plume coincée derrière l'oreille
    t = Toile()
    # le bras du fond, tendu vers le haut du livre
    t.piece(t.fuseau([(60, 78), (82, 66), (98, 58)], 10, 8), V, ombre=2)
    # la longue robe, penchée en arrière
    robe = t.poly([(32, 74), (66, 70), (82, 100), (96, 130), (104, 158), (46, 160), (34, 130), (28, 100)])
    t.piece(robe, V, ombre=4)
    for pts in ([(56, 106), (52, 132), (52, 158)], [(76, 108), (84, 134), (90, 158)], [(66, 112), (68, 136), (70, 158)]):
        t.peindre(t.courbe(pts), N)
    ourlet = t.bord(robe, 0, 1, 6) & (t.yy > 148)
    t.peindre(ourlet, B)
    t.damier(ourlet & (t.yy > 151) & (t.yy < 156), V)
    for (x, y) in [(36, 120), (84, 122), (64, 134), (92, 142), (42, 142), (80, 146)]:
        t.etoile(x, y, B, 1)
    # les souliers
    for pts in ([(46, 156), (66, 156), (68, 162), (44, 162)], [(80, 156), (102, 156), (106, 162), (80, 162)]):
        s = t.poly(pts)
        t.piece(s, V, ombre=0)
        t.damier(s & ~t.bord(s, -1, -1, 1), N)
    # l'étole blanche, brodée, qui pend sur la poitrine
    for pts in ([(44, 74), (50, 112), (56, 140)], [(58, 74), (68, 112), (78, 140)]):
        e = t.fuseau(pts, 8, 9)
        t.piece(e, B, ombre=2)
    for (x, y) in [(46, 88), (49, 104), (52, 120), (62, 88), (67, 104), (72, 120)]:
        t.peindre(t.poly([(x, y - 3), (x + 3, y), (x, y + 3), (x - 3, y)]), V)
    for x in range(50, 62, 2):
        t.peindre(t.rect(x, 140, x, 146), B)
    for x in range(72, 84, 2):
        t.peindre(t.rect(x, 140, x, 146), B)
    # la ceinture
    ceint = t.poly([(30, 106), (84, 100), (86, 106), (32, 112)])
    t.piece(ceint, N, bord=N, lumiere=False)
    t.peindre(t.trait([(31, 108), (85, 102)]), V)
    t.piece(t.rect(54, 101, 62, 110), B, ombre=0)
    t.peindre(t.rect(56, 103, 60, 108), N)
    # le livre immense, ouvert, tenu à bout de bras
    couv = t.poly([(90, 50), (128, 58), (170, 44), (172, 98), (128, 108), (92, 100)])
    t.piece(couv, V, ombre=2)
    pg = t.poly([(94, 52), (128, 60), (128, 102), (96, 96)])
    pd = t.poly([(128, 60), (166, 48), (168, 92), (128, 102)])
    t.piece(pg, B, ombre=0)
    t.piece(pd, B, ombre=0)
    t.damier(t.bord(pg, 1, 0, 3), V)
    t.peindre(t.trait([(128, 60), (128, 102)]), N)
    for k in range(3):
        t.peindre(t.trait([(96 + k, 98 + 2 * k), (128, 104 + 2 * k)]) | t.trait([(128, 104 + 2 * k), (168 - k, 94 + 2 * k)]), N if k % 2 else B)
    texte(t, 99, 60, "dn:", N)
    texte(t, 112, 62, "uid", V)
    for i, y in enumerate((70, 76, 82, 88)):
        w = (22, 18, 24, 14)[i]
        t.peindre(t.trait([(100, y + i // 2), (100 + w, y + 2 + i // 2)]) & (((t.xx) % 4) != 3), V if i % 2 else N)
    # le nouveau sceau, sur la page de droite, qui brille
    sceau = t.ell(138, 58, 158, 78)
    t.piece(sceau, V, ombre=2)
    t.peindre(t.ell(142, 62, 154, 74) & ~t.ell(143, 63, 153, 73), B)
    t.pixels(144, 64, """
..o..
.ooo.
ooooo
.o.o.
o...o
""")
    t.piece(t.fuseau([(142, 76), (138, 86)], 4, 3), V, ombre=0, lumiere=False)
    t.piece(t.fuseau([(152, 76), (156, 86)], 4, 3), V, ombre=0, lumiere=False)
    for y in (84, 88):
        t.peindre(t.trait([(134, y - 2), (162, y - 6)]) & (((t.xx) % 4) != 3), N)
    for (x, y) in [(164, 36), (132, 42), (172, 56)]:
        t.etincelle(x, y)
    # la main du fond, sur le coin haut du livre
    poing(t, 92, 48, 104, 60, vertical=True)
    # le bras avant, tendu sous le livre
    t.piece(t.fuseau([(52, 82), (78, 94), (96, 96)], 11, 8), V, ombre=2)
    t.piece(t.poly([(88, 90), (94, 88), (96, 100), (90, 102)]), B, ombre=0)
    poing(t, 94, 90, 108, 104)
    # la tête, rejetée en arrière, et la plume derrière l'oreille
    plume = t.fuseau([(32, 50), (22, 32), (12, 16)], 3, 8) | t.fuseau([(18, 24), (12, 16), (8, 6)], 7, 1)
    t.piece(plume, B, ombre=0)
    for k in range(4):
        y = 14 + k * 5
        t.peindre(t.trait([(14 - k + k, y + 2), (20 - k + k, y + 6)]) & plume, V)
    t.peindre(t.courbe([(30, 46), (20, 30), (10, 10)]) & plume, N)
    tete = t.ell(28, 26, 72, 74)
    t.piece(tete, B, ombre=0)
    t.damier(tete & t.bord(tete, 1, 0, 2) & t.rect(0, 44, 176, 66), V)
    cheveux = t.poly([(26, 34), (40, 30), (40, 42), (36, 54), (30, 60)]) & t.ell(26, 24, 74, 76)
    t.piece(cheveux, V, ombre=0, lumiere=False)
    oreille = t.ell(26, 46, 36, 60)
    t.piece(oreille, B, ombre=0)
    t.peindre(t.courbe([(32, 49), (29, 53), (32, 57)]), N)
    # la calotte brodée
    cal = t.ell(30, 16, 70, 44) & t.rect(0, 0, 176, 34)
    t.piece(cal, V, ombre=2)
    for x in range(32, 70, 6):
        t.peindre(t.trait([(x, 33), (x + 3, 29), (x + 6, 33)]) & cal, B)
    t.peindre(t.courbe([(38, 24), (50, 18), (62, 24)]), N)
    t.piece(t.ell(47, 12, 53, 18), V, ombre=0)
    # le visage : sourcils levés, regard vers le livre, sourire fier
    t.peindre(t.courbe([(40, 41), (45, 38), (51, 40)], 2), N)
    t.peindre(t.courbe([(56, 40), (61, 37), (67, 39)], 2), N)
    t.oeil(39, 44, l=12, h=9, regard=(2, 0))
    t.oeil(55, 44, l=12, h=9, regard=(2, 0))
    nez(t, [(62, 54), (75, 62), (72, 66), (62, 65)], narine=(66, 64))
    t.pixels(42, 66, """
:..............:
.::::::::::::::.
.:oooooooooooo:.
..:::######:::..
....::::::::....
""")
    joues(t, (38, 58, 44, 62), (68, 60, 72, 64))
    t.sol(161, cx=82)
    return t.image()


# ---------------------------------------------------------------- Kathleen (Lumen, les Archives)
def kathleen_v3():
    # l'archiviste des fiches : grande et maigre, chignon piqué d'un crayon, lunettes rondes ; elle tire à deux mains
    # un long tiroir qui déborde de fiches, et l'une d'elles s'envole
    t = Toile()
    # le meuble à fiches, au bord du cadre
    meuble = t.rect(150, 36, 178, 160)
    t.piece(meuble, V, ombre=3)
    for y in (40, 66, 118):
        f = t.rect(154, y, 178, y + 22)
        t.piece(f, V, ombre=0, lumiere=False)
        t.piece(t.rect(160, y + 5, 170, y + 10), B, ombre=0)
        t.peindre(t.rect(162, y + 7, 168, y + 8), N)
        t.piece(t.ell(163, y + 14, 167, y + 18), B, ombre=0)
    t.peindre(t.rect(154, 92, 178, 114), N)
    # le long tiroir tiré, plein de fiches
    caisse = t.poly([(90, 92), (156, 90), (156, 112), (90, 114)])
    rnd = random.Random(3)
    for x in range(96, 152, 4):
        h = rnd.choice((6, 8, 10, 12))
        f = t.rect(x, 90 - h, x + 2, 94)
        t.piece(f, B, ombre=0)
        if rnd.random() < 0.4:
            t.peindre(t.rect(x, 90 - h, x + 2, 91 - h), V)
    t.piece(caisse, B, ombre=3)
    t.hachures(caisse & ~t.bord(caisse, -1, -1, 2) & ~t.bord(caisse, 1, 1, 3), V, 6)
    t.peindre(t.trait([(92, 102), (154, 101)]) & (((t.xx) % 3) != 0), N)
    face = t.rect(82, 88, 94, 118)
    t.piece(face, V, ombre=2)
    t.piece(t.rect(84, 92, 92, 98), B, ombre=0)
    texte(t, 85, 93, "i", N)
    t.peindre(t.rect(88, 94, 90, 94), N)
    # la fiche qui s'envole, avec ses traits de vol
    fiche = t.poly([(118, 44), (134, 38), (138, 50), (122, 56)])
    t.piece(fiche, B, ombre=0)
    for k in range(3):
        t.peindre(t.trait([(122 + k, 46 + 3 * k), (134 + k, 42 + 3 * k)]) & fiche, V if k else N)
    for pts in ([(108, 66), (116, 58)], [(114, 72), (120, 64)], [(126, 66), (128, 60)]):
        t.peindre(t.trait(pts, 2), B)
    t.etincelle(144, 34)
    # la longue jupe plissée
    jupe = t.poly([(42, 98), (72, 98), (80, 130), (86, 158), (28, 158), (36, 130)])
    t.piece(jupe, V, ombre=4)
    for (a, b) in [((48, 102), (40, 156)), ((56, 102), (52, 156)), ((64, 102), (66, 156)), ((70, 102), (78, 156))]:
        t.peindre(t.trait([a, b]), N)
        t.peindre(t.trait([(a[0] + 2, a[1] + 4), (b[0] + 2, b[1] - 2)]) & jupe, B)
    ourlet = jupe & (t.yy >= 152)
    t.peindre(ourlet, B)
    t.peindre(jupe & (t.yy == 151), N)
    for x in range(30, 86, 4):
        t.point(x, 154, V)
    # les bottines qui dépassent, plantées pour tirer
    for pts in ([(24, 154), (40, 152), (42, 160), (20, 160)], [(70, 154), (86, 152), (90, 160), (68, 160)]):
        s_ = t.poly(pts)
        t.piece(s_, V, ombre=0)
        t.damier(s_ & ~t.bord(s_, -1, -1, 1), N)
    # le bras du fond
    t.piece(t.fuseau([(66, 74), (76, 88), (84, 96)], 9, 7), V, ombre=2)
    poing(t, 82, 90, 94, 102, vertical=True)
    # le chemisier blanc et le gilet vert
    torse = t.poly([(44, 70), (70, 68), (74, 100), (40, 100)])
    t.piece(torse, B, ombre=2)
    for pts in ([(44, 70), (52, 70), (54, 100), (40, 100)], [(64, 68), (70, 68), (74, 100), (62, 100)]):
        t.piece(t.poly(pts), V, ombre=0)
    for y in (78, 86, 94):
        t.piece(t.ell(57, y, 60, y + 3), V, ombre=0, lumiere=False)
    col = t.poly([(50, 66), (56, 74), (62, 66)])
    t.piece(col, B, ombre=0)
    t.peindre(t.trait([(56, 68), (56, 74)]), N)
    ceint = t.rect(40, 98, 74, 101)
    t.piece(ceint, N, bord=N, lumiere=False)
    t.peindre(t.rect(41, 99, 73, 99), V)
    # le bras avant, tendu vers la poignée
    t.piece(t.fuseau([(46, 74), (56, 92), (80, 104)], 10, 8), V, ombre=2)
    t.piece(t.poly([(74, 98), (80, 98), (80, 108), (74, 108)]), B, ombre=0)
    poing(t, 78, 98, 92, 110)
    # le chignon piqué du crayon, derrière la tête
    crayon = t.fuseau([(16, 36), (34, 22), (52, 8)], 4, 4)
    t.piece(crayon, B, ombre=0)
    t.peindre(t.fuseau([(48, 11), (52, 8), (55, 6)], 4, 1), V)
    t.peindre(t.trait([(17, 35), (51, 9)]) & crayon, V)
    chignon = t.ell(24, 14, 48, 38)
    t.piece(chignon, V, ombre=3)
    for pts in ([(28, 22), (36, 18), (44, 22)], [(28, 30), (36, 24), (44, 30)]):
        t.peindre(t.courbe(pts), N)
    t.piece(t.fuseau([(30, 36), (24, 44), (26, 52)], 3, 1), V, ombre=0, lumiere=False)
    t.peindre(t.trait([(23, 34), (29, 30)], 2) & crayon, B)
    t.peindre(t.trait([(41, 18), (46, 14)], 2) & crayon, B)
    # la tête
    tete = t.ell(34, 22, 80, 74)
    t.piece(tete, B, ombre=0)
    t.damier(tete & t.bord(tete, 1, 0, 2) & t.rect(0, 42, 176, 66), V)
    chev = t.poly([(32, 22), (82, 22), (80, 32), (68, 28), (56, 33), (44, 32), (40, 44), (32, 52)]) & t.ell(32, 20, 82, 76)
    t.piece(chev, V, ombre=0)
    t.peindre(t.courbe([(46, 26), (56, 24), (68, 26)]), N)
    t.piece(t.fuseau([(38, 40), (34, 52), (36, 62)], 3, 1), V, ombre=0, lumiere=False)
    # le visage : sourcils hauts de surprise, lunettes rondes, bouche en o vers la fiche
    t.peindre(t.courbe([(43, 37), (48, 34), (54, 35)], 2), N)
    t.peindre(t.courbe([(61, 35), (66, 33), (72, 35)], 2), N)
    for (x0, y0) in ((41, 40), (59, 40)):
        m = t.ell(x0, y0, x0 + 15, y0 + 14)
        t.piece(m, B, ombre=0)
        t.oeil(x0 + 3, y0 + 3, l=10, h=8, regard=(2, -2), paupiere=2)
        t.peindre(t.trait([(x0 + 11, y0 + 11), (x0 + 13, y0 + 9)]), V)
    t.peindre(t.courbe([(56, 46), (57, 45), (59, 46)]), N)
    t.peindre(t.trait([(74, 46), (80, 44)]), N)
    t.peindre(t.trait([(41, 47), (36, 46)]), N)
    t.point(43, 44, N); t.point(42, 42, N)
    nez(t, [(57, 56), (65, 61), (63, 63), (56, 63)], narine=(60, 63))
    t.pixels(53, 65, """
.::::.
:o::o:
:o##o:
.::::.
""")
    joues(t, (42, 58, 48, 62), (68, 57, 74, 61))
    t.sol(161, cx=84)
    return t.image()


# ---------------------------------------------------------------- Kay (Lumen, la Bibliothèque des limites)
def kay_v3():
    # la bibliothécaire des limites : chignon haut, lunettes en amande, l'index sur les lèvres (« chut ! ») ; sous
    # l'autre bras, une pile de livres qui penche dangereusement, la règle graduée glissée dedans
    t = Toile()
    # la règle graduée, plantée dans la pile
    regle = t.poly([(40, 108), (48, 108), (36, 16), (28, 18)])
    t.piece(regle, B, ombre=0)
    for k in range(0, 22):
        y = 20 + k * 4
        x = 30 + (y - 18) * 12 // 90
        l = 4 if k % 5 == 0 else 2
        t.peindre(t.trait([(x, y), (x + l, y)]), N)
    # la robe droite, longue
    robe = t.poly([(72, 70), (106, 70), (112, 110), (120, 155), (58, 155), (66, 110)])
    t.piece(robe, V, ombre=4)
    for pts in ([(78, 108), (72, 158)], [(90, 108), (90, 158)], [(102, 108), (108, 158)]):
        t.peindre(t.trait(pts), N)
    ourlet = robe & (t.yy >= 148)
    t.peindre(ourlet, B)
    t.peindre(robe & (t.yy == 147), N)
    for x in range(58, 122, 6):
        t.peindre(t.trait([(x, 154), (x + 3, 150), (x + 6, 154)]) & ourlet, V)
    for (x, y) in [(74, 122), (100, 120), (84, 136), (110, 140), (68, 142), (96, 144)]:
        t.etoile(x, y, B, 1)
    for pts in ([(70, 157), (86, 157), (86, 161), (66, 161)], [(94, 157), (110, 157), (114, 161), (94, 161)]):
        s_ = t.poly(pts)
        t.piece(s_, V, ombre=0)
        t.damier(s_ & ~t.bord(s_, -1, -1, 1), N)
    # le gilet blanc boutonné, à motif
    gilet = t.poly([(70, 70), (108, 70), (110, 108), (68, 108)])
    t.piece(gilet, B, ombre=3)
    t.trame(gilet & ~t.bord(gilet, -1, -1, 2) & ~t.bord(gilet, 1, 1, 4), V, 0.12)
    vcol = t.poly([(80, 70), (98, 70), (89, 88)])
    t.piece(vcol, V, ombre=0)
    t.piece(t.poly([(84, 70), (94, 70), (89, 80)]), B, ombre=0)
    t.peindre(t.trait([(89, 88), (89, 108)]), N)
    for y in (92, 98, 104):
        t.piece(t.ell(91, y, 94, y + 3), V, ombre=0, lumiere=False)
    ceint = t.rect(68, 106, 110, 109)
    t.piece(ceint, N, bord=N, lumiere=False)
    t.peindre(t.rect(69, 107, 109, 107), V)
    # la pile de livres, sous le bras, qui penche
    livres = [(18, 58, 104, B), (22, 60, 96, V), (20, 62, 88, B), (24, 60, 81, V), (22, 66, 74, B), (28, 64, 67, V),
              (26, 68, 60, B)]
    for i, (x0, x1, y, c) in enumerate(livres):
        d = (i - 2) * 2 + (3 if i == 6 else 0)
        h = 8 if i % 2 == 0 else 7
        b = t.poly([(x0 + d, y), (x1 + d, y - 1), (x1 + d + 1, y + h - 1), (x0 + d + 1, y + h)])
        t.piece(b, c, ombre=0, lumiere=False)
        bandes = t.rect(x0 + d + 5, y - 2, x0 + d + 7, y + h + 2) | t.rect(x1 + d - 8, y - 2, x1 + d - 6, y + h + 2)
        t.peindre(bandes & b, N if c == V else V)
        if c == B:
            t.peindre(t.trait([(x0 + d + 10, y + h // 2), (x1 + d - 12, y + h // 2 - 1)]) & (((t.xx) % 2) == 0), N)
        else:
            t.peindre(t.trait([(x0 + d + 10, y + 2), (x1 + d - 12, y + 1)]), B)
    for (x, y) in [(64, 60), (68, 54), (72, 50)]:
        t.peindre(t.trait([(x, y), (x + 3, y - 3)]), B)
    # le bras qui serre la pile
    t.piece(t.fuseau([(74, 74), (64, 92), (56, 108)], 11, 9), V, ombre=2)
    t.piece(t.poly([(48, 104), (60, 104), (60, 110), (48, 110)]), B, ombre=0)
    poing(t, 40, 104, 56, 116, vertical=True)
    # le bras levé, l'index sur les lèvres
    t.piece(t.fuseau([(104, 76), (114, 86), (118, 94)], 11, 10), V, ombre=2)
    t.piece(t.fuseau([(118, 94), (110, 84), (100, 76)], 10, 8), V, ombre=2)
    # la tête
    tete = t.ell(66, 22, 110, 70)
    t.piece(tete, B, ombre=0)
    t.damier(tete & t.bord(tete, 1, 0, 2) & t.rect(0, 40, 176, 60), V)
    # le chignon haut, lisse, piqué de deux épingles
    t.piece(t.trait([(70, 10), (104, 18)], 2), B, ombre=0)
    t.piece(t.ell(102, 15, 107, 20), V, ombre=0)
    chignon = t.ell(76, 4, 100, 26)
    t.piece(chignon, V, ombre=3)
    t.peindre(t.courbe([(80, 16), (86, 8), (94, 10)]) | t.courbe([(82, 22), (90, 14), (97, 18)]), N)
    chev = t.poly([(64, 24), (112, 24), (112, 44), (104, 32), (88, 28), (74, 32), (68, 46), (64, 44)]) & t.ell(64, 20, 112, 74)
    t.piece(chev, V, ombre=0)
    t.peindre(t.courbe([(88, 24), (80, 28), (72, 38)]) | t.courbe([(88, 24), (96, 28), (104, 36)]), N)
    t.piece(t.fuseau([(68, 40), (64, 54), (66, 64)], 4, 1), V, ombre=0, lumiere=False)
    t.piece(t.fuseau([(108, 40), (112, 54), (110, 64)], 4, 1), V, ombre=0, lumiere=False)
    # le visage : regard droit, sourcil levé, lunettes en amande (des « yeux de chat »)
    t.peindre(t.courbe([(72, 36), (78, 34), (84, 35)], 2), N)
    t.peindre(t.courbe([(92, 35), (98, 33), (104, 35)], 2), N)
    verres = [([(70, 40), (85, 41), (84, 52), (73, 53), (70, 47)], (66, 37), (73, 43)),
              ([(91, 41), (106, 40), (106, 47), (103, 53), (92, 52)], (110, 37), (94, 43))]
    for (pts, aile, oe) in verres:
        v = t.poly(pts)
        t.piece(v, B, ombre=0)
        t.peindre(t.bord(v, 0, -1, 1) & t.rect(0, 0, 176, 44), N)
        t.peindre(t.trait([pts[0] if aile[0] < 80 else pts[1], aile], 3), N)
        t.oeil(oe[0], oe[1], l=10, h=8, regard=(0, 0), paupiere=2, cils=-1 if aile[0] < 80 else 1)
    t.peindre(t.trait([(85, 45), (91, 45)]), N)
    t.peindre(t.trait([(103, 50), (105, 48)]) | t.trait([(82, 50), (84, 48)]), V)
    nez(t, [(86, 54), (91, 58), (90, 60), (85, 60)], narine=(88, 60))
    t.pixels(82, 62, """
.::::::::::.
:oo::::::oo:
.:::::::::.
""")
    joues(t, (72, 55, 78, 59), (98, 55, 104, 59))
    # la manchette, la main, et l'index dressé devant les lèvres
    t.piece(t.poly([(96, 72), (102, 70), (106, 78), (100, 80)]), B, ombre=0)
    t.piece(t.fuseau([(88, 70), (88, 62), (88, 58)], 4, 3), B, ombre=0)
    t.peindre(t.trait([(87, 59), (89, 59)]), V)
    poing(t, 80, 66, 98, 80, vertical=True)
    texte(t, 116, 44, "chut", B)
    t.etoile(114, 40, B, 1); t.etoile(134, 54, B, 1)
    t.sol(161, cx=82)
    return t.image()


def eroder_(t, m):
    from portrait_v3 import eroder
    return eroder(m, 1)


# ---------------------------------------------------------------- Klara (Lumen, le Guetteur)
def klara_v3():
    # la guetteuse : un casque d'écoute énorme à antenne, les yeux en coin, la main plaquée sur un écouteur ; la
    # console pliante en bandoulière, ouverte devant elle comme un plateau, ses voyants et son tracé d'appels
    t = Toile()
    # les ondes captées par l'antenne
    for k, r in enumerate((10, 16, 22)):
        arc = t.ell(132 - r, 18 - r, 132 + r, 18 + r) & ~t.ell(133 - r, 19 - r, 131 + r, 17 + r)
        t.peindre(arc & (t.xx > 138) & (t.yy < 22) & ((((t.xx + t.yy) // 3) % 2) == 0 if k == 2 else True), B)
    # les jambes et les bottes
    for (x0, x1) in ((60, 76), (84, 100)):
        j = t.poly([(x0, 124), (x1, 124), (x1 - 1, 152), (x0 + 1, 152)])
        t.piece(j, V, ombre=2)
        t.peindre(t.trait([((x0 + x1) // 2, 128), ((x0 + x1) // 2, 150)]), N)
    for pts in ([(56, 148), (78, 148), (80, 160), (52, 160)], [(82, 148), (104, 148), (108, 160), (82, 160)]):
        s_ = t.poly(pts)
        t.piece(s_, V, ombre=0)
        t.damier(s_ & ~t.bord(s_, -1, -1, 1), N)
        t.peindre(s_ & (t.yy >= 158), B)
    # le corps : chemise blanche, gilet vert
    torse = t.poly([(58, 72), (100, 72), (104, 110), (56, 110)])
    t.piece(torse, B, ombre=3)
    for pts in ([(58, 72), (72, 72), (76, 110), (56, 110)], [(86, 72), (100, 72), (104, 110), (84, 110)]):
        t.piece(t.poly(pts), V, ombre=0)
    for y in (82, 92, 102):
        t.piece(t.ell(72, y, 75, y + 3), B, ombre=0, lumiere=False)
        t.piece(t.ell(83, y, 86, y + 3), B, ombre=0, lumiere=False)
    t.peindre(t.trait([(79, 76), (80, 110)]), N)
    # la sangle de la console en bandoulière
    t.piece(t.trait([(64, 72), (100, 108)], 4), V, ombre=0, lumiere=False)
    t.peindre(t.trait([(64, 72), (100, 108)]) & (((t.xx) % 3) == 0), B)
    # le bras du fond, la main sur un bouton de la console
    t.piece(t.fuseau([(60, 76), (48, 94), (44, 106)], 10, 8), V, ombre=2)
    # la console pliante, ouverte comme un plateau
    plateau = t.poly([(24, 104), (132, 104), (140, 120), (18, 120)])
    t.piece(plateau, B, ombre=0)
    devant = t.rect(18, 121, 140, 130)
    t.piece(devant, V, ombre=2)
    for x in range(24, 136, 4):
        t.peindre(t.rect(x, 123, x + 1, 128), N)
    ecran = t.poly([(56, 106), (110, 106), (114, 118), (52, 118)])
    t.piece(ecran, N, bord=N, lumiere=False)
    texte(t, 56, 107, "connect", V)
    t.pixels(84, 107, ".#\n#.\n#.\n#.\n.#")
    texte(t, 88, 107, "3", B)
    t.pixels(92, 107, "#.\n.#\n.#\n.#\n#.")
    t.peindre(t.rect(97, 107, 99, 111) & (((t.yy) % 2) == 0), B)
    trace = [(54, 116), (60, 116), (62, 113), (64, 116), (72, 116), (74, 114), (76, 116), (110, 116)]
    t.peindre(t.trait(trace), B)
    for (x, c) in ((28, V), (34, N), (40, V)):
        t.piece(t.ell(x, 108, x + 4, 112), c, ombre=0, lumiere=False)
    t.point(29, 108, B); t.point(41, 108, B)
    for x in (118, 128):
        t.piece(t.ell(x, 107, x + 7, 114), V, ombre=0)
        t.peindre(t.trait([(x + 3, 108), (x + 5, 110)]), N)
    t.piece(t.ell(116, 115, 120, 119), N, bord=N, lumiere=False)
    poing(t, 38, 104, 50, 114, vertical=True)
    # le bras levé, la main plaquée sur l'écouteur
    t.piece(t.fuseau([(98, 76), (120, 76), (116, 54)], 11, 9), V, ombre=2)
    # le casque : l'arceau, les deux écouteurs, l'antenne
    arceau = t.ell(52, 14, 108, 62) & ~t.ell(56, 18, 104, 58) & t.rect(0, 0, 176, 40)
    t.piece(arceau, V, ombre=0)
    t.piece(t.rect(76, 12, 84, 18), V, ombre=0)
    ant = t.trait([(108, 40), (122, 26), (130, 18)], 2)
    t.piece(ant, B, ombre=0)
    t.piece(t.ell(127, 13, 135, 21), V, ombre=0)
    t.point(129, 15, B)
    # la tête, la coupe au carré
    chev_d = t.poly([(54, 34), (104, 34), (108, 66), (98, 70), (60, 70), (50, 66)])
    t.piece(chev_d, V, ombre=3)
    tete = t.ell(60, 26, 98, 70)
    t.piece(tete, B, ombre=0)
    t.damier(tete & t.bord(tete, 1, 0, 2) & t.rect(0, 44, 176, 64), V)
    frange = t.poly([(58, 26), (100, 26), (100, 38), (96, 36), (92, 40), (86, 36), (80, 40), (74, 36), (68, 40), (62, 36),
                     (58, 40)]) & t.ell(56, 18, 102, 74)
    t.piece(frange, V, ombre=0)
    for x in (66, 76, 86, 94):
        t.peindre(t.trait([(x, 30), (x, 36)]), N)
    for (x0, x1) in ((46, 62), (96, 112)):
        ec = t.ell(x0, 38, x1, 62)
        t.piece(ec, V, ombre=2)
        t.peindre(t.ell(x0 + 4, 43, x1 - 4, 57), N)
        t.peindre(t.ell(x0 + 6, 46, x1 - 6, 54), B)
        t.peindre(t.ell(x0 + 7, 47, x1 - 7, 53), V)
    poing(t, 104, 42, 120, 60, vertical=True)
    # le visage : les yeux en coin, un sourcil haussé, les lèvres pincées d'attention
    t.peindre(t.courbe([(65, 42), (70, 40), (76, 41)], 2), N)
    t.peindre(t.courbe([(83, 40), (88, 37), (94, 39)], 2), N)
    t.oeil(64, 45, l=12, h=9, regard=(-2, 0), paupiere=2, cils=-1)
    t.oeil(82, 45, l=12, h=9, regard=(-2, 0), paupiere=2, cils=1)
    nez(t, [(77, 55), (82, 59), (81, 61), (76, 61)], narine=(78, 61))
    t.pixels(73, 64, """
:.........
.::::::::.
..:####:..
...::::...
""")
    joues(t, (64, 56, 70, 60), (88, 56, 94, 60))
    t.sol(161, cx=80)
    return t.image()


# ---------------------------------------------------------------- Lamia (Port-Aube, les Portes de la cité)
def lamia_v3():
    # la portière des Portes : adossée à la borne du quai, les bras croisés sur la liste des arrivants, la grande clé
    # passée dans la ceinture ; la cape tombe droit, le badge brille, un demi-sourire tranquille
    t = Toile()
    # la borne du quai, son voyant et son écran qui attend un nom
    for k in range(7):
        a = math.pi + k * math.pi / 6
        r0, r1 = 12, (18 if k % 2 == 0 else 15)
        t.peindre(t.trait([(140 + r0 * math.cos(a), 26 + r0 * math.sin(a)), (140 + r1 * math.cos(a), 26 + r1 * math.sin(a))]), B)
    borne = t.poly([(122, 36), (158, 36), (160, 150), (120, 150)])
    t.piece(borne, B, ombre=3)
    t.piece(t.rect(116, 148, 164, 158), V, ombre=2)
    t.piece(t.ell(132, 18, 148, 34) & t.rect(0, 0, 176, 30), V, ombre=0)
    t.piece(t.rect(120, 30, 160, 36), V, ombre=0)
    t.peindre(t.ell(136, 22, 144, 30) & t.rect(0, 0, 176, 28), B)
    ecran = t.rect(125, 42, 155, 66)
    t.piece(ecran, N, bord=N, lumiere=False)
    t.peindre(ecran & ~t.rect(126, 43, 154, 65), V)
    texte(t, 128, 46, "login", V)
    t.peindre(t.rect(148, 49, 148, 49) | t.rect(148, 47, 148, 47), V)
    texte(t, 128, 55, "_", B)
    for i in range(3):
        for j in range(3):
            t.piece(t.rect(128 + j * 9, 74 + i * 8, 133 + j * 9, 78 + i * 8), V, ombre=0, lumiere=False)
    t.peindre(t.rect(128, 100, 152, 102), N)
    t.hachures(t.rect(124, 108, 156, 144) & borne, V, 4)
    # les jambes croisées, nonchalantes
    j1 = t.poly([(76, 126), (90, 126), (88, 152), (78, 152)])
    t.piece(j1, V, ombre=2)
    j2 = t.fuseau([(98, 126), (88, 140), (72, 152)], 13, 9)
    t.piece(j2, V, ombre=2)
    t.peindre(t.courbe([(94, 132), (86, 142), (78, 148)]), N)
    for pts in ([(74, 150), (92, 150), (94, 158), (72, 158)], [(60, 148), (76, 150), (74, 158), (58, 156)]):
        s_ = t.poly(pts)
        t.piece(s_, V, ombre=0)
        t.damier(s_ & ~t.bord(s_, -1, -1, 1), N)
        t.peindre(s_ & (t.yy >= 157), B)
    # la queue de cheval, longue et ondulée, derrière
    queue = t.fuseau([(74, 46), (60, 62), (64, 82), (56, 100)], 12, 4)
    t.piece(queue, V, ombre=3, lumiere=False)
    for pts in ([(70, 52), (62, 66), (64, 80)], [(66, 72), (60, 90)]):
        t.peindre(t.courbe(pts), N)
    # la cape qui tombe droit, doublée de blanc, penchée vers la borne
    cape = t.poly([(70, 68), (114, 66), (122, 96), (118, 132), (60, 134), (62, 100)])
    t.piece(cape, V, ombre=4)
    doublure = t.poly([(114, 66), (122, 96), (118, 132), (110, 132), (112, 96), (106, 68)])
    t.piece(doublure, B, ombre=2)
    for pts in ([(66, 104), (64, 132)], [(76, 106), (76, 132)], [(100, 106), (102, 132)]):
        t.peindre(t.trait(pts), N)
    t.peindre(cape & (t.yy >= 128) & ~doublure, B)
    t.peindre(cape & (t.yy == 127) & ~doublure, N)
    for x in range(60, 112, 4):
        t.point(x, 130, V)
    # la ceinture et la grande clé passée dedans
    t.piece(t.poly([(60, 110), (116, 108), (116, 113), (60, 115)]), N, bord=N, lumiere=False)
    t.peindre(t.trait([(61, 112), (115, 110)]), V)
    cle = t.ell(94, 104, 106, 116) | t.trait([(100, 116), (102, 140)], 3) | t.rect(102, 130, 108, 132) | t.rect(102, 135, 106, 137)
    t.piece(cle, B, ombre=0)
    t.peindre(t.ell(97, 107, 103, 113), N)
    t.point(99, 108, V)
    # la capuche rabattue sur les épaules, et le col
    cap = t.ell(62, 58, 120, 80) & ~t.ell(72, 50, 110, 74)
    t.piece(cap, V, ombre=2)
    t.peindre(t.courbe([(68, 70), (90, 78), (114, 70)]), N)
    # les bras : les coudes, puis la liste et les avant-bras croisés
    for pts in ([(70, 74), (64, 86), (64, 98)], [(112, 74), (116, 86), (112, 98)]):
        m = t.piece(t.fuseau(pts, 12, 11), V, ombre=2)
        t.hachures(m & ~t.bord(m, -1, -1, 1) & ~t.bord(m, 1, 1, 2), N, 4)
    liste = t.poly([(66, 70), (82, 66), (88, 94), (72, 98)])
    t.piece(liste, B, ombre=0)
    t.piece(t.ell(62, 62, 84, 72) & t.rect(0, 0, 176, 68), B, ombre=0)
    t.peindre(t.courbe([(64, 66), (72, 64), (82, 66)]), N)
    for k in range(4):
        y = 72 + k * 5
        t.peindre(t.trait([(70 + k, y), (82 + k, y - 2)]) & (((t.xx) % 3) != 2), V if k % 2 else N)
        t.point(69 + k, y, N)
    m = t.piece(t.fuseau([(112, 96), (92, 94), (70, 90)], 11, 9), V, ombre=2)
    t.hachures(m & ~t.bord(m, -1, -1, 1) & ~t.bord(m, 1, 1, 2), N, 4)
    m = t.piece(t.fuseau([(64, 98), (86, 100), (106, 92)], 11, 9), V, ombre=2)
    t.hachures(m & ~t.bord(m, -1, -1, 1) & ~t.bord(m, 1, 1, 2), N, 4, sens=-1)
    t.piece(t.poly([(102, 88), (108, 86), (110, 94), (104, 96)]), B, ombre=0)
    poing(t, 104, 82, 116, 94, vertical=True)
    t.peindre(t.courbe([(74, 98), (86, 99), (96, 96)]), N)
    # le badge qui brille, épinglé au col
    badge = t.ell(98, 70, 108, 80)
    t.piece(badge, B, ombre=0)
    t.peindre(t.ell(100, 72, 106, 78), V)
    t.pixels(101, 73, ".o.\nooo\n.o.")
    t.etincelle(112, 64)
    # la tête, penchée vers la borne
    tete = t.ell(70, 22, 110, 68)
    t.piece(tete, B, ombre=0)
    t.damier(tete & t.bord(tete, 1, 0, 2) & t.rect(0, 40, 176, 60), V)
    t.piece(t.rect(68, 44, 76, 50), B, ombre=0)
    t.peindre(t.rect(70, 46, 74, 48), V)
    chev = t.poly([(68, 22), (112, 22), (114, 38), (106, 30), (100, 34), (92, 28), (82, 34), (74, 42), (68, 50)]) \
        & t.ell(66, 16, 114, 72)
    t.piece(chev, V, ombre=0)
    t.peindre(t.courbe([(76, 28), (90, 22), (104, 26)]) | t.courbe([(82, 34), (88, 28), (96, 28)]), N)
    t.peindre(t.trait([(78, 24), (86, 22)]), B)
    t.piece(t.fuseau([(110, 32), (114, 44), (112, 54)], 4, 1), V, ombre=0, lumiere=False)
    # le visage : paupières tranquilles, un demi-sourire
    t.peindre(t.courbe([(77, 39), (82, 37), (88, 38)], 2), N)
    t.peindre(t.courbe([(94, 38), (99, 36), (105, 38)], 2), N)
    t.oeil(76, 42, l=12, h=9, regard=(1, 0), paupiere=3, cils=-1)
    t.oeil(94, 42, l=12, h=9, regard=(1, 0), paupiere=3, cils=1)
    nez(t, [(90, 50), (96, 56), (94, 58), (89, 58)], narine=(92, 58))
    t.pixels(84, 60, """
............:
:..........:.
.::::::::::..
...:####::...
""")
    joues(t, (76, 54, 82, 58), (100, 54, 106, 58))
    t.a[:] = np.roll(t.a, -12, axis=1)
    t.sol(161, cx=86)
    return t.image()


# ---------------------------------------------------------------- la Logeuse (Lumen, les Ateliers)
def logeuse_v3():
    # la logeuse : petite et ronde, des bigoudis dans les cheveux, un châle croisé, le poing sur la hanche et l'air
    # de qui sait tout ; le gros trousseau des chambres à la ceinture, le registre des pensionnaires sous le bras
    t = Toile()
    # la robe ronde, blanche, semée de fleurs
    robe = t.ell(42, 74, 134, 166) & t.rect(0, 0, 176, 152)
    t.piece(robe, B, ombre=4)
    rnd = random.Random(5)
    for (x, y) in [(56, 124), (72, 138), (90, 128), (108, 140), (120, 122), (64, 108), (84, 146), (100, 112),
                   (116, 136), (52, 140)]:
        t.pixels(x - 2, y - 2, ".#.\n#:#\n.#.")
    t.peindre(robe & (t.yy >= 146), V)
    t.peindre(robe & (t.yy == 145), N)
    for x in range(46, 132, 6):
        t.peindre(t.ell(x, 147, x + 4, 151), B)
    # les pieds, petits, sous la robe
    for x0 in (66, 94):
        p_ = t.poly([(x0, 152), (x0 + 16, 152), (x0 + 18, 159), (x0 - 2, 159)])
        t.piece(p_, V, ombre=0)
        t.damier(p_ & ~t.bord(p_, -1, -1, 1), N)
        t.peindre(p_ & (t.yy >= 158), B)
    # le tablier
    tablier = t.poly([(70, 104), (106, 104), (112, 140), (64, 140)])
    t.piece(tablier, B, ombre=2)
    t.peindre(tablier & ~t.poly([(72, 106), (104, 106), (109, 138), (67, 138)]), V)
    poche = t.poly([(78, 118), (98, 118), (98, 130), (78, 130)])
    t.peindre(poche & ~t.rect(79, 119, 97, 129), N)
    t.peindre(t.trait([(80, 122), (96, 122)]) & (((t.xx) % 2) == 0), V)
    # le châle vert, croisé sur la poitrine, frangé
    chale = t.poly([(46, 78), (130, 78), (122, 96), (96, 110), (88, 114), (80, 110), (54, 96)])
    t.piece(chale, V, ombre=3)
    t.peindre(t.trait([(52, 82), (88, 112)]) | t.trait([(124, 82), (88, 112)]), N)
    t.hachures(chale & ~t.bord(chale, -1, -1, 2), N, 5)
    for x in range(82, 96, 2):
        t.peindre(t.trait([(x, 112), (x - 1, 120)]), B)
    t.piece(t.ell(84, 104, 92, 112), B, ombre=0)
    t.point(88, 108, V)
    # le trousseau à la ceinture
    anneau = t.ell(100, 112, 116, 128) & ~t.ell(103, 115, 113, 125)
    t.piece(anneau, B, ombre=0)
    for (a, b) in [((102, 126), (98, 140)), ((108, 128), (108, 144)), ((114, 126), (118, 140))]:
        t.piece(t.trait([a, b], 2), B, ombre=0)
        t.piece(t.rect(b[0], b[1] - 4, b[0] + 3, b[1] - 3), B, ombre=0)
        t.piece(t.rect(b[0], b[1] - 1, b[0] + 2, b[1]), B, ombre=0)
    # le bras sur la hanche (coude en dehors)
    t.piece(t.fuseau([(118, 82), (136, 88), (152, 98)], 13, 11), V, ombre=2)
    t.piece(t.fuseau([(152, 98), (140, 108), (126, 110)], 11, 9), V, ombre=2)
    t.peindre(t.courbe([(146, 92), (150, 98), (146, 104)]), N)
    t.piece(t.poly([(124, 104), (130, 104), (130, 114), (124, 116)]), B, ombre=0)
    poing(t, 112, 104, 126, 118)
    # le registre des pensionnaires, sous l'autre bras
    reg = t.poly([(10, 90), (56, 82), (62, 122), (16, 130)])
    t.piece(reg, B, ombre=3)
    for (cx_, cy_) in [(10, 90), (56, 82), (16, 130), (62, 122)]:
        t.peindre(t.ell(cx_ - 6, cy_ - 6, cx_ + 6, cy_ + 6) & reg, V)
    tranche = t.poly([(16, 126), (62, 118), (63, 123), (17, 131)])
    t.piece(tranche, B, ombre=0)
    t.peindre(tranche & ((t.xx % 2) == 0), V)
    eti = t.poly([(20, 96), (46, 92), (48, 106), (22, 110)])
    t.piece(eti, V, ombre=0)
    texte(t, 24, 97, "reg", B)
    t.peindre(t.trait([(25, 105), (44, 102)]) & (((t.xx) % 2) == 0), B)
    t.piece(t.fuseau([(30, 128), (32, 138), (28, 144)], 3, 2), B, ombre=0, lumiere=False)
    t.piece(t.fuseau([(58, 82), (50, 98), (42, 112)], 13, 10), V, ombre=2)
    t.piece(t.poly([(36, 108), (44, 106), (46, 112), (38, 114)]), B, ombre=0)
    poing(t, 30, 108, 44, 122, vertical=True)
    # la tête ronde, le double menton
    tete = t.ell(56, 26, 112, 80)
    t.piece(tete, B, ombre=0)
    t.damier(tete & t.bord(tete, 1, 0, 3) & t.rect(0, 44, 176, 72), V)
    t.peindre(t.courbe([(74, 76), (84, 80), (94, 76)]), N)
    # les oreilles et les boucles d'oreille
    for x0 in (54, 107):
        o = t.ell(x0, 50, x0 + 7, 62)
        t.piece(o, B, ombre=0)
        t.piece(t.ell(x0 + 1, 62, x0 + 6, 67), V, ombre=0, lumiere=False)
        t.point(x0 + 3, 64, B)
    # les cheveux, en boucles serrées, et les bigoudis
    chev = t.ell(54, 16, 114, 50) & t.rect(0, 0, 176, 33)
    for x in range(56, 114, 7):
        chev |= t.ell(x, 28, x + 9, 38)
    chev |= t.poly([(54, 30), (56, 50), (62, 36)]) | t.poly([(114, 30), (112, 50), (106, 36)])
    t.piece(chev, V, ombre=2)
    for x in range(56, 112, 7):
        t.peindre(t.rect(x + 4, 33, x + 5, 34), N)
        t.point(x + 3, 30, B)
    t.peindre(t.courbe([(62, 24), (72, 20), (80, 26)]) | t.courbe([(88, 26), (98, 20), (108, 24)]), N)
    for (x, y) in [(58, 14), (72, 8), (86, 6), (100, 10)]:
        b_ = t.rect(x, y, x + 11, y + 7)
        t.piece(b_, B, ombre=0)
        t.rayures(b_ & ~t.bord(b_, -1, 0, 1) & ~t.bord(b_, 1, 0, 1), V, 3, 1)
        t.peindre(t.rect(x - 1, y + 3, x - 1, y + 4) | t.rect(x + 12, y + 3, x + 12, y + 4), B)
    t.piece(t.rect(108, 22, 117, 28), B, ombre=0)
    t.rayures(t.rect(109, 23, 116, 27), V, 3, 1)
    # le visage : un sourcil levé, les paupières lourdes de qui sait tout, le sourire en coin
    t.peindre(t.courbe([(66, 44), (72, 42), (79, 44)], 2), N)
    t.peindre(t.courbe([(88, 42), (94, 39), (101, 41)], 2), N)
    t.oeil(66, 47, l=13, h=9, regard=(2, 0), paupiere=3, cils=-1)
    t.oeil(88, 46, l=13, h=9, regard=(2, 0), paupiere=3, cils=1)
    nez(t, [(81, 54), (90, 61), (88, 64), (80, 64)], narine=(84, 64))
    t.pixels(74, 66, """
...............:
:............::.
.:::::::::::::..
...::####:::....
""")
    joues(t, (62, 60, 70, 66), (96, 60, 104, 66))
    t.peindre(t.trait([(64, 54), (62, 52)]) | t.trait([(103, 54), (105, 52)]), N)
    t.sol(161, cx=88)
    return t.image()


# ---------------------------------------------------------------- Lynn (Lumen, la Porte du Matin)
def lynn_v3():
    # la portière du Matin : grande cape à capuche, lunettes en demi-lune ; elle lit la liste des salles à ouvrir, si
    # longue qu'elle descend jusqu'au sol et s'y enroule ; le trousseau de clés pend à sa ceinture
    t = Toile()
    # la cape, longue et droite
    cape = t.poly([(54, 64), (100, 64), (112, 100), (118, 158), (40, 158), (44, 100)])
    t.piece(cape, V, ombre=4)
    for pts in ([(56, 100), (50, 156)], [(66, 104), (64, 156)], [(102, 104), (108, 156)]):
        t.peindre(t.trait(pts), N)
    ourlet = cape & (t.yy >= 150)
    t.peindre(ourlet, B)
    t.peindre(cape & (t.yy == 149), N)
    for x in range(40, 118, 6):
        t.peindre(t.rect(x, 152, x + 2, 155) & ourlet, V)
    for (x, y) in [(52, 112), (106, 116), (58, 134), (110, 138), (48, 146), (98, 144)]:
        t.etoile(x, y, B, 1)
    # la robe blanche, au milieu, et la ceinture aux clés
    robe = t.poly([(68, 96), (94, 96), (100, 148), (64, 148)])
    t.piece(robe, B, ombre=2)
    t.peindre(t.trait([(78, 126), (76, 146)]) | t.trait([(88, 126), (90, 146)]), V)
    t.piece(t.rect(62, 116, 100, 120), N, bord=N, lumiere=False)
    t.peindre(t.rect(63, 118, 99, 118), V)
    anneau = t.ell(70, 118, 82, 130) & ~t.ell(73, 121, 79, 127)
    t.piece(anneau, B, ombre=0)
    for (a_, b_) in [((72, 128), (68, 142)), ((77, 129), (78, 144)), ((81, 126), (88, 138))]:
        t.piece(t.trait([a_, b_], 2), B, ombre=0)
        t.piece(t.rect(b_[0] - 1, b_[1] - 3, b_[0] + 2, b_[1]), B, ombre=0)
    # la longue liste qui descend et s'enroule au sol
    rouleau = t.fuseau([(112, 108), (130, 124), (118, 140), (130, 152)], 14, 14)
    t.piece(rouleau, B, ombre=2)
    lig = rouleau & ~t.bord(rouleau, -1, 0, 3) & ~t.bord(rouleau, 1, 0, 3)
    t.peindre(lig & ((t.yy % 4) == 0) & ((t.xx % 7) != 0), V)
    boucle = t.ell(118, 142, 162, 162) & ~t.ell(126, 147, 154, 157)
    t.piece(boucle, B, ombre=2)
    t.peindre(boucle & ((t.xx % 5) == 0), V)
    t.piece(t.ell(154, 146, 168, 160), B, ombre=0)
    t.peindre(t.ell(158, 150, 164, 156) & ~t.ell(159, 151, 163, 155), N)
    # la capuche (le dos), avant la liste
    capuche = t.poly([(40, 80), (48, 40), (60, 18), (74, 6), (90, 8), (104, 24), (112, 50), (116, 80), (96, 78),
                      (78, 78), (58, 80)])
    t.piece(capuche, V, ombre=3)
    t.peindre(t.courbe([(60, 22), (50, 44), (46, 76)]), N)
    t.peindre(t.bord(capuche, 0, 1, 3) & (((t.xx + t.yy) % 2) == 0), B)
    # les bras, et la liste tenue à deux mains devant elle
    t.piece(t.fuseau([(102, 80), (114, 98), (122, 110)], 11, 9), V, ombre=2)
    t.piece(t.fuseau([(56, 80), (64, 102), (80, 114)], 12, 9), V, ombre=2)
    feuille = t.poly([(80, 80), (122, 76), (124, 114), (82, 116)])
    t.piece(feuille, B, ombre=0)
    t.piece(t.ell(78, 72, 126, 84) & ~t.ell(82, 75, 122, 82) & t.rect(0, 0, 176, 80), B, ombre=0)
    for k, txt in enumerate(["/boot", "/home", "/srv", "/mnt"]):
        texte(t, 86, 84 + k * 7, txt, N if k % 2 == 0 else V)
    for k in range(3):
        t.pixels(112, 84 + k * 7, "....o\n...o.\no.o..\n.o...".replace("o", ":"))
    t.peindre(t.rect(112, 105, 116, 109) & ~t.rect(113, 106, 115, 108), N)
    poing(t, 74, 108, 88, 122, vertical=True)
    poing(t, 116, 104, 130, 118, vertical=True)
    # le visage dans la capuche, bordé d'un galon blanc
    galon = t.ell(54, 22, 104, 76) & ~t.ell(58, 26, 100, 72) & t.rect(0, 0, 176, 74)
    t.piece(galon, B, ombre=0)
    visage = t.ell(58, 26, 100, 72)
    t.piece(visage, B, ombre=0)
    t.peindre(t.bord(visage, -1, 0, 1) | t.bord(visage, 0, -1, 1), N)
    t.damier(visage & t.bord(visage, 1, 0, 2) & t.rect(0, 44, 176, 66), V)
    chev = t.poly([(56, 22), (102, 22), (100, 36), (90, 32), (80, 38), (70, 32), (62, 40), (58, 50)]) & visage
    t.piece(chev, V, ombre=0, lumiere=False)
    t.peindre(t.courbe([(80, 27), (78, 35)]), N)
    t.peindre(t.courbe([(72, 28), (66, 34)]) | t.courbe([(88, 28), (94, 32)]), N)
    # sourcils hauts, regard baissé vers la liste, lunettes en demi-lune au bout du nez
    t.peindre(t.courbe([(64, 39), (69, 37), (75, 38)], 2), N)
    t.peindre(t.courbe([(82, 38), (87, 36), (93, 38)], 2), N)
    t.oeil(64, 42, l=12, h=8, regard=(1, 2), paupiere=3, cils=-1)
    t.oeil(82, 42, l=12, h=8, regard=(1, 2), paupiere=3, cils=1)
    nez(t, [(76, 49), (83, 56), (81, 58), (75, 58)], narine=(78, 58))
    for x0 in (63, 81):
        m = t.ell(x0, 44, x0 + 14, 60) & t.rect(0, 52, 176, 176)
        t.peindre(m & ~(t.ell(x0 + 1, 44, x0 + 13, 59) & t.rect(0, 53, 176, 176)), N)
        t.peindre(t.trait([(x0 + 9, 56), (x0 + 11, 55)]), V)
    t.peindre(t.trait([(77, 52), (81, 52)]), N)
    t.peindre(t.trait([(63, 52), (58, 49)]) | t.trait([(95, 52), (100, 49)]), N)
    t.pixels(71, 62, """
:.........:
.:::::::::.
...::##::..
""")
    joues(t, (62, 58, 66, 62), (94, 58, 98, 62))
    t.sol(161, cx=88)
    return t.image()


# ---------------------------------------------------------------- Maeva (Port-Aube, le Phare-Relais)
def maeva_v3():
    # la gardienne du phare : le ciré qui claque, les cheveux emportés par le vent ; campée face à la tempête, elle
    # lève haut sa lampe-tempête allumée, qui rayonne ; des traits de vent passent derrière elle
    t = Toile()
    # les traits de vent
    for (x0, x1, y) in [(124, 168, 84), (136, 172, 96), (128, 160, 108), (140, 170, 120), (118, 150, 132), (150, 174, 72)]:
        t.peindre(t.rect(x0, y, x1, y + 1), B)
        t.peindre(t.rect(x0 - 6, y, x0 - 3, y + 1), B)
    # les rayons de la lampe
    for k in range(12):
        a = k * math.pi / 6
        r0, r1 = 17, (26 if k % 2 == 0 else 21)
        if 0.6 < a < 1.8:
            continue
        t.peindre(t.trait([(34 + r0 * math.cos(a), 24 + r0 * math.sin(a)), (34 + r1 * math.cos(a), 24 + r1 * math.sin(a))]), B)
    # les cheveux longs, emportés par le vent, derrière la tête
    for pts, e in (([(88, 30), (116, 20), (148, 26)], 12), ([(94, 40), (124, 40), (154, 48)], 11),
                   ([(94, 52), (120, 58), (144, 70)], 9), ([(90, 62), (110, 70), (128, 84)], 7)):
        m = t.fuseau(pts, e, 2)
        t.piece(m, V, ombre=2, lumiere=False)
        t.peindre(t.courbe([(pts[0][0] + 4, pts[0][1]), pts[1], (pts[2][0] - 6, pts[2][1])]) & m, N)
    # les bottes, campées, l'une en avant
    for pts in ([(42, 146), (62, 144), (64, 158), (36, 158)], [(80, 146), (98, 146), (104, 158), (78, 158)]):
        b_ = t.poly(pts)
        t.piece(b_, V, ombre=0)
        t.damier(b_ & ~t.bord(b_, -1, -1, 1), N)
        t.peindre(b_ & (t.yy >= 157), B)
        t.peindre(t.rect(pts[0][0] + 2, pts[0][1] + 2, pts[1][0] - 2, pts[0][1] + 3), B)
    for (x0, x1) in ((46, 60), (82, 96)):
        t.piece(t.rect(x0, 134, x1, 146), V, ombre=2)
    # le ciré qui claque, la pointe emportée par le vent
    cire = t.poly([(60, 70), (96, 70), (104, 96), (112, 118), (132, 128), (150, 124), (138, 138), (118, 142), (100, 138),
                   (64, 140), (44, 138), (52, 104)])
    t.piece(cire, V, ombre=4)
    for pts in ([(66, 100), (58, 138)], [(80, 100), (82, 138)], [(98, 104), (112, 136)], [(106, 116), (130, 132)]):
        t.peindre(t.courbe([pts[0], ((pts[0][0] + pts[1][0]) // 2 + 3, (pts[0][1] + pts[1][1]) // 2), pts[1]]), N)
    bande = cire & (t.yy >= 126) & (t.yy <= 131)
    t.peindre(bande, B)
    t.peindre(bande & (((t.xx + t.yy) % 2) == 0) & (t.xx > 104), V)
    # la rangée de boutons à cabillots, le col relevé
    t.peindre(t.trait([(78, 76), (76, 124)]), N)
    for y in (84, 96, 108, 120):
        t.piece(t.rect(73, y, 81, y + 2), B, ombre=0)
    col = t.poly([(60, 70), (70, 62), (78, 72), (86, 62), (98, 70), (92, 80), (78, 76), (66, 80)])
    t.piece(col, V, ombre=2)
    t.piece(t.poly([(70, 62), (78, 72), (86, 62), (78, 66)]), B, ombre=0)
    # le bras le long du corps, poing serré
    t.piece(t.fuseau([(96, 76), (102, 96), (104, 110)], 11, 9), V, ombre=2)
    t.piece(t.rect(98, 106, 108, 109), B, ombre=0)
    poing(t, 96, 108, 110, 122, vertical=True)
    # le bras levé qui brandit la lampe-tempête
    bras = t.fuseau([(64, 76), (48, 62), (40, 46)], 12, 9)
    t.piece(bras, V, ombre=2)
    t.peindre(t.courbe([(54, 66), (50, 58)]), N)
    t.piece(t.poly([(34, 46), (46, 44), (48, 50), (36, 52)]), B, ombre=0)
    poing(t, 32, 36, 48, 50, vertical=True)
    # la lampe-tempête : anse, chapeau, globe de verre, flamme, réservoir
    t.peindre(t.ell(28, 0, 44, 16) & ~t.ell(30, 2, 42, 14) & t.rect(0, 0, 176, 8), B)
    t.piece(t.poly([(26, 10), (42, 10), (44, 14), (24, 14)]), V, ombre=0)
    globe = t.ell(24, 13, 44, 36)
    t.piece(globe, B, ombre=0)
    t.peindre(t.rect(24, 13, 44, 36) & globe & ((t.xx == 27) | (t.xx == 41)), V)
    flamme = t.fuseau([(34, 32), (31, 26), (34, 18)], 7, 1)
    t.piece(flamme, V, ombre=0, lumiere=False)
    t.peindre(t.fuseau([(34, 31), (33, 27), (34, 23)], 3, 1), B)
    t.peindre(t.trait([(28, 18), (28, 22)]), B)
    t.piece(t.rect(26, 34, 42, 38), V, ombre=0)
    t.peindre(t.rect(28, 36, 40, 36), B)
    # la tête, tournée vers la lampe
    tete = t.ell(60, 26, 100, 72)
    t.piece(tete, B, ombre=0)
    t.damier(tete & t.bord(tete, 1, 0, 2) & t.rect(0, 42, 176, 64), V)
    oreille = t.ell(92, 44, 100, 56)
    t.piece(oreille, B, ombre=0)
    t.peindre(t.courbe([(96, 47), (98, 50), (96, 53)]), N)
    chev = t.poly([(58, 26), (100, 20), (104, 44), (96, 38), (90, 32), (80, 30), (70, 34), (62, 42)]) & t.ell(56, 18, 104, 76)
    chev |= t.fuseau([(96, 24), (110, 16), (124, 14)], 10, 2)
    t.piece(chev, V, ombre=0)
    t.peindre(t.courbe([(66, 30), (80, 24), (96, 26)]) | t.courbe([(84, 26), (102, 20), (116, 18)]), N)
    t.peindre(t.trait([(68, 26), (78, 23)]), B)
    t.piece(t.fuseau([(62, 36), (58, 30), (54, 24)], 4, 1), V, ombre=0, lumiere=False)
    # le visage : sourcils décidés, yeux levés vers la lampe, sourire face à la tempête
    t.peindre(t.courbe([(64, 40), (70, 37), (76, 39)], 2), N)
    t.peindre(t.courbe([(80, 39), (85, 37), (90, 39)], 2), N)
    t.oeil(64, 43, l=12, h=9, regard=(-2, -1), cils=-1)
    t.oeil(80, 43, l=11, h=9, regard=(-2, -1), cils=1)
    nez(t, [(73, 51), (66, 58), (68, 60), (74, 60)], narine=(70, 59))
    t.pixels(66, 62, """
:.............:
.:::::::::::::.
.:ooooooooooo:.
..::#######::..
....:::::::....
""")
    joues(t, (62, 56, 66, 60), (84, 56, 90, 60))
    t.sol(161, cx=78)
    return t.image()


# ---------------------------------------------------------------- Mary (Lumen, les Ateliers des automates)
def mary_v3():
    # la mécanicienne des automates : foulard à pois, salopette, une tache de cambouis sur la joue ; la grosse clé
    # plate posée sur l'épaule ; à ses pieds, son petit automate à hublot l'imite, sa minuscule clé levée
    t = Toile()
    # la grosse clé plate, posée sur l'épaule, derrière la tête
    cle = t.fuseau([(50, 82), (36, 52), (24, 26)], 8, 7)
    machoire = t.ell(6, 2, 36, 32) & ~t.poly([(4, 0), (20, 0), (22, 12), (8, 18), (0, 14)])
    t.piece(cle | machoire, B, ombre=0)
    t.peindre(t.trait([(44, 76), (28, 36)]) & cle, V)
    t.peindre(t.ell(16, 12, 26, 22) & machoire, N)
    t.piece(t.ell(18, 14, 24, 20), B, ombre=0)
    # le petit automate à hublot, qui l'imite
    t.piece(t.trait([(140, 104), (140, 92)], 2), B, ombre=0)
    t.piece(t.ell(136, 86, 144, 94), V, ombre=0)
    t.point(138, 88, B)
    corps = t.poly([(124, 104), (156, 104), (158, 146), (122, 146)])
    t.piece(corps, V, ombre=3)
    t.piece(t.ell(122, 96, 158, 114) & t.rect(0, 0, 176, 106), V, ombre=0)
    hublot = t.ell(128, 106, 152, 130)
    t.piece(hublot, B, ombre=0)
    t.peindre(t.ell(131, 109, 149, 127), N)
    t.peindre(t.ell(132, 110, 148, 126), B)
    for a in range(0, 360, 45):
        x, y = 140 + 10.5 * math.cos(math.radians(a)), 118 + 10.5 * math.sin(math.radians(a))
        t.point(int(round(x)), int(round(y)), V)
    t.pixels(134, 114, ".::...::.\n:o#:.:o#:\n.::...::.\n.........\n..:...:..\n...:::...")
    for x in range(124, 157, 4):
        t.point(x, 140, B)
    t.piece(t.rect(126, 146, 134, 156), V, ombre=0)
    t.piece(t.rect(146, 146, 154, 156), V, ombre=0)
    for x0 in (122, 142):
        p_ = t.rect(x0, 154, x0 + 16, 159)
        t.piece(p_, B, ombre=0)
        t.peindre(p_ & (((t.xx) % 3) == 0) & (t.yy >= 157), V)
    t.piece(t.fuseau([(126, 112), (118, 122), (118, 134)], 5, 4), V, ombre=0)
    t.piece(t.ell(114, 132, 122, 140), B, ombre=0)
    t.piece(t.fuseau([(154, 112), (164, 104), (166, 92)], 5, 4), V, ombre=0)
    petite = t.fuseau([(166, 88), (164, 72)], 3, 3) | (t.ell(156, 60, 172, 76) & ~t.poly([(160, 56), (168, 56), (167, 66), (162, 66)]))
    t.piece(petite, B, ombre=0)
    t.peindre(t.ell(162, 66, 166, 70), N)
    t.piece(t.ell(162, 86, 170, 94), B, ombre=0)
    t.peindre(t.trait([(152, 66), (148, 62)]) | t.trait([(152, 76), (147, 76)]), B)
    # les jambes de la salopette et les chaussures de sécurité
    for (x0, x1) in ((50, 66), (72, 88)):
        j = t.poly([(x0, 116), (x1, 116), (x1 + 1, 150), (x0 - 1, 150)])
        t.piece(j, V, ombre=2)
        t.peindre(t.trait([((x0 + x1) // 2, 120), ((x0 + x1) // 2, 148)]), N)
        t.piece(t.rect(x0 - 1, 146, x1 + 1, 149), B, ombre=0)
    for pts in ([(44, 150), (66, 150), (68, 160), (40, 160)], [(70, 150), (92, 150), (96, 160), (70, 160)]):
        s_ = t.poly(pts)
        t.piece(s_, V, ombre=0)
        t.damier(s_ & ~t.bord(s_, -1, -1, 1), N)
        t.peindre(s_ & (t.yy >= 159), B)
    # la chemise blanche, la salopette verte et sa bavette
    chemise = t.poly([(46, 72), (92, 72), (96, 104), (42, 104)])
    t.piece(chemise, B, ombre=3)
    t.rayures(chemise & ~t.bord(chemise, -1, -1, 1) & ~t.bord(chemise, 1, 1, 3), V, 5, 1)
    salo = t.poly([(52, 84), (86, 84), (92, 118), (46, 118)])
    t.piece(salo, V, ombre=3)
    for pts in ([(52, 86), (52, 70)], [(86, 86), (88, 70)]):
        t.piece(t.trait(pts, 4), V, ombre=0)
    for (x, y) in ((50, 84), (84, 84)):
        t.piece(t.ell(x, y, x + 5, y + 5), B, ombre=0)
        t.point(x + 2, y + 2, N)
    poche = t.rect(60, 92, 78, 104)
    t.peindre(poche & ~t.rect(61, 93, 77, 103), N)
    t.piece(t.rect(64, 86, 66, 94), B, ombre=0)
    t.piece(t.rect(70, 88, 72, 94), B, ombre=0)
    t.peindre(t.rect(64, 86, 66, 87), N)
    t.peindre(t.trait([(69, 116), (69, 104)]), N)
    t.peindre(t.trait([(48, 108), (90, 108)]) & (((t.xx) % 3) == 0), B)
    # le bras qui tient la clé sur l'épaule
    t.piece(t.fuseau([(52, 76), (40, 92), (44, 84)], 11, 9), B, ombre=2)
    poing(t, 40, 72, 56, 86, vertical=True)
    # l'autre bras, qui tend la burette vers l'automate
    t.piece(t.fuseau([(90, 76), (100, 92), (106, 100)], 10, 8), B, ombre=2)
    t.piece(t.rect(98, 92, 106, 96), V, ombre=0)
    # la tête
    tete = t.ell(50, 24, 92, 70)
    t.piece(tete, B, ombre=0)
    t.damier(tete & t.bord(tete, 1, 0, 2) & t.rect(0, 40, 176, 62), V)
    for pts in ([(54, 40), (48, 48), (50, 56)], [(88, 40), (94, 48), (92, 56)]):
        t.piece(t.fuseau(pts, 6, 2), V, ombre=0, lumiere=False)
    # le foulard à pois, noué sur le dessus
    foulard = t.ell(48, 14, 94, 52) & t.rect(0, 0, 176, 36)
    noeud = t.fuseau([(70, 16), (60, 6), (52, 4)], 7, 3) | t.fuseau([(72, 16), (82, 4), (90, 2)], 7, 3)
    t.piece(noeud, V, ombre=0)
    t.piece(foulard, V, ombre=2)
    t.piece(t.ell(66, 12, 76, 20), V, ombre=0)
    for (x, y) in [(56, 26), (64, 20), (74, 26), (84, 22), (90, 30), (60, 32), (80, 32), (55, 8), (86, 6)]:
        t.peindre(t.ell(x - 1, y - 1, x + 1, y + 1), B)
    t.peindre(t.rect(49, 34, 93, 36) & foulard, B)
    # le visage : un clin d'œil complice, la tache de cambouis, grand sourire
    t.peindre(t.courbe([(56, 40), (61, 37), (67, 39)], 2), N)
    t.peindre(t.courbe([(74, 38), (79, 36), (85, 38)], 2), N)
    t.oeil(56, 42, l=12, h=9, regard=(2, 0), cils=-1)
    t.peindre(t.courbe([(74, 46), (79, 43), (85, 46)], 2), N)
    t.peindre(t.trait([(86, 46), (88, 45)]), N)
    nez(t, [(70, 48), (76, 55), (74, 57), (69, 57)], narine=(72, 57))
    t.pixels(60, 59, """
:...............:
.:::::::::::::::.
.:ooooooooooooo:.
..:ooooooooooo:..
...::#######::...
.....:::::::.....
""")
    t.pixels(79, 52, ".##.\n####\n.#.#\n...#")
    joues(t, (54, 54, 60, 58))
    # la burette, tenue par l'anse
    burette = t.ell(98, 112, 116, 130) & t.rect(0, 116, 176, 176)
    t.piece(burette, V, ombre=2)
    t.piece(t.trait([(114, 118), (124, 104)], 2), V, ombre=0)
    t.piece(t.rect(103, 109, 111, 114), V, ombre=0)
    t.peindre(t.ell(98, 98, 116, 122) & ~t.ell(100, 100, 114, 120) & t.rect(0, 0, 176, 112), B)
    poing(t, 100, 96, 112, 106, vertical=True)
    t.pixels(124, 104, ".:o:\n:oo:\n.::.")
    t.sol(161, cx=96)
    return t.image()


# ---------------------------------------------------------------- Mehdi (Port-Aube, la Halle)
def mehdi_v3():
    # l'organisateur de la fête : grand et dégingandé, une écharpe qui flotte, un large sourire ; il tend à bout de
    # bras une guirlande de lampions, d'une main à l'autre, comme on présente une banderole
    t = Toile()
    # les longues jambes et les baskets
    for pts in ([(74, 110), (84, 110), (80, 150), (70, 150)], [(90, 110), (100, 110), (106, 150), (96, 150)]):
        j = t.poly(pts)
        t.piece(j, V, ombre=2)
    t.peindre(t.trait([(79, 114), (75, 148)]) | t.trait([(95, 114), (101, 148)]), N)
    for pts in ([(60, 148), (82, 146), (84, 158), (58, 158)], [(94, 146), (114, 148), (120, 158), (94, 158)]):
        s_ = t.poly(pts)
        t.piece(s_, B, ombre=0)
        t.damier(t.bord(s_, 0, 1, 1), V)
        t.pixels(pts[0][0] + 8, pts[0][1] + 3, ":.:.:\n.:.:.")
    t.peindre(t.trait([(58, 158), (120, 158)]), N)
    # le maillot rayé et la veste ouverte
    maillot = t.poly([(72, 62), (104, 62), (106, 112), (70, 112)])
    t.piece(maillot, B, ombre=3)
    t.rayures(maillot & ~t.bord(maillot, -1, -1, 1), V, 6, 2, vertical=False)
    for pts in ([(70, 62), (80, 62), (82, 112), (68, 112)], [(96, 62), (106, 62), (108, 112), (94, 112)]):
        t.piece(t.poly(pts), V, ombre=2)
    t.peindre(t.trait([(80, 64), (82, 110)]) | t.trait([(96, 64), (94, 110)]), N)
    # les bras grands ouverts
    for pts in ([(74, 66), (52, 70), (30, 66)], [(102, 66), (124, 70), (146, 64)]):
        m = t.piece(t.fuseau(pts, 11, 8), V, ombre=2)
    poing(t, 18, 58, 32, 72, vertical=True)
    poing(t, 144, 56, 158, 70, vertical=True)
    # la guirlande : la cordelette et ses lampions
    corde = bez = [(24, 64), (60, 104), (116, 104), (152, 62)]
    t.piece(t.courbe(corde, 2), B, ombre=0)
    from portrait_v3 import bezier
    pts = bezier(corde, 40)
    for i, k in enumerate((5, 12, 20, 28, 35)):
        x, y = pts[k]
        x, y = int(x), int(y)
        t.peindre(t.trait([(x, y), (x, y + 4)]), B)
        lamp = t.ell(x - 8, y + 4, x + 8, y + 22)
        c = V if i % 2 == 0 else B
        t.piece(lamp, c, ombre=2 if c == V else 0)
        for dx in (-4, 0, 4):
            t.peindre(t.courbe([(x + dx // 2, y + 5), (x + dx, y + 13), (x + dx // 2, y + 21)]) & lamp, N if c == V else V)
        t.piece(t.rect(x - 4, y + 3, x + 4, y + 5), N if c == B else B, ombre=0, lumiere=False, bord=N)
        t.piece(t.rect(x - 4, y + 21, x + 4, y + 23), N if c == B else B, ombre=0, lumiere=False, bord=N)
        if i == 2:
            t.pixels(x - 3, y + 8, "..o..\n.ooo.\n..o..\no.o.o\n.ooo.")
    for (x, y) in [(40, 46), (128, 44), (10, 92), (166, 90), (88, 120)]:
        t.etincelle(x, y)
    # l'écharpe, nouée au cou, qui flotte au vent
    ech = t.fuseau([(98, 66), (120, 54), (140, 60), (164, 44)], 9, 5)
    t.piece(ech, B, ombre=2)
    for x in range(104, 162, 8):
        t.peindre(t.trait([(x, 40), (x + 2, 70)]) & ech, V)
    for k in range(4):
        t.peindre(t.trait([(164 + k, 40 + k * 2), (170 + k, 38 + k * 2)]), B)
    tour = t.ell(72, 58, 106, 72)
    t.piece(tour, B, ombre=2)
    t.rayures(tour & ~t.bord(tour, -1, -1, 1), V, 8, 2)
    t.piece(t.fuseau([(80, 68), (76, 82), (80, 92)], 8, 6), B, ombre=2)
    t.rayures(t.fuseau([(80, 68), (76, 82), (80, 92)], 6, 4), V, 8, 2, vertical=False)
    for x in range(76, 84, 2):
        t.peindre(t.trait([(x, 93), (x, 96)]), B)
    # la tête
    for x0 in (62, 106):
        o = t.ell(x0, 36, x0 + 8, 50)
        t.piece(o, B, ombre=0)
        t.peindre(t.courbe([(x0 + 4, 40), (x0 + 2, 43), (x0 + 4, 46)]), N)
    tete = t.ell(66, 14, 110, 66)
    t.piece(tete, B, ombre=0)
    t.damier(tete & t.bord(tete, 1, 0, 2) & t.rect(0, 34, 176, 58), V)
    # la mèche en houppe
    chev = t.ell(64, 4, 112, 40) & t.rect(0, 0, 176, 24)
    chev |= t.poly([(64, 20), (112, 20), (110, 30), (100, 24), (90, 28), (80, 24), (70, 30), (66, 34)])
    for x in range(66, 108, 7):
        chev |= t.fuseau([(x + 2, 14), (x + 6, 4), (x + 12, 0)], 8, 1)
    t.piece(chev, V, ombre=2)
    for x in range(70, 106, 7):
        t.peindre(t.courbe([(x, 22), (x + 3, 14), (x + 8, 8)]), N)
    t.peindre(t.trait([(70, 12), (78, 6)]), B)
    # le visage : sourcils hauts, yeux rieurs, très grand sourire
    t.peindre(t.courbe([(72, 32), (77, 29), (83, 31)], 2), N)
    t.peindre(t.courbe([(93, 31), (98, 29), (104, 32)], 2), N)
    t.oeil(72, 35, l=12, h=9, regard=(0, 0))
    t.oeil(92, 35, l=12, h=9, regard=(0, 0))
    for x0 in (72, 92):
        t.peindre(t.courbe([(x0 + 1, 46), (x0 + 6, 48), (x0 + 11, 46)]), N)
    nez(t, [(86, 42), (92, 49), (90, 51), (85, 51)], narine=(88, 51))
    t.pixels(75, 53, """
:........................:
.::::::::::::::::::::::::.
.:oooooooooooooooooooooo:.
..:oooooooooooooooooooo:..
...::########:#######::...
.....::::::::::::::::.....
""")
    joues(t, (69, 48, 75, 52), (100, 48, 106, 52))
    t.sol(161, cx=88)
    return t.image()


PORTRAITS = {
    "item_imprimeur.gif": imprimeur_v3, "item_john.gif": john_v3, "item_kamal.gif": kamal_v3,
    "item_kathleen.gif": kathleen_v3, "item_kay.gif": kay_v3, "item_klara.gif": klara_v3,
    "item_lamia.gif": lamia_v3, "item_logeuse.gif": logeuse_v3, "item_lynn.gif": lynn_v3,
    "item_maeva.gif": maeva_v3, "item_mary.gif": mary_v3, "item_mehdi.gif": mehdi_v3,
}


if __name__ == "__main__":
    noms = sys.argv[1:] or list(PORTRAITS)
    for nom in noms:
        finir(nom, PORTRAITS[nom]())
    print(len(noms), "portraits")
