# spend-gate

[English](README.md)

**AIエージェントに、毎回ウォレットを開けさせない。**

`spend-gate` はエージェント向け [x402](https://www.x402.org/) 支払いの **買い手側・支出判定ゲート** です。`402 Payment Required` を受けたら、**署名する前に** 呼んでください。戻り値は次の3つです。

| 判定 | 意味 |
|------|------|
| `pay` | 署名してリトライ |
| `skip` | 払わない。別経路へ |
| `escalate` | 人 / より強いモデルに聞く |

予算のハードチェックは **先にコード**（モデル呼び出しなし）。タスク適合と価格妥当性は **[TypeSafe Jev](https://docs.typesafe.ai/introduction)**。

稼働中ヘルス: [spend-gate.472hico.workers.dev/health](https://spend-gate.472hico.workers.dev/health)

## 30秒デモ（APIキー不要）

```bash
git clone https://github.com/472hico/spend-gate.git
cd spend-gate
npm install
npm run demo
```

予算超過はモデルなしで `skip` になります。

詳細・デプロイ・API は [英語 README](README.md) を参照してください。

## ライセンス

MIT
