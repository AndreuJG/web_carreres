"""Optional maintenance: rebuild the committed GeoNames gazetteer, not needed by daily updates.

Run: python scripts/build-gazetteer.py path/to/ES.zip
Source: https://download.geonames.org/export/dump/ES.zip — CC BY, GeoNames.
"""
import json, re, sys, unicodedata, zipfile
from datetime import date
from pathlib import Path

def key(value):
    plain = unicodedata.normalize('NFKD', value).encode('ascii', 'ignore').decode().lower()
    return re.sub('[^a-z0-9]+', ' ', plain).strip()

with zipfile.ZipFile(sys.argv[1]) as archive:
    rows = [line.split('\t') for line in archive.read('ES.txt').decode('utf8').splitlines()]
canonical = {}
for row in rows:
    if row[6] == 'P' and row[7].startswith('PPL'):
        for name in [row[1], row[2]]:
            canonical.setdefault(key(name), []).append((float(row[4]), float(row[5])))
towns = []
for row in rows:
    if row[6] != 'P' or not row[7].startswith('PPL'):
        continue
    lat, lon, population = float(row[4]), float(row[5]), int(row[14] or 0)
    nearby = 37.8 < lat < 41 and -2.3 < lon < 1.1
    if not nearby and population < 1000:
        continue
    extra = [a for a in row[3].split(',') if nearby and re.fullmatch(r"[A-Za-zÀ-ž '’/().-]{2,70}", a)]
    # Tabernas is a historic alias of Tavernes, but also a different town in Almeria.
    extra = [a for a in extra if not any(abs(x-lat)+abs(y-lon) > .1 for x, y in canonical.get(key(a), []))]
    towns.append(dict(name=row[1], lat=lat, lon=lon, aliases=sorted(set([row[1], row[2]] + extra)), population=population))
towns.sort(key=lambda town: -town['population'])
target = Path(__file__).resolve().parent / 'sync' / 'towns.json'
target.write_text(json.dumps(dict(source='https://download.geonames.org/export/dump/ES.zip', license='CC BY 4.0 · GeoNames', retrievedAt=date.today().isoformat(), towns=towns), ensure_ascii=False, indent=2) + '\n', encoding='utf8')
print(f'{len(towns)} populated places written to {target}')
