"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import {
  collection,
  doc,
  getDoc,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Loader2, Send, ArrowLeft, Info } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

interface Chat {
  id: string
  productId: string
  buyerId: string
  sellerId: string
  buyerName: string
  sellerName: string
  buyerPhotoURL?: string // Added for user images
  sellerPhotoURL?: string // Added for user images
  productName: string
  productImageUrl?: string
  lastMessage?: string
  lastMessageTimestamp?: any
  createdAt: any
}

interface Message {
  id: string
  senderId: string
  senderName: string
  text: string
  timestamp: any
}

export default function ChatPage() {
  const params = useParams()
  const router = useRouter()
  const { currentUser, authLoading } = useAuth()
  const chatId = params.chatId as string

  const [chat, setChat] = useState<Chat | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!authLoading && !currentUser) {
      router.push("/login")
      return
    }

    if (chatId && currentUser) {
      const fetchChatAndListenToMessages = async () => {
        setLoading(true)
        setError(null)
        try {
          const chatDocRef = doc(db, "chats", chatId)
          const chatDocSnap = await getDoc(chatDocRef)

          if (!chatDocSnap.exists()) {
            setError("Chat no encontrado.")
            setLoading(false)
            return
          }

          const chatData = { id: chatDocSnap.id, ...chatDocSnap.data() } as Chat

          // Check if current user is part of this chat
          if (currentUser.uid !== chatData.buyerId && currentUser.uid !== chatData.sellerId) {
            setError("No tienes permiso para ver este chat.")
            setLoading(false)
            return
          }

          // Fetch buyer and seller photo URLs
          const buyerDoc = await getDoc(doc(db, "users", chatData.buyerId))
          const sellerDoc = await getDoc(doc(db, "users", chatData.sellerId))

          const buyerPhotoURL = buyerDoc.exists() ? buyerDoc.data().photoURL : undefined
          const sellerPhotoURL = sellerDoc.exists() ? sellerDoc.data().photoURL : undefined

          setChat({
            ...chatData,
            buyerPhotoURL,
            sellerPhotoURL,
          })

          // Listen for messages in real-time
          const messagesQuery = query(collection(db, "chats", chatId, "messages"), orderBy("timestamp", "asc"))
          const unsubscribe = onSnapshot(
            messagesQuery,
            (snapshot) => {
              const fetchedMessages = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Message)
              setMessages(fetchedMessages)
              setLoading(false)
            },
            (err) => {
              console.error("Error listening to messages:", err)
              setError("Error al cargar los mensajes.")
              setLoading(false)
            },
          )
          return () => unsubscribe() // Cleanup listener on unmount
        } catch (err) {
          console.error("Error fetching chat:", err)
          setError("Error al cargar el chat.")
          setLoading(false)
        }
      }
      fetchChatAndListenToMessages()
    }
  }, [chatId, currentUser, authLoading, router])

  useEffect(() => {
    // Scroll to bottom when messages load or new message arrives
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || !currentUser || !chat) return

    setSending(true)
    setError(null)

    try {
      const messagesCollectionRef = collection(db, "chats", chatId, "messages")
      await addDoc(messagesCollectionRef, {
        senderId: currentUser.uid,
        senderName: currentUser.displayName || currentUser.email?.split("@")[0] || "Usuario",
        text: newMessage.trim(),
        timestamp: serverTimestamp(),
      })

      // Update last message in chat document
      const chatDocRef = doc(db, "chats", chatId)
      await updateDoc(chatDocRef, {
        lastMessage: newMessage.trim(),
        lastMessageTimestamp: serverTimestamp(),
      })

      setNewMessage("")
    } catch (err) {
      console.error("Error sending message:", err)
      setError("Error al enviar el mensaje.")
    } finally {
      setSending(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
      </div>
    )
  }

  if (error || !chat) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
        <Alert variant="destructive" className="max-w-md">
          <Info className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error || "Chat no disponible."}</AlertDescription>
        </Alert>
        <Button asChild className="mt-4">
          <Link href="/">Volver al inicio</Link>
        </Button>
      </div>
    )
  }

  const otherParticipantName = currentUser?.uid === chat.buyerId ? chat.sellerName : chat.buyerName
  const otherParticipantPhotoURL = currentUser?.uid === chat.buyerId ? chat.sellerPhotoURL : chat.buyerPhotoURL

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] md:h-[calc(100vh-100px)] bg-gray-100">
      {/* Chat Header */}
      <Card className="rounded-none border-b-2">
        <CardHeader className="flex flex-row items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <Avatar className="h-9 w-9">
              <AvatarImage
                src={otherParticipantPhotoURL || `/placeholder.svg?text=${otherParticipantName.charAt(0)}`}
              />
              <AvatarFallback>{otherParticipantName.charAt(0)}</AvatarFallback>
            </Avatar>
            <CardTitle className="text-lg font-semibold">{otherParticipantName}</CardTitle>
          </div>
          <Link
            href={`/product/${chat.productId}`}
            className="flex items-center gap-2 text-sm text-blue-600 hover:underline"
          >
            {chat.productImageUrl && (
              <Image
                src={chat.productImageUrl || "/placeholder.svg"}
                alt={chat.productName}
                width={30}
                height={30}
                className="rounded-sm object-cover"
              />
            )}
            <span className="hidden sm:block truncate max-w-[100px]">{chat.productName}</span>
            <Info className="h-4 w-4" />
          </Link>
        </CardHeader>
      </Card>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.senderId === currentUser?.uid ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[70%] p-3 rounded-lg ${
                message.senderId === currentUser?.uid
                  ? "bg-blue-600 text-white rounded-br-none"
                  : "bg-white text-gray-800 rounded-bl-none"
              }`}
            >
              <p className="text-xs font-semibold mb-1">
                {message.senderId === currentUser?.uid ? "Tú" : message.senderName}
              </p>
              <p className="text-sm">{message.text}</p>
              <p className="text-xs text-right mt-1 opacity-75">
                {message.timestamp?.toDate
                  ? message.timestamp.toDate().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                  : "Enviando..."}
              </p>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} /> {/* Scroll target */}
      </div>

      {/* Message Input */}
      <form onSubmit={handleSendMessage} className="p-4 border-t bg-white flex items-center gap-2">
        <Input
          type="text"
          placeholder="Escribe un mensaje..."
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          className="flex-1"
          disabled={sending}
        />
        <Button type="submit" disabled={sending || !newMessage.trim()}>
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-5 w-5" />}
          <span className="sr-only">Enviar</span>
        </Button>
      </form>
    </div>
  )
}
