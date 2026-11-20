# Scorpio-N Accessory Studio

Source-image rotation with calibrated live 3D roof accessories. Published with GitHub Pages at https://mnm-car.digiiq.ai/.

The car retains 72 supplied views. It is not an editable 3D car mesh. AZ00018 crossbars and AZ00025 carrier are native 3D visual reconstructions from official product photos; their hidden mounting details, dimensions and fitment remain inferred.

The startup screen stays visible until all lightweight rotation views and accessory shaders are ready. High-resolution source imagery loads only for the current idle view; idle rendering is stopped. Customer-facing copy contains no reconstruction/debug messaging.

The roof carrier now follows the source rail crown and downturned ends. Contact envelopes seat on the fitted rail profile, replacing the earlier whole-assembly lift. `Scorpio_N_Photo_Assembly.blend` contains the editable accessory assembly and invisible depth proxy.

Run locally: `python3 -m http.server 8100 --bind 127.0.0.1`.

Three.js: MIT, license in vendor. Studio Small09 lighting: Poly Haven CC0, provenance in assets. Vehicle images and Mahindra product/brand references retain their owners' rights. No independent redistribution rights are asserted.

## Exterior colours

Five original colour sequences are available in both the studio and car-only embed: Deep Forest, Everest White, Galaxy Grey, Oceanic Blue and Stealth Black. Each uses72 source angles; paint is never generated or tinted in code. Colour swatches are keyboard-accessible buttons with selected and loading states. The old car remains interactive while all72 views of the next colour are fetched, decoded and uploaded; the switch preserves the current angle and zoom. The studio also preserves accessories. Failed colour loads retain the working car and can be retried from the swatch.

Only the initial Deep Forest rotation is loaded at startup. Up to two prepared colour rotations remain on the GPU; other rotations are disposed and their downloads remain in the HTTP cache. High-resolution source detail loads only for the idle angle. Desktop previews are960×540 and mobile previews640×360; idle detail is lossless2400×1350 or1200×675. New colour assets and their provenance live under `https://mnm-car.digiiq.ai/assets/colours/`. The existing embed snippet is unchanged.
