document.addEventListener("DOMContentLoaded", function () {

    let currentPage = 1;
    let itemsPerPage = 50; // 기본값은 50개로 설정



    document.getElementById('itemsPerPage').addEventListener('change', function () {
        if (this.value === 'all') {
            itemsPerPage = Number.MAX_SAFE_INTEGER; // 아주 큰 값으로 설정하여 모든 항목을 가져옴
        } else {
            itemsPerPage = parseInt(this.value);
        }
        currentPage = 1; // 페이지 번호를 1로 초기화
        loadRegisteredSearchTerms(); // 항목 수 변경 시 다시 로드
    });

    // 유저 정보 불러오기
    fetch('/user/user-info')
        .then(response => response.json())
        .then(data => {
            if (data.username) {
                document.getElementById('username').textContent = data.username;
                document.getElementById('slot').textContent = data.slot;  // 구매슬롯 표시
                document.getElementById('remainingSlots').textContent = data.remainingSlots;  // 잔여슬롯 표시
                document.getElementById('editCount').textContent = data.editCount;  // 수정횟수 표시
            } else {
                window.location.href = '/'; // 유저 정보가 없으면 로그인 페이지로 리디렉션
            }
        })
        .catch(error => console.error('Error:', error));

    // 등록된 키워드 개수 불러오기
    fetch('/user/get-keyword-count')
        .then(response => response.json())
        .then(data => {
            const keywordCount = data.keywordCount || 0;  // 값이 없을 때 0으로 설정
            document.getElementById('keywordCount').textContent = keywordCount;  // 등록 키워드 수 표시
        })
        .catch(error => console.error('Error:', error));

    // 유저 정보 업데이트 함수
    function updateUserInfo() {
        fetch('/user/user-info')
            .then(response => response.json())
            .then(data => {
                if (data.username) {
                    document.getElementById('slot').textContent = data.slot;  // 구매슬롯 표시
                    document.getElementById('remainingSlots').textContent = data.remainingSlots;  // 잔여슬롯 표시
                    document.getElementById('editCount').textContent = data.editCount;  // 수정횟수 표시

                    // 등록된 키워드 개수 불러오기 및 업데이트
                    fetch('/user/get-keyword-count')
                        .then(response => response.json())
                        .then(data => {
                            const keywordCount = data.keywordCount || 0;  // 값이 없을 때 0으로 설정
                            const keywordCountElement = document.getElementById('keywordCount');
                            if (keywordCountElement) {
                                keywordCountElement.textContent = keywordCount;  // 등록 키워드 수 표시
                            }
                        })
                        .catch(error => console.error('Error fetching keyword count:', error));
                } else {
                    window.location.href = '/'; // 유저 정보가 없으면 로그인 페이지로 리디렉션
                }
            })
            .catch(error => console.error('Error fetching user info:', error));
    }

    // 등록 버튼 클릭 시 서버로 데이터 전송
    document.getElementById('register-button').addEventListener('click', function() {
        const searchTerm = document.getElementById('search-term').value ? document.getElementById('search-term').value.trim() : '';
        const displayKeyword = document.getElementById('display-keyword').value ? document.getElementById('display-keyword').value.trim() : '';
        const slot = document.getElementById('slot-input').value ? document.getElementById('slot-input').value.trim() : ''; 
        const note = document.getElementById('note').value ? document.getElementById('note').value.trim() : '';

        if (!searchTerm || !displayKeyword || !slot) {
            alert('검색어, 노출 키워드 및 슬롯은 필수 입력 항목입니다.');
            return;
        }

        const data = {
            searchTerm: searchTerm,
            displayKeyword: displayKeyword,
            slot: slot,
            note: note
        };

        fetch('/user/register-search-term', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        })
        .then(response => response.json())
        .then(result => {
            if (result.success) {
                document.getElementById('search-term').value = '';
                document.getElementById('display-keyword').value = '';
                document.getElementById('slot-input').value = '';
                document.getElementById('note').value = '';
        
                loadRegisteredSearchTerms();
                updateUserInfo(); // 슬롯 및 키워드 수 업데이트
            } else {
                alert('등록에 실패했습니다: ' + result.error);
            }
        })
        .catch(error => console.error('Error registering search term:', error));
        
    });

   // 현재 페이지 URL과 일치하는 네비게이션 링크에 active 클래스 추가
   const currentPath = window.location.pathname;
   const navbarLinks = document.querySelectorAll('.navbar-link');
   navbarLinks.forEach(link => {
       if (link.getAttribute('href') === currentPath) {
           link.classList.add('active');
       }
   });

// 등록된 검색어 로드 및 테이블 업데이트
function loadRegisteredSearchTerms() {
    fetch(`/user/get-registered-search-terms?page=${currentPage}&limit=${itemsPerPage}`)
        .then(response => response.json())
        .then(data => {
            if (!data.items) {
                console.error('Error: No items in response');
                return;
            }

            const tableBody = document.querySelector('tbody');
            tableBody.innerHTML = ''; 

            data.items.forEach((item, index) => {
                const date = new Date(item.created_at);
                const formattedDate = date.toISOString().split('T')[0];

                const row = document.createElement('tr');
                row.setAttribute('data-id', item.id);

                let rankDisplay = '-'; // 기본값으로 '-' 설정
                if (item.ranking === -1) {
                    rankDisplay = '누락';
                } else if (item.ranking) {
                    rankDisplay = item.ranking;
                }

                row.innerHTML = `
                    <td>${rankDisplay}</td> <!-- 순위 -->
                    <td>${item.search_term}</td>
                    <td>${item.display_keyword}</td>
                    <td>${item.slot}</td>
                    <td>${formattedDate}</td>
                    <td>${item.note}</td>
                    <td><button class="account-edit-button">수정</button></td>
                    <td><button class="account-delete-button">삭제</button></td>
                `;

                tableBody.appendChild(row);
                
                // "누락"인 경우 스타일 적용
                if (item.ranking === -1) {
                    const rankCell = row.querySelector('td:first-child');
                    rankCell.style.color = 'red';
                    rankCell.style.fontWeight = 'bold';
                }
            });

            setupPagination(data.totalItems);
        })
        .catch(error => console.error('Error loading registered search terms:', error));
}




// 페이지네이션 설정 함수
function setupPagination(totalItems) {
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const paginationContainer = document.getElementById('pagination');
    paginationContainer.innerHTML = '';

    for (let i = 1; i <= totalPages; i++) {
        const pageButton = document.createElement('span');
        pageButton.textContent = i;
        pageButton.classList.add('page-number');
        if (i === currentPage) {
            pageButton.classList.add('active');
        }

        pageButton.addEventListener('click', function () {
            currentPage = i;
            loadRegisteredSearchTerms();
        });

        paginationContainer.appendChild(pageButton);
    }
}

// 드롭다운 필터링 기능 추가
document.getElementById('search-button').addEventListener('click', function() {
    performSearch();
});

document.getElementById('search-input').addEventListener('keydown', function(event) {
    if (event.key === 'Enter') {
        event.preventDefault(); // 엔터 키의 기본 동작(폼 제출)을 방지
        performSearch();
    }
});

function performSearch() {
    const filterType = document.getElementById('search-dropdown').value;
    const filterValue = document.getElementById('search-input').value.toLowerCase();

    const rows = document.querySelectorAll('.main-account-table tbody tr');

    let columnIndex;
    if (filterType === 'search-term') {
        columnIndex = 1; // 검색어가 있는 열 인덱스
    } else if (filterType === 'display-keyword') {
        columnIndex = 2; // 노출 키워드가 있는 열 인덱스
    } else if (filterType === 'note') {
        columnIndex = 5; // 비고가 있는 열 인덱스
    } else if (filterType === 'missing-rank') {
        // 누락 필터링 로직
        rows.forEach(row => {
            const rankCell = row.querySelector('td:first-child'); // 첫 번째 열(순위)
            const rankText = rankCell.textContent.toLowerCase(); // 순위 값
            if (rankText === '누락') {
                row.style.display = ''; // "누락"일 때 표시
            } else {
                row.style.display = 'none'; // 그렇지 않으면 숨기기
            }
        });
        return; // "누락" 필터 적용 후 함수 종료
    }

    // 일반적인 검색 필터 처리
    rows.forEach(row => {
        const cell = row.querySelectorAll('td')[columnIndex];
        const cellText = cell.textContent.toLowerCase();
        if (cellText.includes(filterValue)) {
            row.style.display = ''; // 필터 조건에 맞으면 표시
        } else {
            row.style.display = 'none'; // 조건에 맞지 않으면 숨기기
        }
    });
}


    // 테이블에서 수정 버튼 클릭 시 모달 창 표시
    document.querySelector('.main-account-table').addEventListener('click', function(event) {
        if (event.target.classList.contains('account-edit-button')) {


            const row = event.target.closest('tr');
            const id = row.getAttribute('data-id');
            const searchTerm = row.querySelector('td:nth-child(2)').textContent;
            const displayKeyword = row.querySelector('td:nth-child(3)').textContent;
            const slot = row.querySelector('td:nth-child(4)').textContent;
            const note = row.querySelector('td:nth-child(6)').textContent;

            document.getElementById('edit-search-term').value = searchTerm;
            document.getElementById('edit-display-keyword').value = displayKeyword;
            document.getElementById('edit-slot').value = slot;
            document.getElementById('edit-note').value = note;
            
            document.getElementById('editModal').setAttribute('data-id', id);
            document.getElementById('editModal').style.display = 'block';
            document.getElementById('modalOverlay').style.display = 'block';

            // 엔터 키로 저장 버튼 클릭하기
            document.getElementById('editModal').addEventListener('keydown', function(event) {
                if (event.key === 'Enter') {
                    event.preventDefault();
                    document.getElementById('saveEdit').click();
                }
            });
        }
    });

    let isUpdating = false;  // 중복 요청 방지 플래그 추가

    document.getElementById('saveEdit').addEventListener('click', function() {
        if (isUpdating) return;  // 이미 업데이트 중이면 아무 작업도 하지 않음
    
        isUpdating = true;  // 업데이트 시작
    
        const idToEdit = document.getElementById('editModal').getAttribute('data-id');
        const slot = document.getElementById('edit-slot').value.trim();
        const note = document.getElementById('edit-note').value.trim();
    
        if (slot <= 0) {
            alert('슬롯 수는 0보다 커야 합니다.');
            isUpdating = false;  // 업데이트 종료
            return;
        }
    
        const data = {
            id: idToEdit,
            slot: slot,
            note: note
        };
    
        fetch('/user/edit-keyword', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-store'
            },
            body: JSON.stringify(data)
        })
        .then(response => response.json())
        .then(result => {
            if (result.success) {
                const row = document.querySelector(`tr[data-id="${idToEdit}"]`);
                row.querySelector('td:nth-child(4)').textContent = slot;
                row.querySelector('td:nth-child(6)').textContent = note;
    
                updateUserInfo();
    
                // 모달 닫기
                document.getElementById('editModal').style.display = 'none';
                document.getElementById('modalOverlay').style.display = 'none';
            } else {
                alert('수정에 실패했습니다: ' + result.error);
            }
        })
        .catch(error => console.error('Error editing keyword:', error))
        .finally(() => {
            isUpdating = false;  // 업데이트 종료
        });
    });
    

    // 수정 모달의 취소 버튼 클릭 시 모달 창 닫기
    document.getElementById('cancelEdit').addEventListener('click', function() {
        document.getElementById('editModal').style.display = 'none';
        document.getElementById('modalOverlay').style.display = 'none';
    });

// 테이블에서 삭제 버튼 클릭 시 모달 창 표시
document.querySelector('.main-account-table').addEventListener('click', function(event) {
    if (event.target.classList.contains('account-delete-button')) {
        // 삭제 전에 수정 횟수 확인
        fetch('/user/user-info')
            .then(response => response.json())
            .then(data => {
                if (data.editCount > 0) {
                    const row = event.target.closest('tr');
                    const keyword = row.querySelectorAll('td')[1].textContent; // 키워드 컬럼
                    const id = row.getAttribute('data-id'); // id 가져오기
                    document.getElementById('delete-keyword').textContent = keyword;
                    document.getElementById('deleteModal').style.display = 'block';
                    document.getElementById('modalOverlay').style.display = 'block'; // 오버레이 표시
                    document.getElementById('confirmDelete').setAttribute('data-id', id); // 삭제할 id를 버튼에 저장
                    document.getElementById('confirmDelete').focus(); // 삭제 버튼에 포커스 설정
                } else {
                    alert('삭제 가능 횟수가 부족하여 키워드를 삭제할 수 없습니다.');
                }
            })
            .catch(error => console.error('Error checking edit count:', error));
    }
});

// 삭제 모달의 취소 버튼 클릭 시 모달 창 닫기
document.getElementById('cancelDelete').addEventListener('click', function() {
    document.getElementById('deleteModal').style.display = 'none';
    document.getElementById('modalOverlay').style.display = 'none';
});


// 삭제 모달의 확인 버튼 클릭 시 키워드 삭제
document.getElementById('confirmDelete').addEventListener('click', function() {
    const idToDelete = this.getAttribute('data-id');
    document.getElementById('modalOverlay').style.display = 'none'; // 오버레이 숨기기

    // 삭제 전에 수정 횟수 재확인
    fetch('/user/user-info')
        .then(response => response.json())
        .then(data => {
            if (data.editCount > 0) {
                fetch('/user/delete-keyword', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ id: idToDelete }) // id를 서버로 전송
                })
                .then(response => response.json())
                .then(result => {
                    if (result.success) {
                        document.getElementById('deleteModal').style.display = 'none';
                        
                        // 테이블을 다시 로드하기 전에 현재 페이지에 남아있는 항목이 없을 경우 이전 페이지로 이동
                        fetch(`/user/get-registered-search-terms?page=${currentPage}&limit=${itemsPerPage}`)
                            .then(response => response.json())
                            .then(data => {
                                if (data.items.length === 0 && currentPage > 1) {
                                    currentPage--; // 현재 페이지에서 항목이 없으면 이전 페이지로 이동
                                }
                                loadRegisteredSearchTerms(); // 테이블 갱신
                                updateUserInfo(); // 슬롯 및 키워드 수 업데이트
                            });
                    } else {
                        alert('키워드 삭제에 실패했습니다: ' + result.error);
                    }
                })
                .catch(error => console.error('Error deleting keyword:', error));
            } else {
                alert('수정 횟수가 부족하여 키워드를 삭제할 수 없습니다.');
            }
        })
        .catch(error => console.error('Error checking edit count before deletion:', error));
});



    // 페이지 로드 시 테이블에 등록된 검색어 표시
    loadRegisteredSearchTerms();


});

