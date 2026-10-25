import { createClient, SupabaseClient, User } from '@supabase/supabase-js';

// Default project URL provided by the user
export const SUPABASE_DEFAULT_URL = 'https://kyybplhoanqumlvxqmys.supabase.co';

// Vite environment variables
const envUrl = import.meta.env.VITE_SUPABASE_URL;
const envAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabaseUrl = envUrl && envUrl.trim() !== '' ? envUrl.trim() : SUPABASE_DEFAULT_URL;
export const supabaseAnonKey = envAnonKey && envAnonKey.trim() !== '' ? envAnonKey.trim() : '';

export const isSupabaseConfigured = (): boolean => {
  return Boolean(supabaseUrl && supabaseAnonKey && supabaseAnonKey !== 'YOUR_SUPABASE_ANON_KEY');
};

// Singleton Supabase Client
let clientInstance: SupabaseClient | null = null;

export const getSupabaseClient = (): SupabaseClient | null => {
  if (!isSupabaseConfigured()) {
    return null;
  }
  if (!clientInstance) {
    clientInstance = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    });
  }
  return clientInstance;
};

// Types for Availability State
export type AvailabilityMaps = {
  categories: Record<string, boolean>; // category_id -> is_available
  products: Record<string, boolean>;   // product_id -> is_available
};

const LOCAL_STORAGE_AVAILABILITY_KEY = 'lwalida_menu_availability_cache_v1';

/**
 * Read cached availability from localStorage as fast initial fallback
 */
export const getCachedAvailability = (): AvailabilityMaps => {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_AVAILABILITY_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        categories: parsed.categories || {},
        products: parsed.products || {},
      };
    }
  } catch {
    // Ignore localStorage parse errors
  }
  return { categories: {}, products: {} };
};

/**
 * Save availability to localStorage cache
 */
export const setCachedAvailability = (data: AvailabilityMaps) => {
  try {
    localStorage.setItem(LOCAL_STORAGE_AVAILABILITY_KEY, JSON.stringify(data));
  } catch {
    // Ignore quota errors
  }
};

/**
 * Fetch all category and product availability records from Supabase
 */
export const fetchAllAvailability = async (): Promise<AvailabilityMaps | null> => {
  const client = getSupabaseClient();
  if (!client) {
    return null;
  }

  try {
    const [categoriesRes, productsRes] = await Promise.all([
      client.from('category_availability').select('category_id, is_available'),
      client.from('product_availability').select('product_id, is_available'),
    ]);

    if (categoriesRes.error) {
      console.warn('Error fetching category availability from Supabase:', categoriesRes.error.message);
    }
    if (productsRes.error) {
      console.warn('Error fetching product availability from Supabase:', productsRes.error.message);
    }

    const categoriesMap: Record<string, boolean> = {};
    const productsMap: Record<string, boolean> = {};

    if (categoriesRes.data) {
      for (const row of categoriesRes.data) {
        categoriesMap[row.category_id] = row.is_available;
      }
    }

    if (productsRes.data) {
      for (const row of productsRes.data) {
        productsMap[row.product_id] = row.is_available;
      }
    }

    const result: AvailabilityMaps = {
      categories: categoriesMap,
      products: productsMap,
    };

    setCachedAvailability(result);
    return result;
  } catch (err) {
    console.error('Failed to fetch availability from Supabase:', err);
    return null;
  }
};

/**
 * Subscribe to realtime changes in both availability tables
 */
export const subscribeToAvailability = (
  onCategoryChange: (categoryId: string, isAvailable: boolean) => void,
  onProductChange: (productId: string, isAvailable: boolean) => void
) => {
  const client = getSupabaseClient();
  if (!client) return () => {};

  const channel = client
    .channel('public:availability_channel')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'category_availability' },
      (payload) => {
        const newRecord = payload.new as { category_id: string; is_available: boolean } | undefined;
        if (newRecord && newRecord.category_id !== undefined) {
          onCategoryChange(newRecord.category_id, newRecord.is_available);
        }
      }
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'product_availability' },
      (payload) => {
        const newRecord = payload.new as { product_id: string; is_available: boolean } | undefined;
        if (newRecord && newRecord.product_id !== undefined) {
          onProductChange(newRecord.product_id, newRecord.is_available);
        }
      }
    )
    .subscribe();

  return () => {
    client.removeChannel(channel);
  };
};

/**
 * Update availability of a category (requires Supabase Auth with RLS permissions)
 */
export const updateCategoryAvailabilityInDb = async (
  categoryId: string,
  isAvailable: boolean
): Promise<{ success: boolean; error?: string }> => {
  const client = getSupabaseClient();
  if (!client) {
    return { success: false, error: 'Supabase n’est pas encore configuré avec VITE_SUPABASE_ANON_KEY' };
  }

  try {
    const { error } = await client
      .from('category_availability')
      .upsert(
        {
          category_id: categoryId,
          is_available: isAvailable,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'category_id' }
      );

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: (err as Error)?.message || 'Erreur réseau inconnue' };
  }
};

/**
 * Update availability of a single product (requires Supabase Auth with RLS permissions)
 */
export const updateProductAvailabilityInDb = async (
  productId: string,
  categoryId: string,
  isAvailable: boolean
): Promise<{ success: boolean; error?: string }> => {
  const client = getSupabaseClient();
  if (!client) {
    return { success: false, error: 'Supabase n’est pas encore configuré avec VITE_SUPABASE_ANON_KEY' };
  }

  try {
    const { error } = await client
      .from('product_availability')
      .upsert(
        {
          product_id: productId,
          category_id: categoryId,
          is_available: isAvailable,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'product_id' }
      );

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: (err as Error)?.message || 'Erreur réseau inconnue' };
  }
};

/**
 * Admin Authentication Helpers
 */
export const getCurrentAdminUser = async (): Promise<User | null> => {
  const client = getSupabaseClient();
  if (!client) return null;
  const { data } = await client.auth.getUser();
  return data.user;
};

export const signInAdmin = async (email: string, password: string) => {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error('Supabase n’est pas configuré. Veuillez définir VITE_SUPABASE_ANON_KEY.');
  }
  return client.auth.signInWithPassword({ email, password });
};

export const signUpAdmin = async (email: string, password: string) => {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error('Supabase n’est pas configuré. Veuillez définir VITE_SUPABASE_ANON_KEY.');
  }
  return client.auth.signUp({ email, password });
};

export const signOutAdmin = async () => {
  const client = getSupabaseClient();
  if (!client) return;
  return client.auth.signOut();
};
