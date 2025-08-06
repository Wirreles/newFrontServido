import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    // Obtener la IP del cliente
    const forwarded = request.headers.get("x-forwarded-for")
    const ip = forwarded ? forwarded.split(",")[0] : request.ip || "127.0.0.1"
    
    // Usar un servicio gratuito para obtener la ubicación basada en IP
    const response = await fetch(`http://ip-api.com/json/${ip}?fields=status,message,country,countryCode,region,regionName,city,zip,lat,lon,timezone,isp,org,as,mobile,proxy,hosting,query`)
    
    if (!response.ok) {
      throw new Error('Error al obtener la ubicación')
    }
    
    const data = await response.json()
    
    if (data.status === 'fail') {
      return NextResponse.json({ 
        error: 'No se pudo obtener la ubicación',
        location: 'Ubicación no disponible'
      })
    }
    
    // Formatear la dirección
    const location = `${data.city}, ${data.regionName}, ${data.country}`
    
    return NextResponse.json({
      success: true,
      location,
      city: data.city,
      region: data.regionName,
      country: data.country,
      coordinates: {
        lat: data.lat,
        lon: data.lon
      }
    })
    
  } catch (error) {
    console.error('Error en geolocalización:', error)
    return NextResponse.json({ 
      error: 'Error al obtener la ubicación',
      location: 'Ubicación no disponible'
    })
  }
} 