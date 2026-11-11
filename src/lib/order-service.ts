import { generateInvoicePdf } from './invoice';
import { sendOrderConfirmationEmail } from './resend-service';

export async function processOrderInvoicing(orderData: any) {
  try {
    console.log(`📄 Starting invoicing process for Order #${orderData.id}...`);
    
    // 1. Generate Invoice PDF
    console.log('📄 Generating PDF...');
    const pdfBuffer = await generateInvoicePdf(orderData);
    
    // 2. Send Confirmation Email with PDF Attachment
    if (orderData.customer.email) {
      console.log(`📧 Attempting to send EmailTemplate to ${orderData.customer.email}...`);
      const result = await sendOrderConfirmationEmail(orderData.customer.email, orderData, pdfBuffer);
      console.log('✅ SUCCESS: Confirmation email sent!', result);
      return { success: true, result };
    } else {
      console.warn('⚠️ SKIP: No customer email found in order data');
      return { success: false, error: 'Missing customer email' };
    }
  } catch (err: any) {
    console.error('❌ CRITICAL ORDER SERVICE ERROR:', err.message || err);
    throw err;
  }
}
