const express = require('express');
const router = express.Router();
const path = require('path');
const adminController = require('../controllers/adminController');

// 관리자 로그인 페이지 제공
router.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../views/admin.html'));
});

// 관리자 로그인 처리
router.post('/login', adminController.adminLogin);

// 관리자 정보 제공
router.get('/admin-info', adminController.getAdminInfo);

// 계정 생성
router.post('/create-account', adminController.createAccount);

// 계정 정보 제공 (API)
router.get('/api/accounts', adminController.getAccounts);

// 계정 삭제 라우트 추가
router.delete('/delete-account', adminController.deleteAccount);

// 슬롯 수정 라우트 추가
router.post('/edit-slot', adminController.editSlot);

// 슬롯 충전 라우트 추가
router.post('/charge-slot', adminController.chargeSlot);

// 슬롯 충전 날짜 기록 라우트
router.get('/charge-history', adminController.getChargeHistory);

// 슬롯 충전 삭제 라우트
router.delete('/delete-charge-history', adminController.deleteChargeHistory);

//슬롯 충전 날짜 수정 라우트
router.post('/edit-charge-history', adminController.editChargeHistory);

// 연장 라우트 추가
router.post('/extend-charge-history', adminController.extendChargeHistory);

// 예를 들어, 슬롯 만료를 수동으로 트리거할 수 있도록 엔드포인트를 추가
router.post('/handle-expired-slots', (req, res) => {
    adminController.handleExpiredSlots();
    res.status(200).send('Expired slots handled.');
});

module.exports = router;
