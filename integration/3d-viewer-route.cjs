// Optional Express route for the exact extensionless /3d-viewer?id=SCN URL.
// Mount before application authentication: app.get('/3d-viewer', require('./integration/3d-viewer-route.cjs'));
const fs = require('node:fs');
const path = require('node:path');
const loader = fs.readFileSync(path.join(__dirname, '..', '3d-viewer.js'), 'utf8');
module.exports = function viewerLoader(_request, response) {
  response.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  response.setHeader('Cache-Control', 'public, max-age=300');
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.status(200).send(loader);
};
