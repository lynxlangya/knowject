# UI library profiles

The framework profile's `import_template` is the dispatcher - this doc explains how each library renders common primitives so the skeleton output looks idiomatic.

## `antd@6`

| Design primitive | antd component | Notes |
|---|---|---|
| Card with header + body | `<Card>` (with `title` prop) | use `bordered={false}` for borderless variants |
| Button (primary) | `<Button type="primary">` | |
| Button (secondary) | `<Button>` | |
| Form input | `<Input>` / `<Input.TextArea>` | |
| Status pill | `<Tag color="...">` | colors: `blue`, `green`, `red`, `gold` |
| Avatar | `<Avatar>` | |
| Grid | `<Row gutter={[16, 16]}>` + `<Col span={N}>` | use Tailwind grid if the design has a non-12-col layout |

Tailwind importance: write `mb-1!`, never `!mb-1` (project AGENTS.md rule survives in shipped projects; Skill should respect it when emitting Tailwind classnames).

## `mui@5+`

| Design primitive | mui component |
|---|---|
| Card | `<Card>` + `<CardContent>` |
| Button (primary) | `<Button variant="contained">` |
| Button (secondary) | `<Button variant="outlined">` |
| Form input | `<TextField>` |
| Status pill | `<Chip color="primary">` |
| Avatar | `<Avatar>` |
| Grid | `<Grid container spacing={2}>` + `<Grid item xs={N}>` |

## `shadcn` (any version)

| Design primitive | shadcn import path |
|---|---|
| Card | `@/components/ui/card` |
| Button | `@/components/ui/button` |
| Input | `@/components/ui/input` |
| Badge | `@/components/ui/badge` |
| Avatar | `@/components/ui/avatar` |

Shadcn components are unstyled-by-default; pair with Tailwind for layout. Variant props (e.g., `<Button variant="secondary">`) are how shadcn handles primary/secondary, not separate components.

## `chakra@2+`

| Design primitive | chakra component |
|---|---|
| Card | `<Box bg="white" rounded="lg" shadow="sm" p={6}>` (chakra <Card> is v3+; v2 uses Box) |
| Button (primary) | `<Button colorScheme="blue">` |
| Button (secondary) | `<Button variant="outline">` |
| Input | `<Input>` |

## `naive@2+`

| Design primitive | naive component |
|---|---|
| Card | `<NCard>` |
| Button | `<NButton type="primary">` / `<NButton>` |
| Input | `<NInput>` |
| Tag | `<NTag>` |

## `mantine@7+`

| Design primitive | mantine component |
|---|---|
| Card | `<Card>` |
| Button | `<Button>` |
| Input | `<TextInput>` |
| Badge | `<Badge>` |

## Fallback (`import_template` is the React default)

If `ui_library` is anything else, output plain React + Tailwind. No library imports beyond `react`. Use `<div>` with Tailwind classes for every primitive. Add a `// TODO(knowject-read-design): align to your UI library` comment at the top of each component file.

## Styling layer

| `styling` value | Class attribute strategy |
|---|---|
| `tailwind` | use Tailwind utility classes; respect the `mb-1!` (not `!mb-1`) form |
| `css-modules` | one `.module.css` file per component, import as `styles.<class>`; emit class names but leave the CSS file empty (TODO comment) |
| `styled-components` | import `styled` from `styled-components`; declare one styled component per major slot |
| `emotion` | `@emotion/styled` analog of styled-components |
| `custom` | plain class strings, no specific framework |
