"use client";

import { useState, useEffect, useMemo } from 'react';
import { 
  Search, 
  Loader2, 
  Edit2, 
  Trash2, 
  Save, 
  X, 
  AlertTriangle, 
  Plus, 
  Users, 
  ShoppingBag, 
  DollarSign, 
  Award, 
  Phone, 
  Mail, 
  MapPin, 
  ExternalLink, 
  MessageCircle,
  Copy,
  Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { 
  deleteAdminCustomer, 
  updateAdminCustomer, 
  createAdminCustomer 
} from '@/app/actions/admin-data';
import toast from 'react-hot-toast';

export default function CustomersPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<'all' | 'buyers' | 'vip' | 'leads'>('all');
  const [copiedPhone, setCopiedPhone] = useState<string | null>(null);

  // Edit State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<{ 
    email: string; 
    name: string; 
    phone: string; 
    city: string; 
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [originalEmail, setOriginalEmail] = useState<string | null>(null);

  // Add New Customer State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newCustomer, setNewCustomer] = useState({
    name: '',
    email: '',
    phone: '',
    city: ''
  });
  const [isAdding, setIsAdding] = useState(false);

  // Delete Confirmation State
  const [customerToDelete, setCustomerToDelete] = useState<{ email: string; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/data?action=customers', { cache: 'no-store' });
      const json = await res.json();
      const data = json.data || [];
      const mapped = data.map((c: any) => ({
        id: c.id || c.email,
        name: `${c.first_name || ''} ${c.last_name || ''}`.trim() || 'Fără nume',
        email: c.email || 'N/A',
        phone: c.phone || '',
        city: c.city || '',
        county: c.county || '',
        country: c.country || 'RO',
        orders: c.orders || 0,
        spent: c.spent > 0 ? `${c.spent.toFixed(2)} RON` : '0 RON',
        spentNum: c.spent || 0,
        lastActive: c.created_at ? new Date(c.created_at).toLocaleDateString('ro-RO') : 'N/A',
        isSubscriberOnly: !!c.is_subscriber_only
      }));
      setCustomers(mapped);
    } catch (err) {
      console.error(err);
      toast.error("Eroare la încărcarea listei de clienți.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  // Copy phone handler
  const handleCopyPhone = (e: React.MouseEvent, phone: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(phone);
    setCopiedPhone(phone);
    toast.success("Număr de telefon copiat!");
    setTimeout(() => setCopiedPhone(null), 2000);
  };

  // Delete Handlers
  const handleDeleteClick = (e: React.MouseEvent, customer: any) => {
    e.stopPropagation();
    setCustomerToDelete({ email: customer.email, name: customer.name });
  };

  const handleConfirmDelete = async () => {
    if (!customerToDelete) return;
    setIsDeleting(true);
    try {
      await deleteAdminCustomer(customerToDelete.email);
      toast.success(`Clientul ${customerToDelete.email} a fost șters cu succes.`);
      setCustomerToDelete(null);
      await fetchCustomers();
    } catch (e: any) {
      toast.error("Eroare la ștergere: " + (e?.message || 'Eroare neașteptată'));
    } finally {
      setIsDeleting(false);
    }
  };

  // Edit Handlers
  const openEditModal = (e: React.MouseEvent, customer: any) => {
    e.stopPropagation();
    setOriginalEmail(customer.email);
    setEditingCustomer({
      email: customer.email,
      name: customer.name,
      phone: customer.phone || '',
      city: customer.city || ''
    });
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCustomer || !originalEmail) return;

    setIsSubmitting(true);
    try {
      await updateAdminCustomer(originalEmail, {
        name: editingCustomer.name,
        email: editingCustomer.email,
        phone: editingCustomer.phone,
        city: editingCustomer.city
      });
      toast.success('Datele clientului au fost actualizate!');
      setIsEditModalOpen(false);
      setEditingCustomer(null);
      setOriginalEmail(null);
      fetchCustomers();
    } catch (err: any) {
      toast.error("A apărut o eroare la salvare: " + (err?.message || 'Eroare'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Add Customer Handlers
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomer.name || !newCustomer.email) {
      toast.error("Numele și adresa de email sunt obligatorii.");
      return;
    }

    setIsAdding(true);
    try {
      await createAdminCustomer(newCustomer);
      toast.success("Clientul a fost adăugat cu succes!");
      setIsAddModalOpen(false);
      setNewCustomer({ name: '', email: '', phone: '', city: '' });
      fetchCustomers();
    } catch (err: any) {
      toast.error("Eroare la adăugarea clientului: " + (err?.message || 'Eroare'));
    } finally {
      setIsAdding(false);
    }
  };

  // Filtering Logic
  const filteredCustomers = useMemo(() => {
    return customers.filter(c => {
      const q = searchQuery.toLowerCase();
      const matchesSearch = 
        c.name.toLowerCase().includes(q) || 
        c.email.toLowerCase().includes(q) ||
        (c.phone && c.phone.toLowerCase().includes(q)) ||
        (c.city && c.city.toLowerCase().includes(q));
      
      let matchesFilter = true;
      if (filterType === 'buyers') matchesFilter = c.orders > 0;
      if (filterType === 'vip') matchesFilter = c.spentNum > 500;
      if (filterType === 'leads') matchesFilter = c.orders === 0;

      return matchesSearch && matchesFilter;
    });
  }, [customers, searchQuery, filterType]);

  // Key KPI Metrics
  const metrics = useMemo(() => {
    const total = customers.length;
    const buyers = customers.filter(c => c.orders > 0);
    const buyersCount = buyers.length;
    const vipCount = customers.filter(c => c.spentNum > 500).length;
    const leadsCount = customers.filter(c => c.orders === 0).length;
    
    const totalRevenue = customers.reduce((sum, c) => sum + c.spentNum, 0);
    const avgSpent = buyersCount > 0 ? (totalRevenue / buyersCount) : 0;

    return {
      total,
      buyersCount,
      vipCount,
      leadsCount,
      totalRevenue: totalRevenue.toFixed(2),
      avgSpent: avgSpent.toFixed(2)
    };
  }, [customers]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-[#e32f8c]" />
      </div>
    );
  }

  return (
    <div className="animate-in fade-in zoom-in-95 duration-700 pb-12 text-slate-900 max-w-6xl mx-auto space-y-6">
      
      {/* 🏁 HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl tracking-tight font-black text-slate-900">Clienți</h1>
          <p className="text-sm text-slate-500 mt-1">
            Gestionează profilurile clienților, istoricul comenzilor și datele de contact.
          </p>
        </div>
        <button 
          onClick={() => setIsAddModalOpen(true)}
          className="h-11 px-5 bg-[#e32f8c] text-black rounded-xl text-sm font-black hover:bg-[#c41a72] transition-all flex items-center gap-2 shadow-sm shrink-0"
        >
          <Plus size={18} /> Adaugă Client Nou
        </button>
      </div>

      {/* 📊 KPI METRIC CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700 shrink-0">
            <Users size={20} />
          </div>
          <div>
            <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">Total Clienți</p>
            <p className="text-xl font-black text-slate-900 leading-tight mt-0.5">{metrics.total}</p>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-green-50 text-green-600 flex items-center justify-center shrink-0">
            <ShoppingBag size={20} />
          </div>
          <div>
            <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">Cu Comenzi</p>
            <p className="text-xl font-black text-green-700 leading-tight mt-0.5">{metrics.buyersCount}</p>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Award size={20} />
          </div>
          <div>
            <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">Clienți VIP (&gt; 500 RON)</p>
            <p className="text-xl font-black text-amber-700 leading-tight mt-0.5">{metrics.vipCount}</p>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-pink-50 text-[#e32f8c] flex items-center justify-center shrink-0">
            <DollarSign size={20} />
          </div>
          <div>
            <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">Total Încasat (LTV)</p>
            <p className="text-xl font-black text-slate-900 leading-tight mt-0.5">{metrics.totalRevenue} RON</p>
          </div>
        </div>
      </div>

      {/* 🔍 SEARCH & FILTERS BAR */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Caută după nume, email, telefon sau oraș..."
            className="w-full h-10 pl-10 pr-9 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#e32f8c]"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X size={15} />
            </button>
          )}
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl shrink-0 overflow-x-auto">
          <button
            onClick={() => setFilterType('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all whitespace-nowrap ${
              filterType === 'all' 
                ? 'bg-white text-slate-900 shadow-sm' 
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Toți ({metrics.total})
          </button>
          <button
            onClick={() => setFilterType('buyers')}
            className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all whitespace-nowrap flex items-center gap-1.5 ${
              filterType === 'buyers' 
                ? 'bg-white text-green-700 shadow-sm' 
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-green-500"></span>
            Cu Comenzi ({metrics.buyersCount})
          </button>
          <button
            onClick={() => setFilterType('vip')}
            className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all whitespace-nowrap flex items-center gap-1.5 ${
              filterType === 'vip' 
                ? 'bg-white text-amber-700 shadow-sm' 
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
            VIP ({metrics.vipCount})
          </button>
          <button
            onClick={() => setFilterType('leads')}
            className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all whitespace-nowrap flex items-center gap-1.5 ${
              filterType === 'leads' 
                ? 'bg-white text-blue-700 shadow-sm' 
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-blue-400"></span>
            Prospecte ({metrics.leadsCount})
          </button>
        </div>
      </div>

      {/* 📋 CUSTOMERS TABLE */}
      <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">

        {/* 📱 MOBILE VIEW (Cards) */}
        <div className="md:hidden flex flex-col divide-y divide-slate-100">
          {filteredCustomers.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-sm font-bold">Nu au fost găsiți clienți conform filtrelor.</div>
          ) : (
            filteredCustomers.map((customer) => (
              <div key={customer.id} className="p-4 flex flex-col gap-3 bg-white hover:bg-slate-50 transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center font-black text-slate-700 text-sm shrink-0">
                      {customer.name[0]?.toUpperCase() || 'C'}
                    </div>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-sm font-black text-slate-900 leading-tight">{customer.name}</span>
                        {customer.spentNum > 500 && (
                          <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 border border-amber-200">
                            👑 VIP
                          </span>
                        )}
                        {customer.orders > 0 && customer.spentNum <= 500 && (
                          <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-md bg-green-100 text-green-700 border border-green-200">
                            ★ Activ
                          </span>
                        )}
                        {customer.orders === 0 && (
                          <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-md bg-blue-100 text-blue-700 border border-blue-200">
                            Prospect
                          </span>
                        )}
                      </div>
                      <a href={`mailto:${customer.email}`} className="text-xs text-slate-500 hover:text-[#e32f8c] font-medium mt-0.5 flex items-center gap-1">
                        <Mail size={12} /> {customer.email}
                      </a>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button 
                      onClick={(e) => openEditModal(e, customer)}
                      className="p-2 text-slate-400 hover:text-[#e32f8c] hover:bg-[#e32f8c]/10 rounded-lg transition-colors"
                      title="Editează Client"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button 
                      onClick={(e) => handleDeleteClick(e, customer)}
                      className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      title="Șterge Client"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {/* Info row */}
                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100 text-xs">
                  {customer.phone && (
                    <div className="flex items-center gap-1.5 text-slate-700 font-bold">
                      <Phone size={13} className="text-slate-400" />
                      <a href={`tel:${customer.phone}`} className="hover:text-[#e32f8c]">{customer.phone}</a>
                      <a
                        href={`https://wa.me/4${customer.phone.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-green-600 hover:text-green-700 ml-1"
                        title="Deschide WhatsApp"
                      >
                        <MessageCircle size={14} />
                      </a>
                    </div>
                  )}
                  {customer.city && (
                    <div className="flex items-center gap-1.5 text-slate-600 font-medium">
                      <MapPin size={13} className="text-slate-400 shrink-0" />
                      <span className="truncate">{customer.city}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-slate-600">{customer.orders} comenzi</span>
                    <span className="text-sm font-black text-slate-900">{customer.spent}</span>
                  </div>
                  {customer.orders > 0 && (
                    <Link
                      href={`/admin/orders?search=${encodeURIComponent(customer.email)}`}
                      className="text-xs font-bold text-[#e32f8c] hover:underline flex items-center gap-1"
                    >
                      Comenzi <ExternalLink size={12} />
                    </Link>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* 💻 DESKTOP VIEW (Table) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70">
                <th className="px-6 py-4 text-[11px] font-black text-slate-500 uppercase tracking-wider">Client</th>
                <th className="px-6 py-4 text-[11px] font-black text-slate-500 uppercase tracking-wider">Contact & Locație</th>
                <th className="px-6 py-4 text-[11px] font-black text-slate-500 uppercase tracking-wider">Comenzi</th>
                <th className="px-6 py-4 text-[11px] font-black text-slate-500 uppercase tracking-wider">Total Cheltuit</th>
                <th className="px-6 py-4 text-[11px] font-black text-slate-500 uppercase tracking-wider">Ultima Activitate</th>
                <th className="px-6 py-4 text-[11px] font-black text-slate-500 uppercase tracking-wider text-right">Acțiuni</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500 text-sm font-medium">
                    Nu a fost găsit niciun client conform filtrelor selectate.
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-slate-50/90 transition-colors">
                    {/* Client Name & Tier */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center font-black text-slate-700 text-sm shrink-0 shadow-sm">
                          {customer.name[0]?.toUpperCase() || 'C'}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-black text-slate-900 leading-tight">
                              {customer.name}
                            </span>
                            {customer.spentNum > 500 && (
                              <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 border border-amber-200">
                                👑 VIP
                              </span>
                            )}
                            {customer.orders > 0 && customer.spentNum <= 500 && (
                              <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-md bg-green-100 text-green-700 border border-green-200">
                                ★ Activ
                              </span>
                            )}
                            {customer.orders === 0 && (
                              <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-md bg-blue-100 text-blue-700 border border-blue-200">
                                Prospect
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-slate-400 font-medium mt-0.5">{customer.email}</span>
                        </div>
                      </div>
                    </td>

                    {/* Contact & Location */}
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        {customer.phone ? (
                          <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                            <Phone size={13} className="text-slate-400 shrink-0" />
                            <a href={`tel:${customer.phone}`} className="hover:text-[#e32f8c] transition-colors">
                              {customer.phone}
                            </a>
                            <button
                              onClick={(e) => handleCopyPhone(e, customer.phone)}
                              className="text-slate-400 hover:text-slate-600 transition-colors"
                              title="Copiază telefon"
                            >
                              {copiedPhone === customer.phone ? <Check size={12} className="text-green-600" /> : <Copy size={12} />}
                            </button>
                            <a
                              href={`https://wa.me/4${customer.phone.replace(/\D/g, '')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-green-600 hover:text-green-700 transition-colors"
                              title="Mesaj WhatsApp"
                            >
                              <MessageCircle size={14} />
                            </a>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 italic">Fără telefon</span>
                        )}
                        {customer.city && (
                          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                            <MapPin size={12} className="text-slate-400 shrink-0" />
                            <span className="truncate max-w-[160px]">{customer.city}</span>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Orders */}
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-slate-900">{customer.orders} comenzi</span>
                        {customer.orders > 0 && (
                          <Link 
                            href={`/admin/orders?search=${encodeURIComponent(customer.email)}`}
                            className="text-xs font-bold text-[#e32f8c] hover:underline inline-flex items-center gap-1 mt-0.5"
                          >
                            Vezi comenzi <ExternalLink size={11} />
                          </Link>
                        )}
                      </div>
                    </td>

                    {/* Spent */}
                    <td className="px-6 py-4">
                      <span className="text-sm font-black text-slate-900">{customer.spent}</span>
                    </td>

                    {/* Last Active */}
                    <td className="px-6 py-4">
                      <span className="text-xs font-bold text-slate-500">{customer.lastActive}</span>
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button 
                          onClick={(e) => openEditModal(e, customer)}
                          className="h-9 px-3 rounded-lg bg-slate-100 hover:bg-[#e32f8c] hover:text-black text-slate-700 text-xs font-black flex items-center gap-1.5 transition-colors shadow-sm"
                          title="Editează datele clientului"
                        >
                          <Edit2 size={13} /> Editează
                        </button>
                        <button 
                          onClick={(e) => handleDeleteClick(e, customer)}
                          className="h-9 w-9 rounded-lg inline-flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                          title="Șterge client"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ✏️ EDIT MODAL */}
      <AnimatePresence>
        {isEditModalOpen && editingCustomer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#e32f8c]/10 flex items-center justify-center text-[#e32f8c]">
                    <Edit2 size={20} />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-900">Editează Client</h3>
                    <p className="text-xs font-bold text-slate-500 mt-0.5">Modifică datele de contact și identificare.</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsEditModalOpen(false)}
                  className="p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-700 rounded-xl transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              
              <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Nume Complet</label>
                  <input
                    type="text"
                    required
                    value={editingCustomer.name}
                    onChange={(e) => setEditingCustomer({...editingCustomer, name: e.target.value})}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:border-[#e32f8c] transition-all"
                    placeholder="ex: Andrei Popescu"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Adresă Email</label>
                  <input
                    type="email"
                    required
                    value={editingCustomer.email}
                    onChange={(e) => setEditingCustomer({...editingCustomer, email: e.target.value})}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:border-[#e32f8c] transition-all"
                    placeholder="email@exemplu.ro"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">Dacă schimbi email-ul, toate comenzile din istoric vor fi reasociate automat.</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Telefon</label>
                    <input
                      type="tel"
                      value={editingCustomer.phone}
                      onChange={(e) => setEditingCustomer({...editingCustomer, phone: e.target.value})}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:border-[#e32f8c] transition-all"
                      placeholder="07xxxxxxxx"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Oraș</label>
                    <input
                      type="text"
                      value={editingCustomer.city}
                      onChange={(e) => setEditingCustomer({...editingCustomer, city: e.target.value})}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:border-[#e32f8c] transition-all"
                      placeholder="ex: București"
                    />
                  </div>
                </div>

                <div className="pt-3">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full px-6 py-3.5 bg-[#e32f8c] text-black font-black text-sm rounded-xl hover:bg-[#c41a72] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <><Loader2 size={18} className="animate-spin" /> Se salvează...</>
                    ) : (
                      <><Save size={18} /> Salvează Modificările</>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ➕ ADD NEW CUSTOMER MODAL */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#e32f8c]/10 flex items-center justify-center text-[#e32f8c]">
                    <Plus size={20} />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-900">Adaugă Client Nou</h3>
                    <p className="text-xs font-bold text-slate-500 mt-0.5">Înregistrează un client nou în baza de date.</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsAddModalOpen(false)}
                  className="p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-700 rounded-xl transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              
              <form onSubmit={handleAddSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Nume Complet *</label>
                  <input
                    type="text"
                    required
                    value={newCustomer.name}
                    onChange={(e) => setNewCustomer({...newCustomer, name: e.target.value})}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:border-[#e32f8c] transition-all"
                    placeholder="ex: Cristian Mureșan"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Adresă Email *</label>
                  <input
                    type="email"
                    required
                    value={newCustomer.email}
                    onChange={(e) => setNewCustomer({...newCustomer, email: e.target.value})}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:border-[#e32f8c] transition-all"
                    placeholder="email@exemplu.ro"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Telefon</label>
                    <input
                      type="tel"
                      value={newCustomer.phone}
                      onChange={(e) => setNewCustomer({...newCustomer, phone: e.target.value})}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:border-[#e32f8c] transition-all"
                      placeholder="07xxxxxxxx"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Oraș</label>
                    <input
                      type="text"
                      value={newCustomer.city}
                      onChange={(e) => setNewCustomer({...newCustomer, city: e.target.value})}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:border-[#e32f8c] transition-all"
                      placeholder="ex: Cluj-Napoca"
                    />
                  </div>
                </div>

                <div className="pt-3">
                  <button
                    type="submit"
                    disabled={isAdding}
                    className="w-full px-6 py-3.5 bg-[#e32f8c] text-black font-black text-sm rounded-xl hover:bg-[#c41a72] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isAdding ? (
                      <><Loader2 size={18} className="animate-spin" /> Se creează...</>
                    ) : (
                      <><Plus size={18} /> Înregistrează Client</>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 🗑️ DELETE CONFIRMATION MODAL */}
      <AnimatePresence>
        {customerToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl p-6"
            >
              <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mb-4">
                <AlertTriangle size={24} />
              </div>
              <h3 className="text-lg font-black text-slate-900">Ștergi Clientul?</h3>
              <p className="text-sm text-slate-500 mt-2 leading-relaxed">
                Ești sigur că vrei să elimini profilul clientului <strong className="text-slate-800">{customerToDelete.email}</strong>?
              </p>
              <div className="mt-6 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setCustomerToDelete(null)}
                  disabled={isDeleting}
                  className="flex-1 py-3 px-4 rounded-xl border border-slate-200 text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
                >
                  Anulează
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  disabled={isDeleting}
                  className="flex-1 py-3 px-4 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isDeleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                  Șterge Definitiv
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
