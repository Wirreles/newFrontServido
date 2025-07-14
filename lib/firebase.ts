// lib/firebase.ts
import { initializeApp, getApps, getApp } from "firebase/app"
import { getAuth } from "firebase/auth"
import { getFirestore } from "firebase/firestore"
import { getStorage } from "firebase/storage" 

const firebaseConfig = {
  // apiKey: "AIzaSyAYgX1p-h3crLj6JuSNtyujlZLkl98vCKo",
  // authDomain: "servidodb2.firebaseapp.com",
  // databaseURL: "https://servidodb2-default-rtdb.firebaseio.com",
  // projectId: "servidodb2",
  // storageBucket: "servidodb2.firebasestorage.app",
  // messagingSenderId: "156077856561",
  // appId: "1:156077856561:web:fd96c414b99d0c04efc210",
  // measurementId: "G-FE7STJ9XL3"

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
