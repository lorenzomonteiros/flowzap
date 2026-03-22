import CryptoJS from 'crypto-js';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || '12345678901234567890123456789012';

export function encrypt(text: string): string {
  return CryptoJS.AES.encrypt(text, ENCRYPTION_KEY).toString();
}

export function decrypt(ciphertext: string): string {
  const bytes = CryptoJS.AES.decrypt(ciphertext, ENCRYPTION_KEY);
  return bytes.toString(CryptoJS.enc.Utf8);
}

export function encryptObject(obj: Record<string, unknown>): string {
  return encrypt(JSON.stringify(obj));
}

export function decryptObject(ciphertext: string): Record<string, unknown> {
  const decrypted = decrypt(ciphertext);
  return JSON.parse(decrypted) as Record<string, unknown>;
}
