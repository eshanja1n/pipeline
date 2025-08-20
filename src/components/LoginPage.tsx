import React from 'react'
import { Auth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'
import { supabase } from '../lib/supabase'
import { Logo } from './ui/logo'
// import { SimpleParticles } from './ui/simple-particles'
import { Particles } from "./magicui/particles";

export const LoginPage: React.FC = () => {
  return (
    <div className="relative min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 overflow-hidden">
      <Particles 
        className="absolute inset-0 -z-10"
        quantity={80}
        ease={70}
        color="#3b82f6"
        size={1.2}
      />
      <div className="max-w-md w-full space-y-8 relative z-10">
        <div className="text-center">
          <div className="flex items-center justify-center gap-3 mt-6 mb-4">
            <Logo size="lg" className="filter-green-only" />
            <h2 className="text-3xl font-bold text-gray-900">
              pipeline
            </h2>
          </div>
          <p className="mt-2 text-sm text-gray-600">
            Sign in with your Gmail account to track your job applications
          </p>
        </div>
        
        <div className="bg-white/80 backdrop-blur-sm py-8 px-6 shadow-xl rounded-xl border border-white/20">
          <Auth
            supabaseClient={supabase}
            appearance={{
              theme: ThemeSupa,
              variables: {
                default: {
                  colors: {
                    brand: '#3b82f6',
                    brandAccent: '#2563eb',
                  },
                },
              },
              className: {
                container: 'w-full',
                button: 'w-full px-4 py-2 text-sm font-medium rounded-md',
                input: 'w-full px-3 py-2 border border-gray-300 rounded-md',
              },
            }}
            providers={['google']}
            onlyThirdPartyProviders
            redirectTo={`${window.location.origin}`}
            socialLayout="horizontal"
            queryParams={{
              access_type: 'offline',
              prompt: 'consent',
            }}
            providerScopes={{
              google: 'openid email profile https://www.googleapis.com/auth/gmail.readonly'
            }}
          />
        </div>
        
        <div className="text-center">
          <p className="text-xs text-gray-500">
            By signing in, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </div>
    </div>
  )
}