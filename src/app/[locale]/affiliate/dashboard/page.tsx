import { getAffiliateSession } from '@/app/actions/affiliate-auth';
import { redirect } from '@/i18n/routing';
import { supabaseAdmin } from '@/lib/supabase-admin';
import DashboardClient from './DashboardClient';
import { getAffiliateDashboardData } from '@/app/actions/affiliate-dashboard';
import { getServerExchangeRates } from '@/utils/pricing';

export default async function AffiliateDashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const resolvedParams = await params;
  const locale = resolvedParams?.locale === 'en' ? 'en' : 'ro';

  // Check auth
  const session = await getAffiliateSession();

  if (!session) {
    redirect({ href: '/affiliate/login', locale });
    return null;
  }

  // Always enforce the affiliate's registered form language (guarding against stale cookies too)
  const { data: affiliateLocaleRow } = await supabaseAdmin
    .from('affiliates')
    .select('social_links')
    .eq('id', session.id)
    .maybeSingle();

  const dbLocale = (affiliateLocaleRow?.social_links as { locale?: unknown } | null)?.locale;
  const targetLocale: 'ro' | 'en' =
    dbLocale === 'en' || dbLocale === 'ro'
      ? dbLocale
      : session.locale === 'en'
        ? 'en'
        : 'ro';

  if (targetLocale !== locale) {
    redirect({ href: '/affiliate/dashboard', locale: targetLocale });
    return null;
  }

  // Fetch stats & exchange rates
  const [res, exchangeRates] = await Promise.all([
    getAffiliateDashboardData(),
    getServerExchangeRates(),
  ]);

  if (!res.success || !res.data) {
    redirect({ href: '/affiliate/login', locale });
    return null;
  }

  return (
    <DashboardClient
      data={res.data}
      locale={locale}
      exchangeRates={exchangeRates}
    />
  );
}
