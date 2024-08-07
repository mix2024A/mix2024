 
document.addEventListener('DOMContentLoaded', () => {
    // 서버에서 제공하는 정보로 버튼 표시 여부 결정
    const isAdmin = JSON.parse(document.body.dataset.isAdmin);

    if (isAdmin) {
        document.getElementById('admin-page-button').style.display = 'inline';
    }
});
