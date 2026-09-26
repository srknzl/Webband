// POC A shell: one battle, switchable renderer, fixed-step sim + interpolation, a benchmark.
import { createSim, STEP, benchCamera, createStats } from '../sim/battle-sim.js';
import { loadTroopImages } from './assets.js';
import { CanvasRenderer } from './render-canvas.js';
import { PixiRenderer } from './render-pixi.js';

const $ = id => document.getElementById(id);
const host = $('host');
const opts = { renderer: 'pixi', perSide: 20, fps: 'screen', interp: true };
let sim, renderers = {}, active, cam = { x: 0, y: 0, zoom: 1 }, manualCam = false;
let bench = null, rolling = createStats(), lastDraw = 0, acc = 0, benchT = 0;
// ?timer drives the loop from setTimeout — only for headless/hidden previews where rAF
// never fires. Measurements taken this way are meaningless; it only proves the code runs.
const raf = location.search.includes('timer') ? cb => setTimeout(() => cb(performance.now()), 16) : requestAnimationFrame;


async function init() {
    const troops = await loadTroopImages();
    renderers.canvas1 = new CanvasRenderer(host, { troops }, { dpr: 1 });
    const dpr = Math.min(3, devicePixelRatio || 1);
    if (dpr > 1) renderers.canvasHi = new CanvasRenderer(host, { troops }, { dpr });
    try { renderers.pixi = await PixiRenderer.create(host, { troops }); }
    catch (e) { console.error(e); $('err').textContent = 'PixiJS başlatılamadı: ' + e.message; }
    const sel = $('renderer');
    for (const k in renderers) sel.add(new Option(renderers[k].name, k));
    sel.value = renderers.pixi ? 'pixi' : 'canvas1';
    newSim();
    setRenderer(sel.value);
    addEventListener('resize', resize);
    bindUi(); bindCamera();
    raf(frame);
}

// A hidden preview reports a 0x0 window; fall back so the camera math never divides by 0.
const vw = () => innerWidth || 800, vh = () => innerHeight || 450;
window.poc = { get sim() { return sim; }, get cam() { return cam; }, get active() { return active; } };   // console access
function newSim() { sim = createSim({ perSide: opts.perSide, seed: 1 }); acc = 0; }
function setRenderer(k) {
    opts.renderer = k; active = renderers[k];
    for (const r in renderers) renderers[r].setActive(r === k);
    resize();
    rolling = createStats();
}
function resize() { for (const r in renderers) renderers[r].resize(vw(), vh()); }

function frame(now) {
    raf(frame);
    // Frame-rate target: 'screen' draws every vsync (120 on ProMotion), 60/30 skip frames.
    if (opts.fps !== 'screen' && lastDraw && now - lastDraw < 1000 / opts.fps - 3) return;
    const interval = lastDraw ? now - lastDraw : 0;
    lastDraw = now;
    const dt = Math.min(0.1, interval / 1000);
    const w0 = performance.now();

    acc += dt;
    for (let n = 0; acc >= STEP && n < 8; n++) { sim.step(); acc -= STEP; }
    if (acc > STEP) acc = 0;   // fell too far behind (tab was hidden) — don't spiral
    // Interpolation off = the fixed step drawn as it is: motion judders whenever the display
    // rate isn't the step rate (120 Hz, 30 fps, a dropped frame). NOT what the game does today —
    // the game steps with a variable dt, which is time-correct without interpolation.
    const alpha = opts.interp ? acc / STEP : 1;
    const tMs = (sim.t - STEP + alpha * STEP) * 1000;

    if (bench) benchT += dt;
    if (bench || !manualCam) cam = benchCamera(bench ? benchT : sim.t, sim, vw(), vh());
    active.render(sim, alpha, cam, tMs);
    const work = performance.now() - w0;

    if (interval) {
        rolling.add(interval, work);
        if (rolling.intervals.length > 120) { rolling.intervals.shift(); rolling.work.shift(); }
        if (bench && benchT > bench.warmup) bench.stats.add(interval, work);
    }
    if (bench && benchT >= bench.warmup + bench.seconds) finishBench();
    if (now - (frame.hud || 0) > 250) { frame.hud = now; hud(); }
}

function hud() {
    const r = rolling.report();
    $('stats').textContent =
        `${active.name}\n${r.fps} fps · kare p50 ${r.p50} ms · p95 ${r.p95} ms · takılma %${r.jankPct}\n` +
        `CPU (sim+çizim) p50 ${r.workP50} ms · p95 ${r.workP95} ms\n` +
        `birim ${sim.alive[0]}+${sim.alive[1]} · ok ${sim.arrows.length} · kıvılcım ${sim.sparks.length}` +
        (bench ? `\nÖLÇÜM: ${bench.label} ${Math.max(0, bench.warmup + bench.seconds - benchT).toFixed(0)} sn` : '');
}

// ---- Benchmark: fixed seed, fixed camera path, 1 s warm-up discarded.
let queue = [], results = [];
function startBench(label, seconds = 15) {
    newSim();
    bench = { label, seconds, warmup: 1, stats: createStats() };
    benchT = 0;
}
function finishBench() {
    const r = bench.stats.report();
    results.push({ label: bench.label, renderer: active.name, perSide: opts.perSide, fpsTarget: opts.fps, interp: opts.interp, ...r });
    bench = null;
    if (queue.length) queue.shift()();
    else showResults();
}
function runOne() {
    results = [];
    startBench(`${active.name} · ${opts.perSide}v${opts.perSide}`, 20);
}
function runSuite() {
    results = [];
    const keys = Object.keys(renderers), sizes = [20, 100, 250];
    queue = [];
    for (const k of keys) for (const n of sizes) queue.push(() => {
        opts.perSide = n; $('size').value = n; setRenderer(k); $('renderer').value = k;
        startBench(`${renderers[k].name} · ${n}v${n}`, 10);
    });
    queue.shift()();
}
function showResults() {
    const lines = [
        `WebBand POC A — ${new Date().toISOString().slice(0, 16)}`,
        `Cihaz: ${navigator.userAgent}`,
        `Ekran: ${innerWidth}x${innerHeight} CSS px, DPR ${devicePixelRatio}`,
        '',
        'çizici | ordu | fps | kare p50 | p95 | p99 | takılma% | CPU p50 | CPU p95',
        ...results.map(r => `${r.renderer} | ${r.perSide}v${r.perSide} | ${r.fps} | ${r.p50} | ${r.p95} | ${r.p99} | ${r.jankPct} | ${r.workP50} | ${r.workP95}`),
    ];
    $('result-text').value = lines.join('\n');
    $('results').hidden = false;
}

function bindUi() {
    $('renderer').onchange = e => setRenderer(e.target.value);
    $('size').onchange = e => { opts.perSide = +e.target.value; newSim(); };
    $('fps').onchange = e => { opts.fps = e.target.value === 'screen' ? 'screen' : +e.target.value; rolling = createStats(); };
    $('interp').onchange = e => { opts.interp = e.target.checked; };
    $('autocam').onclick = () => { manualCam = false; };
    $('bench').onclick = runOne;
    $('suite').onclick = runSuite;
    $('copy').onclick = async () => {
        try { await navigator.clipboard.writeText($('result-text').value); $('copy').textContent = 'Kopyalandı'; }
        catch { $('result-text').select(); document.execCommand('copy'); $('copy').textContent = 'Kopyalandı'; }
        setTimeout(() => { $('copy').textContent = 'Kopyala'; }, 1500);
    };
    $('close').onclick = () => { $('results').hidden = true; };
}

// Drag to pan, pinch / wheel to zoom. Any touch switches the camera to manual until
// "Oto kamera" is pressed; a running benchmark ignores it.
function bindCamera() {
    const pts = new Map();
    let pinch = null;
    host.addEventListener('pointerdown', e => { pts.set(e.pointerId, { x: e.clientX, y: e.clientY }); host.setPointerCapture(e.pointerId); manualCam = true; });
    host.addEventListener('pointermove', e => {
        const p = pts.get(e.pointerId); if (!p || bench) return;
        if (pts.size === 1) { cam.x -= (e.clientX - p.x) / cam.zoom; cam.y -= (e.clientY - p.y) / cam.zoom; }
        p.x = e.clientX; p.y = e.clientY;
        if (pts.size === 2) {
            const [a, b] = [...pts.values()], d = Math.hypot(a.x - b.x, a.y - b.y);
            if (pinch) cam.zoom = Math.max(0.2, Math.min(4, cam.zoom * d / pinch));
            pinch = d;
        }
    });
    const up = e => { pts.delete(e.pointerId); pinch = null; };
    host.addEventListener('pointerup', up); host.addEventListener('pointercancel', up);
    host.addEventListener('wheel', e => { e.preventDefault(); manualCam = true; cam.zoom = Math.max(0.2, Math.min(4, cam.zoom * Math.exp(-e.deltaY * 0.001))); }, { passive: false });
}

init().catch(e => { console.error(e); $('err').textContent = e.message; });
