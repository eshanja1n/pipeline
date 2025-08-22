import { useEffect } from 'react';
import { Session } from '@supabase/supabase-js';
import { googleTokenManager } from '../lib/tokenManager';

/**
 * Hook to manage Google OAuth tokens
 * Automatically stores session tokens and provides access to token manager
 */
export const useGoogleTokens = (session: Session | null) => {
  // Store session tokens when available
  useEffect(() => {
    if (session?.provider_token) {
      const expiresIn = (session as any).provider_expires_at 
        ? (session as any).provider_expires_at - Math.floor(Date.now() / 1000)
        : 3600; // Default 1 hour
      
      googleTokenManager.storeTokens(
        session.provider_token,
        session.provider_refresh_token || undefined,
        Math.max(expiresIn, 60) // Ensure at least 1 minute
      );
      
      console.log('🔐 Stored Google tokens from session');
    }
  }, [session]);

  // Try to refresh tokens on hook initialization if needed
  useEffect(() => {
    const initializeTokens = async () => {
      if (googleTokenManager.needsRefresh()) {
        console.log('🚀 Initializing: Token needs refresh, attempting...');
        await googleTokenManager.refreshAccessToken();
      }
    };

    initializeTokens();
  }, []);

  /**
   * Get a valid access token, handling refresh automatically
   */
  const getValidAccessToken = async (): Promise<string | null> => {
    try {
      // Use the token manager to get a valid token
      const validToken = await googleTokenManager.getValidAccessToken(
        session?.provider_token || undefined,
        session?.provider_refresh_token || undefined
      );

      return validToken;
    } catch (error) {
      console.error('❌ Failed to get valid access token:', error);
      return null;
    }
  };

  return {
    getValidAccessToken,
    tokenManager: googleTokenManager,
    isTokenValid: googleTokenManager.isStoredTokenValid(),
    needsRefresh: googleTokenManager.needsRefresh()
  };
};