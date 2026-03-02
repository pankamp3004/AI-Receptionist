import { MainPage } from '@/components/main-page';
import { APP_CONFIG } from '@/app-config';

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function Page({ searchParams }: PageProps) {
  const params = await searchParams;
  const orgId = typeof params.org_id === 'string' ? params.org_id : undefined;
  const phone = typeof params.phone === 'string' ? params.phone : undefined;

  return <MainPage config={APP_CONFIG} orgId={orgId} phone={phone} />;
}