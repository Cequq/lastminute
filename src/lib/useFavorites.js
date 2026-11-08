import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { supabase } from './supabase';
import { useAuth } from '../context/AuthContext';

// Хэрэглэгчийн дуртай deal-уудын id (favorites: N:M хүснэгт)
export function useFavorites() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [ids, setIds] = useState(new Set());

  useEffect(() => {
    if (!user) { setIds(new Set()); return; }
    supabase.from('favorites').select('deal_id').then(({ data }) => {
      setIds(new Set((data ?? []).map((f) => f.deal_id)));
    });
  }, [user]);

  const toggle = useCallback(async (dealId) => {
    if (!user) {
      toast('Дуртайд нэмэхийн тулд нэвтэрнэ үү');
      navigate('/login', { state: { from: location.pathname } });
      return;
    }
    const has = ids.has(dealId);
    // Optimistic update: эхлээд UI-г шинэчилж, алдаа гарвал буцаана
    setIds((prev) => { const n = new Set(prev); has ? n.delete(dealId) : n.add(dealId); return n; });

    const { error } = has
      ? await supabase.from('favorites').delete().eq('user_id', user.id).eq('deal_id', dealId)
      : await supabase.from('favorites').insert({ user_id: user.id, deal_id: dealId });

    if (error) {
      setIds((prev) => { const n = new Set(prev); has ? n.add(dealId) : n.delete(dealId); return n; });
      toast.error('Хадгалж чадсангүй, дахин оролдоно уу');
    } else {
      toast.success(has ? 'Дуртайгаас хасагдлаа' : 'Дуртайд нэмэгдлээ');
    }
  }, [user, ids, navigate]);

  return { favoriteIds: ids, toggleFavorite: toggle };
}
