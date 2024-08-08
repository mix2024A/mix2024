// 초기 로드 시 계정 목록 가져오기
document.addEventListener('DOMContentLoaded', () => {
    fetch('/accounts')
        .then(response => response.json())
        .then(data => {
            updateAccountList(data);
        })
        .catch(error => console.error('계정 목록 불러오기 오류:', error));
});

// 계정 생성 함수
function createAccount() {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const role = document.getElementById('role').value;
    const errorElement = document.getElementById('createAccountError');

    fetch('/createAccount', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password, role })
    })
    .then(response => {
        if (!response.ok) {
            return response.json().then(data => { throw new Error(data.error); });
        }
        return response.json();
    })
    .then(data => {
        errorElement.textContent = '';
        fetchAccounts(); // 계정 목록 갱신
    })
    .catch(error => {
        errorElement.textContent = error.message;
    });
}

// 계정 목록 갱신 함수
function fetchAccounts() {
    fetch('/accounts')
        .then(response => response.json())
        .then(data => {
            updateAccountList(data);
        })
        .catch(error => console.error('계정 목록 불러오기 오류:', error));
}

// 계정 목록 업데이트 함수
function updateAccountList(accounts) {
    const accountList = document.getElementById('accountList');
    accountList.innerHTML = '';
    accounts.forEach(account => {
        const row = document.createElement('tr');
        row.innerHTML = `<td>${account.username}</td><td>${account.role}</td><td><button class="delete-button" onclick="deleteAccount('${account.username}')">삭제</button></td>`;
        accountList.appendChild(row);
    });
}

// 계정 삭제 함수
function deleteAccount(username) {
    if (confirm('정말로 이 사용자를 삭제하시겠습니까?')) {
        fetch(`/accounts/${username}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            }
        })
        .then(response => {
            if (!response.ok) {
                return response.json().then(data => { throw new Error(data.error); });
            }
            return response.json();
        })
        .then(data => {
            if (data.message) {
                alert('사용자가 성공적으로 삭제되었습니다.');
                fetchAccounts(); // 계정 목록 갱신
            } else {
                alert(data.error);
            }
        })
        .catch(error => console.error('사용자 삭제 오류:', error));
    }
}
