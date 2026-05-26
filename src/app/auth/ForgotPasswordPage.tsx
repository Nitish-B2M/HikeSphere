import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { MapPin } from 'lucide-react';
import toast from 'react-hot-toast';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { resetPassword } from '@/hooks/useAuth';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await resetPassword(email);
      setSent(true);
      toast.success('Reset email sent');
    } catch (e: any) {
      toast.error(e.message ?? 'Failed to send reset email');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-dvh flex items-center justify-center px-4 bg-gradient-to-br from-brand-50 to-white">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-6">
        <div className="flex flex-col items-center mb-6">
          <div className="h-12 w-12 rounded-2xl bg-brand-600 flex items-center justify-center text-white">
            <MapPin className="h-6 w-6" />
          </div>
          <h1 className="mt-3 text-xl font-semibold">Forgot password</h1>
          <p className="text-sm text-gray-500 text-center">We'll email you a reset link</p>
        </div>
        {sent ? (
          <p className="text-sm text-gray-700 text-center">
            If an account exists for <strong>{email}</strong>, a reset link has been sent.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Button type="submit" loading={loading}>Send reset link</Button>
          </form>
        )}
        <div className="mt-4 text-sm text-center">
          <Link to="/login" className="text-brand-600 hover:underline">Back to sign in</Link>
        </div>
      </div>
    </div>
  );
}
