import React, { useState } from 'react';
import { useApp } from '../store';
import { Lock, Mail, ArrowRight, ShieldCheck, Zap, Eye, EyeOff } from 'lucide-react';
import { backendApi } from '../services/api';
import { useNavigate } from 'react-router-dom';
import { ResetPasswordModal } from '../components/ResetPasswordModal';

export const Login = () => {
    const { setCurrentUser, setAuthenticating } = useApp();
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [showResetModal, setShowResetModal] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            // 1. Mark as authenticating (blocks queries and 401 interceptor)
            setAuthenticating(true);
            window.sessionStorage.setItem('is_authenticating', 'true');

            // 2. Perform login and set user
            const { user } = await backendApi.login(email, password);
            setCurrentUser(user);

            // 3. Wait one tick for cookie to commit and state to flush, then navigate
            setTimeout(() => {
                navigate('/dashboard');
                // 4. Release the query block and interceptor block after navigation
                setAuthenticating(false);
                window.sessionStorage.removeItem('is_authenticating');
            }, 50);
        } catch (err: any) {
            console.error('Login failed', err);
            setError(err.response?.data?.error || 'Login failed');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4">
            {/* Background Decor */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-100/50 via-transparent to-transparent dark:from-indigo-900/20"></div>
                <div className="absolute -top-20 -right-20 w-96 h-96 bg-purple-200 dark:bg-purple-900/20 rounded-full blur-3xl opacity-50"></div>
                <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-200 dark:bg-indigo-900/20 rounded-full blur-3xl opacity-50"></div>
            </div>

            <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 bg-white dark:bg-slate-800 rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-700 relative z-10 animate-in fade-in zoom-in-95 duration-500">

                {/* Left Side - Visual */}
                <div className="relative hidden md:flex flex-col justify-between p-12 bg-slate-900 text-white overflow-hidden">
                    <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop')] bg-cover bg-center opacity-40 mix-blend-overlay"></div>
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/90 to-purple-700/90"></div>

                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-8">
                            <div className="p-2.5 bg-white/10 backdrop-blur-md rounded-xl border border-white/20">
                                <Zap className="w-6 h-6 text-white" fill="currentColor" />
                            </div>
                            <span className="text-xl font-black tracking-tight">NICE DIGITAL</span>
                        </div>

                        <h1 className="text-4xl font-black leading-tight mb-6">
                            Manage your <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-200 to-purple-200">entire workflow</span>.
                        </h1>
                        <p className="text-indigo-100 font-medium leading-relaxed max-w-sm">
                            Track projects, collaborate with your team, and deliver excellence.
                        </p>
                    </div>

                    <div className="relative z-10 space-y-4">
                        <div className="flex items-center gap-4 text-xs font-bold uppercase tracking-widest text-indigo-200">
                            <span className="flex items-center gap-2"><ShieldCheck size={14} /> SOC2 Compliant</span>
                            <span className="flex items-center gap-2"><Lock size={14} /> End-to-End Encrypted</span>
                        </div>
                    </div>
                </div>

                {/* Right Side - Form */}
                <div className="p-10 md:p-16 flex flex-col justify-center">
                    <div className="mb-10 text-center md:text-left">
                        <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-2 tracking-tight">Welcome Back</h2>
                        <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Please enter your details to sign in.</p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-6">
                        <div>
                            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-widest mb-2 ml-1">Work Email or Username</label>
                            <div className="relative group">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                                <input
                                    type="text"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="name@company.com or username"
                                    className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none font-bold text-slate-900 dark:text-slate-100 transition-all placeholder:font-medium"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-widest mb-2 ml-1">Password</label>
                            <div className="relative group">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••••••"
                                    className="w-full pl-12 pr-12 py-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none font-bold text-slate-900 dark:text-slate-100 transition-all placeholder:font-medium"
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

                        {error && (
                            <p className="text-xs font-bold text-red-500 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg flex items-center gap-2">
                                <ShieldCheck size={14} /> {error}
                            </p>
                        )}

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-100 dark:shadow-none hover:shadow-indigo-300 transition-all flex items-center justify-center gap-2 group disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {isLoading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            ) : (
                                <>Sign In <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" /></>
                            )}
                        </button>
                    </form>

                    <div className="mt-8 pt-8 border-t border-slate-100 dark:border-slate-700/50 flex justify-center">
                        <button
                            type="button"
                            onClick={() => setShowResetModal(true)}
                            className="text-xs font-bold text-indigo-600 hover:text-indigo-700 transition-colors"
                        >
                            Forgot password?
                        </button>
                    </div>
                </div>
            </div>

            {showResetModal && <ResetPasswordModal onClose={() => setShowResetModal(false)} />}
        </div>
    );
};
