'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ShieldAlert,
  Lock,
  ArrowLeft,
  KeyRound,
  Eye,
  EyeOff,
  LogOut,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export function AdminAuthGuard({
  children,
  initialAuthenticated = false,
}: {
  children: React.ReactNode;
  initialAuthenticated?: boolean;
}) {
  const router = useRouter();

  const [isAuthenticated, setIsAuthenticated] = useState(initialAuthenticated);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setAuthError('Please enter the admin password.');
      return;
    }

    try {
      setSubmitting(true);
      setAuthError(null);

      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: password.trim() }),
      });

      const data = await res.json();

      if (!res.ok || !data.authenticated) {
        throw new Error(data.error || 'Incorrect admin password. Access denied.');
      }

      setIsAuthenticated(true);
      setPassword('');
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Authentication failed';
      setAuthError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/admin/auth', { method: 'DELETE' });
    } catch (err) {
      console.error('Error logging out:', err);
    } finally {
      setIsAuthenticated(false);
      router.refresh();
    }
  };

  // Unauthorized / Access Denied & Admin Authentication Screen
  if (!isAuthenticated) {
    return (
      <div className="min-h-[85vh] flex items-center justify-center p-4 sm:p-6 py-12">
        <div className="w-full max-w-md space-y-6">
          <Card className="rounded-2xl border-[#262626] bg-[#0E0E0E] shadow-2xl overflow-hidden">
            <div className="h-2 w-full bg-gradient-to-r from-amber-500 via-red-500 to-amber-500" />

            <CardHeader className="text-center pt-8 pb-4 px-6 space-y-3">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 shadow-inner">
                <ShieldAlert className="h-8 w-8" />
              </div>

              <div>
                <CardTitle className="text-xl sm:text-2xl font-black tracking-tight text-white">
                  Restricted Admin Access
                </CardTitle>
                <CardDescription className="text-xs text-[#A1A1AA] mt-1.5 leading-relaxed">
                  This portal is reserved strictly for authorized administrators to manage templates and configure photo slots.
                </CardDescription>
              </div>
            </CardHeader>

            <CardContent className="px-6 pb-8 space-y-6">
              <div className="p-4 rounded-xl border border-[#262626] bg-[#141414] text-center space-y-2.5">
                <p className="text-xs text-[#A1A1AA]">
                  Looking to browse ready-made posters and replace your photo?
                </p>
                <Link href="/" className="block">
                  <Button
                    variant="outline"
                    className="w-full h-10 rounded-xl text-xs font-semibold border-[#2E2E2E] bg-[#1A1A1A] text-white hover:bg-[#252525] transition-colors"
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    <span>Return to Public User Experience</span>
                  </Button>
                </Link>
              </div>

              <div className="pt-2 border-t border-[#262626]">
                <div className="flex items-center gap-2 mb-3 text-xs font-semibold text-[#A1A1AA]">
                  <KeyRound className="h-3.5 w-3.5 text-white" />
                  <span>Authorized Personnel Login</span>
                </div>

                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-1.5">
                    <div className="relative">
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter Admin Password..."
                        className="h-11 rounded-xl bg-[#080808] border-[#2A2A2A] text-white pr-10 text-sm placeholder:text-[#52525B] focus-visible:border-white focus-visible:ring-0"
                        autoComplete="current-password"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#71717A] hover:text-white"
                        tabIndex={-1}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>

                    {authError && (
                      <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
                        {authError}
                      </div>
                    )}
                  </div>

                  <Button
                    type="submit"
                    disabled={submitting}
                    className="w-full h-11 rounded-xl font-bold bg-white text-black hover:bg-neutral-200 transition-colors"
                  >
                    {submitting ? (
                      <div className="flex items-center gap-2">
                        <div className="h-4 w-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                        <span>Verifying Authorization...</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Lock className="h-4 w-4" />
                        <span>Unlock Admin Panel</span>
                      </div>
                    )}
                  </Button>
                </form>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Authenticated Admin View
  return (
    <div className="flex flex-col min-h-full">
      <div className="sticky top-16 z-40 w-full border-b border-[#262626] bg-[#0A0A0A]/95 backdrop-blur-md">
        <div className="container mx-auto flex h-12 max-w-7xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-1 text-[11px] font-semibold text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Admin Mode Active</span>
            </span>
            <span className="text-xs text-[#71717A] hidden sm:inline">
              Poster Management &amp; Slot Configuration
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Link href="/" target="_blank" rel="noopener noreferrer">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs text-[#A1A1AA] hover:text-white hover:bg-[#1A1A1A] rounded-lg"
              >
                <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                <span className="hidden sm:inline">Preview User Site</span>
                <span className="sm:hidden">User Site</span>
              </Button>
            </Link>

            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="h-8 text-xs border-[#262626] bg-[#111111] text-[#A1A1AA] hover:text-white hover:bg-[#1A1A1A] rounded-lg"
            >
              <LogOut className="mr-1.5 h-3.5 w-3.5" />
              <span>Lock / Logout</span>
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1">{children}</div>
    </div>
  );
}
