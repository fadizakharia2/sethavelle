import type { ReactNode } from "react";
import { Link } from "react-router";

import { JsonLd } from "~/components/JsonLd";
import { LineReveal, Reveal } from "~/components/motion/Reveal";
import { breadcrumbJsonLd, type Crumb } from "~/lib/seo";

/** Visible breadcrumb trail + matching BreadcrumbList structured data. */
export function Breadcrumbs({ crumbs, origin }: { crumbs: Crumb[]; origin?: string }) {
  return (
    <>
      {origin ? <JsonLd data={breadcrumbJsonLd(origin, crumbs)} /> : null}
      <nav aria-label="Breadcrumb">
        <ol className="flex flex-wrap items-center gap-2 text-[0.625rem] tracking-[0.28em] text-[#a89d8e] uppercase">
          {crumbs.map((crumb, index) => {
            const last = index === crumbs.length - 1;
            return (
              <li key={crumb.path} className="flex items-center gap-2">
                {last ? (
                  <span aria-current="page" className="text-[#e5d8c5]">
                    {crumb.name}
                  </span>
                ) : (
                  <>
                    <Link to={crumb.path} className="sv-link hover:text-[#e5d8c5]">
                      {crumb.name}
                    </Link>
                    <span aria-hidden="true" className="text-[#b59660]/60">
                      ◆
                    </span>
                  </>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
    </>
  );
}

export function PageHeader({
  kicker,
  title,
  italic,
  lede,
  crumbs,
  origin,
  children,
}: {
  kicker?: string;
  title: string;
  italic?: string;
  lede?: ReactNode;
  crumbs?: Crumb[];
  origin?: string;
  children?: ReactNode;
}) {
  return (
    <header className="max-w-page px-margin relative mx-auto w-full pt-14 pb-12 md:pt-20 md:pb-16">
      {crumbs ? (
        <div className="mb-10">
          <Breadcrumbs crumbs={crumbs} origin={origin} />
        </div>
      ) : null}
      {kicker ? <p className="sv-kicker mb-5">{kicker}</p> : null}
      <LineReveal
        as="h1"
        immediate
        className="sv-display text-[clamp(2.75rem,1.5rem+5vw,6.5rem)] text-[#e5d8c5]"
        lines={
          italic
            ? [
                title,
                <span key="i" className="sv-italic text-[#b59660]">
                  {italic}
                </span>,
              ]
            : [title]
        }
      />
      {lede ? (
        <Reveal delay={0.25} className="sv-lede mt-8 max-w-2xl">
          {lede}
        </Reveal>
      ) : null}
      {children}
    </header>
  );
}
