'use client';

import { useCallback, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, X, Image as ImageIcon, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ImageUploadProps {
  value?: string | null;
  onChange: (url: string | null) => void;
  accept?: string;
  maxSize?: number; // in MB
  className?: string;
  disabled?: boolean;
  onUpload?: (file: File) => Promise<string>;
}

export function ImageUpload({
  value,
  onChange,
  accept = 'image/*',
  maxSize = 5,
  className,
  disabled = false,
  onUpload,
}: ImageUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    async (file: File) => {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError('File harus berupa gambar');
        return;
      }

      // Validate file size
      if (file.size > maxSize * 1024 * 1024) {
        setError(`Ukuran file maksimal ${maxSize}MB`);
        return;
      }

      setError(null);
      setIsUploading(true);

      try {
        if (onUpload) {
          const url = await onUpload(file);
          onChange(url);
        } else {
          // Default: create object URL
          const url = URL.createObjectURL(file);
          onChange(url);
        }
      } catch (err) {
        setError('Gagal mengupload gambar');
        console.error(err);
      } finally {
        setIsUploading(false);
      }
    },
    [maxSize, onChange, onUpload]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (disabled) return;

      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [disabled, handleFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleClick = useCallback(() => {
    if (disabled) return;
    inputRef.current?.click();
  }, [disabled]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleRemove = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onChange(null);
    },
    [onChange]
  );

  return (
    <div
      className={cn(
        'relative rounded-xl border-2 border-dashed transition-all duration-200 overflow-hidden',
        isDragging ? 'border-amber-400 bg-amber-400/5' : 'border-white/10 hover:border-white/20',
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onClick={handleClick}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleChange}
        disabled={disabled}
        className="hidden"
      />

      <AnimatePresence mode="wait">
        {value ? (
          <motion.div
            key="preview"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="relative aspect-square"
          >
            <img
              src={value}
              alt="Preview"
              className="w-full h-full object-cover rounded-xl"
            />
            <button
              onClick={handleRemove}
              className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 hover:bg-black/80 transition-colors"
            >
              <X className="w-4 h-4 text-white" />
            </button>
          </motion.div>
        ) : (
          <motion.div
            key="placeholder"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center aspect-square py-8"
          >
            {isUploading ? (
              <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
            ) : (
              <>
                <div className="w-12 h-12 rounded-xl bg-amber-400/10 flex items-center justify-center mb-3">
                  {isDragging ? (
                    <ImageIcon className="w-6 h-6 text-amber-400" />
                  ) : (
                    <Upload className="w-6 h-6 text-amber-400" />
                  )}
                </div>
                <p className="text-sm text-white/60 font-medium">
                  {isDragging ? 'Lepaskan file' : 'Klik atau drag & drop'}
                </p>
                <p className="text-xs text-white/40 mt-1">
                  PNG, JPG hingga {maxSize}MB
                </p>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute bottom-2 left-2 right-2 px-3 py-2 rounded-lg bg-red-500/20 border border-red-500/30"
          >
            <p className="text-xs text-red-400">{error}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
