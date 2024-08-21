const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

router.get('/user-info', userController.getUserInfo);
router.post('/use-slot', userController.useSlot);

// 사용자 충전 내역 제공 라우트
router.get('/user-charge-history', userController.getUserChargeHistory);
// 충전 내역 조회 API 추가
router.get('/charge-history', userController.getUserChargeHistory);
// 등록 키워드 라우트
router.post('/register-search-term', userController.registerSearchTerm);
// 등록된 검색어 가져오기
router.get('/get-registered-search-terms', userController.getRegisteredSearchTerms);
// 삭제된 키워드 가져오기
router.get('/get-deleted-keywords', userController.getDeletedKeywords);
// 삭제 기능 라우트
router.post('/delete-keyword', userController.deleteKeyword);
// 키워드 수정 라우트 추가
router.post('/edit-keyword', userController.editKeyword);

module.exports = router;
