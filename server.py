from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

HOST = '0.0.0.0'
PORT = 8000

if __name__ == '__main__':
  server = ThreadingHTTPServer((HOST, PORT), SimpleHTTPRequestHandler)
  print(f'Server running on http://127.0.0.1:{PORT}')
  server.serve_forever()
