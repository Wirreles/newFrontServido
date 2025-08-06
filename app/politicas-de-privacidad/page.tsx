import React from 'react';

export default function PoliticasDePrivacidadPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Política de Privacidad – ServiDo</h1>
      <p className="text-gray-600 mb-8">Última actualización: 4 de agosto de 2025</p>

      <section className="mb-8">
        <p className="text-gray-700 leading-relaxed mb-6">
          En ServiDo nos comprometemos a proteger la privacidad de nuestros usuarios y a manejar sus datos personales con transparencia y seguridad. Esta política describe qué información recopilamos, cómo la utilizamos y qué medidas tomamos para protegerla.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">1. Información que recopilamos</h2>
        <p className="text-gray-700 leading-relaxed mb-4">
          Al registrarse y utilizar ServiDo, podemos recolectar la siguiente información personal:
        </p>
        <ul className="list-disc list-inside ml-4 text-gray-700 space-y-2">
          <li>Nombre y apellido</li>
          <li>Dirección de correo electrónico</li>
          <li>Número de teléfono</li>
          <li>Ubicación geográfica (para coordinar envíos y mostrar servicios cercanos)</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">2. Creación de cuenta</h2>
        <p className="text-gray-700 leading-relaxed">
          Para utilizar ServiDo, el usuario debe crear una cuenta ingresando a la opción "Registrarse" en la plataforma y completando los datos solicitados.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">3. Uso de la ubicación</h2>
        <p className="text-gray-700 leading-relaxed mb-4">
          ServiDo utiliza la ubicación del usuario para:
        </p>
        <ul className="list-disc list-inside ml-4 text-gray-700 space-y-2">
          <li>Coordinar entregas o envíos de productos y servicios.</li>
          <li>Mostrar resultados relevantes cercanos a su ubicación.</li>
        </ul>
        <p className="text-gray-700 leading-relaxed mt-4">
          El usuario puede gestionar los permisos de ubicación desde la configuración de su dispositivo.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">4. Publicidad</h2>
        <p className="text-gray-700 leading-relaxed">
          ServiDo muestra anuncios dentro de la aplicación. Estos anuncios pueden ser propios o de terceros, pero no implican la entrega de datos personales del usuario a anunciantes.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">5. Compartir información con terceros</h2>
        <p className="text-gray-700 leading-relaxed">
          ServiDo no comparte datos personales ni información de los usuarios con terceros, salvo obligación legal.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">6. Seguridad de los datos</h2>
        <p className="text-gray-700 leading-relaxed mb-4">
          En ServiDo implementamos medidas técnicas y organizativas para proteger la información de nuestros usuarios:
        </p>
        <ul className="list-disc list-inside ml-4 text-gray-700 space-y-2">
          <li><strong>Encriptación:</strong> utilizamos encriptación para proteger los datos tanto en tránsito como en reposo.</li>
          <li><strong>Servidores seguros:</strong> las operaciones se ejecutan en servidores robustos, protegidos con firewalls y sistemas de detección de intrusiones, ubicados en entornos controlados con acceso restringido.</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">7. Contacto</h2>
        <p className="text-gray-700 leading-relaxed">
          Para consultas o solicitudes relacionadas con privacidad, puede comunicarse con nosotros a:
        </p>
        <p className="text-gray-700 leading-relaxed mt-2">
          📧 <a href="mailto:servidoarg@gmail.com" className="text-blue-600 hover:text-blue-800">servidoarg@gmail.com</a>
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-semibold mb-4">8. Cambios en esta política</h2>
        <p className="text-gray-700 leading-relaxed">
          Podemos actualizar esta política de privacidad ocasionalmente. Cualquier cambio será publicado en esta misma sección con la fecha de última actualización.
        </p>
      </section>
    </div>
  );
} 