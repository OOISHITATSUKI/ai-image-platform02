import CompanionEditor from '@/components/admin/CompanionEditor';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditCompanionPage({ params }: PageProps) {
  const { id } = await params;
  // Avoid clashing with /admin/companions/new
  if (id === 'new') return null;
  return <CompanionEditor mode="edit" companionId={id} />;
}
