#!/usr/bin/env node

const path = require("path");
const fs = require("fs-extra");
const execa = require("execa");

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
        .replace(/fs-extra[^\s]+/g, "")
        .replace(/execa[^\s]+/g, "");

const scripts = `"build": "MODE=production webpack",
    "start": "MODE=development webpack-dev-server",
    "lint": "eslint --ext .js ./ --ignore-path .eslintignore",
    "lint:fix": "eslint --ext .js --fix ./",
    "test": "jest --watchAll"`;

const projectName = process.argv[2];

console.log("Initializing project...");

async function createSimpleJsApp() {
    // Create project folder
    try {
        await execa("mkdir", [projectName]);
    } catch (error) {
        console.error(error);
        throw error;
    }

    //Initialize npm
    try {
        await execa("npm", ["init", "--yes"], { cwd: projectName });
    } catch (error) {
        console.error(error);
        throw error;
    }

    // Add scripts to package.json
    const packageJsonFile = `${projectName}/package.json`;
    try {
        const file = await fs.readFile(packageJsonFile);
        const data = file.toString()
            .replace("\"test\": \"echo \\\"Error: no test specified\\\" && exit 1\"", scripts);
        await fs.writeFile(packageJsonFile, data);
    } catch (error) {
        console.error(error);
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
        for (let i = 0; i < filesToCopy.length; i += 1) {
            await fs.copy(path.join(__dirname, `../${filesToCopy[i]}`), `${projectName}/${filesToCopy[i]}`);
        }
    } catch (error) {
        console.error(error);
        throw error;
    }

    // Copy __mocks__
    try {
        await fs.copy(path.join(__dirname, "../__mocks__"), `${projectName}/__mocks__`);
    } catch (error) {
        console.error(error);
        throw error;
    }

    // Install dependencies
    try {
        console.log(packageJson.devDependencies);
        const devDeps = getDependencies(packageJson.devDependencies);
        const deps = getDependencies(packageJson.dependencies);
        await execa.command(`npm i --save-dev ${devDeps}`, { cwd: projectName });
        await execa.command(`npm i --save-dev ${deps}`, { cwd: projectName });
    } catch (error) {
        console.error(error);
        throw error;
    }

    try {
        await fs.copy(path.join(__dirname, "../src"), `${projectName}/src`);
    } catch (error) {
        console.error(error);
        throw error;
    }
}

module.exports = createSimpleJsApp();

