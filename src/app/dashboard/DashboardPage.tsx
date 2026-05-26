import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LogOut, MapPin, Plus, Trash2, User } from 'lucide-react';
import toast from 'react-hot-toast';
import { useCreateMap, useDeleteMap, useMaps } from '@/hooks/useMaps';
import { useAuth, signOut } from '@/hooks/useAuth';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { TRAVEL_MODE_LABELS } from '@/constants/config';
import { formatDistance, formatDuration } from '@/lib/utils';

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: maps, isLoading } = useMaps(user?.id);
  const createMap = useCreateMap(user?.id);
  const deleteMap = useDeleteMap(user?.id);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  async function handleCreate() {
    try {
      const map = await createMap.mutateAsync('New Map');
      navigate(`/map/${map.id}`);
    } catch (e: any) {
      toast.error(e.message ?? 'Failed to create map');
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteMap.mutateAsync(id);
      toast.success('Map deleted');
    } catch (e: any) {
      toast.error(e.message ?? 'Failed to delete');
    } finally {
      setConfirmId(null);
    }
  }

  async function handleSignOut() {
    await signOut();
    navigate('/login');
  }

  return (
    <div className="min-h-dvh bg-gray-50">
      <header className="sticky top-0 z-10 bg-white border-b border-gray-200 pt-safe">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-brand-600 flex items-center justify-center text-white">
              <MapPin className="h-4 w-4" />
            </div>
            <span className="font-semibold">Maps</span>
          </div>
          <div className="flex items-center gap-1">
            <Link
              to="/saved-places"
              className="h-10 px-3 text-sm rounded-md hover:bg-gray-100 inline-flex items-center"
            >
              Saved Places
            </Link>
            <Link to="/profile" aria-label="Profile" className="h-10 w-10 inline-flex items-center justify-center rounded-md hover:bg-gray-100">
              <User className="h-4 w-4" />
            </Link>
            <button
              onClick={handleSignOut}
              aria-label="Sign out"
              className="h-10 w-10 inline-flex items-center justify-center rounded-md hover:bg-gray-100"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-xl" />
            ))}
          </div>
        ) : maps && maps.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {maps.map((m) => {
              const mode = TRAVEL_MODE_LABELS[m.travel_mode];
              return (
                <div
                  key={m.id}
                  className="group relative bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md transition"
                >
                  <button
                    onClick={() => setConfirmId(m.id)}
                    aria-label="Delete map"
                    className="absolute top-2 right-2 h-8 w-8 inline-flex items-center justify-center rounded text-gray-400 hover:text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                  <Link to={`/map/${m.id}`} className="block">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <Badge variant="info">
                        {mode?.icon} {mode?.label}
                      </Badge>
                      {m.category && m.category !== 'other' && (
                        <Badge>{m.category}</Badge>
                      )}
                    </div>
                    <h3 className="font-semibold text-base truncate pr-8">{m.title}</h3>
                    {m.description && (
                      <p className="text-xs text-gray-500 line-clamp-2 mt-1">{m.description}</p>
                    )}
                    <div className="mt-3 text-xs text-gray-500">
                      {formatDistance(m.total_distance_meters)} · {formatDuration(m.total_duration_seconds)}
                    </div>
                    <div className="mt-1 text-xs text-gray-400">
                      Updated {new Date(m.updated_at).toLocaleDateString()}
                    </div>
                  </Link>
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState
            icon={<MapPin className="h-10 w-10" />}
            title="No maps yet"
            description="Create your first map to start dropping markers and planning a route."
            action={<Button onClick={handleCreate} loading={createMap.isPending}><Plus className="h-4 w-4" /> Create map</Button>}
          />
        )}
      </main>

      <button
        onClick={handleCreate}
        disabled={createMap.isPending}
        aria-label="Create new map"
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full bg-brand-600 text-white shadow-xl flex items-center justify-center hover:bg-brand-700 disabled:opacity-50"
      >
        <Plus className="h-6 w-6" />
      </button>

      <Modal
        open={confirmId !== null}
        onOpenChange={(o) => !o && setConfirmId(null)}
        title="Delete map?"
        description="This will permanently delete the map and all its markers and routes."
      >
        <div className="flex justify-end gap-2 mt-2">
          <Button variant="ghost" onClick={() => setConfirmId(null)}>Cancel</Button>
          <Button variant="danger" onClick={() => confirmId && handleDelete(confirmId)} loading={deleteMap.isPending}>
            Delete
          </Button>
        </div>
      </Modal>
    </div>
  );
}
