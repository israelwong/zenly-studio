---
name: Portal Cliente ZEN
overview: Implementar portal de cliente funcional en /[slug]/client donde contactos con promesas autorizadas puedan ver sus eventos contratados, detalles de servicios y historial de pagos usando auth por cookies.
todos:
  - id: auth-setup
    content: Implementar auth por cookies y hook useClientAuth
    status: completed
  - id: actions-cliente
    content: Crear actions de cliente (auth, eventos, pagos)
    status: completed
  - id: types-client
    content: Definir types de cliente (ClientSession, ClientEvent, ClientPago)
    status: completed
  - id: layout-navbar
    content: Crear layout cliente con navbar y footer
    status: completed
  - id: dashboard-eventos
    content: Implementar dashboard con listado de eventos
    status: completed
  - id: detalle-evento
    content: Página detalle evento con servicios y resumen pago
    status: completed
  - id: historial-pagos
    content: Página historial de pagos con CLABE bancaria
    status: completed
  - id: componentes-ui
    content: Crear componentes cliente (EventCard, ResumenPago, etc)
    status: completed
  - id: documentacion
    content: Crear docs/CLIENT_PORTAL.md con flujos y queries
    status: completed
---

