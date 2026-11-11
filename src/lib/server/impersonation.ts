import "server-only";
import { cookies } from "next/headers";

/** True while an admin is inside a customer's account (support access). Payment, password and deletion stay off-limits then. */
export async function isImpersonating() {
  return !!(await cookies()).get("shaheen_imp")?.value;
}
