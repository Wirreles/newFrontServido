import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'

const firebaseAdminConfig = {
  projectId: process.env.FIREBASE_PROJECT_ID || "servidodb2",
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
}

// Initialize Firebase Admin
const app = !getApps().length 
  ? initializeApp({
      credential: cert(firebaseAdminConfig),
      projectId: firebaseAdminConfig.projectId,
    })
  : getApps()[0]

const auth = getAuth(app)
const db = getFirestore(app)

export { app, auth, db } 