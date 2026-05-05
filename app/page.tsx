'use client';

import Link from 'next/link';
import { useI18n } from '@/lib/i18n';

export default function Home() {
  const { language, setLanguage, t } = useI18n();

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-accent-50">
      <div className="mx-auto flex max-w-7xl justify-end px-6 pt-6 lg:px-8">
        <div className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white/80 p-1 shadow-sm backdrop-blur">
          <span className="px-2 text-xs font-semibold text-gray-600">{t('navbar.language')}</span>
          <button
            onClick={() => setLanguage('en')}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
              language === 'en' ? 'bg-primary-600 text-white' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            EN
          </button>
          <button
            onClick={() => setLanguage('it')}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
              language === 'it' ? 'bg-primary-600 text-white' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            IT
          </button>
        </div>
      </div>

      {/* Hero */}
      <div className="mx-auto max-w-7xl px-6 py-20 sm:py-28 lg:px-8">
        <div className="text-center">
          <h1 className="text-5xl font-extrabold tracking-tight text-gray-900 sm:text-7xl">
            Split<span className="text-primary-600">WISER</span>
          </h1>
          <p className="mt-6 text-xl leading-8 text-gray-600 max-w-2xl mx-auto">
            {t('home.tagline')}
            <br />
            {t('home.taglineLine2')}
            <br />
            {t('home.taglineLine3')}
          </p>
          <div className="mt-10 flex items-center justify-center gap-x-4">
            <Link href="/register" className="btn-primary text-base px-8 py-3">
              {t('home.getStarted')}
            </Link>
            <Link href="/login" className="btn-secondary text-base px-8 py-3">
              {t('home.signIn')}
            </Link>
          </div>

          <div className="mx-auto mt-8 max-w-4xl rounded-2xl border border-primary-100 bg-white/70 p-4 shadow-sm backdrop-blur">
            <p className="text-sm font-semibold text-gray-700">{t('home.chooseVersion')}</p>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Link
                href="/v1"
                className="rounded-xl border border-gray-200 bg-white px-4 py-5 text-center text-base font-semibold text-gray-800 transition-all hover:border-primary-300 hover:shadow"
              >
                {t('home.openV1')}
              </Link>
              <Link
                href="/v2"
                className="rounded-xl border border-primary-200 bg-primary-50 px-4 py-5 text-center text-base font-semibold text-primary-800 transition-all hover:bg-primary-100 hover:shadow"
              >
                {t('home.openV2')}
              </Link>
              <Link
                href="/versions"
                className="rounded-xl border border-gray-200 bg-white px-4 py-5 text-center text-base font-semibold text-gray-800 transition-all hover:border-primary-300 hover:shadow"
              >
                {t('home.openVersionHub')}
              </Link>
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="mt-32 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
          <FeatureCard
            emoji="📸"
            title={t('home.feature1Title')}
            description={t('home.feature1Desc')}
          />
          <FeatureCard
            emoji="⚡"
            title={t('home.feature2Title')}
            description={t('home.feature2Desc')}
          />
          <FeatureCard
            emoji="📊"
            title={t('home.feature3Title')}
            description={t('home.feature3Desc')}
          />
          <FeatureCard
            emoji="📑"
            title={t('home.feature4Title')}
            description={t('home.feature4Desc')}
          />
          <FeatureCard
            emoji="👥"
            title={t('home.feature5Title')}
            description={t('home.feature5Desc')}
          />
          <FeatureCard
            emoji="🌍"
            title={t('home.feature6Title')}
            description={t('home.feature6Desc')}
          />
        </div>
      </div>
    </div>
  );
}

function FeatureCard({ emoji, title, description }: { emoji: string; title: string; description: string }) {
  return (
    <div className="card hover:shadow-md transition-shadow">
      <div className="text-3xl mb-3">{emoji}</div>
      <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      <p className="mt-2 text-sm text-gray-600">{description}</p>
    </div>
  );
}
