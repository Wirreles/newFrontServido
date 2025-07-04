"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect, useCallback } from "react"
import { onAuthStateChanged, signOut, type User as FirebaseUser } from "firebase/auth"
import { doc, getDoc } from "firebase/firestore"
import { auth, db } from "@/lib/firebase"
import { useRouter } from "next/navigation"

interface UserProfile {
  firebaseUser: FirebaseUser
  role?: "user" | "seller" | "admin"
  isSubscribed?: boolean
  productUploadLimit?: number
  photoURL?: string
  photoPath?: string
}

interface AuthContextType {
  currentUser: UserProfile | null
  authLoading: boolean
  handleLogout: () => Promise<void>
  getDashboardLink: () => string
  getVenderLink: () => string
  refreshUserProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const router = useRouter()

  // Function to refresh user profile data from Firestore
  const refreshUserProfile = useCallback(async () => {
    const user = auth.currentUser
    if (user) {
      const userDocRef = doc(db, "users", user.uid)
      const userDocSnap = await getDoc(userDocRef)
      if (userDocSnap.exists()) {
        const userData = userDocSnap.data()
        setCurrentUser({
          firebaseUser: user,
          role: userData.role,
          isSubscribed: userData.isSubscribed || false,
          productUploadLimit: userData.productUploadLimit || 0,
          photoURL: userData.photoURL || user.photoURL || undefined,
          photoPath: userData.photoPath || undefined,
        })
      } else {
        setCurrentUser({
          firebaseUser: user,
          role: "user",
          isSubscribed: false,
          productUploadLimit: 0,
          photoURL: user.photoURL || undefined,
          photoPath: undefined,
        })
      }
    } else {
      setCurrentUser(null)
    }
  }, [])

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const userDocRef = doc(db, "users", user.uid)
        const userDocSnap = await getDoc(userDocRef)
        if (userDocSnap.exists()) {
          const userData = userDocSnap.data()
          setCurrentUser({
            firebaseUser: user,
            role: userData.role,
            isSubscribed: userData.isSubscribed || false,
            productUploadLimit: userData.productUploadLimit || 0,
            photoURL: userData.photoURL || user.photoURL || undefined,
            photoPath: userData.photoPath || undefined,
          })
        } else {
          setCurrentUser({
            firebaseUser: user,
            role: "user",
            isSubscribed: false,
            productUploadLimit: 0,
            photoURL: user.photoURL || undefined,
            photoPath: undefined,
          })
        }
      } else {
        setCurrentUser(null)
      }
      setAuthLoading(false)
    })
    return () => unsubscribe()
  }, [])

  const handleLogout = useCallback(async () => {
    try {
      await signOut(auth)
      router.push("/login")
    } catch (error) {
      console.error("Error signing out:", error)
    }
  }, [router])

  const getDashboardLink = useCallback(() => {
    if (!currentUser) return "/login"
    switch (currentUser.role) {
      case "admin":
        return "/admin"
      case "seller":
        return "/dashboard/seller"
      default:
        return "/dashboard/buyer"
    }
  }, [currentUser])

  const getVenderLink = useCallback(() => {
    if (!currentUser) return "/signup?role=seller"
    if (currentUser.role === "seller") return "/dashboard/seller"
    return "/signup?role=seller&prompt=true"
  }, [currentUser])

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        authLoading,
        handleLogout,
        getDashboardLink,
        getVenderLink,
        refreshUserProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}