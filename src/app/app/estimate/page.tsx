import { EstimatePanel } from "@/components/estimate-panel";

export default async function EstimatePage({
  searchParams,
}: {
  searchParams: Promise<{ application?: string }>;
}) {
  const params = await searchParams;

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Estimate Your Timeline to Citizenship</h1>
        <p className="mt-2 text-muted">Predict when you will receive your citizenship certificate</p>
      </div>
      <EstimatePanel initialApplicationId={params.application} />
    </div>
  );
}
