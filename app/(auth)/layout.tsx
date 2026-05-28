import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen flex flex-col">
      <header className="container-app py-6">
        <Link href="/" className="inline-flex items-center gap-2">
          <div className="h-8 w-8 rounded-md bg-navy-900 flex items-center justify-center">
            <span className="font-serif text-cream-50 text-lg leading-none">
              H
            </span>
          </div>
          <span className="font-serif text-xl text-navy-900">Hobby Haven</span>
        </Link>
      </header>
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">{children}</div>
      </div>
      <footer className="border-t border-cream-200">
        <div className="container-app py-6 text-sm text-ink-subtle text-center">
          <p className="font-serif italic">Built for the hobby</p>
        </div>
      </footer>
    </main>
  );
}
