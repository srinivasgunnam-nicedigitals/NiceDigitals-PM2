
import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, Info, CheckCircle, XCircle, X } from 'lucide-react';

interface ConfirmOptions {
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    variant?: 'info' | 'warning' | 'error' | 'success';
    showCancel?: boolean;
}

interface PromptOptions {
    title: string;
    message: string;
    placeholder?: string;
    defaultValue?: string;
    confirmText?: string;
    cancelText?: string;
    validate?: (value: string) => boolean | string;
}

interface AlertOptions {
    title: string;
    message: string;
    variant?: 'info' | 'warning' | 'error' | 'success';
}

interface ModalContextType {
    showConfirm: (options: ConfirmOptions) => Promise<boolean>;
    showPrompt: (options: PromptOptions) => Promise<string | null>;
    showAlert: (options: AlertOptions) => Promise<void>;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export const useModal = () => {
    const context = useContext(ModalContext);
    if (!context) {
        throw new Error('useModal must be used within ModalProvider');
    }
    return context;
};

interface ModalState {
    type: 'confirm' | 'prompt' | 'alert' | null;
    options: any;
    resolve: ((value: any) => void) | null;
}

export const ModalProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [modalState, setModalState] = useState<ModalState>({
        type: null,
        options: null,
        resolve: null,
    });

    const showConfirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
        return new Promise((resolve) => {
            setModalState({
                type: 'confirm',
                options: { showCancel: true, ...options },
                resolve,
            });
        });
    }, []);

    const showPrompt = useCallback((options: PromptOptions): Promise<string | null> => {
        return new Promise((resolve) => {
            setModalState({
                type: 'prompt',
                options,
                resolve,
            });
        });
    }, []);

    const showAlert = useCallback((options: AlertOptions): Promise<void> => {
        return new Promise((resolve) => {
            setModalState({
                type: 'alert',
                options: { variant: 'info', ...options },
                resolve,
            });
        });
    }, []);

    const handleClose = useCallback((value: any) => {
        if (modalState.resolve) {
            modalState.resolve(value);
        }
        setModalState({ type: null, options: null, resolve: null });
    }, [modalState]);

    return (
        <ModalContext.Provider value={{ showConfirm, showPrompt, showAlert }}>
            {children}
            {modalState.type === 'confirm' && (
                <ConfirmModal options={modalState.options} onClose={handleClose} />
            )}
            {modalState.type === 'prompt' && (
                <PromptModal options={modalState.options} onClose={handleClose} />
            )}
            {modalState.type === 'alert' && (
                <AlertModal options={modalState.options} onClose={() => handleClose(undefined)} />
            )}
        </ModalContext.Provider>
    );
};

// Confirmation Modal Component
const ConfirmModal: React.FC<{ options: ConfirmOptions; onClose: (value: boolean) => void }> = ({
    options,
    onClose,
}) => {
    const { title, message, confirmText = 'Confirm', cancelText = 'Cancel', variant = 'info', showCancel = true } = options;

    const getIcon = () => {
        switch (variant) {
            case 'warning':
                return <AlertTriangle className="text-orange-500" size={24} />;
            case 'error':
                return <XCircle className="text-red-500" size={24} />;
            case 'success':
                return <CheckCircle className="text-green-500" size={24} />;
            default:
                return <Info className="text-blue-500" size={24} />;
        }
    };

    const getButtonColor = () => {
        switch (variant) {
            case 'warning':
                return 'bg-orange-600 hover:bg-orange-700';
            case 'error':
                return 'bg-red-600 hover:bg-red-700';
            case 'success':
                return 'bg-green-600 hover:bg-green-700';
            default:
                return 'bg-indigo-600 hover:bg-indigo-700';
        }
    };

    React.useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose(false);
            if (e.key === 'Enter') onClose(true);
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    const modalContent = (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[10000] flex items-center justify-center p-4 animate-saas-fade">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-md w-full border border-slate-200 dark:border-slate-700 animate-saas-scale">
                <div className="p-6">
                    <div className="flex items-start gap-4">
                        <div className="shrink-0">{getIcon()}</div>
                        <div className="flex-1 min-w-0">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">{title}</h3>
                            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{message}</p>
                        </div>
                    </div>
                </div>
                <div className="px-6 pb-6 flex gap-3 justify-end">
                    {showCancel && (
                        <button
                            onClick={() => onClose(false)}
                            className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg transition-colors"
                        >
                            {cancelText}
                        </button>
                    )}
                    <button
                        onClick={() => onClose(true)}
                        className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors ${getButtonColor()}`}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
};

// Prompt Modal Component
const PromptModal: React.FC<{ options: PromptOptions; onClose: (value: string | null) => void }> = ({
    options,
    onClose,
}) => {
    const { title, message, placeholder = '', defaultValue = '', confirmText = 'OK', cancelText = 'Cancel', validate } = options;
    const [value, setValue] = useState(defaultValue);
    const [error, setError] = useState<string>('');

    const handleConfirm = () => {
        if (validate) {
            const result = validate(value);
            if (result === true) {
                onClose(value);
            } else if (typeof result === 'string') {
                setError(result);
            } else {
                setError('Invalid input');
            }
        } else {
            onClose(value);
        }
    };

    React.useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose(null);
            if (e.key === 'Enter') handleConfirm();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [value]);

    const modalContent = (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[10000] flex items-center justify-center p-4 animate-saas-fade">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-md w-full border border-slate-200 dark:border-slate-700 animate-saas-scale">
                <div className="p-6">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">{title}</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">{message}</p>
                    <input
                        type="text"
                        value={value}
                        onChange={(e) => {
                            setValue(e.target.value);
                            setError('');
                        }}
                        placeholder={placeholder}
                        autoFocus
                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 text-slate-900 dark:text-white placeholder:text-slate-400"
                    />
                    {error && <p className="text-sm text-red-600 dark:text-red-400 mt-2">{error}</p>}
                </div>
                <div className="px-6 pb-6 flex gap-3 justify-end">
                    <button
                        onClick={() => onClose(null)}
                        className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg transition-colors"
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={handleConfirm}
                        className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors"
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
};

// Alert Modal Component
const AlertModal: React.FC<{ options: AlertOptions; onClose: () => void }> = ({ options, onClose }) => {
    const { title, message, variant = 'info' } = options;

    const getIcon = () => {
        switch (variant) {
            case 'warning':
                return <AlertTriangle className="text-orange-500" size={24} />;
            case 'error':
                return <XCircle className="text-red-500" size={24} />;
            case 'success':
                return <CheckCircle className="text-green-500" size={24} />;
            default:
                return <Info className="text-blue-500" size={24} />;
        }
    };

    React.useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' || e.key === 'Enter') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    const modalContent = (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[10000] flex items-center justify-center p-4 animate-saas-fade">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-md w-full border border-slate-200 dark:border-slate-700 animate-saas-scale">
                <div className="p-6">
                    <div className="flex items-start gap-4">
                        <div className="shrink-0">{getIcon()}</div>
                        <div className="flex-1 min-w-0">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">{title}</h3>
                            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{message}</p>
                        </div>
                    </div>
                </div>
                <div className="px-6 pb-6 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors"
                    >
                        OK
                    </button>
                </div>
            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
};
