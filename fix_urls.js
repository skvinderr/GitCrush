const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'client', 'src');

function walk(directory) {
  let results = [];
  const list = fs.readdirSync(directory);
  list.forEach(file => {
    let filePath = path.join(directory, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(filePath));
    } else if (filePath.endsWith('.js') || filePath.endsWith('.jsx')) {
      results.push(filePath);
    }
  });
  return results;
}

const files = walk(dir);

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let newContent = content;
  
  // Undo bad powershell replaces if there were any, some strings ended up like '{API}/api/discover?..." }, { credentials: `include" })'
  newContent = newContent.replace(/\`include"/g, '"include"');
  newContent = newContent.replace(/\`POST"/g, '"POST"');
  newContent = newContent.replace(/\`DELETE"/g, '"DELETE"');
  
  fs.writeFileSync(file, newContent);
});

console.log("Fixing done");
