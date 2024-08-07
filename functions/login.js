// functions/login.js
const bcrypt = require('bcryptjs');
const mysql = require('mysql');

// MySQL 연결 설정
const db = mysql.createConnection({
    host: 'localhost', // 데이터베이스 호스트
    user: 'root',      // 데이터베이스 사용자 이름
    password: 'tmdrn4933!',  // 데이터베이스 비밀번호
    database: 'mix2024'      // 데이터베이스 이름
});

exports.handler = async (event) => {
    // POST 요청에서 받은 데이터 파싱
    const { username, password } = JSON.parse(event.body);

    return new Promise((resolve, reject) => {
        db.query('SELECT * FROM users WHERE username = ?', [username], (err, results) => {
            if (err) {
                return resolve({ statusCode: 500, body: JSON.stringify({ message: '서버 오류가 발생했습니다.' }) });
            }

            if (results.length > 0) {
                bcrypt.compare(password, results[0].password, (err, match) => {
                    if (match) {
                        resolve({ statusCode: 200, body: JSON.stringify({ message: '로그인 성공' }) });
                    } else {
                        resolve({ statusCode: 401, body: JSON.stringify({ message: '잘못된 비밀번호입니다.' }) });
                    }
                });
            } else {
                resolve({ statusCode: 401, body: JSON.stringify({ message: '사용자 없음' }) });
            }
        });
    });
};
