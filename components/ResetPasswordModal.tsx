import React, { useState } from 'react';
import { X, Lock, Mail, Key, Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react';
import { backendApi } from '../services/api';

interface ResetPasswordModalProps {
    onClose: () => void;
}

export const ResetPasswordModal: React.FC<ResetPasswordModalProps> = ({ onClose }) => {
    const [step, setStep] = useState<'request' | 'reset'>('request');
    const [email, setEmail] = useState('');
    const [token, setToken] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [resetToken, setResetToken] = useState('');
    const TOKEN_LENGTH = 64;

    const handleRequestReset = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        setSuccess('');

        try {
            const response = await backendApi.requestPasswordReset(email);
            setSuccess(response.message);
            if (response.token) {
                setResetToken(response.token);
            }
            // Auto-advance to reset step after showing token
            setTimeout(() => {
                setStep('reset');
                setSuccess('');
            }, 3000);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to request password reset');
        } finally {
            setIsLoading(false);
        }
    };

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        setSuccess('');

        // Validation
        if (newPassword.length < 8) {
            setError('Password must be at least 8 characters long');
            setIsLoading(false);
            return;
        }

        if (newPassword !== confirmPassword) {
            setError('Passwords do not match');
            setIsLoading(false);
            return;
        }

        if (token.length !== TOKEN_LENGTH) {
            setError('Reset code format is invalid');
            setIsLoading(false);
            return;
        }

        try {
            const response = await backendApi.resetPassword(email, token, newPassword);
            setSuccess(response.message);
            // Close modal after success
            setTimeout(() => {
                onClose();
            }, 2000);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to reset password');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 dark:border-slate-700 animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
                    <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                        {step === 'request' ? 'Reset Password' : 'Enter Reset Code'}
                    </h3>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                    >
                        <X size={20} className="text-slate-400" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6">
                    {step === 'request' ? (
                        <form onSubmit={handleRequestReset} className="space-y-5">
                            <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">
                                Enter your email address and we'll generate a reset code for you.
                            </p>

                            <div>
                                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-widest mb-2 ml-1">
                                    Email Address
                                </label>
                                <div className="relative group">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="name@company.com"
                                        required
                                        className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none font-medium text-slate-900 dark:text-slate-100 transition-all"
                                    />
                                </div>
                            </div>

                            {resetToken && (
                                <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-xl">
                                    <p className="text-xs font-bold text-indigo-900 dark:text-indigo-300 uppercase tracking-widest mb-2">
                                        Your Reset Code
                                    </p>
                                    <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400 tracking-wider text-center py-2">
                                        {resetToken}
                                    </p>
                                    <p className="text-xs text-indigo-700 dark:text-indigo-400 mt-2">
                                        Share this code with the user. It expires in 1 hour.
                                    </p>
                                </div>
                            )}

                            {error && (
                                <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                                    <AlertCircle size={16} className="text-red-600 dark:text-red-400" />
                                    <p className="text-xs font-bold text-red-600 dark:text-red-400">{error}</p>
                                </div>
                            )}

                            {success && (
                                <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                                    <CheckCircle size={16} className="text-green-600 dark:text-green-400" />
                                    <p className="text-xs font-bold text-green-600 dark:text-green-400">{success}</p>
                                </div>
                            )}

                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setStep('reset')}
                                    className="flex-1 py-3 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-900 dark:text-slate-100 rounded-xl font-bold text-sm transition-all"
                                >
                                    I Have a Code
                                </button>
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isLoading ? 'Generating...' : 'Get Reset Code'}
                                </button>
                            </div>
                        </form>
                    ) : (
                        <form onSubmit={handleResetPassword} className="space-y-5">
                            <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">
                                Enter the reset code from your email and your new password.
                            </p>

                            <div>
                                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-widest mb-2 ml-1">
                                    Email Address
                                </label>
                                <div className="relative group">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="name@company.com"
                                        required
                                        className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none font-medium text-slate-900 dark:text-slate-100 transition-all"
                                    />
                                </div>
                            </div>

                            <div>
                                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-widest mb-2 ml-1">
                                        Reset Code
                                    </label>
                                    <div className="relative group">
                                        <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                                        <input
                                            type="text"
                                            value={token}
                                            onChange={(e) => setToken(e.target.value.trim().toLowerCase().replace(/[^a-f0-9]/g, '').slice(0, TOKEN_LENGTH))}
                                            placeholder="Paste reset code"
                                            required
                                            maxLength={TOKEN_LENGTH}
                                            className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none font-bold text-slate-900 dark:text-slate-100 transition-all tracking-wide text-sm"
                                        />
                                    </div>
                                </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-widest mb-2 ml-1">
                                    New Password
                                </label>
                                <div className="relative group">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        placeholder="••••••••••••"
                                        required
                                        className="w-full pl-12 pr-12 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none font-medium text-slate-900 dark:text-slate-100 transition-all"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-500 transition-colors"
                                    >
                                        {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-widest mb-2 ml-1">
                                    Confirm Password
                                </label>
                                <div className="relative group">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        placeholder="••••••••••••"
                                        required
                                        className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none font-medium text-slate-900 dark:text-slate-100 transition-all"
                                    />
                                </div>
                            </div>

                            {error && (
                                <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                                    <AlertCircle size={16} className="text-red-600 dark:text-red-400" />
                                    <p className="text-xs font-bold text-red-600 dark:text-red-400">{error}</p>
                                </div>
                            )}

                            {success && (
                                <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                                    <CheckCircle size={16} className="text-green-600 dark:text-green-400" />
                                    <p className="text-xs font-bold text-green-600 dark:text-green-400">{success}</p>
                                </div>
                            )}

                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setStep('request');
                                        setToken('');
                                        setNewPassword('');
                                        setConfirmPassword('');
                                        setError('');
                                    }}
                                    className="flex-1 py-3 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-900 dark:text-slate-100 rounded-xl font-bold text-sm transition-all"
                                >
                                    Back
                                </button>
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isLoading ? 'Resetting...' : 'Reset Password'}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};
