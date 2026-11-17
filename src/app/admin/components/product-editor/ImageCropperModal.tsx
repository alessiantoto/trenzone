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
        try {
          if (!blob) {
            setIsProcessing(false);
            return;
          }
          await onCropComplete(blob);
        } catch (err) {
          console.error(err);
        } finally {
          setIsProcessing(false);
        }
      }, "image/png");
      
    } catch (err) {
      console.error(err);
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl sm:rounded-3xl shadow-xl w-full max-w-2xl max-h-[92dvh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 p-4 sm:p-6 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-900 shrink-0">
              <CropIcon size={20} />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-black text-slate-900 truncate">Decupează imaginea</h2>
              <p className="text-xs sm:text-sm text-slate-500 font-medium truncate">Formatează imaginea pentru un aspect perfect</p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="w-10 h-10 rounded-xl bg-slate-50 text-slate-500 flex items-center justify-center hover:bg-slate-100 hover:text-slate-900 transition-colors shrink-0 cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Editor */}
        <div className="p-3 sm:p-6 bg-slate-50 flex items-center justify-center min-h-[220px] sm:min-h-[300px] max-h-[50dvh] sm:max-h-[60vh] overflow-auto flex-1">
          <ReactCrop
            crop={crop}
            onChange={(_, percentCrop) => setCrop(percentCrop)}
            onComplete={(c) => setCompletedCrop(c)}
            aspect={currentAspect}
            className="max-h-[45dvh] sm:max-h-[50vh] max-w-full rounded-lg shadow-sm overflow-hidden"
          >
            <img
              ref={imgRef}
              src={getOptimizedImageUrl(imageUrl)}
              crossOrigin="anonymous"
              alt="Crop preview"
              className="max-h-[45dvh] sm:max-h-[50vh] w-auto"
              onLoad={onImageLoad}
            />
          </ReactCrop>
        </div>

        {/* Footer */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:p-6 border-t border-slate-100 bg-white shrink-0">
          <div className="grid grid-cols-2 sm:flex items-center gap-2 w-full sm:w-auto">
            <button 
              type="button"
              onClick={() => handleAspectChange(1)} 
              className={`min-h-[40px] px-3 py-1.5 rounded-lg text-xs font-bold transition-all text-center cursor-pointer ${currentAspect === 1 ? 'bg-[#e32f8c] text-black shadow-sm' : 'text-slate-500 bg-slate-100 hover:bg-slate-200'}`}
            >
              1:1 Pătrat
            </button>
            <button 
              type="button"
              onClick={() => handleAspectChange(4/5)} 
              className={`min-h-[40px] px-3 py-1.5 rounded-lg text-xs font-bold transition-all text-center cursor-pointer ${currentAspect === 4/5 ? 'bg-[#e32f8c] text-black shadow-sm' : 'text-slate-500 bg-slate-100 hover:bg-slate-200'}`}
            >
              4:5 Vertical
            </button>
          </div>
          <div className="grid grid-cols-2 sm:flex items-center gap-2 w-full sm:w-auto sm:ml-auto">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl font-bold text-sm text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors text-center cursor-pointer"
            >
              Anulează
            </button>
            <button
              type="button"
              onClick={handleCropSave}
              disabled={!completedCrop || isProcessing}
              className="min-h-[44px] px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl font-bold text-sm text-black bg-[#e32f8c] hover:bg-[#c41a72] transition-colors flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
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
