#!/usr/bin/env node

import * as fs from "fs";
import * as path from "path";
import * as util from "util";
import * as child_process from "child_process";
import { program } from "commander";
import * as figlet from "figlet";
import chalk = require("chalk");

interface FileDetails {
  name: string;
  lang: string;
  hasAuthor: boolean;
  dirPath: string | null;
}

interface MultiLineComment {
  start: string;
  end: string;
}

interface ProjectDetails {
  framework: string;
  name: string;
  packages?: string[];
}

const template_tokens = {
  classname: "~classname~",
  author: "~author~",
};

const directive_tokens = {
  file: "**file**",
};

const commonComment: MultiLineComment = {
  start: "/*",
  end: "*/",
};

const core: string[] = [
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
const fromJs: string[] = ["react"];
const core_proj: string[] = ["npm", "cra"];

//Defines a custom dict which has 'sub-dicts' of type {string:Comment} k.v pair
//convert to map
const comment_types: { [lang: string]: MultiLineComment } = {
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
const ui_libraries = new Map<string, string>([
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


const exec = util.promisify(child_process.exec);

/* FOR FILES */
const createFile = async (file: FileDetails) => {
  //READ THE TEMPLATE
  const templatePath: string = path.join(
    __dirname,
    "/",
    "templates",
    "/",
    `temp_${file.lang}`
  );
  //DECIDE FINAL FILE NAME
  let finalName: string = "file";
  let data: string = "";
  let authorData: string = "";

  if (!core.includes(file.lang) && !fromJs.includes(file.lang)) {
    console.log(
      chalk.red.bold(
        prefix.error + "Unsupported language / framework / library , exiting!"
      )
    );
    return;
  }
  //if no directory path
  if (file.dirPath === null) {
    if (core.includes(file.lang)) {
      finalName = `./${file.name}.${file.lang}`;
    } else if (fromJs.includes(file.lang)) {
      finalName = `./${file.name}.js`;
    }
  }
  //if has a directory path
  else if (file.dirPath !== null) {
    if (file.lang === "package.json") {
      finalName = `${file.dirPath}/package.json`;
    } else {
      finalName = `${file.dirPath}/${file.name}.${file.lang}`;
    }
  } else {
    console.log(
      chalk.red.bold(
        prefix.error + "Cant decide file name ,something went wrong!"
      )
    );
    return;
  }
  try {
    data = await fs.promises.readFile(templatePath, "utf8");
  } catch (err: unknown) {
    if (typeof err === "string") {
      console.log(chalk.red.bold(prefix.error + err.toUpperCase()));
    } else if (err instanceof Error) {
      console.log(chalk.red.bold(prefix.error + err.message));
    }
    return;
  }
  //PROCESS ALL FILE TOKENS IN THE DATA VARIABLE
  if (data.includes(template_tokens.classname)) {
    data = data.replace(/~classname~/g, file.name);
    console.log(
      chalk.white.bold(prefix.log + "Found & replaced all ~classname~ tokens.")
    );
  }
  if (data.includes(template_tokens.author)) {
    if (file.hasAuthor) {
      let authorTemplatePath: string = path.join(
        __dirname,
        "/",
        "templates",
        "/",
        "author"
      );
      try {
        authorData = await fs.promises.readFile(authorTemplatePath, "utf-8");
        try {
          const authorStamp: string =
            comment_types[`${file.lang}`].start +
            "\n" +
            authorData +
            comment_types[`${file.lang}`].end;
          data = data.replace(/~author~/g, authorStamp);
          console.log(
            chalk.white.bold(
              prefix.log + "Found & replaced all ~author~ tokens."
            )
          );
        } catch (err: unknown) {
          console.log(
            chalk.yellow.bold(
              prefix.warn +
                "Matching comment type not found , removing ~author~ token."
            )
          );
          data = data.replace(/~author~/g, "");
        }
      } catch (err: unknown) {
        console.log(
          chalk.yellow.bold(
            prefix.warn + "Author template not found , removing ~author~ token."
          )
        );
        data = data.replace(/~author~/g, "");
      }
    } else {
      console.log(
        chalk.white.bold(
          prefix.log + "Stamp flag not specified , removing ~author~ token."
        )
      );
      data = data.replace(/~author~/g, "");
    }
  }

  //WRITE ALL CHANGES TO FILE
  //check if file already exists before?
  try {
    await fs.promises.writeFile(`${finalName}`, data);
  } catch (err: any) {
    console.log(chalk.red.bold(prefix.error + err.message));
    return;
  }
  console.log(chalk.white.bold(prefix.log + "File generated successfully!"));
};

const createProject = async (project: ProjectDetails) => {
  console.log(
    chalk.white.bold(prefix.log + "Initializing new project , please wait...")
  );

  const frames: string[] = ["-", "\\", "|", "/"];
  let index: number = 0;

  const newDirPath: string = project.name;

  try {
    await fs.promises.mkdir(newDirPath);
  } catch (err: unknown) {
    if (typeof err === "string") {
      console.log(chalk.red.bold(prefix.error + err.toUpperCase()));
    } else if (err instanceof Error) {
      console.log(chalk.red.bold(prefix.error + err.message));
    }
    return;
  }

  if (core_proj.includes(project.framework)) {
    if (project.framework === "npm") {
      const fileJS: FileDetails = {
        name: project.name,
        lang: "js",
        hasAuthor: false,
        dirPath: newDirPath,
      };
      const fileJSON: FileDetails = {
        name: project.name,
        lang: "package.json",
        hasAuthor: false,
        dirPath: newDirPath,
      };

      await createFile(fileJS);
      await createFile(fileJSON);
    } else if (project.framework === "cra") {
      try {
        console.log(chalk.white.bold(prefix.log + "Running create-react-app"));
        const init_spinner = setInterval(() => {
          const frame = frames[index++ % frames.length];
          process.stdout.write(`${frame}\r`);
        }, 200);
        await exec(`npx create-react-app ${project.name}`);
        clearInterval(init_spinner);
      } catch (err: unknown) {
        if (typeof err === "string") {
          console.log(chalk.red.bold(prefix.error + err.toUpperCase()));
        } else if (err instanceof Error) {
          console.log(chalk.red.bold(prefix.error + err.message));
        }
        return;
      }
    }
  } else {
    console.log(
      chalk.red.bold(prefix.error + "Project Type not supported,exiting!")
    );
    return;
  }

  if (project.packages !== undefined && project.packages.length > 0) {
    const frames: string[] = ["-", "\\", "|", "/"];
    let index: number = 0;

    const install_spinner = setInterval(() => {
      const frame = frames[index++ % frames.length];
      process.stdout.write(`${frame}\r`);
    }, 200);

    let packStr: string = "";

    project.packages.forEach((item) => {
      if (typeof item == "string" && ui_libraries.has(item)) {
        const lib: string | undefined = ui_libraries.get(item);
        if (typeof lib !== "undefined") {
          console.log(
            chalk.white.bold(
              prefix.log +
                `Detected UI packages ${lib} , will attempt to install`
            )
          );
          packStr += `${lib}`;
        }
      } else {
        packStr += `${item} `;
      }
    });

    // console.log(packStr);
    packStr = packStr.slice(0, -1);
    let cmds = `cd ${newDirPath} && npm i ${packStr}`;
    try {
      await exec(cmds);
      console.log(chalk.white.bold(prefix.log + "Dependencies installed!"));
    } catch (err: unknown) {
      if (typeof err === "string") {
        console.log(chalk.yellow.bold(prefix.error + err.toUpperCase()));
      } else if (err instanceof Error) {
        console.log(
          chalk.yellow.bold(prefix.warn + "Could not install dependencies")
        );
      }
    }
    clearInterval(install_spinner);
  }
  console.log(chalk.white.bold(prefix.log + "Project generated successfully!"));
};

//need proper async here or even sync!
const compileAndRun = async (name: string) => {
  if (name.includes(".\\")) {
    name = name.slice(2, name.length);
  }
  let [fileName, lang] = name.split(".");

  let compileStep: unknown, execStep;

  if (lang == "java") {
    try {
      compileStep = await exec(`javac ${name}`);
      execStep = child_process.spawn("java", [`${fileName}`], { shell: true });

      execStep.stdout.on("data", (data: string) => {
        console.log(`${data}`);
      });
      execStep.stderr.on("data", (data: string) => {
        console.log(`${data}`);
      });
      execStep.on("error", (error: Error) => {
        console.log(error.message);
      });
      execStep.on(
        "exit",
        (code: number | null, signal: NodeJS.Signals | null) => {
          if (code) console.log(`Process exited with Code:${code}`);
          if (signal) console.log(`Process killed with SIgnal:${signal}`);
        }
      );
      process.stdin.pipe(execStep.stdin);
    } catch (err: unknown) {
      if (typeof err === "string") {
        console.log(chalk.red.bold(prefix.error + err.toUpperCase()));
      } else if (err instanceof Error) {
        console.log(chalk.red.bold(prefix.error + err.message));
      }
      console.log(
        chalk.red.bold(prefix.error + "Could not start the program!")
      );
      return;
    }
  } else {
    console.log(
      chalk.red.bold(prefix.error + "Unsupported language for compile and run!")
    );
    return;
  }
};

const prgVersion: string = "0.3";
program.version(prgVersion);

program
  .argument("<lang>", "name of the language / framework / library")
  .argument("<name>", "name of the file / class / object")
  .option("-s , --stamp", "Generate Author Token")
  .description(
    "creates a new file with specified classname and language extension"
  )
  .action((lang, name, options) => {
    console.log("");
    console.log(
      chalk.white(
        figlet.textSync(`jumpstart v ${prgVersion}`, { font: "ANSI Shadow" })
      )
    );

    let file: FileDetails;

    if (options.stamp) {
      file = {
        name: name,
        lang: lang,
        hasAuthor: true,
        dirPath: null,
      };
      createFile(file);
    } else {
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
program
  .command("run")
  .argument("<name>", "name of the file / class / object")
  .description("compiles and runs the file using its native toolchain")
  .action(async (name) => {
    await compileAndRun(name).catch((err) => console.log(err.message));
  });

//Create a new project
program
  .command("proj")
  .argument("<framework>", "name of the framework")
  .argument("<name>", "name of the file / class / object")
  .option(
    "-p,--package [packages...]",
    "specify Extra packages to be installed"
  )
  .description("creates a new project")
  .action((framework, name, packages) => {
    console.log("");
    console.log(
      chalk.white(
        figlet.textSync(`jumpstart v ${prgVersion}`, { font: "ANSI Shadow" })
      )
    );
    let project: ProjectDetails;

    if (packages && Object.keys(packages).length > 0) {
      project = {
        framework: framework,
        name: name,
        packages: packages.package,
      };
      createProject(project);
    } else {
      project = {
        framework: framework,
        name: name,
      };
      createProject(project);
    }
  });

//Show credits , contributors can add their names here
program
  .command("credits")
  .description("show credits")
  .action(() => {
    console.log(
      chalk.white.bold(`(JU)mp(ST)art v${prgVersion} , made by harvygr8`)
    );
  });

program.parse(process.argv);
