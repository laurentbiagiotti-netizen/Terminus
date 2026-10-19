"""Dessine les lieux du chapitre de la panne réseau, dans le même style que dessiner_lieux.py (1 bit : noir, vert, blanc)."""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from dessiner_lieux import *  # noqa: F401,F403
from dessiner_lieux import _palimg, cadre
from PIL import Image, ImageDraw


# --- le bâtiment B : le comptoir de l'accueil, le poste, l'armoire réseau aux voyants allumés ---
def batimentb():
    im, d = toile()
    d.rectangle([8, 10, 168, 24], fill=B); texte_centre(d, 13, "BATIMENT B", N)
    # l'armoire réseau, porte ouverte
    boite(d, 110, 32, 166, 148, B, N, 2)
    for r in range(6):
        y = 40 + r*17
        boite(d, 116, y, 160, y+11, B, N, 1)
        for k in range(8):
            d.rectangle([119 + k*5, y+4, 121 + k*5, y+6], fill=V if (r + k) % 3 == 0 else B)
    # des câbles qui pendent
    for k, x in enumerate([124, 134, 146]):
        d.arc([x-10, 128, x+10, 156], 0, 180, fill=V if k == 1 else B)
    # le comptoir et le poste
    d.rectangle([8, 104, 96, 110], fill=B); d.rectangle([12, 110, 92, 148], outline=B)
    for y in range(116, 146, 8): d.line([(16, y), (88, y)], fill=B)
    ecran(d, 26, 70, 40, 30, 'invite')
    clavier(d, 30, 98, 30)
    # Radia, assise par terre devant l'armoire, son portable sur les genoux
    d.ellipse([92, 112, 102, 122], outline=B)
    d.line([(97, 122), (97, 136)], fill=B); d.line([(97, 136), (88, 144)], fill=B); d.line([(97, 136), (108, 140)], fill=B)
    d.rectangle([100, 128, 110, 134], fill=V)
    sol(d, 152)
    return im


# --- le poste de l'accueil : son écran dit tout (eth0 DOWN, et l'horloge en 2001) ---
def posteb():
    im, d = toile()
    boite(d, 18, 12, 158, 112, B, N, 3)
    boite(d, 26, 20, 150, 104, B, N, 1)
    d.text((32, 26), "$ ip link", fill=V)
    d.text((32, 38), "eth0: DOWN", fill=B)
    d.text((32, 52), "$ date", fill=V)
    d.text((32, 64), "1 janv. 2001", fill=B)
    d.text((32, 80), "$ _", fill=V)
    d.polygon([(158, 16), (166, 22), (166, 110), (158, 112)], fill=B)
    d.rectangle([80, 112, 96, 120], fill=B); d.rectangle([62, 120, 114, 124], fill=B)
    # l'étiquette jaunie collée sous l'écran
    d.rectangle([110, 104, 146, 110], fill=V)
    clavier(d, 40, 132, 90)
    # le câble, bien branché
    d.line([(158, 100), (170, 130), (172, 160)], fill=V, width=2)
    sol(d, 154)
    return im


# --- le routeur : un boîtier, deux réseaux, des voyants et un cahier ---
def routeur():
    im, d = toile()
    texte_centre(d, 10, "10.0.93.0/24", B)
    texte_centre(d, 148, "10.0.92.0/24", B)
    boite(d, 24, 64, 152, 104, B, N, 2)
    d.text((32, 70), "routeur", fill=B)
    for k in range(8):
        x = 36 + k*14
        boite(d, x, 86, x+10, 98, B, N, 1)
        d.rectangle([x+3, 82, x+6, 84], fill=V if k in (0, 2, 3, 6) else B)
    # en haut, le bâtiment B ; en bas, le cœur du réseau
    for x in [44, 88, 132]:
        d.line([(x, 22), (x, 64)], fill=V if x == 88 else B, width=2)
    for x in [58, 118]:
        d.line([(x, 104), (x, 144)], fill=B, width=2)
    # le cahier posé sur le dessus
    d.polygon([(110, 56), (148, 56), (144, 64), (106, 64)], fill=B)
    d.line([(114, 59), (140, 59)], fill=N)
    return im


# --- l'intranet : un serveur, et la page qu'il affiche au lieu du planning ---
def intranet():
    im, d = toile()
    boite(d, 10, 12, 116, 112, B, N, 2)
    d.rectangle([12, 14, 114, 24], fill=B)
    for k in range(3): d.ellipse([15+k*7, 16, 19+k*7, 20], fill=N)
    d.text((42, 15), "intranet", fill=N)
    d.text((22, 34), "It works!", fill=V)
    for k in range(4): d.line([(22, 56+k*10), (104-(k*13) % 30, 56+k*10)], fill=B)
    # la tour du serveur
    boite(d, 128, 30, 166, 150, B, N, 2)
    for r in range(5):
        y = 38 + r*14
        d.line([(134, y), (160, y)], fill=B)
        d.rectangle([156, y+3, 158, y+5], fill=V if r != 2 else B)
    d.ellipse([140, 120, 154, 134], outline=B)
    table(d, 4, 120, 118)
    sol(d, 152)
    return im


# --- Les personnages, dans le style de ceux d'origine : gros pixels (un pixel = 4 points à l'écran),
#     tête carrée, yeux carrés à pupille noire, sol en tirets sous les pieds ---
GRILLE = 88, 85

def perso(nom, dessin):
    im = Image.new('P', GRILLE, N); im.putpalette(PAL); d = ImageDraw.Draw(im)
    def r(x0, y0, x1, y1, c): d.rectangle([x0, y0, x1, y1], fill=c)
    dessin(r)
    grand = im.resize((GRILLE[0] * 4, GRILLE[1] * 4), Image.NEAREST).convert('RGB')
    fond = cadre(); fond.paste(grand, (32, 32))
    fond.quantize(palette=_palimg(), dither=Image.Dither.NONE).save(OUT + nom)

def yeux(r, x1, x2, y):
    for x in (x1, x2):
        r(x, y, x + 5, y + 4, N); r(x + 1, y + 1, x + 4, y + 3, B); r(x + 2, y + 2, x + 3, y + 3, N)

def sol_tirets(r, y):
    for (x0, x1, dy) in [(20, 30, 0), (33, 56, 0), (59, 67, 0), (26, 40, 2), (44, 52, 2), (38, 43, 4)]:
        r(x0, y + dy, x1, y + dy, B)

def pixels(r, x0, y0, dessin):
    """Un dessin au pixel près, ligne par ligne : '#' vert, 'o' blanc, ':' noir (pour creuser) ; tout autre caractère
    laisse voir ce qu'il y a dessous. C'est la façon de dessiner des personnages d'origine : un trait à la main, pas des boîtes."""
    for dy, ligne in enumerate(dessin.strip('\n').split('\n')):
        for dx, c in enumerate(ligne):
            col = {'#': V, 'o': B, ':': N}.get(c)
            if col is not None:
                r(x0 + dx, y0 + dy, x0 + dx, y0 + dy, col)

def sol_traits(r, y, cx=44, l=28):
    """Le sol des sprites d'origine : de longs traits blancs à hauteur des pieds, d'autres plus courts dessous."""
    r(cx - l, y, cx - l + 11, y, B); r(cx + l - 10, y, cx + l, y, B)
    r(cx - l + 6, y + 2, cx + 6, y + 2, B); r(cx + 10, y + 2, cx + 17, y + 2, B)
    r(cx - 9, y + 4, cx - 2, y + 4, B); r(cx + 3, y + 4, cx + 8, y + 4, B)

def radia_dessin(r):
    # Radia, M1 réseau : une crinière bouclée, un casque autour du cou, son portable ouvert sur l'avant-bras ; elle brandit la prise RJ45 du câble qu'elle vient de retrouver.
    pixels(r, 16, 10, r"""
....................................ooo
....................................o:o
....................................ooo
...............#.##.#.#.............###
............#.#########.#.#........#o#o#
..........#################.#.......ooo##.#.#
.........####.########.#######.....ooooo...#.#
........######.#############.##....ooooo....#.#
.......######oooooooooooooo#####...oooo.....#.#
.......####ooooooooooooooooooo####.oooo......#.#
......#####oooooooooooooooooooo###.####......#.#
.....######oo####ooooooo####ooo####.####......#.#
......####ooooooooooooooooooooo###..####......#.#
.....#####oooooooooooooooooooooo###..####.....#.#
......####ooo:::ooooooo:::oooooo##...####......#.#
.....#####ooo:o:ooooooo:o:ooooooo###..####.....#.#
......####ooo:::ooooooo:::ooooooo##...####......#.#
.....######oooooooooooooooo:oooooo###..####.....#.#
......####ooooooooooooooooo:ooooooo##...####.....#.#
.....####oooooooooooooooo:::oooooo##....####......#.#
......###oooooo::::::::::::ooooooo##....####......#.#
.....####ooooooo:oooooooo:ooooooo###...####........#.#
......##.oooooooo::::::::ooooooo.##....####........#.#
.......#...oooooooooooooooooooo..#.....####.........#.#
..............oooooooooooooo..........####.........#.#
.........oo:.....oooooo.....:oo......####.........#.#
........o###o:.:::oooo:::.:o###o....####.........#.#
........o###o###.:o..o:.##o###o#..####..........#.#
.........ooo####.::oo::.##.ooo###.####...........#.#
...........######..##..########.####............#.#
..........#######.####.###########.#.............#.#
.........####.###.####.####.#####................#.#
........####..####.##.#####.####.................#.#
......#####...################..................#.#
....oooooooooooooo.#############................#.#
....o##########o##.##############................#.#
....o#ooo#o#oo#o##.#############..................#.#
....o##########o##.#############..................#.#
....o###oo#####o###.############...................#.#
....o##########o####.###########...................#.#
....oooooooooooooo###.##########..................#.#
..ooooooooooooooooooo.##########..................#.#
...:::::::::::::::ooo.##########.................#.#
.......oooo......##########.####................#.#
.................#########.#####................#.#
.................oooooooooooooooo...............#.#
..................#######..######...............#.#
..................#######..######................#.#
..................######...######................#.#
..................######...######.................#.#
..................######....#####.................#.#
..................######....#####.................#.#
..................#####.....#####................#.#
..................#####.....#####...............#.#
.................######.....######..............#.#
................ooooooo.....ooooooo........ooo#.#
...............oooooooo.....oooooooo......o#.#oo
...............::::::::.....::::::::.......ooo
""")
    sol_traits(r, 68)

def archiviste_dessin(r):
    # Whitfield, l'archiviste : voûté, le crâne luisant, des touffes folles, de grosses lunettes et un grand nez ; il lit de près le rouleau des empreintes qui lui tombe jusqu'aux pieds.
    pixels(r, 12, 9, r"""
.....#..#.........ooooooo
....##.##......ooooooooooo
.....####.#...ooooooooooooo
....#.#####..oooooo::oooooo
.....######.ooooooo::ooooooo
....###.####oooooooooooooooo
.....#######ooooooooooooooooo
....##.####.ooooooooooo#######
.....#####ooooooooooo##########
......###oooooooooooo#####..####
........oooooooooooo#oooo#oooo#
........oo::ooooooo#oooo::oooo#o
.......oo:oo:oooooo#oooo::oooo#oo
.......oo:oo:oooooo#ooooooooooo#ooo
........oo::oooooooo#ooooooooo#oooooo
........ooooooooooooo#########ooooooooo
.........oooooooooooooooooooooooooooooo
.........ooooooooooooooooooooo:ooooooooo
..........ooooooooooooooooooo::oooooooo
..........ooooooooooooooooo::.ooooooo
...........oooooooooooooo:::..ooooo
...........ooooooooo#oo.......oooo
............ooooooo#o#::::::...oo
............#ooooo#o#o#oooooo
...........###oooo.#o#o#o#oo
..........####..ooo#o#o#o#
........######.#..oo#o#o.
......########.###.......
.....##########.####..
....###.#######.#####......ooooooooooooooooo
...####.########.#####...ooo:::::::::::::::ooo
...####.#########.#####..ooo:::::::::::::::ooo
..####.##########..#####oooooooooooooooooooooo
..####.###########..###oooo#o##.###.ooooooooo
..####.###########...##ooooooooooooooooooooo
..####.###########...##oooooo#o##.###.ooooo
..####.###########....#oooooooooooooooooooo
..#####.##########........ooo#o###.##o#oooo
..#####.###########.......oooooooooooooooo
..#####.###########.......oooo##.#o###.oooo
...####.############......oooooooooooooooo
...####.############......ooo#o#o##.###ooo
...#####.###########......oooooooooooooooo
...#####.############.....oooo###.o#o#.ooo
....####.############.....oooooooooooooooo
....####.############.....ooo##o.##o##oooo
....#####.###########.....oooooooooooooooo
.....####.#.#.#.#.####....oooo#o#.###o#ooo
.....####.#.#.#.#.####....oooooooooooooooo
.......###.......###......ooo#o##.###.oooo
.......###.......###......oooooooooooooooo
.......####......###......ooooooooooooooooo
........###.....####......ooo#o#o##o.#oooooo
........###.....###.......ooooooooooooooooooo
........###.....###........ooooooooooooooooooo
.......####....####..........ooooooooooooooooo
.....oooooo..oooooo............:::::oooooooooo
....ooooooo.ooooooo..............ooooooooooo
....:::::::.:::::::................ooooooo
""")
    sol_traits(r, 68)

def frances_dessin(r):
    # Frances, sous la capuche noire du Corbeau : un clin d'oeil, un sourire en coin, le sweat du BDE sous la cape ; elle fait tourner une plume noire entre ses doigts.
    pixels(r, 14, 9, r"""
...............................................o
..............................................o:o..o
.............................................o::o
............oooo...........................o::#o..o
..........oo::::oo........................o::#:o
.........o::::::::o......................o::#::o
........o::::::::::o....................o::#::o...o
.......o::::::::::::o...................o:#::o
.......o:::##########o.................o::#:o
......o:::############o................o:#::o..o
......o::##oooooooo####o..............o:#::o
.....o::##oooooooooooo##o.............o:#:o
.....o::#oo###ooooo###oo#o...........o:#:o..o
.....o::#ooooooooooooooooo#o.........o##o
.....o::#oo::oooooo:::::oooo:o.......oo#o
.....o::#oo::ooooooooooooooo:o......ooooo
.....o:::ooooooooooo:ooooooo:o.....oooooo
.....o:::ooooooooooo::oooooo:o.....oooooo
.....o:::ooooooooooooooooooo:o......oooo
.....o:::ooooooo::::::::oo:oo:o.....####
.....o::::oooooooooooooooo:oo:o.....####
......o:::ooooooooooooooooooo::o....####
......o::::::ooooooooooooo:::::o....####
.....o:::::::::::::::::::::::::o...####
....o::::::::::###oo###::::::::::o.####
...o::::::::::####oo####:::::::::::####
...o:::::::::####o####o###::::::::####o
..o::::::::::####o####o####::::::####:o
..o::::::::::####o####o#####::::###::::o
..o::::::::::####.####.######:####::::::o
.o::::::::::######.##.########:###:::::::o
.o::::::::::##############.####:##:::::::o
.o::::::::::##############..#####::::::::o
o:::::::::::###############..####::::::::o
o:::::::::::###############...##:::::::::o
o:::::::::::###############.....:::::::::o
o:::::::::::###oooooooooooo##...::::::::::o
o::::::::::::##o##########o##..:::::::::::o
o::::::::::::##o##########o##..:::::::::::o
o::::::::::::##ooooooooooooo#..:::::::::::o
o::::::::::::###############...::::::::::::o
o::::::::::::ooooooooooooooooo:::::::::::::o
o::::::::::::###############::::::::::::::o
o::::::::::::#######:#######:::::::::::::o
o:::::::::::::######:######::::::::::::oo
.o::::::::::::######:######:::::::::ooo
.o::::::::::::######:######::::::oooo
..o:::::::::::######:######:::ooo
..o::::::::::::#####:#####::oo
...o:::::::::::#####:#####:o
...o:::::::::::#####:#####:o
....oo::::::::::####:####::o
......ooo:::::::####:####:o
.........oooooo:####:####:o
.............o..####:####.o
................####:####
................####:####
..............ooooo:..ooooo
.............oooooo:.oooooooo
.............::::::...:::::::
""")
    sol_traits(r, 68)

def corbeau_dessin(r):
    # Le Corbeau : un gros oiseau perché sur une branche sous un croissant de lune, l'oeil rond, le bec crochu ; une plume tombe.
    pixels(r, 2, 4, r"""
......ooo
....ooo....................................#######
...ooo..........................o......#############
...oo.................................#################
...oo..........................######.###################
...ooo........................###..#####.#####.############
....ooo......................................######.###########
......ooo......................#####.######oooo########
...............................####.######oo::oo#######ooo
..............................#####.######o::::o#####oooooooo
..............................####.#######oo::oo####ooooooooooo
..............................####.########oooo####oooooooooooooo
.............................#####.###############ooooooooo::::::::oo
.............................####.#################oooooooooooo:ooo
............................#####.################:::::ooooooooo:oo
............................####.##################oooooooooo.o
...........................#####.#.#.#.###########oooo
...........................####.#.#.#.#.##########
..........................#####.#.#.#.#.##########
.........................#####.#.#.#.#.###########
.......................#######.#.#.#.#.###########
.....................#########.#.#.#.#############
...................####################.##########
.................######################.##########
...............#######.#.#.#.##########.##########
.............########.#.#.#.#.##########.#########
............########.#.#.#.#.#.#########.#########
...........#######################.######.########
..........##########.##.##.##.#####.######.######
.........###########.##.##.##.##.###.#####.######
........############.##.##.##.##.###.######.#####
.......############.##.##.##.##.##.##.#####.####
......############.##.##.##.##.##.##.######.###
.....###########.###.##.##.##.##.##.##.#########
....##########.####.##.##.##.##.##.##.#######
...##########.#####.##.##.##.##.##.##.######
..##########.######.##.##.##.##.##.##.#####
.#########.#######.##.##.##.##.##.##.####
#######...#######.##.##.##.##.##.##.####
#####.....######.##.##.##.##.##.######
###.......#######.##.##.##.##.######...........................oo
#.........########.##.##.#######.............................oo.o
..........##.##.##########.....oo.oo...oo.oo...............oo...o
..........#.#.#.#.#.#..........oo.oo...oo.oo.............oo.....o
..........#.#.#.#.#.#.........oo..oo..oo..oo...........oo.......o
oooooooooooooooooooooooooooooooooooooooooooooooooooooooooooo..ooo
ooooooooooooooooooooooooooooooooooooooooooooooooooooooooo:::oooo.
::::::::::::::::::::::::::::::::::::::::::::::::::ooooo:::::......
.......................................................oo........
..................ooo...................................oo.......
.................o:#:o...................................o.......
.................o:#:o...........................................
..................o#o............................................
...................#.............................................
""")
    pass


# --- le bâtiment B, une fois réparé : tous les voyants de l'armoire sont verts ---
def batimentb_ok():
    im, d = toile()
    d.rectangle([8, 10, 168, 24], fill=B); texte_centre(d, 13, "BATIMENT B", N)
    boite(d, 110, 32, 166, 148, B, N, 2)
    for r in range(6):
        y = 40 + r*17
        boite(d, 116, y, 160, y+11, B, N, 1)
        for k in range(8):
            d.rectangle([119 + k*5, y+4, 121 + k*5, y+6], fill=V)
    d.rectangle([8, 104, 96, 110], fill=B); d.rectangle([12, 110, 92, 148], outline=B)
    for y in range(116, 146, 8): d.line([(16, y), (88, y)], fill=B)
    ecran(d, 26, 70, 40, 30, 'lignes')
    clavier(d, 30, 98, 30)
    # une coche verte au-dessus de l'armoire
    d.line([(124, 30), (134, 28)], fill=N)
    d.line([(36, 52), (44, 60), (60, 40)], fill=V, width=3)
    sol(d, 152)
    return im


# --- la troisième enveloppe : le ticket d'incident du réseau ---
def ticket(nom):
    w, h = 60, 42
    im = Image.new('P', (w, h), N); im.putpalette(PAL); d = ImageDraw.Draw(im)
    d.rectangle([2, 6, 57, 39], fill=B)
    d.line([(2, 6), (29, 25), (57, 6)], fill=N, width=2)
    d.line([(2, 39), (22, 22)], fill=N); d.line([(57, 39), (37, 22)], fill=N)
    # un câble réseau débranché, en tampon
    d.rectangle([6, 27, 16, 33], fill=V); d.rectangle([16, 29, 20, 31], fill=V)
    d.line([(22, 30), (28, 34), (34, 30)], fill=V)
    d.rectangle([40, 9, 54, 19], outline=V); d.text((42, 9), "!", fill=V); d.line([(46, 12), (52, 12)], fill=V); d.line([(46, 16), (51, 16)], fill=V)
    im.resize((w*2, h*2), Image.NEAREST).save(OUT + nom)


# --- l'affiche du modèle OSI : la tour des sept étages, du câble jusqu'au web, sous un ciel de nuit ---
def osi():
    from dessiner_fantasy import ciel, degrade
    im, d = toile()
    ciel(d, 156, graine=13, n=22, voile=0.45, ymin=12)
    texte_centre(d, 2, "MODELE OSI", B)
    noms = ["PHYSIQUE", "LIAISON", "RESEAU", "TRANSPORT", "SESSION", "PRESENTATION", "APPLICATION"]
    x0, x1, p = 22, 140, 10
    # le flanc droit de la tour, en volume, avec ses fenêtres
    d.polygon([(x1, 23), (x1 + p, 17), (x1 + p, 146), (x1, 152)], fill=V)
    for k in range(7):
        y1 = 150 - k*18
        d.line([(x1, y1 + 1), (x1 + p, y1 - 5)], fill=N)
        d.rectangle([x1 + 3, y1 - 12, x1 + 6, y1 - 7], fill=N)
    for k, nom in enumerate(noms):
        y1 = 150 - k*18; y0 = y1 - 15
        clair = k in (0, 2, 6)
        boite(d, x0, y0, x1, y1, V if clair else B, N, 1)
        d.rectangle([x0+2, y0+2, x0+12, y1-2], fill=V if clair else B)
        d.text((x0+5, y0+3), str(k+1), fill=N)
        d.text((x0+17, y0+3), nom, fill=B)
        d.rectangle([x0, y1 + 1, x1, y1 + 2], fill=B)
    # le toit, son antenne, son feu
    d.polygon([(x0 + 4, 23), (81, 13), (x1 - 4, 23)], fill=B)
    d.polygon([(81, 13), (x1 - 4, 23), (x1 + p, 17), (84, 10)], fill=V)
    # le sol, et le câble qui part du rez-de-chaussée
    d.rectangle([0, 154, W, H], fill=V); d.line([(0, 154), (W, 154)], fill=B)
    degrade(d, 0, 155, W, 162, N, 0.6, 0.0)
    d.line([(x1 + p, 146), (164, 146), (170, 162)], fill=B, width=2)
    d.rectangle([166, 160, 174, 166], fill=B)
    return im


if __name__ == "__main__":
    finir("item_osi.gif", osi())
    for nom, f in [("loc_batimentb.gif", batimentb), ("loc_posteb.gif", posteb), ("loc_routeur.gif", routeur), ("loc_intranet.gif", intranet),
                   ("loc_batimentb_ok.gif", batimentb_ok)]:
        finir(nom, f())
    ticket("item_ticket.gif")
    for nom, dessin in [("item_radia.gif", radia_dessin), ("item_archiviste.gif", archiviste_dessin),
                        ("item_frances.gif", frances_dessin), ("item_corbeau.gif", corbeau_dessin)]:
        perso(nom, dessin)
    print("ok panne")


if __name__ == "__main__":
    # Les lieux des chapitres 2 et 3 ont été redessinés dans le style épais du chapitre 1 : dessiner_fantasy.py a le dernier mot.
    import dessiner_fantasy
    for _nom, _dessin in dessiner_fantasy.DESSINS.items():
        finir(_nom, _dessin())
