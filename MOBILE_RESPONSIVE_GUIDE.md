# Mobile Responsive Game Pages Guide

## 🎮 Making Game Pages Mobile-Responsive

This guide explains how to make the Aurelian game pages work seamlessly on mobile devices.

## Quick Start

### 1. Use ResponsiveGameLayout Instead of GameLayout

Replace:
```tsx
import GameLayout from '@/components/GameLayout';
```

With:
```tsx
import ResponsiveGameLayout from '@/components/ResponsiveGameLayout';
```

The ResponsiveGameLayout automatically switches between desktop and mobile layouts based on screen size.

### 2. Mobile-First Components

Use these mobile-optimized components:

#### MobileCard
For content sections that can collapse on mobile:
```tsx
import MobileCard from '@/components/ui/MobileCard';

<MobileCard 
  title="Mission Details" 
  collapsible={true}
  defaultOpen={false}
>
  {/* Content */}
</MobileCard>
```

#### MobileTable & MobileListItem
For displaying data lists on mobile:
```tsx
import { MobileTable, MobileListItem } from '@/components/ui/MobileTable';

<MobileTable
  data={missions}
  renderCard={(mission) => (
    <MobileListItem
      title={mission.name}
      subtitle={`Reward: ${mission.reward}g`}
      badges={[
        { label: mission.difficulty, variant: 'outline' },
        { label: mission.status, variant: 'default' }
      ]}
      actions={
        <Button size="sm" className="w-full">
          Start Mission
        </Button>
      }
    />
  )}
/>
```

## 📱 Mobile Design Principles

### 1. Touch-Friendly Targets
- Minimum 44px height for buttons and interactive elements
- Add proper spacing between clickable items
- Use full-width buttons on mobile

### 2. Responsive Grids
```tsx
// Desktop: 3 columns, Tablet: 2 columns, Mobile: 1 column
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
```

### 3. Responsive Typography
```tsx
// Larger text on desktop, smaller on mobile
<h1 className="text-lg md:text-xl lg:text-2xl">Title</h1>
<p className="text-sm md:text-base">Content</p>
```

### 4. Conditional Rendering
```tsx
// Show different content based on screen size
<div className="hidden md:block">Desktop only</div>
<div className="block md:hidden">Mobile only</div>
```

## 🔧 Converting Existing Pages

### Example: Converting Market Page

**Before (Desktop Only):**
```tsx
export default function MarketDashboard() {
  return (
    <GameLayout title="Market">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr' }}>
        {/* Fixed 3-column grid */}
      </div>
    </GameLayout>
  );
}
```

**After (Mobile Responsive):**
```tsx
export default function MarketDashboard() {
  return (
    <ResponsiveGameLayout title="Market">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Responsive grid */}
      </div>
    </ResponsiveGameLayout>
  );
}
```

### Example: Converting Tables

**Before (Desktop Table):**
```tsx
<table>
  <thead>
    <tr>
      <th>Name</th>
      <th>Price</th>
      <th>Quantity</th>
      <th>Actions</th>
    </tr>
  </thead>
  <tbody>
    {items.map(item => (
      <tr key={item.id}>
        <td>{item.name}</td>
        <td>{item.price}</td>
        <td>{item.quantity}</td>
        <td><button>Buy</button></td>
      </tr>
    ))}
  </tbody>
</table>
```

**After (Mobile Cards):**
```tsx
{/* Desktop Table */}
<div className="hidden md:block">
  <table>{/* ... */}</table>
</div>

{/* Mobile Cards */}
<div className="block md:hidden">
  <MobileTable
    data={items}
    renderCard={(item) => (
      <MobileListItem
        title={item.name}
        subtitle={`Quantity: ${item.quantity}`}
        rightContent={<Badge>{item.price}g</Badge>}
        actions={
          <Button size="sm" className="w-full">Buy</Button>
        }
      />
    )}
  />
</div>
```

## 🎨 Responsive Utilities

### Spacing
```tsx
// Responsive padding
className="p-2 md:p-4 lg:p-6"

// Responsive margins
className="m-1 md:m-2 lg:m-4"

// Responsive gaps
className="gap-2 md:gap-4 lg:gap-6"
```

### Sizing
```tsx
// Responsive widths
className="w-full md:w-1/2 lg:w-1/3"

// Responsive max-widths
className="max-w-sm md:max-w-md lg:max-w-lg"
```

### Display
```tsx
// Show/hide at breakpoints
className="hidden md:block"  // Hidden on mobile
className="block md:hidden"  // Only on mobile
className="hidden lg:block"  // Hidden until large screens
```

## 🚀 Best Practices

1. **Test on Real Devices**: Use Chrome DevTools device emulation and test on actual phones/tablets
2. **Performance**: Lazy load images and heavy components on mobile
3. **Offline Support**: Consider adding PWA features for mobile users
4. **Touch Gestures**: Add swipe support for navigation where appropriate
5. **Loading States**: Show skeletons/spinners while data loads (especially important on mobile networks)

## 📊 Common Breakpoints

- **Mobile**: < 640px (sm)
- **Tablet**: 640px - 1024px (md) 
- **Desktop**: > 1024px (lg)
- **Wide**: > 1280px (xl)

## 🔍 Testing Checklist

- [ ] Test on iPhone SE (375px width)
- [ ] Test on iPhone 14 (390px width)
- [ ] Test on iPad (768px width)
- [ ] Test landscape orientation
- [ ] Test with slow 3G network throttling
- [ ] Verify touch targets are at least 44px
- [ ] Check text is readable without zooming
- [ ] Ensure no horizontal scrolling
- [ ] Test with one-handed use
- [ ] Verify forms work with mobile keyboards

## 💡 Tips

1. **Progressive Enhancement**: Start with mobile layout, enhance for desktop
2. **Content Priority**: Show most important info first on mobile
3. **Reduce Clutter**: Hide non-essential elements on mobile
4. **Optimize Images**: Use responsive images with srcset
5. **Simplify Navigation**: Use bottom nav bar or hamburger menu
6. **Minimize Input**: Use select dropdowns instead of text input where possible
7. **Cache Data**: Store frequently used data locally to reduce loading

## 🛠️ Conversion Priority

High priority pages to convert:
1. `/hub` - Main game hub
2. `/missions` - Mission management  
3. `/market` - Trading interface
4. `/warehouse` - Inventory management
5. `/crafting` - Crafting interface
6. `/agents` - Agent management
7. `/guild` - Guild interface

Low priority (can wait):
- Admin pages (already converted)
- Debug pages
- Test pages

## 📚 Resources

- [Tailwind CSS Responsive Design](https://tailwindcss.com/docs/responsive-design)
- [Mobile First Design](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Responsive/Mobile_first)
- [Touch Target Guidelines](https://www.nngroup.com/articles/touch-target-size/)
- [PWA Best Practices](https://web.dev/progressive-web-apps/)