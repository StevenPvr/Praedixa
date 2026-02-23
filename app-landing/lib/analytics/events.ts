/**
 * GA4 event tracking utility.
 * All events follow the naming convention: category_action_detail
 *
 * Usage: trackEvent("cta_click_hero_pilot")
 * With params: trackEvent("form_step_complete", { step: 1 })
 */
export function trackEvent(
  eventName: string,
  params?: Record<string, string | number | boolean>,
) {
  if (typeof window !== "undefined" && typeof window.gtag === "function") {
    window.gtag("event", eventName, params);
  }
}

/* ── Pre-defined event names (from the playbook instrumentation plan) ── */

// Visibility & engagement
export const EVENTS = {
  // Scroll depth
  SCROLL_25: "scroll_25",
  SCROLL_50: "scroll_50",
  SCROLL_75: "scroll_75",

  // Section views
  SECTION_VIEW_PROBLEM: "section_view_problem",
  SECTION_VIEW_SOLUTION: "section_view_solution",
  SECTION_VIEW_HOW_IT_WORKS: "section_view_how_it_works",
  SECTION_VIEW_USE_CASES: "section_view_use_cases",
  SECTION_VIEW_ROI: "section_view_roi",
  SECTION_VIEW_SECURITY: "section_view_security",
  SECTION_VIEW_PILOT: "section_view_pilot",
  SECTION_VIEW_FAQ: "section_view_faq",
  SECTION_VIEW_CONTACT: "section_view_contact",

  // CTA clicks
  CTA_CLICK_HERO_PRIMARY: "cta_click_hero_primary",
  CTA_CLICK_HERO_SECONDARY: "cta_click_hero_secondary",
  CTA_CLICK_STICKY_MOBILE: "cta_click_sticky_mobile",
  CTA_CLICK_NAV: "cta_click_nav",
  CTA_CLICK_PILOT_SECTION: "cta_click_pilot_section",
  CTA_CLICK_PREVIEW_DEMO: "cta_click_preview_demo",
  CTA_CLICK_FAQ_SECTION: "cta_click_faq_section",
  CTA_CLICK_CONTACT_PRIMARY: "cta_click_contact_primary",
  CTA_CLICK_CONTACT_EMAIL: "cta_click_contact_email",
  CTA_CLICK_FOOTER: "cta_click_footer",

  // Form funnel
  FORM_START: "form_start",
  FORM_STEP_1_COMPLETE: "form_step_1_complete",
  FORM_STEP_2_COMPLETE: "form_step_2_complete",
  FORM_SUBMIT: "form_submit",
  FORM_ERROR: "form_error",

  // FAQ interactions
  FAQ_OPEN: "faq_open",

  // Language
  LANGUAGE_SWITCH: "language_switch",

  // Assets
  PDF_DOWNLOAD: "pdf_download",

  // SEO resources funnel
  SEO_RESOURCE_ASSET_DOWNLOAD: "seo_resource_asset_download",
  SEO_RESOURCE_PILOT_CTA_CLICK: "seo_resource_pilot_cta_click",
  SEO_PILOT_PAGE_VIEW: "seo_pilot_page_view",
  SEO_PILOT_FORM_SUBMIT: "seo_pilot_form_submit",
  SEO_PILOT_FORM_SUCCESS: "seo_pilot_form_success",
} as const;
