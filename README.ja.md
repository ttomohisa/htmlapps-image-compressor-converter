# 画像圧縮・変換ツール / Image Compressor & Converter

画像の圧縮・形式変換・リサイズ・Base64化・Web素材生成を、**画像をアップロードせずブラウザー内だけで行う単一HTMLアプリ**です。

`htmlapps-template` の方針に合わせ、実行時ネットワーク通信なし、日英切替、GitHub Pages、直接 `file://` で開ける構成にしています。

![デスクトップ表示](assets/screenshot.png)

スマホでは主要操作を下部に固定し、設定はボトムシートで開きます。

![スマホ表示](assets/screenshot-mobile.png)

## 主な機能
- PNG / JPEG / WebP の読み込み・変換
- Auto形式選択、リサイズ、JPEG/WebP品質調整
- 目標容量以下を狙う品質自動探索
- 複数画像の一括処理、フォルダ構造を保ったZIP出力
- 元画像 / 変換後のBefore / Afterスライド比較
- 見た目の差が小さいときに確認できる「差分を強調」表示
- JPEG / PNG / WebP形式別比較
- プレビューの全画面拡大、100〜400%ズーム、ドラッグ移動・ピンチズーム
- 保存ファイル名の変更（拡張子は出力形式に合わせて自動設定）
- 変換後に「保存」を主操作へ切り替えるスマホUI
- PC版も「設定 → 変換 → 保存」の3ステップ表示と、変換完了後の大きな保存CTA
- Base64 / HTML / CSS / Markdown / `<picture>` 生成
- WebP + JPEG/PNGフォールバック + `snippet.html` のWeb素材ZIP
- Canvas再エンコードによるEXIF等の除去
- 日本語 / English 切替
- スマホ向けネイティブアプリ風の下部操作バー・設定ボトムシート

## プライバシー
画像処理は Canvas / Blob / FileReader などのブラウザーAPIだけで行います。CSPでも `connect-src 'none'` を指定し、実行時ネットワーク通信を禁止しています。画像自体はLocalStorageへ保存せず、言語と変換設定だけ保存します。

## ビルド
Windows PowerShell:
```powershell
.\build-standalone.bat
```
生成物は `dist/index.html`、`dist/index.self-extract.html`、各manifestです。外部依存はありません。

## 注意
PNGはロスレスのため品質・目標容量の対象外です。WebP書き出しはブラウザー対応に依存します。非常に大きい画像や大量処理は端末メモリを多く使う場合があります。

## License
MIT
