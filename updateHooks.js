const fs = require('fs');
const path = require('path');

const hooksDir = path.join(__dirname, 'frontend/src/hooks');
const files = fs.readdirSync(hooksDir).filter(f => f.endsWith('.js'));

files.forEach(file => {
    const filePath = path.join(hooksDir, file);
    let content = fs.readFileSync(filePath, 'utf8');

    if (!content.includes('useQuery')) return;
    if (content.includes('enabled: !!getAccessToken()')) return;

    // Add import if not present
    if (!content.includes('getAccessToken')) {
        content = content.replace(/import apiClient from '\.\.\/services\/apiClient';/, "import apiClient, { getAccessToken } from '../services/apiClient';");
    }

    // Add enabled property to useQuery calls
    content = content.replace(/useQuery\(\{/g, 'useQuery({\n        enabled: !!getAccessToken(),');

    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated ${file}`);
});
