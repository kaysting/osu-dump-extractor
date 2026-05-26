const path = require('path');
const jsdoc = require('jsdoc-api');
const fs = require('fs');

const formatType = type => {
    return type.names.map(name => name.replace(/Array\.<(.+)>/g, '$1[]')).join('\\|');
};

async function main() {
    const data = await jsdoc.explain({ files: 'index.js' });

    const dataPublic = data.filter(d => !d.undocumented);

    const functionsLines = [];
    const typesLines = ['### Types', ''];

    for (const item of dataPublic) {
        switch (item.kind) {
            case 'function': {
                functionsLines.push(
                    `### Method: \`${item.name}(): ${item.returns ? item.returns.map(r => formatType(r.type)).join(',') : 'void'}\``,
                    item.description
                );

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
                                    p.description.split('\n').join('<br>') || '',
                                    `\`${p.defaultvalue}\`` ?? ''
                                ].join(' | ') +
                                ' |'
                        );
                    }
                }

                functionsLines.push('');
                break;
            }
            case 'typedef': {
                typesLines.push(`#### \`${item.name}\``, `\`${formatType(item.type)}\``, '', item.description, '');
                if (item.properties) {
                    typesLines.push('| Type | Name | Description |');
                    typesLines.push('| --- | --- | --- |');
                    for (const p of item.properties) {
                        typesLines.push(
                            '| ' +
                                [
                                    `\`${formatType(p.type)}\``,
                                    `\`${p.name}\``,
                                    p.description.split('\n').join('<>br') || ''
                                ].join(' | ') +
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
