const fs = require('fs');
const path = require('path');

// Función para generar un SVG básico como screenshot
function generateScreenshotSVG(width, height, title, description) {
  return `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#8b5cf6;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#6366f1;stop-opacity:1" />
    </linearGradient>
  </defs>
  
  <rect width="100%" height="100%" fill="url(#bg)"/>
  
  <!-- Logo placeholder -->
  <circle cx="${width/2}" cy="${height/3}" r="60" fill="white" opacity="0.9"/>
  <text x="${width/2}" y="${height/3 + 20}" text-anchor="middle" fill="#8b5cf6" font-family="Arial, sans-serif" font-size="24" font-weight="bold">Servido</text>
  
  <!-- Título -->
  <text x="${width/2}" y="${height/2 + 20}" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="28" font-weight="bold">${title}</text>
  
  <!-- Descripción -->
  <text x="${width/2}" y="${height/2 + 60}" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="16" opacity="0.9">${description}</text>
  
  <!-- Dimensiones -->
  <text x="${width/2}" y="${height - 20}" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="12" opacity="0.7">${width}x${height}</text>
</svg>`;
}

// Crear directorio de screenshots si no existe
const screenshotsDir = path.join(__dirname, '../public/images/screenshots');
if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

// Generar screenshots con dimensiones correctas
const screenshots = [
  {
    filename: 'screenshot-mobile-1.png',
    width: 390,
    height: 844,
    title: 'Marketplace Servido',
    description: 'Descubre productos y servicios'
  },
  {
    filename: 'screenshot-tablet-1.png',
    width: 768,
    height: 1024,
    title: 'Servido App',
    description: 'Tu marketplace de confianza'
  },
  {
    filename: 'screenshot-desktop-1.png',
    width: 1280,
    height: 720,
    title: 'Servido Web',
    description: 'Experiencia completa en desktop'
  }
];

console.log('🎯 Generando screenshots para PWA...');

screenshots.forEach(screenshot => {
  const svgContent = generateScreenshotSVG(
    screenshot.width, 
    screenshot.height, 
    screenshot.title, 
    screenshot.description
  );
  
  const svgPath = path.join(screenshotsDir, screenshot.filename.replace('.png', '.svg'));
  fs.writeFileSync(svgPath, svgContent);
  
  console.log(`✅ Generado: ${screenshot.filename.replace('.png', '.svg')} (${screenshot.width}x${screenshot.height})`);
});

console.log('\n📱 Screenshots generados como SVG');
console.log('💡 Para convertirlos a PNG:');
console.log('   1. Abre cada archivo SVG en un editor de imágenes');
console.log('   2. Exporta como PNG con las dimensiones exactas');
console.log('   3. Reemplaza los archivos en public/images/screenshots/');
console.log('\n🔗 O usa herramientas online como:');
console.log('   - https://convertio.co/svg-png/');
console.log('   - https://cloudconvert.com/svg-to-png');
console.log('\n📋 Dimensiones requeridas:');
screenshots.forEach(s => {
  console.log(`   - ${s.filename}: ${s.width}x${s.height}`);
});
