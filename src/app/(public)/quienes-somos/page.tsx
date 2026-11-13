import type { Metadata } from "next";
import { Sparkle } from "@/components/brand/Logo";
import { LinkButton } from "@/components/ui/Button";
import { brand } from "@/config/brand";
import { listGallery } from "@/lib/data/public";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Quiénes somos" };

export default async function AboutPage() {
  const photos = await listGallery();
  return (
    <div className="mx-auto max-w-6xl px-4 pt-12 sm:px-6 sm:pt-16">
      <section className="grid gap-10 lg:grid-cols-[1.2fr_1fr] lg:items-end">
        <div>
          <p className="text-sm font-semibold uppercase tracking-widest text-primary">Quiénes somos</p>
          <h1 className="condensed mt-2 font-display text-6xl font-extrabold uppercase leading-[0.88] sm:text-7xl">
            {brand.about.title}
          </h1>
          <p className="mt-6 text-2xl font-semibold text-ink/90 text-balance">{brand.about.lead}</p>
        </div>
        <dl className="grid grid-cols-3 gap-3">
          {brand.about.stats.map((s) => (
            <div key={s.label} className="rounded-2xl border border-line bg-surface p-4">
              <dt className="sr-only">{s.label}</dt>
              <dd>
                <span className="block font-display text-3xl font-extrabold text-accent">{s.value}</span>
                <span className="text-xs text-muted">{s.label}</span>
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="mt-12 grid gap-6 md:grid-cols-2">
        {brand.about.paragraphs.map((p, i) => (
          <p key={i} className={i === 0 ? "text-lg leading-relaxed text-ink/85 md:col-span-2 md:text-xl" : "leading-relaxed text-ink/75"}>
            {p}
          </p>
        ))}
      </section>

      <section aria-labelledby="galeria" className="mt-16">
        <div className="mb-6 flex items-center gap-3">
          <Sparkle className="size-6 text-primary" />
          <h2 id="galeria" className="font-display text-3xl font-bold">Así se vive</h2>
        </div>
        {photos.length ? (
          <ul className="grid grid-cols-2 gap-3 md:grid-cols-3">
            {photos.map((photo, i) => (
              <li
                key={photo.id}
                className={
                  "group relative overflow-hidden rounded-2xl border border-line " +
                  (i === 0
                    ? "col-span-2 aspect-[4/3] md:row-span-2 md:aspect-square"
                    : i === photos.length - 1 && photos.length % 2 === 0
                      ? "col-span-2 aspect-[2/1] md:col-span-1 md:aspect-square"
                      : "aspect-square")
                }
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photo.imageUrl} alt={photo.caption} loading="lazy" className="size-full object-cover transition duration-500 group-hover:scale-105" />
                {photo.caption ? (
                  <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-3 pt-8 text-sm font-semibold">
                    {photo.caption}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted">Pronto vamos a subir fotos de los últimos eventos.</p>
        )}
      </section>

      <section className="mt-16 flex flex-col items-start gap-4 rounded-[2rem] border border-line bg-surface p-8 sm:flex-row sm:items-center sm:justify-between">
        <p className="font-display text-2xl font-bold">¿Querés que armemos algo juntas?</p>
        <LinkButton href="/contacto" size="lg">Escribinos</LinkButton>
      </section>
    </div>
  );
}
