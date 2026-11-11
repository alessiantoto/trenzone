"use server";

import { Resend } from 'resend';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { rateLimiters, getClientIpFromHeaders, checkRateLimit } from '@/lib/ratelimit';
import { headers } from 'next/headers';

const resend = new Resend(process.env.RESEND_API_KEY!);

export async function sendContactMessage(formData: {
  name: string;
  email: string;
  subject: string;
  message: string;
  locale?: 'ro' | 'en';
}) {
  const isEn = formData.locale === 'en';
  try {
    const headersList = await headers();
    const ip = getClientIpFromHeaders(headersList);
    const { allowed } = await checkRateLimit(rateLimiters.contact, ip, 'contact');
    if (!allowed) {
      return {
        success: false,
        error: isEn
          ? "Too many messages sent. Please try again later."
          : "Prea multe mesaje trimise. Vă rugăm să încercați mai târziu."
      };
    }

    const escapeHtml = (unsafe: string) => {
      return unsafe
           .replace(/&/g, "&amp;")
           .replace(/</g, "&lt;")
           .replace(/>/g, "&gt;")
           .replace(/"/g, "&quot;")
           .replace(/'/g, "&#039;");
    };

    const cleanEmail = (formData.email || '').trim().toLowerCase().slice(0, 150);
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return { success: false, error: isEn ? "Invalid email address." : "Adresă de email invalidă." };
    }

    const name = escapeHtml(formData.name || '').slice(0, 100);
    const email = escapeHtml(cleanEmail);
    const subject = escapeHtml(formData.subject || '').slice(0, 150);
    const message = escapeHtml(formData.message || '').slice(0, 3000);
    
    console.log(`📨 [CONTACT ACTION] New message from ${name} (${email}) with subject: ${subject}`);

    if (!process.env.RESEND_API_KEY) {
      console.error("❌ [CONTACT ACTION] Missing RESEND_API_KEY!");
      return { success: false, error: "Configuration Error" };
    }

    const response = await resend.emails.send({
      from: 'TrenZone Contact <onboarding@resend.dev>',
      to: ['trenzone483@gmail.com'],
      reply_to: email,
      subject: `[Formular Contact] ${subject} - ${name}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; rounded: 12px; background: #ffffff;">
          <h2 style="color: #000000; font-size: 24px; font-weight: 800; border-bottom: 2px solid #eaeaea; padding-bottom: 10px; text-transform: uppercase;">
            Mesaj Nou de Contact
          </h2>
          <table style="width: 100%; margin-top: 20px; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; font-weight: bold; color: #666666; width: 120px;">Nume Client:</td>
              <td style="padding: 8px 0; color: #000000;">${name}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold; color: #666666;">Email Client:</td>
              <td style="padding: 8px 0; color: #000000;">
                <a href="mailto:${email}" style="color: #000000; text-decoration: underline;">${email}</a>
              </td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold; color: #666666;">Subiect:</td>
              <td style="padding: 8px 0; color: #000000; font-weight: bold;">${subject}</td>
            </tr>
          </table>
          <div style="margin-top: 30px; padding: 20px; background: #f9f9f9; border-radius: 8px; border: 1px solid #eeeeee;">
            <p style="margin: 0; font-weight: bold; color: #666666; margin-bottom: 10px; font-size: 11px; text-transform: uppercase; tracking: 0.1em;">Mesajul Trimis:</p>
            <p style="margin: 0; color: #333333; line-height: 1.6; white-space: pre-wrap;">${message}</p>
          </div>
          <div style="margin-top: 30px; border-top: 1px solid #eaeaea; padding-top: 20px; text-align: center;">
            <a href="mailto:${email}" style="display: inline-block; background: #000000; color: #ffffff; text-decoration: none; padding: 12px 30px; font-weight: bold; font-size: 12px; text-transform: uppercase; letter-spacing: 0.1em; border-radius: 8px;">
              Răspunde Clientului
            </a>
          </div>
        </div>
      `
    });

    if (response.error) {
      console.error("❌ [CONTACT ACTION] Resend Error:", response.error);
      return { success: false, error: response.error.message || "Failed to send email." };
    }

    // Save to database so it appears in the Admin Panel
    const { error: dbError } = await supabaseAdmin.from('contact_messages').insert([{
      name,
      email,
      message: `[Subiect: ${subject}]\n\n${message}`
    }]);
    
    if (dbError) {
      console.error("❌ [CONTACT ACTION] Supabase Error:", dbError);
      // We still return success since the email was sent, but we log the error.
    }

    console.log("✅ [CONTACT ACTION] Email successfully delivered to trenzone483@gmail.com.");
    return { success: true };
  } catch (error: any) {
    console.error("❌ [CONTACT ACTION] Exception:", error.message || error);
    return { success: false, error: error.message || "Unknown error occurred." };
  }
}

import { isAdminAuthorized } from './admin-auth';

export async function sendContactReply(data: {
  toEmail: string;
  clientName: string;
  subject: string;
  replyMessage: string;
}) {
  const isAuth = await isAdminAuthorized();
  if (!isAuth) throw new Error("Acces neautorizat.");

  if (!process.env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY nu este configurat.");
  }

  const { toEmail, clientName, subject, replyMessage } = data;
  if (!toEmail || !replyMessage) {
    return { success: false, error: "Destinatarul sau mesajul lipsește." };
  }

  try {
    const escapeHtml = (str: string) =>
      String(str || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

    const safeSubject = escapeHtml(subject);
    const safeReplyMessage = escapeHtml(replyMessage);

    const formattedHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0;">
        <div style="background: #000000; padding: 24px; text-align: center;">
          <img src="https://www.trenzone.fit/images/logos/trenzone_logo.webp" alt="TrenZone" style="height: 48px; object-fit: contain; margin: 0 auto;" />
        </div>
        <div style="padding: 32px 24px;">
          <h2 style="font-size: 20px; font-weight: 800; color: #0f172a; margin-top: 0; margin-bottom: 8px;">
            Răspuns Echipa TrenZone
          </h2>
          <p style="font-size: 14px; color: #64748b; margin-top: 0; margin-bottom: 24px;">
            Referitor la solicitarea ta: <strong>${safeSubject}</strong>
          </p>
          <div style="background: #f8fafc; border-left: 4px solid #e32f8c; padding: 18px; border-radius: 8px; font-size: 14px; color: #1e293b; line-height: 1.6; white-space: pre-wrap; margin-bottom: 24px;">${safeReplyMessage}</div>
          <p style="font-size: 13px; color: #64748b; line-height: 1.5;">
            Dacă mai ai alte întrebări sau dorești detalii suplimentare, poți răspunde direct la acest email.
          </p>
        </div>
        <div style="background: #000000; padding: 20px; text-align: center; border-top: 1px solid #1e293b;">
          <p style="font-size: 11px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.1em; margin: 0 0 6px 0;">
            TrenZone Support & Operations
          </p>
          <p style="font-size: 10px; color: #64748b; margin: 0;">
            © 2026 TrenZone. Toate drepturile rezervate.
          </p>
        </div>
      </div>
    `;

    const fromAddress = process.env.RESEND_FROM_EMAIL || 'TrenZone Support <contact@trenzone.fit>';

    const res = await resend.emails.send({
      from: fromAddress,
      to: [toEmail],
      reply_to: 'trenzone483@gmail.com',
      subject: subject.startsWith('Re:') ? subject : `Re: ${subject}`,
      html: formattedHtml
    });

    if (res.error) {
      console.error("❌ [CONTACT REPLY] Resend Error:", res.error);
      return { success: false, error: res.error.message };
    }

    return { success: true };
  } catch (err: any) {
    console.error("❌ [CONTACT REPLY] Error:", err);
    return { success: false, error: err.message || "Eroare la trimiterea răspunsului." };
  }
}

