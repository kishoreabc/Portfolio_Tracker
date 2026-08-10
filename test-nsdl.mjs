import https from 'https';

export async function fetchNsdlCashFlow(isin) {
  const cleanIsin = isin.trim().toUpperCase();
  return new Promise((resolve) => {
    const options = {
      hostname: 'www.indiabondinfo.nsdl.com',
      path: `/bds-service/v1/public/bdsinfo/coupondetail?isin=${encodeURIComponent(cleanIsin)}`,
      method: 'GET',
      agent: new https.Agent({ rejectUnauthorized: false }),
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Referer': 'https://www.indiabondinfo.nsdl.com/',
      },
    };
    const req = https.request(options, (res) => {
      let rawData = '';
      res.on('data', (chunk) => rawData += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(rawData);
          let schedule = [];
          
          if (json.params?.cashFlowDetails?.cashFlowSchedule && Array.isArray(json.params.cashFlowDetails.cashFlowSchedule)) {
            schedule = json.params.cashFlowDetails.cashFlowSchedule;
          }

          resolve({
            isin: cleanIsin,
            scheduleLen: schedule.length,
            rawParamsHasCashFlowDetails: !!json.params?.cashFlowDetails,
            rawParamsHasCashFlowSchedule: Array.isArray(json.params?.cashFlowDetails?.cashFlowSchedule)
          });
        } catch(e) {
          resolve({ error: e.message, raw: rawData.slice(0, 100) });
        }
      });
    });
    req.on('error', (err) => resolve({ error: err.message }));
    req.end();
  });
}

fetchNsdlCashFlow('INE046W07339').then(console.log);
