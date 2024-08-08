const bcrypt = require('bcryptjs');

const password = '123123a';  // 원하는 비밀번호
bcrypt.hash(password, 10, (err, hash) => {
    if (err) {
        console.error('Error hashing password:', err);
    } else {
        console.log(`INSERT INTO users (username, password, isAdmin) VALUES ('tmdrn14', '${hash}', TRUE);`);
    }
});
