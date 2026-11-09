import { Suspense } from "react";
import { LoginForm } from "./LoginForm";
export const metadata = { title: "تسجيل الدخول" };
export default function Page() { return <Suspense><LoginForm /></Suspense>; }
