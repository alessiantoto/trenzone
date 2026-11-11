"use client";

import { getOptimizedImageUrl } from '@/lib/utils/imageProxy';
import { Product } from "@/lib/api";
import { Upload, X, Crop, MoveUp, MoveDown, Loader2, Image as ImageIcon } from "lucide-react";
import { useState, useRef } from "react";
import Image from "next/image";
import { ImageCropperModal } from "./ImageCropperModal";
import { uploadProductImage } from "@/app/actions/admin-products";
import toast from "react-hot-toast";

interface ImageManagerProps {
  product: Partial<Product>;
  onChange: (field: string, value: any) => void;
}

export function ImageManager({ product, onChange }: ImageManagerProps) {
  const images = product.images || [];
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Crop state for general images
  const [cropImageUrl, setCropImageUrl] = useState<string | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  
  // Crop state for variant images
  const [variantCropUrl, setVariantCropUrl] = useState<string | null>(null);
  const [editingVariantIndex, setEditingVariantIndex] = useState<number | null>(null);
  const [uploadingVariantIndex, setUploadingVariantIndex] = useState<number | null>(null);
  const variantFileInputRef = useRef<HTMLInputElement>(null);
  
  // Unique folder ID for this session/product
  const folderIdRef = useRef(product?.id || `temp_${Math.random().toString(36).substring(2, 11)}`);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Create a local URL for the cropper
    const url = URL.createObjectURL(file);
    setEditingIndex(null);
    setCropImageUrl(url);
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleEditImage = (index: number, url: string) => {
    setEditingIndex(index);
    setCropImageUrl(url);
  };

  const handleCropComplete = async (croppedBlob: Blob) => {
    const isEditing = editingIndex !== null;
    const currentIndex = editingIndex;

    setCropImageUrl(null);
    setEditingIndex(null);
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', new File([croppedBlob], `crop_${Date.now()}.webp`, { type: 'image/webp' }));
      formData.append('folderId', folderIdRef.current);
      
      const res = await uploadProductImage(formData);
      if (res.success && res.url) {
        if (isEditing && currentIndex !== null) {
          const newImages = [...images];
          newImages[currentIndex] = res.url;
          onChange("images", newImages);
        } else {
          onChange("images", [...images, res.url]);
        }
        toast.success("Imaginea a fost încărcată cu succes!");
      }
    } catch (err) {
      console.error("Upload error:", err);
      toast.error("A apărut o eroare la încărcarea imaginii.");
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    onChange("images", newImages);
  };

  const handleMoveImage = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === images.length - 1) return;

    const newImages = [...images];
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    [newImages[index], newImages[swapIndex]] = [newImages[swapIndex], newImages[index]];
    
    onChange("images", newImages);
  };

  const hasVariants = product.variants && product.variants.options && product.variants.options.length > 0;
  const showVariantImages = hasVariants && product.variants?.type !== 'size';

  const handleVariantFileSelect = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    setEditingVariantIndex(index);
    setVariantCropUrl(url);
    
    if (variantFileInputRef.current) {
      variantFileInputRef.current.value = '';
    }
  };

  const handleVariantCropComplete = async (croppedBlob: Blob) => {
    const currentIndex = editingVariantIndex;
    setVariantCropUrl(null);
    setEditingVariantIndex(null);
    
    if (currentIndex === null || !product.variants) return;
    
    setUploadingVariantIndex(currentIndex);

    try {
      const formData = new FormData();
      formData.append('file', new File([croppedBlob], `var_${Date.now()}.webp`, { type: 'image/webp' }));
      formData.append('folderId', folderIdRef.current);
      
      const res = await uploadProductImage(formData);
      if (res.success && res.url) {
        const newOptions = [...product.variants.options];
        newOptions[currentIndex] = { ...newOptions[currentIndex], image: res.url };
        onChange("variants", { ...product.variants, options: newOptions });
        toast.success("Imaginea variantei a fost încărcată!");
      }
    } catch (err) {
      console.error("Upload error:", err);
      toast.error("A apărut o eroare la încărcarea imaginii pentru variantă.");
    } finally {
      setUploadingVariantIndex(null);
    }
  };

  const handleRemoveVariantImage = (index: number) => {
    if (!product.variants) return;
    const newOptions = [...product.variants.options];
    newOptions[index] = { ...newOptions[index], image: undefined };
    onChange("variants", { ...product.variants, options: newOptions });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-black text-slate-900">Imagini Produs</h3>
          <p className="text-sm text-slate-500 font-medium">Formatează automat imaginile la aspect 1:1</p>
        </div>
        <input 
          type="file" 
          accept="image/*" 
          className="hidden" 
          ref={fileInputRef}
          onChange={handleFileSelect}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="h-10 px-4 rounded-xl bg-[#e32f8c] text-black text-sm font-bold flex items-center gap-2 hover:bg-[#c41a72] transition-colors disabled:opacity-50"
        >
          {uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />} 
          Încarcă Imagine
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {images.map((img, idx) => (
          <div key={idx} className="relative group aspect-square rounded-2xl border-2 border-slate-200 overflow-hidden bg-slate-50">
            <Image src={img} alt={`Product ${idx}`} fill sizes="200px" className="object-cover" />
            
            {/* Overlay controls */}
            <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 backdrop-blur-sm">
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => handleMoveImage(idx, 'up')}
                  disabled={idx === 0}
                  className="w-8 h-8 rounded-lg bg-white/20 text-white flex items-center justify-center hover:bg-white hover:text-black transition-colors disabled:opacity-30 disabled:hover:bg-white/20 disabled:hover:text-white"
                >
                  <MoveUp size={16} />
                </button>
                <button 
                  onClick={() => handleEditImage(idx, img)}
                  className="w-8 h-8 rounded-lg bg-[#e32f8c]/80 text-black flex items-center justify-center hover:bg-[#e32f8c] transition-colors"
                  title="Decupează imaginea"
                >
                  <Crop size={16} />
                </button>
                <button 
                  onClick={() => handleMoveImage(idx, 'down')}
                  disabled={idx === images.length - 1}
                  className="w-8 h-8 rounded-lg bg-white/20 text-white flex items-center justify-center hover:bg-white hover:text-black transition-colors disabled:opacity-30 disabled:hover:bg-white/20 disabled:hover:text-white"
                >
                  <MoveDown size={16} />
                </button>
              </div>
              <button 
                onClick={() => handleRemoveImage(idx)}
                className="w-8 h-8 rounded-lg bg-red-500/80 text-white flex items-center justify-center hover:bg-red-500 transition-colors"
              >
                <X size={16} />
              </button>
            </div>
            {idx === 0 && (
              <div className="absolute top-2 left-2 bg-[#e32f8c] text-black text-[10px] font-black uppercase px-2 py-1 rounded-md shadow-sm">
                Principală
              </div>
            )}
            <div className="absolute top-2 right-2 bg-black/50 text-white text-[10px] font-black px-2 py-1 rounded-md shadow-sm backdrop-blur-md">
              #{idx}
            </div>
          </div>
        ))}

        {images.length === 0 && (
          <div className="col-span-full text-center p-12 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-300">
            <p className="text-sm font-bold text-slate-500">Nicio imagine adăugată.</p>
          </div>
        )}
      </div>

      {showVariantImages && (
        <div className="pt-8 mt-8 border-t border-slate-200 space-y-6">
          <div>
            <h3 className="text-lg font-black text-slate-900">Imagini Variante</h3>
            <p className="text-sm text-slate-500 font-medium">Poze specifice pentru fiecare culoare sau mărime în parte</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {product.variants!.options.map((opt: any, idx: number) => {
              const nameRO = typeof opt.name === 'object' ? opt.name.ro : opt.name;
              
              return (
                <div key={idx} className="relative group aspect-square rounded-2xl border-2 border-slate-200 overflow-hidden bg-slate-50 flex flex-col">
                  {uploadingVariantIndex === idx ? (
                    <div className="flex-1 flex flex-col items-center justify-center gap-2">
                      <Loader2 size={24} className="animate-spin text-[#e32f8c]" />
                      <span className="text-[10px] font-bold text-slate-400">SE ÎNCARCĂ...</span>
                    </div>
                  ) : opt.image ? (
                    <>
                      <img src={getOptimizedImageUrl(opt.image)} alt={nameRO} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 backdrop-blur-sm">
                        <label className="w-8 h-8 rounded-lg bg-white/20 text-white flex items-center justify-center hover:bg-white hover:text-black transition-colors cursor-pointer">
                          <Upload size={16} />
                          <input 
                            type="file" 
                            accept="image/*" 
                            className="hidden" 
                            onChange={(e) => handleVariantFileSelect(e, idx)}
                          />
                        </label>
                        <button 
                          onClick={() => handleRemoveVariantImage(idx)}
                          className="w-8 h-8 rounded-lg bg-red-500/80 text-white flex items-center justify-center hover:bg-red-500 transition-colors"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    </>
                  ) : (
                    <label className="flex-1 flex flex-col items-center justify-center gap-2 text-slate-400 hover:text-[#e32f8c] hover:bg-slate-100 transition-colors cursor-pointer">
                      <ImageIcon size={24} />
                      <span className="text-xs font-bold">Adaugă Poză</span>
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={(e) => handleVariantFileSelect(e, idx)}
                      />
                    </label>
                  )}
                  <div className="absolute bottom-0 inset-x-0 bg-white/90 backdrop-blur border-t border-slate-200 py-1.5 px-2 text-center truncate">
                    <span className="text-[10px] font-black text-slate-700 uppercase tracking-wider">{nameRO}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {cropImageUrl && (
        <ImageCropperModal 
          imageUrl={cropImageUrl}
          onClose={() => setCropImageUrl(null)}
          onCropComplete={handleCropComplete}
        />
      )}

      {variantCropUrl && (
        <ImageCropperModal 
          imageUrl={variantCropUrl}
          onClose={() => setVariantCropUrl(null)}
          onCropComplete={handleVariantCropComplete}
        />
      )}
    </div>
  );
}
