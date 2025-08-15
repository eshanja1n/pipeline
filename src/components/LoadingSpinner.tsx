import React from 'react'
import { Logo } from './ui/logo'

export const LoadingSpinner: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="flex items-center justify-center gap-3 mb-6">
          <Logo size="sm" className="filter-green-only" />
          <h2 className="text-2xl font-bold text-gray-900">Pipeline</h2>
        </div>
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-blue-600 mx-auto"></div>
        <p className="mt-4 text-lg text-gray-600">loading...</p>
      </div>
    </div>
  )
}