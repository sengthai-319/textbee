# CrossHubSMS setup guide

CrossHubSMS turns a phone you own into your own SMS gateway. You run the server on your computer, and texts go out from a phone you own. Then you send texts from the dashboard, upload a contact list for a newsletter, or call the API from your own code.

It works with both kinds of phone:

- **[Android phones](#android-phones)**: the CrossHubSMS app runs on the phone and sends texts from its SIM. It can also receive texts and forward them to you.
- **[iPhone (through a Mac)](#iphone-through-a-mac)**: iPhones don't let apps send texts by themselves. Instead, a Mac sends each text through the Messages app, and your iPhone delivers it as a regular SMS.

You can connect several phones of either kind to the same server.

```
 Dashboard / your code
          │  (send a message)
          ▼
 CrossHubSMS server  ──push──▶  Android app  ──SIM──▶  📱 recipient
  (your computer)    ◀─pull───  Mac relay ─▶ Messages ─▶ iPhone ──▶  📱 recipient
```

## Contents

1. [What you need](#1-what-you-need)
2. [Run the server](#2-run-the-server)
3. [Create your account and an API key](#3-create-your-account-and-an-api-key)
4. Connect a phone: [Android phones](#android-phones) or [iPhone (through a Mac)](#iphone-through-a-mac)
5. [Send messages](#5-send-messages)
6. [Send an SMS newsletter](#6-send-an-sms-newsletter)
7. [Use it away from home](#7-use-it-away-from-home)
8. [Keep it running](#8-keep-it-running)
9. [Sending responsibly](#9-sending-responsibly)
10. [Troubleshooting](#10-troubleshooting)
11. [Updating](#11-updating)

---

## 1. What you need

**For everyone:**
- A computer to run the server: a Mac, Windows or Linux machine. An Apple silicon Mac works well.
- [Docker Desktop](https://www.docker.com/products/docker-desktop) on that computer.
- About 20 minutes. The first build takes 5–10 minutes of that.

**For Android:**
- An Android phone (Android 7 or later) with a SIM that can send texts.
- A free [Firebase](https://firebase.google.com) project. The server uses it to wake the app when there's a message to send.
- [Android Studio](https://developer.android.com/studio), to build the app for your own server.

**For iPhone:**
- A Mac (macOS 12 or later) signed in to the **same Apple Account** as your iPhone. It can be the same computer that runs the server, or a different one.

> 💡 A separate prepaid SIM for sending is a good idea. If a carrier ever flags bulk sending, your personal number isn't the one affected.

---

## 2. Run the server

**2.1 Get the code and create the settings files.** In Terminal (or PowerShell on Windows):

```bash
git clone https://github.com/sengthai-319/textbee.git
cd textbee
cp api/.env.example api/.env
cp web/.env.example web/.env
```

**2.2 Set two secrets.** Each one should be a long random string.

On a Mac:
```bash
sed -i '' "s|^JWT_SECRET=.*|JWT_SECRET=$(openssl rand -hex 32)|" api/.env
sed -i '' "s|^NEXTAUTH_SECRET=.*|NEXTAUTH_SECRET=$(openssl rand -hex 32)|" web/.env
```
On Linux, use `sed -i` instead of `sed -i ''`. On Windows, open both files and paste any long random text after `JWT_SECRET=` and `NEXTAUTH_SECRET=`.

Check them:
```bash
grep -E "^(JWT_SECRET|NEXTAUTH_SECRET)=" api/.env web/.env
```

**2.3 Decide how phones and browsers will reach the server.** This step matters for Android phones, and for opening the dashboard from another device.

- **Everything on one computer:** keep the defaults (`localhost`). The iPhone path works this way when the relay runs on the same Mac as the server.
- **Other devices on your Wi-Fi:** find the computer's network name or address. On a Mac, see System Settings › General › Sharing, where the name looks like `Your-iMac.local`. You can also use the IP address shown under Wi-Fi › Details, such as `192.168.1.20`. Then in **`web/.env`**, set:
  ```
  NEXT_PUBLIC_SITE_URL=http://Your-iMac.local:3000
  NEXT_PUBLIC_API_BASE_URL=http://Your-iMac.local:3001/api/v1
  NEXTAUTH_URL=http://Your-iMac.local:3000
  ```
  And in **`api/.env`**:
  ```
  FRONTEND_URL=http://Your-iMac.local:3000
  API_PUBLIC_URL=http://Your-iMac.local:3001
  APP_PUBLIC_URL=http://Your-iMac.local:3000
  ```

You can change this later. Rebuild afterwards with `docker compose up -d --build`.

**2.4 Start it.**
```bash
docker compose up -d --build
docker compose ps
```
You should see `textbee-db`, `textbee-redis`, `textbee-api` and `textbee-web` running. Those are the internal service names. Then check the API:
```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3001/api/v1/gateway/devices
```
It should print **`401`**, which means it's running and asking for a login.

If the build fails, see [Troubleshooting](#10-troubleshooting). Two problems come up often on Macs: a broken `docker` command left behind by a previous tool, and a proxy setting that breaks downloads.

---

## 3. Create your account and an API key

1. Open **http://localhost:3000**, or your `NEXT_PUBLIC_SITE_URL`, and click **Create an account**.
2. **Verify your email.** A local server can't send email unless you configure SMTP (the `MAIL_*` settings in `api/.env`), and sending stays blocked until the email is verified. Mark it as verified directly instead, using your exact address. It's case-sensitive:
   ```bash
   docker exec textbee-db mongosh -u adminUser -p adminPassword --authenticationDatabase admin textbee --quiet \
     --eval 'printjson(db.users.updateOne({email:"you@example.com"},{$set:{emailVerifiedAt:new Date()}}))'
   ```
   It should print `modifiedCount: 1`. Refresh the dashboard.
3. **Create an API key.** On the dashboard, click **New API key** and copy it somewhere safe; it's only shown once. Phones use it to connect, and your own code uses it to call the API.

---

## Android phones

The Android app has to be built for **your** server and **your** Firebase project, so this takes longer than the iPhone setup. You only do it once.

### A1. Create a Firebase project

The server uses Firebase Cloud Messaging to tell the app when there's a message to send.

1. Go to the [Firebase console](https://console.firebase.google.com) and click **Add project**. Analytics isn't needed.
2. **Server credentials:** go to Project settings › **Service accounts** › **Generate new private key**. A JSON file downloads.
3. Copy these values from that file into **`api/.env`**:

   | `api/.env` | From the JSON file |
   |---|---|
   | `FIREBASE_PROJECT_ID` | `project_id` |
   | `FIREBASE_PRIVATE_KEY_ID` | `private_key_id` |
   | `FIREBASE_PRIVATE_KEY` | `private_key`, in quotes, with the `\n` sequences left as they are |
   | `FIREBASE_CLIENT_EMAIL` | `client_email` |
   | `FIREBASE_CLIENT_ID` | `client_id` |
   | `FIREBASE_CLIENT_C509_CERT_URL` | `client_x509_cert_url` |

4. **App credentials:** in Project settings › **General**, click **Add app** › Android, and use the package name **`com.vernu.sms`**. Download **`google-services.json`** and put it in `android/app/src/prod/google-services.json`.
5. Restart the server so it picks up the keys:
   ```bash
   docker compose up -d --build textbee-api
   ```

### A2. Build the app for your server

The app needs the address of your server, as the **phone** sees it. `localhost` on a phone means the phone itself, so use your computer's network name or IP from step 2.3.

**With Android Studio (easiest):**
1. Open the `android` folder in Android Studio and let it finish syncing.
2. Add these two lines to `android/gradle.properties`:
   ```
   apiBaseUrl=http://Your-iMac.local:3001/api/v1/
   dashboardUrl=http://Your-iMac.local:3000
   ```
3. Choose **Build › Build Bundle(s) / APK(s) › Build APK(s)**, using the **prodRelease** variant (Build Variants panel).

**From the command line** (needs the Android SDK and Java 17):
```bash
cd android
./gradlew assembleProdRelease \
  -PapiBaseUrl=http://Your-iMac.local:3001/api/v1/ \
  -PdashboardUrl=http://Your-iMac.local:3000
```
The APK is written to `android/app/build/outputs/apk/prod/release/`.

> Plain `http://` addresses are allowed only when your server address itself is `http://`. With an `https://` server, the app only uses secure connections.

### A3. Install and connect the phone

1. Copy the APK to the phone and open it. Android asks you to allow installing apps from this source; allow it.
2. Open **CrossHubSMS** on the phone.
3. In the dashboard, click **Add device**, and scan the QR code with the app. You can also paste your API key into the app.
4. **Allow the SMS permission** when the app asks. On Android 15 and later, Android blocks it at first: open **App info**, tap the **⋮** menu, choose **Allow restricted settings**, then allow SMS.
5. The phone appears under **Registered Devices** in the dashboard.

**Receiving texts (optional):** turn on receiving in the app's settings. Incoming texts then show up in **Messaging › History**, and can be sent to your own URL with [webhooks](#webhooks).

**Keep the phone reliable:** in the app's device-health screen, follow its battery tips. Phone makers like Samsung, Xiaomi and Huawei pause background apps aggressively, which delays texts.

---

## iPhone (through a Mac)

A Mac sends each text through the **Messages** app, and your iPhone delivers it over your carrier as a regular SMS (green bubble). The relay can run on the same Mac as the server, or on another Mac on your Wi-Fi, such as a MacBook.

### I1. Turn on Text Message Forwarding

1. On the **Mac**, open **Messages** and sign in with the **same Apple Account as your iPhone** (Messages › Settings › iMessage). This sign-in is separate from the Mac's own Apple Account, so it doesn't change iCloud or anything else.
2. On the **iPhone**, go to **Settings › Apps › Messages › Text Message Forwarding** and switch on that Mac. On older iOS: Settings › Messages › Text Message Forwarding.
3. On the Mac, send one text by hand from Messages to someone else's number. It should go out as a green bubble.

> If other people use that Mac, they'll be able to read your iPhone's conversations in Messages. Use a Mac that's only yours, or a separate user account on it.

### I2. Install the relay

On the Mac that will send, in Terminal:
```bash
mkdir -p ~/crosshubsms-mac && cd ~/crosshubsms-mac
curl -fsSLO https://raw.githubusercontent.com/sengthai-319/textbee/main/macos/textbee_mac.py
python3 --version     # 3.9 or newer; if macOS offers to install developer tools, click Install
```

### I3. Test Messages on its own

```bash
python3 textbee_mac.py test --to +15551234567
```
Use a real number in international format: a `+`, the country code, then the number. macOS asks to let **Terminal control Messages**; click **Allow**. You should see `Messages accepted the test message…`, and the text should arrive.

### I4. Connect the Mac to your server

```bash
python3 textbee_mac.py setup --server http://localhost:3001/api/v1 --api-key YOUR_KEY --name "My iPhone"
```
If the relay runs on a **different Mac** from the server, use the server's network name instead, for example `--server http://Your-iMac.local:3001/api/v1`. First check that this Mac can reach it:
```bash
curl -s -o /dev/null -w "%{http_code}\n" http://Your-iMac.local:3001/api/v1/gateway/devices   # 401 = reachable
```
The device now appears under **Registered Devices** in the dashboard.

### I5. Start relaying

```bash
python3 textbee_mac.py run
```
Leave that window open. To start the relay automatically at login, keep the Mac awake while it runs, and restart it if it stops:
```bash
python3 textbee_mac.py install-agent
```
`uninstall-agent` removes it, and `status` shows the message counts. See [macos/README.md](../macos/README.md) for every setting.

**Limits of the iPhone route:**
- **Delivery:** "sent" means Messages accepted the text; delivery reports aren't available.
- **Receiving:** incoming texts don't reach CrossHubSMS.
- **Uptime:** the Mac must stay on and online, and the iPhone needs signal.

---

## 5. Send messages

**From the dashboard:** go to **Messaging › Send**, pick the phone under **Send from**, then add numbers (press Enter after each) and write the message.

**From your own code:** the **Messaging › API** tab shows ready-to-copy examples (cURL, Node.js, Python, PHP, Go, and textbee's JS SDK) already pointed at your server. The basic call:
```bash
curl -X POST "http://localhost:3001/api/v1/gateway/devices/YOUR_DEVICE_ID/send-sms" \
  -H "x-api-key: YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"recipients": ["+15551234567"], "message": "Hello from CrossHubSMS"}'
```
Each device's ID is shown on its card in the dashboard. The full API reference is at **http://localhost:3001/** on your server.

**Message history:** **Messaging › History** shows every message with its status: pending, sent, delivered (Android only) or failed, with the reason.

### Webhooks

**Webhooks** sends an HTTP POST to your URL when a phone receives a text (Android). Each request is signed with your secret, and the **Deliveries** tab shows every attempt.

---

## 6. Send an SMS newsletter

1. Make a CSV file with a header row and one subscriber per row:
   ```csv
   name,phone
   Ann,+15550201
   Bob,+15550202
   ```
2. Go to **Messaging › Bulk Send** and drop in the file. The dashboard detects the phone column, and drops duplicates and invalid numbers.
3. Pick the phone to send from.
4. Write the message, adding columns for personalization: `Hi {{ name }}, issue #1 is out!`. The preview shows each person's version.
5. Check the summary and click **Send**.

Texts go out about **5 seconds apart** by default, to avoid carrier throttling, so 300 subscribers take about 25 minutes. Results appear in **History**.

---

## 7. Use it away from home

By default the dashboard only works on your home network. To use it securely from anywhere, including your phone's browser:

1. Install **[Tailscale](https://tailscale.com)** (free) on the server computer and on each device you'll use, signed in to the same account.
2. Use the server's Tailscale name, such as `your-imac.tailnet-name.ts.net`, in place of `Your-iMac.local` in [step 2.3](#2-run-the-server), and rebuild.

Nothing is exposed to the public internet. If you'd rather put it on a public domain, put it behind HTTPS (for example with Caddy or Cloudflare Tunnel), and use `https://` addresses everywhere.

---

## 8. Keep it running

- **Server:** Docker restarts the containers when they crash or the computer reboots, as long as Docker Desktop starts at login (Docker Desktop › Settings › General).
- **Sleep:** stop the server computer, and any relay Mac, from sleeping. On a Mac, go to System Settings › Battery (or Energy) › **Prevent automatic sleeping**. The relay's `install-agent` also keeps the Mac awake while the relay runs.
- **Android phone:** keep it charging, on Wi-Fi or mobile data, and exempt the app from battery optimization.

---

## 9. Sending responsibly

- **Consent:** only text people who agreed to receive your messages, and say how to opt out ("Reply STOP to unsubscribe").
- **Opt-outs:** remove people who opt out. Android can forward replies to you through History or webhooks. With the iPhone route, check Messages for STOP replies yourself.
- **Your plan's terms:** personal phone plans are meant for person-to-person texting. Large or frequent bulk sends can get a number throttled or suspended. Keep the default delay, and spread big lists across several phones or days. For business-scale texting, use a registered SMS provider.

---

## 10. Troubleshooting

| Problem | Fix |
|---|---|
| `zsh: command not found: docker`, or `docker-credential-osxkeychain … not found` | An earlier Docker tool (often OrbStack) left broken links behind. See [macos/README.md › Troubleshooting](../macos/README.md#troubleshooting). |
| Build fails at `corepack prepare pnpm` with "Error when performing the request" | Docker Desktop is copying a proxy setting that breaks secure downloads. Go to Docker Desktop › Settings › Resources › Proxies › **Manual**, leave both boxes empty, then Apply & restart. [Details](../macos/README.md#build-fails-at-corepack-prepare-pnpm9142-with-error-when-performing-the-request). |
| Sign-up shows a bot-check error | The computer needs internet access for the sign-up check. The example settings use Cloudflare's test keys, which always pass. |
| Sending says "Please verify your email to continue" | Do [step 3.2](#3-create-your-account-and-an-api-key), using the exact address you signed up with. |
| Android app can't connect | The phone must reach `apiBaseUrl`. Open that address in the phone's browser: a response (even an error page) means it's reachable. `localhost` never works from a phone. |
| Android sends nothing; messages stay *pending* | Check the `FIREBASE_*` values in `api/.env` and that `google-services.json` came from the same Firebase project. Then restart the API. |
| iPhone relay: "Can't get participant" | Text Message Forwarding is off, or Messages on the Mac isn't signed in. See [I1](#i1-turn-on-text-message-forwarding). |
| iPhone relay: "Not authorized to send Apple events" | Turn on Terminal › Messages under System Settings › Privacy & Security › Automation. |
| iPhone relay exits with 403 | The relay was registered against a different server. Run `setup` again. |

Still stuck? [Open an issue](https://github.com/sengthai-319/textbee/issues) with what you ran and what it printed.

---

## 11. Updating

```bash
cd textbee
git pull
docker compose up -d --build
```
Your data stays in the Docker volumes. Rebuild the Android app only when its code changed. To update the Mac relay, download `textbee_mac.py` again; its settings and history are kept.
