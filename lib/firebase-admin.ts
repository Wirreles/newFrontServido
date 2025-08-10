import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'

let app: any

// Solo inicializar Firebase Admin si las credenciales están disponibles
if (process.env.FIREBASE_ADMIN_CLIENT_EMAIL && process.env.FIREBASE_ADMIN_PRIVATE_KEY) {
  const firebaseAdminConfig = {
    projectId: process.env.FIREBASE_ADMIN_PROJECT_ID || "servidodb2",
    clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  }

  // Initialize Firebase Admin
  app = !getApps().length 
    ? initializeApp({
        credential: cert(firebaseAdminConfig),
        projectId: firebaseAdminConfig.projectId,
      })
    : getApps()[0]
} else {
  // En desarrollo local o cuando las credenciales no están disponibles
  if (!getApps().length) {
    app = initializeApp({
      projectId: process.env.FIREBASE_ADMIN_PROJECT_ID || "servidodb2",
    })
  } else {
    app = getApps()[0]
  }
}

const auth = getAuth(app)
const db = getFirestore(app)

export { app, auth, db } 