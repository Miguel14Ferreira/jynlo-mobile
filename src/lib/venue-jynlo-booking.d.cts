export function parsePrice(value: string | null | undefined): number | null | undefined;
export function formatPrice(cents: number | null | undefined, language?: 'pt' | 'en'): string | null;
export function priceField(cents: number | null | undefined): string;
export function lisbonTime(iso: string): string;
export function lisbonDateTime(iso: string): string;
export function nextLisbonDays(count: number, from?: Date): string[];
export function validateHours(rows: {dayOfWeek: number; openTime: string; closeTime: string}[]): 'format' | 'order' | 'overlap' | null;
export function canCancel(booking: {status: string; startAt: string} | null | undefined, now?: Date): boolean;
export function createGameParams(booking: {id: number; venueId: number; startAt: string}, sport?: string | null):
 {venueId: string; bookingId: string; day: string; time: string; sport?: string};
