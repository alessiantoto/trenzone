export function normalizeCityName(name: string | null | undefined): string {
  if (!name || !name.trim()) return 'Nespecificat';
  
  // 1. Remove diacritics for clean comparison
  const stripped = name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
  
  // 2. Standard canonical mapping for common Romanian & European cities
  const CANONICAL_CITIES: Record<string, string> = {
    'bucuresti': 'București',
    'sector 1': 'București (Sec. 1)',
    'sector 2': 'București (Sec. 2)',
    'sector 3': 'București (Sec. 3)',
    'sector 4': 'București (Sec. 4)',
    'sector 5': 'București (Sec. 5)',
    'sector 6': 'București (Sec. 6)',
    'cluj': 'Cluj-Napoca',
    'cluj-napoca': 'Cluj-Napoca',
    'cluj napoca': 'Cluj-Napoca',
    'timisoara': 'Timișoara',
    'iasi': 'Iași',
    'brasov': 'Brașov',
    'constanta': 'Constanța',
    'craiova': 'Craiova',
    'galati': 'Galați',
    'ploiesti': 'Ploiești',
    'oradea': 'Oradea',
    'braila': 'Brăila',
    'arad': 'Arad',
    'pitesti': 'Pitești',
    'sibiu': 'Sibiu',
    'bacau': 'Bacău',
    'targu mures': 'Târgu Mureș',
    'targu-mures': 'Târgu Mureș',
    'baia mare': 'Baia Mare',
    'buzau': 'Buzău',
    'botosani': 'Botoșani',
    'suceava': 'Suceava',
    'ramnicu valcea': 'Râmnicu Vâlcea',
    'drobeta-turnu severin': 'Drobeta-Turnu Severin',
    'focsani': 'Focșani',
    'chisinau': 'Chișinău',
    'munchen': 'München',
    'munich': 'München',
    'koln': 'Köln',
    'cologne': 'Köln',
  };

  if (CANONICAL_CITIES[stripped]) {
    return CANONICAL_CITIES[stripped];
  }

  // 3. Fallback: Title Case properly preserving Romanian letters
  const clean = name.trim().toLowerCase();
  return clean.replace(/(^\w|\s\w|-\w)/g, (m) => m.toUpperCase());
}

export function normalizeFlavor(f: string): string {
  if (!f) return '';
  const fl = f.toLowerCase().trim();
  if (fl.includes('pepe') || fl.includes('rosu') || fl.includes('roșu')) return 'Pepene Roșu';
  if (fl.includes('fruc') || fl.includes('padu') || fl.includes('pădu')) return 'Fructe de Pădure';
  if (fl.includes('lam') || fl.includes('lăm') || fl.includes('lime')) return 'Lămâie și Lime';
  if (fl.includes('mure') || fl.includes('zmeu')) return 'Mure și Zmeură';
  if (fl.includes('port') || fl.includes('mand')) return 'Portocale și Mandarine';
  return f;
}

export const COUNTRY_NAMES_RO: Record<string, { name: string; flag: string; code: string }> = {
  // România
  'RO': { name: 'România', flag: '🇷🇴', code: 'RO' },
  'ROM': { name: 'România', flag: '🇷🇴', code: 'RO' },
  'ROU': { name: 'România', flag: '🇷🇴', code: 'RO' },
  'ROMANIA': { name: 'România', flag: '🇷🇴', code: 'RO' },
  'ROMÂNIA': { name: 'România', flag: '🇷🇴', code: 'RO' },

  // Austria
  'AT': { name: 'Austria', flag: '🇦🇹', code: 'AT' },
  'AUT': { name: 'Austria', flag: '🇦🇹', code: 'AT' },
  'AUSTRIA': { name: 'Austria', flag: '🇦🇹', code: 'AT' },

  // Franța
  'FR': { name: 'Franța', flag: '🇫🇷', code: 'FR' },
  'FRA': { name: 'Franța', flag: '🇫🇷', code: 'FR' },
  'FRANCE': { name: 'Franța', flag: '🇫🇷', code: 'FR' },
  'FRANTA': { name: 'Franța', flag: '🇫🇷', code: 'FR' },
  'FRANȚA': { name: 'Franța', flag: '🇫🇷', code: 'FR' },

  // Olanda (Netherlands)
  'NL': { name: 'Olanda', flag: '🇳🇱', code: 'NL' },
  'NLD': { name: 'Olanda', flag: '🇳🇱', code: 'NL' },
  'NETHERLANDS': { name: 'Olanda', flag: '🇳🇱', code: 'NL' },
  'THE NETHERLANDS': { name: 'Olanda', flag: '🇳🇱', code: 'NL' },
  'OLANDA': { name: 'Olanda', flag: '🇳🇱', code: 'NL' },

  // Belgia
  'BE': { name: 'Belgia', flag: '🇧🇪', code: 'BE' },
  'BEL': { name: 'Belgia', flag: '🇧🇪', code: 'BE' },
  'BELGIUM': { name: 'Belgia', flag: '🇧🇪', code: 'BE' },
  'BELGIA': { name: 'Belgia', flag: '🇧🇪', code: 'BE' },

  // Italia
  'IT': { name: 'Italia', flag: '🇮🇹', code: 'IT' },
  'ITA': { name: 'Italia', flag: '🇮🇹', code: 'IT' },
  'ITALY': { name: 'Italia', flag: '🇮🇹', code: 'IT' },
  'ITALIA': { name: 'Italia', flag: '🇮🇹', code: 'IT' },

  // Germania
  'DE': { name: 'Germania', flag: '🇩🇪', code: 'DE' },
  'DEU': { name: 'Germania', flag: '🇩🇪', code: 'DE' },
  'GERMANY': { name: 'Germania', flag: '🇩🇪', code: 'DE' },
  'GERMANIA': { name: 'Germania', flag: '🇩🇪', code: 'DE' },
  'DEUTSCHLAND': { name: 'Germania', flag: '🇩🇪', code: 'DE' },

  // Spania
  'ES': { name: 'Spania', flag: '🇪🇸', code: 'ES' },
  'ESP': { name: 'Spania', flag: '🇪🇸', code: 'ES' },
  'SPAIN': { name: 'Spania', flag: '🇪🇸', code: 'ES' },
  'SPANIA': { name: 'Spania', flag: '🇪🇸', code: 'ES' },
  'ESPAÑA': { name: 'Spania', flag: '🇪🇸', code: 'ES' },

  // Marea Britanie (UK / England / Scotland / Wales)
  'GB': { name: 'Marea Britanie', flag: '🇬🇧', code: 'GB' },
  'UK': { name: 'Marea Britanie', flag: '🇬🇧', code: 'GB' },
  'GBR': { name: 'Marea Britanie', flag: '🇬🇧', code: 'GB' },
  'UNITED KINGDOM': { name: 'Marea Britanie', flag: '🇬🇧', code: 'GB' },
  'MAREA BRITANIE': { name: 'Marea Britanie', flag: '🇬🇧', code: 'GB' },
  'ENGLAND': { name: 'Marea Britanie', flag: '🇬🇧', code: 'GB' },
  'GREAT BRITAIN': { name: 'Marea Britanie', flag: '🇬🇧', code: 'GB' },
  'ANGLIA': { name: 'Marea Britanie', flag: '🇬🇧', code: 'GB' },
  'SCOTLAND': { name: 'Marea Britanie', flag: '🇬🇧', code: 'GB' },
  'SCOȚIA': { name: 'Marea Britanie', flag: '🇬🇧', code: 'GB' },
  'SCOTIA': { name: 'Marea Britanie', flag: '🇬🇧', code: 'GB' },
  'WALES': { name: 'Marea Britanie', flag: '🇬🇧', code: 'GB' },
  'ȚARA GALILOR': { name: 'Marea Britanie', flag: '🇬🇧', code: 'GB' },

  // Ungaria
  'HU': { name: 'Ungaria', flag: '🇭🇺', code: 'HU' },
  'HUN': { name: 'Ungaria', flag: '🇭🇺', code: 'HU' },
  'HUNGARY': { name: 'Ungaria', flag: '🇭🇺', code: 'HU' },
  'UNGARIA': { name: 'Ungaria', flag: '🇭🇺', code: 'HU' },
  'MAGYARORSZÁG': { name: 'Ungaria', flag: '🇭🇺', code: 'HU' },

  // Bulgaria
  'BG': { name: 'Bulgaria', flag: '🇧🇬', code: 'BG' },
  'BGR': { name: 'Bulgaria', flag: '🇧🇬', code: 'BG' },
  'BULGARIA': { name: 'Bulgaria', flag: '🇧🇬', code: 'BG' },

  // Cehia
  'CZ': { name: 'Cehia', flag: '🇨🇿', code: 'CZ' },
  'CZE': { name: 'Cehia', flag: '🇨🇿', code: 'CZ' },
  'CZECH REPUBLIC': { name: 'Cehia', flag: '🇨🇿', code: 'CZ' },
  'CZECHIA': { name: 'Cehia', flag: '🇨🇿', code: 'CZ' },
  'CEHIA': { name: 'Cehia', flag: '🇨🇿', code: 'CZ' },

  // Slovacia
  'SK': { name: 'Slovacia', flag: '🇸🇰', code: 'SK' },
  'SVK': { name: 'Slovacia', flag: '🇸🇰', code: 'SK' },
  'SLOVAKIA': { name: 'Slovacia', flag: '🇸🇰', code: 'SK' },
  'SLOVACIA': { name: 'Slovacia', flag: '🇸🇰', code: 'SK' },

  // Polonia
  'PL': { name: 'Polonia', flag: '🇵🇱', code: 'PL' },
  'POL': { name: 'Polonia', flag: '🇵🇱', code: 'PL' },
  'POLAND': { name: 'Polonia', flag: '🇵🇱', code: 'PL' },
  'POLONIA': { name: 'Polonia', flag: '🇵🇱', code: 'PL' },

  // Grecia
  'GR': { name: 'Grecia', flag: '🇬🇷', code: 'GR' },
  'GRC': { name: 'Grecia', flag: '🇬🇷', code: 'GR' },
  'GREECE': { name: 'Grecia', flag: '🇬🇷', code: 'GR' },
  'GRECIA': { name: 'Grecia', flag: '🇬🇷', code: 'GR' },

  // Portugalia
  'PT': { name: 'Portugalia', flag: '🇵🇹', code: 'PT' },
  'PRT': { name: 'Portugalia', flag: '🇵🇹', code: 'PT' },
  'PORTUGAL': { name: 'Portugalia', flag: '🇵🇹', code: 'PT' },
  'PORTUGALIA': { name: 'Portugalia', flag: '🇵🇹', code: 'PT' },

  // Croația
  'HR': { name: 'Croația', flag: '🇭🇷', code: 'HR' },
  'HRV': { name: 'Croația', flag: '🇭🇷', code: 'HR' },
  'CROATIA': { name: 'Croația', flag: '🇭🇷', code: 'HR' },
  'CROAȚIA': { name: 'Croația', flag: '🇭🇷', code: 'HR' },

  // Slovenia
  'SI': { name: 'Slovenia', flag: '🇸🇮', code: 'SI' },
  'SVN': { name: 'Slovenia', flag: '🇸🇮', code: 'SI' },
  'SLOVENIA': { name: 'Slovenia', flag: '🇸🇮', code: 'SI' },

  // Suedia
  'SE': { name: 'Suedia', flag: '🇸🇪', code: 'SE' },
  'SWE': { name: 'Suedia', flag: '🇸🇪', code: 'SE' },
  'SWEDEN': { name: 'Suedia', flag: '🇸🇪', code: 'SE' },
  'SUEDIA': { name: 'Suedia', flag: '🇸🇪', code: 'SE' },

  // Finlanda
  'FI': { name: 'Finlanda', flag: '🇫🇮', code: 'FI' },
  'FIN': { name: 'Finlanda', flag: '🇫🇮', code: 'FI' },
  'FINLAND': { name: 'Finlanda', flag: '🇫🇮', code: 'FI' },
  'FINLANDA': { name: 'Finlanda', flag: '🇫🇮', code: 'FI' },

  // Danemarca
  'DK': { name: 'Danemarca', flag: '🇩🇰', code: 'DK' },
  'DNK': { name: 'Danemarca', flag: '🇩🇰', code: 'DK' },
  'DENMARK': { name: 'Danemarca', flag: '🇩🇰', code: 'DK' },
  'DANEMARCA': { name: 'Danemarca', flag: '🇩🇰', code: 'DK' },

  // Norvegia
  'NO': { name: 'Norvegia', flag: '🇳🇴', code: 'NO' },
  'NOR': { name: 'Norvegia', flag: '🇳🇴', code: 'NO' },
  'NORWAY': { name: 'Norvegia', flag: '🇳🇴', code: 'NO' },
  'NORVEGIA': { name: 'Norvegia', flag: '🇳🇴', code: 'NO' },

  // Irlanda
  'IE': { name: 'Irlanda', flag: '🇮🇪', code: 'IE' },
  'IRL': { name: 'Irlanda', flag: '🇮🇪', code: 'IE' },
  'IRELAND': { name: 'Irlanda', flag: '🇮🇪', code: 'IE' },
  'IRLANDA': { name: 'Irlanda', flag: '🇮🇪', code: 'IE' },

  // Cipru
  'CY': { name: 'Cipru', flag: '🇨🇾', code: 'CY' },
  'CYP': { name: 'Cipru', flag: '🇨🇾', code: 'CY' },
  'CYPRUS': { name: 'Cipru', flag: '🇨🇾', code: 'CY' },
  'CIPRU': { name: 'Cipru', flag: '🇨🇾', code: 'CY' },

  // Estonia
  'EE': { name: 'Estonia', flag: '🇪🇪', code: 'EE' },
  'EST': { name: 'Estonia', flag: '🇪🇪', code: 'EE' },
  'ESTONIA': { name: 'Estonia', flag: '🇪🇪', code: 'EE' },

  // Letonia
  'LV': { name: 'Letonia', flag: '🇱🇻', code: 'LV' },
  'LVA': { name: 'Letonia', flag: '🇱🇻', code: 'LV' },
  'LATVIA': { name: 'Letonia', flag: '🇱🇻', code: 'LV' },
  'LETONIA': { name: 'Letonia', flag: '🇱🇻', code: 'LV' },

  // Lituania
  'LT': { name: 'Lituania', flag: '🇱🇹', code: 'LT' },
  'LTU': { name: 'Lituania', flag: '🇱🇹', code: 'LT' },
  'LITHUANIA': { name: 'Lituania', flag: '🇱🇹', code: 'LT' },
  'LITUANIA': { name: 'Lituania', flag: '🇱🇹', code: 'LT' },

  // Luxemburg
  'LU': { name: 'Luxemburg', flag: '🇱🇺', code: 'LU' },
  'LUX': { name: 'Luxemburg', flag: '🇱🇺', code: 'LU' },
  'LUXEMBOURG': { name: 'Luxemburg', flag: '🇱🇺', code: 'LU' },
  'LUXEMBURG': { name: 'Luxemburg', flag: '🇱🇺', code: 'LU' },

  // Moldova
  'MD': { name: 'Republica Moldova', flag: '🇲🇩', code: 'MD' },
  'MDA': { name: 'Republica Moldova', flag: '🇲🇩', code: 'MD' },
  'MOLDOVA': { name: 'Republica Moldova', flag: '🇲🇩', code: 'MD' },
  'REPUBLICA MOLDOVA': { name: 'Republica Moldova', flag: '🇲🇩', code: 'MD' },

  // Elveția
  'CH': { name: 'Elveția', flag: '🇨🇭', code: 'CH' },
  'CHE': { name: 'Elveția', flag: '🇨🇭', code: 'CH' },
  'SWITZERLAND': { name: 'Elveția', flag: '🇨🇭', code: 'CH' },
  'ELVETIA': { name: 'Elveția', flag: '🇨🇭', code: 'CH' },
  'ELVEȚIA': { name: 'Elveția', flag: '🇨🇭', code: 'CH' },

  // Statele Unite (USA)
  'US': { name: 'Statele Unite', flag: '🇺🇸', code: 'US' },
  'USA': { name: 'Statele Unite', flag: '🇺🇸', code: 'US' },
  'UNITED STATES': { name: 'Statele Unite', flag: '🇺🇸', code: 'US' },
  'STATELE UNITE': { name: 'Statele Unite', flag: '🇺🇸', code: 'US' },

  // Canada
  'CA': { name: 'Canada', flag: '🇨🇦', code: 'CA' },
  'CAN': { name: 'Canada', flag: '🇨🇦', code: 'CA' },
  'CANADA': { name: 'Canada', flag: '🇨🇦', code: 'CA' },

  // Australia
  'AU': { name: 'Australia', flag: '🇦🇺', code: 'AU' },
  'AUS': { name: 'Australia', flag: '🇦🇺', code: 'AU' },
  'AUSTRALIA': { name: 'Australia', flag: '🇦🇺', code: 'AU' },

  // Ucraina
  'UA': { name: 'Ucraina', flag: '🇺🇦', code: 'UA' },
  'UKR': { name: 'Ucraina', flag: '🇺🇦', code: 'UA' },
  'UKRAINE': { name: 'Ucraina', flag: '🇺🇦', code: 'UA' },
  'UCRAINA': { name: 'Ucraina', flag: '🇺🇦', code: 'UA' },

  // Turcia
  'TR': { name: 'Turcia', flag: '🇹🇷', code: 'TR' },
  'TUR': { name: 'Turcia', flag: '🇹🇷', code: 'TR' },
  'TURKEY': { name: 'Turcia', flag: '🇹🇷', code: 'TR' },
  'TÜRKIYE': { name: 'Turcia', flag: '🇹🇷', code: 'TR' },
  'TURCIA': { name: 'Turcia', flag: '🇹🇷', code: 'TR' },

  // Emiratele Arabe Unite
  'AE': { name: 'Emiratele Arabe Unite', flag: '🇦🇪', code: 'AE' },
  'ARE': { name: 'Emiratele Arabe Unite', flag: '🇦🇪', code: 'AE' },
  'UAE': { name: 'Emiratele Arabe Unite', flag: '🇦🇪', code: 'AE' },
  'UNITED ARAB EMIRATES': { name: 'Emiratele Arabe Unite', flag: '🇦🇪', code: 'AE' },
  'EMIRATELE ARABE UNITE': { name: 'Emiratele Arabe Unite', flag: '🇦🇪', code: 'AE' },
  'DUBAI': { name: 'Emiratele Arabe Unite', flag: '🇦🇪', code: 'AE' },

  // Malta
  'MT': { name: 'Malta', flag: '🇲🇹', code: 'MT' },
  'MLT': { name: 'Malta', flag: '🇲🇹', code: 'MT' },
  'MALTA': { name: 'Malta', flag: '🇲🇹', code: 'MT' },

  // Islanda
  'IS': { name: 'Islanda', flag: '🇮🇸', code: 'IS' },
  'ISL': { name: 'Islanda', flag: '🇮🇸', code: 'IS' },
  'ICELAND': { name: 'Islanda', flag: '🇮🇸', code: 'IS' },
  'ISLANDA': { name: 'Islanda', flag: '🇮🇸', code: 'IS' },

  // Serbia
  'RS': { name: 'Serbia', flag: '🇷🇸', code: 'RS' },
  'SRB': { name: 'Serbia', flag: '🇷🇸', code: 'RS' },
  'SERBIA': { name: 'Serbia', flag: '🇷🇸', code: 'RS' },

  // Japonia
  'JP': { name: 'Japonia', flag: '🇯🇵', code: 'JP' },
  'JPN': { name: 'Japonia', flag: '🇯🇵', code: 'JP' },
  'JAPAN': { name: 'Japonia', flag: '🇯🇵', code: 'JP' },
  'JAPONIA': { name: 'Japonia', flag: '🇯🇵', code: 'JP' },

  // China
  'CN': { name: 'China', flag: '🇨🇳', code: 'CN' },
  'CHN': { name: 'China', flag: '🇨🇳', code: 'CN' },
  'CHINA': { name: 'China', flag: '🇨🇳', code: 'CN' },

  // Brazilia
  'BR': { name: 'Brazilia', flag: '🇧🇷', code: 'BR' },
  'BRA': { name: 'Brazilia', flag: '🇧🇷', code: 'BR' },
  'BRAZIL': { name: 'Brazilia', flag: '🇧🇷', code: 'BR' },
  'BRAZILIA': { name: 'Brazilia', flag: '🇧🇷', code: 'BR' },
};

export function normalizeCountry(c: string | null | undefined): { name: string; flag: string; code: string } {
  if (!c || !c.trim()) return { name: 'România', flag: '🇷🇴', code: 'RO' };
  const trimmed = c.trim();
  const upper = trimmed.toUpperCase();

  // 1. Direct match in dictionary
  if (COUNTRY_NAMES_RO[upper]) {
    return { ...COUNTRY_NAMES_RO[upper] };
  }

  // 2. Diacritics-stripped match
  const stripped = upper.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (COUNTRY_NAMES_RO[stripped]) {
    return { ...COUNTRY_NAMES_RO[stripped] };
  }

  // 3. Dynamic ISO-2 code with regional flag emoji calculation
  if (upper.length === 2 && /^[A-Z]{2}$/.test(upper)) {
    try {
      const flag = String.fromCodePoint(...[...upper].map(ch => 127397 + ch.charCodeAt(0)));
      return { name: upper, flag, code: upper };
    } catch (e) {
      // Fallback
    }
  }

  return { name: trimmed, flag: '🌐', code: upper.slice(0, 2) };
}

export function getBucharestIsoBounds(startDate?: string, endDate?: string) {
  if (!startDate && !endDate) return { startIso: undefined, endIso: undefined };

  const getUtcForBucharest = (dateStr: string, isEnd: boolean) => {
    const clean = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
    const [y, m, d] = clean.split('-').map(Number);
    if (!y || !m || !d) return undefined;
    
    // Create UTC date representation at 00:00:00 or 23:59:59
    const dUtc = new Date(Date.UTC(y, m - 1, d, isEnd ? 23 : 0, isEnd ? 59 : 0, isEnd ? 59 : 0, isEnd ? 999 : 0));
    
    // Format to parts in Europe/Bucharest to get exact local offset
    const tzFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Europe/Bucharest',
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hour12: false
    });
    const parts = Object.fromEntries(tzFormatter.formatToParts(dUtc).map(p => [p.type, p.value]));
    const h = Number(parts.hour === '24' ? 0 : parts.hour);
    const bucharestTime = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), h, Number(parts.minute), Number(parts.second), isEnd ? 999 : 0);
    const offsetMs = bucharestTime - dUtc.getTime();
    return new Date(dUtc.getTime() - offsetMs).toISOString();
  };

  return {
    startIso: startDate ? getUtcForBucharest(startDate, false) : undefined,
    endIso: endDate ? getUtcForBucharest(endDate, true) : undefined,
  };
}

/**
 * Canonical helper to extract and format the human-readable TrenZone order number (e.g. TZ-2026-9003).
 * Consistent across:
 * - Admin Orders (/admin/orders)
 * - Admin Preorders (/admin/preorders)
 * - Admin Returns (/admin/returns)
 * - Customer Return Form (/ro/retur & /en/retur)
 * - Invoices (Oblio & PDF /api/admin/orders/:id/invoice)
 * - Customer Emails (Order Confirmation, Preorder, Return, Dispatch, AWB)
 */
export function getCanonicalOrderNumber(order: any): string {
  if (!order) return 'TZ-ORD';

  // 1. Direct string handling
  if (typeof order === 'string') {
    const trimmed = order.trim();
    const match = trimmed.match(/(?:TZ|ODIN)-[A-Za-z0-9-]+/i);
    if (match) return match[0].toUpperCase();
    if (trimmed.startsWith('#')) return getCanonicalOrderNumber(trimmed.slice(1));
    
    // Pattern: 2026-9003 or 0001-021126
    if (/^\d{4}-\d{4,}$/.test(trimmed)) {
      return `TZ-${trimmed}`;
    }
    // Pattern: TZ20269003 or TZ-9003
    const prefixMatch = trimmed.match(/^(?:TZ|ODIN)[-_ ]*([A-Za-z0-9-]+)$/i);
    if (prefixMatch) {
      return `TZ-${prefixMatch[1].toUpperCase()}`;
    }

    return trimmed;
  }

  // 2. Joined return object with orders relation
  const o = (order.orders && typeof order.orders === 'object')
    ? (Array.isArray(order.orders) ? order.orders[0] : order.orders)
    : order;

  if (!o) return 'TZ-ORD';

  // 3. Check payment_intent_id if it's a sequential TZ/ODIN code
  if (typeof o.payment_intent_id === 'string') {
    const piMatch = o.payment_intent_id.match(/(?:TZ|ODIN)-[A-Za-z0-9-]+/i);
    if (piMatch) return piMatch[0].toUpperCase();
  }

  // 4. Check receipt_url (often formatted as /api/admin/orders/TZ-XXXX-XXXX/invoice)
  if (typeof o.receipt_url === 'string') {
    const rcMatch = o.receipt_url.match(/(?:TZ|ODIN)-[A-Za-z0-9-]+/i);
    if (rcMatch) return rcMatch[0].toUpperCase();
  }

  // 5. Check order_id or id if it starts with TZ/ODIN
  if (typeof o.id === 'string') {
    const idMatch = o.id.match(/(?:TZ|ODIN)-[A-Za-z0-9-]+/i);
    if (idMatch) return idMatch[0].toUpperCase();
  }

  if (typeof o.order_id === 'string') {
    const oIdMatch = o.order_id.match(/(?:TZ|ODIN)-[A-Za-z0-9-]+/i);
    if (oIdMatch) return oIdMatch[0].toUpperCase();
  }

  // 6. Check carrier / tracking metadata
  const meta = o.carrier_metadata || o.carrierMetadata || o.tracking_metadata || o.trackingMetadata;
  if (meta && typeof meta === 'object') {
    if (typeof meta.order_number === 'string') {
      const metaMatch = meta.order_number.match(/(?:TZ|ODIN)-[A-Za-z0-9-]+/i);
      if (metaMatch) return metaMatch[0].toUpperCase();
    }
  }

  // 7. Check if payment_intent_id is non-empty and NOT a Stripe internal ID
  if (typeof o.payment_intent_id === 'string' && o.payment_intent_id.trim()) {
    const pi = o.payment_intent_id.trim();
    if (!pi.startsWith('pi_')) {
      return pi.toUpperCase();
    }
  }

  // 8. Fallback to clean short UUID representation with TZ- prefix
  const uuid = typeof o.id === 'string' ? o.id : (typeof order.order_id === 'string' ? order.order_id : null);
  if (uuid && uuid.length >= 8) {
    const cleanUuid = uuid.replace(/-/g, '').substring(0, 8).toUpperCase();
    return `TZ-${cleanUuid}`;
  }

  return 'TZ-ORD';
}

