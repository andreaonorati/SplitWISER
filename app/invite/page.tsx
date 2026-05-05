'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { Spinner } from '@/components/ui/Spinner';
import { Receipt, CheckCircle, XCircle } from 'lucide-react';
import Link from 'next/link';
import { useI18n } from '@/lib/i18n';

export default function AcceptInvitePage() {
  return (
    <Suspense>
      <InviteContent />
    </Suspense>
  );
}

function InviteContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading, loadUser } = useAuthStore();
  const token = searchParams.get('token');

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [groupId, setGroupId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const { t } = useI18n();

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  useEffect(() => {
    if (authLoading) return;

    if (!isAuthenticated) {
      // Redirect to login with return URL
      router.push(`/login?redirect=/invite?token=${token}`);
      return;
    }

    if (!token) {
      setStatus('error');
      setErrorMsg(t('invite.noToken'));
      return;
    }

    api
      .acceptInvite(token)
      .then((res) => {
        setGroupId(res.groupId);
        setStatus('success');
      })
      .catch((err) => {
        setStatus('error');
        setErrorMsg(err.message || t('invite.failedAccept'));
      });
  }, [authLoading, isAuthenticated, token, router, t]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md text-center">
        <Link href="/" className="inline-flex items-center gap-2 mb-8">
          <Receipt className="h-8 w-8 text-primary-600" />
          <span className="text-2xl font-bold">
            Split<span className="text-primary-600">WISER</span>
          </span>
        </Link>

        <div className="card">
          {status === 'loading' && (
            <div className="py-8">
              <Spinner size="lg" className="mx-auto" />
              <p className="mt-4 text-gray-600">{t('invite.accepting')}</p>
            </div>
          )}

          {status === 'success' && (
            <div className="py-8">
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
              <h2 className="mt-4 text-xl font-bold text-gray-900">{t('invite.successTitle')}</h2>
              <p className="mt-2 text-gray-600">{t('invite.successBody')}</p>
              <Link
                href={groupId ? `/groups/${groupId}` : '/dashboard'}
                className="btn-primary mt-6 inline-flex"
              >
                {t('invite.goToTrip')}
              </Link>
            </div>
          )}

          {status === 'error' && (
            <div className="py-8">
              <XCircle className="h-16 w-16 text-red-500 mx-auto" />
              <h2 className="mt-4 text-xl font-bold text-gray-900">{t('invite.failedTitle')}</h2>
              <p className="mt-2 text-gray-600">{errorMsg}</p>
              <Link href="/dashboard" className="btn-secondary mt-6 inline-flex">
                {t('invite.goToDashboard')}
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
