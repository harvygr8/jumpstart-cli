#!/usr/bin/env node


const fs = require('fs');
const path = require('path');
const cmdr = require('commander');
const figlet = require('figlet');
const chalk = require('chalk');
const util = require('util');
const exec = util.promisify(require('child_process').exec);

/* Core application functionalities go here */
const template_tokens={
  classname:"~classname~",
  author:"~author~"
};

const directive_tokens={
    file:"**file**"
};

const comment_types={
  java_st:"/*",
  java_end:"*/",
  html_st:"<!--",
  html_end:"-->",
  c_st:"/*",
  c_end:"*/",
  cpp_st:"/*",
  cpp_end:"*/",
  js_st:'/*',
  js_end:'*/',
  react_st:'/*',
  react_end:'*/',
  svelte_st:'/*',
  svelte_end:'*/'
};

const prefix={
  log:"[LOG]: ",
  error:"[ERROR]: ",
  warn:"[WARN]: "

}

const core =['java','cpp','svelte','js','package.json'];
const proj = ['js','packagejson'];

/* FOR FILES */
const createFile=async(lang,name,canStamp,prePath)=>{
  //READ THE TEMPLATE
  const templatePath = path.join(__dirname,'/','templates','/',`temp_${lang}`);
  //DECIDE FINAL FILE NAME
  let finalName = "file";
  let data ="";
  let authorData="";

  if(!core.includes(lang)){
    console.log(chalk.red.bold(prefix.error + 'Unsupported language / framework / library , exiting!'));
    return;
  }
  else{
    if(prePath===undefined){
      finalName = `./${name}.${lang}`;
    }
    else{
      //obv wont create a new dir so handle this when final write , decide to create a dir here or somewhere else
      if(lang==="package.json"){
        finalName=`${prePath}/package.json`;
      }
      else{
        finalName = `${prePath}/${name}.${lang}`;
      }
    }
  }

  try{
    data = await fs.promises.readFile(templatePath,'utf8');
  }
  catch(err){
    console.log(chalk.red.bold(prefix.error + err.message));
    return;
  }
  //PROCESS ALL FILE TOKENS IN THE DATA VARIABLE
  if(data.includes(template_tokens.classname)){
    data = data.replace(/~classname~/g, name);
    console.log(chalk.white.bold(prefix.log + 'Found & replaced all ~classname~ tokens.'));
  }

  if(data.includes(template_tokens.author)){
    if(canStamp){
      let authorTemplatePath = path.join(__dirname,'/','templates','/','author');
      try{
        authorData = await fs.promises.readFile(authorTemplatePath, 'utf-8');
        const authorStamp = comment_types[`${[lang]}_st`] +"\n" +authorData + comment_types[`${[lang]}_end`];
        data = data.replace(/~author~/g, authorStamp);
        console.log(chalk.white.bold(prefix.log + 'Found & replaced all ~author~ tokens.'));
      }
      catch(err){
        console.log(chalk.yellow.bold(prefix.warn + 'Author template not found , removing ~author~ token.'));
        data = data.replace(/~author~/g, '');
      }
    }
    else{
      console.log(chalk.white.bold(prefix.log + 'Stamp flag not specified , removing ~author~ token.'));
      data = data.replace(/~author~/g, '');
    }
  }

  //WRITE ALL CHANGES TO FILE
  //check if file already exists before?
  try{
    await fs.promises.writeFile(`${finalName}`,data);
  }
  catch(err){
    console.log(chalk.red.bold(prefix.error + err.message));
    return;
  }
  console.log(chalk.white.bold(prefix.log + 'File generated successfully!'));
}


const createNpmProject=async(name,packages)=>{

  const newDirPath=`${name}`;

  try{
    await fs.promises.mkdir(newDirPath);
  }
  catch(err){
    console.log(chalk.red.bold(prefix.error + err.message));
    return;
  }



  await createFile('js',name,false,name);
  await createFile('package.json',name,false,name);

  if(packages!==undefined){
    let packStr="";
    packages.package.forEach((item)=>{
      packStr += `${item} `;
    });
    packStr = packStr.slice(0,-1);
    let cmds = `cd ${newDirPath} && npm i ${packStr}`;

    try{
      await exec(cmds);
      console.log(chalk.white.bold(prefix.log + 'Dependencies installed!'));
    }
    catch(err){
      console.log(chalk.red.bold(prefix.error + err.message));
      console.log(chalk.red.bold("Could not install dependencies"));
    }
    console.log(chalk.white.bold(prefix.log + 'Project generated successfully!'));
  }

}

/* CLI arguments and functions go here */
const prgVersion = 0.1;
cmdr.version(prgVersion);

cmdr
.argument('<lang>' ,'name of the language / framework / library')
.argument('<name>' ,'name of the file / class / object')
.option('-s , --stamp','Generate Author Token')
.description('creates a new file with specified classname and language extension')
.action((lang,name,options)=>{
  console.log("");
  console.log(chalk.white(figlet.textSync(`jumpstart v ${prgVersion}`,{font:'ANSI Shadow'})));
  if(options.stamp){
    createFile(lang,name,true);
  }
  else{
    createFile(lang,name,false);
  }
});


cmdr
.command('npm')
.argument('<name>' ,'name of the file / class / object')
.option('-p,--package [packages...]','specify Extra packages to be installed')
.description('creates a new project')
.action((name,packages)=>{
  console.log("");
  console.log(chalk.white(figlet.textSync(`jumpstart v ${prgVersion}`,{font:'ANSI Shadow'})));
  createNpmProject(name,packages);
});

cmdr
.command('credits')
.description('show credits')
.action(()=>{
  console.log(chalk.white.bold(`(JU)mp(ST)art v${prgVersion} , made by harvygr8`));
});

cmdr.parse(process.argv);
