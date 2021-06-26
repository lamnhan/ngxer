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

<section id="features">

## This is this for?

This tool is use to preprender Angular apps, so that you do not need to use SSR and can be deploy to any static hosting.

- No SSR needed
- I18N prerender
- Firebase Hosting i18n supported
- No script and legacy client
- In-app splashcreen
- Prerender data forwading
- Site map generation

</section>

<section id="steps">

## Steps

Hint, use can avoid theses steps by using pre-build app with [Mola](https://mola.lamnhan.com).

See an example project at: <https://github.com/themolacms/starter-blank>

### Prerequirement

Only ANGULAR, you hear me right the Angular gang.

Database render only support Firestore for now.

### Add config

```sh
ngxer init
```

The file `.ngxerrc.json` is added to the project root.

Open the file and set out path and app url:

```json
{
  "out": "...",
  "url": "..."
}
```

### Modify index.html

See the example: <https://github.com/themolacms/starter-blank/blob/main/src/index.html>

Add schema to html the tag:

```html
<html itemscope itemtype="http://schema.org/WebPage" lang="en">
```

Add all the meta tags, see the example above:

```html
<!-- Meta tags -->
<meta name="description" content="The Starter Blank theme preview.">
<link rel="canonical" href="https://starter-blank-preview.lamnhan.com/">
<!-- ... -->
```

Note, same property tags must have the same value. For example, the tag `name="description"` and `itemprop="description"` have the same value. Tip: use VSCode `Ctrl+D` to select and replace all.

### Modify app.component.html

The main page content must be put under a `main` tag.

```html
<main id="page-container">
  <router-outlet></router-outlet>
</main>
```

If not you must specify the `contentBetweens` for page content extraction (the option available but not sure):

```json
{
  "contentBetweens": ['</router-outlet>', '</section>']
}
```

### Path render

// TODO

### Database render

// TODO

### Content template

It a HTML content or file, with the id of `app-prerender` and a placeholder to be replaced with a page actual content.

```html
<div id="app-prerender"><!--PRERENDER_CONTENT_PLACEHOLDER--></div>
```

#### Single locale

Add `ngxer/template.html`.

Set config:

```json
{
  "contentTemplate": "ngxer/template.html",
}
```

#### Multiple locales

Add files to `ngxer/templates`.

```txt
ngxer/
  templates/
    en-US.html
    vi-VN.html
    ...
```

Set config, (`@` will be replace with `ngxer/`):

```json
{
  "contentTemplate": {
    "en-US": "@templates/en-US.html",
    "vi-VN": "@templates/vi-VN.html"
  }
}
```

### Home content

Any HTML text or file is used for home page.

#### Single locale

Add `ngxer/home.html`.

Set config:

```json
{
  "homePage": "ngxer/home.html"
}
```

#### Multiple locales

Add files to `ngxer/homes`

```txt
ngxers/
  homes/
    en-US.html
    vi-VN.html
    ...
```

Set config:

```json
{
  "homePage": {
    "en-US": {
      "content": "@homes/en-US.html"
    },
    "vi-VN": {
      "content": "@homes/vi-VN.html",
      "metas": {
        "title": "...",
        "description": "..."
      }
    }
  }
}
```

### Save sitemap

To generate sitemap:

```json
{
  "sitemap": true
}
```

### Localized indexes

```json
{
  "i18nIndexes": true
}
```

### Forward data

To allow app access prerender data:

```json
{
  "includeSessionData": true
}
```

To access data:

```js
const doc = sessionStorage.getItem('prerender_data:<id>');
```

### Database limit

Control number of document on the first time and next time fetching.

```json
{
  "databaseLimitFirstTime": 500,
  "databaseLimit": 15
}
```

### Splashcreen

See example: <https://github.com/themolacms/starter-blank/blob/main/src/index.html>

Splashscreen provide by [@lamnhan/nguix-starter](https://nguix-starter.lamnhan.com/splashscreens)

To turn of splashscreen after N seconds:

```json
{
  "splashscreenTimeout": 15
}
```

You can translate splashscreen texts by using the class `class="locale-code"`:

```html
<style>
  #app-splash-screen.en-US .only.en-US {display: inline-block !important;}
  #app-splash-screen.vi-VN .only.vi-VN {display: inline-block !important;}
</style>

<div id="app-splash-screen">
  <span class="en-US">Hello</span>
  <span class="vi-VN">Xin chào</span>
</div>
```

### Final touches

- Add [`robots.txt`](https://github.com/themolacms/starter-blank/blob/main/src/robots.txt) to `src/`. And including in angular.json `assets`.

</section>

<section id="cli" data-note="AUTO-GENERATED CONTENT, DO NOT EDIT DIRECTLY!">

<h2><a name="cli-command-overview"><p>Command overview</p>
</a></h2>

Tool for prerendering Angular apps

- [`ngxer generate|g`](#command-generate)
- [`ngxer init|i [projectPath]`](#command-init)
- [`ngxer remove|x <paths...> --keep-cache`](#command-remove)
- [`ngxer report|r --detail`](#command-report)
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
ngxer x <paths...> --keep-cache
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
ngxer r --detail
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
