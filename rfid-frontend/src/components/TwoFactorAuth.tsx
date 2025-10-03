import { useState } from 'react'
import api from '../services/api'
import type { AxiosError } from 'axios'

interface TwoFactorProps {
  challengeId: string
  maskedPhone: string
  onSuccess: () => void
  onBack: () => void
}

const TwoFactorAuth: React.FC<TwoFactorProps> = ({ challengeId, maskedPhone, onSuccess, onBack }) => {
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [resendLoading, setResendLoading] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)

  // Countdown timer for resend cooldown
  useState(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000)
      return () => clearTimeout(timer)
    }
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    // Validate code format
    if (!/^\d{6}$/.test(code)) {
      setError('Please enter a valid 6-digit code')
      setLoading(false)
      return
    }

    try {
      const response = await api.post('/api/auth/verify2fa', {
        challengeId,
        code
      })

      if (response.data.success) {
        // Store token and user data in localStorage (same as regular login)
        localStorage.setItem('token', response.data.token)
        if (response.data.user) {
          localStorage.setItem('user', JSON.stringify(response.data.user))
        }
        onSuccess()
      } else {
        setError(response.data.message || 'Invalid verification code')
      }
    } catch (err: unknown) {
      console.error('2FA Verification Error:', err)
      const axiosErr = err as AxiosError<{ message?: string }>
      
      if (axiosErr.response?.status === 400) {
        setError(axiosErr.response.data.message || 'Invalid verification code')
      } else if (axiosErr.response?.status === 423) {
        setError('Too many failed attempts. Please try logging in again.')
      } else if (axiosErr.response?.status === 410) {
        setError('Verification code has expired. Please try logging in again.')
      } else {
        setError('Verification failed. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    setResendLoading(true)
    setError('')

    try {
      await api.post('/api/auth/2fa/resend', { challengeId })
      setResendCooldown(30) // 30 second cooldown
      setError('') // Clear any existing errors
    } catch (err: unknown) {
      console.error('Resend Error:', err)
      const axiosErr = err as AxiosError<{ message?: string }>
      if (axiosErr.response?.status === 429) {
        setError('Please wait before requesting another code')
      } else {
        setError('Failed to resend code. Please try again.')
      }
    } finally {
      setResendLoading(false)
    }
  }

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '') // Only allow digits
    if (value.length <= 6) {
      setCode(value)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center px-4">
      <div className="max-w-md w-full space-y-8">
        <div className="bg-white rounded-lg shadow-xl p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="mx-auto h-12 w-12 bg-green-600 rounded-lg flex items-center justify-center mb-4">
              <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h2 className="text-3xl font-extrabold text-gray-900">
              Two-Factor Authentication
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Enter the 6-digit code sent to your phone
            </p>
          </div>

          {/* SMS Info */}
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
            <div className="flex items-center">
              <svg className="h-5 w-5 text-blue-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              <div>
                <p className="text-sm font-medium text-blue-800">SMS sent to {maskedPhone}</p>
                <p className="text-xs text-blue-600 mt-1">Code expires in 5 minutes</p>
              </div>
            </div>
          </div>

          {/* 2FA Form */}
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
                <div className="text-sm">{error}</div>
              </div>
            )}

            <div>
              <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-2">
                Verification Code
              </label>
              <input
                id="code"
                name="code"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                autoComplete="one-time-code"
                required
                maxLength={6}
                className="block w-full px-4 py-3 text-center text-2xl font-mono tracking-widest border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="000000"
                value={code}
                onChange={handleCodeChange}
                autoFocus
              />
              <p className="mt-2 text-xs text-gray-500 text-center">
                Enter the 6-digit code from your SMS
              </p>
            </div>

            <div className="flex space-x-4">
              <button
                type="button"
                onClick={onBack}
                className="flex-1 py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Back to Login
              </button>

              <button
                type="submit"
                disabled={loading || code.length !== 6}
                className="flex-1 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <svg className="animate-spin mx-auto h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  'Verify Code'
                )}
              </button>
            </div>

            {/* Resend Button */}
            <div className="text-center">
              <button
                type="button"
                onClick={handleResend}
                disabled={resendLoading || resendCooldown > 0}
                className="text-sm text-blue-600 hover:text-blue-500 disabled:text-gray-400 disabled:cursor-not-allowed"
              >
                {resendLoading ? (
                  'Sending...'
                ) : resendCooldown > 0 ? (
                  `Resend code in ${resendCooldown}s`
                ) : (
                  'Resend code'
                )}
              </button>
            </div>
          </form>

          {/* Help Text */}
          <div className="mt-6 p-4 bg-gray-50 rounded-md">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Having trouble?</h3>
            <ul className="text-xs text-gray-600 space-y-1">
              <li>• Check your phone for the SMS message</li>
              <li>• Make sure you have signal/data connection</li>
              <li>• The code expires after 5 minutes</li>
              <li>• You have 5 attempts before being locked out</li>
              <li>• Contact support if you don't receive the code</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

export default TwoFactorAuth