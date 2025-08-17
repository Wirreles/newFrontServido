const fs = require('fs');
const path = require('path');

// Función para crear un icono cuadrado con el logo centrado
function createIconSVG(size, logoPath) {
  const padding = Math.floor(size * 0.1); // 10% de padding
  const logoSize = size - (padding * 2);
  
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <!-- Fondo circular con color de tema -->
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#8b5cf6;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#7c3aed;stop-opacity:1" />
    </linearGradient>
  </defs>
  
  <!-- Fondo circular -->
  <circle cx="${size/2}" cy="${size/2}" r="${size/2}" fill="url(#bg)"/>
  
  <!-- Logo centrado -->
  <image 
    href="${logoPath}" 
    x="${padding}" 
    y="${padding}" 
    width="${logoSize}" 
    height="${logoSize}"
    preserveAspectRatio="xMidYMid meet"
  />
</svg>`;
}

// Función para crear icono maskable (con padding adicional)
function createMaskableIconSVG(size, logoPath) {
  const padding = Math.floor(size * 0.2); // 20% de padding para maskable
  const logoSize = size - (padding * 2);
  
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <!-- Fondo circular con color de tema -->
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#8b5cf6;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#7c3aed;stop-opacity:1" />
    </linearGradient>
  </defs>
  
  <!-- Fondo circular -->
  <circle cx="${size/2}" cy="${size/2}" r="${size/2}" fill="url(#bg)"/>
  
  <!-- Logo centrado -->
  <image 
    href="${logoPath}" 
    x="${padding}" 
    y="${padding}" 
    width="${logoSize}" 
    height="${logoSize}"
    preserveAspectRatio="xMidYMid meet"
  />
</svg>`;
}

// Función para crear icono simple (sin fondo)
function createSimpleIconSVG(size, logoPath) {
  const padding = Math.floor(size * 0.1);
  const logoSize = size - (padding * 2);
  
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <!-- Logo centrado -->
  <image 
    href="${logoPath}" 
    x="${padding}" 
    y="${padding}" 
    width="${logoSize}" 
    height="${logoSize}"
    preserveAspectRatio="xMidYMid meet"
  />
</svg>`;
}

// Función principal
async function generatePWAIcons() {
  try {
    console.log('🎨 Generando iconos PWA para Servido...');
    
    const publicDir = path.join(__dirname, '..', 'public');
    const imagesDir = path.join(publicDir, 'images');
    const logoPath = path.join(imagesDir, 'logo.png');
    
    // Verificar que existe el logo
    if (!fs.existsSync(logoPath)) {
      console.error('❌ No se encontró el logo en:', logoPath);
      return false;
    }
    
    console.log('✅ Logo encontrado:', logoPath);
    
    // Crear iconos SVG
    const iconSizes = [
      { size: 192, type: 'maskable', filename: 'logo-192.svg' },
      { size: 512, type: 'maskable', filename: 'logo-512.svg' },
      { size: 192, type: 'simple', filename: 'logo-192-simple.svg' },
      { size: 512, type: 'simple', filename: 'logo-512-simple.svg' }
    ];
    
    for (const icon of iconSizes) {
      let svgContent;
      
      if (icon.type === 'maskable') {
        svgContent = createMaskableIconSVG(icon.size, './logo.png');
      } else {
        svgContent = createSimpleIconSVG(icon.size, './logo.png');
      }
      
      const iconPath = path.join(imagesDir, icon.filename);
      fs.writeFileSync(iconPath, svgContent);
      console.log(`✅ Icono ${icon.size}x${icon.size} (${icon.type}) creado: ${icon.filename}`);
    }
    
    // Crear iconos PNG usando librería externa (opcional)
    console.log('\n📱 Para convertir SVG a PNG, puedes usar:');
    console.log('   - Herramientas online: https://convertio.co/svg-png/');
    console.log('   - Inkscape (gratuito): inkscape logo-192.svg --export-filename=logo-192.png');
    console.log('   - GIMP (gratuito): Abrir SVG y exportar como PNG');
    
    // Crear archivo de instrucciones
    const instructions = `# Instrucciones para generar iconos PNG

## Iconos SVG generados:
- logo-192.svg (192x192, maskable)
- logo-512.svg (512x512, maskable)  
- logo-192-simple.svg (192x192, simple)
- logo-512-simple.svg (512x512, simple)

## Convertir a PNG:

### Opción 1: Herramienta online
1. Ve a https://convertio.co/svg-png/
2. Sube el archivo SVG
3. Descarga como PNG
4. Renombra según el tamaño

### Opción 2: Inkscape (gratuito)
\`\`\`bash
inkscape logo-192.svg --export-filename=logo-192.png
inkscape logo-512.svg --export-filename=logo-512.png
\`\`\`

### Opción 3: GIMP (gratuito)
1. Abre el archivo SVG
2. Archivo > Exportar como
3. Selecciona formato PNG
4. Ajusta el tamaño si es necesario

## Archivos finales necesarios:
- logo-192.png (192x192)
- logo-512.png (512x512)

## Verificación:
- Los iconos deben ser cuadrados perfectos
- El logo debe estar centrado
- Los colores deben ser visibles en fondos claros y oscuros
`;

    const instructionsPath = path.join(publicDir, 'PWA-ICONS-INSTRUCTIONS.md');
    fs.writeFileSync(instructionsPath, instructions);
    console.log('\n📖 Instrucciones guardadas en: PWA-ICONS-INSTRUCTIONS.md');
    
    console.log('\n🎉 ¡Iconos SVG generados exitosamente!');
    console.log('📱 Ahora convierte los SVG a PNG siguiendo las instrucciones.');
    
    return true;
    
  } catch (error) {
    console.error('❌ Error generando iconos:', error);
    return false;
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  generatePWAIcons().then(success => {
    if (success) {
      console.log('\n✅ Proceso completado. Revisa la carpeta public/images/');
    } else {
      console.log('\n❌ Proceso falló. Revisa los errores arriba.');
    }
  });
}

module.exports = { generatePWAIcons };
