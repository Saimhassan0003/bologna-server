const fs = require('fs');
const path = require('path');

function replaceInDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      if (file !== 'node_modules') replaceInDir(fullPath);
    } else if (fullPath.endsWith('.jsx') || fullPath.endsWith('.js')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      
      // We will replace common Tailwind red classes with blue classes
      // We skip border-red-500 and text-red-500 as they are often used for errors
      const replacements = [
        ['bg-red-700', 'bg-blue-700'],
        ['bg-red-800', 'bg-blue-800'],
        ['hover:bg-red-700', 'hover:bg-blue-700'],
        ['hover:bg-red-800', 'hover:bg-blue-800'],
        ['text-red-700', 'text-blue-700'],
        ['text-red-800', 'text-blue-800'],
        ['border-red-700', 'border-blue-700'],
        ['border-red-800', 'border-blue-800'],
        ['shadow-red-', 'shadow-blue-'],
        ['border-red-100', 'border-blue-100'],
        ['border-red-200', 'border-blue-200'],
        ['bg-red-50', 'bg-blue-50'],
        ['text-red-50', 'text-blue-50'],
        ['hover:bg-red-50', 'hover:bg-blue-50'],
        ['hover:text-red-500', 'hover:text-blue-500'],
        ['text-red-400', 'text-blue-400'],
        ['border-red-400', 'border-blue-400'],
        ['bg-red-100', 'bg-blue-100'],
        ['bg-red-200', 'bg-blue-200'],
      ];

      let newContent = content;
      for (const [red, blue] of replacements) {
        newContent = newContent.split(red).join(blue);
      }
      
      if (content !== newContent) {
        fs.writeFileSync(fullPath, newContent);
        console.log(`Updated ${fullPath}`);
      }
    }
  }
}

replaceInDir(path.join(__dirname, 'client', 'src'));
