<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/images/logo-dark.svg" />
    <img src="docs/images/logo.svg" width="320" alt="CrossHub" />
  </picture>
</p>

<p align="center">Your own SMS gateway. Send texts from an Android phone or an iPhone, with a dashboard and an API you host yourself on Mac, Windows or Linux.</p>

<p align="center"><a href="docs/SETUP.md"><b>Setup guide</b></a> · <a href="docs/SETUP.md#android-phones">Android</a> · <a href="docs/SETUP.md#iphone-through-a-mac">iPhone + Mac</a> · <a href="docs/SETUP.md#iphone-with-windows-or-no-mac-shortcut">iPhone + Windows</a> · <a href="https://github.com/sengthai-319/textbee/issues">Issues</a></p>

---

## What it does

- **Send SMS** from the dashboard, or from your own code with one authenticated HTTP request.
- **SMS newsletters:** upload a CSV of subscribers and personalize each text with `{{ name }}`. Messages are spaced out to stay friendly with carriers.
- **Android or iPhone:**
  - **Android:** the app sends from the phone's SIM, and can receive texts and forward them to your webhooks.
  - **iPhone with a Mac:** a Mac relay sends through the Messages app, and your iPhone delivers each text as SMS, around the clock.
  - **iPhone with Windows or no Mac:** an Apple Shortcut on the iPhone collects the waiting messages and sends them when it runs (on tap or on a schedule).
- **History and status** for every message, with failure reasons.
- **Self-hosted:** your contacts and messages stay in your own database. There are no plans, quotas or third-party SMS fees.

## How it works

```
 Dashboard / your code
          │
          ▼
 CrossHub server  ──push──▶  Android app  ──SIM──▶  📱
  (Docker, your computer)
                     ◀─pull───  Mac relay ─▶ Messages ─▶ iPhone ──▶  📱
                     ◀─pull───  iPhone Shortcut ─────────▶ iPhone ──▶  📱
```

| Part | Folder | What it is |
|---|---|---|
| Server (API) | [`api/`](api) | NestJS, MongoDB and Redis. Queues messages, serves the API, sends webhooks. |
| Dashboard | [`web/`](web) | Next.js. Send, bulk send, history, devices, API keys, webhooks. |
| Android app | [`android/`](android) | Sends and receives through the phone's SIM. Built for your server. |
| Mac relay | [`macos/`](macos) | One Python file. Lets an iPhone send through a Mac. |

## Quick start

```bash
git clone https://github.com/sengthai-319/textbee.git
cd textbee
cp .env.example .env && cp api/.env.example api/.env && cp web/.env.example web/.env
scripts/secure-database.sh   # generates the database password in .env
# set JWT_SECRET in api/.env and NEXTAUTH_SECRET in web/.env (openssl rand -hex 32)
docker compose up -d --build
```

Open http://localhost:3000, create an account, then connect a phone. **[The setup guide](docs/SETUP.md)** walks through every step for both Android and iPhone, including the parts that commonly trip people up.

## Send your first message from code

```bash
curl -X POST "http://localhost:3001/api/v1/gateway/devices/YOUR_DEVICE_ID/send-sms" \
  -H "x-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"recipients": ["+15551234567"], "message": "Hello from CrossHub"}'
```

The dashboard's **Messaging › API** tab has ready-to-copy versions in several languages, already filled in with your server address and device ID.

## Sending responsibly

Only text people who agreed to hear from you, and honor opt-outs. Personal phone plans are meant for person-to-person texting, so keep bulk sends modest. See [Sending responsibly](docs/SETUP.md#9-sending-responsibly).

## Credits and license

CrossHub is a fork of [textbee](https://github.com/textbee/textbee) by textbee.dev, released under the MIT License. This fork adds the iPhone Mac relay, removes the hosted service's billing, and rebrands and redesigns the dashboard. See [LICENSE](LICENSE).
