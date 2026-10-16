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


# ------------------------------------------------------------------
# Le grand hall et les huit ailes
# ------------------------------------------------------------------

def academie():
    """Le grand hall : des colonnes, des grimoires qui flottent, l'horloge qui file vers minuit, l'escalier."""
    im, d = toile()
    piece(d, 30, 18, 146, 112)
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
    piece(d, 26, 16, 150, 110, sol=V)
    briques(d, 30, 20, 146, 106, h=10, w=24)
    for i, t in enumerate(["^ $ . *", "[0-9]+", "(a|b)", "\\.", "[[:digit:]]"]):
        d.rectangle([38 + (i % 2) * 52, 26 + i * 15, 38 + (i % 2) * 52 + 54, 37 + i * 15], fill=N)
        texte(d, 41 + (i % 2) * 52, 26 + i * 15, t, V if i % 2 == 0 else B)
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
    d.rectangle([20, 116, 156, 124], fill=B)                                     # la table
    d.rectangle([28, 124, 34, 160], fill=B); d.rectangle([142, 124, 148, 160], fill=B)
    d.polygon([(70, 112), (88, 70), (106, 112)], fill=B, outline=N)              # le prisme
    d.polygon([(78, 108), (88, 84), (98, 108)], fill=N)
    d.line([(10, 86), (80, 92)], fill=B, width=2)                                # le rayon qui entre
    for k in range(3):                                                           # les colonnes qui sortent
        x = 114 + k * 18
        d.line([(98, 96 + k * 2), (x, 112)], fill=V if k % 2 == 0 else B, width=2)
        d.rectangle([x - 3, 112, x + 3, 115], fill=V if k % 2 == 0 else B)
        texte(d, x - 4, 128, "$" + str(k + 1), B)
    return im


def aile_transmutation():
    """La Transmutation : un alambic qui fume, et une plume qui change une ligne en une autre."""
    im, d = toile()
    piece(d, 28, 18, 148, 108)
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
    piece(d, 24, 14, 152, 104)
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
    piece(d, 22, 16, 154, 106)
    for x in (44, 88, 132):
        alambic(d, x, 92, 16)
    d.line([(44, 66), (44, 52), (88, 52), (88, 66)], fill=B, width=3)
    d.line([(88, 52), (132, 52), (132, 66)], fill=B, width=3)
    d.text((62, 40), "|", fill=V); d.text((108, 40), "|", fill=V)
    d.rectangle([14, 112, 162, 118], fill=B)
    for x in (24, 152):
        d.rectangle([x - 3, 118, x + 3, 160], fill=B)
    for k in range(4):
        d.ellipse([60 + k * 16, 140, 68 + k * 16, 148], fill=V if k % 2 else B)
    return im


def aile_chronomancie():
    """La Chronomancie : une grande roue d'horloge, trois sabliers (timer, at, cron) sur une table."""
    im, d = toile()
    piece(d, 24, 14, 152, 104)
    d.ellipse([54, 20, 122, 88], fill=B); d.ellipse([60, 26, 116, 82], fill=N)
    for k in range(12):
        a = k * math.pi / 6
        d.line([(88 + 22 * math.sin(a), 54 - 22 * math.cos(a)), (88 + 26 * math.sin(a), 54 - 26 * math.cos(a))], fill=V if k % 3 == 0 else B, width=2)
    d.line([(88, 54), (88, 34)], fill=B, width=3); d.line([(88, 54), (100, 60)], fill=V, width=2)
    d.rectangle([20, 118, 156, 124], fill=B)
    for i, x in enumerate((50, 88, 126)):
        sablier(d, x, 90, 28, 18, plein=[0.2, 0.6, 0.9][i])
    texte(d, 36, 132, "timer  at  cron", B)
    return im


def aile_archives():
    """Les Archives : un grand miroir qui reflète une pile de dossiers, et une aiguille qui recoud une page."""
    im, d = toile()
    piece(d, 24, 14, 152, 104)
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
    piece(d, 22, 12, 154, 96)
    d.rectangle([34, 18, 142, 76], fill=B); d.rectangle([38, 22, 138, 72], fill=N)
    for k, t in enumerate(["#!/bin/bash", "sort() {", "  for f in ..", "  if [ -e ]", "}"]):
        texte(d, 42, 23 + k * 10, t, V if k == 0 else B)
    d.ellipse([40, 118, 136, 162], outline=V, width=2)                         # le cercle au sol
    d.ellipse([56, 126, 120, 154], outline=B)
    for k in range(5):
        a = k * 2 * math.pi / 5 - math.pi / 2
        d.point((88 + 40 * math.cos(a), 140 + 18 * math.sin(a)), fill=B)
    d.polygon([(76, 100), (100, 100), (96, 116), (80, 116)], fill=B)           # le pupitre
    d.rectangle([86, 116, 90, 128], fill=B)
    return im


# ------------------------------------------------------------------
# Les huit maîtres
# ------------------------------------------------------------------

def henry():
    """Henry, maître des Runes : une longue barbe, un doigt levé qui allume une rune."""
    im, d = toile()
    robe(d, 88, 86, V)
    visage(d, 88, 50)
    d.polygon([(66, 58), (110, 58), (100, 98), (88, 108), (76, 98)], fill=B, outline=N)   # la barbe
    d.line([(80, 74), (96, 74)], fill=N)
    d.polygon([(62, 36), (88, 6), (114, 36)], fill=V)                            # le chapeau
    d.rectangle([58, 34, 118, 38], fill=V)
    d.line([(140, 120), (150, 70)], fill=B, width=4)                             # le bras levé
    d.rectangle([140, 40, 166, 64], fill=N, outline=B)
    d.text((145, 46), "^.*", fill=V)
    return im


def alfred():
    """Alfred, maître de la Divination : une capuche, un prisme qu'il tient entre deux doigts."""
    im, d = toile()
    robe(d, 88, 88, B)
    d.polygon([(52, 64), (88, 6), (124, 64), (118, 92), (58, 92)], fill=V)       # la capuche
    visage(d, 88, 56, 20)
    d.polygon([(22, 120), (34, 94), (46, 120)], fill=B, outline=N)               # le prisme
    for k in range(3):
        d.line([(46, 112), (60 + k * 6, 128 + k * 6)], fill=V if k % 2 == 0 else N, width=2)
    return im


def lee():
    """Lee, maître de la Transmutation : un chignon piqué d'une plume, des lunettes rondes, une fiole fumante."""
    im, d = toile()
    robe(d, 88, 86, V)
    d.ellipse([72, 8, 104, 34], fill=V)                                          # le chignon
    visage(d, 88, 52)
    d.ellipse([72, 44, 86, 56], outline=N, width=2); d.ellipse([90, 44, 104, 56], outline=N, width=2)
    d.line([(100, 10), (126, 0)], fill=B, width=2)                               # la plume dans le chignon
    d.ellipse([132, 110, 156, 134], fill=B); d.chord([135, 113, 153, 131], 0, 180, fill=V)
    d.rectangle([140, 98, 148, 112], fill=B)
    for k in range(3):
        d.arc([136 + k * 4, 80 - k * 6, 148 + k * 4, 92 - k * 6], 180, 360, fill=B)
    return im


def stephen():
    """Stephen, maître des Grimoires : de grosses lunettes, un grimoire relié serré contre lui."""
    im, d = toile()
    robe(d, 88, 86, B)
    visage(d, 88, 50)
    d.rectangle([68, 42, 84, 54], outline=V, width=3); d.rectangle([92, 42, 108, 54], outline=V, width=3)
    d.line([(84, 46), (92, 46)], fill=V, width=2)
    d.polygon([(62, 30), (66, 18), (110, 18), (114, 30)], fill=N)                # les cheveux
    d.rectangle([56, 104, 120, 150], fill=V, outline=N, width=2)                 # le grimoire
    d.rectangle([60, 108, 116, 146], outline=N)
    d.text((76, 118), "{ }", fill=N)
    return im


def doug():
    """Doug, maître de l'Alchimie : des lunettes de protection sur le front, une clé à molette, un tuyau de cuivre."""
    im, d = toile()
    robe(d, 88, 86, V)
    visage(d, 88, 52)
    d.rectangle([62, 28, 114, 40], fill=N)                                       # les lunettes de protection
    d.ellipse([66, 26, 84, 42], fill=V, outline=B); d.ellipse([92, 26, 110, 42], fill=V, outline=B)
    d.line([(68, 64), (108, 64)], fill=N, width=2)                               # la moustache
    d.line([(10, 100), (40, 100), (40, 130), (70, 130)], fill=B, width=5)       # le tuyau
    d.ellipse([140, 100, 162, 122], outline=B, width=4); d.line([(146, 120), (130, 150)], fill=B, width=5)
    return im


def paul():
    """Paul, maître de la Chronomancie : un sablier à la main, une montre à gousset sur la robe."""
    im, d = toile()
    robe(d, 88, 86, B)
    visage(d, 88, 50)
    d.polygon([(62, 34), (88, 16), (114, 34)], fill=N)
    d.arc([60, 22, 116, 60], 200, 340, fill=N, width=3)
    sablier(d, 146, 92, 40, 24, plein=0.7)
    d.ellipse([70, 112, 90, 132], fill=V, outline=N, width=2)                   # la montre
    d.line([(80, 122), (80, 115)], fill=N); d.line([(80, 122), (85, 122)], fill=N)
    d.line([(80, 112), (92, 96)], fill=N)
    return im


def andrew():
    """Andrew, maître des Archives : un miroir à main, une aiguille et son fil passés au col."""
    im, d = toile()
    robe(d, 88, 86, V)
    visage(d, 88, 52)
    d.polygon([(64, 36), (70, 22), (106, 22), (112, 36)], fill=B, outline=N)
    d.line([(64, 36), (112, 36)], fill=N)
    d.ellipse([8, 88, 40, 128], fill=B); d.ellipse([12, 92, 36, 124], fill=N)    # le miroir
    d.line([(16, 100), (24, 94)], fill=V)
    d.rectangle([22, 128, 28, 156], fill=B)
    d.line([(100, 96), (140, 70)], fill=B, width=2)                              # l'aiguille
    d.arc([92, 90, 150, 140], 270, 30, fill=V, width=2)
    return im


def brian():
    """Brian, maître de l'Invocation : une toque carrée, un bâton de craie, un parchemin de script."""
    im, d = toile()
    robe(d, 88, 86, B)
    visage(d, 88, 52)
    d.polygon([(56, 26), (88, 14), (120, 26), (88, 38)], fill=V)                # la toque carrée
    d.rectangle([72, 30, 104, 36], fill=V)
    d.line([(120, 26), (126, 46)], fill=B, width=2)
    d.rectangle([134, 92, 166, 150], fill=B)                                     # le parchemin
    for k in range(5):
        d.line([(138, 100 + k * 9), (162 - (k * 7) % 12, 100 + k * 9)], fill=N if k else V, width=2)
    d.rectangle([20, 104, 40, 110], fill=B)                                      # la craie
    return im


DESSINS = {
    "loc_academie.gif": academie,
    "loc_aile_runes.gif": aile_runes, "loc_aile_divination.gif": aile_divination,
    "loc_aile_transmutation.gif": aile_transmutation, "loc_aile_grimoires.gif": aile_grimoires,
    "loc_aile_alchimie.gif": aile_alchimie, "loc_aile_chronomancie.gif": aile_chronomancie,
    "loc_aile_archives.gif": aile_archives, "loc_aile_invocation.gif": aile_invocation,
    "item_henry.gif": henry, "item_alfred.gif": alfred, "item_lee.gif": lee, "item_stephen.gif": stephen,
    "item_doug.gif": doug, "item_paul.gif": paul, "item_andrew.gif": andrew, "item_brian.gif": brian,
}

if __name__ == "__main__":
    noms = sys.argv[1:] or list(DESSINS)
    for nom in noms:
        finir(nom, DESSINS[nom]())
    print(len(noms), "dessins")
