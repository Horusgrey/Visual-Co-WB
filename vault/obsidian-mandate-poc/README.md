# The Obsidian Mandate — POC Vault
**Project ID**: VCO-POC-042126-01

Six isolated canvases ingested into the Visual Co-Pilot system, plus the derived
artifacts needed to make their references resolve and to load them into the app.

## Layout

```
vault/obsidian-mandate-poc/
├── canvases/                          # SOURCE OF TRUTH — the six canvases, verbatim
│   ├── 01_Production_Bible.md         # World rules (target: Scenes tab)
│   ├── 02_Character_Bible_THORNE.md   # Soul data (target: Script tab / Context Engine)
│   ├── 02_Character_Bible_LIN.md
│   ├── 03_Character_Costume_Set_THORNE.md  # Image spec (target: Characters tab / EDNA)
│   ├── 03_Character_Costume_Set_LIN.md
│   └── Vault_Character_Registry_POC.csv    # Index (GENERATED VIEW — see rule below)
├── json/                              # DERIVED — resolves the four dangling refs
│   ├── soul_json_thorne_v1.json
│   ├── app_json_thorne_v1.json
│   ├── soul_json_lin_v1.json
│   └── app_json_lin_v1.json
└── cartridge/
    └── obsidian-mandate-poc.visualco.json  # Load via Home > Import
```

## Canvas → System field mapping

| Canvas field | System field | Fidelity |
|---|---|---|
| Character Bible: Name / Role | `Character.name` / `Character.role` | Lossless |
| Character Bible: Bio + Voice + Drive + Posture | `Character.bio` (concatenated) | Lossy — voice rules become flavor text; the script engine reads `bio` as one blob, and TTS ignores it entirely (single hardcoded voice) |
| Costume Set: Render Prompt Core + Costume Locks | `Character.lookPrompt` | Lossless, but world locks had to be baked in by hand (see gaps) |
| Production Bible: aesthetic/location/negative rules | — (no world field in schema) | **Unmapped** — folded manually into each `lookPrompt`; carried in cartridge `worldBible` key, which the app preserves but never reads |
| Production Bible: Negative Prompt rules | — (no negative-prompt channel) | **Unmapped** — `generateImage()` sends a single positive prompt string to Imagen; negatives were rewritten as positive constraints ("pristine and orderly, formal dress only, zero natural light") |
| Registry: Status=LOCKED / Version | — | **Dropped** — lock semantics are not machine-enforced anywhere |
| Soul/Appearance JSON refs | `json/*.json` | Were dangling in all four referencing documents; now materialized here |

## Vault rules

1. **Canvases are the only editable truth.** If EDNA updates a costume, it edits
   `03_Character_Costume_Set_*.md` only.
2. **`json/` and the CSV registry are derived views.** Regenerate them from the
   canvases; never hand-edit them independently, or they drift (the registry
   already truncates the portrait prompts with `...`).
3. **The cartridge is a build artifact** of canvases + json. Rebuild it after any
   canvas change before re-importing.
