import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../store/authStore';
import { verifyGuestName } from '../api/auth';
import { getErrorMessage } from '../api/client';
import { LoadingSpinner } from '../components/shared/LoadingSpinner';
import { ArrowLeft, CheckCircle, User } from 'lucide-react';

// Step 1: Name verification
const nameSchema = z.object({
  real_name: z.string().min(1, 'Enter your name'),
});

// Step 2: Account details
const accountSchema = z
  .object({
    username: z
      .string()
      .min(3, 'At least 3 characters')
      .max(50)
      .regex(/^[a-zA-Z0-9_]+$/, 'Only letters, numbers, and underscores'),
    email: z.string().email('Enter a valid email'),
    display_name: z.string().min(1, 'Display name required').max(100),
    password: z.string().min(6, 'At least 6 characters'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

type NameForm = z.infer<typeof nameSchema>;
type AccountForm = z.infer<typeof accountSchema>;

const slideVariants = {
  enter: (direction: number) => ({ x: direction > 0 ? 200 : -200, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (direction: number) => ({ x: direction < 0 ? 200 : -200, opacity: 0 }),
};

export default function Register() {
  const { register: registerUser, isLoading } = useAuthStore();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [matchedName, setMatchedName] = useState<string>('');
  const [realName, setRealName] = useState('');

  // Step 1 form
  const nameForm = useForm<NameForm>({
    resolver: zodResolver(nameSchema),
  });

  // Step 2 form
  const accountForm = useForm<AccountForm>({
    resolver: zodResolver(accountSchema),
  });

  // Auto-redirect on step 3
  useEffect(() => {
    if (step === 3) {
      const timer = setTimeout(() => navigate('/schedule'), 3000);
      return () => clearTimeout(timer);
    }
  }, [step, navigate]);

  const handleNameSubmit = async (data: NameForm) => {
    setError(null);
    setVerifying(true);
    try {
      const result = await verifyGuestName(data.real_name);
      if (result.matched && result.guest_name) {
        setMatchedName(result.guest_name);
        setRealName(data.real_name);
        accountForm.setValue('display_name', result.guest_name);
        setDirection(1);
        setStep(2);
      } else {
        setError('Name not found on the guest list. Check spelling or try your full name.');
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setVerifying(false);
    }
  };

  const handleAccountSubmit = async (data: AccountForm) => {
    setError(null);
    try {
      await registerUser({
        real_name: realName,
        username: data.username,
        email: data.email,
        password: data.password,
        display_name: data.display_name,
      });
      setDirection(1);
      setStep(3);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const goBack = () => {
    setDirection(-1);
    setStep(1);
    setError(null);
  };

  return (
    <div className="min-h-screen flex flex-col justify-center px-6 py-12 bg-slate-50 dark:bg-gray-900">
      <div className="sm:mx-auto sm:w-full sm:max-w-sm">
        {/* Header */}
        <div className="flex justify-center">
          <div className="w-16 h-16 bg-primary-600 rounded-2xl flex items-center justify-center">
            <span className="text-3xl font-bold text-white">B</span>
          </div>
        </div>
        <h1 className="mt-6 text-center text-2xl font-bold text-gray-900 dark:text-white">Join BachBoys</h1>

        {/* Step indicator */}
        <div className="mt-4 flex justify-center gap-2">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                s === step ? 'w-8 bg-primary-600' : s < step ? 'w-8 bg-primary-300' : 'w-8 bg-gray-200 dark:bg-gray-700'
              }`}
            />
          ))}
        </div>

        {/* Step content */}
        <div className="mt-8 relative overflow-hidden">
          <AnimatePresence mode="wait" custom={direction}>
            {step === 1 && (
              <motion.div
                key="step1"
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.25, ease: 'easeInOut' }}
              >
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  First, let's verify you're on the guest list.
                </p>
                <form onSubmit={nameForm.handleSubmit(handleNameSubmit)} className="space-y-4">
                  {error && (
                    <div className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800/30 rounded-lg text-red-700 dark:text-red-400 text-sm">
                      {error}
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Your Full Name</label>
                    <input
                      {...nameForm.register('real_name')}
                      type="text"
                      className="input"
                      placeholder="e.g. Gabe Schuler"
                      autoFocus
                    />
                    {nameForm.formState.errors.real_name && (
                      <p className="mt-1 text-sm text-red-600">{nameForm.formState.errors.real_name.message}</p>
                    )}
                  </div>
                  <button type="submit" disabled={verifying} className="btn-primary w-full h-12 text-base">
                    {verifying ? <LoadingSpinner size="sm" /> : 'Verify Name'}
                  </button>
                </form>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step2"
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.25, ease: 'easeInOut' }}
              >
                <button onClick={goBack} className="inline-flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 mb-4">
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </button>

                <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg mb-4">
                  <User className="w-4 h-4 text-green-600" />
                  <span className="text-sm text-green-800 font-medium">Verified: {matchedName}</span>
                </div>

                <form onSubmit={accountForm.handleSubmit(handleAccountSubmit)} className="space-y-4">
                  {error && (
                    <div className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800/30 rounded-lg text-red-700 dark:text-red-400 text-sm">
                      {error}
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Display Name</label>
                    <input {...accountForm.register('display_name')} type="text" className="input" />
                    {accountForm.formState.errors.display_name && (
                      <p className="mt-1 text-sm text-red-600">{accountForm.formState.errors.display_name.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Username</label>
                    <input
                      {...accountForm.register('username')}
                      type="text"
                      autoComplete="username"
                      className="input"
                      placeholder="Choose a username"
                    />
                    {accountForm.formState.errors.username && (
                      <p className="mt-1 text-sm text-red-600">{accountForm.formState.errors.username.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                    <input
                      {...accountForm.register('email')}
                      type="email"
                      autoComplete="email"
                      className="input"
                      placeholder="your@email.com"
                    />
                    {accountForm.formState.errors.email && (
                      <p className="mt-1 text-sm text-red-600">{accountForm.formState.errors.email.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Password</label>
                    <input
                      {...accountForm.register('password')}
                      type="password"
                      autoComplete="new-password"
                      className="input"
                      placeholder="At least 6 characters"
                    />
                    {accountForm.formState.errors.password && (
                      <p className="mt-1 text-sm text-red-600">{accountForm.formState.errors.password.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Confirm Password</label>
                    <input
                      {...accountForm.register('confirmPassword')}
                      type="password"
                      autoComplete="new-password"
                      className="input"
                      placeholder="Confirm your password"
                    />
                    {accountForm.formState.errors.confirmPassword && (
                      <p className="mt-1 text-sm text-red-600">{accountForm.formState.errors.confirmPassword.message}</p>
                    )}
                  </div>

                  <button type="submit" disabled={isLoading} className="btn-primary w-full h-12 text-base">
                    {isLoading ? <LoadingSpinner size="sm" /> : 'Create Account'}
                  </button>
                </form>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                key="step3"
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.25, ease: 'easeInOut' }}
                className="text-center"
              >
                <div className="mx-auto w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mb-4">
                  <CheckCircle className="w-7 h-7 text-green-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">You're in!</h2>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                  Welcome to the crew, {matchedName}. Redirecting to the schedule...
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {step < 3 && (
          <p className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
            Already have an account?{' '}
            <Link to="/login" className="text-primary-600 font-medium hover:text-primary-500">
              Sign in
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
