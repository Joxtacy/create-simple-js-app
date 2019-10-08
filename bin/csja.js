#!/usr/bin/env node

const fs = require('fs');
const { exec } = require('child_process');

/**
 * we pass the object key dependency || devdependency to this function
 * @param {object} deps object key that we want to extract
 * @returns {string} a string of 'dependencies@version'
 * that we can attach to an `npm i {value}` to install
 * every dep the exact version speficied in package.json
 */
const getDependencies = deps =>
  Object.entries(deps)
    .map(dep => `${dep[0]}@${dep[1]}`)
    .toString()
    .replace(/,/g, ' ')
    .replace(/^/g, '');

const scripts = `"start": "MODE=development webpack-dev-server",
    "build": "MODE=production webpack -p",
    "test": "jest --watchAll"`;

const projectName = process.argv[2];
const createDirAndInitNpm = `mkdir ${projectName} && cd ${projectName} && npm init --yes`;

console.log('Initializing project...');

// create folder and initialize npm
exec(createDirAndInitNpm, (initErr, initStdout, initStderr) => {
    if (initErr) {
      console.error(`Everything was fine, then it wasn't: ${initErr}`);
      return;
    }

    const packageJson = `${projectName}/package.json`;
    fs.readFile(packageJson, (err, file) => {
        if (err) throw err;

        const data = file.toString()
            .replace('"test": "echo \\"Error: no test specified\\" && exit 1"', scripts);
        fs.writeFile(packageJson, data, err2 => err2 || true);
    });

});

