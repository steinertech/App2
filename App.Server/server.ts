import { createServer } from 'node:http';
 
const server = createServer((request, response) => {
  const url = new URL(
    request.url ?? '/',
    `http://${request.headers.host ?? 'localhost'}`
  );
 
  if (request.method === 'GET' && url.pathname === '/health') {
    response.writeHead(200, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify({ status: 'ok' }));
    return;
  }
 
  response.writeHead(200, { 'Content-Type': 'text/plain' });
  response.end('Hello from Node.js on Vercel');
});
 
server.listen(Number(process.env.PORT ?? 3000));
