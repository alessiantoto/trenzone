import { renderToBuffer } from '@react-pdf/renderer';
import { InvoicePDF } from '../components/invoice/InvoicePDF';
import React from 'react';

export async function generateInvoicePdf(orderData: any) {
  const startToken = `[PDF GEN] Order #${orderData.id}`;
  console.time(startToken);
  try {
    const buffer = await renderToBuffer(
      React.createElement(InvoicePDF, { orderData }) as any
    );
    console.timeEnd(startToken);
    return buffer;
  } catch (error: any) {
    console.timeEnd(startToken);
    console.error('❌ [PDF GENERATION] ERROR:', {
      message: error.message,
      name: error.name,
      stack: error.stack?.substring(0, 500)
    });
    throw error;
  }
}
