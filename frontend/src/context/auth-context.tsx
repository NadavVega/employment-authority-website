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
 * Defines the strict shape of the Auth Context so consumers (like ArticleReviewList)
 * know exactly what properties and methods are available.
 */
export interface AuthContextType {
    currentUser: any | null; // Note: Replace 'any' with 'firebase.User' if you have the Firebase types installed
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
 * Following SRP: Its only responsibility is to manage and broadcast the auth state.
 */
const AuthContext = createContext<AuthContextType | null>(null);

interface WhitelistRecord {
    role: string;
    // You can add other properties here later if your DB returns them (e.g., email: string)
}

export interface AuthProviderProps {
    children: ReactNode;
}

/**
 * AuthProvider wraps the application to provide access to authentication data.
 * It coordinates between Firebase Auth state and our custom Firestore Whitelist.
 * 
 * @param {AuthProviderProps} props - Component props containing the children to render.
 */
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
    const [currentUser, setCurrentUser] = useState<any | null>(null);
    const [userRole, setUserRole] = useState<string>(MOCK_ROLES.GUEST); // Default to 'guest' for unauthenticated users
    const [loading, setLoading] = useState<boolean>(true);

    //------------------------- Demo Role Switcher Logic (For Michal's Demo) ------------------
    /**
     * Demo Override Logic
     * Used to showcase RBAC logic to stakeholders without requiring a real login.
     * 
     * @param {string} roleName - The role to simulate.
     */
    const switchDemoRole = (roleName: string) => {
        setLoading(true);
        
        // Simulating a Whitelist response for the demo
        const demoUser = { 
            uid: `demo-${roleName}-uid`,
            email: `${roleName}@jerusalem.demo`,
            displayName: `Demo ${roleName.charAt(0).toUpperCase() + roleName.slice(1)}`,
            isDemo: true,

            // Demo signup/profile data
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

        setTimeout(() => setLoading(false), 400); // Simulate network delay
    };
    //-----------------------------------------------------------------------------------------

    useEffect(() => {
        /** 
         * We use a listener to detect auth state changes in Firebase. 
         * When a user logs in or out, this callback is triggered.
         */
        const unsubscribe = subscribeToAuthState(async (user: any) => {
            //TODO: remove this bypass logic before production deployment. 
            // =========================================================
            // Bypass mechanism for development: Skip the whitelist check if DEV_BYPASS is true.                   
            if (localStorage.getItem('DEV_BYPASS') === 'true') {
                setLoading(false);
                return;
            }
            // =========================================================

            if (user) {
                try {
                    // Check if the authenticated user's email is in the whitelist.
                    const authData = (await checkWhitelist(user.email)) as WhitelistRecord | null;
                    if (authData && authData.role) {
                        setCurrentUser(user);
                        setUserRole(authData.role); // Store the user's role for access control
                    } else {
                        // If the email is not in the whitelist, treat them as unauthenticated.
                        setCurrentUser(null);
                        setUserRole(MOCK_ROLES.GUEST);
                    }
                } catch (error) {
                    console.error('AuthContext Error: Failed to check whitelist', error);
                    setCurrentUser(null);
                    setUserRole(MOCK_ROLES.GUEST);
                }
            } else {
                // If no user is authenticated, clear the auth state.
                setCurrentUser(null);
                setUserRole(MOCK_ROLES.GUEST);
            }
            
            // Set loading to false only after the initial check is complete to avoid UI flickering.
            setLoading(false); 
        });

        // Cleanup the subscription on unmount to prevent memory leaks.
        return () => unsubscribe();
    }, []);

    // Explicitly define the context value as AuthContextType to satisfy TypeScript
    const contextValue: AuthContextType = {
        currentUser,
        userRole,
        isAuthenticated: !!currentUser,
        loading,
        switchDemoRole, // Expose the demo role switcher for Michal's demo

        isAdmin: userRole === MOCK_ROLES.ADMIN,
        isCoordinator: userRole === MOCK_ROLES.COORDINATOR,
        isEmployer: userRole === MOCK_ROLES.EMPLOYER,
        isGuest: userRole === MOCK_ROLES.GUEST || !currentUser, // Treat unauthenticated users as guests
    };

    return (
        <AuthContext.Provider value={contextValue}>
            {/* Wait for the initial auth check to finish before rendering the app */}
            {!loading && children}
        </AuthContext.Provider>
    );
};

/**
 * Custom hook to consume the AuthContext.
 * Using a hook follows the DRY principle and makes usage cleaner in components.
 * 
 * @returns {AuthContextType} - The current authentication state and helpers.
 */
export const useAuth = (): AuthContextType => {
    const context = useContext(AuthContext);
    if (!context) {
        // Developer error safeguard
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};