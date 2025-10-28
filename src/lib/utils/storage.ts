/**
 * Utilidades para manejo de almacenamiento y cálculos de peso
 */

export function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function calculateTotalStorage(media: Array<{ storage_bytes?: number }>): number {
    return media.reduce((total, item) => {
        return total + (item.storage_bytes || 0);
    }, 0);
}

export function getStoragePercentage(used: number, limit: number): number {
    if (limit === 0) return 0;
    return Math.min((used / limit) * 100, 100);
}

export function getStorageStatus(percentage: number): {
    status: 'safe' | 'warning' | 'danger';
    color: string;
    message: string;
} {
    if (percentage < 70) {
        return {
            status: 'safe',
            color: 'text-emerald-400',
            message: 'Almacenamiento disponible'
        };
    } else if (percentage < 90) {
        return {
            status: 'warning',
            color: 'text-yellow-400',
            message: 'Almacenamiento casi lleno'
        };
    } else {
        return {
            status: 'danger',
            color: 'text-red-400',
            message: 'Almacenamiento crítico'
        };
    }
}

export function getStorageLimit(): number {
    // TODO: Obtener límite real del usuario desde la base de datos
    // Por ahora retornamos un límite por defecto
    return 5 * 1024 * 1024 * 1024; // 5GB
}

export function getStorageInfo(used: number): {
    used: number;
    limit: number;
    remaining: number;
    percentage: number;
    status: ReturnType<typeof getStorageStatus>;
} {
    const limit = getStorageLimit();
    const remaining = Math.max(0, limit - used);
    const percentage = getStoragePercentage(used, limit);
    const status = getStorageStatus(percentage);

    return {
        used,
        limit,
        remaining,
        percentage,
        status
    };
}
