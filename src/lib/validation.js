// Формын шалгалтын энгийн дүрмүүд. Утга зөв бол null, буруу бол алдааны текст буцаана.
export const rules = {
  required: (label) => (v) => (String(v ?? '').trim() ? null : `${label} оруулна уу`),
  email: (v) => (/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(v).trim()) ? null : 'Имэйл хаяг буруу байна'),
  password: (v) => (String(v).length >= 8 ? null : 'Нууц үг хамгийн багадаа 8 тэмдэгт байна'),
  phone: (v) => (!v || /^[6-9]\d{7}$/.test(String(v).replace(/[\s-]/g, '')) ? null : '8 оронтой утасны дугаар оруулна уу'),
  min: (n, label) => (v) => (v === '' || Number(v) >= n ? null : `${label} ${n}-аас багагүй байна`),
  max: (n, label) => (v) => (v === '' || Number(v) <= n ? null : `${label} ${n}-аас ихгүй байна`),
  length: (min, max, label) => (v) => {
    const l = String(v ?? '').trim().length;
    return l >= min && l <= max ? null : `${label} ${min}-${max} тэмдэгт байна`;
  },
};

// schema: { field: [rule, rule] } → { field: 'алдаа' }
export function validate(values, schema) {
  const errors = {};
  for (const [field, list] of Object.entries(schema)) {
    for (const rule of list) {
      const err = rule(values[field], values);
      if (err) { errors[field] = err; break; }
    }
  }
  return errors;
}

// Supabase Auth-ийн англи алдааг монгол болгоно
export function authErrorMessage(error) {
  const m = error?.message ?? '';
  if (/Invalid login credentials/i.test(m)) return 'Имэйл эсвэл нууц үг буруу байна';
  if (/Email not confirmed/i.test(m)) return 'Имэйлээ баталгаажуулна уу. Ирсэн захидлын холбоос дээр дарна уу.';
  if (/already registered|already exists/i.test(m)) return 'Энэ имэйлээр бүртгэл үүссэн байна';
  if (/rate limit|too many/i.test(m)) return 'Хэт олон оролдлого хийлээ. Түр хүлээгээд дахин оролдоно уу.';
  if (/should be different/i.test(m)) return 'Шинэ нууц үг хуучнаасаа өөр байх ёстой';
  return m || 'Алдаа гарлаа';
}
