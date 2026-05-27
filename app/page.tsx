import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen">
      <nav className="container-app py-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-md bg-navy-900 flex items-center justify-center">
            <span className="font-serif text-cream-50 text-lg leading-none">H</span>
          </div>
          <span className="font-serif text-xl text-navy-900">Hobby Haven</span>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <Link
            href="/login"
            className="text-ink-muted hover:text-navy-900 transition-colors"
          >
            Log in
          </Link>
          <Link
            href="/signup"
            className="bg-navy-900 text-cream-50 px-4 py-2 rounded-md hover:bg-navy-800 transition-colors"
          >
            Get started
          </Link>
        </div>
      </nav>

      <section className="container-app pt-16 pb-24">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cream-100 border border-cream-200 text-sm text-ink-muted mb-6">
            <span className="h-1.5 w-1.5 rounded-full bg-gold" />
            Now in early access · Break Room
          </div>
          <h1 className="text-5xl sm:text-6xl text-navy-900 leading-[1.05] mb-6">
            Tools built for the hobby,
            <br />
            not against it.
          </h1>
          <p className="text-lg text-ink-muted mb-8 leading-relaxed">
            Hobby Haven is the home for breakers and collectors who are tired of
            spreadsheet chaos. Track breaks, customers, profit, and shipments in
            one place that actually understands how the hobby works.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              href="/signup"
              className="inline-flex items-center justify-center bg-navy-900 text-cream-50 px-6 py-3 rounded-md hover:bg-navy-800 transition-colors font-medium"
            >
              Start your free trial
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center px-6 py-3 rounded-md border border-cream-200 hover:border-navy-300 text-navy-900 transition-colors font-medium"
            >
              I already have an account
            </Link>
          </div>
          <p className="text-sm text-ink-subtle mt-4">
            14-day free trial · No credit card required
          </p>
        </div>

        <div className="gold-divider my-16" />

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="card-surface p-6">
            <h3 className="text-lg text-navy-900 mb-2">Break Room</h3>
            <p className="text-sm text-ink-muted leading-relaxed">
              Plan breaks, sell spots, track profit live, and keep your customer
              list organized across Whatnot, Fanatics Live, and Discord.
            </p>
            <p className="text-xs text-gold mt-3 font-medium">Available now</p>
          </div>
          <div className="card-surface p-6 opacity-70">
            <h3 className="text-lg text-navy-900 mb-2">Inventory</h3>
            <p className="text-sm text-ink-muted leading-relaxed">
              The card-logging tool that doesn&apos;t make you fight to find the
              right parallel. Filtered entry, cost basis, profit and loss.
            </p>
            <p className="text-xs text-ink-subtle mt-3 font-medium">Coming soon</p>
          </div>
          <div className="card-surface p-6 opacity-70">
            <h3 className="text-lg text-navy-900 mb-2">Marketplace</h3>
            <p className="text-sm text-ink-muted leading-relaxed">
              A clean offer-and-counter marketplace authenticated through Discord
              so you can sell direct to your community.
            </p>
            <p className="text-xs text-ink-subtle mt-3 font-medium">Coming soon</p>
          </div>
        </div>
      </section>

      <footer className="border-t border-cream-200 mt-auto">
        <div className="container-app py-8 flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-ink-subtle">
          <p>© {new Date().getFullYear()} Hobby Haven</p>
          <p className="font-serif italic">Built for the hobby</p>
        </div>
      </footer>
    </main>
  );
}
