import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { subscribeToAuthState, checkWhitelist } from "../services/firebase/auth-service";

/**
 * MOCK_ROLES defines the available permission levels in the system.
 * We use a constant to ensure string consistency across the app.
 */
export const MOCK_ROLES = {
    GUEST: 'guest',
    EMPLOYER: 'employer',
    COORDINATOR: 'coordinator',
    ADMIN: 'admin'
} as const;

/**
 * Defines the strict shape of the Auth Context so consumers know exactly
 * what properties and methods are available.
 */
export interface AuthContextType {
    currentUser: any | null;
    userRole: string;
    isAuthenticated: boolean;
    loading: boolean;
    switchDemoRole: (roleName: string) => void;
    isAdmin: boolean;
    isCoordinator: boolean;
    isEmployer: boolean;
    isGuest: boolean;
}

/**
 * AuthContext serves as the single source of truth for user identity.
 */
const AuthContext = createContext<AuthContextType | null>(null);

interface WhitelistRecord {
    role: string;
}

export interface AuthProviderProps {
    children: ReactNode;
}

/**
 * AuthProvider wraps the application to provide access to authentication data.
 * It coordinates between Firebase Auth state and our custom Firestore whitelist.
 */
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
    const [currentUser, setCurrentUser] = useState<any | null>(null);
    const [userRole, setUserRole] = useState<string>(MOCK_ROLES.GUEST);
    const [loading, setLoading] = useState<boolean>(true);

    /**
     * Demo Override Logic
     * Used to showcase RBAC logic to stakeholders without requiring a real login.
     */
    const switchDemoRole = (roleName: string) => {
        setLoading(true);

        const demoUser = {
            uid: `demo-${roleName}-uid`,
            email: `${roleName}@jerusalem.demo`,
            displayName: `Demo ${roleName.charAt(0).toUpperCase() + roleName.slice(1)}`,
            isDemo: true,

            phone: roleName === MOCK_ROLES.EMPLOYER ? '050-1234567' : '',
            center: roleName === MOCK_ROLES.EMPLOYER ? 'מרכז הקריירה באוניברסיטה העברית' : '',
            companyName: roleName === MOCK_ROLES.EMPLOYER ? 'מעסיק הדגמה בע"מ' : '',
            organization: roleName === MOCK_ROLES.EMPLOYER ? 'מעסיק הדגמה בע"מ' : '',
        };

        if (roleName === MOCK_ROLES.GUEST) {
            setCurrentUser(null);
            setUserRole(MOCK_ROLES.GUEST);
        } else {
            setCurrentUser(demoUser);
            setUserRole(roleName);
        }

        setTimeout(() => setLoading(false), 400);
    };

    useEffect(() => {
        const unsubscribe = subscribeToAuthState(async (user: any) => {
            // TODO: remove this bypass logic before production deployment.
            if (localStorage.getItem('DEV_BYPASS') === 'true') {
                setLoading(false);
                return;
            }

            if (user) {
                try {
                    const authData = (await checkWhitelist(user.email)) as WhitelistRecord | null;

                    if (authData && authData.role) {
                        setCurrentUser(user);
                        setUserRole(authData.role);
                    } else {
                        setCurrentUser(null);
                        setUserRole(MOCK_ROLES.GUEST);
                    }
                } catch (error) {
                    console.error('AuthContext Error: Failed to check whitelist', error);
                    setCurrentUser(null);
                    setUserRole(MOCK_ROLES.GUEST);
                }
            } else {
                setCurrentUser(null);
                setUserRole(MOCK_ROLES.GUEST);
            }

            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const contextValue: AuthContextType = {
        currentUser,
        userRole,
        isAuthenticated: !!currentUser,
        loading,
        switchDemoRole,

        isAdmin: userRole === MOCK_ROLES.ADMIN,
        isCoordinator: userRole === MOCK_ROLES.COORDINATOR,
        isEmployer: userRole === MOCK_ROLES.EMPLOYER,
        isGuest: userRole === MOCK_ROLES.GUEST || !currentUser,
    };

    return (
        <AuthContext.Provider value={contextValue}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

/**
 * Custom hook to consume the AuthContext.
 */
export const useAuth = (): AuthContextType => {
    const context = useContext(AuthContext);

    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }

    return context;
};