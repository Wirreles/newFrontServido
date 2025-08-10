import mercadopago from 'mercadopago'

// Configurar MercadoPago
const configureMercadoPago = () => {
  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN
  
  if (!accessToken) {
    throw new Error('MERCADOPAGO_ACCESS_TOKEN no está configurado')
  }
  
  mercadopago.configure({
    access_token: accessToken
  })
  
  return mercadopago
}

export { configureMercadoPago }
export default mercadopago

