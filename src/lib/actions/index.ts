// Exportaciones centralizadas de Server Actions
export * from "./constants";
export * from "./schemas";
export * from "./utils";

// Re-exportar tipos importantes para facilitar el uso
export type {
    // Constantes
    LeadStatus,
    StudioStatus,
    UserRole,
    ClientStatus,
    QuoteStatus,
    ActivityType,
    ProcessingStatus,
    NotificationType,
    FileType,
    IntegrationType,
    EventType,
    CommunicationChannel,
    Priority,
    Frequency,
    ReportType,
    ExportFormat,
} from "./constants";

export type {
    // Schemas compartidos
    PaginationForm,
    DateRangeForm,
    SearchForm,
    CommonFiltersForm,
    IdForm,
    EmailForm,
    PhoneForm,
    NameForm,
    PasswordForm,
    NotesForm,
    UrlForm,
    FileForm,
    AddressForm,
    CoordinatesForm,
    ScheduleForm,
    SocialMediaForm,
    NotificationPreferencesForm,
} from "./schemas/shared-schemas";

export type {
    // Schemas de leads
    LeadCreateForm,
    LeadUpdateForm,
    LeadFiltersForm,
    LeadStatusChangeForm,
    LeadNoteForm,
    LeadAssignmentForm,
    LeadDuplicateForm,
    LeadExportForm,
    LeadImportForm,
    LeadStatsForm,
} from "./schemas/lead-schemas";

export type {
    // Schemas de studio
    StudioCreateForm,
    StudioUpdateForm,
    StudioAccountConfigForm,
    StudioBusinessConfigForm,
    StudioStaffConfigForm,
    StudioScheduleConfigForm,
    StudioSocialMediaConfigForm,
    StudioIntegrationsConfigForm,
    StudioFiltersForm,
    StudioStatsForm,
} from "./schemas/studio-schemas";

export type {
    // Schemas de usuario
    UserCreateForm,
    UserUpdateForm,
    UserProfileForm,
    ChangePasswordForm,
    ResetPasswordForm,
    ConfirmResetPasswordForm,
    LoginForm,
    RegisterForm,
    VerifyEmailForm,
    ResendVerificationForm,
    UserFiltersForm,
    UserRoleAssignmentForm,
    UserStatusForm,
    UserStatsForm,
} from "./schemas/user-schemas";

export type {
    // Schemas de personal
    PersonnelType,
    PersonnelProfile,
    PersonalCreateForm,
    PersonalUpdateForm,
    PersonalFiltersForm,
    ProfessionalProfileForm,
} from "./schemas/personal-schemas";
