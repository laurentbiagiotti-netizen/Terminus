"""Les décors communs à l'Académie des Arcanes (chapitre 4) et au Bastion (chapitre 5), dans le style poussé du
chapitre 8 (dessiner_port.py) : des trames ordonnées pour la lumière (ciel, halos, rayons), des salles de pierre en
perspective (mur du fond appareillé, murs de côté qui fuient, voûte, dallage), des volumes ombrés et des liserés de
lumière. Trois couleurs seulement : noir, vert, blanc.

Ce module ne dessine aucune image à lui seul : dessiner_academie.py et dessiner_bastion.py s'en servent.
"""
import os, sys, math, random
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from dessiner_lieux import N, V, B, W, H  # noqa: E402


# ------------------------------------------------------------------
# Les trames (les mêmes que dessiner_port.py : trame ordonnée 4 x 4)
# ------------------------------------------------------------------

BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]


def trame(d, x0, y0, x1, y1, c, t):
    """Une trame de densité constante t (0 : rien, 1 : plein)."""
    seuil = t * 16
    for y in range(max(0, int(y0)), min(H, int(y1) + 1)):
        for x in range(max(0, int(x0)), min(W, int(x1) + 1)):
            if BAYER[y % 4][x % 4] < seuil:
                d.point((x, y), fill=c)


def degrade(d, x0, y0, x1, y1, c, t0, t1):
    """Un dégradé vertical tramé, de t0 (en haut) à t1 (en bas)."""
    for y in range(max(0, int(y0)), min(H, int(y1) + 1)):
        seuil = (t0 + (t1 - t0) * (y - y0) / max(1, y1 - y0)) * 16
        for x in range(max(0, int(x0)), min(W, int(x1) + 1)):
            if BAYER[y % 4][x % 4] < seuil:
                d.point((x, y), fill=c)


def halo(d, cx, cy, r, c, t0=0.8, ry=None, ymin=0, ymax=H, sur=None, im=None):
    """Un halo tramé, dense au centre, qui s'éteint au bord. sur : ne peint que les pixels de cette couleur (il faut im)."""
    ry = ry or r
    px = im.load() if (sur is not None and im is not None) else None
    for y in range(max(0, int(cy - ry), int(ymin)), min(H, int(cy + ry) + 1, int(ymax) + 1)):
        for x in range(max(0, int(cx - r)), min(W, int(cx + r) + 1)):
            dist = math.hypot((x - cx) / r, (y - cy) / ry)
            if dist < 1 and BAYER[y % 4][x % 4] < t0 * (1 - dist) * 16:
                if px is not None:
                    if px[x, y] == sur:
                        px[x, y] = c
                else:
                    d.point((x, y), fill=c)


def ombrer(im, x0, y0, x1, y1, de, vers, t0, t1=None, sens='v'):
    """Change, par la trame, les pixels de couleur `de` en `vers` (ombre ou lumière sur un volume déjà dessiné).
    Le dégradé va de t0 à t1, de haut en bas (sens 'v') ou de gauche à droite (sens 'h')."""
    px = im.load()
    t1 = t0 if t1 is None else t1
    for y in range(max(0, int(y0)), min(H, int(y1) + 1)):
        for x in range(max(0, int(x0)), min(W, int(x1) + 1)):
            if px[x, y] != de:
                continue
            f = (y - y0) / max(1, y1 - y0) if sens == 'v' else (x - x0) / max(1, x1 - x0)
            if BAYER[y % 4][x % 4] < (t0 + (t1 - t0) * f) * 16:
                px[x, y] = vers


def ombrer_poly(im, pts, de, vers, t):
    """ombrer, mais dans un polygone (une ombre portée au sol, un rayon de lumière)."""
    from PIL import Image, ImageDraw
    m = Image.new('1', (W, H), 0)
    ImageDraw.Draw(m).polygon(pts, fill=1)
    mp, px = m.load(), im.load()
    xs, ys = [p[0] for p in pts], [p[1] for p in pts]
    for y in range(max(0, int(min(ys))), min(H, int(max(ys)) + 1)):
        for x in range(max(0, int(min(xs))), min(W, int(max(xs)) + 1)):
            if mp[x, y] and px[x, y] == de and BAYER[y % 4][x % 4] < t * 16:
                px[x, y] = vers


def rayon(im, d, pts, c=B, t0=0.35, t1=0.05, sur=N):
    """Un rayon de lumière tramé dans un polygone (du haut vers le bas il s'éteint), qui ne peint que le noir."""
    from PIL import Image, ImageDraw
    m = Image.new('1', (W, H), 0)
    ImageDraw.Draw(m).polygon(pts, fill=1)
    mp, px = m.load(), im.load()
    ys = [p[1] for p in pts]; xs = [p[0] for p in pts]
    ya, yb = min(ys), max(ys)
    for y in range(max(0, int(ya)), min(H, int(yb) + 1)):
        t = t0 + (t1 - t0) * (y - ya) / max(1, yb - ya)
        for x in range(max(0, int(min(xs))), min(W, int(max(xs)) + 1)):
            if mp[x, y] and px[x, y] == sur and BAYER[y % 4][x % 4] < t * 16:
                px[x, y] = c


def lin(a, b, t):
    return a + (b - a) * t


# ------------------------------------------------------------------
# La salle de pierre en perspective
# ------------------------------------------------------------------

def mur_appareille(d, x0, y0, x1, y1, h=9, w=20, joint=V, graine=1):
    """Un mur de pierres de taille, en joints sur fond noir ; quelques pierres plus claires (une trame)."""
    rnd = random.Random(graine)
    for r, y in enumerate(range(int(y0), int(y1), h)):
        d.line([(x0, y), (x1, y)], fill=joint)
        dec = (w // 2) if r % 2 else 0
        for x in range(int(x0) + dec, int(x1), w):
            d.line([(x, y), (x, min(y + h, y1))], fill=joint)
            if rnd.random() < 0.18:
                trame(d, x + 2, y + 2, min(x + w - 2, x1 - 1), min(y + h - 2, y1 - 1), joint, 0.25)


def salle_pierre(im, d, x0, y0, x1, y1, mur=True, cotes=True, sol=True, plafond='voute', h=10, w=22, graine=1,
                 damier=True, flaque=None, joints=True):
    """Une salle de pierre vue de face : le mur du fond appareillé (x0, y0, x1, y1), les murs de côté dont les assises
    fuient vers lui, une voûte (plafond 'voute'), des poutres ('poutres') ou rien (None), un dallage en perspective
    (damier : une dalle sur deux en vert plein). flaque : (x, largeur) d'une flaque de lumière blanche tramée au sol."""
    d.rectangle([0, 0, W - 1, H - 1], fill=N)
    if mur:
        mur_appareille(d, x0, y0, x1, y1, h, w, V, graine)
    if cotes:
        n = max(3, int((y1 - y0) / h / 2))
        haut = 0 if plafond is None else y0 * 0.35
        for k in range(1, n):
            t = k / n
            d.line([(0, lin(haut, H, t)), (x0, lin(y0, y1, t))], fill=V)
            d.line([(W - 1, lin(haut, H, t)), (x1, lin(y0, y1, t))], fill=V)
        for f in ((0.6,) if joints else ()):
            xa = x0 * f
            d.line([(xa, lin(haut, y0, f)), (xa, lin(H, y1, f))], fill=V)
            xb = W - 1 - (W - 1 - x1) * f
            d.line([(xb, lin(haut, y0, f)), (xb, lin(H, y1, f))], fill=V)
    if plafond == 'voute':
        d.rectangle([x0 + 1, 0, x1 - 1, y0 - 1], fill=N)
        for k in range(3):
            t = (k + 1) / 3
            xa, xb = lin(-20, x0, t), lin(W + 19, x1, t)
            ry = lin(60, (x1 - x0) * 0.35, t)
            d.arc([xa, y0 - ry - lin(30, 0, t) * 0 - ry * 0, xb, y0 + ry * 0.9], 180, 360, fill=V, width=2 if k < 2 else 1)
    elif plafond == 'poutres':
        for k in range(4):
            t = (k + 1) / 5
            yy = lin(0, y0, t)
            d.line([(lin(0, x0, t), yy), (lin(W - 1, x1, t), yy)], fill=V, width=2 if k < 2 else 1)
        for f in (0.25, 0.5, 0.75):
            d.line([(lin(0, W, f), 0), (lin(x0, x1, f), y0)], fill=V)
    if sol:
        dallage(im, d, x0, y1, x1, damier)
        if flaque is not None:
            halo(d, flaque[0], lin(y1, H, 0.45), flaque[1], B, 0.4, (H - y1) * 0.45, ymin=y1 + 2, im=im, sur=N)
    for a, b in [((0, 0), (x0, y0)), ((W - 1, 0), (x1, y0)), ((0, H - 1), (x0, y1)), ((W - 1, H - 1), (x1, y1))]:
        d.line([a, b], fill=B)
    d.rectangle([x0, y0, x1, y1], outline=B)


def dallage(im, d, x0, y1, x1, damier=True, n=6, rangs_n=5):
    """Le dallage du sol en perspective ; damier : une dalle sur deux en vert plein."""
    d.polygon([(x0, y1), (x1, y1), (W - 1, H - 1), (0, H - 1)], fill=N)
    prof = H - y1
    rangs = [y1 + prof * ((k / rangs_n) ** 1.5) for k in range(rangs_n + 1)]

    def pt(j, y):
        t = (y - y1) / prof
        return (lin(lin(x0, x1, j / n), lin(0, W - 1, j / n), t), y)
    if damier:
        for i in range(rangs_n):
            for j in range(n):
                if (i + j) % 2 == 0:
                    d.polygon([pt(j, rangs[i]), pt(j + 1, rangs[i]), pt(j + 1, rangs[i + 1]), pt(j, rangs[i + 1])], fill=V)
    for k in range(1, rangs_n + 1):
        d.line([pt(0, rangs[k]), pt(n, rangs[k])], fill=V if not damier else N)
    for j in range(n + 1):
        d.line([pt(j, y1), pt(j, H - 1)], fill=V if not damier else N)


# ------------------------------------------------------------------
# Les meubles et la lumière
# ------------------------------------------------------------------

def flamme(d, x, y, h=10):
    d.polygon([(x, y - h), (x + 4, y - h // 3), (x + 3, y), (x - 3, y), (x - 4, y - h // 3)], fill=V)
    d.polygon([(x, y - h // 2 - 1), (x + 2, y - 2), (x - 2, y - 2)], fill=B)


def torche_murale(im, d, x, y, r=24, fort=0.55):
    """Une torche fixée au mur : un support de fer, une flamme, un halo vert puis blanc autour."""
    halo(d, x, y - 6, r, V, fort, r * 0.9, im=im, sur=N)
    halo(d, x, y - 6, r * 0.45, B, 0.45, r * 0.45, im=im, sur=N)
    d.polygon([(x - 3, y), (x + 3, y), (x + 1, y + 12), (x - 1, y + 12)], fill=B)
    d.line([(x + 1, y + 1), (x, y + 11)], fill=N)
    d.rectangle([x - 4, y - 2, x + 4, y], fill=B)
    d.line([(x, y + 12), (x, y + 16)], fill=V)
    flamme(d, x, y - 3, 11)


def bougie(im, d, x, y, h=8, r=10):
    halo(d, x, y - h - 2, r, V, 0.5, im=im, sur=N)
    d.rectangle([x - 1, y - h, x + 1, y], fill=B)
    d.point((x + 1, y - h + 2), fill=N)
    d.polygon([(x, y - h - 5), (x + 1, y - h - 1), (x - 1, y - h - 1)], fill=B)
    d.point((x, y - h - 6), fill=V)


def colonne(im, d, x, y0, y1, w=12, c=B, ombre=V):
    """Une colonne de pierre en volume, en aplats : chapiteau et base, fût cannelé, le tiers droit dans l'ombre."""
    g, dr = x - w // 2, x + w // 2
    d.rectangle([g - 3, y0, dr + 3, y0 + 4], fill=c)
    d.rectangle([g - 1, y0 + 5, dr + 1, y0 + 6], fill=c)
    d.rectangle([g, y0 + 7, dr, y1 - 7], fill=c)
    d.rectangle([dr - w // 3, y0 + 7, dr, y1 - 7], fill=ombre)
    for k in range(g + 2, dr - 1, 3):
        d.line([(k, y0 + 9), (k, y1 - 9)], fill=N)
    d.rectangle([g - 1, y1 - 6, dr + 1, y1 - 5], fill=c)
    d.rectangle([g - 3, y1 - 4, dr + 3, y1], fill=c)
    d.line([(g - 3, y0 + 4), (dr + 3, y0 + 4)], fill=N)
    d.rectangle([dr, y0, dr + 3, y0 + 4], fill=ombre); d.rectangle([dr, y1 - 4, dr + 3, y1], fill=ombre)


def lisere(im, x0, y0, x1, y1, de, c=B, cote='gauche'):
    """Un liseré de lumière : le premier pixel de couleur `de` de chaque ligne (côté gauche) ou colonne (haut) passe en c."""
    px = im.load()
    if cote in ('gauche', 'droite'):
        for y in range(max(0, y0), min(H, y1 + 1)):
            xs = range(max(0, x0), min(W, x1 + 1)) if cote == 'gauche' else range(min(W - 1, x1), max(-1, x0 - 1), -1)
            for x in xs:
                if px[x, y] == de:
                    px[x, y] = c
                    break
    else:
        for x in range(max(0, x0), min(W, x1 + 1)):
            for y in range(max(0, y0), min(H, y1 + 1)):
                if px[x, y] == de:
                    px[x, y] = c
                    break


def livre_volant(d, x, y, l=10, c=B, ombre=True):
    """Un grimoire ouvert qui flotte, pages en éventail, avec sa petite ombre tramée et des éclats."""
    d.polygon([(x - l, y - 1), (x - 1, y + 2), (x - 1, y + 6), (x - l, y + 3)], fill=c)
    d.polygon([(x + l, y - 1), (x + 1, y + 2), (x + 1, y + 6), (x + l, y + 3)], fill=c)
    d.polygon([(x - l, y - 1), (x - l + 2, y - 4), (x - 1, y - 1), (x - 1, y + 2)], fill=c)
    d.polygon([(x + l, y - 1), (x + l - 2, y - 4), (x + 1, y - 1), (x + 1, y + 2)], fill=c)
    for k in (2, 4, 6):
        d.line([(x - l + k, y - 2 + k // 3), (x - 2, y + k // 3 - 1)], fill=N)
        d.line([(x + l - k, y - 2 + k // 3), (x + 2, y + k // 3 - 1)], fill=N)
    d.line([(x - l, y + 3), (x - 1, y + 6)], fill=V)
    d.line([(x + l, y + 3), (x + 1, y + 6)], fill=V)
    d.line([(x, y - 1), (x, y + 6)], fill=N)


def etageres_cote(d, gauche, x0, y0, y1, haut=0, rangs=4, graine=3, vert=0.3, livres_=True):
    """Des rayonnages plaqués sur un mur de côté, qui fuient vers le mur du fond (x0, y0 à y1 : l'arête du fond ;
    haut : où le mur commence en haut de l'image). Des livres serrés, plus petits au fond."""
    rnd = random.Random(graine)
    bord = 0 if gauche else W - 1

    def y_at(f, x):                                  # la hauteur d'une étagère (fraction f) à l'abscisse x
        t = (x - bord) / (x0 - bord)
        return lin(lin(haut, H - 1, f), lin(y0, y1, f), t)
    fs = [0.04 + k * 0.9 / rangs for k in range(rangs + 1)]
    xs = range(bord, x0, 1) if gauche else range(bord, x0, -1)
    for k in range(rangs):
        fa, fb = fs[k], fs[k + 1]
        if livres_:
            x = bord
            pas = 1 if gauche else -1
            while (x < x0 - 2) if gauche else (x > x0 + 2):
                t = abs(x - bord) / abs(x0 - bord)
                lw = max(1, int(round(lin(5, 1.5, t) * rnd.uniform(0.7, 1.3))))
                ya, yb = y_at(fa, x), y_at(fb, x)
                hh = (yb - ya) * rnd.uniform(0.55, 0.9)
                c = V if rnd.random() < vert else B
                xa, xb = sorted((x, x + pas * (lw - 1)))
                d.rectangle([xa, yb - hh, xb, yb - 1], fill=c)
                x += pas * (lw + (1 if t < 0.6 else 0) + (1 if rnd.random() < 0.15 else 0))
        d.line([(bord, y_at(fb, bord)), (x0, y_at(fb, x0))], fill=B, width=2)
    d.line([(bord, y_at(fs[0], bord)), (x0, y_at(fs[0], x0))], fill=B, width=2)
    for f in (0.0, 1.0):
        xx = bord if f == 0 else x0
        d.line([(xx, y_at(fs[0], xx)), (xx, y_at(fs[-1], xx))], fill=B, width=2 if f == 0 else 1)


def table(d, x0, y, x1, ep=4, pieds=20, c=B, prof=6):
    """Une table vue de face, un peu d'en haut : le plateau (sa tranche en vert), deux pieds."""
    d.polygon([(x0 + prof, y - prof), (x1 - prof, y - prof), (x1, y), (x0, y)], fill=c)
    d.rectangle([x0, y, x1, y + ep], fill=V)
    d.line([(x0, y), (x1, y)], fill=B)
    for x in (x0 + 4, x1 - 8):
        d.rectangle([x, y + ep + 1, x + 4, y + ep + pieds], fill=c)
        d.rectangle([x + 3, y + ep + 1, x + 4, y + ep + pieds], fill=V)


def ballon(d, x, y, r=12, plein=0.5, c=B, liquide=V, col=9):
    """Un ballon de verre (un alambic) : le verre blanc, le liquide vert jusqu'à la hauteur `plein`, un reflet, le col."""
    rr = r - 2
    d.ellipse([x - r, y - r, x + r, y + r], fill=c)
    d.ellipse([x - rr, y - rr, x + rr, y + rr], fill=N)
    if plein > 0:
        ny = y + rr - 2 * rr * plein
        a = math.degrees(math.asin(max(-1, min(1, (ny - y) / rr))))
        d.chord([x - rr, y - rr, x + rr, y + rr], a, 180 - a, fill=liquide)
        d.line([(x - math.sqrt(max(0, rr * rr - (ny - y) ** 2)) + 1, ny), (x + math.sqrt(max(0, rr * rr - (ny - y) ** 2)) - 1, ny)], fill=B)
    if col:
        d.rectangle([x - 3, y - r - col, x + 3, y - r + 2], fill=c)
        d.rectangle([x - 1, y - r - col + 1, x + 1, y - r + 2], fill=N)
    d.arc([x - rr + 2, y - rr + 2, x + rr - 2, y + rr - 2], 195, 245, fill=B)


def sablier(d, x, y, h=28, w=18, plein=0.5, c=B):
    """Un sablier en volume : deux plateaux de bois, trois montants, le verre, le sable vert qui coule."""
    m = y + h // 2
    d.rectangle([x - w // 2 - 3, y, x + w // 2 + 3, y + 3], fill=c)
    d.rectangle([x - w // 2 - 3, y + h - 3, x + w // 2 + 3, y + h], fill=c)
    d.line([(x - w // 2 - 3, y + 3), (x + w // 2 + 3, y + 3)], fill=V)
    d.line([(x - w // 2 - 3, y + h), (x + w // 2 + 3, y + h)], fill=V)
    haut = [(x - w // 2, y + 4), (x + w // 2, y + 4), (x + 1, m), (x - 1, m)]
    bas = [(x - w // 2, y + h - 4), (x + w // 2, y + h - 4), (x + 1, m), (x - 1, m)]
    d.rectangle([x - w // 2 - 2, y + 4, x + w // 2 + 2, y + h - 4], fill=N)
    hs = int((h // 2 - 5) * plein)                   # le sable en bas
    hh = int((h // 2 - 5) * (1 - plein))             # ce qu'il reste en haut
    if hh > 0:
        d.polygon([(x - max(1, (w // 2) * hh // (h // 2)), m - hh - 1), (x + max(1, (w // 2) * hh // (h // 2)), m - hh - 1), (x, m)], fill=V)
    if hs > 0:
        d.polygon([(x - w // 2 + 1, y + h - 4), (x + w // 2 - 1, y + h - 4), (x + w // 4, y + h - 4 - hs), (x - w // 4, y + h - 4 - hs)], fill=V)
        d.line([(x, m), (x, y + h - 4 - hs)], fill=V)
    d.line(haut + [haut[0]], fill=c)
    d.line(bas + [bas[0]], fill=c)
    d.line([(x - w // 2 + 2, y + 6), (x - 2, m - 2)], fill=B)
    for xx in (x - w // 2 - 2, x + w // 2 + 2):
        d.line([(xx, y + 3), (xx, y + h - 3)], fill=c, width=1)


def ciel_nuit(d, x0, y0, x1, y1, graine=3, n=30, voile=0.35):
    """Un ciel de nuit dans un cadre : des étoiles de deux tailles, et un voile vert tramé qui monte du bas."""
    rnd = random.Random(graine)
    degrade(d, x0, y0 + (y1 - y0) * 0.35, x1, y1, V, 0, voile)
    for _ in range(n):
        x, y = rnd.randint(int(x0) + 2, int(x1) - 2), rnd.randint(int(y0) + 2, int(y0 + (y1 - y0) * 0.8))
        d.point((x, y), fill=B)
        if rnd.random() < 0.15:
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                d.point((x + dx, y + dy), fill=B)


def lune(d, x, y, r=8):
    halo(d, x, y, r * 2.6, V, 0.5, sur=N)
    d.ellipse([x - r, y - r, x + r, y + r], fill=B)
    for (a, b, s_) in ((-3, -2, 2), (3, 2, 2), (-1, 4, 1)):
        d.ellipse([x + a - s_, y + b - s_, x + a + s_, y + b + s_], fill=V)


def eclats(d, pts, c=B):
    """De petites étoiles à quatre branches (des éclats de magie)."""
    for (x, y) in pts:
        d.point([(x, y), (x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)], fill=c)


# ------------------------------------------------------------------
# Le dehors et les fortifications (le Bastion)
# ------------------------------------------------------------------

def ciel_aube(d, horizon=90, fort=0.7, graine=5, etoiles_=18):
    """La fin de la nuit : des étoiles en haut, le vert de l'aube qui monte de l'horizon, une lueur blanche au ras."""
    rnd = random.Random(graine)
    for _ in range(etoiles_):
        x, y = rnd.randint(2, W - 3), rnd.randint(2, int(horizon * 0.45))
        d.point((x, y), fill=B)
    degrade(d, 0, horizon * 0.3, W, horizon, V, 0, fort)
    degrade(d, 0, horizon - 14, W, horizon, B, 0, 0.4)


def eau(d, y0, y1, graine=1, c=V, reflet=None, larg=10):
    """L'eau des douves : des vaguelettes plus longues en approchant, et sous une lumière (reflet = x) des reflets brisés."""
    rnd = random.Random(graine)
    y = y0
    while y < y1:
        p = (y - y0) / max(1, y1 - y0)
        long_, esp = 2 + int(p * 7), 7 + int(p * 14)
        for x in range(-rnd.randint(0, esp), W, esp):
            d.line([(x, y), (x + long_, y)], fill=c)
        if reflet is not None:
            l = larg * (0.5 + p * 1.2)
            x = reflet - l
            while x < reflet + l:
                seg = rnd.randint(2, 4 + int(p * 6))
                if rnd.random() < 0.7:
                    d.line([(x, y), (min(x + seg, reflet + l), y)], fill=B)
                x += seg + rnd.randint(1, 3)
        y += 2 + int(p * 4)


def mur_plein(im, d, x0, y0, x1, y1, h=8, w=16, c=B, joint=N, ombre=None, graine=1):
    """Un mur de pierre éclairé (pierres blanches, joints noirs) ; ombre : (t0, t1) d'un assombrissement vert vers le bas."""
    d.rectangle([x0, y0, x1, y1], fill=c)
    for r, y in enumerate(range(int(y0), int(y1), h)):
        d.line([(x0, y), (x1, y)], fill=joint)
        for x in range(int(x0) + (w // 2 if r % 2 else 0), int(x1), w):
            d.line([(x, y), (x, min(y + h, y1))], fill=joint)
    if ombre:
        ombrer(im, x0, y0, x1, y1, c, V, ombre[0], ombre[1])


def creneaux(d, x0, x1, y, h=8, w=10, c=B, ombre=V):
    """Des merlons sur le haut d'un mur, chacun avec sa face d'ombre."""
    for x in range(int(x0), int(x1), w * 2):
        d.rectangle([x, y - h, min(x + w - 1, x1), y], fill=c)
        d.rectangle([min(x + w - 3, x1), y - h, min(x + w - 1, x1), y], fill=ombre)


def tour(im, d, x, y_sol, l, h, toit=True, fenetres=1, c=B, graine=1):
    """Une tour ronde de pierre, de face : le fût (ombré à droite), les créneaux ou un toit pointu, des fenêtres
    allumées en vert."""
    x0, x1 = x - l // 2, x + l // 2
    mur_plein(im, d, x0, y_sol - h, x1, y_sol, h=6, w=10, c=c)
    d.rectangle([x1 - l // 3, y_sol - h, x1, y_sol], fill=V)
    for yy in range(y_sol - h, y_sol, 6):
        d.line([(x1 - l // 3, yy), (x1, yy)], fill=N)
    if toit:
        d.polygon([(x0 - 3, y_sol - h), (x1 + 3, y_sol - h), (x, y_sol - h - l)], fill=c)
        d.polygon([(x, y_sol - h - l), (x1 + 3, y_sol - h), (x + 2, y_sol - h)], fill=V)
        d.line([(x, y_sol - h - l), (x, y_sol - h - l - 6)], fill=c)
        d.polygon([(x, y_sol - h - l - 6), (x + 6, y_sol - h - l - 4), (x, y_sol - h - l - 2)], fill=V)
    else:
        d.rectangle([x0 - 2, y_sol - h - 3, x1 + 2, y_sol - h], fill=c)
        creneaux(d, x0 - 2, x1 + 2, y_sol - h - 3, 5, 4, c)
    for k in range(fenetres):
        fy = y_sol - h + 8 + k * 16
        d.rectangle([x - 2, fy, x + 1, fy + 6], fill=N)
        d.rectangle([x - 1, fy + 1, x, fy + 5], fill=V)


def cadenas(d, x, y, c=V, t=1):
    """Un cadenas : l'anse blanche, le corps (c), le trou de serrure, un reflet."""
    d.arc([x - 5 * t, y - 9 * t, x + 5 * t, y + t], 180, 360, fill=B, width=2 * t)
    d.line([(x - 5 * t, y - 4 * t), (x - 5 * t, y - 2 * t)], fill=B, width=2 * t)
    d.line([(x + 4 * t, y - 4 * t), (x + 4 * t, y - 2 * t)], fill=B, width=2 * t)
    d.rectangle([x - 7 * t, y - 3 * t, x + 7 * t, y + 8 * t], fill=c)
    d.rectangle([x + 4 * t, y - 3 * t, x + 7 * t, y + 8 * t], fill=N if c == V else V)
    d.line([(x - 7 * t, y - 3 * t), (x + 7 * t, y - 3 * t)], fill=B)
    d.rectangle([x - 1 * t, y, x + 1 * t, y + 4 * t], fill=N if c != N else B)


def bouclier(d, x, y, l=22, c=V, bord=B, sym=True):
    """Un écu : le bord blanc, le champ (c), une moitié d'ombre, une croix en bande."""
    pts = lambda m: [(x - l // 2 + m, y + m), (x + l // 2 - m, y + m), (x + l // 2 - m, y + l // 2), (x, y + l - m * 1.4), (x - l // 2 + m, y + l // 2)]
    d.polygon(pts(0), fill=bord)
    d.polygon(pts(3), fill=c)
    d.polygon([(x, y + 3), (x + l // 2 - 3, y + 3), (x + l // 2 - 3, y + l // 2), (x, y + l - 4)], fill=N if c == V else V)
    if sym:
        d.line([(x, y + 3), (x, y + l - 5)], fill=bord, width=2)
        d.line([(x - l // 2 + 3, y + l // 3), (x + l // 2 - 3, y + l // 3)], fill=bord, width=2)


def cle(d, x, y, c=B, l=14):
    """Une clé pendue : l'anneau, la tige, le panneton."""
    d.ellipse([x - 3, y, x + 3, y + 6], outline=c, width=2)
    d.line([(x, y + 6), (x, y + 6 + l)], fill=c, width=2)
    d.line([(x, y + 2 + l), (x + 4, y + 2 + l)], fill=c, width=2)
    d.line([(x, y + 5 + l), (x + 3, y + 5 + l)], fill=c, width=2)


def chaine(d, pts, c=B):
    """Une chaîne : des maillons alternés le long d'un segment."""
    (xa, ya), (xb, yb) = pts
    n = int(math.hypot(xb - xa, yb - ya) / 4)
    for k in range(n + 1):
        t = k / max(1, n)
        x, y = lin(xa, xb, t), lin(ya, yb, t)
        if k % 2:
            d.ellipse([x - 2, y - 1, x + 2, y + 1], outline=c)
        else:
            d.ellipse([x - 1, y - 2, x + 1, y + 2], outline=c)


# ------------------------------------------------------------------
# Les portraits en pied (grille 88 x 85 de dessiner_panne.perso), finis comme ceux du chapitre 8
# ------------------------------------------------------------------

def perso_fini(nom, dessin, lisere_=True, ombre_=True, halo_=None):
    """Comme dessiner_panne.perso, avec une finition : un liseré de lumière blanc sur le bord gauche des vêtements
    verts, une ombre verte sur le bord droit des volumes blancs, une ombre au sol, et au besoin un halo derrière
    (halo_ : (x, y, rayon) en pixels de la grille)."""
    from PIL import Image, ImageDraw
    from dessiner_lieux import PAL, OUT, _palimg, cadre
    gw, gh = 88, 85
    im = Image.new('P', (gw, gh), N); im.putpalette(PAL); d = ImageDraw.Draw(im)

    def r(x0, y0, x1, y1, c):
        d.rectangle([x0, y0, x1, y1], fill=c)
    dessin(r)
    px = im.load()
    src = im.copy().load()
    if lisere_ or ombre_:
        for y in range(31, 66):
            for x in range(1, gw - 3):
                c, g, dr = src[x, y], src[x - 1, y], src[x + 1, y]
                if lisere_ and c == V and g == N and dr == V and src[x + 2, y] == V:
                    px[x, y] = B
                elif ombre_ and c == B and dr == N and src[x + 2, y] == N and src[x + 3, y] == N and g == B and src[x - 2, y] == B and src[x - 3, y] == B:
                    px[x, y] = V
    if ombre_:
        for x in range(30, 58):                                   # l'ombre au sol, sous les pieds
            if px[x, 67] == N:
                px[x, 67] = V if (x % 2 == 0 and 34 <= x <= 53) else N
    if halo_ is not None:
        hx, hy, hr = halo_
        for y in range(gh):
            for x in range(gw):
                if px[x, y] == N:
                    dist = math.hypot(x - hx, y - hy) / hr
                    if dist < 1 and BAYER[y % 4][x % 4] < 0.5 * (1 - dist) * 16:
                        px[x, y] = V
    grand = im.resize((gw * 4, gh * 4), Image.NEAREST).convert('RGB')
    fond = cadre(); fond.paste(grand, (32, 32))
    fond.quantize(palette=_palimg(), dither=Image.Dither.NONE).save(OUT + nom)


def robe_plis(r, haut=33, bas=64, c=V, x0=35, x1=52, pli=N, ourlet=None):
    """Une robe qui s'évase vers le bas, avec deux plis qui s'écartent et un ourlet."""
    for k, y in enumerate(range(haut, bas + 1)):
        e = k // 6
        r(x0 - e, y, x1 + e, y, c)
    cx = (x0 + x1) // 2
    for y in range(haut + 10, bas + 1):
        o = (y - haut) // 9
        r(cx - 5 - o, y, cx - 5 - o, y, pli)
        r(cx + 6 + o, y, cx + 6 + o, y, pli)
    e = (bas - haut) // 6
    r(x0 - e, bas, x1 + e, bas, ourlet if ourlet is not None else (B if c != B else V))


def ceinture(r, y, x0=35, x1=52, c=B, boucle=V):
    r(x0, y, x1, y + 1, c); r((x0 + x1) // 2 - 1, y - 1, (x0 + x1) // 2 + 2, y + 2, boucle)


def ligne_r(r, x0, y0, x1, y1, c, ep=1):
    """Une ligne en gros pixels (les objets en diagonale des personnages)."""
    n = max(abs(x1 - x0), abs(y1 - y0))
    for k in range(n + 1):
        x = round(x0 + (x1 - x0) * k / max(1, n))
        y = round(y0 + (y1 - y0) * k / max(1, n))
        r(x, y, x + ep - 1, y + ep - 1, c)


def manches(r, c=V, y=34, gauche=True, droite=True, main=B, long_=12):
    """Des manches larges de mage qui s'évasent, et les mains blanches qui en sortent."""
    for k in range(long_):
        e = k // 4
        if gauche:
            r(31 - e, y + k, 34, y + k, c)
        if droite:
            r(53, y + k, 56 + e, y + k, c)
    e = (long_ - 1) // 4
    if gauche:
        r(31 - e, y + long_ - 1, 34, y + long_ - 1, B if c != B else V)
        r(31 - e + 1, y + long_, 33 - e + 2, y + long_ + 2, main)
    if droite:
        r(53, y + long_ - 1, 56 + e, y + long_ - 1, B if c != B else V)
        r(54 + e - 1, y + long_, 56 + e - 1, y + long_ + 2, main)
