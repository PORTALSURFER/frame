#!/usr/bin/env python3
"""Embed Frame styles and scripts into a portable review artifact."""
from pathlib import Path
import re
root = Path(__file__).resolve().parents[1]
html = (root / 'index.html').read_text()
html = re.sub(r'<link[^>]+href="([^"]+\.css)"[^>]*>', lambda m: '<style>' + (root / m[1]).read_text() + '</style>', html)
scripts = []
def collect(m):
    scripts.append('<script>' + (root / m[1]).read_text().replace('</script', '<\\/script') + '</script>')
    return ''
html = re.sub(r'<script[^>]+src="([^"]+)"[^>]*>\s*</script>', collect, html)
html = html.replace('</body>', '\n'.join(scripts) + '\n</body>')
(root / 'frame-standalone.html').write_text(html)
