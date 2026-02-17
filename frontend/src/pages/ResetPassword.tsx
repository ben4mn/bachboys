import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { resetPassword } from '../api/auth';
import { getErrorMessage } from '../api/client';
import { LoadingSpinner } from '../components/shared/LoadingSpinner';
import { CheckCircle } from 'lucide-react';

const schema = z
  .object({
    password: z.string().min(6, 'Password must be at least 6 characters'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

type FormData = z.infer<typeof schema>;

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  if (!token) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-slate-50">
        <p className="text-gray-600">Invalid or missing reset token.</p>
        <Link to="/forgot-password" className="mt-4 text-sm font-medium text-primary-600">
          Request a new link
        </Link>
      </div>
    );
  }

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    setError(null);
    try {
      await resetPassword(token, data.password);
      setSuccess(true);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center px-6 py-12 bg-slate-50">
      <div className="sm:mx-auto sm:w-full sm:max-w-sm">
        {success ? (
          <div className="text-center">
            <div className="mx-auto w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="w-7 h-7 text-green-600" />
            </div>
            <h1 className="text-xl font-bold text-gray-900">Password reset</h1>
            <p className="mt-2 text-sm text-gray-600">Your password has been updated successfully.</p>
            <Link to="/login" className="btn-primary inline-block mt-6 px-6 h-10 leading-10 text-sm">
              Sign in
            </Link>
          </div>
        ) : (
          <>
            <h1 className="text-2xl font-bold text-gray-900">Set new password</h1>
            <p className="mt-2 text-sm text-gray-600">Choose a new password for your account.</p>

            <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                <input
                  {...register('password')}
                  type="password"
                  autoComplete="new-password"
                  className="input"
                  placeholder="At least 6 characters"
                />
                {errors.password && (
                  <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
                <input
                  {...register('confirmPassword')}
                  type="password"
                  autoComplete="new-password"
                  className="input"
                  placeholder="Confirm your password"
                />
                {errors.confirmPassword && (
                  <p className="mt-1 text-sm text-red-600">{errors.confirmPassword.message}</p>
                )}
              </div>

              <button type="submit" disabled={loading} className="btn-primary w-full h-12 text-base">
                {loading ? <LoadingSpinner size="sm" /> : 'Reset Password'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
