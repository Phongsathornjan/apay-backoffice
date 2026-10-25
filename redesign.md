# Plan: APay Backoffice UI Redesign ตาม APay Design System

**Generated**: 2026-10-25
**Estimated Complexity**: High
**Source of truth**: `design-system/APay-Design-System-Prompt.md`
**Status**: Implemented — Sprint 1–6 และ QA หลักเสร็จแล้ว (ดู §15)

---

## 1. Overview

เปลี่ยน UI ของ APay Backoffice จากธีมเขียว (emerald) ที่ hard-code สีกระจายอยู่ทั่วโปรเจกต์
ไปเป็น **APay Design System**: violet/purple/blue เป็นสีแบรนด์, ตัวอักษร dark navy,
พื้นหลัง cool light, ใช้ official logo, และรวมสีทั้งหมดไว้ที่ centralized tokens

แนวทางหลัก:

1. คง stack เดิม (Next.js 16 + React 19 + Tailwind CSS 4 + lucide-react + recharts)
2. สร้าง semantic design tokens ใน `app/globals.css` ผ่าน `@theme inline` ของ Tailwind v4
3. เปลี่ยน primitive components ให้ใช้ token แทน palette class โดยตรง
4. เปลี่ยน tone API ของ Badge/KpiCard/Progress เป็นชื่อเชิงความหมาย (success/warning/danger/info/brand/neutral)
5. ใช้ official logo จาก `design-system/` (ไม่วาดใหม่ ไม่เปลี่ยนสี)
6. ตรวจ responsive + accessibility + ทุก state (hover/focus/disabled/loading/empty/error)
7. ไม่แตะ business logic, API contract, auth flow หรือ data fetching

**ผลลัพธ์ที่คาดหวัง**: UI ทั้ง merchant portal, admin console และ login สอดคล้องกัน,
ไม่มีสีเขียวเป็นแบรนด์, สีมาจาก token เดียว, และผ่าน lint/build

---

## 2. Findings — สภาพปัจจุบัน

### 2.1 Stack ที่มีอยู่

| Layer | ของจริงในโปรเจกต์ | หมายเหตุ |
|---|---|---|
| Framework | Next.js `16.4.2` (App Router) | `cacheComponents: true`, `partialPrefetching: true` |
| React | `19.3.0` | |
| Styling | Tailwind CSS `^4` + `@tailwindcss/turbopack` | tokens อยู่ใน `app/globals.css` ด้วย `@theme inline` |
| Icons | `lucide-react` | ใช้ต่อ ไม่เปลี่ยน |
| Charts | `recharts ^3.10.1` | สี hard-code ใน `dashboard-charts.tsx` |
| Component library | ไม่มี (custom components ใน `components/ui`) | **ไม่มี MUI** |
| Fonts | Inter + Noto Sans Thai + JetBrains Mono ผ่าน `next/font/google` | ตรงกับ fallback stack ที่ Design System แนะนำ — คงไว้ |
| Tests | ไม่มี test runner / script `test` | validation ใช้ lint + build + manual |

### 2.2 ปัญหาหลักที่ขัดกับ Design System

1. **สีแบรนด์ผิด**: `app/globals.css` กำหนด `--brand: #059669` (เขียว) และ `--brand-strong: #047857`
   ขณะที่ Design System ห้ามใช้เขียวเป็นสีหลักอย่างชัดเจน
2. **Green hard-code 205 จุด ใน 33 ไฟล์** (`emerald-*`) กระจายทั้ง app shell, ปุ่ม, badge,
   ฟอร์ม, charts, QR panel และ login
3. **ไม่มี semantic tokens**: นอก `--brand` แล้วทุกอย่างเป็น Tailwind palette class
   (`slate-*`, `emerald-*`, `indigo-*`, `rose-*`, `amber-*`) ปนกัน
4. **Logo ปลอม**: `components/layout/logo.tsx` วาดกล่องตัว "A" ด้วย gradient เขียว
   ไม่ใช่ official asset ทั้งที่ไฟล์จริงมีอยู่ใน `design-system/`
5. **Sidebar เป็น dark navy + emerald accent** (`#0b1220`) และโลโก้ต้องใช้บนพื้นมืด
   ซึ่งขัดกับแนว "official logo บนพื้น white/light"
6. **Login hero เป็นเขียว/น้ำเงิน** พร้อม headline สีเขียว
7. **Charts ใช้เขียวเป็นสีแรก** (`CHART_COLORS[0] = #059669`) และ status colors
   hard-code ในหน้า dashboard (`#10b981`, `#f59e0b`, `#94a3b8`, `#f43f5e`)
8. **Accessibility gaps**:
   - `:focus-visible { outline: none; }` ระดับ global โดยไม่มี ring แทนที่ทุกจุด
   - `::selection` เป็นเขียว
   - ฟอนต์เล็กมาก (9–11px) จำนวนมากใน metadata/tables
   - `FormField` ไม่ผูก error กับ input ด้วย `aria-describedby`
   - Mobile nav drawer ไม่มี `role="dialog"` / `aria-modal` / Escape handler
   - Charts (SVG) ไม่มี accessible summary
9. **สถานะ semantic ยังถูกต้องบางส่วน**: `PAID → emerald`, `UNVERIFIED → amber`,
   `EXPIRED → rose` — โครง logic ใช้ได้ แต่ชื่อ tone และสีต้องย้ายไป semantic token

### 2.3 ขอบเขตไฟล์

- ไฟล์ UI ทั้งหมด: **51 ไฟล์** (`app/` 20, `components/` 31) ประมาณ 9,000+ บรรทัด
- หน้าที่ได้รับผลกระทบโดยตรง: 8 หน้า (`login`, merchant 4, admin 4) + error/not-found/root loader
- ไฟล์ที่แตะหนักที่สุด: `payments/page.tsx` (921), `api-keys/page.tsx` (651),
  `admin/dashboard/page.tsx` (648), `admin/businesses/page.tsx` (565),
  `charts/dashboard-charts.tsx` (532), `dashboard/page.tsx` (514),
  `admin/webhook-simulator/page.tsx` (514), `subscription/page.tsx` (496)

### 2.4 Assets

| ไฟล์ | ขนาด | การใช้ |
|---|---|---|
| `design-system/horizontal_logo.png` | 2172×724, พื้นหลังเกือบขาว `#FEFEFF` | โลโก้หลัก (symbol + wordmark) |
| `design-system/APay-logo.png` | 1254×1254, พื้นหลังขาว | ใช้ crop symbol สำหรับ favicon/compact |

> ทั้งสองไฟล์มี whitespace รอบนอกจำนวนมาก หากวางตรง ๆ โลโก้จะดูเล็ก
> แผนคือ **trim whitespace** และ resize เป็น derived assets (ไม่ recolor / ไม่บิดสัดส่วน)

---

## 3. Design Decisions (ข้อตกลงก่อนลงมือ)

| # | ประเด็น | ข้อสรุปที่เสนอ | เหตุผล |
|---|---|---|---|
| D1 | MUI | ✅ **ยืนยันแล้ว: ไม่เพิ่ม MUI** ใช้ Tailwind + custom primitives เดิม | โปรเจกต์เป็น Tailwind-native ทั้งหมด การเพิ่ม MUI = เปลี่ยน architecture + dependency ซ้ำซ้อน ขัดกับ Design System §11.2 ("do not replace working dependencies") |
| D2 | Sidebar | ✅ **ยืนยันแล้ว: Light sidebar** (white surface + violet active state) | ทำให้ official logo อยู่บนพื้น light ได้ตาม §3, ดู modern/minimal และตัด dark navy ที่ขัด brand |
| D3 | Tone API | **Rename เป็น semantic tones** | บังคับกฎ "เขียว = success เท่านั้น" ระดับ type และอ่านง่ายขึ้น |
| D4 | Scope | ทุกหน้า (merchant + admin + auth + error states) | ให้ consistent ทั้งผลิตภัณฑ์ |
| D5 | Dark mode | **ไม่ทำ** (บังคับ light theme) | ไม่อยู่ใน scope และ Design System ระบุ light surfaces |
| D6 | Logo | ใช้ official PNG + derived trim/resize, ห้าม recolor | ตาม §1/§3 |
| D7 | Fonts | คง Inter + Noto Sans Thai + JetBrains Mono | ตรงกับ §4 แล้ว |
| D8 | ภาษา | คงข้อความไทย/อังกฤษเดิมทั้งหมด | งานนี้เป็น visual redesign ไม่ใช่ copy rewrite |

---

## 4. Design Token Specification

### 4.1 CSS variables (`app/globals.css`)

```css
:root {
  /* Brand */
  --apay-brand: #6554f0;
  --apay-brand-hover: #5a49da;
  --apay-brand-active: #4c3dc4;
  --apay-brand-soft: #eeecfe;
  --apay-brand-border: #d8d4fb;
  --apay-brand-ink: #4b3acb;          /* text on brand-soft, ~7:1 */
  --apay-gradient: linear-gradient(100deg, #6877ee 0%, #a24cf0 55%, #673fea 100%);

  /* Surfaces */
  --apay-canvas: #f5f7ff;
  --apay-surface: #ffffff;
  --apay-surface-subtle: #f8f9ff;
  --apay-surface-muted: #f1f5f9;
  --apay-line: #e2e8f0;
  --apay-line-strong: #cbd5e1;

  /* Text */
  --apay-ink: #11182d;
  --apay-ink-secondary: #52617a;
  --apay-ink-muted: #718096;          /* decorative/large text only, 4.0:1 */

  /* Status — ใช้เฉพาะความหมาย ไม่ใช้เป็นแบรนด์ */
  --apay-success: #059669;  --apay-success-soft: #ecfdf5;  --apay-success-border: #a7f3d0;  --apay-success-ink: #047857;
  --apay-warning: #d97706;  --apay-warning-soft: #fffbeb;  --apay-warning-border: #fde68a;  --apay-warning-ink: #b45309;
  --apay-danger:  #dc2626;  --apay-danger-soft:  #fef2f2;  --apay-danger-border:  #fecaca;  --apay-danger-ink:  #b91c1c;
  --apay-info:    #2563eb;  --apay-info-soft:    #eff6ff;  --apay-info-border:    #bfdbfe;  --apay-info-ink:    #1d4ed8;

  /* Code / secret surfaces */
  --apay-code-bg: #0f172a;
  --apay-code-ink: #e2e8f0;
  --apay-code-accent: #c8c7ff;
}
```

`@theme inline` mapping (ทำให้เกิด utility เช่น `bg-canvas`, `text-ink`, `border-line`,
`bg-brand`, `text-success-ink`, `rounded-card`, `shadow-card`):

```css
@theme inline {
  --color-brand: var(--apay-brand);
  --color-brand-hover: var(--apay-brand-hover);
  --color-brand-active: var(--apay-brand-active);
  --color-brand-soft: var(--apay-brand-soft);
  --color-brand-border: var(--apay-brand-border);
  --color-brand-ink: var(--apay-brand-ink);

  --color-canvas: var(--apay-canvas);
  --color-surface: var(--apay-surface);
  --color-surface-subtle: var(--apay-surface-subtle);
  --color-surface-muted: var(--apay-surface-muted);
  --color-line: var(--apay-line);
  --color-line-strong: var(--apay-line-strong);

  --color-ink: var(--apay-ink);
  --color-ink-secondary: var(--apay-ink-secondary);
  --color-ink-muted: var(--apay-ink-muted);

  --color-success: var(--apay-success);
  --color-success-soft: var(--apay-success-soft);
  --color-success-border: var(--apay-success-border);
  --color-success-ink: var(--apay-success-ink);
  /* warning / danger / info ตามรูปแบบเดียวกัน */

  --color-code: var(--apay-code-bg);
  --color-code-ink: var(--apay-code-ink);
  --color-code-accent: var(--apay-code-accent);

  --radius-control: 8px;
  --radius-card: 12px;
  --radius-panel: 16px;

  --shadow-card: 0 1px 2px rgba(17, 24, 45, 0.04);
  --shadow-raised: 0 12px 32px -16px rgba(17, 24, 45, 0.22);
}
```

### 4.2 กติกาการใช้สี

- Primary action / active nav / link / focus / selected → `brand`
- Gradient → ใช้เฉพาะ hero headline (บาง phrase), brand accent, selected highlight
- Green → `success` เท่านั้น (`PAID`, `SUCCESS`, `ACTIVE`, "พร้อมรับชำระ")
- Amber → `warning` (`PENDING`, `UNVERIFIED`, `PAST_DUE` ระยะเตือน)
- Red → `danger` (`FAILED`, `ERROR`, `EXPIRED` ตามพฤติกรรม, destructive)
- ห้ามใช้ `emerald` / `indigo` / `sky` เป็นสีแบรนด์อีก
- ข้อความ metadata ต้องใช้ `ink-secondary`; `ink-muted` เฉพาะข้อความเสริม/ไอคอน/กราฟ
- Status text บนพื้น soft ต้องใช้ `*-ink` (เข้มพอผ่าน AA) ไม่ใช้สี 500 ตรง ๆ

### 4.3 Typography / spacing / radius

- Type scale: display 48–64, h1 30–40, h2 24–28, h3 18–20, body 14–16, small 13, caption 12
- **ยกเลิกการใช้ 9–10px กับข้อความที่ต้องอ่าน** (เก็บ 10–11px ได้เฉพาะ axis/label ของกราฟ)
- Spacing scale 4/8/12/16/24/32/40/48/64
- Radius: control 8, input/card 12, panel 16–20, pill 999
- Touch target ≥ 44×44px บน mobile (nav link สูง 44px, ปุ่ม icon อย่างน้อย 40px)

---

## 5. Component Specification

### 5.1 Tone mapping (Badge / KpiCard / Progress / Toast)

| เดิม | ใหม่ | ใช้กับ |
|---|---|---|
| `emerald` | `success` | PAID, ACTIVE, MATCHED, connected |
| `amber` | `warning` | UNVERIFIED, PENDING, quota เตือน |
| `rose` | `danger` | FAILED, EXPIRED, REVOKED, destructive |
| `slate` | `neutral` | CANCELLED, INACTIVE, ไม่มีข้อมูล |
| `indigo` | `brand` | processing, admin role, package code |
| `sky` | `info` | informational |

ไฟล์ที่ต้องอัปเดต call site ทั้งหมด: ทุกไฟล์ที่มี `tone="emerald|amber|rose|slate|indigo|sky"`
และ `ProgressTone`, `statusTone()` (ค้นด้วย `rg 'tone="(emerald|amber|rose|slate|indigo|sky)"'`)

### 5.2 Primitives

| Component | การเปลี่ยนแปลง |
|---|---|
| `Button` | primary = brand solid + hover/active; secondary = white + `line`; ghost = brand text; danger = `danger`; outline = brand-soft; `dark` เก็บไว้สำหรับ code actions; focus ring 2px brand + offset 2 |
| `Badge` | semantic tones + `dot`; status text ใช้ `*-ink`; คง pill shape |
| `Card` | `rounded-panel`, `border-line`, `shadow-card`; header divider `line` |
| `FormField` | error ผูกด้วย `aria-describedby` + `aria-invalid`; focus ring brand; label ไม่หาย |
| `Input/Select/Textarea` | `border-line`, focus `brand` + ring 4px brand/10; disabled surface-muted |
| `Modal/Drawer` | overlay navy/45, surface white, header/footer `surface-subtle`; คง animation 160–180ms |
| `Toast` | semantic border/icon ตาม tone, ใช้ `danger` แทน rose |
| `Progress` | tones semantic; track `surface-muted` |
| `SegmentedControl` | active = `brand-soft` + `brand-ink` |
| `Pagination` | focus brand, text secondary |
| `EmptyState` | icon tile brand-soft, dashed `line` |
| `Skeleton` | `surface-muted` |
| `CopyButton` | copied state ใช้ `success-ink` (ถูกต้องตาม semantic) |
| `PageHeader` | eyebrow `brand-ink` + เส้น accent gradient สั้น ๆ ( sparingly) |
| `ChartCard` | surface/border/shadow token + header typography ใหม่ |
| **ใหม่** `Table` primitives | `components/ui/table.tsx`: wrapper `overflow-x-auto`, `<table>` semantics, `Th` (scope=col, 12px uppercase), `Td`, numeric alignment + tabular-nums |

### 5.3 Layout

| ส่วน | เดิม | ใหม่ |
|---|---|---|
| Sidebar | dark navy `#0b1220`, active emerald | white surface, border-r `line`, active = `brand-soft` + `brand-ink` + แถบซ้าย brand 3px, hover `surface-subtle`; section label 11px uppercase `ink-muted` |
| Logo | กล่อง "A" gradient เขียว | official horizontal logo (desktop), mark-only (compact/mobile) |
| Header | white/90 blur, title slate | surface/85 blur, title `ink`, breadcrumb `ink-secondary`, h-16 |
| Main | `max-w-[1640px]` | `max-w-[1440px]` + padding 16/24/32 ตาม breakpoint |
| Bottom card | "API v1" บน dark | กล่อง `surface-subtle` + `line`, ข้อความ 12px |
| Skip link | ไม่มี | เพิ่ม "ข้ามไปเนื้อหาหลัก" (sr-only → visible on focus) |
| Mobile drawer | ไม่มี dialog semantics | `role="dialog" aria-modal="true"`, Escape ปิด, คืน focus, backdrop |
| Login | split dark/เขียว | split: ซ้ายเป็น ambient lavender→cyan gradient + grid จาง ๆ + โลโก้บนการ์ดขาว + gradient headline; ขวาเป็นฟอร์มบน surface; มือถือเหลือฟอร์ม + โลโก้ด้านบน |

### 5.4 Charts / payment / QR

- `CHART_COLORS` ใหม่ (brand-led):
  `#6554F0`, `#9B4DF0`, `#6877EE`, `#2563EB`, `#06B6D4`, `#059669`, `#D97706`, `#DC2626`, `#718096`
- Status donut ต้องใช้สี semantic คงที่: PAID `#059669`, UNVERIFIED active `#D97706`,
  UNVERIFIED expired `#94A3B8`, EXPIRED `#DC2626`
- Tooltip/grid/axis ใช้ token; axis label ≥ 10px
- เพิ่ม `role="img"` + `aria-label` ให้กราฟ และมี visible legend/สรุปตัวเลขอยู่แล้ว
- QR panel: พื้นขาวล้วน, quiet zone เพียงพอ, ไม่มี gradient/ข้อความทับ QR;
  scan line เปลี่ยนเป็น brand (ไม่ใช่เขียว); success state ใช้ semantic success
- Code/secret panel (API key reveal, webhook payload) ใช้ `code` token (dark navy) +
  `code-accent` และมี copy control

---

## 6. Sprint Plan

> ทุก sprint ต้องจบด้วยสถานะ runnable + `pnpm lint` ผ่าน
> commit แยกต่อ sprint เพื่อ rollback ได้ง่าย

### Sprint 1 — Foundation: Tokens & Brand Assets

**Goal**: มี token กลางและ official logo พร้อมใช้ โดยยังไม่กระทบโครงหน้า
**Demo/Validation**: `pnpm dev` แล้วเห็นสีเดิม (ยังไม่เปลี่ยน), DevTools เห็น CSS variables ใหม่, `pnpm build` ผ่าน

#### Task 1.1 — เพิ่ม design tokens ใน `app/globals.css`
- **Location**: `app/globals.css`
- **Description**: แทนที่ `:root` เดิมด้วย token ชุดใหม่ตาม §4.1, เพิ่ม `@theme inline` mapping,
  เปลี่ยน `::selection` เป็น brand-soft/brand-ink, ลบ `:focus-visible { outline: none }`
  แล้วใส่ focus ring กลาง (`outline: 2px solid var(--apay-brand); outline-offset: 2px`),
  อัปเดต scrollbar เป็น `line-strong`, คง `prefers-reduced-motion`
- **Dependencies**: ไม่มี
- **Acceptance Criteria**:
  - ไม่มี `--brand: #059669` เหลืออยู่
  - utility `bg-canvas`, `text-ink`, `border-line`, `bg-brand`, `text-success-ink`, `rounded-panel`, `shadow-card` ใช้งานได้
  - `::selection` ไม่ใช่เขียว
  - keyboard focus มองเห็นได้ทุก element
- **Validation**: DevTools ตรวจ computed style; Tab ผ่านหน้า login/dashboard

#### Task 1.2 — สร้าง brand assets จาก official logo
- **Location**: `public/brand/`, `app/icon.png`
- **Description**: copy official PNG เข้า `public/brand/` และสร้าง derived assets:
  - `apay-horizontal.png` — trim whitespace, resize max width ~640px
  - `apay-mark.png` — crop เฉพาะ QR symbol (ตัด wordmark), พื้นขาว, square
  - `app/icon.png` — 512×512 จาก mark (favicon ตาม Next file convention)
  - ห้าม recolor / บิดสัดส่วน; เก็บไฟล์ต้นฉบับใน `design-system/` ไว้เหมือนเดิม
- **Dependencies**: ไม่มี (ทำคู่กับ 1.3 ได้)
- **Acceptance Criteria**: ไฟล์มีขนาดเหมาะสม (< 150KB ต่อไฟล์), พื้นหลังขาว, สัดส่วนถูกต้อง, favicon แสดง
- **Validation**: เปิดไฟล์เทียบต้นฉบับ; ตรวจ Network tab ว่าไม่โหลดไฟล์ > 200KB

#### Task 1.3 — Rewrite `Logo` component
- **Location**: `components/layout/logo.tsx`
- **Description**: ใช้ `next/image` กับ asset จริง รองรับ variant `full | compact`,
  `size` (sm/md/lg), และพื้น light เท่านั้น; ลบกล่อง "A" เดิม; กำหนด width/height ป้องกัน CLS;
  alt text "APay"
  - อ่าน docs Next 16 ใน `node_modules/next/dist/docs/` ก่อนเขียน (ตาม `AGENTS.md`)
- **Dependencies**: 1.2
- **Acceptance Criteria**: โลโก้คมชัด, ไม่ยืด/บิด, ไม่มี emerald, ใช้ได้ทั้ง sidebar/login/not-found
- **Validation**: ดูที่ 1x/2x, มือถือ, และใน not-found

#### Task 1.4 — Documentation ของ tokens
- **Location**: `docs/design-tokens.md` (ใหม่)
- **Description**: สรุป token, utility ที่เกิด, tone mapping, กฎการใช้สี, ตัวอย่าง component
- **Dependencies**: 1.1
- **Acceptance Criteria**: dev ใหม่สามารถอ่านแล้วใช้ token ได้โดยไม่ hard-code สี
- **Validation**: review เนื้อหากับ §4

---

### Sprint 2 — Core UI Primitives

**Goal**: primitives ทั้งหมดใช้ token + semantic tones และมี state ครบ
**Demo/Validation**: หน้า login/dashboard ยังทำงาน, ปุ่ม/badge/ฟอร์มเปลี่ยนเป็นม่วง, `pnpm lint` ผ่าน

#### Task 2.1 — `Button` + `CopyButton`
- **Location**: `components/ui/button.tsx`, `components/ui/copy-button.tsx`
- **Description**: ตาม §5.2; ปรับ size `sm` เป็น h-9, `md` h-10, `lg` h-11; focus ring brand;
  loading spinner คงตำแหน่ง; copied state ใช้ `success-ink`
- **Dependencies**: 1.1
- **Acceptance Criteria**: ทุก variant มี hover/focus-visible/active/disabled/loading; contrast ขาวบน brand ผ่าน AA
- **Validation**: เปรียบเทียบทุก variant ในหน้าใดหน้าหนึ่ง; Tab focus

#### Task 2.2 — Rename tones: `Badge` + `statusTone`
- **Location**: `components/ui/badge.tsx` + ทุก call site
- **Description**: เปลี่ยน `BadgeTone` เป็น `success | warning | danger | neutral | brand | info`;
  `statusTone()` คง mapping เดิมแต่คืนชื่อใหม่; อัปเดตทุก `tone=` ด้วย `rg`
- **Dependencies**: 1.1
- **Acceptance Criteria**: `rg 'tone="(emerald|amber|rose|slate|indigo|sky)"'` = 0;
  UNVERIFIED ยังเป็น warning และไม่ถูกแสดงเป็น PAID; EXPIRED/CANCELLED แยกชัด
- **Validation**: ตรวจหน้า payments/businesses/subscription; `pnpm build` ให้ type ผ่าน

#### Task 2.3 — Surface primitives: `Card`, `PageHeader`, `EmptyState`, `Skeleton`, `ChartCard`
- **Location**: `components/ui/card.tsx`, `page-header.tsx`, `empty-state.tsx`, `skeleton.tsx`, `components/charts/chart-card.tsx`
- **Description**: ใช้ `surface`, `line`, `shadow-card`, `rounded-panel`; PageHeader eyebrow brand + accent gradient บาง;
  EmptyState icon tile brand-soft; typography ตาม scale ใหม่
- **Dependencies**: 1.1
- **Acceptance Criteria**: ไม่มี hard-code slate/emerald ในไฟล์เหล่านี้; heading order ถูก
- **Validation**: visual check + grep

#### Task 2.4 — Forms & overlays: `form.tsx`, `modal.tsx`, `toast.tsx`, `progress.tsx`, `pagination.tsx`, `segmented-control.tsx`, `confirm-dialog.tsx`
- **Location**: ตามรายชื่อ
- **Description**: focus/error/disabled ตาม §5.2; `FormField` ใช้ `useId` และ clone child
  เพื่อ inject `id`, `aria-invalid`, `aria-describedby`; Toast ใช้ semantic tones;
  Progress tonal ใหม่; Modal/Drawer พื้นผิวใหม่
- **Dependencies**: 1.1, 2.2
- **Acceptance Criteria**:
  - error message มี `id` และ input อ้างถึงด้วย `aria-describedby`
  - ทุกช่องมี label มองเห็น (ไม่พึ่ง placeholder)
  - modal ปิดด้วย Escape, focus กลับไปจุดเดิม
- **Validation**: Tab/Shift+Tab, screen-reader name ผ่าน DevTools, ทดสอบ error state

#### Task 2.5 — Table primitives (ใหม่)
- **Location**: `components/ui/table.tsx`
- **Description**: `TableShell` (overflow-x-auto + `role`/aria), `Table`, `Th`, `Td`,
  numeric cell alignment + tabular-nums, row hover `surface-subtle`
- **Dependencies**: 1.1
- **Acceptance Criteria**: ใช้งานกับตารางอย่างน้อย 1 หน้า; ไม่มี horizontal overflow ของหน้า
- **Validation**: 375px viewport

---

### Sprint 3 — App Shell & Auth Surfaces

**Goal**: เปลือกแอปและ flow login เป็น APay brand ใหม่ทั้งหมด
**Demo/Validation**: login → dashboard → สลับหน้า; sidebar/header/mobile drawer ใช้งานได้

#### Task 3.1 — `AppShell` redesign
- **Location**: `components/layout/app-shell.tsx`
- **Description**: light sidebar, active indicator brand, header ใหม่, mobile drawer + dialog semantics,
  skip link, กล่องสถานะ API ด้านล่าง, profile popover, ปุ่ม logout โทน danger,
  `max-w-[1440px]`; ปรับ label ขนาดไม่ต่ำกว่า 11px
- **Dependencies**: Sprint 1, 2
- **Acceptance Criteria**: active route ชัดด้วยสี+indicator (ไม่ใช้สีอย่างเดียว);
  keyboard เปิด/ปิด mobile menu ได้; ไม่มี emerald
- **Validation**: 375/768/1024/1440, Tab order, Escape

#### Task 3.2 — `BusinessSwitcher` + `HealthIndicator`
- **Location**: `components/layout/business-switcher.tsx`, `health-indicator.tsx`
- **Description**: เปลี่ยน emerald → brand/semantic; health online ยังใช้ success (ถูกต้อง);
  input/search focus brand; popover surface token; ขนาดตัวอักษรขั้นต่ำ 11–12px
- **Dependencies**: 1.1, 2.2, 2.4
- **Acceptance Criteria**: selected business ใช้ `brand-soft`; สถานะ online/offline ใช้ semantic
- **Validation**: admin mode: ค้นหา/เลือก/ล้างธุรกิจ

#### Task 3.3 — Login page
- **Location**: `app/login/page.tsx`
- **Description**: split layout ใหม่ตาม §5.3, ambient gradient lavender/cyan, logo บนการ์ดขาว,
  gradient headline เฉพาะ phrase, ฟีเจอร์ 3 ใบใช้ brand-soft icon, ฟอร์มใช้ Input/FormField,
  error block ใช้ danger, trust note ใช้ info/brand
- **Dependencies**: Sprint 1, 2
- **Acceptance Criteria**: ไม่มีเขียว; contrast ผ่าน; responsive mobile แสดงฟอร์มก่อน;
  error state ของ username/password ชัดและผูกกับ input
- **Validation**: 375/1440 + login สำเร็จ/ล้มเหลว

#### Task 3.4 — Auth/error surfaces
- **Location**: `components/auth/require-auth.tsx`, `app/error.tsx`, `app/not-found.tsx`, `app/page.tsx`
- **Description**: `FullPageLoader` ใช้ brand, AccessDenied danger, error page danger,
  not-found brand, พื้นหลัง canvas
- **Dependencies**: Sprint 1, 2
- **Acceptance Criteria**: visually consistent กับ shell; ไม่มี emerald/slate hard-code
- **Validation**: จำลอง 404, error (throw), session หมดอายุ

---

### Sprint 4 — Merchant Pages

**Goal**: 4 หน้าหลักของ merchant ใช้ระบบใหม่ครบ รวม loading/empty/error
**Demo/Validation**: merchant flow: dashboard → API keys → subscription → payments

#### Task 4.1 — Dashboard page
- **Location**: `app/(portal)/dashboard/page.tsx`, `components/dashboard/kpi-card.tsx`
- **Description**: KPI icon tile แบบ neutral/brand (ไม่ไล่สีรุ้ง), semantic tone เฉพาะความหมาย,
  subscription pill/status links ใช้ brand, status donut ใช้สี semantic, selects ใช้ token,
  empty state, ปรับ typography metadata, `aria-label` ของกราฟ
- **Dependencies**: Sprint 1–3, Task 6.1 (charts) ถ้าทำพร้อมกัน
- **Acceptance Criteria**: KPI อ่านง่าย, ตัวเลข tabular, status ถูกต้อง, responsive 1/2/4 คอลัมน์
- **Validation**: date range เปลี่ยน, โหลด/error/empty, 375/768/1440

#### Task 4.2 — API Keys page
- **Location**: `app/(portal)/api-keys/page.tsx`, `components/api-keys/key-modals.tsx`, `key-usage-drawer.tsx`
- **Description**: ตาราง/การ์ดใช้ token, ปุ่ม create/revoke ใช้ brand/danger,
  secret reveal ใช้ code token + คัดลอก, drawer/popover surface ใหม่, badge semantic
- **Dependencies**: Sprint 1–2, Task 2.5
- **Acceptance Criteria**: secret แสดงครั้งเดียวชัดเจน, destructive confirm ใช้ danger,
  ไม่มี key จริงใน UI ตัวอย่าง, mobile ใช้งานได้
- **Validation**: create → copy → revoke; 375px

#### Task 4.3 — Subscription page
- **Location**: `app/(portal)/subscription/page.tsx`, `components/dashboard/subscription-banner.tsx`
- **Description**: banner ใช้ brand gradient บาง ๆ แทนเขียว (problematic = danger),
  quota progress semantic, ตาราง/การ์ดแพ็กเกจ, daily burn-down chart, CTA brand
- **Dependencies**: Sprint 1–2, 6.1
- **Acceptance Criteria**: PAST_DUE/CANCELLED แสดง danger ชัด, quota ปกติเป็น brand/success
  ตามความหมาย, ไม่ตีความเกินจริง
- **Validation**: สถานะ ACTIVE/PAST_DUE/CANCELLED, 375/1440

#### Task 4.4 — Payments (PromptPay Playground) page
- **Location**: `app/(portal)/payments/page.tsx`
- **Description**: จัดกลุ่ม layout ใหม่ (control panel + QR preview + log), ใช้ brand actions,
  bank picker selected = brand, raw API key mode, code/log surfaces, status timeline semantic
- **Dependencies**: Sprint 1–2, Task 5.1–5.2
- **Acceptance Criteria**: QR อยู่บนพื้นขาวล้วน ไม่มี gradient ทับ, amount/currency ชัด,
  UNVERIFIED ไม่ถูกแสดงเป็น PAID, responsive stack
- **Validation**: สร้าง QR, ผูก LINE, ตรวจสถานะ, 375/1440

---

### Sprint 5 — Payment Domain Components & QR

**Goal**: QR/payment components ถูกต้องตาม brand + product truth
**Demo/Validation**: QR playground และ LINE linking ใช้งานครบ

#### Task 5.1 — `PromptPaySlip`
- **Location**: `components/payments/promptpay-slip.tsx`
- **Description**: wrapper เป็น white/neutral, scan line brand, success state ใช้ semantic success,
  quiet zone ≥ 16px รอบ QR, amount/total/decimal reference แยกชั้นข้อมูล,
  expiry/next-step ชัด, `aria-label` ของ QR
- **Dependencies**: 1.1, 2.2
- **Acceptance Criteria**: QR contrast สูง, ไม่มีข้อความ/แอนิเมชันทับ QR,
  สถานะบนสลิปตรงกับ API, ไม่มี "PAID" ก่อนยืนยัน
- **Validation**: สแกนด้วยแอปธนาคาร (manual), ตรวจสถานะ UNVERIFIED/PAID

#### Task 5.2 — `BankPicker` + `LineLinkModal`
- **Location**: `components/payments/bank-picker.tsx`, `line-link-modal.tsx`
- **Description**: selected = brand, success = semantic success, KBank brand accent เก็บเฉพาะ logo/badge
  ของธนาคาร (ไม่ใช้เป็นธีมหลัก), modal surface ใหม่
- **Dependencies**: 1.1, 2.4
- **Acceptance Criteria**: เลือกธนาคารชัด, สถานะผูก LINE ถูกต้อง, ไม่ใช้เขียวเป็นแบรนด์
- **Validation**: ผูกใหม่/ผูกแล้ว/ผิดพลาด

#### Task 5.3 — API key modals & usage drawer
- **Location**: `components/api-keys/key-modals.tsx`, `key-usage-drawer.tsx` (รวมใน 4.2 ได้)
- **Description**: code surface token, semantic badges, drawer headers
- **Dependencies**: 1.1, 2.4
- **Acceptance Criteria**: อ่าน secret ได้ชัด, copy feedback ใช้ success
- **Validation**: reveal/copy/acknowledge

---

### Sprint 6 — Admin Console & Data Visualization

**Goal**: admin ทุกหน้าและกราฟใช้ palette ใหม่
**Demo/Validation**: admin flow: overview → businesses → packages → webhook simulator

#### Task 6.1 — Chart palette & primitives
- **Location**: `components/charts/dashboard-charts.tsx`, `lib/chart-colors.ts` (ใหม่)
- **Description**: centralize hex palette (recharts ต้องใช้ hex), update tooltip/grid/axis/
  legend/empty state, semantic status colors, `role="img"` + `aria-label`, ฟอนต์ axis ≥ 10px
- **Dependencies**: 1.1
- **Acceptance Criteria**: ไม่มี `#059669` เป็นสีแรกของ series ทั่วไป; status chart ใช้ semantic;
  tooltip อ่านง่ายบนพื้นขาว
- **Validation**: dashboard ทุกกราฟ, 375/1440

#### Task 6.2 — Admin dashboard
- **Location**: `app/(portal)/admin/dashboard/page.tsx`
- **Description**: token ทั่วหน้า, KPI tones, platform status, activity/table, charts, empty states
- **Dependencies**: Sprint 1–3, 6.1
- **Acceptance Criteria**: consistent กับ merchant dashboard, ตัวเลข tabular, responsive
- **Validation**: ช่วงวันที่, loading/error/empty

#### Task 6.3 — Admin businesses
- **Location**: `app/(portal)/admin/businesses/page.tsx`, `components/admin/assign-package-modal.tsx`, `renew-subscription-modal.tsx`, `register-business-modal.tsx`
- **Description**: table primitives, statuses semantic, actions brand/danger, modals ใหม่,
  ฟอร์มพร้อม error/disabled/loading
- **Dependencies**: Sprint 1–2, 6.1
- **Acceptance Criteria**: ตารางอ่านง่ายบน mobile (scroll หรือ card), destructive confirm ชัด,
  subscription statuses ถูกต้อง
- **Validation**: assign/renew/register, 375px

#### Task 6.4 — Admin packages
- **Location**: `app/(portal)/admin/packages/page.tsx`, `components/admin/package-form-modal.tsx`
- **Description**: การ์ด/ตารางแพ็กเกจ, ราคา/โควต้า tabular, active/inactive badge, form modal
- **Dependencies**: Sprint 1–2
- **Acceptance Criteria**: ราคา/โควต้าอ่านง่าย, soft delete ใช้ danger confirm
- **Validation**: create/edit/soft delete

#### Task 6.5 — Webhook simulator
- **Location**: `app/(portal)/admin/webhook-simulator/page.tsx`
- **Description**: form + payload/JSON preview บน code surface, method badges,
  result/status semantics, ปุ่ม run/clear, responsive
- **Dependencies**: Sprint 1–2
- **Acceptance Criteria**: JSON อ่านง่าย, copy ได้, result ชัด (success/warning/danger),
  ไม่มี secret ในตัวอย่าง
- **Validation**: ยิง event แต่ละแบบ, 375/1440

---

### Sprint 7 — QA, Accessibility & Cleanup

**Goal**: ปิดช่องว่างทั้งหมดและพิสูจน์ว่าผ่าน checklist
**Demo/Validation**: รัน `pnpm lint`, `pnpm build`, manual matrix

#### Task 7.1 — Color/refactor gate
- **Description**: ลบ `emerald|indigo|sky|rose|amber` ที่เหลือใน `app/` และ `components/`
  (ยกเว้น hex ของ chart ที่ย้ายไป `lib/chart-colors.ts` แล้ว), ตรวจไม่มี hard-code brand hex ใน component
- **Acceptance Criteria**:
  - `rg -n "emerald|indigo-|sky-|rose-|amber-" app components` → 0
  - `rg -n "#6554[fF]0|#059669|#0b1220" app components` → เฉพาะไฟล์ token/chart-colors
- **Validation**: คำสั่งข้างต้น

#### Task 7.2 — Responsive audit
- **Description**: ตรวจทุกหน้า 375 / 768 / 1024 / 1440 / 1920; แก้ overflow, ตาราง, ปุ่ม,
  sidebar, modal/drawer, charts
- **Acceptance Criteria**: ไม่มี horizontal page scroll, primary action มองเห็น, touch target ≥ 44px
- **Validation**: DevTools device toolbar + manual

#### Task 7.3 — Accessibility audit
- **Description**: Tab order ทุกหน้า, focus visible, label/aria ของ icon-only buttons,
  `aria-describedby` ของ form errors, dialog semantics, heading order, contrast,
  status ไม่สื่อด้วยสีเดียว, chart summary
- **Acceptance Criteria**: keyboard ใช้งานได้ทั้ง flow; ไม่มี focus trap ที่หลุด;
  ข้อความปกติ contrast ≥ 4.5:1 (brand บนขาว ≈ 5.15:1 ผ่าน)
- **Validation**: keyboard-only run + DevTools accessibility tree

#### Task 7.4 — State audit
- **Description**: ตรวจ loading / skeleton / empty / error / disabled / hover / focus / success
  ของทุกหน้าและ modal
- **Acceptance Criteria**: ทุก state มี visual ที่ set ไว้และไม่ layout shift
- **Validation**: throttle network, จำลอง API error, empty dataset

#### Task 7.5 — Run validation & summary
- **Description**: รัน `pnpm lint`, `pnpm build`; สรุปไฟล์ที่เปลี่ยน, token ใหม่,
  ผล validation จริง, known gaps
- **Acceptance Criteria**: lint/build ผ่านจริง (รายงานตามจริง ไม่กล่าวอ้างเกิน)
- **Validation**: คำสั่งข้างต้น + เก็บ output

---

## 7. Page-by-Page Redesign Checklist

| หน้า | จุดสำคัญ |
|---|---|
| `/login` | hero gradient lavender→cyan, official logo, brand actions, error danger |
| `/dashboard` | subscription banner (brand), LINE card (semantic), KPI grid, status donut, charts |
| `/api-keys` | key table/cards, secret reveal (code surface), revoke danger |
| `/subscription` | package summary, quota progress, burn-down chart, period info |
| `/payments` | control panel + QR preview + logs, bank picker, LINE link, status timeline |
| `/admin/dashboard` | platform KPIs, activity, GMV trend, subscriptions, empty states |
| `/admin/businesses` | merchant table, package assign/renew/register modals |
| `/admin/packages` | package cards/table, pricing, soft delete |
| `/admin/webhook-simulator` | form, JSON preview, result states |
| error/404/loader | consistent surfaces + brand iconography |

---

## 8. Testing Strategy

### 8.1 Commands (มีอยู่จริงในโปรเจกต์)

```bash
pnpm lint
pnpm build
pnpm dev
```

> หมายเหตุ: โปรเจกต์ยังไม่มี test runner (`package.json` ไม่มี script `test`)
> จึงไม่สามารถอ้างอิง unit/e2e test ได้ — validation หลักคือ lint, build และ manual matrix

### 8.2 Manual matrix

| หัวข้อ | วิธีตรวจ |
|---|---|
| Visual | เปรียบเทียบทุกหน้ากับ token และ checklist §12 ของ Design System |
| Responsive | 375, 768, 1024, 1440, 1920 |
| Keyboard | Tab/Shift+Tab, Enter/Space, Escape (modal/drawer) |
| Screen reader | accessible name ของ icon-only buttons, form errors, dialog, table headers |
| Contrast | DevTools/axe; ข้อความปกติ ≥ 4.5:1 |
| States | loading, empty, error, disabled, hover, focus, success |
| Product truth | UNVERIFIED ≠ PAID, ไม่กล่าวอ้าง bank verification เกินจริง |
| Performance | logo/asset size, ไม่มี layout shift, animation ≤ 250ms |

### 8.3 Flows ที่ต้องรัน

1. Login (สำเร็จ / ล้มเหลว / session หมดอายุ)
2. Merchant: dashboard → เปลี่ยน date range → API key create/copy/revoke → subscription → payments (สร้าง QR + ผูก LINE)
3. Admin: dashboard → เลือกธุรกิจ → assign/renew package → packages create/edit/delete → webhook simulator
4. Error: 404, runtime error, API error notice + retry

---

## 9. Risks & Gotchas

| ความเสี่ยง | ผลกระทบ | การบรรเทา |
|---|---|---|
| เพิ่ม MUI ตามคำแนะนำใน Design System | dependency ซ้ำ, rewrite ใหญ่, bundle โต | ✅ ยืนยันแล้ว: ไม่เพิ่ม ใช้ Tailwind tokens (D1) |
| Rename tone กระทบ 30+ ไฟล์ | type error จำนวนมาก | ทำใน Sprint 2 ก่อนหน้า pages, ใช้ `rg` + TypeScript errors เป็น checklist |
| โลโก้ PNG พื้นขาวบน sidebar มืด | โลโก้ดูเป็นกล่องขาว | ใช้ light sidebar (D2) หรือวางบนการ์ดขาว |
| ไฟล์โลโก้ใหญ่ (~1MB) | โหลดช้า/CLS | trim + resize เป็น derived assets, ใช้ `next/image` |
| Tailwind v4 `@theme inline` mapping ผิด | utility ไม่เกิด/สีไม่เปลี่ยน | ทดสอบ utility ตัวอย่างทันทีใน Task 1.1 |
| `ink-muted #718096` contrast 4.0:1 | ข้อความเล็กอ่านยาก | ใช้เฉพาะ decorative/large text; metadata ใช้ `ink-secondary` |
| Status 500-level สีบนพื้นอ่อน | contrast ไม่ผ่าน AA | ใช้ `*-ink` สำหรับ text, `*-soft` สำหรับพื้น |
| Charts hard-code hex | สีไม่ตรง token | รวมที่ `lib/chart-colors.ts` พร้อม comment ว่าอิง token |
| Page tables กว้างบนมือถือ | horizontal overflow | TableShell + scroll, หรือ row-to-card เฉพาะหน้าที่จำเป็น |
| Next 16 `cacheComponents` | การเพิ่ม client component ผิดที่อาจ error | งานนี้เป็น UI-only, ไม่แตะ data fetching/route config |
| `AGENTS.md` บังคับอ่าน Next docs | ใช้ API เก่า | อ่าน `node_modules/next/dist/docs/` ก่อนใช้ `next/image`/metadata icon |
| Design doc เป็นค่าประมาณจาก screenshot | สีอาจไม่ตรง landing จริง | ใช้ค่าจากไฟล์เป็น canonical ตาม §11.4/§2 "When source values are verified" |
| ไม่มี test runner | regression มองไม่เห็น | เพิ่ม manual checklist + grep gates; พิจารณาเพิ่ม Playwright ในอนาคต (นอก scope) |

---

## 10. Rollback Plan

- ทำงานบน branch แยก (`feat/apay-design-system`) และ commit ต่อ sprint
- การเปลี่ยนเป็นแบบ visual-only ไม่แตะ API/data → revert commit หรือทั้ง branch ได้ทันที
- Token ใหม่เป็น additive: หากต้อง rollback บางหน้า สามารถคง `globals.css` ใหม่ไว้
  และ revert เฉพาะไฟล์หน้าได้
- ไม่มี migration ฐานข้อมูล/environment variable ที่ต้องย้อน

---

## 11. Out of Scope

- เปลี่ยน business logic, API contract, auth/JWT flow, data fetching
- เพิ่ม dependency ใหม่ (รวม MUI) เว้นแต่ได้รับการยืนยัน
- Dark mode / theme switcher
- เปลี่ยนข้อความ copy หรือโครงข้อมูล
- เพิ่ม test framework / CI pipeline (แนะนำเป็นงานถัดไป)
- ปรับ landing page (`apay-landing-page`) — งานนี้เฉพาะ backoffice

---

## 12. Definition of Done

- [ ] ทุกสีแบรนด์/สถานะมาจาก token ใน `app/globals.css`
- [ ] ไม่มี `emerald` เป็นสีแบรนด์เหลือใน `app/` และ `components/`
- [ ] Official logo ใช้ทั้งแอป โดยไม่บิด/ไม่ recolor
- [ ] Sidebar/header/login/dashboard/admin ใช้ภาษา visual เดียวกัน
- [ ] Primitive ทุกตัวมี hover/focus-visible/disabled/loading (ตามที่เกี่ยวข้อง)
- [ ] ฟอร์มมี label + error ที่ผูกกับ input
- [ ] Dialog/drawer/mobile nav มี semantics และ Escape
- [ ] ตาราง/กราฟ/QR ใช้งานได้ที่ 375px โดยไม่ overflow
- [ ] สถานะ payment ยังถูกต้องตามความหมาย (UNVERIFIED ≠ PAID)
- [ ] `pnpm lint` และ `pnpm build` ผ่านจริง
- [ ] สรุปไฟล์ที่เปลี่ยน/token ใหม่/ข้อจำกัดที่เหลือ ส่งมอบพร้อมงาน

---

## 13. Confirmed Decisions

| # | เรื่อง | ข้อสรุป |
|---|---|---|
| 1 | **MUI vs Tailwind** | ✅ ยืนยัน: ใช้ Tailwind + semantic tokens ต่อ ไม่เพิ่ม MUI |
| 2 | **Sidebar** | ✅ ยืนยัน: light sidebar (white surface + brand active state) |
| 3 | **Tone API** | ใช้ semantic tones (`success/warning/danger/info/brand/neutral`) — เป็นข้อเสนอหลักของแผน |
| 4 | **การเริ่มงาน** | ✅ เริ่มimplementation แล้ว — Sprint 1–6 + QA หลัก (ดู §15) |

> แผนนี้ถูกนำไปใช้แล้ว บันทึกผลไว้ใน §15

---

## 14. Suggested Execution Order

```
Sprint 1 (tokens + assets + logo)
  └─ Sprint 2 (primitives + tones)
       ├─ Sprint 3 (shell + login + error)
       ├─ Sprint 6.1 (charts)  ← ควบกับ 3 ได้
       ├─ Sprint 4 (merchant pages)
       ├─ Sprint 5 (QR/payment components)
       └─ Sprint 6.2–6.5 (admin pages)
            └─ Sprint 7 (QA + a11y + build)
```

**ข้อเสนอแนะ**: ทำ Sprint 1–3 แล้วเปิด dev server ให้ตรวจ visual ก่อนลง pages
เพื่อลดความเสี่ยงที่ต้องแก้ token ซ้ำในไฟล์ใหญ่

---

## 15. Implementation Status (2026-10-25)

### เสร็จแล้ว

| Sprint | ผลลัพธ์ |
|---|---|
| 1 | Semantic tokens ใน `app/globals.css`; official logo assets ใน `public/brand/`; `app/icon.png`; `docs/design-tokens.md` |
| 2 | Button, Badge/tones, Card, PageHeader, FormField (aria wiring), Modal/Drawer, Toast, Progress, Pagination, SegmentedControl, EmptyState, Skeleton, CopyButton, ConfirmDialog, ChartCard, Table primitives |
| 3 | Light app shell + skip link + mobile dialog semantics; BusinessSwitcher; HealthIndicator; Login split layout; RequireAuth/error/not-found |
| 4 | Dashboard, API Keys, Subscription, Payments pages |
| 5 | PromptPay slip/QR, BankPicker, LineLinkModal, API key modals/drawer |
| 6 | Admin dashboard, businesses, packages, webhook simulator + charts palette |
| 7 | Token/color cleanup, responsive/a11y pass, lint + type-check + production build |

### ไฟล์สำคัญที่เพิ่ม

- `public/brand/apay-horizontal.png`, `apay-mark.png`, `apay-logo-square.png`
- `app/icon.png`
- `lib/chart-colors.ts`
- `components/ui/table.tsx`
- `docs/design-tokens.md`

### การเปลี่ยนแปลงนอกแผน (ตามคำขอ)

- Register New Business: ลบ `LINE Destination` และ `LINE User ID` ออกจากฟอร์ม/เพย์โหลด
  เพิ่มฟิลด์ `email` (required, validate รูปแบบ, max 255, lower-case ก่อนส่ง)
  และอัปเดต type/API docs ให้ตรงกับ backend

### Validation ที่รันจริง

- `npx tsc --noEmit` → ผ่าน
- `pnpm lint` → ผ่าน (0 error, 0 warning)
- `pnpm build` → ผ่าน (13 routes)
- Visual smoke test ด้วย Chrome headless: login, payments, admin businesses, admin webhook,
  register modal ที่ 1440px และ mobile 390px
- ตรวจ network payload ของ Register Business: ส่ง `email` และไม่มี LINE fields

### Known gaps

- Screenshot ของ dashboard/subscription ใช้ mock session และ API จริงไม่พร้อมใน environment
  จึงยืนยันได้เฉพาะ shell/empty/error states ไม่ได้ยืนยันกราฟด้วยข้อมูลจริง
- ยังไม่มี test runner ในโปรเจกต์ (validation เป็น lint/build/manual)
- `api-docs.html` อัปเดตเฉพาะ schema ของ register-business; endpoint อื่นไม่ถูกแตะ
