@echo off

git add .
git commit -m "Your commit message"
git push origin main


REM SSH를 통해 원격 서버에 접속하여 Git 명령어 실행
ssh -i "C:\Users\pok_m\.ssh\mix2024.pem" ubuntu@3.36.63.212 ^
"cd ~/mix2024 && git stash && git pull origin main && git stash pop && pm2 restart server"

REM 배포 스크립트 종료
exit
