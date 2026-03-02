import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { backendApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { AlertCircle, CheckCircle2, Save, Info } from 'lucide-react';

export default function SchedulingConfig() {
    const { currentUser } = useAuth();
    const queryClient = useQueryClient();
    const tenantId = currentUser?.tenantId;

    const { data: config, isLoading } = useQuery({
        queryKey: ['scheduling-config', tenantId],
        queryFn: () => backendApi.getSchedulingConfig(tenantId!),
        enabled: !!tenantId,
    });

    const [formState, setFormState] = useState({
        designRatio: 20,
        developmentRatio: 40,
        qaRatio: 25,
        approvalRatio: 15,
        overlapPercent: 10,
        autoAllocate: true,
    });
    
    const [savedSuccessfully, setSavedSuccessfully] = useState(false);

    useEffect(() => {
        if (config) {
            setFormState({
                designRatio: config.designRatio,
                developmentRatio: config.developmentRatio,
                qaRatio: config.qaRatio,
                approvalRatio: config.approvalRatio,
                overlapPercent: config.overlapPercent,
                autoAllocate: config.autoAllocate,
            });
        }
    }, [config]);

    const mutation = useMutation({
        mutationFn: (payload: typeof formState) => backendApi.updateSchedulingConfig(tenantId!, payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['scheduling-config', tenantId] });
            setSavedSuccessfully(true);
            setTimeout(() => setSavedSuccessfully(false), 3000);
        }
    });

    const sum = formState.designRatio + formState.developmentRatio + formState.qaRatio + formState.approvalRatio;
    const isSumValid = sum === 100;
    const isOverlapValid = formState.overlapPercent >= 0 && formState.overlapPercent <= 50;
    const isValid = isSumValid && isOverlapValid;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type, checked } = e.target;
        setFormState(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : Math.max(0, parseInt(value) || 0)
        }));
    };

    if (isLoading) {
        return (
            <div className="p-6 max-w-4xl mx-auto flex items-center justify-center h-64">
                <div className="text-slate-500 font-medium flex items-center gap-2 animate-pulse">
                    <div className="w-4 h-4 rounded-full border-2 border-slate-300 border-t-indigo-600 animate-spin"></div>
                    Loading configuration...
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-4xl mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Stage Scheduling Config</h1>
                <p className="text-sm text-slate-500 mt-1">Manage global baseline durations and overlap settings for project stages.</p>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                
                {/* Auto Allocate Toggle & Banner */}
                <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                    <label className="flex items-center space-x-3 cursor-pointer select-none">
                        <div className="relative">
                            <input
                                type="checkbox"
                                name="autoAllocate"
                                className="sr-only"
                                checked={formState.autoAllocate}
                                onChange={handleChange}
                            />
                            <div className={`block w-10 h-6 rounded-full transition-colors ${formState.autoAllocate ? 'bg-indigo-600' : 'bg-slate-300'}`}></div>
                            <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${formState.autoAllocate ? 'translate-x-4' : 'translate-x-0'}`}></div>
                        </div>
                        <span className="font-semibold text-slate-900">Auto-Calculate Stage Deadlines</span>
                    </label>

                    {formState.autoAllocate ? (
                        <div className="mt-4 bg-indigo-50 border border-indigo-100 p-4 rounded-lg flex items-start gap-3">
                            <Info className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                            <div>
                                <p className="text-sm font-medium text-indigo-900">Stage deadlines will be automatically calculated when projects are created.</p>
                                <p className="text-sm text-indigo-700 mt-1">Ratios will distribute the time between the project's start date and its overall deadline. You can manually edit these deadlines later on individual projects.</p>
                            </div>
                        </div>
                    ) : (
                        <div className="mt-4 bg-amber-50 border border-amber-200 p-4 rounded-lg flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                            <div>
                                <p className="text-sm font-medium text-amber-900">Stage deadlines must be manually defined for each project.</p>
                                <p className="text-sm text-amber-700 mt-1">Automatic deadline creation is disabled. Admins must manually set the deadline for Design, Development, QA, and Approval stages within project details.</p>
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-6 space-y-8">
                    {/* Stage Distribution */}
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-slate-900">Stage Duration Distribution</h3>
                            
                            <div className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 transition-colors ${
                                sum === 100 ? 'bg-emerald-100 text-emerald-700' : 
                                sum < 100 ? 'bg-amber-100 text-amber-700' : 
                                'bg-rose-100 text-rose-700'
                            }`}>
                                {sum === 100 ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                                TOTAL: {sum}%
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                            {[
                                { key: 'designRatio', label: 'Design' },
                                { key: 'developmentRatio', label: 'Development' },
                                { key: 'qaRatio', label: 'Internal QA' },
                                { key: 'approvalRatio', label: 'Approval' }
                            ].map(({key, label}) => (
                                <div key={key}>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">{label} %</label>
                                    <div className="relative">
                                        <input 
                                            type="number" 
                                            name={key}
                                            step="1" min="0" max="100"
                                            value={(formState as any)[key]} 
                                            onChange={handleChange}
                                            className="w-full pl-3 pr-8 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-900 font-medium bg-white shadow-sm"
                                        />
                                        <span className="absolute right-3 top-2 text-slate-400 font-medium pointer-events-none">%</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                        
                        {!isSumValid && (
                            <p className={`mt-3 text-sm font-medium flex items-center gap-1.5 ${sum > 100 ? 'text-rose-600' : 'text-amber-600'}`}>
                                <AlertCircle className="w-4 h-4" />
                                {sum > 100 ? 'Ratios exceed 100%. Please decrease values.' : 'Ratios must sum exactly to 100%.'}
                            </p>
                        )}
                    </div>

                    <hr className="border-slate-100" />

                    {/* Timeline Overlap */}
                    <div>
                        <h3 className="text-lg font-semibold text-slate-900 mb-4">Timeline Overlap</h3>
                        <div className="max-w-xs">
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Overlap Buffer %
                                <span className="ml-2 text-xs text-slate-500 font-normal border-b border-dashed border-slate-300 cursor-help" title="Overlap allows consecutive stages to run in parallel. Recommended: 5–20%.">What is this?</span>
                            </label>
                            <div className="relative">
                                <input 
                                    type="number" 
                                    name="overlapPercent"
                                    step="1" min="0" max="50"
                                    value={formState.overlapPercent} 
                                    onChange={handleChange}
                                    className={`w-full pl-3 pr-8 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-900 font-medium shadow-sm bg-white ${!isOverlapValid ? 'border-rose-300 ring-rose-500 focus:ring-rose-500 focus:border-rose-500' : 'border-slate-300'}`}
                                />
                                <span className="absolute right-3 top-2 text-slate-400 font-medium pointer-events-none">%</span>
                            </div>
                            {!isOverlapValid && (
                                <p className="mt-1.5 text-xs text-rose-600 font-medium flex items-center gap-1">
                                    <AlertCircle className="w-3.5 h-3.5" /> 
                                    Overlap must be between 0 and 50%
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
                    <div className="text-sm font-medium">
                        {mutation.isError && (
                            <span className="text-rose-600 flex items-center gap-1.5 bg-rose-50 px-3 py-1.5 rounded-md border border-rose-100">
                                <AlertCircle className="w-4 h-4" />
                                {mutation.error instanceof Error ? mutation.error.message : 'Error saving configuration.'}
                            </span>
                        )}
                        {savedSuccessfully && (
                            <span className="text-emerald-600 flex items-center gap-1.5 bg-emerald-50 px-3 py-1.5 rounded-md border border-emerald-100 transition-opacity">
                                <CheckCircle2 className="w-4 h-4" />
                                Configuration saved successfully.
                            </span>
                        )}
                    </div>
                    <button
                        onClick={() => mutation.mutate(formState)}
                        disabled={!isValid || mutation.isPending}
                        className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 focus:ring-4 focus:ring-indigo-100 disabled:bg-slate-300 disabled:text-slate-500 disabled:cursor-not-allowed transition-all shadow-sm"
                    >
                        <Save className="w-4 h-4" />
                        {mutation.isPending ? 'Saving...' : 'Save Configuration'}
                    </button>
                </div>
            </div>
        </div>
    );
}
