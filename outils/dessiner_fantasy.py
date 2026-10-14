"""Redessine les lieux des chapitres 2 et 3 dans le style du chapitre 1 : pixel art 1 bit épais (noir, vert, blanc),
de grands aplats, des sols verts en perspective, et un décor de royaume (tours, donjon, volière, oracle...).

Même cadre et même taille que les images d'origine (dessiner_lieux.finir). Usage : python3 outils/dessiner_fantasy.py [nom...]
"""
import os, sys, random, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from dessiner_lieux import toile, finir, N, V, B, W, H, texte_centre  # noqa: E402
from PIL import ImageDraw  # noqa: E402


# ------------------------------------------------------------------
# Les briques du décor
# ------------------------------------------------------------------

def piece(d, x0, y0, x1, y1, sol=V, mur_fond=N):
    """Une pièce en perspective, comme l'atelier du chapitre 1 : le mur du fond, le sol vert, les arêtes."""
    d.polygon([(x0, y1), (x1, y1), (W, H), (0, H)], fill=sol)
    d.rectangle([x0, y0, x1, y1], fill=mur_fond)
    for a, b in [((0, 0), (x0, y0)), ((W - 1, 0), (x1, y0)), ((0, H - 1), (x0, y1)), ((W - 1, H - 1), (x1, y1))]:
        d.line([a, b], fill=B, width=2)
    d.rectangle([x0, y0, x1, y1], outline=B, width=2)


def tramer(d, x0, y0, x1, y1, c=B, pas=2, decale=0):
    for y in range(y0, y1 + 1):
        for x in range(x0 + ((y + decale) % pas), x1 + 1, pas):
            d.point((x, y), fill=c)


def briques(d, x0, y0, x1, y1, h=6, w=14, fond=B, joint=N):
    d.rectangle([x0, y0, x1, y1], fill=fond)
    for r, y in enumerate(range(y0, y1, h)):
        d.line([(x0, y), (x1, y)], fill=joint)
        for x in range(x0 + (w // 2 if r % 2 else 0), x1, w):
            d.line([(x, y), (x, min(y + h, y1))], fill=joint)
    d.rectangle([x0, y0, x1, y1], outline=joint)


def creneaux(d, x0, x1, y, h=8, w=10, c=B):
    for x in range(x0, x1, w * 2):
        d.rectangle([x, y - h, min(x + w - 1, x1), y], fill=c)


def arche(d, x0, y0, x1, y1, fill=N, outline=B, ep=2):
    r = (x1 - x0) // 2
    d.rectangle([x0, y0 + r, x1, y1], fill=outline)
    d.ellipse([x0, y0, x1, y0 + 2 * r], fill=outline)
    d.rectangle([x0 + ep, y0 + r, x1 - ep, y1], fill=fill)
    d.ellipse([x0 + ep, y0 + ep, x1 - ep, y0 + 2 * r - ep], fill=fill)


def colline(d, points, c=V, bord=B):
    d.polygon(points + [(W, H), (0, H)], fill=c)
    d.line(points, fill=bord, width=2)


def herbe(d, y, graine=1, c=V, n=26):
    rnd = random.Random(graine)
    for _ in range(n):
        x = rnd.randint(2, W - 4)
        yy = y + rnd.randint(-3, 6)
        h = rnd.randint(3, 7)
        d.line([(x, yy), (x - 1, yy - h)], fill=c)
        d.line([(x + 2, yy), (x + 3, yy - h + 2)], fill=c)


def etoiles(d, n=18, graine=3, ymax=60):
    rnd = random.Random(graine)
    for _ in range(n):
        x, y = rnd.randint(4, W - 4), rnd.randint(4, ymax)
        d.point((x, y), fill=B)
        if rnd.random() < 0.25:
            d.point((x + 1, y), fill=B); d.point((x - 1, y), fill=B); d.point((x, y + 1), fill=B); d.point((x, y - 1), fill=B)


def lune(d, x, y, r=8):
    d.ellipse([x - r, y - r, x + r, y + r], fill=B)
    d.ellipse([x - r + 5, y - r - 2, x + r + 5, y + r - 2], fill=N)


def flamme(d, x, y, h=12):
    d.polygon([(x, y - h), (x + 5, y - h // 3), (x + 4, y), (x - 4, y), (x - 5, y - h // 3)], fill=V)
    d.polygon([(x, y - h // 2), (x + 2, y - 2), (x - 2, y - 2)], fill=B)


def torche(d, x, y):
    d.polygon([(x - 3, y), (x + 3, y), (x + 1, y + 14), (x - 1, y + 14)], fill=B)
    d.rectangle([x - 4, y - 2, x + 4, y], fill=B)
    flamme(d, x, y - 3, 13)


def ecran_crt(d, x, y, w, h, lignes=(), couleur=V):
    """Un gros moniteur cathodique plein, comme ceux du chapitre 1."""
    d.polygon([(x + w, y + 3), (x + w + 7, y + 7), (x + w + 7, y + h + 3), (x + w, y + h)], fill=B)
    d.rectangle([x, y, x + w, y + h], fill=B)
    d.rectangle([x + 5, y + 5, x + w - 5, y + h - 7], fill=N)
    for k, t in enumerate(lignes):
        d.text((x + 8, y + 7 + k * 11), t, fill=couleur if k % 2 == 0 else B)
    d.rectangle([x + w // 2 - 6, y + h + 1, x + w // 2 + 6, y + h + 5], fill=B)
    d.rectangle([x + w // 2 - 14, y + h + 6, x + w // 2 + 14, y + h + 8], fill=B)


def comptoir(d, x0, y0, x1, y1):
    d.rectangle([x0, y0, x1, y0 + 5], fill=B)
    d.rectangle([x0 + 3, y0 + 6, x1 - 3, y1], fill=B)
    for x in range(x0 + 14, x1 - 6, 16):
        d.line([(x, y0 + 9), (x, y1 - 3)], fill=N)


def livres(d, x0, y0, x1, y1, graine=5, vert=0.25):
    rnd = random.Random(graine)
    x = x0
    while x < x1 - 3:
        lw = rnd.randint(3, 6)
        hh = rnd.randint((y1 - y0) // 2, y1 - y0)
        c = V if rnd.random() < vert else B
        d.rectangle([x, y1 - hh, min(x + lw - 1, x1), y1], fill=c)
        x += lw + 1


def etagere(d, x0, y0, x1, y1, rangs=4, graine=7):
    d.rectangle([x0, y0, x1, y1], fill=B)
    d.rectangle([x0 + 3, y0 + 3, x1 - 3, y1 - 3], fill=N)
    hr = (y1 - y0 - 6) // rangs
    for k in range(rangs):
        yb = y0 + 3 + (k + 1) * hr
        livres(d, x0 + 5, yb - hr + 4, x1 - 5, yb - 1, graine + k)
        d.rectangle([x0 + 3, yb, x1 - 3, yb + 1], fill=B)


def nuage_ondes(d, x, y, n=3, c=B):
    for k in range(n):
        r = 8 + k * 7
        d.arc([x - r, y - r, x + r, y + r], 220, 320, fill=c, width=2)


# ------------------------------------------------------------------
# Chapitre 2 : la panne (le royaume du réseau)
# ------------------------------------------------------------------

def batimentb(ok=False):
    im, d = toile()
    piece(d, 34, 22, 142, 112)
    # la grande armoire réseau, au fond
    d.rectangle([92, 30, 134, 112], fill=B)
    d.rectangle([96, 34, 130, 108], fill=N)
    for r in range(7):
        y = 38 + r * 10
        d.rectangle([99, y, 127, y + 6], fill=B)
        for k in range(5):
            d.rectangle([102 + k * 5, y + 2, 103 + k * 5, y + 4], fill=V if ok or (r + k) % 4 == 0 else N)
    # les câbles qui pendent
    for k, x in enumerate([104, 114, 124]):
        d.arc([x - 9, 100, x + 9, 124], 0, 180, fill=V if k == 1 else B, width=2)
    # le comptoir de l'accueil, et le poste dessus
    comptoir(d, 10, 118, 84, 160)
    ecran_crt(d, 22, 80, 40, 30, ("$_",))
    d.rectangle([40, 30, 84, 42], fill=B)
    d.text((44, 31), "BAT. B", fill=N)
    return im


def posteb():
    im, d = toile()
    piece(d, 30, 16, 146, 96)
    ecran_crt(d, 36, 22, 100, 70, ("$ ip link", "eth0: DOWN", "$ date", "1 janv. 2001"))
    # l'étiquette jaunie sous l'écran
    d.rectangle([108, 82, 128, 87], fill=V)
    # le bureau et le clavier
    d.polygon([(10, 118), (166, 118), (176, 132), (0, 132)], fill=B)
    d.polygon([(40, 122), (124, 122), (130, 128), (34, 128)], fill=N)
    for x in range(40, 124, 6):
        d.line([(x, 124), (x + 2, 124)], fill=B); d.line([(x + 2, 126), (x + 4, 126)], fill=B)
    d.line([(150, 96), (160, 118)], fill=V, width=3)
    return im


def routeur():
    """La Tour du Carrefour : une tour de pierre au croisement des routes, ses fanions verts au vent."""
    im, d = toile()
    etoiles(d, 14, 4, 50)
    colline(d, [(0, 120), (60, 112), (120, 114), (176, 108)])
    # les deux routes qui se croisent au pied de la tour
    d.polygon([(80, 116), (96, 116), (150, 170), (118, 170)], fill=B)
    d.polygon([(80, 116), (96, 116), (58, 170), (26, 170)], fill=B)
    d.polygon([(0, 136), (176, 132), (176, 142), (0, 148)], fill=B)
    tramer(d, 0, 137, 175, 146, N, 3)
    # la tour
    briques(d, 64, 40, 112, 118)
    creneaux(d, 60, 116, 40, 8, 8)
    d.rectangle([60, 36, 116, 40], fill=B)
    arche(d, 80, 92, 96, 118, N, N)
    for y in (56, 74):
        d.rectangle([84, y, 92, y + 10], fill=N)
    # le fanion et les messagers (deux lignes qui partent)
    d.line([(88, 24), (88, 36)], fill=B, width=2)
    d.polygon([(89, 24), (104, 28), (89, 32)], fill=V)
    for k, (x, y) in enumerate([(30, 70), (146, 64), (150, 92)]):
        d.ellipse([x - 3, y - 3, x + 3, y + 3], fill=V if k % 2 == 0 else B)
    d.line([(36, 72), (62, 80)], fill=V); d.line([(140, 66), (114, 74)], fill=B); d.line([(146, 92), (114, 96)], fill=V)
    return im


def intranet():
    """La Bibliothèque : des rayonnages, et au centre un lutrin avec le grand livre de l'intranet."""
    im, d = toile()
    piece(d, 28, 14, 148, 104)
    etagere(d, 32, 18, 74, 104, 4, 11)
    etagere(d, 102, 18, 144, 104, 4, 21)
    # le lutrin et son livre ouvert
    d.polygon([(76, 122), (100, 122), (94, 160), (82, 160)], fill=B)
    d.polygon([(60, 104), (88, 112), (116, 104), (116, 122), (88, 128), (60, 122)], fill=B)
    d.line([(88, 112), (88, 128)], fill=N)
    for k in range(4):
        d.line([(64, 110 + k * 3), (84, 115 + k * 3)], fill=N)
        d.line([(92, 115 + k * 3), (112, 110 + k * 3)], fill=N)
    flamme(d, 70, 98, 8); flamme(d, 106, 98, 8)
    return im


def etc_():
    """Le dossier de configuration : une salle d'archives, des casiers de parchemins roulés."""
    im, d = toile()
    piece(d, 24, 14, 152, 106)
    for c in range(4):
        for r in range(3):
            x, y = 30 + c * 31, 20 + r * 28
            d.rectangle([x, y, x + 26, y + 24], fill=B)
            d.rectangle([x + 3, y + 3, x + 23, y + 21], fill=N)
            for k in range(3):
                d.ellipse([x + 5 + k * 6, y + 10, x + 10 + k * 6, y + 15], fill=V if (c + r + k) % 5 == 0 else B)
    d.polygon([(60, 130), (120, 130), (128, 140), (52, 140)], fill=B)
    d.line([(70, 134), (110, 134)], fill=N)
    return im


def journaux():
    """Les journaux : des registres ouverts, empilés, et une plume dans l'encrier."""
    im, d = toile()
    piece(d, 30, 18, 146, 100)
    for k in range(4):
        y = 58 - k * 10
        d.rectangle([44 + k * 3, y + 40, 132 - k * 3, y + 48], fill=B if k % 2 == 0 else V)
        d.line([(48 + k * 3, y + 44), (128 - k * 3, y + 44)], fill=N)
    # le registre ouvert dessus
    d.polygon([(40, 66), (88, 74), (136, 66), (136, 90), (88, 98), (40, 90)], fill=B)
    d.line([(88, 74), (88, 98)], fill=N, width=2)
    for k in range(5):
        d.line([(46, 72 + k * 4), (82, 78 + k * 4)], fill=N)
        d.line([(94, 78 + k * 4), (130, 72 + k * 4)], fill=N if k != 2 else V)
    # l'encrier et la plume
    d.ellipse([140, 120, 156, 136], fill=B); d.rectangle([144, 114, 152, 122], fill=B)
    d.polygon([(148, 116), (170, 70), (164, 74), (146, 112)], fill=V)
    return im


def tmp_():
    """Le dossier temporaire : un grenier où tout le monde dépose ses caisses."""
    im, d = toile()
    d.polygon([(0, 60), (88, 8), (176, 60)], outline=B)
    d.line([(0, 60), (88, 8)], fill=B, width=2); d.line([(88, 8), (176, 60)], fill=B, width=2)
    for x in range(20, 160, 22):
        y = 60 - int(abs(88 - x) * 52 / 88)
        d.line([(x, max(y, 10)), (x, 60)], fill=B)
    d.rectangle([0, 112, W, H], fill=V)
    for x, y, w, h in [(14, 82, 40, 34), (46, 96, 30, 20), (98, 76, 50, 40), (120, 56, 30, 22), (60, 114, 34, 24)]:
        d.rectangle([x, y, x + w, y + h], fill=B)
        d.rectangle([x + 2, y + 2, x + w - 2, y + h - 2], outline=N)
        d.line([(x, y), (x + w, y + h)], fill=N); d.line([(x + w, y), (x, y + h)], fill=N)
    d.ellipse([84, 30, 92, 38], fill=V)
    return im


def annexe():
    """L'Annexe : la cafétéria, ses tables hautes, la machine à café, et le grand écran noir."""
    im, d = toile()
    piece(d, 22, 16, 154, 98)
    # le grand écran éteint au mur
    d.rectangle([40, 24, 116, 70], fill=B)
    d.rectangle([44, 28, 112, 66], fill=N)
    d.line([(48, 32), (60, 32)], fill=B)
    # la machine à café
    d.rectangle([124, 44, 148, 98], fill=B)
    d.rectangle([128, 50, 144, 62], fill=N)
    d.rectangle([132, 74, 140, 80], fill=N)
    d.arc([128, 34, 136, 46], 180, 360, fill=V); d.arc([134, 30, 142, 44], 180, 360, fill=V)
    # le comptoir avec le portable
    comptoir(d, 8, 120, 90, 160)
    d.polygon([(30, 118), (64, 118), (68, 120), (26, 120)], fill=N)
    d.rectangle([34, 98, 60, 117], fill=B); d.rectangle([37, 101, 57, 114], fill=N)
    d.polygon([(46, 104), (50, 107), (46, 110), (47, 107)], fill=V)
    # deux tables hautes
    for x in (110, 146):
        d.ellipse([x - 16, 112, x + 16, 120], fill=B)
        d.rectangle([x - 2, 120, x + 2, 154], fill=B)
        d.rectangle([x - 10, 154, x + 10, 158], fill=B)
    return im


def portable():
    """Le portable de la cafétéria : son écran ne montre qu'un petit avion."""
    im, d = toile()
    piece(d, 30, 18, 146, 92)
    # l'écran
    d.polygon([(40, 26), (136, 26), (136, 104), (40, 104)], fill=B)
    d.rectangle([46, 32, 130, 98], fill=N)
    # l'avion (le mode avion)
    d.polygon([(88, 44), (92, 44), (92, 62), (114, 72), (114, 78), (92, 72), (92, 86), (100, 92), (100, 94), (80, 94), (80, 92), (88, 86), (88, 72), (66, 78), (66, 72), (88, 62)], fill=V)
    # le clavier
    d.polygon([(40, 104), (136, 104), (160, 136), (16, 136)], fill=B)
    for r in range(4):
        y = 110 + r * 6
        for x in range(28 + r * 2, 148 - r * 2, 8):
            d.rectangle([x, y, x + 4, y + 3], fill=N)
    d.rectangle([70, 140, 106, 146], fill=B)
    return im


def borne():
    """La Tour des Ondes : une tour fine sur une colline, son antenne lance des ondes vertes."""
    im, d = toile()
    etoiles(d, 16, 9, 70)
    colline(d, [(0, 132), (40, 118), (88, 112), (136, 118), (176, 128)])
    herbe(d, 130, 4)
    # la tour, effilée
    d.polygon([(76, 116), (100, 116), (94, 56), (82, 56)], fill=B)
    for y in range(64, 114, 10):
        d.line([(80, y), (96, y)], fill=N)
    d.rectangle([84, 98, 92, 116], fill=N)
    d.rectangle([78, 50, 98, 56], fill=B)
    d.line([(88, 50), (88, 26)], fill=B, width=2)
    d.ellipse([84, 20, 92, 28], fill=V)
    for k in range(3):
        r = 14 + k * 10
        d.arc([88 - r, 24 - r, 88 + r, 24 + r], 200, 340, fill=V if k != 1 else B, width=2)
        d.arc([88 - r, 24 - r, 88 + r, 24 + r], 20, 160, fill=V if k != 1 else B, width=2)
    return im


def switch():
    """Le Carrefour des Prises : un panneau à huit prises sur le mur, des câbles qui retombent, deux voyants éteints."""
    im, d = toile()
    piece(d, 18, 22, 158, 112)
    d.rectangle([24, 44, 152, 80], fill=B)
    d.rectangle([28, 48, 148, 76], fill=N)
    for k in range(8):
        x = 34 + k * 14
        d.rectangle([x, 56, x + 10, 68], fill=B)
        d.rectangle([x + 2, 60, x + 8, 66], fill=N)
        d.rectangle([x + 3, 51, x + 7, 53], fill=N if k in (1, 6, 7) else V)
        if k not in (1, 7):
            d.line([(x + 5, 68), (x + 5 + (k - 3) * 3, 120 + (k % 3) * 8)], fill=V if k == 6 else B, width=2)
    d.text((60, 30), "8 PORTS", fill=B)
    return im


def affichage():
    """Le Grand Tableau : l'écran de la cafétéria, encadré comme un tableau, qui joue une vidéo."""
    im, d = toile()
    piece(d, 14, 14, 162, 112)
    d.rectangle([24, 22, 152, 100], fill=B)
    d.rectangle([30, 28, 146, 94], fill=N)
    d.rectangle([34, 32, 142, 90], fill=V)
    d.polygon([(76, 44), (76, 78), (104, 61)], fill=B)
    tramer(d, 34, 82, 142, 90, N, 2)
    d.rectangle([84, 100, 92, 112], fill=B)
    return im


# ------------------------------------------------------------------
# Chapitre 3 : la Crypte (le donjon) et les machines corrompues
# ------------------------------------------------------------------

def crypte():
    """L'entrée du donjon : un escalier de pierre qui plonge sous une voûte, entre deux torches."""
    im, d = toile()
    briques(d, 0, 0, W - 1, 120, 8, 18)
    arche(d, 40, 14, 136, 140, N)
    # les marches qui descendent dans le noir
    for k in range(7):
        y = 140 - k * 9
        w = 44 - k * 5
        d.rectangle([88 - w, y - 4, 88 + w, y], fill=B)
    d.rectangle([0, 140, W, H], fill=V)
    tramer(d, 0, 152, W - 1, H - 1, N, 3)
    torche(d, 26, 56); torche(d, 150, 56)
    return im


def binaires():
    """La salle des grimoires : des programmes rangés comme des livres, un seul fendu et luisant."""
    im, d = toile()
    piece(d, 18, 12, 158, 110)
    for r in range(3):
        y = 24 + r * 30
        d.rectangle([24, y + 22, 152, y + 25], fill=B)
        for k in range(8):
            x = 30 + k * 15
            corrompu = (r == 1 and k == 3)
            d.rectangle([x, y, x + 10, y + 22], fill=V if corrompu else B)
            d.line([(x + 2, y + 4), (x + 8, y + 4)], fill=N)
            if corrompu:
                d.line([(x + 2, y + 8), (x + 6, y + 13), (x + 3, y + 18)], fill=N, width=2)
    # la liste des empreintes clouée au mur
    d.rectangle([66, 118, 110, 150], fill=B)
    for k in range(4):
        d.line([(70, 124 + k * 6), (104 - (k * 7) % 12, 124 + k * 6)], fill=N)
    return im


def caveau():
    """Le Caveau : une voûte de pierre, six niches scellées, et un pan de mur qui n'est pas comme les autres."""
    im, d = toile()
    briques(d, 0, 0, W - 1, 130, 7, 16)
    d.arc([-30, -60, W + 30, 70], 0, 180, fill=N, width=10)
    for k in range(6):
        x = 8 + k * 28
        arche(d, x, 54, x + 22, 108, N)
        d.line([(x + 4, 74), (x + 18, 104)], fill=B); d.line([(x + 18, 74), (x + 4, 104)], fill=B)
    d.rectangle([0, 130, W, H], fill=V)
    tramer(d, 0, 140, W - 1, H - 1, N, 4)
    d.rectangle([80, 112, 96, 130], fill=V)
    return im


def racine():
    """La Racine : une grotte où pendent les racines du monde, et des lucioles (les processus) dans le noir."""
    im, d = toile()
    rnd = random.Random(12)
    d.polygon([(0, 0), (W, 0), (W, 30), (130, 40), (88, 26), (40, 42), (0, 28)], fill=B)
    for k in range(9):
        x = 10 + k * 19
        y = 30 + rnd.randint(-6, 6)
        pts = [(x, y)]
        for s in range(5):
            x += rnd.randint(-5, 5); y += rnd.randint(10, 18)
            pts.append((x, y))
        d.line(pts, fill=B, width=3 if k % 3 == 0 else 2)
    for k in range(7):
        x, y = 30 + k * 20, 112 + (k % 3) * 8
        d.ellipse([x - 3, y - 3, x + 3, y + 3], fill=V if k == 4 else B)
        d.line([(x - 6, y - 2), (x - 3, y)], fill=B); d.line([(x + 6, y - 2), (x + 3, y)], fill=B)
    d.rectangle([0, 140, W, H], fill=V)
    return im


def coffre():
    """Le Coffre : la porte ronde d'une chambre forte, son volant et ses verrous."""
    im, d = toile()
    briques(d, 0, 0, W - 1, 140, 8, 20)
    d.ellipse([28, 14, 148, 134], fill=N)
    d.ellipse([32, 18, 144, 130], fill=B)
    d.ellipse([42, 28, 134, 120], fill=N)
    d.ellipse([46, 32, 130, 116], fill=B)
    for a in range(0, 360, 45):
        x = 88 + 30 * math.cos(math.radians(a)); y = 74 + 30 * math.sin(math.radians(a))
        d.line([(88, 74), (x, y)], fill=N, width=3)
        d.ellipse([x - 4, y - 4, x + 4, y + 4], fill=N)
    d.ellipse([80, 66, 96, 82], fill=V)
    d.rectangle([0, 140, W, H], fill=V)
    return im


def labo():
    """L'Atelier des Apprentis : des établis, des écrans, et un tableau couvert de formules."""
    im, d = toile()
    piece(d, 22, 12, 154, 92)
    d.rectangle([30, 18, 146, 52], fill=B)
    d.rectangle([33, 21, 143, 49], fill=N)
    d.text((38, 22), "who  last", fill=V); d.text((38, 34), "vimtuteur", fill=B)
    for x in (14, 72, 130):
        ecran_crt(d, x, 66, 32, 24)
    d.rectangle([0, 104, W, 110], fill=B)
    for x in (10, 166):
        d.rectangle([x - 3, 110, x + 3, 150], fill=B)
    return im


def web():
    """La Vitrine : une échoppe du marché, sa grande vitre, et un masque accroché derrière."""
    im, d = toile()
    d.polygon([(10, 34), (166, 34), (176, 50), (0, 50)], fill=V)
    for x in range(0, W, 16):
        d.polygon([(x, 50), (x + 8, 50), (x + 4, 58)], fill=V)
    d.rectangle([14, 50, 162, 140], fill=B)
    d.rectangle([24, 62, 116, 124], fill=N)
    d.line([(34, 112), (60, 72)], fill=B, width=3); d.line([(52, 116), (80, 74)], fill=B, width=2)
    # le masque derrière la vitre
    d.ellipse([84, 78, 108, 104], fill=V)
    d.ellipse([88, 86, 94, 91], fill=N); d.ellipse([98, 86, 104, 91], fill=N)
    d.arc([90, 92, 102, 100], 20, 160, fill=N)
    d.rectangle([126, 74, 150, 140], fill=N); d.rectangle([128, 76, 148, 140], fill=B); d.ellipse([142, 104, 146, 108], fill=N)
    d.text((54, 38), "VITRINE", fill=N)
    d.rectangle([0, 140, W, H], fill=B)
    for x in range(0, W, 22):
        d.line([(x, 140), (x - 10, H)], fill=N)
    d.line([(0, 154), (W, 154)], fill=N)
    return im


def mail():
    """La Volière : une grande cage dorée, des pigeons voyageurs, et une enveloppe piégée."""
    im, d = toile()
    d.ellipse([28, 6, 148, 60], fill=B); d.ellipse([32, 10, 144, 56], fill=N)
    d.rectangle([28, 32, 148, 140], fill=N)
    for x in range(32, 148, 12):
        d.line([(x, 20 if 44 < x < 132 else 30), (x, 140)], fill=B, width=2)
    d.line([(28, 32), (28, 140)], fill=B, width=3); d.line([(148, 32), (148, 140)], fill=B, width=3)
    d.rectangle([20, 140, 156, 148], fill=B)
    d.line([(88, 0), (88, 8)], fill=B, width=2)
    # les pigeons perchés
    for x, y in [(52, 86), (88, 66), (118, 96)]:
        d.ellipse([x - 8, y - 5, x + 8, y + 5], fill=B)
        d.ellipse([x + 4, y - 9, x + 11, y - 2], fill=B)
        d.point((x + 8, y - 6), fill=N)
        d.polygon([(x - 8, y), (x - 15, y - 3), (x - 13, y + 3)], fill=B)
        d.line([(x - 20, y + 6), (x + 20, y + 6)], fill=B)
    # l'enveloppe piégée, verte
    d.rectangle([70, 112, 106, 132], fill=V)
    d.line([(70, 112), (88, 124), (106, 112)], fill=N, width=2)
    d.rectangle([0, 148, W, H], fill=V)
    return im


def dns():
    """L'Oracle des Noms : un grand œil sur un autel, des panneaux qui montrent les chemins."""
    im, d = toile()
    etoiles(d, 14, 21, 50)
    colline(d, [(0, 128), (176, 124)])
    # l'autel
    d.polygon([(54, 90), (122, 90), (112, 128), (64, 128)], fill=B)
    d.rectangle([48, 84, 128, 90], fill=B)
    tramer(d, 66, 96, 110, 124, N, 3)
    # l'œil
    d.ellipse([60, 32, 116, 76], fill=B)
    d.ellipse([74, 40, 102, 68], fill=V)
    d.ellipse([82, 48, 94, 60], fill=N)
    d.point((85, 50), fill=B); d.point((86, 50), fill=B)
    for a in range(200, 341, 28):
        x = 88 + 40 * math.cos(math.radians(a)); y = 54 + 32 * math.sin(math.radians(a))
        x2 = 88 + 52 * math.cos(math.radians(a)); y2 = 54 + 44 * math.sin(math.radians(a))
        d.line([(x, y), (x2, y2)], fill=B, width=2)
    # les panneaux
    d.rectangle([150, 92, 154, 150], fill=B)
    d.polygon([(130, 96), (166, 96), (174, 102), (166, 108), (130, 108)], fill=B)
    d.polygon([(130, 112), (166, 112), (166, 124), (130, 124), (122, 118)], fill=V)
    d.rectangle([22, 96, 26, 150], fill=B)
    d.polygon([(8, 100), (40, 100), (46, 106), (40, 112), (8, 112)], fill=B)
    return im


def parefeu():
    """La Muraille : un rempart crénelé, une herse au milieu, levée."""
    im, d = toile()
    etoiles(d, 12, 31, 40); lune(d, 150, 20, 8)
    briques(d, 0, 50, W - 1, 140, 8, 18)
    creneaux(d, 0, W, 50, 10, 12)
    arche(d, 56, 72, 120, 140, N)
    # la herse, remontée à moitié
    for x in range(62, 116, 8):
        d.line([(x, 80), (x, 106)], fill=V, width=2)
    for y in range(84, 108, 8):
        d.line([(60, y), (116, y)], fill=V, width=2)
    for x in range(62, 116, 8):
        d.polygon([(x - 2, 106), (x + 2, 106), (x, 110)], fill=V)
    d.rectangle([0, 140, W, H], fill=V)
    d.polygon([(64, 140), (112, 140), (128, H), (48, H)], fill=B)
    return im


def sauvegarde():
    """Le Reliquaire : des coffrets scellés sur des étagères, chacun avec son sceau vert."""
    im, d = toile()
    piece(d, 20, 10, 156, 106)
    for r in range(3):
        y = 20 + r * 30
        d.rectangle([26, y + 22, 150, y + 25], fill=B)
        for k in range(4):
            x = 32 + k * 30
            d.rectangle([x, y + 4, x + 22, y + 21], fill=B)
            d.rectangle([x, y + 4, x + 22, y + 8], fill=N)
            d.rectangle([x + 1, y + 5, x + 21, y + 7], fill=B)
            d.ellipse([x + 8, y + 11, x + 14, y + 17], fill=V)
    d.rectangle([62, 124, 114, 152], fill=B)
    d.rectangle([62, 124, 114, 132], fill=V)
    d.ellipse([82, 136, 94, 148], fill=N)
    return im


def imprimante():
    """La Presse : une presse à imprimer de bois et de fer, une feuille encore humide."""
    im, d = toile()
    piece(d, 24, 14, 152, 100)
    d.rectangle([40, 30, 136, 40], fill=B)
    d.rectangle([44, 40, 52, 120], fill=B); d.rectangle([124, 40, 132, 120], fill=B)
    d.rectangle([84, 40, 92, 70], fill=B)
    d.ellipse([70, 16, 106, 34], outline=B, width=3)
    d.rectangle([60, 70, 116, 80], fill=B)
    d.rectangle([52, 96, 124, 104], fill=B)
    d.polygon([(70, 104), (110, 104), (120, 132), (60, 132)], fill=B)
    for k in range(4):
        d.line([(70, 112 + k * 5), (108, 112 + k * 5)], fill=N if k != 1 else V)
    return im


def badgeuse():
    """Le Portail des Badges : une grille d'entrée, et la borne où l'on présente son badge."""
    im, d = toile()
    etoiles(d, 10, 41, 40)
    colline(d, [(0, 128), (176, 128)])
    d.rectangle([20, 30, 30, 132], fill=B); d.rectangle([118, 30, 128, 132], fill=B)
    d.arc([20, 6, 128, 56], 180, 360, fill=B, width=4)
    for x in range(36, 116, 10):
        d.line([(x, 34), (x, 130)], fill=B, width=2)
        d.polygon([(x - 3, 34), (x + 3, 34), (x, 28)], fill=B)
    d.line([(30, 80), (118, 80)], fill=B, width=3)
    # la borne à badge
    d.rectangle([142, 70, 162, 130], fill=B)
    d.rectangle([146, 76, 158, 92], fill=N)
    d.ellipse([148, 80, 156, 88], fill=V)
    d.rectangle([146, 100, 158, 104], fill=N)
    return im


def poste():
    """Le Nid du Corbeau : un poste de travail, une cape noire sur la chaise, et un nid de câbles."""
    im, d = toile()
    piece(d, 26, 12, 150, 96)
    ecran_crt(d, 44, 34, 60, 42, ("$_",))
    d.rectangle([20, 96, 156, 102], fill=B)
    for x in (26, 150):
        d.rectangle([x - 3, 102, x + 3, 140], fill=B)
    # la chaise et la cape
    d.rectangle([120, 64, 146, 70], fill=B)
    d.polygon([(118, 70), (148, 70), (156, 120), (110, 120)], fill=B)
    d.polygon([(122, 74), (144, 74), (150, 116), (116, 116)], fill=N)
    d.line([(133, 74), (133, 116)], fill=B)
    # le nid de câbles sur le bureau
    d.ellipse([60, 84, 96, 98], fill=B)
    for k in range(5):
        d.arc([62 + k * 2, 84 + k, 94 - k * 2, 98 - k], 180, 360, fill=N)
    d.ellipse([74, 86, 80, 92], fill=V)
    return im


# ------------------------------------------------------------------
# Deux portraits et un objet pour l'Annexe
# ------------------------------------------------------------------

def gaspard():
    """Gaspard, le régisseur de l'Annexe : un tablier, un trousseau de clés, l'air pressé."""
    im, d = toile()
    d.ellipse([60, 14, 116, 70], fill=B)
    d.rectangle([62, 16, 114, 30], fill=V)                    # le bonnet
    d.rectangle([72, 38, 80, 46], fill=N); d.rectangle([96, 38, 104, 46], fill=N)
    d.rectangle([76, 58, 100, 62], fill=N)                     # la bouche
    d.rectangle([80, 70, 96, 78], fill=B)                      # le cou
    d.polygon([(48, 78), (128, 78), (138, 140), (38, 140)], fill=B)
    d.polygon([(64, 86), (112, 86), (116, 140), (60, 140)], fill=V)   # le tablier
    d.rectangle([74, 104, 102, 116], fill=N)
    d.ellipse([118, 106, 132, 120], outline=N, width=2)        # le trousseau
    d.rectangle([62, 140, 82, 160], fill=B); d.rectangle([94, 140, 114, 160], fill=B)
    d.line([(0, 162), (W, 162)], fill=B)
    return im


def boitier():
    """Le boîtier scotché sous la table : le faux point d'accès."""
    im, d = toile()
    d.rectangle([0, 20, W, 34], fill=B)
    d.rectangle([20, 34, 24, 120], fill=B); d.rectangle([152, 34, 156, 120], fill=B)
    d.rectangle([52, 46, 124, 82], fill=B)
    d.rectangle([56, 50, 120, 78], fill=N)
    for x in (62, 72, 82):
        d.rectangle([x, 70, x + 4, 74], fill=V)
    d.line([(118, 50), (138, 36)], fill=B, width=3)
    for k in range(3):
        r = 6 + k * 6
        d.arc([138 - r, 36 - r, 138 + r, 36 + r], 300, 60, fill=V, width=2)
    d.rectangle([40, 40, 136, 44], fill=V)                     # le scotch
    d.text((64, 56), "FREE", fill=B)
    return im


# ------------------------------------------------------------------
# Le plan des adresses (bâtiment B) : la rue, les quartiers, la cartographe
# ------------------------------------------------------------------

def maison(d, x, y, w=22, h=22, num=None, c=B):
    """Une maison de face : un toit pointu, une porte, et son numéro au-dessus de la porte."""
    d.polygon([(x - 2, y), (x + w // 2, y - 12), (x + w + 2, y)], fill=c)
    d.rectangle([x, y, x + w, y + h], fill=c)
    d.rectangle([x + w // 2 - 4, y + h - 10, x + w // 2 + 4, y + h], fill=N)
    if num:
        d.rectangle([x + 1, y + 2, x + w - 1, y + 10], fill=N)
        d.text((x + (w - d.textlength(num)) / 2, y + 1), num, fill=V)


def plan_rue():
    """Une adresse IP comme une adresse postale : la rue 10.0.93, les maisons, le panneau .0, le crieur .255, le Bureau de Poste .254."""
    im, d = toile()
    d.rectangle([22, 4, 154, 20], fill=B)
    texte_centre(d, 8, "RUE 10.0.93.0/24", N)
    d.rectangle([0, 112, W, H], fill=V)                        # la rue
    for x in range(4, W, 16):
        d.rectangle([x, 138, x + 8, 140], fill=B)              # les pointillés
    d.rectangle([4, 46, 6, 74], fill=B)                        # le panneau de la rue, .0
    d.rectangle([0, 38, 20, 48], fill=B); d.text((4, 38), ".0", fill=N)
    for i, (x, num) in enumerate([(10, ".1"), (38, ".2"), (70, ".20"), (102, ".253")]):
        maison(d, x, 88, w=28 if num == ".253" else 24, h=24, num=num)
    d.text((62, 98), "..", fill=B); d.text((94, 98), "..", fill=B)
    # le Bureau de Poste, la passerelle .254 : un toit, une enseigne, une boîte jaune... en vert
    d.polygon([(136, 52), (154, 36), (172, 52)], fill=B)
    d.rectangle([138, 52, 170, 112], fill=B)
    d.rectangle([134, 58, 174, 68], fill=V); d.text((138, 58), "POSTE", fill=N)
    d.rectangle([148, 92, 160, 112], fill=N)
    d.rectangle([142, 74, 150, 84], fill=N); d.rectangle([158, 74, 166, 84], fill=N)
    d.rectangle([108, 38, 132, 48], fill=N); d.text((109, 38), ".254", fill=B)
    # le crieur public, .255 : ce qu'on lui dit, toute la rue l'entend
    d.ellipse([76, 146, 86, 156], fill=B)
    d.rectangle([77, 156, 85, 168], fill=B)
    d.polygon([(86, 150), (98, 144), (98, 160)], fill=B)
    for k in range(3):
        r = 6 + k * 6
        d.arc([98 - r, 152 - r, 98 + r, 152 + r], 300, 60, fill=B, width=2)
    d.rectangle([40, 150, 70, 160], fill=N); d.text((42, 151), ".255", fill=B)
    return im


def quartiers():
    """Une rue /24 coupée en quatre quartiers de /26 : .0, .64, .128, .192. Le premier est l'Annexe."""
    im, d = toile()
    d.rectangle([14, 2, 162, 16], fill=B)
    texte_centre(d, 5, "10.0.94.0/24 = 4 x /26", N)
    cases = [(8, 24, ".0"), (92, 24, ".64"), (8, 98, ".128"), (92, 98, ".192")]
    for k, (x, y, nom) in enumerate(cases):
        fond = V if k == 0 else N
        d.rectangle([x, y, x + 76, y + 66], fill=fond, outline=B, width=2)
        for j in range(2):
            for i in range(3):
                hx, hy = x + 8 + i * 22, y + 26 + j * 20
                d.polygon([(hx - 1, hy), (hx + 7, hy - 6), (hx + 15, hy)], fill=B)
                d.rectangle([hx, hy, hx + 14, hy + 10], fill=B)
                d.rectangle([hx + 5, hy + 4, hx + 9, hy + 10], fill=fond)
        d.rectangle([x + 4, y + 4, x + 8 + d.textlength(nom), y + 14], fill=N)
        d.text((x + 6, y + 4), nom, fill=B)
    d.rectangle([84, 24, 92, 164], fill=B); d.rectangle([8, 90, 168, 98], fill=B)   # les rues entre les quartiers
    return im


def cartographe():
    """Nour, la cartographe du réseau : des lunettes, un crayon sur l'oreille, un plan déroulé."""
    im, d = toile()
    d.ellipse([60, 12, 116, 68], fill=B)
    d.polygon([(56, 30), (66, 8), (110, 8), (120, 30), (120, 60), (112, 30), (64, 30), (56, 60)], fill=V)   # les cheveux
    d.rectangle([68, 36, 84, 46], outline=N, width=2); d.rectangle([92, 36, 108, 46], outline=N, width=2)
    d.line([(84, 40), (92, 40)], fill=N, width=2)                # les lunettes
    d.rectangle([80, 56, 96, 59], fill=N)                       # le sourire
    d.line([(112, 22), (126, 6)], fill=N, width=3)              # le crayon
    d.rectangle([80, 68, 96, 76], fill=B)
    d.polygon([(46, 76), (130, 76), (140, 120), (36, 120)], fill=B)
    # le plan déroulé : une grille, une rue verte, des points pour les maisons
    d.rectangle([28, 96, 148, 160], fill=B, outline=N, width=2)
    d.ellipse([20, 92, 36, 164], fill=B, outline=N, width=2); d.ellipse([140, 92, 156, 164], fill=B, outline=N, width=2)
    for x in range(40, 140, 16):
        d.line([(x, 102), (x, 154)], fill=N)
    for y in range(110, 154, 12):
        d.line([(36, y), (144, y)], fill=N)
    d.rectangle([36, 124, 144, 132], fill=V)
    for x in range(44, 140, 16):
        d.rectangle([x, 115, x + 4, 119], fill=V)
    return im


def forteresse():
    """La Forteresse de l'épreuve finale : un donjon noir sur un rocher, la bannière du Corbeau, trois sceaux verts."""
    im, d = toile()
    etoiles(d, n=22, graine=9, ymax=70)
    lune(d, 150, 20, r=9)
    colline(d, [(0, 140), (40, 128), (88, 122), (136, 128), (176, 138)])
    d.polygon([(30, 132), (52, 104), (124, 104), (146, 132)], fill=B)          # le rocher
    tramer(d, 34, 112, 140, 130, c=N, pas=3)
    briques(d, 44, 60, 132, 106)                                             # le mur
    creneaux(d, 44, 132, 60, h=8, w=8)
    briques(d, 74, 26, 102, 60)                                              # le donjon
    creneaux(d, 74, 102, 26, h=7, w=5)
    for x in (34, 132):
        briques(d, x, 44, x + 12, 106)                                       # les tours d'angle
        creneaux(d, x, x + 12, 44, h=6, w=4)
    arche(d, 78, 82, 98, 106, fill=N)                                        # la porte
    d.line([(88, 26), (88, 6)], fill=B, width=2)                             # la bannière du Corbeau
    d.polygon([(89, 6), (110, 10), (89, 16)], fill=N, outline=B)
    d.polygon([(95, 9), (100, 11), (95, 13)], fill=B)
    for i, x in enumerate((54, 116, 88)):                                    # les trois sceaux
        y = 72 if i < 2 else 40
        d.ellipse([x - 5, y - 5, x + 5, y + 5], fill=V, outline=N)
    return im


DESSINS = {
    "loc_batimentb.gif": lambda: batimentb(False), "loc_batimentb_ok.gif": lambda: batimentb(True),
    "loc_posteb.gif": posteb, "loc_routeur.gif": routeur, "loc_intranet.gif": intranet,
    "loc_etc.gif": etc_, "loc_journaux.gif": journaux, "loc_tmp.gif": tmp_,
    "loc_annexe.gif": annexe, "loc_portable.gif": portable, "loc_borne.gif": borne, "loc_switch.gif": switch, "loc_affichage.gif": affichage,
    "loc_crypte.gif": crypte, "loc_bin.gif": binaires, "loc_caveau.gif": caveau, "loc_racine.gif": racine, "loc_coffre.gif": coffre,
    "loc_labo.gif": labo, "loc_web.gif": web, "loc_mail.gif": mail, "loc_dns.gif": dns, "loc_parefeu.gif": parefeu,
    "loc_sauvegarde.gif": sauvegarde, "loc_imprimante.gif": imprimante, "loc_badgeuse.gif": badgeuse, "loc_poste.gif": poste,
    "item_gaspard.gif": gaspard, "item_boitier.gif": boitier,
    "item_plan_rue.gif": plan_rue, "item_quartiers.gif": quartiers, "item_cartographe.gif": cartographe,
    "loc_forteresse.gif": forteresse,
}

if __name__ == "__main__":
    noms = sys.argv[1:] or list(DESSINS)
    for nom in noms:
        finir(nom, DESSINS[nom]())
    print(len(noms), "dessins")
