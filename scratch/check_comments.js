const fs = require('fs');
const content = fs.readFileSync('d:\\Mis Documentos\\TRABAJOS\\OVO_COMPRAS\\public\\js\\app.js', 'utf8');
let inBlockComment = false;
let lines = content.split('\n');
for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    if (line.includes('/*')) inBlockComment = true;
    if (line.includes('*/')) inBlockComment = false;
}
console.log(`In block comment at end: ${inBlockComment}`);
