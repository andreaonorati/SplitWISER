'use client';

import { useAuthStore } from '@/stores/authStore';
import { Avatar } from '@/components/ui/Avatar';
import Link from 'next/link';
import { LogOut, Receipt, Menu, X } from 'lucide-react';
import { useState } from 'react';

export function Navbar() {
  const { user, logout, isAuthenticated } = useAuthStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  if (!isAuthenticated) return null;

  return (
    <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/dashboard" className="flex items-center gap-2">
            <Receipt className="h-7 w-7 text-primary-600" />
            <span className="text-xl font-bold text-gray-900">
              Split<span className="text-primary-600">WISER</span>
            </span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-6">
            <Link
              href="/dashboard"
              className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
            >
              Dashboard
            </Link>
            <Link
              href="/groups"
              className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
            >
              My Trips
            </Link>

            <div className="flex items-center gap-3 ml-4 pl-4 border-l border-gray-200">
              <Link href="/profile" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                <Avatar name={user?.name || ''} size="sm" />
                <span className="text-sm font-medium text-gray-700">{user?.name}</span>
              </Link>
              <button
                onClick={logout}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                title="Logout"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden p-2 rounded-lg text-gray-600"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-gray-200 bg-white px-4 py-4 space-y-3">
          <Link
            href="/dashboard"
            className="block text-sm font-medium text-gray-600"
            onClick={() => setMobileMenuOpen(false)}
          >
            Dashboard
          </Link>
          <Link
            href="/groups"
            className="block text-sm font-medium text-gray-600"
            onClick={() => setMobileMenuOpen(false)}
          >
            My Trips
          </Link>
          <Link
            href="/profile"
            className="block text-sm font-medium text-gray-600"
            onClick={() => setMobileMenuOpen(false)}
          >
            Settings
          </Link>
          <div className="pt-3 border-t border-gray-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Avatar name={user?.name || ''} size="sm" />
              <span className="text-sm text-gray-700">{user?.name}</span>
            </div>
            <button onClick={logout} className="text-sm text-red-600 font-medium">
              Logout
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}
