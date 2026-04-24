@echo off
chcp 65001 >nul
set PYTHONIOENCODING=utf-8
cd /d "%~dp0"

:: 1. 生成 Dashboard
echo [1/3] 正在生成 Dashboard...
python build_npi.py
if errorlevel 1 (
    echo 生成失败，请检查 build_npi.py 输出
    pause
    exit /b 1
)
echo.

:: 2. Git 提交
echo [2/3] 正在提交到本地仓库...
"C:\Program Files\Git\cmd\git.exe" add npi_dashboard.html npi_data.json
"C:\Program Files\Git\cmd\git.exe" commit -m "auto update %date% %time%" --quiet 2>nul
if errorlevel 1 (
    echo 没有变更需要提交
) else (
    echo 已提交
)
echo.

:: 3. 推送到 GitHub
echo [3/3] 正在推送到 GitHub...
"C:\Program Files\Git\cmd\git.exe" push origin main 2>nul
if errorlevel 1 (
    echo 推送失败，可能网络不通或未配置远程仓库
    echo 可稍后手动执行: git push origin main
) else (
    echo 推送成功！GitHub Pages 将自动更新。
)
echo.
echo 全部完成！
pause
