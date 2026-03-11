const { createServer } = require('https');
const { createServer: createHttpServer } = require('http');
const { parse } = require('url');
const next = require('next');
const fs = require('fs');
const path = require('path');

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

const PORT = parseInt(process.env.PORT || '3000', 10);
const HTTP_PORT = PORT + 1; // HTTP redirect port

const certPath = path.join(__dirname, 'certs', 'cert.pem');
const keyPath = path.join(__dirname, 'certs', 'key.pem');

if (!fs.existsSync(certPath) || !fs.existsSync(keyPath)) {
  console.error('SSL certificates not found. Run "node generate-cert.js" first.');
  process.exit(1);
}

const httpsOptions = {
  key: fs.readFileSync(keyPath),
  cert: fs.readFileSync(certPath),
};

app.prepare().then(() => {
  // HTTPS server (main)
  createServer(httpsOptions, (req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  }).listen(PORT, '0.0.0.0', () => {
    console.log(`> HTTPS server ready on https://0.0.0.0:${PORT}`);
  });

  // HTTP server that redirects to HTTPS
  createHttpServer((req, res) => {
    const host = req.headers.host?.replace(`:${HTTP_PORT}`, `:${PORT}`) || `localhost:${PORT}`;
    res.writeHead(301, { Location: `https://${host}${req.url}` });
    res.end();
  }).listen(HTTP_PORT, '0.0.0.0', () => {
    console.log(`> HTTP redirect server on http://0.0.0.0:${HTTP_PORT}`);
  });
});
