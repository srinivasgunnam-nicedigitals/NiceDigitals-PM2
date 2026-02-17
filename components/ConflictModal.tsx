import React from 'react';

interface ConflictModalProps {
    isOpen: boolean;
    conflictDetails?: {
        currentVersion?: number;
        expectedVersion?: number;
        updatedAt?: string;
    };
    onReload: () => void;
}

export const ConflictModal: React.FC<ConflictModalProps> = ({ isOpen, conflictDetails, onReload }) => {
    if (!isOpen) return null;

    const formatTimestamp = (timestamp?: string) => {
        if (!timestamp) return 'Unknown time';
        try {
            return new Date(timestamp).toLocaleString();
        } catch {
            return timestamp;
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
                <div className="flex items-center mb-4">
                    <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mr-4">
                        <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                    <h2 className="text-xl font-semibold text-gray-900">Conflict Detected</h2>
                </div>

                <div className="mb-6">
                    <p className="text-gray-700 mb-3">
                        This project was modified by another user while you were editing.
                    </p>

                    {conflictDetails?.updatedAt && (
                        <p className="text-sm text-gray-600 mb-2">
                            <span className="font-medium">Last updated:</span> {formatTimestamp(conflictDetails.updatedAt)}
                        </p>
                    )}

                    {conflictDetails?.currentVersion !== undefined && conflictDetails?.expectedVersion !== undefined && (
                        <p className="text-sm text-gray-600">
                            <span className="font-medium">Version mismatch:</span> Expected v{conflictDetails.expectedVersion}, but current is v{conflictDetails.currentVersion}
                        </p>
                    )}
                </div>

                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
                    <div className="flex">
                        <div className="flex-shrink-0">
                            <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <div className="ml-3">
                            <p className="text-sm text-yellow-700">
                                Your changes cannot be saved. Please reload to see the latest version and try again.
                            </p>
                        </div>
                    </div>
                </div>

                <button
                    onClick={onReload}
                    className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors font-medium"
                >
                    Reload Project
                </button>
            </div>
        </div>
    );
};
