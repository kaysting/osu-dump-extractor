const path = require('path');
const jsdoc = require('jsdoc-api');
const fs = require('fs');

async function main() {
    const data = await jsdoc.explain({ files: 'index.js' });

    const dataPublic = data.filter(d => !d.undocumented);

    const functionsLines = [];
    const typesLines = ['### Types', ''];

    for (const item of dataPublic) {
        switch (item.kind) {
            case 'function': {
                functionsLines.push(`### Method: \`${item.name}\``, item.description);

                if (item.params.length) {
                    functionsLines.push('', '#### Params');

                    // Sort params with required first
                    const paramsSorted = item.params.toSorted((a, b) => {
                        const nA = a.optional ? 1 : 0;
                        const nB = b.optional ? 1 : 0;
                        return nA - nB;
                    });

                    for (const p of paramsSorted) {
                        functionsLines.push(
                            `* ${!p.optional ? '**Required:**' : 'Optional:'} \`${p.type.names.join('|')}\` \`${p.name}\`: ${p.description.split('\n').join('\n  ')}${p.defaultvalue ? `\n  \n  Default: \`${p.defaultvalue}\`` : ''}`
                        );
                    }

                    functionsLines.push(
                        '',
                        `#### Returns`,
                        item.returns
                            ? `\`${item.returns.map(r => r.type.names.join('|')).join(',')}\``
                            : `\`undefined\``
                    );
                }

                functionsLines.push('');
                break;
            }
            case 'typedef': {
                break;
            }
        }
    }

    const readmeHydrated = fs
        .readFileSync(path.join(__dirname, 'readme-template.md'), 'utf-8')
        .replace('{{api_functions}}', functionsLines.join('\n'))
        .replace('{{api_types}}', typesLines.join('\n'));
    fs.writeFileSync('./README.md', readmeHydrated);
}
main();
