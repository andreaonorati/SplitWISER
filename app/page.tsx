import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-accent-50">
      {/* Hero */}
      <div className="mx-auto max-w-7xl px-6 py-24 sm:py-32 lg:px-8">
        <div className="text-center">
          <h1 className="text-5xl font-extrabold tracking-tight text-gray-900 sm:text-7xl">
            Split<span className="text-primary-600">WISER</span>
          </h1>
          <p className="mt-6 text-xl leading-8 text-gray-600 max-w-2xl mx-auto">
            The smartest way to split expenses on group trips.
            AI-powered receipt scanning, automatic debt calculation,
            and optimized settlements — so you can focus on the adventure.
          </p>
          <div className="mt-10 flex items-center justify-center gap-x-4">
            <Link href="/register" className="btn-primary text-base px-8 py-3">
              Get Started Free
            </Link>
            <Link href="/login" className="btn-secondary text-base px-8 py-3">
              Sign In
            </Link>
          </div>
        </div>

        {/* Features */}
        <div className="mt-32 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
          <FeatureCard
            emoji="📸"
            title="AI Receipt Scanning"
            description="Snap a photo of any receipt, screenshot, or bill. Our AI extracts all the details and auto-fills the expense form."
          />
          <FeatureCard
            emoji="⚡"
            title="Smart Debt Simplification"
            description="Our algorithm minimizes the number of payments needed to settle up. No more complex chains of who owes whom."
          />
          <FeatureCard
            emoji="📊"
            title="Real-time Balances"
            description="See exactly who paid what, who owes whom, and the optimal settlement plan — updated instantly."
          />
          <FeatureCard
            emoji="📑"
            title="CSV & Excel Import"
            description="Upload bank statements or spreadsheets. AI parses transactions and suggests how to split them."
          />
          <FeatureCard
            emoji="👥"
            title="Flexible Splitting"
            description="Split equally, by percentage, or custom amounts. Handle any splitting scenario with ease."
          />
          <FeatureCard
            emoji="🌍"
            title="Trip Groups"
            description="Organize expenses by trip. Invite friends, track spending, and settle up when the trip ends."
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
