#!/usr/bin/env node

/**
 * Script para reemplazar automáticamente las imágenes de Next.js por SimpleImage
 * Uso: node scripts/replace-images.js
 */

const fs = require('fs');
const path = require('path');

// Configuración
const config = {
  // Archivos a procesar
  files: [
    'app/page.tsx',
    'app/product/[id]/page.tsx',
    'app/products/page.tsx',
    'components/cart-drawer.tsx',
    'components/services/ServiceDetail.tsx'
  ],
  
  // Patrones de reemplazo
  replacements: [
    {
      // Reemplazar import de Image
      from: /import Image from ['"]next\/image['"]/g,
      to: `import { SimpleImage } from '@/components/ui/simple-image'`
    },
    {
      // Reemplazar Image component con fill
      from: /<Image\s+src=\{([^}]+)\}\s+alt=\{([^}]+)\}\s+fill\s+([^>]*)\/>/g,
      to: '<SimpleImage src={$1} alt={$2} className="w-full h-full object-cover" $3/>'
    },
    {
      // Reemplazar Image component con layout="fill"
      from: /<Image\s+src=\{([^}]+)\}\s+alt=\{([^}]+)\}\s+layout=["']fill["']\s+([^>]*)\/>/g,
      to: '<SimpleImage src={$1} alt={$2} className="w-full h-full object-cover" $3/>'
    },
    {
      // Reemplazar Image component con width y height
      from: /<Image\s+src=\{([^}]+)\}\s+alt=\{([^}]+)\}\s+width=\{([^}]+)\}\s+height=\{([^}]+)\}\s+([^>]*)\/>/g,
      to: '<SimpleImage src={$1} alt={$2} width={$3} height={$4} $5/>'
    },
    {
      // Reemplazar Image component simple
      from: /<Image\s+src=\{([^}]+)\}\s+alt=\{([^}]+)\}\s+([^>]*)\/>/g,
      to: '<SimpleImage src={$1} alt={$2} $3/>'
    }
  ]
};

function processFile(filePath) {
  try {
    const fullPath = path.join(process.cwd(), filePath);
    
    if (!fs.existsSync(fullPath)) {
      console.log(`⚠️  Archivo no encontrado: ${filePath}`);
      return;
    }
    
    let content = fs.readFileSync(fullPath, 'utf8');
    let hasChanges = false;
    
    // Aplicar reemplazos
    config.replacements.forEach((replacement, index) => {
      const newContent = content.replace(replacement.from, replacement.to);
      if (newContent !== content) {
        content = newContent;
        hasChanges = true;
        console.log(`✅ Reemplazo ${index + 1} aplicado en ${filePath}`);
      }
    });
    
    // Guardar cambios
    if (hasChanges) {
      fs.writeFileSync(fullPath, content, 'utf8');
      console.log(`🎉 Archivo actualizado: ${filePath}`);
    } else {
      console.log(`ℹ️  Sin cambios en: ${filePath}`);
    }
    
  } catch (error) {
    console.error(`❌ Error procesando ${filePath}:`, error.message);
  }
}

function main() {
  console.log('🚀 Iniciando reemplazo de imágenes...\n');
  
  config.files.forEach(file => {
    processFile(file);
  });
  
  console.log('\n✨ Proceso completado!');
  console.log('\n📝 Notas importantes:');
  console.log('1. Revisa los archivos modificados para asegurar que los cambios sean correctos');
  console.log('2. Algunos componentes pueden necesitar ajustes manuales');
  console.log('3. Prueba la aplicación para verificar que las imágenes funcionen correctamente');
}

// Ejecutar si se llama directamente
if (require.main === module) {
  main();
}

module.exports = { processFile, config };
