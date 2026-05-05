import Link from 'next/link';

export default function V1HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 px-6 py-14">
      <div className="mx-auto max-w-4xl rounded-3xl border border-slate-200 bg-white p-10 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Version 1</p>
        <h1 className="mt-3 text-4xl font-extrabold tracking-tight text-slate-900">SplitWISER Classic</h1>
        <p className="mt-4 max-w-2xl text-base text-slate-600">
          Esperienza baseline: flusso pulito e diretto per login, gruppi e gestione spese.
        </p>

        <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Link
            href="/register"
            className="rounded-xl bg-slate-900 px-4 py-3 text-center text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Inizia con V1
          </Link>
          <Link
            href="/login"
            className="rounded-xl border border-slate-300 px-4 py-3 text-center text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
          >
            Accedi
          </Link>
          <Link
            href="/v1/groups/demo"
            className="rounded-xl border border-slate-300 px-4 py-3 text-center text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
          >
            Apri gruppo demo
          </Link>
        </div>
      </div>
    </div>
  );
}
