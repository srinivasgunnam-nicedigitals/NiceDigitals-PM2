import React, { useState } from 'react';
import { useChecklistTemplates, useCreateChecklistTemplate, useUpdateChecklistTemplate, useDeleteChecklistTemplate } from '../hooks/useChecklistTemplates';
import { ProjectStage, ChecklistTemplate, ChecklistTemplateItem } from '../types';
import { STAGE_CONFIG } from '../constants';
import { Plus, Trash2, CheckCircle2, Edit2, Archive, Save, X } from 'lucide-react';
import { Button } from './ui';

export const ChecklistTemplatesSettings = () => {
    const { data: templates = [], isLoading } = useChecklistTemplates();
    const createTemplateMutation = useCreateChecklistTemplate();
    const updateTemplateMutation = useUpdateChecklistTemplate();
    const deleteTemplateMutation = useDeleteChecklistTemplate();

    const [activeStage, setActiveStage] = useState<ProjectStage>(ProjectStage.DESIGN);
    const [editingTemplate, setEditingTemplate] = useState<Partial<ChecklistTemplate> | null>(null);

    const stageTemplates = templates.filter(t => t.stage === activeStage && !t.isArchived);
    const defaultTemplate = stageTemplates.find(t => t.isDefault);
    const otherTemplates = stageTemplates.filter(t => !t.isDefault);

    const phases = [
        ProjectStage.DISCOVERY, ProjectStage.DESIGN, ProjectStage.DEVELOPMENT,
        ProjectStage.INTERNAL_QA, ProjectStage.INTERNAL_APPROVAL, ProjectStage.CLIENT_UAT, ProjectStage.DEPLOYMENT
    ];

    const startNewTemplate = () => {
        setEditingTemplate({
            stage: activeStage,
            name: '',
            description: '',
            isDefault: stageTemplates.length === 0,
            items: [{ id: crypto.randomUUID(), label: '', required: true }]
        });
    };

    const handleSave = () => {
        if (!editingTemplate || !editingTemplate.name) return;
        
        // Filter out empty items
        const cleanItems = (editingTemplate.items || []).filter(i => i.label.trim() !== '');
        
        if (editingTemplate.id) {
            updateTemplateMutation.mutate({
                id: editingTemplate.id,
                name: editingTemplate.name,
                description: editingTemplate.description,
                isDefault: editingTemplate.isDefault,
                items: cleanItems
            });
        } else {
            createTemplateMutation.mutate({
                stage: activeStage,
                name: editingTemplate.name,
                description: editingTemplate.description,
                isDefault: editingTemplate.isDefault,
                items: cleanItems
            });
        }
        setEditingTemplate(null);
    };

    const toggleDefault = (template: ChecklistTemplate) => {
        updateTemplateMutation.mutate({ id: template.id, isDefault: true });
    };

    const archiveTemplate = (template: ChecklistTemplate) => {
        if (template.isDefault) {
            alert("Cannot delete a default template. Set another as default first.");
            return;
        }
        if (confirm(`Are you sure you want to archive "${template.name}"?`)) {
            deleteTemplateMutation.mutate(template.id);
        }
    };

    if (isLoading) return <div className="animate-pulse bg-slate-100 dark:bg-slate-800 h-64 rounded-xl"></div>;

    if (editingTemplate) {
        return (
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                        {editingTemplate.id ? 'Edit Template' : 'Create Template'} — {STAGE_CONFIG[activeStage].label}
                    </h3>
                    <button onClick={() => setEditingTemplate(null)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full">
                        <X size={20} />
                    </button>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Template Name</label>
                        <input
                            type="text"
                            value={editingTemplate.name}
                            onChange={(e) => setEditingTemplate({ ...editingTemplate, name: e.target.value })}
                            placeholder="e.g., E-commerce Website Standard"
                            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-medium"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Checklist Items</label>
                        <div className="space-y-2">
                            {editingTemplate.items?.map((item, index) => (
                                <div key={item.id || index} className="flex gap-2 items-center">
                                    <input
                                        type="text"
                                        value={item.label}
                                        onChange={(e) => {
                                            const newItems = [...(editingTemplate.items || [])];
                                            newItems[index].label = e.target.value;
                                            setEditingTemplate({ ...editingTemplate, items: newItems });
                                        }}
                                        placeholder="Item description..."
                                        className="flex-1 px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm"
                                    />
                                    <button
                                        onClick={() => {
                                            const newItems = editingTemplate.items!.filter((_, i) => i !== index);
                                            setEditingTemplate({ ...editingTemplate, items: newItems });
                                        }}
                                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            ))}
                        </div>
                        <button
                            onClick={() => setEditingTemplate({
                                ...editingTemplate,
                                items: [...(editingTemplate.items || []), { id: crypto.randomUUID(), label: '', required: true }]
                            })}
                            className="mt-3 flex items-center gap-2 text-sm text-indigo-600 font-bold hover:text-indigo-700"
                        >
                            <Plus size={16} /> Add Item
                        </button>
                    </div>
                    
                    <div className="flex items-center gap-3 pt-4 border-t border-slate-100 dark:border-slate-700">
                        <input
                            type="checkbox"
                            checked={editingTemplate.isDefault}
                            onChange={(e) => setEditingTemplate({ ...editingTemplate, isDefault: e.target.checked })}
                            className="w-4 h-4 rounded text-indigo-600"
                        />
                        <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Set as default for this stage</span>
                    </div>

                    <div className="pt-4 flex justify-end gap-3">
                        <Button variant="outline" onClick={() => setEditingTemplate(null)}>Cancel</Button>
                        <Button onClick={handleSave} disabled={!editingTemplate.name || editingTemplate.items?.length === 0}>
                            <Save size={16} /> Save Template
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">Process Templates</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Define standard checklists injected automatically when creating projects.</p>
                </div>
                <Button onClick={startNewTemplate} className="gap-2">
                    <Plus size={16} /> New Template
                </Button>
            </div>

            {/* Stage Selector Tabs */}
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {phases.map(stage => {
                    const config = STAGE_CONFIG[stage];
                    const isActive = activeStage === stage;
                    const count = templates.filter(t => t.stage === stage && !t.isArchived).length;
                    return (
                        <button
                            key={stage}
                            onClick={() => setActiveStage(stage)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-full text-[12px] font-bold whitespace-nowrap transition-all border
                                ${isActive 
                                    ? 'bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-900/30 dark:border-indigo-800 dark:text-indigo-400' 
                                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300'}`}
                        >
                            {React.cloneElement(config.icon as React.ReactElement<any>, { className: 'w-3.5 h-3.5' })}
                            {config.label}
                            {count > 0 && (
                                <span className={`px-1.5 py-0.5 rounded-md text-[10px] ${isActive ? 'bg-indigo-100 dark:bg-indigo-800' : 'bg-slate-100 dark:bg-slate-700'}`}>
                                    {count}
                                </span>
                            )}
                        </button>
                    )
                })}
            </div>

            {/* Template List */}
            {stageTemplates.length === 0 ? (
                <div className="text-center py-12 px-6 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl">
                    <CheckCircle2 size={40} className="mx-auto text-slate-300 dark:text-slate-600 mb-3" />
                    <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">No templates yet</h4>
                    <p className="text-xs text-slate-500 mt-1 mb-4">Create a standard checklist for the {STAGE_CONFIG[activeStage].label} phase.</p>
                    <Button variant="outline" size="sm" onClick={startNewTemplate}>Create Template</Button>
                </div>
            ) : (
                <div className="space-y-4">
                    {/* Render Default First */}
                    {defaultTemplate && (
                        <div className="p-5 border-2 border-indigo-200 dark:border-indigo-900/50 bg-indigo-50/50 dark:bg-indigo-900/10 rounded-xl relative group">
                            <div className="absolute top-0 right-0 p-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity translate-x-2 group-hover:translate-x-0">
                                <button onClick={() => setEditingTemplate(defaultTemplate)} className="p-1.5 bg-white dark:bg-slate-800 text-slate-500 hover:text-indigo-600 rounded-md shadow-sm tooltip" data-tip="Edit">
                                    <Edit2 size={14} />
                                </button>
                            </div>
                            
                            <div className="flex items-center gap-3 mb-3">
                                <span className="px-2 py-1 bg-indigo-500 text-white text-[10px] font-black tracking-widest uppercase rounded">Default</span>
                                <h4 className="text-md font-bold text-indigo-950 dark:text-indigo-200">{defaultTemplate.name}</h4>
                            </div>
                            
                            <div className="space-y-2 mt-4 pl-1 border-l-2 border-indigo-200 dark:border-indigo-800">
                                {defaultTemplate.items.map((item, i) => (
                                    <div key={item.id || i} className="flex gap-2 text-sm text-slate-700 dark:text-slate-300">
                                        <CheckCircle2 size={16} className="text-indigo-400 shrink-0 mt-0.5" />
                                        <span>{item.label}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Other Templates */}
                    {otherTemplates.map(template => (
                        <div key={template.id} className="p-5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl relative group">
                            <div className="absolute top-0 right-0 p-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => toggleDefault(template)} className="p-1.5 bg-slate-100 dark:bg-slate-700 text-slate-500 hover:text-indigo-600 rounded-md shadow-sm" title="Set as Default">
                                    <CheckCircle2 size={14} />
                                </button>
                                <button onClick={() => setEditingTemplate(template)} className="p-1.5 bg-slate-100 dark:bg-slate-700 text-slate-500 hover:text-indigo-600 rounded-md shadow-sm" title="Edit">
                                    <Edit2 size={14} />
                                </button>
                                <button onClick={() => archiveTemplate(template)} className="p-1.5 bg-slate-100 dark:bg-slate-700 text-red-400 hover:text-red-600 rounded-md shadow-sm" title="Delete">
                                    <Trash2 size={14} />
                                </button>
                            </div>
                            
                            <h4 className="text-md font-bold text-slate-900 dark:text-slate-100 mb-3">{template.name}</h4>
                            <div className="space-y-2 pl-1 border-l-2 border-slate-200 dark:border-slate-700">
                                {template.items.map((item, i) => (
                                    <div key={item.id || i} className="flex gap-2 text-sm text-slate-500 dark:text-slate-400">
                                        <div className="w-4 h-4 rounded-full border border-slate-300 dark:border-slate-600 shrink-0 mt-0.5" />
                                        <span>{item.label}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
