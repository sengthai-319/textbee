<p align="center"><img src="docs/images/logo.svg" width="96" alt="CrossHubSMS logo" /></p>

<h1 align="center">CrossHubSMS</h1>
<p align="center">Your own SMS gateway. Send texts from an Android phone, or from an iPhone through a Mac, with a dashboard and an API you host yourself.</p>

<p align="center"><a href="docs/SETUP.md"><b>Setup guide</b></a> · <a href="docs/SETUP.md#android-phones">Android</a> · <a href="docs/SETUP.md#iphone-through-a-mac">iPhone</a> · <a href="https://github.com/sengthai-319/textbee/issues">Issues</a></p>

---

## What it does

- **Send SMS** from the dashboard, or from your own code with one authenticated HTTP request.
- **SMS newsletters:** upload a CSV of subscribers and personalize each text with `{{ name }}`. Messages are spaced out to stay friendly with carriers.
- **Android or iPhone:**
  - **Android:** the app sends from the phone's SIM, and can receive texts and forward them to your webhooks.
  - **iPhone:** a Mac relay sends through the Messages app, and your iPhone delivers each text as SMS.
- **History and status** for every message, with failure reasons.
- **Self-hosted:** your contacts and messages stay in your own database. There are no plans, quotas or third-party SMS fees.

## How it works

```
 Dashboard / your code
          │
          ▼
 CrossHubSMS server  ──push──▶  Android app  ──SIM──▶  📱
  (Docker, your computer)
                     ◀─pull───  Mac relay ─▶ Messages ─▶ iPhone ──▶  📱
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
cp api/.env.example api/.env && cp web/.env.example web/.env
# set JWT_SECRET in api/.env and NEXTAUTH_SECRET in web/.env to long random strings
docker compose up -d --build
```

Open http://localhost:3000, create an account, then connect a phone. **[The setup guide](docs/SETUP.md)** walks through every step for both Android and iPhone, including the parts that commonly trip people up.

## Send your first message from code

```bash
curl -X POST "http://localhost:3001/api/v1/gateway/devices/YOUR_DEVICE_ID/send-sms" \
  -H "x-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"recipients": ["+15551234567"], "message": "Hello from CrossHubSMS"}'
```

The dashboard's **Messaging › API** tab has ready-to-copy versions in several languages, already filled in with your server address and device ID.

## Sending responsibly

Only text people who agreed to hear from you, and honor opt-outs. Personal phone plans are meant for person-to-person texting, so keep bulk sends modest. See [Sending responsibly](docs/SETUP.md#9-sending-responsibly).

## Credits and license

CrossHubSMS is a fork of [textbee](https://github.com/textbee/textbee) by textbee.dev, released under the MIT License. This fork adds the iPhone Mac relay, removes the hosted service's billing, and rebrands and redesigns the dashboard. See [LICENSE](LICENSE).
