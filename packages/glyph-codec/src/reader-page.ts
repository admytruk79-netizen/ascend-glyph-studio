/**
 * Offline ornament reader (browser). Bundled into apps/web/public/reader/index.html by
 * scripts/build-ornament-reader.mts. No network: everything runs on the phone.
 *
 * Two ways in:
 *   - live camera (needs the page served over https; it is cached by reader/sw.js so it also opens offline)
 *   - "take a photo" (file input with the camera), which works anywhere, even from a saved file
 * Every frame or photo adds its sprigs to the collection; when enough repeats (or pieces of repeats) agree,
 * the message appears and is read aloud if the phone has a voice for it.
 */
import { decodeOrnamentScans, readColumns, reverseScan, type Column } from "./ornament-message.js";

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const scans: (Column | null)[][] = [];
let done = false;

function toRgb(img: ImageData) {
  const n = img.width * img.height, rgb = new Uint8Array(n * 3);
  for (let i = 0; i < n; i++) { rgb[i * 3] = img.data[i * 4]!; rgb[i * 3 + 1] = img.data[i * 4 + 1]!; rgb[i * 3 + 2] = img.data[i * 4 + 2]!; }
  return rgb;
}
/** The cloth colour: the median of the frame (most of the strip is ground). */
function groundOf(rgb: Uint8Array) {
  const ch = [0, 1, 2].map((c) => { const v: number[] = []; for (let i = c; i < rgb.length; i += 3 * 7) v.push(rgb[i]!); v.sort((a, b) => a - b); return v[v.length >> 1]!; });
  return "#" + ch.map((v) => v.toString(16).padStart(2, "0")).join("");
}

function addFrame(img: ImageData) {
  if (done) return;
  const rgb = toRgb(img), cols = readColumns(rgb, img.width, img.height, groundOf(rgb));
  const sprigs = cols.filter((c) => c?.kind === "data").length, syncs = cols.filter((c) => c?.kind === "sync").length;
  $("status").textContent = `sprigs ${sprigs} · markers ${syncs} · collected ${scans.length}`;
  if (!syncs || sprigs < 6) return;
  scans.push(cols);
  if (scans.length > 60) scans.shift();
  const r = decodeOrnamentScans(scans) ?? decodeOrnamentScans(scans.map(reverseScan));
  if (r) show(r.text, r.repeatsUsed);
}

function show(text: string, repeats: number) {
  done = true;
  $("message").textContent = text;
  $("status").textContent = `read from ${repeats} repeat${repeats === 1 ? "" : "s"}`;
  document.body.classList.add("found");
  try { navigator.vibrate?.(120); } catch { /* optional */ }
  try { const u = new SpeechSynthesisUtterance(text); u.lang = /[а-яіїєґ]/i.test(text) ? "uk-UA" : "en-GB"; speechSynthesis.speak(u); } catch { /* no voice offline */ }
}

/** The strip inside the guide box, scaled so a 30 cm stretch of band is about 1600 px wide. */
function grabStrip(src: CanvasImageSource, sw: number, sh: number): ImageData {
  const gx = sw * 0.04, gw = sw * 0.92, gh = Math.min(sh * 0.3, gw * 0.16), gy = (sh - gh) / 2;
  const scale = Math.min(1, 1600 / gw), c = document.createElement("canvas");
  c.width = Math.round(gw * scale); c.height = Math.round(gh * scale);
  const ctx = c.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(src, gx, gy, gw, gh, 0, 0, c.width, c.height);
  return ctx.getImageData(0, 0, c.width, c.height);
}

async function startCamera() {
  const video = $<HTMLVideoElement>("video");
  try {
    video.srcObject = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment", width: { ideal: 1920 } }, audio: false });
    await video.play();
    $("hint").textContent = "Hold the band level inside the box and sweep slowly along it.";
    const tick = () => { if (done) return; if (video.videoWidth) addFrame(grabStrip(video, video.videoWidth, video.videoHeight)); setTimeout(tick, 250); };
    tick();
  } catch {
    $("hint").textContent = "Live camera is not available here: use “Take a photo” (works offline).";
  }
}

$<HTMLInputElement>("photo").addEventListener("change", async (e) => {
  const f = (e.target as HTMLInputElement).files?.[0]; if (!f) return;
  const bmp = await createImageBitmap(f);
  // a whole photo: try the full frame and the centre strip
  const c = document.createElement("canvas"); c.width = Math.min(2400, bmp.width); c.height = Math.round(bmp.height * (c.width / bmp.width));
  const ctx = c.getContext("2d", { willReadFrequently: true })!; ctx.drawImage(bmp, 0, 0, c.width, c.height);
  addFrame(ctx.getImageData(0, 0, c.width, c.height));
  if (!done) addFrame(grabStrip(c, c.width, c.height));
  if (!done) $("hint").textContent = "Collected — take another photo further along the band.";
});
$("again").addEventListener("click", () => { scans.length = 0; done = false; document.body.classList.remove("found"); $("message").textContent = ""; startCamera(); });
if ("serviceWorker" in navigator && location.protocol === "https:") navigator.serviceWorker.register("sw.js").catch(() => {});
startCamera();
