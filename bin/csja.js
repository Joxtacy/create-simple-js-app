#!/usr/bin/env node

const path = require("path");
const fs = require("fs-extra");
const { exec } = require("child_process");

const packageJson = require("../package.json");

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
        .replace(/,/g, " ")
        .replace(/^/g, "")
        // exclude the plugin only used in this file, nor relevant to the boilerplate
        .replace(/fs-extra[^\s]+/g, "");

const scripts = `"build": "MODE=production webpack",
    "start": "MODE=development webpack-dev-server",
    "lint": "eslint --ext .js ./ --ignore-path .eslintignore",
    "lint:fix": "eslint --ext .js --fix ./",
    "test": "jest --watchAll"`;

const projectName = process.argv[2];
const createDirAndInitNpm = `mkdir ${projectName} && cd ${projectName} && npm init --yes`;

console.log("Initializing project...");

// create folder and initialize npm
exec(createDirAndInitNpm, (initErr, initStdout) => {
    if (initErr) {
        console.error(`Everything was fine, then it wasn't: ${initErr}`);
        return;
    }

    console.log(initStdout);

    // Add scripts to package.json
    const packageJsonFile = `${projectName}/package.json`;
    fs.readFile(packageJsonFile, (err, file) => {
        if (err) throw err;

        console.log(file.toString());
        const data = file.toString()
            .replace("\"test\": \"echo \\\"Error: no test specified\\\" && exit 1\"", scripts);
        console.log(data);
        fs.writeFile(packageJsonFile, data, err2 => err2 || true);
    });

    // Copy config files
    const filesToCopy = [
        "README.md",
        "webpack.config.js",
        ".eslintrc.js",
        ".eslintignore",
        ".babelrc",
        "jest.config.js"
    ];
    for (let i = 0; i < filesToCopy.length; i += 1) {
        fs.createReadStream(path.join(__dirname, `../${filesToCopy[i]}`))
            .pipe(fs.createWriteStream(`${projectName}/${filesToCopy[i]}`));
    }

    // Copy __mocks__
    fs.copy(path.join(__dirname, "../__mocks__"), `${projectName}/__mocks__`)
        .then(() => {
            console.log("__mocks__ copied");
        })
        .catch((err) => {
            console.error(err);
        });

    // Install dependencies
    console.log("Installing deps -- it might take a few minutes..");
    const devDeps = getDependencies(packageJson.devDependencies);
    const deps = getDependencies(packageJson.dependencies);
    const installDependencies = `cd ${projectName} && npm i --save-dev ${devDeps} && npm i --save ${deps}`;
    exec(installDependencies,
        (npmErr, npmStdout) => {
            if (npmErr) {
                console.error(`it's always npm, ain't it? ${npmErr}`);
                return;
            }
            console.log(npmStdout);
            console.log("Dependencies installed");

            console.log("Copying additional files..");
            // copy additional source files
            fs.copy(path.join(__dirname, "../src"), `${projectName}/src`)
                .then(() => {
                    console.log(`
                        All done!
                        Your project is now started into ${projectName} folder.
                        Happy Coding!
                    `);
                })
                .catch((err) => {
                    console.error(err);
                });
        }
    );
});

