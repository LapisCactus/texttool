import React, { useEffect, useState } from "react";
import JSZip from "jszip";

export default function App() {
  const [menuOpen, setMenuOpen] = useState(true);
  const [groups, setGroups] = useState([]);
  const [groupName, setGroupName] = useState("");
  const [files, setFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState("");
  const [textContent, setTextContent] = useState("");
  const [keyword, setKeyword] = useState("");
  const [searchResults, setSearchResults] = useState([]);

  /* 初期ロード */
  useEffect(() => {
    updateGroupSelect();
  }, []);

  /* グループ変更時 */
  useEffect(() => {
    if (!groupName) {
      setFiles([]);
      return;
    }
    const stored = JSON.parse(localStorage.getItem(`group_${groupName}`)) || [];
    setFiles(stored);
  }, [groupName]);

  function updateGroupSelect() {
    const result = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key.startsWith("group_")) {
        result.push(key.replace("group_", ""));
      }
    }
    setGroups(result);
  }

  async function loadZip(file) {
    if (!file) return alert("Zipファイルを選択してください");

    try {
      const zip = await JSZip.loadAsync(file);
      const name = prompt("このZipファイルのグループ名を入力してください:");
      if (!name) throw new Error("グループ名未入力");

      let csv = null;
      const texts = [];

      for (const fname in zip.files) {
        if (fname.endsWith("contents.csv")) {
          csv = await zip.files[fname].async("text");
        } else if (fname.endsWith(".txt")) {
          texts.push({
            filename: fname,
            content: await zip.files[fname].async("text"),
          });
        }
      }

      if (!csv) throw new Error("contents.csv が見つかりません");

      const fileList = csv
        .split("\n")
        .filter(Boolean)
        .map((line) => {
          const [url, title] = line.split(",");
          return { fileUrl: url.trim(), title: title.trim() };
        });

      localStorage.setItem(`group_${name}`, JSON.stringify(fileList));
      texts.forEach((t) =>
        localStorage.setItem(`text_${name}_${t.filename}`, t.content)
      );

      updateGroupSelect();
      alert("Zipファイルを読み込みました");
    } catch (e) {
      console.error(e);
      alert("Zipの読み込みに失敗しました");
    }
  }

  function loadText(value) {
    setSelectedFile(value);
    if (!value) return setTextContent("ファイルを選択してください");
    const text = localStorage.getItem(`text_${value}`);
    setTextContent(text ?? "テキストが見つかりません");
  }

  function searchLocal() {
    if (!groupName) return alert("グループを選択してください");

    const results = [];
    files.forEach((file) => {
      const key = `text_${groupName}_${file.fileUrl}`;
      const text = localStorage.getItem(key);
      if (!text) return;

      const matches = text
        .split("\n")
        .map((line, i) =>
          line.includes(keyword)
            ? { line, lineNumber: i + 1 }
            : null
        )
        .filter(Boolean);

      if (matches.length) {
        results.push({
          ...file,
          hitCount: matches.length,
          matches,
        });
      }
    });

    setSearchResults(results);
    setTextContent("ファイルを選択してください");
  }

  function showSurrounding(fileUrl, lineNumber) {
    const text = localStorage.getItem(`text_${groupName}_${fileUrl}`);
    if (!text) return;

    const lines = text.split("\n");
    const start = Math.max(0, lineNumber - 51);
    const before = lines.slice(start, lineNumber - 1).join("<br>");
    const after = lines.slice(lineNumber, lineNumber + 3).join("<br>");

    setTextContent(
      `<div>${before}</div>
       <div class="found-line">${lines[lineNumber - 1]}</div>
       <div>${after}</div>`
    );
  }

  return (
    <>
      <header className="app-bar">
        <button onClick={() => setMenuOpen(!menuOpen)}>☰</button>
        <h1>テキスト表示アプリ</h1>
      </header>

      <div className="container">
        {menuOpen && (
          <aside className="left-column">
            <h2>グループ選択</h2>
            <select onChange={(e) => setGroupName(e.target.value)}>
              <option value="">選択してください</option>
              {groups.map((g) => (
                <option key={g}>{g}</option>
              ))}
            </select>

            <h2>検索</h2>
            <input value={keyword} onChange={(e) => setKeyword(e.target.value)} />
            <button onClick={searchLocal}>検索</button>

            <h2>ファイル表示</h2>
            <select onChange={(e) => loadText(e.target.value)}>
              <option value="">選択してください</option>
              {files.map((f) => (
                <option key={f.fileUrl} value={`${groupName}_${f.fileUrl}`}>
                  {f.title}
                </option>
              ))}
            </select>

            <h2>Zip読み込み</h2>
            <input
              type="file"
              onChange={(e) => loadZip(e.target.files[0])}
            />
          </aside>
        )}

        <main className="right-column">
          <div id="searchResults">
            {searchResults.length === 0 && <p>検索結果なし</p>}
            {searchResults.map((r, i) => (
              <div key={i}>
                <strong>
                  {r.title}（{r.hitCount}件）
                </strong>
                {r.matches.map((m, j) => (
                  <p key={j}>
                    <span
                      onClick={() => showSurrounding(r.fileUrl, m.lineNumber)}
                    >
                      {m.lineNumber}
                    </span>
                    ：{m.line}
                  </p>
                ))}
              </div>
            ))}
          </div>

          <div
            id="textContent"
            dangerouslySetInnerHTML={{ __html: textContent }}
          />
        </main>
      </div>
    </>
  );
}
