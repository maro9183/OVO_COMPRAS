const fs = require('fs');
const content = fs.readFileSync('d:\\Mis Documentos\\TRABAJOS\\OVO_COMPRAS\\public\\js\\app.js', 'utf8');
let balance = 0;
let lines = content.split('\n');
for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    for (let char of line) {
        if (char === '{') balance++;
        if (char === '}') balance--;
    }
    if (balance < 0) {
        console.log(`Negative balance at line ${i + 1}: ${line}`);
        process.exit(1);
    }
}
console.log(`Final balance: ${balance}`);
if (balance !== 0) {
    console.log('UNBALANCED!');
}
