#!/usr/bin/env node

const path = require("path");
const fs = require("fs-extra");
const execa = require("execa");
const { Input, Select } = require("enquirer");
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
const getDependencies = (bundler, framework) => deps => {
    let bundlerExclusions;
    switch (bundler) {
        case "Webpack": {
            bundlerExclusions = "rollup";
            break;
        }
        case "Rollup": {
            bundlerExclusions = "webpack";
            break;
        }
    }

    let frameworkExclusions;
    switch (framework) {
        case "Svelte": {
            break;
        }
        case "none": {
            frameworkExclusions = "svelte";
            break;
        }
        default:
    }

    const notNeededPackages = ["ora", "fs-extra", "enquirer", "execa"];

    return Object.entries(deps)
        .filter(dep => !dep[0].includes(bundlerExclusions))
        .filter(dep => !dep[0].includes(frameworkExclusions))
        .filter(dep => !notNeededPackages.includes(dep[0]))
        .map(dep => `${dep[0]}@${dep[1]}`)
        .toString()
        .replace(/,/g, " ")
        .replace(/^/g, "");
};

const scripts = (bundler) => {
    let build;
    let start;

    switch (bundler) {
        case "Webpack": {
            build = "\"build\": \"MODE=production webpack\"";
            start = "\"start\": \"MODE=development webpack-dev-server\"";
            break;
        }
        case "Rollup": {
            build = "\"build\": \"MODE=production rollup -c\"";
            start = "\"start\": \"rollup -c -w\"";
            break;
        }
    }

    const lint = "\"lint\": \"eslint --ext .js ./ --ignore-path .eslintignore\"";
    const lintFix = "\"lint:fix\": \"eslint --ext .js --fix ./\"";
    const test = "\"test\": \"jest --watchAll\"";

    return [build, start, lint, lintFix, test].join(",\n    ");
};

async function createSimpleJsApp() {
    function validator(input) {
        const regexp = /[A-Z0-9-_]/gi;
        const found = input.match(regexp);
        if (found && input && found.length === input.length) {
            return true;
        } else {
            return "Invalid project name!";
        }
    }

    const inputPrompt = new Input({
        name: "projectName",
        message: "Write your project name. Can only contain [a-zA-Z0-9-_].",
        initial: "my-js-project",
        validate: validator
    });

    const selectPrompt = new Select({
        name: "bundler",
        message: "Which bundler do you want to use?",
        choices: [
            "Webpack",
            "Rollup"
        ]
    });

    const frameworkPrompt = new Select({
        name: "framework",
        message: "Which framework do you want, if any?",
        choices: [
            "Svelte",
            "none"
        ]
    });

    let options = {};
    try {
        const projectName = await inputPrompt.run();
        const bundler = await selectPrompt.run();
        const framework = await frameworkPrompt.run();
        options = {
            projectName,
            bundler,
            framework
        };

        if (options.bundler === "Webpack" && options.framework === "Svelte") {
            throw "Webpack + Svelte is currently not supported";
        }
    } catch (error) {
        console.error(`[ERROR] ${error}`);
        return;
    }

    try {
        await installEverything(options);
    } catch (error) {
        await rollbackInstallation(options.projectName);
    }

    console.info("Done! :)");
    process.exit();
}

async function rollbackInstallation(projectName) {
    try {
        oraSpinner.start("Rolling back changes...");
        await execa("rm", ["-rf", projectName]);
        oraSpinner.succeed("Changes are rolled back");
    } catch (error) {
        oraSpinner.fail("Could not revert changes. Sorry... :(");
    }
}

async function installEverything(options) {
    // Create project folder
    try {
        oraSpinner.start("Creating project folder");
        await execa("mkdir", [options.projectName]);
        oraSpinner.succeed();
    } catch (error) {
        oraSpinner.fail();
        if (error.stderr.includes("File exists")) {
            console.error("[ERROR]: Directory already exists");
        } else {
            console.error("[ERROR]: Could not create project directory.", error);
        }
        return;
    }

    //Initialize npm
    try {
        oraSpinner.start("Initializing npm");
        await execa("npm", ["init", "--yes"], { cwd: options.projectName });
        oraSpinner.succeed();
    } catch (error) {
        oraSpinner.fail();
        throw error;
    }

    // Add scripts to package.json
    const packageJsonFile = `${options.projectName}/package.json`;
    try {
        oraSpinner.start("Adding scripts");
        const file = await fs.readFile(packageJsonFile);
        let data = file.toString()
            .replace("\"test\": \"echo \\\"Error: no test specified\\\" && exit 1\"", scripts(options.bundler));
        if (options.framework === "Svelte") {
            data = data.replace('"main": "index.js",', '"browserslist": [\n    "last 1 chrome versions"\n  ],\n  "main": "index.js",');
        }
        await fs.writeFile(packageJsonFile, data);
        oraSpinner.succeed();
    } catch (error) {
        oraSpinner.fail();
        throw error;
    }

    // Copy config files
    const filesToCopy = [
        "README.md",
        ".eslintrc.js",
        ".eslintignore",
        ".babelrc",
        "jest.config.js"
    ];

    const frameworkConfig = {
        src: "rollup.config.js",
        dest: "rollup.config.js",
        codeSrc: "src"
    };
    switch (options.bundler) {
        case "Webpack": {
            frameworkConfig.src = "webpack.config.js";
            frameworkConfig.dest = "webpack.config.js";
            break;
        }
        case "Rollup": {
            frameworkConfig.dest = "rollup.config.js";
            frameworkConfig.src = "rollup.config.js";
            break;
        }
    }

    switch (options.framework) {
        case "Svelte": {
            frameworkConfig.src = "rollup-svelte.config.js";
            frameworkConfig.codeSrc = "svelte-src";
            break;
        }
        default:
    }

    try {
        oraSpinner.start("Copying configuration files");
        for (let i = 0; i < filesToCopy.length; i += 1) {
            await fs.copy(path.join(__dirname, `../${filesToCopy[i]}`), `${options.projectName}/${filesToCopy[i]}`);
        }
        await fs.copy(path.join(__dirname, `../${frameworkConfig.src}`), `${options.projectName}/${frameworkConfig.dest}`);
        oraSpinner.succeed();
    } catch (error) {
        oraSpinner.fail();
        throw error;
    }

    // Copy __mocks__
    try {
        oraSpinner.start("Copying __mocks__");
        await fs.copy(path.join(__dirname, "../__mocks__"), `${options.projectName}/__mocks__`);
        oraSpinner.succeed();
    } catch (error) {
        oraSpinner.fail();
        throw error;
    }

    // Install dependencies
    try {
        const devDeps = getDependencies(options.bundler)(packageJson.devDependencies);
        const deps = getDependencies(options.bundler)(packageJson.dependencies);
        oraSpinner.start("Installing devDependencies");
        await execa.command(`npm i --save-dev ${devDeps}`, { cwd: options.projectName });
        oraSpinner.succeed();
        oraSpinner.start("Installing dependencies");
        await execa.command(`npm i --save-dev ${deps}`, { cwd: options.projectName });
        oraSpinner.succeed();
    } catch (error) {
        oraSpinner.fail();
        console.error("ERROR:", error);
        throw error;
    }

    try {
        oraSpinner.start("Copying src");
        await fs.copy(path.join(__dirname, `../${frameworkConfig.codeSrc}`), `${options.projectName}/src`);
        oraSpinner.succeed();
    } catch (error) {
        oraSpinner.fail();
        throw error;
    }
}

module.exports = createSimpleJsApp();

