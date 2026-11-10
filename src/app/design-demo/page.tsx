import { notFound } from "next/navigation";
import { DesignGallery } from "./gallery";

// Local design preview only — never served in production.
export default function Page() {
  if (process.env.NODE_ENV === "production") notFound();
  return <main dir="rtl" className="mx-auto max-w-7xl p-6"><DesignGallery /></main>;
}
