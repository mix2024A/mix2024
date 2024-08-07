const bcrypt = require('bcryptjs');

// 원본 비밀번호
const plainPassword = '123123a';

// 비밀번호 해싱
bcrypt.hash(plainPassword, 10, (err, hash) => {
    if (err) throw err;
    console.log('해싱된 비밀번호:', hash);

    // 데이터베이스에 해싱된 비밀번호를 저장하거나 다른 처리를 할 수 있습니다.
});
