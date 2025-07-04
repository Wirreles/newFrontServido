// lib/firebase.ts
import { initializeApp, getApps, getApp } from "firebase/app"
import { getAuth } from "firebase/auth"
import { getFirestore } from "firebase/firestore"
import { getStorage } from "firebase/storage" 

const firebaseConfig = {
  // apiKey: "AIzaSyALrNjTx21XRDxbw9OclvVPlB17zMeqLdk",
  // authDomain: "servidodb-e85ce.firebaseapp.com",
  // databaseURL: "https://servidodb-e85ce-default-rtdb.firebaseio.com",
  // projectId: "servidodb-e85ce",
  // storageBucket: "servidodb-e85ce.firebasestorage.app",
  // messagingSenderId: "400168016760",
  // appId: "1:400168016760:web:4a11786ee69e0e887d468d",
  // measurementId: "G-8FWP8NZJTE"

  apiKey: "AIzaSyCpGByP4yV91k0hm3TZX8P3NHQUuckNumw",
  authDomain: "app-servicios-e99de.firebaseapp.com",
  projectId: "app-servicios-e99de",
  storageBucket: "app-servicios-e99de.appspot.com",
  messagingSenderId: "281743607632",
  appId: "1:281743607632:web:11509479f18726330e0e55",
  measurementId: "G-0CTZQ2JPY2",
}

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp()
const auth = getAuth(app)
const db = getFirestore(app)
const storage = getStorage(app) // Initialize Firebase Storage

export { app, auth, db, storage } // Export storage
