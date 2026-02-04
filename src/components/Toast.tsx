import React, { useState, useEffect } from 'react';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info';

interface ToastMessage {
    id: number;
    type: ToastType;
    message: string;
}

// Simple event emitter for imperative usage
const listeners: Set<(toast: ToastMessage) => void> = new Set();

let nextId = 0;

const emit = (type: ToastType, message: string) => {
    const id = nextId++;
    const toast = { id, type, message };
    listeners.forEach((listener) => listener(toast));
};

export const showToast = {
    success: (message: string) => emit('success', message),
    error: (message: string) => emit('error', message),
    info: (message: string) => emit('info', message),
};

export const ToastContainer: React.FC = () => {
    const [toasts, setToasts] = useState<ToastMessage[]>([]);

    useEffect(() => {
        const handleToast = (newToast: ToastMessage) => {
            setToasts((prev) => [...prev, newToast]);
            // Auto dismiss
            setTimeout(() => {
                setToasts((prev) => prev.filter((t) => t.id !== newToast.id));
            }, 3000);
        };

        listeners.add(handleToast);
        return () => {
            listeners.delete(handleToast);
        };
    }, []);

    const removeToast = (id: number) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    };

    return (
        <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
            {toasts.map((toast) => (
                <div
                    key={toast.id}
                    className={`flex items-center w-full max-w-xs p-4 rounded-lg shadow dark:text-gray-400 dark:bg-gray-800 transition-all transform translate-x-0 ${toast.type === 'success' ? 'bg-green-50 text-green-800' :
                            toast.type === 'error' ? 'bg-red-50 text-red-800' :
                                'bg-blue-50 text-blue-800'
                        }`}
                    role="alert"
                >
                    <div className={`inline-flex items-center justify-center flex-shrink-0 w-8 h-8 rounded-lg ${toast.type === 'success' ? 'bg-green-100 text-green-500' :
                            toast.type === 'error' ? 'bg-red-100 text-red-500' :
                                'bg-blue-100 text-blue-500'
                        }`}>
                        {toast.type === 'success' && <CheckCircle className="w-5 h-5" />}
                        {toast.type === 'error' && <AlertCircle className="w-5 h-5" />}
                        {toast.type === 'info' && <Info className="w-5 h-5" />}
                    </div>
                    <div className="ml-3 text-sm font-normal mr-2">{toast.message}</div>
                    <button
                        type="button"
                        className="ml-auto -mx-1.5 -my-1.5 bg-transparent p-1.5 inline-flex items-center justify-center h-8 w-8 text-gray-400 hover:text-gray-900 focus:ring-2 focus:ring-gray-300 rounded-lg focus:outline-none"
                        onClick={() => removeToast(toast.id)}
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            ))}
        </div>
    );
};
