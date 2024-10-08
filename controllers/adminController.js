const bcrypt = require('bcrypt');
const connection = require('../config/database');
const axios = require('axios');

// 관리자 정보 제공
exports.getAdminInfo = (req, res) => {
    if (req.session.admin) {
        res.json({ adminUsername: req.session.admin });
    } else {
        res.status(401).json({ error: 'Unauthorized' });
    }
};

// 계정 생성
exports.createAccount = (req, res) => {
    const { username, password, role, company } = req.body;

    if (!username || username.trim() === "") {
        return res.redirect('/create-account?error=사용자 아이디를 입력해주세요.');
    }

    // 중복 확인 쿼리
    let checkQuery;
    let checkParams;

    if (role === 'admin') {
        checkQuery = 'SELECT username FROM admins WHERE username = ?';
        checkParams = [username];
    } else {
        checkQuery = 'SELECT username FROM users WHERE username = ?';
        checkParams = [username];
    }

    connection.query(checkQuery, checkParams, (err, results) => {
        if (err) {
            console.error('Database query failed: ', err);
            return res.status(500).send('An internal server error occurred.');
        }

        if (results.length > 0) {
            return res.redirect('/create-account?error=중복된 계정입니다.');
        }

        bcrypt.hash(password, 10, (err, hash) => {
            if (err) {
                console.error('Password hashing failed: ', err);
                return res.status(500).send('An internal server error occurred.');
            }

            const query = role === 'admin' ?
                'INSERT INTO admins (username, password) VALUES (?, ?)' :
                'INSERT INTO users (username, password, role, company) VALUES (?, ?, ?, ?)';

            connection.query(query, role === 'admin' ? [username, hash] : [username, hash, role, company], (err) => {
                if (err) {
                    console.error('Database insert failed: ', err);
                    return res.status(500).send('An internal server error occurred.');
                }
                res.redirect('/create-account');
            });
        });
    });
};

// 관리자 로그인 처리 함수
exports.adminLogin = (req, res) => {
    const { adminUsername, adminPassword } = req.body;

    if (!adminUsername || !adminPassword) {
        return res.redirect('/admin?error=Please enter both admin username and password');
    }

    const query = 'SELECT * FROM admins WHERE username = ?';

    connection.query(query, [adminUsername], async (err, results) => {
        if (err) {
            console.error('Database query failed: ', err);
            return res.redirect('/admin?error=An internal server error occurred');
        }

        if (results.length > 0) {
            const admin = results[0];
            const match = await bcrypt.compare(adminPassword, admin.password);
            if (match) {
                req.session.admin = adminUsername;
                return res.redirect('/admin-dashboard');
            } else {
                return res.redirect('/admin?error=등록된 사용자가 아닙니다.');
            }
        } else {
            return res.redirect('/admin?error=등록된 사용자가 아닙니다.');
        }
    });
};

// 계정 목록 제공 함수
exports.getAccounts = (req, res) => {
    const query = `
        SELECT id, company, username, role, COALESCE(slot, 0) AS slot, COALESCE(remainingSlots, 0) AS remainingSlots, COALESCE(editCount, 0) AS editCount, 'user' AS account_type 
        FROM users
        UNION ALL
        SELECT id, COALESCE(company, '') AS company, username, role, COALESCE(slot, 0) AS slot, COALESCE(remainingSlots, 0) AS remainingSlots, COALESCE(editCount, 0) AS editCount, 'admin' AS account_type 
        FROM admins
        ORDER BY id ASC;
    `;

    connection.query(query, (err, results) => {
        if (err) {
            console.error('Database query failed: ', err);
            return res.status(500).send('An internal server error occurred.');
        }
        res.json(results);
    });
};

// 계정 삭제 함수
exports.deleteAccount = (req, res) => {
    const { username } = req.query;

    // 유저의 충전 내역을 삭제
    const deleteChargeHistoryQuery = 'DELETE FROM charge_history WHERE username = ?';

    connection.query(deleteChargeHistoryQuery, [username], (err, results) => {
        if (err) {
            console.error('Failed to delete charge history:', err);
            return res.status(500).send('Failed to delete charge history.');
        }

        // 유저가 등록한 키워드 (registrations 테이블에서) 삭제
        const deleteKeywordsQuery = 'DELETE FROM registrations WHERE username = ?';
        connection.query(deleteKeywordsQuery, [username], (err, results) => {
            if (err) {
                console.error('Failed to delete registrations:', err);
                return res.status(500).send('Failed to delete registrations.');
            }

            // 유저가 삭제한 키워드 (deleted_keywords 테이블에서) 삭제
            const deleteDeletedKeywordsQuery = 'DELETE FROM deleted_keywords WHERE username = ?';
            connection.query(deleteDeletedKeywordsQuery, [username], (err, results) => {
                if (err) {
                    console.error('Failed to delete deleted keywords:', err);
                    return res.status(500).send('Failed to delete deleted keywords.');
                }

                // 이후 유저 계정을 삭제
                const deleteUserQuery = 'DELETE FROM users WHERE username = ?';
                connection.query(deleteUserQuery, [username], (err, results) => {
                    if (err) {
                        console.error('Failed to delete account:', err);
                        return res.status(500).send('Failed to delete account.');
                    }

                    if (results.affectedRows > 0) {
                        res.sendStatus(200); // 유저 계정이 성공적으로 삭제된 경우
                    } else {
                        res.status(404).send('User account not found.'); // 유저 계정이 없는 경우
                    }
                });
            });
        });
    });
};



// 슬롯 수정 함수
exports.editSlot = (req, res) => {
    const { username, slot, editCount, remainingSlots, company, role } = req.body;

    if (!username || !role) {
        return res.status(400).send('Missing required fields');
    }

    let query;
    let params;

    if (role === 'admin') {
        query = 'UPDATE admins SET company = ?, slot = ?, editCount = ?, remainingSlots = ? WHERE username = ?';
        params = [company, slot, editCount, remainingSlots, username];
    } else {
        query = 'UPDATE users SET slot = ?, editCount = ?, remainingSlots = ?, company = ? WHERE username = ?';
        params = [slot, editCount, remainingSlots, company, username];
    }

    connection.query(query, params, (err, results) => {
        if (err) {
            console.error('Failed to update slot data:', err);
            return res.status(500).send('An internal server error occurred.');
        }
        res.sendStatus(200);
    });
};

// 슬롯 충전 함수
exports.chargeSlot = (req, res) => {
    const { username, amount } = req.body;

    const getSlotQuery = 'SELECT slot, remainingSlots, editCount FROM users WHERE username = ?';

    connection.query(getSlotQuery, [username], (err, results) => {
        if (err) {
            console.error('Failed to fetch slot data:', err);
            return res.status(500).send('An internal server error occurred.');
        }

        if (results.length === 0) {
            return res.status(404).send('User not found');
        }

        const currentSlot = results[0].slot || 0;
        const currentRemainingSlots = results[0].remainingSlots || 0;
        const currentEditCount = results[0].editCount || 0;

        const newSlot = currentSlot + amount;
        const newRemainingSlots = currentRemainingSlots + amount;
        const newEditCount = currentEditCount + amount;

        const updateSlotQuery = `
            UPDATE users 
            SET slot = ?, remainingSlots = ?, editCount = ?
            WHERE username = ?
        `;

        connection.query(updateSlotQuery, [newSlot, newRemainingSlots, newEditCount, username], (err) => {
            if (err) {
                console.error('Failed to update slot data:', err);
                return res.status(500).send('An internal server error occurred.');
            }

            // 기본 expiry_date를 charge_date로부터 30일 뒤로 설정
            const chargeDate = new Date();
            let expiryDate = new Date(chargeDate);
            expiryDate.setDate(expiryDate.getDate() + 30);

            const insertHistoryQuery = ` 
                INSERT INTO charge_history (username, amount, charge_date, expiry_date)
                VALUES (?, ?, ?, ?)
            `;

            connection.query(insertHistoryQuery, [username, amount, chargeDate, expiryDate], (err) => {
                if (err) {
                    console.error('Failed to insert charge history:', err);
                    return res.status(500).send('An internal server error occurred.');
                }

                res.status(200).send('Slots and edit count updated successfully');
            });
        });
    });
};

// 충전 내역 제공 함수
exports.getChargeHistory = (req, res) => {
    const query = `
        SELECT id, username, amount, charge_date, expiry_date 
        FROM charge_history 
        ORDER BY expiry_date ASC;
    `; 

    connection.query(query, (err, results) => {
        if (err) {
            console.error('Failed to load charge history:', err);
            return res.status(500).send('An internal server error occurred.');
        }
        res.json(results);
    });
};

// 충전 내역 삭제 함수
exports.deleteChargeHistory = (req, res) => {
    const { id } = req.query;

    // 먼저 해당 충전 내역의 사용자와 충전된 금액, 만료 여부를 조회합니다.
    const getHistoryQuery = 'SELECT username, amount, expiry_date, deletion_date FROM charge_history WHERE id = ?';
    
    connection.query(getHistoryQuery, [id], (err, historyResults) => {
        if (err) {
            console.error('Failed to fetch charge history:', err);
            return res.status(500).send('An internal server error occurred.');
        }

        if (historyResults.length === 0) {
            return res.status(404).send('Charge history not found');
        }

        const { username, amount, expiry_date, deletion_date } = historyResults[0];

        // 이미 비활성화된 슬롯인지 확인
        if (deletion_date !== null) {
            // 이미 비활성화된 슬롯이므로 차감 로직을 건너뛰고 바로 삭제
            const deleteQuery = 'DELETE FROM charge_history WHERE id = ?';

            connection.query(deleteQuery, [id], (err, results) => {
                if (err) {
                    console.error('Failed to delete charge history:', err);
                    return res.status(500).send('An internal server error occurred.');
                }

                res.sendStatus(200);
            });
        } else {
            // 아직 비활성화되지 않은 슬롯에 대해서만 차감 로직을 실행
            const deleteQuery = 'DELETE FROM charge_history WHERE id = ?';

            connection.query(deleteQuery, [id], (err, results) => {
                if (err) {
                    console.error('Failed to delete charge history:', err);
                    return res.status(500).send('An internal server error occurred.');
                }

                if (results.affectedRows > 0) {
                    // 사용자 슬롯 정보에서 해당 충전 금액만큼 차감합니다.
                    const updateUserQuery = `
                        UPDATE users 
                        SET slot = GREATEST(0, slot - ?), 
                            remainingSlots = GREATEST(0, remainingSlots - ?), 
                            editCount = GREATEST(0, editCount - ?)
                        WHERE username = ? AND slot >= ?
                    `;

                    connection.query(updateUserQuery, [amount, amount, amount, username, amount], (err, updateResults) => {
                        if (err) {
                            console.error('Failed to update user slot data:', err);
                            return res.status(500).send('An internal server error occurred.');
                        }

                        res.sendStatus(200);
                    });
                } else {
                    res.status(404).send('Charge history not found');
                }
            });
        }
    });
};

// 연장 내역 연장 함수 수정
exports.extendChargeHistory = (req, res) => {
    const { id } = req.query;

    if (!id) {
        return res.status(400).send('Missing required fields');
    }

    const checkExpiryQuery = `
        SELECT expiry_date, username, amount
        FROM charge_history
        WHERE id = ?
    `;

    connection.query(checkExpiryQuery, [id], (err, results) => {
        if (err) {
            console.error('Failed to check charge history expiry date:', err);
            return res.status(500).send('Failed to check charge history expiry date.');
        }

        if (results.length > 0) {
            const expiryDate = new Date(results[0].expiry_date);
            const currentDate = new Date();
            const username = results[0].username;
            const amount = results[0].amount;

            if (expiryDate < currentDate) { // 만료된 경우
                const extendQuery = `
                    UPDATE charge_history
                    SET expiry_date = DATE_ADD(expiry_date, INTERVAL 30 DAY), deletion_date = NULL, isSlotActive = 1
                    WHERE id = ?
                `;

                connection.query(extendQuery, [id], (err, results) => {
                    if (err) {
                        console.error('Failed to extend charge history:', err);
                        return res.status(500).send('Failed to extend charge history.');
                    }

                    if (results.affectedRows > 0) {
                        const increaseSlotsQuery = `
                            UPDATE users
                            SET slot = slot + ?, remainingSlots = remainingSlots + ?, editCount = editCount + ?
                            WHERE username = ?
                        `;

                        connection.query(increaseSlotsQuery, [amount, amount, amount, username], (err, results) => {
                            if (err) {
                                console.error('Failed to increase user slots:', err);
                                return res.status(500).send('Failed to increase user slots.');
                            }

                            console.log(`Slots increased for user ${username}: ${results.affectedRows} rows affected`);
                            res.sendStatus(200);
                        });
                    } else {
                        res.status(404).send('Charge history not found.');
                    }
                });
            } else {
                // 만료되지 않은 슬롯도 30일 연장
                const extendOnlyQuery = `
                    UPDATE charge_history
                    SET expiry_date = DATE_ADD(expiry_date, INTERVAL 30 DAY), deletion_date = NULL, isSlotActive = 1
                    WHERE id = ?
                `;

                connection.query(extendOnlyQuery, [id], (err, results) => {
                    if (err) {
                        console.error('Failed to extend charge history:', err);
                        return res.status(500).send('Failed to extend charge history.');
                    }

                    if (results.affectedRows > 0) {
                        res.sendStatus(200);
                    } else {
                        res.status(404).send('Charge history not found.');
                    }
                });
            }
        } else {
            res.status(404).send('Charge history not found.');
        }
    });
};



// 충전 내역 수정 함수
exports.editChargeHistory = (req, res) => {
    const { id } = req.query;
    const { chargeDate, expiryDate } = req.body;

    if (!id || !chargeDate || !expiryDate) {
        return res.status(400).send('Missing required fields');
    }

    const updateQuery = `
        UPDATE charge_history 
        SET charge_date = ?, expiry_date = ?, deletion_date = NULL 
        WHERE id = ?
    `;

    connection.query(updateQuery, [chargeDate, expiryDate, id], (err, results) => {
        if (err) {
            console.error('Failed to update charge history:', err);
            return res.status(500).send('An internal server error occurred.');
        }

        if (results.affectedRows > 0) {
            res.sendStatus(200);
        } else {
            res.status(404).send('Charge history not found');
        }
    });
};

exports.handleExpiredSlots = () => {
    // 사용자 슬롯을 먼저 차감한 후 비활성화 처리
    const updateAndDeactivateSlotsQuery = `
    UPDATE users u
    JOIN (
        SELECT username, SUM(amount) AS expiredSlotAmount
        FROM charge_history
        WHERE expiry_date < CURDATE() AND isSlotActive = 1
        GROUP BY username
    ) ch ON u.username = ch.username
    SET 
        u.slot = GREATEST(0, u.slot - IFNULL(ch.expiredSlotAmount, 0)),
        u.remainingSlots = GREATEST(0, u.remainingSlots - IFNULL(ch.expiredSlotAmount, 0)),
        u.editCount = GREATEST(0, u.editCount - IFNULL(ch.expiredSlotAmount, 0))
    WHERE ch.expiredSlotAmount > 0;
    `;

    connection.query(updateAndDeactivateSlotsQuery, (err, results) => {
        if (err) {
            console.error('Failed to update user slots:', err);
        } else {
            console.log('User slots updated:', results.affectedRows);
        }

        // 만료된 슬롯의 deletion_date와 isSlotActive를 업데이트합니다.
        const updateExpiredQuery = `
            UPDATE charge_history 
            SET 
                deletion_date = DATE_ADD(expiry_date, INTERVAL 3 DAY), -- 만료일로부터 3일 후에 삭제
                isSlotActive = 0 -- 만료된 슬롯은 비활성화
            WHERE expiry_date < CURDATE() AND deletion_date IS NULL AND isSlotActive = 1;
        `;

        connection.query(updateExpiredQuery, (err, results) => {
            if (err) {
                console.error('Failed to update expired charge history:', err);
            } else {
                console.log('Expired charge history marked for deletion and deactivated:', results.affectedRows);
            }

            // 삭제 예정인 슬롯 삭제
            const deleteQuery = `
            DELETE FROM charge_history 
            WHERE deletion_date <= CURDATE() AND deletion_date IS NOT NULL;
            `;

            connection.query(deleteQuery, (err, results) => {
                if (err) {
                    console.error('Failed to delete charge history:', err);
                } else {
                    console.log('Charge history deleted:', results.affectedRows);
                }
            });
        });
    });
};

//자동완성 순위 로직
exports.getKeywordRank = async (req, res) => {
    const { searchTerm, displayKeyword } = req.body;

    try {
        const response = await axios.get(`https://mac.search.naver.com/mobile/ac?q=${searchTerm}&st=1`);
        const results = response.data;
        // 여기에 결과에서 displayKeyword의 순위를 찾는 로직을 추가
        
        let rank = results.findIndex(item => item === displayKeyword) + 1;
        if (rank === 0) rank = '순위 없음';

        res.json({ rank });
    } catch (error) {
        console.error('Failed to fetch keyword rank:', error);
        res.status(500).json({ error: 'Failed to fetch keyword rank' });
    }
};
