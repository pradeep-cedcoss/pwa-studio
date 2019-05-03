const browsers = require('./browserslist');
const { resolvePath } = require('babel-plugin-module-resolver');

const plugins = [
    ['@babel/plugin-proposal-class-properties'],
    ['@babel/plugin-proposal-object-rest-spread'],
    ['@babel/plugin-syntax-dynamic-import'],
    ['@babel/plugin-syntax-jsx'],
    ['@babel/plugin-transform-react-jsx'],
    ['babel-plugin-graphql-tag']
];

const targets = {
    dev: 'last 2 Chrome versions',
    prod: browsers,
    test: 'node 10'
};

const config = api => {
    const envConfigs = {
        /**
         * Watch mode and build:esm partial transpilation mode.
         * The module-resolver plugin makes Babel recognize import paths from
         * package root, like 'src/classify'.
         */
        development: {
            // Ignore everything with underscores except stories
            ignore: [/\/__(tests?|mocks|fixtures|helpers|dist)__\//],
            plugins: [
                ...plugins,
                [
                    'module-resolver',
                    {
                        root: ['./']
                    }
                ]
            ],
            presets: [
                ['@babel/preset-env', { modules: false, targets: targets.dev }]
            ]
        },
        production: {
            plugins: [
                ...plugins,
                [
                    '@babel/plugin-transform-runtime',
                    { helpers: true, regenerator: true }
                ]
            ],
            presets: [
                ['@babel/preset-env', { modules: false, targets: targets.prod }]
            ]
        },
        test: {
            plugins: [...plugins, ['babel-plugin-dynamic-import-node']],
            presets: [
                [
                    '@babel/preset-env',
                    { modules: 'commonjs', targets: targets.test }
                ]
            ]
        }
    };
    return envConfigs[api.env() || 'development'];
};

module.exports = config;
