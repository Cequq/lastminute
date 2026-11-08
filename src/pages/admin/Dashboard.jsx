import { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import { Spinner } from '../../components/ui/States';
import StatsDashboard from '../../components/manage/StatsDashboard';
import { AdminHeader } from './AdminLayout';

export default function Dashboard() {
  const [refreshing, setRefreshing] = useState(false);
  const [key, setKey] = useState(0);

  // Хамгаалалтын өмнө: өнгөрсөн демо хямдралуудыг өдрөөр урагшлуулна (өдрийн цаг нь хэвээр)
  const refreshDemo = async () => {
    setRefreshing(true);
    const { data, error } = await supabase.rpc('refresh_demo_deals');
    setRefreshing(false);
    if (error) toast.error(error.message);
    else { toast.success(`${data} хямдралын цагийг шинэчиллээ`); setKey((k) => k + 1); }
  };

  return (
    <>
      <AdminHeader title="Самбар" text="Бүх платформын захиалга, орлого, хэрэглэгч"
        action={
          <button onClick={refreshDemo} disabled={refreshing} className="btn-outline" title="Өнгөрсөн хямдралуудыг ирээдүй рүү шилжүүлнэ">
            {refreshing ? <Spinner className="h-4 w-4" /> : <RefreshCw className="h-4 w-4" />} Демо цагуудыг шинэчлэх
          </button>
        } />
      <StatsDashboard key={key} />
    </>
  );
}
