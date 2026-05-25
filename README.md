# osu-dump-extractor

D CLI and Node API to download, extract, and format osu! data archives from [data.ppy.sh](https://data.ppy.sh) into common formats.

- [CLI](#cli)
- [Node API](#node-api)
- [Datasets](#datasets)

## CLI

With Node.js installed on your system, you can use the API via `npx`:

```
npx dump-osu --help
```

CLI usage is as follows:

```
  -m, --mode <MODE>               Specify the game mode/ruleset to get data in. (choices: "osu", "taiko", "catch",
                                  "mania", default: "osu")
  -t, --type <TYPE>               Specify the type of archive to download, either "performance" or "osufiles".
                                  - performance: Contains dumps of various osu! database tables.
                                  - osufiles: Contains .osu beatmap files for every ranked map. (choices: "performance",
                                  "osufiles", default: "performance")
  -s, --datasets <DATASETS...>    Specify a list of datasets to extract from a data archive of type performance. Specify
                                  "all" if you want all datasets extracted. This has no effect when the type is
                                  osufiles. (choices: "beatmap-difficulty-attribs", "beatmap-difficulty",
                                  "beatmap-failtimes", "beatmap-performance-blacklist", "beatmaps", "beatmapsets",
                                  "counts", "difficulty-attribs", "highscores", "beatmap-playcounts", "user-stats",
                                  "users", "scores", "all", default: "all")
  -f, --format <FORMAT>           Specify the format extracted data should be saved in. (choices: "json", "ndjson",
                                  "csv", "yaml", "yml", "txt", "tsv", default: "json")
  --sm, --sample-method <METHOD>  Specify the method used to sample users for performance data. (choices: "top",
                                  "random", default: "top")
  --sc, --sample-count <COUNT>    Specify the number of users to sample for performance data. (choices: "1k", "10k",
                                  default: "1k")
  -d, --date <DATE>               Specify the month whose archive to extract, in YYYY-MM format, or latest to use the
                                  most recent archive. (default: "latest")
  --preserve                      If set, downloaded files will be preserved so future runs targeting the same archive
                                  can skip downloading. (default: false)
  -h, --help                      display help for command
```

## Node API

## Datasets

Below are all of the dataset options you can choose from when extracting performance archives.

As the structure of these datasets changes over time, they will not be strictly documented here. Extract datasets and review their structures yourself before accessing them programmatically.

- `beatmap-difficulty-attribs`:
- `beatmap-difficulty`:
- `beatmap-failtimes`:
- `beatmap-performance-blacklist`:
- `beatmaps`: Contains data for individual beatmaps, exclusive of the sets they belong to.
- `beatmapsets`: Contains data for beatmapsets, exclusive of the individual beatmaps they contain.
- `counts`: Contains various global osu! infrastructure statistics.
- `difficulty-attribs`:
- `highscores`:
- `beatmap-playcounts`:
- `user-stats`:
- `users`: Contains minimal data for each user sampled in the dump.
- `scores`: Contains data for every score each user sampled in the dump has achieved.
