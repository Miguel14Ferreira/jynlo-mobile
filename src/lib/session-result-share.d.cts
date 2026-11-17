import type {SessionDetail} from './types';

export declare function publicSessionResultMessage(
  game: Partial<SessionDetail> | null | undefined,
  result: {
    sessionId: number;
    roundId: number;
    scoreA: number | null;
    scoreB: number | null;
  } | null | undefined,
  sessionId: number
): string | null;
