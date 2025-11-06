export type Locale = 'en-US';

export interface I18nMessages {
  connectionStatus: {
    connected: string;
    connecting: string;
    disconnected: string;
    error: string;
    unknown: string;
  };
  exchangeRateCard: {
    currentPrice: string;
    lastUpdate: string;
    hourlyAverage: string;
  };
}

const messagesEnUS: I18nMessages = {
  connectionStatus: {
    connected: 'Connected',
    connecting: 'Connecting...',
    disconnected: 'Disconnected',
    error: 'Connection Lost',
    unknown: 'Unknown',
  },
  exchangeRateCard: {
    currentPrice: 'Current Price:',
    lastUpdate: 'Last Update:',
    hourlyAverage: '1h Avg:',
  },
};

const messages: Record<Locale, I18nMessages> = {
  'en-US': messagesEnUS,
};

/**
 * Simple i18n service for accessing localized messages.
 * Currently supports en-US locale only.
 */
export class I18nService {
  private locale: Locale = 'en-US';

  setLocale(locale: Locale): void {
    this.locale = locale;
  }

  getLocale(): Locale {
    return this.locale;
  }

  t(key: keyof I18nMessages): I18nMessages[keyof I18nMessages] {
    return messages[this.locale][key];
  }

  getMessages(): I18nMessages {
    return messages[this.locale];
  }
}

// Singleton instance
export const i18n = new I18nService();

