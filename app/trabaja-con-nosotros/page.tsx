import React from 'react';

export default function TrabajaConNosotrosPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Trabaja con Nosotros en Servido</h1>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">¿Por qué unirte a Servido?</h2>
        <p className="text-gray-700 leading-relaxed">
          En Servido, estamos construyendo el futuro del comercio electrónico y buscamos talentos apasionados que quieran dejar su huella. Ofrecemos un entorno de trabajo dinámico, desafiante y colaborativo, donde cada miembro del equipo tiene la oportunidad de crecer y contribuir significativamente al éxito de nuestra plataforma.
        </p>
        <p className="text-gray-700 leading-relaxed mt-2">
          Creemos en la innovación, la diversidad y el impacto positivo. Si buscas un lugar donde tus ideas sean valoradas y tu trabajo realmente importe, Servido es para ti.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Nuestra Cultura</h2>
        <p className="text-gray-700 leading-relaxed">
          Fomentamos una cultura de aprendizaje continuo, respeto mutuo y excelencia. Nos encanta resolver problemas complejos y celebrar los éxitos juntos. En Servido, cada día es una oportunidad para aprender algo nuevo y desafiar los límites.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Beneficios de Trabajar en Servido</h2>
        <ul className="list-disc list-inside ml-4 mt-2">
          <li>Oportunidades de desarrollo profesional y crecimiento.</li>
          <li>Un entorno de trabajo flexible y colaborativo.</li>
          <li>Proyectos desafiantes y la posibilidad de trabajar con tecnologías de vanguardia.</li>
          <li>Un equipo apasionado y talentoso.</li>
          <li>Compensación competitiva y beneficios atractivos.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-2xl font-semibold mb-4">Envía tu CV</h2>
        <p className="text-gray-700 leading-relaxed">
          Si estás listo para unirte a nuestro equipo y ayudarnos a construir el futuro de Servido, envíanos tu currículum vitae y una carta de presentación a:
          <a href="mailto:servidoarg@gmail.com" className="text-blue-600 hover:underline ml-2">servidoarg@gmail.com</a>
        </p>
        <p className="text-gray-700 leading-relaxed mt-2">
          ¡Esperamos conocerte!
        </p>
      </section>
    </div>
  );
} 