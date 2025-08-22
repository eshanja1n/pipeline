import React, { createContext, useContext, useEffect, useState } from 'react'
import { Session, User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { apiClient } from '../lib/apiClient'
import { googleTokenManager } from '../lib/tokenManager'

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: React.ReactNode
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true;
    
    // Get initial session
    const getInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (!mounted) return;
        
        if (error) {
          console.error('❌ AuthContext: Error getting session:', error)
        }
        
        setSession(session)
        setUser(session?.user ?? null)
        setLoading(false)
      } catch (error) {
        console.error('❌ AuthContext: Unexpected error:', error)
        if (mounted) {
          setLoading(false)
        }
      }
    }

    // Set a timeout fallback to ensure loading never gets stuck
    const fallbackTimeout = setTimeout(() => {
      if (mounted) {
        console.log('⚠️ AuthContext: Fallback timeout - forcing loading to false')
        setLoading(false)
      }
    }, 2000) // 2 second fallback (reduced from 10)

    getInitialSession()

    // Set up periodic session refresh (every 45 minutes)
    const refreshInterval = setInterval(async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const now = Math.floor(Date.now() / 1000);
          const expiresAt = session.expires_at || 0;
          const timeUntilExpiry = expiresAt - now;
          
          // Refresh if expires in less than 10 minutes
          if (timeUntilExpiry < 600) {
            console.log('🔄 AuthContext: Proactively refreshing session...');
            await supabase.auth.refreshSession();
          }
        }
      } catch (error) {
        console.log('ℹ️ AuthContext: Session refresh check failed (normal if logged out)');
      }
    }, 45 * 60 * 1000); // Check every 45 minutes

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔐 Auth state change:', event, session?.user?.email);
        
        if (!mounted) return;
        
        setSession(session)
        setUser(session?.user ?? null)
        
        // When user signs in, ensure they exist in our users table and store tokens
        if (event === 'SIGNED_IN' && session?.user) {
          // Store Google tokens if available
          if (session.provider_token) {
            const expiresIn = (session as any).provider_expires_at 
              ? (session as any).provider_expires_at - Math.floor(Date.now() / 1000)
              : 3600;
            
            googleTokenManager.storeTokens(
              session.provider_token,
              session.provider_refresh_token || undefined,
              Math.max(expiresIn, 60)
            );
          }
          
          // Wait a bit for session to be fully ready, then ensure user exists
          setTimeout(async () => {
            try {
              console.log('👤 User signed in, ensuring user exists in database...');
              const email = session.user.email || '';
              const name = session.user.user_metadata?.full_name || 
                          session.user.user_metadata?.name || 
                          email.split('@')[0] || 'User';
              
              console.log('📝 Calling ensureUserExists with:', { email, name });
              
              await apiClient.ensureUserExists(email, name);
              console.log('✅ User ensured in database successfully');
              
            } catch (error) {
              // Silently handle this - user will still be logged in
              console.log('ℹ️ User creation will be handled on first API call');
            }
          }, 1000); // Wait 1 second for session to be ready
        }
        
        // Only set loading to false for certain events, not all of them
        if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
          setLoading(false);
        }
      }
    )

    return () => {
      mounted = false;
      clearTimeout(fallbackTimeout);
      clearInterval(refreshInterval);
      subscription.unsubscribe();
    }
  }, [])

  const signOut = async () => {
    try {
      // Clear Google OAuth session first
      if ((window as any).google?.accounts?.id) {
        // Disable auto-select to force account picker
        (window as any).google.accounts.id.disableAutoSelect()
        
        // Clear any Google Sign-In credentials
        if ((window as any).google?.accounts?.id?.revoke) {
          try {
            await new Promise<void>((resolve) => {
              (window as any).google.accounts.id.revoke(user?.email || '', () => {
                resolve()
              })
            })
          } catch (revokeError) {
            console.log('Google revoke not available or failed:', revokeError)
          }
        }
      }
      
      // Sign out from Supabase with global scope to clear all sessions
      await supabase.auth.signOut({ scope: 'global' })
      
      // Clear any remaining session data
      setUser(null)
      setSession(null)
      
      // Clear Google tokens from token manager
      googleTokenManager.clearStoredTokens()
      
      // Clear all browser storage
      localStorage.clear()
      sessionStorage.clear()
      
      // Clear all cookies, including Google's
      const cookies = document.cookie.split(";")
      cookies.forEach((c) => {
        const eqPos = c.indexOf("=")
        const name = eqPos > -1 ? c.substring(0, eqPos).trim() : c.trim()
        
        // Clear cookies for different domains and paths
        const domains = [window.location.hostname, '.' + window.location.hostname, '.google.com', '.googleapis.com']
        const paths = ['/', '/auth']
        
        domains.forEach(domain => {
          paths.forEach(path => {
            document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=${path}; domain=${domain}`
          })
        })
      })
      
      // Clear any IndexedDB storage
      if (window.indexedDB) {
        try {
          const databases = await window.indexedDB.databases()
          databases.forEach(db => {
            if (db.name) {
              window.indexedDB.deleteDatabase(db.name)
            }
          })
        } catch (error) {
          console.log('IndexedDB cleanup failed:', error)
        }
      }
      
      // Force complete page refresh to clear any cached states
      window.location.href = window.location.origin
    } catch (error) {
      console.error('Error during sign out:', error)
      // Even if there's an error, still reload to clear the app state
      window.location.href = window.location.origin
    }
  }

  const value = {
    user,
    session,
    loading,
    signOut,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}