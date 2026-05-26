const path = require('path');
const jsdoc = require('jsdoc-api');
const fs = require('fs');

const formatType = type => {
    return type.names.join('|');
};

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
                    // Sort params with required first
                    const paramsSorted = item.params.toSorted((a, b) => {
                        const nA = a.optional ? 1 : 0;
                        const nB = b.optional ? 1 : 0;
                        return nA - nB;
                    });

                    functionsLines.push('', '#### Params');
                    functionsLines.push('| Required? | Type | Name | Description | Default |');
                    functionsLines.push('| --- | --- | --- | --- | --- |');

                    for (const p of paramsSorted) {
                        functionsLines.push(
                            '| ' +
                                [
                                    p.optional ? 'No' : '**Yes**',
                                    `\`${formatType(p.type)}\``,
                                    `\`${p.name}\``,
                                    p.description || '',
                                    `\`${p.defaultvalue}\`` ?? ''
                                ].join(' | ') +
                                ' |'
                        );
                    }

                    functionsLines.push(
                        '',
                        `#### Returns`,
                        item.returns
                            ? `\`${item.returns.map(r => formatType(r.type)).join(',')}\` ${item.returns.description ? `: ${item.returns.description}` : ''}`
                            : `\`undefined\``
                    );
                }

                functionsLines.push('');
                break;
            }
            case 'typedef': {
                typesLines.push(`#### \`${item.name}\``, `\`${formatType(item.type)}\``, '', item.description, '');
                if (item.properties) {
                    functionsLines.push('| Type | Name | Description |');
                    functionsLines.push('| --- | --- | --- |');
                    for (const p of item.properties) {
                        functionsLines.push(
                            '| ' +
                                [`\`${formatType(p.type)}\``, `\`${p.name}\``, p.description || ''].join(' | ') +
                                ' |'
                        );
                    }
                    typesLines.push('');
                }
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
