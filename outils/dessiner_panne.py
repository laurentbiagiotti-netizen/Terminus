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

def radia_dessin(r):
    # les cheveux bouclés, en vert
    for (x0, y0, x1, y1) in [(34, 9, 53, 12), (32, 11, 55, 14), (31, 13, 56, 27), (30, 16, 57, 25), (32, 27, 36, 30), (51, 27, 55, 30)]:
        r(x0, y0, x1, y1, V)
    for x in range(31, 57, 3): r(x, 8, x + 1, 8, V)
    r(36, 15, 51, 31, B); r(36, 15, 51, 16, V)
    yeux(r, 37, 45, 19)
    r(43, 24, 44, 27, N)
    r(40, 28, 47, 30, N); r(41, 29, 46, 29, B); r(42, 29, 42, 29, N); r(44, 29, 44, 29, N)
    # le casque et son micro
    r(32, 9, 55, 10, B); r(30, 10, 32, 12, B); r(55, 10, 57, 12, B)
    r(28, 18, 31, 26, B); r(29, 19, 30, 25, N); r(56, 18, 59, 26, B); r(57, 19, 58, 25, N)
    r(31, 26, 32, 29, B); r(33, 29, 37, 30, B)
    # le sweat, les bras, le portable et son câble
    r(42, 32, 45, 33, B); r(35, 34, 52, 52, V); r(41, 34, 46, 36, N); r(42, 34, 45, 35, B)
    r(31, 36, 34, 37, B); r(30, 37, 31, 46, B); r(30, 46, 35, 47, B)
    r(53, 36, 56, 37, B); r(56, 37, 57, 46, B); r(52, 46, 57, 47, B)
    r(33, 40, 54, 49, B); r(35, 42, 52, 47, N)
    r(36, 43, 37, 44, V); r(38, 44, 39, 45, V); r(41, 45, 45, 45, V)
    r(31, 49, 56, 51, B)
    r(56, 50, 60, 50, V); r(60, 50, 61, 58, V); r(59, 58, 62, 61, V)
    r(38, 53, 41, 63, B); r(46, 53, 49, 63, B); r(39, 54, 40, 62, N); r(47, 54, 48, 62, N)
    r(36, 64, 42, 66, V); r(45, 64, 51, 66, V)
    sol_tirets(r, 68)

def archiviste_dessin(r):
    # grand et maigre, crâne dégarni, touffes vertes sur les côtés, lunettes rondes
    r(36, 6, 51, 28, B)
    r(33, 12, 36, 20, V); r(51, 12, 54, 20, V)
    yeux(r, 37, 45, 13)
    r(43, 14, 44, 15, N)                      # le pont des lunettes
    r(43, 18, 44, 22, N)
    r(40, 24, 47, 25, N)
    r(42, 29, 45, 30, B)
    # le gilet vert et la pile de parchemins dans les bras
    r(36, 31, 51, 54, V); r(42, 31, 45, 54, B)
    for k in range(4): r(43, 34 + k * 5, 44, 35 + k * 5, N)
    r(31, 33, 35, 34, B); r(30, 34, 31, 44, B)
    r(52, 33, 56, 34, B); r(56, 34, 57, 44, B)
    for k in range(3):
        y = 38 + k * 5
        r(31, y, 56, y + 3, B); r(32, y + 1, 55, y + 2, N); r(33, y + 1, 54, y + 1, B)
        r(30, y, 31, y + 3, V); r(56, y, 57, y + 3, V)
    # les jambes, le pantalon de velours, les chaussures
    r(38, 55, 41, 64, B); r(46, 55, 49, 64, B)
    r(39, 56, 40, 63, N); r(47, 56, 48, 63, N)
    r(36, 65, 42, 66, V); r(45, 65, 51, 66, V)
    sol_tirets(r, 68)

def frances_dessin(r):
    # la capuche du sweat du BDE, relevée, qui encadre le visage
    r(33, 8, 54, 34, V); r(31, 12, 56, 30, V)
    r(37, 13, 50, 32, B)
    r(37, 13, 50, 15, V)                      # la mèche sous la capuche
    yeux(r, 38, 45, 18)
    r(43, 23, 44, 25, N)
    r(41, 28, 46, 28, N)                      # un petit sourire en coin
    r(46, 27, 46, 27, N)
    # le sweat, le cordon de la capuche, la poche ventrale
    r(34, 33, 53, 54, V)
    r(40, 34, 40, 41, B); r(47, 34, 47, 41, B)
    r(38, 46, 49, 51, N); r(39, 47, 48, 50, V)
    # un bras le long du corps, l'autre fait tourner un stylo
    r(30, 35, 33, 36, B); r(29, 36, 30, 49, B); r(29, 49, 32, 50, B)
    r(54, 35, 58, 36, B); r(58, 28, 59, 36, B); r(56, 26, 61, 27, B); r(62, 22, 63, 31, V)
    # le jean et les baskets
    r(37, 55, 41, 64, B); r(46, 55, 50, 64, B)
    r(38, 56, 40, 63, N); r(47, 56, 49, 63, N)
    r(35, 65, 42, 66, V); r(45, 65, 52, 66, V)
    sol_tirets(r, 68)

def corbeau_dessin(r):
    # un corbeau perché, en blocs : corps blanc, ailes à plumes vertes, oeil carré, bec vert
    r(44, 14, 58, 27, B)                      # la tête
    yeux(r, 49, 49, 17)
    r(59, 19, 68, 21, V); r(59, 22, 64, 23, V)  # le bec
    r(36, 26, 60, 46, B)                      # le corps
    r(34, 30, 36, 44, B)
    for k in range(4):                        # les plumes de l'aile
        r(38 + k * 4, 31 + k, 40 + k * 4, 44, V)
    r(20, 40, 36, 44, B); r(14, 44, 30, 48, B); r(10, 48, 22, 51, V)   # la queue
    r(44, 47, 45, 54, V); r(52, 47, 53, 54, V)  # les pattes
    r(41, 54, 47, 55, V); r(49, 54, 55, 55, V)
    # la branche, puis le sol en tirets
    r(8, 56, 78, 58, B); r(64, 50, 66, 56, B); r(66, 48, 70, 50, V)
    sol_tirets(r, 68)


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


# --- l'affiche du modèle OSI : la tour des sept étages, du câble jusqu'au web ---
def osi():
    im, d = toile()
    texte_centre(d, 2, "MODELE OSI", B)
    noms = ["PHYSIQUE", "LIAISON", "RESEAU", "TRANSPORT", "SESSION", "PRESENTATION", "APPLICATION"]
    for k, nom in enumerate(noms):
        y1 = 150 - k*18; y0 = y1 - 15
        x0 = 26; x1 = 150
        boite(d, x0, y0, x1, y1, V if k in (0, 2, 6) else B, N, 1)
        d.rectangle([x0+2, y0+2, x0+12, y1-2], fill=V if k in (0, 2, 6) else B)
        d.text((x0+5, y0+3), str(k+1), fill=N)
        d.text((x0+17, y0+3), nom, fill=B)
    # le toit, et le câble qui part du rez-de-chaussée
    d.polygon([(30, 23), (88, 13), (146, 23)], fill=B)
    d.line([(150, 146), (166, 146), (170, 162)], fill=V, width=2)
    sol(d, 156)
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
