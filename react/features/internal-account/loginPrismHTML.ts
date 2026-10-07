import { feraPrismEngineSource } from './feraPrismEngine.generated';

// The values are the user's reference: 20 strips (10 mirrored pairs),
// App speed 768, independently tuned from web; Soften 15px and Noise 30%.
const recipe = require('../../../branding/login-prism-recipe.json');

/**
 * Build the offline canvas document used behind the native login form.
 *
 * @param {boolean} reduceMotion - Whether to paint a still frame for accessibility.
 * @returns {string} Self-contained background document.
 */
export function loginPrismHTML(reduceMotion = false): string {
    return `<!doctype html><html><head>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:">
<style>
html,body{margin:0;width:100%;height:100%;overflow:hidden;background:#26483D}
#field,#noise{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}
#field{filter:blur(${recipe.fieldBlur}px);transform:scale(${1 + recipe.fieldBlur / 200})}
#noise{background-size:256px 256px;image-rendering:pixelated;mix-blend-mode:overlay;opacity:${recipe.grain / 200}}
</style></head><body><canvas id="field"></canvas><div id="noise"></div><script>
(() => {
  const engine = (() => {${feraPrismEngineSource}})();
  const recipe = ${JSON.stringify(recipe)};
  const canvas = document.getElementById('field');
  const context = canvas.getContext('2d', {alpha:false});
  const rate = recipe.speed / 100 * engine.clockScale;
  const stats = {frames:0,elapsed:0,direction:'expand',time:recipe.startT};
  window.__guangyuPrism = stats;
  let active = true, previous = null, request = 0;
  const reduced = ${reduceMotion};
  document.getElementById('noise').style.backgroundImage = 'url(' + engine.noise() + ')';

  function paint() {
    // Match the original Fera clock: Expand only, no reversal or frame reset.
    stats.time = recipe.startT + stats.elapsed * rate;
    engine.paint(context, canvas.width, canvas.height, recipe.stops,
      recipe.divs, recipe.params, stats.time);
    stats.frames++;
  }
  function resize() {
    const density = Math.min(3, window.devicePixelRatio || 1);
    const scale = Math.min(density, 2560 / Math.max(innerWidth,innerHeight));
    canvas.width = Math.max(1, Math.round(innerWidth * scale));
    canvas.height = Math.max(1, Math.round(innerHeight * scale));
    paint();
  }
  function frame(now) {
    if (!active || document.hidden || reduced) { previous = null; request = 0; return; }
    // Count foreground elapsed time even when the WebView drops frames.
    // resume() resets previous after backgrounding, avoiding hidden-time jumps.
    if (previous !== null) stats.elapsed += Math.max(0,(now - previous)/1000);
    previous = now;
    paint();
    request = requestAnimationFrame(frame);
  }
  function resume() {
    if (request) cancelAnimationFrame(request);
    previous = null;
    request = active && !document.hidden && !reduced ? requestAnimationFrame(frame) : 0;
  }
  window.setPrismActive = value => { active = value; resume(); };
  window.addEventListener('resize', resize);
  document.addEventListener('visibilitychange', resume);
  resize();
  if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage('prism-ready');
  resume();
})();
</script></body></html>`;
}
