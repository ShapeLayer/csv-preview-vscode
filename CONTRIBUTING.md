# Contributing

English | [한국어](CONTRIBUTING-ko.md)

## Bug reports and feature requests

Open a [GitHub issue](https://github.com/shapelayer/csv-preview-vscode/issues) with steps to reproduce the problem, the expected behavior, and the actual behavior. Include your operating system, VS Code version, and extension version. If a CSV example is needed, attach a small file with personal or sensitive information removed.

## Development environment

Use Node.js 22 or later, npm, and VS Code 1.85 or later.

```sh
npm ci
npm test
```

Open the project folder in VS Code and press F5 to launch a separate VS Code window running the extension (the Extension Development Host). Open a CSV file and press Ctrl+K → V (Windows/Linux) or Cmd+K → V (macOS) to check your changes.

## Code structure

The extension uses TypeScript and standard DOM APIs, without frameworks or external runtime dependencies.

- `src/csv.ts`: CSV parsing and source position mapping
- `src/extension.ts`: VS Code commands, editor synchronization, and preview messages
- `webview/preview.ts`: Table rendering, column resizing, and cell clicks
- `webview/preview.css`: Theme colors and preview styles
- `test/`: Tests for parsing, editor synchronization, and preview behavior

CSV content is displayed using `textContent` rather than interpreted as HTML. Preserve this approach when changing the preview.

## Checking your changes

Run `npm test` after making changes. Automated tests cover CSV parsing, source position mapping, cell navigation, column width calculation and reset, and column border highlighting.

If you change how the preview looks or behaves, check the affected features in the Extension Development Host. Relevant checks include scroll synchronization, cell clicks, column resizing and reset, multiline cells, and light, dark, and high-contrast themes.

In your pull request, describe the problem, the resulting behavior, and what you checked. Include screenshots when the appearance changes to help reviewers assess the result.
