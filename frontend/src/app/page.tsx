import Link from "next/link";
import { CateringCard } from "@/components/catering-card";
import { MenuCard } from "@/components/menu-card";
import { SectionHeading } from "@/components/section-heading";
import { cateringPackages, menuItems, quickStats } from "@/data/site";

export default function Home() {
  return (
    <main className="bg-[#f8f5f0] text-slate-900">
      <header className="mx-auto max-w-7xl px-6 py-5">
        <div className="flex items-center justify-between rounded-full border border-slate-200 bg-white/90 px-5 py-3 shadow-sm backdrop-blur-sm">
          <div>
            <p className="text-lg font-black tracking-tight text-slate-900">Umodai</p>
          </div>
          <nav className="hidden items-center gap-8 text-sm font-medium text-slate-600 md:flex">
            <Link href="#menu">Menu</Link>
            <Link href="#catering">Catering</Link>
            <Link href="#contact">Contact</Link>
            <Link href="/admin" className="rounded-full bg-slate-900 px-4 py-2 text-white">
              Admin
            </Link>
          </nav>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-6 pb-16 pt-8 md:pb-24">
        <div className="grid items-center gap-8 overflow-hidden rounded-[2rem] bg-gradient-to-br from-slate-900 via-slate-800 to-amber-900 p-8 text-white shadow-[0_30px_80px_rgba(15,23,42,0.25)] md:grid-cols-[1.1fr_0.9fr] md:p-12">
          <div>
            <p className="mb-4 inline-flex rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-amber-200">
              Ajman, UAE
            </p>
            <h1 className="max-w-xl text-4xl font-black leading-tight tracking-tight md:text-6xl">
              Fresh flavors & memorable catering for every gathering.
            </h1>
            <p className="mt-5 max-w-lg text-base leading-7 text-slate-200 md:text-lg">
              Discover Umodai&apos;s signature dishes, place quick restaurant orders, and request bespoke catering for family, corporate, and special occasions.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                href="#menu"
                className="rounded-full bg-amber-500 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-amber-400"
              >
                Order now
              </Link>
              <Link
                href="#catering"
                className="rounded-full border border-white/25 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                Catering enquiry
              </Link>
            </div>
          </div>

          <div className="rounded-[2rem] bg-white/8 p-5 backdrop-blur-sm">
            <div className="rounded-[1.5rem] bg-[#f7efe6] p-5 text-slate-900">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">Today&apos;s favourites</p>
              <div className="mt-5 space-y-4">
                {menuItems.slice(0, 3).map((item) => (
                  <div key={item.name} className="rounded-2xl bg-white p-4 shadow-sm">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="font-semibold">{item.name}</h3>
                      <span className="font-bold text-amber-700">{item.price}</span>
                    </div>
                    <p className="mt-2 text-sm text-slate-600">{item.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-16">
        <div className="grid gap-4 md:grid-cols-4">
          {quickStats.map((stat) => (
            <div key={stat.label} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-500">{stat.label}</p>
              <p className="mt-3 text-2xl font-bold text-slate-900">{stat.value}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="menu" className="mx-auto max-w-7xl px-6 py-16">
        <SectionHeading
          eyebrow="Menu"
          title="Crafted dishes for everyday cravings"
          description="From quick lunches to family sharing platters, every recipe is built for flavour, freshness, and convenience."
        />
        <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {menuItems.map((item) => (
            <MenuCard key={item.name} item={item} />
          ))}
        </div>
      </section>

      <section id="catering" className="bg-slate-900 py-16 text-white">
        <div className="mx-auto max-w-7xl px-6">
          <SectionHeading
            eyebrow="Catering"
            title="Beautiful food for business and family events"
            description="We tailor bespoke event menus and simplify the review process so your gathering can be confirmed quickly and professionally."
          />
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {cateringPackages.map((item) => (
              <CateringCard key={item.name} item={item} />
            ))}
          </div>
        </div>
      </section>

      <section id="contact" className="mx-auto max-w-7xl px-6 py-16">
        <div className="grid gap-8 rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm md:grid-cols-[1fr_0.9fr]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-700">Visit & contact</p>
            <h2 className="mt-3 text-3xl font-bold text-slate-900">Ready to enjoy Umodai?</h2>
            <p className="mt-4 max-w-xl text-base leading-7 text-slate-600">
              Order for lunch, arrange catering, or call the restaurant to plan your next event with a human review before confirmation.
            </p>
            <div className="mt-8 space-y-4 text-slate-700">
              <p><strong className="text-slate-900">Address:</strong> Ajman, UAE</p>
              <p><strong className="text-slate-900">Phone:</strong> +971 00 000 0000</p>
              <p><strong className="text-slate-900">WhatsApp:</strong> +971 00 000 0000</p>
            </div>
          </div>

          <div className="rounded-[1.5rem] bg-amber-50 p-6">
            <h3 className="text-xl font-bold text-slate-900">Request a catering consultation</h3>
            <form className="mt-6 space-y-4">
              <input className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none ring-0" placeholder="Name" />
              <input className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none ring-0" placeholder="Email or phone" />
              <textarea className="min-h-28 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none ring-0" placeholder="Event details" />
              <button type="button" className="w-full rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white">
                Send enquiry
              </button>
            </form>
          </div>
        </div>
      </section>
    </main>
  );
}
