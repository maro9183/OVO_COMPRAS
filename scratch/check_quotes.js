const fs = require('fs');
const content = fs.readFileSync('d:\\Mis Documentos\\TRABAJOS\\OVO_COMPRAS\\public\\js\\app.js', 'utf8');
let single = 0;
let double = 0;
let backtick = 0;
let i = 0;
while (i < content.length) {
    let char = content[i];
    if (char === "'") single++;
    if (char === '"') double++;
    if (char === '`') backtick++;
    i++;
}
console.log(`Single: ${single}`);
console.log(`Double: ${double}`);
console.log(`Backtick: ${backtick}`);
