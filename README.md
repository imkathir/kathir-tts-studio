# kathirStudio — Universal Text to Audio Format Converter

[![Deploy to GitHub Pages](https://github.com/imkathir/kathir-tts-studio/actions/workflows/deploy.yml/badge.svg)](https://github.com/imkathir/kathir-tts-studio/actions/workflows/deploy.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

**kathirStudio** is a full-featured text-to-speech studio that converts text of any length into high-fidelity audio across 9 major operating system audio formats, with native support for Apple iPhone formats alongside Universal and Lossless audio standards.

---

## 🌟 Key Features

- **Chunked Text-to-Speech (Unlimited Duration)**:
  - Multi-page texts (30,000 to 60,000+ characters) are automatically partitioned by paragraphs and syntactic boundaries, synthesized, and merged seamlessly with audio normalization. No 3-minute cutoff.
- **Selectable Target Formats**:
  - Checkboxes to choose exactly which formats to generate (`.mp3`, `.m4a`, `.m4r`, `.wav`, `.flac`, `.ogg`, `.opus`, `.aiff`, `.caf`) to save processing time and storage.
- **Native Apple iPhone & iOS Support**:
  - `.m4r` (iOS Ringtone: directly recognizable by iOS for ringtones & alarms)
  - `.m4a` (Apple AAC: high-efficiency audio for iPhone, iPad, Apple Watch, Mac)
  - `.aiff` (Apple uncompressed studio PCM)
  - `.caf` (Apple 64-bit CoreAudio container)
- **Universal & Lossless Standards**:
  - `.mp3`, `.ogg` Vorbis, `.opus` VoIP
  - `.wav` 16-bit PCM Master, `.flac` Bit-Perfect Lossless
- **Natural Voices**:
  - Formant-preserved neural male voices (`Charon`, `Fenrir`, `Puck`) and natural studio female narrators (`Kore`, `Zephyr`).
- **Interactive Audio Studio**:
  - Live audio waveform visualizer, frequency spectrum, volume controls, playback speed modulation, looping, and ZIP batch download.

---

## 🚀 Live Demo

- **GitHub Pages**: [https://imkathir.github.io/kathir-tts-studio/](https://imkathir.github.io/kathir-tts-studio/)

---

## 🛠️ Local Development & Full Server Setup

To enable local FFmpeg transcoding for all 9 formats with the Node.js Express server:

### Prerequisites

- Node.js (v18+)
- FFmpeg installed on your machine (`brew install ffmpeg` on macOS, `sudo apt-get install ffmpeg` on Ubuntu/Debian)

### Installation

```bash
# 1. Clone repository
git clone https://github.com/imkathir/kathir-tts-studio.git
cd kathir-tts-studio

# 2. Install dependencies
npm install

# 3. Start development server (Express backend + Vite frontend)
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📦 Build for Production

```bash
# Build frontend
npm run build

# Start production server
npm run start
```

---

## 📄 License

MIT License. Free for personal and commercial use.
