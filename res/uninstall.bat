@echo off
Setlocal
set /P pushKey="Do you want to uninstall(y/n)? : %pushKey%"
if "%pushKey%"=="y" (
    if EXIST %LOCALAPPDATA%\TweetDeckNW (
        rmdir /S /Q %LOCALAPPDATA%\TweetDeckNW
        echo Uninstall completed.
    ) else (
        echo Profile not found. Uninstall canceled.
    )
) else (
    echo Uninstall canceled.
)

pause > nul
