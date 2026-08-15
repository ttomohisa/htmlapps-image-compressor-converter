# 画像圧縮・変換ツール / Image Compressor & Converter

[![GitHub Pages](https://github.com/ttomohisa/htmlapps-image-toolkit/actions/workflows/deploy-pages.yml/badge.svg)](https://github.com/ttomohisa/htmlapps-image-toolkit/actions/workflows/deploy-pages.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Single HTML](https://img.shields.io/badge/distribution-single%20HTML-0ea5e9)](https://ttomohisa.github.io/htmlapps-image-toolkit/)

[English README](README.md)

PNG / JPEG / WebPの圧縮・形式変換・リサイズ・比較・Base64化・Web素材生成を、**画像を外部へアップロードせずブラウザー内だけで行える単一HTMLアプリ**です。

## 🚀 デモ

### [GitHub Pagesで画像圧縮・変換ツールを開く](https://ttomohisa.github.io/htmlapps-image-toolkit/)

GitHub Pagesから最初のHTMLを読み込んだ後、画像の読み込み・リサイズ・圧縮・形式変換・比較・Base64生成・保存は端末内で処理されます。選択した画像がアプリからサーバーへアップロードされることはありません。

[![画像圧縮・変換ツールの画面](assets/screenshot.png)](https://ttomohisa.github.io/htmlapps-image-toolkit/)

スマートフォンでは主要操作を画面下部に配置し、変換設定はsafe areaに対応したボトムシートで表示します。Webページというより、ネイティブアプリに近い操作感を意識しています。

![スマホ表示](assets/screenshot-mobile.png)

## 主な機能

- PNG / JPEG / WebPの読み込み・保存
- 元画像に応じたAuto形式の推奨
- アスペクト比を維持した最大幅・最大高さリサイズ
- JPEG / WebPの品質調整
- JPEG / WebPを指定容量以下に近づける目標容量モード
- 複数画像の一括変換
- 相対パスを維持したフォルダ単位のZIP出力
- 元画像 / 変換後を重ねて確認するBefore / Afterスライダー
- 圧縮差が小さいときに確認できる「差分を強調」表示
- JPEG / PNG / WebPごとの見た目・ファイルサイズ比較
- 100〜400%ズーム、ドラッグ移動、スマホのピンチズームに対応した拡大プレビュー
- 保存ファイル名の変更と出力形式に合わせた拡張子の自動調整
- Base64 / HTML / CSS / Markdown / `<picture>` の生成
- WebP + JPEG / PNGフォールバック + `snippet.html` をまとめたWeb素材ZIP
- Canvas再エンコードによるEXIF等のメタデータ除去
- 1つのHTML内で日本語・英語を切り替え
- PC版の **設定 → 変換 → 保存** の3ステップ導線
- スマホ向けの下部固定アクションバー・設定ボトムシート
- 実行時ネットワーク通信なし

## すぐに使う

### Webで使う

[デモを開く](https://ttomohisa.github.io/htmlapps-image-toolkit/)だけで利用できます。インストールやアカウント登録は不要です。

### 単体HTMLをダウンロードして使う

1. リポジトリから [`dist/index.html`](https://github.com/ttomohisa/htmlapps-image-toolkit/blob/main/dist/index.html) をダウンロードします。
2. 最新のChromiumベースのブラウザ、Firefox、Safariなどで開きます。
3. 画像を追加すれば、そのままブラウザー内で処理できます。

### 完全オフラインで使う（advance）

1. このリポジトリをダウンロードまたはクローンします。
2. Windowsで `build-standalone.bat` をダブルクリックします。
3. 生成された `dist/index.html` を任意の場所へコピーします。
4. 以降はそのHTML単体をインターネット接続なしで開けます。

より小さい自己展開形式の `dist/index.self-extract.html` も生成されます。

通常のビルドにPython、Node.js、ローカルWebサーバーは不要です。`htmlapps-template` と同じWindows PowerShellベースのビルド構成です。

## 使い方

1. PNG / JPEG / WebP画像を1枚以上追加します。
2. **Auto**のまま使うか、出力形式を手動で選択します。
3. 必要に応じてサイズ・品質・目標容量を調整します。
4. **変換する**を選択します。
5. 変換後のファイルサイズとBefore / Afterを確認します。
6. 見た目の差が分かりにくい場合は **差分を強調** を使います。
7. 必要であれば保存ファイル名を変更します。
8. **保存**で現在の画像を保存するか、複数画像をまとめてZIPで保存します。

### Before / After比較

通常の比較では、元画像と変換後画像を同じ位置に重ね、中央の境界線を左右に動かして表示範囲を切り替えます。

高品質なWebPやJPEGでは、ファイルサイズが大きく減っていても肉眼では差がほとんど分からないことがあります。その場合は **差分を強調** を使うと、ピクセル差を増幅して確認できます。

### Web制作向け出力

画像変換だけでなく、Web制作ですぐ使える以下の形式も生成できます。

- Base64 Data URI
- `<img>` 用HTML
- CSS `background-image`
- Markdown画像記法
- フォールバック付き `<picture>`
- Web素材一式のZIP

## GitHub Pagesで公開する

このリポジトリには、単体HTMLをビルド・検証して `dist/` をGitHub Pagesへ自動公開するワークフローが含まれています。

1. リポジトリ名を `htmlapps-image-toolkit` としてGitHubへプッシュします。
2. **Settings → Pages → Build and deployment → Source** で **GitHub Actions** を選択します。
3. `main` ブランチへプッシュするか、Actions画面からPages公開ワークフローを手動実行します。
4. ビルド成功後、`https://ttomohisa.github.io/htmlapps-image-toolkit/` で公開されます。

GitHub Pagesがまだ有効化されていない場合は、ビルド自体を成功させたままデプロイだけをスキップし、ActionsのSummaryに設定方法を表示する構成です。

## 開発とビルド

```text
.
├─ src/index.template.html       # アプリ本体のソーステンプレート
├─ app.config.json               # アプリ名・バージョン・ビルド設定
├─ dependencies.json             # 内包依存の定義
├─ build-standalone.bat          # Windows用ビルド入口
├─ build-standalone.ps1          # 単体HTML生成処理
├─ scripts/
│  ├─ check-repository.ps1       # リポジトリ・ビルド検証
│  ├─ verify-standalone.ps1      # 単体HTML・通信制約の検証
│  └─ build-self-extract.ps1     # 自己展開版HTML生成
├─ dist/
│  ├─ index.html                 # メインの配布物
│  └─ index.self-extract.html    # 自己展開版
└─ .github/workflows/
   ├─ build-standalone.yml        # ビルド検証
   └─ deploy-pages.yml            # GitHub Pages公開
```

ローカルビルド：

```bat
build-standalone.bat
```

ビルド時には単体HTMLを生成し、未置換プレースホルダーや禁止された実行時ネットワーク参照が残っていないことを検査します。

## プライバシーと通信防止

このアプリはローカル処理を前提にしています。

- 選択した画像は作業中のブラウザーメモリ内で処理されます。
- 選択した画像をアプリから外部サーバーへアップロードしません。
- Content Security Policyで `connect-src 'none'` を指定しています。
- アナリティクス、テレメトリ、ログイン、クラウド保存はありません。
- 画像データ自体はLocalStorageへ保存せず、言語と変換設定だけを保持します。
- ファイル保存はユーザー操作後にのみ実行します。

GitHub Pages版では最初のHTMLを取得する通信だけ発生します。ページ読み込み後の画像処理は端末内で行われます。完全にネットワークを切って使用する場合は、生成済みの `dist/index.html` を直接開いてください。

## 制限事項

- PNG出力はロスレスのため、JPEG / WebP向けの品質調整・目標容量探索は適用されません。
- WebPのエンコード可否や結果はブラウザーのCanvas実装に依存します。
- ブラウザーごとに画像エンコーダーが異なるため、同じ設定でも最終ファイルサイズが多少変わる場合があります。
- 非常に大きい画像や大量の一括処理では、端末メモリを多く使用します。
- Canvasで再エンコードするため、EXIF等のメタデータは意図的に除去されます。
- 現在の処理ではアニメーション画像のアニメーションは維持されません。

## 使用ライブラリ

画像処理の実行時にはCanvas、Blob、FileReaderなどのブラウザー標準APIを利用しており、現時点では画像処理用のサードパーティライブラリを必要としません。

依存関係やライセンスについては [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) を確認してください。

## コントリビューション

バグ報告や機能提案はGitHub Issuesからお願いします。開発への参加方法は [CONTRIBUTING.md](CONTRIBUTING.md) を確認してください。

## ライセンス

Copyright © 2026 ttomohisa

このプロジェクトは [MIT License](LICENSE) で公開されています。
