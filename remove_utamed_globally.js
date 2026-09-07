const fs = require('fs');
const path = require('path');

function replaceInFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let newContent = content;

  // Replace URLs and emails
  newContent = newContent.replace(/Student Portal\.com/gi, 'studentportal.com');
  newContent = newContent.replace(/wto\.Student Portal\.university/gi, 'studentportal.com');
  newContent = newContent.replace(/Student Portal\.university/gi, 'studentportal.com');
  
  // Replace names
  newContent = newContent.replace(/Student Portal/gi, 'Student Portal');
  newContent = newContent.replace(/Student Portal/gi, 'Student Portal');
  newContent = newContent.replace(/Student Portal/gi, 'Student Portal');

  if (content !== newContent) {
    fs.writeFileSync(filePath, newContent);
    console.log(`Updated: ${filePath}`);
  }
}

function walkDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      if (!['node_modules', '.git', 'dist', 'uploads'].includes(file)) {
        walkDir(fullPath);
      }
    } else {
      if (fullPath.endsWith('.js') || fullPath.endsWith('.jsx') || fullPath.endsWith('.html') || fullPath.endsWith('.env')) {
        replaceInFile(fullPath);
      }
    }
  }
}

walkDir(path.join(__dirname));
console.log('Global replacement finished.');
