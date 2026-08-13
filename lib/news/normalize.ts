import { parse } from 'node-html-parser';

/**
 * WordPress/RSS boilerplate patterns to strip
 */
const BOILERPLATE_PATTERNS = [
  /The post .+? appeared first on .+?\./gi,
  /Continue reading →/gi,
  /Read more →/gi,
  /\[…\]/gi,
  /Filed under:.+/gi,
];

/**
 * Clean HTML content from RSS feeds.
 * - Strips all HTML tags
 * - Removes WordPress boilerplate
 * - Collapses excess whitespace
 * - Preserves meaningful paragraph breaks
 */
export function cleanHtml(html: string): string {
  if (!html) return '';

  // Parse HTML and extract text
  const root = parse(html);

  // Remove script, style, noscript elements
  root.querySelectorAll('script, style, noscript').forEach((el) => el.remove());

  // Get text with paragraph breaks
  let text = '';
  const paragraphs = root.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li');

  if (paragraphs.length > 0) {
    text = paragraphs
      .map((el) => el.text.trim())
      .filter((t) => t.length > 0)
      .join('\n\n');
  } else {
    // Fallback: extract all text
    text = root.text;
  }

  // Apply boilerplate stripping
  for (const pattern of BOILERPLATE_PATTERNS) {
    text = text.replace(pattern, '');
  }

  // Collapse multiple newlines/spaces
  text = text
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]+/g, ' ')
    .trim();

  return text;
}

/**
 * Clean a plain-text title (decode HTML entities, trim)
 */
export function cleanTitle(title: string): string {
  return title
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .trim();
}

/**
 * Translate known Tamil categories into English
 */
export function translateCategory(category: string | null): string | null {
  if (!category) return null;

  const categoryMap: Record<string, string> = {
    'சர்வதேச செய்திகள்': 'International News',
    'உள்நாட்டு செய்திகள்': 'Domestic News',
    'பிரீமியம் - தமிழ்': 'Premium',
    'பங்குச்சந்தை': 'Stock Market',
    'பங்கு சந்தை': 'Stock Market',
    'முக்கிய செய்திகள்': 'Breaking News',
    'வணிகம்': 'Business',
    'கிரிப்டோ': 'Crypto',
    'தங்கம்': 'Gold',
    'ரிலையன்ஸ்': 'Reliance',
    'டாடா': 'Tata',
    'இந்திய பொருளாதாரம்': 'Indian Economy',
    'பொருளாதாரம்': 'Economy',
    'கார் & பைக்': 'Auto',
    'ரியல் எஸ்டேட்': 'Real Estate',
    'மியூச்சுவல் ஃபண்ட்': 'Mutual Funds',
    'வங்கி': 'Banking',
    'Premium – English':'Premium'
  };

  return categoryMap[category.trim()] || category.trim();
}
