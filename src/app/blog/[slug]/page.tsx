import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getOptimizedImageUrl } from '@/lib/image-loader';
import { createAdminClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function estimateReadingTime(body: string | null): number {
  if (!body) return 5;
  const words = body.replace(/<[^>]*>/g, '').split(/\s+/).length;
  return Math.max(1, Math.ceil(words / 200));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const supabase = createAdminClient();
  const { data } = await supabase
    .from('content_objects')
    .select('title, excerpt, seo_meta(title, description, og_image_url)')
    .eq('slug', slug)
    .eq('status', 'published')
    .single();

  if (!data) return { title: 'Article Not Found' };

  const seo = Array.isArray(data.seo_meta) ? data.seo_meta[0] : data.seo_meta;
  const socialImage = seo?.og_image_url
    ? getOptimizedImageUrl(seo.og_image_url, 1200, 75)
    : undefined;

  return {
    title: seo?.title || data.title,
    description: seo?.description || data.excerpt || '',
    openGraph: socialImage ? { images: [socialImage] } : undefined,
    twitter: socialImage ? { images: [socialImage] } : undefined,
  };
}

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = createAdminClient();
  const { data: article } = await supabase
    .from('content_objects')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'published')
    .single();

  if (!article) notFound();

  const readingTime = estimateReadingTime(article.body);
  const publishedAt = article.published_at || article.created_at;
  const articleTags = (article.semantic_tags || []).slice(0, 4);

  return (
    <main>
      <section className="pt-32 pb-10 px-6">
        <div className="max-w-5xl mx-auto">
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-neutral-300 transition-colors hover:text-white"
          >
            <span aria-hidden="true">←</span>
            Back to journal
          </Link>

          <div className="mt-8 flex flex-wrap gap-3 text-[0.75rem] font-medium text-white/45">
            <span className="rounded-full border border-white/10 px-3 py-1.5 capitalize">
              {article.content_type}
            </span>
            <span className="rounded-full border border-white/10 px-3 py-1.5">
              {formatDate(publishedAt)}
            </span>
            <span className="rounded-full border border-white/10 px-3 py-1.5">
              {readingTime} min read
            </span>
          </div>

          <div className="mt-6 max-w-4xl">
            <h1 className="text-4xl md:text-6xl xl:text-[5.6rem] font-semibold tracking-[-0.07em] text-white leading-[0.96]">
              {article.title}
            </h1>
            {article.excerpt && (
              <p className="mt-6 max-w-3xl text-lg md:text-2xl text-neutral-300 leading-relaxed">
                {article.excerpt}
              </p>
            )}
          </div>
        </div>
      </section>

      <section className="px-6 pb-10">
        <div className="max-w-5xl mx-auto">
          {article.featured_image_url ? (
            <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.03]">
              <Image
                src={article.featured_image_url}
                alt={article.title}
                width={1792}
                height={1024}
                className="w-full aspect-[21/9] object-cover"
                priority
              />
            </div>
          ) : (
            <div
              aria-label="Editorial visual"
              className="relative min-h-[260px] overflow-hidden rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_22%_28%,rgba(255,255,255,0.16),transparent_34%),radial-gradient(circle_at_76%_72%,rgba(255,255,255,0.08),transparent_38%),linear-gradient(135deg,rgba(255,255,255,0.07),rgba(255,255,255,0.015))]"
            >
              <div className="absolute inset-[18%_12%] rotate-[-5deg] rounded-[45%] border border-white/[0.08] bg-white/[0.025] blur-[1px]" />
              <div className="absolute left-[18%] top-[24%] h-[52%] w-[42%] rounded-full bg-white/[0.035] blur-3xl" />
            </div>
          )}
        </div>
      </section>

      <section className="px-6 pb-16">
        <div className="max-w-5xl mx-auto grid gap-10 xl:grid-cols-[minmax(0,1fr)_260px]">
          <article className="rounded-[2rem] border border-white/10 bg-white/[0.03] px-6 py-8 md:px-10 md:py-10">
            {article.body && (
              <div
                className="article-body prose prose-invert prose-lg max-w-none prose-headings:tracking-normal prose-headings:font-semibold prose-p:text-neutral-300 prose-p:leading-8 prose-strong:text-white prose-a:text-white prose-li:text-neutral-300"
                dangerouslySetInnerHTML={{ __html: article.body }}
              />
            )}
          </article>

          <aside className="space-y-4">
            <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.03] p-6">
              <p className="font-mono text-[0.65rem] uppercase tracking-[0.22em] text-white/45 mb-4">
                Article details
              </p>
              <div className="space-y-3 text-sm text-neutral-300">
                <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-3">
                  <span className="text-white/45">Published</span>
                  <span>{formatDate(publishedAt)}</span>
                </div>
                <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-3">
                  <span className="text-white/45">Reading time</span>
                  <span>{readingTime} min</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-white/45">Type</span>
                  <span className="capitalize">{article.content_type}</span>
                </div>
              </div>
            </div>

            {articleTags.length > 0 && (
              <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.03] p-6">
                <p className="font-mono text-[0.65rem] uppercase tracking-[0.22em] text-white/45 mb-4">
                  Topics
                </p>
                <div className="flex flex-wrap gap-2">
                  {articleTags.map((tag: string) => (
                    <span
                      key={tag}
                      className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[0.72rem] text-white/55"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </aside>
        </div>
      </section>

      <section className="py-24 px-6 text-center border-t border-white/10">
        <div className="max-w-3xl mx-auto">
          <p className="font-mono text-[0.65rem] uppercase tracking-[0.22em] text-white/45 mb-6">
            Keep shaping the starter
          </p>
          <h2 className="text-3xl md:text-5xl font-semibold tracking-[-0.05em] text-white mb-6">
            Publish with the structure, then make it unmistakably yours.
          </h2>
          <p className="text-lg text-neutral-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            This article layout is meant to be a premium baseline. Swap in your visuals, voice, and calls
            to action once the starter becomes your real publishing system.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/blog"
              className="inline-flex items-center justify-center rounded-full text-base font-medium bg-white text-black px-8 py-3.5 hover:bg-transparent hover:text-white border border-white transition-all"
            >
              View the journal
            </Link>
            <Link
              href="/contact"
              className="inline-flex items-center justify-center rounded-full text-base font-medium bg-transparent text-white px-8 py-3.5 hover:bg-white hover:text-black border border-white/20 transition-all"
            >
              Customize the starter
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
