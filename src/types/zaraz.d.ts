interface ZarazConsent {
  get: (purposeId: string) => boolean | undefined;
  set: (consent: Record<string, boolean>) => void;
  getAll: () => Record<string, boolean>;
  sendQueuedEvents: () => void;
  purposes: Record<string, { name: string; description: string }>;
  APIReady: boolean;
}

interface Zaraz {
  consent: ZarazConsent;
}

interface Window {
  zaraz?: Zaraz;
}
