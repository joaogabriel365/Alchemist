import psycopg2
conn = psycopg2.connect(host='localhost',database='loja3d',user='postgres',password='AEC12bdf10.',port='5432')
cur = conn.cursor()
cur.execute("SELECT column_name, data_type FROM information_schema.columns WHERE table_name='pedidos' ORDER BY ordinal_position")
print("PEDIDOS COLUMNS:")
for r in cur.fetchall():
    print(r)
cur.execute("SELECT column_name, data_type FROM information_schema.columns WHERE table_name='itens_pedido' ORDER BY ordinal_position")
print("ITENS_PEDIDO COLUMNS:")
for r in cur.fetchall():
    print(r)
conn.close()
