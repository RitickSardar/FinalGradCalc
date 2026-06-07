import fs from 'fs';
const p = 'src/pages/tools/[...path].astro';
let d = fs.readFileSync(p, 'utf8');
if (!d.includes("'pomodoro'")) {
  d = d.replace("{ params: { path: 'flashcards' } },", "{ params: { path: 'flashcards' } },\n    { params: { path: 'pomodoro' } },");
  fs.writeFileSync(p, d);
}