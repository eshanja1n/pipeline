import React, { createContext, useContext, useEffect, useState } from 'react'
import { Session, User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { apiClient } from '../lib/apiClient'

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

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔐 Auth state change:', event, session?.user?.email);
        
        if (!mounted) return;
        
        setSession(session)
        setUser(session?.user ?? null)
        
        // When user signs in, ensure they exist in our users table
        if (event === 'SIGNED_IN' && session?.user) {
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
            console.error('❌ Failed to ensure user exists:', error);
            // Don't block the login process, just log the error
          }
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