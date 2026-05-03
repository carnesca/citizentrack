import { Suspense } from "react";
import { ApplicationForm } from "@/components/application-form";

export default function ApplicationPage() {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Application details</h1>
        <p className="mt-2 text-muted">Dates can be partial in your source records, but private app entries use exact dates for estimates.</p>
      </div>
      <Suspense>
        <ApplicationForm />
      </Suspense>
    </div>
  );
}
