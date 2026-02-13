# RMF Analyzer Design System

A modern data analytics dashboard for z/OS RMF Workload Activity reports.

## Design Philosophy

- **Clarity First**: Data visualization prioritizes readability and insights
- **Professional Aesthetic**: Enterprise-grade appearance suitable for mainframe analytics
- **Responsive**: Works seamlessly on desktop and tablet devices
- **Accessible**: WCAG 2.1 AA compliant color contrasts and interactions

## Color Palette

### Primary Colors
- **Primary Blue**: `#0ea5e9` (Sky 500) - Main actions, charts
- **Primary Dark**: `#0284c7` (Sky 600) - Hover states
- **Primary Light**: `#e0f2fe` (Sky 100) - Backgrounds, badges

### Secondary Colors
- **Success**: `#10b981` (Emerald 500) - Success states, positive trends
- **Warning**: `#f59e0b` (Amber 500) - Warnings, alerts
- **Danger**: `#ef4444` (Red 500) - Errors, critical alerts
- **Info**: `#8b5cf6` (Violet 500) - Informational elements

### Neutral Colors
- **Background**: `#f8fafc` (Slate 50) - Page background
- **Surface**: `#ffffff` (White) - Cards, panels
- **Border**: `#e2e8f0` (Slate 200) - Borders, dividers
- **Text Primary**: `#1e293b` (Slate 800) - Headings, primary text
- **Text Secondary**: `#64748b` (Slate 500) - Labels, descriptions

### Chart Palette
```
#0ea5e9, #8b5cf6, #10b981, #f59e0b, #ef4444, 
#ec4899, #06b6d4, #84cc16, #f97316, #6366f1
```

## Typography

### Font Stack
```css
font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
```

### Type Scale
- **H1**: 2rem (32px), font-weight: 700, line-height: 1.2
- **H2**: 1.5rem (24px), font-weight: 600, line-height: 1.3
- **H3**: 1.25rem (20px), font-weight: 600, line-height: 1.4
- **Body**: 1rem (16px), font-weight: 400, line-height: 1.6
- **Small**: 0.875rem (14px), font-weight: 400, line-height: 1.5
- **Label**: 0.75rem (12px), font-weight: 500, line-height: 1.4, uppercase, letter-spacing: 0.05em

## Spacing System

- **xs**: 0.25rem (4px)
- **sm**: 0.5rem (8px)
- **md**: 1rem (16px)
- **lg**: 1.5rem (24px)
- **xl**: 2rem (32px)
- **2xl**: 3rem (48px)

## Components

### Cards
- Background: white
- Border-radius: 16px
- Box-shadow: 0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)
- Padding: 1.5rem
- Border: 1px solid #e2e8f0

### Buttons
- **Primary**: bg-sky-500, text-white, rounded-lg, px-4 py-2
- **Secondary**: bg-white, border border-slate-200, text-slate-700
- **Ghost**: transparent bg, text-slate-600, hover:bg-slate-100

### Form Inputs
- Border: 1px solid #e2e8f0
- Border-radius: 8px
- Padding: 0.625rem 0.875rem
- Focus: ring-2 ring-sky-500/20, border-sky-500

### Badges
- Border-radius: 9999px (pill shape)
- Padding: 0.25rem 0.75rem
- Font-size: 0.75rem
- Font-weight: 500

## Layout

### Grid System
- 12-column grid
- Gutter: 1.5rem (24px)
- Max-width: 1400px
- Padding: 1.5rem horizontal

### Dashboard Layout
```
┌─────────────────────────────────────────┐
│  Navbar (fixed, 64px height)            │
├─────────────────────────────────────────┤
│  ┌─────────────────────────────────┐    │
│  │  Stats Row (4 cards)            │    │
│  └─────────────────────────────────┘    │
│  ┌──────────┐  ┌──────────────────┐     │
│  │          │  │                  │     │
│  │ Filters  │  │  Chart           │     │
│  │ Panel    │  │                  │     │
│  │          │  └──────────────────┘     │
│  │          │  ┌──────────────────┐     │
│  │          │  │  Data Table      │     │
│  └──────────┘  └──────────────────┘     │
└─────────────────────────────────────────┘
```

## Chart Specifications

### Line Chart
- Smooth curves (tension: 0.4)
- Point radius: 4px (hover: 6px)
- Line width: 2px
- Grid: horizontal only, rgba(0,0,0,0.05)
- Y-axis: beginAtZero: true

### Data Table
- Header: bg-slate-50, font-weight: 600
- Row hover: bg-slate-50
- Border: 1px solid #e2e8f0
- Pagination: 25 items per page default

## Animations

### Transitions
- Default: 150ms ease
- Hover: 200ms ease
- Page transitions: 300ms ease

### Loading States
- Skeleton screens with pulse animation
- Spinner: 1s linear infinite rotation

## Responsive Breakpoints

- **Mobile**: < 640px (single column, stacked layout)
- **Tablet**: 640px - 1024px (2-column stats, sidebar becomes overlay)
- **Desktop**: > 1024px (full layout)

## Dark Mode (Future)

- Background: #0f172a (Slate 900)
- Surface: #1e293b (Slate 800)
- Text: #f1f5f9 (Slate 100)
- Borders: #334155 (Slate 700)
