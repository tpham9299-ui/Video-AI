@echo off
setlocal EnableExtensions
chcp 65001 >nul
cd /d "%~dp0"

echo ============================================================
echo   CHOT CODE VIDEO-AI: KIEM TRA ^& DAY LEN GITHUB (master)
echo ============================================================
echo.

echo [1/2] Dang chay: npm run kiem-tra ...
call npm run kiem-tra
if errorlevel 1 (
    color 0C
    echo.
    echo [LOI] npm run kiem-tra THAT BAI! Da dung lai, CHUA commit/push.
    pause
    exit /b 1
)

echo.
echo [2/2] Dang chay: node scripts/ci_smoke_test.mjs ...
node scripts/ci_smoke_test.mjs
if errorlevel 1 (
    color 0C
    echo.
    echo [LOI] ci_smoke_test.mjs THAT BAI! Da dung lai, CHUA commit/push.
    pause
    exit /b 1
)

color 0A
echo.
echo ============================================================
echo   TAT CA KIEM THU DAT 0 HONG!
echo ============================================================
git status --short
echo.

set "MSG="
set /p "MSG=Nhap noi dung commit (bam Enter de dung mac dinh 'Cap nhat he thong'): "
if "%MSG%"=="" set "MSG=Cap nhat he thong"

echo.
echo Dang chay: git add -A
git add -A
if errorlevel 1 (
    color 0C
    echo [LOI] git add that bai!
    pause
    exit /b 1
)

echo Dang chay: git commit -m "%MSG%"
git commit -m "%MSG%"
if errorlevel 1 (
    color 0E
    echo [CANH BAO] Khong co thay doi moi de commit hoac commit loi.
    pause
    exit /b 1
)

echo Dang chay: git push origin master
git push origin master
if errorlevel 1 (
    color 0C
    echo [LOI] git push origin master that bai!
    pause
    exit /b 1
)

echo.
echo [HOAN TAT] Da day code thanh cong len origin/master!
pause
exit /b 0
