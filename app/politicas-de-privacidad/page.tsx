import React from 'react';

export default function PoliticasDePrivacidadPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Política de Privacidad de Servido</h1>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">1. Información que Recopilamos</h2>
        <p className="text-gray-700 leading-relaxed">
          En Servido, recopilamos información para proporcionar y mejorar nuestros servicios. Esto puede incluir información que usted nos proporciona directamente al crear una cuenta, publicar productos, realizar compras o interactuar con otros usuarios. También podemos recopilar información automáticamente, como datos de uso, dirección IP y tipo de dispositivo, para fines analíticos y operativos.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">2. Uso de su Información</h2>
        <p className="text-gray-700 leading-relaxed">
          Utilizamos la información recopilada para:
          <ul className="list-disc list-inside ml-4 mt-2">
            <li>Procesar sus transacciones y gestionar su cuenta.</li>
            <li>Mejorar y personalizar su experiencia en nuestra plataforma.</li>
            <li>Comunicarnos con usted sobre actualizaciones, ofertas y servicios relevantes.</li>
            <li>Detectar y prevenir fraudes y actividades ilegales.</li>
            <li>Cumplir con nuestras obligaciones legales.</li>
          </ul>
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">3. Compartir Información</h2>
        <p className="text-gray-700 leading-relaxed">
          No vendemos ni alquilamos su información personal a terceros. Podemos compartir su información con proveedores de servicios que nos ayudan a operar la plataforma (por ejemplo, procesamiento de pagos, análisis de datos), siempre bajo estrictos acuerdos de confidencialidad. También podemos divulgar información si la ley lo exige o para proteger nuestros derechos y seguridad.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">4. Seguridad de la Información</h2>
        <p className="text-gray-700 leading-relaxed">
          Implementamos medidas de seguridad robustas para proteger su información contra el acceso no autorizado, la alteración, la divulgación o la destrucción. Sin embargo, ninguna transmisión por internet o almacenamiento electrónico es 100% segura, por lo que no podemos garantizar una seguridad absoluta.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">5. Sus Derechos</h2>
        <p className="text-gray-700 leading-relaxed">
          Usted tiene derecho a acceder, corregir, actualizar o eliminar su información personal. También puede oponerse al procesamiento de su información o solicitar la limitación de su uso. Para ejercer estos derechos, contáctenos a través de los canales de soporte indicados en nuestra plataforma.
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-semibold mb-4">6. Cambios a esta Política</h2>
        <p className="text-gray-700 leading-relaxed">
          Podemos actualizar nuestra Política de Privacidad ocasionalmente. Le notificaremos sobre cualquier cambio sustancial publicando la nueva política en nuestra plataforma y actualizando la fecha de 'última actualización'. Le recomendamos revisar esta política periódicamente para estar informado sobre cómo protegemos su información.
        </p>
      </section>
    </div>
  );
} 