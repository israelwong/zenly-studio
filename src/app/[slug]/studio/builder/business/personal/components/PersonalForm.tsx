'use client';

import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Save, X } from 'lucide-react';
import {
    ZenButton,
    ZenInput
} from '@/components/ui/zen';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle
} from '@/components/ui/shadcn/dialog';
import { Switch } from '@/components/ui/shadcn/switch';
import { z } from 'zod';
import {
    type PersonalData
} from '@/lib/actions/schemas/personal-schemas';

// Esquema de validación simplificado para el formulario
const formPersonalSchema = z.object({
    nombre: z.string().min(1, 'El nombre es requerido'),
    email: z.string().email('Email inválido'),
    telefono: z.string().min(1, 'El teléfono es requerido'),
    categoriaId: z.string().min(1, 'La categoría es requerida'),
    status: z.boolean(), // En el formulario seguimos usando boolean para el switch
    telefono_emergencia: z.string().optional(),
    cuenta_clabe: z.string().optional()
});

// Tipo temporal para el formulario con campos adicionales
type FormPersonalData = z.infer<typeof formPersonalSchema>;
import {
    crearPersonal,
    actualizarPersonal
} from '@/lib/actions/studio/config/personal.actions';
import {
    obtenerCategoriasPersonal,
    obtenerPerfilesPersonal
} from '@/lib/actions/studio/config/personal.actions';
import type { CategoriaPersonalData, PerfilPersonalData } from '@/lib/actions/schemas/personal-schemas';

interface PersonalFormProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    studioSlug: string;
    personal?: PersonalData | null;
}

export function PersonalForm({
    isOpen,
    onClose,
    onSuccess,
    studioSlug,
    personal
}: PersonalFormProps) {
    const [loading, setLoading] = useState(false);
    const [categorias, setCategorias] = useState<CategoriaPersonalData[]>([]);
    const [perfiles, setPerfiles] = useState<PerfilPersonalData[]>([]);
    const [perfilesSeleccionados, setPerfilesSeleccionados] = useState<string[]>([]);
    const isEditing = !!personal;

    const {
        register,
        handleSubmit,
        formState: { errors },
        watch,
        setValue
    } = useForm<FormPersonalData>({
        resolver: zodResolver(formPersonalSchema),
        defaultValues: isEditing ? {
            nombre: personal.nombre,
            email: personal.email || '',
            telefono: personal.telefono || '',
            categoriaId: personal.categoriaId,
            status: personal.status === 'activo',
            telefono_emergencia: '',
            cuenta_clabe: ''
        } : {
            nombre: '',
            email: '',
            telefono: '',
            categoriaId: '',
            status: true,
            telefono_emergencia: '',
            cuenta_clabe: ''
        }
    });

    const statusValue = watch('status');

    // Definir funciones de carga con useCallback
    const cargarCategorias = useCallback(async () => {
        try {
            const result = await obtenerCategoriasPersonal(studioSlug);
            if (result.success && result.data) {
                setCategorias(result.data);
            }
        } catch (error) {
            console.error('Error al cargar categorías:', error);
        }
    }, [studioSlug]);

    const cargarPerfiles = useCallback(async () => {
        try {
            const result = await obtenerPerfilesPersonal(studioSlug);
            if (result.success && result.data) {
                setPerfiles(result.data);
            }
        } catch (error) {
            console.error('Error al cargar perfiles:', error);
        }
    }, [studioSlug]);

    // Cargar categorías y perfiles
    useEffect(() => {
        if (isOpen) {
            cargarCategorias();
            cargarPerfiles();

            // Cargar perfiles seleccionados si estamos editando
            if (isEditing && personal) {
                // Nota: Necesitaremos ajustar esto según la estructura real de datos
                setPerfilesSeleccionados([]);
            } else {
                setPerfilesSeleccionados([]);
            }
        }
    }, [isOpen, isEditing, personal, cargarCategorias, cargarPerfiles]);

    const onSubmit = async (data: FormPersonalData) => {
        setLoading(true);
        const loadingToast = toast.loading(
            isEditing ? 'Actualizando personal...' : 'Creando personal...'
        );

        try {
            // Transformar datos del formulario al formato esperado por las acciones
            const personalData = {
                nombre: data.nombre,
                email: data.email || undefined,
                telefono: data.telefono || undefined,
                categoriaId: data.categoriaId,
                status: data.status ? 'activo' : 'inactivo', // Convertir boolean a string
                perfilesIds: perfilesSeleccionados,
                // Campos adicionales (se enviarán pero pueden no ser procesados aún)
                telefono_emergencia: data.telefono_emergencia || undefined,
                cuenta_clabe: data.cuenta_clabe || undefined
            };

            let result;
            if (isEditing && personal?.id) {
                result = await actualizarPersonal(studioSlug, personal.id, personalData);
            } else {
                result = await crearPersonal(studioSlug, personalData);
            }

            if (result.success && result.data) {
                toast.dismiss(loadingToast);
                toast.success(
                    isEditing
                        ? 'Personal actualizado exitosamente'
                        : 'Personal creado exitosamente'
                );
                onSuccess();
            } else {
                toast.dismiss(loadingToast);
                toast.error(result.error || 'Error al guardar personal');
            }
        } catch (error) {
            console.error('Error al guardar personal:', error);
            toast.dismiss(loadingToast);
            toast.error('Error interno del servidor. Inténtalo de nuevo.');
        } finally {
            setLoading(false);
        }
    };


    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>
                        {isEditing ? 'Editar Personal' : 'Nuevo Personal'}
                    </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                    {/* Nombre */}
                    <ZenInput
                        label="Nombre Completo"
                        placeholder="Ej: Juan Pérez"
                        required
                        error={errors.nombre?.message}
                        {...register('nombre')}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Email */}
                        <ZenInput
                            label="Email"
                            type="email"
                            placeholder="juan@ejemplo.com"
                            required
                            error={errors.email?.message}
                            {...register('email')}
                        />

                        {/* Teléfono */}
                        <ZenInput
                            label="Teléfono"
                            placeholder="+52 55 1234 5678"
                            required
                            error={errors.telefono?.message}
                            {...register('telefono')}
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Teléfono de Emergencia */}
                        <ZenInput
                            label="Teléfono de Emergencia"
                            placeholder="+52 55 9876 5432"
                            hint="Opcional"
                            error={errors.telefono_emergencia?.message}
                            {...register('telefono_emergencia')}
                        />

                        {/* Cuenta CLABE */}
                        <ZenInput
                            label="Cuenta CLABE"
                            placeholder="012345678901234567"
                            hint="Opcional - Para pagos"
                            error={errors.cuenta_clabe?.message}
                            {...register('cuenta_clabe')}
                        />
                    </div>

                    {/* Categoría */}
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-zinc-300 mb-2">
                            Categoría <span className="text-red-400">*</span>
                        </label>
                        <select
                            {...register('categoriaId')}
                            className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                            <option value="">Selecciona una categoría</option>
                            {categorias.map((categoria) => (
                                <option key={categoria.id} value={categoria.id}>
                                    {categoria.nombre} {categoria.descripcion && `- ${categoria.descripcion}`}
                                </option>
                            ))}
                        </select>
                        {errors.categoriaId && (
                            <p className="text-sm text-red-400">{errors.categoriaId.message}</p>
                        )}
                        {categorias.length === 0 && (
                            <p className="text-sm text-yellow-400">
                                No hay categorías disponibles. Crea una categoría primero.
                            </p>
                        )}
                    </div>

                    {/* Perfiles Asociados */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <label className="block text-sm font-medium text-zinc-300">
                                Perfiles Asociados
                            </label>
                            {perfiles.length > 0 && (
                                <span className="text-xs text-blue-400 bg-blue-900/20 px-2 py-1 rounded-full">
                                    {perfilesSeleccionados.length} seleccionado{perfilesSeleccionados.length !== 1 ? 's' : ''}
                                </span>
                            )}
                        </div>
                        <p className="text-sm text-zinc-500">
                            Selecciona uno o más perfiles para este personal
                        </p>

                        {perfiles.length === 0 ? (
                            <div className="text-center py-6 text-zinc-500 bg-zinc-800/30 rounded-lg border border-zinc-700">
                                <div className="space-y-2">
                                    <div className="text-zinc-400">No hay perfiles disponibles</div>
                                    <div className="text-xs text-zinc-500">Crea perfiles primero usando el botón &quot;Perfiles&quot; arriba</div>
                                </div>
                            </div>
                        ) : (
                            <div className="relative">
                                {/* Contenedor con scroll limitado */}
                                <div className="max-h-48 overflow-y-auto border border-zinc-700 rounded-lg bg-zinc-800/20 scrollbar-thin scrollbar-thumb-zinc-600 scrollbar-track-zinc-800">
                                    <div className="p-3 space-y-2">
                                        {perfiles.map((perfil) => (
                                            <label
                                                key={perfil.id}
                                                className="flex items-center space-x-3 p-2 rounded-md hover:bg-zinc-700/50 cursor-pointer transition-colors group"
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={perfilesSeleccionados.includes(perfil.id)}
                                                    onChange={(e) => {
                                                        if (e.target.checked) {
                                                            setPerfilesSeleccionados([...perfilesSeleccionados, perfil.id]);
                                                        } else {
                                                            setPerfilesSeleccionados(perfilesSeleccionados.filter(id => id !== perfil.id));
                                                        }
                                                    }}
                                                    className="w-4 h-4 text-blue-600 bg-zinc-900 border-zinc-600 rounded focus:ring-blue-500 focus:ring-2"
                                                />
                                                <div className="flex-1 min-w-0">
                                                    <div className="font-medium text-white group-hover:text-blue-100 transition-colors">
                                                        {perfil.nombre}
                                                    </div>
                                                    {perfil.descripcion && (
                                                        <div className="text-xs text-zinc-400 group-hover:text-zinc-300 transition-colors truncate">
                                                            {perfil.descripcion}
                                                        </div>
                                                    )}
                                                </div>
                                                {perfilesSeleccionados.includes(perfil.id) && (
                                                    <div className="text-blue-400 text-xs">✓</div>
                                                )}
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                {/* Indicador de scroll si hay muchos perfiles */}
                                {perfiles.length > 6 && (
                                    <div className="text-center mt-2">
                                        <p className="text-xs text-zinc-500 flex items-center justify-center gap-1">
                                            <span>↕</span>
                                            Desplázate para ver más perfiles
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Estado - Switch */}
                    <div className="flex items-center justify-between p-4 bg-zinc-800/30 rounded-lg border border-zinc-700">
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-zinc-300">
                                Estado del Personal
                            </label>
                            <p className="text-xs text-zinc-500">
                                {statusValue ? 'Personal activo y disponible' : 'Personal inactivo'}
                            </p>
                        </div>
                        <Switch
                            checked={statusValue}
                            onCheckedChange={(checked) => setValue('status', checked)}
                        />
                    </div>

                    {/* Botones */}
                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-800">
                        <ZenButton
                            type="button"
                            variant="outline"
                            onClick={onClose}
                            disabled={loading}
                        >
                            <X className="h-4 w-4 mr-2" />
                            Cancelar
                        </ZenButton>

                        <ZenButton
                            type="submit"
                            variant="primary"
                            loading={loading}
                            disabled={loading}
                        >
                            <Save className="h-4 w-4 mr-2" />
                            {isEditing ? 'Actualizar' : 'Crear'} Personal
                        </ZenButton>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
