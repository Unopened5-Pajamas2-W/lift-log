/** Thin seam over the build-time `virtual:pwa-register` module (provided by
 *  vite-plugin-pwa) so unit tests can stub service-worker registration. */
export { registerSW } from "virtual:pwa-register";
