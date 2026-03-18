const fs = require('fs')
const path = require('path')

const filePath = path.join(__dirname, '..', 'app', 'report', 'page.js')
let content = fs.readFileSync(filePath, 'utf8')

// Find window.print() in JSX context (not in the HTML string)
const lines = content.split('\n')
for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('window.print()') && !lines[i].includes('window.onload')) {
        console.log(`Line ${i+1}:`, JSON.stringify(lines[i]))
    }
}
