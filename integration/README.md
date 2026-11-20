# Car-only Scorpio-N embed

```html
<div id="digiiq-3d-viewer"></div>
<script defer src="https://mahindra.digiiq.ai/3d-viewer.js?id=SCN"></script>
```

The script mounts an isolated, responsive iframe inside the div. It uses no host framework, global CSS or Three.js global. Only `SCN` is enabled. Repeated scripts do not duplicate the viewer; a div inserted later is supported. Controls remain disabled until all72 lightweight rotation textures are decoded/uploaded and the shader is prepared. The only setup message is `Loading the model…`. Retry is available after errors or a stalled setup. Drag, keyboard rotation, pinch/button zoom, auto rotation and fullscreen are supported. Normal vertical page scrolling is preserved. Rendering/detail work pauses when the embed is off screen or the document is hidden.

The car is the existing72-view original-image sequence, not an editable car mesh. There are no accessory models, product panels or accessory controls in this embed. The accessory studio remains at https://mnm-car.digiiq.ai/.

## Hosting

`mahindra.digiiq.ai` is assigned to the separate public GitHub Pages repository `info-arnav/mahindra-3d-viewer`. Its DNS CNAME points to `info-arnav.github.io`. The embed frame, loader and minimal Three.js runtime are served from the new domain. Source images are reused from the existing viewer CDN at `mnm-car.digiiq.ai`, avoiding a second copy of the car assets. Anonymous CORS image requests are used for WebGL uploads.

The parent site must allow `https://mahindra.digiiq.ai` in `script-src` and `frame-src` if it uses restrictive CSP. It does not need to add the image CDN to the parent policy: image loading happens in the separate frame. The viewer needs fullscreen permission, already set by the loader.

## Exact extensionless endpoint

GitHub Pages serves JavaScript reliably at `/3d-viewer.js`. For the original `/3d-viewer?id=SCN` path, either:

- mount `3d-viewer-route.cjs` on an existing Express server before authentication and serve the adjacent `embed/` and `vendor/` directories as static files, or
- add a Cloudflare redirect from path `/3d-viewer` to `https://mahindra.digiiq.ai/3d-viewer.js`, preserving the query string.

The server adapter sets the JavaScript MIME type. Do not serve an HTML document as an external script.

## Optional attributes

`data-target="another-div-id"` changes the mount target. `data-height="520"` sets a fixed height. `data-viewer-url="http://127.0.0.1:8100/embed/"` is available for local integration testing. The default height follows the container width with a usable mobile minimum. Mounting the iframe does not modify host-page content outside the target div.

Example server integration (existing Express installation):

```js
app.get('/3d-viewer', require('./integration/3d-viewer-route.cjs'));
app.use('/embed', express.static(path.join(__dirname, 'embed')));
app.use('/vendor', express.static(path.join(__dirname, 'vendor')));
```
