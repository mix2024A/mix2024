document.addEventListener("DOMContentLoaded", function () {
    let selectedId = null;
    let activeModal = null;

    // 관리자 정보 가져오기
    fetch('/admin/admin-info')
        .then(response => response.json())
        .then(data => {
            if (data.adminUsername) {
                document.getElementById('username').textContent = data.adminUsername;
            } else {
                window.location.href = '/admin'; 
            }
        })
        .catch(error => console.error('Error:', error));

    const currentPath = window.location.pathname;
    const navbarLinks = document.querySelectorAll('.navbar-link');

    navbarLinks.forEach(link => {
        if (link.getAttribute('href') === currentPath) {
            link.classList.add('active');
        }
    });

    const searchButton = document.getElementById('search-button');
    const searchInput = document.getElementById('search-id');

    // "찾기" 버튼 클릭 시 검색 수행
    searchButton.addEventListener('click', () => {
        const searchQuery = searchInput.value.trim();
        loadChargeHistory(searchQuery);
    });

    // "엔터" 키로 검색 수행
    searchInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            event.preventDefault(); // 기본 동작 방지
            searchButton.click(); // "찾기" 버튼 클릭 이벤트 실행
        }
    });

    // 초기 로딩 시 전체 내역 로드
    loadChargeHistory();

    function loadChargeHistory(searchQuery = '') {
        fetch('/admin/charge-history')
            .then(response => response.json())
            .then(data => {
                const historyTableBody = document.getElementById('history-table-body');
                historyTableBody.innerHTML = '';

                data.forEach(item => {
                    if (searchQuery && !item.username.toLowerCase().includes(searchQuery.toLowerCase())) {
                        return; // 검색어와 일치하지 않는 경우 건너뜀
                    }

                    const row = document.createElement('tr');
                    const usernameCell = document.createElement('td');
                    const amountCell = document.createElement('td');
                    const dateCell = document.createElement('td');
                    const expiryDateCell = document.createElement('td');
                    const statusCell = document.createElement('td');
                    const extendCell = document.createElement('td');
                    const editCell = document.createElement('td');
                    const deleteCell = document.createElement('td');

                    usernameCell.textContent = item.username;
                    amountCell.textContent = item.amount;

                    const date = new Date(item.charge_date);
                    const formattedDate = isNaN(date) ? '' : date.toISOString().split('T')[0];
                    dateCell.textContent = formattedDate;

                    const expiryDate = new Date(item.expiry_date);
                    const formattedExpiryDate = isNaN(expiryDate) ? '' : expiryDate.toISOString().split('T')[0];
                    expiryDateCell.textContent = formattedExpiryDate;

                    const currentDate = new Date();  // 현재 날짜와 시간을 가져옴
                    const threeDaysAfterExpiry = new Date(expiryDate);
                    threeDaysAfterExpiry.setDate(threeDaysAfterExpiry.getDate() + 3);
                    
                    if (currentDate.toDateString() === expiryDate.toDateString()) {
                        statusCell.textContent = '진행중';
                    } else if (currentDate < expiryDate) {
                        statusCell.textContent = '진행중';
                    } else if (currentDate <= threeDaysAfterExpiry) {
                        statusCell.textContent = '종료';
                    } else {
                        return; // 3일이 지나면 이 항목을 테이블에 표시하지 않음
                    }
                    

                    // 연장 버튼 생성 및 추가
                    const extendButton = document.createElement('button');
                    extendButton.textContent = '연장';
                    extendButton.style.backgroundColor = '#3b49df';
                    extendButton.classList.add('account-charge-button');
                    extendButton.addEventListener('click', () => {
                        openExtendModal(item.id, item.username, formattedExpiryDate);
                    });

                    extendCell.appendChild(extendButton);
                    
                    const editButton = document.createElement('button');
                    editButton.textContent = '수정';
                    editButton.classList.add('account-edit-button');
                    editButton.addEventListener('click', () => {
                        openEditModal(item.id, formattedDate, formattedExpiryDate);
                    });

                    const deleteButton = document.createElement('button');
                    deleteButton.textContent = '삭제';
                    deleteButton.classList.add('account-delete-button');
                    deleteButton.addEventListener('click', () => {
                        openDeleteModal(item.id, item.username, row);
                    });

                    editCell.appendChild(editButton);
                    deleteCell.appendChild(deleteButton);

                    row.appendChild(usernameCell);
                    row.appendChild(amountCell);
                    row.appendChild(dateCell);
                    row.appendChild(expiryDateCell);
                    row.appendChild(statusCell);
                    row.appendChild(extendCell);
                    row.appendChild(editCell);
                    row.appendChild(deleteCell);

                    historyTableBody.appendChild(row);
                });
            })
            .catch(error => console.error('Failed to load charge history:', error));
    }

    // 연장 모달 열기
    function openExtendModal(id, username, expiryDate) { // username 파라미터 추가
        selectedId = id;
        activeModal = 'extend';

        document.getElementById('extend-username').textContent = username; // 사용자 이름 표시
        document.getElementById('extend-expiry-date').value = expiryDate; // 마감 날짜 표시

        openModal(document.getElementById('extendModal'));
        document.getElementById('confirmExtend').focus(); // 연장 버튼에 포커스 설정
    }

    // 연장 모달의 저장 버튼 클릭 이벤트
    const confirmExtendButton = document.getElementById('confirmExtend');
    if (confirmExtendButton) {
        confirmExtendButton.addEventListener('click', (event) => {
            event.preventDefault(); // 기본 동작 방지
            extendChargeHistory(selectedId);
        });
    }

    // 연장 함수
    function extendChargeHistory(id) {
        if (!id) {
            console.error('Invalid ID:', id);
            return;
        }

        fetch(`/admin/extend-charge-history?id=${id}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
        })
            .then(response => {
                if (response.ok) {
                    window.location.reload(); // 페이지 새로고침
                } else {
                    console.error('Failed to extend charge history');
                }
            })
            .catch(error => console.error('Error:', error));
    }

    // 수정 모달 열기
    function openEditModal(id, chargeDate, expiryDate) {
        selectedId = id;
        activeModal = 'edit'; // 수정 모달 활성화 상태 설정

        document.getElementById('charge-date').value = chargeDate;

        // 사용자가 지정한 만료일이 없으면 기본 30일 뒤로 설정
        if (!expiryDate) {
            const defaultExpiryDate = new Date(chargeDate);
            defaultExpiryDate.setDate(defaultExpiryDate.getDate() + 30);
            expiryDate = defaultExpiryDate.toISOString().split('T')[0];
        }

        document.getElementById('expiry-date').value = expiryDate;

        openModal(document.getElementById('editModal'));
        document.getElementById('saveEdit').focus(); // 수정 버튼에 포커스 설정
    }

    // 삭제 모달 열기
    function openDeleteModal(id, username, row) {
        selectedId = id;
        activeModal = 'delete'; // 삭제 모달 활성화 상태 설정

        const deleteUsernameElement = document.getElementById('delete-username');
        if (deleteUsernameElement) {
            deleteUsernameElement.textContent = username;
        }

        openModal(document.getElementById('deleteModal'));
        document.getElementById('confirmDelete').focus(); // 삭제 버튼에 포커스 설정
    }

    // 수정 모달 저장 버튼 클릭 이벤트
    const saveEditButton = document.getElementById('saveEdit');
    if (saveEditButton) {
        saveEditButton.addEventListener('click', (event) => {
            event.preventDefault(); // 엔터키 포커스 방지
            const chargeDate = document.getElementById('charge-date').value;
            const expiryDate = document.getElementById('expiry-date').value;

            if (selectedId && chargeDate && expiryDate) {
                fetch(`/admin/edit-charge-history?id=${selectedId}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ chargeDate, expiryDate }),
                })
                    .then(response => {
                        if (response.ok) {
                            window.location.reload(); // 페이지 새로고침
                        } else {
                            console.error('Failed to update charge history');
                        }
                    })
                    .catch(error => console.error('Error:', error));
            }
        });
    }

    // 삭제 모달 삭제 버튼 클릭 이벤트
    const confirmDeleteButton = document.getElementById('confirmDelete');
    if (confirmDeleteButton) {
        confirmDeleteButton.addEventListener('click', (event) => {
            event.preventDefault(); // 엔터키 포커스 방지
            deleteChargeHistory(selectedId);
        });
    }

    // 취소 버튼 클릭 시 모달 닫기
    const cancelButtons = document.querySelectorAll('.modal-button.cancel');
    cancelButtons.forEach(button => {
        button.addEventListener('click', () => {
            closeModal(button.closest('.modal'));
        });
    });

    // 엔터 키로 모달 안의 버튼을 작동시키기 위한 이벤트 리스너 추가
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('keydown', function (event) {
            if (event.key === 'Enter') {
                event.preventDefault(); // 엔터 키의 기본 동작 방지
                event.stopPropagation(); // 이벤트 전파 방지
    
                // 비활성화된 필드에 포커스가 있더라도 엔터키가 동작하도록 처리
                if (document.activeElement.disabled) {
                    document.activeElement.blur(); // 비활성화된 요소에서 포커스를 제거
                }
    
                // 현재 활성화된 모달에 따라 적절한 버튼을 클릭
                let focusedButton;
                if (activeModal === 'extend') {
                    focusedButton = document.getElementById('confirmExtend');
                } else if (activeModal === 'edit') {
                    focusedButton = document.getElementById('saveEdit');
                } else if (activeModal === 'delete') {
                    focusedButton = document.getElementById('confirmDelete');
                }
    
                if (focusedButton) {
                    focusedButton.click(); // 모달 내부의 저장 또는 삭제 버튼 클릭
                }
            }
        });
    });

    // 삭제 함수
    function deleteChargeHistory(id) {
        if (!id) {
            console.error('Invalid ID:', id);
            return;
        }

        fetch(`/admin/delete-charge-history?id=${id}`, { method: 'DELETE' })
            .then(response => {
                if (response.ok) {
                    window.location.reload();
                } else {
                    console.error('Failed to delete charge history');
                }
            })
            .catch(error => console.error('Error:', error));
    }

    // 모달 열기
    function openModal(modal) {
        modal.style.display = 'block';
        document.getElementById('modalOverlay').style.display = 'block';
    }

    // 모달 닫기
    function closeModal(modal) {
        modal.style.display = 'none';
        document.getElementById('modalOverlay').style.display = 'none';
        activeModal = null; // 모달 닫기 시 활성화 상태 해제
    }
});
