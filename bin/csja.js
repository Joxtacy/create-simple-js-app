#!/usr/bin/env node

const path = require("path");
const fs = require("fs-extra");
const execa = require("execa");
const ora = require("ora");
const oraSpinner = ora();

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
        .replace(/ora[^\s]+/g, "")
        .replace(/fs-extra[^\s]+/g, "")
        .replace(/execa[^\s]+/g, "");

const scripts = `"build": "MODE=production webpack",
    "start": "MODE=development webpack-dev-server",
    "lint": "eslint --ext .js ./ --ignore-path .eslintignore",
    "lint:fix": "eslint --ext .js --fix ./",
    "test": "jest --watchAll"`;

const projectName = process.argv[2];

async function createSimpleJsApp() {
    try {
        await installEverything();
    } catch (error) {
        await rollbackInstallation();
    }
}

async function rollbackInstallation() {
    try {
        oraSpinner.start("Rolling back changes...");
        await execa("rm", ["-rf", projectName]);
        oraSpinner.succeed("Changes are rolled back");
    } catch (error) {
        oraSpinner.fail("Could not revert changes. Sorry... :(");
    }
}

async function installEverything() {
    // Create project folder
    try {
        oraSpinner.start("Creating project folder");
        await execa("mkdir", [projectName]);
        oraSpinner.succeed();
    } catch (error) {
        oraSpinner.fail();
        throw error;
    }

    //Initialize npm
    try {
        oraSpinner.start("Initializing npm");
        await execa("npm", ["init", "--yes"], { cwd: projectName });
        oraSpinner.succeed();
    } catch (error) {
        oraSpinner.fail();
        throw error;
    }

    // Add scripts to package.json
    const packageJsonFile = `${projectName}/package.json`;
    try {
        oraSpinner.start("Adding scripts");
        const file = await fs.readFile(packageJsonFile);
        const data = file.toString()
            .replace("\"test\": \"echo \\\"Error: no test specified\\\" && exit 1\"", scripts);
        await fs.writeFile(packageJsonFile, data);
        oraSpinner.succeed();
    } catch (error) {
        oraSpinner.fail();
        throw error;
    }

    // Copy config files
    const filesToCopy = [
        "README.md",
        "webpack.config.js",
        ".eslintrc.js",
        ".eslintignore",
        ".babelrc",
        "jest.config.js"
    ];
    try {
        oraSpinner.start("Copying configuration files");
        for (let i = 0; i < filesToCopy.length; i += 1) {
            await fs.copy(path.join(__dirname, `../${filesToCopy[i]}`), `${projectName}/${filesToCopy[i]}`);
        }
        oraSpinner.succeed();
    } catch (error) {
        oraSpinner.fail();
        throw error;
    }

    // Copy __mocks__
    try {
        oraSpinner.start("Copying __mocks__");
        await fs.copy(path.join(__dirname, "../__mocks__"), `${projectName}/__mocks__`);
        oraSpinner.succeed();
    } catch (error) {
        oraSpinner.fail();
        throw error;
    }

    // Install dependencies
    try {
        const devDeps = getDependencies(packageJson.devDependencies);
        const deps = getDependencies(packageJson.dependencies);
        oraSpinner.start("Installing devDependencies");
        await execa.command(`npm i --save-dev ${devDeps}`, { cwd: projectName });
        oraSpinner.succeed();
        oraSpinner.start("Installing dependencies");
        await execa.command(`npm i --save-dev ${deps}`, { cwd: projectName });
        oraSpinner.succeed();
    } catch (error) {
        oraSpinner.fail();
        throw error;
    }

    try {
        oraSpinner.start("Copying src");
        await fs.copy(path.join(__dirname, "../src"), `${projectName}/src`);
        oraSpinner.succeed();
    } catch (error) {
        oraSpinner.fail();
        throw error;
    }
}

module.exports = createSimpleJsApp();

