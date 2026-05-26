import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, LogOut } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth, signOut } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import type { Profile } from '@/types';

export default function ProfilePage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [fullName, setFullName] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        setProfile(data);
        setFullName(data?.full_name ?? '');
      });
  }, [user]);

  async function save() {
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: fullName })
        .eq('id', user.id);
      if (error) throw error;
      toast.success('Saved');
    } catch (e: any) {
      toast.error(e.message ?? 'Failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-dvh bg-gray-50">
      <header className="sticky top-0 z-10 bg-white border-b border-gray-200 pt-safe">
        <div className="max-w-md mx-auto px-4 h-14 flex items-center gap-2">
          <Link
            to="/dashboard"
            aria-label="Back"
            className="h-9 w-9 inline-flex items-center justify-center rounded hover:bg-gray-100"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <h1 className="font-semibold flex-1">Profile</h1>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-6 flex flex-col gap-4">
        <Input label="Email" value={profile?.email ?? user?.email ?? ''} disabled />
        <Input label="Full name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
        <Button onClick={save} loading={saving}>Save changes</Button>
        <hr className="my-2" />
        <Button variant="outline" onClick={() => signOut()}>
          <LogOut className="h-4 w-4" /> Sign out
        </Button>
      </main>
    </div>
  );
}
