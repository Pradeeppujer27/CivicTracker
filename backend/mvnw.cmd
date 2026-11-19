@echo off
set "SCRIPT_DIR=%~dp0"
if exist "%SCRIPT_DIR%..\.maven\apache-maven-3.9.6\bin\mvn.cmd" (
    "%SCRIPT_DIR%..\.maven\apache-maven-3.9.6\bin\mvn.cmd" %*
) else if exist "%SCRIPT_DIR%.maven\apache-maven-3.9.6\bin\mvn.cmd" (
    "%SCRIPT_DIR%.maven\apache-maven-3.9.6\bin\mvn.cmd" %*
) else (
    mvn %*
)
