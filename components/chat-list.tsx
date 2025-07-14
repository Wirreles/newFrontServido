"use client"

import { Button } from "@/components/ui/button"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { collection, query, where, orderBy, onSnapshot } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Loader2, MessageSquare, Frown } from "lucide-react"
import { getChatProductImage } from "@/lib/image-utils"

interface Chat {
  id: string
  productId: string
  buyerId: string
  sellerId: string
  buyerName: string
  sellerName: string
  productName: string
  productImageUrl?: string
  productMedia?: any[]
  lastMessage?: string
  lastMessageTimestamp?: any
  createdAt: any
}

interface ChatListProps {
  userId: string
  role: "buyer" | "seller"
}

export function ChatList({ userId, role }: ChatListProps) {
  const [chats, setChats] = useState<Chat[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!userId) return

    setLoading(true)
    setError(null)

    let chatsQuery
    if (role === "buyer") {
      chatsQuery = query(
        collection(db, "chats"),
        where("buyerId", "==", userId),
        orderBy("lastMessageTimestamp", "desc"),
      )
    } else {
      chatsQuery = query(
        collection(db, "chats"),
        where("sellerId", "==", userId),
        orderBy("lastMessageTimestamp", "desc"),
      )
    }

    const unsubscribe = onSnapshot(
      chatsQuery,
      (snapshot) => {
        const fetchedChats = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Chat)
        setChats(fetchedChats)
        setLoading(false)
      },
      (err) => {
        console.error("Error listening to chats:", err)
        setError("Error al cargar tus conversaciones.")
        setLoading(false)
      },
    )

    return () => unsubscribe() // Cleanup listener
  }, [userId, role])

  if (loading) {
    return (
      <div className="flex justify-center items-center py-10">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (error) {
    return <p className="text-red-500 text-center mt-4">{error}</p>
  }

  if (chats.length === 0) {
    return (
      <div className="text-center py-10">
        <Frown className="h-16 w-16 text-gray-300 mx-auto mb-4" />
        <p className="text-lg text-muted-foreground mb-6">Aún no tienes conversaciones.</p>
        {role === "buyer" && (
          <Button asChild>
            <Link href="/">Explorar productos para iniciar un chat</Link>
          </Button>
        )}
        {role === "seller" && (
          <p className="text-sm text-muted-foreground">Los compradores iniciarán conversaciones contigo.</p>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3 w-full">
      {chats.map((chat) => {
        const otherParticipantName = role === "buyer" ? chat.sellerName : chat.buyerName
        const lastMessageTime = chat.lastMessageTimestamp?.toDate
          ? chat.lastMessageTimestamp.toDate().toLocaleDateString()
          : "N/A"

        return (
          <Link key={chat.id} href={`/chat/${chat.id}`} className="block w-full">
            <Card className="hover:shadow-md transition-shadow w-full">
              <CardContent className="p-3 sm:p-4 flex items-center gap-3 sm:gap-4 w-full">
                <Avatar className="h-10 w-10 sm:h-12 sm:w-12 flex-shrink-0">
                  <AvatarImage src={`/placeholder.svg?text=${otherParticipantName.charAt(0)}`} />
                  <AvatarFallback>{otherParticipantName.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center gap-2">
                    <h3 className="font-semibold text-sm sm:text-base truncate max-w-[120px] sm:max-w-[180px]">{otherParticipantName}</h3>
                    <span className="text-xs text-gray-500 whitespace-nowrap">{lastMessageTime}</span>
                  </div>
                  <p className="text-xs sm:text-sm text-gray-600 truncate max-w-[180px] sm:max-w-full">{chat.lastMessage || "No hay mensajes aún."}</p>
                  <div className="flex items-center gap-1 sm:gap-2 mt-1 text-xs text-gray-500">
                    <Image
                      src={getChatProductImage(chat.productMedia, chat.productImageUrl)}
                      alt={chat.productName}
                      width={18}
                      height={18}
                      className="rounded-sm object-cover"
                    />
                    <span className="truncate max-w-[90px] sm:max-w-[160px]">{chat.productName}</span>
                  </div>
                </div>
                <MessageSquare className="h-5 w-5 text-blue-500 flex-shrink-0 hidden xs:block" />
              </CardContent>
            </Card>
          </Link>
        )
      })}
    </div>
  )
}
