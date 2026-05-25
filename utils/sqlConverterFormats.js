module.exports = {
    // JSON array
    json: outputStream => {
        let colNames = [];
        let isFirstEntry = true;

        // Start the JSON array
        outputStream.write('[\n');

        return {
            onSchema: cols => {
                // Save column names for mapping later
                colNames = cols;
            },
            onRow: row => {
                // Map values to columns
                let obj = {};
                for (let i = 0; i < colNames.length; i++) {
                    obj[colNames[i]] = row[i];
                }

                // Write
                const separator = isFirstEntry ? '' : ',\n';
                outputStream.write(separator + JSON.stringify(obj));
                isFirstEntry = false;
            },
            onClose: () => {
                // Close the JSON array and the file stream
                outputStream.write('\n]\n');
            }
        };
    },

    // Newline-delimited JSON
    ndjson: outputStream => {
        let colNames = [];

        return {
            onSchema: cols => {
                // Save column names for mapping later
                colNames = cols;
            },
            onRow: row => {
                // Map values to columns
                let obj = {};
                for (let i = 0; i < colNames.length; i++) {
                    obj[colNames[i]] = row[i];
                }

                // Write
                outputStream.write(JSON.stringify(obj), '\n');
            }
        };
    },

    // CSV
    csv: outputStream => {
        const escapeCsv = val => {
            if (val === null) return '';
            const str = String(val);
            // Escape commas, quotes, and newlines by wrapping in quotes
            if (str.includes(',') || str.includes('"') || str.includes('\n')) {
                return '"' + str.replace(/"/g, '""') + '"';
            }
            return str;
        };

        return {
            onSchema: cols => {
                outputStream.write(cols.map(escapeCsv).join(',') + '\n');
            },
            onRow: row => {
                outputStream.write(row.map(escapeCsv).join(',') + '\n');
            },
            onClose: () => {}
        };
    },

    // YAML
    yaml: outputStream => {
        let colNames = [];
        return {
            onSchema: cols => {
                colNames = cols;
            },
            onRow: row => {
                outputStream.write('- '); // Start array item
                for (let i = 0; i < colNames.length; i++) {
                    const prefix = i === 0 ? '' : '  ';
                    let val = row[i];

                    // Basic YAML escaping for multiline strings or reserved characters
                    if (typeof val === 'string' && (val.includes(':') || val.includes('\n'))) {
                        val = `"${val.replace(/"/g, '\\"')}"`;
                    } else if (val === null) {
                        val = 'null';
                    }
                    outputStream.write(`${prefix}${colNames[i]}: ${val}\n`);
                }
            },
            onClose: () => {}
        };
    },

    // YAML alias
    yml: outputStream => formatHandlers.yaml(outputStream),

    // Human-readable key-value blocks
    txt: outputStream => {
        let colNames = [];

        return {
            onSchema: cols => {
                colNames = cols;
            },
            onRow: row => {
                for (let i = 0; i < colNames.length; i++) {
                    const val = row[i] === null ? '' : row[i];
                    outputStream.write(`${colNames[i]}: ${val}\n`);
                }
                outputStream.write('\n');
            },
            onClose: () => {}
        };
    },

    // Tab-Separated Values (Compact Text)
    tsv: outputStream => {
        return {
            onSchema: cols => {
                // Write headers separated by a tab
                outputStream.write(cols.join('\t') + '\n');
            },
            onRow: row => {
                // Clean the data: replace tabs or newlines inside the data with spaces
                const cleanRow = row.map(val => {
                    if (val === null) return '';
                    return String(val).replace(/[\t\n\r]/g, ' ');
                });

                outputStream.write(cleanRow.join('\t') + '\n');
            },
            onClose: () => {}
        };
    }
};
