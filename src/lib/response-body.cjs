'use strict';

/**
 * Some APIs return 200 OK with no response body for successful mutations.
 * Response.json() would throw despite the operation having completed.
 * Never auto-retry a mutation after an invalid server response.
 */
async function readSuccessfulResponse(response) {
  if (response.status === 204 || response.status === 205) return undefined;
  const text = await response.text();
  if (typeof text !== 'string' || text.trim() === '') return undefined;
  try {
    return JSON.parse(text);
  } catch {
    throw new Error('Resposta inválida da Jynlo. Se alteraste dados, confirma o resultado antes de tentares novamente.');
  }
}
module.exports={readSuccessfulResponse};
