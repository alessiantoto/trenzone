import { google } from 'googleapis';

// 🛡️ SECURITY & CONFIG CLEANUP: Ensure IDs and keys are formatted perfectly
let propertyId = process.env.GA4_PROPERTY_ID;
if (propertyId && propertyId.includes('=')) {
  // Extract only the part after '=' if the user accidentally pasted the whole line
  propertyId = propertyId.split('=').pop() || propertyId;
}
// Further cleanup for any non-numeric characters in propertyId
propertyId = propertyId?.replace(/\D/g, '') || '';

const clientEmail = process.env.GA4_CLIENT_EMAIL?.replace(/^"|"$/g, '');
let privateKey = process.env.GA4_PRIVATE_KEY;
if (privateKey) {
  // Remove any extra quotes (if the user pasted them from the JSON)
  privateKey = privateKey.replace(/^"|"$/g, '');
  // Fix newline characters (\n should be actual newlines)
  privateKey = privateKey.replace(/\\n/g, '\n');
}

const auth = new google.auth.JWT({
  email: clientEmail,
  key: privateKey,
  scopes: [
    'https://www.googleapis.com/auth/analytics.readonly',
    'https://www.googleapis.com/auth/webmasters.readonly'
  ]
});

const analyticsData = google.analyticsdata({
  version: 'v1beta',
  auth: auth
});

export async function getBasicAnalytics() {
  if (!propertyId || !clientEmail || !privateKey) {
    console.warn('⚠️ [GA4 ENGINE] Missing credentials. Returning null.');
    return null;
  }

  try {
    // 1. Fetch Real-time Active Users
    const realtimeResponse = await analyticsData.properties.runRealtimeReport({
      property: `properties/${propertyId}`,
      requestBody: {
        metrics: [{ name: 'activeUsers' }]
      }
    });

    const activeUsers = realtimeResponse.data.rows?.[0]?.metricValues?.[0]?.value || '0';

    // 2. Fetch Historical Data (Last 30 days)
    const historicalResponse = await (analyticsData.properties.runReport({
      property: `properties/${propertyId}`,
      requestBody: {
        dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
        metrics: [
          { name: 'activeUsers' },
          { name: 'sessions' },
          { name: 'screenPageViews' },
          { name: 'conversions' }
        ],
        dimensions: [{ name: 'date' }],
        metricAggregations: ['TOTAL']
      }
    }) as any);

    // 3. Fetch Top Referral Sources
    const referrerResponse = await (analyticsData.properties.runReport({
      property: `properties/${propertyId}`,
      requestBody: {
        dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
        metrics: [{ name: 'sessions' }],
        dimensions: [{ name: 'sessionSource' }],
        limit: '10'
      }
    }) as any);

    // 4. Fetch Top Countries
    const countryResponse = await (analyticsData.properties.runReport({
      property: `properties/${propertyId}`,
      requestBody: {
        dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
        metrics: [{ name: 'sessions' }],
        dimensions: [{ name: 'country' }],
        limit: '5'
      }
    }) as any);

    const referrers = referrerResponse.data.rows?.map((row: any) => ({
      name: row.dimensionValues?.[0]?.value || 'direct',
      count: parseInt(row.metricValues?.[0]?.value || '0')
    })) || [];

    const countries = countryResponse.data.rows?.map((row: any) => ({
      name: row.dimensionValues?.[0]?.value || 'Unknown',
      count: parseInt(row.metricValues?.[0]?.value || '0')
    })) || [];

    return processGAResponse(historicalResponse.data, activeUsers, referrers, countries);
  } catch (error: any) {
    console.error('❌ [GA4 ENGINE] Error fetching real data:', error.message);
    return null;
  }
}

function processGAResponse(data: any, activeNow: string, referrers: any[], countries: any[]) {
  // Sort rows by date to ensure the chart is chronological
  const sortedRows = [...(data.rows || [])].sort((a, b) => 
    a.dimensionValues[0].value.localeCompare(b.dimensionValues[0].value)
  );

  const chartData = sortedRows.map((row: any) => ({
    date: formatDate(row.dimensionValues[0].value),
    users: parseInt(row.metricValues[0].value),
    sessions: parseInt(row.metricValues[1].value)
  }));

  const totals = {
    activeUsers: activeNow,
    totalVisitors: data.totals?.[0]?.metricValues?.[0]?.value || '0',
    sessions: data.totals?.[0]?.metricValues?.[1]?.value || '0',
    pageViews: data.totals?.[0]?.metricValues?.[2]?.value || '0',
    conversions: data.totals?.[0]?.metricValues?.[3]?.value || '0',
  };

  return { chartData, totals, referrers, countries };
}

function formatDate(dateStr: string) {
  const day = dateStr.slice(6, 8);
  const month = dateStr.slice(4, 6);
  return `${day}/${month}`;
}

function getMockAnalytics() {
  const chartData = Array.from({ length: 30 }, (_, i) => ({
    date: `${i + 1}/04`,
    users: Math.floor(Math.random() * 200) + 100,
    sessions: Math.floor(Math.random() * 300) + 150
  }));

  return {
    chartData,
    totals: { 
      activeUsers: '0', 
      totalVisitors: '4,520', 
      sessions: '7,310', 
      pageViews: '12,400', 
      conversions: '84' 
    }
  };
}

export async function getTopKeywords() {
  if (!clientEmail || !privateKey) return null;
  try {
    const webmasters = google.webmasters({
      version: 'v3',
      auth: auth
    });
    const sites = [
      "sc-domain:trenzone.fit",
      "https://www.trenzone.fit",
      "https://www.trenzone.fit",
      "sc-domain:trenzone.fit",
      "https://www.trenzone.fit",
      "https://www.trenzone.fit"
    ];
    
    for (const site of sites) {
      try {
        const response = await webmasters.searchanalytics.query({
          siteUrl: site,
          requestBody: {
            startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            endDate: new Date().toISOString().split('T')[0],
            dimensions: ["query"],
            rowLimit: 10
          }
        });
        
        if (response.data.rows && response.data.rows.length > 0) {
          return response.data.rows.map((row: any) => ({
            query: row.keys?.[0] || 'necunoscut',
            clicks: row.clicks || 0,
            impressions: row.impressions || 0,
            ctr: parseFloat(((row.ctr || 0) * 100).toFixed(1)),
            position: parseFloat((row.position || 0).toFixed(1))
          }));
        }
      } catch (err: any) {
        // Silent catch for individual site attempt
      }
    }
    return null;
  } catch (error: any) {
    console.error("⚠️ [GSC ENGINE] Direct query failed:", error.message);
    return null;
  }
}
