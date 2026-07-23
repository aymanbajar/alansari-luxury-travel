import { Link } from "react-router-dom";

export function UnauthorizedPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-paper px-4 text-ink">
      <section className="max-w-md rounded-lg border border-olive/20 bg-white p-6 text-center">
        <h1 className="text-2xl font-bold">غير مصرح</h1>
        <p className="mt-3 leading-7 text-olive">ليست لديك صلاحية للوصول إلى هذه الصفحة.</p>
        <Link
          className="mt-5 inline-block rounded-md bg-ink px-4 py-2 font-semibold text-white"
          to="/"
        >
          العودة
        </Link>
      </section>
    </main>
  );
}
