// Image processing utilities for avatar upload

export interface CropData {
    x: number;
    y: number;
    width: number;
    height: number;
    scale: number;
}

/**
 * Validate image file type and size
 */
export const validateImageFile = (file: File): { valid: boolean; error?: string } => {
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    const maxSize = 5 * 1024 * 1024; // 5MB

    if (!validTypes.includes(file.type)) {
        return {
            valid: false,
            error: 'Invalid file type. Please upload a JPG, PNG, GIF, or WebP image.'
        };
    }

    if (file.size > maxSize) {
        return {
            valid: false,
            error: 'File size too large. Please upload an image smaller than 5MB.'
        };
    }

    return { valid: true };
};

/**
 * Convert image file to base64 string
 */
export const imageToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
};

/**
 * Load image from file or URL
 */
export const loadImage = (src: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
    });
};

/**
 * Crop image to specified area and return as base64
 */
export const cropImage = async (
    imageSrc: string,
    cropData: CropData,
    outputSize: number = 200
): Promise<string> => {
    const img = await loadImage(imageSrc);

    // Create canvas for cropping
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
        throw new Error('Failed to get canvas context');
    }

    // Set output size
    canvas.width = outputSize;
    canvas.height = outputSize;

    // Calculate source dimensions based on crop data
    const sourceX = cropData.x;
    const sourceY = cropData.y;
    const sourceWidth = cropData.width;
    const sourceHeight = cropData.height;

    // Draw cropped image
    ctx.drawImage(
        img,
        sourceX,
        sourceY,
        sourceWidth,
        sourceHeight,
        0,
        0,
        outputSize,
        outputSize
    );

    // Convert to base64 JPEG (smaller file size)
    return canvas.toDataURL('image/jpeg', 0.9);
};

/**
 * Resize image if it's too large
 */
export const resizeImage = async (
    file: File,
    maxWidth: number = 1000,
    maxHeight: number = 1000
): Promise<string> => {
    const imageSrc = await imageToBase64(file);
    const img = await loadImage(imageSrc);

    // Check if resize is needed
    if (img.width <= maxWidth && img.height <= maxHeight) {
        return imageSrc;
    }

    // Calculate new dimensions
    let width = img.width;
    let height = img.height;

    if (width > height) {
        if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
        }
    } else {
        if (height > maxHeight) {
            width = (width * maxHeight) / height;
            height = maxHeight;
        }
    }

    // Create canvas and resize
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
        throw new Error('Failed to get canvas context');
    }

    canvas.width = width;
    canvas.height = height;

    ctx.drawImage(img, 0, 0, width, height);

    return canvas.toDataURL('image/jpeg', 0.9);
};

/**
 * Get image dimensions
 */
export const getImageDimensions = async (src: string): Promise<{ width: number; height: number }> => {
    const img = await loadImage(src);
    return {
        width: img.width,
        height: img.height
    };
};
