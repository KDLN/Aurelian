# Aurelian Design System

> Unified design system for The Exchange. Mobile-first, WCAG 2.1 AA compliant, retro gaming aesthetic.

## 🎯 Goals

- **Single source of truth** for all design tokens across the entire site
- **Mobile-first** responsive design (375px to 1920px+)
- **WCAG 2.1 AA compliant** (44px touch targets, 14px+ mobile fonts)
- **Zero inline styles** - everything class-based
- **Consistent** - one button system, one card system, one spacing scale
- **Performance** - CSS-only responsive, no JS breakpoints

## 📂 File Structure

```
apps/web/src/lib/design/
├── tokens.css       - Design tokens (colors, typography, spacing)
├── components.css   - Component styles (buttons, cards, forms)
├── utilities.css    - Utility classes (layout, spacing, display)
└── README.md        - This file
```

## 🎨 Design Tokens

All design tokens use CSS custom properties with the `--ds-` prefix.

### Colors

**Base Colors:**
- `--ds-bg` - Primary background (#231913 - deep brown)
- `--ds-bg-panel` - Panel/card background (#32241d - medium brown)
- `--ds-text` - Primary text (#f1e5c8 - cream)
- `--ds-text-muted` - Secondary text (#c7b38a - tan)

**Semantic Colors:**
- `--ds-good` - Success (#7bc081 - green)
- `--ds-warn` - Warning (#b7b34d - yellow-gold)
- `--ds-bad` - Danger (#d66a5b - red-orange)
- `--ds-gold` - Accent (#d4af37 - gold)

### Typography

**Font Family:**
- `--ds-font-mono` - Monospace (ui-monospace, Menlo, Consolas)

**Font Sizes (8 levels):**
- `--ds-font-xs` - 12px (timestamps, metadata)
- `--ds-font-sm` - 14px (labels, descriptions)
- `--ds-font-base` - 16px (body text - default)
- `--ds-font-lg` - 18px (large body, small headings)
- `--ds-font-xl` - 20px (medium headings)
- `--ds-font-2xl` - 24px (large headings)
- `--ds-font-3xl` - 32px (main headings)
- `--ds-font-4xl` - 40px (hero headings)

### Spacing (4px increments)

- `--ds-space-0` - 0px
- `--ds-space-xs` - 4px
- `--ds-space-sm` - 8px
- `--ds-space-md` - 12px
- `--ds-space-lg` - 16px
- `--ds-space-xl` - 24px
- `--ds-space-2xl` - 32px
- `--ds-space-3xl` - 48px
- `--ds-space-4xl` - 64px

### Touch Targets (WCAG AAA)

- `--ds-touch-sm` - 40px (minimum)
- `--ds-touch-md` - 44px (recommended)
- `--ds-touch-lg` - 48px (comfortable)

### Breakpoints (Mobile-First)

```css
/* Default: Mobile (< 640px) */
@media (min-width: 640px)  { /* Tablet portrait */ }
@media (min-width: 768px)  { /* Tablet landscape */ }
@media (min-width: 1024px) { /* Desktop */ }
@media (min-width: 1440px) { /* Large desktop */ }
```

## 🧩 Components

All components use the `.ds-` class prefix.

### Buttons

```html
<!-- Variants -->
<button class="ds-btn">Default</button>
<button class="ds-btn ds-btn--primary">Primary</button>
<button class="ds-btn ds-btn--secondary">Secondary</button>
<button class="ds-btn ds-btn--danger">Danger</button>
<button class="ds-btn ds-btn--warning">Warning</button>
<button class="ds-btn ds-btn--ghost">Ghost</button>
<button class="ds-btn ds-btn--link">Link</button>

<!-- Sizes -->
<button class="ds-btn ds-btn--sm">Small (40px)</button>
<button class="ds-btn">Medium (44px - default)</button>
<button class="ds-btn ds-btn--lg">Large (48px)</button>
```

### Cards

```html
<!-- Variants -->
<div class="ds-card">Default card</div>
<div class="ds-card ds-card--nested">Nested card</div>
<div class="ds-card ds-card--elevated">Elevated card</div>
<div class="ds-card ds-card--panel">Panel card</div>

<!-- Sizes -->
<div class="ds-card ds-card--sm">Small padding</div>
<div class="ds-card">Default padding</div>
<div class="ds-card ds-card--lg">Large padding</div>

<!-- With header -->
<div class="ds-card">
  <div class="ds-card__header">
    <h3 class="ds-card__title">Title</h3>
    <button class="ds-btn ds-btn--sm">Action</button>
  </div>
  <div class="ds-card__body">Content</div>
</div>
```

### Forms

```html
<!-- Input -->
<div class="ds-form-group">
  <label class="ds-label">Label</label>
  <input type="text" class="ds-input" placeholder="Placeholder..." />
  <div class="ds-form-hint">Hint text</div>
</div>

<!-- Select -->
<div class="ds-form-group">
  <label class="ds-label">Select</label>
  <select class="ds-select">
    <option>Option 1</option>
  </select>
</div>

<!-- Textarea -->
<div class="ds-form-group">
  <label class="ds-label">Textarea</label>
  <textarea class="ds-textarea" rows="3"></textarea>
</div>

<!-- Checkbox -->
<label class="ds-flex ds-items-center ds-gap-sm ds-cursor-pointer">
  <input type="checkbox" class="ds-checkbox" />
  <span class="ds-text-sm">Checkbox label</span>
</label>

<!-- Radio -->
<label class="ds-flex ds-items-center ds-gap-sm ds-cursor-pointer">
  <input type="radio" name="group" class="ds-radio" />
  <span class="ds-text-sm">Radio label</span>
</label>
```

### Pills & Badges

```html
<span class="ds-pill ds-pill--neutral">Neutral</span>
<span class="ds-pill ds-pill--good">Success</span>
<span class="ds-pill ds-pill--warn">Warning</span>
<span class="ds-pill ds-pill--bad">Danger</span>
<span class="ds-pill ds-pill--accent">Accent</span>
```

### Progress Bars

```html
<div class="ds-progress-group">
  <div class="ds-progress-label">
    <span>Progress</span>
    <span class="ds-text-bold">75%</span>
  </div>
  <div class="ds-progress">
    <div class="ds-progress__fill" style="width: 75%"></div>
  </div>
</div>

<!-- Variants -->
<div class="ds-progress">
  <div class="ds-progress__fill" style="width: 50%"></div>
</div>
<div class="ds-progress">
  <div class="ds-progress__fill ds-progress__fill--warn" style="width: 50%"></div>
</div>
<div class="ds-progress">
  <div class="ds-progress__fill ds-progress__fill--bad" style="width: 50%"></div>
</div>
```

## 🔧 Utility Classes

### Layout

```html
<!-- Display -->
<div class="ds-flex">Flexbox</div>
<div class="ds-grid">Grid</div>
<div class="ds-block">Block</div>
<div class="ds-hidden">Hidden</div>

<!-- Flex -->
<div class="ds-flex ds-flex-col ds-items-center ds-justify-between ds-gap-md">
  Flex container
</div>

<!-- Grid -->
<div class="ds-grid-2">2-column grid</div>
<div class="ds-grid-3">3-column grid</div>
<div class="ds-grid-4">4-column grid</div>
<div class="ds-grid-auto">Auto-fit grid (min 220px)</div>

<!-- Gap -->
<div class="ds-flex ds-gap-xs">4px gap</div>
<div class="ds-flex ds-gap-sm">8px gap</div>
<div class="ds-flex ds-gap-md">12px gap</div>
<div class="ds-flex ds-gap-lg">16px gap</div>
```

### Spacing

```html
<!-- Padding -->
<div class="ds-p-md">Padding all sides</div>
<div class="ds-px-lg">Padding horizontal</div>
<div class="ds-py-sm">Padding vertical</div>
<div class="ds-pt-xl">Padding top</div>

<!-- Margin -->
<div class="ds-m-md">Margin all sides</div>
<div class="ds-mx-auto">Margin horizontal auto (center)</div>
<div class="ds-my-lg">Margin vertical</div>
<div class="ds-mb-xl">Margin bottom</div>
```

### Layout Patterns

```html
<!-- Stack (vertical spacing) -->
<div class="ds-stack ds-stack--md">
  <div>Item 1</div>
  <div>Item 2</div>
</div>

<!-- Split (space between) -->
<div class="ds-split">
  <span>Left</span>
  <span>Right</span>
</div>

<!-- Cluster (horizontal wrap) -->
<div class="ds-cluster ds-cluster--sm">
  <span>Tag 1</span>
  <span>Tag 2</span>
</div>

<!-- Center -->
<div class="ds-center">Centered content</div>

<!-- Container -->
<div class="ds-container">Max-width container with padding</div>
```

### Typography

```html
<!-- Colors -->
<span class="ds-text-muted">Muted text</span>
<span class="ds-text-good">Success text</span>
<span class="ds-text-warn">Warning text</span>
<span class="ds-text-bad">Danger text</span>
<span class="ds-text-gold">Gold text</span>

<!-- Sizes -->
<span class="ds-text-xs">Extra small</span>
<span class="ds-text-sm">Small</span>
<span class="ds-text-base">Base</span>
<span class="ds-text-lg">Large</span>

<!-- Weights -->
<span class="ds-text-bold">Bold</span>
<span class="ds-text-medium">Medium</span>

<!-- Transform -->
<span class="ds-text-uppercase">Uppercase with tracking</span>
```

### Responsive

```html
<!-- Show/hide based on screen size -->
<div class="ds-hide-mobile">Hidden on mobile</div>
<div class="ds-show-mobile">Visible only on mobile</div>
<div class="ds-hide-tablet">Hidden on tablet</div>
<div class="ds-hide-desktop">Hidden on desktop</div>
```

## 📱 Mobile-First Approach

All styles are designed mobile-first. This means:

1. **Base styles** apply to mobile (< 640px)
2. **Media queries use min-width** to enhance for larger screens
3. **Grids collapse** to single column on mobile automatically
4. **Touch targets** are 44px minimum (WCAG AAA)
5. **Font sizes** are 14px+ on mobile for readability

### Responsive Grid Example

```css
/* Automatically responsive - no media queries needed! */
.ds-grid-2 /* 2 columns on desktop, 1 column on mobile */
.ds-grid-3 /* 3 columns on desktop, 2 on tablet, 1 on mobile */
.ds-grid-4 /* 4 columns on desktop, 2 on tablet, 1 on mobile */
```

## 🚀 Getting Started

### 1. Import the Design System

In your layout or page:

```tsx
import '@/lib/design/tokens.css';
import '@/lib/design/components.css';
import '@/lib/design/utilities.css';
```

### 2. Wrap Your Content

Add the `.ds` class to enable design system styles:

```tsx
<div className="ds">
  {/* Your content here */}
</div>
```

### 3. Use Components

```tsx
<div className="ds">
  <div className="ds-container ds-py-xl">
    <h1 className="ds-heading-1">Welcome</h1>
    <p className="ds-text-muted">Description text</p>

    <div className="ds-grid-2 ds-mt-xl">
      <div className="ds-card">
        <h3 className="ds-heading-3">Card 1</h3>
        <button className="ds-btn ds-btn--primary ds-mt-md">
          Action
        </button>
      </div>

      <div className="ds-card">
        <h3 className="ds-heading-3">Card 2</h3>
        <button className="ds-btn ds-btn--secondary ds-mt-md">
          Action
        </button>
      </div>
    </div>
  </div>
</div>
```

## 📖 Live Documentation

Visit `/hub/design-test` to see:

- **Design tokens showcase** - All colors, typography, spacing visualized
- **Component library** - Every component with live examples
- **Layout patterns** - Responsive grids and utility compositions
- **Real hub UI preview** - Actual components with mock data

## 🎯 Migration Guide

### Converting Existing Components

**Before (old system):**
```html
<button class="game-btn game-btn-primary">Click me</button>
<div class="game-card" style="padding: 16px;">Content</div>
```

**After (design system):**
```html
<button class="ds-btn ds-btn--primary">Click me</button>
<div class="ds-card">Content</div>
```

### Benefits

✅ **No more inline styles** - Everything is class-based
✅ **Consistent spacing** - Use `ds-p-lg` instead of hardcoding pixels
✅ **Mobile-responsive** - Grids collapse automatically
✅ **WCAG compliant** - 44px touch targets, readable fonts
✅ **Easier to maintain** - Change tokens.css, update everywhere

## 🔍 Design Principles

1. **Mobile-First** - Design for 375px, enhance for desktop
2. **Retro Gaming Aesthetic** - Dark brown/gold, monospace fonts
3. **Accessibility** - WCAG 2.1 AA compliance minimum
4. **Consistency** - Single design token source
5. **Performance** - CSS-only responsive, no JS
6. **Developer Experience** - Clear naming, easy to use

## 📝 Naming Conventions

- **Prefix:** All classes use `.ds-` (design system)
- **Component:** `.ds-btn`, `.ds-card`, `.ds-input`
- **Variant:** `.ds-btn--primary`, `.ds-card--nested`
- **Size:** `.ds-btn--sm`, `.ds-btn--lg`
- **Utility:** `.ds-flex`, `.ds-grid-2`, `.ds-p-md`
- **State:** `.ds-text-muted`, `.ds-pill--good`

## 🛠️ Maintenance

### Adding New Colors

1. Add to `tokens.css`:
   ```css
   --ds-new-color: #hexcode;
   ```

2. Add utility class to `utilities.css`:
   ```css
   .ds-text-new { color: var(--ds-new-color); }
   ```

3. Document in README

### Adding New Components

1. Create styles in `components.css`
2. Follow naming convention (`.ds-component`, `.ds-component--variant`)
3. Ensure mobile-responsive
4. Test 44px touch targets
5. Add to design-test page
6. Document in README

## ✅ Checklist for New Components

- [ ] Mobile-first responsive design
- [ ] 44px minimum touch targets
- [ ] 14px+ font size on mobile
- [ ] Uses design tokens (no hardcoded values)
- [ ] No inline styles
- [ ] Accessible (ARIA labels, semantic HTML)
- [ ] Added to design-test page
- [ ] Documented in README

## 📚 Resources

- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [Touch Target Sizes](https://www.w3.org/WAI/WCAG21/Understanding/target-size.html)
- [Mobile-First Design](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Responsive/Mobile_first)

---

**Version:** 1.0.0
**Last Updated:** Nov 16, 2025
**Maintainer:** Aurelian Development Team
