// functions/login.js
const bcrypt = require('bcryptjs');
const mysql = require('mysql');

const db = mysql.createConnection({
  host: 'your-database-host',
  user: 'your-database-user',
  password: 'your-database-password',
  database: 'your-database-name'
});

exports.handler = async (event) => {
  const { username, password } = JSON.parse(event.body);

  return new Promise((resolve, reject) => {
    db.query('SELECT * FROM users WHERE username = ?', [username], (err, results) => {
      if (err) {
        return resolve({ statusCode: 500, body: JSON.stringify({ message: '서버 오류' }) });
      }

      if (results.length > 0) {
        bcrypt.compare(password, results[0].password, (err, match) => {
          if (match) {
            // 로그인 성공
            resolve({ statusCode: 200, body: JSON.stringify({ message: '로그인 성공' }) });
          } else {
            // 비밀번호 불일치
            resolve({ statusCode: 401, body: JSON.stringify({ message: '잘못된 비밀번호' }) });
          }
        });
      } else {
        // 사용자 없음
        resolve({ statusCode: 401, body: JSON.stringify({ message: '사용자 없음' }) });
      }
    });
  });
};
