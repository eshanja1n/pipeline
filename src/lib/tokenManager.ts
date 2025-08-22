/**
 * Enhanced Google Token Manager
 * Handles token persistence, proactive refresh, and automatic token management
 */

interface TokenData {
  access_token: string;
  refresh_token?: string;
  expires_at: number; // Unix timestamp
  token_type?: string;
}

const TOKEN_STORAGE_KEY = 'google_oauth_tokens';
const TOKEN_REFRESH_BUFFER = 5 * 60; // 5 minutes before expiry
const PROACTIVE_REFRESH_INTERVAL = 30 * 60 * 1000; // Check every 30 minutes

export class GoogleTokenManager {
  private refreshInterval: NodeJS.Timeout | null = null;
  private clientId: string;

  constructor() {
    this.clientId = process.env.REACT_APP_GOOGLE_CLIENT_ID || '';
    this.startProactiveRefresh();
    this.setupVisibilityHandlers();
  }

  /**
   * Store tokens in localStorage with expiry timestamp
   */
  storeTokens(accessToken: string, refreshToken?: string, expiresIn?: number): void {
    try {
      const now = Math.floor(Date.now() / 1000);
      const expiresAt = now + (expiresIn || 3600); // Default 1 hour if not provided
      
      const tokenData: TokenData = {
        access_token: accessToken,
        refresh_token: refreshToken,
        expires_at: expiresAt,
        token_type: 'Bearer'
      };

      localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(tokenData));
      console.log('🔐 Stored Google tokens in localStorage, expires at:', new Date(expiresAt * 1000).toISOString());
    } catch (error) {
      console.warn('⚠️ Failed to store tokens in localStorage:', error);
    }
  }

  /**
   * Retrieve stored tokens from localStorage
   */
  getStoredTokens(): TokenData | null {
    try {
      const stored = localStorage.getItem(TOKEN_STORAGE_KEY);
      if (!stored) return null;

      const tokenData: TokenData = JSON.parse(stored);
      return tokenData;
    } catch (error) {
      console.warn('⚠️ Failed to retrieve stored tokens:', error);
      this.clearStoredTokens();
      return null;
    }
  }

  /**
   * Clear stored tokens from localStorage
   */
  clearStoredTokens(): void {
    try {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      console.log('🗑️ Cleared stored Google tokens');
    } catch (error) {
      console.warn('⚠️ Failed to clear stored tokens:', error);
    }
  }

  /**
   * Check if stored token is still valid (not expired)
   */
  isStoredTokenValid(): boolean {
    const tokenData = this.getStoredTokens();
    if (!tokenData) return false;

    const now = Math.floor(Date.now() / 1000);
    const timeToExpiry = tokenData.expires_at - now;
    
    // Consider token valid if it has more than the buffer time remaining
    return timeToExpiry > TOKEN_REFRESH_BUFFER;
  }

  /**
   * Check if token needs refresh (expires soon)
   */
  needsRefresh(): boolean {
    const tokenData = this.getStoredTokens();
    if (!tokenData) return false;

    const now = Math.floor(Date.now() / 1000);
    const timeToExpiry = tokenData.expires_at - now;
    
    // Needs refresh if expires within buffer time
    return timeToExpiry <= TOKEN_REFRESH_BUFFER && timeToExpiry > 0;
  }

  /**
   * Refresh Google access token using refresh token
   */
  async refreshAccessToken(refreshToken?: string): Promise<string | null> {
    try {
      if (!this.clientId) {
        console.warn('⚠️ REACT_APP_GOOGLE_CLIENT_ID not configured');
        return null;
      }

      // Use provided refresh token or stored one
      const tokenToUse = refreshToken || this.getStoredTokens()?.refresh_token;
      if (!tokenToUse) {
        console.warn('⚠️ No refresh token available');
        return null;
      }

      console.log('🔄 Refreshing Google access token...');
      
      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: this.clientId,
          refresh_token: tokenToUse,
          grant_type: 'refresh_token',
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Token refresh error:', errorText);
        
        // If refresh token is invalid, clear stored tokens
        if (response.status === 400) {
          this.clearStoredTokens();
        }
        
        return null;
      }

      const data = await response.json();
      
      if (data.access_token) {
        // Store the new token (keep existing refresh token if new one not provided)
        const storedTokens = this.getStoredTokens();
        const refreshTokenToStore = data.refresh_token || storedTokens?.refresh_token || tokenToUse;
        
        this.storeTokens(
          data.access_token,
          refreshTokenToStore,
          data.expires_in
        );
        
        console.log('✅ Successfully refreshed and stored Google access token');
        return data.access_token;
      }
      
      throw new Error('No access token in refresh response');
    } catch (error) {
      console.error('❌ Failed to refresh Google access token:', error);
      return null;
    }
  }

  /**
   * Get a valid access token - returns stored token or refreshes if needed
   */
  async getValidAccessToken(sessionToken?: string, sessionRefreshToken?: string): Promise<string | null> {
    console.log('🔑 Getting valid Google access token...');

    // First, try to use session tokens if provided and store them
    if (sessionToken) {
      // Extract expiry from session if available or estimate
      const expiresIn = 3600; // Default to 1 hour
      this.storeTokens(sessionToken, sessionRefreshToken, expiresIn);
    }

    // Check if we have a valid stored token
    if (this.isStoredTokenValid()) {
      const storedTokens = this.getStoredTokens();
      if (storedTokens) {
        console.log('✅ Using valid stored access token');
        return storedTokens.access_token;
      }
    }

    // If token needs refresh or is expired, try to refresh it
    if (this.needsRefresh()) {
      console.log('🔄 Token expires soon, refreshing...');
      const refreshedToken = await this.refreshAccessToken();
      if (refreshedToken) {
        return refreshedToken;
      }
    }

    // Try to refresh with session refresh token as fallback
    if (sessionRefreshToken) {
      console.log('🔄 Attempting refresh with session refresh token...');
      const refreshedToken = await this.refreshAccessToken(sessionRefreshToken);
      if (refreshedToken) {
        return refreshedToken;
      }
    }

    console.warn('⚠️ No valid access token available');
    return null;
  }

  /**
   * Start proactive token refresh - runs in background
   */
  private startProactiveRefresh(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }

    this.refreshInterval = setInterval(async () => {
      try {
        if (this.needsRefresh()) {
          console.log('🕐 Proactive token refresh triggered');
          await this.refreshAccessToken();
        }
      } catch (error) {
        console.log('ℹ️ Proactive refresh failed (normal if logged out):', error);
      }
    }, PROACTIVE_REFRESH_INTERVAL);

    console.log('⏰ Started proactive token refresh (every 30 minutes)');
  }

  /**
   * Setup page visibility handlers to refresh tokens when page becomes visible
   */
  private setupVisibilityHandlers(): void {
    // Refresh token when page becomes visible (user returns to tab)
    document.addEventListener('visibilitychange', async () => {
      if (!document.hidden && this.needsRefresh()) {
        console.log('👁️ Page visible, checking token status...');
        await this.refreshAccessToken();
      }
    });

    // Refresh token when window gets focus
    window.addEventListener('focus', async () => {
      if (this.needsRefresh()) {
        console.log('🎯 Window focused, checking token status...');
        await this.refreshAccessToken();
      }
    });
  }

  /**
   * Cleanup - stop intervals and remove listeners
   */
  cleanup(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
  }
}

// Export singleton instance
export const googleTokenManager = new GoogleTokenManager();