'use client';

import React from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/shadcn/sheet';
import { CheckCircle2, Circle } from 'lucide-react';
import { ZenButton } from '@/components/ui/zen';

interface TodoItem {
  id: string;
  title: string;
  completed: boolean;
}

interface TasksHistorySheetProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: TodoItem[];
  onToggleTask: (id: string) => void;
}

export function TasksHistorySheet({
  isOpen,
  onClose,
  tasks,
  onToggleTask,
}: TasksHistorySheetProps) {
  const completedCount = tasks.filter(t => t.completed).length;

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:max-w-md bg-zinc-900 border-l border-zinc-800 flex flex-col p-0">
        <SheetHeader className="border-b border-zinc-800 pb-4 px-6 pt-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600/20 rounded-lg">
              <CheckCircle2 className="h-5 w-5 text-blue-400" />
            </div>
            <div className="flex-1">
              <SheetTitle className="text-xl font-semibold text-white">
                Tareas del Evento
              </SheetTitle>
              <SheetDescription className="text-zinc-400">
                {completedCount} de {tasks.length} {tasks.length === 1 ? 'tarea completada' : 'tareas completadas'}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2 min-h-0">
          {tasks.map((task) => (
            <div
              key={task.id}
              className="flex items-start gap-3 p-3 rounded-lg border border-zinc-800 bg-zinc-900/50 hover:bg-zinc-800/50 transition-colors cursor-pointer"
              onClick={() => onToggleTask(task.id)}
            >
              {task.completed ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
              ) : (
                <Circle className="h-5 w-5 text-zinc-600 shrink-0 mt-0.5" />
              )}
              <span
                className={`text-sm flex-1 ${task.completed
                  ? 'line-through text-zinc-600'
                  : 'text-zinc-300'
                  }`}
              >
                {task.title}
              </span>
            </div>
          ))}

          {tasks.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <Circle className="h-12 w-12 text-zinc-700 mb-3" />
              <p className="text-sm text-zinc-500">
                No hay tareas registradas
              </p>
              <p className="text-xs text-zinc-600 mt-1">
                Las tareas aparecerán aquí cuando se agreguen
              </p>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
