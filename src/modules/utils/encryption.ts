import crypto from 'crypto';
import config from '../../config/config';

const ALGORITHM = 'aes-256-cbc';

// Use a 32-byte key derived from the secret
// In production, this should ideally be a separate key in env vars
const getKey = () => crypto.createHash('sha256').update(config.jwt.secret).digest();

export interface EncryptedData {
    iv: string;
    encryptedData: string;
}

export const encrypt = (text: string): EncryptedData => {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return { iv: iv.toString('hex'), encryptedData: encrypted.toString('hex') };
};

export const decrypt = (text: EncryptedData): string => {
    const iv = Buffer.from(text.iv, 'hex');
    const encryptedText = Buffer.from(text.encryptedData, 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
};
