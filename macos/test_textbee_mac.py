"""
Tests for the Mac relay's receiving side. Standard library only:

    python3 -m unittest macos/test_textbee_mac.py

They build a small stand-in for Messages' chat.db with the columns the relay
reads, including a text stored only in attributedBody, as macOS 13 and later
often do.
"""

import os
import sqlite3
import sys
import tempfile
import unittest
from pathlib import Path

HERE = Path(__file__).resolve().parent
_tmp = tempfile.mkdtemp()
os.environ["TEXTBEE_MAC_HOME"] = _tmp  # keep the real config untouched
sys.path.insert(0, str(HERE))
import textbee_mac as relay  # noqa: E402


def attributed_body(text: str) -> bytes:
    """An NSAttributedString archive laid out the way Messages stores one."""
    data = text.encode("utf-8")
    if len(data) < 0x80:
        length = bytes([len(data)])
    else:
        length = b"\x81" + len(data).to_bytes(2, "little")
    return (
        b"\x04\x0bstreamtyped\x81\xe8\x03\x84\x01@\x84\x84\x84\x12NSAttributedString\x00"
        b"\x84\x84\x08NSObject\x00\x85\x92\x84\x84\x84\x08NSString\x01\x94\x84\x01+"
        + length + data
        + b"\x86\x84\x02iI\x01\x05\x92\x84\x84\x84\x0cNSDictionary\x00\x94\x84\x01i\x01\x92"
    )


def apple_ns(unix_seconds: float) -> int:
    return int((unix_seconds - relay.APPLE_EPOCH_OFFSET_SECONDS) * 1e9)


def make_chat_db(path: Path):
    db = sqlite3.connect(path)
    db.executescript(
        """
        CREATE TABLE handle (ROWID INTEGER PRIMARY KEY, id TEXT);
        CREATE TABLE message (
            ROWID INTEGER PRIMARY KEY AUTOINCREMENT, text TEXT, attributedBody BLOB,
            date INTEGER, service TEXT, handle_id INTEGER, is_from_me INTEGER,
            item_type INTEGER DEFAULT 0, associated_message_type INTEGER DEFAULT 0
        );
        INSERT INTO handle VALUES (1, '+18259943255'), (2, 'friend@icloud.com'), (3, '+14035550199');
        """
    )
    db.commit()
    return db


def add(db, **row):
    row.setdefault("date", apple_ns(1_790_000_000))
    row.setdefault("is_from_me", 0)
    cols = ", ".join(row)
    db.execute(f"INSERT INTO message ({cols}) VALUES ({', '.join('?' for _ in row)})", tuple(row.values()))
    db.commit()


class DecodeTests(unittest.TestCase):
    def test_short_text(self):
        self.assertEqual(relay.decode_attributed_body(attributed_body("Yes, count me in")), "Yes, count me in")

    def test_long_text_uses_two_byte_length(self):
        text = "Thanks for the update! " * 10  # over 127 bytes
        self.assertEqual(relay.decode_attributed_body(attributed_body(text)), text)

    def test_unicode(self):
        self.assertEqual(relay.decode_attributed_body(attributed_body("Merci 🙏 à demain")), "Merci 🙏 à demain")

    def test_not_an_archive(self):
        self.assertIsNone(relay.decode_attributed_body(b"garbage"))
        self.assertIsNone(relay.decode_attributed_body(None))

    def test_apple_time(self):
        self.assertEqual(relay.apple_time_to_millis(apple_ns(1_790_000_000)), 1_790_000_000_000)
        # Older macOS stored seconds, not nanoseconds
        self.assertEqual(
            relay.apple_time_to_millis(1_790_000_000 - relay.APPLE_EPOCH_OFFSET_SECONDS),
            1_790_000_000_000,
        )


class InboxTests(unittest.TestCase):
    def setUp(self):
        self.dir = Path(tempfile.mkdtemp())
        self.path = self.dir / "chat.db"
        self.db = make_chat_db(self.path)
        self.inbox = relay.MessagesInbox(self.path, relay.RECEIVE_SERVICES["sms"])

    def test_reads_new_incoming_texts_only(self):
        add(self.db, text="old one", service="SMS", handle_id=1)
        start = self.inbox.latest_rowid()
        add(self.db, text=None, attributedBody=attributed_body("Body only"), service="SMS", handle_id=1)
        add(self.db, text="sent by me", service="SMS", handle_id=1, is_from_me=1)
        add(self.db, text="Loved “Body only”", service="SMS", handle_id=1, associated_message_type=2000)
        add(self.db, text="", service="SMS", handle_id=1, item_type=1)  # group change
        add(self.db, text="via iMessage", service="iMessage", handle_id=2)
        add(self.db, text="from an Android", service="RCS", handle_id=3)

        got = self.inbox.new_messages(start)
        self.assertEqual(
            [(m["sender"], m["text"], m["forward"]) for m in got],
            [
                ("+18259943255", "Body only", True),
                ("friend@icloud.com", "via iMessage", False),
                ("+14035550199", "from an Android", True),
            ],
        )

    def test_all_includes_imessage(self):
        inbox = relay.MessagesInbox(self.path, relay.RECEIVE_SERVICES["all"])
        add(self.db, text="via iMessage", service="iMessage", handle_id=2)
        self.assertTrue(inbox.new_messages(0)[0]["forward"])

    def test_missing_permission_is_an_operational_error(self):
        locked = relay.MessagesInbox(self.dir / "missing" / "chat.db", {"SMS"})
        with self.assertRaises(sqlite3.OperationalError):
            locked.latest_rowid()


class FakeApi:
    def __init__(self):
        self.sent = []
        self.fail_with = None

    def report_received(self, device_id, sms):
        if self.fail_with:
            raise self.fail_with
        self.sent.append(sms)
        return {"data": {}}


class ReceiverTests(unittest.TestCase):
    def setUp(self):
        self.dir = Path(tempfile.mkdtemp())
        self.db = make_chat_db(self.dir / "chat.db")
        self.store = relay.SentStore(self.dir / "sent.sqlite3")
        self.api = FakeApi()
        self.receiver = relay.Receiver(
            self.api, self.store, "dev1",
            relay.MessagesInbox(self.dir / "chat.db", relay.RECEIVE_SERVICES["sms"]),
        )

    def test_first_run_starts_from_now_then_forwards_new_texts_once(self):
        add(self.db, text="history", service="SMS", handle_id=1)
        self.assertEqual(self.receiver.poll(), 0)  # baseline only
        add(self.db, text="Reply STOP to opt out? No, I'm in!", service="SMS", handle_id=1)

        self.assertEqual(self.receiver.poll(), 1)
        self.assertEqual(self.api.sent[0]["sender"], "+18259943255")
        self.assertEqual(self.api.sent[0]["message"], "Reply STOP to opt out? No, I'm in!")
        self.assertEqual(self.api.sent[0]["receivedAtInMillis"], 1_790_000_000_000)
        self.assertEqual(self.receiver.poll(), 0)  # not again
        self.assertEqual(len(self.api.sent), 1)

    def test_network_failure_retries_the_same_text(self):
        self.receiver.poll()
        add(self.db, text="hello", service="SMS", handle_id=1)
        self.api.fail_with = OSError("connection refused")
        self.assertEqual(self.receiver.poll(), 0)
        self.api.fail_with = None
        self.assertEqual(self.receiver.poll(), 1)
        self.assertEqual([m["message"] for m in self.api.sent], ["hello"])

    def test_a_text_the_server_refuses_is_skipped_not_retried_forever(self):
        self.receiver.poll()
        add(self.db, text="bad", service="SMS", handle_id=1)
        add(self.db, text="good", service="SMS", handle_id=1)
        calls = {"n": 0}

        def flaky(device_id, sms):
            calls["n"] += 1
            if sms["message"] == "bad":
                raise relay.ApiError(400, "Invalid received SMS data")
            self.api.sent.append(sms)

        self.api.report_received = flaky
        self.receiver.poll()
        self.assertEqual([m["message"] for m in self.api.sent], ["good"])

    def test_without_permission_it_backs_off_and_keeps_relaying(self):
        receiver = relay.Receiver(
            self.api, self.store, "dev1",
            relay.MessagesInbox(self.dir / "missing" / "chat.db", {"SMS"}),
        )
        self.assertEqual(receiver.poll(), 0)
        self.assertGreater(receiver.denied_until, 0)


if __name__ == "__main__":
    unittest.main()
