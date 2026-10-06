"""Read public methods, keep PDF originals/renders in the system temp folder."""
import argparse
import hashlib
import json
import pathlib
import subprocess
import tempfile
import urllib.request
from pypdf import PdfReader

SOURCES = [
    ('geus', 'GEUS 2025/32: Digital Surface Geology Map', 'https://data.geus.dk/pure-pdf/GEUS-R_2025_32_web.pdf', 30, [4, 5, 7, 8, 10, 13]),
    ('texture', 'AU 2024: Opdateret jordbundstypekort', 'https://pure.au.dk/ws/files/372695357/Opdateret_jordbundstypekort_1903_2024.pdf', 41, [6, 18, 41]),
    ('revision', 'AU 2024: Revidering af jordbundstypekort', 'https://pure.au.dk/ws/files/378595646/Revidering_jordbundstypekort_1705_2024.pdf', 4, [3]),
    ('carbon', 'AU 2024: Usikkerheder i Kulstof2022-kortet', 'https://pure.au.dk/ws/portalfiles/portal/417714104/Usikkerheder_i_Kulstof2022-kortet_2911_2024.pdf', 19, [4, 5, 17, 18]),
]

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--render-with', required=True)
    parser.add_argument('--output', default='docs/research/jordrav/layer-access-literature-2026-10-05.json')
    args = parser.parse_args()
    cache = pathlib.Path(tempfile.gettempdir()) / 'RavRadar' / 'jordrav-layer-literature-20261005'
    cache.mkdir(parents=True, exist_ok=True)
    records = []
    for key, title, url, count, inspected in SOURCES:
        target = cache / (key + '.pdf')
        request = urllib.request.Request(url, headers={'User-Agent': 'RavRadar research (public methodology)'})
        with urllib.request.urlopen(request, timeout=40) as response:
            original = response.read(15_000_001)
            final_url = response.url
        assert original.startswith(b'%PDF') and len(original) <= 15_000_000, title
        target.write_bytes(original)
        reader = PdfReader(target)
        assert len(reader.pages) == count, (title, len(reader.pages))
        for page in inspected:
            prefix = cache / f'{key}-page-{page}'
            subprocess.run([args.render_with, '-f', str(page), '-l', str(page), '-scale-to', '1500', '-png', '-singlefile', str(target), str(prefix)], check=True, capture_output=True)
            (cache / f'{key}-page-{page}.txt').write_text(reader.pages[page-1].extract_text(), encoding='utf-8')
        records.append({'id': key, 'title': title, 'url': url, 'resolvedURL': final_url,
                        'sourceBytes': len(original), 'sourceSha256': hashlib.sha256(original).hexdigest(),
                        'pages': count, 'renderedPages1Based': inspected,
                        'visualReview': 'pending', 'archive': 'Original PDF and page renders in system temp; not app data'})
    result = {'researchDate': '2026-10-05', 'scope': 'Primary methods only; no amber, cultivation or local-depth observations', 'sources': records}
    pathlib.Path(args.output).write_text(json.dumps(result, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
    print(json.dumps({'cache': str(cache), 'sources': [{'id': r['id'], 'bytes': r['sourceBytes'], 'pages': r['pages']} for r in records]}))

if __name__ == '__main__':
    main()
