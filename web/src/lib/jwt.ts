import { jwtDecode } from 'jwt-decode';
import type { AppTokenPayload } from '@/types';

export function decodeAppToken(token: string): AppTokenPayload | null {
    try {
        return jwtDecode<AppTokenPayload>(token);
    } catch {
        return null;
    }
}

export function isTokenExpired(payload: AppTokenPayload): boolean {
    return Date.now() >= payload.exp * 1000;
}
