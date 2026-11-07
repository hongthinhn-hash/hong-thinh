@echo off
chcp 65001 > nul
title Hong Thinh Video Studio - Khoi Dong

echo ======================================================================
echo           CHÀO MỪNG CHỊ HỒNG THỊNH ĐẾN VỚI VIDEO STUDIO
echo ======================================================================
echo.
echo Đang mở ứng dụng dựng phim có lời bình và phụ đề...
echo.

set APP_URL=file:///D:/Website/Hong Thinh/video-studio/index.html

:: Ưu tiên mở bằng Microsoft Edge ở chế độ Cửa sổ Ứng dụng Desktop chuyên nghiệp
if exist "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" (
    start "" "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" --app="%APP_URL%"
    goto :done
)

:: Nếu không có Edge thì thử Google Chrome
if exist "C:\Program Files\Google\Chrome\Application\chrome.exe" (
    start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" --app="%APP_URL%"
    goto :done
)

:: Mở bằng trình duyệt mặc định nếu không tìm thấy đường dẫn cố định
start "" "%APP_URL%"

:done
echo Đã khởi động ứng dụng thành công!
timeout /t 2 > nul
exit
