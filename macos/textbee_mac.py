#!/usr/bin/env python3
"""
CrossHub Mac relay: turns a Mac into a CrossHub device.

CrossHub normally pushes each message to the Android app, which sends it from
the phone's SIM. iPhones cannot send SMS from an app, so this client takes the
phone's place instead: it registers with CrossHub as a 'pull' device, collects
its messages from the server, and hands each one to the Messages app. The
iPhone paired with the Mac delivers it as a regular SMS through Text Message
Forwarding.

Standard library only, so it runs on the python3 that ships with macOS.
"""

from __future__ import annotations

import argparse
import json
import os
import platform
import signal
import socket
import sqlite3
import subprocess
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
import uuid
from pathlib import Path

APP_VERSION_NAME = "1.0.0"
APP_VERSION_CODE = 1
USER_AGENT = f"crosshub-mac/{APP_VERSION_NAME}"

# The folder and launch agent keep their original names so existing installs keep working
HOME = Path(
    os.environ.get("TEXTBEE_MAC_HOME")
    or Path.home() / "Library" / "Application Support" / "textbee-mac"
)
CONFIG_PATH = HOME / "config.json"
STORE_PATH = HOME / "sent.sqlite3"

# Where Messages keeps every conversation. Read only, and only with Full Disk
# Access; nothing here ever writes to it.
CHAT_DB_PATH = Path(
    os.environ.get("TEXTBEE_MAC_CHAT_DB") or Path.home() / "Library" / "Messages" / "chat.db"
)
# Messages counts time from 2001-01-01; Unix from 1970-01-01.
APPLE_EPOCH_OFFSET_SECONDS = 978307200

LAUNCH_AGENT_LABEL = "dev.textbee.mac"
LAUNCH_AGENT_PATH = Path.home() / "Library" / "LaunchAgents" / f"{LAUNCH_AGENT_LABEL}.plist"

DEFAULT_SERVER = "http://localhost:3001/api/v1"

# Number and text are passed as argv (never interpolated) so message content
# can't inject AppleScript.
SEND_SCRIPT = """
on run argv
    set targetNumber to item 1 of argv
    set msgText to item 2 of argv
    set serviceKind to item 3 of argv
    tell application "Messages"
        if serviceKind is "imessage" then
            set targetAccount to 1st account whose service type = iMessage
        else
            set targetAccount to 1st account whose service type = SMS
        end if
        set targetParticipant to participant targetNumber of targetAccount
        send msgText to targetParticipant
    end tell
end run
"""

running = True


def log(message: str):
    print(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] {message}", flush=True)


def now_millis() -> int:
    return int(time.time() * 1000)


## config

def load_config() -> dict:
    if not CONFIG_PATH.exists():
        sys.exit("Not set up yet. Run: python3 textbee_mac.py setup --server URL --api-key KEY")
    with open(CONFIG_PATH) as f:
        return json.load(f)


def save_config(config: dict):
    HOME.mkdir(parents=True, exist_ok=True)
    tmp = CONFIG_PATH.with_suffix(".tmp")
    with open(tmp, "w") as f:
        json.dump(config, f, indent=2)
    os.chmod(tmp, 0o600)  # holds the API key
    tmp.replace(CONFIG_PATH)


## CrossHub API

class ApiError(Exception):
    def __init__(self, status: int, body: str):
        super().__init__(f"HTTP {status}: {body[:300]}")
        self.status = status
        self.body = body


class TextbeeApi:

    def __init__(self, server: str, api_key: str):
        self.server = server.rstrip("/")
        self.api_key = api_key

    def request(self, method: str, path: str, body: dict | None = None) -> dict:
        data = json.dumps(body).encode() if body is not None else None
        req = urllib.request.Request(
            self.server + path,
            data=data,
            method=method,
            headers={
                "x-api-key": self.api_key,
                "Content-Type": "application/json",
                "Accept": "application/json",
                "User-Agent": USER_AGENT,
            },
        )
        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                raw = resp.read().decode() or "{}"
                return json.loads(raw)
        except urllib.error.HTTPError as e:
            raise ApiError(e.code, e.read().decode(errors="replace")) from None

    def register(self, info: dict) -> dict:
        return self.request("POST", "/gateway/devices", info)["data"]

    def heartbeat(self, device_id: str, info: dict) -> dict:
        return self.request("POST", f"/gateway/devices/{device_id}/heartbeat", info)

    def claim_pending(self, device_id: str) -> list:
        return self.request("GET", f"/gateway/devices/{device_id}/messages/pending")["data"]

    def report_status(self, device_id: str, report: dict) -> dict:
        return self.request("PATCH", f"/gateway/devices/{device_id}/sms-status", report)

    def report_received(self, device_id: str, sms: dict) -> dict:
        return self.request("POST", f"/gateway/devices/{device_id}/receive-sms", sms)


def device_info(config: dict) -> dict:
    mac_version = platform.mac_ver()[0] or platform.release()
    return {
        "transport": "pull",
        "enabled": True,
        "brand": "Apple",
        "manufacturer": "Apple",
        "model": mac_model(),
        "name": config.get("name") or f"{socket.gethostname()} (iPhone relay)",
        # Stable per install, so re-running setup updates this device instead of adding one
        "buildId": config["install_id"],
        "os": "macOS",
        "osVersion": mac_version,
        "appVersionName": APP_VERSION_NAME,
        "appVersionCode": APP_VERSION_CODE,
    }


def mac_model() -> str:
    try:
        out = subprocess.run(["sysctl", "-n", "hw.model"], capture_output=True, text=True, timeout=5)
        if out.returncode == 0 and out.stdout.strip():
            return out.stdout.strip()
    except Exception:
        pass
    return "Mac"


## Messages

def send_via_messages(number: str, text: str, service: str) -> tuple[bool, str]:
    """Hands one message to the Messages app. Returns (ok, error message)."""
    try:
        result = subprocess.run(
            ["osascript", "-e", SEND_SCRIPT, number, text, service],
            capture_output=True,
            text=True,
            timeout=60,
        )
    except Exception as e:
        return False, str(e)
    if result.returncode != 0:
        return False, result.stderr.strip() or f"osascript exited with {result.returncode}"
    return True, ""


## sent-message store

class SentStore:
    """
    Remembers every message this Mac attempted, so a message the server hands
    out twice (after a lost status report, say) is reported again instead of
    being sent twice.
    """

    def __init__(self, path: Path):
        path.parent.mkdir(parents=True, exist_ok=True)
        self.db = sqlite3.connect(path)
        self.db.execute(
            """CREATE TABLE IF NOT EXISTS sent (
                sms_id TEXT PRIMARY KEY,
                sms_batch_id TEXT,
                status TEXT NOT NULL,        -- attempting | sent | failed
                at_millis INTEGER NOT NULL,
                error TEXT,
                reported INTEGER NOT NULL DEFAULT 0
            )"""
        )
        self.db.execute("CREATE TABLE IF NOT EXISTS state (key TEXT PRIMARY KEY, value TEXT)")
        self.db.commit()

    def get_state(self, key: str) -> str | None:
        row = self.db.execute("SELECT value FROM state WHERE key = ?", (key,)).fetchone()
        return row[0] if row else None

    def set_state(self, key: str, value: str):
        self.db.execute("INSERT OR REPLACE INTO state (key, value) VALUES (?, ?)", (key, value))
        self.db.commit()

    def get(self, sms_id: str):
        return self.db.execute(
            "SELECT sms_id, sms_batch_id, status, at_millis, error FROM sent WHERE sms_id = ?",
            (sms_id,),
        ).fetchone()

    def mark(self, sms_id: str, sms_batch_id: str | None, status: str, error: str | None = None):
        self.db.execute(
            """INSERT INTO sent (sms_id, sms_batch_id, status, at_millis, error, reported)
               VALUES (?, ?, ?, ?, ?, 0)
               ON CONFLICT(sms_id) DO UPDATE SET
                 status = excluded.status, at_millis = excluded.at_millis,
                 error = excluded.error, reported = 0""",
            (sms_id, sms_batch_id, status, now_millis(), error),
        )
        self.db.commit()

    def mark_reported(self, sms_id: str):
        self.db.execute("UPDATE sent SET reported = 1 WHERE sms_id = ?", (sms_id,))
        self.db.commit()

    def unreported(self):
        return self.db.execute(
            """SELECT sms_id, sms_batch_id, status, at_millis, error FROM sent
               WHERE reported = 0 AND status != 'attempting'"""
        ).fetchall()

    def counts(self) -> dict:
        rows = self.db.execute("SELECT status, COUNT(*) FROM sent GROUP BY status").fetchall()
        return dict(rows)


## relay loop

## receiving

def decode_attributed_body(blob) -> str | None:
    """
    Text from Messages' attributedBody column. Since macOS 13 the plain `text`
    column is often empty and the text only lives here, inside an archived
    NSAttributedString ("typedstream"). The string follows the NSString class
    name and a '+' marker, prefixed with its length: one byte, or 0x81 and a
    16-bit length, or 0x82 and a 32-bit one (both little-endian).
    """
    if not blob:
        return None
    blob = bytes(blob)
    at = blob.find(b"NSString")
    if at < 0:
        return None
    rest = blob[at + len(b"NSString"):]
    plus = rest.find(b"+")
    if plus < 0 or plus > 16 or plus + 1 >= len(rest):
        return None
    rest = rest[plus + 1:]
    marker = rest[0]
    if marker == 0x81:
        length, start = int.from_bytes(rest[1:3], "little"), 3
    elif marker == 0x82:
        length, start = int.from_bytes(rest[1:5], "little"), 5
    else:
        length, start = marker, 1
    text = rest[start:start + length]
    if len(text) < length:
        return None
    return text.decode("utf-8", errors="replace")


def apple_time_to_millis(value) -> int | None:
    """Messages dates: nanoseconds since 2001 on current macOS, seconds on old ones."""
    if not value:
        return None
    seconds = value / 1e9 if value > 1e12 else float(value)
    return int((seconds + APPLE_EPOCH_OFFSET_SECONDS) * 1000)


# Which incoming messages count as texts to forward. RCS is what an Android
# phone's messages arrive as on iOS 18, so it belongs with SMS.
RECEIVE_SERVICES = {
    "sms": {"SMS", "RCS"},
    "all": {"SMS", "RCS", "iMessage"},
}


class MessagesInbox:
    """Reads new incoming texts from Messages' database, read only."""

    def __init__(self, path: Path, services: set[str]):
        self.path = path
        self.services = services

    def connect(self) -> sqlite3.Connection:
        # mode=ro: never write to Messages' database. Without Full Disk Access
        # macOS refuses the open, which surfaces as OperationalError.
        db = sqlite3.connect(f"file:{urllib.parse.quote(str(self.path))}?mode=ro", uri=True, timeout=5)
        db.row_factory = sqlite3.Row
        return db

    def latest_rowid(self) -> int:
        with self.connect() as db:
            row = db.execute("SELECT COALESCE(MAX(ROWID), 0) AS m FROM message").fetchone()
            return int(row["m"])

    def new_messages(self, after_rowid: int, limit: int = 100) -> list[dict]:
        with self.connect() as db:
            columns = {r["name"] for r in db.execute("PRAGMA table_info(message)")}
            body = "m.attributedBody" if "attributedBody" in columns else "NULL"
            # Reactions, edits and group changes are rows too; only plain
            # messages (item_type 0, not tied to another message) are texts.
            filters = ["m.ROWID > ?", "m.is_from_me = 0"]
            if "item_type" in columns:
                filters.append("m.item_type = 0")
            if "associated_message_type" in columns:
                filters.append("COALESCE(m.associated_message_type, 0) = 0")
            rows = db.execute(
                f"""SELECT m.ROWID AS rowid, m.text AS text, {body} AS body, m.date AS date,
                           m.service AS service, h.id AS sender
                    FROM message m LEFT JOIN handle h ON h.ROWID = m.handle_id
                    WHERE {" AND ".join(filters)}
                    ORDER BY m.ROWID LIMIT ?""",
                (after_rowid, limit),
            ).fetchall()
        out = []
        for r in rows:
            text = r["text"] or decode_attributed_body(r["body"]) or ""
            out.append({
                "rowid": int(r["rowid"]),
                "sender": r["sender"] or "",
                "text": text.replace("\ufffc", "").strip(),  # attachment placeholder
                "service": r["service"] or "",
                "at_millis": apple_time_to_millis(r["date"]),
                "forward": (r["service"] or "") in self.services,
            })
        return out


FULL_DISK_ACCESS_HELP = (
    "Receiving needs Full Disk Access to read Messages' history. Open System Settings "
    "> Privacy & Security > Full Disk Access and turn on Terminal (when you run the relay "
    "yourself) and, for the login agent, {python}. Then restart the relay."
)


class Receiver:
    """
    Forwards new incoming texts to CrossHub. Remembers the last Messages row it
    handled, so each text goes up once; a text is only passed once the server
    has answered, so a network failure retries it on the next poll.
    """

    RETRY_DENIED_SECONDS = 600

    def __init__(self, api: TextbeeApi, store: SentStore, device_id: str, inbox: MessagesInbox):
        self.api = api
        self.store = store
        self.device_id = device_id
        self.inbox = inbox
        self.denied_until = 0.0

    def poll(self) -> int:
        if time.time() < self.denied_until:
            return 0
        try:
            last = self.store.get_state("inbox_rowid")
            if last is None:
                # First run: start from now rather than uploading years of history.
                latest = self.inbox.latest_rowid()
                self.store.set_state("inbox_rowid", str(latest))
                log("Receiving: watching Messages for new texts (earlier ones are not imported).")
                return 0
            messages = self.inbox.new_messages(int(last))
        except sqlite3.OperationalError as e:
            self.denied_until = time.time() + self.RETRY_DENIED_SECONDS
            log(f"Receiving: can't read {self.inbox.path} ({e}). "
                + FULL_DISK_ACCESS_HELP.format(python=sys.executable))
            return 0

        forwarded = 0
        for msg in messages:
            if msg["forward"] and msg["sender"] and msg["text"]:
                payload = {"sender": msg["sender"], "message": msg["text"]}
                if msg["at_millis"]:
                    payload["receivedAtInMillis"] = msg["at_millis"]
                try:
                    self.api.report_received(self.device_id, payload)
                    forwarded += 1
                    log(f"Received from {msg['sender']}: forwarded to CrossHub")
                except ApiError as e:
                    if 400 <= e.status < 500 and e.status not in (401, 408, 429):
                        # The server will never take this one; don't get stuck on it.
                        log(f"Received from {msg['sender']}: refused by the server ({e}); skipping")
                    else:
                        log(f"Receiving: report failed ({e}); will retry")
                        return forwarded
                except OSError as e:
                    log(f"Receiving: server unreachable ({e}); will retry")
                    return forwarded
            self.store.set_state("inbox_rowid", str(msg["rowid"]))
        return forwarded


def status_report(sms_id, sms_batch_id, status, at_millis, error) -> dict:
    report = {"smsId": sms_id, "smsBatchId": sms_batch_id, "status": status}
    if status == "sent":
        report["sentAtInMillis"] = at_millis
    else:
        report["failedAtInMillis"] = at_millis
        report["errorCode"] = "MESSAGES_SEND_FAILED"
        report["errorMessage"] = (error or "Messages could not send this message")[:500]
    return report


def report(api: TextbeeApi, store: SentStore, device_id: str, row) -> bool:
    sms_id, sms_batch_id, status, at_millis, error = row
    try:
        api.report_status(device_id, status_report(sms_id, sms_batch_id, status, at_millis, error))
        store.mark_reported(sms_id)
        return True
    except (ApiError, OSError) as e:
        # A message deleted on the server can never be reported; stop retrying it
        if isinstance(e, ApiError) and e.status in (403, 404):
            store.mark_reported(sms_id)
        log(f"Status report for {sms_id} failed, will retry: {e}")
        return False


def handle_message(api: TextbeeApi, store: SentStore, config: dict, msg: dict):
    sms_id = msg["smsId"]
    sms_batch_id = msg.get("smsBatchId")
    previous = store.get(sms_id)
    if previous:
        if previous[2] == "attempting":
            # Interrupted mid-send: it may already be out, so it is not sent again
            store.mark(sms_id, sms_batch_id, "failed",
                       "Interrupted while sending; not retried to avoid a duplicate")
        report(api, store, config["device_id"], store.get(sms_id))
        return

    recipients = msg.get("recipients") or []
    text = msg.get("message") or ""
    store.mark(sms_id, sms_batch_id, "attempting")
    errors = []
    for number in recipients:
        ok, error = send_via_messages(number, text, config.get("service", "sms"))
        if not ok:
            errors.append(f"{number}: {error}")
    if not recipients:
        errors.append("No recipient")

    if errors:
        store.mark(sms_id, sms_batch_id, "failed", "; ".join(errors))
        log(f"✗ {sms_id} failed: {'; '.join(errors)}")
    else:
        store.mark(sms_id, sms_batch_id, "sent")
        log(f"✓ {sms_id} sent to {', '.join(recipients)}")
    report(api, store, config["device_id"], store.get(sms_id))


def run(config: dict, once: bool = False):
    api = TextbeeApi(config["server"], config["api_key"])
    store = SentStore(STORE_PATH)
    device_id = config["device_id"]
    poll_seconds = max(1, float(config.get("poll_seconds", 5)))
    send_delay = max(0, float(config.get("send_delay_seconds", 5)))
    heartbeat_seconds = max(60, float(config.get("heartbeat_minutes", 15)) * 60)
    last_heartbeat = 0.0
    receive = config.get("receive", "sms")
    receiver = (
        Receiver(api, store, device_id, MessagesInbox(CHAT_DB_PATH, RECEIVE_SERVICES[receive]))
        if receive in RECEIVE_SERVICES
        else None
    )

    def stop(signum, frame):
        global running
        running = False
        log("Stopping after the current message...")

    signal.signal(signal.SIGINT, stop)
    signal.signal(signal.SIGTERM, stop)

    log(f"Relaying for device {device_id} via {config['server']}")
    if receiver is None:
        log("Receiving is off (receive: off in the config).")
    while running:
        if time.time() - last_heartbeat >= heartbeat_seconds:
            try:
                api.heartbeat(device_id, {
                    "appVersionName": APP_VERSION_NAME,
                    "appVersionCode": APP_VERSION_CODE,
                    "osVersion": platform.mac_ver()[0] or platform.release(),
                    "networkType": "wifi",
                })
                last_heartbeat = time.time()
            except (ApiError, OSError) as e:
                log(f"Heartbeat failed: {e}")

        for row in store.unreported():
            report(api, store, device_id, row)

        if receiver is not None:
            receiver.poll()

        try:
            messages = api.claim_pending(device_id)
        except ApiError as e:
            if e.status == 429:
                messages = []
            elif e.status == 403:
                sys.exit(
                    "The server refused to hand out messages (403). This client needs a "
                    "CrossHub server with pull-device support, and a device registered by "
                    f"this client. Server said: {e.body[:300]}"
                )
            else:
                log(f"Polling failed: {e}")
                messages = []
        except OSError as e:
            log(f"Server unreachable: {e}")
            messages = []

        for i, msg in enumerate(messages):
            if not running:
                break
            handle_message(api, store, config, msg)
            if send_delay and i < len(messages) - 1:
                time.sleep(send_delay)

        if once:
            break
        # After a batch more may be waiting, so only pause for the send delay
        time.sleep(send_delay if messages else poll_seconds)


## commands

def cmd_setup(args):
    config = {}
    if CONFIG_PATH.exists():
        with open(CONFIG_PATH) as f:
            config = json.load(f)
    config.update({
        "server": args.server.rstrip("/"),
        "api_key": args.api_key,
        "install_id": config.get("install_id") or uuid.uuid4().hex,
        "service": args.service,
    })
    if args.name:
        config["name"] = args.name
    config.setdefault("poll_seconds", 5)
    config.setdefault("send_delay_seconds", 5)
    config.setdefault("heartbeat_minutes", 15)
    config["receive"] = args.receive or config.get("receive", "sms")

    api = TextbeeApi(config["server"], config["api_key"])
    try:
        device = api.register(device_info(config))
    except (ApiError, OSError) as e:
        sys.exit(f"Could not register with {config['server']}: {e}")
    config["device_id"] = device["_id"]
    save_config(config)
    if device.get("transport") != "pull":
        log("Warning: the server did not record this device as a pull device. "
            "It needs CrossHub with pull-device support, or it will try to push to it.")
    log(f"Registered as device {device['_id']} ({device.get('name')}). Config saved to {CONFIG_PATH}")
    log("Next: python3 textbee_mac.py test --to +15551234567, then python3 textbee_mac.py run")


def cmd_test(args):
    service = args.service or (load_config().get("service", "sms") if CONFIG_PATH.exists() else "sms")
    ok, error = send_via_messages(args.to, args.message, service)
    if ok:
        log(f"Messages accepted the test message to {args.to}. Check your iPhone.")
    else:
        sys.exit(f"Messages could not send: {error}")


def cmd_run(args):
    run(load_config(), once=args.once)


def cmd_status(args):
    config = load_config()
    store = SentStore(STORE_PATH)
    print(f"Server:    {config['server']}")
    print(f"Device ID: {config['device_id']}")
    print(f"Service:   {config.get('service', 'sms')}")
    print(f"Messages:  {store.counts() or 'none yet'}")
    print(f"Unreported status reports: {len(store.unreported())}")
    print(f"Receiving: {config.get('receive', 'sms')} (check with: python3 textbee_mac.py inbox)")


def cmd_inbox(args):
    """Checks that Messages' history is readable and shows the latest incoming texts."""
    config = load_config() if CONFIG_PATH.exists() else {}
    services = RECEIVE_SERVICES.get(config.get("receive", "sms"), RECEIVE_SERVICES["sms"])
    inbox = MessagesInbox(CHAT_DB_PATH, services)
    try:
        latest = inbox.latest_rowid()
        recent = inbox.new_messages(max(0, latest - 200), limit=200)[-args.count:]
    except sqlite3.OperationalError as e:
        sys.exit(f"Can't read {CHAT_DB_PATH}: {e}\n" + FULL_DISK_ACCESS_HELP.format(python=sys.executable))
    print(f"Messages history is readable ({CHAT_DB_PATH}). Latest incoming:")
    if not recent:
        print("No incoming messages yet.")
    for m in recent:
        when = time.strftime("%Y-%m-%d %H:%M", time.localtime(m["at_millis"] / 1000)) if m["at_millis"] else "?"
        # "text" kinds are forwarded when they arrive while the relay runs;
        # this list only reads, it sends nothing.
        mark = "text" if m["forward"] else "skipped (" + (m["service"] or "unknown") + ")"
        preview = (m["text"][:40] + "…") if len(m["text"]) > 40 else m["text"]
        print(f"  {when}  {m['sender'] or '?':<16}  {mark:<20}  {preview}")


def cmd_install_agent(args):
    load_config()
    script = Path(__file__).resolve()
    HOME.mkdir(parents=True, exist_ok=True)
    plist = f"""<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key><string>{LAUNCH_AGENT_LABEL}</string>
    <key>ProgramArguments</key>
    <array>
        <string>/usr/bin/caffeinate</string>
        <string>-i</string>
        <string>{sys.executable}</string>
        <string>{script}</string>
        <string>run</string>
    </array>
    <key>RunAtLoad</key><true/>
    <key>KeepAlive</key><true/>
    <key>StandardOutPath</key><string>{HOME / 'relay.log'}</string>
    <key>StandardErrorPath</key><string>{HOME / 'relay.log'}</string>
</dict>
</plist>
"""
    LAUNCH_AGENT_PATH.parent.mkdir(parents=True, exist_ok=True)
    LAUNCH_AGENT_PATH.write_text(plist)
    subprocess.run(["launchctl", "unload", str(LAUNCH_AGENT_PATH)], capture_output=True)
    subprocess.run(["launchctl", "load", str(LAUNCH_AGENT_PATH)], check=True)
    log(f"Installed {LAUNCH_AGENT_PATH}. The relay now starts at login and restarts if it stops.")
    log(f"Log: {HOME / 'relay.log'}")


def cmd_uninstall_agent(args):
    if LAUNCH_AGENT_PATH.exists():
        subprocess.run(["launchctl", "unload", str(LAUNCH_AGENT_PATH)], capture_output=True)
        LAUNCH_AGENT_PATH.unlink()
        log("Removed the launch agent.")
    else:
        log("No launch agent installed.")


def main(argv=None):
    parser = argparse.ArgumentParser(description="Relay CrossHub messages through Messages and your iPhone.")
    sub = parser.add_subparsers(dest="command", required=True)

    p = sub.add_parser("setup", help="Register this Mac with a CrossHub server")
    p.add_argument("--server", default=DEFAULT_SERVER, help=f"CrossHub API base URL (default {DEFAULT_SERVER})")
    p.add_argument("--api-key", required=True, help="API key from the CrossHub dashboard")
    p.add_argument("--name", help="Device name shown in the dashboard")
    p.add_argument("--service", choices=["sms", "imessage"], default="sms",
                   help="Send as SMS through the iPhone (default) or as iMessage")
    p.add_argument("--receive", choices=["sms", "all", "off"],
                   help="Forward incoming texts to CrossHub: sms (SMS and RCS, the default), "
                        "all (also iMessage), or off")
    p.set_defaults(func=cmd_setup)

    p = sub.add_parser("test", help="Send one message through Messages, without the server")
    p.add_argument("--to", required=True, help="Phone number in international format")
    p.add_argument("--message", default="Test from the CrossHub Mac relay")
    p.add_argument("--service", choices=["sms", "imessage"])
    p.set_defaults(func=cmd_test)

    p = sub.add_parser("run", help="Relay messages until stopped")
    p.add_argument("--once", action="store_true", help="Poll once and exit")
    p.set_defaults(func=cmd_run)

    sub.add_parser("status", help="Show configuration and message counts").set_defaults(func=cmd_status)
    p = sub.add_parser("inbox", help="Check that incoming texts can be read, and list the latest")
    p.add_argument("--count", type=int, default=5)
    p.set_defaults(func=cmd_inbox)
    sub.add_parser("install-agent", help="Start the relay at login (launchd)").set_defaults(func=cmd_install_agent)
    sub.add_parser("uninstall-agent", help="Remove the login launch agent").set_defaults(func=cmd_uninstall_agent)

    args = parser.parse_args(argv)
    args.func(args)


if __name__ == "__main__":
    main()
