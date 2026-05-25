const fs = require('fs');
const parseSql = require('./parseSqlFile');

const formatHandlers = require('./sqlConverterFormats.js');

module.exports = (format = 'json', sqlPath, outputPath, onProgress, tableName) =>
    new Promise(async (resolve, reject) => {
        if (!formatHandlers[format]) reject(`Invalid format.`);
        const cb = formatHandlers[format];
        const shouldCreateOutputStream = format != 'sqlite';

        let outputStream;
        if (shouldCreateOutputStream) outputStream = fs.createWriteStream(outputPath);

        // Call the parser with callbacks
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
    });
