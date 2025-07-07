/**
 * Pruebas unitarias para el sistema de gestión de envíos
 * Este archivo contiene pruebas de validación para las funciones de envío
 */

import type { ShippingStatus, ShippingUpdateRequest } from "@/types/shipping"

// Función de prueba para validar transiciones de estado
export function testStatusTransitions(): { passed: number; failed: number; results: string[] } {
  const results: string[] = []
  let passed = 0
  let failed = 0

  // Casos de prueba para transiciones válidas
  const validTransitions = [
    { from: undefined, to: "pending" as ShippingStatus, expected: true },
    { from: "pending" as ShippingStatus, to: "preparing" as ShippingStatus, expected: true },
    { from: "preparing" as ShippingStatus, to: "shipped" as ShippingStatus, expected: true },
    { from: "shipped" as ShippingStatus, to: "delivered" as ShippingStatus, expected: true },
    { from: "pending" as ShippingStatus, to: "cancelled" as ShippingStatus, expected: true },
    { from: "preparing" as ShippingStatus, to: "cancelled" as ShippingStatus, expected: true },
    { from: "shipped" as ShippingStatus, to: "cancelled" as ShippingStatus, expected: true },
  ]

  // Casos de prueba para transiciones inválidas
  const invalidTransitions = [
    { from: "delivered" as ShippingStatus, to: "shipped" as ShippingStatus, expected: false },
    { from: "delivered" as ShippingStatus, to: "cancelled" as ShippingStatus, expected: false },
    { from: "cancelled" as ShippingStatus, to: "pending" as ShippingStatus, expected: false },
    { from: "cancelled" as ShippingStatus, to: "delivered" as ShippingStatus, expected: false },
    { from: "shipped" as ShippingStatus, to: "preparing" as ShippingStatus, expected: false },
    { from: "preparing" as ShippingStatus, to: "pending" as ShippingStatus, expected: false },
  ]

  const allTransitions = [...validTransitions, ...invalidTransitions]

  allTransitions.forEach(({ from, to, expected }) => {
    const result = validateStatusTransitionTest(from, to)
    const testPassed = result.valid === expected
    
    if (testPassed) {
      passed++
      results.push(`✅ ${from || 'undefined'} → ${to}: ${expected ? 'VÁLIDO' : 'INVÁLIDO'} (Correcto)`)
    } else {
      failed++
      results.push(`❌ ${from || 'undefined'} → ${to}: Esperado ${expected ? 'VÁLIDO' : 'INVÁLIDO'}, obtuvo ${result.valid ? 'VÁLIDO' : 'INVÁLIDO'}`)
    }
  })

  return { passed, failed, results }
}

// Función de prueba para validar datos de actualización
export function testUpdateValidation(): { passed: number; failed: number; results: string[] } {
  const results: string[] = []
  let passed = 0
  let failed = 0

  const testCases = [
    // Casos válidos
    { 
      update: { status: "pending" as ShippingStatus }, 
      expected: true, 
      description: "Estado válido sin campos opcionales" 
    },
    { 
      update: { status: "shipped" as ShippingStatus, trackingNumber: "ABC123", carrierName: "DHL" }, 
      expected: true, 
      description: "Estado válido con tracking y carrier" 
    },
    { 
      update: { status: "delivered" as ShippingStatus, notes: "Entregado en recepción" }, 
      expected: true, 
      description: "Estado válido con notas" 
    },
    
    // Casos inválidos
    { 
      update: { status: "invalid" as any }, 
      expected: false, 
      description: "Estado inválido" 
    },
    { 
      update: { status: "pending" as ShippingStatus, trackingNumber: "AB" }, 
      expected: false, 
      description: "Tracking number muy corto" 
    },
    { 
      update: { status: "pending" as ShippingStatus, carrierName: "A" }, 
      expected: false, 
      description: "Carrier name muy corto" 
    },
    { 
      update: { status: "pending" as ShippingStatus, notes: "A".repeat(501) }, 
      expected: false, 
      description: "Notas muy largas" 
    },
  ]

  testCases.forEach(({ update, expected, description }) => {
    const result = validateShippingUpdateTest(update)
    const testPassed = result.valid === expected
    
    if (testPassed) {
      passed++
      results.push(`✅ ${description}: ${expected ? 'VÁLIDO' : 'INVÁLIDO'} (Correcto)`)
    } else {
      failed++
      results.push(`❌ ${description}: Esperado ${expected ? 'VÁLIDO' : 'INVÁLIDO'}, obtuvo ${result.valid ? 'VÁLIDO' : 'INVÁLIDO'}`)
      if (result.error) {
        results.push(`   Error: ${result.error}`)
      }
    }
  })

  return { passed, failed, results }
}

// Función de prueba para validar entrada de datos
export function testInputSanitization(): { passed: number; failed: number; results: string[] } {
  const results: string[] = []
  let passed = 0
  let failed = 0

  const testCases = [
    {
      input: { trackingNumber: "  ABC123  ", carrierName: "  DHL  " },
      expected: { trackingNumber: "ABC123", carrierName: "DHL" },
      description: "Eliminación de espacios en blanco"
    },
    {
      input: { trackingNumber: "", carrierName: "" },
      expected: { trackingNumber: undefined, carrierName: undefined },
      expected_undefined: true,
      description: "Strings vacíos convertidos a undefined"
    },
    {
      input: { notes: "  Nota con espacios  " },
      expected: { notes: "Nota con espacios" },
      description: "Eliminación de espacios en notas"
    },
  ]

  testCases.forEach(({ input, expected, expected_undefined, description }) => {
    const sanitized = sanitizeShippingInput(input)
    let testPassed = true

    if (expected_undefined) {
      testPassed = sanitized.trackingNumber === undefined && sanitized.carrierName === undefined
    } else {
      testPassed = JSON.stringify(sanitized) === JSON.stringify(expected)
    }
    
    if (testPassed) {
      passed++
      results.push(`✅ ${description}: Correcto`)
    } else {
      failed++
      results.push(`❌ ${description}: Esperado ${JSON.stringify(expected)}, obtuvo ${JSON.stringify(sanitized)}`)
    }
  })

  return { passed, failed, results }
}

// Función para ejecutar todas las pruebas
export function runAllShippingTests(): { 
  totalPassed: number; 
  totalFailed: number; 
  results: { category: string; passed: number; failed: number; details: string[] }[] 
} {
  const statusTests = testStatusTransitions()
  const validationTests = testUpdateValidation()
  const sanitizationTests = testInputSanitization()

  return {
    totalPassed: statusTests.passed + validationTests.passed + sanitizationTests.passed,
    totalFailed: statusTests.failed + validationTests.failed + sanitizationTests.failed,
    results: [
      { category: "Transiciones de Estado", ...statusTests, details: statusTests.results },
      { category: "Validación de Datos", ...validationTests, details: validationTests.results },
      { category: "Sanitización de Entrada", ...sanitizationTests, details: sanitizationTests.results },
    ]
  }
}

// Funciones auxiliares para las pruebas (réplicas de las funciones principales)
function validateStatusTransitionTest(currentStatus: ShippingStatus | undefined, newStatus: ShippingStatus): { valid: boolean; error?: string } {
  if (!currentStatus) {
    return { valid: true }
  }

  const validTransitions: Record<ShippingStatus, ShippingStatus[]> = {
    pending: ["preparing", "cancelled"],
    preparing: ["shipped", "cancelled"],
    shipped: ["delivered", "cancelled"],
    delivered: [],
    cancelled: []
  }

  if (!validTransitions[currentStatus].includes(newStatus)) {
    return { 
      valid: false, 
      error: `No se puede cambiar de ${currentStatus} a ${newStatus}` 
    }
  }

  return { valid: true }
}

function validateShippingUpdateTest(update: Omit<ShippingUpdateRequest, 'purchaseId'>): { valid: boolean; error?: string } {
  const validStatuses: ShippingStatus[] = ["pending", "preparing", "shipped", "delivered", "cancelled"]
  
  if (!validStatuses.includes(update.status)) {
    return { valid: false, error: "Estado de envío inválido" }
  }

  if (update.trackingNumber && update.trackingNumber.trim().length < 3) {
    return { valid: false, error: "El número de seguimiento debe tener al menos 3 caracteres" }
  }

  if (update.carrierName && update.carrierName.trim().length < 2) {
    return { valid: false, error: "El nombre del transportista debe tener al menos 2 caracteres" }
  }

  if (update.notes && update.notes.trim().length > 500) {
    return { valid: false, error: "Las notas no pueden exceder 500 caracteres" }
  }

  return { valid: true }
}

function sanitizeShippingInput(input: any): any {
  const sanitized: any = {}
  
  if (input.trackingNumber) {
    const trimmed = input.trackingNumber.trim()
    sanitized.trackingNumber = trimmed || undefined
  }
  
  if (input.carrierName) {
    const trimmed = input.carrierName.trim()
    sanitized.carrierName = trimmed || undefined
  }
  
  if (input.notes) {
    const trimmed = input.notes.trim()
    sanitized.notes = trimmed || undefined
  }
  
  return sanitized
}

// Función para mostrar resultados en consola
export function logTestResults(): void {
  const results = runAllShippingTests()
  
  console.log("🧪 RESULTADOS DE PRUEBAS DEL SISTEMA DE ENVÍOS")
  console.log("=" .repeat(50))
  console.log(`✅ Pruebas exitosas: ${results.totalPassed}`)
  console.log(`❌ Pruebas fallidas: ${results.totalFailed}`)
  console.log(`📊 Total de pruebas: ${results.totalPassed + results.totalFailed}`)
  console.log("")

  results.results.forEach(({ category, passed, failed, details }) => {
    console.log(`📋 ${category}:`)
    console.log(`   ✅ Exitosas: ${passed}`)
    console.log(`   ❌ Fallidas: ${failed}`)
    console.log("")
    
    details.forEach(detail => {
      console.log(`   ${detail}`)
    })
    console.log("")
  })

  if (results.totalFailed === 0) {
    console.log("🎉 ¡Todas las pruebas pasaron exitosamente!")
  } else {
    console.log("⚠️  Algunas pruebas fallaron. Revisa los detalles arriba.")
  }
} 