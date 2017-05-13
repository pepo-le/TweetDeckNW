@echo off

if EXIST %LOCALAPPDATA%\TweetDeckNW (
    rmdir /S /Q %LOCALAPPDATA%\TweetDeckNW
)

echo Uninstall completed.

pause > nul
