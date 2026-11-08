import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="container-page flex flex-col items-center py-24 text-center">
      <p className="font-display text-7xl font-bold text-amber">404</p>
      <h1 className="mt-4 text-2xl font-bold">Энэ хуудас олдсонгүй</h1>
      <p className="mt-2 text-ink-soft">Холбоос буруу эсвэл хуудас устсан байж магадгүй.</p>
      <Link to="/" className="btn-primary mt-6">Нүүр хуудас руу</Link>
    </div>
  );
}
