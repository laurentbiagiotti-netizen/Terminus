"""Dessine les lieux du chapitre de la panne réseau, dans le même style que dessiner_lieux.py (1 bit : noir, vert, blanc)."""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from dessiner_lieux import *  # noqa: F401,F403  (toile, finir, boite, ecran, clavier, table, sol, texte_centre, N, V, B, PAL, OUT)
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


if __name__ == "__main__":
    for nom, f in [("loc_batimentb.gif", batimentb), ("loc_posteb.gif", posteb), ("loc_routeur.gif", routeur), ("loc_intranet.gif", intranet)]:
        finir(nom, f())
    ticket("item_ticket.gif")
    print("ok panne")
