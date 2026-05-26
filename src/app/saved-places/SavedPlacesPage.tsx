import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Briefcase, Heart, Home, MapPin, Plus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/hooks/useAuth';
import {
  useCreateSavedPlace,
  useDeleteSavedPlace,
  useSavedPlaces,
} from '@/hooks/useSavedPlaces';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { PlacesSearch } from '@/components/search/PlacesSearch';
import { Badge } from '@/components/ui/Badge';
import type { LatLng, SavedPlaceCategory } from '@/types';

const ICONS: Record<SavedPlaceCategory, React.ReactNode> = {
  home: <Home className="h-4 w-4" />,
  work: <Briefcase className="h-4 w-4" />,
  favorite: <Heart className="h-4 w-4" />,
  other: <MapPin className="h-4 w-4" />,
};

export default function SavedPlacesPage() {
  const { user } = useAuth();
  const { data: places, isLoading } = useSavedPlaces(user?.id);
  const createPlace = useCreateSavedPlace(user?.id);
  const deletePlace = useDeleteSavedPlace(user?.id);
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-dvh bg-gray-50">
      <header className="sticky top-0 z-10 bg-white border-b border-gray-200 pt-safe">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center gap-2">
          <Link
            to="/dashboard"
            aria-label="Back"
            className="h-9 w-9 inline-flex items-center justify-center rounded hover:bg-gray-100"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <h1 className="font-semibold flex-1">Saved Places</h1>
          <Button onClick={() => setOpen(true)} size="sm">
            <Plus className="h-4 w-4" /> Add
          </Button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-4">
        {isLoading ? (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-16 rounded-lg" />
            ))}
          </div>
        ) : places && places.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {places.map((p) => (
              <li
                key={p.id}
                className="bg-white border border-gray-200 rounded-lg p-3 flex items-center gap-3"
              >
                <div className="h-9 w-9 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center">
                  {ICONS[p.category]}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate">{p.label}</span>
                    <Badge>{p.category}</Badge>
                  </div>
                  {p.address && <div className="text-xs text-gray-500 truncate">{p.address}</div>}
                </div>
                <button
                  onClick={async () => {
                    try {
                      await deletePlace.mutateAsync(p.id);
                      toast.success('Removed');
                    } catch (e: any) {
                      toast.error(e.message ?? 'Failed');
                    }
                  }}
                  aria-label="Delete saved place"
                  className="h-9 w-9 inline-flex items-center justify-center rounded text-gray-400 hover:text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            icon={<Heart className="h-10 w-10" />}
            title="No saved places yet"
            description="Save your home, work, or favorite stops for quick reuse."
            action={<Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Add place</Button>}
          />
        )}
      </main>

      <SavedPlaceModal
        open={open}
        onOpenChange={setOpen}
        onSave={async (data) => {
          if (!user) return;
          await createPlace.mutateAsync({ ...data, user_id: user.id });
          toast.success('Saved');
        }}
      />
    </div>
  );
}

function SavedPlaceModal({
  open,
  onOpenChange,
  onSave,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSave: (data: {
    label: string;
    latitude: number;
    longitude: number;
    address: string | null;
    place_id: string | null;
    category: SavedPlaceCategory;
  }) => Promise<void>;
}) {
  const [label, setLabel] = useState('');
  const [latLng, setLatLng] = useState<LatLng | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [placeId, setPlaceId] = useState<string | null>(null);
  const [category, setCategory] = useState<SavedPlaceCategory>('favorite');
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setLabel('');
    setLatLng(null);
    setAddress(null);
    setPlaceId(null);
    setCategory('favorite');
  };

  return (
    <Modal
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
      title="Add saved place"
    >
      <div className="flex flex-col gap-4">
        <PlacesSearch
          onSelect={(r) => {
            setLabel(r.label);
            setLatLng(r.latLng);
            setAddress(r.address);
            setPlaceId(r.placeId);
          }}
        />
        <Input label="Label" value={label} onChange={(e) => setLabel(e.target.value)} />
        <div>
          <label className="text-sm font-medium text-gray-700 mb-1.5 block">Category</label>
          <div className="flex gap-2 flex-wrap">
            {(['home', 'work', 'favorite', 'other'] as SavedPlaceCategory[]).map((c) => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={`px-3 h-9 rounded-full text-sm capitalize ${
                  category === c ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-700'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
        {address && <div className="text-xs text-gray-500">{address}</div>}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            disabled={!label || !latLng}
            loading={saving}
            onClick={async () => {
              if (!latLng || !label) return;
              setSaving(true);
              try {
                await onSave({
                  label,
                  latitude: latLng.lat,
                  longitude: latLng.lng,
                  address,
                  place_id: placeId,
                  category,
                });
                onOpenChange(false);
                reset();
              } finally {
                setSaving(false);
              }
            }}
          >
            Save
          </Button>
        </div>
      </div>
    </Modal>
  );
}
