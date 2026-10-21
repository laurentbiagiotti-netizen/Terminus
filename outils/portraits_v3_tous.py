"""Regénère tous les portraits v3 (chapitres 2 à 9 et épreuve finale).

Les anciens outils dessiner_*.py savent encore produire les versions
précédentes de certains portraits. Après avoir relancé l'un d'eux en entier,
relancer ce script pour remettre les portraits v3 :

    python3 outils/portraits_v3_tous.py

Les six portraits de l'essai (rouxblanc, myriam, radia, henry, julien,
coursier) sont produits par leurs outils d'origine via PORTRAITS_V3 ;
les autres le sont par les lots outils/portraits_v3_1.py à portraits_v3_10.py.
"""
import os
import subprocess
import sys

ICI = os.path.dirname(os.path.abspath(__file__))
RACINE = os.path.dirname(ICI)

for n in range(1, 11):
    script = os.path.join(ICI, "portraits_v3_%d.py" % n)
    print("lot", n)
    subprocess.run([sys.executable, script], cwd=RACINE, check=True)
print("portraits v3 regénérés")
