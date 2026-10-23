# Lightweight CSV Preview

English | [한국어](README-ko.md)

A lightweight Visual Studio Code extension for viewing CSV files as tables. The preview follows the source editor's scrolling and cursor position. Click a preview cell to jump to its location in the source file.

## Usage

- With a CSV file open, press **Ctrl+K → V** (Windows/Linux) or **Cmd+K → V** (macOS) to open a preview beside the editor.
- Run **CSV: Open Preview** from the Command Palette (**Ctrl+Shift+P**, or **Cmd+Shift+P** on macOS) to open a preview in a separate tab in the current editor group.
- You can also run **CSV: Open Preview to the Side** or use the preview icon in the editor title bar.
- Right-click a CSV file in the Explorer and select **CSV: Open Preview**.
- Run **CSV: Toggle Active Cell Highlight** to turn cell highlighting on or off.

Each preview stays connected to its source file. Scrolling the source editor moves the preview to the corresponding CSV record. Moving the cursor brings its cell into view and highlights it. Cells that span multiple lines are also mapped to their source positions. You can scroll the preview manually; it follows the editor again the next time you scroll or move the cursor in the source. Clicking a preview cell moves the source editor's cursor and focus to the start of that cell. If the source editor is hidden, it opens beside the preview.

## Settings

| Setting | Default | Description |
| --- | --- | --- |
| `csvPreview.highlightActiveCell` | `true` | Highlight the cell containing the source cursor. |
| `csvPreview.followEditor` | `true` | Follow scrolling and cursor movement in the source editor. |
| `csvPreview.firstRowAsHeader` | `true` | Use the first record as a sticky header. |

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for bug reports and code contributions.
