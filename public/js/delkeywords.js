document.addEventListener("DOMContentLoaded", function () {
    // 유저 정보 불러오기
    fetch('/user/user-info')
        .then(response => response.json())
        .then(data => {
            if (data.username) {
                document.getElementById('username').textContent = data.username;
            } else {
                window.location.href = '/'; // 유저 정보가 없으면 로그인 페이지로 리디렉션
            }
        })
        .catch(error => console.error('Error:', error));

   // 현재 페이지 URL과 일치하는 네비게이션 링크에 active 클래스 추가
   const currentPath = window.location.pathname;
   const navbarLinks = document.querySelectorAll('.navbar-link');
   navbarLinks.forEach(link => {
       if (link.getAttribute('href') === currentPath) {
           link.classList.add('active');
       }
   });
        

// 삭제된 키워드 로드 및 테이블 업데이트
function loadDeletedKeywords() {
    fetch('/user/get-deleted-keywords')
        .then(response => response.json())
        .then(data => {
            const tableBody = document.querySelector('tbody');
            tableBody.innerHTML = ''; 

            if (!data || data.length === 0) {
                const row = document.createElement('tr');
                row.innerHTML = `<td colspan="7">삭제된 키워드가 없습니다.</td>`;
                tableBody.appendChild(row);
                return;
            }

            data.forEach((item, index) => {
                const dateCreated = new Date(item.created_at);
                const formattedDateCreated = `${dateCreated.getFullYear()}-${('0' + (dateCreated.getMonth() + 1)).slice(-2)}-${('0' + dateCreated.getDate()).slice(-2)}`;
                
                const dateDeleted = new Date(item.deleted_at);
                const formattedDateDeleted = `${dateDeleted.getFullYear()}-${('0' + (dateDeleted.getMonth() + 1)).slice(-2)}-${('0' + dateDeleted.getDate()).slice(-2)}`;

                let rankDisplay = '-';
                if (item.ranking === -1) {
                    rankDisplay = '누락';
                } else if (item.ranking) {
                    rankDisplay = item.ranking;
                }

                const row = document.createElement('tr');
                row.setAttribute('data-id', item.id); // 행에 id 속성 추가
                row.innerHTML = `
                    <td>${rankDisplay}</td> <!-- 순위 --> 
                    <td>${item.search_term}</td>
                    <td>${item.display_keyword}</td>
                    <td>${item.slot}</td>
                    <td>${formattedDateCreated}</td>
                    <td>${formattedDateDeleted}</td>
                    <td>${item.note}</td>
                `;
                tableBody.appendChild(row);

                if (item.ranking === -1) {
                    const rankCell = row.querySelector('td:first-child');
                    rankCell.style.color = 'red';
                    rankCell.style.fontWeight = 'bold';
                }
            });
        })
        .catch(error => console.error('Error loading deleted keywords:', error));
}


    // 페이지 로드 시 삭제된 키워드 표시
    loadDeletedKeywords();
});
