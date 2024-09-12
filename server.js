const express = require('express');
const session = require('express-session');
const cors = require('cors');
const path = require('path');
const cron = require('node-cron');
const adminController = require('./controllers/adminController');  // 경로가 정확해야 합니다.
const userController = require('./controllers/userController');
const axios = require('axios');


const app = express();
const port = 8080;

// 미들웨어 설정
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cors());

app.use(session({
    secret: 'your_secret_key',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }
}));

// 라우트 설정
app.use('/', require('./routes/authRoutes'));
app.use('/user', require('./routes/userRoutes'));
app.use('/admin', require('./routes/adminRoutes'));


// 프록시 라우트 추가
app.get('/proxy', async (req, res) => {
    const { q, st } = req.query;  // 클라이언트로부터 쿼리 파라미터를 받습니다.
    try {
        // 네이버 API에 요청을 보냅니다.
        const response = await axios.get(`https://mac.search.naver.com/mobile/ac`, {
            params: { q: q, st: st }
        });
        // 네이버 API로부터 받은 응답을 클라이언트에 전달합니다.
        res.json(response.data);
    } catch (error) {
        console.error('Error fetching data from Naver API:', error);
        res.status(500).send('Error fetching data from Naver API');
    }
});


// HTML 파일 라우트
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'login.html'));
});

// /main 경로 라우트 추가
app.get('/main', (req, res) => {
    if (req.session.user) {
        res.sendFile(path.join(__dirname, 'views', 'main.html'));
    } else {
        res.redirect('/'); // 로그인하지 않은 경우 로그인 페이지로 리디렉션
    }
});



// /user-charge-history 경로 라우트 추가
app.get('/user-charge-history', (req, res) => {
    if (req.session.user) {
        res.sendFile(path.join(__dirname, 'views', 'user-charge-history.html'));
    } else {
        res.redirect('/'); // 로그인하지 않은 경우 로그인 페이지로 리디렉션
    }
});

// /admin-dashboard 경로 라우트 추가
app.get('/admin-dashboard', (req, res) => {
    if (req.session.admin) {
        res.sendFile(path.join(__dirname, 'views', 'admin-dashboard.html'));
    } else {
        res.redirect('/admin'); // 로그인하지 않은 경우 관리자 로그인 페이지로 리디렉션
    }
});

// /create-account 경로 라우트 추가
app.get('/create-account', (req, res) => {
    if (req.session.admin) {
        res.sendFile(path.join(__dirname, 'views', 'create-account.html'));
    } else {
        res.redirect('/admin'); // 관리자가 아닌 경우 관리자 로그인 페이지로 리디렉션
    }
});

// /charge-history 경로 라우트 추가
app.get('/charge-history', (req, res) => {
    if (req.session.admin) {
        res.sendFile(path.join(__dirname, 'views', 'charge-history.html'));
    } else {
        res.redirect('/admin'); // 관리자가 아닌 경우 관리자 로그인 페이지로 리디렉션
    }
});


// 삭제된 키워드 페이지 라우트 추가
app.get('/delkeywords', (req, res) => {
    if (req.session.user) {
        res.sendFile(path.join(__dirname, 'views', 'delkeywords.html')); // 경로에 맞게 파일 이름 변경
    } else {
        res.redirect('/'); // 로그인하지 않은 경우 로그인 페이지로 리디렉션
    }
});

let isHandlingSlots = false;
let isDeletingKeywords = false;
let isUpdatingRankings = false;


// 크론 작업 설정 (슬롯 만료 처리)
cron.schedule('*/20 * * * * *', async () => {
    if (isHandlingSlots) return; // 이미 실행 중이면 중단
    isHandlingSlots = true; // 작업 시작 시 플래그 설정

    try {
        console.log("Calling handleExpiredSlots...");
        await adminController.handleExpiredSlots();
    } catch (error) {
        console.error("Error in handleExpiredSlots:", error);
    } finally {
        isHandlingSlots = false; // 작업 완료 후 플래그 해제
    }
});

// 크론 작업 설정 (키워드 삭제 처리)
cron.schedule('0 0 * * *', async () => {
    if (isDeletingKeywords) return; // 이미 실행 중이면 중단
    isDeletingKeywords = true; // 작업 시작 시 플래그 설정

    try {
        console.log("Running scheduled keyword deletion...");
        await userController.deleteScheduledKeywords();
    } catch (error) {
        console.error("Error in deleteScheduledKeywords:", error);
    } finally {
        isDeletingKeywords = false; // 작업 완료 후 플래그 해제
    }
});

// 크론 작업 설정 (키워드 순위 업데이트)
cron.schedule('*/5 * * * *', async () => {
    if (isUpdatingRankings) return; // 이미 실행 중이면 중단
    isUpdatingRankings = true; // 작업 시작 시 플래그 설정

    try {
        console.log("Running keyword ranking update...");
        await userController.updateKeywordRankings();
    } catch (error) {
        console.error("Error in updateKeywordRankings:", error);
    } finally {
        isUpdatingRankings = false; // 작업 완료 후 플래그 해제
    }
});



// 서버 실행
app.listen(port, () => { 
    console.log(`Server running at http://localhost:${port}/`);
});
