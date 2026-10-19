"""Dessine le Bastion (chapitre 5) : le hall, les douze tours, la machine, les douze maîtres, la Pierre d'Inspection
et la Lettre de l'Inspection.

Même style que le chapitre 4 (dessiner_academie.py) : pixel art 1 bit épais (noir, vert, blanc), les pièces en
perspective avec un sol dallé et une bande hachurée, les personnages en pied comme ceux des chapitres 2 à 4
(dessiner_panne.perso : grille 88 x 85, tête carrée, yeux à pupille, sol en tirets).
Usage : python3 outils/dessiner_bastion.py [nom...]
"""
import os, sys, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from dessiner_lieux import toile, finir, N, V, B, W, H  # noqa: E402
from dessiner_fantasy import tramer, briques, arche, creneaux, torche, etoiles, lune  # noqa: E402
from dessiner_academie import salle, texte, robe_mage, bras, jambes, pieds_robe  # noqa: E402
from dessiner_panne import perso, yeux, sol_tirets  # noqa: E402
import decor_arcanes as A  # noqa: E402
from decor_arcanes import lin, robe_plis, manches, ceinture  # noqa: E402


# ------------------------------------------------------------------
# Petites briques
# ------------------------------------------------------------------

def cadenas(d, x, y, c=V):
    d.arc([x - 5, y - 9, x + 5, y + 1], 180, 360, fill=B, width=2)
    d.rectangle([x - 7, y - 3, x + 7, y + 8], fill=c)
    d.rectangle([x - 1, y + 1, x + 1, y + 5], fill=N)


def bouclier(d, x, y, l=22, c=V):
    d.polygon([(x - l // 2, y), (x + l // 2, y), (x + l // 2, y + l // 2), (x, y + l), (x - l // 2, y + l // 2)], fill=B)
    d.polygon([(x - l // 2 + 3, y + 3), (x + l // 2 - 3, y + 3), (x + l // 2 - 3, y + l // 2), (x, y + l - 4), (x - l // 2 + 3, y + l // 2)], fill=c)


def murs_de_pierre(d, x0, y0, x1, y1):
    briques(d, x0, y0, x1, y1, h=9, w=20)


# ------------------------------------------------------------------
# Le hall et les douze tours
# ------------------------------------------------------------------

def pierre_inspection(im, d, x, y_sol, h=44, l=24, niveau=4, crans=6, lueur=True):
    """La Pierre d'Inspection sur son socle : un monolithe taillé, sa face d'ombre, sa jauge de crans (niveau allumés)."""
    if lueur:
        A.halo(d, x, y_sol - h // 2, l * 1.8, V, 0.45, h * 0.8, im=im, sur=N)
    d.polygon([(x - l // 2 - 8, y_sol), (x + l // 2 + 8, y_sol), (x + l // 2 + 4, y_sol - 6), (x - l // 2 - 4, y_sol - 6)], fill=B)
    d.polygon([(x + l // 2 + 1, y_sol - 6), (x + l // 2 + 4, y_sol - 6), (x + l // 2 + 8, y_sol), (x + l // 2 + 3, y_sol)], fill=V)
    top = y_sol - 6 - h
    d.polygon([(x - l // 2, y_sol - 6), (x + l // 2, y_sol - 6), (x + l // 2 - 2, top + 4), (x, top), (x - l // 2 + 2, top + 4)], fill=B)
    d.polygon([(x + l // 2 - 5, y_sol - 6), (x + l // 2, y_sol - 6), (x + l // 2 - 2, top + 4), (x + 2, top + 1)], fill=V)
    gx0, gx1 = x - l // 2 + 5, x + l // 2 - 8
    d.rectangle([gx0 - 1, top + 9, gx1 + 1, y_sol - 10], fill=N)
    pas = (y_sol - 12 - (top + 11)) / crans
    for k in range(crans):
        yy = int(y_sol - 12 - (k + 1) * pas)
        d.rectangle([gx0 + 1, yy + 1, gx1 - 1, int(yy + pas) - 1], fill=V if k < niveau else N)
        if k >= niveau:
            d.rectangle([gx0 + 1, yy + 1, gx1 - 1, int(yy + pas) - 1], outline=V)


def bastion():
    """Le hall du Bastion : une cour pavée au petit jour, entourée de tours de pierre ; au centre, sur son socle,
    la Pierre d'Inspection luit faiblement."""
    im, d = toile()
    A.ciel_aube(d, 92, 0.75, graine=5)
    # le rempart du fond et ses tours, en contre-jour
    d.rectangle([0, 70, W - 1, 100], fill=N)
    A.creneaux(d, 0, W, 70, 6, 6, N, N)
    for (x, l, h, toit) in ((18, 26, 62, True), (64, 20, 46, False), (112, 20, 46, False), (158, 26, 62, True)):
        A.tour(im, d, x, 100, l, h, toit, 2)
    d.rectangle([80, 74, 96, 100], fill=B)                                           # la poterne vers l'Académie
    d.rectangle([82, 82, 94, 100], fill=N); d.ellipse([82, 76, 94, 88], fill=N)
    A.halo(d, 88, 92, 8, V, 0.7, im=im, sur=N)
    # la cour pavée
    d.rectangle([0, 100, W - 1, H - 1], fill=N)
    prof = H - 100
    y, pas = 102, 3
    r = 0
    while y < H:
        t = (y - 100) / prof
        esp = 6 + t * 16
        dec = (esp / 2) if r % 2 else 0
        d.line([(0, y), (W, y)], fill=V)
        x = -dec
        while x < W:
            d.line([(x, y), (x + (x - 88) * 0.08, y + pas)], fill=V)
            x += esp
        y += pas; pas += 1; r += 1
    A.ombrer(im, 0, 100, W, 118, V, N, 0.6, 0.0)
    # deux torches sur leurs poteaux
    for x in (30, 146):
        d.rectangle([x - 1, 104, x + 1, 150], fill=B)
        d.rectangle([x, 104, x + 1, 150], fill=V)
        A.torche_murale(im, d, x, 98, 22, 0.55)
    pierre_inspection(im, d, 88, 156, 46, 26, 2, 6)
    return im


def tour_herse():
    """La Herse des Comptes : sous l'arche, une herse de fer à pointes abaissée et cadenassée ; au mur,
    une clé pendue par barreau."""
    im, d = toile()
    A.salle_pierre(im, d, 24, 14, 152, 104, plafond='voute', graine=21)
    d.rectangle([48, 22, 128, 104], fill=N)                                          # l'arche
    d.pieslice([48, 22, 128, 102], 180, 360, fill=N)
    d.arc([46, 20, 130, 104], 180, 360, fill=B, width=4)
    d.rectangle([46, 62, 49, 104], fill=B); d.rectangle([127, 62, 130, 104], fill=B)
    A.halo(d, 88, 104, 44, V, 0.4, 40, im=im, sur=N)                                 # la lueur du dehors, derrière
    for x in range(56, 124, 8):                                                      # les barreaux et leurs pointes
        d.rectangle([x - 1, 32 if 68 < x < 108 else 44, x + 1, 108], fill=B)
        d.rectangle([x + 1, 32 if 68 < x < 108 else 44, x + 1, 108], fill=V)
        d.polygon([(x - 2, 108), (x + 3, 108), (x, 114)], fill=B)
    for y in range(50, 106, 14):
        d.rectangle([50, y, 126, y + 2], fill=B)
        d.line([(50, y + 2), (126, y + 2)], fill=V)
    A.cadenas(d, 88, 76, V, 1)
    for k, x in enumerate((30, 38, 138, 146)):                                       # les clés accrochées
        d.rectangle([x - 4, 34, x + 4, 35], fill=B)
        A.cle(d, x, 36, V if k % 2 else B, 12)
    A.torche_murale(im, d, 34, 74, 18, 0.5)
    A.torche_murale(im, d, 142, 74, 18, 0.5)
    return im


def tour_sceau():
    """Le Sceau du Roi : sous une tenture, le parchemin des droits (une ligne qu'on raye) ; sur le pupitre,
    le grand sceau de cire frappé d'une couronne."""
    im, d = toile()
    A.salle_pierre(im, d, 26, 14, 150, 104, plafond='voute', graine=23)
    d.rectangle([34, 16, 142, 28], fill=V)                                           # la tenture et ses plis
    for x in range(38, 142, 12):
        d.polygon([(x, 28), (x + 12, 28), (x + 6, 38)], fill=V)
        d.line([(x + 6, 16), (x + 6, 34)], fill=N)
    d.rectangle([34, 15, 142, 16], fill=B)
    A.bougie(im, d, 44, 96, 9, 14); A.bougie(im, d, 132, 96, 9, 14)
    d.rectangle([58, 42, 118, 98], fill=B)                                           # le parchemin
    d.rectangle([60, 44, 116, 96], fill=N)
    d.rectangle([62, 46, 114, 94], fill=B)
    d.rectangle([56, 40, 120, 43], fill=V); d.rectangle([56, 97, 120, 100], fill=V)
    for y in range(52, 90, 7):
        d.line([(66, y), (110, y)], fill=N)
    d.line([(64, 73), (102, 81)], fill=V, width=2)                                   # la ligne qu'on raye
    d.polygon([(66, 104), (110, 104), (102, 156), (74, 156)], fill=B)                # le pupitre
    d.polygon([(96, 104), (110, 104), (102, 156), (94, 156)], fill=V)
    d.rectangle([62, 102, 114, 105], fill=B)
    A.halo(d, 114, 96, 22, V, 0.5, im=im, sur=N)
    d.ellipse([100, 82, 128, 110], fill=V)                                           # le sceau de cire
    for k in range(8):
        a = k * math.pi / 4
        d.ellipse([114 + 14 * math.cos(a) - 2, 96 + 14 * math.sin(a) - 2, 114 + 14 * math.cos(a) + 2, 96 + 14 * math.sin(a) + 2], fill=V)
    d.ellipse([105, 87, 123, 105], fill=N)
    d.polygon([(107, 100), (107, 91), (110, 95), (114, 89), (118, 95), (121, 91), (121, 100)], fill=V)  # la couronne
    d.arc([102, 84, 126, 108], 200, 260, fill=B)
    return im


def tour_pontlevis():
    """Le Pont-levis : la nuit, la tour d'entrée crénelée, le tablier relevé par ses chaînes au-dessus des douves,
    une lanterne qui se reflète dans l'eau."""
    im, d = toile()
    A.ciel_nuit(d, 0, 0, W - 1, 118, graine=31, n=30, voile=0.4)
    A.halo(d, 24, 20, 22, V, 0.5, im=im, sur=N)
    d.ellipse([16, 12, 32, 28], fill=B); d.ellipse([21, 9, 37, 25], fill=N)
    A.mur_plein(im, d, 24, 40, 152, 118, h=8, w=16, c=V)
    A.creneaux(d, 24, 153, 40, 9, 9)
    d.rectangle([24, 40, 152, 42], fill=B)
    for x in (24, 152):                                                              # les deux tourelles
        A.mur_plein(im, d, x - 12, 24, x + 12, 118, h=8, w=12); d.rectangle([x + 5, 24, x + 12, 118], fill=V)
        A.creneaux(d, x - 13, x + 13, 24, 7, 5)
        d.rectangle([x - 2, 44, x + 1, 56], fill=N)
    d.rectangle([60, 56, 116, 118], fill=N)                                          # la porte voûtée
    d.pieslice([60, 46, 116, 86], 180, 360, fill=N)
    d.arc([58, 44, 118, 88], 180, 360, fill=B, width=3)
    d.rectangle([64, 60, 112, 116], fill=B)                                          # le tablier relevé, ses planches
    for x in range(68, 112, 6):
        d.line([(x, 62), (x, 114)], fill=N)
    for y in (70, 104):
        d.rectangle([64, y, 112, y + 2], fill=V)
        for x in range(68, 112, 8):
            d.point((x, y + 1), fill=N)
    d.line([(64, 60), (112, 60)], fill=B, width=2)
    for (xa, xb) in ((44, 66), (132, 110)):                                         # les chaînes, vers les treuils
        A.chaine(d, [(xa, 50), (xb, 62)], B)
        d.ellipse([xa - 4, 46, xa + 4, 54], fill=B); d.ellipse([xa - 2, 48, xa + 2, 52], fill=N)
    A.cadenas(d, 88, 88, V, 1)
    d.line([(150, 70), (156, 70)], fill=B)                                           # la lanterne de la tourelle
    A.halo(d, 158, 76, 16, V, 0.6, im=im, sur=N)
    d.rectangle([155, 72, 161, 80], fill=B); d.rectangle([157, 74, 159, 78], fill=V)
    d.rectangle([0, 118, W - 1, H - 1], fill=N)                                      # les douves
    A.trame(d, 0, 118, W, 124, V, 0.5)
    A.eau(d, 124, H, graine=4, c=V, reflet=158, larg=8)
    for y in range(124, 150, 3):                                                     # le reflet sombre de la porte
        d.line([(66 + (y % 2), y), (110 - (y % 2), y)], fill=N)
    return im


def porte_bois(d, x0, y0, x1, y1, ouverte=False, clouee=False):
    """Une porte de bois dans son chambranle de pierre : fermée (planches), condamnée (deux planches clouées
    en croix), ou ouverte (une lumière verte dedans, le battant rabattu)."""
    d.rectangle([x0 - 2, y0 - 2, x1 + 2, y1], fill=B)
    if ouverte:
        d.rectangle([x0, y0, x1, y1], fill=V)
        d.rectangle([x0 + (x1 - x0) // 2, y0 + 6, x1 - 3, y1], fill=B)
        d.polygon([(x0, y0), (x0 + (x1 - x0) // 3, y0 + 3), (x0 + (x1 - x0) // 3, y1), (x0, y1)], fill=N)
        d.line([(x0 + (x1 - x0) // 3, y0 + 3), (x0 + (x1 - x0) // 3, y1)], fill=B)
        return
    d.rectangle([x0, y0, x1, y1], fill=N)
    for x in range(x0 + 3, x1, 4):
        d.line([(x, y0 + 1), (x, y1)], fill=V)
    if clouee:
        d.line([(x0 - 3, y0 + (y1 - y0) // 4), (x1 + 3, y0 + (y1 - y0) * 3 // 4)], fill=B, width=3)
        d.line([(x0 - 3, y0 + (y1 - y0) * 3 // 4), (x1 + 3, y0 + (y1 - y0) // 4)], fill=B, width=3)
        for (x, y) in ((x0, y0 + (y1 - y0) // 4), (x1, y0 + (y1 - y0) // 2)):
            d.point((x, y), fill=N)
    else:
        d.rectangle([x1 - 3, (y0 + y1) // 2, x1 - 2, (y0 + y1) // 2 + 1], fill=B)


def tour_portes():
    """Les Portes condamnées : un mur percé de portes ; on a cloué des planches en croix sur celles qui ne
    servent à rien, une seule reste ouverte et éclairée (la 22)."""
    im, d = toile()
    A.salle_pierre(im, d, 16, 16, 160, 108, plafond='poutres', graine=25, damier=False)
    xs = (24, 52, 80, 108, 136)
    A.halo(d, 62, 76, 34, V, 0.55, 46, im=im, sur=N)
    for i, x in enumerate(xs):
        porte_bois(d, x, 44, x + 18, 108, ouverte=(i == 1), clouee=(i != 1))
    d.rectangle([52, 26, 70, 38], fill=N)
    texte(d, 61 - d.textlength("22") / 2, 27, "22", V)
    A.rayon(im, d, [(52, 108), (70, 108), (82, 150), (40, 150)], V, 0.5, 0.0, sur=N)  # la lumière de la porte ouverte, au sol
    d.polygon([(30, 166), (74, 148), (78, 152), (34, 170)], fill=B)                   # des planches qui attendent, un marteau
    d.polygon([(34, 170), (78, 152), (78, 154), (36, 170)], fill=V)
    d.line([(110, 162), (126, 150)], fill=B, width=2)
    d.rectangle([124, 145, 131, 150], fill=B)
    for (x, y) in ((96, 160), (100, 164), (92, 166)):                                # des clous
        d.line([(x, y), (x + 3, y)], fill=B)
    return im


def lin_y(x, gauche, x0=64, y0=40, y1=92):
    """Sur un mur de côté de la salle (arête du fond en x0 à gauche, W-1-x0 à droite), le haut et le bas du mur en x."""
    t = x / x0 if gauche else (W - 1 - x) / x0
    return (lin(0, y0, t), lin(H - 1, y1, t))


def tour_remparts():
    """Les Remparts : le mur crénelé au petit jour, son chemin de ronde ; deux portes ouvertes (22 et 443),
    toutes les autres murées."""
    im, d = toile()
    A.ciel_aube(d, 70, 0.8, graine=17)
    A.mur_plein(im, d, 0, 52, W - 1, 132, h=8, w=16); d.rectangle([0, 76, W - 1, 82], fill=V)
    A.creneaux(d, 0, W, 52, 12, 11)
    for x in range(10, W, 22):                                                       # les meurtrières
        d.rectangle([x, 60, x + 1, 70], fill=N)
    d.rectangle([0, 72, W - 1, 75], fill=B); d.line([(0, 75), (W - 1, 75)], fill=V)  # le chemin de ronde
    for x, t in ((36, "22"), (110, "443")):
        d.rectangle([x - 2, 90, x + 32, 132], fill=B)
        d.pieslice([x - 2, 78, x + 32, 112], 180, 360, fill=B)
        d.rectangle([x, 95, x + 30, 132], fill=N)
        d.pieslice([x, 80, x + 30, 110], 180, 360, fill=N)
        A.degrade(d, x + 1, 82, x + 29, 132, V, 0.15, 0.7)                          # la lumière du dehors
        d.rectangle([x + 22, 95, x + 30, 132], fill=N)
        d.rectangle([x - 2, 78, x + 32, 79], fill=N)
        d.rectangle([x + 4, 64, x + 26, 74], fill=N)
        texte(d, x + 15 - d.textlength(t) / 2, 64, t, V)
    for x in (10, 78, 146):                                                          # les portes murées
        d.rectangle([x - 2, 94, x + 18, 132], fill=B)
        d.pieslice([x - 2, 86, x + 18, 106], 180, 360, fill=B)
        for r, y in enumerate(range(96, 132, 5)):
            d.line([(x, y), (x + 16, y)], fill=V)
            for xx in range(x + (3 if r % 2 else 0), x + 16, 6):
                d.line([(xx, y), (xx, y + 5)], fill=V)
        d.arc([x - 2, 86, x + 18, 106], 180, 360, fill=V)
    d.rectangle([0, 132, W - 1, H - 1], fill=N)                                      # le fossé herbeux
    d.rectangle([0, 133, W - 1, H - 1], fill=V)
    for x in range(4, W, 11): d.line([(x, 140 + (x * 7) % 26), (x + 2, 136 + (x * 7) % 26)], fill=N)
    d.line([(0, 132), (W, 132)], fill=B)
    return im


def coffre(im, d, x, y, w=30, h=20, ouvert=False):
    """Un coffre de fer en volume : la face, le dessus, les ferrures ; fermé d'un cadenas, ou ouvert sur une lueur."""
    p = 6
    d.rectangle([x, y, x + w, y + h], fill=B)
    d.polygon([(x + w, y), (x + w + p, y - p), (x + w + p, y + h - p), (x + w, y + h)], fill=V)
    for xx in (x + 4, x + w - 4):
        d.line([(xx, y), (xx, y + h)], fill=N)
    d.line([(x, y + 7), (x + w, y + 7)], fill=N, width=2)
    if ouvert:
        A.halo(d, x + w // 2 + 3, y - 12, 24, V, 0.6, 16, im=im, sur=N)
        d.polygon([(x, y), (x + w, y), (x + w + p, y - p), (x + p, y - p)], fill=N)
        d.polygon([(x + 2, y - 1), (x + w - 1, y - 1), (x + w + p - 2, y - p + 1), (x + p, y - p + 1)], fill=V)
        d.polygon([(x + p, y - p), (x + w + p, y - p), (x + w + p - 2, y - p - 16), (x + p - 2, y - p - 16)], fill=B)
        d.line([(x + p - 2, y - p - 12), (x + w + p - 2, y - p - 12)], fill=N, width=2)
        A.eclats(d, [(x + 10, y - 12), (x + 22, y - 16)], B)
    else:
        d.polygon([(x, y), (x + w, y), (x + w + p, y - p), (x + p, y - p)], fill=B)
        d.line([(x, y), (x + w, y)], fill=N)
        A.cadenas(d, x + w // 2, y + 10, V, 1)


def tour_coffres():
    """La Salle des Coffres : des coffres de fer cadenassés, un seul resté ouvert (un passe-partout oublié),
    et au mur des tableaux de clés."""
    im, d = toile()
    A.salle_pierre(im, d, 24, 14, 152, 98, plafond='voute', graine=27)
    for x0 in (34, 96):                                                              # les tableaux de clés
        d.rectangle([x0, 24, x0 + 46, 62], fill=B); d.rectangle([x0 + 2, 26, x0 + 44, 60], fill=N)
        for k in range(5):
            d.point((x0 + 6 + k * 8, 30), fill=B)
            A.cle(d, x0 + 6 + k * 8, 31, V if (k + x0) % 3 else B, 10 + (k % 2) * 4)
    A.torche_murale(im, d, 88, 44, 18, 0.5)
    for (x, y, ouvert) in ((14, 138, False), (128, 138, False), (70, 136, True)):
        coffre(im, d, x, y, 30, 20, ouvert)
    coffre(im, d, 38, 106, 22, 14, False)
    coffre(im, d, 112, 106, 22, 14, False)
    return im


def tour_coeur():
    """Le Cœur : une salle ronde où bat le noyau, une grande roue lumineuse au mur ; devant, une rangée de leviers
    (sysctl) et des tiroirs à pièces (les modules)."""
    im, d = toile()
    A.salle_pierre(im, d, 22, 12, 154, 100, plafond='voute', graine=29)
    cx, cy = 88, 52
    A.halo(d, cx, cy, 60, V, 0.65, 46, im=im, sur=N)
    d.ellipse([cx - 34, cy - 34, cx + 34, cy + 34], fill=B)
    d.ellipse([cx - 29, cy - 29, cx + 29, cy + 29], fill=N)
    for k in range(8):
        a = k * math.pi / 4 + 0.2
        d.line([(cx, cy), (cx + 27 * math.cos(a), cy + 27 * math.sin(a))], fill=V, width=3)
    for k in range(12):
        a = k * math.pi / 6
        d.rectangle([cx + 31 * math.cos(a) - 1, cy + 31 * math.sin(a) - 1, cx + 31 * math.cos(a) + 1, cy + 31 * math.sin(a) + 1], fill=N)
    d.ellipse([cx - 8, cy - 8, cx + 8, cy + 8], fill=B)
    d.ellipse([cx - 4, cy - 4, cx + 4, cy + 4], fill=V)
    # le pupitre des leviers
    d.polygon([(20, 112), (156, 112), (164, 124), (12, 124)], fill=B)
    d.rectangle([12, 124, 164, 128], fill=V)
    for i, x in enumerate(range(28, 152, 16)):
        haut = i % 3 != 1
        d.rectangle([x - 4, 114, x + 4, 120], fill=N)
        xt, yt = (x - 6, 96) if haut else (x + 7, 106)
        d.line([(x, 117), (xt, yt)], fill=B, width=2)
        d.ellipse([xt - 3, yt - 3, xt + 3, yt + 3], fill=V if haut else B)
    # les tiroirs à pièces
    for r in range(2):
        for c in range(6):
            x, y = 22 + c * 23, 134 + r * 15
            d.rectangle([x, y, x + 20, y + 12], fill=B)
            d.rectangle([x + 2, y + 2, x + 18, y + 10], fill=N if (r + c) % 4 else V)
            d.rectangle([x + 7, y + 5, x + 13, y + 7], fill=B)
    return im


def tour_poterne():
    """La Poterne : au pied du mur, une petite porte basse grillée et cadenassée ; devant, un clavier aux trois
    touches barrées (Ctrl, Alt, Del)."""
    im, d = toile()
    A.salle_pierre(im, d, 24, 14, 152, 104, plafond='poutres', graine=31)
    A.halo(d, 88, 84, 40, V, 0.45, 30, im=im, sur=N)
    d.rectangle([68, 70, 108, 104], fill=B)                                          # la porte basse
    d.pieslice([68, 52, 108, 90], 180, 360, fill=B)
    d.rectangle([72, 72, 104, 104], fill=N); d.pieslice([72, 56, 104, 88], 180, 360, fill=N)
    for x in range(76, 104, 6):
        d.line([(x, 62 if 80 < x < 96 else 66), (x, 104)], fill=B, width=2)
    for y in (78, 92):
        d.line([(72, y), (104, y)], fill=B, width=2)
    A.cadenas(d, 88, 88, V, 1)
    A.torche_murale(im, d, 50, 66, 18, 0.5)
    A.torche_murale(im, d, 126, 66, 18, 0.5)
    d.polygon([(36, 124), (140, 124), (148, 152), (28, 152)], fill=B)                 # le clavier, sa tranche
    d.rectangle([28, 152, 148, 156], fill=V)
    for i, t in enumerate(("Ctrl", "Alt", "Del")):
        x = 40 + i * 34
        d.rectangle([x, 129, x + 28, 147], fill=N)
        d.rectangle([x, 145, x + 28, 147], fill=V)
        texte(d, x + 14 - d.textlength(t) / 2, 131, t, B)
        d.line([(x + 1, 130), (x + 27, 146)], fill=V, width=2)
    return im


def tour_banniere():
    """La Bannière : au mât, l'étendard du Bastion désormais muet (la version barrée), le cadenas du chiffrement
    et l'inscription https."""
    im, d = toile()
    A.salle_pierre(im, d, 22, 12, 154, 104, plafond='voute', graine=33)
    A.halo(d, 96, 46, 54, V, 0.5, 40, im=im, sur=N)
    d.rectangle([54, 14, 58, 108], fill=B); d.rectangle([57, 14, 58, 108], fill=V)   # le mât et sa pomme
    d.ellipse([52, 9, 60, 17], fill=B)
    d.polygon([(58, 20), (132, 20), (120, 44), (132, 68), (58, 68)], fill=B)          # l'étendard, en plis
    d.polygon([(62, 24), (126, 24), (115, 44), (126, 64), (62, 64)], fill=N)
    for x in (80, 104):
        d.polygon([(x, 24), (x + 8, 24), (x + 8, 64), (x, 64)], fill=N)
        d.line([(x + 8, 24), (x + 8, 64)], fill=V)
    d.line([(70, 34), (102, 54)], fill=V, width=3); d.line([(70, 54), (102, 34)], fill=V, width=3)
    d.rectangle([64, 76, 104, 92], fill=N, outline=B)
    texte(d, 84 - d.textlength("https") / 2, 79, "https", V)
    A.halo(d, 132, 84, 18, V, 0.6, im=im, sur=N)
    A.cadenas(d, 132, 84, V, 2)
    d.rectangle([44, 108, 68, 112], fill=B)                                          # le socle du mât
    d.line([(44, 112), (68, 112)], fill=V)
    return im


def tour_guet():
    """La Tour de Guet : par la grande baie, la nuit ; au-dessus, l'œil grand ouvert de la vigie ; une cloche,
    et le registre ouvert où tout s'écrit."""
    im, d = toile()
    A.salle_pierre(im, d, 22, 12, 154, 102, plafond='voute', graine=35)
    d.rectangle([40, 52, 136, 96], fill=N)                                           # la baie sur la nuit
    A.ciel_nuit(d, 40, 52, 136, 96, graine=8, n=14, voile=0.55)
    d.rectangle([38, 50, 138, 52], fill=B); d.rectangle([38, 96, 138, 99], fill=B)
    for x in (38, 70, 104, 136):
        d.rectangle([x, 50, x + 2, 99], fill=B)
    cx, cy = 88, 28                                                                  # l'œil, ses rayons
    A.halo(d, cx, cy, 44, V, 0.5, 20, im=im, sur=N)
    d.ellipse([cx - 26, cy - 13, cx + 26, cy + 13], fill=B)
    d.ellipse([cx - 22, cy - 10, cx + 22, cy + 10], fill=N)
    d.ellipse([cx - 9, cy - 9, cx + 9, cy + 9], fill=V)
    d.ellipse([cx - 4, cy - 4, cx + 4, cy + 4], fill=N)
    d.point((cx + 2, cy - 2), fill=B)
    for k in range(-2, 3):
        d.line([(cx + k * 13, cy - 15), (cx + k * 17, cy - 22)], fill=B)
    d.line([(150, 14), (150, 30)], fill=B)                                           # la cloche
    d.polygon([(142, 46), (158, 46), (155, 32), (145, 32)], fill=V)
    d.rectangle([143, 30, 157, 32], fill=B); d.rectangle([148, 46, 152, 49], fill=B)
    d.polygon([(150, 32), (155, 32), (158, 46), (152, 46)], fill=N)
    A.halo(d, 88, 128, 40, V, 0.4, 18, ymin=104, im=im, sur=N)                       # le registre ouvert, sur son pupitre
    d.polygon([(46, 118), (88, 110), (130, 118), (130, 146), (88, 140), (46, 146)], fill=B)
    d.polygon([(46, 146), (88, 140), (130, 146), (130, 150), (88, 144), (46, 150)], fill=V)
    d.line([(88, 110), (88, 140)], fill=N, width=2)
    for k in range(6):
        d.line([(52, 120 + k * 4), (82, 114 + k * 4)], fill=V if k % 2 else N)
        d.line([(94, 114 + k * 4), (124, 120 + k * 4)], fill=N)
    d.rectangle([80, 150, 96, 166], fill=B); d.rectangle([92, 150, 96, 166], fill=V)
    A.torche_murale(im, d, 12, 74, 18, 0.5)
    A.torche_murale(im, d, 164, 74, 18, 0.5)
    return im


def tour_sceaux():
    """Les Sceaux d'intégrité : trois parchemins scellés de cire, reliés par une chaîne d'empreintes ;
    au pied du mur, des caisses de pièces neuves."""
    im, d = toile()
    A.salle_pierre(im, d, 24, 14, 152, 104, plafond='voute', graine=37)
    for i, x in enumerate((34, 75, 116)):
        A.halo(d, x + 13, 56, 26, V, 0.4, 36, im=im, sur=N)
        d.rectangle([x, 26, x + 26, 84], fill=B)
        d.rectangle([x - 2, 24, x + 28, 27], fill=V); d.rectangle([x - 2, 83, x + 28, 86], fill=V)
        for y in range(32, 64, 5):
            d.line([(x + 4, y), (x + 22, y)], fill=N)
        d.ellipse([x + 5, 64, x + 21, 80], fill=V)
        d.ellipse([x + 8, 67, x + 18, 77], fill=N)
        d.polygon([(x + 13, 68), (x + 17, 72), (x + 13, 76), (x + 9, 72)], fill=V)
        d.line([(x + 9, 80), (x + 7, 90)], fill=V, width=2); d.line([(x + 17, 80), (x + 19, 90)], fill=V, width=2)
    for xa in (60, 101):                                                             # la chaîne entre les sceaux
        A.chaine(d, [(xa + 1, 72), (xa + 14, 72)], B)
    for (x, y, w) in ((30, 136, 34), (68, 140, 30), (112, 134, 36)):                  # les caisses de pièces neuves
        d.rectangle([x, y, x + w, y + 22], fill=B)
        d.polygon([(x, y), (x + 6, y - 5), (x + w + 6, y - 5), (x + w, y)], fill=B)
        d.polygon([(x + w, y), (x + w + 6, y - 5), (x + w + 6, y + 17), (x + w, y + 22)], fill=V)
        d.line([(x, y), (x + w, y)], fill=N)
        d.line([(x, y), (x + w, y + 22)], fill=N, width=2); d.line([(x + w, y), (x, y + 22)], fill=N, width=2)
        d.rectangle([x + w // 2 - 6, y + 8, x + w // 2 + 6, y + 14], fill=V)
    return im


def tour_garde():
    """La Garde : le poste de garde, un écu au mur, une hallebarde, et une cellule grillée pour ceux qu'on bannit."""
    im, d = toile()
    A.salle_pierre(im, d, 22, 12, 154, 104, plafond='voute', graine=39)
    A.halo(d, 50, 50, 30, V, 0.5, im=im, sur=N)
    A.bouclier(d, 50, 28, 36, V)
    d.line([(92, 16), (92, 112)], fill=B, width=3); d.line([(93, 16), (93, 112)], fill=V)  # la hallebarde
    d.polygon([(86, 22), (100, 28), (100, 36), (92, 40), (92, 18)], fill=V)
    d.polygon([(92, 8), (95, 18), (89, 18)], fill=B)
    d.polygon([(86, 22), (92, 22), (92, 36), (88, 32)], fill=B)
    d.rectangle([108, 38, 148, 112], fill=N)                                          # la cellule
    A.trame(d, 108, 38, 148, 112, V, 0.12)
    for x in range(110, 148, 6):
        d.rectangle([x, 38, x + 1, 112], fill=B)
    d.rectangle([106, 36, 150, 40], fill=B); d.rectangle([106, 108, 150, 112], fill=B)
    d.rectangle([106, 70, 150, 72], fill=B)
    A.cadenas(d, 130, 84, V, 1)
    A.torche_murale(im, d, 30, 84, 18, 0.5)
    d.rectangle([40, 128, 96, 134], fill=B); d.rectangle([40, 134, 96, 136], fill=V)  # le banc du poste
    for x in (44, 88):
        d.rectangle([x, 136, x + 4, 156], fill=B)
    return im


def serveur_bastion():
    """La machine bastion : une baie de serveurs au cœur de la tour de pierre, frappée d'un écu ; ses voyants verts."""
    im, d = toile()
    A.salle_pierre(im, d, 30, 12, 146, 104, plafond='voute', graine=41)
    A.halo(d, 88, 80, 56, V, 0.5, 70, im=im, sur=N)
    d.polygon([(62, 18), (110, 18), (118, 12), (70, 12)], fill=B)                    # le dessus de la baie
    d.rectangle([62, 18, 110, 142], fill=B)
    d.polygon([(110, 18), (118, 12), (118, 136), (110, 142)], fill=V)
    d.rectangle([66, 22, 106, 138], fill=N)
    for k in range(8):
        y = 26 + k * 14
        d.rectangle([69, y, 103, y + 10], fill=B)
        d.line([(69, y + 10), (103, y + 10)], fill=V)
        for xx in range(86, 102, 3):
            d.line([(xx, y + 2), (xx, y + 7)], fill=N)
        d.rectangle([72, y + 3, 75, y + 6], fill=V if k % 3 else N)
        d.rectangle([78, y + 3, 81, y + 6], fill=V)
    d.rectangle([62, 142, 110, 146], fill=V)
    A.bouclier(d, 132, 34, 22, V)
    A.torche_murale(im, d, 44, 52, 20, 0.5)
    A.torche_murale(im, d, 132, 76, 16, 0.4)
    for (xa, xb, y) in ((40, 62, 150), (110, 136, 154)):                              # les câbles au sol
        d.line([(xa, y), (xb, y - 8)], fill=B, width=2)
    return im


# ------------------------------------------------------------------
# Les douze maîtres, dessinés au pixel près comme ceux de l'Académie (dessiner_academie.pixels), dans le
# caractère des personnages d'origine : des gardiens de forteresse aux silhouettes et aux accessoires très typés.
# ------------------------------------------------------------------
from dessiner_academie import pixels  # noqa: E402

def tete(r, y=12, cheveux=V, barbe=False, lunettes=False):
    r(37, y, 50, y + 17, B); yeux(r, 38, 45, y + 4)
    r(37, y, 50, y + 1, cheveux)
    r(43, y + 9, 44, y + 11, N)
    if lunettes: r(37, y + 3, 44, y + 3, N); r(45, y + 3, 51, y + 3, N)
    if barbe:
        r(36, y + 12, 51, y + 24, B); r(40, y + 13, 47, y + 13, N); r(40, y + 18, 40, y + 22, N); r(47, y + 18, 47, y + 22, N)
    else:
        r(41, y + 14, 46, y + 14, N)
    r(42, y + 18, 45, y + 19, B)


def cle(r, x, y, c=V):
    r(x, y, x + 5, y + 5, c); r(x + 1, y + 1, x + 4, y + 4, N); r(x + 2, y + 6, x + 3, y + 16, c); r(x + 4, y + 12, x + 6, y + 13, c); r(x + 4, y + 15, x + 5, y + 16, c)


def fernando_dessin(r):
    # le gardien des comptes, vieux et tout voûté sous sa calotte, la barbe en pointe : il plisse les yeux sur la
    # liste des comptes, si longue qu'elle se déroule jusqu'au sol ; un gros trousseau pend à sa ceinture
    pixels(r, 30, 25, """
        .....ooooooo
        ...ooooo#ooooo
        ..ooooooooooooo
        ..###############
        .##oooo##ooooo####
        .#o#####:::##:::###
        .#oo##############
        ..#####:#######:###
        ..###########:######
        ...#########:########
        ...########:::::#####
        ...##:#:#:#:#####:##
        ...##:#:#:#:#:####
        ...##:#:#:#:#:##
        ....#:#:#:#:#:#
        ....##:#:#:#:#
        .....#:#:#:##
        ......##:##
        .......###
        """)
    pixels(r, 49, 29, """
        .###########
        .#:::::::::#
        .#ooooooo::#
        .#:::::::::#
        .#oooo:ooo:#
        .#:::::::::#
        .#ooooooo::#
        .#:::::::::#
        .#oo:oooo::#
        .#:::::::::#
        .#ooooooooo#
        .#:::::::::#
        .#ooo:oo:::#
        .#:::::::::#
        .#oooooooo:#
        .#:::::::::#
        .#oooooo:::#
        ..#::::::::#
        ..#ooooo:::#
        ..#:::::::#
        ...#oooo::#
        ...#::::::#
        ...#ooooo:#
        ...#::::::#
        ....#ooo::#
        ....#:::::#
        ....#oooo:#
        ....#:::::#
        ....#oo:o:#
        .....#::::#
        .....#ooo:#
        .....#::::#
        .....#oo::#
        .....#::::#
        ......#::#
        ......#::#.....#####
        ......#:::#...#:::::#
        .......#:::###::ooo:#
        ........#::::::::::#
        .........##########
        """)
    pixels(r, 42, 34, """
        ..#######
        .#########
        .##:#:####
        ..#######
        """)
    pixels(r, 14, 43, """
        ...............oooooooooo
        ............oooooooooooooo
        ..........oooooooooooooooooo
        ........ooooo:oooooooooooooooo
        .......oooooo:ooooooooooooooo##
        ......ooooooo:oooooooooooooo####
        .....oooooooo:ooooooooooooo#####
        ....ooooooooo:oooooooooooo####
        ....oooooooooo:oooooooooooo
        ...ooooooooooo:ooooooooooooo
        ...oooooooooooo:oooooooooooo
        ...######################ooooo
        ...#:##:##:##:#:##:##:##oooooo
        ...######################ooooo
        ..ooooooooooooo:oooooooooooooo
        ..oooooooooooooo:ooooooooooooo
        ..ooooooooooooooo:oooooooooooo
        ..oooooooooooooooo:oooooooooooo
        ..ooooooooooooooooo:ooooooooooo
        ..oooooooooooooooooo:oooooooooo
        .ooooooooooooooooooooo:oooooooo
        .oooooooooooooooooooooo:ooooooo
        .oooooooooooooooooooooooooooooo
        .##########################.###
        ###########.####.###########.###
        """)
    pixels(r, 30, 55, """
        ...#####
        ..#:::::#
        .#:::::::#
        .#:::::::#
        .#:::::::#
        ..#:::::#
        ...#####
        ..#.#.#.#
        ..#.#.#.#
        .##.#.##.##
        .#..##..#.#
        .##.#...###
        ..........#
        """)
    pixels(r, 10, 71, """
        .......########.################.....###########
        .
        ............##########.....##################
        .
        .........................#######
        """)


def butler_dessin(r):
    # le chancelier du Sceau du Roi, le nez en l'air sous sa haute toque, longue robe à bande verte : il brandit le
    # grand sceau comme un marteau de juge, un rouleau scellé sous le bras
    pixels(r, 26, 25, """
        ...#######
        ...#oooo:#
        ...#oooo:#
        ...#oooo:#
        ...#oooo:#
        ...#oooo:#
        ...#oooo:#
        ..##########
        ..#oooooo::#
        .############
        """)
    pixels(r, 24, 35, """
        .....#########
        ....###########
        ...###:::######
        ...######:#####
        ..########:######
        ..#########:#######
        ..########::::::##
        ...##############
        ...###::::#####
        ....###########
        .....#########
        ......#######
        """)
    pixels(r, 20, 47, """
        .........######.####
        .......####oo#oo#####
        ......####:oo#oo:#####
        .....#####:oo#oo:######
        .....####:ooo#ooo:#####
        ....#####:ooo#ooo:######
        ....####:oooo#oooo:#####
        ....####:ooo:#:ooo:#####
        ...#####:oooo#oooo:######
        ...####:ooooo#ooooo:#####
        ...####:oooo:#:oooo:######
        ..#####:ooooo#ooooo:######
        ..####:oooooo#oooooo:#####
        ..####:ooooo:#:ooooo:######
        .#####:oooooo#oooooo:######
        .####:ooooooo#ooooooo:######
        .####:oooooo:#:oooooo:######
        #####:ooooooo#ooooooo:#######
        ####:oooooooo#oooooooo:######
        ################################
        .####...####.......####...####
        """)
    pixels(r, 39, 27, """
        ......#######
        .....#########
        .....##ooooo##
        .....##o#o#o##
        .....##ooooo##
        .....#########
        ......#######
        ........###
        ........###
        ........###
        ........###
        ........###
        ........###
        ........###
        ........###
        ........###
        .......#####
        ......#######
        .....#######
        .....######
        ....######
        ...######
        ..######
        .######
        ######
        """)
    pixels(r, 46, 25, """
        ..o...o
        o.......o
        ...o.o
        """)
    pixels(r, 20, 55, """
        ...........######
        ..oooooooo#######
        .oo######o#####
        oo#::::::#o####
        o#:::::::::#o##
        o##########oo
        .ooooooooooo
        ....#.o
        ....oo
        .....#o
        ......#
        """)
    pixels(r, 20, 71, """
        .......########.#######################
        .
        ...........##########......###########
        .
        .......................#####
        """)


def tatu_dessin(r):
    # le passeur du Pont-levis, cheveux en épis, l'écharpe qui vole au vent : il marche à grands pas, la grosse clé
    # au bout de sa chaîne qui se balance
    pixels(r, 20, 49, """
        o
        .oo
        ..ooo
        ...oooo
        ....ooooooo
        .....oooooooooooo
        ...oo.ooooooooooo
        .oo.....oooo#oooo
        o........ooooooooo
        ..........o#oooo
        """)
    pixels(r, 30, 31, """
        ......o.o..o.o
        ....o.ooooooooo.o
        ...ooooooooooooooo
        ..o#############o
        ..o##::####::###oo
        ...#:##:##:##:#ooo
        ...############.oo
        ...######::#####
        ...#####:###:####
        ...######::#######
        ...##############
        ....###:::::###
        .....##:###:##
        ......#######
        """)
    pixels(r, 29, 51, """
        ......##########
        ....######oooooo#
        ...#####oooooooo#
        ...####:oooooooo##
        ..#####:ooooooo:###
        ..####:oooooooo:####
        .#####:oooooooo:#####
        .####::ooooooooo::####
        .###...oooooooooo..####
        .##....oooooooooo...###
        .##....oooooooooo....##
        .##....oooo:ooooo....##
        .#.....oooo..oooo.....##
        .#.....oooo...oooo
        .......oooo....oooo
        .......oooo.....oooo
        .......oooo......oooo
        .......oooo.......oooo
        ......#####........#####
        .....######........######
        """)
    pixels(r, 47, 33, """
        ......#####
        .....#ooooo#
        ....#oo:::oo#
        ....#o:::::o#
        ....#oo:::oo#
        .....#ooooo#
        ......#####
        .......###
        ........###
        .........###
        ..........###
        ...........###
        ............####
        .............#:#:
        ..............####
        ...............#:#:
        ................###
        ................#:#
        ...............#####
        ..............##.###
        ..............#...#.#
        ..............##.###
        ...............#####
        """)
    pixels(r, 16, 71, """
        .......######.###################.....#####
        .
        ..........##########.......##########
        .
        ............................######
        """)


def jean_dessin(r):
    # le menuisier des Portes condamnées, casquette, crayon sur l'oreille et des clous entre les dents : le marteau
    # levé, une planche sous le bras, le tablier à outils
    pixels(r, 56, 29, """
        .......##
        ......#oo
        .....#ooo
        ....#oooo
        ...#ooooo
        ..#oooooo
        .....###
        .....###
        .....###
        .....###
        .....###
        .....###
        .....###
        .....###
        ....####
        ...####
        """)
    pixels(r, 38, 33, """
        .....oooooooooo
        ...oooooooooooooo
        ...ooooooooooooooooooo
        ..o#############o
        ..o#::::####:::#o
        ..o##:#:####:#:##
        ..o##############
        ..o#########:####
        ...#######:::####
        ...###:#:#:#:#:##
        ...###:#:#:#:#:#
        ....####::::###
        .....#########
        """)
    pixels(r, 50, 43, """
        ###
        .###
        ..###
        ...###
        ....###
        """)
    pixels(r, 53, 45, """
        ...##
        ..##
        .###
        ###
        """)
    pixels(r, 30, 47, """
        ............#########
        ..........######oo#####
        .........####oo:###oo###
        ........####ooo:###ooo####
        .......####oooo:###oooo####
        ......####:oooo:###oooo:####
        .....####::oooo:###oooo::####
        ....####...oooo#####oooo..####
        ....###...#:::::::::::::#..###
        ....##....#:o:o:#:o:o:::#...##
        ...###....#:::::::::::::#...###
        ...##.....###############....##
        ..###......ooooooooooooo......###
        ..##.......oooooo.oooooo.......##
        ..##.......oooooo.oooooo........##
        ...........ooooo...ooooo
        ...........ooooo...ooooo
        ...........ooooo...ooooo
        ...........ooooo...ooooo
        ...........ooooo...ooooo
        ..........######...######
        .........#######...#######
        """)
    pixels(r, 22, 56, """
        .
        ######################
        #::::::::::::::::::::#
        #o:o::o:ooo::::o::oo:#
        ######################
        """)
    pixels(r, 30, 71, """
        .....#######.#############.##########
        .
        .........###########......############
        .
        ...................#######
        """)


def vint_dessin(r):
    # Vint, l'administrateur réseau tout juste rentré de vacances : lunettes de soleil vertes, le nez qui pèle, barbe
    # courte, chemise à fleurs, le casque autour du cou ; la truelle levée, une brique dans l'autre main
    pixels(r, 34, 32, """
        ......########
        .....##########
        ....############
        ....###::##::###
        ...o###########o
        ..oo#oooo#oooo#oo
        ..o##ooo#.#ooo##o
        ..o###########.##o
        ..o#######o######o
        ..o######ooo#####o
        ..o#######o######o
        ....###:::::::###
        ....#o#o#o#o#o#o
        .....#o#o#o#o#o
        ......#o#o#o#
        """)
    pixels(r, 30, 47, """
        .......o####o
        .....oo######oo
        ....o##########o
        ...o###:###:####o
        ..###o:o####o:o###
        .####:o#####:o####
        #####o:o####o:o#####
        ####:o:####:o:o#####
        ####o:o:###o:o:o####
        .##.:o:o###:o:o:.###
        .##.o:o:###o:o:o.##
        ..#.ooooooooooooo.##
        ..#.ooooooooooooo..##
        ....ooooo...ooooo...#
        ....ooooo...ooooo
        ....ooooo...ooooo
        ....ooooo...ooooo
        ....ooooo...ooooo
        ....ooooo...ooooo
        ...######...######
        ..#######...#######
        """)
    pixels(r, 54, 44, """
        .....#
        ....##
        ...###
        ..###
        .###
        ###
        """)
    pixels(r, 56, 38, """
        #########
        #ooooooo#
        #ooooooo#
        .#ooooo#
        ..#####
        """)
    pixels(r, 24, 53, """
        #############
        #:::##::::###
        ##:::##::::##
        #:::##::::###
        #############
        """)
    pixels(r, 24, 71, """
        ..#######.##################.#########
        .
        .......########......###########
        ......o.............o.............o
        ..................#######
        """)


def evelyn_dessin(r):
    # la gardienne des Coffres, haut chignon piqué d'une clé, robe à ceinture de clés : elle brandit un gros cadenas
    # d'un air soupçonneux, un petit coffre ferré sous le bras
    pixels(r, 36, 25, """
        .......ooooo
        ......ooooooo
        ......ooooooo
        .......ooooo####
        ........ooo..#:#
        .....##########
        ....############
        ...oo##########oo
        ..ooo#:::##:::#ooo
        ..ooo#:##.#:##.ooo
        ..oo############oo
        ..oo#####:######oo
        ..oo####::######oo
        ..ooo##########ooo
        ..ooo###::::###ooo
        ...oo##########oo
        ....o.########.o
        """)
    pixels(r, 32, 42, """
        ...........####
        .........########
        ........###oooo###
        .......###oooooo###
        ......###:oooooo:###
        .....####:oooooo:####
        .....###:oooooooo:###
        ....####:oooooooo:####
        ....###:oooooooooo:###
        ....#ooooooooooooooooo#
        ....######################
        .....oo#ooo#ooo#ooo#ooo
        .....oo#ooo#ooo#ooo#oo
        ....ooo:ooooooooooo:oooo
        ....ooo:ooooooooooo:oooo
        ...oooo:ooooooooooo:ooooo
        ...ooo:ooooooooooooo:oooo
        ..oooo:ooooooooooooo:ooooo
        ..ooo:ooooooooooooooo:oooo
        .oooo:ooooooooooooooo:ooooo
        .ooo:ooooooooooooooooo:oooo
        oooo:ooooooooooooooooo:ooooo
        ############################
        """)
    pixels(r, 55, 25, """
        ....#######
        ...##:::::##
        ..##:.....:##
        ..#:.......:#
        ..#:.......:#
        ..#:.......:#
        #################
        #ooooooooooooooo#
        #ooooo#####ooooo#
        #ooooo#:::#ooooo#
        #oooooo#:#oooooo#
        #oooooo#:#oooooo#
        #ooooooo#ooooooo#
        #ooooooooooooooo#
        #################
        .....###
        .....###
        .....###
        .....###
        .....###
        ....###
        ...###
        """)
    pixels(r, 18, 47, """
        ....###
        ...#####
        .##########
        ################
        #oooo#oooo#ooooo#
        ################
        #:::::::###:::::#
        #:::::::#o#:::::#
        #:::::::###:::::#
        #:::::::::::::::#
        ################
        """)
    pixels(r, 18, 71, """
        .....#######.#######################.######
        .
        .........##########.....##############
        .
        .......................######
        """)


def edsger_dessin(r):
    # le mécanicien du Cœur, crâne dégarni, lunettes, salopette : penché en avant, la main en cornet derrière l'oreille
    # (chut, le cœur bat), la clé à molette dans l'autre, la burette, un engrenage tombé au sol
    pixels(r, 34, 37, """
        ....o.o...o
        ..o.o#####o.o
        ...#########
        ..###########
        .o###########
        .oo#oooo#oooo#
        .o##o::o#o::o###
        ..##oooo#oooo####
        ..###########:#####
        ..##########:#######
        ...########:::::###
        ...######:::####
        ....######:####
        .....##########
        ......#######
        """)
    pixels(r, 48, 42, """
        ...##
        ..#.#
        ..#.#
        ..##
        """)
    pixels(r, 18, 50, """
        ...................#####
        ...............#########ooo
        ............####ooooooooooooo
        ..........#####:oooooooooooo:##
        ........######:ooooooooooooo:####
        .......######::ooo#oooooooo#ooo####
        ......######..oooo#oooooooo#oooo.###
        .....######...ooooooooooooooooooo..##
        ....#####.....ooooooooooooooooooo...##
        ...#####......oooooo:####:ooooooo...###
        ...####.......oooooo:#::#:ooooooo....##
        ..####........oooooo:####:ooooooo....##
        ..###.........ooooooooooooooooooo....###
        .####.........ooooooooooooooooooo
        .####.........ooooooooo.oooooooooo
        ..##..........ooooooo....ooooooooo
        ...............oooooo.....ooooooo
        ...............oooooo......oooooo
        ...............oooooo......oooooo
        ...............oooooo......oooooo
        ..............#######......#######
        .............########......########
        """)
    pixels(r, 13, 49, """
        ......####
        .....##..##
        ....##....##
        ....##....##
        .....##..##
        ......####
        ......####
        ......####
        ......####
        ......####
        ......####
        ......####
        ......####
        ......####
        ......####
        ......####
        ......####
        .......##
        """)
    pixels(r, 30, 67, """
        .....#
        ....##
        ...###
        ..#####
        .#ooooo#
        .#ooooo#
        .#######
        """)
    pixels(r, 60, 62, """
        .....o.o.o
        ...o.ooooo.o
        ....ooooooo
        ...ooo:::ooo
        ...oo:::::oo
        ...ooo:::ooo
        ....ooooooo
        ...o.ooooo.o
        .....o.o.o
        """)
    pixels(r, 8, 71, """
        ....#######.###################.#######
        .
        .........##########......############
        .
        ...................#######
        """)


def joan_dessin(r):
    # la gardienne de la Poterne, accroupie dans sa grande cape à capuche, un cadenas à la ceinture : elle lève sa
    # lanterne vers la petite porte basse que personne ne surveille
    pixels(r, 54, 41, """
        .......###########
        ......#ooooooooooo#
        .....#ooooooooooooo#
        ....#ooo#########ooo#
        ....#oo#:::::::::#oo#
        ....#oo#:::::::::#oo#
        ....#oo#:::###:::#oo#
        ....#oo#:::###:::#oo#
        ....#oo#::::#::::#oo#
        ....#oo#::::#::::#oo#
        ....#oo#:::::::::#oo#
        ....#oo#:::::::::#oo#
        ....#oo#:::::::::#oo#
        ...#####:::::::::#####
        """)
    pixels(r, 12, 37, """
        .............ooo
        ............oooooo
        ...........oooooooo
        ..........oooooooooo
        .........oooooooooooo
        ........ooooo...ooooooo
        ........oooo......ooooo
        .......oooo..#####.oooo
        .......ooo..###::#..ooo
        .......ooo..######..ooo
        .......ooo...###:...ooo
        .......oooo...####..ooo
        .......ooooo...##..oooo
        ......ooooooo.....ooooo
        .....oooooooooooooooooo
        ....oooooooooooooooooooo
        ...ooooooooooooooooooooo#
        ..ooooooooooooooooooooo###
        ..oooooooooooooooooooooo###
        .oooooooooooooooooooooooooo#
        .ooooooooo:ooooooooooooooooo#
        oooooooooo:oooo#####oooooo###
        oooooooooo:oooo#:::#ooooo
        oooooooooo:oooo#:#:#oooooo
        ooooooooooo:ooo#####ooooooo
        ooooooooooo:ooooooooooooooo
        .ooooooooooo:ooooooooooooo##
        ..oooooooooooooooooooooo####
        ...oooooooooooooooooo#####
        ....ooooooooooo.#######
        .....#####
        """)
    pixels(r, 36, 43, """
        ......###
        .....#:::#
        .....#:::#
        ......###
        .....#####
        ....#ooooo#
        ....#oo#oo#
        ....#o###o#
        ....#oo#oo#
        ....#ooooo#
        .....#####
        ...o.......o
        .....o...o
        """)
    pixels(r, 6, 71, """
        .....######.#####################.###########
        .
        ........###########.......##############
        .
        .........................######
        """)


def robert_dessin(r):
    # le porte-bannière, petit et fier, le poing sur la hanche : à côté de lui, sur son mât, l'immense bannière couverte
    # d'inscriptions qu'il ne faudrait pas montrer, barrée d'une croix
    pixels(r, 36, 17, """
        ...##
        ..####
        ...##
        ...##
        ...##################################
        ...##::::::::::::::::::::::::::::::#
        ...##:##:###:##:####:##:###:####:::#
        ...##:o:::::::::::::::::::::::::o::#
        ...##::o:#:##:###:##:#::##:##::o:::#
        ...##:::o::::::::::::::::::::o:::::#
        ...##:##::o:###:#:###:##::#:o::###:#
        ...##:::::::o:::::::::::::o::::::::#
        ...##:#:##:##:o:#:####::o:#:##:#:::#
        ...##:::::::::::o::::::o:::::::::::#
        ...##:###:##:#:###o::o::##:##:###::#
        ...##::::::::::::::oo::::::::::::::#
        ...##:##:#:###::::oo:o::###:#:##:::#
        ...##::::::::::::o::::o::::::::::::#
        ...##:#:###:##:o:##:#::o:#:##:###::#
        ...##:::::::::o::::::::::o:::::::::#
        ...##:##::#:o:###:##:#:::o:#:###:::#
        ...##:::::o::::::::::::::::o:::::::#
        ...##:#::o::##:#:###:##:##::o:##:::#
        ...##::::::::::::::::::::::::::::::#
        ...##################################
        ...##.#o#.#o#.#o#.#o#.#o#.#o#.#o#.#
        ...##..o...o...o...o...o...o...o
        ...##
        ...##
        ...##
        ...##
        ...##
        ...##
        ...##
        ...##
        ...##
        ...##
        ...##
        ...##
        ...##
        ...##
        ...##
        ...##
        ...##
        ...##
        ...##
        ..####
        """)
    pixels(r, 16, 43, """
        .......ooooo
        ......ooooooo
        .....#########
        .....##:::####
        ....###.##.###
        ....###########
        ....#####:#####
        .....####::####
        .....##########
        ......##::::##
        .......######
        """)
    pixels(r, 12, 54, """
        .......###.....###
        ...#####oooooooo#####
        ..####:oooo#ooooo:####
        .###:::oooooooooo:::###
        .##...ooooo#oooooo...###
        ###...oooooooooooo....##
        .##...ooooo#ooooooo
        .###..oooooooooooo
        ..###.##############
        ...##.ooooooooooooo
        ......ooooooo.ooooo
        ......oooooo...oooo
        ......oooooo...oooo
        ......oooooo...oooo
        .....#######..#####
        ....########..######
        """)
    pixels(r, 6, 71, """
        ......#######.#######################.######
        .
        ..........##########......#############
        .
        ...........................#######
        """)


def katherine_dessin(r):
    # la vigie de la Tour de Guet, longs cheveux, assise sur une caisse : l'œil à sa longue-vue, le registre où elle
    # écrit tout ouvert sur les genoux
    pixels(r, 24, 32, """
        .......ooooooooo
        .....ooooooooooooo
        ....ooo#########oo
        ...ooo###########o
        ...oo####::::####o#########################
        ...oo###:.::::####::::::::::::::::::::::::#
        ...oo#####:#######::::::::::::::::::::::::#
        ...ooo############################:###:####
        ...oooo#####::::##.................#...#
        ...ooooo#########..................#...#
        ...oooooo#######
        ...ooooooo#####
        ..oooooooo.##
        .oooooooooo#######
        .ooooooooo##ooooo###
        oooooooooo#ooooooo###
        ooooooooo##ooooooo:###
        .ooooooo###ooooooo:####
        ..ooooo####ooooooo:#####
        .....####:ooooooo:######
        .....###:oooooooo:##.###
        .....###oooooooooo####.##
        .....##oo###############o
        .....##o##:::::::#:::::#o
        .....###:#:o:oo::#:oo::#
        .....###:#:o:o:o:#::o:o#
        .....##oo###############
        .....oooooooooooooooooooo
        .....oooooooooooooooooooo
        ....#####################oooo
        ....#:::::::::::::::::::#oooo
        ....#:###::###::###:###:#oooo
        ....#:#:#::#:#::#:#:#:#:#oooo
        ....#:###::###::###:###:#oooo
        ....#:::::::::::::::::::#oooo
        ....#####################oooo
        .........................oooo
        ........................######
        .......................#######
        """)
    pixels(r, 18, 71, """
        .....#######.#####################.#########
        .
        .........##########......############
        .
        .......................#######
        """)


def ralph_dessin(r):
    # le gardien des Sceaux, barbu et massif, une chaîne de sceaux de cire en bandoulière : il appuie son tampon sur
    # une caisse cachetée pour comparer l'empreinte
    pixels(r, 25, 34, """
        ......#########
        .....###########
        ....#############
        ....##:::###:::##
        ....###:####:####
        ....#############
        ....#######:#####
        ....######::::###
        ...o##############o
        ..oo##::::::::####oo
        ..o################o
        ..o###:#:#:#:#:###o
        ...o##:#:#:#:#:##o
        ....###:#:#:#:###
        .....##:#:#:#:##
        ......###:#:###
        ........#####
        """)
    pixels(r, 19, 50, """
        ..........ooooooooo
        .......ooooo#oooooooo
        .....ooooooo#oooooooooo####
        ....ooooooooo#oooooooooo######
        ...oooooo#ooo#ooooooooo#ooo####
        ..oooooooo#ooo#oooooooo##ooooo###
        ..ooooooooo##oo#oooooooo#ooooo:##
        .ooooooooooo#oo#oooooooooooooo:.##
        .ooooooooooo:#ooo#ooooooooooooo..###
        oooooooooooo:##oo#oooooooooooooo...##
        oooooooooooo:o#ooo#ooooooooooooo...#
        oooooooooooo:oo##oo#oooooooooooo
        oooooooooooo:ooo#ooo#ooooooooooo
        .ooooooooooo:oooo#oo#ooooooooooo
        .ooooooooooo:ooooo#oo#oooooooooo
        ..oooooooooo:oooooo#oo#ooooooooo
        ..oooooooooo:ooooooo####oooooooo
        ...ooooooooo:oooooooo#:#ooooooo
        ...ooooooooo:oooooooo###oooooooo
        ...oooooooooooooooooooooooooooooo
        ....##########.......##########
        ...###########.......###########
        """)
    pixels(r, 33, 53, """
        .....##
        ....#oo#
        ....#oo#
        .....##
        .........##
        ........#oo#
        ........#oo#
        .........##
        .............##
        ............#oo#
        ............#oo#
        .............##
        """)
    pixels(r, 53, 48, """
        .......####
        ......######
        .......####
        .......####
        .......####
        .......####
        .......####
        .....########
        ....##########
        ....#oooooooo#
        ....##########
        """)
    pixels(r, 51, 60, """
        .##################
        .#oooooooooooooooo#
        .#o###:o:o:o:###oo#
        .#o#oo###:###oo#oo#
        .#o###:o:o:o:###oo#
        .#oooooooooooooooo#
        .#o###:o:o:o:###oo#
        .#o#oo###:###oo#oo#
        .#o###:o:o:o:###oo#
        .#oooooooooooooooo#
        .##################
        """)
    pixels(r, 15, 71, """
        .....#######.######################.#######
        .
        ...........##########......##########
        .
        ......................#######
        """)


def adele_dessin(r):
    # la capitaine de la Garde, casque à nasal et tresse, cotte de mailles et tabard à croix : l'écu au bras, la
    # hallebarde bien droite, en pleine ronde
    pixels(r, 52, 29, """
        ....#
        ...###
        ..#####.##
        .##:#:####
        ..#####.##
        ...###
        ....#
        ....#
        ....#
        ....#
        ....#
        ....#
        ....#
        ....#
        ....#
        ....#
        ....#
        ....#
        ....#
        ....#
        ....#
        ....#
        ....#
        ....#
        ....#
        ....#
        ....#
        ....#
        ....#
        ....#
        ....#
        ....#
        ....#
        ....#
        ....#
        ....#
        ....#
        ....#
        ....#
        ....#
        ....#
        ....#
        ....#
        """)
    pixels(r, 40, 33, """
        ...######
        ..########
        .##########
        .oooo##oooo
        .#####.#####
        .##::#.#::##
        .#####.#####
        .######.####
        .######.####
        ..########
        ..##::::##
        ...######
        ....####.oo
        ..........oo
        ...........o
        """)
    pixels(r, 34, 48, """
        ......########
        ....############
        ...#####oooo#####
        ..##:#:oooooo:#:##
        ..#:#:#oo##oo#:#:#
        .##:#:#oo##oo#:#:##
        .#:#:#:o####o#:#:#:#
        ##:#:#:oo##oo#:#:#:##
        #:#:#:#oo##oo#:#:#:#:#
        ##:#:#:oo##oo#:#:#:##
        .#:#:#:oo##oo#:#:#:#
        .##:#:#oooooo#:#:##
        ..#:#:#oooooo#:#:#
        ...#####:##:#####
        ....ooooo..ooooo
        ....ooooo..ooooo
        ....ooooo..ooooo
        ....ooooo..ooooo
        ....ooooo..ooooo
        ...######..######
        ..#######..#######
        """)
    pixels(r, 24, 49, """
        ....#########
        ...#ooooooooo#
        ...#ooo#:#ooo#
        ...#ooo#:#ooo#
        ...##########
        ...#ooo#:#ooo#
        ...#ooo#:#ooo#
        ....#oo#:#oo#
        .....#o#:#o#
        ......#####
        .......###
        """)
    pixels(r, 20, 71, """
        ......#######.#####################.#######
        .
        .........###########......############
        .
        .......................#######
        """)


def pierre_dessin(r):
    # la Pierre d'Inspection : un monolithe taillé sur son socle, sa face d'ombre, sa jauge (le score qui monte)
    for k in range(4): r(32 + k * 3, 4 - k, 55 - k * 3, 4 - k, B)
    r(29, 5, 58, 64, B); r(52, 5, 58, 64, V); r(52, 2, 55, 4, V)
    r(33, 10, 49, 60, N)
    for k in range(10):
        r(36, 56 - k * 5, 46, 58 - k * 5, V if k < 4 else N)
        if k >= 4: r(36, 56 - k * 5, 46, 58 - k * 5, N); r(36, 58 - k * 5, 46, 58 - k * 5, V)
    for (x, y) in ((54, 12), (56, 30), (53, 48)): r(x, y, x + 1, y + 3, N)
    r(24, 64, 63, 67, B); r(58, 64, 63, 67, V); r(22, 67, 65, 68, V)
    for x, y in ((18, 14), (68, 20), (16, 40), (70, 46), (20, 58)): r(x, y, x, y, B); r(x - 1, y, x + 1, y, V); r(x, y - 1, x, y + 1, V); r(x, y, x, y, B)
    sol_tirets(r, 71)


PORTRAITS = {
    "item_fernando.gif": fernando_dessin, "item_butler.gif": butler_dessin, "item_tatu.gif": tatu_dessin,
    "item_jean.gif": jean_dessin, "item_vint.gif": vint_dessin, "item_evelyn.gif": evelyn_dessin,
    "item_edsger.gif": edsger_dessin, "item_joan.gif": joan_dessin, "item_robert.gif": robert_dessin,
    "item_katherine.gif": katherine_dessin, "item_ralph.gif": ralph_dessin, "item_adele.gif": adele_dessin,
    "item_pierre.gif": pierre_dessin,
}


def lettre_inspection(nom="item_lettre_inspection.gif"):
    """La cinquième enveloppe : un pli officiel de l'Inspection, scellé d'un bouclier, liseré de remparts."""
    from PIL import Image, ImageDraw
    from dessiner_lieux import PAL, OUT
    w, h = 60, 42
    im = Image.new('P', (w, h), N); im.putpalette(PAL); d = ImageDraw.Draw(im)
    d.rectangle([2, 6, 57, 39], fill=B)
    d.line([(2, 6), (29, 25), (57, 6)], fill=N, width=2)
    d.line([(2, 39), (22, 22)], fill=N); d.line([(57, 39), (37, 22)], fill=N)
    for x in range(4, 56, 6): d.rectangle([x, 36, x + 2, 39], fill=V)          # des créneaux
    d.polygon([(23, 17), (36, 17), (36, 25), (29.5, 31), (23, 25)], fill=V)    # le sceau en bouclier
    d.polygon([(26, 19), (33, 19), (33, 24), (29.5, 28), (26, 24)], fill=N)
    im.resize((w * 2, h * 2), Image.NEAREST).save(OUT + nom)


LIEUX = {
    "loc_bastion.gif": bastion, "loc_tour_herse.gif": tour_herse, "loc_tour_sceau.gif": tour_sceau,
    "loc_tour_pontlevis.gif": tour_pontlevis, "loc_tour_portes.gif": tour_portes, "loc_tour_remparts.gif": tour_remparts,
    "loc_tour_coffres.gif": tour_coffres, "loc_tour_coeur.gif": tour_coeur, "loc_tour_poterne.gif": tour_poterne,
    "loc_tour_banniere.gif": tour_banniere, "loc_tour_guet.gif": tour_guet, "loc_tour_sceaux.gif": tour_sceaux,
    "loc_tour_garde.gif": tour_garde, "loc_serveur_bastion.gif": serveur_bastion,
}

if __name__ == "__main__":
    noms = sys.argv[1:] or list(LIEUX) + list(PORTRAITS) + ["item_lettre_inspection.gif"]
    n = 0
    for nom in noms:
        if nom in LIEUX:
            finir(nom, LIEUX[nom]()); n += 1
        elif nom in PORTRAITS:
            (A.perso_fini if nom == "item_pierre.gif" else perso)(nom, PORTRAITS[nom]); n += 1
        elif nom == "item_lettre_inspection.gif":
            lettre_inspection(nom); n += 1
    print(n, "dessins")
