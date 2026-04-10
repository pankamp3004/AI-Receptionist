import { Suspense } from 'react';
import { MainPage } from '@/components/main-page';
import { APP_CONFIG } from '@/app-config';

/** Query string must be evaluated per request; static/ISR shells on Vercel can omit ?org_id=&phone=. */
export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function Page({ searchParams }: PageProps) {
  const params = await searchParams;
  const orgId = typeof params.org_id === 'string' ? params.org_id : undefined;
  const phone = typeof params.phone === 'string' ? params.phone : undefined;

  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">
          Loading…
        </div>
      }
    >
      <MainPage config={APP_CONFIG} orgId={orgId} phone={phone} />
    </Suspense>
  );
}