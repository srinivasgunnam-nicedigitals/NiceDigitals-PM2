import { useEffect, useRef, RefObject } from 'react';

interface UseFocusTrapOptions {
    isActive: boolean;
    onEscape?: () => void;
    initialFocusRef?: RefObject<HTMLElement>;
}

export const useFocusTrap = (options: UseFocusTrapOptions): RefObject<HTMLDivElement> => {
    const { isActive, onEscape, initialFocusRef } = options;
    const containerRef = useRef<HTMLDivElement>(null);
    const previouslyFocusedElement = useRef<HTMLElement | null>(null);

    useEffect(() => {
        if (!isActive || !containerRef.current) return;

        const container = containerRef.current;

        // Store the element that had focus before the trap activated
        previouslyFocusedElement.current = document.activeElement as HTMLElement;

        // Get all focusable elements
        const getFocusableElements = (): HTMLElement[] => {
            const elements = container.querySelectorAll<HTMLElement>(
                'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]):not([disabled])'
            );
            return Array.from(elements);
        };

        const focusableElements = getFocusableElements();
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        // Focus initial element or first focusable element
        const elementToFocus = initialFocusRef?.current || firstElement;
        elementToFocus?.focus();

        const handleKeyDown = (e: KeyboardEvent) => {
            // Handle Escape key
            if (e.key === 'Escape' && onEscape) {
                e.preventDefault();
                onEscape();
                return;
            }

            // Handle Tab key
            if (e.key === 'Tab') {
                const currentFocusableElements = getFocusableElements();
                const currentFirstElement = currentFocusableElements[0];
                const currentLastElement = currentFocusableElements[currentFocusableElements.length - 1];

                if (e.shiftKey) {
                    // Shift + Tab
                    if (document.activeElement === currentFirstElement) {
                        e.preventDefault();
                        currentLastElement?.focus();
                    }
                } else {
                    // Tab
                    if (document.activeElement === currentLastElement) {
                        e.preventDefault();
                        currentFirstElement?.focus();
                    }
                }
            }
        };

        document.addEventListener('keydown', handleKeyDown);

        // Cleanup: restore focus to previously focused element
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            previouslyFocusedElement.current?.focus();
        };
    }, [isActive, onEscape, initialFocusRef]);

    return containerRef;
};
