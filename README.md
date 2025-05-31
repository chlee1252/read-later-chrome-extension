# Simple Read-Later Extension

One-click bookmark manager for Chromium browsers. Save web pages for later reading.

## Development Setup

```bash
npm install          # Install dependencies
npm run dev         # Development mode with file watching
npm run build       # Production build
npm run zip         # Create distribution package
```

## Browser Testing

1. Go to browser extensions page (`chrome://extensions/`)
2. Enable "Developer mode"  
3. Click "Load unpacked extension"
4. Select the `dist/` folder

## Project Structure

```
├── manifest.json          # Extension configuration
├── popup.html/css/js      # UI components  
├── background.js          # Service worker
├── scripts/               # Build automation
├── icons/                 # SVG and PNG assets
└── dist/                  # Build output (auto-generated)
```

## Browser Compatibility

Supports all Chromium-based browsers: Chrome, Edge, Opera, Brave, Whale, Vivaldi

## Tech Stack

- Manifest V3 Chrome Extensions API
- Vanilla JavaScript (ES6+)
- Chrome Storage API for local data
- Service Worker for background processing

## Development Guidelines

See [.copilot-instructions.md](.copilot-instructions.md) for detailed coding standards and workflows.
