export {
  obtenerEventos,
  obtenerEventoDetalle,
  checkSchedulerStatus,
  cancelarEvento,
  getEvents,
  moveEvent,
  actualizarNombreEvento,
  obtenerCotizacionesAutorizadasCount,
  obtenerCrewMembers,
  asignarCrewAItem,
  obtenerCategoriasCrew,
  actualizarRangoScheduler,
  crearSchedulerTask,
  actualizarSchedulerTask,
  asignarCrewYCompletarTarea,
  eliminarSchedulerTask,
  obtenerSchedulerTask,
  sincronizarTareasEvento,
} from './events.actions';

export {
  crearNominaDesdeTareaCompletada,
  eliminarNominaDesdeTareaDesmarcada,
  obtenerEstadoNominaPorTarea,
} from './payroll-actions';

export { obtenerTareasParaTodoList } from './obtener-tareas-todolist.actions';
export type { TodoListTask } from './obtener-tareas-todolist.actions';

export {
  actualizarSchedulerTaskFechas,
  obtenerSchedulerTareas,
  clasificarTareaScheduler,
  obtenerTareasScheduler,
  addSchedulerTaskNote,
  getSchedulerTaskNotes,
  corregirCircularParentIdEvento,
  resetCronogramaEvento,
} from './scheduler-actions';
export type { TareasSchedulerPayload, SchedulerData, SchedulerCotizacionItem, SchedulerItemForView } from './scheduler-actions';

export {
  getChecklistTemplates,
  importChecklistToTask,
} from './checklist-actions';
export type {
  GetChecklistTemplatesResult,
  ImportChecklistToTaskResult,
  ChecklistTemplateRow,
} from './checklist-actions';

export {
  getEventPipelineStages,
  updateEventPipelineStage,
  reorderEventPipelineStages,
} from './event-pipeline-stages.actions';

export type {
  UpdatePipelineStageData,
  ReorderPipelineStagesData,
} from './event-pipeline-stages.actions';

export type {
  EventoBasico,
  EventoDetalle,
  CheckSchedulerStatusResult,
  EventosListResponse,
  EventoDetalleResponse,
  CancelarEventoResponse,
} from './events.actions';

export type {
  EventWithContact,
  EventPipelineStage,
  EventsListResponse,
  EventResponse,
  EventPipelineStagesResponse,
  GetEventsParams,
  MoveEventData,
} from '@/lib/actions/schemas/events-schemas';

