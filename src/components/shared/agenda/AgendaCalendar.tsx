'use client';

import React, { useMemo } from 'react';
import { Calendar, momentLocalizer, View } from 'react-big-calendar';
import moment from 'moment';
import 'moment/locale/es';
import { ChevronLeft, ChevronRight, CheckCircle2 } from 'lucide-react';
import type { AgendaItem } from '@/lib/actions/shared/agenda-unified.actions';
import { AgendaItemHoverCard } from './AgendaItemHoverCard';
import 'react-big-calendar/lib/css/react-big-calendar.css';

// Configurar moment en español
moment.locale('es');

// Configurar localizador con moment
const localizer = momentLocalizer(moment);

interface AgendaCalendarProps {
  events: AgendaItem[];
  onSelectEvent?: (event: AgendaItem) => void;
  onSelectSlot?: (slotInfo: { start: Date; end: Date }) => void;
  onViewPromise?: (promiseId: string) => void;
  onViewEvento?: (eventoId: string) => void;
  defaultDate?: Date;
  date?: Date;
  onNavigate?: (date: Date | 'PREV' | 'NEXT' | 'TODAY') => void;
  defaultView?: View;
  view?: View;
  onViewChange?: (view: View) => void;
  className?: string;
}

// Helper para obtener primer nombre
function getFirstName(fullName: string | null | undefined): string {
  if (!fullName) return '';
  return fullName.split(' ')[0];
}

// Convertir AgendaItem a formato de react-big-calendar
function agendaItemToEvent(item: AgendaItem) {
  // Normalizar fecha usando métodos UTC para evitar problemas de zona horaria
  const itemDate = item.date instanceof Date ? item.date : new Date(item.date);
  
  // Extraer componentes de fecha usando métodos UTC
  const year = itemDate.getUTCFullYear();
  const month = itemDate.getUTCMonth();
  const day = itemDate.getUTCDate();
  
  // Crear fechas usando UTC
  let start: Date;
  let end: Date;
  let allDay = false;

  // Si hay hora, agregarla usando UTC
  if (item.time) {
    const [hours, minutes] = item.time.split(':').map(Number);
    start = new Date(Date.UTC(year, month, day, hours || 0, minutes || 0, 0));
    end = new Date(Date.UTC(year, month, day, hours || 0, minutes || 0, 0));
    // Duración por defecto: 1 hora, agregar usando UTC
    end = new Date(Date.UTC(
      end.getUTCFullYear(),
      end.getUTCMonth(),
      end.getUTCDate(),
      end.getUTCHours() + 1,
      end.getUTCMinutes(),
      end.getUTCSeconds()
    ));
  } else {
    // Si no hay hora, usar todo el día
    // IMPORTANTE: Para eventos de todo el día con allDay: true, usar mediodía UTC para ambos
    // start y end del mismo día. react-big-calendar con allDay: true mostrará el evento
    // solo en el día correcto basándose en los componentes de fecha, no en las horas.
    const fechaMediodia = new Date(Date.UTC(year, month, day, 12, 0, 0));
    start = fechaMediodia;
    // End debe ser diferente de start para react-big-calendar, pero con allDay: true
    // solo importa el día calendario. Usar el mismo día pero con hora ligeramente diferente.
    end = new Date(Date.UTC(year, month, day, 12, 0, 1));
    allDay = true;
  }

  // Generar título según el tipo de agendamiento
  let title = '';

  // Fecha principal del evento: "Nombre Evento (Tipo Evento)"
  if (item.is_main_event_date && item.event_name && item.event_type_name) {
    title = `${item.event_name} (${item.event_type_name})`;
  } else if (item.is_main_event_date && item.event_name) {
    title = item.event_name;
  }
  // Cita adicional del evento: "Nombre/Descripción - Nombre Evento"
  else if (item.contexto === 'evento' && item.type_scheduling && item.event_name) {
    const citaNombre = item.description || item.concept || 'Cita';
    title = `${citaNombre} - ${item.event_name}`;
  }
  // Cita de promesa: formato optimizado para espacio limitado
  else if (item.contexto === 'promise' && item.type_scheduling) {
    // Si hay type_scheduling: "Cita [presencial/virtual] Nombre prospecto"
    const tipoCita = item.type_scheduling === 'virtual' ? 'virtual' : 'presencial';
    const nombreProspecto = item.contact_name ? getFirstName(item.contact_name) : 'Prospecto';
    title = `Cita ${tipoCita} ${nombreProspecto}`;
  }
  else if (item.contexto === 'promise' && item.event_type_name) {
    // Si no hay type_scheduling pero hay event_type_name: "Cita Nombre evento"
    title = `Cita ${item.event_type_name}`;
  }
  else if (item.contexto === 'promise' && item.contact_name) {
    // Fallback: "Cita Nombre prospecto"
    title = `Cita ${getFirstName(item.contact_name)}`;
  } else {
    title = item.concept || item.event_name || item.description || 'Agendamiento';
  }

  return {
    id: item.id,
    title,
    start,
    end,
    resource: item,
    allDay: allDay,
  };
}

// Estilos personalizados ZEN
const zenEventStyleGetter = (event: { resource?: AgendaItem }) => {
  const item = event.resource as AgendaItem | undefined;
  const contexto = item?.contexto;
  const isPending = item?.is_pending_date;
  const isConfirmedEvent = item?.is_confirmed_event_date;
  const isExpired = item?.is_expired;
  const hasAgendamiento = !isPending && !isConfirmedEvent && item?.type_scheduling; // Cita (virtual o presencial)

  // 1. Fecha de interés pendiente - Gris (normal) o Rojo (caducada)
  if (isPending) {
    if (isExpired) {
      // Fecha caducada - Rojo
      return {
        style: {
          backgroundColor: '#DC2626', // red-600
          borderColor: '#B91C1C', // red-700
          borderWidth: '2px',
          borderRadius: '6px',
          color: '#FFFFFF',
          fontSize: '0.875rem',
          fontWeight: 600,
          padding: '4px 8px',
          opacity: 0.8,
        },
      };
    }
    // Fecha de interés normal - Gris
    return {
      style: {
        backgroundColor: '#52525B', // zinc-600
        borderColor: '#71717A', // zinc-500
        borderWidth: '2px',
        borderRadius: '6px',
        color: '#D4D4D8', // zinc-300
        fontSize: '0.875rem',
        fontWeight: 500,
        padding: '4px 8px',
        opacity: 0.7,
      },
    };
  }

  // 2. Fecha con promesa - Zinc oscuro (normal) o Rojo (caducada)
  if (isConfirmedEvent) {
    if (isExpired) {
      // Fecha caducada - Rojo
      return {
        style: {
          backgroundColor: '#DC2626', // red-600
          borderColor: '#B91C1C', // red-700
          borderWidth: '2px',
          borderRadius: '6px',
          color: '#FFFFFF',
          fontSize: '0.875rem',
          fontWeight: 600,
          padding: '4px 8px',
          opacity: 0.8,
        },
      };
    }
    // Fecha con promesa - Zinc oscuro
    return {
      style: {
        backgroundColor: '#3F3F46', // zinc-700
        borderColor: '#52525B', // zinc-600
        borderWidth: '2px',
        borderRadius: '6px',
        color: '#E4E4E7', // zinc-200 (texto claro para contraste)
        fontSize: '0.875rem',
        fontWeight: 600,
        padding: '4px 8px',
      },
    };
  }

  // 3. Cita (virtual o presencial) - Azul con variación según tipo
  if (hasAgendamiento && contexto === 'promise') {
    const isVirtual = item.type_scheduling === 'virtual';
    return {
      style: {
        backgroundColor: isVirtual ? '#8B5CF6' : '#3B82F6', // purple-500 para virtual, blue-500 para presencial
        borderColor: isVirtual ? '#7C3AED' : '#2563EB', // purple-600 para virtual, blue-600 para presencial
        borderWidth: '2px',
        borderRadius: '6px',
        color: '#FFFFFF',
        fontSize: '0.875rem',
        fontWeight: 500,
        padding: '4px 8px',
      },
    };
  }

  // 4. Evento - diferenciar fecha principal vs citas adicionales
  if (contexto === 'evento' && item) {
    // Fecha principal del evento - Verde emerald
    if (item.is_main_event_date) {
      return {
        style: {
          backgroundColor: '#10B981', // emerald-500
          borderColor: '#047857', // emerald-700
          borderWidth: '2px',
          borderRadius: '6px',
          color: '#FFFFFF',
          fontSize: '0.875rem',
          fontWeight: 600,
          padding: '4px 8px',
        },
      };
    }

    // Cita adicional del evento - Morado (virtual) o Azul (presencial)
    if (item.type_scheduling) {
      const isVirtual = item.type_scheduling === 'virtual';
      return {
        style: {
          backgroundColor: isVirtual ? '#8B5CF6' : '#3B82F6', // purple-500 para virtual, blue-500 para presencial
          borderColor: isVirtual ? '#7C3AED' : '#2563EB', // purple-600 para virtual, blue-600 para presencial
          borderWidth: '2px',
          borderRadius: '6px',
          color: '#FFFFFF',
          fontSize: '0.875rem',
          fontWeight: 500,
          padding: '4px 8px',
        },
      };
    }

    // Evento sin tipo específico (fallback) - Verde emerald
    return {
      style: {
        backgroundColor: '#10B981', // emerald-500
        borderColor: '#047857', // emerald-700
        borderWidth: '2px',
        borderRadius: '6px',
        color: '#FFFFFF',
        fontSize: '0.875rem',
        fontWeight: 500,
        padding: '4px 8px',
      },
    };
  }

  // Default: Azul
  return {
    style: {
      backgroundColor: '#3B82F6',
      borderColor: '#2563EB',
      borderWidth: '2px',
      borderRadius: '6px',
      color: '#FFFFFF',
      fontSize: '0.875rem',
      fontWeight: 500,
      padding: '4px 8px',
    },
  };
};

// Componente personalizado de evento con HoverCard
const AgendaEventComponent = ({
  event,
  onViewPromise,
  onViewEvento
}: {
  event: { resource?: AgendaItem; title?: string };
  onViewPromise?: (promiseId: string) => void;
  onViewEvento?: (eventoId: string) => void;
}) => {
  const item = event.resource as AgendaItem | undefined;

  if (!item) {
    return <div className="rbc-event-content cursor-pointer w-full h-full">{event.title}</div>;
  }

  const trigger = (
    <div className="rbc-event-content cursor-pointer w-full h-full relative z-10 flex items-center justify-between gap-1.5">
      <span className="flex-1 truncate">
        {event.title ? event.title.charAt(0).toUpperCase() + event.title.slice(1).toLowerCase() : ''}
      </span>
      {/* Indicador de sincronización Google Calendar */}
      {item.contexto === 'evento' && item.is_main_event_date && item.google_event_id && (
        <div title="Sincronizado con Google Calendar">
          <CheckCircle2
            className="h-3.5 w-3.5 text-white/90 shrink-0"
            style={{ filter: 'drop-shadow(0 0 2px rgba(16, 185, 129, 0.5))' }}
          />
        </div>
      )}
    </div>
  );

  return (
    <AgendaItemHoverCard
      item={item}
      trigger={trigger}
      onViewPromise={onViewPromise}
      onViewEvento={onViewEvento}
    />
  );
};

export function AgendaCalendar({
  events,
  onSelectEvent,
  onSelectSlot,
  onViewPromise,
  onViewEvento,
  defaultDate = new Date(),
  date,
  onNavigate,
  defaultView = 'month',
  view,
  onViewChange,
  className,
}: AgendaCalendarProps) {
  const currentDate = date || defaultDate;
  const calendarEvents = useMemo(() => {
    return events.map(agendaItemToEvent);
  }, [events]);

  // Calcular estadísticas
  const stats = useMemo(() => {
    // Citas virtuales: todas las que tienen type_scheduling === 'virtual'
    const citasVirtuales = events.filter(
      (item) => item.type_scheduling === 'virtual' && !item.is_main_event_date
    ).length;
    // Citas presenciales: todas las que tienen type_scheduling === 'presencial'
    const citasPresenciales = events.filter(
      (item) => item.type_scheduling === 'presencial' && !item.is_main_event_date
    ).length;
    // Total de citas
    const citas = citasVirtuales + citasPresenciales;
    // Fechas de interés: fechas tentativas de promesas (tentative_dates sin event_date)
    const fechasInteres = events.filter((item) => item.is_pending_date === true).length;
    // Fechas confirmadas de promesas: event_date o defined_date de promesas (NO eventos)
    const fechasConfirmadasPromesas = events.filter((item) => item.is_confirmed_event_date === true && item.contexto === 'promise').length;
    // Fechas principales de eventos: creadas al crear el evento (is_main_event_date)
    const fechasEventos = events.filter((item) => item.is_main_event_date === true).length;
    return { citas, citasVirtuales, citasPresenciales, fechasInteres, fechasConfirmadasPromesas, fechasEventos };
  }, [events]);

  // Configurar inicio de semana (lunes) y formatos en español
  const culture = 'es';
  const formats = {
    dayFormat: 'dddd',
    dayHeaderFormat: (date: Date) => moment(date).format('dddd'),
    dayRangeHeaderFormat: ({ start, end }: { start: Date; end: Date }) =>
      `${moment(start).format('D MMM')} - ${moment(end).format('D MMM')}`,
    eventTimeRangeFormat: ({ start, end }: { start: Date; end: Date }) =>
      `${moment(start).format('HH:mm')} - ${moment(end).format('HH:mm')}`,
    monthHeaderFormat: (date: Date) => moment(date).format('MMMM YYYY'),
    weekdayFormat: (date: Date) => moment(date).format('dddd'),
  };

  // Toolbar personalizado con navegación entre meses
  const CustomToolbar = ({
    view,
    onView,
    label,
    onNavigate,
    date,
  }: {
    view: string;
    onView: (view: string) => void;
    label: string;
    onNavigate: (action: 'PREV' | 'NEXT' | 'TODAY' | Date) => void;
    date: Date;
  }) => {
    const views: Array<'month' | 'week' | 'day' | 'agenda'> = ['month', 'week', 'day', 'agenda'];
    const viewLabels: Record<string, string> = {
      month: 'Mes',
      week: 'Semana',
      day: 'Día',
      agenda: 'Agenda',
    };

    const handlePrevious = () => {
      if (view === 'month') {
        onNavigate('PREV');
      } else if (view === 'week') {
        const newDate = new Date(date);
        newDate.setDate(newDate.getDate() - 7);
        onNavigate(newDate);
      } else if (view === 'day') {
        const newDate = new Date(date);
        newDate.setDate(newDate.getDate() - 1);
        onNavigate(newDate);
      }
    };

    const handleNext = () => {
      if (view === 'month') {
        onNavigate('NEXT');
      } else if (view === 'week') {
        const newDate = new Date(date);
        newDate.setDate(newDate.getDate() + 7);
        onNavigate(newDate);
      } else if (view === 'day') {
        const newDate = new Date(date);
        newDate.setDate(newDate.getDate() + 1);
        onNavigate(newDate);
      }
    };

    const handleToday = () => {
      onNavigate('TODAY');
    };

    return (
      <div className="rbc-toolbar flex items-center justify-between pb-4">
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handlePrevious}
            className="rbc-toolbar-button flex items-center justify-center p-2"
            aria-label="Mes anterior"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={handleToday}
            className="rbc-toolbar-button"
            aria-label="Hoy"
          >
            Hoy
          </button>
          <button
            type="button"
            onClick={handleNext}
            className="rbc-toolbar-button flex items-center justify-center p-2"
            aria-label="Mes siguiente"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <div className="rbc-toolbar-label text-center flex-1 font-semibold">{label}</div>
        <div className="flex items-center gap-2 shrink-0">
          {views.map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => onView(v)}
              className={`rbc-toolbar-button ${view === v ? 'rbc-active' : ''}`}
            >
              {viewLabels[v]}
            </button>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className={`bg-zinc-900 overflow-hidden ${className}`}>
      <div className="h-[600px]">
        <style jsx global>{`
        .rbc-calendar {
          background: rgb(24 24 27);
          color: rgb(228 228 231);
          font-family: inherit;
          border-radius: 0;
          overflow: hidden;
          position: relative;
          z-index: 1;
        }
        
        /* Bordes generales - zinc-800 (rgb(39 39 42)) */
        .rbc-calendar * {
          border-color: rgb(39 39 42) !important;
        }
        
        .rbc-event {
          position: relative;
          z-index: 2;
        }
        
        /* Contenedor de headers - borde superior completo */
        .rbc-month-view .rbc-row-bg,
        .rbc-month-view .rbc-header {
          border-top: 1px solid rgb(39 39 42);
        }
        
        .rbc-header {
          border-bottom: 1px solid rgb(39 39 42);
          border-top: 1px solid rgb(39 39 42);
          padding: 12px 0px;
          font-weight: 500;
          color: rgb(161 161 170);
          font-size: 0.875rem;
        }
        
        /* Primer header - borde izquierdo */
        .rbc-header:first-child {
          border-left: 1px solid rgb(39 39 42);
        }
        
        /* Último header - borde derecho */
        .rbc-header:last-child {
          border-right: 1px solid rgb(39 39 42);
        }
        
        /* Headers intermedios - sin borde izquierdo para evitar duplicados */
        .rbc-header:not(:first-child) {
          border-left: none;
        }
        
        .rbc-today {
          background-color: rgb(39 39 42);
        }
        
        .rbc-off-range-bg {
          background: rgb(39 39 42);
        }
        
        .rbc-date-cell {
          text-align: right;
          padding: 4px;
        }
        
        .rbc-date-cell > a {
          color: rgb(228 228 231);
        }
        
        .rbc-date-cell.rbc-off-range > a {
          color: rgb(113 113 122);
        }
        
        .rbc-date-cell.rbc-now > a {
          color: rgb(59 130 246);
          font-weight: 600;
        }
        
        .rbc-day-bg {
          border: 1px solid rgb(39 39 42);
        }
        
        /* Vista de mes - cuadrícula */
        .rbc-month-view {
          border: none;
        }
        
        .rbc-month-row {
          border: none;
          border-top: 1px solid rgb(39 39 42);
        }
        
        .rbc-month-row:first-child {
          border-top: none;
        }
        
        .rbc-row {
          border: none;
        }
        
        .rbc-row-segment {
          border: none;
        }
        
        .rbc-selected-cell {
          border-color: rgb(39 39 42);
        }
        
        .rbc-day-slot {
          border: none;
        }
        
        .rbc-time-slot {
          border-top: 1px solid rgb(39 39 42);
        }
        
        .rbc-time-header-gutter {
          border-right: 1px solid rgb(39 39 42);
        }
        
        .rbc-time-content {
          border-top: 1px solid rgb(39 39 42);
        }
        
        .rbc-time-header-content {
          border-left: 1px solid rgb(39 39 42);
        }
        
        .rbc-time-view {
          border: 1px solid rgb(39 39 42);
        }
        
        .rbc-day-view {
          border: 1px solid rgb(39 39 42);
        }
        
        .rbc-week-view {
          border: 1px solid rgb(39 39 42);
        }
        
        .rbc-toolbar {
          padding: 0;
          border-bottom: none;
          background: transparent;
        }
        
        .rbc-toolbar button {
          color: rgb(228 228 231);
          background: rgb(39 39 42);
          border: 1px solid rgb(39 39 42);
          padding: 6px 12px;
          border-radius: 6px;
          font-size: 0.875rem;
          transition: all 0.2s;
        }
        
        .rbc-toolbar button:hover {
          background: rgb(63 63 70);
          color: rgb(255 255 255);
          border-color: rgb(63 63 70);
        }
        
        .rbc-toolbar button:active,
        .rbc-toolbar button.rbc-active {
          background: rgb(59 130 246);
          color: rgb(255 255 255);
          border-color: rgb(59 130 246);
        }
        
        .rbc-toolbar-label {
          font-weight: 600;
          color: rgb(255 255 255);
          font-size: 1rem;
          text-align: left !important;
        }
        
        .rbc-event {
          border-radius: 6px;
          padding: 4px 8px;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .rbc-event:hover {
          opacity: 0.85;
          transform: translateY(-1px);
          border-color: rgb(39 39 42);
        }
        
        .rbc-event-content {
          font-size: 0.75rem;
          font-weight: 500;
          text-transform: capitalize;
        }
        
        /* Vista de agenda */
        .rbc-agenda-view table {
          background: rgb(24 24 27);
          border: 1px solid rgb(39 39 42);
        }
        
        .rbc-agenda-view table thead > tr > th {
          border-bottom: 1px solid rgb(39 39 42);
          border-right: 1px solid rgb(39 39 42);
        }
        
        .rbc-agenda-view table tbody > tr > td {
          border-color: rgb(39 39 42);
          padding: 12px;
        }
        
        .rbc-agenda-view table tbody > tr > td + td {
          border-left: 1px solid rgb(39 39 42);
        }
        
        .rbc-agenda-view table tbody > tr {
          border-bottom: 1px solid rgb(39 39 42);
        }
        
        .rbc-agenda-date-cell,
        .rbc-agenda-time-cell {
          color: rgb(161 161 170);
        }
        
        .rbc-agenda-event-cell {
          color: rgb(228 228 231);
        }
      `}</style>

        <Calendar
          key={currentDate.getTime()}
          localizer={localizer}
          events={calendarEvents}
          startAccessor="start"
          endAccessor="end"
          style={{ height: '100%' }}
          defaultDate={currentDate}
          defaultView={defaultView}
          view={view}
          onView={onViewChange}
          onNavigate={(newDate: Date) => {
            if (onNavigate) {
              onNavigate(newDate);
            }
          }}
          onSelectEvent={onSelectEvent ? (event) => onSelectEvent(event.resource) : undefined}
          onSelectSlot={onSelectSlot}
          selectable={!!onSelectSlot}
          eventPropGetter={zenEventStyleGetter}
          formats={formats}
          culture={culture}
          components={{
            event: (props: { event: { resource?: AgendaItem; title?: string } }) => (
              <AgendaEventComponent
                event={props.event}
                onViewPromise={onViewPromise}
                onViewEvento={onViewEvento}
              />
            ),
            toolbar: (props: {
              view: string;
              onView: (view: string) => void;
              label: string;
              onNavigate: (action: 'PREV' | 'NEXT' | 'TODAY' | Date) => void;
              date: Date;
            }) => {
              const handleToolbarNavigate = (action: 'PREV' | 'NEXT' | 'TODAY' | Date) => {
                if (!onNavigate) return;
                onNavigate(action);
              };

              return (
                <CustomToolbar
                  view={props.view}
                  onView={props.onView}
                  label={props.label}
                  onNavigate={handleToolbarNavigate}
                  date={props.date}
                />
              );
            },
          }}
          messages={{
            next: 'Siguiente',
            previous: 'Anterior',
            today: 'Hoy',
            month: 'Mes',
            week: 'Semana',
            day: 'Día',
            agenda: 'Agenda',
            date: 'Fecha',
            time: 'Hora',
            event: 'Evento',
            noEventsInRange: 'No hay agendamientos en este rango',
          }}
        />
      </div>

      {/* Footer con estadísticas */}
      <div className="border-t border-zinc-800 px-4 py-3">
        <div className="flex items-center justify-center gap-4 text-sm flex-wrap">
          {/* Citas presenciales */}
          {stats.citasPresenciales > 0 && (
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-blue-500"></div>
              <span className="text-zinc-300">
                <span className="font-semibold text-white">{stats.citasPresenciales}</span> cita{stats.citasPresenciales !== 1 ? 's' : ''} presencial{stats.citasPresenciales !== 1 ? 'es' : ''}
              </span>
            </div>
          )}
          {/* Citas virtuales */}
          {stats.citasVirtuales > 0 && (
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-purple-500"></div>
              <span className="text-zinc-300">
                <span className="font-semibold text-white">{stats.citasVirtuales}</span> cita{stats.citasVirtuales !== 1 ? 's' : ''} virtual{stats.citasVirtuales !== 1 ? 'es' : ''}
              </span>
            </div>
          )}
          {/* Total de citas (si hay ambas) */}
          {stats.citasPresenciales > 0 && stats.citasVirtuales > 0 && (
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-blue-500"></div>
              <span className="text-zinc-300">
                <span className="font-semibold text-white">{stats.citas}</span> cita{stats.citas !== 1 ? 's' : ''} total{stats.citas !== 1 ? 'es' : ''}
              </span>
            </div>
          )}
          {/* Solo mostrar total si hay citas pero no se muestran individuales */}
          {stats.citas > 0 && stats.citasPresenciales === 0 && stats.citasVirtuales === 0 && (
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-blue-500"></div>
              <span className="text-zinc-300">
                <span className="font-semibold text-white">{stats.citas}</span> cita{stats.citas !== 1 ? 's' : ''}
              </span>
            </div>
          )}
          {/* Fechas de interés (tentativas de promesas) */}
          {stats.fechasInteres > 0 && (
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-zinc-500"></div>
              <span className="text-zinc-300">
                <span className="font-semibold text-white">{stats.fechasInteres}</span> fecha{stats.fechasInteres !== 1 ? 's' : ''} de interés
              </span>
            </div>
          )}
          {/* Fechas con promesa (event_date/defined_date) */}
          {stats.fechasConfirmadasPromesas > 0 && (
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-zinc-700"></div>
              <span className="text-zinc-300">
                <span className="font-semibold text-white">{stats.fechasConfirmadasPromesas}</span> fecha{stats.fechasConfirmadasPromesas !== 1 ? 's' : ''} con promesa
              </span>
            </div>
          )}
          {/* Fechas principales de eventos (creadas al crear evento) */}
          {stats.fechasEventos > 0 && (
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-emerald-500"></div>
              <span className="text-zinc-300">
                <span className="font-semibold text-white">{stats.fechasEventos}</span> evento{stats.fechasEventos !== 1 ? 's' : ''}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

