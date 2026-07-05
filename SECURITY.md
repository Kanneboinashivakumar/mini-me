# Security Policy

We take the security of Mini Me seriously. This document outlines our security policies, how to report vulnerabilities, and what versions are supported.

## Supported Versions

Security updates are actively applied to the following versions of Mini Me:

| Version | Supported |
| --- | --- |
| >= 1.0.0 | :white_check_mark: Yes |
| < 1.0.0 | :x: No |

## Reporting a Vulnerability

If you discover a security vulnerability, please do not open a public GitHub issue. Instead, please report it responsibly:

1. **Email us**: Send a detailed description of the vulnerability to Kanneboina Shiva Kumar via email or contact through official channels.
2. **Details to include**:
   - A description of the vulnerability and its potential impact.
   - Detailed steps to reproduce the vulnerability (proof of concept code, script, or screenshots).
   - Any details about your local setup (OS, Node.js, and Electron versions).

We will acknowledge receipt of your report within 48 hours and work with you to resolve the issue as quickly as possible.

## Electron & Security Best Practices

Mini Me runs in a local Electron context. To maintain a safe sandbox, we strictly adhere to the following principles:
- **Context Isolation**: `contextIsolation` is enabled for all renderers.
- **Node Integration**: `nodeIntegration` is disabled in the renderer process.
- **Preload Script**: Communication with system APIs is strictly isolated inside `preload.js` via a safe context bridge. No direct access to `ipcRenderer` is exposed to the renderer process.
- **Content Security Policy (CSP)**: Ensure that your local pages load content only from trusted sources.
