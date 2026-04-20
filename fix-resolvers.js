const fs = require('fs');
const execSync = require('child_process').execSync;

const files = execSync('find src -name "*.tsx"').toString().trim().split('\n').filter(Boolean);

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  let newContent = content.replace(/resolver:\s*zodResolver\([^)]+\)(?!\s*as\s+any|\s*as\s+Resolver\s*<)/g, match => {
    return match + ' as any';
  });
  if (content !== newContent) {
    fs.writeFileSync(file, newContent, 'utf8');
    console.log('Fixed', file);
  }
}
