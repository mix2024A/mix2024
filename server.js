const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const mysql = require('mysql');
const bcrypt = require('bcrypt');
const session = require('express-session');
const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// 세션 설정
app.use(session({
    secret: 'secret-key', 
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }
}));

// MySQL 데이터베이스 연결 설정
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'tmdrn4933!',
    database: 'mix2024'
});

// 데이터베이스 연결
db.connect((err) => {
    if (err) {
        console.error('데이터베이스 연결 실패:', err);
        process.exit(1);
    }
    console.log('MySQL Connected...');
});

// 유틸리티 함수: 날짜 형식을 YYYY/MM/DD로 변환
const formatDate = (date) => {
    if (!date) return "YYYY/MM/DD";
    const d = new Date(date);
    const year = d.getFullYear();
    const month = ("0" + (d.getMonth() + 1)).slice(-2);
    const day = ("0" + d.getDate()).slice(-2);
    return `${year}/${month}/${day}`;
};

// 로그인 페이지를 루트('/')에서 제공
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// 계정 생성 API
app.post('/createAccount', async (req, res) => {
    const { username, password, role } = req.body;
    const sql = 'SELECT * FROM accounts WHERE username = ?';

    db.query(sql, [username], async (err, result) => {
        if (err) {
            console.error('SELECT 쿼리 오류:', err);
            return res.status(500).json({ error: '데이터베이스 오류' });
        }
        if (result.length > 0) {
            return res.status(400).json({ error: '중복된 아이디입니다.' });
        } else {
            const hashedPassword = await bcrypt.hash(password, 10);
            const insertSql = 'INSERT INTO accounts (username, password, role) VALUES (?, ?, ?)';
            db.query(insertSql, [username, hashedPassword, role], (err, result) => {
                if (err) {
                    console.error('INSERT 쿼리 오류:', err);
                    return res.status(500).json({ error: '계정 생성 실패' });
                }
                res.status(200).json({ message: '계정이 성공적으로 생성되었습니다.' });
            });
        }
    });
});

// 로그인 API
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    const sql = 'SELECT * FROM accounts WHERE username = ?';

    db.query(sql, [username], async (err, result) => {
        if (err) {
            console.error('SELECT 쿼리 오류:', err);
            return res.status(500).json({ error: '데이터베이스 오류' });
        }
        if (result.length > 0) {
            const account = result[0];
            const match = await bcrypt.compare(password, account.password);
            if (match) {
                req.session.user = account;
                res.status(200).json({ message: '로그인 성공', redirectUrl: '/main.html' });
            } else {
                res.status(400).json({ error: '아이디 또는 비밀번호가 잘못되었습니다.' });
            }
        } else {
            res.status(400).json({ error: '아이디 또는 비밀번호가 잘못되었습니다.' });
        }
    });
});

// 계정 목록 가져오기 API
app.get('/accounts', (req, res) => {
    const sql = 'SELECT username, role FROM accounts';

    db.query(sql, (err, results) => {
        if (err) {
            console.error('SELECT 쿼리 오류:', err);
            return res.status(500).json({ error: '데이터베이스 오류' });
        }
        res.status(200).json(results);
    });
});

// 계정 수정 API
app.put('/accounts/:username', (req, res) => {
    const { username } = req.params;
    const { newPassword, newRole } = req.body;
    const sql = 'UPDATE accounts SET password = ?, role = ? WHERE username = ?';
    bcrypt.hash(newPassword, 10, (err, hashedPassword) => {
        if (err) {
            console.error('비밀번호 해싱 오류:', err);
            return res.status(500).json({ error: '비밀번호 해싱 오류' });
        }
        db.query(sql, [hashedPassword, newRole, username], (err, result) => {
            if (err) {
                console.error('UPDATE 쿼리 오류:', err);
                return res.status(500).json({ error: '계정 수정 실패' });
            }
            res.status(200).json({ message: '계정이 성공적으로 수정되었습니다.' });
        });
    });
});

// 계정 삭제 API
app.delete('/accounts/:username', (req, res) => {
    const { username } = req.params;
    const sql = 'DELETE FROM accounts WHERE username = ?';
    db.query(sql, [username], (err, result) => {
        if (err) {
            console.error('DELETE 쿼리 오류:', err);
            return res.status(500).json({ error: '계정 삭제 실패' });
        }
        res.status(200).json({ message: '계정이 성공적으로 삭제되었습니다.' });
    });
});

// 키워드 목록 가져오기 API
app.get('/keywords', (req, res) => {
    const user_id = req.session.user.id;
    const sql = 'SELECT * FROM keywords WHERE user_id = ?';

    db.query(sql, [user_id], (err, results) => {
        if (err) {
            console.error('SELECT 쿼리 오류:', err);
            return res.status(500).json({ error: '데이터베이스 오류' });
        }
        results.forEach(row => {
            row.startDate = formatDate(row.startDate);
            row.omitDate = row.omitDate || ""; 
        });
        res.status(200).json(results);
    });
});

// 키워드 등록 API
app.post('/keywords', (req, res) => {
    const { companyName, keyword, note, exposure, startDate } = req.body;
    const user_id = req.session.user.id;
    const formattedStartDate = startDate ? new Date(startDate).toISOString().split('T')[0].replace(/-/g, '/') : null;

    const sql = 'INSERT INTO keywords (companyName, keyword, note, exposure, startDate, user_id) VALUES (?, ?, ?, ?, ?, ?)';
    db.query(sql, [companyName, keyword, note, exposure, formattedStartDate, user_id], (err, result) => {
        if (err) {
            console.error('INSERT 쿼리 오류:', err);
            return res.status(500).json({ error: '키워드 등록 실패' });
        }
        res.status(200).json({ message: '키워드가 성공적으로 등록되었습니다.' });
    });
});

// 키워드 수정 API
app.put('/keywords/:id', (req, res) => {
    const { id } = req.params;
    const { companyName, keyword, note, exposure, startDate, omitDate } = req.body;
    const formattedStartDate = startDate ? new Date(startDate).toISOString().split('T')[0].replace(/-/g, '/') : null;
    const sql = 'UPDATE keywords SET companyName = ?, keyword = ?, note = ?, exposure = ?, startDate = ?, omitDate = ? WHERE id = ?';
    
    db.query(sql, [companyName, keyword, note, exposure, formattedStartDate, omitDate, id], (err, result) => {
        if (err) {
            console.error('UPDATE 쿼리 오류:', err);
            return res.status(500).json({ error: '키워드 수정 실패' });
        }
        res.status(200).json({ message: '키워드가 성공적으로 수정되었습니다.' });
    });
});

// 키워드 삭제 API
app.delete('/keywords/:id', (req, res) => {
    const { id } = req.params;
    const sql = 'DELETE FROM keywords WHERE id = ?';
    
    db.query(sql, [id], (err, result) => {
        if (err) {
            console.error('DELETE 쿼리 오류:', err);
            return res.status(500).json({ error: '키워드 삭제 실패' });
        }
        res.status(200).json({ message: '키워드가 성공적으로 삭제되었습니다.' });
    });
});

// 키워드 검색 API
app.get('/search', (req, res) => {
    const { keyword, exposure } = req.query;
    const sql = 'SELECT * FROM keywords WHERE keyword LIKE ? AND exposure LIKE ?';
    db.query(sql, [`%${keyword}%`, `%${exposure}%`], (err, results) => {
        if (err) {
            console.error('SELECT 쿼리 오류:', err);
            return res.status(500).json({ error: '검색 실패' });
        }
        results.forEach(row => {
            row.startDate = formatDate(row.startDate);
            row.omitDate = row.omitDate || ""; 
        });
        res.status(200).json(results);
    });
});


const PORT = process.env.PORT || 8080;

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
