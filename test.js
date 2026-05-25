const fs = require('fs');
const OsuDataExtractorAPI = require('./index');
const parseSql = require('./utils/parseSqlFile');
const sqlToJson = require('./utils/sqlConverter');

async function main() {
    const api = new OsuDataExtractorAPI({ enableLogging: true });
    const dumps = await api.listArchives();
    const dump = dumps.find(d => {
        return (
            d.date == '2026-05-01' && d.mode == 'mania' && d.performance.sample == 'top' && d.performance.count == 1000
        );
    });
    console.log(dump);
    const downloadDir = `./.downloads/${dump.name}`;
    if (!fs.existsSync(downloadDir)) {
        fs.mkdirSync(downloadDir, { recursive: true });
        await api.downloadArchive(downloadDir, dump.name);
    }

    return;

    const file = 'osu_beatmapsets';
    let lastLogTime = Date.now() - 1000;
    sqlToJson(`${downloadDir}/${file}.sql`, `.${file}.json`, count => {
        if (Date.now() - lastLogTime > 5000) {
            console.log(`Processed ${count.toLocaleString()} entries...`);
            lastLogTime = Date.now();
        }
    });
}
main();
