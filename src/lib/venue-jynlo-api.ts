import {request} from './api';

export interface BookingCourt {id:number;name:string;sport:string|null;priceCents:number|null;slotMinutes:number;active:boolean}
export interface BookingHours {dayOfWeek:number;openTime:string;closeTime:string}
export interface BookingOffer {venueId:number;acceptsBookings:boolean;courts:BookingCourt[];hours:BookingHours[];paymentMethod?:'MBWAY'|'IN_PERSON'|null;mbwayPhone?:string|null}
export interface BookingSlot {start:string;end:string;free:boolean}
export interface CourtSlots {courtId:number;name:string;sport:string|null;priceCents:number|null;slotMinutes:number;slots:BookingSlot[]}
export interface DaySlots {venueId:number;date:string;courts:CourtSlots[]}
export interface ManagementStatus {manager:boolean;claimStatus:'PENDING'|'APPROVED'|'REJECTED'|null;decisionNote:string|null;acceptsBookings:boolean}
export type BookingStatus='PENDING'|'CONFIRMED'|'DECLINED'|'CANCELLED';
export interface VenueBooking {
 id:number;venueId:number;venueName:string|null;courtId:number;courtName:string|null;requesterUsername:string;
 startAt:string;endAt:string;status:BookingStatus;priceCents:number|null;playerNote:string|null;ownerNote:string|null;
 sessionId:number|null;createdAt:string;decidedAt:string|null;
 paymentMethod?:'MBWAY'|'IN_PERSON'|null;mbwayPhone?:string|null;paidClaimedAt?:string|null;paidConfirmedAt?:string|null;
}
export interface VenueAvailability {venueId:number;name:string;city:string|null;district:string|null;latitude:number|null;longitude:number|null;paymentMethod:'MBWAY'|'IN_PERSON'|null;courts:CourtSlots[]}
export interface ManagedVenue {venueId:number;name:string;city:string;pendingRequests:number;acceptsBookings:boolean}
export interface CourtInput {id?:number|null;name:string;sport?:string|null;priceCents?:number|null;slotMinutes:number;active:boolean}

export const bookingOffer=(venueId:number)=>request<BookingOffer>(`/api/venues/${venueId}/booking-offer`);
export const bookingSlots=(venueId:number,date:string)=>request<DaySlots>(`/api/venues/${venueId}/booking-slots?date=${encodeURIComponent(date)}`);
export const managementStatus=(venueId:number,token:string)=>request<ManagementStatus>(`/api/venues/${venueId}/management`,{token});
export const claimVenue=(venueId:number,token:string,roleDescription:string,contactPhone:string|null)=>
 request<unknown>(`/api/venues/${venueId}/claims`,{token,method:'POST',body:{roleDescription,contactPhone}});
export const requestBooking=(venueId:number,token:string,courtId:number,startAt:string,note:string|null,sessionId:number|null)=>
 request<VenueBooking>(`/api/venues/${venueId}/booking-requests`,{token,method:'POST',body:{courtId,startAt,note,sessionId}});
/** Free slots across every venue that takes Jynlo bookings, for one day. */
export function searchCourts(date:string,sport:string,place:string,from:string):Promise<VenueAvailability[]>{
 const q=['date='+encodeURIComponent(date)];
 if(sport.trim())q.push('sport='+encodeURIComponent(sport.trim()));
 if(place.trim())q.push('place='+encodeURIComponent(place.trim()));
 if(from)q.push('from='+encodeURIComponent(from));
 return request<VenueAvailability[]>('/api/venue-bookings/search?'+q.join('&'));
}
export const linkBookingToSession=(bookingId:number,sessionId:number,token:string)=>
 request<VenueBooking>(`/api/venue-bookings/${bookingId}/session`,{token,method:'POST',body:{sessionId}});
export const managerOffer=(venueId:number,token:string)=>request<BookingOffer>(`/api/venues/${venueId}/management/offer`,{token});
export const saveCourts=(venueId:number,token:string,courts:CourtInput[])=>
 request<BookingOffer>(`/api/venues/${venueId}/management/courts`,{token,method:'PUT',body:courts});
export const saveHours=(venueId:number,token:string,hours:BookingHours[])=>
 request<BookingOffer>(`/api/venues/${venueId}/management/hours`,{token,method:'PUT',body:hours});
export const saveVenuePayment=(venueId:number,token:string,method:'MBWAY'|'IN_PERSON'|null,phone:string|null)=>
 request<BookingOffer>(`/api/venues/${venueId}/management/payment`,{token,method:'PUT',body:{method,phone}});
export const markBookingPaid=(id:number,token:string,paid:boolean)=>request<VenueBooking>(`/api/venue-bookings/${id}/paid`,{token,method:'POST',body:{paid}});
export const confirmBookingPaid=(id:number,token:string,paid:boolean)=>request<VenueBooking>(`/api/venue-bookings/${id}/payment-received`,{token,method:'POST',body:{paid}});
export const venueRequests=(venueId:number,token:string)=>request<VenueBooking[]>(`/api/venues/${venueId}/management/requests`,{token});
export const myBookings=(token:string)=>request<VenueBooking[]>('/api/venue-bookings/mine',{token});
export const managedVenues=(token:string)=>request<ManagedVenue[]>('/api/venue-bookings/managed',{token});
export const cancelBooking=(id:number,token:string)=>request<VenueBooking>(`/api/venue-bookings/${id}/cancel`,{token,method:'POST',body:{}});
export const answerBooking=(id:number,token:string,confirm:boolean,note:string|null)=>
 request<VenueBooking>(`/api/venue-bookings/${id}/${confirm?'confirm':'decline'}`,{token,method:'POST',body:{note}});

let acceptingCache:Promise<number[]>|null=null;
/** Ids of venues that take Jynlo bookings, fetched once per app session. */
export function acceptingVenues():Promise<number[]>{
 if(!acceptingCache)acceptingCache=request<number[]>('/api/venue-bookings/accepting').catch(()=>{acceptingCache=null;return [];});
 return acceptingCache;
}
