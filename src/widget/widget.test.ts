import fs from 'fs';
import path from 'path';
import { JSDOM } from 'jsdom';
import { generateWidgetScript } from './standaloneWidget';

async function runWidgetTest() {
  console.log('[Widget Test] Initializing test for generated public/widget.js...');

  // 1. Ensure widget script is generated
  const scriptContent = generateWidgetScript('');
  if (!scriptContent || scriptContent.length < 500) {
    throw new Error('[Widget Test Failure] Widget script generation returned insufficient code.');
  }

  // 2. Setup JSDOM environment
  const dom = new JSDOM(`
    <!DOCTYPE html>
    <html>
      <head></head>
      <body>
        <div class="prod-option option-input option-Tamanho">
          <div class="btn-medidas"></div>
        </div>
      </body>
    </html>
  `, {
    url: 'http://localhost/preview?admin_preview=1',
    runScripts: 'dangerously',
    resources: 'usable',
  });

  const { window } = dom;
  const { document } = window;

  // Mock localStorage
  const storageMap = new Map<string, string>();
  window.localStorage.setItem = (key: string, value: string) => storageMap.set(key, value);
  window.localStorage.getItem = (key: string) => storageMap.get(key) || null;
  window.localStorage.removeItem = (key: string) => storageMap.delete(key);

  // Define admin preview snapshot
  const mockConfig = {
    appearance: {
      buttonText: 'Tabela de Medidas',
      buttonIcon: 'ruler',
      buttonBgColor: '#000000',
      buttonTextColor: '#ffffff',
      overlayOpacity: 0.8,
      backgroundColor: '#121212',
      textColor: '#ffffff',
    },
    texts: {
      calculateButtonText: 'Encontrar meu tamanho',
      recalculateButtonText: 'Calcular novamente',
      closeButtonText: 'Fechar',
    },
    productTypes: [
      {
        id: 'type-jaqueta-1',
        name: 'Jaqueta Biker Couro',
        category: 'upper_body',
        fitType: 'regular',
        active: true,
        useIconInSelector: true,
        iconUrl: 'https://example.com/icon.png',
        measurements: ['bust', 'waist'],
        sizes: [
          {
            id: 'sz-1',
            label: 'P',
            order: 1,
            ranges: {
              bust: { min: 80, max: 86 },
              waist: { min: 62, max: 68 },
            },
          },
          {
            id: 'sz-2',
            label: 'M',
            order: 2,
            ranges: {
              bust: { min: 87, max: 93 },
              waist: { min: 69, max: 75 },
            },
          },
          {
            id: 'sz-3',
            label: 'G',
            order: 3,
            ranges: {
              bust: { min: 94, max: 100 },
              waist: { min: 76, max: 82 },
            },
          },
        ],
      },
    ],
    measurementHelps: {
      bust: { label: 'Busto' },
      waist: { label: 'Cintura' },
    },
    allowedDomains: ['*'],
  };

  (window as any).__ZHAYA_MATCH_ADMIN_PREVIEW__ = {
    config: mockConfig,
    revision: 1,
    sessionId: 'test-session-123',
    timestamp: Date.now(),
  };

  let referenceErrorCount = 0;
  window.addEventListener('error', (event: any) => {
    console.error('[Widget Test Error Captured]', event.error || event.message);
    referenceErrorCount++;
  });

  // 3. Execute script inside JSDOM context
  try {
    window.eval(scriptContent);
    document.dispatchEvent(new window.Event('DOMContentLoaded'));
  } catch (err: any) {
    throw new Error(`[Widget Test Failure] Script execution failed: ${err.message}`);
  }

  if (referenceErrorCount > 0) {
    throw new Error(`[Widget Test Failure] Script triggered ${referenceErrorCount} uncaught error(s).`);
  }

  // 4. Validate trigger button injection
  const triggerBtn = document.querySelector('#zhaya-match-trigger') as HTMLElement;
  if (!triggerBtn) {
    throw new Error('[Widget Test Failure] Trigger button (#zhaya-match-trigger) was not injected into DOM.');
  }
  console.log('[Widget Test] Trigger button successfully injected.');

  // 5. Open modal and click start button
  triggerBtn.click();
  const overlay = document.getElementById('zhaya-match-modal-overlay');
  if (!overlay) {
    throw new Error('[Widget Test Failure] Modal overlay did not open on trigger click.');
  }
  console.log('[Widget Test] Modal opened successfully.');

  const startBtn = document.getElementById('zhaya-start-btn');
  if (!startBtn) {
    throw new Error('[Widget Test Failure] Start button (#zhaya-start-btn) not found in Step 0.');
  }
  startBtn.click();
  console.log('[Widget Test] Step 0 start button clicked.');

  // 6. Select Product Type
  const typeCard = document.querySelector('.zhaya-type-card[data-type-id="type-jaqueta-1"]') as HTMLElement;
  if (!typeCard) {
    throw new Error('[Widget Test Failure] Product type card was not rendered.');
  }
  typeCard.click();

  // 7. Verify step 2 (inputs rendered)
  const bustInput = document.querySelector('input.zhaya-input[data-key="bust"]') as HTMLInputElement;
  const waistInput = document.querySelector('input.zhaya-input[data-key="waist"]') as HTMLInputElement;
  const calcBtn = document.getElementById('zhaya-calc-btn') as HTMLElement;

  if (!bustInput || !waistInput || !calcBtn) {
    throw new Error('[Widget Test Failure] Inputs or calculate button not rendered in step 2.');
  }

  // Fill input values
  bustInput.value = '89';
  waistInput.value = '71';
  bustInput.dispatchEvent(new window.Event('input', { bubbles: true }));
  waistInput.dispatchEvent(new window.Event('input', { bubbles: true }));

  // 8. Click calculate button
  calcBtn.click();

  // 9. Confirm step 3 (Result) rendered with real motor output
  const recalcBtn = document.getElementById('zhaya-recalc-btn');
  const closeBtn = document.getElementById('zhaya-close-btn');

  if (!recalcBtn || !closeBtn) {
    throw new Error('[Widget Test Failure] Step 3 result screen (recalc/close buttons) not found after calculation.');
  }

  const resultText = overlay.textContent || '';
  if (!resultText.includes('M') && !resultText.includes('SUGERIDO')) {
    throw new Error(`[Widget Test Failure] Expected size 'M' recommendation not found in result text: "${resultText}"`);
  }

  console.log('[Widget Test Success] Widget executed calculation, rendered real motor result "M", and completed without errors.');
}

runWidgetTest().catch((err) => {
  console.error(err);
  process.exit(1);
});
