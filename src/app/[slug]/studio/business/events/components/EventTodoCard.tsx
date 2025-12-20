'use client';

import React, { useState } from 'react';
import { CheckCircle2, Circle } from 'lucide-react';
import { ZenCard, ZenCardHeader, ZenCardTitle, ZenCardContent, ZenButton } from '@/components/ui/zen';
import { TasksHistorySheet } from './TasksHistorySheet';

interface TodoItem {
  id: string;
  title: string;
  completed: boolean;
}

interface EventTodoCardProps {
  studioSlug: string;
  eventId: string;
}

export function EventTodoCard({ studioSlug, eventId }: EventTodoCardProps) {
  // Datos hardcodeados de ejemplo
  const [todos, setTodos] = useState<TodoItem[]>([
    { id: '1', title: 'Confirmar menú con el cliente', completed: false },
    { id: '2', title: 'Enviar cronograma al equipo', completed: true },
    { id: '3', title: 'Verificar permisos de locación', completed: false },
    { id: '4', title: 'Confirmar pago de anticipo', completed: true },
    { id: '5', title: 'Revisar equipo técnico', completed: false },
  ]);

  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const handleToggle = (id: string) => {
    setTodos(prev => prev.map(todo =>
      todo.id === id ? { ...todo, completed: !todo.completed } : todo
    ));
  };

  const completedCount = todos.filter(t => t.completed).length;
  const totalTasks = todos.length;

  return (
    <>
      <ZenCard>
        <ZenCardHeader className="border-b border-zinc-800 py-2 px-3 shrink-0">
          <ZenCardTitle className="text-sm font-medium flex items-center pt-1">
            Tareas
          </ZenCardTitle>
        </ZenCardHeader>
        <ZenCardContent className="p-4">
          <div className="space-y-4">
            {/* Resumen compacto */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-zinc-400" />
                <span className="text-xs text-zinc-400">Total</span>
              </div>
              <span className="text-sm font-semibold text-zinc-200">
                {totalTasks} {totalTasks === 1 ? 'tarea' : 'tareas'}
              </span>
            </div>

            {completedCount > 0 && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  <span className="text-xs text-zinc-400">Completadas</span>
                </div>
                <span className="text-sm font-semibold text-emerald-400">
                  {completedCount}
                </span>
              </div>
            )}

            {totalTasks === 0 && (
              <div className="text-center py-4">
                <Circle className="h-8 w-8 text-zinc-600 mx-auto mb-2" />
                <p className="text-xs text-zinc-500">
                  No hay tareas registradas
                </p>
              </div>
            )}
          </div>
        </ZenCardContent>
        {/* Footer con botón de historial */}
        {totalTasks > 0 && (
          <div className="px-4 pb-4 pt-3 border-t border-zinc-800">
            <ZenButton
              variant="ghost"
              size="sm"
              onClick={() => setIsSheetOpen(true)}
              className="w-full gap-2 text-xs text-blue-400 hover:text-blue-300 hover:bg-blue-950/20"
            >
              Ver todas las tareas ({totalTasks})
            </ZenButton>
          </div>
        )}
      </ZenCard>

      {/* Sheet de historial de tareas */}
      <TasksHistorySheet
        isOpen={isSheetOpen}
        onClose={() => setIsSheetOpen(false)}
        tasks={todos}
        onToggleTask={handleToggle}
      />
    </>
  );
}
