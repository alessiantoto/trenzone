import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';
import { logoBase64 } from '@/lib/logoBase64';
import { getProductPrice } from '@/utils/pricing';

// Fallback to built-in fonts (Helvetica) to prevent 500 errors from external fetch failures
// We'll keep the font-family label but use standard ones for stability
const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 9,
    fontFamily: 'Helvetica',
    color: '#111',
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 50,
    borderBottom: '2pt solid #f3f4f6',
    paddingBottom: 25,
  },
  logoContainer: {
    flexDirection: 'column',
  },
  logo: {
    fontSize: 24,
    fontWeight: 700,
    letterSpacing: -1,
    color: '#000',
  },
  tagline: {
    fontSize: 7,
    color: '#6b7280',
    marginTop: 4,
    letterSpacing: 2,
    fontWeight: 700,
    textTransform: 'uppercase',
  },
  invoiceInfo: {
    textAlign: 'right',
  },
  invoiceTitle: {
    fontSize: 24,
    fontWeight: 900,
    textTransform: 'uppercase',
    letterSpacing: 2,
    color: '#000',
    marginBottom: 2,
  },
  invoiceNumber: {
    fontSize: 20,
    fontWeight: 700,
    color: '#000',
  },
  dateLabel: {
    color: '#6b7280',
    marginTop: 6,
    fontSize: 8,
  },

  // Addresses
  detailsSection: {
    flexDirection: 'row',
    marginBottom: 45,
    gap: 60,
  },
  column: {
    flex: 1,
  },
  sectionLabel: {
    fontSize: 8,
    textTransform: 'uppercase',
    color: '#9ca3af',
    marginBottom: 10,
    letterSpacing: 1,
    fontWeight: 700,
  },
  entityName: {
    fontWeight: 700,
    fontSize: 11,
    marginBottom: 4,
    color: '#000',
  },
  infoLine: {
    color: '#4b5563',
    lineHeight: 1.5,
    fontSize: 9,
  },

  // Table
  table: {
    marginTop: 10,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f9fafb',
    borderBottom: '1pt solid #000',
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  tableHeaderText: {
    fontSize: 8,
    fontWeight: 700,
    color: '#374151',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottom: '0.5pt solid #e5e7eb',
  },

  // Columns
  colImg: { width: '12%' },
  colDesc: { width: '48%' },
  colUM: { width: '8%', textAlign: 'center' },
  colQty: { width: '8%', textAlign: 'center' },
  colPrice: { width: '12%', textAlign: 'right' },
  colTotal: { width: '12%', textAlign: 'right' },

  productThumb: {
    width: 32,
    height: 32,
    borderRadius: 4,
    objectFit: 'cover',
  },
  productName: {
    fontWeight: 700,
    fontSize: 10,
    color: '#111',
  },

  // Summary
  summarySection: {
    marginTop: 35,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  summaryBox: {
    width: '45%',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
    borderBottom: '0.5pt solid #f3f4f6',
  },
  summaryLabel: {
    color: '#6b7280',
    fontSize: 9,
  },
  summaryValue: {
    fontWeight: 700,
    color: '#111',
  },
  grandTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 15,
    marginTop: 10,
  },
  grandTotalLabel: {
    fontSize: 12,
    fontWeight: 700,
    color: '#000',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  grandTotalValue: {
    fontSize: 22,
    fontWeight: 700,
    color: '#000',
  },

  footer: {
    position: 'absolute',
    bottom: 40,
    left: 40,
    right: 40,
    borderTop: '0.5pt solid #e5e7eb',
    paddingTop: 20,
  },
  legalNotice: {
    fontSize: 7,
    color: '#9ca3af',
    textAlign: 'center',
    lineHeight: 1.6,
  }
});

const translations = {
  ro: {
    factura: "Factura Comerciala",
    data: "Data",
    furnizor: "Furnizor",
    client: "Client",
    descriere: "DESCRIERE PRODUS",
    um: "U.M.",
    um_val: "buc.",
    cant: "CANT.",
    pret: "PRET",
    valoare: "VALOARE",
    subtotal: "Subtotal",
    reducere: "Reducere",
    total_plata: "TOTAL PLATA",
    legal: "Factură comercială internațională emisă de TrenZone LLC (Wyoming, SUA). Factura circulă fără semnătură și ștampilă conform uzanțelor comerciale internaționale și art. 319 alin. (29) din Legea 227/2015 privind Codul Fiscal. TVA neaplicabil (vânzare internațională / entitate non-UE)."
  },
  en: {
    factura: "Commercial Invoice",
    data: "Date",
    furnizor: "Supplier",
    client: "Customer",
    descriere: "PRODUCT DESCRIPTION",
    um: "UNIT",
    um_val: "pcs.",
    cant: "QTY",
    pret: "PRICE",
    valoare: "AMOUNT",
    subtotal: "Subtotal",
    reducere: "Discount",
    total_plata: "TOTAL DUE",
    legal: "International commercial invoice issued by TrenZone LLC (Wyoming, USA). Invoice is valid without signature and stamp in accordance with international commercial standards. VAT not applicable (Non-EU business entity)."
  }
};

interface InvoiceProps {
  orderData: {
    id: string;
    date: string;
    locale: 'ro' | 'en';
    customer: {
      name: string;
      email: string;
      phone: string;
      address: string;
    };
    items: Array<{
      name: string;
      price: number;
      quantity: number;
      image?: string;
      selectedVariant?: { name?: any };
    }>;
    subtotal: number;
    shipping: number;
    discount: number;
    discountCode?: string | null;
    paymentMethod?: string | null;
    total: number;
    currency: string;
    priorityProcessing?: boolean;
    giftPackaging?: boolean;
    giftMessage?: string | null;
    cardDiscount?: number;
  };
}

export const InvoicePDF: React.FC<InvoiceProps> = ({ orderData }) => {
  const lang = orderData.locale === 'en' ? translations.en : translations.ro;

  // Function to remove diacritics from product names as well
  const removeDiacritics = (str: any) => {
    if (!str) return "";

    // Safety check for localized objects
    let text = str;
    if (typeof str === 'object' && str !== null) {
      text = str[orderData.locale] || str['ro'] || str['en'] || "Produs";
    }

    return String(text)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/ţ/g, "t")
      .replace(/Ţ/g, "T")
      .replace(/ş/g, "s")
      .replace(/Ş/g, "S");
  };

  // Display items with variant/size properly included in the name
  const displayItems: any[] = orderData.items.map((item: any) => {
    let name = typeof item.name === 'object'
      ? (item.name[(orderData.locale as string)] || item.name['ro'] || item.name['en'] || 'Produs')
      : (item.name || 'Produs');

    const variantRaw = item.selectedVariant?.name || item.variant || null;
    const variantStr = typeof variantRaw === 'object' && variantRaw !== null
      ? (variantRaw[orderData.locale || 'ro'] || variantRaw['ro'] || variantRaw['en'] || Object.values(variantRaw as any)[0] || '')
      : (variantRaw || '');

    const hasVariantInName = variantStr && (
      name.includes(`(${variantStr})`) || 
      name.toLowerCase().includes(`(${variantStr.toLowerCase()})`)
    );

    if (variantStr && !hasVariantInName) {
      name = `${name} (${variantStr})`;
    }

    return {
      ...item,
      name: name,
    };
  });

  // Calculate if items are already converted to orderData.currency
  const rawItemsSum = (orderData.items || []).reduce(
    (sum: number, it: any) => sum + (Number(it.price) || 0) * (Number(it.quantity) || 1),
    0
  );
  const isAlreadyConverted = Math.abs(rawItemsSum - (orderData.subtotal || 0)) < 0.5;

  const getItemUnitPrice = (item: any) => {
    const rawPrice = Number(item.price) || 0;
    if (orderData.currency === 'RON' || isAlreadyConverted) {
      return rawPrice;
    }
    return getProductPrice(rawPrice, orderData.currency);
  };

  return (
    <Document title={`Invoice-${orderData.id}`}>
      <Page size="A4" style={styles.page}>

        {/* ═══ Header ═══ */}
        <View style={styles.header}>
          <View style={{ ...styles.logoContainer, backgroundColor: '#111827', padding: 12, borderRadius: 40, width: 80, height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Image src={logoBase64} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </View>
          <View style={styles.invoiceInfo}>
            <Text style={styles.invoiceTitle}>{lang.factura}</Text>
            <Text style={styles.invoiceNumber}>{orderData.id}</Text>
            <Text style={styles.dateLabel}>{lang.data}: {orderData.date}</Text>
            <Text style={styles.dateLabel}>{orderData.locale === 'ro' ? 'Metoda plată' : 'Payment'}: {(orderData.paymentMethod === 'card' || orderData.paymentMethod === 'online' || orderData.paymentMethod === 'stripe' || (orderData.paymentMethod !== 'cod' && orderData.paymentMethod !== 'ramburs')) ? (orderData.locale === 'ro' ? 'Online cu Cardul' : 'Credit Card') : (orderData.locale === 'ro' ? 'Ramburs' : 'Cash on Delivery')}</Text>
          </View>
        </View>

        {/* ═══ Details ═══ */}
        <View style={styles.detailsSection}>
          <View style={styles.column}>
            <Text style={styles.sectionLabel}>{lang.furnizor}</Text>
            <Text style={styles.entityName}>TrenZone LLC</Text>
            <Text style={styles.infoLine}>Reg. Com.: GZ-US-WY-1790986605415</Text>
            <Text style={styles.infoLine}>75 E 3RD ST, SHERIDAN, WY, 82801, USA</Text>
            <Text style={styles.infoLine}>Registered Agent: WY Commercial Registered Agent LLC</Text>
            <Text style={styles.infoLine}>Email: trenzone483@gmail.com</Text>
          </View>

          <View style={styles.column}>
            <Text style={styles.sectionLabel}>{lang.client}</Text>
            <Text style={styles.entityName}>{removeDiacritics(orderData.customer.name)}</Text>
            <Text style={styles.infoLine}>{removeDiacritics(orderData.customer.address)}</Text>
            <Text style={styles.infoLine}>{orderData.customer.email}</Text>
            <Text style={styles.infoLine}>{orderData.customer.phone}</Text>
          </View>
        </View>

        {/* ═══ Table ═══ */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={{ ...styles.tableHeaderText, ...styles.colDesc }}>{lang.descriere}</Text>
            <Text style={{ ...styles.tableHeaderText, ...styles.colUM }}>{lang.um}</Text>
            <Text style={{ ...styles.tableHeaderText, ...styles.colQty }}>{lang.cant}</Text>
            <Text style={{ ...styles.tableHeaderText, ...styles.colPrice }}>{lang.pret} ({orderData.currency})</Text>
            <Text style={{ ...styles.tableHeaderText, ...styles.colTotal }}>{lang.valoare} ({orderData.currency})</Text>
          </View>

          {displayItems.map((item, index) => {
            const unitPrice = getItemUnitPrice(item);
            return (
              <View key={index} style={styles.tableRow} wrap={false}>
                <View style={styles.colDesc}>
                  <Text style={styles.productName}>{removeDiacritics(item.name)}</Text>
                </View>
                <Text style={styles.colUM}>{lang.um_val}</Text>
                <Text style={styles.colQty}>{item.quantity}</Text>
                <Text style={styles.colPrice}>{unitPrice.toFixed(2)}</Text>
                <Text style={styles.colTotal}>{(unitPrice * item.quantity).toFixed(2)}</Text>
              </View>
            );
          })}
        </View>

        {/* \u2550\u2550\u2550 Summary \u2550\u2550\u2550 */}
        <View style={styles.summarySection}>
          <View style={styles.summaryBox}>
            {/* 1. Subtotal */}
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>{lang.subtotal}</Text>
              <Text style={styles.summaryValue}>{(orderData.subtotal || 0).toFixed(2)} {orderData.currency}</Text>
            </View>
            {/* 2. Livrare */}
            {(orderData.shipping || 0) > 0 && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>{orderData.locale === 'ro' ? 'Livrare' : 'Shipping'}</Text>
                <Text style={styles.summaryValue}>{(orderData.shipping || 0).toFixed(2)} {orderData.currency}</Text>
              </View>
            )}
            {/* 3. Reducere Cupon / Bundle */}
            {(orderData.discount || 0) > 0 && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>{lang.reducere} {orderData.discountCode ? `(${removeDiacritics(orderData.discountCode)})` : ''}</Text>
                <Text style={styles.summaryValue}>-{(orderData.discount || 0).toFixed(2)} {orderData.currency}</Text>
              </View>
            )}
            {/* 4. Procesare Prioritara */}
            {orderData.priorityProcessing && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>{orderData.locale === 'ro' ? 'Procesare Prioritara' : 'Priority Processing'}</Text>
                <Text style={styles.summaryValue}>+{((orderData as any).priorityProcessingAmount || getProductPrice(6.90, orderData.currency)).toFixed(2)} {orderData.currency}</Text>
              </View>
            )}
            {/* 5. Ambalaj Cadou */}
            {orderData.giftPackaging && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>{orderData.locale === 'ro' ? 'Ambalaj Cadou' : 'Gift Packaging'}</Text>
                <Text style={styles.summaryValue}>+{((orderData as any).giftPackagingAmount || getProductPrice(14.90, orderData.currency)).toFixed(2)} {orderData.currency}</Text>
              </View>
            )}
            {/* Mesaj Cadou */}
            {orderData.giftMessage ? (
              <View style={{ ...styles.summaryRow, flexDirection: 'column', alignItems: 'flex-start' }}>
                <Text style={{ ...styles.summaryLabel, marginBottom: 3 }}>{orderData.locale === 'ro' ? 'Mesaj cadou:' : 'Gift message:'}</Text>
                <Text style={{ fontSize: 8, fontStyle: 'italic', color: '#555', paddingLeft: 4 }}>"{removeDiacritics(orderData.giftMessage)}"</Text>
              </View>
            ) : null}
            {/* 6. Reducere Card */}
            {(orderData.cardDiscount || 0) > 0 && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>{orderData.locale === 'ro' ? 'Reducere Card' : 'Card Discount'}</Text>
                <Text style={styles.summaryValue}>-{(orderData.cardDiscount || 0).toFixed(2)} {orderData.currency}</Text>
              </View>
            )}

            {/* 7. Total */}
            <View style={styles.grandTotalRow}>
              <Text style={styles.grandTotalLabel}>{lang.total_plata}</Text>
              <Text style={styles.grandTotalValue}>{(orderData.total || 0).toFixed(2)} {orderData.currency}</Text>
            </View>
          </View>
        </View>

        {/* \u2550\u2550\u2550 Footer \u2550\u2550\u2550 */}
        <View style={styles.footer} fixed>
          <Text style={styles.legalNotice}>
            {lang.legal}
          </Text>
        </View>

      </Page>
    </Document>
  );
};
