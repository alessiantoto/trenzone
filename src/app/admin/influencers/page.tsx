'use client';

import { useState, useEffect, useRef } from 'react';
import { 
  addInfluencerAdmin, 
  updateInfluencerAdmin, 
  deleteInfluencerAdmin, 
  reorderInfluencersAdmin,
  deleteInfluencerVideoFromStorage,
  getSignedVideoUploadUrl
} from '@/app/actions/admin-marketing';
import { InfluencerVideo } from '@/lib/api';
import { 
  Loader2, 
  Plus, 
  Trash2, 
  GripVertical, 
  Check, 
  X, 
  Video, 
  Upload, 
  Edit2, 
  ArrowUp, 
  ArrowDown, 
  Play, 
  Sparkles, 
  Eye, 
  Film, 
  User, 
  AtSign, 
  AlertTriangle,
  RefreshCw
} from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import toast from 'react-hot-toast';

export default function AdminInfluencersPage() {
  const [influencers, setInfluencers] = useState<InfluencerVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>('');
  const [influencerToDelete, setInfluencerToDelete] = useState<InfluencerVideo | null>(null);
  const [previewVideo, setPreviewVideo] = useState<InfluencerVideo | null>(null);
  
  // New influencer form state
  const [newName, setNewName] = useState('');
  const [newHandle, setNewHandle] = useState('');
  const [newFile, setNewFile] = useState<File | null>(null);
  const [newFilePreviewUrl, setNewFilePreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editHandle, setEditHandle] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Video replacement uploading state
  const [replacingVideoId, setReplacingVideoId] = useState<string | null>(null);

  // Mobile form toggle
  const [showMobileAddForm, setShowMobileAddForm] = useState(false);

  useEffect(() => {
    loadInfluencers();
  }, []);

  // Cleanup object URL when newFile changes
  useEffect(() => {
    if (newFile) {
      const url = URL.createObjectURL(newFile);
      setNewFilePreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setNewFilePreviewUrl(null);
    }
  }, [newFile]);

  // Handle escape key for preview modal & delete modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setPreviewVideo(null);
        setInfluencerToDelete(null);
        setEditingId(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const loadInfluencers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/data?action=influencers');
      const json = await res.json();
      setInfluencers(json.data || []);
    } catch (e) {
      console.error('Error loading influencers:', e);
      toast.error('Eroare la încărcarea influencerilor.');
    } finally {
      setLoading(false);
    }
  };

  const handleDragEnd = async (result: any) => {
    if (!result.destination) return;
    if (result.source.index === result.destination.index) return;

    const items = Array.from(influencers);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    // Update local state immediately for snappy UX
    setInfluencers(items);

    // Update database
    const updates = items.map((item, index) => ({
      id: item.id,
      display_order: index
    }));

    try {
      await reorderInfluencersAdmin(updates);
      toast.success('Noua ordine a fost salvată!');
    } catch (e) {
      console.error('Failed to reorder', e);
      toast.error('Eroare la reordonare.');
      loadInfluencers(); // revert
    }
  };

  const handleMove = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= influencers.length) return;

    const items = Array.from(influencers);
    const [moved] = items.splice(index, 1);
    items.splice(targetIndex, 0, moved);

    setInfluencers(items);

    const updates = items.map((item, idx) => ({
      id: item.id,
      display_order: idx
    }));

    try {
      await reorderInfluencersAdmin(updates);
      toast.success('Ordinea a fost actualizată!');
    } catch (e) {
      console.error('Failed to move item', e);
      toast.error('Eroare la salvarea noii ordini.');
      loadInfluencers();
    }
  };

  const handleUploadAndAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newFile) {
      toast.error('Completează numele și alege un fișier video.');
      return;
    }

    setIsUploading(true);
    setUploadProgress('Se generează link securizat de încărcare...');

    try {
      const { signedUrl, publicUrl } = await getSignedVideoUploadUrl(newFile.name, newFile.type);
      
      setUploadProgress('Se încarcă clipul video în storage...');
      const uploadRes = await fetch(signedUrl, {
        method: 'PUT',
        body: newFile,
        headers: {
          'Content-Type': newFile.type || 'video/mp4'
        }
      });

      if (!uploadRes.ok) throw new Error("Upload-ul direct a eșuat. Verifică mărimea fișierului.");

      setUploadProgress('Se salvează influencerul...');
      await addInfluencerAdmin({
        influencer_name: newName.trim(),
        influencer_handle: newHandle.trim() ? (newHandle.startsWith('@') ? newHandle.trim() : `@${newHandle.trim()}`) : null,
        video_url: publicUrl,
        display_order: influencers.length,
        is_active: true
      });

      setNewName('');
      setNewHandle('');
      setNewFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      setShowMobileAddForm(false);
      await loadInfluencers();
      toast.success('Clipul a fost adăugat cu succes!');
    } catch (error) {
      console.error('Upload failed:', error);
      toast.error(error instanceof Error ? error.message : 'A apărut o eroare la încărcare.');
    } finally {
      setIsUploading(false);
      setUploadProgress('');
    }
  };

  const startEdit = (inf: InfluencerVideo) => {
    setEditingId(inf.id);
    setEditName(inf.influencer_name);
    setEditHandle(inf.influencer_handle || '');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName('');
    setEditHandle('');
  };

  const handleSaveEdit = async (id: string) => {
    setIsSavingEdit(true);
    try {
      const formattedHandle = editHandle.trim() 
        ? (editHandle.startsWith('@') ? editHandle.trim() : `@${editHandle.trim()}`) 
        : null;

      await updateInfluencerAdmin(id, { 
        influencer_name: editName.trim(),
        influencer_handle: formattedHandle
      });

      setInfluencers(influencers.map(i => i.id === id ? { 
        ...i, 
        influencer_name: editName.trim(),
        influencer_handle: formattedHandle 
      } : i));
      
      setEditingId(null);
      toast.success('Datele au fost actualizate!');
    } catch (e) {
      console.error('Error updating influencer:', e);
      toast.error('Eroare la salvare.');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleDelete = async (inf: InfluencerVideo) => {
    setInfluencerToDelete(null);
    try {
      await deleteInfluencerAdmin(inf.id, inf.video_url);
      setInfluencers(influencers.filter(i => i.id !== inf.id));
      toast.success('Clipul a fost șters definitiv.');
    } catch (e) {
      console.error('Error deleting influencer:', e);
      toast.error('Eroare la ștergere.');
    }
  };

  const toggleActive = async (inf: InfluencerVideo) => {
    try {
      const newStatus = !inf.is_active;
      // Optimistic update
      setInfluencers(influencers.map(i => i.id === inf.id ? { ...i, is_active: newStatus } : i));
      await updateInfluencerAdmin(inf.id, { is_active: newStatus });
      toast.success(newStatus ? `Clipul cu ${inf.influencer_name} este acum Activ pe site.` : `Clipul cu ${inf.influencer_name} a fost dezactivat.`);
    } catch (e) {
      console.error('Error toggling active status:', e);
      toast.error('Eroare la schimbarea statusului.');
      loadInfluencers();
    }
  };

  const handleUpdateVideo = async (inf: InfluencerVideo, file: File) => {
    setReplacingVideoId(inf.id);
    try {
      const { signedUrl, publicUrl } = await getSignedVideoUploadUrl(file.name, file.type);
      
      const uploadRes = await fetch(signedUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type || 'video/mp4'
        }
      });

      if (!uploadRes.ok) throw new Error("Upload-ul videoclipului a eșuat.");

      await updateInfluencerAdmin(inf.id, { video_url: publicUrl });
      
      setInfluencers(influencers.map(i => i.id === inf.id ? { ...i, video_url: publicUrl } : i));
      toast.success(`Videoclipul pentru ${inf.influencer_name} a fost înlocuit!`);
    } catch (e) {
      console.error('Error replacing video:', e);
      toast.error(e instanceof Error ? e.message : 'A apărut o eroare la înlocuirea clipului.');
    } finally {
      setReplacingVideoId(null);
    }
  };

  const activeCount = influencers.filter(i => i.is_active).length;
  const inactiveCount = influencers.length - activeCount;

  return (
    <div className="p-3.5 sm:p-6 max-w-7xl mx-auto space-y-6 sm:space-y-8 animate-in fade-in pb-16">
      
      {/* 🌟 PAGE HEADER & STATS */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3 sm:gap-3.5">
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-[#e32f8c]/10 text-[#008ba3] flex items-center justify-center shrink-0 shadow-xs">
            <Film size={22} className="sm:w-6 sm:h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Management Influenceri</h1>
            <p className="text-xs sm:text-sm text-slate-500 font-medium">Clipurile video verticale afișate pe prima pagină</p>
          </div>
        </div>

        {/* Action button on mobile to toggle Add Form */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowMobileAddForm(!showMobileAddForm)}
            className="lg:hidden flex-1 sm:flex-none flex items-center justify-center gap-2 bg-[#e32f8c] hover:bg-[#c41a72] active:scale-98 text-slate-950 px-4 py-2.5 rounded-xl font-black text-xs transition-all shadow-sm shadow-[#e32f8c]/20 cursor-pointer"
          >
            {showMobileAddForm ? <X size={15} /> : <Plus size={15} />}
            <span>{showMobileAddForm ? 'Închide Formularul' : 'Adaugă Influencer'}</span>
          </button>
        </div>
      </div>

      {/* 📊 KPI STATS PILLS */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        <div className="bg-white border border-slate-200/80 rounded-2xl p-3 sm:p-4 flex items-center gap-3 shadow-2xs">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700 shrink-0">
            <Video size={18} />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-slate-400 truncate">Total Clipuri</p>
            <p className="text-sm sm:text-xl font-black text-slate-900">{influencers.length}</p>
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-3 sm:p-4 flex items-center gap-3 shadow-2xs">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700 shrink-0">
            <Check size={18} />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-slate-400 truncate">Active pe Site</p>
            <p className="text-sm sm:text-xl font-black text-emerald-700">{activeCount}</p>
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-3 sm:p-4 flex items-center gap-3 shadow-2xs">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700 shrink-0">
            <Eye size={18} />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-slate-400 truncate">Dezactivate</p>
            <p className="text-sm sm:text-xl font-black text-amber-700">{inactiveCount}</p>
          </div>
        </div>
      </div>

      {/* 🚀 MAIN CONTENT: FORM + LIST */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* ➕ ADD NEW INFLUENCER FORM CARD */}
        <div className={`lg:col-span-4 ${showMobileAddForm ? 'block' : 'hidden lg:block'}`}>
          <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-slate-200/90 shadow-sm sticky top-6 space-y-4 sm:space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#e32f8c]/10 text-[#008ba3] flex items-center justify-center">
                  <Plus size={16} />
                </div>
                <h2 className="font-heading font-black text-base sm:text-lg text-slate-900">Adaugă Influencer</h2>
              </div>
              <button
                type="button"
                onClick={() => setShowMobileAddForm(false)}
                className="lg:hidden text-slate-400 hover:text-slate-600 p-1"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleUploadAndAdd} className="space-y-4">
              {/* Influencer Name Input */}
              <div className="space-y-1.5">
                <label className="text-[11px] sm:text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <User size={13} className="text-[#008ba3]" />
                  <span>Nume Influencer (Opțional)</span>
                </label>
                <input 
                  type="text" 
                  value={newName} 
                  onChange={e => setNewName(e.target.value)}
                  placeholder="ex: Vlad Tren (lăsați gol dacă nu are nume)"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-base sm:text-sm font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#e32f8c] focus:ring-1 focus:ring-[#e32f8c]/20"
                />
              </div>

              {/* Influencer Handle Input */}
              <div className="space-y-1.5">
                <label className="text-[11px] sm:text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <AtSign size={13} className="text-[#008ba3]" />
                  <span>Handle Social Media (Opțional)</span>
                </label>
                <input 
                  type="text" 
                  value={newHandle} 
                  onChange={e => setNewHandle(e.target.value)}
                  placeholder="ex: @florin.ragalie"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-base sm:text-sm font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#e32f8c] focus:ring-1 focus:ring-[#e32f8c]/20"
                />
              </div>

              {/* Modern Video Dropzone */}
              <div className="space-y-1.5">
                <label className="text-[11px] sm:text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Video size={13} className="text-[#008ba3]" />
                  <span>Fișier Video Vertical (9:16) *</span>
                </label>

                {!newFile ? (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="group border-2 border-dashed border-slate-200 hover:border-[#e32f8c] bg-slate-50/70 hover:bg-[#e32f8c]/5 rounded-2xl p-5 sm:p-6 text-center cursor-pointer transition-all duration-200 flex flex-col items-center justify-center gap-2"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 text-[#008ba3] flex items-center justify-center shadow-2xs group-hover:scale-105 transition-transform">
                      <Upload size={20} />
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm font-black text-slate-800">Apasă pentru a alege videoclipul</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">MP4, WebM sau QuickTime (.MOV)</p>
                    </div>
                    <span className="inline-flex items-center text-[10px] font-bold text-[#008ba3] bg-[#e32f8c]/10 px-2 py-0.5 rounded-full mt-1">
                      Format vertical recomandat
                    </span>
                  </div>
                ) : (
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 flex items-center gap-3 relative">
                    <div className="w-14 h-20 bg-slate-900 rounded-xl overflow-hidden relative shrink-0 shadow-xs flex items-center justify-center">
                      {newFilePreviewUrl ? (
                        <video 
                          src={newFilePreviewUrl} 
                          className="w-full h-full object-cover" 
                          muted 
                          playsInline 
                        />
                      ) : (
                        <Video size={20} className="text-slate-400" />
                      )}
                      <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                        <Play size={14} className="text-white fill-white" />
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-black text-slate-900 truncate">{newFile.name}</p>
                      <p className="text-[11px] text-slate-400 font-medium">
                        {(newFile.size / (1024 * 1024)).toFixed(1)} MB • {newFile.type || 'video'}
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setNewFile(null);
                          if (fileInputRef.current) fileInputRef.current.value = '';
                        }}
                        className="text-[11px] font-bold text-red-500 hover:text-red-700 mt-1 cursor-pointer"
                      >
                        Schimbă fișierul
                      </button>
                    </div>
                  </div>
                )}

                <input 
                  ref={fileInputRef}
                  type="file" 
                  accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov"
                  onChange={e => {
                    const f = e.target.files?.[0] || null;
                    setNewFile(f);
                  }}
                  className="hidden"
                  required={!newFile}
                />
              </div>

              {/* Submit Button */}
              <button 
                type="submit" 
                disabled={isUploading || !newName.trim() || !newFile}
                className="w-full bg-[#e32f8c] hover:bg-[#c41a72] active:scale-98 text-slate-950 font-black py-3 px-4 rounded-xl flex items-center justify-center gap-2 text-xs sm:text-sm transition-all disabled:opacity-50 disabled:hover:bg-[#e32f8c] shadow-sm shadow-[#e32f8c]/20 cursor-pointer"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{uploadProgress || 'Se încarcă clipul...'}</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    <span>Adaugă Influencer</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* 🎬 INFLUENCERS LIST CARD */}
        <div className="lg:col-span-8">
          <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden">
            
            {/* List Header */}
            <div className="p-4 sm:p-5 bg-slate-50/80 border-b border-slate-200/70 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <h2 className="font-heading font-black text-sm sm:text-base text-slate-900">
                  Clipuri Afișate pe Site ({influencers.length})
                </h2>
                <p className="text-[11px] sm:text-xs text-slate-500 font-medium mt-0.5">
                  Ordinea de aici este ordinea exactă din caruselul de pe prima pagină.
                </p>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 bg-white border border-slate-200 px-2.5 py-1 rounded-lg self-start sm:self-auto shrink-0 shadow-2xs">
                <GripVertical size={13} className="text-[#008ba3]" />
                <span>Trage sau folosește săgețile ↑ ↓</span>
              </div>
            </div>

            {/* Loading Skeleton / Empty State */}
            {loading ? (
              <div className="p-12 flex flex-col items-center justify-center text-center gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-[#e32f8c]" />
                <p className="text-xs font-bold text-slate-400">Se încarcă lista de influenceri...</p>
              </div>
            ) : influencers.length === 0 ? (
              <div className="p-12 text-center flex flex-col items-center justify-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400">
                  <Film size={26} />
                </div>
                <div>
                  <h3 className="font-heading font-black text-sm text-slate-800">Niciun influencer adăugat încă</h3>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm">
                    Folosește formularul pentru a încărca primul videoclip cu un influencer.
                  </p>
                </div>
              </div>
            ) : (
              <DragDropContext onDragEnd={handleDragEnd}>
                <Droppable droppableId="influencers">
                  {(provided) => (
                    <div 
                      {...provided.droppableProps} 
                      ref={provided.innerRef}
                      className="divide-y divide-slate-100"
                    >
                      {influencers.map((inf, index) => {
                        const isBeingReplaced = replacingVideoId === inf.id;
                        const isEditingThis = editingId === inf.id;

                        return (
                          <Draggable key={inf.id} draggableId={inf.id.toString()} index={index}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                className={`p-3.5 sm:p-4 transition-colors ${
                                  snapshot.isDragging 
                                    ? 'bg-[#e32f8c]/10 shadow-lg ring-2 ring-[#e32f8c] rounded-2xl z-50' 
                                    : 'hover:bg-slate-50/70 bg-white'
                                }`}
                              >
                                {/* CARD LAYOUT: Mobile Stacked & Desktop Grid */}
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                                  
                                  {/* LEFT: Reorder handles + Video + Details */}
                                  <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
                                    
                                    {/* Reorder controls */}
                                    <div className="flex flex-col items-center gap-1 shrink-0 pt-1 sm:pt-0">
                                      <div 
                                        {...provided.dragHandleProps} 
                                        className="p-1 text-slate-400 hover:text-slate-900 active:text-[#008ba3] cursor-grab active:cursor-grabbing rounded-lg hover:bg-slate-100 transition-colors"
                                        title="Trage pentru reordonare"
                                      >
                                        <GripVertical size={16} />
                                      </div>
                                      
                                      {/* Tactile Up/Down Buttons for 100% Mobile Reliability */}
                                      <div className="flex flex-col gap-0.5">
                                        <button
                                          type="button"
                                          onClick={() => handleMove(index, 'up')}
                                          disabled={index === 0}
                                          className="p-1 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed transition-colors"
                                          title="Mută mai sus"
                                        >
                                          <ArrowUp size={13} />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleMove(index, 'down')}
                                          disabled={index === influencers.length - 1}
                                          className="p-1 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed transition-colors"
                                          title="Mută mai jos"
                                        >
                                          <ArrowDown size={13} />
                                        </button>
                                      </div>

                                      <span className="text-[10px] font-black text-slate-400">
                                        #{index + 1}
                                      </span>
                                    </div>

                                    {/* Video Thumbnail (Clickable for preview) */}
                                    <div 
                                      onClick={() => setPreviewVideo(inf)}
                                      className="w-16 sm:w-20 aspect-[9/16] bg-slate-950 rounded-xl overflow-hidden relative shrink-0 shadow-2xs group/thumb cursor-pointer border border-slate-200"
                                      title="Apasă pentru a previzualiza videoclipul"
                                    >
                                      <video
                                        src={inf.video_url}
                                        muted
                                        autoPlay
                                        loop
                                        playsInline
                                        preload="metadata"
                                        className="w-full h-full object-cover"
                                      />
                                      <div className="absolute inset-0 bg-black/25 group-hover/thumb:bg-black/50 transition-colors flex items-center justify-center">
                                        <div className="w-7 h-7 rounded-full bg-white/90 group-hover/thumb:bg-white flex items-center justify-center shadow-sm transition-transform group-hover/thumb:scale-110">
                                          <Play size={12} className="text-slate-950 fill-slate-950 ml-0.5" />
                                        </div>
                                      </div>
                                    </div>

                                    {/* Influencer Info & Inline Edit Form */}
                                    <div className="min-w-0 flex-1">
                                      {isEditingThis ? (
                                        <div className="space-y-2 py-1">
                                          <div className="space-y-1">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Nume</label>
                                            <input 
                                              type="text"
                                              value={editName}
                                              onChange={e => setEditName(e.target.value)}
                                              placeholder="Nume Influencer"
                                              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-[#e32f8c]"
                                              autoFocus
                                            />
                                          </div>
                                          <div className="space-y-1">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Handle</label>
                                            <input 
                                              type="text"
                                              value={editHandle}
                                              onChange={e => setEditHandle(e.target.value)}
                                              placeholder="@handle"
                                              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-[#e32f8c]"
                                            />
                                          </div>
                                          <div className="flex items-center gap-2 pt-1">
                                            <button
                                              type="button"
                                              onClick={() => handleSaveEdit(inf.id)}
                                              disabled={isSavingEdit}
                                              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-black transition-colors flex items-center gap-1 cursor-pointer"
                                            >
                                              {isSavingEdit ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} className="text-[#e32f8c]" />}
                                              <span>Salvează</span>
                                            </button>
                                            <button
                                              type="button"
                                              onClick={cancelEdit}
                                              className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                                            >
                                              Anulează
                                            </button>
                                          </div>
                                        </div>
                                      ) : (
                                        <div className="space-y-1">
                                          <div className="flex items-center gap-2 flex-wrap">
                                            <h3 className="font-heading font-black text-sm sm:text-base text-slate-900 truncate">
                                              {inf.influencer_name?.trim() || <span className="text-slate-400 font-normal italic">Clip #{inf.display_order} (Fără nume)</span>}
                                            </h3>
                                            
                                            {/* Status badge inline on mobile/desktop */}
                                            <span 
                                              className={`inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                                                inf.is_active 
                                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200/60' 
                                                  : 'bg-slate-100 text-slate-600 border border-slate-200'
                                              }`}
                                            >
                                              <span className={`w-1.5 h-1.5 rounded-full ${inf.is_active ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                                              {inf.is_active ? 'Activ' : 'Inactiv'}
                                            </span>
                                          </div>

                                          {inf.influencer_handle ? (
                                            <p className="text-xs font-bold text-[#008ba3] flex items-center gap-1">
                                              <span>{inf.influencer_handle}</span>
                                            </p>
                                          ) : (
                                            <p className="text-[11px] text-slate-400 italic">Fără handle specificat</p>
                                          )}

                                          <div className="pt-1 flex items-center gap-3 text-[11px] text-slate-400">
                                            <button
                                              type="button"
                                              onClick={() => setPreviewVideo(inf)}
                                              className="text-[#008ba3] hover:underline font-bold inline-flex items-center gap-1 cursor-pointer"
                                            >
                                              <Eye size={12} />
                                              <span>Previzualizează</span>
                                            </button>
                                          </div>
                                        </div>
                                      )}
                                    </div>

                                  </div>

                                  {/* RIGHT: Full Action Bar (Always 100% visible on Mobile & PC) */}
                                  {!isEditingThis && (
                                    <div className="flex items-center justify-between sm:justify-end gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                                      
                                      {/* Toggle Active Switch Button */}
                                      <button
                                        type="button"
                                        onClick={() => toggleActive(inf)}
                                        className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer shadow-2xs ${
                                          inf.is_active 
                                            ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200' 
                                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                                        }`}
                                        title={inf.is_active ? 'Apasă pentru a ascunde de pe site' : 'Apasă pentru a afișa pe site'}
                                      >
                                        {inf.is_active ? 'Dezactivează' : 'Activează'}
                                      </button>

                                      {/* Edit Name / Handle Button */}
                                      <button
                                        type="button"
                                        onClick={() => startEdit(inf)}
                                        className="p-2 sm:px-3 sm:py-1.5 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200/80 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                                        title="Editează Nume & Handle"
                                      >
                                        <Edit2 size={14} />
                                        <span className="hidden sm:inline">Editează</span>
                                      </button>

                                      {/* Replace Video Button */}
                                      <label 
                                        className={`p-2 sm:px-3 sm:py-1.5 text-[#008ba3] bg-[#e32f8c]/10 hover:bg-[#e32f8c]/20 border border-[#e32f8c]/20 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 ${
                                          isBeingReplaced ? 'pointer-events-none opacity-50' : ''
                                        }`}
                                        title="Înlocuiește fișierul video"
                                      >
                                        {isBeingReplaced ? (
                                          <>
                                            <Loader2 size={14} className="animate-spin" />
                                            <span className="hidden sm:inline">Se înlocuiește...</span>
                                          </>
                                        ) : (
                                          <>
                                            <RefreshCw size={14} />
                                            <span className="hidden sm:inline">Schimbă Video</span>
                                            <input 
                                              type="file" 
                                              accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov"
                                              className="hidden" 
                                              onChange={(e) => {
                                                if (e.target.files && e.target.files[0]) {
                                                  handleUpdateVideo(inf, e.target.files[0]);
                                                }
                                              }}
                                            />
                                          </>
                                        )}
                                      </label>

                                      {/* Delete Button */}
                                      <button
                                        type="button"
                                        onClick={() => setInfluencerToDelete(inf)}
                                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
                                        title="Șterge definitiv"
                                      >
                                        <Trash2 size={15} />
                                      </button>

                                    </div>
                                  )}

                                </div>
                              </div>
                            )}
                          </Draggable>
                        );
                      })}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>
            )}

          </div>
        </div>

      </div>

      {/* 🎥 FULLSCREEN / POPUP VIDEO PREVIEW MODAL */}
      {previewVideo && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in duration-200"
          onClick={() => setPreviewVideo(null)}
        >
          <div 
            className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden max-w-sm w-full shadow-2xl relative flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between text-white">
              <div className="min-w-0 pr-2">
                <h3 className="font-heading font-black text-sm sm:text-base truncate">
                  {previewVideo.influencer_name}
                </h3>
                {previewVideo.influencer_handle && (
                  <p className="text-xs text-[#e32f8c] font-bold">{previewVideo.influencer_handle}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setPreviewVideo(null)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer shrink-0"
              >
                <X size={18} />
              </button>
            </div>

            {/* Video Player */}
            <div className="relative aspect-[9/16] bg-black w-full flex items-center justify-center overflow-hidden">
              <video
                src={previewVideo.video_url}
                controls
                autoPlay
                playsInline
                className="w-full h-full object-contain"
              />
            </div>

            {/* Modal Footer */}
            <div className="p-3.5 bg-slate-950 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
              <span className={`inline-flex items-center gap-1 font-bold ${previewVideo.is_active ? 'text-emerald-400' : 'text-slate-400'}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${previewVideo.is_active ? 'bg-emerald-400' : 'bg-slate-500'}`} />
                {previewVideo.is_active ? 'Activ pe prima pagină' : 'Inactiv pe prima pagină'}
              </span>
              <button
                type="button"
                onClick={() => setPreviewVideo(null)}
                className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg font-bold transition-colors cursor-pointer"
              >
                Închide
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ⚠️ DELETE CONFIRMATION MODAL */}
      {influencerToDelete && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
          onClick={() => setInfluencerToDelete(null)}
        >
          <div 
            className="bg-white rounded-3xl p-5 sm:p-6 max-w-sm w-full shadow-2xl border border-slate-200 space-y-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center shadow-xs">
              <AlertTriangle size={24} />
            </div>

            <div>
              <h3 className="font-heading font-black text-lg text-slate-900">Șterge Influencer</h3>
              <p className="text-xs sm:text-sm text-slate-500 mt-1 leading-relaxed">
                Ești sigur că vrei să ștergi definitiv clipul {influencerToDelete.influencer_name?.trim() ? <>cu <span className="font-black text-slate-900">{influencerToDelete.influencer_name}</span></> : <span className="font-black text-slate-900">Clip #{influencerToDelete.display_order}</span>}? Fișierul video va fi eliminat din storage.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setInfluencerToDelete(null)}
                className="px-4 py-2.5 font-bold text-xs sm:text-sm text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
              >
                Anulează
              </button>
              <button
                type="button"
                onClick={() => handleDelete(influencerToDelete)}
                className="px-4 py-2.5 font-black text-xs sm:text-sm text-white bg-red-600 hover:bg-red-700 active:scale-95 rounded-xl transition-all flex items-center gap-1.5 shadow-sm shadow-red-500/20 cursor-pointer"
              >
                <Trash2 size={15} />
                <span>Șterge Definitiv</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
