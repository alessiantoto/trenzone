import { getAffiliateSession } from '@/app/actions/affiliate-auth';
import { redirect } from '@/i18n/routing';
import DashboardClient from './DashboardClient';
import { getAffiliateDashboardData } from '@/app/actions/affiliate-dashboard';
import { getServerExchangeRates } from '@/utils/pricing';

export default async function AffiliateDashboardPage({ 
  params 
}: { 
  params: Promise<{ locale: string }> 
}) {
  const resolvedParams = await params;
  const locale = resolvedParams?.locale === 'en' ? 'en' : 'ro';

  // Check auth
  const session = await getAffiliateSession();
  
  if (!session) {
    redirect({ href: '/affiliate/login', locale });
  }

  // Fetch stats & exchange rates
  const [res, exchangeRates] = await Promise.all([
    getAffiliateDashboardData(),
    getServerExchangeRates(),
  ]);
  if (!res.success || !res.data) {
    redirect({ href: '/affiliate/login', locale });
  }

  return <DashboardClient data={res.data as any} locale={locale} exchangeRates={exchangeRates} />;
}
