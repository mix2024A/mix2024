const express = require('express');
const path = require('path');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const mysql = require('mysql');

const app = express();

// MySQL 데이터베이스 연결 설정
const db = mysql.createConnection({
    host: 'localhost',     // MySQL 서버 호스트
    user: 'root',          // 정확한 MySQL 사용자 이름
    password: 'tmdrn4933!',  // 정확한 MySQL 비밀번호
    database: 'mix2024'    // 사용할 데이터베이스 이름
});

// MySQL 연결
db.connect((err) => {
    if (err) {
        console.error('MySQL 연결 오류:', err);
        return;
    }
    console.log('MySQL에 연결되었습니다.');
});

// Express 설정
app.use(express.static(path.join(__dirname, 'public')));  // 정적 파일 제공 설정
app.use(express.urlencoded({ extended: true }));          // 폼 데이터 파싱
app.use(express.json());                                   // JSON 데이터 파싱

// 세션 설정
app.use(session({
    secret: 'your_secret_key',
    resave: false,
    saveUninitialized: true
}));

// 로그인 페이지
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 로그인 처리
app.post('/login', (req, res) => {
    const username = req.body.username;
    const password = req.body.password;

    db.query('SELECT * FROM users WHERE username = ?', [username], (err, results) => {
        if (err) {
            console.error('Database query error:', err);
            return res.status(500).json({ message: '서버 오류가 발생했습니다.' });
        }

        if (results.length > 0) {
            bcrypt.compare(password, results[0].password, (err, match) => {
                if (err) {
                    console.error('Bcrypt error:', err);
                    return res.status(500).json({ message: '서버 오류가 발생했습니다.' });
                }

                if (match) {
                    req.session.loggedin = true;
                    req.session.username = username;
                    req.session.role = results[0].role;

                    // 로그인 성공 시 메인 페이지로 리다이렉트
                    res.json({ success: true }); // JSON 형식으로 응답
                } else {
                    // 로그인 실패 시 클라이언트에 상태 전달
                    res.status(401).json({ message: '잘못된 아이디 또는 비밀번호입니다.' });
                }
            });
        } else {
            // 로그인 실패 시 클라이언트에 상태 전달
            res.status(401).json({ message: '잘못된 아이디 또는 비밀번호입니다.' });
        }
    });
});

// 메인 페이지
app.get('/main', (req, res) => {
    if (req.session.loggedin) {
        res.sendFile(path.join(__dirname, 'public', 'main.html'));
    } else {
        res.redirect('/');
    }
});

// 사용자 정보 제공 API
app.get('/user-info', (req, res) => {
    if (req.session.loggedin) {
        // 로그인한 사용자 정보를 JSON으로 전달
        res.json({ role: req.session.role, username: req.session.username });
    } else {
        res.status(401).json({ message: '로그인되지 않았습니다.' });
    }
});

// 관리자 페이지
app.get('/admin', (req, res) => {
    if (req.session.loggedin && req.session.role === 'admin') {
        res.sendFile(path.join(__dirname, 'public', 'admin.html'));
    } else {
        res.redirect('/');
    }
});

// 계정 목록 불러오기
app.get('/users', (req, res) => {
    if (req.session.loggedin && req.session.role === 'admin') {
        db.query('SELECT username, role FROM users', (err, results) => {
            if (err) {
                console.error('Error fetching user list:', err);
                return res.status(500).json({ message: '계정 목록을 불러오는 중 오류가 발생했습니다.' });
            }
            res.json(results);
        });
    } else {
        res.status(401).json({ message: '권한이 없습니다.' });
    }
});

// 계정 생성 처리
app.post('/create-account', (req, res) => {
    const username = req.body.username;
    const password = req.body.password;
    const role = req.body.role;

    // 중복 체크
    db.query('SELECT * FROM users WHERE username = ?', [username], (err, results) => {
        if (err) {
            console.error('Database query error:', err);
            return res.status(500).json({ message: '서버 오류가 발생했습니다.' });
        }

        if (results.length > 0) {
            // 중복된 아이디가 존재할 경우
            return res.status(400).json({ message: '중복된 아이디입니다.' });
        }

        // 비밀번호 해시 및 계정 생성
        bcrypt.hash(password, 10, (err, hash) => {
            if (err) {
                console.error('Hashing error:', err);
                return res.status(500).json({ message: '비밀번호 해시 오류가 발생했습니다.' });
            }

            db.query('INSERT INTO users (username, password, role) VALUES (?, ?, ?)', [username, hash, role], (err, result) => {
                if (err) {
                    console.error('Database insert error:', err);
                    return res.status(500).json({ message: '사용자 생성 중 오류가 발생했습니다.' });
                }

                res.json({ message: '사용자가 생성되었습니다.' });
            });
        });
    });
});

// 계정 삭제 처리
app.delete('/delete-account/:username', (req, res) => {
    const username = req.params.username;

    db.query('DELETE FROM users WHERE username = ?', [username], (err, result) => {
        if (err) {
            console.error('Database delete error:', err);
            return res.status(500).json({ message: '계정 삭제 중 오류가 발생했습니다.' });
        }

        if (result.affectedRows > 0) {
            res.json({ message: '계정이 삭제되었습니다.' });
        } else {
            res.status(404).json({ message: '계정을 찾을 수 없습니다.' });
        }
    });
});

// 로그아웃 처리
app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

// 서버 시작
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`서버가 http://localhost:${PORT} 에서 실행 중입니다.`);
});
