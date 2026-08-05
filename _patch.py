import os

# Patch members.html
with open('templates/members.html', encoding='utf-8') as f:
    content = f.read()

old_start = '            <div class="container members-grid">'
old_end = '            </div>\n        </section>'
start_idx = content.index(old_start)
end_idx = content.index(old_end, start_idx) + len(old_end)

new_block = (
    '            <div class="container members-grid">\n'
    '                {%- for membro in membros %}\n'
    '                <article class="member-card reveal">\n'
    '                    <div class="member-avatar" aria-hidden="true">{{ membro.nome[:2] | upper }}</div>\n'
    '                    <div class="member-meta">\n'
    '                        <h2>{{ membro.nome }}</h2>\n'
    '                        <p class="member-role">{{ membro.cargo }}</p>\n'
    '                    </div>\n'
    '                    <p class="member-copy">{{ membro.bio }}</p>\n'
    '                </article>\n'
    '                {%- else %}\n'
    '                <p style="color:rgba(255,255,255,.5);text-align:center;padding:40px 0;">Nenhum membro cadastrado.</p>\n'
    '                {%- endfor %}\n'
    '            </div>\n'
    '        </section>'
)

content = content[:start_idx] + new_block + content[end_idx:]
with open('templates/members.html', 'w', encoding='utf-8') as f:
    f.write(content)
print('members.html OK')

# Patch products.html — inject __DB_PRODUCTS__ before app.js script tag
with open('templates/products.html', encoding='utf-8') as f:
    pcontent = f.read()

inject_tag = (
    '    <script>window.__FLASK_USER__ = {{ flask_user | tojson }};</script>\n'
    '    {%- if produtos_json is defined %}\n'
    '    <script>window.__DB_PRODUCTS__ = {{ produtos_json | safe }};</script>\n'
    '    {%- endif %}\n'
    '    <script src="{{ url_for(\'static\', filename=\'assets/js/app.js\') }}"></script>'
)

old_tag = '    <script>window.__FLASK_USER__ = {{ flask_user | tojson }};</script>\n    <script src="{{ url_for(\'static\', filename=\'assets/js/app.js\') }}"></script>'

if old_tag in pcontent:
    pcontent = pcontent.replace(old_tag, inject_tag)
    with open('templates/products.html', 'w', encoding='utf-8') as f:
        f.write(pcontent)
    print('products.html OK')
else:
    print('products.html: pattern not found')
    # Try alternate quoting
    old_tag2 = '    <script>window.__FLASK_USER__ = {{ flask_user | tojson }};</script>\n    <script src="{{ url_for(\'static\', filename=\'assets/js/app.js\') }}"></script>'
    print(repr(pcontent[-400:]))
