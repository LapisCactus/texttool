// storage.js - localStorage関連の処理

function updateGroupSelect() {
    const groupSelect = document.getElementById('groupSelect');
    if (!groupSelect) return;
    groupSelect.innerHTML = '<option value="">選択してください</option>';
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.startsWith('group_')) {
            const groupName = key.split('_')[1];
            const option = document.createElement('option');
            option.value = groupName;
            option.text = groupName;
            groupSelect.add(option);
        }
    }
}

function updateFileList() {
    const groupSelect = document.getElementById('groupSelect');
    const groupName = groupSelect.value;
    const fileTitleSelect = document.getElementById('fileTitle');
    if (!fileTitleSelect) return;
    fileTitleSelect.innerHTML = '<option value="">選択してください</option>';

    if (groupName) {
        const files = JSON.parse(localStorage.getItem(`group_${groupName}`));
        files.forEach(file => {
            const option = document.createElement('option');
            option.value = `${groupName}_${file.fileUrl}`;
            option.text = file.title;
            fileTitleSelect.add(option);
        });
    }
}

function loadText() {
    const fileTitleSelect = document.getElementById('fileTitle');
    const fileUrl = fileTitleSelect.value;

    if (!fileUrl) {
        document.getElementById('textContent').innerText = 'ファイルを選択してください';
        return;
    }

    const savedText = localStorage.getItem(`text_${fileUrl}`);
    if (savedText) {
        document.getElementById('textContent').innerText = savedText;
        return;
    }

    alert('選択されたファイルのテキストが見つかりません');
}

async function loadZip() {
    const zipFileInput = document.getElementById('zipFile');
    const file = zipFileInput.files[0];
    if (!file) {
        alert('Zipファイルを選択してください');
        return;
    }

    const zip = new JSZip();
    try {
        const zipData = await zip.loadAsync(file);
        const groupName = prompt('このZipファイルのグループ名を入力してください:');
        if (!groupName) {
            throw new Error('グループ名が入力されませんでした');
        }

        let csvData = null;
        const textFiles = [];

        for (const filename in zipData.files) {
            if (filename.endsWith('contents.csv')) {
                csvData = await zipData.files[filename].async('text');
            } else if (filename.endsWith('.txt')) {
                const textContent = await zipData.files[filename].async('text');
                textFiles.push({ filename, textContent });
            }
        }

        if (!csvData) {
            throw new Error('contents.csvファイルが見つかりません');
        }

        const lines = csvData.split('\n');
        const files = lines.filter(line => line != "").map(line => {
            const [fileUrl, title] = line.split(',');
            return { fileUrl: fileUrl.trim(), title: title.trim() };
        });

        localStorage.setItem(`group_${groupName}`, JSON.stringify(files));
        
        textFiles.forEach(file => {
            localStorage.setItem(`text_${groupName}_${file.filename}`, file.textContent);
        });

        updateGroupSelect();
        alert('Zipファイルの読み込みと保存が完了しました');
    } catch (error) {
        console.error('エラー:', error);
        alert('Zipファイルの読み込みに失敗しました');
    }
}

function searchLocal() {
    const keyword = document.getElementById('searchKeyword').value;
    const searchResults = document.getElementById('searchResults');
    searchResults.innerHTML = '';

    const groupSelect = document.getElementById('groupSelect');
    const groupName = groupSelect.value;

    if (!groupName) {
        searchResults.innerHTML = '<p>グループを選択してください。</p>';
        return;
    }

    let results = [];
    const groupFiles = JSON.parse(localStorage.getItem(`group_${groupName}`)) || [];
    groupFiles.forEach(file => {
        if (localStorage.getItem(`text_${groupName}_${file.fileUrl}`) == null) {
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                const subname = file.fileUrl.substr(0,10)
                if (key.startsWith(`text_${groupName}_${subname}`)) {
                        console.log('sub found for '+subname);
                        break;
                }
            }
            return;
        }
        const textContent = localStorage.getItem(`text_${groupName}_${file.fileUrl}`);
        const lines = textContent.split('\n');
        let hitCount = 0;
        let matches = [];

        lines.forEach((line, index) => {
            if (line.includes(keyword)) {
                hitCount++;
                matches.push({ line: line, lineNumber: index + 1 });
            }
        });

        if (hitCount > 0) {
            results.push({ filename: file.title, fileUrl: file.fileUrl, hitCount: hitCount, matches: matches });
        }
    });

    let resultsHTML = '';
    if (results.length === 0) {
        resultsHTML = '<p>該当するテキストが見つかりませんでした。</p>';
    } else {
        results.forEach((result, index) => {
            resultsHTML += `
                <p><strong class="filename" data-index="${index}" onclick="toggleMatches(${index})">ファイル名: ${result.filename} (ヒット件数: ${result.hitCount})</strong></p>
                <div class="matches" id="matches_${index}" style="display: none;">
            `;
            result.matches.forEach(match => {
                resultsHTML += `<p>行番号: <span class="line-number" onclick="showSurroundingLines('${result.fileUrl}', ${match.lineNumber})">${match.lineNumber}</span> - ${match.line}</p>`;
            });
            resultsHTML += '</div>';
        });
    }
    searchResults.innerHTML = resultsHTML;
    document.getElementById('textContent').innerText = 'ファイルを選択してください';
}

function toggleMatches(index) {
    const matchesDiv = document.getElementById(`matches_${index}`);
    if (matchesDiv.style.display === 'none') {
        matchesDiv.style.display = 'block';
    } else {
        matchesDiv.style.display = 'none';
    }
}

function showSurroundingLines(fileUrl, lineNumber) {
    const groupSelect = document.getElementById('groupSelect');
    const groupName = groupSelect.value;
    const textContent = localStorage.getItem(`text_${groupName}_${fileUrl}`);
    if (!textContent) {
        alert('該当するテキストが見つかりませんでした');
        return;
    }

    const lines = textContent.split('\n');
    const startLine = Math.max(0, lineNumber - 51);
    const beforeLines = lines.slice(startLine, lineNumber - 1);
    const afterLines = lines.slice(lineNumber, lineNumber + 3);
    document.getElementById('textContent').innerHTML =
        '<div>' + beforeLines.join('<br>') + '</div> <div class="found-line">' +
        lines[lineNumber - 1] + '</div> <div>' +
        afterLines.join('<br>') + '</div>';
}