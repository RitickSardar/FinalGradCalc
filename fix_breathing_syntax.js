import fs from 'fs';
const p = 'src/components/tools/BoxBreathing.tsx';
let d = fs.readFileSync(p, 'utf8');
d = d.replace(/\\`/g, '`');
d = d.replace(/\\\$/g, '$');
fs.writeFileSync(p, d);