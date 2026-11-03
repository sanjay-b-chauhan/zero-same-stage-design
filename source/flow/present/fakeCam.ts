/* b36: the learner's camera, faked. Their photo drawn into a canvas with a slow breath, captured as a stream, so the
   real preflight and the self tile in the room have something to show. No device is ever opened. */
const SRC = 'static/faces/learner.jpg';
let cached: MediaStream | null = null;

export function fakeCam(): MediaStream | null {
  if (cached) return cached;
  const c = document.createElement('canvas');
  c.width = 960;
  c.height = 540;
  const g = c.getContext('2d');
  if (!g || typeof c.captureStream !== 'function') return null;
  const img = new Image();
  img.src = SRC;
  const t0 = performance.now();
  const draw = () => {
    const t = (performance.now() - t0) / 1000;
    g.fillStyle = '#2a2b2e';
    g.fillRect(0, 0, c.width, c.height);
    if (img.complete && img.naturalWidth) {
      const s = 1.02 + 0.01 * Math.sin(t * 0.9);
      const k = Math.max(c.width / img.naturalWidth, c.height / img.naturalHeight) * s;
      const w = img.naturalWidth * k;
      const h = img.naturalHeight * k;
      g.filter = 'blur(0.4px)';
      g.drawImage(img, (c.width - w) / 2 + 3 * Math.sin(t * 0.5), (c.height - h) / 2 + 2 * Math.sin(t * 0.7), w, h);
      g.filter = 'none';
    }
    setTimeout(draw, 1000 / 24);
  };
  draw();
  cached = c.captureStream(24);
  return cached;
}
