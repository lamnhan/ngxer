<section id="head" data-note="AUTO-GENERATED CONTENT, DO NOT EDIT DIRECTLY!">

# @lamnhan/ngxer

**Tool for prerendering Angular apps**

</section>

<section id="tocx" data-note="AUTO-GENERATED CONTENT, DO NOT EDIT DIRECTLY!">

- [Getting started](#getting-started)
- [Command overview](#cli-command-overview)
- [Command reference](#cli-command-reference)
  - [`generate`](#command-generate)
  - [`init`](#command-init)
  - [`remove`](#command-remove)
  - [`report`](#command-report)
  - [`update`](#command-update)
  - [`help`](#command-help)
  - [`*`](#command-*)
- [Detail API reference](https://ngxer.lamnhan.com)


</section>

<section id="getting-started">

## Getting started

Install globally:

```sh
npm install -g @lamnhan/ngxer
```

Init the project:

```sh
ngxer init
```

Or, using npx:

```sh
npx @lamnhan/ngxer init
```

Edit `.ngxerrc.json`, then generate content:

```sh
ngxer generate
```

</section>

<section id="cli" data-note="AUTO-GENERATED CONTENT, DO NOT EDIT DIRECTLY!">

<h2><a name="cli-command-overview"><p>Command overview</p>
</a></h2>

Tool for prerendering Angular apps

- [`ngxer generate|g`](#command-generate)
- [`ngxer init|i [projectPath]`](#command-init)
- [`ngxer remove|r <paths...> --keep-cache`](#command-remove)
- [`ngxer report|log|l --detail`](#command-report)
- [`ngxer update|u <paths...> --live`](#command-update)
- [`ngxer help`](#command-help)
- [`ngxer *`](#command-*)

<h2><a name="cli-command-reference"><p>Command reference</p>
</a></h2>

<h3><a name="command-generate"><p><code>generate</code></p>
</a></h3>

Generate static content.

**Usage:**

```sh
ngxer generate
ngxer g
```

<h3><a name="command-init"><p><code>init</code></p>
</a></h3>

Add ngxer to a project.

**Usage:**

```sh
ngxer init [projectPath]
ngxer i [projectPath]
```

**Parameters:**

- `[projectPath]`: Custom path to the project

<h3><a name="command-remove"><p><code>remove</code></p>
</a></h3>

Remove a generated content.

**Usage:**

```sh
ngxer remove <paths...> --keep-cache
ngxer r <paths...> --keep-cache
```

**Parameters:**

- `<paths...>`: List of paths to be removed

**Options:**

- `-k, --keep-cache`: Remove HTML file, but keep cache.

<h3><a name="command-report"><p><code>report</code></p>
</a></h3>

Show generated statistics.

**Usage:**

```sh
ngxer report --detail
ngxer log --detail
ngxer l --detail
```

**Options:**

- `-d, --detail`: Show detail.

<h3><a name="command-update"><p><code>update</code></p>
</a></h3>

Update a static.

**Usage:**

```sh
ngxer update <paths...> --live
ngxer u <paths...> --live
```

**Parameters:**

- `<paths...>`: List of paths to be updated

**Options:**

- `-l, --live`: Re-rendering with live data.

<h3><a name="command-help"><p><code>help</code></p>
</a></h3>

Display help.

**Usage:**

```sh
ngxer help
```

<h3><a name="command-*"><p><code>*</code></p>
</a></h3>

Any other command is not suppoted.

**Usage:**

```sh
ngxer <cmd>
```

</section>

<section id="license" data-note="AUTO-GENERATED CONTENT, DO NOT EDIT DIRECTLY!">

## License

**@lamnhan/ngxer** is released under the [MIT](https://github.com/lamnhan/ngxer/blob/master/LICENSE) license.

</section>
