'use client';

import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { LoginForm, RegisterForm, GuestForm } from '../../components/AuthForms';

type AuthMode = 'login' | 'register' | 'guest';

export default function AuthPage() {
  const [mode, setMode] = useState<AuthMode>('login');
  const { isAuthenticated } = useAuth();
  const router = useRouter();

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      router.push('/');
    }
  }, [isAuthenticated, router]);

  if (isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Redirecting...</p>
        </div>
      </div>
    );
  }

  const handleAuthSuccess = () => {
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900">CareForAll</h2>
          <p className="mt-2 text-sm text-gray-600">
            Join our community and make a difference
          </p>
        </div>

        {/* Mode Selection */}
        <div className="bg-white rounded-lg shadow-sm p-1 mb-6">
          <div className="flex space-x-1">
            <button
              onClick={() => setMode('login')}
              className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${
                mode === 'login'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Login
            </button>
            <button
              onClick={() => setMode('register')}
              className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${
                mode === 'register'
                  ? 'bg-green-600 text-white'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Register
            </button>
            <button
              onClick={() => setMode('guest')}
              className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${
                mode === 'guest'
                  ? 'bg-orange-600 text-white'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Guest
            </button>
          </div>
        </div>

        {/* Form Container */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="mb-6">
            {mode === 'login' && (
              <div>
                <h3 className="text-xl font-semibold text-center">Welcome Back</h3>
                <p className="text-sm text-gray-600 text-center mt-1">
                  Sign in to your account
                </p>
              </div>
            )}
            {mode === 'register' && (
              <div>
                <h3 className="text-xl font-semibold text-center">Create Account</h3>
                <p className="text-sm text-gray-600 text-center mt-1">
                  Join us to support meaningful causes
                </p>
              </div>
            )}
            {mode === 'guest' && (
              <div>
                <h3 className="text-xl font-semibold text-center">Quick Donation</h3>
                <p className="text-sm text-gray-600 text-center mt-1">
                  Continue as guest - no registration required
                </p>
              </div>
            )}
          </div>

          {/* Forms */}
          {mode === 'login' && <LoginForm onSuccess={handleAuthSuccess} />}
          {mode === 'register' && <RegisterForm onSuccess={handleAuthSuccess} />}
          {mode === 'guest' && <GuestForm onSuccess={handleAuthSuccess} />}
        </div>

        {/* Additional Information */}
        <div className="mt-6 text-center text-sm text-gray-600">
          {mode === 'login' && (
            <p>
              Don't have an account?{' '}
              <button
                onClick={() => setMode('register')}
                className="text-blue-600 hover:text-blue-500 font-medium"
              >
                Register here
              </button>
              {' '}or{' '}
              <button
                onClick={() => setMode('guest')}
                className="text-orange-600 hover:text-orange-500 font-medium"
              >
                continue as guest
              </button>
            </p>
          )}
          {mode === 'register' && (
            <p>
              Already have an account?{' '}
              <button
                onClick={() => setMode('login')}
                className="text-blue-600 hover:text-blue-500 font-medium"
              >
                Login here
              </button>
            </p>
          )}
          {mode === 'guest' && (
            <p>
              Want to track your donations?{' '}
              <button
                onClick={() => setMode('register')}
                className="text-green-600 hover:text-green-500 font-medium"
              >
                Create an account
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
