"use client"

import Link from "next/link"
import { Facebook, Instagram, Mail, Heart } from "lucide-react"
import Image from "next/image"

export function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="bg-[#4a008e] text-white">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Información de la empresa */}
                           <div className="space-y-4">
                   <div className="flex items-center space-x-3">
                     <Image 
                       src="/images/logo.png" 
                       alt="Servido Logo" 
                       width={40} 
                       height={40} 
                       className="rounded"
                     />
                     <h3 className="text-xl font-bold text-white">Servido</h3>
                   </div>
            <p className="text-gray-200 text-sm leading-relaxed">
              Tu marketplace confiable para comprar y vender productos y servicios. 
              Conectamos compradores con vendedores de calidad.
            </p>
            <div className="flex space-x-4">
              <Link 
                href="https://www.facebook.com/servido.arg?mibextid=wwXIfr&rdid=QLLNsnh76Cdb5erx&share_url=https%3A%2F%2Fwww.facebook.com%2Fshare%2F1BsQTJsDLf%3Fmibextid%3DwwXIfr#" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-gray-200 hover:text-white transition-colors"
              >
                <Facebook className="h-5 w-5" />
              </Link>
              <Link 
                href="https://www.instagram.com/servido.ok/?igsh=MWpkeDV4aGQwZ3A0Mw%3D%3D&utm_source=qr#" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-gray-200 hover:text-white transition-colors"
              >
                <Instagram className="h-5 w-5" />
              </Link>
            </div>
          </div>

          {/* Enlaces rápidos */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold text-white">Enlaces Rápidos</h4>
            <ul className="space-y-2">
              <li>
                <Link href="/" className="text-gray-300 hover:text-white transition-colors text-sm">
                  Inicio
                </Link>
              </li>
              <li>
                <Link href="/products" className="text-gray-300 hover:text-white transition-colors text-sm">
                  Productos
                </Link>
              </li>
              <li>
                <Link href="/services" className="text-gray-300 hover:text-white transition-colors text-sm">
                  Servicios
                </Link>
              </li>
              <li>
                <Link href="/favorites" className="text-gray-300 hover:text-white transition-colors text-sm">
                  Favoritos
                </Link>
              </li>
            </ul>
          </div>

          {/* Información de contacto */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold text-white">Contacto</h4>
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <Mail className="h-4 w-4 text-white" />
                <span className="text-gray-200 text-sm">servidoarg@gmail.com</span>
              </div>
            </div>
          </div>

          {/* Enlaces legales */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold text-white">Legal</h4>
            <ul className="space-y-2">
              <li>
                <Link href="/terminos-y-condiciones" className="text-gray-300 hover:text-white transition-colors text-sm">
                  Términos y Condiciones
                </Link>
              </li>
              <li>
                <Link href="/politicas-de-privacidad" className="text-gray-300 hover:text-white transition-colors text-sm">
                  Políticas de Privacidad
                </Link>
              </li>
              <li>
                <Link href="/acerca-de-nosotros" className="text-gray-300 hover:text-white transition-colors text-sm">
                  Acerca de Nosotros
                </Link>
              </li>
              <li>
                <Link href="/trabaja-con-nosotros" className="text-gray-300 hover:text-white transition-colors text-sm">
                  Trabaja con Nosotros
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Línea divisoria */}
        <div className="border-t border-white/20 mt-8 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <p className="text-gray-200 text-sm text-center md:text-left">
              © {currentYear} Servido. Todos los derechos reservados.
            </p>
            <p className="text-gray-200 text-sm flex items-center">
              Realizado por <span className="font-semibold text-white">Atenea Software</span>
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}
