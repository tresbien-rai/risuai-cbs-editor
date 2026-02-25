# CBS Editor

A browser-based editor for [RisuAI](https://risuai.net) Curly Braces Syntax (CBS) with live preview, preset import/export, and an interactive control panel.

## Features

- **CBS Parser** ported from RisuAI source, supporting 80+ functions: variables, math, arrays, strings, conditionals (`#if`, `#when`, `#each`, `#pure`, `#func`/`call`), and more
- **Syntax highlighting** with color-coded CBS expressions
- **Live preview** that re-parses on every keystroke
- **Preset import/export** supporting `.risup`, `.risupreset`, and `.json` formats
- **Flatten export** resolves all CBS with current toggle values and exports as `.txt`
- **Control Panel** parses RisuAI Custom Toggles format and renders interactive controls (selects, toggles, groups, dividers)
- **Prompt Navigator** browse and edit individual prompt template items
- **Customizable UI** with adjustable font sizes and draggable panel dividers

## Usage

Open `index.html` in any modern browser. No server, build step, or installation required.

1. Click **Import** to load a `.risup`, `.risupreset`, or `.json` preset file
2. Browse prompt items in the **Prompt Navigator** (left sidebar)
3. Click any editable item to load it in the editor
4. Adjust toggles in the **Panel** tab to see how CBS conditionals resolve in real time
5. Click **Export** to save changes back to `.risup` format, or **Flatten** for a parsed `.txt`

## CBS Syntax Reference

Refer to the [RisuAI documentation](https://risuai.net) for the full CBS syntax reference. Key constructs supported:

- `{{char}}`, `{{user}}`, `{{getvar::name}}`, `{{setvar::name::value}}`
- `{{getglobalvar::toggle_name}}` (reads control panel toggle values)
- `{{#when::condition::operator::value}}...{{:else}}...{{/when}}`
- `{{#if condition}}...{{/if}}`
- `{{#each array as item}}{{slot::item}}{{/each}}`
- `{{calc::expression}}`, `{{? expression}}`
- `{{#pure}}...{{/pure}}`, `{{#escape}}...{{/escape}}`
- `{{#func name args}}...{{/func}}` + `{{call::name::values}}`

## License

MIT
