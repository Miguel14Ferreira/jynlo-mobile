export function readSuccessfulResponse(response: {
  status: number;
  text(): Promise<string>;
}): Promise<unknown>;

export class InvalidSuccessfulResponseError extends Error {
  constructor();
}

export declare function userFacingMessage(value:unknown):string|null;
export declare function readErrorMessage(response:{text():Promise<string>}):Promise<string|null>;
