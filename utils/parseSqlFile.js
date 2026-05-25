const fs = require('fs');
const readline = require('readline');

// This file was written entirely by Gemini
// I'm sparing myself of writing an SQL-parsing state machine

/**
 * Streams a massive MySQL dump file and fires callbacks
 * when it parses the table schema and individual rows.
 * * @param {string} inputSqlPath - Path to the extracted .sql file
 * @param {Function} onSchema - Callback fired with an array of column names: (columns) => {}
 * @param {Function} onRow - Callback fired with an array of parsed values: (rowArray) => {}
 * @returns {Promise} Resolves when the entire file has been parsed
 */
function parseSqlStream(inputSqlPath, onSchema, onRow, rowLimit = -1) {
    return new Promise((resolve, reject) => {
        const inputStream = fs.createReadStream(inputSqlPath);

        const rl = readline.createInterface({
            input: inputStream,
            crlfDelay: Infinity
        });

        let columns = [];
        let inCreateTable = false;
        let countRows = 0;

        rl.on('line', line => {
            // --- 1. Capture Column Names ---
            if (line.startsWith('CREATE TABLE')) {
                inCreateTable = true;
                columns = []; // Reset in case of multiple tables
                return;
            }

            if (inCreateTable) {
                // Stop capturing when the table definition ends
                if (line.startsWith(') ENGINE') || line.startsWith(');')) {
                    inCreateTable = false;
                    if (onSchema) onSchema(columns);
                    return;
                }

                // Match lines like: `beatmap_id` int(11) NOT NULL,
                const colMatch = line.match(/^\s*`([^`]+)`/);
                if (colMatch) {
                    columns.push(colMatch[1]);
                }
                return;
            }

            // --- 2. Parse Extended Inserts ---
            if (line.startsWith('INSERT INTO')) {
                const valuesIdx = line.indexOf('VALUES ');
                if (valuesIdx === -1) return;

                const dataString = line.slice(valuesIdx + 7);

                let inString = false;
                let isEscaped = false;
                let inTuple = false;
                let currentVal = '';
                let wasQuoted = false;
                let currentRow = [];

                for (let i = 0; i < dataString.length; i++) {
                    const char = dataString[i];

                    // Handle MySQL escape sequences
                    if (isEscaped) {
                        if (char === 'n') currentVal += '\n';
                        else if (char === 'r') currentVal += '\r';
                        else if (char === 't') currentVal += '\t';
                        else currentVal += char;

                        isEscaped = false;
                        continue;
                    }

                    if (char === '\\') {
                        isEscaped = true;
                        continue;
                    }

                    if (char === "'") {
                        inString = !inString;
                        wasQuoted = true;
                        continue;
                    }

                    if (!inString) {
                        if (char === '(') {
                            inTuple = true;
                            currentRow = [];
                            currentVal = '';
                            wasQuoted = false;
                            continue;
                        }

                        if (char === ')' || char === ',') {
                            if (inTuple) {
                                // Finalize the current value
                                let finalVal = currentVal;
                                if (!wasQuoted) {
                                    finalVal = finalVal.trim();
                                    if (finalVal === 'NULL') {
                                        finalVal = null;
                                    } else if (finalVal !== '' && !isNaN(finalVal)) {
                                        finalVal = Number(finalVal);
                                    }
                                }

                                currentRow.push(finalVal);
                                currentVal = '';
                                wasQuoted = false;

                                // If it's the end of the tuple, emit the row!
                                if (char === ')') {
                                    inTuple = false;
                                    countRows++;
                                    if (onRow) onRow(currentRow);
                                    if (rowLimit >= 0 && countRows >= rowLimit) {
                                        rl.close();
                                        inputStream.destroy();
                                        return resolve();
                                    }
                                }
                            }
                            continue;
                        }
                    }

                    if (inTuple) {
                        if (!inString && char === ' ' && currentVal === '') continue;
                        currentVal += char;
                    }
                }
            }
        });

        rl.on('close', () => {
            resolve();
        });

        inputStream.on('error', reject);
    });
}

module.exports = parseSqlStream;
