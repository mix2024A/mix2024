const bcrypt = require('bcrypt');
const connection = require('../config/database');

exports.login = (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.redirect('/?error=Please enter both username and password');
    }

    const query = 'SELECT * FROM users WHERE username = ?';

    connection.query(query, [username], async (err, results) => {
        if (err) {
            console.error('Database query failed: ', err);
            return res.redirect('/?error=An internal server error occurred');
        }

        if (results.length > 0) {
            const user = results[0];
            const match = await bcrypt.compare(password, user.password);
            if (match) {
                req.session.user = username;
                return res.redirect('/main');
            } else {
                return res.redirect('/?error=아이디 또는 비밀번호를 확인해주세요.');
            }
        } else {
            return res.redirect('/?error=아이디 또는 비밀번호를 확인해주세요.');
        }
    });
};

exports.logout = (req, res) => {
    const isAdmin = req.session.admin;
    req.session.destroy(err => {
        if (err) {
            return res.redirect(isAdmin ? '/admin-dashboard' : '/main');
        }
        res.clearCookie('connect.sid');
        res.redirect(isAdmin ? '/admin' : '/');
    });
};
