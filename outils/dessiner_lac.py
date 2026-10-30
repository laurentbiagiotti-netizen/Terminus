"""Dessine le Lac Profond (chapitre 10, la grande finale) : le lac souterrain sous la Chronothèque, ses quais de
pierre, ses brumes, ses tuyaux et ses vannes (les pipelines de l'école), les quinze postes des maîtres, la machine
lac, la Grande Marée où Pipelinus jaillit, la victoire, les trois nuits au bord de l'eau, les montées de rang, les
plans de la cinématique 10, Pipelinus (la pieuvre aux huit bras-tuyaux, un œil énorme) et la jauge de clarté.

Même format et même palette que les chapitres précédents (dessiner_lieux.finir : toile 176 x 170 doublée dans le cadre
d'origine ; trois couleurs : noir, vert, blanc), même manière que dessiner_chronique.py : dégradés tramés, plans
successifs, halos. Ici, tout est sous terre, au bord d'une eau noire : la pierre, les tuyaux de fonte, la lumière des
lanternes (le blanc), la brume et l'eau (le vert).
Usage : python3 outils/dessiner_lac.py [nom...]
"""
import os, sys, math, random
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from PIL import Image, ImageDraw  # noqa: E402
from dessiner_lieux import toile, finir, N, V, B, W, H, PAL, OUT  # noqa: E402
from dessiner_port import (BAYER, trame, degrade, halo, ombrer, etoile, texte_maj, faisceau, conteneur3d,  # noqa: E402
                           silhouette)
from dessiner_chronique import pierres, lanterne, sceau_cire, bezier, porte_ogive, sablier  # noqa: E402


# ------------------------------------------------------------------
# La grotte, l'eau, la brume, les tuyaux
# ------------------------------------------------------------------

def voute_grotte(d, im, y_bas=60, graine=1, c=V):
    """La voûte rocheuse : un plafond de roche tramé, des stalactites qui pendent, plus sombres vers le fond."""
    rnd = random.Random(graine)
    degrade(d, 0, 0, W, y_bas, c, 0.55, 0.0)
    x = -4
    while x < W + 4:
        l = rnd.randint(3, 8)
        h = rnd.randint(4, 22)
        d.polygon([(x, 0), (x + l, 0), (x + l / 2 + rnd.randint(-1, 1), h)], fill=c)
        if rnd.random() < 0.5:
            d.line([(x + 1, 0), (x + l / 2, h - 1)], fill=B)
        x += l + rnd.randint(0, 6)


def eau(d, y0, y1, graine=1, c=V, reflet=None, c_reflet=B, larg=10, dense=1.0):
    """L'eau noire du lac : des rides vertes, plus longues et plus espacées en approchant ; sous une lumière
    (reflet = x), une colonne de reflets brisés."""
    rnd = random.Random(graine)
    d.rectangle([0, y0, W, y1], fill=N)
    y = y0
    while y < y1:
        p = (y - y0) / max(1, y1 - y0)
        long_ = 2 + int(p * 8)
        esp = int((8 + p * 16) / dense)
        dec = rnd.randint(0, max(1, esp))
        for x in range(-dec, W, max(3, esp)):
            d.line([(x, y), (x + long_, y)], fill=c)
        if reflet is not None:
            l = larg * (0.5 + p * 1.2)
            x = reflet - l
            while x < reflet + l:
                seg = rnd.randint(2, 4 + int(p * 6))
                if rnd.random() < 0.75 - p * 0.25:
                    d.line([(x, y), (min(x + seg, reflet + l), y)], fill=c_reflet)
                x += seg + rnd.randint(1, 3)
        y += 2 + int(p * 4)


def brume(d, y, h=10, t=0.25, c=B, graine=1):
    """Un banc de brume : une bande tramée aux bords flous, qui ondule."""
    rnd = random.Random(graine)
    for x0 in range(0, W, 22):
        dy = rnd.randint(-3, 3)
        halo(d, x0 + 11, y + dy, 26, c, t, h)


def quai(d, y, x0=0, x1=W, h=12, graine=3, bord=True):
    """Un quai de pierre : un parement de pierres de taille, une margelle claire, des anneaux d'amarrage."""
    pierres(d, x0, y, x1, y + h, 6, 14, V, graine=graine)
    if bord:
        d.line([(x0, y), (x1, y)], fill=B, width=2)
    for x in range(x0 + 12, x1 - 6, 34):
        d.ellipse([x - 2, y + 4, x + 2, y + 8], outline=B)


def tuyau(d, pts, ep=4, c=V, joints=True, pas=11):
    """Un tuyau de fonte : un trait épais, un filet de lumière dessus, des brides (joints) à intervalle régulier."""
    pts = bezier(pts, 40) if len(pts) > 2 else pts
    d.line(pts, fill=c, width=ep)
    d.line([(x, y - ep // 2 + 1) for (x, y) in pts], fill=B)
    if joints:
        for k in range(pas, len(pts) - 1, pas):
            (x0, y0), (x1, y1) = pts[k - 1], pts[k + 1]
            a = math.atan2(y1 - y0, x1 - x0) + math.pi / 2
            r = ep / 2 + 1
            d.line([(pts[k][0] - r * math.cos(a), pts[k][1] - r * math.sin(a)), (pts[k][0] + r * math.cos(a), pts[k][1] + r * math.sin(a))], fill=B, width=2)


def vanne(d, x, y, r=8, c=B):
    """Un volant de vanne : une roue à rayons, un moyeu."""
    d.ellipse([x - r, y - r, x + r, y + r], outline=c, width=2)
    for k in range(4):
        a = k * math.pi / 4
        d.line([(x - r * math.cos(a), y - r * math.sin(a)), (x + r * math.cos(a), y + r * math.sin(a))], fill=c)
    d.ellipse([x - 2, y - 2, x + 2, y + 2], fill=V)


def manometre(d, x, y, r=8, a=0.3):
    """Un manomètre : un cadran, ses graduations, une aiguille (a de 0 à 1)."""
    d.ellipse([x - r, y - r, x + r, y + r], fill=B)
    d.ellipse([x - r + 2, y - r + 2, x + r - 2, y + r - 2], fill=N)
    for k in range(7):
        t = math.pi * (0.75 + 1.5 * k / 6)
        d.point((x + (r - 3) * math.cos(t), y + (r - 3) * math.sin(t)), fill=V)
    t = math.pi * (0.75 + 1.5 * a)
    d.line([(x, y), (x + (r - 3) * math.cos(t), y + (r - 3) * math.sin(t))], fill=B)
    d.point((x, y), fill=V)


def poisson(d, x, y, s=1.0, c=B, sens=1):
    """Un poisson de profil : un fuseau, une queue, un œil."""
    l = 8 * s
    d.ellipse([x - l, y - 3 * s, x + l, y + 3 * s], fill=c)
    d.polygon([(x - sens * l, y), (x - sens * (l + 4 * s), y - 3 * s), (x - sens * (l + 4 * s), y + 3 * s)], fill=c)
    d.point((x + sens * (l - 3 * s), y - 1), fill=N)


def caisse(d, x, y, w=12, h=10, c=V):
    d.rectangle([x, y, x + w, y + h], fill=c)
    d.rectangle([x, y, x + w, y + h], outline=B)
    d.line([(x, y), (x + w, y + h)], fill=N); d.line([(x + w, y), (x, y + h)], fill=N)


def feuillet(d, x, y, w=12, h=15, plis=3, c=B, encre=V, angle=0):
    """Un fichier échoué : une feuille au coin corné, des lignes d'encre."""
    pts = [(x, y), (x + w - 4, y), (x + w, y + 4), (x + w, y + h), (x, y + h)]
    if angle:
        cx, cy = x + w / 2, y + h / 2
        pts = [(cx + (px - cx) * math.cos(angle) - (py - cy) * math.sin(angle), cy + (px - cx) * math.sin(angle) + (py - cy) * math.cos(angle)) for px, py in pts]
    d.polygon(pts, fill=c)
    if not angle:
        d.polygon([(x + w - 4, y), (x + w - 4, y + 4), (x + w, y + 4)], fill=V)
        for k in range(plis):
            d.line([(x + 2, y + 5 + k * 3), (x + w - 3 - (k * 3) % 5, y + 5 + k * 3)], fill=encre)


def tentacule(d, pts, ep0=9, ep1=2, c=V, ventouses=True, tuyau_=True):
    """Un bras de Pipelinus : une courbe qui s'amincit, une arête claire ; dessous des ventouses, et par endroits une
    bride de tuyau : chaque bras est aussi un pipeline."""
    cs = bezier(pts, 60)
    n = len(cs)
    for k in range(n - 1):
        e = ep0 + (ep1 - ep0) * k / (n - 1)
        d.line([cs[k], cs[k + 1]], fill=c, width=max(1, int(round(e))))
    for k in range(n - 1):
        e = ep0 + (ep1 - ep0) * k / (n - 1)
        if e > 3:
            x0, y0 = cs[k]; x1, y1 = cs[k + 1]
            a = math.atan2(y1 - y0, x1 - x0) - math.pi / 2
            d.point((x0 + (e / 2 - 1) * math.cos(a), y0 + (e / 2 - 1) * math.sin(a)), fill=B)
    for k in range(4, n - 4, 5):
        e = ep0 + (ep1 - ep0) * k / (n - 1)
        x0, y0 = cs[k - 1]; x1, y1 = cs[k + 1]
        a = math.atan2(y1 - y0, x1 - x0) + math.pi / 2
        px, py = cs[k]
        if ventouses and e > 3:
            r = max(1, e / 4)
            vx, vy = px + (e / 2) * math.cos(a), py + (e / 2) * math.sin(a)
            d.ellipse([vx - r, vy - r, vx + r, vy + r], outline=B)
        if tuyau_ and k % 15 == 9 and e > 3:
            r = e / 2 + 2
            d.line([(px - r * math.cos(a), py - r * math.sin(a)), (px + r * math.cos(a), py + r * math.sin(a))], fill=B, width=2)


def oeil(d, cx, cy, r, ouvert=1.0, c=B, iris=V):
    """L'œil de Pipelinus : une amande, un iris, une pupille fendue comme celle des pieuvres (horizontale)."""
    h = r * 0.55 * ouvert
    if h < 1:
        d.line([(cx - r, cy), (cx + r, cy)], fill=c, width=2)
        return
    pts_h = [(cx - r + 2 * r * k / 20, cy - h * math.sin(math.pi * k / 20)) for k in range(21)]
    pts_b = [(cx + r - 2 * r * k / 20, cy + h * math.sin(math.pi * k / 20)) for k in range(21)]
    d.polygon(pts_h + pts_b, fill=c)
    ri = min(r * 0.55, h * 1.05)
    d.ellipse([cx - ri, cy - ri, cx + ri, cy + ri], fill=iris)
    trame(d, cx - ri, cy - ri, cx + ri, cy + ri, N, 0.18)
    d.rectangle([cx - ri * 0.75, cy - max(1, ri * 0.18), cx + ri * 0.75, cy + max(1, ri * 0.18)], fill=N)
    d.line(pts_h, fill=V)
    d.point((cx - ri * 0.4, cy - ri * 0.5), fill=B)


def pipelinus(d, im, cx, cy, s=1.0, bras=None, ouvert=1.0, halo_=True):
    """Pipelinus : un manteau en dôme, un œil énorme, et huit bras-tuyaux (bras : liste de huit courbes relatives)."""
    if halo_:
        halo(d, cx, cy, 70 * s, V, 0.55, 54 * s)
    if bras is None:
        bras = []
        for k in range(8):
            a = math.pi * (0.05 + 0.9 * k / 7)
            ox = 22 * s * math.cos(a) * -1
            fx = cx + ox + (k - 3.5) * 16 * s
            bras.append([(cx + ox * 0.5, cy + 16 * s), (cx + ox * 1.6, cy + 40 * s), (fx + (k % 2) * 10 * s, cy + 50 * s), (fx - (k - 3.5) * 8 * s, cy + 74 * s)])
    for k, b in enumerate(bras):
        tentacule(d, b, 9 * s, 2, V if k % 2 else B, ventouses=True)
    # le manteau
    d.ellipse([cx - 26 * s, cy - 36 * s, cx + 26 * s, cy + 22 * s], fill=V)
    d.ellipse([cx - 22 * s, cy - 34 * s, cx + 18 * s, cy + 10 * s], fill=V)
    for yy in range(int(cy - 36 * s), int(cy + 22 * s) + 1):                            # l'ombre du manteau, dans le manteau seul
        for xx in range(int(cx - 26 * s), int(cx + 26 * s) + 1):
            if 0 <= xx < W and 0 <= yy < H and ((xx - cx) / (26 * s)) ** 2 + ((yy - (cy - 7 * s)) / (29 * s)) ** 2 < 0.92 \
                    and (yy > cy - 10 * s or xx > cx + 6 * s) and BAYER[yy % 4][xx % 4] < 3:
                d.point((xx, yy), fill=N)
    d.arc([cx - 26 * s, cy - 36 * s, cx + 26 * s, cy + 22 * s], 190, 330, fill=B, width=2)
    for k in range(5):                                                                   # des taches claires
        d.point((cx - 14 * s + k * 7 * s, cy - 24 * s + (k % 2) * 6 * s), fill=B)
    oeil(d, cx, cy - 2 * s, 15 * s, ouvert)


# ------------------------------------------------------------------
# Le Lac Profond et sa machine
# ------------------------------------------------------------------

def lac(victoire=False):
    """La Rive du Lac Profond : la voûte, l'eau noire immense qui se perd dans la brume, un quai de pierre au premier
    plan, des lanternes, des tuyaux qui plongent dans l'eau, une vanne ; (victoire) l'eau claire, la brume levée,
    toutes les lanternes allumées."""
    im, d = toile()
    d.rectangle([0, 0, W, H], fill=N)
    voute_grotte(d, im, 64 if not victoire else 50, graine=2)
    horizon = 92
    if victoire:
        degrade(d, 0, 30, W, horizon, B, 0.0, 0.35)
        eau(d, horizon, 140, graine=4, c=B, reflet=88, c_reflet=B, larg=18, dense=1.3)
        for k in range(9):
            lanterne(d, 10 + k * 20, 28 + (k % 2) * 8, 0.8, True)
    else:
        degrade(d, 0, 40, W, horizon, V, 0.0, 0.3)
        eau(d, horizon, 140, graine=4, reflet=46, larg=8)
        brume(d, horizon + 6, 8, 0.3, B, 3)
        lanterne(d, 46, 44, 1.0, True)
        lanterne(d, 140, 50, 0.8, True)
    # au loin, l'autre rive : un quai minuscule et ses feux
    d.line([(118, horizon - 2), (176, horizon - 2)], fill=V)
    for x in (124, 136, 152, 166):
        d.point((x, horizon - 4), fill=B)
    # les tuyaux qui plongent dans l'eau
    tuyau(d, [(0, 70), (20, 76), (30, 108), (34, 140)], 5, V)
    tuyau(d, [(176, 64), (160, 80), (150, 118), (148, 140)], 4, V)
    vanne(d, 22, 82, 7)
    quai(d, 140, 0, W, 14, graine=6)
    d.rectangle([0, 154, W, H], fill=N)
    trame(d, 0, 154, W, H, V, 0.3)
    if victoire:
        for k in range(6):
            poisson(d, 30 + k * 24, 110 + (k % 3) * 8, 0.6, B, 1 if k % 2 else -1)
    else:
        for (x, y) in ((70, 120), (100, 128)):                                            # des rides, quelque chose bouge
            d.arc([x - 12, y - 3, x + 12, y + 3], 180, 360, fill=B)
    return im


def dossier_lac():
    """Un dossier du lac : un casier étanche sur un ponton, des feuillets à l'abri, une lanterne."""
    im, d = toile()
    d.rectangle([0, 0, W, H], fill=N)
    voute_grotte(d, im, 50, graine=9)
    eau(d, 100, H, graine=9)
    d.rectangle([20, 110, 156, 118], fill=V); d.line([(20, 110), (156, 110)], fill=B)    # le ponton
    for x in (26, 88, 150):
        d.rectangle([x - 2, 118, x + 2, 150], fill=V)
    halo(d, 88, 80, 50, V, 0.5, 40)
    d.rectangle([52, 58, 124, 110], fill=B)                                              # le casier
    d.rectangle([56, 62, 120, 106], fill=N)
    for k, x in enumerate(range(60, 116, 11)):
        feuillet(d, x, 70 - (k % 2) * 4, 9, 30, 4, B, V)
    d.rectangle([52, 54, 124, 58], fill=V)
    lanterne(d, 140, 60, 0.9, True)
    return im


def machine_lac():
    """La machine lac : une armoire de serveurs sur une île de pierre au milieu de l'eau, ses voyants allumés,
    reliée aux quais par des tuyaux, et la brume tout autour."""
    im, d = toile()
    d.rectangle([0, 0, W, H], fill=N)
    voute_grotte(d, im, 56, graine=11)
    eau(d, 104, H, graine=11, reflet=88, larg=12)
    d.polygon([(40, 116), (136, 116), (124, 104), (52, 104)], fill=V)                     # l'île
    pierres(d, 52, 104, 124, 116, 4, 10, V, graine=12)
    halo(d, 88, 70, 46, V, 0.5, 44)
    d.rectangle([66, 30, 110, 106], fill=B)                                              # l'armoire
    d.rectangle([69, 33, 107, 103], fill=N)
    for k in range(10):
        y = 37 + k * 6.6
        d.rectangle([72, y, 104, y + 3], fill=V)
        d.point((75, y + 1), fill=B); d.point((78, y + 1), fill=B if k % 3 else N)
        d.line([(88, y + 1), (100, y + 1)], fill=N)
    tuyau(d, [(0, 96), (30, 100), (50, 110), (66, 96)], 4)
    tuyau(d, [(176, 90), (150, 100), (130, 110), (110, 94)], 4)
    brume(d, 120, 8, 0.3, B, 5)
    return im


def maree():
    """La Grande Marée : l'eau se soulève en une vague, Pipelinus jaillit au centre, son œil ouvert, et ses huit bras
    s'abattent sur les quais, renversent les lanternes, serrent les tuyaux."""
    im, d = toile()
    d.rectangle([0, 0, W, H], fill=N)
    voute_grotte(d, im, 40, graine=21)
    halo(d, 88, 60, 90, V, 0.7, 70)
    # la vague
    for k in range(6):
        y = 92 + k * 4
        d.arc([-20 - k * 4, y - 30, 196 + k * 4, y + 30], 180, 360, fill=B if k % 2 else V, width=2)
    bras = [
        [(74, 74), (40, 60), (14, 76), (4, 120)],
        [(78, 80), (52, 92), (30, 120), (22, 146)],
        [(82, 84), (70, 110), (58, 134), (50, 160)],
        [(86, 86), (84, 116), (78, 140), (82, 166)],
        [(90, 86), (100, 114), (110, 138), (104, 164)],
        [(94, 84), (116, 104), (134, 128), (138, 156)],
        [(98, 80), (128, 86), (150, 112), (162, 140)],
        [(102, 74), (136, 52), (162, 66), (172, 108)],
    ]
    pipelinus(d, im, 88, 56, 1.2, bras, 1.0, halo_=False)
    eau(d, 140, H, graine=22, dense=1.4)
    quai(d, 148, 0, 60, 10, graine=23)
    quai(d, 152, 118, W, 10, graine=24)
    # une lanterne renversée, des gouttes
    d.line([(24, 140), (36, 146)], fill=B)
    lanterne(d, 150, 132, 0.6, False)
    for k in range(18):
        x, y = 10 + (k * 37) % 160, 20 + (k * 23) % 70
        d.point((x, y), fill=B)
    return im


def victoire():
    return lac(True)


# ------------------------------------------------------------------
# Les quinze postes
# ------------------------------------------------------------------

def fond_poste(im, d, graine=1, horizon=100, eau_=True):
    """Le fond commun d'un poste : la voûte de la grotte, un mur de pierre à gauche et à droite, l'eau ou le quai."""
    d.rectangle([0, 0, W, H], fill=N)
    voute_grotte(d, im, 54, graine=graine)
    pierres(d, 0, 30, 16, horizon, 7, 10, V, graine=graine + 1)
    pierres(d, 160, 30, W, horizon, 7, 10, V, graine=graine + 2)
    ombrer(im, 0, 30, W, horizon, V, N, 0.7, 0.4)
    if eau_:
        eau(d, horizon, H, graine=graine)
    quai(d, horizon + 22, 0, W, 10, graine=graine + 3)
    d.rectangle([0, horizon + 32, W, H], fill=N)
    trame(d, 0, horizon + 32, W, H, V, 0.25)


def greve():
    """La Grève des Fichiers : une plage de galets au bord de l'eau, couverte de feuillets échoués, de bouteilles et
    de casiers que le lac a rejetés ; une lanterne posée, et la brume."""
    im, d = toile()
    d.rectangle([0, 0, W, H], fill=N)
    voute_grotte(d, im, 54, graine=31)
    eau(d, 70, 104, graine=31, reflet=130, larg=8)
    brume(d, 78, 7, 0.25, B, 31)
    d.polygon([(0, 100), (176, 92), (176, H), (0, H)], fill=N)                            # la grève
    rnd = random.Random(31)
    for _ in range(120):
        x, y = rnd.randint(0, 175), rnd.randint(96, 169)
        d.ellipse([x - 1, y, x + 1, y + 1], fill=V)
    for k in range(9):
        x, y = 8 + k * 18 + rnd.randint(-3, 3), 108 + (k * 13) % 44
        feuillet(d, x, y, 11, 14, 3, B, V, angle=(k % 3 - 1) * 0.35 if k % 2 else 0)
    for (x, y) in ((40, 98), (120, 102)):                                                 # des bouteilles
        d.polygon([(x, y), (x + 10, y - 3), (x + 12, y - 1), (x + 2, y + 2)], fill=V)
        d.line([(x + 12, y - 2), (x + 15, y - 3)], fill=B)
    lanterne(d, 150, 116, 0.9, True)
    return im


def banc_tri():
    """Le Banc de Tri : de longs étals de bois sous des lanternes ; les poissons rangés en piles par espèce, du plus
    grand au plus petit ; des étiquettes ; des paniers."""
    im, d = toile()
    fond_poste(im, d, 33, 100)
    lanterne(d, 50, 20, 0.9, True); lanterne(d, 126, 20, 0.9, True)
    for row, y in enumerate((52, 84)):                                                    # deux étals
        d.rectangle([20, y, 156, y + 4], fill=B)
        d.rectangle([24, y + 4, 28, y + 16], fill=V); d.rectangle([148, y + 4, 152, y + 16], fill=V)
        for k in range(5):
            x0 = 28 + k * 25
            n = 5 - k
            for j in range(n):
                poisson(d, x0 + 10, y - 3 - j * 4, 0.7 - row * 0.1, B if (j + k) % 2 else V)
            d.rectangle([x0 + 4, y + 6, x0 + 16, y + 10], fill=N); d.rectangle([x0 + 4, y + 6, x0 + 16, y + 10], outline=V)
    for x in (30, 150):                                                                   # des paniers
        d.rectangle([x - 8, 112, x + 8, 120], fill=V)
        for k in range(4):
            d.line([(x - 8 + k * 5, 112), (x - 8 + k * 5, 120)], fill=N)
    return im


def balance(d, x, y, s=1.0, pente=0.0):
    """Une balance romaine : un pied, un fléau, deux plateaux."""
    d.rectangle([x - 2 * s, y, x + 2 * s, y + 30 * s], fill=B)
    d.rectangle([x - 10 * s, y + 30 * s, x + 10 * s, y + 33 * s], fill=V)
    dy = 8 * s * pente
    d.line([(x - 22 * s, y + dy), (x + 22 * s, y - dy)], fill=B, width=2)
    for sx, dd in ((-1, dy), (1, -dy)):
        px, py = x + sx * 22 * s, y + dd
        d.line([(px, py), (px - 6 * s, py + 12 * s)], fill=V); d.line([(px, py), (px + 6 * s, py + 12 * s)], fill=V)
        d.arc([px - 9 * s, py + 8 * s, px + 9 * s, py + 16 * s], 0, 180, fill=B, width=2)


def comptoir_mesures():
    """Le Comptoir des Mesures : un comptoir de bois, deux balances, un abaque aux boules alignées, des registres
    ouverts couverts de colonnes de chiffres."""
    im, d = toile()
    fond_poste(im, d, 35, 104, eau_=False)
    d.rectangle([16, 30, 160, 104], fill=N)
    pierres(d, 16, 30, 160, 104, 7, 16, V, graine=36)
    ombrer(im, 16, 30, 160, 104, V, N, 0.85, 0.55)
    halo(d, 88, 70, 60, V, 0.4, 40)
    d.rectangle([12, 96, 164, 104], fill=B); d.rectangle([12, 104, 164, 110], fill=V)    # le comptoir
    balance(d, 46, 58, 1.0, 0.25)
    balance(d, 128, 64, 0.8, -0.15)
    d.rectangle([70, 40, 106, 88], outline=B, width=2)                                   # l'abaque
    for k in range(6):
        y = 46 + k * 7
        d.line([(72, y), (104, y)], fill=V)
        for j in range(4):
            x = 74 + ((k * 3 + j * 7) % 26)
            d.ellipse([x - 2, y - 2, x + 2, y + 2], fill=B)
    for x0 in (22, 112):                                                                 # les registres
        d.polygon([(x0, 92), (x0 + 20, 90), (x0 + 40, 92), (x0 + 40, 96), (x0, 96)], fill=B)
        for k in range(3):
            d.line([(x0 + 3, 93 + k), (x0 + 17, 92 + k)], fill=N)
    return im


def gue_encres():
    """Le Gué des Encres : des pierres plates qui traversent un courant ; d'un tuyau crevé, une encre noire et des
    lettres déformées se mêlent à l'eau verte et tournent en volutes."""
    im, d = toile()
    d.rectangle([0, 0, W, H], fill=N)
    voute_grotte(d, im, 50, graine=41)
    eau(d, 56, H, graine=41, dense=1.2)
    for k in range(7):                                                                   # les pierres du gué
        x, y = 12 + k * 24, 140 - k * 12
        d.ellipse([x - 12, y - 4, x + 12, y + 4], fill=V)
        d.arc([x - 12, y - 4, x + 12, y + 4], 180, 360, fill=B)
    tuyau(d, [(176, 40), (150, 50), (130, 62)], 6)
    d.ellipse([124, 58, 134, 68], fill=N)
    for k in range(5):                                                                   # les volutes d'encre
        r = 8 + k * 7
        d.arc([110 - r, 70 - r * 0.4, 110 + r, 70 + r * 0.4], 20 + k * 30, 200 + k * 30, fill=N, width=3)
        d.arc([110 - r, 70 - r * 0.4, 110 + r, 70 + r * 0.4], 20 + k * 30, 200 + k * 30, fill=B)
    rnd = random.Random(42)
    for k, ch in enumerate("ÉÀÇ?È"):                                                      # des lettres à la dérive
        x, y = 40 + k * 22, 70 + rnd.randint(-6, 10)
        d.text((x, y), "?" if k % 2 else "#", fill=B)
    return im


def moulin_doublons():
    """Le Moulin des Doublons : une grande roue à aubes que le courant fait tourner ; à gauche, une goulotte où
    arrivent des caisses par paires ; à droite, une seule caisse de chaque sort, et les doubles tombent dans un bac."""
    im, d = toile()
    fond_poste(im, d, 43, 104)
    cx, cy, r = 88, 70, 34
    d.ellipse([cx - r, cy - r, cx + r, cy + r], outline=B, width=3)
    d.ellipse([cx - 6, cy - 6, cx + 6, cy + 6], fill=V)
    for k in range(12):
        a = k * math.pi / 6
        x1, y1 = cx + r * math.cos(a), cy + r * math.sin(a)
        d.line([(cx, cy), (x1, y1)], fill=V, width=2)
        d.rectangle([x1 - 3, y1 - 3, x1 + 3, y1 + 3], fill=B)
    d.polygon([(0, 46), (52, 58), (52, 64), (0, 52)], fill=V)                            # la goulotte d'entrée
    for k in range(3):
        caisse(d, 6 + k * 15, 36 + k * 3, 6, 6, B); caisse(d, 13 + k * 15, 37 + k * 3, 6, 6, B)
    d.polygon([(124, 64), (176, 54), (176, 60), (124, 70)], fill=V)                      # la sortie
    for k in range(3):
        caisse(d, 134 + k * 14, 50 - k * 3, 7, 7, B)
    d.rectangle([110, 108, 140, 120], fill=V); d.rectangle([112, 108, 138, 118], fill=N)  # le bac des doubles
    for k in range(4):
        caisse(d, 114 + k * 6, 110, 5, 5, V)
    return im


def vanne_formats():
    """La Vanne des Formats : un barrage de grilles aux mailles de formes différentes ; ce qui a la bonne forme passe,
    le reste reste pris dans la grille ; trois volants de vanne au-dessus."""
    im, d = toile()
    fond_poste(im, d, 45, 104)
    d.rectangle([20, 34, 156, 108], fill=N)
    for k in range(3):                                                                   # trois grilles
        x0 = 24 + k * 44
        d.rectangle([x0, 40, x0 + 40, 106], outline=B, width=2)
        for j in range(5):
            y = 46 + j * 12
            for i in range(3):
                x = x0 + 6 + i * 12
                if k == 0:
                    d.rectangle([x, y, x + 6, y + 6], outline=V)
                elif k == 1:
                    d.ellipse([x, y, x + 6, y + 6], outline=V)
                else:
                    d.polygon([(x + 3, y), (x + 6, y + 6), (x, y + 6)], outline=V)
        vanne(d, x0 + 20, 30, 7)
    for (x, y) in ((38, 70), (90, 82), (134, 58)):                                        # ce qui reste pris
        d.polygon([(x, y), (x + 6, y + 2), (x + 3, y + 7)], fill=B)
    tuyau(d, [(0, 120), (60, 118), (120, 122), (176, 118)], 4)
    return im


def ecluse_scripts():
    """L'Écluse des Scripts : deux grandes portes d'écluse en bois cerclé, un sas d'eau entre elles, des crémaillères
    et des engrenages ; un levier à ressort (le piège qui referme tout si quelque chose casse)."""
    im, d = toile()
    d.rectangle([0, 0, W, H], fill=N)
    voute_grotte(d, im, 44, graine=51)
    pierres(d, 0, 40, W, 70, 7, 14, V, graine=52)
    ombrer(im, 0, 40, W, 70, V, N, 0.8, 0.5)
    eau(d, 110, H, graine=51)
    for x0, sens in ((20, 1), (120, -1)):                                                # les portes
        d.polygon([(x0, 50), (x0 + 36, 56), (x0 + 36, 126), (x0, 120)], fill=V)
        for k in range(5):
            y = 58 + k * 13
            d.line([(x0, y), (x0 + 36, y + 6)], fill=B)
        d.line([(x0, 50), (x0, 120)], fill=B, width=2)
    trame(d, 56, 70, 120, 110, V, 0.25)                                                  # le sas
    for (x, y, r) in ((60, 34, 12), (84, 26, 8), (104, 36, 10)):                          # les engrenages
        d.ellipse([x - r, y - r, x + r, y + r], outline=B, width=2)
        for k in range(8):
            a = k * math.pi / 4
            d.rectangle([x + (r + 1) * math.cos(a) - 1, y + (r + 1) * math.sin(a) - 1, x + (r + 1) * math.cos(a) + 1, y + (r + 1) * math.sin(a) + 1], fill=B)
        d.ellipse([x - 2, y - 2, x + 2, y + 2], fill=V)
    d.line([(160, 130), (150, 96)], fill=B, width=2)                                     # le levier
    d.ellipse([146, 90, 154, 98], fill=B)
    for k in range(5):
        d.line([(156 + (k % 2) * 3, 106 + k * 4), (160 - (k % 2) * 3, 108 + k * 4)], fill=V)
    return im


def bief():
    """Le Bief des Parallèles : quatre canaux droits côte à côte qui fuient vers le fond, chacun porte sa barque
    chargée ; un grand canal se partage en quatre à l'entrée."""
    im, d = toile()
    d.rectangle([0, 0, W, H], fill=N)
    voute_grotte(d, im, 40, graine=55)
    fuite = (88, 50)
    d.polygon([(0, H), (W, H), fuite], fill=N)
    for k in range(5):                                                                   # les digues
        xb = k * 44
        d.line([(xb, H), fuite], fill=B, width=2)
    for k in range(4):                                                                   # l'eau des canaux
        x0, x1 = k * 44 + 4, k * 44 + 40
        for j in range(14):
            f = j / 14
            y = 168 - f * 110
            xa = x0 + (fuite[0] - x0) * f
            xb2 = x1 + (fuite[0] - x1) * f
            if j % 2:
                d.line([(xa + 2, y), (xb2 - 2, y)], fill=V)
        f = 0.25 + 0.1 * k                                                               # la barque
        y = 168 - f * 110
        xa = x0 + (fuite[0] - x0) * f
        xb2 = x1 + (fuite[0] - x1) * f
        w = (xb2 - xa) * 0.6
        cxb = (xa + xb2) / 2
        d.polygon([(cxb - w / 2, y - 4), (cxb + w / 2, y - 4), (cxb + w / 3, y), (cxb - w / 3, y)], fill=B)
        caisse(d, cxb - w / 5, y - 4 - w / 4, w / 2.5, w / 4, V)
    halo(d, 88, 46, 30, V, 0.5)
    quai(d, 156, 0, W, 10, graine=56)
    return im


def tour_garde():
    """La Tour de Garde : une tour de pierre au bord de l'eau, un grand cadran aux aiguilles, une cloche sous l'auvent
    qui sonne aux heures dites (cron), une lanterne de veille en haut."""
    im, d = toile()
    d.rectangle([0, 0, W, H], fill=N)
    voute_grotte(d, im, 50, graine=57)
    eau(d, 120, H, graine=57, reflet=88, larg=10)
    d.rectangle([62, 26, 114, 128], fill=V)
    pierres(d, 64, 28, 112, 126, 7, 12, V, graine=58)
    d.polygon([(56, 28), (120, 28), (88, 4)], fill=N); d.line([(56, 28), (88, 4), (120, 28)], fill=B)
    lanterne(d, 88, 2, 0.7, True)
    d.ellipse([70, 36, 106, 72], fill=B); d.ellipse([73, 39, 103, 69], fill=N)          # le cadran
    for k in range(12):
        a = k * math.pi / 6
        d.point((88 + 13 * math.cos(a), 54 + 13 * math.sin(a)), fill=B)
    d.line([(88, 54), (88, 43)], fill=B, width=2); d.line([(88, 54), (97, 58)], fill=B)
    d.rectangle([74, 80, 102, 110], fill=N)                                              # l'auvent et la cloche
    d.polygon([(70, 80), (106, 80), (88, 74)], fill=B)
    d.polygon([(80, 102), (96, 102), (93, 86), (83, 86)], fill=B)
    d.ellipse([86, 102, 90, 106], fill=V)
    for k in range(3):
        d.arc([60 - k * 6, 82 - k * 6, 116 + k * 6, 112 + k * 6], 200, 340, fill=V)
    quai(d, 128, 30, 146, 8, graine=59, bord=True)
    return im


def fosse():
    """La Fosse du Disque : un puits rond et profond, vu d'en haut, empli jusqu'au bord de caisses entassées ; une
    jauge peinte sur la margelle montre le niveau tout près du rouge ; une échelle descend."""
    im, d = toile()
    d.rectangle([0, 0, W, H], fill=N)
    pierres(d, 0, 0, W, H, 8, 16, V, graine=61)
    ombrer(im, 0, 0, W, H, V, N, 0.6, 0.6)
    cx, cy = 88, 92
    for k in range(6):                                                                   # les anneaux du puits
        r = 70 - k * 10
        d.ellipse([cx - r, cy - r * 0.62, cx + r, cy + r * 0.62], fill=V if k == 0 else N)
        d.ellipse([cx - r, cy - r * 0.62, cx + r, cy + r * 0.62], outline=B if k == 0 else V)
    rnd = random.Random(62)
    for _ in range(26):                                                                  # les caisses entassées
        a, rr = rnd.random() * 2 * math.pi, rnd.random() * 42
        x, y = cx + rr * math.cos(a), cy + rr * 0.6 * math.sin(a)
        caisse(d, x - 5, y - 4, 10, 7, B if rnd.random() < 0.5 else V)
    for k in range(10):                                                                  # la jauge
        y = 26 + k * 6
        d.rectangle([150, y, 160, y + 4], fill=B if k > 1 else V)
    d.rectangle([148, 24, 162, 88], outline=B)
    d.polygon([(144, 30), (148, 33), (144, 36)], fill=B)
    for k in range(8):                                                                   # l'échelle
        d.line([(30 + k * 2, 70 + k * 6), (40 + k * 2, 70 + k * 6)], fill=B)
    d.line([(30, 70), (44, 116)], fill=B); d.line([(40, 70), (54, 116)], fill=B)
    return im


def chambre_pressions():
    """La Chambre des Pressions : un mur de tuyaux qui se croisent, des manomètres dont les aiguilles sont dans le
    rouge, de la vapeur qui fuse d'un joint, et un grand volant pour relâcher la pression."""
    im, d = toile()
    d.rectangle([0, 0, W, H], fill=N)
    pierres(d, 0, 0, W, 120, 8, 16, V, graine=65)
    ombrer(im, 0, 0, W, 120, V, N, 0.9, 0.6)
    for y in (24, 52, 82):
        tuyau(d, [(0, y), (W, y + 2)], 6, V)
    for x in (30, 76, 130):
        tuyau(d, [(x, 0), (x, 120)], 5, V)
    for (x, y, a) in ((52, 38, 0.92), (104, 38, 0.6), (152, 66, 0.98), (52, 98, 0.4)):
        manometre(d, x, y, 9, a)
    for k in range(6):                                                                   # la vapeur
        halo(d, 98 + k * 6, 76 - k * 7, 6 + k * 2, B, 0.45)
    sol = 120
    d.rectangle([0, sol, W, H], fill=N)
    trame(d, 0, sol, W, H, V, 0.3)
    vanne(d, 140, 136, 14)
    d.rectangle([138, 150, 142, 168], fill=V)
    return im


def coffre():
    """Le Coffre des Secrets : un coffre-fort de fer posé au fond de l'eau, une grosse serrure à molette, des chaînes
    et un cadenas ; des bulles montent ; des feuillets scellés à l'intérieur, entrevus."""
    im, d = toile()
    d.rectangle([0, 0, W, H], fill=N)
    degrade(d, 0, 0, W, H, V, 0.35, 0.05)
    for k in range(9):                                                                   # les rayons de lumière dans l'eau
        faisceau(d, 20 + k * 18, 0, 10 + k * 20, 120, 4, 0.12, B)
    d.rectangle([0, 140, W, H], fill=N)
    rnd = random.Random(66)
    for _ in range(60):
        x, y = rnd.randint(0, 175), rnd.randint(142, 169)
        d.point((x, y), fill=V)
    d.rectangle([44, 64, 132, 140], fill=B)                                              # le coffre
    d.rectangle([48, 68, 128, 136], fill=V)
    d.rectangle([52, 72, 124, 132], outline=N)
    d.ellipse([74, 86, 102, 114], fill=B); d.ellipse([78, 90, 98, 110], fill=N)          # la molette
    for k in range(8):
        a = k * math.pi / 4
        d.point((88 + 8 * math.cos(a), 100 + 8 * math.sin(a)), fill=B)
    d.line([(88, 100), (94, 94)], fill=B)
    for x in (56, 116):                                                                  # les gonds
        d.rectangle([x, 76, x + 4, 84], fill=B); d.rectangle([x, 120, x + 4, 128], fill=B)
    for k in range(10):                                                                  # la chaîne en croix
        d.ellipse([40 + k * 10, 60 + k * 8, 46 + k * 10, 64 + k * 8], outline=N)
    d.rectangle([110, 120, 124, 132], fill=B); d.arc([111, 112, 123, 126], 180, 360, fill=B, width=2)  # le cadenas
    d.rectangle([116, 125, 118, 128], fill=N)
    for k in range(7):                                                                   # les bulles
        x, y = 140 + (k % 3) * 6, 120 - k * 14
        d.ellipse([x - 2, y - 2, x + 2, y + 2], outline=B)
    return im


def chantier_images():
    """Le Chantier des Images : une cale sèche creusée dans la roche, vidée de son eau ; au fond, des conteneurs en
    construction, empilés par couches ; une grue de bois ; un plan déroulé sur une table."""
    im, d = toile()
    d.rectangle([0, 0, W, H], fill=N)
    voute_grotte(d, im, 40, graine=71)
    d.polygon([(0, 70), (176, 70), (150, 150), (26, 150)], fill=N)                       # la cale
    pierres(d, 0, 70, 30, 150, 7, 10, V, graine=72)
    pierres(d, 146, 70, W, 150, 7, 10, V, graine=73)
    for k in range(5):
        d.line([(30 + k * 2, 80 + k * 14), (146 - k * 2, 80 + k * 14)], fill=V)
    for j, (x, y) in enumerate(((52, 120), (84, 120), (68, 104), (100, 104))):            # les conteneurs, en couches
        conteneur3d(im, d, x, y, 28, 12, 5, V if j % 2 else B, True)
    d.line([(150, 150), (150, 40)], fill=B, width=3)                                     # la grue de bois
    d.line([(150, 44), (96, 44)], fill=B, width=2)
    d.line([(150, 70), (126, 44)], fill=B)
    d.line([(104, 44), (104, 90)], fill=V)
    caisse(d, 98, 90, 12, 8, B)
    d.rectangle([4, 150, 60, 156], fill=B)                                               # la table et le plan
    d.polygon([(8, 146), (54, 146), (56, 150), (6, 150)], fill=V)
    for k in range(3):
        d.line([(12, 147 + k), (48 - k * 8, 147 + k)], fill=N)
    lanterne(d, 30, 50, 0.8, True)
    return im


def citerne():
    """La Citerne : une grande cuve de pierre ronde, cerclée de fer, des tuyaux qui y entrent et en sortent ; dans
    sa paroi, des tiroirs numérotés comme des rangées de table ; un robinet de vidange et un seau (la sauvegarde)."""
    im, d = toile()
    fond_poste(im, d, 75, 110, eau_=False)
    halo(d, 88, 70, 64, V, 0.45, 50)
    d.rectangle([40, 30, 136, 120], fill=V)                                              # la cuve
    d.ellipse([40, 20, 136, 40], fill=B); d.ellipse([44, 22, 132, 38], fill=N)
    trame(d, 46, 24, 130, 36, V, 0.45)
    d.ellipse([40, 110, 136, 130], fill=V)
    for y in (48, 78, 104):
        d.line([(40, y), (136, y)], fill=B, width=2)
    for r in range(3):                                                                   # les rangées
        for c_ in range(5):
            x, y = 50 + c_ * 16, 54 + r * 12
            d.rectangle([x, y, x + 12, y + 8], fill=N)
            d.line([(x + 3, y + 4), (x + 9, y + 4)], fill=B)
    tuyau(d, [(0, 40), (24, 40), (40, 46)], 5)
    tuyau(d, [(176, 60), (150, 60), (136, 66)], 5)
    d.rectangle([126, 108, 146, 112], fill=B)                                            # le robinet
    d.line([(146, 110), (146, 116)], fill=B)
    d.polygon([(140, 120), (154, 120), (152, 134), (142, 134)], fill=B)                  # le seau
    d.arc([140, 114, 154, 126], 180, 360, fill=V)
    return im


def grand_bassin():
    """Le Grand Bassin : un bassin rectangulaire d'eau calme ; quatre conteneurs posés sur des pontons, reliés entre
    eux par des tuyaux ; chacun porte sa lanterne de santé, allumée."""
    im, d = toile()
    d.rectangle([0, 0, W, H], fill=N)
    voute_grotte(d, im, 40, graine=81)
    d.polygon([(10, 60), (166, 60), (176, 150), (0, 150)], fill=N)                       # le bassin
    d.line([(10, 60), (0, 150)], fill=B, width=2); d.line([(166, 60), (176, 150)], fill=B, width=2)
    d.line([(10, 60), (166, 60)], fill=B, width=2)
    eau(d, 62, 150, graine=81, dense=0.9)
    d.line([(0, 150), (176, 150)], fill=B, width=2)
    pos = [(30, 78), (110, 78), (26, 116), (116, 116)]
    for k, (x, y) in enumerate(pos):
        d.rectangle([x - 4, y + 13, x + 38, y + 17], fill=V)                             # le ponton
        conteneur3d(im, d, x, y, 30, 13, 6, B if k % 2 else V, True)
        lanterne(d, x + 15, y - 12, 0.6, True)
    tuyau(d, [(64, 86), (88, 92), (110, 86)], 3)
    tuyau(d, [(44, 92), (40, 106), (42, 116)], 3)
    tuyau(d, [(130, 92), (134, 106), (130, 116)], 3)
    tuyau(d, [(60, 124), (88, 130), (116, 124)], 3)
    d.rectangle([0, 150, W, H], fill=N)
    trame(d, 0, 150, W, H, V, 0.3)
    return im


# ------------------------------------------------------------------
# Les nuits, les rangs, Pipelinus, la jauge, la cinématique
# ------------------------------------------------------------------

def nuit(n):
    """Une nuit au bord du lac : la recrue assise de dos sur le quai, une seule lanterne ; (2) des rides concentriques
    et un bras qui affleure ; (3) l'œil de Pipelinus, ouvert sous l'eau, qui regarde le quai."""
    im, d = toile()
    d.rectangle([0, 0, W, H], fill=N)
    voute_grotte(d, im, 50, graine=90 + n)
    eau(d, 70, 140, graine=90 + n, reflet=128, larg=7)
    brume(d, 76, 6, 0.2 + 0.08 * n, B, 90 + n)
    lanterne(d, 128, 50, 1.0, True)
    if n >= 2:
        for k in range(4):
            r = 8 + k * 9
            d.arc([60 - r, 100 - r * 0.25, 60 + r, 100 + r * 0.25], 0, 360, fill=V)
        tentacule(d, [(30, 112), (36, 96), (48, 92), (52, 100)], 5, 1, V, ventouses=True, tuyau_=False)
    if n == 3:
        halo(d, 66, 108, 44, V, 0.6, 18)
        oeil(d, 66, 108, 18, 1.0, B, V)
        for k in range(3):
            tentacule(d, [(100 + k * 20, 140), (104 + k * 20, 116), (114 + k * 18, 110), (118 + k * 16, 120)], 4, 1, V, True, False)
    quai(d, 140, 0, W, 10, graine=95)
    d.rectangle([0, 150, W, H], fill=N)
    x, y = 140, 146                                                                      # la recrue, de dos
    d.ellipse([x - 6, y - 32, x + 6, y - 20], fill=B)
    d.polygon([(x - 12, y), (x + 12, y), (x + 9, y - 20), (x - 9, y - 20)], fill=V)
    d.line([(x - 9, y - 20), (x - 12, y)], fill=B)
    return im


NOMS_RANGS = {1: "PECHEUR", 2: "PLONGEUR", 3: "ECLUSIER", 4: "SONDEUR DES ABYSSES", 5: "MAÎTRE DU LAC"}


def emblemes_rang(d, n, cx, cy):
    """L'emblème du rang au centre du médaillon."""
    if n == 1:                                                                            # le filet
        for k in range(-3, 4):
            d.line([(cx + k * 7 - 10, cy - 22), (cx + k * 7 + 10, cy + 22)], fill=V)
            d.line([(cx + k * 7 + 10, cy - 22), (cx + k * 7 - 10, cy + 22)], fill=V)
        d.ellipse([cx - 26, cy - 26, cx + 26, cy + 26], outline=N, width=6)
        poisson(d, cx, cy, 1.4, B)
    elif n == 2:                                                                          # le casque de plongée
        d.ellipse([cx - 20, cy - 22, cx + 20, cy + 18], fill=B)
        d.ellipse([cx - 11, cy - 12, cx + 11, cy + 8], fill=N)
        d.ellipse([cx - 8, cy - 9, cx + 8, cy + 5], fill=V)
        trame(d, cx - 8, cy - 9, cx + 8, cy + 5, N, 0.3)
        d.rectangle([cx - 22, cy + 16, cx + 22, cy + 22], fill=V)
        for x in (cx - 20, cx + 20):
            d.ellipse([x - 3, cy - 4, x + 3, cy + 2], fill=V)
    elif n == 3:                                                                          # la clé de vanne
        vanne(d, cx, cy - 8, 14)
        d.line([(cx, cy + 6), (cx, cy + 26)], fill=B, width=3)
        d.rectangle([cx - 6, cy + 22, cx + 6, cy + 26], fill=B)
    elif n == 4:                                                                          # la sonde lestée
        d.line([(cx, cy - 30), (cx, cy + 6)], fill=B)
        for k in range(6):
            d.point((cx + 2, cy - 26 + k * 6), fill=V)
        d.polygon([(cx - 8, cy + 6), (cx + 8, cy + 6), (cx + 4, cy + 26), (cx - 4, cy + 26)], fill=B)
        d.line([(cx - 8, cy + 12), (cx + 8, cy + 12)], fill=V)
        for k in range(3):
            d.arc([cx - 14 - k * 6, cy + 20 - k * 2, cx + 14 + k * 6, cy + 30 + k * 2], 200, 340, fill=V)
    else:                                                                                 # le trident et la couronne d'eau
        d.line([(cx, cy - 24), (cx, cy + 28)], fill=B, width=3)
        for sx in (-1, 0, 1):
            x = cx + sx * 10
            d.line([(x, cy - 10), (x, cy - 26)], fill=B, width=2)
            d.polygon([(x - 3, cy - 24), (x + 3, cy - 24), (x, cy - 30)], fill=B)
        d.arc([cx - 12, cy - 18, cx + 12, cy - 2], 0, 180, fill=B, width=2)
        for k in range(9):
            a = math.pi * (1.1 + 0.8 * k / 8)
            x, y = cx + 34 * math.cos(a), cy + 2 + 34 * math.sin(a)
            d.polygon([(x - 2, y + 3), (x + 2, y + 3), (x, y - 4)], fill=V)


def rang(n):
    """La montée de rang : un médaillon sur des rayons tramés, l'emblème du rang, une banderole à son nom ; en bas, le
    lac et la Rive."""
    im, d = toile()
    d.rectangle([0, 0, W, H], fill=N)
    voute_grotte(d, im, 40, graine=100 + n)
    eau(d, 124, H, graine=100 + n, reflet=88, larg=14)
    quai(d, 150, 0, W, 10, graine=101)
    cx, cy = 88, 56
    for k in range(18):
        if k % 2:
            continue
        a0, a1 = k * math.pi / 9, (k + 1) * math.pi / 9
        for rr in range(30, 120, 2):
            for a in (a0 + (a1 - a0) * j / 8 for j in range(9)):
                px, py = cx + rr * math.cos(a), cy + rr * math.sin(a)
                if 0 <= px < W and 0 <= py < 118 and BAYER[int(py) % 4][int(px) % 4] < 6:
                    d.point((px, py), fill=B if n >= 4 else V)
    d.ellipse([cx - 40, cy - 40, cx + 40, cy + 40], fill=N)
    d.ellipse([cx - 40, cy - 40, cx + 40, cy + 40], outline=B, width=2)
    d.ellipse([cx - 36, cy - 36, cx + 36, cy + 36], outline=V)
    emblemes_rang(d, n, cx, cy)
    for k in range(n):
        x = cx + (k - (n - 1) / 2) * 8
        d.ellipse([x - 2, cy + 31, x + 2, cy + 35], fill=B)
    nom = NOMS_RANGS[n]
    larg = int(sum(d.textlength('I' if ch == 'Î' else ch) for ch in nom)) + 12
    by = 102
    d.polygon([(cx - larg // 2 - 12, by + 2), (cx - larg // 2, by + 2), (cx - larg // 2, by + 14), (cx - larg // 2 - 12, by + 14), (cx - larg // 2 - 7, by + 8)], fill=V)
    d.polygon([(cx + larg // 2 + 12, by + 2), (cx + larg // 2, by + 2), (cx + larg // 2, by + 14), (cx + larg // 2 + 12, by + 14), (cx + larg // 2 + 7, by + 8)], fill=V)
    d.rectangle([cx - larg // 2, by, cx + larg // 2, by + 12], fill=B)
    d.line([(cx - larg // 2, by + 12), (cx + larg // 2, by + 12)], fill=V)
    texte_maj(d, cx - larg // 2 + 6, by + 1, nom, N)
    return im


def portrait_pipelinus():
    """Pipelinus, en portrait : le manteau, l'œil immense, les huit bras-tuyaux déployés en couronne autour de lui,
    dans l'eau noire."""
    im, d = toile()
    d.rectangle([0, 0, W, H], fill=N)
    degrade(d, 0, 0, W, H, V, 0.25, 0.0)
    cx, cy = 88, 70
    bras = []
    for k in range(8):
        a = math.pi * (0.1 + 0.8 * k / 7)
        dx, dy = math.cos(a), math.sin(a)
        p0 = (cx + 14 * dx, cy + 12 + 6 * dy)
        p1 = (cx + 50 * dx, cy + 30 + 40 * dy)
        p2 = (cx + 76 * dx + (8 if k % 2 else -8), cy + 30 + 70 * dy)
        p3 = (cx + 84 * dx, cy + 10 + 92 * dy)
        bras.append([p0, p1, p2, p3])
    pipelinus(d, im, cx, cy, 1.25, bras, 1.0, halo_=True)
    for k in range(10):
        x, y = 12 + (k * 41) % 152, 10 + (k * 17) % 40
        d.ellipse([x - 1, y - 1, x + 1, y + 1], outline=B)
    return im


def objet_jauge():
    """La jauge de clarté : un grand tube de verre gradué de 0 à 100, monté sur un cadre de fonte, l'eau qui y monte
    plus claire vers le haut ; un flotteur ; un robinet."""
    im, d = toile()
    d.rectangle([0, 0, W, H], fill=N)
    pierres(d, 0, 0, W, 136, 9, 18, V, graine=110)
    ombrer(im, 0, 0, W, 136, V, N, 0.9, 0.5)
    d.rectangle([0, 136, W, H], fill=N); trame(d, 0, 136, W, H, V, 0.25)
    halo(d, 88, 76, 56, V, 0.5, 64)
    d.rectangle([70, 12, 106, 140], fill=B)                                              # le cadre
    d.rectangle([76, 18, 100, 134], fill=N)
    niveau = 70
    for y in range(niveau, 134):                                                          # l'eau, plus claire en haut
        f = (y - niveau) / (134 - niveau)
        for x in range(77, 100):
            if BAYER[y % 4][x % 4] < (1 - f * 0.7) * 16:
                d.point((x, y), fill=V)
    d.rectangle([77, niveau - 3, 99, niveau], fill=B)                                     # le flotteur
    for k in range(11):                                                                  # les graduations
        y = 132 - k * 11
        d.line([(100, y), (106 if k % 5 == 0 else 103, y)], fill=B)
        if k % 5 == 0:
            texte_maj(d, 110, y - 4, str(k * 10), B)
    d.rectangle([60, 140, 116, 146], fill=B)
    d.rectangle([60, 120, 70, 126], fill=B); vanne(d, 56, 123, 6)
    return im


def cine_sceau_demain():
    """Un sceau de cire, gros plan, au bas d'une page ; à côté, la date frappée : DEMAIN ; les initiales P.G."""
    im, d = toile()
    d.rectangle([0, 0, W, H], fill=N)
    d.polygon([(10, 20), (166, 12), (170, 160), (6, 166)], fill=B)
    for k in range(6):
        y = 30 + k * 10
        d.line([(22, y), (150 - (k * 19) % 40, y - 1)], fill=N)
    halo(d, 64, 122, 30, V, 0.35, 22)
    sceau_cire(d, 64, 122, 22, V, 'pg')
    d.rectangle([98, 110, 160, 132], fill=N)
    texte_maj(d, 104, 112, "DEMAIN", B)
    d.line([(100, 126), (156, 126)], fill=V)
    for k in range(4):                                                                   # une goutte d'encre verte qui coule
        d.line([(64 + k, 144), (64 + k, 150 + k * 2)], fill=V)
    return im


def cine_escalier_lac():
    """Sous la Chronothèque, derrière une porte en ogive, un escalier de pierre qui descend en spirale et s'enfonce
    dans une eau noire ; une lueur verte monte d'en bas."""
    im, d = toile()
    d.rectangle([0, 0, W, H], fill=N)
    pierres(d, 0, 0, W, H, 8, 16, V, graine=120)
    ombrer(im, 0, 0, W, H, V, N, 0.95, 0.75)
    porte_ogive(d, 50, 4, 76, 92, B, N, ouverte=True)
    halo(d, 88, 150, 70, V, 0.75, 40)
    for k in range(10):                                                                  # les marches qui descendent
        y = 86 + k * 7
        l = 30 - k * 1.5
        x = 88 + 14 * math.sin(k * 0.5)
        d.polygon([(x - l, y), (x + l, y), (x + l - 3, y + 5), (x - l + 3, y + 5)], fill=V)
        d.line([(x - l, y), (x + l, y)], fill=B)
    eau(d, 150, H, graine=121, c=V, reflet=88, larg=10)
    return im


def cine_lac():
    """Le lac immense, vu du haut de l'escalier : une étendue d'eau noire qui se perd sous la voûte, des quais
    minuscules, des lanternes comme des étoiles, des tuyaux qui courent sur les parois."""
    im, d = toile()
    d.rectangle([0, 0, W, H], fill=N)
    voute_grotte(d, im, 70, graine=130)
    horizon = 78
    degrade(d, 0, 44, W, horizon, V, 0.0, 0.35)
    eau(d, horizon, H, graine=130, reflet=88, larg=4, dense=1.5)
    for k in range(14):
        x = 8 + k * 12
        d.point((x, horizon - 1 - (k % 3)), fill=B)
    tuyau(d, [(0, 30), (40, 40), (60, 60), (70, horizon)], 3, V)
    tuyau(d, [(176, 26), (140, 44), (120, 64), (112, horizon)], 3, V)
    brume(d, horizon + 10, 6, 0.3, B, 131)
    silhouette(d, 30, 168, 22, B)
    return im


def cine_oeil():
    """Sous la surface, dans le noir, un œil immense s'ouvre ; des rides partent de lui ; la surface tremble."""
    im, d = toile()
    d.rectangle([0, 0, W, H], fill=N)
    degrade(d, 0, 0, W, 50, V, 0.25, 0.0)
    d.line([(0, 50), (W, 50)], fill=V)
    for k in range(5):
        r = 30 + k * 18
        d.arc([88 - r, 50 - r * 0.15, 88 + r, 50 + r * 0.15], 0, 360, fill=B if k % 2 else V)
    halo(d, 88, 110, 76, V, 0.6, 46)
    oeil(d, 88, 110, 54, 0.9, B, V)
    return im


def cine_bras():
    """Huit bras-tuyaux qui montent des profondeurs vers la surface, leurs ventouses et leurs brides luisant dans le
    noir ; tout en haut, les quais de l'école."""
    im, d = toile()
    d.rectangle([0, 0, W, H], fill=N)
    quai(d, 10, 0, W, 10, graine=140)
    lanterne(d, 30, 24, 0.6, True); lanterne(d, 146, 24, 0.6, True)
    degrade(d, 0, 20, W, H, V, 0.0, 0.35)
    for k in range(8):
        x0 = 10 + k * 22
        tentacule(d, [(x0 + 8, H + 4), (x0 - 10 + (k % 3) * 8, 120), (x0 + 16, 70), (x0 + 4 - (k % 2) * 8, 26 + (k % 3) * 6)],
                  8, 2, B if k % 2 else V, True, True)
    return im


def cine_wissam():
    """Wissam sur le quai, une lanterne levée à la main, de dos face au lac ; sa lumière trace un chemin sur l'eau."""
    im, d = toile()
    d.rectangle([0, 0, W, H], fill=N)
    voute_grotte(d, im, 56, graine=150)
    eau(d, 80, 140, graine=150, reflet=108, larg=12)
    brume(d, 86, 6, 0.25, B, 151)
    quai(d, 140, 0, W, 12, graine=152)
    d.rectangle([0, 152, W, H], fill=N)
    x, y = 88, 140                                                                        # Wissam, de dos
    halo(d, 108, 86, 30, V, 0.65)
    d.ellipse([x - 7, y - 58, x + 7, y - 44], fill=B)
    d.polygon([(x - 14, y), (x + 14, y), (x + 11, y - 44), (x - 11, y - 44)], fill=V)
    d.line([(x - 11, y - 44), (x - 14, y)], fill=B)
    d.line([(x + 10, y - 40), (x + 20, y - 54)], fill=V, width=3)                         # le bras levé
    lanterne(d, 108, 76, 1.0, True)
    d.line([(108, 68), (x + 20, y - 54)], fill=B)
    return im


def sceau_lac(nom="item_sceau_lac.gif"):
    """La dixième enveloppe : un pli mouillé, scellé de cire verte frappée d'une pieuvre ; une goutte d'eau
    en coule, et une page couverte de chiffres dépasse (un relevé du lac)."""
    w, h = 60, 42
    im = Image.new('P', (w, h), N); im.putpalette(PAL); d = ImageDraw.Draw(im)
    d.rectangle([2, 6, 57, 39], fill=B)
    d.rectangle([34, 1, 54, 14], fill=V)
    d.rectangle([36, 3, 52, 12], fill=N)
    for k in range(3):
        for j in range(4):
            d.point((38 + j * 4, 5 + k * 3), fill=V); d.point((39 + j * 4, 5 + k * 3), fill=V)
    d.line([(2, 6), (29, 25), (57, 6)], fill=N, width=2)
    d.line([(2, 39), (22, 22)], fill=N); d.line([(57, 39), (37, 22)], fill=N)
    for x in range(2, 58, 6):
        d.line([(x, 35), (x + 3, 34)], fill=V)
    d.ellipse([20, 14, 39, 33], fill=V)
    d.ellipse([22, 16, 37, 31], outline=N)
    d.ellipse([26, 18, 33, 24], fill=N)
    for k in range(4):
        x = 26 + k * 2
        d.line([(x, 24), (x - 1 + (k % 2) * 2, 29)], fill=N)
    d.line([(29, 34), (29, 38)], fill=V); d.point((29, 39), fill=B)
    im.resize((w * 2, h * 2), Image.NEAREST).save(OUT + nom)


def ponton_echos():
    """Le Ponton des Échos : un ponton de bois noirci qui s'avance loin sur l'eau calme, une lanterne au bout ; sur
    l'eau, sept reflets en arc de cercle, sept silhouettes pâles tête en bas, chacune dans son halo : les sept
    chapitres qui remontent du lac."""
    im, d = toile()
    d.rectangle([0, 0, W, H], fill=N)
    voute_grotte(d, im, 50, graine=71)
    horizon = 56
    degrade(d, 0, 30, W, horizon, V, 0.0, 0.25)
    eau(d, horizon, H, graine=71, reflet=None, larg=6, dense=0.6)
    brume(d, horizon + 4, 6, 0.25, B, 71)
    # les sept reflets, en arc au-dessus de l'eau calme
    for k in range(7):
        a = math.pi * (0.12 + 0.76 * k / 6)
        x = int(88 - 74 * math.cos(a))
        y = int(100 - 34 * math.sin(a))
        halo(d, x, y, 11, V, 0.55, 8)
        h = 13 - abs(k - 3)
        d.rectangle([x - 2, y + h - 4, x + 2, y + h], fill=B)                              # la tête, en bas
        d.polygon([(x - 4, y + h - 5), (x + 4, y + h - 5), (x + 3, y - 2), (x - 3, y - 2)], fill=B)
        for t in range(0, 5):
            d.point((x - 4 + 2 * t, y - 4 - (t % 2)), fill=V)                              # les rides
    # le ponton, en perspective, du bas de l'image jusqu'au milieu de l'eau
    for i in range(12):
        y0 = H - i * 6
        l0 = 34 - i * 1.6
        d.rectangle([88 - l0, y0 - 5, 88 + l0, y0 - 1], fill=V)
        d.line([(88 - l0, y0 - 5), (88 + l0, y0 - 5)], fill=B)
    for sgn in (-1, 1):
        for i in range(0, 12, 3):
            y0 = H - i * 6
            l0 = 34 - i * 1.6
            d.rectangle([88 + sgn * l0 - 1, y0 - 1, 88 + sgn * l0 + 1, y0 + 5], fill=N)
    # au bout, une silhouette penchée sur l'eau, et la lanterne
    silhouette(d, 92, 104, 15, B)
    lanterne(d, 80, 88, 0.8, True)
    return im


LIEUX = {
    "loc_lac.gif": lambda: lac(False), "loc_lac_victoire.gif": victoire, "loc_lac_dossier.gif": dossier_lac,
    "loc_lac_machine.gif": machine_lac, "loc_maree.gif": maree,
    "loc_greve.gif": greve, "loc_banc_tri.gif": banc_tri, "loc_comptoir_mesures.gif": comptoir_mesures,
    "loc_gue_encres.gif": gue_encres, "loc_moulin_doublons.gif": moulin_doublons, "loc_vanne_formats.gif": vanne_formats,
    "loc_ecluse_scripts.gif": ecluse_scripts, "loc_bief.gif": bief, "loc_tour_de_garde.gif": tour_garde,
    "loc_fosse.gif": fosse, "loc_chambre_pressions.gif": chambre_pressions, "loc_coffre_secrets.gif": coffre,
    "loc_chantier_images.gif": chantier_images, "loc_ponton_echos.gif": ponton_echos, "loc_citerne.gif": citerne, "loc_grand_bassin.gif": grand_bassin,
    "rang_pecheur.gif": lambda: rang(1), "rang_plongeur.gif": lambda: rang(2), "rang_eclusier.gif": lambda: rang(3),
    "rang_sondeur.gif": lambda: rang(4), "rang_maitre_lac.gif": lambda: rang(5),
    "scene_lac_nuit1.gif": lambda: nuit(1), "scene_lac_nuit2.gif": lambda: nuit(2), "scene_lac_nuit3.gif": lambda: nuit(3),
    "item_pipelinus.gif": portrait_pipelinus, "item_jauge.gif": objet_jauge,
    "cine10_sceau_demain.gif": cine_sceau_demain, "cine10_escalier_lac.gif": cine_escalier_lac, "cine10_lac.gif": cine_lac,
    "cine10_oeil.gif": cine_oeil, "cine10_bras.gif": cine_bras, "cine10_wissam.gif": cine_wissam,
}

if __name__ == "__main__":
    noms = sys.argv[1:] or list(LIEUX) + ["item_sceau_lac.gif"]
    n = 0
    for nom in noms:
        if nom in LIEUX:
            finir(nom, LIEUX[nom]()); n += 1
        elif nom == "item_sceau_lac.gif":
            sceau_lac(nom); n += 1
    print(n, "dessins")
