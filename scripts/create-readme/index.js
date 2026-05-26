const path = require('path');
const jsdoc = require('jsdoc-api');
const fs = require('fs');

const formatType = type => {
    return type.names.map(name => name.replace(/Array\.<(.+)>/g, '$1[]')).join('\\|');
};

async function main() {
    const data = await jsdoc.explain({ files: 'index.js' });

    const dataPublic = data
        .filter(d => !d.undocumented)
        .sort((a, b) => {
            const kinds = ['function', 'typedef'];
            return kinds.indexOf(a.kind) - kinds.indexOf(b.kind);
        });

    const apiLines = [];

    for (const item of dataPublic) {
        switch (item.kind) {
            case 'function': {
                apiLines.push(
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

                    apiLines.push('', '#### Params');
                    apiLines.push('| Required? | Type | Name | Description | Default |');
                    apiLines.push('| --- | --- | --- | --- | --- |');

                    for (const p of paramsSorted) {
                        apiLines.push(
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

                apiLines.push('');
                break;
            }
            case 'typedef': {
                apiLines.push(`### Type: \`${item.name}\``, `\`${formatType(item.type)}\``, '', item.description, '');
                if (item.properties) {
                    apiLines.push('| Type | Name | Description |');
                    apiLines.push('| --- | --- | --- |');
                    for (const p of item.properties) {
                        apiLines.push(
                            '| ' +
                                [
                                    `\`${formatType(p.type)}\``,
                                    `\`${p.name}\``,
                                    p.description.split('\n').join('<>br') || ''
                                ].join(' | ') +
                                ' |'
                        );
                    }
                    apiLines.push('');
                }
                break;
            }
        }
    }

    const readmeHydrated = fs
        .readFileSync(path.join(__dirname, 'readme-template.md'), 'utf-8')
        .replace('{{api_functions}}', apiLines.join('\n'))
        .replace('{{api_types}}', apiLines.join('\n'));
    fs.writeFileSync('./README.md', readmeHydrated);
}
main();
