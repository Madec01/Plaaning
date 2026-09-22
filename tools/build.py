#!/usr/bin/env python3
"""Embed the project UI sources in the autonomous index.html (no runtime dependencies)."""
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
page = ROOT / 'index.html'
html = page.read_text(encoding='utf-8')

def replace_block(text, start, end, content, anchor):
    block = start + '\n' + content.rstrip() + '\n' + end + '\n'
    if start in text:
        return re.sub(re.escape(start) + r'.*?' + re.escape(end) + r'\n?', lambda _: block, text, count=1, flags=re.S)
    if anchor not in text:
        raise SystemExit('Missing integration anchor: ' + anchor)
    return text.replace(anchor, block + anchor, 1)

css = '\n\n'.join((ROOT / path).read_text(encoding='utf-8') for path in (
    'src/projects.css', 'src/project-details.css', 'src/planning-sessions.css', 'src/planning-deadlines.css'))
js = '\n\n'.join((ROOT / path).read_text(encoding='utf-8') for path in (
    'src/projects-ui.js', 'src/project-details.js', 'src/planning-sessions-ui.js', 'src/planning-deadlines.js'))
html = replace_block(html, '<!-- PROJECT UI CSS START -->', '<!-- PROJECT UI CSS END -->', '<style>\n' + css + '\n</style>', '</head>')
html = replace_block(html, '/* PROJECT UI JS START */', '/* PROJECT UI JS END */', js, 'vue = (etat.vue === "chrono") ? "chrono" : "colonnes";')
engine = (ROOT / 'src/project-engine.js').read_text(encoding='utf-8')
html = replace_block(html, '/* PROJECT ENGINE JS START */', '/* PROJECT ENGINE JS END */', engine, '/* PROJECT UI JS START */')
anchor = 'setInterval(majMaintenant, 30000);'
if 'initProjectsUI();\n' not in html:
    html = html.replace(anchor, 'initProjectsUI();\n' + anchor, 1)
page.write_text(html, encoding='utf-8')
print('index.html updated: project UI embedded, offline standalone preserved.')
