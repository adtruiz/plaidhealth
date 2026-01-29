# VerziHealth Design System

## Brand Identity
VerziHealth is the "VerziHealth" - a B2B API platform for accessing patient health records. The design should convey trust, security, and modern technology.

## Color Palette

### Primary Colors
- **Teal 600** (Primary): `#0D9488` - Main brand color, CTAs, links
- **Teal 700** (Primary Dark): `#0F766E` - Hover states, emphasis
- **Teal 500** (Primary Light): `#14B8A6` - Secondary buttons, accents

### Secondary Colors
- **Sky 50**: `#F0F9FF` - Light backgrounds, cards
- **Sky 100**: `#E0F2FE` - Section backgrounds
- **Sky 200**: `#BAE6FD` - Borders, dividers

### Accent Colors
- **Mint 400**: `#34D399` - Success states, positive indicators
- **Mint 300**: `#6EE7B7` - Highlights, gradients

### Neutral Colors
- **Slate 900**: `#0F172A` - Primary text
- **Slate 700**: `#334155` - Secondary text
- **Slate 500**: `#64748B` - Muted text, placeholders
- **Slate 200**: `#E2E8F0` - Borders
- **Slate 50**: `#F8FAFC` - Page backgrounds

### Semantic Colors
- **Error**: `#EF4444` (Red 500)
- **Warning**: `#F59E0B` (Amber 500)
- **Success**: `#10B981` (Emerald 500)
- **Info**: `#3B82F6` (Blue 500)

## Gradients

### Hero Gradient (Marketing)
```css
background: linear-gradient(180deg, #F0F9FF 0%, #E0F2FE 50%, #F0FDFA 100%);
```

### Card Accent Gradient
```css
background: linear-gradient(135deg, #0D9488 0%, #14B8A6 50%, #34D399 100%);
```

### Text Gradient (Headlines)
```css
background: linear-gradient(90deg, #0D9488 0%, #0F766E 100%);
-webkit-background-clip: text;
-webkit-text-fill-color: transparent;
```

## Typography

### Font Family
- **Headings**: `Inter, -apple-system, BlinkMacSystemFont, sans-serif`
- **Body**: `Inter, -apple-system, BlinkMacSystemFont, sans-serif`
- **Code**: `JetBrains Mono, Menlo, Monaco, monospace`

### Font Sizes (Tailwind scale)
- **Display**: `text-6xl` (60px) - Hero headlines
- **H1**: `text-5xl` (48px) - Page titles
- **H2**: `text-4xl` (36px) - Section titles
- **H3**: `text-2xl` (24px) - Card titles
- **H4**: `text-xl` (20px) - Subsections
- **Body**: `text-base` (16px) - Paragraphs
- **Small**: `text-sm` (14px) - Captions, labels

### Font Weights
- **Bold**: `font-bold` (700) - Headlines
- **Semibold**: `font-semibold` (600) - Subheadings, buttons
- **Medium**: `font-medium` (500) - Labels, nav items
- **Regular**: `font-normal` (400) - Body text

### Letter Spacing
- Headlines: `tracking-tight` (-0.025em)
- Body: `tracking-normal` (0)

## Spacing

Use Tailwind's spacing scale consistently:
- **Section padding**: `py-24` (96px) vertical
- **Container max-width**: `max-w-7xl` (1280px)
- **Card padding**: `p-6` or `p-8`
- **Stack spacing**: `space-y-4` or `space-y-6`
- **Grid gaps**: `gap-6` or `gap-8`

## Border Radius

- **Small** (inputs, small buttons): `rounded-lg` (8px)
- **Medium** (cards, modals): `rounded-xl` (12px)
- **Large** (hero cards, feature cards): `rounded-2xl` (16px)
- **Full** (pills, avatars): `rounded-full`

## Shadows

- **Small**: `shadow-sm` - Inputs, small elements
- **Medium**: `shadow-md` - Cards, dropdowns
- **Large**: `shadow-lg` - Modals, popovers
- **Glow**: `shadow-[0_0_40px_rgba(13,148,136,0.15)]` - Featured elements

## Components

### Buttons

**Primary Button**
```jsx
<button className="bg-teal-600 hover:bg-teal-700 text-white font-semibold px-6 py-3 rounded-lg transition-colors">
  Get Started
</button>
```

**Secondary Button**
```jsx
<button className="bg-white hover:bg-slate-50 text-teal-600 font-semibold px-6 py-3 rounded-lg border border-slate-200 transition-colors">
  Learn More
</button>
```

**Ghost Button**
```jsx
<button className="text-teal-600 hover:text-teal-700 font-medium px-4 py-2 transition-colors">
  View Docs →
</button>
```

### Cards

**Feature Card**
```jsx
<div className="bg-white rounded-2xl p-8 shadow-md hover:shadow-lg transition-shadow">
  <div className="w-12 h-12 bg-teal-100 rounded-xl flex items-center justify-center mb-4">
    {/* Icon */}
  </div>
  <h3 className="text-xl font-semibold text-slate-900 mb-2">Feature Title</h3>
  <p className="text-slate-600">Feature description goes here.</p>
</div>
```

**Pricing Card**
```jsx
<div className="bg-white rounded-2xl p-8 border border-slate-200 hover:border-teal-200 transition-colors">
  {/* Content */}
</div>
```

### Navigation

- Sticky header with white/blur background
- Logo on left, nav links center, CTA right
- Mobile: hamburger menu with slide-out drawer

## Iconography

Use **Lucide React** icons consistently:
- Stroke width: 2px (default)
- Size: 20-24px for UI, 32-48px for feature icons
- Color: Match text color or teal-600 for accents

## Animation

- **Transitions**: `transition-all duration-200` or `duration-300`
- **Hover transforms**: `hover:scale-[1.02]` for cards
- **Page transitions**: Subtle fade-in with Framer Motion
- **Scroll animations**: Fade up on scroll for sections

## Data Type Colors (for product cards/icons)

Use these to differentiate data sources:
- **EMR/EHR**: Teal (`bg-teal-100 text-teal-600`)
- **Payer/Insurance**: Blue (`bg-blue-100 text-blue-600`)
- **Labs**: Mint/Green (`bg-emerald-100 text-emerald-600`)
- **Claims**: Purple (`bg-violet-100 text-violet-600`)

## Code Samples

Use syntax highlighting with colors that complement the palette:
- Background: `bg-slate-900`
- Text: Standard syntax theme (e.g., One Dark or similar)
- Border radius: `rounded-xl`

---

## Marketing Site Specific

### Hero Section
- Full-width gradient background
- Large headline with gradient text effect
- Subheadline in slate-600
- Two CTAs: Primary (teal) + Secondary (white/outline)
- Right side: Product illustration or code sample mockup

### Social Proof
- Logo cloud of healthcare companies
- Grayscale logos, hover to color
- "Trusted by X healthcare companies"

### Feature Grid
- 3-column grid on desktop
- Icon + title + description cards
- Subtle hover animation

### Pricing
- 3-tier layout (Startup, Growth, Enterprise)
- Highlight recommended tier with teal border/badge
- Feature comparison checklist

---

## Developer Portal Specific

### Dashboard Layout
- Left sidebar navigation (collapsible)
- Top header with user menu
- Main content area with cards/tables

### Sidebar
- Dark slate background (`bg-slate-900`)
- Teal accent for active state
- Icon + label for nav items

### Data Tables
- Zebra striping with slate-50
- Hover state: teal-50 background
- Pagination at bottom

### API Key Display
- Monospace font
- Copy button
- Masked by default with reveal toggle

### Charts/Analytics
- Use teal as primary chart color
- Slate for secondary/comparison
- Mint for positive trends
