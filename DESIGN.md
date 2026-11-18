---
version: 1.0
name: Chance Premiada Design System
description: Minimalist Fintech & Apple Wallet design language for Chance Premiada, with automatic daily color rotation.
---

## Overview

Minimalist, high-trust fintech experience for **Chance Premiada** (Grade 01–75 · 1ª Bola no PIX), combining **Apple Wallet / Apple Settings** clarity with **Spendvest / Fold** visual hierarchy while preserving 100% of Chance Premiada's brand identity.

## Colors & Daily Automatic Rotation

All brand colors are driven by CSS custom properties in `src/index.css` and `src/utils/themeTokens.ts`:

- `--brand-primary`: Primary surface & active pill color (default `#073D2B`)
- `--brand-primary-hover`: Hover state for primary actions (default `#052E20`)
- `--brand-accent`: High-contrast accent pill / CTA highlight (default `#B5F44A`)
- `--brand-accent-ink`: Ink on accent surfaces (default `#073D2B`)
- `--brand-gold`: Secondary badge & loyalty highlight (`#D9B85D`)
- `--brand-canvas`: Page canvas (`#F4F5F7`)
- `--brand-surface`: Card surface (`#FFFFFF`)
- `--brand-ink`: Primary text (`#151515`)
- `--brand-muted`: Secondary text (`#6E6E73`)

The Admin Panel supports 1-click switching between `auto_daily` (automatic daily palette rotation across `emerald_volt`, `gold_obsidian`, `mint_apple`, `ocean_fintech`) and any fixed palette.

## Typography

- **Display / Headings**: `Plus Jakarta Sans` with `text-balance`
- **Body**: `DM Sans` with `text-pretty`
- **Numeric / PIX / Grid**: `JetBrains Mono` with `tabular-nums`

## Layout & Elevation

- **Mobile First**: `min-h-dvh`, `overflow-x-hidden`, Safe Area bottom navigation (`pb-safe-bottom`), zero horizontal overflow on `320px–480px` viewports.
- **Cards**: `rounded-3xl`, `bg-white`, hairline border `border-black/[0.06]`, subtle shadow `shadow-[0_4px_20px_rgba(0,0,0,0.02)]`.
- **Quick Actions**: Circular icon actions (`rounded-full`) on the Home screen.
- **Settings / Profile Rows**: Grouped white container with `divide-y divide-black/[0.06]` and trailing chevron icons.
- **Order Review**: Hairline-separated summary rows with `tabular-nums` pricing and a high-contrast total pill.

## Accessibility & Motion

- Every icon-only button provides an explicit `aria-label`.
- Keyboard focus remains visible across all interactive controls.
- Interaction feedback stays `<= 200ms` (`transition-colors duration-150`) and respects `prefers-reduced-motion`.
