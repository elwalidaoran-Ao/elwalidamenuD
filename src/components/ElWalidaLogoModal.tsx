import React, { useState } from 'react';
import { X, Sparkles, Check, Copy, Eye } from 'lucide-react';
import { Language } from '../types';
import { restaurantInfo } from '../data/menuData';

interface ElWalidaLogoModalProps {
  isOpen: boolean;
  lang: Language;
  onClose: () => void;
  onToast: (message: string) => void;
}

export function ElWalidaLogoModal({
  isOpen,
  lang,
  onClose,
  onToast,
}: ElWalidaLogoModalProps) {
  const [copied, setCopied] = useState(false);
  const [logoLoaded, setLogoLoaded] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const isRTL = lang === 'ar';

  if (!isOpen) return null;

  const handleCopyBrand = () => {
    navigator.clipboard?.writeText('EL Walida Pastry & Coffee Shop');
    setCopied(true);
    onToast(isRTL ? 'تم نسخ اسم المحل' : 'Nom de marque copié');
    setTimeout(() => setCopied(false), 2000);
  };

  const logoUrl =
    restaurantInfo.logoUrl ||
    'https://raw.githubusercontent.com/okba2272-ops/Products-P/main/logo.png';

  return (
    <div
      className="fixed inset-0 z-500 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
      id="elWalidaLogoOverlay"
      onClick={onClose}
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      <div
        className="w-full max-w-[380px] bg-gradient-to-b from-[#1C1412] via-[#2A181A] to-[#170E10] text-white rounded-3xl p-6 shadow-2xl border-2 border-[#C9A84C]/40 relative overflow-hidden animate-in zoom-in-95 duration-200"
        id="elWalidaLogoModal"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Decorative background glows */}
        <div className="absolute -top-16 -left-16 w-36 h-36 rounded-full bg-[#C9A84C]/20 blur-2xl pointer-events-none" />
        <div className="absolute -bottom-16 -right-16 w-36 h-36 rounded-full bg-[#7B1F2A]/40 blur-2xl pointer-events-none" />

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 flex items-center justify-center text-white/80 transition-all z-20"
          aria-label={isRTL ? 'إغلاق' : 'Fermer'}
        >
          <X className="w-4 h-4" />
        </button>

        {/* Brand Emblem Visual Container */}
        <div className="relative z-10 flex flex-col items-center text-center mt-1 mb-4">
          {/* Logo Card Container */}
          <div className="w-44 h-44 rounded-2xl bg-gradient-to-b from-[#FFFDF9] via-[#FAF6EE] to-[#EFE7D8] p-3 shadow-[0_12px_35px_rgba(0,0,0,0.5),0_0_0_1px_rgba(201,168,76,0.6)] relative mb-3 flex items-center justify-center border-2 border-[#C9A84C]">
            {!logoError ? (
              <img
                src={logoUrl}
                alt="EL Walida Pastry & Coffee Shop Logo"
                className={`max-w-full max-h-full object-contain transition-opacity duration-300 ${
                  logoLoaded ? 'opacity-100' : 'opacity-80'
                }`}
                onLoad={() => setLogoLoaded(true)}
                onError={() => setLogoError(true)}
              />
            ) : (
              <div className="w-full h-full rounded-xl bg-[#5C1620] flex flex-col items-center justify-center p-2 text-center">
                <Sparkles className="w-6 h-6 text-[#C9A84C] mb-1" />
                <div className="font-serif text-lg font-black text-[#F0E4C0]">الوالدة</div>
                <div className="text-[9px] font-bold text-[#C9A84C] tracking-widest">EL WALIDA</div>
              </div>
            )}

            {/* Official seal badge */}
            <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-gradient-to-r from-[#9D7D28] via-[#C9A84C] to-[#9D7D28] text-[#3D0F14] text-[9px] font-extrabold uppercase tracking-widest shadow-md border border-white/50 whitespace-nowrap">
              OFFICIAL LOGO
            </div>
          </div>

          {/* Brand Titles */}
          <h2 className="font-serif text-2xl font-bold text-white tracking-tight mt-2 mb-1">
            EL Walida
          </h2>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#C9A84C]/20 border border-[#C9A84C]/40 text-[#C9A84C] text-[11px] font-bold tracking-widest uppercase mb-2">
            <span>PASTRY & COFFEE SHOP</span>
          </div>

          <p className="text-xs text-white/75 font-medium leading-relaxed max-w-[290px]">
            {isRTL
              ? 'المذاق الأصيل والإبداع في عالم الحلويات الفاخرة والقهوة المختصة.'
              : 'L’excellence de la pâtisserie fine et du café d’exception, faits maison avec passion.'}
          </p>
        </div>

        {/* Quick Actions */}
        <div className="relative z-10 flex items-center gap-2 pt-2 border-t border-white/10">
          <button
            type="button"
            onClick={handleCopyBrand}
            className="flex-1 py-2.5 px-3 rounded-xl bg-gradient-to-r from-[#7B1F2A] to-[#9B2D3A] text-white text-xs font-bold shadow-md border border-[#C9A84C]/40 hover:brightness-110 active:scale-98 transition-all flex items-center justify-center gap-1.5"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-[#C9A84C]" />
                <span>{isRTL ? 'تم النسخ' : 'Copié !'}</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-[#C9A84C]" />
                <span>{isRTL ? 'نسخ الاسم' : 'Copier'}</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={onClose}
            className="py-2.5 px-4 rounded-xl bg-white/10 hover:bg-white/15 text-white/90 text-xs font-semibold active:scale-98 transition-all"
          >
            {isRTL ? 'إغلاق' : 'Fermer'}
          </button>
        </div>
      </div>
    </div>
  );
}
