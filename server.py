import json
from http import HTTPStatus
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Lock
from urllib.parse import unquote

HOST = '0.0.0.0'
PORT = 8000

DATA_DIR = Path('data')
TABLES_FILE = DATA_DIR / 'tables.json'

TABLE_IDS = [
    'product-development-table',
    'product-index-table',
]

storage_lock = Lock()


def default_storage():
  return {table_id: None for table_id in TABLE_IDS}


def read_storage():
  if not TABLES_FILE.exists():
    return default_storage()

  try:
    payload = json.loads(TABLES_FILE.read_text(encoding='utf-8'))
  except json.JSONDecodeError:
    return default_storage()

  if not isinstance(payload, dict):
    return default_storage()

  data = default_storage()
  for table_id in TABLE_IDS:
    table_data = payload.get(table_id)
    if isinstance(table_data, dict):
      columns = table_data.get('columns')
      rows = table_data.get('rows')
      if isinstance(columns, list) and isinstance(rows, list):
        data[table_id] = {'columns': columns, 'rows': rows}

  return data


def write_storage(data):
  DATA_DIR.mkdir(parents=True, exist_ok=True)
  TABLES_FILE.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding='utf-8')


class InventoryHandler(SimpleHTTPRequestHandler):
  def do_GET(self):
    if self.path.startswith('/api/tables/'):
      self.handle_get_table()
      return

    super().do_GET()

  def do_PUT(self):
    if self.path.startswith('/api/tables/'):
      self.handle_put_table()
      return

    self.send_error(HTTPStatus.NOT_FOUND, 'Not Found')

  def get_table_id(self):
    path = unquote(self.path)
    prefix = '/api/tables/'
    if not path.startswith(prefix):
      return None

    table_id = path[len(prefix):].strip('/')
    if table_id not in TABLE_IDS:
      return None

    return table_id

  def handle_get_table(self):
    table_id = self.get_table_id()
    if table_id is None:
      self.send_error(HTTPStatus.NOT_FOUND, 'Unknown table id')
      return

    with storage_lock:
      payload = read_storage().get(table_id)

    if payload is None:
      payload = {'columns': [], 'rows': []}

    self.send_json(payload)

  def handle_put_table(self):
    table_id = self.get_table_id()
    if table_id is None:
      self.send_error(HTTPStatus.NOT_FOUND, 'Unknown table id')
      return

    length = int(self.headers.get('Content-Length', '0'))
    raw_body = self.rfile.read(length)

    try:
      payload = json.loads(raw_body.decode('utf-8'))
    except json.JSONDecodeError:
      self.send_error(HTTPStatus.BAD_REQUEST, 'Invalid JSON')
      return

    if not isinstance(payload, dict):
      self.send_error(HTTPStatus.BAD_REQUEST, 'Payload must be an object')
      return

    columns = payload.get('columns')
    rows = payload.get('rows')

    if not isinstance(columns, list) or not isinstance(rows, list):
      self.send_error(HTTPStatus.BAD_REQUEST, 'columns and rows must be arrays')
      return

    normalized_rows = []
    for row in rows:
      if not isinstance(row, list):
        self.send_error(HTTPStatus.BAD_REQUEST, 'Each row must be an array')
        return

      normalized = [str(cell) for cell in row]
      if len(normalized) > len(columns):
        normalized = normalized[:len(columns)]
      while len(normalized) < len(columns):
        normalized.append('')

      normalized_rows.append(normalized)

    record = {
      'columns': [str(column) for column in columns],
      'rows': normalized_rows,
    }

    with storage_lock:
      storage = read_storage()
      storage[table_id] = record
      write_storage(storage)

    self.send_json({'ok': True})

  def send_json(self, payload):
    body = json.dumps(payload, ensure_ascii=False).encode('utf-8')
    self.send_response(HTTPStatus.OK)
    self.send_header('Content-Type', 'application/json; charset=utf-8')
    self.send_header('Content-Length', str(len(body)))
    self.end_headers()
    self.wfile.write(body)


if __name__ == '__main__':
  DATA_DIR.mkdir(parents=True, exist_ok=True)
  if not TABLES_FILE.exists():
    write_storage(default_storage())

  server = ThreadingHTTPServer((HOST, PORT), InventoryHandler)
  print(f'Server running on http://127.0.0.1:{PORT}')
  server.serve_forever()
