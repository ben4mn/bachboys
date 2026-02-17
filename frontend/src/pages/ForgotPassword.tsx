import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { forgotPassword } from '../api/auth';
import { getErrorMessage } from '../api/client';
import { LoadingSpinner } from '../components/shared/LoadingSpinner';
import { ArrowLeft, Mail } from 'lucide-react';

const schema = z.object({
  email: z.string().email('Enter a valid email'),
});

type FormData = z.infer<typeof schema>;

export default function ForgotPassword() {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    setError(null);
    try {
      await forgotPassword(data.email);
      setSubmitted(true);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center px-6 py-12 bg-slate-50">
      <div className="sm:mx-auto sm:w-full sm:max-w-sm">
        {submitted ? (
          <div className="text-center">
            <div className="mx-auto w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <Mail className="w-7 h-7 text-green-600" />
            </div>
            <h1 className="text-xl font-bold text-gray-900">Check your email</h1>
            <p className="mt-2 text-sm text-gray-600">
              If that email is registered, you'll receive a password reset link shortly.
            </p>
            <Link to="/login" className="inline-block mt-6 text-sm font-medium text-primary-600 hover:text-primary-500">
              Back to sign in
            </Link>
          </div>
        ) : (
          <>
            <Link to="/login" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-8">
              <ArrowLeft className="w-4 h-4" />
              Back to sign in
            </Link>

            <h1 className="text-2xl font-bold text-gray-900">Forgot password?</h1>
            <p className="mt-2 text-sm text-gray-600">
              Enter your email and we'll send you a reset link.
            </p>

            <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {error}
                </div>
              )}

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  {...register('email')}
                  type="email"
                  autoComplete="email"
                  className="input"
                  placeholder="your@email.com"
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
                )}
              </div>

              <button type="submit" disabled={loading} className="btn-primary w-full h-12 text-base">
                {loading ? <LoadingSpinner size="sm" /> : 'Send Reset Link'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
