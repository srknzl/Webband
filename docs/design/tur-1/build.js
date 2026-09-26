const fs = require('fs');
let h = fs.readFileSync('index.html', 'utf8');
for (const f of ['engine.js', 'app.js']) h = h.replace(`<script src="${f}"></script>`, () => `<script>\n${fs.readFileSync(f, 'utf8')}\n</script>`);
fs.writeFileSync('page.html', h);
