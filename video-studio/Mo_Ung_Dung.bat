@echo off
chcp 65001 > nul
title Hong Thinh Video Studio

set APP_URL=file:///%~dp0index.html

if exist "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" (
    start "" "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" --app="%APP_URL%"
    exit
)

if exist "C:\Program Files\Google\Chrome\Application\chrome.exe" (
    start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" --app="%APP_URL%"
    exit
)

start "" "%APP_URL%"
exit
