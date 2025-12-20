// Exportaciones centralizadas de constantes
export {
    LEAD_STATUS,
    STUDIO_STATUS,
    USER_ROLES,
    CLIENT_STATUS,
    QUOTE_STATUS,
    ACTIVITY_TYPES
} from "./status";
export type {
    LeadStatus,
    StudioStatus,
    UserRole,
    ClientStatus,
    QuoteStatus,
    ActivityType
} from "./status";

export * from "./roles";
export * from "./config";

// Re-exportar enums con alias para evitar conflictos
export type { ActivityType as EnumsActivityType } from "./enums";
export { ENUMS } from "./enums";
export type {
    ProcessingStatus,
    NotificationType,
    FileType,
    IntegrationType,
    EventType,
    CommunicationChannel,
    Priority,
    Frequency,
    ReportType,
    ExportFormat
} from "./enums";
