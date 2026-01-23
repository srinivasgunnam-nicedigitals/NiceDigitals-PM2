
import React, { useState } from 'react';
import { X, FileText, ShoppingCart, Smartphone, BarChart3, Megaphone, Check } from 'lucide-react';
import { Priority, ProjectStage } from '../types';

export interface ProjectTemplate {
    id: string;
    name: string;
    description: string;
    icon: React.ReactNode;
    defaultPriority: Priority;
    estimatedDuration: number; // days
    defaultScope: string;
    defaultChecklists?: {
        design?: string[];
        dev?: string[];
        qa?: string[];
    };
}

export const DEFAULT_TEMPLATES: ProjectTemplate[] = [
    {
        id: 'ecommerce',
        name: 'E-commerce Website',
        description: 'Full-featured online store with product catalog, cart, and checkout',
        icon: <ShoppingCart size={24} />,
        defaultPriority: Priority.HIGH,
        estimatedDuration: 45,
        defaultScope: 'Complete e-commerce platform with product management, shopping cart, payment integration, and order tracking.',
        defaultChecklists: {
            design: ['Homepage mockup', 'Product page design', 'Cart & checkout flow', 'Mobile responsive'],
            dev: ['Product catalog', 'Shopping cart', 'Payment gateway', 'Order management', 'Admin panel'],
            qa: ['Payment testing', 'Cart functionality', 'Mobile testing', 'Security audit']
        }
    },
    {
        id: 'landing-page',
        name: 'Landing Page',
        description: 'Marketing landing page with lead capture',
        icon: <FileText size={24} />,
        defaultPriority: Priority.MEDIUM,
        estimatedDuration: 10,
        defaultScope: 'Single-page marketing site with hero section, features, testimonials, and contact form.',
        defaultChecklists: {
            design: ['Hero section', 'Features layout', 'CTA design', 'Mobile version'],
            dev: ['HTML/CSS structure', 'Form integration', 'Analytics setup', 'SEO optimization'],
            qa: ['Form testing', 'Cross-browser', 'Mobile responsive', 'Performance']
        }
    },
    {
        id: 'mobile-app',
        name: 'Mobile App',
        description: 'iOS and Android mobile application',
        icon: <Smartphone size={24} />,
        defaultPriority: Priority.HIGH,
        estimatedDuration: 60,
        defaultScope: 'Native mobile application for iOS and Android with user authentication, core features, and push notifications.',
        defaultChecklists: {
            design: ['App screens', 'Navigation flow', 'Icon set', 'Style guide'],
            dev: ['User auth', 'Core features', 'API integration', 'Push notifications', 'App store setup'],
            qa: ['Device testing', 'Performance', 'Security', 'App store review']
        }
    },
    {
        id: 'dashboard',
        name: 'Dashboard / SaaS',
        description: 'Admin dashboard or SaaS application',
        icon: <BarChart3 size={24} />,
        defaultPriority: Priority.HIGH,
        estimatedDuration: 50,
        defaultScope: 'Web-based dashboard with data visualization, user management, and reporting features.',
        defaultChecklists: {
            design: ['Dashboard layout', 'Charts & graphs', 'Data tables', 'Settings pages'],
            dev: ['Authentication', 'Data visualization', 'API endpoints', 'User roles', 'Reporting'],
            qa: ['Data accuracy', 'Performance', 'Security', 'Browser compatibility']
        }
    },
    {
        id: 'marketing-campaign',
        name: 'Marketing Campaign',
        description: 'Multi-channel marketing campaign',
        icon: <Megaphone size={24} />,
        defaultPriority: Priority.MEDIUM,
        estimatedDuration: 20,
        defaultScope: 'Integrated marketing campaign including email, social media, and landing pages.',
        defaultChecklists: {
            design: ['Email templates', 'Social graphics', 'Landing page', 'Ad creatives'],
            dev: ['Email automation', 'Landing page', 'Tracking pixels', 'A/B testing'],
            qa: ['Email testing', 'Link validation', 'Analytics check', 'Mobile preview']
        }
    }
];

interface ProjectTemplatesModalProps {
    onClose: () => void;
    onSelectTemplate: (template: ProjectTemplate) => void;
}

export const ProjectTemplatesModal: React.FC<ProjectTemplatesModalProps> = ({
    onClose,
    onSelectTemplate
}) => {
    const [selectedTemplate, setSelectedTemplate] = useState<ProjectTemplate | null>(null);

    const handleSelect = () => {
        if (selectedTemplate) {
            onSelectTemplate(selectedTemplate);
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-800 w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Choose a Template</h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                            Start with a pre-configured project template
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                    >
                        <X size={20} className="text-slate-400" />
                    </button>
                </div>

                {/* Templates Grid */}
                <div className="p-6 max-h-[600px] overflow-y-auto">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {DEFAULT_TEMPLATES.map((template) => (
                            <button
                                key={template.id}
                                onClick={() => setSelectedTemplate(template)}
                                className={`text-left p-5 rounded-xl border-2 transition-all ${selectedTemplate?.id === template.id
                                        ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20'
                                        : 'border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-700'
                                    }`}
                            >
                                <div className="flex items-start gap-4">
                                    <div className={`p-3 rounded-lg ${selectedTemplate?.id === template.id
                                            ? 'bg-indigo-600 text-white'
                                            : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                                        }`}>
                                        {template.icon}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <h3 className="font-bold text-slate-900 dark:text-slate-100">
                                                {template.name}
                                            </h3>
                                            {selectedTemplate?.id === template.id && (
                                                <Check size={16} className="text-indigo-600" />
                                            )}
                                        </div>
                                        <p className="text-sm text-slate-600 dark:text-slate-300 mb-2">
                                            {template.description}
                                        </p>
                                        <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                                            <span>~{template.estimatedDuration} days</span>
                                            <span>•</span>
                                            <span className={`px-2 py-0.5 rounded ${template.defaultPriority === Priority.HIGH
                                                    ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                                                    : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                                                }`}>
                                                {template.defaultPriority}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
                    >
                        Start from scratch
                    </button>
                    <button
                        onClick={handleSelect}
                        disabled={!selectedTemplate}
                        className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white rounded-lg font-semibold transition-colors disabled:cursor-not-allowed"
                    >
                        Use Template
                    </button>
                </div>
            </div>
        </div>
    );
};
