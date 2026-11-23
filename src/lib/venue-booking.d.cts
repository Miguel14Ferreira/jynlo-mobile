export type VenueBookingAction =
  | { kind: 'free' }
  | { kind: 'link'; url: string }
  | { kind: 'phone'; url: string; whatsapp: string | null }
  | { kind: 'search'; url: string };
export function safeBookingUrl(raw: string | null | undefined): string | null;
export function telephoneUrl(contact: string | null | undefined): string | null;
export function whatsAppUrl(tel: string | null): string | null;
export function venueBookingAction(venue: {
  name?: string | null; city?: string | null; contact?: string | null;
  bookingUrl?: string | null; website?: string | null; freeAccess?: boolean | null;
} | null | undefined): VenueBookingAction | null;
