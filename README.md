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

### Method: `listArchives(): Archive[]`
List archives currently available on [data.ppy.sh](https://data.ppy.sh).

### Method: `downloadArchive(): string`
Download and extract the specified data archive to a local folder.

#### Params
| Required? | Type | Name | Description | Default |
| --- | --- | --- | --- | --- |
| **Yes** | `string` | `downloadDir` | A directory to extract archive data to. | `undefined` |
| **Yes** | `string` | `archiveName` | The name of a currently available archive on data.ppy.sh. See the output of `listArchives()` if unsure. | `undefined` |
| **Yes** | `function` | `progressCallback` | A callback to be invoked repeatedly as download/extraction progresses that receives `(loadedBytes, totalBytes)` params. | `undefined` |

### Method: `datasetsToSqlFiles(): void`
Get a map of dataset names to mode-specific sql dump file names

#### Params
| Required? | Type | Name | Description | Default |
| --- | --- | --- | --- | --- |
| **Yes** | `ModeName` | `mode` | The mode. | `osu` |

### Method: `extract(): void`
Download, extract, and parse data from `data.ppy.sh` into a preferred format.

#### Params
| Required? | Type | Name | Description | Default |
| --- | --- | --- | --- | --- |
| No | `Object` | `options` | Data extraction options. | `undefined` |
| No | `boolean` | `options.preserveDownloads` | Whether or not downloaded files should be preserved for future runs after the requested data is extracted. | `false` |
| No | `string` | `options.outputDir` | The path to the directory where output files (JSON, CSV) should be saved, relative to the current working directory.<br><br>If not specified, an `osu-data` folder will be created in the current working directory and used. | `undefined` |
| No | `string` | `options.downloadDir` | The path to the directory where data files should be downloaded, relative to the current working directory. A folder for the downloaded archive will be created inside this directory.<br><br>If not specified, defaults to the value of `outputDir`. | `undefined` |
| No | `'osufiles'\|'performance'` | `options.type` | The type of archive to extract, where `osufiles` is an archive of every ranked beatmap's `.osu` file, and `performance` is an archive of various osu! database table dumps. | `undefined` |
| No | `string` | `options.date` | The date, in `YYYY-MM` format, of the archive to extract, or `latest` to use the latest available. | `'latest'` |
| No | `DatasetName[]` | `options.datasets` | An list of datasets to extract, or `['all']` to extract all datasets. | `['all']` |
| No | `ModeName[]` | `options.mode` | The game mode to extract datasets for. This only applies if you're extracting user/score data. | `'osu'` |
| No | `'top'\|'random'` | `options.sampleMethod` | The method used to sample users for performance data. | `'top'` |
| No | `'1k'\|'10k'` | `options.sampleCount` | The number of users to sample for performance data. | `'1k'` |
| No | `Format` | `options.format` | The format to output data in. | `'csv'` |

### Type: `ModeName`
`'osu'\|'taiko'\|'catch'\|'mania'`

An osu! game mode/ruleset.

### Type: `DatasetName`
`'beatmap-difficulty-attribs'\|'beatmap-difficulty'\|'beatmap-failtimes'\|'beatmap-performance-blacklist'\|'beatmaps'\|'beatmapsets'\|'counts'\|'difficulty-attribs'\|'highscores'\|'playcounts'\|'user-stats'\|'users'\|'scores'\|'all'`

The name of an extracted dataset.

### Type: `Format`
`'json'\|'ndjson'\|'jsonl'\|'yaml'\|'yml'\|'csv'\|'tsv'\|'txt'`

The name of a supported output format.

### Type: `Archive`
`Object`

Represents a `data.ppy.sh` archive entry.

| Type | Name | Description |
| --- | --- | --- |
| `string` | `name` | The file name of the archive. |
| `string` | `url` | The fully qualified URL to this archive file. |
| `string` | `date` | The date on which this archive was created, in `YYYY-MM-DD` format. |
| `type` | `type` | The type of data contained in this archive. Possibilities are:<>br<>br- `osufiles`: An archive containing every ranked beatmap's `.osu` file, currently numbering over 200k.<>br- `performance`: An archive containing `.sql` dumps of several osu! database tables for beatmaps, users, scores, etc. All archives of this type include data for all ranked beatmaps, but users and scores depend on the mode, performance selection, and count.<>br- `unknown`: Any other archive that doesn't match a known naming scheme. |
| `string` | `mode` | The game mode that this dump targets if `type` is `performance`. |
| `Object` | `performance` | Performance specifics when `type` is `performance`. |
| `string` | `performance.sample` | How players were sampled for performance data in this dump. Either `top` for top players or `random` for random players. |
| `number` | `performance.count` | The number of players that were sampled for performance data in this dump. The dump will only include data for this number of players. |


### Method: `listArchives(): Archive[]`
List archives currently available on [data.ppy.sh](https://data.ppy.sh).

### Method: `downloadArchive(): string`
Download and extract the specified data archive to a local folder.

#### Params
| Required? | Type | Name | Description | Default |
| --- | --- | --- | --- | --- |
| **Yes** | `string` | `downloadDir` | A directory to extract archive data to. | `undefined` |
| **Yes** | `string` | `archiveName` | The name of a currently available archive on data.ppy.sh. See the output of `listArchives()` if unsure. | `undefined` |
| **Yes** | `function` | `progressCallback` | A callback to be invoked repeatedly as download/extraction progresses that receives `(loadedBytes, totalBytes)` params. | `undefined` |

### Method: `datasetsToSqlFiles(): void`
Get a map of dataset names to mode-specific sql dump file names

#### Params
| Required? | Type | Name | Description | Default |
| --- | --- | --- | --- | --- |
| **Yes** | `ModeName` | `mode` | The mode. | `osu` |

### Method: `extract(): void`
Download, extract, and parse data from `data.ppy.sh` into a preferred format.

#### Params
| Required? | Type | Name | Description | Default |
| --- | --- | --- | --- | --- |
| No | `Object` | `options` | Data extraction options. | `undefined` |
| No | `boolean` | `options.preserveDownloads` | Whether or not downloaded files should be preserved for future runs after the requested data is extracted. | `false` |
| No | `string` | `options.outputDir` | The path to the directory where output files (JSON, CSV) should be saved, relative to the current working directory.<br><br>If not specified, an `osu-data` folder will be created in the current working directory and used. | `undefined` |
| No | `string` | `options.downloadDir` | The path to the directory where data files should be downloaded, relative to the current working directory. A folder for the downloaded archive will be created inside this directory.<br><br>If not specified, defaults to the value of `outputDir`. | `undefined` |
| No | `'osufiles'\|'performance'` | `options.type` | The type of archive to extract, where `osufiles` is an archive of every ranked beatmap's `.osu` file, and `performance` is an archive of various osu! database table dumps. | `undefined` |
| No | `string` | `options.date` | The date, in `YYYY-MM` format, of the archive to extract, or `latest` to use the latest available. | `'latest'` |
| No | `DatasetName[]` | `options.datasets` | An list of datasets to extract, or `['all']` to extract all datasets. | `['all']` |
| No | `ModeName[]` | `options.mode` | The game mode to extract datasets for. This only applies if you're extracting user/score data. | `'osu'` |
| No | `'top'\|'random'` | `options.sampleMethod` | The method used to sample users for performance data. | `'top'` |
| No | `'1k'\|'10k'` | `options.sampleCount` | The number of users to sample for performance data. | `'1k'` |
| No | `Format` | `options.format` | The format to output data in. | `'csv'` |

### Type: `ModeName`
`'osu'\|'taiko'\|'catch'\|'mania'`

An osu! game mode/ruleset.

### Type: `DatasetName`
`'beatmap-difficulty-attribs'\|'beatmap-difficulty'\|'beatmap-failtimes'\|'beatmap-performance-blacklist'\|'beatmaps'\|'beatmapsets'\|'counts'\|'difficulty-attribs'\|'highscores'\|'playcounts'\|'user-stats'\|'users'\|'scores'\|'all'`

The name of an extracted dataset.

### Type: `Format`
`'json'\|'ndjson'\|'jsonl'\|'yaml'\|'yml'\|'csv'\|'tsv'\|'txt'`

The name of a supported output format.

### Type: `Archive`
`Object`

Represents a `data.ppy.sh` archive entry.

| Type | Name | Description |
| --- | --- | --- |
| `string` | `name` | The file name of the archive. |
| `string` | `url` | The fully qualified URL to this archive file. |
| `string` | `date` | The date on which this archive was created, in `YYYY-MM-DD` format. |
| `type` | `type` | The type of data contained in this archive. Possibilities are:<>br<>br- `osufiles`: An archive containing every ranked beatmap's `.osu` file, currently numbering over 200k.<>br- `performance`: An archive containing `.sql` dumps of several osu! database tables for beatmaps, users, scores, etc. All archives of this type include data for all ranked beatmaps, but users and scores depend on the mode, performance selection, and count.<>br- `unknown`: Any other archive that doesn't match a known naming scheme. |
| `string` | `mode` | The game mode that this dump targets if `type` is `performance`. |
| `Object` | `performance` | Performance specifics when `type` is `performance`. |
| `string` | `performance.sample` | How players were sampled for performance data in this dump. Either `top` for top players or `random` for random players. |
| `number` | `performance.count` | The number of players that were sampled for performance data in this dump. The dump will only include data for this number of players. |


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
