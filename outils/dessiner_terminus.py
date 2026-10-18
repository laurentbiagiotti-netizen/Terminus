"""Redessine les images du chapitre 1 (Terminus, le monde de fantasy d'origine) et l'écran titre, dans le style du
chapitre 8 (outils/dessiner_port.py) : dégradés tramés pour le ciel et les halos, silhouettes à liseré de lumière,
profondeur et perspective, contraste, ombres portées, sans bruit sur les objets.

Même nom, même taille, même cadre et même palette que chaque image d'origine : la toile de 176 x 170 est doublée et
posée dans le cadre (comme dessiner_lieux.finir), puis chaque couleur est rangée sur l'index le plus proche de la palette
du GIF d'origine (les images en noir et blanc restent en noir et blanc).

Usage : python3 outils/dessiner_terminus.py [nom.gif ...]      (OUT=dossier/ pour un aperçu ailleurs)
"""
import os, sys, math, random
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from PIL import Image, ImageDraw  # noqa: E402
from dessiner_lieux import toile, cadre, N, V, B, W, H, SRC, OUT, PAL  # noqa: E402
from dessiner_port import BAYER, trame, degrade, halo, croissant, lune_pleine  # noqa: E402


# ------------------------------------------------------------------
# L'enregistrement : la palette de l'image d'origine
# ------------------------------------------------------------------

def sauver(nom, im):
    """Double la toile, la pose dans le cadre et l'enregistre avec la palette exacte du GIF d'origine."""
    grand = im.resize((W * 2, H * 2), Image.NEAREST).convert('RGB')
    fond = cadre()
    fond.paste(grand, (32, 32))
    origine = Image.open(SRC + nom)
    pal = origine.getpalette()
    n = len(pal) // 3
    info = {k: origine.info[k] for k in ('transparency', 'background') if k in origine.info}
    transparent = info.get('transparency')
    cache = {}

    def index(c):
        meilleur = None
        for i in range(n):
            if i == transparent:
                continue
            p = pal[3 * i:3 * i + 3]
            dist = (p[0] - c[0]) ** 2 + (p[1] - c[1]) ** 2 + (p[2] - c[2]) ** 2
            if meilleur is None or dist < meilleur[0]:
                meilleur = (dist, i)
        return meilleur[1]
    sortie = Image.new('P', fond.size)
    sortie.putpalette(pal)
    sortie.putdata([cache[c] if c in cache else cache.setdefault(c, index(c)) for c in fond.get_flattened_data()])
    sortie.save(OUT + nom, optimize=False, **info)
    if n == 2:
        palette_deux_couleurs(OUT + nom)


def palette_deux_couleurs(chemin):
    """PIL écrit au moins quatre couleurs dans la palette d'un GIF : on ramène la table globale aux deux couleurs
    de l'image d'origine (noir et blanc) en retirant les deux entrées de remplissage."""
    octets = bytearray(open(chemin, 'rb').read())
    drapeaux = octets[10]
    if drapeaux & 0x80 and (drapeaux & 0x07) == 1 and octets[19:25] == bytes(6):
        octets[10] = drapeaux & 0xF8
        del octets[19:25]
        open(chemin, 'wb').write(bytes(octets))


# ------------------------------------------------------------------
# Les briques : lumière, contours, sols
# ------------------------------------------------------------------

def liserer(im, x0, y0, x1, y1, de, vers, cotes=((-1, 0), (0, -1)), fond=(N,)):
    """Le liseré de lumière : les pixels de couleur `de` qui touchent le fond du côté de la lumière passent à `vers`."""
    px = im.load()
    a_changer = []
    for y in range(max(0, y0), min(H, y1 + 1)):
        for x in range(max(0, x0), min(W, x1 + 1)):
            if px[x, y] != de:
                continue
            for dx, dy in cotes:
                xx, yy = x + dx, y + dy
                if 0 <= xx < W and 0 <= yy < H and px[xx, yy] in fond:
                    a_changer.append((x, y))
                    break
    for p in a_changer:
        px[p] = vers


VIDE = 9


def calque():
    """Un calque transparent, pour dessiner une silhouette à part avant de la poser (avec son liseré) sur la toile."""
    c = Image.new('P', (W, H), VIDE)
    c.putpalette(PAL)
    return c, ImageDraw.Draw(c)


def poser(im, c, lum=None, cotes=((-1, 0), (0, -1)), ep=1, seulement=None, lum2=None, ep2=0):
    """Pose le calque sur la toile ; les pixels du bord tournés vers la lumière (cotes) prennent la couleur lum
    (sur ep pixels), puis lum2 sur les pixels suivants (jusqu'à ep2) : un liseré à deux tons."""
    pc, pi = c.load(), im.load()
    portee = max(ep, ep2)
    for y in range(H):
        for x in range(W):
            v = pc[x, y]
            if v == VIDE:
                continue
            if lum is not None and (seulement is None or v in seulement):
                plus_pres = None
                for dx, dy in cotes:
                    for e in range(1, portee + 1):
                        xx, yy = x + dx * e, y + dy * e
                        if not (0 <= xx < W and 0 <= yy < H) or pc[xx, yy] == VIDE:
                            if plus_pres is None or e < plus_pres:
                                plus_pres = e
                            break
                if plus_pres is not None and plus_pres <= ep:
                    v = lum
                elif plus_pres is not None and lum2 is not None:
                    v = lum2
            pi[x, y] = v


def ombre_sol(d, cx, cy, rx, ry, c=V, t=0.5):
    """L'ombre portée au sol : une ellipse tramée, plus dense au centre."""
    for y in range(int(cy - ry), int(cy + ry) + 1):
        for x in range(int(cx - rx), int(cx + rx) + 1):
            dist = math.hypot((x - cx) / rx, (y - cy) / ry)
            if dist < 1 and 0 <= x < W and 0 <= y < H and BAYER[y % 4][x % 4] < t * (1.2 - dist) * 16:
                d.point((x, y), fill=c)


def tirets_sol(d, cx, y, l=60, c=B):
    """Le sol des personnages : des tirets en deux rangs, comme dans le reste du jeu."""
    for (a, b, dy) in ((-l // 2, -l // 6, 0), (-l // 8, l // 4, 0), (l // 3, l // 2, 0), (-l // 3, -l // 10, 3), (l // 10, l // 3, 3)):
        d.line([(cx + a, y + dy), (cx + b, y + dy)], fill=c)


def herbes(d, y0, y1, graine=1, c=V, c2=B, dens=1.0, x0=0, x1=W):
    """Des touffes d'herbe : petites et serrées au loin, grandes et espacées devant."""
    rnd = random.Random(graine)
    y = y0
    while y < y1:
        p = (y - y0) / max(1, y1 - y0)
        h = 1 + int(p * 6)
        esp = int((14 - p * 6) / dens)
        x = x0 + rnd.randint(0, esp)
        while x < x1:
            col = c2 if rnd.random() < 0.25 else c
            d.line([(x, y), (x - 1, y - h)], fill=col)
            d.line([(x + 1, y), (x + 2, y - h + 1)], fill=col)
            if h > 3:
                d.line([(x + 2, y), (x + 4, y - h + 2)], fill=col)
            x += esp + rnd.randint(0, esp)
        y += 3 + int(p * 5)


def nuage_plat(im, d, cx, cy, l=30, h=8, c=B, ombre=V):
    """Un nuage de beau temps : des bosses blanches au ventre plat, soulignées de vert."""
    for (dx, dy, rx, ry) in ((0, 0, l, h), (-l * 0.4, -h * 0.5, l * 0.45, h * 1.2), (l * 0.25, -h * 0.8, l * 0.4, h * 1.4)):
        d.chord([cx + dx - rx, cy + dy - ry, cx + dx + rx, cy + dy + ry], 180, 360, fill=c)
    d.rectangle([cx - l, cy - 1, cx + l, cy], fill=c)
    d.line([(cx - l + 3, cy + 1), (cx + l - 3, cy + 1)], fill=ombre)


def soleil_doux(d, x, y, r=10):
    halo(d, x, y, r * 3.2, V, 0.6)
    halo(d, x, y, r * 1.8, B, 0.5)
    d.ellipse([x - r, y - r, x + r, y + r], fill=B)


def etoiles(d, x0, y0, x1, y1, n=30, graine=3):
    rnd = random.Random(graine)
    for _ in range(n):
        x, y = rnd.randint(x0, x1), rnd.randint(y0, y1)
        d.point((x, y), fill=B)
        if rnd.random() < 0.15:
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                d.point((x + dx, y + dy), fill=B)


def colline(d, y, amp, per, phase, c, x0=0, x1=W, bas=H):
    """Une ligne de collines (une somme de deux sinus), remplie jusqu'en bas."""
    pts = [(x0, bas)]
    for x in range(x0, x1 + 1, 2):
        pts.append((x, y - amp * math.sin(x / per + phase) - amp * 0.4 * math.sin(x / (per * 0.37) + phase * 2)))
    pts.append((x1, bas))
    d.polygon(pts, fill=c)
    return pts


def feuillage(im, d, cx, cy, r, graine=1, c=V, lum=B, ombre=N):
    """Une touffe de feuillage : des boules serrées, chacune ombrée en bas à droite et éclairée en haut à gauche."""
    rnd = random.Random(graine)
    boules = [(cx, cy, r)]
    for _ in range(6):
        a = rnd.uniform(0, 2 * math.pi)
        dist = rnd.uniform(r * 0.4, r * 0.9)
        boules.append((cx + math.cos(a) * dist, cy + math.sin(a) * dist * 0.7, r * rnd.uniform(0.45, 0.7)))
    boules.sort(key=lambda b: b[1])
    for (x, y, rr) in boules:
        d.ellipse([x - rr, y - rr, x + rr, y + rr], fill=ombre)
        d.ellipse([x - rr, y - rr, x + rr - 2, y + rr - 2], fill=c)
        d.arc([x - rr + 1, y - rr + 1, x + rr - 3, y + rr - 3], 200, 250, fill=lum)


def tronc(d, pts, ep, c=B, ombre=N):
    """Un tronc tordu le long d'une ligne brisée : épais en bas, avec des stries d'écorce."""
    for k in range(len(pts) - 1):
        e = max(1, int(ep * (1 - k / len(pts) * 0.6)))
        d.line([pts[k], pts[k + 1]], fill=c, width=e)
    for k in range(len(pts) - 1):
        (xa, ya), (xb, yb) = pts[k], pts[k + 1]
        e = max(1, int(ep * (1 - k / len(pts) * 0.6)))
        if e >= 4:
            d.line([(xa + e // 4, ya), (xb + e // 4, yb)], fill=ombre)
            d.line([(xa + e // 3 + 1, ya + 3), (xb + e // 3 + 1, yb - 3)], fill=ombre)


def branche(d, x, y, l, a, ep=2, c=B):
    x2, y2 = x + math.cos(a) * l, y - math.sin(a) * l
    d.line([(x, y), (x2, y2)], fill=c, width=ep)
    return x2, y2


def rocher(im, d, x, y, rx, ry, c=B, graine=1, ombre=V, trait=N):
    """Un rocher arrondi posé au sol (x, y : le milieu de sa base) : la face éclairée en haut à gauche (c), la face
    à l'ombre en bas à droite (ombre), une fêlure et un trait de sol."""
    rnd = random.Random(graine)
    px = im.load()
    hy = ry * 1.8
    bosses = [rnd.uniform(0.85, 1.15) for _ in range(4)]
    forme = set()
    for yy in range(int(y - hy) - 2, int(y) + 1):
        for xx in range(int(x - rx) - 2, int(x + rx) + 3):
            u, v = (xx - x) / rx, (y - yy) / hy
            k = min(3, int((u + 1) * 2))
            if v >= 0 and u * u + v * v * bosses[k] <= 1 and 0 <= xx < W and 0 <= yy < H:
                forme.add((xx, yy))
    for (xx, yy) in forme:
        u, v = (xx - x) / rx, (y - yy) / hy
        bord = any((xx + dx, yy + dy) not in forme for dx, dy in ((1, 0), (-1, 0), (0, -1)))
        if bord:
            px[xx, yy] = trait
        elif (u + 0.35) ** 2 + (v - 0.6) ** 2 > 0.7:
            px[xx, yy] = ombre
        else:
            px[xx, yy] = c
    d.line([(x - rx * 0.15, y - hy * 0.85), (x + rx * 0.05, y - hy * 0.6)], fill=trait)
    d.line([(x - rx - 2, y + 1), (x + rx + 3, y + 1)], fill=trait)


def flamme(d, x, y, h=8, c=B, c2=V):
    d.polygon([(x - h * 0.4, y), (x, y - h), (x + h * 0.4, y), (x, y + h * 0.2)], fill=c2)
    d.polygon([(x - h * 0.2, y), (x, y - h * 0.6), (x + h * 0.2, y)], fill=c)


def torche(d, x, y, h=8):
    """Une torche murale : le support, la flamme, son halo."""
    halo(d, x, y - h, 22, V, 0.5)
    halo(d, x, y - h, 10, B, 0.4)
    d.polygon([(x - 3, y - 2), (x + 3, y - 2), (x + 1, y + 6), (x - 1, y + 6)], fill=B)
    d.line([(x, y + 6), (x, y + 10)], fill=B)
    flamme(d, x, y - 3, h)


# --- le gros texte des titres : une police de 5 x 7, en relief ---
GLYPHES = {
    'T': ["#####", "..#..", "..#..", "..#..", "..#..", "..#..", "..#.."],
    'E': ["#####", "#....", "#....", "####.", "#....", "#....", "#####"],
    'R': ["####.", "#...#", "#...#", "####.", "#.#..", "#..#.", "#...#"],
    'M': ["#...#", "##.##", "#.#.#", "#.#.#", "#...#", "#...#", "#...#"],
    'I': ["###", ".#.", ".#.", ".#.", ".#.", ".#.", "###"],
    'N': ["#...#", "##..#", "##..#", "#.#.#", "#..##", "#..##", "#...#"],
    'U': ["#...#", "#...#", "#...#", "#...#", "#...#", "#...#", ".###."],
    'S': [".####", "#....", "#....", ".###.", "....#", "....#", "####."],
    'H': ["#...#", "#...#", "#...#", "#####", "#...#", "#...#", "#...#"],
    'D': ["####.", "#...#", "#...#", "#...#", "#...#", "#...#", "####."],
    'O': [".###.", "#...#", "#...#", "#...#", "#...#", "#...#", ".###."],
    'A': [".###.", "#...#", "#...#", "#####", "#...#", "#...#", "#...#"],
    'C': [".####", "#....", "#....", "#....", "#....", "#....", ".####"],
    'Y': ["#...#", "#...#", ".#.#.", "..#..", "..#..", "..#..", "..#.."],
    'L': ["#....", "#....", "#....", "#....", "#....", "#....", "#####"],
    'B': ["####.", "#...#", "#...#", "####.", "#...#", "#...#", "####."],
    'P': ["####.", "#...#", "#...#", "####.", "#....", "#....", "#...."],
    'G': [".####", "#....", "#....", "#.###", "#...#", "#...#", ".###."],
    'K': ["#...#", "#..#.", "#.#..", "##...", "#.#..", "#..#.", "#...#"],
    'V': ["#...#", "#...#", "#...#", "#...#", ".#.#.", ".#.#.", "..#.."],
    'Z': ["#####", "....#", "...#.", "..#..", ".#...", "#....", "#####"],
    'X': ["#...#", "#...#", ".#.#.", "..#..", ".#.#.", "#...#", "#...#"],
    ' ': ["...", "...", "...", "...", "...", "...", "..."],
}


def largeur_texte(t, s, esp=1):
    return sum((len(GLYPHES[ch][0]) + esp) * s for ch in t) - esp * s


def gros_texte(d, x, y, t, s=3, face=V, bord=B, relief=N, prof=2, esp=1):
    """Un titre en relief : chaque pixel de la police devient un bloc s x s, liseré de blanc en haut à gauche,
    avec une épaisseur (prof) qui descend en bas à droite."""
    blocs = []
    cx = x
    for ch in t:
        g = GLYPHES[ch]
        for j, ligne in enumerate(g):
            for i, v in enumerate(ligne):
                if v == '#':
                    blocs.append((cx + i * s, y + j * s))
        cx += (len(g[0]) + esp) * s
    for k in range(prof, 0, -1):
        for (bx, by) in blocs:
            d.rectangle([bx + k, by + k, bx + k + s - 1, by + k + s - 1], fill=relief if k > 1 else B)
    for (bx, by) in blocs:
        d.rectangle([bx - 1, by - 1, bx + s - 1, by + s - 1], fill=bord)
    for (bx, by) in blocs:
        d.rectangle([bx, by, bx + s - 1, by + s - 1], fill=face)


def texte_centre(d, y, t, c=B, x0=0, x1=W):
    w = d.textlength(t)
    d.text((x0 + (x1 - x0 - w) / 2, y), t, fill=c)


# ------------------------------------------------------------------
# Dehors : la forêt, la clairière, les prés, les montagnes
# ------------------------------------------------------------------

def arbre_ombre(d, x, y, h, l, c=N, graine=1, feuilles=True):
    """Un arbre en contre-jour : un fût, des branches tordues, une couronne de boules (tout d'une couleur)."""
    rnd = random.Random(graine)
    d.polygon([(x - l * 0.12, y), (x - l * 0.06, y - h * 0.55), (x + l * 0.06, y - h * 0.55), (x + l * 0.14, y)], fill=c)
    for k in range(4):
        a = rnd.uniform(0.4, 2.7)
        branche(d, x, y - h * (0.4 + k * 0.08), l * 0.45, a, 2, c)
    if feuilles:
        for _ in range(9):
            a = rnd.uniform(0, 2 * math.pi)
            r = rnd.uniform(0.2, 0.55) * l
            rr = l * rnd.uniform(0.18, 0.3)
            cx, cy = x + math.cos(a) * r, y - h * 0.72 + math.sin(a) * r * 0.6
            d.ellipse([cx - rr, cy - rr, cx + rr, cy + rr], fill=c)


def clairiere():
    """La Clairière : une trouée d'herbe sous le ciel, une pierre au milieu ; derrière, les gravats d'une maison
    détruite (une poutre, une cheminée restée debout) ; les arbres de la forêt tout autour, en contre-jour."""
    im, d = toile()
    degrade(d, 0, 0, W, 94, V, 0.1, 1.0)
    degrade(d, 0, 66, W, 94, B, 0.0, 0.5)
    nuage_plat(im, d, 40, 26, 22, 5)
    nuage_plat(im, d, 138, 16, 18, 4)
    c, dc = calque()
    for (x, h_, l, g) in ((6, 70, 40, 1), (36, 56, 34, 2), (150, 72, 44, 3), (176, 60, 30, 4), (64, 40, 26, 5), (124, 46, 28, 6), (94, 30, 22, 7)):
        arbre_ombre(dc, x, 96, h_, l, N, g)
    poser(im, c, B, ((0, -1), (-1, 0)))
    d.rectangle([0, 94, W, H], fill=V)                                                  # la prairie
    d.rectangle([0, 94, W, 96], fill=N)
    for k in range(6):
        y = 100 + int((k / 6) ** 1.6 * 70)
        d.line([(0, y), (W, y)], fill=N if k % 2 else V)
    herbes(d, 104, H, 2, N, B, 0.6)
    x0, y0 = 106, 102                                                                   # les gravats de la maison
    d.rectangle([x0 + 40, y0 - 34, x0 + 50, y0 + 6], fill=B)                             # la cheminée
    d.rectangle([x0 + 46, y0 - 34, x0 + 50, y0 + 6], fill=N)
    d.rectangle([x0 + 46, y0 - 34, x0 + 47, y0 + 6], fill=V)
    for yy in range(y0 - 30, y0 + 4, 5):
        d.line([(x0 + 40, yy), (x0 + 45, yy)], fill=V)
    d.rectangle([x0 + 38, y0 - 38, x0 + 52, y0 - 34], fill=B)
    d.line([(x0 + 2, y0 + 10), (x0 + 34, y0 - 20)], fill=B, width=4)                      # la poutre
    d.line([(x0 + 4, y0 + 11), (x0 + 36, y0 - 19)], fill=N)
    d.polygon([(x0 - 6, y0 + 16), (x0 + 6, y0 + 2), (x0 + 20, y0 + 6), (x0 + 32, y0 - 2), (x0 + 50, y0 + 6), (x0 + 62, y0 + 16)], fill=B)
    d.polygon([(x0 + 32, y0 - 2), (x0 + 50, y0 + 6), (x0 + 62, y0 + 16), (x0 + 30, y0 + 16)], fill=V)
    for (bx, by) in ((x0 + 6, y0 + 8), (x0 + 18, y0 + 10), (x0 + 12, y0 + 4), (x0 + 38, y0 + 10), (x0 + 48, y0 + 12)):
        d.rectangle([bx, by, bx + 6, by + 4], fill=N)
        d.rectangle([bx, by, bx + 5, by + 3], fill=B)
        d.line([(bx + 1, by + 3), (bx + 5, by + 3)], fill=V)
    d.line([(x0 - 6, y0 + 17), (x0 + 62, y0 + 17)], fill=N)
    ombre_sol(d, 64, 140, 30, 5, N, 1.2)                                                # la pierre où l'on s'assoit
    rocher(im, d, 62, 138, 22, 9, B, 3)
    for (x, y) in ((24, 150), (40, 162), (150, 156), (132, 146), (98, 160)):              # des fleurs
        d.point((x, y - 1), fill=B); d.point((x - 1, y), fill=B); d.point((x + 1, y), fill=B); d.point((x, y + 1), fill=B)
    return im


def sentier_sinistre():
    """Le SentierSinistre : la nuit, un chemin pavé tout à fait ordinaire file entre des arbres morts vers la gueule
    noire d'une caverne ; une lune voilée, une brume verte au pied de la colline."""
    im, d = toile()
    degrade(d, 0, 0, W, 92, V, 0.0, 0.75)
    etoiles(d, 30, 4, 150, 40, 14, 5)
    halo(d, 136, 24, 24, V, 0.6)
    croissant(d, 136, 24, 9)
    c, dc = calque()                                                                     # la colline et la caverne
    colline(dc, 76, 5, 14, 1.2, N, 0, W, 102)
    dc.polygon([(62, 102), (66, 74), (78, 56), (92, 50), (108, 56), (120, 74), (124, 102)], fill=V)
    dc.polygon([(92, 50), (108, 56), (120, 74), (124, 102), (102, 102), (106, 72)], fill=N)
    poser(im, c, B, ((0, -1), (-1, 0)))
    d.polygon([(72, 102), (74, 82), (82, 68), (92, 64), (102, 68), (110, 82), (112, 102)], fill=N)
    for (x, y) in ((86, 82), (97, 82)):                                                  # deux yeux, dans le noir
        d.rectangle([x, y, x + 2, y + 1], fill=V)
    halo(d, 92, 100, 70, V, 0.45, 8)                                                     # la brume
    d.rectangle([0, 102, W, H], fill=N)
    for k in range(10):                                                                  # les pavés, en perspective
        f = (k / 10) ** 1.5
        y = int(102 + (H - 102) * f)
        hy = 2 + int(7 * f)
        l = 12 + 50 * f
        n = 2 + k // 2
        for j in range(n):
            xa = 92 - l + j * (2 * l / n) + (k % 2) * (l / n) * 0.5
            xb = xa + 2 * l / n - 2
            d.rectangle([xa, y, xb, y + hy], fill=B)
            d.line([(xa, y + hy), (xb, y + hy)], fill=V)
            d.line([(xb, y), (xb, y + hy)], fill=V)
    herbes(d, 106, H, 4, V, V, 0.5, 0, 34)
    herbes(d, 106, H, 6, V, V, 0.5, 148, W)
    for (base, sens) in ((8, 1), (168, -1)):                                             # les arbres morts
        c, dc = calque()
        tronc(dc, [(base, H), (base + sens * 6, 120), (base - sens * 2, 80), (base + sens * 10, 40), (base + sens * 4, 0)], 14, N, N)
        for (y, l, a) in ((92, 44, 0.6), (64, 36, 0.15), (40, 30, 1.0), (116, 26, -0.1)):
            aa = a if sens > 0 else math.pi - a
            bx, by = branche(dc, base + sens * 6, y, l, aa, 3, N)
            branche(dc, bx, by, l * 0.5, aa + 0.7 * sens, 2, N)
            branche(dc, bx, by, l * 0.4, aa - 0.6 * sens, 1, N)
        poser(im, c, V, ((sens, 0), (0, -1)))
    return im


def prairie():
    """La PrairieNord : de belles collines vertes qui roulent jusqu'à l'horizon sous un ciel de beau temps,
    des fleurs au premier plan et un sentier qui part vers l'est."""
    im, d = toile()
    degrade(d, 0, 0, W, 84, V, 0.05, 0.85)
    degrade(d, 0, 58, W, 84, B, 0.0, 0.35)
    soleil_doux(d, 140, 26, 9)
    nuage_plat(im, d, 46, 30, 24, 5)
    nuage_plat(im, d, 98, 50, 14, 3)
    c, dc = calque()                                                                     # les collines au loin
    colline(dc, 86, 3, 16, 0.3, N)
    poser(im, c, V, ((0, -1),))
    colline(d, 94, 6, 26, 2.0, V)
    liserer(im, 0, 80, W - 1, 120, V, B, ((0, -1),), (N,))
    colline(d, 122, 6, 30, 4.2, N)
    liserer(im, 0, 100, W - 1, 140, N, B, ((0, -1),), (V,))
    colline(d, 124, 6, 30, 4.2, V, 0, W, H)
    d.polygon([(118, 114), (124, 114), (W, 148), (W, 160)], fill=B)                       # le sentier vers l'est
    d.line([(124, 114), (W, 148)], fill=N)
    herbes(d, 128, H, 7, N, B, 0.8)
    rnd = random.Random(8)
    for _ in range(16):                                                                  # des fleurs
        x, y = rnd.randint(4, W - 4), rnd.randint(132, H - 4)
        d.point((x, y - 1), fill=B); d.point((x - 1, y), fill=B); d.point((x + 1, y), fill=B); d.point((x, y + 1), fill=B)
        d.line([(x, y + 2), (x, y + 4)], fill=N)
    return im


def montagnes():
    """Les MontagnesEst : des sommets enneigés, éclairés à gauche et sombres à droite ; un sentier monte jusqu'à
    l'entrée d'une grotte creusée dans la roche ; un torrent descend vers nous."""
    im, d = toile()
    degrade(d, 0, 0, W, 100, V, 0.05, 0.85)
    degrade(d, 0, 70, W, 100, B, 0.0, 0.5)
    nuage_plat(im, d, 140, 18, 20, 4)
    c, dc = calque()
    for (x, y, l) in ((128, 34, 60), (16, 40, 56), (72, 20, 66)):                         # les sommets
        dc.polygon([(x - l, 110), (x, y), (x + l, 110)], fill=V)
        dc.polygon([(x, y), (x + l, 110), (x + 6, 110), (x + 10, 80), (x + 2, 60)], fill=N)
        dc.polygon([(x - 12, y + 16), (x, y), (x + 9, y + 14), (x + 4, y + 11), (x - 1, y + 18), (x - 6, y + 13)], fill=B)
        for k in range(1, 4):
            dc.line([(x - k * 9, y + 10 + k * 14), (x - k * 9 + 5, y + 20 + k * 14)], fill=N)
    poser(im, c, B, ((0, -1), (-1, 0)), 1, (V,))
    colline(d, 112, 4, 18, 1.0, V)                                                       # le versant herbu
    liserer(im, 0, 90, W - 1, 130, V, B, ((0, -1),), (N,))
    d.polygon([(116, 90), (132, 82), (154, 88), (160, 114), (110, 114)], fill=B)          # la roche et la grotte
    d.polygon([(132, 82), (154, 88), (160, 114), (140, 114)], fill=V)
    d.ellipse([122, 92, 146, 122], fill=N)
    d.rectangle([118, 112, 150, 116], fill=V)
    d.line([(132, 116), (112, 130), (84, 142), (62, 170)], fill=B, width=6)              # le sentier
    d.line([(132, 116), (112, 130), (84, 142), (62, 170)], fill=N, width=1)
    for k in range(116):                                                                 # le torrent
        f = k / 116
        yy = 112 + f * 58
        xx = 18 + 8 * math.sin(f * 5)
        l = 1 + f * 9
        d.line([(xx - l, yy), (xx + l, yy)], fill=B)
        d.point((xx + l + 1, yy), fill=N)
    for k in range(9):
        f = (k + 0.5) / 9
        yy = 112 + f * 58
        xx = 18 + 8 * math.sin(f * 5) + (k % 3 - 1) * 2
        d.line([(xx - 2 - f * 3, yy), (xx + 1 + f * 2, yy)], fill=V)
    herbes(d, 124, H, 9, N, B, 0.5, 40, W)
    rocher(im, d, 152, 136, 10, 5, B, 5)
    rocher(im, d, 46, 128, 7, 4, B, 6)
    return im


def ferme():
    """La Ferme, qui est aussi la Maison : une petite maison au toit pentu, une fenêtre allumée, la fumée de la
    cheminée ; devant, des sillons en perspective, brûlés et noircis vers l'avant ; le soir tombe."""
    im, d = toile()
    degrade(d, 0, 0, W, 90, V, 0.05, 0.9)
    degrade(d, 0, 62, W, 90, B, 0.0, 0.6)
    soleil_doux(d, 136, 80, 10)
    d.rectangle([0, 88, W, 104], fill=N)
    colline(d, 90, 3, 30, 1.0, N)
    liserer(im, 0, 80, W - 1, 100, N, V, ((0, -1),), (V, B))
    x, y = 26, 92                                                                        # la maison
    d.rectangle([x - 2, y - 6, x + 54, y + 14], fill=B)
    d.rectangle([x + 40, y - 6, x + 54, y + 14], fill=V)
    d.rectangle([x + 36, y - 36, x + 42, y - 20], fill=B)                                # la cheminée
    d.rectangle([x + 40, y - 36, x + 42, y - 20], fill=V)
    d.polygon([(x, y - 26), (x + 52, y - 26), (x + 60, y - 6), (x - 8, y - 6)], fill=V)   # le toit de chaume
    for k in range(4):
        d.line([(x - 6 + k * 2, y - 9 - k * 4), (x + 58 - k * 2, y - 9 - k * 4)], fill=N)
    d.line([(x, y - 26), (x + 52, y - 26)], fill=B)
    d.line([(x - 8, y - 6), (x, y - 26)], fill=B)
    d.line([(x - 8, y - 5), (x + 60, y - 5)], fill=N)
    for k in range(5):                                                                   # la fumée
        halo(d, x + 40 + k * 7, y - 42 - k * 9, 5 + k, B, 0.6)
    d.rectangle([x + 6, y - 1, x + 18, y + 9], fill=N)                                   # la fenêtre allumée
    d.rectangle([x + 7, y, x + 17, y + 8], fill=V)
    d.line([(x + 12, y), (x + 12, y + 8)], fill=N); d.line([(x + 7, y + 4), (x + 17, y + 4)], fill=N)
    d.rectangle([x + 26, y + 1, x + 34, y + 14], fill=N)                                 # la porte
    d.point((x + 32, y + 8), fill=B)
    halo(d, x + 12, y + 22, 20, V, 0.6, 6, H)
    for k in range(17):                                                                  # les sillons
        xb = -80 + k * 22
        d.line([(100 + (xb - 100) * 0.12, 108), (xb, H)], fill=V if k % 2 else B)
    d.rectangle([0, 104, W, 108], fill=N)
    for (cx, cy, r) in ((122, 150, 22), (54, 160, 18), (152, 128, 14)):                    # les champs brûlés
        d.ellipse([cx - r, cy - r * 0.35, cx + r, cy + r * 0.35], fill=N)
        d.line([(cx - 3, cy), (cx - 5, cy - 7)], fill=B); d.line([(cx + 3, cy), (cx + 4, cy - 6)], fill=B)
    herbes(d, 106, 112, 2, V, B, 1.0)
    return im


def pont():
    """Le PontBrisé : un pont de planches suspendu au-dessus d'un gouffre, entre deux falaises ; au milieu, il
    manque une planche (elle tombe encore) ; au fond, le gouffre se perd dans la brume."""
    im, d = toile()
    degrade(d, 0, 0, W, 90, V, 0.1, 0.95)
    degrade(d, 0, 60, W, 90, B, 0.0, 0.45)
    nuage_plat(im, d, 120, 22, 22, 5)
    nuage_plat(im, d, 40, 40, 14, 3)
    c, dc = calque()                                                                     # l'autre rive, au loin
    colline(dc, 88, 3, 12, 0.4, N, 0, W, 96)
    poser(im, c, V, ((0, -1),))
    d.rectangle([0, 94, W, H], fill=N)
    degrade(d, 30, 96, 146, 150, V, 0.55, 0.0)                                          # la brume du gouffre
    for (roc, ombre_, haut) in (([(0, 84), (34, 82), (44, 96), (40, H), (0, H)], [(34, 82), (44, 96), (40, H), (26, H), (32, 100)], [(0, 84), (34, 82), (38, 88), (0, 90)]),
                                ([(W, 82), (144, 80), (132, 94), (140, H), (W, H)], [(132, 94), (140, H), (126, H)], [(W, 82), (144, 80), (140, 86), (W, 88)])):
        d.polygon(roc, fill=V)                                                           # les deux falaises
        d.polygon(ombre_, fill=N)
        d.polygon(haut, fill=B)
    for y in range(100, H, 9):
        d.line([(0, y), (28, y + 3)], fill=N)
        d.line([(146, y + 3), (W, y)], fill=N)
    pts = []                                                                             # le pont et ses planches
    for k in range(25):
        t = k / 24
        pts.append((34 + (144 - 34) * t, 82 + 22 * math.sin(math.pi * t)))
    for k, (x, y) in enumerate(pts[:-1]):
        if k in (11, 12):
            continue
        d.polygon([(x, y), (x + 4, y), (x + 4, y + 5), (x, y + 5)], fill=B)
        d.line([(x + 4, y), (x + 4, y + 5)], fill=N)
        d.line([(x, y + 5), (x + 4, y + 5)], fill=V)
    for dy in (-16, -9):
        d.line([(x, y + dy) for (x, y) in pts], fill=B)
    for (x, y) in pts[1:-1:2]:
        d.line([(x, y - 16), (x, y)], fill=V)
    for (x, y) in ((34, 82), (144, 82)):
        d.rectangle([x - 3, y - 22, x + 2, y + 6], fill=B)
        d.rectangle([x + 1, y - 22, x + 2, y + 6], fill=V)
        d.rectangle([x - 4, y - 24, x + 3, y - 22], fill=B)
    x9, y9 = pts[11]                                                                     # la planche qui tombe
    d.polygon([(x9 + 4, y9 + 30), (x9 + 9, y9 + 28), (x9 + 10, y9 + 31), (x9 + 5, y9 + 33)], fill=B)
    for k in range(3):
        d.point((x9 + 6 - k, y9 + 22 - k * 4), fill=V)
    for (x, y) in ((12, 80), (164, 78)):                                                 # les arbres des deux rives
        c, dc = calque()
        dc.rectangle([x - 1, y - 16, x + 1, y], fill=N)
        for (dx, dy, r) in ((0, -26, 9), (-5, -20, 6), (5, -18, 6)):
            dc.ellipse([x + dx - r, y + dy - r, x + dx + r, y + dy + r], fill=N)
        poser(im, c, B, ((0, -1), (-1, 0)))
    herbes(d, 88, 100, 4, B, V, 0.8, 0, 36)
    herbes(d, 86, 98, 6, B, V, 0.8, 142, W)
    return im


def sentier_rocailleux():
    """Le SentierRocailleux : un chemin envahi de mauvaises herbes file vers les champs, entre des rochers."""
    im, d = toile()
    degrade(d, 0, 0, W, 84, V, 0.05, 0.85)
    degrade(d, 0, 60, W, 84, B, 0.0, 0.5)
    nuage_plat(im, d, 54, 22, 22, 5)
    colline(d, 84, 2, 20, 0.6, N, 0, W, 86)
    for k in range(5):                                                                   # les champs, au loin
        y = 86 + k * 3
        d.line([(0, y), (W, y)], fill=V if k % 2 else N)
    d.rectangle([0, 100, W, H], fill=V)
    d.line([(0, 100), (W, 100)], fill=N)
    d.polygon([(84, 100), (94, 100), (150, H), (36, H)], fill=B)                          # le sentier
    d.polygon([(92, 100), (94, 100), (150, H), (128, H)], fill=N)
    rnd = random.Random(2)
    for _ in range(22):                                                                  # les cailloux du chemin
        f = rnd.random()
        y = 102 + f * f * (H - 104)
        x = 88 + (rnd.random() - 0.5) * (12 + 90 * f * f)
        s = 1 + int(f * 4)
        d.rectangle([x, y, x + s, y + max(1, s // 2)], fill=N)
    for (x, y, rx, ry, g) in ((26, 124, 18, 9, 1), (152, 136, 24, 12, 2), (10, 160, 14, 7, 3), (122, 108, 9, 4, 4), (58, 110, 7, 3, 5)):
        rocher(im, d, x, y, rx, ry, B, g)
    herbes(d, 104, H, 11, N, B, 0.6, 0, 70)
    herbes(d, 104, H, 13, N, B, 0.6, 120, W)
    herbes(d, 118, H, 12, V, N, 0.3, 70, 120)
    return im


# ------------------------------------------------------------------
# Les bâtisses : l'Académie, la Citadelle, le village
# ------------------------------------------------------------------

def fenetre_ogive(d, x, y, w, h, c=V, coeur=B, cadre_=N):
    """Une fenêtre en ogive, allumée : le cadre, la lumière, un meneau."""
    d.rectangle([x, y + w // 2, x + w, y + h], fill=cadre_)
    d.pieslice([x, y, x + w, y + w], 180, 360, fill=cadre_)
    d.rectangle([x + 1, y + w // 2, x + w - 1, y + h - 1], fill=c)
    d.pieslice([x + 1, y + 1, x + w - 1, y + w - 1], 180, 360, fill=c)
    if w >= 5:
        d.line([(x + w // 2, y + 2), (x + w // 2, y + h - 1)], fill=cadre_)
        d.rectangle([x + 1, y + h - 3, x + w - 1, y + h - 1], fill=coeur)


def academie():
    """L'Académie des Sorts : à la tombée de la nuit, une grande école gothique (une tour centrale à flèche, deux
    ailes, des arches) dont toutes les fenêtres sont allumées ; un grand portail ouvert, l'allée qui y mène."""
    im, d = toile()
    degrade(d, 0, 0, W, 112, V, 0.0, 0.9)
    degrade(d, 0, 84, W, 112, B, 0.0, 0.4)
    etoiles(d, 4, 4, W - 4, 50, 22, 2)
    croissant(d, 28, 22, 7)
    c, dc = calque()
    dc.rectangle([22, 66, 154, 112], fill=N)                                             # les ailes
    for x in range(22, 156, 8):
        dc.rectangle([x, 62, x + 4, 66], fill=N)
    for (x, w_, h_) in ((14, 16, 64), (146, 16, 64)):                                     # les tours d'angle
        dc.rectangle([x, 112 - h_, x + w_, 112], fill=N)
        dc.polygon([(x - 2, 112 - h_), (x + w_ / 2, 112 - h_ - 22), (x + w_ + 2, 112 - h_)], fill=N)
    dc.rectangle([70, 26, 106, 112], fill=N)                                             # la tour centrale
    dc.polygon([(66, 28), (88, -6), (110, 28)], fill=N)
    for (x, h_) in ((60, 70), (110, 70)):                                                # les contreforts
        dc.polygon([(x, 112), (x + 6, 112), (x + 6, 112 - h_), (x + 3, 112 - h_ - 8)], fill=N)
    poser(im, c, B, ((-1, 0), (0, -1)))
    for x in range(30, 60, 10):                                                          # les fenêtres allumées
        fenetre_ogive(d, x, 74, 6, 14)
        fenetre_ogive(d, x, 92, 6, 12)
    for x in range(118, 146, 10):
        fenetre_ogive(d, x, 74, 6, 14)
        fenetre_ogive(d, x, 92, 6, 12)
    for (x, y) in ((18, 60), (150, 60), (18, 80), (150, 80)):
        fenetre_ogive(d, x, y, 6, 12)
    fenetre_ogive(d, 80, 36, 16, 26)                                                     # la rosace et la grande baie
    d.ellipse([84, 40, 92, 48], outline=N)
    fenetre_ogive(d, 76, 84, 24, 28, N, N, B)                                            # le portail, ouvert
    halo(d, 88, 106, 20, V, 0.8, 12)
    d.rectangle([80, 96, 96, 112], fill=B)
    d.pieslice([80, 88, 96, 104], 180, 360, fill=B)
    d.line([(88, 90), (88, 112)], fill=V)
    d.rectangle([0, 112, W, H], fill=N)                                                  # l'allée et la pelouse
    d.polygon([(80, 112), (96, 112), (130, H), (46, H)], fill=V)
    d.polygon([(84, 112), (92, 112), (104, H), (72, H)], fill=B)
    for k in range(1, 8):
        f = (k / 8) ** 1.6
        y = int(112 + (H - 112) * f)
        d.line([(80 - 34 * f, y), (96 + 34 * f, y)], fill=N)
    herbes(d, 116, H, 3, V, B, 0.7, 0, 60)
    herbes(d, 116, H, 4, V, B, 0.7, 118, W)
    for (x, h_, l, g, sens) in ((6, 80, 30, 11, 1), (170, 86, 32, 12, -1)):
        c, dc = calque()
        arbre_ombre(dc, x, H, h_, l, N, g)
        poser(im, c, V, ((sens, 0), (0, -1)))
    return im


def citadelle():
    """La Citadelle du Sorcier Noir : sur un piton rocheux, sous la lune, un donjon noir hérissé de tours, découpé
    sur un ciel d'orage ; tout en haut, la grande fenêtre baigne d'une lueur verte (l'immense terminal) ;
    un long escalier y monte."""
    im, d = toile()
    degrade(d, 0, 0, W, 130, V, 0.1, 1.0)
    degrade(d, 0, 96, W, 130, B, 0.0, 0.6)
    etoiles(d, 4, 4, W - 4, 40, 12, 9)
    lune_pleine(d, 142, 30, 11)
    for (y, x0, x1) in ((54, 0, 60), (62, 120, W), (46, 104, 150)):                       # des bancs de nuages
        d.line([(x0, y), (x1, y)], fill=N, width=3)
        d.line([(x0 + 6, y - 2), (x1 - 8, y - 2)], fill=V)
    c, dc = calque()
    dc.polygon([(0, H), (14, 140), (40, 124), (58, 104), (118, 104), (136, 122), (164, 140), (W, H)], fill=N)
    dc.rectangle([56, 56, 120, 106], fill=N)                                             # le donjon
    for x in range(56, 122, 8):
        dc.rectangle([x, 51, x + 4, 56], fill=N)
    for (x, w_, h_, flec) in ((44, 14, 78, 20), (118, 14, 72, 18), (78, 20, 104, 28)):
        dc.rectangle([x, 108 - h_, x + w_, 108], fill=N)
        dc.polygon([(x - 3, 108 - h_), (x + w_ / 2, 108 - h_ - flec), (x + w_ + 3, 108 - h_)], fill=N)
        for xx in range(x - 3, x + w_ + 3, 4):
            dc.rectangle([xx, 108 - h_ + 3, xx + 1, 108 - h_ + 5], fill=N)
    poser(im, c, B, ((1, 0), (0, -1), (-1, 0)))
    halo(d, 88, 28, 30, V, 0.9, 22)                                                      # la fenêtre verte, tout en haut
    fenetre_ogive(d, 82, 12, 12, 18, V, B)
    d.rectangle([84, 22, 92, 28], fill=B)
    for (x, y) in ((48, 52), (122, 58), (64, 70), (106, 70)):
        fenetre_ogive(d, x, y, 4, 8, V, V)
    d.rectangle([80, 90, 96, 108], fill=N)                                               # la porte
    d.pieslice([80, 82, 96, 98], 180, 360, fill=N)
    d.line([(79, 90), (79, 108)], fill=V); d.line([(97, 90), (97, 108)], fill=V)
    for k in range(12):                                                                  # le grand escalier
        f = k / 11
        y = 110 + int(f ** 1.2 * 56)
        l = 10 + f * 34
        hh = 2 + int(f * 3)
        d.rectangle([88 - l, y, 88 + l, y + hh], fill=B)
        d.line([(88 - l, y + hh + 1), (88 + l, y + hh + 1)], fill=V)
    return im


def maison_village(d, x, y, w, h, toit=V, mur=B, porte=True, sens=1):
    """Une maison du village : un mur blanc, un pignon de travers, un toit vert, des fenêtres à croisillons."""
    d.rectangle([x, y - h, x + w, y], fill=mur)
    d.polygon([(x - 3, y - h), (x + w / 2, y - h - w * 0.55), (x + w + 3, y - h)], fill=toit)
    d.line([(x - 3, y - h), (x + w / 2, y - h - w * 0.55), (x + w + 3, y - h)], fill=B if toit != B else V)
    d.line([(x - 3, y - h + 1), (x + w + 3, y - h + 1)], fill=N)
    for fx in range(x + 3, x + w - 5, 9):
        d.rectangle([fx, y - h + 5, fx + 5, y - h + 11], fill=N)
        d.rectangle([fx + 1, y - h + 6, fx + 4, y - h + 10], fill=V)
        d.line([(fx + 1, y - h + 8), (fx + 4, y - h + 8)], fill=N)
    if porte:
        d.rectangle([x + w // 2 - 3, y - 9, x + w // 2 + 3, y], fill=N)
        d.pieslice([x + w // 2 - 3, y - 12, x + w // 2 + 3, y - 6], 180, 360, fill=N)
    if sens:
        d.rectangle([x + w - 3, y - h, x + w, y], fill=V if mur == B else N)


def place():
    """La PlaceDuVillage : une place ensoleillée et pavée en rond-point ; au centre, un piédestal sans statue ;
    tout autour, les maisons du village, leurs toits verts et leurs fenêtres."""
    im, d = toile()
    degrade(d, 0, 0, W, 70, V, 0.0, 0.7)
    soleil_doux(d, 30, 20, 8)
    nuage_plat(im, d, 130, 18, 18, 4)
    for (x, w_, h_) in ((-4, 28, 26), (26, 22, 34), (50, 24, 22), (102, 24, 24), (128, 22, 34), (152, 28, 26)):
        maison_village(d, x, 84, w_, h_)
    d.rectangle([74, 58, 100, 84], fill=B)                                               # la mairie et son clocheton
    d.polygon([(70, 58), (87, 40), (104, 58)], fill=V)
    d.rectangle([84, 30, 90, 42], fill=B); d.polygon([(82, 30), (87, 22), (92, 30)], fill=V)
    d.ellipse([82, 62, 92, 72], fill=N); d.ellipse([83, 63, 91, 71], fill=B)
    d.line([(87, 67), (87, 64)], fill=N); d.line([(87, 67), (89, 67)], fill=N)
    d.rectangle([83, 74, 91, 84], fill=N)
    d.rectangle([0, 84, W, H], fill=B)                                                   # le pavé
    d.line([(0, 84), (W, 84)], fill=N)
    for k, ry in enumerate((10, 16, 24, 34, 46, 60)):                                    # les anneaux de pavés
        rx = ry * 3
        d.ellipse([88 - rx, 120 - ry, 88 + rx, 120 + ry], outline=V)
    for k in range(16):
        a = k * math.pi / 8
        d.line([(88 + math.cos(a) * 30, 120 + math.sin(a) * 10), (88 + math.cos(a) * 200, 120 + math.sin(a) * 66)], fill=V)
    d.ellipse([58, 110, 118, 130], fill=V)                                               # le piédestal vide
    d.ellipse([60, 110, 116, 128], fill=B)
    d.ellipse([60, 110, 116, 128], outline=N)
    d.rectangle([74, 96, 102, 120], fill=B)
    d.rectangle([92, 96, 102, 120], fill=V)
    d.line([(74, 96), (74, 120)], fill=N); d.line([(102, 96), (102, 120)], fill=N)
    d.rectangle([70, 92, 106, 96], fill=B)
    d.line([(70, 96), (106, 96)], fill=N)
    d.ellipse([70, 116, 106, 124], fill=B)
    d.arc([70, 116, 106, 124], 0, 180, fill=N)
    d.rectangle([86, 86, 90, 92], fill=V)
    return im


def marche():
    """Le Marché (et le local du BDE, avec sa boutique) : une rue en perspective bordée de maisons à colombages et
    d'étals sous des auvents rayés ; des caisses de marchandises ; une guirlande de lanternes au-dessus de la rue."""
    im, d = toile()
    degrade(d, 0, 0, W, 96, V, 0.15, 0.9)
    degrade(d, 0, 70, W, 96, B, 0.0, 0.5)

    def P(cote, f, h):
        """Un point de façade : cote -1 à gauche, 1 à droite ; f la profondeur (0 devant, 1 au fond), h la hauteur."""
        x = 60 * f if cote < 0 else W - (W - 116) * f
        sol_, toit_ = H + (96 - H) * f, -20 + (44 + 20) * f
        return (x, sol_ + (toit_ - sol_) * h)
    maison_village(d, 66, 96, 20, 26, V, B, True, 0)                                      # le bout de la rue
    maison_village(d, 90, 96, 22, 34, V, B, True, 1)
    for cote in (-1, 1):                                                                 # les façades à colombages
        d.polygon([P(cote, 0, 0), P(cote, 1, 0), P(cote, 1, 1), P(cote, 0, 1)], fill=B)
        for f in (0.0, 0.18, 0.4, 0.62, 0.82, 1.0):
            d.line([P(cote, f, 0.42), P(cote, f, 1)], fill=V, width=2 if f < 0.5 else 1)
        for h in (0.42, 0.7, 0.98):
            d.line([P(cote, 0, h), P(cote, 1, h)], fill=V, width=2)
        for (f0, f1) in ((0.04, 0.12), (0.24, 0.33), (0.46, 0.55), (0.67, 0.75), (0.86, 0.93)):
            d.polygon([P(cote, f0, 0.76), P(cote, f1, 0.76), P(cote, f1, 0.92), P(cote, f0, 0.92)], fill=N)
            d.line([P(cote, (f0 + f1) / 2, 0.76), P(cote, (f0 + f1) / 2, 0.92)], fill=V)
        d.line([P(cote, 0, 1), P(cote, 1, 1)], fill=N)
    d.polygon([(0, H), P(-1, 1, 0), P(1, 1, 0), (W, H)], fill=N)                         # le pavé de la rue
    for k in range(1, 8):
        f = 1 - (k / 8) ** 0.6
        d.line([P(-1, f, 0), P(1, f, 0)], fill=V)
    for j in range(1, 6):
        t = j / 6
        d.line([(60 + 56 * t, 96), (-60 + 296 * t, H)], fill=V)
    for (x0, x1) in ((-2, 54), (122, 178)):                                              # les deux étals du premier plan
        d.rectangle([x0, 128, x1, 152], fill=V)
        d.rectangle([x0, 128, x1, 131], fill=B)
        for x in range(x0 + 4, x1, 9):
            d.line([(x, 133), (x, 152)], fill=N)
        for j in range(7):                                                               # les marchandises
            x = x0 + 5 + j * 7.5
            r = 3
            d.ellipse([x - r, 121, x + r, 128], fill=B if j % 2 else N)
            d.arc([x - r, 121, x + r, 128], 200, 280, fill=V if j % 2 else B)
        for x in (x0 + 3, x1 - 3):
            d.rectangle([x - 1, 96, x + 1, 152], fill=B)
            d.line([(x + 1, 96), (x + 1, 152)], fill=V)
        for j in range(8):                                                               # l'auvent rayé
            xa = x0 + (x1 - x0) * j / 8
            xb = x0 + (x1 - x0) * (j + 1) / 8
            d.polygon([(xa + 3, 86), (xb + 3, 86), (xb, 100), (xa, 100)], fill=B if j % 2 else V)
            d.pieslice([xa, 96, xb, 106], 0, 180, fill=B if j % 2 else V)
        d.line([(x0 + 3, 86), (x1 + 3, 86)], fill=N)
        ombre_sol(d, (x0 + x1) / 2, 156, 34, 4, V, 0.8)
    pts = []                                                                             # la guirlande de lanternes
    for k in range(41):
        t = k / 40
        pts.append((8 + 160 * t, 26 + 22 * (1 - (2 * t - 1) ** 2)))
    d.line(pts, fill=N)
    for (x, y) in pts[2:-2:4]:
        halo(d, x, y + 4, 6, B, 0.55)
        d.rectangle([x - 1, y + 1, x + 1, y + 5], fill=V)
        d.point((x, y + 3), fill=B)
    for (x, y, s_) in ((70, 160, 14), (52, 168, 10), (112, 164, 12)):                      # des caisses au premier plan
        d.rectangle([x, y - s_, x + s_, y], fill=B)
        d.polygon([(x, y - s_), (x + 4, y - s_ - 4), (x + s_ + 4, y - s_ - 4), (x + s_, y - s_)], fill=V)
        d.polygon([(x + s_, y - s_), (x + s_ + 4, y - s_ - 4), (x + s_ + 4, y - 4), (x + s_, y)], fill=N)
        d.line([(x, y - s_), (x + s_, y)], fill=V); d.line([(x + s_, y - s_), (x, y)], fill=V)
        d.rectangle([x, y - s_, x + s_, y], outline=N)
        d.line([(x + s_ + 4, y - s_ - 4), (x + s_ + 4, y - 4)], fill=B)
    return im


# ------------------------------------------------------------------
# Sous terre : la grotte, ses couloirs, la chambre du portail
# ------------------------------------------------------------------

def grotte():
    """La Grotte (et la CaverneDesTrolls) : des voûtes de roche successives s'enfoncent vers le noir ; des stalactites
    pendent à chaque arche, le sol mouillé renvoie la lumière, une lueur verte brille tout au fond."""
    im, d = toile()
    cx, cy = 90, 92
    rnd = random.Random(6)
    bruit = [rnd.uniform(0.9, 1.08) for _ in range(24)]
    n = 7
    arches = []
    for k in range(n, 0, -1):                                                            # les voûtes, de la plus proche à la plus lointaine
        f = (k / n) ** 1.5
        rx, ry = 8 + 110 * f, 8 + 100 * f
        ox = (1 - f) * 4
        pts = []
        for j in range(24):
            a = j * 2 * math.pi / 24
            r = bruit[(j + k) % 24] if k > 1 else 1
            pts.append((cx + ox + math.cos(a) * rx * r, cy + math.sin(a) * ry * r))
        d.polygon(pts, fill=B if k == n else V)
        interieur = [(cx + ox + (x - cx - ox) * 0.965 + 1, cy + (y - cy) * 0.965 + 1) for (x, y) in pts]
        d.polygon(interieur, fill=N)
        arches.append((pts, f))
    halo(d, cx + 4, cy, 18, V, 0.9, 14)
    halo(d, cx + 4, cy, 6, B, 0.7, 5)
    for (pts, f) in arches:                                                              # les stalactites de chaque voûte
        haut = [p for p in pts if p[1] < cy - 4]
        for (x, y) in haut[1::2]:
            l = 3 + 14 * f
            w_ = 1 + 3 * f
            d.polygon([(x - w_, y), (x + w_, y), (x, y + l)], fill=B if f > 0.3 else V)
            d.polygon([(x, y), (x + w_, y), (x, y + l)], fill=V if f > 0.3 else N)
    d.polygon([(0, H), (cx - 6, cy + 6), (cx + 14, cy + 6), (W, H)], fill=N)            # le sol mouillé
    for k in range(9):
        f = (k / 9) ** 1.6
        y = cy + 8 + (H - cy - 8) * f
        l = 4 + 60 * f
        d.line([(cx + 4 - l * 0.5, y), (cx + 4 + l * 0.35, y)], fill=V if k % 2 else B)
    for (x, y, h_) in ((40, 160, 18), (140, 158, 14), (64, 128, 8), (118, 124, 6)):        # des stalagmites
        d.polygon([(x - h_ * 0.3, y), (x, y - h_), (x + h_ * 0.3, y)], fill=B)
        d.polygon([(x, y - h_), (x + h_ * 0.3, y), (x, y)], fill=V)
    return im


def couloir():
    """Le CouloirSombre : un couloir de pierre en perspective, une torche au mur, et tout au bout la lueur d'une
    petite salle humide."""
    im, d = toile()
    bx0, by0, bx1, by1 = 74, 66, 104, 100
    d.rectangle([bx0, by0, bx1, by1], fill=V)                                            # la salle du bout
    halo(d, 89, 84, 40, V, 0.7, 34)
    d.rectangle([bx0, by0, bx1, by1], fill=B)
    d.rectangle([bx0 + 4, by0 + 6, bx1 - 4, by1], fill=V)
    d.rectangle([bx0 + 8, by0 + 12, bx1 - 8, by1], fill=N)
    for (a, b_) in (((0, 0), (bx0, by0)), ((W, 0), (bx1, by0)), ((0, H), (bx0, by1)), ((W, H), (bx1, by1))):
        d.line([a, b_], fill=B)
    for k in range(1, 9):                                                                # les assises de pierre
        f = (k / 9) ** 1.4
        xl, xr = bx0 * f, W - (W - bx1) * f
        yt, yb = by0 * f, H - (H - by1) * f
        d.line([(xl, yt), (xl, yb)], fill=V)
        d.line([(xr, yt), (xr, yb)], fill=V)
        d.line([(xl, yt), (xr, yt)], fill=V if k % 2 else N)
        d.line([(xl, yb), (xr, yb)], fill=V)
    for k in range(1, 6):                                                                # les joints horizontaux des murs
        for (xa, ya, xb, yb) in ((0, k * 28, bx0, by0 + k * 6), (W, k * 28, bx1, by0 + k * 6)):
            d.line([(xa, ya), (xb, yb)], fill=N)
    torche(d, 30, 70, 10)
    torche(d, 146, 70, 10)
    return im


def escalier():
    """L'Escalier : des marches de pierre qui montent entre deux murs jusqu'à un mur aveugle : un cul-de-sac."""
    im, d = toile()
    d.rectangle([0, 0, W, H], fill=N)
    d.rectangle([58, 10, 118, 44], fill=V)                                               # le mur du fond
    for y in range(14, 44, 7):
        d.line([(58, y), (118, y)], fill=N)
        for x in range(58 + (y // 7 % 2) * 7, 118, 14):
            d.line([(x, y), (x, y + 7)], fill=N)
    d.line([(58, 10), (118, 10)], fill=B)
    halo(d, 88, 30, 30, B, 0.35, 20)
    for k in range(10):                                                                  # les marches
        f = k / 9
        y = 44 + int(126 * f ** 1.25)
        l = 30 + 58 * f
        hh = 3 + int(10 * f)
        d.rectangle([88 - l, y, 88 + l, y + 2 + int(3 * f)], fill=B)
        d.rectangle([88 - l, y + 3 + int(3 * f), 88 + l, y + hh], fill=V)
        d.line([(88 - l, y + hh), (88 + l, y + hh)], fill=N)
    d.polygon([(0, 0), (58, 10), (58, 44), (0, H)], fill=N)                              # les murs latéraux
    d.polygon([(W, 0), (118, 10), (118, 44), (W, H)], fill=N)
    for k in range(1, 9):
        f = k / 9
        d.line([(58 * (1 - f), 10 * (1 - f)), (58 * (1 - f), 44 + (H - 44) * f)], fill=V)
        d.line([(118 + (W - 118) * f, 10 * (1 - f)), (118 + (W - 118) * f, 44 + (H - 44) * f)], fill=V)
    d.line([(0, 0), (58, 10)], fill=B); d.line([(58, 10), (58, 44)], fill=B); d.line([(58, 44), (0, H)], fill=B)
    d.line([(W, 0), (118, 10)], fill=B); d.line([(118, 10), (118, 44)], fill=B); d.line([(118, 44), (W, H)], fill=B)
    torche(d, 30, 56, 9)
    return im


def salle_humide(arriere=False):
    """La SalleHumide : une petite salle de pierre qui sent le renfermé ; deux torches aux murs, de l'eau qui suinte,
    une flaque au sol. (arriere : l'ArrièreSalle de la bibliothèque, avec ses rayonnages et son pupitre.)"""
    im, d = toile()
    bx0, by0, bx1, by1 = 40, 34, 136, 116
    d.rectangle([bx0, by0, bx1, by1], fill=V)                                            # le mur du fond
    for y in range(by0 + 8, by1, 9):
        d.line([(bx0, y), (bx1, y)], fill=N)
        for x in range(bx0 + (y // 9 % 2) * 9, bx1, 18):
            d.line([(x, y), (x, y + 9)], fill=N)
    d.polygon([(0, 0), (bx0, by0), (bx0, by1), (0, H)], fill=N)                          # les murs, le sol, la voûte
    d.polygon([(W, 0), (bx1, by0), (bx1, by1), (W, H)], fill=N)
    d.polygon([(0, H), (bx0, by1), (bx1, by1), (W, H)], fill=V)
    for k in range(1, 6):
        f = (k / 6) ** 1.5
        y = by1 + (H - by1) * f
        d.line([(bx0 * (1 - f), y), (bx1 + (W - bx1) * f, y)], fill=N)
    for xb in range(-60, W + 80, 30):
        d.line([(bx0 + (xb - bx0) * 0 + (bx1 - bx0) * (xb + 60) / (W + 140), by1), (xb, H)], fill=N)
    for k in range(1, 7):
        f = k / 7
        d.line([(bx0 * (1 - f), by0 * (1 - f)), (bx0 * (1 - f), by1 + (H - by1) * f)], fill=V)
        d.line([(bx1 + (W - bx1) * f, by0 * (1 - f)), (bx1 + (W - bx1) * f, by1 + (H - by1) * f)], fill=V)
    for (a, b_) in (((0, 0), (bx0, by0)), ((W, 0), (bx1, by0)), ((0, H), (bx0, by1)), ((W, H), (bx1, by1))):
        d.line([a, b_], fill=B)
    d.rectangle([bx0, by0, bx1, by1], outline=B)
    if arriere:
        for x in (bx0 + 6, bx1 - 34):                                                    # deux rayonnages
            d.rectangle([x, by0 + 6, x + 28, by1], fill=N)
            d.rectangle([x, by0 + 6, x + 28, by1], outline=B)
            for y in range(by0 + 18, by1, 14):
                d.line([(x, y), (x + 28, y)], fill=B)
                for j in range(x + 2, x + 26, 4):
                    d.rectangle([j, y - 9 + (j % 3), j + 2, y - 1], fill=V if j % 8 else B)
        d.rectangle([70, 90, 106, 96], fill=B)                                           # le pupitre et sa bougie
        d.rectangle([74, 96, 78, 124], fill=B); d.rectangle([98, 96, 102, 124], fill=B)
        d.polygon([(76, 90), (88, 84), (100, 90)], fill=V)
        d.line([(88, 84), (88, 90)], fill=N)
        halo(d, 96, 78, 22, B, 0.5)
        d.rectangle([95, 80, 97, 89], fill=B)
        flamme(d, 96, 79, 6)
    else:
        for (x, y) in ((bx0 + 20, by0), (bx0 + 60, by0), (bx1 - 14, by0)):              # l'eau qui suinte
            d.line([(x, y), (x, y + 14)], fill=B)
            d.point((x, y + 20), fill=B)
        d.ellipse([60, 130, 132, 146], fill=N)                                           # la flaque
        d.ellipse([64, 132, 128, 144], fill=V)
        for (x, y, l) in ((80, 136, 14), (96, 140, 20)):
            d.line([(x, y), (x + l, y)], fill=B)
    torche(d, 18, 70, 10)
    torche(d, 158, 70, 10)
    return im


def chambre_portail():
    """La ChambreDePierre : une salle baignée d'une lueur verte ; au milieu se dresse le portail, un anneau de pierres
    levées où tourbillonne la lumière ; à côté, une stèle couverte d'inscriptions."""
    im, d = toile()
    halo(d, 96, 76, 90, V, 0.6, 80)
    bx0, by0, bx1, by1 = 20, 20, 156, 110
    for y in range(by0, by1, 10):                                                        # le mur de pierres
        for x in range(bx0 + (y // 10 % 2) * 10, bx1, 20):
            d.rectangle([x, y, x + 18, y + 8], outline=N)
    d.polygon([(0, H), (bx0, by1), (bx1, by1), (W, H)], fill=N)                          # le sol dallé
    for k in range(1, 7):
        f = (k / 7) ** 1.5
        y = by1 + (H - by1) * f
        d.line([(bx0 * (1 - f), y), (bx1 + (W - bx1) * f, y)], fill=V)
    for j in range(9):
        xb = -80 + j * 42
        d.line([(bx0 + (bx1 - bx0) * j / 8, by1), (xb, H)], fill=V)
    cx, cy = 100, 72                                                                     # le portail
    halo(d, cx, cy, 44, B, 0.6, 50)
    d.ellipse([cx - 26, cy - 38, cx + 26, cy + 38], fill=V)
    for k, r in enumerate((22, 16, 10, 5)):
        d.ellipse([cx - r, cy - r * 1.45, cx + r, cy + r * 1.45], outline=B if k % 2 == 0 else N, width=2)
    d.ellipse([cx - 3, cy - 4, cx + 3, cy + 4], fill=B)
    for k in range(12):                                                                  # l'anneau de pierres
        a = k * math.pi / 6
        x, y = cx + math.cos(a) * 30, cy + math.sin(a) * 42
        d.polygon([(x - 5, y - 4), (x + 4, y - 5), (x + 6, y + 4), (x - 4, y + 5)], fill=B)
        d.polygon([(x + 4, y - 5), (x + 6, y + 4), (x, y + 4)], fill=N)
    ombre_sol(d, cx, cy + 50, 40, 6, B, 0.7)
    x, y = 30, 130                                                                       # la stèle
    d.polygon([(x, y), (x + 4, y - 60), (x + 30, y - 64), (x + 32, y)], fill=B)
    d.polygon([(x + 30, y - 64), (x + 36, y - 60), (x + 38, y - 2), (x + 32, y)], fill=V)
    for k in range(7):
        yy = y - 54 + k * 7
        d.line([(x + 8, yy), (x + 26 - (k * 5) % 9, yy)], fill=N)
        d.point((x + 10 + (k * 7) % 12, yy + 2), fill=V)
    d.line([(x - 4, y + 1), (x + 42, y + 1)], fill=N)
    return im


# ------------------------------------------------------------------
# Les salles : l'entraînement, le cours, la bibliothèque, l'atelier, la taverne
# ------------------------------------------------------------------

def salle_gothique(d, bx0=36, by0=24, bx1=140, by1=112, mur=V, sol_=V):
    """Une grande salle en perspective : le mur du fond, les murs latéraux en piliers, un plancher fuyant."""
    d.rectangle([bx0, by0, bx1, by1], fill=N)
    d.polygon([(0, H), (bx0, by1), (bx1, by1), (W, H)], fill=sol_)
    for k in range(1, 7):                                                                # les lames du plancher
        f = (k / 7) ** 1.5
        y = by1 + (H - by1) * f
        d.line([(bx0 * (1 - f), y), (bx1 + (W - bx1) * f, y)], fill=N)
    for j in range(13):
        xb = -100 + j * 31
        d.line([(bx0 + (bx1 - bx0) * j / 12, by1), (xb, H)], fill=N)
    for (x0, xf) in ((0, bx0), (W, bx1)):                                                # les piliers des murs latéraux
        d.polygon([(x0, 0), (xf, by0), (xf, by1), (x0, H)], fill=N)
        for k in range(4):
            f = k / 4
            xa = x0 + (xf - x0) * f
            xb = x0 + (xf - x0) * (f + 0.08)
            ya, yb = by0 * f, H - (H - by1) * f
            d.polygon([(xa, ya), (xb, by0 * (f + 0.08)), (xb, H - (H - by1) * (f + 0.08)), (xa, yb)], fill=mur)
    for (a, b_) in (((0, 0), (bx0, by0)), ((W, 0), (bx1, by0)), ((0, H), (bx0, by1)), ((W, H), (bx1, by1))):
        d.line([a, b_], fill=B)


def mannequin(im, d, x, y, s=1.0):
    """Un mannequin d'entraînement : un sac de paille sur un poteau, les bras en croix, une cible peinte."""
    ombre_sol(d, x + 4 * s, y + 1, 14 * s, 3 * s, N, 1.2)
    d.rectangle([x - 1 * s, y - 34 * s, x + 1 * s, y], fill=B)
    d.rectangle([x - 6 * s, y - 2 * s, x + 6 * s, y], fill=B)
    d.ellipse([x - 8 * s, y - 52 * s, x + 8 * s, y - 26 * s], fill=B)                     # le corps
    d.chord([x - 8 * s, y - 52 * s, x + 8 * s, y - 26 * s], 300, 80, fill=V)
    d.line([(x - 14 * s, y - 44 * s), (x + 14 * s, y - 44 * s)], fill=B, width=max(1, int(3 * s)))
    d.ellipse([x - 5 * s, y - 64 * s, x + 5 * s, y - 52 * s], fill=B)                     # la tête
    d.chord([x - 5 * s, y - 64 * s, x + 5 * s, y - 52 * s], 300, 80, fill=V)
    for r in (5, 3, 1):                                                                  # la cible
        d.ellipse([x - r * s, y - 39 * s - r * s, x + r * s, y - 39 * s + r * s], outline=N if r != 3 else V)
    for k in (-1, 1):
        d.line([(x + k * 4 * s, y - 30 * s), (x + k * 2 * s, y - 27 * s)], fill=N)


def salle_entrainement():
    """La SalleEntrainement : une grande salle gothique ; sous la haute fenêtre en ogive, des mannequins
    d'entraînement attendent les sorts des élèves ; des marques de brûlures au sol."""
    im, d = toile()
    salle_gothique(d)
    halo(d, 88, 60, 40, V, 0.45, 36)
    fenetre_ogive(d, 70, 28, 36, 70, V, B, B)                                            # la haute fenêtre
    degrade(d, 72, 30, 104, 96, B, 0.6, 0.0)
    for x in range(78, 102, 8):
        d.line([(x, 34), (x, 96)], fill=N)
    for y in range(52, 96, 12):
        d.line([(71, y), (105, y)], fill=N)
    for (x, y, s_) in ((54, 112, 0.7), (122, 112, 0.7), (32, 146, 1.0), (144, 150, 1.05), (88, 128, 0.85)):
        mannequin(im, d, x, y, s_)
    for (x, y) in ((70, 156), (112, 140)):                                               # des brûlures de sorts
        d.ellipse([x - 8, y - 2, x + 8, y + 2], fill=N)
        d.point((x - 3, y - 4), fill=B); d.point((x + 4, y - 6), fill=B)
    return im


def ecran_pupitre(d, x, y, w=12, h=8):
    halo(d, x + w / 2, y + h / 2, w * 0.9, V, 0.45, h)
    d.rectangle([x, y, x + w, y + h], fill=B)
    d.rectangle([x + 1, y + 1, x + w - 1, y + h - 1], fill=V)
    d.line([(x + 2, y + 3), (x + w - 4, y + 3)], fill=B)
    d.rectangle([x + w / 2 - 1, y + h, x + w / 2 + 1, y + h + 2], fill=B)


def salle_de_cours():
    """La salle de Cours (et la SalleDeCours de Cybersup) : sous de hautes arches, un grand tableau où brille un
    triangle de runes et des lignes de cours ; des rangées de pupitres, chacun avec son écran allumé."""
    im, d = toile()
    d.rectangle([0, 0, W, H], fill=N)
    for k, (ox, oy) in enumerate(((4, 4), (14, 10), (24, 16))):                           # les arches successives
        d.rectangle([ox, oy + 40, ox + 2, H], fill=V if k else B)
        d.rectangle([W - ox - 3, oy + 40, W - ox - 1, H], fill=V if k else B)
        d.arc([ox, oy, W - ox - 1, oy + 90], 180, 360, fill=V if k else B, width=2)
    d.rectangle([40, 40, 136, 92], fill=B)                                               # le tableau
    d.rectangle([43, 43, 133, 89], fill=N)
    halo(d, 88, 64, 24, V, 0.6)
    d.polygon([(88, 48), (106, 80), (70, 80)], fill=V)                                   # le triangle de runes
    d.polygon([(88, 56), (99, 76), (77, 76)], fill=N)
    d.point((88, 68), fill=B)
    for (x, y, l) in ((48, 50, 14), (48, 56, 10), (48, 62, 16), (112, 50, 16), (116, 58, 10), (112, 66, 14), (112, 74, 12)):
        d.line([(x, y), (x + l, y)], fill=B if y < 60 else V)
    d.rectangle([40, 92, 136, 95], fill=V)
    for r in range(4):                                                                   # les rangées de pupitres
        f = r / 3
        y = 106 + int(f ** 1.2 * 48)
        l = 50 + f * 40
        hh = 4 + f * 6
        d.polygon([(88 - l, y), (88 + l, y), (88 + l + 4, y + hh), (88 - l - 4, y + hh)], fill=B)
        d.rectangle([88 - l - 4, y + hh, 88 + l + 4, y + hh + 2 + f * 3], fill=V)
        n = 3 + r
        for j in range(n):
            ex = 88 - l + (2 * l) * (j + 0.5) / n
            w_ = 8 + f * 8
            ecran_pupitre(d, ex - w_ / 2, y - w_ * 0.7 - 2, w_, w_ * 0.65)
    return im


def rayonnage(d, x0, y0, x1, y1, graine=1, etageres=5):
    """Une bibliothèque de face : le bois, les planches, des dos de livres de toutes tailles."""
    rnd = random.Random(graine)
    d.rectangle([x0, y0, x1, y1], fill=B)
    d.rectangle([x0 + 2, y0 + 2, x1 - 2, y1 - 2], fill=N)
    pas = (y1 - y0 - 4) / etageres
    for k in range(etageres):
        yb = int(y0 + 2 + (k + 1) * pas)
        d.rectangle([x0, yb - 1, x1, yb], fill=B)
        x = x0 + 3
        while x < x1 - 4:
            w_ = rnd.randint(2, 4)
            h_ = int(pas * rnd.uniform(0.55, 0.85))
            c = rnd.choice((V, V, B, V))
            if rnd.random() < 0.1:
                d.polygon([(x, yb - 2), (x + w_, yb - 2), (x + w_ + 4, yb - h_ + 2), (x + 4, yb - h_ + 2)], fill=c)
                x += w_ + 4
            else:
                d.rectangle([x, yb - 1 - h_, x + w_ - 1, yb - 2], fill=c)
                d.point((x + w_ // 2, yb - h_ + 2), fill=N if c != N else B)
                x += w_ + (1 if rnd.random() < 0.8 else 3)


def bibliotheque():
    """La Bibliothèque (et le Scriptorium) : de hauts rayonnages de livres de part et d'autre, une épaisse moquette
    verte, une lampe qui fait un rond de lumière sur la table de lecture, une échelle contre les étagères."""
    im, d = toile()
    d.rectangle([0, 0, W, H], fill=N)
    rayonnage(d, 50, 20, 126, 112, 3, 6)                                                 # le fond
    for (cote, x0, xf) in ((-1, 0, 50), (1, W, 126)):                                    # les rayonnages en perspective
        d.polygon([(x0, 0), (xf, 20), (xf, 112), (x0, H)], fill=B)
        for k in range(7):
            f = (k + 1) / 8
            ya, yb = 20 * f, 20 * f
            d.line([(x0, 0 + k * 22), (xf, 20 + k * 92 / 6 * 1.0)], fill=N)
        for j in range(26):
            t = j / 26
            x = x0 + (xf - x0) * t
            for k in range(6):
                ytop = (1 - t) * (k * 24) + t * (20 + k * 92 / 6)
                ybot = (1 - t) * ((k + 1) * 24 - 4) + t * (20 + (k + 1) * 92 / 6 - 2)
                if (j * 7 + k * 3) % 5 != 0:
                    d.line([(x, ytop + 3 * (1 - t) + (j % 3)), (x, ybot)], fill=V if (j + k) % 3 else N)
    d.polygon([(0, H), (50, 112), (126, 112), (W, H)], fill=V)                            # la moquette verte
    for k in range(1, 4):
        f = (k / 4) ** 1.5
        y = 112 + (H - 112) * f
        d.line([(50 * (1 - f), y), (126 + 50 * f, y)], fill=N)
    halo(d, 92, 112, 44, B, 0.5, 20, H)
    d.ellipse([60, 120, 124, 136], fill=N)                                               # la table de lecture
    d.ellipse([60, 118, 124, 134], fill=B)
    d.arc([60, 118, 124, 134], 0, 180, fill=V)
    d.rectangle([70, 128, 74, 150], fill=B); d.rectangle([110, 128, 114, 150], fill=B)
    d.polygon([(76, 124), (90, 120), (104, 124), (90, 128)], fill=V)                      # un grimoire ouvert
    d.line([(90, 120), (90, 128)], fill=N)
    d.rectangle([98, 106, 100, 122], fill=V)                                             # la lampe
    d.polygon([(92, 106), (106, 106), (102, 98), (96, 98)], fill=B)
    halo(d, 99, 104, 16, B, 0.6)
    d.line([(132, 30), (150, H)], fill=B, width=2); d.line([(146, 26), (166, H)], fill=B, width=2)   # l'échelle
    for k in range(9):
        t = k / 9
        d.line([(132 + 18 * t, 30 + 140 * t), (146 + 20 * t, 26 + 144 * t)], fill=B)
    return im


def horloge(d, x, y, r, h=0.0):
    d.ellipse([x - r - 1, y - r - 1, x + r + 1, y + r + 1], fill=B)
    d.ellipse([x - r, y - r, x + r, y + r], fill=N if r > 4 else V)
    for k in range(12 if r > 6 else 4):
        a = k * 2 * math.pi / (12 if r > 6 else 4)
        d.point((x + math.cos(a) * (r - 1), y + math.sin(a) * (r - 1)), fill=V if r > 4 else N)
    d.line([(x, y), (x + math.cos(h) * r * 0.7, y + math.sin(h) * r * 0.7)], fill=B if r > 4 else N)
    d.line([(x, y), (x + math.cos(h * 3) * r * 0.45, y + math.sin(h * 3) * r * 0.45)], fill=B if r > 4 else N)


def atelier():
    """L'Atelier de l'Artisane : des murs couverts d'horloges toutes légèrement décalées, des engrenages pendus,
    une fenêtre sur les champs, et l'établi où crache la flamme d'un chalumeau."""
    im, d = toile()
    salle_gothique(d, 30, 20, 146, 104, V, N)
    for k in range(1, 7):
        f = (k / 7) ** 1.5
        y = 104 + (H - 104) * f
        d.line([(30 * (1 - f), y), (146 + 30 * f, y)], fill=V)
    d.rectangle([92, 32, 132, 70], fill=B)                                               # la fenêtre
    degrade(d, 94, 34, 130, 68, V, 0.2, 0.9)
    d.rectangle([94, 58, 130, 68], fill=V)
    d.line([(112, 34), (112, 68)], fill=B); d.line([(94, 50), (130, 50)], fill=B)
    rnd = random.Random(5)
    for (x, y, r) in ((44, 34, 9), (64, 30, 6), (76, 46, 8), (48, 58, 6), (62, 76, 10), (40, 84, 5), (82, 84, 6), (138, 82, 6),
                      (16, 40, 8), (10, 76, 6), (162, 44, 8), (160, 92, 7), (20, 110, 5), (156, 120, 5)):
        horloge(d, x, y, r, rnd.uniform(0, 6.28))
    for (x, l) in ((100, 14), (122, 22)):                                                # des engrenages pendus
        d.line([(x, 20), (x, 20 + l)], fill=B)
        d.ellipse([x - 4, 20 + l, x + 4, 28 + l], fill=B)
        d.ellipse([x - 1, 23 + l, x + 1, 25 + l], fill=N)
        for k in range(8):
            a = k * math.pi / 4
            d.point((x + math.cos(a) * 5, 24 + l + math.sin(a) * 5), fill=B)
    d.polygon([(20, 124), (156, 124), (170, 140), (6, 140)], fill=B)                      # l'établi
    d.rectangle([6, 140, 170, 146], fill=V)
    d.rectangle([14, 146, 20, H], fill=V); d.rectangle([156, 146, 162, H], fill=V)
    for (x, w_) in ((30, 10), (46, 6), (130, 14)):                                         # des outils sur l'établi
        d.rectangle([x, 128, x + w_, 132], fill=N)
    d.line([(60, 130), (70, 126)], fill=N, width=2)
    halo(d, 104, 116, 24, B, 0.65)                                                       # le chalumeau
    d.polygon([(84, 132), (98, 120), (101, 123), (88, 135)], fill=V)
    d.polygon([(100, 120), (114, 108), (108, 118)], fill=B)
    d.polygon([(100, 120), (110, 112), (104, 120)], fill=V)
    for (x, y) in ((116, 106), (120, 112), (112, 102), (122, 104)):                       # les étincelles
        d.point((x, y), fill=B)
    return im


def bouteille(d, x, y, h, c=V):
    d.rectangle([x - 2, y - h, x + 2, y], fill=c)
    d.rectangle([x - 1, y - h - 4, x + 1, y - h], fill=c)
    d.point((x - 1, y - h + 2), fill=B)


def chope(d, x, y, s=1.0):
    """Une chope de bière : le verre vert, la mousse blanche qui déborde, l'anse."""
    d.rectangle([x, y - 22 * s, x + 16 * s, y], fill=V)
    d.rectangle([x + 2 * s, y - 20 * s, x + 4 * s, y - 2 * s], fill=B)
    d.rectangle([x + 12 * s, y - 20 * s, x + 14 * s, y - 2 * s], fill=N)
    d.arc([x + 12 * s, y - 18 * s, x + 24 * s, y - 4 * s], 270, 90, fill=B, width=max(1, int(2 * s)))
    for (dx, dy, r) in ((2, -24, 5), (8, -26, 6), (14, -24, 5)):
        d.ellipse([x + (dx - r) * s, y + (dy - r) * s, x + (dx + r) * s, y + (dy + r) * s], fill=B)
    d.rectangle([x + 2 * s, y - 22 * s, x + 4 * s, y - 14 * s], fill=B)


def campus():
    """Les campus de Lille et de Marseille : un bâtiment contemporain de verre et de brique, des volumes de biais,
    une esplanade dallée, quelques arbres ; le ciel hésite entre le nuage et le soleil."""
    im, d = toile()
    degrade(d, 0, 0, W, 112, V, 0.05, 0.8)
    soleil_doux(d, 150, 22, 8)
    nuage_plat(im, d, 46, 26, 26, 6)
    d.polygon([(10, 112), (10, 50), (64, 40), (64, 112)], fill=B)                         # le volume de brique
    for y in range(52, 112, 4):
        d.line([(10, y - (y - 50) * 0 - 0), (64, y - 10 + (y - 52) * 0)], fill=V)
    for (x, y) in ((16, 60), (30, 58), (44, 56), (16, 80), (30, 78), (44, 76), (16, 98), (30, 96), (44, 94)):
        d.rectangle([x, y, x + 8, y + 10], fill=N)
        d.line([(x + 1, y + 1), (x + 3, y + 1)], fill=V)
    d.polygon([(64, 112), (64, 30), (124, 18), (124, 112)], fill=V)                       # la tour de verre
    for k in range(1, 12):
        y0 = 30 + k * 7.5
        d.line([(64, y0), (124, y0 - 12)], fill=N)
    for x in range(70, 124, 9):
        d.line([(x, 30 - (x - 64) * 0.2), (x, 112)], fill=N)
    d.polygon([(64, 30), (124, 18), (124, 26), (64, 40)], fill=B)
    for (x, y) in ((79, 60), (97, 44), (106, 80)):
        d.line([(x, y), (x + 8, y - 12)], fill=B)
    d.polygon([(118, 112), (112, 54), (160, 40), (168, 112)], fill=B)                    # le volume de biais
    d.polygon([(112, 54), (160, 40), (166, 46), (118, 60)], fill=N)
    for k in range(5):
        y = 70 + k * 9
        d.line([(116, y), (164, y - 8)], fill=V)
    d.rectangle([132, 92, 148, 112], fill=N)
    d.rectangle([134, 94, 146, 112], fill=V)
    d.line([(140, 94), (140, 112)], fill=N)
    d.rectangle([0, 112, W, H], fill=N)                                                  # l'esplanade
    for k in range(1, 8):
        f = (k / 8) ** 1.6
        d.line([(0, 112 + 58 * f), (W, 112 + 58 * f)], fill=V)
    for j in range(15):
        d.line([(30 + j * 9, 112), (-80 + j * 24, H)], fill=V)
    for (x, h_) in ((8, 56), (170, 60)):                                                 # les arbres
        c, dc = calque()
        dc.rectangle([x - 1, H - h_ * 0.6, x + 2, H], fill=N)
        for (dx, dy, r) in ((0, 0, 14), (-8, 8, 10), (8, 6, 10)):
            dc.ellipse([x + dx - r, H - h_ + dy - r, x + dx + r, H - h_ + dy + r], fill=N)
        poser(im, c, V, ((0, -1), (1, 0), (-1, 0)))
    for (x, y, h_) in ((72, 150, 18), (100, 138, 14), (112, 140, 14)):                     # des étudiants
        d.ellipse([x - 3, y - h_, x + 3, y - h_ + 6], fill=B)
        d.polygon([(x - 4, y - h_ + 6), (x + 4, y - h_ + 6), (x + 3, y), (x - 3, y)], fill=B)
        d.line([(x, y - h_ * 0.4), (x, y)], fill=N)
        d.line([(x - 4, y + 1), (x + 6, y + 1)], fill=V)
    return im


def warroom():
    """La WarRoom : un mur d'écrans du sol au plafond ; au centre, la carte du réseau et ses voyants ; une table en
    fer à cheval ; les silhouettes des étudiants de M2, casque sur les oreilles, baignées par la lueur des écrans."""
    im, d = toile()
    d.rectangle([0, 0, W, H], fill=N)
    halo(d, 88, 46, 90, V, 0.5, 50)
    for (x, y, w_, h_, k) in ((4, 6, 34, 24, 0), (4, 34, 34, 24, 1), (4, 62, 34, 22, 2), (138, 6, 34, 24, 3), (138, 34, 34, 24, 4), (138, 62, 34, 22, 5)):
        d.rectangle([x, y, x + w_, y + h_], fill=B)                                      # les écrans latéraux
        d.rectangle([x + 2, y + 2, x + w_ - 2, y + h_ - 2], fill=N)
        if k % 3 == 0:
            pts = [(x + 4 + j * 4, y + h_ - 6 - ((j * 7 + k) % 5) * 3) for j in range(8)]
            d.line(pts, fill=V)
        elif k % 3 == 1:
            for j in range(5):
                hh = 3 + (j * 5 + k) % 12
                d.rectangle([x + 5 + j * 6, y + h_ - 4 - hh, x + 8 + j * 6, y + h_ - 4], fill=V)
        else:
            for j in range(4):
                d.line([(x + 5, y + 6 + j * 4), (x + 5 + 10 + (j * 7) % 14, y + 6 + j * 4)], fill=V if j else B)
    d.rectangle([42, 4, 134, 78], fill=B)                                                # le grand écran mural
    d.rectangle([45, 7, 131, 75], fill=N)
    noeuds = [(62, 24), (88, 18), (114, 28), (70, 48), (100, 52), (120, 62), (56, 64), (88, 38)]
    for (a, b_) in ((0, 1), (1, 2), (0, 3), (3, 7), (1, 7), (7, 4), (2, 4), (4, 5), (3, 6), (2, 7)):
        d.line([noeuds[a], noeuds[b_]], fill=V)
    for k, (x, y) in enumerate(noeuds):
        rouge = k in (2, 5)                                                              # les voyants qui virent au rouge
        if rouge:
            halo(d, x, y, 8, B, 0.7)
        d.ellipse([x - 3, y - 3, x + 3, y + 3], fill=B if rouge else V)
        d.ellipse([x - 1, y - 1, x + 1, y + 1], fill=N if rouge else B)
    d.rectangle([0, 90, W, H], fill=N)
    d.chord([10, 98, 166, 190], 180, 360, fill=V)                                        # la table en fer à cheval
    d.chord([34, 112, 142, 190], 180, 360, fill=N)
    d.arc([10, 98, 166, 190], 180, 360, fill=B)
    for (x, y, s_) in ((30, 140, 0.9), (60, 116, 0.8), (88, 110, 0.75), (116, 116, 0.8), (146, 140, 0.9)):
        ecran_pupitre(d, x - 8 * s_, y - 16 * s_, 16 * s_, 10 * s_)
    for (x, y, s_) in ((44, 170, 1.2), (88, 176, 1.3), (132, 170, 1.2)):                   # les étudiants, de dos
        c, dc = calque()
        dc.ellipse([x - 9 * s_, y - 50 * s_, x + 9 * s_, y - 30 * s_], fill=N)
        dc.chord([x - 22 * s_, y - 32 * s_, x + 22 * s_, y + 10 * s_], 180, 360, fill=N)
        dc.rectangle([x - 22 * s_, y - 12 * s_, x + 22 * s_, y], fill=N)
        dc.arc([x - 11 * s_, y - 54 * s_, x + 11 * s_, y - 32 * s_], 180, 360, fill=N, width=2)
        dc.rectangle([x - 12 * s_, y - 44 * s_, x - 8 * s_, y - 36 * s_], fill=N)
        dc.rectangle([x + 8 * s_, y - 44 * s_, x + 12 * s_, y - 36 * s_], fill=N)
        poser(im, c, V, ((0, -1), (-1, 0), (1, 0)))
        d.arc([x - 11 * s_, y - 54 * s_, x + 11 * s_, y - 32 * s_], 200, 340, fill=B)
    return im


def cybersup():
    """Cybersup, au pied des tours de La Défense : au petit matin, les tours de verre se découpent sur le ciel ;
    au centre, le bâtiment de l'école et son enseigne CYBERSUP, ses fenêtres allumées ; l'esplanade dallée devant."""
    im, d = toile()
    degrade(d, 0, 0, W, 150, V, 0.05, 0.95)
    degrade(d, 0, 110, W, 150, B, 0.0, 0.5)
    c, dc = calque()                                                                     # les tours, au loin
    for (x, w_, h_, pointe) in ((2, 16, 104, 0), (20, 14, 128, 1), (36, 12, 92, 0), (128, 14, 118, 0), (144, 18, 136, 1), (162, 14, 96, 0)):
        dc.rectangle([x, 150 - h_, x + w_, 150], fill=N)
        if pointe:
            dc.polygon([(x, 150 - h_), (x + w_, 150 - h_ - 10), (x + w_, 150 - h_)], fill=N)
    poser(im, c, B, ((-1, 0), (0, -1)))
    for (x, w_, h_) in ((2, 16, 104), (20, 14, 128), (36, 12, 92), (128, 14, 118), (144, 18, 136), (162, 14, 96)):
        for y in range(150 - h_ + 6, 148, 6):                                            # leurs étages de verre
            d.line([(x + 3, y), (x + w_ - 3, y)], fill=V)
        for k in range(3):
            yy = 150 - h_ + 10 + ((x * 7 + k * 29) % (h_ - 20))
            d.rectangle([x + 3 + (k * 4) % (w_ - 6), yy, x + 5 + (k * 4) % (w_ - 6), yy + 2], fill=B)
    x0, x1, y0, y1 = 48, 128, 44, 150                                                    # le bâtiment de l'école
    d.rectangle([x0, y0, x1, y1], fill=B)
    d.rectangle([x1 - 12, y0, x1, y1], fill=V)
    d.polygon([(x1, y0), (x1 + 6, y0 + 4), (x1 + 6, y1), (x1, y1)], fill=N)
    d.rectangle([x0, y0, x1 - 13, y0 + 14], fill=N)                                      # l'enseigne
    d.rectangle([x0 + 2, y0 + 2, x1 - 15, y0 + 12], fill=V)
    texte_centre(d, y0 + 2, "CYBERSUP", N, x0, x1 - 13)
    texte_centre(d, y0 + 1, "CYBERSUP", B, x0, x1 - 13)
    for r in range(5):                                                                   # les fenêtres, certaines allumées
        for k in range(4):
            x, y = x0 + 6 + k * 16, y0 + 22 + r * 16
            d.rectangle([x, y, x + 11, y + 9], fill=N)
            if (r * 3 + k) % 4 == 1:
                d.rectangle([x + 1, y + 1, x + 10, y + 8], fill=V)
                d.line([(x + 2, y + 2), (x + 5, y + 2)], fill=B)
            else:
                d.line([(x + 2, y + 7), (x + 6, y + 3)], fill=V)
    d.rectangle([x0 + 22, y1 - 22, x0 + 50, y1], fill=N)                                 # la porte vitrée
    d.rectangle([x0 + 24, y1 - 20, x0 + 48, y1], fill=V)
    d.line([(x0 + 36, y1 - 20), (x0 + 36, y1)], fill=N)
    halo(d, x0 + 36, y1 + 2, 22, B, 0.55, 8, H)
    d.rectangle([0, 150, W, H], fill=N)                                                  # l'esplanade
    for k in range(1, 6):
        f = (k / 6) ** 1.5
        d.line([(0, 150 + 20 * f), (W, 150 + 20 * f)], fill=V)
    for j in range(13):
        d.line([(40 + j * 8, 150), (-60 + j * 25, H)], fill=V)
    return im


# ------------------------------------------------------------------
# Les objets
# ------------------------------------------------------------------

def sol_objet(d, cx, y, l=60, c=V):
    """Le sol sous un objet : une ombre tramée et les tirets du jeu."""
    ombre_sol(d, cx, y + 2, l * 0.55, 5, c, 0.9)
    tirets_sol(d, cx, y + 8, l, B)


def livre(d, x, y, w, h, ep=8, c=V, titre=(), s=2, deco=None):
    """Un gros livre debout, vu de trois quarts : la couverture, la tranche des pages, le dos en relief."""
    d.polygon([(x + w, y), (x + w + ep, y + ep * 0.6), (x + w + ep, y + h + ep * 0.6), (x + w, y + h)], fill=B)   # les pages
    for k in range(2, ep, 2):
        d.line([(x + w + k, y + k * 0.6 + 2), (x + w + k, y + h + k * 0.6 - 2)], fill=V if c != V else N)
    d.polygon([(x, y + h), (x + w, y + h), (x + w + ep, y + h + ep * 0.6), (x + ep, y + h + ep * 0.6)], fill=c)
    d.rectangle([x, y, x + w, y + h], fill=c)
    d.rectangle([x + 4, y + 4, x + w - 4, y + h - 4], outline=B)
    d.rectangle([x, y, x + 3, y + h], fill=N)
    d.line([(x + 1, y), (x + 1, y + h)], fill=B)
    for k, t in enumerate(titre):
        lt = largeur_texte(t, s)
        gros_texte(d, x + 3 + (w - lt) // 2, y + 10 + k * (8 * s + 4), t, s, B, N, N, 1)
    if deco:
        deco(d)


def historybook():
    """L'HistoireDeTerminus (et les registres) : un énorme livre vert, son titre en relief, ses pages jaunies."""
    im, d = toile()
    halo(d, 88, 80, 60, V, 0.35, 50)
    sol_objet(d, 92, 140, 90)
    livre(d, 46, 30, 82, 104, 12, V, ("HIS", "TORY"), 3)
    return im


def radspellbook():
    """Le GrimoireTropCool : un livre au titre TOTALLY RAD, entouré d'éclairs qui crépitent."""
    im, d = toile()
    halo(d, 90, 84, 66, V, 0.5, 56)
    livre(d, 56, 36, 64, 92, 10, N, ("TOTALLY",), 1)
    d.rectangle([60, 40, 116, 124], outline=V)
    gros_texte(d, 66, 72, "RAD", 4, V, B, N, 2)
    for (x, y, a) in ((26, 40, 1), (148, 44, -1), (20, 112, 1), (154, 118, -1), (88, 8, 1), (90, 150, -1)):
        pts = [(x, y), (x + 6 * a, y + 6), (x - 2 * a, y + 8), (x + 6 * a, y + 16)]
        d.line(pts, fill=V, width=3)
        d.line(pts, fill=B, width=1)
    return im


def manuscrit():
    """Un manuscrit : un long parchemin déroulé, ses deux rouleaux, des lignes d'écriture et un sceau vert."""
    im, d = toile()
    sol_objet(d, 90, 146, 96)
    x0, x1, y0, y1 = 46, 130, 30, 136
    d.polygon([(x0, y0), (x1, y0 + 6), (x1 - 4, y1), (x0 + 4, y1 - 6)], fill=B)            # la feuille, un peu de travers
    d.polygon([(x1, y0 + 6), (x1 - 4, y1), (x1 - 12, y1 - 1), (x1 - 8, y0 + 5)], fill=V)
    for k in range(10):                                                                  # l'écriture
        y = y0 + 16 + k * 9
        l = 60 - (k * 13) % 22
        d.line([(x0 + 10, y + k * 0.1), (x0 + 10 + l, y + 4 + k * 0.1)], fill=N)
        d.point((x0 + 12 + (k * 11) % 40, y + 2), fill=V)
    for (x, y) in ((x0 - 2, y0 - 4), (x0 + 2, y1 - 10)):                                 # les rouleaux
        d.polygon([(x, y), (x + 88, y + 6), (x + 88, y + 16), (x, y + 10)], fill=B)
        d.polygon([(x, y + 6), (x + 88, y + 12), (x + 88, y + 16), (x, y + 10)], fill=V)
        d.ellipse([x - 6, y - 1, x + 6, y + 11], fill=B)
        d.ellipse([x - 3, y + 2, x + 3, y + 8], fill=V)
        d.ellipse([x + 82, y + 5, x + 94, y + 17], fill=V)
    d.ellipse([x1 - 30, y1 - 30, x1 - 14, y1 - 14], fill=V)                              # le sceau
    d.ellipse([x1 - 27, y1 - 27, x1 - 17, y1 - 17], fill=B)
    d.ellipse([x1 - 25, y1 - 25, x1 - 19, y1 - 19], fill=V)
    d.polygon([(x1 - 26, y1 - 16), (x1 - 24, y1 - 4), (x1 - 21, y1 - 14)], fill=V)
    return im


def panneau():
    """Un panneau de bois sur son poteau, couvert d'inscriptions, planté dans une touffe d'herbe."""
    im, d = toile()
    sol_objet(d, 88, 142, 70)
    d.rectangle([84, 74, 92, 144], fill=B)                                               # le poteau
    d.rectangle([89, 74, 92, 144], fill=V)
    d.polygon([(30, 34), (146, 30), (148, 84), (32, 88)], fill=N)                         # la planche, sa tranche
    d.polygon([(28, 30), (144, 26), (146, 80), (30, 84)], fill=B)
    d.polygon([(144, 26), (148, 30), (150, 84), (146, 80)], fill=V)
    for k in range(4):                                                                   # le veinage
        d.line([(34, 36 + k * 12), (140, 33 + k * 12)], fill=V)
    for k, (x, l) in enumerate(((40, 70), (44, 86), (40, 58), (52, 66))):                 # les inscriptions
        y = 40 + k * 11
        pts = [(x + j * 4, y + (j * 3) % 5 - 2) for j in range(l // 4)]
        d.line(pts, fill=N, width=2)
    for (x, y) in ((34, 32), (138, 30), (36, 78), (140, 76)):                            # les clous
        d.point((x, y), fill=N)
    herbes(d, 136, 146, 2, V, B, 2.0, 66, 112)
    return im


def chope_biere():
    """Le Tavernier : une grande chope de bière, la mousse qui déborde, des bulles, posée sur le comptoir."""
    im, d = toile()
    halo(d, 84, 80, 56, V, 0.35, 50)
    d.rectangle([26, 138, 150, 142], fill=B)
    for x in range(30, 150, 16):
        d.line([(x, 146), (x + 10, 146)], fill=V)
    chope(d, 54, 136, 3.2)
    for (x, y) in ((70, 110), (78, 96), (66, 84), (82, 120), (74, 70)):
        d.ellipse([x - 2, y - 2, x + 2, y + 2], outline=B)
    for (x, y) in ((50, 136), (112, 136)):
        d.line([(x, y + 1), (x + 4, y + 1)], fill=V)
    return im


def luth():
    """Le Barde : son luth au corps rond et vert, la rosace, le manche et ses chevilles ; des notes s'envolent."""
    im, d = toile()
    cx, cy = 74, 112
    d.ellipse([cx - 34, cy - 30, cx + 34, cy + 34], fill=N)                              # le corps
    d.ellipse([cx - 32, cy - 30, cx + 32, cy + 32], fill=V)
    d.arc([cx - 30, cy - 28, cx + 30, cy + 30], 150, 250, fill=B, width=2)
    for k in (-2, -1, 1, 2):
        d.arc([cx - 32 + abs(k) * 6, cy - 30, cx + 32 - abs(k) * 6, cy + 32], 280, 80, fill=N)
    d.ellipse([cx - 9, cy - 9, cx + 9, cy + 9], fill=N)                                  # la rosace
    d.ellipse([cx - 9, cy - 9, cx + 9, cy + 9], outline=B)
    d.ellipse([cx - 5, cy - 5, cx + 5, cy + 5], outline=V)
    d.polygon([(cx + 10, cy - 14), (cx + 64, cy - 68), (cx + 70, cy - 62), (cx + 16, cy - 8)], fill=B)   # le manche
    d.line([(cx + 16, cy - 8), (cx + 70, cy - 62)], fill=V)
    d.polygon([(cx + 64, cy - 68), (cx + 76, cy - 84), (cx + 86, cy - 76), (cx + 70, cy - 62)], fill=V)  # la tête
    for k in range(3):
        d.rectangle([cx + 70 + k * 4, cy - 84 + k * 4, cx + 72 + k * 4, cy - 80 + k * 4], fill=B)
        d.rectangle([cx + 62 + k * 4, cy - 78 + k * 4, cx + 64 + k * 4, cy - 74 + k * 4], fill=B)
    for k in range(-1, 2):                                                               # les cordes
        d.line([(cx - 12 + k * 3, cy + 18 + k * 3), (cx + 66 + k * 2, cy - 66 - k * 2)], fill=B)
    d.rectangle([cx - 16, cy + 14, cx - 6, cy + 20], fill=N)
    d.line([(cx - 16, cy + 17), (cx - 6, cy + 17)], fill=B)
    for (x, y, double) in ((28, 30, False), (52, 18, True), (130, 112, False), (150, 88, True)):   # les notes
        if double:
            d.ellipse([x - 4, y + 10, x + 2, y + 15], fill=B); d.ellipse([x + 8, y + 7, x + 14, y + 12], fill=B)
            d.line([(x + 1, y + 12), (x + 1, y)], fill=B, width=2); d.line([(x + 13, y + 9), (x + 13, y - 3)], fill=B, width=2)
            d.line([(x + 1, y), (x + 13, y - 3)], fill=V, width=3)
        else:
            d.ellipse([x - 4, y + 10, x + 2, y + 15], fill=B)
            d.line([(x + 1, y + 12), (x + 1, y)], fill=B, width=2)
            d.line([(x + 1, y), (x + 7, y + 6)], fill=V, width=2)
    return im


def gros_rocher():
    """Le Rocher (et le GrosRocher) : un gros bloc arrondi comme une miche, éclairé en haut à gauche, sombre en bas à
    droite, fendillé, posé sur une bande de mousse."""
    im, d = toile()
    ombre_sol(d, 96, 130, 76, 8, V, 1.0)
    px = im.load()
    cx, base, rx, ry = 88, 128, 62, 58
    forme = set()
    for y in range(base - ry - 2, base + 1):
        for x in range(cx - rx - 2, cx + rx + 3):
            u, v = (x - cx) / rx, (base - y) / ry
            bosse = 1 + 0.05 * math.sin(u * 7 + 1)
            if v >= 0 and u * u + (v * bosse) ** 2 <= 1:
                forme.add((x, y))
    for (x, y) in forme:
        u, v = (x - cx) / rx, (base - y) / ry
        if any((x + dx, y + dy) not in forme for dx, dy in ((1, 0), (-1, 0), (0, -1))):
            px[x, y] = V if u > 0.1 else B
        elif (u + 0.3) ** 2 + ((v - 0.75) * 1.3) ** 2 < 0.62:
            px[x, y] = B
        elif v < 0.1:
            px[x, y] = V
        else:
            px[x, y] = V if (u + 0.3) ** 2 + ((v - 0.75) * 1.3) ** 2 < 1.15 else N
    d.line([(cx - 10, base - 46), (cx - 2, base - 34), (cx - 6, base - 22), (cx + 4, base - 12)], fill=N)   # les fêlures
    d.line([(cx - 2, base - 34), (cx + 10, base - 30)], fill=N)
    d.line([(cx - 40, base - 26), (cx - 30, base - 20)], fill=V)
    for (x, y, r) in ((cx - 30, base - 38, 2), (cx + 20, base - 40, 2), (cx - 46, base - 14, 2)):
        d.ellipse([x - r, y - r, x + r, y + r], fill=V)
    herbes(d, base - 4, base + 4, 4, V, B, 2.5, cx - rx - 8, cx + rx + 8)
    tirets_sol(d, 90, base + 12, 130)
    return im


def boite():
    """La Boîte : un carton ouvert, vu de trois quarts, ses rabats dressés, une ombre au fond."""
    im, d = toile()
    sol_objet(d, 92, 136, 100)
    x, y, w, h, p = 48, 82, 66, 52, 22
    d.polygon([(x, y), (x + w, y), (x + w + p, y - p * 0.6), (x + p, y - p * 0.6)], fill=N)   # l'ouverture
    d.polygon([(x + p, y - p * 0.6), (x + w + p, y - p * 0.6), (x + w + p, y - p * 0.6 + 14), (x + p, y - p * 0.6 + 14)], fill=V)
    d.rectangle([x, y, x + w, y + h], fill=B)                                            # la face
    d.polygon([(x + w, y), (x + w + p, y - p * 0.6), (x + w + p, y + h - p * 0.6), (x + w, y + h)], fill=V)
    d.line([(x + w, y), (x + w, y + h)], fill=N)
    d.line([(x + w / 2 - 10, y + 16), (x + w / 2 + 10, y + 16)], fill=V, width=3)         # le ruban adhésif
    d.polygon([(x, y), (x + w, y), (x + w - 10, y - 20), (x - 6, y - 16)], fill=B)        # les rabats
    d.line([(x, y), (x + w, y)], fill=N)
    d.polygon([(x + w, y), (x + w + p, y - p * 0.6), (x + w + p + 14, y - p * 0.6 + 10), (x + w + 12, y + 8)], fill=V)
    d.polygon([(x + p, y - p * 0.6), (x + w + p, y - p * 0.6), (x + w + p - 6, y - p * 0.6 - 16), (x + p + 4, y - p * 0.6 - 18)], fill=B)
    d.polygon([(x, y), (x + p, y - p * 0.6), (x + p - 12, y - p * 0.6 - 6), (x - 14, y - 4)], fill=V)
    return im


def petit_captif(im, d, cx, y):
    """L'enfant dans la cage : une grosse tête, de grandes lunettes, une drôle de touffe, un pull rayé."""
    d.rectangle([cx - 12, y - 46, cx + 12, y - 20], fill=V)                              # le pull rayé
    for yy in range(y - 42, y - 20, 4):
        d.line([(cx - 12, yy), (cx + 12, yy)], fill=B)
    d.rectangle([cx - 9, y - 20, cx - 4, y], fill=B); d.rectangle([cx + 4, y - 20, cx + 9, y], fill=B)
    d.rectangle([cx - 11, y - 2, cx - 3, y], fill=V); d.rectangle([cx + 3, y - 2, cx + 11, y], fill=V)
    d.rectangle([cx - 18, y - 44, cx - 12, y - 40], fill=B); d.rectangle([cx + 12, y - 44, cx + 18, y - 40], fill=B)
    d.rectangle([cx - 14, y - 76, cx + 14, y - 46], fill=B)                              # la tête
    d.rectangle([cx - 14, y - 76, cx + 14, y - 72], fill=V)
    for (x, l) in ((cx - 6, 8), (cx, 12), (cx + 6, 7)):
        d.line([(x, y - 76), (x + 2, y - 76 - l)], fill=V, width=2)
    for x in (cx - 12, cx + 2):                                                          # les lunettes
        d.rectangle([x, y - 68, x + 10, y - 60], fill=N)
        d.rectangle([x + 2, y - 66, x + 8, y - 62], fill=B)
        d.rectangle([x + 4, y - 65, x + 6, y - 63], fill=N)
    d.rectangle([cx - 2, y - 66, cx + 2, y - 65], fill=N)
    d.rectangle([cx - 5, y - 54, cx + 5, y - 51], fill=N)
    d.rectangle([cx - 3, y - 53, cx + 3, y - 52], fill=V)


def mais():
    """L'ÉpiDeMaïs : un bel épi aux grains blancs bien rangés, à demi sorti de ses feuilles vertes."""
    im, d = toile()
    sol_objet(d, 90, 136, 90)
    cx, cy, a = 88, 84, math.radians(-35)
    ca, sa = math.cos(a), math.sin(a)

    def R(u, v):
        return (cx + u * ca - v * sa, cy + u * sa + v * ca)
    d.polygon([R(-60, 2), R(-20, -18), R(40, -20), R(66, -4), R(40, 6)], fill=N)
    d.polygon([R(-46, 0), R(-10, -16), R(44, -16), R(62, -4), R(40, 2)], fill=V)
    for j in range(-6, 7):                                                               # les grains
        for i in range(12):
            u = -40 + i * 8 + (j % 2) * 4
            if abs(j) * 8 > 30 * math.sqrt(max(0, 1 - ((u - 10) / 56) ** 2)) + 4:
                continue
            x, y = R(u, j * 4.2)
            d.ellipse([x - 3, y - 2, x + 3, y + 2], fill=B)
            d.point((x + 1, y + 1), fill=V)
    d.polygon([R(-58, 6), R(-16, 18), R(36, 16), R(70, 10), R(30, 4), R(-20, 6)], fill=V)   # les feuilles
    d.line([R(-58, 6), R(-16, 18), R(36, 16), R(70, 10)], fill=B)
    d.polygon([R(-56, -2), R(-20, -30), R(30, -32), R(-10, -18)], fill=V)
    d.line([R(-56, -2), R(-20, -30), R(30, -32)], fill=B)
    d.line([R(-60, 2), R(-76, 8)], fill=B, width=4)
    for k in range(5):                                                                   # les barbes
        d.line([R(66, -2 + k), R(84, -8 + k * 5)], fill=B)
    return im


def mannequin_bois():
    """Un mannequin d'entraînement (en noir et blanc) : tête, torse, bras écartés, une cible sur la poitrine,
    planté sur son pied."""
    im, d = toile()
    trame(d, 52, 150, 128, 154, B, 0.4)
    d.rectangle([86, 104, 92, 148], fill=B)                                              # le pied
    d.polygon([(66, 152), (112, 152), (100, 146), (78, 146)], fill=B)
    d.ellipse([70, 40, 108, 108], fill=B)                                                # le torse
    trame(d, 92, 44, 108, 108, N, 0.35)
    d.ellipse([70, 40, 108, 108], outline=N)
    d.polygon([(40, 56), (70, 52), (70, 64), (40, 66)], fill=B)                          # les bras
    d.polygon([(108, 52), (138, 56), (138, 66), (108, 64)], fill=B)
    d.ellipse([34, 54, 46, 68], fill=B); d.ellipse([132, 54, 144, 68], fill=B)
    d.ellipse([76, 8, 102, 38], fill=B)                                                  # la tête
    trame(d, 92, 10, 102, 38, N, 0.35)
    d.line([(82, 22), (86, 22)], fill=N, width=2); d.line([(92, 22), (96, 22)], fill=N, width=2)
    d.line([(84, 30), (94, 30)], fill=N)
    d.rectangle([85, 38, 93, 42], fill=B)
    for r in (14, 9, 4):                                                                 # la cible
        d.ellipse([89 - r, 74 - r, 89 + r, 74 + r], outline=N, width=2)
    d.ellipse([87, 72, 91, 76], fill=N)
    for (x, y) in ((76, 50), (100, 96), (80, 98)):                                       # les coutures
        d.line([(x, y), (x + 4, y + 2)], fill=N)
    tirets_sol(d, 89, 158, 90)
    return im


def levier():
    """Le LevierDiscret : une manette de fer sur son socle, la boule verte au bout, tirée vers l'avant."""
    im, d = toile()
    sol_objet(d, 86, 128, 90)
    d.polygon([(40, 116), (110, 116), (134, 98), (64, 98)], fill=B)                       # le socle
    d.polygon([(40, 116), (110, 116), (110, 126), (40, 126)], fill=V)
    d.polygon([(110, 116), (134, 98), (134, 108), (110, 126)], fill=N)
    d.line([(110, 116), (134, 98)], fill=V)
    d.polygon([(76, 104), (98, 104), (102, 100), (80, 100)], fill=N)                      # la fente
    d.line([(88, 104), (128, 44)], fill=B, width=6)                                      # la manette
    d.line([(90, 104), (130, 44)], fill=N, width=1)
    d.ellipse([118, 26, 142, 50], fill=V)                                                # la boule
    d.ellipse([122, 30, 132, 40], fill=B)
    d.arc([118, 26, 142, 50], 20, 110, fill=N, width=2)
    for k in range(3):
        d.point((86 - k * 8, 110), fill=N)
    return im


def casier():
    """La CarteÉtudiante, le casier, le bureau fermé : un coffre vert, son cadenas en relief et sa poignée."""
    im, d = toile()
    sol_objet(d, 90, 138, 100)
    x, y, w, h, p = 42, 58, 76, 78, 26
    d.polygon([(x, y), (x + w, y), (x + w + p, y - p * 0.6), (x + p, y - p * 0.6)], fill=B)   # le dessus
    d.rectangle([x, y, x + w, y + h], fill=V)                                            # la face
    d.polygon([(x + w, y), (x + w + p, y - p * 0.6), (x + w + p, y + h - p * 0.6), (x + w, y + h)], fill=N)
    d.line([(x + w, y), (x + w + p, y - p * 0.6)], fill=B)
    d.line([(x + w + p, y - p * 0.6), (x + w + p, y + h - p * 0.6)], fill=V)
    d.rectangle([x + 6, y + 6, x + w - 6, y + h - 6], outline=B)
    for k in range(3):
        d.line([(x + w + 4 + k * 7, y - 2 - k * 4 + 12), (x + w + 4 + k * 7, y + h - 6 - k * 4)], fill=V)
    cx, cy = x + w / 2, y + h / 2 + 6                                                    # le cadenas
    d.arc([cx - 10, cy - 24, cx + 10, cy - 4], 180, 360, fill=B, width=4)
    d.rectangle([cx - 10, cy - 14, cx - 7, cy - 6], fill=B); d.rectangle([cx + 7, cy - 14, cx + 10, cy - 6], fill=B)
    d.rectangle([cx - 15, cy - 8, cx + 15, cy + 16], fill=B)
    d.rectangle([cx + 9, cy - 8, cx + 15, cy + 16], fill=V)
    d.ellipse([cx - 4, cy - 2, cx + 2, cy + 4], fill=N)
    d.rectangle([cx - 2, cy + 3, cx, cy + 9], fill=N)
    return im


def portail():
    """Le Portail : un losange de pierre qui tourne sur lui-même, des anneaux de lumière qui s'enfoncent au centre."""
    im, d = toile()
    cx, cy = 88, 84
    halo(d, cx, cy, 86, V, 0.7, 84)
    for k, r in enumerate((76, 66, 54, 42, 30, 20, 11)):
        pts = [(cx, cy - r), (cx + r, cy), (cx, cy + r), (cx - r, cy)]
        d.polygon(pts, fill=(B, V, N, V, N, B, V)[k])
    for k, r in enumerate((76, 54)):
        d.line([(cx, cy - r), (cx + r, cy), (cx, cy + r)], fill=N if k == 0 else B)
    for k in range(4):                                                                   # la spirale du centre
        a0 = k * math.pi / 2
        pts = [(cx + math.cos(a0 + t / 10) * (2 + t * 0.9), cy + math.sin(a0 + t / 10) * (2 + t * 0.9)) for t in range(0, 22)]
        d.line(pts, fill=B)
    d.ellipse([cx - 3, cy - 3, cx + 3, cy + 3], fill=B)
    for (x, y) in ((cx, cy - 86), (cx + 86, cy), (cx - 86, cy), (cx, cy + 82)):          # les éclats
        d.line([(x - 3, y), (x + 3, y)], fill=B); d.line([(x, y - 3), (x, y + 3)], fill=B)
    return im


def poste_travail():
    """Le poste de travail (en noir et blanc) : un vieil ordinateur à écran cathodique, le hibou du système sur
    l'écran, le clavier devant ; il sert aussi d'image aux baies et aux machines."""
    im, d = toile()
    x, y, w, h = 36, 22, 92, 80
    trame(d, x + 4, y + h + 26, x + w + 26, y + h + 32, B, 0.35)
    d.polygon([(x + w, y + 4), (x + w + 16, y + 12), (x + w + 16, y + h + 6), (x + w, y + h)], fill=B)   # le boîtier
    trame(d, x + w + 1, y + 6, x + w + 16, y + h + 6, N, 0.45)
    d.rectangle([x, y, x + w, y + h], fill=B)
    d.rectangle([x + 8, y + 8, x + w - 8, y + h - 16], fill=N)                           # l'écran
    d.rectangle([x + 10, y + 10, x + w - 10, y + h - 18], outline=B)
    cx, cy = x + w / 2, y + 34                                                           # le hibou
    d.ellipse([cx - 14, cy - 16, cx + 14, cy + 18], fill=B)
    d.polygon([(cx - 14, cy - 12), (cx - 10, cy - 22), (cx - 4, cy - 14)], fill=B)
    d.polygon([(cx + 14, cy - 12), (cx + 10, cy - 22), (cx + 4, cy - 14)], fill=B)
    for ox in (-6, 6):
        d.ellipse([cx + ox - 5, cy - 11, cx + ox + 5, cy - 1], fill=N)
        d.ellipse([cx + ox - 2, cy - 8, cx + ox + 2, cy - 4], fill=B)
    d.polygon([(cx - 2, cy), (cx + 2, cy), (cx, cy + 4)], fill=N)
    for k in range(3):
        d.line([(cx - 8 + k * 2, cy + 8 + k * 3), (cx + 8 - k * 2, cy + 8 + k * 3)], fill=N)
    d.line([(cx - 20, cy + 18), (cx + 20, cy + 18)], fill=B, width=2)
    d.rectangle([x + 10, y + h - 10, x + 26, y + h - 7], fill=N)                         # le voyant et la fente
    d.rectangle([x + w - 20, y + h - 11, x + w - 14, y + h - 7], fill=N)
    d.polygon([(x - 8, y + h + 8), (x + w + 4, y + h + 8), (x + w + 20, y + h + 26), (x + 4, y + h + 26)], fill=B)   # le clavier
    for k in range(3):
        for j in range(14):
            kx = x - 2 + j * 7.6 + k * 4.5
            d.rectangle([kx, y + h + 11 + k * 5, kx + 4, y + h + 13 + k * 5], fill=N)
    d.line([(x - 8, y + h + 8), (x + 4, y + h + 26)], fill=N)
    return im


def enveloppe_convocation():
    """La Convocation : une enveloppe blanche, fermée par un sceau de cire vert, son rabat ombré (60 x 42)."""
    w, h = 60, 42
    im = Image.new('P', (w, h), N)
    im.putpalette(PAL)
    d = ImageDraw.Draw(im)
    d.rectangle([2, 6, 57, 39], fill=B)
    d.line([(2, 39), (21, 23)], fill=V); d.line([(57, 39), (38, 23)], fill=V)            # les plis du bas
    d.polygon([(2, 6), (29, 26), (57, 6)], fill=B)                                       # le rabat et son ombre
    d.line([(3, 7), (29, 27), (56, 7)], fill=V)
    d.line([(2, 7), (29, 28)], fill=N); d.line([(29, 28), (57, 7)], fill=N)
    d.line([(4, 37), (55, 37)], fill=V)
    d.ellipse([22, 19, 36, 33], fill=N)                                                  # le sceau de cire
    d.ellipse([23, 20, 35, 32], fill=V)
    d.ellipse([26, 23, 32, 29], outline=B)
    d.point((29, 26), fill=B)
    d.point((25, 22), fill=B)
    d.polygon([(25, 32), (27, 36), (29, 32)], fill=V)
    d.polygon([(30, 32), (32, 35), (33, 31)], fill=V)
    return im


def sauver_petit(nom, im):
    """Une petite image sans cadre (l'enveloppe), doublée, avec la palette du GIF d'origine."""
    grand = im.resize((im.width * 2, im.height * 2), Image.NEAREST).convert('RGB')
    origine = Image.open(SRC + nom)
    pal = origine.getpalette()
    n = len(pal) // 3
    cache = {}

    def index(c):
        return min(range(n), key=lambda i: sum((pal[3 * i + j] - c[j]) ** 2 for j in range(3)))
    sortie = Image.new('P', grand.size)
    sortie.putpalette(pal)
    sortie.putdata([cache[c] if c in cache else cache.setdefault(c, index(c)) for c in grand.get_flattened_data()])
    sortie.save(OUT + nom, optimize=False, **{k: origine.info[k] for k in ('transparency', 'background') if k in origine.info})


# ------------------------------------------------------------------
# Les personnages, en pied
# ------------------------------------------------------------------

SOL = 148
TOUS_COTES = ((1, 0), (-1, 0), (0, 1), (0, -1))


def personnage(dessin, l=70, cx=88, halo_=None):
    """Un personnage en pied : son ombre au sol et les tirets, puis la silhouette dessinée sur un calque ; les parties
    noires (cheveux, vêtements sombres) reçoivent un liseré blanc pour se détacher du fond."""
    im, d = toile()
    if halo_:
        halo(d, cx, halo_[0], halo_[1], V, 0.45, halo_[2])
    ombre_sol(d, cx + 4, SOL + 2, l * 0.5, 5, V, 0.9)
    tirets_sol(d, cx, SOL + 9, l)
    c, dc = calque()
    dessin(dc)
    poser(im, c, B, TOUS_COTES, 1, (N,))
    return im


def oeil(d, x, y, r=2, fond=None):
    if fond is not None:
        d.ellipse([x - r - 1, y - r - 1, x + r + 1, y + r + 1], fill=fond)
    d.ellipse([x - r, y - r, x + r, y + r], fill=N)
    d.point((x - r // 2, y - r // 2), fill=B)


def lunettes(d, x1, x2, y, r=4, c=N):
    for x in (x1, x2):
        d.ellipse([x - r, y - r, x + r, y + r], outline=c, width=2)
    d.line([(x1 + r, y), (x2 - r, y)], fill=c, width=2)


def bras_pli(d, pts, ep=6, c=V, main=B):
    d.line(pts, fill=c, width=ep, joint='curve')
    x, y = pts[-1]
    d.ellipse([x - ep * 0.6, y - ep * 0.6, x + ep * 0.6, y + ep * 0.6], fill=main)


def jambes_droites(d, cx, y0, ecart=7, ep=7, c=N, chaussure=V, sol_=SOL):
    for s_ in (-1, 1):
        x = cx + s_ * ecart
        d.rectangle([x - ep / 2, y0, x + ep / 2, sol_ - 4], fill=c)
        d.polygon([(x - ep / 2 - (2 if s_ < 0 else 0), sol_ - 5), (x + ep / 2 + (2 if s_ > 0 else 0), sol_ - 5),
                   (x + ep / 2 + (5 if s_ > 0 else 1), sol_), (x - ep / 2 - (5 if s_ < 0 else 1), sol_)], fill=chaussure)


def grep_elfe():
    """Grep, le petit elfe d'une laideur exceptionnelle : bonnet vert pendant, grandes oreilles pointues, gros nez
    crochu, sourcils froncés, bras croisés d'un air revêche."""
    def dessin(d):
        cx = 88
        jambes_droites(d, cx, 126, 6, 6, N, V)
        d.polygon([(cx - 16, 96), (cx + 16, 96), (cx + 20, 128), (cx - 20, 128)], fill=V)          # la tunique
        d.rectangle([cx - 18, 116, cx + 18, 119], fill=N)
        d.rectangle([cx - 3, 115, cx + 3, 120], fill=B)
        d.polygon([(cx - 20, 104), (cx + 20, 102), (cx + 20, 110), (cx - 20, 112)], fill=V)        # les bras croisés
        d.line([(cx - 20, 106), (cx + 18, 104)], fill=N)
        d.ellipse([cx + 14, 100, cx + 22, 108], fill=B); d.ellipse([cx - 22, 104, cx - 14, 112], fill=B)
        d.polygon([(cx - 30, 70), (cx - 14, 80), (cx - 16, 86)], fill=B)                           # les oreilles
        d.polygon([(cx + 30, 70), (cx + 14, 80), (cx + 16, 86)], fill=B)
        d.line([(cx - 26, 73), (cx - 17, 81)], fill=V); d.line([(cx + 26, 73), (cx + 17, 81)], fill=V)
        d.ellipse([cx - 16, 70, cx + 16, 98], fill=B)                                              # la tête
        d.polygon([(cx - 18, 76), (cx + 16, 72), (cx + 30, 50), (cx + 40, 60), (cx + 34, 66), (cx + 14, 66), (cx - 4, 64)], fill=V)  # le bonnet
        d.line([(cx - 18, 76), (cx + 16, 72)], fill=N, width=2)
        d.ellipse([cx + 36, 60, cx + 44, 68], fill=B)
        d.line([(cx - 11, 80), (cx - 3, 83)], fill=N, width=2); d.line([(cx + 11, 80), (cx + 3, 83)], fill=N, width=2)
        oeil(d, cx - 7, 86, 2); oeil(d, cx + 7, 86, 2)
        d.polygon([(cx - 2, 84), (cx + 4, 84), (cx + 8, 94), (cx + 2, 96)], fill=V)                # le nez crochu
        d.line([(cx - 8, 94), (cx - 2, 93)], fill=N)
        d.point((cx - 9, 95), fill=N)
    return personnage(dessin, 56)


def ta():
    """Le Formateur (Dennis) : crâne rasé, lunettes, barbe courte, polo vert et badge au cordon ; il tient un livre
    ouvert à deux mains."""
    def dessin(d):
        cx = 88
        jambes_droites(d, cx, 104, 8, 9, N, B)
        d.polygon([(cx - 20, 58), (cx + 20, 58), (cx + 24, 106), (cx - 24, 106)], fill=V)          # le polo
        d.polygon([(cx - 6, 58), (cx + 6, 58), (cx, 68)], fill=B)
        d.line([(cx - 8, 58), (cx - 2, 80)], fill=N); d.line([(cx + 8, 58), (cx + 2, 80)], fill=N)  # le cordon et le badge
        d.rectangle([cx - 5, 80, cx + 5, 92], fill=B); d.rectangle([cx - 3, 82, cx + 3, 85], fill=N)
        bras_pli(d, [(cx - 20, 62), (cx - 28, 82), (cx - 16, 92)], 8, V)
        bras_pli(d, [(cx + 20, 62), (cx + 28, 82), (cx + 16, 92)], 8, V)
        d.polygon([(cx - 30, 84), (cx, 90), (cx + 30, 84), (cx + 30, 100), (cx, 106), (cx - 30, 100)], fill=B)  # le livre ouvert
        d.line([(cx, 90), (cx, 106)], fill=N)
        for k in range(3):
            d.line([(cx - 26, 90 + k * 4), (cx - 6, 94 + k * 4)], fill=V); d.line([(cx + 6, 94 + k * 4), (cx + 26, 90 + k * 4)], fill=V)
        d.polygon([(cx - 30, 100), (cx, 106), (cx + 30, 100), (cx + 30, 102), (cx, 108), (cx - 30, 102)], fill=V)
        d.rectangle([cx - 5, 52, cx + 5, 60], fill=B)                                              # le cou et la tête
        d.ellipse([cx - 16, 20, cx + 16, 56], fill=B)
        d.arc([cx - 16, 20, cx + 16, 56], 200, 250, fill=V)
        d.chord([cx - 14, 36, cx + 14, 58], 0, 180, fill=V)                                        # la barbe
        d.ellipse([cx - 6, 46, cx + 6, 50], fill=B)
        d.line([(cx - 4, 48), (cx + 4, 48)], fill=N)
        d.ellipse([cx - 19, 34, cx - 14, 42], fill=B); d.ellipse([cx + 14, 34, cx + 19, 42], fill=B)
        lunettes(d, cx - 7, cx + 7, 36, 5)
        oeil(d, cx - 7, 36, 1); oeil(d, cx + 7, 36, 1)
        d.line([(cx, 38), (cx + 2, 43)], fill=V)
    return personnage(dessin)


def artisane():
    """L'Artisane : d'énormes lunettes de protection relevées sur le front, de longs cheveux verts, un tablier de cuir
    et des bas rayés ; elle brandit son chalumeau, dont la flamme crache."""
    im = personnage(lambda d: None)
    d = ImageDraw.Draw(im)
    halo(d, 132, 52, 20, B, 0.6)
    c, dc = calque()
    cx = 84
    for s_ in (-1, 1):                                                                   # les jambes et leurs bas rayés
        x = cx + s_ * 7
        dc.rectangle([x - 3, 110, x + 3, SOL - 4], fill=B)
        for y in range(112, SOL - 4, 4):
            dc.line([(x - 3, y), (x + 3, y)], fill=V)
        dc.polygon([(x - 4, SOL - 5), (x + 4, SOL - 5), (x + 4 + s_ * 3, SOL), (x - 4 + s_ * 3, SOL)], fill=N)
    dc.polygon([(cx - 26, 30), (cx + 26, 30), (cx + 30, 92), (cx - 30, 92)], fill=V)             # les cheveux, derrière
    dc.polygon([(cx - 16, 58), (cx + 16, 58), (cx + 22, 112), (cx - 22, 112)], fill=N)           # la robe
    dc.polygon([(cx - 14, 64), (cx + 14, 64), (cx + 18, 114), (cx - 18, 114)], fill=B)           # le tablier
    dc.line([(cx - 14, 64), (cx - 6, 56)], fill=B, width=2); dc.line([(cx + 14, 64), (cx + 6, 56)], fill=B, width=2)
    dc.rectangle([cx - 8, 82, cx + 8, 92], outline=V)
    dc.line([(cx - 5, 86), (cx + 5, 86)], fill=V)
    bras_pli(dc, [(cx - 16, 62), (cx - 24, 84), (cx - 16, 98)], 6, N)
    bras_pli(dc, [(cx + 16, 62), (cx + 30, 66), (cx + 38, 54)], 6, N)
    dc.polygon([(cx + 32, 58), (cx + 40, 50), (cx + 44, 54), (cx + 36, 62)], fill=V)              # le chalumeau
    dc.polygon([(cx + 40, 50), (cx + 46, 44), (cx + 48, 46), (cx + 44, 54)], fill=B)
    dc.rectangle([cx - 5, 52, cx + 5, 60], fill=B)
    dc.ellipse([cx - 14, 26, cx + 14, 56], fill=B)                                               # la tête
    dc.chord([cx - 16, 20, cx + 16, 44], 180, 360, fill=V)
    for x in (cx - 8, cx + 8):                                                                   # les grosses lunettes
        dc.ellipse([x - 8, 22, x + 8, 36], fill=N)
        dc.ellipse([x - 5, 25, x + 5, 33], fill=V)
        dc.point((x - 2, 27), fill=B); dc.point((x - 3, 28), fill=B)
    dc.rectangle([cx - 1, 27, cx + 1, 30], fill=N)
    oeil(dc, cx - 6, 42, 2); oeil(dc, cx + 6, 42, 2)
    dc.arc([cx - 6, 44, cx + 6, 52], 20, 160, fill=N, width=2)
    dc.point((cx - 10, 46), fill=V); dc.point((cx + 10, 46), fill=V)
    poser(im, c, B, TOUS_COTES, 1, (N,))
    flamme(d, cx + 54, 40, 14, B, V)
    for (x, y) in ((cx + 62, 30), (cx + 58, 24), (cx + 66, 38)):
        d.point((x, y), fill=B)
    return im


def garcon_lunettes():
    """L'étudiant de Lille (Linus) : un jeune aux grandes lunettes carrées et aux cheveux en épis, sweat vert à
    capuche, un ordinateur portable sous le bras."""
    def dessin(d):
        cx = 88
        jambes_droites(d, cx, 104, 7, 8, N, B)
        d.polygon([(cx - 20, 56), (cx + 20, 56), (cx + 24, 108), (cx - 24, 108)], fill=V)          # le sweat
        d.chord([cx - 14, 50, cx + 14, 66], 0, 180, fill=N)                                        # la capuche
        d.line([(cx - 4, 62), (cx - 4, 76)], fill=B); d.line([(cx + 4, 62), (cx + 4, 76)], fill=B)
        d.rectangle([cx - 14, 88, cx + 14, 100], outline=N)
        bras_pli(d, [(cx - 20, 60), (cx - 26, 84), (cx - 22, 100)], 8, V)
        d.polygon([(cx + 18, 72), (cx + 40, 76), (cx + 38, 98), (cx + 16, 94)], fill=B)             # le portable
        d.line([(cx + 18, 72), (cx + 16, 94)], fill=N)
        d.ellipse([cx + 26, 82, cx + 30, 86], fill=V)
        bras_pli(d, [(cx + 20, 60), (cx + 30, 76), (cx + 26, 90)], 8, V)
        d.rectangle([cx - 4, 48, cx + 4, 56], fill=B)
        d.ellipse([cx - 15, 18, cx + 15, 52], fill=B)                                              # la tête
        for k in range(7):                                                                         # les épis
            x = cx - 15 + k * 5
            d.polygon([(x - 3, 30), (x + 1, 10 + (k % 2) * 6), (x + 5, 30)], fill=N)
        d.chord([cx - 16, 16, cx + 16, 40], 180, 360, fill=N)
        for x in (cx - 8, cx + 8):                                                                 # les grandes lunettes
            d.rectangle([x - 6, 30, x + 6, 40], fill=N)
            d.rectangle([x - 4, 32, x + 4, 38], fill=B)
            d.rectangle([x - 1, 34, x + 1, 36], fill=N)
        d.line([(cx - 2, 34), (cx + 2, 34)], fill=N)
        d.arc([cx - 5, 40, cx + 5, 48], 20, 160, fill=N)
    return personnage(dessin)


def lecteur_journal():
    """Le LecteurDeJournal : un vieux monsieur à moustache et lunettes, déplie la dernière édition du « Dernier Mot »
    et l'agite sous ton nez."""
    def dessin(d):
        cx = 88
        jambes_droites(d, cx, 104, 8, 9, N, B)
        d.polygon([(cx - 20, 58), (cx + 20, 58), (cx + 24, 108), (cx - 24, 108)], fill=V)          # la veste
        d.polygon([(cx - 6, 58), (cx + 6, 58), (cx, 76)], fill=B)
        d.line([(cx, 76), (cx, 106)], fill=N)
        bras_pli(d, [(cx - 20, 62), (cx - 34, 74), (cx - 40, 66)], 8, V)
        bras_pli(d, [(cx + 20, 62), (cx + 34, 74), (cx + 40, 66)], 8, V)
        d.polygon([(cx - 50, 60), (cx - 6, 64), (cx - 8, 104), (cx - 52, 98)], fill=B)              # le journal
        d.polygon([(cx + 50, 60), (cx + 6, 64), (cx + 8, 104), (cx + 52, 98)], fill=B)
        d.line([(cx - 6, 64), (cx - 8, 104)], fill=V)
        d.rectangle([cx - 46, 66, cx - 12, 72], fill=N)
        for k in range(5):
            d.line([(cx - 46, 76 + k * 5), (cx - 12, 78 + k * 5)], fill=V)
            d.line([(cx + 12, 70 + k * 6), (cx + 46, 68 + k * 6)], fill=V)
        d.rectangle([cx + 14, 86, cx + 28, 96], fill=N)
        d.rectangle([cx - 4, 50, cx + 4, 58], fill=B)
        d.ellipse([cx - 15, 18, cx + 15, 54], fill=B)                                              # la tête
        d.chord([cx - 15, 16, cx + 15, 32], 180, 360, fill=V)
        lunettes(d, cx - 7, cx + 7, 34, 5)
        oeil(d, cx - 7, 34, 1); oeil(d, cx + 7, 34, 1)
        d.polygon([(cx - 10, 44), (cx, 41), (cx + 10, 44), (cx + 6, 47), (cx, 45), (cx - 6, 47)], fill=V)   # la moustache
        d.ellipse([cx - 3, 48, cx + 3, 51], fill=N)
    return personnage(dessin)


def fermier():
    """Le Fermier ruiné : un chapeau de paille, une barbe, une salopette verte ; appuyé sur sa fourche, l'air abattu."""
    def dessin(d):
        cx = 84
        jambes_droites(d, cx, 104, 8, 9, V, N)
        d.polygon([(cx - 20, 58), (cx + 20, 58), (cx + 22, 106), (cx - 22, 106)], fill=B)          # la chemise
        d.polygon([(cx - 16, 76), (cx + 16, 76), (cx + 20, 110), (cx - 20, 110)], fill=V)          # la salopette
        d.line([(cx - 12, 76), (cx - 14, 58)], fill=V, width=3); d.line([(cx + 12, 76), (cx + 14, 58)], fill=V, width=3)
        d.rectangle([cx - 6, 82, cx + 6, 90], outline=N)
        d.line([(cx + 34, 20), (cx + 34, SOL - 2)], fill=B, width=3)                               # la fourche
        for k in (-6, 0, 6):
            d.line([(cx + 34 + k, 6), (cx + 34 + k, 20)], fill=B, width=2)
        d.line([(cx + 28, 20), (cx + 40, 20)], fill=B, width=2)
        bras_pli(d, [(cx - 20, 62), (cx - 26, 84), (cx - 22, 100)], 8, B)
        bras_pli(d, [(cx + 20, 62), (cx + 28, 70), (cx + 34, 64)], 8, B)
        d.rectangle([cx - 4, 50, cx + 4, 58], fill=B)
        d.ellipse([cx - 14, 22, cx + 14, 54], fill=B)                                              # la tête
        d.chord([cx - 14, 38, cx + 14, 64], 180, 360, fill=V)                                      # la barbe
        d.polygon([(cx - 14, 48), (cx + 14, 48), (cx + 6, 60), (cx - 6, 60)], fill=V)
        d.line([(cx - 4, 50), (cx + 4, 50)], fill=N)
        d.ellipse([cx - 28, 20, cx + 28, 30], fill=B)                                              # le chapeau de paille
        d.chord([cx - 15, 6, cx + 15, 34], 180, 360, fill=B)
        d.rectangle([cx - 15, 16, cx + 15, 20], fill=V)
        for x in range(cx - 24, cx + 26, 6):
            d.point((x, 25), fill=V)
        d.line([(cx - 10, 34), (cx - 4, 36)], fill=N); d.line([(cx + 4, 36), (cx + 10, 34)], fill=N)
        oeil(d, cx - 6, 39, 2); oeil(d, cx + 6, 39, 2)
        d.line([(cx - 9, 43), (cx - 9, 46)], fill=V)
    return personnage(dessin)


def etudiante_grad():
    """L'étudiante (Margaret, la cheffe de quart, la diplômée) : de longs cheveux verts, des lunettes, un sweat de
    l'école, un casque autour du cou et l'ordinateur portable sous le bras."""
    def dessin(d):
        cx = 88
        d.polygon([(cx - 20, 22), (cx + 20, 22), (cx + 24, 84), (cx - 24, 84)], fill=V)            # les cheveux, derrière
        jambes_droites(d, cx, 104, 7, 8, N, V)
        d.polygon([(cx - 18, 56), (cx + 18, 56), (cx + 22, 108), (cx - 22, 108)], fill=B)          # le sweat
        d.rectangle([cx - 14, 76, cx + 14, 80], fill=V)
        d.arc([cx - 12, 48, cx + 12, 66], 0, 180, fill=N, width=3)                                 # le casque au cou
        d.rectangle([cx - 15, 54, cx - 9, 62], fill=N); d.rectangle([cx + 9, 54, cx + 15, 62], fill=N)
        bras_pli(d, [(cx - 18, 60), (cx - 24, 84), (cx - 20, 100)], 7, B)
        d.polygon([(cx + 16, 74), (cx + 38, 78), (cx + 36, 96), (cx + 14, 92)], fill=N)             # le portable
        d.ellipse([cx + 24, 82, cx + 28, 86], fill=V)
        bras_pli(d, [(cx + 18, 60), (cx + 28, 76), (cx + 24, 90)], 7, B)
        d.rectangle([cx - 4, 48, cx + 4, 56], fill=B)
        d.ellipse([cx - 14, 20, cx + 14, 52], fill=B)                                              # la tête
        d.chord([cx - 16, 16, cx + 16, 40], 180, 360, fill=V)
        d.polygon([(cx - 16, 26), (cx - 4, 22), (cx - 14, 36)], fill=V)
        lunettes(d, cx - 6, cx + 6, 36, 4)
        oeil(d, cx - 6, 36, 1); oeil(d, cx + 6, 36, 1)
        d.arc([cx - 5, 40, cx + 5, 47], 20, 160, fill=N)
    return personnage(dessin)


def dame():
    """La dame du village (et l'accueil, et l'étudiante de Marseille) : un carré de cheveux verts, une robe verte
    serrée à la taille, les mains ouvertes, le regard inquiet."""
    def dessin(d):
        cx = 88
        for s_ in (-1, 1):
            d.rectangle([cx + s_ * 6 - 3, 118, cx + s_ * 6 + 3, SOL - 4], fill=B)
            d.polygon([(cx + s_ * 6 - 4, SOL - 5), (cx + s_ * 6 + 4, SOL - 5), (cx + s_ * 6 + 4 + s_ * 2, SOL), (cx + s_ * 6 - 4 + s_ * 2, SOL)], fill=N)
        d.polygon([(cx - 14, 56), (cx + 14, 56), (cx + 12, 84), (cx + 28, 120), (cx - 28, 120), (cx - 12, 84)], fill=V)   # la robe
        d.rectangle([cx - 12, 82, cx + 12, 86], fill=N)
        for x in (cx - 14, cx, cx + 14):
            d.line([(cx + (x - cx) * 0.3, 88), (x, 118)], fill=N)
        d.polygon([(cx - 6, 56), (cx + 6, 56), (cx, 64)], fill=B)
        bras_pli(d, [(cx - 14, 60), (cx - 26, 76), (cx - 38, 70)], 6, V)
        bras_pli(d, [(cx + 14, 60), (cx + 26, 76), (cx + 38, 70)], 6, V)
        d.rectangle([cx - 4, 48, cx + 4, 56], fill=B)
        d.rectangle([cx - 18, 18, cx + 18, 52], fill=V)                                            # le carré de cheveux
        d.ellipse([cx - 13, 22, cx + 13, 54], fill=B)                                              # le visage
        d.rectangle([cx - 15, 16, cx + 15, 30], fill=V)
        d.line([(cx - 9, 33), (cx - 3, 31)], fill=N); d.line([(cx + 3, 31), (cx + 9, 33)], fill=N)
        oeil(d, cx - 6, 37, 2); oeil(d, cx + 6, 37, 2)
        d.arc([cx - 4, 45, cx + 4, 51], 200, 340, fill=N)
        d.point((cx - 10, 43), fill=V); d.point((cx + 10, 43), fill=V)
    return personnage(dessin)


def bibliothecaire():
    """Le Bibliothécaire (et le Copiste) : un vieux savant chauve aux touffes blanches, lunettes en demi-lune, gilet
    vert et nœud papillon ; il serre contre lui un grand livre ouvert."""
    def dessin(d):
        cx = 88
        jambes_droites(d, cx, 104, 8, 9, N, B)
        d.polygon([(cx - 20, 58), (cx + 20, 58), (cx + 22, 108), (cx - 22, 108)], fill=B)          # la chemise
        d.polygon([(cx - 20, 58), (cx - 6, 58), (cx - 2, 108), (cx - 22, 108)], fill=V)            # le gilet
        d.polygon([(cx + 20, 58), (cx + 6, 58), (cx + 2, 108), (cx + 22, 108)], fill=V)
        for y in (78, 88, 98):
            d.point((cx - 4, y), fill=B)
        d.polygon([(cx - 6, 58), (cx, 61), (cx + 6, 58), (cx + 6, 64), (cx, 61), (cx - 6, 64)], fill=N)   # le nœud papillon
        bras_pli(d, [(cx - 20, 62), (cx - 24, 80), (cx - 8, 84)], 8, V)
        bras_pli(d, [(cx + 20, 62), (cx + 24, 80), (cx + 8, 84)], 8, V)
        d.polygon([(cx - 26, 70), (cx - 2, 76), (cx - 2, 100), (cx - 26, 94)], fill=B)              # le livre ouvert
        d.polygon([(cx + 26, 70), (cx + 2, 76), (cx + 2, 100), (cx + 26, 94)], fill=B)
        d.rectangle([cx - 2, 76, cx + 2, 100], fill=V)
        for k in range(4):
            d.line([(cx - 22, 78 + k * 4), (cx - 6, 82 + k * 4)], fill=V); d.line([(cx + 6, 82 + k * 4), (cx + 22, 78 + k * 4)], fill=V)
        d.rectangle([cx - 4, 50, cx + 4, 58], fill=B)
        d.ellipse([cx - 15, 18, cx + 15, 54], fill=B)                                              # la tête
        d.arc([cx - 15, 18, cx + 15, 54], 200, 250, fill=V)
        for s_ in (-1, 1):                                                                         # les touffes blanches
            d.polygon([(cx + s_ * 14, 26), (cx + s_ * 22, 28), (cx + s_ * 18, 34), (cx + s_ * 22, 38), (cx + s_ * 14, 40)], fill=B)
            d.line([(cx + s_ * 15, 30), (cx + s_ * 20, 32)], fill=V)
        d.line([(cx - 11, 32), (cx - 3, 32)], fill=N); d.line([(cx + 3, 32), (cx + 11, 32)], fill=N)
        oeil(d, cx - 7, 36, 2); oeil(d, cx + 7, 36, 2)
        for x in (cx - 7, cx + 7):                                                                 # les lunettes en demi-lune
            d.chord([x - 6, 34, x + 6, 44], 0, 180, outline=N)
            d.line([(x - 6, 39), (x + 6, 39)], fill=N)
        d.line([(cx - 1, 39), (cx + 1, 39)], fill=N)
        d.line([(cx, 40), (cx + 2, 44)], fill=V)
        d.line([(cx - 5, 48), (cx + 5, 48)], fill=N)
    return personnage(dessin)


def homme_pleurs():
    """L'HommeEnPleurs : les cheveux en bataille, les larmes qui coulent, les bras levés vers le ciel ; sa chemise
    est déchirée."""
    def dessin(d):
        cx = 88
        jambes_droites(d, cx, 104, 8, 9, N, V)
        d.polygon([(cx - 18, 58), (cx + 18, 58), (cx + 22, 106), (cx - 22, 106)], fill=V)          # la chemise déchirée
        d.polygon([(cx - 22, 106), (cx - 14, 98), (cx - 6, 106), (cx + 2, 96), (cx + 10, 106), (cx + 22, 106)], fill=N)
        d.line([(cx + 6, 70), (cx + 12, 80), (cx + 8, 84)], fill=N)
        bras_pli(d, [(cx - 18, 62), (cx - 30, 50), (cx - 36, 30)], 7, V)
        bras_pli(d, [(cx + 18, 62), (cx + 30, 50), (cx + 36, 30)], 7, V)
        d.rectangle([cx - 4, 50, cx + 4, 58], fill=B)
        d.ellipse([cx - 14, 20, cx + 14, 54], fill=B)                                              # la tête
        for k in range(8):                                                                         # les cheveux en bataille
            a = math.pi + k * math.pi / 7
            d.line([(cx + math.cos(a) * 10, 30 + math.sin(a) * 8), (cx + math.cos(a) * 20, 28 + math.sin(a) * 16)], fill=N, width=3)
        d.chord([cx - 15, 16, cx + 15, 36], 180, 360, fill=N)
        d.line([(cx - 9, 34), (cx - 3, 36)], fill=N); d.line([(cx + 3, 36), (cx + 9, 34)], fill=N)
        d.line([(cx - 9, 38), (cx - 4, 38)], fill=N, width=2); d.line([(cx + 4, 38), (cx + 9, 38)], fill=N, width=2)
        for s_ in (-1, 1):                                                                         # les larmes
            x = cx + s_ * 7
            d.line([(x, 40), (x, 52)], fill=V, width=2)
            d.ellipse([x - 2, 54, x + 2, 58], fill=B)
            d.ellipse([x - 1 + s_ * 6, 62, x + 2 + s_ * 6, 66], fill=V)
        d.chord([cx - 6, 44, cx + 6, 52], 180, 360, fill=N)
    return personnage(dessin)


def marchand():
    """Le Marchand : cheveux plaqués, sourire plein de dents en or, costume rayé ; d'une main il fait sauter une
    pièce, de l'autre il présente une coupe qui scintille."""
    def dessin(d):
        cx = 88
        jambes_droites(d, cx, 104, 7, 8, N, B)
        for s_ in (-1, 1):
            d.rectangle([cx + s_ * 7 - 4, 104, cx + s_ * 7 + 4, SOL - 5], fill=N)
            for y in range(106, SOL - 6, 3):
                d.point((cx + s_ * 7, y), fill=V)
        d.polygon([(cx - 18, 56), (cx + 18, 56), (cx + 20, 106), (cx - 20, 106)], fill=N)          # le costume rayé
        for x in range(cx - 16, cx + 20, 5):
            d.line([(x, 58), (x, 104)], fill=V)
        d.polygon([(cx - 6, 56), (cx + 6, 56), (cx + 2, 86), (cx - 2, 86)], fill=B)
        d.polygon([(cx - 2, 60), (cx + 2, 60), (cx + 1, 80), (cx - 1, 80)], fill=N)                # la cravate
        bras_pli(d, [(cx - 18, 60), (cx - 30, 56), (cx - 34, 36)], 7, N)
        bras_pli(d, [(cx + 18, 60), (cx + 30, 70), (cx + 40, 64)], 7, N)
        d.ellipse([cx - 40, 20, cx - 28, 32], fill=V)                                              # la pièce
        d.ellipse([cx - 37, 23, cx - 31, 29], outline=B)
        d.point((cx - 38, 22), fill=B)
        d.polygon([(cx + 34, 42), (cx + 50, 42), (cx + 46, 54), (cx + 38, 54)], fill=B)            # la coupe
        d.rectangle([cx + 41, 54, cx + 43, 62], fill=B)
        d.rectangle([cx + 37, 62, cx + 47, 64], fill=B)
        d.polygon([(cx + 36, 44), (cx + 48, 44), (cx + 46, 48), (cx + 38, 48)], fill=V)
        for (x, y) in ((cx + 36, 34), (cx + 52, 36), (cx + 44, 30)):
            d.line([(x - 2, y), (x + 2, y)], fill=V); d.line([(x, y - 2), (x, y + 2)], fill=V)
        d.rectangle([cx - 4, 48, cx + 4, 56], fill=B)
        d.ellipse([cx - 14, 18, cx + 14, 52], fill=B)                                              # la tête
        d.polygon([(cx - 16, 30), (cx - 12, 16), (cx + 4, 12), (cx + 18, 18), (cx + 16, 28), (cx + 4, 20)], fill=V)   # les cheveux plaqués
        d.line([(cx - 10, 29), (cx - 3, 31)], fill=N); d.line([(cx + 3, 31), (cx + 10, 29)], fill=N)
        oeil(d, cx - 6, 35, 2); oeil(d, cx + 6, 35, 2)
        d.chord([cx - 9, 38, cx + 9, 50], 0, 180, fill=N)                                          # le sourire et les dents en or
        for x in range(cx - 7, cx + 8, 3):
            d.rectangle([x, 44, x + 1, 46], fill=V)
    return personnage(dessin)


def vieil_homme():
    """Le VieilHomme (Laurent, sous sa fausse barbe) : une longue robe verte à capuche, une barbe blanche qui descend
    jusqu'à la ceinture, les yeux dans l'ombre de la capuche, les mains jointes."""
    def dessin(d):
        cx = 88
        d.polygon([(cx - 22, 40), (cx + 22, 40), (cx + 34, SOL), (cx - 34, SOL)], fill=V)          # la robe
        d.line([(cx - 14, 80), (cx - 22, SOL)], fill=N); d.line([(cx + 14, 80), (cx + 22, SOL)], fill=N)
        d.polygon([(cx - 26, 46), (cx - 8, 90), (cx + 8, 90), (cx + 26, 46)], fill=V)
        d.polygon([(cx - 22, 18), (cx, 4), (cx + 22, 18), (cx + 26, 50), (cx - 26, 50)], fill=V)    # la capuche
        d.ellipse([cx - 14, 16, cx + 14, 48], fill=N)
        d.ellipse([cx - 10, 26, cx + 10, 46], fill=B)                                              # le visage
        d.chord([cx - 12, 14, cx + 12, 36], 180, 360, fill=N)
        d.line([(cx - 8, 32), (cx - 3, 32)], fill=N, width=2); d.line([(cx + 3, 32), (cx + 8, 32)], fill=N, width=2)
        d.polygon([(cx - 12, 40), (cx + 12, 40), (cx + 10, 70), (cx + 4, 96), (cx, 104), (cx - 4, 96), (cx - 10, 70)], fill=B)  # la barbe
        for k in range(4):
            d.line([(cx - 6 + k * 4, 46), (cx - 4 + k * 3, 92)], fill=V)
        d.polygon([(cx - 8, 40), (cx, 37), (cx + 8, 40), (cx, 44)], fill=B)
        d.line([(cx - 1, 34), (cx + 1, 39)], fill=V)
        d.ellipse([cx - 28, 82, cx - 12, 96], fill=V); d.ellipse([cx + 12, 82, cx + 28, 96], fill=V)   # les manches et les mains
        d.ellipse([cx - 16, 86, cx - 8, 94], fill=B); d.ellipse([cx + 8, 86, cx + 16, 94], fill=B)
    return personnage(dessin, 76)


def professeur():
    """Le Professeur : un grand chapeau pointu étoilé, une longue barbe, une robe semée d'étoiles ; il lève sa
    baguette, d'où s'échappe une traînée d'étincelles."""
    def dessin(d):
        cx = 84
        d.polygon([(cx - 18, 56), (cx + 18, 56), (cx + 30, SOL), (cx - 30, SOL)], fill=V)          # la robe
        for (x, y) in ((cx - 12, 80), (cx + 10, 96), (cx - 18, 120), (cx + 14, 130), (cx - 2, 110), (cx + 18, 72)):
            d.line([(x - 3, y), (x + 3, y)], fill=B); d.line([(x, y - 3), (x, y + 3)], fill=B)
        d.rectangle([cx - 20, 86, cx + 20, 90], fill=N)
        bras_pli(d, [(cx - 18, 62), (cx - 26, 84), (cx - 18, 98)], 8, V)
        bras_pli(d, [(cx + 18, 62), (cx + 30, 56), (cx + 38, 40)], 8, V)
        d.line([(cx + 38, 42), (cx + 52, 16)], fill=B, width=3)                                    # la baguette
        d.rectangle([cx - 4, 50, cx + 4, 58], fill=B)
        d.ellipse([cx - 14, 26, cx + 14, 56], fill=B)                                              # la tête
        d.polygon([(cx - 14, 46), (cx + 14, 46), (cx + 6, 76), (cx, 82), (cx - 6, 76)], fill=B)    # la barbe
        for k in range(3):
            d.line([(cx - 4 + k * 4, 50), (cx - 2 + k * 2, 74)], fill=V)
        d.line([(cx - 8, 34), (cx - 3, 36)], fill=N); d.line([(cx + 3, 36), (cx + 8, 34)], fill=N)
        oeil(d, cx - 6, 39, 2); oeil(d, cx + 6, 39, 2)
        d.polygon([(cx - 8, 46), (cx, 43), (cx + 8, 46), (cx, 49)], fill=V)
        d.ellipse([cx - 26, 24, cx + 26, 34], fill=V)                                              # le chapeau pointu
        d.polygon([(cx - 16, 28), (cx + 16, 28), (cx + 8, 8), (cx + 22, -2), (cx + 2, 4), (cx - 4, 10)], fill=V)
        d.line([(cx - 16, 28), (cx + 16, 28)], fill=N, width=2)
        for (x, y) in ((cx - 4, 20), (cx + 6, 12), (cx + 10, 22)):
            d.point((x, y), fill=B); d.point((x - 1, y), fill=B); d.point((x + 1, y), fill=B); d.point((x, y - 1), fill=B); d.point((x, y + 1), fill=B)
    im = personnage(dessin)
    d = ImageDraw.Draw(im)
    halo(d, 136, 16, 14, B, 0.6)
    pts = [(136, 16), (146, 10), (156, 18), (150, 28), (162, 34)]                                  # la traînée d'étincelles
    d.line(pts, fill=V, width=2)
    for (x, y) in pts[1:]:
        d.line([(x - 3, y), (x + 3, y)], fill=B); d.line([(x, y - 3), (x, y + 3)], fill=B)
    return im


def sorcier_noir():
    """Le Sorcier Noir : une haute silhouette encapuchonnée dans sa robe noire, les bras croisés, deux yeux verts qui
    luisent dans l'ombre du capuchon ; des éclairs crépitent autour de lui, une lueur verte derrière."""
    im, d = toile()
    halo(d, 88, 70, 70, V, 0.55, 76)
    ombre_sol(d, 92, SOL + 2, 40, 5, V, 0.9)
    tirets_sol(d, 88, SOL + 9, 80)
    c, dc = calque()
    cx = 88
    dc.polygon([(cx - 22, 44), (cx + 22, 44), (cx + 38, SOL), (cx - 38, SOL)], fill=N)               # la robe
    dc.polygon([(cx - 20, 30), (cx - 6, 4), (cx + 4, -2), (cx + 30, 6), (cx + 14, 12), (cx + 22, 34), (cx + 26, 52), (cx - 26, 52)], fill=N)   # le capuchon pointu
    dc.polygon([(cx - 32, 70), (cx + 32, 66), (cx + 34, 84), (cx - 34, 88)], fill=N)                 # les bras croisés
    poser(im, c, B, ((-1, 0), (0, -1), (1, 0)), 1, None, V, 3)
    d.line([(cx - 32, 78), (cx + 30, 74)], fill=V)
    d.ellipse([cx - 36, 72, cx - 26, 84], fill=B); d.ellipse([cx + 26, 68, cx + 36, 80], fill=B)
    d.line([(cx - 6, 52), (cx - 14, SOL - 2)], fill=V); d.line([(cx + 8, 52), (cx + 16, SOL - 2)], fill=V)
    d.ellipse([cx - 12, 22, cx + 12, 48], fill=N)
    d.arc([cx - 12, 22, cx + 12, 48], 180, 360, fill=V)
    for x in (cx - 5, cx + 5):                                                           # les yeux qui luisent
        halo(d, x, 34, 7, V, 0.9)
        d.polygon([(x - 3, 33), (x + 3, 33), (x + 1, 36), (x - 2, 36)], fill=V)
        d.point((x, 34), fill=B); d.point((x - 1, 34), fill=B)
    for (x, y, h_) in ((30, 30, 40), (148, 40, 44), (36, 100, 30), (142, 104, 30)):       # les éclairs
        pts = [(x, y), (x + 6, y + h_ * 0.35), (x - 2, y + h_ * 0.5), (x + 4, y + h_)]
        d.line(pts, fill=V, width=3)
        d.line(pts, fill=B, width=1)
    return im


def eleve_presse():
    """L'élève (en retard, l'apprenti, la présidente du BDE) : en sweat vert, un gros sac en bandoulière plein de
    rouleaux, il court à toutes jambes, l'écharpe au vent."""
    def dessin(d):
        cx = 88
        d.line([(cx - 4, 106), (cx - 18, 124), (cx - 30, 132)], fill=N, width=9)                   # les jambes, en pleine course
        d.line([(cx + 6, 106), (cx + 18, 126), (cx + 14, SOL - 4)], fill=N, width=9)
        d.polygon([(cx - 36, 126), (cx - 26, 128), (cx - 28, 138), (cx - 40, 136)], fill=V)
        d.polygon([(cx + 10, SOL - 6), (cx + 22, SOL - 6), (cx + 24, SOL), (cx + 8, SOL)], fill=V)
        d.polygon([(cx - 16, 58), (cx + 18, 54), (cx + 22, 108), (cx - 14, 110)], fill=V)          # le sweat, penché en avant
        d.polygon([(cx - 26, 64), (cx - 2, 60), (cx, 100), (cx - 30, 102)], fill=B)                 # le gros sac
        d.line([(cx - 2, 60), (cx + 16, 54)], fill=N, width=3)
        d.rectangle([cx - 24, 70, cx - 4, 74], fill=V)
        for (x, l) in ((cx - 24, 18), (cx - 18, 24), (cx - 12, 16)):                               # les rouleaux qui dépassent
            d.line([(x, 62), (x - 4, 62 - l)], fill=B, width=4)
            d.line([(x + 1, 62), (x - 3, 62 - l)], fill=V)
        bras_pli(d, [(cx + 16, 60), (cx + 32, 72), (cx + 42, 62)], 7, V)
        d.polygon([(cx - 6, 54), (cx + 14, 50), (cx - 26, 44), (cx - 36, 52), (cx - 24, 54)], fill=B)   # l'écharpe au vent
        d.line([(cx - 26, 44), (cx - 36, 52)], fill=V)
        d.ellipse([cx - 10, 18, cx + 20, 52], fill=B)                                              # la tête
        d.chord([cx - 12, 14, cx + 20, 36], 160, 360, fill=N)
        oeil(d, cx + 4, 34, 2); oeil(d, cx + 14, 34, 2)
        d.ellipse([cx + 8, 42, cx + 13, 47], fill=N)
        d.line([(cx + 1, 29), (cx + 6, 28)], fill=N); d.line([(cx + 12, 28), (cx + 17, 29)], fill=N)
        for k in range(3):                                                                         # les traits de vitesse
            d.line([(cx - 60, 40 + k * 18), (cx - 40, 40 + k * 18)], fill=V)
    return personnage(dessin)


def supertroll():
    """Le TrollAbsolumentHideux : un gros plan sur sa trogne verte, un œil exorbité, l'autre plissé, un nez en patate,
    deux défenses, des verrues, des oreilles en feuille de chou et quelques poils."""
    im, d = toile()
    halo(d, 88, 90, 80, V, 0.35, 70)
    c, dc = calque()
    dc.polygon([(4, 70), (24, 54), (34, 70), (24, 92)], fill=V)                                  # les oreilles
    dc.polygon([(172, 64), (152, 52), (144, 70), (156, 90)], fill=V)
    dc.ellipse([20, 20, 156, 170], fill=V)                                                       # la tête
    dc.chord([20, 20, 156, 170], 100, 170, fill=N)
    poser(im, c, B, ((-1, 0), (0, -1), (1, 0)), 1, (V,))
    for (x, y, l) in ((70, 24, 16), (88, 20, 20), (104, 24, 14)):                        # les poils
        d.line([(x, y), (x + 4, y - l)], fill=B, width=2)
    d.ellipse([38, 52, 86, 98], fill=B)                                                  # l'œil exorbité
    d.ellipse([54, 66, 74, 86], fill=N)
    d.point((58, 70), fill=B); d.point((59, 70), fill=B)
    d.arc([38, 52, 86, 98], 200, 340, fill=N, width=2)
    d.line([(100, 72), (130, 66)], fill=N, width=3)                                      # l'œil plissé
    d.line([(104, 64), (128, 56)], fill=N, width=2)
    d.ellipse([78, 84, 118, 120], fill=V)                                                # le nez en patate
    d.arc([78, 84, 118, 120], 190, 260, fill=B, width=2)
    d.ellipse([86, 108, 94, 114], fill=N); d.ellipse([102, 108, 110, 114], fill=N)
    d.chord([48, 112, 138, 160], 0, 180, fill=N)                                         # la bouche
    d.polygon([(60, 134), (66, 112), (72, 136)], fill=B)                                 # les défenses
    d.polygon([(114, 136), (120, 110), (126, 134)], fill=B)
    for x in range(78, 112, 8):
        d.rectangle([x, 136, x + 5, 141], fill=V)
    for (x, y, r) in ((128, 98, 4), (44, 108, 3), (132, 40, 3), (60, 40, 2)):             # les verrues
        d.ellipse([x - r, y - r, x + r, y + r], fill=B)
        d.point((x + 1, y + 1), fill=N)
    return im


def troll_moche():
    """Le TrollMoche : maigre et voûté, la peau verte, de longs bras qui pendent, de grandes oreilles, un pagne blanc ;
    il se tient devant le Toboggan, l'air furieux."""
    def dessin(d):
        cx = 88
        for s_ in (-1, 1):                                                                         # les jambes arquées
            d.line([(cx + s_ * 6, 100), (cx + s_ * 14, 124), (cx + s_ * 10, SOL - 3)], fill=V, width=6)
            d.polygon([(cx + s_ * 10 - 6, SOL - 4), (cx + s_ * 10 + 6, SOL - 4), (cx + s_ * 10 + s_ * 10, SOL), (cx + s_ * 10 - 6, SOL)], fill=V)
        d.polygon([(cx - 14, 92), (cx + 14, 92), (cx + 16, 110), (cx - 16, 110)], fill=B)          # le pagne
        d.line([(cx - 16, 110), (cx - 8, 104), (cx, 110), (cx + 8, 104), (cx + 16, 110)], fill=N)
        d.polygon([(cx - 12, 56), (cx + 16, 50), (cx + 14, 94), (cx - 12, 94)], fill=V)            # le torse voûté
        for y in (64, 70, 76):
            d.line([(cx - 8, y), (cx + 2, y)], fill=N)
        bras_pli(d, [(cx - 12, 60), (cx - 24, 86), (cx - 26, 116)], 6, V, V)
        bras_pli(d, [(cx + 16, 56), (cx + 26, 84), (cx + 24, 114)], 6, V, V)
        for s_ in (-1, 1):                                                                         # les doigts crochus
            x = cx + (-26 if s_ < 0 else 24)
            for k in (-3, 0, 3):
                d.line([(x + k, 116), (x + k * 1.5, 122)], fill=V)
        d.polygon([(cx - 26, 30), (cx - 8, 38), (cx - 10, 46)], fill=V)                             # les oreilles
        d.polygon([(cx + 38, 24), (cx + 18, 34), (cx + 18, 42)], fill=V)
        d.ellipse([cx - 12, 20, cx + 22, 58], fill=V)                                              # la tête
        d.line([(cx - 4, 32), (cx + 6, 36)], fill=N, width=2); d.line([(cx + 16, 32), (cx + 8, 36)], fill=N, width=2)
        oeil(d, cx + 1, 40, 2, B); oeil(d, cx + 12, 40, 2, B)
        d.polygon([(cx + 4, 42), (cx + 10, 42), (cx + 12, 50), (cx + 6, 52)], fill=N)
        d.chord([cx - 2, 48, cx + 18, 58], 0, 180, fill=N)
        d.polygon([(cx + 2, 52), (cx + 4, 48), (cx + 6, 52)], fill=B)
        d.polygon([(cx + 12, 52), (cx + 14, 48), (cx + 16, 52)], fill=B)
        d.line([(cx + 2, 20), (cx, 12)], fill=B); d.line([(cx + 8, 20), (cx + 10, 10)], fill=B)
    return personnage(dessin)


def troll_plus_moche():
    """Le TrollPlusMoche : un gros troll assis par terre, ventre blanc et rebondi, petite tête aux grandes oreilles,
    les poings sur les genoux, qui grogne."""
    def dessin(d):
        cx = 88
        for s_ in (-1, 1):                                                                         # les jambes repliées
            d.ellipse([cx + s_ * 30 - 18, 118, cx + s_ * 30 + 18, SOL], fill=V)
            d.ellipse([cx + s_ * 40 - 10, SOL - 8, cx + s_ * 40 + 12, SOL + 1], fill=V)
        d.ellipse([cx - 40, 60, cx + 40, 140], fill=V)                                             # le corps
        d.ellipse([cx - 28, 76, cx + 28, 136], fill=B)                                             # le ventre
        d.arc([cx - 6, 108, cx + 2, 114], 0, 360, fill=V)
        d.arc([cx - 28, 76, cx + 28, 136], 20, 100, fill=V, width=2)
        for s_ in (-1, 1):                                                                         # les bras et les poings
            d.line([(cx + s_ * 34, 78), (cx + s_ * 46, 104), (cx + s_ * 36, 120)], fill=V, width=10, joint='curve')
            d.ellipse([cx + s_ * 36 - 8, 114, cx + s_ * 36 + 8, 128], fill=V)
            d.line([(cx + s_ * 36 - 4, 120), (cx + s_ * 36 + 4, 120)], fill=N)
        d.polygon([(cx - 32, 34), (cx - 14, 44), (cx - 16, 52)], fill=V)                            # les oreilles
        d.polygon([(cx + 32, 34), (cx + 14, 44), (cx + 16, 52)], fill=V)
        d.ellipse([cx - 18, 30, cx + 18, 70], fill=V)                                              # la petite tête
        d.line([(cx - 10, 44), (cx - 2, 48)], fill=N, width=2); d.line([(cx + 10, 44), (cx + 2, 48)], fill=N, width=2)
        oeil(d, cx - 6, 51, 2, B); oeil(d, cx + 6, 51, 2, B)
        d.ellipse([cx - 4, 52, cx + 4, 60], fill=N)
        d.chord([cx - 10, 58, cx + 10, 68], 180, 360, fill=N)
        d.polygon([(cx - 7, 60), (cx - 5, 64), (cx - 3, 60)], fill=B)
        d.polygon([(cx + 3, 60), (cx + 5, 64), (cx + 7, 60)], fill=B)
    return personnage(dessin, 110)


def ecran_titre():
    """L'écran titre : « ÉDITION CYBERSUP », un vieux terminal allumé sur son invite, traversé par une épée, et le
    grand titre TERMINUS en relief."""
    im, d = toile()
    halo(d, 88, 64, 56, V, 0.4, 44)
    texte_centre(d, 4, "EDITION CYBERSUP", B)
    d.line([(26, 16), (150, 16)], fill=V)
    x, y, w_, h_ = 42, 24, 90, 70                                                        # le terminal
    d.polygon([(x + w_, y + 4), (x + w_ + 10, y + 9), (x + w_ + 10, y + h_ + 4), (x + w_, y + h_)], fill=V)
    d.rectangle([x, y, x + w_, y + h_], fill=B)
    d.rectangle([x + 7, y + 6, x + w_ - 7, y + h_ - 14], fill=V)
    d.rectangle([x + 9, y + 8, x + w_ - 9, y + h_ - 16], fill=N)
    d.line([(x + 14, y + 14), (x + 19, y + 19), (x + 14, y + 24)], fill=V, width=3)        # l'invite
    d.rectangle([x + 22, y + 22, x + 32, y + 24], fill=B)
    d.rectangle([x + w_ - 24, y + h_ - 9, x + w_ - 10, y + h_ - 6], fill=V)
    d.rectangle([x + 10, y + h_ - 9, x + 14, y + h_ - 6], fill=N)
    d.polygon([(x - 6, y + h_ + 2), (x + w_ + 6, y + h_ + 2), (x + w_ + 16, y + h_ + 16), (x - 2, y + h_ + 16)], fill=B)   # le clavier
    for k in range(3):
        for j in range(17):
            kx = x - 1 + j * 5.6 + k * 3
            d.rectangle([kx, y + h_ + 4 + k * 4, kx + 3, y + h_ + 6 + k * 4], fill=N)
    d.rectangle([x - 4, y + h_ + 16, x + w_ + 16, y + h_ + 17], fill=V)
    sy = y + 34                                                                          # l'épée qui le traverse
    d.polygon([(0, sy), (12, sy - 5), (x - 1, sy - 5), (x - 1, sy + 5), (12, sy + 5)], fill=B)
    d.line([(12, sy), (x - 1, sy)], fill=V)
    d.line([(12, sy + 5), (x - 1, sy + 5)], fill=V)
    d.rectangle([x + w_ + 10, sy - 5, x + w_ + 14, sy + 5], fill=B)
    d.rectangle([x + w_ + 14, sy - 14, x + w_ + 19, sy + 14], fill=B)                    # la garde
    d.rectangle([x + w_ + 15, sy - 13, x + w_ + 18, sy + 13], fill=V)
    d.rectangle([x + w_ + 19, sy - 3, x + w_ + 32, sy + 3], fill=V)                      # la poignée
    for k in range(3):
        d.line([(x + w_ + 21 + k * 4, sy - 3), (x + w_ + 23 + k * 4, sy + 3)], fill=N)
    d.ellipse([x + w_ + 31, sy - 5, x + w_ + 41, sy + 5], fill=B)
    d.ellipse([x + w_ + 34, sy - 2, x + w_ + 38, sy + 2], fill=V)
    s = 3
    t = "TERMINUS"
    gros_texte(d, (W - largeur_texte(t, s)) // 2 - 1, 132, t, s, V, B, N, 3)
    return im


def paradis():
    """Le Paradis : THE END en grosses lettres blanches en relief, au milieu de rayons de lumière, sur une mer de
    nuages."""
    im, d = toile()
    degrade(d, 0, 0, W, 140, V, 0.05, 0.6)
    cx, cy = 88, 76
    for k in range(16):                                                                  # les rayons
        a = k * math.pi / 8 + 0.1
        a2 = a + 0.1
        d.polygon([(cx, cy), (cx + math.cos(a) * 200, cy + math.sin(a) * 200), (cx + math.cos(a2) * 200, cy + math.sin(a2) * 200)], fill=V)
    for (x, y, l, h_) in ((20, 140, 40, 10), (86, 146, 50, 12), (150, 138, 40, 10)):
        nuage_plat(im, d, x, y, l, h_)
    d.rectangle([0, 146, W, H], fill=B)
    for (x, y, l, h_) in ((34, 166, 40, 8), (124, 168, 50, 9)):
        nuage_plat(im, d, x, y, l, h_, B, V)
    s = 7
    for (t, y) in (("THE", 20), ("END", 84)):
        x = (W - largeur_texte(t, s)) // 2
        gros_texte(d, x - 2, y, t, s, N, N, N, 0)                                         # le détourage noir
        for (dx, dy) in ((-3, -3), (3, 3), (-3, 3), (3, -3), (0, 4), (4, 0)):
            gros_texte(d, x + dx, y + dy, t, s, N, N, N, 0)
        gros_texte(d, x, y, t, s, B, B, V, 5)
    return im


def taverne():
    """La Taverne du Pingouin Manchot : derrière le comptoir, les étagères de bouteilles et deux tonneaux ;
    une chope qui mousse sur le zinc ; à droite, la cheminée et son feu ; des lampes pendues."""
    im, d = toile()
    d.rectangle([0, 0, W, H], fill=N)
    for y in range(0, 110, 12):                                                          # les lambris
        d.line([(0, y), (W, y)], fill=V)
    for y in (34, 62):                                                                   # les étagères à bouteilles
        d.rectangle([8, y, 110, y + 3], fill=B)
        d.line([(8, y + 4), (110, y + 4)], fill=V)
        for k, x in enumerate(range(14, 106, 9)):
            bouteille(d, x, y - 1, 10 + (k * 5) % 7, V if k % 3 else B)
    chope_tonneau(d, 16, 74, 24, 36)                                                     # les tonneaux
    chope_tonneau(d, 48, 78, 20, 32)
    x0 = 124                                                                             # la cheminée et son feu
    d.rectangle([x0, 40, W, 128], fill=B)
    for y in range(44, 128, 8):
        for x in range(x0 + (y // 8 % 2) * 6, W, 12):
            d.rectangle([x, y, x + 10, y + 6], outline=V)
    d.rectangle([x0 + 8, 76, W - 4, 128], fill=N)
    d.pieslice([x0 + 8, 64, W - 4, 90], 180, 360, fill=N)
    halo(d, 150, 112, 30, V, 0.9, 24)
    for (x, h_) in ((140, 20), (150, 28), (160, 18)):
        flamme(d, x, 122, h_, B, V)
    d.rectangle([x0 + 12, 122, W - 8, 126], fill=V)
    d.rectangle([x0 - 2, 34, W, 40], fill=V)
    for x in (60, 100):                                                                  # les lampes pendues
        d.line([(x, 0), (x, 12)], fill=B)
        halo(d, x, 16, 18, B, 0.5)
        d.polygon([(x - 6, 18), (x + 6, 18), (x + 3, 12), (x - 3, 12)], fill=V)
        d.rectangle([x - 2, 18, x + 2, 20], fill=B)
    d.rectangle([0, 112, 124, 118], fill=B)                                              # le comptoir
    d.rectangle([0, 118, 124, 152], fill=V)
    for x in range(6, 124, 14):
        d.rectangle([x, 122, x + 10, 148], outline=N)
    d.line([(0, 119), (124, 119)], fill=N)
    d.rectangle([0, 152, W, H], fill=N)
    for k in range(4):
        d.line([(0, 154 + k * 4), (W, 154 + k * 4)], fill=V if k % 2 else N)
    chope(d, 76, 111, 1.0)
    d.polygon([(94, 111), (116, 111), (118, 105), (96, 105)], fill=B)                    # le gros registre
    d.polygon([(94, 111), (116, 111), (116, 113), (94, 113)], fill=V)
    d.line([(105, 105), (106, 111)], fill=N)
    return im


def chope_tonneau(d, x, y, w=26, h=34):
    """Un tonneau debout : le ventre bombé, les douelles, deux cercles de fer, le dessus clair."""
    d.chord([x - 4, y, x + w + 4, y + h], 0, 360, fill=V)
    d.rectangle([x, y + 2, x + w, y + h - 2], fill=V)
    for k in range(1, 5):
        xx = x + w * k / 5
        d.line([(xx, y + 4), (xx, y + h - 4)], fill=N)
    for yy in (y + 7, y + h - 8):
        d.line([(x - 2, yy), (x + w + 2, yy)], fill=B, width=2)
    d.ellipse([x, y - 3, x + w, y + 5], fill=B)
    d.ellipse([x + 3, y - 1, x + w - 3, y + 3], fill=V)
    d.line([(x - 3, y + 8), (x - 3, y + h - 8)], fill=B)


def tunnel():
    """Le .Tunnel : un boyau étroit, rond, qui s'enfonce ; de l'eau au fond, des racines qui pendent de la voûte ;
    et dans le noir, deux petits yeux qui brillent."""
    im, d = toile()
    cx, cy = 92, 86
    for k in range(10, 0, -1):                                                           # les anneaux du boyau
        f = (k / 10) ** 1.6
        rx, ry = 6 + 96 * f, 5 + 90 * f
        ox, oy = (1 - f) * 8, (1 - f) * -4
        d.ellipse([cx + ox - rx, cy + oy - ry, cx + ox + rx, cy + oy + ry], fill=V if k % 2 else N)
        d.ellipse([cx + ox - rx + 3, cy + oy - ry + 3, cx + ox + rx - 1, cy + oy + ry - 1], fill=N)
    for (x, y) in ((cx + 6, cy - 4), (cx + 12, cy - 4)):                                  # les yeux du rat
        halo(d, x, y, 7, V, 0.8)
        d.rectangle([x - 1, y - 1, x + 1, y], fill=B)
    for k in range(9):                                                                   # l'eau au fond
        f = (k / 9) ** 1.4
        y = cy + 8 + 74 * f
        l = 6 + 40 * f
        d.line([(cx + 6 - l, y), (cx + 2 + l * 0.6, y)], fill=B if k % 2 else V)
    rnd = random.Random(4)
    for k in range(9):                                                                   # les racines qui pendent
        x = 24 + k * 16 + rnd.randint(-4, 4)
        y0 = 2 + abs(x - 90) * 0.18
        l = rnd.randint(18, 42)
        pts = [(x, y0)]
        for j in range(6):
            pts.append((pts[-1][0] + rnd.choice((-2, -1, 1, 2)), pts[-1][1] + l / 6))
        for j in range(len(pts) - 1):
            ep = max(1, 4 - j)
            d.line([pts[j], pts[j + 1]], fill=B, width=ep)
        for j in range(1, len(pts) - 2):
            d.point((pts[j][0] + 1, pts[j][1]), fill=V)
        bx, by = pts[2]
        d.line([(bx, by), (bx + 6 * (1 if k % 2 else -1), by + 8)], fill=B)
    return im


def salle_serveurs():
    """La SalleServeurs (et les machines du réseau), en noir et blanc : trois baies de serveurs côte à côte dans la
    pénombre, leurs tiroirs et leurs voyants qui clignotent, les câbles, le faux plancher."""
    im, d = toile()
    for k in range(1, 6):                                                                # le faux plancher
        f = (k / 6) ** 1.5
        y = 140 + 30 * f
        d.line([(0, y), (W, y)], fill=B)
    for j in range(9):
        d.line([(40 + j * 12, 140), (-40 + j * 32, H)], fill=B)
    d.line([(0, 140), (W, 140)], fill=B)
    for (x, graine) in ((10, 1), (64, 2), (118, 3)):                                     # les trois baies
        w_, y0, y1, p = 48, 14, 140, 6
        d.polygon([(x + w_, y0), (x + w_ + p, y0 - 4), (x + w_ + p, y1 - 4), (x + w_, y1)], fill=B)
        d.polygon([(x, y0), (x + p, y0 - 4), (x + w_ + p, y0 - 4), (x + w_, y0)], fill=B)
        d.line([(x + w_ + 2, y0), (x + w_ + 2, y1 - 2)], fill=N)
        d.rectangle([x, y0, x + w_, y1], fill=B)
        d.rectangle([x + 3, y0 + 3, x + w_ - 3, y1 - 3], fill=N)
        rnd = random.Random(graine)
        y = y0 + 6
        while y < y1 - 10:                                                               # les serveurs, tiroir par tiroir
            h_ = rnd.choice((4, 4, 6, 8))
            d.rectangle([x + 5, y, x + w_ - 5, y + h_ - 1], outline=B)
            for k in range(rnd.randint(1, 3)):
                d.point((x + 8 + k * 3, y + h_ // 2), fill=B)
            if h_ > 4:
                for xx in range(x + 22, x + w_ - 8, 2):
                    d.point((xx, y + 2), fill=B)
            y += h_ + 1
        d.rectangle([x + 5, y1 - 8, x + w_ - 5, y1 - 5], fill=B)
    for (xa, xb) in ((40, 70), (96, 128)):                                               # des câbles d'une baie à l'autre
        d.arc([xa, 4, xb, 22], 0, 180, fill=B, width=2)
    return im


def babiole():
    """La BabioleÉtrange : un cristal taillé, pendu à un cordon vert, qui brille doucement."""
    im, d = toile()
    cx, cy = 88, 100
    halo(d, cx, cy, 46, V, 0.7)
    halo(d, cx, cy, 20, B, 0.5)
    pts = []                                                                             # le cordon, en boucle souple
    for k in range(60):
        t = k / 59
        a = math.pi * 0.5 + t * math.pi * 1.7
        pts.append((cx + 16 + math.cos(a) * 26 * (1 - t * 0.2), cy - 62 - math.sin(a) * 22 + t * 24))
    d.line([(cx, cy - 34)] + pts[::-1], fill=V, width=3, joint='curve')
    d.ellipse([cx - 5, cy - 40, cx + 5, cy - 30], outline=B, width=2)                   # l'anneau
    pts = [(cx, cy - 30), (cx + 18, cy - 6), (cx, cy + 34), (cx - 18, cy - 6)]           # le cristal
    d.polygon(pts, fill=B)
    d.polygon([(cx, cy - 30), (cx + 18, cy - 6), (cx, cy - 2)], fill=V)
    d.polygon([(cx, cy - 2), (cx + 18, cy - 6), (cx, cy + 34)], fill=N)
    d.polygon([(cx, cy - 2), (cx - 18, cy - 6), (cx, cy + 34)], fill=V)
    d.line(pts + [pts[0]], fill=B)
    d.line([(cx - 18, cy - 6), (cx, cy - 2), (cx + 18, cy - 6)], fill=B)
    d.line([(cx, cy - 2), (cx, cy + 34)], fill=B)
    for (x, y) in ((cx - 30, cy - 20), (cx + 32, cy + 10), (cx - 22, cy + 30)):         # les reflets
        d.line([(x - 3, y), (x + 3, y)], fill=B); d.line([(x, y - 3), (x, y + 3)], fill=B)
    return im


def romancenovel():
    """Le RomanDeGare (et le Livre d'or) : un livre vert au titre ROMANCE, deux cœurs enlacés sur la couverture."""
    im, d = toile()
    halo(d, 88, 84, 56, V, 0.3, 50)
    sol_objet(d, 92, 136, 84)

    def coeurs(d):
        d.rectangle([60, 46, 116, 58], fill=B)
        texte_centre(d, 47, "ROMANCE", N, 58, 118)
        for (cx, cy) in ((78, 90), (98, 86)):
            d.ellipse([cx - 12, cy - 9, cx, cy + 3], fill=B)
            d.ellipse([cx - 1, cy - 9, cx + 11, cy + 3], fill=B)
            d.polygon([(cx - 12, cy - 2), (cx + 11, cy - 2), (cx, cy + 15)], fill=B)
            d.ellipse([cx - 9, cy - 6, cx - 3, cy], fill=V)
            d.ellipse([cx + 2, cy - 6, cx + 8, cy], fill=V)
            d.polygon([(cx - 9, cy - 2), (cx + 8, cy - 2), (cx, cy + 10)], fill=V)
        d.point((70, 84), fill=B)
    livre(d, 54, 40, 66, 92, 10, V, (), 1, coeurs)
    return im


def engrenage():
    """Le Rouage (en noir et blanc) : une roue dentée épaisse, son moyeu, ses rayons et ses dents."""
    im, d = toile()
    cx, cy, r = 86, 82, 56
    for k in range(12):                                                                  # les dents
        a = k * math.pi / 6
        pts = [(cx + math.cos(a + da) * rr, cy + math.sin(a + da) * rr) for (da, rr) in ((-0.13, r - 4), (-0.09, r + 12), (0.09, r + 12), (0.13, r - 4))]
        d.polygon(pts, fill=B)
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=B)
    d.ellipse([cx - r + 10, cy - r + 10, cx + r - 10, cy + r - 10], fill=N)
    d.ellipse([cx - r + 14, cy - r + 14, cx + r - 14, cy + r - 14], outline=B)
    for k in range(5):                                                                   # les rayons
        a = k * 2 * math.pi / 5 + 0.3
        d.line([(cx, cy), (cx + math.cos(a) * (r - 10), cy + math.sin(a) * (r - 10))], fill=B, width=9)
        d.line([(cx + math.cos(a + 0.12) * 18, cy + math.sin(a + 0.12) * 18), (cx + math.cos(a + 0.05) * (r - 12), cy + math.sin(a + 0.05) * (r - 12))], fill=N)
    d.ellipse([cx - 16, cy - 16, cx + 16, cy + 16], fill=B)
    d.ellipse([cx - 12, cy - 12, cx + 12, cy + 12], outline=N)
    d.ellipse([cx - 6, cy - 6, cx + 6, cy + 6], fill=N)
    d.rectangle([cx - 2, cy - 10, cx + 2, cy - 6], fill=N)
    d.arc([cx - r + 3, cy - r + 3, cx + r - 3, cy + r - 3], 190, 260, fill=N)
    for k in range(12):                                                                  # l'arête de chaque dent
        a = k * math.pi / 6
        d.line([(cx + math.cos(a + 0.07) * (r + 2), cy + math.sin(a + 0.07) * (r + 2)), (cx + math.cos(a + 0.07) * (r + 10), cy + math.sin(a + 0.07) * (r + 10))], fill=N)
    tirets_sol(d, 86, 156, 120)
    return im


def cage(enfant=False):
    """La Cage : des barreaux de fer sous une barre épaisse, sur un socle ; (enfant : l'enfant kidnappé, derrière)."""
    im, d = toile()
    x0, x1, y0, y1 = 30, 146, 30, 140
    d.rectangle([x0 - 6, y1, x1 + 6, y1 + 8], fill=B)                                    # le socle
    d.line([(x0 - 6, y1 + 8), (x1 + 6, y1 + 8)], fill=V if enfant else N)
    if enfant:
        petit_captif(im, d, 88, y1)
    else:
        for x in range(x0 + 6, x1, 13):                                                  # les barreaux du fond, plus fins
            d.line([(x + 3, y0 + 14), (x + 3, y1 - 8)], fill=B)
        d.line([(x0 + 4, y0 + 14), (x1 - 2, y0 + 14)], fill=B)
        d.line([(x0 + 4, y1 - 8), (x1 - 2, y1 - 8)], fill=B)
    for x in range(x0, x1 + 1, 13):                                                      # les barreaux
        d.rectangle([x - 1, y0 + 6, x + 2, y1], fill=B)
        d.line([(x + 2, y0 + 6), (x + 2, y1)], fill=N)
    d.rectangle([x0 - 6, y0, x1 + 6, y0 + 8], fill=B)                                    # la barre du haut
    d.line([(x0 - 6, y0 + 8), (x1 + 6, y0 + 8)], fill=N)
    d.rectangle([x0 - 6, y0 + 50, x1 + 6, y0 + 52], fill=B)
    d.rectangle([84, y0 - 12, 92, y0], fill=B)                                           # l'anneau
    d.ellipse([80, y0 - 22, 96, y0 - 8], outline=B, width=3)
    d.rectangle([112, y0 + 60, 124, y0 + 74], fill=B)                                    # le cadenas
    d.arc([113, y0 + 52, 123, y0 + 66], 180, 360, fill=B, width=2)
    d.rectangle([117, y0 + 65, 119, y0 + 69], fill=N)
    tirets_sol(d, 88, y1 + 14, 140)
    return im


def ronces():
    """Les Ronces : un fourré de grosses tiges vertes qui s'enroulent et s'entrelacent, hérissées d'épines blanches."""
    im, d = toile()
    ombre_sol(d, 88, 152, 84, 8, V, 0.9)
    tiges = (((20, 152), 1.2, 1.0, 64, 1), ((64, 156), 1.5, -1.0, 58, 2), ((100, 152), 1.3, 1.0, 70, 3),
             ((146, 156), 1.8, -1.0, 62, 4), ((170, 120), 2.4, 1.0, 50, 5), ((6, 100), 0.5, -1.0, 52, 6),
             ((40, 60), 0.1, 1.0, 44, 7), ((150, 70), 2.9, -1.0, 40, 8))
    for ((x, y), a, sens, l, g) in tiges:
        rnd = random.Random(g)
        pts = [(x, y)]
        courbure = 0.0
        for j in range(int(l)):                                                           # une tige qui s'enroule en crosse
            courbure = 0.01 + (j / l) ** 2 * 0.2
            a += courbure * sens
            pts.append((pts[-1][0] + math.cos(a) * 2.6, pts[-1][1] - math.sin(a) * 2.6))
        d.line(pts, fill=N, width=10, joint='curve')
        d.line(pts, fill=V, width=7, joint='curve')
        d.line([(px - 1, py - 2) for (px, py) in pts[:-4]], fill=B, width=1)
        for j in range(4, len(pts) - 3, 6):                                              # les épines
            (px, py), (qx, qy) = pts[j], pts[j + 1]
            nx, ny = -(qy - py), (qx - px)
            nn = math.hypot(nx, ny) or 1
            s_ = 1 if (j // 6) % 2 else -1
            bx, by = px + nx / nn * 4 * s_, py + ny / nn * 4 * s_
            d.polygon([(bx - (qx - px), by - (qy - py)), (bx + (qx - px), by + (qy - py)), (bx + nx / nn * 7 * s_, by + ny / nn * 7 * s_)], fill=B)
        if rnd.random() < 0.8:                                                           # une feuille
            px, py = pts[len(pts) // 3]
            d.polygon([(px, py), (px + 8, py - 7), (px + 14, py - 2), (px + 6, py + 2)], fill=V)
            d.line([(px, py), (px + 13, py - 3)], fill=N)
            d.line([(px + 1, py - 1), (px + 8, py - 7)], fill=B)
    return im


def foret():
    """La ForêtOuest : en contre-jour, deux grands arbres tordus encadrent un sentier qui s'enfonce vers une clairière
    lumineuse ; au bout, les tours de l'Académie des Sorts se découpent sur le ciel ; des rais de lumière tombent
    des feuillages."""
    im, d = toile()
    degrade(d, 0, 0, W, 98, V, 0.2, 1.0)
    degrade(d, 0, 60, W, 98, B, 0.0, 0.85)
    c, dc = calque()                                                                     # l'Académie, au bout du chemin
    for (x, w_, h_) in ((78, 6, 26), (86, 10, 44), (99, 7, 32), (108, 4, 18)):
        dc.rectangle([x, 98 - h_, x + w_, 98], fill=N)
        dc.polygon([(x - 1, 98 - h_), (x + w_ / 2, 98 - h_ - 11), (x + w_ + 1, 98 - h_)], fill=N)
    dc.rectangle([74, 88, 114, 98], fill=N)
    colline(dc, 96, 3, 10, 0.4, N, 0, W, 100)                                            # la lisière, au loin
    for (x, h_) in ((10, 20), (30, 26), (50, 18), (130, 22), (150, 28), (168, 20)):
        dc.ellipse([x - 12, 98 - h_, x + 12, 98 - h_ + 24], fill=N)
    poser(im, c, B, ((-1, 0), (0, -1)))
    for (x, y) in ((90, 66), (90, 76), (80, 91), (102, 82), (95, 91)):
        d.rectangle([x, y, x + 1, y + 2], fill=V)
    d.rectangle([0, 100, W, H], fill=N)                                                 # le sol et le sentier
    d.polygon([(84, 100), (96, 100), (146, H), (36, H)], fill=V)
    for k in range(1, 9):
        f = (k / 9) ** 1.7
        y = int(100 + (H - 100) * f)
        d.line([(84 - 48 * f, y), (96 + 50 * f, y)], fill=N)
    d.line([(84, 100), (36, H)], fill=B); d.line([(96, 100), (146, H)], fill=B)
    for (xa, xb, l) in ((66, 50, 8), (110, 126, 7)):                                     # les rais de lumière
        for k in range(96):
            f = k / 96
            cx = xa + (xb - xa) * f
            trame(d, cx - l * f, k + 4, cx + l * f, k + 4, B, 0.22 * (1 - f))
    herbes(d, 108, H, 3, V, B, 0.6, 0, 50)
    herbes(d, 108, H, 5, V, B, 0.6, 130, W)
    for (pts, sens, branches, feuilles) in (
            ([(14, H), (22, 132), (12, 98), (24, 62), (16, 24), (24, 0)], 1,
             ((24, 66, 46, 0.45), (16, 40, 32, 0.9), (22, 102, 26, 0.25)), ((50, 18, 16), (62, 34, 10))),
            ([(162, H), (154, 132), (164, 100), (152, 62), (160, 26), (150, 0)], -1,
             ((152, 66, 48, 2.7), (160, 36, 32, 2.3), (156, 104, 22, 2.9)), ((122, 16, 16), (112, 32, 10)))):
        c, dc = calque()                                                                 # les deux grands arbres
        tronc(dc, pts, 20, N, N)
        for (x, y, l, a) in branches:
            bx, by = branche(dc, x, y, l, a, 6, N)
            branche(dc, bx, by, l * 0.55, a + 0.5 * sens, 3, N)
            branche(dc, bx, by, l * 0.4, a - 0.6 * sens, 2, N)
        x0 = pts[0][0]
        for (dx, y, r) in ((-4, 2, 26), (30 * sens, -4, 22)):
            dc.ellipse([x0 + dx - r, y - r, x0 + dx + r, y + r * 0.8], fill=N)
        for a in (-1, 1):
            dc.line([(x0, 154), (x0 + a * 18, 170)], fill=N, width=6)
        poser(im, c, B, ((sens, 0),), 1, None, V, 2)
        for (fx, fy, r) in feuilles:                                                     # quelques feuillages éclairés
            feuillage(im, d, fx, fy, r, int(fx), V, B, N)
    return im


def villageois():
    """Le Villageois (et l'administrateur réseau) : casquette plate, long nez pointu, chemise rayée et bretelles ;
    il se tord les mains, les sourcils levés, à cran."""
    def dessin(d):
        cx = 88
        jambes_droites(d, cx, 102, 8, 9, N, V)
        d.polygon([(cx - 20, 56), (cx + 20, 56), (cx + 22, 104), (cx - 22, 104)], fill=B)          # la chemise rayée
        for x in range(cx - 18, cx + 22, 5):
            d.line([(x, 58), (x + 1, 102)], fill=V)
        d.line([(cx - 10, 56), (cx - 10, 104)], fill=N, width=3); d.line([(cx + 10, 56), (cx + 10, 104)], fill=N, width=3)
        d.rectangle([cx - 22, 100, cx + 22, 106], fill=N)
        bras_pli(d, [(cx - 20, 60), (cx - 26, 80), (cx - 4, 86)], 8, B)
        bras_pli(d, [(cx + 20, 60), (cx + 26, 80), (cx + 4, 86)], 8, B)
        d.rectangle([cx - 4, 50, cx + 4, 58], fill=B)
        d.ellipse([cx - 15, 18, cx + 15, 54], fill=B)                                              # la tête
        d.arc([cx - 15, 18, cx + 15, 54], 300, 60, fill=V)
        d.chord([cx - 18, 10, cx + 18, 34], 180, 360, fill=V)                                      # la casquette
        d.polygon([(cx - 4, 24), (cx + 26, 24), (cx + 24, 28), (cx - 4, 28)], fill=V)
        d.line([(cx - 18, 22), (cx + 24, 22)], fill=N)
        d.line([(cx - 10, 29), (cx - 4, 27)], fill=N); d.line([(cx + 4, 27), (cx + 10, 29)], fill=N)
        oeil(d, cx - 7, 34, 2); oeil(d, cx + 7, 34, 2)
        d.polygon([(cx - 1, 36), (cx + 3, 36), (cx + 16, 44), (cx + 2, 45)], fill=B)              # le long nez pointu
        d.line([(cx + 3, 36), (cx + 16, 44), (cx + 2, 45)], fill=V)
        d.arc([cx - 6, 46, cx + 4, 52], 200, 340, fill=N)
        d.point((cx - 12, 42), fill=V)
    return personnage(dessin)


def poney():
    """Le Poney dodu mais majestueux : un gros poney blanc tout rond qui gambade, la crinière et la queue vertes au
    vent, l'œil content."""
    def dessin(d):
        pts = [(36, 86)]                                                                           # la queue au vent
        for k in range(20):
            t = k / 19
            pts.append((36 - t * 30, 86 - math.sin(t * 3) * 8 + t * 10))
        d.line(pts, fill=V, width=9, joint='curve')
        d.line([(x, y - 3) for (x, y) in pts[4:]], fill=B)
        for (x0, y0, x1, y1, a) in ((50, 108, 62, 136, -6), (70, 112, 82, 140, 4), (108, 110, 120, 136, -4), (124, 104, 136, 128, 8)):   # les pattes
            d.polygon([(x0, y0), (x1, y0), (x1 + a, y1), (x0 + a, y1)], fill=B)
            d.rectangle([x0 + a - 1, y1 - 4, x1 + a + 1, y1], fill=V)
        d.ellipse([34, 62, 140, 122], fill=B)                                                      # le corps tout rond
        d.chord([34, 62, 140, 122], 10, 170, fill=V)
        d.ellipse([38, 62, 138, 116], fill=B)
        d.polygon([(122, 76), (138, 48), (156, 46), (150, 92)], fill=B)                            # l'encolure
        d.ellipse([132, 30, 166, 64], fill=B)                                                      # la tête
        d.ellipse([150, 46, 174, 66], fill=B)
        d.ellipse([162, 54, 166, 58], fill=N)
        d.arc([156, 56, 172, 66], 20, 140, fill=N)
        oeil(d, 148, 42, 2)
        d.arc([142, 34, 154, 44], 200, 320, fill=N)
        d.polygon([(138, 34), (140, 18), (148, 32)], fill=B)
        d.line([(141, 22), (143, 30)], fill=V)
        for k in range(6):                                                                         # la crinière
            x, y = 138 - k * 5, 30 + k * 9
            d.polygon([(x, y), (x - 12, y + 2), (x - 6, y + 8), (x - 14, y + 12), (x + 2, y + 12)], fill=V)
        d.polygon([(140, 28), (152, 26), (146, 36)], fill=V)
        d.arc([60, 70, 110, 110], 200, 250, fill=V)
    return personnage(dessin, 110)


def rat():
    """Le Rat de la taille d'un petit chien : de profil, le dos voûté et hérissé, le museau pointu, les dents en
    avant, l'œil mauvais, une longue queue nue qui traîne."""
    def dessin(d):
        pts = [(46, 116)]                                                                          # la queue
        for k in range(40):
            t = k / 39
            pts.append((46 - t * 40, 116 + math.sin(t * math.pi) * 18 - t * 4))
        d.line(pts, fill=B, width=3, joint='curve')
        d.line([(x, y + 1) for (x, y) in pts[:20]], fill=V)
        d.polygon([(40, 112), (52, 82), (82, 66), (114, 70), (138, 86), (156, 98), (164, 104), (150, 110),
                   (128, 118), (96, 124), (60, 124)], fill=V)                                      # le corps et le museau
        d.polygon([(60, 120), (96, 122), (128, 116), (120, 112), (90, 116), (60, 114)], fill=B)    # le ventre
        for k in range(16):                                                                        # le poil hérissé du dos
            t = k / 15
            x = 52 + t * 80
            y = 82 - math.sin(t * math.pi) * 15 + t * 4
            d.polygon([(x - 4, y + 5), (x - 1, y - 6 - (k % 3) * 2), (x + 3, y + 5)], fill=V)
            d.line([(x - 1, y - 4 - (k % 3) * 2), (x - 2, y + 4)], fill=N)
        d.ellipse([112, 66, 132, 86], fill=V); d.ellipse([116, 70, 128, 82], fill=B)               # l'oreille
        d.ellipse([160, 100, 168, 106], fill=B)                                                    # la truffe
        oeil(d, 140, 90, 3, B)
        d.line([(132, 84), (146, 86)], fill=N, width=2)
        d.rectangle([152, 108, 155, 116], fill=B); d.rectangle([157, 107, 160, 113], fill=B)        # les dents
        for k in range(3):                                                                         # les moustaches
            d.line([(160, 102), (174, 94 + k * 6)], fill=B)
        for (x, ph) in ((62, 0), (80, 1), (112, 0), (128, 1)):                                      # les pattes griffues
            d.line([(x, 118), (x + 2 + ph * 4, 138)], fill=V, width=5)
            for k in (-1, 1, 3):
                d.line([(x + ph * 4 + 2, 138), (x + ph * 4 + 2 + k * 3, 142)], fill=B)
    return personnage(dessin, 120)


def dragon_mecanique():
    """Le DragonMécanique : un petit dragon d'horlogerie qui gambade, de profil ; le cou cambré, une tête cornue,
    une crête dentelée, des plaques rivetées, un ventre ouvert sur ses rouages, une aile repliée, et dans le dos
    la grande clé de remontage."""
    im, d = toile()
    sol_objet(d, 88, 140, 120)
    c, dc = calque()
    dc.ellipse([40, 76, 124, 124], fill=V)                                               # le corps
    dc.polygon([(110, 92), (122, 64), (132, 48), (144, 46), (140, 62), (126, 96)], fill=V)   # le cou cambré
    dc.polygon([(132, 40), (150, 34), (168, 40), (172, 48), (160, 50), (166, 56), (150, 58), (136, 54)], fill=V)   # la tête
    dc.polygon([(136, 38), (128, 22), (142, 34)], fill=B)                                # les cornes
    dc.polygon([(144, 34), (142, 18), (152, 32)], fill=B)
    pts = [(44, 100)]                                                                    # la queue qui s'enroule
    for k in range(30):
        t = k / 29
        a = math.pi * (0.95 + t * 1.3)
        r = 30 - t * 18
        pts.append((26 + math.cos(a) * r * 0.9 + 8, 98 + math.sin(a) * r * 0.7 - 4))
    dc.line(pts, fill=V, width=7, joint='curve')
    tx, ty = pts[-1]
    dc.polygon([(tx - 4, ty - 4), (tx + 6, ty - 2), (tx, ty + 6)], fill=B)
    for (x, ph) in ((54, 0), (70, 1), (102, 1), (116, 0)):                               # les pattes, au trot
        dx = 6 if ph else -4
        dc.polygon([(x - 6, 112), (x + 6, 112), (x + 4 + dx, 128), (x - 3 + dx, 128)], fill=V)
        dc.polygon([(x - 3 + dx, 126), (x + 4 + dx, 126), (x + 4 + dx, 138), (x - 2 + dx, 138)], fill=V)
        dc.rectangle([x - 4 + dx, 136, x + 8 + dx, 139], fill=B)
    poser(im, c, B, ((-1, 0), (0, -1)), 1, (V,))
    for k in range(9):                                                                   # la crête dentelée
        t = k / 8
        x = 50 + 66 * t
        y = 78 - math.sin(t * math.pi) * 4 - 2
        d.polygon([(x - 3, y + 3), (x, y - 5), (x + 3, y + 3)], fill=B)
    for k in range(4):
        x, y = 124 + k * 4, 66 - k * 8
        d.polygon([(x - 2, y + 2), (x + 2, y - 4), (x + 3, y + 2)], fill=B)
    for x in range(52, 122, 12):                                                         # les plaques rivetées
        d.arc([x - 4, 80, x + 12, 118], 260, 100, fill=N)
        d.point((x + 2, 84), fill=B); d.point((x + 6, 112), fill=N)
    d.chord([60, 104, 108, 124], 0, 180, fill=B)                                         # le ventre clair
    for x in range(64, 106, 6):
        d.line([(x, 108), (x, 120)], fill=V)
    d.ellipse([74, 88, 98, 110], fill=N)                                                 # la trappe ouverte et ses rouages
    for (gx, gy, r) in ((82, 98, 6), (92, 104, 4)):
        d.ellipse([gx - r, gy - r, gx + r, gy + r], outline=B, width=2)
        for k in range(8):
            a = k * math.pi / 4
            d.point((gx + math.cos(a) * (r + 2), gy + math.sin(a) * (r + 2)), fill=B)
    d.ellipse([74, 88, 98, 110], outline=B)
    d.polygon([(64, 82), (66, 52), (80, 40), (100, 44), (90, 54), (104, 60), (92, 68), (100, 78)], fill=V)   # l'aile repliée
    for (a, b_) in (((66, 80), (80, 42)), ((70, 80), (98, 46)), ((76, 80), (102, 60))):
        d.line([a, b_], fill=B)
    d.line([(64, 82), (66, 52), (80, 40)], fill=B)
    oeil(d, 156, 42, 2, B)                                                               # l'œil et la gueule
    d.line([(158, 51), (171, 49)], fill=N)
    for k in range(4):
        d.point((160 + k * 3, 52), fill=B)
    d.point((168, 44), fill=N)
    d.rectangle([84, 54, 88, 80], fill=B)                                                # la clé de remontage
    d.line([(87, 56), (87, 80)], fill=V)
    for (x0, x1) in ((64, 86), (86, 108)):
        d.ellipse([x0, 36, x1, 50], fill=B)
        d.ellipse([x0 + 5, 40, x1 - 5, 46], fill=N)
    d.rectangle([82, 40, 90, 54], fill=B)
    d.line([(89, 42), (89, 54)], fill=V)
    return im


# ------------------------------------------------------------------
# Le registre des dessins
# ------------------------------------------------------------------

DESSINS = {
    "loc_forest.gif": foret,
    "loc_clearing.gif": clairiere,
    "loc_path.gif": sentier_sinistre,
    "loc_meadow.gif": prairie,
    "loc_mountains.gif": montagnes,
    "loc_farm.gif": ferme,
    "loc_bridge.gif": pont,
    "loc_rockypath.gif": sentier_rocailleux,
    "loc_academy.gif": academie,
    "loc_citadelle.gif": citadelle,
    "loc_square.gif": place,
    "loc_market.gif": marche,
    "loc_cave.gif": grotte,
    "loc_corridor.gif": couloir,
    "loc_stair.gif": escalier,
    "loc_darkroom.gif": salle_humide,
    "loc_backroom.gif": lambda: salle_humide(True),
    "loc_tunnel.gif": tunnel,
    "loc_portalroom.gif": chambre_portail,
    "loc_practiceroom.gif": salle_entrainement,
    "loc_classroom.gif": salle_de_cours,
    "loc_library.gif": bibliotheque,
    "loc_artisanshop.gif": atelier,
    "loc_taverne.gif": taverne,
    "loc_theend.gif": paradis,
    "loc_stata.gif": campus,
    "loc_cluster.gif": salle_serveurs,
    "loc_warroom.gif": warroom,
    "titlescreen_cybersup.gif": ecran_titre,
    "loc_cybersup.gif": cybersup,
    "item_historybook.gif": historybook,
    "item_romancenovel.gif": romancenovel,
    "item_radspellbook.gif": radspellbook,
    "item_manuscript.gif": manuscrit,
    "item_sign.gif": panneau,
    "item_tavernier.gif": chope_biere,
    "item_barde.gif": luth,
    "item_boulder.gif": gros_rocher,
    "item_box.gif": boite,
    "item_brambles.gif": ronces,
    "item_cage.gif": cage,
    "item_cagedboy.gif": lambda: cage(True),
    "item_corn.gif": mais,
    "item_dummy.gif": mannequin_bois,
    "item_gear.gif": engrenage,
    "item_lever.gif": levier,
    "item_locker.gif": casier,
    "item_portal.gif": portail,
    "item_trinket.gif": babiole,
    "item_workstation.gif": poste_travail,
    "item_clockdragon.gif": dragon_mecanique,
    "grep.gif": grep_elfe,
    "item_TA.gif": ta,
    "item_artisan.gif": artisane,
    "item_boy.gif": garcon_lunettes,
    "item_citizen1.gif": villageois,
    "item_citizen2.gif": lecteur_journal,
    "item_farmer.gif": fermier,
    "item_fatpony.gif": poney,
    "item_grad.gif": etudiante_grad,
    "item_lady.gif": dame,
    "item_librarian.gif": bibliothecaire,
    "item_man.gif": homme_pleurs,
    "item_merchant.gif": marchand,
    "item_mysteryman.gif": vieil_homme,
    "item_professor.gif": professeur,
    "item_rat.gif": rat,
    "item_sorciernoir.gif": sorcier_noir,
    "item_student.gif": eleve_presse,
    "item_supertroll.gif": supertroll,
    "item_troll1.gif": troll_moche,
    "item_troll2.gif": troll_plus_moche,
}

PETITS = {
    "item_convocation.gif": enveloppe_convocation,
}


if __name__ == "__main__":
    noms = sys.argv[1:] or list(DESSINS) + list(PETITS)
    for nom in noms:
        if nom in PETITS:
            sauver_petit(nom, PETITS[nom]())
        else:
            sauver(nom, DESSINS[nom]())
    print("ok", len(noms))
