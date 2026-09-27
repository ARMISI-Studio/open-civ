# Prototype visual style guide

## Overall feel

A clean, light engineering workspace: precise diagrams, quiet surfaces, and plenty of breathing room. Use blue for actions and selection, with most of the interface in white and slate gray. Keep decoration minimal so the structure stays the focus.

## Colors

| Use | Color |
| --- | --- |
| Page background | `#F8FAFC` — very light slate |
| Panels, forms, and drawing canvas | `#FFFFFF` — white |
| Dividers and subtle panel borders | `#E2E8F0` — pale slate |
| Input borders and secondary controls | `#64748B` — slate |
| Main text and structural members | `#0F172A` — dark navy |
| Secondary text | `#475569` — muted slate |
| Primary buttons, links, and selection | `#2563EB` — blue |
| Primary button hover | `#1D4ED8` — deeper blue |
| Selected item background | `#EFF6FF` — pale blue |
| Success / warning / error | `#15803D` / `#B45309` / `#B91C1C` |

Use white text on primary buttons. Pair status colors with an icon and a short label; color alone should never carry meaning.

## Typography and spacing

- Use the system sans-serif font stack for a crisp, familiar look.
- Page titles: **24px, semibold**. Section titles: **18px, semibold**. Body and inputs: **16px**. Labels and helper text: **14px**.
- Use roughly 1.5 line height for readable text. Keep labels short and use sentence case.
- Base spacing on **8px**: 8px within related controls, 16px between fields, 24px inside panels, and 32px between sections.
- Use **8px corners** for controls and **12px corners** for panels. Prefer thin borders; reserve soft shadows for menus and floating tools.

## Layout

Use a white top navigation bar with a subtle bottom border. Mark the active tab with blue text and a blue underline.

- **Structure Editor:** a large central canvas, a compact tool strip on the left, and a properties panel around 280px wide on the right.
- **Question Builder:** a readable form alongside a structure preview, with the main action at the bottom.
- **Answer Questions:** a centered layout around 960px wide, with the diagram, prompt, and clearly separated answer options.

On small screens, stack the content, collapse editor properties, and keep the canvas usable. Reduce outer padding from 24px to 16px.

## Controls and states

- **Buttons:** at least 44px tall. Primary actions are solid blue; secondary actions are white with a slate border. Use red for destructive actions.
- **Inputs:** white background, visible border, label above, and helper or error text below. Use a blue focus outline with a small offset.
- **Tools:** consistent outline icons with labels or tooltips. The active tool gets a pale blue background and blue border.
- **Answer options:** full-width clickable rows with a radio button or checkbox. Selected rows use the same pale blue treatment.
- **Feedback:** compact messages near the action. Keep disabled controls visibly muted and show a spinner with text while saving or submitting.

## Drawing style

Use a faint grid, dark 2–3px member lines, small circular nodes, and consistent support symbols. Draw loads as amber arrows, with direction and magnitude labeled. Keep labels readable when zooming.

Highlight selected objects in blue with visible handles. Show invalid objects with a red marker and explanatory text. Use shape, labels, and line style alongside color to distinguish objects.

Keep transitions subtle, around 150ms, and respect reduced-motion preferences. Avoid gradients, heavy shadows, and decorative animation.


## Try and tune the design

Open [the HTML playground](../../public/ui-playground.html) directly in a browser, or run `npm run dev` and visit `/ui-playground.html` on the local Vite server.

1. Change **Colors**, **Spacing**, **Fonts**, and **Shape** in the sidebar. The preview updates immediately.
2. Switch between the three example screens and desktop/mobile widths to compare the result.
3. Use **Theme JSON** to edit all values together, then choose **Apply JSON**.
4. Choose **Export JSON** to keep a theme, and **Import JSON** to restore it later. **Reset defaults** returns to the original style.

Changes are saved in this browser when storage is available. Export files to keep versions or share them. The default JSON lives in the HTML’s `default-theme` block; its values map to CSS variables such as `--colors-primary` and `--spacing-medium`. Spacing and font sizes are pixels; line height is unitless. Fonts use installed system stacks, so no external font download is needed.

This playground previews styling and sample interactions; it does not change the Vue app’s theme automatically.
