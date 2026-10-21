"""Portraits v3, lot 10 : les maîtres du temps et les habitants du chapitre 9 (la Chronothèque, Git).

Gamaliel, Bénédicte, Andrii, Irvan, Georgette, William, Marc, Kenyonn, Anthony, Guillaume, Moustapha, Jeremy,
Aurélien et Amine (les quatorze maîtres), puis Max, Paolo, Ilian, Fabien, Wisdom et Eva-Lydia (les six habitants),
sur la grille fine de 176 x 170 cases (2 x 2 pixels) avec portrait_v3.Toile : pièces de l'arrière vers l'avant,
liseré noir, lumière et ombre tramée, visages détaillés, objet de métier lisible. Méthode et règles : portrait_v3.py.

Ici, un même corps de base (grande tête, corps trapu, comme les sprites d'origine) reçoit pour chacun sa coiffure,
son vêtement, sa pose et son objet de métier, et un décor derrière lui.

Usage : python3 outils/portraits_v3_10.py [item_gamaliel.gif ...]   (sans argument : tout le lot)
"""
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from portrait_v3 import Toile, texte, N, V, B  # noqa: E402
from dessiner_lieux import finir  # noqa: E402


# ------------------------------------------------------------------ les pièces communes

def poing(t, x, y, r=6):
    """Une main blanche, ronde, avec deux traits de doigts."""
    m = t.ell(x - r, y - r, x + r, y + r)
    t.piece(m, B, ombre=0)
    t.peindre(t.trait([(x - r + 2, y - 1), (x, y - 1)]) | t.trait([(x - r + 2, y + 2), (x, y + 2)]), N)
    return m


# Les bras : (épaule, coude, main) selon la pose, pour le bras de devant (à droite) et celui du fond (à gauche).
POSES_AV = {
    'bas': [(106, 84), (114, 104), (112, 120)],
    'leve': [(106, 84), (124, 70), (128, 46)],
    'tient': [(106, 84), (118, 102), (98, 106)],
    'tend': [(106, 84), (126, 92), (144, 92)],
    'haut': [(106, 84), (120, 78), (132, 62)],
}
POSES_AR = {
    'bas': [(72, 84), (64, 104), (66, 120)],
    'leve': [(72, 84), (56, 70), (50, 46)],
    'tient': [(72, 84), (62, 102), (80, 108)],
    'tend': [(72, 84), (52, 92), (34, 92)],
    'haut': [(72, 84), (58, 78), (46, 62)],
}


def bras(t, pts, c, motif=None):
    m = t.fuseau(pts, 11, 9)
    t.piece(m, c, ombre=2)
    if motif == 'rayures':
        t.rayures(m & ~t.bord(m, -1, -1, 1), N if c == V else V, 5, 1, vertical=False)
    return m


def jambes(t, c=V, bottes=False, robe=None):
    """Les jambes et les pieds (cachés sous la robe si robe est donné)."""
    if robe is None:
        for x in (74, 92):
            j = t.poly([(x, 120), (x + 14, 120), (x + 14, 150), (x, 150)])
            t.piece(j, c, ombre=2)
            t.peindre(t.trait([(x + 7, 126), (x + 7, 148)]), N if c == V else V)
    for (x, dx) in ((70, -1), (92, 1)):
        p = t.poly([(x, 148), (x + 16, 148), (x + 18 + 4 * dx, 156), (x + 18 + 4 * dx, 160), (x - 2, 160), (x - 2, 154)])
        t.piece(p, V if not bottes else V, ombre=0)
        t.damier(p & t.rect(0, 148, 176, 152), N)
        t.peindre(t.rect(x - 2, 158, x + 18 + 4 * dx, 160), B)
        if bottes:
            t.piece(t.rect(x, 128, x + 15, 150), V, ombre=2)
            t.piece(t.rect(x - 1, 128, x + 16, 132), B, ombre=0)


def torse(t, type_, c=V, c2=B):
    """Le vêtement : tunique, robe (jusqu'aux pieds), tablier (blanc par-dessus), blouse, manteau (long, revers),
    maigre (une tunique étroite)."""
    if type_ == 'robe':
        m = t.poly([(72, 78), (108, 78), (116, 110), (124, 156), (56, 156), (64, 110)])
        t.piece(m, c, ombre=3)
        for x in (78, 90, 102):
            t.peindre(t.courbe([(x + 1, 112), (x - 2, 134), (x - 4, 154)]), N if c == V else V)
        return m
    if type_ == 'manteau':
        m = t.poly([(70, 78), (110, 78), (116, 104), (120, 140), (60, 140), (64, 104)])
        t.piece(m, c, ombre=3)
        t.peindre(t.trait([(90, 82), (90, 138)]), N)
        rev = t.poly([(74, 78), (90, 98), (106, 78), (100, 78), (90, 90), (80, 78)])
        t.peindre(rev, c2)
        for y in (104, 118):
            t.piece(t.ell(84, y - 2, 88, y + 2), c2, ombre=0)
        return m
    if type_ == 'maigre':
        m = t.poly([(76, 78), (104, 78), (108, 100), (106, 124), (74, 124), (72, 100)])
    else:
        m = t.poly([(72, 78), (108, 78), (114, 100), (112, 126), (68, 126), (66, 100)])
    t.piece(m, c, ombre=3)
    if type_ == 'tablier':
        ta = t.poly([(76, 92), (104, 92), (108, 134), (72, 134)])
        t.piece(ta, B, ombre=2)
        t.peindre(t.trait([(76, 92), (82, 80)]) | t.trait([(104, 92), (98, 80)]), B)
        t.piece(t.rect(80, 108, 100, 116), B, ombre=0)
        t.peindre(t.rect(82, 110, 98, 114) & ((t.xx % 3) == 0), N)
    elif type_ == 'blouse':
        col = t.poly([(76, 78), (90, 90), (104, 78), (100, 86), (90, 96), (80, 86)])
        t.peindre(col, B)
        for y in (98, 108, 118):
            t.piece(t.ell(88, y - 2, 92, y + 2), B, ombre=0)
    else:
        t.peindre(t.courbe([(80, 80), (90, 92), (100, 80)]), N if c == V else V)
    ceint = t.poly([(68, 116), (112, 116), (112, 121), (68, 121)])
    t.piece(ceint, V if c == B else B, ombre=0, lumiere=False)
    t.piece(t.rect(86, 115, 94, 122), B, ombre=0)
    t.peindre(t.rect(88, 117, 92, 120), N)
    return m


def visage(t, regard=(0, 0), age=0, sourire=1, sourcils=0, lunettes=False):
    """La tête : grandes oreilles, deux yeux expressifs, un nez, une bouche ; age : 1 des rides, 2 des rides et des
    pattes d'oie ; sourire : 0 sérieux, 1 sourire, 2 grand sourire ; sourcils : -1 froncés, 1 levés."""
    for x in (66, 106):
        o = t.ell(x, 40, x + 8, 54)
        t.piece(o, B, ombre=0)
        t.peindre(t.courbe([(x + 3, 43), (x + 5, 47), (x + 3, 51)]), N)
    cou = t.rect(84, 66, 96, 80)
    t.piece(cou, B, ombre=0)
    tete = t.ell(68, 20, 112, 72)
    t.piece(tete, B, ombre=0)
    t.damier(tete & t.bord(tete, 1, 0, 2) & t.rect(0, 44, 176, 66), V)
    # les sourcils
    ds = -1 if sourcils < 0 else (2 if sourcils > 0 else 0)
    t.piece(t.fuseau([(75, 36 - ds), (80, 34 - ds), (86, 35 - ds + (2 if sourcils < 0 else 0))], 2, 3), V, ombre=0)
    t.piece(t.fuseau([(94, 35 - ds + (2 if sourcils < 0 else 0)), (100, 34 - ds), (105, 36 - ds)], 3, 2), V, ombre=0)
    t.oeil(75, 38, l=11, h=8, regard=regard, cils=-1 if age == 0 else 0, plisse=sourire == 2)
    t.oeil(94, 38, l=11, h=8, regard=regard, cils=1 if age == 0 else 0, plisse=sourire == 2)
    if lunettes:
        for x in (73, 92):
            t.peindre(t.rect(x, 36, x + 14, 36) | t.rect(x, 48, x + 14, 48) | t.rect(x, 36, x, 48) | t.rect(x + 14, 36, x + 14, 48), N)
        t.peindre(t.trait([(87, 40), (92, 40)]), N)
    if age:
        for (x, s) in ((73, -1), (106, 1)):
            t.peindre(t.trait([(x, 44), (x + 3 * s, 46)]) | t.trait([(x, 47), (x + 3 * s, 48)]), N)
        t.peindre(t.courbe([(80, 28), (90, 27), (100, 28)]), V)
        if age > 1:
            t.peindre(t.courbe([(82, 31), (90, 30), (98, 31)]), V)
    t.damier(t.poly([(91, 46), (94, 53), (92, 55)]), V)
    t.peindre(t.courbe([(89, 45), (88, 51), (86, 54), (89, 56), (93, 55)], 2), N)
    if sourire == 0:
        t.peindre(t.trait([(84, 62), (97, 62)], 2), N)
    elif sourire == 1:
        t.pixels(82, 59, """
:............:
.::........::.
..::::::::::..
...:######:...
""")
    else:
        t.pixels(80, 58, """
::................::
.::::::::::::::::::.
.:oooooooooooooooo:.
..:oooooooooooooo:..
...:::########:::...
.....::::::::::.....
""")
    for (x, y) in [(76, 54), (78, 55), (77, 56), (102, 54), (104, 55), (103, 56)]:
        t.point(x, y, V)
    return tete


def cheveux(t, style, c=V):
    """Les coiffures, posées sur la tête."""
    if style in ('court', 'meche', 'rase'):
        cal = t.ell(66, 14, 114, 48) & t.rect(0, 0, 176, 31)
        t.piece(cal, c, ombre=2 if style != 'rase' else 0)
        if style == 'rase':
            t.damier(cal, N)
        for x in (68, 108):
            t.piece(t.rect(x, 26, x + 4, 40), c, ombre=0, lumiere=False)
        if style == 'meche':
            t.piece(t.fuseau([(98, 18), (88, 26), (78, 34)], 9, 2), c, ombre=0)
            t.peindre(t.courbe([(96, 20), (86, 28), (80, 32)]), N)
        elif style == 'court':
            for x in (74, 82, 90, 98):
                t.peindre(t.courbe([(x + 4, 18), (x + 2, 24), (x, 30)]), N)
    elif style == 'boucles':
        for (x, y, r) in [(70, 26, 7), (78, 18, 8), (90, 14, 8), (102, 18, 8), (110, 26, 7), (66, 36, 6), (114, 36, 6),
                          (84, 22, 6), (96, 22, 6)]:
            m = t.ell(x - r, y - r, x + r, y + r)
            t.piece(m, c, ombre=2)
            t.peindre(t.courbe([(x - 2, y - 2), (x + 2, y), (x, y + 3)]), N)
    elif style == 'long':
        dos = t.poly([(64, 26), (116, 26), (120, 76), (112, 84), (68, 84), (60, 76)])
        t.piece(dos, c, ombre=3)
        for x in (66, 112):
            t.peindre(t.courbe([(x, 34), (x - 1, 56), (x + 1, 78)]), N)
    elif style == 'chignon':
        cal = t.ell(66, 16, 114, 46) & t.rect(0, 0, 176, 32)
        t.piece(cal, c, ombre=2)
        t.piece(t.ell(80, 0, 100, 18), c, ombre=2)
        t.peindre(t.courbe([(84, 6), (90, 10), (96, 6)]), N)
        t.peindre(t.courbe([(74, 24), (86, 20), (98, 22), (108, 28)]), N)
    elif style == 'tresses':
        cal = t.ell(66, 14, 114, 46) & t.rect(0, 0, 176, 32)
        t.piece(cal, c, ombre=2)
        for x in (64, 108):
            tr = t.fuseau([(x + 4, 34), (x + 2, 60), (x + 4, 92)], 8, 5)
            t.piece(tr, c, ombre=0)
            for y in range(40, 92, 6):
                t.peindre(t.trait([(x, y), (x + 8, y + 3)]), N)
        for x in range(72, 110, 6):
            t.peindre(t.trait([(x, 18), (x - 2, 30)]), N)
    elif style == 'chauve':
        for x in (66, 108):
            t.piece(t.ell(x, 26, x + 6, 40), c, ombre=0, lumiere=False)
        t.point(80, 24, V); t.point(82, 23, V)
    elif style == 'capuche':
        cap = t.poly([(60, 64), (62, 26), (76, 8), (104, 8), (118, 26), (120, 64), (112, 70), (112, 30), (100, 18), (80, 18), (68, 30), (68, 70)])
        t.piece(cap, c, ombre=3)
        t.peindre(t.courbe([(70, 30), (80, 16), (100, 16), (110, 30)]), B)
    elif style == 'casque':
        cal = t.ell(64, 10, 116, 46) & t.rect(0, 0, 176, 30)
        t.piece(cal, B, ombre=2)
        t.piece(t.rect(62, 28, 118, 32), B, ombre=0)
        lampe = t.ell(84, 12, 96, 24)
        t.piece(lampe, V, ombre=0)
        t.piece(t.ell(87, 15, 93, 21), B, ombre=0)
        for (x0, y0, x1, y1) in [(90, 10, 90, 2), (82, 14, 76, 8), (98, 14, 104, 8)]:
            t.peindre(t.trait([(x0, y0), (x1, y1)]), B)
    elif style == 'chapeau':
        cal = t.ell(66, 16, 114, 46) & t.rect(0, 0, 176, 32)
        t.piece(cal, c, ombre=2)
        bord = t.ell(56, 18, 124, 30)
        t.piece(bord, V, ombre=0)
        cal2 = t.poly([(72, 22), (76, 2), (104, 2), (108, 22)])
        t.piece(cal2, V, ombre=2)
        t.piece(t.rect(74, 14, 106, 18), B, ombre=0)


def barbe(t, c=V, longue=False):
    m = t.poly([(72, 52), (80, 64), (90, 68), (100, 64), (108, 52), (110, 62), (100, 80 if longue else 74), (90, 84 if longue else 76), (80, 80 if longue else 74), (70, 62)])
    t.piece(m, c, ombre=2)
    t.damier(m & t.bord(m, 0, 1, 3), N if c == V else V)
    t.pixels(84, 60, """
.::::::::::.
:##########:
""" if c == V else """
.::::::::::.
:oooooooooo:
""")


def figure(t, coiffure='court', vetement='tunique', c=V, pose_av='bas', pose_ar='bas', regard=(0, 0), age=0, sourire=1,
           sourcils=0, lunettes=False, bottes=False, barbe_=None, manche=None, avant_tete=None, apres=None, mains=True):
    """Le corps entier ; avant_tete(t) se peint après le torse et avant la tête ; apres(t, main_av, main_ar) à la fin."""
    robe = vetement == 'robe'
    if coiffure in ('long', 'tresses'):
        pass
    jambes(t, V if c == B else B if vetement == 'blouse' else V, bottes, robe=True if robe else None)
    pa, pr = POSES_AR[pose_ar], POSES_AV[pose_av]
    cm = c if manche is None else manche
    bras(t, pa, cm)
    if coiffure == 'long':
        cheveux(t, 'long')
    torse(t, vetement, c)
    if avant_tete:
        avant_tete(t)
    visage(t, regard, age, sourire, sourcils, lunettes)
    if barbe_:
        barbe(t, barbe_[0], barbe_[1])
    if coiffure not in ('long',):
        cheveux(t, coiffure)
    else:
        cal = t.ell(66, 14, 114, 46) & t.rect(0, 0, 176, 30)
        t.piece(cal, V, ombre=2)
        t.peindre(t.courbe([(70, 30), (84, 20), (100, 22), (110, 30)]), N)
    bras(t, pr, cm)
    ma = poing(t, *pr[2]) if mains else None
    mr = poing(t, *pa[2]) if mains else None
    if apres:
        apres(t, pr[2], pa[2])
    return t


# ------------------------------------------------------------------ les décors et les objets

def etabli(t, x0, x1, y):
    m = t.rect(x0, y, x1, y + 6)
    t.piece(m, B, ombre=0)
    for x in (x0 + 2, x1 - 6):
        t.piece(t.rect(x, y + 6, x + 4, 158), V, ombre=0)


def cierge_t(t, x, y, h=16):
    t.piece(t.rect(x - 2, y - h, x + 2, y), B, ombre=0)
    fl = t.poly([(x, y - h - 8), (x + 3, y - h - 2), (x, y - h), (x - 3, y - h - 2)])
    t.piece(fl, V, ombre=0)
    t.point(x, y - h - 3, B)


def rune_t(t, x, y, k, c=B, s=2):
    RUNES = ["#.#|.#.|#.#", "###|#..|###", ".#.|###|.#.", "#..|###|..#", "##.|.#.|.##", "#.#|###|#.#", "..#|.#.|#..", "###|.#.|.#."]
    for dy, ligne in enumerate(RUNES[k % 8].split('|')):
        for dx, p in enumerate(ligne):
            if p == '#':
                t.peindre(t.rect(x + dx * s, y + dy * s, x + dx * s + s - 1, y + dy * s + s - 1), c)


def sceau_t(t, x, y, r=6, c=V):
    m = t.ell(x - r, y - r, x + r, y + r)
    t.piece(m, c, ombre=0)
    t.peindre(t.poly([(x - 3, y - 3), (x + 3, y - 3), (x, y)]) | t.poly([(x - 3, y + 3), (x + 3, y + 3), (x, y)]), N)


def etincelles(t, pts):
    for (x, y) in pts:
        t.etincelle(x, y)


# ------------------------------------------------------------------ les quatorze maîtres

def gamaliel():
    """Le vieil artisan des sceaux : barbe blanche, tablier taché de cire, un sceau levé, la cire qui fume derrière."""
    t = Toile()
    etabli(t, 120, 172, 112)
    cierge_t(t, 160, 112, 18)
    t.piece(t.rect(128, 104, 148, 112), V, ombre=0)
    for x in (130, 138, 146):
        sceau_t(t, x + 2, 100, 4, B)

    def taches(t):
        for (x, y) in [(80, 98), (96, 104), (86, 122), (100, 126)]:
            t.peindre(t.ell(x - 2, y - 2, x + 2, y + 2), V)

    def apres(t, av, ar):
        h = t.rect(av[0] - 2, av[1] - 22, av[0] + 2, av[1] - 6)
        t.piece(h, V, ombre=0)
        sceau_t(t, av[0], av[1] - 26, 7, B)
        for (x, y) in [(av[0] - 4, av[1] - 2), (av[0] + 3, av[1] + 3), (ar[0] - 2, ar[1] + 2)]:
            t.peindre(t.ell(x - 1, y - 1, x + 1, y + 1), V)
        etincelles(t, [(av[0] + 14, av[1] - 34), (av[0] - 12, av[1] - 38)])
    figure(t, 'chauve', 'tablier', V, pose_av='leve', pose_ar='bas', regard=(2, -2), age=2, sourire=1, barbe_=(B, True),
           avant_tete=taches, apres=apres)
    t.sol(161)
    return t.image()


def benedicte():
    """La gardienne de l'autel : chignon, tablier blanc, un cierge allumé dans la main, d'autres derrière elle."""
    t = Toile()
    for k, x in enumerate((14, 28, 150, 164)):
        cierge_t(t, x, 120 - (k % 2) * 10, 22)
    t.piece(t.rect(4, 120, 40, 126), B, ombre=0); t.piece(t.rect(140, 120, 174, 126), B, ombre=0)

    def apres(t, av, ar):
        cierge_t(t, av[0], av[1] - 4, 22)
    figure(t, 'chignon', 'tablier', V, pose_av='tient', pose_ar='bas', regard=(1, 0), sourire=1, avant_tete=None, apres=apres)
    t.sol(161)
    return t.image()


def andrii():
    """Le gardien de la crypte : lunettes rondes, dans la pénombre, un doigt posé sur une grande rune qui s'allume."""
    t = Toile()
    dalle = t.rect(120, 30, 172, 150)
    t.piece(dalle, V, ombre=3)
    t.trame(dalle, N, 0.4)
    for k in range(5):
        rune_t(t, 128 + (k % 2) * 18, 40 + k * 20, k + 1, B, 3)

    def apres(t, av, ar):
        t.etincelle(av[0] + 8, av[1] - 2)
    figure(t, 'court', 'tunique', V, pose_av='tend', pose_ar='bas', regard=(3, 0), sourire=0, sourcils=1, lunettes=True, apres=apres)
    t.trame(t.rect(0, 0, 60, 170), N, 0.35)
    t.sol(161)
    return t.image()


def irvan():
    """L'Oracle : capuche, une vasque d'eau noire tenue à deux mains, des lettres qui en remontent."""
    t = Toile()

    def apres(t, av, ar):
        v = t.ell(64, 96, 116, 116)
        t.piece(v, B, ombre=0)
        t.piece(t.ell(68, 98, 112, 110), N, bord=None, ombre=0)
        for k, (x, y) in enumerate([(78, 84), (96, 80), (86, 90), (126, 70), (40, 64), (134, 40), (30, 34)]):
            rune_t(t, x, y, k + 2, B, 2)
        poing(t, 66, 108); poing(t, 114, 108)
    figure(t, 'capuche', 'robe', V, pose_av='tient', pose_ar='tient', regard=(0, 2), sourire=0, sourcils=-1, mains=False, apres=apres)
    t.sol(161)
    return t.image()


def georgette():
    """La maîtresse des contre-sorts : boucles, blouse verte, une fiole levée à la lumière, une étagère derrière."""
    t = Toile()
    t.piece(t.rect(4, 60, 44, 64), B, ombre=0)
    t.piece(t.rect(4, 100, 44, 104), B, ombre=0)
    for k in range(4):
        for y in (60, 100):
            x = 8 + k * 9
            f = t.rect(x, y - 12, x + 5, y - 1)
            t.piece(f, V if (k + y) % 2 else B, ombre=0)

    def apres(t, av, ar):
        f = t.poly([(av[0] - 5, av[1] - 30), (av[0] + 5, av[1] - 30), (av[0] + 8, av[1] - 10), (av[0] - 8, av[1] - 10)])
        t.piece(f, B, ombre=0)
        t.peindre(t.poly([(av[0] - 6, av[1] - 18), (av[0] + 6, av[1] - 18), (av[0] + 7, av[1] - 11), (av[0] - 7, av[1] - 11)]), V)
        t.piece(t.rect(av[0] - 3, av[1] - 36, av[0] + 3, av[1] - 30), V, ombre=0)
        etincelles(t, [(av[0] + 14, av[1] - 30)])
    figure(t, 'boucles', 'blouse', V, pose_av='leve', pose_ar='bas', regard=(2, -2), sourire=1, sourcils=1, apres=apres)
    t.sol(161)
    return t.image()


def william():
    """Le gardien du Livre des Ombres : maigre, cheveux longs, une bougie à la main, un livre serré sous le bras."""
    t = Toile()
    t.trame(t.rect(0, 0, 176, 170), V, 0.08)

    def avant(t):
        l = t.poly([(54, 96), (76, 92), (78, 116), (56, 120)])
        t.piece(l, V, ombre=2)
        t.peindre(t.trait([(58, 98), (60, 118)]), B)

    def apres(t, av, ar):
        cierge_t(t, av[0], av[1] - 4, 16)
    figure(t, 'long', 'maigre', V, pose_av='tient', pose_ar='tient', regard=(1, 1), age=1, sourire=0, avant_tete=avant, apres=apres)
    t.sol(161)
    return t.image()


def marc():
    """Le maître des lignes du destin : bras écartés, des fils d'or tendus entre ses doigts, qui se séparent et se
    rejoignent."""
    t = Toile()
    for pts in ([(34, 92), (70, 60), (110, 120), (144, 92)], [(34, 92), (80, 130), (110, 60), (144, 92)],
                [(34, 92), (60, 40), (130, 40), (144, 92)]):
        t.peindre(t.courbe(pts, 2), V)
        t.peindre(t.courbe(pts, 1), B)
    for (x, y) in ((88, 96), (72, 70), (104, 72)):
        t.piece(t.ell(x - 3, y - 3, x + 3, y + 3), B, ombre=0)
    figure(t, 'meche', 'tunique', V, pose_av='tend', pose_ar='tend', regard=(0, -2), sourire=2)
    t.etoile(20, 20, B, 2); t.etoile(156, 30, B, 2); t.etoile(40, 150, B, 1)
    t.sol(161)
    return t.image()


def kenyonn():
    """Le jeune maître des paradoxes : sur une marche d'escalier, un autre escalier à l'envers au-dessus de sa tête,
    la main levée en salut."""
    t = Toile()
    for k in range(5):
        x = 4 + k * 12
        t.piece(t.rect(x, 130 - k * 10, x + 12, 170), V if k % 2 else B, ombre=0)
    for k in range(5):
        x = 172 - (k + 1) * 12
        t.piece(t.rect(x, 0, x + 12, 10 + k * 10), V if k % 2 else B, ombre=0)
    figure(t, 'tresses', 'tunique', B, pose_av='leve', pose_ar='bas', regard=(2, -2), sourire=2, manche=B)
    t.sol(161)
    return t.image()


def anthony():
    """Le voyageur : chapeau, manteau de voyage, la besace à la hanche, une lanterne à la main."""
    t = Toile()
    t.peindre(t.rect(130, 150, 170, 151), B)

    def avant(t):
        t.peindre(t.trait([(76, 80), (108, 118)], 3), B)
        bes = t.poly([(98, 112), (124, 110), (126, 136), (100, 138)])
        t.piece(bes, V, ombre=2)
        t.piece(t.poly([(98, 112), (124, 110), (122, 120), (100, 122)]), B, ombre=0)
        t.piece(t.ell(108, 118, 114, 124), V, ombre=0)

    def apres(t, av, ar):
        x, y = ar
        t.peindre(t.trait([(x, y + 4), (x, y + 10)]), B)
        lan = t.rect(x - 6, y + 10, x + 6, y + 26)
        t.piece(lan, B, ombre=0)
        t.piece(t.rect(x - 4, y + 12, x + 4, y + 24), V, ombre=0)
        t.point(x, y + 18, B)
    figure(t, 'chapeau', 'manteau', V, pose_av='bas', pose_ar='bas', regard=(-1, 0), sourire=1, bottes=True, avant_tete=avant, apres=apres)
    t.sol(161)
    return t.image()


def guillaume():
    """Le réécrivain des prophéties : une plume levée qui file, un parchemin raturé dans l'autre main."""
    t = Toile()

    def apres(t, av, ar):
        p = t.fuseau([(av[0], av[1]), (av[0] + 10, av[1] - 16), (av[0] + 18, av[1] - 36)], 2, 8)
        t.piece(p, B, ombre=0)
        for k in range(4):
            t.peindre(t.trait([(av[0] + 6 + k * 3, av[1] - 12 - k * 6), (av[0] + 12 + k * 3, av[1] - 14 - k * 6)]), N)
        for (x0, y0) in [(av[0] + 24, av[1] - 30), (av[0] + 28, av[1] - 20)]:
            t.peindre(t.trait([(x0, y0), (x0 + 8, y0)]), B)
        x, y = ar
        par = t.poly([(x - 18, y - 30), (x + 8, y - 34), (x + 10, y + 2), (x - 16, y + 6)])
        t.piece(par, B, ombre=2)
        for k in range(5):
            yy = y - 26 + k * 6
            t.peindre(t.trait([(x - 14, yy), (x + 4, yy - 2)]), N if k != 2 else V)
        t.peindre(t.trait([(x - 14, y - 15), (x + 4, y - 18)]), N)
        poing(t, x, y)
    figure(t, 'meche', 'tunique', B, pose_av='haut', pose_ar='tient', regard=(-2, 1), sourire=1, sourcils=-1, manche=B, apres=apres)
    t.sol(161)
    return t.image()


def moustapha():
    """Le maître des cartes : barbe courte, un compas ouvert tendu, une carte roulée sous le bras."""
    t = Toile()

    def avant(t):
        r = t.fuseau([(50, 98), (80, 92)], 10, 10)
        t.piece(r, B, ombre=2)
        t.peindre(t.ell(46, 93, 54, 103), V)

    def apres(t, av, ar):
        x, y = av
        t.peindre(t.trait([(x + 2, y - 4), (x + 22, y - 26)], 2) | t.trait([(x + 2, y - 4), (x + 28, y + 2)], 2), B)
        t.piece(t.ell(x - 2, y - 8, x + 6, y), B, ombre=0)
    figure(t, 'court', 'tunique', V, pose_av='tend', pose_ar='tient', regard=(3, 0), sourire=1, barbe_=(V, False), avant_tete=avant, apres=apres)
    t.sol(161)
    return t.image()


def jeremy():
    """Le messager des Royaumes : une cape qui vole, une brassée de rouleaux scellés contre la poitrine."""
    t = Toile()
    cape = t.fuseau([(80, 80), (52, 92), (24, 118), (10, 140)], 30, 10)
    t.piece(cape, V, ombre=4, lumiere=False)
    t.damier(cape & t.rect(0, 120, 60, 170), N)

    def apres(t, av, ar):
        for k in range(4):
            r = t.fuseau([(80 + k * 6, 96 + k), (106 + k * 2, 88 - k * 3)], 7, 7)
            t.piece(r, B, ombre=0)
            sceau_t(t, 92 + k * 4, 92 - k, 3, V)
        poing(t, *av)
    figure(t, 'boucles', 'tunique', B, pose_av='tient', pose_ar='bas', regard=(2, 0), sourire=2, manche=B, bottes=True, apres=apres)
    t.sol(161)
    return t.image()


def aurelien():
    """Le graveur des runes de garde : un poinçon d'argent levé, des runes qui brûlent sur le seuil à ses pieds."""
    t = Toile()
    for k in range(6):
        x = 10 + k * 28
        if 60 < x < 120:
            continue
        rune_t(t, x, 140, k, V, 3)
        fl = t.poly([(x + 4, 120), (x + 8, 132), (x + 4, 138), (x, 132)])
        t.piece(fl, B, ombre=0)

    def apres(t, av, ar):
        p = t.trait([(av[0], av[1]), (av[0] + 10, av[1] - 26)], 3)
        t.piece(p, B, ombre=0)
        t.etincelle(av[0] + 12, av[1] - 30)
    figure(t, 'rase', 'tunique', V, pose_av='leve', pose_ar='bas', regard=(2, -2), sourire=0, sourcils=-1, apres=apres)
    t.sol(161)
    return t.image()


def amine():
    """Le conseiller du Haut-Conseil : la longue robe et l'étole claire, un rouleau de requête tenu à deux mains ;
    derrière, l'épaule d'un golem de bronze."""
    t = Toile()
    g = t.rect(128, 40, 172, 140)
    t.piece(g, V, ombre=3)
    t.piece(t.rect(140, 18, 166, 40), V, ombre=2)
    t.peindre(t.rect(146, 26, 150, 30) | t.rect(156, 26, 160, 30), B)
    for y in (70, 100):
        t.peindre(t.rect(128, y, 172, y), N)

    def avant(t):
        et = t.poly([(80, 78), (86, 78), (84, 156), (76, 156)]) | t.poly([(94, 78), (100, 78), (104, 156), (96, 156)])
        t.piece(et, B, ombre=0)

    def apres(t, av, ar):
        r = t.fuseau([(76, 106), (104, 104)], 9, 9)
        t.piece(r, B, ombre=0)
        sceau_t(t, 90, 106, 4, V)
        poing(t, 76, 108); poing(t, 104, 106)
    figure(t, 'court', 'robe', V, pose_av='tient', pose_ar='tient', regard=(0, 0), sourire=1, mains=False, avant_tete=avant, apres=apres)
    t.sol(161)
    return t.image()


# ------------------------------------------------------------------ les six habitants

def max_():
    """L'homme aux deux établis : tablier, un maillet à la main, un établi de chaque côté."""
    t = Toile()
    etabli(t, 2, 50, 110)
    etabli(t, 126, 174, 104)
    for x in (10, 30, 136, 156):
        t.piece(t.rect(x, 96 if x < 60 else 90, x + 10, 110 if x < 60 else 104), B, ombre=0)

    def apres(t, av, ar):
        t.peindre(t.trait([(av[0], av[1]), (av[0] + 12, av[1] - 18)], 3), B)
        t.piece(t.rect(av[0] + 6, av[1] - 30, av[0] + 22, av[1] - 20), V, ombre=0)
    figure(t, 'meche', 'tablier', V, pose_av='leve', pose_ar='bas', regard=(1, 0), sourire=2, apres=apres)
    t.sol(161)
    return t.image()


def paolo():
    """L'archéologue : un pinceau levé, une dalle gravée à ses pieds, à moitié dégagée."""
    t = Toile()
    d = t.poly([(110, 140), (170, 136), (172, 158), (112, 160)])
    t.piece(d, B, ombre=2)
    for k in range(4):
        rune_t(t, 118 + k * 13, 144, k + 4, N, 2)

    def apres(t, av, ar):
        t.peindre(t.trait([(av[0], av[1]), (av[0] + 8, av[1] - 18)], 2), B)
        t.piece(t.poly([(av[0] + 6, av[1] - 18), (av[0] + 12, av[1] - 18), (av[0] + 12, av[1] - 28), (av[0] + 6, av[1] - 28)]), V, ombre=0)
    figure(t, 'chapeau', 'tunique', B, pose_av='leve', pose_ar='bas', regard=(2, 2), sourire=1, manche=B, bottes=True, apres=apres)
    t.sol(161)
    return t.image()


def ilian():
    """Le balayeur du Livre des Ombres : un grand balai tenu en travers, un sourire tranquille."""
    t = Toile()

    def apres(t, av, ar):
        t.peindre(t.trait([(132, 40), (60, 150)], 3), B)
        bal = t.poly([(52, 148), (70, 150), (66, 166), (40, 162)])
        t.piece(bal, V, ombre=0)
        for k in range(5):
            t.peindre(t.trait([(46 + k * 5, 152), (42 + k * 5, 164)]), N)
        poing(t, *av); poing(t, *ar)
    figure(t, 'boucles', 'tunique', V, pose_av='tient', pose_ar='tient', regard=(-1, 1), sourire=1, mains=False, apres=apres)
    t.sol(161)
    return t.image()


def fabien():
    """Le messager à pied : bottes de route, sacoche en bandoulière, un bâton de marche."""
    t = Toile()
    t.peindre(t.courbe([(120, 160), (150, 150), (174, 152)]), B)

    def avant(t):
        t.peindre(t.trait([(104, 80), (72, 116)], 3), B)
        s = t.poly([(58, 108), (80, 108), (80, 128), (58, 128)])
        t.piece(s, V, ombre=2)
        t.piece(t.poly([(58, 108), (80, 108), (78, 116), (60, 116)]), B, ombre=0)

    def apres(t, av, ar):
        t.peindre(t.trait([(av[0] + 4, av[1] - 30), (av[0] + 10, 160)], 3), B)
        poing(t, *av)
    figure(t, 'court', 'tunique', V, pose_av='tend', pose_ar='bas', regard=(3, 0), sourire=1, bottes=True, avant_tete=avant, apres=apres)
    t.sol(161)
    return t.image()


def wisdom():
    """L'emballeuse : un paquet de papier kraft ficelé tenu à deux mains, une bobine de ficelle à ses pieds."""
    t = Toile()
    b = t.ell(130, 140, 150, 156)
    t.piece(b, B, ombre=0)
    t.peindre(t.ell(136, 145, 144, 151), V)

    def apres(t, av, ar):
        p = t.rect(70, 92, 110, 120)
        t.piece(p, V, ombre=2)
        t.peindre(t.rect(88, 92, 91, 120) | t.rect(70, 104, 110, 107), B)
        t.piece(t.ell(84, 86, 96, 96), B, ombre=0)
        poing(t, 68, 110); poing(t, 112, 110)
    figure(t, 'tresses', 'tunique', B, pose_av='tient', pose_ar='tient', regard=(0, 1), sourire=2, manche=B, mains=False, apres=apres)
    t.sol(161)
    return t.image()


def eva_lydia():
    """La gardienne du vieux coffre : un casque de mineur à lampe, un coffre de fer à ses pieds, la main sur le
    couvercle."""
    t = Toile()
    c = t.rect(120, 118, 170, 156)
    t.piece(c, V, ombre=3)
    t.piece(t.rect(118, 112, 172, 120), B, ombre=0)
    t.piece(t.rect(140, 126, 150, 136), B, ombre=0)
    t.peindre(t.rect(144, 129, 146, 133), N)
    for (x0, y0, x1, y1) in [(90, 6, 90, -4), (100, 10, 112, 2), (80, 10, 68, 2)]:
        pass

    def apres(t, av, ar):
        poing(t, *av)
    figure(t, 'casque', 'tunique', V, pose_av='tend', pose_ar='bas', regard=(3, 2), sourire=1, sourcils=1, apres=apres)
    t.sol(161)
    return t.image()


PORTRAITS = {
    "item_gamaliel.gif": gamaliel, "item_benedicte.gif": benedicte, "item_andrii.gif": andrii, "item_irvan.gif": irvan,
    "item_georgette.gif": georgette, "item_william.gif": william, "item_marc.gif": marc, "item_kenyonn.gif": kenyonn,
    "item_anthony.gif": anthony, "item_guillaume.gif": guillaume, "item_moustapha.gif": moustapha, "item_jeremy.gif": jeremy,
    "item_aurelien.gif": aurelien, "item_amine.gif": amine,
    "item_max.gif": max_, "item_paolo.gif": paolo, "item_ilian.gif": ilian, "item_fabien.gif": fabien,
    "item_wisdom.gif": wisdom, "item_eva_lydia.gif": eva_lydia,
}

if __name__ == "__main__":
    noms = sys.argv[1:] or list(PORTRAITS)
    for nom in noms:
        if nom in PORTRAITS:
            finir(nom, PORTRAITS[nom]())
    print(len(noms), "portraits")
