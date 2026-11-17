/**
 * Supabase implementations of the data-access interfaces. Pages never import
 * this file directly; each service index picks mock or Supabase.
 */
import type { CatalogRepository } from '@/services/catalog/CatalogRepository';
import type { AdminProductRepository } from '@/services/catalog/AdminProductRepository';
import type { OrderService } from '@/services/orders/OrderService';
import type { AdminOrderRepository, OrderMutationResult } from '@/services/orders/AdminOrderRepository';
import type { AuthService, AdminSession, SignInResult } from '@/services/auth/AuthService';
import type { ImageStorage } from '@/services/storage/ImageStorage';
import type { Category, Color, Product } from '@/types/catalog';
import type { StatusChangeError } from '@/features/orders/statusFlow';
import type { CheckoutErrors, CheckoutField } from '@/validation/checkout';
import { validateCheckout } from '@/validation/checkout';
import { validateProductInput, type ProductInput } from '@/features/products/admin/productInput';
import { ORDERS_CHANGED_EVENT, PRODUCTS_CHANGED_EVENT, emit } from '@/services/events';
import { errorCode, supabase, supabaseConfig } from './client';
import { ORDER_SELECT, PRODUCT_SELECT, orderFromRow, productFromRow, type OrderRow, type ProductRow } from './mappers';
import { t } from '@/i18n';

const BUCKET = 'product-images';

// ——— Public catalog ———

let taxonomyCache: Promise<{ categories: Category[]; colors: Color[] }> | null = null;
function loadTaxonomy() {
  taxonomyCache ??= (async () => {
    const [cats, cols] = await Promise.all([
      supabase().from('categories').select('id, name, genders').order('sort_order'),
      supabase().from('colors').select('id, name, hex').order('sort_order'),
    ]);
    if (cats.error || cols.error) {
      taxonomyCache = null;
      throw cats.error ?? cols.error;
    }
    return { categories: cats.data as Category[], colors: cols.data as Color[] };
  })();
  return taxonomyCache;
}

export const supabaseCatalogRepository: CatalogRepository = {
  async listActiveProducts() {
    const { data, error } = await supabase().from('products').select(PRODUCT_SELECT).eq('status', 'active').order('created_at', { ascending: false });
    if (error) throw error;
    return (data as unknown as ProductRow[]).map(productFromRow);
  },
  async getActiveProductBySlug(slug) {
    const { data, error } = await supabase().from('products').select(PRODUCT_SELECT).eq('status', 'active').eq('slug', slug).maybeSingle();
    if (error) throw error;
    return data ? productFromRow(data as unknown as ProductRow) : null;
  },
  async listCategories() {
    return (await loadTaxonomy()).categories;
  },
  async listColors() {
    return (await loadTaxonomy()).colors;
  },
};

// ——— Admin products ———

async function allProducts(): Promise<Product[]> {
  const { data, error } = await supabase().from('products').select(PRODUCT_SELECT).order('updated_at', { ascending: false });
  if (error) throw error;
  return (data as unknown as ProductRow[]).map(productFromRow);
}

async function getProduct(id: string): Promise<Product | null> {
  const { data, error } = await supabase().from('products').select(PRODUCT_SELECT).eq('id', id).maybeSingle();
  if (error) throw error;
  return data ? productFromRow(data as unknown as ProductRow) : null;
}

async function removeFiles(paths: (string | null | undefined)[]) {
  const list = paths.filter((p): p is string => !!p && !p.startsWith('mock/'));
  if (list.length) await supabase().storage.from(BUCKET).remove(list);
}

async function saveProduct(id: string | null, input: ProductInput) {
  const slugs = (await supabase().from('products').select('id, slug')).data ?? [];
  const v = validateProductInput(input, slugs.filter((s) => s.id !== id).map((s) => s.slug as string));
  if (!v.ok) return v;
  const before = id ? await getProduct(id) : null;
  const { data, error } = await supabase().rpc('admin_save_product', { p_id: id, p: v.data });
  if (error) {
    const code = errorCode(error);
    if (code === '23505') return { ok: false as const, errors: { slug: 'Bu slug boshqa mahsulotda ishlatilgan.' } };
    if (code === 'validation:images') return { ok: false as const, errors: { images: 'Sotuvga chiqarish uchun kamida bitta rasm qoʻshing.' } };
    if (code === 'not_found') return { ok: false as const, errors: { name: 'Mahsulot topilmadi.' } };
    throw error;
  }
  const product = await getProduct(data as string);
  if (!product) throw new Error('saved product not found');
  if (before) {
    const kept = new Set(product.images.map((i) => i.id));
    await removeFiles(before.images.filter((i) => !kept.has(i.id)).map((i) => i.storagePath));
  }
  emit(PRODUCTS_CHANGED_EVENT);
  return { ok: true as const, product };
}

export const supabaseAdminProductRepository: AdminProductRepository = {
  listProducts: allProducts,
  getProduct,
  async listSlugs() {
    const { data, error } = await supabase().from('products').select('slug');
    if (error) throw error;
    return (data ?? []).map((r) => r.slug as string);
  },
  createProduct: (input) => saveProduct(null, input),
  updateProduct: (id, input) => saveProduct(id, input),
  async setStatus(id, status) {
    const { error } = await supabase().from('products').update({ status }).eq('id', id);
    if (error) throw error;
    emit(PRODUCTS_CHANGED_EVENT);
    return getProduct(id);
  },
  async deleteProduct(id) {
    const existing = await getProduct(id);
    if (!existing) return { ok: false, reason: 'not_found' };
    const { error } = await supabase().from('products').delete().eq('id', id);
    if (error) {
      if (error.code === '23503') return { ok: false, reason: 'has_orders' };
      throw error;
    }
    await removeFiles(existing.images.map((i) => i.storagePath));
    emit(PRODUCTS_CHANGED_EVENT);
    return { ok: true };
  },
  async importProducts(inputs) {
    const { data, error } = await supabase().rpc('admin_import_products', { p: inputs });
    if (error) throw error;
    emit(PRODUCTS_CHANGED_EVENT);
    const ids = new Set(data as string[]);
    return (await allProducts()).filter((p) => ids.has(p.id));
  },
};

// ——— Customer order placement ———

const CHECKOUT_FIELDS: CheckoutField[] = ['fullName', 'phone', 'city', 'address', 'comment', 'privacyConsent'];

export const supabaseOrderService: OrderService = {
  async submitOrder({ form, lines, idempotencyKey }) {
    const v = validateCheckout(form);
    if (!v.ok) return { ok: false, reason: 'validation', errors: v.errors };
    const { data, error } = await supabase().rpc('place_order', {
      p_customer: v.data,
      p_lines: lines.map((l) => ({ productId: l.productId, size: l.size, colorId: l.colorId, quantity: l.quantity })),
      p_idempotency_key: idempotencyKey,
    });
    if (error) {
      const code = errorCode(error);
      if (code === 'unavailable') return { ok: false, reason: 'unavailable', keys: [] };
      if (code === 'empty') return { ok: false, reason: 'empty' };
      if (code.startsWith('validation:')) {
        const field = code.slice('validation:'.length) as CheckoutField;
        const errors: CheckoutErrors = CHECKOUT_FIELDS.includes(field) ? { [field]: t.checkout.fixErrors } : {};
        return Object.keys(errors).length ? { ok: false, reason: 'validation', errors } : { ok: false, reason: 'failed' };
      }
      return { ok: false, reason: 'failed' };
    }
    const r = data as { orderNumber: string; total: number; phone: string; itemCount: number };
    return { ok: true, receipt: { orderNumber: r.orderNumber, total: Number(r.total), phone: r.phone, itemCount: r.itemCount, isDemo: false } };
  },
};

// ——— Admin orders ———

async function fetchOrder(id: string) {
  const { data, error } = await supabase().from('orders').select(ORDER_SELECT).eq('id', id).maybeSingle();
  if (error) throw error;
  return data ? orderFromRow(data as unknown as OrderRow) : null;
}

const MUTATION_ERRORS: (StatusChangeError | 'not_found' | 'empty')[] = ['not_allowed', 'amount_required', 'invalid_amount', 'note_too_long', 'not_found', 'empty'];

async function afterMutation(id: string, error: { message?: string; code?: string } | null): Promise<OrderMutationResult> {
  if (error) {
    const code = errorCode(error) as (typeof MUTATION_ERRORS)[number];
    if (MUTATION_ERRORS.includes(code)) return { ok: false, error: code };
    throw error;
  }
  const order = await fetchOrder(id);
  if (!order) return { ok: false, error: 'not_found' };
  emit(ORDERS_CHANGED_EVENT);
  return { ok: true, order };
}

export const supabaseAdminOrderRepository: AdminOrderRepository = {
  async listOrders() {
    const { data, error } = await supabase().from('orders').select(ORDER_SELECT).order('created_at', { ascending: false });
    if (error) throw error;
    return (data as unknown as OrderRow[]).map(orderFromRow);
  },
  getOrder: fetchOrder,
  async changeStatus(id, to, opts) {
    const { error } = await supabase().rpc('admin_change_order_status', {
      p_order_id: id,
      p_to: to,
      p_amount: to === 'delivered' ? opts.amountReceived ?? null : null,
      p_note: opts.note ?? null,
    });
    return afterMutation(id, error);
  },
  async correctAmountReceived(id, amount) {
    const { error } = await supabase().rpc('admin_correct_amount_received', { p_order_id: id, p_amount: amount });
    return afterMutation(id, error);
  },
  async addNote(id, text) {
    const trimmed = text.trim();
    if (!trimmed) return { ok: false, error: 'empty' };
    if (trimmed.length > 1000) return { ok: false, error: 'note_too_long' };
    const { error } = await supabase().from('order_notes').insert({ order_id: id, text: trimmed });
    return afterMutation(id, error);
  },
  async clearDemoOrders() {
    // Real orders are never bulk-deleted from the app.
  },
};

// ——— Admin auth (Supabase Auth + admin_users allow-list) ———

async function currentAdminSession(): Promise<AdminSession | null> {
  const { data } = await supabase().auth.getSession();
  const s = data.session;
  if (!s?.user.email) return null;
  const { data: isAdmin, error } = await supabase().rpc('is_admin');
  if (error || isAdmin !== true) return null;
  return { email: s.user.email, expiresAt: new Date((s.expires_at ?? 0) * 1000).toISOString(), isMock: false };
}

export const supabaseAuthService: AuthService = {
  getSession: currentAdminSession,
  async signIn(email, password): Promise<SignInResult> {
    const { error } = await supabase().auth.signInWithPassword({ email: email.trim(), password });
    if (error) return { ok: false, reason: error.status === 429 ? 'rate_limited' : 'invalid_credentials' };
    const session = await currentAdminSession();
    if (!session) {
      // Valid account but not an administrator: do not reveal which.
      await supabase().auth.signOut();
      return { ok: false, reason: 'invalid_credentials' };
    }
    return { ok: true, session };
  },
  async signOut() {
    await supabase().auth.signOut();
  },
  onChange(listener) {
    const { data } = supabase().auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') listener(null);
      else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') currentAdminSession().then(listener);
    });
    return () => data.subscription.unsubscribe();
  },
};

// ——— Image storage (Supabase Storage, admin-only uploads) ———

const EXT: Record<string, string> = { 'image/webp': 'webp', 'image/jpeg': 'jpg', 'image/png': 'png' };

export const supabaseImageStorage: ImageStorage = {
  async upload(file, options) {
    const { data } = await supabase().auth.getSession();
    const token = data.session?.access_token;
    if (!token) throw new Error('not_signed_in');
    const ext = EXT[file.type] ?? 'jpg';
    const now = new Date();
    const path = `products/${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${crypto.randomUUID()}.${ext}`;
    // XHR (not fetch) so we can report upload progress.
    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${supabaseConfig.url}/storage/v1/object/${BUCKET}/${path}`);
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      xhr.setRequestHeader('apikey', supabaseConfig.anonKey);
      xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
      xhr.setRequestHeader('x-upsert', 'false');
      xhr.upload.onprogress = (e) => e.lengthComputable && options?.onProgress?.(e.loaded / e.total);
      xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`upload failed (${xhr.status})`)));
      xhr.onerror = () => reject(new Error('network error'));
      xhr.send(file);
    });
    options?.onProgress?.(1);
    return { url: supabase().storage.from(BUCKET).getPublicUrl(path).data.publicUrl, storagePath: path };
  },
  async remove(storagePath) {
    await removeFiles([storagePath]);
  },
};
