# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.0] - 2026-07-05

### Added
- **Initial Release** of Mini Me desktop companion application.
- State-machine driven behavior for walking, idle, napping, dragging, falling, and reacting.
- **Focus Mode**: 25-minute pomodoro timer with active progression bar and sleeping/desk sprite.
- **Break Mode**: 5-minute cooldown walk.
- **Loneliness Loop**: Crying state (`crying.png` sprite + customized dialog) triggers automatically if left without interactions for 4 minutes.
- **Feeding Mechanic**: Double-clicking dropping cookie treat (`treat.png`) which drops via gravity easing, causing reacting and eating sprites, then restoring state.
- **Drag-and-Drop Physics**: Pick up pet and throw her; gravity acceleration pulls her back down to taskbar height.
- Fully customizable dialog arrays and parameters (`CONFIG` object in `renderer.js`).
- World-class documentation including `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`, and issue templates.

### Fixed
- **Double-click Interaction**: Implemented custom click-delay tracker in place of native double-click event to bypass Chrome resetting the double-click sequence during walk sprite updates.
- **Dialogue Consistency**: Set explicit dialogue strings for crying (`...i missed you. click me? 🥺`) and focus completion (`focus session complete! amazing work 🎉`) to align with design specs.
