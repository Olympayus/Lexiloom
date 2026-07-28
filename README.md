# Lexiloom

**Personal vocabulary knowledge management app.**

Lexiloom helps you build and manage your personal vocabulary collection. Search words from built-in dictionaries, add them to your collection, and enrich each word with structured fields like definitions, parts of speech, example sentences, and more.

Built with Tauri 2 + React + TypeScript + SQLite.

## Features

- **Dictionary search** — Search English or Chinese words with CC-CEDICT support, with typeahead dropdown
- **Word management** — Add words to your personal library, organize with structured fields
- **7 built-in fields** — Chinese definition, English definition, part of speech, derivatives, synonyms, example sentences, usage scenarios
- **Offline-first** — All dictionary data is bundled and runs locally, no internet required
- **Cross-platform** — Windows, macOS, and Linux via Tauri 2

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript, Tailwind CSS v4 |
| State | Zustand |
| Routing | react-router-dom |
| Backend | Tauri 2 (Rust) |
| Database | SQLite via tauri-plugin-sql |
| Dictionary | CC-CEDICT (Chinese-English) |

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) >= 18
- [Rust](https://rustup.rs/) toolchain
- [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/) for your platform

### Install & Run

```bash
npm install
npm run tauri dev
```

This starts the Tauri desktop app with Vite hot-reload for the frontend.

### Build

```bash
npm run tauri build
```

## Project Structure

```
src/
├── components/     # UI components (WordCard, WordWorkbench, search, layout, ui)
├── db/             # Database layer (schema, connection, queries)
├── lib/            # Search library
├── providers/      # Dictionary providers (CC-CEDICT)
├── routes/         # Page components (IndexPage, AddWordPage)
├── services/       # Service layer (words, fields, search)
├── stores/         # Zustand state (wordStore)
├── types/          # TypeScript interfaces (word, field, dictionary)
├── App.tsx
└── main.tsx
```

## Usage

1. **Search** — Type in the top search bar to look up words in the dictionary
2. **Add** — Click a search result to add the word to your collection
3. **Enrich** — Fill in fields like definition, part of speech, example sentences
4. **Manage** — Browse and edit your vocabulary list on the main page

## Development

Built-in field definitions are defined in `src/types/field.ts`. To add a new field, update the `FieldKey` type union and the `BUILTIN_FIELDS` constant, then add a seed INSERT in `src/db/schema.ts`.

## License

Private project.
