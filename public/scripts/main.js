let deleteId = null; // 전역 변수로 선언
let editId = null; // 수정용 전역 변수

document.addEventListener('DOMContentLoaded', function() {
    fetchKeywords();

    document.getElementById('registerButton').addEventListener('click', registerKeyword);

    // 삭제 모달 창 관련 요소들
    const modal = document.getElementById('customModal');
    const modalText = document.getElementById('modalText');
    const confirmButton = document.getElementById('confirmButton');
    const cancelButton = document.getElementById('cancelButton');

    confirmButton.addEventListener('click', function() {
        if (deleteId !== null) {
            fetch(`/keywords/${deleteId}`, {
                method: 'DELETE'
            })
            .then(response => {
                if (!response.ok) {
                    return response.json().then(data => { throw new Error(data.error); });
                }
                fetchKeywords(); // 키워드 목록 갱신
                closeModal();
            })
            .catch(error => console.error('키워드 삭제 오류:', error));
        }
    });

    cancelButton.addEventListener('click', closeModal);

    function closeModal() {
        modal.style.display = 'none';
        deleteId = null;
    }

    // 수정 모달 창 관련 요소들
    const editModal = document.getElementById('editModal');
    const saveButton = document.getElementById('saveButton');
    const closeEditButton = document.getElementById('closeEditButton');

    saveButton.addEventListener('click', function() {
        if (editId !== null) {
            const companyName = document.getElementById('editCompanyName').value || '-';
            const keyword = document.getElementById('editKeyword').value;
            const exposure = document.getElementById('editExposure').value;
            const startDate = document.getElementById('editStartDate').value;
            const omitDate = document.getElementById('editOmitDate').value || '-';
            const note = document.getElementById('editNote').value;

            fetch(`/keywords/${editId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ companyName, keyword, exposure, startDate, omitDate, note })
            })
            .then(response => {
                if (!response.ok) {
                    return response.json().then(data => { throw new Error(data.error); });
                }
                fetchKeywords(); // 키워드 목록 갱신
                closeEditModal();
            })
            .catch(error => console.error('키워드 수정 오류:', error));
        }
    });

    closeEditButton.addEventListener('click', closeEditModal);

    function closeEditModal() {
        editModal.style.display = 'none';
        editId = null;
    }
});

function fetchKeywords() {
    fetch('/keywords')
        .then(response => response.json())
        .then(data => {
            updateKeywordList(data);
        })
        .catch(error => console.error('키워드 목록 불러오기 오류:', error));
}

function registerKeyword() {
    const companyName = document.getElementById('companyNameInput').value || '-';
    const keyword = document.getElementById('keywordInput').value;
    const exposure = document.getElementById('exposureInput').value;
    const startDate = document.getElementById('startDateInput').value;
    const omitDate = document.getElementById('omitDateInput').value || '-';
    const note = document.getElementById('noteInput').value;

    fetch('/keywords', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ companyName, keyword, exposure, startDate, omitDate, note })
    })
    .then(response => {
        if (!response.ok) {
            return response.json().then(data => { throw new Error(data.error); });
        }
        return response.json();
    })
    .then(data => {
        fetchKeywords(); // 키워드 목록 갱신
    })
    .catch(error => {
        console.error('키워드 등록 오류:', error);
    });
}

function updateKeywordList(keywords) {
    const keywordList = document.getElementById('keywordList');
    keywordList.innerHTML = '';
    keywords.forEach(keyword => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${keyword.companyName || '-'}</td>
            <td>${keyword.rank || '-'}</td>
            <td>${keyword.keyword}</td>
            <td>${keyword.exposure}</td>
            <td>${keyword.startDate}</td>
            <td>${keyword.omitDate || '-'}</td>
            <td>${keyword.status || '-'}</td>
            <td>${keyword.note}</td>
            <td>
                <button class="edit-button" onclick="editKeyword(${keyword.id}, '${keyword.companyName}', '${keyword.keyword}', '${keyword.exposure}', '${keyword.startDate}', '${keyword.omitDate}', '${keyword.note}')">수정</button>
                <button class="delete-button" onclick="confirmDelete(${keyword.id}, '${keyword.exposure}')">삭제</button>
            </td>
        `;
        keywordList.appendChild(row);
    });
}

function confirmDelete(id, exposure) {
    const modal = document.getElementById('customModal');
    const modalText = document.getElementById('modalText');
    modalText.innerHTML = `${exposure}<br>키워드를 삭제하겠습니까?`;
    modal.style.display = 'block';
    deleteId = id; // 전역 변수로 설정
}

function editKeyword(id, companyName, keyword, exposure, startDate, omitDate, note) {
    const editModal = document.getElementById('editModal');
    document.getElementById('editCompanyName').value = companyName;
    document.getElementById('editKeyword').value = keyword;
    document.getElementById('editExposure').value = exposure;
    document.getElementById('editStartDate').value = startDate;
    document.getElementById('editOmitDate').value = omitDate;
    document.getElementById('editNote').value = note;
    editModal.style.display = 'block';
    editId = id; // 전역 변수로 설정
}
