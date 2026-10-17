# CBS Editor

A browser-based editor for [RisuAI](https://risuai.net) Curly Braces Syntax (CBS) with live preview, preset import/export, an interactive control panel, and a searchable CBS reference.

## Features

### Core editing
- **RisuAI's own CBS engine**: the preview runs RisuAI's parser and its full function registry (about 170 functions and aliases), bundled from RisuAI's source, against a simulated character and chat. Prompt items are parsed the way RisuAI parses them, so quirks carry over too: for example, `{{setvar}}` is left as-is in prompts, and unset variables read as `null`
- **Syntax highlighting** with depth-colored block nesting; consecutive sibling blocks alternate between plain and tinted-chip styling so they never blend together
- **Active block outline**: the innermost block around the cursor gets a thin outline that follows its text like a selection does, from the open tag to the close tag, so blocks inside long wrapped lines are outlined without the surrounding text. Its open, `{{:else}}`, and close tags are emphasized. Unclosed blocks get a dashed red outline running to the end of the text
- **Live preview** that re-parses on every keystroke
- **Diagnostics bar** flags unclosed blocks, closing tags or `}}` with no matching opener (RisuAI leaves those in the output as text), and `{{// ...}}` comments (which RisuAI sends to the model rather than removing), with clickable line numbers that jump the cursor there
- **Typo detection** for single curly braces near CBS keywords and stray `}}` without a matching `{{`

### Preset I/O
- **Import/Export** supporting `.risup`, `.risupreset`, and `.json` formats with full round-trip preservation
- **Flatten export** outputs the entire preset as a labeled `.txt` with raw CBS preserved, including the Custom Toggles source at the top
- **Unflatten import** reads a flattened `.txt` back in (also accepted by **Import**). Edit the text, reorder sections, or add new `--- [n] TYPE ... ---` sections, and the changes are merged into the loaded preset. All other preset settings are kept. Before applying, you get a summary of updated, added, and removed items. With no preset loaded, a minimal preset is built from the file
- **Typed prompt slot editing** for Persona, Description, Lorebook, Author Note, Memory, and Post Everything (edits the `innerFormat` field; Author Note also exposes `defaultText` via a field switcher)

### Control Panel
- **Custom Toggles parser** matching RisuAI's exact `parseToggleSyntax` behavior (strict `groupEnd`, `key=value=type=options` format)
- All control types supported: toggle, select, text, textarea, divider, caption, group/groupEnd
- **Warnings panel** flags common mistakes (lowercase `groupend`, unclosed groups, stray `groupEnd`) with line numbers and corrective advice
- Resizable textarea with persisted height across re-renders
- Inline Toggle Syntax reference

### Reference & UX
- **CBS Reference drawer** (book icon button) with 131 entries across 16 categories, checked against RisuAI's behaviour, full-text search across names/signatures/descriptions/aliases, operator tables for `#when` and `{{? ...}}`, code examples with expected output, and inter-entry "See also" links
- **Three-pane layout** (Prompt Navigator | Editor | Preview) with draggable dividers and collapsible sidebar
- **Independent font controls** via the `Aa` dropdown: Editor (px), Panel (px), UI scale (%)
- **Light/dark theme** toggle; theme and font sizes are remembered per browser
- **Unsaved-changes protection**: the browser warns before closing the tab with unexported edits, and importing another preset asks before discarding them
- **Preview copy** button

## Usage

Open `index.html` in any modern browser. No server, build step, or installation required. It is a single self-contained file: the libraries used for `.risup`/`.risupreset` files are bundled inside it, so it also works offline.

1. Click **Import** to load a `.risup`, `.risupreset`, or `.json` preset file
2. Browse prompt items in the **Prompt Navigator** (left sidebar). Both `plain`/`jailbreak`/`cot`/`chatML` slots and typed slots like `persona`/`description`/`lorebook`/`authornote` are editable.
3. Click any item to load it in the editor
4. Adjust toggles in the **Panel** tab to see how CBS conditionals resolve in real time. Values in the **Vars** tab act as the preset's default variables (what `{{getvar}}` returns when a variable hasn't been set)
5. Open the **CBS Reference** drawer for searchable documentation on every supported function and block
6. Click **Export** to save changes back to `.risup`/`.risupreset`/`.json`, or **Flatten** to produce a parseable text snapshot
7. To bring an edited flat file back (for example, after refining it with an AI), load the original preset, then click **Unflatten** and pick the `.txt`. Keep the `--- [n] ... ---` header lines intact, because they are how sections are matched back to prompt items

## CBS Syntax Reference

The built-in reference drawer covers every supported construct in detail. A quick orientation:

- **Identity**: `{{char}}`, `{{user}}`, `{{persona}}`, `{{description}}`, `{{scenario}}`, ...
- **Variables**: `{{getvar::name}}`, `{{getglobalvar::name}}`, `{{tempvar::name}}`, `{{settempvar::name::value}}`. `{{setvar}}`/`{{addvar}}` only run where RisuAI executes variable commands (scripts, triggers), not in prompt items; use tempvars there
- **Conditionals**: `{{#when::val::op::compare}}...{{:else}}...{{/when}}` with operators `is`/`isnot`/`var`/`vis`/`visnot`/`toggle`/`tis`/`tisnot`/`>`/`<`/`>=`/`<=`/`and`/`or`/`not`/`keep`/`legacy`; `{{#if condition}}...{{/if}}` and `{{#if_pure ...}}` (no trim) have no else branch
- **Calc** (RPN, not JS eval): `{{? expr}}` and `{{calc::expr}}` with `+ - * / % ^ = == != < > <= >= && || !` and parentheses. Single `=` works as equality; `$name` / `@name` read chat / global variables
- **Iteration**: `{{#each array as item}}...{{slot::item}}...{{/each}}`
- **Structural**: `{{#puredisplay}}` (replaces the deprecated `{{#pure}}`), `{{#escape}}`, `{{#code}}`, `{{#func name}}...{{arg::1}}...{{/func}}` called with `{{call::name::value}}`
- **Comments**: `{{comment::...}}` is removed from prompts; `{{// ...}}` is not
- **Math, strings, arrays, random (`{{random}}`, `{{pick}}`, `{{roll::20}}`, `{{dice::2d6}}`), time** and **escape** helpers for literal braces

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

## Development

The editor is a single `index.html` and needs no build step. Two optional Node scripts in `tools/` keep its CBS engine in step with RisuAI:

- `node tools/sync-risu.mjs <RisuAI checkout>` regenerates the bundled engine (the block between the `RISU-ENGINE` markers) from RisuAI's source, using the TypeScript compiler (`npm install -g typescript`). It fails if RisuAI's code starts needing something the editor's `RisuHost` doesn't provide.
- `node tools/check.mjs` runs the engine in Node and checks it against cases pinned to RisuAI's behaviour and every CBS Reference example with a stated output.

To update after a RisuAI release: `git clone --depth 1 https://github.com/kwaroran/RisuAI.git /tmp/RisuAI`, run the sync, run the check, and review any reference entries it reports.

## License

Copyright (C) 2026 tresbien-rai

This program is free software, licensed under the GNU General Public License version 3 (GPL-3.0). See [LICENSE](LICENSE) for the full text.

The CBS engine (parser, function registry and calculator) is generated from [RisuAI](https://github.com/kwaroran/RisuAI) by Kwaroran, and the preset encoding is derived from it; RisuAI is also licensed under GPL-3.0.

Bundled third-party libraries, included in `index.html` with their license notices:
- [fflate](https://github.com/101arrowz/fflate) 0.8.3, MIT License
- [@msgpack/msgpack](https://github.com/msgpack/msgpack-javascript) 2.8.0, ISC License
