import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useFavorites } from '../../lib/useFavorites';
import DealCard from '../../components/DealCard';
import { CardSkeleton, EmptyState, ErrorState } from '../../components/ui/States';

export default function Favorites() {
  const { favoriteIds, toggleFavorite } = useFavorites();
  const [rows, setRows] = useState(null);
  const [error, setError] = useState(null);

  const load = async () => {
    setError(null);
    const { data: favs, error: e1 } = await supabase.from('favorites').select('deal_id').order('created_at', { ascending: false });
    if (e1) { setError(e1.message); return; }
    const ids = favs.map((f) => f.deal_id);
    if (!ids.length) { setRows([]); return; }
    const { data, error: e2 } = await supabase.from('deal_listings').select('*').in('id', ids);
    if (e2) { setError(e2.message); return; }
    setRows(ids.map((id) => data.find((d) => d.id === id)).filter(Boolean));
  };

  useEffect(() => { load(); }, []);

  // Зүрхээ дарж хассан картуудыг жагсаалтаас нууна
  const visible = rows?.filter((d) => favoriteIds.has(d.id));

  return (
    <div className="container-page py-8">
      <h1 className="text-3xl font-bold">Дуртай</h1>
      <p className="mt-1 text-ink-soft">Үнэ нь буурахыг хүлээж буй цагууд. Хэтэрхий удаан хүлээвэл дуусчих вий.</p>
      <div className="mt-6">
        {error ? <ErrorState message={error} onRetry={load} />
          : !visible ? <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{Array.from({ length: 4 }, (_, i) => <CardSkeleton key={i} />)}</div>
          : visible.length === 0 ? (
            <EmptyState icon={Heart} title="Дуртай жагсаалт хоосон байна"
                        text="Картын баруун дээд буланд байрлах зүрхэн дээр дарж хадгалаарай."
                        action={<Link to="/deals" className="btn-primary">Хямдрал үзэх</Link>} />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {visible.map((d) => <DealCard key={d.id} deal={d} isFavorite onToggleFavorite={toggleFavorite} />)}
            </div>
          )}
      </div>
    </div>
  );
}
