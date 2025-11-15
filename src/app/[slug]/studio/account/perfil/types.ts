export interface PerfilData {
    id: string;
    name: string;
    email: string;
    phone: string;
    avatarUrl?: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface PerfilFormData {
    name: string;
    email: string;
    phone: string;
    avatarUrl?: string;
}
