'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, Plus, ChevronDown } from 'lucide-react';
import { ZenButton } from '@/components/ui/zen';
import { obtenerCrewSkills, crearCrewSkill } from '@/lib/actions/studio/crew';
import { toast } from 'sonner';

interface Skill {
  id: string;
  name: string;
  color: string | null;
  icono: string | null;
}

interface SkillsInputProps {
  studioSlug: string;
  selectedSkillIds: string[];
  onSkillsChange: (skillIds: string[]) => void;
  error?: string;
}

export function SkillsInput({
  studioSlug,
  selectedSkillIds,
  onSkillsChange,
  error,
}: SkillsInputProps) {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [selectedSkills, setSelectedSkills] = useState<Skill[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Cargar skills disponibles
  useEffect(() => {
    const loadSkills = async () => {
      try {
        const result = await obtenerCrewSkills(studioSlug);
        if (result.success && result.data) {
          setSkills(result.data);
        }
      } catch (error) {
        console.error('Error loading skills:', error);
      }
    };

    loadSkills();
  }, [studioSlug]);

  // Sincronizar selected skills
  useEffect(() => {
    const selected = skills.filter((s) => selectedSkillIds.includes(s.id));
    setSelectedSkills(selected);
  }, [selectedSkillIds, skills]);

  // Cerrar dropdown al hacer click afuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAddSkill = (skillId: string) => {
    if (!selectedSkillIds.includes(skillId)) {
      const newIds = [...selectedSkillIds, skillId];
      onSkillsChange(newIds);
      setSearchTerm('');
    }
  };

  const handleRemoveSkill = (skillId: string) => {
    const newIds = selectedSkillIds.filter((id) => id !== skillId);
    onSkillsChange(newIds);
  };

  const handleCreateSkill = async () => {
    if (!searchTerm.trim()) return;

    try {
      setLoading(true);
      const result = await crearCrewSkill(studioSlug, {
        name: searchTerm.trim(),
      });

      if (result.success && result.data) {
        setSkills((prev) => [...prev, result.data]);
        handleAddSkill(result.data.id);
        toast.success('Habilidad creada');
      } else {
        toast.error(result.error || 'Error al crear habilidad');
      }
    } catch (error) {
      console.error('Error creating skill:', error);
      toast.error('Error al crear habilidad');
    } finally {
      setLoading(false);
    }
  };

  // Filtrar skills disponibles
  const availableSkills = skills.filter(
    (s) =>
      !selectedSkillIds.includes(s.id) &&
      s.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const hasMatchingSkill = skills.some(
    (s) => s.name.toLowerCase() === searchTerm.toLowerCase()
  );

  return (
    <div className="space-y-3">
      {/* Tags de skills seleccionadas */}
      <div className="flex flex-wrap gap-2 min-h-8">
        {selectedSkills.map((skill) => (
          <div
            key={skill.id}
            className="flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium text-white"
            style={{
              backgroundColor: skill.color || '#6366f1',
            }}
          >
            {skill.name}
            <button
              type="button"
              onClick={() => handleRemoveSkill(skill.id)}
              className="ml-1 hover:opacity-80 transition-opacity"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
      </div>

      {/* Dropdown Input */}
      <div className="relative" ref={dropdownRef}>
        <div className="relative">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onFocus={() => setShowDropdown(true)}
            placeholder='Escribe para buscar o crear (Ej: "Fotografía", "Edición")'
            className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-zinc-600 pr-10"
          />
          <ChevronDown
            className={`absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500 transition-transform ${
              showDropdown ? 'rotate-180' : ''
            }`}
          />
        </div>

        {/* Dropdown Menu */}
        {showDropdown && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-zinc-800 border border-zinc-700 rounded-lg z-50 max-h-64 overflow-y-auto shadow-lg">
            {searchTerm.length > 0 && (
              <div className="space-y-2 p-2">
                {/* Skills coincidentes */}
                {availableSkills.length > 0 ? (
                  availableSkills.map((skill) => (
                    <button
                      key={skill.id}
                      type="button"
                      onClick={() => handleAddSkill(skill.id)}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left hover:bg-zinc-700 transition-colors text-sm"
                    >
                      {skill.color && (
                        <div
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: skill.color }}
                        />
                      )}
                      <span className="text-zinc-200">{skill.name}</span>
                    </button>
                  ))
                ) : (
                  <>
                    {/* Opción crear nueva */}
                    {!hasMatchingSkill && (
                      <button
                        type="button"
                        onClick={handleCreateSkill}
                        disabled={loading}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left hover:bg-zinc-700 transition-colors text-sm text-emerald-400"
                      >
                        <Plus className="h-4 w-4 flex-shrink-0" />
                        <span>
                          Crear: <strong>{searchTerm}</strong>
                        </span>
                      </button>
                    )}

                    {/* Mensaje si no hay coincidencias */}
                    {availableSkills.length === 0 && hasMatchingSkill && (
                      <div className="px-3 py-2 text-sm text-zinc-400">
                        Ya seleccionado
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {searchTerm.length === 0 && skills.length > 0 && (
              <div className="p-2 space-y-2">
                <div className="px-3 py-1 text-xs font-medium text-zinc-400">
                  Habilidades disponibles
                </div>
                {skills
                  .filter((s) => !selectedSkillIds.includes(s.id))
                  .slice(0, 8)
                  .map((skill) => (
                    <button
                      key={skill.id}
                      type="button"
                      onClick={() => handleAddSkill(skill.id)}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left hover:bg-zinc-700 transition-colors text-sm"
                    >
                      {skill.color && (
                        <div
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: skill.color }}
                        />
                      )}
                      <span className="text-zinc-200">{skill.name}</span>
                    </button>
                  ))}
              </div>
            )}

            {skills.length === 0 && searchTerm.length === 0 && (
              <div className="px-3 py-3 text-sm text-zinc-400 text-center">
                Comienza a escribir para crear habilidades
              </div>
            )}
          </div>
        )}
      </div>

      {error && (
        <p className="text-sm text-red-400">{error}</p>
      )}

      {selectedSkills.length === 0 && (
        <p className="text-xs text-zinc-500">
          Selecciona al menos una habilidad
        </p>
      )}
    </div>
  );
}

