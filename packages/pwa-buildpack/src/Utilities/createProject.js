const { basename, relative, resolve } = require('path');
const fse = require('fs-extra');
const walk = require('klaw');

// Some files are special and will interfere with the rest of this repo if they
// have the expected name; .eslintrc.js for instance will be found by the root
// lint command. Therefore we prepend SCAFFOLD_ONLY_ to those files and then
// remove that prefix it if it exists.
const prefixRE = /SCAFFOLD_ONLY_/g;

function createProject({ template, directory, name, author, npmClient }) {
    return new Promise((succeed, fail) => {
        fse.ensureDirSync(directory);
        const templateDir = resolve(__dirname, '../../scaffolds', template);

        const writePackageJson = (path, targetPath) => {
            const packageTpt = fse.readJsonSync(path);
            const pkg = Object.assign(packageTpt, { name, author });
            fse.writeJsonSync(targetPath, pkg, {
                spaces: 2
            });
        };

        const transfer = ({ stats, path }) => {
            const targetPath = resolve(
                directory,
                relative(templateDir, path)
            ).replace(prefixRE, '');

            if (stats.isDirectory()) {
                fse.ensureDirSync(targetPath);
                return;
            }

            const filename = basename(targetPath);
            switch (filename) {
                case 'package.json':
                    writePackageJson(path, targetPath);
                    break;
                case 'package-lock.json':
                    if (npmClient !== 'npm') {
                        break;
                    }
                case 'yarn.lock':
                    if (npmClient !== 'yarn') {
                        break;
                    }
                default:
                    fse.copyFileSync(path, targetPath);
                    break;
            }
        };

        const copyStream = walk(templateDir);
        copyStream.on('readable', function() {
            let item;
            while ((item = this.read())) {
                try {
                    transfer(item, directory);
                } catch (e) {
                    fail(e);
                }
            }
        });
        copyStream.on('error', fail);
        copyStream.on('end', succeed);
    });
}

module.exports = createProject;
