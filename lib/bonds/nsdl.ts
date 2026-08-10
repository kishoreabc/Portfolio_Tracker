import https from 'https';
import type { NsdlCashFlowItem, NsdlCashFlowResponse } from '@/types/bonds';

const nsdlHttpsAgent = new https.Agent({
  rejectUnauthorized: false,
});

/**
 * Fetch official coupon and cashflow details for a given ISIN from NSDL BDS API
 */
export async function fetchNsdlCashFlow(isin: string): Promise<NsdlCashFlowResponse> {
  const cleanIsin = isin.trim().toUpperCase();

  if (!cleanIsin || !/^[A-Z0-9]{12}$/.test(cleanIsin)) {
    return {
      isin: cleanIsin,
      status: 400,
      message: 'Invalid ISIN format',
      cashFlowSchedule: [],
    };
  }

  return new Promise((resolve) => {
    const options: https.RequestOptions = {
      hostname: 'www.indiabondinfo.nsdl.com',
      path: `/bds-service/v1/public/bdsinfo/coupondetail?isin=${encodeURIComponent(cleanIsin)}`,
      method: 'GET',
      agent: nsdlHttpsAgent,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Referer': 'https://www.indiabondinfo.nsdl.com/',
      },
    };

    const req = https.request(options, (res) => {
      let rawData = '';

      res.on('data', (chunk) => {
        rawData += chunk;
      });

      res.on('end', () => {
        try {
          const json = JSON.parse(rawData);
          const status = json.status ?? res.statusCode ?? 200;
          const message = json.message ?? 'Success';
          const description = json.description ?? null;

          let schedule: NsdlCashFlowItem[] = [];
          if (json.params?.cashFlowDetails?.cashFlowSchedule && Array.isArray(json.params.cashFlowDetails.cashFlowSchedule)) {
            schedule = json.params.cashFlowDetails.cashFlowSchedule;
          } else if (json.coupensVo?.cashFlowScheduleDetails?.cashFlowSchedule && Array.isArray(json.coupensVo.cashFlowScheduleDetails.cashFlowSchedule)) {
            schedule = json.coupensVo.cashFlowScheduleDetails.cashFlowSchedule;
          }

          resolve({
            isin: cleanIsin,
            status,
            message,
            description,
            cashFlowSchedule: schedule,
            fetchedAt: new Date().toISOString(),
          });
        } catch {
          resolve({
            isin: cleanIsin,
            status: 500,
            message: 'Failed to parse response from NSDL BDS API',
            cashFlowSchedule: [],
          });
        }
      });
    });

    req.on('error', (err) => {
      resolve({
        isin: cleanIsin,
        status: 502,
        message: `Network error connecting to NSDL API: ${err.message}`,
        cashFlowSchedule: [],
      });
    });

    req.end();
  });
}
