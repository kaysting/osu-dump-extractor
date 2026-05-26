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
                                  "jsonl", "csv", "yaml", "yml", "txt", "tsv", default: "csv")
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

## Node API Usage

Quick usage example:

```js
const OsuDumpExtractorAPI = require('osu-dump-extractor');

async function main() {
    // Create a new instance
    const ode = new OsuDumpExtractorAPI({
        enableLogging: true // Enable logging progress if you want (disabled by default)
    });

    // You'll generally just use the extract() method, which functions the same as the CLI
    // Here we'll extract beatmap data and a list of the top 1k mania players in NDJSON format
    // This configuration will create a default output directory and pull the latest data
    await ode.extract({
        mode: 'mania',
        datasets: ['users', 'beatmaps', 'beatmapsets'],
        format: 'ndjson',
        sampleCount: '1k' // this is the default value
    });

    console.log('Done!');
}
main();
```

## Node API Docs

{{api_docs}}

## AI Disclosure

This codebase is 95% human-written and 99% human-reviewed.

Google Gemini implemented this project's SQL parser, which is the backbone of converting downloaded osu! database table dumps into other formats. Gemini also assisted in broad architectural brainstorming and debugging, as usual.
