import React, { useState } from 'react';
import { LogIn, UserPlus, Eye, EyeOff, Loader2, Settings, ChevronLeft } from 'lucide-react';
import { useAuthStore } from '../stores/useAuthStore';
import { ConnectionSettings } from '../components/settings/ConnectionSettings';

export function LoginPage() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [showSettings, setShowSettings] = useState(false);

  const { login, register, loading } = useAuthStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username.trim() || !password) {
      setError('Username and password are required');
      return;
    }

    if (mode === 'register') {
      if (password.length < 4) {
        setError('Password must be at least 4 characters');
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match');
        return;
      }
      await register(username.trim(), password);
    } else {
      await login(username.trim(), password);
    }
  };

  const switchMode = () => {
    setMode(mode === 'login' ? 'register' : 'login');
    setError('');
    setConfirmPassword('');
  };

  return (
    <div className="flex items-center justify-center h-screen w-screen bg-primary relative loginscreen">
      {/* Settings button */}
      <button
        onClick={() => setShowSettings(!showSettings)}
        className="absolute top-4 right-4 p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-card transition-colors"
        title="Server settings"
      >
        <Settings size={18} />
      </button>

      {showSettings ? (
        <div className="w-full max-h-[85vh] overflow-y-auto bg-card border border-card-border rounded-2xl p-6 shadow-lg max-w-2xl">
          <button
            onClick={() => setShowSettings(false)}
            className="flex items-center gap-1 text-sm text-text-muted hover:text-text-primary mb-4 transition-colors"
          >
            <ChevronLeft size={16} />
            Back to login
          </button>
          <ConnectionSettings minimal />
        </div>
      ) : (
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-text-primary mb-1">
            {mode === 'login' ? 'Welcome Back' : 'Create Account'}
          </h1>
          <p className="text-sm text-text-muted">
            {mode === 'login'
              ? 'Sign in to access your library'
              : 'Create an account to get started'}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-card border border-card-border rounded-2xl p-6 space-y-4 shadow-lg">
          {/* Username */}
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1.5">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-surface border border-card-border text-text-primary text-sm placeholder:text-text-muted focus:outline-none focus:border-accent transition-colors"
              placeholder="Enter username"
              autoFocus
              disabled={loading}
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1.5">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2.5 pr-10 rounded-xl bg-surface border border-card-border text-text-primary text-sm placeholder:text-text-muted focus:outline-none focus:border-accent transition-colors"
                placeholder="Enter password"
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary transition-colors"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Confirm Password (register only) */}
          {mode === 'register' && (
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1.5">Confirm Password</label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-surface border border-card-border text-text-primary text-sm placeholder:text-text-muted focus:outline-none focus:border-accent transition-colors"
                placeholder="Confirm password"
                disabled={loading}
              />
            </div>
          )}

          {/* Error */}
          {error && (
            <p className="text-xs text-danger">{error}</p>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-primary bg-accent hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {loading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : mode === 'login' ? (
              <LogIn size={16} />
            ) : (
              <UserPlus size={16} />
            )}
            {loading ? 'Please wait...' : mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        {/* Toggle mode */}
        <p className="text-center text-sm text-text-muted mt-5">
          {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}{' '}
          <button
            onClick={switchMode}
            className="text-accent hover:underline font-medium"
            disabled={loading}
          >
            {mode === 'login' ? 'Create one' : 'Sign in'}
          </button>
        </p>
      </div>
      )}
    </div>
  );
}
