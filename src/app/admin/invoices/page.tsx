"use client";

import { useState, useEffect, useMemo, useRef } from 'react';
import { 
  FileText, 
  Download, 
  Search, 
  Calendar, 
  Filter, 
  Check, 
  ExternalLink,
  RefreshCw,
  Send,
  Building2,
  AlertCircle,
  CheckCircle2,
  Copy,
  ChevronDown,
  ChevronUp,
  FileSpreadsheet,
  FileCode,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import { emitOblioInvoiceAction } from '@/app/actions/invoices';
import toast from 'react-hot-toast';

const MONTHS_RO = [
  { value: 'all', label: 'Toate lunile' },
  { value: '0', label: 'Ianuarie' },
  { value: '1', label: 'Februarie' },
  { value: '2', label: 'Martie' },
  { value: '3', label: 'Aprilie' },
  { value: '4', label: 'Mai' },
  { value: '5', label: 'Iunie' },
  { value: '6', label: 'Iulie' },
  { value: '7', label: 'August' },
  { value: '8', label: 'Septembrie' },
  { value: '9', label: 'Octombrie' },
  { value: '10', label: 'Noiembrie' },
  { value: '11', label: 'Decembrie' },
];

function ModernSelect({
  label,
  value,
  options,
  onChange,
  icon: Icon,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (val: string) => void;
  icon?: any;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const selectedOption = options.find((o) => o.value === value) || options[0];

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 bg-slate-50 hover:bg-slate-100/90 active:bg-slate-200/60 border rounded-xl px-3 py-2 text-xs transition-all cursor-pointer shadow-2xs group ${
          isOpen ? 'border-[#e32f8c] ring-2 ring-[#e32f8c]/15 bg-white' : 'border-slate-200 hover:border-slate-300'
        }`}
      >
        {Icon && <Icon size={13} className="text-[#008ba3] shrink-0" />}
        <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
          {label}:
        </span>
        <span className="font-bold text-slate-800 text-xs truncate max-w-[130px]">
          {selectedOption ? selectedOption.label : value}
        </span>
        <ChevronDown
          size={13}
          className={`text-slate-400 transition-transform duration-200 ml-0.5 ${
            isOpen ? 'rotate-180 text-[#e32f8c]' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute top-full mt-1.5 left-0 z-50 min-w-[170px] max-h-64 overflow-y-auto bg-white border border-slate-200/90 rounded-2xl shadow-xl p-1.5 animate-in fade-in slide-in-from-top-1 duration-150 custom-scrollbar">
          {options.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-colors flex items-center justify-between gap-2 cursor-pointer ${
                  isSelected
                    ? 'bg-[#e32f8c]/15 text-[#008ba3] font-black'
                    : 'text-slate-700 hover:bg-slate-50 hover:text-slate-950'
                }`}
              >
                <span className="truncate">{opt.label}</span>
                {isSelected && <Check size={13} className="text-[#008ba3] shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function InvoicesPage() {
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [filterType, setFilterType] = useState('all');
  const [selectedYear, setSelectedYear] = useState('all');
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
  const [showOblioGuide, setShowOblioGuide] = useState(false);

  // Oblio Integration State
  const [oblioStatus, setOblioStatus] = useState<{
    configured: boolean;
    cif?: string | null;
    series?: string;
    connected?: boolean;
    companyName?: string | null;
    connectionError?: string | null;
  }>({ configured: false });

  const [emittingOblio, setEmittingOblio] = useState<Record<string, boolean>>({});

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [ordersData, oblioData] = await Promise.all([
        fetch('/api/admin/data?action=orders').then(r => r.json()).then(j => j.data),
        fetch('/api/admin/data?action=oblio-status').then(r => r.json()).then(j => j.data)
      ]);

      setOrders(ordersData || []);
      if (oblioData && oblioData.success) {
        setOblioStatus({
          configured: Boolean(oblioData.configured),
          cif: oblioData.cif,
          series: oblioData.series,
          connected: oblioData.connected,
          companyName: oblioData.companyName,
          connectionError: oblioData.connectionError,
        });
      }
    } catch (err: any) {
      console.error('Error loading invoices data:', err);
      toast.error('Eroare la încărcarea datelor.');
    } finally {
      setLoading(false);
    }
  };

  const isReturned = (status: string) => status === 'refunded' || status === 'returned';
  const isCancelled = (status: string) => status === 'cancelled' || status === 'anulata';

  // Toggle selection
  const handleSelectInvoice = (id: string, status: string) => {
    if (isCancelled(status)) return;
    setSelectedOrders(prev => 
      prev.includes(id) ? prev.filter(orderId => orderId !== id) : [...prev, id]
    );
  };

  // Available years dynamically extracted from orders
  const availableYears = useMemo(() => {
    const years = new Set<string>();
    orders.forEach((o: any) => {
      const d = o.rawDate ? new Date(o.rawDate) : null;
      if (d && !isNaN(d.getTime())) {
        years.add(String(d.getFullYear()));
      }
    });
    if (years.size === 0) {
      years.add(String(new Date().getFullYear()));
    }
    return Array.from(years).sort((a, b) => Number(b) - Number(a));
  }, [orders]);

  const yearOptions = useMemo(() => [
    { value: 'all', label: 'Toți Anii' },
    ...availableYears.map(y => ({ value: y, label: y }))
  ], [availableYears]);

  // Filtered invoices
  const filteredInvoices = useMemo(() => {
    return orders.filter((order: any) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || 
        (order.id && order.id.toLowerCase().includes(q)) ||
        (order.supabaseId && order.supabaseId.toLowerCase().includes(q)) ||
        (order.customer && order.customer.toLowerCase().includes(q)) ||
        (order.customerEmail && order.customerEmail.toLowerCase().includes(q)) ||
        (order.customerPhone && order.customerPhone.toLowerCase().includes(q));

      const orderDate = new Date(order.rawDate);
      const isDateValid = !isNaN(orderDate.getTime());

      let matchesDate = true;
      if (isDateValid) {
        if (selectedYear !== 'all') {
          matchesDate = matchesDate && (orderDate.getFullYear().toString() === selectedYear);
        }
        if (selectedMonth !== 'all') {
          matchesDate = matchesDate && (orderDate.getMonth().toString() === selectedMonth);
        }
        if (filterType === 'last30') {
          const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
          matchesDate = matchesDate && (orderDate.getTime() >= thirtyDaysAgo);
        } else if (filterType === 'thisYear') {
          matchesDate = matchesDate && (orderDate.getFullYear() === new Date().getFullYear());
        }
      }

      return matchesSearch && matchesDate;
    });
  }, [orders, searchQuery, filterType, selectedYear, selectedMonth]);

  // Select all state
  const selectableInvoices = filteredInvoices.filter((inv: any) => !isCancelled(inv.status));
  const isAllSelected = selectableInvoices.length > 0 && selectableInvoices.every((inv: any) => selectedOrders.includes(inv.supabaseId || inv.id));
  const isSomeSelected = selectedOrders.length > 0 && !isAllSelected;

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedOrders([]);
    } else {
      setSelectedOrders(selectableInvoices.map((inv: any) => inv.supabaseId || inv.id));
    }
  };

  const hasActiveFilters = selectedYear !== 'all' || selectedMonth !== 'all' || filterType !== 'all' || Boolean(searchQuery);

  const handleResetFilters = () => {
    setSelectedYear('all');
    setSelectedMonth('all');
    setFilterType('all');
    setSearchQuery('');
  };

  // Export CSV (Excel)
  const handleExportCsv = () => {
    const toExport = selectedOrders.length > 0 
      ? filteredInvoices.filter((inv: any) => selectedOrders.includes(inv.supabaseId || inv.id))
      : filteredInvoices.filter((inv: any) => !isCancelled(inv.status));

    if (toExport.length === 0) {
      toast.error('Nu există facturi de exportat.');
      return;
    }

    const headers = [
      'Nr. Comanda',
      'Data',
      'Client',
      'Email',
      'Telefon',
      'Oras',
      'Adresa',
      'Tara',
      'Total',
      'Moneda',
      'Metoda Plata',
      'Status Comanda',
      'Factura Oblio'
    ];

    const rows = toExport.map((o: any) => {
      const oblio = o.trackingMetadata?.oblio_invoice;
      const oblioStr = oblio ? `${oblio.seriesName} ${oblio.number}` : 'Neemisa in Oblio';
      const cleanTotal = o.totalAmount != null ? Number(o.totalAmount).toFixed(2) : ((o.total || '').replace(/[^0-9.]/g, '') || '0.00');
      return [
        `"${o.id}"`,
        `"${o.date}"`,
        `"${(o.customer || '').replace(/"/g, '""')}"`,
        `"${o.customerEmail || ''}"`,
        `"${o.customerPhone || ''}"`,
        `"${(o.addrCity || '').replace(/"/g, '""')}"`,
        `"${(o.address || '').replace(/"/g, '""')}"`,
        `"${o.addrCountry || 'RO'}"`,
        `"${cleanTotal}"`,
        `"${o.currency || 'RON'}"`,
        `"${(o.paymentMethod || 'card').toUpperCase()}"`,
        `"${o.status || 'pending'}"`,
        `"${oblioStr}"`
      ].join(',');
    });

    // Adăugăm UTF-8 BOM (\uFEFF) pentru ca Excel să deschidă corect diacriticele
    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Facturi_TrenZone_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Export realizat cu succes (${toExport.length} facturi)!`);
  };

  // Export XML
  const handleExportXml = () => {
    const toExport = selectedOrders.length > 0 
      ? filteredInvoices.filter((inv: any) => selectedOrders.includes(inv.supabaseId || inv.id))
      : filteredInvoices;

    if (toExport.length === 0) {
      toast.error('Nu există facturi de exportat.');
      return;
    }

    let xmlContent = '<?xml version="1.0" encoding="UTF-8"?>\n<Facturi>\n';
    toExport.forEach((inv: any) => {
      const safeCustomer = (inv.customer || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      xmlContent += `  <Factura>\n`;
      xmlContent += `    <ID>${inv.id}</ID>\n`;
      xmlContent += `    <Client>${safeCustomer}</Client>\n`;
      xmlContent += `    <Data>${inv.date}</Data>\n`;
      xmlContent += `    <Total>${inv.total}</Total>\n`;
      xmlContent += `    <Status>${inv.status}</Status>\n`;
      xmlContent += `  </Factura>\n`;
    });
    xmlContent += '</Facturi>';

    const blob = new Blob([xmlContent], { type: 'application/xml;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Facturi_Export_${new Date().toISOString().slice(0, 10)}.xml`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Export XML descărcat (${toExport.length} facturi)!`);
  };

  // Emit in Oblio Action
  const handleEmitOblio = async (orderId: string) => {
    if (!oblioStatus.configured) {
      setShowOblioGuide(true);
      toast.error('Oblio nu este încă configurat. Consultă instrucțiunile de configurare de mai jos.');
      return;
    }

    setEmittingOblio(prev => ({ ...prev, [orderId]: true }));
    const toastId = toast.loading('Se emite factura în Oblio și se transmite la SPV...');

    try {
      const res = await emitOblioInvoiceAction(orderId);
      if (res.success) {
        toast.success(`Factura ${res.seriesName} ${res.number} a fost emisă și transmisă în SPV!`, { id: toastId });
        await loadData();
      } else {
        toast.error(res.error || 'Eroare la emiterea în Oblio.', { id: toastId });
      }
    } catch (err: any) {
      toast.error(err.message || 'Eroare necunoscută.', { id: toastId });
    } finally {
      setEmittingOblio(prev => ({ ...prev, [orderId]: false }));
    }
  };

  // Bulk Emit in Oblio Action
  const handleBulkEmitOblio = async () => {
    if (!oblioStatus.configured) {
      setShowOblioGuide(true);
      toast.error('Oblio nu este încă configurat. Consultă ghidul de mai sus.');
      return;
    }

    const toEmit = filteredInvoices.filter((inv: any) => 
      selectedOrders.includes(inv.supabaseId || inv.id) && !(inv.trackingMetadata?.oblio_invoice || inv.oblioInvoice)
    );

    if (toEmit.length === 0) {
      toast.error('Facturile selectate au fost deja emise în Oblio.');
      return;
    }

    const toastId = toast.loading(`Se emit ${toEmit.length} facturi în Oblio & SPV...`);
    let successCount = 0;

    for (const inv of toEmit) {
      const id = inv.supabaseId || inv.id;
      setEmittingOblio(prev => ({ ...prev, [id]: true }));
      try {
        const res = await emitOblioInvoiceAction(id);
        if (res.success) successCount++;
      } catch (err) {
        console.error(err);
      } finally {
        setEmittingOblio(prev => ({ ...prev, [id]: false }));
      }
      
      // 30 secunde intre fiecare factura - zero sansa de limitare Oblio
      if (toEmit.indexOf(inv) + 1 < toEmit.length) {
        const processedCount = toEmit.indexOf(inv) + 1;
        toast.loading(`⏳ [${processedCount}/${toEmit.length}] Așteptăm 30s...`, { id: toastId });
        await new Promise(r => setTimeout(r, 30000));
      }
    }

    toast.success(`${successCount} facturi emise și transmise cu succes în SPV!`, { id: toastId });
    await loadData();
  };

  return (
    <div className="space-y-6 pb-12 text-slate-900 max-w-full">
      {/* 🏁 HEADER & METRICS */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <FileText className="text-[#e32f8c]" size={24} /> Facturi Fiscale
            </h1>
            <span className="text-xs font-black bg-[#e32f8c]/10 text-[#009bb3] px-2.5 py-0.5 rounded-full">
              {orders.length} facturi
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl">
            Gestionarea și descărcarea facturilor PDF, export contabil și sincronizare automată e-Factura (ANAF SPV) prin Oblio.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button 
            onClick={loadData}
            disabled={loading}
            className="w-full sm:w-auto h-9 px-3.5 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-all flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            <span>Reîmprospătează</span>
          </button>
        </div>
      </div>

      {/* 🇷🇴 OBLIO & SPV BANNER */}
      <div className={`p-4 sm:p-5 rounded-2xl border transition-all ${
        oblioStatus.configured 
          ? 'bg-emerald-50/40 border-emerald-200' 
          : 'bg-amber-50/50 border-amber-200'
      }`}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-start sm:items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              oblioStatus.configured ? 'bg-emerald-600 text-white' : 'bg-amber-500 text-white'
            }`}>
              <Building2 size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black text-slate-900">Integrare Oblio & ANAF e-Factura (SPV)</h3>
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${
                  oblioStatus.connected 
                    ? 'bg-emerald-100 text-emerald-800'
                    : oblioStatus.configured 
                      ? 'bg-blue-100 text-blue-800' 
                      : 'bg-amber-200/80 text-amber-900'
                }`}>
                  {oblioStatus.connected 
                    ? `API Activ (${oblioStatus.companyName || 'Conectat'})`
                    : oblioStatus.configured 
                      ? 'Configurat' 
                      : 'Neconfigurat'}
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-0.5">
                {oblioStatus.configured 
                  ? `Facturile se emit direct în contul Oblio (Serie: ${oblioStatus.series}, CIF: ${oblioStatus.cif}) și se transmit automat în SPV.`
                  : 'Pentru a trimite automat facturile în SPV, conectează cheile API Oblio în fișierul de configurare.'}
                {oblioStatus.connectionError && (
                  <span className="text-red-500 block text-[11px] mt-0.5 font-medium">
                    Notă conexiune: {oblioStatus.connectionError}
                  </span>
                )}
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowOblioGuide(!showOblioGuide)}
            className="text-xs font-black text-[#009bb3] hover:underline flex items-center gap-1 shrink-0 self-end sm:self-center cursor-pointer"
          >
            <span>{showOblioGuide ? 'Ascunde instrucțiunile' : 'Cum conectez la Oblio & SPV?'}</span>
            {showOblioGuide ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>

        {/* Oblio Step-by-Step Instructions */}
        <AnimatePresence>
          {showOblioGuide && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="mt-4 pt-4 border-t border-slate-200/80 text-xs text-slate-700 space-y-3 overflow-hidden"
            >
              <div className="font-bold text-slate-900">Pași simpli pentru trimitere automată în SPV prin Oblio:</div>
              <ol className="list-decimal list-inside space-y-1.5 leading-relaxed text-slate-600">
                <li>Creează un cont pe <a href="https://www.oblio.eu" target="_blank" rel="noopener noreferrer" className="text-blue-600 font-bold hover:underline">Oblio.eu</a> și adaugă datele firmei tale (CUI, Serie facturi, ex. <code>ODIN</code>).</li>
                <li>În Oblio, intră la <strong>Setări &rarr; e-Factura / SPV</strong> și conectează certificatul digital ANAF (bifează <em>„Trimite automat facturile în SPV”</em>).</li>
                <li>Generează o cheie secretă API: <strong>Setări &rarr; Date cont &rarr; API &rarr; Adaugă secret API</strong>.</li>
                <li>Adaugă următoarele variabile în <code>.env.local</code> pe server / Vercel:
                  <div className="bg-slate-900 text-slate-100 font-mono text-[11px] p-3 rounded-xl mt-2 select-all leading-relaxed">
                    OBLIO_EMAIL=email_cont_oblio@tau.ro<br />
                    OBLIO_SECRET=secret_api_generat_din_oblio<br />
                    OBLIO_CIF=RO12345678<br />
                    OBLIO_SERIES_NAME=ODIN
                  </div>
                </li>
                <li>După adăugare, la fiecare apăsare a butonului <strong>„Emite în Oblio”</strong>, factura este creată instant în Oblio și <strong>pleacă automat către ANAF SPV</strong>!</li>
              </ol>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 🔍 SEARCH AND FILTERS (LUNĂ, AN, INTERVAL, EXPORTURI) */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        {/* Search input */}
        <div className="relative w-full lg:max-w-xs xl:max-w-sm">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input 
            type="text" 
            placeholder="Caută după comandă (TZ), nume, email, tel..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-10 pr-4 text-xs sm:text-sm font-medium focus:outline-none focus:border-[#e32f8c] focus:bg-white transition-all placeholder:text-slate-400"
          />
        </div>

        {/* Filters (An, Lună, Preset, Reset) & Exports */}
        <div className="flex flex-wrap items-center gap-2 justify-start lg:justify-end">
          {/* Selector An */}
          <ModernSelect 
            label="An"
            value={selectedYear}
            options={yearOptions}
            onChange={(val) => setSelectedYear(val)}
            icon={Calendar}
          />

          {/* Selector Lună */}
          <ModernSelect 
            label="Lună"
            value={selectedMonth}
            options={MONTHS_RO}
            onChange={(val) => setSelectedMonth(val)}
            icon={Calendar}
          />

          {/* Reset Filters button */}
          {hasActiveFilters && (
            <button
              onClick={handleResetFilters}
              className="h-9 px-2.5 text-xs font-bold text-red-500 hover:text-red-700 bg-red-50/70 hover:bg-red-100/70 border border-red-200 rounded-xl transition-all flex items-center gap-1 cursor-pointer"
              title="Resetează toate filtrele"
            >
              <X size={13} />
              <span>Resetează</span>
            </button>
          )}

          <div className="hidden sm:block w-px h-6 bg-slate-200 mx-0.5" />

          {/* Export CSV (Excel) */}
          <button 
            onClick={handleExportCsv}
            className="h-9 px-3.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 shadow-sm shadow-emerald-600/20 cursor-pointer"
            title="Exportă în format Excel / CSV pentru contabilitate"
          >
            <FileSpreadsheet size={14} />
            <span>Export Excel {selectedOrders.length > 0 ? `(${selectedOrders.length})` : '(Toate)'}</span>
          </button>

          {/* Export XML */}
          <button 
            onClick={handleExportXml}
            className="h-9 px-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
            title="Exportă în format XML"
          >
            <FileCode size={14} />
            <span>Export XML</span>
          </button>
        </div>
      </div>

      {/* 🔘 SELECT ALL & BULK ACTIONS TOOLBAR */}
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleToggleSelectAll}
            className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all shrink-0 cursor-pointer ${
              isAllSelected 
                ? 'bg-[#e32f8c] border-[#e32f8c] text-slate-950' 
                : isSomeSelected
                  ? 'bg-[#e32f8c]/20 border-[#e32f8c] text-[#009bb3]'
                  : 'border-slate-300 bg-white hover:border-slate-400'
            }`}
            title="Selectează / Deselectează toate facturile"
          >
            {isAllSelected && <Check size={13} strokeWidth={3} />}
            {isSomeSelected && <div className="w-2.5 h-0.5 bg-[#009bb3] rounded" />}
          </button>

          <span 
            onClick={handleToggleSelectAll}
            className="text-xs sm:text-sm font-black text-slate-800 cursor-pointer select-none hover:text-slate-950 transition-colors"
          >
            Selectează Toate ({selectableInvoices.length} facturi active)
          </span>

          {selectedOrders.length > 0 && (
            <span className="text-xs font-bold text-emerald-800 bg-emerald-100/80 border border-emerald-200 px-2.5 py-0.5 rounded-full">
              {selectedOrders.length} selectate
            </span>
          )}
        </div>

        {selectedOrders.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap self-end sm:self-auto">
            <button
              onClick={() => setSelectedOrders([])}
              className="text-xs font-bold text-slate-500 hover:text-slate-800 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Deselectează
            </button>

            <button
              onClick={handleExportCsv}
              className="h-8 sm:h-9 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
              title="Exportă facturile selectate în Excel"
            >
              <FileSpreadsheet size={13} />
              <span>Exportă Excel ({selectedOrders.length})</span>
            </button>

            <button
              onClick={handleBulkEmitOblio}
              className="h-8 sm:h-9 px-3 bg-[#e32f8c] hover:bg-[#00bad9] text-slate-950 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
              title="Emite facturile selectate în Oblio și trimite în SPV"
            >
              <Send size={13} />
              <span>Emite în Oblio ({selectedOrders.length})</span>
            </button>
          </div>
        )}
      </div>

      {/* 📄 INVOICES CARD LIST (Zero Horizontal Scroll!) */}
      <div className="space-y-3 sm:space-y-4">
        {loading ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center space-y-3">
            <RefreshCw size={24} className="mx-auto text-slate-400 animate-spin" />
            <p className="text-xs sm:text-sm font-bold text-slate-600">Se încarcă facturile...</p>
          </div>
        ) : filteredInvoices.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-2">
            <FileText size={32} className="mx-auto text-slate-300" />
            <h3 className="text-sm sm:text-base font-black text-slate-800">Nicio factură găsită</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {searchQuery ? 'Nu am găsit nicio factură conform căutării tale.' : 'Comenzile plasate în magazin vor apărea automat aici.'}
            </p>
          </div>
        ) : (
          filteredInvoices.map((inv) => {
            const isSelected = selectedOrders.includes(inv.supabaseId || inv.id);
            const oblioInfo = inv.trackingMetadata?.oblio_invoice || inv.oblioInvoice;
            const targetOrderId = inv.supabaseId || inv.id;
            const isEmitting = emittingOblio[targetOrderId];

            return (
              <div 
                key={inv.id}
                className={`bg-white rounded-2xl border transition-all p-4 sm:p-5 flex flex-col gap-3.5 relative overflow-hidden shadow-xs hover:shadow-md ${
                  isSelected ? 'border-[#e32f8c] ring-1 ring-[#e32f8c]' : 'border-slate-200/90'
                } ${isCancelled(inv.status) ? 'opacity-50 grayscale hover:grayscale-0' : ''}`}
              >
                {/* 1. TOP BAR */}
                <div className="flex flex-wrap items-center justify-between gap-2.5">
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Checkbox */}
                    <button
                      type="button"
                      disabled={isCancelled(inv.status)}
                      onClick={() => handleSelectInvoice(targetOrderId, inv.status)}
                      className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                        isSelected 
                          ? 'bg-[#e32f8c] border-[#e32f8c] text-slate-950' 
                          : isCancelled(inv.status)
                            ? 'bg-slate-100 border-slate-200 cursor-not-allowed opacity-50'
                            : 'border-slate-300 bg-white hover:border-slate-400'
                      }`}
                    >
                      {isSelected && <Check size={13} strokeWidth={3} />}
                    </button>

                    {/* Order ID Badge */}
                    <span className="font-mono text-xs font-black text-slate-900 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200 flex items-center gap-1.5">
                      <FileText size={12} className="text-slate-500" />
                      <span>{inv.id}</span>
                    </span>

                    {/* Total Amount */}
                    <span className="text-xs font-black text-slate-900 bg-slate-100/90 border border-slate-200 px-2.5 py-1 rounded-lg">
                      {inv.total}
                    </span>

                    {/* Status Badge */}
                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md border shrink-0 ${
                      inv.status === 'delivered' 
                        ? 'text-emerald-800 bg-emerald-100 border-emerald-300'
                        : inv.status === 'returned' || inv.status === 'refunded'
                          ? 'text-red-700 bg-red-100 border-red-200'
                          : 'text-[#009bb3] bg-[#e32f8c]/10 border-[#e32f8c]/30'
                    }`}>
                      {inv.status}
                    </span>
                  </div>

                  {/* Date & Time */}
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 ml-auto sm:ml-0">
                    <Calendar size={13} className="text-slate-400" />
                    <span>{inv.date}</span>
                  </div>
                </div>

                {/* 2. CLIENT & DETAILS ROW */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3.5 bg-slate-50/70 rounded-xl border border-slate-100 text-xs">
                  <div>
                    <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider block mb-0.5">Destinatar</span>
                    <p className="font-bold text-slate-900">{inv.customer}</p>
                    <p className="text-slate-500 truncate">{inv.customerEmail}</p>
                    {inv.customerPhone && <p className="text-slate-500">{inv.customerPhone}</p>}
                  </div>

                  <div>
                    <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider block mb-0.5">Adresă Facturare</span>
                    <p className="text-slate-700 leading-relaxed truncate">{inv.address || 'N/A'}</p>
                    <p className="text-slate-500">{inv.addrCity || ''}, {inv.addrCountry || 'RO'}</p>
                  </div>

                  <div>
                    <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider block mb-0.5">e-Factura SPV & Oblio</span>
                    {oblioInfo ? (
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-emerald-800 font-bold bg-emerald-100/80 px-2 py-0.5 rounded border border-emerald-300 w-fit">
                          <CheckCircle2 size={12} />
                          <span>Emisă: {oblioInfo.seriesName} {oblioInfo.number}</span>
                        </div>
                        <p className="text-[11px] text-emerald-700 font-medium">
                          ✓ Transmisă automat în ANAF SPV
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <span className="text-slate-400 text-[11px]">Neemisă încă în Oblio</span>
                        <p className="text-[10px] text-slate-500">Poate fi trimisă cu 1-click în SPV.</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* 3. ACTION FOOTER */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
                  {/* Left: Oblio Status / Link */}
                  <div>
                    {oblioInfo?.link ? (
                      <a 
                        href={oblioInfo.link} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-xs font-bold text-emerald-700 hover:text-emerald-900 flex items-center gap-1 underline"
                      >
                        <ExternalLink size={12} /> Vezi Factura în Oblio
                      </a>
                    ) : null}
                  </div>

                  {/* Right Actions */}
                  <div className="flex items-center gap-2 ml-auto">
                    {/* Internal PDF Download */}
                    <a 
                      href={`/api/admin/orders/${targetOrderId}/invoice`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="h-8 sm:h-9 px-3 sm:px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer"
                    >
                      <Download size={13} />
                      <span>Factură PDF</span>
                    </a>

                    {/* Emit to Oblio & SPV Button */}
                    {!isCancelled(inv.status) && (
                      <button
                        onClick={() => handleEmitOblio(targetOrderId)}
                        disabled={isEmitting}
                        className={`h-8 sm:h-9 px-3.5 sm:px-4 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                          oblioInfo 
                            ? 'bg-slate-800 hover:bg-slate-700 text-white shadow-xs'
                            : 'bg-[#e32f8c] hover:bg-[#00bad9] active:scale-95 text-slate-950 shadow-md shadow-[#e32f8c]/20'
                        }`}
                      >
                        <Send size={13} className={isEmitting ? 'animate-spin' : ''} />
                        <span>
                          {isEmitting 
                            ? 'Se trimite în SPV...' 
                            : oblioInfo 
                              ? 'Re-emite în Oblio' 
                              : 'Emite în Oblio (SPV)'}
                        </span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
