#!/usr/bin/env python3
"""Dessine les illustrations ajoutées par l'édition Cybersup.

Même style que les images d'origine : 104 x 101 « gros pixels » agrandis 4 fois,
trois couleurs (noir, blanc, vert), et le cadre repris d'une image existante.

    python3 tools/dessiner_images.py
"""
import os
from PIL import Image, ImageDraw

ICI = os.path.dirname(os.path.abspath(__file__))
IMG = os.path.join(ICI, "..", "Web", "static", "img")
NOIR, BLANC, VERT = (0, 0, 0), (255, 255, 255), (34, 177, 76)
L, H = 104, 101                 # taille en gros pixels
X0, Y0, X1, Y1 = 9, 9, 95, 92   # intérieur du cadre


def ouvrir(nom):
    """Charge une image d'origine et la ramène à l'échelle des gros pixels."""
    grande = Image.open(os.path.join(IMG, nom)).convert("RGB")
    return grande.resize((L, H), Image.NEAREST)


def cadre():
    """Une image vide avec le cadre d'origine."""
    im = ouvrir("item_box.gif")
    ImageDraw.Draw(im).rectangle([X0, Y0, X1 - 1, Y1 - 1], fill=NOIR)
    return im


def enregistrer(im, nom):
    grande = im.resize((L * 4, H * 4), Image.NEAREST)
    palette = Image.new("P", (1, 1))
    palette.putpalette(list(NOIR) + list(BLANC) + list(VERT) + [0, 0, 0] * 253)
    grande.quantize(palette=palette, dither=Image.NONE).save(os.path.join(IMG, nom))
    print("écrit", nom)


def sol(d, y, pas=5):
    """Petits traits de sol, comme sous les personnages d'origine."""
    for x in range(X0 + 14, X1 - 14, pas * 2):
        d.line([x, y, x + pas, y], fill=BLANC)


# --- petite police 3 x 5 pour le sous-titre de l'écran-titre ---
POLICE = {
    "E": ["111", "100", "110", "100", "111"], "D": ["110", "101", "101", "101", "110"],
    "I": ["111", "010", "010", "010", "111"], "T": ["111", "010", "010", "010", "010"],
    "O": ["111", "101", "101", "101", "111"], "N": ["101", "111", "111", "111", "101"],
    "C": ["111", "100", "100", "100", "111"], "Y": ["101", "101", "010", "010", "010"],
    "B": ["110", "101", "110", "101", "110"], "R": ["110", "101", "110", "101", "101"],
    "S": ["111", "100", "111", "001", "111"], "U": ["101", "101", "101", "101", "111"],
    "P": ["111", "101", "111", "100", "100"], " ": ["000"] * 5,
}


def ecrire(d, texte, x, y, couleur):
    for lettre in texte:
        for j, rangee in enumerate(POLICE[lettre]):
            for i, bit in enumerate(rangee):
                if bit == "1":
                    d.point((x + i, y + j), fill=couleur)
        x += 4
    return x


def largeur(texte):
    return len(texte) * 4 - 1


# ------------------------------------------------------------------
def taverne():
    im = cadre()
    d = ImageDraw.Draw(im)
    # étagère et bouteilles
    d.line([X0 + 6, 26, X1 - 7, 26], fill=BLANC)
    for i, x in enumerate(range(X0 + 12, X1 - 12, 9)):
        haut = 16 if i % 2 else 13
        d.rectangle([x, haut + 4, x + 4, 25], outline=BLANC, fill=VERT if i % 3 else NOIR)
        d.rectangle([x + 1, haut, x + 3, haut + 4], outline=BLANC)
    # comptoir
    d.rectangle([X0 + 3, 62, X1 - 4, 66], fill=VERT)
    d.line([X0 + 3, 61, X1 - 4, 61], fill=BLANC)
    d.rectangle([X0 + 6, 67, X1 - 7, Y1 - 4], outline=BLANC)
    for x in range(X0 + 16, X1 - 10, 12):
        d.line([x, 68, x, Y1 - 5], fill=BLANC)
    # tonneau
    d.ellipse([X0 + 8, 36, X0 + 30, 61], outline=BLANC, fill=NOIR)
    d.line([X0 + 9, 44, X0 + 29, 44], fill=VERT)
    d.line([X0 + 9, 53, X0 + 29, 53], fill=VERT)
    d.rectangle([X0 + 17, 47, X0 + 21, 50], fill=BLANC)
    # chope et sa mousse
    d.rectangle([52, 42, 68, 60], outline=BLANC, fill=VERT)
    d.arc([65, 45, 76, 57], -90, 90, fill=BLANC)
    d.ellipse([50, 36, 58, 44], fill=BLANC)
    d.ellipse([56, 34, 64, 43], fill=BLANC)
    d.ellipse([62, 36, 70, 44], fill=BLANC)
    d.line([56, 46, 56, 57], fill=BLANC)
    d.line([61, 46, 61, 57], fill=BLANC)
    enregistrer(im, "loc_taverne.gif")


def chope():
    im = cadre()
    d = ImageDraw.Draw(im)
    d.rectangle([34, 38, 62, 74], outline=BLANC, fill=VERT)
    d.rectangle([35, 39, 61, 73], outline=BLANC)
    d.arc([56, 44, 76, 68], -90, 90, fill=BLANC)
    d.arc([57, 45, 75, 67], -90, 90, fill=BLANC)
    for cx, cy, r in [(36, 34, 7), (46, 30, 8), (57, 33, 7), (64, 37, 5), (41, 38, 5)]:
        d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=BLANC)
    d.ellipse([38, 44, 43, 52], fill=BLANC)   # une goutte de mousse qui coule
    d.line([42, 52, 42, 66], fill=BLANC)
    d.line([50, 48, 50, 66], fill=BLANC)
    sol(d, 80)
    enregistrer(im, "item_tavernier.gif")


def luth():
    im = cadre()
    d = ImageDraw.Draw(im)
    # caisse en forme de poire, manche en biais
    d.ellipse([24, 46, 58, 82], outline=BLANC, fill=VERT)
    d.ellipse([36, 58, 46, 68], outline=BLANC, fill=NOIR)
    for k in range(-1, 2):
        d.line([44 + k, 54 - k, 76 + k, 20 - k], fill=BLANC)
    d.polygon([(72, 16), (82, 12), (84, 20), (78, 24)], outline=BLANC, fill=VERT)
    for k in (0, 3, 6):
        d.point((80 + k // 3, 10 + k), fill=BLANC)
    d.line([34, 72, 78, 22], fill=NOIR)
    # quelques notes
    for x, y in [(22, 24), (34, 16)]:
        d.ellipse([x, y + 8, x + 4, y + 11], fill=BLANC)
        d.line([x + 4, y, x + 4, y + 9], fill=BLANC)
        d.line([x + 4, y, x + 8, y + 2], fill=BLANC)
    enregistrer(im, "item_barde.gif")


def citadelle():
    im = cadre()
    d = ImageDraw.Draw(im)
    # lune et étoiles
    d.ellipse([70, 14, 84, 28], fill=BLANC)
    d.ellipse([74, 12, 88, 26], fill=NOIR)
    for x, y in [(16, 16), (28, 24), (40, 13), (60, 20), (20, 36), (84, 40)]:
        d.point((x, y), fill=BLANC)
    # colline
    d.polygon([(X0, Y1 - 1), (X0, 78), (30, 70), (52, 66), (74, 70), (X1 - 1, 80), (X1 - 1, Y1 - 1)], fill=VERT)
    d.line([(X0, 78), (30, 70), (52, 66), (74, 70), (X1 - 1, 80)], fill=BLANC)
    # donjon
    d.rectangle([40, 28, 64, 68], outline=BLANC, fill=NOIR)
    for x in range(38, 67, 6):
        d.rectangle([x, 22, x + 3, 28], outline=BLANC, fill=NOIR)
    d.line([38, 28, 66, 28], fill=BLANC)
    # tourelles
    for x in (28, 68):
        d.rectangle([x, 44, x + 8, 69], outline=BLANC, fill=NOIR)
        d.polygon([(x - 1, 44), (x + 4, 34), (x + 9, 44)], outline=BLANC, fill=VERT)
        d.rectangle([x + 3, 50, x + 5, 54], fill=VERT)
    # fenêtres éclairées et porte
    d.rectangle([50, 34, 54, 40], fill=VERT)
    d.point((52, 33), fill=VERT)
    d.rectangle([44, 46, 46, 50], fill=VERT)
    d.rectangle([58, 46, 60, 50], fill=VERT)
    d.rectangle([49, 58, 55, 68], outline=BLANC, fill=NOIR)
    d.line([52, 58, 52, 68], fill=BLANC)
    # marches
    for k in range(5):
        d.line([48 - k * 2, 70 + k * 4, 56 + k * 2, 70 + k * 4], fill=BLANC)
    enregistrer(im, "loc_citadelle.gif")


def sorcier_noir():
    """Le vieil homme, vu de l'ombre : la même silhouette, capuche relevée."""
    im = ouvrir("item_mysteryman.gif")
    px = im.load()
    for y in range(Y0, Y1):
        for x in range(X0, X1):
            if px[x, y] == BLANC:
                px[x, y] = NOIR
    # contour blanc autour de la robe pour détacher la silhouette
    contour = []
    for y in range(Y0 + 1, Y1 - 1):
        for x in range(X0 + 1, X1 - 1):
            if px[x, y] == NOIR and any(px[x + i, y + j] == VERT for i, j in ((1, 0), (-1, 0), (0, 1), (0, -1))):
                contour.append((x, y))
    haut = min(y for _, y in contour)
    for x, y in contour:
        if y < haut + 34:
            px[x, y] = BLANC
    d = ImageDraw.Draw(im)
    verts = [(x, y) for y in range(Y0, Y1) for x in range(X0, X1) if px[x, y] == VERT]
    return im, verts


def sorcier_noir_final():
    im, verts = sorcier_noir()
    d = ImageDraw.Draw(im)
    haut = min(y for _, y in verts)
    cx = sum(x for x, y in verts if y < haut + 12) // max(1, len([1 for x, y in verts if y < haut + 12]))
    # deux yeux sous la capuche
    yeux = haut + 13
    d.rectangle([cx + 1, yeux, cx + 2, yeux + 1], fill=BLANC)
    d.rectangle([cx + 6, yeux, cx + 7, yeux + 1], fill=BLANC)
    # éclairs
    for x0, y0 in [(18, 20), (78, 26)]:
        d.line([(x0, y0), (x0 + 4, y0 + 8), (x0 + 1, y0 + 8), (x0 + 5, y0 + 17)], fill=BLANC)
    enregistrer(im, "item_sorciernoir.gif")


def ecran_titre():
    im = ouvrir("titlescreen.gif")
    d = ImageDraw.Draw(im)
    texte = "EDITION CYBERSUP"
    x = (L - largeur(texte)) // 2
    ecrire(d, texte, x, 10, BLANC)   # dans la bande libre entre le cadre et l'ordinateur
    enregistrer(im, "titlescreen_cybersup.gif")


def war_room():
    im = cadre()
    d = ImageDraw.Draw(im)
    # mur d'écrans : un grand au centre, deux petits de chaque côté
    d.rectangle([30, 16, 74, 44], outline=BLANC, fill=NOIR)
    for x, y in [(14, 18), (14, 32), (78, 18), (78, 32)]:
        d.rectangle([x, y, x + 12, y + 10], outline=BLANC, fill=NOIR)
    # petits écrans : courbes et barres
    d.line([(16, 25), (19, 22), (22, 24), (24, 20)], fill=VERT)
    for i, hauteur in enumerate([3, 6, 4, 7]):
        d.line([16 + i * 3, 40, 16 + i * 3, 40 - hauteur], fill=VERT)
    d.line([(80, 24), (83, 26), (86, 21), (88, 23)], fill=VERT)
    for i in range(3):
        d.line([80, 35 + i * 2, 88 - i * 2, 35 + i * 2], fill=VERT)
    # grand écran : une carte, des régions, un point d'alerte
    d.polygon([(36, 24), (44, 20), (52, 23), (56, 30), (50, 38), (40, 39), (34, 33)], outline=VERT)
    d.polygon([(58, 22), (66, 21), (70, 27), (66, 34), (60, 32)], outline=VERT)
    d.line([(44, 20), (46, 30), (40, 39)], fill=VERT)
    d.ellipse([62, 25, 66, 29], outline=BLANC)
    d.point((64, 27), fill=BLANC)
    d.line([(46, 30), (62, 27)], fill=BLANC)
    # voyant d'alerte au plafond, avec ses rayons
    d.rectangle([49, 11, 55, 14], fill=BLANC)
    for dx, dy in [(-6, 0), (6, 0), (-4, -2), (4, -2)]:
        d.point((52 + dx, 12 + dy), fill=BLANC)
    # table en fer à cheval et postes de travail
    d.arc([18, 46, 86, 96], 180, 360, fill=BLANC)
    d.arc([26, 54, 78, 98], 180, 360, fill=BLANC)
    d.line([18, 71, 26, 76], fill=BLANC)
    d.line([86, 71, 78, 76], fill=BLANC)
    for x, y in [(24, 60), (37, 52), (52, 49), (67, 52), (80, 60)]:
        d.rectangle([x - 3, y - 4, x + 3, y], outline=BLANC, fill=VERT)
        d.line([x - 4, y + 2, x + 4, y + 2], fill=BLANC)
    # trois silhouettes de dos
    for x in (34, 52, 70):
        d.ellipse([x - 3, 72, x + 3, 78], fill=BLANC)
        d.polygon([(x - 6, Y1 - 1), (x - 5, 81), (x + 5, 81), (x + 6, Y1 - 1)], fill=VERT)
    enregistrer(im, "loc_warroom.gif")


if __name__ == "__main__":
    war_room()
    taverne()
    chope()
    luth()
    citadelle()
    sorcier_noir_final()
    ecran_titre()
