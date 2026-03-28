const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'client', 'src');

function walk(directory) {
  let results = [];
  const list = fs.readdirSync(directory);
  list.forEach(file => {
    file = path.join(directory, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else if (file.endsWith('.js') || file.endsWith('.jsx')) {
      results.push(file);
    }
  });
  return results;
}

const files = walk(dir);
const VITE_API = '${import.meta.env.VITE_API_URL || "http://localhost:5000"}';

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let newContent = content;
  
  // Replace "http://localhost:5000/..."
  newContent = newContent.replace(/"http:\/\/localhost:5000([^"]*)"/g, '`${import.meta.env.VITE_API_URL || "http://localhost:5000"}$1`');
  
  // Replace `http://localhost:5000/...`
  newContent = newContent.replace(/`http:\/\/localhost:5000([^`]*)`/g, '`${import.meta.env.VITE_API_URL || "http://localhost:5000"}$1`');

  if (content !== newContent) {
    fs.writeFileSync(file, newContent);
    console.log(`Updated ${file}`);
  }
});

console.log("Done");
