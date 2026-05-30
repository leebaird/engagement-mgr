export function formatPhone(phone: string | null | undefined): string {
  if (!phone) return '-';

  const digits = phone.replace(/\D/g, '');

  if (digits.length === 10) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  }

  // Return original if not a standard 10-digit US number
  return phone;
}
