import { Suspense } from "react";
import { SignupForm } from "./SignupForm";
export const metadata = { title: "إنشاء حساب" };
export default function Page() { return <Suspense><SignupForm /></Suspense>; }
