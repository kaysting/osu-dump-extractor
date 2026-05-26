const path = require('path');
const jsdoc = require('jsdoc-api');
const fs = require('fs');

const formatType = (type, escapePipe = false) => {
    return type.names.map(name => name.replace(/Array\.<(.+)>/g, '$1[]')).join(escapePipe ? '\\|' : '|');
};

const formatFunctionName = item => {
    if (item.scope == 'instance') {
        return `new ${item.memberof}().${item.name}`;
    }
    return item.name;
};

const itemParamsToTable = item => {
    let lines = [];
    if (item.params?.length) {
        // Sort params with required first
        const paramsSorted = item.params.toSorted((a, b) => {
            const nA = a.optional ? 1 : 0;
            const nB = b.optional ? 1 : 0;
            return nA - nB;
        });

        lines.push('| Required? | Type | Name | Description | Default |');
        lines.push('| --- | --- | --- | --- | --- |');

        for (const p of paramsSorted) {
            lines.push(
                '| ' +
                    [
                        p.optional ? 'No' : '**Yes**',
                        `\`${formatType(p.type, true)}\``,
                        `\`${p.name}\``,
                        p.description.split('\n').join('<br>') || '',
                        `\`${p.defaultvalue}\`` ?? ''
                    ].join(' | ') +
                    ' |'
            );
        }
    }
    return lines.join('\n');
};

async function main() {
    const data = await jsdoc.explain({ files: 'index.js' });

    const dataPublic = data
        .filter(d => !d.undocumented)
        .sort((a, b) => {
            const kinds = ['class', 'function', 'typedef'];
            return kinds.indexOf(a.kind) - kinds.indexOf(b.kind);
        });

    const apiLines = [];

    for (const item of dataPublic) {
        switch (item.kind) {
            case 'class': {
                apiLines.push(`### Class Constructor: \`new ${item.name}(): this\``, item.description);

                if (item.params?.length) {
                    apiLines.push('', '#### Params');
                    apiLines.push(itemParamsToTable(item));
                }

                apiLines.push('');
                break;
            }
            case 'function': {
                apiLines.push(
                    `### Method: \`${formatFunctionName(item)}(): ${item.returns ? item.returns.map(r => formatType(r.type)).join(',') : 'void'}\``,
                    item.description
                );

                if (item.params?.length) {
                    apiLines.push('', '#### Params');
                    apiLines.push(itemParamsToTable(item));
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
                                    `\`${formatType(p.type, true)}\``,
                                    `\`${p.name}\``,
                                    p.description.split('\n').join('<br>') || ''
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

    const readme = fs
        .readFileSync(path.join(__dirname, 'readme-template.md'), 'utf-8')
        .replace('{{api_docs}}', apiLines.join('\n'));
    fs.writeFileSync('./README.md', readme);
}
main();
