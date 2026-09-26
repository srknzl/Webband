// Browser end-to-end tests. The game itself stays build-free: npm lives here (and in
// native/), the page is served straight from the repo root by Python's static server —
// the same thing .claude/launch.json and a player's `index.html` double-click amount to.
//
// Every spec runs in every project, so the language projects are the translation test:
// the fixture fails a run that looked up a key missing from the dictionary, or painted a
// `{0}`, `undefined` or a Turkish-only letter onto an English/Indonesian screen.
const { defineConfig, devices } = require('@playwright/test');

const PORT = 8124;
const desktop = { ...devices['Desktop Chrome'], viewport: { width: 1366, height: 768 } };
// Pixel 7 = Chromium with touch and `pointer: coarse`: the bottom nav, "⋯ Daha", lite mode
// and the battle sticks all switch on exactly as on a phone (412 px wide).
const phone = devices['Pixel 7'];

module.exports = defineConfig({
    testDir: './specs',
    timeout: 60_000,
    expect: { timeout: 10_000 },
    fullyParallel: true,
    // Locally, 4 at a time: the default is half the logical cores (8 here), and every WebGL
    // test renders on SwiftShader — the CPU — so 8 Chromiums pinned the machine at 100% and
    // starved each other into timeouts. CI keeps the default.
    workers: process.env.CI ? undefined : 4,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 1 : 0,
    reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
    use: {
        baseURL: `http://127.0.0.1:${PORT}/`,
        // The worker serves cache-first; a test must always see the files on disk.
        serviceWorkers: 'block',
        trace: 'retain-on-failure',
        screenshot: 'only-on-failure'
    },
    webServer: {
        command: `python3 -m http.server ${PORT} --bind 127.0.0.1`,
        cwd: '..',
        url: `http://127.0.0.1:${PORT}/index.html`,
        reuseExistingServer: !process.env.CI,
        stdout: 'ignore',
        stderr: 'ignore'
    },
    projects: [
        { name: 'tr-desktop', use: { ...desktop, lang: 'tr' } },
        { name: 'tr-phone', use: { ...phone, lang: 'tr' } },
        { name: 'en-phone', use: { ...phone, lang: 'en' } },
        { name: 'id-desktop', use: { ...desktop, lang: 'id' } }
    ]
});
