export const DEFAULT_CONTRACT_TEMPLATE = `<h1>CONTRATO DE PRESTACIÓN DE SERVICIOS PROFESIONALES</h1>

<h2>GENERALES DEL EVENTO</h2>
<ul>
  <li><strong>Nombre del evento:</strong> @nombre_evento</li>
  <li><strong>Fecha de celebración:</strong> @fecha_evento</li>
  <li><strong>Tipo de evento:</strong> @tipo_evento</li>
  <li><strong>Cliente:</strong> @nombre_cliente</li>
</ul>

<h2>OBJETO DEL CONTRATO</h2>
<p>Contrato de prestación de servicios profesionales de fotografía y cinematografía que celebran por una parte <strong>@nombre_studio</strong> y por la otra el cliente <strong>@nombre_cliente</strong>, de conformidad con las siguientes declaraciones y cláusulas:</p>

<h2>DECLARACIONES</h2>
<ol>
  <li>Declara el prestador que cuenta con la capacidad técnica, equipo y material para el desempeño de las actividades profesionales en medios audiovisuales encomendadas.</li>
  <li>Declara el cliente que conoce los servicios ofrecidos y reconoce la capacidad técnica necesaria para el cumplimiento del presente contrato.</li>
</ol>

<h2>SERVICIOS INCLUIDOS</h2>
[SERVICIOS_INCLUIDOS]

<h2>HONORARIOS</h2>
<p>Por la prestación de los servicios establecidos, el cliente pagará la cantidad de <strong>@total_contrato</strong> (pesos mexicanos 00/100 M.N.)</p>
<p><strong>Condiciones de pago:</strong> @condiciones_pago</p>

<h2>REQUERIMIENTOS</h2>
<ul>
  <li>El cliente proporcionará acceso a la locación y las facilidades necesarias para la realización de los servicios contratados.</li>
  <li>El cliente proporcionará acceso a los servicios de alimentación y bebidas para el equipo de producción.</li>
</ul>

<h2>GARANTÍAS EN PRODUCCIÓN</h2>
<ul>
  <li><strong>Puntualidad:</strong> La producción llegará 30 minutos antes al lugar pactado.</li>
  <li><strong>Equipo técnico:</strong> Se llevará todo el equipo contratado y accesorios necesarios.</li>
</ul>

<h2>ENTREGA DEL SERVICIO</h2>
<ul>
  <li>Entrega digital máxima en 20 días hábiles después del evento.</li>
  <li>Entrega impresa máximo 30 días tras autorizar el diseño.</li>
  <li>Cliente puede solicitar respaldo previo en disco externo.</li>
</ul>

<h2>CANCELACIÓN</h2>
<p>El anticipo no es reembolsable por cancelaciones ajenas al prestador. Si se cambia la fecha y el prestador está disponible, se respeta el anticipo. Si la fecha ya está asignada, se considerará como cancelación.</p>

<h2>COSTOS ADICIONALES</h2>
<ul>
  <li><strong>Permiso de locación:</strong> El cliente cubrirá permisos requeridos por la locación.</li>
  <li><strong>Horas extra:</strong> Se agregarán al presupuesto y pagarán el día de la solicitud.</li>
</ul>

<h2>GARANTÍAS EN SERVICIO</h2>
<ul>
  <li>Respaldo de material audiovisual en disco externo dedicado.</li>
  <li>Copia y edición de material en discos duros de trabajo dedicados.</li>
  <li>Fotos en alta resolución formato JPG con revelado digital (ajuste de exposición y balance de blancos).</li>
  <li>Calidad de video en alta definición.</li>
  <li>Plazo de observaciones: 30 días para comentarios y ajustes; después, se borran originales.</li>
</ul>`;
