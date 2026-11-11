import { getLang } from "@/lib/server/lang";
import { Suspense } from "react";
import { SignupForm } from "./SignupForm";
export async function generateMetadata() { return { title: (await getLang()) === "en" ? "Create account" : "إنشاء حساب" }; }
export default function Page() { return <Suspense><SignupForm /></Suspense>; }
