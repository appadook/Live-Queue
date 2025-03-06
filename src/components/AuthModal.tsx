'use client';
import { useState } from 'react';
import { supabase } from '../utils/supabase';
import { AuthError } from '@supabase/supabase-js';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string, type: 'error' | 'success' } | null>(null);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');

  if (!isOpen) return null;

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    
    try {
      if (authMode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        
        if (error) throw error;
        setMessage({ text: 'Signed in successfully!', type: 'success' });
        setTimeout(() => onClose(), 1000);
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        
        if (error) throw error;
        setMessage({ 
          text: 'Registration successful! Check your email for verification.', 
          type: 'success' 
        });
      }
    } catch (error: unknown) {
      const authError = error as AuthError;
      setMessage({ 
        text: authError.message || 'An error occurred during authentication', 
        type: 'error' 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
      <div className="bg-gray-800 p-6 rounded-lg shadow-lg max-w-md w-full">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-white">
            {authMode === 'signin' ? 'Sign In' : 'Create Account'}
          </h2>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-white"
          >
            &times;
          </button>
        </div>
        
        {message && (
          <div className={`mb-4 p-3 rounded ${
            message.type === 'error' ? 'bg-red-500/20 text-red-300' : 'bg-green-500/20 text-green-300'
          }`}>
            {message.text}
          </div>
        )}
        
        <form onSubmit={handleAuth}>
          <div className="mb-4">
            <label htmlFor="email" className="block mb-2 text-gray-300">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-gray-700 text-white border border-gray-600 p-2 rounded"
              required
            />
          </div>
          
          <div className="mb-6">
            <label htmlFor="password" className="block mb-2 text-gray-300">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-gray-700 text-white border border-gray-600 p-2 rounded"
              required
            />
          </div>
          
          <button
            type="submit"
            className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700 transition"
            disabled={loading}
          >
            {loading ? 'Processing...' : authMode === 'signin' ? 'Sign In' : 'Create Account'}
          </button>
        </form>
        
        <div className="mt-4 text-center text-gray-400">
          {authMode === 'signin' ? (
            <>
              Don&apos;t have an account?{' '}
              <button 
                onClick={() => setAuthMode('signup')}
                className="text-blue-400 hover:underline"
              >
                Sign up
              </button>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <button 
                onClick={() => setAuthMode('signin')}
                className="text-blue-400 hover:underline"
              >
                Sign in
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
