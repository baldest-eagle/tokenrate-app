# TokenRate - AI Model Directory & Comparison Hub

A modern, high-performance web and desktop directory for exploring, searching, and comparing cutting-edge AI models. Tailored specifically for **Hermes-Agent** and the **Nous Portal** ecosystem with rich OpenRouter metadata hydration.

![TokenRate Preview](public/hermes-logo-v7.jpg)

---

## ✨ Features

- **🚀 Live Model Catalog:** Automatically aggregates models available through your local Hermes-Agent portal cache (`nous_recommended_cache.json`, `provider_models_cache.json`, `model-catalog.json`), including exclusive stealth models like `stealth/space-bunny-alpha`.
- **⚖️ Side-by-Side Model Comparison (Max 3):**
  - Compare up to 3 models simultaneously side-by-side in an interactive matrix.
  - Detailed parameter rows:
    - **Pricing:** Input & output token costs per 1M tokens, with Free/Pro badges.
    - **Context & Output Parameters:** Context window sizes, max completion token limits, and input/output modalities (Text, Image, File, Audio).
    - **Intended Use Case:** Highlighting primary target workloads (agentic coding, deep research, multimodal analysis, etc.).
    - **What Makes It Stand Out:** Core competitive advantages and frontier capabilities.
    - **Release Date:** Official release / model update timestamp.
    - **Capabilities:** Formatted badges for Vision, Function Calling, and more.
- **📖 Expandable Descriptions ("More" / "Less"):**
  - Un-truncated, full multi-paragraph model descriptions fetched dynamically via `/api/models/description`.
  - Clean "More" / "Less" toggle for an uncluttered browsing experience.
- **🎨 Rosé Pine Aesthetic:**
  - Dual theme support: Rosé Pine Dawn (light) and Rosé Pine (dark).
  - Signature anime headphones speaker toggle that seamlessly controls light and dark mode with concentric color rings.
- **🖥️ Native Windows Executable (`TokenRate.exe`):**
  - **Zero Terminal Popups:** Runs silently without leaving open command prompt or PowerShell windows.
  - **Embedded High-Res Icon:** Custom multi-resolution icon (`app.ico`) embedded into the binary.
  - **Chrome App Mode:** Automatically launches as a borderless, dedicated desktop app window (`--app=http://localhost:3000`).
  - **System Tray Integration:** Sits in the Windows taskbar notification area with options to open, restart the server, or cleanly exit.

---

## ⚡ Quick Start

### 1. One-Click Windows Installer (Recommended)
Double-click `install.bat` (or run `install.ps1` in PowerShell):
```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\install.ps1
```
This automatically:
1. Installs all npm dependencies (`npm install`).
2. Builds the optimized production Next.js bundle (`npm run build`).
3. Compiles the native `TokenRate.exe` launcher with embedded icon using Windows' native C# compiler (`csc.exe`).
4. Creates an **AI Model Directory** shortcut directly on your Desktop.

After installation, simply double-click the **AI Model Directory** desktop shortcut anytime!

---

### 2. Manual Development Setup

If you prefer running via terminal:

```bash
# Clone the repository
git clone https://github.com/baldest-eagle/tokenrate-app.git
cd tokenrate-app

# Install dependencies
npm install

# Start Next.js development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

### 3. Production Build & Start

```bash
# Build the production bundle
npm run build

# Start the optimized server
npm start
```

---

## 🛠️ Native Desktop Launcher (`TokenRate.exe`)

The launcher is written in C# (`Launcher.cs`) and compiles using the built-in Microsoft .NET Framework compiler (`csc.exe`) present on Windows 10/11.

To rebuild `TokenRate.exe` at any time:
```powershell
powershell -ExecutionPolicy Bypass -File .\build-exe.ps1
```

### Launcher Highlights:
- **Instant Port Check:** Uses non-blocking socket polling (<1ms) to verify whether port 3000 is already active.
- **Background Server:** Spawns `npm.cmd start` in a hidden process window.
- **App Mode:** Launches Google Chrome in dedicated application window mode (`--app=http://localhost:3000`) for a native desktop feel.
- **System Tray:** Provides a notification tray icon with a right-click context menu (*Open App*, *Open in Browser*, *Restart Server*, *Exit*).
- **Single Instance:** Mutex-protected (`Local\TokenRate_Hermes_Launcher_Mutex`) so clicking the shortcut while running brings up the existing window instead of creating duplicate servers.

---

## 📦 Project Structure

```
tokenrate-app/
├── public/
│   ├── hermes-logo.jpg          # Clean Hermes manga girl logo
│   └── hermes-logo-v7.jpg       # Active theme toggle logo
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── models/
│   │   │   │   ├── route.ts     # Main model directory API (whitelist + OpenRouter hydration)
│   │   │   │   └── description/ # Dynamic full-description scraper/fetcher
│   │   │   │       └── route.ts
│   │   ├── globals.css          # Rosé Pine color definitions & dark mode variables
│   │   ├── layout.tsx           # Theme provider wrapper
│   │   └── page.tsx             # Interactive UI, directory, search, comparison matrix
├── Launcher.cs                  # C# Windows GUI launcher source
├── TokenRate.exe                # Compiled native Windows launcher binary
├── app.ico                      # Multi-resolution Windows app icon (16x16 to 256x256)
├── build-exe.ps1                # Recompiles TokenRate.exe
├── install.ps1                  # One-click PowerShell installer
├── install.bat                  # Double-clickable Windows installer
├── package.json
└── README.md
```

---

## 💻 Tech Stack

- **Framework:** [Next.js](https://nextjs.org/) (App Router, Turbopack)
- **UI Library:** [React](https://react.dev/)
- **Styling:** [Tailwind CSS](https://tailwindcss.com/)
- **Icons:** [Lucide React](https://lucide.dev/)
- **Theme:** [next-themes](https://github.com/pacocoursey/next-themes) with [Rosé Pine](https://rosepinetheme.com/)
- **Native Launcher:** C# (.NET Framework Win32 Windows Forms / System Tray)

---

## 📄 License

MIT License. Feel free to use, modify, and distribute.
