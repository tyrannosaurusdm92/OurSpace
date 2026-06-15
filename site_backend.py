#!/usr/bin/env python3
"""
OurSpace Two-Profile Sign-In + Store Receipt Backend
Python conversion of the Google Apps Script Code.gs backend.

What this version changes from Apps Script:
- SpreadsheetApp storage -> SQLite database
- Utilities hashing/tokens -> hashlib, secrets, uuid
- MailApp -> optional SMTP email sender with safe no-crash fallback
- doGet/doPost -> Flask app when Flask is installed, plus a stdlib HTTP fallback

Run locally:
    python site_backend.py

Optional Flask deployment:
    pip install flask
    flask --app site_backend run --host 0.0.0.0 --port 8080

Environment variables:
    OURSPACE_DB_PATH=/path/to/ourspace_backend.sqlite
    OURSPACE_HOST=0.0.0.0
    OURSPACE_PORT=8080

Optional SMTP:
    SMTP_HOST=smtp.gmail.com
    SMTP_PORT=587
    SMTP_USER=you@example.com
    SMTP_PASSWORD=your_app_password
    SMTP_FROM=you@example.com
    SMTP_USE_TLS=1

Debug reset-code visibility:
    OURSPACE_DEBUG_RESET_CODES=1
"""

from __future__ import annotations

import datetime as _dt
import hashlib
import html
import json
import os
import secrets
import smtplib
import sqlite3
import sys
import urllib.parse
import uuid
from email.message import EmailMessage
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional, Tuple


OURSPACE_CONFIG: Dict[str, Any] = {
    "APP_NAME": "OurSpace two-profile sign-in + store receipts",
    "DATABASE_PROPERTY_KEY": "OURSPACE_BACKEND_SPREADSHEET_ID",
    "MAX_USERS": 2,
    "SESSION_DAYS": 30,
    "RESET_CODE_MINUTES": 30,
    "MIN_PASSWORD_LENGTH": 8,
    "PROFILES": {
        "william": {
            "profileKey": "william",
            "displayName": "William / Dino",
            "siteName": "Dino Nerdzone",
            "primaryEmail": "williamsaville92@gmail.com",
            "purchaseNotificationRecipient": "jasperfaye99@gmail.com",
        },
        "jasper": {
            "profileKey": "jasper",
            "displayName": "Jasper",
            "siteName": "Squishy Cottage",
            "primaryEmail": "jasperfaye99@gmail.com",
            "purchaseNotificationRecipient": "williamsaville92@gmail.com",
        },
    },
    "SHEETS": {
        "users": "Users",
        "sessions": "Sessions",
        "resets": "PasswordResets",
        "purchases": "Purchases",
        "earnings": "Earnings",
        "audit": "AuditLog",
    },
}


def available_actions() -> List[str]:
    return [
        "setup",
        "health",
        "signup",
        "signin",
        "signout",
        "me",
        "forgotEmail",
        "forgotUsername",
        "requestPasswordReset",
        "resetPassword",
        "recordPurchase",
        "listMyPurchases",
        "recordEarn",
        "listMyEarnings",
    ]


# ---------------------------------------------------------------------------
# Database
# ---------------------------------------------------------------------------


def database_path() -> Path:
    configured = os.environ.get("OURSPACE_DB_PATH", "").strip()
    if configured:
        return Path(configured).expanduser().resolve()
    base = Path(__file__).resolve().parent if "__file__" in globals() else Path.cwd()
    return base / "ourspace_backend.sqlite"


def get_conn() -> sqlite3.Connection:
    db_path = database_path()
    db_path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(db_path))
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def ensure_database() -> str:
    """Create or migrate the SQLite database. Returns the DB path as a string."""
    db_path = database_path()
    with get_conn() as conn:
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS Users (
                UserId TEXT PRIMARY KEY,
                ProfileKey TEXT UNIQUE,
                DisplayName TEXT NOT NULL,
                Email TEXT UNIQUE NOT NULL,
                Username TEXT UNIQUE NOT NULL,
                PasswordSalt TEXT NOT NULL,
                PasswordHash TEXT NOT NULL,
                CreatedAt TEXT NOT NULL,
                UpdatedAt TEXT NOT NULL,
                Active TEXT NOT NULL DEFAULT 'true'
            );

            CREATE TABLE IF NOT EXISTS Sessions (
                SessionId TEXT PRIMARY KEY,
                UserId TEXT NOT NULL,
                SessionToken TEXT UNIQUE NOT NULL,
                CreatedAt TEXT NOT NULL,
                UpdatedAt TEXT NOT NULL,
                ExpiresAt TEXT NOT NULL,
                Active TEXT NOT NULL DEFAULT 'true',
                FOREIGN KEY(UserId) REFERENCES Users(UserId)
            );

            CREATE TABLE IF NOT EXISTS PasswordResets (
                ResetId TEXT PRIMARY KEY,
                UserId TEXT NOT NULL,
                ProfileKey TEXT NOT NULL,
                CodeSalt TEXT NOT NULL,
                CodeHash TEXT NOT NULL,
                CreatedAt TEXT NOT NULL,
                ExpiresAt TEXT NOT NULL,
                Used TEXT NOT NULL DEFAULT 'false',
                UsedAt TEXT NOT NULL DEFAULT '',
                FOREIGN KEY(UserId) REFERENCES Users(UserId)
            );

            CREATE TABLE IF NOT EXISTS Purchases (
                PurchaseId TEXT PRIMARY KEY,
                PurchaserProfile TEXT NOT NULL,
                PurchaserUserId TEXT NOT NULL DEFAULT '',
                PurchaserDisplayName TEXT NOT NULL,
                StoreName TEXT NOT NULL,
                TotalCostCopper INTEGER NOT NULL DEFAULT 0,
                TotalCostDisplay TEXT NOT NULL,
                ItemsJson TEXT NOT NULL,
                Note TEXT NOT NULL DEFAULT '',
                CreatedAt TEXT NOT NULL,
                EmailSentTo TEXT NOT NULL DEFAULT ''
            );

            CREATE TABLE IF NOT EXISTS Earnings (
                EarningId TEXT PRIMARY KEY,
                ProfileKey TEXT NOT NULL,
                UserId TEXT NOT NULL DEFAULT '',
                Source TEXT NOT NULL DEFAULT 'site',
                Label TEXT NOT NULL DEFAULT 'Earned currency',
                AmountCopper INTEGER NOT NULL DEFAULT 0,
                AmountDisplay TEXT NOT NULL,
                DetailsJson TEXT NOT NULL,
                CreatedAt TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS AuditLog (
                AuditId TEXT PRIMARY KEY,
                Action TEXT NOT NULL,
                Actor TEXT NOT NULL DEFAULT '',
                DetailsJson TEXT NOT NULL,
                CreatedAt TEXT NOT NULL
            );

            CREATE INDEX IF NOT EXISTS idx_sessions_token_active
                ON Sessions(SessionToken, Active);
            CREATE INDEX IF NOT EXISTS idx_purchases_profile
                ON Purchases(PurchaserProfile, PurchaserUserId, CreatedAt);
            CREATE INDEX IF NOT EXISTS idx_earnings_profile
                ON Earnings(ProfileKey, UserId, CreatedAt);
            """
        )
    return str(db_path)


def row_to_dict(row: Optional[sqlite3.Row]) -> Optional[Dict[str, Any]]:
    return dict(row) if row is not None else None


def fetch_one(query: str, params: Tuple[Any, ...] = ()) -> Optional[Dict[str, Any]]:
    ensure_database()
    with get_conn() as conn:
        return row_to_dict(conn.execute(query, params).fetchone())


def fetch_all(query: str, params: Tuple[Any, ...] = ()) -> List[Dict[str, Any]]:
    ensure_database()
    with get_conn() as conn:
        return [dict(row) for row in conn.execute(query, params).fetchall()]


def insert_row(table: str, data: Dict[str, Any]) -> None:
    ensure_database()
    keys = list(data.keys())
    placeholders = ", ".join(["?"] * len(keys))
    columns = ", ".join(keys)
    values = tuple(data[key] for key in keys)
    with get_conn() as conn:
        conn.execute(f"INSERT INTO {table} ({columns}) VALUES ({placeholders})", values)


def update_row(table: str, id_field: str, id_value: Any, patch: Dict[str, Any]) -> bool:
    ensure_database()
    if not patch:
        return False
    keys = list(patch.keys())
    assignments = ", ".join([f"{key} = ?" for key in keys])
    values = tuple(patch[key] for key in keys) + (id_value,)
    with get_conn() as conn:
        cur = conn.execute(
            f"UPDATE {table} SET {assignments} WHERE {id_field} = ?",
            values,
        )
        return cur.rowcount > 0


# ---------------------------------------------------------------------------
# Request routing
# ---------------------------------------------------------------------------


def handle_payload(payload: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    """Safe top-level action handler. Always returns JSON-serializable dicts."""
    try:
        payload = payload or {}
        action = clean_text(payload.get("action", "")).strip()
        if not action:
            return {
                "ok": True,
                "app": OURSPACE_CONFIG["APP_NAME"],
                "message": "OurSpace backend is online.",
                "availableActions": available_actions(),
            }
        return route_action(action, payload)
    except Exception as err:
        return {"ok": False, "error": str(err)}


def route_action(action: str, payload: Dict[str, Any]) -> Dict[str, Any]:
    ensure_database()

    if action == "setup":
        return setup_backend()
    if action == "health":
        return health()
    if action == "signup":
        return signup(payload)
    if action == "signin":
        return signin(payload)
    if action == "signout":
        return signout(payload)
    if action == "me":
        return me(payload)
    if action == "forgotEmail":
        return forgot_email(payload)
    if action == "forgotUsername":
        return forgot_username(payload)
    if action == "requestPasswordReset":
        return request_password_reset(payload)
    if action == "resetPassword":
        return reset_password(payload)
    if action == "recordPurchase":
        return record_purchase(payload)
    if action == "listMyPurchases":
        return list_my_purchases(payload)
    if action == "recordEarn":
        return record_earn(payload)
    if action == "listMyEarnings":
        return list_my_earnings(payload)

    return {"ok": False, "error": f"Unknown action: {action}"}


def setup_backend() -> Dict[str, Any]:
    path = ensure_database()
    return {
        "ok": True,
        "app": OURSPACE_CONFIG["APP_NAME"],
        "databasePath": path,
        "message": "OurSpace backend setup complete.",
    }


def health() -> Dict[str, Any]:
    path = ensure_database()
    active_user_count = fetch_one(
        "SELECT COUNT(*) AS count FROM Users WHERE Active = 'true'"
    )["count"]
    return {
        "ok": True,
        "app": OURSPACE_CONFIG["APP_NAME"],
        "databaseReady": True,
        "databasePath": path,
        "activeUserCount": int(active_user_count),
        "maxUsers": int(OURSPACE_CONFIG["MAX_USERS"]),
        "profileSlots": list(OURSPACE_CONFIG["PROFILES"].keys()),
        "outsideAppsRemoved": True,
    }


# ---------------------------------------------------------------------------
# Auth
# ---------------------------------------------------------------------------


def password_from_payload(payload: Dict[str, Any], primary_field: Optional[str] = None) -> str:
    fields = (
        [primary_field, "password", "localPassword", "signinPassword", "newPassword"]
        if primary_field
        else ["password", "localPassword", "signinPassword", "newPassword"]
    )
    for field in fields:
        if not field:
            continue
        if field in payload and payload[field] is not None:
            return str(payload[field])
    return ""


def require_password(password: str, label: str = "Password") -> None:
    minimum = int(OURSPACE_CONFIG.get("MIN_PASSWORD_LENGTH", 8))
    if not password or len(password) < minimum:
        raise ValueError(f"{label} must be at least {minimum} characters.")


def signup(payload: Dict[str, Any]) -> Dict[str, Any]:
    email = normalize_email(payload.get("email"))
    username = normalize_username(payload.get("username"))
    display_name = clean_text(
        payload.get("displayName") or payload.get("nickname") or username or email
    )
    password = password_from_payload(payload, "password")
    requested_profile_key = normalize_profile_key(payload.get("profileKey"))

    if not email:
        raise ValueError("Email is required.")
    if not username:
        raise ValueError("Username is required.")
    require_password(password, "Password")
    if not display_name:
        raise ValueError("Display name is required.")

    profile_key = requested_profile_key or infer_profile_key_from_email(email)
    if not profile_key or profile_key not in OURSPACE_CONFIG["PROFILES"]:
        raise ValueError('Profile slot is required. Use profileKey "william" or "jasper".')

    active_count = int(fetch_one("SELECT COUNT(*) AS count FROM Users WHERE Active = 'true'")["count"])
    if active_count >= int(OURSPACE_CONFIG["MAX_USERS"]):
        raise ValueError("OurSpace already has 2 permanent users. A third account cannot be created.")
    if find_user_by_email(email):
        raise ValueError("That email is already registered.")
    if find_user_by_username(username):
        raise ValueError("That username is already registered.")
    if find_user_by_profile_key(profile_key):
        raise ValueError("That permanent profile slot is already taken.")

    salt = random_token(32)
    now = iso_now()
    user = {
        "UserId": make_id("user"),
        "ProfileKey": profile_key,
        "DisplayName": display_name,
        "Email": email,
        "Username": username,
        "PasswordSalt": salt,
        "PasswordHash": hash_password(password, salt),
        "CreatedAt": now,
        "UpdatedAt": now,
        "Active": "true",
    }
    insert_row("Users", user)
    append_audit("signup", user["UserId"], {"profileKey": profile_key, "email": email, "username": username})

    session = create_session(user["UserId"])
    return {
        "ok": True,
        "message": "Signed up successfully.",
        "user": safe_user(user),
        "sessionToken": session["SessionToken"],
        "expiresAt": session["ExpiresAt"],
    }


def signin(payload: Dict[str, Any]) -> Dict[str, Any]:
    identifier = normalize_identifier(
        payload.get("identifier") or payload.get("email") or payload.get("username")
    )
    requested_profile_key = normalize_profile_key(payload.get("profileKey", ""))
    password = password_from_payload(payload, "password")

    if not identifier:
        raise ValueError("Email or username is required.")
    require_password(password, "Password")

    user = (
        find_user_by_email(identifier)
        or find_user_by_username(identifier)
        or find_user_by_profile_key(identifier)
    )
    if not user or str(user.get("Active")) != "true":
        raise ValueError("No matching active user found.")
    if requested_profile_key and user.get("ProfileKey") != requested_profile_key:
        raise ValueError("That sign-in does not belong to the selected profile.")

    test_hash = hash_password(password, str(user["PasswordSalt"]))
    if test_hash != user["PasswordHash"]:
        raise ValueError("Password did not match the selected profile.")

    session = create_session(user["UserId"])
    append_audit("signin", user["UserId"], {"method": "password"})
    return {
        "ok": True,
        "message": "Signed in successfully.",
        "user": safe_user(user),
        "sessionToken": session["SessionToken"],
        "expiresAt": session["ExpiresAt"],
    }


def signout(payload: Dict[str, Any]) -> Dict[str, Any]:
    token = clean_text(payload.get("sessionToken", ""))
    if not token:
        return {"ok": True, "message": "No session token provided."}

    session = fetch_one(
        "SELECT * FROM Sessions WHERE SessionToken = ? AND Active = 'true'",
        (token,),
    )
    if session:
        update_row(
            "Sessions",
            "SessionId",
            session["SessionId"],
            {"Active": "false", "UpdatedAt": iso_now()},
        )
        append_audit("signout", session["UserId"], {})
    return {"ok": True, "message": "Signed out."}


def me(payload: Dict[str, Any]) -> Dict[str, Any]:
    auth = require_session(payload.get("sessionToken"))
    return {
        "ok": True,
        "user": safe_user(auth["user"]),
        "session": {"expiresAt": auth["session"]["ExpiresAt"]},
    }


# ---------------------------------------------------------------------------
# Forgot email / username / password reset
# ---------------------------------------------------------------------------


def forgot_email(payload: Dict[str, Any]) -> Dict[str, Any]:
    username = normalize_username(payload.get("username"))
    if not username:
        raise ValueError("Username is required.")
    user = find_user_by_username(username)
    if not user or str(user.get("Active")) != "true":
        return {"ok": True, "found": False, "message": "No active user found for that username."}
    return {
        "ok": True,
        "found": True,
        "email": mask_email(user["Email"]),
        "profileKey": user["ProfileKey"],
    }


def forgot_username(payload: Dict[str, Any]) -> Dict[str, Any]:
    email = normalize_email(payload.get("email"))
    if not email:
        raise ValueError("Email is required.")
    user = find_user_by_email(email)
    if not user or str(user.get("Active")) != "true":
        return {"ok": True, "found": False, "message": "No active user found for that email."}
    return {"ok": True, "found": True, "username": user["Username"], "profileKey": user["ProfileKey"]}


def request_password_reset(payload: Dict[str, Any]) -> Dict[str, Any]:
    identifier = normalize_identifier(
        payload.get("identifier") or payload.get("email") or payload.get("username")
    )
    if not identifier:
        raise ValueError("Email or username is required.")

    user = find_user_by_email(identifier) or find_user_by_username(identifier)
    generic = {"ok": True, "message": "If that account exists, a reset code was sent."}
    if not user or str(user.get("Active")) != "true":
        return generic

    code = str(secrets.randbelow(900000) + 100000)
    salt = random_token(16)
    code_hash = sha256_hex(f"{salt}|{code}")
    expires_at = (
        _dt.datetime.now(_dt.timezone.utc)
        + _dt.timedelta(minutes=int(OURSPACE_CONFIG["RESET_CODE_MINUTES"]))
    ).isoformat()

    insert_row(
        "PasswordResets",
        {
            "ResetId": make_id("reset"),
            "UserId": user["UserId"],
            "ProfileKey": user["ProfileKey"],
            "CodeSalt": salt,
            "CodeHash": code_hash,
            "CreatedAt": iso_now(),
            "ExpiresAt": expires_at,
            "Used": "false",
            "UsedAt": "",
        },
    )

    email_result = send_email(
        to=user["Email"],
        subject="OurSpace password reset code",
        body=(
            "The OurSpace password reset code is: "
            + code
            + f"\n\nThis code expires in {OURSPACE_CONFIG['RESET_CODE_MINUTES']} minutes."
            + "\n\nIf the reset was not requested, ignore this email."
        ),
        html_body=(
            "<h2>OurSpace password reset</h2>"
            "<p>The reset code is:</p>"
            f'<p style="font-size:28px;font-weight:bold;letter-spacing:4px;">{escape_html(code)}</p>'
            f"<p>This code expires in {OURSPACE_CONFIG['RESET_CODE_MINUTES']} minutes.</p>"
            "<p>If the reset was not requested, ignore this email.</p>"
        ),
        name="OurSpace sign-in",
    )

    append_audit("requestPasswordReset", user["UserId"], {"emailResult": email_result})
    response = dict(generic)
    if os.environ.get("OURSPACE_DEBUG_RESET_CODES") == "1":
        response["debugResetCode"] = code
    response["email"] = email_result
    return response


def reset_password(payload: Dict[str, Any]) -> Dict[str, Any]:
    identifier = normalize_identifier(
        payload.get("identifier") or payload.get("email") or payload.get("username")
    )
    code = clean_text(payload.get("code") or payload.get("resetCode"))
    new_password = password_from_payload(payload, "newPassword")

    if not identifier:
        raise ValueError("Email or username is required.")
    if not code:
        raise ValueError("Reset code is required.")
    require_password(new_password, "New password")

    user = find_user_by_email(identifier) or find_user_by_username(identifier)
    if not user or str(user.get("Active")) != "true":
        raise ValueError("No active user found.")

    resets = fetch_all(
        """
        SELECT * FROM PasswordResets
        WHERE UserId = ? AND Used != 'true'
        ORDER BY CreatedAt DESC
        """,
        (user["UserId"],),
    )

    valid_reset = None
    now = _dt.datetime.now(_dt.timezone.utc)
    for reset in resets:
        expires_at = parse_iso_datetime(reset["ExpiresAt"])
        not_expired = expires_at > now
        hash_matches = sha256_hex(f"{reset['CodeSalt']}|{code}") == reset["CodeHash"]
        if not_expired and hash_matches:
            valid_reset = reset
            break

    if not valid_reset:
        raise ValueError("Invalid or expired reset code.")

    salt = random_token(32)
    update_row(
        "Users",
        "UserId",
        user["UserId"],
        {
            "PasswordSalt": salt,
            "PasswordHash": hash_password(new_password, salt),
            "UpdatedAt": iso_now(),
        },
    )
    update_row(
        "PasswordResets",
        "ResetId",
        valid_reset["ResetId"],
        {"Used": "true", "UsedAt": iso_now()},
    )
    append_audit("resetPassword", user["UserId"], {})
    return {"ok": True, "message": "Password reset successfully."}


# ---------------------------------------------------------------------------
# Purchases
# ---------------------------------------------------------------------------


def record_purchase(payload: Dict[str, Any]) -> Dict[str, Any]:
    purchaser_user = None
    purchaser_profile_key = normalize_profile_key(
        payload.get("purchaserProfile") or payload.get("profileKey")
    )

    if payload.get("sessionToken"):
        auth = require_session(payload.get("sessionToken"))
        purchaser_user = auth["user"]
        purchaser_profile_key = purchaser_user["ProfileKey"]

    if not purchaser_profile_key or purchaser_profile_key not in OURSPACE_CONFIG["PROFILES"]:
        raise ValueError('Purchaser profile must be "william" or "jasper".')

    if not purchaser_user:
        purchaser_user = find_user_by_profile_key(purchaser_profile_key)

    purchaser_profile = OURSPACE_CONFIG["PROFILES"][purchaser_profile_key]
    recipient_email = purchaser_profile["purchaseNotificationRecipient"]
    raw_items = payload.get("items", [])
    if isinstance(raw_items, str):
        raw_items = safe_json_parse(raw_items, [])
    if not isinstance(raw_items, list):
        raw_items = []
    if not raw_items:
        raise ValueError("Purchase must include at least one item.")

    items = []
    for index, item in enumerate(raw_items):
        item = item if isinstance(item, dict) else {}
        quantity = to_number(first_present(item, ["quantity", "qty"], 1), 1)
        unit_cost_copper = to_number(
            first_present(item, ["unitCostCopper", "costCopper", "priceCopper"], 0),
            0,
        )
        total_cost_copper = to_number(
            first_present(item, ["totalCostCopper"], quantity * unit_cost_copper),
            quantity * unit_cost_copper,
        )

        safe_quantity = quantity if quantity > 0 else 1
        safe_unit = unit_cost_copper if unit_cost_copper >= 0 else 0
        safe_total = total_cost_copper if total_cost_copper >= 0 else 0

        items.append(
            {
                "line": index + 1,
                "itemId": clean_text(item.get("id") or item.get("itemId") or ""),
                "name": clean_text(item.get("name") or item.get("title") or "Unnamed item"),
                "quantity": safe_quantity,
                "unitCostCopper": safe_unit,
                "totalCostCopper": safe_total,
                "notes": clean_text(item.get("notes") or item.get("note") or ""),
            }
        )

    calculated_total_copper = sum(int(item.get("totalCostCopper") or 0) for item in items)
    total_cost_copper = int(
        to_number(first_present(payload, ["totalCostCopper"], calculated_total_copper), calculated_total_copper)
    )
    purchase_id = make_id("purchase")
    store_name = clean_text(payload.get("storeName") or f"{purchaser_profile['displayName']} Reward Store")
    purchase_note = clean_text(payload.get("note") or payload.get("notes") or "")
    created_at = iso_now()

    purchase = {
        "PurchaseId": purchase_id,
        "PurchaserProfile": purchaser_profile_key,
        "PurchaserUserId": purchaser_user["UserId"] if purchaser_user else "",
        "PurchaserDisplayName": purchaser_user["DisplayName"] if purchaser_user else purchaser_profile["displayName"],
        "StoreName": store_name,
        "TotalCostCopper": total_cost_copper,
        "TotalCostDisplay": format_currency(total_cost_copper),
        "ItemsJson": json.dumps(items, ensure_ascii=False),
        "Note": purchase_note,
        "CreatedAt": created_at,
        "EmailSentTo": recipient_email,
    }

    insert_row("Purchases", purchase)
    email_result = send_purchase_email(purchase, items, recipient_email)
    append_audit(
        "recordPurchase",
        purchaser_user["UserId"] if purchaser_user else purchaser_profile_key,
        {
            "purchaseId": purchase_id,
            "purchaserProfile": purchaser_profile_key,
            "totalCostCopper": total_cost_copper,
            "totalCostDisplay": format_currency(total_cost_copper),
            "recipientEmail": recipient_email,
            "emailResult": email_result,
        },
    )

    return {
        "ok": True,
        "message": "Purchase recorded and notification email processed.",
        "purchaseId": purchase_id,
        "emailedTo": recipient_email,
        "email": email_result,
        "totalCostCopper": total_cost_copper,
        "totalCostDisplay": format_currency(total_cost_copper),
        "receiptText": build_receipt_text(purchase, items),
        "items": items,
    }


def build_receipt_text(purchase: Dict[str, Any], items: List[Dict[str, Any]]) -> str:
    lines = [
        f"{purchase.get('StoreName') or 'Profile Store'} purchase",
        f"Purchase ID: {purchase.get('PurchaseId')}",
        f"Purchaser: {purchase.get('PurchaserDisplayName') or purchase.get('PurchaserProfile')}",
        f"Store: {purchase.get('StoreName')}",
        f"Time: {purchase.get('CreatedAt')}",
        f"Total: {purchase.get('TotalCostDisplay')}",
        "",
        "Items:",
    ]
    for item in items:
        line = (
            f"- {item['name']} | Qty: {item['quantity']} | "
            f"Unit: {format_currency(item['unitCostCopper'])} | "
            f"Line total: {format_currency(item['totalCostCopper'])}"
        )
        if item.get("notes"):
            line += f" | Notes: {item['notes']}"
        lines.append(line)
    if purchase.get("Note"):
        lines.extend(["", "Purchase note:", str(purchase["Note"])])
    return "\n".join(lines)


def send_purchase_email(
    purchase: Dict[str, Any],
    items: List[Dict[str, Any]],
    recipient_email: str,
) -> Dict[str, Any]:
    purchaser_name = purchase.get("PurchaserDisplayName") or purchase.get("PurchaserProfile")
    subject = f"{purchase.get('StoreName') or 'Profile Store'} purchase: {purchaser_name} bought rewards"

    html_rows = "".join(
        "<tr>"
        f'<td style="padding:8px;border:1px solid #ddd;">{escape_html(item["name"])}</td>'
        f'<td style="padding:8px;border:1px solid #ddd;text-align:center;">{escape_html(str(item["quantity"]))}</td>'
        f'<td style="padding:8px;border:1px solid #ddd;">{escape_html(format_currency(item["unitCostCopper"]))}</td>'
        f'<td style="padding:8px;border:1px solid #ddd;">{escape_html(format_currency(item["totalCostCopper"]))}</td>'
        f'<td style="padding:8px;border:1px solid #ddd;">{escape_html(item.get("notes") or "")}</td>'
        "</tr>"
        for item in items
    )

    html_body = (
        '<div style="font-family:Arial,sans-serif;line-height:1.45;color:#111;">'
        f"<h2>{escape_html(str(purchase.get('StoreName') or 'Profile Store'))} purchase</h2>"
        f"<p><strong>Purchase ID:</strong> {escape_html(purchase.get('PurchaseId'))}</p>"
        f"<p><strong>Purchaser:</strong> {escape_html(purchaser_name)}</p>"
        f"<p><strong>Store:</strong> {escape_html(purchase.get('StoreName'))}</p>"
        f"<p><strong>Time:</strong> {escape_html(purchase.get('CreatedAt'))}</p>"
        f"<p><strong>Total:</strong> {escape_html(purchase.get('TotalCostDisplay'))}</p>"
        '<table style="border-collapse:collapse;width:100%;max-width:900px;">'
        '<thead><tr style="background:#f0f0f0;">'
        '<th style="padding:8px;border:1px solid #ddd;text-align:left;">Item</th>'
        '<th style="padding:8px;border:1px solid #ddd;">Qty</th>'
        '<th style="padding:8px;border:1px solid #ddd;text-align:left;">Unit cost</th>'
        '<th style="padding:8px;border:1px solid #ddd;text-align:left;">Line total</th>'
        '<th style="padding:8px;border:1px solid #ddd;text-align:left;">Notes</th>'
        "</tr></thead>"
        f"<tbody>{html_rows}</tbody>"
        "</table>"
        + (
            f"<h3>Purchase note</h3><p>{escape_html(purchase.get('Note'))}</p>"
            if purchase.get("Note")
            else ""
        )
        + "</div>"
    )

    return send_email(
        to=recipient_email,
        subject=subject,
        name=str(purchase.get("StoreName") or "Profile Store"),
        body=build_receipt_text(purchase, items),
        html_body=html_body,
    )


def list_my_purchases(payload: Dict[str, Any]) -> Dict[str, Any]:
    auth = require_session(payload.get("sessionToken"))
    rows = fetch_all(
        """
        SELECT * FROM Purchases
        WHERE PurchaserUserId = ? OR PurchaserProfile = ?
        ORDER BY CreatedAt DESC
        """,
        (auth["user"]["UserId"], auth["user"]["ProfileKey"]),
    )
    purchases = [
        {
            "purchaseId": row["PurchaseId"],
            "storeName": row["StoreName"],
            "totalCostCopper": int(row.get("TotalCostCopper") or 0),
            "totalCostDisplay": row["TotalCostDisplay"],
            "items": safe_json_parse(row.get("ItemsJson"), []),
            "note": row.get("Note", ""),
            "createdAt": row["CreatedAt"],
            "emailSentTo": row.get("EmailSentTo", ""),
        }
        for row in rows
    ]
    return {"ok": True, "purchases": purchases}


# ---------------------------------------------------------------------------
# Earnings
# ---------------------------------------------------------------------------


def record_earn(payload: Dict[str, Any]) -> Dict[str, Any]:
    actor_user = None
    profile_key = normalize_profile_key(payload.get("profile") or payload.get("profileKey"))

    if payload.get("sessionToken"):
        auth = require_session(payload.get("sessionToken"))
        actor_user = auth["user"]
        profile_key = actor_user["ProfileKey"]

    if not profile_key or profile_key not in OURSPACE_CONFIG["PROFILES"]:
        raise ValueError('Earn profile must be "william" or "jasper".')

    if not actor_user:
        actor_user = find_user_by_profile_key(profile_key)

    amount = max(
        0,
        int(
            to_number(
                first_present(payload, ["amount", "totalCopper", "rewardCopper"], 0),
                0,
            )
        ),
    )
    earning_id = clean_text(payload.get("id") or payload.get("earningId")) or make_id("earn")
    entry = {
        "EarningId": earning_id,
        "ProfileKey": profile_key,
        "UserId": actor_user["UserId"] if actor_user else "",
        "Source": clean_text(payload.get("source") or "site"),
        "Label": clean_text(
            payload.get("label") or payload.get("task") or payload.get("reason") or "Earned currency"
        ),
        "AmountCopper": amount,
        "AmountDisplay": clean_text(payload.get("display") or format_currency(amount)),
        "DetailsJson": json.dumps(strip_oversized_data(payload, 20000), ensure_ascii=False),
        "CreatedAt": clean_text(payload.get("createdAt")) or iso_now(),
    }

    existing = fetch_one("SELECT * FROM Earnings WHERE EarningId = ?", (earning_id,))
    if not existing:
        insert_row("Earnings", entry)

    append_audit(
        "recordEarn",
        actor_user["UserId"] if actor_user else profile_key,
        {"earningId": earning_id, "profileKey": profile_key, "amountCopper": amount},
    )
    return {
        "ok": True,
        "message": "Earning was already recorded." if existing else "Earning recorded.",
        "earning": {
            "earningId": entry["EarningId"],
            "profileKey": entry["ProfileKey"],
            "amountCopper": entry["AmountCopper"],
            "amountDisplay": entry["AmountDisplay"],
            "source": entry["Source"],
            "label": entry["Label"],
            "createdAt": entry["CreatedAt"],
        },
    }


def list_my_earnings(payload: Dict[str, Any]) -> Dict[str, Any]:
    auth = require_session(payload.get("sessionToken"))
    limit = clamp_number(payload.get("limit"), 1, 500, 200)
    rows = fetch_all(
        """
        SELECT * FROM Earnings
        WHERE UserId = ? OR ProfileKey = ?
        ORDER BY CreatedAt DESC
        LIMIT ?
        """,
        (auth["user"]["UserId"], auth["user"]["ProfileKey"], limit),
    )
    earnings = [
        {
            "earningId": row["EarningId"],
            "profileKey": row["ProfileKey"],
            "source": row["Source"],
            "label": row["Label"],
            "amountCopper": int(row.get("AmountCopper") or 0),
            "amountDisplay": row["AmountDisplay"],
            "details": safe_json_parse(row.get("DetailsJson"), {}),
            "createdAt": row["CreatedAt"],
        }
        for row in rows
    ]
    return {"ok": True, "earnings": earnings}


# ---------------------------------------------------------------------------
# User lookups + sessions
# ---------------------------------------------------------------------------


def find_user_by_id(user_id: Any) -> Optional[Dict[str, Any]]:
    return fetch_one("SELECT * FROM Users WHERE UserId = ?", (str(user_id),))


def find_user_by_email(email: Any) -> Optional[Dict[str, Any]]:
    normalized = normalize_email(email)
    if not normalized:
        return None
    return fetch_one("SELECT * FROM Users WHERE lower(Email) = ?", (normalized,))


def find_user_by_username(username: Any) -> Optional[Dict[str, Any]]:
    normalized = normalize_username(username)
    if not normalized:
        return None
    return fetch_one("SELECT * FROM Users WHERE lower(Username) = ?", (normalized,))


def find_user_by_profile_key(profile_key: Any) -> Optional[Dict[str, Any]]:
    normalized = normalize_profile_key(profile_key)
    if not normalized:
        return None
    return fetch_one(
        "SELECT * FROM Users WHERE lower(ProfileKey) = ? AND Active = 'true'",
        (normalized,),
    )


def create_session(user_id: str) -> Dict[str, Any]:
    now = iso_now()
    expires_at = (
        _dt.datetime.now(_dt.timezone.utc)
        + _dt.timedelta(days=int(OURSPACE_CONFIG["SESSION_DAYS"]))
    ).isoformat()
    session = {
        "SessionId": make_id("session"),
        "UserId": user_id,
        "SessionToken": random_token(48),
        "CreatedAt": now,
        "UpdatedAt": now,
        "ExpiresAt": expires_at,
        "Active": "true",
    }
    insert_row("Sessions", session)
    return session


def require_session(session_token: Any) -> Dict[str, Dict[str, Any]]:
    token = clean_text(session_token)
    if not token:
        raise ValueError("Session token is required.")

    session = fetch_one(
        "SELECT * FROM Sessions WHERE SessionToken = ? AND Active = 'true'",
        (token,),
    )
    if not session:
        raise ValueError("Invalid session.")

    if parse_iso_datetime(session["ExpiresAt"]) <= _dt.datetime.now(_dt.timezone.utc):
        update_row(
            "Sessions",
            "SessionId",
            session["SessionId"],
            {"Active": "false", "UpdatedAt": iso_now()},
        )
        raise ValueError("Session expired.")

    user = find_user_by_id(session["UserId"])
    if not user or str(user.get("Active")) != "true":
        raise ValueError("Session user is not active.")

    return {"session": session, "user": user}


# ---------------------------------------------------------------------------
# Email
# ---------------------------------------------------------------------------


def send_email(
    to: str,
    subject: str,
    body: str,
    html_body: Optional[str] = None,
    name: str = "OurSpace",
) -> Dict[str, Any]:
    """Send email via SMTP if configured. Otherwise returns ok=True with skipped status."""
    recipient = clean_text(to)
    if not recipient:
        return {"ok": False, "sent": False, "error": "Missing recipient email."}

    host = os.environ.get("SMTP_HOST", "").strip()
    port = int(os.environ.get("SMTP_PORT", "587") or 587)
    username = os.environ.get("SMTP_USER", "").strip()
    password = os.environ.get("SMTP_PASSWORD", "")
    sender = os.environ.get("SMTP_FROM", username or "no-reply@ourspace.local").strip()
    use_tls = os.environ.get("SMTP_USE_TLS", "1") != "0"

    if not host:
        # Safe fallback: do not crash if mail is unavailable in local/dev hosting.
        print(
            "[OurSpace email skipped: SMTP_HOST not configured]\n"
            f"To: {recipient}\nSubject: {subject}\n\n{body}\n",
            file=sys.stderr,
        )
        return {
            "ok": True,
            "sent": False,
            "skipped": True,
            "reason": "SMTP_HOST is not configured.",
            "to": recipient,
        }

    msg = EmailMessage()
    msg["From"] = f"{name} <{sender}>"
    msg["To"] = recipient
    msg["Subject"] = subject
    msg.set_content(body)
    if html_body:
        msg.add_alternative(html_body, subtype="html")

    try:
        with smtplib.SMTP(host, port, timeout=20) as smtp:
            if use_tls:
                smtp.starttls()
            if username:
                smtp.login(username, password)
            smtp.send_message(msg)
        return {"ok": True, "sent": True, "to": recipient}
    except Exception as err:
        # Preserve backend stability: email failures should not hard-crash actions.
        return {"ok": False, "sent": False, "error": str(err), "to": recipient}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def format_currency(total_copper: Any) -> str:
    copper = max(0, int(to_number(total_copper, 0)))
    platinum = copper // 1000
    copper %= 1000
    gold = copper // 100
    copper %= 100
    silver = copper // 10
    copper %= 10

    parts = []
    if platinum:
        parts.append(f"{platinum} platinum")
    if gold:
        parts.append(f"{gold} gold")
    if silver:
        parts.append(f"{silver} silver")
    if copper:
        parts.append(f"{copper} copper")
    return ", ".join(parts) if parts else "0 copper"


def hash_password(password: str, salt: str) -> str:
    return sha256_hex(f"{salt}|ourspace-password|{password}")


def sha256_hex(value: Any) -> str:
    return hashlib.sha256(str(value).encode("utf-8")).hexdigest()


def random_token(byte_length: int = 32) -> str:
    # token_hex(N) returns 2N hex chars, similar enough for backend session/reset secrets.
    return secrets.token_hex(max(16, int(byte_length)))


def make_id(prefix: str = "id") -> str:
    return f"{prefix}_{uuid.uuid4().hex[:20]}"


def normalize_email(email: Any) -> str:
    return str(email or "").strip().lower()


def normalize_username(username: Any) -> str:
    raw = str(username or "").strip().lower()
    return "".join(ch for ch in raw if ch.isalnum() or ch in "._-")


def normalize_identifier(value: Any) -> str:
    return str(value or "").strip().lower()


def normalize_profile_key(profile_key: Any) -> str:
    value = str(profile_key or "").strip().lower()
    if value in {"dino", "dino dad", "william"}:
        return "william"
    if value in {"squishy", "jasper"}:
        return "jasper"
    return value


def infer_profile_key_from_email(email: Any) -> str:
    e = normalize_email(email)
    profiles = OURSPACE_CONFIG["PROFILES"]
    if e == normalize_email(profiles["william"]["primaryEmail"]):
        return "william"
    if e == normalize_email(profiles["jasper"]["primaryEmail"]):
        return "jasper"
    return ""


def clean_text(value: Any) -> str:
    return str(value or "").strip()


def safe_user(user: Dict[str, Any]) -> Dict[str, Any]:
    profile = OURSPACE_CONFIG["PROFILES"].get(user.get("ProfileKey"), {})
    return {
        "userId": user.get("UserId"),
        "profileKey": user.get("ProfileKey"),
        "displayName": user.get("DisplayName"),
        "email": user.get("Email"),
        "username": user.get("Username"),
        "siteName": profile.get("siteName", ""),
    }


def mask_email(email: Any) -> str:
    e = normalize_email(email)
    parts = e.split("@")
    if len(parts) != 2:
        return e
    name, domain = parts
    if not name:
        return f"*@{domain}"
    masked_name = f"{name[0]}*" if len(name) <= 2 else f"{name[0]}***{name[-1]}"
    return f"{masked_name}@{domain}"


def escape_html(value: Any) -> str:
    return html.escape(str(value or ""), quote=True)


def safe_json_parse(value: Any, fallback: Any) -> Any:
    if value is None:
        return fallback
    if isinstance(value, (dict, list)):
        return value
    try:
        return json.loads(str(value or ""))
    except Exception:
        return fallback


def iso_now() -> str:
    return _dt.datetime.now(_dt.timezone.utc).isoformat()


def parse_iso_datetime(value: Any) -> _dt.datetime:
    raw = str(value or "").strip()
    if raw.endswith("Z"):
        raw = raw[:-1] + "+00:00"
    dt = _dt.datetime.fromisoformat(raw)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=_dt.timezone.utc)
    return dt.astimezone(_dt.timezone.utc)


def clamp_number(value: Any, minimum: int, maximum: int, fallback: int) -> int:
    try:
        n = int(float(value))
    except Exception:
        return fallback
    return max(minimum, min(maximum, n))


def to_number(value: Any, fallback: float = 0) -> float:
    try:
        n = float(value)
        if n == float("inf") or n == float("-inf") or n != n:
            return fallback
        return n
    except Exception:
        return fallback


def first_present(mapping: Dict[str, Any], keys: Iterable[str], fallback: Any = None) -> Any:
    for key in keys:
        if key in mapping and mapping[key] is not None and mapping[key] != "":
            return mapping[key]
    return fallback


def strip_oversized_data(value: Any, max_json_length: int = 45000) -> Any:
    seen: set[int] = set()

    def clean(item: Any) -> Any:
        if item is None:
            return None
        if isinstance(item, str):
            return item[:5000] + "…" if len(item) > 5000 else item
        if isinstance(item, (int, float, bool)):
            return item
        if isinstance(item, (list, tuple)):
            if id(item) in seen:
                return "[circular]"
            seen.add(id(item))
            return [clean(x) for x in list(item)[:50]]
        if isinstance(item, dict):
            if id(item) in seen:
                return "[circular]"
            seen.add(id(item))
            out: Dict[str, Any] = {}
            for key in list(item.keys())[:80]:
                out[str(key)] = clean(item[key])
            return out
        return str(item)

    cleaned = clean(value)
    encoded = json.dumps(cleaned, ensure_ascii=False)
    max_len = int(max_json_length or 45000)
    if len(encoded) > max_len:
        cleaned = {
            "warning": "Original JSON was shortened for SQLite storage safety.",
            "preview": encoded[: max(0, max_len - 200)],
        }
    return cleaned


def append_audit(action: str, actor: Any, details: Optional[Dict[str, Any]] = None) -> None:
    try:
        insert_row(
            "AuditLog",
            {
                "AuditId": make_id("audit"),
                "Action": action,
                "Actor": clean_text(actor),
                "DetailsJson": json.dumps(details or {}, ensure_ascii=False),
                "CreatedAt": iso_now(),
            },
        )
    except Exception as err:
        # Audit logging must never break the main user flow.
        print(f"[OurSpace audit skipped] {err}", file=sys.stderr)


# ---------------------------------------------------------------------------
# HTTP parsing / responses
# ---------------------------------------------------------------------------


def parse_request_body(content_type: str, raw: bytes) -> Dict[str, Any]:
    text = raw.decode("utf-8", errors="replace").strip()
    if not text:
        return {}

    if "application/json" in content_type.lower():
        parsed = json.loads(text)
        return parsed if isinstance(parsed, dict) else {}

    try:
        parsed = json.loads(text)
        return parsed if isinstance(parsed, dict) else {}
    except Exception:
        parsed_qs = urllib.parse.parse_qs(text, keep_blank_values=True)
        return {key: values[-1] if values else "" for key, values in parsed_qs.items()}


def parse_query_string(path: str) -> Dict[str, Any]:
    query = urllib.parse.urlparse(path).query
    parsed_qs = urllib.parse.parse_qs(query, keep_blank_values=True)
    return {key: values[-1] if values else "" for key, values in parsed_qs.items()}


def json_dumps(data: Dict[str, Any]) -> str:
    return json.dumps(data, ensure_ascii=False, indent=2, default=str)


# ---------------------------------------------------------------------------
# Optional Flask app
# ---------------------------------------------------------------------------


try:
    from flask import Flask, Response, jsonify, request

    app = Flask(__name__)

    @app.after_request
    def _add_cors_headers(response):  # type: ignore[no-untyped-def]
        response.headers["Access-Control-Allow-Origin"] = "*"
        response.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
        response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
        return response

    @app.route("/", methods=["GET", "POST", "OPTIONS"])
    def _flask_index():  # type: ignore[no-untyped-def]
        if request.method == "OPTIONS":
            return Response(status=204)
        try:
            if request.method == "POST":
                if request.is_json:
                    payload = request.get_json(silent=True) or {}
                else:
                    payload = request.form.to_dict() or parse_request_body(
                        request.content_type or "",
                        request.get_data() or b"",
                    )
            else:
                payload = request.args.to_dict()
            return jsonify(handle_payload(payload))
        except Exception as err:
            return jsonify({"ok": False, "error": str(err)})

except Exception:
    app = None  # Flask is optional; the stdlib server below still works.


# ---------------------------------------------------------------------------
# Stdlib HTTP fallback
# ---------------------------------------------------------------------------


class OurSpaceHTTPRequestHandler(BaseHTTPRequestHandler):
    server_version = "OurSpaceBackend/1.0"

    def _send_json(self, payload: Dict[str, Any], status: int = 200) -> None:
        raw = json_dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(raw)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        self.end_headers()
        self.wfile.write(raw)

    def do_OPTIONS(self) -> None:  # noqa: N802
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        self.end_headers()

    def do_GET(self) -> None:  # noqa: N802
        self._send_json(handle_payload(parse_query_string(self.path)))

    def do_POST(self) -> None:  # noqa: N802
        try:
            length = int(self.headers.get("Content-Length", "0") or 0)
            raw = self.rfile.read(length) if length else b""
            payload = parse_request_body(self.headers.get("Content-Type", ""), raw)
            self._send_json(handle_payload(payload))
        except Exception as err:
            self._send_json({"ok": False, "error": str(err)})


def run_server() -> None:
    ensure_database()
    host = os.environ.get("OURSPACE_HOST", "0.0.0.0")
    port = int(os.environ.get("OURSPACE_PORT", "8080") or 8080)
    print(f"OurSpace backend running at http://{host}:{port}")
    print(f"SQLite database: {database_path()}")
    ThreadingHTTPServer((host, port), OurSpaceHTTPRequestHandler).serve_forever()


if __name__ == "__main__":
    run_server()
