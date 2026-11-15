export function readSuccessfulResponse(response: {
  status: number;
  text(): Promise<string>;
}): Promise<unknown>;

export class InvalidSuccessfulResponseError extends Error {
  constructor();
}
