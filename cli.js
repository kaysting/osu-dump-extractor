const { Command, Option, InvalidArgumentError } = require('commander');
const OsuDumpExtractorAPI = require('.');
const sqlConverter = require('./utils/sqlConverter');
const formats = require('./utils/sqlConverterFormats');

const program = new Command();
program
    .name('osu-dump-extractor')
    .description(`Download, extract, and format osu! data archives from data.ppy.sh into common formats..`)
    .addOption(
        new Option('-m, --mode <MODE>', `Specify the game mode/ruleset to get data in.`)
            .choices(['osu', 'taiko', 'catch', 'mania'])
            .default('osu')
    )
    .addOption(
        new Option(
            '-t, --type <TYPE>',
            `Specify the type of archive to download, either "performance" or "osufiles".\n- performance: Contains dumps of various osu! database tables.\n- osufiles: Contains .osu beatmap files for every ranked map.`
        )
            .choices(['performance', 'osufiles'])
            .default('performance')
    )
    .addOption(
        new Option(
            '-s, --datasets <DATASETS...>',
            `Specify a list of datasets to extract from a data archive of type performance. Specify "all" if you want all datasets extracted. This has no effect when the type is osufiles.`
        )
            .choices([
                'beatmap-difficulty-attribs',
                'beatmap-difficulty',
                'beatmap-failtimes',
                'beatmap-performance-blacklist',
                'beatmaps',
                'beatmapsets',
                'counts',
                'difficulty-attribs',
                'highscores',
                'beatmap-playcounts',
                'user-stats',
                'users',
                'scores',
                'all'
            ])
            .default(['all'])
    )
    .addOption(
        new Option(`-f, --format <FORMAT>`, `Specify the format extracted data should be saved in.`)
            .choices(Object.keys(formats))
            .default('json')
    )
    .addOption(
        new Option(`--sm, --sample-method <METHOD>`, `Specify the method used to sample users for performance data.`)
            .choices(['top', 'random'])
            .default('top')
    )
    .addOption(
        new Option(`--sc, --sample-count <COUNT>`, `Specify the number of users to sample for performance data.`)
            .choices(['1k', '10k'])
            .default('1k')
    )
    .option(
        `-d, --date <DATE>`,
        `Specify the month whose archive to extract, in YYYY-MM format, or latest to use the most recent archive.`,
        value => {
            if (value === 'latest') return value;
            if (!/^\d{4}-\d{2}$/.test(value)) {
                throw new InvalidArgumentError('Date must be "latest" or in YYYY-MM format (e.g., 2026-05).');
            }
            return value;
        },
        'latest'
    )
    .option(`-o, --output-dir <DIRECTORY>`, `Specify the directory to save extracted data to.`, './osu-dump-extractor')
    .option(`--download-dir <DIRECTORY>`, `Specify the directory to save downloaded archive data to.`)
    .option(
        `--preserve`,
        `If set, downloaded files will be preserved so future runs targeting the same archive can skip downloading.`,
        false
    )
    .parse();

const options = program.opts();

const api = new OsuDumpExtractorAPI({ enableLogging: true });
api.extract({
    preserveDownloads: options.preserve,
    datasets: options.datasets,
    outputDir: options.outputDir,
    downloadDir: options.downloadDir,
    mode: options.mode,
    sampleCount: options.sampleCount,
    sampleMethod: options.sampleMethod,
    type: options.type,
    date: options.date
});
