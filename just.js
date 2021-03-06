#!/usr/bin/env node
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const util = __importStar(require("util"));
const child_process = __importStar(require("child_process"));
const commander_1 = require("commander");
const figlet = __importStar(require("figlet"));
const chalk = require("chalk");
const template_tokens = {
    classname: "~classname~",
    author: "~author~",
};
const directive_tokens = {
    file: "**file**",
};
const commonComment = {
    start: "/*",
    end: "*/",
};
const core = [
    "java",
    "cpp",
    "html",
    "svelte",
    "js",
    "py",
    "go",
    "package.json",
    "rs",
    "c",
];
const fromJs = ["react"];
const core_proj = ["npm", "cra"];
//Defines a custom dict which has 'sub-dicts' of type {string:Comment} k.v pair
//convert to map
const comment_types = {
    java: commonComment,
    c: commonComment,
    go: commonComment,
    cpp: commonComment,
    js: commonComment,
    react: commonComment,
    rs: commonComment,
    py: {
        start: '"""',
        end: '"""',
    },
    html: {
        start: "<!--",
        end: "-->",
    },
};
//currently supported libs for project init
const ui_libraries = new Map([
    [
        "mui",
        "@mui/material @emotion/react @emotion/styled @mui/styled-engine-sc styled-components",
    ],
    ["fluentui", "@fluentui/react"],
    ["blueprint", "@blueprintjs/core"],
    ["bootstrap", "react-bootstrap bootstrap"],
]);
const prefix = {
    log: "[LOG]: ",
    error: "[ERROR]: ",
    warn: "[WARN]: ",
};
// const printProgress(text:string){
//   process.stdout.write(`${text}\r`);
// }
const exec = util.promisify(child_process.exec);
/* FOR FILES */
const createFile = async (file) => {
    //READ THE TEMPLATE
    const templatePath = path.join(__dirname, "/", "templates", "/", `temp_${file.lang}`);
    //DECIDE FINAL FILE NAME
    let finalName = "file";
    let data = "";
    let authorData = "";
    if (!core.includes(file.lang) && !fromJs.includes(file.lang)) {
        console.log(chalk.red.bold(prefix.error + "Unsupported language / framework / library , exiting!"));
        return;
    }
    //if no directory path
    if (file.dirPath === null) {
        if (core.includes(file.lang)) {
            finalName = `./${file.name}.${file.lang}`;
        }
        else if (fromJs.includes(file.lang)) {
            finalName = `./${file.name}.js`;
        }
    }
    //if has a directory path
    else if (file.dirPath !== null) {
        if (file.lang === "package.json") {
            finalName = `${file.dirPath}/package.json`;
        }
        else {
            finalName = `${file.dirPath}/${file.name}.${file.lang}`;
        }
    }
    else {
        console.log(chalk.red.bold(prefix.error + "Cant decide file name ,something went wrong!"));
        return;
    }
    try {
        data = await fs.promises.readFile(templatePath, "utf8");
    }
    catch (err) {
        if (typeof err === "string") {
            console.log(chalk.red.bold(prefix.error + err.toUpperCase()));
        }
        else if (err instanceof Error) {
            console.log(chalk.red.bold(prefix.error + err.message));
        }
        return;
    }
    //PROCESS ALL FILE TOKENS IN THE DATA VARIABLE
    if (data.includes(template_tokens.classname)) {
        data = data.replace(/~classname~/g, file.name);
        console.log(chalk.white.bold(prefix.log + "Found & replaced all ~classname~ tokens."));
    }
    if (data.includes(template_tokens.author)) {
        if (file.hasAuthor) {
            let authorTemplatePath = path.join(__dirname, "/", "templates", "/", "author");
            try {
                authorData = await fs.promises.readFile(authorTemplatePath, "utf-8");
                try {
                    const authorStamp = comment_types[`${file.lang}`].start +
                        "\n" +
                        authorData +
                        comment_types[`${file.lang}`].end;
                    data = data.replace(/~author~/g, authorStamp);
                    console.log(chalk.white.bold(prefix.log + "Found & replaced all ~author~ tokens."));
                }
                catch (err) {
                    console.log(chalk.yellow.bold(prefix.warn +
                        "Matching comment type not found , removing ~author~ token."));
                    data = data.replace(/~author~/g, "");
                }
            }
            catch (err) {
                console.log(chalk.yellow.bold(prefix.warn + "Author template not found , removing ~author~ token."));
                data = data.replace(/~author~/g, "");
            }
        }
        else {
            console.log(chalk.white.bold(prefix.log + "Stamp flag not specified , removing ~author~ token."));
            data = data.replace(/~author~/g, "");
        }
    }
    //WRITE ALL CHANGES TO FILE
    //check if file already exists before?
    try {
        await fs.promises.writeFile(`${finalName}`, data);
    }
    catch (err) {
        console.log(chalk.red.bold(prefix.error + err.message));
        return;
    }
    console.log(chalk.white.bold(prefix.log + "File generated successfully!"));
};
const createProject = async (project) => {
    console.log(chalk.white.bold(prefix.log + "Initializing new project , please wait..."));
    const frames = ["-", "\\", "|", "/"];
    let index = 0;
    const newDirPath = project.name;
    try {
        await fs.promises.mkdir(newDirPath);
    }
    catch (err) {
        if (typeof err === "string") {
            console.log(chalk.red.bold(prefix.error + err.toUpperCase()));
        }
        else if (err instanceof Error) {
            console.log(chalk.red.bold(prefix.error + err.message));
        }
        return;
    }
    if (core_proj.includes(project.framework)) {
        if (project.framework === "npm") {
            const fileJS = {
                name: project.name,
                lang: "js",
                hasAuthor: false,
                dirPath: newDirPath,
            };
            const fileJSON = {
                name: project.name,
                lang: "package.json",
                hasAuthor: false,
                dirPath: newDirPath,
            };
            await createFile(fileJS);
            await createFile(fileJSON);
        }
        else if (project.framework === "cra") {
            try {
                console.log(chalk.white.bold(prefix.log + "Running create-react-app"));
                const init_spinner = setInterval(() => {
                    const frame = frames[index++ % frames.length];
                    process.stdout.write(`${frame}\r`);
                }, 200);
                await exec(`npx create-react-app ${project.name}`);
                clearInterval(init_spinner);
            }
            catch (err) {
                if (typeof err === "string") {
                    console.log(chalk.red.bold(prefix.error + err.toUpperCase()));
                }
                else if (err instanceof Error) {
                    console.log(chalk.red.bold(prefix.error + err.message));
                }
                return;
            }
        }
    }
    else {
        console.log(chalk.red.bold(prefix.error + "Project Type not supported,exiting!"));
        return;
    }
    if (project.packages !== undefined && project.packages.length > 0) {
        const frames = ["-", "\\", "|", "/"];
        let index = 0;
        const install_spinner = setInterval(() => {
            const frame = frames[index++ % frames.length];
            process.stdout.write(`${frame}\r`);
        }, 200);
        let packStr = "";
        project.packages.forEach((item) => {
            if (typeof item == "string" && ui_libraries.has(item)) {
                const lib = ui_libraries.get(item);
                if (typeof lib !== "undefined") {
                    console.log(chalk.white.bold(prefix.log +
                        `Detected UI packages ${lib} , will attempt to install`));
                    packStr += `${lib}`;
                }
            }
            else {
                packStr += `${item} `;
            }
        });
        // console.log(packStr);
        packStr = packStr.slice(0, -1);
        let cmds = `cd ${newDirPath} && npm i ${packStr}`;
        try {
            await exec(cmds);
            console.log(chalk.white.bold(prefix.log + "Dependencies installed!"));
        }
        catch (err) {
            if (typeof err === "string") {
                console.log(chalk.yellow.bold(prefix.error + err.toUpperCase()));
            }
            else if (err instanceof Error) {
                console.log(chalk.yellow.bold(prefix.warn + "Could not install dependencies"));
            }
        }
        clearInterval(install_spinner);
    }
    console.log(chalk.white.bold(prefix.log + "Project generated successfully!"));
};
//need proper async here or even sync!
const compileAndRun = async (name) => {
    if (name.includes(".\\")) {
        name = name.slice(2, name.length);
    }
    let [fileName, lang] = name.split(".");
    let compileStep, execStep;
    if (lang == "java") {
        try {
            compileStep = await exec(`javac ${name}`);
            execStep = child_process.spawn("java", [`${fileName}`], { shell: true });
            execStep.stdout.on("data", (data) => {
                console.log(`${data}`);
            });
            execStep.stderr.on("data", (data) => {
                console.log(`${data}`);
            });
            execStep.on("error", (error) => {
                console.log(error.message);
            });
            execStep.on("exit", (code, signal) => {
                if (code)
                    console.log(`Process exited with Code:${code}`);
                if (signal)
                    console.log(`Process killed with SIgnal:${signal}`);
            });
            process.stdin.pipe(execStep.stdin);
        }
        catch (err) {
            if (typeof err === "string") {
                console.log(chalk.red.bold(prefix.error + err.toUpperCase()));
            }
            else if (err instanceof Error) {
                console.log(chalk.red.bold(prefix.error + err.message));
            }
            console.log(chalk.red.bold(prefix.error + "Could not start the program!"));
            return;
        }
    }
    else {
        console.log(chalk.red.bold(prefix.error + "Unsupported language for compile and run!"));
        return;
    }
};
const prgVersion = "0.3";
commander_1.program.version(prgVersion);
commander_1.program
    .argument("<lang>", "name of the language / framework / library")
    .argument("<name>", "name of the file / class / object")
    .option("-s , --stamp", "Generate Author Token")
    .description("creates a new file with specified classname and language extension")
    .action((lang, name, options) => {
    console.log("");
    console.log(chalk.white(figlet.textSync(`jumpstart v ${prgVersion}`, { font: "ANSI Shadow" })));
    let file;
    if (options.stamp) {
        file = {
            name: name,
            lang: lang,
            hasAuthor: true,
            dirPath: null,
        };
        createFile(file);
    }
    else {
        file = {
            name: name,
            lang: lang,
            hasAuthor: false,
            dirPath: null,
        };
        createFile(file);
        //maybe await to print a final message
    }
});
//Compile and run
commander_1.program
    .command("run")
    .argument("<name>", "name of the file / class / object")
    .description("compiles and runs the file using its native toolchain")
    .action(async (name) => {
    await compileAndRun(name).catch((err) => console.log(err.message));
});
//Create a new project
commander_1.program
    .command("proj")
    .argument("<framework>", "name of the framework")
    .argument("<name>", "name of the file / class / object")
    .option("-p,--package [packages...]", "specify Extra packages to be installed")
    .description("creates a new project")
    .action((framework, name, packages) => {
    console.log("");
    console.log(chalk.white(figlet.textSync(`jumpstart v ${prgVersion}`, { font: "ANSI Shadow" })));
    let project;
    // console.log(packages.package);
    // console.log(packages);
    if (packages && Object.keys(packages).length > 0) {
        project = {
            framework: framework,
            name: name,
            packages: packages.package,
        };
        createProject(project);
    }
    else {
        //check if unknown packages *****IMPORTANT
        project = {
            framework: framework,
            name: name,
        };
        createProject(project);
    }
});
//Show credits , contributors can ad
commander_1.program
    .command("credits")
    .description("show credits")
    .action(() => {
    console.log(chalk.white.bold(`(JU)mp(ST)art v${prgVersion} , made by harvygr8`));
});
commander_1.program.parse(process.argv);
