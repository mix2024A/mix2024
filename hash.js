const bcrypt = require('bcrypt');

const hashPassword = async (password) => {
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    console.log(`Password: ${password}`);
    console.log(`Hashed: ${hashedPassword}`);
};

hashPassword('a1234');    // fo9761 사용자의 비밀번호
hashPassword('123123a');  // tmdrn14 관리자의 비밀번호
