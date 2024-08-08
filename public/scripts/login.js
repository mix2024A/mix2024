// 로그인 함수
function login() {
    const username = document.getElementById('loginUsername').value;
    const password = document.getElementById('loginPassword').value;
    const errorElement = document.getElementById('loginError');

    fetch('/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
    })
    .then(response => {
        if (!response.ok) {
            return response.json().then(data => { throw new Error(data.error); });
        }
        return response.json();
    })
    .then(data => {
        errorElement.textContent = '';
        // 로그인 성공 시 메인 페이지로 리디렉션
        window.location.href = data.redirectUrl;
    })
    .catch(error => {
        errorElement.textContent = error.message;
    });
}
