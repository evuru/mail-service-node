import { Link, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Mail, ArrowRight } from 'lucide-react';

// ─── Navbar ───────────────────────────────────────────────────────────────────

export function PublicNavbar() {
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const navLinks = [
    { label: 'Features', to: '/features' },
    { label: 'How it works', to: '/how-it-works' },
    { label: 'Pricing', to: '/pricing' },
    { label: 'Docs', to: '/docs' },
  ];

  return (
    <header className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
      scrolled ? 'bg-slate-950/95 backdrop-blur-md shadow-lg shadow-black/20' : 'bg-transparent'
    }`}>
      <nav className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <Mail className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-white text-[15px] tracking-tight">MailService</span>
        </Link>

        {/* Nav links */}
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map(({ label, to }) => {
            const active = location.pathname === to;
            return (
              <Link key={to} to={to}
                className={`text-sm font-medium transition-colors ${
                  active ? 'text-white' : 'text-slate-400 hover:text-white'
                }`}>
                {label}
              </Link>
            );
          })}
        </div>

        {/* CTAs */}
        <div className="flex items-center gap-3">
          <Link to="/login"
            className="text-sm font-medium text-slate-300 hover:text-white transition-colors px-3 py-1.5">
            Sign in
          </Link>
          <Link to="/register"
            className="text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 px-4 py-2 rounded-lg transition-colors shadow-lg shadow-indigo-500/25">
            Get started free
          </Link>
        </div>
      </nav>
    </header>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────

export function PublicFooter() {
  const year = new Date().getFullYear();

  const links: Record<string, { label: string; to: string }[]> = {
    Product: [
      { label: 'Features', to: '/features' },
      { label: 'How it works', to: '/how-it-works' },
      { label: 'Pricing', to: '/pricing' },
      { label: 'Docs', to: '/docs' },
    ],
    Account: [
      { label: 'Sign in', to: '/login' },
      { label: 'Register', to: '/register' },
    ],
  };

  return (
    <footer className="bg-slate-950 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-6 pt-16 pb-10">
        <div className="grid md:grid-cols-3 gap-12 mb-16">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
                <Mail className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-white text-[15px]">MailService</span>
            </div>
            <p className="text-sm text-slate-500 leading-relaxed max-w-xs">
              Self-hosted email template infrastructure for developers and teams.
            </p>
            <Link to="/register"
              className="group inline-flex items-center gap-1.5 mt-5 text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-colors">
              Get started free
              <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>

          {/* Link columns */}
          {Object.entries(links).map(([section, items]) => (
            <div key={section}>
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4">{section}</div>
              <ul className="space-y-3">
                {items.map(({ label, to }) => (
                  <li key={to}>
                    <Link to={to} className="text-sm text-slate-500 hover:text-slate-300 transition-colors">
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="border-t border-slate-800 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-xs text-slate-600">© {year} MailService. Built for developers.</span>
          <div className="flex items-center gap-6">
            {['Privacy', 'Terms', 'Status'].map((l) => (
              <span key={l} className="text-xs text-slate-600 hover:text-slate-400 cursor-pointer transition-colors">{l}</span>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}

// ─── Page shell (dark bg nav + optional page hero + footer) ──────────────────

interface PublicPageProps {
  children: React.ReactNode;
}

export function PublicPage({ children }: PublicPageProps) {
  return (
    <div className="min-h-screen bg-white text-slate-900 antialiased">
      <PublicNavbar />
      {children}
      <PublicFooter />
    </div>
  );
}

// ─── Shared page hero strip ───────────────────────────────────────────────────

interface PageHeroProps {
  badge: string;
  title: React.ReactNode;
  subtitle: string;
}

export function PageHero({ badge, title, subtitle }: PageHeroProps) {
  return (
    <section className="bg-slate-950 pt-32 pb-20 relative overflow-hidden">
      <div className="absolute inset-0"
        style={{
          backgroundImage: `linear-gradient(rgba(99,102,241,0.05) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(99,102,241,0.05) 1px, transparent 1px)`,
          backgroundSize: '60px 60px',
        }} />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative max-w-4xl mx-auto px-6 text-center">
        <div className="inline-flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 rounded-full px-4 py-1.5 text-xs font-semibold text-indigo-400 uppercase tracking-widest mb-6">
          {badge}
        </div>
        <h1 className="text-4xl lg:text-6xl font-black tracking-tight text-white mb-5 leading-tight">
          {title}
        </h1>
        <p className="text-lg text-slate-400 leading-relaxed max-w-2xl mx-auto">{subtitle}</p>
      </div>
    </section>
  );
}
