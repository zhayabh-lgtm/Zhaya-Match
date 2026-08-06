import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { generateWidgetScript } from '../src/widget/standaloneWidget';

function buildStaticWidget() {
  console.log('[Widget Build] Generating static standalone widget...');

  const rawScript = generateWidgetScript('');
  if (!rawScript || rawScript.trim().length === 0) {
    throw new Error('[Widget Build Failure] Generated widget script is empty!');
  }

  // Create deterministic hash of raw code
  const hash = crypto.createHash('sha256').update(rawScript).digest('hex').substring(0, 8);
  const versionComment = `/* Zhaya Match Standalone Widget v3.0 (hash: ${hash}) */\n`;
  const finalScript = versionComment + rawScript;

  const publicDir = path.join(process.cwd(), 'public');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  const publicWidgetPath = path.join(publicDir, 'widget.js');
  fs.writeFileSync(publicWidgetPath, finalScript, 'utf-8');
  console.log(`[Widget Build] Wrote public/widget.js (${finalScript.length} bytes, hash: ${hash})`);

  const distDir = path.join(process.cwd(), 'dist');
  if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
  }

  const distWidgetPath = path.join(distDir, 'widget.js');
  fs.writeFileSync(distWidgetPath, finalScript, 'utf-8');
  console.log(`[Widget Build] Wrote dist/widget.js (${finalScript.length} bytes, hash: ${hash})`);

  // Compare files to guarantee 100% identity
  const publicContent = fs.readFileSync(publicWidgetPath, 'utf-8');
  const distContent = fs.readFileSync(distWidgetPath, 'utf-8');

  if (publicContent !== distContent) {
    throw new Error('[Widget Build Failure] public/widget.js and dist/widget.js do not match!');
  }

  console.log('[Widget Build Success] public/widget.js and dist/widget.js are identical and validated.');
}

buildStaticWidget();

