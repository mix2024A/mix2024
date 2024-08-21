@echo off

REM 로컬 저장소의 모든 변경 사항을 스테이지에 추가
git add .

REM 커밋 메시지 입력 (원하는 커밋 메시지로 변경)
git commit -m "Your commit message"

REM 원격 저장소에 변경 사항 푸시
git push origin main

REM SSH를 통해 원격 서버에 접속하여 Git 명령어 실행
ssh -i "C:\Users\pok_m\.ssh\mix2024.pem" ubuntu@3.36.63.212 "cd ~/mix2024 && git stash && git pull origin main && git stash pop && pm2 restart server"

REM 배포 스크립트 종료
exit
