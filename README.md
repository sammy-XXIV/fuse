# Fuse

**Encrypted file delivery with programmable release conditions.**

Fuse lets you upload files, encrypt them client-side, and set conditions for when they're delivered — a trusted contact votes to release them, a date passes, or an inactivity timeout triggers. Files are stored on Walrus (decentralized blob storage) and never leave your browser unencrypted. Release logic lives on the Sui blockchain.

Built for the **Tatum × Walrus Hackathon**.

🌐 **[fusevault.xyz](https://www.fusevault.xyz)**

---

## How it works

1. **Upload** — files are encrypted with AES-256-GCM in the browser. The key never touches the server.
2. **Store** — the encrypted blob is uploaded to Walrus. The blob ID is stored in a Sui smart contract vault.
3. **Set a condition** — choose when the files get released:
   - **Ping Timeout** — vault settles if you stop checking in within a set interval
   - **Date Lock** — releases on a specific date
   - **Guardian Confirm** — trusted contacts vote; files release when the threshold is met
4. **Deliver** — once the condition is met, a cron job settles the vault on-chain and emails recipients the encrypted download link. They decrypt in-browser using the key in the URL fragment.

---

## Stack

| Layer | Tech |
|---|---|
| Frontend | Next.js 14, TypeScript, Tailwind |
| Blockchain | Sui (Move smart contracts) |
| File storage | Walrus testnet |
| Email | Resend |
| Metadata store | GitHub Gist (key-value) |
| Cron | cron-job.org → `/api/cron/settle` |
| Hosting | Vercel |

---

## Vault conditions

### Ping Timeout
You check in periodically. If you miss the window, the vault goes dormant and the cron settles it. Good for "if I disappear" scenarios.

### Date Lock
Files release automatically on a set date. No action needed after creation.

### Guardian Confirm
Add recipients by email or Sui wallet address. Set a threshold (e.g. 2 of 3). Each guardian gets a unique vote link. When enough votes are cast on-chain, delivery is automatic. Guardians can subscribe with their email after voting to receive the files when the vault settles.

---

## Encryption

- AES-256-GCM, generated in-browser via Web Crypto API
- Key is never sent to any server — it lives only in the URL fragment (`#keyB64`)
- Walrus stores only the ciphertext
- Recipient decrypts in-browser when they open the claim link

---

## Local development

```bash
npm install
npm run dev
```

---

## Smart contract

The Move package handles:
- Vault creation with configurable conditions
- Guardian registration and threshold voting
- Check-in (ping) to reset the inactivity timer
- Settlement — transitions vault state and emits events for the off-chain cron to pick up

Network: **Sui Testnet**
