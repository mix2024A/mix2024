document.addEventListener('DOMContentLoaded', () => {
    let selectedUsername = '';
    let isModalOpen = false;

    const elements = {
        username: document.getElementById('username'),
        tbody: document.querySelector('.account-table tbody'),
        deleteModal: document.getElementById('deleteModal'),
        editModal: document.getElementById('editModal'),
        chargeModal: document.getElementById('chargeModal'), // 추가: 충전 모달 요소
        modalOverlay: document.getElementById('modalOverlay'),
        deleteUsernameElement: document.getElementById('delete-username'),
        modalCompany: document.getElementById('modal-company'),
        modalUsername: document.getElementById('modal-username'),
        modalSlot: document.getElementById('modal-slot'),
        modalEditCount: document.getElementById('modal-editCount'),
        modalRemainingSlots: document.getElementById('modal-remainingSlots'),
        modalRole: document.getElementById('modal-role'), // 추가: 역할 필드
        chargeUsername: document.getElementById('charge-username'), // 추가: 충전 모달의 사용자명 필드
        chargeAmount: document.getElementById('charge-amount'), // 추가: 충전할 슬롯 수 필드
        confirmDeleteButton: document.getElementById('confirmDelete'),
        cancelDeleteButton: document.getElementById('cancelDelete'),
        saveChangesButton: document.getElementById('saveChanges'),
        cancelChangesButton: document.getElementById('cancelChanges'),
        confirmChargeButton: document.getElementById('confirmCharge'), // 추가: 충전 확인 버튼
        cancelChargeButton: document.getElementById('cancelCharge'), // 추가: 충전 취소 버튼
        errorElement: document.getElementById('error-message'),
        form: document.querySelector('form')
    };

    const fetchJSON = (url, options) => fetch(url, options).then(res => res.json());

    function loadAdminInfo() {
        fetchJSON('/admin/admin-info')
            .then(data => {
                if (data.adminUsername) {
                    elements.username.textContent = data.adminUsername;
                } else {
                    console.error('관리자 정보가 없습니다.');
                }
            })
            .catch(error => console.error('Failed to load admin info:', error));
    }

    function loadAccounts() {
        fetchJSON('/admin/api/accounts')
            .then(data => {
                elements.tbody.innerHTML = '';
                data.forEach(account => addAccountRow(account));
            })
            .catch(err => console.error('Failed to load accounts:', err));
    }

    function addAccountRow(account) {
        const tr = document.createElement('tr');

        const fields = [
            account.company || '',
            account.username,
            account.role === 'admin' ? '관리자' : '유저',
            account.slot || 0,
            account.remainingSlots || 0,
            account.editCount || 0
        ];

        fields.forEach(field => {
            const td = document.createElement('td');
            td.textContent = field;
            tr.appendChild(td);
        });

        // 충전 버튼을 위한 셀
        const chargeTd = document.createElement('td');
        createButton('충전', 'account-charge-button', () => openChargeModal(account.username)).forEach(btn => chargeTd.appendChild(btn));
        tr.appendChild(chargeTd);

        // 수정 버튼을 위한 셀
        const editTd = document.createElement('td');
        createButton('수정', 'account-edit-button', () => openEditModal(account)).forEach(btn => editTd.appendChild(btn));
        tr.appendChild(editTd);

        // 삭제 버튼을 위한 셀
        const deleteTd = document.createElement('td');
        createButton('삭제', 'account-delete-button', () => openDeleteModal(account.username)).forEach(btn => deleteTd.appendChild(btn));
        tr.appendChild(deleteTd);

        elements.tbody.appendChild(tr);
    }

    function createButton(text, className, onClick) {
        const button = document.createElement('button');
        button.textContent = text;
        button.classList.add(className);
        button.addEventListener('click', onClick);
        return [button];
    }

    function openModal(modal) {
        modal.style.display = 'block';
        elements.modalOverlay.style.display = 'block';
        isModalOpen = true;
    }

    function closeModal(modal) {
        modal.style.display = 'none';
        elements.modalOverlay.style.display = 'none';
        isModalOpen = false;
    }

    function openDeleteModal(username) {
        selectedUsername = username;
        elements.deleteUsernameElement.textContent = selectedUsername;
        openModal(elements.deleteModal);
        elements.confirmDeleteButton.focus();
    }

    function openEditModal({ company, username, slot, editCount, remainingSlots, role }) {
        elements.modalCompany.value = company || '';
        elements.modalUsername.textContent = username;
        elements.modalSlot.value = slot || 0;
        elements.modalEditCount.value = editCount || 0;
        elements.modalRemainingSlots.value = remainingSlots || 0;
        elements.modalRole.value = role; // 역할 값 설정
        openModal(elements.editModal);
        elements.saveChangesButton.focus();
    }

    function openChargeModal(username) {
        elements.chargeUsername.textContent = username;  // 모달에 사용자 이름 설정
        openModal(elements.chargeModal);  // 충전 모달 열기
        elements.confirmChargeButton.focus();  // 모달 열릴 때 충전 버튼에 포커스 설정
    }

    function deleteAccount() {
        if (!selectedUsername) return;

        fetch(`/admin/delete-account?username=${encodeURIComponent(selectedUsername)}`, { method: 'DELETE' })
            .then(response => {
                if (response.ok) {
                    loadAccounts();
                    closeModal(elements.deleteModal);
                } else {
                    console.error('Failed to delete account');
                }
            })
            .catch(err => console.error('Failed to delete account:', err));
    }

    function saveChanges() {
        const company = elements.modalCompany.value;
        const username = elements.modalUsername.textContent;
        const slot = isNaN(parseInt(elements.modalSlot.value, 10)) ? 0 : parseInt(elements.modalSlot.value, 10);
        const editCount = isNaN(parseInt(elements.modalEditCount.value, 10)) ? 0 : parseInt(elements.modalEditCount.value, 10);
        const remainingSlots = isNaN(parseInt(elements.modalRemainingSlots.value, 10)) ? 0 : parseInt(elements.modalRemainingSlots.value, 10);
        const role = elements.modalRole.value;
    
        fetch(`/admin/edit-slot`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                username,
                company,
                slot,
                editCount,
                remainingSlots,
                role,
            }),
        }).then(response => {
            if (response.ok) {
                loadAccounts();
                closeModal(elements.editModal);
            } else {
                console.error('Failed to update account');
            }
        }).catch(err => console.error('Failed to update account:', err));
    }

    function chargeSlots() {
        const username = elements.chargeUsername.textContent;  // 모달에서 충전할 사용자 이름 가져오기
        const amount = parseInt(elements.chargeAmount.value, 10);  // 충전할 슬롯 수

        if (isNaN(amount) || amount <= 0) {
            alert('충전할 슬롯 수를 올바르게 입력하세요.');
            return;
        }

        fetch('/admin/charge-slot', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, amount }),  // 서버로 데이터 전송
        })
        .then(response => {
            if (response.ok) {
                alert('슬롯 충전이 성공적으로 완료되었습니다.');  // 충전 성공 알림
                loadAccounts();  // 충전 후 계정 목록 새로고침
                closeModal(elements.chargeModal);  // 충전 모달 닫기
                elements.chargeAmount.value = '';  // 충전 슬롯 수 입력 필드 초기화
            } else {
                console.error('Failed to charge slots');
            }
        })
        .catch(error => console.error('Error:', error));
    }

    function handleEnterKey(event, callback) {
        if (event.key === 'Enter') {
            event.preventDefault();
            callback();
        }
    }

    function setupEventListeners() {
        elements.confirmDeleteButton.addEventListener('click', deleteAccount);
        elements.cancelDeleteButton.addEventListener('click', () => closeModal(elements.deleteModal));
        elements.saveChangesButton.addEventListener('click', saveChanges);
        elements.cancelChangesButton.addEventListener('click', () => closeModal(elements.editModal));
        elements.confirmChargeButton.addEventListener('click', chargeSlots);  // 충전 버튼 클릭 시 chargeSlots 함수 실행
        elements.cancelChargeButton.addEventListener('click', () => closeModal(elements.chargeModal));  // 충전 모달 취소 버튼 클릭 시 모달 닫기

        elements.deleteModal.addEventListener('keydown', (event) => handleEnterKey(event, deleteAccount));
        elements.editModal.addEventListener('keydown', (event) => handleEnterKey(event, saveChanges));
        elements.chargeModal.addEventListener('keydown', (event) => handleEnterKey(event, chargeSlots));  // 충전 모달에서 Enter 키로 충전 실행

        if (elements.form) {
            elements.form.addEventListener('submit', (e) => {
                if (isModalOpen) {
                    e.preventDefault();
                } else {
                    validateForm(e);
                }
            });
        }
    }

    function validateForm(e) {
        const usernameInput = document.getElementById('username');
        if (elements.errorElement) elements.errorElement.style.display = 'none';

        if (usernameInput && usernameInput.value.trim() === "") {
            e.preventDefault();
            elements.errorElement.textContent = "사용자 아이디를 입력해주세요.";
            elements.errorElement.style.display = 'block';
        }
    }

    function checkServerErrors() {
        const urlParams = new URLSearchParams(window.location.search);
        const serverErrorMessage = urlParams.get('error');
        if (serverErrorMessage && elements.errorElement) {
            elements.errorElement.textContent = decodeURIComponent(serverErrorMessage);
            elements.errorElement.style.display = 'block';
        }
    }

    // 추가: 현재 페이지 URL과 일치하는 네비게이션 링크에 active 클래스 추가
    const currentPath = window.location.pathname;
    const navbarLinks = document.querySelectorAll('.navbar-link');
    navbarLinks.forEach(link => {
        if (link.getAttribute('href') === currentPath) {
            link.classList.add('active');
        }
    });

    loadAdminInfo();
    loadAccounts();
    setupEventListeners();
    checkServerErrors();
});
