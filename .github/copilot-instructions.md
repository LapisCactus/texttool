# このレポジトリについて

このアプリケーションは、ウェブブラウザ上でテキストデータを表示し、検索するためのシンプルなツールです。主な機能は以下の通りです：

- CSVファイルからテキストデータを読み込み、ローカルストレージに保存する機能
- ローカルストレージに保存されたテキストデータを表示する機能
- テキストデータの検索機能
- レスポンシブデザインによるスマートフォンでの利用に対応

## プロトタイピング開発

プロトタイピング開発のコードが入っているので、ファイルを変更するときには
- 変更内容は簡潔にする
- 徐々に機能追加を行うため、規模が大きくなってきたら、ファイルを分割するなど複雑性に応じた対応を行う

## ファイル構成

- index.html トップページ、テキストデータの表示と検索機能を提供
- manage.html 管理画面、CSVファイルのアップロードとローカルストレージへの保存機能を提供
- style.css 共通のスタイルシート
- storage.js ローカルストレージ操作用のJavaScriptコード

## ストレージ構成

ローカルストレージはブラウザの `localStorage` を使用しており、キー名の命名規則によってグループとテキスト本文を管理しています。主なキーと構造は以下の通りです。

- **場所**: ブラウザの localStorage（文字列キー／文字列値）
- **キー構成**:
	- `group_<groupName>`: JSON配列
		- 内容の例: `[ { "fileUrl": "docs/file1.txt", "title": "ファイル表示名" }, ... ]`
		- 生成元: 管理画面でアップロードした ZIP の `contents.csv` を解析して `storage2_loadZip` 関数が保存します。
	- `text_<groupName>_<filename>`: テキスト本文（プレーン文字列）
		- 内容の例: Zip 内の `some/path/file.txt` の中身をそのまま保存します。
		- 生成元: `storage2_loadZip` が ZIP 内の `.txt` ファイルを読み取り、`text_<group>_<filename>` として保存します。

- **目的（役割）**:
	- `group_*`: グループ単位でファイル一覧（メタ情報）を保持し、一覧表示や検索対象の決定に使います。
	- `text_*`: 個々のテキスト本文を保持し、全文検索・該当行表示・周辺行表示に使います。

- **関連関数（storage.js を参照）**:
	- `storage2_loadZip(file, groupName, progressCallback)`:
		- ZIP を展開して `contents.csv` を解析し、`group_<groupName>` と `text_<groupName>_<filename>` を保存します。
	- `storage2_group_walk(func_per_group)`:
		- localStorage の全キーを走査し、`group_` プレフィックスを持つキーを見つけてコールバックを呼びます。
	- `storage2_file_walk(groupName, func_per_file)`:
		- 指定グループの `group_<groupName>` を読み、各ファイルの `fileUrl`/`title` をコールバックに渡します。
	- `storage2_get_filetext(fileUrl)` / `showSurroundingLines(...)`:
		- `text_<group>_<fileUrl>` から本文を取得して表示します。
	- `storage2_deleteGroup(groupName)`:
		- `group_<groupName>` を削除し、`text_<groupName>_` で始まるすべてのテキストキーを削除します。

- **検索の注意点**:
	- `storage_searchLocal()` は選択されたグループの `group_<groupName>` を参照して、対応する `text_<groupName>_<fileUrl>` を検索します。`text_` キーと `group_` 内の `fileUrl` が一致しない場合、コードはキーのプレフィックス照合を行って部分一致を探します（大きなファイルや分割保存に対応するため）。

- **運用メモ**:
	- `group_` と `text_` の命名規則を守ることで、グループ追加・削除、検索、表示が正しく動作します。
	- 大量データを扱う場合、localStorage の容量制限に注意してください。


