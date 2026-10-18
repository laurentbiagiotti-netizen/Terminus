"""Redessine les lieux des chapitres 2 et 3 (la panne, la Crypte et le réseau de l'école), la WarRoom à part
(dessiner_warroom.py), dans le style poussé du chapitre 8 (dessiner_port.py) : pixel art 1 bit (noir, vert, blanc),
des pièces en perspective au sol carrelé, des volumes éclairés d'un côté et ombrés de l'autre, des liserés de lumière,
et des dégradés tramés réservés au ciel, aux halos des lampes et des écrans. Décor de royaume (tours, donjon, volière,
oracle...) pour les machines, le bâtiment B et l'Annexe tels qu'ils sont.

Même cadre et même taille que les images d'origine (dessiner_lieux.finir). Usage : python3 outils/dessiner_fantasy.py [nom...]
(OUT=dossier pour un aperçu ailleurs)
"""
import os, sys, random, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from dessiner_lieux import toile, finir, N, V, B, W, H, texte_centre  # noqa: E402
from PIL import ImageDraw  # noqa: E402


# ------------------------------------------------------------------
# La lumière en trois couleurs : trames ordonnées (comme dessiner_port.py)
# ------------------------------------------------------------------

BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]


def trame(d, x0, y0, x1, y1, c, t):
    """Une trame ordonnée de densité constante t (0 : rien, 1 : plein)."""
    seuil = t * 16
    for y in range(max(0, int(y0)), min(H, int(y1) + 1)):
        for x in range(max(0, int(x0)), min(W, int(x1) + 1)):
            if BAYER[y % 4][x % 4] < seuil:
                d.point((x, y), fill=c)


def degrade(d, x0, y0, x1, y1, c, t0, t1, sens='v'):
    """Un dégradé tramé : la densité passe de t0 à t1, de haut en bas (sens 'v') ou de gauche à droite ('h')."""
    for y in range(max(0, int(y0)), min(H, int(y1) + 1)):
        for x in range(max(0, int(x0)), min(W, int(x1) + 1)):
            f = (y - y0) / max(1, y1 - y0) if sens == 'v' else (x - x0) / max(1, x1 - x0)
            if BAYER[y % 4][x % 4] < (t0 + (t1 - t0) * f) * 16:
                d.point((x, y), fill=c)


def halo(d, cx, cy, r, c, t0=0.8, ry=None, ymin=0, ymax=H, dans=None):
    """Un halo de lumière tramé, dense au centre, qui s'éteint au bord. dans(x, y) limite où il se pose."""
    ry = ry or r
    for y in range(max(0, int(cy - ry), int(ymin)), min(H, int(cy + ry) + 1, int(ymax) + 1)):
        for x in range(max(0, int(cx - r)), min(W, int(cx + r) + 1)):
            dist = math.hypot((x - cx) / r, (y - cy) / ry)
            if dist < 1 and BAYER[y % 4][x % 4] < t0 * (1 - dist) * 16 and (dans is None or dans(x, y)):
                d.point((x, y), fill=c)


def ombrer(im, x0, y0, x1, y1, de, vers, t0, t1=None, sens='v'):
    """Ombre (ou éclaire) ce qui est déjà dessiné : seuls les pixels de couleur `de` passent, par la trame, à `vers`."""
    px = im.load()
    t1 = t0 if t1 is None else t1
    for y in range(max(0, int(y0)), min(H, int(y1) + 1)):
        for x in range(max(0, int(x0)), min(W, int(x1) + 1)):
            if px[x, y] != de:
                continue
            f = (y - y0) / max(1, y1 - y0) if sens == 'v' else (x - x0) / max(1, x1 - x0)
            if BAYER[y % 4][x % 4] < (t0 + (t1 - t0) * f) * 16:
                px[x, y] = vers


def faisceau(d, x0, y0, xa, xb, y1, t0=0.45, t1=0.05, c=B):
    """Un rayon de lumière tramé qui tombe de (x0, y0) et s'élargit jusqu'à [xa, xb] en y1, en pâlissant."""
    for y in range(int(y0), int(y1) + 1):
        f = (y - y0) / max(1, y1 - y0)
        g = x0 + (xa - x0) * f
        h = x0 + (xb - x0) * f
        for x in range(int(g), int(h) + 1):
            if 0 <= x < W and 0 <= y < H and BAYER[y % 4][x % 4] < (t0 + (t1 - t0) * f) * 16:
                d.point((x, y), fill=c)


def ciel(d, ymax, graine=3, n=26, voile=0.55, ymin=0):
    """Le ciel de nuit : des étoiles de deux tailles et un voile vert qui monte de l'horizon."""
    rnd = random.Random(graine)
    for _ in range(n):
        x, y = rnd.randint(2, W - 3), rnd.randint(ymin + 2, max(ymin + 3, ymax - 14))
        d.point((x, y), fill=B)
        if rnd.random() < 0.18:
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                d.point((x + dx, y + dy), fill=B)
    degrade(d, 0, ymax - (ymax - ymin) * 0.55, W, ymax, V, 0, voile)


def boite3d(d, x, y, w, h, p, face=B, cote=V, dessus=None, trait=N):
    """Un volume en perspective cavalière : la face, le dessus (vers le haut à droite) et le côté droit dans l'ombre."""
    dessus = face if dessus is None else dessus
    d.polygon([(x, y), (x + p, y - p), (x + w + p, y - p), (x + w, y)], fill=dessus)
    d.polygon([(x + w, y), (x + w + p, y - p), (x + w + p, y + h - p), (x + w, y + h)], fill=cote)
    d.rectangle([x, y, x + w, y + h], fill=face)
    if trait is not None:
        d.line([(x, y), (x + w, y), (x + w + p, y - p)], fill=trait)
        d.line([(x + w, y), (x + w, y + h)], fill=trait)


def neon(d, x0, x1, y, t=0.55, bas=26):
    """Un tube au plafond et le cône de lumière tramée qu'il pose dessous."""
    d.rectangle([x0, y, x1, y + 2], fill=B)
    d.line([(x0 + 2, y - 3), (x0 + 2, y)], fill=B); d.line([(x1 - 2, y - 3), (x1 - 2, y)], fill=B)
    faisceau(d, (x0 + x1) / 2, y + 3, x0 - 10, x1 + 10, y + bas, t, 0.0)


def ecran_lueur(d, x0, y0, x1, y1, r=14, c=V, t0=0.5):
    """La lueur d'un écran allumé dans le noir : un halo tramé autour du cadre."""
    cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
    halo(d, cx, cy, (x1 - x0) / 2 + r, c, t0, (y1 - y0) / 2 + r)


# ------------------------------------------------------------------
# Les briques du décor
# ------------------------------------------------------------------

def sol_carrele(d, x0, x1, y1, n=8, m=6, c=N, haut=H):
    """Le carrelage du sol : des joints qui fuient vers le mur du fond, des rangs qui s'espacent en approchant."""
    for i in range(n + 1):
        xa = x0 + (x1 - x0) * i / n
        xb = -W * 0.25 + W * 1.5 * i / n
        d.line([(xa, y1), (xb, haut)], fill=c)
    for k in range(1, m + 1):
        f = (k / m) ** 1.7
        y = y1 + (haut - y1) * f
        xa = x0 - x0 * f - W * 0.25 * f
        xb = x1 + (W - x1) * f + W * 0.25 * f
        d.line([(xa, y), (xb, y)], fill=c)


def piece(d, x0, y0, x1, y1, sol=V, mur_fond=N):
    """Une pièce en perspective, comme l'atelier du chapitre 1 : le mur du fond, le sol vert, les arêtes.
    (Gardée telle quelle : l'Académie et la Forteresse d'avant s'en servent ; les chapitres 2 et 3 prennent salle.)"""
    d.polygon([(x0, y1), (x1, y1), (W, H), (0, H)], fill=sol)
    d.rectangle([x0, y0, x1, y1], fill=mur_fond)
    for a, b in [((0, 0), (x0, y0)), ((W - 1, 0), (x1, y0)), ((0, H - 1), (x0, y1)), ((W - 1, H - 1), (x1, y1))]:
        d.line([a, b], fill=B, width=2)
    d.rectangle([x0, y0, x1, y1], outline=B, width=2)


def salle(d, x0, y0, x1, y1, sol=V, mur_fond=N, carreaux=True, ombre=True, plinthe=True):
    """Une pièce en perspective : le mur du fond, le sol carrelé qui s'assombrit au pied du mur, les arêtes,
    et la plinthe des murs de côté. Les objets se posent ensuite par-dessus."""
    d.polygon([(x0, y1), (x1, y1), (W, H), (0, H)], fill=sol)
    if carreaux and sol == V:
        sol_carrele(d, x0, x1, y1)
    if ombre and sol == V:
        degrade(d, 0, y1, W, y1 + 14, N, 0.6, 0.0)
    d.rectangle([x0, y0, x1, y1], fill=mur_fond)
    if plinthe:
        d.line([(0, H - 1 - (H - y1) * 0.18), (x0, y1 - 4)], fill=V)
        d.line([(W - 1, H - 1 - (H - y1) * 0.18), (x1, y1 - 4)], fill=V)
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


def ecran_crt(d, x, y, w, h, lignes=(), couleur=V, lueur=True):
    """Un gros moniteur cathodique : la caisse en volume (le côté dans l'ombre), l'écran creusé, un reflet,
    et la lueur verte qu'il pose autour de lui dans le noir."""
    if lueur:
        ecran_lueur(d, x, y, x + w, y + h, 12, V, 0.45)
    d.polygon([(x + w, y + 2), (x + w + 8, y + 7), (x + w + 8, y + h - 2), (x + w, y + h)], fill=V)
    d.line([(x + w + 8, y + 7), (x + w + 8, y + h - 2)], fill=B)
    d.rectangle([x, y, x + w, y + h], fill=B)
    d.rounded_rectangle([x + 4, y + 4, x + w - 4, y + h - 7], radius=3, fill=N)
    d.line([(x + 6, y + 7), (x + 6, y + 10)], fill=B); d.line([(x + 7, y + 6), (x + 10, y + 6)], fill=B)
    for k, t in enumerate(lignes):
        d.text((x + 8, y + 7 + k * 11), t, fill=couleur if k % 2 == 0 else B)
    d.rectangle([x + w - 9, y + h - 5, x + w - 7, y + h - 4], fill=V)
    d.rectangle([x + w // 2 - 6, y + h + 1, x + w // 2 + 6, y + h + 5], fill=B)
    d.line([(x + w // 2 + 4, y + h + 1), (x + w // 2 + 4, y + h + 5)], fill=V)
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


def rayon_livres(d, x0, y0, x1, y1, graine=5, vert=0.25):
    """Une rangée de livres de hauteurs inégales : des dos blancs ou verts, une nervure, parfois un livre penché."""
    rnd = random.Random(graine)
    x = x0
    while x < x1 - 3:
        lw = rnd.randint(3, 6)
        hh = rnd.randint((y1 - y0) // 2, y1 - y0)
        c = V if rnd.random() < vert else B
        if rnd.random() < 0.08 and x + hh < x1:
            d.polygon([(x, y1), (x + 2, y1), (x + hh, y1 - hh + 3), (x + hh - 3, y1 - hh)], fill=c)
            x += hh // 2 + 2
            continue
        d.rectangle([x, y1 - hh, min(x + lw - 1, x1), y1], fill=c)
        if hh > 6:
            d.line([(x, y1 - hh + 2), (min(x + lw - 1, x1), y1 - hh + 2)], fill=N)
            if lw > 4:
                d.line([(x, y1 - 3), (min(x + lw - 1, x1), y1 - 3)], fill=N)
        x += lw + 1


def bibliotheque(d, x0, y0, x1, y1, rangs=4, graine=7):
    """Une bibliothèque en bois : un cadre plein, l'ombre au fond de chaque rayon, des livres, un côté en volume."""
    d.polygon([(x1, y0), (x1 + 4, y0 - 3), (x1 + 4, y1 - 3), (x1, y1)], fill=V)
    d.rectangle([x0, y0, x1, y1], fill=B)
    d.rectangle([x0 + 3, y0 + 3, x1 - 3, y1 - 3], fill=N)
    hr = (y1 - y0 - 6) // rangs
    for k in range(rangs):
        yb = y0 + 3 + (k + 1) * hr
        rayon_livres(d, x0 + 5, yb - hr + 4, x1 - 5, yb - 1, graine + k)
        d.rectangle([x0 + 3, yb, x1 - 3, yb + 1], fill=B)
        d.line([(x0 + 3, yb + 2), (x1 - 3, yb + 2)], fill=V)


def nuage_ondes(d, x, y, n=3, c=B):
    for k in range(n):
        r = 8 + k * 7
        d.arc([x - r, y - r, x + r, y + r], 220, 320, fill=c, width=2)


# ------------------------------------------------------------------
# Chapitre 2 : la panne (le royaume du réseau)
# ------------------------------------------------------------------

def fenetre_ville(d, x0, y0, x1, y1, graine=2):
    """Une fenêtre sur la nuit de Puteaux : le ciel tramé, les tours de La Défense et leurs fenêtres allumées."""
    d.rectangle([x0, y0, x1, y1], fill=N)
    rnd = random.Random(graine)
    for _ in range(6):
        d.point((rnd.randint(x0 + 2, x1 - 2), rnd.randint(y0 + 2, y0 + (y1 - y0) // 3)), fill=B)
    degrade(d, x0, y0 + (y1 - y0) * 0.35, x1, y1, V, 0, 0.6)
    x = x0 + 1
    while x < x1 - 3:
        w = rnd.randint(5, 9); h = rnd.randint((y1 - y0) // 3, (y1 - y0) - 6)
        d.rectangle([x, y1 - h, min(x + w, x1 - 1), y1], fill=N)
        d.line([(x, y1 - h), (min(x + w, x1 - 1), y1 - h)], fill=B)
        for yy in range(y1 - h + 3, y1 - 1, 3):
            for xx in range(x + 2, min(x + w, x1 - 1) - 1, 2):
                if rnd.random() < 0.3:
                    d.point((xx, yy), fill=B if rnd.random() < 0.6 else V)
        x += w + rnd.randint(1, 3)
    d.rectangle([x0, y0, x1, y1], outline=B, width=2)
    d.line([((x0 + x1) // 2, y0), ((x0 + x1) // 2, y1)], fill=B, width=2)
    d.line([(x0, (y0 + y1) // 2), (x1, (y0 + y1) // 2)], fill=B)
    d.rectangle([x0 - 2, y1 + 1, x1 + 2, y1 + 3], fill=B)


def armoire_reseau(d, x0, y0, x1, y1, ok=False, p=6):
    """L'armoire réseau, porte ouverte : des panneaux de brassage, leurs voyants, les câbles qui pendent."""
    if ok:
        halo(d, (x0 + x1) / 2, (y0 + y1) / 2, (x1 - x0) / 2 + 22, V, 0.42, (y1 - y0) / 2 + 16)
    boite3d(d, x0, y0, x1 - x0, y1 - y0, p, face=B, cote=V, dessus=B)
    d.rectangle([x0 + 3, y0 + 3, x1 - 3, y1 - 3], fill=N)
    n = (y1 - y0 - 10) // 9
    for r in range(n):
        y = y0 + 6 + r * 9
        d.rectangle([x0 + 5, y, x1 - 5, y + 5], fill=B)
        d.line([(x0 + 5, y + 5), (x1 - 5, y + 5)], fill=V)
        for k in range((x1 - x0 - 18) // 4):
            xx = x0 + 13 + k * 4
            d.rectangle([xx, y + 2, xx + 1, y + 3], fill=N)
        allume = ok or (r * 5 + 3) % 7 < 2
        d.rectangle([x0 + 7, y + 1, x0 + 9, y + 3], fill=V if ok else (B if not allume else N))
        if allume and not ok:
            d.rectangle([x0 + 7, y + 1, x0 + 9, y + 3], fill=N); d.point((x0 + 8, y + 2), fill=B)
    # la porte ouverte, rabattue à gauche, en perspective
    d.polygon([(x0, y0), (x0 - 10, y0 + 6), (x0 - 10, y1 + 4), (x0, y1)], fill=B)
    d.polygon([(x0 - 2, y0 + 5), (x0 - 8, y0 + 9), (x0 - 8, y1), (x0 - 2, y1 - 3)], fill=N)
    for yy in range(y0 + 12, y1 - 4, 4):
        d.line([(x0 - 7, yy + 2), (x0 - 3, yy)], fill=V)
    # les câbles qui pendent en boucles
    for k, x in enumerate(range(x0 + 8, x1 - 4, 8)):
        d.arc([x - 7, y1 - 22 + (k % 2) * 4, x + 7, y1 - 2 + (k % 2) * 4], 0, 180, fill=V if k % 2 else B, width=2)


def radia_assise(d, x, y, ok=False):
    """Radia, assise par terre en tailleur, son portable allumé sur les genoux (une petite silhouette)."""
    halo(d, x + 1, y + 9, 13, V, 0.5, 9)
    d.ellipse([x - 4, y - 14, x + 4, y - 6], fill=B)                     # la tête
    for (a, b, c_, e) in [(-6, -16, 6, -12), (-6, -13, -4, -6), (4, -13, 6, -6)]:
        d.rectangle([x + a, y + b, x + c_, y + e], fill=V)                # les boucles vertes
    d.point((x - 2, y - 10), fill=N); d.point((x + 1, y - 10), fill=N)
    d.rectangle([x - 6, y - 5, x + 6, y + 6], fill=V)                    # le sweat
    d.line([(x + 6, y - 5), (x + 6, y + 6)], fill=B)                     # le liseré éclairé par l'écran
    d.polygon([(x - 12, y + 6), (x + 12, y + 6), (x + 14, y + 10), (x - 14, y + 10)], fill=B)   # les jambes croisées
    d.line([(x - 12, y + 8), (x + 12, y + 8)], fill=N)
    d.rectangle([x - 5, y + 1, x + 7, y + 5], fill=N)                    # le portable
    d.polygon([(x - 4, y + 1), (x + 6, y + 1), (x + 8, y - 6), (x - 2, y - 6)], fill=B if not ok else V)
    d.line([(x - 1, y - 4), (x + 5, y - 4)], fill=N)


def comptoir_accueil(d, x0, y0, x1, y1):
    """Le comptoir de l'accueil : un plateau en volume, des lames de bois, l'ombre portée au sol."""
    degrade(d, x0 - 2, y1 - 1, x1 + 12, y1 + 6, N, 0.7, 0.1)
    boite3d(d, x0, y0, x1 - x0, y1 - y0, 7, face=B, cote=V, dessus=B)
    d.rectangle([x0, y0, x1, y0 + 3], fill=B); d.line([(x0, y0 + 4), (x1, y0 + 4)], fill=N)
    for x in range(x0 + 9, x1 - 4, 10):
        d.line([(x, y0 + 7), (x, y1 - 3)], fill=N)
    d.line([(x0 + 1, y1 - 2), (x1 - 1, y1 - 2)], fill=N)


def batimentb(ok=False):
    """Le hall du bâtiment B : l'armoire réseau (voyants orange, ou tous verts une fois réparée), Radia assise
    devant avec son portable, le comptoir de l'accueil et son vieux Poste, la nuit de Puteaux à la fenêtre."""
    im, d = toile()
    salle(d, 30, 18, 146, 108)
    neon(d, 64, 104, 7, 0.4, 16)
    fenetre_ville(d, 38, 36, 84, 74, graine=5)
    d.rectangle([44, 22, 80, 31], fill=B); d.line([(44, 31), (80, 31)], fill=V)
    d.text((62 - d.textlength("BAT. B") / 2, 22), "BAT. B", fill=N)
    armoire_reseau(d, 100, 30, 136, 108, ok)
    radia_assise(d, 112, 126, ok)
    comptoir_accueil(d, 6, 120, 76, 160)
    ecran_crt(d, 18, 86, 38, 28, ("$_",))
    d.polygon([(22, 117), (60, 117), (64, 120), (18, 120)], fill=B)       # le clavier
    for x in range(22, 60, 3):
        d.point((x, 118), fill=N)
    return im


def posteb():
    """Le Poste de l'accueil, de près : l'écran dit tout (eth0 DOWN, et l'horloge en 2001), l'étiquette jaunie
    collée dessous, le clavier, un mug, et le câble réseau bien branché dans la prise du mur."""
    im, d = toile()
    salle(d, 22, 8, 154, 96, carreaux=False)
    halo(d, 88, 56, 84, V, 0.42, 58)
    # la caisse du moniteur, en volume
    d.polygon([(142, 16), (154, 22), (154, 92), (142, 96)], fill=V)
    d.line([(154, 22), (154, 92)], fill=B)
    d.rectangle([30, 14, 142, 98], fill=B)
    d.rounded_rectangle([38, 21, 134, 88], radius=5, fill=N)
    d.line([(41, 26), (41, 32)], fill=B); d.line([(42, 24), (48, 24)], fill=B)
    for k, (t, c) in enumerate((("$ ip link", V), ("eth0: DOWN", B), ("$ date", V), ("1 janv. 2001", B), ("$ _", V))):
        d.text((46, 26 + k * 12), t, fill=c)
    d.rectangle([100, 88, 128, 95], fill=V)                               # l'étiquette jaunie
    d.line([(103, 91), (124, 91)], fill=N)
    d.rectangle([126, 92, 128, 95], fill=N)
    d.rectangle([132, 91, 135, 93], fill=V)                               # le voyant d'alimentation
    d.rectangle([74, 98, 102, 104], fill=B); d.line([(96, 98), (96, 104)], fill=V)
    # le bureau, en perspective
    d.polygon([(0, 108), (W, 108), (W, 132), (0, 132)], fill=B)
    d.rectangle([0, 132, W, 137], fill=V); d.line([(0, 132), (W, 132)], fill=N)
    degrade(d, 0, 138, W, 150, N, 0.0, 0.0)
    d.polygon([(46, 104), (94, 104), (104, 106), (36, 106)], fill=B)     # le pied
    degrade(d, 30, 108, 150, 113, N, 0.55, 0.0)                           # l'ombre de l'écran sur le bureau
    # le clavier, en volume
    d.polygon([(30, 114), (122, 114), (130, 126), (22, 126)], fill=N)
    d.polygon([(31, 115), (121, 115), (128, 125), (24, 125)], fill=B)
    for r in range(3):
        y = 116 + r * 3
        for k in range(15):
            x = 30 - r * 2 + k * 6 + r
            d.rectangle([x, y, x + 3, y + 1], fill=N)
    d.line([(22, 126), (130, 126)], fill=V)
    # le mug fumant
    d.rectangle([140, 108, 154, 124], fill=B); d.rectangle([140, 113, 154, 116], fill=V)
    d.arc([150, 111, 160, 121], 270, 90, fill=B, width=2)
    d.line([(150, 108), (150, 124)], fill=N)
    for k, x in enumerate((144, 149)):
        d.line([(x, 104), (x + 2, 100), (x, 96), (x + 2, 92)], fill=B if k else V)
    # le câble réseau, bien branché dans la prise du mur
    d.line([(150, 70), (160, 84), (164, 100), (166, 160)], fill=V, width=3)
    d.rectangle([160, 150, 172, 162], fill=B); d.rectangle([163, 153, 169, 159], fill=N)
    d.rectangle([164, 154, 168, 158], fill=V)
    return im


def tour_messagere(d, x, y, h, c=B):
    """Une petite tour au loin, sur sa colline : un fût, un toit, une lueur verte au sommet."""
    halo(d, x, y - h, 7, V, 0.6)
    d.rectangle([x - 2, y - h, x + 2, y], fill=c)
    d.polygon([(x - 4, y - h), (x, y - h - 5), (x + 4, y - h)], fill=c)
    d.point((x, y - h + 3), fill=V)


def routeur():
    """La Tour du Carrefour (le routeur) : une tour de pierre au croisement de deux routes, sous la nuit ; de ses
    créneaux partent les messagers vers les tours voisines, un réseau de chaque côté."""
    im, d = toile()
    ciel(d, 112, graine=4, n=30, voile=0.6)
    # les collines lointaines (tramées), puis la colline proche
    d.polygon([(0, 104), (30, 94), (62, 100), (100, 92), (140, 98), (176, 90), (176, 116), (0, 116)], fill=N)
    trame(d, 0, 90, W, 116, V, 0.3)
    d.polygon([(0, 116), (40, 108), (90, 112), (140, 106), (176, 110), (176, 170), (0, 170)], fill=V)
    d.line([(0, 116), (40, 108), (90, 112), (140, 106), (176, 110)], fill=B)
    tour_messagere(d, 22, 100, 14); tour_messagere(d, 160, 96, 16); tour_messagere(d, 128, 100, 9)
    # les deux routes qui se croisent au pied de la tour, en perspective
    for pts in ([(82, 118), (94, 118), (152, 170), (114, 170)], [(82, 118), (94, 118), (64, 170), (24, 170)]):
        d.polygon(pts, fill=B)
        d.line([pts[0], pts[3]], fill=N); d.line([pts[1], pts[2]], fill=N)
    for k in range(5):
        f = (k + 1) / 6
        for (xa, xb) in ((88, 133), (88, 44)):
            yy = 120 + (170 - 120) * f
            xx = xa + (xb - xa) * f
            d.line([(xx, yy), (xx + (xb - xa) * 0.05, yy + 3 + 3 * f)], fill=N, width=1 if f < 0.5 else 2)
    d.polygon([(0, 140), (176, 134), (176, 146), (0, 154)], fill=B)
    d.line([(0, 140), (176, 134)], fill=N); d.line([(0, 154), (176, 146)], fill=N)
    for x in range(6, 176, 16):
        d.line([(x, 147 - x * 6 / 176), (x + 7, 147 - (x + 7) * 6 / 176)], fill=N, width=2)
    # l'ombre de la tour sur la route
    degrade(d, 98, 118, 124, 128, N, 0.55, 0.1)
    # la tour : pierres éclairées à gauche, ombre tramée à droite, fenêtres allumées
    briques(d, 66, 40, 110, 120, 7, 12)
    briques(d, 97, 40, 110, 120, 7, 12, fond=V)
    creneaux(d, 62, 114, 40, 8, 8)
    d.rectangle([62, 36, 114, 40], fill=B)
    for x in range(98, 115, 16):
        d.rectangle([x, 32, min(x + 7, 114), 36], fill=V)
    d.rectangle([97, 36, 114, 40], fill=V); d.line([(62, 40), (114, 40)], fill=N)
    d.line([(66, 40), (66, 120)], fill=B)
    arche(d, 80, 96, 96, 120, N, N)
    d.line([(80, 104), (80, 120)], fill=B)
    for y in (54, 74):
        d.rectangle([84, y, 92, y + 10], fill=V); d.line([(88, y), (88, y + 10)], fill=N)
        d.rectangle([83, y + 11, 93, y + 12], fill=B)
    # le fanion et les messagers (des points qui filent sur deux lignes de lumière)
    d.line([(88, 22), (88, 36)], fill=B, width=2)
    d.polygon([(89, 22), (106, 26), (89, 31)], fill=V)
    d.line([(89, 31), (106, 26)], fill=B)
    for (xb, yb, c) in ((22, 86, V), (160, 80, V), (128, 91, B)):
        n = 16
        for k in range(n):
            if k % 2 == 0:
                xa, ya = 88 + (xb - 88) * k / n, 44 + (yb - 44) * k / n
                xc, yc = 88 + (xb - 88) * (k + 1) / n, 44 + (yb - 44) * (k + 1) / n
                d.line([(xa, ya), (xc, yc)], fill=c)
        xm, ym = 88 + (xb - 88) * 0.55, 44 + (yb - 44) * 0.55
        d.rectangle([xm - 1, ym - 1, xm + 1, ym + 1], fill=B)
    return im


def bougie(d, x, y, h=8, lueur=True):
    """Une bougie allumée et le halo qu'elle pose autour d'elle."""
    if lueur:
        halo(d, x, y - h - 3, 16, V, 0.55, 14)
    d.rectangle([x - 2, y - h, x + 2, y], fill=B)
    d.line([(x + 2, y - h), (x + 2, y)], fill=V)
    d.polygon([(x, y - h - 7), (x + 2, y - h - 2), (x, y - h), (x - 2, y - h - 2)], fill=B)
    d.point((x, y - h - 2), fill=V)


def intranet():
    """La Bibliothèque (l'intranet) : deux hautes bibliothèques, la fenêtre en ogive et son rayon de lune,
    et au centre un lutrin où brille le grand livre ouvert."""
    im, d = toile()
    salle(d, 28, 12, 148, 102)
    # la fenêtre en ogive et le rayon de lune qui tombe sur le lutrin
    arche(d, 74, 18, 102, 80, N, B, 2)
    halo(d, 88, 40, 10, B, 0.5, 18, dans=lambda x, y: 76 <= x <= 100 and y <= 78)
    d.line([(88, 20), (88, 80)], fill=B); d.line([(76, 52), (100, 52)], fill=B)
    bibliotheque(d, 32, 16, 68, 102, 5, 11)
    bibliotheque(d, 106, 16, 142, 102, 5, 21)
    faisceau(d, 88, 80, 60, 118, 128, 0.3, 0.12)
    # le lutrin, en bois, et le livre ouvert qui luit
    degrade(d, 64, 156, 114, 162, N, 0.6, 0.0)
    d.polygon([(80, 124), (96, 124), (100, 158), (76, 158)], fill=B)
    d.line([(96, 124), (100, 158)], fill=V); d.line([(88, 128), (88, 156)], fill=N)
    d.rectangle([70, 156, 106, 160], fill=B)
    halo(d, 88, 114, 34, V, 0.5, 18)
    d.polygon([(58, 108), (88, 116), (118, 108), (118, 124), (88, 132), (58, 124)], fill=B)
    d.polygon([(58, 124), (88, 132), (118, 124), (118, 127), (88, 135), (58, 127)], fill=V)
    d.line([(88, 116), (88, 132)], fill=N)
    for k in range(4):
        d.line([(62, 113 + k * 3), (84, 119 + k * 3)], fill=N)
        d.line([(92, 119 + k * 3), (114, 113 + k * 3)], fill=N if k != 1 else V)
    bougie(d, 62, 104); bougie(d, 114, 104)
    return im


def rouleau(d, x, y, r=4, sceau=False):
    """Un parchemin roulé vu par le bout : la spirale, et parfois un sceau vert."""
    d.ellipse([x - r, y - r, x + r, y + r], fill=B)
    d.arc([x - r + 2, y - r + 2, x + r - 2, y + r - 2], 30, 300, fill=N)
    d.point((x, y), fill=N)
    if sceau:
        d.rectangle([x + r - 2, y + r - 3, x + r + 1, y + r], fill=V)


def etc_():
    """/etc, la salle des archives : un grand casier à parchemins (les fichiers de configuration), une échelle,
    une lanterne pendue au plafond, et sur l'écritoire un parchemin déroulé."""
    im, d = toile()
    salle(d, 22, 12, 154, 104)
    # la lanterne pendue
    d.line([(88, 0), (88, 8)], fill=B)
    halo(d, 88, 14, 30, V, 0.45, 20)
    d.polygon([(84, 8), (92, 8), (94, 12), (82, 12)], fill=B)
    d.rectangle([84, 12, 92, 20], fill=V); d.line([(88, 12), (88, 20)], fill=B); d.rectangle([83, 20, 93, 22], fill=B)
    # le casier : un meuble en volume, douze cases creusées d'ombre
    boite3d(d, 30, 28, 116, 74, 6, face=B, cote=V, dessus=B)
    for c in range(4):
        for r in range(3):
            x, y = 34 + c * 28, 32 + r * 23
            d.rectangle([x, y, x + 24, y + 20], fill=N)
            d.line([(x, y), (x + 24, y)], fill=V); d.line([(x, y), (x, y + 20)], fill=V)
            rnd = random.Random(c * 7 + r)
            for k in range(3):
                for j in range(2 if (c + r) % 2 else 1):
                    rouleau(d, x + 6 + k * 7, y + 15 - j * 7, 3, sceau=(c + r + k) % 5 == 0 and j == 0)
    # l'échelle appuyée à droite
    d.line([(150, 24), (160, 160)], fill=B, width=2); d.line([(140, 26), (148, 160)], fill=B, width=2)
    for k in range(9):
        y = 34 + k * 14
        d.line([(140 + (y - 26) * 8 / 134, y), (150 + (y - 24) * 10 / 136, y)], fill=V, width=2)
    # l'écritoire et le parchemin déroulé (un fichier de configuration)
    degrade(d, 40, 156, 132, 162, N, 0.6, 0.0)
    boite3d(d, 44, 132, 80, 22, 6, face=B, cote=V, dessus=B)
    d.line([(44, 136), (124, 136)], fill=N)
    d.rectangle([52, 140, 56, 154], fill=N); d.rectangle([112, 140, 116, 154], fill=N)
    d.polygon([(58, 120), (110, 120), (116, 132), (52, 132)], fill=B)
    d.ellipse([50, 128, 58, 134], fill=B); d.ellipse([110, 128, 118, 134], fill=B)
    for k in range(3):
        d.line([(62 + k, 123 + k * 3), (104 - (k * 9) % 14, 123 + k * 3)], fill=N if k != 1 else V)
    return im


def registre(d, x, y, w, h, c=B, dos=V):
    """Un registre fermé, couché : le dessus, la tranche des pages et le dos."""
    d.rectangle([x, y, x + w, y + h], fill=c)
    d.rectangle([x + 3, y + h - 2, x + w - 2, y + h], fill=N)
    for k in range(x + 4, x + w - 2, 3):
        d.point((k, y + h - 1), fill=B)
    d.rectangle([x, y, x + 3, y + h], fill=dos)


def journaux():
    """/var/log, les journaux : des registres empilés sous la bougie, le grand registre ouvert où une ligne
    est soulignée de vert, l'encrier et sa plume, les rayonnages de registres au mur."""
    im, d = toile()
    salle(d, 30, 14, 146, 96)
    for r in range(2):
        y = 22 + r * 34
        d.rectangle([34, y + 28, 142, y + 30], fill=B); d.line([(34, y + 31), (142, y + 31)], fill=V)
        x = 38
        rnd = random.Random(r + 3)
        while x < 136:
            w = rnd.randint(6, 9); h = rnd.randint(20, 27)
            d.rectangle([x, y + 28 - h, x + w, y + 27], fill=B if rnd.random() < 0.7 else V)
            d.line([(x, y + 28 - h + 3), (x + w, y + 28 - h + 3)], fill=N); d.line([(x, y + 23), (x + w, y + 23)], fill=N)
            x += w + 1
    # la table, sa nappe d'ombre, la pile de registres
    degrade(d, 22, 160, 154, 166, N, 0.6, 0.0)
    boite3d(d, 22, 128, 120, 30, 8, face=B, cote=V, dessus=B)
    d.line([(22, 132), (142, 132)], fill=N)
    for x in (30, 88):
        d.rectangle([x, 137, x + 46, 151], outline=N); d.rectangle([x + 20, 143, x + 26, 145], fill=V)
    halo(d, 140, 100, 34, V, 0.45, 30)
    for k in range(3):
        registre(d, 40 + k * 2, 116 - k * 7, 44 - k * 4, 6, B if k % 2 == 0 else V, V if k % 2 == 0 else B)
    # le grand registre ouvert
    d.polygon([(66, 102), (100, 108), (134, 102), (134, 124), (100, 130), (66, 124)], fill=B)
    d.polygon([(66, 124), (100, 130), (134, 124), (134, 127), (100, 133), (66, 127)], fill=V)
    d.line([(100, 108), (100, 130)], fill=N, width=2)
    for k in range(5):
        d.line([(70, 107 + k * 4), (96, 112 + k * 4)], fill=N)
        d.line([(104, 112 + k * 4), (130, 107 + k * 4)], fill=V if k == 2 else N)
    d.line([(104, 121), (130, 116)], fill=V, width=2)
    # l'encrier et la plume ; la bougie
    d.ellipse([22, 112, 36, 126], fill=B); d.rectangle([26, 106, 32, 114], fill=B); d.ellipse([25, 104, 33, 108], fill=N)
    d.line([(33, 116), (33, 124)], fill=V)
    d.polygon([(30, 106), (18, 76), (23, 77), (31, 104)], fill=V)
    d.line([(18, 76), (30, 106)], fill=B)
    bougie(d, 148, 126, 14, lueur=False)
    return im


def caisse(d, x, y, w, h, p=6, marque=None):
    """Une caisse de bois en volume : planches, croisillon, et l'arête éclairée."""
    boite3d(d, x, y, w, h, p, face=B, cote=V, dessus=B)
    d.rectangle([x + 2, y + 2, x + w - 2, y + h - 2], outline=N)
    d.line([(x + 2, y + 2), (x + w - 2, y + h - 2)], fill=N); d.line([(x + w - 2, y + 2), (x + 2, y + h - 2)], fill=N)
    d.line([(x + p // 2, y - p // 2), (x + w + p // 2, y - p // 2)], fill=N)
    if marque:
        d.rectangle([x + w // 2 - 5, y + h // 2 - 3, x + w // 2 + 5, y + h // 2 + 3], fill=N)
        d.text((x + w // 2 - 3, y + h // 2 - 6), marque, fill=V)


def tmp_():
    """/tmp, le grenier commun : la charpente en perspective, une lucarne ronde d'où tombe un rayon de lune,
    des caisses déposées par tout le monde sur le plancher."""
    im, d = toile()
    # le pignon du fond et sa lucarne
    d.polygon([(52, 64), (88, 30), (124, 64), (124, 104), (52, 104)], fill=N)
    d.line([(52, 64), (88, 30), (124, 64)], fill=B, width=2)
    d.rectangle([52, 64, 124, 104], outline=B)
    halo(d, 88, 58, 9, B, 0.6)
    d.ellipse([80, 50, 96, 66], outline=B, width=2)
    d.line([(88, 50), (88, 66)], fill=B); d.line([(80, 58), (96, 58)], fill=B)
    # la charpente : les chevrons qui fuient vers le pignon
    for (xa, ya, xb, yb) in ((0, 92, 52, 64), (0, 40, 52, 64), (176, 92, 124, 64), (176, 40, 124, 64)):
        d.line([(xa, ya), (xb, yb)], fill=B, width=2)
    for (xa, ya, xb, yb) in ((0, 0, 88, 30), (176, 0, 88, 30)):
        d.line([(xa, ya), (xb, yb)], fill=B, width=3)
    for k in range(1, 5):
        f = k / 5
        d.line([(52 - 52 * f, 64 - 64 * f * 0.55), (88 - 88 * f, 30 - 30 * f)], fill=V)
        d.line([(124 + 52 * f, 64 - 64 * f * 0.55), (88 + 88 * f, 30 - 30 * f)], fill=V)
    # le plancher en planches qui fuient
    d.polygon([(52, 104), (124, 104), (W, H), (0, H)], fill=V)
    for i in range(9):
        d.line([(52 + 72 * i / 8, 104), (-30 + 236 * i / 8, H)], fill=N)
    degrade(d, 0, 104, W, 116, N, 0.6, 0.0)
    d.line([(0, 132), (52, 104)], fill=B); d.line([(176, 132), (124, 104)], fill=B)
    # le rayon de lune, et la poussière qui danse dedans
    faisceau(d, 88, 66, 70, 130, 150, 0.32, 0.08)
    for (x, y) in ((86, 84), (96, 96), (82, 110), (104, 122), (92, 134)):
        d.point((x, y), fill=B)
    # les caisses
    caisse(d, 60, 92, 24, 14, 5)
    caisse(d, 104, 90, 18, 12, 4)
    caisse(d, 10, 112, 40, 30, 8)
    caisse(d, 18, 92, 22, 18, 6)
    caisse(d, 110, 116, 46, 32, 8)
    caisse(d, 62, 134, 34, 22, 7)
    return im


def suspension(d, x, y, l=10, t=0.5):
    """Une lampe suspendue de cafétéria : le fil, l'abat-jour, et la lumière qui tombe dessous."""
    d.line([(x, 0), (x, y)], fill=B)
    faisceau(d, x, y + 4, x - 16, x + 16, y + 34, t, 0.0, V)
    d.polygon([(x - 2, y), (x + 2, y), (x + 6, y + 5), (x - 6, y + 5)], fill=B)
    d.line([(x + 2, y), (x + 6, y + 5)], fill=V)
    d.rectangle([x - 2, y + 5, x + 2, y + 6], fill=B)


def table_haute(d, x, y, h=36):
    """Une table haute ronde, son pied et l'ombre qu'elle pose au sol."""
    degrade(d, x - 16, y + h - 1, x + 16, y + h + 3, N, 0.7, 0.2)
    d.ellipse([x - 16, y - 4, x + 16, y + 4], fill=B)
    d.ellipse([x - 16, y - 1, x + 16, y + 6], fill=V)
    d.ellipse([x - 16, y - 4, x + 16, y + 3], fill=B)
    d.rectangle([x - 2, y + 5, x + 2, y + h - 3], fill=B); d.line([(x + 2, y + 5), (x + 2, y + h - 3)], fill=V)
    d.ellipse([x - 10, y + h - 4, x + 10, y + h], fill=B)


def tabouret(d, x, y, h=22):
    d.ellipse([x - 6, y - 2, x + 6, y + 2], fill=B)
    d.line([(x - 4, y + 2), (x - 6, y + h)], fill=B); d.line([(x + 4, y + 2), (x + 6, y + h)], fill=V)
    d.line([(x - 5, y + h * 0.6), (x + 5, y + h * 0.6)], fill=B)


def icone_avion(d, cx, cy, s=1.0, c=V):
    """La petite icône d'avion (le mode avion), pointe en haut."""
    pts = [(0, -18), (2, -16), (2, -4), (14, 4), (14, 8), (2, 3), (2, 12), (7, 16), (7, 18), (0, 16), (-7, 18), (-7, 16),
           (-2, 12), (-2, 3), (-14, 8), (-14, 4), (-2, -4), (-2, -16)]
    d.polygon([(cx + x * s, cy + y * s) for x, y in pts], fill=c)


def annexe():
    """L'Annexe, la cafétéria : des tables hautes sous des lampes suspendues, la machine à café qui siffle,
    au mur un grand écran tout noir, et sur le comptoir le portable de la cafétéria."""
    im, d = toile()
    salle(d, 22, 14, 154, 98)
    # le grand écran éteint : un noir laqué, deux reflets en biais
    d.rectangle([34, 24, 112, 70], fill=B)
    d.rectangle([37, 27, 109, 67], fill=N)
    for k in range(2):
        d.line([(44 + k * 8, 64), (62 + k * 8, 30)], fill=V if k else B)
    d.rectangle([66, 70, 80, 74], fill=B)
    # la machine à café, en volume, et sa vapeur
    boite3d(d, 122, 46, 22, 52, 5, face=B, cote=V, dessus=B)
    d.rectangle([126, 52, 140, 64], fill=N); d.rectangle([128, 54, 132, 56], fill=V); d.rectangle([134, 54, 138, 56], fill=B)
    d.rectangle([128, 72, 138, 84], fill=N); d.rectangle([131, 74, 135, 76], fill=B)
    d.rectangle([130, 80, 136, 84], fill=V)
    for k, x in enumerate((128, 136)):
        d.line([(x, 42), (x - 3, 36), (x, 30), (x - 3, 24)], fill=V if k else B)
    suspension(d, 60, 76, t=0.45); suspension(d, 118, 82, t=0.45)
    # le comptoir et le portable (son écran montre un avion)
    comptoir_accueil(d, 6, 122, 84, 162)
    halo(d, 46, 108, 22, V, 0.5, 14)
    d.polygon([(30, 120), (62, 120), (68, 124), (24, 124)], fill=B)
    d.rectangle([32, 100, 60, 119], fill=B); d.rectangle([35, 103, 57, 117], fill=N)
    icone_avion(d, 46, 110, 0.32)
    # les tables hautes et leurs tabourets
    table_haute(d, 112, 116, 40); tabouret(d, 96, 136); tabouret(d, 128, 138)
    table_haute(d, 150, 122, 38); tabouret(d, 166, 142)
    return im


def portable():
    """Le portable de la cafétéria, de près : son écran ne montre qu'une petite icône d'avion ; derrière, les lampes
    de la cafétéria."""
    im, d = toile()
    salle(d, 30, 16, 146, 90, carreaux=False)
    suspension(d, 22, 20, t=0.35); suspension(d, 154, 20, t=0.35)
    halo(d, 88, 64, 70, V, 0.38, 54)
    # l'écran, son cadre, son fond tramé et l'avion
    d.rectangle([38, 22, 138, 104], fill=B)
    d.rectangle([44, 28, 132, 98], fill=N)
    degrade(d, 44, 60, 132, 98, V, 0.0, 0.3)
    icone_avion(d, 88, 62, 1.0)
    d.rectangle([86, 24, 90, 26], fill=N)
    d.rectangle([46, 92, 60, 96], fill=B); d.rectangle([116, 92, 130, 96], fill=V)
    # le clavier en perspective, ses touches, le pavé tactile
    d.polygon([(38, 104), (138, 104), (164, 140), (12, 140)], fill=B)
    d.polygon([(12, 140), (164, 140), (164, 144), (12, 144)], fill=V)
    for r in range(4):
        y = 108 + r * 6
        x0 = 36 - r * 4; x1 = 140 + r * 4
        n = 13
        for k in range(n):
            x = x0 + (x1 - x0) * k / n
            d.rectangle([x + 1, y, x + (x1 - x0) / n - 2, y + 3], fill=N)
    d.rectangle([70, 132, 106, 138], fill=N); d.rectangle([71, 133, 105, 137], fill=B); d.line([(71, 137), (105, 137)], fill=V)
    # le comptoir, et un gobelet de café
    degrade(d, 0, 144, W, 152, N, 0.6, 0.0)
    d.rectangle([150, 112, 164, 136], fill=B); d.rectangle([150, 118, 164, 124], fill=V); d.line([(164, 112), (164, 136)], fill=V)
    for x in (153, 160):
        d.line([(x, 108), (x + 2, 104), (x, 100)], fill=B)
    return im


def borne():
    """La Tour des Ondes (la borne Wi-Fi) : un mât fin sur une colline, son antenne lance des ondes vertes dans la nuit."""
    im, d = toile()
    ciel(d, 124, graine=9, n=28, voile=0.35)
    # la colline et ses quelques maisons éclairées au pied
    d.polygon([(0, 132), (40, 118), (88, 112), (136, 118), (176, 128), (176, 170), (0, 170)], fill=V)
    d.line([(0, 132), (40, 118), (88, 112), (136, 118), (176, 128)], fill=B)
    for (x, y) in ((22, 128), (34, 124), (146, 124), (158, 128)):
        d.polygon([(x - 5, y), (x, y - 5), (x + 5, y)], fill=N); d.rectangle([x - 4, y, x + 4, y + 6], fill=N)
        d.point((x, y + 3), fill=B)
    for (x, y, h) in ((10, 156, 5), (30, 160, 6), (52, 152, 4), (124, 156, 5), (150, 160, 6), (168, 150, 4)):
        d.line([(x, y), (x - 1, y - h)], fill=B); d.line([(x + 2, y), (x + 3, y - h + 2)], fill=B)
    # les ondes : des anneaux de lumière autour de l'antenne
    halo(d, 88, 30, 44, V, 0.28)
    for k in range(4):
        r = 12 + k * 10
        c = V if k % 2 == 0 else B
        d.arc([88 - r, 30 - r, 88 + r, 30 + r], 200, 340, fill=c, width=2)
        d.arc([88 - r, 30 - r, 88 + r, 30 + r], 20, 160, fill=c, width=2)
    # le mât en treillis : un côté éclairé, l'autre vert
    d.polygon([(76, 116), (100, 116), (93, 50), (83, 50)], fill=N)
    d.line([(76, 116), (83, 50)], fill=B, width=2); d.line([(100, 116), (93, 50)], fill=V, width=2)
    for k in range(8):
        y0 = 54 + k * 8; y1 = y0 + 8
        xa = 83 - (y0 - 50) * 7 / 66; xb = 93 + (y0 - 50) * 7 / 66
        xa1 = 83 - (y1 - 50) * 7 / 66; xb1 = 93 + (y1 - 50) * 7 / 66
        d.line([(xa, y0), (xb1, y1)], fill=B); d.line([(xb, y0), (xa1, y1)], fill=V)
        d.line([(xa, y0), (xb, y0)], fill=B)
    d.rectangle([78, 44, 98, 50], fill=B); d.line([(78, 50), (98, 50)], fill=V)
    d.rectangle([84, 110, 92, 116], fill=B)
    d.line([(88, 44), (88, 30)], fill=B, width=2)
    d.ellipse([84, 24, 92, 32], fill=B); d.ellipse([86, 26, 90, 30], fill=V)
    return im


def switch():
    """Le Carrefour des Prises (le switch) : un boîtier à huit prises au mur, des câbles qui retombent jusqu'au sol,
    et deux voyants éteints."""
    im, d = toile()
    salle(d, 18, 20, 158, 112)
    # la goulotte qui descend du plafond
    d.rectangle([84, 0, 92, 38], fill=B); d.line([(92, 0), (92, 38)], fill=V)
    for y in range(4, 38, 8):
        d.line([(84, y), (92, y)], fill=N)
    # le boîtier, en volume, ses prises et ses voyants
    boite3d(d, 22, 42, 128, 38, 6, face=B, cote=V, dessus=B)
    d.rectangle([26, 46, 146, 76], fill=N)
    d.text((30, 47), "8 PORTS", fill=B)
    allumes = [k not in (1, 6, 7) for k in range(8)]
    for k in range(8):
        x = 34 + k * 14
        if allumes[k]:
            halo(d, x + 5, 60, 7, V, 0.7, 5, dans=lambda xx, yy: 26 <= xx <= 146 and 46 <= yy <= 76)
    for k in range(8):
        x = 34 + k * 14
        d.rectangle([x, 60, x + 10, 72], fill=B)
        d.rectangle([x + 2, 63, x + 8, 70], fill=N)
        d.line([(x + 3, 63), (x + 7, 63)], fill=V)
        d.rectangle([x + 3, 56, x + 7, 57], fill=V if allumes[k] else B)
        if not allumes[k]:
            d.rectangle([x + 4, 56, x + 6, 57], fill=N)
    # les câbles : des fiches dans les prises, des courbes jusqu'au sol
    for k in range(8):
        if k in (1, 7):
            continue
        x = 34 + k * 14 + 5
        d.rectangle([x - 3, 66, x + 3, 74], fill=V if k == 6 else B)
        xb = x + (k - 3.5) * 6
        yb = 150 + (k % 3) * 6
        d.line([(x, 74), (x + (k - 3.5) * 1.5, 100), (xb, yb - 6), (xb + (k - 3.5) * 2, yb)], fill=V if k == 6 else B, width=2)
        d.ellipse([xb + (k - 3.5) * 2 - 2, yb - 1, xb + (k - 3.5) * 2 + 2, yb + 2], fill=B)
    degrade(d, 20, 82, 156, 88, N, 0.0, 0.0)
    return im


def affichage():
    """Le Grand Tableau : l'écran de la cafétéria, encadré comme un tableau de musée sous deux spots,
    qui joue une vidéo (une colline au lever du jour, et le bouton de lecture)."""
    im, d = toile()
    salle(d, 14, 14, 162, 112)
    for x in (40, 136):
        d.rectangle([x - 3, 14, x + 3, 18], fill=B)
        faisceau(d, x, 18, x - 18, x + 18, 40, 0.4, 0.15, B)
    # le cadre doré : moulure blanche, filet vert, coins
    d.rectangle([22, 22, 154, 102], fill=B)
    d.rectangle([25, 25, 151, 99], fill=V)
    d.rectangle([28, 28, 148, 96], fill=B)
    d.rectangle([31, 31, 145, 93], fill=N)
    for (x, y) in ((22, 22), (148, 22), (22, 96), (148, 96)):
        d.rectangle([x, y, x + 6, y + 6], fill=V); d.rectangle([x + 2, y + 2, x + 4, y + 4], fill=B)
    # la vidéo : un ciel qui s'éclaire, une colline, le soleil, le bouton de lecture
    degrade(d, 32, 32, 144, 80, V, 0.0, 0.8)
    halo(d, 112, 72, 22, B, 0.6, 14, dans=lambda x, y: 32 <= x <= 144 and y <= 80)
    d.ellipse([104, 66, 120, 82], fill=B)
    d.polygon([(32, 80), (70, 70), (104, 76), (144, 70), (144, 92), (32, 92)], fill=V)
    d.line([(32, 80), (70, 70), (104, 76), (144, 70)], fill=B)
    d.rectangle([32, 86, 144, 92], fill=N)
    d.rectangle([36, 88, 82, 89], fill=V); d.rectangle([82, 87, 84, 90], fill=B); d.rectangle([84, 88, 140, 89], fill=B)
    d.ellipse([74, 44, 102, 72], fill=N); d.ellipse([74, 44, 102, 72], outline=B, width=2)
    d.polygon([(84, 50), (84, 66), (97, 58)], fill=B)
    # le pied, le câble
    d.rectangle([84, 102, 92, 112], fill=B); d.line([(92, 102), (92, 112)], fill=V)
    d.line([(88, 112), (90, 140), (100, 160)], fill=B, width=2)
    return im


# ------------------------------------------------------------------
# Chapitre 3 : la Crypte (le donjon) et les machines corrompues
# ------------------------------------------------------------------


def pierres(d, x0, y0, x1, y1, h=8, w=16, graine=1, fond=B, joint=N, ombre=None):
    """Un mur de pierres taillées : des rangs décalés, des blocs de largeurs inégales, une arête claire en haut
    de chaque bloc ; ombre=(xa, xb) assombrit en vert la partie du mur loin de la lumière."""
    rnd = random.Random(graine)
    d.rectangle([x0, y0, x1, y1], fill=fond)
    y = y0
    r = 0
    while y < y1:
        x = x0 - (w // 2 if r % 2 else 0)
        while x < x1:
            ww = rnd.randint(w - 4, w + 4)
            d.line([(max(x, x0), y), (min(x + ww, x1), y)], fill=joint)
            if x > x0:
                d.line([(x, y), (x, min(y + h, y1))], fill=joint)
            x += ww
        y += h
        r += 1
    d.rectangle([x0, y0, x1, y1], outline=joint)


def torche_lueur(d, x, y, r=26):
    """Une torche au mur et sa lueur verte sur la pierre (le halo d'abord, la torche par-dessus)."""
    halo(d, x, y - 6, r, V, 0.55, r * 0.9)
    d.polygon([(x - 3, y), (x + 3, y), (x + 1, y + 14), (x - 1, y + 14)], fill=B)
    d.line([(x + 2, y), (x + 1, y + 14)], fill=V)
    d.rectangle([x - 4, y - 2, x + 4, y], fill=B)
    d.polygon([(x, y - 16), (x + 5, y - 6), (x + 4, y - 1), (x - 4, y - 1), (x - 5, y - 6)], fill=V)
    d.polygon([(x, y - 10), (x + 2, y - 3), (x - 2, y - 3)], fill=B)


def crypte():
    """L'entrée du donjon (la Crypte) : sous une voûte de pierre, un escalier plonge dans le noir, entre deux torches."""
    im, d = toile()
    pierres(d, 0, 0, W - 1, 134, 8, 18, graine=3)
    # la voûte : trois arcs qui s'enfoncent
    for k, (x0, y0, x1) in enumerate(((36, 12, 140), (48, 30, 128), (58, 46, 118))):
        arche(d, x0, y0, x1, 150, N, B if k == 0 else V, 3 if k == 0 else 2)
    arche(d, 66, 60, 110, 150, N, N, 1)
    # les marches qui descendent dans l'obscurité
    for k in range(9):
        y = 150 - k * 8
        w = 46 - k * 4
        d.rectangle([88 - w, y - 3, 88 + w, y], fill=B)
        d.line([(88 - w, y - 3), (88 + w, y - 3)], fill=B)
        d.rectangle([88 - w, y + 1, 88 + w, y + 4], fill=N)
    degrade(d, 40, 76, 136, 120, N, 0.95, 0.0)
    # le sol de dalles devant
    d.rectangle([0, 150, W, H], fill=V)
    for x in range(-20, W + 20, 20):
        d.line([(88 + (x - 88) * 0.7, 150), (x, H)], fill=N)
    d.line([(0, 160), (W, 160)], fill=N)
    torche_lueur(d, 22, 60); torche_lueur(d, 154, 60)
    return im


def grimoire(d, x, y, w, h, c=B, fendu=False):
    """Un grimoire debout : un dos épais, deux nervures, des coins ferrés."""
    d.rectangle([x, y, x + w, y + h], fill=c)
    autre = N
    d.line([(x, y + 3), (x + w, y + 3)], fill=autre); d.line([(x, y + h - 4), (x + w, y + h - 4)], fill=autre)
    d.rectangle([x + 2, y + h // 2 - 2, x + w - 2, y + h // 2 + 1], fill=autre)
    d.point((x + w // 2, y + h // 2 - 1), fill=c)
    if fendu:
        d.line([(x + 2, y + 5), (x + 6, y + 10), (x + 3, y + 15), (x + 7, y + 19)], fill=N, width=2)


def binaires():
    """/bin, la salle des grimoires : chaque programme y dort, un seul est fendu et luit ; la liste des empreintes
    est clouée au mur, sous une lanterne."""
    im, d = toile()
    salle(d, 16, 10, 160, 104)
    for r in range(3):
        y = 18 + r * 28
        d.rectangle([20, y + 24, 156, y + 26], fill=B); d.line([(20, y + 27), (156, y + 27)], fill=V)
        x = 24
        rnd = random.Random(r + 11)
        k = 0
        while x < 148:
            w = rnd.randint(8, 11); h = rnd.randint(17, 23)
            corrompu = (r == 1 and k == 4)
            if corrompu:
                halo(d, x + w / 2, y + 24 - h / 2, 18, V, 0.6, 16)
            grimoire(d, x, y + 24 - h, w, h, V if corrompu else (B if rnd.random() < 0.8 else V), fendu=corrompu)
            x += w + 2
            k += 1
    # la liste des empreintes clouée au mur, la lanterne au-dessus
    halo(d, 88, 120, 36, V, 0.35, 24)
    d.polygon([(64, 112), (112, 112), (114, 152), (62, 152)], fill=B)
    d.ellipse([86, 113, 90, 117], fill=N)
    for k in range(5):
        d.line([(68, 122 + k * 6), (106 - (k * 7) % 14, 122 + k * 6)], fill=N if k != 2 else V)
    d.line([(64, 152), (114, 152)], fill=V)
    return im


def caveau():
    """Le Caveau : une salle voûtée taillée dans la roche, six niches scellées par root le long du mur, et au milieu
    un pan de mur que personne n'a bâti (ses joints luisent en vert : une porte)."""
    im, d = toile()
    pierres(d, 0, 0, W - 1, 132, 7, 16, graine=8)
    # la voûte : un grand arc d'ombre, bordé d'un liseré vert, qui laisse voir la roche au-dessus
    d.chord([-30, -70, W + 30, 64], 0, 180, fill=N)
    d.arc([-30, -70, W + 30, 64], 0, 180, fill=V, width=2)
    d.arc([-24, -64, W + 24, 58], 0, 180, fill=B)
    # les six niches, creusées (ombre au fond), scellées de planches et d'un sceau vert
    for k in range(6):
        x = 6 + k * 28 + (8 if k >= 3 else 0)
        if k in (2, 3):
            x += -4 if k == 2 else 4
        arche(d, x, 56, x + 20, 110, N, B, 2)
        d.line([(x + 3, 68), (x + 3, 108)], fill=V)
        d.line([(x + 4, 76), (x + 17, 104)], fill=B, width=2); d.line([(x + 17, 76), (x + 4, 104)], fill=B, width=2)
        d.ellipse([x + 7, 86, x + 13, 92], fill=V); d.point((x + 10, 89), fill=N)
    # le pan de mur que personne n'a bâti : des pierres trop régulières, des joints verts qui luisent
    halo(d, 88, 104, 22, V, 0.5, 26)
    d.rectangle([76, 80, 100, 132], fill=B)
    for y in range(80, 132, 8):
        d.line([(76, y), (100, y)], fill=V)
        d.line([(88 if (y // 8) % 2 else 82, y), (88 if (y // 8) % 2 else 82, y + 8)], fill=V)
        d.line([(94 if (y // 8) % 2 else 100, y), (94 if (y // 8) % 2 else 100, y + 8)], fill=V)
    d.rectangle([76, 80, 100, 132], outline=V, width=2)
    # deux torches, le sol de terre battue
    d.polygon([(0, 132), (W, 132), (W, H), (0, H)], fill=V)
    degrade(d, 0, 132, W, 146, N, 0.75, 0.0)
    d.line([(0, 132), (W, 132)], fill=B)
    for x in range(8, W, 18):
        d.line([(88 + (x - 88) * 0.5, 134), (x, H)], fill=N)
    return im


def racine():
    """La Racine : une grotte où pendent les racines du monde ; des lucioles vertes (les processus) bourdonnent
    dans le noir, au-dessus d'une brume."""
    im, d = toile()
    rnd = random.Random(12)
    # la voûte rocheuse, éclairée par-dessous
    d.polygon([(0, 0), (W, 0), (W, 34), (150, 42), (128, 36), (100, 46), (76, 34), (50, 44), (24, 36), (0, 40)], fill=V)
    for (a, b, w) in ((8, 8, 20), (44, 16, 26), (96, 10, 22), (134, 20, 30), (70, 26, 14)):
        d.line([(a, b), (a + w, b - 2)], fill=N); d.line([(a + 2, b + 1), (a + w - 2, b - 1)], fill=B)
    d.line([(0, 40), (24, 36), (50, 44), (76, 34), (100, 46), (128, 36), (150, 42), (176, 34)], fill=B, width=2)
    # les racines qui pendent, épaisses puis fines
    for k in range(10):
        x = 6 + k * 18 + rnd.randint(-3, 3)
        y = 38
        pts = [(x, y)]
        for s in range(6):
            x += rnd.randint(-5, 5); y += rnd.randint(9, 16)
            pts.append((x, y))
        ep = 3 if k % 3 == 0 else 2
        d.line(pts, fill=B, width=ep)
        d.line([(p[0] + 1, p[1]) for p in pts[:3]], fill=V)
        for p in pts[2:5]:
            if rnd.random() < 0.5:
                d.line([p, (p[0] + rnd.choice((-6, 6)), p[1] + 8)], fill=B)
    # le sol et la brume
    d.polygon([(0, 148), (40, 142), (100, 146), (176, 140), (176, 170), (0, 170)], fill=V)
    d.line([(0, 148), (40, 142), (100, 146), (176, 140)], fill=B)
    degrade(d, 0, 124, W, 148, B, 0.0, 0.14)
    # les lucioles, chacune dans son halo
    pos = [(16 + k * 18 + (k * 5) % 9 - 4, 96 + ((k * 37) % 48) - 22) for k in range(9)]
    for k, (x, y) in enumerate(pos):
        halo(d, x, y, 8, V, 0.7)
        d.rectangle([x - 1, y - 1, x + 1, y + 1], fill=B if k != 4 else V)
        d.line([(x - 5, y - 2), (x - 2, y)], fill=B); d.line([(x + 5, y - 2), (x + 2, y)], fill=B)
    return im


def coffre():
    """Le Coffre, la chambre forte : la grande porte ronde, son épaisseur d'acier, son volant et ses verrous,
    sous une lampe grillagée."""
    im, d = toile()
    pierres(d, 0, 0, W - 1, 140, 8, 20, graine=5)
    d.line([(88, 0), (88, 6)], fill=B)
    halo(d, 88, 74, 70, V, 0.24, 68)
    d.rectangle([82, 4, 94, 10], fill=B); d.rectangle([84, 10, 92, 12], fill=V)
    # l'épaisseur de la porte (un cylindre vu de face, décalé), puis la face
    d.ellipse([30, 18, 150, 138], fill=N)
    d.ellipse([34, 20, 150, 136], fill=V)
    d.ellipse([28, 16, 144, 132], fill=B)
    d.ellipse([38, 26, 134, 122], fill=N)
    d.ellipse([41, 29, 131, 119], fill=B)
    d.arc([41, 29, 131, 119], 100, 260, fill=V, width=3)
    # les verrous tout autour
    for a in range(0, 360, 30):
        x = 86 + 52 * math.cos(math.radians(a)); y = 74 + 52 * math.sin(math.radians(a))
        d.ellipse([x - 2, y - 2, x + 2, y + 2], fill=N)
    # le volant à huit rayons et son moyeu
    for a in range(0, 360, 45):
        x = 86 + 28 * math.cos(math.radians(a)); y = 74 + 28 * math.sin(math.radians(a))
        d.line([(86, 74), (x, y)], fill=N, width=3)
        d.ellipse([x - 4, y - 4, x + 4, y + 4], fill=N); d.ellipse([x - 2, y - 3, x + 1, y], fill=B)
    d.ellipse([77, 65, 95, 83], fill=N); d.ellipse([79, 67, 93, 81], fill=V); d.ellipse([82, 69, 86, 73], fill=B)
    # les gonds à droite
    for y in (44, 104):
        d.rectangle([140, y - 5, 152, y + 5], fill=B); d.rectangle([140, y - 5, 152, y + 5], outline=N)
    # le sol
    d.rectangle([0, 140, W, H], fill=V)
    degrade(d, 0, 140, W, 150, N, 0.6, 0.0)
    for x in range(-20, W + 20, 22):
        d.line([(88 + (x - 88) * 0.6, 140), (x, H)], fill=N)
    return im


def labo():
    """Le labo de TP (l'Atelier des Apprentis) : un tableau couvert de commandes (who, last, vimtuteur),
    trois postes allumés sur l'établi, des tabourets, un néon au plafond."""
    im, d = toile()
    salle(d, 20, 10, 156, 92)
    neon(d, 70, 106, 4, 0.35, 8)
    # le tableau et son auget
    d.rectangle([28, 16, 148, 54], fill=B)
    d.rectangle([31, 19, 145, 51], fill=N)
    d.text((38, 21), "who  last", fill=V); d.text((38, 34), "vimtuteur", fill=B)
    d.line([(100, 26), (136, 26)], fill=B); d.line([(100, 32), (128, 32)], fill=B)
    d.ellipse([98, 36, 140, 50], outline=V)
    d.rectangle([28, 54, 148, 57], fill=B); d.rectangle([60, 52, 66, 54], fill=B)
    # les postes sur l'établi
    for x in (8, 66, 124):
        ecran_crt(d, x, 66, 32, 24, (">",) if x == 124 else ())
    d.polygon([(0, 102), (W, 102), (W, 110), (0, 110)], fill=B)
    d.rectangle([0, 110, W, 113], fill=V); d.line([(0, 102), (W, 102)], fill=N)
    for x in (6, 64, 122):
        d.polygon([(x + 4, 98), (x + 40, 98), (x + 44, 102), (x, 102)], fill=B)
        for k in range(x + 6, x + 40, 3):
            d.point((k, 100), fill=N)
    degrade(d, 0, 114, W, 122, N, 0.6, 0.0)
    for x in (12, 164):
        d.rectangle([x - 3, 113, x + 3, 150], fill=B); d.line([(x + 3, 113), (x + 3, 150)], fill=V)
    for x in (30, 88, 146):
        tabouret(d, x, 132, 24)
    return im


def web():
    """Le serveur web (la Vitrine) : une échoppe du marché la nuit, son auvent rayé, sa grande vitre aux reflets,
    et derrière, un masque vert accroché (la porte dérobée) ; un réverbère éclaire les pavés."""
    im, d = toile()
    ciel(d, 40, graine=31, n=10, voile=0.3)
    # la façade
    d.rectangle([8, 40, 168, 140], fill=B)
    pierres(d, 8, 40, 168, 56, 8, 14, graine=4)
    # l'auvent rayé, en volume, et ses festons
    d.polygon([(4, 34), (172, 34), (176, 52), (0, 52)], fill=V)
    for x in range(0, W, 16):
        d.polygon([(4 + x * 168 / 176, 34), (12 + x * 168 / 176, 34), (x + 8, 52), (x, 52)], fill=B)
    for x in range(0, W, 8):
        d.pieslice([x, 48, x + 8, 58], 0, 180, fill=V if (x // 8) % 2 == 0 else B)
    d.line([(4, 34), (172, 34)], fill=N)
    d.text((62, 37), "VITRINE", fill=N)
    # la vitre : la boutique sombre, le masque qui luit, deux reflets en biais
    d.rectangle([18, 62, 116, 128], fill=N)
    halo(d, 96, 92, 22, V, 0.55)
    d.ellipse([84, 78, 108, 106], fill=V)
    d.ellipse([88, 86, 94, 92], fill=N); d.ellipse([98, 86, 104, 92], fill=N)
    d.arc([90, 92, 102, 102], 20, 160, fill=N, width=2)
    d.line([(96, 70), (96, 78)], fill=B); d.line([(84, 70), (108, 70)], fill=B)
    for k, (a, b) in enumerate(((26, 120), (40, 122))):
        d.line([(a, b), (a + 30, b - 54)], fill=B, width=3 - k)
    d.rectangle([18, 62, 116, 128], outline=N, width=2)
    d.rectangle([14, 128, 120, 132], fill=V)
    # la porte
    d.rectangle([126, 66, 156, 140], fill=N); d.rectangle([128, 68, 154, 140], fill=B)
    d.rectangle([132, 72, 150, 98], fill=N); d.ellipse([148, 106, 152, 110], fill=N)
    d.line([(154, 68), (154, 140)], fill=V)
    # les pavés en perspective et la flaque de lumière du réverbère
    d.rectangle([0, 140, W, H], fill=B)
    for k in range(5):
        y = 142 + k * k * 1.3 + k * 3
        d.line([(0, y), (W, y)], fill=N)
    for x in range(-60, W + 60, 14):
        d.line([(88 + (x - 88) * 0.5, 140), (x, H)], fill=N)
    halo(d, 166, 150, 30, V, 0.5, 14, ymin=141)
    d.rectangle([168, 50, 170, 150], fill=N); d.line([(170, 50), (170, 150)], fill=V)
    return im


def pigeon(d, x, y, sens=1):
    """Un pigeon voyageur perché : le corps, la gorge verte, la tête, l'œil, la queue."""
    d.ellipse([x - 8, y - 5, x + 8, y + 5], fill=B)
    d.ellipse([x + 4 * sens - 3, y - 9, x + 4 * sens + 4, y - 2], fill=B)
    d.polygon([(x + 2 * sens, y - 4), (x + 6 * sens, y - 3), (x + 4 * sens, y + 1)], fill=V)
    d.point((x + 6 * sens, y - 6), fill=N)
    d.polygon([(x + 8 * sens, y - 6), (x + 11 * sens, y - 5), (x + 8 * sens, y - 4)], fill=V)
    d.polygon([(x - 7 * sens, y), (x - 15 * sens, y - 3), (x - 13 * sens, y + 3)], fill=B)
    d.arc([x - 6, y - 4, x + 4, y + 4], 200, 330, fill=N) if sens == 1 else d.arc([x - 4, y - 4, x + 6, y + 4], 210, 340, fill=N)
    d.line([(x - 2, y + 5), (x - 2, y + 7)], fill=V); d.line([(x + 2, y + 5), (x + 2, y + 7)], fill=V)


def mail():
    """La messagerie (la Volière) : une grande cage dorée au dôme ajouré, trois pigeons voyageurs perchés,
    et sur le plancher de la cage une enveloppe piégée, verte, qui luit."""
    im, d = toile()
    ciel(d, 150, graine=8, n=22, voile=0.45)
    d.line([(88, 0), (88, 8)], fill=B, width=2)
    d.ellipse([84, 6, 92, 14], outline=B, width=2)
    # le dôme et les barreaux
    d.chord([26, 12, 150, 72], 180, 360, fill=N)
    halo(d, 88, 124, 20, V, 0.6, 12)
    for x in range(30, 148, 10):
        f = abs(x - 88) / 62
        ytop = 42 - 30 * math.sqrt(max(0, 1 - f * f))
        d.line([(x, ytop), (x, 140)], fill=B if x < 100 else V, width=2 if x < 100 else 1)
    d.arc([26, 12, 150, 72], 180, 360, fill=B, width=3)
    for y in (42, 90):
        d.line([(26, y), (150, y)], fill=B, width=2)
    d.line([(26, 42), (26, 140)], fill=B, width=3); d.line([(150, 42), (150, 140)], fill=V, width=3)
    # les perchoirs et les pigeons
    for (x, y, s) in ((54, 84, 1), (98, 62, -1), (120, 104, 1)):
        d.line([(x - 18, y + 6), (x + 18, y + 6)], fill=B, width=2)
        pigeon(d, x, y, s)
    # l'enveloppe piégée
    d.rectangle([70, 116, 106, 136], fill=V)
    d.line([(70, 116), (88, 128), (106, 116)], fill=N, width=2)
    d.line([(70, 136), (82, 126)], fill=N); d.line([(106, 136), (94, 126)], fill=N)
    d.rectangle([84, 128, 92, 133], fill=N); d.rectangle([86, 130, 90, 131], fill=B)
    # le socle et le sol
    d.rectangle([18, 140, 158, 148], fill=B); d.line([(18, 148), (158, 148)], fill=V)
    d.rectangle([0, 150, W, H], fill=V)
    degrade(d, 0, 150, W, 158, N, 0.6, 0.0)
    return im


def poteau_fleche(d, x, y, sens, texte_c=B, h=50):
    """Un poteau indicateur en bois et sa flèche (sens 1 : vers la droite)."""
    d.rectangle([x - 2, y, x + 2, y + h], fill=B); d.line([(x + 2, y), (x + 2, y + h)], fill=V)
    if sens == 1:
        d.polygon([(x - 6, y + 4), (x + 22, y + 4), (x + 30, y + 10), (x + 22, y + 16), (x - 6, y + 16)], fill=texte_c)
        d.line([(x - 6, y + 16), (x + 22, y + 16), (x + 30, y + 10)], fill=N)
    else:
        d.polygon([(x + 6, y + 4), (x - 22, y + 4), (x - 30, y + 10), (x - 22, y + 16), (x + 6, y + 16)], fill=texte_c)
        d.line([(x + 6, y + 16), (x - 22, y + 16), (x - 30, y + 10)], fill=N)
    for k in range(2):
        d.line([(x - 18 * sens + k * 0, y + 8 + k * 4), (x + 14 * sens, y + 8 + k * 4)], fill=N)


def dns():
    """L'Oracle des Noms (le serveur DNS) : un grand œil qui veille sur un autel de pierre, ses rayons dans la nuit,
    et deux poteaux indicateurs qui montrent les chemins (l'un d'eux, vert, a été faussé)."""
    im, d = toile()
    ciel(d, 128, graine=21, n=24, voile=0.4)
    halo(d, 88, 54, 62, V, 0.45, 50)
    # les rayons
    for a in range(196, 345, 18):
        x = 88 + 36 * math.cos(math.radians(a)); y = 54 + 30 * math.sin(math.radians(a))
        x2 = 88 + 56 * math.cos(math.radians(a)); y2 = 54 + 48 * math.sin(math.radians(a))
        d.line([(x, y), (x2, y2)], fill=B, width=2)
    # l'œil : le blanc, l'iris vert, la pupille, deux reflets, les paupières
    d.ellipse([56, 34, 120, 76], fill=B)
    d.ellipse([72, 38, 104, 72], fill=V)
    d.ellipse([80, 46, 96, 64], fill=N)
    d.rectangle([83, 49, 86, 52], fill=B); d.point((92, 59), fill=B)
    d.arc([56, 30, 120, 80], 200, 340, fill=N, width=2)
    d.arc([56, 30, 120, 80], 20, 160, fill=V, width=2)
    # la colline, l'autel en volume
    d.polygon([(0, 128), (60, 122), (120, 124), (176, 120), (176, 170), (0, 170)], fill=V)
    d.line([(0, 128), (60, 122), (120, 124), (176, 120)], fill=B)
    degrade(d, 52, 134, 132, 140, N, 0.6, 0.0)
    d.polygon([(48, 82), (124, 82), (132, 88), (56, 88)], fill=B)
    d.polygon([(124, 82), (132, 88), (132, 92), (124, 88)], fill=V)
    d.rectangle([48, 84, 124, 90], fill=B); d.line([(48, 90), (124, 90)], fill=N)
    d.polygon([(56, 90), (116, 90), (110, 132), (62, 132)], fill=B)
    d.polygon([(116, 90), (124, 88), (118, 130), (110, 132)], fill=V)
    pierres(d, 64, 94, 108, 128, 6, 12, graine=6)
    d.rectangle([54, 132, 122, 136], fill=B)
    # les poteaux indicateurs
    poteau_fleche(d, 152, 94, 1, B)
    poteau_fleche(d, 152, 112, -1, V, 30)
    poteau_fleche(d, 22, 98, -1, B)
    return im


def parefeu():
    """La Muraille (le pare-feu) : un rempart crénelé entre deux tours, sous la lune ; au milieu, la porte
    et sa herse levée (le pare-feu désactivé), la route qui entre librement."""
    im, d = toile()
    ciel(d, 60, graine=31, n=18, voile=0.45)
    halo(d, 148, 20, 18, V, 0.5)
    d.ellipse([140, 12, 156, 28], fill=B); d.ellipse([146, 10, 162, 26], fill=N)
    # le rempart, ses créneaux, son chemin de ronde
    pierres(d, 0, 56, W - 1, 140, 8, 18, graine=2)
    creneaux(d, 0, W, 56, 10, 12)
    d.line([(0, 56), (W, 56)], fill=N)
    d.line([(0, 66), (W, 66)], fill=V)
    # les deux tours, en volume
    for x in (8, 132):
        pierres(d, x, 36, x + 36, 140, 8, 12, graine=x)
        d.rectangle([x + 26, 36, x + 36, 140], fill=V)
        for y in range(44, 140, 8):
            d.line([(x + 26, y), (x + 36, y)], fill=N)
        creneaux(d, x - 2, x + 38, 36, 8, 8)
        d.rectangle([x - 2, 32, x + 38, 36], fill=B)
        d.rectangle([x + 14, 60, x + 20, 72], fill=N); d.rectangle([x + 15, 62, x + 19, 70], fill=V)
    # la porte et sa herse levée, qui laisse tout passer
    arche(d, 58, 72, 118, 140, N, B, 3)
    halo(d, 88, 128, 26, V, 0.4, 18, dans=lambda xx, yy: 61 <= xx <= 115)
    for x in range(64, 116, 8):
        d.line([(x, 76), (x, 98)], fill=V, width=2)
        d.polygon([(x - 2, 98), (x + 2, 98), (x, 103)], fill=V)
    for y in range(80, 98, 7):
        d.line([(61, y), (115, y)], fill=V, width=2)
    d.line([(58, 76), (118, 76)], fill=B, width=2)
    # la route, en perspective
    d.rectangle([0, 140, W, H], fill=V)
    d.line([(0, 140), (W, 140)], fill=B)
    d.polygon([(62, 140), (114, 140), (140, H), (36, H)], fill=B)
    for k in range(4):
        y = 144 + k * k * 2 + k * 3
        d.line([(62 - (y - 140) * 26 / 30, y), (114 + (y - 140) * 26 / 30, y)], fill=N)
    degrade(d, 0, 140, W, 148, N, 0.5, 0.0)
    return im


def coffret(d, x, y, w=22, h=16, p=5, sceau=True):
    """Un coffret scellé en volume : le couvercle, une ferrure, le sceau vert."""
    boite3d(d, x, y, w, h, p, face=B, cote=V, dessus=B)
    d.line([(x, y + 5), (x + w, y + 5)], fill=N)
    d.line([(x + w, y + 5), (x + w + p, y + 5 - p)], fill=N)
    d.rectangle([x + 3, y, x + 5, y + h], fill=N); d.rectangle([x + w - 5, y, x + w - 3, y + h], fill=N)
    if sceau:
        d.ellipse([x + w // 2 - 4, y + 7, x + w // 2 + 4, y + 15], fill=V)
        d.point((x + w // 2, y + 11), fill=N)


def sauvegarde():
    """Le Reliquaire (le serveur de sauvegarde) : des coffrets scellés sur des étagères, chacun avec son sceau vert ;
    devant, sur un socle sous la lumière, le coffret ouvert qui attend les preuves."""
    im, d = toile()
    salle(d, 20, 10, 156, 104)
    for r in range(3):
        y = 16 + r * 29
        d.rectangle([24, y + 24, 152, y + 27], fill=B); d.line([(24, y + 28), (152, y + 28)], fill=V)
        for k in range(4):
            coffret(d, 30 + k * 30, y + 6, 20, 17, 4)
    # le socle et le coffret ouvert
    degrade(d, 52, 160, 126, 166, N, 0.7, 0.0)
    boite3d(d, 62, 134, 52, 26, 8, face=B, cote=V, dessus=B)
    d.line([(62, 138), (114, 138)], fill=N)
    halo(d, 92, 116, 30, V, 0.5, 18)
    d.polygon([(76, 116), (112, 116), (116, 98), (80, 98)], fill=B)              # le couvercle ouvert, rabattu
    d.polygon([(79, 114), (109, 114), (112, 101), (82, 101)], fill=V)
    d.line([(76, 116), (112, 116)], fill=N)
    boite3d(d, 70, 120, 36, 14, 6, face=B, cote=V, dessus=N)
    d.line([(70, 120), (76, 114), (112, 114), (106, 120)], fill=B)
    d.rectangle([73, 120, 75, 134], fill=N); d.rectangle([101, 120, 103, 134], fill=N)
    d.ellipse([84, 123, 92, 131], fill=V); d.point((88, 127), fill=N)
    return im


def imprimante():
    """La Presse (l'imprimante du couloir) : une presse de bois et de fer à vis et à volant, une feuille encore
    humide sur le plateau, d'autres qui sèchent sur un fil ; elle a une mémoire."""
    im, d = toile()
    salle(d, 24, 12, 152, 100)
    # le fil et les feuilles qui sèchent
    d.line([(26, 24), (150, 22)], fill=B)
    for x in (32, 50, 126, 140):
        d.polygon([(x, 23), (x + 12, 23), (x + 12, 40), (x, 40)], fill=B)
        d.line([(x + 2, 28), (x + 10, 28)], fill=N); d.line([(x + 2, 32), (x + 8, 32)], fill=N)
        d.rectangle([x + 5, 21, x + 7, 24], fill=V)
    # la presse : deux montants, la traverse, la vis, le volant, le plateau
    degrade(d, 34, 150, 142, 156, N, 0.7, 0.0)
    for x in (42, 124):
        d.rectangle([x, 40, x + 10, 150], fill=B); d.line([(x + 10, 40), (x + 10, 150)], fill=V)
        d.line([(x + 3, 46), (x + 3, 146)], fill=N)
    d.rectangle([38, 34, 138, 46], fill=B); d.line([(38, 46), (138, 46)], fill=N); d.line([(38, 42), (138, 42)], fill=V)
    for y in range(46, 76, 4):
        d.line([(84, y), (92, y + 2)], fill=B, width=2)
    d.ellipse([60, 20, 116, 34], outline=B, width=3)
    for a in (0, 60, 120):
        x = 88 + 26 * math.cos(math.radians(a)); y = 27 + 6 * math.sin(math.radians(a))
        d.line([(88 - (x - 88), 27 - (y - 27)), (x, y)], fill=V)
    d.rectangle([84, 20, 92, 46], fill=B)
    d.rectangle([58, 76, 118, 86], fill=B); d.line([(58, 86), (118, 86)], fill=V)
    boite3d(d, 50, 106, 76, 10, 6, face=B, cote=V, dessus=B)
    # la feuille humide, avec ses lignes (une, verte : le document oublié)
    halo(d, 88, 128, 28, V, 0.35, 12)
    d.polygon([(66, 116), (110, 116), (120, 140), (56, 140)], fill=B)
    for k in range(4):
        d.line([(68 - k * 2, 120 + k * 5), (108 + k * 2 - (k * 7) % 10, 120 + k * 5)], fill=N if k != 1 else V)
    d.rectangle([60, 141, 118, 150], fill=B); d.line([(60, 150), (118, 150)], fill=N)
    return im


def badgeuse():
    """Le Portail des Badges : une grille de fer forgé entre deux piliers, et la borne où l'on présente son badge,
    dont l'écran luit dans la nuit."""
    im, d = toile()
    ciel(d, 128, graine=41, n=20, voile=0.4)
    d.polygon([(0, 128), (W, 128), (W, H), (0, H)], fill=V)
    d.line([(0, 128), (W, 128)], fill=B)
    d.polygon([(52, 128), (96, 128), (120, H), (28, H)], fill=B)
    for k in range(4):
        y = 132 + k * k * 2 + k * 3
        d.line([(52 - (y - 128) * 24 / 42, y), (96 + (y - 128) * 24 / 42, y)], fill=N)
    # les piliers et leurs boules
    for x in (16, 120):
        pierres(d, x, 34, x + 14, 132, 8, 8, graine=x)
        d.rectangle([x + 10, 34, x + 14, 132], fill=V)
        d.rectangle([x - 2, 28, x + 16, 34], fill=B)
        d.ellipse([x + 1, 16, x + 13, 28], fill=B); d.chord([x + 1, 16, x + 13, 28], 300, 120, fill=V)
    # la grille : barreaux à pointes, arc, volutes
    d.arc([30, 10, 120, 60], 180, 360, fill=B, width=3)
    for x in range(36, 120, 9):
        f = abs(x - 75) / 45
        ytop = 35 - 22 * math.sqrt(max(0, 1 - f * f))
        d.line([(x, ytop), (x, 130)], fill=B, width=2)
        d.polygon([(x - 2, ytop), (x + 2, ytop), (x, ytop - 5)], fill=B)
    for y in (72, 112):
        d.line([(30, y), (120, y)], fill=B, width=3)
    for x in range(40, 116, 18):
        d.arc([x, 76, x + 12, 88], 0, 360, fill=V)
    d.line([(75, 36), (75, 130)], fill=V, width=2)
    # la borne à badge, en volume, et son écran allumé
    halo(d, 154, 88, 18, V, 0.5)
    boite3d(d, 144, 70, 20, 62, 5, face=B, cote=V, dessus=B)
    d.rectangle([148, 76, 160, 92], fill=N); d.rectangle([150, 78, 158, 90], fill=V)
    d.ellipse([151, 80, 157, 86], fill=B); d.point((154, 83), fill=V)
    d.rectangle([148, 100, 160, 104], fill=N); d.rectangle([150, 101, 152, 103], fill=V)
    return im


def plume_noire(d, x, y, l=22, c=N, bord=B):
    """La plume noire du Corbeau, posée en biais : un liseré blanc, la tige, les barbes."""
    d.polygon([(x, y), (x + l, y - l * 0.35), (x + l + 4, y - l * 0.3), (x + 4, y + 3)], fill=c)
    d.line([(x, y), (x + l, y - l * 0.35)], fill=bord)
    d.line([(x + 4, y + 3), (x + l + 4, y - l * 0.3)], fill=bord)
    d.line([(x - 5, y + 3), (x + l + 2, y - l * 0.32)], fill=V)


def poste():
    """Le poste-47 (le Nid du Corbeau) : un poste de travail ordinaire, une cape noire qui pend au dossier
    de la chaise sur un sweat du BDE, un nid de câbles, et une plume noire oubliée sur le bureau."""
    im, d = toile()
    salle(d, 24, 12, 152, 96)
    neon(d, 70, 106, 4, 0.3, 8)
    ecran_crt(d, 40, 34, 58, 42, ("$_",))
    # le bureau en volume
    degrade(d, 14, 140, 140, 146, N, 0.6, 0.0)
    d.polygon([(10, 96), (140, 96), (148, 90), (18, 90)], fill=B)
    d.rectangle([10, 96, 140, 102], fill=B); d.line([(10, 102), (140, 102)], fill=N)
    d.polygon([(140, 96), (148, 90), (148, 96), (140, 102)], fill=V)
    for x in (14, 134):
        d.rectangle([x, 102, x + 4, 140], fill=B); d.line([(x + 4, 102), (x + 4, 140)], fill=V)
    # le nid de câbles et la plume
    d.ellipse([56, 84, 94, 96], fill=B)
    for k in range(5):
        d.arc([58 + k * 2, 84 + k, 92 - k * 2, 96 - k], 180, 360, fill=N)
    d.ellipse([72, 86, 78, 92], fill=V)
    plume_noire(d, 20, 92, 22)
    # la chaise, le sweat vert du BDE et la cape noire
    d.rectangle([118, 58, 150, 64], fill=B)
    d.polygon([(116, 64), (152, 64), (156, 118), (112, 118)], fill=V)
    d.rectangle([140, 80, 150, 90], fill=N); d.rectangle([141, 81, 149, 89], fill=V)
    d.line([(152, 64), (156, 118)], fill=B)
    d.polygon([(112, 60), (136, 60), (140, 98), (134, 128), (120, 122), (104, 126)], fill=N)
    d.line([(112, 60), (104, 126), (120, 122), (134, 128), (140, 98), (136, 60)], fill=B)
    d.line([(120, 66), (114, 118)], fill=V); d.line([(128, 66), (128, 120)], fill=V)
    d.polygon([(112, 60), (124, 68), (136, 60)], fill=B); d.polygon([(116, 61), (124, 66), (132, 61)], fill=N)
    d.rectangle([128, 128, 132, 150], fill=B)
    d.line([(112, 152), (148, 150)], fill=B, width=2)
    return im


# ------------------------------------------------------------------
# Deux portraits et un objet pour l'Annexe
# ------------------------------------------------------------------

def _grille_vers_toile(dessin):
    """Un personnage dessiné dans la grille 88 x 85 des portraits (dessiner_panne.perso), posé en x2 sur la toile."""
    from PIL import Image
    from dessiner_lieux import PAL
    g = Image.new('P', (88, 85), N); g.putpalette(PAL); gd = ImageDraw.Draw(g)
    def r(x0, y0, x1, y1, c): gd.rectangle([x0, y0, x1, y1], fill=c)
    dessin(r)
    im = g.resize((W, H), Image.NEAREST)
    return im, ImageDraw.Draw(im)


def gaspard():
    """Gaspard, le régisseur de l'Annexe : bonnet vert, tablier vert à poche, un trousseau de clés à la ceinture,
    une montre qu'il regarde en tapant du pied. Même grille et même style que les autres personnages."""
    from dessiner_bastion import tete
    from dessiner_academie import bras
    from dessiner_panne import sol_tirets
    def dessin(r):
        r(36, 6, 51, 12, V); r(35, 11, 52, 12, V); r(37, 7, 50, 7, B); r(41, 4, 46, 6, V)       # le bonnet
        tete(r, 12, V)
        r(40, 26, 47, 26, N)                                                             # la bouche pincée
        r(35, 33, 52, 54, B)                                                             # la chemise
        r(37, 36, 50, 56, V); r(37, 36, 50, 36, B); r(36, 33, 37, 36, V); r(50, 33, 51, 36, V)   # le tablier
        r(40, 44, 47, 49, N); r(41, 45, 46, 45, V)                                       # la poche
        bras(r, True, True, 36)
        r(56, 47, 58, 49, B); r(59, 49, 64, 51, B)                                       # l'anneau du trousseau
        for k, x in enumerate((58, 61, 64)):
            r(x, 52, x + 1, 58, V if k != 1 else B); r(x, 58, x + 2, 59, V if k != 1 else B)
        r(29, 44, 33, 47, V); r(30, 45, 32, 46, N)                                       # la montre au poignet
        r(38, 57, 41, 64, B); r(46, 57, 49, 62, B); r(39, 58, 40, 63, N); r(47, 58, 48, 61, N)
        r(36, 65, 42, 66, V); r(45, 62, 51, 63, V)                                       # le pied qui tape
        for k in range(3):
            r(53 + k * 3, 60 - k, 54 + k * 3, 60 - k, B)
        sol_tirets(r, 68)
    im, d = _grille_vers_toile(dessin)
    return im


def boitier():
    """Le boîtier scotché sous la table : le faux point d'accès, vu d'en dessous, avec son antenne et ses voyants."""
    im, d = toile()
    # le dessous de la table, en perspective (les planches qui fuient)
    d.polygon([(0, 8), (W, 8), (W, 40), (0, 40)], fill=B)
    for x in range(-40, W + 40, 22):
        d.line([(x, 8), (88 + (x - 88) * 1.4, 40)], fill=N)
    d.rectangle([0, 40, W, 44], fill=V); d.line([(0, 44), (W, 44)], fill=N)
    degrade(d, 0, 44, W, 60, N, 0, 0)
    # les pieds de la table
    for x in (14, 156):
        d.rectangle([x, 44, x + 6, 170], fill=B); d.line([(x + 6, 44), (x + 6, 170)], fill=V)
    # le boîtier, sa lueur, son scotch
    halo(d, 88, 66, 48, V, 0.38, 28)
    boite3d(d, 50, 48, 72, 36, 6, face=B, cote=V, dessus=B)
    d.rectangle([54, 52, 118, 80], fill=N)
    d.text((62, 56), "FREE", fill=B)
    for k, x in enumerate((62, 72, 82)):
        d.rectangle([x, 72, x + 4, 75], fill=V)
    d.rectangle([96, 72, 112, 75], fill=B)
    d.polygon([(38, 40), (134, 40), (134, 46), (38, 46)], fill=V)
    d.line([(38, 46), (134, 46)], fill=N)
    for x in range(42, 134, 7):
        d.point((x, 43), fill=N)
    # l'antenne et ses ondes
    d.line([(118, 52), (142, 72)], fill=B, width=3)
    d.ellipse([139, 69, 145, 75], fill=B)
    for k in range(3):
        r = 8 + k * 7
        d.arc([142 - r, 72 - r, 142 + r, 72 + r], 290, 70, fill=V if k != 1 else B, width=2)
    # le sol, loin dessous
    d.polygon([(0, 130), (W, 130), (W, H), (0, H)], fill=V)
    degrade(d, 0, 130, W, 146, N, 0.7, 0.0)
    for x in range(0, W, 16):
        d.line([(x, 130), (88 + (x - 88) * 1.6, H)], fill=N)
    return im


def maison3d(d, x, y, w=22, h=22, num=None, c=B, lumiere=True):
    """Une maison de face, en volume : le toit, le pignon, le mur de côté dans l'ombre, la porte et son numéro."""
    d.polygon([(x + w, y), (x + w + 5, y - 3), (x + w + 5, y + h - 3), (x + w, y + h)], fill=V)
    d.polygon([(x + w // 2, y - 12), (x + w // 2 + 5, y - 15), (x + w + 7, y - 3), (x + w + 2, y)], fill=V)
    d.line([(x + w // 2, y - 12), (x + w + 2, y)], fill=N)
    d.polygon([(x - 2, y), (x + w // 2, y - 12), (x + w + 2, y)], fill=c)
    d.rectangle([x, y, x + w, y + h], fill=c)
    d.line([(x - 2, y), (x + w + 2, y)], fill=N)
    d.rectangle([x + w // 2 - 4, y + h - 10, x + w // 2 + 4, y + h], fill=N)
    if lumiere:
        d.point((x + w // 2 + 2, y + h - 5), fill=V)
    if num:
        d.rectangle([x + 1, y + 2, x + w - 1, y + 10], fill=N)
        d.text((x + (w - d.textlength(num)) / 2, y + 1), num, fill=V)


def plan_rue():
    """Une adresse IP comme une adresse postale : la rue 10.0.93, les maisons et leurs numéros, le panneau .0,
    le crieur .255, le Bureau de Poste .254 (la passerelle), sous un ciel de soir."""
    im, d = toile()
    ciel(d, 92, graine=17, n=14, voile=0.5, ymin=22)
    d.rectangle([22, 4, 154, 20], fill=B); d.line([(22, 20), (154, 20)], fill=V)
    texte_centre(d, 8, "RUE 10.0.93.0/24", N)
    # le trottoir, la rue en perspective et ses pointillés
    d.rectangle([0, 112, W, 120], fill=B); d.line([(0, 120), (W, 120)], fill=N)
    d.rectangle([0, 121, W, H], fill=V)
    degrade(d, 0, 121, W, 128, N, 0.5, 0.0)
    for x in range(4, W, 16):
        d.rectangle([x, 138, x + 8, 140], fill=B)
    d.rectangle([4, 46, 6, 112], fill=B)                       # le panneau de la rue, .0
    d.rectangle([0, 38, 20, 48], fill=B); d.text((4, 38), ".0", fill=N)
    for i, (x, num) in enumerate([(10, ".1"), (38, ".2"), (70, ".20"), (100, ".253")]):
        maison3d(d, x, 90, w=26 if num == ".253" else 22, h=22, num=num)
    d.text((62, 100), "..", fill=B); d.text((93, 100), "..", fill=B)
    # le Bureau de Poste, la passerelle .254
    d.polygon([(170, 54), (176, 50), (176, 108), (170, 112)], fill=V)
    d.polygon([(136, 52), (154, 36), (172, 52)], fill=B); d.line([(136, 52), (172, 52)], fill=N)
    d.rectangle([138, 52, 170, 112], fill=B)
    d.rectangle([134, 58, 174, 68], fill=V); d.text((138, 58), "POSTE", fill=N)
    d.rectangle([148, 92, 160, 112], fill=N); d.line([(154, 92), (154, 112)], fill=B)
    for x in (142, 158):
        d.rectangle([x, 74, x + 8, 84], fill=N); d.rectangle([x + 1, 75, x + 7, 83], fill=V); d.line([(x + 4, 74), (x + 4, 84)], fill=N)
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
    """Une rue /24 coupée en quatre quartiers de /26 : .0, .64, .128, .192. Le premier (l'Annexe) est en vert."""
    im, d = toile()
    d.rectangle([14, 2, 162, 16], fill=B); d.line([(14, 16), (162, 16)], fill=V)
    texte_centre(d, 5, "10.0.94.0/24 = 4 x /26", N)
    d.rectangle([84, 24, 92, 164], fill=B); d.rectangle([8, 90, 168, 98], fill=B)   # les rues entre les quartiers
    for y in range(28, 164, 8):
        d.line([(88, y), (88, y + 3)], fill=N)
    for x in range(12, 168, 8):
        d.line([(x, 94), (x + 3, 94)], fill=N)
    cases = [(8, 24, ".0"), (92, 24, ".64"), (8, 98, ".128"), (92, 98, ".192")]
    for k, (x, y, nom) in enumerate(cases):
        fond = V if k == 0 else N
        d.rectangle([x, y, x + 76, y + 66], fill=fond, outline=B, width=2)
        for j in range(2):
            for i in range(3):
                hx, hy = x + 8 + i * 22, y + 28 + j * 20
                d.polygon([(hx + 14, hy), (hx + 18, hy - 3), (hx + 18, hy + 7), (hx + 14, hy + 10)], fill=N if k == 0 else V)
                d.polygon([(hx - 1, hy), (hx + 7, hy - 6), (hx + 15, hy)], fill=B)
                d.rectangle([hx, hy, hx + 14, hy + 10], fill=B)
                d.rectangle([hx + 5, hy + 4, hx + 9, hy + 10], fill=fond if k == 0 else N)
                d.line([(hx - 1, hy), (hx + 15, hy)], fill=N)
        d.rectangle([x + 4, y + 4, x + 8 + d.textlength(nom), y + 14], fill=N)
        d.text((x + 6, y + 4), nom, fill=B)
    return im


def cartographe():
    """Nour, la cartographe du réseau : cheveux verts au carré, lunettes, un crayon sur l'oreille, et le plan
    des adresses déroulé entre ses mains (une grille, une rue verte, des maisons)."""
    im, d = toile()
    halo(d, 88, 46, 64, V, 0.2, 50)
    # les épaules et le col
    d.polygon([(40, 80), (136, 80), (150, 130), (26, 130)], fill=B)
    d.polygon([(70, 76), (88, 98), (106, 76)], fill=V); d.polygon([(76, 76), (88, 90), (100, 76)], fill=B)
    d.line([(88, 90), (88, 128)], fill=N)
    d.line([(40, 80), (26, 130)], fill=V)
    # le cou, le visage
    d.rectangle([80, 64, 96, 80], fill=B); d.line([(80, 74), (96, 74)], fill=N)
    d.rounded_rectangle([62, 14, 114, 70], radius=14, fill=B)
    # les cheveux au carré, une mèche, un reflet
    d.polygon([(58, 34), (62, 12), (76, 6), (102, 6), (116, 14), (120, 34), (120, 62), (112, 62), (112, 28), (96, 22), (74, 26), (64, 30), (64, 62), (56, 62)], fill=V)
    d.line([(76, 9), (100, 9)], fill=B); d.line([(64, 16), (70, 11)], fill=B)
    d.polygon([(64, 30), (86, 22), (74, 34)], fill=V)
    # les lunettes et leurs reflets, les yeux, le sourire
    for x in (66, 92):
        d.rectangle([x, 36, x + 18, 48], outline=N, width=2)
        d.line([(x + 3, 39), (x + 6, 39)], fill=B)
        d.rectangle([x + 7, 41, x + 11, 44], fill=N)
    d.line([(84, 40), (92, 40)], fill=N, width=2)
    d.line([(88, 48), (88, 52)], fill=N)
    d.arc([78, 50, 98, 62], 20, 160, fill=N, width=2)
    # le crayon sur l'oreille
    d.line([(112, 30), (128, 12)], fill=N, width=4); d.line([(112, 30), (127, 12)], fill=B, width=2)
    d.polygon([(126, 10), (131, 6), (130, 12)], fill=V)
    # le plan déroulé : une grille, une rue verte, des maisons
    d.rectangle([28, 98, 148, 162], fill=B, outline=N, width=2)
    d.ellipse([18, 94, 36, 166], fill=B, outline=N, width=2); d.ellipse([140, 94, 158, 166], fill=V, outline=N, width=2)
    d.arc([22, 104, 32, 156], 90, 270, fill=N)
    for x in range(40, 140, 16):
        d.line([(x, 104), (x, 156)], fill=N)
    for y in range(112, 156, 12):
        d.line([(36, y), (144, y)], fill=N)
    d.rectangle([36, 126, 144, 134], fill=V); d.line([(36, 130), (144, 130)], fill=B)
    for x in range(44, 140, 16):
        d.polygon([(x - 1, 118), (x + 2, 115), (x + 5, 118)], fill=V); d.rectangle([x, 118, x + 4, 122], fill=V)
    degrade(d, 28, 156, 148, 162, N, 0.0, 0.5)
    # les mains qui tiennent le plan
    for x in (30, 140):
        d.rounded_rectangle([x - 4, 112, x + 6, 124], radius=3, fill=B, outline=N)
    return im


def forteresse():
    """La Forteresse de l'épreuve finale : un château sur son rocher, sous la lune ; la bannière de la sorcière Myriam
    (un chapeau pointu) flotte sur le donjon, trois sceaux verts luisent sur les murs, le chemin monte à la porte."""
    im, d = toile()
    ciel(d, 128, graine=9, n=30, voile=0.5)
    halo(d, 150, 22, 22, V, 0.5)
    d.ellipse([142, 14, 158, 30], fill=B); d.ellipse([148, 12, 164, 28], fill=N)
    # la colline et le rocher, éclairés de gauche
    d.polygon([(0, 140), (40, 128), (88, 122), (136, 128), (176, 138), (176, 170), (0, 170)], fill=V)
    d.line([(0, 140), (40, 128), (88, 122), (136, 128), (176, 138)], fill=B)
    d.polygon([(28, 134), (50, 104), (126, 104), (148, 134)], fill=B)
    d.polygon([(100, 104), (126, 104), (148, 134), (112, 134)], fill=V)
    for (a, b, c_, e) in ((40, 120, 56, 112), (70, 128, 84, 118), (118, 116, 132, 126), (96, 110, 108, 120)):
        d.line([(a, b), (c_, e)], fill=N)
    # les murs, le donjon, les tours d'angle (côté droit dans l'ombre)
    briques(d, 44, 62, 132, 106)
    creneaux(d, 44, 132, 62, 8, 8)
    briques(d, 72, 26, 104, 62)
    creneaux(d, 72, 104, 26, 7, 5)
    for x in (32, 132):
        briques(d, x, 44, x + 14, 106)
        creneaux(d, x, x + 14, 44, 6, 4)
    for (x0, y0, x1, y1) in ((96, 26, 104, 62), (124, 62, 132, 106), (140, 44, 146, 106)):
        d.rectangle([x0, y0, x1, y1], fill=V)
        for y in range(y0, y1, 6):
            d.line([(x0, y), (x1, y)], fill=N)
    # les fenêtres allumées
    for (x, y) in ((84, 36), (84, 48), (60, 76), (112, 76), (38, 60), (136, 60)):
        d.rectangle([x, y, x + 4, y + 6], fill=N); d.rectangle([x + 1, y + 1, x + 3, y + 5], fill=V)
    # la porte et le chemin qui y monte
    arche(d, 78, 84, 98, 106, fill=N)
    halo(d, 88, 100, 10, V, 0.6, 8, dans=lambda x, y: 80 <= x <= 96 and y >= 88)
    d.polygon([(82, 106), (94, 106), (118, 170), (58, 170)], fill=B)
    for k in range(5):
        y = 112 + k * k * 2 + k * 4
        d.line([(82 - (y - 106) * 24 / 64, y), (94 + (y - 106) * 24 / 64, y)], fill=N)
    # la bannière de Myriam : un chapeau pointu vert sur fond noir
    d.line([(88, 26), (88, 4)], fill=B, width=2)
    d.polygon([(89, 4), (116, 6), (112, 12), (116, 18), (89, 16)], fill=N, outline=B)
    d.polygon([(97, 15), (102, 7), (107, 15)], fill=V)
    d.line([(95, 15), (109, 15)], fill=V, width=2)
    # les trois sceaux
    for i, x in enumerate((56, 120, 88)):
        y = 72 if i < 2 else 40
        if i == 2:
            y, x = 56, 88
        halo(d, x, y, 9, V, 0.6)
        d.ellipse([x - 5, y - 5, x + 5, y + 5], fill=V, outline=N)
        d.point((x, y), fill=B)
    return im


def sallereseau():
    """La salle réseau : des câbles de toutes les couleurs courent le long des murs dans leurs chemins de câbles,
    jusqu'à une armoire qui clignote ; un administrateur réseau y est à moitié enfoui (on ne voit que ses jambes)."""
    im, d = toile()
    salle(d, 26, 12, 150, 102)
    # les chemins de câbles le long des murs, et les câbles qui y courent
    for (xa, ya, xb, yb) in ((0, 14, 26, 24), (176, 14, 150, 24)):
        d.line([(xa, ya), (xb, yb)], fill=B, width=3)
        d.line([(xa, ya + 4), (xb, yb + 3)], fill=V)
        d.line([(xa, ya + 6), (xb, yb + 4)], fill=B)
    d.rectangle([26, 22, 150, 26], fill=B); d.line([(26, 27), (150, 27)], fill=V); d.line([(26, 29), (150, 29)], fill=B)
    for k, x in enumerate((40, 54, 120, 136)):
        d.line([(x, 30), (x + (k - 1.5) * 4, 40), (88 + (k - 1.5) * 6, 44)], fill=V if k % 2 else B, width=2)
    armoire_reseau(d, 66, 40, 112, 102, ok=True)
    # l'administrateur à moitié dans l'armoire : ses jambes, ses baskets, sa lampe de poche
    degrade(d, 64, 146, 120, 152, N, 0.7, 0.0)
    for (xa, xb) in ((76, 70), (90, 96)):
        d.polygon([(xa, 98), (xa + 10, 98), (xb + 12, 140), (xb, 140)], fill=V)
        d.line([(xa + 10, 98), (xb + 12, 140)], fill=B)
        d.rectangle([xb - 2, 140, xb + 13, 147], fill=B); d.line([(xb - 2, 147), (xb + 13, 147)], fill=N)
        d.line([(xb + 1, 143), (xb + 10, 143)], fill=N)
    d.rectangle([40, 132, 54, 137], fill=B); d.line([(54, 132), (54, 137)], fill=V)
    # des câbles qui traînent au sol
    d.line([(20, 170), (30, 150), (58, 144), (66, 112)], fill=B, width=2)
    d.line([(160, 170), (150, 148), (124, 140), (110, 104)], fill=N, width=2)
    return im


def salleserveurs():
    """La salle des serveurs : il fait froid et ça ronronne ; une allée entre les baies qui fuient vers le fond,
    leurs voyants dans la pénombre, le faux plancher perforé, les néons et le souffle froid de la clim."""
    im, d = toile()
    # le fond de l'allée, le plafond, le sol
    d.rectangle([70, 40, 106, 100], fill=N); d.rectangle([70, 40, 106, 100], outline=B)
    halo(d, 88, 70, 16, B, 0.5, 26)
    d.polygon([(70, 100), (106, 100), (W, H), (0, H)], fill=V)
    for i in range(7):
        d.line([(70 + 36 * i / 6, 100), (-30 + 236 * i / 6, H)], fill=N)
    for k in range(1, 7):
        f = (k / 6) ** 1.6
        y = 100 + 70 * f
        d.line([(70 - 70 * f - 30 * f, y), (106 + 70 * f + 30 * f, y)], fill=N)
    degrade(d, 0, 100, W, 112, N, 0.7, 0.0)
    # trois baies de chaque côté, de plus en plus petites
    for cote in (-1, 1):
        for k in range(3):
            f0 = k / 3; f1 = (k + 1) / 3
            xa = 88 + cote * (82 - 64 * f0 * 0.9); xb = 88 + cote * (82 - 64 * f1 * 0.9)
            ya0 = 4 + 36 * f0 * 0.9; yb0 = 4 + 36 * f1 * 0.9
            ya1 = 168 - 68 * f0 * 0.9; yb1 = 168 - 68 * f1 * 0.9
            d.polygon([(xa, ya0), (xb, yb0), (xb, yb1), (xa, ya1)], fill=N)
            d.line([(xa, ya0), (xb, yb0)], fill=B); d.line([(xa, ya1), (xb, yb1)], fill=B)
            d.line([(xb, yb0), (xb, yb1)], fill=B, width=2); d.line([(xa, ya0), (xa, ya1)], fill=V)
            rnd = random.Random(k * 2 + cote)
            for j in range(12):
                g = (j + 1) / 13
                y0 = ya0 + (ya1 - ya0) * g; y1 = yb0 + (yb1 - yb0) * g
                d.line([(xa, y0), (xb, y1)], fill=V)
                for t in (0.2, 0.35, 0.75):
                    if rnd.random() < 0.6:
                        d.point((xa + (xb - xa) * t, y0 + (y1 - y0) * t - 2), fill=B if rnd.random() < 0.5 else V)
    # les néons et le souffle froid
    for k in range(3):
        y = 2 + k * 10
        w = 30 - k * 7
        d.rectangle([88 - w // 2, y, 88 + w // 2, y + 1], fill=B)
    for x in (60, 116):
        for k in range(3):
            d.arc([x - 6 + k * 4, 120 + k * 8, x + 6 + k * 4, 128 + k * 8], 180, 360, fill=B)
    return im


def baie():
    """Une baie de serveurs, de face : des serveurs empilés, leurs baies à disques, leurs voyants verts et les poignées."""
    im, d = toile()
    salle(d, 34, 8, 142, 150, carreaux=False)
    halo(d, 88, 80, 62, V, 0.3, 76)
    boite3d(d, 50, 14, 70, 140, 8, face=B, cote=V, dessus=B)
    d.rectangle([54, 18, 116, 150], fill=N)
    for r in range(11):
        y = 22 + r * 12
        d.rectangle([56, y, 114, y + 9], fill=B)
        d.line([(56, y + 9), (114, y + 9)], fill=V)
        d.rectangle([57, y + 2, 59, y + 7], fill=N); d.rectangle([111, y + 2, 113, y + 7], fill=N)
        for k in range(6):
            d.rectangle([62 + k * 6, y + 2, 66 + k * 6, y + 7], fill=N)
            d.point((64 + k * 6, y + 4), fill=V if (r + k) % 3 else B)
        d.rectangle([100, y + 3, 102, y + 5], fill=V if r != 6 else B)
        d.rectangle([105, y + 3, 107, y + 5], fill=V)
    d.rectangle([50, 154, 120, 158], fill=B)
    return im


def bde():
    """Le local du BDE : les sweats du bureau des élèves sur leur portant, un canapé qui a connu trois promos,
    une machine à café héroïque, et des cartons empilés jusqu'au plafond."""
    im, d = toile()
    salle(d, 22, 12, 154, 98)
    d.rectangle([22, 16, 133, 26], fill=B); d.line([(22, 26), (133, 26)], fill=V)
    d.text((78 - d.textlength("BUREAU DES ELEVES") / 2, 17), "BUREAU DES ELEVES", fill=N)
    # le portant et les sweats
    d.line([(30, 34), (126, 34)], fill=B, width=2)
    for k, x in enumerate((34, 58, 82, 106)):
        c = V if k % 2 == 0 else B
        d.line([(x + 9, 34), (x + 9, 38)], fill=B)
        d.polygon([(x, 38), (x + 18, 38), (x + 23, 44), (x + 20, 48), (x + 18, 46), (x + 18, 64), (x, 64), (x, 46), (x - 2, 48), (x - 5, 44)], fill=c)
        d.text((x + 9 - d.textlength("BDE") / 2, 48), "BDE", fill=N)
    # les cartons jusqu'au plafond
    for (x, y, w, h) in ((137, 72, 14, 26), (138, 48, 12, 24), (137, 26, 13, 22), (139, 6, 11, 20)):
        boite3d(d, x, y, w, h, 4, face=B, cote=V, dessus=B)
        d.line([(x, y + h // 2), (x + w, y + h // 2)], fill=N)
    # le vieux canapé
    degrade(d, 26, 152, 120, 158, N, 0.6, 0.0)
    d.rounded_rectangle([28, 104, 118, 132], radius=6, fill=V)
    d.rectangle([28, 124, 118, 150], fill=V)
    d.rounded_rectangle([20, 114, 36, 150], radius=4, fill=B); d.rounded_rectangle([110, 114, 126, 150], radius=4, fill=B)
    d.line([(73, 106), (73, 130)], fill=N)
    d.rectangle([36, 130, 110, 136], fill=B); d.line([(73, 130), (73, 136)], fill=N)
    d.line([(44, 112), (50, 118)], fill=N); d.line([(92, 110), (96, 116)], fill=N); d.line([(54, 140), (62, 144)], fill=N)
    d.rectangle([28, 150, 32, 154], fill=B); d.rectangle([114, 150, 118, 154], fill=B)
    # la machine à café héroïque, fumante
    boite3d(d, 140, 104, 20, 44, 4, face=B, cote=V, dessus=B)
    d.rectangle([144, 110, 156, 120], fill=N); d.rectangle([146, 112, 150, 114], fill=V)
    d.rectangle([146, 128, 154, 138], fill=N); d.rectangle([148, 134, 152, 138], fill=B)
    for x in (146, 153):
        d.line([(x, 100), (x - 2, 94), (x, 88)], fill=B)
    return im


def bureau():
    """Le bureau de Laurent : un bureau encombré de piles de copies, un terminal resté allumé, une cape noire jetée
    sur le dossier de la chaise, une fausse barbe blanche au portemanteau, et sa bibliothèque."""
    im, d = toile()
    salle(d, 22, 12, 154, 100)
    bibliotheque(d, 118, 18, 150, 100, 4, 31)
    # le portemanteau et la fausse barbe blanche
    d.rectangle([34, 30, 36, 100], fill=B); d.line([(26, 32), (44, 30)], fill=B, width=2)
    d.polygon([(26, 36), (42, 36), (44, 46), (40, 56), (35, 62), (30, 56), (24, 46)], fill=B)
    d.line([(28, 36), (35, 31), (40, 36)], fill=B)
    for k in range(4):
        d.line([(28 + k * 4, 40), (30 + k * 3, 54 - abs(k - 1.5) * 2)], fill=N)
    d.line([(42, 38), (44, 46)], fill=V)
    # le bureau, les piles de copies, le terminal allumé, la plaque
    degrade(d, 30, 150, 132, 156, N, 0.6, 0.0)
    ecran_crt(d, 66, 66, 40, 28, ("$_",))
    d.polygon([(30, 104), (132, 104), (138, 98), (36, 98)], fill=B)
    d.rectangle([30, 104, 132, 110], fill=B); d.line([(30, 110), (132, 110)], fill=N)
    d.polygon([(132, 104), (138, 98), (138, 104), (132, 110)], fill=V)
    for x in (34, 126):
        d.rectangle([x, 110, x + 4, 150], fill=B); d.line([(x + 4, 110), (x + 4, 150)], fill=V)
    for k in range(6):
        d.rectangle([40 - (k % 2), 96 - k * 3, 60 + (k % 2), 98 - k * 3], fill=B if k % 2 == 0 else V)
        d.line([(40, 98 - k * 3), (60, 98 - k * 3)], fill=N)
    d.text((60, 103), "Laurent", fill=N)
    # la chaise, la cape noire jetée sur son dossier
    d.rectangle([76, 112, 108, 140], fill=B); d.line([(108, 112), (108, 140)], fill=V)
    d.polygon([(72, 110), (112, 110), (116, 146), (98, 140), (86, 148), (68, 144)], fill=N)
    d.line([(72, 110), (68, 144), (86, 148), (98, 140), (116, 146), (112, 110)], fill=B)
    d.line([(80, 114), (78, 140)], fill=V); d.line([(100, 114), (104, 142)], fill=V)
    d.line([(72, 110), (112, 110)], fill=B, width=2)
    return im


def pignon(d, x, y, w, h, c=B, joint=N, fen=V):
    """Une façade flamande à pignon à gradins : la brique, les fenêtres, les marches du pignon."""
    d.rectangle([x, y, x + w, y + h], fill=c)
    marches = 4
    for k in range(marches):
        dx = (w / 2) * (k + 1) / (marches + 1)
        d.rectangle([x + dx, y - 6 * (k + 1), x + w - dx, y - 6 * k], fill=c)
    for yy in range(int(y - 6 * marches), int(y + h), 4):
        d.line([(x, yy), (x + w, yy)], fill=joint)
    for (fx, fy) in ((x + 4, y + 6), (x + w - 10, y + 6), (x + 4, y + 22), (x + w - 10, y + 22)):
        if fy + 8 < y + h:
            d.rectangle([fx, fy, fx + 6, fy + 9], fill=N); d.rectangle([fx + 1, fy + 1, fx + 5, fy + 8], fill=fen)
            d.line([(fx + 3, fy), (fx + 3, fy + 9)], fill=N)


def lille():
    """Le campus de Lille : le beffroi de brique et son horloge, les façades à pignons à gradins,
    un ciel qui hésite (de gros nuages tramés), les pavés de la Grand-Place."""
    im, d = toile()
    degrade(d, 0, 0, W, 90, V, 0.15, 0.45)
    for (x, y, r) in ((30, 22, 16), (52, 18, 12), (120, 30, 18), (146, 24, 13), (100, 14, 10)):
        d.ellipse([x - r, y - r * 0.6, x + r, y + r * 0.6], fill=B)
        d.chord([x - r, y - r * 0.6, x + r, y + r * 0.6], 20, 160, fill=V)
    # le beffroi
    d.rectangle([76, 36, 100, 148], fill=B)
    d.rectangle([94, 36, 100, 148], fill=V)
    for y in range(40, 148, 4):
        d.line([(76, y), (100, y)], fill=N)
    d.polygon([(72, 36), (88, 2), (104, 36)], fill=B); d.polygon([(88, 2), (104, 36), (94, 36)], fill=V)
    d.line([(88, 2), (88, -4)], fill=B)
    for x in (72, 100):
        d.polygon([(x - 4, 40), (x, 28), (x + 4, 40)], fill=B)
    d.ellipse([80, 46, 96, 62], fill=B); d.ellipse([82, 48, 94, 60], fill=N)
    d.line([(88, 54), (88, 49)], fill=B); d.line([(88, 54), (92, 56)], fill=V)
    for y in (72, 92, 112):
        d.rectangle([84, y, 92, y + 10], fill=N); d.rectangle([85, y + 1, 91, y + 9], fill=V)
    arche(d, 80, 128, 96, 148, N, B, 1)
    # les façades à pignons
    pignon(d, 6, 96, 30, 52); pignon(d, 38, 104, 30, 44, c=V, fen=B)
    pignon(d, 108, 100, 30, 48, c=V, fen=B); pignon(d, 140, 94, 32, 54)
    # les pavés
    d.rectangle([0, 148, W, H], fill=B)
    for k in range(4):
        y = 150 + k * k + k * 4
        d.line([(0, y), (W, y)], fill=N)
    for x in range(-40, W + 40, 10):
        d.line([(88 + (x - 88) * 0.6, 148), (x, H)], fill=N)
    return im


def marseille():
    """Le campus de Marseille : du soleil plein le ciel, la Bonne Mère sur sa colline, le port et ses voiliers,
    les reflets sur l'eau, la fenêtre ouverte sur le bruit du port."""
    im, d = toile()
    degrade(d, 0, 0, W, 96, V, 0.0, 0.4)
    halo(d, 136, 30, 40, B, 0.5, 34, ymax=96)
    halo(d, 136, 30, 22, V, 0.9, 20, ymax=96)
    d.ellipse([126, 20, 146, 40], fill=B)
    # la colline et la basilique, sa tour, sa statue
    d.polygon([(0, 96), (20, 70), (46, 58), (70, 66), (96, 96)], fill=N)
    d.line([(0, 96), (20, 70), (46, 58), (70, 66), (96, 96)], fill=B)
    trame(d, 0, 58, 96, 96, V, 0.25)
    d.rectangle([34, 40, 58, 58], fill=B); d.polygon([(34, 40), (46, 32), (58, 40)], fill=B)
    d.rectangle([42, 18, 50, 40], fill=B); d.rectangle([48, 18, 50, 58], fill=V)
    d.rectangle([44, 10, 48, 18], fill=V); d.ellipse([44, 6, 48, 10], fill=V)
    for x in (37, 53):
        arche(d, x - 2, 44, x + 2, 54, N, N, 1)
    # la mer, ses reflets, la jetée et son phare
    d.rectangle([0, 96, W, 150], fill=N)
    rnd = random.Random(5)
    y = 98
    while y < 150:
        p = (y - 96) / 54
        for x in range(-rnd.randint(0, 10), W, 8 + int(p * 12)):
            d.line([(x, y), (x + 2 + int(p * 5), y)], fill=B if rnd.random() < 0.7 else V)
        y += 3 + int(p * 3)
    for k in range(8):
        y = 98 + k * 6
        w = 8 + k * 3
        d.line([(136 - w, y), (136 + w, y)], fill=B)
    d.rectangle([4, 102, 10, 128], fill=B); d.polygon([(2, 102), (7, 94), (12, 102)], fill=V)
    # les voiliers
    for (x, y, h) in ((72, 116, 26), (104, 124, 30), (36, 132, 20)):
        d.polygon([(x - 12, y), (x + 14, y), (x + 10, y + 5), (x - 8, y + 5)], fill=B)
        d.line([(x, y), (x, y - h)], fill=B)
        d.polygon([(x + 1, y - h), (x + 1, y - 2), (x + 14, y - 3)], fill=B)
        d.polygon([(x - 1, y - h + 6), (x - 1, y - 2), (x - 10, y - 3)], fill=V)
        d.line([(x - 8, y + 7), (x + 8, y + 7)], fill=V)
    # le rebord de la fenêtre ouverte, et le quai
    d.rectangle([0, 150, W, H], fill=B)
    d.line([(0, 150), (W, 150)], fill=N); d.line([(0, 156), (W, 156)], fill=V)
    for x in range(0, W, 22):
        d.line([(x, 156), (x, H)], fill=N)
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
    "loc_sallereseau.gif": sallereseau, "loc_salleserveurs.gif": salleserveurs, "loc_baie.gif": baie, "loc_bde.gif": bde,
    "loc_bureau.gif": bureau, "loc_lille.gif": lille, "loc_marseille.gif": marseille,
}
# (item_elfe.gif, Aidan, est dessiné par dessiner_examen.py, avec les autres portraits de l'épreuve finale.)

if __name__ == "__main__":
    noms = sys.argv[1:] or list(DESSINS)
    for nom in noms:
        finir(nom, DESSINS[nom]())
    print(len(noms), "dessins")
