import { MainPage } from '@/components/main-page';
import { APP_CONFIG } from '@/app-config';

/** Evaluate searchParams on every request so ?org_id= / ?phone= reach the token API on Vercel. */
export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

function firstString(
  value: string | string[] | undefined,
): string | undefined {
  if (typeof value === 'string') return value;
  if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'string') {
    return value[0];
  }
  return undefined;
}

export default async function Page({ searchParams }: PageProps) {
  const params = await searchParams;
  const orgId = firstString(params.org_id);
  const phone = firstString(params.phone);

  return <MainPage config={APP_CONFIG} orgId={orgId} phone={phone} />;
}