"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { 
  Share2, 
  Facebook, 
  Twitter, 
  Instagram, 
  MessageCircle,
  Copy,
  Check
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { toast } from "sonner"

interface ShareButtonsProps {
  productName: string
  productUrl: string
  productPrice?: number
  productImage?: string
}

export function ShareButtons({ productName, productUrl, productPrice, productImage }: ShareButtonsProps) {
  const [copied, setCopied] = useState(false)

  const shareText = productPrice 
    ? `¡Mira este producto en Servido! ${productName} - ${productPrice.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' })}`
    : `¡Mira este producto en Servido! ${productName}`

  const handleShare = (platform: string) => {
    let shareUrl = ""
    
    switch (platform) {
      case "facebook":
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(productUrl)}&quote=${encodeURIComponent(shareText)}`
        break
      case "twitter":
        shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(productUrl)}`
        break
      case "whatsapp":
        shareUrl = `https://wa.me/?text=${encodeURIComponent(`${shareText} ${productUrl}`)}`
        break
      case "instagram":
        // Instagram no permite compartir directamente, pero podemos copiar el enlace
        navigator.clipboard.writeText(productUrl)
        toast.success("Enlace copiado para Instagram")
        return
      default:
        return
    }
    
    window.open(shareUrl, "_blank", "width=600,height=400")
  }

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(productUrl)
      setCopied(true)
      toast.success("Enlace copiado al portapapeles")
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      toast.error("Error al copiar el enlace")
    }
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-gray-600">Compartir:</span>
      
      {/* WhatsApp */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => handleShare("whatsapp")}
        className="bg-green-50 border-green-200 text-green-700 hover:bg-green-100 hover:border-green-300"
      >
        <MessageCircle className="h-4 w-4" />
        <span className="ml-1 hidden sm:inline">WhatsApp</span>
      </Button>

      {/* Facebook */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => handleShare("facebook")}
        className="bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100 hover:border-blue-300"
      >
        <Facebook className="h-4 w-4" />
        <span className="ml-1 hidden sm:inline">Facebook</span>
      </Button>

      {/* Twitter */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => handleShare("twitter")}
        className="bg-sky-50 border-sky-200 text-sky-700 hover:bg-sky-100 hover:border-sky-300"
      >
        <Twitter className="h-4 w-4" />
        <span className="ml-1 hidden sm:inline">Twitter</span>
      </Button>

      {/* Menú desplegable para más opciones */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            <Share2 className="h-4 w-4" />
            <span className="ml-1 hidden sm:inline">Más</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => handleShare("instagram")}>
            <Instagram className="h-4 w-4 mr-2" />
            Copiar para Instagram
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleCopyLink}>
            {copied ? (
              <>
                <Check className="h-4 w-4 mr-2 text-green-600" />
                ¡Copiado!
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 mr-2" />
                Copiar enlace
              </>
            )}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
} 