# CBS Editor

A browser-based editor for [RisuAI](https://risuai.net) Curly Braces Syntax (CBS) with live preview, preset import/export, an interactive control panel, and a searchable CBS reference.

## Features

### Core editing
- **CBS parser** matching RisuAI behavior, with 100+ functions: variables, math, arrays, strings, conditionals (`#if`, `#if_pure`, `#when`, `#each`, `#pure`, `#escape`, `#code`, `#func`), and more
- **Syntax highlighting** with depth-colored block nesting and alternating sibling shades
- **Live preview** that re-parses on every keystroke
- **Diagnostics bar** flags unclosed blocks with clickable line numbers that jump the cursor to the error
- **Typo detection** for single curly braces near CBS keywords and stray `}}` without a matching `{{`

### Preset I/O
- **Import/Export** supporting `.risup`, `.risupreset`, and `.json` formats with full round-trip preservation
- **Flatten export** outputs the entire preset as a labeled `.txt` with raw CBS preserved, including the Custom Toggles source at the top
- **Typed prompt slot editing** for Persona, Description, Lorebook, Author Note, Memory, and Post Everything (edits the `innerFormat` field; Author Note also exposes `defaultText` via a field switcher)

### Control Panel
- **Custom Toggles parser** matching RisuAI's exact `parseToggleSyntax` behavior (strict `groupEnd`, `key=value=type=options` format)
- All control types supported: toggle, select, text, textarea, divider, caption, group/groupEnd
- **Warnings panel** flags common mistakes (lowercase `groupend`, unclosed groups, stray `groupEnd`) with line numbers and corrective advice
- Resizable textarea with persisted height across re-renders
- Inline Toggle Syntax reference

### Reference & UX
- **CBS Reference drawer** (book icon button) with 113 entries across 16 categories, full-text search across names/signatures/descriptions/aliases, operator tables for `#when` and `{{? ...}}`, code examples with expected output, and inter-entry "See also" links
- **Three-pane layout** (Prompt Navigator | Editor | Preview) with draggable dividers and collapsible sidebar
- **Independent font controls** via the `Aa` dropdown: Editor (px), Panel (px), UI scale (%)
- **Light/dark theme** toggle
- **Preview copy** button

## Usage

Open `index.html` in any modern browser. No server, build step, or installation required.

1. Click **Import** to load a `.risup`, `.risupreset`, or `.json` preset file
2. Browse prompt items in the **Prompt Navigator** (left sidebar). Both `plain`/`jailbreak`/`cot`/`chatML` slots and typed slots like `persona`/`description`/`lorebook`/`authornote` are editable.
3. Click any item to load it in the editor
4. Adjust toggles in the **Panel** tab to see how CBS conditionals resolve in real time
5. Open the **CBS Reference** drawer for searchable documentation on every supported function and block
6. Click **Export** to save changes back to `.risup`/`.risupreset`/`.json`, or **Flatten** to produce a parseable text snapshot

## CBS Syntax Reference

The built-in reference drawer covers every supported construct in detail. A quick orientation:

- **Identity**: `{{char}}`, `{{user}}`, `{{persona}}`, `{{description}}`, `{{scenario}}`, ...
- **Variables**: `{{getvar::name}}`, `{{setvar::name::value}}`, `{{addvar::name::n}}`, `{{getglobalvar::name}}`, `{{tempvar::name}}`, `{{settempvar::name::value}}`
- **Conditionals**: `{{#if condition}}...{{:else}}...{{/if}}`, `{{#if_pure ...}}` (no trim), `{{#when::val::op::compare}}` with operators `is`/`isnot`/`var`/`vis`/`visnot`/`toggle`/`tis`/`tisnot`/`>`/`<`/`>=`/`<=`/`and`/`or`/`not`/`keep`
- **Calc** (RPN, not JS eval): `{{? expr}}` and `{{calc::expr}}` with `+ - * / % ^ = == != < > <= >= && || !` and parentheses. Single `=` works as equality.
- **Iteration**: `{{#each array as item}}...{{/each}}` (the `as` clause is required since the January 2026 RisuAI update)
- **Structural**: `{{#pure}}`, `{{#puredisplay}}`, `{{#escape}}`, `{{#code}}`, `{{#func name(args)}}body{{/func}}`
- **Math, strings, arrays, random, time** and **escape** helpers for literal braces

## Custom Toggles Format

Each line: `key=label=type=options`

```
mytoggle=My Toggle
mydropdown=My Dropdown=select=Option A,Option B,Option C
myinput=My Text Field=text
=Group Name=group
  child1=Child Toggle
  child2=Another=select=A,B
=Group Name=groupEnd
=Section Divider=divider
=Some descriptive text=caption
```

Toggle values are stored as `toggle_<key>` in global chat variables. Read them in prompts via `{{getglobalvar::toggle_<key>}}` or `{{#when::toggle::<key>}}`.

`groupEnd` is case-sensitive in RisuAI. The editor warns on lowercase `groupend` since RisuAI silently ignores it.

## License

This work is licensed under the Creative Commons Attribution-NonCommercial 4.0 International License (CC BY-NC 4.0). See [LICENSE](LICENSE) for the full text, or visit https://creativecommons.org/licenses/by-nc/4.0/
