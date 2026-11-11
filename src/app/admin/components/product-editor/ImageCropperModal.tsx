"use client";

import { getOptimizedImageUrl } from '@/lib/utils/imageProxy';
import { useState, useRef } from "react";
import ReactCrop, { type Crop, centerCrop, makeAspectCrop, PixelCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import { X, Crop as CropIcon, Check, Loader2 } from "lucide-react";

export function ImageCropperModal({ 
  imageUrl, 
  onClose, 
  onCropComplete 
}: { 
  imageUrl: string; 
  onClose: () => void; 
  onCropComplete: (croppedBlob: Blob) => Promise<void>;
}) {
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const imgRef = useRef<HTMLImageElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const [currentAspect, setCurrentAspect] = useState(1);

  function onImageLoad(e: React.SyntheticEvent<HTMLImageElement>) {
    const { width, height } = e.currentTarget;
    const initialCrop = centerCrop(
      makeAspectCrop({ unit: "%", width: 90 }, currentAspect, width, height),
      width,
      height
    );
    setCrop(initialCrop);
  }

  const handleAspectChange = (aspect: number) => {
    setCurrentAspect(aspect);
    if (imgRef.current) {
      const { width, height } = imgRef.current;
      const newCrop = centerCrop(
        makeAspectCrop({ unit: "%", width: 90 }, aspect, width, height),
        width,
        height
      );
      setCrop(newCrop);
    }
  };

  const handleCropSave = async () => {
    if (!completedCrop || !imgRef.current) return;
    setIsProcessing(true);

    try {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      
      if (!ctx) {
        throw new Error("No 2d context");
      }

      const scaleX = imgRef.current.naturalWidth / imgRef.current.width;
      const scaleY = imgRef.current.naturalHeight / imgRef.current.height;

      canvas.width = completedCrop.width * scaleX;
      canvas.height = completedCrop.height * scaleY;

      ctx.drawImage(
        imgRef.current,
        completedCrop.x * scaleX,
        completedCrop.y * scaleY,
        completedCrop.width * scaleX,
        completedCrop.height * scaleY,
        0,
        0,
        completedCrop.width * scaleX,
        completedCrop.height * scaleY
      );

      canvas.toBlob(async (blob) => {
        if (!blob) throw new Error("Canvas is empty");
        await onCropComplete(blob);
        setIsProcessing(false);
      }, "image/png");
      
    } catch (err) {
      console.error(err);
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-900">
              <CropIcon size={20} />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900">Decupează imaginea</h2>
              <p className="text-sm text-slate-500 font-medium">Formatează imaginea pentru un aspect perfect</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-10 h-10 rounded-xl bg-slate-50 text-slate-500 flex items-center justify-center hover:bg-slate-100 hover:text-slate-900 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Editor */}
        <div className="p-6 bg-slate-50 flex items-center justify-center min-h-[300px] max-h-[60vh] overflow-auto">
          <ReactCrop
            crop={crop}
            onChange={(_, percentCrop) => setCrop(percentCrop)}
            onComplete={(c) => setCompletedCrop(c)}
            aspect={currentAspect}
            className="max-h-[50vh] max-w-full rounded-lg shadow-sm overflow-hidden"
          >
            <img
              ref={imgRef}
              src={getOptimizedImageUrl(imageUrl)}
              crossOrigin="anonymous"
              alt="Crop preview"
              className="max-h-[50vh] w-auto"
              onLoad={onImageLoad}
            />
          </ReactCrop>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 p-6 border-t border-slate-100 bg-white">
          <div className="flex items-center gap-2">
            <button 
              onClick={() => handleAspectChange(1)} 
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${currentAspect === 1 ? 'bg-[#e32f8c] text-black shadow-sm' : 'text-slate-500 bg-slate-100 hover:bg-slate-200'}`}
            >
              1:1 Pătrat
            </button>
            <button 
              onClick={() => handleAspectChange(4/5)} 
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${currentAspect === 4/5 ? 'bg-[#e32f8c] text-black shadow-sm' : 'text-slate-500 bg-slate-100 hover:bg-slate-200'}`}
            >
              4:5 Vertical
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-6 py-3 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
            >
              Anulează
            </button>
            <button
              onClick={handleCropSave}
              disabled={!completedCrop || isProcessing}
              className="px-6 py-3 rounded-xl font-bold text-black bg-[#e32f8c] hover:bg-[#c41a72] transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {isProcessing ? (
                <><Loader2 size={18} className="animate-spin" /> Se procesează...</>
              ) : (
                <><Check size={18} /> Aplică & Salvează</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
