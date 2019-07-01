# Tag Work Items Linked With Build or Release

## Overview
This repo contains sources for the custom task for Azure DevOps Server (Team Foundation Server) build or release pipelines. 

The main goal of this task is to put specified tag to the tasks associated wirh particular build or release.

## Build package
1. run `git clone ... ` 
2. cd `AddTagToWorkItems`
3. run `npm install` 
4. run `tsc` 
5. cd `..`
6. run `tfx extension create --manifest-globs ./vss-extension.json --rev-version`
7. you will get `*.vsix` package which you can install in your TFS\ADS

## How to Use Tasks

See the documentation for [Continuous integration and deployment](https://aka.ms/tfbuild).

## Writing Tasks

If you need custom functionality in your build/release, it is usually simpler to use the existing script running tasks such as the PowerShell or Bash tasks.  Writing a new task may be appropriate if you need deeper integration or reusability in many build definitions

Tasks are simply tool runners.  They know how to run MSBuild, VSTest, etc... in a first class way and handle return codes, how to treat std/err out, and how to write timeline records based on expected output.  They also get access to credentials to write back to TFS/Azure Pipelines. 

For uploading custom tasks to Azure Pipelines use the [TFS Cross Platform Command Line utility](https://github.com/Microsoft/tfs-cli).

Tasks can also be deployed with an Azure DevOps extension. See [this tutorial](https://docs.microsoft.com/en-us/vsts/extend/develop/add-build-task) for how to write a custom task and package it inside an extension.