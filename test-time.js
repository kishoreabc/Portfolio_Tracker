const firstCandleTime = 1689306900; // Example time
const d = new Date(firstCandleTime * 1000);
const formatter = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Kolkata', year: 'numeric', month: 'numeric', day: 'numeric' });
const parts = formatter.formatToParts(d);
const year = parts.find(p => p.type === 'year').value;
const month = parts.find(p => p.type === 'month').value;
const day = parts.find(p => p.type === 'day').value;

const dateStr = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T03:45:00Z`;
const marketOpenTime = Math.floor(new Date(dateStr).getTime() / 1000);

console.log("Market Open Time:", new Date(marketOpenTime * 1000).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }));

const expectedTimes = [];
for (let i = 0; i < 75; i++) {
  expectedTimes.push(marketOpenTime + i * 300);
}
console.log("First:", new Date(expectedTimes[0] * 1000).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }));
console.log("Last:", new Date(expectedTimes[74] * 1000).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }));
