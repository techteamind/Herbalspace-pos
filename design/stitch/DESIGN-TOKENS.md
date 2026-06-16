---
name: Herbal Minimalist POS
colors:
  surface: '#f6faf5'
  surface-dim: '#d7dbd6'
  surface-bright: '#f6faf5'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f1f5ef'
  surface-container: '#ebefe9'
  surface-container-high: '#e5e9e4'
  surface-container-highest: '#dfe4de'
  on-surface: '#181d19'
  on-surface-variant: '#3f4942'
  inverse-surface: '#2d322e'
  inverse-on-surface: '#eef2ec'
  outline: '#6f7a72'
  outline-variant: '#bec9c0'
  surface-tint: '#056c47'
  primary: '#00603e'
  on-primary: '#ffffff'
  primary-container: '#1f7a53'
  on-primary-container: '#aeffd1'
  inverse-primary: '#82d8aa'
  secondary: '#835400'
  on-secondary: '#ffffff'
  secondary-container: '#fdb244'
  on-secondary-container: '#6e4600'
  tertiary: '#883b3f'
  on-tertiary: '#ffffff'
  tertiary-container: '#a65256'
  on-tertiary-container: '#ffe9e8'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#9ef5c4'
  primary-fixed-dim: '#82d8aa'
  on-primary-fixed: '#002112'
  on-primary-fixed-variant: '#005234'
  secondary-fixed: '#ffddb5'
  secondary-fixed-dim: '#ffb956'
  on-secondary-fixed: '#2a1800'
  on-secondary-fixed-variant: '#633f00'
  tertiary-fixed: '#ffdad9'
  tertiary-fixed-dim: '#ffb3b4'
  on-tertiary-fixed: '#3e030c'
  on-tertiary-fixed-variant: '#782e33'
  background: '#f6faf5'
  on-background: '#181d19'
  surface-variant: '#dfe4de'
typography:
  display-price:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  display-price-mobile:
    fontFamily: Inter
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 34px
  h1:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  h2:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-caps:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base-unit: 4px
  touch-target-min: 44px
  container-padding: 16px
  gutter: 12px
  section-gap: 24px
---

## Brand & Style
The design system is centered on a high-end F&B retail experience, blending the organic vitality of herbal themes with the precision of a professional point-of-sale system. The brand personality is efficient, healthy, and reliable, targeting modern cafe owners and staff who value speed and aesthetic clarity.

The visual style follows a **Modern Minimalist** approach with a focus on tactile clarity. It utilizes generous whitespace to reduce cognitive load during high-traffic service hours. The interface feels "airy" yet structured, using high-contrast typography and large touch targets to ensure the UI is functional under various lighting conditions typical of cafe environments.

## Colors
The palette is anchored by a deep herbal green, evoking freshness and stability. A warm amber accent is used sparingly for primary calls-to-action (like "Bayar" or "Proses Pesanan") to provide a high-visibility focal point. 

- **Primary (#1F7A53):** Used for navigation, brand elements, and active states.
- **Accent (#F2A93B):** Reserved for high-priority transaction buttons and highlights.
- **Background (#F7F8F7):** A soft, off-white "off-paper" tint to reduce eye strain compared to pure white.
- **Neutrals (Slate Scale):** Used for text hierarchy and subtle borders, providing a professional, grounded feel.
- **Semantic Colors:** Standardized for status indicators (Success, Warning, Danger) following global accessibility patterns.

## Typography
The design system utilizes **Inter** for its exceptional legibility on small screens and digital displays. 

- **Price Displays:** Use the `display-price` role for totals. Always format as "Rp 25.000" (with a space after 'Rp' and a dot as thousands separator). 
- **Language:** Use Bahasa Indonesia for all instructional labels (e.g., "Tambah Pesanan", "Riwayat", "Pengaturan").
- **Hierarchy:** Use semi-bold weights for interactive elements and regular weights for descriptions. High contrast between headers and body text is maintained to aid quick scanning by baristas.

## Layout & Spacing
This system follows a **Mobile-First** philosophy designed for handheld POS terminals and tablets.

- **Thumb-Zone Optimization:** Place primary transaction buttons (Bayar, Simpan) in the bottom third of the screen for easy one-handed reach.
- **Tap Targets:** Every interactive element must maintain a minimum hit area of 44x44px.
- **Grid:** Use a 4-column fluid grid for mobile and an 8-column grid for tablet/landscape orientations.
- **Margins:** Standardize on 16px (1rem) for container margins to ensure content doesn't feel cramped against device edges.

## Elevation & Depth
Depth is conveyed through a combination of **Tonal Layers** and **Ambient Shadows**.

- **Level 0 (Background):** Surface color #F7F8F7.
- **Level 1 (Cards/Sheet):** White (#FFFFFF) surfaces with a subtle, very soft shadow (0px 4px 12px, 5% opacity slate). These are used for product items and menu categories.
- **Level 2 (Floating/Toasts):** Slightly deeper shadows to indicate temporary overlays or urgent notifications.
- **Outlines:** Use 1px borders in Slate-200 for non-elevated form fields to maintain the "clean" minimalist aesthetic without excessive shadow use.

## Shapes
The shape language is friendly yet structured. The "Rounded-XL" (16px) standard is applied to all primary containers and cards to give the UI a modern, approachable feel.

- **Primary Cards:** 16px (rounded-xl)
- **Buttons & Inputs:** 12px (rounded-lg) for a more precise, functional look.
- **Badges/Tags:** Fully rounded (pill) for status indicators like "Tersedia" or "Habis".

## Components
Consistent component styling ensures the POS remains intuitive during rush hours.

- **Cards:** White background, 16px radius, subtle shadow. Product cards should feature a large price label in the bottom right.
- **Buttons:**
    - *Primary:* Deep Green background, white text.
    - *Accent:* Warm Amber background, white text (for the final 'Bayar' step).
    - *Secondary:* Ghost style with slate-200 border.
- **Bottom Sheets:** Use for modifying order items (adding sugar, ice level, etc.) on mobile. High-radius top corners (24px).
- **Data Tables:** Used for "Riwayat Transaksi" (Transaction History). Use zebra-striping with #F1F5F9 for readability.
- **Toasts:** Positioned at the top of the screen for success messages (e.g., "Pembayaran Berhasil") using the Success color palette.
- **Inputs:** Large text padding (12px 16px) with a 14px font size for clarity.