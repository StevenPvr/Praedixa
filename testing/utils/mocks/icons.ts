import React from "react";

/**
 * Factory for lucide-react icon mocks.
 *
 * Registered on globalThis.__mocks in the vitest setup file.
 *
 * Usage in test files:
 *   vi.mock("lucide-react", () => globalThis.__mocks.createLucideIconMocks());
 */

function icon(name: string) {
  return function MockIcon() {
    return React.createElement("svg", { "data-testid": `icon-${name}` });
  };
}

/**
 * Returns mocks for the most commonly used lucide-react icons.
 * Add any missing icons here as needed.
 */
export function createLucideIconMocks() {
  return {
    // Navigation / layout
    Home: icon("Home"),
    LayoutGrid: icon("LayoutGrid"),
    Menu: icon("Menu"),
    X: icon("X"),
    ChevronLeft: icon("ChevronLeft"),
    ChevronRight: icon("ChevronRight"),
    ChevronDown: icon("ChevronDown"),
    ChevronUp: icon("ChevronUp"),
    ArrowLeft: icon("ArrowLeft"),
    ArrowRight: icon("ArrowRight"),
    ExternalLink: icon("ExternalLink"),
    LogOut: icon("LogOut"),

    // Status / alerts
    AlertTriangle: icon("AlertTriangle"),
    AlertCircle: icon("AlertCircle"),
    CheckCircle: icon("CheckCircle"),
    CheckCircle2: icon("CheckCircle2"),
    ShieldCheck: icon("ShieldCheck"),
    Info: icon("Info"),
    Bell: icon("Bell"),
    BellRing: icon("BellRing"),

    // Data / charts
    TrendingUp: icon("TrendingUp"),
    TrendingDown: icon("TrendingDown"),
    BarChart3: icon("BarChart3"),
    LineChart: icon("LineChart"),
    Activity: icon("Activity"),

    // Business
    Building2: icon("Building2"),
    Users: icon("Users"),
    User: icon("User"),
    UserPlus: icon("UserPlus"),
    Mail: icon("Mail"),
    Send: icon("Send"),
    MessageSquare: icon("MessageSquare"),
    Inbox: icon("Inbox"),
    FileText: icon("FileText"),
    File: icon("File"),
    Upload: icon("Upload"),
    Download: icon("Download"),
    Calendar: icon("Calendar"),
    Clock: icon("Clock"),
    Settings: icon("Settings"),
    Search: icon("Search"),
    Filter: icon("Filter"),
    Plus: icon("Plus"),
    Minus: icon("Minus"),
    Trash2: icon("Trash2"),
    Edit: icon("Edit"),
    Eye: icon("Eye"),
    EyeOff: icon("EyeOff"),
    Copy: icon("Copy"),
    RefreshCw: icon("RefreshCw"),
    MoreHorizontal: icon("MoreHorizontal"),
    MoreVertical: icon("MoreVertical"),
    Loader2: icon("Loader2"),
    Sparkles: icon("Sparkles"),
    Zap: icon("Zap"),
    Star: icon("Star"),
    Heart: icon("Heart"),
    Shield: icon("Shield"),
    Lock: icon("Lock"),
    Key: icon("Key"),
    Globe: icon("Globe"),
    MapPin: icon("MapPin"),

    // Journal / audit
    BookOpen: icon("BookOpen"),
    ClipboardList: icon("ClipboardList"),

    // Misc
    Sun: icon("Sun"),
    Moon: icon("Moon"),
    Palette: icon("Palette"),
    Code: icon("Code"),
    Terminal: icon("Terminal"),
    Database: icon("Database"),
  };
}
