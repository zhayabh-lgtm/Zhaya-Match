import fs from 'fs';
import path from 'path';
import { generateWidgetScript } from '../src/widget/standaloneWidget';

function buildStaticWidget() {
  console.log('[Widget Build] Generating static public/widget.js...');
  const scriptContent = generateWidgetScript('');

  const publicDir = path.join(process.cwd(), 'public');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  const publicWidgetPath = path.join(publicDir, 'widget.js');
  fs.writeFileSync(publicWidgetPath, scriptContent, 'utf-8');
  console.log(`[Widget Build] Wrote static widget to ${publicWidgetPath} (${scriptContent.length} bytes)`);

  const distDir = path.join(process.cwd(), 'dist');
  if (fs.existsSync(distDir)) {
    const distWidgetPath = path.join(distDir, 'widget.js');
    fs.writeFileSync(distWidgetPath, scriptContent, 'utf-8');
    console.log(`[Widget Build] Wrote static widget to ${distWidgetPath} (${scriptContent.length} bytes)`);
  }
}

buildStaticWidget();
