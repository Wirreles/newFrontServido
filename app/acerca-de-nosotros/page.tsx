import React from 'react';

export default function AcercaDeNosotrosPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Acerca de Nosotros - Servido</h1>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Nuestra Misión</h2>
        <p className="text-gray-700 leading-relaxed">
          En Servido, nuestra misión es conectar a personas que buscan productos y servicios con aquellos que los ofrecen, creando una comunidad vibrante y un mercado eficiente. Creemos en facilitar transacciones justas y seguras, empoderando a individuos y pequeñas empresas para prosperar en la economía digital.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Nuestra Visión</h2>
        <p className="text-gray-700 leading-relaxed">
          Aspiramos a ser la plataforma líder en el mercado para la compra y venta de todo tipo de productos y servicios, reconocida por nuestra facilidad de uso, seguridad y la confianza que generamos en nuestros usuarios. Buscamos innovar constantemente para ofrecer la mejor experiencia posible a nuestra comunidad.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Nuestros Valores</h2>
        <ul className="list-disc list-inside ml-4 mt-2">
          <li><span className="font-semibold">Confianza:</span> Construimos relaciones sólidas basadas en la transparencia y la honestidad.</li>
          <li><span className="font-semibold">Innovación:</span> Buscamos constantemente nuevas formas de mejorar y adaptarnos.</li>
          <li><span className="font-semibold">Comunidad:</span> Fomentamos un entorno de apoyo y colaboración entre nuestros usuarios.</li>
          <li><span className="font-semibold">Integridad:</span> Operamos con ética y responsabilidad en todas nuestras acciones.</li>
          <li><span className="font-semibold">Excelencia:</span> Nos esforzamos por ofrecer un servicio de la más alta calidad.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-2xl font-semibold mb-4">Nuestro Equipo</h2>
        <p className="text-gray-700 leading-relaxed">
          Somos un equipo apasionado y dedicado, comprometido con la creación de una plataforma que realmente satisfaga las necesidades de nuestros usuarios. Valoramos la diversidad, la creatividad y el trabajo en equipo para alcanzar nuestros objetivos.
        </p>
      </section>
    </div>
  );
} 