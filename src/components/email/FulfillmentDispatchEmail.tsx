/* eslint-disable @next/next/no-img-element */
import * as React from 'react';
import { Html, Head, Body, Preview } from '@react-email/components';
import { FulfillmentOrderSummary } from '@/types/fulfillment';

interface FulfillmentDispatchEmailProps {
  orders: FulfillmentOrderSummary[];
  sentAt: string;
  trigger?: 'manual' | 'scheduled_8am';
  baseUrl?: string;
  notes?: string;
  csvAttached?: boolean;
  secondaryEmail?: string;
}

export const FulfillmentDispatchEmail: React.FC<Readonly<FulfillmentDispatchEmailProps>> = ({
  orders = [],
  sentAt,
  trigger = 'manual',
  baseUrl = 'https://www.trenzone.fit',
  notes,
  csvAttached = true,
  secondaryEmail
}) => {
  const totalItemsCount = orders.reduce((acc, o) => {
    return acc + (o.items || []).reduce((sum, item) => sum + (Number(item.quantity) || 1), 0);
  }, 0);

  const codOrders = orders.filter(o => o.paymentMethod === 'cod');
  const cardOrders = orders.filter(o => o.paymentMethod !== 'cod');

  // Group aggregate items for the Picking Summary
  const pickingMap = new Map<string, { name: string; variant?: string; quantity: number; image?: string; sku?: string }>();
  for (const o of orders) {
    for (const item of (o.items || [])) {
      const key = `${item.name}__${item.variant || ''}`;
      const qty = Number(item.quantity) || 1;
      if (pickingMap.has(key)) {
        pickingMap.get(key)!.quantity += qty;
      } else {
        pickingMap.set(key, {
          name: item.name,
          variant: item.variant,
          quantity: qty,
          image: item.image,
          sku: item.sku
        });
      }
    }
  }
  const pickingList = Array.from(pickingMap.values()).sort((a, b) => b.quantity - a.quantity);

  // Group orders by Country: Romania vs International
  const isRo = (country?: string) => {
    const c = (country || 'RO').trim().toUpperCase();
    return c === 'RO' || c === 'ROMANIA' || c === 'ROMÂNIA';
  };

  const roOrders = orders.filter(o => isRo(o.country));
  const intlOrders = orders.filter(o => !isRo(o.country));

  const countryGroups = [
    {
      title: 'România (Comenzi Naționale - Curier Intern / Sameday)',
      flag: '🇷🇴',
      orders: roOrders,
    },
    {
      title: 'Comenzi Internaționale (Cross-Border / Packeta / DHL)',
      flag: '🇪🇺',
      orders: intlOrders,
    }
  ].filter(g => g.orders.length > 0);

  const formattedDate = sentAt ? new Date(sentAt).toLocaleString('ro-RO', {
    timeZone: 'Europe/Bucharest',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }) : new Date().toLocaleString('ro-RO');

  // Helper to resolve full image url
  const resolveImg = (src?: string) => {
    if (!src) return '';
    if (src.startsWith('http://') || src.startsWith('https://')) return src;
    return `${baseUrl}${src.startsWith('/') ? '' : '/'}${src}`;
  };

  return (
    <Html lang="ro">
      <Head>
        <meta name="color-scheme" content="light" />
        <meta name="supported-color-schemes" content="light" />
        <style>{`
          body {
            margin: 0;
            padding: 0;
            background-color: #f8fafc;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            color: #0f172a;
            -webkit-font-smoothing: antialiased;
          }
        `}</style>
      </Head>
      <Preview>{`TrenZone - Listă Expediere Fulfillment (${orders.length} comenzi, ${totalItemsCount} produse)`}</Preview>
      <Body style={{ backgroundColor: '#f8fafc', margin: 0, padding: '24px 10px' }}>
        <div style={{
          maxWidth: '680px',
          margin: '0 auto',
          backgroundColor: '#ffffff',
          borderRadius: '20px',
          overflow: 'hidden',
          boxShadow: '0 4px 25px rgba(15, 23, 42, 0.06)',
          border: '1px solid #e2e8f0'
        }}>

          {/* 🌟 LIGHT CLEAN HEADER (NO BLACK) */}
          <div style={{
            backgroundColor: '#ffffff',
            padding: '28px 32px 24px 32px',
            borderBottom: '1px solid #e2e8f0',
            borderTop: '4px solid #e32f8c'
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                <tr>
                  <td style={{ verticalAlign: 'middle' }}>
                    <div style={{
                      color: '#e32f8c',
                      fontSize: '11px',
                      fontWeight: 900,
                      letterSpacing: '1.5px',
                      textTransform: 'uppercase',
                      marginBottom: '4px'
                    }}>
                      TRENZONE • LOGISTICĂ & FULFILLMENT
                    </div>
                    <h1 style={{
                      margin: 0,
                      color: '#0f172a',
                      fontSize: '22px',
                      fontWeight: 900,
                      letterSpacing: '-0.5px'
                    }}>
                      Listă Comenzi pentru Ambalare
                    </h1>
                    <p style={{
                      margin: '6px 0 0 0',
                      color: '#64748b',
                      fontSize: '12px'
                    }}>
                      Data transmiterii: <strong style={{ color: '#0f172a' }}>{formattedDate}</strong> • 
                      <span style={{
                        display: 'inline-block',
                        marginLeft: '6px',
                        padding: '2px 8px',
                        borderRadius: '6px',
                        backgroundColor: trigger === 'scheduled_8am' ? '#dbeafe' : '#f3e8ff',
                        color: trigger === 'scheduled_8am' ? '#1e40af' : '#6b21a8',
                        fontWeight: 800,
                        fontSize: '10px',
                        textTransform: 'uppercase'
                      }}>
                        {trigger === 'scheduled_8am' ? 'Programat 08:00 AM' : 'Expediere Manuală'}
                      </span>
                    </p>
                    {secondaryEmail && (
                      <p style={{
                        margin: '4px 0 0 0',
                        color: '#64748b',
                        fontSize: '11px'
                      }}>
                        Copie de siguranță / verificare: <strong style={{ color: '#0f172a' }}>{secondaryEmail}</strong>
                      </p>
                    )}
                  </td>
                  <td style={{ textAlign: 'right', verticalAlign: 'middle', width: '80px' }}>
                    <img 
                      src={`${baseUrl}/images/logos/trenzone_logo.png`} 
                      alt="TrenZone" 
                      width="54" 
                      style={{ display: 'block', marginLeft: 'auto', border: 0 }} 
                    />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* 📊 SUMMARY METRICS BAR (CLEAN LIGHT DESIGN) */}
          <div style={{
            backgroundColor: '#f8fafc',
            padding: '16px 24px',
            borderBottom: '1px solid #e2e8f0'
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                <tr>
                  <td style={{ width: '33.33%', textAlign: 'center', padding: '6px 12px', borderRight: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Comenzi Totale
                    </div>
                    <div style={{ fontSize: '24px', fontWeight: 900, color: '#0f172a', marginTop: '2px' }}>
                      {orders.length}
                    </div>
                  </td>
                  <td style={{ width: '33.33%', textAlign: 'center', padding: '6px 12px', borderRight: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Articole de Cules
                    </div>
                    <div style={{ fontSize: '24px', fontWeight: 900, color: '#e32f8c', marginTop: '2px' }}>
                      {totalItemsCount} <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748b' }}>buc.</span>
                    </div>
                  </td>
                  <td style={{ width: '33.33%', textAlign: 'center', padding: '6px 12px' }}>
                    <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Comenzi Ramburs
                    </div>
                    <div style={{ fontSize: '24px', fontWeight: 900, color: codOrders.length > 0 ? '#b45309' : '#16a34a', marginTop: '2px' }}>
                      {codOrders.length} <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b' }}>({cardOrders.length} achitate card)</span>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* 📎 ATTACHED CSV FILE CALLOUT */}
          {csvAttached && (
            <div style={{
              margin: '20px 28px 0 28px',
              padding: '12px 18px',
              backgroundColor: '#ecfdf5',
              border: '1px solid #a7f3d0',
              borderRadius: '12px'
            }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <tbody>
                  <tr>
                    <td style={{ width: '28px', verticalAlign: 'middle', fontSize: '18px' }}>
                      📎
                    </td>
                    <td style={{ verticalAlign: 'middle', fontSize: '12px', color: '#065f46' }}>
                      <strong>Fișier CSV atașat:</strong> În acest email este inclus tabelul complet 
                      <strong style={{ color: '#047857' }}> (.csv)</strong> pentru import rapid în sistemul dvs. de gestiune / etichetare depozit.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* 📝 ADMIN NOTES IF ANY */}
          {notes && (
            <div style={{
              margin: '14px 28px 0 28px',
              padding: '12px 18px',
              backgroundColor: '#eff6ff',
              border: '1px solid #bfdbfe',
              borderRadius: '12px',
              fontSize: '12px',
              color: '#1e40af'
            }}>
              <strong>Instrucțiuni speciale:</strong> {notes}
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════ */}
          {/* 📦 1. PICKING LIST: SUMAR ARTICOLE DE CULES DIN DEPOZIT    */}
          {/* ══════════════════════════════════════════════════════════ */}
          <div style={{ padding: '24px 28px 0 28px' }}>
            <div style={{
              backgroundColor: '#ffffff',
              border: '1px solid #cbd5e1',
              borderRadius: '14px',
              overflow: 'hidden'
            }}>
              <div style={{
                backgroundColor: '#f1f5f9',
                padding: '10px 18px',
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <tbody>
                    <tr>
                      <td style={{ verticalAlign: 'middle' }}>
                        <span style={{ fontSize: '14px', marginRight: '6px' }}>📋</span>
                        <strong style={{ fontSize: '12px', color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          Sumar Cules Articole din Depozit (Picking List)
                        </strong>
                      </td>
                      <td style={{ textAlign: 'right', verticalAlign: 'middle', fontSize: '11px', color: '#64748b', fontWeight: 700 }}>
                        Total: {totalItemsCount} buc.
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div style={{ padding: '10px 16px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                  <tbody>
                    {pickingList.map((item, pIdx) => (
                      <tr key={pIdx} style={{ borderBottom: pIdx === pickingList.length - 1 ? 'none' : '1px solid #f1f5f9' }}>
                        <td style={{ width: '42px', padding: '8px 0', verticalAlign: 'middle' }}>
                          <span style={{
                            display: 'inline-block',
                            backgroundColor: '#e32f8c',
                            color: '#ffffff',
                            fontWeight: 900,
                            fontSize: '11px',
                            padding: '3px 8px',
                            borderRadius: '6px'
                          }}>
                            {item.quantity}x
                          </span>
                        </td>
                        <td style={{ width: '46px', padding: '8px 6px', verticalAlign: 'middle' }}>
                          {item.image ? (
                            <img
                              src={resolveImg(item.image)}
                              alt={item.name}
                              width="36"
                              height="36"
                              style={{
                                display: 'block',
                                width: '36px',
                                height: '36px',
                                objectFit: 'contain',
                                borderRadius: '6px',
                                backgroundColor: '#f8fafc',
                                border: '1px solid #e2e8f0'
                              }}
                            />
                          ) : (
                            <div style={{
                              width: '36px',
                              height: '36px',
                              borderRadius: '6px',
                              backgroundColor: '#f1f5f9',
                              border: '1px solid #e2e8f0',
                              textAlign: 'center',
                              lineHeight: '36px',
                              fontSize: '16px'
                            }}>
                              📦
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '8px 8px', verticalAlign: 'middle' }}>
                          <div style={{ fontWeight: 800, color: '#0f172a' }}>{item.name}</div>
                          {item.variant && (
                            <div style={{ color: '#c41a72', fontSize: '11px', fontWeight: 700, marginTop: '1px' }}>
                              Culoare / Variantă: {item.variant}
                            </div>
                          )}
                        </td>
                        {item.sku && (
                          <td style={{ textAlign: 'right', padding: '8px 0', verticalAlign: 'middle', color: '#64748b', fontSize: '11px', fontFamily: 'monospace' }}>
                            SKU: {item.sku}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════════ */}
          {/* 🌍 2. ORDERS GROUPED BY COUNTRY (ROMANIA vs INTL)          */}
          {/* ══════════════════════════════════════════════════════════ */}
          <div style={{ padding: '24px 28px' }}>
            {orders.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '40px 20px',
                color: '#64748b',
                backgroundColor: '#f8fafc',
                borderRadius: '12px',
                border: '1px dashed #cbd5e1'
              }}>
                <div style={{ fontSize: '14px', fontWeight: 700 }}>Nu există comenzi de expediat în această sesiune.</div>
              </div>
            ) : (
              countryGroups.map((group, gIdx) => (
                <div key={gIdx} style={{ marginBottom: '28px' }}>
                  {/* Group Header */}
                  <div style={{
                    padding: '8px 14px',
                    backgroundColor: '#f1f5f9',
                    borderRadius: '10px',
                    marginBottom: '14px',
                    border: '1px solid #e2e8f0'
                  }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <tbody>
                        <tr>
                          <td style={{ verticalAlign: 'middle' }}>
                            <span style={{ fontSize: '16px', marginRight: '6px' }}>{group.flag}</span>
                            <strong style={{ fontSize: '13px', color: '#0f172a', fontWeight: 900 }}>
                              {group.title}
                            </strong>
                          </td>
                          <td style={{ textAlign: 'right', verticalAlign: 'middle' }}>
                            <span style={{
                              fontSize: '11px',
                              fontWeight: 800,
                              backgroundColor: '#ffffff',
                              border: '1px solid #cbd5e1',
                              padding: '2px 8px',
                              borderRadius: '6px',
                              color: '#334155'
                            }}>
                              {group.orders.length} {group.orders.length === 1 ? 'comandă' : 'comenzi'}
                            </span>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Orders in this Group */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {group.orders.map((order, oIdx) => {
                      const isCod = order.paymentMethod === 'cod';

                      return (
                        <div key={order.id || oIdx} style={{
                          border: '1px solid #e2e8f0',
                          borderRadius: '14px',
                          overflow: 'hidden',
                          backgroundColor: '#ffffff',
                          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
                          marginBottom: '14px'
                        }}>
                          {/* Order Card Header */}
                          <div style={{
                            backgroundColor: '#f8fafc',
                            padding: '10px 16px',
                            borderBottom: '1px solid #e2e8f0'
                          }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                              <tbody>
                                <tr>
                                  <td style={{ verticalAlign: 'middle' }}>
                                    <span style={{
                                      backgroundColor: '#0f172a',
                                      color: '#ffffff',
                                      fontSize: '10px',
                                      fontWeight: 900,
                                      padding: '2px 6px',
                                      borderRadius: '4px',
                                      marginRight: '8px'
                                    }}>
                                      #{oIdx + 1}
                                    </span>
                                    <strong style={{ fontSize: '14px', color: '#0f172a' }}>{order.id}</strong>
                                    <span style={{ fontSize: '11px', color: '#64748b', marginLeft: '8px' }}>
                                      {order.date}
                                    </span>
                                  </td>
                                  <td style={{ textAlign: 'right', verticalAlign: 'middle' }}>
                                    {isCod ? (
                                      <span style={{
                                        backgroundColor: '#fef3c7',
                                        color: '#92400e',
                                        fontSize: '11px',
                                        fontWeight: 900,
                                        padding: '4px 10px',
                                        borderRadius: '6px',
                                        border: '1px solid #fde68a'
                                      }}>
                                        RAMBURS DE ÎNCASAT: {order.total}
                                      </span>
                                    ) : (
                                      <span style={{
                                        backgroundColor: '#dcfce7',
                                        color: '#166534',
                                        fontSize: '11px',
                                        fontWeight: 900,
                                        padding: '4px 10px',
                                        borderRadius: '6px',
                                        border: '1px solid #bbf7d0'
                                      }}>
                                        ACHITAT CARD (0 DE ÎNCASAT)
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              </tbody>
                            </table>
                          </div>

                          {/* Customer & Address Details */}
                          <div style={{ padding: '12px 16px', borderBottom: '1px solid #f1f5f9' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                              <tbody>
                                <tr>
                                  <td style={{ width: '50%', verticalAlign: 'top', paddingRight: '10px' }}>
                                    <div style={{ color: '#64748b', fontSize: '10px', fontWeight: 800, textTransform: 'uppercase' }}>
                                      Destinatar
                                    </div>
                                    <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '13px', marginTop: '2px' }}>
                                      {order.customer}
                                    </div>
                                    <div style={{ color: '#0284c7', fontWeight: 700, marginTop: '2px' }}>
                                      Tel: <a href={`tel:${order.customerPhone}`} style={{ color: '#0284c7', textDecoration: 'none' }}>{order.customerPhone}</a>
                                    </div>
                                    {order.customerEmail && order.customerEmail !== 'N/A' && (
                                      <div style={{ color: '#64748b', fontSize: '11px', marginTop: '1px' }}>{order.customerEmail}</div>
                                    )}
                                  </td>
                                  <td style={{ width: '50%', verticalAlign: 'top', paddingLeft: '10px', borderLeft: '1px solid #f1f5f9' }}>
                                    <div style={{ color: '#64748b', fontSize: '10px', fontWeight: 800, textTransform: 'uppercase' }}>
                                      Adresă Livrare
                                    </div>
                                    <div style={{ fontWeight: 700, color: '#0f172a', marginTop: '2px' }}>
                                      {order.address}
                                    </div>
                                    <div style={{ color: '#475569', marginTop: '2px' }}>
                                      {order.city} {order.zip ? `• CP: ${order.zip}` : ''} • <strong>{order.country || 'RO'}</strong>
                                    </div>
                                  </td>
                                </tr>
                              </tbody>
                            </table>

                            {/* Gift & Priority notes */}
                            {(order.priorityProcessing || order.giftPackaging || order.giftMessage) && (
                              <div style={{ marginTop: '8px', paddingTop: '6px', borderTop: '1px dashed #e2e8f0', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                {order.priorityProcessing && (
                                  <span style={{ backgroundColor: '#ffedd5', color: '#9a3412', fontSize: '10px', fontWeight: 800, padding: '2px 6px', borderRadius: '4px' }}>
                                    ⚡ PRIORITAR
                                  </span>
                                )}
                                {order.giftPackaging && (
                                  <span style={{ backgroundColor: '#fce7f3', color: '#9d174d', fontSize: '10px', fontWeight: 800, padding: '2px 6px', borderRadius: '4px' }}>
                                    🎁 AMBALAJ CADOU
                                  </span>
                                )}
                                {order.giftMessage && (
                                  <span style={{ fontSize: '11px', color: '#831843', fontStyle: 'italic', display: 'block', width: '100%', marginTop: '2px' }}>
                                    Notă cadou: &ldquo;{order.giftMessage}&rdquo;
                                  </span>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Items with visual product images */}
                          <div style={{ padding: '10px 16px', backgroundColor: '#ffffff' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                              <tbody>
                                {order.items.map((item, iIdx) => (
                                  <tr key={iIdx} style={{ borderBottom: iIdx === order.items.length - 1 ? 'none' : '1px solid #f8fafc' }}>
                                    <td style={{ width: '40px', padding: '6px 0', verticalAlign: 'middle' }}>
                                      <span style={{
                                        backgroundColor: '#0f172a',
                                        color: '#ffffff',
                                        fontWeight: 900,
                                        fontSize: '11px',
                                        padding: '2px 7px',
                                        borderRadius: '5px',
                                        display: 'inline-block'
                                      }}>
                                        {item.quantity}x
                                      </span>
                                    </td>
                                    <td style={{ width: '40px', padding: '6px 6px', verticalAlign: 'middle' }}>
                                      {item.image ? (
                                        <img
                                          src={resolveImg(item.image)}
                                          alt={item.name}
                                          width="32"
                                          height="32"
                                          style={{
                                            display: 'block',
                                            width: '32px',
                                            height: '32px',
                                            objectFit: 'contain',
                                            borderRadius: '5px',
                                            backgroundColor: '#f8fafc',
                                            border: '1px solid #e2e8f0'
                                          }}
                                        />
                                      ) : (
                                        <div style={{
                                          width: '32px',
                                          height: '32px',
                                          borderRadius: '5px',
                                          backgroundColor: '#f1f5f9',
                                          border: '1px solid #e2e8f0',
                                          textAlign: 'center',
                                          lineHeight: '32px',
                                          fontSize: '14px'
                                        }}>
                                          📦
                                        </div>
                                      )}
                                    </td>
                                    <td style={{ padding: '6px 6px', verticalAlign: 'middle' }}>
                                      <span style={{ fontWeight: 800, color: '#0f172a' }}>{item.name}</span>
                                      {item.variant && (
                                        <span style={{
                                          display: 'inline-block',
                                          backgroundColor: '#fdf2f8',
                                          color: '#be185d',
                                          fontSize: '10px',
                                          fontWeight: 800,
                                          padding: '1px 6px',
                                          borderRadius: '4px',
                                          marginLeft: '6px',
                                          border: '1px solid #fbcfe8'
                                        }}>
                                          {item.variant}
                                        </span>
                                      )}
                                    </td>
                                    {item.sku && (
                                      <td style={{ width: '110px', textAlign: 'right', padding: '6px 0', color: '#64748b', fontSize: '11px', fontFamily: 'monospace' }}>
                                        SKU: {item.sku}
                                      </td>
                                    )}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* 🌟 CLEAN LIGHT FOOTER */}
          <div style={{
            backgroundColor: '#f8fafc',
            color: '#64748b',
            padding: '20px 28px',
            textAlign: 'center',
            fontSize: '11px',
            lineHeight: '1.6',
            borderTop: '1px solid #e2e8f0'
          }}>
            <p style={{ margin: 0, fontWeight: 800, color: '#0f172a' }}>
              TRENZONE LOGISTICĂ • PLATFORMĂ AUTOMATIZATĂ
            </p>
            <p style={{ margin: '4px 0 0 0' }}>
              Dacă aveți neclarități legate de comenzi sau stocuri, vă rugăm să ne contactați la <strong style={{ color: '#e32f8c' }}>trenzone483@gmail.com</strong>.
            </p>
            <p style={{ margin: '6px 0 0 0', opacity: 0.7 }}>
              &copy; {new Date().getFullYear()} TrenZone. Toate drepturile rezervate.
            </p>
          </div>
        </div>
      </Body>
    </Html>
  );
};
