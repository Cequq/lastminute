// QPay Merchant API v2 клиент
// Sandbox: https://merchant-sandbox.qpay.mn/v2 (тест эрх: TEST_MERCHANT / 123456, TEST_INVOICE)
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';

const BASE_URL = Deno.env.get('QPAY_BASE_URL') ?? 'https://merchant-sandbox.qpay.mn/v2';
const CLIENT_ID = Deno.env.get('QPAY_CLIENT_ID') ?? 'TEST_MERCHANT';
const CLIENT_SECRET = Deno.env.get('QPAY_CLIENT_SECRET') ?? '123456';
const INVOICE_CODE = Deno.env.get('QPAY_INVOICE_CODE') ?? 'TEST_INVOICE';

// 'sandbox' = жинхэнэ QPay sandbox руу хандана
// 'mock'    = QPay-гүйгээр урсгалыг бүхэлд нь турших (sandbox эрх ажиллахгүй үед)
export const QPAY_MODE = (Deno.env.get('QPAY_MODE') ?? 'sandbox') as 'sandbox' | 'mock';

let cachedToken: { value: string; expiresAt: number } | null = null;

async function getToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.value;

  const res = await fetch(`${BASE_URL}/auth/token`, {
    method: 'POST',
    headers: { Authorization: 'Basic ' + btoa(`${CLIENT_ID}:${CLIENT_SECRET}`) },
  });
  if (!res.ok) throw new Error(`QPay token алдаа: ${res.status} ${await res.text()}`);
  const data = await res.json();
  // expires_in нь секунд эсвэл unix timestamp байж болно — аюулгүйн үүднээс 30 минут гэж үзнэ
  cachedToken = { value: data.access_token, expiresAt: Date.now() + 30 * 60_000 };
  return data.access_token;
}

async function qpayFetch(path: string, body: unknown) {
  const token = await getToken();
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`QPay ${path} алдаа: ${res.status} ${text}`);
  return JSON.parse(text);
}

export interface QPayInvoice {
  invoice_id: string;
  qr_text: string;
  qr_image: string | null;
  qPay_shortUrl: string | null;
  urls: Array<{ name: string; description: string; logo: string; link: string }>;
}

export async function createInvoice(params: {
  senderInvoiceNo: string;
  amount: number;
  description: string;
  callbackUrl: string;
}): Promise<QPayInvoice> {
  if (QPAY_MODE === 'mock') {
    return {
      invoice_id: `MOCK-${params.senderInvoiceNo}`,
      qr_text: `MINUT-MOCK:${params.senderInvoiceNo}:${params.amount}`,
      qr_image: null,
      qPay_shortUrl: null,
      urls: [],
    };
  }
  return await qpayFetch('/invoice', {
    invoice_code: INVOICE_CODE,
    sender_invoice_no: params.senderInvoiceNo,
    invoice_receiver_code: 'terminal',
    invoice_description: params.description,
    amount: params.amount,
    callback_url: params.callbackUrl,
  });
}

// Нэхэмжлэлийн төлбөр төлөгдсөн эсэхийг QPay-ээс шалгана.
// Callback (webhook)-д шууд итгэхгүй — заавал QPay-ээс дахин баталгаажуулна.
export async function checkInvoicePaid(invoiceId: string, amount: number) {
  const data = await qpayFetch('/payment/check', {
    object_type: 'INVOICE',
    object_id: invoiceId,
    offset: { page_number: 1, page_limit: 100 },
  });
  const paidRow = (data.rows ?? []).find((r: { payment_status: string }) => r.payment_status === 'PAID');
  const paidAmount = Number(data.paid_amount ?? paidRow?.payment_amount ?? 0);
  return {
    paid: Boolean(paidRow) && paidAmount >= amount,
    paymentId: paidRow?.payment_id ? String(paidRow.payment_id) : null,
    raw: data,
  };
}

// Төлбөрийг шалгаад төлөгдсөн бол өгөгдлийн санд баталгаажуулна.
// webhook болон "шалгах" товч хоёулаа энэ функцийг дуудна.
export async function verifyAndConfirm(
  admin: SupabaseClient,
  payment: { id: string; invoice_id: string | null; amount: number; status: string },
  opts: { trustMock?: boolean } = {},
): Promise<boolean> {
  if (payment.status === 'paid') return true;
  if (!payment.invoice_id) return false;

  let result: { paid: boolean; paymentId: string | null; raw: unknown };
  if (QPAY_MODE === 'mock') {
    if (!opts.trustMock) return false;
    result = { paid: true, paymentId: `MOCK-PAY-${Date.now()}`, raw: { mock: true } };
  } else {
    result = await checkInvoicePaid(payment.invoice_id, payment.amount);
  }

  if (!result.paid) return false;

  const { error } = await admin.rpc('confirm_payment', {
    p_payment_id: payment.id,
    p_qpay_payment_id: result.paymentId,
    p_raw: result.raw,
  });
  if (error) throw error;
  return true;
}
