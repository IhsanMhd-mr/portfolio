export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold">Project Detail</h1>
      <p className="mt-4">Placeholder for project: <strong>{slug}</strong></p>
    </div>
  );
}
