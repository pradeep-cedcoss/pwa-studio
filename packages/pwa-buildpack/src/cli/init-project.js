const camelspace = require('camelspace');
const prettyLogger = require('../util/pretty-logger');
const createProject = require('../Utilities/createProject');
const { handler: initCustomOrigin } = require('./init-custom-origin');
const { handler: createEnvFile } = require('./create-env-file');
const { spawn } = require('child_process');

module.exports.sampleBackends = require('../../sample-backends.json');

module.exports.command = 'init-project <template> <directory>';

module.exports.describe =
    'Create a PWA project in <directory> based on <template>.';

module.exports.builder = yargs =>
    yargs
        .version()
        .showHelpOnFail(false)
        .positional('template', {
            describe:
                'Name of a "template" to clone and customize. Currently the "venia-starter" template is supported: `buildpack init-project venia-starter <directory>',
            choices: ['venia-starter']
        })
        .positional('directory', {
            describe:
                'Name or path to a directory to create and fill with the project files. This directory will be the project root.',
            normalize: true
        })
        .group(['backendUrl', 'customOrigin'], 'Project configuration:')
        .options({
            backendUrl: {
                alias: 'b',
                describe:
                    'URL of the Magento 2.3 instance to use as a backend. Will be added to `.env` file.'
            },
            customOrigin: {
                boolean: true,
                describe:
                    'Create a custom secure host and certificate for this project. Required for full PWA functionality. Requires administrator privileges.',
                default: true
            }
        })
        .group(['name', 'author'], 'Metadata:')
        .options({
            name: {
                alias: 'n',
                describe:
                    'Short name of the project to put in the package.json "name" field. Uses <directory> by default.'
            },
            author: {
                alias: 'a',
                describe:
                    'Name and (optionally <email address>) of the author to put in the package.json "author" field.'
            }
        })
        .group(['install', 'npmClient'], 'Package management:')
        .options({
            install: {
                boolean: true,
                describe: 'Install package dependencies after creating project',
                default: true
            },
            npmClient: {
                describe: 'NPM package management client to use.',
                choices: ['npm', 'yarn'],
                default: 'npm'
            }
        })
        .help();

module.exports.handler = async function buildpackCli(argv) {
    const params = { ...argv, name: argv.name || argv.directory };
    await createProject(params);
    const { directory, name } = params;
    prettyLogger.success(`Created a new PWA project '${name}' in ${directory}`);

    if (params.backendUrl) {
        const magentoNS = camelspace('magento');
        const { backendUrl } = magentoNS.fromEnv(process.env);
        if (backendUrl && backendUrl !== params.backendUrl) {
            prettyLogger.warn(
                `Command line option --backend-url was set to '${
                    params.backendUrl
                }', but environment variable ${JSON.stringify(
                    magentoNS.toEnv({ backendUrl })
                )} conflicts with it. Environment variable overrides!`
            );
        } else {
            Object.assign(
                process.env,
                magentoNS.toEnv({ backendUrl: params.backendUrl })
            );
        }
    }

    createEnvFile({ directory });
    if (params.customOrigin) {
        await initCustomOrigin({ directory });
        prettyLogger.success(
            `Created custom secure domain for '${name}' project`
        );
    }
    if (params.install) {
        await new Promise((succeed, fail) =>
            spawn(params.npmClient, ['install'], {
                stdio: 'inherit'
            })
                .on('error', fail)
                .on('exit', code => (code ? fail(code) : succeed()))
        );
        prettyLogger.success(`Installed dependencies for '${name}' project`);
    }
};
