import React from 'react';
import { Language } from '../types';
import { restaurantInfo } from '../data/menuData';
import { ArCameraModal } from './ArCameraModal';

export interface ArLogoCameraModalProps {
  isOpen: boolean;
  lang: Language;
  onClose: () => void;
  onToast?: (message: string) => void;
}

export function ArLogoCameraModal({
  isOpen,
  lang,
  onClose,
  onToast,
}: ArLogoCameraModalProps) {
  const logoUrl =
    restaurantInfo.logoUrl ||
    'https://raw.githubusercontent.com/okba2272-ops/Products-P/main/logo.png';

  return (
    <ArCameraModal
      isOpen={isOpen}
      lang={lang}
      imageUrl={logoUrl}
      title={restaurantInfo.name}
      subtitle={{
        fr: 'AR Caméra • Logo Officiel',
        ar: 'واقع معزز • الشعار الرسمي',
      }}
      altText="L'Walida Pastry & Coffee Shop Official Logo"
      overlaySize="normal"
      onClose={onClose}
      onToast={onToast}
    />
  );
}
