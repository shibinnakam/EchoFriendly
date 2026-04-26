@echo off
echo Staging frontend security updates...
git add frontend/admin.html frontend/user.html frontend/auth-config.js
echo.
echo Committing changes...
git commit -m "Final professional security update"
echo.
echo Pushing to GitHub...
git push
echo.
echo Done! Please refresh your Netlify site in a few moments.
pause
