import { startCheckout } from "@/app/app/account/actions";

export default async function Subscribe({ searchParams }: { searchParams: Promise<{ plan?: string }> }) {
  const { plan } = await searchParams;
  await startCheckout(plan || "starter");
  return null;
}
