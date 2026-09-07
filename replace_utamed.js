const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'utils', 'emailService.js');
let content = fs.readFileSync(filePath, 'utf8');

// Replace variations of Student Portal with Student Portal
content = content.replace(/Student Portal University/g, 'Student Portal');
content = content.replace(/Student Portal/g, 'Student Portal');
content = content.replace(/Student Portal Admissions/g, 'Student Portal');
// Replace standalone Student Portal but ignore emails (like @studentportal.com or @studentportal.com)
content = content.replace(/\bStudent Portal\b(?!\.com|\.university)/g, 'Student Portal');

fs.writeFileSync(filePath, content);
console.log('Replaced Student Portal with Student Portal in emailService.js');
