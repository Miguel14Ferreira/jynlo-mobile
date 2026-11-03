import type { SessionSummary } from './types';
export function vacancies(s: Pick<SessionSummary, 'maxParticipants' | 'participantCount'>): number;
export function canJoin(s: SessionSummary & {joined?:boolean;waitlisted?:boolean}): boolean;
export function money(price: number | null): string;
export function formatDate(iso: string | null): string;
