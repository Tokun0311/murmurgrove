# People / Institutions navigation update (2026-11-17)

- People: added live name search, A–Z filters, and Japanese kana-row filters. Empty index buttons are disabled. Search and filters work together.
- Added optional `reading` and `sortName` metadata to the People content schema and populated these fields for existing Japanese-language names to enable kana lookup and Latin sorting. Preserve each person's displayed name.
- Institutions: added country/region filter buttons matching Exhibitions style. All is default; geography/city grouping and interactive map remain unchanged.
- The institution filter is placed directly above the list, below the map.
- Future People entries in Japanese should include `reading` (hiragana) and optionally `sortName` (romanized family name first) in frontmatter.
