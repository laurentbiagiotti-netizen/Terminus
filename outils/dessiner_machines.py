"""Dessine Lumen (chapitre 6) : le hall, la cité de nuit et rallumée, le Cœur de Lumen, les seize quartiers,
les seize gardiens, les six habitants des quêtes annexes et la Lanterne de Lumen (la sixième enveloppe).

Même style que les chapitres 4 et 5 (dessiner_academie.py, dessiner_bastion.py) : pixel art 1 bit épais
(noir, vert, blanc), des pièces en perspective, les personnages en pied comme ceux des chapitres 2 à 5
(dessiner_panne.perso : grille 88 x 85, tête carrée, yeux à pupille, sol en tirets).
Usage : python3 outils/dessiner_machines.py [nom...]
"""
import os, sys, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from dessiner_lieux import toile, finir, N, V, B, W, H  # noqa: E402
from dessiner_fantasy import tramer, briques, arche, torche, etoiles, lune, flamme  # noqa: E402
from dessiner_academie import salle, texte, robe_mage, bras, jambes, pieds_robe, sablier  # noqa: E402
from dessiner_panne import perso, sol_tirets  # noqa: E402
from dessiner_bastion import tete, cle, cadenas  # noqa: E402


# ------------------------------------------------------------------
# Petites briques
# ------------------------------------------------------------------

def reverbere(d, x, y, allume=True):
    """Un réverbère de la cité : un mât, une tête de lanterne, allumée (verte) ou éteinte."""
    d.rectangle([x - 1, y, x + 1, y + 44], fill=B)
    d.rectangle([x - 6, y + 44, x + 6, y + 47], fill=B)
    d.polygon([(x - 6, y - 2), (x + 6, y - 2), (x + 4, y - 12), (x - 4, y - 12)], fill=B)
    d.rectangle([x - 4, y - 11, x + 4, y - 3], fill=V if allume else N)
    d.polygon([(x - 5, y - 12), (x + 5, y - 12), (x, y - 17)], fill=B)
    if allume:
        for k in (-1, 1):
            d.line([(x + k * 8, y - 8), (x + k * 12, y - 8)], fill=V)


def maisons(d, y, allumees, graine=3):
    """Une rangée de toits ; certaines fenêtres sont allumées."""
    x, k = 0, 0
    while x < W:
        w = 18 + (k * 7 + graine) % 12
        h = 22 + (k * 11 + graine) % 18
        d.rectangle([x, y - h, x + w, y], fill=B)
        d.polygon([(x - 1, y - h), (x + w + 1, y - h), (x + w // 2, y - h - 8)], fill=B)
        d.rectangle([x + 2, y - h + 2, x + w - 2, y], fill=N)
        for fy in range(y - h + 5, y - 4, 8):
            for fx in range(x + 4, x + w - 4, 7):
                d.rectangle([fx, fy, fx + 3, fy + 3], fill=V if allumees and (fx + fy + k) % 3 else B if allumees else N)
                if not allumees:
                    d.rectangle([fx, fy, fx + 3, fy + 3], outline=B)
        x += w + 3
        k += 1


def phare(d, x, y, allume=True):
    """Le Phare de Lumen : une tour rayée, la lanterne au sommet, des rayons si elle brille."""
    d.polygon([(x - 10, y + 70), (x + 10, y + 70), (x + 6, y), (x - 6, y)], fill=B)
    for k in range(4):
        yy = y + 8 + k * 16
        d.rectangle([x - 7 - k, yy, x + 7 + k, yy + 5], fill=V)
    d.rectangle([x - 9, y - 4, x + 9, y], fill=B)
    d.rectangle([x - 6, y - 16, x + 6, y - 4], fill=B)
    d.rectangle([x - 4, y - 14, x + 4, y - 6], fill=V if allume else N)
    d.polygon([(x - 8, y - 16), (x + 8, y - 16), (x, y - 24)], fill=B)
    if allume:
        for a in (-1, 1):
            d.polygon([(x + a * 6, y - 12), (x + a * 60, y - 26), (x + a * 60, y - 2)], fill=V)
            d.polygon([(x + a * 6, y - 10), (x + a * 56, y - 20), (x + a * 56, y - 8)], fill=B)


def engrenage(d, x, y, r, c=B, dents=8):
    for k in range(dents):
        a = k * 2 * math.pi / dents
        d.rectangle([x + (r + 1) * math.cos(a) - 2, y + (r + 1) * math.sin(a) - 2,
                     x + (r + 1) * math.cos(a) + 2, y + (r + 1) * math.sin(a) + 2], fill=c)
    d.ellipse([x - r, y - r, x + r, y + r], fill=c)
    d.ellipse([x - r // 2, y - r // 2, x + r // 2, y + r // 2], fill=N)


def caisse(d, x, y, w=20, h=16, c=B):
    d.rectangle([x, y, x + w, y + h], fill=c)
    d.rectangle([x + 2, y + 2, x + w - 2, y + h - 2], fill=N)
    d.line([(x + 2, y + 2), (x + w - 2, y + h - 2)], fill=c)
    d.line([(x + w - 2, y + 2), (x + 2, y + h - 2)], fill=c)


def jauge(d, x0, y0, x1, y1, part, c=V):
    d.rectangle([x0, y0, x1, y1], fill=B)
    d.rectangle([x0 + 2, y0 + 2, x1 - 2, y1 - 2], fill=N)
    d.rectangle([x0 + 2, y0 + 2, x0 + 2 + int((x1 - x0 - 4) * part), y1 - 2], fill=c)


# ------------------------------------------------------------------
# Le hall, la cité, le Cœur
# ------------------------------------------------------------------

def lumen():
    """Le hall de Lumen : une place au crépuscule, le Phare au fond, une horloge et la radio de Grace."""
    im, d = toile()
    etoiles(d, n=10, graine=61, ymax=40)
    phare(d, 88, 36, allume=False)
    maisons(d, 122, allumees=True, graine=5)
    d.polygon([(0, 122), (176, 122), (176, 170), (0, 170)], fill=V)
    tramer(d, 2, 150, 173, 168, c=N, pas=3)
    reverbere(d, 26, 104); reverbere(d, 150, 104, allume=False)
    d.ellipse([120, 128, 140, 148], fill=B); d.ellipse([123, 131, 137, 145], fill=N)   # l'horloge de la place
    d.line([(130, 138), (130, 132)], fill=V); d.line([(130, 138), (134, 138)], fill=V)
    return im


def lumen_nuit():
    """Lumen sous la Longue Nuit : les maisons noires, le Phare éteint, quelques réverbères qui tiennent."""
    im, d = toile()
    etoiles(d, n=24, graine=13, ymax=70)
    lune(d, 30, 20, 9)
    phare(d, 88, 40, allume=False)
    maisons(d, 128, allumees=False, graine=9)
    d.polygon([(0, 128), (176, 128), (176, 170), (0, 170)], fill=N)
    tramer(d, 0, 130, 175, 168, c=B, pas=4)
    reverbere(d, 40, 112, allume=False); reverbere(d, 136, 112, allume=True)
    return im


def lumen_rallumee():
    """Lumen rallumée : toutes les fenêtres brillent et le Phare balaie la cité."""
    im, d = toile()
    etoiles(d, n=8, graine=29, ymax=30)
    phare(d, 88, 40, allume=True)
    maisons(d, 128, allumees=True, graine=9)
    d.polygon([(0, 128), (176, 128), (176, 170), (0, 170)], fill=V)
    tramer(d, 2, 156, 173, 168, c=N, pas=3)
    for x in (20, 60, 116, 156):
        reverbere(d, x, 110, allume=True)
    return im


def coeur_lumen():
    """Le Cœur de Lumen : la machine lumen, une baie de serveurs sous une coupole, seize voyants de quartiers."""
    im, d = toile()
    salle(d, 22, 12, 154, 104)
    d.arc([40, 6, 136, 70], 180, 360, fill=B, width=3)
    d.rectangle([62, 22, 114, 140], fill=B); d.rectangle([66, 26, 110, 136], fill=N)
    for k in range(7):
        y = 32 + k * 14
        d.rectangle([70, y, 106, y + 9], fill=B)
        d.rectangle([73, y + 3, 76, y + 6], fill=V if k % 2 else N)
        d.rectangle([80, y + 3, 100, y + 5], fill=N)
    for i in range(16):                                                    # les seize quartiers
        x = 30 + (i % 4) * 7 if i < 8 else 126 + (i % 4) * 7
        y = 40 + (i // 4 % 2) * 7
        d.rectangle([x, y, x + 4, y + 4], fill=V if i % 3 else B)
    torche(d, 40, 70); torche(d, 136, 70)
    return im


# ------------------------------------------------------------------
# Les seize quartiers
# ------------------------------------------------------------------

def q_docks():
    """Les Docks : des entrepôts pleins à craquer, des caisses empilées jusqu'au plafond."""
    im, d = toile()
    salle(d, 20, 10, 156, 104)
    for c in range(5):
        for r in range(4 - (c % 2)):
            caisse(d, 28 + c * 25, 86 - r * 18, 22, 16, V if (c + r) % 3 == 0 else B)
    jauge(d, 40, 118, 136, 128, 0.97, V)
    texte(d, 70, 132, "97%", B)
    return im


def q_archives():
    """Les Archives : des tiroirs de fiches à perte de vue, tous pleins, et un balai."""
    im, d = toile()
    salle(d, 22, 12, 154, 104)
    for c in range(4):
        for r in range(5):
            x, y = 32 + c * 28, 22 + r * 16
            d.rectangle([x, y, x + 24, y + 13], fill=B); d.rectangle([x + 2, y + 2, x + 22, y + 11], fill=N)
            d.rectangle([x + 9, y + 6, x + 15, y + 8], fill=V)
    d.line([(140, 110), (126, 150)], fill=B, width=3)                    # le balai
    d.polygon([(120, 146), (134, 152), (130, 160), (116, 154)], fill=V)
    return im


def q_gazette():
    """La Gazette : une presse, et un rouleau de papier qui ne s'arrête plus de grossir."""
    im, d = toile()
    salle(d, 22, 12, 154, 104)
    d.rectangle([34, 50, 82, 104], fill=B); d.rectangle([38, 54, 78, 100], fill=N)
    engrenage(d, 58, 70, 10, V)
    d.ellipse([92, 54, 148, 110], fill=B); d.ellipse([96, 58, 144, 106], fill=N)
    for r in range(6, 24, 5):
        d.arc([120 - r, 82 - r, 120 + r, 82 + r], 0, 300, fill=V)
    d.line([(82, 80), (120, 82)], fill=B, width=2)
    return im


def q_forges():
    """Les Forges : un grand four, un tas de charbon presque vide, un soufflet."""
    im, d = toile()
    salle(d, 22, 12, 154, 104)
    briques(d, 52, 28, 124, 104, h=8, w=16)
    arche(d, 68, 56, 108, 104, fill=N)
    flamme(d, 80, 100, 18); flamme(d, 94, 100, 14)
    d.polygon([(28, 150), (50, 128), (60, 150)], fill=B)                  # le tas de charbon
    d.polygon([(130, 120), (152, 112), (152, 136)], fill=V)                # le soufflet
    d.rectangle([118, 122, 132, 126], fill=B)
    return im


def q_horloge():
    """La Tour de l'Horloge : un cadran, et un engrenage qui tourne à vide, emballé."""
    im, d = toile()
    salle(d, 22, 12, 154, 104)
    d.ellipse([56, 18, 120, 82], fill=B); d.ellipse([60, 22, 116, 78], fill=N)
    for k in range(12):
        a = k * math.pi / 6
        d.point((88 + 24 * math.cos(a), 50 + 24 * math.sin(a)), fill=V)
    d.line([(88, 50), (88, 30)], fill=V, width=2); d.line([(88, 50), (104, 50)], fill=B, width=2)
    engrenage(d, 44, 120, 12, V); engrenage(d, 70, 132, 8, B); engrenage(d, 130, 122, 14, B)
    for k in range(3):
        d.arc([110 - k * 4, 102 - k * 4, 150 + k * 4, 142 + k * 4], 200, 260, fill=V)
    return im


def q_citernes():
    """Les Citernes : trois cuves reliées à une réserve commune, l'une presque vide."""
    im, d = toile()
    salle(d, 20, 12, 156, 104)
    for i, (x, niv) in enumerate(((30, 0.8), (76, 0.15), (122, 0.6))):
        d.rectangle([x, 30, x + 26, 100], fill=B); d.rectangle([x + 3, 33, x + 23, 97], fill=N)
        d.rectangle([x + 3, 97 - int(64 * niv), x + 23, 97], fill=V)
        d.line([(x + 13, 100), (x + 13, 118)], fill=B, width=2)
    d.rectangle([28, 118, 150, 140], fill=B); d.rectangle([31, 121, 147, 137], fill=V)
    tramer(d, 32, 122, 146, 136, c=N, pas=4)
    return im


def q_porte():
    """La Porte du Matin : une grande porte que l'on n'ouvre qu'avec la bonne liste de clés."""
    im, d = toile()
    salle(d, 22, 12, 154, 104)
    arche(d, 54, 20, 122, 104, fill=B)
    d.rectangle([60, 40, 116, 104], fill=N)
    d.line([(88, 40), (88, 104)], fill=B, width=2)
    cadenas(d, 88, 72)
    d.rectangle([30, 110, 64, 150], fill=B); d.rectangle([33, 113, 61, 147], fill=N)   # la liste
    for y in range(118, 146, 6):
        d.line([(36, y), (58, y)], fill=V if y != 130 else B)
    d.line([(34, 128), (60, 134)], fill=V, width=2)
    return im


def q_ateliers():
    """Les Ateliers des automates : un établi, un automate démonté et sa feuille de route."""
    im, d = toile()
    salle(d, 22, 12, 154, 104)
    d.rectangle([30, 100, 146, 106], fill=B)
    d.rectangle([76, 46, 100, 72], fill=B); d.rectangle([80, 50, 96, 68], fill=N)       # l'automate
    d.rectangle([82, 54, 86, 58], fill=V); d.rectangle([90, 54, 94, 58], fill=V)
    d.rectangle([84, 72, 92, 96], fill=B)
    d.line([(76, 76), (60, 90)], fill=B, width=3); d.line([(100, 76), (116, 90)], fill=B, width=3)
    d.rectangle([118, 24, 146, 64], fill=B); d.rectangle([121, 27, 143, 61], fill=N)    # la feuille de route
    for y in range(31, 59, 5):
        d.line([(124, y), (140, y)], fill=V)
    engrenage(d, 44, 80, 8, V)
    return im


def q_memoires():
    """La Crypte des mémoires : des copies datées dans des niches, et un sablier qui sonne chaque nuit."""
    im, d = toile()
    salle(d, 22, 12, 154, 104)
    for c in range(4):
        for r in range(3):
            x, y = 32 + c * 24, 24 + r * 24
            arche(d, x, y, x + 18, y + 20, fill=N)
            d.rectangle([x + 4, y + 10, x + 14, y + 18], fill=V if (c + r) % 2 else B)
    sablier(d, 140, 120, h=30, w=18, plein=0.3)
    return im


def q_observatoire():
    """L'Observatoire : une coupole, une lunette, et un tableau de courbes."""
    im, d = toile()
    etoiles(d, n=14, graine=7, ymax=50)
    d.pieslice([30, 40, 146, 156], 180, 360, fill=B)
    d.pieslice([34, 44, 142, 152], 180, 360, fill=N)
    d.rectangle([84, 40, 92, 98], fill=N)
    d.line([(88, 98), (120, 50)], fill=V, width=5)
    d.rectangle([0, 98, 176, 170], fill=B); d.rectangle([20, 108, 156, 160], fill=N)
    pts = [(24 + k * 9, 150 - int(30 * abs(math.sin(k * 0.7)))) for k in range(15)]
    d.line(pts, fill=V, width=2)
    return im


def q_puits():
    """Le Puits aux deux sources : deux seaux, l'un brisé ; le miroir de l'eau."""
    im, d = toile()
    etoiles(d, n=8, graine=41, ymax=36)
    d.rectangle([40, 30, 44, 100], fill=B); d.rectangle([132, 30, 136, 100], fill=B)
    d.rectangle([36, 26, 140, 32], fill=B)
    d.line([(70, 32), (70, 70)], fill=B); d.line([(106, 32), (106, 70)], fill=B)
    d.polygon([(62, 70), (78, 70), (76, 84), (64, 84)], fill=V)
    d.polygon([(98, 70), (114, 70), (112, 84), (100, 84)], fill=B)
    d.line([(100, 72), (108, 82)], fill=N, width=2)                       # le seau brisé
    d.ellipse([30, 96, 146, 128], fill=B); d.ellipse([36, 100, 140, 124], fill=V)
    tramer(d, 40, 104, 136, 120, c=N, pas=4)
    briques(d, 30, 112, 146, 160, h=8, w=16)
    return im


def q_thermes():
    """Les Thermes : des bassins, dont l'un a gelé (lecture seule) ; une vapeur au-dessus des autres."""
    im, d = toile()
    salle(d, 20, 10, 156, 100)
    for i, x in enumerate((30, 104)):
        d.rectangle([x, 100, x + 44, 130], fill=B); d.rectangle([x + 3, 103, x + 41, 127], fill=V if i else N)
        if i:
            for k in range(3):
                d.arc([x + 6 + k * 12, 80, x + 16 + k * 12, 98], 90, 270, fill=B)
        else:
            for k in range(4):
                d.line([(x + 6 + k * 10, 106), (x + 12 + k * 10, 124)], fill=B)   # la glace fendue
    texte(d, 40, 140, "ro", V); texte(d, 116, 140, "rw", B)
    return im


def q_marche():
    """Le Grand Marché : des étals, des colis à moitié déballés, une charrette arrêtée."""
    im, d = toile()
    salle(d, 20, 10, 156, 100)
    for i, x in enumerate((28, 72, 116)):
        d.polygon([(x - 2, 40), (x + 34, 40), (x + 30, 50), (x + 2, 50)], fill=V if i % 2 else B)
        d.rectangle([x, 50, x + 2, 96], fill=B); d.rectangle([x + 30, 50, x + 32, 96], fill=B)
        d.rectangle([x, 80, x + 32, 84], fill=B)
        caisse(d, x + 6, 64, 18, 14, V if i == 1 else B)
    d.ellipse([40, 130, 60, 150], outline=B, width=3); d.ellipse([110, 130, 130, 150], outline=B, width=3)
    d.rectangle([36, 114, 136, 132], fill=B)
    return im


def q_labyrinthe():
    """Le Labyrinthe : des couloirs entrelacés, un fil qui s'arrête devant une porte fermée."""
    im, d = toile()
    d.rectangle([12, 12, 164, 158], fill=B)
    for x0, y0, x1, y1 in ((20, 20, 156, 26), (20, 20, 26, 150), (40, 40, 140, 46), (134, 40, 140, 140),
                           (40, 60, 46, 150), (60, 60, 120, 66), (60, 60, 66, 130), (80, 80, 120, 86),
                           (114, 80, 120, 150), (20, 144, 100, 150), (80, 100, 86, 130)):
        d.rectangle([x0, y0, x1, y1], fill=N)
    d.line([(23, 147), (23, 23), (153, 23)], fill=V, width=2)
    d.line([(137, 43), (137, 120)], fill=V, width=2)
    cadenas(d, 137, 132)
    return im


def q_limites():
    """La Bibliothèque des limites : des étagères pleines, un panneau « 1024 » sur la porte."""
    im, d = toile()
    salle(d, 22, 12, 154, 104)
    for y in (26, 48, 70, 92):
        d.line([(30, y), (110, y)], fill=B, width=2)
        for k in range(12):
            d.rectangle([32 + k * 6, y - 14, 36 + k * 6, y - 1], fill=V if (k + y) % 5 == 0 else B)
    d.rectangle([120, 30, 148, 100], fill=B); d.rectangle([123, 33, 145, 100], fill=N)
    d.rectangle([118, 40, 150, 52], fill=V)
    texte(d, 121, 41, "1024", N)
    return im


def q_guetteur():
    """Le Guetteur : un poste d'écoute, un cornet tendu vers une porte, et une console qui tient la nuit."""
    im, d = toile()
    salle(d, 22, 12, 154, 104)
    d.rectangle([30, 36, 72, 90], fill=B); d.rectangle([33, 39, 69, 87], fill=N)
    for y in range(44, 84, 7):
        d.line([(36, y), (36 + (y * 7) % 28, y)], fill=V)
    d.polygon([(96, 60), (132, 44), (132, 82)], fill=B)                    # le cornet
    d.polygon([(100, 60), (128, 49), (128, 77)], fill=N)
    d.line([(132, 62), (150, 62)], fill=V, width=2)
    for k in range(3):
        d.arc([140 + k * 4, 52 - k * 4, 156 + k * 4, 72 + k * 4], 300, 60, fill=V)
    d.rectangle([30, 100, 146, 106], fill=B)
    return im


# ------------------------------------------------------------------
# Les gardiens et les habitants, en pied
# ------------------------------------------------------------------

def seymour_dessin(r):
    # le docker : bonnet, gros bras, une caisse sur l'épaule
    r(36, 7, 51, 12, V); tete(r, 12, V, barbe=True)
    r(35, 33, 52, 54, B); r(38, 36, 49, 54, V)
    bras(r, True, True, 36)
    r(52, 18, 68, 32, B); r(54, 20, 66, 30, N); r(54, 20, 66, 30, N); r(59, 20, 61, 30, B)
    jambes(r); sol_tirets(r, 68)


def kathleen_dessin(r):
    # l'archiviste des fiches : chignon, lunettes, un tiroir de fiches dans les bras
    r(40, 4, 47, 10, B); tete(r, 12, B, lunettes=True)
    robe_mage(r, 33, 64, V, 35, 52)
    bras(r, True, True, 36)
    r(34, 44, 53, 52, B); r(36, 46, 51, 50, N); r(42, 47, 45, 49, V)
    pieds_robe(r); sol_tirets(r, 68)


def ida_dessin(r):
    # l'imprimeuse de la Gazette : visière, tablier taché, une feuille fraîche
    r(36, 9, 53, 12, V); tete(r, 12, V)
    r(35, 33, 52, 54, V); r(38, 35, 49, 56, B); r(41, 44, 43, 46, N); r(45, 50, 47, 52, N)
    bras(r, True, True, 36)
    r(56, 34, 68, 50, B); for_lignes(r, 58, 37, 66, 48)
    jambes(r); sol_tirets(r, 68)


def for_lignes(r, x0, y0, x1, y1, c=N):
    for y in range(y0, y1, 3):
        r(x0, y, x1, y, c)


def gordon_dessin(r):
    # le forgeron : barbe, tablier de cuir, un marteau et une pelle à charbon
    tete(r, 12, V, barbe=True)
    r(35, 33, 52, 54, B); r(37, 35, 50, 56, V)
    bras(r, True, True, 36)
    r(57, 26, 58, 48, B); r(53, 22, 62, 27, B)
    r(18, 40, 19, 58, B); r(14, 58, 23, 62, V)
    jambes(r, B); sol_tirets(r, 68)


def niklaus_dessin(r):
    # l'horloger de la Tour : loupe à l'œil, gilet, une montre à gousset
    tete(r, 12, B, lunettes=True); r(45, 14, 51, 20, V)
    r(35, 33, 52, 54, B); r(38, 33, 49, 54, N); r(39, 36, 48, 52, V)
    bras(r, True, True, 36)
    r(56, 44, 66, 54, B); r(58, 46, 64, 52, N); r(61, 47, 61, 50, V); r(61, 50, 63, 50, V)
    jambes(r); sol_tirets(r, 68)


def sophie_dessin(r):
    # la fontainière : foulard, une grande clé de vanne, un seau
    r(35, 9, 52, 13, V); tete(r, 12, V)
    robe_mage(r, 33, 64, B, 35, 52)
    bras(r, True, True, 36)
    r(57, 30, 59, 52, B); r(53, 28, 63, 31, B)
    r(16, 46, 30, 58, V); r(18, 48, 28, 56, N); r(17, 42, 29, 43, B)
    pieds_robe(r); sol_tirets(r, 68)


def lynn_dessin(r):
    # la portière : cape, un trousseau de clés et la liste des montages
    r(33, 11, 54, 33, V); tete(r, 12, V)
    robe_mage(r, 33, 64, V, 34, 53)
    bras(r, True, True, 36)
    for k, x in enumerate((56, 60, 64)): cle(r, x, 46 + (k % 2) * 3, B)
    r(18, 38, 30, 58, B); r(19, 39, 29, 57, N); for_lignes(r, 21, 42, 27, 56, B)
    pieds_robe(r); sol_tirets(r, 68)


def mary_dessin(r):
    # la mécanicienne des automates : salopette, une clé et un petit automate
    r(36, 10, 51, 12, V); tete(r, 12, B)
    r(35, 33, 52, 54, V); r(38, 40, 49, 54, B); r(38, 33, 39, 40, B); r(48, 33, 49, 40, B)
    bras(r, True, True, 36)
    r(57, 30, 58, 46, B); r(54, 26, 61, 30, B)
    r(16, 42, 28, 54, B); r(18, 44, 26, 52, N); r(19, 46, 20, 47, V); r(24, 46, 25, 47, V)
    jambes(r); sol_tirets(r, 68)


def betty_dessin(r):
    # la gardienne des mémoires : longue robe, un sablier et un registre daté
    r(36, 9, 51, 12, B); r(35, 12, 36, 28, B); r(51, 12, 52, 28, B)
    tete(r, 12, B)
    robe_mage(r, 33, 64, V, 35, 52)
    bras(r, True, True, 36)
    r(56, 38, 64, 39, B); r(57, 40, 63, 44, V); r(59, 45, 61, 46, B); r(57, 47, 63, 51, B); r(56, 52, 64, 53, B)
    r(18, 40, 30, 56, B); r(20, 42, 28, 54, N); for_lignes(r, 21, 44, 27, 53, V)
    pieds_robe(r); sol_tirets(r, 68)


def donald_dessin(r):
    # l'astronome des mesures : chapeau pointu étoilé, une lunette et un carnet de courbes
    for k in range(8): r(43 - k // 2, 2 + k, 44 + k // 2, 2 + k, V)
    tete(r, 12, B, barbe=True)
    robe_mage(r, 33, 64, B, 35, 52)
    bras(r, True, True, 36)
    r(54, 30, 70, 33, B); r(70, 29, 73, 34, V)
    r(16, 42, 30, 56, B); r(18, 44, 28, 54, N); r(19, 50, 21, 52, V); r(22, 47, 24, 50, V); r(25, 45, 27, 47, V)
    pieds_robe(r); sol_tirets(r, 68)


def dorothy_dessin(r):
    # la gardienne du Puits : tresses, deux seaux, un dans chaque main
    r(36, 9, 51, 12, V); r(33, 14, 35, 30, V); r(52, 14, 54, 30, V)
    tete(r, 12, V)
    robe_mage(r, 33, 64, B, 35, 52)
    bras(r, True, True, 36)
    r(14, 48, 26, 58, V); r(16, 50, 24, 56, N)
    r(60, 48, 72, 58, B); r(62, 50, 70, 56, N); r(64, 51, 67, 55, B)
    pieds_robe(r); sol_tirets(r, 68)


def ruth_dessin(r):
    # la gardienne des Thermes : serviette sur l'épaule, un pic à glace, une lanterne chaude
    tete(r, 12, V)
    r(35, 33, 52, 54, B); r(36, 31, 44, 40, V)
    bras(r, True, True, 36)
    r(57, 28, 58, 48, B); r(55, 26, 60, 28, V)
    r(16, 42, 28, 54, B); r(18, 44, 26, 52, V)
    jambes(r); sol_tirets(r, 68)


def charles_dessin(r):
    # le marchand : chapeau rond, un colis ficelé, une balance
    r(35, 6, 52, 11, B); r(33, 11, 54, 12, B)
    tete(r, 12, B)
    r(35, 33, 52, 54, V); r(42, 33, 45, 54, B)
    bras(r, True, True, 36)
    r(54, 40, 68, 52, B); r(56, 42, 66, 50, N); r(60, 40, 61, 52, V)
    r(22, 30, 23, 50, B); r(14, 36, 31, 37, B); r(14, 38, 18, 42, V); r(27, 38, 31, 42, V)
    jambes(r); sol_tirets(r, 68)


def john_dessin(r):
    # le guide du Labyrinthe : capuche, une pelote de fil, une craie
    for k in range(5): r(40 - k - 2, 6 + k, 47 + k + 2, 6 + k, B)
    r(33, 11, 54, 33, B); tete(r, 14, B)
    robe_mage(r, 33, 64, B, 34, 53)
    bras(r, True, True, 36)
    r(56, 42, 66, 52, V); r(58, 44, 64, 50, N); r(60, 46, 62, 48, V)
    for k in range(8): r(60 + k, 52 + k, 61 + k, 53 + k, V)
    pieds_robe(r); sol_tirets(r, 68)


def kay_dessin(r):
    # la bibliothécaire des limites : lunettes, une pile de livres, une règle
    r(36, 9, 51, 12, V); tete(r, 12, V, lunettes=True)
    robe_mage(r, 33, 64, V, 35, 52)
    bras(r, True, True, 36)
    for k in range(4): r(54, 52 - k * 4, 66 - (k % 2) * 2, 55 - k * 4, B if k % 2 else V)
    r(18, 30, 20, 58, B)
    for y in range(32, 58, 4): r(20, y, 22, y, N)
    pieds_robe(r); sol_tirets(r, 68)


def klara_dessin(r):
    # la guetteuse : casque d'écoute, une console pliante qui tient la nuit
    tete(r, 12, B)
    r(35, 12, 36, 22, V); r(51, 12, 52, 22, V); r(36, 10, 51, 11, V)
    r(35, 33, 52, 54, B); r(38, 36, 49, 54, N); r(40, 38, 47, 52, V)
    bras(r, True, True, 36)
    r(54, 40, 70, 52, B); r(56, 42, 68, 50, N); r(57, 44, 60, 44, V); r(57, 47, 64, 47, V)
    jambes(r); sol_tirets(r, 68)


def logeuse_dessin(r):
    # la logeuse : un trousseau de clés des chambres, un registre des pensionnaires
    r(40, 4, 47, 10, V); tete(r, 12, V)
    robe_mage(r, 33, 64, B, 35, 52); r(37, 42, 50, 43, V)
    bras(r, True, True, 36)
    for k, x in enumerate((56, 60)): cle(r, x, 46 + k * 3, V)
    r(18, 40, 30, 56, B); r(20, 42, 28, 54, N); for_lignes(r, 21, 44, 27, 53, B)
    pieds_robe(r); sol_tirets(r, 68)


def allumeur_dessin(r):
    # l'allumeur de réverbères : haut chapeau, une longue perche à flamme
    r(39, 0, 48, 11, B); r(36, 10, 51, 12, B)
    tete(r, 12, B)
    r(35, 33, 52, 54, V); r(42, 33, 45, 54, B)
    bras(r, True, True, 36)
    r(60, 4, 61, 66, B); r(58, 0, 63, 4, V); r(59, 1, 62, 3, B)
    jambes(r); sol_tirets(r, 68)


def veilleuse_dessin(r):
    # la veilleuse : un châle, une bougie, un vieux cahier de chants
    r(33, 11, 54, 34, V); tete(r, 12, V)
    robe_mage(r, 33, 64, V, 34, 53)
    bras(r, True, True, 36)
    r(59, 36, 61, 48, B); r(59, 32, 61, 35, V); r(56, 48, 64, 50, B)
    r(18, 42, 30, 56, B); r(20, 44, 28, 54, N); for_lignes(r, 21, 46, 27, 53, V)
    pieds_robe(r); sol_tirets(r, 68)


def horloger_dessin(r):
    # l'horloger de la cité : tablier, un grand réveil sous le bras
    tete(r, 12, B, barbe=True, lunettes=True)
    r(35, 33, 52, 54, B); r(38, 35, 49, 56, V)
    bras(r, True, True, 36)
    r(14, 40, 30, 56, B); r(16, 42, 28, 54, N); r(22, 44, 22, 48, V); r(22, 48, 26, 48, V)
    r(14, 37, 17, 40, B); r(27, 37, 30, 40, B)
    jambes(r); sol_tirets(r, 68)


def imprimeur_dessin(r):
    # l'imprimeur : un rouleau de papier compressé, une manivelle
    r(36, 9, 53, 12, B); tete(r, 12, B)
    r(35, 33, 52, 54, V); r(38, 35, 49, 56, B)
    bras(r, True, True, 36)
    r(54, 42, 70, 52, B); r(56, 44, 68, 50, V); r(58, 46, 66, 48, N)
    r(18, 38, 19, 54, B); r(14, 36, 23, 38, B)
    jambes(r); sol_tirets(r, 68)


def postiere_dessin(r):
    # la postière : casquette, une sacoche de lettres datées
    r(36, 9, 51, 12, V); r(48, 11, 54, 12, V)
    tete(r, 12, V)
    robe_mage(r, 33, 64, B, 35, 52)
    for k in range(6): r(37 + k * 2, 34 + k * 3, 39 + k * 2, 36 + k * 3, V)
    bras(r, True, True, 36)
    r(52, 48, 66, 60, V); r(54, 50, 64, 58, N); r(55, 51, 63, 51, B)
    r(18, 44, 30, 52, B); r(19, 45, 29, 46, N)
    pieds_robe(r); sol_tirets(r, 68)


PORTRAITS = {
    "item_seymour.gif": seymour_dessin, "item_kathleen.gif": kathleen_dessin, "item_ida.gif": ida_dessin,
    "item_gordon.gif": gordon_dessin, "item_niklaus.gif": niklaus_dessin, "item_sophie.gif": sophie_dessin,
    "item_lynn.gif": lynn_dessin, "item_mary.gif": mary_dessin, "item_betty.gif": betty_dessin,
    "item_donald.gif": donald_dessin, "item_dorothy.gif": dorothy_dessin, "item_ruth.gif": ruth_dessin,
    "item_charles.gif": charles_dessin, "item_john.gif": john_dessin, "item_kay.gif": kay_dessin,
    "item_klara.gif": klara_dessin,
    "item_logeuse.gif": logeuse_dessin, "item_allumeur.gif": allumeur_dessin, "item_veilleuse.gif": veilleuse_dessin,
    "item_horloger.gif": horloger_dessin, "item_imprimeur.gif": imprimeur_dessin, "item_postiere.gif": postiere_dessin,
}


def lanterne_lumen(nom="item_lanterne_lumen.gif"):
    """La sixième enveloppe : un pli marqué d'une lanterne allumée, liseré de fenêtres."""
    from PIL import Image, ImageDraw
    from dessiner_lieux import PAL, OUT
    w, h = 60, 42
    im = Image.new('P', (w, h), N); im.putpalette(PAL); d = ImageDraw.Draw(im)
    d.rectangle([2, 6, 57, 39], fill=B)
    d.line([(2, 6), (29, 25), (57, 6)], fill=N, width=2)
    d.line([(2, 39), (22, 22)], fill=N); d.line([(57, 39), (37, 22)], fill=N)
    for x in range(4, 56, 6): d.rectangle([x, 36, x + 2, 38], fill=V)          # des fenêtres allumées
    d.polygon([(25, 15), (34, 15), (32, 12), (27, 12)], fill=N)                # la lanterne
    d.rectangle([25, 16, 34, 28], fill=N); d.rectangle([27, 18, 32, 26], fill=V)
    d.rectangle([24, 29, 35, 31], fill=N)
    im.resize((w * 2, h * 2), Image.NEAREST).save(OUT + nom)


LIEUX = {
    "loc_lumen.gif": lumen, "loc_lumen_nuit.gif": lumen_nuit, "loc_lumen_rallumee.gif": lumen_rallumee,
    "loc_coeur_lumen.gif": coeur_lumen,
    "loc_q_docks.gif": q_docks, "loc_q_archives.gif": q_archives, "loc_q_gazette.gif": q_gazette,
    "loc_q_forges.gif": q_forges, "loc_q_horloge.gif": q_horloge, "loc_q_citernes.gif": q_citernes,
    "loc_q_porte.gif": q_porte, "loc_q_ateliers.gif": q_ateliers, "loc_q_memoires.gif": q_memoires,
    "loc_q_observatoire.gif": q_observatoire, "loc_q_puits.gif": q_puits, "loc_q_thermes.gif": q_thermes,
    "loc_q_marche.gif": q_marche, "loc_q_labyrinthe.gif": q_labyrinthe, "loc_q_limites.gif": q_limites,
    "loc_q_guetteur.gif": q_guetteur,
}

if __name__ == "__main__":
    noms = sys.argv[1:] or list(LIEUX) + list(PORTRAITS) + ["item_lanterne_lumen.gif"]
    n = 0
    for nom in noms:
        if nom in LIEUX:
            finir(nom, LIEUX[nom]()); n += 1
        elif nom in PORTRAITS:
            perso(nom, PORTRAITS[nom]); n += 1
        elif nom == "item_lanterne_lumen.gif":
            lanterne_lumen(nom); n += 1
    print(n, "dessins")
