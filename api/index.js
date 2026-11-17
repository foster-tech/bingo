import app from '../server.js';

export default function handler(request, response) {
  const path = Array.isArray(request.query.path)
    ? request.query.path.join('/')
    : request.query.path;

  request.url = path ? `/api/${path}` : '/api';
  return app(request, response);
}
