"""Patch script: adds Membros nav link to all admin templates."""
import glob

MEMBROS_LINK = '    <a href="{{ url_for(\'admin_membros\') }}">Membros</a>\n'
COMMENTS_LINK_PLAIN = "    <a href=\"{{ url_for('admin_comments') }}\">Comentários &amp; Personalizados</a>"
COMMENTS_LINK_ACTIVE = "    <a href=\"{{ url_for('admin_comments') }}\" class=\"active\">Comentários &amp; Personalizados</a>"

for path in sorted(glob.glob('templates/admin*.html')):
    with open(path, encoding='utf-8') as f:
        txt = f.read()

    if MEMBROS_LINK.strip() in txt:
        print(f'Already has Membros: {path}')
        continue

    changed = False
    for comments_variant in [COMMENTS_LINK_PLAIN, COMMENTS_LINK_ACTIVE]:
        if comments_variant in txt:
            txt = txt.replace(comments_variant, MEMBROS_LINK + comments_variant)
            changed = True
            break

    if changed:
        with open(path, 'w', encoding='utf-8') as f:
            f.write(txt)
        print(f'Updated: {path}')
    else:
        print(f'Pattern not found: {path}')
