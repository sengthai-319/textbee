# textbee for Mac (iPhone relay)

Send textbee messages from an **iPhone** instead of an Android phone.

iOS does not let apps send SMS on their own, so the textbee app can't run on an iPhone. This client runs on a Mac instead. It registers with your textbee server as a device, collects the messages queued for it, and hands each one to the **Messages** app. Your iPhone then delivers it as a regular SMS through **Text Message Forwarding**.

The dashboard, bulk sends, CSV uploads, scheduling and the REST API work as they do with an Android device.

## How it differs from the Android app

| | Android app | textbee for Mac |
|---|---|---|
| How it gets messages | Push (Firebase) | Polls the server every few seconds |
| Status reports | sent, delivered, failed | sent, failed (Messages can't report delivery) |
| Receiving SMS | ✅ | ❌ not yet |
| Needs | An Android phone with a SIM | A Mac with Messages, plus an iPhone on the same Apple Account |

## Requirements

- A **textbee server with pull-device support**: this fork, self-hosted (see [Run the textbee server on the same Mac](#run-the-textbee-server-on-the-same-mac)). The hosted textbee.dev service doesn't accept pull devices.
- A Mac running macOS 12 or later, with `python3`. It ships with the Xcode Command Line Tools; run `xcode-select --install` if it's missing. No other packages are needed.
- An iPhone signed in to the same Apple Account as the Mac.

## Run the textbee server on the same Mac

The simplest setup runs the server, the dashboard and the relay all on the one Mac, using [Docker Desktop](https://www.docker.com/products/docker-desktop).

1. Get the code and create the settings files, with random secrets:
   ```bash
   git clone https://github.com/sengthai-319/textbee.git
   cd textbee
   cp api/.env.example api/.env
   cp web/.env.example web/.env
   sed -i '' "s|^JWT_SECRET=.*|JWT_SECRET=$(openssl rand -hex 32)|" api/.env
   sed -i '' "s|^NEXTAUTH_SECRET=.*|NEXTAUTH_SECRET=$(openssl rand -hex 32)|" web/.env
   ```
   Leave the `FIREBASE_*` lines empty; the relay doesn't use Firebase. The example files already contain Cloudflare's Turnstile test keys, so the sign-up bot check passes on a local machine.

2. Start everything. The first build takes 5–10 minutes:
   ```bash
   docker compose up -d --build
   docker compose ps          # textbee-db, textbee-redis, textbee-api and textbee-web should all be up
   ```
   Check the API:
   ```bash
   docker compose logs textbee-api --tail 15                                        # ends with "Nest application successfully started"
   curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3001/api/v1/gateway/devices   # prints 401
   ```
   The log also warns that `FIREBASE_PROJECT_ID` isn't set. That's expected.

3. Sign up at http://localhost:3000. A local server can't send the verification email, and sending is blocked until the email is verified, so mark it as verified in the database. Use the exact address you signed up with; it's case-sensitive:
   ```bash
   docker exec textbee-db mongosh -u adminUser -p adminPassword --authenticationDatabase admin textbee --quiet \
     --eval 'printjson(db.users.updateOne({email:"you@example.com"},{$set:{emailVerifiedAt:new Date()}}))'
   ```
   It should print `modifiedCount: 1`.

4. Create an API key in the dashboard, then follow [Setup](#setup) with `--server http://localhost:3001/api/v1`.

When you're done, `docker compose down` stops everything. Your data is kept in Docker volumes for next time.

## Setup

1. **Turn on Text Message Forwarding.** On the iPhone, go to `Settings` › `Apps` › `Messages` › `Text Message Forwarding` and switch on your Mac. On older iOS versions it's `Settings` › `Messages` › `Text Message Forwarding`. Then open Messages on the Mac and send one SMS by hand to check that it works.

2. **Create an API key.** In the textbee dashboard, create an API key.

3. **Register the Mac.**
   ```bash
   python3 textbee_mac.py setup --server https://YOUR-TEXTBEE-API/api/v1 --api-key YOUR_KEY
   ```
   The Mac now appears in your dashboard's device list. Running `setup` again updates the same device instead of adding a new one.

4. **Send a test message.** This goes straight through Messages, without the server:
   ```bash
   python3 textbee_mac.py test --to +15551234567
   ```
   The first time, macOS asks to let Terminal control Messages. Click **Allow**. If you missed the prompt, turn it on under `System Settings` › `Privacy & Security` › `Automation`.

5. **Start relaying.**
   ```bash
   python3 textbee_mac.py run
   ```
   To keep it running, start it at login and restart it if it stops:
   ```bash
   python3 textbee_mac.py install-agent     # the log goes to ~/Library/Application Support/textbee-mac/relay.log
   python3 textbee_mac.py uninstall-agent   # removes it again
   ```
   The agent runs under `caffeinate -i`, so the Mac doesn't sleep while the relay is running.

## Commands

| Command | What it does |
|---|---|
| `setup` | Registers this Mac with a textbee server (`--server`, `--api-key`, `--name`, `--service sms\|imessage`) |
| `test` | Sends one message through Messages without the server (`--to`, `--message`) |
| `run` | Relays messages until stopped (`--once` polls one time and exits) |
| `status` | Shows the server, the device ID and the sent and failed counts |
| `install-agent` / `uninstall-agent` | Starts the relay at login, or stops doing so |

## Settings

The config is stored in `~/Library/Application Support/textbee-mac/config.json`, readable by your user account only. You can edit it:

- `send_delay_seconds` (default `5`): the pause between messages. Raise it for large sends, so Apple and your carrier don't throttle the number.
- `poll_seconds` (default `5`): how often to check for new messages.
- `heartbeat_minutes` (default `15`): how often to report that the device is online.
- `service`: `sms` (green bubbles through the iPhone) or `imessage`.

## Duplicate protection

Every message the Mac attempts is recorded in `sent.sqlite3`. If the server hands out a message again (for example after a lost status report), the client re-sends the earlier result to the server instead of texting the person twice.

If the relay is interrupted in the middle of a send, it can't know whether that message went out. It reports the message as failed rather than risk a duplicate.

## Limitations

- `sent` means Messages accepted the message. Delivery is then up to the iPhone. If the iPhone is off or has no signal, the message waits in Messages on the Mac.
- Messages go out from your own number. Personal plans aren't meant for bulk business texting, so carriers and Apple may throttle or block it. Only text people who agreed to receive messages, and honor opt-outs.
- The Mac must be on, awake and online while messages are sending.

## Troubleshooting

### `zsh: command not found: docker` after installing Docker Desktop
First, open Docker Desktop once and wait for **Engine running**; it sets up the `docker` command on first launch. If the command is still missing, an earlier Docker tool may have left a broken link behind. OrbStack is a common culprit. Check:
```bash
ls -l /usr/local/bin/docker
```
If it points to `OrbStack.app` (or any app you've removed), point it at Docker Desktop instead:
```bash
sudo ln -sf /Applications/Docker.app/Contents/Resources/bin/docker /usr/local/bin/docker
docker version && docker compose version
```

### `error getting credentials … "docker-credential-osxkeychain": executable file not found`
Same cause: the password helper link belonged to the old tool. Link Docker Desktop's own helpers:
```bash
sudo ln -sf /Applications/Docker.app/Contents/Resources/bin/docker-credential-osxkeychain /usr/local/bin/docker-credential-osxkeychain
sudo ln -sf /Applications/Docker.app/Contents/Resources/bin/docker-credential-desktop /usr/local/bin/docker-credential-desktop
```
To list any other leftovers, run `ls -l /usr/local/bin | grep -i orbstack`. The most thorough fix is Docker Desktop › Settings › Advanced › **System (requires password)** › Apply & restart, which recreates every link.

### Build fails at `corepack prepare pnpm@9.14.2` with "Error when performing the request"
A container can't download from npm. Test it:
```bash
docker run --rm alpine wget -qO- https://registry.npmjs.org/pnpm/9.14.2 | head -c 60; echo
```
If that fails with **`certificate verify failed`**, something is intercepting the container's secure connections. A common cause is that the Mac uses a proxy auto-config (PAC) file from a local app such as a VPN or proxy tool, and Docker Desktop copies it:
```bash
docker info | grep -i proxy                # e.g. "HTTPS Proxy: http.docker.internal:3128"
scutil --proxy | grep -i ProxyAutoConfig   # e.g. a PAC file on 127.0.0.1
```
Fix: Docker Desktop › Settings › Resources › Proxies › switch on **Manual proxy configuration**, leave both boxes **empty**, then Apply & restart. Run the `wget` test again; it should print JSON starting with `{"name":"pnpm"`. Then rerun `docker compose up -d --build`.

If the Mac itself also gets a wrong certificate, a VPN or antivirus "web protection" is intercepting everything. Check with:
```bash
openssl s_client -connect registry.npmjs.org:443 -servername registry.npmjs.org </dev/null 2>/dev/null | openssl x509 -noout -issuer
```
The issuer should be Google Trust Services or another public authority. If it isn't, turn off that app's web protection while the build runs.

### Sending from the dashboard says "Please verify your email to continue"
Mark the account as verified (step 3 of [Run the textbee server on the same Mac](#run-the-textbee-server-on-the-same-mac)). The address must match exactly.

### `test` says "Can't get participant" or "Not authorized to send Apple events"
- **"Can't get participant":** Text Message Forwarding is off, or Messages on the Mac isn't signed in. Send one SMS by hand from Messages to check.
- **"Not authorized":** turn on Terminal › Messages under System Settings › Privacy & Security › Automation.

### The relay exits with "403"
The device was registered against a different server, or by an older version. Run `setup` again.

### `USE_SMS_QUEUE=false` still uses the queue
This is a known textbee issue: the value is read as the text `"false"`, which counts as on. Remove the line, or leave it empty, to turn the queue off. With Docker Compose, Redis runs anyway, so the queue works either way.
