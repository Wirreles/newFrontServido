import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const lat = searchParams.get('lat')
    const lon = searchParams.get('lon')
    
    if (!lat || !lon) {
      return NextResponse.json({ 
        error: 'Latitud y longitud son requeridas',
        location: 'Ubicación no disponible'
      })
    }
    
    // Usar el servicio de geocodificación inversa de OpenStreetMap con más detalles
    // Zoom 18 para máxima precisión (nivel de calle/número)
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1&extratags=1&namedetails=1`,
      {
        headers: {
          'User-Agent': 'Servido-App/1.0'
        }
      }
    )
    
    if (!response.ok) {
      throw new Error('Error al obtener la dirección')
    }
    
    const data = await response.json()
    
    if (data.display_name) {
      // Extraer información más específica de la respuesta
      const address = data.address || {}
      
      // Intentar obtener la dirección más específica posible
      let street = address.road || address.street || address.pedestrian || ''
      let houseNumber = address.house_number || ''
      let suburb = address.suburb || address.neighbourhood || ''
      let city = address.city || address.town || address.village || address.municipality || ''
      let state = address.state || address.province || ''
      let country = address.country || ''
      let postcode = address.postcode || ''
      
      // Formatear la dirección de manera más precisa
      let location = ''
      
      if (street && houseNumber) {
        // Dirección exacta: Calle + Número
        location = `${street} ${houseNumber}`
        if (suburb && suburb !== city) location += `, ${suburb}`
        location += `, ${city}`
      } else if (street) {
        // Solo calle (sin número)
        location = street
        if (suburb && suburb !== city) location += `, ${suburb}`
        location += `, ${city}`
      } else if (suburb && suburb !== city) {
        // Solo barrio/suburbio
        location = `${suburb}, ${city}`
      } else {
        // Solo ciudad
        location = city
      }
      
      // Agregar provincia y país
      if (state && state !== city) {
        location += `, ${state}`
      }
      location += `, ${country}`
      
      // Limpiar la dirección de elementos duplicados y espacios extra
      location = location
        .replace(/, ,/g, ',')
        .replace(/^,\s*/, '')
        .replace(/,\s*$/, '')
        .replace(/\s+/g, ' ')
        .trim()
      
      return NextResponse.json({
        success: true,
        location,
        fullAddress: data.display_name,
        city,
        state,
        country,
        street: street || null,
        houseNumber: houseNumber || null,
        suburb: suburb || null,
        postcode: postcode || null,
        coordinates: {
          lat: parseFloat(lat),
          lon: parseFloat(lon)
        },
        precision: data.address ? 'high' : 'medium'
      })
    } else {
      return NextResponse.json({ 
        error: 'No se pudo obtener la dirección',
        location: 'Ubicación no disponible'
      })
    }
    
  } catch (error) {
    console.error('Error en geocodificación:', error)
    return NextResponse.json({ 
      error: 'Error al obtener la dirección',
      location: 'Ubicación no disponible'
    })
  }
} 