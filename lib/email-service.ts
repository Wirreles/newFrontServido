import emailjs from 'emailjs-com';

// Configuración de EmailJS
const EMAILJS_SERVICE_ID = 'service_klh99zf'; // Gmail
const EMAILJS_TEMPLATE_ID = 'template_ddna2b6';
const EMAILJS_USER_ID = 's8MFdSCNO3XGYiKzZ';

// Configuración alternativa para SendGrid (si Gmail falla)
const SENDGRID_SERVICE_ID = 'service_xxxxx'; // Reemplazar con tu SendGrid Service ID

export interface WelcomeEmailData {
  user_name: string;
  user_email: string;
  account_type: string;
}

export const sendWelcomeEmail = async (data: WelcomeEmailData): Promise<void> => {
  try {
    const isSeller = data.account_type === 'seller';
    const accountTypeText = isSeller ? 'Vendedor' : 'Comprador';
    
    // Template más simple con menos variables
    const templateParams = {
      to_name: data.user_name,
      to_email: data.user_email,
      account_type: accountTypeText,
      message: `¡Bienvenido a Servido, ${data.user_name}! Tu cuenta ha sido creada como ${accountTypeText.toLowerCase()}.`,
      subject: '¡Bienvenido a Servido!',
      // Variables adicionales para el template
      email: data.user_email, // Para el campo "Responder a"
      name: 'Servido', // Para el campo "De Nombre"
      title: '¡Bienvenido a Servido!' // Para el campo "Sujeto" si usas {{title}}
    };

    console.log('Enviando email con parámetros:', templateParams);

    const result = await emailjs.send(
      EMAILJS_SERVICE_ID,
      EMAILJS_TEMPLATE_ID,
      templateParams,
      EMAILJS_USER_ID
    );

    console.log('Email de bienvenida enviado exitosamente:', result);
    
    // Verificar el resultado más detalladamente
    if (result && result.status === 200) {
      console.log('✅ Email enviado correctamente con status 200');
    } else {
      console.warn('⚠️ Email enviado pero con status diferente:', result?.status);
    }
  } catch (error) {
    console.error('❌ Error enviando email de bienvenida:', error);
    // No lanzamos el error para no interrumpir el proceso de registro
  }
};

// Función para inicializar EmailJS
export const initEmailJS = () => {
  emailjs.init(EMAILJS_USER_ID);
};

// Función de prueba para verificar la configuración
export const testEmailService = async (testEmail: string): Promise<void> => {
  try {
    const templateParams = {
      to_name: 'Usuario de Prueba',
      to_email: testEmail,
      account_type: 'Comprador',
      message: 'Este es un email de prueba para verificar la configuración.',
      subject: 'Prueba de Email - Servido'
    };

    console.log('Enviando email de prueba con parámetros:', templateParams);

    const result = await emailjs.send(
      EMAILJS_SERVICE_ID,
      EMAILJS_TEMPLATE_ID,
      templateParams,
      EMAILJS_USER_ID
    );

    console.log('Email de prueba enviado exitosamente:', result);
    
    if (result && result.status === 200) {
      console.log('✅ Email de prueba enviado correctamente');
      alert('Email de prueba enviado. Revisa tu bandeja de entrada y spam.');
    } else {
      console.warn('⚠️ Email de prueba enviado pero con status diferente:', result?.status);
    }
  } catch (error) {
    console.error('❌ Error enviando email de prueba:', error);
    alert('Error enviando email de prueba: ' + error);
    throw error;
  }
}; 