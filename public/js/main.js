document.addEventListener("DOMContentLoaded", function () {
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

        console.log('Search Term:', searchTerm);
        console.log('Display Keyword:', displayKeyword);
        console.log('Slot:', slot);
        console.log('Note:', note);

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
        fetch('/user/get-registered-search-terms')
            .then(response => response.json())
            .then(data => {
                const tableBody = document.querySelector('tbody');
                tableBody.innerHTML = ''; 
                
                data.reverse().forEach((item, index) => {
                    const date = new Date(item.created_at);
                    const formattedDate = date.toISOString().split('T')[0];

                    const row = document.createElement('tr');
                    row.setAttribute('data-id', item.id); // 행에 id 속성 추가
                    row.innerHTML = `
                        <td></td> 
                        <td>${item.search_term}</td>
                        <td>${item.display_keyword}</td>
                        <td>${item.slot}</td>
                        <td>${formattedDate}</td>  
                        <td>${item.note}</td>
                        <td><button class="account-edit-button">수정</button></td>
                        <td><button class="account-delete-button">삭제</button></td>
                    `;
                    tableBody.appendChild(row);
                });
            })
            .catch(error => console.error('Error loading registered search terms:', error));
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
            columnIndex = 6; // 비고가 있는 열 인덱스
        }

        rows.forEach(row => {
            const cell = row.querySelectorAll('td')[columnIndex];
            const cellText = cell.textContent.toLowerCase();
            if (cellText.includes(filterValue)) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
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

 // 수정 모달의 저장 버튼 클릭 시
document.getElementById('saveEdit').addEventListener('click', function() {
    const idToEdit = document.getElementById('editModal').getAttribute('data-id');
    const slot = document.getElementById('edit-slot').value.trim();
    const note = document.getElementById('edit-note').value.trim();

    // 슬롯이 0 이하이면 수정 불가
    if (slot <= 0) {
        alert('슬롯 수는 0보다 커야 합니다.');
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
            'Cache-Control': 'no-store'  // 캐시 방지
        },
        body: JSON.stringify(data)
    })
    .then(response => response.json())
    .then(result => {
        if (result.success) {
            // 서버로부터 성공 응답을 받은 후에만 UI 업데이트
            document.getElementById('editModal').style.display = 'none';
            document.getElementById('modalOverlay').style.display = 'none';
            
            // 여기서 updateUserInfo()를 호출하여 최신 슬롯 정보를 다시 불러옴
            updateUserInfo(); // 슬롯 및 키워드 수 업데이트
            
            // 등록된 검색어를 다시 불러와서 업데이트
            loadRegisteredSearchTerms(); // 테이블 갱신
        } else {
            alert('수정에 실패했습니다: ' + result.error);
        }
    })
    .catch(error => console.error('Error editing keyword:', error));
});


    // 수정 모달의 취소 버튼 클릭 시 모달 창 닫기
    document.getElementById('cancelEdit').addEventListener('click', function() {
        document.getElementById('editModal').style.display = 'none';
        document.getElementById('modalOverlay').style.display = 'none';
    });

    // 테이블에서 삭제 버튼 클릭 시 모달 창 표시
    document.querySelector('.main-account-table').addEventListener('click', function(event) {
        if (event.target.classList.contains('account-delete-button')) {
            const row = event.target.closest('tr');
            const keyword = row.querySelectorAll('td')[1].textContent; // 키워드 컬럼
            const id = row.getAttribute('data-id'); // id 가져오기
            document.getElementById('delete-keyword').textContent = keyword;
            document.getElementById('deleteModal').style.display = 'block';
            document.getElementById('modalOverlay').style.display = 'block'; // 오버레이 표시
            document.getElementById('confirmDelete').setAttribute('data-id', id); // 삭제할 id를 버튼에 저장
            document.getElementById('confirmDelete').focus(); // 삭제 버튼에 포커스 설정
        }
    });

    // 삭제 모달의 취소 버튼 클릭 시 모달 창 닫기
    document.getElementById('cancelDelete').addEventListener('click', function() {
        document.getElementById('deleteModal').style.display = 'none';
        document.getElementById('modalOverlay').style.display = 'none'; // 오버레이 숨기기
    });

    // 삭제 모달의 확인 버튼 클릭 시 키워드 삭제
    document.getElementById('confirmDelete').addEventListener('click', function() {
        const idToDelete = this.getAttribute('data-id');
        document.getElementById('modalOverlay').style.display = 'none'; // 오버레이 숨기기

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
                loadRegisteredSearchTerms(); // 테이블 갱신
                updateUserInfo(); // 슬롯 및 키워드 수 업데이트
            } else {
                alert('키워드 삭제에 실패했습니다: ' + result.error);
            }
        })
        .catch(error => console.error('Error deleting keyword:', error));
        
    });


    
    // 페이지 로드 시 테이블에 등록된 검색어 표시
    loadRegisteredSearchTerms();
});
