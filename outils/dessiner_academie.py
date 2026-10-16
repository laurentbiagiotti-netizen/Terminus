"""Dessine l'Académie des Arcanes (chapitre 4) : le grand hall, les huit ailes et les portraits des huit maîtres.

Même style que les chapitres précédents (pixel art 1 bit épais : noir, vert, blanc ; dessiner_lieux.finir pose
l'image dans le cadre d'origine). Chaque aile a son décor, chaque maître un objet qui dit son école :
  Runes (Henry) : un mur de runes et un tamis       Divination (Alfred) : un prisme qui découpe la lumière en colonnes
  Transmutation (Lee) : un alambic et une plume     Grimoires (Stephen) : un grimoire relié en arbre
  Alchimie (Doug) : des alambics reliés de tuyaux   Chronomancie (Paul) : des sabliers et une roue d'horloge
  Archives (Andrew) : un miroir et une aiguille     Invocation (Brian) : un tableau noir et un cercle d'invocation
Usage : python3 outils/dessiner_academie.py [nom...]
"""
import os, sys, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from dessiner_lieux import toile, finir, N, V, B, W, H  # noqa: E402
from dessiner_fantasy import piece, tramer, briques, arche, etoiles, lune, flamme, torche, etagere, livres  # noqa: E402


# ------------------------------------------------------------------
# Petites briques
# ------------------------------------------------------------------

def colonne(d, x, y0, y1, w=12):
    d.rectangle([x - w // 2 - 3, y0, x + w // 2 + 3, y0 + 5], fill=B)
    d.rectangle([x - w // 2, y0 + 5, x + w // 2, y1 - 5], fill=B)
    for k in range(x - w // 2 + 3, x + w // 2 - 1, 4):
        d.line([(k, y0 + 7), (k, y1 - 7)], fill=N)
    d.rectangle([x - w // 2 - 3, y1 - 5, x + w // 2 + 3, y1], fill=B)


def sablier(d, x, y, h=26, w=16, plein=0.5):
    d.rectangle([x - w // 2 - 2, y, x + w // 2 + 2, y + 3], fill=B)
    d.rectangle([x - w // 2 - 2, y + h - 3, x + w // 2 + 2, y + h], fill=B)
    m = y + h // 2
    d.polygon([(x - w // 2, y + 3), (x + w // 2, y + 3), (x + 1, m), (x - 1, m)], outline=B)
    d.polygon([(x - w // 2, y + h - 3), (x + w // 2, y + h - 3), (x + 1, m), (x - 1, m)], outline=B)
    hs = int((h // 2 - 4) * plein)
    d.polygon([(x - w // 2 + 2 + hs // 2, y + h - 4 - hs), (x + w // 2 - 2 - hs // 2, y + h - 4 - hs), (x + w // 2 - 2, y + h - 4), (x - w // 2 + 2, y + h - 4)], fill=V)
    d.line([(x, m), (x, y + h - 4 - hs)], fill=V)


def alambic(d, x, y, r=12):
    d.ellipse([x - r, y - r, x + r, y + r], fill=B)
    d.ellipse([x - r + 3, y - r + 3, x + r - 3, y + r - 3], fill=N)
    d.chord([x - r + 3, y - r + 3, x + r - 3, y + r - 3], 20, 160, fill=V)
    d.rectangle([x - 3, y - r - 10, x + 3, y - r + 1], fill=B)


def visage(d, cx, cy, r=24, yeux=True):
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=B)
    if yeux:
        d.ellipse([cx - 11, cy - 4, cx - 5, cy + 2], fill=N)
        d.ellipse([cx + 5, cy - 4, cx + 11, cy + 2], fill=N)
    d.line([(cx - 7, cy + 12), (cx + 7, cy + 12)], fill=N, width=2)


def robe(d, cx, haut=84, c=V):
    d.rectangle([cx - 8, haut - 8, cx + 8, haut + 2], fill=B)
    d.polygon([(cx - 36, haut), (cx + 36, haut), (cx + 52, 168), (cx - 52, 168)], fill=c)
    d.polygon([(cx - 12, haut), (cx, haut + 18), (cx + 12, haut)], fill=B)


def texte(d, x, y, t, c=B):
    d.text((x, y), t, fill=c)


def salle(d, x0, y0, x1, y1, sol=V):
    """La pièce en perspective des chapitres précédents, avec un dallage au sol et une bande hachurée devant."""
    piece(d, x0, y0, x1, y1, sol=sol)
    prof = H - y1
    for k in range(1, 4):
        t = (k / 4) ** 1.6
        y = int(y1 + t * prof)
        d.line([(int(x0 * (1 - t)) + 1, y), (int(x1 + (W - x1) * t) - 1, y)], fill=N)
    for k in range(1, 6):
        xa = x0 + (x1 - x0) * k / 6
        d.line([(xa, y1 + 1), (W * k / 6, H - 1)], fill=N)
    tramer(d, 2, H - 9, W - 3, H - 2, c=N, pas=3)


# ------------------------------------------------------------------
# Le grand hall et les huit ailes
# ------------------------------------------------------------------

def academie():
    """Le grand hall : des colonnes, des grimoires qui flottent, l'horloge qui file vers minuit, l'escalier."""
    im, d = toile()
    salle(d, 30, 18, 146, 112)
    for x in (44, 132):
        colonne(d, x, 22, 112)
    # l'horloge, aiguilles presque sur minuit
    d.ellipse([70, 24, 106, 60], fill=B); d.ellipse([73, 27, 103, 57], fill=N)
    for k in range(12):
        a = k * math.pi / 6
        d.point((88 + 12 * math.sin(a), 42 - 12 * math.cos(a)), fill=B)
    d.line([(88, 42), (88, 30)], fill=V, width=2)
    d.line([(88, 42), (85, 33)], fill=B, width=2)
    # les grimoires qui flottent
    for x, y in [(60, 70), (110, 66), (86, 82)]:
        d.polygon([(x - 9, y), (x, y - 4), (x + 9, y), (x, y + 4)], fill=B)
        d.line([(x, y - 4), (x, y + 4)], fill=N)
        d.point((x - 5, y + 7), fill=V); d.point((x + 6, y + 8), fill=V)
    # l'escalier qui descend
    for k in range(5):
        d.rectangle([66 + k * 4, 112 + k * 9, 110 - k * 4, 116 + k * 9], fill=B)
    torche(d, 24, 70); torche(d, 152, 70)
    return im


def aile_runes():
    """Les Runes : un mur couvert de signes d'expressions régulières, un tamis qui ne garde que les bonnes lignes."""
    im, d = toile()
    salle(d, 26, 16, 150, 110, sol=V)
    briques(d, 30, 20, 146, 106, h=10, w=24)
    for i, t in enumerate(["^ $", "[0-9]+", "(a|b)", ".*"]):
        x, y = 40 + (i % 2) * 54, 30 + (i // 2) * 36
        d.rectangle([x, y, x + 44, y + 22], fill=N, outline=V)
        lg = d.textlength(t)
        texte(d, x + 22 - lg / 2, y + 5, t, V if i in (0, 3) else B)
    # le tamis, sur un trépied, des lignes qui tombent
    d.ellipse([60, 120, 116, 136], fill=B); d.ellipse([64, 122, 112, 134], fill=N)
    for x in range(66, 112, 5):
        d.line([(x, 124), (x, 132)], fill=V)
    for x in (66, 88, 110):
        d.line([(x, 134), (x - 6 + (x - 88) // 4, 162)], fill=B, width=2)
    for x, y in [(78, 144), (94, 152), (84, 160)]:
        d.line([(x, y), (x + 6, y)], fill=V)
    return im


def aile_divination():
    """La Divination : un prisme de cristal sur un registre ; la lumière en ressort découpée en colonnes."""
    im, d = toile()
    etoiles(d, n=20, graine=11, ymax=60)
    lune(d, 150, 20, 9)
    d.polygon([(0, 120), (176, 120), (176, 170), (0, 170)], fill=V)
    d.rectangle([20, 116, 172, 124], fill=B)                                     # la table
    d.rectangle([28, 124, 34, 160], fill=B); d.rectangle([158, 124, 164, 160], fill=B)
    d.polygon([(70, 112), (88, 70), (106, 112)], fill=B, outline=N)              # le prisme
    d.polygon([(78, 108), (88, 84), (98, 108)], fill=N)
    d.line([(10, 86), (80, 92)], fill=B, width=2)                                # le rayon qui entre
    for k in range(3):                                                           # les colonnes qui sortent
        x = 118 + k * 22
        d.line([(98, 96 + k * 2), (x, 100)], fill=V if k % 2 == 0 else B, width=2)
        d.rectangle([x - 8, 100, x + 8, 115], fill=N, outline=V if k % 2 == 0 else B)
        texte(d, x - 5, 102, "$" + str(k + 1), V if k % 2 == 0 else B)
    return im


def aile_transmutation():
    """La Transmutation : un alambic qui fume, et une plume qui change une ligne en une autre."""
    im, d = toile()
    salle(d, 28, 18, 148, 108)
    alambic(d, 56, 72, 18)
    d.line([(56, 44), (78, 34), (100, 50)], fill=B, width=3)                     # le col de cygne
    for k in range(3):
        d.arc([46 + k * 6, 22 - k * 4, 60 + k * 6, 36 - k * 4], 180, 360, fill=B)
    # la page : une ligne avant, la même après
    d.rectangle([96, 54, 146, 100], fill=B)
    texte(d, 100, 58, "s/a/b/", N)
    d.line([(100, 74), (140, 74)], fill=N)
    texte(d, 100, 80, "=> b", V)
    d.line([(150, 30), (128, 66)], fill=B, width=3)                              # la plume
    d.polygon([(150, 30), (160, 20), (156, 36)], fill=V)
    d.rectangle([20, 112, 156, 118], fill=B)
    return im


def aile_grimoires():
    """Les Grimoires : des rayonnages, et un grimoire ouvert dont les pages poussent en arbre (un JSON)."""
    im, d = toile()
    salle(d, 24, 14, 152, 104)
    etagere(d, 28, 18, 70, 102, rangs=4, graine=21)
    etagere(d, 106, 18, 148, 102, rangs=4, graine=23)
    # le grimoire ouvert, l'arbre au-dessus
    d.polygon([(54, 140), (88, 132), (122, 140), (122, 160), (88, 152), (54, 160)], fill=B)
    d.line([(88, 132), (88, 152)], fill=N, width=2)
    d.line([(88, 132), (88, 100)], fill=V, width=2)
    for (x0, y0, x1, y1) in [(88, 112, 72, 98), (88, 112, 104, 98), (72, 98, 64, 84), (72, 98, 80, 84), (104, 98, 112, 84)]:
        d.line([(x0, y0), (x1, y1)], fill=V, width=2)
    texte(d, 76, 70, "{ }", B)
    for x, y in [(64, 84), (80, 84), (112, 84)]:
        d.ellipse([x - 3, y - 3, x + 3, y + 3], fill=B)
    return im


def aile_alchimie():
    """L'Alchimie : trois alambics reliés par des tuyaux de cuivre, un liquide vert qui passe de l'un à l'autre."""
    im, d = toile()
    salle(d, 22, 16, 154, 106)
    for x in (44, 88, 132):
        alambic(d, x, 92, 16)
    d.line([(44, 66), (44, 52), (88, 52), (88, 66)], fill=B, width=3)
    d.line([(88, 52), (132, 52), (132, 66)], fill=B, width=3)
    for x in (58, 70, 102, 114):
        d.rectangle([x, 51, x + 3, 53], fill=V)
    d.rectangle([14, 112, 162, 118], fill=B)
    for x in (24, 152):
        d.rectangle([x - 3, 118, x + 3, 160], fill=B)
    return im


def aile_chronomancie():
    """La Chronomancie : une grande roue d'horloge, trois sabliers (timer, at, cron) sur une table."""
    im, d = toile()
    salle(d, 24, 14, 152, 104)
    d.ellipse([54, 20, 122, 88], fill=B); d.ellipse([60, 26, 116, 82], fill=N)
    for k in range(12):
        a = k * math.pi / 6
        d.line([(88 + 22 * math.sin(a), 54 - 22 * math.cos(a)), (88 + 26 * math.sin(a), 54 - 26 * math.cos(a))], fill=V if k % 3 == 0 else B, width=2)
    d.line([(88, 54), (88, 34)], fill=B, width=3); d.line([(88, 54), (100, 60)], fill=V, width=2)
    d.rectangle([20, 118, 156, 124], fill=B)
    for i, x in enumerate((50, 88, 126)):
        sablier(d, x, 90, 28, 18, plein=[0.2, 0.6, 0.9][i])
    return im


def aile_archives():
    """Les Archives : un grand miroir qui reflète une pile de dossiers, et une aiguille qui recoud une page."""
    im, d = toile()
    salle(d, 24, 14, 152, 104)
    d.ellipse([34, 22, 90, 104], fill=B); d.ellipse([39, 27, 85, 99], fill=N)     # le miroir
    for k in range(4):
        d.rectangle([48, 44 + k * 12, 76, 52 + k * 12], outline=V)
    d.line([(46, 36), (54, 30)], fill=B)
    d.rectangle([58, 104, 66, 128], fill=B)
    # la page épinglée et l'aiguille
    d.rectangle([104, 34, 146, 96], fill=B)
    for y in range(42, 92, 8):
        d.line([(108, y), (142, y)], fill=N)
    texte(d, 108, 60, "-  +", V)
    d.line([(96, 104), (138, 70)], fill=V, width=2)
    d.ellipse([136, 66, 142, 72], outline=B)
    d.arc([96, 96, 130, 124], 180, 330, fill=B)
    d.rectangle([20, 128, 156, 132], fill=B)
    return im


def aile_invocation():
    """L'Invocation : un pupitre et un tableau noir couvert d'un script, un cercle d'invocation tracé au sol."""
    im, d = toile()
    salle(d, 22, 12, 154, 96)
    d.rectangle([34, 14, 142, 82], fill=B); d.rectangle([38, 18, 138, 78], fill=N)
    for k, t in enumerate(["#!/bin/bash", "for f in *", "do", "  echo $f", "done"]):
        texte(d, 42, 20 + k * 11, t, V if k == 0 else B)
    d.ellipse([40, 118, 136, 162], outline=V, width=2)                         # le cercle au sol
    d.ellipse([56, 126, 120, 154], outline=B)
    for k in range(5):
        a = k * 2 * math.pi / 5 - math.pi / 2
        d.point((88 + 40 * math.cos(a), 140 + 18 * math.sin(a)), fill=B)
    d.polygon([(76, 100), (100, 100), (96, 116), (80, 116)], fill=B)           # le pupitre
    d.rectangle([86, 116, 90, 128], fill=B)
    return im


# ------------------------------------------------------------------
# Les huit maîtres, dans le style des personnages des chapitres 2 et 3 (dessiner_panne.perso) :
# une silhouette en pied, gros pixels, tête carrée, yeux carrés à pupille noire, sol en tirets.
# ------------------------------------------------------------------
from dessiner_panne import perso, yeux, sol_tirets  # noqa: E402


def robe_mage(r, haut=33, bas=64, c=V, x0=35, x1=52):
    """Une robe de mage qui s'évase vers le bas."""
    for k, y in enumerate(range(haut, bas + 1)):
        e = k // 6
        r(x0 - e, y, x1 + e, y, c)


def bras(r, gauche=True, droite=True, y=35):
    if gauche: r(31, y, 34, y + 1, B); r(30, y + 1, 31, y + 11, B); r(30, y + 11, 33, y + 12, B)
    if droite: r(53, y, 56, y + 1, B); r(56, y + 1, 57, y + 11, B); r(54, y + 11, 57, y + 12, B)


def jambes(r, c=V):
    r(38, 55, 41, 64, B); r(46, 55, 49, 64, B); r(39, 56, 40, 63, N); r(47, 56, 48, 63, N)
    r(36, 65, 42, 66, c); r(45, 65, 51, 66, c)


def pieds_robe(r):
    r(37, 65, 42, 66, B); r(45, 65, 50, 66, B)


def henry_dessin(r):
    # le vieux maître des Runes : chapeau pointu gravé, longue barbe, bâton à runes, une tablette de pierre
    for k in range(9): r(43 - k, 2 + k, 44 + k, 2 + k, V)
    r(31, 11, 56, 12, V); r(42, 5, 45, 6, N); r(41, 8, 46, 8, N)          # une rune ^ sur le chapeau
    r(37, 13, 50, 30, B); yeux(r, 38, 45, 16)
    r(37, 13, 50, 13, V); r(43, 21, 44, 22, N)
    r(36, 23, 51, 40, B)                                                     # la barbe
    r(40, 24, 47, 24, N); r(39, 30, 39, 37, N); r(43, 32, 43, 39, N); r(48, 30, 48, 37, N)
    robe_mage(r, 33)
    for x, y in [(37, 46), (49, 50), (40, 56), (47, 60)]: r(x, y, x + 1, y + 1, B)
    r(30, 36, 34, 37, B); r(29, 37, 30, 45, B)                               # bras gauche, la tablette
    r(19, 40, 31, 54, B); r(20, 41, 30, 53, N)
    r(22, 43, 23, 43, V); r(21, 44, 22, 44, V); r(23, 44, 24, 44, V)          # ^
    r(27, 43, 28, 47, V); r(26, 44, 29, 44, V); r(26, 46, 29, 46, V)          # $
    r(22, 49, 22, 51, V); r(22, 49, 23, 49, V); r(22, 51, 23, 51, V)          # [
    r(28, 49, 28, 51, V); r(27, 49, 28, 49, V); r(27, 51, 28, 51, V)          # ]
    r(53, 36, 57, 37, B); r(59, 6, 60, 66, B); r(57, 4, 62, 7, V)            # le bâton
    for y in (14, 24, 34, 44): r(58, y, 61, y, V)
    pieds_robe(r); sol_tirets(r, 68)


def alfred_dessin(r):
    # le devin d'awk : capuche pointue, une boule de cristal qui découpe la lumière en colonnes
    for k in range(6): r(43 - k - 3, 4 + k, 44 + k + 3, 4 + k, V)
    r(32, 10, 55, 33, V)
    r(37, 14, 50, 31, B); yeux(r, 38, 45, 18); r(43, 23, 44, 25, N)
    r(41, 28, 46, 28, N); r(37, 14, 50, 14, V)
    robe_mage(r, 33, 64, V, 34, 53)
    r(41, 34, 46, 64, B)                                                     # le pan blanc de la robe
    for y in range(37, 63, 5): r(43, y, 44, y + 1, V)
    bras(r, True, True, 36)
    # la boule de cristal, tenue à deux mains, et ses colonnes $1 $2 $3
    for (x0, x1, y) in [(37, 50, 42), (35, 52, 43), (34, 53, 44), (34, 53, 45), (34, 53, 46), (34, 53, 47), (34, 53, 48), (35, 52, 49), (37, 50, 50)]:
        r(x0, y, x1, y, B)
    r(36, 44, 51, 48, N)
    for x in (38, 43, 48): r(x, 44, x + 1, 48, V)
    r(39, 51, 48, 52, V)                                                     # le socle
    for x, y in [(26, 30), (61, 34), (24, 50), (63, 52)]: r(x, y, x, y, B)   # des éclats de lumière
    pieds_robe(r); sol_tirets(r, 68)


def lee_dessin(r):
    # la maîtresse de la Transmutation : chignon, blouse d'alchimiste, une plume qui réécrit, une fiole
    r(40, 3, 47, 9, V); r(39, 5, 48, 7, V)                                   # le chignon
    r(35, 9, 52, 14, V)
    r(37, 12, 50, 30, B); yeux(r, 38, 45, 16)
    r(37, 15, 44, 15, N); r(45, 15, 51, 15, N)                               # les lunettes
    r(43, 21, 44, 23, N); r(41, 26, 46, 26, N)
    r(35, 12, 36, 22, V); r(51, 12, 52, 22, V)
    r(42, 31, 45, 32, B)
    r(35, 33, 52, 54, B); r(36, 34, 51, 53, N); r(37, 35, 50, 53, B)         # la blouse
    r(41, 33, 46, 37, V); r(43, 38, 44, 53, N)
    r(38, 46, 41, 50, N); r(39, 47, 40, 49, V)                                # une poche
    bras(r, True, True, 35)
    # la plume, levée, qui transforme un parchemin
    r(57, 22, 58, 36, B); r(58, 14, 61, 18, V); r(59, 18, 62, 22, V); r(60, 22, 61, 26, V)
    r(60, 30, 70, 41, B); r(61, 31, 69, 40, N)
    r(62, 33, 64, 33, V); r(66, 33, 68, 33, B); r(65, 32, 65, 34, B)          # a > b
    r(62, 37, 68, 37, V)
    # la fiole, dans l'autre main
    r(25, 36, 27, 40, B); r(22, 41, 30, 49, B); r(23, 44, 29, 48, V); r(23, 42, 29, 43, N)
    jambes(r); sol_tirets(r, 68)


def stephen_dessin(r):
    # le bibliothécaire des Grimoires : crâne lisse, lunettes carrées, un grimoire ouvert dont les pages font un arbre
    r(37, 6, 50, 29, B)
    r(34, 13, 37, 21, V); r(50, 13, 53, 21, V)
    r(36, 14, 43, 20, V); r(44, 14, 51, 20, V); yeux(r, 38, 45, 15)          # lunettes vertes épaisses
    r(43, 22, 44, 24, N); r(41, 26, 46, 26, N)
    r(42, 30, 45, 31, B)
    r(35, 32, 52, 54, V); r(42, 32, 45, 54, B)                               # le gilet
    r(31, 34, 34, 35, B); r(30, 35, 31, 41, B); r(53, 34, 56, 35, B); r(56, 35, 57, 41, B)
    # le grimoire ouvert, tenu devant lui
    r(24, 40, 63, 52, B); r(25, 41, 42, 51, N); r(45, 41, 62, 51, N); r(43, 40, 44, 53, V)
    r(27, 43, 28, 49, V); r(29, 42, 30, 43, V); r(29, 49, 30, 50, V); r(26, 46, 27, 46, V)   # {
    r(32, 46, 38, 46, B); r(35, 44, 35, 48, B)                                                  # une branche
    r(59, 43, 60, 49, V); r(57, 42, 58, 43, V); r(57, 49, 58, 50, V); r(60, 46, 61, 46, V)   # }
    r(48, 43, 55, 43, B); r(48, 46, 53, 46, B); r(48, 49, 55, 49, B)
    jambes(r); sol_tirets(r, 68)


def doug_dessin(r):
    # le maître de l'Alchimie : lunettes de forge sur le front, tablier, un tuyau coudé et des gants
    r(37, 8, 50, 30, B)
    r(36, 8, 51, 10, V); r(37, 10, 42, 14, V); r(45, 10, 50, 14, V); r(38, 11, 41, 13, N); r(46, 11, 49, 13, N)
    yeux(r, 38, 45, 17); r(43, 22, 44, 24, N)
    r(39, 27, 48, 28, N); r(40, 27, 47, 27, B)                               # un grand sourire
    r(37, 25, 38, 30, V); r(49, 25, 50, 30, V)                               # les favoris
    r(42, 31, 45, 32, B)
    r(35, 33, 52, 54, V)
    r(38, 35, 49, 56, B); r(39, 36, 48, 55, N); r(40, 37, 47, 55, B)         # le tablier
    r(41, 44, 46, 49, N); r(42, 45, 45, 48, V)
    # le tuyau coudé, porté sur l'épaule : | puis coude
    r(53, 34, 56, 35, B); r(56, 24, 58, 36, B); r(56, 22, 68, 24, B); r(66, 24, 68, 40, B); r(65, 40, 69, 42, V)
    r(54, 44, 58, 47, V)                                                      # gant droit
    r(30, 35, 34, 36, B); r(29, 36, 30, 45, B); r(27, 45, 32, 48, V)         # gant gauche
    # un petit alambic à ses pieds
    r(18, 58, 26, 66, B); r(19, 61, 25, 65, V); r(21, 52, 23, 58, B); r(23, 52, 28, 53, B)
    jambes(r); sol_tirets(r, 68)


def paul_dessin(r):
    # l'horloger de la Chronomancie : haut-de-forme, gilet, montre à gousset, un sablier à la main
    r(37, 1, 50, 11, B); r(38, 2, 49, 10, N); r(38, 8, 49, 9, V); r(33, 11, 54, 12, B)
    r(37, 13, 50, 30, B); yeux(r, 38, 45, 16)
    r(37, 15, 44, 15, N); r(44, 17, 45, 17, N)                                # le monocle
    r(43, 21, 44, 23, N); r(40, 26, 47, 26, N); r(40, 25, 41, 25, N); r(46, 25, 47, 25, N)   # moustache
    r(42, 31, 45, 32, B)
    r(35, 33, 52, 54, B); r(38, 34, 49, 54, V)                               # la veste et le gilet
    for y in (38, 43, 48): r(43, y, 44, y + 1, B)
    r(40, 40, 46, 40, B); r(36, 40, 39, 46, B); r(36, 40, 37, 47, V)          # chaîne et montre
    r(34, 45, 38, 49, V); r(35, 46, 37, 48, N); r(36, 46, 36, 47, B)
    bras(r, True, True, 35)
    # le sablier, levé
    r(58, 26, 67, 27, B); r(58, 44, 67, 45, B)
    for k in range(8):
        r(59 + k // 2, 28 + k, 66 - k // 2, 28 + k, B)
        r(59 + k // 2, 43 - k, 66 - k // 2, 43 - k, B)
    r(61, 29, 64, 31, N); r(62, 38, 63, 43, V); r(61, 41, 64, 43, V)
    r(56, 36, 58, 37, B)
    jambes(r, B); sol_tirets(r, 68)


def andrew_dessin(r):
    # l'archiviste : bonnet, cache-poussière, le Miroir (rsync) dans une main, l'Aiguille et son fil (patch) dans l'autre
    r(36, 6, 51, 12, V); r(35, 11, 52, 13, B)
    r(37, 13, 50, 30, B); yeux(r, 38, 45, 17); r(43, 22, 44, 24, N); r(41, 27, 46, 27, N)
    r(37, 26, 50, 30, B); r(36, 24, 37, 30, V); r(50, 24, 51, 30, V)
    r(42, 31, 45, 32, B)
    robe_mage(r, 33, 62, V, 35, 52)
    r(36, 40, 51, 41, B); r(36, 50, 51, 51, B)                               # les ceintures de rouleaux
    for x in (38, 44, 49): r(x, 41, x + 1, 50, B)
    bras(r, True, True, 35)
    # le Miroir : un ovale sur un manche
    r(19, 26, 27, 27, B); r(17, 28, 29, 41, B); r(19, 42, 27, 43, B); r(19, 28, 27, 41, N); r(20, 29, 22, 33, V)
    r(22, 44, 24, 52, B); r(24, 47, 29, 48, B)
    # l'Aiguille et son fil vert qui ondule
    r(60, 22, 61, 40, B); r(60, 22, 61, 23, N)
    for k, (x, y) in enumerate([(62, 24), (64, 27), (65, 31), (64, 35), (66, 39), (68, 43), (67, 47)]):
        r(x, y, x + 1, y + 2, V)
    r(56, 40, 59, 41, B)
    pieds_robe(r); sol_tirets(r, 68)


def brian_dessin(r):
    # le jeune enchanteur de l'Invocation : cheveux en bataille, une craie levée, un parchemin #!, un cercle au sol
    for x in range(36, 52, 3): r(x, 6, x + 1, 9, V)
    r(36, 9, 51, 14, V)
    r(37, 12, 50, 30, B); r(37, 12, 50, 13, V); yeux(r, 38, 45, 16)
    r(43, 21, 44, 23, N); r(41, 26, 46, 26, N); r(46, 25, 46, 25, N)
    r(42, 31, 45, 32, B)
    r(35, 33, 52, 54, V); r(43, 33, 44, 54, B)
    for y in (37, 43, 49): r(39, y, 40, y, B); r(47, y, 48, y, B)
    # la craie levée
    r(53, 34, 56, 35, B); r(56, 24, 57, 35, B); r(55, 18, 58, 23, B); r(56, 15, 57, 17, V)
    for x, y in [(60, 14), (62, 18), (52, 14)]: r(x, y, x, y, V)
    # le parchemin, avec #!
    r(30, 35, 34, 36, B); r(29, 36, 30, 40, B)
    r(16, 38, 31, 56, B); r(17, 39, 30, 55, N); r(16, 37, 31, 38, V); r(16, 56, 31, 57, V)
    r(19, 41, 19, 45, V); r(21, 41, 21, 45, V); r(18, 42, 22, 42, V); r(18, 44, 22, 44, V)   # #
    r(24, 41, 24, 43, V); r(24, 45, 24, 45, V)                                                # !
    for y in (48, 51): r(19, y, 28, y, B)
    jambes(r)
    # le cercle d'invocation, en pointillés
    for k in range(0, 360, 20):
        x = 43 + int(24 * math.cos(math.radians(k))); y = 66 + int(4 * math.sin(math.radians(k)))
        r(x, y, x + 1, y, V)
    sol_tirets(r, 69)


PORTRAITS = {
    "item_henry.gif": henry_dessin, "item_alfred.gif": alfred_dessin, "item_lee.gif": lee_dessin,
    "item_stephen.gif": stephen_dessin, "item_doug.gif": doug_dessin, "item_paul.gif": paul_dessin,
    "item_andrew.gif": andrew_dessin, "item_brian.gif": brian_dessin,
}


DESSINS = {
    "loc_academie.gif": academie,
    "loc_aile_runes.gif": aile_runes, "loc_aile_divination.gif": aile_divination,
    "loc_aile_transmutation.gif": aile_transmutation, "loc_aile_grimoires.gif": aile_grimoires,
    "loc_aile_alchimie.gif": aile_alchimie, "loc_aile_chronomancie.gif": aile_chronomancie,
    "loc_aile_archives.gif": aile_archives, "loc_aile_invocation.gif": aile_invocation,
}

if __name__ == "__main__":
    noms = sys.argv[1:] or list(DESSINS) + list(PORTRAITS)
    for nom in noms:
        if nom in PORTRAITS: perso(nom, PORTRAITS[nom])
        else: finir(nom, DESSINS[nom]())
    print(len(noms), "dessins")
