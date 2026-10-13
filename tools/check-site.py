"""Check static site references, metadata and SVG integrity without dependencies."""
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit
import re
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]

class Page(HTMLParser):
    def __init__(self):
        super().__init__()
        self.ids, self.refs, self.h1, self.tabs, self.controls = [], [], 0, [], []
    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if 'id' in a: self.ids.append(a['id'])
        for key in ('src', 'href'):
            if key in a: self.refs.append(a[key])
        if 'aria-controls' in a: self.controls.append(a['aria-controls'])
        if a.get('role') == 'tab': self.tabs.append(a)
        self.h1 += tag == 'h1'

page = Page()
page.feed((ROOT / 'index.html').read_text(encoding='utf-8'))
assert page.h1 == 1, 'Exactly one h1 required'
assert len(set(page.ids)) == len(page.ids), 'Duplicate ids'
assert len(page.tabs) == 3, 'Three scenario tabs required'
for control in page.controls:
    assert control in page.ids, f'Missing ARIA control: {control}'
for ref in page.refs:
    url = urlsplit(ref)
    if url.scheme or url.netloc: continue
    if url.path:
        target = ROOT / url.path
        assert target.is_file(), f'Missing asset: {ref}'
        if url.fragment and url.path.endswith('.svg'):
            ids = {e.get('id') for e in ET.parse(target).iter()}
            assert url.fragment in ids, f'Missing SVG symbol: {ref}'
    elif url.fragment:
        assert url.fragment in page.ids, f'Missing anchor: {ref}'
for path in (ROOT / 'css').glob('*.css'):
    for target in re.findall(r'url\([\"\']?([^\)\"\']+)', path.read_text(encoding='utf-8')):
        assert (path.parent / target).is_file(), f'Missing CSS asset: {target}'
for path in (ROOT / 'assets').rglob('*.svg'): ET.parse(path)
for path in (ROOT / 'js').glob('*.js'):
    source = path.read_text(encoding='utf-8')
    assert not re.search(r'\b(fetch|XMLHttpRequest|sendBeacon|localStorage|sessionStorage)\b', source), 'Unexpected data transmission/storage'
assert (ROOT / 'assets/og.png').is_file()
assert (ROOT / 'assets/licenses/lucide-LICENSE.txt').is_file()
print(f'PASS: {len(page.refs)} references, 3 tabs, one h1, SVG symbols, fonts, no form network/storage.')
