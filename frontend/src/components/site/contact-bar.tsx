import { telLink, whatsappLink } from "@/config/business";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionary";

/**
 * Call and WhatsApp buttons pinned to the bottom of small screens (PRD
 * P0-F013). The layout reserves the same height at the bottom of the page
 * (pb-14 on mobile) so content can scroll clear of it, and the bar hides
 * while a form field has focus (globals.css).
 */
export function ContactBar({ locale, actions }: { locale: Locale; actions: Dictionary["actions"] }) {
  return (
    <div className="contact-bar fixed inset-x-0 bottom-0 z-30 grid grid-cols-2 gap-px border-t-2 border-madder bg-madder md:hidden">
      <a href={telLink()} className="flex min-h-14 items-center justify-center gap-2 bg-plaster font-semibold text-indigo">
        <PhoneIcon />
        {actions.call}
      </a>
      <a
        href={whatsappLink(locale)}
        target="_blank"
        rel="noopener noreferrer"
        className="flex min-h-14 items-center justify-center gap-2 bg-palm font-semibold text-plaster"
      >
        <ChatIcon />
        {actions.whatsapp}
      </a>
    </div>
  );
}

export function PhoneIcon() {
  return (
    <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z" />
    </svg>
  );
}

export function ChatIcon() {
  return (
    <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 11.5a8.4 8.4 0 0 1-12.4 7.4L3 21l2.1-5.5A8.4 8.4 0 1 1 21 11.5z" />
    </svg>
  );
}
