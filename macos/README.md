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

- A **textbee server with pull-device support**: this fork, self-hosted. The hosted textbee.dev service doesn't accept pull devices.
- A Mac running macOS 12 or later, with `python3`. It ships with the Xcode Command Line Tools; run `xcode-select --install` if it's missing. No other packages are needed.
- An iPhone signed in to the same Apple Account as the Mac.

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
