import { getLang } from "@/lib/server/lang";
import { Suspense } from "react";
import { LoginForm } from "./LoginForm";
export async function generateMetadata() { return { title: (await getLang()) === "en" ? "Sign in" : "تسجيل الدخول" }; }
export default function Page() { return <Suspense><LoginForm /></Suspense>; }
