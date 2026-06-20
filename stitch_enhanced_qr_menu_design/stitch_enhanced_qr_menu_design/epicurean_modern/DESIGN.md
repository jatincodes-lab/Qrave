---
name: Epicurean Modern
colors:
  surface: '#fcf9f8'
  surface-dim: '#dcd9d9'
  surface-bright: '#fcf9f8'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f6f3f2'
  surface-container: '#f0eded'
  surface-container-high: '#eae7e7'
  surface-container-highest: '#e5e2e1'
  on-surface: '#1c1b1b'
  on-surface-variant: '#414944'
  inverse-surface: '#313030'
  inverse-on-surface: '#f3f0ef'
  outline: '#717974'
  outline-variant: '#c0c8c3'
  surface-tint: '#3b6756'
  primary: '#00261a'
  on-primary: '#ffffff'
  primary-container: '#0f3d2e'
  on-primary-container: '#7ba894'
  inverse-primary: '#a2d1bb'
  secondary: '#825516'
  on-secondary: '#ffffff'
  secondary-container: '#fec178'
  on-secondary-container: '#784d0d'
  tertiary: '#1d2121'
  on-tertiary: '#ffffff'
  tertiary-container: '#323636'
  on-tertiary-container: '#9b9f9e'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#beedd7'
  primary-fixed-dim: '#a2d1bb'
  on-primary-fixed: '#002116'
  on-primary-fixed-variant: '#234f3f'
  secondary-fixed: '#ffddb9'
  secondary-fixed-dim: '#f8bb73'
  on-secondary-fixed: '#2b1700'
  on-secondary-fixed-variant: '#663e00'
  tertiary-fixed: '#e0e3e2'
  tertiary-fixed-dim: '#c4c7c6'
  on-tertiary-fixed: '#181c1c'
  on-tertiary-fixed-variant: '#434847'
  background: '#fcf9f8'
  on-background: '#1c1b1b'
  surface-variant: '#e5e2e1'
typography:
  display-lg:
    fontFamily: Manrope
    fontSize: 32px
    fontWeight: '800'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Manrope
    fontSize: 24px
    fontWeight: '700'
    lineHeight: '1.3'
  headline-sm:
    fontFamily: Manrope
    fontSize: 18px
    fontWeight: '700'
    lineHeight: '1.4'
  body-lg:
    fontFamily: Be Vietnam Pro
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  body-sm:
    fontFamily: Be Vietnam Pro
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.5'
  label-bold:
    fontFamily: Manrope
    fontSize: 12px
    fontWeight: '700'
    lineHeight: '1'
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  container-margin: 20px
  stack-gap-lg: 32px
  stack-gap-md: 16px
  stack-gap-sm: 8px
  inline-gap: 12px
---

## Brand & Style
The design system focuses on a **Modern Culinary** aesthetic, balancing a premium, high-end feel with high-utility digital commerce. It targets tech-savvy diners who appreciate both presentation and efficiency. The emotional response is one of "refined appetite"—using clean lines and abundant white space to let food photography breathe, while utilizing deep, organic tones to suggest freshness and quality.

The style is a blend of **Minimalism** and **Tactile Modernism**, characterized by large, immersive imagery, crisp typography, and subtle depth through soft shadows and tonal layering.

## Colors
The palette is anchored by a deep **Forest Green** (#0F3D2E), evoking a sense of organic gourmet quality and professional reliability. This is contrasted with **Harvest Gold** (#D9A05B) for call-to-action elements, acting as a warm, appetizing accent that draws the eye to "Add to Cart" and "Order" buttons.

The background uses a soft **Mint White** (#F4F7F6) rather than pure white to reduce eye strain in restaurant lighting. Text is set in a deep **Charcoal** (#1A1A1A) for maximum legibility.

## Typography
The system uses **Manrope** for structural elements and headings to convey a modern, balanced, and trustworthy feel. **Be Vietnam Pro** is utilized for body text and descriptions, chosen for its friendly and approachable character which remains highly legible even at small sizes on mobile screens.

Hierarchy is strictly enforced: category names use `headline-md`, while item names use `headline-sm`. Price and "Add" actions are emphasized through weight rather than just size.

## Layout & Spacing
This design system employs a **Fluid Mobile-First Grid**. On mobile, it utilizes a single-column layout with 20px side margins to ensure content is never cramped against the bezel. 

The vertical rhythm is driven by the "Card-Stack" model:
- **Major Sections (Categories):** Separated by 32px.
- **Menu Items within Categories:** Separated by 16px.
- **Elements within an Item (Title to Description):** Separated by 8px.

High-quality food images should span the full width of the container to maximize visual impact.

## Elevation & Depth
The design system uses **Tonal Layers** and **Ambient Shadows** to create a clear sense of interactable hierarchy. 

- **Surface Level 0 (Background):** Mint White (#F4F7F6).
- **Surface Level 1 (Cards):** Pure White (#FFFFFF) with a very soft, 12% opacity shadow (0px 4px 20px) to indicate "lift" from the background.
- **Floating Actions:** The "Call Waiter" and "View Cart" sticky buttons use a more aggressive shadow (20% opacity) and a slight backdrop blur to ensure they remain distinct from the scrolling menu content behind them.

## Shapes
A **Rounded** (0.5rem / 8px) corner radius is the standard for cards and input fields, providing a modern and friendly aesthetic. 

- **Primary Buttons:** Use a slightly more aggressive `rounded-lg` (16px) or full pill-shape to distinguish them as primary interactive touchpoints.
- **Image Containers:** Match the card roundedness (8px) to maintain a cohesive structural language.
- **Status Tags (Veg/Non-Veg):** Fully rounded pill shapes.

## Components

### Menu Cards
Menu items are presented in horizontal cards. The left 65% is dedicated to text (Title, Description, Price), while the right 35% features a square-ratio image with the "Add" button partially overlapping the image bottom-right for a tactile, layered feel.

### Action Buttons
- **Add to Cart:** Uses the Secondary color (Gold) with bold black text. It should feature a large "+" icon for quick thumb interaction.
- **Call Waiter:** A floating action button (FAB) or a persistent bottom bar element in Primary Green with a clear bell icon.

### Category Navigation
A horizontally scrolling "Chip" bar at the top of the menu. Active states use the Primary Green background with white text; inactive states use a ghost-border style with charcoal text.

### Input Fields
Search and "Optional Note" fields use a light grey stroke (1px) and the Mint White background. On focus, the stroke should transition to Primary Green.

### Dietary Indicators
Small, high-contrast icons for Veg (Green Circle) and Non-Veg (Red Triangle), placed immediately before the item title for instant recognition.