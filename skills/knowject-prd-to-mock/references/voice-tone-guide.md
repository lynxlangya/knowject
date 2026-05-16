# Voice tone guide

`brand.voice` from `context.yaml` drives every piece of microcopy in the mock.

## Mapping

| Voice value (normalized) | Greeting | CTA buttons | Empty / error |
|---|---|---|---|
| `formal` / `专业` / `正式` | "Welcome back" / "欢迎回来" | "Submit Order" / "提交订单" | "Information unavailable" / "信息暂不可用" |
| `concise` / `简洁` / `中性` | "Hi" / "你好" | "Order" / "下单" | "No data" / "暂无数据" |
| `friendly` / `亲切` / `口语` | "Hey there!" / "嗨，你来啦" | "Go for it" / "下单走起" | "Nothing here yet" / "还没有内容呢" |
| `professional, concise` (hybrid) | "Hi, <name>" / "你好，<name>" | "Continue" / "继续" | "No data" / "暂无数据" |
| Custom free-text string | use the string verbatim as the brief - pick the closest row above and adjust |

## Rules

1. **Locale wins over voice for language.** `voice: friendly` + `locale: en` -> English friendly. `voice: friendly` + `locale: zh` -> Chinese friendly. Never mix.
2. **No tone mixing within one mock.** Pick one row, apply consistently.
3. **Exclamation marks:** allowed in `friendly`, forbidden in `formal` / `concise`, at most one per mock in hybrid.
4. **Emoji:** allowed only in `friendly`, and only when the locale's cultural norm allows. Skip emoji in `formal Chinese` even if voice trended friendly.
5. **Numbers:** voice does not change number formatting; always follow the locale (1,000 vs 1 000).
6. **Brand name treatment:** show `project_name` verbatim - never translate it. In `zh` locale with an English brand, render as "<英文名>" (no quotes added).

## Sanity check before writing the mock

Read your generated copy aloud once mentally. If a phrase feels two rows away from the chosen voice value, rewrite it. The Skill loses its differentiation the moment the mock sounds like generic AI output.
