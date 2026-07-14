import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/auth/AuthContext";
import { ApiError } from "@/lib/apiClient";

const schema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

type FormValues = z.infer<typeof schema>;

export default function Login() {
  const { isAuthenticated, isLoading, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const from = (location.state as { from?: Location })?.from?.pathname ?? "/";

  if (!isLoading && isAuthenticated) {
    return <Navigate to={from} replace />;
  }

  async function onSubmit(values: FormValues) {
    setFormError(null);
    try {
      await login(values.email, values.password);
      navigate(from, { replace: true });
    } catch (e) {
      setFormError(e instanceof ApiError ? e.message : "Could not sign in. Try again.");
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-maroon-50 p-4">
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="w-full max-w-sm rounded-lg border border-maroon-200 bg-white p-6 shadow-sm"
      >
        <h1 className="mb-1 text-xl font-bold text-maroon-600">Valet Admin</h1>
        <p className="mb-5 text-sm text-gray-500">Sign in to continue.</p>

        <label className="mb-1 block text-sm font-medium">Email</label>
        <input
          type="email"
          autoComplete="username"
          className="mb-1 w-full rounded-md border border-maroon-200 px-3 py-2 text-sm outline-none focus:border-maroon-600"
          {...register("email")}
        />
        {errors.email && <p className="mb-2 text-xs text-destructive">{errors.email.message}</p>}

        <label className="mb-1 mt-3 block text-sm font-medium">Password</label>
        <input
          type="password"
          autoComplete="current-password"
          className="mb-1 w-full rounded-md border border-maroon-200 px-3 py-2 text-sm outline-none focus:border-maroon-600"
          {...register("password")}
        />
        {errors.password && <p className="mb-2 text-xs text-destructive">{errors.password.message}</p>}

        {formError && <p className="mt-3 text-sm text-destructive">{formError}</p>}

        <button
          type="submit"
          disabled={isSubmitting}
          className="mt-5 w-full rounded-md bg-maroon-600 py-2 text-sm font-semibold text-white transition-colors hover:bg-maroon-700 disabled:opacity-60"
        >
          {isSubmitting ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
