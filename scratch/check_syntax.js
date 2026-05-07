const fs = require('fs');
const content = fs.readFileSync('d:\\Mis Documentos\\TRABAJOS\\OVO_COMPRAS\\public\\js\\app.js', 'utf8');
let braces = 0;
let parens = 0;
let brackets = 0;
let backticks = 0;
let lines = content.split('\n');
for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    for (let char of line) {
        if (char === '{') braces++;
        if (char === '}') braces--;
        if (char === '(') parens++;
        if (char === ')') parens--;
        if (char === '[') brackets++;
        if (char === ']') brackets--;
        if (char === '`') backticks++;
    }
}
console.log(`Braces: ${braces}`);
console.log(`Parens: ${parens}`);
console.log(`Brackets: ${brackets}`);
console.log(`Backticks: ${backticks} (Should be even)`);
