'use client';

import { AuthLayout } from '@/components/layout/AuthLayout';
import { useAuthStore } from '@/stores/authStore';
import { Avatar } from '@/components/ui/Avatar';
import { api } from '@/lib/api';
import { useState } from 'react';
import { ArrowLeft, User, Lock, Save } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';

export default function ProfilePage() {
  return (
    <AuthLayout>
      <ProfileContent />
    </AuthLayout>
  );
}

function ProfileContent() {
  const { user, loadUser } = useAuthStore();

  // Profile form
  const [name, setName] = useState(user?.name || '');
  const [saving, setSaving] = useState(false);

  // Password form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Name cannot be empty');
      return;
    }
    setSaving(true);
    try {
      await api.updateProfile({ name: name.trim() });
      await loadUser();
      toast.success('Profile updated!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    setChangingPassword(true);
    try {
      await api.changePassword({ currentPassword, newPassword });
      toast.success('Password changed!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      toast.error(err.message || 'Failed to change password');
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Dashboard
      </Link>

      <h1 className="text-2xl font-bold text-gray-900 mb-8">Account Settings</h1>

      {/* Avatar & info */}
      <div className="card mb-6 flex items-center gap-4">
        <Avatar name={user?.name || ''} size="lg" />
        <div>
          <p className="font-semibold text-gray-900 text-lg">{user?.name}</p>
          <p className="text-sm text-gray-500">{user?.email}</p>
          <p className="text-xs text-gray-400 mt-1">
            Member since {new Date(user?.createdAt || '').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </p>
        </div>
      </div>

      {/* Edit profile */}
      <div className="card mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <User className="h-5 w-5 text-primary-600" />
          Edit Profile
        </h2>
        <form onSubmit={handleUpdateProfile} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={user?.email || ''}
              disabled
              className="input bg-gray-50 text-gray-500 cursor-not-allowed"
            />
            <p className="text-xs text-gray-400 mt-1">Email cannot be changed</p>
          </div>
          <button type="submit" className="btn-primary gap-2" disabled={saving}>
            <Save className="h-4 w-4" />
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </div>

      {/* Change password */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Lock className="h-5 w-5 text-primary-600" />
          Change Password
        </h2>
        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
            <input
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="input"
              placeholder="••••••••"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
            <input
              type="password"
              required
              minLength={6}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="input"
              placeholder="At least 6 characters"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="input"
              placeholder="••••••••"
            />
          </div>
          <button type="submit" className="btn-primary gap-2" disabled={changingPassword}>
            <Lock className="h-4 w-4" />
            {changingPassword ? 'Changing...' : 'Change Password'}
          </button>
        </form>
      </div>
    </div>
  );
}
