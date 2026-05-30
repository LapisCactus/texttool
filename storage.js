// storage.js - localStorage関連の処理
// jsZipライブラリを使用してZipファイルを読み込む

// localStorage内のグループを走査し、各グループ名に対して指定された関数を実行する関数
function storage2_group_walk(func_per_group) {
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.startsWith('group_')) {
            const groupName = key.split('_')[1];
            func_per_group(groupName);
        }
    }
}

// 指定されたグループ内のファイルを走査し、各ファイルに対して指定された関数を実行する関数
function storage2_file_walk(groupName, func_per_file) {
    if (!groupName) return;
    const files = JSON.parse(localStorage.getItem(`group_${groupName}`));
    if (files) {
        console.log('Walking files in group '+groupName+" with "+files.length+" files");
        files.forEach(file => {
            func_per_file(file.fileUrl, file.title);
        });
    }
}

// 指定されたファイルのテキストをlocalStorageから取得する関数
function storage2_get_filetext(fileUrl) {
    console.log('Getting text for '+fileUrl);
    return localStorage.getItem(`text_${fileUrl}`);
}

// 指定されたグループをlocalStorageから削除する関数
function storage2_deleteGroup(groupName) {
    // group_ キーを削除
    localStorage.removeItem(`group_${groupName}`);
    
    // text_{groupName}_ で始まるキーを全て削除
    const keysToDelete = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.startsWith(`text_${groupName}_`)) {
            keysToDelete.push(key);
        }
    }
    keysToDelete.forEach(key => localStorage.removeItem(key));
}

// Zipファイルを読み込み、localStorageに保存する非同期関数
async function storage2_loadZip(file, groupName, progressCallback) {
    const zip = new JSZip();
    progressCallback('Zipファイルを展開中...');
    const zipData = await zip.loadAsync(file);

    let csvData = null;
    const textFiles = [];

    // 読み込むファイルの総数をカウント
    let totalFiles = 0;
    for (const filename in zipData.files) {
        if (filename.endsWith('contents.csv') || filename.endsWith('.txt')) {
            totalFiles++;
        }
    }

    let doneCount = 0;
    progressCallback(`ファイルを読み込み中... ${doneCount} / ${totalFiles}`);
    for (const filename in zipData.files) {
        console.log('zip: read: '+filename);
        if (filename.endsWith('contents.csv')) {
            csvData = await zipData.files[filename].async('text');
            doneCount++;
            progressCallback(`ファイルを読み込み中... ${doneCount} / ${totalFiles}`);
        } else if (filename.endsWith('.txt')) {
            const textContent = await zipData.files[filename].async('text');
            textFiles.push({ filename, textContent });
            doneCount++;
            progressCallback(`ファイルを読み込み中... ${doneCount} / ${totalFiles}`);
        }
    }

    if (!csvData) {
        console.error('contents.csvファイルが見つかりません');
        throw new Error('contents.csvファイルが見つかりません');
    }

    progressCallback('CSVデータを解析中...');
    const lines = csvData.split('\n');
    const files = lines.filter(line => line != "").map(line => {
        const [fileUrl, title] = line.split(',');
        return { fileUrl: fileUrl.trim(), title: title.trim() };
    });
    console.log('zip: save group: '+ groupName);
    progressCallback('データを保存中...');
    localStorage.setItem(`group_${groupName}`, JSON.stringify(files));
    
    console.log('zip: save text files: '+ textFiles.length);
    textFiles.forEach(file => {
        localStorage.setItem(`text_${groupName}_${file.filename}`, file.textContent);
    });
    progressCallback('保存完了');
}

// ローカルストレージ内をキーワードで検索する関数
// used: index
function storage_searchLocal() {
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

// マッチ部分の表示/非表示を切り替える関数、生成された検索結果HTML内部で利用
// used: index, searchLocal function
function toggleMatches(index) {
    const matchesDiv = document.getElementById(`matches_${index}`);
    if (matchesDiv.style.display === 'none') {
        matchesDiv.style.display = 'block';
    } else {
        matchesDiv.style.display = 'none';
    }
}

// 指定された行番号の前後の行を表示する関数、生成された検索結果HTML内部で利用
// used: index, searchLocal function
function showSurroundingLines(fileUrl, lineNumber) {
    const groupSelect = document.getElementById('groupSelect');
    const groupName = groupSelect.value;
    const textContent = localStorage.getItem(`text_${groupName}_${fileUrl}`);
    if (!textContent) {
        alert('該当するテキストが見つかりませんでした');
        return;
    }

    const chunks = splitIntoChunks(textContent);
    if (chunks.length > 0) {
        showChunkSelector(chunks, fileUrl);
        // 検索行が含まれるチャンクを見つけて表示
        let currentLineCount = 0;
        for (let i = 0; i < chunks.length; i++) {
            const chunkLines = chunks[i].split('\n').length;
            if (currentLineCount + chunkLines >= lineNumber) {
                const highlightLineInChunk = lineNumber - currentLineCount - 1;
                const select = document.getElementById('chunkSelect');
                select.value = i;
                displayChunk(i, highlightLineInChunk);
                break;
            }
            currentLineCount += chunkLines + 1; // +1 for the "\n\n" delimiter
        }
    } else {
        // チャンク数が1以下の場合は通常表示
        const lines = textContent.split('\n');
        const startLine = Math.max(0, lineNumber - 51);
        const beforeLines = lines.slice(startLine, lineNumber - 1);
        const afterLines = lines.slice(lineNumber, lineNumber + 3);
        document.getElementById('textContent').innerHTML =
            '<div>' + beforeLines.join('<br>') + '</div> <div class="found-line">' +
            lines[lineNumber - 1] + '</div> <div>' +
            afterLines.join('<br>') + '</div>';
        hideChunkSelector();
    }
}

// グローバル変数：現在のチャンクデータを保持
let currentChunks = [];
let currentFileUrl = null;

// テキストを "\n\n" で分割してチャンク配列を返す関数
function splitIntoChunks(text) {
    if (!text) return [];
    return text.split('\n\n').filter(chunk => chunk.trim().length > 0);
}

// チャンクドロップダウンを表示する関数
function showChunkSelector(chunks, fileUrl) {
    currentChunks = chunks;
    currentFileUrl = fileUrl;
    
    const selectorDiv = document.getElementById('chunkSelector');
    if (!selectorDiv) return;
    
    if (chunks.length <= 1) {
        selectorDiv.style.display = 'none';
        if (chunks.length === 1) {
            displayChunk(0);
        }
        return;
    }
    
    const select = selectorDiv.querySelector('select');
    select.innerHTML = '';
    chunks.forEach((chunk, index) => {
        const option = document.createElement('option');
        const chunkPreview = chunk.substring(0, 50).replace(/\n/g, ' ');
        option.value = index;
        option.text = `チャンク ${index + 1}: ${chunkPreview}${chunk.length > 50 ? '...' : ''}`;
        select.appendChild(option);
    });
    
    selectorDiv.style.display = 'block';
    select.value = '0';
    displayChunk(0);
}

// チャンクドロップダウンを非表示にする関数
function hideChunkSelector() {
    const selectorDiv = document.getElementById('chunkSelector');
    if (selectorDiv) {
        selectorDiv.style.display = 'none';
    }
    currentChunks = [];
    currentFileUrl = null;
}

// 指定したインデックスのチャンクを表示する関数
function displayChunk(chunkIndex, highlightLineNumber = -1) {
    if (chunkIndex < 0 || chunkIndex >= currentChunks.length) {
        return;
    }
    
    const chunk = currentChunks[chunkIndex];
    const textContent = document.getElementById('textContent');
    
    if (highlightLineNumber < 0) {
        // ハイライト不要の場合は通常表示
        textContent.innerText = chunk;
    } else {
        // ハイライト表示
        const lines = chunk.split('\n');
        let html = '';
        lines.forEach((line, index) => {
            if (index === highlightLineNumber) {
                html += `<div class="found-line">${escapeHtml(line)}</div>`;
            } else {
                html += `<div>${escapeHtml(line)}</div>`;
            }
        });
        textContent.innerHTML = html;
    }
}

// HTMLエスケープ用ユーティリティ関数
function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}