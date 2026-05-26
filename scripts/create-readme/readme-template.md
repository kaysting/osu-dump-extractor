# osu-dump-extractor

A CLI and Node API to download, extract, and format osu! data archives from [data.ppy.sh](https://data.ppy.sh) into common formats.

data.ppy.sh provides archives of the following data each month:

- Data for every beatmap and beatmapset with a leaderboard
- The raw `.osu` beatmap file for every beatmap with a leaderboard
- Up to 10,000 top or random players in any mode (names and IDs)
- All scores set by up to the top or random 10,000 players in any mode

## CLI

With Node.js installed on your system, you can use the API via `npx`:

```
npx dump-osu --help
```

CLI usage is as follows:

```
Options:
  -m, --mode <MODE>               Specify the game mode/ruleset to get data in. (choices: "osu", "taiko", "catch",
                                  "mania", default: "osu")
  -t, --type <TYPE>               Specify the type of archive to download, either "performance" or "osufiles".
                                  - performance: Contains dumps of various osu! database tables.
                                  - osufiles: Contains .osu beatmap files for every ranked map. (choices: "performance",
                                  "osufiles", default: "performance")
  -s, --datasets <DATASETS...>    Specify a list of datasets to extract from a data archive of type performance. Specify
                                  "all" if you want all datasets extracted. This has no effect when the type is
                                  osufiles. (choices: "all", "beatmap-difficulty-attribs", "beatmap-difficulty",
                                  "beatmap-failtimes", "beatmap-performance-blacklist", "beatmaps", "beatmapsets",
                                  "counts", "difficulty-attribs", "highscores", "playcounts", "user-stats", "users",
                                  "scores", default: ["all"])
  -f, --format <FORMAT>           Specify the format extracted data should be saved in. (choices: "json", "ndjson",
                                  "jsonl", "csv", "yaml", "yml", "txt", "tsv", default: "json")
  --sm, --sample-method <METHOD>  Specify the method used to sample users for performance data. (choices: "top",
                                  "random", default: "top")
  --sc, --sample-count <COUNT>    Specify the number of users to sample for performance data. (choices: "1k", "10k",
                                  default: "1k")
  -d, --date <DATE>               Specify the month whose archive to extract, in YYYY-MM format, or latest to use the
                                  most recent archive. (default: "latest")
  -o, --odir <DIRECTORY>          Specify the directory to save extracted data to. (default: "./osu-dump-extractor")
  --ddir <DIRECTORY>              Specify the directory to save downloaded archive data to.
  -p, --preserve                  If set, downloaded files will be preserved so future runs targeting the same archive
                                  can skip downloading. (default: false)
  -h, --help                      display help for command
```

## Node API

This package provides a class with all functionality attached. Create a new instance like so:

```js
const OsuDumpExtractorAPI = require('osu-dump-extractor');

const dumpExtractor = new OsuDumpExtractorAPI();
```

{{api_functions}}

{{api_types}}

## Datasets

Below are all of the dataset options you can choose from when extracting performance archives.

As the structure of these datasets changes over time, they will not be strictly documented here. Extract datasets and review their structures yourself before accessing them programmatically. These descriptions are largely based on assumptions taken from each schema.

- `beatmap-difficulty-attribs`: Contains difficulty attributes for each beatmap. See `difficulty-attribs` for the meaning of each attribute.
- `beatmap-difficulty`: Contains star ratings for each beatmap.
- `beatmap-failtimes`: Contains the number of players who failed and quit (exited) at each percentage completion of each beatmap. Each entry has properties for the beatmap ID, type (fail or exit), and p1 through p100, representing the points in the map.
- `beatmap-performance-blacklist`: Contains beatmaps blacklisted from performance. Currently seems to be empty.
- `beatmaps`: Contains data for individual beatmaps, exclusive of the sets they belong to.
- `beatmapsets`: Contains data for beatmapsets, exclusive of the individual beatmaps they contain.
- `counts`: Contains various global osu! infrastructure statistics.
- `difficulty-attribs`: Maps each difficulty attribute ID to a label and visibility status. See `beatmap-difficulty-attribs` for data using these attributes.
- `highscores`: Contains data for each sampled user's top scores.
- `playcounts`: Contains the number of times each sampled user has played each beatmap.
- `user-stats`: Contains total stats for each sampled user.
- `users`: Contains minimal data for each user sampled in the dump.
- `scores`: Contains data for every score each user sampled in the dump has achieved.

## AI Disclosure

This codebase is 95% human-written and 99% human-reviewed.

Google Gemini implemented this project's SQL parser, which is the backbone of converting downloaded osu! database table dumps into other formats. Gemini also assisted in broad architectural brainstorming and debugging, as usual.
