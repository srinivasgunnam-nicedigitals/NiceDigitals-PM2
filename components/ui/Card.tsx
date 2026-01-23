import React, { HTMLAttributes } from 'react';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
    variant?: 'default' | 'bordered' | 'elevated';
    padding?: 'none' | 'sm' | 'md' | 'lg';
    hoverable?: boolean;
    children: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({
    variant = 'default',
    padding = 'md',
    hoverable = false,
    className = '',
    children,
    ...props
}) => {
    // Base styles
    const baseStyles = 'bg-white dark:bg-slate-800 rounded-xl transition-all duration-200';

    // Variant styles
    const variantStyles = {
        default: 'border border-slate-200 dark:border-slate-700',
        bordered: 'border-2 border-slate-200 dark:border-slate-700',
        elevated: 'shadow-md hover:shadow-lg border border-slate-100 dark:border-slate-700'
    };

    // Padding styles
    const paddingStyles = {
        none: '',
        sm: 'p-4',
        md: 'p-6',
        lg: 'p-8'
    };

    // Hover styles
    const hoverStyles = hoverable
        ? 'hover:shadow-lg hover:border-slate-300 dark:hover:border-slate-600 cursor-pointer'
        : '';

    return (
        <div
            className={`${baseStyles} ${variantStyles[variant]} ${paddingStyles[padding]} ${hoverStyles} ${className}`}
            {...props}
        >
            {children}
        </div>
    );
};
