const { initializeApp } = require('firebase/app');
const { getFirestore, collection, addDoc, query, where, getDocs, serverTimestamp } = require('firebase/firestore');

// Configuración de Firebase (ajusta según tu configuración)
const firebaseConfig = {
  // Aquí deberías poner tu configuración de Firebase
  // Este script se ejecuta desde el servidor, así que usa las variables de entorno
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function initializeSubscriptionPricing() {
  try {
    console.log('🔍 Verificando si ya existe un precio de suscripción...');
    
    // Verificar si ya existe un precio activo
    const pricingRef = collection(db, 'subscriptionPricing');
    const q = query(pricingRef, where('isActive', '==', true));
    const snapshot = await getDocs(q);
    
    if (!snapshot.empty) {
      console.log('✅ Ya existe un precio de suscripción activo');
      const existingPricing = snapshot.docs[0].data();
      console.log(`💰 Precio actual: ARS ${existingPricing.price}`);
      return;
    }
    
    console.log('📝 Creando precio de suscripción por defecto...');
    
    // Crear precio por defecto
    const defaultPricing = {
      price: 29.99,
      isActive: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      createdBy: 'system-init',
      notes: 'Precio inicial configurado por el sistema'
    };
    
    const docRef = await addDoc(collection(db, 'subscriptionPricing'), defaultPricing);
    
    console.log('✅ Precio de suscripción creado exitosamente');
    console.log(`🆔 ID del documento: ${docRef.id}`);
    console.log(`💰 Precio: ARS ${defaultPricing.price}`);
    console.log(`📅 Creado: ${new Date().toISOString()}`);
    
  } catch (error) {
    console.error('❌ Error al inicializar precio de suscripción:', error);
    process.exit(1);
  }
}

// Ejecutar la función
initializeSubscriptionPricing()
  .then(() => {
    console.log('🎉 Inicialización completada');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Error fatal:', error);
    process.exit(1);
  });
