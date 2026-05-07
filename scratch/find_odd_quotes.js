const fs = require('fs');
const content = fs.readFileSync('d:\\Mis Documentos\\TRABAJOS\\OVO_COMPRAS\\public\\js\\app.js', 'utf8');
let lines = content.split('\n');
for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    let quotes = 0;
    for (let char of line) {
        if (char === '"') quotes++;
    }
    if (quotes % 2 !== 0) {
        // Only if it doesn't have a backtick on that line that might be starting a multiline string
        if (!line.includes('`')) {
            console.log(`Odd double quotes on line ${i + 1}: ${line}`);
        }
    }
}
