"use server";

import { supabaseAdmin } from "@/lib/supabase-admin";
import { isAdminAuthorized } from "./admin-auth";
import { sendBroadcastBatch } from "@/lib/resend-service";
import { revalidatePath, revalidateTag } from 'next/cache';
import { r2, getR2PublicBaseUrl, uploadToR2, deleteFromR2 } from '@/lib/r2';
import { PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export async function uploadInfluencerVideo(formData: FormData) {
  const isAuth = await isAdminAuthorized();
  if (!isAuth) throw new Error("Neautorizat");

  const file = formData.get('file') as File;
  if (!file) throw new Error("Fisier lipsa");

  const fileExtension = file.name.split('.').pop()?.toLowerCase();
  const supportedVideo = file.type === 'video/mp4' || file.type === 'video/webm'
    || fileExtension === 'mp4' || fileExtension === 'webm';
  if (!supportedVideo) {
    throw new Error('Format incompatibil. Încarcă un video MP4 (H.264) sau WebM.');
  }

  const fileExt = fileExtension || 'mp4';
  const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
  
  const bucketName = process.env.R2_BUCKET_NAME;
  const baseUrl = getR2PublicBaseUrl();
  if (!bucketName || !baseUrl) throw new Error("R2 not configured");

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: fileName,
    Body: buffer,
    ContentType: file.type || 'video/mp4',
  });

  await r2.send(command);

  const finalUrl = `${baseUrl}/${fileName}`;

  return { success: true, url: finalUrl };
}

export async function getSignedVideoUploadUrl(fileName: string, contentType: string) {
  const isAuth = await isAdminAuthorized();
  if (!isAuth) throw new Error("Neautorizat");

  const fileExtension = fileName.split('.').pop()?.toLowerCase();
  const supportedVideo = contentType === 'video/mp4' || contentType === 'video/webm'
    || fileExtension === 'mp4' || fileExtension === 'webm' || fileExtension === 'mov';
    
  if (!supportedVideo) {
    throw new Error('Format incompatibil. Încarcă un video MP4, MOV sau WebM.');
  }

  const fileExt = fileExtension || 'mp4';
  const newFileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

  const bucketName = process.env.R2_BUCKET_NAME;
  const baseUrl = getR2PublicBaseUrl();
  if (!bucketName || !baseUrl) throw new Error("R2 not configured");

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: newFileName,
    ContentType: contentType,
  });

  const signedUrl = await getSignedUrl(r2, command, { expiresIn: 3600 });
  const publicUrl = `${baseUrl}/${newFileName}`;

  return {
    success: true,
    signedUrl,
    token: "r2-token",
    path: newFileName,
    publicUrl
  };
}

import { InfluencerVideo } from '@/lib/api';

export interface CampaignFormData {
  subject: string;
  title: string;
  message: string;
  ctaText?: string;
  ctaLink?: string;
  imageUrl?: string;
  segment: 'all' | 'subscribers' | 'customers' | 'test' | 'custom';
  customRecipients?: string[];
}

/**
 * SEND MARKETING CAMPAIGN
 * Logic for fetching recipients and distributing broadcast emails.
 */
export async function sendMarketingCampaign(data: CampaignFormData) {
  const isAuthorized = await isAdminAuthorized();
  if (!isAuthorized) throw new Error("Acces neautorizat.");

  console.log(`📣 [ADMIN MARKETING] Starting campaign: ${data.subject} to ${data.segment}`);

  try {
    let recipients: string[] = [];

    // 1. DETERMINE RECIPIENTS
    if (data.segment === 'test') {
      recipients = ["trenzone483@gmail.com"]; // Official contact email
    } else if (data.segment === 'custom') {
      recipients = data.customRecipients || [];
    } else if (data.segment === 'subscribers') {
      const { data: subs } = await supabaseAdmin
        .from('subscribers')
        .select('email')
        .eq('is_active', true);
      recipients = subs?.map(s => s.email?.trim().toLowerCase()).filter(Boolean) || [];
    } else if (data.segment === 'customers') {
      const { data: orders } = await supabaseAdmin
        .from('orders')
        .select('customer_email');
      // Unique emails only
      recipients = Array.from(new Set(orders?.map(o => o.customer_email?.trim().toLowerCase()).filter(Boolean) || []));
    } else if (data.segment === 'all') {
      // Both active subscribers and ordering customers
      const [subsRes, ordersRes] = await Promise.all([
        supabaseAdmin.from('subscribers').select('email').eq('is_active', true),
        supabaseAdmin.from('orders').select('customer_email')
      ]);
      const subEmails = subsRes.data?.map(s => s.email?.trim().toLowerCase()).filter(Boolean) || [];
      const orderEmails = ordersRes.data?.map(o => o.customer_email?.trim().toLowerCase()).filter(Boolean) || [];
      recipients = Array.from(new Set([...subEmails, ...orderEmails]));
    }

    // Clean and lowercase all emails
    recipients = Array.from(new Set(recipients.map(e => e.trim().toLowerCase()).filter(e => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e))));

    // 2. FILTER UNSUBSCRIBED EMAILS
    if (recipients.length > 0) {
      const { data: unsubscribed } = await supabaseAdmin
        .from('unsubscribed_emails')
        .select('email')
        .in('email', recipients);
        
      if (unsubscribed && unsubscribed.length > 0) {
        const unsubSet = new Set(unsubscribed.map(u => u.email?.toLowerCase()));
        recipients = recipients.filter(email => !unsubSet.has(email));
        console.log(`🛡️ [ADMIN MARKETING] Filtered out ${unsubscribed.length} unsubscribed emails.`);
      }
    }

    if (recipients.length === 0) {
      return { success: false, error: "Nu au fost găsiți destinatari validi (sau toți sunt dezabonați)." };
    }

    // 3. BATCH SENDING (Resend limit: ~50 per batch for better deliverability)
    const BATCH_SIZE = 50;
    const batches = [];
    for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
      batches.push(recipients.slice(i, i + BATCH_SIZE));
    }

    console.log(`📦 [ADMIN MARKETING] Sending in ${batches.length} batches to ${recipients.length} recipients...`);

    const results = [];
    for (const batch of batches) {
      const res = await sendBroadcastBatch(batch, data.subject, {
        title: data.title,
        message: data.message,
        ctaText: data.ctaText,
        ctaLink: data.ctaLink,
        imageUrl: data.imageUrl,
        locale: 'ro'
      });
      results.push(res);
    }

    // 4. LOG TO DB (Stored inside JSON body for rich metadata)
    const sentToLabel = data.segment === 'all' 
      ? 'all_contacts' 
      : (data.segment === 'subscribers' 
        ? 'all_subscribers' 
        : (data.segment === 'customers' ? 'all_customers' : data.segment));

    await supabaseAdmin.from('email_broadcasts').insert({
      subject: data.subject,
      body: JSON.stringify({
        title: data.title,
        message: data.message,
        ctaText: data.ctaText || '',
        ctaLink: data.ctaLink || '',
        imageUrl: data.imageUrl || '',
        recipientCount: recipients.length
      }),
      status: 'sent',
      sent_to: sentToLabel,
      sent_at: new Date().toISOString()
    });

    return { 
      success: true, 
      recipientCount: recipients.length, 
      batchCount: batches.length 
    };

  } catch (error: any) {
    console.error("❌ [ADMIN MARKETING] Campaign Failed:", error);
    return { success: false, error: error.message || "Eroare la trimiterea campaniei." };
  }
}

/**
 * FETCH SUBSCRIBERS LIST WITH SOURCE DETAILS
 */
export async function getAdminSubscribersList() {
  const isAuthorized = await isAdminAuthorized();
  if (!isAuthorized) throw new Error("Acces neautorizat.");

  const { data, error } = await supabaseAdmin
    .from('subscribers')
    .select('*')
    .order('subscribed_at', { ascending: false });

  if (error) {
    console.error("❌ [ADMIN MARKETING] Error fetching subscribers:", error);
    return [];
  }

  return (data || []).map(s => ({
    id: s.id,
    email: s.email,
    fullName: s.full_name || 'Anonim',
    locale: s.locale || 'ro',
    source: s.source || 'direct',
    isActive: s.is_active ?? true,
    subscribedAt: s.subscribed_at || new Date().toISOString()
  }));
}

/**
 * FETCH AUDIENCE STATS
 */
export async function getMarketingAudienceStats() {
  const isAuthorized = await isAdminAuthorized();
  if (!isAuthorized) throw new Error("Acces neautorizat.");

  const [subsRes, ordersRes, broadcastsRes] = await Promise.all([
    supabaseAdmin.from('subscribers').select('id, email, source, is_active'),
    supabaseAdmin.from('orders').select('customer_email'),
    supabaseAdmin.from('email_broadcasts').select('id', { count: 'exact' })
  ]);

  const subscribers = subsRes.data || [];
  const activeSubscribers = subscribers.filter(s => s.is_active !== false);
  const activeSubEmails = new Set(activeSubscribers.map(s => s.email?.toLowerCase()).filter(Boolean));

  const customerEmails = Array.from(new Set(ordersRes.data?.map(o => o.customer_email?.toLowerCase()).filter(Boolean) || []));
  const customerEmailSet = new Set(customerEmails);

  // Total unique contacts
  const allUniqueEmails = new Set([...Array.from(activeSubEmails), ...customerEmails]);

  // Breakdown by sources
  const sourceBreakdown: Record<string, number> = {
    footer: 0,
    'promo-popup': 0,
    checkout: 0,
    modal: 0,
    other: 0
  };

  subscribers.forEach(s => {
    const src = (s.source || '').toLowerCase();
    if (src.includes('footer')) {
      sourceBreakdown.footer++;
    } else if (src.includes('popup') || src.includes('scratch') || src.includes('promo')) {
      sourceBreakdown['promo-popup']++;
    } else if (src.includes('checkout')) {
      sourceBreakdown.checkout++;
    } else if (src.includes('modal')) {
      sourceBreakdown.modal++;
    } else {
      sourceBreakdown.other++;
    }
  });

  return {
    totalAudience: allUniqueEmails.size,
    subscribersCount: activeSubscribers.length,
    customersCount: customerEmailSet.size,
    campaignsCount: broadcastsRes.count || broadcastsRes.data?.length || 0,
    sourceBreakdown
  };
}

/**
 * TOGGLE SUBSCRIBER STATUS
 */
export async function toggleSubscriberActiveStatus(id: string, isActive: boolean) {
  const isAuthorized = await isAdminAuthorized();
  if (!isAuthorized) throw new Error("Acces neautorizat.");

  const { error } = await supabaseAdmin
    .from('subscribers')
    .update({ is_active: isActive })
    .eq('id', id);

  if (error) {
    console.error("❌ [ADMIN MARKETING] Toggle error:", error);
    throw new Error(error.message);
  }

  return { success: true };
}

export async function uploadCampaignImage(formData: FormData) {
  const isAuthorized = await isAdminAuthorized();
  if (!isAuthorized) throw new Error('Neautorizat');

  const file = formData.get('file') as File;
  if (!file) {
    throw new Error('No file provided');
  }

  const rawExt = (file.name.split('.').pop() || '').toLowerCase();
  const allowedExts = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'avif'];
  const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'];
  if (!allowedExts.includes(rawExt) || (file.type && !allowedMimes.includes(file.type))) {
    throw new Error('Format de imagine nepermis.');
  }
  const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${rawExt}`;
  const filePath = `marketing/campaigns/${fileName}`;

  // 1. Prefer Cloudflare R2 if configured
  const r2Base = getR2PublicBaseUrl();
  if (process.env.R2_BUCKET_NAME && r2Base) {
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const r2Url = await uploadToR2(buffer, filePath, file.type || `image/${rawExt === 'jpg' ? 'jpeg' : rawExt}`);
    return {
      success: true,
      url: r2Url
    };
  }

  // 2. Fallback to Supabase Storage
  const { error } = await supabaseAdmin.storage
    .from('marketing')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type || `image/${rawExt === 'jpg' ? 'jpeg' : rawExt}`
    });

  if (error) {
    console.error('Upload error:', error);
    throw new Error(error.message);
  }

  const { data: publicUrlData } = supabaseAdmin.storage
    .from('marketing')
    .getPublicUrl(filePath);

  return { 
    success: true, 
    url: publicUrlData.publicUrl 
  };
}

export async function deleteMarketingCampaign(id: number, imageUrl?: string) {
  const isAuthorized = await isAdminAuthorized();
  if (!isAuthorized) throw new Error('Neautorizat');

  // 1. Delete from DB
  const { error: dbError } = await supabaseAdmin
    .from('email_broadcasts')
    .delete()
    .eq('id', id);

  if (dbError) {
    console.error('Error deleting broadcast log:', dbError);
    throw new Error(dbError.message);
  }

  // 2. Delete from R2 or storage if exists
  if (imageUrl) {
    try {
      const r2Base = getR2PublicBaseUrl();
      if (imageUrl.includes('r2.dev') || (r2Base && imageUrl.includes(r2Base))) {
        await deleteFromR2(imageUrl).catch(e => console.error('Failed to delete campaign image from R2:', e));
      } else {
        const urlParts = imageUrl.split('/public/marketing/');
        if (urlParts.length > 1) {
          const filePath = urlParts[1];
          const { error: storageError } = await supabaseAdmin.storage
            .from('marketing')
            .remove([filePath]);
            
          if (storageError) {
            console.error('Failed to delete campaign image from storage:', storageError);
          }
        }
      }
    } catch (e) {
      console.error('Failed to parse image URL for deletion', e);
    }
  }

  return { success: true };
}

// ==========================================
// INFLUENCERS
// ==========================================

export async function getInfluencersAdmin(): Promise<InfluencerVideo[]> {
  const isAuthorized = await isAdminAuthorized();
  if (!isAuthorized) return [];

  const { data, error } = await supabaseAdmin
    .from('influencers')
    .select('*')
    .order('display_order', { ascending: true })
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching influencers:', error);
    return [];
  }
  return data as InfluencerVideo[];
}

export async function addInfluencerAdmin(data: Partial<InfluencerVideo>) {
  const isAuthorized = await isAdminAuthorized();
  if (!isAuthorized) throw new Error("Neautorizat");

  const { error } = await supabaseAdmin
    .from('influencers')
    .insert([{ ...data, is_active: data.is_active ?? true }]);

  if (error) throw error;
  revalidateTag('influencers', 'max');
  revalidatePath('/[locale]', 'page');
  revalidatePath('/admin/influencers');
  return { success: true };
}

export async function updateInfluencerAdmin(id: string, data: Partial<InfluencerVideo>) {
  const isAuthorized = await isAdminAuthorized();
  if (!isAuthorized) throw new Error("Neautorizat");

  // Check if video_url changed, delete old one
  if (data.video_url) {
    const { data: oldInf } = await supabaseAdmin.from('influencers').select('video_url').eq('id', id).single();
    if (oldInf && oldInf.video_url && oldInf.video_url !== data.video_url) {
      await deleteInfluencerVideoFromStorage(oldInf.video_url);
    }
  }

  const { error } = await supabaseAdmin
    .from('influencers')
    .update(data)
    .eq('id', id);

  if (error) throw error;
  revalidateTag('influencers', 'max');
  revalidatePath('/[locale]', 'page');
  revalidatePath('/admin/influencers');
  return { success: true };
}

export async function deleteInfluencerVideoFromStorage(videoUrl: string) {
  try {
    const isAuthorized = await isAdminAuthorized();
    if (!isAuthorized) throw new Error("Neautorizat");
    if (!videoUrl) return;

    const r2PublicUrl = getR2PublicBaseUrl();
    if (videoUrl.includes('r2.dev') || (r2PublicUrl && videoUrl.includes(r2PublicUrl))) {
      const bucketName = process.env.R2_BUCKET_NAME;
      if (!bucketName) return;
      
      const fileName = videoUrl.split('/').pop()?.split('?')[0].split('#')[0];
      if (fileName) {
        const command = new DeleteObjectCommand({
          Bucket: bucketName,
          Key: fileName,
        });
        await r2.send(command).catch(e => console.error('Failed to delete from R2', e));
      }
      return;
    }

    if (!videoUrl.includes('/public/influencers/')) return;
    
    const urlParts = videoUrl.split('/public/influencers/');
    if (urlParts.length > 1) {
      let filePath = urlParts[1];
      filePath = filePath.split('#')[0].split('?')[0];
      
      const { error: storageError } = await supabaseAdmin.storage
        .from('influencers')
        .remove([filePath]);
        
      if (storageError) {
        console.error('Eroare la stergerea clipului influencerului:', storageError);
      }
    }
  } catch (e) {
    console.error('Failed to parse influencer video URL for deletion', e);
  }
}

export async function deleteInfluencerAdmin(id: string, videoUrl?: string) {
  const isAuthorized = await isAdminAuthorized();
  if (!isAuthorized) throw new Error("Neautorizat");

  // Întâi ștergem fișierul fizic (dacă e în supabase)
  if (videoUrl) {
    await deleteInfluencerVideoFromStorage(videoUrl);
  }

  // Apoi ștergem rândul
  const { error } = await supabaseAdmin
    .from('influencers')
    .delete()
    .eq('id', id);

  if (error) throw error;
  revalidateTag('influencers', 'max');
  revalidatePath('/[locale]', 'page');
  revalidatePath('/admin/influencers');
  return { success: true };
}

export async function reorderInfluencersAdmin(updates: { id: string; display_order: number }[]) {
  const isAuthorized = await isAdminAuthorized();
  if (!isAuthorized) throw new Error("Neautorizat");

  // Supabase doesn't have bulk update via JS, so we'll do promises
  const promises = updates.map(update => 
    supabaseAdmin.from('influencers').update({ display_order: update.display_order }).eq('id', update.id)
  );
  
  await Promise.all(promises);
  revalidateTag('influencers', 'max');
  revalidatePath('/[locale]', 'page');
  revalidatePath('/admin/influencers');
  return { success: true };
}
