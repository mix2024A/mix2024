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

// 삭제된 키워드 가져오기 함수 수정
exports.getDeletedKeywords = (req, res) => {
    validateSession(req, res, () => {
        const query = `
        SELECT search_term, display_keyword, slot, created_at, deleted_at, note, ranking
        FROM deleted_keywords
        WHERE username = ?  -- 현재 로그인한 사용자와 연관된 키워드만 가져옴
        ORDER BY deleted_at DESC
    `;
    
        
        connection.query(query, [req.session.user], (err, results) => {
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
            ORDER BY charge_date ASC;
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
        const { page = 1, limit = 50 } = req.query;
        const offset = (page - 1) * limit;

        // 등록된 검색어 가져오기
        const getItemsQuery = `
            SELECT * 
            FROM registrations 
            WHERE username = ? 
            ORDER BY created_at DESC
            LIMIT ? OFFSET ?
        `;

        // 전체 등록된 검색어 수 가져오기
        const getTotalCountQuery = `
            SELECT COUNT(*) AS totalItems 
            FROM registrations 
            WHERE username = ?
        `;

        // 먼저 등록된 검색어를 가져옴
        connection.query(getItemsQuery, [req.session.user, parseInt(limit), offset], (err, results) => {
            if (err) {
                console.error('Error fetching registrations:', err);
                return res.status(500).json({ error: 'Internal Server Error' });
            }

            // 전체 검색어 수를 가져옴
            connection.query(getTotalCountQuery, [req.session.user], (err, totalResults) => {
                if (err) {
                    console.error('Error fetching total item count:', err);
                    return res.status(500).json({ error: 'Internal Server Error' });
                }

                // 결과를 클라이언트에 반환
                res.json({
                    items: results,
                    totalItems: totalResults[0].totalItems,
                });
            });
        });
    });
};


// 키워드 삭제 함수
exports.deleteKeyword = (req, res) => {
    // 세션 유효성 검사
    validateSession(req, res, () => {
        const idToDelete = req.body.id;

        // 사용자 수정 횟수(editCount)를 가져오는 쿼리
        const getUserEditCountQuery = `
            SELECT editCount 
            FROM users 
            WHERE username = ?
        `;

        // 사용자 수정 횟수 조회
        connection.query(getUserEditCountQuery, [req.session.user], (err, userResults) => {
            if (err) {
                console.error('Error fetching user edit count:', err);
                return res.status(500).json({ error: 'Internal Server Error' });
            }

            if (userResults.length > 0) {
                const editCount = userResults[0].editCount;

                // 삭제할 수정 횟수가 부족할 경우 오류 반환
                if (editCount <= 0) {
                    return res.status(400).json({ error: '삭제 횟수가 부족하여 키워드를 삭제할 수 없습니다.' });
                }

                // 삭제하려는 키워드의 데이터를 가져오는 쿼리
                const getKeywordQuery = `
                    SELECT search_term, display_keyword, slot, created_at, ranking, note 
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
                        const now = new Date(); // 현재 시간
                        const scheduledDeletionDate = new Date(); // 3일 후 삭제 예정 시간
                        scheduledDeletionDate.setDate(scheduledDeletionDate.getDate() + 3);
                        scheduledDeletionDate.setHours(0, 0, 0, 0); // 자정으로 설정

                        // 삭제된 키워드를 deleted_keywords 테이블에 삽입하는 쿼리
                        const insertDeletedQuery = `
                            INSERT INTO deleted_keywords (username, search_term, display_keyword, slot, created_at, deleted_at, note, scheduled_deletion_date, ranking)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                        `;

                        connection.query(insertDeletedQuery, [
                            req.session.user,
                            keyword.search_term,
                            keyword.display_keyword,
                            keyword.slot,
                            keyword.created_at,
                            now, // 삭제된 시각
                            keyword.note,
                            scheduledDeletionDate, // 삭제 예정일
                            keyword.ranking // ranking 값을 복사
                        ], (err) => {
                            if (err) {
                                console.error('Error inserting deleted keyword:', err);
                                return res.status(500).json({ error: 'Internal Server Error' });
                            }

                            // registrations 테이블에서 키워드를 삭제하는 쿼리
                            const deleteQuery = `DELETE FROM registrations WHERE id = ? AND username = ?`;
                            connection.query(deleteQuery, [idToDelete, req.session.user], (err) => {
                                if (err) {
                                    console.error('Error deleting keyword:', err);
                                    return res.status(500).json({ error: 'Internal Server Error' });
                                }

                                // 슬롯 복원 쿼리 (remainingSlots를 복구)
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

                                    // 키워드가 누락되지 않은 경우에만 수정 횟수(editCount) 차감
                                    if (keyword.ranking !== -1) {
                                        const deductEditCountQuery = `
                                            UPDATE users
                                            SET editCount = GREATEST(0, editCount - 1)
                                            WHERE username = ?
                                        `;
                                        connection.query(deductEditCountQuery, [req.session.user], (err) => {
                                            if (err) {
                                                console.error('Error deducting edit count:', err);
                                                return res.status(500).json({ error: 'Internal Server Error' });
                                            }
                                            res.json({ success: true }); // 삭제 성공 응답
                                        });
                                    } else {
                                        // 누락된 키워드는 editCount를 차감하지 않고 슬롯만 복구
                                        res.json({ success: true }); // 삭제 성공 응답
                                    }
                                });
                            });
                        });
                    } else {
                        res.status(404).json({ error: 'Keyword not found or you are not authorized to delete it.' });
                    }
                });
            } else {
                res.status(404).json({ error: 'User not found.' });
            }
        });
    });
};



// 슬롯 갯수 수정
exports.editKeyword = (req, res) => {
    validateSession(req, res, () => {
        const { id, slot, note } = req.body;

        if (!id || slot <= 0) {
            return res.status(400).json({ error: '슬롯은 필수 입력 항목입니다.' });
        }

        connection.beginTransaction(err => {
            if (err) {
                console.error('Transaction start failed:', err);
                return res.status(500).json({ error: 'Internal Server Error' });
            }

            const getSlotQuery = `
                SELECT slot 
                FROM registrations 
                WHERE id = ? AND username = ?
            `;

            connection.query(getSlotQuery, [id, req.session.user], (err, results) => {
                if (err) {
                    console.error('Error fetching slot data:', err);
                    return connection.rollback(() => {
                        res.status(500).json({ error: 'Internal Server Error' });
                    });
                }

                if (results.length === 0) {
                    return connection.rollback(() => {
                        res.status(404).json({ error: '키워드를 찾을 수 없습니다.' });
                    });
                }

                const currentSlot = results[0].slot;
                const slotDifference = slot - currentSlot;

                const getRemainingSlotsQuery = `
                    SELECT remainingSlots 
                    FROM users 
                    WHERE username = ?
                `;

                connection.query(getRemainingSlotsQuery, [req.session.user], (err, userResults) => {
                    if (err) {
                        console.error('Error fetching remaining slots:', err);
                        return connection.rollback(() => {
                            res.status(500).json({ error: 'Internal Server Error' });
                        });
                    }

                    const remainingSlots = userResults[0].remainingSlots;

                    if (slotDifference > 0 && remainingSlots < slotDifference) {
                        return connection.rollback(() => {
                            res.status(400).json({ error: '잔여 슬롯이 부족하여 수정할 수 없습니다.' });
                        });
                    }

                    const updateQuery = `
                        UPDATE registrations
                        SET slot = ?, note = ?
                        WHERE id = ? AND username = ?
                    `;

                    connection.query(updateQuery, [slot, note, id, req.session.user], (err) => {
                        if (err) {
                            console.error('Error updating keyword:', err);
                            return connection.rollback(() => {
                                res.status(500).json({ error: 'Internal Server Error' });
                            });
                        }

                        if (slotDifference !== 0) {
                            const adjustSlotsQuery = `
                                UPDATE users 
                                SET remainingSlots = remainingSlots - ?
                                WHERE username = ?
                            `;

                            connection.query(adjustSlotsQuery, [slotDifference, req.session.user], (err) => {
                                if (err) {
                                    console.error('Error adjusting slots:', err);
                                    return connection.rollback(() => {
                                        res.status(500).json({ error: 'Internal Server Error' });
                                    });
                                }

                                connection.commit(err => {
                                    if (err) {
                                        console.error('Transaction commit failed:', err);
                                        return connection.rollback(() => {
                                            res.status(500).json({ error: 'Internal Server Error' });
                                        });
                                    }

                                    res.json({ success: true });
                                });
                            });
                        } else {
                            connection.commit(err => {
                                if (err) {
                                    console.error('Transaction commit failed:', err);
                                    return connection.rollback(() => {
                                        res.status(500).json({ error: 'Internal Server Error' });
                                    });
                                }

                                res.json({ success: true });
                            });
                        }
                    });
                });
            });
        });
    });
};


//키워드 카운트 추가 라우트
exports.getKeywordCount = (req, res) => {
    validateSession(req, res, () => {
        const query = `
            SELECT COUNT(*) AS keywordCount 
            FROM registrations 
            WHERE username = ?
        `;

        connection.query(query, [req.session.user], (err, results) => {
            if (err) {
                console.error('Error fetching keyword count:', err);
                return res.status(500).json({ error: 'Internal Server Error' });
            }
            res.json({ keywordCount: results[0].keywordCount });
        });
    });
};


// 삭제 예정일이 지난 키워드를 삭제하는 함수
exports.deleteScheduledKeywords = () => {
    const currentDate = new Date();

    // 삭제할 항목을 선택하고 삭제 작업 수행
    const deleteQuery = `
        DELETE FROM deleted_keywords 
        WHERE scheduled_deletion_date <= ?
    `;

    connection.query(deleteQuery, [currentDate], (err, deleteResults) => {
        if (err) {
            console.error('Failed to delete scheduled keywords:', err);
            return;
        }

        console.log('Expired keywords deleted:', deleteResults.affectedRows);
    });
};

// 키워드 순위 업데이트 함수
exports.updateKeywordRankings = () => {
    const query = `
        SELECT id, search_term, display_keyword, ranking FROM registrations
    `;

    connection.query(query, (err, results) => {
        if (err) {
            console.error('키워드 가져오기 오류:', err);
            return;
        }

        results.forEach(async (keyword) => {
            const searchTerm = keyword.search_term;
            const displayKeyword = keyword.display_keyword;
            const previousRank = keyword.ranking;  // 이전 순위

            try {
                const response = await fetch(`http://3.36.63.212:8080/proxy?q=${encodeURIComponent(searchTerm)}&st=1`);

                const data = await response.json();

                let newRank = null;

                if (data.items && data.items.length > 0) {
                    const itemArray = data.items[0];
                    newRank = itemArray.findIndex(item => item[0] === displayKeyword) + 1;
                }

                if (newRank === 0) {
                    newRank = null; // 순위가 검색되지 않았을 때 newRank를 null로 설정
                }

                // 새로운 순위가 없고, 이전에 순위가 있었던 경우 "누락" 처리
                if (newRank === null && previousRank !== null) {
                    console.log(`Keyword "${displayKeyword}" is missing from the rankings. Marking as "누락".`);
                    newRank = -1;  // '누락'을 데이터베이스에 -1로 저장
                }

                const updateQuery = `
                    UPDATE registrations
                    SET ranking = ?
                    WHERE id = ?
                `;

                connection.query(updateQuery, [newRank, keyword.id], (err) => {
                    if (err) {
                        console.error('키워드 순위 업데이트 오류:', err);
                    }
                });

            } catch (error) {
                console.error('순위 가져오기 오류:', error);
            }
        });
    });
};
