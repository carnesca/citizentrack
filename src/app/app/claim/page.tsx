import { ClaimForm } from "@/components/claim-form";

export default function ClaimPage() {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Claim case</h1>
        <p className="mt-2 text-muted">Claim a case you already entered into the legacy spreadsheet so that it is not counted again.</p>
      </div>
      <ClaimForm />
    </div>
  );
}
