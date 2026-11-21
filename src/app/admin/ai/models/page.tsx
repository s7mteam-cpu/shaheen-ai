import { redirect } from "next/navigation";

/** «النماذج» now lives inside «مركز الذكاء الاصطناعي» (section 3). */
export default function ModelsPage() {
  redirect("/admin/ai#models");
}
