"use client";

import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { SeccionesListView } from "./secciones";
import { CategoriasListView, CategoriaEditorModal, CategoriaFormData } from "./categorias";
import { ItemsListView, ItemEditorModal, ItemFormData } from "./items";
import { SeccionEditorModal, SeccionFormData } from "./secciones";
import { ZenConfirmModal } from "@/components/ui/zen/overlays/ZenConfirmModal";
import { StorageIndicator } from "./shared";
import { ConfiguracionPrecios } from "@/lib/actions/studio/builder/catalogo/calcular-precio";
import {
  crearSeccion,
  actualizarSeccion,
  eliminarSeccion,
  reordenarSecciones,
  crearCategoria,
  actualizarCategoria,
  eliminarCategoria,
  reordenarCategorias,
  obtenerCategoriasConStats,
  crearItem,
  actualizarItem,
  eliminarItem,
  reordenarItems,
  obtenerItemsConStats,
} from "@/lib/actions/studio/builder/catalogo";
import { obtenerConfiguracionPrecios } from "@/lib/actions/studio/builder/catalogo/utilidad.actions";
import { calcularStorageCompleto, type StorageStats } from "@/lib/actions/studio/builder/catalogo/calculate-storage.actions";

type NavigationLevel = 1 | 2 | 3 | 4;

interface Seccion {
  id: string;
  name: string;
  order: number;
  createdAt: Date;
  categories?: Array<{ id: string; name: string }>;
  items?: number;
  mediaSize?: number;
}

interface Categoria {
  id: string;
  name: string;
  description?: string;
  items?: number;
  mediaSize?: number;
}

interface Item {
  id: string;
  name: string;
  cost: number;
  tipoUtilidad?: 'servicio' | 'producto';
  isNew?: boolean;
  isFeatured?: boolean;
  mediaSize?: number;
  gastos?: Array<{
    nombre: string;
    costo: number;
  }>;
}

interface CatalogoContainerProps {
  studioSlug: string;
  secciones: Seccion[];
  onNavigateToUtilidad?: () => void;
}

/**
 * Container que maneja la navegación de 4 niveles
 * Integra todos los componentes del catálogo V2
 */
export function CatalogoContainer({
  studioSlug,
  secciones: initialSecciones,
  onNavigateToUtilidad,
}: CatalogoContainerProps) {
  // Estado de navegación
  const [currentLevel, setCurrentLevel] = useState<NavigationLevel>(1);
  const [secciones, setSecciones] = useState<Seccion[]>(initialSecciones);
  const [selectedSeccion, setSelectedSeccion] = useState<Seccion | null>(null);
  const [selectedCategoria, setSelectedCategoria] = useState<Categoria | null>(
    null
  );
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);

  // Datos de navegación
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [storageUsage, setStorageUsage] = useState<StorageStats | null>(null);
  const [preciosConfig, setPreciosConfig] = useState<ConfiguracionPrecios | null>(null);

  // Estados de carga
  const [isLoading, setIsLoading] = useState(false);

  // Cargar configuración de precios al montar el componente
  useEffect(() => {
    loadConfiguracionPrecios();
  }, [studioSlug]);

  // Estados de modales
  const [isSeccionModalOpen, setIsSeccionModalOpen] = useState(false);
  const [seccionToEdit, setSeccionToEdit] = useState<Seccion | null>(null);

  // Estado para el modal de categorías
  const [isCategoriaModalOpen, setIsCategoriaModalOpen] = useState(false);
  const [categoriaToEdit, setCategoriaToEdit] = useState<Categoria | null>(null);

  // Estado para confirmación de eliminación de categoría
  const [isDeleteCategoriaConfirmModalOpen, setIsDeleteCategoriaConfirmModalOpen] = useState(false);
  const [categoriaToDelete, setCategoriaToDelete] = useState<Categoria | null>(null);

  // Estado para el modal de items
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [itemToEdit, setItemToEdit] = useState<ItemFormData | null>(null);

  // Estado para confirmación de eliminación de item
  const [isDeleteItemConfirmModalOpen, setIsDeleteItemConfirmModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ id: string; name: string } | null>(null);

  // Estado para el modal de confirmación de eliminación
  const [isDeleteConfirmModalOpen, setIsDeleteConfirmModalOpen] = useState(false);
  const [seccionToDelete, setSeccionToDelete] = useState<Seccion | null>(null);

  // Cargar storage usage en NIVEL 1
  useEffect(() => {
    if (currentLevel === 1) {
      loadStorageUsage();
    }
  }, [currentLevel]);

  // Cargar configuración de precios al montar
  useEffect(() => {
    loadConfiguracionPrecios();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studioSlug]);

  // Cargar datos de almacenamiento al montar
  useEffect(() => {
    const loadStorageData = async () => {
      try {
        const result = await calcularStorageCompleto(studioSlug);
        if (result.success && result.data) {
          setStorageUsage(result.data);

          // Actualizar secciones con mediaSize
          const seccionesActualizadas = secciones.map(sec => {
            const storageSection = result.data!.sections.find(s => s.sectionId === sec.id);
            return {
              ...sec,
              mediaSize: storageSection?.subtotal || 0,
            };
          });
          setSecciones(seccionesActualizadas);
        }
      } catch (error) {
        console.error("Error loading storage data:", error);
      }
    };
    loadStorageData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studioSlug]);

  const loadStorageUsage = async () => {
    try {
      // TODO: Implementar llamada a server action para obtener storage usage
      const usage: StorageStats = {
        studioId: studioSlug,
        totalBytes: 0,
        sections: [],
        categoriesGlobalBytes: 0,
        itemsGlobalBytes: 0,
      };
      setStorageUsage(usage);
    } catch (error) {
      console.error("Error loading storage usage:", error);
    }
  };

  const loadConfiguracionPrecios = async () => {
    try {
      const config = await obtenerConfiguracionPrecios(studioSlug);
      if (config) {
        // Config viene como strings, convertir a números
        const utilidad_servicio = typeof config.utilidad_servicio === 'string'
          ? parseFloat(config.utilidad_servicio)
          : config.utilidad_servicio;
        const utilidad_producto = typeof config.utilidad_producto === 'string'
          ? parseFloat(config.utilidad_producto)
          : config.utilidad_producto;
        const comision_venta = typeof config.comision_venta === 'string'
          ? parseFloat(config.comision_venta)
          : config.comision_venta;
        const sobreprecio = typeof config.sobreprecio === 'string'
          ? parseFloat(config.sobreprecio)
          : config.sobreprecio;

        setPreciosConfig({
          utilidad_servicio,
          utilidad_producto,
          comision_venta,
          sobreprecio,
        });
      }
    } catch (error) {
      console.error("Error loading configuración de precios:", error);
      // Usar valores por defecto
      setPreciosConfig({
        utilidad_servicio: 0.30,
        utilidad_producto: 0.40,
        comision_venta: 0.10,
        sobreprecio: 0.05,
      });
    }
  };

  const handleSelectSeccion = async (seccion: Seccion) => {
    setSelectedSeccion(seccion);
    setCurrentLevel(2);

    // Cargar categorías de la sección
    try {
      setIsLoading(true);
      const response = await obtenerCategoriasConStats(seccion.id);

      if (response.success && response.data) {
        // Transformar CategoriaData a Categoria interface
        const categoriasTransformadas = response.data.map((cat) => ({
          id: cat.id,
          name: cat.name,
          description: cat.description ?? undefined,
          items: cat.totalItems,
          mediaSize: cat.mediaSize,
        }));
        setCategorias(categoriasTransformadas);
      } else {
        toast.error(response.error || "Error al cargar categorías");
        setCategorias([]);
      }
    } catch (error) {
      console.error("Error loading categorias:", error);
      toast.error("Error al cargar categorías");
      setCategorias([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReorderSecciones = async (seccionIds: string[]) => {
    try {
      // Llamar server action para persistir en BD
      const result = await reordenarSecciones(studioSlug, seccionIds);

      if (!result.success) {
        toast.error(result.error || "Error al reordenar secciones");
        throw new Error(result.error);
      }

      // Actualizar estado local con nuevo orden
      const seccionesReordenadas = seccionIds
        .map((id) => secciones.find((s) => s.id === id))
        .filter(Boolean) as Seccion[];

      setSecciones(seccionesReordenadas);
      toast.success("Secciones reordenadas correctamente");
    } catch (error) {
      console.error("Error reordenando secciones:", error);
      toast.error("Error al reordenar secciones");
      throw error;
    }
  };

  const handleSelectCategoria = async (categoria: Categoria) => {
    setSelectedCategoria(categoria);
    setCurrentLevel(3);

    // Cargar items de la categoría
    try {
      setIsLoading(true);
      const response = await obtenerItemsConStats(categoria.id);

      if (response.success && response.data) {
        // Transformar ItemData a Item interface
        const itemsTransformadas = response.data.map((item) => ({
          id: item.id,
          name: item.name,
          cost: item.cost,
          tipoUtilidad: item.tipoUtilidad,
          mediaSize: item.mediaSize,
          gastos: item.gastos,
        }));
        setItems(itemsTransformadas);
      } else {
        toast.error(response.error || "Error al cargar items");
        setItems([]);
      }
    } catch (error) {
      console.error("Error loading items:", error);
      toast.error("Error al cargar items");
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  };

  // TODO: NIVEL 4 - Implementar cuando se necesite seleccionar item individual
  // const handleSelectItem = (item: Item) => {
  //   setSelectedItem(item);
  //   setCurrentLevel(4);
  //   // TODO: Abrir ItemEditorModal en NIVEL 4
  // };

  const handleBack = () => {
    if (currentLevel > 1) {
      setCurrentLevel((prev) => (prev - 1) as NavigationLevel);
    }
  };

  const handleCreateSeccion = () => {
    setSeccionToEdit(null);
    setIsSeccionModalOpen(true);
  };

  const handleEditSeccion = (seccion: Seccion) => {
    setSeccionToEdit(seccion);
    setIsSeccionModalOpen(true);
  };

  const handleSaveSeccion = async (data: SeccionFormData) => {
    try {
      if (data.id) {
        // Actualizar sección existente
        const response = await actualizarSeccion(studioSlug, data);

        if (!response.success) {
          throw new Error(response.error || "Error al actualizar sección");
        }

        // Actualizar en el estado local
        setSecciones((prev) =>
          prev.map((s) =>
            s.id === data.id
              ? {
                ...s,
                name: data.name,
              }
              : s
          )
        );
        toast.success("Sección actualizada");
      } else {
        // Crear nueva sección
        const response = await crearSeccion(studioSlug, data);

        if (!response.success) {
          throw new Error(response.error || "Error al crear sección");
        }

        // Agregar al estado local SIN recargar
        if (response.data) {
          setSecciones((prev) => [...prev, response.data as Seccion]);
          toast.success("Sección creada");
        }
      }

      setIsSeccionModalOpen(false);
      setSeccionToEdit(null);
    } catch (error) {
      console.error("Error guardando sección:", error);
      toast.error(error instanceof Error ? error.message : "Error al guardar sección");
      throw error;
    }
  };

  const handleDeleteSeccion = async (seccionId: string) => {
    // Abrir modal de confirmación
    const seccionAEliminar = secciones.find((s) => s.id === seccionId);
    if (seccionAEliminar) {
      setSeccionToDelete(seccionAEliminar);
      setIsDeleteConfirmModalOpen(true);
    }
  };

  const handleConfirmDeleteSeccion = async () => {
    if (!seccionToDelete) return;

    try {
      setIsLoading(true);
      const response = await eliminarSeccion(studioSlug, seccionToDelete.id);

      if (!response.success) {
        throw new Error(response.error || "Error al eliminar sección");
      }

      // Remover del estado local SIN recargar
      setSecciones((prev) => prev.filter((s) => s.id !== seccionToDelete.id));

      // Si se elimina la sección seleccionada, resetear navegación
      if (selectedSeccion?.id === seccionToDelete.id) {
        setSelectedSeccion(null);
        setSelectedCategoria(null);
        setSelectedItem(null);
        setCurrentLevel(1);
      }

      toast.success("Sección eliminada correctamente");
    } catch (error) {
      console.error("Error eliminando sección:", error);
      toast.error(
        error instanceof Error ? error.message : "Error al eliminar sección"
      );
    } finally {
      setIsLoading(false);
      setIsDeleteConfirmModalOpen(false);
      setSeccionToDelete(null);
    }
  };

  const handleCreateCategoria = () => {
    setCategoriaToEdit(null);
    setIsCategoriaModalOpen(true);
  };

  const handleEditCategoria = (categoria: Categoria) => {
    setCategoriaToEdit(categoria);
    setIsCategoriaModalOpen(true);
  };

  const handleSaveCategoria = async (data: CategoriaFormData) => {
    try {
      if (data.id) {
        // Actualizar categoría existente
        const response = await actualizarCategoria(data);

        if (!response.success) {
          throw new Error(response.error || "Error al actualizar categoría");
        }

        // Actualizar en el estado local
        setCategorias((prev) =>
          prev.map((c) =>
            c.id === data.id
              ? {
                ...c,
                name: data.name,
                description: data.description,
              }
              : c
          )
        );
        toast.success("Categoría actualizada");
      } else {
        // Crear nueva categoría
        if (!selectedSeccion) {
          throw new Error("Sección no seleccionada");
        }

        const response = await crearCategoria({
          name: data.name,
          description: data.description,
          seccionId: selectedSeccion.id,
        });

        if (!response.success) {
          throw new Error(response.error || "Error al crear categoría");
        }

        // Agregar al estado local
        if (response.data) {
          setCategorias((prev) => [...prev, response.data as Categoria]);
          toast.success("Categoría creada");
        }
      }

      setIsCategoriaModalOpen(false);
      setCategoriaToEdit(null);
    } catch (error) {
      console.error("Error guardando categoría:", error);
      toast.error(error instanceof Error ? error.message : "Error al guardar categoría");
      throw error;
    }
  };

  const handleDeleteCategoria = async (categoriaId: string) => {
    const categoriaAEliminar = categorias.find((c) => c.id === categoriaId);
    if (categoriaAEliminar) {
      setCategoriaToDelete(categoriaAEliminar);
      setIsDeleteCategoriaConfirmModalOpen(true);
    }
  };

  const handleConfirmDeleteCategoria = async () => {
    if (!categoriaToDelete) return;

    try {
      setIsLoading(true);
      const response = await eliminarCategoria(categoriaToDelete.id);

      if (!response.success) {
        throw new Error(response.error || "Error al eliminar categoría");
      }

      // Remover del estado local
      setCategorias((prev) => prev.filter((c) => c.id !== categoriaToDelete.id));

      // Si se elimina la categoría seleccionada, resetear navegación
      if (selectedCategoria?.id === categoriaToDelete.id) {
        setSelectedCategoria(null);
        setSelectedItem(null);
        setCurrentLevel(2);
      }

      toast.success("Categoría eliminada correctamente");
    } catch (error) {
      console.error("Error eliminando categoría:", error);
      toast.error(
        error instanceof Error ? error.message : "Error al eliminar categoría"
      );
    } finally {
      setIsLoading(false);
      setIsDeleteCategoriaConfirmModalOpen(false);
      setCategoriaToDelete(null);
    }
  };

  const handleReorderCategorias = async (categoriaIds: string[]) => {
    try {
      const result = await reordenarCategorias(categoriaIds);

      if (!result.success) {
        toast.error(result.error || "Error al reordenar categorías");
        throw new Error(result.error);
      }

      // Actualizar estado local con nuevo orden
      const categoriasReordenadas = categoriaIds
        .map((id) => categorias.find((c) => c.id === id))
        .filter(Boolean) as Categoria[];

      setCategorias(categoriasReordenadas);
      toast.success("Categorías reordenadas correctamente");
    } catch (error) {
      console.error("Error reordenando categorías:", error);
      toast.error("Error al reordenar categorías");
      throw error;
    }
  };

  const handleCreateItem = () => {
    setItemToEdit(null);
    setIsItemModalOpen(true);
  };

  const handleEditItem = (item: ItemFormData) => {
    setItemToEdit(item);
    setIsItemModalOpen(true);
  };

  const handleSaveItem = async (data: ItemFormData) => {
    try {
      if (data.id) {
        // Actualizar item existente
        const response = await actualizarItem(data);

        if (!response.success) {
          throw new Error(response.error || "Error al actualizar item");
        }

        // Actualizar en el estado local
        setItems((prev) =>
          prev.map((i) =>
            i.id === data.id
              ? {
                ...i,
                name: data.name,
                cost: data.cost,
                tipoUtilidad: data.tipoUtilidad,
              }
              : i
          )
        );
        toast.success("Item actualizado");
      } else {
        // Crear nuevo item
        if (!selectedCategoria) {
          throw new Error("Categoría no seleccionada");
        }

        const response = await crearItem({
          name: data.name,
          cost: data.cost,
          description: data.description,
          categoriaeId: selectedCategoria.id,
        });

        if (!response.success) {
          throw new Error(response.error || "Error al crear item");
        }

        // Agregar al estado local
        if (response.data) {
          setItems((prev) => [
            ...prev,
            {
              id: response.data!.id,
              name: response.data!.name,
              cost: response.data!.cost,
              mediaSize: response.data!.mediaSize,
            },
          ]);
          toast.success("Item creado");
        }
      }

      setIsItemModalOpen(false);
      setItemToEdit(null);
    } catch (error) {
      console.error("Error guardando item:", error);
      toast.error(error instanceof Error ? error.message : "Error al guardar item");
      throw error;
    }
  };

  const handleDeleteItem = async (itemId: string, itemName: string) => {
    setItemToDelete({ id: itemId, name: itemName });
    setIsDeleteItemConfirmModalOpen(true);
  };

  const handleConfirmDeleteItem = async () => {
    if (!itemToDelete) return;

    try {
      setIsLoading(true);
      const response = await eliminarItem(itemToDelete.id);

      if (!response.success) {
        throw new Error(response.error || "Error al eliminar item");
      }

      // Remover del estado local
      setItems((prev) => prev.filter((i) => i.id !== itemToDelete.id));

      // Si se elimina el item seleccionado, resetear navegación
      if (selectedItem?.id === itemToDelete.id) {
        setSelectedItem(null);
      }

      toast.success("Item eliminado correctamente");
    } catch (error) {
      console.error("Error eliminando item:", error);
      toast.error(
        error instanceof Error ? error.message : "Error al eliminar item"
      );
    } finally {
      setIsLoading(false);
      setIsDeleteItemConfirmModalOpen(false);
      setItemToDelete(null);
    }
  };

  const handleReorderItems = async (itemIds: string[]) => {
    try {
      const result = await reordenarItems(itemIds);

      if (!result.success) {
        toast.error(result.error || "Error al reordenar items");
        throw new Error(result.error);
      }

      // Actualizar estado local con nuevo orden
      const itemsReordenados = itemIds
        .map((id) => items.find((i) => i.id === id))
        .filter(Boolean) as Item[];

      setItems(itemsReordenados);
      toast.success("Items reordenados correctamente");
    } catch (error) {
      console.error("Error reordenando items:", error);
      toast.error("Error al reordenar items");
    }
  };

  const handleNavigateToUtilidad = () => {
    // Navegar a la pestaña de utilidad
    // Esto se manejará en el componente padre (ItemsTab)
    if (onNavigateToUtilidad) {
      onNavigateToUtilidad();
    }
  };

  // NIVEL 1: Secciones
  if (currentLevel === 1) {
    return (
      <div className="space-y-6">
        <StorageIndicator
          studioSlug={studioSlug}
          quotaLimitBytes={100 * 1024 * 1024 * 1024}
        />
        <SeccionesListView
          secciones={secciones}
          onSelectSeccion={handleSelectSeccion}
          onCreateSeccion={handleCreateSeccion}
          onEditSeccion={handleEditSeccion}
          onDeleteSeccion={handleDeleteSeccion}
          onReorderSecciones={handleReorderSecciones}
          isLoading={isLoading}
        />

        {/* Modal de crear/editar sección */}
        <SeccionEditorModal
          isOpen={isSeccionModalOpen}
          onClose={() => {
            setIsSeccionModalOpen(false);
            setSeccionToEdit(null);
          }}
          onSave={handleSaveSeccion}
          seccion={seccionToEdit}
        />

        {/* Modal de confirmación de eliminación */}
        <ZenConfirmModal
          isOpen={isDeleteConfirmModalOpen}
          onClose={() => {
            setIsDeleteConfirmModalOpen(false);
            setSeccionToDelete(null);
          }}
          onConfirm={handleConfirmDeleteSeccion}
          title={
            (seccionToDelete?.items ?? 0) > 0
              ? "No se puede eliminar esta sección"
              : "Eliminar sección"
          }
          description={
            (seccionToDelete?.items ?? 0) > 0
              ? `La sección "${seccionToDelete?.name}" contiene ${seccionToDelete?.items} item${(seccionToDelete?.items ?? 0) !== 1 ? "s" : ""}. Primero debes eliminar todo el contenido.`
              : `¿Estás seguro de que deseas eliminar la sección vacía "${seccionToDelete?.name}"? Esta acción no se puede deshacer.`
          }
          confirmText={
            (seccionToDelete?.items ?? 0) > 0 ? "Entendido" : "Eliminar"
          }
          cancelText="Cancelar"
          variant={
            (seccionToDelete?.items ?? 0) > 0 ? "default" : "destructive"
          }
          disabled={(seccionToDelete?.items ?? 0) > 0}
          loading={isLoading}
        />
      </div>
    );
  }

  // NIVEL 2: Categorías
  if (currentLevel === 2 && selectedSeccion) {
    return (
      <div className="space-y-6">
        <StorageIndicator
          studioSlug={studioSlug}
          quotaLimitBytes={100 * 1024 * 1024 * 1024}
        />
        <CategoriasListView
          seccionName={selectedSeccion.name}
          categorias={categorias}
          onSelectCategoria={handleSelectCategoria}
          onCreateCategoria={handleCreateCategoria}
          onEditCategoria={handleEditCategoria}
          onDeleteCategoria={handleDeleteCategoria}
          onReorderCategorias={handleReorderCategorias}
          onBack={handleBack}
          isLoading={isLoading}
        />

        {/* Modal de crear/editar categoría */}
        <CategoriaEditorModal
          isOpen={isCategoriaModalOpen}
          onClose={() => {
            setIsCategoriaModalOpen(false);
            setCategoriaToEdit(null);
          }}
          onSave={handleSaveCategoria}
          categoria={categoriaToEdit}
          studioSlug={studioSlug}
        />

        {/* Modal de confirmación de eliminación de categoría */}
        <ZenConfirmModal
          isOpen={isDeleteCategoriaConfirmModalOpen}
          onClose={() => {
            setIsDeleteCategoriaConfirmModalOpen(false);
            setCategoriaToDelete(null);
          }}
          onConfirm={handleConfirmDeleteCategoria}
          title={
            (categoriaToDelete?.items ?? 0) > 0
              ? "No se puede eliminar esta categoría"
              : "Eliminar categoría"
          }
          description={
            (categoriaToDelete?.items ?? 0) > 0
              ? `La categoría "${categoriaToDelete?.name}" contiene ${categoriaToDelete?.items} item${(categoriaToDelete?.items ?? 0) !== 1 ? "s" : ""}. Primero debes eliminar todo el contenido.`
              : `¿Estás seguro de que deseas eliminar la categoría "${categoriaToDelete?.name}"? Esta acción no se puede deshacer.`
          }
          confirmText={
            (categoriaToDelete?.items ?? 0) > 0 ? "Entendido" : "Eliminar"
          }
          cancelText="Cancelar"
          variant={
            (categoriaToDelete?.items ?? 0) > 0 ? "default" : "destructive"
          }
          disabled={(categoriaToDelete?.items ?? 0) > 0}
          loading={isLoading}
        />
      </div>
    );
  }

  // NIVEL 3: Items
  if (currentLevel === 3 && selectedCategoria) {
    return (
      <div className="space-y-6">
        <StorageIndicator
          studioSlug={studioSlug}
          quotaLimitBytes={100 * 1024 * 1024 * 1024}
        />
        <ItemsListView
          categoriaNombre={selectedCategoria.name}
          items={items}
          onCreateItem={handleCreateItem}
          onEditItem={handleEditItem}
          onDeleteItem={handleDeleteItem}
          onReorderItems={handleReorderItems}
          onBack={handleBack}
          isLoading={isLoading}
          preciosConfig={preciosConfig || undefined}
          onNavigateToUtilidad={handleNavigateToUtilidad}
        />

        {/* Modal de crear/editar item */}
        <ItemEditorModal
          isOpen={isItemModalOpen}
          onClose={() => {
            setIsItemModalOpen(false);
            setItemToEdit(null);
          }}
          onSave={handleSaveItem}
          item={itemToEdit}
          studioSlug={studioSlug}
          categoriaId={selectedCategoria?.id || ""}
          preciosConfig={preciosConfig || undefined}
        />

        {/* Modal de confirmación de eliminación de item */}
        <ZenConfirmModal
          isOpen={isDeleteItemConfirmModalOpen}
          onClose={() => {
            setIsDeleteItemConfirmModalOpen(false);
            setItemToDelete(null);
          }}
          onConfirm={handleConfirmDeleteItem}
          title="Eliminar Item"
          description={`¿Estás seguro de que deseas eliminar el item "${itemToDelete?.name}"? Esta acción no se puede deshacer.`}
          confirmText="Eliminar"
          cancelText="Cancelar"
          variant="destructive"
          loading={isLoading}
        />
      </div>
    );
  }

  // NIVEL 4: Item Editor (TODO)
  if (currentLevel === 4 && selectedItem) {
    return (
      <div className="p-6">
        <p className="text-zinc-400">
          ItemEditorModal para: {selectedItem.name}
        </p>
        <button
          onClick={handleBack}
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded"
        >
          Atrás
        </button>
      </div>
    );
  }

  return <div className="p-6 text-zinc-400">Error en navegación</div>;
}
