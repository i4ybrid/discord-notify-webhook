#!/bin/bash

currentWorkingDir=`basename $PWD`
pm2 start src/index.js --name  "$currentWorkingDir"
