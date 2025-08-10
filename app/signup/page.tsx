"use client"

import type React from "react"
import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth"
import { doc, setDoc, serverTimestamp } from "firebase/firestore"
import { auth, db } from "@/lib/firebase"
import { sendWelcomeEmail, initEmailJS } from "@/lib/email-service"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Checkbox } from "@/components/ui/checkbox"
import { Loader2, Mail, Phone } from "lucide-react"

export default function SignupPage() {
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [name, setName] = useState("")
  const [accountType, setAccountType] = useState<"buyer" | "seller">("buyer")
  const [acceptTerms, setAcceptTerms] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const roleFromQuery = searchParams.get("role")
    if (roleFromQuery === "seller") {
      setAccountType("seller")
    } else {
      setAccountType("buyer")
    }
    
    // Inicializar EmailJS
    initEmailJS()
  }, [searchParams])

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden.")
      return
    }
    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.")
      return
    }
    if (!name.trim()) {
      setError("Por favor, ingresa tu nombre.")
      return
    }
    if (!email.trim()) {
      setError("Por favor, ingresa tu correo electrónico.")
      return
    }
    if (!phone.trim()) {
      setError("Por favor, ingresa tu número de teléfono.")
      return
    }
    if (!acceptTerms) {
      setError("Debes aceptar los términos y condiciones para continuar.")
      return
    }

    setLoading(true)
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password)
      const user = userCredential.user

      await updateProfile(user, { displayName: name })

      const userData: { [key: string]: any } = {
        uid: user.uid,
        email: user.email,
        phone: phone.trim(), // Campo interno para teléfono
        name: name,
        role: accountType === "seller" ? "seller" : "user",
        isActive: true,
        createdAt: serverTimestamp(),
        termsAccepted: true,
        termsAcceptedAt: serverTimestamp(),
      }

      if (accountType === "seller") {
        userData.isSubscribed = false
        userData.productUploadLimit = 0
      }

      await setDoc(doc(db, "users", user.uid), userData)

      // Enviar email de bienvenida
      await sendWelcomeEmail({
        user_name: name,
        user_email: email,
        account_type: accountType
      })

      if (accountType === "seller") {
        router.push("/dashboard/seller") // Redirect sellers to subscription page
      } else {
        router.push("/") // Redirect buyers to homepage
      }
    } catch (err: any) {
      if (err.code === "auth/email-already-in-use") {
        setError("Este correo electrónico ya está en uso.")
      } else if (err.code === "auth/weak-password") {
        setError("La contraseña es demasiado débil.")
      } else {
        setError("Error al crear la cuenta. Por favor, inténtalo de nuevo.")
        console.error("Signup error:", err)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl text-center">Crear una cuenta en Servido</CardTitle>
          <CardDescription className="text-center">
            Elige tu tipo de cuenta e ingresa tus datos para registrarte.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignup} className="space-y-6">
            <div>
              <Label className="mb-2 block">Tipo de Cuenta</Label>
              <RadioGroup
                defaultValue="buyer"
                value={accountType}
                onValueChange={(value: "buyer" | "seller") => setAccountType(value)}
                className="flex space-x-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="buyer" id="buyer" />
                  <Label htmlFor="buyer">Quiero Comprar</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="seller" id="seller" />
                  <Label htmlFor="seller">Quiero Vender</Label>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Nombre Completo</Label>
              <Input
                id="name"
                type="text"
                placeholder="Juan Pérez"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            {/* Campo de email - visible solo internamente */}
            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Correo Electrónico
                <span className="text-xs text-gray-500">(solo interno)</span>
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="tu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            {/* Campo de teléfono - visible solo internamente */}
            <div className="space-y-2">
              <Label htmlFor="phone" className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Número de Teléfono
                <span className="text-xs text-gray-500">(solo interno)</span>
              </Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+54 9 11 1234-5678"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                placeholder="Mínimo 6 caracteres"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar Contraseña</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Repite tu contraseña"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>

            {/* Checkbox de términos y condiciones */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="terms"
                checked={acceptTerms}
                onCheckedChange={(checked) => setAcceptTerms(checked as boolean)}
                required
              />
              <Label htmlFor="terms" className="text-sm">
                Acepto los{" "}
                <Link 
                  href="/terminos-y-condiciones" 
                  target="_blank"
                  className="text-blue-600 hover:underline font-medium"
                >
                  términos y condiciones
                </Link>{" "}
                de Servido
              </Label>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}
            
            <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Crear Cuenta"}
            </Button>
          </form>
          <p className="mt-6 text-center text-sm">
            ¿Ya tienes una cuenta?{" "}
            <Link href="/login" className="font-medium text-blue-600 hover:underline">
              Inicia sesión aquí
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
