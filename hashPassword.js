const bcrypt = require('bcryptjs');

const password = '123123a'; // 해싱할 비밀번호

bcrypt.hash(password, 10, (err, hash) => {
  if (err) {
    console.error(err);
  } else {
    console.log('Hashed password:', hash);
  }
});
