"""Primary morphology and sediment chronology; originals/renders stay in temp."""
import argparse
import hashlib
import json
import pathlib
import subprocess
import tempfile
import urllib.request
from pypdf import PdfReader

SOURCES = [
    ('klint', 'Klint, GEUS 2011: Vejledning i geologisk karakterisering af Istidssedimenter',
     'https://geuskort.geus.dk/siteeval/tilltyper/den_lille_kvartaergeolog.pdf', 37, [6, 7, 11, 16]),
    ('soil', 'GEUS 2025/32: sediment genesis and broad chronology',
     'https://data.geus.dk/pure-pdf/GEUS-R_2025_32_web.pdf', 30, [16, 17, 18, 19, 20]),
]

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--render-with', required=True)
    args = parser.parse_args()
    cache = pathlib.Path(tempfile.gettempdir()) / 'RavRadar' / 'jordrav-landscape-literature-20261005'
    cache.mkdir(parents=True, exist_ok=True)
    records = []
    for key, title, url, count, pages in SOURCES:
        request = urllib.request.Request(url, headers={'User-Agent': 'RavRadar public methodology research'})
        with urllib.request.urlopen(request, timeout=40) as response:
            original = response.read(15_000_001)
            final_url = response.url
        assert original.startswith(b'%PDF') and len(original) <= 15_000_000, title
        target = cache / (key + '.pdf')
        target.write_bytes(original)
        reader = PdfReader(target)
        assert len(reader.pages) == count, (title, len(reader.pages))
        for page in pages:
            prefix = cache / f'{key}-page-{page}'
            subprocess.run([args.render_with, '-f', str(page), '-l', str(page), '-scale-to', '1300',
                            '-png', '-singlefile', str(target), str(prefix)], check=True, capture_output=True)
            prefix.with_suffix('.txt').write_text(reader.pages[page-1].extract_text(), encoding='utf-8')
        records.append({'id': key, 'title': title, 'url': url, 'resolvedURL': final_url,
                        'sourceBytes': len(original), 'sourceSha256': hashlib.sha256(original).hexdigest(),
                        'pages': count, 'renderedPages1Based': pages, 'visualReview': 'pending',
                        'archive': 'Original PDF and page renders in system temp; not app data'})
    result = {'researchDate': '2026-10-05', 'scope': 'Landform mechanisms and mapped sediment categories; no local age, amber or exposure measurement',
              'sources': records}
    pathlib.Path('docs/research/jordrav/landscape-literature-2026-10-05.json').write_text(
        json.dumps(result, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
    print(json.dumps({'cache': str(cache), 'pages': sum(len(s[-1]) for s in SOURCES)}))

if __name__ == '__main__':
    main()
