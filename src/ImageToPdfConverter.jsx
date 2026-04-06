import React, { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { jsPDF } from 'jspdf';
import { Trash2, GripVertical, FileDown, ImagePlus, X } from 'lucide-react';

// Sortable Image Item Component
function SortableImageItem({ id, image, onRemove }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="relative group rounded-lg overflow-hidden border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 aspect-[3/4]"
    >
      <div className="absolute inset-0 z-10 opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 flex flex-col justify-between p-2">
        <div className="flex justify-between items-start">
          <div
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing p-1.5 bg-white/20 hover:bg-white/40 rounded backdrop-blur-sm transition-colors text-white"
          >
            <GripVertical size={18} />
          </div>
          <button
            onClick={() => onRemove(id)}
            className="p-1.5 bg-red-500/80 hover:bg-red-500 rounded backdrop-blur-sm transition-colors text-white"
            title="Remove image"
          >
            <Trash2 size={18} />
          </button>
        </div>
        <div className="text-white text-xs font-medium truncate px-1 drop-shadow-md">
          {image.file.name}
        </div>
      </div>
      <img
        src={image.preview}
        alt={image.file.name}
        className="w-full h-full object-cover"
        onLoad={() => {
          // Keep reference only, revoke object url on unmount if needed
        }}
      />
    </div>
  );
}

export default function ImageToPdfConverter() {
  const [images, setImages] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'image/png': ['.png'],
      'image/jpeg': ['.jpg', '.jpeg']
    },
    onDrop: (acceptedFiles) => {
      setError('');
      const newImages = acceptedFiles.map(file => ({
        id: crypto.randomUUID(),
        file,
        preview: URL.createObjectURL(file)
      }));
      setImages(prev => [...prev, ...newImages]);
    },
    onDropRejected: () => {
      setError('Only JPG and PNG images are supported.');
    }
  });

  const handleDragEnd = (event) => {
    const { active, over } = event;

    if (active && over && active.id !== over.id) {
      setImages((items) => {
        const oldIndex = items.findIndex(item => item.id === active.id);
        const newIndex = items.findIndex(item => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const removeImage = (idToRemove) => {
    setImages(images.filter(img => img.id !== idToRemove));
  };

  const clearAll = () => {
    setImages([]);
    setError('');
  };

  const generatePDF = async () => {
    if (images.length === 0) {
      setError('Please add at least one image to generate a PDF.');
      return;
    }

    setIsGenerating(true);
    setError('');

    try {
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      for (let i = 0; i < images.length; i++) {
        if (i > 0) {
          pdf.addPage();
        }

        const imgData = images[i].preview;

        const img = new Image();
        img.src = imgData;
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
        });

        const imgWidth = img.width;
        const imgHeight = img.height;
        const ratio = imgWidth / imgHeight;

        let renderWidth = pageWidth;
        let renderHeight = renderWidth / ratio;

        if (renderHeight > pageHeight) {
          renderHeight = pageHeight;
          renderWidth = renderHeight * ratio;
        }

        const xOffset = (pageWidth - renderWidth) / 2;
        const yOffset = (pageHeight - renderHeight) / 2;

        pdf.addImage(imgData, 'JPEG', xOffset, yOffset, renderWidth, renderHeight);
      }

      pdf.save('Generated_Document.pdf');
    } catch (err) {
      console.error('Failed to generate PDF:', err);
      setError('An error occurred while generating the PDF.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 overflow-hidden text-slate-800 dark:text-slate-200 transition-colors duration-300">
      <div className="max-w-5xl mx-auto px-4 py-8 h-full flex flex-col">

        {/* Header */}
        <header className="mb-8 text-center space-y-2 pt-8">
          <h1 className="text-4xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-500 dark:from-blue-400 dark:to-indigo-300">
            Image to PDF Converter
          </h1>
          <p className="text-slate-500 dark:text-slate-400 max-w-xl mx-auto">
            Upload your images, drag to reorder them, and export as a single beautiful PDF document.
          </p>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 p-6 sm:p-10 flex flex-col gap-6">

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-lg flex items-center justify-between animate-in fade-in slide-in-from-top-2">
              <p className="font-medium">{error}</p>
              <button onClick={() => setError('')} className="p-1 hover:bg-red-100 dark:hover:bg-red-900/40 rounded transition-colors">
                <X size={18} />
              </button>
            </div>
          )}

          {/* Dropzone */}
          <div
            {...getRootProps()}
            className={`
              relative border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200 overflow-hidden group
              ${isDragActive
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/10 dark:border-blue-400'
                : 'border-slate-300 dark:border-slate-600 hover:border-blue-400 hover:bg-slate-50 dark:hover:bg-slate-700/50'}
            `}
          >
            <input {...getInputProps()} />

            <div className={`p-4 rounded-full mb-4 transition-transform duration-300 ${isDragActive ? 'bg-blue-100 dark:bg-blue-500/20 scale-110' : 'bg-slate-100 dark:bg-slate-700 group-hover:scale-105'}`}>
              <ImagePlus className={`w-8 h-8 ${isDragActive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400'}`} />
            </div>

            <h3 className="text-lg font-semibold mb-2">
              {isDragActive ? "Drop images here" : "Drag & drop images here"}
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm">
              Support for JPG and PNG. You can upload multiple files at once.
            </p>
          </div>


        </main>
      </div>
    </div>
  );
}
