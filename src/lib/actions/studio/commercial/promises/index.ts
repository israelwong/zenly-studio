export {
  getPromises,
  getPromiseByIdAsPromiseWithContact,
  createPromise,
  updatePromise,
  movePromise,
  archivePromise,
  unarchivePromise,
  deletePromise,
  getPromiseDeletionInfo,
} from './promises.actions';

export {
  getPipelineStages,
  createPipelineStage,
  updatePipelineStage,
  reorderPipelineStages,
} from './promise-pipeline-stages.actions';

export {
  getPromiseLogs,
  getLastPromiseLogs,
  createPromiseLog,
  updatePromiseLog,
  deletePromiseLog,
  getPromiseIdByContactId,
  getPromiseById,
  logPromiseAction,
} from './promise-logs.actions';

export type { PromiseLogAction, PromiseLog, PromiseLogsResponse } from './promise-logs.actions';

export {
  getPromiseLogTemplates,
  createPromiseLogTemplate,
  updatePromiseLogTemplate,
  deletePromiseLogTemplate,
} from './promise-log-templates.actions';

export type { PromiseLogTemplate } from './promise-log-templates.actions';

export {
  getWhatsAppTemplates,
  createWhatsAppTemplate,
  updateWhatsAppTemplate,
  deleteWhatsAppTemplate,
  duplicateWhatsAppTemplate,
} from './whatsapp-templates.actions';
export type { WhatsAppTemplate } from './whatsapp-templates.actions';

export {
  logWhatsAppSent,
  logWhatsAppSentWithMessage,
  logCallMade,
  logProfileShared,
  logEmailSent,
} from './promise-quick-actions.actions';

export {
  getPromiseShareSettings,
  updatePromiseShareSettings,
  type PromiseShareSettings,
} from './promise-share-settings.actions';

export {
  getEventTypes,
} from './event-types.actions';

export {
  getPromiseTags,
  createPromiseTag,
  updatePromiseTag,
  deletePromiseTag,
  getPromiseTagsByPromiseId,
  addTagToPromise,
  removeTagFromPromise,
  createOrFindTagAndAddToPromise,
} from './promise-tags.actions';

export type { PromiseTag } from './promise-tags.actions';

export {
  upsertReminder,
  getReminderByPromise,
  completeReminder,
  deleteReminder,
  getRemindersDue,
  getRemindersDueCount, // ✅ OPTIMIZACIÓN: Función optimizada para contar sin cargar arrays
} from './reminders.actions';

export type { Reminder, ReminderWithPromise } from './reminders.actions';

export {
  getReminderSubjects,
  createReminderSubject,
  updateReminderSubject,
  deleteReminderSubject,
} from './reminder-subjects.actions';

export type { ReminderSubject } from './reminder-subjects.actions';

