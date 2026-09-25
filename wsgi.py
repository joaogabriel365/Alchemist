"""
Ponto de entrada para PRODUÇÃO.

Windows / qualquer sistema:
    waitress-serve --listen=0.0.0.0:8000 wsgi:app
Linux:
    gunicorn --bind 0.0.0.0:8000 wsgi:app

Em desenvolvimento continue usando: python app.py
(o waitress/gunicorn nunca ativam o debugger do Flask, mesmo com FLASK_DEBUG=1)
"""
from app import app, ensure_db_schema, migrar_senhas_texto_puro

# Mesmas migrações que o "python app.py" faz ao iniciar
ensure_db_schema()
migrar_senhas_texto_puro()
