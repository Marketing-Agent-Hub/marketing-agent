import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { apiClient } from '../lib/api-client';
import type { LoginInput, UserResponse } from '../types/api';

interface AuthContextType {
    user: UserResponse | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    login: (credentials: LoginInput) => Promise<void>;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<UserResponse | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Check if user is already logged in
        const token = localStorage.getItem('token');
        if (token) {
            apiClient
                .getMe()
                .then((userData) => {
                    setUser(userData);
                })
                .catch(() => {
                    localStorage.removeItem('token');
                })
                .finally(() => {
                    setIsLoading(false);
                });
        } else {
            setIsLoading(false);
        }
    }, []);

    const login = async (credentials: LoginInput) => {
        const response = await apiClient.login(credentials);
        setUser({ email: response.email });
    };

    const logout = () => {
        apiClient.logout();
        setUser(null);
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                isLoading,
                isAuthenticated: !!user,
                login,
                logout,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
