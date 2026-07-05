# Contributing to Mini Me 🎀

First of all, thank you for taking the time to contribute to Mini Me! We are excited to build a cozy, mindful companion together.

To ensure a smooth collaboration, please read and follow these guidelines.

---

## 💡 Our Philosophy

Mini Me is built on a **minimal-change, high-reliability philosophy**. Because the application runs directly on users' desktops and interacts with system-level window positioning, stability is paramount.

> [!IMPORTANT]
> **Preserve existing behavior whenever possible.**
> Avoid large-scale refactors, structural reorganization, or rewriting working systems unless discussed and agreed upon beforehand in an issue. We value clean, surgical modifications over broad rewrites.

---

## 🛠️ Development Setup

To set up Mini Me locally:

1. **Fork and Clone** the repository:
   ```bash
   git clone https://github.com/Kanneboinashivakumar/mini-me.git
   cd mini-me
   ```
2. **Install Dependencies** (requires Node.js LTS):
   ```bash
   npm install
   ```
3. **Run the Application in Debug Mode**:
   ```bash
   npm start -- --enable-logging
   ```
   This will boot the app and print console logs directly to your terminal.

---

## 🌿 Branch Naming Conventions

To keep the repository history clean, please name your branches using the following prefixes:
- `feat/description` — for new features (e.g., `feat/seasonal-outfits`)
- `fix/description` — for bug fixes (e.g., `fix/double-click-focus`)
- `docs/description` — for documentation improvements (e.g., `docs/faq-update`)
- `refactor/description` — for safe code cleanups or optimizations

---

## 💬 Commit Message Conventions

We follow clean, structured, and professional git commits. Commit messages should be structured as follows:

```
<type>(<scope>): <short description>

[Optional body explaining the rationale behind the change]
```

### Types:
- `feat`: A new feature or capability.
- `fix`: A bug fix.
- `docs`: Documentation-only changes.
- `style`: Changes that do not affect the meaning of the code (white-space, formatting, semicolons, etc.).
- `refactor`: A code change that neither fixes a bug nor adds a feature.
- `test`: Adding missing tests or correcting existing tests.

### Examples:
- `feat(feed): implement custom click-based double-click for treat dropping`
- `fix(crying): correct crying state sprite transition duration`
- `docs(readme): add troubleshooting section for macOS transparency`

---

## 🚀 Pull Request Process

1. **Create a Branch**: Create a branch off the `main` branch with a descriptive name following our naming conventions.
2. **Implement Your Changes**: Write clean, commented code that adheres to our styling guidelines.
3. **Verify locally**: Test your changes on your operating system (Windows/macOS). Make sure no existing features are broken.
4. **Push & Open PR**: Push to your fork and submit a Pull Request. Fill out the Pull Request template completely.
5. **Review & Adjust**: Address any feedback raised during code review. Keep commits atomic and squashed if appropriate.

---

## 🐛 Bug Reports & Feature Proposals

### Bug Reports
If you encounter a bug:
- Check the open issues to see if the bug has already been reported.
- If not, open a new issue using our **Bug Report Template**.
- Provide as many details as possible, including steps to reproduce, OS environment, and console logs.

### Feature Proposals
If you have a great idea:
- Open an issue using the **Feature Request Template**.
- Clearly explain the problem it solves and how the companion's user experience will benefit.
- Wait for feedback from maintainers before writing code.

---

## 📝 Coding & Documentation Standards

- **Vanilla CSS**: We use clean, modern Vanilla CSS for styling. Avoid bringing in heavy styling frameworks.
- **Vanilla JS**: Standard JavaScript APIs are preferred. Do not add heavy external libraries (e.g., jQuery, physics engines) for simple tasks.
- **Maintain Comments**: Preserve existing code comments and docstrings. Document new logic with clear, concise inline comments.
- **Security Isolation**: Do not alter `preload.js` or `main.js` to expose unsafe Node/Electron APIs directly to the renderer.

---

## 🧪 Testing Expectations

Since this is a lightweight app without complex build runners:
- **Manual Verification**: Run the app locally and verify the exact event flow. Test dragging, clicking, double-clicking, and context menus.
- **Resolution and Bounds**: Ensure the pet scales correctly and boundaries (e.g., screen dimensions, window coordinates) are computed safely.

Thank you for helping us make Mini Me the best desktop companion!
