"""Ajoute ?v=VERSION aux feuilles de style et scripts de Web/index.html, pour que les navigateurs
chargent toujours la dernière version publiée au lieu de celle gardée en cache. À lancer avant chaque publication."""
import re, time, os
chemin = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'Web', 'index.html')
version = time.strftime('%Y%m%d%H%M%S')
html = open(chemin, encoding='utf-8').read()
html = re.sub(r'(\./static/(?:javascript|css)/[^"?]+\.(?:js|css))(\?v=\d+)?"', lambda m: m.group(1) + '?v=' + version + '"', html)
open(chemin, 'w', encoding='utf-8').write(html)
print('version', version)
