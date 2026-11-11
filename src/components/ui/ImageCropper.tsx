'use client';

import React, { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import getCroppedImg from '@/utils/cropImage';
import { X, Check, ZoomIn, ZoomOut } from 'lucide-react';

interface ImageCropperProps {
  imageSrc: string;
  onCropComplete: (croppedBlob: Blob) => void;
  onCancel: () => void;
  aspectRatio?: number;
}

export default function ImageCropper({ imageSrc, onCropComplete, onCancel, aspectRatio = 1 }: ImageCropperProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [currentAspect, setCurrentAspect] = useState(aspectRatio);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const onCropCompleteHandler = useCallback((croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleSave = async () => {
    if (!croppedAreaPixels) return;
    try {
      setIsProcessing(true);
      const croppedImage = await getCroppedImg(imageSrc, croppedAreaPixels, 0);
      if (croppedImage) {
        onCropComplete(croppedImage);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[300] flex flex-col bg-black/95 backdrop-blur-xl animate-in fade-in duration-300">
      <div className="flex-1 relative w-full h-full">
        <Cropper
          image={imageSrc}
          crop={crop}
          zoom={zoom}
          aspect={currentAspect}
          onCropChange={setCrop}
          onCropComplete={onCropCompleteHandler}
          onZoomChange={setZoom}
          classes={{ containerClassName: 'h-full w-full' }}
        />
        
        {/* Aspect Ratio Selector */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center bg-black/60 backdrop-blur-md rounded-full p-1 z-10 border border-white/10 shadow-xl">
          <button 
            onClick={() => setCurrentAspect(1)} 
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${currentAspect === 1 ? 'bg-[#e32f8c] text-black shadow-sm' : 'text-white hover:bg-white/20'}`}
          >
            1:1 Pătrat
          </button>
          <button 
            onClick={() => setCurrentAspect(4/5)} 
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${currentAspect === 4/5 ? 'bg-[#e32f8c] text-black shadow-sm' : 'text-white hover:bg-white/20'}`}
          >
            4:5 Vertical
          </button>
        </div>
      </div>
      
      <div className="h-32 md:h-24 bg-black border-t border-white/10 p-4 md:px-8 flex flex-col justify-center gap-4 shrink-0 shadow-[0_-10px_30px_rgba(0,0,0,0.5)]">
        <div className="flex items-center justify-between gap-4 max-w-lg mx-auto w-full">
          <button 
            onClick={onCancel}
            className="w-12 h-12 flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
          >
            <X size={20} />
          </button>
          
          <div className="flex-1 flex items-center gap-3">
            <ZoomOut size={16} className="text-white/50" />
            <input
              type="range"
              value={zoom}
              min={1}
              max={3}
              step={0.1}
              aria-labelledby="Zoom"
              onChange={(e) => setZoom(Number(e.target.value))}
              className="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-[#e32f8c]"
            />
            <ZoomIn size={16} className="text-white/50" />
          </div>

          <button 
            onClick={handleSave}
            disabled={isProcessing}
            className="w-12 h-12 flex items-center justify-center rounded-full bg-[#e32f8c] text-black font-bold hover:bg-[#c41a72] transition-colors disabled:opacity-50"
          >
            {isProcessing ? <span className="animate-spin text-lg">⏳</span> : <Check size={20} />}
          </button>
        </div>
      </div>
    </div>
  );
}
