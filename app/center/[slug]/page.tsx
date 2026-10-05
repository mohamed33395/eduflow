import { getCenterBySlugPublic } from "@/app/services/centers-public";
import { notFound } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function CenterPublicPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const center = await getCenterBySlugPublic(slug);
  if (!center) notFound();

  return (
    <main className="min-h-screen bg-gradient-to-br from-indigo-50 to-blue-100 p-6">
      <div className="mx-auto max-w-3xl rounded-2xl bg-white p-8 shadow-xl">
        <h1 className="text-3xl font-bold text-slate-900">{center.name}</h1>
        {center.logo && (
          <img
            src={center.logo}
            alt={center.name}
            className="mt-6 h-24 w-auto object-contain"
          />
        )}
        <div className="mt-6 space-y-1 text-slate-600">
          {center.address && <p>{center.address}</p>}
          {center.email && <p>{center.email}</p>}
          {center.phone && <p>{center.phone}</p>}
        </div>
        <div className="mt-8">
          <Link
            href="/login?redirect=/center"
            className="inline-block rounded-lg bg-indigo-600 px-6 py-2.5 font-semibold text-white hover:bg-indigo-700"
          >
            Login to Dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
