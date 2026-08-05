"""Patch: add Membros nav to all admin templates (corrected pattern)."""
import glob

MEMBROS_LINE = "    <a href=\"{{ url_for('admin_membros') }}\">Membros</a>\n"
TARGET_SUBSTRING = "admin_comments') }}\">Coment"

for path in sorted(glob.glob('templates/admin*.html')):
    with open(path, encoding='utf-8') as f:
        txt = f.read()
    if 'admin_membros' in txt:
        print(f'skip (already has Membros): {path}')
        continue
    idx = txt.find(TARGET_SUBSTRING)
    if idx == -1:
        print(f'not found: {path}')
        continue
    line_start = txt.rfind('\n', 0, idx) + 1
    line_end = txt.find('\n', idx) + 1
    old_line = txt[line_start:line_end]
    txt = txt[:line_start] + MEMBROS_LINE + old_line + txt[line_end:]
    with open(path, 'w', encoding='utf-8') as f:
        f.write(txt)
    print(f'updated: {path}')
