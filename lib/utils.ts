// Utility functions

export function formatPrice(price: number): string {
  return `$${price.toFixed(2)}`;
}

export function formatPriceVND(usdPrice: number, exchangeRate: number = 25000): string {
  const vnd = usdPrice * exchangeRate;
  return `${Math.round(vnd).toLocaleString('vi-VN')} ₫`;
}

export function calculateDiscount(originalPrice: number, currentPrice: number): number {
  if (originalPrice <= 0) return 0;
  return Math.round(((originalPrice - currentPrice) / originalPrice) * 100);
}

export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatTime(time: string): string {
  // Convert 24h time (HH:MM:SS) to 12h format
  const [hours, minutes] = time.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const hour12 = hours % 12 || 12;
  return `${hour12}:${minutes.toString().padStart(2, '0')} ${period}`;
}

export function downloadImage(url: string, filename: string): void {
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.target = '_blank';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function copyToClipboard(text: string): Promise<void> {
  if (navigator.clipboard && window.isSecureContext) {
    return navigator.clipboard.writeText(text);
  } else {
    // Fallback for older browsers
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    document.body.appendChild(textArea);
    textArea.select();
    try {
      document.execCommand('copy');
      document.body.removeChild(textArea);
      return Promise.resolve();
    } catch (error) {
      document.body.removeChild(textArea);
      return Promise.reject(error);
    }
  }
}

export async function shareContent(title: string, text: string, url?: string): Promise<void> {
  if (navigator.share) {
    await navigator.share({
      title,
      text,
      url,
    });
  } else {
    // Fallback to clipboard
    await copyToClipboard(text);
    alert('Content copied to clipboard!');
  }
}

export function classNames(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}
