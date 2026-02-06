import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, User, Bell, Shield, Moon, Sun, LogOut, Check, Upload, Key, Eye, EyeOff } from 'lucide-react';
import { useApp } from '../store';
import { backendApi } from '../services/api';
import { useTheme } from '../ThemeContext';
import { ImageCropModal } from './ImageCropModal';
import { validateImageFile, imageToBase64 } from '../utils/imageUtils';
import { Button } from './ui';

interface SettingsModalProps {
    onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ onClose }) => {
    const { currentUser, setCurrentUser } = useApp();
    const { theme, toggleTheme } = useTheme();
    const [activeTab, setActiveTab] = useState<'profile' | 'notifications' | 'security' | 'general'>('profile');

    // Local state for changes
    const [formData, setFormData] = useState({
        name: currentUser?.name || '',
        email: currentUser?.email || '',
        avatar: currentUser?.avatar || ''
    });

    const [notifications, setNotifications] = useState({
        projectAssignments: true,
        deadlineAlerts: true,
        mentions: true,
        statusUpdates: true
    });

    const [passwordData, setPasswordData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });

    const [showPasswords, setShowPasswords] = useState({
        current: false,
        new: false,
        confirm: false
    });

    const [passwordError, setPasswordError] = useState('');
    const [passwordSuccess, setPasswordSuccess] = useState('');

    const [showCropModal, setShowCropModal] = useState(false);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async () => {
        if (!currentUser) return;

        setIsSaving(true);
        try {
            const updates: any = {};

            // Only send fields that actually changed or are allowed
            if (formData.name !== currentUser.name) updates.name = formData.name;
            if (formData.avatar !== currentUser.avatar) updates.avatar = formData.avatar;

            // Only send email if Admin (Backend rejects otherwise)
            // And only if it actually changed
            if (currentUser.role === 'ADMIN' && formData.email !== currentUser.email) {
                updates.email = formData.email;
            }

            if (Object.keys(updates).length === 0) {
                onClose(); // No changes
                return;
            }

            const updatedUser = await backendApi.updateUser(currentUser.id, updates);

            // Update local state and storage
            setCurrentUser(updatedUser);

            // Update storage immediately to keep sync
            localStorage.setItem('nice_digital_current_user_v4', JSON.stringify(updatedUser));

            onClose();
        } catch (error: any) {
            console.error('Failed to update profile:', error);
            const msg = error.response?.data?.error || 'Failed to update profile';
            alert(msg); // Simple alert for now as per existing pattern
        } finally {
            setIsSaving(false);
        }
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file
        const validation = validateImageFile(file);
        if (!validation.valid) {
            alert(validation.error);
            return;
        }

        try {
            // Convert to base64
            const base64 = await imageToBase64(file);
            setSelectedImage(base64);
            setShowCropModal(true);
        } catch (error) {
            console.error('Error loading image:', error);
            alert('Failed to load image. Please try again.');
        }

        // Reset file input
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleCroppedImage = (croppedImageData: string) => {
        setFormData(prev => ({ ...prev, avatar: croppedImageData }));
        setShowCropModal(false);
        setSelectedImage(null);
    };

    const modalContent = (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            <div className="relative w-full max-w-2xl bg-white dark:bg-slate-800 rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-200 dark:border-slate-700 flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between bg-white dark:bg-slate-800 sticky top-0 z-10">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Settings</h2>
                        <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mt-1">Manage your preferences</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-all"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="flex flex-1 overflow-hidden">
                    {/* Sidebar */}
                    <div className="w-64 bg-slate-50 dark:bg-slate-800/50 border-r border-slate-200 dark:border-slate-700 p-4 space-y-2">
                        {[
                            { id: 'profile', label: 'My Profile', icon: User },
                            { id: 'notifications', label: 'Notifications', icon: Bell },
                            { id: 'security', label: 'Security', icon: Key },
                            { id: 'general', label: 'General', icon: Shield },
                        ].map(item => (
                            <button
                                key={item.id}
                                onClick={() => setActiveTab(item.id as any)}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-[13px] font-bold ${activeTab === item.id
                                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm ring-1 ring-slate-200 dark:ring-slate-600'
                                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-slate-200'
                                    }`}
                            >
                                <item.icon size={16} />
                                {item.label}
                            </button>
                        ))}
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-8">
                        {activeTab === 'profile' && (
                            <div className="space-y-8">
                                <div className="flex items-center gap-6">
                                    <img src={formData.avatar} alt="" className="w-24 h-24 rounded-full border-4 border-slate-100 dark:border-slate-700 shadow-lg object-cover" />
                                    <div>
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                                            onChange={handleFileSelect}
                                            className="hidden"
                                        />
                                        <Button
                                            variant="secondary"
                                            size="sm"
                                            onClick={() => fileInputRef.current?.click()}
                                            className="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/50"
                                        >
                                            <Upload size={14} />
                                            Change Avatar
                                        </Button>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-widest mb-1.5">Display Name</label>
                                        <input
                                            type="text"
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-widest mb-1.5">Email Address</label>
                                        <input
                                            type="email"
                                            value={formData.email}
                                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                            disabled={currentUser?.role !== 'ADMIN'}
                                            className={`w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 ${currentUser?.role !== 'ADMIN' ? 'opacity-60 cursor-not-allowed' : ''
                                                }`}
                                        />
                                        {currentUser?.role !== 'ADMIN' && (
                                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 flex items-center gap-1">
                                                <Shield size={12} />
                                                Only admins can change email addresses
                                            </p>
                                        )}
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-widest mb-1.5">Role</label>
                                        <div className="px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-500 dark:text-slate-400">
                                            {currentUser?.role.replace('_', ' ')}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'notifications' && (
                            <div className="space-y-6">
                                {[
                                    { id: 'projectAssignments', label: 'Project Assignments', desc: 'When you are assigned to a new project' },
                                    { id: 'deadlineAlerts', label: 'Deadline Alerts', desc: 'When a project deadline is approaching' },
                                    { id: 'mentions', label: 'Mentioned in Comments', desc: 'When someone mentions you in a discussion' },
                                    { id: 'statusUpdates', label: 'Status Updates', desc: 'When a project moves to a new stage' },
                                ].map((item, i) => (
                                    <div key={i} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-700">
                                        <div>
                                            <p className="font-bold text-slate-900 dark:text-slate-100 text-sm">{item.label}</p>
                                            <p className="text-xs text-slate-500 font-medium mt-0.5">{item.desc}</p>
                                        </div>
                                        <button
                                            onClick={() => setNotifications(prev => ({ ...prev, [item.id]: !prev[item.id as keyof typeof notifications] }))}
                                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${notifications[item.id as keyof typeof notifications] ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-600'
                                                }`}
                                        >
                                            <span
                                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${notifications[item.id as keyof typeof notifications] ? 'translate-x-6' : 'translate-x-1'
                                                    }`}
                                            />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        {activeTab === 'security' && (
                            <div className="space-y-6">
                                <div>
                                    <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 mb-4">Change Password</h3>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">Update your password to keep your account secure</p>

                                    {passwordError && (
                                        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-600 dark:text-red-400">
                                            {passwordError}
                                        </div>
                                    )}

                                    {passwordSuccess && (
                                        <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl text-sm text-green-600 dark:text-green-400">
                                            {passwordSuccess}
                                        </div>
                                    )}

                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-widest mb-1.5">Current Password</label>
                                            <div className="relative">
                                                <input
                                                    type={showPasswords.current ? 'text' : 'password'}
                                                    value={passwordData.currentPassword}
                                                    onChange={(e) => {
                                                        setPasswordData({ ...passwordData, currentPassword: e.target.value });
                                                        setPasswordError('');
                                                        setPasswordSuccess('');
                                                    }}
                                                    className="w-full px-4 py-3 pr-12 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                                    placeholder="Enter current password"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowPasswords({ ...showPasswords, current: !showPasswords.current })}
                                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                                                >
                                                    {showPasswords.current ? <EyeOff size={18} /> : <Eye size={18} />}
                                                </button>
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-widest mb-1.5">New Password</label>
                                            <div className="relative">
                                                <input
                                                    type={showPasswords.new ? 'text' : 'password'}
                                                    value={passwordData.newPassword}
                                                    onChange={(e) => {
                                                        setPasswordData({ ...passwordData, newPassword: e.target.value });
                                                        setPasswordError('');
                                                        setPasswordSuccess('');
                                                    }}
                                                    className="w-full px-4 py-3 pr-12 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                                    placeholder="Enter new password (min 8 characters)"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                                                >
                                                    {showPasswords.new ? <EyeOff size={18} /> : <Eye size={18} />}
                                                </button>
                                            </div>
                                            {passwordData.newPassword && (
                                                <div className="mt-2">
                                                    <div className="flex gap-1 mb-1">
                                                        {[...Array(4)].map((_, i) => (
                                                            <div
                                                                key={i}
                                                                className={`h-1 flex-1 rounded-full transition-colors ${passwordData.newPassword.length >= (i + 1) * 2
                                                                    ? passwordData.newPassword.length < 8
                                                                        ? 'bg-red-500'
                                                                        : passwordData.newPassword.length < 12
                                                                            ? 'bg-yellow-500'
                                                                            : 'bg-green-500'
                                                                    : 'bg-slate-200 dark:bg-slate-700'
                                                                    }`}
                                                            />
                                                        ))}
                                                    </div>
                                                    <p className="text-xs text-slate-500 dark:text-slate-400">
                                                        {passwordData.newPassword.length < 8
                                                            ? 'Weak - Add more characters'
                                                            : passwordData.newPassword.length < 12
                                                                ? 'Good - Consider adding more characters'
                                                                : 'Strong password'}
                                                    </p>
                                                </div>
                                            )}
                                        </div>

                                        <div>
                                            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-widest mb-1.5">Confirm New Password</label>
                                            <div className="relative">
                                                <input
                                                    type={showPasswords.confirm ? 'text' : 'password'}
                                                    value={passwordData.confirmPassword}
                                                    onChange={(e) => {
                                                        setPasswordData({ ...passwordData, confirmPassword: e.target.value });
                                                        setPasswordError('');
                                                        setPasswordSuccess('');
                                                    }}
                                                    className="w-full px-4 py-3 pr-12 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                                    placeholder="Confirm new password"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
                                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                                                >
                                                    {showPasswords.confirm ? <EyeOff size={18} /> : <Eye size={18} />}
                                                </button>
                                            </div>
                                        </div>

                                        <Button
                                            variant="primary"
                                            size="md"
                                            onClick={async () => {
                                                setPasswordError('');
                                                setPasswordSuccess('');

                                                // Validation
                                                if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
                                                    setPasswordError('All fields are required');
                                                    return;
                                                }

                                                if (passwordData.newPassword.length < 8) {
                                                    setPasswordError('New password must be at least 8 characters long');
                                                    return;
                                                }

                                                if (passwordData.newPassword !== passwordData.confirmPassword) {
                                                    setPasswordError('New passwords do not match');
                                                    return;
                                                }

                                                try {
                                                    await backendApi.changePassword(passwordData.currentPassword, passwordData.newPassword);
                                                    setPasswordSuccess('Password changed successfully!');
                                                    setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
                                                } catch (error: any) {
                                                    setPasswordError(error.response?.data?.error || 'Failed to change password');
                                                }
                                            }}
                                            fullWidth
                                        >
                                            <Key size={16} />
                                            Change Password
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'general' && (
                            <div className="space-y-6">
                                <div>
                                    <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 mb-4">Appearance</h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <button
                                            onClick={() => theme === 'dark' && toggleTheme()}
                                            className={`p-4 rounded-xl border-2 flex flex-col items-center gap-3 transition-all ${theme === 'light'
                                                ? 'border-indigo-600 bg-indigo-50/50 text-indigo-900'
                                                : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:border-slate-300'
                                                }`}
                                        >
                                            <Sun size={24} />
                                            <span className="text-xs font-bold uppercase tracking-widest">Light Mode</span>
                                        </button>
                                        <button
                                            onClick={() => theme === 'light' && toggleTheme()}
                                            className={`p-4 rounded-xl border-2 flex flex-col items-center gap-3 transition-all ${theme === 'dark'
                                                ? 'border-indigo-600 bg-indigo-900/20 text-indigo-400'
                                                : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:border-slate-300'
                                                }`}
                                        >
                                            <Moon size={24} />
                                            <span className="text-xs font-bold uppercase tracking-widest">Dark Mode</span>
                                        </button>
                                    </div>
                                </div>

                                <div className="pt-6 border-t border-slate-200 dark:border-slate-700">
                                    <h3 className="text-sm font-black text-red-600 mb-4">Danger Zone</h3>
                                    <Button
                                        variant="danger"
                                        size="md"
                                        onClick={() => {
                                            setCurrentUser(null);
                                            onClose();
                                        }}
                                        fullWidth
                                    >
                                        <LogOut size={16} />
                                        Sign Out of All Devices
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 flex justify-end gap-3 rounded-b-3xl">
                    <Button
                        variant="ghost"
                        size="md"
                        onClick={onClose}
                    >
                        Cancel
                    </Button>
                    <Button
                        variant="primary"
                        size="md"
                        onClick={handleSave}
                    >
                        <Check size={16} />
                        {isSaving ? 'Saving...' : 'Save Changes'}
                    </Button>
                </div>
            </div>
        </div>
    );

    return (
        <>
            {createPortal(modalContent, document.body)}
            {showCropModal && selectedImage && (
                <ImageCropModal
                    imageSrc={selectedImage}
                    onSave={handleCroppedImage}
                    onCancel={() => {
                        setShowCropModal(false);
                        setSelectedImage(null);
                    }}
                />
            )}
        </>
    );
};
