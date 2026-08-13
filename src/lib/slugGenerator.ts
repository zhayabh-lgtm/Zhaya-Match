import crypto from 'crypto';

const ALPHABET = '23456789abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ'; // base58-like (sem caracteres ambíguos)

/**
 * Generates a cryptographically secure, non-enumerable, URL-safe random slug.
 * Length defaults to 16 characters.
 */
export function generateLiveSlug(length = 16): string {
  const bytes = crypto.randomBytes(length);
  let result = '';
  const alphabetLength = ALPHABET.length;
  for (let i = 0; i < length; i++) {
    result += ALPHABET[bytes[i] % alphabetLength];
  }
  return result;
}
