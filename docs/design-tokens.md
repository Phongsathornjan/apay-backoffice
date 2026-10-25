# APay Design Tokens

Source of truth: `design-system/APay-Design-System-Prompt.md`
Implementation: `app/globals.css` (`:root` + `@theme inline`)

## 1. Brand

| Token | Value | Utility examples |
|---|---|---|
| `--apay-brand` | `#6554F0` | `bg-brand`, `text-brand`, `border-brand` |
| `--apay-brand-hover` | `#5A49DA` | `hover:bg-brand-hover` |
| `--apay-brand-active` | `#4C3DC4` | `active:bg-brand-active` |
| `--apay-brand-soft` | `#EEECFE` | `bg-brand-soft` |
| `--apay-brand-border` | `#D8D4FB` | `border-brand-border` |
| `--apay-brand-ink` | `#4B3ACB` | `text-brand-ink` |
| `--apay-gradient` | `linear-gradient(100deg, #6877EE, #A24CF0, #673FEA)` | `.text-gradient-brand` |

Primary actions, active navigation, links, focus rings, and selected states use the brand
violet. The gradient is reserved for short hero phrases and small brand accents.

## 2. Surfaces and text

| Token | Value | Utility examples |
|---|---|---|
| `--apay-canvas` | `#F5F7FF` | `bg-canvas` |
| `--apay-surface` | `#FFFFFF` | `bg-surface` |
| `--apay-surface-subtle` | `#F8F9FF` | `bg-surface-subtle` |
| `--apay-surface-muted` | `#F1F5F9` | `bg-surface-muted` |
| `--apay-line` | `#E2E8F0` | `border-line`, `divide-line` |
| `--apay-line-strong` | `#CBD5E1` | `border-line-strong` |
| `--apay-ink` | `#11182D` | `text-ink` |
| `--apay-ink-secondary` | `#52617A` | `text-ink-secondary` |
| `--apay-ink-muted` | `#5F6F86` | `text-ink-muted` |

`ink-muted` is tuned to ~5.2:1 on white and ~4.8:1 on the canvas so 11–12px metadata
still meets AA. Keep it for secondary metadata and icons; body copy uses `ink-secondary`.

## 3. Semantic status

Each status has four tokens: `(base)`, `-soft` (background), `-border`, `-ink` (text).

| Status | Base | Soft | Border | Ink |
|---|---|---|---|---|
| success | `#059669` | `#ECFDF5` | `#A7F3D0` | `#047857` |
| warning | `#D97706` | `#FFFBEB` | `#FDE68A` | `#B45309` |
| danger | `#DC2626` | `#FEF2F2` | `#FECACA` | `#B91C1C` |
| info | `#2563EB` | `#EFF6FF` | `#BFDBFE` | `#1D4ED8` |

Rules:

- Green = success / available only (`PAID`, `ACTIVE`, "พร้อมรับชำระ").
- Amber = pending / unverified / caution.
- Red = failed / destructive / error.
- Blue = informational.
- Never use status colours as the brand identity.
- Use `*-ink` for text on `*-soft` backgrounds; the 500-level base colour does not meet
  AA for normal text.

## 4. Components API

`Badge`, `KpiCard`, `Progress` and `Toast` use semantic tones:

```
success | warning | danger | info | brand | neutral
```

`statusTone(status)` maps API statuses: `PAID/ACTIVE/MATCHED/SUCCESS → success`,
`UNVERIFIED/PENDING/PAST_DUE → warning`, `EXPIRED/FAILED/ERROR/NO_MATCH/REVOKED → danger`,
`CANCELLED/INACTIVE → neutral`, `PROCESSING → brand`.

## 5. Shape and elevation

| Token | Value | Utility |
|---|---|---|
| `--radius-control` | `8px` | `rounded-control` |
| `--radius-card` | `12px` | `rounded-card` |
| `--radius-panel` | `16px` | `rounded-panel` |
| pills | `9999px` | `rounded-full` |
| `--shadow-card` | `0 1px 2px rgba(17,24,45,0.04)` | `shadow-card` |
| `--shadow-raised` | `0 12px 32px -16px rgba(17,24,45,0.22)` | `shadow-raised` |

Use borders first; shadows are subtle. Avoid glassmorphism, neon glow, and large decorative
gradients.

## 6. Code surfaces

| Token | Value | Utility |
|---|---|---|
| `--apay-code-bg` | `#0F172A` | `bg-code` |
| `--apay-code-ink` | `#E2E8F0` | `text-code-ink` |
| `--apay-code-accent` | `#C8C7FF` | `text-code-accent` |

Use for API keys, JSON payloads, and response previews. Never place real credentials in
example data.

## 7. Charts

`lib/chart-colors.ts` mirrors the tokens because Recharts needs hex values:

- Series: `#6554F0`, `#9B4DF0`, `#6877EE`, `#2563EB`, `#06B6D4`, `#059669`, `#D97706`,
  `#DC2626`, `#5F6F86`
- Status: PAID `#059669`, UNVERIFIED active `#D97706`, UNVERIFIED expired `#94A3B8`,
  EXPIRED `#DC2626`

Update both files together when a token changes.

## 8. Usage checklist

- [ ] No `emerald`, `indigo`, `sky`, `rose`, or `amber` utilities in `app/` or `components/`
- [ ] No raw brand/status hex outside `globals.css` and `lib/chart-colors.ts`
- [ ] Focus state visible (2px brand outline)
- [ ] Status text uses `*-ink`
- [ ] QR codes sit on a plain white surface with a quiet zone
- [ ] Font sizes: 12px minimum for readable metadata, 14px body
