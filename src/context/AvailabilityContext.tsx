import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import {
  fetchAllAvailability,
  subscribeToAvailability,
  updateCategoryAvailabilityInDb,
  updateProductAvailabilityInDb,
  getCachedAvailability,
  setCachedAvailability,
  isSupabaseConfigured,
  getCurrentAdminUser,
  signOutAdmin,
  signInAdmin,
  signUpAdmin,
  AvailabilityMaps,
  supabaseUrl,
} from '../lib/supabase';
import { categories, allMenuItems } from '../data/menuData';
import { User } from '@supabase/supabase-js';

export type EffectiveStatus = 'disponible' | 'epuise' | 'indisponible';

interface AvailabilityContextType {
  categoryAvailability: Record<string, boolean>;
  productAvailability: Record<string, boolean>;
  isLoading: boolean;
  isConfigured: boolean;
  supabaseUrl: string;
  adminUser: User | null;
  refreshAvailability: () => Promise<void>;
  toggleCategory: (categoryId: string) => Promise<{ success: boolean; error?: string }>;
  toggleProduct: (productId: string, categoryId: string) => Promise<{ success: boolean; error?: string }>;
  setAllCategoryAvailability: (isAvailable: boolean) => Promise<void>;
  setAllProductsInCategory: (categoryId: string, isAvailable: boolean) => Promise<void>;
  isCategoryAvailable: (categoryId: string) => boolean;
  isProductAvailable: (productId: string) => boolean;
  getEffectiveStatus: (productId: string, categoryId: string) => EffectiveStatus;
  loginAdmin: (email: string, password: string) => Promise<{ error?: string }>;
  registerAdmin: (email: string, password: string) => Promise<{ error?: string }>;
  logoutAdmin: () => Promise<void>;
}

const AvailabilityContext = createContext<AvailabilityContextType | null>(null);

export const AvailabilityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const cached = getCachedAvailability();
  const [categoryAvailability, setCategoryAvailability] = useState<Record<string, boolean>>(cached.categories);
  const [productAvailability, setProductAvailability] = useState<Record<string, boolean>>(cached.products);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [adminUser, setAdminUser] = useState<User | null>(null);

  const isConfigured = isSupabaseConfigured();

  // Load user session
  const checkAuth = useCallback(async () => {
    if (!isConfigured) return;
    try {
      const user = await getCurrentAdminUser();
      setAdminUser(user);
    } catch {
      setAdminUser(null);
    }
  }, [isConfigured]);

  // Fetch full state from Supabase
  const refreshAvailability = useCallback(async () => {
    setIsLoading(true);
    if (!isConfigured) {
      // If Supabase is not yet configured with anon key, initialize defaults (all true unless locally cached)
      setIsLoading(false);
      return;
    }

    const data = await fetchAllAvailability();
    if (data) {
      setCategoryAvailability(data.categories);
      setProductAvailability(data.products);
    }
    setIsLoading(false);
  }, [isConfigured]);

  // Initial load & Supabase Realtime subscription
  useEffect(() => {
    refreshAvailability();
    checkAuth();

    if (!isConfigured) return;

    // Realtime channel listener
    const unsubscribe = subscribeToAvailability(
      (catId, isAvailable) => {
        setCategoryAvailability((prev) => {
          const updated = { ...prev, [catId]: isAvailable };
          setCachedAvailability({ categories: updated, products: productAvailability });
          return updated;
        });
      },
      (prodId, isAvailable) => {
        setProductAvailability((prev) => {
          const updated = { ...prev, [prodId]: isAvailable };
          setCachedAvailability({ categories: categoryAvailability, products: updated });
          return updated;
        });
      }
    );

    return () => {
      unsubscribe();
    };
  }, [isConfigured, refreshAvailability, checkAuth]);

  // Helper: check if a category is available (default is true)
  const isCategoryAvailable = useCallback(
    (categoryId: string): boolean => {
      return categoryAvailability[categoryId] !== false;
    },
    [categoryAvailability]
  );

  // Helper: check if product itself is available (default is true)
  const isProductAvailable = useCallback(
    (productId: string): boolean => {
      return productAvailability[productId] !== false;
    },
    [productAvailability]
  );

  // Helper: effective status based on business rules
  // Rule 1: If category is OFF -> product is 'indisponible'
  // Rule 2: If category is ON, but product is OFF -> product is 'epuise'
  // Rule 3: If both are ON -> product is 'disponible'
  const getEffectiveStatus = useCallback(
    (productId: string, categoryId: string): EffectiveStatus => {
      const catAvailable = categoryAvailability[categoryId] !== false;
      const prodAvailable = productAvailability[productId] !== false;

      if (!catAvailable) {
        return 'indisponible';
      }
      if (!prodAvailable) {
        return 'epuise';
      }
      return 'disponible';
    },
    [categoryAvailability, productAvailability]
  );

  // Toggle category availability
  const toggleCategory = useCallback(
    async (categoryId: string) => {
      const current = categoryAvailability[categoryId] !== false;
      const next = !current;

      // Optimistic update
      setCategoryAvailability((prev) => {
        const nextMap = { ...prev, [categoryId]: next };
        setCachedAvailability({ categories: nextMap, products: productAvailability });
        return nextMap;
      });

      if (!isConfigured) {
        return { success: true };
      }

      const res = await updateCategoryAvailabilityInDb(categoryId, next);
      if (!res.success) {
        // Rollback on failure
        setCategoryAvailability((prev) => ({ ...prev, [categoryId]: current }));
        return res;
      }
      return { success: true };
    },
    [categoryAvailability, productAvailability, isConfigured]
  );

  // Toggle individual product availability
  const toggleProduct = useCallback(
    async (productId: string, categoryId: string) => {
      const current = productAvailability[productId] !== false;
      const next = !current;

      // Optimistic update
      setProductAvailability((prev) => {
        const nextMap = { ...prev, [productId]: next };
        setCachedAvailability({ categories: categoryAvailability, products: nextMap });
        return nextMap;
      });

      if (!isConfigured) {
        return { success: true };
      }

      const res = await updateProductAvailabilityInDb(productId, categoryId, next);
      if (!res.success) {
        // Rollback on failure
        setProductAvailability((prev) => ({ ...prev, [productId]: current }));
        return res;
      }
      return { success: true };
    },
    [productAvailability, categoryAvailability, isConfigured]
  );

  // Set all categories
  const setAllCategoryAvailability = useCallback(
    async (isAvailable: boolean) => {
      const nextMap: Record<string, boolean> = {};
      categories.forEach((cat) => {
        nextMap[cat.id] = isAvailable;
      });
      setCategoryAvailability(nextMap);
      setCachedAvailability({ categories: nextMap, products: productAvailability });

      if (isConfigured) {
        await Promise.all(
          categories.map((cat) => updateCategoryAvailabilityInDb(cat.id, isAvailable))
        );
      }
    },
    [isConfigured, productAvailability]
  );

  // Set all products in category
  const setAllProductsInCategory = useCallback(
    async (categoryId: string, isAvailable: boolean) => {
      const targetProducts = allMenuItems.filter((p) => p.categoryId === categoryId);
      const nextMap = { ...productAvailability };
      targetProducts.forEach((p) => {
        nextMap[p.id] = isAvailable;
      });
      setProductAvailability(nextMap);
      setCachedAvailability({ categories: categoryAvailability, products: nextMap });

      if (isConfigured) {
        await Promise.all(
          targetProducts.map((p) => updateProductAvailabilityInDb(p.id, categoryId, isAvailable))
        );
      }
    },
    [isConfigured, productAvailability, categoryAvailability]
  );

  // Admin Auth handlers
  const loginAdmin = useCallback(
    async (email: string, password: string) => {
      try {
        const { data, error } = await signInAdmin(email, password);
        if (error) {
          return { error: error.message };
        }
        setAdminUser(data.user);
        return {};
      } catch (err: unknown) {
        return { error: (err as Error)?.message || 'Échec de connexion' };
      }
    },
    []
  );

  const registerAdmin = useCallback(
    async (email: string, password: string) => {
      try {
        const { data, error } = await signUpAdmin(email, password);
        if (error) {
          return { error: error.message };
        }
        setAdminUser(data.user);
        return {};
      } catch (err: unknown) {
        return { error: (err as Error)?.message || 'Échec d’inscription' };
      }
    },
    []
  );

  const logoutAdmin = useCallback(async () => {
    await signOutAdmin();
    setAdminUser(null);
  }, []);

  const value = useMemo(
    () => ({
      categoryAvailability,
      productAvailability,
      isLoading,
      isConfigured,
      supabaseUrl,
      adminUser,
      refreshAvailability,
      toggleCategory,
      toggleProduct,
      setAllCategoryAvailability,
      setAllProductsInCategory,
      isCategoryAvailable,
      isProductAvailable,
      getEffectiveStatus,
      loginAdmin,
      registerAdmin,
      logoutAdmin,
    }),
    [
      categoryAvailability,
      productAvailability,
      isLoading,
      isConfigured,
      adminUser,
      refreshAvailability,
      toggleCategory,
      toggleProduct,
      setAllCategoryAvailability,
      setAllProductsInCategory,
      isCategoryAvailable,
      isProductAvailable,
      getEffectiveStatus,
      loginAdmin,
      registerAdmin,
      logoutAdmin,
    ]
  );

  return <AvailabilityContext.Provider value={value}>{children}</AvailabilityContext.Provider>;
};

export const useAvailability = () => {
  const context = useContext(AvailabilityContext);
  if (!context) {
    throw new Error('useAvailability must be used within an AvailabilityProvider');
  }
  return context;
};
