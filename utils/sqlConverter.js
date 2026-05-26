const fs = require('fs');
const parseSql = require('./parseSqlFile');

const formatHandlers = require('./sqlConverterFormats.js');

module.exports = async (format = 'json', sqlPath, outputPath, onProgress) => {
    if (!formatHandlers[format]) throw new Error(`Invalid format`);
    const shouldCreateOutputStream = format != 'sqlite';

    let outputStream;
    if (shouldCreateOutputStream) outputStream = fs.createWriteStream(outputPath);

    // Call the parser with callbacks
    const cb = formatHandlers[format](outputStream);
    let processedCount = 0;
    await parseSql(
        sqlPath,
        cols => {
            if (cb.onSchema) cb.onSchema(cols);
        },
        row => {
            if (cb.onRow) cb.onRow(row);

            // Update progress
            processedCount++;
            if (onProgress) onProgress(processedCount);
        }
    );

    if (cb.onClose) cb.onClose();

    if (shouldCreateOutputStream) outputStream.end();
};
