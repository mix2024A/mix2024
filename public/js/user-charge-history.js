document.addEventListener("DOMContentLoaded", function () {
    // 사용자 정보를 가져와서 네비게이션 바에 표시
    fetch('/user/user-info')
        .then(response => response.json())
        .then(data => {
            if (data.username) {
                const usernameElement = document.getElementById('username');
                if (usernameElement) {
                    usernameElement.textContent = data.username;
                }
            } else {
                window.location.href = '/'; // 유저 정보가 없으면 로그인 페이지로 리디렉션
                return;
            }
        })
        .catch(error => console.error('Error fetching user info:', error));

    // 현재 페이지 URL과 일치하는 네비게이션 링크에 active 클래스 추가
    const currentPath = window.location.pathname;
    const navbarLinks = document.querySelectorAll('.navbar-link');
    navbarLinks.forEach(link => {
        if (link.getAttribute('href') === currentPath) {
            link.classList.add('active');
        }
    });

    // 페이지 로드 시 충전 내역 데이터를 가져옴
    fetch('/user/charge-history')
        .then(response => response.json())
        .then(data => {
            const tableBody = document.getElementById('history-table-body');
            if (!tableBody) {
                console.error("Table body element not found.");
                return;
            }

            tableBody.innerHTML = ''; // 테이블 초기화

            if (!data || data.length === 0) {
                const row = document.createElement('tr');
                row.innerHTML = `<td colspan="5">충전 내역이 없습니다.</td>`;
                tableBody.appendChild(row);
                return;
            }

            // 가져온 데이터를 테이블에 추가
            data.forEach(entry => {
                const chargeDate = new Date(entry.charge_date);
                const expiryDate = new Date(entry.expiry_date);
                
                // 현재 날짜와 만료일 사이의 잔여일 계산
                const today = new Date();
                const remainingDays = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));

                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${entry.amount}</td>
                    <td>${chargeDate.toISOString().split('T')[0]}</td>
                    <td>${expiryDate.toISOString().split('T')[0]}</td>
                    <td>${remainingDays > 0 ? remainingDays + '일' : '0일'}</td>
                    <td>${entry.status}</td>
                `;
                tableBody.appendChild(row);
            });
        })
        .catch(error => console.error('Error fetching charge history:', error));
});
