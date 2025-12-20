import { useState, useEffect } from 'react';

interface TabConfig {
    id: string;
    hash: string;
}

/**
 * Hook para manejar navegación por hash en pestañas
 * Permite que los usuarios compartan enlaces directos a pestañas específicas
 */
export function useHashNavigation(tabs: TabConfig[], defaultTab: string) {
    const [activeTab, setActiveTab] = useState(defaultTab);

    useEffect(() => {
        const handleHashChange = () => {
            const hash = window.location.hash.replace('#', '');
            const tab = tabs.find(tab => tab.hash === hash);
            if (tab) {
                setActiveTab(tab.id);
            } else if (!hash) {
                // Si no hay hash, usar la pestaña por defecto
                setActiveTab(defaultTab);
            }
        };

        // Verificar hash inicial
        handleHashChange();

        // Escuchar cambios en el hash
        window.addEventListener('hashchange', handleHashChange);

        return () => {
            window.removeEventListener('hashchange', handleHashChange);
        };
    }, [tabs, defaultTab]);

    const handleTabChange = (tabId: string) => {
        setActiveTab(tabId);
        const tab = tabs.find(t => t.id === tabId);
        if (tab) {
            // Actualizar hash en URL sin recargar la página
            window.history.replaceState(null, '', `#${tab.hash}`);
        }
    };

    return {
        activeTab,
        handleTabChange
    };
}
