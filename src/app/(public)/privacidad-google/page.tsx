import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacidad (Servicios de Google) | Zenly Studio",
  description:
    "Política de privacidad de Zenly Studio respecto al uso de los Servicios de Google: Contacts, Calendar y Drive.",
};

export default function PrivacidadGooglePage() {
  return (
    <div className="min-h-screen bg-zinc-900 text-white">
      {/* Hero */}
      <section className="relative py-16 px-4 bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900">
        <div className="container mx-auto max-w-3xl text-center">
          <h1 className="text-4xl font-bold mb-4">
            Política de Privacidad de Zenly Studio (Servicios de Google)
          </h1>
          <p className="text-zinc-400 text-sm">
            Última actualización: 7 de febrero de 2026
          </p>
        </div>
      </section>

      {/* Contenido legal */}
      <section className="py-12 px-4">
        <div className="container mx-auto max-w-3xl space-y-12">
          <p className="text-zinc-300 leading-relaxed">
            En Zenly Studio, la privacidad de nuestros usuarios y la seguridad
            de sus datos son nuestra prioridad. Esta política explica cómo
            gestionamos la información obtenida a través de los Servicios de
            Google.
          </p>

          {/* 1. Información que Recopilamos */}
          <div>
            <h2 className="text-2xl font-semibold mb-4 text-white">
              1. Información que Recopilamos
            </h2>
            <p className="text-zinc-400 mb-4">
              Al utilizar la integración con la suite de Google, Zenly Studio
              accede a la siguiente información según el servicio:
            </p>
            <ul className="list-disc list-inside space-y-2 text-zinc-300 ml-2">
              <li>
                <strong className="text-zinc-200">Google Contacts:</strong>{" "}
                Nombres y apellidos de los contactos, números de teléfono,
                direcciones de correo electrónico e ID de contacto de Google (para
                mantener la sincronización).
              </li>
              <li>
                <strong className="text-zinc-200">Google Calendar:</strong>{" "}
                Títulos de eventos, fechas, horas, descripciones y ubicaciones
                de citas agendadas.
              </li>
              <li>
                <strong className="text-zinc-200">Google Drive:</strong> Nombres
                de archivos, metadatos y enlaces de acceso a documentos o
                carpetas vinculadas a los eventos del estudio.
              </li>
            </ul>
          </div>

          {/* 3. Uso de la Información */}
          <div>
            <h2 className="text-2xl font-semibold mb-4 text-white">
              2. Uso de la Información
            </h2>
            <p className="text-zinc-400 mb-3">
              Utilizamos estos datos exclusivamente para:
            </p>
            <ul className="list-disc list-inside space-y-2 text-zinc-300 ml-2">
              <li>
                Sincronizar la información de los clientes del estudio con la
                agenda de Google del usuario.
              </li>
              <li>
                Permitir la edición y actualización bidireccional de datos de
                contacto desde la plataforma Zenly Studio hacia Google Contacts.
              </li>
              <li>
                Facilitar la gestión de eventos y promesas comerciales vinculando
                a los contactos existentes.
              </li>
              <li>
                <strong className="text-zinc-200">Sincronización de agenda:</strong>{" "}
                Reflejar las citas comerciales y eventos de Zenly Studio en el
                calendario personal de Google del usuario para evitar conflictos
                de horario.
              </li>
              <li>
                <strong className="text-zinc-200">Gestión de entregables:</strong>{" "}
                Permitir la organización y el acceso rápido a archivos,
                contratos y fotos almacenados en Google Drive directamente desde
                el panel de gestión del evento.
              </li>
            </ul>
          </div>

          {/* 4. Uso Limitado de Datos de Google - Sección destacada */}
          <div className="bg-zinc-800/80 border border-zinc-700 rounded-xl p-6 md:p-8">
            <h2 className="text-2xl font-semibold mb-4 text-white flex items-center gap-2">
              <span
                className="inline-flex w-8 h-8 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400 text-sm font-medium"
                aria-hidden
              >
                3
              </span>
              Uso Limitado de Datos de Google
            </h2>
            <p className="text-zinc-300 leading-relaxed">
              El uso y la transferencia de la información recibida de las APIs
              de Google por parte de Zenly Studio se ajustarán a la{" "}
              <strong className="text-zinc-200">
                Política de Datos del Usuario de los Servicios de API de Google
              </strong>
              , incluidos los requisitos de Uso Limitado. Estas políticas de
              protección de datos cubren por igual a{" "}
              <strong className="text-zinc-200">Google Contacts</strong>,{" "}
              <strong className="text-zinc-200">Google Calendar</strong> y{" "}
              <strong className="text-zinc-200">Google Drive</strong>. No
              vendemos, alquilamos ni compartimos estos datos con terceros para
              fines publicitarios o de prospección.
            </p>
          </div>

          {/* 5. Control del Usuario y Seguridad */}
          <div>
            <h2 className="text-2xl font-semibold mb-4 text-white">
              4. Control del Usuario y Seguridad
            </h2>
            <p className="text-zinc-400 mb-4">
              El usuario tiene control total sobre la sincronización:
            </p>
            <ul className="space-y-4 text-zinc-300">
              <li className="flex gap-3">
                <span className="text-emerald-400 font-medium shrink-0">
                  Desconexión:
                </span>
                <span>
                  El usuario puede revocar el acceso a Google Suite en cualquier
                  momento desde el panel de configuración.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="text-emerald-400 font-medium shrink-0">
                  Transparencia:
                </span>
                <span>
                  La plataforma indica mediante indicadores visuales el estado de
                  sincronización de cada contacto.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="text-emerald-400 font-medium shrink-0">
                  Protección:
                </span>
                <span>
                  Implementamos protocolos de cifrado para asegurar que los
                  tokens de acceso se gestionen de forma segura.
                </span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-zinc-800 py-12 px-4 mt-16">
        <div className="container mx-auto max-w-6xl">
          <div className="grid md:grid-cols-3 gap-8">
            <div>
              <h4 className="font-semibold mb-4">Plataforma</h4>
              <ul className="space-y-2 text-zinc-400">
                <li>
                  <a href="/about" className="hover:text-white transition-colors">
                    Acerca de
                  </a>
                </li>
                <li>
                  <a href="/pricing" className="hover:text-white transition-colors">
                    Precios
                  </a>
                </li>
                <li>
                  <a href="/contact" className="hover:text-white transition-colors">
                    Contacto
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-zinc-400">
                <li>
                  <a
                    href="/privacidad-google"
                    className="hover:text-white transition-colors"
                  >
                    Privacidad (Google)
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Acceso</h4>
              <ul className="space-y-2 text-zinc-400">
                <li>
                  <a href="/login" className="hover:text-white transition-colors">
                    Iniciar Sesión
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-zinc-700 mt-8 pt-8 text-center text-zinc-400 text-sm">
            <p>&copy; 2026 Zenly Studio. Todos los derechos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
