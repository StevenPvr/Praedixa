import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: process.env.NODE_ENV === "production",

  // 100% traces — faible trafic landing page
  tracesSampleRate: 1.0,

  // Replay uniquement sur erreur (économise le quota)
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 1.0,

  integrations: [
    Sentry.replayIntegration({
      maskAllText: true, // RGPD — masque les données personnelles
      blockAllMedia: true,
    }),
  ],

  // Filtre les erreurs de browser extensions et scripts tiers
  beforeSend(event) {
    const frames = event.exception?.values?.[0]?.stacktrace?.frames;
    if (frames?.some((frame) => frame.filename?.includes("extension://"))) {
      return null;
    }
    return event;
  },
});

// Instrument client-side navigations
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
