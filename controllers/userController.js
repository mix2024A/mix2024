const connection = require('../config/database');

// 세션 사용자 검증 함수
function validateSession(req, res, next) {
    if (!req.session.user) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    next();
}

// 사용자 정보 제공 함수
exports.getUserInfo = (req, res) => {
    validateSession(req, res, () => {
        const query = `
            SELECT username, slot, remainingSlots, editCount 
            FROM users 
            WHERE username = ?
        `;
        connection.query(query, [req.session.user], (err, results) => {
            if (err) {
                console.error('Error fetching user info:', err);
                return res.status(500).json({ error: 'Internal Server Error' });
            }
            if (results.length > 0) {
                res.json(results[0]);
            } else {
                res.status(404).json({ error: 'User not found' });
            }
        });
    });
};

// 삭제된 키워드 가져오기 함수 추가
exports.getDeletedKeywords = (req, res) => {
    validateSession(req, res, () => {
        const query = `
            SELECT search_term, display_keyword, slot, created_at, deleted_at, note
            FROM deleted_keywords
            ORDER BY deleted_at DESC
        `;
        
        connection.query(query, (err, results) => {
            if (err) {
                console.error('Error fetching deleted keywords:', err);
                return res.status(500).json({ error: 'Internal Server Error' });
            }
            res.json(results);
        });
    });
};

// 슬롯 사용 함수
exports.useSlot = (req, res) => {
    const { username } = req.body;

    const query = `
        UPDATE users 
        SET remainingSlots = remainingSlots - 1, 
            editCount = editCount - 1 
        WHERE username = ? AND remainingSlots > 0 AND editCount > 0
    `;
    connection.query(query, [username], (err, results) => {
        if (err) {
            console.error('Error updating slot usage:', err);
            return res.status(500).json({ error: 'Internal Server Error' });
        }

        if (results.affectedRows > 0) {
            res.sendStatus(200);
        } else {
            res.status(400).json({ error: 'No slots or edit counts remaining' });
        }
    });
};

// 사용자 충전 내역 제공 함수
exports.getUserChargeHistory = (req, res) => {
    validateSession(req, res, () => {
        const query = `
            SELECT amount, charge_date, expiry_date, 
            CASE 
                WHEN expiry_date >= CURDATE() THEN '진행중' 
                ELSE '종료' 
            END AS status
            FROM charge_history 
            WHERE username = ?
            ORDER BY charge_date DESC
        `;

        connection.query(query, [req.session.user], (err, results) => {
            if (err) {
                console.error('Error fetching charge history:', err);
                return res.status(500).json({ error: 'Internal Server Error' });
            }
            res.json(results);
        });
    });
};

exports.registerSearchTerm = (req, res) => {
    const searchTerm = req.body.searchTerm ? req.body.searchTerm.trim() : null;
    const displayKeyword = req.body.displayKeyword ? req.body.displayKeyword.trim() : null;
    const slot = parseInt(req.body.slot, 10); // 슬롯 수를 정수로 변환
    const note = req.body.note ? req.body.note.trim() : '';

    if (!searchTerm || !displayKeyword || !slot) {
        return res.status(400).json({ error: '검색어, 노출 키워드 및 슬롯은 필수 입력 항목입니다.' });
    }

    const username = req.session.user;

    // 슬롯 차감 로직 추가
    const deductSlotsQuery = `
        UPDATE users 
        SET remainingSlots = remainingSlots - ? 
        WHERE username = ? AND remainingSlots >= ?
    `;

    connection.query(deductSlotsQuery, [slot, username, slot], (err, results) => {
        if (err) {
            console.error('Failed to deduct slots:', err);
            return res.status(500).json({ error: '내부 서버 오류가 발생했습니다.' });
        }

        if (results.affectedRows > 0) {
            // 슬롯 차감이 성공한 경우에만 키워드 등록
            const registerQuery = `
                INSERT INTO registrations (username, search_term, display_keyword, slot, note)
                VALUES (?, ?, ?, ?, ?)
            `;

            connection.query(registerQuery, [username, searchTerm, displayKeyword, slot, note], (err, results) => {
                if (err) {
                    console.error('Failed to register search term:', err);
                    return res.status(500).json({ error: '내부 서버 오류가 발생했습니다.' });
                }
                res.json({ success: true });
            });
        } else {
            res.status(400).json({ error: '슬롯이 부족합니다.' });
        }
    });
};

// 사용자 등록된 검색어 가져오기
exports.getRegisteredSearchTerms = (req, res) => {
    validateSession(req, res, () => {
        const query = 'SELECT * FROM registrations WHERE username = ?';
        connection.query(query, [req.session.user], (err, results) => {
            if (err) {
                console.error('Error fetching registrations:', err);
                return res.status(500).json({ error: 'Internal Server Error' });
            }
            res.json(results);
        });
    });
};

// 키워드 삭제 함수 수정
exports.deleteKeyword = (req, res) => {
    validateSession(req, res, () => {
        const idToDelete = req.body.id;

        // 삭제할 키워드의 데이터를 먼저 가져옴
        const getKeywordQuery = `
            SELECT search_term, display_keyword, slot, created_at, note 
            FROM registrations 
            WHERE id = ? AND username = ?
        `;

        connection.query(getKeywordQuery, [idToDelete, req.session.user], (err, results) => {
            if (err) {
                console.error('Error fetching keyword data:', err);
                return res.status(500).json({ error: 'Internal Server Error' });
            }

            if (results.length > 0) {
                const keyword = results[0];
                const now = new Date();

                // 삭제된 키워드를 deleted_keywords 테이블에 삽입
                const insertDeletedQuery = `
                    INSERT INTO deleted_keywords (search_term, display_keyword, slot, created_at, deleted_at, note)
                    VALUES (?, ?, ?, ?, ?, ?)
                `;

                connection.query(insertDeletedQuery, [
                    keyword.search_term,
                    keyword.display_keyword,
                    keyword.slot,
                    keyword.created_at,
                    now,
                    keyword.note
                ], (err) => {
                    if (err) {
                        console.error('Error inserting deleted keyword:', err);
                        return res.status(500).json({ error: 'Internal Server Error' });
                    }

                    // 기존 registrations 테이블에서 키워드 삭제
                    const deleteQuery = `DELETE FROM registrations WHERE id = ? AND username = ?`;
                    connection.query(deleteQuery, [idToDelete, req.session.user], (err) => {
                        if (err) {
                            console.error('Error deleting keyword:', err);
                            return res.status(500).json({ error: 'Internal Server Error' });
                        }

                        // 슬롯 복원
                        const restoreSlotsQuery = `
                            UPDATE users 
                            SET remainingSlots = remainingSlots + ? 
                            WHERE username = ?
                        `;

                        connection.query(restoreSlotsQuery, [keyword.slot, req.session.user], (err) => {
                            if (err) {
                                console.error('Error restoring slots:', err);
                                return res.status(500).json({ error: 'Internal Server Error' });
                            }

                            res.json({ success: true });
                        });
                    });
                });
            } else {
                res.status(404).json({ error: 'Keyword not found or you are not authorized to delete it.' });
            }
        });
    });
};


exports.editKeyword = (req, res) => {
    validateSession(req, res, () => {
        const { id, slot, note } = req.body;

        if (!id || slot <= 0) {
            return res.status(400).json({ error: '슬롯은 필수 입력 항목입니다.' });
        }

        // 기존 슬롯 수를 가져옴
        const getSlotQuery = `
            SELECT slot 
            FROM registrations 
            WHERE id = ? AND username = ?
        `;

        connection.query(getSlotQuery, [id, req.session.user], (err, results) => {
            if (err) {
                console.error('Error fetching slot data:', err);
                return res.status(500).json({ error: 'Internal Server Error' });
            }

            if (results.length > 0) {
                const currentSlot = results[0].slot;
                const slotDifference = slot - currentSlot; // 새로운 슬롯과 기존 슬롯의 차이 계산

                // 슬롯 조정 쿼리
                const adjustSlotsQuery = `
                    UPDATE users 
                    SET remainingSlots = remainingSlots - ? 
                    WHERE username = ? AND remainingSlots >= ?
                `;

                connection.query(adjustSlotsQuery, [slotDifference, req.session.user, slotDifference], (err, results) => {
                    if (err) {
                        console.error('Error adjusting slots:', err);
                        return res.status(500).json({ error: '내부 서버 오류가 발생했습니다.' });
                    }

                    if (results.affectedRows > 0) {
                        // 슬롯 조정이 성공한 경우에만 키워드 수정
                        const updateQuery = `
                            UPDATE registrations
                            SET slot = ?, note = ?
                            WHERE id = ? AND username = ?
                        `;

                        connection.query(updateQuery, [slot, note, id, req.session.user], (err, results) => {
                            if (err) {
                                console.error('Error editing keyword:', err);
                                return res.status(500).json({ error: '내부 서버 오류가 발생했습니다.' });
                            }

                            if (results.affectedRows > 0) {
                                res.json({ success: true });
                            } else {
                                res.status(404).json({ error: '키워드를 찾을 수 없거나 수정할 권한이 없습니다.' });
                            }
                        });
                    } else {
                        res.status(400).json({ error: '슬롯이 부족합니다.' });
                    }
                });
            } else {
                res.status(404).json({ error: '키워드를 찾을 수 없습니다.' });
            }
        });
    });
};



