/**
 * Prerendering Script for SEO
 * Generates static HTML for all routes to serve to search engine crawlers
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Routes to prerender
const routes = [
  '/',
  '/how-to-become-driver',
  '/regional-laws',
  '/utilities',
  '/about',
  '/faq'
];

// Read the built index.html
const distPath = path.resolve(__dirname, '../dist');
const indexPath = path.join(distPath, 'index.html');

// Ensure dist directory exists
if (!fs.existsSync(distPath)) {
  console.error('❌ Error: dist directory not found. Run `npm run build` first.');
  process.exit(1);
}

// Read the base HTML
let baseHtml = fs.readFileSync(indexPath, 'utf-8');

// Route metadata for prerendering
const routeMetadata = {
  '/': {
    title: 'Bandi NCC',
    description: 'Trova tutti i bandi NCC d\'Italia in un unico posto. Licenze disponibili, scadenze e informazioni aggiornate per ogni città.',
    canonical: 'https://bandincc.it/'
  },
  '/how-to-become-driver': {
    title: 'Come diventare autista NCC | BANDI NCC',
    description: 'Guida completa per diventare autista NCC in Italia: requisiti, esami, documentazione e procedure per ottenere la licenza.',
    canonical: 'https://bandincc.it/how-to-become-driver'
  },
  '/regional-laws': {
    title: 'Leggi Regionali NCC | BANDI NCC',
    description: 'Normative e leggi regionali per licenze NCC in Italia. Requisiti specifici e regolamenti per ogni regione italiana.',
    canonical: 'https://bandincc.it/regional-laws'
  },
  '/utilities': {
    title: 'Strumenti e Utilità NCC | BANDI NCC',
    description: 'Strumenti utili, calcolatori e risorse per la richiesta di licenze NCC. Semplifica il processo con le nostre utilità.',
    canonical: 'https://bandincc.it/utilities'
  },
  '/about': {
    title: 'Chi Siamo | BANDI NCC',
    description: 'La piattaforma completa per trovare bandi e licenze NCC in Italia. Informazioni centralizzate da tutte le regioni e comuni.',
    canonical: 'https://bandincc.it/about'
  },
  '/faq': {
    title: 'FAQ - Domande Frequenti | BANDI NCC',
    description: 'Risposte alle domande più comuni su licenze NCC, requisiti, scadenze e procedure di domanda in Italia.',
    canonical: 'https://bandincc.it/faq'
  }
};

/**
 * Generate prerendered HTML for a specific route
 */
function generatePrerenderHtml(route, metadata) {
  let html = baseHtml;
  
  // Update title
  html = html.replace(
    /<title>.*?<\/title>/,
    `<title>${metadata.title}</title>`
  );
  
  // Update meta description
  html = html.replace(
    /<meta\s+name="description"\s+content="[^"]*"\s*\/?>/,
    `<meta name="description" content="${metadata.description}" />`
  );
  
  // Update canonical URL
  html = html.replace(
    /<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/,
    `<link rel="canonical" href="${metadata.canonical}" />`
  );
  
  // Update og:url
  html = html.replace(
    /<meta\s+property="og:url"\s+content="[^"]*"\s*\/?>/,
    `<meta property="og:url" content="${metadata.canonical}" />`
  );
  
  // Update og:title
  html = html.replace(
    /<meta\s+property="og:title"\s+content="[^"]*"\s*\/?>/,
    `<meta property="og:title" content="${metadata.title}" />`
  );
  
  // Update og:description
  html = html.replace(
    /<meta\s+property="og:description"\s+content="[^"]*"\s*\/?>/,
    `<meta property="og:description" content="${metadata.description}" />`
  );
  
  // Update twitter:title
  html = html.replace(
    /<meta\s+name="twitter:title"\s+content="[^"]*"\s*\/?>/,
    `<meta name="twitter:title" content="${metadata.title}" />`
  );
  
  // Update twitter:description
  html = html.replace(
    /<meta\s+name="twitter:description"\s+content="[^"]*"\s*\/?>/,
    `<meta name="twitter:description" content="${metadata.description}" />`
  );
  
  // Add prerender meta tag for crawlers
  if (!html.includes('prerender-status-code')) {
    html = html.replace(
      '</head>',
      '  <meta name="prerender-status-code" content="200" />\n  <meta name="fragment" content="!" />\n  </head>'
    );
  }
  
  return html;
}

/**
 * Main prerendering function
 */
function prerender() {
  console.log('🚀 Starting prerendering process...\n');
  
  routes.forEach(route => {
    const metadata = routeMetadata[route];
    const html = generatePrerenderHtml(route, metadata);
    
    // Create directory structure if needed
    let outputPath;
    if (route === '/') {
      outputPath = path.join(distPath, 'index.html');
    } else {
      const routePath = path.join(distPath, route);
      if (!fs.existsSync(routePath)) {
        fs.mkdirSync(routePath, { recursive: true });
      }
      outputPath = path.join(routePath, 'index.html');
    }
    
    // Write the prerendered HTML
    fs.writeFileSync(outputPath, html, 'utf-8');
    console.log(`✅ Prerendered: ${route} -> ${outputPath}`);
  });
  
  console.log('\n🎉 Prerendering completed successfully!');
  console.log('📄 Generated static HTML for all routes');
  console.log('🤖 Search engines will receive optimized content');
}

// Run prerendering
try {
  prerender();
} catch (error) {
  console.error('❌ Prerendering failed:', error);
  process.exit(1);
}
