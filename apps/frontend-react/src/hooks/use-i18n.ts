import { i18n, I18nMessages } from '@crypto-dashboard/frontend-core';
import { useMemo } from 'react';

/**
 * Hook to access i18n messages in React components.
 * Returns the current messages object based on the active locale.
 */
export function useI18n(): I18nMessages {
  return useMemo(() => i18n.getMessages(), []);
}

