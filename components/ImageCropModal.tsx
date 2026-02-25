import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, ZoomIn, ZoomOut, Check, Upload } from 'lucide-react';
import { cropImage, getImageDimensions } from '../utils/imageUtils';

interface ImageCropModalProps {
    imageSrc: string;
    onSave: (croppedImageData: string) => void;
    onCancel: () => void;
}

export const ImageCropModal: React.FC<ImageCropModalProps> = ({ imageSrc, onSave, onCancel }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [scale, setScale] = useState(1);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [imageLoaded, setImageLoaded] = useState(false);
    const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });
    const imageRef = useRef<HTMLImageElement | null>(null);

    // Escape Key Listener
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                onCancel();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onCancel]);

    // Load image
    useEffect(() => {
        const img = new Image();
        img.onload = async () => {
            imageRef.current = img;
            const dims = await getImageDimensions(imageSrc);
            setImageDimensions(dims);

            // Center image initially
            const canvas = canvasRef.current;
            if (canvas) {
                const centerX = (canvas.width - dims.width) / 2;
                const centerY = (canvas.height - dims.height) / 2;
                setPosition({ x: centerX, y: centerY });
            }

            setImageLoaded(true);
        };
        img.src = imageSrc;
    }, [imageSrc]);

    // Draw canvas
    useEffect(() => {
        if (!imageLoaded || !imageRef.current || !canvasRef.current) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw image
        ctx.save();
        ctx.translate(position.x, position.y);
        ctx.scale(scale, scale);
        ctx.drawImage(imageRef.current, 0, 0);
        ctx.restore();

        // Draw crop circle overlay
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const radius = Math.min(canvas.width, canvas.height) / 2 - 20;

        // Darken outside crop area
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Clear crop circle
        ctx.globalCompositeOperation = 'destination-out';
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.fill();

        // Draw crop circle border
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.stroke();
    }, [imageLoaded, position, scale]);

    // Handle mouse down
    const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
        setIsDragging(true);
        setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    };

    // Handle mouse move
    const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!isDragging) return;
        setPosition({
            x: e.clientX - dragStart.x,
            y: e.clientY - dragStart.y
        });
    };

    // Handle mouse up
    const handleMouseUp = () => {
        setIsDragging(false);
    };

    // Handle zoom
    const handleZoomIn = () => {
        setScale(prev => Math.min(prev + 0.1, 3));
    };

    const handleZoomOut = () => {
        setScale(prev => Math.max(prev - 0.1, 0.5));
    };

    // Handle save
    const handleSave = async () => {
        if (!canvasRef.current) return;

        const canvas = canvasRef.current;
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const radius = Math.min(canvas.width, canvas.height) / 2 - 20;

        // Calculate crop area in original image coordinates
        const cropX = (centerX - radius - position.x) / scale;
        const cropY = (centerY - radius - position.y) / scale;
        const cropSize = (radius * 2) / scale;

        try {
            const croppedImage = await cropImage(
                imageSrc,
                {
                    x: cropX,
                    y: cropY,
                    width: cropSize,
                    height: cropSize,
                    scale
                },
                200 // Output size
            );
            onSave(croppedImage);
        } catch (error) {
            console.error('Error cropping image:', error);
            alert('Failed to crop image. Please try again.');
        }
    };

    const modalContent = (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-saas-fade">
            <div
                className="bg-white dark:bg-slate-800 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="px-8 py-6 bg-gradient-to-r from-indigo-600 to-purple-600 text-white flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                            <Upload className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black uppercase tracking-tight">Crop Your Photo</h2>
                            <p className="text-indigo-100 text-xs font-bold uppercase tracking-widest opacity-90">Adjust and position</p>
                        </div>
                    </div>
                    <button
                        onClick={onCancel}
                        className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-all"
                    >
                        <X className="w-5 h-5 text-white" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-8">
                    {/* Canvas */}
                    <div className="flex justify-center mb-6">
                        <canvas
                            ref={canvasRef}
                            width={500}
                            height={500}
                            className="border-2 border-slate-200 dark:border-slate-700 rounded-lg cursor-move"
                            onMouseDown={handleMouseDown}
                            onMouseMove={handleMouseMove}
                            onMouseUp={handleMouseUp}
                            onMouseLeave={handleMouseUp}
                        />
                    </div>

                    {/* Controls */}
                    <div className="flex items-center justify-center gap-4 mb-6">
                        <button
                            onClick={handleZoomOut}
                            className="p-3 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-all"
                            title="Zoom Out"
                        >
                            <ZoomOut size={20} />
                        </button>

                        <div className="flex items-center gap-3">
                            <span className="text-sm font-bold text-slate-600 dark:text-slate-300">Zoom:</span>
                            <input
                                type="range"
                                min="0.5"
                                max="3"
                                step="0.1"
                                value={scale}
                                onChange={(e) => setScale(parseFloat(e.target.value))}
                                className="w-48"
                            />
                            <span className="text-sm font-bold text-slate-600 dark:text-slate-300 w-12">{Math.round(scale * 100)}%</span>
                        </div>

                        <button
                            onClick={handleZoomIn}
                            className="p-3 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-all"
                            title="Zoom In"
                        >
                            <ZoomIn size={20} />
                        </button>
                    </div>

                    {/* Instructions */}
                    <p className="text-center text-sm text-slate-500 dark:text-slate-400 mb-6">
                        Drag the image to reposition • Use zoom controls to adjust size
                    </p>

                    {/* Action Buttons */}
                    <div className="flex gap-3">
                        <button
                            onClick={onCancel}
                            className="flex-1 py-3 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-black text-xs uppercase tracking-widest rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 transition-all"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            className="flex-1 py-3 bg-indigo-600 text-white font-black text-xs uppercase tracking-widest rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-100 dark:shadow-none hover:shadow-indigo-300 dark:hover:shadow-indigo-500/30 transition-all flex items-center justify-center gap-2"
                        >
                            <Check size={16} />
                            Save Photo
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
};
