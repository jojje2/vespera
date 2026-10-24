import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.join(__dirname, '..');

const files = [
  'src/audio.js',
  'src/quests_npcs.js',
  'src/world_data.js',
  'src/save_system.js',
  'src/entities.js',
  'src/renderer.js',
  'src/game.js'
];

let bundle = '(() => {\n"use strict";\n\n';

for (const file of files) {
  let content = fs.readFileSync(path.join(root, file), 'utf8');

  // Strip imports
  content = content.replace(/^import\s+.*?from\s+['"].*?['"];?\s*$/gm, '');
  content = content.replace(/^import\s+['"].*?['"];?\s*$/gm, '');

  // Strip exports
  content = content.replace(/^export\s+(const|let|var|function|class)\s+/gm, '$1 ');
  content = content.replace(/^export\s+default\s+/gm, '');
  content = content.replace(/^export\s*\{[^}]*\};?\s*$/gm, '');

  bundle += `// === FILE: ${file} ===\n${content}\n\n`;
}

// Make init immediate and reliable
bundle += `
if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', () => {
    if (!window.vesperaGame) window.vesperaGame = new Game();
  });
} else {
  if (!window.vesperaGame) window.vesperaGame = new Game();
}
})();
`;

fs.writeFileSync(path.join(root, 'bundle.js'), bundle, 'utf8');
console.log('bundle.js built successfully. Size:', bundle.length, 'bytes');
