document.addEventListener("DOMContentLoaded", function () {
    // 관리자 정보 가져오기
    fetch('/admin/admin-info')
        .then(response => response.json())
        .then(data => {
            if (data.adminUsername) {
                document.getElementById('username').textContent = data.adminUsername;
            } else {
                window.location.href = '/admin'; // 관리자 정보가 없으면 관리자 로그인 페이지로 리디렉션
            }
        })
        .catch(error => console.error('Error:', error));

    // 현재 페이지의 URL을 가져옵니다
    const currentPath = window.location.pathname;

    // 모든 네비게이션 링크를 선택합니다
    const navbarLinks = document.querySelectorAll('.navbar-link');

    // 각 링크의 href와 현재 경로를 비교하여 일치하는 경우 active 클래스를 추가합니다
    navbarLinks.forEach(link => {
        if (link.getAttribute('href') === currentPath) {
            link.classList.add('active');
        }
    });
});
