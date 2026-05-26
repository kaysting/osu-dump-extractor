const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const readline = require('readline');
const tar = require('tar');
const bz2 = require('unbzip2-stream');
const axios = require('axios');
const { JSDOM } = require('jsdom');
const SqlToJson = require('./utils/parseSqlFile');
const sqlConverter = require('./utils/sqlConverter');

/**
 * Represents a `data.ppy.sh` archive entry.
 * @typedef {Object} Archive
 * @property {string} name The file name of the archive.
 * @property {string} url The fully qualified URL to this archive file.
 * @property {string} date The date on which this archive was created, in `YYYY-MM-DD` format.
 * @property {type} type
 * The type of data contained in this archive. Possibilities are:
 *
 * - `osufiles`: An archive containing every ranked beatmap's `.osu` file, currently numbering over 200k.
 * - `performance`: An archive containing `.sql` dumps of several osu! database tables for beatmaps, users, scores, etc. All archives of this type include data for all ranked beatmaps, but users and scores depend on the mode, performance selection, and count.
 * - `unknown`: Any other archive that doesn't match a known naming scheme.
 *
 * @property {string} mode The game mode that this dump targets if `type` is `performance`.
 * @property {Object} performance Performance specifics when `type` is `performance`.
 * @property {string} performance.sample How players were sampled for performance data in this dump. Either `top` for top players or `random` for random players.
 * @property {number} performance.count The number of players that were sampled for performance data in this dump. The dump will only include data for this number of players.
 */

class OsuDumpExtractorAPI {
    archiveListCache = [];
    lastArchiveListFetch = 0;

    /**
     * Create a new osu-data-extractor API instance.
     * @param {Object} opts API options.
     * @param {boolean} opts.enableLogging Whether or not the API should log what's happening. Defaults to `false`.
     * @param {string} opts.baseUrl The base URL to list and download archives from instead of `https://data.ppy.sh`.
     */
    constructor({ enableLogging = false, baseUrl = 'https://data.ppy.sh' } = {}) {
        this.isLoggingEnabled = enableLogging ?? false;
        this.baseUrl = baseUrl ?? 'https://data.ppy.sh';
    }

    log(...args) {
        if (!this.isLoggingEnabled) return;
        console.log(`[osu-dump-extractor]`, ...args);
    }

    logOverwrite(message) {
        readline.cursorTo(process.stdout, 0);
        readline.clearLine(process.stdout, 1);
        process.stdout.write(`[osu-dump-extractor] ${message}`);
        readline.cursorTo(process.stdout, 0);
    }

    /**
     * List archives currently available on [data.ppy.sh](https://data.ppy.sh).
     * @returns {Archive[]}
     */
    async listArchives() {
        /*
            This function operates on the assumption that the listing contains files named like so:
            2026_05_01_osu_files.tar.bz2
            2026_05_01_performance_catch_random_10000.tar.bz2
            2026_05_01_performance_catch_top_1000.tar.bz2
            2026_05_01_performance_catch_top_10000.tar.bz2
            2026_05_01_performance_mania_random_10000.tar.bz2
            2026_05_01_performance_mania_top_1000.tar.bz2
            2026_05_01_performance_mania_top_10000.tar.bz2
            2026_05_01_performance_osu_random_10000.tar.bz2
            2026_05_01_performance_osu_top_1000.tar.bz2
            2026_05_01_performance_osu_top_10000.tar.bz2
            2026_05_01_performance_taiko_random_10000.tar.bz2
            2026_05_01_performance_taiko_top_1000.tar.bz2
            2026_05_01_performance_taiko_top_10000.tar.bz2
        */

        // Return cached list immediately if it's not stale
        if (Date.now() - this.lastArchiveListFetch < 1000 * 60 * 60) {
            return [...this.archiveListCache];
        }

        // Request html
        this.log(`Fetching list of available archives from data.ppy.sh...`);
        const res = await axios.get(this.baseUrl);

        // Create a dom and select the links
        const dom = new JSDOM(res.data);
        const document = dom.window.document;
        const anchors = document.querySelectorAll('pre a');

        // Loop through the links and collect archive info
        const entries = [];
        for (const a of anchors) {
            // Get the base file name and skip if it's not an archive
            const name = path.basename(a.href);
            if (!name.toLowerCase().endsWith('.tar.bz2')) continue;

            // Build entry
            /** @type {Archive} */
            const entry = {
                name,
                url: path.join(this.baseUrl, name),
                date: '',
                type: 'unknown',
                mode: null,
                performance: { sample: null, count: 0 }
            };

            // Parse filename into entry
            const parts = name.split('.')[0].split('_');
            entry.date = `${parts[0]}-${parts[1]}-${parts[2]}`;
            if (`${parts[3]}${parts[4]}` == 'osufiles') {
                entry.type = 'osufiles';
            } else if (parts[3] == 'performance') {
                entry.type = 'performance';
                entry.mode = parts[4];
                entry.performance = {
                    sample: parts[5],
                    count: Number(parts[6])
                };
            }

            // Push to list
            entries.push(entry);
        }

        // Update cache
        this.archiveListCache = entries;
        this.lastArchiveListFetch = Date.now();
        this.log(`Parsed ${entries.length} archive entries from data.ppy.sh`);

        return [...entries];
    }

    /**
     * Download and extract the specified data archive to a local folder.
     * @param {string} downloadDir A directory to extract archive data to.
     * @param {string} archiveName The name of a currently available archive on data.ppy.sh. See the output of `listArchives()` if unsure.
     * @param {Function} progressCallback A callback to be invoked repeatedly as download/extraction progresses that receives `(loadedBytes, totalBytes)` params.
     * @returns {string}
     */
    downloadArchive(downloadDir, archiveName, progressCallback) {
        return new Promise(async (resolve, reject) => {
            // Make sure download dir exists
            if (!fs.existsSync(downloadDir)) return reject(`Download directory doesn't exist: ${downloadDir}`);

            // Make sure archive is valid
            const archives = await this.listArchives();
            const archiveEntry = archives.find(d => d.name == archiveName);
            if (!archiveEntry) {
                return reject(`Archive ${archiveName} is unavailable.`);
            }

            // Start download and get stream
            const stream = await axios({
                method: 'GET',
                url: archiveEntry.url,
                responseType: 'stream',
                onDownloadProgress: e => {
                    if (progressCallback) progressCallback(e.loaded, e.total);
                }
            });

            // Pipe download stream through bz2 and tar extractors
            const extraction = stream.data.pipe(bz2()).pipe(
                tar.x({
                    cwd: downloadDir,
                    strip: 1
                })
            );

            // Handle extraction events
            extraction.on('finish', () => {
                resolve(downloadDir);
            });
            extraction.on('error', err => {
                reject(`Error during extraction: ${err}`);
            });
        });
    }

    /**
     * Get a map of dataset names to mode-specific sql dump file names
     * @param {'osu'|'taiko'|'catch'|'mania'} mode The mode.
     */
    datasetsToSqlFiles(mode = 'osu') {
        const sqlMode = mode == 'osu' ? '' : mode;
        return {
            'beatmap-difficulty-attribs': 'osu_beatmap_difficulty_attribs.sql',
            'beatmap-difficulty': 'osu_beatmap_difficulty.sql',
            'beatmap-failtimes': 'osu_beatmap_failtimes.sql',
            'beatmap-performance-blacklist': 'osu_beatmap_performance_blacklist.sql',
            beatmaps: 'osu_beatmaps.sql',
            beatmapsets: 'osu_beatmapsets.sql',
            counts: 'osu_counts.sql',
            'difficulty-attribs': 'osu_difficulty_attribs.sql',
            highscores: `osu_scores${sqlMode ? `_${sqlMode}` : ''}_high.sql`,
            playcounts: 'osu_user_beatmap_playcount.sql',
            'user-stats': `osu_user_stats${sqlMode ? `_${sqlMode}` : ''}.sql`,
            users: 'sample_users.sql',
            scores: 'scores.sql'
        };
    }

    /**
     * Download, extract, and parse data from `data.ppy.sh` into a preferred format.
     * @param {Object} options Data extraction options.
     * @param {boolean} [options.preserveDownloads] Whether or not downloaded files should be preserved for future runs after the requested data is extracted.
     *
     * Defaults to `false`.
     * @param {string} [options.outputDir] The path to the directory where output files (JSON, CSV) should be saved, relative to the current working directory.
     *
     * If not specified, an `osu-data` folder will be created in the current working directory and used.
     * @param {string} [options.downloadDir] The path to the directory where data files should be downloaded, relative to the current working directory. A folder for the downloaded archive will be created inside this directory.
     *
     * If not specified, defaults to the value of `outputDir`.
     * @param {('osufiles'|'performance')[]} [options.type] The type of archive to extract, where `osufiles` is an archive of every ranked beatmap's `.osu` file, and `performance` is an archive of various osu! database table dumps.
     * @param {('osufiles'|'performance')[]} [options.date] The date, in `YYYY-MM` format, of the archive to extract, or `latest` to use the latest available.
     *
     * Defaults to `latest`.
     * @param {('beatmap-difficulty-attribs'|'beatmap-difficulty'|'beatmap-failtimes'|'beatmap-performance-blacklist'|'beatmaps'|'beatmapsets'|'counts'|'difficulty-attribs'|'highscores'|'playcounts'|'user-stats'|'users'|'scores'|'all')[]} [options.datasets] An list of datasets to extract, or `['all']` to extract all datasets.
     *
     * Defaults to `['all']`.
     * @param {('osu'|'taiko'|'catch'|'mania')[]} [options.mode] The game mode to extract datasets for. This only applies if you're extracting user/score data.
     *
     * Defaults to `osu`
     * @param {('top'|'random')[]} [options.sampleMethod] The method used to sample users for performance data.
     *
     * Defaults to `top`.
     * @param {('1k'|'10k')[]} [options.sampleCount] The number of users to sample for performance data.
     *
     * Defaults to `1k`.
     * @param {('json'|'ndjson'|'jsonl'|'yaml'|'yml'|'csv'|'tsv'|'txt')[]} [options.format] The format to output data in.
     *
     * Defaults to `csv`.
     */
    async extract({
        preserveDownloads = false,
        outputDir = './osu-data',
        downloadDir = null,
        type = 'performance',
        datasets = [],
        mode = 'osu',
        date = 'latest',
        sampleMethod = 'top',
        sampleCount = '1k',
        format = 'csv'
    } = {}) {
        // Map string sampleCount to number
        const sampleCountNum = {
            '1k': 1000,
            '10k': 10000
        }[sampleCount];

        // Get the target archive
        const archives = await this.listArchives();
        const archive = archives
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .find(a => {
                if (type == 'osufiles') {
                    return a.type == 'osufiles' && (date == 'latest' || a.date.startsWith(date));
                }
                return (
                    a.type == 'performance' &&
                    (date == 'latest' || a.date.startsWith(date)) &&
                    a.mode == mode &&
                    a.performance.sample == sampleMethod &&
                    a.performance.count == sampleCountNum
                );
            });

        // Make sure we got an archive
        if (!archive)
            return this.log(
                `Error: No archive found matching specifications. Check specified date and other settings.`
            );
        this.log(`Located archive matching specifications at ${archive.url}`);

        // Get absolute paths
        const outputDirAbs = path.resolve(outputDir);
        const downloadDirAbs = path.join(!downloadDir ? outputDirAbs : path.resolve(downloadDir), archive.name);
        const downloadDirTmpAbs = `${downloadDirAbs}-incomplete`;

        // Only download if not already downloaded
        if (!fs.existsSync(downloadDirAbs)) {
            // Wipe temp download directory
            if (fs.existsSync(downloadDirTmpAbs)) {
                this.log(`Deleting incomplete download at ${downloadDirTmpAbs}...`);
                fs.rmSync(downloadDirTmpAbs, { recursive: true, force: true });
            }
            fs.mkdirSync(downloadDirTmpAbs, { recursive: true });

            // Download and extract the archive
            this.log(`Downloading ${archive.name} to ${downloadDirAbs}...`);
            let lastLogTime = Date.now();
            await this.downloadArchive(downloadDirTmpAbs, archive.name, (loaded, total) => {
                if (Date.now() - lastLogTime < 500) return;
                const percent = ((loaded / total) * 100).toFixed(2);
                const loadedM = Math.floor(loaded / (1024 * 1024));
                const totalM = Math.floor(total / (1024 * 1024));
                this.logOverwrite(`Downloading and extracting archive: ${percent}% (${loadedM}MB / ${totalM}MB)...`);
            });
            this.log(`${archive.name} extracted to ${downloadDirAbs}`);

            // Move temp download dir to final
            fs.renameSync(downloadDirTmpAbs, downloadDirAbs);
        } else {
            this.log(`Using complete download in ${downloadDirAbs}`);
        }

        // Create output directory
        if (!fs.existsSync(outputDirAbs)) {
            fs.mkdirSync(outputDirAbs, { recursive: true });
        }

        if (type == 'performance') {
            const dsToSql = this.datasetsToSqlFiles(mode);

            // Get resolved list of selected datasets
            const activeDatasets = [];
            if (datasets.includes('all')) {
                activeDatasets.push(...Object.keys(dsToSql));
            } else {
                activeDatasets.push(...datasets);
            }

            // Loop through datasets
            for (const set of activeDatasets) {
                // Make sure set is valid and sql file exists
                const sqlFile = dsToSql[set];
                if (!sqlFile) {
                    this.log(`Dataset ${set} has no corresponding .sql file, skipping`);
                    continue;
                }
                const sqlPath = path.join(downloadDirAbs, sqlFile);
                if (!fs.existsSync(sqlPath)) {
                    this.log(
                        `Error: Couldn't find ${sqlFile} corresponding to dataset ${set} in extracted archive, skipping`
                    );
                    continue;
                }

                // Delete existing output file
                const outputPath = path.join(outputDirAbs, `${set}.${format}`);
                if (fs.existsSync(outputPath)) fs.rmSync(outputPath);

                // Output this dataset
                this.log(`Saving ${set} to ${format} file...`);
                let lastLogTime = Date.now();
                await sqlConverter(format, sqlPath, outputPath, entryCount => {
                    if (Date.now() - lastLogTime > 500)
                        this.logOverwrite(
                            `Saving ${set} to ${format} file: ${entryCount.toLocaleString()} entries processed...`
                        );
                });
                this.log(`Saved dataset ${set} to ${outputPath}`);
            }
        } else if (type == 'osufiles') {
            // Move .osu files into output dir from download dir
            // No need to keep the download in this case
            this.log(`Moving .osu files...`);
            const dir = await fsp.opendir(downloadDirAbs);
            let i = 0;
            for await (const entry of dir) {
                if (!entry.isFile()) continue;

                const srcPath = path.join(downloadDirAbs, entry.name);
                const destPath = path.join(outputDirAbs, entry.name);

                if (i % 100 === 0) {
                    this.logOverwrite(`Moving .osu files: ${i} moved...`);
                }

                try {
                    await fsp.rename(srcPath, destPath);
                } catch (err) {
                    if (err.code === 'EXDEV') {
                        await fsp.copyFile(srcPath, destPath);
                        await fsp.unlink(srcPath); // Delete original after successful copy
                    } else {
                        this.log(`Failed to move ${entry.name}: ${err}`);
                    }
                }
                i++;
            }
            this.log(`Moved ${i} .osu files to output directory`);
        }

        // Delete download if not set to preserve
        if (!preserveDownloads || type == 'osufiles') {
            this.log(`Cleaning up downloads...`);
            //fs.rmSync(downloadDirAbs, { recursive: true, force: true });
        } else {
            this.log(`Download files are preserved`);
        }
    }
}

module.exports = OsuDumpExtractorAPI;
