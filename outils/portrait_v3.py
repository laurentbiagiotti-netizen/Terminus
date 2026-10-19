"""La boîte à outils des portraits v3 : des personnages beaux et détaillés, dans le caractère des sprites d'origine.

La toile fait 176 x 170 cases (la zone intérieure du cadre), chaque case devient un carré de 2 x 2 pixels dans le GIF
416 x 404 (dessiner_lieux.finir). Trois couleurs seulement : noir N, vert V, blanc B, sans anticrénelage.

Méthode : le personnage est construit en PIÈCES, de l'arrière vers l'avant (cape, bras du fond, corps, tête, bras
de devant, objet). Chaque pièce est un masque (polygones, ellipses, traits) que Toile.piece peint en une fois :
  1. un liseré noir d'une case autour de la pièce (il la détache de ce qui est derrière : c'est le trait du dessin) ;
  2. l'aplat de la couleur ;
  3. la lumière : une case blanche sur les bords tournés vers la lumière (en haut à gauche par défaut) ;
  4. l'ombre : une bande tramée (damier) ou des hachures sur les bords opposés, sur 2 à 4 cases.
Les visages, les mains et les petits détails se dessinent ensuite au pixel près (Toile.pixels, comme dessiner_panne).
À la fin, Toile.sol pose les traits blancs du sol sous les pieds, et Toile.verifier contrôle la palette.

Usage dans un outil :
    from portrait_v3 import Toile
    def rouxblanc_v3():
        t = Toile()
        t.piece(t.poly([...]), V, ombre=3)
        t.pixels(60, 40, VISAGE)
        t.sol(158)
        return t.image()
    finir("item_rouxblanc.gif", rouxblanc_v3())
"""
import math
import numpy as np
from PIL import Image, ImageDraw
from dessiner_lieux import PAL, N, V, B, W, H

BAYER = np.array([[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]])


def _decale(m, dx, dy):
    """Le masque m décalé de (dx, dy) cases (ce qui sort du cadre est perdu, ce qui entre est vide)."""
    r = np.zeros_like(m)
    h, w = m.shape
    xs0, xs1 = max(0, -dx), min(w, w - dx)
    ys0, ys1 = max(0, -dy), min(h, h - dy)
    r[ys0 + dy:ys1 + dy, xs0 + dx:xs1 + dx] = m[ys0:ys1, xs0:xs1]
    return r


def dilater(m, ep=1, carre=False):
    r = m.copy()
    for _ in range(ep):
        n = r.copy()
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)) + (((1, 1), (-1, -1), (1, -1), (-1, 1)) if carre else ()):
            n |= _decale(r, dx, dy)
        r = n
    return r


def eroder(m, ep=1):
    return ~dilater(~m, ep)


class Toile:
    def __init__(self):
        self.a = np.full((H, W), N, np.uint8)
        self.yy, self.xx = np.mgrid[0:H, 0:W]

    # ---------------------------------------------------------------- les masques
    def _masque(self, f):
        im = Image.new('1', (W, H), 0)
        f(ImageDraw.Draw(im))
        return np.array(im, dtype=bool)

    def poly(self, pts):
        return self._masque(lambda d: d.polygon([tuple(p) for p in pts], fill=1))

    def ell(self, x0, y0, x1, y1):
        return self._masque(lambda d: d.ellipse([x0, y0, x1, y1], fill=1))

    def rect(self, x0, y0, x1, y1):
        m = np.zeros((H, W), bool)
        m[max(0, y0):max(0, y1 + 1), max(0, x0):max(0, x1 + 1)] = True
        return m

    def trait(self, pts, ep=1):
        """Une ligne brisée d'épaisseur ep (en cases)."""
        def f(d):
            if ep <= 1:
                d.line([tuple(p) for p in pts], fill=1)
            else:
                d.line([tuple(p) for p in pts], fill=1, width=ep, joint='curve')
        return self._masque(f)

    def courbe(self, pts, ep=1, pas=40):
        """Une courbe de Bézier (3 ou 4 points de contrôle) d'épaisseur ep."""
        return self.trait(bezier(pts, pas), ep)

    def fuseau(self, pts, e0, e1, pas=40):
        """Une forme effilée le long d'une courbe de Bézier : épaisseur e0 au départ, e1 à l'arrivée (mèches, plis,
        doigts, bras, cornes, flammes)."""
        c = bezier(pts, pas)
        g, dr = [], []
        for i, (x, y) in enumerate(c):
            j0, j1 = max(0, i - 1), min(len(c) - 1, i + 1)
            tx, ty = c[j1][0] - c[j0][0], c[j1][1] - c[j0][1]
            n = math.hypot(tx, ty) or 1
            e = (e0 + (e1 - e0) * i / (len(c) - 1)) / 2
            g.append((x - ty / n * e, y + tx / n * e)); dr.append((x + ty / n * e, y - tx / n * e))
        return self.poly(g + dr[::-1]) | self.trait(c, 1)

    def zone(self, x0, y0, x1, y1):
        return self.rect(x0, y0, x1, y1)

    # ---------------------------------------------------------------- la peinture
    def peindre(self, m, c):
        self.a[m] = c

    def contour(self, m, c=N, ep=1, carre=False):
        self.a[dilater(m, ep, carre) & ~m] = c

    def bord(self, m, dx, dy, ep=1):
        """Les cases de m situées à moins de ep cases du bord, du côté (dx, dy)."""
        r = np.zeros_like(m)
        for k in range(1, ep + 1):
            r |= m & ~_decale(m, -dx * k, -dy * k)
        return r

    def damier(self, m, c, phase=0):
        self.a[m & (((self.xx + self.yy + phase) % 2) == 0)] = c

    def trame(self, m, c, t):
        """Trame ordonnée 4 x 4 de densité t (0 à 1)."""
        self.a[m & (BAYER[self.yy % 4, self.xx % 4] < t * 16)] = c

    def hachures(self, m, c, pas=3, sens=1, phase=0):
        """Hachures diagonales (sens 1 : de bas-gauche à haut-droite)."""
        self.a[m & (((self.xx * sens + self.yy + phase) % pas) == 0)] = c

    def rayures(self, m, c, pas=4, ep=1, vertical=True, phase=0):
        k = self.xx if vertical else self.yy
        self.a[m & (((k + phase) % pas) < ep)] = c

    def piece(self, m, c=V, bord=N, ep_bord=1, lumiere=None, ombre=0, sens_ombre=(1, 1), trame_ombre='damier',
              coul_ombre=None, coul_lumiere=None):
        """Une pièce du personnage : liseré, aplat, lumière en haut à gauche, ombre tramée en bas à droite.
        lumiere : None (automatique : oui pour le vert), True ou False. ombre : largeur de la bande d'ombre."""
        if bord is not None and ep_bord:
            self.contour(m, bord, ep_bord)
        self.a[m] = c
        if coul_ombre is None:
            coul_ombre = N if c == V else V
        if ombre:
            z = self.bord(m, sens_ombre[0], 0, ombre) | self.bord(m, 0, sens_ombre[1], ombre)
            z &= eroder(m, 1) if bord is not None else m
            if trame_ombre == 'damier':
                self.damier(z, coul_ombre)
            elif trame_ombre == 'plein':
                self.a[z] = coul_ombre
            else:
                self.hachures(z, coul_ombre, 2)
        if lumiere is None:
            lumiere = (c == V)
        if lumiere:
            cl = coul_lumiere if coul_lumiere is not None else B
            z = (self.bord(m, -1, 0, 1) | self.bord(m, 0, -1, 1)) & ~self.bord(m, 1, 0, 1) & ~self.bord(m, 0, 1, 1)
            self.a[z] = cl
        return m

    def pixels(self, x0, y0, dessin, miroir=False):
        """Un dessin au pixel près : '#' vert, 'o' blanc, ':' noir ; les autres caractères laissent voir dessous."""
        for dy, ligne in enumerate(dessin.strip('\n').split('\n')):
            if miroir:
                ligne = ligne[::-1]
            for dx, ch in enumerate(ligne):
                col = {'#': V, 'o': B, ':': N}.get(ch)
                x, y = x0 + dx, y0 + dy
                if col is not None and 0 <= x < W and 0 <= y < H:
                    self.a[y, x] = col

    def point(self, x, y, c):
        if 0 <= x < W and 0 <= y < H:
            self.a[y, x] = c

    def etoile(self, x, y, c=B, n=1):
        """Une petite étoile à 4 branches (n : longueur des branches)."""
        for k in range(-n, n + 1):
            self.point(x + k, y, c); self.point(x, y + k, c)

    def etincelle(self, x, y, c=B):
        self.etoile(x, y, c, 2); self.point(x, y, N)

    def sol(self, y, cx=88, l=70):
        """Les traits blancs du sol des sprites d'origine, sous les pieds : deux épaisseurs de case, trois rangs."""
        for (a, b, dy) in [(-l, -l + 22, 0), (-l + 28, l - 30, 0), (l - 24, l, 0),
                           (-l + 12, -6, 3), (2, 22, 3), (28, l - 14, 3),
                           (-22, -8, 6), (-2, 14, 6)]:
            self.a[y + dy, cx + a:cx + b + 1] = B

    def oeil(self, x, y, l=12, h=8, regard=(0, 0), paupiere=2, cils=0, plisse=False):
        """Un œil expressif, coin haut gauche en (x, y) : blanc cerclé de noir, paupière supérieure épaisse
        (paupiere = 1 à 3 rangs ; plus elle est épaisse, plus le regard est lourd), iris vert, pupille noire et
        reflet blanc. regard = (dx, dy) décale l'iris (vers la lanterne, la gemme...). cils = -1 ou 1 : deux cils
        du côté gauche ou droit. plisse : la paupière inférieure remonte (œil rieur)."""
        m = self.ell(x, y, x + l - 1, y + h - 1)
        self.contour(m, N)
        self.a[m] = B
        cx, cy = x + l // 2 - 2 + regard[0], y + h // 2 - 2 + regard[1] + paupiere // 2
        iris = self.rect(cx, cy, cx + 3, cy + 3) & ~self.rect(cx, cy, cx, cy) & ~self.rect(cx + 3, cy, cx + 3, cy) \
            & ~self.rect(cx, cy + 3, cx, cy + 3) & ~self.rect(cx + 3, cy + 3, cx + 3, cy + 3)
        self.a[iris & m] = V
        self.a[self.rect(cx + 1, cy + 1, cx + 2, cy + 2) & m] = N
        self.point(cx + 1, cy + 1, B)
        self.a[m & (self.yy < y + paupiere)] = N
        self.a[self.bord(m, 0, -1, paupiere)] = N
        if plisse:
            self.a[self.bord(m, 0, 1, 2)] = N
        if cils:
            bx = x - 1 if cils < 0 else x + l
            self.point(bx, y + 1, N); self.point(bx - cils, y, N); self.point(bx + cils, y + 2, N)
            self.point(bx + cils, y + 1, N)
        return m

    def silhouette(self, c=N, ep=1):
        """Un liseré autour de tout le personnage (noir par défaut : il nettoie les bords tramés)."""
        m = self.a != N
        self.a[dilater(m, ep) & ~m] = c

    def image(self):
        im = Image.fromarray(self.a, 'P')
        im.putpalette(PAL)
        return im


# Une police de 3 x 5 cases pour les écrans, panneaux et étiquettes des portraits (minuscules et chiffres ;
# les majuscules sont dessinées comme les minuscules).
POLICE = {
    'a': "...|.##|#.#|#.#|.##", 'b': "#..|##.|#.#|#.#|##.", 'c': "...|.##|#..|#..|.##", 'd': "..#|.##|#.#|#.#|.##",
    'e': "...|.#.|###|#..|.##", 'f': ".##|#..|##.|#..|#..", 'g': ".##|#.#|.##|..#|##.", 'h': "#..|##.|#.#|#.#|#.#",
    'i': ".#.|...|.#.|.#.|.#.", 'j': "..#|...|..#|#.#|.#.", 'k': "#..|#.#|##.|#.#|#.#", 'l': "##.|.#.|.#.|.#.|.##",
    'm': "...|##.|###|#.#|#.#", 'n': "...|##.|#.#|#.#|#.#", 'o': "...|.#.|#.#|#.#|.#.", 'p': "...|##.|#.#|##.|#..",
    'q': "...|.##|#.#|.##|..#", 'r': "...|#.#|##.|#..|#..", 's': "...|.##|##.|..#|##.", 't': ".#.|###|.#.|.#.|..#",
    'u': "...|#.#|#.#|#.#|.##", 'v': "...|#.#|#.#|#.#|.#.", 'w': "...|#.#|#.#|###|#.#", 'x': "...|#.#|.#.|.#.|#.#",
    'y': "...|#.#|#.#|.##|##.", 'z': "...|###|.#.|#..|###",
    '0': "###|#.#|#.#|#.#|###", '1': ".#.|##.|.#.|.#.|###", '2': "##.|..#|.#.|#..|###", '3': "##.|..#|.#.|..#|##.",
    '4': "#.#|#.#|###|..#|..#", '5': "###|#..|##.|..#|##.", '6': ".##|#..|###|#.#|###", '7': "###|..#|.#.|.#.|.#.",
    '8': "###|#.#|###|#.#|###", '9': "###|#.#|###|..#|##.",
    '$': ".#.|###|#..|###|.#.", '#': "#.#|###|#.#|###|#.#", '.': "...|...|...|...|.#.", ':': "...|.#.|...|.#.|...",
    '-': "...|...|###|...|...", '/': "..#|..#|.#.|#..|#..", '>': "#..|.#.|..#|.#.|#..", '_': "...|...|...|...|###",
    '!': ".#.|.#.|.#.|...|.#.", '?': "##.|..#|.#.|...|.#.", '[': "##.|#..|#..|#..|##.", ']': ".##|..#|..#|..#|.##",
    '^': ".#.|#.#|...|...|...", '|': ".#.|.#.|.#.|.#.|.#.", '=': "...|###|...|###|...", '+': "...|.#.|###|.#.|...",
    '*': "...|#.#|.#.|#.#|...", '~': "...|.#.|#.#|...|...", ' ': "...|...|...|...|...",
}


def texte(t, x, y, s, c=B, echelle=1):
    """Écrit s avec la police 3 x 5 (une case d'espace entre les lettres), agrandie echelle fois ; renvoie la
    largeur écrite."""
    x0 = x
    for ch in s.lower():
        g = POLICE.get(ch, POLICE['?'])
        for dy, ligne in enumerate(g.split('|')):
            for dx, p in enumerate(ligne):
                if p == '#':
                    for i in range(echelle):
                        for j in range(echelle):
                            t.point(x + dx * echelle + i, y + dy * echelle + j, c)
        x += 4 * echelle
    return x - x0


def bezier(pts, pas=40):
    pts = [tuple(map(float, p)) for p in pts]
    r = []
    for i in range(pas + 1):
        t = i / pas
        q = pts[:]
        while len(q) > 1:
            q = [(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t) for a, b in zip(q, q[1:])]
        r.append(q[0])
    return r


def verifier(chemin):
    """Contrôle d'un GIF final : 416 x 404, trois couleurs au plus, celles des originaux."""
    im = Image.open(chemin)
    cols = {c for _, c in im.convert('RGB').getcolors(1 << 16)}
    ok = im.size == (416, 404) and cols <= {(0, 0, 0), (34, 177, 76), (255, 255, 255)}
    return ok, im.size, cols
