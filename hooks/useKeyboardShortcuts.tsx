
import { useEffect, useCallback, useRef } from 'react';

interface ShortcutConfig {
    key: string;
    ctrlKey?: boolean;
    shiftKey?: boolean;
    metaKey?: boolean;
    callback: () => void;
    description: string;
}

interface ComboConfig {
    keys: string[];
    callback: () => void;
    description: string;
}

export const useKeyboardShortcuts = (
    shortcuts: ShortcutConfig[] = [],
    combos: ComboConfig[] = []
) => {
    const comboKeysRef = useRef<string[]>([]);
    const comboTimerRef = useRef<NodeJS.Timeout | null>(null);

    const handleKeyDown = useCallback((event: KeyboardEvent) => {
        // Ignore if user is typing in an input, textarea, or contenteditable
        const target = event.target as HTMLElement;
        if (
            target.tagName === 'INPUT' ||
            target.tagName === 'TEXTAREA' ||
            target.isContentEditable
        ) {
            return;
        }

        // Check single-key shortcuts
        for (const shortcut of shortcuts) {
            const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase();
            const ctrlMatch = shortcut.ctrlKey ? event.ctrlKey : !event.ctrlKey;
            const shiftMatch = shortcut.shiftKey ? event.shiftKey : !event.shiftKey;
            const metaMatch = shortcut.metaKey ? event.metaKey : !event.metaKey;

            if (keyMatch && ctrlMatch && shiftMatch && metaMatch) {
                event.preventDefault();
                shortcut.callback();
                return;
            }
        }

        // Check combo shortcuts (like G+D)
        if (combos.length > 0) {
            const key = event.key.toLowerCase();
            comboKeysRef.current.push(key);

            // Clear combo after 1 second
            if (comboTimerRef.current) {
                clearTimeout(comboTimerRef.current);
            }
            comboTimerRef.current = setTimeout(() => {
                comboKeysRef.current = [];
            }, 1000);

            // Check if current combo matches any registered combos
            for (const combo of combos) {
                const comboString = comboKeysRef.current.join('+');
                const targetString = combo.keys.map(k => k.toLowerCase()).join('+');

                if (comboString === targetString) {
                    event.preventDefault();
                    combo.callback();
                    comboKeysRef.current = [];
                    if (comboTimerRef.current) {
                        clearTimeout(comboTimerRef.current);
                    }
                    return;
                }
            }
        }
    }, [shortcuts, combos]);

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            if (comboTimerRef.current) {
                clearTimeout(comboTimerRef.current);
            }
        };
    }, [handleKeyDown]);
};

// Export shortcut configurations for help modal
export const KEYBOARD_SHORTCUTS = {
    navigation: [
        { keys: ['G', 'D'], description: 'Go to Dashboard' },
        { keys: ['G', 'P'], description: 'Go to Pipeline' },
        { keys: ['G', 'T'], description: 'Go to Team' },
        { keys: ['G', 'L'], description: 'Go to Leaderboard' },
        { keys: ['G', 'A'], description: 'Go to Archive' },
    ],
    actions: [
        { keys: ['N'], description: 'New Project' },
        { keys: ['B'], description: 'Daily Briefing' },
        { keys: ['Escape'], description: 'Close Modal' },
        { keys: ['?'], description: 'Show Keyboard Shortcuts' },
    ],
};
